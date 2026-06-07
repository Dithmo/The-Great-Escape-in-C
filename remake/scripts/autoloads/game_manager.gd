extends Node

signal red_flag_raised
signal red_flag_cleared
signal player_caught
signal player_escaped
signal game_over

enum GameState { PLAYING, CAUGHT, ESCAPED, GAME_OVER }

var state: GameState = GameState.PLAYING
var red_flag: bool = false
var in_solitary: bool = false
var solitary_release_time: int = -1
var bribed_character_id: int = -1
var current_room_id: int = 0
var day_number: int = 1

func _ready() -> void:
	print("GameManager ready")

func raise_red_flag() -> void:
	if red_flag:
		return
	red_flag = true
	red_flag_raised.emit()

func clear_red_flag() -> void:
	if not red_flag:
		return
	red_flag = false
	red_flag_cleared.emit()

func send_to_solitary() -> void:
	if in_solitary:
		return
	in_solitary = true
	solitary_release_time = GameClock.game_time + 20
	state = GameState.CAUGHT
	player_caught.emit()

func release_from_solitary() -> void:
	in_solitary = false
	state = GameState.PLAYING
	clear_red_flag()

func trigger_escape() -> void:
	state = GameState.ESCAPED
	player_escaped.emit()

func trigger_game_over() -> void:
	state = GameState.GAME_OVER
	game_over.emit()

func check_escape_condition(inventory_slots: Array) -> bool:
	var required: Array[ItemData.Type] = [
		ItemData.Type.PAPERS,
		ItemData.Type.COMPASS,
		ItemData.Type.PURSE,
		ItemData.Type.UNIFORM,
	]
	for item_type in required:
		var found := false
		for slot in inventory_slots:
			if slot != null and slot.type == item_type:
				found = true
				break
		if not found:
			return false
	return true

func tick_solitary_check() -> void:
	if in_solitary and GameClock.game_time >= solitary_release_time:
		release_from_solitary()
