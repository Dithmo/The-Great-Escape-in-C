# All 62 door connections translated faithfully from the original game's C source.
#
# Each door has two sides (A and B).
#   - Side A = "forward" pass: entering side A leads to side A's room at side A's pos.
#   - Side B = "reverse" pass: entering side B leads to side B's room at side B's pos.
#
# Positions are in the original game's coordinate space (0–255).
# Elevation (w): 6 = outdoors tile height, 12 = tunnel height, 24 = interior height.
#
# Door IDs (0–61) match the original game's doors[] array exactly.
# Door nodes in each room scene must set their door_id to the matching value here.
#
# Locked doors at game start (from original — exercise gates 0/1 are locked until
# exercise_start event; others need keys or lockpick):
#   0, 1 = exercise gates
#   12 = uniform room (needs yellow key in original — no key type set here, use lockpick)
#   13 = corridor (locked)
#   14 = corridor (locked)
#   22 = radio room (locked)
#   24 = solitary (locked — guarded door, player never opens this normally)
#   31 = papers room (locked)
#   34 = crate room (locked)
#
# Source: Engine/Main.c  doors[] array (lines 829–1038).

extends Node

# Door connection: maps door_id -> {a: {room_id, pos, dir}, b: {room_id, pos, dir}}
var door_connections: Dictionary = {}

# Doors that start locked at game load
const INITIALLY_LOCKED: Array[int] = [0, 1, 12, 13, 14, 22, 24, 31, 34]

# Human-readable room names keyed by room ID
const ROOM_NAMES: Dictionary = {
	0:  "Outdoors",       1:  "Hut 1 Right",  2:  "Hut 2 Left",
	3:  "Hut 2 Right",    4:  "Hut 3 Left",   5:  "Hut 3 Right",
	6:  "Unused",         7:  "Corridor",      8:  "Corridor 2",
	9:  "Crate Room",     10: "Lockpick Room", 11: "Papers Room",
	12: "Corridor 3",     13: "Corridor 4",    14: "Torch Room",
	15: "Uniform Room",   16: "Corridor 5",    17: "Corridor 6",
	18: "Radio Room",     19: "Food Room",     20: "Red Cross Room",
	21: "Corridor 7",     22: "Red Key Room",  23: "Mess Hall A",
	24: "Solitary",       25: "Mess Hall B",   26: "Unused 2",
	27: "Unused 3",       28: "Hut 1 Left",    29: "Tunnel Start (2nd)",
	30: "Tunnel 30",      31: "Tunnel 31",     32: "Tunnel 32",
	33: "Tunnel 33",      34: "Tunnel 34",     35: "Tunnel 35",
	36: "Tunnel 36",      37: "Tunnel 37",     38: "Tunnel 38",
	39: "Tunnel 39",      40: "Tunnel 40",     41: "Tunnel 41",
	42: "Tunnel 42",      43: "Tunnel 43",     44: "Tunnel 44",
	45: "Tunnel 45",      46: "Tunnel 46",     47: "Tunnel 47",
	48: "Tunnel 48",      49: "Tunnel 49",     50: "Blocked Tunnel",
	51: "Tunnel 51",      52: "Tunnel 52",
}

func _ready() -> void:
	_build()
	print("RoomRegistry ready — %d doors mapped" % door_connections.size())

func get_door_exit(door_id: int, reversed: bool) -> Dictionary:
	var conn: Dictionary = door_connections.get(door_id, {})
	if conn.is_empty():
		return {}
	return conn["b"] if reversed else conn["a"]

func is_initially_locked(door_id: int) -> bool:
	return door_id in INITIALLY_LOCKED

func get_room_name(room_id: int) -> String:
	return ROOM_NAMES.get(room_id, "Room %d" % room_id)

func _s(room_id: int, dir: int, u: int, v: int, w: int) -> Dictionary:
	return {"room_id": room_id, "pos": Vector3i(u, v, w), "dir": dir}

func _build() -> void:
	# Direction values: 0=TL, 1=TR, 2=BR, 3=BL  (matching original game)
	door_connections[0]  = {"a": _s( 0, 1, 178, 138,  6), "b": _s( 0, 3, 178, 142,  6)} # exercise gate A
	door_connections[1]  = {"a": _s( 0, 1, 178, 122,  6), "b": _s( 0, 3, 178, 126,  6)} # exercise gate B
	door_connections[2]  = {"a": _s(34, 0, 138, 179,  6), "b": _s( 0, 2,  16,  52, 12)} # tunnel 2 end exit
	door_connections[3]  = {"a": _s(48, 0, 204, 121,  6), "b": _s( 0, 2,  16,  52, 12)} # tunnel 1 end exit
	door_connections[4]  = {"a": _s(28, 1, 217, 163,  6), "b": _s( 0, 3,  42,  28, 24)} # hut 1 left
	door_connections[5]  = {"a": _s( 1, 0, 212, 189,  6), "b": _s( 0, 2,  30,  46, 24)} # hut 1 right
	door_connections[6]  = {"a": _s( 2, 1, 193, 163,  6), "b": _s( 0, 3,  42,  28, 24)} # hut 2 left (hero home)
	door_connections[7]  = {"a": _s( 3, 0, 188, 189,  6), "b": _s( 0, 2,  32,  46, 24)} # hut 2 right
	door_connections[8]  = {"a": _s( 4, 1, 169, 163,  6), "b": _s( 0, 3,  42,  28, 24)} # hut 3 left
	door_connections[9]  = {"a": _s( 5, 0, 164, 189,  6), "b": _s( 0, 2,  32,  46, 24)} # hut 3 right
	door_connections[10] = {"a": _s(21, 0, 252, 202,  6), "b": _s( 0, 2,  28,  36, 24)} # to corridor (solitary path)
	door_connections[11] = {"a": _s(20, 0, 252, 218,  6), "b": _s( 0, 2,  26,  34, 24)} # to red cross room
	door_connections[12] = {"a": _s(15, 1, 247, 227,  6), "b": _s( 0, 3,  38,  25, 24)} # to uniform room (locked)
	door_connections[13] = {"a": _s(13, 1, 223, 227,  6), "b": _s( 0, 3,  42,  28, 24)} # to corridor (locked)
	door_connections[14] = {"a": _s( 8, 1, 151, 211,  6), "b": _s( 0, 3,  42,  21, 24)} # to corridor (locked)
	door_connections[15] = {"a": _s( 6, 1,   0,   0,  0), "b": _s( 0, 3,  34,  34, 24)} # unused room
	door_connections[16] = {"a": _s( 1, 1,  44,  52, 24), "b": _s(28, 3,  38,  26, 24)} # hut1 right ↔ hut1 left
	door_connections[17] = {"a": _s( 3, 1,  36,  54, 24), "b": _s( 2, 3,  38,  26, 24)} # hut2 right ↔ hut2 left
	door_connections[18] = {"a": _s( 5, 1,  36,  54, 24), "b": _s( 4, 3,  38,  26, 24)} # hut3 right ↔ hut3 left
	door_connections[19] = {"a": _s(23, 1,  40,  66, 24), "b": _s(25, 3,  38,  24, 24)} # mess hall A ↔ B
	door_connections[20] = {"a": _s(23, 0,  62,  36, 24), "b": _s(21, 2,  32,  46, 24)} # corridor 7 ↔ mess hall A
	door_connections[21] = {"a": _s(19, 1,  34,  66, 24), "b": _s(23, 3,  34,  28, 24)} # food room ↔ mess hall A
	door_connections[22] = {"a": _s(18, 1,  36,  54, 24), "b": _s(19, 3,  56,  34, 24)} # radio ↔ food (locked)
	door_connections[23] = {"a": _s(21, 1,  44,  54, 24), "b": _s(22, 3,  34,  28, 24)} # corridor 7 ↔ red key room
	door_connections[24] = {"a": _s(22, 1,  44,  54, 24), "b": _s(24, 3,  42,  38, 24)} # red key ↔ solitary (locked)
	door_connections[25] = {"a": _s(12, 1,  66,  58, 24), "b": _s(18, 3,  34,  28, 24)} # corridor 3 ↔ radio
	door_connections[26] = {"a": _s(17, 0,  60,  36, 24), "b": _s( 7, 2,  28,  34, 24)} # corridor 6 ↔ corridor
	door_connections[27] = {"a": _s(15, 0,  64,  40, 24), "b": _s(14, 2,  30,  40, 24)} # uniform ↔ torch
	door_connections[28] = {"a": _s(16, 1,  34,  66, 24), "b": _s(14, 3,  34,  28, 24)} # corridor 5 ↔ torch
	door_connections[29] = {"a": _s(16, 0,  62,  46, 24), "b": _s(13, 2,  26,  34, 24)} # corridor 5 ↔ corridor 4
	door_connections[30] = {"a": _s( 0, 0,  68,  48, 24), "b": _s( 0, 2,  32,  48, 24)} # outdoor ↔ outdoor (strange)
	door_connections[31] = {"a": _s(13, 0,  74,  40, 24), "b": _s(11, 2,  26,  34, 24)} # corridor 4 ↔ papers (locked)
	door_connections[32] = {"a": _s( 7, 0,  64,  36, 24), "b": _s(16, 2,  26,  34, 24)} # corridor ↔ corridor 5
	door_connections[33] = {"a": _s(10, 0,  54,  53, 24), "b": _s( 8, 2,  23,  38, 24)} # lockpick ↔ corridor 2
	door_connections[34] = {"a": _s( 9, 0,  54,  28, 24), "b": _s( 8, 2,  26,  34, 24)} # crate ↔ corridor 2 (locked)
	door_connections[35] = {"a": _s(12, 0,  62,  36, 24), "b": _s(17, 2,  26,  34, 24)} # corridor 3 ↔ corridor 6
	door_connections[36] = {"a": _s(29, 1,  54,  54, 24), "b": _s( 9, 3,  56,  10, 12)} # 2nd tunnel start ↔ crate
	door_connections[37] = {"a": _s(52, 1,  56,  98, 12), "b": _s(30, 3,  56,  10, 12)} # t52 ↔ t30
	door_connections[38] = {"a": _s(30, 0, 100,  52, 12), "b": _s(31, 2,  56,  38, 12)} # t30 ↔ t31
	door_connections[39] = {"a": _s(30, 1,  56,  98, 12), "b": _s(36, 3,  56,  10, 12)} # t30 ↔ t36
	door_connections[40] = {"a": _s(31, 0, 100,  52, 12), "b": _s(32, 2,  10,  52, 12)} # t31 ↔ t32
	door_connections[41] = {"a": _s(32, 1,  56,  98, 12), "b": _s(33, 3,  32,  52, 12)} # t32 ↔ t33
	door_connections[42] = {"a": _s(33, 1,  64,  52, 12), "b": _s(35, 3,  56,  10, 12)} # t33 ↔ t35
	door_connections[43] = {"a": _s(35, 0, 100,  52, 12), "b": _s(34, 2,  10,  52, 12)} # t35 ↔ t34
	door_connections[44] = {"a": _s(36, 0, 100,  52, 12), "b": _s(35, 2,  56,  28, 12)} # t36 ↔ t35
	door_connections[45] = {"a": _s(37, 0,  62,  34, 24), "b": _s( 2, 2,  16,  52, 12)} # tunnel entrance ↔ hut2 left
	door_connections[46] = {"a": _s(38, 0, 100,  52, 12), "b": _s(37, 2,  16,  52, 12)} # t38 ↔ t37
	door_connections[47] = {"a": _s(39, 1,  64,  52, 12), "b": _s(38, 3,  32,  52, 12)} # t39 ↔ t38
	door_connections[48] = {"a": _s(40, 0, 100,  52, 12), "b": _s(38, 2,  56,  84, 12)} # t40 ↔ t38
	door_connections[49] = {"a": _s(40, 1,  56,  98, 12), "b": _s(41, 3,  56,  10, 12)} # t40 ↔ t41
	door_connections[50] = {"a": _s(41, 0, 100,  52, 12), "b": _s(42, 2,  56,  38, 12)} # t41 ↔ t42
	door_connections[51] = {"a": _s(41, 1,  56,  98, 12), "b": _s(45, 3,  56,  10, 12)} # t41 ↔ t45
	door_connections[52] = {"a": _s(45, 0, 100,  52, 12), "b": _s(44, 2,  56,  28, 12)} # t45 ↔ t44
	door_connections[53] = {"a": _s(43, 1,  32,  52, 12), "b": _s(44, 3,  56,  10, 12)} # t43 ↔ t44
	door_connections[54] = {"a": _s(42, 1,  56,  98, 12), "b": _s(43, 3,  32,  52, 12)} # t42 ↔ t43
	door_connections[55] = {"a": _s(46, 0, 100,  52, 12), "b": _s(39, 2,  56,  28, 12)} # t46 ↔ t39
	door_connections[56] = {"a": _s(47, 1,  56,  98, 12), "b": _s(46, 3,  32,  52, 12)} # t47 ↔ t46
	door_connections[57] = {"a": _s(50, 0, 100,  52, 12), "b": _s(47, 2,  56,  86, 12)} # blocked tunnel ↔ t47
	door_connections[58] = {"a": _s(50, 1,  56,  98, 12), "b": _s(49, 3,  56,  10, 12)} # blocked tunnel ↔ t49
	door_connections[59] = {"a": _s(49, 0, 100,  52, 12), "b": _s(48, 2,  56,  28, 12)} # t49 ↔ t48
	door_connections[60] = {"a": _s(51, 1,  56,  98, 12), "b": _s(29, 3,  32,  52, 12)} # t51 ↔ 2nd tunnel start
	door_connections[61] = {"a": _s(52, 0, 100,  52, 12), "b": _s(51, 2,  56,  84, 12)} # t52 ↔ t51
