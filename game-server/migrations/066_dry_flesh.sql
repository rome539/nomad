-- The wights get a body (rome's ruling, 2026-07-11: "sounds like a zombie").
-- Twice-dead and thrice-dead join HOLLOW in code (no bleed, never flee, dry
-- tells) but stay vitals-open to every weapon via GRAVE_FLESH — a dried corpse
-- has a skull to split and a spine to sever, unlike bare bone. These
-- descriptions carry the ruling into the fiction, so a player reads "nothing
-- left in it to spill" BEFORE wasting a bleed weapon on one. Stats untouched;
-- redeploy only, no reseed.
UPDATE mob_templates SET description =
  'One of the old dead who never learned to stay so. Skin gone brown and hard as harness-leather, shrunk tight over the bones — nothing left in it to spill. Put it down and it lies still a moment, gathering itself — and then, unhurried, it stands back up and comes on again.'
  WHERE id = 'twice-dead';
UPDATE mob_templates SET description =
  'Older even than the barrow-dead, and worse at staying dead. What is left is cured meat and yellow bone, dry as the cairn it slept in — a knife finds nothing in it to bleed. Put it down and it gathers itself and stands; put it down again and, unbelievably, it does it once more. Only the third fall is the one that takes.'
  WHERE id = 'thrice-dead';
