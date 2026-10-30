/* harness.c - deterministic headless run of the C game, printing per-iteration checksums.
 * Build: gcc -O2 -DNDEBUG -I include -I libraries/TheGreatEscape/include libraries/TheGreatEscape/Data/*.c libraries/TheGreatEscape/Engine/*.c libraries/ZXSpectrum/*.c tools/harness.c -o harness
 * Run:   ./harness <iterations> <menu_iterations> <seed>
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ZXSpectrum/Spectrum.h"
#include "TheGreatEscape/TheGreatEscape.h"
#include "TheGreatEscape/State.h"

static int iteration;        /* main loop iteration count */
static unsigned int seed;
static int phase;            /* 0 = menu, 1 = game */
static int menu_iters_target;
static int menu_calls;

static void draw_handler(const zxbox_t *dirty, void *opaque) {}
static void stamp_handler(void *opaque) {}
static int sleep_handler(int d, void *opaque) { return 0; }
static void border_handler(int c, void *opaque) {}
static void speaker_handler(int on, void *opaque) {}

/* Deterministic joystick script: same function in harness.js. */
static unsigned int script_value(int iter)
{
  unsigned int h = (unsigned int) iter / 12u;
  h = h * 2654435761u + seed;
  h ^= h >> 13; h *= 0x5bd1e995u; h ^= h >> 15;
  unsigned int dir = h & 7;         /* 0..7 */
  unsigned int fire = ((h >> 8) % 23u) == 0;
  unsigned int v = 0;
  if (dir == 1 || dir == 2) v |= 1;   /* right */
  if (dir == 3 || dir == 4) v |= 2;   /* left */
  if (dir == 2 || dir == 5) v |= 4;   /* down */
  if (dir == 4 || dir == 6) v |= 8;   /* up */
  if (fire) v |= 16;
  if (dir == 7) v = 0;
  /* Only press inputs during part of each window, so the hero also idles. */
  if ((h >> 20) % 5u == 0) v = 0;
  return v;
}

static int key_handler(uint16_t port, void *opaque)
{
  if (phase == 0)
  {
    /* Menu: press '2' (kempston) then '0' (start). */
    if (port == port_KEMPSTON_JOYSTICK) return 0;
    if (menu_calls < menu_iters_target) return 0x1F; /* nothing pressed */
    if (menu_calls < menu_iters_target + 3 && port == port_KEYBOARD_12345) return 0x1F ^ 2;
    if (menu_calls >= menu_iters_target + 3 && port == port_KEYBOARD_09876) return 0x1F ^ 1;
    return 0x1F;
  }
  if (port == port_KEMPSTON_JOYSTICK) return script_value(iteration);
  return 0x1F;
}

static unsigned int crc_table[256];
static void crc_init(void)
{
  unsigned int c; int n, k;
  for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320u ^ (c >> 1) : c >> 1; crc_table[n] = c; }
}
static unsigned int crc32(unsigned int crc, const unsigned char *buf, size_t len)
{
  size_t i; crc ^= 0xffffffffu;
  for (i = 0; i < len; i++) crc = crc_table[(crc ^ buf[i]) & 0xff] ^ (crc >> 8);
  return crc ^ 0xffffffffu;
}

int main(int argc, char *argv[])
{
  int maxiters = argc > 1 ? atoi(argv[1]) : 2000;
  menu_iters_target = argc > 2 ? atoi(argv[2]) : 10;
  seed = argc > 3 ? (unsigned int) atoi(argv[3]) : 1;
  zxconfig_t zxconfig = { 32, 24, NULL, &draw_handler, &stamp_handler, &sleep_handler, &key_handler, &border_handler, &speaker_handler };
  zxspectrum_t *zx = zxspectrum_create(&zxconfig);
  tgestate_t *game = tge_create(zx);
  int iters;
  crc_init();
  tge_setup(game);
  phase = 0;
  for (;;)
  {
    int r = tge_menu(game);
    menu_calls++;
    if (r > 0) break;
  }
  printf("menu_calls %d game_counter %d\n", menu_calls, game->game_counter);
  phase = 1;
  tge_setup2(game);
  for (iters = 0; iters < maxiters; iters++)
  {
    unsigned int c;
    iteration = iters;
    tge_main(game);
    c = crc32(0, zx->screen.pixels, SCREEN_BITMAP_LENGTH);
    c = crc32(c, zx->screen.attributes, SCREEN_ATTRIBUTES_LENGTH);
    printf("%d %08x room=%d pos=%d,%d,%d map=%d,%d clock=%d gc=%d morale=%d score=%d%d%d%d%d hero=%d,%d,%d flags=%d route=%d/%d vc=%d%d%d%d%d%d%d%d\n",
           iters, c, game->room_index,
           game->vischars[0].mi.mappos.u, game->vischars[0].mi.mappos.v, game->vischars[0].mi.mappos.w,
           game->map_position.x, game->map_position.y, game->clock, game->game_counter, game->morale,
           game->score_digits[0], game->score_digits[1], game->score_digits[2], game->score_digits[3], game->score_digits[4],
           game->hero_mappos.u, game->hero_mappos.v, game->hero_mappos.w, game->vischars[0].flags,
           game->vischars[0].route.index, game->vischars[0].route.step,
           game->vischars[0].character != 255, game->vischars[1].character != 255, game->vischars[2].character != 255, game->vischars[3].character != 255,
           game->vischars[4].character != 255, game->vischars[5].character != 255, game->vischars[6].character != 255, game->vischars[7].character != 255);
  }
  return 0;
}
