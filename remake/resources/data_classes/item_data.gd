class_name ItemData
extends Resource

enum Type {
	WIRESNIPS        = 0,
	SHOVEL           = 1,
	LOCKPICK         = 2,
	PAPERS           = 3,
	TORCH            = 4,
	BRIBE            = 5,
	UNIFORM          = 6,
	FOOD             = 7,
	POISON           = 8,
	KEY_RED          = 9,
	KEY_YELLOW       = 10,
	KEY_GREEN        = 11,
	RED_CROSS_PARCEL = 12,
	RADIO            = 13,
	PURSE            = 14,
	COMPASS          = 15,
	NONE             = 255,
}

# The four items required to escape
const ESCAPE_ITEMS: Array = [
	Type.PAPERS,
	Type.COMPASS,
	Type.PURSE,
	Type.UNIFORM,
]

@export var type: Type = Type.NONE
@export var display_name: String = ""
@export var icon: Texture2D
@export var poisoned: bool = false

func is_escape_item() -> bool:
	return type in ESCAPE_ITEMS
