class_name PursuitController
extends Node

enum PursuitMode {
	NONE,
	PURSUE,    # chase hero unconditionally (red flag active)
	HASSLE,    # chase hero only if hero is under manual player control
	DOG_FOOD,  # dog chasing a poisoned food item node
	SAW_BRIBE, # guard chasing the character who just received a bribe
}

var mode: PursuitMode = PursuitMode.NONE
var target_node: Node2D = null

func set_mode(new_mode: PursuitMode, target: Node2D = null) -> void:
	mode = new_mode
	target_node = target

func clear() -> void:
	mode = PursuitMode.NONE
	target_node = null

func is_pursuing() -> bool:
	return mode != PursuitMode.NONE

# HASSLE only activates when the player is under manual control.
# If the player is on autopilot this returns false, making autopilot genuinely safer.
func should_pursue_player(player_on_autopilot: bool) -> bool:
	match mode:
		PursuitMode.PURSUE:
			return true
		PursuitMode.HASSLE:
			return not player_on_autopilot
		_:
			return false
