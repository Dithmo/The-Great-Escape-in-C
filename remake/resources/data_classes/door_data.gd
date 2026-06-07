class_name DoorData
extends Resource

@export var door_id: int = 0
@export var is_locked: bool = false
@export var required_key: ItemData.Type = ItemData.Type.NONE
@export var connects_to_room: int = 0
@export var exit_position: Vector2i = Vector2i.ZERO
