// All sound is synthesised live: bow, fire, dhol, conch, coins, crackers.
let AC = null;
export function audio(){ if (!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if (AC && AC.state==='suspended') AC.resume(); return AC; }
function noiseBuf(dur){ const b = AC.createBuffer(1, Math.max(1,AC.sampleRate*dur), AC.sampleRate), d = b.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*(1-i/d.length); return b; }
function tone(type, f1, f2, dur, vol, at=0){
  if (!AC) return; const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); if (f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t+dur+.02);
}
function noise(dur, vol, type, freq, at=0){
  if (!AC) return; const t = AC.currentTime + at, n = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  n.buffer = noiseBuf(dur); f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  n.connect(f).connect(g).connect(AC.destination); n.start(t);
}
export const sTwang = p => { tone('triangle',150+p*130,70,.22,.32); noise(.22,.05+.16*p,'bandpass',2000); };
export const sFire = big => { noise(big?.9:.5, big?1:.7, 'lowpass', 650); tone('sine', 95, 38, big?.6:.3, big?.6:.45); noise(.3,.25,'highpass',2600,.05); };
export const sDhol = (at=0, v=.6) => { tone('sine',115,48,.32,v,at); noise(.07,v*.4,'lowpass',500,at); };
export const sCracker = v => { noise(.18, v, 'highpass', 1400); tone('square', 900+Math.random()*600, 0, .05, v*.25); };
let coinT = 0; export const sCoin = () => { const n = performance.now(); if (n-coinT < 40) return; coinT = n; tone('sine',1600+Math.random()*600,0,.07,.06); tone('sine',2400+Math.random()*500,0,.05,.03,.02); };
export function sConch(){
  if (!AC) return; const t = AC.currentTime, out = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
  out.gain.setValueAtTime(0.0001,t); out.gain.exponentialRampToValueAtTime(.14,t+.35); out.gain.setValueAtTime(.14,t+1.2); out.gain.exponentialRampToValueAtTime(.001,t+1.8);
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5; lg.gain.value = 3; lfo.connect(lg);
  for (const f of [233,235.5,466]){ const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f*0.97,t); o.frequency.linearRampToValueAtTime(f,t+.4); lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t+1.9); }
  lp.connect(out).connect(AC.destination); lfo.start(t); lfo.stop(t+1.9);
}
export const sMaya = () => { tone('sawtooth',420,60,1.1,.22); tone('sine',300,40,1.3,.3); noise(.9,.6,'lowpass',400); };
export const sAgni = () => { noise(.6,.5,'bandpass',900); tone('triangle',300,900,.4,.15); };
export const sLaugh = () => { for (let i=0;i<5;i++){ tone('sawtooth',170-i*10,120-i*8,.14,.16,i*.19); sDhol(i*.19,.25); } };
export const sLifeLost = () => { tone('sine',330,110,.55,.28); noise(.45,.35,'lowpass',320); };
export const sJoin = () => { tone('sine',880,0,.1,.08); tone('sine',1320,0,.12,.08,.08); };
