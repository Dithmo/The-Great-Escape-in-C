/*
 * dumpdata.c - dump the game's data tables as JSON for the HTML port.
 *
 * Build:
 *   gcc -Iinclude -Ilibraries/TheGreatEscape/include tools/dumpdata.c -o /tmp/dumpdata
 *
 * This includes the data source files directly so that file-static arrays
 * (masks, room definitions, object definitions) can be measured with sizeof.
 */

#include <stdio.h>
#include <stddef.h>

#include "libraries/TheGreatEscape/Data/ExteriorTiles.c"
#include "libraries/TheGreatEscape/Data/InteriorTiles.c"
#include "libraries/TheGreatEscape/Data/SuperTiles.c"
#include "libraries/TheGreatEscape/Data/Map.c"
#include "libraries/TheGreatEscape/Data/SpriteBitmaps.c"
#include "libraries/TheGreatEscape/Data/Sprites.c"
#include "libraries/TheGreatEscape/Data/ItemBitmaps.c"
#include "libraries/TheGreatEscape/Data/Font.c"
#include "libraries/TheGreatEscape/Data/StaticTiles.c"
#include "libraries/TheGreatEscape/Data/Music.c"
#include "libraries/TheGreatEscape/Data/Masks.c"
#include "libraries/TheGreatEscape/Data/InteriorObjectDefs.c"

/* RoomDefs.c needs State.h which pulls in a lot; we only need the arrays. */
#define get_roomdef   dummy_get_roomdef
#define set_roomdef   dummy_set_roomdef
#include "libraries/TheGreatEscape/Data/RoomDefs.c"
#undef get_roomdef
#undef set_roomdef

static int first;

static void bytes(const char *name, const uint8_t *p, size_t n)
{
  size_t i;
  if (!first) printf(",\n");
  first = 0;
  printf("\"%s\":[", name);
  for (i = 0; i < n; i++)
    printf("%s%d", i ? "," : "", p[i]);
  printf("]");
}

static void words(const char *name, const uint16_t *p, size_t n)
{
  size_t i;
  if (!first) printf(",\n");
  first = 0;
  printf("\"%s\":[", name);
  for (i = 0; i < n; i++)
    printf("%s%d", i ? "," : "", p[i]);
  printf("]");
}

int main(void)
{
  size_t i;

  first = 1;
  printf("{\n");

  bytes("exterior_tiles", (const uint8_t *) exterior_tiles, sizeof(exterior_tiles));
  bytes("mask_tiles",     (const uint8_t *) mask_tiles,     sizeof(mask_tiles));
  bytes("interior_tiles", (const uint8_t *) interior_tiles, sizeof(interior_tiles));
  bytes("supertiles",     (const uint8_t *) supertiles,     sizeof(supertiles));
  bytes("map",            (const uint8_t *) map,            sizeof(map));
  bytes("font",           (const uint8_t *) bitmap_font,    sizeof(bitmap_font));
  bytes("ascii_to_font",  (const uint8_t *) ascii_to_font,  sizeof(ascii_to_font));
  bytes("music0",         music_channel0_data, sizeof(music_channel0_data));
  bytes("music1",         music_channel1_data, sizeof(music_channel1_data));
  words("semitone_to_frequency", semitone_to_frequency, sizeof(semitone_to_frequency) / 2);
  bytes("flag_up",        flag_up,   3 * 25);
  bytes("flag_down",      flag_down, 3 * 25);

  /* Static tiles: 8 rows + attribute each. */
  {
    static uint8_t buf[79 * 9];
    for (i = 0; i < 79; i++)
    {
      int r;
      for (r = 0; r < 8; r++)
        buf[i * 9 + r] = static_tiles[i].data.row[r];
      buf[i * 9 + 8] = static_tiles[i].attr;
    }
    bytes("static_tiles", buf, sizeof(buf));
  }

  /* Sprites. */
  printf(",\n\"sprites\":[");
  for (i = 0; i < sprite__LIMIT; i++)
  {
    const spritedef_t *s = &sprites[i];
    size_t n = (s->width - 1) * s->height;
    size_t j;
    printf("%s{\"w\":%d,\"h\":%d,\"bitmap\":[", i ? ",\n" : "", s->width, s->height);
    for (j = 0; j < n; j++) printf("%s%d", j ? "," : "", s->bitmap[j]);
    printf("],\"mask\":[");
    for (j = 0; j < n; j++) printf("%s%d", j ? "," : "", s->mask[j]);
    printf("]}");
  }
  printf("]");

  /* Items. */
  {
    static const struct { int w, h; const uint8_t *bm, *mk; } items[16] =
    {
      { 2, 11, bitmap_wiresnips, mask_wiresnips },
      { 2, 13, bitmap_shovel,    mask_shovelkey },
      { 2, 16, bitmap_lockpick,  mask_lockpick  },
      { 2, 15, bitmap_papers,    mask_papers    },
      { 2, 12, bitmap_torch,     mask_torch     },
      { 2, 13, bitmap_bribe,     mask_bribe     },
      { 2, 16, bitmap_uniform,   mask_uniform   },
      { 2, 16, bitmap_food,      mask_food      },
      { 2, 16, bitmap_poison,    mask_poison    },
      { 2, 13, bitmap_key,       mask_shovelkey },
      { 2, 13, bitmap_key,       mask_shovelkey },
      { 2, 13, bitmap_key,       mask_shovelkey },
      { 2, 16, bitmap_parcel,    mask_parcel    },
      { 2, 16, bitmap_radio,     mask_radio     },
      { 2, 12, bitmap_purse,     mask_purse     },
      { 2, 12, bitmap_compass,   mask_compass   },
    };
    printf(",\n\"items\":[");
    for (i = 0; i < 16; i++)
    {
      size_t n = 2 * items[i].h;
      size_t j;
      printf("%s{\"w\":%d,\"h\":%d,\"bitmap\":[", i ? ",\n" : "", items[i].w, items[i].h);
      for (j = 0; j < n; j++) printf("%s%d", j ? "," : "", items[i].bm[j]);
      printf("],\"mask\":[");
      for (j = 0; j < n; j++) printf("%s%d", j ? "," : "", items[i].mk[j]);
      printf("]}");
    }
    printf("]");
  }

  /* Masks (RLE). */
  {
#define M(a) { a, sizeof(a) }
    static const struct { const uint8_t *p; size_t n; } masks[30] =
    {
      M(exterior_mask_0), M(exterior_mask_1), M(exterior_mask_2), M(exterior_mask_3),
      M(exterior_mask_4), M(exterior_mask_5), M(exterior_mask_6), M(exterior_mask_7),
      M(exterior_mask_8), M(exterior_mask_9), M(exterior_mask_10), M(exterior_mask_11),
      M(exterior_mask_13), M(exterior_mask_14), M(exterior_mask_12),
      M(interior_mask_29), M(interior_mask_27), M(interior_mask_28), M(interior_mask_15),
      M(interior_mask_16), M(interior_mask_17), M(interior_mask_18), M(interior_mask_19),
      M(interior_mask_20), M(interior_mask_21), M(interior_mask_22), M(interior_mask_23),
      M(interior_mask_24), M(interior_mask_25), M(interior_mask_26)
    };
#undef M
    printf(",\n\"masks\":[");
    for (i = 0; i < 30; i++)
    {
      size_t j;
      if (masks[i].p != mask_pointers[i]) { fprintf(stderr, "mask order mismatch at %d\n", (int) i); return 1; }
      printf("%s[", i ? ",\n" : "");
      for (j = 0; j < masks[i].n; j++) printf("%s%d", j ? "," : "", masks[i].p[j]);
      printf("]");
    }
    printf("]");

    printf(",\n\"exterior_mask_data\":[");
    for (i = 0; i < 58; i++)
    {
      const mask_t *m = &exterior_mask_data[i];
      printf("%s[%d,%d,%d,%d,%d,%d,%d,%d]", i ? "," : "",
             m->index, m->bounds.x0, m->bounds.x1, m->bounds.y0, m->bounds.y1,
             m->mappos.u, m->mappos.v, m->mappos.w);
    }
    printf("]");
  }

  /* Interior object defs. */
  {
#define O(a) { (const uint8_t *) &a, sizeof(a) }
    static const struct { const uint8_t *p; size_t n; } objs[54] =
    {
      O(intobjdef_0), O(intobjdef_1), O(intobjdef_2), O(intobjdef_3), O(intobjdef_4),
      O(intobjdef_5), O(intobjdef_6), O(intobjdef_7), O(intobjdef_8), O(intobjdef_9),
      O(intobjdef_10), O(intobjdef_11), O(intobjdef_12), O(intobjdef_13), O(intobjdef_14),
      O(intobjdef_15), O(intobjdef_16), O(intobjdef_17), O(intobjdef_18), O(intobjdef_19),
      O(intobjdef_20), O(intobjdef_2), O(intobjdef_22), O(intobjdef_23), O(intobjdef_24),
      O(intobjdef_25), O(intobjdef_26), O(intobjdef_27), O(intobjdef_28), O(intobjdef_28),
      O(intobjdef_30), O(intobjdef_31), O(intobjdef_32), O(intobjdef_33), O(intobjdef_34),
      O(intobjdef_35), O(intobjdef_36), O(intobjdef_37), O(intobjdef_38), O(intobjdef_39),
      O(intobjdef_39), O(intobjdef_41), O(intobjdef_42), O(intobjdef_43), O(intobjdef_44),
      O(intobjdef_45), O(intobjdef_46), O(intobjdef_47), O(intobjdef_48), O(intobjdef_49),
      O(intobjdef_50), O(intobjdef_51), O(intobjdef_52), O(intobjdef_53)
    };
#undef O
    printf(",\n\"objects\":[");
    for (i = 0; i < 54; i++)
    {
      size_t j;
      if (objs[i].p != (const uint8_t *) interior_object_defs[i]) { fprintf(stderr, "object order mismatch at %d\n", (int) i); return 1; }
      printf("%s[", i ? ",\n" : "");
      for (j = 0; j < objs[i].n; j++) printf("%s%d", j ? "," : "", objs[i].p[j]);
      printf("]");
    }
    printf("]");
  }

  /* Room definitions, indexed by room (1..52). */
  {
#define R(a) { a, sizeof(a) }
    static const struct { const uint8_t *p; size_t n; } rooms[] =
    {
      R(roomdef_1_hut1_right), R(roomdef_2_hut2_left), R(roomdef_3_hut2_right),
      R(roomdef_4_hut3_left), R(roomdef_5_hut3_right), R(roomdef_8_corridor),
      R(roomdef_7_corridor), R(roomdef_8_corridor), R(roomdef_9_crate),
      R(roomdef_10_lockpick), R(roomdef_11_papers), R(roomdef_12_corridor),
      R(roomdef_13_corridor), R(roomdef_14_torch), R(roomdef_15_uniform),
      R(roomdef_16_corridor), R(roomdef_7_corridor), R(roomdef_18_radio),
      R(roomdef_19_food), R(roomdef_20_redcross), R(roomdef_16_corridor),
      R(roomdef_22_red_key), R(roomdef_23_breakfast), R(roomdef_24_solitary),
      R(roomdef_25_breakfast), R(roomdef_28_hut1_left), R(roomdef_28_hut1_left),
      R(roomdef_28_hut1_left),
      R(roomdef_29_second_tunnel_start), R(roomdef_30), R(roomdef_31), R(roomdef_32),
      R(roomdef_29_second_tunnel_start), R(roomdef_34), R(roomdef_35), R(roomdef_36),
      R(roomdef_34), R(roomdef_35), R(roomdef_32), R(roomdef_40), R(roomdef_30),
      R(roomdef_32), R(roomdef_29_second_tunnel_start), R(roomdef_44), R(roomdef_36),
      R(roomdef_36), R(roomdef_32), R(roomdef_34), R(roomdef_36),
      R(roomdef_50_blocked_tunnel), R(roomdef_32), R(roomdef_40)
    };
#undef R
    printf(",\n\"rooms\":[");
    for (i = 0; i < sizeof(rooms) / sizeof(rooms[0]); i++)
    {
      size_t j;
      if (rooms[i].p != rooms_and_tunnels[i]) { fprintf(stderr, "room order mismatch at %d\n", (int) i); return 1; }
      printf("%s[", i ? ",\n" : "");
      for (j = 0; j < rooms[i].n; j++) printf("%s%d", j ? "," : "", rooms[i].p[j]);
      printf("]");
    }
    printf("]");
  }

  printf("\n}\n");
  return 0;
}
