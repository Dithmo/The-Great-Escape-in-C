# All 16 items with their default world positions.
# Positions are in the original game's coordinate space (0–255).
# Room IDs match the original game's room enum.
# Source: Engine/Main.c  item_structs[] array.

extends Node

var items: Dictionary = {}

# Default item positions: item_type -> {room_id, u, v}
# These are the starting positions at game load.
const DEFAULT_POSITIONS: Dictionary = {
	ItemData.Type.WIRESNIPS:        {"room_id":  0, "u":  55, "v":  54},
	ItemData.Type.SHOVEL:           {"room_id":  0, "u":  24, "v":  52},
	ItemData.Type.LOCKPICK:         {"room_id": 10, "u":  52, "v":  36},
	ItemData.Type.PAPERS:           {"room_id": 11, "u":  26, "v":  32},
	ItemData.Type.TORCH:            {"room_id": 14, "u":  34, "v":  30},
	ItemData.Type.BRIBE:            {"room_id":  0, "u":  44, "v":  28},
	ItemData.Type.UNIFORM:          {"room_id": 15, "u":  30, "v":  30},
	ItemData.Type.FOOD:             {"room_id": 19, "u":  44, "v":  36},
	ItemData.Type.POISON:           {"room_id":  0, "u":  28, "v":  36},
	ItemData.Type.KEY_RED:          {"room_id": 22, "u":  40, "v":  28},
	ItemData.Type.KEY_YELLOW:       {"room_id":  0, "u":  24, "v":  44},
	ItemData.Type.KEY_GREEN:        {"room_id":  0, "u":  24, "v":  26},
	ItemData.Type.RED_CROSS_PARCEL: {"room_id":  0, "u":  28, "v":  24},
	ItemData.Type.RADIO:            {"room_id": 18, "u":  52, "v":  36},
	ItemData.Type.PURSE:            {"room_id":  0, "u":  20, "v":  36},
	ItemData.Type.COMPASS:          {"room_id":  0, "u":  20, "v":  28},
}

func _ready() -> void:
	_build()
	print("ItemRegistry ready — %d items" % items.size())

func get_item(type: ItemData.Type) -> ItemData:
	return items.get(type)

func get_all() -> Array:
	return items.values()

func _build() -> void:
	var defs: Array[Array] = [
		[ItemData.Type.WIRESNIPS,        "Wire Snips"],
		[ItemData.Type.SHOVEL,           "Shovel"],
		[ItemData.Type.LOCKPICK,         "Lockpick"],
		[ItemData.Type.PAPERS,           "Papers"],
		[ItemData.Type.TORCH,            "Torch"],
		[ItemData.Type.BRIBE,            "Bribe"],
		[ItemData.Type.UNIFORM,          "Uniform"],
		[ItemData.Type.FOOD,             "Food"],
		[ItemData.Type.POISON,           "Poison"],
		[ItemData.Type.KEY_RED,          "Red Key"],
		[ItemData.Type.KEY_YELLOW,       "Yellow Key"],
		[ItemData.Type.KEY_GREEN,        "Green Key"],
		[ItemData.Type.RED_CROSS_PARCEL, "Red Cross Parcel"],
		[ItemData.Type.RADIO,            "Radio"],
		[ItemData.Type.PURSE,            "Purse"],
		[ItemData.Type.COMPASS,          "Compass"],
	]
	for def: Array in defs:
		var d := ItemData.new()
		d.type = def[0]
		d.display_name = def[1]
		items[def[0]] = d
