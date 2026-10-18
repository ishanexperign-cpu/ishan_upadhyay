// Live room channel: who is in the room (presence) and moment-to-moment messages (start, scores).
// Uses Supabase Realtime. Add ?localrooms to the URL to test rooms between tabs of one browser without a network.
import { CONFIG } from './ledger.js';

let client = null;
function sb(){
  if (!client){
    if (!window.supabase?.createClient) throw new Error('The live connection library did not load.');
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { realtime: { params: { eventsPerSecond: 20 } } });
  }
  return client;
}

// me: { device, name, host, joinedAt }   on: { peers(list), event(name, payload), status(text) }
export function joinRoomChannel(code, me, on){
  return new URLSearchParams(location.search).has('localrooms') ? localChannel(code, me, on) : supabaseChannel(code, me, on);
}

function supabaseChannel(code, me, on){
  const ch = sb().channel('room:' + code, { config: { presence: { key: me.device }, broadcast: { self: false } } });
  const emitPeers = () => on.peers(Object.values(ch.presenceState()).map(list => list[0]).filter(Boolean));
  ch.on('presence', { event: 'sync' }, emitPeers);
  for (const ev of ['start', 'score']) ch.on('broadcast', { event: ev }, ({ payload }) => on.event(ev, payload));
  ch.subscribe(async status => {
    on.status?.(status);
    if (status === 'SUBSCRIBED') await ch.track(me);
  });
  return {
    send: (event, payload) => ch.send({ type: 'broadcast', event, payload }),
    leave: () => { try { ch.untrack(); sb().removeChannel(ch); } catch(e){} },
  };
}

// Same API over BroadcastChannel, for testing on one machine.
function localChannel(code, me, on){
  const bc = new BroadcastChannel('rd-room-' + code), peers = new Map();
  const beat = () => bc.postMessage({ k: 'here', me });
  const emit = () => on.peers([...peers.values()].map(p => p.me));
  peers.set(me.device, { me, at: Date.now() });
  bc.onmessage = ({ data }) => {
    if (data.k === 'here'){ const known = peers.has(data.me.device); peers.set(data.me.device, { me: data.me, at: Date.now() }); if (!known){ beat(); emit(); } }
    else if (data.k === 'bye'){ peers.delete(data.device); emit(); }
    else if (data.k === 'ev') on.event(data.event, data.payload);
  };
  const timer = setInterval(() => {
    beat();
    const now = Date.now(); let changed = false;
    for (const [d, p] of peers) if (d !== me.device && now - p.at > 4000){ peers.delete(d); changed = true; }
    if (changed) emit();
  }, 1000);
  setTimeout(() => { on.status?.('SUBSCRIBED'); beat(); emit(); }, 50);
  return {
    send: (event, payload) => bc.postMessage({ k: 'ev', event, payload }),
    leave: () => { clearInterval(timer); bc.postMessage({ k: 'bye', device: me.device }); bc.close(); },
  };
}
