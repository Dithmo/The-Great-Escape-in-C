// Hand-designed HD furniture and room fittings, drawn at 2x the Spectrum resolution with a small
// isometric pixel toolkit (boxes, parallelograms, posts) and per-object details.
'use strict';

const ART_OBJECTS = (function () {
  // Isometric axes in art pixels (2x): U = up-left (-2,-1), V = up-right (+2,-1).
  const WOOD = { top: '#d9ad6c', left: '#8a5a30', right: '#b47c44', line: '#2a1c10', hi: '#f2d49c' };
  const DARKWOOD = { top: '#b88a4c', left: '#6a4020', right: '#8e5c30', line: '#241810', hi: '#d8b070' };
  const METAL = { top: '#c8ccd4', left: '#6a707a', right: '#9aa0aa', line: '#1a1c20', hi: '#eef0f4' };
  const CLOTH = { top: '#e8e4d8', left: '#9a9488', right: '#c4beb0', line: '#3a3630', hi: '#ffffff' };
  const BLANKET = { top: '#6e7a9a', left: '#3e4660', right: '#56607c', line: '#20242e', hi: '#8e9ab8' };

  class Pix {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
    set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
    get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.d[y * this.w + x]; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
    // 2:1 iso line from (x0,y0) stepping dx per 2 px, used for edges
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy, x = x0, y = y0;
      for (;;) { this.set(x, y, c); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
    }
    // fill a convex polygon (array of [x,y]) by scanline
    poly(pts, c) {
      pts = pts.map(q => [Math.round(q[0]), Math.round(q[1])]);
      let miny = Infinity, maxy = -Infinity;
      for (const p of pts) { miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
      for (let y = Math.ceil(miny); y <= Math.floor(maxy); y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((y >= a[1] && y < b[1]) || (y >= b[1] && y < a[1])) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
          else if (a[1] === b[1] && y === a[1]) { xs.push(a[0]); xs.push(b[0]); }
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) this.set(x, y, c);
      }
    }
    outline(pts, c) { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.line(a[0], a[1], b[0], b[1], c); } }
  }

  // Box with bottom-front corner (bx,by), a units along U (each 4px wide, 2 px up), b units along V, height hpx.
  function box(p, bx, by, a, b, hpx, pal, opts = {}) {
    const U = [-4, -2], V = [4, -2];
    const B = [bx, by], L = [bx + U[0] * a, by + U[1] * a], R = [bx + V[0] * b, by + V[1] * b], K = [L[0] + V[0] * b, L[1] + V[1] * b];
    const up = (pt) => [pt[0], pt[1] - hpx];
    if (hpx > 0) {
      p.poly([B, L, up(L), up(B)], pal.left);
      p.poly([B, R, up(R), up(B)], pal.right);
    }
    p.poly([up(B), up(L), up(K), up(R)], pal.top);
    if (!opts.noline) {
      p.outline([up(B), up(L), up(K), up(R)], pal.line);
      if (hpx > 0) { p.line(B[0], B[1], up(B)[0], up(B)[1], pal.line); p.line(L[0], L[1], up(L)[0], up(L)[1], pal.line); p.line(R[0], R[1], up(R)[0], up(R)[1], pal.line); p.line(B[0], B[1], L[0], L[1], pal.line); p.line(B[0], B[1], R[0], R[1], pal.line); }
      // highlight on the top front edges
      p.line(up(L)[0], up(L)[1] + 1, up(B)[0] - 1, up(B)[1], pal.hi); p.line(up(B)[0] + 1, up(B)[1], up(R)[0], up(R)[1] + 1, pal.hi);
    }
    return { B, L, R, K, up };
  }
  // a thin vertical post
  function post(p, x, y, hpx, w, pal) { p.rect(x, y - hpx, w, hpx, pal.right); p.rect(x, y - hpx, 1, hpx, pal.hi); p.rect(x + w - 1, y - hpx, 1, hpx, pal.line); p.rect(x, y, w, 1, pal.line); p.rect(x, y - hpx, w, 1, pal.line); }

  // ---- object drawers: each gets a Pix sized (w*16, h*16) ----
  const O = {};
  // 9: empty bed facing SE (5x4 tiles -> 80x64)
  O[9] = (p) => {
    // bed runs from the up-left end (headboard) down to the bottom-right
    box(p, 62, 58, 9, 3, 7, DARKWOOD);                // frame
    box(p, 61, 53, 8.6, 2.8, 5, CLOTH);               // mattress
    box(p, 28, 41, 0.6, 3, 16, DARKWOOD);             // headboard at the up-left end
    box(p, 36, 42, 1.8, 2.4, 4, CLOTH);               // pillow
    post(p, 61, 60, 6, 2, DARKWOOD); post(p, 73, 54, 6, 2, DARKWOOD); post(p, 27, 43, 6, 2, DARKWOOD);
  };
  // 23: occupied bed
  O[23] = (p) => {
    O[9](p);
    box(p, 60, 53, 6.4, 2.6, 5, BLANKET);             // blanket
    p.poly([[36, 36], [44, 32], [50, 35], [42, 39]], '#f0c8a0'); p.outline([[36, 36], [44, 32], [50, 35], [42, 39]], '#3a2616');
    p.rect(40, 31, 6, 2, '#5a3a20');
  };
  // 29: table (4x3 -> 64x48)
  O[29] = (p) => {
    post(p, 12, 44, 14, 2, WOOD); post(p, 50, 44, 14, 2, WOOD); post(p, 30, 46, 14, 2, WOOD); post(p, 31, 30, 10, 2, WOOD);
    box(p, 31, 32, 5, 5, 3, WOOD);
  };
  O[28] = O[29];
  // 48: tiny table (2x2 -> 32x32)
  O[48] = (p) => { post(p, 6, 28, 10, 2, WOOD); post(p, 24, 28, 10, 2, WOOD); post(p, 15, 30, 10, 2, WOOD); box(p, 15, 20, 2.5, 2.5, 3, WOOD); };
  // 22: chair facing SE (2x4 -> 32x64): seat with back on the up-left side
  O[22] = (p) => { post(p, 8, 60, 10, 2, WOOD); post(p, 24, 60, 10, 2, WOOD); post(p, 16, 62, 10, 2, WOOD); box(p, 16, 52, 2.2, 2.2, 3, WOOD); post(p, 6, 50, 22, 2, WOOD); post(p, 12, 47, 22, 2, WOOD); p.poly([[6, 28], [14, 24], [14, 36], [6, 40]], WOOD.left); p.outline([[6, 28], [14, 24], [14, 36], [6, 40]], WOOD.line); };
  // 25: chair facing SW: back on the up-right side
  O[25] = (p) => { post(p, 8, 60, 10, 2, WOOD); post(p, 24, 60, 10, 2, WOOD); post(p, 16, 62, 10, 2, WOOD); box(p, 16, 52, 2.2, 2.2, 3, WOOD); post(p, 24, 50, 22, 2, WOOD); post(p, 18, 47, 22, 2, WOOD); p.poly([[18, 24], [26, 28], [26, 40], [18, 36]], WOOD.right); p.outline([[18, 24], [26, 28], [26, 40], [18, 36]], WOOD.line); };
  // wardrobes facing SW (front = left face)
  function wardrobe(p, bx, by, a, b, h, ornate) {
    const bb = box(p, bx, by, a, b, h, DARKWOOD);
    // door split and handles on the left face
    const midx = (bb.B[0] + bb.L[0]) / 2, midy = (bb.B[1] + bb.L[1]) / 2;
    p.line(midx, midy - 1, midx, midy - h + 1, DARKWOOD.line);
    p.rect(midx - 3, midy - h / 2, 1, 2, DARKWOOD.hi); p.rect(midx + 2, midy - h / 2, 1, 2, DARKWOOD.hi);
    if (ornate) { p.line(bb.L[0] + 2, bb.L[1] - h + 4, bb.B[0] - 2, bb.B[1] - h + 4, DARKWOOD.hi); p.line(bb.L[0] + 2, bb.L[1] - 4, bb.B[0] - 2, bb.B[1] - 4, DARKWOOD.hi); }
  }
  O[10] = (p) => wardrobe(p, 26, 62, 4, 2, 34, false);          // 3x4 -> 48x64
  O[24] = (p) => wardrobe(p, 26, 62, 4, 2, 36, true);
  O[32] = (p) => wardrobe(p, 26, 78, 4, 2, 52, false);          // 3x5 -> 48x80
  // drawers facing SW: 11 (2x3 -> 32x48), 49 tiny drawers SE (2x3), 50 tall drawers (2x4 -> 32x64)
  function drawers(p, bx, by, a, b, h, n, faceLeft) {
    const bb = box(p, bx, by, a, b, h, WOOD);
    for (let i = 1; i <= n; i++) {
      const yy = h * i / (n + 1);
      if (faceLeft) { p.line(bb.L[0] + 1, bb.L[1] - yy, bb.B[0] - 1, bb.B[1] - yy, WOOD.line); p.rect((bb.L[0] + bb.B[0]) / 2, (bb.L[1] + bb.B[1]) / 2 - yy - 2, 2, 1, WOOD.hi); }
      else { p.line(bb.B[0] + 1, bb.B[1] - yy, bb.R[0] - 1, bb.R[1] - yy, WOOD.line); p.rect((bb.R[0] + bb.B[0]) / 2, (bb.R[1] + bb.B[1]) / 2 - yy - 2, 2, 1, WOOD.hi); }
    }
  }
  O[11] = (p) => drawers(p, 18, 46, 3, 1.5, 24, 3, true);
  O[49] = (p) => drawers(p, 12, 46, 1.5, 3, 20, 2, false);
  O[50] = (p) => drawers(p, 18, 62, 3, 1.5, 40, 4, true);
  // cupboards: 26 facing SE (3x3 -> 48x48), 42 facing SW (2x3 -> 32x48)
  O[26] = (p) => { const bb = box(p, 14, 46, 2, 5, 26, DARKWOOD); const mx = (bb.B[0] + bb.R[0]) / 2, my = (bb.B[1] + bb.R[1]) / 2; p.line(mx, my - 1, mx, my - 25, DARKWOOD.line); p.rect(mx - 3, my - 14, 1, 2, DARKWOOD.hi); p.rect(mx + 2, my - 14, 1, 2, DARKWOOD.hi); };
  O[42] = (p) => { const bb = box(p, 20, 46, 3.5, 1.5, 26, DARKWOOD); const mx = (bb.B[0] + bb.L[0]) / 2, my = (bb.B[1] + bb.L[1]) / 2; p.line(mx, my - 1, mx, my - 25, DARKWOOD.line); p.rect(mx - 3, my - 14, 1, 2, DARKWOOD.hi); p.rect(mx + 2, my - 14, 1, 2, DARKWOOD.hi); };
  // benches: 13 small (2x3 -> 32x48), 45 short (5x3 -> 80x48), 43 mess bench (9x5 -> 144x80)
  O[13] = (p) => { post(p, 8, 44, 8, 2, WOOD); post(p, 22, 44, 8, 2, WOOD); post(p, 14, 46, 8, 2, WOOD); box(p, 14, 38, 2.4, 1.6, 3, WOOD); };
  O[45] = (p) => { post(p, 14, 44, 8, 2, WOOD); post(p, 66, 18, 8, 2, WOOD); post(p, 40, 32, 8, 2, WOOD); box(p, 16, 42, 1.6, 14, 3, WOOD); };
  O[43] = (p) => { for (let i = 0; i < 4; i++) post(p, 16 + i * 36, 74 - i * 18, 10, 2, WOOD); box(p, 16, 72, 2, 28, 4, WOOD); };
  // 44: mess table (10x6 -> 160x96)
  O[44] = (p) => { for (let i = 0; i < 4; i++) { post(p, 16 + i * 36, 80 - i * 18, 18, 2, WOOD); post(p, 30 + i * 36, 90 - i * 18, 18, 2, WOOD); } box(p, 30, 88, 4, 28, 4, WOOD); };
  // 51: desk facing SW (6x4 -> 96x64)
  O[51] = (p) => { drawers(p, 26, 60, 3, 1.5, 24, 2, true); post(p, 86, 48, 20, 2, WOOD); post(p, 80, 44, 16, 2, WOOD); box(p, 28, 36, 4.5, 11, 3, WOOD); };
  // 8: wide window facing SE (5x6 -> 80x96): parallelogram on the back-left wall, edges slope up-right
  O[8] = (p) => {
    const frame = [[6, 74], [70, 42], [70, 10], [6, 42]];
    p.poly(frame, '#1b2b4a'); p.outline(frame, WOOD.line);
    const inner = [[10, 71], [66, 43], [66, 15], [10, 43]];
    p.poly(inner, '#243a62');
    // panes: two columns, three rows, with light reflections
    for (let i = 1; i < 3; i++) { const x = 10 + 56 * i / 3; p.line(x, 71 - 28 * i / 3, x, 43 - 28 * i / 3, WOOD.top); }
    for (let j = 1; j < 3; j++) { const y = 28 * j / 3; p.line(10, 71 - y, 66, 43 - y, WOOD.top); }
    p.line(14, 60, 30, 52, '#8aa6d8'); p.line(16, 64, 24, 60, '#8aa6d8');
    p.outline(frame, WOOD.line); p.line(6, 42, 70, 10, WOOD.hi);
  };
  // 35: small barred window facing SE (3x5 -> 48x80)
  O[35] = (p) => {
    const frame = [[6, 58], [42, 40], [42, 12], [6, 30]];
    p.poly(frame, '#1b2b4a'); p.outline(frame, WOOD.line);
    for (let i = 1; i < 4; i++) { const x = 6 + 36 * i / 4; p.rect(x, 30 - 18 * i / 4 + 2, 2, 27, METAL.top); p.rect(x + 1, 30 - 18 * i / 4 + 2, 1, 27, METAL.left); }
    p.line(6, 30, 42, 12, WOOD.hi);
  };
  // 37: noticeboard facing SE (4x4 -> 64x64)
  O[37] = (p) => { const f = [[8, 50], [54, 27], [54, 5], [8, 28]]; p.poly(f, '#8a6a3a'); p.outline(f, WOOD.line); p.poly([[14, 44], [30, 36], [30, 20], [14, 28]], '#f2ecd8'); p.poly([[34, 34], [48, 27], [48, 13], [34, 20]], '#e8e0c8'); p.set(20, 31, '#d02020'); p.set(40, 22, '#2050d0'); };
  // 33: small shelf facing SE (2x2 -> 32x32), 53: key rack (2x2)
  O[33] = (p) => { box(p, 6, 24, 1, 5, 2, WOOD); box(p, 6, 14, 1, 5, 2, WOOD); p.rect(10, 8, 3, 2, '#c04040'); p.rect(16, 6, 3, 2, '#4080c0'); };
  O[53] = (p) => { const f = [[6, 26], [26, 16], [26, 6], [6, 16]]; p.poly(f, '#8a6a3a'); p.outline(f, WOOD.line); for (let i = 0; i < 3; i++) { const x = 10 + i * 6, y = 20 - i * 3; p.rect(x, y, 1, 4, METAL.top); p.rect(x - 1, y + 3, 3, 2, '#e0c040'); } };
  // 34: small crate (2x2)
  O[34] = (p) => { box(p, 16, 28, 2.5, 2.5, 12, WOOD); p.line(8, 22, 14, 25, WOOD.line); p.line(16, 25, 22, 22, WOOD.line); };
  // 30: stove pipe (3x4 -> 48x64): vertical pipe with an elbow into the wall
  O[30] = (p) => { p.rect(22, 20, 8, 44, METAL.right); p.rect(22, 20, 2, 44, METAL.hi); p.rect(28, 20, 2, 44, METAL.left); p.outline([[21, 19], [30, 19], [30, 64], [21, 64]], METAL.line); p.poly([[21, 20], [30, 20], [40, 12], [31, 10]], METAL.top); p.outline([[21, 20], [30, 20], [40, 12], [31, 10]], METAL.line); p.rect(24, 30, 6, 1, METAL.line); p.rect(24, 44, 6, 1, METAL.line); };
  // 52: sink facing SE (3x3 -> 48x48)
  O[52] = (p) => { const bb = box(p, 12, 44, 2, 5, 16, CLOTH); box(p, 14, 29, 1.6, 4.6, 3, { top: '#dfe8f0', left: '#8a98a8', right: '#b0bcc8', line: '#3a4048', hi: '#ffffff' }); p.rect(30, 10, 2, 14, METAL.top); p.rect(28, 10, 6, 2, METAL.top); };
  // 31: papers on floor (1x1 -> 16x16)
  O[31] = (p) => { p.poly([[2, 10], [10, 6], [14, 9], [6, 13]], '#f2ecd8'); p.outline([[2, 10], [10, 6], [14, 9], [6, 13]], '#4a4030'); p.line(5, 9, 10, 7, '#9a9480'); };
  // door frames (4x6 -> 64x96): posts and a lintel. SE/NE lintels slope up-right, SW/NW slope down-right.
  function doorframe(p, upRight, open) {
    const x0 = 8, x1 = 56;
    const yb0 = upRight ? 92 : 68, yb1 = upRight ? 68 : 92;
    post(p, x0, yb0, 62, 4, WOOD); post(p, x1 - 4, yb1, 62, 4, WOOD);
    const top0 = yb0 - 62, top1 = yb1 - 62;
    p.poly([[x0, top0], [x1, top1], [x1, top1 + 5], [x0, top0 + 5]], WOOD.right);
    p.outline([[x0, top0], [x1, top1], [x1, top1 + 5], [x0, top0 + 5]], WOOD.line);
    p.line(x0, top0 - 1, x1, top1 - 1, WOOD.hi);
  }
  O[15] = (p) => doorframe(p, true);
  O[40] = (p) => doorframe(p, true);
  O[16] = (p) => doorframe(p, false);
  O[38] = (p) => doorframe(p, false);
  O[39] = (p) => doorframe(p, false);
  // 36: tiny door frame NE (4x3 -> 64x48)
  O[36] = (p) => { post(p, 10, 46, 30, 4, WOOD); post(p, 50, 34, 30, 4, WOOD); p.poly([[10, 16], [54, 4], [54, 8], [10, 20]], WOOD.right); p.outline([[10, 16], [54, 4], [54, 8], [10, 20]], WOOD.line); };
  // 5 / 19: seated prisoner (2x3 -> 32x48)
  function seated(p) {
    p.rect(10, 30, 14, 12, '#7a6c48'); p.rect(10, 30, 14, 1, '#b8a67a');
    p.poly([[8, 22], [26, 22], [25, 32], [9, 32]], '#b8a67a'); p.outline([[8, 22], [26, 22], [25, 32], [9, 32]], '#1a1410');
    p.rect(12, 10, 10, 11, '#f0c8a0'); p.outline([[12, 10], [21, 10], [21, 20], [12, 20]], '#1a1410');
    p.rect(12, 8, 10, 4, '#6b4a2e'); p.set(14, 14, '#30241c'); p.set(19, 14, '#30241c');
    p.rect(9, 42, 5, 4, '#2a2018'); p.rect(20, 42, 5, 4, '#2a2018');
  }
  O[5] = seated; O[19] = seated;

  const cache = new Map();
  function image(objIndex, w, h, scale) {
    const draw = O[objIndex];
    if (!draw) return null;
    const key = objIndex * 8 + scale;
    let cv = cache.get(key);
    if (cv) return cv;
    const p = new Pix(w * 16, h * 16);
    draw(p);
    cv = document.createElement('canvas'); cv.width = p.w * scale; cv.height = p.h * scale;
    const c = cv.getContext('2d');
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const col = p.d[y * p.w + x]; if (col) { c.fillStyle = col; c.fillRect(x * scale, y * scale, scale, scale); } }
    cache.set(key, cv);
    return cv;
  }
  const has = (objIndex) => !!O[objIndex];
  return { image, has };
})();
