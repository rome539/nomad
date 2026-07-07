-- Rename "The Long Hall" (the upper hall with the hatch down) to "The Vaulted
-- Hall". It sat one letter away from "The Long Descent" — the room two floors
-- below where the three-headed hound holds the stair — and the near-identical
-- names had players hunting the hound in the wrong room. The hall's own prose
-- already calls it "a vaulted hall at the heart of the Door," so the new name
-- just matches what was always written. (Room id 'hall' is unchanged.)
UPDATE rooms SET name = 'The Vaulted Hall' WHERE id = 'hall';
