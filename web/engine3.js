// The Great Escape - JavaScript engine port (part 3: characters, routes, sprite plotting)
'use strict';

/* $C41C */
function spawn_characters(state) {
  const GRACE = 8;
  const map_x = state.map_position.x, map_y = state.map_position.y;
  const map_x_clamped = map_x < GRACE ? 0 : map_x - GRACE;
  const map_y_clamped = map_y < GRACE ? 0 : map_y - GRACE;
  for (let i = 0; i < character_structs__LIMIT; i++) {
    const charstr = state.character_structs[i];
    if ((charstr.character_and_flags & characterstruct_FLAG_ON_SCREEN) === 0) {
      const room = state.room_index;
      if (room === charstr.room) {
        if (room === room_0_OUTDOORS) {
          const y = u8(0x100 - charstr.mappos.u - charstr.mappos.v - charstr.mappos.w);
          if (y <= map_y_clamped || y > Math.min(map_y_clamped + GRACE + 16 + GRACE, 0xFF)) continue;
          const x = u8((0x40 - charstr.mappos.u + charstr.mappos.v) * 2);
          if (x <= map_x_clamped || x > Math.min(map_x_clamped + GRACE + 24 + GRACE, 0xFF)) continue;
        }
        spawn_character(state, charstr);
      }
    }
  }
}

/* $C47E */
function purge_invisible_characters(state) {
  const GRACE = 9;
  const minx = Math.max(state.map_position.x - GRACE, 0), miny = Math.max(state.map_position.y - GRACE, 0);
  for (let i = 1; i < 8; i++) {
    const vischar = state.vischars[i];
    if (vischar.character === character_NONE) continue;
    let reset = false;
    if (state.room_index !== vischar.room) reset = true;
    else {
      const y = u8((vischar.isopos.y + 4) >> 3);
      if (y <= miny || y > Math.min(miny + GRACE + (state.rows - 1) + GRACE, 255)) reset = true;
      else {
        const x = u8(vischar.isopos.x >> 3);
        if (x <= minx || x > Math.min(minx + GRACE + state.columns + GRACE, 255)) reset = true;
      }
    }
    if (reset) reset_visible_character(state, vischar);
  }
}

/* $C4E0 */
function spawn_character(state, charstr) {
  if (charstr.character_and_flags & characterstruct_FLAG_ON_SCREEN) return;
  let vischar = null;
  for (let i = 1; i < 8; i++) if (state.vischars[i].character === character_NONE) { vischar = state.vischars[i]; break; }
  if (vischar === null) return;
  state.IY = vischar;
  const sm = state.saved_mappos;
  if (charstr.room === room_0_OUTDOORS) { sm.u = charstr.mappos.u * 8; sm.v = charstr.mappos.v * 8; sm.w = charstr.mappos.w * 8; }
  else { sm.u = charstr.mappos.u; sm.v = charstr.mappos.v; sm.w = charstr.mappos.w; }
  let Z = collision(state);
  if (Z === 0) Z = bounds_check(state, vischar);
  if (Z === 1) return;
  let character = charstr.character_and_flags | characterstruct_FLAG_ON_SCREEN;
  charstr.character_and_flags = character;
  character &= characterstruct_CHARACTER_MASK;
  vischar.character = character;
  vischar.flags = 0;
  let sprite = sprite_COMMANDANT_FACING_AWAY_1;
  if (character !== 0) { sprite = sprite_GUARD_FACING_AWAY_1; if (character >= 16) { sprite = sprite_DOG_FACING_AWAY_1; if (character >= 20) sprite = sprite_PRISONER_FACING_AWAY_1; } }
  vischar.mi.sprite = sprite;
  vischar.mi.mappos.u = sm.u; vischar.mi.mappos.v = sm.v; vischar.mi.mappos.w = sm.w;
  const room = state.room_index;
  vischar.room = room;
  if (room > room_0_OUTDOORS) { play_speaker(state, sound_CHARACTER_ENTERS_2); play_speaker(state, sound_CHARACTER_ENTERS_1); }
  vischar.route.index = charstr.route.index; vischar.route.step = charstr.route.step;
  let route = charstr.route;
  for (;;) {
    if (route.index !== routeindex_0_HALT) {
      state.entered_move_a_character = 0;
      const t = get_target(state, route);
      if (t.type === get_target_ROUTE_ENDS) {
        route_ended(state, vischar, vischar.route);
        route = vischar.route;
        continue;
      } else if (t.type === get_target_DOOR) {
        vischar.flags |= vischar_FLAGS_TARGET_IS_DOOR;
        const dm = DOORS[t.door].mappos;
        vischar.target.u = dm.u; vischar.target.v = dm.v; vischar.target.w = dm.w;
      } else {
        vischar.target.u = t.location.x; vischar.target.v = t.location.y;
      }
    }
    break;
  }
  vischar.counter_and_flags = 0;
  calc_vischar_isopos_from_vischar(state, vischar);
  character_behaviour(state, vischar);
}

/* $C5D3 */
function reset_visible_character(state, vischar) {
  const character = vischar.character;
  if (character === character_NONE) return;
  if (character >= character_26_STOVE_1) {
    vischar.character = character_NONE; vischar.flags = vischar_FLAGS_EMPTY_SLOT; vischar.counter_and_flags = 0;
    let mi;
    if (character === character_26_STOVE_1) mi = state.movable_items[movable_item_STOVE1];
    else if (character === character_27_STOVE_2) mi = state.movable_items[movable_item_STOVE2];
    else mi = state.movable_items[movable_item_CRATE];
    mi.mappos.u = vischar.mi.mappos.u; mi.mappos.v = vischar.mi.mappos.v; mi.mappos.w = vischar.mi.mappos.w;
  } else {
    const charstr = state.character_structs[character];
    charstr.character_and_flags &= ~characterstruct_FLAG_ON_SCREEN;
    const room = vischar.room;
    charstr.room = room;
    vischar.counter_and_flags = 0;
    if (room === room_0_OUTDOORS) scale_mappos_down(vischar.mi.mappos, charstr.mappos);
    else { charstr.mappos.u = u8(vischar.mi.mappos.u); charstr.mappos.v = u8(vischar.mi.mappos.v); charstr.mappos.w = u8(vischar.mi.mappos.w); }
    vischar.character = character_NONE; vischar.flags = vischar_FLAGS_EMPTY_SLOT;
    if (character >= character_16_GUARD_DOG_1 && character <= character_19_GUARD_DOG_4) {
      vischar.route.index = routeindex_255_WANDER; vischar.route.step = 0;
      if (character >= character_18_GUARD_DOG_3) { vischar.route.index = routeindex_255_WANDER; vischar.route.step = 24; }
    }
    charstr.route.index = vischar.route.index; charstr.route.step = vischar.route.step;
  }
}

const get_target_LOCATION = 0, get_target_DOOR = 128, get_target_ROUTE_ENDS = 255;

/* $C651: returns {type, door (flat DOORS index), location} */
function get_target(state, route) {
  let index;
  const routeindex = route.index;
  if (routeindex === routeindex_255_WANDER) {
    index = route.step & ~7;
    index |= random_nibble(state) & 7;
    route.step = index;
  } else {
    const step = route.step;
    const routebytes = get_route(routeindex);
    let routebyte;
    if (step === 255) routebyte = routebyte_END;
    else {
      if (routebytes === null) routebyte = 0xAF;
      else routebyte = routebytes[step];
      if (routebyte === undefined) routebyte = 0; // Conv: guard against reading past a route
    }
    if (routebyte === routebyte_END) return { type: get_target_ROUTE_ENDS };
    routebyte &= ~door_REVERSE;
    if (routebyte < 40) {
      routebyte = routebytes[step];
      if (route.index & ROUTEINDEX_REVERSE_FLAG) routebyte ^= door_REVERSE;
      return { type: get_target_DOOR, door: get_door(routebyte) };
    }
    index = routebyte - 40;
  }
  return { type: get_target_LOCATION, location: locations[index] };
}

/* $C6A0 */
function move_a_character(state) {
  state.entered_move_a_character = 255;
  let character = state.character_index + 1;
  if (character === character_26_STOVE_1) character = character_0_COMMANDANT;
  state.character_index = character;
  const charstr = state.character_structs[character];
  if (charstr.character_and_flags & characterstruct_FLAG_ON_SCREEN) return;
  const room = charstr.room;
  if (room !== room_0_OUTDOORS) {
    const r = is_item_discoverable_interior(state, room);
    if (r.found) item_discovered(state, r.item);
  }
  if (charstr.route.index === routeindex_0_HALT) return;
  const t = get_target(state, charstr.route);
  if (t.type === get_target_ROUTE_ENDS) {
    const route = charstr.route;
    character = state.character_index;
    let reverse = false;
    if (character !== character_0_COMMANDANT) {
      if (character >= character_12_GUARD_12) { character_event(state, route, charstr); return; }
      reverse = true;
    } else {
      const routeindex = route.index & ~ROUTEINDEX_REVERSE_FLAG;
      if (routeindex !== routeindex_36_GO_TO_SOLITARY) reverse = true;
      else { character_event(state, route, charstr); return; }
    }
    if (reverse) {
      route.index ^= ROUTEINDEX_REVERSE_FLAG;
      if (route.index & ROUTEINDEX_REVERSE_FLAG) route.step = u8(route.step - 1); else route.step = u8(route.step + 1);
    }
  } else {
    let max;
    if (t.type === get_target_DOOR) {
      const dm = DOORS[t.door].mappos;
      let dm2;
      if (charstr.room === room_0_OUTDOORS) dm2 = { u: dm.u >> 1, v: dm.v >> 1 };
      else dm2 = dm;
      max = charstr.room === room_0_OUTDOORS ? 2 : 6;
      let arrived = move_towards(max, 0, dm2.u, charstr.mappos, 'u');
      arrived = move_towards(max, arrived, dm2.v, charstr.mappos, 'v');
      if (arrived !== 2) return;
      const door = DOORS[t.door];
      charstr.room = (door.room_and_direction & ~door_FLAGS_MASK_DIRECTION) >> 2;
      let dest;
      if ((door.room_and_direction & door_FLAGS_MASK_DIRECTION) < 2) dest = DOORS[t.door + 1].mappos;
      else dest = DOORS[t.door - 1].mappos;
      if (charstr.room !== room_0_OUTDOORS) { charstr.mappos.u = dest.u; charstr.mappos.v = dest.v; charstr.mappos.w = dest.w; }
      else { charstr.mappos.u = dest.u >> 1; charstr.mappos.v = dest.v >> 1; charstr.mappos.w = dest.w >> 1; }
    } else {
      max = charstr.room === room_0_OUTDOORS ? 2 : 6;
      let arrived = move_towards(max, 0, t.location.x, charstr.mappos, 'u');
      arrived = move_towards(max, arrived, t.location.y, charstr.mappos, 'v');
      if (arrived !== 2) return;
    }
    const routeindex = charstr.route.index;
    if (routeindex === routeindex_255_WANDER) return;
    if ((routeindex & ROUTEINDEX_REVERSE_FLAG) === 0) charstr.route.step = u8(charstr.route.step + 1);
    else charstr.route.step = u8(charstr.route.step - 1);
  }
}

/* $C79A */
function move_towards(max, rc, second, obj, key) {
  let delta = obj[key] - second;
  if (delta === 0) rc++;
  else if (delta < 0) { delta = -delta; if (delta >= max) delta = max; obj[key] = u8(obj[key] + delta); }
  else { if (delta >= max) delta = max; obj[key] = u8(obj[key] - delta); }
  return rc;
}

/* $C7C6: Character event. 'owner' is the charstruct or vischar holding 'route'. */
function character_event(state, route, owner) {
  const routeindex = route.index;
  if (routeindex >= routeindex_7_PRISONER_SLEEPS_1 && routeindex <= routeindex_12_PRISONER_SLEEPS_3) { character_sleeps(state, routeindex, route, owner); return; }
  if (routeindex >= routeindex_18_PRISONER_SITS_1 && routeindex <= routeindex_23_PRISONER_SITS_3) { character_sits(state, routeindex, route, owner); return; }
  const handlers = [charevnt_wander_top, charevnt_wander_left, charevnt_wander_yard, charevnt_bed, charevnt_solitary_ends, charevnt_breakfast,
    charevnt_commandant_to_yard, charevnt_exit_hut2, charevnt_hero_sleeps, charevnt_hero_sits, charevnt_hero_release];
  for (const e of eventmap) if (routeindex === e[0]) { handlers[e[1]](state, route, owner); return; }
  route.index = routeindex_0_HALT;
}
function charevnt_solitary_ends(state, route, owner) { state.in_solitary = 0; charevnt_wander_top(state, route, owner); }
function charevnt_commandant_to_yard(state, route) { route.index = routeindex_3_COMMANDANT; route.step = 21; }
function charevnt_hero_release(state, route) {
  route.index = routeindex_36_GO_TO_SOLITARY | ROUTEINDEX_REVERSE_FLAG; route.step = 3;
  state.automatic_player_counter = 0;
  set_hero_route_force(state, { index: routeindex_37_HERO_LEAVE_SOLITARY, step: 0 });
}
function charevnt_wander_left(state, route) { route.index = routeindex_255_WANDER; route.step = 16; }
function charevnt_wander_yard(state, route) { route.index = routeindex_255_WANDER; route.step = 56; }
function charevnt_wander_top(state, route) { route.index = routeindex_255_WANDER; route.step = 8; }
function charevnt_bed(state, route, owner) { if (state.entered_move_a_character === 0) character_bed_vischar(state, route, owner); else character_bed_state(state, route, owner); }
function charevnt_breakfast(state, route, owner) { if (state.entered_move_a_character === 0) charevnt_breakfast_vischar(state, route, owner); else charevnt_breakfast_state(state, route, owner); }
function charevnt_exit_hut2(state, route) { route.index = routeindex_5_EXIT_HUT2; route.step = 0; }
function charevnt_hero_sits(state) { hero_sits(state); }
function charevnt_hero_sleeps(state) { hero_sleeps(state); }

/* $C892 */
function automatics(state) {
  state.entered_move_a_character = 0;
  if (state.bell === bell_RING_PERPETUAL) hostiles_pursue(state);
  if (state.food_discovered_counter !== 0 && --state.food_discovered_counter === 0) {
    state.item_structs[item_FOOD].item_and_flags &= ~itemstruct_ITEM_FLAG_POISONED;
    item_discovered(state, item_FOOD);
  }
  for (let i = 1; i < 8; i++) {
    const vischar = state.vischars[i];
    state.IY = vischar;
    if (vischar.flags !== vischar_FLAGS_EMPTY_SLOT) {
      const character = vischar.character;
      if (character <= character_19_GUARD_DOG_4) {
        is_item_discoverable(state);
        if (state.red_flag || state.automatic_player_counter > 0) guards_follow_suspicious_character(state, vischar);
        if (character >= character_16_GUARD_DOG_1 && (state.item_structs[item_FOOD].room_and_flags & itemstruct_ROOM_FLAG_NEARBY_7))
          vischar.flags = vischar_PURSUIT_DOG_FOOD;
      }
      character_behaviour(state, vischar);
    }
  }
  if (state.red_flag) return;
  if (state.in_solitary || state.automatic_player_counter === 0) {
    state.IY = state.vischars[0];
    character_behaviour(state, state.IY);
  }
}

/* $C918 */
function character_behaviour(state, vischar) {
  let counter_and_flags = vischar.counter_and_flags;
  if (counter_and_flags & vischar_BYTE7_COUNTER_MASK) { vischar.counter_and_flags = --counter_and_flags; return; }
  const vischar2 = vischar;
  const flags = vischar2.flags;
  let move = false;
  if (flags !== 0) {
    if (flags === vischar_PURSUIT_PURSUE) {
      vischar2.target.u = state.hero_mappos.u; vischar2.target.v = state.hero_mappos.v; move = true;
    } else if (flags === vischar_PURSUIT_HASSLE) {
      if (state.automatic_player_counter > 0) { vischar2.target.u = state.hero_mappos.u; vischar2.target.v = state.hero_mappos.v; move = true; }
      else { vischar2.flags = 0; get_target_assign_pos(state, vischar2, vischar2.route); return; }
    } else if (flags === vischar_PURSUIT_DOG_FOOD) {
      if (state.item_structs[item_FOOD].room_and_flags & itemstruct_ROOM_FLAG_NEARBY_7) {
        vischar2.target.u = state.item_structs[item_FOOD].mappos.u; vischar2.target.v = state.item_structs[item_FOOD].mappos.v; move = true;
      } else {
        vischar2.flags = 0; vischar2.route.index = routeindex_255_WANDER; vischar2.route.step = 0;
        get_target_assign_pos(state, vischar2, vischar2.route); return;
      }
    } else if (flags === vischar_PURSUIT_SAW_BRIBE) {
      const bribed_character = state.bribed_character;
      let found = null;
      if (bribed_character !== character_NONE) {
        for (let i = 1; i < 8; i++) if (state.vischars[i].character === bribed_character) { found = state.vischars[i]; break; }
      }
      if (found === null) { vischar2.flags = 0; get_target_assign_pos(state, vischar2, vischar2.route); return; }
      const mappos = found.mi.mappos, target = vischar2.target;
      if (state.room_index === room_0_OUTDOORS) scale_mappos_down(mappos, target);
      else { target.u = u8(mappos.u); target.v = u8(mappos.v); }
      move = true;
    }
  }
  if (!move) {
    if (vischar2.route.index === routeindex_0_HALT) { character_behaviour_set_input(state, vischar, 0); return; }
  }
  const vischar2flags = vischar2.flags;
  let scale;
  if (state.room_index > room_0_OUTDOORS) scale = 1;
  else if (vischar2flags & vischar_FLAGS_TARGET_IS_DOOR) scale = 4;
  else scale = 8;
  let input;
  if (vischar.counter_and_flags & vischar_BYTE7_V_DOMINANT) {
    input = vischar_move_v(state, vischar, scale);
    if (input) character_behaviour_set_input(state, vischar, input);
    else { input = vischar_move_u(state, vischar, scale); if (input) character_behaviour_set_input(state, vischar, input); else target_reached(state, vischar); }
  } else {
    input = vischar_move_u(state, vischar, scale);
    if (input) character_behaviour_set_input(state, vischar, input);
    else { input = vischar_move_v(state, vischar, scale); if (input) character_behaviour_set_input(state, vischar, input); else target_reached(state, vischar); }
  }
}

function character_behaviour_set_input(state, vischar, new_input) {
  if (new_input !== vischar.input) vischar.input = new_input | input_KICK;
}

/* $CA11 */
function vischar_move_u(state, vischar, scale) {
  const delta = i16(vischar.mi.mappos.u - vischar.target.u * scale);
  if (delta >= 3) return input_RIGHT + input_DOWN;
  else if (delta <= -3) return input_LEFT + input_UP;
  vischar.counter_and_flags |= vischar_BYTE7_V_DOMINANT;
  return input_NONE;
}
/* $CA49 */
function vischar_move_v(state, vischar, scale) {
  const delta = i16(vischar.mi.mappos.v - vischar.target.v * scale);
  if (delta >= 3) return input_LEFT + input_DOWN;
  else if (delta <= -3) return input_RIGHT + input_UP;
  vischar.counter_and_flags &= ~vischar_BYTE7_V_DOMINANT;
  return input_NONE;
}

/* $CA81 */
function target_reached(state, vischar) {
  const flags_all = vischar.flags;
  const flags_lower6 = flags_all & vischar_FLAGS_MASK;
  if (flags_lower6) {
    if (flags_lower6 === vischar_PURSUIT_PURSUE) {
      if (vischar.character === state.bribed_character) accept_bribe(state);
      else solitary(state);
    } else if (flags_lower6 === vischar_PURSUIT_HASSLE || flags_lower6 === vischar_PURSUIT_SAW_BRIBE) {
    } else {
      state.food_discovered_counter = (state.item_structs[item_FOOD].item_and_flags & itemstruct_ITEM_FLAG_POISONED) === 0 ? 32 : 255;
      vischar.route.index = routeindex_0_HALT;
      character_behaviour_set_input(state, vischar, 0);
    }
    return;
  }
  if (flags_all & vischar_FLAGS_TARGET_IS_DOOR) {
    const step = vischar.route.step, route = vischar.route.index;
    let doorindex = get_route(route)[step];
    if (route & ROUTEINDEX_REVERSE_FLAG) doorindex ^= door_REVERSE;
    if (route & ROUTEINDEX_REVERSE_FLAG) vischar.route.step = u8(vischar.route.step - 1); else vischar.route.step = u8(vischar.route.step + 1);
    const di = get_door(doorindex);
    const door = DOORS[di];
    vischar.room = (door.room_and_direction & ~door_FLAGS_MASK_DIRECTION) >> 2;
    let mappos;
    if ((door.room_and_direction & door_FLAGS_MASK_DIRECTION) <= direction_TOP_RIGHT) mappos = DOORS[di + 1].mappos;
    else mappos = DOORS[di - 1].mappos;
    if (vischar === state.vischars[0]) {
      vischar.flags &= ~vischar_FLAGS_TARGET_IS_DOOR;
      get_target_assign_pos(state, vischar, vischar.route);
    }
    transition(state, mappos);
    play_speaker(state, sound_CHARACTER_ENTERS_1);
    return;
  }
  const route = vischar.route.index;
  if (route !== routeindex_255_WANDER) {
    if (route & ROUTEINDEX_REVERSE_FLAG) vischar.route.step = u8(vischar.route.step - 1); else vischar.route.step = u8(vischar.route.step + 1);
  }
  get_target_assign_pos(state, vischar, vischar.route);
}

/* $CB23 */
function get_target_assign_pos(state, vischar, route) {
  const t = get_target(state, route);
  if (t.type !== get_target_ROUTE_ENDS) {
    if (t.type === get_target_DOOR) {
      vischar.flags |= vischar_FLAGS_TARGET_IS_DOOR;
      const dm = DOORS[t.door].mappos;
      vischar.target.u = dm.u; vischar.target.v = dm.v;
    } else {
      vischar.target.u = t.location.x; vischar.target.v = t.location.y;
    }
  } else {
    route_ended(state, vischar, route);
  }
}

/* $CB2D */
function route_ended(state, vischar, route) {
  if (route !== state.vischars[0].route) {
    const character = vischar.character;
    let do_event = false;
    if (character === character_0_COMMANDANT) if ((route.index & ~ROUTEINDEX_REVERSE_FLAG) === routeindex_36_GO_TO_SOLITARY) do_event = true;
    if (!do_event && character <= character_11_GUARD_11) {
      route.index ^= ROUTEINDEX_REVERSE_FLAG;
      if (route.index & ROUTEINDEX_REVERSE_FLAG) route.step = u8(route.step - 1); else route.step = u8(route.step + 1);
      return;
    }
  }
  character_event(state, route, vischar);
  if (route.index !== routeindex_0_HALT) get_target_assign_pos(state, vischar, route);
}

function get_route(index) { return routes[index & ~ROUTEINDEX_REVERSE_FLAG] || null; }

/* $CB85 */
function random_nibble(state) {
  state.prng_index = u8(state.prng_index + 1);
  const row = state.prng_index >> 3, column = state.prng_index & 7;
  return (packed_nibbles[row] >>> (column * 4)) & 0x0F;
}

/* $CB98 */
function solitary(state) {
  state.bell = bell_STOP;
  let item = state.items_held[0]; state.items_held[0] = item_NONE; item_discovered(state, item);
  item = state.items_held[1]; state.items_held[1] = item_NONE; item_discovered(state, item);
  draw_all_items(state);
  for (let i = 0; i < item__LIMIT; i++) {
    const p = state.item_structs[i];
    if ((p.room_and_flags & itemstruct_ROOM_MASK) === room_0_OUTDOORS) {
      for (let area = 0; area < 3; area++) {
        if (within_camp_bounds(area, p.mappos)) { item_discovered(state, p.item_and_flags); break; }
      }
    }
  }
  state.vischars[0].room = room_24_SOLITARY;
  state.current_door = 20;
  decrease_morale(state, 35);
  reset_map_and_characters(state);
  const cs = state.character_structs[character_0_COMMANDANT];
  cs.room = room_0_OUTDOORS; cs.mappos.u = 116; cs.mappos.v = 100; cs.mappos.w = 3; cs.route.index = 36; cs.route.step = 0;
  queue_message(state, message_YOU_ARE_IN_SOLITARY);
  queue_message(state, message_WAIT_FOR_RELEASE);
  queue_message(state, message_ANOTHER_DAY_DAWNS);
  state.in_solitary = 255;
  state.automatic_player_counter = 0;
  state.vischars[0].mi.sprite = sprite_PRISONER_FACING_AWAY_1;
  const vischar = state.vischars[0];
  state.IY = vischar;
  vischar.direction = direction_BOTTOM_LEFT;
  vischar.route.index = routeindex_0_HALT;
  transition(state, { u: 58, v: 42, w: 24 });
}

/* $CC37 */
function guards_follow_suspicious_character(state, vischar) {
  const character = vischar.character;
  if (character !== character_0_COMMANDANT && state.vischars[0].mi.sprite === sprite_GUARD_FACING_AWAY_1) return;
  if (vischar.flags === vischar_PURSUIT_SAW_BRIBE) return;
  const mappos = vischar.mi.mappos, mappos_stash = state.mappos_stash;
  if (state.room_index === room_0_OUTDOORS) {
    scale_mappos_down(mappos, mappos_stash);
    const hero_mappos = state.hero_mappos;
    const direction = vischar.direction;
    let dir;
    if ((direction & 1) === 0) {
      if (mappos_stash.v - 1 >= hero_mappos.v || mappos_stash.v + 1 < hero_mappos.v) return;
      dir = mappos_stash.u < hero_mappos.u;
      if ((direction & 2) === 0) dir = !dir;
      if (dir) return;
    } else {
      if (mappos_stash.u - 1 >= hero_mappos.u || mappos_stash.u + 1 < hero_mappos.u) return;
      dir = mappos_stash.v < hero_mappos.v;
      if ((direction & 2) === 0) dir = !dir;
      if (dir) return;
    }
  }
  if (!state.red_flag) {
    if (vischar.mi.mappos.w < 32) vischar.flags = vischar_PURSUIT_HASSLE;
  } else {
    state.bell = bell_RING_PERPETUAL;
    hostiles_pursue(state);
  }
}

/* $CCAB */
function hostiles_pursue(state) {
  for (let i = 1; i < 8; i++) {
    const v = state.vischars[i];
    if (v.character <= character_19_GUARD_DOG_4 && v.mi.mappos.w < 32) v.flags = vischar_PURSUIT_PURSUE;
  }
}

/* $CCCD */
function is_item_discoverable(state) {
  const room = state.room_index;
  if (room !== room_0_OUTDOORS) {
    if (is_item_discoverable_interior(state, room).found) hostiles_pursue(state);
  } else {
    for (let i = 0; i < item__LIMIT; i++) {
      const itemstruct = state.item_structs[i];
      if (itemstruct.room_and_flags & itemstruct_ROOM_FLAG_NEARBY_7) {
        const item = itemstruct.item_and_flags & itemstruct_ITEM_MASK;
        if (item === item_GREEN_KEY || item === item_FOOD) continue;
        hostiles_pursue(state);
        return;
      }
    }
  }
}

/* $CCFB */
function is_item_discoverable_interior(state, room) {
  for (let i = 0; i < item__LIMIT; i++) {
    const itemstr = state.item_structs[i];
    if ((itemstr.room_and_flags & itemstruct_ROOM_MASK) === room &&
        default_item_locations[itemstr.item_and_flags & itemstruct_ITEM_MASK].room_and_flags !== room) {
      const item = itemstr.item_and_flags & itemstruct_ITEM_MASK;
      if (item !== item_RED_CROSS_PARCEL) return { found: true, item };
    }
  }
  return { found: false };
}

/* $CD31 */
function item_discovered(state, item) {
  if (item === item_NONE) return;
  item &= itemstruct_ITEM_MASK;
  queue_message(state, message_ITEM_DISCOVERED);
  decrease_morale(state, 5);
  const dil = default_item_locations[item];
  const room = dil.room_and_flags;
  const itemstruct = state.item_structs[item];
  itemstruct.item_and_flags &= ~itemstruct_ITEM_FLAG_HELD;
  itemstruct.room_and_flags = dil.room_and_flags;
  itemstruct.mappos.u = dil.mappos.u; itemstruct.mappos.v = dil.mappos.v;
  if (room === room_0_OUTDOORS) { itemstruct.mappos.w = 0; calc_exterior_item_isopos(itemstruct); }
  else { itemstruct.mappos.w = 5; calc_interior_item_isopos(itemstruct); }
}

/* $DB9E */
function mark_nearby_items(state) {
  let room = state.room_index;
  if (room === room_NONE) room = room_0_OUTDOORS;
  const mx = state.map_position.x, my = state.map_position.y;
  for (let i = 0; i < item__LIMIT; i++) {
    const it = state.item_structs[i];
    const isopos = it.isopos;
    if ((it.room_and_flags & itemstruct_ROOM_MASK) === room &&
        (mx - 2 <= isopos.x && mx + (state.columns - 1) >= isopos.x) && (my - 1 <= isopos.y && my + (state.rows - 1) >= isopos.y))
      it.room_and_flags |= itemstruct_ROOM_FLAG_NEARBY_6 | itemstruct_ROOM_FLAG_NEARBY_7;
    else it.room_and_flags &= ~(itemstruct_ROOM_FLAG_NEARBY_6 | itemstruct_ROOM_FLAG_NEARBY_7);
  }
}

/* $DBEB */
function get_next_drawable_itemstruct(state, item_and_flag, u, v) {
  let found = null;
  const FLAGS = itemstruct_ROOM_FLAG_NEARBY_6 | itemstruct_ROOM_FLAG_NEARBY_7;
  for (let i = 0; i < item__LIMIT; i++) {
    const itemstr = state.item_structs[i];
    if ((itemstr.room_and_flags & FLAGS) === FLAGS && itemstr.mappos.u * 8 > u && itemstr.mappos.v * 8 > v) {
      v = itemstr.mappos.v * 8; u = itemstr.mappos.u * 8;
      found = itemstr;
      item_and_flag = i | item_FOUND;
    }
  }
  return { item_and_flag, itemstruct: found };
}

const masked_sprite_plotter_16_enables = ['enable_16_left_1', 'enable_16_right_1', 'enable_16_left_2', 'enable_16_right_2', 'enable_16_left_3', 'enable_16_right_3'];
const masked_sprite_plotter_24_enables = ['enable_24_right_1', 'enable_24_left_1', 'enable_24_right_2', 'enable_24_left_2', 'enable_24_right_3', 'enable_24_left_3', 'enable_24_right_4', 'enable_24_left_4'];

/* $DC41 */
function setup_item_plotting(state, itemstr, item) {
  item &= 0x3F;
  state.mappos_stash.u = itemstr.mappos.u; state.mappos_stash.v = itemstr.mappos.v; state.mappos_stash.w = itemstr.mappos.w;
  state.isopos.x = itemstr.isopos.x; state.isopos.y = itemstr.isopos.y;
  state.sprite_index = 0;
  const def = state.D.items[item];
  state.item_height = def.height;
  state.bm_arr = def.bitmap; state.bm_off = 0; state.mk_arr = def.mask; state.mk_off = 0;
  const vis = item_visible(state);
  if (vis === null) return 0;
  state.spriteplotter.height_16_left = vis.clipped_height;
  let instr, offset;
  if (vis.left_skip === 0) { instr = 119; offset = vis.clipped_width; }
  else { instr = 0; offset = u8(3 - vis.clipped_width); }
  const sp = state.spriteplotter;
  for (let i = 0; i < 3; i++) {
    sp[masked_sprite_plotter_16_enables[i * 2]] = instr;
    sp[masked_sprite_plotter_16_enables[i * 2 + 1]] = instr;
    offset = u8(offset - 1);
    if (offset === 0) instr ^= 119;
  }
  let y = 0;
  if (vis.top_skip === 0) y = (state.isopos.y - state.map_position.y) * state.window_buf_stride;
  const x = state.isopos.x - state.map_position.x;
  state.window_buf_pointer = x + y;
  state.foreground_mask_pointer = vis.top_skip * 4;
  let A = vis.top_skip;
  if (A) A *= 2;
  state.bm_off += A; state.mk_off += A;
  return 1;
}

/* $DD02 */
function item_visible(state) {
  const WIDTH_BYTES = 3, HEIGHT = 2;
  const pisopos = state.isopos, mp = state.map_position;
  const window_right_edge = u8(mp.x + state.columns);
  const available_right = i8(window_right_edge - pisopos.x);
  if (available_right <= 0) return null;
  let new_left, new_width, new_top, new_height;
  if (available_right < WIDTH_BYTES) { new_left = 0; new_width = available_right; }
  else {
    const item_right_edge = u8(pisopos.x + WIDTH_BYTES);
    const available_left = i8(item_right_edge - mp.x);
    if (available_left <= 0) return null;
    if (available_left < WIDTH_BYTES) { new_left = WIDTH_BYTES - available_left; new_width = available_left; }
    else { new_left = 0; new_width = WIDTH_BYTES; }
  }
  const window_bottom_edge = u8(mp.y + state.rows);
  const available_bottom = i8(window_bottom_edge - pisopos.y);
  if (available_bottom <= 0) return null;
  if (available_bottom < HEIGHT) { new_top = 0; new_height = 8; }
  else {
    const item_bottom_edge = u8(pisopos.y + HEIGHT);
    const available_top = u8(item_bottom_edge - mp.y);
    if (available_top <= 0) return null;
    if (available_top < HEIGHT) { new_top = 8; new_height = u8(state.item_height - 8); }
    else { new_top = 0; new_height = state.item_height; }
  }
  return { left_skip: new_left, clipped_width: new_width, top_skip: new_top, clipped_height: new_height };
}

const MASKPIX = (bm, mask, fore, scr) => ((~fore | mask) & scr) | (bm & fore);

/* $E102: Sprite plotter for 24-pixel-wide sprites. */
function plot_masked_sprite_24px(state, vischar) {
  const sp = state.spriteplotter, wb = state.window_buf, MB = state.mask_buffer, rev = state.reversed;
  const bmA = state.bm_arr, mkA = state.mk_arr;
  let bp = state.bm_off, mp = state.mk_off;
  let x = vischar.isopos.x & 7;
  const flip = state.sprite_index & sprite_FLAG_FLIP;
  if (x < 4) {
    x = ~x & 3;
    let iters = sp.height_24_right;
    do {
      let bm0 = bmA[bp++], bm1 = bmA[bp++], bm2 = bmA[bp++];
      let mask0 = mkA[mp++], mask1 = mkA[mp++], mask2 = mkA[mp++];
      if (flip) { let t = rev[mask2]; mask2 = rev[mask0]; mask0 = t; mask1 = rev[mask1]; t = rev[bm2]; bm2 = rev[bm0]; bm0 = t; bm1 = rev[bm1]; }
      let fm = state.foreground_mask_pointer, scr = state.window_buf_pointer;
      let bm3 = 0, carry;
      for (let s = x; s <= 2; s++) {
        carry = bm0 & 1; bm0 >>= 1;
        let c2 = bm1 & 1; bm1 = (bm1 >> 1) | (carry << 7); carry = c2;
        c2 = bm2 & 1; bm2 = (bm2 >> 1) | (carry << 7); carry = c2;
        bm3 = (bm3 >> 1) | (carry << 7);
      }
      let mask3 = 0xFF; carry = 1;
      for (let s = x; s <= 2; s++) {
        let c2 = mask0 & 1; mask0 = (mask0 >> 1) | (carry << 7); carry = c2;
        c2 = mask1 & 1; mask1 = (mask1 >> 1) | (carry << 7); carry = c2;
        c2 = mask2 & 1; mask2 = (mask2 >> 1) | (carry << 7); carry = c2;
        c2 = mask3 & 1; mask3 = (mask3 >> 1) | (carry << 7); carry = c2;
      }
      if (sp.enable_24_right_1) wb[scr] = MASKPIX(bm0, mask0, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_right_2) wb[scr] = MASKPIX(bm1, mask1, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_right_3) wb[scr] = MASKPIX(bm2, mask2, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_right_4) wb[scr] = MASKPIX(bm3, mask3, MB[fm], wb[scr]);
      fm++;
      state.foreground_mask_pointer = fm;
      scr += state.columns - 3;
      state.window_buf_pointer = scr;
    } while (--iters);
  } else {
    x -= 4;
    let iters = sp.height_24_left;
    do {
      let bm2 = bmA[bp++], bm1 = bmA[bp++], bm0 = bmA[bp++];
      let mask2 = mkA[mp++], mask1 = mkA[mp++], mask0 = mkA[mp++];
      if (flip) { let t = rev[mask0]; mask0 = rev[mask2]; mask2 = t; mask1 = rev[mask1]; t = rev[bm0]; bm0 = rev[bm2]; bm2 = t; bm1 = rev[bm1]; }
      let fm = state.foreground_mask_pointer, scr = state.window_buf_pointer;
      let bm3 = 0, carry;
      for (let s = x; s <= 3; s++) {
        carry = bm0 >> 7; bm0 = (bm0 << 1) & 0xFF;
        let c2 = bm1 >> 7; bm1 = ((bm1 << 1) | carry) & 0xFF; carry = c2;
        c2 = bm2 >> 7; bm2 = ((bm2 << 1) | carry) & 0xFF; carry = c2;
        bm3 = ((bm3 << 1) | carry) & 0xFF;
      }
      let mask3 = 0xFF; carry = 1;
      for (let s = x; s <= 3; s++) {
        let c2 = mask0 >> 7; mask0 = ((mask0 << 1) | carry) & 0xFF; carry = c2;
        c2 = mask1 >> 7; mask1 = ((mask1 << 1) | carry) & 0xFF; carry = c2;
        c2 = mask2 >> 7; mask2 = ((mask2 << 1) | carry) & 0xFF; carry = c2;
        c2 = mask3 >> 7; mask3 = ((mask3 << 1) | carry) & 0xFF; carry = c2;
      }
      if (sp.enable_24_left_1) wb[scr] = MASKPIX(bm3, mask3, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_left_2) wb[scr] = MASKPIX(bm2, mask2, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_left_3) wb[scr] = MASKPIX(bm1, mask1, MB[fm], wb[scr]);
      fm++; scr++;
      if (sp.enable_24_left_4) wb[scr] = MASKPIX(bm0, mask0, MB[fm], wb[scr]);
      fm++;
      state.foreground_mask_pointer = fm;
      scr += state.columns - 3;
      state.window_buf_pointer = scr;
    } while (--iters);
  }
}

function plot_masked_sprite_16px_x_is_zero(state) { plot_masked_sprite_16px_right(state, 0); }
function plot_masked_sprite_16px(state, vischar) {
  const x = vischar.isopos.x & 7;
  if (x < 4) plot_masked_sprite_16px_right(state, x); else plot_masked_sprite_16px_left(state, x);
}

/* $E2AC */
function plot_masked_sprite_16px_right(state, x) {
  const sp = state.spriteplotter, wb = state.window_buf, MB = state.mask_buffer, rev = state.reversed;
  const bmA = state.bm_arr, mkA = state.mk_arr;
  let bp = state.bm_off, mp = state.mk_off;
  x = ~x & 3;
  const flip = state.sprite_index & sprite_FLAG_FLIP;
  let iters = sp.height_16_left;
  do {
    let bm0 = bmA[bp++], bm1 = bmA[bp++];
    let mask0 = mkA[mp++], mask1 = mkA[mp++];
    if (flip) { let t = rev[mask1]; mask1 = rev[mask0]; mask0 = t; t = rev[bm1]; bm1 = rev[bm0]; bm0 = t; }
    let fm = state.foreground_mask_pointer;
    let mask2 = 0xFF, carry = 1;
    for (let s = x; s <= 2; s++) {
      let c2 = mask0 & 1; mask0 = (mask0 >> 1) | (carry << 7); carry = c2;
      c2 = mask1 & 1; mask1 = (mask1 >> 1) | (carry << 7); carry = c2;
      c2 = mask2 & 1; mask2 = (mask2 >> 1) | (carry << 7); carry = c2;
    }
    let bm2 = 0;
    for (let s = x; s <= 2; s++) {
      carry = bm0 & 1; bm0 >>= 1;
      let c2 = bm1 & 1; bm1 = (bm1 >> 1) | (carry << 7); carry = c2;
      bm2 = (bm2 >> 1) | (carry << 7);
    }
    let scr = state.window_buf_pointer;
    if (sp.enable_16_left_1) wb[scr] = MASKPIX(bm0, mask0, MB[fm], wb[scr]);
    fm++; scr++;
    if (sp.enable_16_left_2) wb[scr] = MASKPIX(bm1, mask1, MB[fm], wb[scr]);
    fm++; scr++;
    if (sp.enable_16_left_3) wb[scr] = MASKPIX(bm2, mask2, MB[fm], wb[scr]);
    fm += 2;
    state.foreground_mask_pointer = fm;
    scr += state.columns - 2;
    state.window_buf_pointer = scr;
  } while (--iters);
}

/* $E34E */
function plot_masked_sprite_16px_left(state, x) {
  const sp = state.spriteplotter, wb = state.window_buf, MB = state.mask_buffer, rev = state.reversed;
  const bmA = state.bm_arr, mkA = state.mk_arr;
  let bp = state.bm_off, mp = state.mk_off;
  x -= 4;
  const flip = state.sprite_index & sprite_FLAG_FLIP;
  let iters = sp.height_16_right;
  do {
    let bm1 = bmA[bp++], bm0 = bmA[bp++];
    let mask1 = mkA[mp++], mask0 = mkA[mp++];
    if (flip) { let t = rev[mask0]; mask0 = rev[mask1]; mask1 = t; t = rev[bm0]; bm0 = rev[bm1]; bm1 = t; }
    let fm = state.foreground_mask_pointer;
    let mask2 = 0xFF, carry = 1;
    for (let s = x; s <= 3; s++) {
      let c2 = mask0 >> 7; mask0 = ((mask0 << 1) | carry) & 0xFF; carry = c2;
      c2 = mask1 >> 7; mask1 = ((mask1 << 1) | carry) & 0xFF; carry = c2;
      c2 = mask2 >> 7; mask2 = ((mask2 << 1) | carry) & 0xFF; carry = c2;
    }
    let bm2 = 0;
    for (let s = x; s <= 3; s++) {
      carry = bm0 >> 7; bm0 = (bm0 << 1) & 0xFF;
      let c2 = bm1 >> 7; bm1 = ((bm1 << 1) | carry) & 0xFF; carry = c2;
      bm2 = ((bm2 << 1) | carry) & 0xFF;
    }
    let scr = state.window_buf_pointer;
    if (sp.enable_16_right_1) wb[scr] = MASKPIX(bm2, mask2, MB[fm], wb[scr]);
    fm++; scr++;
    if (sp.enable_16_right_2) wb[scr] = MASKPIX(bm1, mask1, MB[fm], wb[scr]);
    fm++; scr++;
    if (sp.enable_16_right_3) wb[scr] = MASKPIX(bm0, mask0, MB[fm], wb[scr]);
    fm += 2;
    state.foreground_mask_pointer = fm;
    scr += state.columns - 2;
    state.window_buf_pointer = scr;
  } while (--iters);
}

/* $E420 */
function setup_vischar_plotting(state, vischar) {
  const vp = vischar.mi.mappos, ms = state.mappos_stash;
  if (state.room_index > room_0_OUTDOORS) { ms.u = u8(vp.u); ms.v = u8(vp.v); ms.w = u8(vp.w); }
  else { ms.u = u8((vp.u + 4) >> 3); ms.v = u8(vp.v >> 3); ms.w = u8(vp.w >> 3); }
  const sprite_index = state.sprite_index = vischar.mi.sprite_index;
  state.isopos.x = u8(vischar.isopos.x >> 3);
  state.isopos.y = u8(vischar.isopos.y >> 3);
  const sprite2 = state.D.sprites[vischar.mi.sprite + (sprite_index & ~sprite_FLAG_FLIP)];
  vischar.width_bytes = sprite2.width; vischar.height = sprite2.height;
  state.bm_arr = sprite2.bitmap; state.bm_off = 0; state.mk_arr = sprite2.mask; state.mk_off = 0;
  const vis = vischar_visible(state, vischar);
  if (vis === null) return 0;
  let enable_count, enables;
  const sp = state.spriteplotter;
  if (vischar.width_bytes === 3) {
    sp.height_16_left = vis.clipped_height; sp.height_16_right = vis.clipped_height;
    enable_count = 3; enables = masked_sprite_plotter_16_enables;
  } else {
    sp.height_24_right = vis.clipped_height; sp.height_24_left = vis.clipped_height;
    enable_count = 4; enables = masked_sprite_plotter_24_enables;
  }
  let instr, counter;
  if (vis.left_skip === 0) { instr = 119; counter = vis.clipped_width; }
  else { instr = 0; counter = u8(enable_count - vis.clipped_width); }
  for (let i = 0; i < enable_count; i++) {
    sp[enables[i * 2]] = instr; sp[enables[i * 2 + 1]] = instr;
    counter = u8(counter - 1);
    if (counter === 0) instr ^= 119;
  }
  let y = 0;
  if (vis.top_skip === 0) y = u16((vischar.isopos.y - state.map_position.y * 8) * state.columns);
  const x = i16(state.isopos.x - state.map_position.x);
  state.window_buf_pointer = x + y;
  state.foreground_mask_pointer = vis.top_skip * 4 + (vischar.isopos.y & 7) * 4;
  let A = vis.top_skip;
  if (A) A *= vischar.width_bytes - 1;
  state.bm_off += A; state.mk_off += A;
  state.vis_clip = vis; // Conv: exposed for the HD renderer
  return 1;
}

/* $E542 */
function scale_mappos_down(inp, out) {
  out.u = u8((inp.u + 4) >> 3); out.v = u8((inp.v + 4) >> 3); out.w = u8((inp.w + 4) >> 3);
}

/* $EED3: Plot the game screen. */
function plot_game_window(state) {
  const scr = state.screen, wb = state.window_buf;
  const y = state.game_window_offset.y;
  if (y === 0) {
    let src = 1 + state.game_window_offset.x;
    for (let i = 0; i < 128; i++) {
      let dst = game_window_start_offsets[i];
      for (let k = 0; k < 23; k++) scr[dst++] = wb[src++];
      src++;
    }
  } else {
    let src = state.game_window_offset.x;
    let prev = wb[src++];
    for (let i = 0; i < 128; i++) {
      let dst = game_window_start_offsets[i];
      for (let k = 0; k < 23; k++) {
        const tmp = prev & 0x0F;
        prev = wb[src];
        scr[dst++] = (wb[src++] >> 4) | (tmp << 4);
      }
      prev = wb[src++];
    }
  }
}

/* $EF9A */
function event_roll_call(state) {
  const hm = state.hero_mappos;
  let ok = true;
  if (hm.u < (map_ROLL_CALL_X >> 8) || hm.u >= (map_ROLL_CALL_X & 0xFF)) ok = false;
  else if (hm.v < (map_ROLL_CALL_Y >> 8) || hm.v >= (map_ROLL_CALL_Y & 0xFF)) ok = false;
  if (ok) {
    for (let i = 0; i < 8; i++) { state.vischars[i].input = input_KICK; state.vischars[i].direction = direction_BOTTOM_LEFT; }
    return;
  }
  state.bell = bell_RING_PERPETUAL;
  queue_message(state, message_MISSED_ROLL_CALL);
  hostiles_pursue(state);
}

/* $EFCB */
function action_papers(state) {
  const hm = state.hero_mappos;
  if (hm.u < (map_MAIN_GATE_X >> 8) || hm.u >= (map_MAIN_GATE_X & 0xFF)) return;
  if (hm.v < (map_MAIN_GATE_Y >> 8) || hm.v >= (map_MAIN_GATE_Y & 0xFF)) return;
  if (state.vischars[0].mi.sprite !== sprite_GUARD_FACING_AWAY_1) { solitary(state); return; }
  increase_morale_by_10_score_by_50(state);
  state.vischars[0].room = room_0_OUTDOORS;
  state.IY = state.vischars[0];
  transition(state, { u: 214, v: 138, w: 6 });
}

/* $EFFC: Conv: host-driven. 'cont' receives true for Y, false for N. */
function user_confirm(state, cont) {
  screenlocstring_plot(state, [0x100B, "CONFIRM. Y OR N"]);
  host_request(state, { type: 'confirm', resume: cont });
}

function host_request(state, req) { state.pending.push(req); }

/* $F163 */
function tge_setup(state) {
  wipe_full_screen_and_attributes(state);
  set_morale_flag_screen_attributes(state, attribute_BRIGHT_GREEN_OVER_BLACK);
  set_menu_item_attributes(state, 0, attribute_BRIGHT_YELLOW_OVER_BLACK);
  plot_statics_and_menu_text(state);
  plot_score(state);
}

/* $F17D */
function tge_setup2(state) {
  for (let counter = 0; counter < 256; counter++) {
    let c = counter, byte = 0;
    for (let i = 0; i < 8; i++) { byte = (byte << 1) | (c & 1); c >>= 1; }
    state.reversed[counter] = byte;
  }
  for (let i = 0; i < 8; i++) {
    const v = state.vischars[i];
    v.character = 0; v.flags = 0; v.route.index = 44; v.route.step = 1;
    v.target.u = 46; v.target.v = 46; v.target.w = 24;
    v.counter_and_flags = 0; v.anim = 8; v.animindex = 0; v.input = 0; v.direction = direction_TOP_LEFT;
    v.mi.mappos.u = 0; v.mi.mappos.v = 0; v.mi.mappos.w = 24; v.mi.sprite = sprite_PRISONER_FACING_AWAY_1; v.mi.sprite_index = 0;
    v.isopos.x = 0; v.isopos.y = 0; v.room = room_0_OUTDOORS; v.width_bytes = 0; v.height = 0;
  }
  for (let i = 1; i < 8; i++) { state.vischars[i].character = character_NONE; state.vischars[i].flags = vischar_FLAGS_EMPTY_SLOT; }
  state.pending = [];
  state.main_step = 0;
  try { reset_game(state); } catch (e) { if (e !== GOTO_MAIN) throw e; }
  state.main_step = 0;
}

/* Entry point for one main loop iteration. */
function tge_main(state) {
  try { main_loop(state); }
  catch (e) { if (e !== GOTO_MAIN) throw e; state.main_step = 0; }
}

/* Called by the host to resume after servicing a 'confirm' or 'anykey' request. */
function tge_resume(state, req, value) {
  try {
    const r = req.resume(value);
    if (r === 'continue') { state.main_step++; main_loop(state); }
  } catch (e) { if (e !== GOTO_MAIN) throw e; state.main_step = 0; }
}

/* $F257 */
function wipe_full_screen_and_attributes(state) {
  state.screen.fill(0);
  state.attrs.fill(attribute_WHITE_OVER_BLACK);
  state.speccy.out(state.speccy, port_BORDER_EAR_MIC, 0);
}
