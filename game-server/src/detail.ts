// THE CLOSE READING OF THE WORLD (rome, 2026-08-06: "how and where can we make
// the lore deeper? (make the world feel alive)").
//
// Three holes were measured before any of this was written, and this file fills
// them. It is deliberately ONE file and it is deliberately all prose: none of it
// is mechanism, none of it is state, and nothing in here can break a tick.
//
//   1. NOTHING IN THE WORLD COULD BE LOOKED AT. `x` / `examine` / `read` /
//      `inspect` have always folded into `look` (parser.ts), and `look` checked
//      caches, ground items, carried items, players and your own lockbox — and
//      then said "You see nothing like that here." So across 408 rooms and
//      ~85,000 characters of room prose there was not one noun you could look
//      closer at. The gibbet at the Crooked Gibbet. The wheel in the Wheel Pit.
//      The slab over the shallow well. All of it painted on.
//
//   2. THE WOOD WAS A LORE DESERT — 170 rooms, 42% of the world, with ZERO
//      room-specific ambience and ZERO dark-touch lines against the dens' 44
//      and 12 in sixty rooms, and one flat map caption over the lot while the
//      fortress's 110 rooms carry five.
//
//   3. THE BESTIARY'S TOP TIER WAS ITS VAGUEST TEXT. creatureNature() reads off
//      the behaviour family, so 47 templates shared 14 sentences: you hunt a
//      thing eight times, study it, and the page tells you what every other
//      scavenger's page says.
//
// WHY A NEW FILE. zone-data.ts is already 3,400 lines and rome's standing rule
// is to keep the spine lean. This is leaf data — read by four callers, imported
// by nothing that ticks — so it lives on its own and zone-data keeps its shape.
// The two tables that must stay single (ROOM_AMBIENCE, DARK_TOUCH) are spread
// in over there rather than split, so there is still exactly one of each.

// ---------------------------------------------------------------------------
// PART ONE: THINGS YOU CAN LOOK AT
// ---------------------------------------------------------------------------
//
// Keys are ALIAS LISTS, pipe-separated, because a player types what they see in
// the prose and the prose does not agree with itself: the Crooked Gibbet's text
// says "gibbet", "cage" and "irons" for one object. Every alias is a whole word
// or a whole phrase — see matches() for exactly how loose this is allowed to be,
// which is not very. A near-miss must fall through to "you see nothing like
// that", because a wrong answer to a probe is worse than no answer.
//
// THE LAW OF THIS TABLE: it may only tell you what is ALREADY THERE. A feature
// never grants an item, never opens an exit, never sets state, and never lies.
// It is the second paragraph the room did not have space for. Everything a
// feature says has to be true of a player who never types `look` at all.

export type FeatureTable = Record<string, string>;

// Things that exist everywhere, answered honestly and briefly. This is the
// floor of the system: it means no probe anywhere in the world is met with a
// flat refusal when the thing probed for is genuinely underfoot.
export const COMMON_FEATURES: FeatureTable = {
  "ground|floor|earth|soil|dirt":
    "Ground, and it holds a print for a while. Whatever else this place is, people and animals have been putting their weight on it for a long time.",
  "sky|clouds|cloud":
    "Overcast, and the same overcast it always is — a flat grey lid with no sun anywhere in it and no way to read the hour off it.",
  "dark|darkness|shadow|shadows":
    "It is not the absence of light. It is a thing with a depth to it, and it starts about as far from you as you can reach.",
  "blood":
    "There is old blood here. There is old blood in most places here. It stops being worth remarking on within a day of your arrival, which is its own kind of remark.",
  "bones|bone|skull|skulls":
    "Bone, weathered pale, mostly broken up small. Some of it is not animal. Nobody has tidied any of it, because there is nobody whose job that is.",
  "water":
    "Standing water, still, with a skin on it. It is the colour of what it is lying in and it tells you nothing about how deep it goes.",
  "tracks|prints|footprints|marks|spoor":
    "Prints, crossing and overlaid, most of them older than today. Reading them properly is a trade, and the ones you can read are the ones you would rather not have.",
  // NOT "me|myself|self": cmdLook catches those far above this and sends you to
  // selfExamine, which is the better answer. Listing them here would be listing
  // aliases that can never fire.
  "hands|hand|fingers":
    "Your hands are steady enough. There is dirt worked into the creases that will not come out now, and you have stopped noticing the smell of yourself, which took about four days.",
  "corpse|body|dead|remains":
    "The dead here do not get put anywhere. They lie where they stopped, and the wood or the water or the rats take them at their own pace.",
};

// The bands. Checked after the room's own table and before COMMON, so a room
// can always overrule its region on a noun the region also answers.
export const REGION_FEATURES: Record<string, FeatureTable> = {
  // ---- the wood ---------------------------------------------------------
  wood: {
    "tree|trees|trunk|trunks|timber":
      "Mostly oak and beech and holly, and every one of them older than the fortress falling down behind you. Nothing here was planted by whoever last owned it. It has simply been let alone long enough to stop being anybody's.",
    "canopy|crowns|branches|leaves|leaf":
      "Closed over, near enough, and it is what makes the wood dark at midday and warm at midnight. The light that gets through has been green twice before it reaches you.",
    "litter|leaf litter|leafmould|leaf mould|mould":
      "Years of it, deep and soft and silent to walk on, which cuts both ways: you make no noise and neither does anything else.",
    "roots|root":
      "Up out of the ground and back into it, in loops you catch a boot in. In the sunken parts of this wood the roots are the ceiling.",
    "moss":
      "It grows on whichever side the weather does not come from, which is the one true compass in this wood and it is wrong about a third of the time.",
    "bark":
      "Rubbed smooth at about chest height on a good many of the trunks. Something large uses these trees to scratch, regularly, and has for years.",
    "path|paths|track|tracks|trail|run|runs":
      "Narrow lines of bare earth winding between the trunks, packed hard. Deer made them, and they go where deer need to go — water, cover, and away.",
    "undergrowth|scrub|bracken|brambles|bramble|thicket":
      "Chest-high and grown through itself. There are ways through it and none of them were cut by anything with hands.",
    "wood|forest|maze":
      "It goes further in every direction than it has any business going, and it does not thin out, and the middle of it is not marked. People who talk about the wood at the hatch talk about getting out of it, never about crossing it.",
  },
  // ---- the west road ----------------------------------------------------
  road: {
    "road|way|track|paving|stones|cobbles":
      "Metalled once, properly, with a camber and side-ditches and milestones — the sort of road a state builds and then stops maintaining. The surface is still under the grass in long stretches. You can feel the edge of it through a boot.",
    "verge|grass|ditch|ditches":
      "Grown over and grown in. Whatever drained this road drains it no longer, and the low stretches hold water for weeks after rain.",
    "milestone|milestones|stone":
      "Cut stone, weathered nearly smooth, with distances on it to places that may or may not still be there. People have been carving their names below the old cut for a long time, one under another.",
    "hills|horizon|distance|country|open":
      "Grey, low, and empty in every direction the road is not going. Nothing is moving on any of it, which is how you know something might be.",
    "wheelruts|ruts|cart tracks":
      "Two grooves worn into the stone itself, a cart's width apart and inches deep. That is not one cart or a hundred. That is centuries of traffic on a road nothing travels now.",
  },
  // ---- the fortress and its ground --------------------------------------
  gate: {
    "wall|walls|stone|stonework|masonry":
      "Coursed rubble with a dressed face where it mattered, and the dressed face has been robbed off in most places by somebody who needed squared stone more than the wall needed keeping.",
    "gate|door|doors":
      "Heavy, hung on strap-hinges set into the jamb, and it still swings. It is the only thing on this whole holding that has been maintained.",
    "fire|hearth|flames":
      "Kept small and kept going. The keeper feeds it without appearing to think about it, the way you would breathe.",
  },
  out: {
    "wall|walls|stone|stonework|masonry":
      "Coursed rubble, thick, and standing to its full height in some runs and to a knee in others. Where it has come down it has come down outward, which means it was pushed.",
    "keep|fortress|tower|ruin|ruins":
      "Bigger than it needs to be for the ground it holds, which usually means it was holding something else. Most of it is under you rather than in front of you.",
    "grass|weeds|nettles":
      "Rank and green and growing out of everything, which on a ruin is the clock: nettles want ground people have manured, so they mark where the living was.",
  },
  sky: {
    "wall|walls|parapet|stone|stonework|masonry":
      "You are on top of the thickness up here, and it is a good deal thicker than it looks from the ground. Wide enough for two to pass, which is how it was meant to be walked.",
    "view|country|distance|horizon|ground|approach":
      "You can see the whole approach from up here, which is the entire point of being up here, and there has been nothing on the approach for a very long time.",
    "wind":
      "It does not stop at this height. Everything up here has been shaped by it, including the stone, which is worn round on every edge that faces the weather.",
  },
  upper: {
    "wall|walls|stone|stonework|masonry":
      "Dressed ashlar down here, which the surface walls are not. Whoever built the halls spent on them, and whoever built above was patching.",
    "ceiling|roof|vault|vaulting":
      "Barrel-vaulted and sound. It has taken the weight of everything that fell in on it from above and has not shifted a stone.",
    "dust":
      "Undisturbed except where you have disturbed it. Your own way back is written across the floor behind you in a line anything can read.",
  },
  warrens: {
    "wall|walls|earth|dirt|sides":
      "Not built — dug. Packed earth with root and rubble through it, shored here and there with whatever came to hand, and shored by somebody in a hurry.",
    "props|timbers|shoring|beams":
      "Ratholed and soft and doing their job anyway. You can put a thumbnail into any of them. Nothing about that means they will go today.",
  },
  deep: {
    "water":
      "Black, and it does not move, and it is warmer than it should be. Things go into it and the surface closes over and that is the end of the record.",
    "wall|walls|stone|stonework|masonry":
      "Older work than anything above it, laid by people with better tools and more time, and it is holding back a great deal of water without complaint.",
  },
  // ---- the den ground ---------------------------------------------------
  den: {
    "house|houses|building|buildings|walls|cottage|cottages":
      "Low, thick-walled, roofed in turf or thatch or nothing. They were built by people who meant to be here a while and they outlasted the meaning by a long way.",
    "door|doors":
      "Shut, most of them, and not locked — there was never anything worth locking against. They open if you put a shoulder to the swollen ones.",
    "thatch|roof|roofs|turf":
      "Gone green and gone through in patches, and holding on the sheltered pitches. It is a roof for about another decade and then it is a pile.",
    "street|lane|way":
      "One street, and everything faces it, because that is how these places were laid out and nobody ever had cause to lay it out differently.",
    "fields|field|furrows|ridges":
      "The ridge-and-furrow is still readable under the grass, which means the plough stopped mid-cycle and nothing has broken this ground since.",
  },
};

// The specific. Room-keyed, checked first, and every entry here is a noun that
// the room's OWN description already put in front of the player.
export const ROOM_FEATURES: Record<string, FeatureTable> = {
  // ======================= THE WOOD ======================================
  "the-flint-scatter": {
    "flint|flints|nodules|flakes|cores|tools|edge":
      "Struck flakes with the bulb still on them, worked cores, and here and there a finished edge. Nobody has knapped flint on purpose in a very long time, and this is not a workshop — it is a floor somebody knapped on for years and then walked away from. The edges are still sharp. They keep in a way steel does not.",
  },
  "the-fishponds": {
    "ponds|pond|sluice|sluices|reed|reeds":
      "Three of them stepped down the slope so the water fed through and the fish could be moved between them by season. Stocked, harvested, and counted — a household that counts its fish is a household with a clerk. The sluice gates have gone but their stone housings are square and true.",
  },
  "the-dovecote": {
    "dovecote|tower|nesting boxes|boxes|nests":
      "Several hundred nest holes, stepped so a boy on a ladder could reach every one. A dovecote was a licence as much as a building: the right to keep birds that ate other people's grain and came home fat to be eaten by you.",
  },
  "the-park-pale": {
    "pale|fence|bank|ditch|stumps":
      "Bank on the inside, ditch on the outside, paling on the crest — that arrangement is not a boundary, it is a one-way valve. Deer could get in over it and could not get out. Somebody owned the deer here, and the law about that was serious.",
  },
  "the-kitchen-range": {
    "hearths|hearth|fires|flues|stone":
      "Two of them back to back and each wide enough to stand a man in. The burn on the stone goes up six feet and it is even, which means these were not lit for warmth — they were lit every day, for the length of somebody's working life, to feed a household you could not now count.",
  },
  "the-wolf-pits": {
    "pits|pit|bar|revetment|stone":
      "Steep-sided, stone-lipped, dug where a run comes through and paired so a thing driven at them takes one or the other. Somebody paid for that stonework, which means they wanted this done permanently rather than once.",
  },
  "the-stable-range": {
    "mangers|manger|rings|bays|stalls":
      "Twelve bays, and the tethering rings are still set in the wall and still turn. Twelve is not a farm's worth of horses. It is a household that could put twelve men on the road at once.",
  },
  "the-keepers-approach": {
    "limes|lime|avenue|trees|lines":
      "Two lines of limes forty feet apart, which is not a windbreak and not a crop. It is an approach, meant to be walked up slowly toward a house that wanted to be seen from a distance while you did it.",
  },
  "the-chapel-shell": {
    "slabs|graves|grave slabs|floor|stone":
      "Grave-slabs, worn past reading, laid flush in the floor. Burial inside your own chapel is the most expensive thing a family can do with a body, and this family did it enough times to floor a room.",
    "windows|window|openings|tracery":
      "The openings are still traced in cut stone and the tracery is good work. Whatever else went wrong here, it did not go wrong for lack of money.",
  },
  "the-well-court": {
    "well|shaft|wellhead":
      "Lined all the way down in dressed stone and dropping further than your eye follows. A well like this is dug before the house is built and it is the reason the house is where it is.",
  },
  "the-gate-arch": {
    "arch|gate|sockets|pins|jambs":
      "The sockets for the gate-pins are still cut square in the jambs. The gate they held would have been the width of a cart and heavy enough to need two men. There is nothing left to hang it on and nothing left to keep out.",
  },
  "the-moat-bank": {
    "moat|water|ditch|bank|enclosure":
      "Square-cut with the corners intact, which took surveying. A moat this shape is not a defence, or not only — it is a statement about where your ground stops, kept full and kept clean so everybody could see you could afford to.",
  },
  "the-yew-walk": {
    "yews|yew|tunnel|needles":
      "Planted in a double row and grown into one another overhead. Yew is slow, poisonous to stock, and useless as timber: you plant it where you intend to still be in two hundred years. Somebody was wrong about that.",
  },
  "the-orchard-gone-wild": {
    "trees|fruit|apples|orchard|rows":
      "Still bearing, small and hard and sour, in rows nobody has pruned in a century. Fruit trees do not seed themselves into lines. Every one of these was chosen, grafted and set by a person who expected to eat from it.",
  },
  "the-hall-floor": {
    "floor|paving|hearth|hall":
      "A central hearth on a paved floor open to the sky — the old arrangement, where the whole household ate and argued and slept in one room around one fire. The span means the roof over it was a serious piece of carpentry and somebody was proud of it.",
  },
  "the-icehouse": {
    "dome|brick|passage|cold|air":
      "The passage is clear and the air inside is markedly colder than out, and after this long that is not the brick doing it. An icehouse is a hole you fill with winter to have cold in July. Somebody had staff, and ponds, and a plan for August.",
  },
  "the-solar": {
    "carving|lintel|fireplace|ashlar|window":
      "Dressed ashlar and a carved lintel in the one room that was not communal — the private end, up three steps, with a window that faced the garden rather than the gate. This is where the family went when they were done being the household.",
  },
  "the-hollow-yew": {
    "yew|tree|hollow|inside":
      "Older than the planted walk by centuries — this one was here before anybody laid out an avenue. The inside is dry, and dark, and smells of nothing at all, which is the strangest thing about it: everything else in this wood smells of the wood.",
  },
  "the-last-light": {
    "shaft|light|hole|ceiling|daylight":
      "It comes down from somewhere a long way overhead through a gap in the root-ceiling and lands in a circle about the size of a table. It is the only daylight down here, and it moves an inch or two across the floor over an afternoon, and that is the only clock you have.",
  },
  "the-clay-shelf": {
    "marks|prints|clay|shelf":
      "The clay holds everything, so this is a register rather than a floor. Deer, pads, something with a long dragging stride, and a set that stops in the middle of the shelf and does not resume in any direction.",
  },
  "the-flint-floor": {
    "flint|pavement|floor|cobbles":
      "Knapped flint set on edge and close-packed over a wide area — that is a road surface or a yard, laid by hand, by somebody with a lot of hands. It rings faintly underfoot, which nothing else down here does, and it is under fifteen feet of wood.",
  },
  "the-eel-ditch": {
    "ditch|brick|water|eels|corners":
      "Straight, waist-deep, brick at the corners. Somebody cut this to catch eels and eels are worth cutting a ditch for — they keep alive out of water, so they were the one fresh thing you could carry a day's walk to a market.",
  },
  "the-poachers-camp": {
    "snare|wire|camp|fire scrape|stone|gear":
      "A wire snare still set in the run, rusted through and holding nothing. The fire-scrape is small and the stone to sit on is placed to keep the fire between the sitter and the open. Everything about this camp was arranged by somebody who did not intend to be found, and then they were not found, and then they did not come back for their gear.",
  },
  "the-timber-stack": {
    "timber|trunks|stack|crib|wood":
      "Squared, stripped, and cribbed eight feet high to season, which is a winter's work for a gang. Nobody came for it. The bottom course has gone into the ground and the top course would still take an axe today.",
  },
  "the-charcoal-ring": {
    "ring|circle|charcoal|burning floor|floor":
      "A burning-floor: level ground where a stack was raised, turfed over, and smouldered for a week while somebody sat up with it. There is another one south of here and it is worked the same way, which means the same family did both, on a rota, for generations.",
  },
  "the-ant-hills": {
    "nests|nest|hills|ants|highways":
      "Chest-high heaps of needle, alive on the surface, with cleared highways running between them through the litter. A wood-ant nest that size is decades old and the colony under it is older than the trees it is farming.",
  },
  "the-last-oaks": {
    "oaks|oak|trees":
      "Six of them, each wide enough to fill a room, standing well apart in clean ground because nothing else has ever been allowed to grow up between them. They were old before the wall fell. Nobody felled them, which is the odd part — that is a great deal of usable timber left standing by people who were short of everything.",
  },
  "the-osier-beds": {
    "osiers|willow|rods|stools|rows":
      "Cut to the stool and left, so every stump carries a fistful of straight red rods. Osier is the cheap universal material — baskets, hurdles, traps, fish weirs, the walls of a house — and it wants cutting every single winter without fail. The rows are still perfectly straight.",
  },
  "the-heronry": {
    "nests|nest|bones|herons|alders":
      "A dozen nests in the tops, the ground beneath white and stinking and littered with finger-sized bones. Herons come back to the same trees for generations. These birds are not in residence, and something has been at the nests, and neither of those things happens to a heronry that is doing well.",
  },
  "the-buried-wall": {
    "wall|stone|course|dressed stone":
      "Six feet of dressed, squared, laid stone showing out of the bank, and it runs away into the earth in both directions. Nobody builds a wall like that underground. The ground came up over it, which means this was the surface once, and the wood you walked in to get here is standing on somebody's roof.",
  },
  "the-fern-pit": {
    "ferns|fern|bank|roots|depression":
      "Four feet high and unbroken across the whole floor of the depression, which means nothing has come through here recently in any direction. Lie down in that and you are simply gone. The north bank is climbable with roots for handholds the whole way.",
  },
  "the-low-mist": {
    "mist|fog":
      "It lies at about waist height and it is dead level, which mist does over still water and does not do over dry ground. There is no water here that you can see. Everything below your ribs is guesswork, including the ground.",
  },
  "the-still-air": {
    "air|wind|stillness|quiet":
      "Not a leaf and not a stem, and not the skin of the water in the hollows. The point is not that there is no wind — you can hear wind working the canopy somewhere close by, doing what wind does, to trees that are not these ones.",
  },
  "the-moss-floor": {
    "moss|pelt|floor":
      "A hand deep and continuous over the floor, the fallen wood, and the lower six feet of every trunk, so all the shapes under it are suggestions. Your feet make no sound whatsoever on it. Nothing else's do either.",
  },
  "the-burnt-stand": {
    "trees|char|charcoal|stumps|burnt|fire":
      "Standing dead in their own char, black and limbless and perfectly upright, which means the fire went through fast and hot and did not get time to bring anything down. It is the lightest place in the wood and the least alive, and the green coming up between them is all one age.",
  },
  "the-fox-earths": {
    "earths|holes|burrows|spoil|smell":
      "Dug through and through with fans of pale spoil below the holes, at every angle, over generations. The smell carries twenty paces and it is not old. Whatever else is wrong with this wood, the foxes are doing well out of it.",
  },
  "the-hunters-stand": {
    "platform|stand|boards|ladder|battens|oak":
      "Grey boards lashed into the fork twelve feet up, with a ladder of nailed battens going to it. Somebody built this to sit still and high for hours, which is either how you shoot deer or how you watch a boundary. The battens do not all look sound.",
  },
  "the-spring-head": {
    "spring|basin|water|stone":
      "The basin is cut square out of one piece and it is old work, older than anything else out here. Water comes up into it cold and clear and goes away north through the litter. Someone cut that stone because this water mattered to them, and cutting stone for a spring is halfway to worshipping it.",
  },
  "the-deer-fence": {
    "fence|posts|wire|line":
      "Split posts marching away east and west with the wire long gone to rust and lying in loops in the leaves. Wire means this is not the old park pale — somebody enclosed this ground again, much later, and gave that up too.",
  },
  "the-lime-kiln": {
    "kiln|pit|arch|brick|lime":
      "Brick-lined with a draw arch at the foot, still white inside in patches. A kiln like this eats fuel for weeks at a stretch and turns stone into lime for mortar and for fields. Somebody fed it and somebody else carted away what it made, and that is two trades and a road.",
  },
  "the-crow-roost": {
    "crows|birds|pines|droppings":
      "They stop when you arrive, all of them, and start again when they have decided about you, and the interval is not the same every time. The ground beneath is white and sour and nothing grows in it.",
  },
  "the-hornbeam-row": {
    "hornbeam|trees|row|line":
      "Fluted grey trunks, hard as iron — this is the wood you came for when you needed a thing that would not wear out: mill cogs, axle bearings, mallet heads. Planted in a line and left. The line does not deviate for anything, including ground it should have deviated for.",
  },
  "the-old-coppice": {
    "hazel|stools|stumps|poles|coppice":
      "Cut on a cycle for centuries and then abandoned mid-cycle, so every stool has thrown a dozen poles far too thick now for the hurdles and thatching-spars they were grown for. A coppice is a promise to come back in seven years. Somebody did not.",
  },
  "the-stone-pile": {
    "cairn|stones|stone|pile|moss":
      "Field stones, man-high, mossed on every face but the south. It is not a grave and not a wall and not a marker for anything you can find. It is where a great many stones were carried one at a time by people who wanted them out of a field, and that field is under wood now.",
  },
  "the-boundary-oak": {
    "oak|iron|plate|hinge|nail|bark|tree":
      "The iron is grown deep into the eastern face — a plate, or a hinge, or a nail driven for a reason nobody kept. A tree with iron in it and four people's room inside the trunk is a boundary oak: you walked the parish to it once a year and beat a boy against it so he would remember where the edge was.",
  },
  "the-fallen-giant": {
    "oak|root plate|roots|crater|tangle":
      "The root-plate stands on end taller than you are, with a crater of dark soil where it tore out. It took three others down with it and the whole tangle is going back to earth on its own schedule, which is slower than yours.",
  },
  "the-charcoal-flat": {
    "flat|circle|ground|charcoal|turf|heaps":
      "Black a foot deep and nothing has grown on it since. Around the edge the ground is heaped where the turf was cut away to cap the stack and never put back — that is the mark of the last burn, the one where whoever was working it did not tidy up after.",
  },
  "the-badger-ground": {
    "setts|sett|holes|spoil|paths":
      "Generations of holes, most collapsed and a few very much not, with paths between them worn to the width of a low heavy animal. A sett like this is centuries old. The badgers were here before the manor and they are here after it.",
  },
  "the-charcoal-hut": {
    "hut|shelter|poles|turf|roof":
      "Poles and turf, half sunk, built for one man to sleep in with one eye open while his stack burned — you cannot leave a burn unwatched or it goes to flame and you lose the week. The roof holds. Nothing dens here: it smells too strongly of old fire, and everything with a nose knows what that means.",
  },
  "the-drinking-pool": {
    "pool|water|mud|prints|tracks":
      "The mud is printed all over — deer in numbers, something with pads, and something bigger than both that came down alone and stood a while. The water is clear and cold and moving very slightly from somewhere underneath.",
  },
  "the-hollow-beeches": {
    "beeches|trees|shells|footprints|prints|ground":
      "Each one is a shell you could step inside if you wanted to be inside something. The bare pale ground between them takes a print well, and there are prints, and some of them are the right size.",
  },
  "the-same-tree": {
    "tree|beech|burl|branch|bark":
      "A grey beech with a burl on it the size of a head and one dead branch out to the left. You have not seen this tree before. You look at it for as long as it takes to be sure, and being sure does not arrive.",
  },
  "the-lightning-split": {
    "beech|tree|split|wound|ivy":
      "Top to bottom, with the two halves leaning apart and both still in leaf — a tree can live a long time after that if the strike goes down the outside. The wound between has gone black and hard and ivy has dressed it, so it happened well before anybody now alive.",
  },
  "the-pollard-row": {
    "pollards|trees|row|knuckles|growth":
      "Cut off at head height, repeatedly, over a long time, so each carries a fist of vertical growth off the same scarred knuckle. Head height and not ground height is the whole point: you pollard where stock graze, because a coppice stool at ankle height just gets eaten.",
  },
  "the-withy-hut": {
    "hut|withies|mud|door|walls":
      "Woven withies plastered with mud, one low door and no window, and dry inside to this day. It was built to cut and soak and bend osier in, which wants shelter and does not want light. Nothing has denned in it — too tight, too much of a smell of man about it, and far too easy to be cornered in.",
  },
  "the-first-clearing": {
    "clearing|grass|ground|trees|edge":
      "A bowshot across, ringed by trunks standing shoulder to shoulder as though they had agreed on the line. Grass rather than leaf-mould, which takes grazing. Nothing has grown back into it in a long time and something is keeping it that way.",
  },
  "the-listening-stand": {
    "pigeon|bird|quiet|trees|notes":
      "Two notes, over and over, and it does not stop or move when you do — which a wood-pigeon does. Everything else here has decided to be quiet. The trees are ordinary. The quiet is not, quite.",
  },
  "the-heart-of-it": {
    "wood|trees|light|floor|ground":
      "The trees are the same trees and the light is the same green and the floor is the same soft depth of years. Nothing about the place is different and the place is not the same, and you could not put the difference into a sentence if somebody made you.",
  },
  "the-bounds-house": {
    "shelf|shelves|rods|hazel|bundles|tallies|tally":
      "Bundles of hazel rods, tied in fives and stacked in their hundreds, each one notched down its length and labelled at the butt. Pull one out and it is a year: so many oaks standing, so many felled and by whose leave, so many trespasses and what was done about them. The hand is the same in the oldest bundle and the newest, which is not possible, and you put it back where you found it.",
    "table|stool|seat":
      "A plank table worn hollow in one place, and a three-legged stool polished on the near side only — somebody sits here, always from the same side, and has for a very long time. There is no dust on the seat.",
    "mark|stamp|crown|notches":
      "The same mark is everywhere once you see it: a crown over three notches, struck into the door frame, the table edge, the lid of the box. It is not decoration. It is a claim, made once, in iron, and never argued with since.",
    "clearing|coppice|line|trees":
      "The coppice stops in a line thirty feet from the walls, all the way round, and has been made to stop there — the stools are cut low and cut recently. Nothing gets to come at this building through cover.",
  },

  // ======================= THE ROAD ======================================
  "the-crooked-gibbet": {
    "gibbet|gallows|cage|irons|frame":
      "Iron bands on a wooden frame, shaped to a person and hinged at the side, hanging off an arm that leans further every year. This is not a gallows — hanging is quick and done somewhere else. A gibbet is for afterward: you go in it already dead, on the road, at the boundary, so that everybody using the road has to walk under the arithmetic.",
  },
  "the-roadside-graves": {
    "graves|grave|mounds|stones|burials":
      "Just outside the ditch, which is the tell: consecrated ground is inside a churchyard wall and these people did not get inside one. Suicides, strangers, and the unnamed went at the roadside, at a boundary, where a great many feet would pass.",
  },
  "the-wayside-shelter": {
    "shelter|hut|roof|bench|walls":
      "Three walls, a roof, and a bench, set at about a day's walk from the last one. Somebody built this out of charity or out of duty and it has outlasted both the charity and the traffic.",
  },
  "the-dry-well": {
    "well|shaft|stones|rope":
      "Lined, deep, and dry to the bottom, which a well of this depth does not go on its own. Something changed under this country and the water went with it, and a road with no water on it stops being a road.",
  },
  "the-flooded-quarry": {
    "quarry|water|faces|stone|workings":
      "The faces still carry the tool marks and the beds run true, and the whole floor of it is under green water now. This is where the road's stone came from, and probably the fortress's, which puts the two of them on the same account.",
  },
  "the-broken-axle": {
    "axle|cart|wheel|wreck|timber":
      "One axle and the ruin of a bed, tipped half off the metalling. Nobody stripped it for iron, which on this road is the strange part. Whatever happened here, it was not worth anybody's while to come back and pick over.",
  },
  "the-holloway": {
    "banks|bank|sides|road|hollow":
      "The banks are over your head on both sides, and nothing dug them: this is the road wearing itself down into the country, an inch a century, under feet and hooves and wheels. The depth of it is the age of it, and it is very deep.",
  },
  "the-old-boundary": {
    "boundary|stone|marker|bank|line":
      "A marked line that meant something to two parties who both had people to enforce it. Neither party exists. The line is still exactly where it was and the wood on the far side of it is still a different wood.",
  },
  "the-cutting": {
    "cutting|faces|rock|walls|road":
      "Somebody took a hill out of the way rather than take the road round it, by hand, with the tools of the time. That is a decision made by an authority with more people than it had uses for.",
  },
  "the-shallow-ford": {
    "ford|water|river|stones|crossing":
      "Stone-bottomed and graded, which is a made ford and not a lucky shallow. A ford is where a road and a river agree, and everything either side of it — the shelter, the graves, the gibbet — is arranged around this fifty feet of wet.",
  },

  // ======================= THE DENS ======================================
  "the-street-cross": {
    "cross|steps|stump|stone":
      "Three steps, dished in the middle by feet, and the stump of the shaft above them. A market cross is a licence: it says the crown permitted trade here on named days, and the dishing says the permission was used hard for a very long time.",
  },
  "the-smithy": {
    "forge|hearth|anvil|bellows|tools|slag":
      "The hearth is where you would expect and the anvil bed is still in the floor, a block of stone set deep so the blow does not travel. A village keeps one smith and cannot function without him. When the smith goes, the ploughs stop being mended and everything else follows within a generation.",
  },
  "the-reeves-house": {
    "house|walls|reeve|rooms":
      "Bigger than the rest and better built, but not by very much — the reeve was one of them, chosen or made to serve, standing between the village and whoever owned it. Doing that job well and doing it long were different things.",
  },
  "the-bare-chapel": {
    "chapel|altar|walls|font|windows":
      "Stripped to the stone. Not burned, not thrown down — stripped, carefully, by people who took the fittings somewhere they were still wanted. That is not desecration. That is a congregation leaving and taking their church with them.",
  },
  "the-mill": {
    "mill|stones|millstones|gear|wheel|machinery":
      "The stones are still in place and one of them is dressed and ready. Everybody in a place like this was obliged to grind here and pay for it, so a mill is not a convenience, it is a tax with a building around it.",
  },
  "the-mill-dam": {
    "dam|bank|water|leat|sluice":
      "An earth bank thrown across the valley with a leat cut off it — weeks of digging by everyone who was going to use it. It is still holding water, which is more than can be said for anything else here.",
  },
  "the-wheel-pit": {
    "wheel|pit|axle|timbers|shaft":
      "The pit is stone-lined and the wheel is gone but its axle bearings are still bedded in the walls, and you can see from their spacing how big it was. Big. This mill was built to serve more people than lived here.",
  },
  "the-fever-graves": {
    "graves|grave|pit|mounds|burials":
      "Not laid out in rows and not aligned to anything, which is the mark of graves dug faster than the digging could be organised. The chapel's own ground is a hundred paces away and has room. These people were not carried that far.",
  },
  "the-shallow-well": {
    "well|slab|stone|water|cover":
      "Shallow, which is the whole story: a village well close to the surface is a village well close to whatever is running through the soil, and this one is a hundred paces downhill from the fever graves.",
  },
  "the-warreners-lodge": {
    "lodge|building|walls|windows|tower":
      "Built solid, with sight lines, because the warrener's job was to keep rabbits in and everybody else out — the rabbits were the lord's, they were worth real money, and the people who wanted them lived two fields away and were hungry.",
  },
  "the-pillow-mounds": {
    "mounds|mound|banks|burrows|warren":
      "Long low earth mounds, built on purpose, so the rabbits had somewhere to dig — an imported animal that could not cope with the ground here, housed at expense, guarded by a man in a fortified lodge. That is the shape of who this country was for.",
  },
  "the-hearth-stones": {
    "hearths|hearth|stones|stone|floors":
      "Hearth slabs, and nothing else — the buildings around them were turf and timber and they have gone entirely, but a hearth is stone and a hearth stays. You can count the houses by counting the fires.",
  },
  "the-empty-toft": {
    "toft|plot|boundary|ground|croft":
      "A house plot with its boundary still legible and nothing standing in it. The toft is the ground the house sat on and it was somebody's whole inheritance. It has been empty long enough that the boundary is the only thing left to inherit.",
  },
  "the-marl-pit": {
    "pit|marl|water|face|edge":
      "Dug for marl, which is clay you spread on light soil to make it hold — brutal work, done by hand, to buy a few more years out of ground that was giving up. The pit filled with water when they stopped, and the ground it was dug for is under grass.",
  },

  // ==================== THE FORTRESS AND ITS GROUND ======================
  "the-mass-grave": {
    "grave|pit|bones|bodies|dead":
      "One cut, filled in one operation, with the bodies in it at every angle. That is not a massacre and it is not a battle — battles leave you weapons. It is a burial party working faster than they could be reverent, which means whatever killed these people was still killing when they were put in.",
  },
  "the-hanging-hill": {
    "gallows|hill|posts|tree|rope":
      "Sited high and beside the way, which is the point of it — a gallows is not for the person on it. It is for everyone who can see it from the road, every day, for as long as it stands.",
  },
  "the-burned-village": {
    "houses|ruins|burnt|timbers|ash|walls":
      "Burnt to the sills and left. Nobody has robbed the good stone out of it, which they always do, which means people did not want to come here afterward and then people stopped being here to want anything.",
  },
  "the-gatefall": {
    "gate|rubble|stone|arch|ruin":
      "The gate came down inward. That takes either a very great deal of effort from outside or somebody on the inside deciding it would be better down than standing.",
  },
  "the-wall-breach": {
    "breach|wall|gap|rubble|stone":
      "The wall is thrown outward here, in a spread, which is not how a wall falls when it is pushed on. Something went off inside it, or under it.",
  },
  "the-briar-field": {
    "briars|brambles|thorns|field":
      "It has taken the whole field and it is head-high. Briar wants ground that was worked and then abandoned — it is the second thing that happens to a field, after the nettles, and before the trees.",
  },
  "the-dry-moat": {
    "moat|ditch|bank|sides":
      "Cut down to rock and never held water — a dry moat is not a failure, it is a design: you are not trying to drown anybody, you are trying to put twenty feet of climb under them while people above throw things.",
  },
  "the-thorn-court": {
    "thorn|thorns|court|walls|scrub":
      "A courtyard given entirely over to thorn scrub. It grew up through the paving, which means the paving cracked first, which means nobody swept this for a very long time before nobody lived here.",
  },
  "the-weepers-crown": {
    "crown|weeper|figure|stone|carving":
      "Carved, worn, and still recognisably a face doing the one thing. The rest of the fortress is defensive work and storage and drainage; this is the only thing anybody built here that was purely to say something.",
  },
  "the-rotted-scaffold": {
    "scaffold|timbers|poles|lashings|boards":
      "Put up against the wall to repair it and never taken down, so somebody was still maintaining this place at the point where maintaining it stopped. Whatever ended the fortress arrived in the middle of a working week.",
  },
  "oubliette": {
    "pit|hole|shaft|floor|walls":
      "A bottle-shaped hole with the only opening at the top. The name is the design brief — there is no door, no ledge, no drain and nothing to reach. You are not being held here pending anything.",
  },
  "the-buried-chapel": {
    "chapel|altar|stone|walls|vault":
      "Under everything, and it was under everything before the collapse — chapels go at the bottom when what is above them is a garrison and what is below is where the family is. It is intact, which almost nothing down here is.",
  },
  "the-undermine": {
    "tunnel|mine|props|gallery|workings":
      "A gallery driven toward the wall footings and then fired, which is how you take a wall down without engines: you dig under it, prop the roof with timber, and burn the props. Somebody wanted in here badly enough to spend months underground.",
  },
  "smokehouse": {
    "hooks|hook|racks|hearth|smoke|walls":
      "The hooks are still in the beams in rows and the walls are black an inch deep. A smokehouse this size preserves for a garrison through a winter, which means somebody was planning for a siege long before there was one.",
  },
  "larder": {
    "shelves|shelf|jars|store|racks|floor":
      "Stone shelves and a stone floor and a north wall, which is a room designed around keeping things cold in a country with no ice. It is empty. It was emptied, rather than abandoned full.",
  },
  "kings-hoard": {
    "hoard|treasure|chests|gold|coin":
      "Whatever the word meant when somebody first used it about this room, it does not mean it now. A hoard is only a hoard while there is somebody to keep other people out of it.",
  },
  "sunken-throne": {
    "throne|seat|stone|water|dais":
      "Stone, plain, and set on a dais that is now under water. Nothing about it is decorated. Whoever sat here did not need the chair to make the argument.",
  },
  "the-sally-ditch": {
    "ditch|gate|passage|sally port|walls":
      "A covered ditch running out from a small gate — a sally port, for getting a raiding party outside the wall and into the flank of somebody besieging you. It is a door you only ever use when things are already bad.",
  },
  "the-wall-walk": {
    "wall|parapet|walk|merlons|stone":
      "The parapet is gone in stretches and sound in others and the walk itself is still level. You can see the whole approach from up here, which is what it was for, and there has been nothing on the approach for a very long time.",
  },
  "the-bone-midden": {
    "bones|bone|midden|heap|refuse":
      "A rubbish heap, and the bones in it are butchered — chopped, sawn, and split for marrow. This is kitchen waste. It is the most ordinary thing in the fortress and it tells you more about the people than the throne does.",
  },
  "the-rat-warren": {
    "holes|burrows|nests|warren|floor":
      "Worked through every soft surface in the room, generations deep. Rats do not build like this on nothing. Something has been feeding this population reliably and for a long time.",
  },
  "the-hyena-den": {
    "den|bones|bedding|hollow|floor":
      "The floor is bedded down and the bones are cracked lengthwise, which almost nothing else does — a hyena's jaw gets at marrow no other scavenger can reach. Everything here has been eaten twice.",
  },
};

// Everything below is prose keyed off the same tables and read by lookFeature.
// Kept as a plain lookup rather than a class so a bad key can never do worse
// than fail to match.

function normalise(arg: string): string {
  return arg
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(the|a|an|some|this|that|these|those|at|my|your)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Number does not matter. "look grave" and "look graves" are the same question
// and it would be absurd to answer one and not the other, so a word is compared
// on its stem — but only a plain trailing -s, only on words long enough that it
// cannot be the whole word, and never on an -ss ending (moss, glass, brass).
// This is the ONLY looseness in the matcher and it is deliberately this small.
function stem(w: string): string {
  return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}

// Otherwise deliberately strict. A feature answering the WRONG probe is worse
// than no feature at all — it would tell a player something is in the room that
// isn't. So a hit needs either the whole normalised phrase, or one of its whole
// words. Nothing here matches on a substring of a word: "treasure" must never
// find "tree", and "wheelbarrow" must never find "wheel".
function matches(aliases: string, arg: string): boolean {
  const a = normalise(arg);
  if (!a) return false;
  const words = a.split(" ").map(stem);
  for (const alias of aliases.split("|")) {
    if (a === alias) return true;
    if (alias.includes(" ")) {
      if (a.includes(alias)) return true;   // "the gate arch" hits "gate arch"
      continue;                              // but a multi-word alias never hits on one word
    }
    if (words.includes(stem(alias))) return true;  // "the old gibbet" hits "gibbet"
  }
  return false;
}

// The room first, then the band it stands in, then what is true anywhere.
// Returns null when nothing answers, which puts the caller back on its own
// honest refusal.
// ---------------------------------------------------------------------------
// THE FINGERPOSTS (rome, 2026-08-10: "we need to put cross road signs for the
// roads — the room before the road")
// ---------------------------------------------------------------------------
//
// The world has 512 rooms and four ways out of the fortress and no way at all
// to learn where any of them go except by walking them and dying somewhere.
// The map is knowledge-as-loot and should stay that way; a fingerpost is the
// other thing, and it is what a real country actually has. The institution that
// cut the milestones and set the toll stones put up arms at its junctions,
// because a road nobody can navigate does not collect tolls.
//
// So these go at the room BEFORE the road — the last square where the choice is
// still in front of you. They are TRUE. Everything else in this world lies to
// you a little (the crude map's per-copy error, the reflection, the recut
// eighth milestone), and the counterweight has to be somewhere: this is the
// one piece of infrastructure that says what it means. What they do not tell
// you is what is ON the road, which is the part that kills you.
//
// `post` is the line the room grows (describeRoom). `reads` is what the arms
// say when you look at it — direction first, in the order a fingerpost's arms
// would actually be read going round it.
export const SIGNPOSTS: Record<string, { post: string; reads: string[] }> = {
  // ---- THE CROSSING (mig 190). Two five-armed posts, one on each bank, and
  // they are the same post facing opposite ways. Everything the region asks of
  // a player is written on these: five ways, what each one costs, and the fact
  // that the cost is not the same at every hour. Nothing else in the world
  // tells you this much. The institution knew exactly what it had built here.
  "the-parting": {
    post: "The fingerpost has five arms and they are cut deeper than any lettering on the east road, because these had to be read wet, at distance, by somebody deciding.",
    reads: [
      "EAST — THE CAUSEWAY. Two carts wide, sound, and one mile. Read the post at the head before you set foot on it.",
      "NORTH — THE BRIDGE. Four piers and two arches. The span is out. High water makes no difference to it.",
      "NORTH — THE FORD. Nine channels over a mile of gravel. Low water only. Allow the day.",
      "NORTH — THE FERRY. Deep channel, one rope, one boat. If she is on this side.",
      "SOUTH — THE EYOTS. Never drowned. Never quick. Keep the withies on your right hand going over.",
    ],
  },
  "the-far-parting": {
    post: "The eastern twin, and the arms turn on a spindle so that a man could set them to the day. They have not been turned in a long time and they are set to a day that is over.",
    reads: [
      "WEST — THE CAUSEWAY. One mile of made road. UNDER AT HALF FLOOD. There is one refuge and it is at the middle.",
      "WEST — THE BRIDGE. Cross on the piers or not at all.",
      "NORTH-WEST — THE FORD. Gravel, and it moves. The withies are replaced. Trust the new ones.",
      "WEST — THE FERRY. Ring at the stage. Somebody will come.",
      "SOUTH — THE EYOTS. For those who know them. Others take the causeway and wait for the water.",
    ],
  },
  // ---- THE FOUR DOORS OUT OF THE FORTRESS ----
  "the-old-road": {
    post: "A fingerpost stands at the verge with two arms still on it, and the cut on both is deep enough to have outlived the paint.",
    reads: [
      "EAST — THE EAST ROAD. The milestones count up. Posting house at the fifth, and the high country past the eighth.",
      "WEST — THE FORTRESS. The gate, the hill, and what is under both.",
    ],
  },
  "the-drowned-orchard": {
    post: "A fingerpost leans out of the standing water at the orchard's edge, arms weathered pale but legible.",
    reads: [
      "WEST — THE WEST ROAD. Milestones down to the eaves of the wood, and the den ground south of that.",
      "EAST — THE FORTRESS. The Waystation, the toll-house, and the east road beyond it.",
    ],
  },
  "the-mass-grave": {
    post: "A post at the edge of the pits with one arm on it, pointing away east over unbroken ground. The other arm has been taken off and the hole is empty.",
    reads: [
      "EAST — THE DROVE. Stock road over the shoulder. No toll on it, and nothing on it either.",
      "(the second arm is gone, and by the wear on the socket it was taken rather than fell)",
    ],
  },
  "sally-port": {
    post: "Somebody has cut lettering into the stone of the postern arch itself, small and square, at about the height of a man crouching to go through it.",
    reads: [
      "EAST — the ditch runs to the beck. Mill, then the gill, then the head of the water.",
      "It is cut on the INSIDE of the arch, which means it was written for people leaving, and quietly.",
    ],
  },
  // ---- THE GREAT CROSSROADS. Four ways, three of them into whole regions.
  "the-gap-in-the-trees": {
    post: "A fingerpost stands square in the middle of the gap with four arms on it, and it is the most useful object on this road.",
    reads: [
      "WEST — THE WOOD. The eaves, and the rides past them. The wood is not marked further in.",
      "NORTH — THE DENS, by the hurdle gate. Roofs, and other people under them.",
      "SOUTH — THE WASTE. The den ground's poor end.",
      "EAST — THE ROAD, and the fortress at the end of it.",
    ],
  },
  // ---- WHERE THE EAST ROAD'S THREE ROUTES MEET ----
  "the-cattle-grid": {
    post: "A fingerpost stands beside the rotted gate, painted once, with the drove's arm noticeably older than the road's.",
    reads: [
      "NORTH — THE DROVE. Green way over the shoulder, back down to the burial ground.",
      "EAST — THE ROAD, and the climb.",
      "WEST — THE ROAD, and the fortress.",
    ],
  },
  "the-drowned-ford": {
    post: "A low post at the ford's edge, half its length under water, with one arm on it pointing downhill.",
    reads: [
      "SOUTH — THE BECK. The water's own valley: the mill, and the way down to the postern.",
      "The arm is set lower than a rider's eye and higher than the flood, which tells you what this water does.",
    ],
  },
  "the-scarp-foot": {
    post: "A fingerpost at the turn, iron-shod against the weather, with three arms and a fourth socket empty.",
    reads: [
      "EAST — THE CLIMB. Hairpins to the top of the scarp, and the moor above it.",
      "SOUTH — THE BECK HEAD. Stair down to the springs and the gill.",
      "WEST — THE ROAD, and everything you have already walked.",
    ],
  },
  // ---- THE WEST ROAD'S OWN LANDINGS ----
  "the-osier-landing": {
    post: "A stump of a post at the verge with the arm lying in the grass beside it, face up and still readable.",
    reads: [
      "WEST — THE WOOD, by the osier beds. Wet going, and the rides beyond.",
      "The arm is off its post, which means whichever way you turn it is the way it points.",
    ],
  },
  "the-waste-foot": {
    post: "A post at the roadside with an arm on it that has been re-cut by a different hand, more recently and much worse.",
    reads: [
      "NORTH — THE WASTE, and the dens on it.",
      "The original cut is still under the new one, and it said the same thing.",
    ],
  },
};

// The arms answer `look sign` (and every word a player would actually type for
// one) without duplicating a line of it — the table above is the single source
// and this folds it into the feature lookup at module load.
const SIGN_WORDS = "sign|signpost|post|fingerpost|arm|arms|marker|lettering|board";
for (const roomId in SIGNPOSTS) {
  const sign = SIGNPOSTS[roomId];
  const table = (ROOM_FEATURES[roomId] ??= {});
  table[SIGN_WORDS] = `${sign.post}\n${sign.reads.map((r) => `  ${r}`).join("\n")}`;
}

export function lookFeature(roomId: string, region: string, arg: string): string | null {
  const tables: (FeatureTable | undefined)[] = [
    ROOM_FEATURES[roomId],
    REGION_FEATURES[region],
    COMMON_FEATURES,
  ];
  for (const table of tables) {
    if (!table) continue;
    for (const aliases in table) if (matches(aliases, arg)) return table[aliases];
  }
  return null;
}

// ---------------------------------------------------------------------------
// PART TWO: THE WOOD GETS AN INSIDE
// ---------------------------------------------------------------------------
//
// MEASURED FIRST, and the numbers were indefensible:
//
//   region        rooms   own ambience   dark-touch   avg description
//     the dens       60      44 (73%)        12          296 chars
//     the road       68      31 (46%)        17          252
//     the fortress  110      27 (25%)        20          189
//     THE WOOD      170       0 ( 0%)         0          207
//
// 170 rooms — 42% of the world — running on a ten-line regional pool, which is
// one line per seventeen rooms, and giving the same generic blind line in all
// of them. The region you get lost in was the region with the least to say.
//
// THE FIX IS STRUCTURAL, NOT A PILE OF LINES. Writing 170 rooms' worth of
// ambience by hand would take a week and would still leave the wood flat,
// because flatness was never a shortage of text — it was that the wood had no
// INSIDE. One name, one voice, one undifferentiated green mass, while the
// fortress's 110 rooms carry five captions (the overworks, the open ground, the
// halls, the warrens, the deep) and every one of them feels like somewhere.
//
// So the wood is divided into SEVEN QUARTERS, each of which is a real place with
// a history you can read off its own rooms. They were derived from the existing
// room prose, not invented over the top of it — every one of these was already
// there and simply had no name:
//
//   THE DRY HEATH ....... 9  sand, flint, heather; the wood gives out westward
//   THE LOST HOLDING .... 35 a moated manor, its park, its fishponds, its dead
//   THE SUNKEN WOOD ..... 23 ground that fell in; a wood growing under a wood
//   THE CARR ............ 32 alder and standing water; the wet half
//   THE WORKED WOOD ..... 22 coppice, charcoal, timber — the part that was a job
//   THE OLD ENCLOSURE ... 23 fences, kilns, boundaries; somebody owned this
//   THE DEEP WOOD ....... 19 dense, unreadable wood; the approach to the maze
//   THE HEART ...........  7 the maze itself, and the only ground the woodward
//                            walks — moved to the far north-west by mig 184
//
// EACH QUARTER IS THREE THINGS AT ONCE, which is why this is worth doing rather
// than just writing more lines:
//   - a caption on the map, so the wood stops being one green smear
//   - an ambience pool, so a room with nothing of its own still sounds like
//     WHERE IT IS instead of like "the wood"
//   - a dark-touch, so walking the wood blind tells you which quarter you are
//     blind in
//
// NOTHING MECHANICAL CHANGES. Quarters are not regions: mapRegionOf still
// returns "wood", so the colour, the spawn tables, the gate tellings, the
// keeper's story and every rule keyed on region are untouched. A quarter is a
// name for ground, and that is all it is.

export const WOOD_QUARTERS: Record<string, string> = {};

const QUARTER_ROOMS: Record<string, string[]> = {
  heath: [
    "the-dry-heath", "the-pale-grass", "the-flint-scatter", "the-sand-cut", "the-heath-edge",
    "the-grey-scrub", "the-wind-gap", "the-stunted-oaks", "the-rabbit-warren",
  ],
  holding: [
    "the-fishponds", "the-dovecote", "the-park-pale", "the-fish-house", "the-kitchen-range",
    "the-north-marches", "the-wolf-pits", "the-far-birches", "the-stable-range", "the-edge-of-it",
    "the-keepers-approach", "the-long-glade", "the-chapel-shell", "the-well-court", "the-gate-arch",
    "the-west-ride", "the-moat-bank", "the-broken-ground", "the-gorse-brake", "the-thorn-waste",
    "the-boar-ground", "the-yew-walk", "the-orchard-gone-wild", "the-hall-floor", "the-icehouse",
    "the-holly-hedge", "the-broken-avenue", "the-sunken-lawn", "the-solar", "the-ash-heap",
    "the-hollow-yew", "the-stew-pond", "the-standing-water", "the-still-pool", "the-far-mire",
  ],
  sunken: [
    // The Wolf Earth (mig 180) — a hole under a root plate, west off the
    // Under-Eaves. The sunken wood is COVER, which is why an animal dens here.
    "the-wolf-earth",
    "the-old-course", "the-lower-ditch", "the-under-roots", "the-last-light", "the-buried-lane",
    "the-low-sump", "the-tree-fall", "the-clay-shelf", "the-flint-floor", "the-black-loam",
    "the-drip-line", "the-lost-stand", "the-sunken-wood", "the-buried-wall", "the-under-eaves",
    "the-fern-pit", "the-cold-seep", "the-old-ditch", "the-bottom-of-it", "the-green-dark",
    "the-white-roots", "the-earth-fall", "the-slip",
  ],
  carr: [
    "the-rush-bed", "the-frog-chorus", "the-sunk-fence", "the-brown-water", "the-leaning-alders",
    "the-quaking-ground", "the-eel-ditch", "the-silted-pond", "the-flooded-ride", "the-black-pool",
    "the-sedge-flat", "the-willow-break", "the-far-south-turning", "the-drowned-holly", "the-black-mud",
    "the-south-ride", "the-flood-meadow", "the-willow-margin", "the-osier-beds", "the-withy-hut",
    "the-heronry", "the-old-pond", "the-low-mist", "the-still-air", "the-moss-floor",
    "the-drowned-roots", "the-sodden-ground", "the-reed-break", "the-black-alders", "the-alder-carr",
    "the-mire-edge", "the-blind-corner",
  ],
  worked: [
    "the-holly-maze", "the-dry-gully", "the-open-canopy", "the-deer-lawn", "the-lichen-wood",
    "the-thin-birches", "the-old-burn", "the-ant-hills", "the-poachers-camp", "the-timber-stack",
    "the-charcoal-ring", "the-fallen-wall", "the-pine-dark", "the-windfall", "the-empty-ride",
    "the-bracken-sea", "the-far-north-turning", "the-last-oaks", "the-thin-soil", "the-north-ride",
    "the-bracken-edge", "the-outer-scrub",
  ],
  enclosure: [
    "the-mast-fall", "the-turning-leaves", "the-far-hollow", "the-south-turning", "the-burnt-stand",
    "the-fox-earths", "the-sunken-ditch", "the-grey-thicket", "the-birdless-acre", "the-hunters-stand",
    "the-spring-head", "the-deer-fence", "the-white-ground", "the-lime-kiln", "the-leaning-wood",
    "the-crooked-stand", "the-north-turning", "the-high-holly", "the-crow-roost", "the-hornbeam-row",
    "the-old-coppice", "the-wind-shorn-edge", "the-stone-pile",
  ],
  deepwood: [
    "the-close-ground",
    "the-ash-stand", "the-lightning-split", "the-pollard-row", "the-holly-brake", "the-birch-edge",
    "the-turning", "the-boundary-oak", "the-fallen-giant", "the-first-clearing",
    "the-deer-path", "the-eaves", "the-swallowing", "the-charcoal-flat",
    "the-badger-ground", "the-wet-hollow", "the-nettle-glade", "the-bramble-margin", "the-charcoal-hut",
    "the-drinking-pool",
  ],
  // THE HEART — the woodward's core, and its own quarter as of mig 184 (rome,
  // 2026-08-09: the woodward should not be near any gate, and the fix is to move
  // his rooms).
  //
  // These seven were the middle of the DEEPWOOD and are now the far north-west
  // corner of the world, hung off the Grey Scrub at the end of the heath. The
  // rooms did not change and neither did the cut maze inside them; what changed
  // is which door you reach them by. See the migration for the whole reasoning.
  //
  // Its own quarter for a plain mechanical reason as well as a true one: the map
  // captions the wood BY QUARTER and hangs each name at the top-left room the
  // quarter owns, so leaving these seven in `deepwood` after moving them would
  // have dragged "THE DEEP WOOD" out to the heath and left the nineteen rooms it
  // actually names with no caption at all.
  heart: [
    "the-close-dark", "the-same-tree", "the-turned-ground", "the-listening-stand",
    "the-heart-of-it", "the-hollow-beeches", "the-bounds-house",
  ],
};
for (const quarter in QUARTER_ROOMS) for (const id of QUARTER_ROOMS[quarter]) WOOD_QUARTERS[id] = quarter;

// THE EAST ROAD IS CAPTIONED THE SAME WAY, AND HAD TO BE (mig 187). Its 102
// rooms are region 'road' — deliberately, because one road through the fortress
// is one band, and every rule keyed on it (weather, forage, migration, the
// keeper's chalk) then reaches both halves for free. The cost is the map: the
// label for 'road' reads THE WEST ROAD, and without this the east would be
// captioned as the west, seventy squares away from it.
//
// So: caption-only quarters, exactly as the wood does it. mapRegionOf still
// says "road", the colour is the road's colour, and nothing in the sim can tell
// the difference. Four names, because the east road is four things.
const EAST_QUARTER_ROOMS: Record<string, string[]> = {
  eastroad: [
    "the-thorn-gap", "the-east-paving", "the-toll-stone", "the-hollow-way", "the-road-kiln",
    "the-fifth-milestone", "the-carters-rest", "the-broken-culvert", "the-elm-avenue",
    "the-fallen-avenue", "the-relay-house", "the-weighbridge", "the-cut-bank",
    "the-sixth-milestone", "the-drowned-ford", "the-fallen-elm", "the-verge-shrine",
    "the-long-rise", "the-chalk-cut", "the-seventh-milestone", "the-tollkeepers-ruin",
    "the-hawthorn-narrows", "the-drove-pound", "the-cattle-grid", "the-open-stretch",
    "the-saddle-gap", "the-eighth-milestone", "the-scarp-foot", "the-scarp-spring",
    "the-quarry-turn", "the-paving-end",
  ],
  drove: [
    "the-grave-verge", "the-sheep-creep", "the-first-fold", "the-drove-green",
    "the-hollow-oak", "the-oak-hollow", "the-drovers-cairn", "the-wether-slope",
    "the-broken-fold", "the-shepherds-bothy", "the-bothy-spring", "the-high-gorse",
    "the-thorn-drop", "the-burnt-brake", "the-marker-stone", "the-high-common",
    "the-lapwing-flat", "the-common-boundary", "the-wind-scoured-ridge", "the-hanging-fold",
    "the-hare-ground", "the-fallen-dyke", "the-drove-head", "the-grid-lane", "the-grid-drop",
  ],
  beck: [
    "the-postern-ditch", "the-drain-mouth", "the-postern-carr", "the-stepping-stones",
    "the-withy-beds", "the-beck-mouth", "the-trap-line", "the-mill-leat", "the-drowned-mill",
    "the-mill-loft", "the-millpond", "the-dam-walk", "the-tail-race", "the-osier-island",
    "the-flood-mead", "the-cattle-drink", "the-marl-hole", "the-hatchpool",
    "the-plank-crossing", "the-hanging-wood", "the-force", "the-fall-shelter",
    "the-scree-run", "the-otter-holt", "the-gill-foot", "the-gill-pot", "the-rowan-gill",
    "the-sunken-alders", "the-gill-narrows", "the-shepherds-ford", "the-spring-line",
    "the-beck-head", "the-beck-stair",
  ],
  rise: [
    "the-first-hairpin", "the-second-hairpin", "the-cutting-ledge", "the-third-hairpin",
    "the-rope-post", "the-shelter-stone", "the-scarp-top", "the-high-shelf",
    "the-peat-cuttings", "the-boundary-cairn", "the-watershed", "the-first-sight",
    "the-far-shore-stone",
  ],
};
export const EAST_QUARTERS: Record<string, string> = {};
for (const quarter in EAST_QUARTER_ROOMS) for (const id of EAST_QUARTER_ROOMS[quarter]) EAST_QUARTERS[id] = quarter;

/** Every caption-only quarter in the world, the wood's and the road's together.
 *  One table, one lookup — the map asks this and nothing else. */
/** THE CROSSING (mig 190). Five quarters, and unlike the wood's and the road's
 *  these are not flavour: each one is a WAY OVER, and the caption on the map is
 *  the single most useful piece of information in the region, because knowing
 *  which of the five you are standing on is the entire skill of the place. */
export const CROSSING_QUARTER_ROOMS: Record<string, string[]> = {
  nearshore: [
    "the-shore-descent", "the-strand-head", "the-wrack-line", "the-net-poles",
    "the-shore-road", "the-hard", "the-capstan-stone", "the-ferry-house",
    "the-rope-walk", "the-parting", "the-bridge-approach", "the-ford-road",
    "the-eyot-track", "the-tide-mark", "the-boat-noust", "the-shellfish-scars",
    "the-quay-stub", "the-toll-post", "the-reed-gate", "the-gravel-flats",
    "the-mussel-scaup",
  ],
  causeway: [
    "the-causeway-head", "the-first-crossing-stone", "the-weeded-milestone",
    "the-causeway-bend", "the-half-tide-post", "the-second-crossing-stone",
    "the-sunken-stretch", "the-drain-arch", "the-mid-causeway", "the-refuge",
    "the-far-milestone", "the-mussel-bank", "the-cutting-water", "the-weed-flat",
    "the-causeway-rise", "the-landing-arch", "the-lantern-stump", "the-oyster-scars",
    "the-wreck-ribs", "the-perch", "the-crab-pools", "the-sluice-stone",
    "the-bell-buoy", "the-half-drowned-cart", "the-causeway-cross",
  ],
  bridge: [
    "the-near-arch", "the-first-pier", "the-plank-span", "the-second-pier",
    "the-gap", "the-beam-walk", "the-third-pier", "the-pier-foot", "the-broken-arch",
    "the-rope-bridge", "the-fourth-pier", "the-far-arch", "the-tollhouse-shell",
    "the-starling", "the-scaffold-stub", "the-drowned-span",
  ],
  ford: [
    "the-ford-head", "the-first-shoal", "the-first-channel", "the-second-shoal",
    "the-tern-scrape", "the-second-channel", "the-long-bank", "the-stranded-hull",
    "the-third-channel", "the-mid-ford", "the-fourth-channel", "the-shell-bank",
    "the-midden", "the-fifth-channel", "the-withy-bank", "the-last-shoal",
    "the-ford-landing", "the-drowned-withies", "the-gull-stand", "the-eel-grass",
    "the-quicksand-flat", "the-net-stakes", "the-cockle-beds", "the-tide-race",
  ],
  ferry: [
    "the-ferry-steps", "the-rope-stage", "the-channel-brink", "the-rope-run",
    "the-green-water", "the-ferry-boat", "the-mid-channel", "the-under-rope",
    "the-far-rope-stage", "the-far-ferry-steps", "the-far-hard", "the-drowned-mooring",
    "the-eel-lines", "the-cold-spring", "the-boat-house", "the-signal-mast",
    "the-weed-raft", "the-ferryman-stone", "the-deep-mark", "the-slack",
    "the-far-noust", "the-warping-post", "the-oar-store",
  ],
  eyots: [
    "the-first-eyot", "the-otter-run", "the-brushwood-causey", "the-hurdle-eyot",
    "the-hurdle-store", "the-sunken-hurdles", "the-mud-causey", "the-chapel-eyot",
    "the-graves", "the-landing-stage", "the-chapel-channel", "the-long-causey",
    "the-causey-end", "the-plank-run", "the-reed-maze", "the-cut-reed",
    "the-reed-fork", "the-dead-end", "the-cutters-eyot", "the-hook-hut",
    "the-stake-line", "the-black-eyot", "the-sunken-forest", "the-tern-causey",
    "the-shell-eyot", "the-shell-scar", "the-salt-causey", "the-salt-marsh",
    "the-samphire-flat", "the-creek-crossing", "the-marsh-hard", "the-fowlers-hide",
    "the-decoy-pipe", "the-quaking-turf", "the-old-boat", "the-eel-hut",
    "the-heron-tree", "the-cockle-strand", "the-mud-shore", "the-gutway",
    "the-salting-edge", "the-creek-mouth", "the-marsh-strand", "the-hard-approach",
    "the-strand-track", "the-bothy-of-the-crossing", "the-eel-staithe",
    "the-wildfowler", "the-fowlers-track", "the-decoy-wood", "the-cockle-scars",
    "the-gull-flats", "the-saltings-gate", "the-samphire-turn", "the-marsh-road",
  ],
  farstrand: [
    "the-far-strand", "the-far-parting", "the-bridge-landing", "the-toll-cottage",
    "the-crossing-house", "the-well-yard", "the-strand-road", "the-boat-noust-east",
    "the-salt-pans", "the-pan-house", "the-salt-store", "the-shingle-rise",
    "the-thrift-bank", "the-fisher-huts", "the-net-loft", "the-shingle-stair",
    "the-drying-frames", "the-smoke-house", "the-limpet-rocks", "the-far-tide-mark",
    "the-keepers-garden", "the-cart-shed", "the-anchor-stone", "the-storm-line",
    "the-ford-corner", "the-cart-ruts", "the-drove-road", "the-shepherds-stone",
    "the-hard-standing", "the-wrack-bank", "the-shingle-spit", "the-bridge-strand",
    "the-ferry-strand", "the-ferry-lane", "the-passengers-rest", "the-toll-board",
    "the-capstan-round", "the-tar-shed", "the-boat-graves",
  ],
};
export const CROSSING_QUARTERS: Record<string, string> = {};
for (const q in CROSSING_QUARTER_ROOMS) for (const id of CROSSING_QUARTER_ROOMS[q]) CROSSING_QUARTERS[id] = q;

export const MAP_QUARTERS: Record<string, string> = { ...WOOD_QUARTERS, ...EAST_QUARTERS, ...CROSSING_QUARTERS };

// UNDER COVER (rome, 2026-08-08). The wood is outdoors end to end — all 171
// rooms — which is what lets rain, cold and the night dark reach it, and also
// meant that when it rained it rained EVERYWHERE equally. There was nowhere in
// the wood to get out of the weather, for a deer or for you.
//
// Rather than judge 171 rooms one at a time, the wood's own quarters answer it.
// Two of them are already written as closed canopy — the deepwood (the Close
// Dark, the Hollow Beeches, the Swallowing) and the sunken wood (the
// Under-Roots, the Under-Eaves, the Green Dark, and a Drip Line named for what
// canopy does to rain). Those are cover. The heath is open by definition, the
// carr is standing water, the worked coppice is thin by management, and the
// enclosure and the holding are parkland. About a third of the wood keeps the
// rain off, and it is the third that was already described that way.
// The heart joins them: it IS the closed canopy — the seven rooms the deepwood's
// cover lines were written about in the first place (mig 184 moved them out into
// their own quarter, and cover has to move with them or the rain starts falling
// through the thickest wood in the world).
const COVER_QUARTERS = new Set(["deepwood", "sunken", "heart"]);

/** Does this room have canopy enough to keep the rain off what stands under it? */
export function underCover(roomId: string): boolean {
  return COVER_QUARTERS.has(WOOD_QUARTERS[roomId] ?? "");
}

// The quarter's own voice. Read when a wood room has no pool of its own, which
// after this file is most of them — so this is what the wood mostly sounds like,
// and it is written to be somewhere rather than to be atmospheric.
export const QUARTER_AMBIENCE: Record<string, string[]> = {
  // ---- THE CROSSING'S SEVEN (mig 190). This is the region the quarter layer
  // was really for. The five middle quarters are not moods, they are five
  // genuinely different PLACES — made road, stone piers, open gravel, deep
  // channel, reed — and a player who cannot tell which one they are standing in
  // has lost the only skill the region asks for. So each quarter sounds like
  // its own physics: the causeway is a road with the sea under it, the bridge
  // is height and wind, the ford is width and birds, the ferry is depth and
  // very little else, and the eyots are close green walls and no horizon.
  nearshore: [
    "Shingle shifts under your own weight and goes on shifting for a second after you stop.",
    "The tide mark's cut lines catch the light on the way past and you read them without meaning to.",
    "Somebody's boot-print in the wet shingle fills from underneath and loses its shape.",
    "Up on the road the wind has a different sound than it does down on the stones — drier, and further off.",
    "A gull goes over the shore road at head height, sees you are not carrying anything, and keeps going.",
    "The five ways are all visible from somewhere along here, and each of them looks like the reasonable one from the right angle.",
    "Weed dries on the stones above the line, and lifts, and skitters a little way, and stops.",
  ],
  causeway: [
    "The made road runs on ahead of you, dead straight and dead level, and the sea is on both sides of it at the same height as your boots.",
    "Weed lies along the causeway all combed one way, flat, and it is the way you are going.",
    "Water is standing in the wheel-ruts. It was not standing in them behind you.",
    "The stone under you is sound and dressed and pinned, and that is the trouble: it is a perfectly good road, and it is a perfectly good road at the bottom of the water twice a day.",
    "A hundred yards out to the side, something breaks and rolls and goes under, unhurried.",
    "The milestones keep coming, at their proper interval, counting a distance that has no business being counted out here.",
    "You can see both banks. Neither of them is close. That is the whole information the causeway gives you.",
  ],
  bridge: [
    "Wind comes up the channel and through the piers and makes a note out of the gap between them.",
    "A long way down, the water goes past the pier foot in a slow twist that does not look like it is going as fast as it is.",
    "The stonework beside your hand is dressed, jointed, and better made than anything you have touched in weeks.",
    "Gulls are arguing on the next pier along, at length, about the same thing they were arguing about a minute ago.",
    "Something falls off the arch behind you and takes an unreasonably long time to arrive at the water.",
    "The parapet ends. That is a fact you keep re-learning about this bridge.",
    "Out here the wind has nothing to be broken by, and it pushes at your shoulder steadily, all from one side.",
  ],
  ford: [
    "The water goes over the gravel with a sound like a crowd a long way off, from every direction at once.",
    "Something small and quick goes over the shoal ahead of you, stops, and pretends it did not.",
    "The gravel under your boot rolls, resettles, and takes your weight after a moment's argument about it.",
    "A withy stands out of the water off to one side, leaning, and there is another beyond it, and another, and they go on further than you can see.",
    "Birds lift off the flats a long way ahead, in a sheet, and put themselves down again a hundred yards on.",
    "The far bank has not got noticeably closer, which is a thing the ford does for most of its length.",
    "Water gets into the top of the boot at exactly the depth it always does, and there is nothing to be done about it.",
  ],
  ferry: [
    "The rope goes out over the water, dips to touch it in the middle, and comes up again on the far side.",
    "The water here does not show a bottom at any angle you try.",
    "Something under the surface goes past, pale and long, at a depth you would rather not have established.",
    "The green of the channel stops being green about four feet down and there is no word for what it does after that.",
    "The rope creaks, once, taking a load somewhere out in the middle where nothing is standing.",
    "Deep water makes almost no sound at all, which is not what you would expect from it, and is worse.",
    "A cold comes up off the channel that is different from the wind's cold and gets in under it.",
  ],
  eyots: [
    "The reed closes the sound of open water off entirely, and the quiet that replaces it is a different quiet.",
    "Something moves in the next cut over, at your pace, and stops when you stop.",
    "The light down here is green and comes from directly above and nowhere else.",
    "The brushwood underfoot gives, and holds, and you find you have been treading more carefully than you decided to.",
    "A stem bends against the run of the others, straightens, and is a stem again.",
    "Water shows through the reed on both sides at once, which means the path is exactly as wide as it looks.",
    "Somewhere out in the bed, a bird makes a noise like somebody blowing across the top of a very large bottle.",
    "You cannot see forty feet in any direction and you have not been able to for some time.",
  ],
  farstrand: [
    "Smoke smell off the old racks, faint, two hundred years cold and still in the stone.",
    "The shingle bank keeps the wind off entirely, and the sudden absence of it is loud.",
    "Nets on their pegs move together in a draught you cannot feel, and go still.",
    "Something has been at the garden again. The prints are the ones with hands.",
    "Salt has crusted white along the pan edges and it catches the light like frost that will not go.",
    "Up over the storm beach the mountain is doing whatever the mountain is doing today, and it is a great deal closer than it was.",
    "A door somewhere in the huts moves against its stone, and settles back against it.",
  ],
  heath: [
    "The wind comes across the open with nothing to break it and goes through everything you are wearing.",
    "Sand shifts under your boot and takes the print cleanly, and the print is the only one.",
    "A lark goes up somewhere out of the heather, climbing and singing, and does not come down where it went up.",
    "The horizon out here is much closer than it ought to be, and it does not get further away as you walk at it.",
    "Something small breaks cover ahead of you, runs thirty yards flat out, and stops dead in the open where nothing should stop.",
    "Heather scratches at your shins, dry as tinder, and the whole slope smells of hot sand and nothing else.",
    "The wood stands behind you in a hard line, and from out here it reads as a wall rather than as trees.",
    "A crow goes over high and straight, on a course, and does not look down at you at all.",
    "Bare flint shows through the turf in patches, worked and unworked together, and the worked ones catch the light differently.",
    "There is nothing between you and the weather out here, and the weather knows it.",
  ],
  holding: [
    "A stone comes off a wall somewhere behind you, unhurried, and beds itself in the grass.",
    "The ground under the turf here is not the shape ground makes. It is the shape rooms make.",
    "Rooks are working the tops of the old avenue, arguing about something, in numbers that suggest they have owned this for generations.",
    "Something has been at the fruit — the good ones, the reachable ones — and left the cores where it stood.",
    "Grass grows greener over the buried lines than it does anywhere either side of them, and the lines are perfectly straight.",
    "The wind comes across the moat and arrives smelling of standing water and cold stone.",
    "A door frame stands in a wall with no wall on either side of it, and it is still square.",
    "Somewhere in the ruin, water is getting in and going through, steadily, doing the last of the work.",
    "Ivy has the walls entirely now, and it is the only reason some of them are still up.",
    "You put a boot through a flagstone into a void underneath, and get your weight back before it decides anything.",
    "There is fruit on the ground under the old rows, small and hard, going over on its own schedule, for nobody.",
    "The wood has come in over the garden and is most of the way through the argument.",
  ],
  sunken: [
    "Water comes off the root-ceiling in a thread somewhere behind you and finds a pool it has been finding for a long time.",
    "Something moves in the roots overhead — not through them, in them — and stops when you look up.",
    "The air down here does not move and has not moved and smells of clay and old leaves and the underside of things.",
    "A clod comes down from the ceiling and lands wetly and nothing follows it.",
    "It is darker here than the hour has any business being, and the hour is not something you can check.",
    "There is a smell of turned earth, strong and close, as though something has been digging very recently.",
    "The floor goes soft under one step and hard under the next, and both times it is not what you expected.",
    "Roots hang down to the floor in columns and you go through them the way you would go through a curtain, and they swing back closed.",
    "A long way overhead, wind is working the tops of trees you cannot see and will not reach.",
    "The quiet down here has a size to it. It is not the quiet of nothing being there.",
  ],
  carr: [
    "Water closes over where your boot came out, slowly, and then there is no mark that you passed.",
    "A heron goes up off a pool you had not noticed, all elbows, and swears at you the whole way out.",
    "Something heavy shifts its weight in the water somewhere off to your left and then commits to being still.",
    "Gas comes up out of the mud in a string of bubbles and breaks, and the smell arrives a moment after.",
    "The alders stand in their own reflections and both halves are the same colour, so the waterline is guesswork.",
    "Every step decides for itself how far down it is going, and one in ten of them lies to you.",
    "The frogs stop. All of them, at once, and then start again in ones and twos from furthest away inward.",
    "Reeds rattle drily against each other in a wind you cannot feel at ground level.",
    "Something has been across the flat ahead of you in a straight line, recently, with a great deal more confidence than you have.",
    "The water here is the colour of strong tea and it is exactly as deep everywhere, until it isn't.",
    "A fish, or something the size of one, turns over near the surface and is gone before the ring has finished spreading.",
  ],
  worked: [
    "A pigeon goes out of the canopy with a clatter and the wood is quieter afterward than it was before.",
    "Somewhere off through the trunks, something is working at wood — steady, unhurried, and not close enough to place.",
    "The ride runs away straight in both directions, grassed and empty, and nothing has used it today.",
    "Charcoal turns up in the litter wherever you scuff it, small and black and everywhere, an inch under the leaves.",
    "The stools have thrown poles far too thick for anything they were grown for, and they go on thickening.",
    "Bracken rolls away from you in a green sea and closes behind you at about waist height.",
    "A deer barks once, twice, from a distance, and the second one is further off than the first.",
    "The pines take the wind and hand it on and nothing at ground level moves at all.",
    "Dead standing birch, hundreds of them, holding each other up, and one of them lets go somewhere with a crack.",
    "Everything here was cut on a cycle, by people who intended to come back, and the cycle is a long way overdue.",
  ],
  enclosure: [
    "A post stands in the leaves with nothing either side of it, still upright, still doing its half of a job.",
    "Rusted wire lies in loops under the litter and one of the loops takes your boot and lets it go again.",
    "Crows lift off something out of sight and settle back to it once you have stopped being interesting.",
    "The leaf-mould gives underfoot without any sound at all, deep, and years of it.",
    "There is a line of trees through here that is too straight to be an accident and too old to be anybody's now.",
    "Beech mast lies inches deep and rustles at every step, loudly, and goes on rustling a moment after you stop.",
    "Somewhere ahead of you a stick breaks under weight, and the weight is not small, and nothing follows it.",
    "The holly closes the sky over this stretch and it is a good deal darker than the hour accounts for.",
    "Water is coming up out of the ground somewhere close, running clear and cold over stone somebody cut for it.",
    "Everything here was fenced, or enclosed, or bounded, by somebody who owned enough of the world to care which side you were on.",
  ],
  deepwood: [
    "The wood goes away from you in every direction to about the same distance, and stops being readable at exactly that range.",
    "Something calls, once, a long way off, and it is not a bird you can name.",
    "You have passed a tree like this one before. You are fairly sure you have passed this tree before.",
    "The floor is bare and brown and silent, and sound stops carrying about ten paces out.",
    "Leaves come down steadily through the whole of the light, one at a time, with no wind to account for any of it.",
    "There are prints in the soft ground here and some of them are the right size.",
    "The light is green and even and comes from no particular direction, so nothing casts a shadow and nothing has a side.",
    "A wood-pigeon works through its two notes somewhere close, over and over, and does not stop or move when you do.",
    "You can hear your own pulse, which means there is nothing else to hear, which is not the same as nothing being there.",
    "The trees stand closer together ahead than behind, and they have been doing that for a while now.",
    "Something has come through the nettles recently — a green wound of crushed stems, already lifting back upright.",
    "The way you came looks exactly like the way you did not come.",
  ],
  // THE HEART. The deepwood's pool is a wood that is hard to read; this one is a
  // wood that is being kept. Every line is somebody's work, or the absence of a
  // person who has just finished some — because that is the whole of the
  // woodward, and these seven rooms are the only place in the world he walks.
  heart: [
    "Every tree in reach has been looked at. You could not say how you know that, and you know it.",
    "A branch that should be across this path is not across it, and the cut end is pale and clean.",
    "Something has been walking here at a steady pace for a long time — the leaf-mould is pressed into a line, and the line goes both ways.",
    "The wood is quieter here than quiet, in the specific way of a room somebody has just left.",
    "There is no deadfall anywhere. Not a stick, not a limb, nothing rotting where it dropped. Somebody clears this.",
    "You have passed this tree. You have passed this exact tree, and the last time, you were going the other way.",
    "A count carries from somewhere off in the trees — low, even, unhurried — and stops before you can catch the number.",
    "The light does not change from one of these rooms to the next, which is how you know how far in you are.",
  ],
};

// Blind in the wood used to be one line, everywhere, for 170 rooms. Now the
// quarter answers by touch and sound and smell — never sight, since you
// genuinely cannot see. Read after DARK_TOUCH's own per-room entries.
export const QUARTER_DARK: Record<string, string> = {
  heath: "Open ground, and you can tell by the wind: it comes at you from one side without interruption, and there is nothing at arm's reach in any direction. Sand and heather underfoot, dry, and it gives back a little with each step.",
  holding: "Your hand finds worked stone at about hip height — a wall, or the stub of one, squared on the face and rounded at the edge. Grass over flags underfoot, and the flags are laid in courses you can follow with a boot.",
  sunken: "The air is close and unmoving and smells of clay. There is a ceiling here — you can feel it in how sound comes back — and when you reach up, what you find is roots, woven tight, and cold water beading on them.",
  carr: "Water to the ankle and no way to know how far the next step goes down. The air is thick and still and smells of the bottom of things, and something a long way off breaks the surface and settles again.",
  worked: "Bare needle or bare swept floor underfoot, no undergrowth to speak of, and the trunks come up in an order you can feel — spaced, regular, planted. Whatever was done here was done in rows.",
  enclosure: "Deep leaf-mould, soft and silent, and then something hard and straight under your hand at waist height that turns out to be a post. There is wire in the litter somewhere near it.",
  deepwood: "Trunks at about the same spacing in every direction and leaf-mould deep enough to swallow the sound of your own feet. You have no way at all of knowing which way you came in, and standing still does not improve it.",
  heart: "Leaf-mould so deep your feet make no sound at all, and no deadfall anywhere to bark your shins on — the floor has been cleared, and you can feel that it has. The trunks come to your hands at an even spacing in every direction. Somewhere off in it, something is keeping a slow count.",
};

// The standouts keep their own voice. These are rooms whose whole character is
// one specific thing happening, where the quarter's pool would be a downgrade —
// they go into ROOM_AMBIENCE proper (zone-data spreads them in), so they take
// priority over the quarter exactly the way a fortress signature room does.
// THE EAST ROAD'S SIGNATURE ROOMS (mig 187). Spread into ROOM_AMBIENCE beside
// the wood's. Room ambience is RARE and rich — one line every so often that
// could only belong to this square — so only the rooms with something worth
// saying twice get an entry, and the rest live on the road band's own table.
export const EAST_ROOM_AMBIENCE: Record<string, string[]> = {
  // ---- the paving
  "the-thorn-gap": ["The thorn closes a little further behind you, or seems to.", "Something has been through this gap recently enough to leave hair on the cut ends."],
  "the-toll-stone": ["Wind goes over the slot in the top of the stone and the stone hums one flat note.", "The schedule of charges is legible in this light, which somehow makes it worse."],
  "the-road-kiln": ["The old burn smell comes up out of the throat of the kiln, faint and sweetish.", "Something small goes over the lime plug and its feet make no sound at all."],
  "the-carters-rest": ["The hearth gives up one thread of cold ash to the draft.", "Rain that is not falling anywhere else drips off the slab roof, three beats, then stops."],
  "the-elm-avenue": ["The light comes through the canopy in coins and moves them around.", "Somewhere down the avenue a dead limb lets go and does not hit the ground for a while."],
  "the-relay-house": ["The lamp over the hatch gutters and steadies, and nobody has been near it.", "In the empty stalls, straw shifts as if something had just got up."],
  "the-weighbridge": ["The iron plate ticks as the sun leaves it, and the sound carries the length of the road.", "Water moves in the pit under the plate, unhurried."],
  "the-drowned-ford": ["The sheet of water over the paving takes the sky and puts it under your boots.", "Watercress stirs against the current, all one way, and then all the other."],
  "the-verge-shrine": ["The scatter on the shelf shifts, though the niche is out of the wind.", "Somebody's coin catches what light there is and lets it go again."],
  "the-wind-gap": ["The wind takes the saddle in one long unbroken pull and does not let it go.", "Grass on the shoulder lies flat, gets up, and lies flat again."],
  "the-eighth-milestone": ["The recut face reads clearly and means nothing, which is the whole of it.", "Wind works at the newer letters, patiently, the way it worked at the old ones."],
  "the-quarry-turn": ["Chippings shift somewhere back in the quarry, and settle.", "The dressed blocks on the skids have not weathered. They look put down this morning."],
  // ---- the drove
  "the-hollow-oak": ["The tree makes a sound in the wind that a tree that size should not be able to make.", "Old cut-marks on the rim of the split have healed into knuckles you could hang a hat on."],
  "the-drovers-cairn": ["A stone shifts somewhere in the heap and reseats itself.", "The wind comes across the cairn and takes a note out of the gaps in it."],
  "the-marker-stone": ["The lichen on the stone is the same age as the stone, near enough.", "The small cut cross at the base has been kept clear of growth by somebody, recently."],
  "the-lapwing-flat": ["Birds go up off the wet ground in a body, tumble, call, and settle.", "Standing water shivers between the rushes with no wind on it."],
  "the-wind-scoured-ridge": ["The turf here is cropped to a mat and the exposed stone is polished by weather alone.", "From up here the paved road is a dead straight scratch through a country that has no straight lines."],
  "the-hare-ground": ["A form in the grass is warm. Whatever was in it is not in it now.", "The stones underfoot are all one size, which is not how stones happen."],
  // ---- the beck
  "the-drain-mouth": ["The arch breathes out air that is warmer than the day and smells of the fortress.", "Something in the dark of the drain lets go of the stone and drops into water."],
  "the-withy-beds": ["Twenty-foot rods knock together overhead in a wind you cannot feel down here.", "A stool that went over years ago is still throwing new growth, straight up, out of its side."],
  "the-drowned-mill": ["The wheel takes a little of the water and gives it back and does not turn.", "Under the flooded floor the dressing on the millstones is perfectly legible."],
  "the-millpond": ["A fish rises somewhere out in the middle and the ring reaches the bank a long time later.", "The whole pond goes glassy at once, as though something below had stopped moving."],
  "the-dam-walk": ["The sluice is seized open and the noise of it fills everything, so nothing else can be heard.", "The turf on the dam crest is springy and hollow-sounding, the way ground over stone is."],
  "the-force": ["The fall drums on the pool and the sound comes back off both walls at once.", "Spray drifts through and settles on you without ever quite becoming rain."],
  "the-gill-pot": ["Something turns over slowly in the pot and does not come up.", "The ledge is dry and worn smooth, and the water below it takes the light and keeps it."],
  "the-gill-narrows": ["The flood-jam wedged overhead shifts a little and holds.", "The beck goes through the gap under pressure and comes out the far side white."],
  "the-spring-line": ["Water comes out of the hillside in a dozen places at once, all along the same line, all at the same rate.", "The moss on the wet rock is the deepest green anything on this road has been."],
  // ---- the rise
  "the-rope-post": ["The worn ring in the top of the post turns in the wind, slowly, with nothing on it.", "Wind comes up the face and over the lip and takes your breath as it passes."],
  "the-shelter-stone": ["Old bracken under the slab rustles and settles — somebody carried this up here.", "Out past the overhang the weather goes by sideways and none of it comes in."],
  "the-peat-cuttings": ["Black water in the trench takes the sky and gives back none of it.", "A stack of turfs shifts and reseats itself, still in its herringbone, still dry inside."],
  "the-boundary-cairn": ["Something has been left in the hollow of the top stone. It was not there a moment ago.", "The wind at this height has a note in it that the wind lower down does not."],
  "the-watershed": ["Two threads of water leave the same puddle and go opposite ways.", "There is nothing above you here but weather, and it is coming."],
  "the-first-sight": ["The water down there changes colour all at once as cloud crosses it.", "Whatever stands up out of the middle of the water does not move, and keeps not moving."],
  "the-far-shore-stone": ["The dressed face of the pillar is clear of lichen. Something keeps it that way.", "The bench is cold and the water is enormous and there is nothing to do but sit and look at it."],
};

// THE CROSSING'S SIGNATURE ROOMS (mig 190). Same rule as the east road's: a
// room earns its own pool by being a THING rather than a stretch, and the rest
// speak as their quarter. Roughly a third of the region, weighted toward the
// places a player has to make a decision in — the two fingerposts, the tide
// marks, the refuge, the rope stage, the reed maze, the quicksand — because
// those are the rooms somebody stands still in, and a room you stand still in
// is a room that gets a second line out of you.
export const CROSSING_ROOM_AMBIENCE: Record<string, string[]> = {
  // ---- the near shore
  "the-shore-descent": ["The water gets bigger every time the track turns, which is not how distance is supposed to work.", "Down at the bottom of the zigzags something catches the light off the water and is a roof, or a stone."],
  "the-parting": ["The five arms of the post move very slightly in the wind, all together, and settle.", "Somebody has stood in this spot long enough to wear the ground down in a ring around the post's foot.", "Whichever arm you look at last is the one that seems most reasonable."],
  "the-tide-mark": ["The cut lines run up the post past your head, and the highest one is well past it.", "Weed is dried onto the scale in a band, and the band is not where you would like it to be.", "The lantern bracket at the top is empty and has been swinging for two hundred years."],
  "the-ferry-house": ["The lamp over the hatch gutters and steadies, and nobody has been near it.", "The rope-drum turns a quarter turn on its own, takes up, and stops.", "Through the window the deep channel runs straight out to the far bank, and the far bank is a long way over."],
  "the-causeway-head": ["Weed hangs off the marked post in a band at the height of your chest, dried hard.", "The road runs out onto the bank and keeps going until distance takes it, and the going is good the whole way.", "The last dry stone is the last dry stone, and it is marked, and somebody marked it because they had to."],
  "the-rope-walk": ["The strip runs perfectly straight and perfectly level for further than anything here needs to be.", "Wind comes down the length of the walk in one unbroken pull, the way rope came down it."],
  "the-hard": ["Green below the line, white above it, and the line is the most legible thing on this shore.", "Keel-grooves run down the stone into the water and do not stop at the edge."],
  "the-boat-noust": ["The hollow is exactly the shape of what is missing from it.", "Stones line the sides, laid flat, still holding the shape somebody dug two centuries ago."],
  "the-quay-stub": ["The new rope on the ring bolt goes down into the water and does not slacken.", "Down through the green you can see the courses of the rest of the quay, square-cut, going out."],
  "the-net-poles": ["The last shreds of net move on the nearest stakes, all one way, and then all the other.", "Twenty poles stand in a curve out into the shallows and they have caught nothing for a very long time."],
  // ---- the causeway
  "the-half-tide-post": ["The post is weeded to a line and dry above it, and the line is not far below the top.", "Water is doing something at the foot of the post that it was not doing when you arrived."],
  "the-refuge": ["The stone box holds the sound of your own breathing and gives it back a beat late.", "It is dry in here. It is dry in here twice a day.", "Somebody has cut marks into the inside wall at the level of a sitting man's hand, and there are a great many of them."],
  "the-weeded-milestone": ["The number above the weed is cut by the same hand as every milestone on the east road.", "Weed dries on the stone to the waist and no higher, which tells you exactly one thing."],
  "the-drain-arch": ["Water goes through the arch under the road one way, unhurried, and it did not do that an hour ago.", "The arch was built to let the sea through the causeway rather than fight it, and it is still doing its job perfectly."],
  "the-bell-buoy": ["The bell goes once, out on the water, on nobody's schedule.", "It rings again, and the note is wet, and it comes from further off than it did."],
  "the-causeway-rise": ["The bank lifts out of the weed and becomes a road again, drained and cambered, and the relief of it is out of all proportion.", "Behind you the whole crossing lies flat and grey and looks like nothing at all."],
  "the-half-drowned-cart": ["The tyres and hoop-irons stand up out of the weed in the shape a cart used to be.", "Whatever was in it is two centuries into being somewhere else."],
  // ---- the bridge
  "the-near-arch": ["The arch is good work and it ends in mid-air forty feet out, in a clean broken edge.", "Under the arch the water is suddenly a very long way down."],
  "the-gap": ["There is nothing here. That is the entire content of this room and it goes on for a while.", "Wind comes up through the space where the span was and lifts the hair off your neck."],
  "the-pier-foot": ["Water works in and out of a hole in the stonework at a rate that is not the sea's.", "The pier goes up out of sight above you and down out of sight below, and both directions are stone."],
  "the-broken-arch": ["The stone here is dressed square at the exact point the bridge stops, and it is finished work.", "Somebody made the end of this neat. There was no reason to make the end of this neat."],
  "the-rope-bridge": ["The rope takes your weight and gives some of it back, and keeps giving it back for a while.", "A long way down, the channel goes past in a slow twist."],
  "the-far-arch": ["The bench in the parapet recess faces back the way you came, which is somebody's opinion about this crossing.", "From the seat the whole span of what is missing lies out in front of you at eye level."],
  "the-drowned-span": ["The fallen span lies under the water in one piece, still arched, still holding.", "Green light comes up off the stonework down there and moves."],
  // ---- the ford
  "the-ford-head": ["The withies go out into the water in a line and the line bends, twice, before it disappears.", "A mile of grey water over grey gravel, and the far side is a smudge, and there is no road."],
  "the-mid-ford": ["The rest-post stands with its crosspiece at chest height and the water goes past it both ways.", "Both shores are equally far away from this exact spot, which is a thing you can feel."],
  "the-third-channel": ["The rope across the channel sags between its posts and lifts as the water works at it.", "This is where the crossing's water actually goes, and it is going."],
  "the-quicksand-flat": ["The flat looks exactly like the flat does everywhere else on this bank.", "A patch of it a few yards off shivers, settles, and is ground again."],
  "the-tern-scrape": ["Two eggs the colour of the stones lie in a hollow lined with nothing at all.", "The birds are up and screaming and they do not stop and they are not going to."],
  "the-stranded-hull": ["The boat sits upright and whole on the gravel with its oars shipped, as neatly as if somebody had put it there.", "It could not have got up here at any height of water you would have survived."],
  "the-midden": ["Shell, ash, shell, ash, a bone, shell — the water has cut into the mound and you can read straight down it.", "Somebody ate here for generations and left nothing else anywhere."],
  "the-drowned-withies": ["The withies out past the safe line are bent right over by the current and streaming.", "Somebody planted those in good faith. The channel moved and they did not."],
  // ---- the ferry
  "the-ferry-steps": ["The rope through the iron ring is taut, and stays taut, and something is holding the other end.", "The steps go down the bank into the water and keep going after the water starts."],
  "the-rope-stage": ["Out here the channel shows its colour: not grey like the shallows. Green, and then not green.", "The block on the stage turns a little, takes up, and stops."],
  "the-channel-brink": ["The timber stops and the deep starts and there is no bottom at any angle you try.", "The rope goes out, dips to touch the surface halfway, and comes up again on the far side."],
  "the-mid-channel": ["The rope creaks under a load, out here, where nothing is standing.", "Both stages are the same distance away and both of them are a long way."],
  "the-under-rope": ["Everything is green and then not green and the surface is a ceiling.", "The rope runs away above you into water that stops being water-coloured."],
  "the-ferry-boat": ["The boat is over there. You can see it perfectly. It is on the wrong side.", "Water slaps the far stage's timbers, and the boat moves against them, and does not come."],
  "the-far-ferry-steps": ["Cut steps come up out of the water on this side, worn in the middle exactly like the ones opposite.", "The rope comes ashore here through a ring, and the ring has two centuries of wear in one direction."],
  "the-boat-house": ["The half-mended boat sits on its trestles with the tools laid out along the keel in order.", "Water moves in the slipway under the doors, in and out, in and out."],
  "the-signal-mast": ["The shapes are still in the locker at the foot of the mast: a black ball, a black cone, a red diamond gone pink.", "The halyard has rotted through and the blocks turn anyway when the wind gets into them."],
  "the-weed-raft": ["The mat of weed lies on the water thick enough to walk on in some places.", "There is no way to tell which places from up here, and there never was."],
  // ---- the eyots
  "the-reed-gate": ["The reed closes over the track and the sound of open water stops as if a door had shut.", "Green light, and stems twice a man's height on both sides, and the path gives underfoot."],
  "the-reed-maze": ["Every cut looks like the cut you came down.", "Something moves one wall over, at your pace, and the reed does not show where.", "Sound in here does not come from where the thing is, and you have started noticing that."],
  "the-cut-reed": ["Withy stands cut and stacked and drying, and the cut ends are white and clean.", "Somebody works this. Somebody worked this recently enough that the ends have not greyed."],
  "the-plank-run": ["The trestles go out into the reed and the planks stop, forty yards short of anywhere.", "It was somebody's amateur answer to the causey stopping, and it did not arrive either."],
  "the-quaking-turf": ["The whole floor of the marsh moves under your weight, in a slow wave, out to a considerable distance.", "It settles. Then something at the far edge of the wave keeps moving for a moment longer."],
  "the-chapel-eyot": ["Whatever this was, somebody carried the stone for it a long way over water.", "The graves are oriented the proper way, which out here took a decision and a compass."],
  "the-decoy-pipe": ["The rotted hoops of the decoy curve away under the willows, still the right shape for what they did.", "Ducks came down this on purpose, once, and something walked behind them to keep them going."],
  "the-marsh-hard": ["Laid stone under your boot for the first time in a very long while.", "Whatever you learned crossing the eyots, this is where you stop needing it."],
  "the-old-boat": ["The boat lies over on its side in the samphire with its bottom gone, a long way from any water that would float it.", "Somebody's own idea of the way through is still in it, on something that was paper."],
  // ---- the far strand
  "the-far-parting": ["The five arms turn on their spindle, a little, and are set to a day that is over.", "Somebody used to stand here and turn them every tide. The spindle is still greased.", "From here every one of the five ways is a thing you have now done, or a thing you have not."],
  "the-crossing-house": ["The lamp over the hatch burns steadily and there is no wind in this yard to trouble it.", "Stabling for beasts that have not been here in two hundred years, swept, and dry.", "The keeper shifts behind the hatch, and is still again."],
  "the-far-tide-mark": ["The lantern is still in its bracket: glass gone, frame whole, a stub of candle run down one side and set again.", "The scale up the post is the twin of the one on the other bank, cut to the same measure by the same hand."],
  "the-well-yard": ["The bucket comes up clean, which after a mile of salt is a thing worth standing still for.", "The windlass turns easily. Something has been keeping it turning easily."],
  "the-keepers-garden": ["The bean-frame is still standing and there is nothing on it.", "Something has been at the beds — the good rows, the reachable ones — and left the tops where it stood."],
  "the-pan-house": ["The iron pan sits on its cold flue, six feet across, warped through in one corner.", "Cut peat is stacked by the door, dry, ready, for a fire that is not going to be lit."],
  "the-smoke-house": ["The smell is still in the stone hard enough to taste.", "Tiers of rods run wall to wall, black with two centuries of it, and the ash on the floor has not been walked in."],
  "the-fisher-huts": ["Three doors stand open. The fourth has a stone against it on the outside.", "Upturned hulls for roofs, and the rain finds the same three places on each of them."],
  "the-shingle-stair": ["The mountain fills the sky from one side to the other and the track goes up into it and out of sight.", "There is a stone seat here facing it, and somebody put it here for exactly this, and you sit down.", "The road stops being the institution's at the top of these steps, and you can see where."],
  "the-storm-line": ["A whole tree lies bleached white along the crest of the bank, as neatly as if it had been placed.", "This is how high the water has been. It is a great deal higher than anything you crossed today."],
  "the-anchor-stone": ["The hole through the granite is worn smooth on the inside, all the way round, by rope.", "There is no granite in this country. It came by water, as ballast, and stayed."],
  "the-passengers-rest": ["The bench is worn into hollows in four places, and the four places are not evenly spaced.", "Through the slot window you can see the whole width of the channel and whether anything is on it."],
  "the-toll-board": ["The paint has gone except where it was thickest, which was the numbers.", "Somebody scratched a fifth line under the last one, freehand, and doubled it."],
  "the-boat-graves": ["Seven of them along the tideline, ribs up, in various stages of going back into the ground.", "The oldest is a stain in the shingle in the shape of a hull and nothing else at all."],
  "the-bothy-of-the-crossing": ["The hearth draws. Somebody laid this fire and did not light it, and left it laid.", "LEAVE IT DRY, LEAVE IT FUELLED, cut into the lintel by somebody who meant it."],
};

export const WOOD_ROOM_AMBIENCE: Record<string, string[]> = {
  // The one building on his ground. It is not haunted; it is IN USE, which is
  // worse — everything here is the sound of somebody keeping up with the work.
  "the-bounds-house": [
    "A rod slips out of a bundle on the shelf and rolls to the edge and stops. Nothing pushed it. The stack has been settling for a hundred years and has not finished.",
    "The shingles tick overhead as the sun crosses them, the way a roof does when somebody is still keeping it whole.",
    "There is a draught through the door frame, and it smells of the clearing outside: cut hazel, and iron.",
  ],
  "the-frog-chorus": [
    "The noise stops. Not fades — stops, all of it, on the same instant, and the silence it leaves is much louder than the noise was.",
    "It starts again behind you, one voice, then a dozen, then all of it, and none of it is in front of you.",
  ],
  "the-birdless-acre": [
    "Nothing in the litter. Nothing in the light shafts. Nothing overhead. It is a good wood and it is empty of everything a good wood has.",
    "You find yourself listening hard for anything at all, and getting it, and it is only ever your own boots.",
  ],
  "the-crow-roost": [
    "The birds stop when you move and start again when they have decided about you, and the interval is not the same twice.",
    "One of them comes down the trunk a few feet to see you better, sidelong, and does not bother to go back up.",
  ],
  "the-same-tree": [
    "A beech with a burl the size of a head and one dead branch out to the left. You have seen this. You know you have seen this.",
    "You mark the trunk with your thumbnail this time, so that next time there will be no argument about it.",
  ],
  "the-listening-stand": [
    "Two notes, and two notes, and two notes, from exactly where they were before.",
    "Everything else here has decided to be quiet, and it decided at some point you did not notice.",
  ],
  "the-heart-of-it": [
    "Nothing announces this place, and nothing about it is wrong, and it is not the same here.",
    "The green goes very slightly darker for a moment, all around, the way a room does when somebody passes a window.",
  ],
  "the-swallowing": [
    "The mass overhead shifts as a single thing in a wind you cannot feel, and settles, and none of it is tree-shaped.",
    "The light comes from no direction at all, so nothing has a shadow, so nothing here has a side that is facing you.",
  ],
  "the-hollow-beeches": [
    "There are footprints on the pale ground between the shells, and you go through them again, and some of them are still the right size.",
    "Something is standing inside one of these. You have thought this before and it has not been true before.",
  ],
  "the-mast-fall": [
    "Every step goes off like a handful of gravel on a drum, and the rustling carries on for a beat after you stop.",
    "Something crosses somewhere off through the beeches, at a walk, and you hear every single footfall of it.",
  ],
  "the-turning-leaves": [
    "A leaf comes down past your face. Then another, at the same unhurried rate, in air that is not moving.",
    "The stand around this one is full green and this one is going over, and the line between them is a few paces wide.",
  ],
  "the-still-air": [
    "Wind works the canopy somewhere close by, steadily, and not one leaf over your head answers it.",
    "The water in the hollows has a skin on it that has not been broken in a long time, including by rain.",
  ],
  "the-moss-floor": [
    "You take four deliberate steps and hear none of them.",
    "The shapes under the moss are only suggestions, and one of the suggestions is longer than the others.",
  ],
  "the-white-ground": [
    "The pale floor gives under your boot without any sound at all, and closes back over the print, slowly.",
    "It has come up the base of every trunk to about knee height, evenly, all round, as though it had been measured.",
  ],
  "the-last-light": [
    "The circle of grey on the floor moves a hand's breadth while you stand in it, which is the only clock down here.",
    "Something passes across the hole far overhead — briefly, edge-on — and the circle goes out and comes back.",
  ],
  "the-low-sump": [
    "The black water does not move. Something under it does, once, and the surface does not admit to it.",
    "You put a stone in and it goes down for longer than you expected and does not sound like it hit a bottom.",
  ],
  "the-clay-shelf": [
    "There is a fresh set of marks across the clay that were not there when you looked, and you have been here the whole time.",
    "The clay keeps everything. That includes yours, and yours is now part of the register.",
  ],
  "the-drip-line": [
    "A hundred threads of water come down and the sound of them covers absolutely everything else.",
    "You stop to listen past the water, and cannot, and that is the whole problem with this place.",
  ],
  "the-boundary-oak": [
    "The iron in the eastern face is cold under your hand and the bark has closed most of the way over it.",
    "Inside the hollow the air is dry and dead and smells of nothing, and there is room in there for four of you.",
  ],
  "the-first-clearing": [
    "Nothing steps out into the open. Everything else in this wood would.",
    "The grass is cropped short and even across the whole bowshot of it, and there is nothing standing on it doing the cropping.",
  ],
  "the-drinking-pool": [
    "The water moves very slightly from somewhere underneath, in a slow turn, and clears.",
    "There is a fresh print in the ring of mud, big, single, and pressed deep at the toe as though something stood a long time.",
  ],
  "the-eaves": [
    "Behind you the gap still shows the road, grey and open. It has not got any wider.",
    "The air here is a full ten degrees colder than the last step out, and it does not warm up as you stand in it.",
  ],
  "the-poachers-camp": [
    "The snare hangs rusted in the run, holding nothing, still set at exactly the right height.",
    "The fire-scrape is cold and old and the stone beside it is worn on the top, which takes a great many hours of sitting.",
  ],
  "the-heronry": [
    "Something has been at the nests again. There is fresh white bone in the litter, finger-sized, and a smell that carries.",
    "A dozen big untidy nests overhead and not one bird on any of them, and it is the right season to be on them.",
  ],
  "the-blind-corner": [
    "Three sides of trees and one way in, and you find that you are standing where you can watch the gap.",
    "Nothing comes through the gap. You keep watching it anyway, which is what the shape of this place does to you.",
  ],
  "the-reed-break": [
    "The reeds rattle drily all around you, at every height, and you cannot see three paces into them.",
    "Something moves through the stand somewhere to your right, parting it, and the rattling of that is a different rattling.",
  ],
  "the-fox-earths": [
    "The smell is sharp and close and recent, and it is coming out of the ground.",
    "Sand runs out of one of the holes in a small stream, all on its own, and stops.",
  ],
  "the-burnt-stand": [
    "The light in here is white and hard and comes straight down through nothing at all.",
    "A black limbless trunk lets go somewhere behind you and comes down through the green, and the sound is dry all the way.",
  ],
  "the-timber-stack": [
    "The crib has stood so long the bottom course is in the ground, and the top course still rings when you knock it.",
    "Somebody stacked this properly — squared, stripped, spaced for air — and then never came back for a winter's work.",
  ],
  "the-ant-hills": [
    "The heaps are moving on the surface, all of them, and if you stand still you can hear it.",
    "An ant highway crosses the litter in front of your boot, two inches wide, absolutely continuous, and going somewhere.",
  ],
  "the-hollow-yew": [
    "Inside is dry and dark and smells of nothing whatsoever, which nothing else in this wood manages.",
    "The trunk has a lean on it and a gap in it and neither has changed in five hundred years.",
  ],
  "the-hall-floor": [
    "Rain has got into the hearth in the middle of the paving and stands there, in the one place a fire should be.",
    "Rooks go up off the wall-stubs all at once, complaining, and come back down in the same order.",
  ],
  "the-icehouse": [
    "Cold comes out of the passage mouth steadily, the way it would out of a door left open on a winter room.",
    "You put a hand into the passage and take it out again, and the difference is not something old brick does.",
  ],
  "the-well-court": [
    "A stone goes off the lip and falls, and falls, and the sound that comes back is water.",
    "Grass has come up between every flag in the court and it has been doing so for a very long time.",
  ],
  "the-orchard-gone-wild": [
    "Fruit comes down through the branches somewhere along the row and lands in the deep grass.",
    "The rows are still readable if you stand at the end of one and sight down it, and then they are not.",
  ],
  "the-quaking-ground": [
    "The whole raft springs under your weight and the trees themselves move slightly, and settle.",
    "It holds. It is not clear how it holds, and thinking about it does not help.",
  ],
  "the-black-pool": [
    "The water gives back the canopy exactly and nothing of its own depth.",
    "The edge shelves away immediately. You can feel where it goes from ankle to nothing with one boot.",
  ],
  "the-silted-pond": [
    "The grey flat is printed all over, and the prints go in, and none of them come out.",
    "What is left of the open water is a crescent, and it does not move, and nothing is on it.",
  ],
  "the-windfall": [
    "The whole stand lies crossed over itself and every surface of it is slick.",
    "Something moves under the tangle, low down, and takes its time about getting out from under.",
  ],
  "the-pine-dark": [
    "No undergrowth, no birdsong, no light worth the name — just the rows, going away in every direction, all the same.",
    "Your feet make no sound on the needle, and the rows line up perfectly for a moment as you cross them, and then don't.",
  ],
  "the-deer-lawn": [
    "The browse line round the whole lawn is dead level at the height of a deer's reach, and it did not get that way this year.",
    "Nothing is standing on it. It is the best feeding for a mile and nothing is standing on it.",
  ],
  "the-lost-stand": [
    "The trees down here are the wrong species and the wrong age and they are not paying any attention to the wood above.",
    "The east bank goes up in steps, and it is very obviously steps, and nothing cut them.",
  ],
  "the-slip": [
    "The clay is scored all over with the marks of things that came down and did not go back up.",
    "You test the slope back the way you came, and it goes out from under, and you stop testing it.",
  ],
  "the-charcoal-hut": [
    "The turf roof holds, and the inside is dry, and there is old ash trodden into the floor of it.",
    "Nothing has denned here. In this wood that is worth noticing, and the reason is under your nose.",
  ],
};

// Per-room blind lines for the wood, spread into DARK_TOUCH. The quarter's own
// line covers the rest.
export const WOOD_DARK: Record<string, string> = {
  "the-hollow-yew": "Your hands find bark, and then a gap in it wide enough to turn round inside. In there the air is dry and still and smells of nothing at all, and nothing is in it with you.",
  "the-hall-floor": "Flags underfoot, laid true, and then a raised kerb of stone in the middle of the floor with cold wet ash inside it. Above you there is no roof and no stars either.",
  "the-well-court": "The wellhead's ring is at your hip before you know it is there, and past the ring is a shaft, open, going down a long way. Grass between flags all round it.",
  "the-gate-arch": "Paving under your boots, hard and made, running four paces and then stopping. Both jambs are within reach and there is nothing hung between them.",
  "the-icehouse": "You feel the passage before you find it — cold coming out of the bank in a steady breath at about chest height, far colder than the night is.",
  "the-last-light": "There is a circle of grey on the floor here about the size of a table, and it is the only thing you can see anywhere, and it does not light anything but itself.",
  "the-low-sump": "Water to the shin and then to the knee and then deeper than you are willing to find out, with no current in it at all.",
  "the-drip-line": "Water comes down out of the dark in a hundred separate threads and you cannot hear anything past it, including whether anything is there.",
  "the-under-roots": "You put a hand up and find a ceiling of woven root, tight as a mat, cold and damp, and it comes down to the floor in columns you have to feel your way between.",
  "the-mast-fall": "Shells and husks inches deep, and every shift of your weight sets off a rattle you could not muffle if your life depended on it. It may.",
  "the-moss-floor": "Everything your hands find is furred a hand deep and gives when you press it, and your own feet make no sound at all, which is worse.",
  "the-reed-break": "Dry stems close on all sides at every height, rattling where you touch them, and there is no direction that feels more open than another.",
  "the-alder-carr": "Standing water and roots up out of it like knuckles, and each step decides for itself how far down it is going. The air smells of the bottom of things.",
  "the-bracken-sea": "Fronds over your head in every direction and you are pushing with your arms rather than walking. The way closes behind you as you go and you cannot hear past your own noise.",
  "the-eaves": "One step the air is open and moving, the next it is close and cold and ten degrees down, and there is a trunk within reach of either hand.",
  "the-first-clearing": "The trunks stop. Grass underfoot, short and even, and open air on all sides of you, and you are standing in the middle of it where anything could see you if anything could see.",
  "the-boundary-oak": "Bark under your palms and then, on the eastern face, iron — cold, flat, and grown deep into the tree. Feeling round the trunk takes longer than you expect.",
  "the-charcoal-hut": "Turf and poles at knee height, and then a low doorway, and inside it is dry and smells so strongly of old fire that nothing else has ever wanted it.",
  "the-drinking-pool": "Trodden mud that takes your boot to the ankle, all round, and then clear cold water moving very slightly against your fingers.",
  "the-fox-earths": "Dry sand rising out of the wet, and holes in it at every angle that your boot keeps finding, and a smell so sharp and recent it makes your eyes water.",
  "the-fern-pit": "Fronds to well above your head, unbroken, damp and cold against your face, and the floor of the depression flat under them. On one side the bank has roots to climb by.",
  "the-timber-stack": "Squared timber, stacked and spaced, standing higher than you can reach. The bottom course is soft as turf and the top course is not.",
};

// ---------------------------------------------------------------------------
// PART THREE: THE FIELD NOTE
// ---------------------------------------------------------------------------
//
// WHAT THE JOURNAL USED TO PAY OUT. A full account is the most expensive thing
// in the game to earn — study it, then kill it eight times if it is small and
// three if it is a boss (killsForAccount) — and the text you got for it was
// creatureNature(), which reads off the BEHAVIOUR FAMILY. 47 templates sharing
// 14 sentences. Fill the page on a scabby rat and the reward is the same
// paragraph a pale crawler's page gives you, word for word.
//
// So the top tier gets a line of its own per creature. Not a rewrite of the
// description — the description is what it LOOKS like, and it is already good —
// and not a restatement of the family, which the nature line does. This is the
// third thing, and it is the only one of the three that is knowledge:
//
//   WHERE IT CAME FROM, WHAT IT WANTS, AND WHAT THE WORLD MADE IT.
//
// It reads as a hunter's note because that is literally what it is — you wrote
// it, in your own book, after learning the animal properly. So it may say
// things the room prose never can: what these were before, what they eat, who
// bred them, what they are afraid of, and what it means that there are this
// many of them. It is where the world's history is allowed to be said plainly,
// once, to somebody who has paid for it.
//
// It NEVER states a number the stat block already gives. Numbers are the stat
// block's job and a page that says a thing twice is a page nobody reads twice.
export const MOB_LORE: Record<string, string> = {
  // ---- THE CROSSING (mig 191). The east road's dead were doing a JOB that had
  // outlasted its reason. These are doing a job that outlasted the WATER'S
  // permission — every one of them died at work, in a place that is only a
  // place for part of the day, and none of them was told when the part ended.
  "the-drowned-ferryman": "Look at the hands and nothing else. They are the only part of him above the water and they are the part that still works: white, swollen to twice a hand's proper size, and absolutely steady on wet hemp, which is a thing a living hand cannot do for long. He is not coming for you. He is coming along the rope, because coming along the rope is the entire content of him, and you are standing at the end that he arrives at. Everybody who ever used this ferry stood exactly where you are and waited for exactly this.",
  "the-pilot": "He is reading. That is the thing to understand: the brass plate in his hand is a diagram of one safe line across one mile of water, and he is checking the water against it, and the water stopped matching two hundred years ago and he has not stopped checking. A pilot's whole worth was knowing a channel better than the channel knew itself. He still does. The channel simply is not the channel any more, and nobody has been able to tell him.",
  "the-tide-warden": "The stick is a tally and both edges are cut: height on one, hour on the other, and the last dozen notches are crowded together and driven deep. That is a man cutting faster than he wants to. Read down the stick and you can watch him work out, over about two hours, that the water was coming up quicker than the road allowed for. He got to the end of the record. He did not get to the end of the causeway.",
  "the-refuge-man": "The hands are flat on the stone at shoulder height, and that is not a defensive posture and it is not a dying one — it is the way a man braces in a doorway when something is going past outside and he is waiting it out. He got to the refuge. Getting to the refuge was the correct decision and it was made in time. The refuge is a stone box with an opening at one end, and it is dry now, and it is dry twice a day, and that is the whole of what went wrong.",
  "the-bridge-mason": "He is dressing the joint at the broken edge — squaring off the exact stone where the bridge stops. It is good work. It is the best work anywhere in this country and it is being done on a face that leads nowhere, because a mason finishes an edge whether or not anything is going to be built onto it, and finishing the edge is where he was when the span went. He does not look up for you. He looks up for the mallet, and the mallet is what he comes at you with, and he has never in two centuries let go of it.",
  "the-scaffold-hand": "He is upside down at the hip in a rope harness, working the underside of the arch with both arms free, and that is not a body that fell — that is the correct working position for the job, held. The rope has been rotten past use for longer than anyone can say. It has not given. Look at it long enough and the question stops being how he is still up there and becomes what is actually taking the weight.",
  "the-drover": "There is nothing in front of him. He is driving nothing, at the pace of something, across a mile of water, and every so often he says something over his shoulder to a beast that is not there and has not been there since the fall. This is the gentlest thing in the region and it is the worst one to watch, because everything about him is competent and unhurried and correct, and he will keep the stock off the deep channel all the way over, and there is no stock.",
  "the-eel-cutter": "He works the line in order and he does not skip one: lift, empty, re-bait, set, pole on. The grigs are mended. The bait is fresh. Somewhere in this marsh there is fresh bait coming from somewhere, and that is a more unsettling fact than anything about the man himself. He has not looked up since before you were born. He will look up now, and the thing to know is that he will finish setting the trap in his hands first.",
  "the-fowler": "You did not see him and you were not going to. That is not a boast about him; it is what the hood is for. A man in sacking and reed on his front in wet turf is not a man-shaped thing to a bird, and birds are considerably better at this than you are. He was there when you came onto the turf, he was there while you crossed it, and the difference between those minutes and this one is that you have now ruined a morning's work and he is going to charge you for it.",
  "the-reed-walker": "It is one cut over, on your side, at your pace. Not following — ALONGSIDE, which is worse, because following can be outrun and alongside cannot. The reed is too thick to see through and sound in a reed bed does not come from where the thing is. It has been in the maze long enough to be the only thing in here that is not lost, and it has learned the one trick the maze rewards, which is to always be at the far end of the cut you are about to take.",
  "the-salt-widow": "The pan is cold. There is no fire in the flue and there has not been one since the fall, and she is feeding it, in a coat crusted white to the elbow, at the steady unhurried rate of somebody who knows exactly how long a boil takes. Salt was the only reason anybody lived on this shore. It took a fire going day and night and somebody to keep it going, and keeping it going is the whole of what is left of her.",
  "strand-thief": "He saw you before you saw him and he has already worked out how this goes. Everything he owns came off this beach — the coat, the knife, the boots that do not match. He does not consider it stealing and he will tell you why if you give him the room: the sea does not own things, the sea only puts them down, and a thing put down on a beach belongs to whoever is standing on that part of the beach. You are standing on part of the beach.",
  "the-quicksand": "There is no animal here. There is a patch of the flat that looks exactly like the rest of the flat and behaves like water that has not been told. It does not come to you, it has no shape and there is nothing in it to hit, and every one of those is a reason it is worse rather than better: the whole of the fight is that you are already in it to the knee before the ground finished being ground, and everything you do to get out is what a thing like this feeds on.",
  "conger": "It is an arm, and the arm goes back into the pier, and what you can see of it is the last third — the part that moves. It will not chase you anywhere. It does not have anywhere to chase you TO. Everything about the animal assumes that sooner or later the food comes past the hole, which over the life of a stone pier in a tidal channel is an entirely reasonable assumption, and the teeth all rake inward so that the assumption only has to pay off once.",
  "grey-seal": "On the gravel it is a joke: enormous, boneless, asleep, and shaped like something dropped. Every part of that is true and none of it survives the waterline. In the channel it has a dog's head, a dog's teeth and a dog's entire opinion about what is worth chasing, and it is faster than you are in the only medium available. The joke is not that it looks silly on land. The joke is that you will form your opinion of it on land.",
  "great-gull": "It is not frightened of you. Work outward from that, because everything else about the bird follows: the bill is a tool for opening things that do not want opening, the eye has no give in it whatever, and it has taken a rat off this parapet without landing to do it. There is no version of this where it becomes frightened of you, and there is no distance at which it stops considering you, and it is only waiting to find out which of those two facts is going to be relevant.",
  "oystercatcher": "The bird is not the threat and was never going to be. It is the ANNOUNCEMENT. Black and white and built out of two straight lines, running ahead of you along the tideline, stopping, running again — and at some distance it privately settles on, it goes up screaming and does not stop, and everything on a mile of open gravel is told where you are and which way you are facing. The ford is the safe crossing. This is the price of the safe crossing.",
  "bittern": "It is within ten feet of you. It has been within ten feet of you for a while. It is pointing straight up, striped precisely like the reed it is standing in, and swaying — and this is the part that undoes people — at the reed's rate, not its own. You will not find it by looking, because looking is the thing it is built to defeat. You will find it when it decides the distance is wrong, and it comes out of the stems at the height of your face.",
  "fen-viper": "It does not want this. Read the animal honestly and that is the only conclusion available: it is coiled on the one dry plank in a hundred yards of water, it has nowhere to go that is not water, and you are standing on the plank. Everything that happens next happens because two things that would both rather be elsewhere are on the only piece of dry wood in the marsh. What it leaves in you outlasts the encounter by a considerable margin.",
  "marsh-hound": "Watch the pattern, not the dog. It is quartering — working the ground in overlapping arcs, nose down, ears up, covering everything and covering it once. That is taught. Somebody taught it, with a whistle and a great deal of patience, and then that somebody stopped existing, and the dog kept the method and lost the point of it. It is still searching the marsh very thoroughly. It no longer has anything it is searching for, which means what it finds will do.",
  "wrack-crab": "There is never one. That is the entire natural history of the animal and it is the only part worth knowing. Move the weed and you find out how many there were, and the number is not the one you had in mind, and each of them is two hands across with a claw that shuts on a tendon and goes on shutting after the crab has stopped caring.",
  "ford-eel": "A yard of it in four inches of water, going upstream over gravel, and entirely untroubled by the shallowness — because it is not swimming, it is CROSSING, and it can cross wet grass if it has to. The ford is a mile of ankle-deep water that you are picking your way over with great care. It is a road, and it is being used as one, by something that does not need it to be deep.",

  // ---- THE EAST ROAD (mig 188). Every one of these is the same sentence said
  // ten ways: the work outlasted the reason for it. The clerk collects, the
  // warden walks, the dogs herd, the miller keeps grinding at nothing — and the
  // animals out there are the only things on the road with a current reason to
  // be doing what they are doing.
  "the-toll-clerk": "The satchel is the thing to look at. It has weight in it, it is worn on the same shoulder every day of a long career, and the strap has gone through the coat and into what is under the coat. He is not asking for a toll because he is owed one. He is asking because asking is the shape his day has, and the day has not ended, and you are standing in the part of it where somebody pays.",
  "the-long-warden": "Watch which way it is facing when it turns. It goes out along the road and it comes back down the road and it does not deviate by one room in either direction, which means the beat was set by somebody, in writing, and the somebody is two centuries dead and the writing is dust and the beat is still being walked. There is no gate at either end of it. There never was. It patrols the distance between two places, and the distance is the post.",
  "drove-dog": "It is not hunting and it is not guarding, and if you read it as either you will stand in the wrong place. It is HERDING. The wide arc, the turned shoulder, the head down, the refusal to close — that is an animal moving you somewhere, and it is very good at it, and it is doing it with the others whether or not you have noticed the others. The stock they were bred to move has been gone two hundred years. The training does not care.",
  "the-drove-master": "The grey one does not work the line. It sits above the line and reads it, and it comes down only when the shape of the thing is wrong. Everything the others do out there is a proposal; this is what accepts them. Its collar is the same as theirs and it is worn through in the same place, which tells you it was somebody's dog too, and better trained than any of them.",
  "otter": "Look at what it is not doing: it is not leaving. It has seen you, it has decided the distance is sufficient, and it has gone back to the fish. There is a slide worn into the bank at every holt along this water and every one of them ends at a flat stone with fish-heads on it. It has been eating well here for a long time, in a country where nothing else has.",
  "grey-heron": "It is a hinge with a spear on the end. Everything about it is arranged around one movement made once, at the correct moment, and the hours of stillness are not patience — they are the mechanism cocked. When it goes up it makes more noise than anything else on this water, which is why everything else on this water watches it and not you.",
  "the-miller": "He is facing his own millstones and he is still working at them, under the water, with both hands. The pond backed up into his floor because the tail-race silted and nobody dug it out, and the reason nobody dug it out is standing in it. Whatever the water did to him it did slowly enough that he has never had to admit anything happened. He will not leave the mill. He does not need to: the mill is where people come.",
  "gill-adder": "It has no interest in you at all and that is exactly the danger. It will not chase, it will not follow, it will not defend anything — it will simply be lying in the one warm place in the cleft, which is also the one place your hand goes when the ledge runs out. Killing it is easy and largely beside the point. What it puts in you does the work afterwards.",
  "feral-goat": "The horns have been used against something and the something is not down here. Nothing on this scarp browses but this, nothing hunts it but the drove, and it has solved the problem by living on ground the drove cannot follow it onto. It is watching you with the flat pupil of an animal that has already worked out you cannot climb, and it is not wrong.",
  "scarp-raven": "It comes back three times from three distances, and that is not curiosity — it is measurement. A raven that has learned what a thing on the ground turns into will wait for it to turn into that. There is a cairn further up with a hollow cut in the top stone, and there is always something in the hollow, and nobody up here has put it there.",
  // ---- the small things, and the reason there are so many -----------------
  rat: "There are more of them every year and there is a reason: the fortress was provisioned for a siege that never came, and the stores went to ruin with everything in them. These have been eating a garrison's winter for generations. They are not hungry. They are bored, and confident, and there is a difference in how a bored animal comes at you.",
  "fleet-rat": "The nervous strain. Everything that made the others bold went the other way in these — they have been caught too often and lived, and they run before they have finished deciding to. Follow one for long enough and it leads you to the nest it is running back to, which is not a reason to follow one.",
  "albino-rat": "Bred in the dark under the deep, generations of it, until the colour went out of the line entirely. They are the only rats down there and they are considerably larger than the ones above, and neither of those facts is a coincidence — nothing has been culling them and something has been feeding them.",
  "brood-rat": "She will not leave the patch she is on, and she does not need to: everything she requires is brought to her by the ones she has already produced. A colony with one of these in it is not a colony that got lucky. It is a colony that has a plan and is executing it.",

  // ---- the deer, and the wood's own ---------------------------------------
  "roe-deer": "The park pale in the wood was built to keep animals like this in, and they have been out of it for centuries — every roe in this country is descended from somebody's property. It hears you at a distance you would not credit, and the first two seconds after it moves are the only two it needs.",
  "white-roe": "Nobody at the hatch will say much about this one, which is itself worth writing down. A white deer in the old law was the king's alone and killing one was not poaching, it was theft from the crown. It stands in the open, and does not feed, and does not startle, and every other living thing in this wood has somewhere it would rather be.",
  "wild-boar": "They were extinct here, properly extinct, hunted out of the country generations back. Then somebody kept them in a park — the boar ground in the old holding is rooted to a depth that took years — and then nobody kept anything, and the wood has been theirs since. It does not display before it commits. The turn to face you IS the display.",
  "old-boar": "There is a broken shaft healed into the shoulder, which means somebody put it there and did not finish the job and did not come back. Boars that get old get old by being unrelieved about it. The tusks have grown past any use for rooting, so they are for the other thing now, and it does not stop when it is hurt.",

  // ---- the wolves and the dogs -------------------------------------------
  "grey-wolf": "They came back into this wood after the people left it and they are not the ones the old stories are about — those were killed out. These crossed the open country from somewhere, recently, and found a wood with deer in it and nobody in it, and they have been doing very well ever since. It watches your hands, not your face.",
  "dire-wolf": "The size is not the frightening part. The frightening part is that the pack is entirely used to it — it runs with them, hunts on their call, and takes its share in order. Something that big living inside a normal pack means the pack has been eating well enough to carry it, for years.",
  "masterless-dog": "The collar is a broad studded one, made and paid for, for a working animal somebody valued. It has been on this dog its whole adult life and nobody is coming for it. They den in the empty houses and they have not gone feral so much as gone unemployed, and they still watch you the way a dog watches a thing it has not decided about.",
  "lead-dog": "The scars all run one way, which means everything that ever went at it came from the same side and did not get a second attempt. It does not circle and it does not test you. It stands square in the road, which is a thing a dog only does when it has learned that standing square works.",
  "two-hound": "Out of the same breeding as the thing on the stair, and out of it a head short and without the bulk to make up the difference. The wardens bred hounds for that door on purpose and kept the line going for as long as there were wardens. This one holds the post anyway, on the same instinct, with fewer teeth.",
  "three-hound": "The wardens chained it to hold the stair and then stopped coming. Every version of this story you have ever heard ends with somebody getting past by being clever — a song, a cake, a trick. There is no trick. It has held that stair since the last warden died and it has never once been relieved.",

  // ---- the hyenas ---------------------------------------------------------
  "grave-hyena": "They did not walk here. Somebody kept them, in the fortress, for reasons nobody now living can explain — and there are always dead in the Door, so the population has never once had to work for a meal. The more it feeds the less it fears you, and it has been feeding a long time.",
  "dire-hyena": "The heavy-skulled strain, and the jaw on it cracks bone lengthwise, which almost nothing else can do — everything a dire hyena leaves has been eaten twice. It does not share and it does not startle. Where it feeds becomes its ground, and it decides where it feeds.",

  // ---- the people still out there -----------------------------------------
  footpad: "Not a soldier and not a bandit — somebody local who ran out of other options, in clothes deliberately chosen to be nothing in particular. The whole trade is the half-second where you are working out what is happening. Most of them do not want to hurt you and most of them are not good enough at this to have the choice.",
  cutthroat: "Further down the same road as the footpad and past the point of caring. The calm is the tell: someone unhurried at this has done it enough times that it has stopped being an event. He still means to take what you carry and leave. He just does not mind opening you up on the way.",
  wayman: "The coat fits him, which on this road is worth noticing — somebody else was measured for it, and that somebody is not wearing it now. He has the blade out and low before he speaks, and he does not open with a demand, because he has learned the demand goes better after.",
  cutpurse: "Whatever it was, it has hands and it knows what a purse is and it knows to be elsewhere immediately afterward. It does not want to kill you and will not stay to try. Everything it takes goes somewhere, and nobody has ever found where.",
  "charcoal-burner": "He is working a stack that has not been lit in a lifetime — laying the wood on, turning the turf, checking the draw, on the same rota his family kept for generations. Charcoal burning is a week awake beside a fire that will destroy the whole burn if you sleep. He did not stop when the work stopped being worth anything.",
  "road-carrier": "It walks the same route on the same schedule with the satchel buckled and both hands free, and the buckles are bright with use, which means they are still being worked. A carrier is the road's nervous system: news, letters, small goods, the same faces every month. Nobody has taken anything out of that satchel in a very long time and it has some distance yet to go.",
  "rag-and-bone": "It is hung with everything it has picked up — buckles, snapped blades, a mail skirt, a boot, a tin cup — all lashed on with wire and gut. There is no visible thing underneath the load. It does not want you at all. It wants what you are carrying, and it is entirely willing to wait for you to put it down.",

  // ---- the garrison that never stood down ---------------------------------
  skeleton: "The sword is still sharp, which does not happen on its own. Somebody was maintaining these long after there was anybody to maintain them for, and then that somebody stopped, and the habit was already all that was holding them up.",
  "bone-knight": "The mail is a garrison pattern and so is the drill. This is the difference between the rattling ones and this one: those are a habit standing up, and this one remembers the trade. It does not swing where you are. It swings where you are going.",
  warden: "The visor shows the room behind it, and the rounds it walks are the rounds in the standing orders — the same corners, the same intervals, still being kept to. Whatever a warden was, the man came out of the harness and the duty stayed in it.",
  "warden-surface": "The visor shows the room behind it, and the rounds it walks are the rounds in the standing orders — the same corners, the same intervals, still being kept to. Whatever a warden was, the man came out of the harness and the duty stayed in it.",
  "warden-captain": "The harness is a captain's and the maul has rusted into the gauntlets, so it could not put it down now if it wanted to. It walks the same rounds as the ones it led, forever, and it has never in all that time broken stride for anything, which includes everybody who tried to make it.",
  "last-watchman": "Dried to leather inside his own kit, with the boots resoled out of whatever the scaffold gave up — so he was still repairing himself long after there was any supply. The helm looks down a road nobody travels. Under all of it is a man who was never relieved, and that is the whole of the story here.",
  "forgotten-king": "The crown is the only part anybody kept. There is no name on anything down here — not on the slabs, not on the throne, not in what is left of the chapel — and that is not decay, that is somebody going through afterward and taking the names off. It has been waiting longer than the stones and it does not mind that you came.",
  "marrow-king": "Wound through with the bones of everyone who tried before you, which is a count you can make if you have the stomach for it, and it is not a small count. Put him down and he comes apart and then, without any hurry at all, draws the pieces back and sits.",
  "marrow-cantor": "A cantor led the singing, and the jaw is wired open mid-note by somebody who wanted it to keep doing that. It has never needed eyes. What it hears it sings toward — and the point of a cantor is that the choir answers, so what you are really doing when you make a noise here is calling a roll.",
  "twice-dead": "The old dead out of the barrows, and the barrows are older than the fortress by a long way. Skin gone to harness-leather and nothing left in it to spill, so a cut buys you nothing. It lies still a moment, gathering, and then stands up unhurried and comes on again, and it will do that once.",
  "thrice-dead": "Older even than the barrow-dead and worse at staying down. Cured meat and yellow bone, dry as the cairn it came out of. Twice is the barrow-wight. This one does it a third time, and the third fall is the only one that counts, and people have died learning that at the second.",

  // ---- the deep, and what the water made ----------------------------------
  "the-drowned": "The deep flooded while people were still in it. There is no other reading available: these are the wrong number to be strangers and they are all in the same kind of kit. It stands hip-deep where the water is stillest and it does not so much move as arrive.",
  "drowned-hulk": "The same thing the others are, kept under longer. It fills the flooded dark where it stands and there is a great deal more of it to pull against, and it is in no hurry — it does not need you dead so much as it needs you to stop.",
  "drowned-god": "Not a king. A thing the deep made after it was finished with a king, and the difference matters: everything else down there is somebody who drowned, and this is what the water put in their place. When it closes its hand the whole flooded dark leans in with it.",
  "pale-crawler": "Blind, boneless, and grown entirely out of the light. It does not hunt by sight and there is nothing down there to see by anyway, so being in the dark is not cover from it — being still is. You will not see it. You will feel it, once.",
  "pale-stalker": "The crawler's full growth, and the length of it is the shock: longer than a man and thinner, and it moves the whole of that length without any of it making a sound. You feel the dark move, once, and then a very great deal of weight.",
  "the-gaunt": "It came up from somewhere below the deep — not out of the flooded halls, from under them — and nothing about it matches anything else in this dungeon. Starved down to cords with the skin pulled tight over too many joints. It is hungry in the way of a thing that has never once been fed enough to know what full is.",
  "verdigris-thing": "It is not interested in your blood and it never has been. Where it touches, metal blooms green and flakes, and it will work patiently through everything you are wearing without once trying to kill you. Something down there has been eating the garrison's iron for centuries. This is the shape it takes to do it.",
  "root-thing": "A knot of root and wet earth that moves the way roots move — too slowly to catch at it, and further along than it was. What it has grown around is not visible and does not need to be, and the wood is full of things worth growing around.",

  // ---- the wood's own, and the things that follow -------------------------
  "the-woodward": "A woodward was a real office: the man who walked the wood, counted the timber, and dealt with whoever he found on it, with the full authority of whoever owned the ground. He is not searching. He looks up when you come into view and what is in his face is not surprise — it is the unhurried interest of somebody who has found you on ground he is responsible for.",
  "the-keeper-of-the-holding": "The facings are still on the coat and the ring of keys has never once been put down, which is the whole of it: a keeper's job is that the keys stay on him. It stands in the middle of the hall floor because that is where it stands, and it turns to you with the mild attention of somebody whose work you are interrupting.",
  "the-follower": "You are aware of it long before you see it, which is not it being subtle — it is you being reluctant. It moves when you move, which is why you never catch it, and it closes every single time you stop paying attention. Nobody who has described this to the keeper has described it the same way twice.",
  "something-ahead": "The step you have been hearing behind you all this time is in front of you now, keeping your pace, stopping when you stop. Nothing came past you. Go back through the last hour as carefully as you like: there is no version of it in which anything came past you.",
  "the-mire-walker": "It stands in water to the knee and it has been standing there, and how long is not a question with a comfortable answer. It does not lift its feet clear when it comes for you, it drags them, and the water goes on moving for a while after it has stopped.",
};

// ---------------------------------------------------------------------------
// PART FOUR: WHAT THE DOOR SAYS
// ---------------------------------------------------------------------------
//
// The threshold prints one live line under the keys, and an arc that is
// actually running is the strongest thing it can say — better than any score,
// because a stranger reading "something is roaring in the wood tonight" learns
// the world is running without them, which is the whole pitch.
//
// WRITTEN FOR SOMEBODY WHO HAS NEVER BEEN INSIDE. No room names, no verbs, no
// mechanics: a bell tolling under the keep means nothing to a person who has
// never seen the keep. Only arcs whose meaning survives with no context get a
// line here — the rest simply stay quiet, and the door says something else.
export const DOOR_ARC_LINES: Record<string, string> = {
  rut: "Something is roaring in the wood tonight.",
  quiet: "The wood has gone quiet. All of it, at once.",
  pack: "There are dogs out on the waste, and a lot of them.",
  fever: "Something is wrong with the air over the old village.",
  walk: "Whatever the maze keeps in its middle is walking it end to end.",
  rain: "It is raining on the dead ground tonight.",
  fog: "The fog is in, and nothing can see past its own hands.",
  cold: "It is cold enough out there to matter.",
  tide: "The water is rising in the deep.",
  crows: "The crows are up over the keep and will not settle.",
};

// How deep the door's reckoning goes. The modal shows a PAGE of ten and pages
// through the rest, so this is the total it will ever hand out — not what is
// on screen. Fifty rows is about 2KB of JSON, which is nothing against a page
// that is already edge-cached, and it means the boards keep working as a real
// standing rather than a top-five trophy shelf.
export const DOOR_BOARD_TOP = 50;
