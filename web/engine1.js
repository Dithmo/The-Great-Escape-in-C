// The Great Escape - JavaScript engine port (part 1: data tables and constants)
// Ported from "The Great Escape in C" by David Thomas, which recreates the
// 1986 ZX Spectrum game by Denton Designs / Ocean Software.
'use strict';

const u8  = (x) => x & 0xFF;
const i8  = (x) => (x << 24) >> 24;
const u16 = (x) => x & 0xFFFF;
const i16 = (x) => (x << 16) >> 16;

function b64bytes(s) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
  const bin = atob(s); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function decodeData(R) {
  const D = {};
  for (const k of ['exterior_tiles', 'mask_tiles', 'interior_tiles', 'supertiles', 'map', 'font', 'ascii_to_font',
    'music0', 'music1', 'flag_up', 'flag_down', 'static_tiles']) D[k] = b64bytes(R[k]);
  D.semitone_to_frequency = R.semitone_to_frequency;
  D.sprites = R.sprites.map(s => ({ width: s.w, height: s.h, bitmap: b64bytes(s.b), mask: b64bytes(s.m) }));
  D.items = R.items.map(s => ({ width: s.w, height: s.h, bitmap: b64bytes(s.b), mask: b64bytes(s.m) }));
  D.masks = R.masks.map(b64bytes);
  D.exterior_mask_data = R.exterior_mask_data.map(m => ({ index: m[0], bounds: { x0: m[1], x1: m[2], y0: m[3], y1: m[4] }, mappos: { u: m[5], v: m[6], w: m[7] } }));
  D.objects = R.objects.map(b64bytes);
  D.rooms = R.rooms.map(b64bytes);
  return D;
}

/* Enumerations */
const character_0_COMMANDANT = 0, character_1_GUARD_1 = 1, character_11_GUARD_11 = 11, character_12_GUARD_12 = 12,
  character_13_GUARD_13 = 13, character_14_GUARD_14 = 14, character_15_GUARD_15 = 15,
  character_16_GUARD_DOG_1 = 16, character_18_GUARD_DOG_3 = 18, character_19_GUARD_DOG_4 = 19,
  character_20_PRISONER_1 = 20, character_25_PRISONER_6 = 25, character_26_STOVE_1 = 26, character_27_STOVE_2 = 27,
  character_28_CRATE = 28, character_NONE = 255;
const character_structs__LIMIT = 26;
const movable_item_STOVE1 = 0, movable_item_CRATE = 1, movable_item_STOVE2 = 2;
const inputdevice_KEYBOARD = 0, inputdevice_KEMPSTON = 1, inputdevice_SINCLAIR = 2, inputdevice_PROTEK = 3;
const direction_TOP_LEFT = 0, direction_TOP_RIGHT = 1, direction_BOTTOM_RIGHT = 2, direction_BOTTOM_LEFT = 3;

const input_NONE = 0, input_UP = 1, input_DOWN = 2, input_LEFT = 3, input_RIGHT = 6, input_FIRE = 9;
const input_UP_FIRE = 10, input_DOWN_FIRE = 11, input_LEFT_FIRE = 12, input_RIGHT_FIRE = 15;
const input_KICK = 1 << 7;

const vischar_FLAGS_EMPTY_SLOT = 0xFF, vischar_FLAGS_MASK = 0x3F, vischar_FLAGS_PICKING_LOCK = 1, vischar_FLAGS_CUTTING_WIRE = 2,
  vischar_FLAGS_PURSUIT_MASK = 0x0F, vischar_PURSUIT_PURSUE = 1, vischar_PURSUIT_HASSLE = 2, vischar_PURSUIT_DOG_FOOD = 3,
  vischar_PURSUIT_SAW_BRIBE = 4, vischar_FLAGS_TARGET_IS_DOOR = 1 << 6, vischar_FLAGS_NO_COLLIDE = 1 << 7;
const vischar_BYTE7_COUNTER_MASK = 0x0F, vischar_BYTE7_V_DOMINANT = 1 << 5, vischar_BYTE7_DONT_MOVE_MAP = 1 << 6, vischar_DRAWABLE = 1 << 7;
const vischar_ANIMINDEX_REVERSE = 1 << 7;
const vischar_DIRECTION_MASK = 3, vischar_DIRECTION_CRAWL = 4;
const itemstruct_ITEM_MASK = 0x0F, itemstruct_ITEM_FLAG_UNKNOWN = 1 << 4, itemstruct_ITEM_FLAG_POISONED = 1 << 5, itemstruct_ITEM_FLAG_HELD = 1 << 7;
const itemstruct_ROOM_MASK = 0x3F, itemstruct_ROOM_NONE = 0x3F, itemstruct_ROOM_FLAG_NEARBY_6 = 1 << 6, itemstruct_ROOM_FLAG_NEARBY_7 = 1 << 7;
const door_REVERSE = 1 << 7, door_LOCKED = 1 << 7, interiordoor_NONE = 0xFF;
const characterstruct_CHARACTER_MASK = 0x1F, characterstruct_FLAG_ON_SCREEN = 1 << 6;
const door_FLAGS_MASK_DIRECTION = 3;
const searchlight_STATE_CAUGHT = 0x1F, searchlight_STATE_SEARCHING = 0xFF;
const escapeitem_COMPASS = 1, escapeitem_PAPERS = 2, escapeitem_PURSE = 4, escapeitem_UNIFORM = 8;
const score_address = 0x1094, screen_text_start_address = 0x10E0, morale_flag_attributes_offset = 0x0042;
const morale_MIN = 0, morale_MAX = 112;
const map_MAIN_GATE_X = 0x696D, map_MAIN_GATE_Y = 0x494B, map_ROLL_CALL_X = 0x727C, map_ROLL_CALL_Y = 0x6A72;
const sound_CHARACTER_ENTERS_1 = 0x2030, sound_CHARACTER_ENTERS_2 = 0x2040, sound_BELL_RINGER = 0x2530, sound_PICK_UP_ITEM = 0x3030, sound_DROP_ITEM = 0x3040;
const bell_RING_PERPETUAL = 0, bell_RING_40_TIMES = 40, bell_STOP = 0xFF;

const item_WIRESNIPS = 0, item_SHOVEL = 1, item_LOCKPICK = 2, item_PAPERS = 3, item_TORCH = 4, item_BRIBE = 5, item_UNIFORM = 6,
  item_FOOD = 7, item_POISON = 8, item_RED_KEY = 9, item_YELLOW_KEY = 10, item_GREEN_KEY = 11, item_RED_CROSS_PARCEL = 12,
  item_RADIO = 13, item_PURSE = 14, item_COMPASS = 15, item__LIMIT = 16, item_NONE = 255;

const room_0_OUTDOORS = 0, room_1_HUT1RIGHT = 1, room_2_HUT2LEFT = 2, room_3_HUT2RIGHT = 3, room_4_HUT3LEFT = 4, room_5_HUT3RIGHT = 5,
  room_6 = 6, room_7_CORRIDOR = 7, room_8_CORRIDOR = 8, room_9_CRATE = 9, room_10_LOCKPICK = 10, room_11_PAPERS = 11,
  room_12_CORRIDOR = 12, room_13_CORRIDOR = 13, room_14_TORCH = 14, room_15_UNIFORM = 15, room_16_CORRIDOR = 16, room_17_CORRIDOR = 17,
  room_18_RADIO = 18, room_19_FOOD = 19, room_20_REDCROSS = 20, room_21_CORRIDOR = 21, room_22_REDKEY = 22, room_23_MESS_HALL = 23,
  room_24_SOLITARY = 24, room_25_MESS_HALL = 25, room_28_HUT1LEFT = 28, room_29_SECOND_TUNNEL_START = 29, room_30 = 30, room_31 = 31,
  room_32 = 32, room_33 = 33, room_34 = 34, room_35 = 35, room_36 = 36, room_37 = 37, room_38 = 38, room_39 = 39, room_40 = 40,
  room_41 = 41, room_42 = 42, room_43 = 43, room_44 = 44, room_45 = 45, room_46 = 46, room_47 = 47, room_48 = 48, room_49 = 49,
  room_50_BLOCKED_TUNNEL = 50, room_51 = 51, room_52 = 52, room__LIMIT = 53, room_NONE = 255;

const ROUTEINDEX_REVERSE_FLAG = 1 << 7;
const routeindex_0_HALT = 0, routeindex_3_COMMANDANT = 3, routeindex_5_EXIT_HUT2 = 5, routeindex_6_EXIT_HUT3 = 6,
  routeindex_7_PRISONER_SLEEPS_1 = 7, routeindex_10_PRISONER_SLEEPS_1 = 10, routeindex_12_PRISONER_SLEEPS_3 = 12,
  routeindex_14_GO_TO_YARD = 14, routeindex_15_GO_TO_YARD = 15, routeindex_16_BREAKFAST_25 = 16, routeindex_17_BREAKFAST_23 = 17,
  routeindex_18_PRISONER_SITS_1 = 18, routeindex_21_PRISONER_SITS_1 = 21, routeindex_23_PRISONER_SITS_3 = 23,
  routeindex_26_GUARD_12_ROLL_CALL = 26, routeindex_32_GUARD_15_ROLL_CALL = 32, routeindex_33_PRISONER_4_ROLL_CALL = 33,
  routeindex_36_GO_TO_SOLITARY = 36, routeindex_37_HERO_LEAVE_SOLITARY = 37, routeindex_38_GUARD_12_BED = 38, routeindex_39_GUARD_13_BED = 39,
  routeindex_40_GUARD_14_BED = 40, routeindex_41_GUARD_15_BED = 41, routeindex_42_HUT2_LEFT_TO_RIGHT = 42, routeindex_43_7833 = 43,
  routeindex_44_HUT2_RIGHT_TO_LEFT = 44, routeindex_45_HERO_ROLL_CALL = 45, routeindex_255_WANDER = 255;

const sprite_STOVE = 0, sprite_CRATE = 1, sprite_PRISONER_FACING_AWAY_1 = 2, sprite_DOG_FACING_AWAY_1 = 14,
  sprite_GUARD_FACING_AWAY_1 = 22, sprite_COMMANDANT_FACING_AWAY_1 = 30, sprite_FLAG_FLIP = 1 << 7;

const interiorobject_STRAIGHT_TUNNEL_SW_NE = 0, interiorobject_PRISONER_SAT_MID_TABLE = 5, interiorobject_EMPTY_BED_FACING_SE = 9,
  interiorobject_EMPTY_BENCH = 13, interiorobject_PRISONER_SAT_END_TABLE = 19, interiorobject_COLLAPSED_TUNNEL_SW_NE = 20,
  interiorobject_OCCUPIED_BED = 23;
const interiortile_ESCAPE = 255;

const message_MISSED_ROLL_CALL = 0, message_TIME_TO_WAKE_UP = 1, message_BREAKFAST_TIME = 2, message_EXERCISE_TIME = 3,
  message_TIME_FOR_BED = 4, message_THE_DOOR_IS_LOCKED = 5, message_IT_IS_OPEN = 6, message_INCORRECT_KEY = 7, message_ROLL_CALL = 8,
  message_RED_CROSS_PARCEL = 9, message_PICKING_THE_LOCK = 10, message_CUTTING_THE_WIRE = 11, message_YOU_OPEN_THE_BOX = 12,
  message_YOU_ARE_IN_SOLITARY = 13, message_WAIT_FOR_RELEASE = 14, message_MORALE_IS_ZERO = 15, message_ITEM_DISCOVERED = 16,
  message_HE_TAKES_THE_BRIBE = 17, message_AND_ACTS_AS_DECOY = 18, message_ANOTHER_DAY_DAWNS = 19, message__LIMIT = 20,
  message_QUEUE_END = 255, MESSAGE_NEXT_FLAG = 1 << 7, message_queue_LENGTH = 19;

const messages_table = ["MISSED ROLL CALL", "TIME TO WAKE UP", "BREAKFAST TIME", "EXERCISE TIME", "TIME FOR BED",
  "THE DOOR IS LOCKED", "IT IS OPEN", "INCORRECT KEY", "ROLL CALL", "RED CROSS PARCEL", "PICKING THE LOCK", "CUTTING THE WIRE",
  "YOU OPEN THE BOX", "YOU ARE IN SOLITARY", "WAIT FOR RELEASE", "MORALE IS ZERO", "ITEM DISCOVERED", "HE TAKES THE BRIBE",
  "AND ACTS AS DECOY", "ANOTHER DAY DAWNS"];

const attribute_BLUE_OVER_BLACK = 1, attribute_RED_OVER_BLACK = 2, attribute_PURPLE_OVER_BLACK = 3, attribute_GREEN_OVER_BLACK = 4,
  attribute_CYAN_OVER_BLACK = 5, attribute_YELLOW_OVER_BLACK = 6, attribute_WHITE_OVER_BLACK = 7, attribute_BRIGHT_BLUE_OVER_BLACK = 65,
  attribute_BRIGHT_RED_OVER_BLACK = 66, attribute_BRIGHT_PURPLE_OVER_BLACK = 67, attribute_BRIGHT_GREEN_OVER_BLACK = 68,
  attribute_BRIGHT_CYAN_OVER_BLACK = 69, attribute_BRIGHT_YELLOW_OVER_BLACK = 70, attribute_BRIGHT_WHITE_OVER_BLACK = 71;

const port_KEMPSTON_JOYSTICK = 0x001F, port_BORDER_EAR_MIC = 0x00FE, port_KEYBOARD_SHIFTZXCV = 0xFEFE, port_KEYBOARD_ASDFG = 0xFDFE,
  port_KEYBOARD_QWERT = 0xFBFE, port_KEYBOARD_12345 = 0xF7FE, port_KEYBOARD_09876 = 0xEFFE, port_KEYBOARD_POIUY = 0xDFFE,
  port_KEYBOARD_ENTERLKJH = 0xBFFE, port_KEYBOARD_SPACESYMSHFTMNB = 0x7FFE, port_MASK_EAR = 1 << 4;

const SCREEN_BITMAP_LENGTH = 6144, SCREEN_ATTRIBUTES_LENGTH = 768;
const MASK_BUFFER_WIDTHBYTES = 4, MASK_BUFFER_ROWBYTES = 32, MASK_BUFFER_HEIGHT = 5, MASK_BUFFER_LENGTH = 160;
const TILE_BUF_LENGTH = 24 * 17, WINDOW_BUF_LENGTH = 24 * 8 * 17;
const MAPX = 54, MAPY = 34, MAP_WIDTH = 217, MAP_HEIGHT = 137;
const MASK_RUN_FLAG = 1 << 7;
const roomdef_2_BED = 14 + 4 * 3, roomdef_3_BED_A = 20 + 3 * 3, roomdef_3_BED_B = 20 + 4 * 3, roomdef_3_BED_C = 20 + 5 * 3,
  roomdef_5_BED_D = 20 + 3 * 3, roomdef_5_BED_E = 20 + 4 * 3, roomdef_5_BED_F = 20 + 5 * 3,
  roomdef_23_BENCH_A = 10 + 9 * 3, roomdef_23_BENCH_B = 10 + 10 * 3, roomdef_23_BENCH_C = 10 + 11 * 3,
  roomdef_25_BENCH_D = 8 + 7 * 3, roomdef_25_BENCH_E = 8 + 8 * 3, roomdef_25_BENCH_F = 8 + 9 * 3, roomdef_25_BENCH_G = 8 + 10 * 3,
  roomdef_50_BOUNDARY = 2, roomdef_50_BLOCKAGE = 14 + 3 * 3;

/* $6B79: Locations of beds. */
const beds = [[room_3_HUT2RIGHT, roomdef_3_BED_A], [room_3_HUT2RIGHT, roomdef_3_BED_B], [room_3_HUT2RIGHT, roomdef_3_BED_C],
  [room_5_HUT3RIGHT, roomdef_5_BED_D], [room_5_HUT3RIGHT, roomdef_5_BED_E], [room_5_HUT3RIGHT, roomdef_5_BED_F]];

/* $78D6: Door positions. [room, direction, u, v, w] */
const DOORS = (function () {
  const TL = 0, TR = 1, BR = 2, BL = 3;
  const d = [
    [0, TR, 178, 138, 6], [0, BL, 178, 142, 6],
    [0, TR, 178, 122, 6], [0, BL, 178, 126, 6],
    [34, TL, 138, 179, 6], [0, BR, 16, 52, 12],
    [48, TL, 204, 121, 6], [0, BR, 16, 52, 12],
    [28, TR, 217, 163, 6], [0, BL, 42, 28, 24],
    [1, TL, 212, 189, 6], [0, BR, 30, 46, 24],
    [2, TR, 193, 163, 6], [0, BL, 42, 28, 24],
    [3, TL, 188, 189, 6], [0, BR, 32, 46, 24],
    [4, TR, 169, 163, 6], [0, BL, 42, 28, 24],
    [5, TL, 164, 189, 6], [0, BR, 32, 46, 24],
    [21, TL, 252, 202, 6], [0, BR, 28, 36, 24],
    [20, TL, 252, 218, 6], [0, BR, 26, 34, 24],
    [15, TR, 247, 227, 6], [0, BL, 38, 25, 24],
    [13, TR, 223, 227, 6], [0, BL, 42, 28, 24],
    [8, TR, 151, 211, 6], [0, BL, 42, 21, 24],
    [6, TR, 0, 0, 0], [0, BL, 34, 34, 24],
    [1, TR, 44, 52, 24], [28, BL, 38, 26, 24],
    [3, TR, 36, 54, 24], [2, BL, 38, 26, 24],
    [5, TR, 36, 54, 24], [4, BL, 38, 26, 24],
    [23, TR, 40, 66, 24], [25, BL, 38, 24, 24],
    [23, TL, 62, 36, 24], [21, BR, 32, 46, 24],
    [19, TR, 34, 66, 24], [23, BL, 34, 28, 24],
    [18, TR, 36, 54, 24], [19, BL, 56, 34, 24],
    [21, TR, 44, 54, 24], [22, BL, 34, 28, 24],
    [22, TR, 44, 54, 24], [24, BL, 42, 38, 24],
    [12, TR, 66, 58, 24], [18, BL, 34, 28, 24],
    [17, TL, 60, 36, 24], [7, BR, 28, 34, 24],
    [15, TL, 64, 40, 24], [14, BR, 30, 40, 24],
    [16, TR, 34, 66, 24], [14, BL, 34, 28, 24],
    [16, TL, 62, 46, 24], [13, BR, 26, 34, 24],
    [0, TL, 68, 48, 24], [0, BR, 32, 48, 24],
    [13, TL, 74, 40, 24], [11, BR, 26, 34, 24],
    [7, TL, 64, 36, 24], [16, BR, 26, 34, 24],
    [10, TL, 54, 53, 24], [8, BR, 23, 38, 24],
    [9, TL, 54, 28, 24], [8, BR, 26, 34, 24],
    [12, TL, 62, 36, 24], [17, BR, 26, 34, 24],
    [29, TR, 54, 54, 24], [9, BL, 56, 10, 12],
    [52, TR, 56, 98, 12], [30, BL, 56, 10, 12],
    [30, TL, 100, 52, 12], [31, BR, 56, 38, 12],
    [30, TR, 56, 98, 12], [36, BL, 56, 10, 12],
    [31, TL, 100, 52, 12], [32, BR, 10, 52, 12],
    [32, TR, 56, 98, 12], [33, BL, 32, 52, 12],
    [33, TR, 64, 52, 12], [35, BL, 56, 10, 12],
    [35, TL, 100, 52, 12], [34, BR, 10, 52, 12],
    [36, TL, 100, 52, 12], [35, BR, 56, 28, 12],
    [37, TL, 62, 34, 24], [2, BR, 16, 52, 12],
    [38, TL, 100, 52, 12], [37, BR, 16, 52, 12],
    [39, TR, 64, 52, 12], [38, BL, 32, 52, 12],
    [40, TL, 100, 52, 12], [38, BR, 56, 84, 12],
    [40, TR, 56, 98, 12], [41, BL, 56, 10, 12],
    [41, TL, 100, 52, 12], [42, BR, 56, 38, 12],
    [41, TR, 56, 98, 12], [45, BL, 56, 10, 12],
    [45, TL, 100, 52, 12], [44, BR, 56, 28, 12],
    [43, TR, 32, 52, 12], [44, BL, 56, 10, 12],
    [42, TR, 56, 98, 12], [43, BL, 32, 52, 12],
    [46, TL, 100, 52, 12], [39, BR, 56, 28, 12],
    [47, TR, 56, 98, 12], [46, BL, 32, 52, 12],
    [50, TL, 100, 52, 12], [47, BR, 56, 86, 12],
    [50, TR, 56, 98, 12], [49, BL, 56, 10, 12],
    [49, TL, 100, 52, 12], [48, BR, 56, 28, 12],
    [51, TR, 56, 98, 12], [29, BL, 32, 52, 12],
    [52, TL, 100, 52, 12], [51, BR, 56, 84, 12],
  ];
  return d.map(e => ({ room_and_direction: (e[0] << 2) | e[1], mappos: { u: e[2], v: e[3], w: e[4] } }));
})();
const door_MAX = 62;

/* $B53E: Wall and fence boundaries. [minx,maxx,miny,maxy,minheight,maxheight] */
const walls = [
  [106, 110, 82, 98, 0, 11], [94, 98, 82, 98, 0, 11], [82, 86, 82, 98, 0, 11], [62, 90, 106, 128, 0, 48], [52, 128, 114, 128, 0, 48],
  [126, 152, 94, 128, 0, 48], [130, 152, 90, 128, 0, 48], [134, 140, 70, 128, 0, 10], [130, 134, 70, 74, 0, 18], [110, 130, 70, 71, 0, 10],
  [109, 111, 69, 73, 0, 18], [103, 105, 69, 73, 0, 18],
  [70, 70, 70, 106, 0, 8], [62, 62, 62, 106, 0, 8], [78, 78, 46, 62, 0, 8], [104, 104, 46, 69, 0, 8],
  [62, 104, 62, 62, 0, 8], [78, 104, 46, 46, 0, 8], [70, 103, 70, 70, 0, 8], [104, 106, 56, 58, 0, 8], [78, 80, 46, 48, 0, 8],
  [70, 72, 70, 72, 0, 8], [70, 72, 94, 96, 0, 8], [105, 109, 70, 73, 0, 8],
].map(w => ({ minx: w[0], maxx: w[1], miny: w[2], maxy: w[3], minheight: w[4], maxheight: w[5] }));

/* $783A: Table of map locations used in routes. */
const locations = [[68, 104], [68, 84], [68, 70], [64, 102], [64, 64], [68, 68], [64, 64], [68, 64],
  [104, 112], [96, 112], [106, 102], [93, 104], [124, 101], [124, 112], [116, 104], [112, 100],
  [120, 96], [128, 88], [112, 96], [116, 84], [124, 100], [124, 112], [116, 104], [112, 100],
  [102, 68], [102, 64], [96, 64], [92, 68], [86, 68], [84, 64], [74, 68], [74, 64],
  [102, 68], [68, 68], [68, 104], [107, 69], [107, 45], [77, 45], [77, 61], [61, 61], [61, 103],
  [116, 76], [44, 42], [106, 72], [110, 72], [81, 104], [52, 60], [52, 44], [52, 28], [119, 107], [122, 110], [52, 28],
  [40, 60], [36, 34], [80, 76], [89, 76], [89, 60], [100, 61], [92, 54], [84, 50], [102, 48], [96, 56], [79, 59], [103, 47],
  [52, 54], [52, 46], [52, 36], [52, 62], [32, 56], [52, 24], [42, 46], [34, 34], [120, 110], [118, 110], [116, 110],
  [121, 109], [119, 109], [117, 109]].map(l => ({ x: l[0], y: l[1] }));

/* $7738: Routes. DOOR(d)=d, LOCATION(d)=d+40, 255=end */
const routebyte_END = 255;
const routes = (function () {
  const D = (d) => d, L = (d) => d + 40, R = door_REVERSE, E = 255;
  const route_7795 = [L(32), L(33), L(34), E];
  const route_7799 = [L(35), L(36), L(37), L(38), L(39), L(40), E];
  const route_commandant = [L(46), D(31), D(29), D(32), D(26), D(35), D(25 | R), D(22 | R), D(21 | R), D(20 | R), D(23 | R), L(42), D(23),
    D(10 | R), D(11), D(11 | R), D(12), D(27 | R), D(28), D(29 | R), D(13 | R), L(11), L(55), D(0 | R), D(1 | R), L(60), D(1), D(0), D(4),
    D(16), D(5 | R), L(11), D(7), D(17 | R), D(6 | R), D(8), D(18), D(9 | R), L(45), D(14), D(34), D(34 | R), D(33), D(33 | R), E];
  const route_77CD = [L(43), L(44), E];
  const route_exit_hut2 = [D(7 | R), L(11), L(12), E];
  const route_exit_hut3 = [D(9 | R), L(45), L(14), E];
  const route_prisoner_sleeps_1 = [L(46), E], route_prisoner_sleeps_2 = [L(47), E], route_prisoner_sleeps_3 = [L(48), E];
  const route_77DE = [L(52), L(53), E];
  const route_go_to_yard = [L(11), L(55), D(0 | R), D(1 | R), L(56), E];
  const route_breakfast_room_25 = [L(12), D(10), D(20), D(19 | R), E];
  const route_breakfast_room_23 = [L(16), L(12), D(10), D(20), E];
  const route_prisoner_sits_1 = [L(64), E], route_prisoner_sits_2 = [L(65), E], route_prisoner_sits_3 = [L(66), E];
  const route_guardA_breakfast = [L(68), E], route_guardB_breakfast = [L(69), E];
  const route_guard_12_roll_call = [L(9), E], route_guard_13_roll_call = [L(11), E], route_guard_14_roll_call = [L(17), E],
    route_guard_15_roll_call = [L(49), E], route_prisoner_1_roll_call = [L(72), E], route_prisoner_2_roll_call = [L(73), E],
    route_prisoner_3_roll_call = [L(74), E], route_prisoner_4_roll_call = [L(75), E], route_prisoner_5_roll_call = [L(76), E],
    route_prisoner_6_roll_call = [L(77), E];
  const route_go_to_solitary = [L(14), D(10), D(23 | R), D(24 | R), L(42), E];
  const route_hero_leave_solitary = [D(24), D(23), D(10 | R), L(14), E];
  const route_guard_12_bed = [L(12), L(11), D(7), L(52), E];
  const route_guard_13_bed = [L(12), L(11), D(7), D(17 | R), L(53), E];
  const route_guard_14_bed = [L(12), L(11), L(45), D(9), L(52), E];
  const route_guard_15_bed = [L(12), L(11), L(45), D(9), L(53), E];
  const route_hut2_left_to_right = [D(17), E];
  const route_7833 = [L(67), E];
  const route_hut2_right_to_left = [D(17 | R), L(70), E];
  const route_hero_roll_call = [L(50), E];
  return [null, route_7795, route_7799, route_commandant, route_77CD, route_exit_hut2, route_exit_hut3,
    route_prisoner_sleeps_1, route_prisoner_sleeps_2, route_prisoner_sleeps_3, route_prisoner_sleeps_1, route_prisoner_sleeps_2, route_prisoner_sleeps_3,
    route_77DE, route_go_to_yard, route_go_to_yard, route_breakfast_room_25, route_breakfast_room_23,
    route_prisoner_sits_1, route_prisoner_sits_2, route_prisoner_sits_3, route_prisoner_sits_1, route_prisoner_sits_2, route_prisoner_sits_3,
    route_guardA_breakfast, route_guardB_breakfast,
    route_guard_12_roll_call, route_guard_13_roll_call, route_prisoner_1_roll_call, route_prisoner_2_roll_call, route_prisoner_3_roll_call,
    route_guard_14_roll_call, route_guard_15_roll_call, route_prisoner_4_roll_call, route_prisoner_5_roll_call, route_prisoner_6_roll_call,
    route_go_to_solitary, route_hero_leave_solitary, route_guard_12_bed, route_guard_13_bed, route_guard_14_bed, route_guard_15_bed,
    route_hut2_left_to_right, route_7833, route_hut2_right_to_left, route_hero_roll_call];
})();

/* $CF06: Animations. */
const animations = (function () {
  const TL = 0, TR = 1, BR = 2, BL = 3, CR = 4, NO = 255, F = 128, _ = 0;
  const A = (nframes, from, to, map_direction, ...f) => {
    const frames = [];
    for (let i = 0; i < nframes; i++) frames.push({ dx: f[i * 4], dy: f[i * 4 + 1], dh: f[i * 4 + 2], spriteindex: f[i * 4 + 3] });
    return { nframes, from, to, map_direction, frames };
  };
  const anim_crawlwait_tl = A(1, TL | CR, TL | CR, NO, 0, 0, 0, _ | 10);
  const anim_crawlwait_tr = A(1, TR | CR, TR | CR, NO, 0, 0, 0, F | 10);
  const anim_crawlwait_br = A(1, BR | CR, BR | CR, NO, 0, 0, 0, F | 8);
  const anim_crawlwait_bl = A(1, BL | CR, BL | CR, NO, 0, 0, 0, _ | 8);
  const anim_walk_tl = A(4, TL, TL, BR, 2, 0, 0, _ | 0, 2, 0, 0, _ | 1, 2, 0, 0, _ | 2, 2, 0, 0, _ | 3);
  const anim_walk_tr = A(4, TR, TR, BL, 0, 2, 0, F | 0, 0, 2, 0, F | 1, 0, 2, 0, F | 2, 0, 2, 0, F | 3);
  const anim_walk_br = A(4, BR, BR, TL, -2, 0, 0, _ | 4, -2, 0, 0, _ | 5, -2, 0, 0, _ | 6, -2, 0, 0, _ | 7);
  const anim_walk_bl = A(4, BL, BL, TR, 0, -2, 0, F | 4, 0, -2, 0, F | 5, 0, -2, 0, F | 6, 0, -2, 0, F | 7);
  const anim_wait_tl = A(1, TL, TL, NO, 0, 0, 0, _ | 0);
  const anim_wait_tr = A(1, TR, TR, NO, 0, 0, 0, F | 0);
  const anim_wait_br = A(1, BR, BR, NO, 0, 0, 0, _ | 4);
  const anim_wait_bl = A(1, BL, BL, NO, 0, 0, 0, F | 4);
  const anim_turn_tl = A(2, TL, TR, NO, 0, 0, 0, _ | 0, 0, 0, 0, F | 0);
  const anim_turn_tr = A(2, TR, BR, NO, 0, 0, 0, F | 0, 0, 0, 0, _ | 4);
  const anim_turn_br = A(2, BR, BL, NO, 0, 0, 0, _ | 4, 0, 0, 0, F | 4);
  const anim_turn_bl = A(2, BL, TL, NO, 0, 0, 0, F | 4, 0, 0, 0, _ | 0);
  const anim_crawl_tl = A(2, TL | CR, TL | CR, BR, 2, 0, 0, _ | 10, 2, 0, 0, _ | 11);
  const anim_crawl_tr = A(2, TR | CR, TR | CR, BL, 0, 2, 0, F | 10, 0, 2, 0, F | 11);
  const anim_crawl_br = A(2, BR | CR, BR | CR, TL, -2, 0, 0, F | 8, -2, 0, 0, F | 9);
  const anim_crawl_bl = A(2, BL | CR, BL | CR, TR, 0, -2, 0, _ | 8, 0, -2, 0, _ | 9);
  const anim_crawlturn_tl = A(2, TL | CR, TR | CR, NO, 0, 0, 0, _ | 10, 0, 0, 0, F | 10);
  const anim_crawlturn_tr = A(2, TR | CR, BR | CR, NO, 0, 0, 0, F | 10, 0, 0, 0, F | 8);
  const anim_crawlturn_br = A(2, BR | CR, BL | CR, NO, 0, 0, 0, F | 8, 0, 0, 0, _ | 8);
  const anim_crawlturn_bl = A(2, BL | CR, TL | CR, NO, 0, 0, 0, _ | 8, 0, 0, 0, _ | 10);
  return [anim_walk_tl, anim_walk_tr, anim_walk_br, anim_walk_bl, anim_turn_tl, anim_turn_tr, anim_turn_br, anim_turn_bl,
    anim_wait_tl, anim_wait_tr, anim_wait_br, anim_wait_bl, anim_crawl_tl, anim_crawl_tr, anim_crawl_br, anim_crawl_bl,
    anim_crawlturn_tl, anim_crawlturn_tr, anim_crawlturn_br, anim_crawlturn_bl, anim_crawlwait_tl, anim_crawlwait_tr, anim_crawlwait_br, anim_crawlwait_bl];
})();

/* $CDAA: animindices[direction][input] */
const animindices = (function () {
  const F = 0, R = 128;
  return [
    [8 | F, 0 | F, 4 | F, 7 | R, 0 | F, 7 | R, 4 | F, 4 | F, 4 | F],
    [9 | F, 4 | R, 5 | F, 5 | F, 4 | R, 5 | F, 1 | F, 1 | F, 5 | F],
    [10 | F, 5 | R, 2 | F, 6 | F, 5 | R, 6 | F, 5 | R, 5 | R, 2 | F],
    [11 | F, 7 | F, 6 | R, 3 | F, 7 | F, 3 | F, 7 | F, 7 | F, 6 | R],
    [20 | F, 12 | F, 12 | R, 19 | R, 12 | F, 19 | R, 16 | F, 16 | F, 12 | R],
    [21 | F, 16 | R, 17 | F, 13 | R, 16 | R, 21 | R, 13 | F, 13 | F, 17 | F],
    [22 | F, 14 | R, 14 | F, 18 | F, 14 | R, 14 | F, 17 | R, 17 | R, 14 | F],
    [23 | F, 19 | F, 18 | R, 15 | F, 19 | F, 15 | F, 15 | R, 15 | R, 18 | R]];
})();

/* $CD6A: Default item locations. [room_and_flags, u, v] */
const default_item_locations = [
  [(room_NONE & 0x3F) | (3 << 6), 64, 32], [room_9_CRATE, 62, 48], [room_10_LOCKPICK, 73, 36], [room_11_PAPERS, 42, 58],
  [room_14_TORCH, 50, 24], [room_NONE & 0x3F, 36, 44], [room_15_UNIFORM, 44, 65], [room_19_FOOD, 64, 48], [room_1_HUT1RIGHT, 66, 52],
  [room_22_REDKEY, 60, 42], [room_11_PAPERS, 28, 34], [room_0_OUTDOORS, 74, 72], [room_NONE & 0x3F, 28, 50], [room_18_RADIO, 36, 58],
  [room_NONE & 0x3F, 30, 34], [room_NONE & 0x3F, 52, 28]].map(e => ({ room_and_flags: e[0], mappos: { u: e[1], v: e[2] } }));

/* $EA7C: Interior masking data. [index, x0,x1,y0,y1, u,v,w] */
const interior_mask_data_source = [
  [27, 123, 127, 241, 243, 54, 40, 32], [27, 119, 123, 243, 245, 54, 24, 32], [27, 124, 128, 241, 243, 50, 42, 32],
  [25, 131, 134, 242, 247, 24, 36, 32], [25, 129, 132, 244, 249, 24, 26, 32], [25, 129, 132, 243, 248, 28, 23, 32],
  [25, 131, 134, 244, 248, 22, 32, 32], [24, 125, 128, 244, 249, 24, 26, 32], [24, 123, 126, 243, 248, 34, 26, 32],
  [24, 121, 124, 244, 249, 34, 16, 32], [24, 123, 126, 244, 249, 28, 23, 32], [24, 121, 124, 241, 246, 44, 30, 32],
  [24, 125, 128, 242, 247, 36, 34, 32], [29, 127, 130, 246, 247, 28, 30, 32], [29, 130, 133, 242, 243, 35, 48, 32],
  [29, 134, 137, 242, 243, 28, 55, 32], [29, 134, 137, 244, 245, 24, 48, 32], [29, 128, 131, 241, 242, 40, 48, 32],
  [28, 129, 130, 244, 246, 28, 32, 32], [28, 131, 132, 244, 246, 28, 46, 32], [26, 126, 128, 245, 247, 28, 32, 32],
  [18, 122, 123, 242, 243, 58, 40, 32], [18, 122, 123, 239, 240, 69, 53, 32], [23, 128, 133, 244, 246, 28, 36, 32],
  [20, 128, 132, 243, 245, 38, 40, 32], [21, 132, 133, 246, 247, 26, 30, 32], [21, 126, 127, 243, 244, 46, 38, 32],
  [22, 124, 133, 239, 243, 50, 34, 32], [22, 121, 130, 240, 244, 52, 26, 32], [22, 125, 134, 242, 246, 36, 26, 32],
  [16, 118, 120, 245, 247, 54, 10, 32], [16, 122, 124, 243, 245, 54, 10, 32], [16, 126, 128, 241, 243, 54, 10, 32],
  [16, 130, 132, 239, 241, 54, 10, 32], [16, 134, 136, 237, 239, 54, 10, 32], [16, 138, 140, 235, 237, 54, 10, 32],
  [17, 115, 117, 235, 237, 10, 48, 32], [17, 119, 121, 237, 239, 10, 48, 32], [17, 123, 125, 239, 241, 10, 48, 32],
  [17, 127, 129, 241, 243, 10, 48, 32], [17, 131, 133, 243, 245, 10, 48, 32], [17, 135, 137, 245, 247, 10, 48, 32],
  [16, 132, 134, 244, 246, 10, 48, 32], [17, 135, 137, 237, 239, 10, 48, 32], [17, 123, 125, 243, 245, 10, 10, 32],
  [17, 121, 123, 244, 246, 10, 10, 32], [15, 136, 140, 245, 248, 10, 10, 32]].map(m => ({ index: m[0], bounds: { x0: m[1], x1: m[2], y0: m[3], y1: m[4] }, mappos: { u: m[5], v: m[6], w: m[7] } }));

/* $6B85: Room dimensions (x1, x0, y1, y0). */
const roomdef_dimensions = [[66, 26, 70, 22], [62, 22, 58, 26], [54, 30, 66, 18], [62, 30, 58, 34], [74, 18, 62, 30],
  [56, 50, 100, 10], [104, 6, 56, 50], [56, 50, 100, 26], [104, 28, 56, 50], [56, 50, 88, 10]].map(r => ({ x1: r[0], x0: r[1], y1: r[2], y0: r[3] }));

/* $9F15: Bounds of the three main exterior areas. */
const permitted_bounds = [{ x0: 86, x1: 94, y0: 61, y1: 72 }, { x0: 78, x1: 132, y0: 71, y1: 116 }, { x0: 79, x1: 105, y0: 47, y1: 63 }];

const permitted_route_ROOM = 1 << 7;
const route_to_permitted = (function () {
  const R = 128;
  return [
    [routeindex_42_HUT2_LEFT_TO_RIGHT, [R | 2, R | 2, 255]],
    [routeindex_5_EXIT_HUT2, [R | 3, 1, 1, 1, 255]],
    [routeindex_14_GO_TO_YARD, [1, 1, 1, 0, 2, 2, 255]],
    [routeindex_16_BREAKFAST_25, [1, 1, R | 21, R | 23, R | 25, 255]],
    [routeindex_44_HUT2_RIGHT_TO_LEFT, [R | 3, R | 2, 255]],
    [routeindex_43_7833, [R | 25, 255]],
    [routeindex_45_HERO_ROLL_CALL, [1, 255]]].map(e => ({ routeindex: e[0], permitted: e[1] }));
})();

/* $CB85 pseudo-random nibbles. */
const packed_nibbles = [0x00000000, 0x00CBF302, 0x00C30000, 0x00000000, 0x3C0800C3, 0xC0000000, 0x00CFD3CF, 0xDFFFF7FF,
  0xFFDFFFBF, 0xFDFC3FFF, 0xFF37C000, 0xCC003C00, 0xB4444B80, 0x34026666, 0x66643C00, 0x66666426, 0x66643FC0, 0x66642664,
  0xF5310000, 0x3DDDDDBB, 0x26666666, 0x200003FC, 0x34BC2666, 0xC82C3426, 0x3FC26666, 0x3CFFF3CF, 0x3DDDDDBB, 0x43C2DFFB,
  0x3FC3C3F3, 0xC3730003, 0xC0477643, 0x2C34002C];

/* $EDD3: Game screen start addresses. */
const game_window_start_offsets = (function () {
  const a = [];
  for (let row = 0; row < 16; row++) for (let line = 0; line < 8; line++) {
    const r = row + 2; // character rows 2..17
    a.push(((r & 0x18) << 8) | (line << 8) | ((r & 7) << 5) | 7);
  }
  return a;
})();

const zoombox_tiles = [[0x00, 0x00, 0x00, 0x03, 0x04, 0x08, 0x08, 0x08], [0x00, 0x20, 0x18, 0xF4, 0x2F, 0x18, 0x04, 0x00],
  [0x00, 0x00, 0x00, 0x00, 0xE0, 0x10, 0x08, 0x08], [0x08, 0x08, 0x1A, 0x2C, 0x34, 0x58, 0x10, 0x10],
  [0x10, 0x10, 0x10, 0x20, 0xC0, 0x00, 0x00, 0x00], [0x10, 0x10, 0x08, 0x07, 0x00, 0x00, 0x00, 0x00]];

const searchlight_shape = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x07, 0xE0, 0x0F, 0xF0, 0x0F, 0xF0, 0x1F, 0xF8,
  0x1F, 0xF8, 0x0F, 0xF0, 0x0F, 0xF0, 0x07, 0xE0, 0x01, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

const bell_ringer_bitmap_off = [0xE7, 0xE7, 0x83, 0x83, 0x43, 0x41, 0x20, 0x10, 0x08, 0x04, 0x02, 0x02];
const bell_ringer_bitmap_on = [0x3F, 0x3F, 0x27, 0x13, 0x13, 0x09, 0x08, 0x04, 0x04, 0x02, 0x02, 0x01];
const screenoffset_BELL_RINGER = 0x118E;

/* Static graphics (HUD) definitions. */
const static_graphic_defs = [
  [0x0021, 1, [0x18, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0x1A, 0x1A]],
  [0x0006, 1, [0x02, 0x04, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x0E, 0x10]],
  [0x001E, 1, [0x05, 0x07, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x11, 0x12, 0x09, 0x0B]],
  [0x0027, 0, [0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x15, 0x16, 0x17, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14]],
  [0x1047, 0, [0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x15, 0x16, 0x17, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14, 0x13, 0x14]],
  [0x10A0, 0, [0x1F, 0x1B, 0x1C, 0x1D, 0x1E]],
  [0x1073, 0, [0x20, 0x21, 0x22, 0x21, 0x23, 0x21, 0x24, 0x21, 0x22, 0x21, 0x25, 0x0B, 0x0C]],
  [0x1093, 0, [0x26, 0x4E, 0x27, 0x4E, 0x28, 0x4E, 0x29, 0x4E, 0x27, 0x4E, 0x2A]],
  [0x10B3, 0, [0x2B, 0x2C, 0x2D, 0x2C, 0x2E, 0x2C, 0x2F, 0x2C, 0x2D, 0x2C, 0x30]],
  [0x10D3, 0, [0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B]],
  [0x10F3, 0, [0x3C, 0x3D, 0x3E, 0x3F, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45]],
  [0x106E, 0, [0x46, 0x47, 0x48]], [0x108E, 0, [0x49, 0x4A, 0x4B]], [0x10AE, 0, [0x4C, 0x4D]],
  [0x0005, 1, [0x01, 0x03]], [0x001F, 1, [0x06, 0x08]], [0x1045, 1, [0x0D, 0x0F]], [0x105F, 1, [0x0A, 0x0C]]];

const key_choice_screenlocstrings = [[0x008E, "CONTROLS"], [0x00CD, "0 SELECT"], [0x080D, "1 KEYBOARD"], [0x084D, "2 KEMPSTON"],
  [0x088D, "3 SINCLAIR"], [0x08CD, "4 PROTEK"], [0x1007, "BREAK OR CAPS AND SPACE"], [0x102C, "FOR NEW GAME"]];

/* Timed events: [time, handler name] */
const timed_events = [[0, 'event_another_day_dawns'], [8, 'event_wake_up'], [12, 'event_new_red_cross_parcel'], [16, 'event_go_to_roll_call'],
  [20, 'event_roll_call'], [21, 'event_go_to_breakfast_time'], [36, 'event_end_of_breakfast'], [46, 'event_go_to_exercise_time'],
  [64, 'event_exercise_time'], [74, 'event_go_to_roll_call'], [78, 'event_roll_call'], [79, 'event_go_to_time_for_bed'],
  [98, 'event_time_for_bed'], [100, 'event_night_time'], [130, 'event_search_light']];

const prisoners_and_guards = [12, 13, 20, 21, 22, 14, 15, 23, 24, 25];

/* character_event map: [route, handler index] */
const eventmap = [[38 | 128, 0], [39 | 128, 0], [40 | 128, 1], [41 | 128, 1], [5, 0], [6, 1], [5 | 128, 3], [6 | 128, 3],
  [14, 2], [15, 2], [14 | 128, 0], [15 | 128, 1], [16, 5], [17, 5], [16 | 128, 0], [17 | 128, 1], [32 | 128, 0], [33 | 128, 1],
  [42, 7], [44, 8], [43, 9], [36 | 128, 6], [36, 10], [37, 4]];

/* The exception thrown to simulate squash_stack_goto_main (longjmp). */
const GOTO_MAIN = { tge: 'goto_main' };
