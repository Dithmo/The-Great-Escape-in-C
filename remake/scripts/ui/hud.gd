class_name HUD
extends CanvasLayer

@onready var morale_bar: ProgressBar = $MoraleBar
@onready var slot_0: TextureRect = $InventoryPanel/Slot0
@onready var slot_1: TextureRect = $InventoryPanel/Slot1
@onready var time_label: Label = $TimeLabel
@onready var schedule_label: Label = $ScheduleLabel
@onready var message_display: MessageDisplay = $MessageDisplay

func _ready() -> void:
	MoraleManager.morale_changed.connect(_on_morale_changed)
	GameClock.time_changed.connect(_on_time_changed)
	_on_morale_changed(MoraleManager.morale)

func _on_morale_changed(value: int) -> void:
	morale_bar.max_value = MoraleManager.MORALE_MAX
	morale_bar.value = value

func _on_time_changed(_time: int) -> void:
	time_label.text = GameClock.get_display_time()
	schedule_label.text = GameClock.get_next_event_name().replace("_", " ").capitalize()

func update_inventory(slots: Array) -> void:
	slot_0.texture = slots[0].icon if slots[0] != null else null
	slot_1.texture = slots[1].icon if slots[1] != null else null

func show_message(text: String) -> void:
	message_display.show_message(text)
