class_name PlayerCharacter
extends Character

const SCHEDULE_REWARD_RADIUS: float = 96.0

@onready var input_ctrl: PlayerInput = $PlayerInput
@onready var inventory: Inventory = $Inventory
@onready var autopilot: AutopilotController = $AutopilotController

var _schedule_location: Vector2 = Vector2.ZERO
var _schedule_reward_pending: int = 0

func _ready() -> void:
	super._ready()
	add_to_group("player")
	GameManager.player_caught.connect(_on_caught)
	GameClock.schedule_event_fired.connect(_on_schedule_event)

func _physics_process(delta: float) -> void:
	if GameManager.state != GameManager.GameState.PLAYING:
		return

	var move_input := input_ctrl.get_move_input()
	var has_input := move_input.length_squared() > 0.01

	if has_input:
		autopilot.reset()
		_apply_input_movement(move_input)
	elif autopilot.is_active():
		route_follower.tick(delta)
	else:
		velocity = Vector2.ZERO
		animator.play_idle(facing)

	move_and_slide()

	if input_ctrl.is_action_just_pressed():
		_try_action()

	if _schedule_reward_pending > 0:
		_check_schedule_attendance()

	super._physics_process(delta)

func _apply_input_movement(move_input: Vector2) -> void:
	# Convert screen-space WASD into isometric world direction
	var iso_dir := Vector2(
		(move_input.x - move_input.y),
		(move_input.x + move_input.y) * 0.5
	).normalized()
	velocity = iso_dir * MOVE_SPEED
	facing = direction_from_velocity(velocity)
	animator.play_walk(facing)

func _try_action() -> void:
	# Priority: pick up nearby item, else use held item
	var nearby: Node = inventory.get_nearby_item()
	if nearby:
		inventory.pick_up(nearby)
		return
	var held: Array = inventory.get_all_held()
	if not held.is_empty():
		inventory.use_item(0)

func _on_caught() -> void:
	# Force-walk to solitary via autopilot
	var solitary_route: RouteData = RouteRegistry.get_route("go_to_solitary")
	if solitary_route:
		autopilot.force_route(solitary_route)
	MoraleManager.adjust(-15)

func _on_schedule_event(event_name: String) -> void:
	match event_name:
		"roll_call":
			_schedule_reward_pending = 8
		"breakfast":
			_schedule_reward_pending = 5

func _check_schedule_attendance() -> void:
	if global_position.distance_to(_schedule_location) < SCHEDULE_REWARD_RADIUS:
		MoraleManager.award_attendance(_schedule_reward_pending)
	_schedule_reward_pending = 0

func set_schedule_location(pos: Vector2) -> void:
	_schedule_location = pos

func is_on_autopilot() -> bool:
	return autopilot.is_active()
