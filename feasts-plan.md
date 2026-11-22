# The feasts: the plan

Built (2026-11-22), not shipped.

## The year (decided 2026-11-20)

The gatehouse keeps four feasts today (`GATEHOUSE_FEASTS` in public.ts), which
left five and a half months with nothing (January 2 to June 19) and almost three
(June 27 to September 20). The four are four of the eight old feasts of the
country year; the other four are added, so a feast comes about every six weeks.

| Feast | Dates (UTC, both ends included) | What it is |
|---|---|---|
| Yule | December 17 - January 1 | existing |
| **Candlemas** | February 1-7 | midwinter's end: candles blessed and lit, the first lambs |
| **Lady Day** | March 20-26 | spring: the year's turning, rents and hirings due |
| **May Day** | April 30 - May 6 | green boughs, a garland and a pole on the green |
| Midsummer | June 20-26 | existing |
| **Lammas** | July 31 - August 6 | the first loaf from the new grain, the hay in |
| Harvest | September 21 - October 5 | existing |
| Halloween | October 24 - November 1 | existing |

## What each feast needs

1. **A gatehouse dressing** painted over the same gatehouse picture, as the
   four existing ones are (four new dressings).
2. **The room's words change with the picture.** Today the feasts change only
   the picture; nothing on the server knows about them, which breaks the rule
   that text and picture always match. The server gets the same date table, and
   the gatehouse's room text gets a line for each of the eight feasts. This
   fixes the four existing feasts as well.

## The rats dress up (decided 2026-11-20, where it fits)

The common rat (`rat`) wears something for each feast. Other rats (fleet,
brood, albino, fever, the rat king) are left as they are unless named.

- **How:** a whole alternate sheet per feast, made by handing the existing rat
  sheet back with the one addition. Same frames, same order, same size (the
  rule for remade mobs: copy the live strip aside first and match its body).
  The page swaps to the feast's sheet while the feast is on, from the same date
  table.
- **Words match:** the rat's look line names what it is wearing while the feast
  is on.
- **What each wears (proposed):**

| Feast | The rat wears |
|---|---|
| Candlemas | a stub of candle wax stuck on its back |
| Lady Day | a primrose behind one ear |
| May Day | a scrap of ribbon tied round its middle |
| Midsummer | a ring of yellow flowers round its neck |
| Lammas | a ring of plaited wheat stalks round its neck, two ripe ears standing up from it (in its mouth would not hold through the eating and biting frames) |
| Harvest | a twist of straw, a little corn dolly, on its back |
| Halloween | each rat its own (2026-11-22): the fleet rat the hollowed turnip shell over its head (made); the scabby rat a small white ghost cloth with eye holes; the albino rat black cloth bat wings strapped to its back |
| Yule | a sprig of holly and a red rag round its neck |

"Where it fits": a feast whose thing does not read at rat size on screen is
skipped rather than forced.

## Built so far (2026-11-22, not shipped)

- All eight feasts are in both date tables (`GATEHOUSE_FEASTS` in zone-data.ts
  and public.ts, held equal by a regression check), each with its gatehouse
  picture (`public/room-bg/gatehouse-<feast>.webp`), its flames marked in
  plate-fx-torches.json, and a `FEAST_LINES` line written from the picture as
  painted. (The Candlemas picture was made from an earlier prompt: candles on
  the mantel and the hatch ledge, the rush cross, snowdrops and candles on the
  tables. The May Day picture has no birch tree. The words say what is there.)
- The rats dress up: the scabby rat (`rat`), the fleet rat and the albino rat
  each have a strip per feast (`public/mob/<rat>-<feast>.webp`), drawn while
  the feast is on (public.ts `FEAST_SHEETS` / `feastSheet`); only the picture
  changes, the creature keeps its own id. Each strip is sized to the live rat
  body (body length over frame height on idle, move-a, move-b, through mobVh).
  The words carry it wherever the rat is seen (zone-data `FEAST_COSTUMES`,
  through `bearsClause`). Halloween differs per rat: ghost cloth (scabby),
  turnip (fleet), bat wings (albino).

## The four new gatehouse pictures (hand back the gatehouse picture)

Each feast dresses DIFFERENT places in the room (not the same door, mantel
and tables every time), so the four read apart at a glance.

### Candlemas
```
Same picture. Keep the room, the camera, the composition and every object exactly as they are.

Dress it for Candlemas. Add only this:
- on the floor along the walls: rows of lit white candles
- on the barrels: lit white candles
- on the long table at the back: many lit white candles in clay holders
- by the hearth: a straw pen with a ewe and two newborn lambs

Nothing else changes.
```

### Lady Day
```
Same picture. Keep the room, the camera, the composition and every object exactly as they are.

Dress it for Lady Day. Add only this:
- on the floor by the walls: big pots of yellow daffodils
- beside the door: tall jars of silver pussy willow
- on the long table at the back: baskets of eggs dyed pale blue, pink and yellow
- on the benches: bunches of pale yellow primroses

Nothing else changes.
```

### May Day
```
Same picture. Keep the room, the camera, the composition and every object exactly as they are.

Dress it for May Day. Add only this:
- in the middle of the floor: a young birch tree standing in a tub, hung with coloured ribbons
- from beam to beam across the room: strings of coloured ribbons
- on pegs on the walls: crowns of flowers
- on the barrels: jugs of bluebells

Nothing else changes.
```

### Lammas
```
Same picture. Keep the room, the camera, the composition and every object exactly as they are.

Dress it for Lammas. Add only this:
- against the walls: sheaves of wheat stood upright on the floor
- on the long table at the back: a great pile of round loaves
- on the right wall: two sickles hung crossed
- on the barrels: jugs of ale

Nothing else changes.
```
