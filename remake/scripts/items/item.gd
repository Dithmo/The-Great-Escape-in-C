class_name Item
extends Area2D

@export var item_data: ItemData

@onready var sprite: AnimatedSprite2D = $Sprite
@onready var label: Label = $Label

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	add_to_group("items")
	_update_visuals()

func _update_visuals() -> void:
	if not item_data or not label:
		return
	label.text = item_data.display_name
	if item_data.poisoned and sprite:
		sprite.modulate = Color(0.3, 1.0, 0.3)  # green tint for poisoned food

func _on_body_entered(body: Node2D) -> void:
	if not (body is PlayerCharacter):
		return
	var player := body as PlayerCharacter
	var inv: Inventory = player.get_node_or_null("Inventory")
	if inv:
		inv.register_nearby(self)

	# Dogs react to poisoned food
	if item_data and item_data.poisoned:
		_alert_dogs()

func _on_body_exited(body: Node2D) -> void:
	if not (body is PlayerCharacter):
		return
	var player := body as PlayerCharacter
	var inv: Inventory = player.get_node_or_null("Inventory")
	if inv:
		inv.unregister_nearby(self)

func _alert_dogs() -> void:
	var dogs := get_tree().get_nodes_in_group("npcs")
	for npc: Node in dogs:
		var npc_char := npc as NPCCharacter
		if npc_char and npc_char.character_data and \
		   npc_char.character_data.character_type == CharacterData.Type.DOG:
			npc_char.pursuit_ctrl.set_mode(PursuitController.PursuitMode.DOG_FOOD, self)
