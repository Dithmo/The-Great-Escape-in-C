class_name CharacterAnimator
extends Node

const WALK_ANIMS: Array[StringName] = [
	&"walk_tl", &"walk_tr", &"walk_br", &"walk_bl"
]
const IDLE_ANIMS: Array[StringName] = [
	&"idle_tl", &"idle_tr", &"idle_br", &"idle_bl"
]

var _sprite: AnimatedSprite2D
var _current_anim: StringName = &""

func _ready() -> void:
	_sprite = get_parent().get_node_or_null("Sprite") as AnimatedSprite2D

func play_walk(direction: int) -> void:
	_play(WALK_ANIMS[direction % 4])

func play_idle(direction: int) -> void:
	_play(IDLE_ANIMS[direction % 4])

func play_named(anim: StringName) -> void:
	_play(anim)

func _play(anim: StringName) -> void:
	if _current_anim == anim or not _sprite:
		return
	if not _sprite.sprite_frames or not _sprite.sprite_frames.has_animation(anim):
		return
	_current_anim = anim
	_sprite.play(anim)

func stop() -> void:
	_current_anim = &""
	if _sprite:
		_sprite.stop()
