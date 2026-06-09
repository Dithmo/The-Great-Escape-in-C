extends Node

signal morale_changed(value: int)
signal morale_exhausted

const MORALE_MAX: int = 112
const MORALE_MIN: int = 0
const DRAIN_INTERVAL_SECONDS: float = 8.0

var morale: int = MORALE_MAX
var _drain_timer: float = 0.0
var _drain_paused: bool = false

func _ready() -> void:
	print("MoraleManager ready")
	GameClock.schedule_event_fired.connect(_on_schedule_event)

func _process(delta: float) -> void:
	if _drain_paused or GameManager.state != GameManager.GameState.PLAYING:
		return
	_drain_timer += delta
	if _drain_timer >= DRAIN_INTERVAL_SECONDS:
		_drain_timer = 0.0
		adjust(-1)

func adjust(amount: int) -> void:
	var prev := morale
	morale = clampi(morale + amount, MORALE_MIN, MORALE_MAX)
	if morale != prev:
		morale_changed.emit(morale)
	if morale <= MORALE_MIN:
		morale_exhausted.emit()
		GameManager.trigger_game_over()

func award_attendance(amount: int) -> void:
	adjust(amount)

func get_fraction() -> float:
	return float(morale) / float(MORALE_MAX)

func pause_drain() -> void:
	_drain_paused = true

func resume_drain() -> void:
	_drain_paused = false

func reset() -> void:
	morale = MORALE_MAX
	_drain_timer = 0.0
	_drain_paused = false

func _on_schedule_event(event_name: String) -> void:
	match event_name:
		"new_day":
			adjust(-10)
