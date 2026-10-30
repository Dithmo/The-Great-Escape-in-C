// The Great Escape - JavaScript engine port (part 2: state and core routines)
'use strict';

function tge_create(D, speccy) {
  const state = {
    D, speccy,
    width: 32, height: 24, columns: 24, rows: 17, st_columns: 7, st_rows: 5,
    window_buf_stride: 24 * 8,
    IY: null,
    roomdef_shadow_bytes: new Uint8Array(16),
    room_index: 0, current_door: 0,
    movable_items: [
      { mappos: { u: 62, v: 35, w: 16 }, sprite: sprite_STOVE, sprite_index: 0 },
      { mappos: { u: 55, v: 54, w: 14 }, sprite: sprite_CRATE, sprite_index: 0 },
      { mappos: { u: 62, v: 35, w: 16 }, sprite: sprite_STOVE, sprite_index: 0 }],
    character_structs: [
      [0, room_11_PAPERS, 46, 46, 24, 3, 0], [1, 0, 102, 68, 3, 1, 0], [2, 0, 68, 104, 3, 1, 2], [3, room_16_CORRIDOR, 46, 46, 24, 3, 19],
      [4, 0, 61, 103, 3, 2, 4], [5, 0, 106, 56, 13, 0, 0], [6, 0, 72, 94, 13, 0, 0], [7, 0, 72, 70, 13, 0, 0], [8, 0, 80, 46, 13, 0, 0],
      [9, 0, 108, 71, 21, 4, 0], [10, 0, 92, 52, 3, 255, 56], [11, 0, 109, 69, 3, 0, 0], [12, room_3_HUT2RIGHT, 40, 60, 24, 0, 8],
      [13, room_2_HUT2LEFT, 36, 48, 24, 0, 8], [14, room_5_HUT3RIGHT, 40, 60, 24, 0, 16], [15, room_5_HUT3RIGHT, 36, 34, 24, 0, 16],
      [16, 0, 68, 84, 1, 255, 0], [17, 0, 68, 104, 1, 255, 0], [18, 0, 102, 68, 1, 255, 24], [19, 0, 88, 68, 1, 255, 24],
      [20, 255, 52, 60, 24, 0, 8], [21, 255, 52, 44, 24, 0, 8], [22, 255, 52, 28, 24, 0, 8], [23, 255, 52, 60, 24, 0, 16],
      [24, 255, 52, 44, 24, 0, 16], [25, 255, 52, 28, 24, 0, 16]].map(c => ({
        character_and_flags: c[0], room: c[1], mappos: { u: c[2], v: c[3], w: c[4] }, route: { index: c[5], step: c[6] } })),
    item_structs: [
      [0, 255, 64, 32, 2, 120, 244], [1, 9, 62, 48, 0, 124, 242], [2, 10, 73, 36, 16, 119, 240], [3, 11, 42, 58, 4, 132, 243],
      [4, 14, 34, 24, 2, 122, 246], [5, 255, 36, 44, 4, 126, 244], [6, 15, 44, 65, 16, 135, 241], [7, 19, 64, 48, 16, 126, 240],
      [8, 1, 66, 52, 4, 124, 241], [9, 22, 60, 42, 0, 123, 242], [10, 11, 28, 34, 0, 129, 248], [11, 0, 74, 72, 0, 122, 110],
      [12, 255, 28, 50, 12, 133, 246], [13, 18, 36, 58, 8, 133, 244], [14, 255, 36, 44, 4, 126, 244], [15, 255, 52, 28, 4, 126, 244]].map(i => ({
        item_and_flags: i[0], room_and_flags: i[1], mappos: { u: i[2], v: i[3], w: i[4] }, isopos: { x: i[5], y: i[6] } })),
    messages: { queue: new Uint8Array(message_queue_LENGTH), display_delay: 0, display_index: MESSAGE_NEXT_FLAG, queue_pointer: 2, current_str: '', current_pos: 0 },
    reversed: new Uint8Array(256),
    vischars: [],
    mask_buffer: new Uint8Array(MASK_BUFFER_LENGTH),
    window_buf_pointer: 0,
    saved_mappos: { u: 0, v: 0, w: 0 },
    bm_arr: null, bm_off: 0, mk_arr: null, mk_off: 0,
    foreground_mask_pointer: 0,
    mappos_stash: { u: 0, v: 0, w: 0 },
    isopos: { x: 0, y: 0 },
    sprite_index: 0,
    hero_mappos: { u: 0, v: 0, w: 0 },
    map_position: { x: 0, y: 0 },
    searchlight_state: 0,
    roomdef_dimensions_index: 0, roomdef_object_bounds_count: 0,
    roomdef_object_bounds: [{ x0: 0, x1: 0, y0: 0, y1: 0 }, { x0: 0, x1: 0, y0: 0, y1: 0 }, { x0: 0, x1: 0, y0: 0, y1: 0 }, { x0: 0, x1: 0, y0: 0, y1: 0 }],
    interior_doors: new Uint8Array(4),
    interior_mask_data_count: 0, interior_mask_data: [],
    item_height: 0, items_held: [item_NONE, item_NONE], character_index: 0,
    game_counter: 0, bell: bell_STOP, score_digits: [0, 0, 0, 0, 0],
    hero_in_breakfast: 0, red_flag: 0, automatic_player_counter: 0, in_solitary: 0, morale_exhausted: 0, morale: morale_MAX,
    clock: 0, entered_move_a_character: 0, hero_in_bed: 0, displayed_morale: 0,
    moraleflag_screen_address: 0x5002 - 0x4000,
    ptr_to_door_being_lockpicked: -1, player_locked_out_until: 0, day_or_night: 0,
    red_cross_parcel_current_contents: item_NONE,
    move_map_y: 0, game_window_offset: { x: 0, y: 0 },
    zoombox: { x: 0, width: 0, y: 0, height: 0 }, game_window_attribute: 0,
    searchlight: {
      states: [
        { xy: { x: 36, y: 82 }, counter: 44, direction: direction_BOTTOM_RIGHT, index: 0, ptr: [44, 2, 42, 1, 255] },
        { xy: { x: 120, y: 82 }, counter: 24, direction: direction_TOP_RIGHT, index: 0, ptr: [24, 1, 12, 0, 24, 3, 12, 0, 32, 1, 20, 0, 32, 3, 44, 2, 255] },
        { xy: { x: 60, y: 76 }, counter: 32, direction: direction_BOTTOM_RIGHT, index: 0, ptr: [32, 2, 32, 1, 255] }],
      caught_coord: { x: 0, y: 0 } },
    bribed_character: character_NONE, prng_index: 0, food_discovered_counter: 0,
    item_attributes: [6, 5, 5, 7, 4, 66, 4, 7, 3, 66, 6, 4, 5, 7, 7, 4],
    spriteplotter: { height_24_right: 0, height_24_left: 0, height_16_left: 0, height_16_right: 0,
      enable_24_right_1: 0, enable_24_right_2: 0, enable_24_right_3: 0, enable_24_right_4: 0,
      enable_24_left_1: 0, enable_24_left_2: 0, enable_24_left_3: 0, enable_24_left_4: 0,
      enable_16_left_1: 0, enable_16_left_2: 0, enable_16_left_3: 0, enable_16_right_1: 0, enable_16_right_2: 0, enable_16_right_3: 0 },
    locked_doors: new Uint8Array([0 | 128, 1 | 128, 13 | 128, 12 | 128, 14 | 128, 34 | 128, 24 | 128, 31 | 128, 22 | 128, 0, 0]),
    keydefs: [{ port: 0, mask: 0 }, { port: 0, mask: 0 }, { port: 0, mask: 0 }, { port: 0, mask: 0 }, { port: 0, mask: 0 }],
    tile_buf: new Uint8Array(TILE_BUF_LENGTH),
    tile_obj: new Uint8Array(TILE_BUF_LENGTH), // Conv: object index+1 per cell, for the HD renderer
    chosen_input_device: inputdevice_KEYBOARD,
    music_channel0_index: 0, music_channel1_index: 0,
    window_buf: new Uint8Array(WINDOW_BUF_LENGTH + 8),
    map_buf: new Uint8Array(35),
    // Conv: host-facing extras
    screen: speccy.screen.pixels, attrs: speccy.screen.attributes,
    pending: [],         // host blocking requests (zoombox / wait for key)
    main_step: 0,
  };
  state.messages.queue[0] = message_QUEUE_END; state.messages.queue[1] = message_QUEUE_END; state.messages.queue[message_queue_LENGTH - 1] = message_QUEUE_END;
  const dsb = [23, 23, 23, 23, 23, 23, 23, 13, 13, 13, 13, 13, 13, 13, 52, 20];
  for (let i = 0; i < 16; i++) state.roomdef_shadow_bytes[i] = dsb[i];
  for (let i = 0; i < 8; i++) state.vischars.push(make_vischar(i));
  return state;
}

function make_vischar(index) {
  return { index, character: 0, flags: 0, route: { index: 0, step: 0 }, target: { u: 0, v: 0, w: 0 }, counter_and_flags: 0,
    anim: 8, animindex: 0, input: 0, direction: 0, mi: { mappos: { u: 0, v: 0, w: 0 }, sprite: sprite_PRISONER_FACING_AWAY_1, sprite_index: 0 },
    isopos: { x: 0, y: 0 }, room: 0, width_bytes: 0, height: 0 };
}

/* RoomDefs.c */
function get_roomdef_shadow(room_index, offset) {
  switch (room_index) {
    case room_2_HUT2LEFT: if (offset === roomdef_2_BED) return 0; break;
    case room_3_HUT2RIGHT: if (offset === roomdef_3_BED_A) return 1; if (offset === roomdef_3_BED_B) return 2; if (offset === roomdef_3_BED_C) return 3; break;
    case room_5_HUT3RIGHT: if (offset === roomdef_5_BED_D) return 4; if (offset === roomdef_5_BED_E) return 5; if (offset === roomdef_5_BED_F) return 6; break;
    case room_23_MESS_HALL: if (offset === roomdef_23_BENCH_A) return 7; if (offset === roomdef_23_BENCH_B) return 8; if (offset === roomdef_23_BENCH_C) return 9; break;
    case room_25_MESS_HALL: if (offset === roomdef_25_BENCH_D) return 10; if (offset === roomdef_25_BENCH_E) return 11; if (offset === roomdef_25_BENCH_F) return 12; if (offset === roomdef_25_BENCH_G) return 13; break;
    case room_50_BLOCKED_TUNNEL: if (offset === roomdef_50_BOUNDARY) return 14; if (offset === roomdef_50_BLOCKAGE) return 15; break;
  }
  return -1;
}
function get_roomdef(state, room_index, offset) {
  const index = get_roomdef_shadow(room_index, offset);
  if (index >= 0) return state.roomdef_shadow_bytes[index];
  return state.D.rooms[room_index - 1][offset];
}
function set_roomdef(state, room_index, offset, new_byte) {
  const index = get_roomdef_shadow(room_index, offset);
  if (index >= 0) state.roomdef_shadow_bytes[index] = new_byte;
}

/* $68A2: Transition. */
function transition(state, mappos) {
  const vischar = state.IY;
  if (vischar.room === room_0_OUTDOORS) {
    vischar.mi.mappos.u = u16(mappos.u * 4); vischar.mi.mappos.v = u16(mappos.v * 4); vischar.mi.mappos.w = u16(mappos.w * 4);
  } else {
    vischar.mi.mappos.u = mappos.u; vischar.mi.mappos.v = mappos.v; vischar.mi.mappos.w = mappos.w;
  }
  if (vischar !== state.vischars[0]) {
    reset_visible_character(state, vischar);
  } else {
    vischar.flags &= ~vischar_FLAGS_NO_COLLIDE;
    const room_index = state.room_index = state.vischars[0].room;
    if (room_index === room_0_OUTDOORS) {
      vischar.input = input_KICK;
      vischar.direction &= vischar_DIRECTION_MASK;
      reset_outdoors(state);
      squash_stack_goto_main(state);
    } else {
      enter_room(state);
    }
  }
}

/* $68F4: Enter room. */
function enter_room(state) {
  state.game_window_offset.x = 0; state.game_window_offset.y = 0;
  setup_room(state);
  plot_interior_tiles(state);
  state.map_position.x = 116; state.map_position.y = 234;
  set_hero_sprite_for_room(state);
  calc_vischar_isopos_from_vischar(state, state.vischars[0]);
  setup_movable_items(state);
  zoombox(state);
  increase_score(state, 1);
  squash_stack_goto_main(state);
}

function squash_stack_goto_main(state) { throw GOTO_MAIN; }

/* $6920 */
function set_hero_sprite_for_room(state) {
  const hero = state.vischars[0];
  hero.input = input_KICK;
  if (state.room_index >= room_29_SECOND_TUNNEL_START) {
    hero.direction |= vischar_DIRECTION_CRAWL;
    hero.mi.sprite = sprite_PRISONER_FACING_AWAY_1;
  } else {
    hero.direction &= ~vischar_DIRECTION_CRAWL;
  }
}

/* $6939 */
function setup_movable_items(state) {
  reset_nonplayer_visible_characters(state);
  switch (state.room_index) {
    case room_2_HUT2LEFT: setup_movable_item(state, state.movable_items[movable_item_STOVE1], character_26_STOVE_1); break;
    case room_4_HUT3LEFT: setup_movable_item(state, state.movable_items[movable_item_STOVE2], character_27_STOVE_2); break;
    case room_9_CRATE: setup_movable_item(state, state.movable_items[movable_item_CRATE], character_28_CRATE); break;
  }
  spawn_characters(state);
  mark_nearby_items(state);
  animate(state);
  move_map(state);
  plot_sprites(state);
}

/* $697D */
function setup_movable_item(state, movableitem, character) {
  const v = state.vischars[1];
  v.character = character;
  v.mi.mappos.u = movableitem.mappos.u; v.mi.mappos.v = movableitem.mappos.v; v.mi.mappos.w = movableitem.mappos.w;
  v.mi.sprite = movableitem.sprite; v.mi.sprite_index = movableitem.sprite_index;
  v.flags = 0; v.route.index = routeindex_0_HALT; v.route.step = 0;
  v.target.u = 0; v.target.v = 0; v.target.w = 0;
  v.counter_and_flags = 0; v.anim = 8; v.animindex = 0; v.input = 0; v.direction = direction_TOP_LEFT;
  v.room = state.room_index;
  calc_vischar_isopos_from_vischar(state, v);
}

/* $69C9 */
function reset_nonplayer_visible_characters(state) {
  for (let i = 1; i < 8; i++) reset_visible_character(state, state.vischars[i]);
}

/* $69DC */
function setup_doors(state) {
  const pd = state.interior_doors;
  pd[0] = pd[1] = pd[2] = pd[3] = interiordoor_NONE;
  let n = 0;
  const room = state.room_index << 2;
  let door_index = 0;
  for (let i = 0; i < DOORS.length; i++) {
    if ((DOORS[i].room_and_direction & ~door_FLAGS_MASK_DIRECTION) === room) pd[n++] = door_index ^ door_REVERSE;
    door_index ^= door_REVERSE;
    if (door_index < door_REVERSE) door_index++;
  }
}

/* $6A12: returns flat index into DOORS. */
function get_door(index) {
  let di = (index & ~door_REVERSE) * 2;
  if (index & door_REVERSE) di++;
  return di;
}

function wipe_visible_tiles(state) { state.tile_buf.fill(0); state.tile_obj.fill(0); }

/* $6A35: Setup room. */
function setup_room(state) {
  wipe_visible_tiles(state);
  const room_index = state.room_index;
  let offset = 0;
  setup_doors(state);
  state.roomdef_dimensions_index = get_roomdef(state, room_index, offset++);
  const count = state.roomdef_object_bounds_count = get_roomdef(state, room_index, offset);
  if (count === 0) offset++;
  else {
    offset++;
    for (let c = 0; c < count; c++) {
      const b = state.roomdef_object_bounds[c];
      b.x0 = get_roomdef(state, room_index, offset++); b.x1 = get_roomdef(state, room_index, offset++);
      b.y0 = get_roomdef(state, room_index, offset++); b.y1 = get_roomdef(state, room_index, offset++);
    }
  }
  let iters = state.interior_mask_data_count = get_roomdef(state, room_index, offset++);
  state.interior_mask_data = [];
  while (iters--) {
    const index = get_roomdef(state, room_index, offset++);
    state.interior_mask_data.push(interior_mask_data_source[index]);
  }
  iters = get_roomdef(state, room_index, offset++);
  while (iters--) {
    const object_index = get_roomdef(state, room_index, offset++);
    const column = get_roomdef(state, room_index, offset++);
    const row = get_roomdef(state, room_index, offset++);
    expand_object(state, object_index, row * state.columns + column);
  }
}

/* $6AB5: Expand RLE-encoded objects. */
function expand_object(state, index, output) {
  const columns = state.columns;
  const obj = state.D.objects[index];
  const tb = state.tile_buf, tobj = state.tile_obj, tag = index + 1;
  let width = obj[0], height = obj[1];
  const self_width = width;
  let p = 2;
  for (;;) {
    let byte = obj[p];
    if (byte === interiortile_ESCAPE) {
      byte = obj[++p];
      if (byte !== interiortile_ESCAPE) {
        byte &= 0xF0;
        if (byte >= 128) {
          // repetition
          byte = obj[p++] & 0x7F;
          const val = obj[p];
          do {
            if (val > 0) { tb[output] = val; tobj[output] = tag; }
            output++;
            if (--width === 0) {
              width = self_width; output += columns - width;
              if (--height === 0) return;
            }
          } while (--byte);
          p++;
          continue;
        }
        if (byte === 64) {
          // range
          byte = obj[p++] & 0x0F;
          let val = obj[p];
          do {
            tb[output] = val++; tobj[output] = tag; output++;
            if (--width === 0) {
              width = self_width; output += columns - self_width;
              if (--height === 0) return;
            }
          } while (--byte);
          p++;
          continue;
        }
      }
    }
    if (byte) { tb[output] = byte; tobj[output] = tag; }
    p++; output++;
    if (--width === 0) {
      width = self_width; output += columns - width;
      if (--height === 0) return;
    }
  }
}

/* $6B42 */
function plot_interior_tiles(state) {
  const rows = state.rows - 1, columns = state.columns;
  const wb = state.window_buf, tb = state.tile_buf, it = state.D.interior_tiles;
  let window_buf = 0, tiles_buf = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const t = tb[tiles_buf] * 8;
      let w2 = window_buf;
      for (let i = 0; i < 8; i++) { wb[w2] = it[t + i]; w2 += columns; }
      tiles_buf++; window_buf++;
    }
    window_buf += 7 * columns;
  }
}

/* $7AC9 */
function process_player_input_fire(state, input) {
  switch (input) {
    case input_UP_FIRE: pick_up_item(state); break;
    case input_DOWN_FIRE: drop_item(state); break;
    case input_LEFT_FIRE: use_item_common(state, state.items_held[0]); break;
    case input_RIGHT_FIRE: use_item_common(state, state.items_held[1]); break;
  }
}

/* $7AFB */
function use_item_common(state, item) {
  if (item === item_NONE) return;
  const m = state.vischars[0].mi.mappos;
  state.saved_mappos.u = m.u; state.saved_mappos.v = m.v; state.saved_mappos.w = m.w;
  const actions = [action_wiresnips, action_shovel, action_lockpick, action_papers, null, action_bribe, action_uniform, null,
    action_poison, action_red_key, action_yellow_key, action_green_key, action_red_cross_parcel, null, null, null];
  if (actions[item]) actions[item](state);
}

/* $7B36 */
function pick_up_item(state) {
  if (state.items_held[0] !== item_NONE && state.items_held[1] !== item_NONE) return;
  const itemstr = find_nearby_item(state);
  if (itemstr === null) return;
  const slot = state.items_held[0] !== item_NONE ? 1 : 0;
  state.items_held[slot] = itemstr.item_and_flags & (itemstruct_ITEM_MASK | itemstruct_ITEM_FLAG_UNKNOWN);
  if (state.room_index === room_0_OUTDOORS) {
    plot_all_tiles(state);
  } else {
    setup_room(state);
    plot_interior_tiles(state);
    set_game_window_attributes(state, choose_game_window_attributes(state));
  }
  if ((itemstr.item_and_flags & itemstruct_ITEM_FLAG_HELD) === 0) {
    itemstr.item_and_flags |= itemstruct_ITEM_FLAG_HELD;
    increase_morale_by_5_score_by_5(state);
  }
  itemstr.room_and_flags = 0; itemstr.isopos.x = 0; itemstr.isopos.y = 0;
  draw_all_items(state);
  play_speaker(state, sound_PICK_UP_ITEM);
}

/* $7B8B */
function drop_item(state) {
  const item = state.items_held[0];
  if (item === item_NONE) return;
  if (item === item_UNIFORM) state.vischars[0].mi.sprite = sprite_PRISONER_FACING_AWAY_1;
  state.items_held[0] = state.items_held[1]; state.items_held[1] = item_NONE;
  draw_all_items(state);
  play_speaker(state, sound_DROP_ITEM);
  set_game_window_attributes(state, choose_game_window_attributes(state));
  drop_item_tail(state, item);
}

/* $7BB5 */
function drop_item_tail(state, item) {
  const itemstr = state.item_structs[item];
  const room = state.room_index;
  itemstr.room_and_flags = room;
  const inpos = state.vischars[0].mi.mappos, outpos = itemstr.mappos;
  if (room === room_0_OUTDOORS) {
    scale_mappos_down(inpos, outpos);
    outpos.w = 0;
    calc_exterior_item_isopos(itemstr);
  } else {
    outpos.u = u8(inpos.u); outpos.v = u8(inpos.v); outpos.w = 5;
    calc_interior_item_isopos(itemstr);
  }
}

function calc_exterior_item_isopos(itemstr) {
  itemstr.isopos.x = u8((0x40 - itemstr.mappos.u + itemstr.mappos.v) * 2);
  itemstr.isopos.y = u8(0x100 - itemstr.mappos.u - itemstr.mappos.v - itemstr.mappos.w);
}
function calc_interior_item_isopos(itemstr) {
  itemstr.isopos.x = u8(((0x200 - itemstr.mappos.u + itemstr.mappos.v) * 2 + 4) >> 3);
  itemstr.isopos.y = u8((0x800 - itemstr.mappos.u - itemstr.mappos.v - itemstr.mappos.w + 4) >> 3);
}

/* $7C33 */
function draw_all_items(state) {
  draw_item(state, state.items_held[0], 0x5087 - 0x4000);
  draw_item(state, state.items_held[1], 0x508A - 0x4000);
}

/* $7C46 */
function draw_item(state, item, dstoff) {
  screen_wipe(state, dstoff, 2, 16);
  if (item === item_NONE) return;
  const attrs = (dstoff & 0xFF) + (0x5A00 - 0x5800);
  const attr = state.item_attributes[item];
  state.attrs[attrs] = attr; state.attrs[attrs + 1] = attr;
  state.attrs[attrs + state.width] = attr; state.attrs[attrs + state.width + 1] = attr;
  const sprite = state.D.items[item];
  plot_bitmap(state, sprite.bitmap, 0, dstoff, sprite.width, sprite.height);
}

/* $7C82 */
function find_nearby_item(state) {
  const radius = state.room_index > room_0_OUTDOORS ? 6 : 1;
  for (let i = 0; i < item__LIMIT; i++) {
    const itemstr = state.item_structs[i];
    if (itemstr.room_and_flags & itemstruct_ROOM_FLAG_NEARBY_7) {
      let A = state.hero_mappos.u;
      if (A - radius >= itemstr.mappos.u || A + radius < itemstr.mappos.u) continue;
      A = state.hero_mappos.v;
      if (A - radius >= itemstr.mappos.v || A + radius < itemstr.mappos.v) continue;
      return itemstr;
    }
  }
  return null;
}

/* $7CBE */
function plot_bitmap(state, src, srcoff, dst, width, height) {
  const scr = state.screen;
  let h = height, cur = dst;
  do {
    for (let i = 0; i < width; i++) scr[cur + i] = src[srcoff + i];
    srcoff += width;
    cur = get_next_scanline(state, cur);
  } while (--h);
}

/* $7CD4 */
function screen_wipe(state, dst, width, height) {
  const scr = state.screen;
  let h = height, cur = dst;
  do {
    for (let i = 0; i < width; i++) scr[cur + i] = 0;
    cur = get_next_scanline(state, cur);
  } while (--h);
}

/* $7CE9 */
function get_next_scanline(state, slp) {
  let offset = u16(slp);
  offset = u16(offset + 0x0100);
  if (offset & 0x0700) return offset;
  const delta = (offset & 0xFF) >= 0xE0 ? 0xFF20 : 0xF820;
  offset = u16(offset + delta);
  return i16(offset);
}

/* $9D7B: Main game loop, as a sequence of steps so it can be resumed. */
const main_steps = [
  (s) => { check_morale(s); },
  (s) => { keyscan_break(s); },
  (s) => { message_display(s); },
  (s) => { process_player_input(s); },
  (s) => { in_permitted_area(s); },
  (s) => { restore_tiles(s); },
  (s) => { move_a_character(s); },
  (s) => { automatics(s); },
  (s) => { purge_invisible_characters(s); },
  (s) => { spawn_characters(s); },
  (s) => { mark_nearby_items(s); },
  (s) => { ring_bell(s); },
  (s) => { animate(s); },
  (s) => { move_map(s); },
  (s) => { message_display(s); },
  (s) => { ring_bell(s); },
  (s) => { plot_sprites(s); },
  (s) => { plot_game_window(s); },
  (s) => { ring_bell(s); },
  (s) => { if (s.day_or_night !== 0) nighttime(s); },
  (s) => { wave_morale_flag(s); },
  (s) => { if ((s.game_counter & 63) === 0) dispatch_timed_event(s); },
];
function main_loop(state) {
  state.speccy.stamp(state.speccy);
  while (state.main_step < main_steps.length) {
    const step = state.main_step;
    main_steps[step](state);
    if (state.pending.length) return; // host must service a blocking request; main_step records where to resume
    state.main_step = step + 1;
  }
  state.main_step = 0;
  state.speccy.sleep(state.speccy, 367731);
}

/* $9DCF */
function check_morale(state) {
  if (state.morale >= 2) return;
  queue_message(state, message_MORALE_IS_ZERO);
  state.morale_exhausted = 255;
  state.automatic_player_counter = 0;
}

/* $9DE5: BREAK handling. Conv: user_confirm is host-driven. */
function keyscan_break(state) {
  const space = (state.speccy.in(state.speccy, port_KEYBOARD_SPACESYMSHFTMNB) & 1) === 0;
  const shift = (state.speccy.in(state.speccy, port_KEYBOARD_SHIFTZXCV) & 1) === 0;
  if (!space || !shift) return;
  screen_reset(state);
  user_confirm(state, (confirmed) => {
    if (confirmed) {
      reset_game(state);
    }
    if (state.room_index === room_0_OUTDOORS) {
      reset_outdoors(state);
      return 'continue'; // main loop continues after keyscan_break
    } else {
      enter_room(state);
    }
  });
}

/* $9E07 */
function process_player_input(state) {
  if (state.in_solitary || state.morale_exhausted) return;
  const hero = state.vischars[0];
  if (hero.flags & (vischar_FLAGS_PICKING_LOCK | vischar_FLAGS_CUTTING_WIRE)) {
    state.automatic_player_counter = 31;
    if (hero.flags === vischar_FLAGS_PICKING_LOCK) picking_lock(state);
    else cutting_wire(state);
    return;
  }
  let input = input_routine(state);
  if (input === input_NONE) {
    if (state.automatic_player_counter === 0) return;
    state.automatic_player_counter--;
    input = input_NONE;
  } else {
    state.automatic_player_counter = 31;
    if (state.hero_in_bed || state.hero_in_breakfast) {
      if (state.hero_in_bed === 0) {
        hero.route.index = routeindex_43_7833; hero.route.step = 0;
        hero.mi.mappos.u = 52; hero.mi.mappos.v = 62;
        set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_G, interiorobject_EMPTY_BENCH);
        state.hero_in_breakfast = 0;
      } else {
        hero.route.index = routeindex_44_HUT2_RIGHT_TO_LEFT; hero.route.step = 1;
        hero.target.u = 46; hero.target.v = 46;
        hero.mi.mappos.u = 46; hero.mi.mappos.v = 46; hero.mi.mappos.w = 24;
        set_roomdef(state, room_2_HUT2LEFT, roomdef_2_BED, interiorobject_EMPTY_BED_FACING_SE);
        state.hero_in_bed = 0;
      }
      setup_room(state);
      plot_interior_tiles(state);
    }
    if (input >= input_FIRE) {
      process_player_input_fire(state, input);
      input = input_KICK;
    }
  }
  if (hero.input !== input) hero.input = input | input_KICK;
}

/* $9E98 */
function picking_lock(state) {
  if (state.player_locked_out_until !== state.game_counter) return;
  state.locked_doors[state.ptr_to_door_being_lockpicked] &= ~door_LOCKED;
  queue_message(state, message_IT_IS_OPEN);
  state.vischars[0].flags &= ~(vischar_FLAGS_PICKING_LOCK | vischar_FLAGS_CUTTING_WIRE);
}

/* $9EB2 */
function cutting_wire(state) {
  const new_inputs = [input_UP + input_LEFT + input_KICK, input_UP + input_RIGHT + input_KICK, input_DOWN + input_RIGHT + input_KICK, input_DOWN + input_LEFT + input_KICK];
  const hero = state.vischars[0];
  const delta = u8(state.player_locked_out_until - state.game_counter);
  if (delta) {
    if (delta < 4) hero.input = new_inputs[hero.direction & vischar_DIRECTION_MASK];
  } else {
    hero.direction = hero.direction & vischar_DIRECTION_MASK;
    hero.input = input_KICK;
    hero.mi.mappos.w = 24;
    hero.flags &= ~(vischar_FLAGS_PICKING_LOCK | vischar_FLAGS_CUTTING_WIRE);
  }
}

/* $9F21 */
function in_permitted_area(state) {
  const hero = state.vischars[0];
  const hvm = hero.mi.mappos, hsm = state.hero_mappos;
  if (state.room_index === room_0_OUTDOORS) {
    scale_mappos_down(hvm, hsm);
    if (hero.isopos.x >= MAP_WIDTH * 8 || hero.isopos.y >= MAP_HEIGHT * 8) {
      escaped(state);
      return;
    }
  } else {
    hsm.u = u8(hvm.u); hsm.v = u8(hvm.v); hsm.w = u8(hvm.w);
  }
  let red_flag, attr;
  const set_flag_green = () => { red_flag = 0; attr = attribute_BRIGHT_GREEN_OVER_BLACK; };
  const set_flag_red = () => { if (state.red_flag === 255) return false; attr = attribute_BRIGHT_RED_OVER_BLACK; hero.input = 0; red_flag = 255; return true; };
  let decided = 0; // 1 green, 2 red
  if (hero.flags & (vischar_FLAGS_PICKING_LOCK | vischar_FLAGS_CUTTING_WIRE)) decided = 2;
  else if (state.clock >= 100) decided = state.room_index === room_2_HUT2LEFT ? 1 : 2;
  else if (state.in_solitary) decided = 1;
  else {
    const route = { index: hero.route.index, step: hero.route.step };
    if (route.index & ROUTEINDEX_REVERSE_FLAG) route.step = u8(route.step + 1);
    if (route.index === routeindex_255_WANDER) {
      const area = ((hero.route.step & ~7) === 8) ? 1 : 2;
      decided = in_permitted_area_end_bit(state, area) ? 1 : 2;
    } else {
      const routeindex = route.index & ~ROUTEINDEX_REVERSE_FLAG;
      let tab = null;
      for (const t of route_to_permitted) if (routeindex === t.routeindex) { tab = t; break; }
      if (tab === null) decided = 1;
      else {
        const permitted = tab.permitted;
        if (!in_permitted_area_end_bit(state, permitted[route.step])) {
          let base = 0;
          if (hero.route.index & ROUTEINDEX_REVERSE_FLAG) base = 1;
          let i = 0;
          for (;;) {
            const room_or_area = permitted[base + i];
            if (room_or_area === 255) { decided = 2; break; }
            if (in_permitted_area_end_bit(state, room_or_area)) break;
            i++;
          }
          if (decided !== 2) {
            set_hero_route(state, { index: hero.route.index, step: i });
            decided = 1;
          }
        } else decided = 1;
      }
    }
  }
  if (decided === 1) {
    set_flag_green();
  } else {
    if (!set_flag_red()) return;
  }
  if (state.red_flag === red_flag) return;
  state.red_flag = red_flag;
  if (attr === attribute_BRIGHT_GREEN_OVER_BLACK) state.bell = bell_STOP;
  set_morale_flag_screen_attributes(state, attr);
}

/* $A007 */
function in_permitted_area_end_bit(state, room_and_flags) {
  const room = state.room_index;
  if (room_and_flags & permitted_route_ROOM) return room === (room_and_flags & ~permitted_route_ROOM) ? 1 : 0;
  else if (room === room_0_OUTDOORS) return within_camp_bounds(room_and_flags, state.hero_mappos);
  return 0;
}

/* $A01A */
function within_camp_bounds(area, mappos) {
  const b = permitted_bounds[area];
  return (mappos.u >= b.x0 && mappos.u < b.x1 && mappos.v >= b.y0 && mappos.v < b.y1) ? 1 : 0;
}

/* $A035 */
function wave_morale_flag(state) {
  state.game_counter = u8(state.game_counter + 1);
  if (state.game_counter & 1) return;
  const morale = state.morale;
  if (morale !== state.displayed_morale) {
    if (morale < state.displayed_morale) {
      state.displayed_morale--;
      state.moraleflag_screen_address = get_next_scanline(state, state.moraleflag_screen_address);
    } else {
      state.displayed_morale++;
      state.moraleflag_screen_address = get_prev_scanline(state, state.moraleflag_screen_address);
    }
  }
  const flag_bitmap = (state.game_counter & 2) ? state.D.flag_up : state.D.flag_down;
  plot_bitmap(state, flag_bitmap, 0, state.moraleflag_screen_address, 3, 25);
}

/* $A071 */
function set_morale_flag_screen_attributes(state, attrs) {
  let p = morale_flag_attributes_offset;
  for (let i = 0; i < 19; i++) { state.attrs[p] = attrs; state.attrs[p + 1] = attrs; state.attrs[p + 2] = attrs; p += state.width; }
}

/* $A082 */
function get_prev_scanline(state, addr) {
  let raddr = addr;
  if ((raddr & 0x0700) !== 0) raddr -= 256;
  else if ((raddr & 0x00FF) < 32) raddr -= 32;
  else raddr += 0x06E0;
  return raddr;
}

/* $A09E */
function ring_bell(state) {
  let bell = state.bell;
  if (bell === bell_STOP) return;
  if (bell !== bell_RING_PERPETUAL) {
    state.bell = --bell;
    if (bell === 0) { state.bell = bell_STOP; return; }
  }
  bell = state.screen[screenoffset_BELL_RINGER];
  if (bell !== 0x3F) {
    plot_ringer(state, bell_ringer_bitmap_on);
    play_speaker(state, sound_BELL_RINGER);
  } else {
    plot_ringer(state, bell_ringer_bitmap_off);
  }
}
function plot_ringer(state, src) { plot_bitmap(state, src, 0, screenoffset_BELL_RINGER, 1, 12); }

function increase_morale(state, delta) { let m = state.morale + delta; if (m >= morale_MAX) m = morale_MAX; state.morale = m; }
function decrease_morale(state, delta) { let m = state.morale - delta; if (m < morale_MIN) m = morale_MIN; state.morale = m; }
function increase_morale_by_10_score_by_50(state) { increase_morale(state, 10); increase_score(state, 50); }
function increase_morale_by_5_score_by_5(state) { increase_morale(state, 5); increase_score(state, 5); }

/* $A0F9 */
function increase_score(state, delta) {
  const d = state.score_digits;
  do {
    let p = 4;
    for (;;) {
      d[p]++;
      if (d[p] < 10) break;
      d[p--] = 0;
      if (p < 0) break;
    }
  } while (--delta);
  plot_score(state);
}

/* $A10B */
function plot_score(state) {
  let screen = score_address;
  for (let i = 0; i < 5; i++) {
    screen = plot_single_glyph(state, 48 + state.score_digits[i], screen);
    screen++;
  }
}

/* $A11D */
function play_speaker(state, sound) {
  if (state.speccy.sound) state.speccy.sound(state.speccy, sound);
}

/* $A15F */
function set_game_window_attributes(state, attrs) {
  let p = 0x0047;
  const stride = state.width - (state.columns - 1);
  for (let r = 0; r < state.rows - 1; r++) {
    for (let c = 0; c < state.columns - 1; c++) state.attrs[p++] = attrs;
    p += stride;
  }
}

/* $A50B */
function screen_reset(state) {
  wipe_visible_tiles(state);
  plot_interior_tiles(state);
  zoombox(state);
  plot_game_window(state);
  set_game_window_attributes(state, attribute_WHITE_OVER_BLACK);
}

/* $A51C: Hero has escaped. Conv: the key wait is host-driven. */
function escaped(state) {
  const messages = [[0x006E, "WELL DONE"], [0x00AA, "YOU HAVE ESCAPED"], [0x00CC, "FROM THE CAMP"], [0x0809, "AND WILL CROSS THE"],
    [0x0829, "BORDER SUCCESSFULLY"], [0x0809, "BUT WERE RECAPTURED"], [0x082A, "AND SHOT AS A SPY"], [0x0829, "TOTALLY UNPREPARED"],
    [0x082C, "TOTALLY LOST"], [0x0828, "DUE TO LACK OF PAPERS"], [0x100D, "PRESS ANY KEY"]];
  screen_reset(state);
  screenlocstring_plot(state, messages[0]); screenlocstring_plot(state, messages[1]); screenlocstring_plot(state, messages[2]);
  let itemflags = item_to_escapeitem(state.items_held[0]) | item_to_escapeitem(state.items_held[1]);
  if (itemflags === (escapeitem_COMPASS | escapeitem_PURSE)) {
    screenlocstring_plot(state, messages[3]); screenlocstring_plot(state, messages[4]);
    itemflags = 0xFF;
  } else if (itemflags !== (escapeitem_COMPASS | escapeitem_PAPERS)) {
    screenlocstring_plot(state, messages[5]);
    let message = null;
    if (itemflags < escapeitem_UNIFORM) {
      message = messages[7];
      if (itemflags) {
        message = messages[8];
        if (itemflags & escapeitem_COMPASS) message = messages[9];
      }
    } else message = messages[6];
    screenlocstring_plot(state, message);
  }
  screenlocstring_plot(state, messages[10]);
  // Debounce then wait for a key: host-driven.
  host_request(state, { type: 'anykey', resume: () => {
    if (itemflags === 0xFF || itemflags >= escapeitem_UNIFORM) reset_game(state);
    else solitary(state);
  } });
  throw GOTO_MAIN; // never returns to main_loop; the host resumes via pending.resume
}

function item_to_escapeitem(item) {
  switch (item) {
    case item_COMPASS: return escapeitem_COMPASS;
    case item_PAPERS: return escapeitem_PAPERS;
    case item_PURSE: return escapeitem_PURSE;
    case item_UNIFORM: return escapeitem_UNIFORM;
    default: return 0;
  }
}

/* $A5BF */
function screenlocstring_plot(state, slstring) {
  let screen = slstring[0];
  const str = slstring[1];
  for (let i = 0; i < str.length; i++) screen = plot_single_glyph(state, str.charCodeAt(i), screen);
}

/* $A7C9 */
function get_supertiles(state) {
  const v = state.map_position.y & ~3;
  let tiles = -MAPX + (v + (v >> 1)) * 9 + (state.map_position.x >> 2);
  let iters = state.st_rows;
  if (tiles + (state.st_rows - 1) * MAPX + state.st_columns > MAPX * MAPY) iters--;
  const map = state.D.map, buf = state.map_buf;
  let b = 0;
  do {
    for (let i = 0; i < state.st_columns; i++) { const t = tiles + i; buf[b + i] = (t >= 0 && t < map.length) ? map[t] : 0; }
    b += state.st_columns; tiles += MAPX;
  } while (--iters);
}

/* $A80A */
function plot_bottommost_tiles(state) { plot_horizontal_tiles_common(state, 24 * 16, 7 * 4, state.map_position.y, 24 * 16 * 8); }
function plot_topmost_tiles(state) { plot_horizontal_tiles_common(state, 0, 0, state.map_position.y, 0); }

/* $A826 */
function plot_horizontal_tiles_common(state, vistiles, maptiles, y, window) {
  const ST = state.D.supertiles, tb = state.tile_buf, mb = state.map_buf;
  const y_offset = (y & 3) * 4;
  const offset = (state.map_position.x & 3) + y_offset;
  let tiles = mb[maptiles] * 16 + offset;
  let A = -(tiles) & 3;
  if (A === 0) A = 4;
  let iters = A;
  do {
    const t = tb[vistiles++] = ST[tiles++];
    window = plot_tile(state, t, maptiles, window);
  } while (--iters);
  maptiles++;
  let iters2 = 5;
  do {
    tiles = mb[maptiles] * 16 + y_offset;
    iters = 4;
    do {
      const t = tb[vistiles++] = ST[tiles++];
      window = plot_tile(state, t, maptiles, window);
    } while (--iters);
    maptiles++;
  } while (--iters2);
  tiles = mb[maptiles] * 16 + y_offset;
  A = state.map_position.x & 3;
  if (A === 0) return;
  iters = A;
  do {
    const t = tb[vistiles++] = ST[tiles++];
    window = plot_tile(state, t, maptiles, window);
  } while (--iters);
}

/* $A8A2 */
function plot_all_tiles(state) {
  let vistiles = 0, maptiles = 0, window = 0, x = state.map_position.x;
  let iters = state.columns;
  do {
    plot_vertical_tiles_common(state, vistiles, maptiles, x, window);
    vistiles++;
    x = u8(x + 1);
    if ((x & 3) === 0) maptiles++;
    window++;
  } while (--iters);
}

/* $A8CF */
function plot_rightmost_tiles(state) {
  let maptiles = 6;
  let x = state.map_position.x & 3;
  if (x === 0) maptiles--;
  x = u8(state.map_position.x - 1);
  plot_vertical_tiles_common(state, 23, maptiles, x, 23);
}
function plot_leftmost_tiles(state) { plot_vertical_tiles_common(state, 0, 0, state.map_position.x, 0); }

/* $A8F4 */
function plot_vertical_tiles_common(state, vistiles, maptiles, x, window) {
  const ST = state.D.supertiles, tb = state.tile_buf, mb = state.map_buf;
  const x_offset = x & 3;
  const offset = (state.map_position.y & 3) * 4 + x_offset;
  let tiles = mb[maptiles] * 16 + offset;
  let iters = -((offset >> 2) & 3) & 3;
  if (iters === 0) iters = 4;
  do {
    const t = tb[vistiles] = ST[tiles];
    window = plot_tile_then_advance(state, t, maptiles, window);
    tiles += 4; vistiles += state.columns;
  } while (--iters);
  maptiles += 7;
  let iters2 = 3;
  do {
    tiles = mb[maptiles] * 16 + x_offset;
    iters = 4;
    do {
      const t = tb[vistiles] = ST[tiles];
      window = plot_tile_then_advance(state, t, maptiles, window);
      vistiles += state.columns; tiles += 4;
    } while (--iters);
    maptiles += 7;
  } while (--iters2);
  tiles = mb[maptiles] * 16 + x_offset;
  iters = (state.map_position.y & 3) + 1;
  do {
    const t = tb[vistiles] = ST[tiles];
    window = plot_tile_then_advance(state, t, maptiles, window);
    tiles += 4; vistiles += state.columns;
  } while (--iters);
}

function plot_tile_then_advance(state, tile_index, maptiles, scr) {
  return plot_tile(state, tile_index, maptiles, scr) + state.window_buf_stride - 1;
}

function exterior_tileset_base(supertileindex) {
  if (supertileindex <= 44) return 0;
  if (supertileindex <= 138 || supertileindex >= 204) return 145;
  return 365;
}

/* $A9AD */
function plot_tile(state, tile_index, maptiles, scr) {
  const base = exterior_tileset_base(state.map_buf[maptiles]);
  const ET = state.D.exterior_tiles, wb = state.window_buf;
  let src = (base + tile_index) * 8, dst = scr;
  for (let i = 0; i < 8; i++) { if (dst < wb.length) wb[dst] = ET[src]; src++; dst += state.columns; }
  return scr + 1;
}

/* $A9E4.. shunts */
function shunt_map_left(state) {
  state.map_position.x = u8(state.map_position.x + 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(0, 1, TILE_BUF_LENGTH);
  state.window_buf.copyWithin(0, 1, WINDOW_BUF_LENGTH);
  plot_rightmost_tiles(state);
}
function shunt_map_right(state) {
  state.map_position.x = u8(state.map_position.x - 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(1, 0, TILE_BUF_LENGTH - 1);
  state.window_buf.copyWithin(1, 0, WINDOW_BUF_LENGTH - 1);
  plot_leftmost_tiles(state);
}
function shunt_map_up_right(state) {
  state.map_position.x = u8(state.map_position.x - 1); state.map_position.y = u8(state.map_position.y + 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(1, 24, TILE_BUF_LENGTH);
  state.window_buf.copyWithin(1, 24 * 8, WINDOW_BUF_LENGTH);
  plot_bottommost_tiles(state);
  plot_leftmost_tiles(state);
}
function shunt_map_up(state) {
  state.map_position.y = u8(state.map_position.y + 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(0, 24, TILE_BUF_LENGTH);
  state.window_buf.copyWithin(0, 24 * 8, WINDOW_BUF_LENGTH);
  plot_bottommost_tiles(state);
}
function shunt_map_down(state) {
  state.map_position.y = u8(state.map_position.y - 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(24, 0, TILE_BUF_LENGTH - 24);
  state.window_buf.copyWithin(24 * 8, 0, WINDOW_BUF_LENGTH - 24 * 8);
  plot_topmost_tiles(state);
}
function shunt_map_down_left(state) {
  state.map_position.x = u8(state.map_position.x + 1); state.map_position.y = u8(state.map_position.y - 1);
  get_supertiles(state);
  state.tile_buf.copyWithin(24, 1, 1 + TILE_BUF_LENGTH - 24 - 1);
  state.window_buf.copyWithin(24 * 8, 1, 1 + WINDOW_BUF_LENGTH - 24 * 8 - 1);
  plot_topmost_tiles(state);
  plot_rightmost_tiles(state);
}

/* $AAB2 */
function move_map(state) {
  if (state.room_index > room_0_OUTDOORS) return;
  const hero = state.vischars[0];
  if (hero.counter_and_flags & vischar_BYTE7_DONT_MOVE_MAP) return;
  const anim = animations[hero.anim];
  let map_direction = anim.map_direction;
  if (map_direction === 255) return;
  if (hero.animindex & vischar_ANIMINDEX_REVERSE) map_direction ^= 2;
  let y = 124, x = 0;
  if (map_direction >= direction_BOTTOM_RIGHT) y = 0;
  if (map_direction !== direction_TOP_RIGHT && map_direction !== direction_BOTTOM_RIGHT) x = 192;
  if (state.map_position.x === x || state.map_position.y === y) return;
  if (map_direction <= direction_TOP_RIGHT) state.move_map_y++;
  else state.move_map_y--;
  state.move_map_y &= 3;
  const m = state.move_map_y;
  switch (m) {
    case 0: state.game_window_offset.x = 0x00; state.game_window_offset.y = 0x00; break;
    case 1: state.game_window_offset.x = 0x30; state.game_window_offset.y = 0xFF; break;
    case 2: state.game_window_offset.x = 0x60; state.game_window_offset.y = 0x00; break;
    case 3: state.game_window_offset.x = 0x90; state.game_window_offset.y = 0xFF; break;
  }
  switch (map_direction) {
    case direction_TOP_LEFT: if (m === 0) shunt_map_up(state); else if (m & 1) shunt_map_left(state); break;
    case direction_TOP_RIGHT: if (m === 0) shunt_map_up_right(state); else if (m === 2) shunt_map_right(state); break;
    case direction_BOTTOM_RIGHT: if (m === 3) shunt_map_down(state); else if ((m & 1) === 0) shunt_map_right(state); break;
    case direction_BOTTOM_LEFT: if (m === 1) shunt_map_left(state); else if (m === 3) shunt_map_down_left(state); break;
  }
}

/* $AB6B */
function choose_game_window_attributes(state) {
  let attr;
  if (state.room_index < room_29_SECOND_TUNNEL_START) {
    if (state.day_or_night === 0) attr = attribute_WHITE_OVER_BLACK;
    else if (state.room_index === room_0_OUTDOORS) attr = attribute_BRIGHT_BLUE_OVER_BLACK;
    else attr = attribute_CYAN_OVER_BLACK;
  } else {
    if (state.items_held[0] === item_TORCH || state.items_held[1] === item_TORCH) attr = attribute_RED_OVER_BLACK;
    else {
      wipe_visible_tiles(state);
      plot_interior_tiles(state);
      attr = attribute_BLUE_OVER_BLACK;
    }
  }
  state.game_window_attribute = attr;
  return attr;
}

/* $AD59 */
function searchlight_movement(slstate) {
  const REVERSE = 128;
  let x = slstate.xy.x, y = slstate.xy.y;
  slstate.counter = u8(slstate.counter - 1);
  if (slstate.counter === 0) {
    let index = slstate.index;
    if (index & REVERSE) {
      index &= ~REVERSE;
      if (index === 0) slstate.index &= ~REVERSE;
      else { slstate.index--; index--; }
    } else {
      slstate.index = ++index;
    }
    let ptr = index * 2;
    if (slstate.ptr[ptr] === 255) {
      slstate.index--;
      slstate.index |= REVERSE;
      ptr -= 2;
    }
    slstate.counter = slstate.ptr[ptr];
    slstate.direction = slstate.ptr[ptr + 1];
  } else {
    let direction = slstate.direction;
    if (slstate.index & REVERSE) direction ^= 2;
    if (direction <= direction_TOP_RIGHT) y = u8(y - 1); else y = u8(y + 1);
    if (direction !== direction_TOP_LEFT && direction !== direction_BOTTOM_LEFT) x = u8(x + 2); else x = u8(x - 2);
    slstate.xy.x = x; slstate.xy.y = y;
  }
}

/* $ADBD */
function nighttime(state) {
  let map_x, map_y, slstate, iters;
  let clip_left, column, row;
  const plot = (xy) => {
    clip_left = 0;
    column = i16(xy.x - map_x);
    if (column < 0) clip_left = 255;
    row = i16(xy.y - map_y);
    const attrs = 0x46 + row * state.width + column;
    searchlight_plot(state, attrs, clip_left);
  };
  if (state.searchlight_state !== searchlight_STATE_SEARCHING) {
    if (state.room_index > room_0_OUTDOORS) { state.searchlight_state = searchlight_STATE_SEARCHING; return; }
    if (state.searchlight_state === searchlight_STATE_CAUGHT) {
      map_x = u8(state.map_position.x + 4); map_y = state.map_position.y;
      let caught_x = state.searchlight.caught_coord.x, caught_y = state.searchlight.caught_coord.y;
      if (caught_x === map_x) {
        if (caught_y === map_y) return;
      } else {
        if (caught_x < map_x) caught_x = u8(caught_x + 1); else caught_x = u8(caught_x - 1);
      }
      if (caught_y !== map_y) { if (caught_y < map_y) caught_y = u8(caught_y + 1); else caught_y = u8(caught_y - 1); }
      state.searchlight.caught_coord.x = caught_x; state.searchlight.caught_coord.y = caught_y;
    }
    map_x = state.map_position.x; map_y = state.map_position.y;
    plot(state.searchlight.caught_coord);
    return;
  }
  iters = 3;
  for (let i = 0; i < 3; i++) {
    slstate = state.searchlight.states[i];
    searchlight_movement(slstate);
    searchlight_caught(state, slstate);
    map_x = state.map_position.x; map_y = state.map_position.y;
    if (slstate.xy.x + 16 < map_x || slstate.xy.x >= map_x + state.columns || slstate.xy.y + 16 < map_y || slstate.xy.y >= map_y + state.rows) continue;
    plot(slstate.xy);
  }
}

/* $AE78 */
function searchlight_caught(state, slstate) {
  const mappos_y = state.map_position.y, mappos_x = state.map_position.x, x = slstate.xy.x, y = slstate.xy.y;
  if (x + 5 >= mappos_x + 12 || x + 10 < mappos_x + 10 || y + 5 >= mappos_y + 10 || y + 12 <= mappos_y + 6) return;
  if (state.searchlight_state === searchlight_STATE_CAUGHT) return;
  state.searchlight_state = searchlight_STATE_CAUGHT;
  state.searchlight.caught_coord.y = slstate.xy.y; state.searchlight.caught_coord.x = slstate.xy.x;
  state.bell = bell_RING_PERPETUAL;
  decrease_morale(state, 10);
}

/* $AEB8: Searchlight plotter. 'attrs' is an attribute offset (can be out of bounds). */
function searchlight_plot(state, attrs, clip_left) {
  const A = state.attrs, W = state.width;
  let shape = 0, iters = 16;
  do {
    let x = ((attrs % W) + W) % W;
    let max_y_attrs = 18 * W;
    if (clip_left) { if (x >= 22) max_y_attrs = 19 * W; }
    if (attrs >= max_y_attrs) return;
    const saved_attrs = attrs;
    let min_y_attrs = 2 * W;
    if (clip_left) { if (x >= 7) min_y_attrs = 1 * W; }
    let skiprow = false;
    if (attrs < min_y_attrs) { shape += 2; skiprow = true; }
    if (!skiprow) {
      let iters2 = 2;
      let done = false;
      do {
        let pixels = searchlight_shape[shape];
        let iters3 = 8;
        do {
          x = ((attrs % W) + W) % W;
          let plot = true;
          if (clip_left) {
            if (x >= 22) plot = false;
          } else {
            if (x >= 30) { shape += iters2; done = true; break; }
          }
          if (x < 7) plot = false;
          const carry = (pixels >> 7) & 1;
          pixels = u8(pixels << 1);
          if (plot) {
            if (attrs >= 0 && attrs < A.length) A[attrs] = carry ? attribute_YELLOW_OVER_BLACK : attribute_BRIGHT_BLUE_OVER_BLACK;
          }
          attrs++;
        } while (--iters3);
        if (done) break;
        shape++;
      } while (--iters2);
    }
    attrs = saved_attrs + W;
  } while (--iters);
}

/* $AF8F */
function touch(state, vischar, sprite_index) {
  vischar.counter_and_flags |= vischar_BYTE7_DONT_MOVE_MAP | vischar_DRAWABLE;
  if (vischar === state.vischars[0] && state.automatic_player_counter > 0) door_handling(state, vischar);
  if (vischar.index > 0 || ((state.vischars[0].flags & (vischar_FLAGS_PICKING_LOCK | vischar_FLAGS_CUTTING_WIRE)) !== vischar_FLAGS_CUTTING_WIRE))
    if (bounds_check(state, vischar)) return 1;
  if (vischar.character <= character_25_PRISONER_6)
    if (collision(state)) return 1;
  vischar.counter_and_flags &= ~vischar_BYTE7_DONT_MOVE_MAP;
  vischar.mi.mappos.u = state.saved_mappos.u; vischar.mi.mappos.v = state.saved_mappos.v; vischar.mi.mappos.w = state.saved_mappos.w;
  vischar.mi.sprite_index = sprite_index;
  return 0;
}

/* $AFDF */
function collision(state) {
  const IY = state.IY;
  for (let i = 0; i < 8; i++) {
    const vischar = state.vischars[i];
    if (vischar.flags & vischar_FLAGS_NO_COLLIDE) continue;
    const u = vischar.mi.mappos.u, saved_u = state.saved_mappos.u;
    if (saved_u !== u + 4) if (saved_u > u + 4 || saved_u < u - 4) continue;
    const v = vischar.mi.mappos.v, saved_v = state.saved_mappos.v;
    if (saved_v !== v + 4) if (saved_v > v + 4 || saved_v < v - 4) continue;
    let delta = i8(state.saved_mappos.w - vischar.mi.mappos.w);
    if (delta < 0) delta = -delta;
    if (delta >= 24) continue;
    if ((IY.flags & vischar_FLAGS_PURSUIT_MASK) === vischar_PURSUIT_PURSUE) {
      if (vischar === state.vischars[0]) {
        if (IY.character === state.bribed_character) accept_bribe(state);
        else solitary(state);
      }
    }
    const character = vischar.character;
    if (character >= character_26_STOVE_1) {
      let useU = false;
      let range = 7, centre = 35;
      let direction = IY.direction;
      if (character === character_28_CRATE) { useU = true; centre = 54; direction ^= 1; }
      const get = () => useU ? vischar.mi.mappos.u : vischar.mi.mappos.v;
      const set = (val) => { if (useU) vischar.mi.mappos.u = u16(val); else vischar.mi.mappos.v = u16(val); };
      switch (direction) {
        case direction_TOP_LEFT: { const coord = u8(get()); if (coord !== centre) { if (coord > centre) set(get() - 1); else set(get() + 1); } break; }
        case direction_TOP_RIGHT: if (get() !== centre + range) set(get() + 1); break;
        case direction_BOTTOM_RIGHT: set(centre - range); break;
        case direction_BOTTOM_LEFT: if (get() !== centre - range) set(get() - 1); break;
      }
    }
    const input = vischar.input & ~input_KICK;
    if (input) {
      if ((vischar.direction ^ 2) !== IY.direction) {
        IY.input = input_KICK;
        IY.counter_and_flags = (IY.counter_and_flags & ~vischar_BYTE7_COUNTER_MASK) | 5;
        return 1;
      }
    }
    const new_inputs = [input_DOWN + input_LEFT + input_KICK, input_UP + input_LEFT + input_KICK, input_UP + input_RIGHT + input_KICK, input_DOWN + input_RIGHT + input_KICK];
    const new_direction = IY.direction & vischar_DIRECTION_MASK;
    IY.input = new_inputs[new_direction];
    if ((new_direction & 1) === 0) IY.counter_and_flags &= ~vischar_BYTE7_V_DOMINANT;
    else IY.counter_and_flags |= vischar_BYTE7_V_DOMINANT;
    IY.counter_and_flags = (IY.counter_and_flags & ~vischar_BYTE7_COUNTER_MASK) | 5;
    return 1;
  }
  return 0;
}

/* $B107 */
function accept_bribe(state) {
  increase_morale_by_10_score_by_50(state);
  state.IY.flags = 0;
  get_target_assign_pos(state, state.IY, state.IY.route);
  let slot = -1;
  if (state.items_held[0] === item_BRIBE) slot = 0; else if (state.items_held[1] === item_BRIBE) slot = 1;
  if (slot < 0) return;
  state.items_held[slot] = item_NONE;
  state.item_structs[item_BRIBE].room_and_flags = itemstruct_ROOM_NONE;
  draw_all_items(state);
  for (let i = 1; i < 8; i++) if (state.vischars[i].character <= character_19_GUARD_DOG_4) state.vischars[i].flags = vischar_PURSUIT_SAW_BRIBE;
  queue_message(state, message_HE_TAKES_THE_BRIBE);
  queue_message(state, message_AND_ACTS_AS_DECOY);
}

/* $B14C */
function bounds_check(state, vischar) {
  if (state.room_index > room_0_OUTDOORS) return interior_bounds_check(state, vischar);
  const s = state.saved_mappos;
  for (const wall of walls) {
    const minx = wall.minx * 8, maxx = wall.maxx * 8, miny = wall.miny * 8, maxy = wall.maxy * 8, minh = wall.minheight * 8, maxh = wall.maxheight * 8;
    if (s.u >= minx + 2 && s.u < maxx + 4 && s.v >= miny && s.v < maxy + 4 && s.w >= minh && s.w < maxh + 2) {
      vischar.counter_and_flags ^= vischar_BYTE7_V_DOMINANT;
      return 1;
    }
  }
  return 0;
}

/* $B1D4 */
function is_door_locked(state) {
  const cur = state.current_door & ~door_REVERSE;
  for (let i = 0; i < 11; i++) {
    const d = state.locked_doors[i];
    if ((d & ~door_LOCKED) === cur) {
      if ((d & door_LOCKED) === 0) return 0;
      queue_message(state, message_THE_DOOR_IS_LOCKED);
      return 1;
    }
  }
  return 0;
}

/* $B1F5 */
function door_handling(state, vischar) {
  if (state.room_index > room_0_OUTDOORS) { door_handling_interior(state, vischar); return; }
  let door_pos = 0;
  const direction = vischar.direction;
  if (direction >= direction_BOTTOM_RIGHT) door_pos = 1;
  let iters = 16;
  do {
    if ((DOORS[door_pos].room_and_direction & door_FLAGS_MASK_DIRECTION) === direction)
      if (door_in_range(state, DOORS[door_pos]) === 0) break;
    door_pos += 2;
  } while (--iters);
  if (iters === 0) return;
  state.current_door = 16 - iters;
  if (is_door_locked(state)) return;
  vischar.room = (DOORS[door_pos].room_and_direction & ~door_FLAGS_MASK_DIRECTION) >> 2;
  if ((DOORS[door_pos].room_and_direction & door_FLAGS_MASK_DIRECTION) < direction_BOTTOM_RIGHT) transition(state, DOORS[door_pos + 1].mappos);
  else transition(state, DOORS[door_pos - 1].mappos);
}

/* $B252 */
function door_in_range(state, door) {
  const halfdist = 3;
  const u = door.mappos.u * 4;
  if (state.saved_mappos.u < u - halfdist || state.saved_mappos.u >= u + halfdist) return 1;
  const v = door.mappos.v * 4;
  if (state.saved_mappos.v < v - halfdist || state.saved_mappos.v >= v + halfdist) return 1;
  return 0;
}

/* $B29F */
function interior_bounds_check(state, vischar) {
  const rb = roomdef_dimensions[state.roomdef_dimensions_index];
  const s = state.saved_mappos;
  let hit = false;
  if (s.u <= rb.x0 + 4 || s.u > rb.x1 || s.v <= rb.y0 || s.v > rb.y1 - 4) hit = true;
  if (!hit) {
    for (let n = 0; n < state.roomdef_object_bounds_count; n++) {
      const ob = state.roomdef_object_bounds[n];
      const u = u8(s.u);
      if (u < ob.x0 || u >= ob.x1) continue;
      const v = u8(s.v);
      if (v < ob.y0 || v >= ob.y1) continue;
      hit = true; break;
    }
  }
  if (hit) { vischar.counter_and_flags ^= vischar_BYTE7_V_DOMINANT; return 1; }
  return 0;
}

/* $B2FC */
function reset_outdoors(state) {
  calc_vischar_isopos_from_vischar(state, state.vischars[0]);
  state.map_position.x = u8((state.vischars[0].isopos.x >> 3) - 11);
  state.map_position.y = u8((state.vischars[0].isopos.y >> 3) - 6);
  state.room_index = room_0_OUTDOORS;
  get_supertiles(state);
  plot_all_tiles(state);
  setup_movable_items(state);
  zoombox(state);
}

/* $B32D */
function door_handling_interior(state, vischar) {
  for (let i = 0; i < 4; i++) {
    const current_door = state.interior_doors[i];
    if (current_door === interiordoor_NONE) return;
    state.current_door = current_door;
    const di = get_door(current_door);
    const door = DOORS[di];
    const room_and_flags = door.room_and_direction;
    if ((vischar.direction & vischar_DIRECTION_MASK) !== (room_and_flags & door_FLAGS_MASK_DIRECTION)) continue;
    const mappos = state.saved_mappos;
    const u = door.mappos.u;
    if (u - 3 >= mappos.u || u + 3 < mappos.u) continue;
    const v = door.mappos.v;
    if (v - 3 >= mappos.v || v + 3 < mappos.v) continue;
    if (is_door_locked(state)) return;
    vischar.room = room_and_flags >> 2;
    let dm = DOORS[di + 1].mappos;
    if (state.current_door & door_REVERSE) dm = DOORS[di - 1].mappos;
    transition(state, dm);
    return;
  }
}

/* $B387 */
function action_red_cross_parcel(state) {
  state.item_structs[item_RED_CROSS_PARCEL].room_and_flags = room_NONE & itemstruct_ROOM_MASK;
  const slot = state.items_held[0] !== item_RED_CROSS_PARCEL ? 1 : 0;
  state.items_held[slot] = item_NONE;
  draw_all_items(state);
  drop_item_tail(state, state.red_cross_parcel_current_contents);
  queue_message(state, message_YOU_OPEN_THE_BOX);
  increase_morale_by_10_score_by_50(state);
}

/* $B3A8 */
function action_bribe(state) {
  for (let i = 1; i < 8; i++) {
    const vischar = state.vischars[i];
    const character = vischar.character;
    if (character !== character_NONE && character >= character_20_PRISONER_1) {
      state.bribed_character = character;
      vischar.flags = vischar_PURSUIT_PURSUE;
      return;
    }
  }
}

/* $B3C4 */
function action_poison(state) {
  if (state.items_held[0] !== item_FOOD && state.items_held[1] !== item_FOOD) return;
  if (state.item_structs[item_FOOD].item_and_flags & itemstruct_ITEM_FLAG_POISONED) return;
  state.item_structs[item_FOOD].item_and_flags |= itemstruct_ITEM_FLAG_POISONED;
  state.item_attributes[item_FOOD] = attribute_BRIGHT_PURPLE_OVER_BLACK;
  draw_all_items(state);
  increase_morale_by_10_score_by_50(state);
}

/* $B3E1 */
function action_uniform(state) {
  if (state.vischars[0].mi.sprite === sprite_GUARD_FACING_AWAY_1) return;
  if (state.room_index >= room_29_SECOND_TUNNEL_START) return;
  state.vischars[0].mi.sprite = sprite_GUARD_FACING_AWAY_1;
  increase_morale_by_10_score_by_50(state);
}

/* $B3F6 */
function action_shovel(state) {
  if (state.room_index !== room_50_BLOCKED_TUNNEL) return;
  if (get_roomdef(state, room_50_BLOCKED_TUNNEL, roomdef_50_BOUNDARY) === 255) return;
  set_roomdef(state, room_50_BLOCKED_TUNNEL, roomdef_50_BOUNDARY, 255);
  set_roomdef(state, room_50_BLOCKED_TUNNEL, roomdef_50_BLOCKAGE, interiorobject_STRAIGHT_TUNNEL_SW_NE);
  setup_room(state);
  choose_game_window_attributes(state);
  plot_interior_tiles(state);
  increase_morale_by_10_score_by_50(state);
}

/* $B416 */
function action_wiresnips(state) {
  const mappos = state.hero_mappos;
  let flag = -1;
  for (let i = 12; i < 16; i++) {
    const wall = walls[i];
    let coord = mappos.v;
    if (coord >= wall.miny && coord < wall.maxy) {
      coord = mappos.u;
      if (coord === wall.maxx) { flag = direction_TOP_LEFT | vischar_DIRECTION_CRAWL; break; }
      if (coord - 1 === wall.maxx) { flag = direction_BOTTOM_RIGHT | vischar_DIRECTION_CRAWL; break; }
    }
  }
  if (flag < 0) {
    for (let i = 16; i < 19; i++) {
      const wall = walls[i];
      let coord = mappos.u;
      if (coord >= wall.minx && coord < wall.maxx) {
        coord = mappos.v;
        if (coord === wall.miny) { flag = direction_TOP_RIGHT | vischar_DIRECTION_CRAWL; break; }
        if (coord - 1 === wall.miny) { flag = direction_BOTTOM_LEFT | vischar_DIRECTION_CRAWL; break; }
      }
    }
  }
  if (flag < 0) return;
  const hero = state.vischars[0];
  hero.direction = flag; hero.input = input_KICK; hero.flags = vischar_FLAGS_CUTTING_WIRE;
  hero.mi.mappos.w = 12; hero.mi.sprite = sprite_PRISONER_FACING_AWAY_1;
  state.player_locked_out_until = u8(state.game_counter + 96);
  queue_message(state, message_CUTTING_THE_WIRE);
}

/* $B495 */
function action_lockpick(state) {
  const pdoor = get_nearest_door(state);
  if (pdoor < 0) return;
  state.ptr_to_door_being_lockpicked = pdoor;
  state.player_locked_out_until = u8(state.game_counter + 255);
  state.vischars[0].flags = vischar_FLAGS_PICKING_LOCK;
  queue_message(state, message_PICKING_THE_LOCK);
}

function action_red_key(state) { action_key(state, room_22_REDKEY); }
function action_yellow_key(state) { action_key(state, room_13_CORRIDOR); }
function action_green_key(state) { action_key(state, room_14_TORCH); }

/* $B4B8 */
function action_key(state, room_of_key) {
  const pdoor = get_nearest_door(state);
  if (pdoor < 0) return;
  let message;
  if ((state.locked_doors[pdoor] & ~door_LOCKED) !== room_of_key) message = message_INCORRECT_KEY;
  else {
    state.locked_doors[pdoor] &= ~door_LOCKED;
    increase_morale_by_10_score_by_50(state);
    message = message_IT_IS_OPEN;
  }
  queue_message(state, message);
}

/* $B4D0: returns index into locked_doors or -1 */
function get_nearest_door(state) {
  if (state.room_index === room_0_OUTDOORS) {
    for (let i = 0; i < 5; i++) {
      const di = get_door(state.locked_doors[i] & ~door_LOCKED);
      if (door_in_range(state, DOORS[di]) === 0 || door_in_range(state, DOORS[di + 1]) === 0) return i;
    }
    return -1;
  } else {
    for (let i = 2; i < 10; i++) { // BUG preserved: iters is 8 not 7
      const locked_door_index = state.locked_doors[i] & ~door_LOCKED;
      let found = -1;
      for (let j = 0; j < 4; j++) {
        const idi = state.interior_doors[j];
        if (idi === interiordoor_NONE) break;
        if ((idi & ~door_REVERSE) === locked_door_index) { found = idi; break; }
      }
      if (found < 0) continue;
      const door = DOORS[get_door(found)];
      const mappos = state.saved_mappos;
      if (mappos.u <= door.mappos.u - 3 || mappos.u > door.mappos.u + 3 || mappos.v <= door.mappos.v - 3 || mappos.v > door.mappos.v + 3) continue;
      return i;
    }
    return -1;
  }
}

/* $B5CE: Animate all visible characters. */
function animate(state) {
  for (let i = 0; i < 8; i++) {
    const vischar = state.vischars[i];
    state.IY = vischar;
    if (vischar.flags === vischar_FLAGS_EMPTY_SLOT) continue;
    vischar.flags |= vischar_FLAGS_NO_COLLIDE;
    let frame = null, spriteindex = 0, backwards = false;
    let doInit = false;
    if (vischar.input & input_KICK) {
      vischar.input &= ~input_KICK;
      doInit = true;
    } else {
      const animA = animations[vischar.anim];
      let animindex = vischar.animindex;
      if (animindex & vischar_ANIMINDEX_REVERSE) {
        animindex &= ~vischar_ANIMINDEX_REVERSE;
        if (animindex === 0x7F) doInit = true;
        else { frame = animA.frames[animindex]; spriteindex = frame.spriteindex; backwards = true; }
      } else {
        if (animindex === animA.nframes) doInit = true;
        else { frame = animA.frames[animindex]; backwards = false; }
      }
    }
    if (doInit) {
      const newanimindex = animindices[vischar.direction][vischar.input];
      const animB = animations[newanimindex & ~128];
      vischar.anim = newanimindex & ~128;
      if ((newanimindex & 128) === 0) {
        vischar.animindex = 0;
        vischar.direction = animB.to;
        frame = animB.frames[0];
        backwards = false;
      } else {
        const length = animB.nframes;
        vischar.animindex = (length - 1) | vischar_ANIMINDEX_REVERSE;
        vischar.direction = animB.from;
        frame = animB.frames[length - 1];
        spriteindex = frame.spriteindex;
        backwards = true;
      }
    }
    const m = vischar.mi.mappos;
    if (backwards) {
      state.saved_mappos.u = u16(m.u - frame.dx); state.saved_mappos.v = u16(m.v - frame.dy); state.saved_mappos.w = u16(m.w - frame.dh);
      if (!touch(state, vischar, spriteindex)) {
        vischar.animindex = u8(vischar.animindex - 1) | vischar_ANIMINDEX_REVERSE;
        calc_vischar_isopos_from_state(state, vischar);
      }
    } else {
      state.saved_mappos.u = u16(m.u + frame.dx); state.saved_mappos.v = u16(m.v + frame.dy); state.saved_mappos.w = u16(m.w + frame.dh);
      spriteindex = frame.spriteindex;
      if (!touch(state, vischar, spriteindex)) {
        vischar.animindex++;
        calc_vischar_isopos_from_state(state, vischar);
      }
    }
    if (vischar.flags !== vischar_FLAGS_EMPTY_SLOT) vischar.flags &= ~vischar_FLAGS_NO_COLLIDE;
  }
}

/* $B71B */
function calc_vischar_isopos_from_vischar(state, vischar) {
  state.saved_mappos.u = vischar.mi.mappos.u; state.saved_mappos.v = vischar.mi.mappos.v; state.saved_mappos.w = vischar.mi.mappos.w;
  calc_vischar_isopos_from_state(state, vischar);
}
function calc_vischar_isopos_from_state(state, vischar) {
  const s = state.saved_mappos;
  vischar.isopos.x = u16((0x200 - s.u + s.v) * 2);
  vischar.isopos.y = u16(0x800 - s.u - s.v - s.w);
}

/* $B75A */
function reset_game(state) {
  for (let item = 0; item < item__LIMIT; item++) item_discovered(state, item);
  state.messages.queue_pointer = 2;
  reset_map_and_characters(state);
  state.vischars[0].flags = 0;
  state.score_digits = [0, 0, 0, 0, 0];
  state.hero_in_breakfast = 0; state.red_flag = 0; state.automatic_player_counter = 0; state.in_solitary = 0; state.morale_exhausted = 0;
  state.morale = morale_MAX;
  plot_score(state);
  state.items_held[0] = item_NONE; state.items_held[1] = item_NONE;
  draw_all_items(state);
  state.vischars[0].mi.sprite = sprite_PRISONER_FACING_AWAY_1;
  state.room_index = room_2_HUT2LEFT;
  hero_sleeps(state);
  state.bribed_character = character_NONE;
  state.movable_items[0].mappos = { u: 62, v: 35, w: 16 };
  state.movable_items[1].mappos = { u: 55, v: 54, w: 14 };
  state.movable_items[2].mappos = { u: 62, v: 35, w: 16 };
  enter_room(state);
}

/* $B79B */
function reset_map_and_characters(state) {
  const character_reset_data = [[room_3_HUT2RIGHT, 40, 60], [room_3_HUT2RIGHT, 36, 48], [room_5_HUT3RIGHT, 40, 60], [room_5_HUT3RIGHT, 36, 34],
    [room_NONE, 52, 60], [room_NONE, 52, 44], [room_NONE, 52, 28], [room_NONE, 52, 60], [room_NONE, 52, 44], [room_NONE, 52, 28]];
  for (let i = 1; i < 8; i++) reset_visible_character(state, state.vischars[i]);
  state.clock = 7; state.day_or_night = 0; state.vischars[0].flags = 0;
  set_roomdef(state, room_50_BLOCKED_TUNNEL, roomdef_50_BLOCKAGE, interiorobject_COLLAPSED_TUNNEL_SW_NE);
  set_roomdef(state, room_50_BLOCKED_TUNNEL, roomdef_50_BOUNDARY, 52);
  for (let i = 0; i < 9; i++) state.locked_doors[i] |= door_LOCKED;
  for (const b of beds) set_roomdef(state, b[0], b[1], interiorobject_OCCUPIED_BED);
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_A, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_B, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_23_MESS_HALL, roomdef_23_BENCH_C, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_D, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_E, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_F, interiorobject_EMPTY_BENCH);
  set_roomdef(state, room_25_MESS_HALL, roomdef_25_BENCH_G, interiorobject_EMPTY_BENCH);
  let ci = character_12_GUARD_12;
  for (let i = 0; i < 10; i++) {
    const charstr = state.character_structs[ci];
    const r = character_reset_data[i];
    charstr.room = r[0]; charstr.mappos.u = r[1]; charstr.mappos.v = r[2]; charstr.mappos.w = 18;
    charstr.route.index = 0;
    ci++;
    if (10 - i === 7) ci = character_20_PRISONER_1;
  }
}

/* $B83B */
function searchlight_mask_test(state, vischar) {
  if (vischar.index > 0) return;
  let buf = 32 + 16 + 1;
  for (let i = 0; i < 8; i++) {
    if (state.mask_buffer[buf] !== 0) { state.searchlight_state = searchlight_STATE_CAUGHT; return; }
    buf += MASK_BUFFER_WIDTHBYTES;
  }
  state.searchlight_state = u8(state.searchlight_state - 1);
  if (state.searchlight_state === searchlight_STATE_SEARCHING) {
    set_game_window_attributes(state, choose_game_window_attributes(state));
  }
}

const item_FOUND = 1 << 6;

/* $B866 */
function plot_sprites(state) {
  const hook = state.speccy.onsprite;
  for (;;) {
    const r = get_next_drawable(state);
    if (!r.found) return;
    if ((r.index & item_FOUND) === 0) {
      const vischar = r.vischar;
      if (setup_vischar_plotting(state, vischar)) {
        render_mask_buffer(state);
        if (state.searchlight_state !== searchlight_STATE_SEARCHING) searchlight_mask_test(state, vischar);
        if (hook) hook(state, vischar, null);
        if (vischar.width_bytes !== 3) plot_masked_sprite_24px(state, vischar);
        else plot_masked_sprite_16px(state, vischar);
      }
    } else {
      if (setup_item_plotting(state, r.itemstruct, r.index)) {
        render_mask_buffer(state);
        if (hook) hook(state, null, r.itemstruct);
        plot_masked_sprite_16px_x_is_zero(state);
      }
    }
  }
}

/* $B89C */
function get_next_drawable(state) {
  let prev_u = 0, prev_v = 0, item_and_flag = item_NONE, found_vischar = null;
  for (let i = 0; i < 8; i++) {
    const vischar = state.vischars[i];
    if ((vischar.counter_and_flags & vischar_DRAWABLE) && vischar.mi.mappos.u >= prev_u - 4 && vischar.mi.mappos.v >= prev_v - 4) {
      item_and_flag = i;
      prev_v = vischar.mi.mappos.v; prev_u = vischar.mi.mappos.u;
      state.IY = found_vischar = vischar;
    }
  }
  const r = get_next_drawable_itemstruct(state, item_and_flag, prev_u, prev_v);
  item_and_flag = r.item_and_flag;
  if (item_and_flag & 128) return { found: 0, index: item_and_flag };
  if ((item_and_flag & item_FOUND) === 0) {
    found_vischar.counter_and_flags &= ~vischar_DRAWABLE;
    return { found: 1, index: item_and_flag, vischar: found_vischar, itemstruct: null };
  }
  r.itemstruct.room_and_flags &= ~itemstruct_ROOM_FLAG_NEARBY_6;
  return { found: 1, index: item_and_flag, vischar: null, itemstruct: r.itemstruct };
}

/* $B916: Render the mask buffer. */
function render_mask_buffer(state) {
  const MB = state.mask_buffer;
  MB.fill(255);
  let masks;
  if (state.room_index > room_0_OUTDOORS) {
    if (state.interior_mask_data_count === 0) return;
    masks = state.interior_mask_data;
  } else masks = state.D.exterior_mask_data;
  const masklist = state.D.masks;
  for (let mi = 0; mi < masks.length; mi++) {
    const pmask = masks[mi];
    const isopos_x = state.isopos.x, isopos_y = state.isopos.y;
    if (isopos_x - 1 >= pmask.bounds.x1 || isopos_x + 3 < pmask.bounds.x0 || isopos_y - 1 >= pmask.bounds.y1 || isopos_y + 4 < pmask.bounds.y0) continue;
    if (state.mappos_stash.u <= pmask.mappos.u || state.mappos_stash.v < pmask.mappos.v) continue;
    let height = state.mappos_stash.w;
    if (height) height--;
    if (height >= pmask.mappos.w) continue;
    let mask_left_skip, mask_run_width, mask_top_skip, mask_run_height;
    if (isopos_x >= pmask.bounds.x0) { mask_left_skip = isopos_x - pmask.bounds.x0; mask_run_width = Math.min(pmask.bounds.x1 - isopos_x, 3) + 1; }
    else { mask_left_skip = 0; mask_run_width = Math.min((pmask.bounds.x1 - pmask.bounds.x0) + 1, 4 - (pmask.bounds.x0 - isopos_x)); }
    if (isopos_y >= pmask.bounds.y0) { mask_top_skip = isopos_y - pmask.bounds.y0; mask_run_height = Math.min(pmask.bounds.y1 - isopos_y, 4) + 1; }
    else { mask_top_skip = 0; mask_run_height = Math.min((pmask.bounds.y1 - pmask.bounds.y0) + 1, 5 - (pmask.bounds.y0 - isopos_y)); }
    let buf_top_skip = 0, buf_left_skip = 0;
    if (mask_top_skip === 0) buf_top_skip = u8(pmask.bounds.y0 - state.isopos.y);
    if (mask_left_skip === 0) buf_left_skip = u8(pmask.bounds.x0 - state.isopos.x);
    const M = masklist[pmask.index];
    let maskbufptr = buf_top_skip * MASK_BUFFER_ROWBYTES + buf_left_skip;
    let mp = 0;
    const mask_row_skip = u8(M[0] - mask_run_width);
    const buf_row_skip = MASK_BUFFER_ROWBYTES - mask_run_width;
    let mask_skip = u16(mask_top_skip * M[0] + mask_left_skip + 1);
    let A;
    // Skip the initial clipped mask bytes.
    for (;;) {
      A = M[mp++];
      if (A & MASK_RUN_FLAG) {
        A &= ~MASK_RUN_FLAG;
        mask_skip = u16(mask_skip - A);
        if (i16(mask_skip) < 0) { A = u8(-(mask_skip & 0xFF)); break; }
        mp++;
        if (mask_skip > 0) continue;
        A = 0; break;
      }
      mask_skip = u16(mask_skip - 1);
      if (mask_skip === 0) { A = 0; break; }
    }
    // Draw.
    let Adash = 0xCC, t;
    let y_count = mask_run_height;
    let finished = false;
    do {
      let x_count = mask_run_width;
      do {
        t = A; A = Adash; Adash = t;
        A = M[mp];
        if (A & MASK_RUN_FLAG) { A &= ~MASK_RUN_FLAG; t = A; A = Adash; Adash = t; mp++; A = M[mp]; }
        if (A !== 0) mask_against_tile(state, A, maskbufptr);
        maskbufptr++;
        t = A; A = Adash; Adash = t;
        if (A === 0 || --A === 0) mp++;
      } while (--x_count);
      if (y_count === 1) { finished = true; break; }
      let right_skip = mask_row_skip;
      if (right_skip) {
        let dive = A !== 0;
        for (;;) {
          if (!dive) {
            A = M[mp++];
            if (!(A & MASK_RUN_FLAG)) {
              right_skip = u8(right_skip - 1);
              if (right_skip === 0) { A = 0; break; }
              continue;
            }
            A &= ~MASK_RUN_FLAG;
          }
          dive = false;
          right_skip = A = u8(right_skip - A);
          if (i8(right_skip) < 0) { A = u8(-A); break; }
          mp++;
          if (right_skip > 0) continue;
          break;
        }
      }
      maskbufptr += buf_row_skip;
    } while (--y_count);
  }
}

/* $BADC */
function mask_against_tile(state, index, dst) {
  const MT = state.D.mask_tiles, MB = state.mask_buffer;
  let row = index * 8;
  for (let i = 0; i < 8; i++) { MB[dst] &= MT[row++]; dst += MASK_BUFFER_WIDTHBYTES; }
}

/* $BAF7 */
function vischar_visible(state, vischar) {
  const window_right_edge = u8(state.map_position.x + state.columns);
  const available_right = i8(window_right_edge - state.isopos.x);
  if (available_right <= 0) return null;
  let new_left, new_width, new_top, new_height;
  if (available_right < vischar.width_bytes) { new_left = 0; new_width = available_right; }
  else {
    const vischar_right_edge = i8(state.isopos.x + vischar.width_bytes);
    const available_left = i8(vischar_right_edge - state.map_position.x);
    if (available_left <= 0) return null;
    if (available_left < vischar.width_bytes) { new_left = vischar.width_bytes - available_left; new_width = available_left; }
    else { new_left = 0; new_width = vischar.width_bytes; }
  }
  const window_bottom_edge = u16(state.map_position.y + state.rows);
  const available_bottom = u16(window_bottom_edge * 8 - vischar.isopos.y);
  if (available_bottom <= 0 || available_bottom >= 256) return null;
  if (available_bottom < vischar.height) { new_top = 0; new_height = available_bottom; }
  else {
    const vischar_bottom_edge = u16(vischar.isopos.y + vischar.height);
    const available_top = u16(vischar_bottom_edge - state.map_position.y * 8);
    if (available_top <= 0 || available_top >= 256) return null;
    if (available_top < vischar.height) { new_top = vischar.height - available_top; new_height = available_top; }
    else { new_top = 0; new_height = vischar.height; }
  }
  return { left_skip: u8(new_left), clipped_width: u8(new_width), top_skip: u8(new_top), clipped_height: u8(new_height) };
}

/* $BB98 */
function restore_tiles(state) {
  const wb = state.window_buf, tb = state.tile_buf;
  for (let i = 0; i < 8; i++) {
    const vischar = state.vischars[i];
    state.IY = vischar;
    if (vischar.flags === vischar_FLAGS_EMPTY_SLOT) continue;
    state.isopos.y = u8(vischar.isopos.y >> 3);
    state.isopos.x = u8(vischar.isopos.x >> 3);
    const vis = vischar_visible(state, vischar);
    if (vis === null) continue;
    let height = u8((vis.clipped_height >> 3) + 2);
    let bottom = i8(height + state.isopos.y - state.map_position.y);
    if (bottom >= 0) {
      bottom = i8(bottom - state.rows);
      if (bottom > 0) {
        const visible_height = i8(height - bottom);
        if (visible_height < 0) continue;
        else if (visible_height !== 0) height = visible_height;
        else continue;
      }
    }
    if (height > 5) height = 5;
    const width = vis.clipped_width;
    const tilebuf_skip = state.columns - width;
    const windowbuf_skip = tilebuf_skip + 7 * state.columns;
    let x = vis.left_skip === 0 ? u8(state.isopos.x - state.map_position.x) : 0;
    let y = vis.top_skip === 0 ? u8(state.isopos.y - state.map_position.y) : 0;
    let windowbuf = y * state.window_buf_stride + x;
    let tilebuf = x + y * state.columns;
    let height_counter = height;
    do {
      let width_counter = width;
      do {
        const tile = tb[tilebuf];
        const ts = select_tile_set(state, x, y);
        let w2 = windowbuf, tr = ts.base + tile * 8;
        for (let k = 0; k < 8; k++) { if (w2 >= 0 && w2 < wb.length) wb[w2] = ts.arr[tr]; tr++; w2 += state.columns; }
        x++; tilebuf++; windowbuf++;
      } while (--width_counter);
      x -= width; y++;
      tilebuf += tilebuf_skip; windowbuf += windowbuf_skip;
    } while (--height_counter);
  }
}

/* $BCAA */
function select_tile_set(state, x, y) {
  if (state.room_index !== room_0_OUTDOORS) return { arr: state.D.interior_tiles, base: 0 };
  const row_offset = ((((state.map_position.y & 3) + y) >> 2) & 0x3F) * state.st_columns;
  const offset = ((((state.map_position.x & 3) + x) >> 2) & 0x3F) + row_offset;
  const tile = state.map_buf[offset];
  let base = 0;
  if (tile >= 45) { base = 145 * 8; if (tile >= 139 && tile < 204) base = (145 + 220) * 8; }
  return { arr: state.D.exterior_tiles, base };
}
