class_name Character
extends CharacterBody2D

const MOVE_SPEED: float = 80.0
const TILE_W: float = 64.0
const TILE_H: float = 32.0
const STEP_H: float = 8.0

enum Direction { TOP_LEFT = 0, TOP_RIGHT = 1, BOTTOM_RIGHT = 2, BOTTOM_LEFT = 3 }

@export var character_data: CharacterData

@onready var animator: CharacterAnimator = $CharacterAnimator
@onready var route_follower: RouteFollower = $RouteFollower
@onready var pursuit_ctrl: PursuitController = $PursuitController

var map_pos: Vector3i = Vector3i.ZERO
var facing: int = Direction.BOTTOM_RIGHT

func _ready() -> void:
	add_to_group("characters")

func _physics_process(_delta: float) -> void:
	_sync_map_pos()

func _sync_map_pos() -> void:
	map_pos = world_to_map(global_position)

# Isometric projection: map space -> world pixel space
func map_to_world(mpos: Vector3i) -> Vector2:
	return Vector2(
		(mpos.x - mpos.y) * (TILE_W * 0.5),
		(mpos.x + mpos.y) * (TILE_H * 0.5) - mpos.z * STEP_H
	)

# Approximate inverse (ignores elevation)
func world_to_map(wpos: Vector2) -> Vector3i:
	var u := int(round(wpos.x / TILE_W + wpos.y / TILE_H))
	var v := int(round(-wpos.x / TILE_W + wpos.y / TILE_H))
	return Vector3i(u, v, 0)

func set_map_position(mpos: Vector3i) -> void:
	map_pos = mpos
	global_position = map_to_world(mpos)

func direction_from_velocity(vel: Vector2) -> int:
	if vel.length_squared() < 0.01:
		return facing
	var angle := vel.angle()
	if angle < -PI * 0.75:  return Direction.TOP_LEFT
	if angle < -PI * 0.25:  return Direction.TOP_RIGHT
	if angle < PI * 0.25:   return Direction.BOTTOM_RIGHT
	if angle < PI * 0.75:   return Direction.BOTTOM_LEFT
	return Direction.TOP_LEFT
