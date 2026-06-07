class_name MessageDisplay
extends Control

const DISPLAY_SECONDS: float = 2.5

@onready var label: Label = $Label

var _queue: Array[String] = []
var _displaying: bool = false

func show_message(text: String) -> void:
	_queue.append(text)
	if not _displaying:
		_show_next()

func _show_next() -> void:
	if _queue.is_empty():
		_displaying = false
		hide()
		return
	_displaying = true
	show()
	label.text = _queue.pop_front()
	await get_tree().create_timer(DISPLAY_SECONDS).timeout
	_show_next()
