-- THE FEVER RAT (rome, 2026-11-01). The fever's own body. With the dens gone
-- out onto open ground, a fever kept to the old village bit nobody; now it sits
-- over the wood beside it as well, and it has something to fight. When the
-- fever settles, the fever rat comes up out of the fever graves and sits there,
-- and the fever does not lift while it lives. Kill it and the wind comes round.
-- It has no spawn row (feverrat.ts brings it, one at most). Sized as the rat
-- king is: level 3, armour 2, 85 hp.
--
-- Its grave-cloth carries a trait found on nothing else in the world: whoever
-- wears it mends under the fever as if there were none. One kill in three
-- gives it up.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('grave-cloth', 'a grave-cloth',
   'A long strip of coarse linen, gone the colour of the earth it lay in, with a smell of herbs still in the weave under the smell of the pit. Somebody bound it over the mouth and nose of the dead before they went in. Tied over your own face, the warm wind off the graves goes by you.',
   'rare', 0, 0, 0, 0, 'helm', 0, 1, 1, 0, 0, 0, 0, 9, 0, 'grave-clothed');

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'fever-rat',
  'the fever rat',
  'A rat the size of a hound, come up out of the ground: the fur gone in patches over skin that is wet and grey, the eyes running, the earth of the grave still packed in its coat. It breathes with its mouth open, fast and shallow, and the air around it is warm and sweetish. There is a strip of old linen caught round its neck, dragged up with it from below.',
  3, 85, 3, 6, 0, 1,
  'grave-cloth', 0.34,
  2,
  NULL, 0,
  1, 0
);
