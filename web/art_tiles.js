// Hand-drawn material textures (16x16 at 2x Spectrum resolution) and relief palettes for the background.
'use strict';

const ART_TILES = (function () {
  const rows = ART.rows;
  // textures use shade letters: a (darkest) b c d (lightest)
  const grass = [rows(`
bbbbcbbbbbbbbbbb
bbbcbbbbbbbbcbbb
bbbbbbbbbbbcbbbb
bbbbbbbbabbbbbbb
bcbbbbbbbbbbbbbb
bbbbbbbbbbbbbbcb
bbbbbcbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbabbbb
bbbbbbbbcbbbbbbb
bbcbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbcbbbbbbcbb
bbbbbbbbbbbbbbbb
bbbbbbbbbabbbbbb
bbbcbbbbbbbbbbbb
`), rows(`
bbbbbbbbbbbbbbbb
bbbbbbbcbbbbbbbb
bbcbbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
bbbbbbbbbabbbbbb
bbbbbbbbbbbbbbbb
bbbbbcbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbcbbb
babbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbcbbbbbbb
bbbbbbbbbbbbbbbb
bbbcbbbbbbbbbabb
bbbbbbbbbbbbbbbb
bbbbbbbbbbcbbbbb
`), rows(`
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbcbbbbbbbbb
bbbbbbbbbbbbbbbb
bbabbbbbbbbbcbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbcbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbabbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
`)];
  const gravel = [rows(`
bbbbbbcbbbbbbbbb
bbbcbbbbbbbbbbab
bbbbbbbbbbcbbbbb
bbbbbbabbbbbbbbb
bcbbbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
bbbbbbbbbbbbbbbb
bbbbbcbbbbbabbbb
bbbbbbbbbbbbbbbb
bbbabbbbcbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbcbbbbbbbbb
bbbbbbbbbbbbbbcb
bbbcbbbbbbabbbbb
bbbbbbbbbbbbbbbb
`)];
  const planks = [rows(`
bbbbbbbbcbbbbbbb
bbbcbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
bbbbbbbbbbbbbbbb
bbbbbbbcbbbbbbbb
bbcbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbcbbb
bbbbbbbbcbbbbbbb
bbbbbbbbbbbbbbbb
bbbcbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbcbbbbbcbb
bbbbbbbbbbbbbbbb
bbcbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
`)];
  const roof = [rows(`
cccccccccccccccc
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
cccccccccccccccc
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
cccccccccccccccc
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
cccccccccccccccc
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
`)];
  const brick = [rows(`
aaaaaaaaaaaaaaaa
cbbbbbbbacbbbbbb
bbbbbbbbabbbbbbb
bbbbbbbbabbbbbbb
aaaaaaaaaaaaaaaa
bbbbacbbbbbbbacb
bbbbabbbbbbbbabb
bbbbabbbbbbbbabb
aaaaaaaaaaaaaaaa
cbbbbbbbacbbbbbb
bbbbbbbbabbbbbbb
bbbbbbbbabbbbbbb
aaaaaaaaaaaaaaaa
bbbbacbbbbbbbacb
bbbbabbbbbbbbabb
bbbbabbbbbbbbabb
`)];
  const floorboards = [rows(`
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
cbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbcbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
bbbbcbbbbbbbbbbb
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
bbbbbbbbbbbbbbbb
aaaaaaaaaaaaaaaa
`)];
  const earth = [rows(`
bbbbbbbbbbbbbbbb
bbbcbbbbbbbbbbbb
bbbbbbbbbabbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
babbbbbbbbbbbbbb
bbbbbbbcbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbabbbb
bbbbcbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbcbbb
bbbabbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbcbbbbbb
bbbbbbbbbbbbbbbb
`)];
  const slate = [rows(`
bbbbbbbbbbbbbbbb
bbbbbbbbcbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bcbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbcbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbcbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbcbbbbb
bbbbbbbbbbbbbbbb
bbbbbbbbbbbbbbbb
`)];
  // a grass tuft replacing an ink dot (4x4 screen px per Spectrum pixel): 0 paper, 1 light, 2 dark green
  const tuft = [
    [0, 1, 0, 0],
    [1, 1, 0, 1],
    [2, 1, 1, 2],
    [0, 2, 2, 0]];

  // Per class: texture, paper shades a..d, ink [shadow, mid, highlight]
  const MATERIALS = {
    GRASS:    { tex: grass, paper: ['#2c4f24', '#3a6a2e', '#4d8438', '#6aa04a'], ink: ['#3b6a2a', '#78b24a', '#a6d870'], tuft: true },
    ROOF:     { tex: roof, paper: ['#3a332b', '#514840', '#6e6357', '#8c8073'], ink: ['#5a4e42', '#b8a68a', '#e0d2b6'] },
    HUTWALL:  { tex: planks, paper: ['#3a2416', '#5a3a22', '#74502f', '#8d6640'], ink: ['#7a5028', '#d8a86a', '#f0d0a0'] },
    BUILDING: { tex: brick, paper: ['#3a383f', '#5a5660', '#6a6670', '#7c7884'], ink: ['#7a7680', '#c8c2b4', '#ecE6d8'] },
    ROAD:     { tex: gravel, paper: ['#2e2d2b', '#3f3e3b', '#4b4a46', '#5a5955'], ink: ['#6a6862', '#9a9890', '#c4c2ba'] },
    FENCE:    { tex: grass, paper: ['#2c4f24', '#3a6a2e', '#4d8438', '#6aa04a'], ink: ['#6a7078', '#c0c8d0', '#eef2f6'], tuft: true },
    TOWER:    { tex: grass, paper: ['#2c4f24', '#3a6a2e', '#4d8438', '#6aa04a'], ink: ['#6a4a22', '#c89a58', '#ecc890'], tuft: true },
    GATE:     { tex: slate, paper: ['#1e1c1a', '#2d2a28', '#383430', '#44403c'], ink: ['#6a4a22', '#c89a58', '#ecc890'] },
    VOID:     { tex: null, paper: ['#07090c', '#07090c', '#07090c', '#07090c'], ink: ['#07090c', '#07090c', '#07090c'] },
    DARK:     { tex: null, paper: ['#0b0a10', '#0b0a10', '#0b0a10', '#0b0a10'], ink: ['#0b0a10', '#0b0a10', '#0b0a10'] },
    FLOOR:    { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#6a4a2a', '#b8976a', '#dcc090'] },
    WOOD:     { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#6a3e1e', '#d9ad6c', '#f2d49c'] },
    BED:      { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#8a8070', '#e8e4d8', '#ffffff'] },
    WINDOW:   { tex: slate, paper: ['#121a2c', '#1b2b4a', '#223656', '#2a4068'], ink: ['#7a90b0', '#d6e4f5', '#ffffff'] },
    DOOR:     { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#5a3a1a', '#c08a4c', '#e8b878'] },
    METAL:    { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#5a606a', '#aeb6c2', '#dde2ea'] },
    PAPER:    { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#9a9480', '#f2ecd8', '#ffffff'] },
    PERSON:   { tex: floorboards, paper: ['#2a1e14', '#3b2b1f', '#4a3626', '#5a4330'], ink: ['#6a6450', '#d9d2c0', '#f6f0e0'] },
    TUNNEL:   { tex: earth, paper: ['#1e1208', '#2a1a10', '#36231a', '#432c22'], ink: ['#7a4a1c', '#c9803c', '#e8a860'] },
    TUNNELDARK: { tex: null, paper: ['#000000', '#000000', '#000000', '#000000'], ink: ['#000000', '#000000', '#000000'] },
  };
  return { MATERIALS, tuft };
})();
