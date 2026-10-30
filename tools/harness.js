// harness.js - deterministic headless run of the JS port, printing per-iteration checksums.
// usage: node tools/harness.js <iterations> <menu_iterations> <seed>
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const web = path.join(__dirname, '..', 'web');
const src = ['data.js', 'engine1.js', 'engine2.js', 'engine3.js', 'engine4.js'].map(f => fs.readFileSync(path.join(web, f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, Buffer, console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const E = ctx.module.exports;

const maxiters = parseInt(process.argv[2] || '2000');
const menu_iters = parseInt(process.argv[3] || '10');
const seed = parseInt(process.argv[4] || '1') >>> 0;

function script_value(iter) {
  let h = Math.floor(iter / 12) >>> 0;
  h = (Math.imul(h, 2654435761) + seed) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; h >>>= 0;
  const dir = h & 7;
  const fire = ((h >>> 8) % 23) === 0;
  let v = 0;
  if (dir === 1 || dir === 2) v |= 1;
  if (dir === 3 || dir === 4) v |= 2;
  if (dir === 2 || dir === 5) v |= 4;
  if (dir === 4 || dir === 6) v |= 8;
  if (fire) v |= 16;
  if (dir === 7) v = 0;
  if ((h >>> 20) % 5 === 0) v = 0;
  return v;
}

let iteration = 0;
const speccy = {
  screen: { pixels: new Uint8Array(6144), attributes: new Uint8Array(768) },
  in: (sp, port) => port === 0x001F ? script_value(iteration) : 0x1F,
  out: () => {}, draw: () => {}, stamp: () => {}, sleep: () => 0, sound: () => {},
};
const D = E.decodeData(vm.runInContext('TGE_RAWDATA', ctx));
const state = E.tge_create(D, speccy);
E.tge_setup(state);
// The C harness ran the menu for menu_iters + 4 calls (key debouncing); replicate game_counter increments.
const menu_calls = menu_iters + 4;
for (let i = 0; i < menu_calls - 1; i++) E.wave_morale_flag(state);
console.log(`menu_calls ${menu_calls} game_counter ${state.game_counter}`);
state.chosen_input_device = 1; // kempston
E.tge_setup2(state);
state.pending.length = 0;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(crc, buf) { crc ^= 0xffffffff; for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }

const out = [];
for (let iters = 0; iters < maxiters; iters++) {
  iteration = iters;
  E.tge_main(state);
  // service host requests synchronously (zoombox: nothing to do; confirm/anykey: never triggered by the script)
  while (state.pending.length) {
    const req = state.pending.shift();
    if (req.type === 'anykey') E.tge_resume(state, req, undefined);
    else if (req.type === 'confirm') E.tge_resume(state, req, false);
  }
  let c = crc32(0, speccy.screen.pixels);
  c = crc32(c, speccy.screen.attributes);
  const v = state.vischars, h = v[0];
  out.push(`${iters} ${c.toString(16).padStart(8, '0')} room=${state.room_index} pos=${h.mi.mappos.u},${h.mi.mappos.v},${h.mi.mappos.w} map=${state.map_position.x},${state.map_position.y} clock=${state.clock} gc=${state.game_counter} morale=${state.morale} score=${state.score_digits.join('')} hero=${state.hero_mappos.u},${state.hero_mappos.v},${state.hero_mappos.w} flags=${h.flags} route=${h.route.index}/${h.route.step} vc=${v.map(x => x.character !== 255 ? 1 : 0).join('')}`);
}
console.log(out.join('\n'));
