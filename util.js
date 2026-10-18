// Small shared helpers.
export const $ = id => document.getElementById(id);
export const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
// Desktop Chrome allows the camera on local files; phones need https.
export const SECURE = window.isSecureContext && !(MOBILE && /^(file|content):/.test(location.protocol));
export const SPR = MOBILE ? 1.5 : 2;   // sprite resolution

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
export const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.cos(Math.PI*x))/2;
export function rng(seed){ seed = (seed >>> 0) % 2147483647 || 1; return () => (seed = (seed*16807) % 2147483647) / 2147483647; }
export function hexRgb(h){ h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
export function mix(a, b, t){ const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`; }
export function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
export function goldGrad(g, y0, y1){ const gr = g.createLinearGradient(0,y0,0,y1); gr.addColorStop(0,'#fff3b0'); gr.addColorStop(.3,'#f5c842'); gr.addColorStop(.65,'#b8800f'); gr.addColorStop(1,'#ffd760'); return gr; }
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x' ? r : (r&3|8)).toString(16); }));
export const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
};
