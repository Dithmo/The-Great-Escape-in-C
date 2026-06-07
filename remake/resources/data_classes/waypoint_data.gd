class_name WaypointData
extends Resource

enum Type { MAP_POSITION, DOOR }

@export var type: Type = Type.MAP_POSITION
@export var map_pos: Vector2i = Vector2i.ZERO
@export var door_id: int = -1

static func at(u: int, v: int) -> WaypointData:
	var wp := WaypointData.new()
	wp.type = Type.MAP_POSITION
	wp.map_pos = Vector2i(u, v)
	return wp

static func door(id: int) -> WaypointData:
	var wp := WaypointData.new()
	wp.type = Type.DOOR
	wp.door_id = id
	return wp
