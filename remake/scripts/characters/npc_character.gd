class_name NPCCharacter
extends Character

const CATCH_DISTANCE: float = 12.0
const PURSUE_SPEED_MULTIPLIER: float = 1.2

var character_id: int = -1

func _ready() -> void:
	super._ready()
	add_to_group("npcs")
	if character_data:
		character_id = character_data.character_id
		if character_data.default_route:
			route_follower.set_route(character_data.default_route)

	GameClock.schedule_event_fired.connect(_on_schedule_event)
	GameManager.red_flag_raised.connect(_on_red_flag_raised)
	GameManager.red_flag_cleared.connect(_on_red_flag_cleared)

func _physics_process(delta: float) -> void:
	if GameManager.state != GameManager.GameState.PLAYING:
		return

	var player := get_tree().get_first_node_in_group("player") as PlayerCharacter

	match pursuit_ctrl.mode:
		PursuitController.PursuitMode.PURSUE:
			_chase_player(player)
		PursuitController.PursuitMode.HASSLE:
			if player and not player.is_on_autopilot():
				_chase_player(player)
			else:
				route_follower.tick(delta)
		PursuitController.PursuitMode.DOG_FOOD:
			_chase_target(pursuit_ctrl.target_node)
		PursuitController.PursuitMode.SAW_BRIBE:
			_chase_target(pursuit_ctrl.target_node)
		_:
			route_follower.tick(delta)

	super._physics_process(delta)

func _chase_player(player: PlayerCharacter) -> void:
	if not player:
		return
	var dir := (player.global_position - global_position).normalized()
	velocity = dir * MOVE_SPEED * PURSUE_SPEED_MULTIPLIER
	move_and_slide()
	facing = direction_from_velocity(velocity)
	animator.play_walk(facing)

	if global_position.distance_to(player.global_position) < CATCH_DISTANCE:
		GameManager.send_to_solitary()

func _chase_target(target: Node2D) -> void:
	if not target:
		pursuit_ctrl.clear()
		return
	var dir := (target.global_position - global_position).normalized()
	velocity = dir * MOVE_SPEED
	move_and_slide()
	facing = direction_from_velocity(velocity)
	animator.play_walk(facing)

	if global_position.distance_to(target.global_position) < 8.0:
		# Reached target (food, bribed char, etc.)
		pursuit_ctrl.clear()
		if pursuit_ctrl.mode == PursuitController.PursuitMode.DOG_FOOD:
			target.queue_free()

func assign_route(route: RouteData) -> void:
	route_follower.set_route(route)
	pursuit_ctrl.clear()

func _on_schedule_event(event_name: String) -> void:
	if not character_data:
		return
	var new_route: RouteData = character_data.get_route_for_event(event_name)
	if new_route:
		assign_route(new_route)

func _on_red_flag_raised() -> void:
	if character_data and character_data.is_hostile():
		pursuit_ctrl.set_mode(PursuitController.PursuitMode.PURSUE)

func _on_red_flag_cleared() -> void:
	if pursuit_ctrl.mode == PursuitController.PursuitMode.PURSUE:
		pursuit_ctrl.clear()
		# Resume prior schedule route
		_on_schedule_event(GameClock.get_next_event_name())
