# Definitions for all 26 named characters.
# Schedule routes assigned per the original game's event handlers.
# Starting positions are in the original game's 0–255 coordinate space.
# Source: Engine/Main.c character_structs[], Engine/Events.c event handlers.

extends Node

var character_defs: Array[CharacterData] = []

func _ready() -> void:
	# Route registry must be ready first — Godot loads autoloads in project.godot order
	_build()
	print("CharacterRegistry ready — %d characters" % character_defs.size())

func get_character(character_id: int) -> CharacterData:
	for cd in character_defs:
		if cd.character_id == character_id:
			return cd
	return null

func get_all_npcs() -> Array[CharacterData]:
	var result: Array[CharacterData] = []
	for cd in character_defs:
		if cd.character_id > 0:  # 0 = hero, skip
			result.append(cd)
	return result

func _char(
		cid: int, cname: String, ctype: CharacterData.Type,
		room: int, u: int, v: int,
		default_route_name: String,
		schedule: Dictionary) -> void:
	var cd := CharacterData.new()
	cd.character_id     = cid
	cd.character_name   = cname
	cd.character_type   = ctype
	cd.default_room     = room
	cd.default_map_pos  = Vector2i(u, v)
	cd.default_route    = RouteRegistry.get_route(default_route_name)
	for event: String in schedule:
		var r: RouteData = RouteRegistry.get_route(schedule[event])
		if r:
			cd.schedule_routes[event] = r
	character_defs.append(cd)

func _build() -> void:
	var G := CharacterData.Type.GUARD
	var P := CharacterData.Type.PRISONER
	var D := CharacterData.Type.DOG
	var C := CharacterData.Type.COMMANDANT

	# Character 0 is the hero — defined in PlayerCharacter, not here.

	# Commandant (character 3 in original) — patrols the entire camp
	_char(3, "Commandant", C, 11, 52, 60, "commandant", {
		"roll_call":      "commandant",
		"exercise_start": "commandant",
		"bedtime":        "commandant",
	})

	# Guards 1–4: outdoor patrol routes
	_char(1, "Guard 1",  G, 0, 102, 68, "fenced_area",         {})
	_char(2, "Guard 2",  G, 0,  61, 61, "guard_perimeter_walk",{})
	_char(4, "Guard 4",  G, 0, 107, 69, "guard_marching_main_gate", {})

	# Guards 5–11: wander outdoors (no assigned patrol route — use wander mode)
	_char(5,  "Guard 5",  G, 0,  89, 76, "", {})
	_char(6,  "Guard 6",  G, 0,  93,104, "", {})
	_char(7,  "Guard 7",  G, 0, 116, 84, "", {})
	_char(8,  "Guard 8",  G, 0,  84, 50, "", {})
	_char(9,  "Guard 9",  G, 0,  96, 56, "", {})
	_char(10, "Guard 10", G, 0,  79, 59, "", {})
	_char(11, "Guard 11", G, 0, 103, 47, "", {})

	# Guards 12–15: hut-based guards with full schedule routes
	_char(12, "Guard 12", G, 3, 40, 60, "exit_hut2", {
		"wake_up":        "exit_hut2",
		"roll_call":      "guard_12_roll_call",
		"breakfast":      "guard_a_breakfast",
		"end_breakfast":  "exit_hut2",
		"exercise_start": "go_to_yard_1",
		"bedtime":        "guard_12_bed",
		"night_starts":   "guard_12_bed",
	})
	_char(13, "Guard 13", G, 2, 36, 34, "exit_hut2", {
		"wake_up":        "exit_hut2",
		"roll_call":      "guard_13_roll_call",
		"breakfast":      "guard_b_breakfast",
		"end_breakfast":  "exit_hut2",
		"exercise_start": "go_to_yard_1",
		"bedtime":        "guard_13_bed",
		"night_starts":   "guard_13_bed",
	})
	_char(14, "Guard 14", G, 5, 40, 60, "exit_hut3", {
		"wake_up":        "exit_hut3",
		"roll_call":      "guard_14_roll_call",
		"breakfast":      "guard_a_breakfast",
		"end_breakfast":  "exit_hut3",
		"exercise_start": "go_to_yard_2",
		"bedtime":        "guard_14_bed",
		"night_starts":   "guard_14_bed",
	})
	_char(15, "Guard 15", G, 4, 36, 34, "exit_hut3", {
		"wake_up":        "exit_hut3",
		"roll_call":      "guard_15_roll_call",
		"breakfast":      "guard_b_breakfast",
		"end_breakfast":  "exit_hut3",
		"exercise_start": "go_to_yard_2",
		"bedtime":        "guard_15_bed",
		"night_starts":   "guard_15_bed",
	})

	# Guard dogs 1–4: wander their zones, react to poisoned food
	_char(16, "Dog 1", D, 0,  68, 104, "", {})
	_char(17, "Dog 2", D, 0,  68,  84, "", {})
	_char(18, "Dog 3", D, 0, 102,  68, "", {})
	_char(19, "Dog 4", D, 0, 102,  64, "", {})

	# Prisoners 1–6: full schedule routes
	_char(20, "Prisoner 1", P, 3, 52, 60, "prisoner_sleeps_1", {
		"wake_up":        "exit_hut2",
		"roll_call":      "prisoner_1_roll_call",
		"breakfast":      "prisoner_sits_1",
		"end_breakfast":  "exit_hut2",
		"exercise_start": "go_to_yard_1",
		"bedtime":        "hut2_right_to_left",
	})
	_char(21, "Prisoner 2", P, 2, 52, 44, "prisoner_sleeps_2", {
		"wake_up":        "exit_hut2",
		"roll_call":      "prisoner_2_roll_call",
		"breakfast":      "prisoner_sits_2",
		"end_breakfast":  "exit_hut2",
		"exercise_start": "go_to_yard_1",
		"bedtime":        "hut2_right_to_left",
	})
	_char(22, "Prisoner 3", P, 3, 52, 28, "prisoner_sleeps_3", {
		"wake_up":        "exit_hut2",
		"roll_call":      "prisoner_3_roll_call",
		"breakfast":      "prisoner_sits_3",
		"end_breakfast":  "exit_hut2",
		"exercise_start": "go_to_yard_1",
		"bedtime":        "hut2_right_to_left",
	})
	_char(23, "Prisoner 4", P, 5, 52, 60, "prisoner_sleeps_4", {
		"wake_up":        "exit_hut3",
		"roll_call":      "prisoner_4_roll_call",
		"breakfast":      "prisoner_sits_4",
		"end_breakfast":  "exit_hut3",
		"exercise_start": "go_to_yard_2",
		"bedtime":        "hut2_right_to_left",
	})
	_char(24, "Prisoner 5", P, 4, 52, 44, "prisoner_sleeps_5", {
		"wake_up":        "exit_hut3",
		"roll_call":      "prisoner_5_roll_call",
		"breakfast":      "prisoner_sits_5",
		"end_breakfast":  "exit_hut3",
		"exercise_start": "go_to_yard_2",
		"bedtime":        "hut2_right_to_left",
	})
	_char(25, "Prisoner 6", P, 5, 52, 28, "prisoner_sleeps_6", {
		"wake_up":        "exit_hut3",
		"roll_call":      "prisoner_6_roll_call",
		"breakfast":      "prisoner_sits_6",
		"end_breakfast":  "exit_hut3",
		"exercise_start": "go_to_yard_2",
		"bedtime":        "hut2_right_to_left",
	})
