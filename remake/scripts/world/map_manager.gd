class_name MapManager
extends Node

# Outdoor map dimensions (supertile grid, same as original)
const MAP_WIDTH: int = 54
const MAP_HEIGHT: int = 34

# Tile pixel dimensions for isometric projection
const TILE_W: float = 64.0
const TILE_H: float = 32.0
const STEP_H: float = 8.0

# Max visible characters (matching original engine limit)
const MAX_VISIBLE_CHARS: int = 8
const SPAWN_RADIUS: int = 8
const DESPAWN_RADIUS: int = 9

@export var tile_map: TileMapLayer

var _spawned_characters: Array[Node] = []
var _character_data_registry: Array[CharacterData] = []

func _ready() -> void:
	GameClock.schedule_event_fired.connect(_on_schedule_event)

func register_character_data(data: CharacterData) -> void:
	_character_data_registry.append(data)

func map_to_world(u: int, v: int, w: int = 0) -> Vector2:
	return Vector2(
		(u - v) * (TILE_W * 0.5),
		(u + v) * (TILE_H * 0.5) - w * STEP_H
	)

func world_to_map(world_pos: Vector2) -> Vector2i:
	var u := int(round(world_pos.x / TILE_W + world_pos.y / TILE_H))
	var v := int(round(-world_pos.x / TILE_W + world_pos.y / TILE_H))
	return Vector2i(u, v)

func is_in_bounds(map_pos: Vector2i) -> bool:
	return map_pos.x >= 0 and map_pos.x < MAP_WIDTH and \
		   map_pos.y >= 0 and map_pos.y < MAP_HEIGHT

func _on_schedule_event(event_name: String) -> void:
	if event_name == "exercise_start":
		RoomManager.unlock_exercise_gates()
	elif event_name == "exercise_end":
		RoomManager.lock_exercise_gates()
