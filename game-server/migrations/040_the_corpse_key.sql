-- The corpse-key (rome, 2026-07-07). Retires the tarnished-key entirely and
-- replaces it with something no other game does: a key MINTED BY THE SIMULATION
-- and thrown away by ROT.
--
-- The black door into the deep no longer wants a forged key kept on a shelf. It
-- wants proof you've faced what lives below it — a still-cold heart cut from one
-- of its own that climbed up through the cracks (the living sim surfaces a
-- deep-dweller into the shallows while the door is sealed; kill it and cut the
-- heart). The door knows the smell of its own dead and opens to it — but only
-- while it's fresh. The heart spoils in minutes, so it can't be hoarded and can't
-- litter; the old key's whole problem dissolves. No soft-lock either: the sim
-- never stops surfacing wanderers, so the deep is always eventually openable,
-- never on command. (Surfacing + freshness + door-consume live in code.)

-- The token: an organic, perishable key. Uncommon, no slot (not gear).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('deep-heart', 'a still-cold heart',
 'A dark, heavy heart, cut from something that dragged itself up out of the deep. It is still cold — and getting colder. The black door below knows the smell of its own dead and will open to it, but only while the cold is in it. Carry it fast. It does not keep.',
 'uncommon');

-- Retarget the deep door (hall → undercroft) from the tarnished key to the heart.
UPDATE exits SET key_item = 'deep-heart'
WHERE room_id = 'hall' AND dir = 'down' AND to_room = 'undercroft';

-- Retire the tarnished-key: pull its regrowing shrine spawn so it stops
-- littering. (The item template stays defined, harmless; any copy in a hand is
-- now just a dead weight, which is fitting.)
DELETE FROM ground_spawns WHERE item_id = 'tarnished-key';
