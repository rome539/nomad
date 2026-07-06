-- The expansion earns its keep: more to eat, and more worth killing for. Food
-- gets a proper spread — butchered off the beasts, smoked in the larders,
-- foraged in the wet dark — and the new elites and thrones drop things you
-- can't get anywhere else. All data: eating/heal/lure/spoilage and the bonus-
-- drop table (mob_keys) are already generic, so no engine change but a nicer
-- regrow line for a restocked larder (zone.ts).

-- ============================ PROVISIONS ============================
-- edible, heal, lure. Meat lures hungry things; bread and hardtack don't.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure) VALUES
('hyena-haunch',  'a raw hyena haunch', 'A heavy joint of stringy hyena, still warm. It will feed you — and its smell will call every hungry thing between here and the gate.', 'common',   1, 9,  2),
('pale-flesh',    'a slab of pale flesh','Cold, boneless meat the colour of a drowned thing, because that is what it is. You have eaten worse down here. You try to remember when.',        'uncommon', 1, 8,  1),
('smoked-haunch', 'a smoked haunch',    'A haunch cured black and hard in the smokehouse racks, keeping long past whoever hung it. Rich, and it goes a long way.',                     'uncommon', 1, 12, 1),
('salt-fish',     'a strip of salt-fish','A leathery strip of something netted from the black canal and salted stiff. Salt, and under it, fish. Mostly.',                             'common',   1, 6,  1),
('hardtack',      'a fistful of hardtack','Grey biscuit baked hard as slate for soldiers long dead. It does not rot, it does not spoil, and it barely counts as food — but it keeps you standing.', 'common', 1, 4,  0),
('pale-cap',      'a pale mushroom cap','A fat, colourless cap prised off the wet stone. It smells of cellar and earth. The ones that kill you look no different, so you chew slowly.', 'common', 1, 5, 0);

-- ============================ PLUNDER ============================
-- New trophies (barter feedstock) and the marquee prizes off the new dead.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('war-medal',     'a corroded war-medal', 'A soldier''s decoration gone green with rot, the device beneath long eaten away. Somebody was proud of this once.',                          'uncommon'),
('captains-seal', 'a warden-captain''s seal','A heavy signet of blackened silver, the warden''s mark cut deep. It still carries the weight of an order nobody is left to give.',        'rare'),
('drowned-pearl', 'a pearl of the drowned','A pearl the size of an eye, black and slick and warm as something living. It was not made by any oyster. Holding it, you want to put it down.', 'epic'),
('marrow-shard',  'a shard of the marrow-crown','A splinter of the crown the Marrow-King wears — bone fused with old gold, humming faintly, as if still counting the dead.',            'epic');

-- Signature gear — found ONLY on the two thrones. Never forged, never sold.
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES
('coral-crown',    'a coral crown',   'A crown of black coral and drowned bone, cold and light and faintly wet to the touch. It fits too well, as if it had been waiting for a head.', 'epic', 0, 'helm',   3, 1, 1, 0, 0, 0, 0),
('marrow-scepter', 'the marrow scepter','A long mace of fused vertebrae capped in a fist of gold, heavy as a grudge. Where it lands, bone remembers being broken.',            'epic', 4, 'weapon', 0, 1, 1, 1, 0.40, 0, 0);

-- ---- what the keeper will pay for the new trophies (food is not tender) ----
UPDATE item_templates SET barter = 3  WHERE id = 'war-medal';
UPDATE item_templates SET barter = 6  WHERE id = 'captains-seal';
UPDATE item_templates SET barter = 32 WHERE id IN ('drowned-pearl', 'marrow-shard');

-- ---- the keeper stocks preserved rations (renewable food through trade) ----
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('smoked-haunch', 5),
('salt-fish',     3),
('hardtack',      2);

-- ---- the new dead carry their signatures (primary loot + visible gear) ----
UPDATE mob_templates SET loot_item='war-medal',     loot_chance=0.5  WHERE id='bone-knight';
UPDATE mob_templates SET loot_item='captains-seal', loot_chance=0.6  WHERE id='warden-captain';
UPDATE mob_templates SET loot_item='drowned-pearl', loot_chance=0.5, gear_item='coral-crown',    gear_drop=0.25 WHERE id='drowned-god';
UPDATE mob_templates SET loot_item='marrow-shard',  loot_chance=0.5, gear_item='marrow-scepter', gear_drop=0.25 WHERE id='marrow-king';

-- ---- meat off the dead: a second drop via the bonus table (mob_keys) ----
-- Beasts yield a haunch; the deep dead yield their cold pale meat.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('grave-hyena',   'hyena-haunch', 0.45),
('dire-hyena',    'hyena-haunch', 0.55),
('pale-crawler',  'pale-flesh',   0.35),
('pale-stalker',  'pale-flesh',   0.40),
('the-drowned',   'pale-flesh',   0.30),
('drowned-hulk',  'pale-flesh',   0.35);

-- ---- larders, mess-stores, and the wet dark keep renewable provisions ----
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('smoked-haunch', 'larder',       1),
('salt-fish',     'larder',       1),
('smoked-haunch', 'smokehouse',   1),
('hardtack',      'muster',       1),
('hardtack',      'guardroom',    1),
('pale-cap',      'drowned-nave', 1),
('pale-cap',      'weeping-cells',1),
('pale-cap',      'deep-ossuary', 1);
