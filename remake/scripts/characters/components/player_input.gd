class_name PlayerInput
extends Node

func get_move_input() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_up", "move_down")

func is_action_just_pressed() -> bool:
	return Input.is_action_just_pressed("action")

func is_inventory_just_pressed() -> bool:
	return Input.is_action_just_pressed("inventory")

func has_any_input() -> bool:
	return get_move_input().length_squared() > 0.01 or is_action_just_pressed()
