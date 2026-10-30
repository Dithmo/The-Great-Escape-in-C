// gendata.js - convert gamedata.json into a compact JS module (base64 byte arrays).
// usage: node tools/gendata.js gamedata.json > data.js
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b64 = (arr) => Buffer.from(Uint8Array.from(arr)).toString('base64');
const out = {};
for (const k of ['exterior_tiles', 'mask_tiles', 'interior_tiles', 'supertiles', 'map', 'font', 'ascii_to_font',
  'music0', 'music1', 'flag_up', 'flag_down', 'static_tiles']) out[k] = b64(D[k]);
out.semitone_to_frequency = D.semitone_to_frequency;
out.sprites = D.sprites.map(s => ({ w: s.w, h: s.h, b: b64(s.bitmap), m: b64(s.mask) }));
out.items = D.items.map(s => ({ w: s.w, h: s.h, b: b64(s.bitmap), m: b64(s.mask) }));
out.masks = D.masks.map(b64);
out.exterior_mask_data = D.exterior_mask_data;
out.objects = D.objects.map(b64);
out.rooms = D.rooms.map(b64);
process.stdout.write('const TGE_RAWDATA = ' + JSON.stringify(out) + ';\n');
