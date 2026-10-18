// The global ledger page: Solo board, Multiplayer board, recent turns and the ten-evils totals. Polls every 15 s.
(() => {
const EVILS = [['काम','Kama'],['क्रोध','Krodha'],['मोह','Moha'],['लोभ','Lobha'],['मद','Mada'],['मात्सर्य','Maatsarya'],['बुद्धि','Buddhi'],['मनस्','Manas'],['चित्त','Chitta'],['अहंकार','Ahamkara']];
const CFG = window.RD_CONFIG || {};
const params = new URLSearchParams(location.search);
if (params.has('embed')) document.body.classList.add('embed');
const ME = new Set((params.get('me') || '').split('|').map(s => s.trim().toLowerCase()).filter(Boolean));
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = new Intl.NumberFormat('en-IN');
const ago = iso => { const s = Math.max(0, (Date.now() - new Date(iso))/1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s/60)+' min ago'; if (s < 86400) return Math.floor(s/3600)+' h ago'; return Math.floor(s/86400)+' d ago'; };
const MODE = {solo:'Solo', local:'Pass & play', online:'Online'};
const END = {time:'Finished', lives:'Diyas out', maya:'Maya', skip:'Skipped', quit:'Stopped'};
const TABS = {
  solo:   {title:'Solo board', note:'Ranked by best single run. Archers with the same name share a row.', empty:'No solo runs yet. The first one played anywhere lands here within seconds.'},
  multi:  {title:'Multiplayer board', note:'Pass & play and online matches. Ranked by wins, then best match score.', empty:'No matches yet. Play Pass & play or an online room to start this board.'},
  recent: {title:'Recent turns', note:'The latest 40 turns in every mode.', empty:'Nobody has played yet.'},
};
let tab = TABS[params.get('tab')] ? params.get('tab') : 'solo', seen = new Set(), first = true;

$('evgrid').innerHTML = EVILS.map(([d,n],i)=>`<div class="ev"><i id="evb${i}"></i><div class="d">${d}</div><div class="n">${n}</div><div class="c" id="evc${i}">–</div></div>`).join('');
function setTab(t){
  tab = t; first = true;
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === t));
  $('boardTitle').textContent = TABS[t].title; $('emptyTxt').textContent = TABS[t].empty; load();
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

async function q(path){
  const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/,'')}/rest/v1/${path}`, {headers:{apikey:CFG.supabaseAnonKey, Authorization:`Bearer ${CFG.supabaseAnonKey}`}});
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0,140)}`);
  return r.json();
}
const rankCell = k => `<span class="rank ${k<3?'r'+(k+1):''}">${k+1}</span>`;
const rowCls = (key, id) => `${ME.has(key)?'me':''} ${!first && !seen.has(id)?'fresh':''}`;
const coinCell = v => `<td class="num coins"><span class="coin"></span>${nf.format(v)}</td>`;

const RENDER = {
  solo: rows => `<thead><tr><th>Rank</th><th>Archer</th><th class="num">Best run</th><th class="num">Heads</th><th class="num">Level</th><th class="num">Runs</th><th class="num">Hit %</th><th>Last played</th></tr></thead><tbody>` +
    rows.map((r,k)=>{ const id='s'+r.archer_key+r.runs; seen.add(id); return `<tr class="${rowCls(r.archer_key,id)}"><td>${rankCell(k)}</td><td class="name">${esc(r.name)}</td>${coinCell(r.best)}
      <td class="num">${nf.format(r.best_heads)}</td><td class="num">${r.best_level}</td><td class="num">${r.runs}</td><td class="num">${r.hit_pct!=null ? r.hit_pct+'%' : '–'}</td><td>${ago(r.last_played)}</td></tr>`; }).join('') + '</tbody>',
  multi: rows => `<thead><tr><th>Rank</th><th>Archer</th><th class="num">Wins</th><th class="num">Matches</th><th class="num">Best match</th><th class="num">All coins</th><th class="num">Heads</th><th>Last played</th></tr></thead><tbody>` +
    rows.map((r,k)=>{ const id='m'+r.archer_key+r.matches; seen.add(id); return `<tr class="${rowCls(r.archer_key,id)}"><td>${rankCell(k)}</td><td class="name">${esc(r.name)}</td>
      <td class="num ${r.wins?'win':''}">${r.wins}</td><td class="num">${r.matches}</td>${coinCell(r.best)}<td class="num">${nf.format(r.total_coins)}</td><td class="num">${nf.format(r.total_heads)}</td><td>${ago(r.last_played)}</td></tr>`; }).join('') + '</tbody>',
  recent: rows => `<thead><tr><th>Archer</th><th>Mode</th><th class="num">Coins</th><th class="num">Heads</th><th class="num">Level</th><th>Ended</th><th>When</th></tr></thead><tbody>` +
    rows.map(r=>{ seen.add(r.id); return `<tr class="${rowCls(r.player_name.trim().toLowerCase(), r.id)}"><td class="name">${esc(r.player_name)}</td><td><span class="pill p-${r.mode}">${MODE[r.mode]||r.mode}</span></td>${coinCell(r.coins)}
      <td class="num">${r.heads}</td><td class="num">${r.level_reached}</td><td><span class="pill p-${r.end_reason}">${END[r.end_reason]||r.end_reason}</span></td><td>${ago(r.created_at)}</td></tr>`; }).join('') + '</tbody>',
};
const QUERY = {
  solo:   'solo_board?select=*&order=best.desc,best_heads.desc&limit=50',
  multi:  'multi_board?select=*&order=wins.desc,best.desc&limit=50',
  recent: 'turns?select=id,mode,player_name,coins,heads,level_reached,end_reason,created_at&order=created_at.desc&limit=40',
};

async function load(){
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey){
    $('dot').className = 'dot off'; $('liveTxt').textContent = 'Not connected';
    $('err').hidden = false; $('err').textContent = 'The ledger is not connected yet. Add the Supabase project URL and public key to config.js.';
    return;
  }
  const want = tab;
  try{
    const [tot, board, recent] = await Promise.all([
      q('evil_totals?select=*'), q(QUERY[want]),
      q('turns?select=id,mode,player_name,coins,heads,created_at,tally&order=created_at.desc&limit=8'),
    ]);
    if (want !== tab) return;
    const t = tot[0] || {turns:0,archers:0,matches:0,solo_runs:0,coins:0,heads:0,tally:new Array(10).fill(0)};
    $('sArchers').textContent = nf.format(t.archers); $('sTurns').textContent = `${nf.format(t.solo_runs)} / ${nf.format(t.matches)}`;
    $('sHeads').textContent = nf.format(t.heads); $('sCoins').textContent = nf.format(t.coins);
    const max = Math.max(1, ...t.tally);
    t.tally.forEach((v,i)=>{ $('evc'+i).textContent = '×'+nf.format(v); $('evb'+i).style.width = (v/max*100)+'%'; });
    $('emptyBoard').hidden = board.length > 0; $('table').hidden = board.length === 0;
    $('table').innerHTML = RENDER[want](board);
    $('boardNote').textContent = board.length ? TABS[want].note : '';
    $('emptyFeed').hidden = recent.length > 0;
    $('feed').innerHTML = recent.map(r=>{ let m=0,k=-1; (r.tally||[]).forEach((v,i)=>{ if(v>m){m=v;k=i;} });
      return `<li><span class="who">${esc(r.player_name)}</span><span class="what">${MODE[r.mode]||''}, <span class="coin"></span>${r.coins}, ${r.heads} heads${k>=0?`, most ${EVILS[k][1]}`:''}, ${ago(r.created_at)}</span></li>`; }).join('');
    $('err').hidden = true; $('dot').className = 'dot'; $('liveTxt').textContent = 'Live, updated ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    first = false;
  }catch(e){
    $('dot').className = 'dot off'; $('liveTxt').textContent = 'Offline';
    $('err').hidden = false;
    $('err').textContent = /PGRST205|does not exist|404/.test(e.message)
      ? 'The ledger tables are not set up yet. Run db/schema.sql in the Supabase SQL editor once.'
      : 'Could not reach the ledger. Retrying every 15 seconds. ' + e.message;
  }
}
setTab(tab); setInterval(load, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
