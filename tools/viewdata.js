// viewdata.js - render game graphics data to PNG files for inspection.
// usage: node tools/viewdata.js <gamedata.json> <outdir>
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const [,, jsonPath, outDir] = process.argv;
const D = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}

class Img {
  constructor(w, h, bg = [40, 40, 40]) {
    this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { this.d[i * 4] = bg[0]; this.d[i * 4 + 1] = bg[1]; this.d[i * 4 + 2] = bg[2]; this.d[i * 4 + 3] = 255; }
  }
  px(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4; this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255;
  }
  tile(rows, x, y, scale, ink = [255, 255, 255], paper = [0, 0, 0]) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const on = (rows[r] >> (7 - c)) & 1;
      const col = on ? ink : paper;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) this.px(x + c * scale + sx, y + r * scale + sy, col[0], col[1], col[2]);
    }
  }
  // draw text digits using the game font (3x5 would need font; use game font tiles)
  text(str, x, y, scale = 1) {
    for (const ch of str) {
      const gi = D.ascii_to_font[ch.charCodeAt(0)];
      const rows = D.font.slice(gi * 8, gi * 8 + 8);
      this.tile(rows, x, y, scale, [255, 255, 0], [40, 40, 40]);
      x += 8 * scale;
    }
  }
  save(file) { writePNG(file, this.w, this.h, this.d); }
}

const tileRows = (arr, i) => arr.slice(i * 8, i * 8 + 8);

// 1. exterior tiles sheet: 32 per row, scale 3, with index labels every tile
{
  const n = D.exterior_tiles.length / 8; // 571
  const per = 32, sc = 3, cell = 8 * sc + 2;
  const img = new Img(per * cell, Math.ceil(n / per) * (cell + 8));
  for (let i = 0; i < n; i++) {
    const x = (i % per) * cell, y = Math.floor(i / per) * (cell + 8);
    img.tile(tileRows(D.exterior_tiles, i), x, y + 8, sc);
    img.text(String(i).padStart(3, '0').slice(-3), x, y, 1);
  }
  img.save(path.join(outDir, 'exterior_tiles.png'));
}
// 2. interior tiles sheet
{
  const n = D.interior_tiles.length / 8;
  const per = 24, sc = 3, cell = 8 * sc + 2;
  const img = new Img(per * cell, Math.ceil(n / per) * (cell + 8));
  for (let i = 0; i < n; i++) {
    const x = (i % per) * cell, y = Math.floor(i / per) * (cell + 8);
    img.tile(tileRows(D.interior_tiles, i), x, y + 8, sc);
    img.text(String(i).padStart(3, '0'), x, y, 1);
  }
  img.save(path.join(outDir, 'interior_tiles.png'));
}
// tileset selection as in plot_tile
function tilesetBase(st) { return st <= 44 ? 0 : (st <= 138 || st >= 204) ? 145 : 365; }

// 3. supertiles sheet, scale 2, 16 per row, labelled
{
  const n = D.supertiles.length / 16; // 218
  const per = 14, sc = 2, cell = 32 * sc + 4;
  const img = new Img(per * cell, Math.ceil(n / per) * (cell + 10));
  for (let i = 0; i < n; i++) {
    const x = (i % per) * cell, y = Math.floor(i / per) * (cell + 10);
    const base = tilesetBase(i);
    for (let t = 0; t < 16; t++) {
      const ti = D.supertiles[i * 16 + t];
      img.tile(tileRows(D.exterior_tiles, base + ti), x + (t % 4) * 8 * sc, y + 10 + Math.floor(t / 4) * 8 * sc, sc);
    }
    img.text(String(i).padStart(3, '0'), x, y, 1);
  }
  img.save(path.join(outDir, 'supertiles.png'));
}
// 4. full map at scale 1 (1728x1088)
{
  const MAPX = 54, MAPY = 34;
  const img = new Img(MAPX * 32, MAPY * 32, [0, 0, 0]);
  for (let my = 0; my < MAPY; my++) for (let mx = 0; mx < MAPX; mx++) {
    const st = D.map[my * MAPX + mx];
    const base = tilesetBase(st);
    for (let t = 0; t < 16; t++) {
      const ti = D.supertiles[st * 16 + t];
      img.tile(tileRows(D.exterior_tiles, base + ti), mx * 32 + (t % 4) * 8, my * 32 + Math.floor(t / 4) * 8, 1);
    }
  }
  img.save(path.join(outDir, 'map.png'));
  // also quadrants at 2x for detail
  for (let q = 0; q < 4; q++) {
    const qx = (q % 2) * 864, qy = Math.floor(q / 2) * 544;
    const im2 = new Img(864 * 2, 544 * 2, [0, 0, 0]);
    for (let y = 0; y < 544; y++) for (let x = 0; x < 864; x++) {
      const i = ((qy + y) * img.w + (qx + x)) * 4;
      for (let s = 0; s < 4; s++) im2.px(x * 2 + (s & 1), y * 2 + (s >> 1), img.d[i], img.d[i + 1], img.d[i + 2]);
    }
    im2.save(path.join(outDir, `map_q${q}.png`));
  }
}
// 5. sprites: bitmap, mask, composite (mask shown as grey)
{
  const sc = 4;
  const img = new Img(38 * 26 * sc, 3 * 32 * sc);
  D.sprites.forEach((s, si) => {
    const bpr = s.w - 1; // bytes per row
    for (let row = 0; row < s.h; row++) for (let b = 0; b < bpr; b++) {
      const bm = s.bitmap[row * bpr + b], mk = s.mask[row * bpr + b];
      for (let c = 0; c < 8; c++) {
        const x = si * 26 + b * 8 + c, bit = 7 - c;
        const on = (bm >> bit) & 1, m = (mk >> bit) & 1;
        for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) {
          img.px(x * sc + sx, row * sc + sy, on ? 255 : 0, on ? 255 : 0, on ? 255 : 0);
          img.px(x * sc + sx, (32 + row) * sc + sy, m ? 255 : 0, m ? 255 : 0, m ? 255 : 0);
          // composite: mask 0 => sprite area (opaque). show paper region in blue, ink in white
          const col = m ? [60, 120, 60] : (on ? [255, 255, 255] : [30, 30, 120]);
          img.px(x * sc + sx, (64 + row) * sc + sy, col[0], col[1], col[2]);
        }
      }
    }
  });
  img.save(path.join(outDir, 'sprites.png'));
}
// 6. items
{
  const sc = 6;
  const img = new Img(16 * 20 * sc, 3 * 18 * sc);
  D.items.forEach((s, si) => {
    for (let row = 0; row < s.h; row++) for (let b = 0; b < 2; b++) {
      const bm = s.bitmap[row * 2 + b], mk = s.mask[row * 2 + b];
      for (let c = 0; c < 8; c++) {
        const x = si * 20 + b * 8 + c, bit = 7 - c;
        const on = (bm >> bit) & 1, m = (mk >> bit) & 1;
        for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) {
          img.px(x * sc + sx, row * sc + sy, on ? 255 : 0, on ? 255 : 0, on ? 255 : 0);
          img.px(x * sc + sx, (18 + row) * sc + sy, m ? 255 : 0, m ? 255 : 0, m ? 255 : 0);
          const col = m ? [60, 120, 60] : (on ? [255, 255, 255] : [30, 30, 120]);
          img.px(x * sc + sx, (36 + row) * sc + sy, col[0], col[1], col[2]);
        }
      }
    }
  });
  img.save(path.join(outDir, 'items.png'));
}
// 7. interior objects: expand each object def into a tile grid and render
{
  function expandObject(obj) {
    const w = obj[0], h = obj[1];
    const out = new Array(w * h).fill(0);
    let p = 2, o = 0;
    const emit = (v) => { out[o++] = v; };
    while (o < w * h) {
      let byte = obj[p];
      if (byte === 255) {
        byte = obj[++p];
        if (byte !== 255) {
          const hi = byte & 0xF0;
          if (hi >= 128) { // repetition
            const count = obj[p] & 0x7F; const val = obj[++p];
            for (let i = 0; i < count && o < w * h; i++) out[o++] = val; // note: engine writes only if val>0 but default 0 anyway
            p++; continue;
          } else if (hi === 64) { // range
            const count = obj[p] & 0x0F; let val = obj[++p];
            for (let i = 0; i < count && o < w * h; i++) out[o++] = val++;
            p++; continue;
          }
        }
      }
      emit(byte); p++;
    }
    return { w, h, tiles: out };
  }
  const sc = 2;
  const cols = 6, cellw = 24 * 8 * sc, cellh = 13 * 8 * sc + 10;
  const img = new Img(cols * cellw, Math.ceil(54 / cols) * cellh);
  D.objects.forEach((obj, oi) => {
    const e = expandObject(obj);
    const x0 = (oi % cols) * cellw, y0 = Math.floor(oi / cols) * cellh;
    img.text(String(oi).padStart(2, '0') + ' ' + e.w + 'x' + e.h, x0, y0, 1);
    for (let ty = 0; ty < e.h; ty++) for (let tx = 0; tx < e.w; tx++) {
      const ti = e.tiles[ty * e.w + tx];
      img.tile(tileRows(D.interior_tiles, ti), x0 + tx * 8 * sc, y0 + 10 + ty * 8 * sc, sc, [255, 255, 255], ti ? [0, 0, 60] : [0, 0, 0]);
    }
  });
  img.save(path.join(outDir, 'objects.png'));
}
// 8. static tiles
{
  const sc = 3;
  const img = new Img(79 * 26, 40);
  for (let i = 0; i < 79; i++) {
    img.tile(D.static_tiles.slice(i * 9, i * 9 + 8), i * 26, 10, sc);
    img.text(String(i).padStart(2, '0'), i * 26, 0, 1);
  }
  img.save(path.join(outDir, 'static_tiles.png'));
}
console.log('done');
