# Implementation Plan: The Great Escape Remake

**Date:** 2026-06-07  
**Spec:** `docs/superpowers/specs/2026-06-07-great-escape-remake-design.md`  
**Engine:** Godot 4, GDScript  
**Project root:** `remake/`

Each task is ~2–5 minutes. TDD tasks follow RED → GREEN → REFACTOR.

---

## Phase 1 — Foundation

### Task 1.1 — Verify Godot project opens
- [ ] Open `remake/` in Godot 4.4+
- [ ] Confirm autoloads registered: GameManager, GameClock, MoraleManager, RoomManager
- [ ] Run project — expect black screen, no errors in Output
- Expected output: `"GameManager ready"`, `"GameClock ready"`, `"MoraleManager ready"`

### Task 1.2 — GameClock unit test
- [ ] Create `remake/tests/test_game_clock.gd` (GUT test)
- [ ] RED: assert `GameClock.game_time` starts at 0
- [ ] RED: assert schedule event "wake_up" fires when time reaches 0 after a reset
- [ ] GREEN: confirm `game_clock.gd` passes both assertions
- [ ] Commit: `test: GameClock time advance and schedule events`

### Task 1.3 — MoraleManager unit test
- [ ] Create `remake/tests/test_morale_manager.gd`
- [ ] RED: assert morale starts at 112
- [ ] RED: assert `adjust(-10)` gives 102
- [ ] RED: assert `adjust(-200)` clamps to 0, not negative
- [ ] RED: assert `morale_exhausted` signal emits at 0
- [ ] GREEN: all pass
- [ ] Commit: `test: MoraleManager drain and clamp`

### Task 1.4 — Data classes loadable
- [ ] Add GUT test that instantiates each Resource subclass
- [ ] `RouteData.new()`, `WaypointData.new()`, `ItemData.new()`, `RoomData.new()`, `CharacterData.new()`, `DoorData.new()`
- [ ] Assert no errors, assert exported fields have correct defaults
- [ ] Commit: `test: data resource classes instantiate cleanly`

---

## Phase 2 — Map & Camera

### Task 2.1 — Outdoor tilemap placeholder
- [ ] Open `scenes/world/outdoor_map.tscn` in Godot editor
- [ ] Add `TileMapLayer` node, set Layout to Isometric, tile size 64×32
- [ ] Create `TileSet` with one placeholder tile (solid colour)
- [ ] Paint a 54×34 region with placeholder tiles
- [ ] Run: should see isometric grid
- [ ] Commit: `feat: outdoor placeholder tilemap 54x34`

### Task 2.2 — Camera follows player placeholder
- [ ] Add `Camera2D` to main scene, set `enabled = true`
- [ ] Add placeholder `PlayerCharacter` node at map position (27, 17) (centre)
- [ ] Attach camera to player with `position_smoothing_enabled = true`
- [ ] Run: camera should be centred on player
- [ ] Commit: `feat: camera follow on player`

### Task 2.3 — Coordinate conversion test
- [ ] Test `MapManager.map_to_world(27, 17, 0)` returns expected pixel position
- [ ] Test `MapManager.world_to_map(world_pos)` round-trips to `(27, 17)`
- [ ] Commit: `test: map↔world coordinate round-trip`

---

## Phase 3 — Character Base + Player

### Task 3.1 — Character base scene
- [ ] Create `scenes/characters/character_base.tscn`
  - Root: `CharacterBody2D` with script `character.gd`
  - Children: `CollisionShape2D` (capsule), `AnimatedSprite2D`, `CharacterAnimator`, `RouteFollower`, `PursuitController`
- [ ] Verify scene opens without errors
- [ ] Commit: `feat: character base scene scaffold`

### Task 3.2 — Player movement test
- [ ] Create `scenes/characters/player_character.tscn` extending character_base
- [ ] Add `PlayerInput`, `Inventory`, `AutopilotController` nodes
- [ ] Run: WASD/arrow keys move the player in isometric directions
- [ ] Verify diagonal movement is correct isometric (not 45° screen-diagonal)
- [ ] Commit: `feat: player character isometric movement`

### Task 3.3 — Facing direction updates
- [ ] Move player right → `facing` = BOTTOM_RIGHT
- [ ] Move player left → `facing` = TOP_LEFT
- [ ] Move player up-right → `facing` = TOP_RIGHT
- [ ] Visual: sprite should face the correct direction (placeholder arrows fine)
- [ ] Commit: `feat: player facing direction from movement input`

### Task 3.4 — Autopilot activates after idle
- [ ] Unit test: `AutopilotController.is_active()` is false at frame 0
- [ ] Unit test: after 180 ticks with no input, `is_active()` is true
- [ ] Unit test: calling `reset()` sets `is_active()` back to false
- [ ] Commit: `test: autopilot idle counter and activation`

---

## Phase 4 — Route System + NPC

### Task 4.1 — RouteFollower walks a two-waypoint route
- [ ] Create a test route: waypoint at (20,20) then (25,25)
- [ ] Assign to an NPC, run: NPC should walk to (20,20) then continue to (25,25) and stop
- [ ] Verify `route_completed` signal fires at end
- [ ] Commit: `feat: RouteFollower two-waypoint walk`

### Task 4.2 — Looping route
- [ ] Create a 4-waypoint loop route (a square path)
- [ ] NPC should walk the square continuously
- [ ] Commit: `feat: RouteFollower looping route`

### Task 4.3 — Wander mode
- [ ] NPC with null route should idle-wander: pick random nearby point every 3s and walk to it
- [ ] Visually verify guard appears to mill around
- [ ] Commit: `feat: NPC wander mode when route is null`

### Task 4.4 — Seed all 45 routes as .tres files
- [ ] Create `resources/routes/` with one `.tres` per named route
- [ ] Source waypoint data from `Engine/Main.c` `routedata[]` array (see C source)
- [ ] Each route: correct waypoint sequence, loops flag, route_name
- [ ] Unit test: load each route file, assert waypoint count > 0
- [ ] Commit: `data: 45 named routes seeded from original`

### Task 4.5 — NPC spawns, follows route, despawns
- [ ] Place 3 NPC CharacterData resources at positions within viewport
- [ ] MapManager spawns them into scene tree as NPCCharacter nodes
- [ ] Move player far away: NPCs beyond 9 map units despawn, save position
- [ ] Move back: NPCs respawn at saved positions
- [ ] Commit: `feat: NPC spawn/despawn by viewport proximity`

---

## Phase 5 — Schedule System

### Task 5.1 — Schedule event fires at correct time
- [ ] Unit test: advance GameClock to time 16, assert "roll_call" event fired
- [ ] Unit test: advance to 21, assert "breakfast" fired
- [ ] Unit test: cycle past 139 to 0, assert "new_day" then "wake_up" fired
- [ ] Commit: `test: schedule events fire at correct times`

### Task 5.2 — NPCs receive new routes on schedule events
- [ ] On "roll_call" event: all guards and prisoners switch to roll_call route
- [ ] Visually verify: characters all start moving toward the yard
- [ ] Commit: `feat: schedule events assign NPC routes`

### Task 5.3 — Gates lock/unlock on schedule
- [ ] Exercise gates (door IDs 0–3): `is_locked = false` on "exercise_start"
- [ ] Same gates: `is_locked = true` on "exercise_end"
- [ ] Player can pass through at exercise time, blocked otherwise
- [ ] Commit: `feat: exercise gates lock/unlock with schedule`

### Task 5.4 — Morale adjusts on schedule attendance
- [ ] Player at roll call position when event fires → morale +8
- [ ] Player absent → no gain (drain continues)
- [ ] Commit: `feat: morale reward for attending schedule events`

---

## Phase 6 — Item System

### Task 6.1 — All 16 ItemData resources
- [ ] Create `resources/items/item_wiresnips.tres` through `item_compass.tres`
- [ ] Each has correct type enum, display_name
- [ ] Unit test: load all 16, assert type and name match expected
- [ ] Commit: `data: 16 item data resources`

### Task 6.2 — Item node spawns in world
- [ ] Place `item.tscn` instance in outdoor_map scene at a map position
- [ ] Run: item appears at correct isometric position
- [ ] Commit: `feat: item node placed in world`

### Task 6.3 — Player picks up nearby item
- [ ] Player walks near item → item highlights (visual feedback)
- [ ] Press action button → item removed from scene, appears in inventory slot
- [ ] HUD inventory updates
- [ ] Commit: `feat: item pickup into inventory`

### Task 6.4 — Player drops item
- [ ] With item in slot, press drop → item spawns at player's feet
- [ ] Slot becomes empty
- [ ] Commit: `feat: item drop from inventory`

### Task 6.5 — Poison chain
- [ ] Have POISON and FOOD in inventory
- [ ] Use POISON → FOOD becomes poisoned (visual indicator on slot)
- [ ] Drop poisoned FOOD → nearby dog enters DOG_FOOD pursuit mode, walks to food, despawns it
- [ ] Commit: `feat: poison+food+dog interaction chain`

### Task 6.6 — Bribe guard
- [ ] Have BRIBE in inventory, guard nearby in HASSLE mode
- [ ] Use BRIBE → guard's pursuit mode clears, guard ignores player
- [ ] Commit: `feat: bribe clears guard pursuit`

### Task 6.7 — Red Cross Parcel
- [ ] On "parcel_arrives" event: spawn parcel item in player's hut
- [ ] Player picks up parcel → replaced by a random item from weighted table
- [ ] Commit: `feat: red cross parcel random content`

---

## Phase 7 — Room Transitions

### Task 7.1 — Outdoor→indoor door transition
- [ ] Create one interior room scene (hut_1.tscn) with a door back out
- [ ] Player walks to door Area2D → fade to black → load hut_1 → fade in
- [ ] Player appears at correct exit position
- [ ] Commit: `feat: outdoor to indoor room transition`

### Task 7.2 — Indoor→outdoor transition
- [ ] From inside hut_1, player walks to exit door → returns outdoors at correct map position
- [ ] Commit: `feat: indoor to outdoor transition`

### Task 7.3 — Locked door blocked
- [ ] Door with `is_locked = true` and `required_key = KEY_RED`
- [ ] Player without key → can't pass, message "Locked"
- [ ] Player with RED key → passes through
- [ ] Commit: `feat: locked door key check`

### Task 7.4 — Lock-picking
- [ ] Player with LOCKPICK at locked door → enters PICKING_LOCK state
- [ ] 3-second timer → door unlocks → transition happens
- [ ] Getting hit or moving cancels lock-pick
- [ ] Commit: `feat: lockpick timed door unlock`

### Task 7.5 — Tunnel rooms
- [ ] Rooms 29–52 are tunnel sections. Create one as a proof-of-concept
- [ ] Entering with a SHOVEL in inventory: player can dig (advance to next tunnel room)
- [ ] Without shovel: blocked
- [ ] Commit: `feat: tunnel room shovel requirement`

---

## Phase 8 — Pursuit System

### Task 8.1 — HASSLE mode: guard follows player-controlled character
- [ ] Guard near player: enter HASSLE mode
- [ ] Player moving manually → guard follows
- [ ] Player stops for 3s (autopilot activates) → guard stops following
- [ ] Commit: `feat: HASSLE mode follows player not autopilot`

### Task 8.2 — PURSUE mode: guard chases on red_flag
- [ ] Trigger `GameManager.raise_red_flag()`
- [ ] All guards switch to PURSUE
- [ ] Guard catches player → `send_to_solitary()` called
- [ ] Commit: `feat: PURSUE mode red flag chase and catch`

### Task 8.3 — Solitary confinement
- [ ] On catch: player auto-walks to solitary room
- [ ] Morale -15
- [ ] After N time units: player released to main area
- [ ] `red_flag` cleared on release
- [ ] Commit: `feat: solitary send + release cycle`

### Task 8.4 — HASSLE vs PURSUE: autopilot safety
- [ ] Integration test: player on autopilot, guard in HASSLE → guard should NOT follow
- [ ] Same player, guard in PURSUE → guard DOES follow regardless
- [ ] Commit: `test: autopilot blocks HASSLE but not PURSUE`

---

## Phase 9 — Night / Searchlight

### Task 9.1 — Day/night cycle visual
- [ ] At time 100: scene modulate darkens (tween to dark blue tint)
- [ ] At time 0: scene returns to normal
- [ ] Commit: `feat: day/night visual transition`

### Task 9.2 — Searchlight sweeps
- [ ] Add `SearchlightNode` to outdoor scene: `Light2D` with narrow cone, `Area2D` overlap detector
- [ ] Animated sweep pattern covers yard
- [ ] Commit: `feat: searchlight sweep animation`

### Task 9.3 — Searchlight catches player
- [ ] Player in searchlight beam → `red_flag_raised`
- [ ] Player exits beam and stays hidden for 5s → `red_flag_cleared`
- [ ] Commit: `feat: searchlight detect and lose player`

---

## Phase 10 — Win / Lose Conditions

### Task 10.1 — Game over on morale zero
- [ ] MoraleManager reaches 0 → show game over screen
- [ ] "Try again" reloads scene, resets all state
- [ ] Commit: `feat: game over on morale exhaustion`

### Task 10.2 — Escape condition check
- [ ] Player holding PAPERS + COMPASS + PURSE + UNIFORM
- [ ] Player reaches escape exit tile
- [ ] Win screen with escape message
- [ ] Commit: `feat: escape win condition`

### Task 10.3 — New day penalty
- [ ] Each "new_day" event: morale -10
- [ ] If player hasn't escaped after 3 days: morale pressure becomes severe
- [ ] Commit: `feat: new day morale penalty`

---

## Phase 11 — All 53 Rooms

### Task 11.1 — Room data resources (53 .tres files)
- [ ] One `RoomData` resource per room, seeded from C source `rooms[]` data
- [ ] Each has: room_id, room_name, scene_path, door connections with correct destination room + exit positions
- [ ] Unit test: load all 53, assert door connections are valid (destination room exists)
- [ ] Commit: `data: 53 room data resources with door connections`

### Task 11.2 — One representative room per type
- [ ] Hut with beds (hut_1.tscn)
- [ ] Corridor (corridor_1.tscn)
- [ ] Yard (yard.tscn — outdoors, open air)
- [ ] Solitary cell (solitary.tscn)
- [ ] Tunnel section (tunnel_1.tscn)
- [ ] Each: correct dimensions, working doors, walkable floor
- [ ] Commit: `feat: representative room scenes for each room type`

### Task 11.3 — Complete all rooms
- [ ] Build remaining 48 room scenes from the room data
- [ ] Commit: `feat: all 53 rooms complete`

---

## Phase 12 — Art + Polish

### Task 12.1 — Character sprite sheets
- [ ] 8 animations × 4+ frames each for: Hero, Guard, Dog, Prisoner
- [ ] Import into Godot, configure AnimatedSprite2D
- [ ] Verify all walk and idle animations look correct in all 4 directions
- [ ] Commit: `art: character sprite sheets and animations`

### Task 12.2 — Tile art
- [ ] Outdoor tile set: grass, paths, fence, buildings, watchtowers
- [ ] Indoor tiles: floor types, walls, furniture
- [ ] Replace placeholder tiles in all scenes
- [ ] Commit: `art: tile sets for outdoor and indoor`

### Task 12.3 — Item icons and world sprites
- [ ] All 16 item icons for HUD slots
- [ ] World item sprites (small props)
- [ ] Commit: `art: item icons and world sprites`

### Task 12.4 — Audio
- [ ] Ambient: daytime camp, nighttime crickets
- [ ] Events: bell ring, door unlock, item pickup, caught sound, escape fanfare
- [ ] Commit: `feat: audio events and ambient`

### Task 12.5 — UI polish
- [ ] HUD styled to match game aesthetic
- [ ] Message display transitions
- [ ] Schedule indicator showing next event
- [ ] Commit: `feat: UI polish and schedule indicator`

### Task 12.6 — Game feel tuning
- [ ] Adjust MOVE_SPEED so traversal feels good
- [ ] Tune morale drain rate vs schedule reward balance
- [ ] Tune autopilot idle timeout (default 180 frames)
- [ ] Tune guard pursuit speed multiplier
- [ ] Playtest full escape to verify it's achievable in a reasonable session
- [ ] Commit: `tune: movement speed, morale balance, pursuit speed`

---

## Execution Order

Phases 1–4 are the absolute foundation. Don't start Phase 5 until Phase 4's NPC route following is solid — the entire game AI depends on it.

Phases 5–8 can partially overlap once Phase 4 is done.

Phase 11 (all rooms) is the most tedious but least technically risky. Can be done last.

Phase 12 is parallelisable with Phase 11 once core systems are verified.

---

## Source Reference

All route waypoints, room dimensions, door connections, item positions, and schedule times can be cross-referenced from:
- `Engine/Main.c` — `routedata[]`, `door_t doors[]`, character behaviour
- `Engine/Events.c` — schedule event handlers
- `include/TheGreatEscape/Items.h` — item enum and attributes  
- `include/TheGreatEscape/Rooms.h` — room definitions
- `include/TheGreatEscape/Routes.h` — route index enum
