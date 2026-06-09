class_name RouteFollower
extends Node

signal route_completed
signal waypoint_reached(waypoint: WaypointData)

const ARRIVAL_DISTANCE: float = 4.0
const WANDER_INTERVAL_MIN: float = 2.0
const WANDER_INTERVAL_MAX: float = 4.0
const WANDER_RADIUS: int = 6

@export var route: RouteData

var _step: int = 0
var _active: bool = false
var _wander_timer: float = 0.0
var _wander_target: Vector2 = Vector2.ZERO
var _wandering_to_target: bool = false

func _ready() -> void:
	if route:
		set_route(route)

func set_route(new_route: RouteData, start_step: int = 0) -> void:
	route = new_route
	_step = start_step
	_active = new_route != null and not new_route.waypoints.is_empty()
	_wandering_to_target = false

func tick(delta: float) -> void:
	var character := get_parent() as Character
	if not character:
		return

	if not _active or route == null:
		_do_wander(delta, character)
		return

	var waypoint: WaypointData = route.waypoints[_step]

	if waypoint.type == WaypointData.Type.DOOR:
		RoomManager.request_transition(waypoint.door_id, character, waypoint.reversed)
		_advance_step()
		return

	var world_target := character.map_to_world(
		Vector3i(waypoint.map_pos.x, waypoint.map_pos.y, 0)
	)
	var dist := character.global_position.distance_to(world_target)

	if dist < ARRIVAL_DISTANCE:
		waypoint_reached.emit(waypoint)
		_advance_step()
		return

	var dir := (world_target - character.global_position).normalized()
	character.velocity = dir * Character.MOVE_SPEED
	character.move_and_slide()
	character.facing = character.direction_from_velocity(character.velocity)
	character.animator.play_walk(character.facing)

func _do_wander(delta: float, character: Character) -> void:
	if _wandering_to_target:
		var dist := character.global_position.distance_to(_wander_target)
		if dist < ARRIVAL_DISTANCE:
			_wandering_to_target = false
			character.velocity = Vector2.ZERO
			character.animator.play_idle(character.facing)
			_wander_timer = randf_range(WANDER_INTERVAL_MIN, WANDER_INTERVAL_MAX)
			return
		var dir := (_wander_target - character.global_position).normalized()
		character.velocity = dir * Character.MOVE_SPEED
		character.move_and_slide()
		character.facing = character.direction_from_velocity(character.velocity)
		character.animator.play_walk(character.facing)
	else:
		_wander_timer -= delta
		if _wander_timer <= 0.0:
			var offset := Vector2(
				randf_range(-WANDER_RADIUS, WANDER_RADIUS) * Character.TILE_W * 0.5,
				randf_range(-WANDER_RADIUS, WANDER_RADIUS) * Character.TILE_H * 0.5
			)
			_wander_target = character.global_position + offset
			_wandering_to_target = true

func _advance_step() -> void:
	_step += 1
	if _step >= route.waypoints.size():
		if route.loops:
			_step = 0
		else:
			_active = false
			route_completed.emit()

func stop() -> void:
	_active = false

func is_active() -> bool:
	return _active
