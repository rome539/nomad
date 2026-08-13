-- 215 the bearward is dead (rome, 2026-08-13: a bear that travels the road,
-- mostly the east road and the wood — a mini-boss at about the three-hound's
-- weight, and give it a rare blood of its own).
--
-- WHY THERE IS A BEAR AT ALL, since this country lost its bears centuries
-- before the fall. Because somebody brought one. Bear-baiting was a trade and
-- the bearward was a travelling man: a chain, a muzzle, a pit dug at whatever
-- fair the drove road was feeding that week. The fall took the fairs and the
-- crowds and the bearward, and it did not take the bear. That is the same law
-- every other body out here obeys — the eel cutter still cutting, the salt widow
-- still boiling a cold pan — except this one is not a ghost. It is an animal
-- that outlived its job and got very large doing it.
--
-- WHAT MAKES IT NEW IS NOT THE NUMBERS. The three-hound is a SENTINEL: it holds
-- one door, it never takes a step, and you choose to walk into it. This is the
-- first thing at that weight that WALKS. It is in MIGRANTS, so it drifts the
-- band like the deer and the wolves do, and the road it is on this week is not
-- the road it was on last week.
--
-- THE LADDER. Base lands level with the three-hound (76) and under the ferryman
-- (84), which is where bosses actually begin. The rare blood is the one real
-- call in this file: the variant law says a hard base steps up gently, ~x1.15,
-- and from 76 that is 88 — PAST the boss floor. Taken deliberately (rome chose
-- it), because a 5% roll on a roaming animal is rarer than any boss, all of
-- which stand still and wait to be visited. It is not flagged is_boss: it takes
-- no boss immunities, it can be stunned, and it can be fled.
--
--     the-baited-bear     76hp  7-12  arm2  stun.15  bleed3
--     the-chain-breaker   88hp  8-13  arm3  stun.18  bleed3   5%
--
-- STUN HELD AT THE ROSTER'S CEILING (rome, 2026-08-13: the stun looks high).
-- The first draft had these at .20 and .22, which put them first and second on
-- the whole stun ladder — over the three-hound, the keeper and the woodward,
-- all of which sit at .15 and have sat there since they were written. That .15
-- is the ceiling, not a coincidence. The base now matches it exactly and the
-- rare blood clears it by three points, which is a step and not a new tier.

-- ---- what it leaves ---------------------------------------------------------
-- The pelt prices just under the white hide (24) and over the gaunt's (20): the
-- largest animal in the world, and the rarest thing on four legs that is only an
-- animal. The chain is the story and the story is worth carrying: a rare blunt
-- weapon that sweeps, in the shape of the woodward's axe (dmg5 stun.2 wt4) but
-- traded down a point of damage for the reach of a thing on the end of a chain.
INSERT OR IGNORE INTO item_templates
  (id, name, description, rarity, dmg, stun, bleed, weight, speed, sweep, armor, slot, barter, traits) VALUES
  ('bear-pelt', 'a bear pelt',
   'Rank, enormous, and heavier than it has any business being — a hide you could not wear and could not easily carry, with the guard hairs still greased and the old bald patches across the shoulders where something rubbed for years. There is a worn ring in the fur around the neck. That part is not from any fight.',
   'rare', 0, 0, 0, 1, 1, 1, 0, '', 22, ''),
  ('bearwards-chain', 'a bearward''s chain',
   'Six feet of hand-forged links with a swivel at one end and nothing at all at the other, the last link opened out like a mouth. The wear is all on the inside of the links, which is what happens when a thing pulls against a chain for a very long time and the chain wins, until the day it does not.',
   'rare', 4, 0.24, 0, 4, 1, 2, 0, 'hand', 16, 'reach'),
  -- The rare blood takes the OTHER road the roster gives a cousin (rome asked
  -- what these two leave). Eleven variants keep the base trophy at a better
  -- rate; ten drop something of their own — the dire wolf leaves a SKULL where
  -- a grey leaves a pelt, at double the barter. This is that, one tier up: the
  -- hardest thing that walks, on a 5% roll, so its head tops the trophy ladder
  -- at 26 — just over the white hide's 24, which stays the prize you can hunt
  -- for on purpose. You cannot hunt for this one. It has to turn up.
  ('bear-skull', 'a bear''s skull',
   'Longer than your forearm and far heavier than a skull that size has any right to be, the bone gone the colour of tea. The canines are worn flat at the tips and one is snapped off short. Around the base of it, where the neck was, the bone has grown a thick smooth ridge — that is what a body does when something has been fastened there for most of a life, and the collar is the only part of this animal that ever beat it.',
   'rare', 0, 0, 0, 1, 1, 1, 0, '', 26, ''),
  -- THE LAST BEAR (rome, 2026-08-13: a bear pelt or hat, legendary). Every one
  -- of the thirteen legendaries earns the word with TRAITS rather than numbers —
  -- the Still-Water Shroud is slick and quiet, the Long-Hunger wardhide and
  -- slick — so this one does too, and the traits are the joke the item is built
  -- on. PADDED halves how often a stun rings you, and the bear is the hardest
  -- stunner that walks: wear its head and the thing you were most afraid of out
  -- there is the thing that stops happening to you.
  --
  -- STRAPPED is the second, and it is chosen to stay OFF the Marrow-Crown's
  -- ground. The obvious pick was wardhide, and the obvious pick would have made
  -- this piece arm3/wt2/[wardhide,padded] — which is the Marrow-Crown exactly,
  -- stat for stat and trait for trait. A legendary that is another legendary
  -- with a different description is not a legendary. So the crown keeps the
  -- wound-ward and this keeps what it actually is: a head lashed over your own
  -- head hard enough that no cutpurse on the road is going to take it off you.
  -- (thorns was the other candidate and is a trap — it only ever reads off a
  -- SHIELD in code, so on a helm it would have been a word and nothing else.)
  --
  -- Armour 3 ties the crown at the top of the legendary helms and the weight is
  -- 2 like every other one, so it costs the usual load and does not quietly
  -- rewrite the dodge/noise arithmetic.
  ('the-last-bear', 'the Last Bear',
   'The whole head, taken off cleanly at the neck by somebody who had done it before, cured hard and hollowed and lined with felt where a skull will not sit on a skull. It goes on over the crown and down the back of the neck, and the upper jaw sits above your eyes with the teeth still in it. This country killed off its bears centuries before the walls fell, and the one that came back came back on a chain. There is not going to be another one. Whatever else you are wearing, this is the thing people will look at, and there is no version of putting it on that is modest.',
   'legendary', 0, 0, 0, 2, 1, 1, 3, 'helm', 30, 'padded,strapped');

-- ---- the animal -------------------------------------------------------------
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun) VALUES

  ('the-baited-bear', 'a baited bear',
   'It is standing in the road on all fours and it is still taller than you are. The coat is a filthy brown gone grey at the muzzle, worn down to the skin in a broad band around the neck and in two patches at the shoulders where a harness sat for years. A length of chain goes back from a swivel under its jaw and trails off into the grass behind it, and the far end of that chain is not attached to anything anymore. It has been baited. You can see it in the ears, which are mostly gone, and in the way it does not startle at you — it has had dogs set on it in a ring with a crowd shouting, and there is nothing you can do that it has not already had done.',
   5, 76, 7, 12, 5400, 0, 'bear-pelt', 0.5, 2, 'bearwards-chain', 0.25, 3, 0.15),

  ('the-chain-breaker', 'the chain-breaker',
   'This is the one that got the other end loose. There is no length of chain trailing behind it, only the swivel and four links still locked under the jaw, and the fifth link is opened out and bright at the break where old iron finally gave. It is a third again the size of the other and there is nothing worn about it but the scars — it did not spend its years being led. Somewhere between here and the fair-ground there is a man who held the far end of that chain on the day it went, and he did not walk away from the moment it did.',
   6, 88, 8, 13, 5400, 0, 'bear-skull', 0.6, 3, 'bearwards-chain', 0.35, 3, 0.18);

-- Rarer than the roster's ordinary mean cousins (10%) and rarer than the dire
-- wolf (8%), because the base is already the hardest thing that walks.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES
  ('the-baited-bear', 'the-chain-breaker', 0.05);

-- The bearward smoked, the way a man who stands about waiting for a crowd
-- smokes, and only one of these two was ever close enough to take his tin.
INSERT OR IGNORE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('the-chain-breaker', 'hand-rolled-smokes', 0.05),
  -- AND THE BOUNDS CHEST OPENS A SECOND WAY (rome, 2026-08-13). The marking
  -- iron opens box-bounds, which holds the hedge bill at 6% — one of the three
  -- legendaries — and until now the only real route to that key was the
  -- woodward himself at 30%, with three trickle sources under 3% behind him.
  -- One 175hp boss standing between the wood and a legendary is a bottleneck,
  -- not a gate. The bear is the second road: worse odds than the woodward, on
  -- something that comes to YOU instead of waiting at a known place, which is a
  -- different kind of hard rather than a cheaper one. It is the right animal to
  -- carry it, too — a marking iron marks the wood's bounds, and this is the
  -- thing that has been walking them since the man who did it stopped.
  ('the-baited-bear',   'marking-iron', 0.12),
  ('the-chain-breaker', 'marking-iron', 0.20);

-- ---- where it starts, before it walks --------------------------------------
-- TWO spawn points, not more: this is one animal in the world and then, on a
-- long clock, one animal again. The pound is where a travelling man penned what
-- he was travelling with; the boar ground is where a bear that got loose would
-- have gone and stayed. Both are only starting places — MIGRANTS carries it out
-- of them and the drift decides the rest.
INSERT INTO mob_spawns (template_id, room_id) VALUES
  ('the-baited-bear', 'the-drove-pound'),
  ('the-baited-bear', 'the-boar-ground');

-- ---- and where the Last Bear is ---------------------------------------------
-- NOT a second drop off the animal: the bear already leaves a skull, a chain and
-- the key, and a fourth roll on one body is a slot machine rather than a hunt.
-- It goes in the BOUNDS CHEST, which the key it drops is the key TO — so the
-- loop closes on itself. You need the bear to open the box that holds the thing
-- made out of a bear.
--
-- It belongs to the woodward besides. He keeps the wood's bounds, the bear walks
-- them, and he is the one man out there with the axe, the skill and the standing
-- to have taken its head off cleanly and kept it. The chest is where he put it.
--
-- 5%, just under the hedge bill's 6% already in this pool. Two legendaries in
-- one box is a lot, and it should be: this is the only chest in the game gated
-- behind a key that walks around the wood looking for you.
INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-bounds', 'the-last-bear', 0.05);
