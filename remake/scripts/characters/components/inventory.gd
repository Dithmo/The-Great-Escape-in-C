class_name Inventory
extends Node

signal item_picked_up(item_data: ItemData)
signal item_dropped(item_data: ItemData)
signal inventory_changed

const MAX_SLOTS: int = 2

var slots: Array = [null, null]  # Array[ItemData | null]
var _nearby_items: Array[Node] = []

func get_nearby_item() -> Node:
	return _nearby_items.front() if not _nearby_items.is_empty() else null

func pick_up(item_node: Node) -> bool:
	var slot := _find_empty_slot()
	if slot == -1:
		return false
	var data: ItemData = item_node.item_data
	slots[slot] = data
	item_node.queue_free()
	item_picked_up.emit(data)
	inventory_changed.emit()
	return true

func drop(slot_index: int) -> void:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return
	if slots[slot_index] == null:
		return
	var data: ItemData = slots[slot_index]
	slots[slot_index] = null
	_spawn_item_at_feet(data)
	item_dropped.emit(data)
	inventory_changed.emit()

func use_item(slot_index: int) -> void:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return
	if slots[slot_index] == null:
		return
	_apply_item(slots[slot_index], slot_index)

func has_item(item_type: ItemData.Type) -> bool:
	for slot in slots:
		if slot != null and slot.type == item_type:
			return true
	return false

func get_all_held() -> Array:
	return slots.filter(func(s): return s != null)

func register_nearby(item: Node) -> void:
	if not _nearby_items.has(item):
		_nearby_items.append(item)

func unregister_nearby(item: Node) -> void:
	_nearby_items.erase(item)

func _find_empty_slot() -> int:
	for i in MAX_SLOTS:
		if slots[i] == null:
			return i
	return -1

func _spawn_item_at_feet(data: ItemData) -> void:
	# Use load() not preload() — item.tscn may not exist at parse time
	var item_scene: PackedScene = load("res://scenes/items/item.tscn")
	if not item_scene:
		push_warning("Inventory: item.tscn not found, cannot spawn dropped item")
		return
	var new_item: Node2D = item_scene.instantiate()
	new_item.item_data = data
	var parent: Node2D = get_parent() as Node2D
	new_item.global_position = parent.global_position if parent else Vector2.ZERO
	get_tree().current_scene.add_child(new_item)

func _apply_item(data: ItemData, slot_index: int) -> void:
	match data.type:
		ItemData.Type.BRIBE:
			_try_bribe(slot_index)
		ItemData.Type.POISON:
			_try_poison_food(slot_index)

func _try_bribe(slot_index: int) -> void:
	var player: Node2D = get_parent() as Node2D
	for guard: Node in get_tree().get_nodes_in_group("npcs"):
		var npc := guard as NPCCharacter
		if npc and player and npc.global_position.distance_to(player.global_position) < 48.0:
			GameManager.bribed_character_id = npc.character_id
			npc.pursuit_ctrl.clear()
			slots[slot_index] = null
			inventory_changed.emit()
			return

func _try_poison_food(slot_index: int) -> void:
	for i in MAX_SLOTS:
		if slots[i] != null and slots[i].type == ItemData.Type.FOOD:
			slots[i].poisoned = true
			slots[slot_index] = null
			inventory_changed.emit()
			return
