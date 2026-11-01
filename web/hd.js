// The Great Escape HD - renderer: colour classification, smoothed upscaling, sprites, HUD.
'use strict';

const HD = (function () {
  const SCALE = 4;
  const WIN_W = 184, WIN_H = 128;           // visible game window in Spectrum pixels (23x16 cells)
  const BUF_COLS = 26, BUF_ROWS = 19;       // scene buffer: tile_buf (24x17) plus a 1-tile margin
  const BUF_W = BUF_COLS * 8, BUF_H = BUF_ROWS * 8;

  /* ---- Colour classes ------------------------------------------------- */
  // Each class: [paper, ink] colours for day; night variants are derived.
  const CLASSES = {
    VOID:     { paper: '#07090c', ink: '#07090c' },
    GRASS:    { paper: '#355f2b', ink: '#8fc45a', tex: 'grass' },
    ROOF:     { paper: '#4a4238', ink: '#c9b690', tex: 'roof' },
    HUTWALL:  { paper: '#5c3d24', ink: '#dcb272', tex: 'plank' },
    BUILDING: { paper: '#4f4c56', ink: '#cfc8b8', tex: 'brick' },
    ROAD:     { paper: '#3b3a38', ink: '#9d9a93', tex: 'gravel' },
    FENCE:    { paper: '#355f2b', ink: '#cdd3d8' },
    TOWER:    { paper: '#355f2b', ink: '#c99a58' },
    GATE:     { paper: '#2d2a28', ink: '#c99a58' },
    // interior
    DARK:     { paper: '#0b0a10', ink: '#0b0a10' },
    FLOOR:    { paper: '#3b2b1f', ink: '#b8976a', tex: 'floor' },
    WOOD:     { paper: '#4a2f1b', ink: '#d9ad6c' },
    BED:      { paper: '#5a4635', ink: '#e8e4d8' },
    WINDOW:   { paper: '#1b2b4a', ink: '#d6e4f5' },
    DOOR:     { paper: '#2a1c12', ink: '#c08a4c' },
    METAL:    { paper: '#2b2d33', ink: '#aeb6c2' },
    PAPER:    { paper: '#2b2b2b', ink: '#f2ecd8' },
    PERSON:   { paper: '#3a3f52', ink: '#d9d2c0' },
    TUNNEL:   { paper: '#2a1a10', ink: '#c9803c' },
    TUNNELDARK: { paper: '#000000', ink: '#000000' },
  };
  const CLASS_NAMES = Object.keys(CLASSES);
  const CLASS_ID = {}; CLASS_NAMES.forEach((n, i) => CLASS_ID[n] = i);

  // Exterior supertile -> class.
  const ST_CLASS = (function () {
    const m = new Array(218).fill('BUILDING');
    const set = (cls, ...ids) => ids.forEach(i => m[i] = cls);
    set('ROOF', 0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 16, 21, 23, 28, 33);
    set('GRASS', 6, 7, 25, 26, 27, 35, 36, 37, 121, 145, 146, 153, 156, 157, 163, 169, 175, 176, 177, 185, 186, 187, 190);
    set('HUTWALL', 13, 14, 15, 17, 18, 19, 20, 22, 24, 29, 30, 31, 32, 34);
    set('ROAD', 110, 112, 113, 116, 117, 118, 119, 122, 123, 124, 125, 126, 127, 128, 132, 133, 136);
    set('VOID', 96);
    set('FENCE', 139, 140, 141, 142, 143, 144, 147, 148, 149, 150, 151, 152, 154, 155, 158, 159, 160, 161, 162, 164, 165, 166, 167, 168,
      170, 171, 172, 173, 174, 178, 179, 180, 181, 182, 183, 184, 189, 193, 195, 198, 199, 200, 201, 202, 203, 204, 209, 213, 216);
    set('TOWER', 188, 191, 192, 194, 196, 197, 205, 208, 210, 211, 212, 214, 215, 217);
    set('GATE', 207);
    set('BUILDING', 206);
    return m.map(n => CLASS_ID[n]);
  })();

  // Interior object index -> class.
  const OBJ_CLASS = (function () {
    const names = ['TUNNEL', 'TUNNEL', 'FLOOR', 'TUNNEL', 'TUNNEL', 'PERSON', 'TUNNEL', 'TUNNEL', 'WINDOW', 'BED', 'WOOD', 'WOOD', 'TUNNEL',
      'WOOD', 'TUNNEL', 'DOOR', 'DOOR', 'TUNNEL', 'TUNNEL', 'PERSON', 'TUNNEL', 'FLOOR', 'WOOD', 'BED', 'WOOD', 'WOOD', 'WOOD', 'FLOOR',
      'WOOD', 'WOOD', 'METAL', 'PAPER', 'WOOD', 'WOOD', 'WOOD', 'WINDOW', 'TUNNEL', 'PAPER', 'DOOR', 'DOOR', 'DOOR', 'FLOOR', 'WOOD', 'WOOD',
      'WOOD', 'WOOD', 'FLOOR', 'FLOOR', 'WOOD', 'WOOD', 'WOOD', 'WOOD', 'METAL', 'METAL'];
    return names.map(n => CLASS_ID[n]);
  })();
  const OUTLINE_OBJECTS = new Set([2, 21, 27, 41, 46, 47]);

  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

  // Build palette tables: for each mood (day/night/tunnel-torch), class -> [paper rgb, ink rgb]
  const MOODS = { day: 0, night: 1, torch: 2, nightroom: 3 };
  const PALETTE = [];
  (function () {
    const NIGHT = [30, 40, 90], TORCH = [255, 120, 40];
    for (let mood = 0; mood < 4; mood++) {
      const tab = [];
      for (const name of CLASS_NAMES) {
        const c = CLASSES[name];
        let paper = hexToRgb(c.paper), ink = hexToRgb(c.ink);
        if (mood === 1) { paper = mix(mix(paper, [0, 0, 0], 0.55), NIGHT, 0.25); ink = mix(mix(ink, [0, 0, 0], 0.35), NIGHT, 0.2); }
        if (mood === 3) { paper = mix(mix(paper, [0, 0, 0], 0.45), NIGHT, 0.2); ink = mix(mix(ink, [0, 0, 0], 0.25), NIGHT, 0.15); }
        if (mood === 2) { paper = mix(mix(paper, [0, 0, 0], 0.5), TORCH, 0.15); ink = mix(ink, TORCH, 0.45); }
        tab.push([paper.map(clamp255), ink.map(clamp255)]);
      }
      PALETTE.push(tab);
    }
  })();

  /* ---- Tile analysis --------------------------------------------------- */
  let D = null;
  let grassLike = null; // Uint8Array per exterior tile: 1 if sparse-dot tile

  function init(data) {
    D = data;
    const n = D.exterior_tiles.length / 8;
    grassLike = new Uint8Array(n);
    for (let t = 0; t < n; t++) {
      let ink = 0, adjacent = 0;
      const rows = D.exterior_tiles.subarray(t * 8, t * 8 + 8);
      for (let r = 0; r < 8; r++) {
        const b = rows[r];
        for (let c = 0; c < 8; c++) {
          if ((b >> (7 - c)) & 1) {
            ink++;
            if (c < 7 && (b >> (6 - c)) & 1) adjacent++;
            if (r < 7 && (rows[r + 1] >> (7 - c)) & 1) adjacent++;
          }
        }
      }
      grassLike[t] = (ink <= 8 && adjacent <= 2) ? 1 : 0;
    }
    buildSpriteCache();
  }

  /* ---- Scene buffer (class/bit per pixel) ----------------------------- */
  // sceneBits: 0/1 per pixel; sceneCls: class id per pixel (BUF_W x BUF_H)
  const sceneBits = new Uint8Array(BUF_W * BUF_H);
  const sceneCls = new Uint8Array(BUF_W * BUF_H);   // class of ink pixels
  const scenePap = new Uint8Array(BUF_W * BUF_H);   // class of paper pixels
  const sceneLit = new Uint8Array(BUF_COLS * BUF_ROWS); // per-cell searchlight

  function tilesetBase(st) { return st <= 44 ? 0 : (st <= 138 || st >= 204) ? 145 : 365; }

  // Fill one 8x8 cell of the scene from a tile array/index with a class.
  function putCell(arr, tileIndex, cls, cx, cy, pap) {
    if (pap === undefined) pap = cls;
    const base = tileIndex * 8;
    for (let r = 0; r < 8; r++) {
      const b = arr[base + r];
      let o = (cy * 8 + r) * BUF_W + cx * 8;
      for (let c = 0; c < 8; c++, o++) { sceneBits[o] = (b >> (7 - c)) & 1; sceneCls[o] = cls; scenePap[o] = pap; }
    }
  }

  // Determine interior floor cells by flood filling blank tiles from inside each room outline.
  function interiorFloorMask(state) {
    const cols = 24, rows = 17;
    const floor = new Uint8Array(cols * rows);
    const tb = state.tile_buf, to = state.tile_obj;
    // find outline object placements from the room definition
    const room = state.room_index;
    const rd = D.rooms[room - 1];
    let off = 1;
    const nb = rd[off++]; off += nb * 4;
    const nm = rd[off++]; off += nm;
    const nobj = rd[off++];
    for (let i = 0; i < nobj; i++) {
      const oi = rd[off++], col = rd[off++], row = rd[off++];
      if (!OUTLINE_OBJECTS.has(oi)) continue;
      const w = D.objects[oi][0], h = D.objects[oi][1];
      const cx = col + (w >> 1), cy = row + (h >> 1);
      const stack = [cy * cols + cx];
      const seen = new Uint8Array(cols * rows);
      let count = 0;
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        seen[p] = 1;
        const x = p % cols, y = (p / cols) | 0;
        if (tb[p] !== 0 && to[p] === oi + 1) continue; // outline ring
        floor[p] = 1; count++;
        if (count > w * h) break;
        if (x > 0) stack.push(p - 1); if (x < cols - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - cols); if (y < rows - 1) stack.push(p + cols);
      }
      if (count > w * h) { // leaked: fall back to a diamond test within the bbox
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const fx = (x - col + 0.5) / w, fy = (y - row + 0.5) / h;
          floor[y * cols + x] = (Math.abs(fx - 0.5) + Math.abs(fy - 0.5) <= 0.5) ? 1 : 0;
        }
      }
    }
    return floor;
  }

  // Rebuild the scene buffer from engine state. Returns { originX, originY } = absolute pixel coords of buffer top-left.
  function buildScene(state, mood) {
    const tb = state.tile_buf, mb = state.map_buf;
    const outdoors = state.room_index === 0;
    sceneBits.fill(0); sceneCls.fill(outdoors ? CLASS_ID.VOID : CLASS_ID.DARK);
    if (outdoors) {
      sceneObjects = [];
      const ET = D.exterior_tiles, ST = D.supertiles, MAP = D.map;
      const mx = state.map_position.x, my = state.map_position.y;
      for (let cy = 0; cy < BUF_ROWS; cy++) for (let cx = 0; cx < BUF_COLS; cx++) {
        const tx = cx - 1, ty = cy - 1;
        let st, tile;
        if (tx >= 0 && tx < 24 && ty >= 0 && ty < 17) {
          // from the engine's own buffers
          const row_offset = ((((my & 3) + ty) >> 2) & 0x3F) * 7;
          const offset = ((((mx & 3) + tx) >> 2) & 0x3F) + row_offset;
          st = mb[offset]; tile = tb[ty * 24 + tx];
        } else {
          // margin: from the map directly (map row is offset by one supertile row, see get_supertiles)
          const ax = mx + tx, ay = my - 4 + ty;
          const sx = ax >> 2, sy = ay >> 2;
          if (ax < 0 || sx >= 54 || ay < 0 || sy >= 34) { st = 96; tile = 0; }
          else { st = MAP[sy * 54 + sx]; tile = ST[st * 16 + (ay & 3) * 4 + (ax & 3)]; }
        }
        const base = tilesetBase(st);
        let cls = ST_CLASS[st];
        if (cls !== CLASS_ID.VOID && cls !== CLASS_ID.BUILDING && cls !== CLASS_ID.GATE && grassLike[base + tile]) cls = CLASS_ID.GRASS;
        putCell(ET, base + tile, cls, cx, cy);
      }
    } else {
      const IT = D.interior_tiles, to = state.tile_obj;
      const tunnel = state.room_index >= 29;
      const floor = tunnel ? null : interiorFloorMask(state);
      sceneObjects = [];
      const useObj = typeof ART_OBJECTS !== 'undefined' && HD.useArt && !tunnel;
      const hdCells = new Uint8Array(24 * 17);
      if (useObj) {
        const rd = D.rooms[state.room_index - 1];
        let off = 1; const nb = rd[off++]; off += nb * 4; const nm = rd[off++]; off += nm; const nobj = rd[off++];
        for (let i = 0; i < nobj; i++) {
          let oi = rd[off++]; const col = rd[off++], row = rd[off++];
          // mutable room bytes (beds, benches, blockage) come from the engine's shadow bytes
          oi = get_roomdef(state, state.room_index, off - 3);
          if (!ART_OBJECTS.has(oi)) continue;
          const w = D.objects[oi][0], h = D.objects[oi][1];
          sceneObjects.push({ oi, col, row, w, h });
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const cx = col + x, cy = row + y; if (cx < 24 && cy < 17 && to[cy * 24 + cx] === oi + 1) hdCells[cy * 24 + cx] = 1; }
        }
      }
      for (let ty = 0; ty < 17; ty++) for (let tx = 0; tx < 24; tx++) {
        const p = ty * 24 + tx;
        let tile = tb[p];
        if (hdCells[p]) tile = 0; // drawn as an HD object instead
        let cls, pap;
        if (tunnel) { cls = (mood === MOODS.torch) ? CLASS_ID.TUNNEL : CLASS_ID.TUNNELDARK; pap = cls; }
        else {
          const onFloor = floor && floor[p];
          pap = onFloor ? CLASS_ID.FLOOR : CLASS_ID.DARK;
          if (to[p] && !OUTLINE_OBJECTS.has(to[p] - 1)) cls = OBJ_CLASS[to[p] - 1];
          else cls = onFloor ? CLASS_ID.FLOOR : CLASS_ID.DARK;
        }
        putCell(IT, tile, cls, tx + 1, ty + 1, pap);
      }
    }
    sceneOriginX = state.map_position.x * 8 - 8; sceneOriginY = state.map_position.y * 8 - 8;
    return { originX: sceneOriginX, originY: sceneOriginY };
  }

  /* ---- EPX smoothing (2x, applied twice) on index images ---------------- */
  function epx2x(src, w, h, dst) {
    const W = w * 2;
    for (let y = 0; y < h; y++) {
      const ym = y > 0 ? y - 1 : y, yp = y < h - 1 ? y + 1 : y;
      for (let x = 0; x < w; x++) {
        const xm = x > 0 ? x - 1 : x, xp = x < w - 1 ? x + 1 : x;
        const P = src[y * w + x], A = src[ym * w + x], B = src[y * w + xp], C = src[y * w + xm], Dd = src[yp * w + x];
        let e1 = P, e2 = P, e3 = P, e4 = P;
        if (C === A && C !== Dd && A !== B) e1 = A;
        if (A === B && A !== C && B !== Dd) e2 = B;
        if (Dd === C && Dd !== B && C !== A) e3 = C;
        if (B === Dd && B !== A && Dd !== C) e4 = B;
        const o = (y * 2) * W + x * 2;
        dst[o] = e1; dst[o + 1] = e2; dst[o + W] = e3; dst[o + W + 1] = e4;
      }
    }
  }

  // Scene HD canvas
  const sceneCanvas = document.createElement('canvas');
  sceneCanvas.width = BUF_W * SCALE; sceneCanvas.height = BUF_H * SCALE;
  const sceneCtx = sceneCanvas.getContext('2d');
  const sceneImg = sceneCtx.createImageData(BUF_W * SCALE, BUF_H * SCALE);
  const idx1 = new Uint16Array(BUF_W * BUF_H), idx2 = new Uint16Array(BUF_W * BUF_H * 4), idx4 = new Uint16Array(BUF_W * BUF_H * 16);
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

  // Material palettes: per mood and class -> { paper: [4 rgb], ink: [3 rgb], tex, tuft }
  const SHADE = { a: 0, b: 1, c: 2, d: 3 };
  let MATS = null;
  function buildMaterials() {
    MATS = [];
    const NIGHT = [30, 40, 90], TORCH = [255, 120, 40];
    for (let mood = 0; mood < 4; mood++) {
      const tab = [];
      for (const name of CLASS_NAMES) {
        const m = ART_TILES.MATERIALS[name];
        const adj = (c, isInk) => {
          let v = hexToRgb(c);
          if (mood === 1) v = mix(mix(v, [0, 0, 0], isInk ? 0.35 : 0.55), NIGHT, isInk ? 0.2 : 0.25);
          if (mood === 3) v = mix(mix(v, [0, 0, 0], isInk ? 0.25 : 0.45), NIGHT, isInk ? 0.15 : 0.2);
          if (mood === 2) v = isInk ? mix(v, TORCH, 0.45) : mix(mix(v, [0, 0, 0], 0.5), TORCH, 0.15);
          return v.map(clamp255);
        };
        const tex = m.tex ? m.tex.map(t => { const a = new Uint8Array(256); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) a[y * 16 + x] = SHADE[t[y][x]]; return a; }) : null;
        tab.push({ paper: m.paper.map(c => adj(c, false)), ink: m.ink.map(c => adj(c, true)), tex, ntex: tex ? tex.length : 0, tuft: !!m.tuft });
      }
      MATS.push(tab);
    }
  }
  let sceneOriginX = 0, sceneOriginY = 0;
  let sceneObjects = [];

  function renderScene(mood, lit) {
    if (!MATS) buildMaterials();
    const n = BUF_W * BUF_H;
    for (let i = 0; i < n; i++) idx1[i] = sceneBits[i] ? sceneCls[i] * 2 + 1 : scenePap[i] * 2;
    epx2x(idx1, BUF_W, BUF_H, idx2);
    epx2x(idx2, BUF_W * 2, BUF_H * 2, idx4);
    const mats = MATS[mood];
    const px = sceneImg.data;
    const W = BUF_W * SCALE, H = BUF_H * SCALE;
    const tuft = ART_TILES.tuft;
    const ox4 = sceneOriginX * SCALE, oy4 = sceneOriginY * SCALE;
    for (let y = 0; y < H; y++) {
      const ay = oy4 + y;                 // absolute HD pixel
      const ty = (ay >> 1) & 15;          // texture row (texture pixels are 2x2 HD pixels)
      const yUp = y > 0 ? y - 1 : y, yDn = y < H - 1 ? y + 1 : y;
      for (let x = 0; x < W; x++) {
        const v = idx4[y * W + x];
        const cls = v >> 1, bit = v & 1;
        const m = mats[cls];
        let col;
        if (!bit) {
          if (m.tex) {
            const ax = ox4 + x;
            const variant = m.ntex > 1 ? (((ax >> 5) * 7 + (ay >> 5) * 13) % m.ntex) : 0;
            const sh = m.tex[variant][ty * 16 + ((ax >> 1) & 15)];
            col = m.paper[sh];
          } else col = m.paper[1];
        } else if (m.tuft && grassDot(x, y, W, H)) {
          const t = tuft[y & 3][x & 3];
          const gm = mats[CLASS_ID.GRASS];
          if (t === 0) { const ax = ox4 + x; const sh = m.tex[0][ty * 16 + ((ax >> 1) & 15)]; col = m.paper[sh]; }
          else col = gm.ink[t === 1 ? 2 : 0];
        } else {
          // relief: top edge highlight, bottom edge shadow
          const up = idx4[yUp * W + x] & 1, dn = idx4[yDn * W + x] & 1;
          const lf = x > 0 ? idx4[y * W + x - 1] & 1 : 1, rt = x < W - 1 ? idx4[y * W + x + 1] & 1 : 1;
          if (!up || !lf) col = m.ink[2]; else if (!dn || !rt) col = m.ink[0]; else col = m.ink[1];
        }
        let r = col[0], g = col[1], b = col[2];
        if (lit) {
          const l = lit[((y / SCALE) >> 3) * BUF_COLS + ((x / SCALE) >> 3)];
          if (l) { r = clamp255(r * 1.25 + 60); g = clamp255(g * 1.2 + 50); b = clamp255(b * 0.9 + 10); }
        }
        const o = (y * W + x) * 4;
        px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
      }
    }
    sceneCtx.putImageData(sceneImg, 0, 0);
  }
  // Is this HD ink pixel part of an isolated dot (grass)? Check the 1x source pixel's neighbourhood.
  function grassDot(x, y, W, H) {
    const sx = x >> 2, sy = y >> 2;
    const i = sy * BUF_W + sx;
    if (!sceneBits[i]) return false;
    let n = 0;
    if (sx > 0 && sceneBits[i - 1]) n++;
    if (sx < BUF_W - 1 && sceneBits[i + 1]) n++;
    if (sy > 0 && sceneBits[i - BUF_W]) n++;
    if (sy < BUF_H - 1 && sceneBits[i + BUF_W]) n++;
    return n === 0;
  }

  /* ---- Sprites ---------------------------------------------------------- */
  // Palettes per character class: bands [hat, face, torso, legs, boots] each {ink, fill}
  const SPRITE_PAL = {
    prisoner: [['#6b4a2e', '#3a2816'], ['#f1c9a2', '#b8835a'], ['#c9b88a', '#5c5538'], ['#8a9bb5', '#3b4760'], ['#2b2b2b', '#111111']],
    guard:    [['#8a9a7a', '#3c4a34'], ['#f1c9a2', '#b8835a'], ['#9aa88a', '#3f4d35'], ['#7a8870', '#2f3a2a'], ['#2b2b2b', '#111111']],
    commandant: [['#56607a', '#20263a'], ['#f1c9a2', '#b8835a'], ['#6d7598', '#2a2f48'], ['#5d6484', '#22263a'], ['#2b2b2b', '#111111']],
    dog:      [['#c48c52', '#5a3a1c']],
    crawl:    [['#c9b88a', '#5c5538']],
    stove:    [['#b8bcc4', '#2a2c30']],
    crate:    [['#d8ad6a', '#5a3a1c']],
  };
  const ITEM_PAL = ['#ffd95a', '#7fd3e0', '#9fd8e8', '#f4efe2', '#9fe066', '#ff6b6b', '#8ad07a', '#f6f0da', '#d48bff', '#ff5a5a',
    '#ffd95a', '#7be07a', '#e8e0d0', '#f0f0f0', '#f3e1c0', '#9fe066'];

  const spriteCache = new Map();
  let hdSpriteSheet = null;

  function spriteKind(spriteBase, frame) {
    if (spriteBase === 0) return 'stove';
    if (spriteBase === 1) return 'crate';
    if (spriteBase === 14) return 'dog';
    if (spriteBase === 2 && frame >= 8) return 'crawl';
    if (spriteBase === 2) return 'prisoner';
    if (spriteBase === 22) return 'guard';
    return 'commandant';
  }

  // Build an HD canvas for a sprite definition (bitmap+mask) with the given palette bands and flip.
  function buildSprite(def, bands, flip, outlineCol) {
    const bpr = def.width - 1, w = bpr * 8, h = def.height;
    // index image: 0 = transparent, else 1 + bandIndex*2 + bit
    const src = new Uint16Array(w * h);
    let top = -1, bottom = -1;
    for (let y = 0; y < h; y++) for (let b = 0; b < bpr; b++) {
      const mk = def.mask[y * bpr + b];
      if (mk !== 0xFF) { if (top < 0) top = y; bottom = y; }
    }
    const span = Math.max(1, bottom - top);
    for (let y = 0; y < h; y++) {
      const f = (y - top) / span;
      let band = 0;
      if (bands.length === 5) band = f < 0.11 ? 0 : f < 0.3 ? 1 : f < 0.66 ? 2 : f < 0.92 ? 3 : 4;
      for (let b = 0; b < bpr; b++) {
        const bm = def.bitmap[y * bpr + b], mk = def.mask[y * bpr + b];
        for (let c = 0; c < 8; c++) {
          const bit = 7 - c;
          const opaque = ((mk >> bit) & 1) === 0;
          const x = flip ? (w - 1 - (b * 8 + c)) : (b * 8 + c);
          src[y * w + x] = opaque ? 1 + band * 2 + ((bm >> bit) & 1) : 0;
        }
      }
    }
    const i2 = new Uint16Array(w * h * 4), i4 = new Uint16Array(w * h * 16);
    epx2x(src, w, h, i2); epx2x(i2, w * 2, h * 2, i4);
    const cv = document.createElement('canvas'); cv.width = w * SCALE; cv.height = h * SCALE;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(cv.width, cv.height);
    const W = cv.width, H = cv.height, px = img.data;
    const cols = bands.map(b => [hexToRgb(b[1]), hexToRgb(b[0])]); // [fill, ink]
    const oc = hexToRgb(outlineCol);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = i4[y * W + x];
      const o = (y * W + x) * 4;
      if (!v) { px[o + 3] = 0; continue; }
      const band = (v - 1) >> 1, bit = (v - 1) & 1;
      let col = cols[band][bit];
      // outline: any 4-neighbour transparent -> dark edge
      const edge = (x === 0 || !i4[y * W + x - 1]) || (x === W - 1 || !i4[y * W + x + 1]) || (y === 0 || !i4[(y - 1) * W + x]) || (y === H - 1 || !i4[(y + 1) * W + x]);
      if (edge) col = mix(col, oc, 0.75);
      else {
        // soft vertical shading
        const sh = 1 - (y / H) * 0.18 + ((x / W) - 0.5) * 0.1;
        col = [col[0] * sh, col[1] * sh, col[2] * sh];
      }
      px[o] = clamp255(col[0]); px[o + 1] = clamp255(col[1]); px[o + 2] = clamp255(col[2]); px[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function buildSpriteCache() {
    spriteCache.clear();
  }

  function getSprite(spriteBase, frameIndex, flip) {
    const key = spriteBase * 256 + frameIndex * 2 + (flip ? 1 : 0);
    let cv = spriteCache.get(key);
    if (!cv) {
      const def = D.sprites[spriteBase + frameIndex];
      if (typeof ART !== 'undefined' && HD.useArt) {
        const desc = ART.frameFor(spriteBase + frameIndex);
        cv = ART.renderFrame(desc, SCALE / 2, flip);
        cv.dy = def.height - desc.h / 2; // align the art's feet with the engine's sprite box bottom
      } else {
        const kind = spriteKind(spriteBase, frameIndex);
        cv = buildSprite(def, SPRITE_PAL[kind], flip, '#0a0a12');
      }
      spriteCache.set(key, cv);
    }
    return cv;
  }

  const itemCache = new Map();
  function getItem(item, poisoned) {
    const key = item * 2 + (poisoned ? 1 : 0);
    let cv = itemCache.get(key);
    if (!cv && typeof ART_ITEMS !== 'undefined' && HD.useArt) {
      const desc = ART_ITEMS.frameFor(item, poisoned);
      cv = ART.renderFrame(desc, SCALE / 2, false);
      cv.dy = D.items[item].height - desc.h / 2;
      itemCache.set(key, cv);
    }
    if (!cv) {
      const def = { width: 3, height: D.items[item].height, bitmap: D.items[item].bitmap, mask: D.items[item].mask }; // 16 px wide
      const ink = poisoned ? '#d48bff' : ITEM_PAL[item];
      const fill = mix(hexToRgb(ink), [0, 0, 0], 0.6).map(clamp255);
      cv = buildSprite(def, [[ink, '#' + fill.map(v => v.toString(16).padStart(2, '0')).join('')]], false, '#0a0a12');
      itemCache.set(key, cv);
    }
    return cv;
  }

  // HD mask from a 160-byte mask buffer (32x40 bits) -> ImageData alpha
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = 32 * SCALE; maskCanvas.height = 40 * SCALE;
  const maskCtx = maskCanvas.getContext('2d');
  const maskImg = maskCtx.createImageData(32 * SCALE, 40 * SCALE);
  const m1 = new Uint16Array(32 * 40), m2 = new Uint16Array(32 * 40 * 4), m4 = new Uint16Array(32 * 40 * 16);
  function buildMask(maskbuf) {
    for (let y = 0; y < 40; y++) for (let b = 0; b < 4; b++) {
      const v = maskbuf[y * 4 + b];
      for (let c = 0; c < 8; c++) m1[y * 32 + b * 8 + c] = (v >> (7 - c)) & 1;
    }
    epx2x(m1, 32, 40, m2); epx2x(m2, 64, 80, m4);
    const px = maskImg.data;
    for (let i = 0; i < 32 * 40 * 16; i++) { px[i * 4 + 3] = m4[i] ? 255 : 0; }
    maskCtx.putImageData(maskImg, 0, 0);
    return maskCanvas;
  }

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = 32 * SCALE; tmpCanvas.height = 40 * SCALE;
  const tmpCtx = tmpCanvas.getContext('2d');

  /* ---- Painted backgrounds (optional, generated externally from art/refs) ---- */
  const painted = { images: new Map(), map: null, mapLoading: false, ready: false, composed: new Map() };
  const PAINTED_ROOM_FILES = typeof PAINTED_MANIFEST !== 'undefined' ? PAINTED_MANIFEST.rooms : [];
  const PAINTED_ALIGN_TABLE = typeof PAINTED_ALIGN !== 'undefined' ? PAINTED_ALIGN : {};
  const PAINTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
  const baseName = (n) => n.replace(/\.[a-z0-9]+$/i, '');
  function loadPainted(source) {
    // source: object fileName->dataURL (inlined build) or a base URL string for a folder of files.
    // Files are matched by base name, so a painting may be png, jpg or webp whatever the manifest says.
    const names = PAINTED_ROOM_FILES.map(r => r.file).concat(['map_q0_topleft.png', 'map_q1_topright.png', 'map_q2_bottomleft.png', 'map_q3_bottomright.png']);
    let pending = 0, loaded = 0;
    const byBase = new Map();
    if (source && typeof source === 'object') for (const k of Object.keys(source)) byBase.set(baseName(k), source[k]);
    const done = () => { if (--pending === 0) { assembleMap(); painted.ready = loaded > 0; if (HD.onPaintedReady) HD.onPaintedReady(loaded); } };
    for (const n of names) {
      const base = baseName(n);
      let urls = [];
      if (typeof source === 'string') urls = PAINTED_EXTS.map(e => source + base + e);
      else if (byBase.has(base)) urls = [byBase.get(base)];
      if (!urls.length) continue;
      pending++;
      const img = new Image();
      let attempt = 0;
      img.onload = () => { painted.images.set(n, registerPainting(img, base, n.startsWith('map_') ? 3456 / 2176 : WIN_W / WIN_H)); loaded++; done(); };
      img.onerror = () => { if (++attempt < urls.length) img.src = urls[attempt]; else done(); };
      img.src = urls[0];
    }
    if (pending === 0 && HD.onPaintedReady) HD.onPaintedReady(0);
  }
  // Map a painting onto the full reference frame using its measured alignment rectangle (fractions of the
  // painting that correspond to the whole reference image). Parts of the frame the painting does not cover
  // are black, which is also what surrounds every room. Without alignment data, centre-crop to the aspect.
  function registerPainting(img, base, aspect) {
    const a = PAINTED_ALIGN_TABLE[base];
    if (!a) return normalise(img, aspect);
    const W = img.width, H = img.height;
    const fx = a.x * W, fy = a.y * H, fw = a.w * W, fh = a.h * H;
    if (Math.abs(fx) < 1 && Math.abs(fy) < 1 && Math.abs(fw - W) < 1 && Math.abs(fh - H) < 1) return img;
    const cv = document.createElement('canvas'); cv.width = Math.round(fw); cv.height = Math.round(fh);
    const c = cv.getContext('2d');
    // fill the uncovered strip with the painting's own border colour (tunnels are dark brown, not black)
    c.drawImage(img, 0, 0, W, H, 0, 0, 1, 1); const p = c.getImageData(0, 0, 1, 1).data; // average of the whole image
    const edge = document.createElement('canvas'); edge.width = 1; edge.height = 1;
    const ec = edge.getContext('2d'); ec.drawImage(img, 0, 0, W, 4, 0, 0, 1, 1); const e1 = ec.getImageData(0, 0, 1, 1).data;
    ec.drawImage(img, 0, H - 4, W, 4, 0, 0, 1, 1); const e2 = ec.getImageData(0, 0, 1, 1).data;
    const dark = [0, 1, 2].map(i => Math.round(Math.min(e1[i], e2[i], p[i])));
    c.fillStyle = `rgb(${dark[0]},${dark[1]},${dark[2]})`; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(img, 0, 0, W, H, -fx, -fy, W, H);
    return cv;
  }
  // Centre-crop an image to the given aspect ratio, keeping its native resolution.
  function normalise(img, aspect) {
    let w = img.width, h = img.height;
    if (Math.abs(w / h - aspect) < 0.01) return img;
    let cw = w, ch = h;
    if (w / h > aspect) cw = Math.round(h * aspect); else ch = Math.round(w / aspect);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    cv.getContext('2d').drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, cw, ch);
    return cv;
  }
  function assembleMap() {
    const q = ['map_q0_topleft.png', 'map_q1_topright.png', 'map_q2_bottomleft.png', 'map_q3_bottomright.png'].map(n => painted.images.get(n));
    if (!q.every(Boolean)) { painted.map = null; return; }
    // native resolution of the paintings (quadrants are 3456x2176 at the renderer's 4x scale)
    // (capped: the assembled map is one canvas, 4096-wide quadrants already make it 8192x5152)
    const qw = Math.min(4096, Math.max(...q.map(i => i.width))), qh = Math.round(qw * 2176 / 3456);
    const cv = document.createElement('canvas'); cv.width = qw * 2; cv.height = qh * 2;
    const c = cv.getContext('2d');
    for (let i = 0; i < 4; i++) c.drawImage(q[i], (i & 1) * qw, (i >> 1) * qh, qw, qh);
    painted.map = cv; painted.mapScale = (qw * 2) / (216 * 32); // painting pixels per renderer pixel
  }
  // Pick (and compose, for mixed bed/bench states) the painting for the current room. Returns a canvas or null.
  function paintedRoom(state) {
    const room = state.room_index;
    const entries = PAINTED_ROOM_FILES.filter(r => r.room === room);
    if (!entries.length) return null;
    if (entries.length === 1) return painted.images.get(entries[0].file) || null;
    // variants: entries with 'shadow' maps {slot: value}; base = the 'empty/clear' one
    const base = entries.find(e => /empty|clear/.test(e.file)), alt = entries.find(e => !/empty|clear/.test(e.file));
    if (!base || !alt) return painted.images.get(entries[0].file) || null;
    const bimg = painted.images.get(base.file), aimg = painted.images.get(alt.file);
    if (!bimg) return aimg || null;
    if (!aimg) return bimg;
    // which slots are currently in the 'alt' state?
    const slots = Object.keys(alt.shadow).map(Number);
    const active = slots.filter(sl => state.roomdef_shadow_bytes[sl] === alt.shadow[sl]);
    if (active.length === 0) return bimg;
    if (active.length === slots.length) return aimg;
    const key = room + ':' + active.join(',');
    let cv = painted.composed.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = bimg.width; cv.height = bimg.height;
    const c = cv.getContext('2d');
    c.drawImage(bimg, 0, 0, cv.width, cv.height);
    const kx = cv.width / 736, ky = cv.height / 512;
    // crop the alt painting over each active slot's object rectangle (with a margin), feathered
    const rd = D.rooms[room - 1];
    let off = 1; const nb = rd[off++]; off += nb * 4; const nm = rd[off++]; off += nm; const nobj = rd[off++];
    for (let i = 0; i < nobj; i++) {
      const slot = get_roomdef_shadow(room, off), col = rd[off + 1], row = rd[off + 2]; off += 3;
      if (slot < 0 || !active.includes(slot)) continue;
      const oi = alt.shadow[slot], w = D.objects[oi][0], h = D.objects[oi][1];
      const x = (col - 1) * 32 + 0, y = (row - 1) * 32 - 32, ww = (w + 2) * 32, hh = (h + 3) * 32; // margin of a tile around, extra above
      const tmp = document.createElement('canvas'); tmp.width = Math.round(ww * kx); tmp.height = Math.round(hh * ky);
      const t = tmp.getContext('2d');
      t.drawImage(aimg, x * aimg.width / 736, y * aimg.height / 512, ww * aimg.width / 736, hh * aimg.height / 512, 0, 0, tmp.width, tmp.height);
      t.globalCompositeOperation = 'destination-in';
      const g = t.createRadialGradient(tmp.width / 2, tmp.height / 2, Math.min(tmp.width, tmp.height) * 0.25, tmp.width / 2, tmp.height / 2, Math.max(tmp.width, tmp.height) * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = g; t.fillRect(0, 0, tmp.width, tmp.height);
      c.drawImage(tmp, Math.round(x * kx), Math.round(y * ky));
    }
    painted.composed.set(key, cv);
    return cv;
  }
  // Returns a scene descriptor for the painted background, or null when none is available.
  function paintedScene(state) {
    if (!painted.ready) return null;
    if (state.room_index === 0) {
      if (!painted.map) return null;
      return { canvas: painted.map, originX: 0, originY: 32, painted: true, k: painted.mapScale };
    }
    const cv = paintedRoom(state);
    if (!cv) return null;
    return { canvas: cv, originX: state.map_position.x * 8 + 8, originY: state.map_position.y * 8, fit: true, painted: true };
  }

  /* ---- Frame compose --------------------------------------------------- */
  // sprites: array of { image, x, y (absolute map pixel coords of sprite top-left), maskbuf, maskOriginX, maskOriginY }
  function composeFrame(ctx, scene, viewX, viewY, sprites, nightLight) {
    // scene buffer top-left absolute = scene.originX/Y; view top-left absolute = viewX/viewY
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, WIN_W * SCALE, WIN_H * SCALE); ctx.clip();
    if (scene.canvas) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (scene.fit) ctx.drawImage(scene.canvas, Math.round((scene.originX - viewX) * SCALE), Math.round((scene.originY - viewY) * SCALE), WIN_W * SCALE, WIN_H * SCALE);
      else if (scene.k) { const k = scene.k; ctx.drawImage(scene.canvas, (viewX - scene.originX) * SCALE * k, (viewY - scene.originY) * SCALE * k, WIN_W * SCALE * k, WIN_H * SCALE * k, 0, 0, WIN_W * SCALE, WIN_H * SCALE); }
      else ctx.drawImage(scene.canvas, Math.round((scene.originX - viewX) * SCALE), Math.round((scene.originY - viewY) * SCALE));
      ctx.imageSmoothingEnabled = false;
    } else ctx.drawImage(sceneCanvas, Math.round((scene.originX - viewX) * SCALE), Math.round((scene.originY - viewY) * SCALE));
    if (scene.tint) {
      // night: darken everything except the searchlight-lit cells
      ctx.fillStyle = scene.tint;
      if (scene.lit) {
        for (let r = 0; r < 16; r++) for (let c = 0; c < 23; c++) if (!scene.lit[r * 23 + c]) ctx.fillRect(c * 8 * SCALE, r * 8 * SCALE, 8 * SCALE, 8 * SCALE);
      } else ctx.fillRect(0, 0, WIN_W * SCALE, WIN_H * SCALE);
    }
    if (!scene.painted) for (const o of sceneObjects) {
      const img = ART_OBJECTS.image(o.oi, o.w, o.h, SCALE / 2);
      if (img) ctx.drawImage(img, Math.round((scene.originX + 8 + o.col * 8 - viewX) * SCALE), Math.round((scene.originY + 8 + o.row * 8 - viewY) * SCALE));
    }
    for (const s of sprites) {
      const ady = s.image.dy || 0;
      const dx = (s.x - viewX) * SCALE, dy = (s.y + ady - viewY) * SCALE;
      if (s.maskbuf) {
        tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
        // sprite position within mask region
        const ox = (s.x - s.maskOriginX) * SCALE, oy = (s.y + ady - s.maskOriginY) * SCALE;
        tmpCtx.drawImage(s.image, ox, oy);
        tmpCtx.globalCompositeOperation = 'destination-in';
        tmpCtx.drawImage(buildMask(s.maskbuf), 0, 0);
        tmpCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmpCanvas, Math.round(dx - ox), Math.round(dy - oy));
      } else {
        ctx.drawImage(s.image, Math.round(dx), Math.round(dy));
      }
    }
    if (nightLight) {
      // soft searchlight glow over lit cells
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of nightLight) {
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, 'rgba(255,230,140,0.30)'); g.addColorStop(0.7, 'rgba(255,220,120,0.12)'); g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function clearCaches() { spriteCache.clear(); itemCache.clear(); painted.composed.clear(); }
  return { useArt: true, clearCaches, loadPainted, paintedScene, painted, SCALE, WIN_W, WIN_H, BUF_COLS, BUF_ROWS, MOODS, CLASS_ID, stClass: (st) => ST_CLASS[st], init, buildScene, renderScene, getSprite, getItem, composeFrame, sceneLit, hexToRgb, epx2x };
})();
