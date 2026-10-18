// Everything you might want to tune lives here: rules, levels, evils, scenery, words.

export const CREDITS = [
  ['Concept & direction', 'Ishan Upadhyay · Experign'],
  ['Game design & code', 'Built with Claude by Anthropic'],
  ['Illustration', 'Ravan, his heads, the golden bow and the maidan are drawn in code for this game'],
  ['Global ledger & rooms', 'Supabase'],
  ['Hand tracking', 'MediaPipe Hand Landmarker by Google · Apache 2.0'],
  ['Typefaces', 'Rozha One by Indian Type Foundry and Anek Latin by Ek Type, SIL Open Font License'],
  ['Sound', 'Conch, dhol and fire synthesised live with the Web Audio API'],
];

export const SPEECH = [
  'So, another archer walks onto the maidan. I am Ravan, Dashanan, king of golden Lanka.',
  'Look at my ten heads. Kama, Krodha, Moha, Lobha, Mada, Maatsarya, Buddhi, Manas, Chitta, and Ahamkara, the proudest crown of all.',
  'Every Dussehra you burn my likeness. Every year I return, in your anger, your greed, your ego.',
  'Take up your bow and strike my heads down, one by one. And beware my Maya. Not everything that flies is what it seems.',
];
export const LAUGH = 'Ha! Ha! Ha! Come and find me in the fog, if you dare.';

export const EVILS = [
  {n:'Kama',      d:'काम',      m:'Lust'},
  {n:'Krodha',    d:'क्रोध',     m:'Anger'},
  {n:'Moha',      d:'मोह',      m:'Delusion'},
  {n:'Lobha',     d:'लोभ',      m:'Greed'},
  {n:'Mada',      d:'मद',       m:'Pride'},
  {n:'Maatsarya', d:'मात्सर्य',   m:'Envy'},
  {n:'Buddhi',    d:'बुद्धि',     m:'Corrupted intellect'},
  {n:'Manas',     d:'मनस्',     m:'Uncontrolled mind'},
  {n:'Chitta',    d:'चित्त',     m:'Tainted will'},
  {n:'Ahamkara',  d:'अहंकार',   m:'Ego'},
];

/* ---------------- rules ---------------- */
export const SOLO = { lives: 3, escapesPerLife: 10, headsPerLevel: 12 };
export const LOCAL = { minPlayers: 2, maxPlayers: 5 };
export const ONLINE = { maxPlayers: 8, startDelay: 5000, waitAfterFinish: 120 };
export const AGNI_SECS = 6, AGNI_RADIUS = 2.6;
export const LEVEL_COUNT = 4;   // timed modes play 4 levels

export const MODES = {
  solo: {
    name: 'Solo', sub: 'Endless · 1 archer',
    rules: [
      'You have 3 lives, shown as diyas.',
      'Hitting a Maya head costs a life. Letting 10 heads escape over the top costs a life.',
      'Every 12 heads you strike, the evening moves on: Sandhya, Godhuli, Ratri, then Agni. After Agni the night burns hotter and the heads keep getting smaller and faster.',
      'The run ends when the last diya goes out. Your best run goes on the Solo board.',
    ],
  },
  local: {
    name: 'Pass & play', sub: '2 to 5 archers · one device',
    rules: [
      'Archers take turns on this device. Each turn is 4 levels of the chosen length, from dusk to the night of fire.',
      'Hitting a Maya head ends your turn. You keep the coins you earned.',
      'Most coins wins. A tie goes to more heads struck.',
      'Every turn goes on the Multiplayer board, and the winner gets a win.',
    ],
  },
  online: {
    name: 'Online room', sub: '2 to 8 archers · own devices',
    rules: [
      'The host opens a room and shares its 4-letter code. Everyone joins on their own phone or laptop before the host starts.',
      'Everyone faces the same heads at the same moment, so every score is comparable.',
      'Scores update live for the whole room. Hitting a Maya head ends your run; you can still watch the others.',
      'When the last archer finishes, most coins wins. Results go on the Multiplayer board.',
    ],
  },
};
export const COMMON_RULES = [
  ['Head', 'Pays 1 to 10 gold coins. Farther heads, later levels and a streak of hits all pay more.'],
  ['Crowned head', 'Always pays 10 coins.'],
  ['Agni Astra', 'Fire arrows for 6 seconds. Each hit also burns heads close to it.'],
  ['Maya', 'An illusion that flickers purple. Do not shoot it.'],
];

/* ---------------- levels ---------------- */
const BASE_LEVELS = [
  {size:1.00, speed:1.00, every:0.70, maya:0.05},
  {size:0.80, speed:1.35, every:0.58, maya:0.08},
  {size:0.64, speed:1.75, every:0.48, maya:0.11},
  {size:0.50, speed:2.20, every:0.40, maya:0.14},
];
// Endless Solo keeps going past level 4.
export function levelCfg(n){
  if (n < BASE_LEVELS.length) return BASE_LEVELS[n];
  const k = n - 3;
  return { size: Math.max(0.4, 0.5 - 0.02*k), speed: 2.2 + 0.22*k, every: Math.max(0.26, 0.4 - 0.02*k), maya: Math.min(0.2, 0.14 + 0.01*k) };
}
export const envFor = n => Math.min(n, 3);
export const arrowSpeed = p => 90 + 50*p;   // m/s
export const EYE = 1.6, GRAVITY = 3.5;
export const AVATARS = ['#ff9933','#f2c230','#e2541b','#2bb3a3','#c87bd8','#7fc8ff','#9be08a','#ff7fa8'];

/* ---------------- one Dussehra evening ---------------- */
export const ENVS = [
  { name:'Sandhya', deva:'संध्या', en:'Dusk', accent:'#ffb347', sky:['#3a1c48','#9c3b34','#ef8a3a','#ffd690'], glow:'255,196,120', sun:{x:.72,y:.93,r:.075,col:'#ffe6a6'},
    stars:0, sil:'#4a2026', far:'rgba(120,52,52,.5)', ground:['#c08a50','#7a4a26','#3a2210'], speck:['#8a5a30','#d4a46a','#6a4020','#a87848'],
    haze:'rgba(255,190,130,', diyas:false, lights:.2, shadow:.4, part:'dust', fireworks:0 },
  { name:'Godhuli', deva:'गोधूलि', en:'Twilight', accent:'#ff8fb1', sky:['#1a1438','#4e2766','#b94c78','#f2967a'], glow:'255,150,140',
    stars:.35, sil:'#2a1424', far:'rgba(80,40,70,.55)', ground:['#8a5a44','#4e3024','#22140c'], speck:['#6a4434','#a07058','#4a2c20','#8a6048'],
    haze:'rgba(240,150,150,', diyas:true, lights:.7, shadow:.3, part:'sparks', fireworks:0 },
  { name:'Ratri', deva:'रात्रि', en:'Night', accent:'#9fb6ff', sky:['#05071c','#0e1440','#232a62','#4a3e72'], glow:'140,140,210', moon:{x:.27,y:.3,r:.04},
    stars:1, sil:'#0c0c1e', far:'rgba(40,40,80,.6)', ground:['#4a3a3a','#2a2024','#100b0d'], speck:['#3a2c2c','#5a4644','#2a2020','#4a3a38'],
    haze:'rgba(110,110,180,', diyas:true, lights:1, shadow:.22, part:'lanterns', fireworks:.12 },
  { name:'Agni', deva:'अग्नि', en:'Night of fire', accent:'#ff6a1a', sky:['#0a0406','#2a080a','#6e1a0e','#d0481a'], glow:'255,110,50',
    stars:.4, sil:'#1a0806', far:'rgba(90,20,10,.55)', ground:['#5a2a14','#2e140a','#120806'], speck:['#4a2010','#7a3a18','#2a1008','#6a2c14'],
    haze:'rgba(255,110,60,', diyas:true, lights:1, shadow:.3, part:'embers', fireworks:.7 },
];
