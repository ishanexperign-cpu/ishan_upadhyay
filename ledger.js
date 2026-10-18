// Talks to Supabase over its REST API: saves turns (with an offline queue), runs rooms, reads boards.
import { uid, store } from './util.js';

const CFG = window.RD_CONFIG || {};
export const DB_READY = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
export const CONFIG = CFG;
const base = () => CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/';
const headers = extra => ({ apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}`, ...extra });

// With ?localrooms (testing rooms between tabs) each tab acts as its own device.
export const DEVICE = new URLSearchParams(location.search).has('localrooms') ? uid() : (() => { let d = store.get('rdDevice', ''); if (!d){ d = uid(); store.set('rdDevice', d); } return d; })();

async function asError(r){
  let msg = `${r.status}`;
  try { const j = await r.json(); msg = j.message || j.hint || JSON.stringify(j); } catch(e){}
  const e = new Error(msg); e.status = r.status; e.permanent = r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429; return e;
}
export async function rpc(name, args){
  const r = await fetch(base() + 'rpc/' + name, { method:'POST', headers: headers({'Content-Type':'application/json'}), body: JSON.stringify(args) });
  if (!r.ok) throw await asError(r);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
export async function select(path){
  const r = await fetch(base() + path, { headers: headers() });
  if (!r.ok) throw await asError(r);
  return r.json();
}

/* ---------- turns, with an offline queue ---------- */
let pending = store.get('rdPending2', []);
const savePending = () => store.set('rdPending2', pending.slice(-60));
export const pendingCount = () => pending.length;
export async function flush(){
  if (!DB_READY) return;
  for (const row of pending.slice()){
    try { await rpc('record_turn', { t: row }); pending = pending.filter(p => p.id !== row.id); }
    catch(e){ if (e.permanent){ console.warn('Ledger rejected a turn:', e.message); pending = pending.filter(p => p.id !== row.id); } else break; }
  }
  savePending();
}
export async function saveTurn(row){
  if (!DB_READY) return 'off';
  pending.push(row); savePending();
  await flush();
  return pending.some(p => p.id === row.id) ? 'queued' : 'saved';
}
if (DB_READY){ setInterval(flush, 30000); addEventListener('online', flush); }

/* ---------- online rooms ---------- */
export async function createRoom(host, levelSecs){
  const rows = await rpc('create_room', { p_host: host, p_level_secs: levelSecs });
  const r = Array.isArray(rows) ? rows[0] : rows;
  if (!r?.code) throw new Error('The room could not be created.');
  return r;   // { code, match_id, seed, host_secret }
}
export const startRoom  = (code, secret) => rpc('start_room',  { p_code: code, p_secret: secret });
export const finishRoom = (code, secret) => rpc('finish_room', { p_code: code, p_secret: secret }).catch(()=>{});
export async function getRoom(code){
  const rows = await select(`rooms?select=code,match_id,host_name,level_secs,seed,status,started_at&code=eq.${encodeURIComponent(code.toUpperCase())}`);
  return rows[0] || null;
}
export const matchResults = matchId => select(`match_results?select=player_name,coins,heads,level_reached,shots,hits,end_reason,tally,placement&match_id=eq.${matchId}&order=placement.asc`);

/* ---------- boards ---------- */
export async function soloRank(name, coins){
  try {
    const rows = await select('solo_board?select=archer_key,best&order=best.desc&limit=1000');
    const key = name.trim().toLowerCase();
    return { rank: rows.findIndex(r => r.archer_key === key) + 1 || null, better: rows.filter(r => r.best > coins).length + 1, of: rows.length };
  } catch(e){ return null; }
}
