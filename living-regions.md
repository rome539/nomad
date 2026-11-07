# Living regions

How a region's animals stop being fixed furniture and start deciding where to live. The mountain is the first region built this way (November 2026). Use this as the standard for the others.

**Status:** live on the mountain since November 6, 2026. The numbers are first settings from simulation; update this file when real play changes them.

## The goal

A player who comes back finds the region changed, because of what other players did or because the animals moved on their own. Wipe out a wolf pack and the next one lives somewhere else. A pack can move into a hamlet because the food is easy. The world is shared and persistent, so nothing rerolls at login; it changes because animals die, get born, go hungry, get driven off and outstay their homes.

## The rules

1. **Where they settle is chance, and food tips the odds.** Every fit room can be drawn. A room counts for more the more food is within 3 rooms. Never "always pick the best room".
2. **Animals only settle on their own kind of ground.** A hind on grass, a raven on a crag. This limits homes only: a chased or hungry animal can still cross anything.
3. **Prey needs food too.** A grazer only settles with grazing inside its feeding range. Check this for every grazer, or it starves where it landed.
4. **A hunter with no wings needs prey close.** It only settles within 3 rooms of living prey, when any exists.
5. **Animals that live in company do, and the rest live alone.** A group shares one home and new animals join while it has room. A share of each group line goes without a group.
6. **A broken group is finished.** Down to one or none, it ends. A survivor goes on as a loner where it stands, and nothing new settles near that ground for 6 hours.
7. **Hunger moves them.** A group where more than half have stayed hungry for 2 hours, or a hungry loner, picks a new home and walks there. Hunger itself is never tuned down: starving is the world working.
8. **Nothing stays for good.** A home lasts 2-5 game days (8-20 real hours), then the animal or whole group draws a new one, away from the old ground. One that's well fed when its time comes gets one game day more. Nothing leaves in a fight.
9. **Packs hold their ground.** A pack wolf goes for smaller hunters on its ground: mostly a chase, sometimes a kill. Twice run off, the small one draws a new home. A pack wolf takes any fresh kill it finds a smaller hunter on. A lone wolf only chases one off a meal, kills nothing and drives nothing from its home. When two or more of a pack are hungry, the pack picks the nearest hind or goat within 12 rooms of home and closes on it together, into its room, so the two wolves a hind needs are there at once. One hill wolf takes a goat alone. An animal a hunter has gripped stays gripped until it breaks free or the hunter is driven off; it does not walk out of the grip.
10. **Birds walk day to day and fly for food, across the whole game.** Hungry with nothing within 3 rooms, a bird flies to the nearest food in its own region within 25 rooms, under open sky, off the map while in the air. Each flies to what it eats: hunters to prey, scavengers to bodies, grazers to feeding ground. A bird that eats only the dead (vulture, bone-breaker, raven, chough, gibbet crow) has nothing to find on foot, so it flies to the nearest bodies however close, unless it is standing on its meal. Nesting mothers and the ptarmigan stay down. A scavenger stays until fed, up to 30 minutes, then flies home. A hunter whose prey has left gives the room a minute, then flies to the next thing it eats, or home if there is none in reach or it is outside its hours. A bird done eating at its own home stays there rather than flying home. A bird never picks a full room: if its room fills in flight it turns for home, and if home is full it lands close by. It can't take off in a fight, while targeted, held, stunned, asleep or badly hurt, so flying is never an escape.
11. **Nothing is untouchable except by choice.** Bigger birds have hunters too: on the mountain lynx take any bird, gluttons and lead wolves take ravens, choughs and bone-breakers, wildcats and hill wolves take choughs, and two hill wolves take a raven or bone-breaker. A hunter is given what it could realistically win. Anywhere in the game, a flying bird is half as easy to catch and never triggers the boom event.
12. **Every bird is a small meal.** Mostly feather and hollow bone, so even a big one takes only 25 off a hunter's hunger, the same as eating its body. A hind or goat still fills one. This list (`SMALL_PREY`) covers the whole game, not just the mountain.
13. **Hunters hold their land.** A hunter's land is its home and the 3 rooms round it. A new one does not settle on land held by another of its kind, or by a bigger hunter after the same food, while there is other ground; with none, it settles anyway. On its own land it runs off another of its kind, or a smaller hunter after its food: mostly a chase, sometimes a bite, never a kill. Run off twice, the intruder draws a new home. On the mountain: lynx, glutton, wildcat, hill fox, snow fox, ermine, eagle and eagle owl. Grazers share their ground as herds and scavengers gather at bodies, so neither holds land. Before building it, measure that each kind fits at its limit with homes 4 rooms apart; on the mountain each fits 5 to 10 times over.

## What never moves

Sentinels, nesting mothers, the rooted, patrols, bosses and anything tied to a named place. Ask what each animal is for before putting it on a roaming list. On the mountain, rats stay at the Shieling hamlet because it is the fever rat's ground, and other animals may still move in on them. Every hamlet room is feeding ground, as in Assart End, so they have food. The stone adder used to be rooted and now moves like the rest.

## The numbers we use

| What | Value | Where |
|---|---|---|
| Wolf pack size / goes alone | 3-5 / 1 in 5 | `MOUNTAIN_GROUPS` |
| Hill wolves on the mountain | 12, room for two full packs and sometimes three | spawn rows |
| Goats, hinds, choughs, ptarmigan | 4-8, 3-6, 3-6, 3-6 / 1 in 10, ptarmigan about 1 in 7 | `MOUNTAIN_GROUPS` |
| Nearest a wolf settles to a gate | 10 steps | `MOUNTAIN_GROUPS` |
| Hungry this long, then moves | 2 hours | `GROUP_LEAN_MS` |
| A home lasts / extra if well fed | 2-5 game days / 1 game day (a game day is 4 real hours) | `HOME_MIN_DAYS`, `HOME_MAX_DAYS`, `HOME_FED_EXTRA_DAYS` |
| Broken ground stays empty | 6 hours | `GROUP_GONE_MS` |
| Wolf goes for a small hunter | 35% a turn, then 10 minutes' rest | `GROUND_CHASE_ODDS`, `RIVAL_REST_MS` |
| Chase ends in a kill | 10% | `GROUND_KILL_ODDS` |
| Run off this many times, loses home | 2 | `GROUND_DRIVEN_LEAVES` |
| Hunters holding land / a run-off that bites | Home + 3 rooms / 1 in 4 | `LAND_HOLDERS`, `TERRITORY_RADIUS`, `LAND_BITE_ODDS` |
| Pack goes after a hind or goat | 2 hungry, within 12 rooms of home | `PACK_QUARRY`, `PACK_HUNT_RANGE` |
| Flying bird caught in a hunt | Half the usual chance | `BIRD_CATCH_MULT` |
| Bird flight reach / speed | 25 rooms / 5 seconds a room, 15 minimum | `FLIGHT_RANGE`, `FLIGHT_MS_PER_ROOM`, `FLIGHT_MIN_MS` |
| Bird stays down at most / rest if it came home hungry | 30 / 20 minutes | `FLIGHT_STAY_MS`, `FLIGHT_REST_MS` |
| Hungry bird with no food in reach looks again | About 1 minute | `FLIGHT_LOOK_MS` |
| Most mobs a bird will land among | Lands only with fewer than 5 in the room | `CROWD_CAP` |

The numbers are first guesses tested in simulation. A new region can start from them. The only hunting chance this work changes is the flying birds' one; leave the rest alone.

## Where it lives

- `game-server/src/groups.ts`: choosing homes, groups, broken groups, hunger moves, packs holding ground and hunting together, hunters holding land
- `game-server/src/flight.ts`: birds flying out to feed, in every region
- `game-server/src/beasts.ts`: the `beasts` command and its daily count
- `game-server/src/mountain-ground.ts`: each room's kind of ground, and what each animal settles on
- `game-server/src/zone-data.ts`: the lists and numbers above
- `game-server/src/ai.ts`, `mountainHomes`: which rooms an animal may call home
- `game-server/src/herds.ts`: births and strays go through the plan
- `game-server/scripts/sim-mountain.mjs`: the simulator

Apart from flight, these are written for the mountain by name. **The first region after it should turn them into per-region tables, not copy them.**

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

`beasts` (keeper's key only, kept out of `census`) shows the mountain as it stands: wolf packs and where they live, loners, wolves in the hamlet, each animal alive against its limit, birds in the air and the busiest bird room, and in the last 24 hours homes given up, flights, chases, small hunters caught, kills stolen and who killed what. Hunger is left out on purpose. The next region should add its own section here, not a new command.

## What the mountain taught us

- **Measure food before calling it done.** The first ground table left 36 ptarmigan homes with nothing to graze. Nobody had asked whether prey had food.
- **Check the wait against the work.** Birds were given 4 minutes at a meal that takes about 15 on average to find. At 30 minutes, ravens, bone-breakers and owls got about 50-70% more meals.
- **Moving one animal moves its hunting.** Limiting lynx to crag and stone took them off the hinds and put them on the goats.
- **The old world already had too many hunters for its prey.** Hares and ptarmigan fall by half or more under the old rules too. Always run the old rules to see what's new.
- **More hunters can mean more prey.** Hares and ptarmigan did better under the new rules because wolves switched to rats: about 107 fewer of them killed by wolves in 48 hours, and about 129 more rats dead. Count births, arrivals and deaths before believing or dismissing a result like that; here they added up exactly.
- **Rats over their limit are not a bug.** Each new rat has a 5% chance of being a brood mother, whose pups don't count against the limit. The next region should check this before chasing it.
- **A six-hour reading can mislead.** It looked like a crash; by 48 hours the prey had levelled off.
- **A bug can look like balance.** Hinds and goats almost never died, which looked like hunting odds. It was a grip that let held prey walk off after a minute. Trace why something survives before tuning a chance.
- **A copied place needs its band's food too.** The Shieling copied Assart End's five greens as feeding ground, but Assart End's band feeds every room and the mountain's does not, so the Shieling's rats, none of which lived on a green, went hungry until every hamlet room was made feeding ground.
- **Small lines are fragile.** The mountain has only 4-7 of each small hunter, so a pack's kills show quickly.
