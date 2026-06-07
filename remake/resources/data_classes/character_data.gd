class_name CharacterData
extends Resource

enum Type { COMMANDANT, GUARD, DOG, PRISONER }

@export var character_id: int = 0
@export var character_name: String = ""
@export var character_type: Type = Type.GUARD
@export var default_room: int = 0
@export var default_map_pos: Vector2i = Vector2i.ZERO
@export var default_route: RouteData
# Maps schedule event name -> RouteData to assign
@export var schedule_routes: Dictionary = {}

func get_route_for_event(event_name: String) -> RouteData:
	return schedule_routes.get(event_name, null)

func is_hostile() -> bool:
	return character_type == Type.GUARD or character_type == Type.COMMANDANT or character_type == Type.DOG
