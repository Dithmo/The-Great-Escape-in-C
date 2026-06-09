# All 46 named routes translated faithfully from the original game's C source.
#
# Coordinate notes:
#   - Location coordinates are in the original game's 0–255 outdoor map space.
#   - Door IDs (0–61) match the original game's doors[] array exactly.
#   - When the outdoor TileMap is set up, calibrate Character.TILE_W/TILE_H so
#     that map_to_world(Vector3i(68, 104, 0)) lands on the correct tile.
#
# Source: Engine/Main.c  get_route() function + locations[] array.

extends Node

var routes: Dictionary = {}

# 78-entry location table from Main.c locations[] (pos8_t u, v pairs).
# Index matches LOCATION(n) macro: LOCATION(n) = n + 40 in route bytes.
const LOCATIONS: Array[Vector2i] = [
	Vector2i( 68, 104), Vector2i( 68,  84), Vector2i( 68,  70), Vector2i( 64, 102), # 0–3
	Vector2i( 64,  64), Vector2i( 68,  68), Vector2i( 64,  64), Vector2i( 68,  64), # 4–7
	Vector2i(104, 112), Vector2i( 96, 112), Vector2i(106, 102), Vector2i( 93, 104), # 8–11
	Vector2i(124, 101), Vector2i(124, 112), Vector2i(116, 104), Vector2i(112, 100), # 12–15
	Vector2i(120,  96), Vector2i(128,  88), Vector2i(112,  96), Vector2i(116,  84), # 16–19
	Vector2i(124, 100), Vector2i(124, 112), Vector2i(116, 104), Vector2i(112, 100), # 20–23
	Vector2i(102,  68), Vector2i(102,  64), Vector2i( 96,  64), Vector2i( 92,  68), # 24–27
	Vector2i( 86,  68), Vector2i( 84,  64), Vector2i( 74,  68), Vector2i( 74,  64), # 28–31
	Vector2i(102,  68), Vector2i( 68,  68), Vector2i( 68, 104),                     # 32–34
	Vector2i(107,  69), Vector2i(107,  45), Vector2i( 77,  45), Vector2i( 77,  61), # 35–38
	Vector2i( 61,  61), Vector2i( 61, 103),                                          # 39–40
	Vector2i(116,  76), Vector2i( 44,  42), Vector2i(106,  72), Vector2i(110,  72), # 41–44
	Vector2i( 81, 104),                                                               # 45
	Vector2i( 52,  60), Vector2i( 52,  44), Vector2i( 52,  28),                     # 46–48
	Vector2i(119, 107), Vector2i(122, 110), Vector2i( 52,  28),                     # 49–51
	Vector2i( 40,  60), Vector2i( 36,  34),                                          # 52–53
	Vector2i( 80,  76), Vector2i( 89,  76),                                          # 54–55
	Vector2i( 89,  60), Vector2i(100,  61), Vector2i( 92,  54), Vector2i( 84,  50), # 56–59
	Vector2i(102,  48), Vector2i( 96,  56), Vector2i( 79,  59), Vector2i(103,  47), # 60–63
	Vector2i( 52,  54), Vector2i( 52,  46), Vector2i( 52,  36), Vector2i( 52,  62), # 64–67
	Vector2i( 32,  56), Vector2i( 52,  24),                                          # 68–69
	Vector2i( 42,  46), Vector2i( 34,  34),                                          # 70–71
	Vector2i(120, 110), Vector2i(118, 110), Vector2i(116, 110),                     # 72–74
	Vector2i(121, 109), Vector2i(119, 109), Vector2i(117, 109),                     # 75–77
]

func _ready() -> void:
	_build_routes()
	print("RouteRegistry ready — %d routes" % routes.size())

func get_route(name: String) -> RouteData:
	return routes.get(name)

func _loc(i: int) -> WaypointData:
	return WaypointData.at(LOCATIONS[i].x, LOCATIONS[i].y)

func _door(id: int, rev: bool = false) -> WaypointData:
	return WaypointData.door(id, rev)

func _make(name: String, wps: Array, loops: bool = false) -> void:
	var r := RouteData.new()
	r.route_name = name
	r.waypoints.assign(wps)
	r.loops = loops
	routes[name] = r

func _build_routes() -> void:
	# 0 — HALT: empty route, character stands still
	_make("halt", [])

	# 1 — L-shaped route in fenced area
	_make("fenced_area", [
		_loc(32), _loc(33), _loc(34),
	], true)

	# 2 — Guard perimeter walk
	_make("guard_perimeter_walk", [
		_loc(35), _loc(36), _loc(37), _loc(38), _loc(39), _loc(40),
	], true)

	# 3 — Commandant's circuit (longest route)
	_make("commandant", [
		_loc(46),
		_door(31), _door(29), _door(32), _door(26), _door(35),
		_door(25, true), _door(22, true), _door(21, true), _door(20, true), _door(23, true),
		_loc(42),
		_door(23),
		_door(10, true), _door(11), _door(11, true), _door(12),
		_door(27, true), _door(28), _door(29, true), _door(13, true),
		_loc(11), _loc(55),
		_door(0, true), _door(1, true),
		_loc(60),
		_door(1), _door(0),
		_door(4), _door(16), _door(5, true),
		_loc(11),
		_door(7), _door(17, true), _door(6, true),
		_door(8), _door(18), _door(9, true),
		_loc(45),
		_door(14), _door(34), _door(34, true), _door(33), _door(33, true),
	], true)

	# 4 — Guard marching over main gate
	_make("guard_marching_main_gate", [
		_loc(43), _loc(44),
	], true)

	# 5 — Exit hut 2 (guards 12/13, prisoners 1/2/3 on wake_up and bedtime)
	_make("exit_hut2", [
		_door(7, true), _loc(11), _loc(12),
	])

	# 6 — Exit hut 3 (guards 14/15, prisoners 4/5/6)
	_make("exit_hut3", [
		_door(9, true), _loc(45), _loc(14),
	])

	# 7–12 — Prisoner sleep positions (7/8/9 = prisoners 1/2/3, 10/11/12 = prisoners 4/5/6)
	_make("prisoner_sleeps_1", [_loc(46)])
	_make("prisoner_sleeps_2", [_loc(47)])
	_make("prisoner_sleeps_3", [_loc(48)])
	_make("prisoner_sleeps_4", [_loc(46)])
	_make("prisoner_sleeps_5", [_loc(47)])
	_make("prisoner_sleeps_6", [_loc(48)])

	# 13 — Hostile bed position (all guards when going to bed, used by character_bed_common)
	_make("hostile_bed", [_loc(52), _loc(53)])

	# 14/15 — Go to yard (two groups; same waypoints, assigned separately)
	var yard_wps: Array = [
		_loc(11), _loc(55), _door(0, true), _door(1, true), _loc(56),
	]
	_make("go_to_yard_1", yard_wps)
	_make("go_to_yard_2", yard_wps.duplicate())

	# 16 — Breakfast room 25 (hero + group 1)
	_make("breakfast_room_25", [
		_loc(12), _door(10), _door(20), _door(19, true),
	])

	# 17 — Breakfast room 23 (group 2)
	_make("breakfast_room_23", [
		_loc(16), _loc(12), _door(10), _door(20),
	])

	# 18–23 — Prisoner breakfast seating (18–20 = prisoners 1/2/3, 21–23 = prisoners 4/5/6)
	_make("prisoner_sits_1", [_loc(64)])
	_make("prisoner_sits_2", [_loc(65)])
	_make("prisoner_sits_3", [_loc(66)])
	_make("prisoner_sits_4", [_loc(64)])
	_make("prisoner_sits_5", [_loc(65)])
	_make("prisoner_sits_6", [_loc(66)])

	# 24–25 — Guard breakfast positions
	_make("guard_a_breakfast", [_loc(68)])
	_make("guard_b_breakfast", [_loc(69)])

	# 26–35 — Roll call positions (each character gets their own spot)
	_make("guard_12_roll_call",   [_loc(9)])
	_make("guard_13_roll_call",   [_loc(11)])
	_make("prisoner_1_roll_call", [_loc(72)])
	_make("prisoner_2_roll_call", [_loc(73)])
	_make("prisoner_3_roll_call", [_loc(74)])
	_make("guard_14_roll_call",   [_loc(17)])
	_make("guard_15_roll_call",   [_loc(49)])
	_make("prisoner_4_roll_call", [_loc(75)])
	_make("prisoner_5_roll_call", [_loc(76)])
	_make("prisoner_6_roll_call", [_loc(77)])

	# 36 — Go to solitary (escort + commandant escort path)
	_make("go_to_solitary", [
		_loc(14), _door(10), _door(23, true), _door(24, true), _loc(42),
	])

	# 37 — Hero leaves solitary
	_make("hero_leave_solitary", [
		_door(24), _door(23), _door(10, true), _loc(14),
	])

	# 38–41 — Guard bedtime routes
	_make("guard_12_bed", [_loc(12), _loc(11), _door(7),           _loc(52)])
	_make("guard_13_bed", [_loc(12), _loc(11), _door(7), _door(17, true), _loc(53)])
	_make("guard_14_bed", [_loc(12), _loc(11), _loc(45), _door(9),        _loc(52)])
	_make("guard_15_bed", [_loc(12), _loc(11), _loc(45), _door(9),        _loc(53)])

	# 42 — Hut 2 left to right (hero waking up, moving through hut)
	_make("hut2_left_to_right", [_door(17)])

	# 43 — Breakfast position (hero after leaving breakfast)
	_make("breakfast_position", [_loc(67)])

	# 44 — Hut 2 right to left (hero going to bed)
	_make("hut2_right_to_left", [_door(17, true), _loc(70)])

	# 45 — Hero roll call position
	_make("hero_roll_call", [_loc(50)])
