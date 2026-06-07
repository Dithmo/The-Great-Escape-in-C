extends Node

signal room_changed(new_room_id: int)
signal transition_started
signal transition_finished

const TRANSITION_DURATION: float = 0.3
const ROOM_0_OUTDOOR: int = 0

var current_room_id: int = ROOM_0_OUTDOOR
var _transition_in_progress: bool = false
var _room_registry: Dictionary = {}  # room_id -> RoomData

func _ready() -> void:
	print("RoomManager ready")
	_load_room_registry()

func _load_room_registry() -> void:
	# Room data .tres files live in res://resources/rooms/
	# Named room_000.tres through room_052.tres
	for i in range(53):
		var path := "res://resources/rooms/room_%03d.tres" % i
		if ResourceLoader.exists(path):
			var data: RoomData = load(path)
			if data:
				_room_registry[data.room_id] = data

func request_transition(door_id: int, character: Node) -> void:
	if _transition_in_progress:
		return
	var room_data: RoomData = _room_registry.get(current_room_id)
	if not room_data:
		return
	var door: DoorData = room_data.get_door(door_id)
	if not door:
		return
	if door.is_locked:
		_handle_locked_door(door, character)
		return
	_begin_transition(door, character)

func _handle_locked_door(door: DoorData, character: Node) -> void:
	if not (character is PlayerCharacter):
		return
	var player := character as PlayerCharacter
	var inv: Inventory = player.get_node_or_null("Inventory")
	if not inv:
		return
	if door.required_key != ItemData.Type.NONE and inv.has_item(door.required_key):
		door.is_locked = false
		_begin_transition(door, character)
	elif inv.has_item(ItemData.Type.LOCKPICK):
		_start_lockpick(door, player)
	# else: blocked — no message yet

func _start_lockpick(_door: DoorData, _player: PlayerCharacter) -> void:
	# TODO: enter PICKING_LOCK action state with 3s timer
	pass

func _begin_transition(door: DoorData, character: Node) -> void:
	_transition_in_progress = true
	transition_started.emit()
	GameClock.pause()

	var tween: Tween = get_tree().create_tween()
	tween.tween_property(get_tree().current_scene, "modulate", Color.BLACK, TRANSITION_DURATION)
	await tween.finished

	current_room_id = door.connects_to_room
	_place_character_at_exit(character, door.exit_position)
	room_changed.emit(current_room_id)

	tween = get_tree().create_tween()
	tween.tween_property(get_tree().current_scene, "modulate", Color.WHITE, TRANSITION_DURATION)
	await tween.finished

	GameClock.resume()
	_transition_in_progress = false
	transition_finished.emit()

func _place_character_at_exit(character: Node, exit_pos: Vector2i) -> void:
	var c := character as Character
	if c:
		c.set_map_position(Vector3i(exit_pos.x, exit_pos.y, 0))

func get_current_room_data() -> RoomData:
	return _room_registry.get(current_room_id)

func is_gate_locked(door_id: int) -> bool:
	var room_data := get_current_room_data()
	if not room_data:
		return true
	var door := room_data.get_door(door_id)
	return door.is_locked if door else true

func unlock_exercise_gates() -> void:
	_set_exercise_gate_locks(false)

func lock_exercise_gates() -> void:
	_set_exercise_gate_locks(true)

func _set_exercise_gate_locks(locked: bool) -> void:
	# Exercise gates are door IDs 0-3 by convention
	for door_id in range(4):
		var room_data := get_current_room_data()
		if room_data:
			var door := room_data.get_door(door_id)
			if door:
				door.is_locked = locked
