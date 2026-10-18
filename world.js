// The maidan: one painted backdrop per stage of the evening, plus the camera projection.
import { ENVS, EYE } from './data.js';
import { MOBILE, rng, mix, clamp, mkCanvas } from './util.js';

let W, H, DPR, F, HZ, CX;
export const view = {};
export const project = (x,y,z) => { const s = F/z; return [CX + x*s, HZ + (EYE-y)*s, s]; };
export let envBg = [];
export function resizeView(){
  DPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
  W = innerWidth; H = innerHeight; F = Math.max(H*1.05, W*0.62); HZ = H*0.6; CX = W/2;
  Object.assign(view, {W, H, DPR, F, HZ, CX});
  envBg = ENVS.map(paintEnv);
  return view;
}
export function repaintEnvs(){ envBg = ENVS.map(paintEnv); }

export function paintEnv(E, ei){
  const c = mkCanvas(W*DPR, H*DPR), g = c.getContext('2d'); g.setTransform(DPR,0,0,DPR,0,0);
  const r = rng(700 + ei*131), M = Math.min(W,H);
  let gr = g.createLinearGradient(0,0,0,HZ);
  E.sky.forEach((col,i)=>gr.addColorStop(i/(E.sky.length-1), col));
  g.fillStyle = gr; g.fillRect(0,0,W,HZ+2);
  if (E.stars){
    const n = Math.round(W*HZ/1800*E.stars);
    g.fillStyle = '#fff3d6';
    for (let i=0;i<n;i++){ const x = r()*W, y = r()*HZ*0.8; g.globalAlpha = (0.25+r()*0.75)*(1-y/HZ*0.9); g.beginPath(); g.arc(x,y,r()<.06?1.5:.7,0,Math.PI*2); g.fill(); }
    g.globalAlpha = 1;
  }
  if (E.moon){
    const mx = W*E.moon.x, my = HZ*E.moon.y, mr = M*E.moon.r;
    const gl = g.createRadialGradient(mx,my,0,mx,my,mr*6); gl.addColorStop(0,'rgba(255,240,210,.35)'); gl.addColorStop(1,'rgba(255,240,210,0)'); g.fillStyle = gl; g.fillRect(0,0,W,HZ);
    g.fillStyle = '#fff3d2'; g.beginPath(); g.arc(mx,my,mr,0,Math.PI*2); g.fill();
    g.fillStyle = 'rgba(200,180,150,.35)'; for (const [dx,dy,rr] of [[-.3,-.2,.22],[.25,.15,.16],[.05,.4,.12]]){ g.beginPath(); g.arc(mx+dx*mr,my+dy*mr,rr*mr,0,Math.PI*2); g.fill(); }
  }
  if (E.sun){
    const sx = W*E.sun.x, sy = HZ*E.sun.y, sr = M*E.sun.r;
    for (const [rad,a] of [[sr*10,.22],[sr*4.5,.4],[sr*2,.6]]){ const gl = g.createRadialGradient(sx,sy,0,sx,sy,rad); gl.addColorStop(0,`rgba(${E.glow},${a})`); gl.addColorStop(1,`rgba(${E.glow},0)`); g.fillStyle = gl; g.fillRect(0,0,W,HZ); }
    g.fillStyle = E.sun.col; g.beginPath(); g.arc(sx,sy,sr,0,Math.PI*2); g.fill();
  }
  gr = g.createLinearGradient(0,HZ-H*0.25,0,HZ); gr.addColorStop(0,`rgba(${E.glow},0)`); gr.addColorStop(1,`rgba(${E.glow},.5)`);
  g.fillStyle = gr; g.fillRect(0,HZ-H*0.25,W,H*0.25);
  // distant town: houses, domes, minarets
  g.fillStyle = E.far;
  for (let x=0; x<W; ){ const w = W*(0.03+r()*0.05), h = H*(0.02+r()*0.05); g.fillRect(x,HZ-h,w,h); if (r()<.45){ g.beginPath(); g.ellipse(x+w/2,HZ-h,w*0.32,w*0.32,0,Math.PI,0); g.fill(); g.fillRect(x+w/2-1,HZ-h-w*0.55,2,w*0.25); } x += w + W*0.004; }
  // mela: tents, temple, giant wheel, the two smaller effigies
  drawTents(g, E, r, M);
  drawTemple(g, W*0.6, HZ, M*0.17, E);
  drawWheel(g, W*0.17, HZ, M*0.13, E);
  drawEffigy(g, W*0.05, HZ, M*0.17, E, r); drawEffigy(g, W*0.94, HZ, M*0.15, E, r);
  if (E.lights) drawLightStrings(g, E, r);
  // ground
  gr = g.createLinearGradient(0,HZ,0,H); gr.addColorStop(0,E.ground[0]); gr.addColorStop(.3,E.ground[1]); gr.addColorStop(1,E.ground[2]);
  g.fillStyle = gr; g.fillRect(0,HZ,W,H-HZ);
  const N = Math.round((1800 + W*H/650)*(MOBILE ? 0.6 : 1));
  for (let i=0;i<N;i++){
    const z = 1.4*Math.pow(70/1.4, Math.pow(r(),.75)), half = (W/2/F)*z*1.15, X = (r()*2-1)*half;
    const [px,py,s] = project(X,0,z); if (py > H+4) continue;
    const sz = clamp(0.028*s,.4,3.2);
    g.globalAlpha = clamp(1.3 - z/45,.25,1)*(.4+r()*.5); g.fillStyle = E.speck[(r()*E.speck.length)|0];
    g.beginPath(); g.ellipse(px,py,sz,sz*.45,0,0,Math.PI*2); g.fill();
  }
  g.globalAlpha = 1;
  // rows of diyas lining the maidan
  for (const side of [-1,1]) for (let z=60; z>=7; z/=1.16) drawDiya(g, side*5.5, z, E);
  for (const z of [30,20,10]) drawMarker(g, z, E);
  // horizon fog, where Ravan hides
  gr = g.createLinearGradient(0,HZ-H*0.03,0,HZ+H*0.1); gr.addColorStop(0,E.haze+'0)'); gr.addColorStop(.3,E.haze+'.6)'); gr.addColorStop(1,E.haze+'0)');
  g.fillStyle = gr; g.fillRect(0,HZ-H*0.03,W,H*0.13);
  const v = g.createRadialGradient(CX,H*.55,M*.35,CX,H*.55,Math.max(W,H)*.85); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(14,6,2,.5)');
  g.fillStyle = v; g.fillRect(0,0,W,H);
  return c;
}
function drawTents(g, E, r, M){
  for (let i=0;i<7;i++){
    const x = W*(0.05 + i*0.14 + (r()-.5)*0.05), h = M*(0.035+r()*0.03), w = h*1.6;
    g.fillStyle = E.sil; g.beginPath(); g.moveTo(x-w/2,HZ); g.lineTo(x,HZ-h); g.lineTo(x+w/2,HZ); g.closePath(); g.fill();
    g.fillRect(x-1,HZ-h-h*0.35,2,h*0.35);
    g.fillStyle = i%2 ? 'rgba(226,84,27,.8)' : 'rgba(255,153,51,.8)'; g.beginPath(); g.moveTo(x+1,HZ-h-h*0.35); g.lineTo(x+h*0.32,HZ-h-h*0.27); g.lineTo(x+1,HZ-h-h*0.19); g.closePath(); g.fill();
  }
}
function drawTemple(g, x, base, h, E){
  g.fillStyle = E.sil;
  g.fillRect(x-h*0.62, base-h*0.22, h*0.34, h*0.22);
  g.beginPath(); g.ellipse(x-h*0.45, base-h*0.22, h*0.12, h*0.1, 0, Math.PI, 0); g.fill();
  g.beginPath(); g.moveTo(x-h*0.3, base); g.lineTo(x-h*0.3, base-h*0.32);
  g.quadraticCurveTo(x-h*0.26, base-h*0.8, x-h*0.07, base-h*0.95); g.lineTo(x+h*0.07, base-h*0.95);
  g.quadraticCurveTo(x+h*0.26, base-h*0.8, x+h*0.3, base-h*0.32); g.lineTo(x+h*0.3, base); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x, base-h*0.97, h*0.1, h*0.035, 0, 0, Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(x, base-h*1.03, h*0.035, h*0.045, 0, 0, Math.PI*2); g.fill();
  g.fillRect(x-1, base-h*1.25, 2, h*0.2);
  g.fillStyle = '#e2541b'; g.beginPath(); g.moveTo(x+1, base-h*1.25); g.lineTo(x+h*0.16, base-h*1.2); g.lineTo(x+1, base-h*1.14); g.closePath(); g.fill();
  if (E.lights > .5){ g.fillStyle = 'rgba(255,214,120,.85)'; for (let t=0.05;t<0.95;t+=0.07){ g.beginPath(); g.arc(x-h*0.3+h*0.04*t, base-h*t*0.9, 1.3, 0, Math.PI*2); g.arc(x+h*0.3-h*0.04*t, base-h*t*0.9, 1.3, 0, Math.PI*2); g.fill(); } }
}
function drawWheel(g, x, base, R, E){
  const cy = base - R*1.15;
  g.strokeStyle = E.sil; g.lineWidth = Math.max(1.5, R*0.035);
  g.beginPath(); g.moveTo(x-R*0.6, base); g.lineTo(x, cy); g.lineTo(x+R*0.6, base); g.stroke();
  g.beginPath(); g.arc(x, cy, R, 0, Math.PI*2); g.stroke();
  g.lineWidth = Math.max(1, R*0.015);
  for (let i=0;i<12;i++){ const a = i*Math.PI/6; g.beginPath(); g.moveTo(x,cy); g.lineTo(x+Math.cos(a)*R, cy+Math.sin(a)*R); g.stroke(); }
  g.fillStyle = E.sil;
  for (let i=0;i<12;i++){ const a = i*Math.PI/6 + 0.26; g.fillRect(x+Math.cos(a)*R - R*0.06, cy+Math.sin(a)*R, R*0.12, R*0.1); }
  if (E.lights){
    const cols = ['#ffd23f','#ff6a3a','#9be08a','#6cc4ff','#ff7fd1'];
    for (let i=0;i<36;i++){ const a = i*Math.PI/18; g.globalAlpha = E.lights; g.fillStyle = cols[i%cols.length]; g.beginPath(); g.arc(x+Math.cos(a)*R, cy+Math.sin(a)*R, 1.6, 0, Math.PI*2); g.fill(); }
    g.globalAlpha = 1;
  }
}
function drawEffigy(g, x, base, h, E, r){
  g.fillStyle = E.sil; g.strokeStyle = E.sil; g.lineWidth = Math.max(1, h*0.02);
  g.beginPath(); g.moveTo(x-h*0.18, base); g.lineTo(x-h*0.1, base-h*0.45); g.moveTo(x+h*0.18, base); g.lineTo(x+h*0.1, base-h*0.45); g.stroke();
  g.beginPath(); g.moveTo(x-h*0.2, base-h*0.4); g.lineTo(x+h*0.2, base-h*0.4); g.lineTo(x+h*0.16, base-h*0.78); g.lineTo(x-h*0.16, base-h*0.78); g.closePath(); g.fill();
  g.lineWidth = h*0.06; g.beginPath(); g.moveTo(x-h*0.16, base-h*0.74); g.lineTo(x-h*0.32, base-h*0.5); g.moveTo(x+h*0.16, base-h*0.74); g.lineTo(x+h*0.32, base-h*0.5); g.stroke();
  g.beginPath(); g.arc(x, base-h*0.86, h*0.1, 0, Math.PI*2); g.fill();
  g.beginPath(); g.moveTo(x-h*0.09, base-h*0.92); g.lineTo(x, base-h*1.08); g.lineTo(x+h*0.09, base-h*0.92); g.closePath(); g.fill();
  if (E.lights > .5){ g.fillStyle = 'rgba(255,190,90,.6)'; g.beginPath(); g.arc(x, base-h*0.6, h*0.03, 0, Math.PI*2); g.fill(); }
}
function drawLightStrings(g, E, r){
  const cols = ['#ffd23f','#ff6a3a','#9be08a','#6cc4ff','#ff7fd1'];
  for (let s=0;s<3;s++){
    const x0 = W*(0.08 + s*0.3), x1 = x0 + W*0.26, y0 = HZ - H*(0.05 + r()*0.04), sag = H*0.03;
    for (let i=0;i<=22;i++){
      const t = i/22, x = x0 + (x1-x0)*t, y = y0 + Math.sin(t*Math.PI)*sag;
      if (E.lights > .5){ const gl = g.createRadialGradient(x,y,0,x,y,6); gl.addColorStop(0,cols[i%5]); gl.addColorStop(1,'rgba(0,0,0,0)'); g.globalAlpha = .35*E.lights; g.fillStyle = gl; g.fillRect(x-6,y-6,12,12); }
      g.globalAlpha = E.lights; g.fillStyle = cols[i%5]; g.beginPath(); g.arc(x,y,1.4,0,Math.PI*2); g.fill();
    }
  }
  g.globalAlpha = 1;
}
function drawDiya(g, X, z, E){
  const [px,py,s] = project(X,0,z); if (py > H+10 || px < -40 || px > W+40) return;
  const w = Math.max(2, 0.28*s);
  if (E.diyas){
    const gl = g.createRadialGradient(px,py-w*0.6,0,px,py-w*0.6,w*3.2); gl.addColorStop(0,'rgba(255,190,80,.55)'); gl.addColorStop(1,'rgba(255,140,40,0)');
    g.fillStyle = gl; g.fillRect(px-w*3.2,py-w*3.8,w*6.4,w*6.4);
  }
  g.fillStyle = '#7a3a18'; g.beginPath(); g.ellipse(px,py,w*0.55,w*0.24,0,0,Math.PI); g.fill();
  g.fillStyle = '#a85a2a'; g.beginPath(); g.ellipse(px,py,w*0.55,w*0.12,0,0,Math.PI*2); g.fill();
  if (E.diyas){
    g.fillStyle = '#ffb42a'; g.beginPath(); g.moveTo(px-w*0.12,py-w*0.05); g.quadraticCurveTo(px,py-w*0.9,px+w*0.12,py-w*0.05); g.closePath(); g.fill();
    g.fillStyle = '#fff2b0'; g.beginPath(); g.ellipse(px,py-w*0.2,w*0.05,w*0.14,0,0,Math.PI*2); g.fill();
  }
}
function drawMarker(g, z, E){
  const X = -Math.min(8, (W/2/F)*10*0.85), [px,py,s] = project(X,0,z);
  g.fillStyle = 'rgba(20,10,4,.35)'; g.beginPath(); g.ellipse(px+0.3*s,py,0.35*s,0.05*s,0,0,Math.PI*2); g.fill();
  g.fillStyle = '#c9a46a'; g.fillRect(px - 0.03*s, py - 1.3*s, Math.max(1.5,0.06*s), 1.3*s);
  g.fillStyle = 'rgba(90,60,20,.6)'; for (let k=1;k<4;k++) g.fillRect(px - 0.03*s, py - k*0.33*s, Math.max(1.5,0.06*s), Math.max(1,0.015*s));
  for (let k=0;k<7;k++){ g.fillStyle = k%2 ? '#ffb000' : '#e8780c'; g.beginPath(); g.arc(px + (k-3)*0.06*s, py - 1.3*s + Math.abs(k-3)*0.03*s, Math.max(1.2,0.045*s), 0, Math.PI*2); g.fill(); }
  g.font = `600 ${Math.max(10,H*0.015)}px "Anek Latin", sans-serif`; g.textAlign = 'left';
  g.fillStyle = 'rgba(255,240,210,.85)'; g.fillText(`${z} m`, px + Math.max(5,0.12*s), py - 0.95*s);
}
