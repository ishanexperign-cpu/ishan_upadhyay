// Moving effects: weather, clouds, fireworks, fire, smoke and the ash Ravan crumbles into.
import { ENVS } from './data.js';
import { GLOW } from './art.js';
import { view } from './world.js';
import { MOBILE, clamp } from './util.js';

export const fx = { parts:[], fws:[], fire:[], ash:[], onCracker:null };
const clouds = Array.from({length:6},()=>({x:Math.random()*1.4-.2, y:.08+Math.random()*.4, s:.6+Math.random()*.9, v:.003+Math.random()*.006}));
const PART_COUNT = MOBILE ? {dust:26, sparks:24, lanterns:12, embers:40} : {dust:45, sparks:40, lanterns:18, embers:70};
const FW_COLS = ['#ffd23f','#ff5a3a','#9be08a','#7fc8ff','#ff7fd1','#ffffff','#ffb000'];

export function clearFx(){ fx.fws = []; fx.fire = []; fx.ash = []; }

function newPart(type, anywhere){
  const {W, H, HZ} = view;
  const p = {type, x:Math.random()*W, y: anywhere ? Math.random()*H : H+20, ph:Math.random()*6, life:1};
  if (type==='dust'){ p.vy = -4-Math.random()*8; p.vx = 6+Math.random()*10; p.size = 0.8+Math.random()*1.6; }
  if (type==='sparks'){ p.vy = -10-Math.random()*20; p.vx = (Math.random()-.5)*10; p.size = 1+Math.random()*1.6; p.y = anywhere ? Math.random()*H : H*(0.6+Math.random()*0.4); }
  if (type==='lanterns'){ p.vy = -8-Math.random()*10; p.vx = 3+Math.random()*5; p.size = 3+Math.random()*5; p.y = anywhere ? HZ*Math.random() : HZ*(0.85+Math.random()*0.15); }
  if (type==='embers'){ p.vy = -40-Math.random()*70; p.vx = 10+Math.random()*25; p.size = 1+Math.random()*2; }
  return p;
}
export function updateParts(dt, ei, t){
  const type = ENVS[ei].part, want = PART_COUNT[type];
  let have = 0;
  for (const p of fx.parts){
    p.x += (p.vx + Math.sin(t*1.3 + p.ph)*8)*dt; p.y += p.vy*dt;
    if (p.type===type) have++; else p.life -= dt*0.8;
    if (p.y < -30 || p.x > view.W+30 || p.life <= 0) p.dead = true;
  }
  fx.parts = fx.parts.filter(p=>!p.dead);
  while (have < want){ fx.parts.push(newPart(type, fx.parts.length < want*0.6)); have++; }
}
export function drawParts(ctx, t){
  for (const p of fx.parts){
    ctx.globalAlpha = clamp(p.life,0,1);
    if (p.type==='lanterns'){
      const gl = p.size*3; ctx.globalAlpha *= .5; ctx.drawImage(GLOW.orange, p.x-gl, p.y-gl, gl*2, gl*2); ctx.globalAlpha = clamp(p.life,0,1);
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(p.x-p.size*.5,p.y-p.size*.7); ctx.lineTo(p.x+p.size*.5,p.y-p.size*.7); ctx.lineTo(p.x+p.size*.4,p.y+p.size*.6); ctx.lineTo(p.x-p.size*.4,p.y+p.size*.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff1b0'; ctx.fillRect(p.x-p.size*.15, p.y+p.size*.2, p.size*.3, p.size*.3);
    } else {
      ctx.fillStyle = p.type==='embers' ? `rgba(255,${120+Math.round(60*Math.sin(t*9+p.ph))},40,.9)` : p.type==='sparks' ? `rgba(255,220,130,${.45+.45*Math.sin(t*4+p.ph)})` : 'rgba(255,225,160,.55)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
export function drawClouds(ctx, dt, ei){
  if (ei >= 2) return;
  const {W, H, HZ} = view;
  for (const c of clouds){
    c.x += c.v*dt; if (c.x > 1.25) c.x = -0.25;
    const x = c.x*W, y = c.y*HZ, s = c.s*Math.min(W,H)*0.055;
    ctx.fillStyle = ei===0 ? 'rgba(255,190,150,.28)' : 'rgba(220,140,170,.22)';
    for (const [dx,dy,r] of [[0,0,1],[.9,.15,.75],[-.9,.2,.7],[.4,-.3,.6]]){ ctx.beginPath(); ctx.ellipse(x+dx*s, y+dy*s, r*s*1.6, r*s*.5, 0, 0, Math.PI*2); ctx.fill(); }
  }
}
export function firework(x, y, small, loud){
  const n = Math.round((MOBILE ? 22 : 38) * (small ? 0.6 : 1)), col = FW_COLS[(Math.random()*FW_COLS.length)|0], sp = small ? 90 : 160;
  for (let i=0;i<n;i++){ const a = i/n*Math.PI*2 + Math.random()*0.2, v = sp*(0.6+Math.random()*0.5); fx.fws.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.1+Math.random()*0.6,max:1.6,col}); }
  fx.fws.push({x,y,vx:0,vy:0,life:.25,max:.25,flash:true});
  if (loud) fx.onCracker?.(small ? .25 : .4);
}
export function updateFW(dt, ei, skyBursts, loud){
  const rate = ENVS[ei].fireworks;
  if (skyBursts && rate && Math.random() < dt*rate) firework(view.W*(0.1+Math.random()*0.8), view.HZ*(0.12+Math.random()*0.45), false, loud);
  for (const p of fx.fws){ p.life -= dt; p.vy += 60*dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx*dt; p.y += p.vy*dt; }
  fx.fws = fx.fws.filter(p=>p.life>0);
}
export function drawFW(ctx){
  if (!fx.fws.length) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.fws){
    if (p.flash){ const s = 60*(p.life/p.max); ctx.globalAlpha = p.life/p.max; ctx.drawImage(GLOW.white, p.x-s, p.y-s, s*2, s*2); continue; }
    ctx.globalAlpha = clamp(p.life,0,1); ctx.fillStyle = p.col; ctx.fillRect(p.x-1.2, p.y-1.2, 2.4, 2.4);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
export function spawnFlame(x, y, size, kind='flame'){
  fx.fire.push({x:x+(Math.random()-.5)*size*0.4, y, vx:(Math.random()-.5)*size*0.8, vy:-(size*1.2+Math.random()*size*1.6), life:.5+Math.random()*.45, max:.95, size:size*(0.45+Math.random()*0.4), grow:1.5, kind});
}
export function blast(x, y, R, kind){
  const k = clamp(R/40, .5, 2.2), maya = kind==='maya';
  for (let i=0;i<(MOBILE?16:30);i++){ const a = Math.random()*Math.PI*2, v = (40+Math.random()*170)*k; fx.fire.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40*k,life:.45+Math.random()*.5,max:.95,size:R*(0.45+Math.random()*0.55),grow:1.7,kind: maya?'maya':'flame'}); }
  for (let i=0;i<(MOBILE?8:14);i++){ const a = Math.random()*Math.PI*2, v = (220+Math.random()*320)*k; fx.fire.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.4,max:.75,size:2,grow:0,kind:'spark',col: maya?'#e2c4ff':'#ffd27a'}); }
  for (let i=0;i<(MOBILE?4:8);i++) fx.fire.push({x:x+(Math.random()-.5)*R,y:y+(Math.random()-.5)*R,vx:(Math.random()-.5)*30,vy:-20-Math.random()*30,life:1.2+Math.random()*.6,max:1.8,size:R*0.9,grow:1.3,kind:'smoke'});
  fx.fire.push({x,y,vx:0,vy:0,life:.22,max:.22,size:R*3.2,grow:0,kind: maya?'mflash':'flash'});
  fx.fire.push({x,y,vx:0,vy:0,life:.4,max:.4,size:R,grow:0,kind:'ring',col: maya?'#c08aff':'#ffd27a'});
}
export function updateFire(dt){
  for (const p of fx.fire){
    p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if (p.kind==='spark') p.vy += 420*dt; else if (p.kind!=='ring'){ p.vx *= 0.92; p.vy = p.vy*0.94 - 30*dt; }
    p.size *= 1 + p.grow*dt*0.5;
  }
  fx.fire = fx.fire.filter(p=>p.life>0);
  for (const a of fx.ash){ a.life -= dt; a.vx += 14*dt; a.vy -= 10*dt; a.x += a.vx*dt; a.y += a.vy*dt; }
  fx.ash = fx.ash.filter(a=>a.life>0);
}
export function drawFire(ctx){
  for (const p of fx.fire) if (p.kind==='smoke'){ ctx.globalAlpha = clamp(p.life/p.max,0,1)*0.8; ctx.drawImage(GLOW.smoke, p.x-p.size, p.y-p.size, p.size*2, p.size*2); }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.fire){
    const f = 1 - p.life/p.max, a = clamp(p.life/p.max,0,1);
    if (p.kind==='flame'){ const spr = f < .25 ? GLOW.core : f < .6 ? GLOW.orange : GLOW.red; ctx.globalAlpha = a; ctx.drawImage(spr, p.x-p.size, p.y-p.size, p.size*2, p.size*2); }
    else if (p.kind==='maya'){ ctx.globalAlpha = a; ctx.drawImage(GLOW.maya, p.x-p.size, p.y-p.size, p.size*2, p.size*2); }
    else if (p.kind==='flash' || p.kind==='mflash'){ ctx.globalAlpha = a; ctx.drawImage(p.kind==='flash' ? GLOW.core : GLOW.maya, p.x-p.size, p.y-p.size, p.size*2, p.size*2); }
    else if (p.kind==='spark'){ ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of fx.fire) if (p.kind==='ring'){ const k = p.life/p.max; ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(2.2-k*1.2),0,Math.PI*2); ctx.stroke(); }
  for (const a of fx.ash){
    const k = 1 - a.life/a.max, alpha = clamp(a.life/(a.max*0.45),0,1);
    const t1 = clamp(k/0.25,0,1), t2 = clamp((k-0.25)/0.5,0,1);
    const r = Math.round(a.r + (255-a.r)*t1 + (70-255)*t2), g = Math.round(a.g + (130-a.g)*t1 + (60-130)*t2), b = Math.round(a.b + (30-a.b)*t1 + (55-30)*t2);
    ctx.globalAlpha = alpha; ctx.fillStyle = `rgb(${r},${g},${b})`;
    const s = a.size*(1-k*0.5); ctx.fillRect(a.x-s/2, a.y-s/2, s, s);
  }
  ctx.globalAlpha = 1;
}
