// Camera + MediaPipe hand tracking. Aim comes from the knuckles, the pinch from a 3D thumb-index gap.
import { clamp, SECURE } from './util.js';

// One-Euro filter: heavy smoothing when the hand is still, almost no lag when it moves.
export class OneEuro{
  constructor(minCut=1.4, beta=0.006, dCut=1.0){ this.minCut=minCut; this.beta=beta; this.dCut=dCut; this.reset(); }
  reset(){ this.x=null; this.dx=0; this.t=null; }
  static a(cut, dt){ const r = 2*Math.PI*cut*dt; return r/(r+1); }
  filter(v, t){
    if (this.x == null){ this.x = v; this.t = t; return v; }
    const dt = Math.max(1e-3, (t - this.t)/1000); this.t = t;
    this.dx += OneEuro.a(this.dCut, dt) * ((v - this.x)/dt - this.dx);
    this.x += OneEuro.a(this.minCut + this.beta*Math.abs(this.dx), dt) * (v - this.x);
    return this.x;
  }
}
// Pinch detector.
// Signal: thumb-tip to index-tip gap divided by the size of the palm triangle (wrist, index knuckle, pinky knuckle),
// measured in 3D from the image landmarks (x, y and their relative depth z, aspect-corrected), blended with the
// model's metric world landmarks. Thresholds adapt to each hand: it learns your "open" and "closed" values as you play.
export class PinchDetector{
  constructor(){ this.sens = 0.25; this.reset(); }
  reset(){ this.open = 1.0; this.closed = 0.2; this.rs = null; this.pinched = false; this.min = 1; this.minT = 0; this.stableT = 0; this.frames = 0; this.downT = -1e9; this.upT = -1e9; }
  measure(lm, wl, aspect){
    const d = (A,B) => Math.hypot(A[0]-B[0], A[1]-B[1], A[2]-B[2]);
    const I = i => [lm[i].x*aspect, lm[i].y, lm[i].z*aspect];
    const tri = (P) => (d(P(0),P(5)) + d(P(0),P(17)) + d(P(5),P(17)))/3 || 1e-3;
    let r = d(I(4),I(8)) / tri(I), mm = null;
    if (wl){
      const Wl = i => [wl[i].x, wl[i].y, wl[i].z];
      const gw = d(Wl(4),Wl(8)); mm = gw*1000;
      r = 0.6*r + 0.4*(gw / tri(Wl));
    }
    return {r, mm};
  }
  update(lm, wl, aspect, t){
    const {r, mm} = this.measure(lm, wl, aspect);
    this.rs = this.rs == null ? r : this.rs*0.5 + r*0.5;
    const rs = this.rs;
    // learn this hand's open and closed values
    if (!this.pinched) this.open += (rs - this.open) * (rs > this.open ? 0.12 : 0.003);
    if (rs < this.closed) this.closed += (rs - this.closed) * 0.25;
    else if (this.pinched) this.closed += (rs - this.closed) * 0.02;
    this.open = Math.min(1.8, Math.max(0.55, this.open));
    this.closed = Math.min(0.32, Math.max(0.04, this.closed));
    const span = Math.max(0.3, this.open - this.closed);
    const enter = this.closed + span*this.sens, exit = this.closed + span*(this.sens + 0.2);
    let ev = null, aimT = null;
    if (!this.pinched){
      this.frames = rs < enter ? this.frames + 1 : 0;
      const clear = rs < this.closed + span*this.sens*0.5 && r < enter;
      if (t - this.upT > 150 && (this.frames >= 2 || clear)){
        this.pinched = true; this.frames = 0; this.min = rs; this.downT = this.minT = this.stableT = t; ev = 'down';
      }
    } else {
      // tightest point so far; it recovers slowly so one noisy low frame can't set it
      this.min = rs < this.min ? rs : this.min + (rs - this.min)*0.04;
      if (rs <= this.min + span*0.06) this.stableT = t;           // last moment the fingers were still closed
      const opening = rs > this.min + span*0.2 && r > this.min + span*0.2;   // smoothed and raw agree
      if (t - this.downT > 80 && (rs > exit || opening)){
        this.pinched = false; this.upT = t; ev = 'up'; aimT = this.stableT;
      }
    }
    return {ev, aimT, r:rs, enter, exit, open:this.open, closed:this.closed, mm};
  }
}
export const SENS = {precise:0.18, normal:0.25, relaxed:0.33};
const VISION = new URL('.', location.href).href.slice(0,-1);
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// opts: { video, dots, camBox, ui:{state,gap,tag}, onAim(x01,y01), onDown(), onUp(aimT), onLost(wasPinched), onFound(), label(pinched) }
export function createHand(opts){
  const {video, dots} = opts, dctx = dots.getContext('2d');
  const pinch = new PinchDetector(), fx = new OneEuro(1.4, 0.006), fy = new OneEuro(1.4, 0.006);
  let hands = null, lastVideoTime = -1, seenAt = 0, lost = true;
  let api = null, files = null, mk = null, cpu = false, cost = 8, lastDetect = 0;
  const ui = opts.ui || {};

  async function init(){
    if (!SECURE){ const e = new Error('insecure'); e.name = 'Insecure'; throw e; }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera here. Try Chrome or Safari.');
    opts.camBox.hidden = false;                       // iOS only delivers frames to a video that is on screen
    video.setAttribute('playsinline',''); video.muted = true;
    if (!video.srcObject){
      const stream = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user',frameRate:{ideal:60}}, audio:false});
      video.srcObject = stream; await video.play();
    }
    if (!hands){
      const vision = await import(VISION + '/vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(VISION);
      const o = delegate => ({ baseOptions:{ modelAssetPath:MODEL, delegate }, runningMode:'VIDEO', numHands:1, minHandDetectionConfidence:.5, minHandPresenceConfidence:.5, minTrackingConfidence:.5 });
      api = vision; files = fileset; mk = o;
      try { hands = await vision.HandLandmarker.createFromOptions(fileset, o('GPU')); }
      catch(e){ hands = await vision.HandLandmarker.createFromOptions(fileset, o('CPU')); cpu = true; }
    }
    dots.width = 320; dots.height = 240;
  }

  function track(){
    if (!hands || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    const now = performance.now();
    if (now - lastDetect < cost * 1.3) return;                    // slow phones: skip frames instead of stalling the game
    lastVideoTime = video.currentTime;
    let res;
    try { const t0 = performance.now(); res = hands.detectForVideo(video, now); cost = cost*0.8 + (performance.now()-t0)*0.2; lastDetect = now; }
    catch(err){
      if (!cpu && api){ cpu = true; hands = null; api.HandLandmarker.createFromOptions(files, mk('CPU')).then(h => hands = h).catch(()=>{}); }
      return;
    }
    dctx.clearRect(0,0,dots.width,dots.height);
    const lm = res.landmarks?.[0], wl = res.worldLandmarks?.[0];
    if (!lm){
      if (now - seenAt > 300 && !lost){
        lost = true;
        if (ui.state) ui.state.textContent = 'LOOKING FOR HAND'; if (ui.gap) ui.gap.textContent = ''; if (ui.tag) ui.tag.className = 'tag';
        opts.onLost?.(pinch.pinched);
        const {sens, open, closed} = pinch;
        pinch.reset(); Object.assign(pinch, {sens, open, closed});   // keep what it learned about this hand
        fx.reset(); fy.reset();
      }
      return;
    }
    seenAt = now; if (lost){ lost = false; opts.onFound?.(); }
    const aspect = (video.videoWidth || 640) / (video.videoHeight || 480);
    const ax = (lm[5].x + lm[9].x)/2, ay = (lm[5].y + lm[9].y)/2;   // knuckles stay still while fingertips pinch
    opts.onAim(fx.filter(clamp(((1-ax) - 0.15)/0.7, 0, 1), now), fy.filter(clamp((ay - 0.12)/0.62, 0, 1), now));
    const p = pinch.update(lm, wl, aspect, now);
    if (p.ev === 'down') opts.onDown();
    if (p.ev === 'up') opts.onUp(p.aimT);
    if (ui.state) ui.state.textContent = opts.label ? opts.label(pinch.pinched) : (pinch.pinched ? 'PINCH' : 'HAND OK');
    if (ui.gap) ui.gap.textContent = p.mm != null ? `${Math.round(p.mm)} mm` : '';
    if (ui.tag) ui.tag.className = 'tag ' + (pinch.pinched ? 'pinch' : 'on');
    for (const q of lm){ dctx.fillStyle = 'rgba(255,244,223,.85)'; dctx.beginPath(); dctx.arc(q.x*dots.width, q.y*dots.height, clamp(3 - q.z*30, 1.5, 5), 0, Math.PI*2); dctx.fill(); }
    dctx.strokeStyle = pinch.pinched ? '#ff9f1c' : '#3ddc97'; dctx.lineWidth = 3;
    dctx.beginPath(); dctx.moveTo(lm[4].x*dots.width, lm[4].y*dots.height); dctx.lineTo(lm[8].x*dots.width, lm[8].y*dots.height); dctx.stroke();
    // pinch meter on the right edge (canvas is mirrored): bar = how open, lines = pinch and release points
    const mh = dots.height - 40, my0 = 10, val = v => my0 + mh * clamp((v - p.closed*0.6)/(p.open*1.1 - p.closed*0.6), 0, 1);
    dctx.fillStyle = 'rgba(18,14,34,.6)'; dctx.fillRect(4, my0-4, 12, mh+8);
    dctx.fillStyle = pinch.pinched ? '#ff9f1c' : '#3ddc97'; const vy = val(p.r); dctx.fillRect(6, vy, 8, my0 + mh - vy);
    dctx.fillStyle = '#ffffff'; dctx.fillRect(2, val(p.enter)-1, 16, 2);
    dctx.fillStyle = 'rgba(255,255,255,.5)'; dctx.fillRect(2, val(p.exit)-1, 16, 2);
  }
  return { init, track, pinch, get ready(){ return !!hands; } };
}
