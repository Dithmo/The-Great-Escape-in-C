// export_refs.js - export reference (control) images and prompts for repainting every scene with an image model.
// usage: node tools/export_refs.js dist/TheGreatEscapeHD.html art/refs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [,, htmlPath, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const STYLE = 'Painterly isometric game background, detailed digital illustration, 1944 German prisoner-of-war camp (Stalag). ' +
  'Keep EXACTLY the layout, camera angle, proportions and positions of every wall, floor edge, door and piece of furniture shown in the reference image; ' +
  'do not add, move or remove objects; keep the same framing and the same black area outside the room. Soft directional daylight, dust in the air, ' +
  'weathered wood, worn textures, muted earthy palette. No people, no animals, no text, no watermark.';

// unique room definitions: [room index, name, description, variants]
const ROOMS = [
  [1, 'hut1_right', 'barrack bunk room in a wooden hut: two occupied bunks, one empty bed, two wardrobes, two wide windows', []],
  [2, 'hut2_left', 'the hero\'s small room in a wooden hut: a single bed, an iron stove with a pipe, a table, a wide window, a small tunnel hatch in the floor', [['bed_occupied', { 0: 23 }], ['bed_empty', { 0: 9 }]]],
  [3, 'hut2_right', 'barrack bunk room in a wooden hut: three beds, a chest of drawers, a short wardrobe, two wide windows', [['beds_occupied', { 1: 23, 2: 23, 3: 23 }], ['beds_empty', { 1: 9, 2: 9, 3: 9 }]]],
  [4, 'hut3_left', 'small hut room: stove with pipe, empty bed, two chairs, papers on the floor, wide window', []],
  [5, 'hut3_right', 'barrack bunk room in a wooden hut: three beds, two chests of drawers, two wide windows', [['beds_occupied', { 4: 23, 5: 23, 6: 23 }], ['beds_empty', { 4: 9, 5: 9, 6: 9 }]]],
  [7, 'corridor_7', 'stone corridor in the main building: a tall wardrobe, two door frames', []],
  [8, 'corridor_8', 'stone corridor in the main building: three door frames and a short wardrobe', []],
  [9, 'crate_room', 'storeroom in the main building: barred window, shelf, cupboard, tall and short wardrobes, two small crates, a large crate', []],
  [10, 'lockpick_room', 'store room: key racks on the wall, barred window, cupboards, tables, chests of drawers, a small crate', []],
  [11, 'papers_room', 'commandant\'s office: desk, tall drawers, wardrobes, a shelf, a door frame', []],
  [12, 'corridor_12', 'stone corridor: barred window, two door frames', []],
  [13, 'corridor_13', 'stone corridor: three door frames, tall drawers, a chest of drawers', []],
  [14, 'torch_room', 'guards\' quarters: two empty beds, tiny drawers, chest of drawers, short wardrobe, shelf, two door frames', []],
  [15, 'uniform_room', 'guards\' quarters: two empty beds, drawers, shelf, table, short wardrobe, two door frames', []],
  [16, 'corridor_16', 'stone corridor: three door frames', []],
  [18, 'radio_room', 'radio room: cupboard, barred window, shelf, tables, short bench, tiny table, door frames', []],
  [19, 'food_room', 'kitchen: barred window, cupboards, table, shelf, sink, chest of drawers, door frames', []],
  [20, 'redcross_room', 'red cross parcel store: shelf, cupboard, small crates, table, tall and ornate wardrobes, tiny table, door frame', []],
  [22, 'redkey_room', 'small guard room: noticeboard, shelf, small crate, table, two door frames', []],
  [23, 'mess_hall_23', 'mess hall: long mess table with benches, cupboard, two barred windows, door frames', [['benches_empty', { 7: 13, 8: 13, 9: 13 }], ['benches_seated', { 7: 5, 8: 5, 9: 5 }]]],
  [24, 'solitary_cell', 'bare solitary confinement cell: a tiny table, a door frame', []],
  [25, 'mess_hall_25', 'mess hall: long mess table with benches, cupboard, two barred windows, door frame', [['benches_empty', { 10: 13, 11: 13, 12: 13, 13: 13 }], ['benches_seated', { 10: 5, 11: 5, 12: 5, 13: 19 }]]],
  [28, 'hut1_left', 'hut room: wide window, cupboard, occupied bed, chair, table, door frames', []],
  [29, 'tunnel_29', 'earth escape tunnel running up-right, propped with timber', []],
  [30, 'tunnel_30', 'earth escape tunnel with a side junction', []],
  [31, 'tunnel_31', 'earth escape tunnel running down-right', []],
  [32, 'tunnel_32', 'earth escape tunnel with a corner', []],
  [34, 'tunnel_34', 'earth escape tunnel ending at an exit shaft', []],
  [35, 'tunnel_35', 'earth escape tunnel with a T junction', []],
  [36, 'tunnel_36', 'earth escape tunnel with a corner', []],
  [40, 'tunnel_40', 'earth escape tunnel with a corner', []],
  [44, 'tunnel_44', 'earth escape tunnel with a corner', []],
  [50, 'tunnel_50', 'earth escape tunnel', [['blocked', { 15: 20 }], ['clear', { 15: 0 }]]],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.stack.split('\n')[0]));
  await page.goto('file://' + path.resolve(htmlPath));
  await page.waitForTimeout(400);
  await page.click('#btn-start');
  await page.waitForTimeout(500);
  const prompts = ['# Reference images and prompts', '', 'Generate each image with the reference attached (image-to-image / "edit this image"), keeping the composition. Save the result with the same file name as the reference, in a folder `art/painted/`.', '', '## Style prompt (prefix for every image)', '', STYLE, ''];

  // Renders the current room background (no sprites) at HD size and returns a PNG data URL.
  const renderRoom = async (room, shadow, torch) => page.evaluate(([room, shadow, torch]) => {
    const s = TGE.state;
    for (const k in shadow) s.roomdef_shadow_bytes[k] = shadow[k];
    s.room_index = room; s.items_held[0] = torch ? 4 : 255;
    s.map_position.x = 116; s.map_position.y = 234; s.game_window_offset.x = 0; s.game_window_offset.y = 0; s.day_or_night = 0;
    setup_room(s); plot_interior_tiles(s);
    const attr = choose_game_window_attributes(s);
    const mood = room >= 29 ? HD.MOODS.torch : HD.MOODS.day;
    const scene = HD.buildScene(s, mood); HD.renderScene(mood, null);
    const cv = document.createElement('canvas'); cv.width = 736; cv.height = 512;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 736, 512);
    HD.composeFrame(ctx, scene, s.map_position.x * 8 + 8, s.map_position.y * 8, [], null);
    return cv.toDataURL('image/png');
  }, [room, shadow, torch]);

  const save = (name, dataUrl) => fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

  prompts.push('## Rooms (736x512 references; generate at 1472x1024 or larger, same 23:16 aspect)', '');
  for (const [room, name, desc, variants] of ROOMS) {
    const list = variants.length ? variants : [['', {}]];
    for (const [vname, shadow] of list) {
      const file = `room_${String(room).padStart(2, '0')}_${name}${vname ? '_' + vname : ''}.png`;
      save(file, await renderRoom(room, shadow, room >= 29));
      const extra = room >= 29 ? ' Underground: dark earth walls and ceiling lit by a torch, timber props, the black outside area stays black.' : '';
      prompts.push(`### ${file}`, '', `${desc}.${extra}${vname.includes('occupied') ? ' The beds are occupied by sleeping prisoners under grey blankets.' : ''}${vname.includes('seated') ? ' Prisoners in khaki sit on the benches eating, seen from behind and from the side.' : ''}`, '');
    }
  }

  // Full camp map, rendered window by window into one big canvas, then split into quadrants.
  prompts.push('## Camp map (4 quadrants, each 3456x2176; generate at 4K wide keeping the 3456:2176 aspect)', '',
    'Exterior prompt: ' + STYLE.replace('game background', 'game map, top-down isometric view') +
    ' Wooden barrack huts with corrugated roofs, a large stone main building with barred windows and ivy, barbed-wire chain-link fences on grass, wooden watchtowers, a gravel road, the main gate. Keep every fence line, hut and wall exactly where the reference has it. Neighbouring quadrants must match at their edges.', '');
  const mapData = await page.evaluate(async () => {
    const s = TGE.state;
    s.room_index = 0; s.game_window_offset.x = 0; s.game_window_offset.y = 0; s.day_or_night = 0;
    const big = document.createElement('canvas'); big.width = 216 * 32; big.height = 136 * 32;
    const bctx = big.getContext('2d'); bctx.fillStyle = '#07090c'; bctx.fillRect(0, 0, big.width, big.height);
    for (let y = 4; y < 140; y += 16) for (let x = 0; x < 216; x += 23) {
      s.map_position.x = Math.min(x, 192); s.map_position.y = Math.min(y, 124);
      get_supertiles(s); plot_all_tiles(s);
      const scene = HD.buildScene(s, HD.MOODS.day); HD.renderScene(HD.MOODS.day, null);
      const cv = document.createElement('canvas'); cv.width = 736; cv.height = 512;
      const ctx = cv.getContext('2d');
      HD.composeFrame(ctx, scene, s.map_position.x * 8 + 8, s.map_position.y * 8, [], null);
      bctx.drawImage(cv, (s.map_position.x + 1) * 32, (s.map_position.y - 4) * 32);
    }
    const out = [];
    for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
      const q = document.createElement('canvas'); q.width = big.width / 2; q.height = big.height / 2;
      q.getContext('2d').drawImage(big, qx * q.width, qy * q.height, q.width, q.height, 0, 0, q.width, q.height);
      out.push(q.toDataURL('image/png'));
    }
    const small = document.createElement('canvas'); small.width = 1728; small.height = 1088;
    small.getContext('2d').drawImage(big, 0, 0, 1728, 1088);
    out.push(small.toDataURL('image/png'));
    return out;
  });
  const qn = ['map_q0_topleft.png', 'map_q1_topright.png', 'map_q2_bottomleft.png', 'map_q3_bottomright.png'];
  qn.forEach((n, i) => { save(n, mapData[i]); prompts.push(`### ${n}`, ''); });
  save('map_overview_small.png', mapData[4]);
  fs.writeFileSync(path.join(outDir, 'PROMPTS.md'), prompts.join('\n'));
  console.log('exported', fs.readdirSync(outDir).length, 'files to', outDir);
  await browser.close();
})();
