// The Great Escape HD - host: virtual Spectrum, input, sound, timing, save states.
'use strict';

const Host = (function () {
  const TICK_T = 367731 / 3500000; // seconds per main loop iteration (as calibrated in the C port)

  /* ---- Keyboard matrix ---- */
  // Spectrum key -> [port high byte index (0..7 for FE,FD,FB,F7,EF,DF,BF,7F), bit]
  const ROWS = [0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0xBF, 0x7F];
  const KEYMAP = {
    SHIFT: [0, 0], Z: [0, 1], X: [0, 2], C: [0, 3], V: [0, 4],
    A: [1, 0], S: [1, 1], D: [1, 2], F: [1, 3], G: [1, 4],
    Q: [2, 0], W: [2, 1], E: [2, 2], R: [2, 3], T: [2, 4],
    '1': [3, 0], '2': [3, 1], '3': [3, 2], '4': [3, 3], '5': [3, 4],
    '0': [4, 0], '9': [4, 1], '8': [4, 2], '7': [4, 3], '6': [4, 4],
    P: [5, 0], O: [5, 1], I: [5, 2], U: [5, 3], Y: [5, 4],
    ENTER: [6, 0], L: [6, 1], K: [6, 2], J: [6, 3], H: [6, 4],
    SPACE: [7, 0], SYM: [7, 1], M: [7, 2], N: [7, 3], B: [7, 4],
  };

  function create(D) {
    const keyrows = new Uint8Array(8).fill(0x1F);
    const actions = { up: false, down: false, left: false, right: false, fire: false, pickup: false, drop: false, useA: false, useB: false };
    const host = {
      D, state: null, actions, keyrows,
      speed: 1, paused: false, started: false,
      soundOn: true, musicOn: true,
      spriteRecords: [],
      day: 1, lastClock: -1,
      msgLog: [],
      onTick: null, onRoomChange: null,
      audio: null,
    };

    const speccy = {
      screen: { pixels: new Uint8Array(6144), attributes: new Uint8Array(768) },
      in: (sp, port) => {
        if (port === 0x001F) return kempstonByte();
        const hi = port >> 8;
        let v = 0x1F;
        for (let r = 0; r < 8; r++) if ((hi & (1 << r)) === 0) v &= keyrows[r];
        return v;
      },
      out: () => {},
      draw: () => {},
      stamp: () => {},
      sleep: () => 0,
      sound: (sp, id) => playBeep(id),
      onsprite: (state, vischar, itemstruct) => recordSprite(state, vischar, itemstruct),
    };

    function kempstonByte() {
      let v = 0;
      let up = actions.up, down = actions.down, left = actions.left, right = actions.right, fire = actions.fire;
      if (actions.pickup) { fire = true; up = true; down = left = right = false; }
      else if (actions.drop) { fire = true; down = true; up = left = right = false; }
      else if (actions.useA) { fire = true; left = true; up = down = right = false; }
      else if (actions.useB) { fire = true; right = true; up = down = left = false; }
      if (right) v |= 1; if (left) v |= 2; if (down) v |= 4; if (up) v |= 8; if (fire) v |= 16;
      return v;
    }

    function setKey(name, down) {
      const k = KEYMAP[name]; if (!k) return;
      if (down) keyrows[k[0]] &= ~(1 << k[1]); else keyrows[k[0]] |= (1 << k[1]);
    }

    function recordSprite(state, vischar, itemstruct) {
      if (vischar) {
        host.spriteRecords.push({
          kind: 'vischar', index: vischar.index, character: vischar.character,
          spriteBase: vischar.mi.sprite, frame: vischar.mi.sprite_index & 0x7F, flip: (vischar.mi.sprite_index & 0x80) !== 0,
          x: vischar.isopos.x, y: vischar.isopos.y,
          maskOriginX: vischar.isopos.x & ~7, maskOriginY: vischar.isopos.y & ~7,
          maskbuf: state.mask_buffer.slice(0),
        });
      } else {
        host.spriteRecords.push({
          kind: 'item', item: itemstruct.item_and_flags & 0x0F, poisoned: (itemstruct.item_and_flags & 0x20) !== 0,
          x: itemstruct.isopos.x * 8, y: itemstruct.isopos.y * 8,
          maskOriginX: itemstruct.isopos.x * 8, maskOriginY: itemstruct.isopos.y * 8,
          maskbuf: state.mask_buffer.slice(0),
        });
      }
    }

    /* ---- Sound ---- */
    function ensureAudio() {
      if (host.audio) return host.audio;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const master = ctx.createGain(); master.gain.value = 0.25; master.connect(ctx.destination);
        host.audio = { ctx, master, music: null };
      } catch (e) { host.audio = null; }
      return host.audio;
    }
    function playBeep(id) {
      if (!host.soundOn) return;
      const a = ensureAudio(); if (!a) return;
      const iters = id >> 8, delay = id & 0xFF;
      // approximate the original's timing loop: each half period is ~ (delay * 13 + 30) T-states
      const halfT = (delay * 13 + 30) / 3500000;
      const freq = 1 / (2 * halfT);
      const dur = iters * halfT;
      const t = a.ctx.currentTime;
      const osc = a.ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
      const g = a.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.setValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(a.master);
      osc.start(t); osc.stop(t + dur + 0.01);
    }

    // Menu music: two voices from the game's note tables (0 = hold previous note, 255 = loop).
    function startMusic() {
      const a = ensureAudio(); if (!a || !host.musicOn || a.music) return;
      const ctx = a.ctx;
      const noteSec = 0.105;
      const music = { stop: false, nodes: [], timer: null };
      a.music = music;
      const ch = [D.music0, D.music1];
      const semiFreq = (s) => 261.63 * Math.pow(2, (s - 29) / 12);
      const g = ctx.createGain(); g.gain.value = 0.4; g.connect(a.master);
      const oscs = [], gains = [];
      for (let c = 0; c < 2; c++) {
        const o = ctx.createOscillator(); o.type = c ? 'triangle' : 'square';
        const og = ctx.createGain(); og.gain.value = 0; o.connect(og); og.connect(g); o.start();
        oscs.push(o); gains.push(og);
      }
      let idx = 0; const len = 640;
      let t0 = ctx.currentTime + 0.05;
      function schedule() {
        if (music.stop) return;
        while (t0 < ctx.currentTime + 1.0) {
          for (let c = 0; c < 2; c++) {
            const n = ch[c][idx % len];
            if (n === 0 || n === 255) continue; // hold
            const f = semiFreq(n);
            const vol = c ? 0.3 : 0.45;
            oscs[c].frequency.setValueAtTime(f, t0);
            gains[c].gain.cancelScheduledValues(t0);
            gains[c].gain.setValueAtTime(vol, t0);
            gains[c].gain.exponentialRampToValueAtTime(vol * 0.08, t0 + noteSec * 3.5);
          }
          idx++; t0 += noteSec;
        }
        music.timer = setTimeout(schedule, 400);
      }
      schedule();
      music.nodes = [g, ...oscs];
    }
    function stopMusic() {
      const a = host.audio; if (!a || !a.music) return;
      a.music.stop = true; clearTimeout(a.music.timer);
      try { a.music.nodes.forEach(n => n.disconnect()); } catch (e) {}
      a.music = null;
    }

    /* ---- Engine control ---- */
    function newGame() {
      const state = tge_create(D, speccy);
      host.state = state;
      tge_setup(state);
      state.chosen_input_device = inputdevice_KEMPSTON;
      return state;
    }
    function startGame() {
      const state = host.state || newGame();
      host.spriteRecords.length = 0;
      tge_setup2(state);
      host.started = true;
      host.day = 1; host.lastClock = state.clock;
      return state;
    }
    // Run one engine iteration; returns the list of host requests produced.
    function tick() {
      const state = host.state;
      host.spriteRecords.length = 0;
      tge_main(state);
      if (state.clock < host.lastClock) host.day++;
      host.lastClock = state.clock;
      const reqs = state.pending.splice(0, state.pending.length);
      return reqs;
    }
    function resume(req, value) {
      const state = host.state;
      host.spriteRecords.length = 0;
      tge_resume(state, req, value);
      return state.pending.splice(0, state.pending.length);
    }

    /* ---- Save states ---- */
    const SKIP = new Set(['D', 'speccy', 'pending', 'bm_arr', 'mk_arr', 'vis_clip', 'screen', 'attrs']);
    function pack(v) {
      if (v instanceof Uint8Array) return { __u8: Array.from(v) };
      if (Array.isArray(v)) return v.map(pack);
      if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = pack(v[k]); return o; }
      return v;
    }
    function unpack(v) {
      if (v && typeof v === 'object') {
        if (v.__u8) return new Uint8Array(v.__u8);
        if (Array.isArray(v)) return v.map(unpack);
        const o = {}; for (const k of Object.keys(v)) o[k] = unpack(v[k]); return o;
      }
      return v;
    }
    function serialize() {
      const s = host.state;
      const out = {};
      for (const k of Object.keys(s)) {
        if (SKIP.has(k)) continue;
        if (k === 'IY') { out[k] = s.IY ? s.IY.index : -1; continue; }
        out[k] = pack(s[k]);
      }
      return { version: 1, day: host.day, state: out, screen: Array.from(speccy.screen.pixels), attrs: Array.from(speccy.screen.attributes) };
    }
    function deserialize(obj) {
      const state = tge_create(D, speccy);
      const src = obj.state;
      for (const k of Object.keys(src)) {
        if (k === 'IY') { state.IY = src[k] >= 0 ? state.vischars[src[k]] : null; continue; }
        state[k] = unpack(src[k]);
      }
      state.screen = speccy.screen.pixels; state.attrs = speccy.screen.attributes;
      speccy.screen.pixels.set(obj.screen); speccy.screen.attributes.set(obj.attrs);
      state.pending = [];
      state.bm_arr = null; state.mk_arr = null;
      host.state = state; host.started = true; host.day = obj.day || 1; host.lastClock = state.clock;
      return state;
    }

    host.setKey = setKey; host.newGame = newGame; host.startGame = startGame; host.tick = tick; host.resume = resume;
    host.serialize = serialize; host.deserialize = deserialize; host.startMusic = startMusic; host.stopMusic = stopMusic;
    host.ensureAudio = ensureAudio; host.playBeep = playBeep; host.speccy = speccy;
    return host;
  }

  return { create, TICK_T, KEYMAP };
})();
