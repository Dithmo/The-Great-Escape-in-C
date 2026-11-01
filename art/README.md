# Painted backgrounds: how to generate them with your own Nano Banana / Flow account

The game can draw AI-painted backgrounds instead of its pixel art, with the
engine's characters, items and occlusion masks still placed on top. Nothing in
the simulation changes.

## What to generate

`art/refs/` holds one reference image per scene plus `PROMPTS.md`:

* 39 room images (736x512): every unique room, with separate references for the
  bed rooms (beds empty / occupied), the two mess halls (benches empty / with
  seated prisoners) and the blocked tunnel (blocked / cleared). The game blends
  the two variants when only some beds or benches are occupied.
* 4 camp map quadrants (3456x2176 each). Together they form the whole outdoor
  map. Generate them at the highest resolution you can (4K wide) and keep the
  same aspect ratio; neighbouring quadrants should match at their shared edges,
  so it helps to generate them in one session with the same style prompt and
  to mention "part of a larger map" in the prompt.

For each file: open the Gemini app or Flow, start an image-to-image generation
(attach the reference image), paste the style prompt plus the per-image line
from `PROMPTS.md`, and ask it to keep the exact layout. Download the result and
save it under **the same file name** as the reference (png, jpg or webp are all
fine) into a folder called `art/painted/`.

Tips:

* The important thing is geometry: doors, walls, floor edges, beds and tables
  must stay where the reference has them, otherwise characters will walk
  through furniture. If a result moves things, regenerate with "keep the exact
  composition of the input image" added.
* Keep the area outside the room black.
* No people in the room images except the "seated" mess-hall variants.
* Generators often change the framing a little (a 4:3 output, letterbox bars,
  a slight shift). That is fine: `tools/align_paintings.js` measures where the
  reference frame sits inside each painting and stores it in the manifest, and
  the game crops accordingly.

## Where to put them

Commit the `art/painted/` folder to this branch (or send the folder as a zip),
then:

```sh
# 1. register each painting to its reference (writes PAINTED_ALIGN into the manifest)
node tools/align_paintings.js art/refs art/painted web/painted_manifest.js
# 2. re-encode for the single-file build (rooms 1472 px wide, map 4096 px, WebP)
tools/shrink_paintings.sh art/painted dist/painted_web
# 3. build the game with the paintings inlined
node tools/build.js web/index.html dist/TheGreatEscapeHD.html dist/painted_web
```

Step 2 needs ImageMagick; without it, pass `art/painted` to the build directly
(the file is then as large as the paintings themselves).

The pause menu gets a "Painted backgrounds" option that switches between the
paintings and the pixel art. Missing files simply fall back to pixel art, so a
partial set works too. The development page (`web/index.html`) loads the
folder directly from `art/painted/` without rebuilding (serve the repository
root over HTTP for that).

The engine's characters, items and occlusion masks are drawn over the painting,
and rooms with beds or benches blend the two variants per slot, so a room with
one occupied bed shows that bed from the "occupied" painting and the rest from
the "empty" one.

## Regenerating the references

```sh
node tools/export_refs.js dist/TheGreatEscapeHD.html art/refs
```
