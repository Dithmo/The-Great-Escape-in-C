// The Great Escape - JavaScript engine port (part 4: events, messages, text, zoombox, statics, input)
'use strict';

/* ---- Events.c ---- */

/* $A1A0 */
function dispatch_timed_event(state) {
  let time = state.clock + 1;
  if (time === 140) time = 0;
  state.clock = time;
  for (const e of timed_events) if (time === e[0]) { EVENT_HANDLERS[e[1]](state); return; }
}

function event_night_time(state) {
  if (state.hero_in_bed === 0) set_hero_route(state, { index: routeindex_44_HUT2_RIGHT_TO_LEFT, step: 1 });
  set_day_or_night(state, 255);
}
function event_another_day_dawns(state) {
  queue_message(state, message_ANOTHER_DAY_DAWNS);
  decrease_morale(state, 25);
  set_day_or_night(state, 0);
}
function set_day_or_night(state, day_night) {
  state.day_or_night = day_night;
  set_game_window_attributes(state, choose_game_window_attributes(state));
}
function event_wake_up(state) { state.bell = bell_RING_40_TIMES; queue_message(state, message_TIME_TO_WAKE_UP); wake_up(state); }
function event_go_to_roll_call(state) { state.bell = bell_RING_40_TIMES; queue_message(state, message_ROLL_CALL); go_to_roll_call(state); }
function event_go_to_breakfast_time(state) { state.bell = bell_RING_40_TIMES; queue_message(state, message_BREAKFAST_TIME); set_route_go_to_breakfast(state); }
function event_end_of_breakfast(state) { state.bell = bell_RING_40_TIMES; end_of_breakfast(state); }
function event_go_to_exercise_time(state) {
  state.bell = bell_RING_40_TIMES; queue_message(state, message_EXERCISE_TIME);
  state.locked_doors[0] = 0; state.locked_doors[1] = 1;
  set_route_go_to_yard(state);
}
function event_exercise_time(state) { state.bell = bell_RING_40_TIMES; set_route_go_to_yard_reversed(state); }
function event_go_to_time_for_bed(state) {
  state.bell = bell_RING_40_TIMES;
  state.locked_doors[0] = 0 | door_LOCKED; state.locked_doors[1] = 1 | door_LOCKED;
  queue_message(state, message_TIME_FOR_BED);
  go_to_time_for_bed(state);
}
function event_new_red_cross_parcel(state) {
  const list = [item_PURSE, item_WIRESNIPS, item_BRIBE, item_COMPASS];
  if ((state.item_structs[item_RED_CROSS_PARCEL].room_and_flags & itemstruct_ROOM_MASK) !== itemstruct_ROOM_NONE) return;
  for (const item of list) {
    if ((state.item_structs[item].room_and_flags & itemstruct_ROOM_MASK) === itemstruct_ROOM_NONE) {
      state.red_cross_parcel_current_contents = item;
      const p = state.item_structs[item_RED_CROSS_PARCEL];
      p.room_and_flags = room_20_REDCROSS; p.mappos.u = 44; p.mappos.v = 44; p.mappos.w = 12; p.isopos.x = 128; p.isopos.y = 244;
      queue_message(state, message_RED_CROSS_PARCEL);
      return;
    }
  }
}
function event_time_for_bed(state) { set_guards_route(state, { index: routeindex_38_GUARD_12_BED | ROUTEINDEX_REVERSE_FLAG, step: 3 }); }
function event_search_light(state) { set_guards_route(state, { index: routeindex_38_GUARD_12_BED, step: 0 }); }
function set_guards_route(state, route) {
  const r = { index: route.index, step: route.step };
  for (let i = 0; i < 4; i++) { set_character_route(state, character_12_GUARD_12 + i, r); r.index++; }
}
const EVENT_HANDLERS = { event_night_time, event_another_day_dawns, event_wake_up, event_go_to_roll_call, event_go_to_breakfast_time,
  event_end_of_breakfast, event_go_to_exercise_time, event_exercise_time, event_go_to_time_for_bed, event_new_red_cross_parcel,
  event_time_for_bed, event_search_light, event_roll_call };

/* $A289 */
function wake_up(state) {
  if (state.hero_in_bed) { state.vischars[0].mi.mappos.u = 46; state.vischars[0].mi.mappos.v = 46; }
  state.hero_in_bed = 0;
  set_hero_route(state, { index: routeindex_42_HUT2_LEFT_TO_RIGHT, step: 0 });
  for (let i = 0; i < 3; i++) state.character_structs[character_20_PRISONER_1 + i].room = room_3_HUT2RIGHT;
  for (let i = 3; i < 6; i++) state.character_structs[character_20_PRISONER_1 + i].room = room_5_HUT3RIGHT;
  set_prisoners_and_guards_route_B(state, { index: routeindex_5_EXIT_HUT2, step: 0 });
  for (const b of beds) set_roomdef(state, b[0], b[1], interiorobject_EMPTY_BED_FACING_SE);
  set_roomdef(state, room_2_HUT2LEFT, roomdef_2_BED, interiorobject_EMPTY_BED_FACING_SE);
  if (state.room_index !== room_0_OUTDOORS && state.room_index < room_6) { setup_room(state); plot_interior_tiles(state); }
}

/* $A2E2 */
function end_of_breakfast(state) {
  if (state.hero_in_breakfast) { state.vischars[0].mi.mappos.u = 52; state.vischars[0].mi.mappos.v = 62; state.hero_in_breakfast = 0; }
  set_hero_route(state, { index: routeindex_16_BREAKFAST_25 | ROUTEINDEX_REVERSE_FLAG, step: 3 });
  for (let i = 0; i < 3; i++) state.character_structs[character_20_PRISONER_1 + i].room = room_25_MESS_HALL;
  for (let i = 3; i < 6; i++) state.character_structs[character_20_PRISONER_1 + i].room = room_23_MESS_HALL;
  set_prisoners_and_guards_route_B(state, { index: routeindex_16_BREAKFAST_25 | ROUTEINDEX_REVERSE_FLAG, step: 3 });
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_A, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_B, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_C, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_D, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_E, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_F, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_G, interiorobject_EMPTY_BENCH);
  if (state.room_index >= room_1_HUT1RIGHT && state.room_index <= room_28_HUT1LEFT) { setup_room(state); plot_interior_tiles(state); }
}

/* $A33F */
function set_hero_route(state, route) { if (state.in_solitary) return; set_hero_route_force(state, route); }
function set_hero_route_force(state, route) {
  const vischar = state.vischars[0];
  vischar.flags &= ~vischar_FLAGS_TARGET_IS_DOOR;
  vischar.route.index = route.index; vischar.route.step = route.step;
  set_route(state, vischar);
}

/* $A351 */
function go_to_time_for_bed(state) {
  const t5 = { index: routeindex_5_EXIT_HUT2 | ROUTEINDEX_REVERSE_FLAG, step: 2 };
  set_hero_route(state, t5);
  set_prisoners_and_guards_route_B(state, t5);
}

/* $A35F */
function set_prisoners_and_guards_route(state, proute) {
  const route = { index: proute.index, step: proute.step };
  for (const c of prisoners_and_guards) { set_character_route(state, c, route); route.index++; }
}
/* $A373 */
function set_prisoners_and_guards_route_B(state, proute) {
  const route = { index: proute.index, step: proute.step };
  let iters = 10;
  for (const c of prisoners_and_guards) {
    set_character_route(state, c, route);
    if (iters === 6) route.index++;
    iters--;
  }
}

/* $A38C */
function set_character_route(state, character, route) {
  const charstr = state.character_structs[character];
  if (charstr.character_and_flags & characterstruct_FLAG_ON_SCREEN) {
    character = charstr.character_and_flags & characterstruct_CHARACTER_MASK;
    for (let i = 1; i < 8; i++) {
      const vischar = state.vischars[i];
      if (character === vischar.character) {
        vischar.flags &= ~vischar_FLAGS_TARGET_IS_DOOR;
        vischar.route.index = route.index; vischar.route.step = route.step;
        set_route(state, vischar);
        return;
      }
    }
    return;
  }
  charstr.route.index = route.index; charstr.route.step = route.step;
}

/* $A3BB */
function set_route(state, vischar) {
  state.entered_move_a_character = 0;
  const t = get_target(state, vischar.route);
  const target = vischar.target;
  if (t.type === get_target_LOCATION) { target.u = t.location.x; target.v = t.location.y; }
  else if (t.type === get_target_DOOR) { const dm = DOORS[t.door].mappos; target.u = dm.u; target.v = dm.v; }
  if (t.type === get_target_ROUTE_ENDS) { state.IY = vischar; get_target_assign_pos(state, vischar, vischar.route); }
  else if (t.type === get_target_DOOR) vischar.flags |= vischar_FLAGS_TARGET_IS_DOOR;
}

/* $A3F3 */
function character_bed_state(state, route, owner) { character_bed_common(state, state.character_index, route); }
/* $A3F8 */
function character_bed_vischar(state, route, owner) {
  const vischar = state.IY;
  const character = vischar.character;
  if (character === character_0_COMMANDANT) set_hero_route(state, { index: routeindex_44_HUT2_RIGHT_TO_LEFT, step: 0 });
  else character_bed_common(state, character, route);
}
/* $A404 */
function character_bed_common(state, character, route) {
  let routeindex;
  route.step = 0;
  if (character >= character_20_PRISONER_1) routeindex = character - 13;
  else { routeindex = 13; if (character & 1) { route.step = 1; routeindex |= ROUTEINDEX_REVERSE_FLAG; } }
  route.index = routeindex;
}

/* $A420 */
function character_sits(state, routeindex, route, owner) {
  let index = routeindex - routeindex_18_PRISONER_SITS_1;
  let room_index = room_25_MESS_HALL, offset = roomdef_25_BENCH_D;
  if (index >= 3) { room_index = room_23_MESS_HALL; offset = roomdef_23_BENCH_A; index -= 3; }
  set_roomdef(state, room_index, offset + index * 3, interiorobject_PRISONER_SAT_MID_TABLE);
  const room = routeindex < routeindex_21_PRISONER_SITS_1 ? room_25_MESS_HALL : room_23_MESS_HALL;
  character_sit_sleep_common(state, room, route, owner);
}
/* $A444 */
function character_sleeps(state, routeindex, route, owner) {
  set_roomdef(state, beds[routeindex - 7][0], beds[routeindex - 7][1], interiorobject_OCCUPIED_BED);
  const room = routeindex < routeindex_10_PRISONER_SLEEPS_1 ? room_3_HUT2RIGHT : room_5_HUT3RIGHT;
  character_sit_sleep_common(state, room, route, owner);
}
/* $A462 */
function character_sit_sleep_common(state, room, route, owner) {
  route.index = routeindex_0_HALT;
  if (state.room_index !== room) {
    owner.room = room_NONE;
  } else {
    owner.room = room_NONE;
    setup_room_and_plot(state);
  }
}
function setup_room_and_plot(state) { setup_room(state); plot_interior_tiles(state); }

/* $A47F */
function hero_sits(state) {
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_G, interiorobject_PRISONER_SAT_END_TABLE);
  hero_sit_sleep_common(state, 'hero_in_breakfast');
}
function hero_sleeps(state) {
  set_roomdef(state, room_2_HUT2LEFT, roomdef_2_BED, interiorobject_OCCUPIED_BED);
  hero_sit_sleep_common(state, 'hero_in_bed');
}
function hero_sit_sleep_common(state, flag) {
  state[flag] = 255;
  state.vischars[0].route.index = routeindex_0_HALT;
  state.vischars[0].mi.mappos.u = 0; state.vischars[0].mi.mappos.v = 0;
  calc_vischar_isopos_from_vischar(state, state.vischars[0]);
  setup_room_and_plot(state);
}

function set_route_go_to_yard(state) {
  const t = { index: routeindex_14_GO_TO_YARD, step: 0 };
  set_hero_route(state, t); set_prisoners_and_guards_route_B(state, t);
}
function set_route_go_to_yard_reversed(state) {
  const t = { index: routeindex_14_GO_TO_YARD | ROUTEINDEX_REVERSE_FLAG, step: 4 };
  set_hero_route(state, t); set_prisoners_and_guards_route_B(state, t);
}
function set_route_go_to_breakfast(state) {
  const t = { index: routeindex_16_BREAKFAST_25, step: 0 };
  set_hero_route(state, t); set_prisoners_and_guards_route_B(state, t);
}

/* $A4D3 */
function charevnt_breakfast_state(state, route, owner) { charevnt_breakfast_common(state, state.character_index, route); }
function charevnt_breakfast_vischar(state, route, owner) {
  const vischar = state.IY;
  const character = vischar.character;
  if (character === character_0_COMMANDANT) set_hero_route(state, { index: routeindex_43_7833, step: 0 });
  else charevnt_breakfast_common(state, character, route);
}
function charevnt_breakfast_common(state, character, route) {
  let routeindex;
  route.step = 0;
  if (character >= character_20_PRISONER_1) routeindex = character - 2;
  else { routeindex = 24; if (character & 1) routeindex++; }
  route.index = routeindex;
}

/* $A4FD */
function go_to_roll_call(state) {
  set_prisoners_and_guards_route(state, { index: routeindex_26_GUARD_12_ROLL_CALL, step: 0 });
  set_hero_route(state, { index: routeindex_45_HERO_ROLL_CALL, step: 0 });
}

/* ---- Messages.c ---- */

/* $7D15 */
function queue_message(state, message_index) {
  const m = state.messages, q = m.queue;
  const qp = m.queue_pointer;
  if (q[qp] === message_QUEUE_END) return;
  if (q[qp - 2] === message_index && q[qp - 1] === 0) return;
  q[qp] = message_index; q[qp + 1] = 0;
  m.queue_pointer = qp + 2;
}

/* $7D48 */
function message_display(state) {
  const m = state.messages;
  if (m.display_delay > 0) { m.display_delay--; return; }
  const index = m.display_index;
  if (index === MESSAGE_NEXT_FLAG) next_message(state);
  else if (index > MESSAGE_NEXT_FLAG) wipe_message(state);
  else {
    const ch = m.current_str.charCodeAt(m.current_pos);
    plot_single_glyph(state, ch, screen_text_start_address + index);
    m.display_index = index + 1;
    m.current_pos++;
    if (m.current_pos >= m.current_str.length) {
      m.display_delay = 31;
      m.display_index |= MESSAGE_NEXT_FLAG;
    }
  }
}

function wipe_message(state) {
  const m = state.messages;
  let index = m.display_index;
  m.display_index = --index;
  index &= ~MESSAGE_NEXT_FLAG;
  plot_single_glyph(state, 32, screen_text_start_address + index);
}

function next_message(state) {
  const m = state.messages;
  if (m.queue_pointer === 2) return;
  m.current_str = messages_table[m.queue[2]];
  m.current_pos = 0;
  m.queue.copyWithin(0, 2, 18);
  m.queue_pointer -= 2;
  m.display_index = 0;
}

/* ---- Text.c ---- */
function plot_single_glyph(state, character, output) {
  const gi = state.D.ascii_to_font[character] * 8;
  const scr = state.screen, F = state.D.font;
  let o = output;
  for (let i = 0; i < 8; i++) { scr[o] = F[gi + i]; o += 256; }
  return output + 1;
}

/* ---- Zoombox.c ---- */
/* $ABA0: Conv: draws the final state immediately and records the animation for the host. */
function zoombox(state) {
  state.zoombox.x = 12; state.zoombox.y = 8;
  const attrs = choose_game_window_attributes(state);
  state.attrs[9 * state.width + 18] = attrs; state.attrs[9 * state.width + 19] = attrs;
  state.attrs[10 * state.width + 18] = attrs; state.attrs[10 * state.width + 19] = attrs;
  state.zoombox.width = 0; state.zoombox.height = 0;
  const steps = [];
  do {
    const z = state.zoombox;
    let v = z.x;
    if (v !== 1) { z.x--; v--; z.width++; }
    v += z.width;
    if (v < 22) z.width++;
    v = z.y;
    if (v !== 1) { z.y--; v--; z.height++; }
    v += z.height;
    if (v < 15) z.height++;
    zoombox_fill(state);
    zoombox_draw_border(state);
    steps.push({ x: z.x, y: z.y, width: z.width, height: z.height, delay: (z.height + z.width) * 110951 / 35 });
  } while (state.zoombox.height + state.zoombox.width < 35);
  host_request(state, { type: 'zoombox', steps, window_buf: state.window_buf.slice(0), attr: attrs, room: state.room_index, snapshot: state.speccy.snapshot ? state.speccy.snapshot(state) : null });
}

function zoombox_fill(state) {
  const scr = state.screen, wb = state.window_buf, z = state.zoombox;
  let src = z.y * state.window_buf_stride + z.x + 1;
  let dst = game_window_start_offsets[z.y * 8] + z.x;
  const src_skip = state.columns - z.width;
  let iters = z.height;
  do {
    const prev_dst = dst;
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < z.width; k++) scr[dst + k] = wb[src + k];
      src += z.width + src_skip;
      dst += state.width * 8;
    }
    dst = prev_dst;
    let dst_stride = state.width;
    if ((dst & 0xFF) >= 224) dst_stride += 7 << 8;
    dst += dst_stride;
  } while (--iters);
}

function zoombox_draw_border(state) {
  const z = state.zoombox;
  let addr = game_window_start_offsets[(z.y - 1) * 8];
  addr += z.x - 1;
  zoombox_draw_tile(state, 0, addr++);
  for (let i = 0; i < z.width; i++) zoombox_draw_tile(state, 1, addr++);
  zoombox_draw_tile(state, 2, addr);
  let delta = state.width; if ((addr & 0xFF) >= 224) delta += 0x0700; addr += delta;
  for (let i = 0; i < z.height; i++) {
    zoombox_draw_tile(state, 3, addr);
    delta = state.width; if ((addr & 0xFF) >= 224) delta += 0x0700; addr += delta;
  }
  zoombox_draw_tile(state, 4, addr--);
  for (let i = 0; i < z.width; i++) zoombox_draw_tile(state, 1, addr--);
  zoombox_draw_tile(state, 5, addr);
  delta = -state.width; if ((addr & 0xFF) < 32) delta -= 0x0700; addr += delta;
  for (let i = 0; i < z.height; i++) {
    zoombox_draw_tile(state, 3, addr);
    delta = -state.width; if ((addr & 0xFF) < 32) delta -= 0x0700; addr += delta;
  }
}

function zoombox_draw_tile(state, tile, addr_in) {
  const scr = state.screen;
  let addr = addr_in;
  const row = zoombox_tiles[tile];
  for (let i = 0; i < 8; i++) { scr[addr] = row[i]; addr += 256; }
  addr -= 256;
  let attrs = addr & 0xFF;
  if (addr >= 0x0800) { attrs += 256; if (addr >= 0x1000) attrs += 256; }
  state.attrs[attrs] = state.game_window_attribute;
}

/* ---- StaticGraphics.c ---- */
function plot_statics_and_menu_text(state) {
  for (const def of static_graphic_defs) plot_static_tiles(state, def[0], def[2], def[1] ? 255 : 0);
  for (const s of key_choice_screenlocstrings) screenlocstring_plot(state, s);
}
function plot_static_tiles(state, out, tiles, orientation) {
  const ST = state.D.static_tiles, scr = state.screen;
  for (const tile_index of tiles) {
    const base = tile_index * 9;
    for (let i = 0; i < 8; i++) { scr[out] = ST[base + i]; out += 256; }
    out -= 256;
    let aoffset = out & 0xFF;
    if (out >= 0x0800) aoffset += 256;
    if (out >= 0x1000) aoffset += 256;
    state.attrs[aoffset] = ST[base + 8];
    if (orientation === 0) out = out - 7 * 256 + 1;
    else out = get_next_scanline(state, out);
  }
}

/* ---- Menu.c (attributes only; the menu itself is host-driven) ---- */
function set_menu_item_attributes(state, index, attrs) {
  let p = 0x590D - 0x5800 + index * 2 * state.width;
  for (let i = 0; i < 10; i++) state.attrs[p + i] = attrs;
}

/* $F335 */
function wipe_game_window(state) {
  const scr = state.screen;
  for (let i = 0; i < (state.rows - 1) * 8; i++) {
    const p = game_window_start_offsets[i];
    for (let k = 0; k < state.columns - 1; k++) scr[p + k] = 0;
  }
}

/* ---- Input.c ---- */
function inputroutine_keyboard(state) {
  const defs = state.keydefs, sp = state.speccy;
  let inputs;
  let d = 0;
  let key_pressed = ~sp.in(sp, (defs[d].port << 8) | 0xFE) & defs[d].mask; d++;
  if (key_pressed) { d++; inputs = input_LEFT; }
  else {
    key_pressed = ~sp.in(sp, (defs[d].port << 8) | 0xFE) & defs[d].mask; d++;
    inputs = key_pressed ? input_RIGHT : input_NONE;
  }
  key_pressed = ~sp.in(sp, (defs[d].port << 8) | 0xFE) & defs[d].mask; d++;
  if (key_pressed) { d++; inputs += input_UP; }
  else {
    key_pressed = ~sp.in(sp, (defs[d].port << 8) | 0xFE) & defs[d].mask; d++;
    if (key_pressed) inputs += input_DOWN;
  }
  key_pressed = ~sp.in(sp, (defs[d].port << 8) | 0xFE) & defs[d].mask;
  if (key_pressed) inputs += input_FIRE;
  return inputs;
}
function inputroutine_protek(state) {
  const sp = state.speccy;
  let keybits_left = u8(~sp.in(sp, port_KEYBOARD_12345));
  let left_right = input_LEFT;
  if ((keybits_left & (1 << 4)) === 0) {
    keybits_left = u8(~sp.in(sp, port_KEYBOARD_09876));
    left_right = input_RIGHT;
    if ((keybits_left & (1 << 2)) === 0) left_right = 0;
  }
  const keybits_others = u8(~sp.in(sp, port_KEYBOARD_09876));
  let up_down = input_UP;
  if ((keybits_others & (1 << 3)) === 0) { up_down = input_DOWN; if ((keybits_others & (1 << 4)) === 0) up_down = input_NONE; }
  let fire = input_FIRE;
  if (keybits_others & 1) fire = 0;
  return fire + left_right + up_down;
}
function inputroutine_kempston(state) {
  const keybits = state.speccy.in(state.speccy, 0x001F);
  let left_right = 0, up_down = 0;
  if (keybits & 1) left_right = input_RIGHT;
  if (keybits & 2) left_right = input_LEFT;
  if (keybits & 4) up_down = input_DOWN;
  if (keybits & 8) up_down = input_UP;
  const fire = (keybits & 16) ? input_FIRE : 0;
  return fire + left_right + up_down;
}
function inputroutine_sinclair(state) {
  const keybits = u8(~state.speccy.in(state.speccy, port_KEYBOARD_09876));
  let left_right = 0, up_down = 0;
  if (keybits & 2) up_down = input_UP;      // key 9
  if (keybits & 4) up_down = input_DOWN;    // key 8
  if (keybits & 8) left_right = input_RIGHT; // key 7
  if (keybits & 16) left_right = input_LEFT; // key 6
  const fire = (keybits & 1) ? input_FIRE : 0; // key 0
  return fire + left_right + up_down;
}
function input_routine(state) {
  return [inputroutine_keyboard, inputroutine_kempston, inputroutine_sinclair, inputroutine_protek][state.chosen_input_device](state);
}

/* Module exports (node) */
if (typeof module !== 'undefined') {
  module.exports = { decodeData, tge_create, tge_setup, tge_setup2, tge_main, tge_resume, wave_morale_flag, set_menu_item_attributes,
    wipe_game_window, plot_single_glyph, screenlocstring_plot, set_game_window_attributes, GOTO_MAIN, animations, DOORS, locations, walls,
    exterior_tileset_base, consts: { attribute_WHITE_OVER_BLACK, attribute_BRIGHT_YELLOW_OVER_BLACK } };
}
