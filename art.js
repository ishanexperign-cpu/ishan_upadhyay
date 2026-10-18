// Sprites drawn once at start: the ten-headed Ravan, single heads, the Agni Astra wheel and glow textures.
import { SPR, mkCanvas, goldGrad } from './util.js';

function paintCrown(g, R, o){
  const stroke = '#6a4206';
  g.lineJoin = 'round'; g.lineWidth = 0.03*R; g.strokeStyle = stroke;
  if (o.horned){
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*0.5*R,-0.72*R);
      g.bezierCurveTo(s*1.2*R,-0.78*R, s*1.18*R,-1.22*R, s*0.92*R,-1.5*R);
      g.bezierCurveTo(s*1.0*R,-1.22*R, s*0.92*R,-0.98*R, s*0.56*R,-0.92*R);
      g.closePath(); g.fillStyle = goldGrad(g,-1.5*R,-0.7*R); g.fill(); g.stroke();
    }
  }
  for (const s of [-1,1]){   // ear guards
    g.beginPath(); g.moveTo(s*0.78*R,-0.5*R); g.quadraticCurveTo(s*1.0*R,-0.32*R, s*0.92*R,-0.1*R); g.lineTo(s*0.8*R,-0.2*R); g.closePath();
    g.fillStyle = goldGrad(g,-0.5*R,-0.1*R); g.fill(); g.stroke();
  }
  for (const [b,yb,t,yt] of [[0.74,-0.66,0.56,-0.98],[0.5,-0.98,0.33,-1.22]]){
    g.beginPath(); g.moveTo(-b*R,yb*R); g.lineTo(-t*R,yt*R); g.lineTo(t*R,yt*R); g.lineTo(b*R,yb*R); g.closePath();
    g.fillStyle = goldGrad(g,yt*R,yb*R); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(110,66,6,.6)'; g.lineWidth = 0.018*R;
    g.beginPath(); g.moveTo(-t*R,(yt+0.05)*R); g.lineTo(t*R,(yt+0.05)*R); g.stroke();
    g.strokeStyle = stroke; g.lineWidth = 0.03*R;
  }
  for (const s of [-1,1]) for (const [x,y] of [[0.62,-0.82],[0.42,-1.1]]){
    g.beginPath(); g.moveTo(s*x*R,y*R); g.quadraticCurveTo(s*(x+0.16)*R,(y-0.06)*R, s*(x+0.1)*R,(y-0.2)*R);
    g.quadraticCurveTo(s*(x+0.02)*R,(y-0.08)*R, s*(x-0.04)*R,(y-0.02)*R); g.closePath();
    g.fillStyle = '#f5c842'; g.fill(); g.stroke();
  }
  g.beginPath(); g.ellipse(0,-1.22*R,0.3*R,0.2*R,0,Math.PI,0); g.closePath(); g.fillStyle = goldGrad(g,-1.42*R,-1.22*R); g.fill(); g.stroke();
  g.beginPath(); g.arc(0,-1.47*R,0.07*R,0,Math.PI*2); g.fillStyle = '#ffd760'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-0.03*R,-1.53*R); g.lineTo(0,-1.64*R); g.lineTo(0.03*R,-1.53*R); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-0.86*R,-0.68*R); g.quadraticCurveTo(0,-0.8*R,0.86*R,-0.68*R); g.lineTo(0.84*R,-0.46*R); g.quadraticCurveTo(0,-0.58*R,-0.84*R,-0.46*R); g.closePath();
  g.fillStyle = goldGrad(g,-0.8*R,-0.46*R); g.fill(); g.stroke();
  for (let i=-3;i<=3;i++){ const x = i*0.23*R, y = -0.6*R - (1-Math.abs(i)/3.5)*0.06*R; g.fillStyle = i%2 ? '#1f9a5a' : '#c0141a'; g.beginPath(); g.arc(x,y,0.045*R,0,Math.PI*2); g.fill(); }
  g.fillStyle = '#1f9a5a'; g.beginPath(); g.moveTo(0,-1.02*R); g.quadraticCurveTo(0.2*R,-0.86*R,0,-0.68*R); g.quadraticCurveTo(-0.2*R,-0.86*R,0,-1.02*R); g.fill(); g.strokeStyle = stroke; g.stroke();
  g.fillStyle = '#d4141a'; g.beginPath(); g.moveTo(0,-0.95*R); g.quadraticCurveTo(0.1*R,-0.82*R,0,-0.74*R); g.quadraticCurveTo(-0.1*R,-0.82*R,0,-0.95*R); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-0.03*R,-0.86*R,0.02*R,0,Math.PI*2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.025*R; g.beginPath(); g.moveTo(-0.45*R,-0.72*R); g.lineTo(-0.3*R,-1.15*R); g.stroke();
}
function paintHead(g, R, o={}){
  const hair = o.maya ? '#0e0614' : '#160c08';
  const skin = o.maya ? ['#8a6aa0','#4e3060','#22122e'] : ['#dc9a62','#a8622e','#5a2c12'];
  g.save(); g.lineCap = 'round';
  // hair mass and flowing locks
  g.fillStyle = hair; g.beginPath(); g.ellipse(0, 0.12*R, 1.06*R, 1.12*R, 0, 0, Math.PI*2); g.fill();
  g.strokeStyle = hair;
  for (const s of [-1,1]) for (let i=0;i<4;i++){
    const x0 = s*(0.62 + i*0.11)*R, y0 = 0.25*R + i*0.1*R;
    g.lineWidth = (0.24 - i*0.035)*R;
    g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + s*0.32*R, y0 + 0.32*R, x0 - s*0.12*R, y0 + 0.6*R, x0 + s*0.2*R, y0 + 0.86*R); g.stroke();
    g.lineWidth *= 0.5; g.beginPath(); g.arc(x0 + s*0.28*R, y0 + 0.84*R, 0.08*R, 0, Math.PI*1.5); g.stroke();
  }
  g.fillStyle = hair; g.beginPath(); g.moveTo(-0.7*R, 0.45*R); g.quadraticCurveTo(-0.55*R, 1.15*R, 0, 1.22*R); g.quadraticCurveTo(0.55*R, 1.15*R, 0.7*R, 0.45*R); g.fill();
  // ears
  for (const s of [-1,1]){
    g.fillStyle = skin[1]; g.beginPath(); g.ellipse(s*0.88*R, 0.04*R, 0.15*R, 0.24*R, 0, 0, Math.PI*2); g.fill();
    g.fillStyle = skin[2]; g.beginPath(); g.ellipse(s*0.9*R, 0.05*R, 0.06*R, 0.13*R, 0, 0, Math.PI*2); g.fill();
  }
  // face
  const face = new Path2D();
  face.moveTo(-0.8*R, -0.48*R);
  face.bezierCurveTo(-0.9*R, 0.15*R, -0.72*R, 0.68*R, -0.36*R, 0.9*R);
  face.quadraticCurveTo(0, 1.04*R, 0.36*R, 0.9*R);
  face.bezierCurveTo(0.72*R, 0.68*R, 0.9*R, 0.15*R, 0.8*R, -0.48*R);
  face.quadraticCurveTo(0, -0.74*R, -0.8*R, -0.48*R);
  let gr = g.createRadialGradient(-0.22*R, -0.2*R, 0.08*R, 0, 0.1*R, 1.15*R);
  gr.addColorStop(0, skin[0]); gr.addColorStop(.55, skin[1]); gr.addColorStop(1, skin[2]);
  g.fillStyle = gr; g.fill(face);
  g.save(); g.clip(face);
  g.fillStyle = 'rgba(60,20,5,.28)';
  for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*0.62*R, 0.4*R, 0.22*R, 0.38*R, s*0.3, 0, Math.PI*2); g.fill(); }
  gr = g.createRadialGradient(-0.15*R,-0.35*R,0,-0.15*R,-0.35*R,0.45*R); gr.addColorStop(0,'rgba(255,230,190,.35)'); gr.addColorStop(1,'rgba(255,230,190,0)');
  g.fillStyle = gr; g.fillRect(-R,-R,2*R,R);
  g.restore();
  // tripundra tilak
  g.strokeStyle = '#f6f0e2'; g.lineWidth = 0.05*R;
  for (const y of [-0.38,-0.29,-0.2]){ g.beginPath(); g.moveTo(-0.3*R, y*R); g.quadraticCurveTo(0, (y-0.03)*R, 0.3*R, y*R); g.stroke(); }
  g.fillStyle = '#d4201a'; g.beginPath(); g.arc(0, -0.29*R, 0.055*R, 0, Math.PI*2); g.fill();
  // brows
  g.fillStyle = hair;
  for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*0.68*R,-0.2*R); g.quadraticCurveTo(s*0.42*R,-0.26*R, s*0.1*R,-0.07*R); g.lineTo(s*0.13*R,0); g.quadraticCurveTo(s*0.42*R,-0.13*R, s*0.64*R,-0.1*R); g.closePath(); g.fill(); }
  // eyes
  for (const s of [-1,1]){
    g.save(); g.translate(s*0.37*R, 0.07*R); g.rotate(-s*0.12);
    const eye = new Path2D(); eye.moveTo(-0.2*R,0); eye.quadraticCurveTo(0,-0.13*R,0.2*R,0); eye.quadraticCurveTo(0,0.1*R,-0.2*R,0);
    g.fillStyle = o.maya ? '#2a0a10' : '#fbf1de'; g.fill(eye);
    g.save(); g.clip(eye);
    g.fillStyle = o.maya ? '#ff2a2a' : '#3a1a08'; g.beginPath(); g.arc(-s*0.03*R, 0, 0.08*R, 0, Math.PI*2); g.fill();
    g.fillStyle = o.maya ? '#ffd0d0' : '#0a0402'; g.beginPath(); g.arc(-s*0.03*R, 0, 0.035*R, 0, Math.PI*2); g.fill();
    g.restore();
    g.strokeStyle = '#140804'; g.lineWidth = 0.035*R; g.stroke(eye);
    if (!o.maya){ g.fillStyle = '#fff'; g.beginPath(); g.arc(-s*0.06*R,-0.03*R,0.018*R,0,Math.PI*2); g.fill(); }
    g.restore();
  }
  // nose
  g.fillStyle = 'rgba(70,25,8,.45)'; g.beginPath(); g.moveTo(-0.03*R,0.05*R); g.quadraticCurveTo(-0.13*R,0.3*R,-0.12*R,0.4*R); g.lineTo(0.12*R,0.4*R); g.quadraticCurveTo(0.06*R,0.25*R,0.03*R,0.05*R); g.fill();
  g.fillStyle = 'rgba(30,8,2,.7)'; for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*0.07*R,0.41*R,0.04*R,0.022*R,0,0,Math.PI*2); g.fill(); }
  // snarling mouth
  g.fillStyle = '#4a0c0a'; g.beginPath(); g.ellipse(0, 0.72*R, 0.25*R, 0.11*R, 0, 0, Math.PI*2); g.fill();
  g.save(); g.beginPath(); g.ellipse(0,0.72*R,0.25*R,0.11*R,0,0,Math.PI*2); g.clip();
  g.fillStyle = '#f4ead6'; g.fillRect(-0.25*R,0.6*R,0.5*R,0.075*R);
  g.strokeStyle = 'rgba(120,90,60,.6)'; g.lineWidth = 0.012*R;
  for (let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*0.08*R,0.6*R); g.lineTo(i*0.08*R,0.675*R); g.stroke(); }
  g.restore();
  // mustache
  g.fillStyle = hair;
  for (const s of [-1,1]){
    g.beginPath(); g.moveTo(0, 0.47*R);
    g.bezierCurveTo(s*0.24*R,0.38*R, s*0.5*R,0.42*R, s*0.64*R,0.56*R);
    g.bezierCurveTo(s*0.74*R,0.66*R, s*0.9*R,0.6*R, s*0.9*R,0.4*R);
    g.bezierCurveTo(s*0.98*R,0.62*R, s*0.78*R,0.8*R, s*0.56*R,0.72*R);
    g.bezierCurveTo(s*0.4*R,0.66*R, s*0.2*R,0.62*R, 0, 0.62*R);
    g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 0.03*R;
  for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*0.1*R,0.5*R); g.quadraticCurveTo(s*0.45*R,0.47*R,s*0.62*R,0.6*R); g.stroke(); }
  // kundal earrings
  for (const s of [-1,1]){
    g.strokeStyle = '#f2c230'; g.lineWidth = 0.05*R; g.beginPath(); g.arc(s*0.92*R,0.36*R,0.1*R,0,Math.PI*2); g.stroke();
    g.fillStyle = '#c0141a'; g.beginPath(); g.arc(s*0.92*R,0.48*R,0.045*R,0,Math.PI*2); g.fill();
  }
  paintCrown(g, R, o);
  g.restore();
}
export const HEAD_W = 256, HEAD_H = 272, HEAD_CX = 128, HEAD_CY = 150, HEAD_R = 70;
function makeHeadSprite(kind){
  const c = mkCanvas(HEAD_W*SPR, HEAD_H*SPR), g = c.getContext('2d');
  g.scale(SPR,SPR); g.translate(HEAD_CX, HEAD_CY);
  paintHead(g, HEAD_R, {horned: kind==='crowned', maya: kind==='maya'});
  if (kind==='maya'){
    g.setTransform(1,0,0,1,0,0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,20,110,.45)'; g.fillRect(0,0,c.width,c.height);
    g.globalCompositeOperation = 'source-over';
    g.scale(SPR,SPR); g.translate(HEAD_CX, HEAD_CY);
    for (const s of [-1,1]){ const gr = g.createRadialGradient(s*0.37*HEAD_R,0.07*HEAD_R,0,s*0.37*HEAD_R,0.07*HEAD_R,0.32*HEAD_R); gr.addColorStop(0,'rgba(255,60,60,.9)'); gr.addColorStop(1,'rgba(255,0,0,0)'); g.fillStyle = gr; g.fillRect(-HEAD_R,-HEAD_R,2*HEAD_R,2*HEAD_R); }
  }
  return c;
}
function makeAgniSprite(){
  const S0 = 160, c = mkCanvas(S0*SPR, S0*SPR), g = c.getContext('2d'); g.scale(SPR,SPR); g.translate(80,80);
  let gr = g.createRadialGradient(0,0,10,0,0,80); gr.addColorStop(0,'rgba(255,200,90,.9)'); gr.addColorStop(.5,'rgba(255,100,20,.45)'); gr.addColorStop(1,'rgba(255,60,0,0)');
  g.fillStyle = gr; g.fillRect(-80,-80,160,160);
  for (let i=0;i<12;i++){
    g.save(); g.rotate(i*Math.PI/6);
    g.fillStyle = i%2 ? '#ffcf40' : '#ff7a1a';
    g.beginPath(); g.moveTo(-9,-44); g.quadraticCurveTo(-6,-62,0,-72); g.quadraticCurveTo(6,-62,9,-44); g.closePath(); g.fill();
    g.restore();
  }
  gr = g.createRadialGradient(-8,-8,4,0,0,44); gr.addColorStop(0,'#c0341a'); gr.addColorStop(1,'#4a0a06');
  g.fillStyle = gr; g.beginPath(); g.arc(0,0,44,0,Math.PI*2); g.fill();
  g.lineWidth = 6; g.strokeStyle = goldGrad(g,-46,46); g.stroke();
  g.fillStyle = goldGrad(g,-34,30);
  g.beginPath(); g.moveTo(0,-34); g.quadraticCurveTo(15,-14,6,0); g.lineTo(-6,0); g.quadraticCurveTo(-15,-14,0,-34); g.closePath(); g.fill();
  g.fillRect(-3,0,6,30);
  g.strokeStyle = '#7a4a06'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(255,255,200,.9)'; g.beginPath(); g.arc(-3,-20,3,0,Math.PI*2); g.fill();
  return c;
}
export const RV_W = 600, RV_H = 780;
function makeRavanSprite(){
  const c = mkCanvas(RV_W*SPR, RV_H*SPR), g = c.getContext('2d'); g.scale(SPR,SPR);
  const skinG = (x0,x1) => { const gr = g.createLinearGradient(x0,0,x1,0); gr.addColorStop(0,'#5a2c12'); gr.addColorStop(.35,'#b06a36'); gr.addColorStop(.6,'#c98050'); gr.addColorStop(1,'#6a3416'); return gr; };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // gold mojaris
  for (const fx of [255,345]){
    const s = fx < 300 ? -1 : 1;
    g.fillStyle = goldGrad(g,730,760); g.beginPath(); g.ellipse(fx,745,34,14,0,0,Math.PI*2); g.fill();
    g.strokeStyle = '#6a4206'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(fx+s*30,742); g.quadraticCurveTo(fx+s*48,728,fx+s*40,718); g.stroke();
  }
  // dhoti
  const dh = new Path2D();
  dh.moveTo(215,430); dh.lineTo(385,430); dh.bezierCurveTo(420,520,440,640,425,728); dh.lineTo(318,735); dh.lineTo(300,600); dh.lineTo(282,735); dh.lineTo(175,728); dh.bezierCurveTo(160,640,180,520,215,430); dh.closePath();
  let gr = g.createLinearGradient(170,0,430,0); gr.addColorStop(0,'#5a0a0e'); gr.addColorStop(.3,'#a8161a'); gr.addColorStop(.55,'#c42a22'); gr.addColorStop(1,'#5a0a0e');
  g.fillStyle = gr; g.fill(dh);
  g.save(); g.clip(dh);
  g.strokeStyle = 'rgba(40,0,0,.35)'; g.lineWidth = 5;
  for (const [x0,x1] of [[235,205],[260,240],[340,360],[365,395]]){ g.beginPath(); g.moveTo(x0,450); g.quadraticCurveTo((x0+x1)/2+10,600,x1,725); g.stroke(); }
  g.fillStyle = 'rgba(255,210,90,.55)';
  for (let y=470,k=0;y<700;y+=34,k++) for (let x=190;x<420;x+=34){ g.beginPath(); g.arc(x+(k%2?17:0),y,3,0,Math.PI*2); g.fill(); }
  g.strokeStyle = '#e8b53a'; g.lineWidth = 12; g.beginPath(); g.moveTo(165,724); g.lineTo(285,732); g.moveTo(315,732); g.lineTo(435,724); g.stroke();
  g.restore();
  const pl = new Path2D(); pl.moveTo(282,440); pl.lineTo(318,440); pl.lineTo(334,690); pl.quadraticCurveTo(300,705,266,690); pl.closePath();
  g.fillStyle = goldGrad(g,440,700); g.fill(pl); g.strokeStyle = '#7a4e08'; g.lineWidth = 2; g.stroke(pl);
  g.save(); g.clip(pl); g.strokeStyle = '#8a1010'; g.lineWidth = 4;
  for (let y=460;y<700;y+=22){ g.beginPath(); g.moveTo(262,y); g.lineTo(300,y+10); g.lineTo(338,y); g.stroke(); }
  g.restore();
  // torso
  const tor = new Path2D();
  tor.moveTo(212,222); tor.quadraticCurveTo(300,200,388,222); tor.bezierCurveTo(400,300,380,370,365,432); tor.lineTo(235,432); tor.bezierCurveTo(220,370,200,300,212,222); tor.closePath();
  g.fillStyle = skinG(205,395); g.fill(tor);
  g.save(); g.clip(tor);
  g.strokeStyle = 'rgba(60,22,6,.45)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(232,300); g.quadraticCurveTo(268,322,298,300); g.moveTo(302,300); g.quadraticCurveTo(332,322,368,300); g.stroke();
  for (const y of [340,368,396]){ g.beginPath(); g.moveTo(272,y); g.quadraticCurveTo(286,y+6,298,y); g.moveTo(302,y); g.quadraticCurveTo(314,y+6,328,y); g.stroke(); }
  g.beginPath(); g.moveTo(300,315); g.lineTo(300,420); g.stroke();
  const sh = g.createRadialGradient(270,270,10,300,320,170); sh.addColorStop(0,'rgba(255,220,180,.18)'); sh.addColorStop(1,'rgba(0,0,0,.25)'); g.fillStyle = sh; g.fillRect(200,200,200,240);
  g.restore();
  // green angavastram across the chest
  g.strokeStyle = '#e8b53a'; g.lineWidth = 40; g.beginPath(); g.moveTo(372,226); g.quadraticCurveTo(310,330,232,420); g.stroke();
  g.strokeStyle = '#1d6b4a'; g.lineWidth = 32; g.stroke();
  g.strokeStyle = 'rgba(255,220,120,.6)'; g.lineWidth = 2; g.setLineDash([3,7]); g.stroke(); g.setLineDash([]);
  // arms
  const arm = (a,b,cc) => { g.strokeStyle = '#5a2c12'; g.lineWidth = 50; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...b, ...cc); g.stroke(); g.strokeStyle = skinG(a[0]-30,a[0]+30); g.lineWidth = 44; g.stroke(); };
  arm([214,236],[170,330],[172,440]);
  arm([386,236],[432,330],[430,435]);
  g.fillStyle = '#9a5a2c'; g.beginPath(); g.arc(172,452,24,0,Math.PI*2); g.fill(); g.beginPath(); g.arc(430,447,23,0,Math.PI*2); g.fill();
  for (const [x,y] of [[186,300],[414,300]]){ g.fillStyle = goldGrad(g,y-10,y+10); g.beginPath(); g.ellipse(x,y,25,10,0,0,Math.PI*2); g.fill(); g.fillStyle = '#c0141a'; g.beginPath(); g.arc(x,y,5,0,Math.PI*2); g.fill(); }
  for (const [x,y] of [[172,418],[430,412]]){ g.fillStyle = goldGrad(g,y-12,y+12); g.fillRect(x-22,y-12,44,24); g.strokeStyle = '#6a4206'; g.lineWidth = 2; g.strokeRect(x-22,y-12,44,24); }
  // curved sword, Chandrahas
  g.save(); g.translate(172,452);
  const bl = new Path2D(); bl.moveTo(-8,20); bl.quadraticCurveTo(-30,140,-6,262); bl.quadraticCurveTo(12,250,16,230); bl.quadraticCurveTo(0,140,10,20); bl.closePath();
  gr = g.createLinearGradient(-30,0,20,0); gr.addColorStop(0,'#6c7480'); gr.addColorStop(.5,'#e6ecf2'); gr.addColorStop(1,'#8a929e');
  g.fillStyle = gr; g.fill(bl); g.strokeStyle = '#2a2e36'; g.lineWidth = 2; g.stroke(bl);
  g.fillStyle = goldGrad(g,8,24); g.fillRect(-26,8,52,12); g.beginPath(); g.arc(0,-26,9,0,Math.PI*2); g.fill();
  g.restore();
  // belt
  g.fillStyle = goldGrad(g,418,446); g.beginPath(); g.moveTo(228,418); g.quadraticCurveTo(300,430,372,418); g.lineTo(376,446); g.quadraticCurveTo(300,458,224,446); g.closePath(); g.fill(); g.strokeStyle = '#6a4206'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#c0141a'; g.beginPath(); g.moveTo(300,422); g.lineTo(314,437); g.lineTo(300,452); g.lineTo(286,437); g.closePath(); g.fill();
  // neck + necklace
  g.fillStyle = skinG(272,328); g.fillRect(272,180,56,50);
  for (const [r,w,col] of [[78,14,'g'],[64,8,'r'],[52,10,'g']]){ g.strokeStyle = col==='g' ? goldGrad(g,225,300) : '#c0141a'; g.lineWidth = w; g.beginPath(); g.ellipse(300,215,r,r*0.62,0,0.12*Math.PI,0.88*Math.PI); g.stroke(); }
  g.fillStyle = goldGrad(g,262,306); g.beginPath(); g.moveTo(300,262); g.lineTo(318,282); g.lineTo(300,306); g.lineTo(282,282); g.closePath(); g.fill();
  g.fillStyle = '#1f9a5a'; g.beginPath(); g.arc(300,283,7,0,Math.PI*2); g.fill();
  // ten heads: five to one side, four to the other, the horned crown in front
  const R0 = 58, offs = [52,98,140,178,212], scl = [.86,.78,.71,.65,.59];
  const order = [];
  for (let k=4;k>=0;k--){ order.push([-1,k]); if (k<4) order.push([1,k]); }
  for (const [s,k] of order){ g.save(); g.translate(300+s*offs[k], 134+(k+1)*3); g.scale(scl[k],scl[k]); paintHead(g,R0,{}); g.restore(); }
  g.save(); g.translate(300,128); paintHead(g,R0,{horned:true}); g.restore();
  return c;
}
export const GLOW = {};
function mkGlow(name, stops){ const c = mkCanvas(64,64), g = c.getContext('2d'), gr = g.createRadialGradient(32,32,0,32,32,32); stops.forEach(([o,col])=>gr.addColorStop(o,col)); g.fillStyle = gr; g.fillRect(0,0,64,64); GLOW[name] = c; }
mkGlow('core',  [[0,'rgba(255,255,230,1)'],[.25,'rgba(255,230,140,.9)'],[1,'rgba(255,170,60,0)']]);
mkGlow('orange',[[0,'rgba(255,190,80,.95)'],[.4,'rgba(255,110,20,.6)'],[1,'rgba(200,40,0,0)']]);
mkGlow('red',   [[0,'rgba(255,90,30,.8)'],[.5,'rgba(180,30,10,.35)'],[1,'rgba(80,0,0,0)']]);
mkGlow('maya',  [[0,'rgba(240,210,255,1)'],[.3,'rgba(178,107,255,.75)'],[1,'rgba(80,20,140,0)']]);
mkGlow('smoke', [[0,'rgba(40,30,28,.5)'],[1,'rgba(40,30,28,0)']]);
mkGlow('white', [[0,'rgba(255,255,255,1)'],[.3,'rgba(255,255,255,.45)'],[1,'rgba(255,255,255,0)']]);
export const HEADS = {head: makeHeadSprite('head'), crowned: makeHeadSprite('crowned'), maya: makeHeadSprite('maya')};
export const AGNI = makeAgniSprite();
export const RAVAN = makeRavanSprite();
