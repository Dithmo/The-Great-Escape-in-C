extends Node

signal room_changed(new_room_id: int)
signal transition_started
signal transition_finished

const TRANSITION_DURATION: float = 0.3
const ROOM_0_OUTDOOR: int = 0

var current_room_id: int = ROOM_0_OUTDOOR
var _transition_in_progress: bool = false
var _locked_doors: Dictionary = {}  # door_id -> bool

func _ready() -> void:
	print("RoomManager ready")
	_init_locked_doors()

func _init_locked_doors() -> void:
	for door_id: int in RoomRegistry.INITIALLY_LOCKED:
		_locked_doors[door_id] = true

func is_door_locked(door_id: int) -> bool:
	return _locked_doors.get(door_id, false)

func set_door_locked(door_id: int, locked: bool) -> void:
	if locked:
		_locked_doors[door_id] = true
	else:
		_locked_doors.erase(door_id)

func request_transition(door_id: int, character: Node, reversed: bool = false) -> void:
	if _transition_in_progress:
		return
	var exit: Dictionary = RoomRegistry.get_door_exit(door_id, reversed)
	if exit.is_empty():
		return
	if is_door_locked(door_id):
		_handle_locked_door(door_id, character, reversed)
		return
	_begin_transition(exit, character)

func _handle_locked_door(door_id: int, character: Node, reversed: bool) -> void:
	if not (character is PlayerCharacter):
		return
	var player := character as PlayerCharacter
	var inv: Inventory = player.get_node_or_null("Inventory")
	if not inv:
		return
	if inv.has_item(ItemData.Type.LOCKPICK):
		_start_lockpick(door_id, player, reversed)

func _start_lockpick(_door_id: int, _player: PlayerCharacter, _reversed: bool) -> void:
	# TODO: enter PICKING_LOCK action state with 3s timer
	pass

func _begin_transition(exit: Dictionary, character: Node) -> void:
	_transition_in_progress = true
	transition_started.emit()
	GameClock.pause()

	var fade_target: Node = _get_fade_target()
	var tween: Tween = get_tree().create_tween()
	tween.tween_property(fade_target, "modulate", Color.BLACK, TRANSITION_DURATION)
	await tween.finished

	current_room_id = exit["room_id"]
	_place_character_at_exit(character, exit["pos"])
	room_changed.emit(current_room_id)

	tween = get_tree().create_tween()
	tween.tween_property(fade_target, "modulate", Color.WHITE, TRANSITION_DURATION)
	await tween.finished

	GameClock.resume()
	_transition_in_progress = false
	transition_finished.emit()

func _get_fade_target() -> Node:
	var fade_layer: Node = get_node_or_null("/root/Main/FadeLayer")
	if fade_layer:
		return fade_layer
	return get_tree().current_scene

func _place_character_at_exit(character: Node, exit_pos: Vector3i) -> void:
	var c := character as Character
	if c:
		c.set_map_position(exit_pos)

func get_current_room_id() -> int:
	return current_room_id

func is_gate_locked(door_id: int) -> bool:
	return is_door_locked(door_id)

func unlock_exercise_gates() -> void:
	_set_exercise_gate_locks(false)

func lock_exercise_gates() -> void:
	_set_exercise_gate_locks(true)

func _set_exercise_gate_locks(locked: bool) -> void:
	# Exercise gates are always door IDs 0 and 1, independent of current room
	set_door_locked(0, locked)
	set_door_locked(1, locked)
