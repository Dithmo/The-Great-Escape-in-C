extends Node

signal time_changed(new_time: int)
signal schedule_event_fired(event_name: String)
signal day_started
signal night_started

const TIME_MAX: int = 139
const NIGHT_START: int = 100
# Frames between each game time increment — lower = faster days
const TICKS_PER_TIME_UNIT: int = 128

const SCHEDULE: Array[Dictionary] = [
	{"time": 0,   "event": "wake_up"},
	{"time": 12,  "event": "parcel_arrives"},
	{"time": 16,  "event": "roll_call"},
	{"time": 21,  "event": "breakfast"},
	{"time": 36,  "event": "end_breakfast"},
	{"time": 46,  "event": "exercise_start"},
	{"time": 64,  "event": "exercise_end"},
	{"time": 79,  "event": "bedtime"},
	{"time": 100, "event": "night_starts"},
	{"time": 139, "event": "new_day"},
]

var game_time: int = 0
var is_night: bool = false
var _tick_counter: int = 0
var _paused: bool = false

func _ready() -> void:
	print("GameClock ready")

func _process(_delta: float) -> void:
	if _paused:
		return
	_tick_counter += 1
	if _tick_counter >= TICKS_PER_TIME_UNIT:
		_tick_counter = 0
		_advance_time()

func _advance_time() -> void:
	game_time = (game_time + 1) % (TIME_MAX + 1)
	time_changed.emit(game_time)

	var was_night := is_night
	is_night = game_time >= NIGHT_START
	if is_night != was_night:
		if is_night:
			night_started.emit()
		else:
			day_started.emit()

	for entry: Dictionary in SCHEDULE:
		if entry["time"] == game_time:
			schedule_event_fired.emit(entry["event"])

func pause() -> void:
	_paused = true

func resume() -> void:
	_paused = false

func get_time_fraction() -> float:
	return float(game_time) / float(TIME_MAX)

func get_display_time() -> String:
	var hour: int = 6 + int(game_time * 18 / TIME_MAX)
	return "%02d:00" % (hour % 24)

func get_next_event_name() -> String:
	for entry: Dictionary in SCHEDULE:
		if entry["time"] > game_time:
			return entry["event"]
	return SCHEDULE[0]["event"]

func reset() -> void:
	game_time = 0
	is_night = false
	_tick_counter = 0
	_paused = false
