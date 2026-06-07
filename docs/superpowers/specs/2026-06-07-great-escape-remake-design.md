# Design Spec: The Great Escape — Godot 4 Remake

**Date:** 2026-06-07  
**Stack:** Godot 4, GDScript  
**Style:** Full modernisation (new art, smoother gameplay)  
**Source reference:** `/` — original ZX Spectrum reverse-engineered C code

---

## What We're Building

A modern remake of the 1986 ZX Spectrum game. Same game design: isometric POW camp, daily schedule, route-following NPCs, 16 items, escape by collecting 4 specific items. Fully re-authored art, smoother movement, 1280×720 native resolution.

**Not changing:** The core design — the schedule-driven world, the route AI, the morale pressure, the 2-item inventory, the pursuit modes. These are what make the game.

---

## Coordinate System

The original uses three nested coordinate systems. We keep the same conceptual model:

**Map Space (U, V, W)**  
The authoritative world. U and V are the two isometric axes. W is elevation.  
All gameplay logic (routes, collision, proximity, spawning) works in this space.  
Outdoors: U 0–54, V 0–34. Indoors: per-room local space.

**Isometric Projection**  
Derived at render time:
```
world_x = (U - V) * TILE_W
world_y = (U + V) * (TILE_H / 2) - W * STEP_H
```
Godot's `TileMapLayer` with isometric mode handles this. We work in map coordinates everywhere and let Godot do the projection.

**Screen Space**  
Handled entirely by Godot — `Camera2D` follows the player.

---

## Project Structure

```
remake/
├── project.godot
├── scripts/
│   ├── autoloads/          # Singletons: GameManager, GameClock, MoraleManager
│   ├── characters/         # Character base + Player + NPC
│   │   └── components/     # RouteFollower, PursuitController, Inventory, etc.
│   ├── world/              # RoomManager, MapManager
│   ├── items/              # Item node logic
│   └── ui/                 # HUD, MessageDisplay
├── resources/
│   ├── data_classes/       # Resource subclasses (RouteData, ItemData, etc.)
│   ├── routes/             # .tres files — one per named route
│   ├── items/              # .tres files — one per item type
│   └── rooms/              # .tres files — one per room
├── scenes/
│   ├── world/
│   │   ├── outdoor_map.tscn
│   │   └── rooms/          # One .tscn per interior room
│   ├── characters/
│   ├── items/
│   └── ui/
├── assets/
│   ├── sprites/
│   ├── tiles/
│   ├── audio/
│   └── fonts/
└── shaders/
```

---

## Autoload Singletons

Three global singletons registered in project.godot:

### GameManager
Central game state. Owns: current room ID, red_flag, in_solitary, bribed_character_id, day_number, game state enum (PLAYING / CAUGHT / ESCAPED / GAME_OVER).

Signals: `red_flag_raised`, `red_flag_cleared`, `player_caught`, `player_escaped`.

Key methods: `raise_red_flag()`, `send_to_solitary()`, `check_escape_condition(inventory)`.

### GameClock
Drives game time 0–139 (one full day cycle). Advances one tick every N frames (tunable). Fires named schedule events at fixed times. Emits `night_started` / `day_started` at time 100/0.

Schedule (time → event name):
| Time | Event |
|------|-------|
| 0 | wake_up |
| 12 | parcel_arrives |
| 16 | roll_call |
| 21 | breakfast |
| 36 | end_breakfast |
| 46 | exercise_start |
| 64 | exercise_end |
| 79 | bedtime |
| 100 | night_starts |
| 139 | new_day |

### MoraleManager
Morale 0–112. Drains slowly on a timer. Schedule events add or subtract. Zero = game_over signal.

---

## Character System

### Architecture

All characters — hero and all 26 NPCs — use the same base `Character` class (extends `CharacterBody2D`). The only difference: `PlayerCharacter` reads from `PlayerInput`; `NPCCharacter` reads from `RouteFollower` + `PursuitController`.

This matches the original: the hero *is* just another character.

```
Character (CharacterBody2D)
├── CharacterAnimator   — 8-directional AnimatedSprite2D wrapper
├── RouteFollower       — steps through RouteData waypoints
└── PursuitController   — holds current PursuitMode enum

PlayerCharacter extends Character
├── PlayerInput         — keyboard/gamepad axis reading
├── Inventory           — 2-slot item holding
└── AutopilotController — activates RouteFollower after idle timeout

NPCCharacter extends Character
```

### Movement

Movement is smooth sub-tile in world-pixel space (not tile-snapping like the original). Speed constant `MOVE_SPEED = 80.0` pixels/sec base, guards move 20% faster when pursuing.

Input → isometric direction vector → `move_and_slide()`. Route following uses the same velocity/move_and_slide path.

### Facing + Animation

Four cardinal directions mapped to isometric: TL, TR, BR, BL. Internally 0–3.  
Eight animations per character: `walk_tl`, `walk_tr`, `walk_br`, `walk_bl`, `idle_tl`, `idle_tr`, `idle_br`, `idle_bl`.  
`CharacterAnimator` wraps `AnimatedSprite2D` and deduplicates play calls.

### Spawning

Characters off-screen live as lightweight `CharacterData` resources. They're instantiated into the scene tree when within spawn distance (~8 map units) of the viewport. Despawned when >9 units outside it. Max 8 visible at once (matching original).

---

## Route / AI System

### RouteData Resource
```
RouteData:
  route_name: String
  waypoints: Array[WaypointData]
  loops: bool
  can_reverse: bool
```

### WaypointData Resource
```
WaypointData:
  type: MAP_POSITION | DOOR
  map_pos: Vector2i    (if MAP_POSITION)
  door_id: int         (if DOOR)
```

### RouteFollower Component
Each frame: compare character world position to current waypoint's world position. If within 4px → advance to next waypoint. If waypoint is a DOOR → call `RoomManager.request_transition()`. If route ends and `loops = true` → reset to step 0.

### Wander Mode
Route index 255 in the original. Implemented as: when `RouteData` is null, pick a random nearby map position every 2–4 seconds and walk to it. Gives guards/prisoners the "milling around" appearance.

### 45 Named Routes
Stored as `.tres` files in `resources/routes/`. Named after their function:
- `route_halt.tres` — stand still
- `route_go_to_roll_call.tres`
- `route_go_to_breakfast.tres`
- `route_go_to_bed_[hut_n].tres`
- `route_exercise.tres`
- `route_patrol_[n].tres` (4 guard patrol routes)
- `route_to_solitary.tres`
- etc.

All route data is seeded from the C source's `routedata[]` array.

### Schedule → Route Assignment

When `GameClock` fires a schedule event, `GameManager` broadcasts the new route assignments. Each `NPCCharacter` listens and updates its `RouteFollower`. Player's `AutopilotController` does the same.

---

## Pursuit System

`PursuitController` component holds a `PursuitMode` enum:

```
enum PursuitMode { NONE, PURSUE, HASSLE, DOG_FOOD, SAW_BRIBE }
```

**PURSUE** — guard actively chases player to send to solitary. Triggered when `red_flag` is raised. Overrides route.

**HASSLE** — guard follows player only if player is under manual control. Ignored if autopilot is active. This makes autopilot genuinely safer — the original design intent.

**DOG_FOOD** — dog chases a poisoned food item node. `target_node` points to it.

**SAW_BRIBE** — guard chases the character who just received a bribe.

**Catching** — if guard gets within 12px of player: `GameManager.send_to_solitary()` → player gets a forced solitary route → morale penalty → release after N time units.

---

## Item System

### 16 Items

```gdscript
enum Type {
    WIRESNIPS, SHOVEL, LOCKPICK, PAPERS, TORCH, BRIBE,
    UNIFORM, FOOD, POISON, KEY_RED, KEY_YELLOW, KEY_GREEN,
    RED_CROSS_PARCEL, RADIO, PURSE, COMPASS
}
```

Escape requires: PAPERS + COMPASS + PURSE + UNIFORM.

### ItemData Resource
```
ItemData:
  type: Type
  display_name: String
  icon: Texture2D
  poisoned: bool
```

One `.tres` file per item in `resources/items/`.

### Item Node (Area2D)
Items live in the world as `Area2D` nodes with `CollisionShape2D` and `AnimatedSprite2D`. When the player enters the overlap area, the item registers itself with the player's `Inventory` component as "nearby". Action button picks it up (removes from scene, adds to slot).

Dropping spawns a new `Item` node at the character's position.

### Inventory (PlayerCharacter component)
Two slots: `Array[ItemData]` of size 2. Methods: `pick_up(item)`, `drop(slot_index)`, `has_item(type)`, `use_held_item()`.

**Multi-step item chains:**
- Poison + Food → `poisoned = true` on the food ItemData
- Poisoned food dropped → dogs enter `DOG_FOOD` pursuit mode targeting that Item node
- Bribe used near guard → clears that guard's pursuit mode, sets `GameManager.bribed_character_id`

### Red Cross Parcel
Arrives at `parcel_arrives` schedule event. Contains a random item from a weighted table. Placed in the player's hut room.

---

## Room System

### 53 Rooms

Room 0 = outdoors. Rooms 1–52 = interiors. Each room is a `.tscn` scene containing:
- `TileMapLayer` (isometric, for floor tiles)
- Wall/furniture `StaticBody2D` nodes
- `Door` nodes (Area2D + DoorData resource)
- Item spawn points
- Mask nodes (foreground walls that draw on top of characters)

### RoomManager (Autoload)
Handles scene loading. On door entry:
1. Fade to black (0.3s tween)
2. Change `current_room_id`
3. Instantiate new room scene, place player at exit position
4. Fade in

Door transitions for NPCs are teleport-only (no visual transition).

### DoorData Resource
```
DoorData:
  door_id: int
  is_locked: bool
  required_key: ItemData.Type
  connects_to_room: int
  exit_position: Vector2i
```

Locked doors: 11 total can be locked. The 4 exercise gates unlock on `exercise_start`, re-lock on `exercise_end`. Other doors need matching key or lockpick.

**Lock-picking:** action near locked door with lockpick in inventory → timer (~3 seconds) → door unlocks. Entering PICKING_LOCK state blocks other actions.

---

## Morale System

Morale 0–112. Displayed as a bar in the HUD.

Drain: -1 every 8 real seconds (tunable).  
Gains: attending roll call (+8), attending breakfast (+5).  
Penalty: missing roll call or breakfast (drained faster for that period), new_day event (-10), sent to solitary (-15).

Zero morale → `MoraleManager.morale_exhausted` signal → game over screen.

---

## Night / Searchlight

`GameClock` emits `night_started` at time 100. This activates the `SearchlightNode` in the outdoor scene.

The searchlight is a `Light2D` node with a narrow cone. It sweeps in a pattern (pre-authored animation track) across the yard. A separate `Area2D` on the light detects the player.

If player is in the searchlight beam: `GameManager.raise_red_flag()` → all guards enter PURSUE.

The searchlight has a "giving up" state — if the player gets out of the beam and guards don't catch them within N seconds, `red_flag` is cleared.

---

## Autopilot

`AutopilotController` component on `PlayerCharacter`. Counts idle frames (no input). After 180 frames (3s at 60fps), activates. While active, `RouteFollower` drives the character exactly like an NPC.

Any input press resets the counter and deactivates autopilot immediately.

**Key design point:** HASSLE-mode guards ignore autopilot-controlled characters. So when the player lets go of the controls, the guards stop following. This means autopilot is a genuine mechanic, not just a cosmetic feature.

Forced autopilot via `AutopilotController.force_route()`: used when player is caught (walks to solitary cell).

---

## Escape Condition

`GameManager.check_escape_condition(inventory)` checks:
1. Player has PAPERS, COMPASS, PURSE, UNIFORM
2. Player is at the escape exit point (specific map coordinates)

On success: `player_escaped` signal → cutscene / win screen.

---

## HUD

- Morale bar (top-left)
- Two inventory slots with item icons (bottom)
- Time of day indicator (game_time mapped to a 24h clock starting at 06:00)
- Schedule indicator (next event name + countdown)
- Message queue (bottom-center, 2-second display per message)

---

## Modernisation Choices

| Original | Remake |
|----------|--------|
| 4-direction movement | Smooth 8-directional |
| Tile-snapped position | Sub-pixel smooth |
| 256×192 pixels | 1280×720 native |
| 4-colour ZX Spectrum palette | Full colour, artist's choice |
| Z80 sprite flicker | Stable depth-sorted sprites |
| Bell sound only | Full ambient + event audio |
| No camera — map scrolls | Smooth camera follow |
| Text-only messages | Stylised text with icons |

---

## What We're NOT Changing

- The daily schedule times and events
- The 45 route system for NPCs
- The 2-item inventory limit
- The morale pressure mechanic
- The 4 required escape items
- The pursuit mode system (especially HASSLE vs PURSUE distinction)
- The autopilot mechanic and its interaction with HASSLE mode
- The door locking system (exercise gates, key types, lockpicks)
- The 16-item set and their interactions (poison chain, bribe, parcel)
- The 53-room structure and outdoor/indoor split
