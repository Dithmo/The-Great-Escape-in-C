# Reference images and prompts

Generate each image with the reference attached (image-to-image / "edit this image"), keeping the composition. Save the result with the same file name as the reference, in a folder `art/painted/`.

## Style prompt (prefix for every image)

Painterly isometric game background, detailed digital illustration, 1944 German prisoner-of-war camp (Stalag). Keep EXACTLY the layout, camera angle, proportions and positions of every wall, floor edge, door and piece of furniture shown in the reference image; do not add, move or remove objects; keep the same framing and the same black area outside the room. Soft directional daylight, dust in the air, weathered wood, worn textures, muted earthy palette. No people, no animals, no text, no watermark.

## Rooms (736x512 references; generate at 1472x1024 or larger, same 23:16 aspect)

### room_01_hut1_right.png

barrack bunk room in a wooden hut: two occupied bunks, one empty bed, two wardrobes, two wide windows.

### room_02_hut2_left_bed_occupied.png

the hero's small room in a wooden hut: a single bed, an iron stove with a pipe, a table, a wide window, a small tunnel hatch in the floor. The beds are occupied by sleeping prisoners under grey blankets.

### room_02_hut2_left_bed_empty.png

the hero's small room in a wooden hut: a single bed, an iron stove with a pipe, a table, a wide window, a small tunnel hatch in the floor.

### room_03_hut2_right_beds_occupied.png

barrack bunk room in a wooden hut: three beds, a chest of drawers, a short wardrobe, two wide windows. The beds are occupied by sleeping prisoners under grey blankets.

### room_03_hut2_right_beds_empty.png

barrack bunk room in a wooden hut: three beds, a chest of drawers, a short wardrobe, two wide windows.

### room_04_hut3_left.png

small hut room: stove with pipe, empty bed, two chairs, papers on the floor, wide window.

### room_05_hut3_right_beds_occupied.png

barrack bunk room in a wooden hut: three beds, two chests of drawers, two wide windows. The beds are occupied by sleeping prisoners under grey blankets.

### room_05_hut3_right_beds_empty.png

barrack bunk room in a wooden hut: three beds, two chests of drawers, two wide windows.

### room_07_corridor_7.png

stone corridor in the main building: a tall wardrobe, two door frames.

### room_08_corridor_8.png

stone corridor in the main building: three door frames and a short wardrobe.

### room_09_crate_room.png

storeroom in the main building: barred window, shelf, cupboard, tall and short wardrobes, two small crates, a large crate.

### room_10_lockpick_room.png

store room: key racks on the wall, barred window, cupboards, tables, chests of drawers, a small crate.

### room_11_papers_room.png

commandant's office: desk, tall drawers, wardrobes, a shelf, a door frame.

### room_12_corridor_12.png

stone corridor: barred window, two door frames.

### room_13_corridor_13.png

stone corridor: three door frames, tall drawers, a chest of drawers.

### room_14_torch_room.png

guards' quarters: two empty beds, tiny drawers, chest of drawers, short wardrobe, shelf, two door frames.

### room_15_uniform_room.png

guards' quarters: two empty beds, drawers, shelf, table, short wardrobe, two door frames.

### room_16_corridor_16.png

stone corridor: three door frames.

### room_18_radio_room.png

radio room: cupboard, barred window, shelf, tables, short bench, tiny table, door frames.

### room_19_food_room.png

kitchen: barred window, cupboards, table, shelf, sink, chest of drawers, door frames.

### room_20_redcross_room.png

red cross parcel store: shelf, cupboard, small crates, table, tall and ornate wardrobes, tiny table, door frame.

### room_22_redkey_room.png

small guard room: noticeboard, shelf, small crate, table, two door frames.

### room_23_mess_hall_23_benches_empty.png

mess hall: long mess table with benches, cupboard, two barred windows, door frames.

### room_23_mess_hall_23_benches_seated.png

mess hall: long mess table with benches, cupboard, two barred windows, door frames. Prisoners in khaki sit on the benches eating, seen from behind and from the side.

### room_24_solitary_cell.png

bare solitary confinement cell: a tiny table, a door frame.

### room_25_mess_hall_25_benches_empty.png

mess hall: long mess table with benches, cupboard, two barred windows, door frame.

### room_25_mess_hall_25_benches_seated.png

mess hall: long mess table with benches, cupboard, two barred windows, door frame. Prisoners in khaki sit on the benches eating, seen from behind and from the side.

### room_28_hut1_left.png

hut room: wide window, cupboard, occupied bed, chair, table, door frames.

### room_29_tunnel_29.png

earth escape tunnel running up-right, propped with timber. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_30_tunnel_30.png

earth escape tunnel with a side junction. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_31_tunnel_31.png

earth escape tunnel running down-right. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_32_tunnel_32.png

earth escape tunnel with a corner. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_34_tunnel_34.png

earth escape tunnel ending at an exit shaft. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_35_tunnel_35.png

earth escape tunnel with a T junction. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_36_tunnel_36.png

earth escape tunnel with a corner. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_40_tunnel_40.png

earth escape tunnel with a corner. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_44_tunnel_44.png

earth escape tunnel with a corner. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_50_tunnel_50_blocked.png

earth escape tunnel. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

### room_50_tunnel_50_clear.png

earth escape tunnel. Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.

## Camp map (4 quadrants, each 3456x2176; generate at 4K wide keeping the 3456:2176 aspect)

Exterior prompt: Painterly isometric game map, top-down isometric view, detailed digital illustration, 1944 German prisoner-of-war camp (Stalag). Keep EXACTLY the layout, camera angle, proportions and positions of every wall, floor edge, door and piece of furniture shown in the reference image; do not add, move or remove objects; keep the same framing and the same black area outside the room. Soft directional daylight, dust in the air, weathered wood, worn textures, muted earthy palette. No people, no animals, no text, no watermark. Wooden barrack huts with corrugated roofs, a large stone main building with barred windows and ivy, barbed-wire chain-link fences on grass, wooden watchtowers, a gravel road, the main gate. Keep every fence line, hut and wall exactly where the reference has it. Neighbouring quadrants must match at their edges.

### map_q0_topleft.png

### map_q1_topright.png

### map_q2_bottomleft.png

### map_q3_bottomright.png
