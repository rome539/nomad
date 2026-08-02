-- THE SURFACE STOPS RINGING YOUR SKULL (rome, 2026-08-02: "i think you may have
-- made the new mobs a bit too strong", then "thin and nerf the heavies (not wolf)").
--
-- THE WOLVES ARE NOT TOUCHED. Not their count, not their stats, not the dire
-- cousin's wound. Sixteen greys and their variant are the wood's character and
-- the only real pack in the game; the pack law (PACK_PREY) was built around
-- exactly those numbers. Everything below is the OTHER heavies.
--
-- =========================================================================
-- 1. STUN IS ODDS, NOT A COUNT. The same mistake as the bleed column (mig 140),
-- in the column next to it, six times.
--
-- `mob_templates.stun` is a PER-HIT PROBABILITY: chance a landing blow costs the
-- player their next swing (zone.ts, `chance(tmpl.stun * stunMult)`). I wrote 1
-- into it, which is not "stuns hard" — it is stuns on EVERY landed hit, forever.
--
-- The mitigation does not save you either. stunMult is the better of PADDED
-- (0.5) and worn poise (POISE_CAP 0.75), so the best-armoured player in the game
-- still loses a quarter of their swings and a light build loses ALL of them. The
-- fight becomes: it swings, you don't, it swings, you don't. Against the boar
-- that is a mob you meet ten times in the wood.
--
-- The ladder that already existed, and that I ignored:
--   two-hound    0.10      twice-dead   0.12      three-hound  0.15   <- ceiling
-- and every fortress BOSS is 0.00, because bosses do their work with numbers.
-- So nothing here goes above the hound.
--
-- =========================================================================
-- 2. THE HEAVIES COME DOWN OFF THE TOP OF THE LADDER.
--
-- Every one of these was written this morning above the tier it belongs to, and
-- each is now level with the fortress mob it mirrors — not below it. The wood
-- stays the hard country. It stops being harder than the deep.
--
--   root-thing       70hp armor 3  ->  58hp armor 2   (vs three-hound 76/2, and
--        armour 3 is the warden-captain — ONE in the world — the rag-and-bone,
--        and the two surface bosses. Armour is FLAT subtraction with a floor of
--        1, so at 3 a fresh player's weapon does exactly 1 into 70 HP: seventy
--        unbroken rounds, near five minutes, while it stunned every hit.)
--   the-mire-walker  52hp 5-8      ->  46hp 4-7       (level with the drowned-
--        hulk, the fortress lv4 it is plainly a version of)
--   wild-boar        48hp          ->  42hp           (it was the toughest lv3
--        in the game bar the two-hound; the damage stays, a boar charges)
--   charcoal-burner  58hp          ->  50hp
--
-- NOT TOUCHED: the-follower (40hp/5-8/no armour is already in line, and you set
-- its count yourself at one per core), and the woodward and the keeper, who keep
-- every number but the stun. They are one each and they are the end of a region.
--
-- =========================================================================
-- 3. THINNED: 48 HEAVY SPAWNS -> 31.
--
-- The wood carried 104 spawns in 170 rooms with NOTHING below the grey wolf in
-- it — no rat, no cutpurse, no chaff. The fortress works because a third of what
-- lives in it is beatable on your first day. So there was a fight in every
-- second or third room and every one of them was a real one.
--
-- Cut by hand, never by LIMIT, and the removals do a second job: the two lines
-- overlapped badly. The root-thing had spread into the wet rooms — ditches,
-- seeps, sumps, the still pool — which is the mire-walker's whole territory, so
-- half the wood was two heavies deep in the same water. The root-things come out
-- of the water and back under the roots where the thing belongs, and the mire-
-- walker comes off the rooms where the wood's forage actually lies (the alder
-- carr and the flood meadow both hold watercress, and food you cannot reach is
-- not food).
--
-- The wood keeps ~86 spawns across 170 rooms: still one every other room, and
-- the quiet ones in between are what make the loud ones land.

-- ---- 1. six stuns become odds ---------------------------------------------
UPDATE mob_templates SET stun = 0.10 WHERE id = 'wild-boar';
UPDATE mob_templates SET stun = 0.12 WHERE id = 'root-thing';
UPDATE mob_templates SET stun = 0.12 WHERE id = 'something-ahead';
UPDATE mob_templates SET stun = 0.15 WHERE id = 'old-boar';          -- the ceiling: the wood's apex short of the boss
UPDATE mob_templates SET stun = 0.15 WHERE id = 'the-woodward';
UPDATE mob_templates SET stun = 0.15 WHERE id = 'the-keeper-of-the-holding';

-- ---- 2. the heavies find their tier ---------------------------------------
UPDATE mob_templates SET armor = 2, max_hp = 58 WHERE id = 'root-thing';
UPDATE mob_templates SET max_hp = 46, dmg_min = 4, dmg_max = 7 WHERE id = 'the-mire-walker';
UPDATE mob_templates SET max_hp = 42 WHERE id = 'wild-boar';
UPDATE mob_templates SET max_hp = 50 WHERE id = 'charcoal-burner';

-- ---- 3. thinned ------------------------------------------------------------
-- the root-thing comes out of the water (18 -> 10)
DELETE FROM mob_spawns WHERE template_id = 'root-thing' AND room_id IN (
  'the-clay-shelf', 'the-cold-seep', 'the-drip-line', 'the-flint-floor',
  'the-low-sump', 'the-lower-ditch', 'the-old-ditch', 'the-still-pool');

-- the mire-walker comes off the forage and the crossings (12 -> 8)
DELETE FROM mob_spawns WHERE template_id = 'the-mire-walker' AND room_id IN (
  'the-alder-carr', 'the-flood-meadow', 'the-frog-chorus', 'the-sunk-fence');

-- the boar thins in the oaks, and KEEPS the first clearing — the windfall pears
-- there carry lure 3, and bait with nothing to draw is just fruit (10 -> 7)
DELETE FROM mob_spawns WHERE template_id = 'wild-boar' AND room_id IN (
  'the-boundary-oak', 'the-last-oaks', 'the-close-ground');

-- the burner keeps the burnt ground and leaves the open (8 -> 6)
DELETE FROM mob_spawns WHERE template_id = 'charcoal-burner' AND room_id IN (
  'the-ant-hills', 'the-broken-ground');
