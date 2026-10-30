# The Great Escape HD (single-file HTML remake)

`dist/TheGreatEscapeHD.html` is a self-contained web app: open it in any modern
browser (double-click works, no server needed). It recreates the 1986 ZX
Spectrum game exactly, with new HD graphics and some quality-of-life features.

## How exact is it?

The game logic is a line-by-line JavaScript port of the C engine in this
repository (`web/engine1.js` .. `engine4.js`), keeping every 8/16-bit wrap,
every table and every original quirk. It is checked against the C build with
two harnesses that feed identical scripted joystick input and compare a CRC of
the full Spectrum screen plus key state on every frame:

```sh
gcc -O2 -DNDEBUG -w -I include -I libraries/TheGreatEscape/include -I libraries/ZXSpectrum/include \
    libraries/TheGreatEscape/Data/*.c libraries/TheGreatEscape/Engine/*.c libraries/ZXSpectrum/*.c \
    tools/harness.c -o harness
./harness 40000 7 1 > c.txt
node tools/harness.js 40000 7 1 > js.txt
diff c.txt js.txt      # no output = identical
```

160,000 frames over four seeds (covering room changes, solitary, meals, roll
calls, day and night) are byte-identical. The "Classic Spectrum view" option in
the pause menu shows the engine's real Spectrum screen next to the HD view.

## Graphics

All game data (tiles, supertiles, map, sprites, masks, rooms, objects, font,
music) is extracted from the C sources by `tools/dumpdata.c` and packed by
`tools/gendata.js` into `web/data.js`. The engine still draws the original
1-bit Spectrum frame (visible with the "Classic Spectrum view" option); the HD
view is a separate renderer fed by the engine's state.

The default "hand-drawn art" mode uses new artwork authored for this remake:

* `web/art_chars.js`: the hero, guards and the commandant are built from
  hand-pixelled parts (heads, caps, bodies, a four-frame leg cycle) drawn at
  twice the Spectrum resolution, with crawling frames, dogs, the stove and the
  crate; frame numbers and footprints follow the engine's sprite table so
  positions and occlusion stay exact.
* `web/art_items.js`: the 16 items as new icons.
* `web/art_tiles.js`: hand-drawn material textures (grass, gravel, planks,
  corrugated roof, brick, floorboards, tunnel earth) laid under the camp's
  tile structure, with bevelled relief lines and grass tufts.
* `web/art_objects.js`: room fittings (beds, tables, chairs, wardrobes,
  drawers, cupboards, benches, windows, door frames, stove pipe, shelves,
  sink, desk, noticeboard, key rack) drawn with a small isometric pixel
  toolkit and placed where the room definitions put them.

The exterior map structure itself (hut, building, fence and tower layout)
necessarily follows the original tile data, so the camp is a re-skin of the
original geometry rather than a redrawn map. Turning "Hand-drawn art" off in
the pause menu shows the earlier look: the original pixels classified by
material, coloured, textured and smoothed 4x.

## Quality of life (none change the simulation)

* Smooth 60 fps motion: positions and scrolling are interpolated between the
  original 9.5 Hz engine ticks (can be turned off).
* Dedicated keys for pick up / drop / use (`E`, `Q`, `Z`, `X`) in addition to
  the original fire + direction combinations; WASD; remappable keys; gamepad;
  touch controls on phones.
* Three save-state slots (F5 / F9 quick save and load) stored in the browser.
* Pause menu (Esc / P), speed 0.5x to 2x, optional minimap (M), scanlines,
  classic Spectrum view (C), day/time clock, message line in HD, control hints.
* Title music and sound effects synthesised from the game's own note tables.

## Development

```sh
gcc -w -I. -Iinclude -Ilibraries/TheGreatEscape/include tools/dumpdata.c -o dumpdata && ./dumpdata > gamedata.json
node tools/gendata.js gamedata.json > web/data.js
node tools/build.js web/index.html dist/TheGreatEscapeHD.html
```

`web/index.html` loads the scripts separately for development; `tools/build.js`
inlines them into the single distributable file.
