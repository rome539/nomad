# Living regions

How a region's animals stop being fixed furniture and start deciding where to live. The mountain is the first region built this way (November 2026), the crossing the second and the road the third. Use this as the standard for the others.

**Status:** live on the mountain since November 6, 2026; built for the crossing November 12, 2026, and for the road November 13, 2026. The numbers are first settings from simulation; update this file when real play changes them.

## The goal

A player who comes back finds the region changed, because of what other players did or because the animals moved on their own. Wipe out a wolf pack and the next one lives somewhere else. A pack can move into a hamlet because the food is easy. The world is shared and persistent, so nothing rerolls at login; it changes because animals die, get born, go hungry, get driven off and outstay their homes.

## The rules

1. **Where they settle is chance, and food tips the odds.** Every fit room can be drawn. A room with food within 3 rooms counts double at the most, however much food it is (`FOOD_PULL`); for a grazer the food is the grass still left there, so ground eaten bare stops pulling. It used to count one more for every prey animal or grazing room, and the hamlet's rats and the foot's grass drew everything to them. Never "always pick the best room". A home has no height ceiling: an animal may live anywhere from its nearest spawn row upward, so spawn rows set where a line starts, not how high it may live. Herds keep apart: a herd's home is at least 4 rooms from every other herd of its line while there is such ground, and a herd with one place left takes no newcomer, so the next starts its own (packs still fill to their size). Chough flocks keep apart the same way, and ravens, vultures and bone-breakers, which hold no land, each draw their home on the ground least crowded by all three together, not by their own kind alone (`FLOCKS`, `SPREAD_ROOSTS`). On the mountain an animal may make its home in the territory, tier five; only the summit is shut (`livingHomes`).
2. **Animals only settle on their own kind of ground.** A hind on grass, a raven on a crag. This limits homes only: a chased or hungry animal can still cross anything. Each room's kind of ground is read from its own words (`mountain-ground.ts`), and a room can be two kinds. Give the region's animals ground at every height, or they all end up where the food is: a hind may lie up on stone above the grass and walk down to feed, as red deer summer high.
3. **Prey needs food too.** A grazer only settles with grazing inside its feeding range. Check this for every grazer, or it starves where it landed. A grazer eats as it goes, at hunger 20 rather than waiting to be hungry at 50, so it shows hunger only when the grass round it has run out (`GRAZE_AT`). On the mountain the grazing is every green room, so where the words say grass, heather or moss, grazers can eat, and nowhere else: the bone ground feeds no grazer. The fourth tier had almost none, so fifteen of its rooms were rewritten to say moss grows in them (mig 381); to push grazers onto bare ground, change the room's words first, then its ground. Goats also browse the crags (lichen, moss and ledge plants, `BROWSERS`), so they live and feed up to the top. On the mountain the grass is eaten down: a grazing room holds 6 mouthfuls and grows one back every 20 minutes, so a bare room feeds nothing and a hungry grazer walks on to grass, while its daily round goes to the nearest room with grass left. Rats and thieves live on muck and scraps, which never run out. Everywhere else the ground still never runs dry.
4. **A hunter with no wings needs prey close.** It only settles within 3 rooms of living prey, when any exists.
5. **Animals that live in company do, and the rest live alone.** A group shares one home and new animals join while it has room. A share of each group line goes without a group.
6. **A broken group is finished.** Down to one or none, it ends. A survivor goes on as a loner where it stands, and nothing new settles near that ground for 6 hours.
7. **Hunger moves them.** A group where more than half have stayed hungry for 2 hours, or a hungry loner, picks a new home and walks there, then gives the new ground a game day before hunger can move it again (`LEAN_AGAIN_MS`). Hunger itself is never tuned down: starving is the world working.
8. **Nothing stays for good.** A home lasts 2-5 game days (8-20 real hours), then the animal or whole group draws a new one, away from the old ground. One that's well fed when its time comes gets one game day more. Nothing leaves in a fight.
9. **Packs hold their ground.** A pack wolf goes for smaller hunters on its ground: mostly a chase, sometimes a kill. Twice run off, the small one draws a new home. A pack wolf takes any fresh kill it finds a smaller hunter on. A lone wolf only chases one off a meal, kills nothing and drives nothing from its home. When two or more of a pack are hungry, the pack picks its quarry within 12 rooms of home and closes on it together, into its room, so the wolves it needs are there at once. The bigger the pack, the more it goes after big game: with three wolves alive it takes the nearest stag one time in three, with four half the time, with five or more four times in five, and otherwise the nearest hind or goat. A pack of two never goes after a stag, which needs three in the room. One hill wolf takes a goat alone. An animal a hunter has gripped stays gripped until it breaks free or the hunter is driven off; it does not walk out of the grip. A hunter holding a kill does not fall asleep until it has finished it or lost it.
10. **Birds walk day to day and fly for food, across the whole game.** Hungry with nothing within 3 rooms, a bird flies to the nearest food in its own region within 25 rooms, under open sky, off the map while in the air. Each flies to what it eats: hunters to prey, scavengers to bodies, grazers to feeding ground. A bird that eats only the dead (vulture, bone-breaker, raven, chough, gibbet crow) has nothing to find on foot, so it flies to the nearest bodies however close, unless it is standing on its meal. One eating stays until its meal is done. One in the air whose body is eaten before it lands turns for the next body in reach, or home if there is none. Nesting mothers and the ptarmigan stay down. Down, it walks the 3 rooms round where it landed, hunting or picking over them on foot, and flies when fed or after 10 minutes, never pinned to one room. A hunter with nothing it eats left on that ground, or a carrion bird whose body is gone, gives it a minute, then flies to the next thing it eats, or home if there is none in reach or it is outside its hours. A bird done eating at its own home stays there rather than flying home. A bird never picks a full room: if its room fills in flight it turns for home, and if home is full it lands close by. It can't take off in a fight, while targeted, held, stunned, asleep or badly hurt, so flying is never an escape.
11. **Nothing is untouchable except by choice.** Bigger birds have hunters too: on the mountain lynx take any bird but the great vulture and the brooding hen, gluttons and lead wolves take ravens, choughs, bone-breakers and carrion vultures, wildcats and hill wolves take choughs, and two hill wolves take a raven, a bone-breaker or a carrion vulture. A hunter is given what it could realistically win. The stag is taken by three hill wolves, the lead wolf and the cave lion; the lynx takes hinds but not the stag. Anywhere in the game, a flying bird is half as easy to catch and never triggers the boom event.
12. **Small kills are small meals, and small hunters fill on them.** Every bird is mostly feather and hollow bone, and the hill fox, snow fox and wildcat, with their rare blood the raiding fox, blue fox and tom, are no bigger than a raven, so each takes only 25 off a big hunter's hunger (a wolf, the eagle, the eagle owl), the same as eating its body. A hind or goat still fills one. A small hunter is filled by a small kill: the ermine and its rare blood the dancer, the foxes, the wildcat, the adders, the raven and the chough (`SMALL_EATERS`); the eagle and the owl stay out for now. These lists (`SMALL_PREY`, `SMALL_EATERS`) cover the whole game, not just the mountain.
13. **Hunters hold their land.** A hunter's land is its home and the 3 rooms round it. A new one does not settle on land held by another of its kind, or by a bigger hunter after the same food, while there is other ground; with none, it settles anyway. On its own land it runs off another of its kind, or a smaller hunter after its food: mostly a chase, sometimes a bite, never a kill. Run off twice, the intruder draws a new home. On the mountain: lynx, glutton, wildcat, hill fox, snow fox, ermine, eagle and eagle owl. Grazers share their ground as herds and scavengers gather at bodies, so neither holds land. Before building it, measure that each kind fits at its limit with homes 4 rooms apart; on the mountain each fits 5 to 10 times over.

14. **Bodies and meals take their time, across the whole game.** A body has as much on it as the dead thing had hit points; a feeder smaller than it takes its own size and leaves the rest, so four rats finish a wolf where one did. A meal is eaten over its time, 2 minutes for a body and 40 seconds for a mouthful or a graze; an animal cut short by walking off or a fight is owed back what it did not eat, and what was left of the body goes back on the floor. A body stays on the floor while it is eaten and leaves only when the last meal on it is done; once its last share is taken, nothing else can feed from it. Looking at a body says how much has been eaten off it. Tracks and other marks never push a body out of a room; a body picked clean goes a minute after its last meal was due to end, even if the eater was killed.

15. **Scavengers live on the dead, across the whole game.** No floor feeds them: the bone ground and the dungeon's carrion pits are where they roost and keep their daily round, not food. A scavenger eats a body in its room from hunger 20 (`deadEatsAt`), and a hungry one walks to the nearest body with meat on it within 3 rooms, of any age; further off is a bird's job. One standing beside a body it is not eating is not eating it, in words or picture. Rats and lurkers on a body still wait to be hungry at 50. At a body the bigger one eats: a hungry wolf, or one at its meal, runs vultures, ravens and bone-breakers off it, and a bone-breaker takes a body from a vulture or a raven. An eagle at its kill runs a lone raven off, and two or more ravens go up at an eagle together and push it out, kill or no kill. Whatever is run off keeps away 5 minutes, and the part of its meal it did not eat goes back on the body (`holdBody`, `mobEagle`). Rare blood counts as its line here: the old raven is a raven, the great vulture a vulture, the bone-dropper a bone-breaker.
16. **Fed cats and foxes kill for sport.** A fed fox (hill, snow, and their rare blood) or mountain cat (wildcat, tom, lynx, cave lion) sharing a room with its prey now and then kills it anyway and leaves the body lying uneaten, for the scavengers. One that tries waits 2 hours before it can again. If the prey lives, it is let go, bleeding (`SURPLUS_KILLERS`).
17. **Prey keeps out of a fight.** Runners, and the stags, goats and hedgehog that charge only when cornered (`NOISE_SHY`), are sent off by a fight's noise and never join one they are not in. An animal that fled a room keeps out of it for 10 minutes, whatever way its round or home lies; home is no refuge while a fight is on in it.

## What never moves

Sentinels, nesting mothers, the rooted, patrols, bosses and anything tied to a named place. Ask what each animal is for before putting it on a roaming list. On the mountain, rats stay at the Shieling hamlet because it is the fever rat's ground, and other animals may still move in on them. Every hamlet room is feeding ground, as in Assart End, so they have food. The stone adder used to be rooted and now moves like the rest.

## The numbers we use

| What | Value | Where |
|---|---|---|
| Wolf pack size / goes alone | 3-5 / 1 in 5 | `MOUNTAIN_GROUPS` |
| Crossing: marsh hound packs, seals, gulls, oystercatchers, wrack crabs | 2-4, 2-4, 3-6, 3-6, 3-6 / alone 1 in 5, about 1 in 7, 1 in 10, 1 in 10, 1 in 10 | `CROSSING_GROUPS` |
| Road: masterless dog packs, drove dog packs, goat herds | 2-4, 2-4, 4-8 / alone 1 in 5, 1 in 5, 1 in 10 | `ROAD_GROUPS` |
| Hill wolves on the mountain | 12, room for two full packs and sometimes three | spawn rows |
| Goats, hinds, choughs, ptarmigan | 4-8, 3-6, 3-6, 3-6 / 1 in 10, ptarmigan about 1 in 7 | `MOUNTAIN_GROUPS` |
| Nearest a wolf settles to a gate | 10 steps | `MOUNTAIN_GROUPS` |
| Hungry this long, then moves | 2 hours | `GROUP_LEAN_MS` |
| After a hunger move, before the next | 1 game day (4 hours) | `LEAN_AGAIN_MS` |
| Food in reach adds to a room's draw | At most as much again (doubles it) | `FOOD_PULL` |
| A home lasts / extra if well fed | 2-5 game days / 1 game day (a game day is 4 real hours) | `HOME_MIN_DAYS`, `HOME_MAX_DAYS`, `HOME_FED_EXTRA_DAYS` |
| Broken ground stays empty | 6 hours | `GROUP_GONE_MS` |
| Wolf goes for a small hunter | 35% a turn, then 10 minutes' rest | `GROUND_CHASE_ODDS`, `RIVAL_REST_MS` |
| Chase ends in a kill | 10% | `GROUND_KILL_ODDS` |
| Run off this many times, loses home | 2 | `GROUND_DRIVEN_LEAVES` |
| Hunters holding land / a run-off that bites | Home + 3 rooms / 1 in 4 | `LAND_HOLDERS`, `TERRITORY_RADIUS`, `LAND_BITE_ODDS` |
| Pack goes after a hind or goat | 2 hungry, within 12 rooms of home | `PACK_QUARRY`, `PACK_HUNT_RANGE` |
| Pack goes after a stag instead | 3 wolves 1 in 3, 4 wolves 1 in 2, 5+ 4 in 5; never with 2 | `PACK_STAG_ODDS` |
| Fed hunter kills for sport | 25% when it meets its prey, then 2 hours before it can again | `SURPLUS_ODDS`, `SURPLUS_REARM_MS` |
| Grass in a mountain grazing room / grows back | 6 mouthfuls / one every 20 minutes | `GRASS_BITES`, `GRASS_REGROW_MS` |
| A meal takes | 2 minutes for a body, 40 seconds at the least | `EAT_SHOW_MS`, `MEAL_MIN_MS` |
| Flying bird caught in a hunt | Half the usual chance | `BIRD_CATCH_MULT` |
| Bird flight reach / speed | 25 rooms / 5 seconds a room, 15 minimum | `FLIGHT_RANGE`, `FLIGHT_MS_PER_ROOM`, `FLIGHT_MIN_MS` |
| Bird stays down at most, walking / rest if it came home hungry | 10 / 20 minutes | `FLIGHT_STAY_MS`, `FLIGHT_REST_MS` |
| Hungry bird with no food in reach looks again | About 1 minute | `FLIGHT_LOOK_MS` |
| Most mobs a bird will land among | Lands only with fewer than 5 in the room | `CROWD_CAP` |
| A small kill takes off a big hunter's hunger | 25; a small hunter is filled | `MEAL_SMALL`, `SMALL_EATERS` |
| Run off a body keeps away | 5 minutes | `BODY_AVOID_MS` |

The numbers are first guesses tested in simulation. A new region can start from them. The hunting chances this work changes are the flying birds' one, the pack's pick of a stag and the sport kill; leave the rest alone.

## Where it lives

- `game-server/src/groups.ts`: choosing homes, groups, broken groups, hunger moves, packs holding ground and hunting together, hunters holding land
- `game-server/src/flight.ts`: birds flying out to feed, in every region
- `game-server/src/grass.ts`: the mountain's grass, eaten down and growing back
- `game-server/src/beasts.ts`: the `beasts` command and its daily count
- `game-server/src/zone-data.ts`, `LIVING_REGIONS`: each living region's roamers and groups (`MOUNTAIN_*`, `CROSSING_*`); `roamsIn` and `groupOf` read them
- `game-server/src/mountain-ground.ts`: each room's kind of ground, and what each animal settles on, for every living region
- `game-server/src/crossing-ground.ts`: the crossing's ground and what its animals settle on
- `game-server/src/road-ground.ts`: the road's ground and what its animals settle on
- `game-server/src/zone-data.ts`: the lists and numbers above
- `game-server/src/ai.ts`, `livingHomes`: which rooms an animal may call home, in its own region
- `game-server/src/herds.ts`: births and strays go through the plan
- `game-server/scripts/sim-mountain.mjs`, `sim-crossing.mjs` and `sim-road.mjs`: the simulators (`sim-crossing.mjs measure` prints each line's homes, and for a hunter the homes with prey in reach)

Since the crossing, the rules read per-region tables (`LIVING_REGIONS`) rather than the mountain by name. Since the road, a line may live in more than one region (the goat and the scarp raven live on the mountain and the road): each animal answers to the region its home is in, `roamsIn(line, region)` and `groupOf(line, region)` take the region, and every group carries its region, so a road goat never joins a mountain herd. A group made before the road carries none and counts as its line's first region. A new region adds its roamers and groups there, its ground file, and its section in `beasts`. The grass that is eaten down is still the mountain's alone; everywhere else the ground never runs dry.

## Doing another region

1. **Read the room text.** Sort every room into kinds of ground from what its text describes. The kinds can differ by region. Read the whole description: the mountain's first pass read about 125 characters per room, so a few of its rooms may need correcting.
2. **Decide who roams.** List each animal and whether it roams, stays, or is tied to a place, and why.
3. **Use the prey lists.** Decide who lives in groups from what the lists and descriptions say the animal is. Make sure each animal's food exists in that region.
4. **Give each animal its ground, then measure it.** For each one count possible homes, grazers with grazing in range, and hunters with prey within 3 rooms. Compare with today's spawn rows. Find problems here, not after shipping.
5. **Birds already fly everywhere.** A new bird joins `FOOD_FLIERS` unless it nests or feeds on the ground, and needs its food in `PREYS_ON`, `GRAZERS` or as a scavenger.
6. **Add a regression check for each rule**, and confirm it fails when the rule is broken. Every room in the region must have a kind of ground, or the test fails.
7. **Simulate before shipping**: see below.
8. **Ship only when rome says "ship".** Animals already alive keep their homes at first, except group animals sorting themselves one per minute; each home's time limit starts then, so those moves begin about 8 hours later. No reseed.

## Simulating

```
cd game-server
node --no-warnings scripts/sim-mountain.mjs old 48
node --no-warnings scripts/sim-mountain.mjs new 48
node --no-warnings scripts/sim-mountain.mjs hunted 48
```

It runs the real game engine on a private copy of the local database, with no players and a false clock. Run the old rules once and the new rules at least twice, because each run differs. 48 hours takes about 4-6 minutes. `old` switches off everything in this standard, so it shows the world as it was before the mountain's rules.

Read it for: counts against the region's limit, packs and loners, flights, meals, who killed what, and errors. **Hunger is not a score.** Animals are not meant to be full, and nearly every animal reads as hungry under the old rules too. Never judge a change by how hungry animals are, or tune to make them less so. Then ask:

- Does prey level off or keep falling? Compare with the old rules: a fall they share is not caused by this work.
- Is any animal hitting zero?
- Are the changes actually doing what they claim? Count the thing itself: flying is judged by whether birds reach more meals, not by how full they are.
- Who is killing what? A line that falls may have a new hunter on its ground. Track kills before blaming anyone.
- Are counts over the limit?

Its limits: it starts from a freshly placed world, not the live one; its "players" are random kills, not real play; and it does not prove balance, only shows direction. Report it that way.

## Checking it live

`beasts` (keeper's key only, kept out of `census`) shows the mountain as it stands: wolf packs and where they live, loners, wolves in the hamlet, each animal alive against its limit, birds in the air and the busiest bird room, and in the last 24 hours homes given up (time run out, hunger, or run off twice), flights, chases, small hunters caught, kills stolen and who killed what. Hunger is left out on purpose. The next region should add its own section here, not a new command.

## The crossing

Built November 12, 2026, the second region, by the steps above.

- **Ground.** All 268 rooms sorted from their whole text into water, tidal (the causeway, shoals and scars the sea covers), shore, marsh, reed, dune, field, stonework, road, hamlet, indoors and the sea cave. Nothing settles on road or indoors.
- **Who roams.** Marsh hounds (packs of 2-4, about three), grey seals (2-4), great gulls (flocks of 3-6), oystercatchers (3-6) and wrack crabs (3-6) live in company; ford eels, fen vipers and bitterns alone, the vipers and bitterns holding land. Gulls and seals keep apart as flocks do. Rats stay in the Salt hamlet (the strand fever rat's ground), the devil crabs stay rooted, the congers stay because a drowner never walks, and the people, bosses and the barrow-wight stay where they are.
- **What it measured.** Every line has 54-96 homes against 6-16 rows. The fen viper eats only rats and the rats live only in the Salt hamlet, so 3 of its 56 homes have food in reach; that was true before this work too.
- **The marsh hounds' big game is the seal and the conger.** When two or more of a pack are hungry, the pack picks the nearest grey seal or conger within 12 rooms of home and closes on it together, as the wolves do a stag; it takes three hounds in the room (`PACK_HUNTERS`, `PACK_QUARRY`, `PACK_PREY`). They still do not hold ground as the hill wolves do (`GROUND_HOLDERS` is still the wolves).
- **What the simulation showed** (old once, new twice, 48 hours). The crossing was already over-hunted under the old rules: wrack crabs fell from 16 to about 4, ford eels from 11 to about 3, bitterns, vipers and oystercatchers by half. The new rules land in the same place. What changed is who kills what: packs homing near the Salt hamlet roughly doubled the rats the hounds take (84 a day to 150-166), seals living on the tidal ground took far more crabs (9 to 45-49), and the hounds killed fewer vipers (34 to about 21). Gulls, seals, hounds and congers held at their limits throughout.
- **Changed after the first build** (November 12, 2026).
  - **Water voles.** They live in the reeds and the creeks and feed the vipers, bitterns, hounds and gulls.
  - **Brood mothers.** Every rat-eater her size or bigger hunts her. Before this the rats bred over their limit.
  - **Hunters for the big animals.**
    - The conger takes a marsh hound. Three congers moved up the marsh creeks where the hounds walk, because a conger never leaves its water.
    - The grey seal takes a gull.
  - **Bitterns and oystercatchers.**
    - A bittern in a reed room is much harder to catch.
    - The oystercatchers went from 7 to 12.
  - **Scavengers.** The gull and the marsh hound now eat the dead, each with its rare blood. A gull flies to a body as well as to live prey, and a hound at a body runs a gull off it. Before this only the rats and crabs ate the crossing's dead.
  - **Small hunters.** The bittern is one, so a vole or an eel fills it.
  - **Fights.** The wrack crab and the ford eel keep out of a fight's noise.
  - **Seals and congers are hunted.** Three marsh hounds of one pack bring down either one.

## The road

Built November 13, 2026, the third region, by the steps above.

- **Ground.** All 249 rooms sorted from their whole text into road (the paving and the made track), lane, green (grass, heath, heather, the drove's grazing and the folds), crag (the scarp, the cuttings, the quarry, the gill walls), water, wet (fen, reed, rush, peat, carr), wood, built and graves. Nothing settles on road, built or graves. The road names its grass and rock as the mountain does (`green`, `crag`), so the goat's and the raven's mountain rules hold on it unchanged.
- **Who roams.** Feral goats (herds of 4-8), masterless dogs and drove dogs (packs of 2-4, which close on a goat together as the hounds do a seal) live in company; roe deer, otters, grey herons, gill adders and scarp ravens alone, the otters, herons and adders holding land. The otter settles only near its rats. The rats stay where their rows are; the footpads and the other people, the barrow-wights, the mire-walkers (drowners), the toll clerks, the wardens, the miller, the carrier and the baited bear stay where they are.
- **What it measured.** Every line has 24-97 homes against 3-9 rows. The gill adder eats only rats, and every road rat is nearer a gate than an adder's rows let it live, so only 2 of its homes have a rat in reach; it is left off `SETTLES_BY_PREY` so it does not pile up there. The otter has 6 of 24, the heron (which eats only adders) 11 of 65, the masterless dogs 15 of 92 by their rows (they also take goats as a pack). That was true before this work too.

## What the mountain taught us

- **Measure food before calling it done.** The first ground table left 36 ptarmigan homes with nothing to graze. Nobody had asked whether prey had food.
- **Check the wait against the work.** Birds were given 4 minutes at a meal that takes about 15 on average to find. At 30 minutes, ravens, bone-breakers and owls got about 50-70% more meals. But a bird held in one room for half an hour looked wrong, so it is now 10 minutes spent walking the ground round where it landed.
- **Moving one animal moves its hunting.** Limiting lynx to crag and stone took them off the hinds and put them on the goats.
- **The old world already had too many hunters for its prey.** Hares and ptarmigan fall by half or more under the old rules too. Always run the old rules to see what's new.
- **More hunters can mean more prey.** Hares and ptarmigan did better under the new rules because wolves switched to rats: about 107 fewer of them killed by wolves in 48 hours, and about 129 more rats dead. Count births, arrivals and deaths before believing or dismissing a result like that; here they added up exactly.
- **Rats over their limit are not a bug.** Each new rat has a 5% chance of being a brood mother, whose pups don't count against the limit. The next region should check this before chasing it.
- **A six-hour reading can mislead.** It looked like a crash; by 48 hours the prey had levelled off.
- **A bug can look like balance.** Hinds and goats almost never died, which looked like hunting odds. It was a grip that let held prey walk off after a minute. Trace why something survives before tuning a chance.
- **A copied place needs its band's food too.** The Shieling copied Assart End's five greens as feeding ground, but Assart End's band feeds every room and the mountain's does not, so the Shieling's rats, none of which lived on a green, went hungry until every hamlet room was made feeding ground.
- **Count what crowds before blaming the numbers.** Birds bunched on a few rooms because each kind spread out only from its own kind, so vultures, ravens and bone-breakers piled onto the same roosts. Counting all three together spread them over the top.
- **Small lines are fragile.** The mountain has only 4-7 of each small hunter, so a pack's kills show quickly.
