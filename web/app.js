// The Great Escape HD - application: main loop, HUD, menus, controls.
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const D = decodeData(TGE_RAWDATA);
  HD.init(D);
  const host = Host.create(D);
  const S = HD.SCALE;

  /* ---- Layout ---- */
  const CW = 1000, CH = 600;
  const WX = 132, WY = 20, WW = HD.WIN_W * S, WH = HD.WIN_H * S; // 736 x 512
  const canvas = $('game');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const classicCanvas = $('classic');
  classicCanvas.width = 256 * 3; classicCanvas.height = 192 * 3;
  const cctx = classicCanvas.getContext('2d');
  cctx.imageSmoothingEnabled = false;
  const classicImg = cctx.createImageData(256, 192);
  const classicTmp = document.createElement('canvas'); classicTmp.width = 256; classicTmp.height = 192;
  const classicTmpCtx = classicTmp.getContext('2d');

  /* ---- Settings ---- */
  const settings = {
    smooth: true, classic: false, minimap: false, speed: 1, sound: true, music: true, crt: false, hints: true,
    keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Space', pickup: 'KeyE', drop: 'KeyQ', useA: 'KeyZ', useB: 'KeyX' },
  };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('tge-hd-settings') || '{}')); } catch (e) {}
  if (!settings.keys) settings.keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Space', pickup: 'KeyE', drop: 'KeyQ', useA: 'KeyZ', useB: 'KeyX' };
  function saveSettings() { try { localStorage.setItem('tge-hd-settings', JSON.stringify(settings)); } catch (e) {} }
  const ALT_KEYS = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', Enter: 'fire', Digit1: 'useA', Digit2: 'useB' };

  /* ---- Game font (3x) for the HUD ---- */
  const glyphCache = new Map();
  function glyph(ch, color, scale) {
    const key = ch + color + scale;
    let cv = glyphCache.get(key);
    if (cv) return cv;
    const gi = D.ascii_to_font[ch.charCodeAt(0)] * 8;
    cv = document.createElement('canvas'); cv.width = 8 * scale; cv.height = 8 * scale;
    const c = cv.getContext('2d'); c.fillStyle = color;
    for (let r = 0; r < 8; r++) for (let x = 0; x < 8; x++) if ((D.font[gi + r] >> (7 - x)) & 1) c.fillRect(x * scale, r * scale, scale, scale);
    glyphCache.set(key, cv);
    return cv;
  }
  function drawText(c, str, x, y, color, scale) {
    for (let i = 0; i < str.length; i++) { c.drawImage(glyph(str[i], color, scale), x, y); x += 8 * scale; }
  }
  const FONT_REV = (function () { const m = {}; for (let ch = 32; ch < 128; ch++) { const g = D.ascii_to_font[ch]; if (!(g in m) || ch === 79) m[g] = String.fromCharCode(ch); } m[0] = '0'; m[35] = ' '; m[36] = '.'; return m; })();
  function decodeMessageRow(state) {
    // the message line is screen character row 23 (offset 0x10E0)
    let s = '';
    for (let col = 0; col < 32; col++) {
      let found = ' ';
      for (let g = 0; g < 38; g++) {
        let ok = true;
        for (let r = 0; r < 8; r++) if (state.screen[0x10E0 + col + 256 * r] !== D.font[g * 8 + r]) { ok = false; break; }
        if (ok) { found = FONT_REV[g] || '?'; break; }
      }
      s += found;
    }
    return s.replace(/\s+$/, '');
  }

  /* ---- Run state ---- */
  let state = null;
  let mode = 'title'; // title | playing | paused | confirm | anykey | zoombox | menu
  let acc = 0, lastT = 0;
  let scene = null, sceneTickId = 0;
  let prevView = null, curView = null, curSprites = [], prevSprites = new Map();
  let tickCount = 0, lastTickTime = 0;
  let zoom = null; // zoombox animation
  let waitReq = null;
  let lastMessage = '', messageSeen = '';
  let dayPhase = 0;

  function moodFor(state) {
    const attr = state.game_window_attribute;
    if (state.room_index >= 29) return attr === 2 ? HD.MOODS.torch : HD.MOODS.torch; // tunnels: engine blanks tiles without torch
    if (state.day_or_night) return state.room_index === 0 ? HD.MOODS.night : HD.MOODS.nightroom;
    return HD.MOODS.day;
  }
  function viewOf(state) {
    return { x: state.map_position.x * 8 + (state.game_window_offset.y ? 4 : 8), y: state.map_position.y * 8 + state.game_window_offset.x / 24, room: state.room_index };
  }

  function litCells(state) {
    if (!state.day_or_night || state.room_index !== 0) return null;
    const lit = HD.sceneLit; lit.fill(0);
    let any = false;
    const vo = state.game_window_offset.x / 24, ho = state.game_window_offset.y ? 4 : 8;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 23; c++) {
      if (state.attrs[(2 + r) * 32 + 7 + c] === 6) { // YELLOW
        // window cell -> scene cell (scene has 1-cell margin; window starts at buffer pixel ho, vo)
        const bx = Math.floor((ho + c * 8) / 8) + 1, by = Math.floor((vo + r * 8) / 8) + 1;
        if (bx >= 0 && bx < HD.BUF_COLS && by >= 0 && by < HD.BUF_ROWS) { lit[by * HD.BUF_COLS + bx] = 1; any = true; }
      }
    }
    return any ? lit : null;
  }
  function glowList(state) {
    if (!state.day_or_night || state.room_index !== 0) return null;
    const list = [];
    const add = (xy) => list.push({ ax: (xy.x + 8) * 8 + 4, ay: (xy.y + 8) * 8 + 4 });
    if (state.searchlight_state === 0xFF) for (const sl of state.searchlight.states) add(sl.xy);
    else add(state.searchlight.caught_coord);
    return list;
  }

  function captureTick() {
    const lit = litCells(state);
    const mood = moodFor(state);
    scene = HD.buildScene(state, mood);
    HD.renderScene(mood, lit);
    prevView = curView; curView = viewOf(state);
    prevSprites = new Map();
    for (const s of curSprites) if (s.kind === 'vischar') prevSprites.set(s.index, s);
    curSprites = host.spriteRecords.map(r => {
      const image = r.kind === 'vischar' ? HD.getSprite(r.spriteBase, r.frame, r.flip) : HD.getItem(r.item, r.poisoned);
      return Object.assign({ image }, r);
    });
    curView.glow = glowList(state);
    lastTickTime = performance.now();
    sceneTickId++;
    const msg = decodeMessageRow(state);
    if (msg && msg !== messageSeen) { messageSeen = msg; if (!lastMessage || !msg.startsWith(lastMessage) || msg.length < lastMessage.length) {} }
    if (msg.length && (host.msgLog.length === 0 || host.msgLog[host.msgLog.length - 1] !== msg)) {
      // record complete messages only (when the engine has finished writing the row we see the full text)
      if (!msg.startsWith(host.msgLog[host.msgLog.length - 1] || '\u0000')) host.msgLog.push(msg);
      else host.msgLog[host.msgLog.length - 1] = msg;
      if (host.msgLog.length > 8) host.msgLog.shift();
    }
  }

  function handleRequests(reqs) {
    for (const r of reqs) {
      if (r.type === 'zoombox') {
        // capture the scene of the new room for the animation
        captureTick();
        zoom = { steps: r.steps, i: 0, t: 0, total: r.steps.reduce((a, s) => a + s.delay, 0) / 3500000 };
        mode = 'zoombox';
        prevView = null; prevSprites = new Map();
        return reqs.slice(reqs.indexOf(r) + 1);
      } else if (r.type === 'confirm' || r.type === 'anykey') {
        waitReq = r; mode = r.type; captureTick();
        $('prompt').style.display = 'flex';
        $('prompt-text').textContent = r.type === 'confirm' ? 'Restart the game?' : 'Press any key to continue';
        $('prompt-buttons').style.display = r.type === 'confirm' ? 'block' : 'none';
        $('prompt').classList.toggle('bottom', r.type === 'anykey');
        return [];
      }
    }
    return [];
  }

  let pendingAfterZoom = [];
  function runTick() {
    const reqs = host.tick();
    tickCount++;
    captureTick();
    pendingAfterZoom = handleRequests(reqs);
  }

  function answerPrompt(value) {
    if (!waitReq) return;
    const req = waitReq; waitReq = null;
    $('prompt').style.display = 'none';
    mode = 'playing';
    const reqs = host.resume(req, value);
    captureTick();
    pendingAfterZoom = handleRequests(reqs);
  }

  /* ---- Main loop ---- */
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    pollGamepad();
    if (mode === 'playing') {
      acc += dt * settings.speed;
      const tickT = Host.TICK_T;
      let n = 0;
      while (acc >= tickT && n < 4 && mode === 'playing') { acc -= tickT; runTick(); n++; }
      if (n >= 4) acc = 0;
    } else if (mode === 'zoombox') {
      zoom.t += dt;
      if (zoom.t >= zoom.total) {
        zoom = null; mode = 'playing'; acc = 0;
        if (pendingAfterZoom.length) { const rest = handleRequests(pendingAfterZoom); pendingAfterZoom = rest; }
      }
    } else if (mode === 'title') {
      titleFrame(dt);
    }
    render();
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function render() {
    if (!state) return;
    ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, CW, CH);
    if (mode === 'title') { renderTitle(); return; }
    // interpolation factor
    let f = 1;
    if (settings.smooth && mode === 'playing' && prevView && prevView.room === curView.room && !zoom) {
      f = Math.min(1, (performance.now() - lastTickTime) / (1000 * Host.TICK_T / settings.speed));
    }
    let vx = curView.x, vy = curView.y;
    if (f < 1 && Math.abs(prevView.x - curView.x) <= 16 && Math.abs(prevView.y - curView.y) <= 16) { vx = lerp(prevView.x, curView.x, f); vy = lerp(prevView.y, curView.y, f); }
    const sprites = curSprites.map(s => {
      if (f < 1 && s.kind === 'vischar') {
        const p = prevSprites.get(s.index);
        if (p && p.character === s.character && Math.abs(p.x - s.x) <= 16 && Math.abs(p.y - s.y) <= 16) {
          return Object.assign({}, s, { x: lerp(p.x, s.x, f), y: lerp(p.y, s.y, f) });
        }
      }
      return s;
    });
    const glow = curView.glow ? curView.glow.map(g => ({ x: (g.ax - vx) * S, y: (g.ay - vy) * S, r: 5.5 * 8 * S })) : null;
    ctx.save();
    ctx.translate(WX, WY);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, WW, WH);
    if (mode === 'anykey' || mode === 'confirm') {
      // the engine has wiped the window for a text screen: show black plus the decoded text
    } else if (mode === 'zoombox' && zoom) {
      // growing box reveal
      let tt = zoom.t, i = 0, acc2 = 0;
      for (; i < zoom.steps.length; i++) { acc2 += zoom.steps[i].delay / 3500000; if (acc2 > tt) break; }
      const st = zoom.steps[Math.min(i, zoom.steps.length - 1)];
      ctx.save();
      ctx.beginPath(); ctx.rect(st.x * 8 * S, st.y * 8 * S, st.width * 8 * S, st.height * 8 * S); ctx.clip();
      HD.composeFrame(ctx, scene, vx, vy, sprites, glow);
      ctx.restore();
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3;
      ctx.strokeRect(st.x * 8 * S - 2, st.y * 8 * S - 2, st.width * 8 * S + 4, st.height * 8 * S + 4);
    } else {
      HD.composeFrame(ctx, scene, vx, vy, sprites, glow);
    }
    if (mode === 'anykey' || mode === 'confirm') drawWindowText();
    if (settings.crt) drawScanlines(ctx, WW, WH);
    ctx.restore();
    drawHUD();
    if (settings.minimap) drawMinimap();
    if (settings.classic) renderClassic();
  }

  // Decode any text the engine wrote into the game window (end-of-game and confirm screens) and draw it in HD.
  function drawWindowText() {
    for (let r = 2; r <= 17; r++) for (let c = 7; c <= 29; c++) {
      const addr = ((r & 0x18) << 8) | ((r & 7) << 5) | c;
      let match = -1;
      for (let g = 0; g < 38; g++) {
        let ok = true;
        for (let k = 0; k < 8; k++) if (state.screen[addr + 256 * k] !== D.font[g * 8 + k]) { ok = false; break; }
        if (ok) { match = g; break; }
      }
      if (match <= 0 && match !== 0) continue;
      if (match === 35) continue; // space
      const ch = FONT_REV[match] || '?';
      drawText(ctx, ch, (c - 7) * 32, (r - 2) * 32, '#ffe8a0', 4);
    }
  }
  function drawScanlines(c, w, h) {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
  }

  /* ---- HUD ---- */
  const flagCache = {};
  function flagImage(up, red) {
    const key = (up ? 'u' : 'd') + (red ? 'r' : 'g');
    if (flagCache[key]) return flagCache[key];
    const bm = up ? D.flag_up : D.flag_down;
    const cv = document.createElement('canvas'); cv.width = 24 * 3; cv.height = 25 * 3;
    const c = cv.getContext('2d');
    const col = red ? '#ff4040' : '#5ce05c', dark = red ? '#8a1c1c' : '#1f6e2a';
    for (let r = 0; r < 25; r++) for (let b = 0; b < 3; b++) for (let x = 0; x < 8; x++) {
      if ((bm[r * 3 + b] >> (7 - x)) & 1) { c.fillStyle = ((r + b * 8 + x) % 7 === 0) ? dark : col; c.fillRect((b * 8 + x) * 3, r * 3, 3, 3); }
    }
    flagCache[key] = cv; return cv;
  }
  function timeString(clock) {
    const mins = Math.round(6 * 60 + clock * (24 * 60 / 140));
    const h = Math.floor(mins / 60) % 24, m = mins % 60;
    return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function drawHUD() {
    const panel = '#1b1e26', edge = '#3a3f4e';
    // frame around window
    ctx.strokeStyle = edge; ctx.lineWidth = 4; ctx.strokeRect(WX - 2, WY - 2, WW + 4, WH + 4);
    // left: flag pole
    ctx.fillStyle = panel; roundRect(ctx, 10, 20, 112, 512, 10); ctx.fill();
    const poleX = 30, poleTop = 40, poleH = 440;
    ctx.fillStyle = '#9a8a6a'; ctx.fillRect(poleX, poleTop, 6, poleH);
    ctx.fillStyle = '#d8c070'; ctx.beginPath(); ctx.arc(poleX + 3, poleTop - 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a7a3a'; ctx.fillRect(14, poleTop + poleH, 104, 14);
    const morale = state.displayed_morale;
    const fy = poleTop + (112 - morale) * (poleH - 75) / 112;
    const up = (state.game_counter & 2) !== 0;
    ctx.drawImage(flagImage(up, state.red_flag !== 0), poleX + 6, fy);
    drawText(ctx, 'MORALE', 18, 500, '#c8c0a8', 2);
    drawText(ctx, String(state.morale).padStart(3, ' '), 36, 520, state.morale < 30 ? '#ff6060' : '#e8e0c0', 2);
    // right panel: score, items, bell, clock
    ctx.fillStyle = panel; roundRect(ctx, 878, 20, 112, 512, 10); ctx.fill();
    drawText(ctx, 'SCORE', 894, 34, '#c8c0a8', 2);
    drawText(ctx, state.score_digits.join(''), 894, 56, '#ffd95a', 2);
    drawText(ctx, 'DAY ' + host.day, 894, 90, '#c8c0a8', 2);
    drawText(ctx, timeString(state.clock), 894, 112, state.day_or_night ? '#8aa0ff' : '#e8e0c0', 2);
    // sun / moon
    ctx.fillStyle = state.day_or_night ? '#c8d0ff' : '#ffd95a'; ctx.beginPath(); ctx.arc(934, 160, 12, 0, Math.PI * 2); ctx.fill();
    if (state.day_or_night) { ctx.fillStyle = panel; ctx.beginPath(); ctx.arc(940, 156, 10, 0, Math.PI * 2); ctx.fill(); }
    // items
    drawText(ctx, 'ITEMS', 894, 190, '#c8c0a8', 2);
    for (let i = 0; i < 2; i++) {
      const y = 212 + i * 84;
      ctx.fillStyle = '#0d0f14'; roundRect(ctx, 896, y, 76, 76, 6); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();
      const item = state.items_held[i];
      if (item !== 255) {
        const poisoned = item === item_FOOD && (state.item_structs[item_FOOD].item_and_flags & 0x20) !== 0;
        ctx.drawImage(HD.getItem(item, poisoned), 902, y + 6);
      }
      drawText(ctx, i === 0 ? '1' : '2', 900, y + 60, '#6a7080', 1);
    }
    // bell
    const ringing = state.screen[0x118E] === 0x3F;
    const bx = 934, by = 420;
    ctx.save(); ctx.translate(bx, by); if (ringing) ctx.rotate(((state.game_counter & 1) ? 0.25 : -0.25));
    ctx.fillStyle = ringing ? '#ffd040' : '#a89048';
    ctx.beginPath(); ctx.moveTo(-14, 14); ctx.quadraticCurveTo(-14, -16, 0, -18); ctx.quadraticCurveTo(14, -16, 14, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a4a20'; ctx.fillRect(-18, 14, 36, 4); ctx.beginPath(); ctx.arc(0, 20, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawText(ctx, ringing ? 'ALARM' : 'QUIET', 894, 450, ringing ? '#ff6060' : '#6a7080', 2);
    if (state.in_solitary) drawText(ctx, 'SOLITARY', 884, 490, '#ff8080', 1);
    else if (state.automatic_player_counter === 0) drawText(ctx, 'AUTO', 894, 490, '#80c0ff', 2);
    // bottom: message line
    ctx.fillStyle = panel; roundRect(ctx, 10, 540, 980, 50, 10); ctx.fill();
    const msg = decodeMessageRow(state);
    drawText(ctx, msg, 30, 554, '#ffe8a0', 3);
    if (settings.hints && !msg && mode === 'playing') {
      const hint = state.room_index >= 29 ? 'TUNNEL: CRAWL WITH THE DIRECTION KEYS' :
        (state.hero_in_bed ? 'PRESS A DIRECTION TO GET UP' : 'E PICK UP   Q DROP   Z USE 1   X USE 2');
      drawText(ctx, hint, 30, 560, '#5a6070', 2);
    }
  }

  /* ---- Minimap ---- */
  let minimapCanvas = null;
  function buildMinimap() {
    const cv = document.createElement('canvas'); cv.width = 54 * 4; cv.height = 34 * 4;
    const c = cv.getContext('2d');
    const img = c.createImageData(cv.width, cv.height);
    const px = img.data;
    const colours = { GRASS: [60, 110, 50], ROOF: [120, 110, 90], HUTWALL: [140, 100, 60], BUILDING: [150, 150, 160], ROAD: [110, 110, 110], FENCE: [190, 200, 210], TOWER: [200, 150, 90], GATE: [200, 150, 90], VOID: [10, 10, 14] };
    for (let sy = 0; sy < 34; sy++) for (let sx = 0; sx < 54; sx++) {
      const st = D.map[sy * 54 + sx];
      const base = st <= 44 ? 0 : (st <= 138 || st >= 204) ? 145 : 365;
      for (let t = 0; t < 16; t++) {
        const tile = D.supertiles[st * 16 + t];
        let ink = 0; for (let r = 0; r < 8; r++) { let b = D.exterior_tiles[(base + tile) * 8 + r]; while (b) { ink += b & 1; b >>= 1; } }
        const name = Object.keys(HD.CLASS_ID).find(k => HD.CLASS_ID[k] === HD_ST_CLASS(st));
        const col = colours[name] || [80, 80, 80];
        const f = 0.6 + ink / 64 * 0.8;
        const x = sx * 4 + (t & 3), y = sy * 4 + (t >> 2);
        const o = (y * cv.width + x) * 4;
        px[o] = Math.min(255, col[0] * f); px[o + 1] = Math.min(255, col[1] * f); px[o + 2] = Math.min(255, col[2] * f); px[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    minimapCanvas = cv;
  }
  function HD_ST_CLASS(st) { return HD.stClass(st); }
  function drawMinimap() {
    if (!minimapCanvas) buildMinimap();
    const x = WX + 8, y = WY + 8, scale = 1;
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, minimapCanvas.width + 4, minimapCanvas.height + 4);
    ctx.drawImage(minimapCanvas, x, y);
    if (state.room_index === 0) {
      const hx = (state.vischars[0].isopos.x >> 3), hy = (state.vischars[0].isopos.y >> 3) - 4;
      ctx.fillStyle = '#ff4040'; ctx.fillRect(x + hx - 2, y + hy - 2, 5, 5);
      ctx.strokeStyle = '#ffffff'; ctx.strokeRect(x + state.map_position.x + 1, y + state.map_position.y - 4, 23, 16);
    } else { drawText(ctx, 'ROOM ' + state.room_index, x + 4, y + minimapCanvas.height - 12, '#fff', 1); }
    ctx.restore();
  }

  /* ---- Classic (Spectrum) view ---- */
  const ZXPAL = [[0, 0, 0], [0, 0, 205], [205, 0, 0], [205, 0, 205], [0, 205, 0], [0, 205, 205], [205, 205, 0], [205, 205, 205],
    [0, 0, 0], [0, 0, 255], [255, 0, 0], [255, 0, 255], [0, 255, 0], [0, 255, 255], [255, 255, 0], [255, 255, 255]];
  function renderClassic() {
    const px = classicImg.data, scr = state.screen, at = state.attrs;
    for (let y = 0; y < 192; y++) {
      const addr = ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2);
      for (let col = 0; col < 32; col++) {
        const b = scr[addr + col], a = at[(y >> 3) * 32 + col];
        const bright = (a & 64) ? 8 : 0;
        const ink = ZXPAL[(a & 7) + bright], paper = ZXPAL[((a >> 3) & 7) + bright];
        for (let x = 0; x < 8; x++) {
          const on = (b >> (7 - x)) & 1; const c = on ? ink : paper;
          const o = (y * 256 + col * 8 + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
        }
      }
    }
    classicTmpCtx.putImageData(classicImg, 0, 0);
    cctx.drawImage(classicTmp, 0, 0, 256 * 3, 192 * 3);
  }

  /* ---- Title screen ---- */
  let titlePan = 0;
  function titleFrame(dt) { titlePan += dt * 6; }
  function renderTitle() {
    // backdrop: slowly panning camp view
    const px = 70 + Math.sin(titlePan / 40) * 30, py = 44 + Math.cos(titlePan / 55) * 10;
    state.room_index = 0; state.map_position.x = Math.round(px); state.map_position.y = Math.round(py);
    state.game_window_offset.x = 0; state.game_window_offset.y = 0;
    get_supertiles(state); plot_all_tiles(state);
    scene = HD.buildScene(state, HD.MOODS.day); HD.renderScene(HD.MOODS.day, null);
    const v = viewOf(state);
    ctx.save(); ctx.translate(WX, WY);
    HD.composeFrame(ctx, scene, v.x, v.y, [], null);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, WW, WH);
    ctx.restore();
    ctx.strokeStyle = '#3a3f4e'; ctx.lineWidth = 4; ctx.strokeRect(WX - 2, WY - 2, WW + 4, WH + 4);
  }

  /* ---- Input ---- */
  const actionKeys = () => { const m = {}; for (const a in settings.keys) m[settings.keys[a]] = a; return m; };
  let keymap = actionKeys();
  let remapping = null;
  window.addEventListener('keydown', (e) => {
    if (remapping) { settings.keys[remapping] = e.code; remapping = null; keymap = actionKeys(); saveSettings(); refreshKeyTable(); e.preventDefault(); return; }
    if (e.target && e.target.tagName === 'INPUT') return;
    if (mode === 'confirm') { if (e.code === 'KeyY') answerPrompt(true); else if (e.code === 'KeyN' || e.code === 'Escape') answerPrompt(false); e.preventDefault(); return; }
    if (mode === 'anykey') { answerPrompt(undefined); e.preventDefault(); return; }
    if (e.code === 'Escape') { if (mode === 'playing') openMenu(); else if (mode === 'paused') closeMenu(); e.preventDefault(); return; }
    if (mode === 'title') { if (e.code === 'Enter' || e.code === 'Space') startGame(); return; }
    const a = keymap[e.code] || ALT_KEYS[e.code];
    if (a) { host.actions[a] = true; e.preventDefault(); return; }
    if (e.code === 'KeyP') { if (mode === 'playing') openMenu(); else if (mode === 'paused') closeMenu(); }
    if (e.code === 'KeyC') { settings.classic = !settings.classic; applySettings(); }
    if (e.code === 'KeyM') { settings.minimap = !settings.minimap; applySettings(); }
    if (e.code === 'F5') { quickSave(); e.preventDefault(); }
    if (e.code === 'F9') { quickLoad(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const a = keymap[e.code] || ALT_KEYS[e.code];
    if (a) { host.actions[a] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', () => { for (const k in host.actions) host.actions[k] = false; });

  function pollGamepad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps && gps[0];
    if (!gp) return;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const dead = 0.4;
    const up = b(12) || ay < -dead, down = b(13) || ay > dead, left = b(14) || ax < -dead, right = b(15) || ax > dead;
    // isometric mapping: stick up-left -> TL(up), up-right -> TR(right), down-right -> BR(down), down-left -> BL(left)
    const g = host.gamepadActions || (host.gamepadActions = {});
    const set = (k, v) => { if (g[k] !== v) { g[k] = v; host.actions[k] = v; } };
    if ((up && left) || (up && !right && !down && !left)) { set('up', true); set('right', false); set('down', false); set('left', false); }
    else if (up && right) { set('right', true); set('up', false); set('down', false); set('left', false); }
    else if (down && right) { set('down', true); set('up', false); set('right', false); set('left', false); }
    else if (down && left) { set('left', true); set('up', false); set('right', false); set('down', false); }
    else if (right) { set('right', true); set('up', false); set('down', false); set('left', false); }
    else if (down) { set('down', true); set('up', false); set('right', false); set('left', false); }
    else if (left) { set('left', true); set('up', false); set('right', false); set('down', false); }
    else { set('up', false); set('down', false); set('left', false); set('right', false); }
    set('fire', !!b(0)); set('pickup', !!b(2)); set('drop', !!b(1)); set('useA', !!b(3)); set('useB', !!b(5));
    if (b(9) && mode === 'playing' && !host._startHeld) openMenu();
    host._startHeld = !!b(9);
    if (mode === 'title' && (b(0) || b(9))) startGame();
    if (mode === 'anykey' && b(0)) answerPrompt(undefined);
  }

  // touch controls
  function bindTouch(id, action) {
    const el = $(id); if (!el) return;
    const on = (e) => { e.preventDefault(); host.actions[action] = true; el.classList.add('on'); if (mode === 'anykey') answerPrompt(undefined); };
    const off = (e) => { e.preventDefault(); host.actions[action] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  }
  ['up', 'down', 'left', 'right', 'fire', 'pickup', 'drop', 'useA', 'useB'].forEach(a => bindTouch('t-' + a, a));

  /* ---- Menus ---- */
  function openMenu() { if (mode !== 'playing') return; mode = 'paused'; $('menu').style.display = 'flex'; for (const k in host.actions) host.actions[k] = false; }
  function closeMenu() { if (mode !== 'paused') return; mode = 'playing'; $('menu').style.display = 'none'; lastTickTime = performance.now(); acc = 0; }
  function startGame() {
    host.stopMusic();
    host.ensureAudio();
    state = host.startGame();
    mode = 'playing';
    $('title').style.display = 'none';
    prevView = null; curSprites = []; prevSprites = new Map();
    captureTick();
    pendingAfterZoom = handleRequests(state.pending.splice(0, state.pending.length));
    acc = 0;
  }
  function restartGame() {
    // emulate BREAK (CAPS SHIFT + SPACE) for one iteration: the engine asks for confirmation.
    closeMenu();
    host.setKey('SHIFT', true); host.setKey('SPACE', true);
    runTick();
    host.setKey('SHIFT', false); host.setKey('SPACE', false);
  }
  function applySettings() {
    host.soundOn = settings.sound; host.musicOn = settings.music;
    classicCanvas.style.display = settings.classic ? 'block' : 'none';
    document.body.classList.toggle('crt', settings.crt);
    $('opt-smooth').checked = settings.smooth; $('opt-classic').checked = settings.classic; $('opt-minimap').checked = settings.minimap;
    $('opt-sound').checked = settings.sound; $('opt-music').checked = settings.music; $('opt-crt').checked = settings.crt; $('opt-hints').checked = settings.hints;
    $('opt-speed').value = String(settings.speed);
    if (mode === 'title') { if (settings.music) host.startMusic(); else host.stopMusic(); }
    saveSettings();
  }
  const KEY_LABELS = { up: 'Up (walk top-left)', down: 'Down (walk bottom-right)', left: 'Left (walk bottom-left)', right: 'Right (walk top-right)', fire: 'Fire (hold + direction)', pickup: 'Pick up', drop: 'Drop', useA: 'Use item 1', useB: 'Use item 2' };
  function refreshKeyTable() {
    const t = $('keytable'); t.innerHTML = '';
    for (const a in KEY_LABELS) {
      const row = document.createElement('div'); row.className = 'keyrow';
      const l = document.createElement('span'); l.textContent = KEY_LABELS[a];
      const b = document.createElement('button'); b.textContent = remapping === a ? 'press a key...' : settings.keys[a].replace('Key', '').replace('Arrow', '').replace('Digit', '');
      b.onclick = () => { remapping = a; refreshKeyTable(); };
      row.appendChild(l); row.appendChild(b); t.appendChild(row);
    }
  }
  function quickSave() { saveSlot(0); }
  function quickLoad() { loadSlot(0); }
  function saveSlot(n) {
    if (!host.started || mode === 'title') return;
    try { localStorage.setItem('tge-hd-save-' + n, JSON.stringify(host.serialize())); toast('Saved to slot ' + (n + 1)); refreshSlots(); } catch (e) { toast('Save failed'); }
  }
  function loadSlot(n) {
    const s = localStorage.getItem('tge-hd-save-' + n);
    if (!s) { toast('Slot ' + (n + 1) + ' is empty'); return; }
    try {
      state = host.deserialize(JSON.parse(s));
      $('title').style.display = 'none'; $('menu').style.display = 'none'; $('prompt').style.display = 'none';
      host.stopMusic();
      mode = 'playing'; zoom = null; waitReq = null; prevView = null; prevSprites = new Map(); curSprites = [];
      // regenerate the sprite records by running the plotter again
      host.spriteRecords.length = 0; plot_sprites(state); state.pending.length = 0;
      captureTick(); acc = 0; toast('Loaded slot ' + (n + 1));
    } catch (e) { console.error(e); toast('Load failed'); }
  }
  function refreshSlots() {
    for (let n = 0; n < 3; n++) {
      const s = localStorage.getItem('tge-hd-save-' + n);
      let label = 'empty';
      if (s) { try { const o = JSON.parse(s); label = 'Day ' + (o.day || 1) + ', ' + timeString(o.state.clock) + ', score ' + o.state.score_digits.join(''); } catch (e) { label = 'saved'; } }
      $('slot-' + n).textContent = label; $('mslot-' + n).textContent = label;
    }
  }
  let toastTimer = null;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', 1800); }

  $('btn-start').onclick = startGame;
  $('btn-resume').onclick = closeMenu;
  $('btn-restart').onclick = restartGame;
  $('btn-title').onclick = () => { $('menu').style.display = 'none'; mode = 'title'; host.started = false; state = host.newGame(); $('title').style.display = 'flex'; if (settings.music) host.startMusic(); };
  $('btn-help').onclick = () => { $('help').style.display = 'flex'; };
  $('btn-help2').onclick = () => { $('help').style.display = 'flex'; };
  $('btn-help-close').onclick = () => { $('help').style.display = 'none'; };
  $('btn-yes').onclick = () => answerPrompt(true);
  $('btn-no').onclick = () => answerPrompt(false);
  $('prompt').addEventListener('click', () => { if (mode === 'anykey') answerPrompt(undefined); });
  for (let n = 0; n < 3; n++) { $('save-' + n).onclick = () => saveSlot(n); $('load-' + n).onclick = () => loadSlot(n); $('mload-' + n).onclick = () => loadSlot(n); }
  ['smooth', 'classic', 'minimap', 'sound', 'music', 'crt', 'hints'].forEach(k => { $('opt-' + k).onchange = (e) => { settings[k] = e.target.checked; applySettings(); }; });
  $('opt-speed').onchange = (e) => { settings.speed = parseFloat(e.target.value); applySettings(); };
  $('btn-mute').onclick = () => { settings.sound = settings.music = !(settings.sound || settings.music); applySettings(); };

  // first user gesture unlocks audio
  window.addEventListener('pointerdown', () => { host.ensureAudio(); if (mode === 'title' && settings.music) host.startMusic(); }, { once: true });
  window.addEventListener('keydown', () => { host.ensureAudio(); if (mode === 'title' && settings.music) host.startMusic(); }, { once: true });

  window.TGE = { host, get state() { return state; }, settings,
    teleport(room, u, v, w) {
      const h = state.vischars[0];
      h.room = room; state.IY = h;
      try { transition(state, { u, v, w }); } catch (e) { if (e !== GOTO_MAIN) throw e; state.main_step = 0; }
      pendingAfterZoom = handleRequests(state.pending.splice(0, state.pending.length)); captureTick();
    },
    setClock(c) { state.clock = c; },
  };
  state = host.newGame();
  HD.stClass = HD.stClass || ((st) => 0);
  refreshKeyTable(); refreshSlots(); applySettings();
  requestAnimationFrame(frame);
})();
