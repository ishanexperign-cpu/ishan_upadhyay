// Ravan Dahan · game flow, rules for each mode, shooting, rendering.
import { $, MOBILE, SECURE, SPR, esc, fmt, clamp, ease, rng, mkCanvas, goldGrad, uid, store } from './util.js';
import { CREDITS, SPEECH, LAUGH, EVILS, SOLO, LOCAL, ONLINE, AGNI_SECS, AGNI_RADIUS, LEVEL_COUNT, MODES, COMMON_RULES,
         levelCfg, envFor, arrowSpeed, EYE, GRAVITY, AVATARS, ENVS } from './data.js';
import { HEADS, AGNI, RAVAN, GLOW, HEAD_W, HEAD_H, HEAD_CX, HEAD_CY, HEAD_R, RV_W, RV_H } from './art.js';
import { view, project, resizeView, repaintEnvs, envBg } from './world.js';
import { fx, clearFx, updateParts, drawParts, drawClouds, firework, updateFW, drawFW, spawnFlame, blast, updateFire, drawFire } from './fx.js';
import * as A from './audio.js';
import { createHand, SENS } from './hand.js';
import * as L from './ledger.js';
import { joinRoomChannel } from './room.js';

/* ================= canvas ================= */
const cv = $('game'), ctx = cv.getContext('2d');
let W, H, DPR, F, HZ, CX;
function resize(){
  resizeView(); ({W, H, DPR, F, HZ, CX} = view);
  cv.width = W*DPR; cv.height = H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
}
fx.onCracker = v => A.sCracker(v);

/* ================= state ================= */
// S.game: which mode ('solo' | 'local' | 'online'). S.mode: which phase of it.
const S = { game:'solo', mode:'menu', input:'camera', t:0, runT:0, left:0, coins:0, shown:0, heads:0, tally:new Array(10).fill(0), combo:0,
            shots:0, hits:0, level:0, agni:0, lives:SOLO.lives, escapes:0, zoom:1, shake:0, flash:0, cd:0, readyAt:0, paused:false,
            ei:0, eFrom:0, eMix:1 };
let heads = [], arrows = [], floaters = [], coins = [];
const aim = {x:0, y:0, rx:0, ry:0}, hist = [];
const draw = {on:false, start:0, power:0, reload:0};
let roster = [], cur = 0, lock = null, MATCH = uid(), LEVEL_SECS = 120, TURN = LEVEL_SECS*LEVEL_COUNT, spawner = null;
const timed = () => S.game !== 'solo';

function setEnv(i){
  document.documentElement.style.setProperty('--envc', ENVS[i].accent);
  if (i === S.ei) return;
  S.eFrom = S.ei; S.ei = i; S.eMix = 0;
}

/* ================= menu ================= */
const prefs = store.get('rdPrefs', {});
const savePrefs = () => store.set('rdPrefs', prefs);
let menuMode = ['solo','local','online'].includes(prefs.mode) ? prefs.mode : 'solo';
let localCount = clamp(prefs.count || 2, LOCAL.minPlayers, LOCAL.maxPlayers);
$('soloName').value = prefs.soloName || '';
$('onName').value = prefs.onName || prefs.soloName || '';
$('levelLen').value = String(prefs.levelLen || 120);
$('onLen').value = String(prefs.onLen || 60);
$('pinchSens').value = prefs.sens || 'normal';
S.input = prefs.input === 'mouse' ? 'mouse' : 'camera';
if (MOBILE) $('inputMouseBtn').textContent = 'Touch';
const roomParam = new URLSearchParams(location.search).get('room');
if (roomParam){ menuMode = 'online'; $('onCode').value = roomParam.toUpperCase().slice(0,4); }

function buildNames(){
  const saved = prefs.names || [];
  const keep = [...document.querySelectorAll('#names input')].map(i => i.value);
  $('names').innerHTML = Array.from({length:localCount},(_,i)=>`<label class="field"><span class="label">Archer ${i+1}</span><input id="pn${i}" maxlength="14" value="${esc(keep[i] ?? saved[i] ?? 'Archer '+(i+1))}"></label>`).join('');
  $('pCount').textContent = localCount;
  $('pMinus').disabled = localCount <= LOCAL.minPlayers; $('pPlus').disabled = localCount >= LOCAL.maxPlayers;
}
function setMenuMode(m){
  menuMode = m; prefs.mode = m; savePrefs();
  document.querySelectorAll('#modeTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
  $('fSolo').hidden = m !== 'solo'; $('fLocal').hidden = m !== 'local'; $('fOnline').hidden = m !== 'online';
  $('startBtns').hidden = m === 'online';
  $('btnStart').textContent = m === 'solo' ? 'Start run' : 'Start match';
}
function setInput(i){ S.input = i; prefs.input = i; savePrefs(); document.querySelectorAll('#inputSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.input === i)); }
document.querySelectorAll('#modeTabs button').forEach(b => b.addEventListener('click', () => setMenuMode(b.dataset.mode)));
document.querySelectorAll('#inputSeg button').forEach(b => b.addEventListener('click', () => setInput(b.dataset.input)));
$('pMinus').addEventListener('click', () => { localCount = Math.max(LOCAL.minPlayers, localCount-1); prefs.count = localCount; savePrefs(); buildNames(); });
$('pPlus').addEventListener('click', () => { localCount = Math.min(LOCAL.maxPlayers, localCount+1); prefs.count = localCount; savePrefs(); buildNames(); });
buildNames(); setMenuMode(menuMode); setInput(S.input);

$('creditList').innerHTML = CREDITS.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
$('evilList').innerHTML = EVILS.map(e=>`<span><b lang="hi">${e.d}</b>${e.n}<small>${e.m}</small></span>`).join('');
$('tally').innerHTML = EVILS.map((e,i)=>`<div class="tc zero" id="tc${i}"><b>×0</b><small>${e.n}</small></div>`).join('');
for (const [id,spr] of [['icoHead',HEADS.head],['icoCrown',HEADS.crowned],['icoAgni',AGNI],['icoMaya',HEADS.maya]]){
  const c = $(id), g = c.getContext('2d'), s = Math.min(c.width/spr.width, c.height/spr.height);
  g.drawImage(spr, (c.width-spr.width*s)/2, (c.height-spr.height*s)/2, spr.width*s, spr.height*s);
}
const evGrid = tally => EVILS.map((e,i)=>`<div class="ev ${tally[i]?'':'zero'}"><div class="d">${e.d}</div><div class="n">${e.n}</div><div class="c">×${tally[i]}</div></div>`).join('');

/* rules panel */
function showRules(m){
  document.querySelectorAll('#ruleTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
  $('ruleList').innerHTML = MODES[m].rules.map(r => `<li>${esc(r)}</li>`).join('');
}
document.querySelectorAll('#ruleTabs button').forEach(b => b.addEventListener('click', () => showRules(b.dataset.mode)));
$('menuRules').addEventListener('click', () => { showRules(menuMode); openOverlay('rulesPanel'); });
$('rulesClose').addEventListener('click', closeOverlay);

/* ================= panels ================= */
const PANELS = ['menu','turn','lobby','dialog','rulesPanel','boardPanel','creditsPanel'];
function showPanel(id){ for (const p of PANELS) $(p).hidden = p !== id; }
const visiblePanel = () => PANELS.find(p => !$(p).hidden) || null;
let overlayReturn = null;
function openOverlay(id){ overlayReturn = visiblePanel(); showPanel(id); }
function closeOverlay(){ showPanel(overlayReturn); overlayReturn = null; }
function hideGameUI(){ for (const id of ['hud','controls','tally','hint','liveBoard']) $(id).hidden = true; }
function setButtons(boxId, list){
  const box = $(boxId); box.innerHTML = '';
  for (const b of list){ if (!b) continue; const el = document.createElement('button'); el.textContent = b.label; if (b.ghost) el.className = 'ghost'; if (b.cls) el.className = b.cls; el.addEventListener('click', b.fn); box.appendChild(el); }
  box.firstChild?.focus({preventScroll:true});
}
function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(()=>t.hidden = true, 2400); }
// A title card: optional Devanagari headline (Rozha One), a Latin title and one line under it.
function banner(title, sub, cls='', dur=2, deva=''){
  const el = document.createElement('div'); el.className = 'banner ' + cls + (deva ? ' has-deva' : ''); el.style.setProperty('--dur', dur+'s');
  el.innerHTML = `${deva ? `<em lang="hi">${esc(deva)}</em>` : ''}<strong>${esc(title)}</strong><span>${esc(sub)}</span>`;
  $('banners').replaceChildren(el); setTimeout(()=>el.remove(), dur*1000 + 100);   // newest banner replaces any still showing
}
$('creditsClose').addEventListener('click', closeOverlay);
$('menuCredits').addEventListener('click', () => openOverlay('creditsPanel'));

/* global ledger inside the game */
function openBoard(tab){
  const me = roster.filter(played).map(p=>p.name.trim().toLowerCase()).join('|');
  $('boardFrame').src = `board.html?embed=1&tab=${tab || (S.game==='solo' ? 'solo' : 'multi')}${me ? '&me='+encodeURIComponent(me) : ''}`;
  openOverlay('boardPanel');
}
$('boardClose').addEventListener('click', () => { $('boardFrame').src = 'about:blank'; closeOverlay(); });
$('boardOpen').addEventListener('click', () => { const a = document.createElement('a'); a.href = 'board.html'; a.target = '_blank'; a.rel = 'noopener'; a.click(); });
$('menuBoard').addEventListener('click', () => openBoard(menuMode === 'solo' ? 'solo' : 'multi'));
if (!L.DB_READY){ $('menuBoard').hidden = true; }

/* ================= heads and the seeded spawner ================= */
// Every head comes from a seeded sequence, so all devices in an Online room see the same heads at the same moment.
function makeSpawner(seed){ return { r: rng(seed), next: 0 }; }
function addHead(type, zf, xf, yf, vyf, evil, ph, cfg, ambient=false){
  const z = 11 + zf*32, half = (W/2/F)*z*0.82;
  const base = type==='agni' ? 0.42 : type==='crowned' ? 0.6 : 0.52;
  heads.push({ x:xf*half, y:0.2+yf*1.2, z, vy:(type==='agni'?1.4:0.65) + vyf*0.6, r: base*(ambient ? 1 : cfg.size), evil, type, ph, born:S.t, dead:false, ambient });
}
function drawFromSpawner(force){
  const cfg = levelCfg(S.level), r = spawner.r;
  const roll = r(), zf = r(), xf = r()*2-1, yf = r(), vyf = r(), evil = (r()*10)|0, ph = r()*6.28, gap = r();
  let type = 'head';
  if (roll < cfg.maya) type = 'maya'; else if (roll < cfg.maya + 0.05) type = 'agni'; else if (roll < cfg.maya + 0.14) type = 'crowned';
  if (S.game === 'online' || heads.length < 16 || force) addHead(type, zf, xf, yf, vyf, evil, ph, cfg);
  return cfg.every*(0.8 + gap*0.4);
}
function stepSpawner(){ while (S.runT >= spawner.next) spawner.next += drawFromSpawner(false); }
function preseed(n){ for (let i=0;i<n;i++){ drawFromSpawner(true); const h = heads[heads.length-1]; if (h && h.type==='maya') h.type = 'head'; if (h) h.y = 0.6 + (i/n)*3.4; } }
function spawnAmbient(){ addHead(Math.random()<.12 ? 'crowned' : 'head', Math.random(), Math.random()*2-1, Math.random(), Math.random(), (Math.random()*10)|0, Math.random()*6.28, levelCfg(0), true); }

/* ================= starting each mode ================= */
let hand = null;
async function ensureInput(){
  A.audio(); goFullscreen(); keepAwake();
  if (S.input !== 'camera'){ cv.style.cursor = 'crosshair'; $('cam').hidden = true; return true; }
  const note = $('menuNote'); note.className = 'note'; note.textContent = 'Loading hand tracking…';
  try {
    if (!hand) hand = createHand({ video:$('video'), dots:$('camDots'), camBox:$('cam'), ui:{state:$('camState'), gap:$('camGap'), tag:$('camTag')},
      onAim:(x,y) => { aim.rx = x*W; aim.ry = y*H; }, onDown:onPinchStart, onUp:release,
      onLost:(wasPinched) => { $('hint').hidden = S.mode!=='play' || S.paused; if (wasPinched){ draw.on = false; draw.power = 0; } },
      onFound:() => { $('hint').hidden = true; },
      label:(p) => p ? (S.mode==='play' ? `DRAW ${Math.round(draw.power*100)}%` : 'PINCH') : 'HAND OK' });
    hand.pinch.sens = SENS[$('pinchSens').value] ?? 0.25;
    await hand.init();
    cv.style.cursor = 'none'; note.textContent = 'The camera runs on this device. Nothing is uploaded.';
    return true;
  } catch(err){
    note.className = 'note err';
    let framed = false; try { framed = window.top !== window; } catch(x){ framed = true; }
    if (err?.name === 'Insecure'){ $('secureNote').hidden = false; note.textContent = 'Switch Play with to Touch, or open the https link.'; }
    else if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') note.textContent = framed ? 'The camera is blocked in this preview. Open the game in its own browser tab.' : (MOBILE ? 'Camera permission was blocked. Allow it in your browser\'s site settings, then try again.' : 'Camera permission was blocked. Allow it from the camera icon in the address bar, then try again.');
    else if (err?.name === 'NotFoundError') note.textContent = 'No camera found. Switch Play with to Mouse.';
    else if (err?.name === 'NotReadableError') note.textContent = 'The camera is busy in another app. Close it and try again.';
    else if (/import|fetch/i.test(err?.message || '')) note.textContent = 'Hand tracking could not download. It needs internet the first time. Check your connection and try again.';
    else note.textContent = err?.message || 'Hand tracking could not start. Try Chrome, or switch Play with to Mouse.';
    $('cam').hidden = true; return false;
  }
}
const cleanName = (v, d) => (v || '').trim().slice(0,14) || d;
const newArcher = (name, i) => ({ name, color:AVATARS[i % AVATARS.length], coins:0, heads:0, tally:new Array(10).fill(0), level:1, shots:0, hits:0, status:'wait', time:0, lives:null });

$('btnStart').addEventListener('click', async e => {
  const btn = e.currentTarget; btn.disabled = true;
  prefs.sens = $('pinchSens').value; savePrefs();
  const ok = await ensureInput(); btn.disabled = false; if (!ok) return;
  if (menuMode === 'solo') startSolo(); else startLocal();
});
function startSolo(){
  const name = cleanName($('soloName').value, 'Archer'); prefs.soloName = name; savePrefs();
  S.game = 'solo'; roster = [newArcher(name, 0)]; cur = 0; MATCH = uid();
  if (prefs.seenIntro) showReady(); else startIntro();
}
function startLocal(){
  const names = Array.from({length:localCount},(_,i)=>cleanName($(`pn${i}`).value, `Archer ${i+1}`));
  prefs.names = names; prefs.levelLen = +$('levelLen').value; savePrefs();
  S.game = 'local'; LEVEL_SECS = prefs.levelLen; TURN = LEVEL_SECS*LEVEL_COUNT;
  roster = names.map(newArcher); cur = 0; MATCH = uid();
  startIntro();
}
function rematch(){
  MATCH = uid(); roster.forEach((p,i) => Object.assign(p, newArcher(p.name, i))); cur = 0; showReady();
}

/* ================= turns (all modes) ================= */
function showReady(){
  S.mode = 'ready'; S.readyAt = performance.now(); setEnv(0);
  roster[cur].status = 'next';
  hideGameUI(); showPanel('turn'); $('tGrid').hidden = true; $('netChip').hidden = true;
  const solo = S.game === 'solo';
  $('ledgerWrap').hidden = solo;
  $('tEyebrow').textContent = solo ? 'Solo · endless' : `Archer ${cur+1} of ${roster.length}`;
  $('tTitle').textContent = `${roster[cur].name}, take up the bow`;
  $('tSub').className = 'sub';
  const how = S.input==='camera' ? (MOBILE ? 'Prop the phone up, step back into frame, then pinch or tap Start.' : 'Step into frame, then pinch or press Start.') : (MOBILE ? 'Touch and hold to draw, lift to loose.' : 'Press and hold to draw, release to loose.');
  $('tSub').textContent = solo ? `${how} You have ${SOLO.lives} diyas. Maya, or ${SOLO.escapesPerLife} escaped heads, puts one out.` : `${how} 4 levels × ${fmt(LEVEL_SECS)}, from dusk to the night of fire.`;
  if (!solo) renderLedger(false);
  setButtons('tBtns', [
    {label: solo ? 'Start run' : 'Start turn', fn:() => startCountdown()},
    !solo && {label:'Skip this archer', ghost:true, fn:skipArcher},
    {label:'How to play', ghost:true, fn:() => { showRules(S.game); openOverlay('rulesPanel'); }},
    {label: solo ? 'Menu' : 'Quit match', cls: solo ? 'ghost' : 'danger', fn: solo ? toMenu : () => openDialog('quit')},
  ]);
}
function resetRun(){
  Object.assign(S, {t:0, runT:0, left:TURN, coins:0, shown:0, heads:0, tally:new Array(10).fill(0), combo:0, shots:0, hits:0, level:0, agni:0, lives:SOLO.lives, escapes:0, paused:false});
  heads = []; arrows = []; floaters = []; coins = []; clearFx();
}
function startCountdown(delay){
  if (S.mode !== 'ready' && S.mode !== 'lobby') return;
  A.audio(); resetRun(); S.mode = 'countdown'; S.cd = (typeof delay === "number" ? delay : 3999)/1000; showPanel(null);
  A.sDhol();
}
function startTurn(){
  S.mode = 'play'; roster[cur].status = 'play';
  spawner = makeSpawner(S.game === 'online' ? R.seed : (Math.random()*2147483646|0) + 1);
  preseed(6);
  aim.x = aim.rx = CX; aim.y = aim.ry = HZ - H*0.1;
  const solo = S.game === 'solo';
  $('hud').hidden = false; $('controls').hidden = false; $('tally').hidden = false; $('liveBoard').hidden = S.game !== 'online';
  $('segs').hidden = solo; $('soloBar').hidden = !solo; $('soloRow').hidden = !solo;
  $('btnSkip').hidden = S.game !== 'local';
  $('btnQuit').textContent = solo ? 'End run' : S.game === 'online' ? 'Leave room' : 'Quit match';
  $('pname').textContent = roster[cur].name; $('avatar').textContent = roster[cur].name.trim()[0]?.toUpperCase() || '?';
  $('avatar').style.background = roster[cur].color;
  EVILS.forEach((e,i)=>{ const c = $('tc'+i); c.className = 'tc zero'; c.querySelector('b').textContent = '×0'; });
  checkRotate();
  banner('Level 1', `${ENVS[0].name}, ${ENVS[0].en.toLowerCase()}`, '', 2.2, ENVS[0].deva); A.sConch(); lastHud = ''; updateHUD();
  if (S.game === 'online') sendScore(false);
}
const played = p => ['done','maya','skip','quit','lives'].includes(p.status);
function recordTurn(reason){
  const p = roster[cur];
  const status = reason==='time' ? 'done' : reason;
  Object.assign(p, {coins:S.coins, heads:S.heads, tally:S.tally.slice(), level:S.level+1, shots:S.shots, hits:S.hits, status, time:S.runT, lives:S.game==='solo' ? S.lives : null});
  if (S.game==='solo' && S.coins > (prefs.best||0)){ prefs.best = S.coins; savePrefs(); }
  if (!p.heads && !p.shots && S.game !== 'online') return;
  const row = { id:uid(), match_id: S.game==='online' ? R.matchId : MATCH, mode:S.game, device_id:L.DEVICE, player_name:p.name,
    coins:p.coins, heads:p.heads, level_reached:Math.min(60, p.level), duration_s:Math.round(Math.min(7200, p.time)), shots:p.shots, hits:Math.min(p.hits, p.shots),
    lives_left: S.game==='solo' ? Math.max(0, S.lives) : null, end_reason:reason, input: S.input==='camera' ? 'camera' : (MOBILE ? 'touch' : 'mouse'),
    tally:p.tally.slice(0,10), level_secs: S.game==='solo' ? null : LEVEL_SECS };
  netStatus('Saving to the global ledger…');
  L.saveTurn(row).then(st => netStatus(st==='saved' ? 'Saved to the global ledger.' : st==='queued' ? 'Offline. This turn will be saved when the connection returns.' : '', st==='saved' ? 'ok' : 'bad'));
}
function netStatus(text, cls){ const c = $('netChip'); if (!L.DB_READY || !text){ c.hidden = true; return; } c.hidden = false; c.className = 'netchip ' + (cls||''); c.textContent = text; }

function endTurn(reason){
  if (S.mode !== 'play' && S.mode !== 'busting') return;
  recordTurn(reason);
  draw.on = false; draw.power = 0; $('banners').innerHTML = ''; S.paused = false; S.shown = S.coins; coins = [];
  S.mode = 'turnover'; S.readyAt = performance.now();
  hideGameUI();
  if (S.game === 'solo'){ startFinale(); return; }
  if (S.game === 'online'){ R.myDone = true; sendScore(true); showWaiting(); return; }
  const p = roster[cur];
  showPanel('turn'); $('ledgerWrap').hidden = false;
  $('tEyebrow').textContent = `Archer ${cur+1} of ${roster.length} · turn over`;
  $('tTitle').textContent = `${p.name}: ${p.coins} gold coins`;
  $('tSub').className = reason==='maya' ? 'sub bad' : 'sub';
  const acc = p.shots ? Math.round(p.hits/p.shots*100) : 0;
  $('tSub').textContent = reason==='maya' ? `Fooled by Maya at ${fmt(p.time)} in ${ENVS[envFor(p.level-1)].name}. ${p.heads} heads struck down before that.`
    : reason==='skip' ? `Turn skipped at ${fmt(p.time)}. ${p.heads} heads struck down, coins kept.`
    : `Time's up. ${p.heads} heads of evil struck down, ${acc}% of arrows found their mark.`;
  $('tGrid').hidden = false; $('tGrid').innerHTML = evGrid(p.tally);
  renderLedger(false);
  const nextBtn = cur < roster.length-1 ? {label:`Next: ${roster[cur+1].name}`, fn:nextPlayer} : {label:'Light the Ravan Dahan', fn:startFinale};
  setButtons('tBtns', [nextBtn, {label:'Save ledger PNG', ghost:true, fn:exportLedger}, L.DB_READY && {label:'Global ledger', ghost:true, fn:()=>openBoard('multi')}, {label:'Quit match', cls:'danger', fn:()=>openDialog('quit')}]);
}
function nextPlayer(){ if (cur < roster.length-1){ cur++; showReady(); } else startFinale(); }
function skipArcher(){ Object.assign(roster[cur], {status:'skip', time:0}); nextPlayer(); }
function quitMatch(){
  const live = S.mode==='play' || S.mode==='busting' || S.paused;
  S.paused = false; draw.on = false; $('banners').innerHTML = '';
  if (S.game === 'online'){ if (live){ S.mode = 'play'; endTurn('quit'); } leaveRoom(); toMenu(); return; }
  if (live){ recordTurn('quit'); }
  roster.forEach(p => { if (['wait','next','play'].includes(p.status)) p.status = 'np'; });
  if (S.game === 'solo' && !live){ toMenu(); return; }
  startFinale();
}
function toMenu(){
  try{ wake?.release(); }catch(e){}
  S.mode = 'menu'; RV.phase = null; setEnv(0); hideGameUI(); $('bubble').hidden = true; $('finaleSkip').hidden = true;
  heads = []; showPanel('menu');
}

/* ================= Solo: lives and escapes ================= */
function loseLife(why){
  S.lives--; S.combo = 0; A.sLifeLost(); S.shake = 0.35; lastHud = ''; updateHUD();
  if (S.lives <= 0){ banner('The last diya is out', why, 'maya', 1.6, 'माया'); S.mode = 'busting'; setTimeout(()=>endTurn('lives'), 1500); }
  else banner(why, `${S.lives} ${S.lives===1 ? 'diya' : 'diyas'} left`, 'maya', 1.6);
}
function headEscaped(){
  if (S.game !== 'solo' || S.mode !== 'play') return;
  S.escapes++; lastHud = '';
  if (S.escapes >= SOLO.escapesPerLife){ S.escapes = 0; loseLife(`${SOLO.escapesPerLife} heads escaped`); }
}
function soloLevelCheck(){
  const lv = Math.floor(S.heads / SOLO.headsPerLevel);
  if (lv !== S.level){
    S.level = lv; setEnv(envFor(lv)); A.sConch();
    const E = ENVS[envFor(lv)];
    banner(`Level ${lv+1}`, lv < 4 ? `${E.name}, ${E.en.toLowerCase()}` : 'The night burns hotter', '', 2.2, E.deva);
  }
}

/* ================= Online rooms ================= */
const R = { code:null, matchId:null, seed:1, levelSecs:60, host:false, secret:null, chan:null, peers:[], scores:new Map(), live:false, myDone:false, startedAt:0, poll:null, finished:false, me:null };
function onlineName(){ const n = cleanName($('onName').value, 'Archer'); prefs.onName = n; savePrefs(); return n; }
$('btnCreate').addEventListener('click', async e => {
  if (!L.DB_READY){ $('menuNote').className = 'note err'; $('menuNote').textContent = 'Online rooms need the Supabase connection in config.js.'; return; }
  const btn = e.currentTarget; btn.disabled = true;
  try {
    prefs.onLen = +$('onLen').value; savePrefs();
    if (!(await ensureInput())) return;
    const room = await L.createRoom(onlineName(), prefs.onLen);
    Object.assign(R, { code:room.code, matchId:room.match_id, seed:room.seed, levelSecs:prefs.onLen, host:true, secret:room.host_secret });
    enterLobby();
  } catch(err){ $('menuNote').className = 'note err'; $('menuNote').textContent = 'Could not create a room. ' + err.message; }
  finally { btn.disabled = false; }
});
$('btnJoin').addEventListener('click', async e => {
  const code = $('onCode').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)){ $('menuNote').className = 'note err'; $('menuNote').textContent = 'Enter the 4-letter room code.'; $('onCode').focus(); return; }
  if (!L.DB_READY){ $('menuNote').className = 'note err'; $('menuNote').textContent = 'Online rooms need the Supabase connection in config.js.'; return; }
  const btn = e.currentTarget; btn.disabled = true;
  try {
    const room = await L.getRoom(code);
    if (!room) throw new Error(`No room called ${code}. Check the code with the host.`);
    if (room.status !== 'lobby') throw new Error(`Room ${code} has already started.`);
    if (!(await ensureInput())) return;
    Object.assign(R, { code, matchId:room.match_id, seed:room.seed, levelSecs:room.level_secs, host:false, secret:null });
    enterLobby();
  } catch(err){ $('menuNote').className = 'note err'; $('menuNote').textContent = err.message; }
  finally { btn.disabled = false; }
});
function enterLobby(){
  S.game = 'online'; S.mode = 'lobby'; LEVEL_SECS = R.levelSecs; TURN = LEVEL_SECS*LEVEL_COUNT;
  Object.assign(R, { peers:[], scores:new Map(), live:false, myDone:false, finished:false });
  R.me = { device:L.DEVICE, name:onlineName(), host:R.host, joinedAt:Date.now() };
  roster = [newArcher(R.me.name, 0)]; cur = 0;
  R.chan = joinRoomChannel(R.code, R.me, { peers:onPeers, event:onRoomEvent, status:s => { if (s==='CHANNEL_ERROR' || s==='TIMED_OUT') $('lobbyNote').textContent = 'Live connection trouble. Retrying…'; } });
  $('lobbyCode').textContent = R.code;
  $('lobbySub').textContent = `${R.host ? 'You are the host.' : 'Waiting for the host to start.'} 4 levels × ${fmt(LEVEL_SECS)}. Everyone shoots the same heads at the same time.`;
  hideGameUI(); showPanel('lobby'); renderLobby();
  clearInterval(R.poll);
  if (!R.host) R.poll = setInterval(async () => {   // backup in case the start message is missed
    if (R.live || S.mode !== 'lobby') return clearInterval(R.poll);
    try { const room = await L.getRoom(R.code); if (room?.status === 'live') beginOnline(2000); } catch(e){}
  }, 3000);
}
function renderLobby(){
  const list = R.peers.length ? R.peers : [R.me];
  $('peerList').innerHTML = list.slice().sort((a,b)=>a.joinedAt-b.joinedAt).map((p,i)=>
    `<li><span class="av" style="background:${AVATARS[i % AVATARS.length]}">${esc(p.name[0]?.toUpperCase()||'?')}</span>${esc(p.name)}${p.host ? '<small>Host</small>' : p.device===L.DEVICE ? '<small>You</small>' : ''}</li>`).join('');
  const n = list.length;
  $('lobbyNote').textContent = R.host ? (n < 2 ? 'Share the code. You can start once another archer joins.' : `${n} archers ready. Start when everyone is in.`) : `${n} archer${n>1?'s':''} in the room.`;
  setButtons('lobbyBtns', [
    R.host && {label:`Start for ${n}`, fn:hostStart},
    {label:'How to play', ghost:true, fn:() => { showRules('online'); openOverlay('rulesPanel'); }},
    {label:'Leave room', cls:'danger', fn:() => { leaveRoom(); toMenu(); }},
  ]);
  if (R.host) $('lobbyBtns').firstChild.disabled = n < 2;
}
$('copyLink').addEventListener('click', async () => {
  const link = `${location.origin}${location.pathname}?room=${R.code}`;
  try { await navigator.clipboard.writeText(link); toast('Invite link copied'); } catch(e){ toast(link); }
});
function onPeers(list){
  R.peers = list;
  if (S.mode === 'lobby') renderLobby();
  if (R.live){ renderLiveBoard(); checkRoomDone(); }
}
function onRoomEvent(ev, p){
  if (ev === 'start') beginOnline(p?.delay ?? ONLINE.startDelay);
  else if (ev === 'score' && p?.device){ R.scores.set(p.device, p); renderLiveBoard(); if (R.myDone) renderWaiting(); checkRoomDone(); }
}
async function hostStart(){
  const btn = $('lobbyBtns').firstChild; if (btn) btn.disabled = true;
  try { await L.startRoom(R.code, R.secret); R.chan.send('start', {delay:ONLINE.startDelay}); beginOnline(ONLINE.startDelay); }
  catch(err){ $('lobbyNote').textContent = 'Could not start the room. ' + err.message; if (btn) btn.disabled = false; }
}
function beginOnline(delay){
  if (R.live) return;
  R.live = true; clearInterval(R.poll); R.startedAt = performance.now() + delay;
  roster[0].status = 'next'; startCountdown(delay);
}
let lastScoreSent = 0;
function sendScore(done){
  if (!R.chan) return;
  const msg = { device:L.DEVICE, name:R.me.name, coins:S.coins, heads:S.heads, level:S.level+1, done, reason: done ? roster[0].status : null };
  R.scores.set(L.DEVICE, msg); R.chan.send('score', msg); lastScoreSent = performance.now();
  renderLiveBoard();
}
function roomStandings(){
  const present = new Set(R.peers.map(p => p.device));
  const rows = [...R.scores.values()].map(s => ({...s, away: !present.has(s.device) && s.device !== L.DEVICE}));
  for (const p of R.peers) if (!R.scores.has(p.device)) rows.push({device:p.device, name:p.name, coins:0, heads:0, level:1, done:false});
  return rows.sort((a,b)=> b.coins - a.coins || b.heads - a.heads);
}
function renderLiveBoard(){
  if (S.game !== 'online') return;
  $('liveBoard').innerHTML = roomStandings().slice(0, ONLINE.maxPlayers).map(s =>
    `<div class="${s.device===L.DEVICE?'me':''} ${s.away?'gone':''}"><span class="st ${s.away?'away':s.done?(s.reason==='maya'?'maya':'done'):''}"></span><span>${esc(s.name)}</span><b>${s.coins}</b></div>`).join('');
}
function showWaiting(){ showPanel('turn'); $('ledgerWrap').hidden = false; renderWaiting(); }
function renderWaiting(){
  if (S.mode !== 'turnover' || S.game !== 'online') return;
  const p = roster[0], rows = roomStandings(), left = rows.filter(s => !s.done && !s.away).length;
  $('tEyebrow').textContent = `Online room ${R.code}`;
  $('tTitle').textContent = `${p.name}: ${p.coins} gold coins`;
  $('tSub').className = p.status==='maya' ? 'sub bad' : 'sub';
  $('tSub').textContent = (p.status==='maya' ? 'Fooled by Maya. ' : p.status==='quit' ? '' : "Time's up. ") + (left ? `Waiting for ${left} archer${left>1?'s':''} to finish.` : 'Everyone has finished.');
  $('tGrid').hidden = false; $('tGrid').innerHTML = evGrid(p.tally);
  $('ledger').innerHTML = `<thead><tr><th>Place</th><th>Archer</th><th class="num">Coins</th><th class="num">Heads</th><th>Status</th></tr></thead><tbody>` +
    rows.map((s,k)=>`<tr class="${s.device===L.DEVICE?'now':''}"><td>${k+1}</td><td><div class="who-cell"><span>${esc(s.name)}</span></div></td><td class="score"><span class="coin"></span>${s.coins}</td><td class="num">${s.heads}</td>
      <td><span class="pill ${s.away?'p-wait':s.done?(s.reason==='maya'?'p-maya':'p-done'):'p-next'}">${s.away?'Left':s.done?(s.reason==='maya'?'Maya':'Done'):'Shooting'}</span></td></tr>`).join('') + '</tbody>';
  setButtons('tBtns', [{label: left ? 'See results now' : 'Light the Ravan Dahan', fn:finishRoomFlow}, {label:'Leave room', cls:'danger', fn:() => { leaveRoom(); toMenu(); }}]);
}
function checkRoomDone(){
  if (!R.live || !R.myDone || R.finished) return;
  const waiting = roomStandings().filter(s => !s.done && !s.away).length;
  const overtime = performance.now() > R.startedAt + TURN*1000 + 20000;
  if (!waiting || overtime) finishRoomFlow();
}
function finishRoomFlow(){
  if (R.finished) return; R.finished = true;
  if (R.host) L.finishRoom(R.code, R.secret);
  startFinale();
}
function leaveRoom(){ clearInterval(R.poll); try{ R.chan?.leave(); }catch(e){} R.chan = null; R.live = false; R.code = null; }

/* ================= Ravan: the introduction and the burning ================= */
const RV = {phase:null, t:0, line:0, chars:0, work:null, wg:null, rows:null, step:0, next:0, front:0};
function ravanSize(){ const h = Math.min(H*0.86, W*0.96*RV_H/RV_W); return {h, w:h*RV_W/RV_H}; }
function ravanPose(){
  const {h} = ravanSize(), t = RV.t, near = H*0.985, far = HZ + H*0.012, breathe = 1 + Math.sin(S.t*1.6)*0.006;
  switch (RV.phase){
    case 'rise':    { const k = ease(t/1.3); return {scale:.3, feet: far + (1-k)*h*.32, clip:true, fog:1-k*.5}; }
    case 'advance': { const k = ease(t/1.5); return {scale:.3+.7*k, feet: far+(near-far)*k, clip:false, fog:.5*(1-k)}; }
    case 'recede':  { const k = ease(t/1.4); return {scale:1-.7*k, feet: near+(far-near)*k, clip:false, fog:.55*k}; }
    case 'sink':    { const k = ease(t/1.0); return {scale:.3, feet: far + k*h*.32, clip:true, fog:.55+.45*k}; }
    case 'talk': case 'laugh': case 'hold': return {scale:breathe, feet:near, clip:false, fog:0};
    case 'burn': case 'dust': return {scale:1, feet:near, clip:false, fog:0};
  }
  return null;
}
function ravanRect(p){ const {h,w} = ravanSize(); return {x: CX - w*p.scale/2, y: p.feet - h*p.scale, w: w*p.scale, h: h*p.scale}; }
function startIntro(){
  S.mode = 'intro'; setEnv(0); heads = []; clearFx();
  hideGameUI(); showPanel(null);
  RV.phase = 'rise'; RV.t = 0; RV.line = 0; RV.chars = 0;
  A.sDhol(0,.7); A.sDhol(.45,.7); A.sDhol(.9,.8);
}
function showBubbleLine(){ $('bubble').hidden = false; $('bubbleBtns').hidden = false; $('bubbleNext').textContent = RV.line < SPEECH.length-1 ? 'Next' : 'Take up the bow'; }
function advanceIntro(){
  if (RV.phase !== 'talk') return;
  const text = SPEECH[RV.line];
  if (RV.chars < text.length){ RV.chars = text.length; return; }
  if (RV.line < SPEECH.length-1){ RV.line++; RV.chars = 0; showBubbleLine(); A.sDhol(0,.35); return; }
  RV.phase = 'laugh'; RV.t = 0; $('bubbleBtns').hidden = true; $('bubbleTxt').textContent = LAUGH; A.sLaugh();
  prefs.seenIntro = true; savePrefs();
}
function skipIntro(){ RV.phase = null; $('bubble').hidden = true; prefs.seenIntro = true; savePrefs(); showReady(); }
$('bubbleNext').addEventListener('click', advanceIntro);
$('bubbleSkip').addEventListener('click', skipIntro);
function placeBubble(){
  return;   // Ravan speaks in a fixed cinematic subtitle now (see .bubble in game.css)
  const b = $('bubble'); if (b.hidden) return;
  const p = ravanPose(); if (!p) return;
  const r = ravanRect(p), bw = b.offsetWidth, bh = b.offsetHeight, right = r.x + r.w*0.87 + 14;
  if (right + bw <= W - 16 && W > 760){ b.classList.remove('below'); b.style.left = right + 'px'; b.style.top = clamp(r.y + r.h*0.05, 12, H - bh - 12) + 'px'; }
  else { b.classList.add('below'); b.style.left = Math.max(16, (W - bw)/2) + 'px'; b.style.top = clamp(r.y + r.h*0.3, 12, H - bh - 70) + 'px'; }
}
function startFinale(){
  S.mode = 'finale'; setEnv(3); heads = []; arrows = []; coins = []; clearFx();
  hideGameUI(); showPanel(null); $('bubble').hidden = true; $('finaleSkip').hidden = false;
  RV.phase = 'rise'; RV.t = 0;
  A.sDhol(0,.8); A.sDhol(.5,.8); A.sDhol(1,.9);
}
$('finaleSkip').addEventListener('click', () => showResults());
function startBurn(){
  const sw = RAVAN.width, sh = RAVAN.height;
  if (!RV.work){ RV.work = mkCanvas(sw, sh); RV.wg = RV.work.getContext('2d'); }
  const data = RAVAN.getContext('2d').getImageData(0,0,sw,sh).data, step = Math.round((MOBILE ? 11 : 7)*SPR), rows = [];
  for (let y=0;y<sh;y+=step){ const row = []; for (let x=0;x<sw;x+=step){ const i = (y*sw+x)*4; if (data[i+3] > 120) row.push([x,y,data[i],data[i+1],data[i+2]]); } rows.push(row); }
  RV.rows = rows; RV.step = step; RV.next = rows.length-1; RV.front = sh;
  banner('Ravan Dahan', 'Evil burns. Good prevails.', '', 3.2, 'रावण दहन'); A.sFire(true); A.sConch();
}
function burnStep(dt){
  const sh = RAVAN.height, k = clamp(RV.t/6, 0, 1), front = sh*(1 - (k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2));
  RV.front = front;
  const p = ravanPose(), r = ravanRect(p), sc = r.h/sh;
  while (RV.next >= 0 && RV.next*RV.step >= front){
    for (const c of RV.rows[RV.next]) fx.ash.push({x:r.x+c[0]*sc, y:r.y+c[1]*sc, vx:(Math.random()-.4)*50, vy:-(25+Math.random()*90), life:1.4+Math.random()*1.8, max:3.2, size:RV.step*sc*1.1, r:c[2], g:c[3], b:c[4]});
    RV.next--;
  }
  const row = RV.rows[clamp(Math.floor(front/RV.step),0,RV.rows.length-1)];
  if (row && row.length && front > 0) for (let i=0;i<(MOBILE?6:14);i++){ const c = row[(Math.random()*row.length)|0]; spawnFlame(r.x+c[0]*sc, r.y+front*sc, RV.step*sc*4); }
  for (let i=0;i<(MOBILE?3:6);i++) spawnFlame(r.x + (0.25+Math.random()*0.5)*r.w, r.y + r.h - 8, r.h*0.07);
  if (front > 0) for (let i=0;i<(MOBILE?4:9);i++){
    const ry = clamp(Math.floor((front + RV.step*(1+Math.random()*6))/RV.step), 0, RV.rows.length-1), rw = RV.rows[ry];
    if (rw && rw.length){ const c = rw[(Math.random()*rw.length)|0]; spawnFlame(r.x+c[0]*sc, r.y+c[1]*sc, RV.step*sc*3); }
  }
  if (Math.random() < dt*2.4 && front > 0) firework(r.x + Math.random()*r.w, r.y + front*sc - Math.random()*r.h*0.25, true, true);
  if (Math.random() < dt*7) A.sCracker(.12);
}
function drawRavan(){
  const p = ravanPose(); if (!p) return;
  const r = ravanRect(p);
  if (RV.phase !== 'dust'){ const gl = Math.max(r.w, r.h)*0.7; ctx.globalAlpha = .35*(1-p.fog); ctx.drawImage(RV.phase==='burn' ? GLOW.orange : GLOW.red, r.x + r.w/2 - gl, r.y + r.h*0.35 - gl, gl*2, gl*2); ctx.globalAlpha = 1; }
  ctx.save();
  if (p.clip){ ctx.beginPath(); ctx.rect(0,0,W,HZ + H*0.006); ctx.clip(); }
  if (RV.phase === 'burn' || RV.phase === 'dust'){
    const sw = RAVAN.width, sh = RAVAN.height, wg = RV.wg, f = Math.max(0, RV.front);
    wg.globalCompositeOperation = 'source-over'; wg.clearRect(0,0,sw,sh);
    if (f > 1){
      wg.drawImage(RAVAN, 0, 0, sw, f, 0, 0, sw, f);
      wg.globalCompositeOperation = 'source-atop';
      const band = 120*SPR, gr = wg.createLinearGradient(0, f-band, 0, f);
      gr.addColorStop(0,'rgba(20,6,0,0)'); gr.addColorStop(.65,'rgba(25,8,0,.85)'); gr.addColorStop(.9,'rgba(255,110,20,.95)'); gr.addColorStop(1,'rgba(255,230,140,1)');
      wg.fillStyle = gr; wg.fillRect(0, f-band, sw, band);
      wg.fillStyle = 'rgba(255,90,20,.14)'; wg.fillRect(0,0,sw,f);
      wg.globalCompositeOperation = 'source-over';
      ctx.drawImage(RV.work, r.x, r.y, r.w, r.h);
    }
  } else ctx.drawImage(RAVAN, r.x, r.y, r.w, r.h);
  ctx.restore();
  if (p.fog > 0.01){
    const E = ENVS[S.ei], gr = ctx.createLinearGradient(0, HZ - H*0.12, 0, HZ + H*0.06);
    gr.addColorStop(0, E.haze+'0)'); gr.addColorStop(.6, E.haze+(0.75*p.fog).toFixed(2)+')'); gr.addColorStop(1, E.haze+'0)');
    ctx.fillStyle = gr; ctx.fillRect(0, HZ - H*0.12, W, H*0.18);
  }
}
function updateRavan(dt){
  if (!RV.phase) return;
  RV.t += dt;
  const ph = RV.phase, t = RV.t;
  if (S.mode === 'intro'){
    if (ph==='rise' && t>1.3){ RV.phase = 'advance'; RV.t = 0; }
    else if (ph==='advance' && t>1.5){ RV.phase = 'talk'; RV.t = 0; RV.chars = 0; showBubbleLine(); }
    else if (ph==='talk'){ RV.chars = Math.min(SPEECH[RV.line].length, RV.chars + dt*46); $('bubbleTxt').textContent = SPEECH[RV.line].slice(0, Math.floor(RV.chars)); }
    else if (ph==='laugh' && t>2.2){ RV.phase = 'recede'; RV.t = 0; $('bubble').hidden = true; A.sDhol(0,.5); }
    else if (ph==='recede' && t>1.4){ RV.phase = 'sink'; RV.t = 0; }
    else if (ph==='sink' && t>1.0){ RV.phase = null; showReady(); }
    placeBubble();
  } else if (S.mode === 'finale'){
    if (ph==='rise' && t>1.3){ RV.phase = 'advance'; RV.t = 0; }
    else if (ph==='advance' && t>1.5){ RV.phase = 'hold'; RV.t = 0; }
    else if (ph==='hold' && t>0.7){ RV.phase = 'burn'; RV.t = 0; startBurn(); }
    else if (ph==='burn'){ burnStep(dt); if (t>6.2){ RV.phase = 'dust'; RV.t = 0; RV.front = 0; banner('Shubh Vijayadashami', `${totalHeadsTonight()} heads of evil turned to dust`, '', 3, 'शुभ विजयादशमी'); } }
    else if (ph==='dust' && t>3.2) showResults();
  }
}
const totalHeadsTonight = () => S.game==='online' ? roomStandings().reduce((a,s)=>a+s.heads,0) : roster.reduce((a,p)=>a+p.heads,0);

/* ================= results ================= */
const teamTally = () => EVILS.map((_,i)=>roster.reduce((s,p)=>s+(p.tally[i]||0),0));
function showResults(){
  RV.phase = null; $('finaleSkip').hidden = true; S.mode = 'final';
  hideGameUI(); showPanel('turn'); $('ledgerWrap').hidden = false;
  if (S.game === 'solo') return showSoloResult();
  if (S.game === 'online') return showOnlineResult();
  $('tEyebrow').textContent = 'Pass & play · final standings';
  const top = roster.filter(played).sort((a,b)=>b.coins-a.coins || b.heads-a.heads)[0];
  $('tTitle').textContent = top ? `${top.name} wins with ${top.coins} gold coins` : 'No turns played';
  const tt = teamTally();
  $('tSub').className = 'sub'; $('tSub').textContent = `Together you burned ${tt.reduce((a,b)=>a+b,0)} heads of evil. Shubh Vijayadashami.`;
  $('tGrid').hidden = false; $('tGrid').innerHTML = evGrid(tt);
  if (L.DB_READY) netStatus(L.pendingCount() ? `${L.pendingCount()} turn(s) waiting to reach the global ledger.` : 'Every turn is on the global ledger.', L.pendingCount() ? 'bad' : 'ok');
  renderLedger(true);
  setButtons('tBtns', [{label:'Rematch', fn:rematch}, L.DB_READY && {label:'Global ledger', ghost:true, fn:()=>openBoard('multi')}, {label:'Menu', ghost:true, fn:toMenu}, {label:'Save ledger PNG', ghost:true, fn:exportLedger}, {label:'Credits', ghost:true, fn:()=>openOverlay('creditsPanel')}]);
}
function showSoloResult(){
  const p = roster[0], E = ENVS[envFor(p.level-1)], acc = p.shots ? Math.round(p.hits/p.shots*100) : 0, best = prefs.best || 0;
  $('ledgerWrap').hidden = true;
  $('tEyebrow').textContent = 'Solo run over';
  $('tTitle').textContent = `${p.coins} gold coins`;
  $('tSub').className = 'sub';
  $('tSub').textContent = `${p.name} struck ${p.heads} heads, reached level ${p.level} (${E.name}), ${acc}% of arrows hit, ${fmt(p.time)} on the maidan. ${p.coins >= best && p.coins > 0 ? 'A new personal best.' : `Your best: ${best} coins.`}`;
  $('tGrid').hidden = false; $('tGrid').innerHTML = evGrid(p.tally);
  if (L.DB_READY){ setTimeout(async () => { const r = await L.soloRank(p.name, p.coins); if (r && S.mode==='final') netStatus(`This run ranks #${r.better} of ${Math.max(r.of, r.better)} on the Solo board.`, 'ok'); }, 1500); }
  setButtons('tBtns', [{label:'Run again', fn:() => { MATCH = uid(); Object.assign(roster[0], newArcher(roster[0].name, 0)); showReady(); }}, L.DB_READY && {label:'Solo board', ghost:true, fn:()=>openBoard('solo')}, {label:'Menu', ghost:true, fn:toMenu}, {label:'Credits', ghost:true, fn:()=>openOverlay('creditsPanel')}]);
}
async function showOnlineResult(){
  let rows = roomStandings().map(s => ({name:s.name, coins:s.coins, heads:s.heads, status: s.away ? 'quit' : s.reason || 'done', you: s.device===L.DEVICE}));
  try { const db = await L.matchResults(R.matchId); if (db.length >= rows.filter(r=>r.status!=='quit').length) rows = db.map(d => ({name:d.player_name, coins:d.coins, heads:d.heads, status:d.end_reason==='time'?'done':d.end_reason, you: d.player_name===R.me.name})); } catch(e){}
  rows.sort((a,b)=>b.coins-a.coins || b.heads-a.heads);
  $('tEyebrow').textContent = `Online room ${R.code} · final standings`;
  $('tTitle').textContent = rows[0] ? `${rows[0].name} wins with ${rows[0].coins} gold coins` : 'Room closed';
  $('tSub').className = 'sub'; $('tSub').textContent = `${rows.length} archers burned ${rows.reduce((a,r)=>a+r.heads,0)} heads of evil together. Shubh Vijayadashami.`;
  $('tGrid').hidden = true;
  $('ledger').innerHTML = `<thead><tr><th>Rank</th><th>Archer</th><th class="num">Coins</th><th class="num">Heads</th><th>Status</th></tr></thead><tbody>` +
    rows.map((r,k)=>`<tr class="${r.you?'now':''}"><td><span class="rank ${k<3?'r'+(k+1):''}">${k+1}</span></td><td><div class="who-cell"><span>${esc(r.name)}</span></div></td><td class="score"><span class="coin"></span>${r.coins}</td><td class="num">${r.heads}</td><td><span class="pill ${STATUS[r.status]?.[0]||'p-done'}">${STATUS[r.status]?.[1]||'Done'}</span></td></tr>`).join('') + '</tbody>';
  setButtons('tBtns', [{label:'Back to menu', fn:() => { leaveRoom(); toMenu(); }}, L.DB_READY && {label:'Multiplayer board', ghost:true, fn:()=>openBoard('multi')}]);
}

/* ================= pause / skip / quit ================= */
function openDialog(kind){
  const inPlay = S.mode==='play' || S.paused;
  if (inPlay && S.game !== 'online'){ S.paused = true; draw.on = false; draw.power = 0; }
  const back = inPlay ? null : visiblePanel();
  showPanel('dialog'); $('dGrid').hidden = true;
  const p = roster[cur], close = () => { if (back){ showPanel(back); return; } showPanel(null); S.paused = false; last = performance.now(); };
  if (kind==='pause'){
    $('dEyebrow').textContent = S.game==='online' ? 'Room still running' : 'Paused';
    $('dTitle').textContent = `${p.name} · ${S.coins} coins`;
    $('dSub').textContent = S.game==='solo' ? `Level ${S.level+1}. ${S.lives} ${S.lives===1?'diya':'diyas'} left. Heads struck so far:` : `Level ${S.level+1}, ${ENVS[envFor(S.level)].name}. ${fmt(S.left)} left${S.game==='online' ? '. The room does not pause.' : ' in this turn.'} Heads struck so far:`;
    $('dGrid').hidden = false; $('dGrid').innerHTML = evGrid(S.tally);
    setButtons('dBtns', [{label:'Resume', fn:close}, S.game==='local' && {label:'Skip turn', ghost:true, fn:()=>openDialog('skip')}, {label:'How to play', ghost:true, fn:() => { showRules(S.game); overlayReturn = 'dialog'; showPanel('rulesPanel'); }}, {label: S.game==='solo' ? 'End run' : S.game==='online' ? 'Leave room' : 'Quit match', cls:'danger', fn:()=>openDialog('quit')}]);
  } else if (kind==='skip'){
    $('dEyebrow').textContent = 'Skip turn'; $('dTitle').textContent = `End ${p.name}'s turn now?`;
    $('dSub').textContent = `Their ${S.coins} coins go on the ledger and the next archer is up.`;
    setButtons('dBtns', [{label:'Skip turn', fn:()=>{ showPanel(null); S.paused = false; endTurn('skip'); }}, {label:'Keep playing', ghost:true, fn:close}]);
  } else {
    const t = S.game==='solo' ? ['End this run?', 'Your coins so far are saved and Ravan burns.', 'End run'] : S.game==='online' ? ['Leave the room?', 'Your coins so far are saved. You cannot rejoin this room.', 'Leave room'] : ['Quit and burn Ravan now?', 'Scores so far go to the final standings. Archers who have not shot yet are marked Not played.', 'Quit to the Dahan'];
    $('dEyebrow').textContent = t[2]; $('dTitle').textContent = t[0]; $('dSub').textContent = t[1];
    setButtons('dBtns', [{label:t[2], cls:'danger', fn:quitMatch}, {label: inPlay ? 'Keep playing' : 'Go back', ghost:true, fn:close}]);
  }
}
$('btnPause').addEventListener('click', () => openDialog('pause'));
$('btnSkip').addEventListener('click', () => openDialog('skip'));
$('btnQuit').addEventListener('click', () => openDialog('quit'));
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key==='Escape' || e.key==='p' || e.key==='P'){
    if (S.mode==='play' && $('dialog').hidden) openDialog('pause');
    else if (!$('dialog').hidden && (S.paused || S.mode==='play')) $('dBtns').firstChild?.click();
    else if (!$('creditsPanel').hidden || !$('rulesPanel').hidden) closeOverlay();
  }
  if ((e.key==='Enter' || e.key===' ') && S.mode==='intro' && RV.phase==='talk' && document.activeElement?.tagName !== 'BUTTON'){ e.preventDefault(); advanceIntro(); }
});

/* ================= ledger (pass & play) ================= */
const STATUS = {done:['p-done','Done'], maya:['p-maya','Maya'], skip:['p-skip','Skipped'], quit:['p-skip','Stopped'], lives:['p-done','Done'], np:['p-wait','Not played'], next:['p-next','Up next'], play:['p-next','Shooting'], wait:['p-wait','Waiting']};
function ledgerRows(final){
  const rows = roster.map((p,i)=>({...p,i}));
  if (final) rows.sort((a,b)=> (played(b)-played(a)) || (b.coins-a.coins) || (b.heads-a.heads));
  return rows;
}
function topEvil(p){ let m = 0, k = -1; p.tally.forEach((v,i)=>{ if (v > m){ m = v; k = i; } }); return k < 0 ? '–' : `${EVILS[k].n} ×${m}`; }
function renderLedger(final){
  const rows = ledgerRows(final);
  $('ledger').innerHTML = `<thead><tr><th>${final?'Rank':'#'}</th><th>Archer</th><th class="num">Coins</th><th class="num">Heads</th><th>Most slain</th><th class="num">Hit %</th><th>Status</th></tr></thead><tbody>` +
    rows.map((p,k)=>{
      const pl = played(p), rk = final ? (pl ? `<span class="rank ${k<3?'r'+(k+1):''}">${k+1}</span>` : '–') : p.i+1;
      return `<tr class="${!final && p.i===cur ? 'now' : ''}"><td>${rk}</td>
      <td><div class="who-cell"><span class="av" style="background:${p.color}">${esc(p.name.trim()[0]?.toUpperCase()||'?')}</span><span>${esc(p.name)}</span></div></td>
      <td class="score">${pl ? `<span class="coin"></span>${p.coins}` : '–'}</td><td class="num">${pl ? p.heads : '–'}</td><td>${pl ? topEvil(p) : '–'}</td>
      <td class="num">${pl && p.shots ? Math.round(p.hits/p.shots*100)+'%' : '–'}</td><td><span class="pill ${STATUS[p.status][0]}">${STATUS[p.status][1]}</span></td></tr>`;
    }).join('') + '</tbody>';
}
async function exportLedger(){
  try{ await Promise.all([document.fonts.load('80px "Rozha One"'), document.fonts.load('80px "Rozha One"', 'रावण'), document.fonts.load('700 30px "Anek Latin"'), document.fonts.load('500 20px "Anek Latin"')]); }catch(e){}
  const final = S.mode==='final', rows = ledgerRows(final), tt = final ? teamTally() : roster[cur].tally;
  const Wc = 1600, rowH = 90, top = 330, Hc = top + 70 + rows.length*rowH + 300;
  const c = mkCanvas(Wc, Hc), g = c.getContext('2d');
  const bg = envBg[final ? 3 : S.ei]; g.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, Wc, Hc);
  let gr = g.createLinearGradient(0,0,0,Hc); gr.addColorStop(0,'rgba(20,10,7,.78)'); gr.addColorStop(1,'rgba(14,7,5,.94)'); g.fillStyle = gr; g.fillRect(0,0,Wc,Hc);
  g.strokeStyle = 'rgba(244,234,220,.16)'; g.lineWidth = 1.5; g.strokeRect(40,40,Wc-80,Hc-80);
  g.strokeStyle = '#e7c27d'; g.lineWidth = 3;   // gold corner brackets, as on the in-game panels
  for (const [x,y,dx,dy] of [[40,40,1,1],[Wc-40,40,-1,1],[40,Hc-40,1,-1],[Wc-40,Hc-40,-1,-1]]){ g.beginPath(); g.moveTo(x+dx*36,y); g.lineTo(x,y); g.lineTo(x,y+dy*36); g.stroke(); }
  const D = '"Rozha One", Georgia, serif', B = '"Anek Latin", system-ui, sans-serif';
  g.fillStyle = '#ff7b30'; g.font = `600 26px ${B}`; g.fillText(final ? 'Pass & play, final standings' : `Standings after archer ${cur+1} of ${roster.length}`, 90, 130);
  gr = g.createLinearGradient(0,140,0,250); gr.addColorStop(0,'#fbe7bd'); gr.addColorStop(.55,'#e7c27d'); gr.addColorStop(1,'#a8783a');
  g.fillStyle = gr; g.font = `400 100px ${D}`; g.fillText('रावण दहन', 84, 236);
  g.fillStyle = 'rgba(251,236,208,.72)'; g.font = `600 24px ${B}`;
  g.fillText(`${new Date().toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}. ${roster.length} archers, 4 levels of ${fmt(LEVEL_SECS)}`, 90, 284);
  const cols = [{x:90,t:final?'Rank':'#'}, {x:200,t:'Archer'}, {x:760,t:'Coins',r:true}, {x:900,t:'Heads',r:true}, {x:960,t:'Most slain'}, {x:1340,t:'Hit %',r:true}, {x:1380,t:'Status'}];
  g.font = `500 20px ${B}`; g.fillStyle = 'rgba(244,234,220,.55)';
  cols.forEach(cc => { g.textAlign = cc.r ? 'right' : 'left'; g.fillText(cc.t, cc.x, top + 30); });
  g.textAlign = 'left'; g.fillStyle = 'rgba(244,234,220,.16)'; g.fillRect(90, top+48, Wc-180, 1.5);
  rows.forEach((p,k)=>{
    const y = top + 66 + k*rowH, cy = y + rowH/2, pl = played(p);
    if (!final && p.i===cur){ g.fillStyle = 'rgba(255,153,51,.12)'; g.fillRect(70, y+6, Wc-140, rowH-12); }
    g.textBaseline = 'middle';
    if (final && pl && k < 3){ g.fillStyle = ['#ffe08a','#d6dbe3','#d08a4e'][k]; g.beginPath(); g.arc(110, cy, 24, 0, Math.PI*2); g.fill(); g.fillStyle = '#1a0d05'; g.font = `800 26px ${B}`; g.textAlign = 'center'; g.fillText(k+1, 110, cy+2); g.textAlign = 'left'; }
    else { g.fillStyle = '#fbecd0'; g.font = `800 28px ${B}`; g.fillText(final ? (pl ? k+1 : '–') : p.i+1, 100, cy+2); }
    g.fillStyle = p.color; g.beginPath(); g.arc(224, cy, 22, 0, Math.PI*2); g.fill();
    g.fillStyle = '#140a07'; g.font = `700 22px ${B}`; g.textAlign = 'center'; g.fillText(p.name.trim()[0]?.toUpperCase()||'?', 224, cy+2); g.textAlign = 'left';
    g.fillStyle = '#fbecd0'; g.font = `800 34px ${B}`; g.fillText(p.name, 262, cy+2);
    g.textAlign = 'right'; g.fillStyle = '#f8e2b0'; g.font = `700 40px ${B}`; g.fillText(pl ? p.coins : '–', 760, cy+2);
    if (pl){ const tw = g.measureText(String(p.coins)).width; const cg = g.createRadialGradient(760-tw-26, cy-4, 2, 760-tw-22, cy, 14); cg.addColorStop(0,'#fff6c2'); cg.addColorStop(.5,'#f2c230'); cg.addColorStop(1,'#a8740a'); g.fillStyle = cg; g.beginPath(); g.arc(760-tw-22, cy, 13, 0, Math.PI*2); g.fill(); }
    g.font = `600 28px ${B}`; g.fillStyle = 'rgba(251,236,208,.88)'; g.fillText(pl ? p.heads : '–', 900, cy+2);
    g.textAlign = 'left'; g.fillText(pl ? topEvil(p) : '–', 960, cy+2);
    g.textAlign = 'right'; g.fillText(pl && p.shots ? Math.round(p.hits/p.shots*100)+'%' : '–', 1340, cy+2);
    g.textAlign = 'left'; const [cls, label] = STATUS[p.status];
    const pc = {'p-done':'#9be08a','p-maya':'#c3b0ff','p-skip':'#f8e2b0','p-next':'#ff7b30','p-wait':'#bfae94'}[cls];
    g.font = `600 22px ${B}`; g.fillStyle = pc; g.beginPath(); g.arc(1388, cy, 5, 0, Math.PI*2); g.fill(); g.fillText(label, 1402, cy+1);
    g.textBaseline = 'alphabetic';
    if (k < rows.length-1){ g.fillStyle = 'rgba(251,236,208,.1)'; g.fillRect(90, y+rowH, Wc-180, 1); }
  });
  const ey = top + 66 + rows.length*rowH + 40;
  g.fillStyle = 'rgba(244,234,220,.55)'; g.font = `500 20px ${B}`; g.fillText(final ? 'Evils burned tonight, all archers' : `Evils struck down by ${roster[cur].name}`, 90, ey);
  const cw = (Wc-180)/10;
  EVILS.forEach((e,i)=>{
    const x = 90 + i*cw;
    g.fillStyle = 'rgba(244,234,220,.16)'; g.fillRect(x+6, ey+18, cw-12, 1.5);
    g.textAlign = 'center'; g.fillStyle = '#e7c27d'; g.font = `400 30px ${D}`; g.fillText(e.d, x+cw/2, ey+60);
    g.fillStyle = 'rgba(244,234,220,.6)'; g.font = `500 17px ${B}`; g.fillText(e.n, x+cw/2, ey+86);
    g.fillStyle = tt[i] ? '#f8e2b0' : 'rgba(244,234,220,.3)'; g.font = `700 34px ${B}`; g.fillText('×'+tt[i], x+cw/2, ey+126);
    g.textAlign = 'left';
  });
  g.fillStyle = 'rgba(251,236,208,.55)'; g.font = `600 20px ${B}`;
  g.fillText('Shubh Vijayadashami', 90, Hc - 66);
  c.toBlob(blob => {
    if (!blob){ toast('Could not create the image'); return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a'), d = new Date(), pad = n => String(n).padStart(2,'0');
    a.href = url; a.download = `ravan-dahan-ledger-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 3000);
    toast('Ledger saved as PNG');
  }, 'image/png');
}

/* ================= HUD ================= */
let lastHud = '';
function updateHUD(){
  const solo = S.game === 'solo';
  if (!solo){
    const sec = Math.max(0, S.left), el = TURN - sec;
    $('segs').querySelectorAll('b').forEach((b,i)=> b.style.transform = `scaleX(${clamp((el - i*LEVEL_SECS)/LEVEL_SECS, 0, 1)})`);
    $('segs').classList.toggle('hurry', sec < 10);
  }
  const lvlLeft = solo ? S.runT : LEVEL_SECS - ((TURN - S.left) - S.level*LEVEL_SECS);
  const key = [Math.round(S.shown), S.heads, S.level, Math.floor(lvlLeft), S.agni>0 ? Math.ceil(S.agni) : 0, S.lives, S.escapes].join('|');
  if (key === lastHud) return; lastHud = key;
  const E = ENVS[envFor(S.level)];
  $('coinNum').textContent = Math.round(S.shown);
  $('headNum').textContent = S.heads;
  $('lvl').textContent = `Level ${S.level+1}`;
  $('envDeva').textContent = E.deva;
  $('envName').textContent = solo && S.level >= 4 ? `${E.name}, burning hotter` : `${E.name}, ${E.en.toLowerCase()}`;
  $('clock').textContent = fmt(solo ? S.runT : lvlLeft);
  $('agniChip').hidden = !(S.agni > 0);
  if (S.agni > 0) $('agniChip').textContent = `Agni Astra ${Math.ceil(S.agni)}s`;
  if (solo){
    $('soloBar').firstChild.style.width = `${(S.heads % SOLO.headsPerLevel)/SOLO.headsPerLevel*100}%`;
    $('lives').innerHTML = Array.from({length:SOLO.lives},(_,i)=>`<span class="diya ${i < S.lives ? '' : 'out'}"></span>`).join('');
    $('escapes').innerHTML = '<span>Escaped</span>' + Array.from({length:SOLO.escapesPerLife},(_,i)=>`<i class="${i < S.escapes ? 'on' : ''}"></i>`).join('');
  }
}
function bump(id){ const el = $(id); el.classList.add('bump'); clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('bump'), 110); }
function bumpTally(i){ const c = $('tc'+i); c.querySelector('b').textContent = '×' + S.tally[i]; c.className = 'tc hot'; clearTimeout(c._t); c._t = setTimeout(()=>c.className = 'tc', 380); }

/* ================= shooting ================= */
function beginDraw(){ if (S.mode!=='play' || S.paused || draw.on || draw.reload > 0) return; A.audio(); draw.on = true; draw.start = performance.now(); draw.power = 0.25; }
function release(aimT){
  if (!draw.on) return;
  draw.on = false; const p = draw.power; draw.power = 0;
  if (S.mode!=='play' || S.paused) return;
  const now = performance.now(), target = aimT != null ? Math.max(aimT, now - 250) : now - 50;
  let a = hist[hist.length-1] || aim;
  for (let i=hist.length-1;i>=0;i--){ if (hist[i].t <= target){ a = hist[i]; break; } }
  fire3D(a.x, a.y, p); draw.reload = 0.1;
}
function aimDir(ax, ay){ const dx = (ax-CX)/F, dy = (HZ-ay)/F, l = Math.hypot(dx,dy,1); return [dx/l, dy/l, 1/l]; }
function fire3D(ax, ay, p){
  const d = aimDir(ax, ay), v0 = arrowSpeed(p);
  arrows.push({p:[d[0]*1.1, EYE + d[1]*1.1 - 0.12, d[2]*1.1], v:[d[0]*v0, d[1]*v0, d[2]*v0], hits:0, stuck:0, done:false, agni:S.agni>0, trail:[]});
  S.shots++; A.sTwang(p);
}
function segDist(a, b, c){
  const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  const Lq = ab[0]*ab[0]+ab[1]*ab[1]+ab[2]*ab[2] || 1e-9, t = clamp((ac[0]*ab[0]+ac[1]*ab[1]+ac[2]*ab[2])/Lq, 0, 1);
  return Math.hypot(a[0]+ab[0]*t-c[0], a[1]+ab[1]*t-c[1], a[2]+ab[2]*t-c[2]);
}
const toScreen = (x,y) => [aim.x + (x-aim.x)*S.zoom, aim.y + (y-aim.y)*S.zoom];
function coinsFor(b, arrow, chained){
  if (b.type==='crowned') return 10;
  let c = 1 + ((Math.random()*3)|0);
  c += Math.round(clamp((b.z-11)/32, 0, 1)*3);
  c += Math.min(3, S.level);
  c += Math.min(2, Math.floor(S.combo/4));
  if (arrow.hits > 1 || chained) c += 1;
  return clamp(c, 1, 10);
}
function pop(b, arrow, chained=false){
  if (b.dead) return;
  b.dead = true;
  const [sx,sy,s] = project(b.x,b.y,b.z), R0 = b.r*s;
  if (b.type==='maya'){
    blast(sx, sy, R0*1.4, 'maya'); A.sMaya(); S.shake = 0.6; S.flash = 1;
    floaters.push({x:sx,y:sy-R0,text:'MAYA',col:'#d4b0ff',life:1.4,size:clamp(R0*0.9,26,52)});
    if (S.game === 'solo'){ loseLife('Fooled by Maya'); return; }
    S.mode = 'busting'; draw.on = false; draw.power = 0;
    banner('Fooled by Maya', 'Your turn ends', 'maya', 1.6, 'माया');
    setTimeout(()=>endTurn('maya'), 1400);
    return;
  }
  if (b.type==='agni'){
    blast(sx, sy, R0*1.3, 'fire'); A.sAgni(); S.agni = AGNI_SECS + Math.max(0, S.agni);
    banner('Agni Astra', `Fire arrows for ${AGNI_SECS} seconds`, 'agni', 1.6, 'अग्नि अस्त्र');
    floaters.push({x:sx,y:sy-R0,text:'AGNI ASTRA',col:'#ffb070',life:1.2,size:clamp(R0*0.7,18,36)});
    arrow.hits++; return;
  }
  arrow.hits++; S.combo++; S.heads++; S.tally[b.evil]++;
  const c = coinsFor(b, arrow, chained);
  S.coins += c;
  blast(sx, sy, R0, 'fire'); A.sFire(false);
  const ev = EVILS[b.evil];
  floaters.push({x:sx,y:sy-R0*1.1,text:`${ev.n.toUpperCase()} ×${S.tally[b.evil]}`,col:'#ffd9a0',life:1.2,size:clamp(R0*0.55,15,30)});
  floaters.push({x:sx,y:sy-R0*1.1+clamp(R0*0.6,18,34),text:`+${c}${chained?' AGNI':arrow.hits>1?' PIERCE':''}`,col:'#ffe08a',life:1.1,size:clamp(R0*0.5,14,26)});
  bumpTally(b.evil); bump('headNum');
  const [px,py] = toScreen(sx,sy);
  for (let i=0;i<c;i++){ const a = -Math.PI/2 + (Math.random()-.5)*2.6, sp = 160 + Math.random()*260; coins.push({x:px, y:py, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, t:0, delay:0.3 + i*0.045, spin:Math.random()*6, size:7 + Math.random()*4}); }
  if (S.game === 'solo') soloLevelCheck();
  if (S.game === 'online') sendScore(false);
  if (arrow.agni && !chained){
    for (const o of heads){ if (o===b || o.dead || o.type==='maya' || o.type==='agni') continue; if (Math.hypot(o.x-b.x, o.y-b.y, o.z-b.z) < AGNI_RADIUS) pop(o, arrow, true); }
  }
}
function endShot(a){ if (a.counted) return; a.counted = true; if (a.hits > 0) S.hits++; else if (S.mode==='play') S.combo = 0; }

/* ================= update ================= */
function update(dt){
  S.t += dt;
  const now = performance.now();
  const k = S.input==='mouse' ? 1 : 1 - Math.pow(1e-12, dt);
  aim.x += (aim.rx - aim.x)*k; aim.y += (aim.ry - aim.y)*k;
  hist.push({x:aim.x,y:aim.y,t:now}); while (hist.length && now-hist[0].t > 400) hist.shift();
  if (draw.on) draw.power = Math.min(1, 0.25 + (now - draw.start)/520);
  if (draw.reload > 0) draw.reload -= dt;
  S.zoom += ((draw.on ? 1 + 0.24*draw.power : 1) - S.zoom) * (1 - Math.pow(0.002, dt));
  S.shake = Math.max(0, S.shake - dt); S.flash = Math.max(0, S.flash - dt*1.6);
  S.eMix = Math.min(1, S.eMix + dt/2.5);
  updateParts(dt, S.ei, S.t); updateFW(dt, S.ei, S.mode !== 'intro', S.mode==='play' || S.mode==='finale'); updateFire(dt); updateRavan(dt);

  if (S.mode==='countdown'){
    const before = Math.ceil(S.cd); S.cd -= dt;
    if (S.cd <= 0){ $('count').hidden = true; startTurn(); }
    else { if (Math.ceil(S.cd) !== before) A.sDhol(); $('count').hidden = false; $('count').innerHTML = `<span lang="hi">${'०१२३४५६७८९'[Math.min(9, Math.ceil(S.cd))]}</span><small>${esc(roster[cur].name)}</small>`; }
  }
  if (S.mode==='play'){
    S.runT += dt;
    if (timed()){
      S.left -= dt;
      const lv = Math.min(LEVEL_COUNT-1, Math.floor(S.runT/LEVEL_SECS));
      if (lv !== S.level){ S.level = lv; setEnv(lv); A.sConch(); banner(`Level ${lv+1}`, `${ENVS[lv].name}, ${ENVS[lv].en.toLowerCase()}. Smaller, faster heads`, '', 2.2, ENVS[lv].deva); }
    }
    if (S.agni > 0) S.agni -= dt;
    stepSpawner();
    if (S.game==='online' && now - lastScoreSent > 1000) sendScore(false);
    if (timed() && S.left <= 0){ S.left = 0; endTurn('time'); }
  }
  if (S.mode==='play' || S.mode==='busting') updateHUD();
  if (S.game==='online' && S.mode==='turnover') checkRoomDone();

  const speedMul = (S.mode==='play' || S.mode==='busting') ? levelCfg(S.level).speed : 1;
  for (const b of heads){
    b.y += b.vy*speedMul*dt; b.x += Math.sin(S.t*0.9 + b.ph)*0.4*speedMul*dt;
    if (!b.dead && b.y > EYE + (HZ/F)*b.z + b.r*3){ b.dead = true; if (!b.ambient && b.type!=='maya' && b.type!=='agni') headEscaped(); }
  }
  heads = heads.filter(b=>!b.dead);
  for (const a of arrows){
    if (a.stuck){ a.stuck -= dt; if (a.stuck<=0) a.done = true; continue; }
    const prev = a.p.slice();
    a.v[1] -= GRAVITY*dt; a.p[0]+=a.v[0]*dt; a.p[1]+=a.v[1]*dt; a.p[2]+=a.v[2]*dt;
    const [tx,ty] = project(a.p[0],a.p[1],a.p[2]); a.trail.push([tx,ty]); if (a.trail.length > 7) a.trail.shift();
    if (a.agni && Math.random() < .7) spawnFlame(tx, ty, clamp(F/a.p[2]*0.12, 3, 26));
    if (S.mode==='play'){ for (const b of heads){ if (!b.dead && segDist(prev, a.p, [b.x,b.y,b.z]) < b.r + 0.07){ pop(b, a); if (S.mode!=='play') break; } } }
    if (a.p[1] <= 0){ a.p[1] = 0; a.stuck = 2.5; endShot(a); }
    else if (a.p[2] > 120 || a.p[1] > 60){ a.done = true; endShot(a); }
  }
  arrows = arrows.filter(a=>!a.done);
  heads = heads.filter(b=>!b.dead);
  for (const f of floaters){ f.life -= dt*0.9; f.y -= 40*dt; }
  floaters = floaters.filter(f=>f.life>0);
  if (coins.length){
    const r = $('coins').getBoundingClientRect(), tx = r.left + 14, ty = r.top + r.height/2;
    for (const c of coins){
      c.t += dt; c.spin += dt*14;
      if (c.t < c.delay){ c.vy += 700*dt; c.vx *= 0.97; c.x += c.vx*dt; c.y += c.vy*dt; }
      else {
        const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx,dy) || 1, sp = 500 + (c.t - c.delay)*2600;
        c.vx += (dx/d*sp - c.vx)*Math.min(1, dt*9); c.vy += (dy/d*sp - c.vy)*Math.min(1, dt*9);
        c.x += c.vx*dt; c.y += c.vy*dt;
        if (d < 18){ c.done = true; S.shown = Math.min(S.coins, S.shown + 1); A.sCoin(); bump('coins'); }
      }
    }
    coins = coins.filter(c=>!c.done && c.t < 3);
    if (!coins.length) S.shown = S.coins;
  } else if (S.shown !== S.coins) S.shown = S.coins;
  lock = null;
  if (draw.on && S.mode==='play'){
    let bestD = Infinity;
    for (const b of heads){ const [sx,sy,s] = project(b.x,b.y,b.z), d = Math.hypot(sx-aim.x, sy-aim.y); if (d < Math.max(28, b.r*s*1.6) && d < bestD){ bestD = d; lock = b; } }
  }
}

/* ================= render ================= */
function drawShadow(b){
  const E = ENVS[S.ei], [gx,gy,gs] = project(b.x - 0.05*b.y, 0, b.z);
  if (gy > H+20) return;
  const lift = clamp(1 - b.y/14, 0, 1), rr = b.r*gs*(1.1 + (1-lift)*0.6);
  ctx.globalAlpha = E.shadow * lift * clamp((S.t-b.born)/0.4, 0, 1);
  ctx.drawImage(GLOW.smoke, gx-rr, gy-rr*0.22, rr*2, rr*0.44);
  ctx.globalAlpha = 1;
}
function drawHead(b){
  const [sx,sy,s] = project(b.x,b.y,b.z);
  const R0 = b.r*s, fog = clamp((b.z-10)/38, 0, 1), age = clamp((S.t-b.born)/0.5, 0, 1);
  if (R0 < 1) return;
  const live = S.mode==='play' || S.mode==='busting' || S.mode==='countdown';
  let alpha = age * (live ? 1 : 0.55);
  if (b.type==='maya'){ alpha *= 0.62 + 0.3*Math.sin(S.t*7 + b.ph); const gl = R0*2.4; ctx.globalAlpha = .55*age; ctx.drawImage(GLOW.maya, sx-gl, sy-gl, gl*2, gl*2); }
  if (b.type==='agni'){ ctx.globalAlpha = alpha; const w = 160*R0/44; ctx.save(); ctx.translate(sx,sy); ctx.rotate(S.t*0.8); ctx.drawImage(AGNI, -w/2, -w/2, w, w); ctx.restore(); ctx.globalAlpha = 1; return; }
  if (b.type==='crowned'){ const gl = R0*2; ctx.globalAlpha = .4*age; ctx.drawImage(GLOW.core, sx-gl, sy-gl*1.2, gl*2, gl*2); }
  const spr = HEADS[b.type==='crowned' ? 'crowned' : b.type==='maya' ? 'maya' : 'head'], k = R0/HEAD_R;
  ctx.globalAlpha = alpha;
  ctx.save(); ctx.translate(sx,sy); ctx.rotate(Math.sin(S.t*1.3 + b.ph)*0.08);
  ctx.drawImage(spr, -HEAD_CX*k, -HEAD_CY*k, HEAD_W*k, HEAD_H*k);
  if (fog > 0.05){ ctx.globalAlpha = fog*0.4*age; ctx.drawImage(GLOW.white, -R0*1.4, -R0*1.6, R0*2.8, R0*3); }
  ctx.restore();
  if (R0 > 11 && live){
    const fs = clamp(R0*0.4, 9, 17), txt = b.type==='maya' ? 'Maya' : EVILS[b.evil].n;
    ctx.font = `800 ${fs}px "Anek Latin", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(txt).width + fs*1.1, th = fs*1.45, ly = sy + R0*1.2;
    ctx.globalAlpha = age*(1-fog*0.4);
    ctx.fillStyle = b.type==='crowned' ? 'rgba(232,181,58,.95)' : b.type==='maya' ? 'rgba(60,20,100,.85)' : 'rgba(40,18,6,.85)';
    ctx.beginPath(); ctx.roundRect(sx-tw/2, ly-th/2, tw, th, th/2); ctx.fill();
    ctx.strokeStyle = b.type==='maya' ? '#b26bff' : '#e8b53a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = b.type==='crowned' ? '#2a1205' : b.type==='maya' ? '#e2c4ff' : '#fbecd0';
    ctx.fillText(txt, sx, ly+fs*0.06); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
}
function drawLock(){
  if (!lock) return;
  const [sx,sy,s] = project(lock.x,lock.y,lock.z);
  const r = lock.r*s*1.45 + 6, k = r*0.36, col = lock.type==='maya' ? '#c08aff' : lock.type==='agni' ? '#ff8a3a' : '#ffe08a';
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(S.t*3)*0.05);
  ctx.strokeStyle = col; ctx.lineWidth = 2.5/S.zoom;
  for (const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ ctx.beginPath(); ctx.moveTo(dx*r, dy*(r-k)); ctx.lineTo(dx*r, dy*r); ctx.lineTo(dx*(r-k), dy*r); ctx.stroke(); }
  ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.font = `800 ${13/S.zoom}px "Anek Latin", sans-serif`;
  ctx.fillText(lock.type==='maya' ? 'MAYA · ILLUSION' : lock.type==='agni' ? 'AGNI ASTRA' : `${EVILS[lock.evil].n.toUpperCase()} · ${EVILS[lock.evil].m} · ${Math.round(lock.z)} m`, r + 6/S.zoom, -r + 10/S.zoom);
  ctx.restore();
}
function drawArrow3D(a){
  const v = a.v, l = Math.hypot(v[0],v[1],v[2]) || 1;
  const dir = a.stuck ? (a.sdir || (a.sdir = [v[0]/l, v[1]/l, v[2]/l])) : [v[0]/l, v[1]/l, v[2]/l];
  const tail = [a.p[0]-dir[0]*0.85, a.p[1]-dir[1]*0.85, a.p[2]-dir[2]*0.85];
  if (tail[2] < 0.4) return;
  const [hx,hy,hs] = project(a.p[0], a.p[1], a.p[2]), [tx,ty,ts] = project(tail[0], tail[1], tail[2]);
  ctx.globalAlpha = a.stuck ? Math.min(1, a.stuck) : 1; ctx.lineCap = 'round';
  if (!a.stuck && a.trail.length > 1){
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = a.agni ? 'rgba(255,120,30,.55)' : 'rgba(255,214,110,.4)'; ctx.lineWidth = Math.max(1, 0.03*ts);
    ctx.beginPath(); ctx.moveTo(a.trail[0][0], a.trail[0][1]); for (const p of a.trail) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.strokeStyle = '#c99a24'; ctx.lineWidth = Math.max(1, 0.028*ts); ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(hx,hy); ctx.stroke();
  ctx.strokeStyle = '#1c8a8a'; ctx.lineWidth = Math.max(1.5, 0.07*ts); ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx + (hx-tx)*0.14, ty + (hy-ty)*0.14); ctx.stroke();
  ctx.fillStyle = a.agni ? '#ffcf60' : '#ffe08a'; ctx.beginPath(); ctx.arc(hx,hy,Math.max(1.4,0.035*hs),0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawTrajectoryHint(){
  if (!draw.on) return;
  const d = aimDir(aim.x, aim.y), v0 = arrowSpeed(draw.power);
  let p = [d[0]*1.1, EYE + d[1]*1.1 - 0.12, d[2]*1.1], v = [d[0]*v0, d[1]*v0, d[2]*v0];
  ctx.fillStyle = 'rgba(255,224,138,.75)';
  for (let i=0;i<16;i++){
    const st = 0.014; v[1] -= GRAVITY*st; p = [p[0]+v[0]*st, p[1]+v[1]*st, p[2]+v[2]*st];
    if (i < 3 || p[1] < 0) continue;
    const [x,y,s] = project(p[0],p[1],p[2]);
    ctx.globalAlpha = 0.6*(1-i/16); ctx.beginPath(); ctx.arc(x,y,Math.max(1.2, s*0.02),0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/* the golden bow: deep recurve, engraved limbs, makara curls, red silk grip, tassels */
function drawBow(){
  const h = Math.min(H*0.6, W*0.7), bx = CX + (aim.x - CX)*0.28, by = H*0.8 + (aim.y - HZ)*0.06;
  const tilt = Math.atan2(aim.x - bx, by - aim.y)*0.45 - 0.12, pull = draw.power*h*0.32;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
  const tipX = -h*0.06, top = -h*0.52, bot = h*0.52, nx = tipX + pull*0.35, ny = pull*0.95, flex = 1 + draw.power*0.22;
  ctx.strokeStyle = 'rgba(255,232,160,.95)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(tipX, top); ctx.lineTo(nx, ny); ctx.lineTo(tipX, bot); ctx.stroke();
  const limb = () => {
    ctx.beginPath(); ctx.moveTo(tipX, top);
    ctx.bezierCurveTo(h*0.0, top*0.86, h*0.15*flex, top*0.55, h*0.11*flex, top*0.28);
    ctx.quadraticCurveTo(h*0.05, top*0.12, h*0.05, -h*0.06); ctx.lineTo(h*0.05, h*0.06);
    ctx.quadraticCurveTo(h*0.05, bot*0.12, h*0.11*flex, bot*0.28);
    ctx.bezierCurveTo(h*0.15*flex, bot*0.55, h*0.0, bot*0.86, tipX, bot);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4a2c04'; ctx.lineWidth = h*0.042; limb(); ctx.stroke();
  const gold = ctx.createLinearGradient(-h*0.06,0,h*0.17,0);
  gold.addColorStop(0,'#8a5a08'); gold.addColorStop(.35,'#f5c842'); gold.addColorStop(.55,'#fff0a0'); gold.addColorStop(.75,'#d89a1c'); gold.addColorStop(1,'#7a4c06');
  ctx.strokeStyle = gold; ctx.lineWidth = h*0.032; limb(); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,50,4,.7)'; ctx.lineWidth = h*0.032; ctx.setLineDash([h*0.005, h*0.03]); limb(); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(-h*0.006, -h*0.004); ctx.strokeStyle = 'rgba(255,250,220,.55)'; ctx.lineWidth = h*0.005; limb(); ctx.stroke(); ctx.restore();
  for (const [y,d] of [[top,-1],[bot,1]]){
    ctx.strokeStyle = '#f5c842'; ctx.lineWidth = h*0.014;
    ctx.beginPath(); ctx.moveTo(tipX, y); ctx.quadraticCurveTo(tipX - h*0.06, y + d*h*0.012, tipX - h*0.06, y - d*h*0.03); ctx.stroke();
    ctx.beginPath(); ctx.arc(tipX - h*0.04, y - d*h*0.035, h*0.02, 0, Math.PI*1.6); ctx.stroke();
    ctx.fillStyle = '#d4141a'; ctx.beginPath(); ctx.arc(tipX - h*0.004, y - d*h*0.004, h*0.011, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#8a1010'; ctx.fillRect(h*0.02, -h*0.075, h*0.065, h*0.15);
  ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 1.4;
  for (let i=-4;i<4;i++){ const y0 = i*h*0.018; ctx.beginPath(); ctx.moveTo(h*0.02,y0); ctx.lineTo(h*0.085,y0+h*0.018); ctx.moveTo(h*0.085,y0); ctx.lineTo(h*0.02,y0+h*0.018); ctx.stroke(); }
  ctx.fillStyle = goldGrad(ctx, -h*0.085, -h*0.07); ctx.fillRect(h*0.015, -h*0.088, h*0.075, h*0.016);
  ctx.fillStyle = goldGrad(ctx, h*0.07, h*0.088); ctx.fillRect(h*0.015, h*0.072, h*0.075, h*0.016);
  const sw = Math.sin(S.t*2.2)*0.15;
  for (const [ox,len] of [[h*0.035,h*0.12],[h*0.065,h*0.1]]){
    ctx.save(); ctx.translate(ox, h*0.088); ctx.rotate(sw - tilt*0.6);
    ctx.strokeStyle = '#c0141a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,len); ctx.stroke();
    ctx.fillStyle = '#f5c842'; ctx.beginPath(); ctx.arc(0,len*0.35,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c0141a'; ctx.beginPath(); ctx.moveTo(-5,len); ctx.lineTo(5,len); ctx.lineTo(0,len+h*0.035); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  if (draw.reload > 0 || S.mode!=='play') return;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const nX = bx + nx*c - ny*s, nY = by + nx*s + ny*c, gX = bx + h*0.05*c, gY = by + h*0.05*s;
  let dx = aim.x - gX, dy = aim.y - gY; const dl = Math.hypot(dx,dy)||1; dx/=dl; dy/=dl;
  const len = h*0.62, tX = nX + dx*len, tY = nY + dy*len, px = -dy, py = dx, hw = h*0.024;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6a4206'; ctx.lineWidth = Math.max(4, h*0.015); ctx.beginPath(); ctx.moveTo(nX,nY); ctx.lineTo(tX,tY); ctx.stroke();
  ctx.strokeStyle = '#e8b53a'; ctx.lineWidth = Math.max(2.5, h*0.01); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,210,.6)'; ctx.lineWidth = Math.max(1, h*0.003); ctx.beginPath(); ctx.moveTo(nX-dy*1.2,nY+dx*1.2); ctx.lineTo(tX-dy*1.2,tY+dx*1.2); ctx.stroke();
  ctx.strokeStyle = '#8a1010'; ctx.lineWidth = Math.max(4, h*0.015);
  for (const f of [0.22, 0.26, 0.8]){ const x = nX + dx*len*f, y = nY + dy*len*f; ctx.beginPath(); ctx.moveTo(x-dx*1.5,y-dy*1.5); ctx.lineTo(x+dx*1.5,y+dy*1.5); ctx.stroke(); }
  for (const sg of [1,-1]){
    ctx.fillStyle = '#1c8a8a'; ctx.beginPath(); ctx.moveTo(nX+dx*h*0.02, nY+dy*h*0.02); ctx.lineTo(nX+dx*h*0.1 + px*hw*1.3*sg, nY+dy*h*0.1 + py*hw*1.3*sg); ctx.lineTo(nX+dx*h*0.17, nY+dy*h*0.17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a3a9a'; ctx.beginPath(); ctx.arc(nX+dx*h*0.1 + px*hw*0.6*sg, nY+dy*h*0.1 + py*hw*0.6*sg, hw*0.35, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f5c842'; ctx.beginPath(); ctx.arc(nX+dx*h*0.1 + px*hw*0.6*sg, nY+dy*h*0.1 + py*hw*0.6*sg, hw*0.15, 0, Math.PI*2); ctx.fill();
  }
  if (S.agni > 0){ const gl = h*0.08; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .8 + .2*Math.sin(S.t*20); ctx.drawImage(GLOW.orange, tX+dx*h*0.03-gl, tY+dy*h*0.03-gl, gl*2, gl*2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const hg = ctx.createLinearGradient(tX+px*hw, tY+py*hw, tX-px*hw, tY-py*hw); hg.addColorStop(0,'#fff3b0'); hg.addColorStop(.5,'#f2c230'); hg.addColorStop(1,'#8a5a08');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(tX+dx*h*0.07, tY+dy*h*0.07); ctx.quadraticCurveTo(tX+dx*h*0.02+px*hw*1.3, tY+dy*h*0.02+py*hw*1.3, tX-dx*h*0.01+px*hw*0.4, tY-dy*h*0.01+py*hw*0.4);
  ctx.lineTo(tX-dx*h*0.01-px*hw*0.4, tY-dy*h*0.01-py*hw*0.4); ctx.quadraticCurveTo(tX+dx*h*0.02-px*hw*1.3, tY+dy*h*0.02-py*hw*1.3, tX+dx*h*0.07, tY+dy*h*0.07); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6a4206'; ctx.lineWidth = 1; ctx.stroke();
}
function drawReticle(){
  const x = aim.x, y = aim.y, r = Math.max(14, Math.min(W,H)*0.024);
  const col = lock ? (lock.type==='maya' ? '#c08aff' : '#ffe08a') : 'rgba(255,240,200,.95)';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(26,13,5,.35)'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = col;
  for (let i=0;i<8;i++){ const a = i*Math.PI/4 + S.t*0.4, cx = x + Math.cos(a)*r*1.32, cy = y + Math.sin(a)*r*1.32; ctx.save(); ctx.translate(cx,cy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-r*0.18,0); ctx.quadraticCurveTo(0,-r*0.12,r*0.18,0); ctx.quadraticCurveTo(0,r*0.12,-r*0.18,0); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(x,y,2.2,0,Math.PI*2); ctx.fill();
  if (draw.on){ ctx.strokeStyle = draw.power >= 1 ? '#9be08a' : '#ff9933'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x,y,r+8,-Math.PI/2,-Math.PI/2 + Math.PI*2*draw.power); ctx.stroke(); }
}
function drawCoin(c){
  const w = Math.abs(Math.cos(c.spin))*c.size + 1.5;
  ctx.fillStyle = '#9a6a00'; ctx.beginPath(); ctx.ellipse(c.x+1, c.y+1.5, w, c.size, 0, 0, Math.PI*2); ctx.fill();
  const g = ctx.createLinearGradient(c.x-w, c.y-c.size, c.x+w, c.y+c.size);
  g.addColorStop(0,'#fff6c2'); g.addColorStop(.45,'#ffd23f'); g.addColorStop(1,'#d89400');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, c.size, 0, 0, Math.PI*2); ctx.fill();
  if (w > c.size*0.5){ ctx.strokeStyle = 'rgba(150,90,0,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(c.x, c.y, w*0.62, c.size*0.62, 0, 0, Math.PI*2); ctx.stroke(); }
}
function render(dt){
  const shake = S.shake > 0 ? S.shake*14 : 0;
  ctx.save();
  if (shake) ctx.translate((Math.random()-.5)*shake, (Math.random()-.5)*shake);
  ctx.save();
  ctx.translate(aim.x, aim.y); ctx.scale(S.zoom, S.zoom); ctx.translate(-aim.x, -aim.y);
  if (S.eMix < 1){ ctx.drawImage(envBg[S.eFrom], 0, 0, W, H); ctx.globalAlpha = S.eMix; }
  ctx.drawImage(envBg[S.ei], 0, 0, W, H); ctx.globalAlpha = 1;
  drawClouds(ctx, dt, S.ei);
  drawFW(ctx);
  if (RV.phase) drawRavan();
  for (const b of heads) drawShadow(b);
  const items = [];
  for (const b of heads) items.push({z:b.z, f:()=>drawHead(b)});
  for (const a of arrows) items.push({z:a.p[2], f:()=>drawArrow3D(a)});
  items.sort((p,q)=>q.z-p.z);
  for (const it of items) it.f();
  drawParts(ctx, S.t);
  drawTrajectoryHint(); drawLock(); drawFire(ctx);
  ctx.textAlign = 'center';
  for (const f of floaters){
    ctx.globalAlpha = Math.min(1, f.life*1.6); ctx.font = `800 ${f.size}px "Anek Latin", sans-serif`;
    ctx.fillStyle = 'rgba(26,13,5,.55)'; ctx.fillText(f.text, f.x+2, f.y+2);
    ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const zk = Math.min(1, (S.zoom - 1)/0.24);
  if (zk > 0.02){
    const rr = Math.min(W,H)*0.28, v = ctx.createRadialGradient(aim.x, aim.y, rr*0.6, aim.x, aim.y, Math.max(W,H)*0.9);
    v.addColorStop(0,'rgba(20,8,2,0)'); v.addColorStop(1,`rgba(20,8,2,${0.55*zk})`);
    ctx.fillStyle = v; ctx.fillRect(-20,-20,W+40,H+40);
  }
  if (S.mode==='play' || S.mode==='busting' || S.mode==='countdown'){ drawBow(); if (S.mode==='play' && !S.paused) drawReticle(); }
  for (const c of coins) drawCoin(c);
  ctx.restore();
  if (S.flash > 0){ ctx.fillStyle = `rgba(150,80,255,${S.flash*0.4})`; ctx.fillRect(0,0,W,H); }
}
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  if (S.input==='camera' && hand) hand.track();
  if (!S.paused) update(dt);
  render(S.paused ? 0 : dt);
  requestAnimationFrame(loop);
}

/* ================= input ================= */
function onPinchStart(){
  if (S.mode==='play' && !S.paused) beginDraw();
  else if (S.mode==='intro') advanceIntro();
  else if (!S.paused && visiblePanel()==='turn' && performance.now() - S.readyAt > 1500){
    if (S.mode==='ready') startCountdown();
    else if (S.mode==='turnover' && S.game==='local') nextPlayer();
  }
}
const pointerAim = () => S.input === 'mouse' || !hand?.ready;
const touchLift = e => e.pointerType==='touch' ? Math.min(90, H*0.11) : 0;   // keep the reticle visible above the thumb
cv.addEventListener('pointermove', e => { if (pointerAim()){ aim.rx = e.clientX; aim.ry = e.clientY - touchLift(e); } });
cv.addEventListener('pointerdown', e => {
  if (S.mode==='intro'){ advanceIntro(); return; }
  if (!pointerAim()) return;
  e.preventDefault(); aim.rx = aim.x = e.clientX; aim.ry = aim.y = e.clientY - touchLift(e);
  cv.setPointerCapture?.(e.pointerId); beginDraw();
});
cv.addEventListener('pointerup', () => { if (pointerAim()) release(); });
cv.addEventListener('pointercancel', () => { draw.on = false; draw.power = 0; });

/* ================= phone support ================= */
let wake = null;
async function keepAwake(){ try{ if ('wakeLock' in navigator && !wake){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', ()=> wake = null); } }catch(e){} }
function goFullscreen(){ if (!MOBILE) return; try{ const el = document.documentElement; (el.requestFullscreen?.({navigationUI:'hide'}) || el.webkitRequestFullscreen?.())?.catch?.(()=>{}); }catch(e){} }
document.addEventListener('visibilitychange', () => {
  if (document.hidden){ if (S.mode==='play' && !S.paused && S.game!=='online') openDialog('pause'); }
  else if (S.mode!=='menu') keepAwake();
});
let rotateShown = false;
function checkRotate(){
  if (MOBILE && S.mode==='play' && H > W && !rotateShown){ rotateShown = true; $('rotateHint').hidden = false; setTimeout(()=> $('rotateHint').hidden = true, 4500); }
  if (W > H) $('rotateHint').hidden = true;
}
if (MOBILE && !SECURE){ $('secureNote').hidden = false; }

/* ================= boot ================= */
let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(()=>{ resize(); checkRotate(); }, 120); });
resize();
document.fonts?.ready?.then(()=>{ repaintEnvs(); });
for (let i=0;i<8;i++){ spawnAmbient(); heads[i].y = 1 + Math.random()*6; heads[i].born = -1; }
setInterval(() => { if (['menu','ready','turnover','final','lobby'].includes(S.mode) && heads.length < 9) spawnAmbient(); }, 800);
aim.x = aim.rx = CX; aim.y = aim.ry = HZ;
requestAnimationFrame(loop);
window.__rd = { S, R, RV, pop, endTurn, loseLife, headEscaped, get cur(){ return cur; }, get heads(){ return heads; }, set heads(v){ heads = v; }, get roster(){ return roster; }, project, advanceIntro, startFinale, addHead, levelCfg };
