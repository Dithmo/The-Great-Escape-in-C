class_name RoomData
extends Resource

@export var room_id: int = 0
@export var room_name: String = ""
@export var scene_path: String = ""
@export var doors: Array[DoorData] = []
# item_type (int) -> Vector2i map position
@export var default_item_positions: Dictionary = {}

func get_door(door_id: int) -> DoorData:
	for door: DoorData in doors:
		if door.door_id == door_id:
			return door
	return null
