class_name AutopilotController
extends Node

# Frames of no input before autopilot activates (180 = 3s at 60fps)
const IDLE_FRAMES_TO_ACTIVATE: int = 180

var _idle_counter: int = 0
var _forced: bool = false

func _process(_delta: float) -> void:
	if not is_active():
		_idle_counter += 1

func reset() -> void:
	_idle_counter = 0
	_forced = false

func force_route(route: RouteData) -> void:
	_forced = true
	_idle_counter = IDLE_FRAMES_TO_ACTIVATE
	var follower: RouteFollower = get_parent().get_node_or_null("RouteFollower")
	if follower and route:
		follower.set_route(route)

func is_active() -> bool:
	return _idle_counter >= IDLE_FRAMES_TO_ACTIVATE or _forced

func clear_force() -> void:
	_forced = false
	_idle_counter = 0
