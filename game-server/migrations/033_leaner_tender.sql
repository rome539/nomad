-- The hard tender was leaking. It drops from nearly every mob, so no single
-- rate looked high — but across a morning's kills the aggregate paid out a
-- couple, and the fast lane is supposed to be RARE. Halve every non-boss
-- source; the Kings still pay out reliably (a King's hoard should).
UPDATE mob_keys SET drop_chance = 0.035 WHERE key_item = 'dry-cigarettes' AND template_id = 'cutpurse';
UPDATE mob_keys SET drop_chance = 0.04  WHERE key_item = 'dry-cigarettes' AND template_id = 'cutthroat';
UPDATE mob_keys SET drop_chance = 0.025 WHERE key_item = 'dry-cigarettes' AND template_id = 'warden';
UPDATE mob_keys SET drop_chance = 0.03  WHERE key_item = 'dry-cigarettes' AND template_id = 'warden-captain';
UPDATE mob_keys SET drop_chance = 0.02  WHERE key_item = 'dry-cigarettes' AND template_id = 'the-drowned';
UPDATE mob_keys SET drop_chance = 0.025 WHERE key_item = 'dry-cigarettes' AND template_id = 'drowned-hulk';
UPDATE mob_keys SET drop_chance = 0.01  WHERE key_item = 'dry-cigarettes' AND template_id = 'fleet-rat';
UPDATE mob_keys SET drop_chance = 0.015 WHERE key_item = 'dry-cigarettes' AND template_id = 'brood-rat';
UPDATE mob_keys SET drop_chance = 0.025 WHERE key_item = 'dry-cigarettes' AND template_id = 'dire-hyena';
UPDATE mob_keys SET drop_chance = 0.02  WHERE key_item = 'dry-cigarettes' AND template_id = 'bone-knight';
UPDATE mob_keys SET drop_chance = 0.02  WHERE key_item = 'dry-cigarettes' AND template_id = 'pale-stalker';
UPDATE mob_keys SET drop_chance = 0.02  WHERE key_item = 'dry-cigarettes' AND template_id = 'thrice-dead';
-- Bosses (forgotten-king, drowned-god, marrow-king) stay at 0.6 — untouched.
