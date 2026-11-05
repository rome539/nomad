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
  // Reached only where skyLook returns null — under a roof, or below one. Out
  // in the open the sky answers for itself, hour and weather both.
  // THE SKY, AND ONLY FROM UNDER AN OPEN ONE (rome, 2026-08-31). Every sky word
  // now routes through the probe in verbs.ts, which knows what is over the room:
  // a hill answers stone, a roof answers roof, and this line is reached only
  // outdoors, on a sky that is doing nothing worth reporting. The old version of
  // it answered a man two floors under a fortress with an account of the cloud.
  //
  // The sun, moon and stars are NOT here: skyLook always has an answer for those
  // three, quiet sky or not, because they are the hour and the hour never stops.
  "sky|clouds|cloud|weather|lid|overcast":
    "A wide sky with cloud drifting slowly across it, all one way, the same as it always is out here.",
  // THE SUN, THE MOON AND THE STARS ARE NOT ANSWERED HERE ANY MORE (rome,
  // 2026-08-31). This line predates the world having astronomy, and by the time
  // it was read at the Crossing House every clause of it was false: the moon
  // runs a six-night month that opens a door and pulls the spring tides, and
  // MOON_SKY's own dark-of-the-month line says the sky "has its stars and
  // nothing else in it". `look moon` one command later said the moon was doing
  // something on the other side of the lid — which is the exact opposite of
  // never having broken for it.
  //
  // All three are the HOUR, not the weather, so they belong to skyLook with the
  // moon (events.ts) and they answer the hour there. What stays here is the lid,
  // under `sky`, because the lid is the low country's conceit and the mountain
  // is written against it. This entry keeps only the words that are still true
  // of a roofed room, where skyLook returns null and something must answer.

  "dark|darkness|shadow|shadows":
    "It is not the absence of light. It is a thing with a depth to it, and it starts about as far from you as you can reach.",
  "blood":
    "There is old blood here. There is old blood in most places here. It stops being worth remarking on within a day of your arrival, which is its own kind of remark.",
  "bones|bone|skull|skulls":
    "Bone, weathered pale, mostly broken up small. Some of it is not animal. Nobody has tidied any of it, because there is nobody whose job that is.",
  "ash|cinders|embers":
    "Cold ash, wherever a fire was once kept — and a fire was once kept in most places here. It has worked into the ground and the walls and it never quite leaves, the way old blood does not.",
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
    "sky|cloud|clouds":
      "There is no sky down here — only the vault, and the stone that has held it up through everything that fell in from above. The weather is a rumour the surface keeps to itself.",
  },
  warrens: {
    "wall|walls|earth|dirt|sides":
      "Not built — dug. Packed earth with root and rubble through it, shored here and there with whatever came to hand, and shored by somebody in a hurry.",
    "props|timbers|shoring|beams":
      "Ratholed and soft and doing their job anyway. You can put a thumbnail into any of them. Nothing about that means they will go today.",
    "roots|root":
      "Roots run through the packed earth — down the walls and across the roof, cut through where the diggers met them and left the ends showing. They hang in the low places and brush you in the dark. The warrens were dug, not built, and the ground's own veins never stopped running through them.",
    "sky|cloud|clouds":
      "There is no sky in the warrens — only packed earth a hand's width over your head, and the roots threaded through it. Whatever the weather is doing up above is none of your concern down here.",
  },
  deep: {
    "water":
      "Black, and it does not move, and it is warmer than it should be. Things go into it and the surface closes over and that is the end of the record.",
    "wall|walls|stone|stonework|masonry":
      "Older work than anything above it, laid by people with better tools and more time, and it is holding back a great deal of water without complaint.",
    "dark|darkness|black|depth":
      "The dark down here is not the night dark that lifts with the morning — it has been dark so long it has stopped being an absence and become a thing with its own weight. Your light does not push it back so much as hold it off, and it closes again the moment you look away.",
    "sky|cloud|clouds":
      "There is no sky in the deep, and never was — only black water and the older stone, and neither of them ever saw light.",
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
  // ---- the mountain ------------------------------------------------------
  // WHAT IS TRUE ANYWHERE ON THE HILL, and only that — the same rule the
  // ambience pool already obeys. Altitude-specific truth (thin air, the country
  // laid out below, the grey lichen) belongs to the high quarter, not here.
  mountain: {
    "rock|stone|scree|boulder|face":
      "It is one rock, near enough, and everything on it has been worn off it or worn out of it. Where the slope is not bare it is only because the weather has not got round to that part yet.",
    "wind|air":
      "It does not stop up here, and it has shaped everything that stands in it. The only still air on the mountain is in the lee of something, and the something is the reason you would be in the lee of it.",
    "snow|drift":
      "There is snow on this mountain, and the line of it moves with the year — lower than you think, and never gone. Whether it is under your boots or further up, the cold that keeps it is the same cold.",
    "shadow":
      "The shadow is not yours and it is not any bird's. It crosses the slope ahead of you and there is nothing overhead to have cast it. It does not fall on you. It is not for you.",
    "stars|star":
      "Stars, and a great many more of them than the low country ever gets — up here the cloud is under you as often as it is over you, and on the nights it is under you the whole sky is out.",
    "sun":
      "The sun is real on this hill in a way it is not in the country below. It cuts the mountain in two: one side it lies on all day and one side it never does, and every living thing on this hill that can choose has chosen the side it keeps.",
    "sky|cloud|clouds":
      "The sky up here is not the low country's sky — it moves and it breaks, and the cloud line climbs and falls across the slope as the day goes. Where you stand decides whether the sun is on you or the cloud is, and you are nearer the sky than any ground below ever gets.",
    "water|burn|beck|stream":
      "The water on this hill never stands and never warms — peat-brown where it has come through the ground, clear over the gravel, and cold enough to ache your hands within a count of ten. It is always going somewhere lower, and you hear it before you see it. Nothing up here has ever been still, and the water least of all.",
    "summit|height|ridge|top|peak|slope":
      "It keeps going up, and the air thins with it, and somewhere above the cloud the ground stops being a place and becomes only the last of it. Nothing up there was made for you.",
    "corpse|body|dead|remains":
      "The dead up here are not buried and not hidden — the birds and the weather take them, and what is left rolls downhill until it stops. Nothing on this hill tidies anything; it only carries things lower, a little at a time.",
  },
  // ---- the crossing ------------------------------------------------------
  // WHAT IS TRUE ANYWHERE ON THE WATER, and only that. The causeway, the ford,
  // the bridge and the ferry are specific routes — their own rooms and posts
  // answer for them (SIGNPOSTS, WAYSTONES, SEA_INSTRUMENTS), not this table.
  crossing: {
    "water|tide|sea|flood|channel|channels":
      "It is always moving, and it is always the same water — in and out, up and down, and never doing nothing. The dry ground here is dry only for as long as the water allows it, which is never a promise and never for long.",
    "shingle|gravel|stones|stone":
      "Worn round and sorted by size, the way only water sorts anything. Every piece was carried here from somewhere else and dropped where the water lost the strength to carry it further.",
    "salt|spray|wind":
      "Salt is in everything — on your lips, in your kit, in the wind off the water. Nothing here is ever quite dry, and the stone and the posts outlast the wood because of it.",
    "weed|wrack|seaweed":
      "The tide's weed is on everything here, dried or still wet — in bands on the stone and the posts that you could read the last few tides by. It hangs where the water hung it and it dries where it dried, and nothing on this shore is ever entirely free of it.",
    "sky|light|grey|cloud":
      "The light changes over the whole mile at once — cloud, moving — and every part of the crossing goes a different grey together. The far bank is never where it was an hour ago.",
  },
};

// The specific. Room-keyed, checked first, and every entry here is a noun that
// the room's OWN description already put in front of the player.
export const ROOM_FEATURES: Record<string, FeatureTable> = {
  // ======================= THE NEW GROUND (2026-10-19) ===================
  // The Old Growth (mig 309).
  "the-ward-oak": {
    "mark|marks|cuts|cut|bark|oak|sign":
      "The same mark, a short upright and two strokes across it, cut into the bark at eye height. The oldest cuts have healed into raised grey scars; the newest are pale and still weeping a little sap. Somebody has kept this mark fresh for longer than the oak has been this wide, and the bark has never once been allowed to close over it.",
  },
  "the-hidden-spring": {
    "spring|basin|water|stone|beech|roots":
      "A basin cut square in a single stone and set under the roots so the spring rises straight into it. The cutting is old and careful. The water is cold enough to ache in your teeth, and clear to the bottom, and on the bottom lie a few small things somebody dropped in on purpose: a nail, a button, a ring of green copper.",
  },
  "the-burners-flat": {
    "ground|black|charcoal|clamps|circle|hearth":
      "Dig a heel in and it comes up black a hand deep: charcoal dust, years of it, packed hard. The burners built their clamps on the same ground for generations because the ground already knew how to burn. Nothing grows well on it still. The trees have closed over it, but they have not come down into it.",
  },
  "the-windthrow": {
    "roots|root plates|plates|trees|stand|trunks":
      "Every root plate stands on its edge facing the same way, each one taller than you, the soil still caught in them, stones locked in the roots. Whatever wind did this came from one direction, once, and laid the whole stand down in a single night. The trunks have gone soft. The plates have not.",
  },
  "the-moss-hall": {
    "moss|floor|oak|fallen oak|trunk|crowns":
      "The moss is a hand deep and so even that it might have been laid. Push a finger into it and it is wet underneath, and warm. Along the fallen oak the moss grows thicker, and in one place it is pressed flat in a long hollow, the shape of something that lies there, and lay there not long ago.",
  },
  // The Saltings (mig 310).
  "the-salt-workings": {
    "pans|pan|banks|salt|crust|floors":
      "Each pan is a square of clay floor banked with turf, a door's width of bank between one and the next. The sea came in at the top of the tide through a cut in the outer bank, and the sun did the rest. The white crust in the bottoms is salt still. It tastes of it.",
  },
  "the-dune-slack": {
    "water|pool|slack|turf|orchids|willow":
      "Rain falls on the dunes and sinks through the sand and comes up again here, in the low ground, sweet. It is the only water for a long way that does not taste of the sea. The turf round it is cropped short and printed with every kind of foot.",
  },
  // The lanes (mig 312).
  "the-dewpond": {
    "pond|water|clay|floor|dewpond":
      "There is no stream for miles. Somebody dug this bowl on the top of the hill, puddled clay into the floor of it and tamped it down with the hooves of the beasts that would drink from it, and let the mist and the rain fill it. It has held water ever since. Nobody remembers who.",
  },
  "the-cairn-shoulder": {
    "cairn|stones|stone|heap":
      "A heap of stones, each one carried up and put there by somebody passing, which is what you do at a cairn. Some are worn round by weather and furred with lichen. A few on the top are clean and sharp-edged, put there this year.",
  },
  "the-beck-ford": {
    "ford|beck|stones|water|mud|prints":
      "Flat stones, laid, not lying: somebody paved the bed of the beck here so the carts would not founder. The water runs over them clear and fast and cold. The mud at both edges is printed deep with hooves and pads and claws, all of it fresh.",
  },
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
      "Lined all the way down in dressed stone and dropping further than your eye follows. A well like this is dug before the house is built and it is the reason the house is where it is. The draw still works. There is water here for anything a wanderer needs water for.",
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
      "The passage is clear and the air inside is markedly colder than out, and after this long that is not the brick doing it. An icehouse is a hole you fill with winter to have cold in July. Somebody had staff, and ponds, and a plan for August. The cold in here has not given up yet: set food down in it and the cold will keep it, as young as the day it went in.",
  },
  "the-solar": {
    "carving|lintel|fireplace|ashlar|window":
      "Dressed ashlar and a carved lintel in the one room that was not communal — the private end, up three steps, with a window that faced the garden rather than the gate. This is where the family went when they were done being the household.",
  },
  "the-hollow-yew": {
    "yew|tree|hollow|inside":
      "Older than the planted walk by centuries — this one was here before anybody laid out an avenue. The inside is dry, and dark, and smells of nothing at all, which is the strangest thing about it: everything else in this wood smells of the wood. The hollow would take one thing and hide it well. One thing — it is a tree, not a shelf.",
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
      "They stop when you arrive, all of them, and start again when they have decided about you, and the interval is not the same every time. The ground beneath is white and sour and nothing grows in it. A loud enough voice under this tree would put every bird in it into the air at once, and the wood would know about it for a while afterward.",
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
      "Woven withies plastered with mud, one low door and no window, and dry inside to this day. It was built to cut and soak and bend osier in, which wants shelter and does not want light. Nothing has denned in it — too tight, too much of a smell of man about it, and far too easy to be cornered in. The walls break the wind and the roof holds. Whatever the weather is doing out there, it is not doing it in here.",
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
      "Iron bands on a wooden frame, shaped to a person and hinged at the side, hanging off an arm that leans further every year. This is not a gallows — hanging is quick and done somewhere else. A gibbet is for afterward: you go in it already dead, on the road, at the boundary, so that everybody using the road has to walk under the arithmetic. The cord above the irons has been cut through cleanly once before, and spliced, and it would cut again. Whatever he still has on him, he is done needing.",
  },
  "the-roadside-graves": {
    "graves|grave|mounds|stones|burials":
      "Just outside the ditch, which is the tell: consecrated ground is inside a churchyard wall and these people did not get inside one. Suicides, strangers, and the unnamed went at the roadside, at a boundary, where a great many feet would pass.",
  },
  "the-wayside-shelter": {
    "shelter|hut|roof|bench|walls":
      "Three walls, a roof, and a bench, set at about a day's walk from the last one. Somebody built this out of charity or out of duty and it has outlasted both the charity and the traffic. Out of the wind and under a roof that holds, a rest is a real rest, however the weather is behaving outside.",
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
      "In rows, but set close and shallow, each mound barely a body's length from the next: graves dug as fast as they were needed. The chapel's own ground is a hundred paces away and has room. These people were not carried that far.",
    // THE GRAVES ARE OLDER THAN THE VILLAGE (rome, 2026-11-05): the fever's
    // dead went back into ground that was already a burial ground, and under
    // it is the older thing the fever comes up out of. The same stone is under
    // every one of the four fever graves, and the room text is unchanged.
    "ground|earth|soil|bones|layers|under":
      "Where the rushes have pulled a mound open, the earth under the shallow grave is not clean. Older bones lie beneath it, packed in another way, with no rows at all, and older again under those. Under the deepest of them the soil stops, a spade's depth down, on flat stone, dressed and laid tight, older than anything else here, with cold air coming up through the joints.",
  },
  "the-shallow-well": {
    "well|slab|stone|water|cover":
      "Shallow, which is the whole story: a village well close to the surface is a village well close to whatever is running through the soil, and this one is a hundred paces downhill from the fever graves. Lift the cover and there is water a hand's depth down — enough to wash in, if you have something to wash off.",
  },
  "the-warreners-lodge": {
    "lodge|building|walls|windows|tower":
      "Built solid, with sight lines, because the warrener's job was to keep rabbits in and everybody else out — the rabbits were the lord's, they were worth real money, and the people who wanted them lived two fields away and were hungry.",
  },
  // THE HAMLET (rome, 2026-11-01): the den ground as a story place. Read together,
  // the close looks say how it emptied: the fever, the leaving in good order by
  // people who meant to come back, and the long while after when nobody did.
  "the-street": {
    "doors|door|crofts|walls":
      "Every door on the street is pinned from the outside, the peg dropped through the hasp the way you shut a byre when the stock is out. Nobody pins a door from outside on a house they are leaving for good. You pin it on a house you mean to come back to.",
  },
  "the-reeves-loft": {
    "coat|peg|pegs":
      "Five pegs, and four of them empty: the coats that hung there went on the backs of their owners. The small one was left. A family on the road does not leave a child's coat behind unless there is no child to put it on.",
  },
  "the-street-foot": {
    "fire|scorch|gable":
      "Small, and recent beside everything else here: a traveller's fire built against the gable for the shelter and kicked out in a hurry. Whoever lit it did not try the door of the house it was leaning on. The peg is still through the hasp.",
  },
  "the-burnt-croft": {
    "walls|ash|hearth|croft":
      "The black is on the inside faces of the walls and not the outside, so the fire started in the house and stayed in it. When every other empty plot on the street went for building stone, nobody took a stone from this one. Whatever happened here, nobody wanted to carry it home.",
  },
  "the-village-pound": {
    "pound|pen|gate|walls":
      "The top course is knocked out in one place on the far side, and the stones lie in the grass outside the wall, not in. Something was shut in here when the street was shut, and nobody came to pay for it.",
  },
  "the-north-house": {
    "hearth|floor|thatch":
      "Beside the hearth-stone, three small round dents in the earth floor where a cooking pot stood on its legs, and no pot. Of everything in this house, that was what went: the one thing that would cook a meal on the road.",
  },
  "the-croft-backs": {
    "gaps|walls|gardens|trees":
      "The gaps in the back walls are worn smooth on both sides at shoulder height, from a lifetime of people turning sideways through them. The paths beyond them, out to the field, have closed over completely. The apple trees go on fruiting for families who used those gaps every morning of their lives.",
  },
  "the-chapel-green": {
    "green|ground|yews":
      "The bare ground in the middle is beaten in a ring, not trodden across, the way grass goes where people stand round something and do not walk over it. Whatever was done here, everybody came to see it done.",
  },
  "the-dead-orchard": {
    "trees|trunks|orchard|windfalls":
      "Every dead trunk has a ring cut all the way round it a hand's width above the grass, through the bark and into the white wood, healed over now but plain. Nothing killed half this orchard. Somebody went down the rows with a blade and killed it tree by tree, and left the other half to bear.",
  },
  "the-squatters-row": {
    "dwellings|row|gable|roofs":
      "Six roofs raised by the old custom, each in a single night, all on the dry ground in plain sight of the street and its empty houses. Not one of the six households moved into a house on the street. They carried a stone gable here piece by piece instead.",
  },
  "the-hurdle-yard": {
    "hurdle|hurdles|trestle":
      "The half-made hurdle is woven to the same height all the way across, and the next rod lies on the trestle beside it, cut to length and gone grey. Whoever was making it put the rod down in the middle of a row, and walked away.",
  },
  "the-black-hut": {
    "bedding|bracken|hut":
      "The old bracken along the wall is flattened in the shape of one sleeper, and over it lies more, laid later and still a lighter brown. People have slept in here a long while after anyone lived here.",
  },
  "the-hurdle-gate": {
    "hurdle|gate|posts|bank|ditch":
      "The hurdle is dropped into its posts the right way round, woven face to the field, the way it was set every evening when the stock came in. The last person through closed it behind them. It has been closed ever since.",
  },
  "the-drift-lane": {
    "lane|banks|track":
      "The stones in the banks are polished dull at about knee height for the whole length of the lane, where fleeces rubbed past for generations. Nothing has rubbed them in a long time. The moss has started at the bottom and is working up.",
  },
  "the-lane-head": {
    "mounting-block|block|steps":
      "The top step of the block is worn into a dish on one side only, the side you mount from, by one foot going up into a stirrup a great many times. A place this size kept one horse that mattered. This is what is left of it.",
  },
  "the-cart-turn": {
    "cart|frame|shafts":
      "The cart was backed into the turn and left with its shafts pointing east down the lane, the way you leave a cart you will be putting the horse to in the morning. Nobody unloaded it first. Whatever was in it has gone to the same soft brown as the boards.",
  },
  "the-old-assart": {
    "stumps|field|trees|grass":
      "Round the edge of the field the stumps too big to grub out are still there, cut at knee height and burned black and hard. Everything the people here ever owned started with getting rid of those. The thorn coming in at the edges is taking the field back without any of the work.",
  },
  "the-cow-pasture": {
    "post|rubbing-post|hollow|grass":
      "The rubbing-post is worn to a waist on one side, polished at the height of a cow's neck by every beast the place ever had. Nothing has rubbed it since. There is lichen starting on the polish.",
  },
  "the-sunken-way": {
    "banks|roots|track|walls":
      "In the clay of the bank, at hand height, a run of shallow scoops where people steadied themselves on the steep part going up, the same holds used by every hand. The last of them dried with the shape of a palm still in them.",
  },
  "the-well-green": {
    "well|slab|windlass|rope|ring":
      "The slab was dragged onto the well from the street side; the scrape it left across the grass is still bare. Nobody caps a well they mean to draw from in the morning. Somebody covered it so nothing would fall in while they were gone.",
  },
  "the-thorn-hedge": {
    "hedge|trees|stems|wounds":
      "Every stem was cut most of the way through and laid over the same way, by one hand with one habit. At the east end the last stretch is cut and never laid: the stems were half-severed and left standing, and they have grown straight up out of their own wounds.",
  },
  "the-ridge-and-furrow": {
    "ridges|furrows|ground|ploughing":
      "The last furrow on the west side is shallower than the rest, barely turned, as if the plough was pulled by fewer than it was made for. It is the newest ploughing in the field. Nobody ploughed after it.",
  },
  "the-far-furlong": {
    "saplings|birch|ridges|leaf-litter":
      "The birches are all one age, the same height from end to end: they came in the first year nobody ploughed, and nothing since has got a hold under them. Every one of them is as old as the emptiness.",
  },
  "the-common-field": {
    "field|meadow|strips|grass":
      "Under the grass the strips still show as faint changes of colour, each a different green where a different family dunged it differently. Some go on to the edge of the wood. Others stop halfway, where whoever worked them stopped.",
  },
  "the-smithy-yard": {
    "trough|clinker|yard":
      "The trough is cracked straight through, the way a trough cracks when it is left full over a winter with nobody to break the ice or let the water out. It was full when the smith went. He did not expect to be away for the frosts.",
  },
  "the-headland-baulk": {
    "baulk|strip|grass":
      "The baulk is scored with the curves of a plough team swinging round, the same arc over and over, still deep enough to catch the low light. Toward the east end the curves get fewer, and then there are none.",
  },
  "the-reeves-yard": {
    "barn|roof|yard|cobbles":
      "The barn's roof came in by rot, not fire: the fallen beams are soft at the ends where they sat on the wall. The threshing floor under them was swept, the same as the floor in the house across the yard. The reeve's household left nothing undone that could be done before they went.",
  },
  "the-street-head": {
    "gate|wall|roofs":
      "The gate is shut and tied through the bar with a twist of withy, a knot meant to be undone from either side. It has rotted and held at the same time, and it is holding still.",
  },
  "the-north-croft": {
    "channel|byre|yard|wall":
      "The muck channel through the wall was sluiced out and left clean, the last job of the last morning. The poorest yard on the street was the one left in the best order.",
  },
  "the-mill-lane": {
    "stones|lane|surface":
      "The stones are rutted twice over: a deep pair of grooves from loaded carts going down to the mill for lifetimes, and over them one narrower pair, much fresher, of a handcart coming up. Somebody took something away from the mill once, after the carts had stopped.",
  },
  "the-waste-edge": {
    "leavings|rush|thorn|ground":
      "The leavings lie in layers, old under new: broken pot and bone down in the mud, a rag and a strap-end on top. People have been stopping here at the road's end for as long as the road has ended here, and leaving what the road had worn out.",
  },
  "the-turf-cutting": {
    "cuts|turf|water":
      "The cuts nearest the road are the narrowest, a single spade wide and a turf or two long. That is not cutting for a winter. That is somebody passing through taking enough for one night's fire.",
  },
  "the-broom-scrub": {
    "broom|paths|path|pods":
      "On the one path wide enough for a person the stems are snapped at waist height, healed, and snapped again, by people pushing through the same way. It runs one way only, and whoever walks it has always known where it goes.",
  },
  "the-marl-water": {
    "clay|water|ledge|pit":
      "Along the old waterline in the blue clay lie the bones of what fell in and could not climb the sheer sides out. Nothing has been taken out of here. Nobody came down to look.",
  },
  "the-drying-green": {
    "posts|lines|grass":
      "One line still has rope on it, rotted to a brown thread and tied off round the post in the knot you use for something you will be back to untie. The grass under it was the last ground here to be shaded by anything hung up to dry.",
  },
  "the-withy-rows": {
    "willow|stools|rows|rods":
      "Every stool was cut in the same season; the old cut faces are all the same grey under the new growth. The last harvest was taken in and carried off, and nobody came back the next winter to cut again.",
  },
  "the-kiln-track": {
    "causeway|stone|clinker|surface":
      "The clinker in the causeway is the same black glassy waste as the heap in the smithy yard. The smith's leavings went to building the road across the wet. Everything here was used for something else once it was done being what it was.",
  },
  "the-scrub-end": {
    "thorn|bramble|water":
      "At the edge the bramble is pushed back in one place, a trodden shelf where somebody stood and looked out over the scrub for a long time. There is nothing out there to look at. They came and looked anyway, more than once.",
  },
  "the-bark-heap": {
    "bark|heap|curls":
      "The top of the heap is still stacked in neat courses, curl laid into curl, ready for the cart. The tanners never sent for it. Bark that was worth more than the timber it came off is going to soil where it was stacked.",
  },
  "the-peelers-camp": {
    "shelters|pit|rack|trunk|tools":
      "The rack still carries the shapes of the tools, pale outlines in the weathered wood where blades hung all summer. The tools went. The camp was left standing for next year's peelers, as the custom was, and next year nobody came.",
  },
  "the-thorn-corner": {
    "path|thorn|blackthorn":
      "The path into the thorn is kept open to knee height and no higher; above that the blackthorn meets. Whatever keeps it open walks low, and walks it often.",
  },
  "the-gorse-common": {
    "gorse|tunnels|rise":
      "Under the gorse the soil is black with old charcoal, the rise burned every few years to keep it grazing. The last burn is the deepest black and the nearest the surface. Nobody burned it after.",
  },
  "the-warren-bank": {
    "bank|burrows|sand":
      "The burrow mouths low on the bank are lined with set stones, put there so the rabbits would dig where the warrener wanted them. Further up, past the stones, the burrows go wherever they like. Nobody has told them otherwise in a long time.",
  },
  "the-lodge-loft": {
    "window|windows|ladder|loft":
      "The sill of each slit window is worn in two smooth places a forearm apart, where elbows rested through long nights of watching. The west window is worn the deepest. That is the side the wood is on.",
  },
  "the-lodge-yard": {
    "nets|traps|slab|drain|yard":
      "The drain in the slab is stained dark by everything that was cleaned on it, and the stain has outlasted the nets. The last nets were hung up mended. Whoever mended them meant to set them again.",
  },
  "the-far-waste": {
    "thorn|tree|rush":
      "There is a rag tied in the lone thorn's lowest branch, gone the colour of the bark, and under it a ring of trodden ground. People came all this way out to one tree to tie something to it. Nobody has come to untie it.",
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
  // THE STRIPPED ARMORY. The room line gives you the wear and the bones; this is
  // the closer read, and it is still only EVIDENCE — what the hatch is for, and
  // what it costs to notice that nobody came down it the last time. It names no
  // rule, no hour and no bell. A wanderer who puts the racks, the bones and the
  // worn stone together has earned the conclusion; the game does not hand it over.
  "armory": {
    "hatch|door|ceiling|roof|opening|iron":
      "A muster hatch, and a well-built one — it drops on its own weight and it is opened from above, which is why there is no handle down here. The wear tells you how it was used: not the narrow polish of one man on an errand but a wide smooth fan, the mark of a rank of men landing and scattering, again and again, the way a garrison arms and moves when it is called. It has not been opened in a very long time. The dust on the underside of it is unbroken.",
    "bones|skeleton|skeletons|dead|remains":
      "They are not scattered and they are not fallen. They are lying in order, on their backs, under the hatch, with their feet toward the racks — men who lay down where they would be standing when it opened, so as to be first up. There is no violence on any of them. They waited longer than the waiting was any use.",
    "racks|rack|spears|arms|weapons|dust":
      "Empty, and emptied fast — the pegs are bent where things were pulled off them sideways rather than lifted. Whatever the last issue was, it went out of this room at a run. The bones behind you did not get any of it.",
  },
  // THE STORES (mig 355). The garrison's east wing, emptied in the same hurry
  // that stripped the armory at the end of it. Every close read here is the
  // evidence of that one morning, and none of it says what the morning was.
  "the-watch-passage": {
    "niche|niches|lamp|lamps|soot":
      "Each niche is the size of a lamp and no bigger, cut square into the stone and blackened inside. The soot above them is old and even, the mark of lamps that burned there every night for years. In the last one before the guardroom the soot stops halfway up, as if that lamp was taken down while it was still being lit.",
    "path|floor|round":
      "A shallow trough worn down the middle of the flags, no wider than one man, smooth as a step. It runs the length of the passage and turns at each end without a break. Nobody ever walked this two abreast.",
  },
  "the-roll-room": {
    "rolls|roll|pigeon-holes|holes|muster":
      "Fat rolls of felted paper, one to a hole, each tied with a tape gone the colour of the paper. The ones on the floor were pulled from the same few holes, and the holes beside them are full and untouched. Whoever came in here wanted particular names, found them, and did not stop to put the rest back.",
    "page|pages|names|ink":
      "The last pages of the dropped rolls are the only ones you can read: a column of names in a clerk's hand, and against every name the same short word, written fast, in a different ink. The word has run in the damp past reading. It is the same length every time.",
  },
  "the-quartermasters-room": {
    "ledger|binding|book|desk":
      "The binding is still on the desk, boards and spine and a stub of thread, and the pages were cut out of it close to the stitching with a sharp knife and one long stroke. It was not torn and it was not burned. Somebody took the accounts carefully, and took all of them.",
    "stool|chair":
      "Pushed in square under the desk, the way a careful man leaves his place at the end of the day. Of everything in this wing, it is the one thing put away.",
  },
  "the-long-store": {
    "bays|bay|boards|board|shelves":
      "The boards over the bays are painted in a careful hand: blankets, boots, cloaks, tallow, rope, cord, needles, salt. The paint is good. Under every board the bay is bare to the stone, swept bare, the way a store looks after an inventory and not after a raid.",
    "marks|drag|dust|grain":
      "The drag marks all run one way, out, and they are deep where the sacks were heavy. In the dust beside them there is the print of one boot, toe toward the door, and nothing coming back.",
  },
  "the-harness-room": {
    "stirrup|iron":
      "A plain iron stirrup with its leather strap snapped off short, as if it was pulled loose from a saddle in passing. It lies where it fell, in the doorway's line, and the dust has filled it level.",
    "pegs|saddle|saddles|hooks|bridles|tack":
      "Twenty saddle-trees and every one empty, and the bridle-hooks above them bare in rows. Wherever the horses went, they went saddled.",
  },
  "the-fletchery": {
    "outlines|wall|shafts|bundles|arrows":
      "Pale shapes on the dark stone, tall and narrow, close together, where bundles of shafts leaned against the wall for so long the stone around them darkened and they did not. There are forty of them. There is nothing in the room that fits one.",
    "benches|bench|shavings|down|feathers|floor":
      "Work-benches with the vices still on them, and a floor gone soft with shavings and grey down underfoot. Half-fletched shafts would have lain on these benches. There is not one, finished or not.",
  },
  "the-arming-passage": {
    "scrapes|scrape|walls|wall|marks":
      "A band of pale scoring along both walls at hip height, where scabbards and shield-rims dragged along the stone. Look close and every scrape has the same slope, rising a little toward the stores. They were all made by men coming out of the armoury, loaded, in a hurry.",
  },
  "the-pay-table": {
    "grille|table|box|coin-box|coin":
      "The grille is whole and the table is bolted down, but the coin-box on the paymaster's side has been levered open and the lid bent back. There is no coin in it and none on the floor. Whoever opened it was in no hurry about it, and was the last man in the room.",
    "stone|floor|dish":
      "On the soldier's side the stone is dished a hand deep in front of the grille, the mark of men standing in one place to be paid, one at a time, for a very long time. On the paymaster's side it is flat.",
  },
  "the-sergeants-room": {
    "cots|cot|blankets|beds":
      "Four cots with the blankets squared and tucked tight, the corners folded the regulation way. There is dust on them, even and undisturbed. Nobody has sat on one since the morning they were made.",
    "rack|kit":
      "A rack for four sets of kit, and the pegs empty. Four men armed here, made their beds first, and went out. The beds are still waiting for them.",
  },
  // ---- THE FORTRESS, CLOSER (rome, 2026-10-31), batch one: the halls, the
  // walls and the gates. The same law as the rest of this table: evidence about
  // the people, never a rule, an hour or an answer. Read together they agree
  // with the fortress's own story: a garrison that planned for a siege, walls
  // taken from under, work stopped mid-week, and somebody going through after
  // and taking the names off.
  "sewer": {
    "grate|drain|bars|iron":
      "The grate was not rusted open. The stubs of the bars are cut square, bright-edged once, where a saw went through them from the outside. Somebody came in this way on purpose, long ago, and the fortress never mended it.",
  },
  "stair": {
    "tallies|tally|marks|chalk|wall":
      "Hundreds of strokes in fives, in one hand the whole way. The strokes get shorter toward the end, as if the hand was tiring, or the chalk was. The last group has four.",
    "steps|treads|bowls|stairs":
      "Each tread is worn deepest on its downward side, where a foot lands carrying weight. More went down this stair loaded than ever came back up it.",
  },
  "weeper-hall": {
    "water|threads|walls|silver|channels":
      "The water runs in channels a finger deep in the stone, and nobody cut them. It comes in from the arch and follows the same lines down the walls that it has always followed, and over the years the stone gave way to it.",
  },
  "crypt-steps": {
    "treads|steps|stairs|centre|center|wear":
      "Look close and the wear is two hollows a shoulder-width apart, not one: bearers walking in step with a weight between them. Coming back up, the feet went anywhere.",
  },
  "scullery": {
    "pots|pot|copper|kitchen":
      "Every pot is holed from below, and every hole is the same small round punch. Somebody went along the racks and made sure none of these would ever hold water again. The kitchen was spoiled on purpose, so whoever came after could not use it.",
  },
  "barracks": {
    "bunks|bunk|shelves|shelf|sleepers|graves":
      "Every bunk is the length of a man and cut into the wall, and that was not an accident of the mason's: a garrison that slept in the wall could be laid to rest in the same place without moving anybody. Some of them never needed moving.",
  },
  "cells": {
    "cages|cage|doors|door|locks|bars|straw":
      "None of the doors was forced. Every lock stands open and every key-plate is clean, so somebody walked this row with the keys and opened each one in turn. Whether there was anybody still inside to let out, the straw does not say.",
  },
  "cistern": {
    "channel|ring|water|lead":
      "The channel was lined with lead, and the lead has been prised up and carried off in long strips, leaving the stone scored where the bars bit. Water was the first thing this place ran out of. The lead it ran in was the last thing anybody took.",
  },
  "ossuary": {
    "bones|bone|skulls|skull|courses|walls":
      "Each course is one kind of bone laid to a line, and every skull is turned to face the room. It was done slowly, by people who had the time, long before the bad years. The top course is not finished. Nobody has added to it since.",
    "floor|bottom|bottom course|stone|under":
      "The bottom course is not the garrison's. The bones in it are smaller and darker and laid in no order at all, the careful courses simply built on top of them. Where a flag has lifted, the floor beneath is older stone again, dressed and laid tight, with cold air coming up through the joints.",
  },
  "the-plague-trench": {
    "trench|ridge|stakes|stake|earth|ground|bones":
      "Where the ridge has been dug into, the trench shows its layers: the hurried dead on top, limed and tangled, and under them, on the same line, older bones laid in a trench just like it, and older again. Somebody dug here because somebody always had. Under the deepest of them the soil stops, a spade's depth down, on flat stone, dressed and laid tight, older than anything else here, with cold air coming up through the joints.",
  },
  "catacomb": {
    "niches|niche|shrouds|dead|burials":
      "The niches near the steps are full, and the ones further in are empty and swept, waiting. They were cut ahead for a garrison's dead, generation by generation, and the generations stopped coming before the niches ran out.",
    "wall|walls|back|stone|draft|draught":
      "At the back of the deepest niches the garrison's cutting breaks through into older work: shallow niches of another shape, packed with bones of another people, and behind those a face of flat stone, dressed and laid tight, older than the Door. The cold comes through its joints as much as down the steps.",
  },
  "kennels": {
    "chains|chain|collars|collar|bowls|bone":
      "Every chain ends in a collar, and every collar is open. The pins were drawn by hand, not snapped, one dog at a time. Whoever let them go did it carefully, and took the time. One of them is still on its stair.",
  },
  "gallery": {
    "paintings|painting|portraits|portrait|faces|frames|smears":
      "The faces were not lost to the damp. Up close the paint has been scraped off with a blade, face by face, and the frames left hanging straight. Somebody went through this fortress afterward taking the names off things, and here they took the faces too.",
  },
  "shrine": {
    "altar|stone|block|carving":
      "A plain block with nothing on it, and that is not wear. There was carving on the front, and it was cut away, smooth, with a chisel, the same as the names in the chapter house. Whoever this altar was for, it is for nobody now, and somebody made very sure of that.",
  },
  "library": {
    "books|book|shelves|shelf|page|pages":
      "One shelf near the floor stands empty, and the dust on it is thinner than on the rest. Those books were taken out late, when the damp had already started on everything else. Somebody came back for them, and only them.",
  },
  "warden-post": {
    "helmet|helm|peg|stool|slot|window":
      "The helmet hangs on its peg turned to face the slot, the way a man hangs it when he means to put it straight back on. The stool under the window is worn smooth on the side nearest the round, from someone leaning to look out, for years.",
  },
  "chapel": {
    "altar|axe|pews|pew|kindling":
      "The axe-marks on the altar run across it, not down, struck from behind it, from where a priest would stand. The pews were broken the same way, from the front. It was taken apart from the inside, by people who knew where to stand.",
  },
  "well": {
    "shaft|lip|rope|well|stone":
      "The lip is worn into a deep groove on one side only, where a rope ran for generations. There is no rope now and no bucket. Lean over it and the air coming up out of the dark is warmer than the room.",
  },
  "forge": {
    "anvil|split|furnaces|furnace|fire":
      "An anvil does not split from use. This one was struck once, very hard, with something heavier than any hammer in this room, straight down its middle, and the two halves have not moved an inch since.",
  },
  "refectory": {
    "trenchers|trencher|tables|table|benches|bench|dust|meal":
      "Every place is laid the same, and every bench is drawn out the width of a man sitting. Under the dust the trenchers are clean. The meal was put out and nobody was ever called in to it.",
  },
  "hall": {
    "hatch|iron|floor|flagstones":
      "The flagstones are laid up to the edge of the iron and cut to fit around it, so the hall was built around the hatch and not the other way about. It was here first. There is no ring and no handle on this side of it.",
  },
  "undercroft": {
    "throne|seat|stones|pillars":
      "Not built: heaped. River stones and broken ashlar piled into the shape of a seat, facing the hatch above. Nobody sat in it to rule anything. It was put there to face the way in.",
  },
  "hollow-crack": {
    "slab|fissure|crack|stone|scratches":
      "Low down inside the crack, where a sitting man's hand would fall, the stone is covered in small idle scratches: lines, crosses, a ship. Somebody sat in here a long time with a knife and nothing else to do, and then left.",
  },
  "chapter-house": {
    "seats|seat|council|stones|names|floor":
      "Twelve stone seats, each with a name-stone set in the wall above it, and every name-stone chiselled blank. The floor in the middle is worn in only one place, in front of the seat across from the door, where somebody stood to be answered.",
  },
  "scriptorium": {
    "desks|desk|vellum|shelves|ash|fire":
      "The fire started on the desks and the shelves caught after. It was set on the work, in the middle of the work. The flakes of vellum that lift when you move are all one black, with nothing left on any of them to read.",
  },
  "debtors-pit": {
    "scratches|walls|counting|marks|tally":
      "The marks are in groups, but not in fives. Each group is a different count, in a different hand, scratched as high as a man could reach from the floor. Some of the hands stop partway through a group.",
  },
  "muster": {
    "flagstones|flags|ranks|floor|yard":
      "The wear runs across the yard in straight lines a pace apart, deepest at the front rank and fading toward the back. Nobody wears a floor like this in less than a lifetime of mornings.",
  },
  "guardroom": {
    "tally|doorframe|days|frame":
      "Days, in strokes, crossed off in sevens down the doorframe. It stops partway through a week. Whoever kept it did not get to the end of that one.",
    "brazier|table|pegs|kit":
      "The brazier was put out with sand, not left to die, and the table went over the same moment, knocked sideways by somebody getting up fast. The pegs are bare. They went with their kit.",
  },
  "the-issue-room": {
    "racks|rack|halberds|maces|shields|arms|weapons":
      "Racked by kind and by size, every edge oiled before it went up, and the oil has kept them. This is a garrison's whole issue, ready, counted and waiting, and every one of them is still in its place.",
    "bones|bone|scatter|door":
      "Whoever sat against the door sat facing in, toward the racks, with their back to the way out. They were not waiting to leave.",
  },
  "the-five-ways": {
    "dish|flags|floor|flagstones":
      "The dish is deepest not in the middle but toward the gallery door, where the feet turned. Everybody cut the same corner, for generations, on their way somewhere else.",
  },
  "the-watch-turret": {
    "slits|slit|arrow-slits|roof|turret":
      "The slits look both ways, out over the grounds and in over the muster yard, and the inward ones are worn smoother at the sill. Whoever stood up here watched their own side more than they watched the road.",
  },
  "the-bell-cote": {
    "bell|crack|note|rope":
      "The crack runs from the lip almost to the crown, and the bell has been rung for years with the crack in it. The rope is newer than anything else up here by a long way. Somebody has kept replacing it.",
  },
  "the-broken-battlement": {
    "crenels|crenel|merlons|gaps|gap|rubble|breach":
      "The crenels were not snapped off by weather. They were pushed out, all of them in the one direction, when the wall under them dropped. It went the same morning as the breach below it, all at once.",
  },
  "the-leaning-spire": {
    "spire|floor|slope|lean|foundations":
      "It leans away from the wall's footings, out toward the chapel wing. Whatever dug under the wall dug under this as well, and stopped one prop short of bringing it down.",
  },
  "gate": {
    "gates|gate|hinges|iron":
      "The hinge-pins are bent inward, and the iron around them is torn from the outside. These gates were opened by something pushing to get in, and they have stood open ever since.",
  },
  "weeper-arch": {
    // A gate no longer (mig 366): the hatch its picture still shows, shut.
    "hatch|shutter|boards|lamp|bracket|keeper":
      "Boards are nailed across the shutter from the outside, and the nail heads are still bright. The lamp above it has oil in it. Whoever fills it does not come by while anyone is watching.",
    "face|keystone|carving|water|tears":
      "The water is not rain. It seeps out of the stone from somewhere higher in the wall and comes out exactly at the corners of the eyes. Whoever carved the face carved it where the water already ran.",
  },
  "sally-port": {
    "rubble|ashlar|tower|stones":
      "The tower came down outward, across its own door, and the ashlar fell squared, with the mortar still clean on it. Nothing wore this tower out. Something took it from under at the foot.",
  },
  // ---- THE FORTRESS, CLOSER (rome, 2026-10-31), batch two: the warrens. The
  // same law as the rest of this table: evidence about
  // the people, never a rule, an hour or an answer. Read together they agree
  // with the fortress's own story: a garrison that planned for a siege, walls
  // taken from under, work stopped mid-week, and somebody going through after
  // and taking the names off.
  "bone-nook": {
    "femur|latch|bones|gap|hollow":
      "The femur across the gap is worn smooth and dark in the middle, where hands have pulled it to and pushed it back more times than one person could have. Other people have hidden in here. Every one of them closed it the same way.",
  },
  "the-root-gnawed-run": {
    "roots|root|ceiling|mat":
      "The roots are gnawed pale only on the underside, up to the height a rat can reach standing on its hind legs, and the bark above that is untouched. Every mouthful on this ceiling was taken from below.",
  },
  "the-crawl-of-teeth": {
    "marks|teeth|tooth-marks|walls|scores":
      "Most of the marks are the small paired nicks of rats. Some are not. Those are four times the width, single, and set in the stone itself, not the earth, and they are all at the height of your face.",
  },
  "the-gnaw-hollow": {
    "leather|droppings|burrow|daylight|scrape":
      "The gnawed leather is boot-tops and belts, chewed for the salt, and some of it still has the buckles on. It was not dragged down here from anywhere far. People came through this hollow once, and some of them stopped in it.",
  },
  "a-dry-burrow": {
    "earth|burrow|fox|walls|floor":
      "The fox that dug this lined the back of it with dry grass and fur, and the lining is still there, flattened into the shape of something curled. It has been slept in since the fox, by something bigger, more than once.",
  },
  "the-dripping-gallery": {
    "lichen|sheets|drip|drips|water|stone":
      "The lichen grows only where the water runs, in long pale tongues reaching down the wall toward the floor. Where a sheet has been torn away there is a hand-mark under it, older than the lichen, pressed into the clay.",
  },
  "the-earth-throat": {
    "throat|shaft|stone|dark|air":
      "The edge of the throat is raw stone, not cut and not worn. The mine broke into it from the side and stopped dead. The sappers dug until the ground in front of them was air coming up out of nowhere, and that was as far as anybody dug.",
  },
  "the-sewer-slip": {
    "muck|ledge|collection|things|run-off":
      "Snagged in the muck along the edge: a comb, a spoon, a single boot, a seal-ring with the face filed off it. The sewer brings down whatever the fortress drops, and keeps it, and the oldest things are at the bottom.",
  },
  "the-side-run": {
    "walls|band|grease|floor":
      "The dark band along the walls is grease from fur, laid on a brush-stroke at a time by every body that ever went this way. It is thick enough to take a fingerprint. It has never once been dry.",
  },
  "the-litter-chamber": {
    "nest|cloth|straw|hair|warmth":
      "The cloth in the nest is cut cloth: shirt-linen, blanket-wool, a piece of a tabard with its colours still in the weave. It was all carried here from the fortress above, and the warmth comes up out of the middle of it like breath.",
  },
  "the-root-hall": {
    "roots|root|ceiling|roof|ropes|things":
      "The things wedged up in the roots are small and many: bright stones, a thimble, a bell from a harness, a spur. Carried a long way, every one of them, and put up out of reach. The floor beneath is what was eaten. The ceiling is what was kept.",
  },
  "the-scrape": {
    "claw-marks|marks|claws|clay|floor":
      "Most of the marks are small and fast and crossing each other everywhere. Under them, deeper and older and all going the same way, are a few that a rat did not make. Whatever made those went through here only once.",
  },
  "the-old-adit": {
    "timbers|timber|props|cut|adit|walls":
      "The timbers are squared with an adze and fitted without nails, the way sappers frame a gallery they mean to fire later. This one was never fired. The props are still standing, and the work stopped before the wall above it ever came down.",
  },
  "the-blind-heading": {
    "face|pick|shovel|blade|marks":
      "The last strokes of the pick on the face are short and close together, the work of somebody in a hurry or somebody tired. The shovel blade was left where it stood, still upright in the spoil. Whoever was digging here put down the shovel and walked away from it, and did not come back for it.",
  },
  "the-wet-run": {
    "trench|prints|mud|channel":
      "The trench runs down the middle of the run, a body-width across, and the small prints on either side of it are all hurrying the same way, away from whichever way it went. Whatever made it was being dragged, not walking.",
  },
  "the-fallen-props": {
    "props|timbers|prop|roof":
      "Every prop that fell went the same way, toward the fortress. The roof sagged first at the far end and the props went over one after another like a row of men knocked down by one blow. The rest are only holding because nobody has touched them.",
  },
  "the-hoard-hole": {
    "hoard|buttons|spoon|buckle|key-ring|teeth|heap":
      "Nothing in the heap is food and nothing is whole: a buckle with no strap, a ring of keys with no keys, a spoon bent double. Everything in it was carried here because it caught the light. At the bottom, under all of it, the oldest things are green.",
  },
  "the-warren-sump": {
    "water|sump|bones|bank|clay":
      "The bones under the water are long and smooth and laid side by side, not scattered: whatever went in, went in whole, and lay down there. The clay of the bank is printed right to the edge by small feet. None of the prints go in.",
  },
  // ---- THE FORTRESS, CLOSER (rome, 2026-10-31), batch three: the deep. The
  // same law as the rest of this table: evidence about
  // the people, never a rule, an hour or an answer. Read together they agree
  // with the fortress's own story: a garrison that planned for a siege, walls
  // taken from under, work stopped mid-week, and somebody going through after
  // and taking the names off.
  "the-descent": {
    "stair|steps|walls|stone":
      "Halfway down, the masonry changes: above, the fortress's squared ashlar; below, older stone, smaller, laid without mortar by people who did not build like the garrison did. The stair was cut down into something that was already here.",
  },
  "drowned-nave": {
    "columns|column|pillars|water|ceiling":
      "The columns are carved to the waterline and plain below it, so the water was here before the carvers were. Somebody built a great hall in a flooded place and decorated only the part they could reach.",
  },
  "black-canal": {
    "channel|canal|water|walls|banks":
      "The walls are cut straight and dressed, with iron mooring rings set at even intervals along both sides. Something was brought along this canal by boat, a long way, into the dark, often enough to need a ring every ten paces.",
  },
  "the-weir": {
    "sluice|weir|gap|gate|stones":
      "The sluice gate did not rot. Its iron frame is bent outward and its bar is snapped, so the water behind it was let go all at once, by force. The weir did not fail. Somebody broke it.",
  },
  "pocket-of-air": {
    "shelf|stone|ledge|wall":
      "The shelf is worn smooth along its edge where hands have hauled bodies up out of the water onto it, again and again. Above, scratched into the wall at sitting height, are the same few strokes over and over, the marks of people counting breaths.",
  },
  "sunken-gallery": {
    "portraits|portrait|faces|frames|smears|arches":
      "Like the gallery above, the faces were not rotted off: they were scraped, with a blade, before the water came. Somebody went down this arcade with a knife and took the faces off the King's people too, and then the flood put out what was left.",
  },
  "root-vault": {
    "roots|root|dead|vault|bones":
      "The roots have gone through the burial niches and out the other side, and where they passed through a body they grew around it, so the bones are held up in the wood at the height they were laid. Whatever tree this is, it is a very long way above, and it has been drinking down here a long time.",
  },
  "deep-ossuary": {
    "bones|bone|skulls|masonry|wall":
      "The courses here are laid by people who did it differently from the ossuary above: no single kind of bone to a course, but whole skeletons folded together, each one kept with itself. These people buried their dead whole. The ones above sorted them.",
  },
  "weeping-cells": {
    "cells|doors|walls|water|oubliettes":
      "The doors rusted open; nobody opened them. The hinge-side of each is corroded through where the water ran down it, and they sagged, one after another, over years. Whoever was in these went on being in them until the iron gave up.",
  },
  "silted-stair": {
    "silt|steps|stair|muck|tracks":
      "The silt holds tracks like snow: a broad dragging furrow up the middle of the stair, and at each step a wide splayed print on either side of it. It went up and came back down by the same line.",
  },
  "bone-processional": {
    "skulls|skull|walls|road|dead":
      "Every skull is fitted into the wall facing down the road, and every one has had its teeth pulled. It was done to all of them, carefully, before they were set. Whoever built this road wanted the dead to watch it, and not to say anything.",
  },
  "black-threshold": {
    "doorway|lintel|warning|carving|stone|door":
      "The carving on the lintel is the only writing anywhere in the deep that nobody chiselled off. Everything else down here had its names taken away. This was left, so somebody wanted it read, even by people who could not read it.",
  },
  "drowned-barracks": {
    "bunks|bunk|heap|bedding|corner":
      "The bunks are the same pattern as the Cold Barracks above, the same length, cut the same way. The garrison slept down here too, once, before the water. The heap in the corner is bedding from every bunk in the room, pulled together and packed down, and it is the shape of something that lies in it.",
  },
  "leech-pools": {
    "pools|pool|basins|basin|water":
      "The basins are cut, not natural, each one a step lower than the last, and their lips are worn by the water spilling over and by something else that comes and goes over the edge. The warmth is coming up from below the lowest one.",
  },
  "tide-vault": {
    "door|iron|hinges|strongroom|vault":
      "The bolts on the inside of the door are still shot home. Whoever locked this strongroom locked it from the inside, and the water came in anyway, from below, and then pressed the door out from within.",
  },
  "the-cistern": {
    "walls|well|water|surface":
      "The walls are banded with water-lines all the way up, thousands of them, each a little higher or lower than the next. This was a cistern that filled and emptied for centuries, and the highest line is out of sight above you.",
  },
  "blackreach": {
    "stone|floor|dark|country|ground":
      "The stone underfoot has never been cut. There are no marks on it of any tool, and no marks of any foot that wore a shoe. Whatever walks here, it has walked here since long before there was a fortress, and none of it came down from above.",
  },
  "the-lightless-march": {
    "wall|gallery|stone|hand":
      "Your hand on the wall finds a groove worn into it at about the height of a hip, running the whole length of the march, smooth and polished. Something has gone along here with its side to the wall for a very long time, the way a blind thing keeps to a wall.",
  },
  "worm-cloister": {
    "holes|hole|cells|court|bores|stone":
      "The holes are perfectly round and their insides are glassy, polished smoother than any tool could. There are no tool-marks, no spoil, no dust. The stone was not dug. It was passed through, and something carried the stone away with it.",
  },
  "the-undertow": {
    "floor|grit|bone-chips|slope|pull":
      "The grit on the floor lies in long ripples, all pointing one way, the way sand lies on a beach after the tide has gone out. Air does this, down here. The whole room is the bottom of a breath.",
  },
  "the-sump": {
    "sediment|floor|silt|mud":
      "The sediment is layered, fine and dark and then a band of pale, fine and dark and then pale, laid down over an unthinkable time. Things are pressed flat in it, between the layers. The deeper you look, the older the things, and the stranger.",
  },
  "carrion-gallery": {
    "bones|bone|midden|floor|carrion":
      "The bones at the top of the heap are fresh and the ones at the bottom are stone. Somewhere in between are the bones of men in garrison mail, mixed in with everything else that fell. This floor has been fed without stopping since before the Door was built.",
  },
  "the-marrow-road": {
    "road|causeway|bone|bones|path":
      "Packed bone, ground to a pale powder on top by feet and laid whole underneath. Dig a fingernail in and the bones under the road are all arm bones and leg bones, the long ones, laid crosswise like a corduroy road over a bog.",
  },
  "the-gasping-dark": {
    "air|breath|breathing|dark":
      "The air moves here, slow and regular, in and out, and the dust on the floor moves with it. It comes from one direction and goes back the same way. Whatever is breathing is not in this room. This room is in it.",
  },
  "sunless-well": {
    "silt|dome|vault|floor|glint":
      "The silt down here is the finest in the deep, and everything heavy that ever fell has sunk to the bottom of it: coin, plate, the pommel of a sword, a helm with its crest still on it. Nothing rusts at this depth. Nothing has come back up for any of it either.",
  },
  "drowned-court": {
    "figures|figure|faces|court|throne":
      "The kneeling figures are men, salted and silted into stone, and every one of them has had the device cut off his tabard where it lay across his chest. Their names were taken from them even here, on their knees, while they waited.",
  },
  "kings-oratory": {
    "altar|chapel|oratory|wall":
      "The altar is turned to face the wall that the throne room is on the other side of, and the wall there has been worn smooth, in a patch the size of a forehead, at a kneeling height. Whoever prayed here prayed toward the King.",
  },
  "bone-reliquary": {
    "relics|relic|finger-bones|skull|teeth|silver|crowned":
      "The silver cases are each stamped with a mark where a name went, and every mark has been filed flat. The crowned skull has no crown of its own: the circlet is wired on, and the wire is newer than the bone. Somebody put it there after.",
  },
  "the-death-cell": {
    "rings|ring|drain|floor|iron":
      "The rings are set deep and their insides are worn bright, by chain, recently. The floor slopes to the drain so that nothing has to be carried out of this room. It was built for exactly what it was used for, by somebody who planned to use it often.",
  },
  "the-cold-hearth": {
    "fireplace|hearth|ash|bones|throat":
      "The ash in the throat is packed solid, a thousand fires deep, and the bones in it are curled tight, the way a thing curls when it is cold and dying. It crawled up into the chimney after the last warmth, and the warmth went out first.",
  },
  "worm-bore": {
    "tunnel|bore|stone|walls":
      "The bore is the same glassy round as the cloister's holes, only narrower: something smaller came through here first, a long time before whatever made the big ones. It is still the right size for one person and nothing else.",
  },
  "the-tide-gate": {
    "lines|water-lines|walls|stone|rings":
      "The high-water lines are thickest near the floor and thin out toward the roof, like a tree's rings, close-packed where the years were hard. The highest one is above the door. Once, the whole of this was under.",
  },
  "the-under-weir": {
    "sluice-slots|slots|weep-holes|crust|mussels":
      "The mussels grow on the sluice in bands, each band dead and white under a living black one, so the water has come and gone and come back for longer than any shell lives. The weep-holes are cut at even heights, a ladder for water going down.",
  },
  "the-drowning-stair": {
    "rings|ring|steps|rope|stair":
      "Every fifth step has a ring, and every ring is worn on its upper side, from a rope pulling downward. People came down these steps on a rope, hand over hand, in a hurry, more than once. Nobody fits rings like this for a stair they mean to climb up.",
  },
  "the-eel-run": {
    "bones|fish|shelf|channel|water":
      "The fish bones on the shelf are picked clean and laid out in rows, heads one way, tails the other. Eels do not do that. Something sits on this shelf to eat what comes up the channel, and is tidy about it.",
  },
  "the-long-swallow": {
    "walls|ribs|ribbing|corridor":
      "The ribbing in the walls is natural rock, banded, not built, and the corridor narrows to a point you have to turn your shoulders for. The sweat on the walls is warm. It is the only warm stone in this part of the deep.",
  },
  "the-salt-vault": {
    "shelves|shelf|salt|stores|jars":
      "Stoneware jars on the shelves, sealed with wax and stamped with the garrison's mark: salt fish, salt pork, salt, salt. Most are cracked by the cold and spoiled through. The siege these were laid down for never got far enough for anybody to come down and eat them.",
  },
  "the-breathing-hall": {
    "ledges|ledge|mark|high-water|wall":
      "The high-water mark is a line of scum and small dead things a hand above your head, and below it the ledges are dry. The water was here, and went down, and it will be here again. The ledges are only dry because it is not yet.",
  },
  "the-tide-throat": {
    "stone|walls|pipe|drips|polish":
      "The polish is smoothest at chest height and duller toward the floor and roof. The water that runs through here fills it to the middle and moves fast, and it has done so long enough to wear the stone the shape of the water.",
  },
  "the-silt-chapel": {
    "altar|offerings|offering|mouths|silt":
      "The offerings in the silt are mostly the things people carry: a knife, a buckle, a coin, a key. Each one is set down in the same place relative to the altar, as if the water arranges them. None of it is rusted. The water keeps what it is given.",
  },
  "the-still-cradle": {
    "water|midden|floor|leavings|chamber":
      "Everything the tide carries comes to rest here in rings around the middle, sorted by weight: bone and iron at the bottom, cloth and wood at the top. The middle of the chamber is clear. Nothing that comes in ever settles there.",
  },
  // THE BACK WALL — the riddle door's ground. The room says there is no way up
  // this; the close read says the one thing on the whole face that the water has
  // not touched. Evidence, not a rule: it names no riddle and no answer.
  "the-back-wall": {
    "door|iron|hatch|plate|ground":
      "Black iron, lying flat in the scree at the foot of the wall, and the wall has been running water down onto it for as long as there has been a wall. It is not rusted. Seven hundred feet of wet rock above it, white with the run of it, and this is dry — no scale, no bloom, no pitting, and the scree lies right up to the edge of it without ever having been pushed back. Nothing has come out of here and nothing has gone in.",
    "wall|rock|face|crag":
      "Wet black rock, streaked white where the water comes down and green-black where it does not, and it leans over you by a degree or two the whole way up. There is no line on it — no ledge, no crack that carries, no weakness a hand would want. Whoever put a door at the foot of it was not expecting anybody to arrive from above.",
  },

  // THE BIRDLESS ACRE — the moon door's ground. Its own line says everything
  // about the acre is right except that nothing lives in it. This is why.
  "the-birdless-acre": {
    "door|iron|moon|carving":
      "A slab of black iron standing in good wood with nothing built around it — no frame, no wall, no footing, no hinge on this side. The moon cut into the face is old work and it is cut DEEP, deeper than showing it needs, the way a thing is carved when the carving has a job rather than a meaning.",
    "ground|litter|leaves|floor|acre|trees|wood":
      "Leaf litter two years deep and not a mark in it. No scrape, no run, no droppings, no browse line on anything at standing height — and the litter itself is whole, when a wood floor this old should be turned over daily by a hundred small things looking for food. Nothing has been eaten here in a long time, and nothing has been eaten HERE, which is a different fact and the harder one.",
  },

  "the-buried-chapel": {
    "chapel|altar|stone|walls|vault":
      "Under everything, and it was under everything before the collapse — chapels go at the bottom when what is above them is a garrison and what is below is where the family is. It is intact, which almost nothing down here is. The altar stone is colder than the air over it, and it has not stopped being colder in a very long time. Something laid on it would keep.",
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

  // ======================= THE MOUNTAIN ==================================
  // Only the rooms whose own description names a DISTINCT thing, not the
  // terrain — rock, snow, wind and shadow are the region table's job (above).
  "the-shieling": {
    "hut|shieling|fire|turf":
      "Stone and turf built into the slope, low enough that you duck, and dry inside — more than the mountain offers anywhere else. People came up with the animals every summer and went down before the weather turned, every year for a very long time, and then one year did not. Somebody is here now. The fire is lit, and he does not say who or why. The stone larder at the back still holds its cold. Food set into it keeps — that is what the cold was for.",
  },
  "the-milking-fold": {
    "fold|milking fold|pen|slab|milking":
      "A round pen of dry stone, waist high, with a gap in it and a flat slab worn smooth beside the gap where somebody sat to do the milking. Beasts were brought in here twice a day and let out again. The ground inside is still a different colour from the ground outside, and it will be for another hundred years.",
  },
  "the-hearth-stone": {
    "hearth|hearth stone|fire|ring|stone":
      "A broad flat stone with a ring of smaller ones round it, reddened right through by more fires than anybody could count, and no wall or post or footing anywhere near it. Whatever stood over it went back into the ground. The stone will not. You could light a fire on it tonight and it would work.",
  },
  "the-stell": {
    "stell|shelter|ring|roof|hide|fire":
      "A ring of dry stone built so that beasts inside it could always get out of the wind whichever way it blew — very good thinking done with nothing but stone and time. Half of it has been roofed over since, badly, with poles and turf and a stretched hide. There is a fire under the roofed half, and a man keeping it who came up with the last of the summer people and did not go down with them.",
  },
  "the-drowned-fence": {
    "fence|posts|wire":
      "A line of posts walking away up the slope and into the bog, each one shorter than the last, until the last two show as knuckles of grey wood in the moss and then there are no more. Whoever set these was fencing ground that has since eaten the fence. The wire is still strung between the first four.",
  },
  "the-clapper": {
    "clapper|bridge|slabs|piers|stones":
      "Three slabs laid end to end across the burn on two piers of stacked rock, no mortar and no name, and it has not moved. Nobody signs a thing like this. Somebody needed to get across with something heavy, once, and solved it — and the solution is still solving it, every time anything sets a foot on it.",
  },
  "the-spring-eye": {
    "spring|eye|spring eye|sand|water":
      "Water comes straight up out of flat ground through a bed of pale sand, and the sand boils and settles and boils again where it rises, the whole thing about the size of a shield. It has done this constantly for longer than anything else in view has existed. It is the coldest water on this hill, and you can stand and watch it happen, which changes nothing about it.",
  },
  "the-erratic": {
    "boulder|erratic|stone":
      "One boulder the size of a small house, standing alone on open ground, of a stone that matches nothing anywhere near it. It was carried here and set down. The thing that carried it was ice, and the ice is gone, and this is what it left behind to say so.",
  },
  "the-hollow-under": {
    "hollow|floor|ring|fire|ash|doorway":
      "Under the erratic's lifted corner there is a dry floor of sand the size of a small room, out of the wind and out of the rain and out of the sight of everything. Somebody lived in here: a ring of stones for a fire with nothing in it but old ash, and sand that was swept once, long ago. The swept edge has gone soft, and the wind has put a drift across the doorway.",
  },
  "the-shelter-crag": {
    "crag|overhang|shelter|wall|slabs":
      "The rock leans far enough out that the ground beneath it is dry in any weather, and everything on this mountain has stood under here at some point. Somebody has walled the windward end with stacked slabs and moved in, which is the obvious thing to do and the reason nothing else uses that end any more. There is a smell. Some of it is his.",
  },
  "the-raven-stone": {
    "raven stone|ledges|pellets|tenants":
      "A blunt tower of rock whitened down one whole side, its ledges packed and trampled, the ground beneath it full of small bones and the wrappings of pellets. It is occupied, and has been, continuously, for longer than the fortress has stood. The tenants have never once been asked.",
  },
  "the-slabs": {
    "slabs|joint|roof|smoke|roofed joint":
      "The widest joint has been roofed: a slab levered flat across it and packed at the ends, with a hole for smoke and smoke coming out of it. Whoever did that picked the one place on this hillside the water goes past instead of over. It is dry while the rest of the slabs run with water.",
  },
  "the-lochan": {
    "lochan|reflection|water":
      "Perfectly still and so dark that the reflection of the back wall in it is better lit than the wall itself. It has no inflow you can find and one thin outflow at the far end. Nothing rises in water this cold and this deep and this poor.",
  },
  "the-fallen-block": {
    "block|slab|lean":
      "A slab the size of a barn that came off the wall and landed on its edge, and has stood that way ever since. Under its lean there is a wedge of dry ground — out of the wind, out of the wet, out of the sight of anything above. It is the only such place in this bowl.",
  },
  "the-high-cairn": {
    "cairn|stones":
      "Four courses of flat stone, the same as the ones far below at the foot, set in the same careful way — and beyond it, in every direction, there is not another. Whoever built this line built it to here and then either turned back or did not need it any more. The stones are seated. It has not fallen in a very long time.",
  },
  "the-white-hollow": {
    "hollow|feathers|gravel":
      "A scoop of rock with dry gravel in the bottom, floored with a drift of small bones and old feathers a foot deep in places. Nothing here died today. Something has been carrying its dinner in here for a very, very long time.",
  },
  "the-rowan": {
    "rowan|tree|berry":
      "One rowan growing out of a cleft in the rock, the only tree above the shore, its roots gone down the crack and its head bent permanently downhill by the wind. Nothing planted it. A bird ate a berry somewhere lower and sat here, once, and that is the entire history of the only tree on this mountain.",
  },
  "the-sink": {
    "sink|boulder|gravel":
      "The burn goes underground here, entirely, into a gap under a jammed boulder. Below it the streambed is dry gravel with dry weed lying combed along it. The change happens in one stride: water, then no water, and the noise going down and away under your feet.",
  },
  "the-resurgence": {
    "resurgence|arch":
      "Water comes back out of the hill through a low arch, at pressure, cold enough to take your breath, having gone in half a mile back and a hundred feet higher. Nothing that goes into the sink has ever been seen to come out here. That is worth knowing before you decide the two are connected.",
  },
  "the-boulder-gate": {
    "gate|doorway|blocks":
      "Two blocks the size of houses, landed leaning against each other, and the gap under them is a doorway with a dry floor and a roof that has held for a very long time. Something has been sleeping in the back of it. There is no smell of anything recent.",
  },
  "the-upper-lochan": {
    "lochan|bottom|silt":
      "Higher and smaller and paler than the one below, floored with grey silt that comes up in clouds if anything disturbs it and takes an hour to settle. You can see the bottom, which the lower one never allowed. There is nothing on the bottom.",
  },
  "the-inversion": {
    "inversion|summits|cloud floor":
      "You have come up out of it, and it is below you: a floor of white lying flat across the whole country, with two or three other summits standing out of it like islands. It is the most beautiful thing anybody up here has ever seen, and there has never been anybody up here.",
  },
  "the-brocken": {
    "brocken|spectre|sun":
      "Standing with the sun behind you and the cloud in front, your own shadow is thrown onto the cloud enormously, with a ring of light round its head, and it moves when you move. Everything about it is explicable. Knowing that does not help as much as you would expect.",
  },
  "the-standing-cloud": {
    "standing cloud":
      "It forms on this shoulder and stays while the wind goes through it — the air moving hard and the cloud not moving at all, condensing on one side, evaporating on the other, holding station. It is the same cloud, and it is entirely new every few seconds.",
  },
  "the-cornice": {
    "cornice|lip|snow lip":
      "A lip of snow built out over the edge of the crest, curling and unsupported, reaching a good ten feet past where the ground actually stops. From above there is no way to see where the rock ends. From below you can see exactly, and it is nowhere near where you would have walked.",
  },
  "the-high-tarn": {
    "tarn|pool":
      "A pool of meltwater three strides across, absolutely clear and absolutely still, with the stones on its bottom as sharp as if there were no water there at all. It freezes solid most nights of the year. Nothing lives in it, which up here has stopped being remarkable.",
  },
  "the-bone-ground": {
    "bone ground|horn|skull":
      "Bone in quantity, lying loose among the stones — ribs, cannon bones, the long spiral of a horn, skulls with the teeth still bedded. None of it is arranged and none of it is fresh. Everything that dies anywhere above here comes to this fan eventually, and this is where the heavy pieces stop rolling.",
  },
  "the-rib-cage": {
    "rib cage|ribcage|ribs":
      "The ribcage of something the size of a horse, lying on its side, picked absolutely clean and gone the colour of the stones around it. The bones are still articulated, and the arch of them makes a space underneath a person can lie in out of the weather. Nothing comes in here. Whatever cleaned this did it a very long time ago and has not been back.",
  },
  "the-dry-bones": {
    "dry bones|bone":
      "Bone that has been up here long enough to stop being bone in any useful sense: chalky, light as cork, crumbling at a touch and blowing away as powder. The mountain finishes everything eventually. Something has still been chewing on the ends of these, which is the only reason anything comes to this ground.",
  },
  "the-wind-tooth": {
    "tooth|blade":
      "A blade of rock undercut by the wind until it is thinner at the bottom than the top. It hums — not loudly, and not always, but in a steady wind the whole tooth resonates, and you can feel it through the soles of your boots before you can hear it.",
  },
  "the-moulin": {
    "moulin|shaft":
      "A round shaft in the ice, six feet across and perfectly circular, with a stream going into it and no sound of the stream arriving anywhere. The walls are ribbed and blue and turn out of sight within twenty feet. The snow at the lip is packed hard by something that has stood here and looked in, more than once.",
  },
  "the-blue-ice": {
    "blue ice":
      "Bare ice with no snow on it at all, polished by wind, hard as glass and the colour of a deep pool. You can see down into it a long way. About four feet under the surface there is something dark, about the size of a dog, and it is going to be another century getting to the bottom.",
  },
  "the-summit-foot": {
    "rock|summit foot|glazed rock":
      "The rock changes here — darker, and glazed, and in places it has run and set again. Nothing on this tier has an explanation for that. Nothing on this tier comes up here either: no tracks, no droppings, no bones, nothing.",
  },
  "the-way-up": {
    "ramp|warm ramp":
      "Dark rock scoured bare and warm underfoot — genuinely warm, in a place where the shade never rises above freezing. It goes up out of sight into the cloud. Nothing follows you onto it. Not one thing on this mountain will set foot on this.",
  },
  "the-glazed-slab": {
    "slab|glaze":
      "A surface like a cracked pot glaze, black-brown and shining, catching the light in a way stone does not. Run a hand over it and it is smooth in ropes and runs, as though it was liquid and stopped being liquid quickly. The ropes all run the same way, downhill.",
  },
  "the-basking-flags": {
    "adders|snakes|basking flags":
      "Warm flat stone, and on it, arranged with a great deal of care and no interest in you whatever, adders. Adders, at this height, above the snow line, in country where a cold-blooded thing should have died out four tiers down. They are here because the rock is warm, and the rock is warm for a reason nothing on this hillside will explain.",
  },
  "the-thin-crack": {
    "crack|crust|reek":
      "Too narrow to enter, breathing out warm air with a faint reek in it, and around the mouth of it the rock is stained a pale yellow-white in a crust you can crumble between finger and thumb. It smells of struck matches. It is not a smell this world has anywhere else.",
  },
  "the-first-terrace": {
    "hind|deer|first terrace":
      "A red deer hind, opened along the belly, most of her still there and nothing yet at her. She did not walk up here — there is no route to this shelf that a deer could take, and the ground where she is lying has no drag mark leading onto it from any direction at all.",
  },
  "the-drag-mark": {
    "drag mark|groove":
      "A groove worn into the rock, two feet wide, polished, running from the edge of the terrace above out and away over the lip and into open air. Things have been pulled along it, many times, and every one of them pulled the same way: not up onto the shelf and not down off it. Off the edge, into nothing.",
  },
  "the-tallow-stone": {
    "tallow stone|boulder":
      "A boulder with fat rendered into its surface over years until the stone itself has gone waxy and yellow and takes a thumbprint. It is the one thing up here that has got richer rather than poorer. Insects work it in the warm hours, in a haze, and there is nothing else at this height for them to be doing.",
  },
  "the-eyrie-ledge": {
    "nest|ledge|bird":
      "A ledge wide enough for four people to stand abreast, and on it a nest — a platform of sticks and bone six feet across, packed and trodden and built up in layers for so many seasons that the bottom of it has gone to peat. There is a bird on it, and the bird is not the size of anything that should be able to build this.",
  },
  "the-eyrie-head": {
    "nest|biggest nest":
      "The biggest nest of all — abandoned, older than the rest by a long way, and built to a size that the birds on the shelves below could not manage between them. Whatever raised young in this was not a vulture. Nothing has been in it for decades, and nothing has taken it over either.",
  },
  "the-black-tower": {
    "black tower|tower":
      "A tower of rock gone black on the east face only — not glazed, not run, just burnt, in a hard-edged shadow-shape as though something extremely bright had stood beside it once and gone away again. The west face is grey and ordinary and lichened like any other rock in the world.",
  },
  "the-summit-gate": {
    "gate|gap":
      "A wall of rock with a gap in it, and beyond the gap there is nothing to see but light, and warm air comes out steadily. The ground at the gap is swept absolutely clean, and the sweeping stops in a line you could draw with a ruler. On this side of the line the grit is undisturbed for as far back as you can see.",
  },
  "the-summit": {
    "ring|bowl|doorstep":
      "A bowl of bare rock, swept and warm, and off its middle the rock has run and set in ropes and lobes with the front edges curled over, in a rough ring. Inside the ring the stone is glazed and black and worn smooth in the way a doorstep is worn. Whatever made this ring is not small and does not need to be anywhere else.",
  },

  // ======================= THE CROSSING ==================================
  // The water people's working infrastructure and the crossing's own
  // structures — the causeway, the stages, the salt and fish gear, the marsh
  // works. Tide, shingle, salt and sky are the region table's job (above).
  "the-ferry-house": {
    "ferry house|house|rope drum|drum":
      "Stone, with a wide door facing the water, a stove-in boat under the lean-to, and a window that looks straight down the deep channel to the far bank. Somebody lived here to take people over, and their whole working life was one distance, repeated. The rope-drum is still bolted to the floor, and a lamp burns over a hatch in the road-facing wall.",
  },
  "the-rope-walk": {
    "rope walk|walk|rope":
      "A long level strip beside the road, fenced on both sides, running perfectly straight for further than anything here needs to be. Rope was laid out and twisted down its length, and the ferry rope was made on it. It is the only piece of ground on this shore that was flattened on purpose.",
  },
  "the-hard": {
    "hard|ramp|slip|slipway":
      "A ramp of laid stone going down into the water at a shallow angle, wide enough for a cart and grooved by keels — this is where boats were taken out and put in. The stone below the waterline is furred green and the stone above it worn white, and the line between them is the most legible thing on this shore.",
  },
  "the-capstan-stone": {
    "capstan stone|capstan|socket":
      "A block of dressed stone set flush in the road, with a square socket cut through the middle of it, worn round. A capstan stood here and boats were hauled up past it, and the road runs on over it now as if it were paving — because that is what it has become.",
  },
  "the-tide-mark": {
    "tide mark|mark|post|scale|lantern":
      "A post set in the shingle above the strand, taller than a man, with a scale cut up it and a bracket at the top for a lantern that is not there. This is how the shore reads the water: one glance, and you know which of the five ways is a way today. Somebody has kept the cut lines clear of weed.",
  },
  "the-mussel-scaup": {
    "mussel scaup|scaup|mussel bed|bed":
      "Acres of mussel packed edge to edge, blue-black, every shell shut, going out further than you would want to walk and under water half the time. Somebody raked a path through the middle of it, and the path is old, and the mussels have never closed it up.",
  },
  "the-rope-stage": {
    "rope stage|stage|bollard|block":
      "A timber stage out over the deep water where the ferry came alongside, with a bollard, a fend-off post, and the rope running through a block that still turns. From out here the channel shows its true colour — not grey like the shallows, but green, and then not green.",
  },
  "the-half-tide-post": {
    "half tide post|half-tide post|post|band|white band":
      "A post set in the causeway's edge with a broad white band painted round it, at knee height. Everything you need to know is in where the water sits against that band — below it you have time, on it you are deciding, above it the decision was made for you a while ago.",
  },
  "the-refuge": {
    "refuge|platform|tally|steps":
      "A stone platform built out from the causeway's side, six feet up on its own little pier, with three steps, a rail-socket, and room for four people to stand. It is here because the builders knew people would misjudge it. Somebody has cut a tally into the top step, and it is a long tally.",
  },
  "the-drain-arch": {
    "drain arch|arch|culvert|bore":
      "A low arch built through the causeway to let the water pass rather than pile against it — the one piece of humility in the design. The water goes through it fast, both ways, twice a day, and has polished the stone inside to a shine you can see your hand in.",
  },
  "the-lantern-stump": {
    "lantern stump|stump|lamp|socket":
      "Off the causeway's edge, on a stub of pier, the base of a lamp-standard snapped off at the collar, with the lead still run into the socket. A light stood here to say where the road was after dark. Nothing says where the road is after dark now. The lead still takes a flame — light the stump, and the road has its light back for as long as the torch burns.",
  },
  "the-bell-buoy": {
    "buoy|bell|bell buoy":
      "Aground on the shingle, on its side: an iron float the size of a cow, with a cage on top and a bell in the cage, and the bell still has its clapper. It rang on the water for whoever was out in the dark. You could ring it now, and everything for a mile would hear.",
  },
  "the-wreck-ribs": {
    "wreck ribs|ribs|frames|hull":
      "The frames of a boat stuck upright in the mud at a slant, black and hard as iron, spaced like ribs because that is what they are. Whatever it was, it was bigger than anything the ferry-house ever ran — and it did not sink here. It was left here. When the sea comes up over the frames there is room to go down between them, and whatever the boat was carrying went down with it.",
  },
  "the-beam-walk": {
    "beam walk|beam|iron beam|girder":
      "Eight inches of rusted iron, perfectly rigid, which is a mercy — and nothing to hold and nothing on either side, which is not. The wind up here has an opinion. Below, the water is doing something complicated a long way beneath you. A cord would take your weight across, if you had one, and there is nothing else up here that would.",
  },
  "the-rope-bridge": {
    "rope bridge|bridge|ropes|slats":
      "Three ropes: one to walk, two to hold, with slats lashed to the walking rope at intervals of somebody's stride and not yours. It swings more the further out you get, then less again, and the far end is fast to a ring somebody set in the fourth pier with a great deal of trouble.",
  },
  "the-drowned-span": {
    "drowned span|span|blocks|masonry":
      "The fallen middle of the bridge, lying in the shallows in enormous keyed blocks, exactly in the order it fell, with the arch's curve still legible in the way they lie. Weed on all of it. You can walk the length of a span that is on its side.",
  },
  "the-stranded-hull": {
    "stranded hull|hull|boat|oars":
      "A boat on the bank, upright and whole, sitting on the gravel as neatly as if somebody had put it there, oars shipped and a bailer wedged under the thwart. It cannot have got up here except at a height of water that would have covered everything you have walked across.",
  },
  "the-midden": {
    "midden|mound|layers":
      "Where the shell bank rises into a mound, layered, and cut into on one side by the water so you can read down through it: shell, ash, shell, ash, a bone, shell. Somebody sat on this spot and ate shellfish for generations. There is nothing else of them anywhere.",
  },
  "the-tern-scrape": {
    "tern scrape|scrape|eggs|hollow":
      "A hollow in the shingle, lined with nothing at all, holding two eggs the colour of the stones around them. The birds are up and screaming the moment you are near it, and they do not stop and they do not go away. Everything within half a mile now knows exactly where you are standing.",
  },
  "the-ferry-boat": {
    "ferry boat|boat|bailer":
      "Broad, flat-bottomed, tarred, with the rope running through a ring at bow and stern so it cannot go anywhere but across. There is water in the bottom of it and a bailer, and the bailer has been used recently enough to still be wet.",
  },
  "the-under-rope": {
    "under rope|chain|shape":
      "Below the surface the rope goes on down and the light goes green and then brown, and there is a shape down here — a second rope, or a chain, going off at an angle toward something on the bottom that is too regular to be stone.",
  },
  "the-eel-lines": {
    "eel lines|lines|droppers|hooks":
      "A long line strung between two stakes in the deep water, with droppers every yard and a hook on every dropper. It is set, it is baited with something that has been down there a while, and it is not yours. Somebody is working this channel.",
  },
  "the-boat-house": {
    "boat house|shed|slipway":
      "On the far bank above the stage, a shed of tarred board with a slipway running out of it, big enough for one boat and a man to work round it. There is a second boat in here, upside down on trestles, holed amidships and half-mended, with the tools still laid out along the keel.",
  },
  "the-signal-mast": {
    "signal mast|mast|halyard|locker|shapes":
      "A mast on the eastern bank with a yard and two blocks and a rotten halyard, for hoisting a shape that told the far side whether the boat was coming. The locker at its foot still holds the shapes: a black ball, a black cone, a red diamond gone pink.",
  },
  "the-ferryman-stone": {
    "ferryman stone|slab|memorial|grave":
      "A slab set upright on the eastern bank above the steps, with a name on it and two dates that are not far apart, and below them a line about the water. It faces the channel. Whoever set it up wanted him to go on looking at the crossing he did not get across.",
  },
  "the-deep-mark": {
    // The gauge post had a close read; the DOOR beside it did not.
    "door|iron|sill|hatch":
      "Black iron set low into the bank, and the whole of it below the deepest band cut on the post beside it — which is to say it is under water more of the day than it is out of it, and whoever hung it knew that when they hung it. The sill is silted and has been silted and dug out and silted again; the marks of the digging are old and there are a great many of them. Somebody used this on a schedule.",
    "deep mark|depths|cap|post":
      "A stone post at the head of the green water with depths cut into it in bands, the deepest band well above the top of the post. The cutter ran out of post before he ran out of water, and marked that fact by cutting the last band on the underside of the cap.",
  },
  "the-warping-post": {
    "warping post|post|groove":
      "A massive post on the eastern hard with a groove worn all the way round it at chest height, where a rope was taken round to haul boats up out of the water. The groove is a hand deep. That is not one boat — that is every boat, for a lifetime.",
  },
  "the-oar-store": {
    "oar store|oars|rack":
      "A rack under the boat house eaves holding six oars, blades up, all different lengths and all made for the same rowlock. Five are grey and cracked. One is not, and it has been used, and there is fresh water dripping off the blade of it.",
  },
  "the-hook-hut": {
    "hook hut|hut|coat|bed":
      "Turf walls, a roof of reed on rafters of reed, one door and no window, and inside it is dry and dark and smells of cut sedge. There is a bed of reed against the wall and a stone for a hearth and, hung on a nail, a coat that would still keep the rain off.",
  },
  "the-decoy-pipe": {
    "decoy pipe|pipe|hoops|netting":
      "A curving ditch off the chapel channel, netted over on hoops and narrowing to a trap at the far end — a decoy, for taking duck in numbers. The hoops still stand. Most of the netting has gone, and what is left moves when the wind gets under it and looks, from the corner of the eye, like something walking under the net.",
  },
  "the-fowlers-hide": {
    "fowlers hide|fowler hide|hide|pit|shelf|slot":
      "A pit dug into the black eyot's edge and roofed with cut reed, with a slot to see through at water level and a shelf inside worn smooth by elbows. A man lay in here for hours at a time, waiting for birds. The view through the slot is of open water and nothing else — a very good place to see without being seen.",
  },
  "the-eel-hut": {
    "eel hut|hut|hatch|traps":
      "On stilts over the water: a plank shack the size of a bed, with a hatch in the floor and a rack of eel-traps on the wall and a stove made from a broken pot. The hatch opens onto black water. This is a place somebody worked at night, on purpose, alone.",
  },
  "the-old-boat": {
    "old boat|boat|punt|quant":
      "A punt sunk in the reed off the long causey, flat-bottomed and open, with a quant pole still shipped along the gunwale. It is full of water and silt and there is a bird nesting in the bow, and it would float again with a day's work and a way to get a day's work out here.",
  },
  "the-sunken-forest": {
    "sunken forest|stumps|forest|trees":
      "Off the black eyot's south shore, in the shallow water: stumps. Hundreds of them, black and hard, cut level by the water rather than by any axe, in rows and clusters that are obviously a wood. This was dry land with trees on it. The water is what happened next.",
  },
  "the-cut-reed": {
    "cut reed|stubble|strips":
      "A stand that has been harvested, the stubble sharp as a hedge of nails underfoot and the standing crop a wall on three sides. The cutting is old but the pattern is legible — they worked in strips, and the strips run east, and following them is the first sensible piece of navigation the marsh has offered.",
  },
  "the-salt-pans": {
    "salt pans|pans|saltern|gate":
      "Shallow rectangular pans cut into the clay above the tideline, fed by a channel with a wooden gate, where the water was let in and left to go. The pans are dry and crusted white at the edges. Salt is why anybody was ever out here doing anything, and this is where it was made.",
  },
  "the-pan-house": {
    "pan house|pan|flue|boiler":
      "A shed over the biggest pan, with the iron pan itself still in it — six feet across, on a brick flue, warped and rusted through in one corner. Boiling was the last stage and the fuel was the expensive part. There is a stack of cut peat by the door, still dry.",
  },
  "the-salt-store": {
    "salt store|store|scoop":
      "A stone building with no windows and a raised wooden floor, built to keep salt dry — which, on this coast, is the hardest thing anybody ever tried to do. The floor is sound. There is a drift of grey salt in one corner, hard as rock, and a wooden scoop lying on it.",
  },
  "the-drying-frames": {
    "drying frames|frames|racks":
      "Rows of wooden frames on the shingle above the tide, tarred and standing — perhaps two hundred of them — where fish and nets were hung to dry in the wind. They creak all together when the wind comes off the water, which it always is.",
  },
  "the-net-loft": {
    "net loft|loft|nets|pegs":
      "A shed on staddle stones with a plank floor, hung wall to wall with nets on pegs — herring nets, a seine, a trammel with three walls of mesh — every one of them mended and rolled and hung properly. Whoever kept this gear was good at their work and expected to use it again.",
  },
  "the-smoke-house": {
    "smoke house|smokehouse|rods|ash":
      "A low stone building with no chimney and a door that fits badly on purpose, and inside, tiers of rods running wall to wall, black with two centuries of smoke, the smell still in the stone hard enough to taste. There is a bed of old ash on the floor and a scatter of oak chips.",
  },
  "the-tar-shed": {
    "tar shed|shed|copper|tar":
      "An open shed of blackened board with a copper set in a brick surround and a stack of split wood beside it, for boiling the tar that everything on this coast is soaked in. The copper is empty and clean. The smell has got into the ground for ten feet in every direction.",
  },
  "the-toll-board": {
    "toll board|board|figures|numbers":
      "A board on two posts, boarded and battened and painted, and the paint has gone except where it was thickest, which was the numbers. What survives is a column of figures with nothing to say what they were for. Somebody has scratched a fifth line under the last one, freehand, and doubled it.",
  },
  // THE RECORDS THAT HAD NO CLOSE LOOK (rome, 2026-11-02): the deep's, the
  // waste's and the road's, each read with its region's record under it
  // (chronicle.ts RECORDS).
  "the-lock-keepers-room": {
    "peg-board|pegboard|board|pegs|peg|tallies|tally":
      "A board of pierced oak on the wall by the window, a peg to every hole, and on each peg a twist of tarred cord knotted once for every barge that went through below. The knotted pegs run along the rows and stop partway along one. The peg after the last is still in its hole.",
  },
  "the-old-road": {
    "gibbet|hill|chain|arm":
      "One post and one arm on the rise behind the toll-house, and a chain off the arm that moves in a wind you cannot feel down here. The post is cut from the ground to head height with short strokes in fives. Nothing hangs from it now, and the count on it has not stopped.",
  },
  "the-first-milestone": {
    // `milestone|stone|names|marks` read the carved register there (lore.milestoneRead).
    "pillar|scratches":
      "Grey stone, waist-high, cut flat on the road-facing side, and the old cut on it has weathered past reading. Under it the stone is crowded with names scratched shallow by people who wanted the road to know they had come this far. Some of them have a second line under them, in a hand that is not theirs.",
  },
  "the-capstan-round": {
    "capstan round|capstan|bar holes|groove":
      "A circle of hard-trodden ground with a timber capstan at the centre, waist high, six bar-holes, and a groove worn round the base by the feet of the people who walked it. Boats were hauled up out of the water here by six men going round and round.",
  },
  "the-eel-staithe": {
    "eel staithe|staithe|grigs|landing":
      "A landing of tarred planks on posts where the creek comes closest to the track, with eel-grigs stacked under it out of the light — a dozen of them, wicker, mended. Somebody keeps this gear the way somebody kept the net loft: properly, and recently.",
  },
  // ---- THE WOOD, CLOSE (rome, 2026-11-02). The deep wood, the heart, the
  // enclosure and the holding: the household that owned this wood as a park,
  // its gatehouse works on the road, and the trades it ran and left mid-cycle.
  "the-eaves": {
    "trees|trunks|canopy|gap|road|track|light":
      "The line where the wood starts is too clean for a wood. Look along it and the trunks on the edge are the oldest ones, and there are old cut stumps just outside them, mossed level with the ground. Somebody kept this edge back from the road on purpose for a long time, and the wood has only just begun to step over it.",
  },
  "the-birch-edge": {
    "birch|birches|trees|stand|daylight":
      "Thin white trunks, all of an age, all leaning the one way. Birch is the first thing back on poor ground that has been cleared and let go. This margin was open once, and not so long ago as the oaks behind it would have you think.",
  },
  "the-bramble-margin": {
    "bramble|brambles|loops|way|edge":
      "The way through is low and round, the stems pushed aside at the height of a shoulder that is not a man's shoulder. Tufts of coarse hair are caught on the thorns along it, grey and brown. Whatever keeps it open comes through often enough that the bramble has stopped trying to close it.",
  },
  "the-deer-path": {
    "path|earth|trunks|track|line":
      "Packed so hard by hooves that rain sits on it. Slots in the soft edges, small and many, all pointing the same way, and among them one larger print with a dragged toe, going the other way. The deer use this path. So does something that uses deer.",
  },
  "the-holly-brake": {
    "holly|leaves|spines|ground|carpet":
      "The dead leaves underfoot are years deep and every one still has its spines; they keep for a long time and nothing eats them. Some of the stems in the middle are as thick as a thigh. Holly was cut here once for winter fodder, high up where the leaves go smooth, and the old cuts are still there, a long way above anything that cuts now.",
  },
  "the-nettle-glade": {
    "nettles|nettle|stems|glade|wound":
      "Nettles grow where people have been: they want the rich ground that comes from middens, ash and dung. There is nothing standing here, but under the stems the ground has the dark softness of a place that was lived on. The crushed track through them is the width of a body, not a path.",
  },
  "the-wet-hollow": {
    "pool|water|alder|hollow|mud":
      "Black water, still, with a skin of iron-coloured film where the light catches. Push a stick in and it goes down past your arm without touching bottom, and comes up stained and smelling of a drain. The alders stand back from the very edge, and they are the only trees that will stand in it at all.",
  },
  "the-ash-stand": {
    "ash|trees|trunks|stand|felling":
      "Every trunk the same width, because every one came up the same spring from the same clear-fell. Somebody took this stand down to the ground all at once, which is a winter's work for a gang and a cart road to take it away. Nobody has thinned it since. Nobody came back for the next crop.",
  },
  "the-turning": {
    "trees|trunks|opening|way|ground":
      "The trunks either side of the false opening are worn. Not cut, not blazed: rubbed smooth at about the height of a hand, the way a doorpost goes smooth, by many hands over a long time.",
  },
  "the-close-ground": {
    "trunks|stand|floor|canopy|trees":
      "The bark is scored on the near side of the closest trunks, two deep parallel lines at the height of your face, then again a little lower. They are old and healed at the edges. Something too wide for this gap has gone through it anyway, more than once, and taken the bark off both sides doing it.",
  },
  "the-swallowing": {
    "ivy|trunks|branches|trees|mass":
      "Pull the ivy aside and the trunk under it is dead. Ivy does not kill a tree quickly, but it does it, and nobody has cut it back here in a very long time. Most of the shapes overhead are ivy holding up ivy, with the wood inside them long gone to powder.",
  },
  "the-close-dark": {
    "limb|fern|split|trunks|floor|leaf-mould":
      "The limb came off cleanly at the trunk and the fern in its split is fully grown. Turn the rotten end and it is soft red heartwood, crawling with things, and under the limb the leaf-mould is dry. It fell in the dry, and nothing has moved it since, which in a wood with this much going through it is a long time.",
  },
  "the-turned-ground": {
    "ground|ridges|litter|earth|floor":
      "The ridges run in rows. Not straight rows, but rows, all the same depth and the same distance apart, and the soil turned up in them is black and fine. Pigs root like this when they are let into a wood in autumn to eat the mast, and this was somebody's pannage once. Whatever turns it now does it the same way.",
  },
  "the-wind-shorn-edge": {
    "trees|scrub|edge|lip|weather|growth":
      "Every branch on the windward side has died back at the same length, as if cut with shears. The bark is scoured grey on that side and green on the other. Nothing on this edge is younger than the wind that shaped it, and the wind has been at it a long time.",
  },
  "the-high-holly": {
    "holly|trees|crowns|trunks":
      "The lower trunks are smooth-leaved and bare of spines; holly only keeps its armour where something can reach it. On these the spines start well above your head. Something tall browsed this holly down to that line, for long enough that the trees gave up defending the bottom.",
  },
  "the-sunken-ditch": {
    "ditch|bank|leaves|silt":
      "The bank is on the wood side and the ditch is on the outside, so whatever it was dug against was meant to be kept in. That is the park's arrangement, the same one the pale uses. This edge of the wood was somebody's deer, and the ditch was the law about it.",
  },
  "the-north-turning": {
    "avenue|trees|ground|holly|line":
      "For thirty paces the trunks stand in two lines, and they are much older than the trees around them. Then the lines stop. Somebody planted an avenue toward something here, and the something was never built, or was built and taken away so completely that even the avenue forgot.",
  },
  "the-south-turning": {
    "green|trees|light|canopy|ground":
      "The first trees past the burnt ground are scorched on their east faces and whole on the west. The fire came this far and stopped against green wood that would not take. The line where it gave up is still plain in the bark, at the same height, all the way along.",
  },
  "the-crooked-stand": {
    "trunks|trees|stand|bend|leaves":
      "Every trunk kinks at about the height of a man's knee and then goes up straight. A young stand bends like that when something heavy lies on it: a deep snow, or a great fall of wet ground. Whatever it was came once, when these were saplings, and they have carried the shape ever since.",
  },
  "the-white-ground": {
    "fungus|floor|ground|white|trunks":
      "It is one thing, not many: a single growth spread over the whole stretch and up every trunk, all of it joined underneath. Lift an edge and there are threads in the soil going down further than your fingers. It is very old and very large, and it is eating the wood from below, slowly, without a sound.",
  },
  "the-leaning-wood": {
    "trees|wood|trunks|ground":
      "Look long enough and there is one thing: every trunk has a pale scar low on the same side, the bark knocked off and grown back. A cart or a sledge was dragged through here, many times, between these exact trees. There is no track now, but the trees remember the width of it.",
  },
  "the-mast-fall": {
    "mast|beech|husks|shells|nuts":
      "The husks are split and the nuts in them are empty: something has been through and taken the meat out of each one where it lay, and left the shells exactly where they fell. A whole autumn of mast, eaten in place. Whatever did it was not in a hurry and was not interrupted.",
  },
  "the-grey-thicket": {
    "scrub|stems|thicket|gap|canopy":
      "The stems are all the same thickness, because they all came up in the same few years of light and all died in the same few years of shade. Snap one and the inside is dry and pale. A fire would go through this in a breath, and nothing in it would know until it did.",
  },
  "the-turning-leaves": {
    "leaves|canopy|trees|branches":
      "The leaves that fall are whole and undamaged, gone colour from the edges in. The twigs they came from are sound. Nothing is wrong with these trees that you can find, except that they are a season ahead of every tree around them, and have been, judging by the depth of leaf under them, for years.",
  },
  "the-far-hollow": {
    "hollow|bowl|bottom|floor|trees":
      "The rim is a low bank, even all the way round, and on the inside of it the ground slopes down too evenly for weather to have done it. Something was dug out here and the spoil thrown up round the edge. Whatever was taken out was taken away, all of it, and trees have grown in the hole since.",
  },
  "the-far-birches": {
    "birch|birches|stand|light|gap":
      "The same thin white trunks as the wood's other edge, the same lean. Birch comes in on cleared ground, so this edge was cleared too, at the other end of the wood, as far from the road as the holding could reach. The holding kept both ends open, and both ends are closing.",
  },
  "the-north-marches": {
    "grass|wood|trees|ground|marches":
      "The grass is cropped short and the trees are browsed up to one height, clean underneath, like a hedge cut from below. Deer do that in numbers. It is what a deer park looks like, and it is what this was, and the deer are still keeping it for nobody.",
  },
  "the-edge-of-it": {
    "edge|line|wood|country|trees":
      "The last trees on the line have bark that is grey and pitted on the outside and clean on the inside. The wind off that open ground has been at this edge for a very long time, and nothing has grown a step further out into it in all that time.",
  },
  "the-long-glade": {
    "glade|grass|length":
      "Too straight and too even to be a glade. It was cut as a ride, a long open lane through the park for riding and for driving deer down to where somebody stood waiting with a bow. The grass is fine because something keeps it grazed. The far end is exactly where it was laid out to be.",
  },
  "the-west-ride": {
    "ride|abutments|bridge|gap|moat bank|bank":
      "The abutments are dressed stone, and there are iron pins rusted into the tops of them where a timber deck was fixed. The pins are bent, all of them, outward, the way they go when a deck is levered up off them. Somebody took this bridge up on purpose, from this side.",
  },
  "the-standing-water": {
    "water|sheet|trees|reflections|floor":
      "Under the water the ground is grass, not mud: this was dry once, and the water is new to it. Somewhere a ditch that kept this ground drained has silted up, and nobody has been along to clear it. Every year the sheet is a little wider.",
  },
  "the-boar-ground": {
    "ground|turf|saplings|soil":
      "The turf is turned in sheets the width of a broad snout, and the saplings are pushed over, not bitten off, by something leaning its weight on them to get at the roots. Bristles are caught in the bark of the larger trees at the height of your hip. Whatever works this ground comes back to it.",
  },
  "the-far-mire": {
    "mire|line|ground|trees":
      "The straight line across it is sunk a hand below the rest of the surface, and under the moss there are logs laid side by side. Somebody built a trackway over this mire, a long time ago, and the logs are still taking the weight of whatever walks it.",
  },
  "the-stew-pond": {
    "pond|sill|stone|mud|leaf-mud|fish":
      "The stone sill has a slot cut in it for a board to hold the water back, and grooves in the slot where the board slid up and down. A stew pond holds fish alive until a feast day. The board is gone. The last fish in here were never wanted.",
  },
  "the-sunken-lawn": {
    "lawn|grass|edges|ground|rectangle":
      "The edges are cut square and there are the stubs of a low wall at two of the corners, too low to keep anything in. This was a garden, sunk so it could be looked down on from the house. The grass is still kept short, and it is not people keeping it.",
  },
  "the-broken-avenue": {
    "beech|beeches|avenue|trees|line":
      "Every fallen tree went down to the north-east, and every one tore its roots out whole. One wind, one night. The ones still standing are the same age as the fallen and no stronger. They are only the ones the wind happened not to choose.",
  },
  "the-holly-hedge": {
    "hedge|holly|stems":
      "Look along the base and the old stems are cut half through and bent over, then grown up again from the bend, the way a hedger lays a hedge. Every few yards a stake was driven to hold the line. The stakes are long gone; the bends are still there, and the hedge has kept the shape it was taught.",
  },
  "the-ash-heap": {
    "ash|heap|mound|clinker|nettle":
      "Dig a hand in and it is all fine white ash with lumps of clinker in it, and a bone, and a broken pot rim. This was where a household put out its hearths every morning, for years. The nettles round it are the richest green in the wood.",
  },
  "the-fish-house": {
    "tanks|tank|vault|building|water|stone":
      "Three stone tanks, each with a lip cut to let water run from one to the next, so fish could be graded and held. The stone of the vault is sweating cold. Something is moving in the middle tank, low down, where the light does not reach; it moves when you lean over, and then it is still.",
  },
  "the-still-pool": {
    "pool|water|surface|roots":
      "No insect touches it and nothing rises in it. Drop a leaf and it lies on the surface without a ripple spreading. It is water, and it is cold, and it is so clear that the bottom looks close, and it is not close.",
  },
  "the-thorn-waste": {
    "thorn|scrub|ways|ground":
      "The ways through it are low, round-topped, worn smooth underneath, made by animals going on their bellies. Hair hangs on the thorns along every one of them. A man can go through, bent double and torn, at the pace of whatever made the way, and no faster.",
  },
  "the-broken-ground": {
    "pits|pit|heaps|heap|ground":
      "The heaps are spoil from the pits, and the pits are all the same size, as if dug to a measure. Somebody was looking for something under the ground across a wide area, one hole at a time, in no order. It is the work of people who knew it was here and did not know where.",
  },
  "the-gorse-brake": {
    "gorse|brake|growth|flowers":
      "The dead growth under the living gorse is tinder-dry and goes down a foot. Gorse burns hot and fast and comes back from the root, and the old people used to fire it on purpose to keep heath open for grazing. Nobody has fired this in a long time. It is waiting.",
  },
  "the-paved-road": {
    "road|flags|paving|stones|grooves|grass":
      "The grooves are worn a hand deep into the flags, and the distance between them is a cart's width, the same at every stone. Heavy carts, loaded, for a long time. The road was made to carry something out of here, and it carried it.",
  },
  "the-road-ruts": {
    "ruts|turf|road|prints|tyres":
      "The ruts are iron-cut, the edges sharp where a rim bit down. Down in the bottom of them, the most recent marks are not wheels. Hooves and pads and something with a long dragging toe, all using the road the carts made, going both ways.",
  },
  "the-outer-ditch": {
    "ditch|sides|works|bank":
      "The sides are cut at an angle a man cannot run up and has to climb. The bottom is flat and grassed and has the long low mounds in it of things that fell in and stayed. This ditch was dug to be fought over. Somebody expected to have to.",
  },
  "the-counterscarp": {
    "counterscarp|bank|stone|ditch|facing":
      "The facing stones that have fallen lie in the ditch below, and the ones still standing are scored along their top edges by something sharpened against them, over and over. Men stood here a long time with nothing to do but watch the ditch and keep an edge on.",
  },
  "the-barbican-footings": {
    "footings|stone|outwork|gap|road|walls":
      "The squared stone has iron stubs leaded into its top course, where a gate or a grille was hung across the road in front of the arch. The lead has been chiselled out of most of them. Somebody came back for the metal, and took their time about it.",
  },
  "the-killing-ground": {
    "ground|grass|open|trees":
      "The trees round the edge stand back in a line, and the stumps of their forebears are just inside it, cut off at the ground. Somebody felled every tree that tried to take this ground, for years, so that nothing could cross it unseen from the wall. The wall is gone and the line has held.",
  },
  "the-guard-footings": {
    "footings|hearth|hearthstone|stone|post":
      "The hearthstone is cracked across from heat and black to a hand's depth. Somebody kept a fire in this post every night of the year, to stay awake as much as to stay warm. The doorway faced the road, and the stone of its sill is worn in the middle where one man stood, always in the same place.",
  },
  "the-pay-stone": {
    "stone|hollow|coin|edge":
      "The hollow is worn glassy, and at the bottom of it, pressed into a crack, there is the green edge of a coin too corroded to read. The toll was paid here before you went under the arch. This is the last one anybody left.",
  },
  "the-mounting-block": {
    "block|steps|step|stone":
      "The top step is hollowed on the left side only, by a left foot going up into a stirrup, many thousands of times. The steps face the arch. Whoever mounted here was setting out from the holding, not arriving at it.",
  },
  "the-outer-bailey": {
    "bailey|banks|bank|enclosure|grass":
      "Under the grass along the inside of the bank there are the low squares of footings, a long row of them: stables, stores, the sheds a gatehouse keeps its life in. They are evenly spaced and all the same size. Somebody planned this yard before they built a thing in it.",
  },
  "the-bailey-wall": {
    "wall|walk|ivy|stone":
      "The stones on the walk are worn hollow in a line along the inside of the wall, a single path a foot wide, by a single round walked over and over. Somebody kept a watch along this wall for longer than the wall has had ivy on it.",
  },
  "the-rampart-walk": {
    "walk|bank|rampart|curve|ditch|grass":
      "The grass on the crest is worn into a narrow path that goes all the way round and is still worn. Something walks this round still, every night, at the same steady pace, and the turf has never had the chance to close over it.",
  },
  "the-old-palisade": {
    "palisade|stakes|stake|bank|oak":
      "The stakes still standing are black and hard, and each one has the axe-marks of its point still sharp on it. They lean outward because the bank has crept under them, slowly, over a very long time. Not one of them has been knocked over by anything coming in.",
  },
  "the-ward-ditch": {
    "ditch|water|sides":
      "Narrow enough to jump if you were not wearing anything, and deep enough to drown in if you were. There are iron hooks set in the inner face low down, below the waterline, rusted to points. Nobody was ever meant to come up out of this ditch on the inside.",
  },
  "the-turning-bay": {
    "flags|paving|arc|bay|fan|wheels":
      "The fan of flags is worn in a single deep arc, all carts swinging the same way: left, round, and back out along the road. Nothing ever came the other way and turned here. The holding sent carts out. It did not send them back in.",
  },
  "the-tilt-yard": {
    "yard|strip|banks|ground|grass":
      "Halfway along there is a line of post-holes down the middle, filled with darker soil, where a barrier ran to keep the horses apart. At one end the bank has a seat cut into it, turfed and level, for whoever was watching. One seat.",
  },
  "the-horse-pond": {
    "pond|cobbles|ramp|water|hoofprints|prints":
      "The cobbles on the ramp are worn into a groove down the middle by hooves going in and coming out. The fresh prints at the edge are cloven, and they go in and do not come back out on this side.",
  },
  "the-boundary-cross": {
    "cross|shaft|mark|stone|arms":
      "The mark cut into the shaft is a crown over three notches, the cuts deep and square. The arms of the cross were struck off with a hammer, and the marks of the hammer are on the stumps. Whoever broke it took the cross off the stone and left the mark on it.",
  },
  // ...the worked wood, the felling the holding left mid-stroke; the sunken
  // wood, an older country the ground came down over; and the heath.
  "the-outer-scrub": {
    "thorn|birch|scrub|ground|gaps":
      "The thorn is grazed flat on top and dense below, the shape scrub takes where animals feed on it all year. The birch among it is young. This was all open grazing once, and the scrub is the wood walking out over it, a few feet in a lifetime.",
  },
  "the-fallen-wall": {
    "wall|stones|stone|boundary":
      "Where it still stands the stones are set with their long faces inward and a through-stone every yard, which is a waller's trick and takes a good waller. Moss has sealed the joints. The trees growing through it came up after the last time anybody mended a gap.",
  },
  "the-bracken-edge": {
    "bracken|ground|trees|sea":
      "Bracken comes in where trees have been taken and nothing was replanted. Push it apart at the base and there are stumps under it, rotted soft, at even spacing. The light got in here because a felling let it, and the bracken has held the ground against the trees ever since.",
  },
  "the-north-ride": {
    "ride|cut|grass":
      "Forty feet is wider than a timber road needs. It is the width you cut to let mounted men drive deer along it in the open toward a line of bows. Every so often there is a low mound on the verge, grassed over: the stands where somebody waited.",
  },
  "the-thin-soil": {
    "rock|stone|trees|roots|soil":
      "Where the bare rock shows through it is scored with old grooves, straight and parallel, and in one place a squared notch: somebody quarried here, just a little, for a wall or a hearth, and then the trees came back over the scar. The roots have followed the cuts into the stone.",
  },
  "the-far-north-turning": {
    "oaks|trees|wood|ground":
      "The trunks here carry no marks at all: no blaze, no scar, no browse line, no bark rubbed off at the height of anything. It is the first stretch of the wood where nothing has touched the trees in living memory, and that is the whole of what is strange about it.",
  },
  "the-bracken-sea": {
    "bracken|trunks|ground|way":
      "Under the fronds the stems are thick as a finger and set close, and between them there are runs, low, the height of a fox. The bracken hides everything that lies down in it. You are the only thing out here walking upright.",
  },
  "the-pine-dark": {
    "pine|pines|rows|needles|branches|floor":
      "Planted, and the rows are dead straight in two directions. Pine is not this country's tree: somebody brought it in and set it for a crop that grows fast and straight, and then never cut it. The lower branches have died off for want of light and nobody brashed them.",
  },
  "the-windfall": {
    "trunks|root-plates|roots|stand|trees":
      "Every trunk lies pointing the same way. Some of them have been cut through with a saw where they blocked the way, and the cut ends are grey and checked and old: somebody started clearing this, a few trunks in, and stopped.",
  },
  "the-empty-ride": {
    "ride|grass|ends|wood":
      "At both ends the standing wood is younger than the wood around it. The ride did go somewhere once, both ways, and the trees have grown back over its ends faster than over its middle, where something still grazes. Somebody stopped keeping this ride open from the ends inward.",
  },
  "the-lichen-wood": {
    "lichen|beards|branches|trees":
      "The beards are longest on the oldest branches and absent from the youngest, so you can read the age of every limb by it. Lichen like this takes generations. Nothing has disturbed this stand in all that time, not a fire, not a felling, not a smoke from anybody's hearth.",
  },
  "the-thin-birches": {
    "birch|birches|trees|stems":
      "A crop that came up thick after a clear-fell and was never thinned. A forester would have cut nine in ten of these and left the rest to grow. Nobody came back to do it, and now they are choking each other at the same slow rate.",
  },
  "the-old-burn": {
    "charcoal|burn|trunks|litter|ground|scar":
      "Every mature trunk is blackened on its west side to the height of your chest, and only on that side. The fire came through from the west with the wind behind it. The charcoal in the litter is fine and even, a ground fire, fast and low, the kind people used to set on purpose.",
  },
  "the-holly-maze": {
    "holly|walls|passages|floor|maze":
      "The swept floors between the walls are swept by something that lies in them: the dead leaves are pushed to the edges, the ground in the middle pressed smooth. More than one bed, in more than one blind end. Things that want to be hard to reach sleep in here.",
  },
  "the-dry-gully": {
    "gully|stones|watercourse|lips|bed":
      "The stones in the bed are rounded and graded, big to small, downstream, the way running water leaves them, and moss has grown across the tops of the biggest. Upstream, where the gully should begin, the bank has been cut and filled. Somebody turned this water away, deliberately, to somewhere else.",
  },
  "the-open-canopy": {
    "crowns|canopy|light|columns|tangle":
      "The gap overhead is the shape of a tree that is not there. Its stump is in the tangle, sawn level, and the saw-cut is clean. It was felled and taken out whole, for its size, and nothing has grown up yet to fill the hole it left in the roof.",
  },
  "the-deer-lawn": {
    "grass|lawn|trees|line|browse line":
      "The browse line is level to a hand's width all the way round. Deer graze a lawn like this only when there are enough of them that every mouthful is taken the day it grows. The park this was is gone. The herd that kept it is still doing the job.",
  },
  "the-sunken-wood": {
    "ground|trees|canopy|floor|bank":
      "The bank is not a slope. It is a face, near vertical, with layers in it: leaf-mould, then black soil, then a band of old ash, then soil again. The ground up there built up over this a hand at a time, and somewhere in the middle of it, once, everything burned.",
  },
  "the-under-eaves": {
    "light|canopy|green|leaves":
      "The undergrowth down here is all one plant, broad-leaved and limp, of a kind that grows in deep shade and nowhere else. It has spread across the whole floor from somewhere and has not met a single competitor on the way.",
  },
  "the-cold-seep": {
    "seep|seeps|water|clay|bank":
      "The water comes out of the bank along one level line, at the same height in all its dozen places. That is the line where the ground above meets something it cannot soak into. The clay floor is printed with small cloven feet, all of them coming to drink.",
  },
  "the-earth-fall": {
    "earth|bank|slope|trees|roots|hole":
      "In the raw face where the bank came away there is a line of squared stones, a course of something built, cut through by the fall and showing for the first time in a very long time. Earth is still trickling from round them.",
  },
  "the-white-roots": {
    "roots|root|bank|curtain":
      "The roots are white because they have never been in the light. Touch one and it is cold and wet and alive. Some of them have been gnawed through at the height of a crouching animal, and the cut ends have healed into knots.",
  },
  "the-slip": {
    "clay|slope|marks|slip":
      "The scoring in the clay is claw marks, long and dragged, going down. Not one set goes up. Everything that came down this way went on along the bottom and found its own way out, or did not.",
  },
  "the-lost-stand": {
    "trees|stand|trunks|bank|steps":
      "The bark is deeply ridged and the trunks are wider than any up above. These are the trees that stood on the old ground before it went down, and they came down with it standing. Their crowns are level with the young wood's now, and they are a great deal older.",
  },
  "the-green-dark": {
    "light|green|dark|trees":
      "Hold your hand up and it is green; so is your other hand, and the bark, and your breath when it is cold. The colour gets into everything down here. After a while you stop seeing it, which is when it is most useful to remember.",
  },
  "the-bottom-of-it": {
    "water|clay|floor|trunks":
      "The water is an inch deep everywhere and flat as a table, and the clay under it holds every print that was ever made in it. Most of the prints are blurred by time under the water. A few are sharp. They come in and they wander and they leave.",
  },
  "the-old-ditch": {
    "ditch|banks|earth|bank":
      "The sides are cut with a spade, square, and there is a little stone revetting at one corner, the same rough work as the lower ditch. Someone drained this ground when it was the top of the world. The world has gone up fifteen feet since, and the ditch is still draining it.",
  },
  "the-lower-ditch": {
    "ditch|cut|stone|revetment|revetting":
      "The revetting is laid dry, the stones chosen to fit rather than cut, by people who had all the time in the world and no mortar. Water still runs in the bottom of it, slowly, the way it was set to run.",
  },
  "the-black-loam": {
    "loam|soil|roots|print|prints":
      "Fine as flour and black as soot, and it takes a print so well that you can read the grain of a boot sole in yours. It is the floor of a burned place, years of ash gone to soil. Some of the prints in it are bare feet, small ones, and very old, and the soil has kept them.",
  },
  "the-drip-line": {
    "water|pools|threads|roots|ceiling":
      "Each pool is worn exactly under its own drip, a hand deep, smooth-sided, the size of a bowl. A hundred bowls, filled for longer than anything up there has been alive. The water is clean and tastes faintly of iron and of earth.",
  },
  "the-old-course": {
    "riverbed|river|gravel|banks|bed|course":
      "The gravel is clean and sorted and the banks are cut steep on the outside of every bend. In one bank there is a line of old stakes, driven in a row, where somebody built a fish weir across this river when it ran. The stakes are still standing. The river is not.",
  },
  "the-low-sump": {
    "water|sump|middle":
      "The water is black and does not move, and does not reflect much either. At the edge the clay goes down at a steady slope and keeps going. A stick pushed in at arm's length finds nothing, and comes back up with a smell on it that stays on your hand.",
  },
  "the-tree-fall": {
    "tree|trunk|fungus|roots|wood":
      "It came down through the roof of roots with its crown first, and its own roots are still up there in the ceiling, holding. It is dead, and it is still holding up its own small part of the wood above, and the fungus is slowly taking that job away from it.",
  },
  "the-buried-lane": {
    "lane|track|banks|ruts|floor":
      "The ruts are narrow: a smaller cart than the holding ever used, on smaller wheels. In the bank on one side there is a gatepost, stone, with the iron of a hinge rusted into it. Somebody's lane, to somebody's gate, with a wood fifteen feet thick laid over the lot.",
  },
  "the-under-roots": {
    "roots|ceiling|mat|columns|floor":
      "The columns are roots grown down to the floor and thickened into trunks of their own, and they take the weight. In one of them there is a nail, iron, driven in when the root was a sapling's root and swallowed since. Someone was down here when this was still the surface.",
  },
  "the-grey-scrub": {
    "scrub|line|wood|edge":
      "The line where the wood begins again is too straight for any wood to grow. There are the low stumps of a bank along it, worn down almost to nothing. It was a boundary, and the trees were kept back to it on one side and let grow on the other, until there was nobody left to tell them which side was which.",
  },
  "the-sand-cut": {
    "sand|face|holes|martin holes|spoil|cut":
      "The face is cut square, and there are pick marks in it still, low down where the weather has not reached. Somebody dug sand here by the cartload, for mortar or for a floor, and the cut has been left long enough for the martins to own it.",
  },
  "the-heath-edge": {
    "heather|sand|scrub|heath|edge":
      "The heather is all one age and all one height, which means it was burned off together not so long ago and came back together. Heath is kept by fire and grazing. Something is still burning this ground, or something did until recently, and grazing it, and it has not been the weather.",
  },
  "the-stunted-oaks": {
    "oaks|trees|trunks|heather":
      "The trunks are thick and the crowns are flat and the bark on the windward side is cropped short. They are as old as anything in the wood and they have never once been allowed to grow up, by wind, by sand, and by teeth, all three.",
  },
  "the-rabbit-warren": {
    "warren|burrows|holes|sand|turf|rise":
      "The rise is not a hill. It was built, a long low mound of sand heaped up on purpose and turfed, for rabbits to burrow in and be harvested from. Rabbits were somebody's property here, kept and counted and netted. The rabbits never heard that the owner was gone.",
  },
  "the-dry-heath": {
    "heath|wind|sky|ground":
      "The ground is sand under a thin skin of heather root, and it blows where the skin has broken. In the hollows there are flints, and among the flints, here and there, a worked one, as if the heath had been walked by people a very long time before anything else was here.",
  },
  "the-pale-grass": {
    "grass|tufts|sand|ground":
      "The tufts stand on little pillars of sand, each one held up by its own roots where the wind has scoured the ground away round it. Nothing has trodden here because there is nothing here to tread toward. The wind keeps the place exactly as empty as this.",
  },
  "the-wind-gap": {
    "saddle|sand|stone|rise|gap":
      "The stones on the saddle are polished on the windward faces and rough on the others, by sand driven over them for a very long time. One of them has been stood on end, a long time ago, and the wind has polished it too, all down the side that faces west.",
  },
  "the-wolf-earth": {
    "earth|mouth|beech|roots|bone|bones|hair|floor":
      "The bones are deer, mostly, and every long bone has been split for its marrow by jaws, not tools. The hair in the drifts is grey and it is a great deal of hair. More than one animal has slept here, for more than one year, and the earth has been dug wider for every new litter.",
  },
  "the-felling-edge": {
    "line|trees|stumps|rows|ground":
      "The rows are surveyed: each stump is a fixed number of paces from the next, and the first row runs dead straight along the edge of the standing wood. A felling worked like this is on a rota, a bay a winter, and there is a plan somewhere of which bay comes next. The next bay is still standing.",
  },
  "the-stump-field": {
    "stumps|stump|saplings|ground|field":
      "Every stump is cut at knee height and every cut slopes so the rain runs off it. The fellers knew their trade. Very few saplings, which means the deer have eaten what came up, year after year, because nobody fenced the felling as they ought to have.",
  },
  "the-hauling-ride": {
    "ride|ruts|chains|floor|water":
      "The ruts were cut by trunks dragged on chains behind horses, and here and there in them is a link of chain, broken off and rusted to a lump. They all run toward the road. Every tree that came down in the felling went out this way and was never seen again.",
  },
  "the-brash-heaps": {
    "brash|heaps|heap|branches|bramble":
      "The brash is laid in long windrows, as a gang lays it, to rot down and keep the deer off the young growth. Something has dug a way into the biggest heap and lives in it, and the way in is worn smooth with use.",
  },
  "the-saw-pit": {
    "pit|boards|water|dog-iron|iron":
      "The dog-iron is still driven into the edge timber where it held the log steady, and it has a second one beside it with the log gone from between them. The last trunk was sawn, lifted out, and carried away, and the men who sawed it did not bother to take their irons.",
  },
  "the-sawdust-floor": {
    "sawdust|floor|ground|prints":
      "Under the top inch the sawdust is still pale and still smells of fresh oak, kept from the air. Years of it. This was the busiest yard in the wood, and the prints in it now are cloven and padded, and one set goes round and round, the same circle, as if something paced here.",
  },
  "the-skid-road": {
    "logs|road|mud|timber":
      "The logs are laid with the bark still on, which means they were thrown down in a hurry to get one heavy load out over soft ground, and never replaced with anything better. The road went toward the hauling ride. It was used once, hard, and left.",
  },
  "the-axe-stumps": {
    "stumps|stump|ring|middle":
      "The stumps in the ring were felled outward, all of them, away from the centre. Fellers drop trees away from what they want to keep. Whatever was in the middle, they cut a ring round it and left it standing, and it is gone now without any stump to show where it was.",
  },
  "the-bark-strip": {
    "bark|sheets|trunks|ground":
      "Oak bark, peeled in the spring when the sap runs and it comes off whole, for the tanners' pits. Tons of it. It was stacked to dry and the stacks have fallen, and nobody carted a sheet of it away. Bark was worth money once. It was left lying like it was not.",
  },
  "the-cord-stacks": {
    "cords|cord|stacks|stakes|firewood|mounds|fungus":
      "Cut to a length, split, and stacked a cord at a time, which is the measure a buyer pays by. The stacks were counted and sold standing, before they were ever carted. Somebody was owed this wood. It is still here, rotting where it was measured out.",
  },
  "the-sawyers-bench": {
    "bench|trestle|whetstone|chips|clearing":
      "The whetstone is worn into a deep saddle from a lifetime of one blade. The bench is set so that whoever sat on it had their back to a big oak and could see every ride into the felling. It was the place a foreman sat, and the chips round it are the last chips anybody split here.",
  },
  "the-wedge-ground": {
    "wedges|wedge|iron|grass|logs":
      "Iron wedges, each one mushroomed at the head from years of the maul. Iron was dear. A felling gang that leaves its wedges on the ground does not mean to be away long. There are dozens of them here, every one exactly where it was put down.",
  },
  "the-split-oak": {
    "oak|trunk|halves|wedges|tree":
      "The wedges are still in the split, driven home, and one of them has a maul-head lying beside it in the grass with its handle rotted away. Somebody drove the last wedge, the trunk sprang open, and then they put the maul down and went. The halves have been lying here ever since, waiting to be sawn.",
  },
  "the-coppice-stools": {
    "hazel|stools|stool|poles|stems|thicket":
      "Every stool has a ring of poles all the same age, because they were all cut the same winter and all grew back together. In the middle of some stools there is a stub of the pole before, cut on a slant. Seven years between cuts, for longer than anybody could count, and then not again.",
  },
  // ...the carr and the osier holt, the wet half of the holding's trade; the
  // bears' caves; and the moon's ground behind the door.
  "the-alder-carr": {
    "alder|alders|roots|water|ground":
      "Alder is the one tree that likes its feet wet, and its wood does not rot under water, which is why it was cut for piles and sluice-boards. These have been cut before: every big tree is three or four trunks from one old stool. Nobody has cut them in a long while.",
  },
  "the-mire-edge": {
    "mire|moss|line|skin|carr":
      "The straight line across the moss is a darker green, sunk a little, the moss there crushed and grown back and crushed again. It is a way somebody knew. It goes straight because whoever walked it first knew where the firm ground ran underneath, and nothing has walked it any other way since.",
  },
  "the-black-alders": {
    "alders|alder|bark|ground|water|roots":
      "The black below the knee is a tidemark: the water stands that high every winter and stains everything it touches. On one trunk, just above it, there is an iron staple driven in and rusted, with a scrap of rope rotted to a ring round it. Something was tied here at the waterline once.",
  },
  "the-sodden-ground": {
    "ground|prints|wood":
      "Your prints fill from below with clear water, and so do the older prints around them, which are larger and further apart. Something heavy crosses here regularly and does not slow down for it, and the ground has no memory of it for longer than it takes to drink the print back.",
  },
  "the-reed-break": {
    "reeds|reed|stand|stems":
      "Reed grows in open water, not in woods, which means this was open water once, and the trees have come in round it and up through it since. The reed has never let go. Cut stems at the base, old and grey, show it was harvested for thatch, a long time ago, by people who came in here with sickles.",
  },
  "the-drowned-roots": {
    "roots|water|arches|bottom":
      "The roots under the water are pale and soft, and they are not all roots. Some of them are timbers, squared, lying side by side in the bottom, gone the same colour as everything else. There was a way across this once, built of wood, and the water has had it.",
  },
  "the-blind-corner": {
    "trees|wall|pocket|gap|floor":
      "The floor of the pocket is bare and smooth, and in the middle of it the earth is pressed flat in a long oval, warm-smelling. Something lies up in here, facing the gap. It has chosen the one spot in the wood where nothing can come at it except straight in.",
  },
  "the-willow-margin": {
    "willow|willows|ground|margin|water":
      "Every willow on the margin has been cut back at some time and has grown again from the cut, in three or four stems. Willow is cut and comes back, cut and comes back, for as long as somebody keeps cutting. These have had one growth too many since the last time.",
  },
  "the-old-pond": {
    "pond|sill|stone|weed|water":
      "The stone sill has a lip cut in it to the exact level the pond was meant to stand at, and a groove where a board could raise it. The pond is still at that level, give or take, the same water finding the same lip. It is the only thing in the carr still doing what it was told.",
  },
  "the-flood-meadow": {
    "meadow|grass|tidemark|twigs|water|edge":
      "The tidemark is a line of twigs and seed and dead reed at knee height all round the edge, and some of what is caught in it was not grown here: a scrap of rope, a splinter of painted board. The winter water comes in from somewhere with people in it, or had people in it.",
  },
  "the-south-ride": {
    "ride|channel|water|cut":
      "Forty feet, the same as the north ride, cut by the same hands for the same driving of deer. At this end the water got in and nobody dug it a drain, so the south ride is a ditch now with grass at the edges, and the deer go along the edges.",
  },
  "the-black-mud": {
    "mud|ground|record|prints|grease":
      "The prints overlap so thickly that only the newest can be read: cloven, padded, cloven again, and one long sliding mark where something lost its footing and caught it. Every animal that crosses this part of the carr crosses at this exact place. It is the only firm bottom for a long way either side.",
  },
  "the-drowned-holly": {
    "holly|leaves|water":
      "The water is new to the holly: the dead lower leaves still have their spines and the trees are old and full-grown, rooted on dry ground. Something blocked a drain or a stream somewhere and the water came back up over a holly stand that was here before it.",
  },
  "the-far-south-turning": {
    "water|trees|wading":
      "The water is the same temperature as the air and the same colour as the shade, and it has no current. Nothing marks where it gets deeper, and the trees grow out of it at the same spacing whatever its depth. The carr is the same in every direction you choose.",
  },
  "the-willow-break": {
    "willow|thicket|stems":
      "Every stem in the thicket comes up from a cut stool, and the stools are in rows under the water. This was a planted holt that has run wild, and it still stands in its lines below the surface while it goes every way it likes above it.",
  },
  "the-flooded-ride": {
    "ride|water|cut|trees|line":
      "The ride is straight because it was laid out with a line, and it is flooded because the drain that ran beside it has filled in. Under the water the grass of the ride is still there, drowned, and it is still short.",
  },
  "the-black-pool": {
    "pool|water|edge|canopy":
      "The edge goes down so steeply because it was dug. A pool this size and this deep, square-ish under the weed at the near side, was cut for clay or for fish or for a reason nobody wrote down. The water in the middle has no bottom you could reach and no reason to be this still.",
  },
  "the-sedge-flat": {
    "sedge|tussocks|tussock|water":
      "Each tussock is a hundred years of sedge growing up on its own old leaves, a pillar of it standing out of the water. The water between is soft-bottomed and holds nothing. Animals cross here tussock to tussock, and the tops of the best footings are trodden flat.",
  },
  "the-leaning-alders": {
    "alders|alder|stand|ground":
      "They lean all one way because the ground under them is moving, a fraction a year, downhill toward the wetter carr. Their roots are pulled out of the bank on the upslope side in a long raw line. The whole stand is walking slowly into the water, still in leaf.",
  },
  "the-quaking-ground": {
    "ground|raft|moss|roots|water":
      "Push your hand through the moss and there is water underneath, black and cold, and nothing under that your hand can find. The raft is roots holding moss holding roots. It takes your weight because it takes the trees' weight, and it moves when they do.",
  },
  "the-silted-pond": {
    "pond|silt|mud|water|prints":
      "The mud is grey and smooth and it swallows a stick to the hand without stopping. The prints that go in and do not come out lead toward the middle and stop there, all of them at about the same place, where the mud is perfectly flat.",
  },
  "the-rush-bed": {
    "rush|rushes|stand|water":
      "Soft rush was cut and dried to make rushlights, the pith dipped in fat to burn in a house that could not afford candles. Some of the stems at the edge are cut off short and square, old cuts. Somebody gathered light from here, a bundle at a time.",
  },
  "the-frog-chorus": {
    "frogs|frog|noise|water|chorus":
      "The water is full of spawn in the shallows, and the edges are trodden by herons and worse. The frogs stop for you because they stop for anything that stands up, and here, nearly everything that stands up is hunting them.",
  },
  "the-sunk-fence": {
    "fence|posts|post|wire|water":
      "The posts are split oak and driven deep, and each one has the staples still in it where the wire ran, three to a post. Wire fencing was the late attempt at this wood, after the old pale had failed, and the water came up over that too.",
  },
  "the-brown-water": {
    "water|brown water":
      "The colour is peat, washed out of somewhere further up, and it does not settle. Cup some and it is clear brown in the hand and smells of nothing much. It is clean water. It is only that you cannot see through it, and neither can anything else.",
  },
  "the-moon-glade": {
    "glade|grass|trees|ground":
      "The trees round the edge lean outward, all of them, and the lean is old: every trunk grew that way from a sapling. Nothing has cropped the grass and nothing has trodden it. It is the only grass in the wood that has never been eaten, and it is kept, but not by teeth.",
  },
  "the-withy-holt": {
    "holt|willow|rows|stools|rods":
      "The rows were planted along lines a pace apart, and the lines are surveyed straight. An osier holt is a crop, cut every winter, and this one fed a trade. The rods have run on for many winters since, and are too thick now for anything but firewood.",
  },
  "the-cut-osiers": {
    "osiers|rods|stools|shoots|cut ends|ends":
      "The cut ends are all at one height because the cutter worked along the row bent at the same angle, rod after rod, a whole winter's work. The last winter anybody worked the holt, they worked it right up to this row and stopped.",
  },
  "the-soaking-pit": {
    "pit|water|bundle|twine|rods":
      "The bundle stood upright in the water to soak, as it should, ready to be lifted out, peeled and bent. Nobody lifted it. It has stood in its pit through every winter since, rotting from the waterline down, still tied.",
  },
  "the-willow-stools": {
    "stools|stool|willow|stumps|water":
      "A willow stool this wide is a great many cuttings old: every winter the rods were taken and the stool grew a little fatter. These were cut for longer than anything else in the holt. They are the oldest work in the whole wet half of the wood.",
  },
  "the-bundle-ground": {
    "bundles|stakes|grass|ground":
      "The stakes are set in a row, a bundle's width apart, to stack against. The grass under where the bundles lay is pale and short, not because they were lifted yesterday but because they lay there so many seasons that the ground underneath has never recovered.",
  },
  "the-wet-ride": {
    "ride|willows|water|rows|light":
      "The ride was cut so a cart could get between the rows at cutting time. The ruts are still in the bottom under the water, two straight grooves. The water came in after the carts stopped coming, and has never been out since.",
  },
  "the-pollard-line": {
    "pollards|pollard|willows|willow|trunks|heads|drain":
      "The hollow trunk somebody slept in still has a bed of dry rushes in it, pressed flat, and a ring of soot on the inside wall where a small fire was kept. The rushes are old. Whoever slept there did it more than once, and kept the fire small.",
  },
  "the-holt-drain": {
    "drain|plank|weed|sides":
      "The plank across the drain is sawn, not split, and it has a cleat nailed across its middle for a foothold. The drain kept the holt from going back to carr. Every season it runs a little slower, and every season the carr comes a little further up the rows.",
  },
  "the-osier-carr": {
    "carr|willow|alder|sedge|rows|water":
      "Under the wild growth the old rows are still there, if you look along the ground and not up: straight lines of stools gone to fat knuckles in the water. The holt came this far. The carr has taken it back, one row at a time, from the wet end in.",
  },
  "the-peeling-bank": {
    "bank|bark|heaps|mould":
      "The peeled bark has rotted down into a bank of fine brown mould, knee-deep, and the bank under it is firm because generations of peelers stood here. In the mould there are the iron hoops of a brake, the forked tool rods were pulled through to strip them, rusted to nothing.",
  },
  "the-basket-ground": {
    "baskets|basket|grass":
      "The half-made baskets are laid in a row, each one at a different stage, as if a group of people had been working on them together and all stopped at the same moment. The last rods woven into each are pushed in and not yet beaten down. They were coming back to them.",
  },
  "the-withy-drain": {
    "sluice|boards|drain|pool|mud":
      "The boards are slotted into stone grooves, one above another, so the level could be raised a board at a time. The top board is missing from the groove. It was lifted out, on purpose, once, and never put back, and the pool has been standing at that one board's height ever since.",
  },
  "the-ridge-cave-mouth": {
    "mouth|rock|ferns|ground|cave":
      "The bare ground inside the mouth is trodden into a path that keeps to the left wall. The ferns over the lip are torn on that side, at a height well over your head. Whatever comes and goes here is tall and keeps to one side out of habit.",
  },
  "the-ridge-cave-drop": {
    "slope|stone|floor|drop|roof":
      "The polish on the left of the slope is a long dark smear on the stone, worn into it by a body going down the same line on all fours, many times. Down in the polish there are scratches, short and deep, where it braced.",
  },
  "the-ridge-cave-fork": {
    "pillar|rock|passage|hole|fork":
      "The grease on the pillar is grease from fur, rubbed on at the height of a shoulder going by, and it is thick enough to hold a thumbprint. Coarse brown hairs are caught in it. Both ways round the pillar are equally worn. Whatever lives here uses both.",
  },
  "the-ridge-cave-pocket": {
    "bones|bone|skulls|skull|pocket|larder":
      "The bones are in layers: the bottom ones are brown and crumbling, the top ones still pale. On a good many of them there are the long grooves of teeth, wide-set. This pocket has been used as a larder by one animal after another, for a very long time, each one finding it already stocked.",
  },
  "the-ridge-cave-squeeze": {
    "squeeze|roof|rock|hair|passage":
      "The hair on the roof is caught along a single line where a broad back has scraped through, over and over, until the rock is polished brown. Something that size comes through here on its belly and does not mind it at all.",
  },
  "the-ridge-cave": {
    "cave|chamber|walls|grooves|floor|bracken":
      "The grooves on the walls are claw marks, in fours, and the highest of them are well above where you could reach with an arm stretched up. Some are old enough to have been softened by the drip. Others are clean-edged and new. The bracken on the floor has been carried in an armful at a time.",
  },
  "the-oak-cave-mouth": {
    "oak|mouth|split|rock|roots|bark|threshold":
      "The bark of the oak beside the mouth is clawed through in long strips, and the wood under the strips is grooved in turn. The newest marks still show pale, and above them the oldest have grown over into raised scars. The tree has been marked here for longer than you have been alive.",
  },
  "the-oak-cave-crawl": {
    "crawl|roots|earth|stone|ceiling":
      "The roots coming through the ceiling are worn on their undersides where something has pushed past them on its back, again and again. The earth on the floor of the crawl is packed hard. It has never been anything but a way in and a way out.",
  },
  "the-oak-cave-hall": {
    "hall|dirt|floor|scoops|corner|roof":
      "The scoops in the corner are dug and abandoned, dug and abandoned, a dozen of them at different ages. Something has tried to make a bed here for years and never settled, and has gone on west every time to the one place it will sleep.",
  },
  "the-oak-cave-neck": {
    "neck|throat|rock|bone|sides":
      "The bone in the middle of the neck is a deer's thigh, split for the marrow and laid down exactly in the centre of the passage. Not dropped: put down. The rock either side is polished to the width of a broad body passing, and the bone has not been kicked aside.",
  },
  "the-oak-cave": {
    "cave|chamber|bed|roots|bracken|leaves|floor":
      "The bed is pressed so deep that its edges stand up like the sides of a bowl. In the bracken there are tufts of thick brown underfur, the stuff that comes out in spring. It is the warmest room in the wood because something large has slept in it through every winter there has been.",
  },
  "the-wall-cave-mouth": {
    "breach|stones|stone|mouth|wall|hillside|tumble":
      "The cut stones in the mouth are the facing of the wall that came down, and on the back of one of them there is the mark of a mason, a short line with a hook. The path through the tumble is low and wide. It has been used for long enough that the stones along it have moved aside.",
  },
  "the-wall-cave-passage": {
    "passage|rock|floor|dust|prints|feet":
      "The first few paces are cut: there are chisel marks on the walls at the height of a man's hand, straight and patient. Then the chisel marks stop and the passage goes on as rock. Somebody began to make something of this hole and gave it up very early.",
  },
  "the-wall-cave-turn": {
    "passage|root|crack|turn":
      "The torn root was pulled down through its crack from below and chewed. The pieces lie where they fell, and they are dry, so it was not done for food. It was done because the root was in the way, by something that did not mean to duck.",
  },
  "the-wall-cave": {
    "cave|chamber|bed|scrape|sand|walls|hollow|drip":
      "The hollow under the drip is worn smooth and holds a mouthful of water, always. The bed is a body's length from it. Whatever sleeps here has worked it out exactly: drink without getting up, and keep its back to the scored wall.",
  },
  "the-boundary-cave-mouth": {
    "hole|stone|hollow|moss|lip|oak":
      "The moss torn off the lip is torn in strips the width of claws, by something hauling itself in and out. The old stone above the hollow has a mark on its face, worn nearly smooth, that might have been the same mark as the boundary oak's iron. It was put here to say where something ended.",
  },
  "the-boundary-cave-slope": {
    "slope|claw marks|marks|floor|rock|roof":
      "The claw marks go up the slope only, gouged in hard to get purchase on the way out. Going down, whatever lives here simply slides. The leaf mould on the slope came in on its fur.",
  },
  "the-boundary-cave": {
    "cave|chamber|bed|bracken|moss|hair|floor":
      "The bed fills the chamber to the walls, which is the shape a bed takes when the animal in it is the size of the room. The hair matted into it is shed in clumps. There is no bone in here at all: whatever sleeps here eats somewhere else and keeps this place for nothing but sleep.",
  },
  "the-pile-cave-mouth": {
    "gap|stones|stone|ground|mouth":
      "The ground in front of the gap is beaten bare in a fan, and there are the long marks of something lying out on it in the sun. The two stones that make the gap have their inner edges worn smooth, as if a big body has squeezed between them a great many times.",
  },
  "the-pile-cave": {
    "cave|bed|stones|stone|leaves|bracken":
      "The stones over the bed are polished dark where a shoulder has leaned on them through every night of every winter. The field stones of the pile above were carried here by people clearing a field. Something has made a home in the heap they left.",
  },
  "the-white-ride": {
    "ride|grass|paths|turf|edges":
      "The narrow paths along the edges are worn the width of one paw, and they go in single file, one animal behind another, all the same way. The grass in the middle of the ride is grazed by something that does not leave a print in it. Only the edges are walked.",
  },
  "the-gnawed-stand": {
    "trees|marks|bark|scores|trunks|stand":
      "The scores above the rubs are four-clawed and long, and on the tallest trees they reach higher than your own hand. The rubbing is at the shoulder of a big dog. Whatever stands up against these trees to mark them is much taller standing than it is walking.",
  },
  "the-picked-bones": {
    "bones|bone|skull|ribs|grass":
      "The long bones are split by teeth, not tools, and each split is clean down the middle. The oldest bones are white and green with moss; the newest are only white. They are laid out, not scattered, as if things were brought here to be finished, and this were the table.",
  },
  "the-grey-lie": {
    "lie|hollow|roots|beech|hair|ground|bones":
      "The earth in the hollow is pressed into the shape of one very large animal curled nose to tail, and the shape is exact. The grey hair caught in the roots is long and coarse, and there is a great deal of it. The fresh bones are just outside, where it can reach them without getting up.",
  },
  // ...and the old growth: past the bank where the holding's cutting stopped,
  // never felled, with older people's marks under it than the holding's.
  "the-boundary-bank": {
    "bank|boundary|coppice|trunks|leaves":
      "The bank is built, not grown: there is a ditch along its outer foot, silted to a hollow, and the turf on its crest is laid. On the coppice side every stool is cut. On the far side nothing has ever been cut at all. The bank told the woodmen where to stop, and they stopped, every one of them, for as long as there were woodmen.",
  },
  "the-dry-rise": {
    "rise|oaks|soil|leaf|alders|ground":
      "Kick into the floor and it is leaf over leaf over leaf, black and crumbling, and under that more of the same, and no stump or charcoal or cut root anywhere in it. Nothing on this rise has been taken out in all the years the leaves have been falling on it.",
  },
  "the-leaning-limes": {
    "limes|lime|crowns|trees":
      "The limes were never cut, so their crowns have grown out over the way from both sides until they locked. Lime bark is stringy underneath; people once stripped it to twist into rope. Low on the trunks there are old long wounds, healed, where somebody took a strip and left the tree to live.",
  },
  "the-drowned-hollow": {
    "hollow|water|leaves|prints":
      "The water is a hand deep and lies on a floor of leaves that goes down a long way. The prints that go in at one side do not come out the other because the far side is too soft to hold them: something crossed and climbed out on the roots instead, by the scrape marks.",
  },
  "the-last-oak": {
    "oak|limbs|limb|floor|ring":
      "Along the lowest limb the bark is worn smooth in a long strip and there are short deep scratches where something climbs up onto it. It is the only tree around with a limb broad enough to lie on. Things that sleep in trees have been sleeping on this one since before anything else around it was a tree.",
  },
  "the-sloe-thicket": {
    "sloe|sloes|blackthorn|thicket|fruit|thorns|way":
      "The way through is a tunnel at the height of your knee, worn bare underneath. The fruit nearest it has all been taken, and the fruit out of reach of it has all been left. Whatever uses this way eats as it goes, and goes the same way every time.",
  },
  "the-black-oaks": {
    "oaks|bark|moss|trees":
      "The black on the bark is not dirt. It is a stain that comes out of the oak itself where water runs down it year after year. These have been standing in this wet for so long that every tree is the same colour as the next, which is why you cannot tell one from another.",
  },
  "the-owl-oak": {
    "oak|trunk|pellets|feathers|hollow|door":
      "Break a pellet open and it is fur rolled round tiny bones, a skull no bigger than a fingernail. There are hundreds of them on the floor of the hollow, in layers, the bottom ones gone to grey dust. Owls have slept in this oak for a great many generations of owls.",
  },
  "the-long-fall": {
    "tree|trunk|gap|slope|way":
      "The break halfway along is clean on one side and torn on the other, and the torn side is clawed. Something did not want to go round a hundred feet of tree, and it made itself a door through the middle, and it has used that door often enough to wear the sapwood smooth.",
  },
  "the-grey-stools": {
    "stools|stool|trunks|rings|circles|coppice":
      "Each ring is one tree, grown out from a stool cut so long ago that the middle has rotted away and left a circle of trunks round nothing. Somebody coppiced here, once, before the bank, before the holding. Then they stopped, and the stools went on growing wider and wider for longer than the holding stood.",
  },
  "the-oak-fall-gap": {
    "gap|shaft|light|grass|foxgloves|oak|canopy":
      "The fallen oak that made the gap is a long low mound under the grass, green and soft. It came down by itself, of age, and nobody took the timber. Foxgloves are poison, and nothing grazes them, which is why they are the only tall thing in the light.",
  },
  "the-deep-roots": {
    "roots|trees|wall|dark|ground":
      "The roots hang down where the bank has fallen out from under them, and behind them is not earth but space: a low hollow under the trees, dry and dark. The soil from it is gone, washed out by water that no longer runs here. The trees above have not noticed.",
  },
  "the-thorn-thicket": {
    "thorn|thorns|blackthorn|thicket|way":
      "The way is narrow and the thorns along it are broken off at the height of a broad flank, not cut. Every so often a thorn holds a tuft of hair, grey or brown. Things that use this way carry the thicket's marks on them, and leave some of themselves on it in return.",
  },
  "the-bent-hazels": {
    "hazel|hazels|stems|nuts|lattice|understorey":
      "The nuts on the floor are split in two clean halves, which is a squirrel, or gnawed through at one end in a neat round hole, which is a mouse, or crushed flat, which is neither. The hazel was coppice once. Every stem leans from a stool somebody cut and never came back to.",
  },
  "the-mossed-wall": {
    "wall|bank|moss|boundary":
      "Push the moss aside and the bank is stones, laid, with earth packed between: a field wall, older than the trees that grow out of it. There were fields here, under the old growth. Somebody walled them, and then the wood came, and the wood has been here a great deal longer than the fields were.",
  },
  "the-woodpecker-stand": {
    "limbs|holes|trees|woodpecker|drumming":
      "The holes in the dead limbs are round and in rows, each the size of a thumb, and in the bigger trunks there is one larger hole, oval, where a nest went in. The drumming stops when you stop. It starts again on a tree you are not looking at.",
  },
  "the-hornets-oak": {
    "oak|hornets|scraps|split|trunk|nest":
      "The grey scraps on the ground are paper, chewed out of wood and spat into sheets, fallen from a nest somewhere up in the split. They are fresh. The hum does not change when you come close, which is the only reason you are still close.",
  },
  "the-elder-brake": {
    "elder|stems|ground|brake":
      "Elder grows where the ground is rich with what animals and people leave behind. Under this brake the floor is trodden flat and littered with droppings and little bones: things lie up in here, out of sight, and have done for long enough to feed the elder that hides them.",
  },
  "the-wild-cherry": {
    "cherry|stones|fruit|bark|birds|leaves":
      "The stones on the ground are all split, cracked open for the kernel inside. Birds swallow cherries whole and pass the stones; something here has been sitting under the tree and opening them one at a time with its teeth.",
  },
  "the-old-boundary-stone": {
    "stone|letters|moss|oak|carving":
      "Scrape the moss out of the letters and they are not any letters you know, and they are not this holding's mark. Cut square and deep, by somebody who meant them to outlast them. The oak was a sapling beside this stone once, and it has been taking it in ever since.",
  },
  "the-old-pollards": {
    "pollards|trees|limbs|crowns|trunks":
      "The limbs coming out of the old cut are each as thick as a tree, which means it is centuries since the last cut. The bolling, the swollen head where the cuts were made, is scarred all round with them, cut after cut after cut, before anybody stopped. Pollards like these were cut for leaf fodder in a hard winter, when there was stock to feed.",
  },
  "the-great-root": {
    "root|tree|back":
      "The worn strip along its back is polished and dark, and in places there are the round prints of pads pressed into the moss either side where things step on and off it. It is the driest way across the wet ground under this tree, and everything that lives here knows it.",
  },
  "the-grey-mist": {
    "mist|trunks|posts":
      "The mist lies in this one hollow and nowhere else, and it is cold. Put your hand into it and the cold comes off the ground underneath, which is colder than the air above it at every hour. Something down there keeps the cold in the way stone does.",
  },
  "the-wet-oaks": {
    "oaks|roots|ground|water|hollows":
      "The roots stand up out of the wet because the ground has sunk away from them a little at a time, and the oaks have held their own height while the soil around them went. Each of them is standing on its own old floor, and the floor has left.",
  },
  "the-fungus-fall": {
    "trunk|fungus|brackets|shelves|fingers|wood":
      "The glow is real: a cold green light from the soft white threads where the wood is most gone, faint enough that you only see it out of the corner of your eye. Press the trunk and your fingers go in. It is holding its shape out of nothing but habit.",
  },
  "the-holly-tree": {
    "holly|tree|leaves|limbs|crown":
      "Holly this tall and this old is rare: holly is cut for fodder and for winter, and a tree like this means nobody cut it in centuries. The bare lower limbs are bare because something browses them up to a line, the same line as everywhere in the wood.",
  },
  "the-black-alder-stand": {
    "alders|alder|roots|trunks|water|bark":
      "The red under the broken bark is alder's own; the wood turns orange when it is cut, as if it bled. The cold here comes up out of the standing water, which never warms, because the canopy over this stand never lets the sun reach it.",
  },
  "the-leaf-drifts": {
    "leaves|drifts|trunks|ground":
      "The drifts are banked against the west faces of the trunks and the ground on the east is bare. The wind comes through here from one quarter only and has been sorting the leaves the same way every autumn, so the drifts are as old as the trees at their bottoms.",
  },
  "the-moss-boulders": {
    "boulders|boulder|moss|ferns|stones":
      "The boulders are not this ground's stone. They are a hard grey rock with flecks in it, rounded by something far bigger than any river here, and dropped. They were here before the wood, before the fields, before the people with the lettered stones. The moss is the youngest thing about them.",
  },
  "the-sunless-floor": {
    "floor|earth|trunks|ground":
      "The earth is bare because nothing can grow without light, and it is dry because the canopy turns the rain. There are no leaves on it because the wind under here is too weak to bring them. It is the floor the wood was standing on before it grew a roof, and nothing has been added to it since.",
  },
  "the-dappled-way": {
    "light|spots|canopy|floor|way":
      "The holes in the canopy are made by leaves that are not there: something has eaten through the crowns here, caterpillar or beetle, a hole at a time. The light comes through where the wood is being eaten. In a few summers this will be open sky.",
  },
  "the-ancient-ash": {
    "ash|trunk|burrs|hollows|limbs":
      "The burrs on the trunk are the scars of old cuts, healed over and swollen. This ash was pollarded once, many times, a very long time ago, and then left, and it has spent every year since growing round the wounds. It is dying back from the ends now, slowly, the way the very old do.",
  },
  "the-cracked-oak": {
    "oak|wound|halves|split":
      "The wound between the halves is charred black and hard as iron, and it has not rotted, because fire seals what it does not consume. The two halves have each grown bark down to the edge of the char and stopped. Nothing grows in the wound because nothing will grow on the black.",
  },
  "the-moss-tunnel": {
    "tunnel|banks|moss|fern|way|water":
      "The banks are too regular for a wood to make: two straight sides, the same height, a level floor between. It is a hollow way, a road worn down into the ground by long use and then roofed by the wood. The drip is water coming through the moss above, as it has every day since the road stopped being a road.",
  },
  "the-crows-oak": {
    "crows|oak|limbs|droppings|birds":
      "The crows on the dead limbs sit facing out in every direction, so there is no side of the oak they are not watching. The droppings below are years deep. They have used this tree as a watch long enough that the ground under it has gone sour and nothing will grow in it.",
  },
  "the-stone-oak": {
    "oak|stones|stone|heap|trunk|bark":
      "The stones in the heap are field stones, the size you can carry in two hands. They were cleared from a field and piled here, and the oak came up out of the heap afterward and has grown its whole life through them. The field is under the old growth now. The heap is inside the tree.",
  },
  "the-hazel-ride": {
    "ride|hazel|nuts|husks|passage":
      "The ride was cut straight, and the hazel along its edges was coppice, cut on the same rota as the rest of the wood until it stopped. Among the squirrel-split husks on the floor there are whole nuts crushed flat under a weight much heavier than a squirrel's.",
  },
  "the-yew-shade": {
    "yews|yew|trunks|needles|floor|shade":
      "The red trunks are fluted so deep you could lay your arm in the folds. Yew is poisonous to stock and slow to grow and makes the best bows there are. Nobody took a bowstave from these; they have grown past any use and into something else.",
  },
  "the-deer-browse": {
    "browse|leaves|trees|trunks|floor|droppings|line":
      "The browse line is level to a hand's width, round every trunk, for as far as you can see. It takes a great many deer, every day, for a long time, to hold a line that exact. The holding's park went this far into the old growth. The deer did not stop at the bank.",
  },
  "the-rot-wood": {
    "logs|log|limbs|wood|beetles|grubs|ground":
      "Everything here fell in the same storm and is rotting at the same pace, which is why it all gives at once. Under the soft places in the ground there are whole trunks gone to a crumbling red powder. You are walking on a fallen forest that has not finished being one.",
  },
  "the-ground-ivy": {
    "ivy|stumps|stones|roots|floor|sheet":
      "Lift the ivy and there are stumps under it, cut square, a lot of them: the only cut stumps in the old growth. Someone felled a stand here, once, a long time before the holding, and the ivy has covered the evidence so thoroughly that only the shape of the ground still argues about it.",
  },
  "the-clean-floor": {
    "floor|earth|leaves|trees":
      "The floor is swept clean in a circle, and at the edge of the circle the leaves are banked in a low ridge, as if pushed there. In the middle the earth is pressed flat. Something turns round and round here before it lies down, the way a dog does, every time, for years.",
  },
  "the-twisted-yews": {
    "yews|yew|trunks|crowns|resin":
      "The trunks wind round each other because they grew from one root and fought each other for the light all their lives. Inside the twist there is a hollow, dry and black and smelling of resin. A yew this old has no heart left; it is all outside, and it will stand like that for centuries more.",
  },
  "the-soft-floor": {
    "floor|moss|leaf|prints|print":
      "The prints are deep and round-toed and evenly spaced, one set, crossing the floor from one side to the other at a steady walk. They are the only marks here, and the moss is slowly lifting them out, the oldest end first.",
  },
  "the-spring-mire": {
    "spring|mire|water|moss|threads|roots":
      "The water comes up cold through a ring of pale sand at the centre of the mire, stirring the grains so they boil gently and settle. Pressed into the sand at the edge there is a coin, green and worn smooth, laid flat on purpose. Somebody gave something to this spring once.",
  },
  "the-badger-banks": {
    "banks|setts|sett|holes|spoil|bones|bedding":
      "The bedding dragged out of the setts is old bracken and grass, aired in the sun and taken back in. Among the bones in the spoil there are some that are not animal: a thread of bronze, a bead of blue glass, brought up from somewhere under the banks by digging that goes deeper than anything else here.",
  },
  "the-snapped-limbs": {
    "limbs|limb|crowns|wood":
      "The breaks are fresh and the limbs lie where they landed, each one dropped straight down. Look up and the crowns are whole; the breaks are on the trees' own dead wood, letting go of it. A big tree drops its old limbs without warning, and these came down together.",
  },
  "the-thin-light": {
    "light|canopy|trunks|floor":
      "The light is grey because it comes through a high thin layer of lichen hung in the canopy, beards of it, a whole ceiling of pale grey-green. Nothing has disturbed the air here long enough for lichen to grow that thick. It is the cleanest air you will ever breathe.",
  },
  "the-sunk-way": {
    "way|banks|roots|track":
      "The sunk way is straight because it was walked straight, from one place to another, by a great many people for a long time, until their feet wore it down below the ground. It stops because the place at this end of it is gone. The roots in its banks have been growing into it ever since.",
  },
  "the-wolf-run": {
    "run|way|trunks|feet|floor":
      "The run is the width of one animal and it is worn into a groove, and along it there are the scrapes where something marks its way: the earth raked back at a turn, the bark of a trunk scored at the height of a knee. It is walked in single file, by things following one another.",
  },
  "the-sapling-crowd": {
    "saplings|tree|gap|light":
      "The saplings are all one age, every one of them, the seed of the old tree and its neighbours, waiting in the shade for a hole in the roof. The old tree lies along the ground under them, gone to soft red earth. Only one of the saplings will reach the canopy. The rest are already dying.",
  },
  "the-bramble-tunnel": {
    "bramble|tunnel|way|thorns":
      "The tunnel is the height of a big animal's back and its floor is worn hard and bare. The thorns overhead are broken off along one line where something taller than the tunnel ducks through it, and some of the broken ends are dark.",
  },
  "the-tangle": {
    "limbs|branches|growth|tangle|mass":
      "The fallen limbs are of every age, some soft as cake, some still sound, laid down over each other by one storm after another in the same low ground where the wind drops them. The way through goes under, over, under. Something smaller than you uses the unders and never the overs.",
  },
  "the-fallen-crowns": {
    "crowns|limbs|trees|thicket|gap":
      "The two trees came down together because one fell into the other. Their trunks are some distance off; only their tops landed here. The gap underneath is worn smooth along its bottom by things going through on their bellies, and it has hair caught in the twigs above it.",
  },
  "the-buckled-ground": {
    "ground|floor|roots|waves":
      "The waves are roots: every rise is a root heaved up by the growth of the trees, and every dip is the ground between them. The roots have been lifting this floor a fraction a year for longer than you can think about, and the floor is still going up.",
  },
  "the-holly-wall": {
    "holly|wall|gap|floor":
      "The gap is head-high and its edges are broken, not cut: whole branches snapped off and pushed aside. The broken ends are of every age, from grey to green. Something has kept this gap open through the holly for years by walking straight through it.",
  },
  "the-ferny-bank": {
    "bank|fern|ferns|moss|roots|water":
      "Lie your ear to the bank and the water is inside it: a culvert, or a drain, running through under the bank in stone. Somebody built it to carry a stream under a road or a wall that is no longer here. The stream has gone on using it.",
  },
  "the-silent-beeches": {
    "beeches|beech|floor|leaves|trees":
      "Beech casts the deepest shade there is and nothing grows under it, so this floor is only leaves, and the leaves make no sound when they are old enough. The trunks carry no marks: no scratches, no scars, no letters cut by anybody who passed. Nothing has ever wanted to leave a sign here.",
  },
  "the-dead-air": {
    "air|wind|leaf|sound":
      "The air is warm because the trees here trap it, three canopies deep, and it smells of the rot under the leaves because nothing ever blows it away. The silence is the silence of a closed room. Whatever is breathing in here breathes the same air for a very long time.",
  },
  "the-oak-aisle": {
    "oaks|rows|aisle|floor":
      "The oaks are in rows because they were planted along the two sides of something: a road, or the walk to a door. They are older than the holding. Whatever the aisle led to has gone so entirely that the wood has not even left a mound.",
  },
  "the-beech-mast": {
    "mast|husks|drifts|furrows|beech":
      "The furrows are rooting: a snout pushed along under the drifts to turn up the nuts, leaving a groove behind it. The furrows run in lines, side by side, the way pigs work a wood when they are turned into it to fatten. Nobody turned these in. They came on their own.",
  },
  "the-wych-elms": {
    "elms|elm|seed|seeds|bark|floor":
      "Elm grows to the height of a church and lives as long as one, and these are the size of their age. The pale seed on the floor is from this year, and none of it will take; it never does under its own parents. They creak because they are taller than everything around them, and the wind up there is real.",
  },
  "the-hornbeam-gloom": {
    "hornbeam|trunks|light|gloom":
      "Hornbeam is the hardest wood in the country; it blunts tools and was cut for things that had to last. These were never cut. They have spent centuries growing twisted round their own hardness, and they are cold to the touch because nothing warms them.",
  },
  "the-last-of-the-light": {
    "light|trees|dark":
      "The crowns here are layered, one beneath another, so every hole in the top layer is shut by the next. Look down and the floor is grey with nothing on it, the colour of an old ceiling. Further in, the layers get thicker. The light is not going; it is being stopped.",
  },
  "the-rotten-gate": {
    "gate|posts|post|hinge":
      "The hinge on the post is iron, hand-forged, the pin worn bright on one side from a gate swinging on it for years. The posts are set a cart's width apart. There was a field here, or a yard, with a wall on either side, and the wall is gone and the field is gone and the gate's posts have outlasted both.",
  },
  "the-moss-steps": {
    "steps|stair|stone|moss":
      "Under the moss the steps are cut stone, worn hollow in the middle of each tread by feet going up and down them. They go up to a level place, and the level place is the wood floor. Somebody went up these steps to something every day, for a long time.",
  },
  "the-high-crowns": {
    "trees|crowns|trunks|canopy":
      "The trunks are bare to a great height because they grew up close together and every lower branch died for want of light. They are the tallest trees in the wood because they were the first, and nobody ever cut a single one of them down for the timber they are.",
  },
  "the-ivy-wall": {
    "ivy|walls|wall|gaps|gap|trees|sheets":
      "The gaps in the ivy are pushed through, not grown: the sheets hang torn at the height of a shoulder, and the torn edges are of different ages. Something goes through these walls on its own way, and the ivy has been growing back across its doors and being torn open again for years.",
  },
  "the-lime-stand": {
    "limes|lime|trunks|stool|pillars|stand":
      "Each crowd of trunks comes up from one stool, and the stool is the old part: lime coppiced so long ago that the stool has outlived any cutter. The bark has been stripped from some trunks in long ribbons, low down, and healed. Lime bark makes rope. Somebody made rope here once, and somebody else, since.",
  },
  "the-murk": {
    "trees|canopy|air|murk":
      "Every direction looks the same because, here, it is: the trees grow at the spacing the shade allows and no closer, so the wood has arranged itself evenly in every direction from every point. Nothing has interfered with that arrangement since it settled.",
  },
  "the-holly-dark": {
    "holly|floor|leaves":
      "The floor under the holly is black because it is years of dead holly leaves, which do not rot, and the dry is the dry of a roof. The leaves rattle after you touch them because they are stiff and they rest against each other; it is not anything moving. Mostly.",
  },
  "the-toadstool-ring": {
    "toadstools|toadstool|ring|rings":
      "Each ring is one growth spreading outward through the soil from a single point, and fruiting at its edge. The rings inside rings are the same growth, older and older, spreading for longer than you would believe. The middle of the oldest ring is somewhere off under the trees, a long way away.",
  },
  "the-lichen-stones": {
    "stones|stone|lichen|wall":
      "The stones lie in a line if you stand at the right end and look along them, and they are all the same size. A wall, then, or the footing of one, laid when there was a reason to wall this ground. The lichen on them is the same age on every stone. Nothing has moved them since it took hold.",
  },
  "the-cold-hollow-oaks": {
    "hollow|dip|air|mist|floor|mould|trees":
      "Cold air runs downhill like water and pools in the lowest place, and this hollow has no way out for it. The trees on the rim lean away from it because their buds froze on the inner side, spring after spring, and they grew toward the warm. The mould on the floor is the only thing here that likes it.",
  },
  "the-dead-stand": {
    "stand|trees|fungus|brackets":
      "They all died at once, standing, and none of them fell. Something in the ground took them, or a drought, or a sickness that came through one summer. The fungus is eating them from the bottom up, and the living trees around them have been growing up into their room for longer than the dead ones were alive.",
  },
  "the-grass-island": {
    "grass|lawn|holly|island":
      "The grass is cropped because something grazes it, and the holly is dense because it was planted and kept dense once, as a hedge round a little lawn. A garden, in the old growth, older than the holding's garden. Whatever grazes it comes and goes through the holly and leaves no gap that you can find.",
  },
  "the-fern-floor": {
    "bracken|fronds|floor":
      "The bracken stands on ground that was cleared, once: bracken takes open ground and holds it against the trees for centuries. Somebody cleared this space in the old growth, a very long time ago, and the bracken has been holding it for them ever since.",
  },
  "the-crooked-oaks": {
    "oaks|oak|trees|shapes":
      "Each oak turns where it met something as a young tree: a fallen trunk, a boulder, the shade of another tree that has since gone. They carry the shapes of things that are not there any more. Read together, they are a map of a wood that stood here before this one.",
  },
  "the-oak-knees": {
    "roots|knees|knuckles|oaks|moss|trunks":
      "The knees are worn on their tops, and between them the ground is trodden into a path that goes knee to knee. Everything that crosses here steps on the same knuckles in the same order. The moss is gone from exactly those.",
  },
  "the-green-ridge": {
    "trunk|ridge|trees|earth":
      "The young trees grow out of the dead trunk's back in a straight line because the trunk is their nurse: they seeded on the rotting wood, where there was light and nothing else to compete. In a hundred years they will be a row of oaks standing on nothing, in a line, for no reason anybody walking past will understand.",
  },
  "the-deep-litter": {
    "litter|leaves|layer|floor":
      "Dig down and the leaves go from brown to black to a soft brown earth, and then to more leaves, darker, and then a layer of grey ash, a long way down. Once, before all these leaves, this ground burned. The fire is still down there, a hand thick, under everything that grew after it.",
  },
  "the-grey-trunks": {
    "beech|beeches|trunks|rows|litter":
      "The rows are real, but nobody planted them: beech seeds fall in lines along the drip of their parents' crowns, and these grew where the old ones dropped them, a long time ago. The parents are gone. The rows they made are still standing in their places.",
  },
  "the-split-ash": {
    "ash|trees|root|halves|split":
      "The split runs down into the root, and the two halves are joined underground. Water stands in the crotch where they divide, black and full of leaves, and never dries out. Both halves are alive, and both are slowly leaning further apart.",
  },
  "the-root-hollow": {
    "hollow|roots|soil|trees|legs":
      "Under the roots it is dry and the floor is dust, fine and pale, printed with the small hands of things that live in here and the drag of a tail. The trees above are standing on their roots like on stilts, because the water took the soil out from under them and never came back.",
  },
  "the-dark-pool": {
    "pool|water|mud|hooves|pads|prints|leaves":
      "The prints at the edge are pressed one into the next, cloven and padded together, all at the same place on the bank. Things that would kill each other anywhere else drink here side by side. The mud keeps a record of every one of them, and the record is very long.",
  },
  "the-standing-oaks": {
    "oaks|ring|ground|ceiling|crowns|floor":
      "The floor inside the ring is swept by nothing you can see, and in the middle of it the earth is a slightly different colour, in a square, as if something stood on that spot for a very long time. The oaks were planted round the square. Whatever was in it, it is the oldest thing in the wood, and it is not here.",
  },
  // ======================= THE CROSSING, the rest (2026-11-05) ==========
  "the-shore-descent": {
    "track|zigzags|moor|bench|water":
      "Each turn of the zigzag is built up on the outside with a few laid stones, so a cart could swing round without going off the edge. Most of the stones are still there. On the long legs between, the ruts have cut down into the peat and filled with brown water.",
  },
  "the-boat-noust": {
    "noust|hollow|stone|bank|boat":
      "The stone lining is set on edge and tight, and two timber chocks still lie in the bottom where the keel sat. The chocks are worn into a shallow V. Along the top of the hollow there are rusted iron pins every few feet, for the ropes that held a winter's covering down.",
  },
  "the-strand-head": {
    "strand|shingle|stones|peat|tideline|bank|weed":
      "The peat ends in a raw cut edge a hand high, sliced off clean by the water at the top of some tide. Pieces of it lie out on the shingle in black slabs, drying and cracking. The stones nearest the tideline are wet and dark and the ones above it are pale and dry.",
  },
  "the-wrack-line": {
    "wrack|weed|shoe|bone|stave|float|line":
      "The shoe is a man's, sole only, the stitching rotted and the leather gone hard as wood. The float is glass in a net of tarred string, the glass green and sea-frosted. Everywhere along the line the weed has been turned with a stick and left turned, the wet side up.",
  },
  "the-shore-road": {
    "road|surface|shingle|tide-mark":
      "Under the grit the road is set with long kerbstones on its seaward edge, and those have been reset in places, straight again, by somebody with a bar. The road has drains under it every so often, a slab over a slot, so the water off the moor goes under it and not across.",
  },
  "the-net-poles": {
    "poles|stakes|net|shallows|engine":
      "Each stake is notched on the landward side, a hand from the top, where the net's head-rope was lashed. The shreds on the nearest three are tarred twine, the knots still tight. The stakes are worn thinnest at the waterline, eaten in by the tide in a ring.",
  },
  "the-shellfish-scars": {
    "rock|cuts|pits|limpets|crab|weed|scars":
      "The cuts are square-bottomed, with wedge-slots still showing along their edges where blocks were split off and lifted out. They took the stone at low water, between tides. In the pits the limpets have settled in rows along the wedge-slots, where the edge gives them a grip.",
  },
  "the-sunken-hurdles": {
    "hurdles|fence|panels|mud|island":
      "The panels are woven from the same silvered willow as the eyot's fence, and they stand dead in line with it. Their stakes go down into the mud further than you can push a stick. The fence was built on dry ground and the water came up round it afterwards.",
  },
  "the-chapel-channel": {
    "channel|water|reed|eyots":
      "The reed on both banks is cut back in one place on each side, opposite each other, a gap the width of a boat. Somebody used to cross here by water. The cuts are old and the reed has nearly closed them, and the gap is only plain from out on the channel.",
  },
  "the-landing-stage": {
    "jetty|stage|ring|step|stone|channel":
      "The ring is worn through to half its thickness on its lower side. The step has a groove in its edge where boat after boat was pulled against it. The jetty's stones are laid with their long sides to the current, the way a builder does who has seen what water does to stone set the other way.",
  },
  "the-gravel-flats": {
    "gravel|flats|banks|channels|water|ford":
      "Every bank has a steep face on the downstream side and a long gentle back on the up, the way gravel is pushed and dropped. The stones on top are dry and grey; a hand's depth down they are wet and brown. Nothing grows on the banks. They do not stay long enough.",
  },
  "the-ford-road": {
    "road|surface|grass|verges":
      "Under the grass down the middle the road is metalled with the same round shingle as the shore, rammed in hard. The verges have been cut back once, a long time ago, and the cut stems of the old gorse are grey stubs among the new.",
  },
  "the-quay-stub": {
    "quay|ring|bolt|rope|courses|stone":
      "The ring bolt is leaded deep into the end stone and does not shift when you pull. The rope on it is new and tied with a knot that does not slip. The fallen courses lie down there in the order they fell, the top one furthest out.",
  },
  "the-toll-post": {
    "post|table|charges|columns|figures":
      "The four headings are still legible because they were cut deeper than the figures; the figures were cut shallow to be changed. You can see where they were changed: two of the column spaces are a little lower than the stone around them, dressed back and recut.",
  },
  "the-bridge-approach": {
    "embankment|bridge|piers|arch|arches|road":
      "The embankment is faced with dressed stone on its downstream side and plain rubble on the up, as if the money ran out halfway round. The roadway along its top is worn in the middle by feet and not at the edges. Nobody brought a cart up here in a long while.",
  },
  "the-eyot-track": {
    "path|track|brushwood|stone|plank|stones":
      "You can read the repairs like handwriting: here a tidy bundle of brushwood pegged down, there one big flat stone dropped in and left, there a plank wedged on two stones by somebody in a hurry. The oldest work is the best and the lowest, half under the mud.",
  },
  "the-reed-gate": {
    "reeds|reed|brushwood|path":
      "The reeds lean in over the path from both sides and meet at the top, and on the inside of the arch their stems are snapped at shoulder height, all at the same height. Somebody kept this way open by walking it, often. The brushwood underfoot has been relaid over older brushwood.",
  },
  "the-first-eyot": {
    "eyot|island|willows|fire-ring|ring|fire":
      "Round the fire-ring the ground is littered with what people put down and did not pick up: a broken pipe stem, a bent nail, fish bones, a knot of cord. Cut into the trunk of the biggest willow, at the height of a sitting man's eyes, are initials, dozens, over and across each other.",
  },
  "the-brushwood-causey": {
    "causey|willow|bundles|stakes|mud|path":
      "Push a hand down through the mud and the bundles are there, tied round with withy, laid crosswise and pinned through with stakes. The stakes along the edges are notched at the top, a notch for every few yards, so a man could count his way across in a fog.",
  },
  "the-hurdle-eyot": {
    "hurdles|fence|eyot|island":
      "The fence has been mended recently and well: new withies woven through the old in places, and three panels near the gap replaced outright. Inside it the grass is long and unbitten. Whatever the fence is meant to keep in, it is not keeping anything in now.",
  },
  "the-mud-causey": {
    "causey|mud|stakes":
      "Under the mud, the causey is still there: feel with a foot and there is a firm edge, and beyond it nothing. The stakes that stop at the near end are snapped, not pulled, broken off at mud height. The mud has a smell to it when it is pressed, old and rotten.",
  },
  "the-chapel-eyot": {
    "chapel|altar|slab|bench|walls|stone":
      "The altar slab is cut with five small crosses, one at each corner and one in the middle, and the middle one is worn almost away by hands. The bench round the walls is dished in hollows. The door faces west, back the way people came, and the altar faces the mountain.",
  },
  "the-long-causey": {
    "causey|kerbs|stone|gaps|drainage":
      "Each kerb has a mason's mark on its inner face, a little arrow and a stroke, the same mark the whole way along. The drainage gaps are bridged with a single long slab apiece. Nothing about it has settled. It is as level now as the day it was laid.",
  },
  "the-causey-end": {
    "kerb|stone|end|mud|reed|causey":
      "The last kerb has the same mason's arrow on it as every other, and beside it, laid out on the mud and half sunk, two more kerbs waiting to be set. Their marks are cut. Their beds were never dug. The reed has grown up between them.",
  },
  "the-reed-maze": {
    "reed|reeds|path|fork|forks":
      "At each fork a few reeds have been knotted together at the top, by hand, and the knots have dried and gone brown. Some forks have a knot on one side and some on both. The cutting paths and the way through are knotted the same, which is no help at all.",
  },
  "the-ford-head": {
    "withies|withy|gravel|shingle|ford|water":
      "The withies are willow rods with a twist of bark left on at the top so they show up against the water. The ones nearest the shore are fresh, still green inside if you break one. Further out they get older and greyer, and the line of them bends.",
  },
  "the-near-arch": {
    "arch|piers|pier|span|edge|bridge":
      "Each voussoir in the arch is cut with a number on its hidden face, and where the arch is broken you can see the numbers, the last whole stone a seventeen. The break is clean. The mortar in the joints is still hard enough to turn a knife.",
  },
  "the-ferry-steps": {
    "steps|ring|rope|iron":
      "The steps go down below the water, and you can see three more of them under it, furred green. The iron ring at the top is worn bright on the side the rope runs over. The rope itself is tarred and wet, and on the bank side it is wrapped with old sacking where it lies against the stone.",
  },
  "the-salt-pool": {
    "pool|water|floor|wall":
      "The water is so still that a dropped grain of sand rings out across it and the rings take a long time to reach the far wall. Along its edge a crust of salt has grown on the rock in a white line, then another line a little lower, then another, each a different tide's stopping place.",
  },
  "the-causeway-head": {
    "post|scale|lines|weed|road|causeway|stone":
      "The cut lines on the post are numbered at the side, small, and the numbers are recut over older numbers in the same places. The weed on each line has dried in a different shade, from green near the bottom to black at the top, where the water has not reached in a long while.",
  },
  "the-otter-run": {
    "slide|run|mud|scales|eyot":
      "The slide is smooth as a soaped board and a hand wide, with claw-marks at the top where it starts and none on the way down. The fish scales at the top are fresh and silver. Off to one side the reed is flattened in a small round bed with droppings full of bones.",
  },
  "the-hurdle-store": {
    "hurdles|lean-to|willow|stack":
      "The stack is laid in courses, each hurdle crossed over the one below so air gets through. The lean-to over it is roofed with reed. The bottom hurdles have rotted where they touch the ground, but the rest are sound, and the top ones still have green bark.",
  },
  "the-quaking-turf": {
    "turf|ground|root|mat|water":
      "Kneel and press and the water comes up round your hand through the grass, brown and cold. The mat is all roots, packed and woven, with no soil in it at all. In one place a stick has been pushed right through and left standing, and it goes down further than your arm.",
  },
  "the-graves": {
    "graves|humps|stones|stone|turf|rows":
      "The stones at the heads are shore pebbles, round, and every one has a cross scratched on it with another stone. The humps are short and the rows crooked, each dug where the ground would take a spade. Some of the humps are very small.",
  },
  "the-plank-run": {
    "planks|plank|trestles|trestle":
      "The planks are all different, salvage from boats and doors and carts, one with a hinge-strap still nailed on. The trestles are lashed with rope, wire and in one place a belt. The last trestle has nail holes in its top where its plank was, and the plank is gone, not rotted.",
  },
  "the-reed-fork": {
    "reed|path|fork|stand":
      "Both paths are worn to the same width and depth, which is the trouble. On the stand of reed between them somebody once cut a blaze, a square of stems sliced off level, and the reed has grown back through it so it is only a slightly different green.",
  },
  "the-cutters-eyot": {
    "stacks|reed|hut|whetstone|post|hooks|reed-hooks":
      "The whetstone on the post is worn into a deep saddle, and there is a little pile of grey grit at the foot of the post from all the grinding. The reed-hooks in the row are not all old. Two of them are sharp, freshly, and the wooden handles are dark with the oil of a hand.",
  },
  "the-first-shoal": {
    "shoal|gravel|bank|withies|current":
      "The withies across the shoal are planted in pairs, one either side of a line, and the line bends where the deep water bends. On the shoal's crest a flat stone has been set into the gravel, the only stone here somebody put down on purpose. It has a notch cut in it, pointing on.",
  },
  "the-net-stakes": {
    "stakes|pound|funnel|lines|engine|weed":
      "The stakes are driven at a lean, all pointing into the tide, so the push of the water drove them in tighter. The pound at the point is a ring of stakes closer set than the rest, and in its middle the gravel is scoured into a hollow where the trapped fish thrashed.",
  },
  "the-first-pier": {
    "pier|plinth|arch|plank|stubs|stone":
      "The plinth's top is grooved with chisel lines all running the same way, the dressing nobody ever covered with a road. The plank is wedged into the stub of the next arch's springing with three iron spikes. Two of the spikes are newer than the plank.",
  },
  "the-scaffold-stub": {
    "putlog|holes|timber|scaffold|pier":
      "The timber in the hole is oak, squared with an adze, and the adze marks are still crisp. The holes go into the pier a full arm's length. At the bottom of one of them there is a pair of old iron dogs, the clamps that held a scaffold together, dropped and never fetched.",
  },
  "the-blowhole": {
    "shaft|hole|blowhole|roof|daylight|spray":
      "The rock around the bottom of the shaft is wet and green with weed that should not grow this far from the sea, fed by the spray. The shaft's sides are smooth and scalloped, worn round by air and water going up and down it. It breathes on its own; you can feel the draught on your face.",
  },
  "the-fallen-roof": {
    "slab|roof|ceiling|sand|cave":
      "Look up and the scar is there in the roof, the exact shape of the slab, paler than the rock round it. The slab landed flat and broke in two along a line. The sand on the windward side of it is rippled and the sand in its lee is smooth, and something has lain in the smooth sand.",
  },
  "the-first-crossing-stone": {
    "causeway|road|stone|surface|weed":
      "The stones of the road are pinned to each other with iron cramps, leaded in, and you can see the grey lead where the weed has torn off. The weed points east. Every tide that went over this went over it the same way, and combed it.",
  },
  "the-dead-end": {
    "stake|rag|path|water":
      "The rag is a strip torn off a shirt, tied in a hard knot that somebody pulled tight with their teeth; you can see the tooth marks in the cloth. It has been retied once, a second knot over the first. The stake it is tied to has been pushed in by hand, not driven.",
  },
  "the-stake-line": {
    "stakes|stake|line|reed":
      "Every tenth stake is taller and has a notch cut in it. Count the notches and you know how far you have come. Some of the short ones in between have been replaced with fresher wood, and whoever replaced them kept the count.",
  },
  "the-first-channel": {
    "channel|water|gravel|shoals":
      "The water runs clear over gravel that is rolling as you look at it, small stones tumbling downstream along the bottom in a steady dribble. On the far side the withies stand a little upstream of where you would aim, because the current carries everybody down.",
  },
  "the-plank-span": {
    "planks|plank|pier|lashing|span":
      "The lashings at each end are tarred rope, wound on and wound on, and the tar has run and set in drips down the pier's face. The two planks are not the same length; the shorter one rests on a wedge. In the middle of each plank the wood is worn pale by feet.",
  },
  "the-channel-brink": {
    "stage|timber|rope|channel|water":
      "The end timber of the stage is scored deep across its top where the ferry's rope ran over it, a groove you could lay your arm in. The bolts holding the end beam are newer than the beam. The water at the foot of the posts moves without making a sound.",
  },
  "the-shingle-bank": {
    "shingle|stones|bank|wall|sand":
      "The stones are sorted top to bottom: fist-sized at the crest, pebbles at the foot, sand at the very bottom. Dig a little at the foot and you find things in the sand: a cork, a twist of rope, a buckle green with salt. The bank keeps what it is given and rolls it under.",
  },
  "the-drowned-chamber": {
    "sand|floor|band|salt|walls|roof":
      "The white band is a crust you can scrape off with a fingernail, and under it the stone is dark and soft as cheese. The sand is raked into long shallow curves that follow the walls round, the way water swirls when it fills a room from one side. Nothing is buried in it more than a finger deep.",
  },
  "the-weeded-milestone": {
    "milestone|stone|number|socket|weed":
      "The number is cut in the same square letters as the east road's stones, and the direction is an arrow with a split tail. Below the weed line the letters are furred over and soft at the edges; above it they are as sharp as the day they were cut. The water has been eating it from the bottom up.",
  },
  "the-black-eyot": {
    "eyot|peat|alder|alders|ground|island":
      "The alders fell eastward, both times, and sent up new trunks from the fallen ones, so the stand is a tangle of old trunks lying down and young ones standing on them. Under them the peat has been cut, a long time ago, in neat square steps. Somebody dug fuel here.",
  },
  "the-second-shoal": {
    "shoal|spine|stone|print|boot|tracks":
      "The boot print is a heavy one, nailed, the nail heads in a ring round the heel. The water in it is clear and has not yet silted. Nearby the bird tracks cross over it and none of them cross under, which puts it after the last of the night and before the birds came down.",
  },
  "the-second-pier": {
    "pier|plinth|arch|fire-scar|bones|stone":
      "The fire-scar has been used over and over, the stone under it cracked and flaking from heat, and the fish bones round it are of all ages, from grey and crumbling to white and greasy. The fires were always laid on the same spot, the one place the wind does not reach.",
  },
  "the-drowned-mooring": {
    "posts|mooring|channel|stage":
      "Each post is worn into a waist where ropes were taken round it, and the waists are at different heights going out, each a little lower than the last. The mooring was used as the water rose, post by post, until it was only the first three.",
  },
  "the-rope-run": {
    "rope|stage|water":
      "Close to, the rope is spliced in three places, and the splices are done well, the strands tucked and whipped. It is not one rope but four, of different ages, joined. Near the stage it is worn flat on top where hands have slid along it.",
  },
  "the-weed-gallery": {
    "weed|roof|gallery":
      "Lift the weed and the roof under it is rock, and the rock is pocked all over with small holes where shellfish bored into it when it lay in the open sea. The weed's holdfasts grip the holes like hands. The water dripping off the blades is salt and ice-cold.",
  },
  "the-sand-crawl": {
    "sand|ripples|bars|roof|rock|weed":
      "The bars of sand all lean the same way, their steep faces toward the back of the cave: the water comes in faster than it goes out. On the wet rock at shoulder height there is a smear of something greasy, rubbed along the stone by things that have come through here on their sides.",
  },
  "the-causeway-bend": {
    "bend|causeway|road|ridge|shingle|weed":
      "On the outside of the bend the kerbstones are bigger and set deeper, and every one of them has an iron cramp to the next. The builders knew the water would push here hardest. Two of the cramps have been replaced, and the new lead is a brighter grey.",
  },
  "the-tern-causey": {
    "causey|brushwood|terns|bundles|nests":
      "The nests are not nests, only hollows in the brushwood with a few shell fragments in them and two speckled eggs. The bundles round them are white with droppings. Some of the bundles are fresher than the rest, laid on top of the old ones by somebody who did not want the causey lost under the birds.",
  },
  "the-white-dunes": {
    "dunes|sand|crests":
      "The sand is so fine it squeaks underfoot. Here and there the wind has uncovered something on a dune's flank and will cover it again tomorrow: a fence post, the line of an old wall, a scatter of shells too far from the water to have walked here.",
  },
  "the-grey-marsh": {
    "marsh|creeks|creek":
      "Every creek has the same steep mud sides and the same glint of water at the bottom. On one bank a short stick is pushed into the mud with a twist of grass tied round it, somebody's mark for something. There is no second stick to say what.",
  },
  "the-second-channel": {
    "channel|water|gravel":
      "The gravel on the bottom is bigger here, stones the size of an egg, and they shift underfoot less than the small. The current has scooped a trough along the middle deeper than the rest. On the far side the withies are planted thick, one every stride, for the people who come out of this cold.",
  },
  "the-gap": {
    "gap|beam|pier|girder|iron":
      "The beam is a single length of iron, riveted, the rivets rusted into lumps. At this end it is bedded into a slot cut in the pier's stone and wedged with iron wedges. The stone round the slot is stained orange down its whole face, from the rust running off it every rain.",
  },
  "the-starling": {
    "starling|apron|stone|point|pier":
      "The apron's stones are cramped together with iron and the iron has bled orange down every joint. In the angle at the point there is a jam of driftwood, rope, a cart wheel, and bones, packed so tight the water goes through it without moving any of it.",
  },
  "the-cold-spring": {
    "spring|water|weed|boil|shimmer":
      "The weed over the spring is bright green and fine as hair, not the black flat weed of the rest of the channel. Put a hand in the boil and it is colder than the water round it, and it pushes. The mud on the bank above is printed with every kind of foot.",
  },
  "the-green-water": {
    "water|green|line|shallows|bottom|edge":
      "On the shallow side of the line the gravel is grey and ordinary. On the deep side it drops away in a steep slope of clean stones, and the slope is too steep for anything to settle on it. A few stones roll down it as you watch, and you do not see where they stop.",
  },
  "the-sea-cave": {
    "cave|stone|walls|sand|floor":
      "The walls are hollowed in scoops the size of a bucket, each scoop smooth inside, cut by stones the sea swirled round in it. Some of the scoops still have their stone in the bottom, round as an egg. The sand at the mouth is printed by the last tide in a long curve.",
  },
  "the-shell-scar": {
    "scar|mound|shell|layers|ash|bone|flints|earth":
      "The flints in the dark earth at the bottom are worked, struck flakes with sharp edges. The burnt bone in the ash band is small, bird and fish. Pull a shell from any layer and it is the same shellfish all the way up: these people ate one thing, here, for a very long time.",
  },
  "the-shell-eyot": {
    "eyot|island|shell|mound":
      "Every shell on the mound is broken open at the same place, a little chip off the hinge where a knife went in. Lower down, where the mound is cut, the shells are packed with grey ash. People sat here and opened shellfish, and opened shellfish, until they had made an island.",
  },
  "the-cord-grass": {
    "grass|cord|bank|creek|mud":
      "Part the grass and the mud under it is laced through with roots, white and tough as cord, which is where the name came from. The top of the bank is worn into a narrow path. On the side of the bank, where people did not walk the top, there are holes, deep ones, with nothing at the bottom.",
  },
  "the-sea-purslane": {
    "purslane|bushes|creek|mud|banks":
      "The leaves are thick and grey and salt to the taste. Under the bushes the mud is soft and there are deep slots in it where something put a foot through and pulled it out. The creek below has a dropped stake standing upright in the middle of it, sunk to its top.",
  },
  "the-quicksand-flat": {
    "sand|flat|withies|rope|water":
      "The rope is knotted to the three withies with a knot that takes a thought to tie, and tied tight. Out on the flat, ten yards from the rope, a single stick is standing upright in the sand with its top gone dark. It was pushed in by somebody, from the edge, as far as they could reach. It is a long reach.",
  },
  "the-long-bank": {
    "bank|gravel|weed|tideline|crust":
      "The crust of dried weed along both sides is laced with feathers and tiny bones, the line of everything that floated. The gravel along the crest is trodden into a path by more feet than birds have. In two places along it somebody built a little cairn of stones, knee-high, to see the way by in a fog.",
  },
  "the-second-crossing-stone": {
    "milestone|stone|barnacle|barnacles|weed|number":
      "The barnacles are thick on the north face, crusted over each other in layers, and the ones at the top are dead and white. On the south face there is not a single one. The number cut into it has been filled with something dark and hard, pitch, so it would read wet.",
  },
  "the-heron-tree": {
    "tree|alder|herons|heron":
      "The alder is dead and grey and every branch the herons stand on is white with their droppings. At its foot, in the water, the mud is littered with fish heads and frog bones. The herons have been standing here, these herons or their fathers, for as long as the tree has been dead.",
  },
  "the-salt-causey": {
    "causey|stone|stones|samphire|gaps":
      "The stones are laid without kerbs and without a bed, just set down on the salt mud in a line. Some have sunk. Some have been lifted and set back. One has a chisel line cut along it where somebody started to dress it and gave up after a hand's length.",
  },
  "the-marram-sea": {
    "marram|grass|dunes|dune":
      "Down at the roots the marram grows out of sand that is always moving, and the roots climb up through it as it piles, so every clump stands on a little column of old roots. A path through it has been flattened by something low and heavy, not by feet.",
  },
  "the-saltmarsh-pools": {
    "pools|pool|turf|ground|water":
      "The pools are almost perfectly round and all much the same size. Their bottoms are bare grey mud. The firm ground between them is cropped short and trodden with a narrow path that goes round each pool on its landward side, never its seaward.",
  },
  "the-crooked-creek": {
    "creek|banks|bank|mud|loops":
      "On every bend the outside bank is undercut and the inside is a little beach of soft mud printed thick with birds' feet. At the tightest loop a plank has been laid across the creek and left. It is grey and split and the mud has nearly taken it.",
  },
  "the-third-channel": {
    "rope|posts|channel|water":
      "The posts are driven deep and stayed with smaller posts behind them, leaning in, so the rope cannot pull them over. The rope is worn shiny along its whole length. Where it is tied off at the near post it is knotted round on itself four times, more than it needs.",
  },
  "the-drowned-withies": {
    "withies|withy|current|water":
      "Each withy has a twist of bark left at the top, the marker's trick, and the twists stream out flat on the current. They are planted in a line, and the line points to a crossing that is no longer there. The new line of withies runs off at an angle away from them.",
  },
  "the-third-pier": {
    "pier|tower|plinth|pins|windlass|drum|stone":
      "The iron pins are set in a row across the roadway, for a bar or a chain that was swung across it. The windlass drum lying on its side still has a few turns of chain on it, rusted solid. The tower stump is only shoulder high, and its door faced the road.",
  },
  "the-tollhouse-shell": {
    "tollhouse|room|window|door|slot|brackets":
      "The slot in the floor looks straight down at the water. It is the width of a hand and worn smooth along both edges. The window faces the road, not the water, and on its sill there are rows of small marks scratched with a point, counting.",
  },
  "the-slack": {
    "slack|water|spur|rock":
      "Turning in the slow circle are a hat, a cask stave, a dead gull and a lot of froth. Along the foot of the spur a tidemark of rubbish has dried onto the rock. Somebody has set a hooked pole against the spur, the right length for reaching out and drawing things in.",
  },
  "the-mid-channel": {
    "channel|rope|water":
      "The rope sags under the water here, and the bit of it you can see before it goes down is green-furred and slick. Looking down along it the green gets darker and then the rope is only a pale line going away under you, and then not even that.",
  },
  "the-weed-raft": {
    "raft|weed|driftwood|mat":
      "Where the mat is thickest it is driftwood laced through with weed, and you can see daylight between the logs. Where it is thinnest it is only weed, and it looks the same. Pushed against its edge there is a drowned sheep, and the weed has started to grow over it.",
  },
  "the-crab-pools": {
    "pools|pool|weed|ledges|crabs":
      "Under the ledges the crabs back into their holes and wait, their claws held up in front. The pools are lined with pink crust and the crust is grazed in long clean tracks by limpets. Somebody has rolled a flat stone across the deepest pool's mouth, half closing it.",
  },
  "the-sunken-stretch": {
    "causeway|road|stretch|water":
      "Under the standing water the road is still the road, stone and cramps, and a green slime on it that makes the wade slow. At both ends of the dip there is a short post with a cut on it at knee height. Water above the cut, and the dip is past wading.",
  },
  "the-samphire-flat": {
    "samphire|mud|flat":
      "The samphire has been cut, here and there, in neat patches, the stems sliced through above the mud by a knife, and the cut stems are already putting out new green. The cutters stepped carefully: there are footprints only along the edges of the patches.",
  },
  "the-salt-marsh": {
    "marsh|creeks|creek|banks|mud":
      "The creek banks are straight-sided and glossy and the bottoms are deeper than the banks are wide. At the edge of the nearest one there is a sliding scar in the mud, long, ending in the water, where something went over and did not climb back out at this place.",
  },
  "the-blowout": {
    "blowout|bowl|sand|roots|marram|rim":
      "The roots hanging round the rim are white and dry and longer than a man is tall, which is how deep the dune had grown before the wind opened it. On the bowl's floor lie a few dark stones and the bones of a sheep, uncovered and drying, and soon to be covered again.",
  },
  "the-redshank-ground": {
    "marsh|birds|bird|redshank|ground":
      "The ground is cropped short and printed everywhere with small three-toed feet. In a tussock there is a hollow lined with grass, with eggs in it the colour of the mud. The birds that rose went up from just here, and are still going round over it, shouting.",
  },
  "the-sea-lavender": {
    "lavender|marsh|runnels|ground":
      "The runnels under the lavender are a finger wide and shallow and full of salt water that has nowhere to go. They are crusted white at their edges. Something has been nipping the lavender's flowers off along a line that runs straight across the patch.",
  },
  "the-high-water-mark": {
    "wrack|line|weed|cork|feathers|oar|mark":
      "The broken oar has a name burnt into its loom, too worn to read except the first letter. The cork is a net float, a ring of it, with a hole for the line. The wrack line is two lines, one fresh and one old and grey a stride higher, the biggest tide anybody here has seen lately.",
  },
  "the-gull-stand": {
    "gulls|shoal|stand":
      "The shoal under the gulls is white with them and littered with broken shells, cracked open by being dropped from a height. The gulls all face the wind so it does not get under their feathers. Among them the shells of every crab and mussel the crossing makes are piled.",
  },
  "the-mid-ford": {
    "post|crosspiece|shoal|rest":
      "The crosspiece is at chest height and worn smooth along its whole length by hands gripping it, and the post's upstream face is scoured pale by the water. Cut into the crosspiece, small, are initials, and here and there a date with the year worn off.",
  },
  "the-broken-arch": {
    "arch|stones|course|rope bridge|bridge|end":
      "Along the top of the arch the stones are cut with a mason's number, counting up toward the break, and the last numbered stone is the one you stand on at the end. The rope bridge's near end is made fast round that stone in a figure of eight, over and over.",
  },
  "the-pier-foot": {
    "steps|ledge|ring|rope|pier":
      "The ring is new iron, leaded into an old hole that once held a bigger ring. The rope is good rope, tarred, and it runs down at an angle into the channel and does not move in the current, which means something heavy is on the end of it. The steps have been chipped back where they were broken.",
  },
  "the-far-rope-stage": {
    "stage|bollard|block|post|ring|rope|rock":
      "The ring is leaded into a hole drilled straight into the bank's bedrock, and the lead has been topped up, a newer pour over an older one. The block still turns when you push it. Its sheave is greased black and the grease is not old.",
  },
  "the-sluice-stone": {
    "slab|stone|grooves|groove|arch|gate|sluice":
      "The grooves are worn smoother at the bottom than the top, where the gate sat most of the time. Beside the slab there is a socket cut in the causeway for a post with a pulley, and a rope groove worn across the slab's top edge. Somebody hauled the gate up and down here, a lot.",
  },
  "the-bothy-of-the-crossing": {
    "bothy|lintel|hearth|bed-shelf|shelf|door|roof|slate":
      "The rule on the lintel is cut deep, and under it, smaller, other hands have added their initials, a column of them, people who did as it said. There is dry wood stacked by the hearth and the bed-shelf has a heap of bracken on it that is not this year's. The slates have been patched with a flat stone in one place.",
  },
  "the-creek-crossing": {
    "plank|creek|banks|mud|water":
      "The plank is an old ship's timber, adzed flat on top and still showing a row of treenail holes. Both its ends sit in grooves worn into the mud banks, which have been dug out and squared to hold it. It has been moved up and down the bank more than once as the creek widened.",
  },
  "the-dune-ridge": {
    "ridge|dune|dunes|marram|sand|crest":
      "The marram along the crest leans all one way and has been combed through by the wind so long that the sand round each clump is scooped into a little hollow on the same side. In the hollows below, the sand is damp and holds a print; on the crest it pours back into any print you make.",
  },
  "the-drained-creek": {
    "creek|bed|mud|banks|prints|trickle":
      "The prints in the mud are a heron's three long toes, a gull's webbed feet, and a line of small paired marks with a tail-drag between them. Some go up the creek and some come back down. The banks are cracked into great slabs that are slowly sliding into the bed.",
  },
  "the-samphire-flats": {
    "samphire|mud|creeks|stems":
      "Each stem stands on its own, a hand apart from the next, as though it had been set out in rows. The mud between them is shining and bare. A few stems have been snipped off clean at the bottom, and the cut ends are still wet and green.",
  },
  "the-tide-race": {
    "race|waves|water|line":
      "The standing waves hold their places exactly, the same humps of water over the same stones below, while the water pours through them. Along the edge of the race the gravel has been piled into a ridge by the fight between the two waters. Foam is caught in it, yellowed.",
  },
  "the-fourth-channel": {
    "channel|water|gravel":
      "The gravel here is coarse and bedded, stones jammed against each other by the water, and they do not roll. The withies on this side are planted leaning the other way, into a current that comes from the east. Somebody who knew this water set them that way on purpose.",
  },
  "the-far-ferry-steps": {
    "steps|bench|lantern|treads":
      "The scoops in the treads are deepest at the bottom step, where everybody stepped off the boat, and shallowest at the top. The bench is one slab on two stones, and the lantern place behind it is a niche cut in the bank with the soot of a lot of nights on its roof.",
  },
  "the-half-drowned-cart": {
    "cart|wheel|ironwork|bed|wood":
      "The cart's tailboard is down and its chain hangs loose. The wheel that is left turns on a greased axle. There are scrape marks on the causeway's edge above it, fresh pale scores in the stone, where it went over sideways with its load still on.",
  },
  "the-mid-causeway": {
    "road|causeway|water|post|shores":
      "The road here is worn exactly as hard as at the ends; people did not hurry over the middle, or if they did their feet did not show it. A single kerbstone on the south side has been knocked out of line and leans into the water, and the gap where it stood is full of weed.",
  },
  "the-strand-track": {
    "track|shingle|shore|marsh":
      "The shingle on the track is pressed flat and the stones are polished on top, the way stones get only under thousands of feet. On the landward side of it, every so often, a path goes off into the marsh, narrower, each to some piece of ground somebody worked.",
  },
  "the-cockle-strand": {
    "shells|shell|cockle|track|water":
      "The cockle shells on the track are crushed to a grey grit, and the grit is deepest down the middle where the feet went. At the tideline the whole shells start, white, open, a few still paired. The water coming back has a long low line of foam in front of it.",
  },
  "the-mud-shore": {
    "mud|shingle|track|samphire|birds|prints":
      "The mud below the track has a boot in it, sunk to the ankle and left, the leather gone grey and stiff. The bird prints run over and round it. Along the top of the samphire the track is trodden into a narrow hard line no wider than one foot in front of the other.",
  },
  "the-gutway": {
    "slab|bridge|gut|creek|water":
      "The slab is a single stone, long and thin, and the hollow worn in its middle holds a puddle of salt water after every tide. Its ends are bedded on stones set into the mud, and those have been reset, recently, by somebody who packed fresh clay round them.",
  },
  "the-salting-edge": {
    "turf|bank|salting|creeks|track":
      "The turf is grazed short and studded with small droppings, sheep's or something like them. The bank's face is cut by the tide into a little cliff of mud and roots, and you can see in it the layers of every flood that put silt down on the turf and built it up.",
  },
  "the-creek-mouth": {
    "creek|mouth|posts|staithe|mud|stream":
      "The staithe posts are thick black oak with iron rings, and the rings are worn on the downstream side. The mud between the posts is pocked with the round holes left by the bottoms of boats settling at low water, over and over, in the same places.",
  },
  "the-marsh-strand": {
    "track|reed|marsh|water":
      "There is nothing here, and the track knows it: it runs straight, with no turnings and no repairs, because there is nowhere to turn to. At its edge a single upturned crab shell, bleached white, lies where a bird left it.",
  },
  "the-hard-approach": {
    "track|creek|reed":
      "The track is built up a foot here with turf and stones on its creek side, because the creek kept eating it. The building is in three different kinds of work, one on top of another, as each lot of repairs was undermined and repaired again.",
  },
  "the-marsh-hard": {
    "hard|stone|bollard|ruts|cart-ruts":
      "The ruts are worn through the laid stone into the clay underneath, and the stones along them are rounded off at the edges. The bollard is a stump of old ship's mast with an iron band round its top. A rope has worn a ring into it just below the band.",
  },
  "the-sea-buckthorn": {
    "buckthorn|thorns|thicket|berries|branches":
      "The way through is a low tunnel at knee height, the thorns on its roof bent back and polished by something going through it, often. Orange berries lie squashed along its floor. Caught on the thorns at the mouth are tufts of grey fur.",
  },
  "the-samphire-island": {
    "island|ground|grass|creeks":
      "The grass on top is grazed, and in the middle there is a ring of stones set flat in the turf, the size of a hut, with a gap for a door on the landward side. Somebody once lived out here where they could see anything coming. The hearth stone in the middle is cracked by fire.",
  },
  "the-storm-ridge": {
    "ridge|shingle|crest":
      "The stones on the seaward face are all big, flung up and left. The landward side slopes down in finer gravel. Along the crest the stones are flattened and darkened in a narrow line, a path, because it is the one place on this whole shore with a view in every direction.",
  },
  "the-cockle-beds": {
    "cockles|beds|sand|holes":
      "The paired holes are breathing as you watch, tiny spurts of water from some of them when your foot comes down nearby. The sand has been raked in long parallel lines, and the rake was a wide one, with a lot of teeth. The lines are softening already.",
  },
  "the-shell-bank": {
    "shell|shells|bank|cockle|mussel|razor":
      "The razor shells are the only ones whole; the cockle and mussel are broken open the same way, a knife's chip at the hinge. Push a hand into the bank and the shell goes down and down, dry and white, with grey ash in it lower down.",
  },
  "the-fourth-pier": {
    "pier|plinth|arch":
      "The far arch's stones are cut with the same mason's numbers as the near arch's, counting down this time from the far bank. The plinth's top is worn by feet in a path from where the rope bridge lands to where the arch begins.",
  },
  "the-far-hard": {
    "hard|ramp|stone|keels|grooves":
      "The keel grooves on this ramp line up with the ones on the western hard, same spacing, same depth. The green below the line is a fur of weed you could part with a finger; the white above is stone worn by boats' bottoms and people's boots until it is almost polished.",
  },
  "the-causeway-cross": {
    "cross|stump|arms|verge":
      "The stump has offerings round its foot, small things from a long way back: a ring of green copper, a few flat stones set on each other, a button. Each one was put down by somebody who got this far and wanted to say so. The stump is worn smooth on its landward side by hands.",
  },
  "the-grey-dunes": {
    "dunes|lichen|moss|heath|sand|crust":
      "Step off the path and the crust of lichen breaks and the sand underneath is bone dry and pale. The old footprints in the crust stay for years: you can see a line of them going off into the dunes, filled with moss, from somebody who walked here long ago.",
  },
  "the-old-sea-bank": {
    "bank|earth|sea bank|marsh":
      "The bank has a ditch along its landward side that it was dug out of. At each end where it stops, the sea has bitten the end off in a ragged cut. Halfway along there is a sluice through it, a box of timbers gone black, its flap rotted off.",
  },
  "the-wide-creek": {
    "creek|water|mud":
      "Along the creek's bank a line of stakes stands in the mud, short and grey, where somebody once tried to put a footbridge across and never finished. The creek has moved since and the stakes are now half in the water. The banks are printed with a hundred bird feet.",
  },
  "the-fifth-channel": {
    "channel|weed|water|current":
      "The weed is long green ribbons, all lying downstream, all rooted in the gravel. It parts round your legs and closes behind you. Under it, the gravel is stuck with small white shells that crunch when you step.",
  },
  "the-eel-grass": {
    "eel grass|grass|meadow|shallows|soil":
      "The eel grass is rooted in dark mud that smells of eggs when you stir it. Little fish dart off from your feet in clouds. Between the blades there are snail shells, thousands, and the blades themselves are spotted with the eggs of something laid in long jelly strings.",
  },
  "the-far-arch": {
    "arch|parapet|bench|recess|roadway":
      "The bench is worn into two hollows side by side, and the parapet's top is worn smooth in two places in front of them where elbows rested. Cut into the parapet's inside face are lines of initials, the oldest so shallow now they are only felt, not seen.",
  },
  "the-far-noust": {
    "noust|boat|hollow|stone":
      "The boat is clinker-built, its planks overlapping, every rivet clenched over a little square of iron inside. The tar is old but has been renewed on the keel. Under the upturned hull, in the dry, a set of oars lies on the stone, and they are not rotten.",
  },
  "the-far-milestone": {
    "milestone|stone|face|number":
      "The cut face reads clean because the stone is high enough the weed never got to it. The number is filled with old pitch to stand out wet. On its back somebody has scratched a long line of strokes in fives, counting crossings, perhaps, or tides, or days.",
  },
  "the-wildfowler": {
    "hut|stand|rest|gun|driftwood|turf|wood":
      "The rest is a forked post with a groove worn round in its crotch, polished, where the barrel swung. The arc worn into the wood beneath is a hand's width deep at the middle and shallow at the ends; the gun was aimed at the same patch of water nearly every time.",
  },
  "the-withy-bank": {
    "withies|withy|rows":
      "The new withies are cut willow still green inside, pushed in by hand and the earth pressed round them with a heel; the heel marks are still in the gravel. The old ones beside them have split at the top and the twists of bark on them are long gone.",
  },
  "the-bridge-strand": {
    "bridge|arch|piers|stonework|underside":
      "The underside of the arch is whiskered with little white stalactites where water has seeped through the mortar and left lime. In the joints between the stones there are swallows' nests, mud cups, rows of them. The piers' feet are wrapped in weed to the high-water line.",
  },
  "the-mussel-bank": {
    "mussels|mussel|shell|causeway|road|stone":
      "The mussels are bearded to the stone with brown threads, and you can see the stone under them only where somebody has cut a path through, scraping them off with a blade. The scraped path is already being taken back, with tiny new mussels the size of a fingernail.",
  },
  "the-fowlers-track": {
    "track|faggots|causeway|mud|salting":
      "The faggots are bundles of brushwood laid lengthways, and where they have rotted they have been replaced with bundles laid across. Every few yards a stake keeps them from drifting. The whole track creaks and sighs underfoot, and a heron gets up from a long way off.",
  },
  "the-decoy-wood": {
    "willows|willow|decoy|pipes|hoops|trees|rise":
      "The hoops are hazel, bent into arches and pegged at each end, and the rotted net still clings to a few of them. The pipes narrow as they go, each curving off the same way, so the ducks could not see the end until they were in it. The willows were planted in a ring.",
  },
  "the-last-shoal": {
    "shoal|gravel|bank":
      "The withies on the last shoal stand in a straight line pointing at the landing, the only straight line in the whole ford. The gravel here is trodden flat in a path between them, and on either side of the path it lies loose and untouched.",
  },
  "the-shingle-spit": {
    "spit|shingle|stakes|fence":
      "The stakes are fence posts, squared and mortised for rails, and two still have a rail in them. They were set on dry land in a line toward the bridge. The shingle has built up round them to half their height.",
  },
  "the-oyster-scars": {
    "ledge|scars|shells|marks|tongs|rakes":
      "The tong marks are paired scratches in the rock, two by two, and they are all over it like writing. The oyster shells underfoot are big and grey and layered, and the deeper you dig the bigger they get. Nothing on the ledge now is as big as the old shells at the bottom.",
  },
  "the-cutting-water": {
    "channel|slabs|slab|bridge|bank":
      "The two slabs still in place are cramped to each other with an iron bar leaded into both. The third slab lies in the channel where it fell, end up, with the water piling against it. The causeway's stone on both sides of the cut is broken off rough, not cut: the water did it.",
  },
  "the-cockle-scars": {
    "heaps|shell|mud|beds|scars|ground":
      "The shell heaps are layered in bands, white and grey, and in the grey bands there is charcoal from the fires the cockles were boiled on. In one heap's flank somebody has cut a step, and then another, up to the top where they could look out over the beds.",
  },
  "the-ford-landing": {
    "landing|hard|shingle|ruts|cart-ruts|stone":
      "The ruts are worn deep in the laid stone and run straight inland, the same width apart as the bridge's ruts and the causeway's. It is the same carts. At the top of the hard there is a single flat stone off to the side, worn smooth on top, where people sat to wring out their clothes.",
  },
  "the-wrack-bank": {
    "wrack|weed|bank|flies":
      "Push a hand into the bank and it is hot inside, wet and rotting and alive with little hopping things. The weed is layered, each storm's on top of the last, the bottom ones black and soft. A path has been trodden straight through, and it is the only firm part of it.",
  },
  "the-passengers-rest": {
    "shelter|bench|window|slot|hollows|roof":
      "The four hollows in the bench are worn to slightly different depths; the one nearest the window is the deepest, because everybody wanted that one. The slot window's sill is rubbed smooth by elbows. Scratched into the back wall at a sitting man's height are tallies, and a drawing of a boat.",
  },
  "the-weed-flat": {
    "bladderwrack|wrack|weed|bladders|road|causeway":
      "Lift a handful of the wrack and the road is there under it, cramped stone, slick and green. The bladders pop with a little spit of salt water. The weed is rooted to the causeway's own stones, holdfast to holdfast, as if the road were a reef.",
  },
  "the-perch": {
    "beacon|tripod|legs|cage|fire|nest|perch":
      "The legs are oak, tarred black, the tar thick and cracked like old paint, and bolted at the top to an iron ring. The cage is full of sticks and gull feathers, a nest built in the fire-basket, and under the nest there is still a cake of black ash from the last fire that was lit.",
  },
  "the-gull-flats": {
    "mud|gulls|flats":
      "The mud is printed so thick with gulls' feet that it is more print than mud. Broken crab and mussel shells are scattered everywhere, dropped from a height to crack. In the middle of the flats there is one bigger print, a single boot, sunk deep, and no second one after it.",
  },
  "the-cart-ruts": {
    "ruts|troughs|track|grass|crown|water":
      "The ruts are worn down to bare rock in the bottom, and the rock is scored along its length by iron tyres. The water standing in them is clear and full of tadpoles. On the crown the grass is long and seeding, untouched by any foot.",
  },
  "the-hard-standing": {
    "standing|chalk|kerbs|ruts|wheel-ruts":
      "The chalk is rammed so hard it rings when a heel comes down on it, and white powder comes up off it in a dry wind. The ruts cross each other in a fan where carts were turned. At one edge a heap of broken chalk lumps, unused, has gone green with moss.",
  },
  "the-ferry-lane": {
    "lane|banks|ground|field":
      "The banks of the lane are stepped where the old surfaces were, each a little lower than the last: you can see the lane sinking through the ground in layers. Roots of hedging hang out of the banks overhead. Down at the bottom the stones are worn smooth and slightly dished.",
  },
  "the-causeway-rise": {
    "road|bank|verge|camber|causeway":
      "Where the road comes up out of the weed, the last weed-mark on the kerbstones is a dark line, and above it the stone is lichened grey like any ordinary road. The verges are cut back square. The camber has drain slots through the kerb every few yards on both sides.",
  },
  "the-saltings-gate": {
    "gate|rail|hinge|posts":
      "The top rail is worn smooth in a long pale stretch at the latch end, the shape of forearms. The one hinge left is iron, and the gate hangs from it a little crooked, its far end resting on a stone somebody put there to hold it up. The posts on either side are sound.",
  },
  "the-ford-corner": {
    "corner|heap|road-stone|stone|turn|road":
      "The heap of road-stone is broken shingle, raked into a mound and left for mending the road, and grassed over before the mending came. Somebody stuck a stick in the top of it. The turn is worn wide on the outside, where carts swung round.",
  },
  "the-drove-road": {
    "verge|verges|grass|road":
      "The verges are greener and coarser than the moor beyond them, the grass fed by a great deal of muck over a great many nights. Along the inside of each verge there is a line of old stakes, for hurdles, every one rotted to a stub. The road between them is worn in the middle and the edges both.",
  },
  "the-shepherds-stone": {
    "stone|boulder|hollow|seat|initials":
      "The hollow in the top of the boulder is smooth and holds rainwater; somebody drank from it, or set a pot in it. The seat stone is worn into a curve. The oldest initials on it are cut in a square hand and have moss in them. The two newer sets are in a rounder hand, perhaps the same family.",
  },
  "the-far-tide-mark": {
    "post|scale|lines|bracket|lantern|candle|frame":
      "The candle stub has run over the lantern's floor and set there in a pale tongue, and the wick is a black curl. The scale's lines on this post are cut a little differently from the western post's, the numbers smaller. The bracket has been mended with a strip of iron and two rivets.",
  },
  "the-bridge-landing": {
    "bollard|parapet|kerbs|road|landing":
      "The bollard's top is worn into a shallow dish, polished like a door handle, and the stone around the dish is a little darker from the grease of hands. The kerbs at the landing are scored by cart wheels that swung too close coming off the bridge.",
  },
  "the-toll-cottage": {
    "cottage|hatch|bench|chimney|house|room":
      "The hatch has a ledge in front of it worn smooth in a long line, where coins were slid across. The bench outside is pitted all along the front edge with knife nicks, where people waiting whittled at it. The chimney's top is stuffed with a nest.",
  },
  "the-cart-shed": {
    "shed|bays|bay|cart|ruts|wreck":
      "The wrecked cart is missing one wheel and its shafts, and what is left of it is propped level on stones somebody set under the axle. In the empty bays the ruts go in shallow and come out deep: carts went in empty and came out loaded, every one, and the last two never came back.",
  },
  "the-ferry-strand": {
    "strand|shore|road|water":
      "The shingle where the two roads meet is trodden into a flat platform, and among the stones there are a great many old buttons, buckles and nails, lost from people waiting here. The water is narrow and quick and the far bank is clear enough to see a figure on it.",
  },
  "the-boat-graves": {
    "boats|boat|ribs|hull|planks|graves|tideline":
      "Each boat lies with its bow toward the sea. The newest still has her name cut into her stern board, too worn to read. The ribs of the next are tied to stakes driven into the shingle, as if somebody wanted her to stay where she was put.",
  },
  "the-landing-arch": {
    "arch|keystone|face|causeway|road":
      "The face on the keystone has two eyes and a mouth and the faint line of a beard, and the eyes are cut deeper than the rest so they still hold a shadow. The arch's stones are all dressed and fitted with no mortar at all. Its inner faces are cut with initials up to the height of a man's reach.",
  },
  "the-far-strand": {
    "strand|shingle|weed|road":
      "The weed on this side is higher up the shingle than on the western shore; the water comes up further here. Above it the stones are dry and the shore road begins in a clean edge of laid kerb, as if somebody drew a line where the sea was allowed to stop.",
  },
  "the-marsh-road": {
    "road|salting|way":
      "No kerbs and no metalling, but the way is still clear because the grass on it is shorter and finer than the grass beside it. Here and there a stone has been dropped into a soft place and trodden in. Somebody walked this often enough to fix it with whatever was to hand.",
  },
  "the-samphire-turn": {
    "samphire|ruts|wheel-ruts|track|salting|turn":
      "The samphire in the ruts grows in two neat green lines, one in each, and it stands upright and unbroken. Where the track turns onto the salting the ruts swing wide, cut by wheels long ago, and now the only thing using the curve is water.",
  },
  "the-crossing-house": {
    "house|lamp|hatch|yard|well|stabling|stalls|stone":
      "The stabling runs along one side, eight stalls, each with an iron ring in the wall worn on its inside curve and a manger of hollowed stone. The mangers have dry grass in them, bedded down, not fodder. The stone of the house is the same as the causeway's, cut by the same hands.",
  },
  "the-well-yard": {
    "well|well-head|windlass|chain|bucket|yard|cobbles|water":
      "The windlass drum is worn bright where the chain runs and the chain links are worn thin on their inner sides. The cobbles round the well-head are dished in a ring where people stood to draw. The bucket is oak, hooped with iron, and somebody has replaced one of its staves.",
  },
  "the-keepers-garden": {
    "garden|beds|bean-frame|frame|beans|tree|wall":
      "The beds are edged with boards and the soil in them is black and fine, much better than any soil out here: carried in, or made. The fruit tree is pruned. Along the bean rows the pods have been torn off and dropped half-eaten, and in the soft soil there are small hand-like prints.",
  },
  "the-sea-dyke": {
    "dyke|bank|turf|ramp|breaches|breach":
      "The breaches have bitten into the dyke in clean V-shapes, and the turf on their faces is torn and hanging, not slumped. The ramp is worn bare to the clay underneath by feet. Along the top the turf is cut with the square holes of old stakes, a fence that once ran along the crest.",
  },
  "the-boat-noust-east": {
    "noust|boat|hull|stones|bilge|hollow":
      "The stones on the boat's bilge are round shore stones, each about the size of a loaf, set evenly along her so she would not lift in a gale. Under her the noust's floor is swept. Her oars are inside her, lashed under the thwarts.",
  },
  "the-strand-road": {
    "road|kerbs|surface|shore":
      "The kerbstones on this road carry the same mason's arrow as the long causey and the bridge arches. One stone, a little way along, has been reset upside down, so its arrow points into the ground: somebody fixing the road after the people who built it were gone.",
  },
  "the-flashes": {
    "flashes|water|salting|dips":
      "The water in the flashes is warm on the top and cold underneath, and the bottom is soft grey mud that clouds up round your boot. The edges are crusted white. Small birds pick along them and run ahead of you, and stop, and pick, and run again.",
  },
  "the-limpet-rocks": {
    "rocks|reef|limpets|shells|shell-scatter":
      "Each limpet sits in a scar it has ground into the rock for itself, exactly its shape, and goes home to it after every tide. The empty scars are pale rings where the limpets were prised off. Among the broken shells above the tideline some have been smashed with a stone and some bitten.",
  },
  "the-shingle-rise": {
    "notch|shingle|beach|road|bank":
      "The sides of the notch are held up with timber shuttering, planks spiked into posts, and the shingle has pushed through the gaps in long grey tongues. The road through the notch has been dug out more than once; the spoil heaps lie grassed over on either side.",
  },
  "the-anchor-stone": {
    "stone|block|granite|hole|rope":
      "The hole is bored true, round and smooth, and on its inside the wear is all on one side, a long groove where the rope pulled seaward. The granite has small black and white grains and does not match a single other stone on this shore. It has sunk into the shingle a hand's depth.",
  },
  "the-drain-cut": {
    "cut|drain|channel|reeds|water":
      "The channel's sides were cut with a spade and the spade-marks are still in the clay above the waterline, every stroke the same width. The spoil was thrown up on the north side only, and is a long grassy ridge now. The water in the bottom moves slowly east.",
  },
  "the-fisher-huts": {
    "huts|hut|hulls|boats|door|stone|footings|transoms":
      "The hulls are clinker boats turned over, the gaps between the planks stuffed with moss and tar. The stone against the fourth door is a big flat one, set on edge, the kind you need both hands for. Through a crack in the door there is a shape inside that is a net, hung up and folded.",
  },
  "the-thrift-bank": {
    "thrift|sea-pink|cushions|beach|bank|stone":
      "Each cushion of sea-pink is rooted in a crack between the stones, the root going down long and tough into the dark where the rain sits. The flowers face the sun. Under the cushions the shingle is damp, and the stones are a darker grey there than anywhere else.",
  },
  "the-storm-line": {
    "tree|weed|timber|ridge|crest|line":
      "The tree is an oak, roots and all, stripped of its bark and bleached the grey-white of old bone. Its roots still hold stones in their grip from wherever it grew. The timber beside it is a ship's frame, with the bolt holes still in it, and a nail rusted solid.",
  },
  "the-wet-carr": {
    "carr|willow|sallow|stems|roots|water|leaves":
      "The stems are coated in grey lichen on the side away from the wind. The water between them is black and smells of rot when you stir it. Here and there a stem has been cut through with a blade, a long time ago, and the stump has sent up a dozen new shoots.",
  },
  "the-shingle-stair": {
    "stair|steps|seat|stone|track":
      "The seat is a slab on two uprights, set so that whoever sits on it faces the mountain square. Its top is worn smooth and dished. The stair's treads are worn in the middle, and the top step is worn most of all, where everybody stopped to look up before going on.",
  },
  "the-burn-flats": {
    "gravel|stones|flats|silt":
      "The stones are sorted by size in long low ridges, the biggest at the east end of each and the smallest at the west. Turn one over and its underside is clean, not green: these have all moved recently, in some flood that came down off the hill.",
  },
  "the-outfall": {
    "outfall|chute|water|gravel|alders|burn":
      "Where the chute hits the gravel it has dug a pool, clear and cold, with the stones at the bottom of it washed clean and rounded. The alders on either side have roots bared and white where the floods have stripped them. A branch is jammed in the chute's lip, pointing back uphill.",
  },
  // The Salt Hamlet (migs 370-373, 2026-11-04).
  "the-burnt-cot": {
    "walls|cot|black|fire|thorn|hearth":
      "The black is on the inside face only, and highest over the doorway, where a fire inside a house always climbs out. The outside of the walls is clean. The thorn has rooted in the hearth's ash and grown fat on it, and it is the biggest thorn on the hard.",
  },
  "the-wind-orchard": {
    "orchard|trees|tree|bark|windfalls|grass":
      "The dead half and the living half were planted on the same day, in the same rows, at the same spacing. The living trees have been pruned, years ago, by somebody who knew how; the dead ones were left alone. Under the living half the windfalls are bitten, not pecked, and the bites are small and many.",
  },
  "the-sea-furrows": {
    "furrows|ground|waves|crests|hollows|land":
      "Each furrow curves at the end in a long shallow hook, where the plough team was turned round on the headland a few hundred years running. The hook is the same in every one. A few stones lie along the crests where they were thrown out of the soil and never carried off.",
  },
  "the-marsh-field": {
    "field|meadow|strips|geese|grass":
      "Kneel and the old strips are there in the turf, each a slightly different height from the next, a ribbon of nettle along some of the edges where a boundary bank stood. The geese have cropped the whole of it short, and their droppings lie thick on the side out of the wind.",
  },
  "the-yard-backs": {
    "gardens|walls|wall|gaps|elder|kale|nettle":
      "The gaps in the back walls are worn smooth on top and down both sides, the stones polished by hands as well as feet. Each gap lines up with a gap in the next wall, and the next, so that one path ran the whole length of the backs and every household used it.",
  },
  "the-chapel-hard": {
    "hard|stone|stones|yews|yew":
      "The worn middle of the hard is a rough oval, not a path: people stood here, in a crowd, often, and shuffled. Under the nearer yew the stones are rubbed in two places close together where something heavy and narrow-footed was set down again and again. A bier, or a table.",
  },
  "the-salt-chapel": {
    "chapel|font|bench|door|roof|block":
      "The font is cut from a single block and still holds a hand's depth of rainwater, though the roof does not leak. The bench along the wall is worn into hollows where people sat, and the hollows are closest together by the door. The door has a bar, and the bar is on the inside.",
  },
  "the-turf-hut": {
    "hut|turf|walls|roof|driftwood|bracken|bedding":
      "The driftwood rafters are bent and silvered and every one is a different length; somebody walked the strand for them. The bracken bedding is crushed flat in one long shape along the wall and newer bracken has been pushed in at its edges, so somebody still sleeps here, or something.",
  },
  "the-hard-lane": {
    "lane|track|banks|bank|salt|walls":
      "The cut is deepest where the lane leaves the marsh, and the bank there has two old ruts worn into its side, high up, from a time before the lane had sunk to where it is now. The salt along the foot of the banks is crusted on the seaward side only.",
  },
  "the-row-foot": {
    "scorch|gable|fire|walls|ruts|shell|grit":
      "The scorch climbs the gable in a narrow tongue, and at its foot the stones are cracked across where somebody threw water on them while they were hot. Whoever lit it wanted the wall's shelter more than the wall. The ruts here run in from the furrows and stop short of the houses.",
  },
  "the-salters-row": {
    "doors|door|cots|street|walls|shell":
      "Every door is shut the same way, latched from outside and the latch tied round with a twist of cord, all the cords long rotted to stubs. Somebody went down the row closing up. The laid shell runs in front of the better cots only, a strip each, bought and laid one family at a time.",
  },
  "the-salt-cross": {
    "cross|steps|step|tally|stump|head":
      "The broken head lies face down in the grass beside the steps, too heavy to have been carried far, and nobody ever set it back. The tally on the bottom step is strokes in fives, cut neatly at first and then quickly and then hardly at all, the last few only scratched.",
  },
  "the-row-head": {
    "gate|wall|roofs|roof":
      "The gate is set to swing outward, toward the far waste, and the post on the hamlet side is worn by a hand at latch height. Count the roofs and they come out the same from here as from the marsh end, which is more than most villages can say.",
  },
  "the-net-green": {
    "posts|lines|green|grass|nets|hides":
      "The posts have notches cut in their tops at different heights, for the different nets, and the notches are worn smooth by rope. Under the hide-pegging lines there is a row of small square holes in the turf, every one the width of a peg, too many to count.",
  },
  "the-dipping-well": {
    "well|barrel|staves|water|mud|prints":
      "The barrel has had its bottom knocked out on purpose so the water rises up into it from below. The staves are hooped with withy, not iron, and the withy has been renewed at least once. The hoof-prints round it are deer and sheep and something heavier, and all of them come and go.",
  },
  "the-old-hearths": {
    "hearths|stones|ring|shelters|marks":
      "The flat stones are worn on top and cracked through from the heat, two of them split and set back together. The marks of the shelters lie in a ring round the fire, every one with its doorway toward it. Whoever came here came every year and pitched in the same places.",
  },
  "the-pump-green": {
    "well|ring|slab|rope|windlass|bucket|water":
      "The slab was dragged across the top and the drag marks are still in the turf on one side, two long scars. The windlass handle is worn bright where hands turned it. The rope's rotted end still hangs from the axle, and it is a good thick rope, better than the well needed.",
  },
  "the-salt-pound": {
    "pound|pen|gate|stones|courses|wall":
      "The gate hangs on iron pins leaded into the stone, which is why it still swings. The top course on the seaward side is knocked loose in one place, two stones down inside the pen, where something went over it from inside. There are tufts of coarse hair caught in the stones beside the gap.",
  },
  "the-smiths-yard": {
    "yard|scale|trough|ground|salt":
      "Scuff the black and it is all hammer-scale, flakes of iron knocked off hot metal, trodden in until the yard is more iron than earth. The trough was cracked by frost and mended with a lead strap, and then cracked again beside the strap, and that time nobody mended it.",
  },
  "the-saltmasters-yard": {
    "yard|cobbles|boiling-house|house|roof":
      "The cobbles are laid in a fan from the boiling-house door, set by somebody who knew how, and a cart's wheels have worn two shallow grooves straight across them to the gate. The half-roofed boiling-house still has its flue. The house across the yard has a step scrubbed white.",
  },
  "the-far-cot": {
    "cot|byre|roof|channel|partition|muck":
      "The muck channel is cut stone, not a ditch, and it has a slope to it a mason would be proud of. The byre end of the roof is lower than the house end, so the beast lived under less roof and the family under more. Inside the byre door a ring is still leaded into the wall.",
  },
  "the-bare-toft": {
    "toft|bank|doorstep|step|ground":
      "The doorstep is the only stone the robbers left, because it was set too deep to lever out. It is worn hollow in the middle and worn again to one side, where a bad leg or a good habit always stepped. The bank round the toft is low and even, and nothing has been dug in it.",
  },
  "the-strand-graves": {
    "graves|grave|mounds|rows|sea-pinks|pinks":
      "In rows, and close: each mound barely a body's length from the next, dug as fast as they were needed. The chapel's own ground is behind its wall with room in it. These people were not carried that far. The sea-pinks grow thickest at the heads of the mounds.",
    "ground|earth|soil|bones|layers|under":
      "The salt has eaten one mound's side open, and the grave in it is shallow and new against what is under it: older bones, lying every way, with shells and sea-pinks' roots among them, and older again below. Under the deepest of them the soil stops, a spade's depth down, on flat stone, dressed and laid tight, older than anything else here, with cold air coming up through the joints.",
  },
  "the-gorse-corner": {
    "gorse|path|tunnel|bushes|common":
      "The path goes in at the height of a sheep's back and the gorse over it is clipped short and even, not by any blade: browsed. Tufts of wool hang on the spines at the entrance, and further in, coarser hair, darker, caught at the height of your knee.",
  },
  "the-sea-smithy": {
    "smithy|hearth|hood|anvil|block|hooks|window":
      "The anvil block is a single elm stump with four iron bolts through it and a square of clean wood on top where the anvil sat. Round that square the wood is pocked all over with small burns. The hooks on the wall are spaced for tools of every size, and each one is empty.",
  },
  "the-saltmasters-house": {
    "house|hearth|lintel|hook|bench|bedstead|window|shutter|floor":
      "The floor is swept, and the sweepings were taken out, not pushed into a corner. The hook in the lintel is worn thin on its underside by a pot's handle. The shutter has a bar on the inside and the bar is in its brackets: somebody shut it, and then left by the door.",
  },
  "the-far-house": {
    "house|thatch|hearth|hearth-stone|byre|floor|smoke":
      "The underside of the thatch is a black crust, hard and glossy, shining where the smoke went up through it. The hearth-stone is cracked in a star from the middle out. The beaten floor is lower round the hearth than at the walls, worn down by a lifetime of feet going round the fire.",
  },
  "the-sallow-rows": {
    "sallow|willow|stools|stool|rows|rods|trunks":
      "Every stool has the old cut showing at the bottom, a ring of grey stumps where the rods were taken off level, year after year, with a hook. Above that the forty trunks have gone their own ways. Two of the stools have rods still bundled and tied at the foot, cut and never collected.",
  },
  "the-marsh-end": {
    "marsh|creek|sedge|water":
      "The last firm ground ends in a little bank of trodden turf where people stood and looked out, and there are flat stones set into the edge of it to stand on. Beyond that the sedge closes up and the water lies in it in sheets, and no path goes on.",
  },
  // ======================= THE MOUNTAIN, the rest (2026-11-05) ==========
  "the-boulder-beach": {
    "boulders|stones|shingle|tideline":
      "The boulders below the tideline are bald and smooth; above it they wear lichen in grey rings, and the line between the two is sharp. None of them has moved in a very long time. In the gaps between them the shingle is fine and wet, and full of bleached crab legs.",
  },
  "the-track-head": {
    "stone|track|road|turf|step":
      "The last laid stone is the same as every other, dressed, set on its edge. The next one is not there, and there is no hole where it should be. The worn place in the turf beyond starts at exactly the road's width and stays it, because everybody who walked off the road kept walking as wide as the road had been.",
  },
  "the-burn-mouth": {
    "burn|water|gravel|braids":
      "Each braid has its own little bank of gravel, and the banks are freshly cut, the stones on their faces still wet underneath. The water is brown from the hill and turns grey where it meets the sea. Lying in the gravel there are twigs and heather stems, carried down from a long way up.",
  },
  "the-cobble-bank": {
    "cobbles|cobble|bank|stone":
      "The cobbles are so alike that a handful of them could be a set. Each one is worn on all sides by all the others. Down between them, a forearm deep, the stones are smaller and wet, and the whole bank breathes out a smell of weed when it shifts.",
  },
  "the-wind-flat": {
    "grass|shelf|flat":
      "Kneel and the grass is a tight mat of tiny leaves, many kinds, all kept an inch high, and among them flowers no bigger than a fingernail. The roots go deep and the soil they hold is thin and black. The only thing on the shelf that stands higher than the grass is the droppings of sheep or deer.",
  },
  "the-first-rise": {
    "slope|ground|rise":
      "The turf on the rise is pocked with little level steps across the slope, one above another, each a hoof wide: the trods of animals going along the hill rather than up it. They run all the way up out of sight. The mountain starts here, and that is how the animals first say so.",
  },
  "the-thorn-scrub": {
    "blackthorn|thorn|scrub|tunnels|spines":
      "The tunnels are floored with trodden earth and littered with droppings, and the thorns round the mouths are hung with tufts of wool and coarse hair. Every bush is clipped flat on its top by the wind and leans landward, so the whole scrub looks combed.",
  },
  "the-lower-beck": {
    "beck|burn|banks|turf|water|gravel":
      "Where the banks have dropped into the burn, whole slabs of turf lie in the water with the grass still on them, combed flat by the current. The gravel in the bottom is speckled with tiny fish that dart off upstream. The side of the beck is trodden along the edge where everything walks it.",
  },
  "the-alder-thicket": {
    "alders|alder|roots|thicket":
      "The knuckled roots are polished on top where they are used as steps. Between them the black water has a skin of floating leaves. On the alder trunks at shoulder height the bark is rubbed off in patches, smooth and pale, where something big has scratched itself.",
  },
  "the-nettle-ground": {
    "nettles|nettle|ground|stand":
      "Push into the nettles and the ground under them is not hillside but a low bank of earth with stones in it, in the outline of a building with a door on the downhill side. The soil is black and soft and full of old bone and charcoal. The people went; their middens stayed fertile.",
  },
  "the-turf-wall": {
    "wall|turf|sods":
      "The sods were cut square with a spade and laid grass side down, each course set back a little from the one below. Where the wall has slumped you can see the grass growing on it from both faces now. In the lowest courses the cut edges of the sods are still sharp.",
  },
  "the-rush-hollow": {
    "rushes|rush|hollow|oval|stems|water":
      "The pressed oval is wider at one end than the other, and at the wide end there are hairs caught on the rush stems, long and coarse and grey-brown. The black ground at its edge holds a print, split, with two dew-claws behind: a big beast, and it lay here a long time.",
  },
  "the-beck-narrows": {
    "slot|walls|rock|boulders|burn|narrows":
      "The rock of the walls is polished smooth to the height of the highest flood and rough above it. The jammed boulders overhead have wedged themselves so tight that ferns grow out of the cracks between them. A stick lies jammed across the slot at head height, carried up there by water.",
  },
  "the-goat-track": {
    "path|track":
      "The path is worn down to the bare soil in a strip a hand wide and is dotted with small round droppings. At the uphill edge the turf is rubbed bald on rocks at knee height, where something leaned its weight as it walked. Long pale hairs are caught on the heather beside it.",
  },
  "the-last-pasture": {
    "grass|pasture|field|wall":
      "Under the grass the field has the faint lines of old work, a ridge here and a hollow there where it was once cleared of stones. The cleared stones are heaped along the foot of the wall below. At the top edge the grass simply thins, one blade at a time, until there is more rock showing than green.",
  },
  "the-water-slide": {
    "rock|slide|tongue|water|sheet":
      "The rock is smooth as a stair rail and covered with a thin skin of green slime you can scrape off with a fingernail. Down its edges, where the water does not run, there are boot scrapes, long ones, ending abruptly. The bottom of the slide drops into a churned pool.",
  },
  "the-plunge-pool": {
    "pool|fall|moss|spray":
      "The moss in the spray ring is so thick and bright that it looks lit from inside, and a finger pushed into it comes out dripping. In the pool, at the edge of the deep, there is a stick standing upright in the water, stuck by one end in something you cannot see.",
  },
  "the-sphagnum-flat": {
    "moss|sphagnum|carpet|flat":
      "Lift a handful and it is mostly water, cold, and the moss underneath is pale and dead and goes down further than your arm. Every step leaves a dent full of water that fills from below. The red moss grows in humps and the green in hollows, every hump and hollow its own colour.",
  },
  "the-hanging-turf": {
    "turf|edge|roots|mat|slope":
      "The roots in the undercut are a solid mat of heather and grass, woven, holding the whole skin together. Under it the soil has washed out in a black hollow. Lumps of turf that have already come away lie down the slope below, still green on top, upside down or right way up.",
  },
  "the-peat-hags": {
    "hags|peat|channels|heather|wood|trunks":
      "The black trunks in the cut faces are pine, mostly, with the bark still on, and sound enough to take a knife. Some are charred on one side. The peat has buried a forest to its top, and the trunks all lie the same way, felled by the same wind.",
  },
  "the-cotton-grass": {
    "cotton|grass|bog cotton|stalks":
      "Each white tuft is a seed head, soft and loose, that comes away at a touch. The leaves at the bottom are thin and red at the tips. Between the stalks the ground is not ground, but a skin of moss over water, and your boot goes through it to the ankle at once.",
  },
  "the-bracken-slope": {
    "bracken|slope|ground":
      "Under the fronds, last year's bracken lies in a brown mat, dry and crackling, and the ground under that is bare. There are tunnels through the base of the stand at the height of a dog. The bracken has climbed over an old wall and buried it, and you trip on it before you see it.",
  },
  "the-boulder-field": {
    "boulders|boulder|rock|gaps":
      "The top faces of the boulders are rough and lichened and the gaps between them go down into black. The boulders that sound hollow when you step on them have water running underneath; you can hear it, a long way down, under the whole field.",
  },
  "the-gravel-race": {
    "gravel|bed|burn|stones":
      "Hold a hand flat on the gravel under the water and you feel it moving, a slow crawl of grit against your palm. The stones are smaller downstream and bigger up. At the edges the race has thrown up little ridges of gravel and left them, and they will be gone at the next spate.",
  },
  "the-fallen-birch": {
    "birch|trunk|tree|raft":
      "The birch's bark is still white in strips and the wood under it is soft and spongy. The raft on its upstream side is twigs, heather, a dead lamb, a broken basket and a lot of froth. The trunk's top is worn bare of moss along a line, where feet have used it.",
  },
  "the-quaking-moss": {
    "moss|surface|water":
      "The swell goes out from your feet in a slow wave and comes back as a slower one. Here and there the moss has split and the water shows in a crack, dark and clear and still, and very deep. A stick lies flat on the surface, as if somebody put it down to spread their weight and went no further.",
  },
  "the-pass-head": {
    "shoulder|skyline|rise|ground":
      "The ground on the shoulder is short grass and grit, and there is not a single stone on it bigger than a fist, as if somebody had cleared it. The wind has done that. Along the skyline the grass is darker in a faint line that is a path, worn by animals walking the edge.",
  },
  "the-slant": {
    "ramp|slant|turf|rock|crag":
      "The ramp is printed all the way up with the cloven feet of sheep and deer, and here and there a heavier print. At the narrowest point the rock above has a long smooth patch at shoulder height, rubbed glossy by flanks pressing past against the wall.",
  },
  "the-high-fold": {
    "wall|fold|stone|pen|corrie":
      "The wall is built with a gap at its middle, and on either side of the gap there is a stone set upright for a gatepost, with a groove worn in each. Where the beasts now walk over the wall, the top stones are knocked off in a line and scattered down the inside.",
  },
  "the-wether-ledge": {
    "ledge|grass":
      "The grass is cropped so short the soil shows through in places, and it is dotted with droppings of three or four different kinds. At the back of the ledge, under the rock, there is a long dry hollow where things lie up out of the north, and it is full of shed hair.",
  },
  "the-peat-pool": {
    "pool|water|peat":
      "Hold a hand under the surface and it vanishes at the wrist into brown. The edge of the pool is a sheer wall of peat, and in the wall, a hand under the water, the end of something pale is showing. It is a bone, and it is not rotted, and it has been there a long time.",
  },
  "the-beck-fork": {
    "waters|water|fork|channel|junction":
      "The line between the two waters is sharp enough to put a finger on, brown one side, clear the other, and the clear side is a little colder. The gravel under the clear water is grey; under the brown it is stained the colour of tea. Below the mixing it is all one shade.",
  },
  "the-dry-course": {
    "bed|course|rock|banks|gravel":
      "The scoured rock has pot-holes in it, round and smooth, each with a stone still sitting in the bottom that the water once whirled round. Tufts of grass and heather are caught in the bushes on the banks, at head height. That is how high the water comes.",
  },
  "the-sunk-boulders": {
    "boulders|crowns|moss|bog":
      "Push a stick down beside the nearest boulder and it goes down a long way before it touches stone, then follows the curve of the boulder further down. The moss on the crowns has a little ring of bare rock at the top, where birds stand.",
  },
  "the-shoulder-walk": {
    "shoulder|ground|line":
      "The ground on the walk is trodden firm and grey, a wide band of it, by everything that ever went along the shoulder. There is no shelter anywhere along it, and on the downwind side the grass is littered with things the wind has dropped: feathers, tufts of wool, a scrap of cloth.",
  },
  "the-shoulder-drop": {
    "edge|lochan|corrie|ramp|grass|scree":
      "Right at the edge the grass is worn bare in a short patch, the size of a seat, where people have sat to look down. The ramp comes up under the lip at a slant, so narrow that its top is only a ledge, and from above you would look straight past it.",
  },
  "the-north-scree": {
    "scree|stones|crust":
      "The black crust on the stones smears like soot and smells of nothing at all. The stones under it are cold to the touch on the hottest day. Ice lingers in the gaps between them in the mornings, long after the rest of the hill has thawed.",
  },
  "the-scree-toe": {
    "scree|stones|pieces|turf|toe":
      "The big stones at the toe are grown over with lichen and moss, settled for good. A few paces up, the stones are bare and newer. Between the two there is a line where the moss stops, and above that line everything is still sliding.",
  },
  "the-moraine-bank": {
    "moraine|bank|ridge|rubble":
      "The rubble in the bank is every kind of stone mixed together, round and sharp, big and small, none of it sorted. Some of the stones have long parallel scratches on them, all one way. The ridge is grown over with grass on its downhill side and bare on the uphill.",
  },
  "the-stone-river": {
    "stones|rock|river|turf|edges":
      "At the edges of the stone river the turf is rucked up like a rug pushed against a wall, and torn, with the roots hanging out over the stones. Lichen grows on the stones in the middle, but only on their upper faces, and on some of them the lichen is upside down.",
  },
  "the-flood-gravel": {
    "gravel|apron|turf|boulders":
      "The torn turf lies upside down at the edges of the apron in rolled flaps, like blankets thrown off a bed. Grass has started to grow through the gravel in thin green threads. One boulder in the middle sits on top of a crushed rowan sapling, which is still alive.",
  },
  "the-mire-foot": {
    "mire|prints|hoofprints|heather|water":
      "The prints are layered so thick that each new one cuts across three older ones. Deer, sheep, a dog or something like one, and the big cloven print of something heavy. The heather stems at the mire's edge are snapped short and the snapped ends are pale and fresh.",
  },
  "the-cairn-line": {
    "cairns|cairn|heaps|stones|courses":
      "Each cairn is built of flat stones laid carefully, the biggest at the bottom, and topped with a single upright stone pointing toward the next. Where a cairn has fallen, its stones have been put back by a different hand, less carefully. The line runs dead straight between them.",
  },
  "the-shattered-rib": {
    "rib|slabs|gaps|rock":
      "Inside the gaps the rock faces match each other exactly, bump for hollow, so you can see where each slab was joined to the next. The frost is still working: on the floor of each gap there are new flakes, sharp-edged, that fell this winter. There are droppings in the deepest gap.",
  },
  "the-fan": {
    "fan|stone|cone|gully":
      "The fan's middle is a rough trough of big stones, the path the biggest falls took. The edges are pebbles and grit. Looking up the gully that feeds it, you can see the stones waiting at the top, piled on a ledge, and a few of them are freshly white where they broke.",
  },
  "the-loose-slope": {
    "scree|slope|rock":
      "The scree is clean sharp-edged rock, no lichen on any of it, all moving too often for anything to grow. Each step pushes a little wave of it downhill with a dry clatter. The tracks you made coming up are already smoothed over below you.",
  },
  "the-sorted-ground": {
    "rings|stripes|stones|gravel|ground":
      "The rings are as near round as a cart wheel and the coarse stones in their rims stand on their edges, pushed up out of the fine. Cross the rings and step on a stripe and your boot sinks into soft gravel. The ground is still at it: one of the rings has a stone half-lifted on its edge.",
  },
  "the-lichen-boulders": {
    "lichen|boulders|rings|stones|plates":
      "The biggest ring has a dead grey centre and a living yellow-green edge, and inside it are smaller rings, younger, growing over the old. On the rock where a ring has been scraped off, the stone is a brighter grey, the colour it was when it fell.",
  },
  "the-lower-force": {
    "fall|force|lip|pool|rock":
      "The lip of the fall is worn into a notch the shape of the water, smooth and dark. Beside it the rock has a line of handholds that are worn too, polished pale by hands, and in one of them there is a rusty iron spike somebody drove in long ago.",
  },
  "the-force-pool": {
    "pool|basin|rock|walls":
      "The things circling in the pool are sticks, a lump of froth, a drowned bird, and one wooden bowl turning on its side. The wet walls are green and black, and at the waterline they are worn into a smooth ledge where the circling has rubbed them.",
  },
  "the-black-runnel": {
    "runnel|channel|water|peat|bog":
      "The sides of the runnel are cut as sheer as if by a spade, black and fibrous, with roots hanging out. Somebody has laid two long poles across it at one place, side by side, and pushed their ends into the peat. One pole is rotten through.",
  },
  "the-wind-lane": {
    "trough|lane|grit|air":
      "The grit streaming along the trough has polished the stones in its floor, and they shine where they face the wind. Along both edges of the trough the grass leans away from it. At its downwind end the grit has piled into a long low drift.",
  },
  "the-wind-scour": {
    "scour|turf|gravel|roots|edge":
      "At the torn edge the turf curls back on itself like a page, roots hanging in the air, and every gust lifts it a little more. Out in the bare gravel there are still a few roots standing up like little wires, their soil blown out from round them.",
  },
  "the-north-corrie": {
    "corrie|bowl|floor|stone":
      "The wet stone on the floor is dark green with moss that never dries, and the shadow under the back wall has a crust of old snow even in the warm months. There is no sign anything stays here. The tracks cross the corrie from side to side and do not stop.",
  },
  "the-brink": {
    "ledge|brink|crag|holds":
      "The holds up to the ledge are worn, but not by much, a little smoother than the rock round them. On the ledge itself the grit has never been trodden into a path. There are no droppings, no tracks, no feathers. Nothing lives on it and nothing passes it.",
  },
  "the-bealach": {
    "pass|bealach|saddle|ground|stone|cairns":
      "The ground at the saddle is beaten bare in a band twice as wide as a road, the stones in it polished by hooves and paws and feet, every kind. Here and there in the band, a stone has been knocked out of the ground and lies loose, kicked a stride along by the last thing to come through.",
  },
  "the-wind-notch": {
    "notch|gap|grass":
      "The grass in the notch is combed so flat its blades lie overlapping like shingles on a roof, every one pointing out of the gap. The rock on either side is scoured smooth on its windward face and rough on its lee. Anything dropped here goes through the gap and away.",
  },
  "the-rock-glacier": {
    "rock glacier|glacier|rubble|ridges|tongue":
      "The ridges across the rubble are evenly spaced and curve downhill at the middle, like the folds of cloth. Between the stones, a forearm down, there is ice, grey and dirty, and cold comes up off it in a breath you can feel on your face.",
  },
  "the-shifting-ground": {
    "blocks|block|slab|ground":
      "The slabs that tilt are worn bright along the edges they rock on, and the smaller stones they rest on are crushed to powder at the points of contact. The ones that do not tilt have lichen on them. The ones that do have none.",
  },
  "the-cold-hollow": {
    "hollow|basin|snow|rubble":
      "The old snow is grey with grit and hard as packed salt, and there are layers in its edge, each a winter, each a slightly different shade. Lying in its surface, half-melted in, there are a few dead insects and a feather. The rubble round it is wet with meltwater.",
  },
  "the-glacier-mouth": {
    "hole|mouth|arch|burn|rock":
      "The roof of the arch is ice, not rock, ribbed and dripping, and grey with grit frozen into it in layers. The burn comes out from under it milky with ground stone. On the gravel at the mouth there is a scatter of small stones polished smooth on one side by the ice dragging over them.",
  },
  "the-wedge": {
    "block|fissure|crack|walls|wall":
      "Both walls are polished in a band at shoulder height, and the band is greasy to the touch and holds coarse grey hairs in the rough places at its edges. The block itself is scraped along its underside where heads and backs have pushed under it. The crack beyond smells of animal.",
  },
  "the-wet-slabs": {
    "slabs|rock|algae|film|water":
      "The black algae is a skin you can peel up with a fingernail, and the rock under it is pale grey and rough, the grip you would want if it were not covered. Long smear-marks run down the slabs where feet have gone out from under somebody.",
  },
  "the-blown-ground": {
    "gravel|ground|ripples":
      "The ripples are spaced a hand apart, their crests lined with the biggest grit and their troughs with the smallest that stayed. Every stone has a little tail of sand in its lee, all pointing the same way. A feather lies pinned against one of them, quivering.",
  },
  "the-stone-stripes": {
    "stripes|lines|stone|gravel|slope":
      "The stones in the stripes stand on their edges, long faces downhill, pushed up out of the fine stuff and left. The gravel between is soft and finger-marked with frost. Each stripe goes down the slope straighter than any wall anybody built.",
  },
  "the-snow-gully": {
    "gully|snow|groove|tongue":
      "The grooves cut by meltwater are clean and blue-walled, and at the top of the tongue there are old cut steps, softened by melt but still there, a line of them going up. At the bottom of the snow, where it runs out onto rock, the stones are scored by things that came down fast.",
  },
  "the-corrie-rim": {
    "rim|edge|turf|stone|drops":
      "The two strides of level ground are worn into a path along the crest, bare and grey. On the corrie side the turf ends in a lip that has broken away in places, showing the black of the bowl below. The stones along the rim are rubbed smooth by wind-blown grit.",
  },
  "the-corrie-lip": {
    "lip|rim|line|bowl|shoulder":
      "The turf at the lip is cut through by a dozen trods coming up from the shoulder and going over into the bowl, each a hoof wide. Where they cross the lip they have worn it down into notches. The wind has piled grit against the down-slope side of every tussock.",
  },
  "the-gully-head": {
    "bowl|lochan|walls|floor|notch":
      "From the notch's mouth you can see the bowl's walls are scraped smooth in long grooves, all running down toward the lochan. The floor is boulders and moss. The black water in the middle lies dead flat even when the wind is moving on the rim.",
  },
  "the-first-crag": {
    "crag|wall|rock":
      "The rock is wet and black and seamed with white quartz in crooked lines. At its foot the turf stops dead in a hard edge, and between the turf and the rock there is a gap a hand wide where the water running down the face disappears into the ground.",
  },
  "the-boulder-choke": {
    "choke|blocks|boulders|gully|gaps":
      "The way through at the back is worn: the moss is scraped off the blocks along it in a tunnel, and the grit under it is printed with knees and paws. One of the wedged blocks has a long fresh crack across it, white inside, that was not there long ago.",
  },
  "the-crag-shadow": {
    "shadow|flakes|blocks|ground|wall|crag":
      "The flakes lie with their sharp edges up and nothing has rounded them. Among them, half buried, are a sheep's skull, a long leg bone, and a piece of rusted iron that was once a tool. They all came down the face, or with something that did.",
  },
  "the-gully-foot": {
    "gully|heap|grit|splinters":
      "The heap is fresh on top, pale grey stone with no lichen on it, and older underneath. Among the splinters there is a rib bone, snapped in two, with the break still sharp. Whatever brings things down the gully brings them down hard.",
  },
  "the-cleft": {
    "cleft|fissure|track|grit|lip":
      "The scored track at the lip is a groove in the grit, and it has small stones pushed along the front of it and smeared dark stains in its middle. Caught on the rock at the mouth there are tufts of wool and a scrap of hide with the hair on it.",
  },
  "the-south-shoulder": {
    "shoulder|heather|rock|flank":
      "The heather here is short and springy and flowering purple in its season, and the ground under it is dry enough to sit on. The rock showing through it is warm in the hand. Every stone on the slope has a lizard's worth of shade on its north side.",
  },
  "the-sun-shoulder": {
    "rock|ground|shoulder":
      "The rock is a reddish stone that holds the heat like a hearth, and it is spotted with orange lichen. The ground is threaded with paths, many and fresh, of animals coming round the corner into the sun. The heather is browsed down along every one of them.",
  },
  "the-bare-plateau": {
    "pavement|stone|gravel|plants|cushions|plateau":
      "Each cushion is tight as a fist and covered in tiny flowers the size of a pinhead. The stone pavement under the gravel is cracked into blocks with deep slots between them, and in the slots, out of the wind, there are ferns no bigger than a thumb.",
  },
  "the-frost-shatter": {
    "rock|plates|fragments|rubble":
      "Lift a plate and the one under it is its other half, with a matching break, still sharp. The pieces have moved apart by a finger's width at most. Under the top layer the rock is damp, and in the cracks there is a rime of ice even in the afternoon.",
  },
  "the-cold-face": {
    "face|rock|film|ice|ledges|lichen":
      "The fringes of ice along the ledges hang in long thin teeth, and the drips falling off them have built small cones of ice on the ledge below. The rusty lichen comes off on your hand as an orange powder. Nothing living leaves a mark on this face.",
  },
  "the-black-scree": {
    "scree|sheet|pieces":
      "The pieces are all much the same size, a thumb's length, flat and sharp and as black as charcoal. They ring like broken pottery when they slide. The sheet runs so evenly from top to bottom that there is not a single larger stone anywhere on it.",
  },
  "the-corrie-mouth": {
    "lip|bowl|grass|edge|floor|water":
      "The grass runs to the lip in a thick mat and hangs over it in a fringe, roots and all, like the eave of a roof. Below the fringe the rock goes straight down. Looking out over the floor you can see the lochan, and around its edge, a ring of paler stones where the water stood higher once.",
  },
  "the-corrie-floor": {
    "floor|blocks|moss|corrie":
      "The moss between the blocks is deep and soft and unmarked, every hollow filled, as though nothing ever walked through here. The blocks are huge and their faces are scraped with long lines, all running toward the lochan. It is quiet enough to hear the water drip off the walls.",
  },
  "the-notch": {
    "notch|slot|tracks|grit|crag":
      "The tracks in the grit are deer, sheep, and something with broad pads and claws that show. They go through and come back through, layered over each other in the narrowest part where nothing can step aside. The rock on both walls is rubbed smooth at hip height.",
  },
  "the-heather-shelf": {
    "heather|terrace|shelf":
      "The heather's stems are thick as a wrist at the base and twisted, old enough to have fallen over and grown up again. In among it there are beds, round flattened places, the heather pressed down and the soil under it bare and dry. One of them is still warm.",
  },
  "the-flat-top": {
    "ground|plain|stone|top":
      "The stones on the flat top are all frost-split and lie flat, but here and there one stands on its edge, set up by a hand. They are a long way apart. From one you can just see the next, and nothing else that anybody ever touched.",
  },
  "the-plateau-edge": {
    "rim|edge|ground|plateau":
      "At the rim the stones are loose and lie tipped toward the drop, as if they were leaning over to look. The turf behind them has a crack in it running parallel to the edge, a hand wide and deep, where the whole lip is getting ready to go.",
  },
  "the-drift-edge": {
    "snow|drift|wall|overhang|gap|ground":
      "The undercut is blue inside and dripping, and the drift above it is hollow, a shell of old snow over air. The bare strip at its foot is sorted gravel and dead grass, flattened, yellow, and only now starting to green up again where the snow let go.",
  },
  "the-lochan-shore": {
    "shore|grit|tracks|water|wall":
      "The pad prints follow the deer prints exactly, stepping inside them, and where the deer prints break into a run the pad prints lengthen too. At the water's edge both stop, and in the grit there is a smear and a few long hairs.",
  },
  "the-deer-lawn-high": {
    "grass|lawn|heather|grazing":
      "The grass is bitten so short and so often that it has grown into a dense turf like a bowling green. It is spotted with droppings, all of them deer, in clusters. At the lawn's edge the heather is browsed back in a sharp line, as far as a neck can reach without stepping into it.",
  },
  "the-dry-corrie": {
    "corrie|bowl|grass|gravel|floor":
      "The flattened places in the grass are shaped like bodies, and there are several of them in a loose group under the warmest wall. The gravel around them is dotted with droppings and shed hair. Nothing moves the dry grass in here but whatever lies in it.",
  },
  "the-hidden-burn": {
    "burn|water|heather|stream|hollow":
      "Part the heather where the sound is loudest and there is a slot in the peat under it, the water running dark and fast at the bottom of it. The heather's roots bridge it. Somebody has pushed a stick down into the slot at one place to mark it, and the stick is green with moss.",
  },
  "the-old-snow": {
    "snow|ice|grit|insects":
      "The grey top skin is grit and flies and the dust of a whole summer, melted into a crust. Scrape it back and the snow underneath is white and very hard. A little way in, through the side of the drift, a darker shape shows faintly, about the size of a fox.",
  },
  "the-water-lip": {
    "lip|notch|water|rock":
      "The water slides over the notch so smooth and flat that it looks like glass laid on the rock. The notch's edges are polished and rounded. Down on the rock below, where it lands out of sight, there is a fine mist rising, and moss as bright as paint.",
  },
  "the-wallow": {
    "wallow|mud|heather|hollow":
      "The mud is printed with hooves going in and coming out, and the hair in it is red-brown and long. The heather stems round the edge are plastered with mud to the height of a deer's back and still wet. The smell is musk and rot together.",
  },
  "the-warm-slabs": {
    "slabs|rock|sheets":
      "The rock is warm to the touch long after the sun has gone off it and gives off a faint smell of dust. Along the cracks between the sheets there are shed skins, thin and papery, caught on the rough edges where something slid out of them.",
  },
  "the-cut": {
    "cut|slot|burn|rock|wool|lip|shape":
      "The wool on the lip is wet and dirty, caught on a sharp edge where something scrabbled. Down in the slot the dark shape is a sheep, wedged on its side above the water, and the water has been washing round it long enough to clean the fleece white on its lower side.",
  },
  "the-old-drift": {
    "drift|hollow|crest|snow":
      "The scoured hollow in front of the drift is bare to the rock, swept clean by the wind turning back on itself off the snow's face. The drift's edges are hard and sharp as a cut cake, and they are in exactly the same place as the old lichen-line on the rocks beside it says they always are.",
  },
  "the-cold-shadow": {
    "shadow|rubble|moss|ground":
      "The black moss is crisp with frost in the creases even now. The rubble under it is wet and very cold, and the cold comes up through your boots. Nothing grows here but the moss, and the moss grows so slowly that a footprint pressed into it last year is still there.",
  },
  "the-melt-runnel": {
    "runnel|channel|snow|water":
      "The runnel's walls are smooth as glass, carved by the water, and grey with grit frozen in thin lines. At first light the bottom is dry ice, crusted, and you can see where the water will run again by the trail of grit along it.",
  },
  "the-upper-drift": {
    "drift|ice|grit|stones|cups|tongue":
      "Each stone sits in its own cup of melt because the dark stone takes the sun and the snow does not. Lift one and the cup is full of clear water. Among the stones there is a bird's wing, frozen in, the feathers still perfect.",
  },
  "the-hanging-step": {
    "shelf|step|wall|face|drop":
      "The shelf's floor is gritty and dry and its outer edge is crumbling, loose bits ready to go at a touch. At the narrowest point the rock above has a crack at chest height that every hand has used, and the crack is worn smooth inside.",
  },
  "the-lower-band": {
    "band|shelf|ledge|ledges|overhang|wall|rock":
      "The overhang keeps the shelf dry, and the dust under it is soft as flour and printed with small feet. At the shelf's far end the ledge narrows and stops, and on the rock above the stop there are scratches, many, where something tried to go on.",
  },
  "the-kept-room": {
    "room|walls|floor|corners|rock|box|dust":
      "The tool marks on the walls run in neat parallel lines, every stroke the same length and the same angle, worked by somebody patient. The dust on the box lies in an even grey coat with nothing written in it. The floor in front of the box is swept, and the swept part is only as wide as a person standing.",
  },
  "the-thin-turf": {
    "turf|grass|sheets|rock|soil":
      "Lift a lifted edge and the soil underneath is a thin black crumb with the roots running sideways through it, looking for somewhere to go down and not finding it. The rock is pale where the turf has only just come off it and grey where it came off long ago.",
  },
  "the-basking-stone": {
    "stone|boulder|top":
      "The shine on the top of the boulder is grease, worked into the stone, darker in the middle. Long coarse hairs are caught in the rough edges round it. On the ground to the south, where something steps up onto it, the turf is worn bare in a single patch.",
  },
  "the-pothole": {
    "pothole|shaft|hole|stone|cut|burn":
      "The rim of the pothole is rounded and polished, and the shaft's walls inside are ribbed with spiral grooves going down. Water goes into it without a sound. A smaller pothole beside it, dry, still has its grinding stone sitting in the bottom, smooth as an egg.",
  },
  "the-snow-edge": {
    "snow|edge|lip|curl|drift|blocks":
      "The curl of the lip is hollow underneath and you can see light through its thinnest part. The fallen blocks below are rounded at the edges and gritty, settling slowly into the ground. One has a hare's track going straight across its top.",
  },
  "the-moat": {
    "moat|gap|trench|snow|rock":
      "Lean over the trench and the cold comes up in a breath, and you can hear water a long way down. The snow wall is layered, a winter to each band. The fallen stuff bridging it is soft at the edges, and there are tracks going round the trench, not over it.",
  },
  "the-snow-bed": {
    "snow|field|hollow|bed":
      "Round the edge of the snow bed there is a ring of bare black ground where nothing grows because the snow sits on it too long, and outside that ring a second ring of moss, and then grass. The rings mark where the snow used to reach. The outer one is a long way out.",
  },
  "the-chimney-foot": {
    "chimney|cleft|wall|ledge|trickle":
      "The trickle down the back of the cleft has built a little curtain of green slime and a puddle at the foot. On the rock at the entrance, chest high, there is a smooth patch, the size of a palm, darker than the rest: where everybody puts a hand to start.",
  },
  "the-ledge-walk": {
    "ledge|hold|rib|rock":
      "The hold at chest height is a natural flake, and it has been used so long it is polished and glossy and has a slight groove along the top where fingers curl. The ledge at the rib is worn down a fraction in the middle. People went round here facing the rock.",
  },
  "the-terrace": {
    "terrace|ledge|grass|wall|corner":
      "The grass is cropped very short and dotted with droppings. At the corner where the terrace stops, the ground is trampled into a bare patch, and the rock round the corner shows scratch marks at the level of a beast's shoulder, where something went to look and came back.",
  },
  "the-hot-ledge": {
    "ledge|dust|scree":
      "The dust on the ledge is so fine it holds the print of every hoof that passed, and it is printed solid. Here and there along the outer edge the dust has slid off in a little fan down the face, where a foot went too close. The rock above is warm and dry and smells of goat.",
  },
  "the-gravel-shelf": {
    "shelf|terrace|gravel":
      "The gravel is bleached almost white on top and dark underneath, which you see wherever a hoof turned a stone over. The tracks across the shelf go straight and fast, the prints spaced wide, every animal crossing it at a run.",
  },
  "the-broken-ground-high": {
    "blocks|hollows|cliffs|ground":
      "Every hollow has its own floor of grass and its own droppings, and in two of them there are beds, pressed flat and lined with shed hair. The small cliffs between have their tops worn by things stepping up. The best hollows are the ones you cannot see into until you are in them.",
  },
  "the-crown-step": {
    "step|plates|spur|crown":
      "The plates of the step are loose and rock underfoot with a hollow clack. Once you are up, the spur's bare top is gritty and windswept and you can see along it the whole way to where it bends. Not a single thing has dropped anything on it.",
  },
  "the-shattered-crown": {
    "crown|crest|plates|rock|comb|gaps":
      "The plates lean apart at the top and touch at the bottom, so the gaps are wedges of sky. Down at their feet the frost-broken pieces lie in heaps, sharp and new. A few of the plates have a crust of rime on their north faces that the sun never touches.",
  },
  "the-grey-ice": {
    "ice|lens|grit|layers|lines":
      "Count the dark lines and you lose count past forty. Bubbles are trapped in the ice between them, round and silver, some as big as a fingertip. Here and there in a dark line there is a small black speck, a fly or a seed, held where it landed.",
  },
  "the-firn": {
    "firn|snow|ice|crack":
      "The firn is made of grains like coarse salt, frozen together, and when you scrape it they come away and roll. The crack is blue at the top and darker blue further in, and the blue goes on down past the point where the light lets you see.",
  },
  "the-chimney": {
    "chimney|cleft|walls|holds":
      "The two polished holds are small flakes in the wet rock, and one has a thin groove worn in it by boots as well as hands. Higher up, the back wall has a smear of old blood, long dried to brown, at the height of a knee: somebody barked a shin here and went on anyway.",
  },
  "the-second-band": {
    "shelf|band|wall|droppings":
      "The droppings run along the back in a line and pile up in three places, at the three widest spots, where something stops every time. The undercut above them is blackened with grease at the height of a lying beast's back. The dust in the dry hollows takes a clear print of a cloven foot.",
  },
  "the-broken-terrace": {
    "terrace|shelf|islands|gaps|rock|turf|rubble":
      "The edges of the grass islands are torn, roots hanging, and each gap between them is scraped pale where hooves skid across. Far below, the fan of turf and rubble has grass growing back through it, so it came down a few years ago, not this one.",
  },
  "the-sun-traverse": {
    "ledge|rock|stone|traverse":
      "The rock above is polished in a long low smear at shoulder height, the line of everything that pressed against it going along. Below the ledge's lip the face is clean and pale. In two places there are dark old stains on the ledge, and scattered tufts of hair.",
  },
  "the-hot-scree": {
    "scree|ground|shimmer":
      "The stones are pale and dry and too hot to hold in the afternoon. Among them, lying perfectly still, there are lizards the exact grey of the scree, and they go only when your shadow touches them. Under the top layer the stones are cool and damp.",
  },
  "the-sun-gully": {
    "gully|gravel|rock|walls":
      "The gravel on the floor is printed with tracks that go up and down the gully, and all of them are blurred, made in the soft evening and baked hard by the next noon. The walls give off heat like an oven door. In one corner there is a scatter of small bones and fur.",
  },
  "the-dry-gorge": {
    "gorge|walls|potholes|floor|wrack|crevices":
      "The flood-wrack jammed in the crevices is heather, sticks, bleached bone and a whole small tree, roots and all, wedged sideways high above your head. The potholes in the floor are dry and each has its grinding stones lying in the bottom. The walls are polished to the height of the wrack.",
  },
  "the-north-rib": {
    "rib|spur|edges":
      "The rock along the rib's crest is worn into a faint path by animals, not deep, and littered with droppings at the points where they stopped to look over. The edges on both sides are crumbling. A few loose blocks lean outward at the lip, waiting.",
  },
  "the-cold-ramp": {
    "ramp|snow|rib":
      "Old steps are kicked up the snow, softened, refrozen, and kicked again, a line of them going up. They are not boots. They are hooves, sharp ones, pressed in a neat zigzag where the animals kicked their own steps up the ramp.",
  },
  "the-late-field": {
    "snow|field|sheet|lace|stone|edges":
      "The lace of snow at the edge is so thin you can see the black stone through it. Meltwater drips off the undercut in a steady rhythm. On the snow's surface there are small tracks in a line, a bird's, that start in the middle of the field and go nowhere.",
  },
  "the-airy-step": {
    "ledge|step|holds|wall":
      "The holds are good and worn, polished by hands, and the ledge is littered with what the ravens drop: a snail shell, a sheep's tooth, a broken egg. The rock under the raven ledge above is splashed white. One stone on the step is cracked across where something heavy landed on it.",
  },
  "the-third-band": {
    "shelf|band|grass|crags":
      "The grass on the highest shelf is fine and cushioned, half moss, and grazed in small neat bites. The shelf's outer edge is fringed with grass hanging over the drop. The summit crags above are a different rock, darker, and their scree lies along the back of the shelf in a fresh thin line.",
  },
  "the-slab-nose": {
    "prow|nose|slab|rock|gap":
      "The prow's clean rock is scored across its lower face with long parallel scratches, where hooves have scraped as animals made the step. The gap round the front is only a stride. The rock on the far side of it is worn smooth where everything lands in the same place.",
  },
  "the-dry-ledge": {
    "ledge|grit|droppings":
      "The small droppings are the round pellets of goats or sheep. The large ones are long, twisted, and full of hair and bone splinters. They lie on the same yard of ledge, the old under the new, and the ledge is printed with both feet.",
  },
  "the-upper-force": {
    "force|fall|lip|bowl|spray|gorge":
      "The bowl is green-walled with moss that never dries, and in its spray the rock is slick as soap. The lip of the fall is notched and rounded. There is a stick wedged high in a crack beside the fall, carried up by some flood bigger than anything that comes down now.",
  },
  "the-wind-scoop": {
    "hollow|scoop|gravel|sign":
      "The gravel in the middle of the hollow is churned and pressed with the marks of things lying down, turning round, getting up. There is fresh dung and old dung and a bed of shed winter hair in one corner. The rim is clean; nothing stays on the rim.",
  },
  "the-spur-walk": {
    "plates|spur|walk":
      "Every plate rocks on a smaller stone underneath, and the edges are chipped white where they knock together. The plates nearest the middle of the spur are rocked so often they have worn little cups in the stones they sit on. The noise carries further than the eye.",
  },
  "the-rib-foot": {
    "rib|corner|grit|blocks|buttress":
      "The trickle of grit comes down the back of the corner in a thin line and has built a small cone at its foot, perfectly shaped. Lying in the cone, half buried, there is a long bone, white and dry. The big blocks above it are cracked and stained where water runs.",
  },
  "the-rake-top": {
    "shelf|buttress|ramp|cloud":
      "The shelf is grit and broken rock, and it is trodden; the rake brings everything up here, and the prints go out across the shelf and stop at the foot of the buttress. The buttress rock is cold to the touch and wet even when the shelf is dry.",
  },
  "the-under-rib": {
    "overhang|cave|dust|roof|rock":
      "The dust is soft and dry and printed in a dozen places with the shape of things lying down. Along the back wall, where the overhang is lowest, the rock is rubbed glossy in a long band at the height of a lying back, and the dust under it is full of shed hair.",
  },
  "the-rake": {
    "rake|ramp|ground":
      "The rake's grassy patches are cropped and its loose patches are scraped through by hooves to the rock underneath, in long skids. The best line up it is a narrow trod, worn bare, that weaves between the loose and the grass, exactly where you would have chosen.",
  },
  "the-band-end": {
    "bands|shelves|buttress":
      "Where each shelf ends against the buttress there is a bare trampled patch, all the same size, where things turn round. On the buttress's face above the lowest shelf there is a line of scratches going up, and a little way above them a ledge with droppings on it.",
  },
  "the-heather-step": {
    "heather|step|paths":
      "The paths through the heather are beaten bare, three of them, and where they part there is a patch of trampled ground with a great deal of dung on it. The heather's woody stems are snapped and pale along the paths' edges. Hair is caught on them, two or three colours.",
  },
  "the-shelf-head": {
    "shelves|terraces|grass":
      "The grass is thin and every blade bitten off at the same height. The first terrace's edge is worn into a step by things climbing up from the north side. On the warm rock above it, a raven has left a pile of small cracked bones.",
  },
  "the-water-notch": {
    "notch|slot|rock|burn":
      "The polished band at chest height is a thin dark line of high water, smooth as glass. Below it the rock is scoured white and pocked. Jammed in the notch at the top of the polished band there is a small branch with grass tangled in it, left by the last high water.",
  },
  "the-lee-drift": {
    "drift|snow|scallops|line|tongue":
      "The wet grey line at the drift's foot is trodden to slush by hooves and paws, all crowding to the one place the water is. The scallops in the snow face downwind, every one curved the same way. A trickle runs from the foot of it and sinks into the gravel within a stride.",
  },
  "the-spur-head": {
    "spur|head|ground|tarn|plateau":
      "The ground at the head is a scatter of boulders, the first real cover since the spur began, and behind several of them the gravel is pressed into hollows. One hollow has a ring of feathers round it. Whatever lay there was watching the spur.",
  },
  "the-rib-gap": {
    "gap|blocks|boulder|ribs":
      "The light is green because the walls are furred with moss that grows only in the shade. The floor blocks are worn smooth along a single line, and the line is printed with hooves. The boulder jammed overhead has grass growing on top of it.",
  },
  "the-first-buttress": {
    "buttress|rib|rock|wall":
      "At its foot the rock is clean and grey and goes up in vertical seams, with tufts of grass on the seams at long intervals. A fan of fallen flakes lies under it. The face is marked with white streaks where birds roost, very high.",
  },
  "the-hanging-scree": {
    "scree|shelf|drop":
      "The stones on the hanging scree are small and loose and lie at an angle so steep that a dropped pebble sets a dozen sliding. At the bottom edge they go over in little spurts. There are no tracks across it; everything that crossed went round.",
  },
  "the-upper-heather": {
    "heather|mat|rock":
      "The heather is pressed so flat it grows sideways across the rock and its stems are as thick as a finger and hard as wire. In the dips it is a little taller. Its tiny flowers come late up here, and some of the mat is still flowering when the snow comes.",
  },
  "the-long-shelf": {
    "shelf|terrace|turf|wall":
      "The turf is grazed to a carpet and trodden into a path along its middle, and the path is printed with several kinds of feet going both ways. Under the wall, in the dust, something has made a wallow. At the shelf's far end the path narrows and the turf grows ragged.",
  },
  "the-mid-shelf": {
    "shelf|crags|snowfields|gorge":
      "The shelf is grassy and dotted with old dung, and in its middle there is a ring of stones the size of a cart-wheel, set flat, the stones sunk into the turf. Something was made here once and burned: there is charcoal in the soil inside the ring, a hand down.",
  },
  "the-tarn-edge": {
    "tarn|gravel|wall|slabs|crescent":
      "The slabs of the wall lean against each other in a row, each frost-heaved up and tipped over onto the next. Behind them the gravel is dry and trodden into beds. The water's edge is printed with drinking places, the gravel scuffed down to the waterline.",
  },
  "the-cold-plateau": {
    "plateau|stone|ice|lichen|moss":
      "Lift a stone and its underside is crusted white with frost and the ice in the joint below it is clear and hard. The cushion moss is so tight you cannot push a finger into it. The lichens grow in rings on the stones, and the rings are very small.",
  },
  "the-second-rib": {
    "rib|buttress|ledges":
      "The ledges up the flank are evenly spaced and every one is splashed white with droppings, the highest ones whitest. Nothing on the lowest ledge has been disturbed in years. The rock between them is clean, unmarked, without a single scratch.",
  },
  "the-scoop": {
    "scoop|hollow|grit|marks":
      "The grit is churned in a ring where things have circled before lying down, and pressed into hollows the size of a curled dog and the size of a curled bear. There is dung in it of four kinds. In the back of the scoop a wing feather lies on the grit, long, black, and fresh.",
  },
  "the-fall-line": {
    "trough|line|debris|face":
      "The polished trough is scored with long fresh scrapes, white on the grey, where things came down in it. The debris at the bottom is new rock, sharp, and among it there is a broken horn. Everything that falls on this face comes to this exact line.",
  },
  "the-last-green": {
    "grass|green|hollow|water":
      "The grass is bitten down tight and the seep in the middle is trodden into a black mud ring. Round the green's edge, among the rocks, there are droppings that are not grazers', and a lot of them. The rock on the upslope side has a long smooth hollow at its foot, a place to lie and watch.",
  },
  "the-shelf-break": {
    "gully|gravel|heap|terrace":
      "The heap at the gully's foot is gravel, stones, a mat of heather and a sheep's spine with the ribs still on it. The gully's sides are packed gravel, cut sheer by the last flood, and pebbles drop out of them now and then and roll down.",
  },
  "the-frost-pavement": {
    "pavement|slabs|cracks|gravel":
      "The slabs are smooth on top and their edges are rounded, and the gravel in the cracks between them is graded, finest at the top and coarsest down in the slot. Here and there a slab has been lifted on its edge by the frost and dropped back crooked.",
  },
  "the-first-tower": {
    "tower|pinnacle|ledge|ice|rock":
      "The ice on the ledge is a thin clear skin over the rock, so clear the rock seems bare. On the tower's north face it hangs in sheets, and at the foot of the face there is a fan of broken ice, fresh, the pieces still sharp.",
  },
  "the-arete-foot": {
    "ribs|wall|ridge|arete":
      "Where the ribs join, the rock is worn into a single path, and the path is grey grit and worn stones. At the very foot of it there is a hollow in the shelter of a block, and in the hollow there is a heap of feathers and small bones, the leavings of a bird that eats here.",
  },
  "the-valley-mouth": {
    "valley|glen|stream|drop|spray":
      "At the valley's lower end the stream runs out over a lip worn into a U, and the lip's edges are polished smooth. The grass runs right to the edge and stops. The rocks along the lip are coated in wet moss from the spray that blows back up off the drop.",
  },
  "the-outwash": {
    "outwash|sand|gravel|prints|plain":
      "The big prints are pad and claw, the claws long and the pad as broad as a spread hand, and they cross the plain in a straight line without stopping. Other prints come and go round them, deer mostly, all of them turned away from the line.",
  },
  "the-stone-run": {
    "blocks|run|gaps":
      "The blocks knock together under your feet with a deep hollow sound. Down in the gaps there is a scurry and a squeak. On the tops of the blocks there are small dark droppings in rows, and the remains of seed heads, nibbled and dropped.",
  },
  "the-sun-buttress": {
    "buttress|rib|ledges|droppings":
      "The droppings on the ledges are white and chalky and layered thick, with pellets of fur and bone among them, coughed up. The ledges face due south. From them you can see every inch of the slope below, and the rock under them is splashed white for a long way down.",
  },
  "the-stripe-field": {
    "stripes|boulders|lines|slope":
      "The boulders in the stripes stand on their edges, pushed up by frost and leaning, and the lines between them are fine gravel trodden into paths. The paths go down the slope, along the grain. Nothing walks across them.",
  },
  "the-arete-walk": {
    "ridge|arete|rock":
      "The rock along the ridge's top is grey and gritty and worn smooth in a strip down the middle, a path made by every kind of foot. Lichen grows thick on both edges where nothing steps. In cloud the rock sweats and every crystal in it glints.",
  },
  "the-notch-of-air": {
    "notch|gap|saddle|ridge":
      "The saddle's rock is polished in a single stride's width, and on both sides of it the edges are crumbled to grit. The wind coming up through the notch carries small things up with it, and there are bits of grass and feathers lodged in the cracks on the upwind side.",
  },
  "the-drop-either-side": {
    "ridge|stretch":
      "The rock on this stretch is unmarked, sound and level and grey, and there is not a single loose stone on it: the wind clears it. On both edges the lichen grows in rings, untouched. The only sign of passing is a faint polish down the middle.",
  },
  "the-valley-shoulder": {
    "rim|valley|shoulder|arete":
      "The rim has a seat of flat rock where the ground rises toward the arete, worn smooth on top by something lying on it. From here you can see the whole valley floor, and the rock round the seat is scattered with droppings and bones. Whatever lies here watches the valley.",
  },
  "the-hanging-floor": {
    "floor|gravel|grass|water|braids":
      "The gravel between the braids of water is printed in long lines of prints, crossing and recrossing, and in the soft places they are deep. The grass is short and dotted with deer droppings. One long line of large prints runs the whole length of the floor and does not turn.",
  },
  "the-moraine-loop": {
    "moraine|bank|rubble|crescent":
      "The rubble in the loop is every kind of rock, round and broken, and some of the round ones are scratched with long straight lines. The inside of the crescent has a flat floor of fine silt where water stood once. The bank is grassed on its outer face and bare on its inner.",
  },
  "the-shelf-end": {
    "shelf|terrace|buttress|point":
      "Where the terrace points against the buttress the ground is trampled bare and the rock is rubbed at shoulder height. Twenty feet up, the next shelf has a fringe of grass hanging over its edge and droppings visible on it. No marks go up between.",
  },
  "the-warm-gully": {
    "gully|rock":
      "The rock is warm enough to make the air above it wobble, and dry, and there is not a fly in the gully at noon. In the shade of a boulder at its head there is a bed, pressed into the gravel, with shed hair round its edge. It is cooler in the bed than anywhere else in the gully.",
  },
  "the-moss-flush": {
    "moss|flush|rock|melt|sheet|prints|snow":
      "The moss is cropped so close it looks like green felt, and pressed into the snow round it is a ring of small cloven prints, hundreds, all facing in. The water running through the moss is ice-cold and clear, and tiny black flies hatch off it in clouds.",
  },
  "the-spur-end": {
    "spur|blocks|slope|ridge|arete":
      "The jammed blocks on the slope are loose at the top and settled at the bottom, and the settled ones are lichened. A narrow trod picks its way up between them, polished, and at its top there is a block with a rubbed patch on its edge where everything steps up.",
  },
  "the-bad-step": {
    "step|rib|ridge|holds":
      "The holds on either side of the bad step are good flakes, polished, and the rib between them is worn in the middle into a faint dip. On the rock below the step, out of reach, there is a long smear of old blood, darkened and weathered, going down.",
  },
  "the-second-tower": {
    "tower|pinnacle|crack":
      "The crack splitting the tower is a hand wide at the bottom and wider at the top, and the wind whistles in it. At its foot lie blocks that fell out of it, sharp-edged, unweathered. On the exposed side the ledge is worn and narrow, and the rock above it is polished by shoulders.",
  },
  "the-blade": {
    "blade|ridge|holds|rock|sheet":
      "The knife-edge along the top is weathered to a crumbling crest, and pieces of it lie on the holds below, fresh and sharp. The holds themselves are good, and the lowest one has a long scratch across it, white, where a hoof slipped and caught.",
  },
  "the-north-bank": {
    "bank|ground|snow|patches":
      "The snow patches are grey with grit and pocked with old prints, all of them stretched long, the strides of things running. Between the patches the ground is stones and black lichen. There is no droppings here at all; nothing stops long enough.",
  },
  "the-braided-flats": {
    "flats|channels|gravel|stream":
      "The gravel between the channels is pale and clean and every stone of it is the same few colours, washed down from the headwall. The channels move as you watch, one silting up and another cutting through. Prints cross the bars and vanish into the water.",
  },
  "the-scoop-of-grass": {
    "grass|bowl|scoop|spring|rock":
      "The grass is cropped to the roots and the spring's runnel is trodden into a muddy groove by drinking. Round the rim, on the rocks where you could lie and see the whole bowl, there are smooth patches worn bald, and droppings that are not a grazer's.",
  },
  "the-high-spring": {
    "spring|water|rock|gravel":
      "The water comes out of a crack in the rock no wider than a finger, and the crack's lip is furred with a pale green weed found nowhere else this high. Where it sinks into the gravel the stones are stained orange. The ground round it is printed with every kind of hoof and pad.",
  },
  "the-upper-brim": {
    "brim|edge|snow|lip|snowfield":
      "The lip at the brim is carved by the wind into a smooth overhanging curl, and on its top the snow is rippled in fine ridges like sand. There are no tracks on the brim. Things that cross the snowfield cross well below it, where they cannot be seen against the sky.",
  },
  "the-snow-brim": {
    "snow|crust|brim":
      "The holes where the fifth step broke through are knee deep, and the snow at the bottom of them is soft and grainy, loose as sugar. The crust over it is a finger thick. Somebody's holes and some animal's holes cross here, and you can tell them apart by their spacing.",
  },
  "the-high-neve": {
    "neve|snow|light|ground":
      "The snow at your feet is fine and dry, and under the top layer it is packed into grains the size of salt. There is no shadow to judge anything by. A dropped glove would look a mile off and a mile-off rock would look like a dropped glove.",
  },
  "the-bergschrund": {
    "bergschrund|gap|trench|ice|rock|headwall":
      "The ice side of the trench is blue and smooth and the rock side is wet black stone. Things are lying on the snow bridges below, a long way down: a dark lump that might be a stone, a pale one that might be bone. The sound of water comes up from below them.",
  },
  "the-horns": {
    "horns|blades|rock|stone|ridge":
      "Close to, the two horns are rough and crystalline, the stone glittering with flecks that catch the light. The softer rock round their feet has crumbled into a ring of grit. On the eastern horn, high up, a pale streak shows where a slab peeled off not long ago.",
  },
  "the-arete-end": {
    "arete|ridge|blocks|ice":
      "The broken blocks are tumbled and loose and grey, and the ice beyond them begins in a dirty white edge with stones frozen into it. The arete behind you is visible for a few hundred feet and then gone into cloud, and the rock where it meets the mass is polished by the wind.",
  },
  "the-south-bank": {
    "bank|grass|flowers|hollows":
      "The flowers are tiny, flat cushions with flowers no bigger than a pinhead, white and pink and yellow, in the shelter of every stone. The grass in the hollows is cropped. The ground is printed with deer and hare, and the prints all go to the sheltered spots and back.",
  },
  "the-far-shore-high": {
    "fan|gravel|channels|shore|stream|water":
      "The fan is printed in the soft places with crossings, and every one goes straight, fast, prints spaced long. Nothing stood still on this gravel. At its upstream edge, where the channels come in, there is a dead hind lying half in the water, and it has been eaten.",
  },
  "the-till": {
    "till|face|clay|sand|gravel|boulders|bone":
      "The bones sticking out of the cut face are big, long bones and part of a skull with the base of a horn, the bone stained brown by the clay. They are not from anything that lives on this mountain now. The stream has washed a few loose and they lie in the gravel below.",
  },
  "the-fan-head": {
    "fan|stone|corner":
      "At the head of the fan the stones are biggest and sit locked together, and down the fan they get smaller as far as you can see. On the biggest stones near your feet there are scrape marks, fresh, as if something heavy came down the fan and stopped here.",
  },
  "the-south-rib": {
    "rib|path|crest|gravel":
      "The path along the crest is a hand wide and beaten down into the gravel a finger deep. It does not wander. At each place where the rib narrows, the path is worn into the rock itself, and the stone there is polished smooth.",
  },
  "the-dry-shelf": {
    "shelf|terrace|gravel":
      "The gravel is hot and loose and every stone on it is bleached pale on top. There are no prints; nothing lies here and nothing grazes here. Where the shelf meets the slope above it, a single dead heather root sticks out of the gravel, white as bone.",
  },
  "the-frost-face": {
    "face|snow|frost|feathers":
      "The frost feathers are built of tiny plates of ice, layered like the vanes of a real feather. Where one has broken off, the snow under it is hard and blue. The broken pieces lie in a trail down the slope below, glittering.",
  },
  "the-white-slope": {
    "slope|tracks|snow":
      "The tracks are standing up in little pillars of hard snow where the loose snow round them has blown away. Each print is wider than a spread hand and has the marks of claws at its front. The stride is long and even, and nowhere along the line does it stop or turn.",
  },
  "the-wind-slab": {
    "slab|snow|crust":
      "The slab is a finger or two thick, hard as board, and where it has broken at the edge you can see the soft grainy snow underneath, a layer of air and loose crystals. A crack runs across the slab ahead of you, a thin dark line from one side to the other.",
  },
  "the-ice-shelf": {
    "shelf|ice|stones|bowls|bench|headwall":
      "Each stone has sunk into its own bowl of meltwater and the meltwater has frozen again around it in a clear ring. The ice of the shelf is polished glassy by the wind and full of white bubbles. Nothing has walked on it; there are no marks of any kind.",
  },
  "the-blue-wall": {
    "wall|ice|crack|face":
      "The blue is deepest where the crack is narrowest, almost black at the back of it. The face is fluted with grooves where meltwater runs. Frozen into the ice a little way in, you can make out stones, a band of grit, and a long dark streak that could be anything.",
  },
  "the-neve": {
    "neve|snow|field|ice":
      "In the morning the surface is hard and squeaks. By the afternoon it is soft and wet and your boot goes in to the ankle. The prints from the morning are still there in the afternoon, softened and spread, and the ones from the afternoon are frozen hard by the next day.",
  },
  "the-cloud-base": {
    "cloud|line|air":
      "At the line itself the air is wet and cold and you can see your breath go into the grey. The rocks below the line are dry and those above it are beaded with water. A little way into the cloud there is a cairn of three stones, and you only see it when you are next to it.",
  },
  "the-valley-head": {
    "headwall|wall|stream|thread|valley|ice":
      "The foot of the headwall is wet and green with moss fed by the blown spray, and the moss grows in a fan on the downwind side. The stream that lands is only a trickle across a bed of round stones. Above, the ice on the headwall's lip is blue at its broken edge.",
  },
  "the-step-in-the-floor": {
    "step|floor|groove|stream|valley":
      "The rock of the step is smooth and rounded and covered with long straight scratches all pointing down the valley, the marks of stones dragged across it by the ice that made it. The groove the stream runs in is cut into the scratches, much later.",
  },
  "the-shelf-tail": {
    "tail|stone|shelves|soil|moss":
      "The last grass grows in a thin line along the shelf's back wall where a little damp comes down, and after it the stones are bare and grey and loose. Droppings stop where the grass stops. Beyond, there is not even lichen on most of the stones.",
  },
  "the-sun-notch": {
    "notch|cleft|rib|path":
      "The walls of the notch are rubbed glossy at shoulder height by things pushing through. On a ledge above the path, out of sight of anyone coming, the rock is worn into a smooth hollow, and under it there are bones, old and new.",
  },
  "the-terrace-end": {
    "terrace|shelves|ledges":
      "Where the terrace narrows to ledges the turf is trampled into a bare patch and the droppings are thick. Something comes to this end and stops. On the narrow ledges beyond, the dust is unprinted.",
  },
  "the-snow-dome": {
    "dome|snow|snowfield|rise":
      "The snow on the dome's top is wind-packed and hard, rippled, and every ripple casts a tiny shadow. There are tracks up one side of it and down the other, a single line, something that went over the top to look and then went on.",
  },
  "the-first-notch": {
    "notch|gap|crest|ridge|face":
      "The wind through the notch has polished both its walls and piled grit and ice against the lee side. Looking down the north face, there is nothing to rest the eye on: no ledge, no snow, no bird, just wet black rock going down into the grey.",
  },
  "the-crest-step": {
    "step|rock|crest|ridge|ice":
      "The rock of the step is sound and grey and gritty, and the ice ends against it in a thin dirty edge. On top, the crest runs off narrow and level. On the step itself the rock has a polished patch where everything puts a foot to go up.",
  },
  "the-rime": {
    "rime|ice|feathers|rocks":
      "Snap a feather of rime and it is made of tiny overlapping scales, each one a frozen droplet. On the windward side of a rock the rime is a hand thick. On a dead bird lying in the rocks it has grown so thick that the bird is a shape of ice.",
  },
  "the-crevasse-field": {
    "crevasses|cracks|ice|snow":
      "The open cracks are blue at their walls and black at the bottom, and from one of them comes a faint drip of water. The roofed ones show only as a slight sag in the snow, a line a shade greyer than the rest. A hare's tracks run across the field, and at one sag they stop.",
  },
  "the-ice-fall": {
    "ice fall|blocks|towers|ice":
      "The blocks are white on top and blue in their broken faces, and some lean against each other in arches. At their feet lie fallen pieces, fresh ones, sharp and clear. As you watch, one of the towers groans, a deep sound like a door, and does not move.",
  },
  "the-white-out": {
    "snow|cloud|slope|ground":
      "Hold a hand out and you can see it, and the snow at your feet, and nothing beyond that. Toss a stone and it lands with a soft sound and you lose sight of it before it lands. The prints you made coming here are behind you and they are the only thing that is not white.",
  },
  "the-grey-nothing": {
    "cloud|rock|grey":
      "The rock at your feet is wet and beaded with droplets, and the lichen on it is a pale green that is the only colour there is. Turn round and the rock behind is the same as the rock in front. Your own footprints do not show on it.",
  },
  "the-rising-ground": {
    "rock|ground|cloud":
      "The rock steepens in steps, and each step looks like the last, and on each one there is a little ledge of grit with a print or two in it, all going up. Nothing comes down. Water runs down every crack and the cracks hum faintly.",
  },
  "the-cloud-foot": {
    "cloud|plants|line|ground|shelves":
      "The last plants are tiny cushions, pressed into cracks, and they stop at the line as if cut. Above it the rock is clean and wet. The cushions on the very edge are beaded with water from the cloud, and the ones further down are dry.",
  },
  "the-last-shelf": {
    "shelf|ledge|cloud|line":
      "The ledge's grit is dry on its outer edge and damp where the cloud touches the back. There are prints along it, going both ways, and droppings in the dry part. The rock above, where the cloud sits, is dark and dripping.",
  },
  "the-shelf-drop": {
    "drop|lip|shelves|tier":
      "The lip is rounded and polished, a smooth curve over which water pours in wet weather. At its edge there is a small fan of stones that were set rolling and caught. Looking straight down, the ground below has a scatter of the same stones in it, and bones.",
  },
  "the-hard-pack": {
    "snow|pack|cornice|edge":
      "The snow is so hard a heel only scratches it. Its surface is carved by the wind into long ridges with sharp edges, all running the same way. At the east edge the cornice curls out over nothing, and its overhang is thin enough to see light through.",
  },
  "the-north-drop": {
    "ledge|rock|pellets|bones|birds":
      "The pellets are grey and furred, and when one breaks open there are skulls in it no bigger than a fingernail, and tiny leg bones, and fur. The rock is whitened in long streaks down the face below. The ledge's edge is worn smooth by claws.",
  },
  "the-knife": {
    "ridge|knife|stone|plank":
      "The top of the knife is a crest of rough rock with a faint polish down its middle where feet have gone. Its sides are clean and smooth and run down out of sight on both hands. A single loose stone sits on the edge, and the wind moves it a little with each gust.",
  },
  "the-cold-crest": {
    "crest|rime|rock|ice|cloud":
      "The rime on the crest is a hand thick and grows in feathers pointing west. Under it the rock is black and dry. Somewhere above, in the cloud, there is a sound now and then of something falling, far off, and then nothing.",
  },
  "the-drift-foot": {
    "drift|snow|lee":
      "The snow at the drift's foot is soft and deep, and in one place it has slumped a little, a long shallow dip in the surface the shape of something lying under it. Nothing has dug at it. The prints that come to the edge of the drift turn and go round.",
  },
  "the-clear-window": {
    "hollow|rock|air|walls":
      "The hollow's floor is dry grit, and it is printed all over: things come here to see. On the rocks round the edge the grey cloud presses against the clear air like a wall of wet wool, and drips form on the rock at the line between them.",
  },
  "the-cloud-shelf": {
    "shelf|terrace|cloud|sun|end":
      "At the sunny end the rock is dry and warm and pressed into beds, three or four, with hair in them. At the wet end the rock is slick, and there are prints coming out of the cloud onto the shelf and going toward the beds, and then the prints scuffed.",
  },
  "the-catch-slope": {
    "slope|scree|skull|hind|cloud":
      "The hind's skull is bleached white on top and green-black with moss underneath where it lies against the scree. Its teeth are worn flat. Around it on the slope there are other bones, smaller, held in the scree like things caught in a net.",
  },
  "the-fall-fan": {
    "fan|grit|chips|bones":
      "Pick up a handful of the grit and among the chips there are tiny bones: a bird's leg, a vertebra, the jaw of a vole. The grit is soft and sorted fine and takes a print, and the prints across it are small ones, hopping.",
  },
  "the-gendarme": {
    "gendarme|tower|rock|line|path":
      "The worn line round the base on the south side is a polished groove in the rock, and above it, at shoulder height, the tower is rubbed smooth and dark. On the north side the rock is lichened and clean. Nothing has touched it.",
  },
  "the-second-notch": {
    "notch|snow|prints|crest|ridge":
      "The prints in the snow are big and round with claws at the front, and they go straight over the crest and down the north side where the face is nearly sheer. At the lip the snow is torn where claws dug in. Below, the prints go on down, and on.",
  },
  "the-broken-crust": {
    "crust|snow|plates|holes":
      "The holes are each the length of a forearm and wider than a spread hand, and at the bottom of each one the snow is packed hard by the weight that went through. The plates round the holes are tipped up on edge. The line goes straight, uphill.",
  },
  "the-sun-cup": {
    "cups|bowls|snow|ice|ridges|honeycomb":
      "Each bowl is a foot across and lined with dirty grit that collected in its bottom. The ridges between are sharp ice, and they break with a crack under a boot. In the bottom of one bowl a beetle lies dead, frozen in.",
  },
  "the-boulder-nose": {
    "nose|rock|scree|fan":
      "The nose is solid rock, rooted in the mountain, and its upslope face is battered and chipped white by everything that came down against it. The scree on either side of it parts in two clean streams. Behind it, out of the fall, there is a little sheltered hollow with droppings in it.",
  },
  "the-splinter-field": {
    "splinters|blades|rock|field":
      "The splinters are sharp enough to cut a hand, and lie edge-up in every direction. At the crossing place the splinters have been trodden flat and snapped short into a rough path, and the path is stained dark in places where feet bled.",
  },
  "the-lower-fan": {
    "fan|chips|splinters|antler|jaw|stones|water":
      "The antler is a stag's, shed, gnawed at its tines. The half jaw has its teeth, worn flat, a grazer's. Put an ear to the stones and the water under them is loud, running fast somewhere just below your feet.",
  },
  "the-ridge-walk": {
    "ridge|plates|rock":
      "The plates are loose and grey and every one clinks against the next. Here and there one is set on edge in the middle of the walk, propped up, standing upright, and it does not look like the frost did it. Further along there is another.",
  },
  "the-blue-shadow": {
    "shadow|cornice|snow|blue":
      "In the blue the snow is hard and old and rings underfoot. At the line where blue becomes white, there is a row of hollows in the snow, a body's length apart, where things have lain just inside the shade, looking out.",
  },
  "the-runnel": {
    "runnel|channel|snow|water":
      "The walls of the runnel are glassy and the floor is a thin sheet of ice over grit. Prints go down the bottom of it, softened and refrozen, and in one place the wall is clawed where something climbed out.",
  },
  "the-glacier-bend": {
    "ice|cracks|buttress|glacier|flank":
      "The cracks are a hand wide and as deep as the light goes, and they fan out from the buttress like the spokes of a wheel. The ice between them is grey with grit. On the buttress's face, at the height the ice once reached, there is a line of scratches.",
  },
  "the-melt-run": {
    "channel|run|silt|prints|stone|ice":
      "The three sets are a fox's narrow line, a hare's paired bounds, and a third set, pads with claws, bigger than either, that steps over the fox's prints. All three go down. The silt holds them so cleanly you can see the hairs between the toes.",
  },
  "the-grey-run": {
    "chute|run|stone":
      "The chute's middle is polished like a step in a church, and its edges are scattered with chips knocked off things on the way down. At the bottom, where it opens onto the fan, a few of the chips are fresh and white. One of them is bone.",
  },
  "the-scoured-flat": {
    "flat|grit|vertebra|bone|bones":
      "The vertebra is grey and porous and heavier than it looks, its wings broken off, the hole for the spine wide enough to put your fist through. It belongs to nothing that lives on this mountain. The grit has been swept into a little drift against its windward side.",
  },
  "the-last-tooth": {
    "tooth|pinnacle|top":
      "The top of the pinnacle is a flat place no bigger than a table, scattered with droppings and feathers. The rock is worn smooth on its western edge, where something sits to look out. From here the swept ground above is a pale band with not a single dark speck on it.",
  },
  "the-lean": {
    "slab|lean|gap|droppings":
      "The droppings in the back are dry and crumble to dust and are full of fine hair. The underside of the slab is scratched in long lines at the height of a sitting back. The smell is old, nearly gone, and still enough to make the hair on your arms stand up.",
  },
  "the-third-notch": {
    "notch|snow|ridge|gap":
      "The snow filling the notch is level on top and hard, and along its edges, where it meets the rock, there is a dark gap a finger wide, going down. Drop a stone into the gap and it rattles for a long time. On the snow itself there are no prints at all.",
  },
  "the-serac-field": {
    "seracs|towers|blocks|ice|lanes":
      "In the lanes the snow is littered with chips of ice, some fresh and clear, some old and white, all fallen off the towers. One lane is half blocked by a tower that came down across it, lying on its side, and the snow under it is pressed flat.",
  },
  "the-ice-blocks": {
    "blocks|towers|ice|gap":
      "In the clearest block there is a stone floating a foot in, and a line of bubbles above it where it sank as the ice formed. The gap between the two blocks is polished on both sides at hip height. The air in it smells of nothing at all.",
  },
  "the-crevasse-lip": {
    "crevasse|crack|lip|walls|ice":
      "The lip is rounded and sagging, and a line of small cracks runs along it a stride back from the edge. Lean over and the walls are layered in bands, white and blue and grey, each a year. On a ledge a little way down there is a glove, frozen stiff.",
  },
  "the-snow-hollow": {
    "hollow|scoop|drift|snow":
      "The walls of the hollow are scraped in long grooves by claws, layered over older grooves that have softened. The floor is packed hard and has a dip in it the shape of a curled body. A few long hairs are frozen into the floor.",
  },
  "the-melt-lip": {
    "lip|ice|cave|wall":
      "The drips fall from the lip in a line and have drilled a row of small holes in the gravel below. Inside the cave the ice roof is ribbed and glassy and you can see the light through it. Stones are frozen into the roof, some of them hanging half out.",
  },
  "the-snow-tongue": {
    "tongue|snow|edges|rocks":
      "The snow of the tongue is trodden into a narrow groove down its middle, packed hard and icy, by things that go up and down it. Along its edges there are scrape marks and a few long sliding grooves where something went down on its side.",
  },
  "the-tongue-foot": {
    "lip|snow|rock|stones|tongue":
      "Under the lip, half in the meltwater, there is a dark heap with hair on it. It has been there through at least one thaw. The stones around it are stained and there are small prints all round it, coming and going, of things that have been feeding on it.",
  },
  "the-under-step": {
    "rock|line|tier":
      "Put your hand flat on the rock and it is cool, but not cold, and the cold you expected is not there. The grit underfoot is dry. Along the line, the rock overhead has a faint film of dust on it, and the dust is dry too.",
  },
  "the-last-fan": {
    "fan|stone|ground|red|grey":
      "Kneel at the line and the grey stones and the red ones lie side by side, a grey and a red touching, with no mixing. The red ones are coated with a fine rust that comes off on your fingers. Nothing grows on either side.",
  },
  "the-ridge-end": {
    "ridge|crest|shoulder|rock":
      "The broken rock of the shoulder is scattered with droppings, and some of them are a raven's, full of grit. The crest behind is scoured clean. Here at its end the first loose stones are lying about again, as if the wind had given up sweeping.",
  },
  "the-ridge-drop": {
    "gap|bridge|snow bridge|ice|rock|shoulder":
      "The snow bridge is a narrow arch, sagging in the middle and pocked with prints going over. The gap under it is dark blue and goes down out of sight. On the rock side, scratched into the edge where things jump off, there are claw marks.",
  },
  "the-white-tower": {
    "tower|serac|ice|bridge":
      "The tower's chalk-white face is cracked with a long dark seam near its base, running up and across. At its foot there are fallen pieces, white and rounded. The snow bridge comes in right below it, and every print on the bridge goes past it quickly.",
  },
  "the-slot": {
    "slot|crevasse|bridge|snow":
      "Where the slot is open you can see the snow bridge from the side, a crust a foot thick with nothing under it at all. Further along a hole has broken through the bridge, round, and around its edge the snow is clawed.",
  },
  "the-glacier-toe": {
    "toe|ice|stones|gravel|bone":
      "The bones lying at the ice's foot are big, and old, stained brown, and one is part of a skull with a horn core the width of your arm. The ice above them is dirty and dripping and still holding more, black shapes deep in the grey.",
  },
  "the-red-tail": {
    "tail|grit|rock|ground":
      "The grit thins out over a hundred paces like dust blown off a shelf, and the prints on it are all going up. Every one is clear: pads, claws, hooves. Nothing that came this way came back by it.",
  },
  "the-red-edge": {
    "edge|band|rock|red|grey":
      "Run a finger along the line and the red side is rough and stains your skin and the grey side is clean. The line is perfectly straight and runs for a long way in both directions. Frost has split the red rock along it into plates.",
  },
  "the-shelf-walk": {
    "walk|overhang|grit|bones|wall":
      "The bones along the back wall are cracked lengthwise for the marrow, every one, and the cracks show teeth. The grit in front of them is pressed flat in a long shape. The overhang above is blackened with grease at the height of a lying beast's shoulder.",
  },
  "the-red-scree": {
    "scree|stone|red":
      "The red stones are flat and light and slide over each other with a sound like broken crockery. Every step leaves a little scar of darker red where the top layer slid off. The tracks across the scree are only scars, already blurring, and none of them is a clean print.",
  },
  "the-rust-slope": {
    "slope|stones|red":
      "Every stone is coated in the same fine rust, and lying among them, now and then, there is a stone of a different colour, grey, carried up here somehow. The slope has no prints on it. Your own prints fill in behind you as the little red stones slide back.",
  },
  "the-red-moss": {
    "moss|crust|lichen|hollow|stones":
      "The nibbled patches are bare stone with a ring of torn moss round them, and in the torn edges you can see the moss is green underneath the red. There are small hoof-prints in the damp at the hollow's bottom, and droppings like dark beads.",
  },
  "the-north-step": {
    "step|shoulder|rock|ridge":
      "The rock of the step is ordinary grey, frost-split, cold to the hand, and coated on its north side with rime. The wind has swept every loose stone off the shoulder above. A single raven feather is caught in a crack, quivering.",
  },
  "the-ice-plain": {
    "ice|plain|snow|surface|roof":
      "Under the inch of dry snow the ice is glassy and dark, with white bubbles in it. Here and there the dark goes darker, a long line under the surface: a crack, roofed. Brush the snow away and the roof is a thin skin of ice over black.",
  },
  "the-drift-hollow": {
    "hollow|chamber|snow|doorway|rock":
      "The floor of the chamber is dry snow, fine as flour, and there is not a mark in it. The walls are smooth and slightly glazed where some warmth once melted them and they froze again. The doorway's edges are sharp and unworn.",
  },
  "the-glacier-head": {
    "ice|ridge|line|rock|join":
      "Along the join the ice is thrown up in broken slabs and the rock above is scarred and polished. Strewn along the line are things that fell from above: stones, grit, a long bone, a raven's skull, a tangle of dry heather from somewhere far below.",
  },
  "the-cold-terrace": {
    "terrace|wall|strip|stone":
      "The loose stuff along the back wall is grit, splinters, and a few bones, and in two places it is scraped into hollows with shed hair in them. The wall above them is smudged dark at the height of a curled back. Nothing else on this tier has been slept in.",
  },
  "the-low-traverse": {
    "shelf|traverse":
      "The shelf is trodden flat into a path, and the path has the prints of many things going east and a few coming west. On the rock above, at intervals, there are scratch marks, high up, where something reached up to look over the edge.",
  },
  "the-oxide-flat": {
    "flat|pavement|rust|water|hollows|rock":
      "The rust comes off on your hands as an orange powder that dries to a stain. The water in the hollows has a skin on it that breaks into plates, like the skin on cooled milk. No prints go to the hollows. The prints that cross the flat go round them.",
  },
  "the-iron-band": {
    "band|seam|chips|iron|rock":
      "The chips are black and heavy, and their broken faces are bright and grey like new metal. A lump of it pulls at a needle held near. The seam rings when struck, and the ringing carries a long way and comes back off the rock above.",
  },
  "the-stained-run": {
    "run|stripe|rock|stain":
      "The stain is darker red and smooth, the rock polished by water running over it. At its foot there is a fan of stones carried down in the last flood, sorted, the big ones at the top. Bones are mixed in with them, washed down from above.",
  },
  "the-cold-shoulder": {
    "shoulder|rock|rime":
      "The rime on the north sides of the rocks is a hand thick and as white as salt. Break it and the rock under it is black and bone dry. On the south sides of the same rocks, there is no rime at all, only the grey stone.",
  },
  "the-stone-desert": {
    "rock|plates|desert|skyline":
      "The plates are swept so clean there is not a grain of grit on them, and their surfaces are polished in one direction. Lying flat in a crack between two plates there is a single feather, black and long, held there against the wind.",
  },
  "the-swept-ground": {
    "pavement|stone|ground":
      "The fist-sized stone sitting alone on the pavement has a little tail of grit in its lee, the only grit for a long way. Pick it up and there is a pale ring under it where it has sat. The pavement is polished in long streaks, all pointing the same way, toward the top.",
  },
  "the-pavement": {
    "pavement|slabs|cracks|rock":
      "Kneel at a crack and there is ice in the bottom of it, clear and hard, even at noon. Some of the slabs are lifted at one edge by the ice, a finger's width. In the deepest crack there is a wing, small, a bird's, dry as paper.",
  },
  "the-shelf-under": {
    "shelf|nests|sticks|ledge|wall":
      "The nests are huge, each as wide as a cart wheel, built of sticks thick as an arm that grew far below. In the middle of each nest there is a cup of fur and feathers, flattened and dry. The rock below the shelf is whitened with old droppings, and nothing is fresh.",
  },
  "the-warm-under": {
    "hollows|grit|rock|ground":
      "The hollows are large, the size of a curled bear and bigger, and the grit in them is pressed hard and warm. Shed hair lies in the bottom of each, thick and coarse. The rock overhead is warm enough to keep a hand on for only a little while.",
  },
  "the-burnt-ground": {
    "ground|patches|rock|red|glacier|toe|ice":
      "Strike a black patch with a stone and it rings high and clear; strike the red beside it and it thuds. The black patches have clean edges as if traced round something. Where the ice comes down onto them, the ice is melted back in a hollow and the ground under it steams faintly.",
  },
  "the-ochre-shelf": {
    "shelf|stone|powder|prints":
      "The prints are two kinds: one is a big cat's, round and heavy, the other is longer and narrower with the claws set further forward. Neither steps on the other. The yellow powder clings to your boots and comes off in little puffs with each step.",
  },
  "the-red-gully": {
    "gully|walls|stone|grit|wall":
      "The shape in the grit against the west wall is long, longer than you are, and the grit is pressed so hard it has a sheen. The wall above is rubbed smooth. A heap of bones lies a little way down the gully, and they have been cracked open.",
  },
  "the-north-crest": {
    "crest|face|ridge|cloud":
      "The rock along the crest is scoured clean and lichened on its south edge only. Small stones are wedged in the cracks, held there by the wind. Looking down the north face, there is cloud a long way down, and in it, now and then, a dark shape of rock showing through.",
  },
  "the-shoulder-end": {
    "shoulder|crest|ridge|towers":
      "The shoulder's end is a jumble of loose blocks with a faint path between them, and the path splits here: one branch up onto the crest, one down into the lee. The down branch is trodden harder. Most things that come here choose the lee.",
  },
  "the-lee-side": {
    "hollow|grit|walls":
      "The grit on the floor is dry and soft and pressed flat in a few places where things have lain. There is a little heap of droppings in one corner and a few tufts of hair caught on the walls. It is a cold hollow, and it smells only of stone and cold.",
  },
  "the-cold-plain": {
    "plain|rock|sky":
      "The rock is split into plates and the plates are covered in a thin dry dust that does not hold a print. Breathe out and your breath is gone before you see it. Your lips crack. A fallen raven lies dried out on the rock, light as a leaf.",
  },
  "the-wind-cut": {
    "cut|trench|rock|stone":
      "The polished stone in the trench's floor shines like water, and the trench's walls are scalloped by the grit into little cups, all facing upwind. A handful of grit lies drifted in each cup. The trench runs dead straight because the wind does.",
  },
  "the-approach": {
    "ground|rise|approach":
      "The rise is smooth and the rock under it is glazed in places, dark and shining. There is not a bone, a feather, a dropping, or a print anywhere on it. The last print you see is behind you, at the foot of the rise, and it stops there.",
  },
  "the-under-shelf": {
    "shelf|chips|bone|ground":
      "Pick up a handful of the bone chips and every one is the same size, a thumbnail, and every one is cracked across. Some are blackened at the edges. Nothing larger lies anywhere on the shelf, and nothing smaller.",
  },
  "the-south-shelf": {
    "shelf|plants|strip|rock":
      "The dwarf plants are willow, a hand high, their branches lying flat along the rock and their leaves no bigger than a fingernail. The water seeps from a crack behind them and wets a strip of rock the width of a table. Every leaf has been nibbled.",
  },
  "the-high-red": {
    "bowl|red|ground|corner":
      "From the corner you can see the whole bowl drains to its middle, and the middle is a hollow of dark red stones with a crust of white salt on them where water has stood and dried. Prints lead down into the hollow from every side.",
  },
  "the-scree-head": {
    "scree|head|gully|channel|stone":
      "The stones at the head are tight-packed and every one is pushing on the one below it. A few are cracked through from the pressure. At the very lip of the channel the stones are on the move, a slow trickle of grit always running between them.",
  },
  "the-gully-top": {
    "slot|gully|gap":
      "Both sides of the slot are polished at shoulder height, smooth and dark with grease. The floor of the gap is worn to bare rock. A heap of loose hair lies in the lee of one wall, as though shed in passing over and over.",
  },
  "the-crest-walk": {
    "crest|rock":
      "The rock of the crest is scoured clean and its surface is pitted with tiny holes, all made by grit. The wind is steady from the west and it hums in the holes. Here and there a raven's feather lies wedged and quivering.",
  },
  "the-cushion-ledge": {
    "ledge|cushions|plants|rock|cracks":
      "The cushions are tight as moss, green on top, and on their outsides they are nibbled to the rock in a ring, like a fringe cut evenly round. The rock between them is warm to the touch. Small droppings lie scattered in the cracks between the cushions.",
  },
  "the-first-step": {
    "step|ridge|rock":
      "The rock of the first step is cold and frost-split and lichened, ordinary. Put a hand on it and then back on the ground behind you and the difference is plain. The lichen grows right up to a line between the two and stops.",
  },
  "the-ramp-head": {
    "ramp|ground|rock":
      "The rock at the ramp's head is dark and dry and warm as a hearthstone an hour after the fire. The snow at its edges melts back in a clean line, a finger's width away from the warm rock. There is no smoke and no smell, only the warmth.",
  },
  "the-warm-flags": {
    "flags|rock|paving":
      "The flags are smooth and warm, and the grit that covers everything else has been swept off them in long curving lines, as if by something dragged across them. The lines all run toward the summit. Not one print is on the flags.",
  },
  "the-last-ground": {
    "ground|rock|stone|band|flat":
      "The band of pushed stone round the edges is heaped highest at the four corners, where whatever pushed it turned. In the bare middle the rock has a shine on it, smooth, as if something heavy had been dragged across it over and over. There is no grit in the middle at all.",
  },
  "the-warm-gutter": {
    "gutter|rock|grit|prints":
      "The grit in the gutter is warm to the touch and soft as flour, and the prints in it are many: hoof, pad, claw, the dragging line of a tail. Hold a hand over the gutter and the air coming along it is warm and dry and smells faintly of struck flint.",
  },
  "the-crest-gap": {
    "gap|saddle|snow|crest":
      "The old snow in the bottom is grey and hard and pitted, a crust of dirt and grit on it. Its east edge is melted back in a hollow, the snow there rotten and slumped. Things come down into the saddle to lick at it; the near edge is grooved by tongues.",
  },
  "the-north-lip": {
    "lip|edge|ice|cracks|crest|rock":
      "The ice in the cracks is old, grey and full of grit, and on the south side of each crack it has melted back a finger's width. Put one hand in the crack and one on the rock beside it and one is cold enough to ache and the other is warm as a cheek.",
  },
  "the-shoulder-stone": {
    "stone|hump|hollow|water|dust":
      "The hollow is worn smooth inside and the water in it is clear, with a little grit at the bottom. The rock round its rim is polished by muzzles. The dust round the hump is printed so thick that nothing can be read in it but the sheer number.",
  },
  "the-run-stone": {
    "stone|rock|lobes|edges":
      "Run a hand over the lobes and they are smooth and ropy, and the ropes all run downhill. Where a curled edge has cracked, the inside is full of small holes like bread, every hole empty. The frost has not broken it; there is not a single flake of it lying loose.",
  },
  "the-black-glass": {
    "glass|chips|glaze|edge":
      "The chips are black and shine like a wet eye, and their broken faces are curved in ripples. The edges are fine enough to shave the hair off the back of a hand. Held up to the light, the thinnest of them glows a deep brown, like strong tea.",
  },
  "the-heat-shimmer": {
    "air|shimmer|ground|terraces":
      "Kneel and the shimmer is coming up off the ground itself, out of the rock, not off the sun. The rock under your palm is hot. A stone dropped onto it skitters, and a little puff of dust goes up and hangs in the moving air.",
  },
  "the-heat-under": {
    "overhang|heat|warmth":
      "The rock of the overhang is too hot to keep a hand on. In the grit under it there are shed skins, and old feathers, and a sweet heavy smell like a closed room. Something rustles at the back, under the lowest part, and stops when you stop.",
  },
  "the-lower-warm": {
    "edge|line|ground|warm":
      "Right at the line the rock under your feet is warm and the grit a step down is frosted white. There is a crack along the line, a thin one, and from it a thread of steam goes up in the cold air below and vanishes.",
  },
  "the-lower-flags": {
    "flags|paving|overhang|hollows|hair|print|grit":
      "The whole print is the shape of a body lying on its side, as long as two men, with a dry pale patch in the grit the shape of a flank. Where its head lay there is a scorch on the rock, a smudge of black. The hair in the hollows nearby is coarse and dark.",
  },
  "the-crown-edge": {
    "edge|brow|ridge|cloud":
      "The rock at the brow is scoured and the lichen on it is a pale grey crust, very old, cracked into a pattern like dried mud. A few raven pellets lie along the edge. Below, the cloud floor is white and level and holes in it show the dark ground far beneath.",
  },
  "the-cold-side": {
    "rime|stone|stones|ground|strip":
      "The rime stands out from the north faces in feathers a hand long, and the ground under it is frozen so hard a boot leaves no mark. There are no prints on the strip at all. The nearest prints run along its south edge, forty feet away, in a beaten line.",
  },
  "the-tower-foot": {
    "tower|ledge|droppings":
      "The droppings on the ledge are a big cat's, full of hair and bone, and some are fresh enough to smell. The rock above the ledge is rubbed glossy at shoulder height round the whole curve. In one hollow the dust is pressed flat and still warm.",
  },
  "the-scald": {
    "scald|rock|flakes|edge|ground":
      "The flakes lift off the rock like the skin off a burnt loaf, pale and brittle, and under them the rock is darker. The edge of the scald is a smooth curve and you can follow it with your eyes the whole way round. On the far side of it the lichen is untouched.",
  },
  "the-sun-trap": {
    "bowl|rock|air|smell":
      "The smell comes from a cleft at the back of the bowl, where a carcass is wedged, dried out by the heat to leather and hair. It has not rotted; it has baked. The rock round the cleft is splashed white by birds that tried and gave up.",
  },
  "the-vent": {
    "vent|hole|sand|mouth|rock":
      "The sand round the mouth is clean and fine and not a single print is in it. Hold a hand over the hole and the air coming up is warm and dry and smells very faintly of struck matches. The rock round the rim is glazed dark, as if fired.",
  },
  "the-step-up": {
    "ledge|chimney|terraces|step":
      "The ledge at the chimney's top is worn smooth in one place where hands come over the edge. From it the warm side of the tier opens out, and the ground nearest you is printed thick and recent. The noise comes from everywhere at once.",
  },
  "the-south-step": {
    "step|rock|chimney":
      "The chimney's walls are polished in two bands, one for the back and one for the boots, and the bands are smooth and pale. At the foot of the step the ground is trampled bare by animals that came here, stopped, turned round, and went back.",
  },
  "the-last-crest": {
    "crest|blocks|block|halves|drop":
      "The two halves of the split block have faces as smooth as cut stone, and they match. The ground between them is clean, scraped, without a single loose stone. Frost does not throw stones eighteen feet. The edges of the split are faintly glazed.",
  },
  "the-shadow-step": {
    "shade|step|cover":
      "In the shade the rock is cold and the grit is pressed into hollows where things stand. The hollows face east, toward the notch. On the wall beside them the rock is rubbed dark at the height of a standing beast's shoulder.",
  },
  "the-crack-line": {
    "crack|grass|lip|rock|air":
      "The grass along the lip is short and fine, cropped by something, and its roots go down into the crack where the warm air is. The rock either side is dry and dusted with a pale yellow crust. The air from the crack smells of struck matches.",
  },
  "the-warm-scree": {
    "scree|stone|stones|hollows":
      "The hollows are long and curved, like a body lying coiled, and each is lined with a thin crust of shed skin flakes, big ones, the size of a fingernail. The stones at the bottom of each hollow are polished smooth. They are warm through.",
  },
  "the-under-warmth": {
    "ground|cracks|steam|threads":
      "The steam comes out of the cracks in threads and each crack has a crust round its lip, yellow and white, crumbling. Put a hand over one and it is wet and warm. The ground between is bare and dry and nothing grows on it.",
  },
  "the-terrace-foot": {
    "wall|terrace|bones|ground|shade|road":
      "The bones along the foot are of every age and every size, and some are crushed where they landed. The strip of clear ground is beaten into a path a stride wide, printed with pads and hooves and dragging lines. The shade is cold against the warm rock.",
  },
  "the-south-gully": {
    "gully|stone|bones":
      "The gully is jammed with bones and hide and hair washed down from the terraces in the rains, all of it packed in among the stones. The smell is strong. In the dry places small things have made runs through it, and there are tiny prints in the dust between.",
  },
  "the-high-notch": {
    "notch|gap|ridge|rock|threshold":
      "The rock in the notch is scoured clean and pale. Looking east the threshold ground is grey and swept and has no mark on it anywhere. The notch's floor is worn smooth in a path that comes from the west and stops dead at its eastern lip.",
  },
  "the-tower-gap": {
    "gap|towers|rubble":
      "The rubble in the gap is loose and every stone has been turned by the wind, grey side up. The walls of the towers on either side are polished in long streaks by the wind and the grit it carries. A feather pinned against the rubble shivers and does not blow away.",
  },
  "the-adder-shelf": {
    "shelf|holes|rock|adders|snakes":
      "The holes are smooth-lipped and polished, and in their mouths there are shed skins, whole ones, inside out. The rock is warm everywhere, and in the sun the adders lie in loose heaps, their patterns breaking up against the broken stone so that the heaps are hard to see.",
  },
  "the-dry-heat": {
    "bones|heat|dust":
      "The cracked bones are white and as light as paper, and their insides are clean and dry. The dust is fine and pale and warm, and it lifts in a little cloud at every step and settles slowly. Nothing here smells of anything.",
  },
  "the-under-terrace": {
    "pile|diggings|lip|terraces":
      "The diggings go down into the pile in deep holes, and the sides of them show what the pile is made of: bones and hide and hair, layered like the bands in a cut bank. The freshest digging has claw-marks down its walls, and a long bone pulled out and left beside it.",
  },
  "the-quiet-ground": {
    "rock|ground":
      "The rock is bare and grey and clean of everything, even lichen. Drop a pebble and it clicks and that is the only sound. On the rock, here and there, there are patches of a darker grey, smooth, in rounded shapes, as if something heavy had lain on each one.",
  },
  "the-scorched-step": {
    "ground|rock|notch|step":
      "The pale rock is cracked in a fine net of shallow lines, the way clay cracks in a hot sun. Kneel and the cracks are full of a fine white ash that blows away when you breathe. At the line where the scorch begins, the last print going east stops.",
  },
  "the-guano-face": {
    "wall|face|runnels|guano":
      "The white is crusted thick and layered, old grey under fresh white, and the runnels in it are stained green and brown where rain carries the newest down. A ledge partway up holds a dead chick, fallen out of a nest and dried, the size of a goose.",
  },
  "the-eyrie-foot": {
    "ledges|bones|face|base":
      "The bones at the base are of everything: sheep, deer, goat, and long heavy ones that do not fit any of them. They lie in a drift along the foot, crushed where they hit, and the drift is deep enough to wade. A shed feather among them is longer than your arm.",
  },
  "the-bare-place": {
    "stone|place|ground":
      "The stone is smooth and warm and clean, and in its middle there is a faint scorch, a dark ring the size of a cart wheel, glazed at its edge. Nothing lies on it. The cover behind you is the last place with any prints.",
  },
  "the-swept-terrace": {
    "terrace|rock|ring|stone":
      "The ring of heaped stone is highest on the east side, where whatever lay here pushed hardest turning round. The rock in the middle is polished and faintly warm. At one edge of the ring there is a dark scorch on the rock, a smudge, as from a breath.",
  },
  "the-high-perch": {
    "perch|knuckle|rock|base":
      "The knuckle's top is polished to a shine by claws and its edges are scored with deep grooves where talons gripped. The white round the base is thick and fresh. Caught in the grooves there are feathers, long dark ones, and a tuft of down.",
  },
  "the-white-wall": {
    "wall|holds|white":
      "The holds are crusted with white and slick under it, and each one has been scraped clean by hands at its edge, the only clean rock on the face. The smell is strong enough to taste. At the top of the line the white is worn through to the grey in a single patch.",
  },
  "the-second-terrace": {
    "terrace|rock|stains|shelf":
      "The black stains are layered so thick they have built up a crust on the rock, and the crust has rings in it like a cut tree. Lying on top there are the remains of the last thing brought here: a hind's leg, the hoof still on, picked clean.",
  },
  "the-scatter": {
    "scatter|hide|hair|hooves|ground":
      "The ground is deep in the leavings of the terrace above, all of it trampled. There are prints of four or five kinds in among it, all pointed in toward the middle, and paths worn into the drifts from every side. Flies rise off it in a cloud as you come in.",
  },
  "the-grease-flat": {
    "flat|rock|floor|grease":
      "Rub a finger on the rock and it comes away with a smear of old fat, rendered out of years of carcasses and soaked into the stone. The floor slopes to the drop, and along the lip there are claw-scrapes where things went over and tried to stop.",
  },
  "the-threshold": {
    "threshold|walls|ash|approach|ground|rock":
      "The ash on the floor is fine and grey and untrodden. The walls on either side are glazed black in long runs from the height of a tall man upward, and the glaze has dripped and set. The smell is strongest at the far end, where the walls close in.",
  },
  "the-ash-ground": {
    "ash|grit|ground|rock":
      "Pinch a little of the ash and it is soft and greasy and smells of burnt stone. Your prints in it are crisp, every crease of your boot sole. Behind you they are the only marks in the room. Ahead of you the ash is level and unmarked to the far wall.",
  },
  "the-wind-post": {
    "pillar|post|top":
      "The pillar's top is scoured smooth and grey and not a single dropping is on it, though the rock below its foot is white with them. Its east face is glazed dark, the only face that is. Birds that come near it turn away a few wingbeats short.",
  },
  "the-updraught": {
    "air|face|updraught|ledges":
      "The air comes up the face so hard that grit from below is carried past your face and up, and small feathers come drifting up from somewhere and go on over your head. The rock here is clean, scoured by everything the updraught brings past.",
  },
  "the-nest-shelf": {
    "nests|nest|shelf|ledge|young":
      "The nests are built of whole branches, bark still on, carried up from the wood far below, and lined with wool and fur. In each one there are bones heaped at the edge, picked clean. The young in them are already bigger than an eagle and are watching you.",
  },
  "the-third-terrace": {
    "bones|terrace|long bones":
      "The long bones are as thick as your thigh and cracked open lengthwise, the marrow long gone. Lay one beside you and it reaches past your shoulder. They are older than the rest, brown and heavy, and the bones heaped over them are white and new.",
  },
  "the-gorge-ground": {
    "birds|ground":
      "The ground under the birds is a crust of droppings, feathers and scraps, and every bird stands on a little cleared patch of its own. They watch you with one eye, then the other. Under their feet there are bones cracked small, and they are all the same few shapes.",
  },
  "the-crack-heap": {
    "heap|bones|rock":
      "Every bone is split the same way, along its length, and every split has a chip at one end where it struck the rock. The rock itself is pitted and dented under the heap, beaten hollow by years of things dropped on it from high above.",
  },
  "the-last-shelter": {
    "hole|block|grit|floor|slot":
      "The grit on the floor is clean and smoothed, and there are no prints in it but your own. The fallen block over the hole is cracked across, and the crack is old. Through the slot the pale ground to the east is bright and empty and nothing moves on it.",
  },
  "the-hot-flags": {
    "flags|rock|floor|terrace":
      "The flags are hot enough that a drop of water on them hisses and is gone. The joints between them are filled with a crust of pale yellow, crumbling. No bones lie here and no prints cross it, and the edge where the hot flags begin is a straight line.",
  },
  "the-lookout": {
    "corner|face|bird|lookout":
      "The rock at the corner is scored by talons in long grooves and white round its base. There is always a bird here, and the bird is always facing east. Looking where it looks, the ground is pale and empty, and the bird does not look away.",
  },
  "the-last-terrace": {
    "terrace|floor|bones|bank":
      "The bones in the bank are pushed into a long curve along the edges, and the middle is swept rock, faintly warm. Across the swept floor there is one mark: a long shallow groove, smooth, as wide as a cart, curving from one side to the other.",
  },
  "the-picked-ground": {
    "skeletons|bones|ground":
      "The skeletons lie in their proper order, ribs arched, legs folded under, as the animals fell. They are so clean they shine. Not a single bone has been carried off, and not a single small mark of teeth is on any of them; only beaks have been here.",
  },
  "the-white-heap": {
    "heap|bank|leavings|wall":
      "Push a hand into the bank and it gives like snow and is dry, and it is all bone, so old it has gone to chalk. It crumbles at a touch. At the bottom, against the wall, the oldest layer has hardened into something like stone, and there are shapes in it.",
  },
  // The Shieling Hamlet (migs 370-373, 2026-11-04).
  "the-drove-cut": {
    "cut|banks|bank|roots|stones|walls":
      "The banks are polished at the height of a sheep's flank, a smooth greasy band all the way up both sides where ten thousand fleeces rubbed past. Above the band the roots stick out raw. Below it the floor of the cut is bare rock, and the rock is pocked with small hoof-dents.",
  },
  "the-spring-green": {
    "spring|ring|slab|windlass|rope|bucket|water":
      "The slab was levered on with a bar, and the bar's bite is still in its edge, three notches where it slipped. The windlass handle is worn bright on the grip. Lean close to the gap and the cold comes up out of it like breath, and you can hear the water moving underneath.",
  },
  "the-terrace-strips": {
    "terraces|strips|walls|wall|steps|stubble|ridges":
      "Every wall leans very slightly into the hill, the way a good waller sets one so the slope holds it up. The stones were picked off the strips themselves; the soil on the steps has none bigger than a fist. Somebody carried the soil here too, some of it, in baskets, and the strips are deepest at the inside edge.",
  },
  "the-shiel-foot": {
    "scorch|gable|fire|walls|ruts|stone":
      "The scorch is a narrow black tongue up the gable, and at its foot the turf is still lifted in a square where somebody cut it to smother the fire. They smothered it, and the square was never put back. The ruts in the trodden stone are sledge runners, not wheels, two straight grooves.",
  },
  "the-fold-pound": {
    "pound|pen|gate|stones|courses|wall":
      "The gate is hurdle, woven hazel on a frame, and it has been rewoven at least twice; the new withies are paler than the old. On the downhill side the top course is knocked off in one place and two stones lie inside the pen, where whatever was shut in here went over from inside.",
  },
  "the-in-field": {
    "field|in-field|meadow|deer|grass":
      "The ground is darker and softer here than anywhere else on the slope, years of muck carried out from the byres and forked in. The ridges of the last ploughing still show across it in the late light. Deer have bedded in the long grass at the top in three or four round flattened places.",
  },
  "the-shiel-street": {
    "doors|door|shiels|street|walls|stone|rock":
      "Every door is shut the same way, the latch tied round with a twist of cord, every cord rotted to a stub. Somebody went down the street closing up. Where the hill's bare rock comes through the street, steps have been cut into it, shallow, for a sledge's runners to bump down.",
  },
  "the-forge-yard": {
    "yard|scale|trough|clinker|heap|ground":
      "Kick the clinker heap and it breaks open glassy and green-black inside, the slag of a hot fire run a long time. Every lump in it is the same size, raked out and dumped in the same place. The frost crack runs right down the trough and somebody drove a wedge into it to see how far.",
  },
  "the-hill-smithy": {
    "smithy|hearth|hood|anvil|block|hooks|wind-eye|window":
      "The anvil block is a stump of birch, which is no good for it, because birch was what grew within reach. It is split twice and bound round with iron to hold it. The hooks on the wall are close together and small: hoof-nails, shears, the light work a hill smith did, and nothing heavy.",
  },
  "the-shiel-backs": {
    "plots|walls|wall|gaps|rowans|nettle|bilberry":
      "The gaps in the back walls line up, one behind the next, so a single short path ran the length of the backs. Their top stones are worn smooth by hands. In each plot the nettles grow thickest in one corner, the same corner, where each household threw its slops.",
  },
  "the-hill-cross": {
    "cross|steps|step|tally|stump|head":
      "The head of the cross is nowhere here; it went downhill, and the hill keeps what goes downhill. The tally on the bottom step is strokes in fives, neat at first, then fast, then hardly cut at all, the last few no more than scratched with something blunt.",
  },
  "the-herds-yard": {
    "yard|cobbles|byre|house|roof":
      "The cobbles are worn into a hollow by the byre door, where every beast in the place came through it once a year to be counted. Somebody scored a line beside the door at shoulder height and cut a tally of nicks along it. The house across the yard has its threshold scrubbed pale.",
  },
  "the-herds-house": {
    "house|hearth|lintel|hook|bench|bedstead|window|shutter|floor":
      "The floor is swept and the sweepings carried out. The hook in the lintel is worn thin on its underside by a pot's handle. The bench in the wall has a hollow at one end only, by the hearth, where one person sat every evening for a long time.",
  },
  "the-burnt-shiel": {
    "shiel|walls|black|fire|rowan|hearth":
      "The black is on the inside face of the walls, highest over the door, the way a fire inside a house climbs out. The outside is clean. The rowan has rooted in the hearth's ash, and it is the only tree inside a wall anywhere in the place.",
  },
  "the-chapel-shelf": {
    "shelf|yews|yew|wall|stone":
      "The shelf was cut level by hand and the spoil was thrown over the edge; it lies in a fan of grassed-over rubble below the wall. The worn middle is an oval, a crowd's shuffle, not a path. The yews' roots have shoved the wall outward in two places and nobody straightened it.",
  },
  "the-shiel-head": {
    "gate|wall|roofs|roof":
      "The gate opens downhill, and its post on the inside is worn by a hand at latch height. The wall it hangs in is the best-built wall in the place, chest high and capped, because this is the side the weather comes from and the side the country is.",
  },
  "the-high-croft": {
    "croft|house|byre|roof|channel|partition|muck":
      "The muck channel is cut into the bedrock where the house stands on it and lined with slabs where it does not. The byre end of the roof is lower than the house end. Inside the byre door an iron ring is leaded into the wall, worn bright on the inside of its curve by a tether.",
  },
  "the-high-house": {
    "house|thatch|hearth|hearth-stone|byre|floor|smoke":
      "The underside of the thatch is a black crust hard enough to ring when you rap it. The hearth-stone is cracked across, and the crack has been packed with clay. The beaten floor is worn lowest in a ring round the fire, a lifetime of feet going round it.",
  },
  "the-thorn-garth": {
    "garth|garden|wall|trunks|trees|bark|windfalls|grass":
      "The dead trees and the living ones stand in the same rows, planted the same day. The living ones were pruned once by somebody who knew how; the dead were left alone. Under the living half the windfalls are bitten, not pecked, and the wall has a gap at the bottom where something comes through.",
  },
  "the-hill-chapel": {
    "chapel|font|bench|door|roof|block":
      "The font is cut from a single block of the hill's own grey stone and still holds a hand's depth of water, though the roof does not leak. The bench is worn into hollows, closest together nearest the door. The door has a bar, and the bar is on the inside.",
  },
  "the-fleece-green": {
    "posts|lines|green|grass|fleeces|hides":
      "The posts are notched at the top for ropes, and the notches are worn smooth and greasy-dark, greasy enough to stain a finger even now: wool fat, years of it. Under the lines the grass is brighter than the rest, and there is a row of small square peg-holes along each.",
  },
  "the-lost-toft": {
    "toft|bank|doorstep|step|ground":
      "The doorstep was set too deep to lever out, which is why it is the only stone left. It is worn hollow in the middle and worn again on one side, where somebody always stepped. The bank round the toft is low and even, and the turf inside it is finer than the turf outside.",
  },
  "the-rowan-rows": {
    "rowans|rowan|row|trees|trunks":
      "Each crooked tree grew up out of an old cut stump, and under the moss there are knife-marks on several of the stumps, a cross cut into the bark at the foot. The spacing is exact, a stride and a half apart, and the row runs along the very edge of the common and not one tree past it.",
  },
  "the-peat-hut": {
    "hut|turf|walls|roof|birch|peat|bracken|bedding":
      "The birch rafters are bent and bark-on and every one is tied, not pegged, with twisted heather rope. The bracken bedding is crushed flat in a long shape along the wall, and fresh bracken has been pushed in at the edges. Somebody still sleeps here, or something.",
  },
  "the-hill-spring": {
    "spring|barrel|staves|water|mud|prints":
      "The barrel's bottom was knocked out so the water rises into it from the hill. The staves are hooped with twisted birch, renewed at least once. The prints in the mud are sheep and deer and something heavier, and all of them come and go.",
  },
  "the-hill-graves": {
    "graves|grave|mounds|rows":
      "In rows, and close: each mound barely a body's length from the next, dug as fast as they were needed, and shallow, because the rock is a foot under the turf here. The chapel's shelf is in sight and has room. These people were not carried that far.",
    "ground|earth|soil|bones|layers|under|rock":
      "The rock a foot under the turf is not the hill's. Where frost has heaved a mound, the shallow grave lies over older bones, crushed flat and packed close, and under them the rock is flat stone, dressed and laid tight, older than anything on the hill, with cold air coming up through the joints.",
  },
  "the-scree-end": {
    "scree|juniper|slope|stone|common":
      "The last of the common ends at a line of big stones set along the top of the scree, a stride apart, the only fence the slope would take. Below them the juniper grows flat to the stones, pressed down by snow, and nothing goes across but small loose trickles of grit.",
  },
  "the-cold-hearths": {
    "hearths|stones|ring|shelters|marks":
      "The flat stones are cracked through with heat, and one is split and set back together. The marks of the old shelters lie round the fire with every doorway facing it. The herders who came up here pitched in the same places every summer, before there was a single stone house.",
  },
  "the-thorn-nook": {
    "thorn|path|tunnel|bushes|common":
      "The path goes in at the height of a sheep's back and the thorn over it is browsed short and even. Tufts of wool hang on the spikes at the mouth of it, and further in, coarser, darker hair, caught at the height of your knee.",
  },
  // ======================= THE ROADS, the rest (2026-11-05) =============
  "the-willow-landing": {
    "ring|mooring|stone|willows|willow|causeway":
      "The ring turns because its socket is worn round, a groove cut into the stone by years of the ring swinging. The willows on the bank were cut back hard once and have grown out again from the stumps in bunches. The last stone of the causeway is worn lower on its landward edge, where feet stepped off.",
  },
  "the-green-lane": {
    "hedges|hedge|lane|tunnel|track":
      "The hedges were laid once: you can see the old stems bent over and pinned at the bottom, grown on into thick crooked trunks. Nobody has laid them since. The ruts under the leaf litter are still there, two shallow troughs narrower than the lane is now.",
  },
  "the-tussock-ford": {
    "tussocks|tussock|sedge|peat|crossing":
      "Each tussock is worn bald on top where feet land, a bare patch in the middle of the sedge. Between two of them somebody has pushed a pole down into the peat and left it, and the pole goes down further than its own length and does not touch anything.",
  },
  "the-wood-gate": {
    "gate|posts|stumps|iron|hinges":
      "The iron in the oak stumps is a pair of hinge pins on one side and a hasp on the other, rusted solid. The gate itself is not anywhere nearby. The posts are worn on the inside faces at hip height where the gate swung against them for years.",
  },
  "the-faggot-stack": {
    "ricks|faggots|bundles|wood|bindings|stack":
      "The bindings on the two good ricks are twisted withy, and the knots are all tied the same way, by the same pair of hands. The rotted ricks have gone to long soft ridges full of beetles. The stacking ground is levelled, and the lane's edge beside it is worn by barrows.",
  },
  "the-fuel-road": {
    "lane|banks|roots|hedge|road":
      "The hedge roots hanging out of the banks are thick as an arm and bare, and the banks are scarred along their whole length at one height, where barrow hubs scraped. The lane's floor is bare rock and stone, worn smooth.",
  },
  "the-bank-and-ditch": {
    "bank|ditch|gap|lane":
      "The gap was cut square and its sides were faced with stone so they would not slump, and the facing is still there under the moss. The bank either side is higher than your head. On the common side of the gap a post-hole is cut in the stone, for something that could close it.",
  },
  "the-gorse-break": {
    "gorse|lane|ruts|passage":
      "Under the gorse the ruts are still clear and dry, two parallel troughs, and the gorse has rooted along the crown between them. The flowers smell of nothing much up close. The passage through is worn bare by things going through low.",
  },
  "the-gorse-tunnel": {
    "gorse|tunnel|drove|needles|pipe":
      "The dead needles on the floor are a hand deep and dry, and they hold the print of every foot that passes, which is a great many. The gorse overhead has been browsed from below in places. There is wool caught in it, and it is not new.",
  },
  "the-rutted-track": {
    "ruts|spine|track|grass|water":
      "The water in the ruts has a skin of pale mud on the bottom, undisturbed, and frogspawn in one of them. The spine between them is worn to bare earth along a line exactly one foot wide. The ruts were made by narrow iron tyres a long time ago.",
  },
  "the-drowned-hurdles": {
    "hurdles|hurdle|weave|hazel|layers":
      "The layers below are all hazel, but woven differently: the deepest is tight and careful, the next looser, the top one quick and wide-meshed. Each was laid by somebody in less of a hurry to do it well. The pegs holding the top one are new wood.",
  },
  "the-rush-shore": {
    "boards|trestles|rush":
      "The boards are nailed with square nails, and many of the nails have been pulled and the boards relaid with pegs. The trestles stand in the water on stone pads. In the mud beside the boards there are slots and prints going along at knee height, in a line.",
  },
  "the-eel-traps": {
    "traps|trap|stakes|wicker":
      "The wicker traps are funnel-mouthed, each with a narrower funnel inside it, so what goes in cannot find the way out. The two shut ones are tied with a cord that is newer than the traps. Whoever tied them is not the person who made them.",
  },
  "the-sheep-fold": {
    "fold|wall|doorway|stone":
      "The floor inside is swept, the dirt pushed out through the doorway into a little heap that has not yet been rained flat. The wall is drystone and every course leans a little inward. The doorway's stones are rubbed smooth where fleeces brushed past.",
  },
  "the-high-verge": {
    "verge|drove|ridge|grass|road":
      "The grass along the verge is cropped and the drove is wide enough for a flock, its edges marked by a line of old stones set every few strides. From here the paved road is pale and plain through the trees. A sitting-stone on the verge has been sat on enough to be smooth.",
  },
  "the-track": {
    "track|roadbed|stone|earth":
      "Kick at the track's edge and you find a kerbstone, buried, and then another. The roadbed is still down there under a hand of earth. Where the earth has washed off it the stones are dressed and set, and they are the same as the east road's.",
  },
  "the-sinking-path": {
    "path|stone|brushwood|way":
      "Where the path stands proud the stone on top is fresh, dumped from somewhere else, and where it sinks the stone is old and green. Somebody keeps adding to it. In the wet stretches you can feel the brushwood underfoot, and it is soft.",
  },
  "the-dead-alders": {
    "alders|alder|trees|wood":
      "The dead alders are hung with grey beards of lichen, and the bark has fallen off most of them in sheets that float at their feet. A line of high water stains every trunk at the same height. Woodpecker holes run up the nearest one in a neat column.",
  },
  "the-lych-way": {
    "path|way|lych":
      "The path is worn deep in the middle and the edges are untrodden, which is how it is when people walk it two by two. Every so often there is a wider place where the path swells to twice its width and then narrows again. Bearers changed shoulders there.",
  },
  "the-wet-furlong": {
    "stones|water|rushes|path|furlong":
      "The stones laid end to end are long and flat and every one has a hollow worn in its middle. The tipped ones have been set back more than once; you can see the scars on them where a bar levered them up. The water between them is clear and cold.",
  },
  "the-coffin-stone": {
    "slab|stone|uprights|top":
      "The top of the slab is worn smooth in two long hollows, one at each end, where the weight rested. There are scratches along one side, short and deep, made by something with corners being set down and lifted. Small stones lie on top, set there one at a time.",
  },
  "the-rush-ground": {
    "rushes|rush|ground|path":
      "Kneel in the path and you can see the old cutting: some clumps have stems that were sliced off level, long ago, and have grown up again from the cut. The path through is trodden flat and dark. Nothing has cut a single rush here in a great many seasons.",
  },
  "the-cross-field": {
    "field|ridges|furrows|path":
      "The ridges run the long way down the field and each one is curved slightly at its end, the shape of a plough team being turned. The path crosses them all. Along its edge there is a strip of different grass, finer, where people walked it for generations.",
  },
  "the-broken-cross": {
    "cross|base|steps|head|shaft|marks":
      "The marks on the base are crosses and initials and short lines, cut by knives and nails, layered over each other until the stone is more scratch than surface. The head lying in the grass has a face on it, worn to almost nothing. The break in the shaft is old and weathered.",
  },
  "the-last-paving": {
    "paving|stones|courses|road":
      "The last whole course is laid true and bedded. The two after it are laid on sand only, quickly. The scatter beyond that is stones dumped from a cart and never set. The work did not stop all at once; it ran out over a few days.",
  },
  "the-fen-edge": {
    "fen|reed|water|cuttings|ground":
      "Right at the edge there is a line of stakes driven into the ground, close together, with brushwood woven between them: somebody holding the firm ground's edge against the fen. The fen is winning. Half the stakes are leaning outward into the water.",
  },
  "the-open-water": {
    "water|lake|reed|way":
      "Under the water the way is a line of flat stones, pale against the dark mud, and you can see them if the light is right. Some have been moved. At the far side a pole stands up out of the water with a rag on it, to aim for.",
  },
  "the-seep-edge": {
    "seep|slope|floor|trees":
      "The floor at the slope's foot is moss over wet black soil, and it holds every print: deer, fox, and the trodden line of the path. The seep ahead makes a sound like slow breathing. The trees here have ferns growing in their forks.",
  },
  "the-thorn-lane": {
    "blackthorn|thorn|thorns|lane|tunnel|wool":
      "The wool on the thorns is in clumps, and all of it is at the height of a sheep's back, grey and felted and very old. Higher up, at a man's shoulder, the thorns are broken off short along the whole lane, where people pushed through and snapped them.",
  },
  "the-sunken-drove": {
    "drove|channel|banks|bank":
      "The banks are polished smooth at the height of a beast's flank and the polish is greasy with old wool fat. Your hands come away smelling of sheep. At the bottom the stones are worn into a single narrow trough down the middle.",
  },
  "the-tinkers-camp": {
    "rings|fires|ground|scraps|metal|awl|tang|verge":
      "The scraps trodden into the turf are bright where your boot scuffs them: copper clippings, the end of a broken rivet, a solder drip. The fire rings are each built of the same kind of stone, carried here. Somebody came back to the same spot every year and pitched in the same places.",
  },
  "the-heron-stand": {
    "spit|gravel|herons|bones|lime":
      "The bones on the spit are fish and frog and the tiny skulls of water voles, crusted white with lime. The herons stand on one leg on the cleanest stones. Between the stones there are pellets, grey and full of bones, coughed up and left.",
  },
  "the-quaking-flat": {
    "flat|raft|moss|root|ground|water":
      "Kneel and press and the water comes up through the moss round your hand, cold and brown. There is a hole in the raft a few strides off, round, where something went through and the moss has not yet closed. The water in it is black.",
  },
  "the-ditch-end": {
    "ditch|revetting|plank|walk|boards":
      "The revetting where it gives up is a row of rotten stakes with brushwood woven between, sagging outward. The plank walk's boards are pegged to cross-pieces, and the pegs are replaced with new wood in several places. Under the green slime the boards are sound.",
  },
  "the-peat-road": {
    "road|ruts|brushwood|spoil|peat":
      "The road's surface is crumbled peat, black and springy, and the ruts in it are wide-set for a big-wheeled cart. Along the edges there are broken peats, dropped off the loads and never picked up, gone hard and grey.",
  },
  "the-peat-cuts": {
    "cuts|pits|turf-banks|banks|peat|oak|bog oak":
      "The walls of the cuts are marked with the long strokes of a peat spade, every stroke the same width. On the drying banks a few peats are still stacked in little pyramids, gone grey and hard as wood. A length of black bog oak lies beside the nearest pit, dragged out and left.",
  },
  "the-west-brow": {
    "brow|tops|wood|crowns|track":
      "At the brow the track is worn into a deep notch where everything goes over the edge. The rock at its lip is scored with long marks, from sledges or carts let down here with a brake. Below, the crowns of the wood are a single green roof.",
  },
  "the-brow-path": {
    "track|path|turns|slope":
      "Each turn of the path is worn wide on the outside where feet and hooves swung round. Between the turns, there are shortcuts straight down the slope, worn by animals and by people in a hurry, and the shortcuts are eroding into gullies.",
  },
  "the-scree-turn": {
    "scree|stone|path|slope":
      "The path across the scree is a line of flatter stones, chosen and kicked into place by many feet, and a few have been set on purpose and wedged. Above the path the scree is pale and new. Below it, the stones are lichened, and old.",
  },
  "the-bracken-hillside": {
    "bracken|hill|path|trough":
      "The trough through the bracken is floored with last year's fronds, flattened and brown. At intervals there are side-paths, low, going off into the bracken at knee height. The fronds round their mouths are broken and bent the same way.",
  },
  "the-first-oaks": {
    "oaks|trees|roots|litter|slope":
      "The oaks lean away from the hill, their crowns combed back by the wind, and their roots grip the slope in great knuckles over the stones. Under them the leaf litter is deep and dry. A hollow under the biggest root is lined with leaves and fur.",
  },
  "the-wood-bank": {
    "bank|ditch|wood|place":
      "The bank was faced with stones on the hill side, and some of the facing is still there, mossed and leaning. The low place where it fell is worn to bare earth by the path and by everything else, and the ditch below it has been trodden into a slope.",
  },
  "the-hanger": {
    "trees|roots|slope|steps|wood|path":
      "The root steps are worn bare and polished where feet have used them, and the soil between them has washed away to stones. The trees lean outward over the drop at the same angle, all of them, and their trunks have curved back up toward the light.",
  },
  "the-holly-scarp": {
    "holly|scarp|rock|step|cut|leaves":
      "The cut through the holly is clean-sided, the stems sliced off with a blade at the edges. It has been kept. Some of the cut ends are old and grey, some fresh and still pale. The rock step underneath is worn into two footholds.",
  },
  "the-spring-line-oaks": {
    "oaks|seeps|water|floor|trees":
      "Each seep comes out from under a root or a stone, clear, and runs off in a little channel lined with bright green moss. The oaks here are tall and straight and smooth. At one seep somebody has set a flat stone across the channel to stand on while drinking.",
  },
  "the-wet-margin": {
    "margin|mud|moss|water|alders|willow|path":
      "The firm line through the margin is marked by stones pushed into the mud, some flat and some not, and by branches laid across the worst places. The branches are of different ages. One fresh one has bark still on it.",
  },
  "the-plank-bridge": {
    "planks|bridge|beck|footings|pins":
      "The pins through the planks are iron, rusted, and two have been replaced with wooden pegs. The stone footings are good work, better than the planks, cut and bedded. Downstream you can see where the proud bridge stood: two abutments and nothing between.",
  },
  "the-drovers-stance": {
    "stance|turf|wall|trough|rings|fires":
      "The trough is cut from a single stone and the spring runs into it through a groove in its lip, worn smooth. The fire rings are at the far end, downwind of the beasts, every one built in the lee of the wall. The turf where the beasts stood is darker and thicker.",
  },
  "the-beggars-hollow": {
    "hollow|scoop|face|fires|ground":
      "The back of the hollow is black with soot laid on in layers, and at the height of a sitting man's head the soot is rubbed off in a smooth patch. There are scratched marks on the rock beside it, strokes and a few letters. The ground is littered with small bones and charcoal.",
  },
  "the-boundary-dyke": {
    "dyke|bank|ditch":
      "The bank is grassed over and rounded with age, and here and there along it a stone has been set upright on top, every few hundred paces, one after the other. On the downhill side the ditch has filled to a shallow green line you can still follow by eye.",
  },
  "the-spoil-banks": {
    "banks|spoil|waste|thorn|rabbits|track":
      "The rabbit holes in the banks spill fresh pale grit, quarry waste, sharp chips of stone that never saw a chisel. Near one hole there is a scatter of fur and a bloodied scrape where something dug in after them.",
  },
  "the-drowned-milestone": {
    "milestone|stone|names|water":
      "The names above the waterline are scratched shallow, and some are scratched over older names. At the waterline the stone has gone soft and a fingernail sinks into it. Below, under the water, the face is smooth and blank, the letters all gone back to stone.",
  },
  "the-rain-shadow": {
    "sand|road|gorse|grass|ridge":
      "The sand on the road is fine and pale and rippled by wind. Under it, if you brush it away, the road's stones are there, still laid. The gorse here is low and bent, and its roots have gone down between the road's stones to find water.",
  },
  "the-shepherds-ruin": {
    "hut|walls|fireplace|doorway|stones":
      "The fireplace's back is a single slab, cracked across by heat and blackened, and in front of it the floor is worn into a hollow by a lifetime of a stool's legs. In a crack in the wall at shoulder height there is a hook of bent iron, for a lamp or a coat.",
  },
  "the-haul-road": {
    "road|ruts|grit|track":
      "The ruts are worn by sledge runners, not wheels: two smooth flat grooves, wider than a wheel's. The pale grit in them is quarry dust washed down from above. Your print in it is the only one, sharp-edged, among the prints of birds.",
  },
  "the-mustering-yard": {
    "yard|apron|hardstanding|walls|gateposts|ruts":
      "The hardstanding is laid in rows, and along the back wall the stones are worn into a long shallow trough where men stood in a line, a great many times. Iron rings are leaded into the wall at the height of a horse's head, every few strides. The gateposts are scored where wheels clipped them.",
  },
  "the-sheepwalk": {
    "grass|moss|folds|ring-marks|track|brow":
      "The ring-marks are the footings of folds, circles of stones sunk into the turf with greener grass inside. The grass is cropped short, and the droppings on it are fresh. The track along the brow is worn by feet, and by narrow hooves going the other way.",
  },
  "the-roadwarden-post": {
    "house|post|hatch|yard|door|bars":
      "The bars on the hatch are worn bright where hands have reached through them. Cut into the door's stone frame there is a row of short marks, many, some old and filled with lichen and some clean. The yard behind is swept, and the wall round it has been mended with newer stone.",
  },
  "the-tops": {
    "tops|grass|hill|track":
      "The grass is short and thick and full of tiny flowers, and the wind combs it flat in long waves you can watch going over. The track across it is a faint line worn by feet. Here and there a lark goes up from right under your boot.",
  },
  "the-sheep-scrape": {
    "scrape|hollow|bank|cave|hair":
      "The hair in the scrape is coarse and brown and much longer than wool. The bank's back is rubbed smooth and greasy at the height of a big shoulder. The old sheep-smell is still in the dust underneath, but the new smell over it is sharper.",
  },
  "the-bent-thorn": {
    "thorn|hawthorn|trunk|crown":
      "The polished patch on the trunk is at the height of a cow's flank, and the bark there is gone and the wood under it is smooth and dark. Tufts of hair and wool hang in the lower branches. In the lee of the trunk the grass is trodden to a bare patch.",
  },
  "the-stony-rise": {
    "stones|track|walls|turf|tracks":
      "The stones breaking through the turf are pale, frost-split and lichened, and the track picks its way between them where the ground is softest. A fallen wall's stones lie in a long line in the grass. The sheep tracks thread off between the stones and fade.",
  },
  "the-cattle-stance": {
    "stance|enclosure|wall|gateway|grass":
      "Along the inside of the wall on its windward side, the ground is hollowed in a row of shallow scoops where men lay against it, and there are the black marks of small fires. The grass inside is dark and coarse. The gateway's posts are polished by flanks.",
  },
  "the-high-lane": {
    "lane|walls|road|tops":
      "The walls here were built by the same hands as the lower ones, the same lean, the same capstones, but the capstones are more often fallen. Some of the stones in them are worked: a carved block, a piece of a doorframe, carried up from below and built in.",
  },
  "the-wall-end": {
    "wall|walls|stones|hill":
      "The tumble is a wall's whole end fallen outward in one piece, the stones lying in the order they stood. The walls behind are lichened in grey and orange rings. One stone at the end has a hole worn through it, where a gate's hinge pin turned.",
  },
  "the-blackthorn-lane": {
    "blackthorn|sloes|thorns|lane":
      "The sloes are dusty blue and bitter, and most of them below shoulder height have been picked or eaten. The thorns at sleeve height are hung with threads of cloth, many colours, from everybody who came through.",
  },
  "the-steep-pitch": {
    "lane|stone|steps|banks|hedges":
      "The steps in the bare stone are worn into hollows, each one the size of a hoof, and the hollows hold water. Down one side a groove is worn where wheels or sledges came down braked. The hedge banks are lower here and stony.",
  },
  "the-drovers-spring": {
    "spring|trough|lip|stone|cress|water":
      "The lip is a single stone cut into a spout, and the spout is worn smooth by water and by muzzles. The trough is old, its corners rounded off. Cut into its rim, small and neat, there are initials and a mark like a pair of horns.",
  },
  "the-holly-bank": {
    "holly|bank|wool|leaves|lane":
      "The holly's lowest leaves are browsed off in a level line, the height of a deer's reach. The wool caught in them is grey and felted. The lane's floor on the far side is worn down into a groove, where everything leaned away from the holly.",
  },
  "the-hedge-gap": {
    "gap|posts|gate|hedge|field|thorn|thistle":
      "The posts are oak and their hinge holes are empty and rusted round. The gap is trodden into a bare path through the thorn and thistle, and the thorn's branches at the sides are broken back at the height of a beast's shoulder.",
  },
  "the-hollow-lane": {
    "lane|banks|hedges|trench|roots|mud|prints":
      "The mud in the bottom has prints of every age in it, the oldest only dents, the newest crisp. Badger and deer and boot. The roots in the walls are polished where hands have grabbed them going up the slippery part.",
  },
  "the-drove-mouth": {
    "lane|drove|stone|corner|banks":
      "The stone at the corner is polished smooth and greasy on its lane side, a long shine at the height of a cow's flank. The lane's floor is worn below the fields in a single deep curve. Cut into the corner stone, near the top, is a mark like a pair of horns.",
  },
  "the-weed-paving": {
    "paving|stones|road|courses|weed|dock|nettle":
      "The holes where stones were lifted are clean-edged, and some still have the bedding sand at the bottom, untouched. The lifting was careful: whoever took them knew how the road was laid. The creeping weed has pushed one course up by a finger.",
  },
  "the-third-milestone": {
    "milestone|stone|face|verge":
      "Lean round to read it and the face is cut with the same square letters as the others, but the verge has grown up over the number. The back of the stone, the side that faces the road now, has been scratched with names and marks by people who could not see the front.",
  },
  "the-hollow-elm": {
    "elm|tree|ash|hollow":
      "The ash in the bottom is grey and fine and layered, many small fires. The inside walls are blackened to above head height and the wood there is charred in shallow scales. Somebody cut a shelf into the inside of the trunk, and a stub of candle is stuck to it.",
  },
  "the-crooked-mile": {
    "paving|kink|bends|road":
      "In the crook of the second bend there is a ring of stones in the verge, sunk and overgrown, the footing of something round. A tree, or a well, or a cross. It is gone, and the road still goes round the place where it stood.",
  },
  "the-culvert": {
    "culvert|arch|brick|drain|parapet|water|bank":
      "The bricks of the arch are narrow and hard and laid in neat rings, and the underside is whiskered with little white drips of lime. A path is worn down the bank to the water's edge. Under the arch, out of the rain, the ground is dry and trodden.",
  },
  "the-fen-gut": {
    "gut|water|peat|bank|fen":
      "The water is warm to the hand and leaves a faint oily shine on the skin. The peat bank alongside is trodden into a path and printed with feet going both ways. Where the gut bends, a crust of white scum has dried along its edge.",
  },
  "the-smithy-ruin": {
    "smithy|forge|walls|floor|scale|cinders":
      "The forge's mouth still has its iron bars, warped and rusted through. The floor is a hard black crust and among the scale there are nails, a horseshoe, half a hinge, all dropped and trodden in. A ring is leaded into the wall outside, worn bright by halters.",
  },
  "the-wind-row": {
    "thorns|hedge|row|wind":
      "The thorns were planted in two staggered lines, so the gaps in one are covered by the other. Their trunks lean south together at the same angle. Under them, on the road, the stones are dry when the rest of the road is wet.",
  },
  "the-burnt-farmstead": {
    "farmstead|holding|gable|gables|hearth|doorstep|wall":
      "The fire took the roof first: the charred ends of the rafters are still caught in the gable sockets. The burn marks are heaviest on the outside of the walls, low down, where it was set. The doorstep is worn hollow and has a crack across it from the heat.",
  },
  "the-pinfold": {
    "pinfold|pound|gate|walls|wall|nettles":
      "The iron gate hangs from its one pin by a hinge worn to a thin ring. Its bars are bent outward in the middle, pushed from inside. The nettles inside are thick and dark, growing on old dung. The wall's top course has a line of stones set on edge, to stop things jumping it.",
  },
  "the-open-heath": {
    "heath|ling|sand|water|hollows|road":
      "The ling is short and wiry and grows in clumps with bare sand between, and the sand is printed with small birds' feet and the long thin line of something that slithers. The road's stones run straight across the heath, half drowned in the hollows.",
  },
  "the-second-milestone": {
    "milestone|face|distance|stone|grass":
      "The scratches over the number are crossings-out and corrections: somebody scratched a different number beside it, somebody else crossed theirs out. The stone's top is worn smooth where people sat. The grass around it has never been cut.",
  },
  "the-long-straight": {
    "road|straight":
      "The kerbs along the straight are set exactly, the line of them true for as far as you can see, and the road's crown is still there, a gentle hump. Every few hundred strides there is a stone in the verge with a notch cut in it, for the instrument that laid it out.",
  },
  "the-ash-verge": {
    "ash|trees|verge|shadows":
      "The ashes were planted the same distance apart to within a hand. The dieback has left their crowns grey and bare. At the foot of every third tree there is a small stone set in the ground, flush, with a number cut in it.",
  },
  "the-elder-hedge": {
    "hedge|elder|blackthorn|boundary":
      "Inside the hedge you can still see the old laid stems, bent over and pinned, grown on into crooked trunks a hand thick. The elder has come up through them and over them. The elder's berries are stripped from the road side and left on the far side.",
  },
  "the-sunken-lane": {
    "lane|banks|roots|road":
      "The roots hanging out of the banks are polished where shoulders have rubbed against them. In one bank somebody cut a little niche, a hand deep, and set a flat stone in it for a shelf. There is nothing on the shelf.",
  },
  "the-drovers-turn": {
    "turn|bend|mud|hooves|road|ground":
      "The hard grey mud is pocked with hoof-prints set in it like stone, and the prints are all cloven and all old, a whole herd's passing preserved. The bend is so wide that its inner edge is a separate verge of grass, and on it there are the black rings of old fires.",
  },
  "the-broken-paving": {
    "paving|stones|roadbed|courses|grass|seams":
      "Each stone tilts a little differently, lifted by ice in its bed and set down again crooked. The grass in the seams is short and tough. Stamp on one stone and the one beside it rocks.",
  },
  "the-cart-road": {
    "road|stone|herringbone|groove":
      "The herringbone is laid so that each stone locks the next, and none of them has moved. The groove down the middle is polished smooth by iron tyres and holds a thin line of water. On the verge there is a stone post with a ring for tying a horse.",
  },
  "the-postern-ditch": {
    "ditch|revetting|wall|leaf-rot":
      "Where the revetting stops, its last plank is still pegged in place and the next plank lies in the ditch beside it, never set. Under the leaf-rot the ditch's floor is laid stone, slick and green. Along the wall's foot the mortar is stained dark to the height of the water.",
  },
  "the-drain-mouth": {
    "arch|drain|mouth|ditch|water|stream":
      "The arch's stones are slimed green on the inside and dry and grey outside, and the line between is sharp. At the foot of the arch there is a heap of silt and broken pottery and bones, carried out over years and dropped where the water slowed.",
  },
  "the-grave-drain": {
    "drain|channel|stone|pit":
      "The channel's sides are lined with flat stones set on edge and capped with slabs, and the slabs are blackened underneath. The floor is a smooth trough of silt. At the top end, where it leaves the pit, there is a grating of iron bars, rusted, one of them missing.",
  },
  "the-postern-carr": {
    "alder|alders|carr|stems|mud|boots|ground":
      "The boot prints in the mud are a man's, nailed, and they go one way only, out. They are old, softened at the edges, but the mud remembers them as it said. Between the stems, at shin height, there is a thread of cloth caught on a snapped twig.",
  },
  "the-grave-verge": {
    "line|grass|track|verge|pits":
      "On the fortress side of the line the grass is dark and coarse and grows over long low humps. On the far side it is thin and grey and lies flat. The hoof-cut track along the edge is worn down into a groove, and the ruts in it are cut by cloven feet and iron wheels.",
  },
  "the-thorn-gap": {
    "gap|thorn|paving|scar-wood|ends":
      "The healed cut ends are thick knobs of grey scar-wood, all at the same height and angle, cut with downward strokes by somebody coming from the east. Between the thorns the paving is clean and dressed, and on its stones there is not a single footprint, only leaf-litter.",
  },
  "the-stepping-stones": {
    "stones|slabs|beck|water":
      "Each slab is worn into a shallow dish on top where feet have landed. The two that shifted have been set back on their beds by somebody, crooked but firm. On the upstream face of each stone the weed streams out long and green.",
  },
  "the-sheep-creep": {
    "creep|gap|banks|bedrock|stone":
      "The bedrock in the creep is polished into a single smooth trough, and the banks on either side are worn into a slick greasy band at the height of a fleece. On the top of one bank a flat stone is set where a man sat to count, worn into a hollow.",
  },
  "the-east-paving": {
    "paving|stones|road|channel|verge|flint":
      "Lift the corner of a loose sod at the verge and the drain channel is lined with cut stone and still clear. The paving stones each carry a small mason's mark on their edge, the same mark. At the very end of the good stretch one stone is set but not grouted, and the grout bucket's ring is still printed in the verge.",
  },
  "the-withy-beds": {
    "withy|willow|stools|stool|rods|beds|thicket":
      "Each stool has a ring of old cut stumps at its base, and the stumps are all cut at the same height with one clean slant. One stool has a bundle of rods tied with withy still leaning against it, cut and never carried off, gone grey.",
  },
  "the-first-fold": {
    "fold|walls|wall|gap|wool|joints":
      "The gap in the fold has two upright stones for posts, grooved down their inside faces for a hurdle that slid in. The wool in the joints is grey and felted. Inside, along the foot of the windward wall, the ground is worn into a long hollow where the flock packed in.",
  },
  "the-toll-stone": {
    "stone|slot|schedule|charges|block|rates":
      "The slot is worn smooth at its lip from coins dropped in. The schedule's letters are cut deep and painted once, and a little red still hangs on in the bottoms of the letters. Somebody has scratched a line through the last rate and nothing beside it.",
  },
  "the-trap-line": {
    "traps|trap|weir|stakes|withies|frames":
      "The two spoiled traps are torn open from outside, the withies pulled apart and bitten through. Fish scales lie on the bank beside them. The weir's stakes are driven in a curve that guides the water into the traps' mouths, and the curve is still true.",
  },
  "the-drove-green": {
    "lane|grass|hedge-banks|banks|hedges":
      "The hedge-banks are faced with stone on the lane side and earth on the field side, so a beast could not climb them out of the lane. The grass in the lane is shorter in a wide strip down the middle, where the herds walked. Old fire rings sit in the lee of the banks every so often.",
  },
  "the-road-kiln": {
    "kiln|mouth|throat|charge|bank":
      "The plug of burnt lime in the kiln's belly has cracked across its top, and the cracks are white and powdery. The draw-hole at the bottom is still bricked up. On the bank above, at the loading mouth, a heap of unburnt limestone lies where it was tipped, waiting.",
  },
  "the-hollow-way": {
    "banks|revetting|stone|stonework|ivy|joints|road":
      "The revetting stones carry a mason's mark on their faces, small, and it is a mark you have seen on the fortress's own walls. The ivy's roots have got into the joints and pushed some stones out a finger's width. The courses behind the ivy are still true.",
  },
  "the-mill-loft": {
    "loft|floor|beam|hoist|slot|sacking|ladder":
      "The sacking in the corner is folded into a bed and the dust round it is swept back. The hoist beam has a groove worn round it where the rope ran. Through the slot in the floor the water below shows dark, and the sound of it comes up through the boards.",
  },
  "the-mill-leat": {
    "leat|channel|beck|stone":
      "The leat's stone sides are fitted without a gap and its floor slopes so gently you cannot see it slope, only that the water moves. At the head there is a sluice slot cut in the stone for a board that is long gone. The natural stream below it is louder and rougher.",
  },
  "the-oak-hollow": {
    "oak|kindling|wood|split|curve":
      "The kindling is stacked in a neat pile, small sticks on top and bigger below, the way a person stacks it who intends to come back. The inside of the oak is charred at the bottom from fires laid before. The split's edges are worn smooth by people squeezing in.",
  },
  "the-hollow-oak": {
    "oak|opening|rim|marks|leaves|floor|tree":
      "The marks on the rim are cut deep and overgrown with bark, so they stand out as raised scars: initials, horns, a little cross. Some are cut inside older marks. The floor inside is flat and dry and swept clean of the leaves that drift in.",
  },
  "the-fifth-milestone": {
    "milestone|pillar|face|stone":
      "The FIVE is cut deep and sharp because the stone here is harder than the stone of the western ones. Below the distance there is a small mark, a mason's, that is also on the hollow way's revetting. Nobody has scratched a name on this one, which is the only one of them unmarked.",
  },
  "the-drowned-mill": {
    "mill|wheel|axle|millstones|stones|pool|water|race":
      "The dressing on the flat millstone is a pattern of straight grooves, cut sharp, and the stone has barely been worn. It was dressed fresh not long before the mill stopped. The wheel's buckets are full of silt and growing weed.",
  },
  "the-drovers-cairn": {
    "cairn|stones|heap":
      "The stones on the cairn are of every kind, some from far away, pale and dark, round from rivers and sharp from the hill. Some have marks scratched on them. The newest ones on top are clean. The bottom ones have sunk and the grass has come up round them.",
  },
  "the-carters-rest": {
    "shelter|hearth|ash|walls|roof|slabs":
      "The layered ash in the hearth has bands of different colours, different fires, different woods. The roof slabs are blackened above it. On the back wall there is a row of iron hooks, rusted, for harness, and a cart's spoke is propped in the corner.",
  },
  "the-millpond": {
    "pond|millpond|water|dam|bank":
      "Along the bank the reeds are cut back in one place to a flat stone set at the water's edge, worn smooth by somebody kneeling on it. The water is clear for a stride out and then goes green-black. A line of old stakes stands in the shallows where a fence once kept stock off the dam.",
  },
  "the-wether-slope": {
    "lynchets|terraces|pasture|gorse|hillside|slope":
      "Each lynchet's front is a little bank of earth with stones in it, the stones the plough turned up and somebody threw to the edge. The steps are even, every one about the same width. Gorse has taken the steepest fronts. Sheep tracks run along the flats.",
  },
  "the-broken-culvert": {
    "culvert|arch|stone|paving|subsidence|hole|road":
      "Kneel at the edge of the hole and you can see into the arch, and the dropped stone lies in the water at the bottom, with brick round the gap it left. The paving round the hole has cracked in rings. The water lying on the low side has a skin of dust on it.",
  },
  "the-dam-walk": {
    "dam|path|sluice|rack|pinion|turf":
      "The rack and pinion are iron, and the pinion's teeth are rusted to the rack in a single block. The handle that turned it is still on, and it has a smooth patch on its grip. The wheel-marks on the dam are old and mossed, two thin grooves in the turf.",
  },
  "the-broken-fold": {
    "fold|wall|walls|stones|gap|grass":
      "The fallen stones lie in a fan pointing away from the fold, every one pushed outward, and some are cracked across. On the inside face of the wall's broken ends there are long scrapes, pale, at a height above a man's shoulder. The grass in the gap is trodden into a path.",
  },
  "the-elm-avenue": {
    "elms|elm|avenue|verges|tunnel":
      "The standing elms are evenly spaced and the fallen ones lie at the same intervals, so you can count the avenue by its gaps. Their trunks are scarred at axle height on the road side, where carts brushed past. The light comes through the canopy in shifting coins on the paving.",
  },
  "the-fallen-avenue": {
    "elms|trunks|pool|avenue|drainage":
      "The three trunks lie parallel, all pointing the same way, felled by the same wind. Under the pool's water you can see the drain they blocked: a stone channel along the verge, still clean where the water runs. The trunks are soft and full of holes, and things live in them.",
  },
  "the-tail-race": {
    "race|channel|footbridge|planks|plank|water|beck":
      "The new plank is still pale and its bolts are bright. The old plank beside it is grey and soft and holds you anyway. The channel's walls are polished to a gloss by the water, and at the bottom, where it opens into the beck, it has dug a deep pool.",
  },
  "the-shepherds-bothy": {
    "bothy|hut|bed|hearth|shelf|roof|turf":
      "The plank bed is worn smooth along one edge where a man sat on it every night to pull his boots off. The shelf holds a cracked bowl. On the hearth-slab the soot has a cleaner patch in the shape of a pot's base, and a dog's bed of old sacking lies in the corner.",
  },
  "the-relay-house": {
    "house|hatch|lamp|stable|stalls|yard|stalls":
      "The stalls each have a ring in the wall, worn bright, and a name painted on a board above, too faded to read but for a letter or two. The stable floor is swept and the straw is fresh. The lamp over the hatch has a clean glass.",
  },
  "the-osier-island": {
    "island|gravel|willow|ring|ash|fire":
      "The fire ring's stones are stacked neatly in a little dry heap, the way somebody packs up a fire they mean to use again. The willows round it have been cut for kindling, and the cuts are healed over. The gravel is printed with heron feet and nothing else.",
  },
  "the-bothy-spring": {
    "spring|basin|gravel|water|thread":
      "The gravel in the basin moves where the water comes up through it, little grains rising and settling. Somebody laid a ring of stones round the basin's edge to keep the mud out, and set a flat one on the downhill side to kneel on.",
  },
  "the-weighbridge": {
    "plate|iron|weighbridge|slot|beam|pit|mechanism":
      "The plate is cast with a pattern of raised squares for grip, worn flat in two broad stripes where wheels crossed. Peer down the slot and the beam is there under the water, its brass fittings green. Cut into the plate's edge are a number and a mark.",
  },
  "the-flood-mead": {
    "meadow|channels|scars|grass|water":
      "The flood channels have little stone sluices at their heads, the boards long gone, the grooves still clean. The grass is tall and full of meadow flowers and seed heads, and paths run through it at knee height where deer have pushed through.",
  },
  "the-high-gorse": {
    "gorse|brake|lane|corridor|needles|stems":
      "The black stems underneath are as thick as a wrist and twisted, very old. The corridor through is cut, not worn: the stems at its edges were lopped with a blade, long ago, and the gorse has not yet closed it. The flowers are humming with bees.",
  },
  "the-thorn-drop": {
    "thorn|stone|path|switchbacks|track|hillside":
      "Each switchback has a stone wedged at the outside of the turn, put there by somebody to stop feet sliding off. The thorn on the drop side is broken back at hand height, where people grabbed it. The loose stone below the path is fresh and pale.",
  },
  "the-cut-bank": {
    "cut|chalk|faces|flint|rooks|ledges|spoil-heap|heap":
      "The chalk faces are marked with long pick-strokes, every stroke slanting the same way, the men all right-handed. The flints in the courses stand out like knuckles where the chalk has weathered back. The rooks' ledges are whitened and the ground beneath is littered with twigs.",
  },
  "the-cattle-drink": {
    "bank|mud|prints|hoof|water":
      "The prints that are not hoof are pads, broad, with the claws showing, and they come down to the water and go back up in the same line, without stopping to drink. The hoof-prints round them are scattered, as if the herd broke and ran.",
  },
  "the-burnt-brake": {
    "brake|gorse|stems|ground|shoots|burn|edge":
      "The black stems snap like charcoal and smear your hands. The green shoots are coming up from the old roots in tufts. At the burn's ragged edge the gorse is scorched yellow on one side only, and there is a heap of cut branches that was meant to stop the fire and did not.",
  },
  "the-sixth-milestone": {
    "milestone|tally|scratches|pillar":
      "The tally is cut with the same narrow point all the way round, and the strokes are even, every fifth one across the four. Where the tally starts again on its second circuit, the strokes are shallower and a little shakier. It stops in the middle of a group of five.",
  },
  "the-marl-hole": {
    "hole|pit|clay|marl|water|sides":
      "The clay sides are grooved with the strokes of the spades that dug it, gone soft and smoothed by rain. At the bottom of the near side there are long slide-marks going into the water, and claw-marks going up the clay that do not reach the top.",
  },
  "the-marker-stone": {
    "stone|marker|cross|base":
      "The cross at the base is cut neatly and fresh, the stone pale in the grooves. Higher up, the old stone has other marks under the lichen, worn very faint: cup-shaped hollows, a ring round one of them. The drove's path bends round the stone in a deep groove.",
  },
  "the-beck-mouth": {
    "beck|gulley|ford|paving":
      "The gulley's stones are wet and moss-green and the beck comes down them in a hundred little falls. Where it reaches the valley floor it has spread a fan of grey gravel. Up the gulley a little way a stick is jammed between two rocks, left by a flood.",
  },
  "the-hatchpool": {
    "pool|hatch|stonework|water|bank":
      "The hatch's stone frame has two grooves for the board, and the board is gone. The dressed stones carry the same small mason's mark as the road's kerbs. On a flat stone at the pool's edge there are fish bones and scales, and a heron's grey feather.",
  },
  "the-high-common": {
    "common|grazing|wind":
      "The turf is short and full of tiny thyme, and the smell comes up when you step on it. There is no wall and no tree, but there are old fire-rings here and there, low and black in the grass, where people stopped to cook in the open. Every one is on the lee side of a stone.",
  },
  "the-fallen-elm": {
    "elm|slice|halves|heartwood|rings|trunk":
      "The cut faces are sawn, flat, two men on a long saw, and the saw-marks are still there under the grey. Count the rings and the tree was young when the road was new. The beetle galleries run through the heartwood in branching tunnels like writing.",
  },
  "the-plank-crossing": {
    "planks|abutments|beck|bolts":
      "The abutments are cut stone with old bolt-holes in them at four different heights, one set for each bridge that was here before. The planks are elm, bolted with iron, and they bow a finger's depth in the middle when you stand on them. The beck below is fast and clear.",
  },
  "the-lapwing-flat": {
    "flat|saucer|rushes|water|birds|ground":
      "The open ground has scrapes in it, shallow hollows with a few dry grass stems in them and eggs the colour of the mud. The birds that went up are circling low and calling. In the soft ground round the water there is a line of fox prints that goes straight through the nesting ground.",
  },
  "the-verge-shrine": {
    "shrine|niche|shelf|button|tooth|coin|wall":
      "The dip in the shelf is worn smooth by hands setting things down and taking them up. The coin is worn so smooth you can see the light through its edge. Behind the scatter, at the back of the niche, the stone is blackened by a small flame, a candle or a lamp, burned there a great many times.",
  },
  "the-hanging-wood": {
    "wood|ash|yew|beck|cleft":
      "The yews' roots grip the rock in red snakes, their bark peeling in thin strips. The beck below is loud and white. On the steepest parts the trees lean out over the water, and one has fallen and lies across the cleft, mossed over, high above the stream.",
  },
  "the-common-boundary": {
    "boundary|bank|ditch|gap|drove":
      "The bank is low and wide, grassed and softened by age, and it runs straight to the horizon both ways. The gap where the drove goes through is worn bare and down into a groove. Every few hundred strides a boundary stone stands in the bank, leaning, its face gone soft with lichen.",
  },
  "the-long-rise": {
    "road|rise|tilt":
      "The road's camber is still good here and the drains along it still carry water. Every so often there is a flat stone set into the verge, a mounting stone, where riders who had walked their horse up the rise got back on. The stones are worn in the middle.",
  },
  "the-force": {
    "force|fall|pool|rock|moss|spray":
      "The pool at the foot is black and round and turning, and its edges are polished smooth. The moss in the spray is so thick and bright it looks lit from inside. On a ledge at the fall's side, out of the spray, there is a scatter of fish bones and a grey feather.",
  },
  "the-wind-scoured-ridge": {
    "ridge|lane|turf|stone|spine":
      "The exposed stone is polished on its east faces and rough on its west, every rock along the ridge the same. The turf is cropped so tight and wind-pressed that it feels like felt. Where the lane crosses a bare stone, the stone is worn into a shallow dish by feet.",
  },
  "the-chalk-cut": {
    "cut|chalk|walls|road":
      "The chalk walls are scored with pick marks and with the names of people scratched into the soft white, hundreds, some old and blurred by rain and some sharp. Rooks have nested in the ledges. The road at the bottom is dusted white.",
  },
  "the-scree-run": {
    "scree|stone|fan|beck|paving|scarp":
      "The stones of the fan are sharp and pale near the top and darker and settled at the bottom, where the beck has cut a clean channel through them. The edge you climb up is trodden into a faint path, the stones kicked flat.",
  },
  "the-fall-shelter": {
    "shelf|rock|wall|tallies|fall":
      "The tallies on the back wall are strokes in fives, in columns, and the columns are in different hands, some neat and some rough. A few have names beside them. The shelf's floor is dry and worn smooth where people sat with their backs to the wall.",
  },
  "the-hanging-fold": {
    "fold|wall|shelf|drop":
      "The wall along the drop is capped with long flat stones set on edge, every one leaning the same way, and its face is fitted so tight a knife will not go between the stones. The other walls are rougher. The ground inside is greener than the shelf around it.",
  },
  "the-seventh-milestone": {
    "milestone|pillar|road|ground":
      "The ground round the pillar's foot is cracked in rings, and on its uphill side the turf is torn and bunched against it. The number SEVEN is still crisp. The road it points at is now three strides away, and between them the turf has slid, carrying the old verge with it.",
  },
  "the-otter-holt": {
    "holt|bank|alder|roots|slide|mud|heads":
      "The fish heads lie in a little heap on a flat stone by the slide, each one bitten off behind the gills. The slide is glossy mud, polished. Under the alder roots the hole is dark and smells of fish and musk, and a spraint on the stone is full of tiny bones.",
  },
  "the-hare-ground": {
    "forms|hollows|grass|stones|ground":
      "The forms are pressed into the grass in the shape of a crouch, a hollow for the body and two dents for the forepaws. Some are warm. The stones are all about the size of an egg and lie close together, sorted by frost.",
  },
  "the-tollkeepers-ruin": {
    "ruin|toll-house|wall|hearth|gate-post|post|iron":
      "The iron in the gate-post is a heavy hinge pin and a hasp with a lock-staple, and the staple has been sawn through. The hearth is full of nettles and under them the hearthstone is cracked from the heat. A wall course has a row of square holes for the shelving inside.",
  },
  "the-gill-foot": {
    "gill|cleft|stream|stones|water|walls":
      "The stones in the stream are round and slick with brown weed, and they knock together underfoot. The walls of the gill rise straight up, mossed and dripping, and above you the sky is a narrow strip. A rotted plank is wedged across the stream at one point, high up.",
  },
  "the-fallen-dyke": {
    "wall|stones|drove|dyke":
      "The fallen stones lie in two lines either side of where the wall stood, the line of its base still showing as a strip of bare ground. The ends of the standing wall are ragged. Sheep have been through the gap so long that it is trodden into a path.",
  },
  "the-hawthorn-narrows": {
    "hawthorn|thorn|tunnel|paving":
      "The hawthorn's old trunks are black and deeply cracked, and they lean over the road from both sides and lock together overhead. The paving underneath is dry and clean. The thorns at head height are broken off short along the whole tunnel.",
  },
  "the-gill-pot": {
    "pot|pool|ledge|rock|wall":
      "The ledge on the north wall is polished smooth by feet and slightly dished in the middle, and above it, at hand height, the wall is worn into a single dark smear where everyone steadies themselves. The pot's water turns slowly. Its edges are undercut.",
  },
  "the-drove-head": {
    "funnel|hurdles|mounting block|block|slot|bank|gate":
      "The hurdle lines in the turf are rows of small square holes, still sharp. The mounting block is three steps of stone, the top one worn hollow. The slot where the gate hung has a hinge-pin rusted into its upright, and the gate is gone.",
  },
  "the-drove-pound": {
    "pound|trough|pipe|wall|walls|gate":
      "The lead pipe comes out of the bank through a stone collar and the water runs from it in a steady thread into the trough. The trough's rim is worn smooth on one side by muzzles. The gate lies in the nettles against the wall, its hinges torn.",
  },
  "the-rowan-gill": {
    "rowans|rowan|gill|berries|walls|roots":
      "The rowans' roots go down into the cracks and have split the rock, and some of the splits are wide enough to put a hand in. The berries hang in heavy bunches and are dropping into the water. Birds have been feeding: stripped stalks litter the ledges.",
  },
  "the-grid-lane": {
    "lane|banks|bank|way":
      "The banks at the bottom are higher than your head and polished at the height of a beast's flank. The floor is wet stone worn into a stair by hooves. At the top of the bank there are the stumps of a hedge that was laid once, very thick.",
  },
  "the-grid-drop": {
    "drop|banks|ground|way|stair":
      "The churned stair is worn into the clay in hoof-shaped steps, deep, each one filled with a little water. The banks are scored by flanks and by the sides of carts let down braked. The sound of the road comes up the drop before anything else does.",
  },
  "the-sunken-alders": {
    "alders|stumps|water|peat|flat":
      "The flat-cut stumps are cut with an axe, and their tops are worn smooth where feet land. The water round them is black. The dead alders are grey and hung with lichen, and woodpeckers have riddled them with holes.",
  },
  "the-open-stretch": {
    "road|embankment|stretch":
      "The embankment's sides are faced with turf on the outside and stone underneath, and the stone shows where the turf has slipped. The road on top runs dead level. Every few hundred strides a drain goes under it, a little stone mouth on either side.",
  },
  "the-gill-narrows": {
    "walls|gap|beck|jam|wood|narrows":
      "The walls in the narrows are polished smooth at shoulder height by packs and bodies squeezing through. The jam of wood above you is whole branches and part of a gate, locked solid. The water through the gap is white and loud.",
  },
  "the-saddle-gap": {
    "saddle|gap|grass|wind|road":
      "The grass lies flat and long, all pointing east. Stones on the road's verge have small drifts of grit piled on their west sides. A tattered strip of cloth is caught on a thorn at the saddle's lip, flapping east.",
  },
  "the-shepherds-ford": {
    "ford|gravel|flags|stone|water":
      "The flags in the bed are big and flat and set tight, and the water goes over them a hand deep. A few have been knocked askew and reset. On the gravel bank above the ford the ground is trodden hard by hooves, and there is wool in the thorn beside it.",
  },
  "the-eighth-milestone": {
    "milestone|face|legend|letters|stone":
      "The new legend is cut with a narrower chisel than the old, and quickly; some strokes overshoot their letters. The old face was taken back by a hand's depth to make room for it, and the dressing marks of that are rough. Its letters are the road's letters. Its words are not.",
  },
  "the-spring-line": {
    "spring|springs|threads|water|moss|slope|rock":
      "Every thread comes out of the slope at the same height, along a band of darker rock, and each has its own little fan of bright moss below it. The beck begins as all of them together. The ground is soft with water everywhere you step.",
  },
  "the-turf-road": {
    "causeway|road|brushwood|sleepers|cuts|water":
      "The sleepers are old timbers, some of them squared and tarred, some cut from ship's timber with the bolt-holes still in them. The brushwood under them is black and soft. Every few strides one sleeper has been replaced with a fresher one.",
  },
  "the-turf-stacks": {
    "stacks|peat|turf|cuttings|terraces":
      "The standing stacks are built in a herringbone, each peat leaning on the next so the wind can get through. They are dry and light and ring when knocked. Lying beside the last stack is a peat spade, its blade rusted, its handle grey and split.",
  },
  "the-peat-house": {
    "shed|house|boards|fuel|peat|stone":
      "The peats stacked inside are dry and light and a thumbnail pressed into one leaves a mark. The gaps between the boards are even, a finger wide, measured. On a nail by the door hangs a tally stick, notched along one edge, and the last notch is only half cut.",
  },
  "the-herds-hut": {
    "hut|room|bed|shelf|hearth|smoke-hole|door|turf":
      "The stone bed shelf is worn into a hollow the length of a man. Above the hearth the smoke-hole's edges are black and glossy. In the wall by the bed there is a small square niche, and in it a flat stone with lines scratched on it, a count of days.",
  },
  "the-wether-fold": {
    "fold|wall|gap|stone|ground":
      "Every stone in the wall was picked for its face and set with the face out, and the throughstones that tie both sides together stick out a little at regular heights. The gap's edges are worn smooth by fleeces. Inside, the grass is thick and dark and full of nettles at the edges.",
  },
  "the-sheep-trod": {
    "path|trod|track|turf":
      "The trod is worn down to bare soil a hand wide and a finger deep, and it is dotted all the way with small round droppings. Where it crosses a stone the stone has a polished groove. It does not deviate for anything smaller than a boulder.",
  },
  "the-scarp-spring": {
    "spring|trough|gravel|water|scarp":
      "The trough is a single block hollowed out, older than the road, its rim worn down in two places where water spills over. The gravel under the spring is clean and moves gently. Carved into the trough's end there is a ring with a dot in it, very worn.",
  },
  "the-beck-stair": {
    "steps|stair|treads|bank|tread":
      "Each tread has a mattock bite still visible at its back edge. The fourth from the top has a green skin of slime and a deep scrape mark across it where somebody's boot went. A rope's worth of wear runs down the bank beside the steps, where people held on to a line that is gone.",
  },
  "the-beck-head": {
    "spring|trough|gravel|hollow|scarp|water":
      "The trough is cut from a block of the scarp's grey stone and is half full of clear water, with a few leaves on the bottom. Its lip is worn on the downhill side. Above it, a little way up the scarp, there is a cross cut in the rock face.",
  },
  "the-deep-lane": {
    "lane|hedges|banks|roots|thorn":
      "The banks are layered like a cut cake, the old road surfaces showing one above another in thin hard bands as the lane sank through them. The thorn roots are polished at shoulder height. The floor is bare stone, worn into a shallow trough.",
  },
  "the-well-house": {
    "well|hood|vault|floor|channel|keystone|cross|tally|springhead":
      "The cross in the keystone is cut neatly and deep. The tally beside it is scratched with a nail, quick and shallow, and goes on into a second row. The channel in the floor is lined with stone so smooth the water runs over it without a ripple.",
  },
  "the-moss-path": {
    "stones|path|moss":
      "Under the moss each stone has a hollow worn in its middle by feet. The tipped ones lean the same way, toward the softest ground. One stone near the middle has been replaced: it is a different stone, darker, with no moss on it yet.",
  },
  "the-hut-yard": {
    "yard|wall|ground|path|peats|butt":
      "In the corner of the yard there is a ring in the ground where the water butt stood, the turf inside the ring yellow. A peat or two lies against the wall, dried hard. The path going east is worn as deep as the path in.",
  },
  "the-top-wall": {
    "wall|ridge|stone|stones":
      "The wall is built with the biggest stones at the bottom and every course a little narrower than the last, so it tapers. On its top every few strides there is a stone set upright, a cope. Some of the cope stones have marks scratched in them, initials, very old.",
  },
  "the-hill-gate": {
    "gate|gap|gateposts|posts|wall":
      "The gateposts have holes cut through them for a bar, and the holes are worn smooth inside. The gap's floor is worn down into a hollow and full of hoof-prints. On one post, at a man's eye height, a mark has been cut: three short lines, crossed.",
  },
  "the-spring-bank": {
    "bank|turf|water|terraces|slope":
      "The little terraces across the slope are a hoof wide and very even, and they cross the wet line in one place where the water runs over a flat stone. The turf above the seep is short and dry and the turf below is lush and full of rushes.",
  },
  "the-quarry-turn": {
    "quarry|blocks|skids|chippings|stone|road":
      "The blocks on the skids each have a mason's mark on their face, a small one, and a number in red paint, faded to rust. The skids are timber, rotted at their ends. The quarry's back wall has a block half cut free, the wedge holes drilled, and no wedges in them.",
  },
  "the-beck-lane": {
    "lane|track|hedge|passing places|bank|water":
      "The passing places are cut into the hedge in neat bays and each one is worn into a hollow by wheels backing in. Along the hedge side the hub height is scraped into the thorn. On the water side the bank has been faced with stone where carts went too close.",
  },
  "the-peat-track": {
    "track|ruts|grass|carts":
      "The ruts are deep and narrow, cut by a cart with tall thin wheels, and in the bottom of each the peat dust is still black. The strip of grass in the middle is long. Every so often there is a dropped peat in a rut, gone hard and grey.",
  },
  "the-paving-end": {
    "paving|stone|edge|course|road|track":
      "The last course is laid true and pointed, and its outer face is dressed smooth, finished, as if it were meant to be an end. In the track beyond, the pick marks are rough and the stone is undressed. The line between them is as straight as a ruler.",
  },
  "the-sledge-track": {
    "track|sledge|sleeper|beds|flush|stone":
      "The sleeper beds are shallow slots in the stone, evenly spaced, and the flush down the middle of each is polished like glass. At the top, a ring is leaded into the rock for the rope, worn thin. At the bottom the flush is scarred by something that came down fast.",
  },
  "the-winding-house": {
    "drum|house|shed|brake|lever|rope":
      "The drum's surface is grooved in a spiral where the rope wound on, the grooves worn smooth. The brake lever is iron, its handle polished bright. The floor by the lever is worn into a hollow where one man stood for a long time, and there is a stool's mark beside it.",
  },
  "the-under-scarp": {
    "scarp|track|stones|heather|rock|birch":
      "The recent stones lie on top of the heather with their undersides pale and the heather under them crushed and still green. Older stones are sunk into the heather and lichened. On the track itself there is a fresh dent where one landed and bounced.",
  },
  "the-first-hairpin": {
    "hairpin|track|revetting|rock|paving":
      "The revetting on the outside of the bend is dry stone, each stone tilted slightly into the hill so it carries the weight inward. The rock on the inside is pick-marked, every mark fresh-looking still. On the bend itself the rock floor is grooved by cart wheels turning.",
  },
  "the-fallen-crag": {
    "crag|rock|bed|grass":
      "The bed against the rock is a long oval of crushed grass, and the rock above it is rubbed smooth at the height of a lying back. Long dark hairs are caught in the rock's rough edge. The fallen crag's broken face is pale and has not yet grown lichen.",
  },
  "the-second-hairpin": {
    "hairpin|track|elbow|road":
      "At the elbow there is a flat stone at the edge, worn smooth on top, where people sat to look back. The track's floor here is grooved by wheels and by sledges let down on a rope, and the groove of the rope is worn into the rock at the inside of the turn.",
  },
  "the-heather-bench": {
    "heather|bench|shelf|track":
      "The heather is old and woody, burned in strips at some time, the strips now grown back at different heights. The track through it is pale and stony. In the heather beside it a grouse has scraped a dust bath, and there are feathers in it.",
  },
  "the-cutting-ledge": {
    "ledge|shelf|rock|drill marks|marks|face":
      "The drill marks are half-round grooves in the rock, a finger wide, each one where a hole was bored for a charge. Above the ledge the rock is cracked from the blasting. An iron ring is set in the rock at intervals along the inside, for the men's ropes.",
  },
  "the-turf-stack-ruin": {
    "mound|stack|peats|holes|heather":
      "The holes at the bottom are rabbit burrows, and fresh black peat spills out of them. Pull at the heather on top and the peats underneath are still squared, still stacked in their rows, gone soft and dark. A rusted spade-blade sticks out of one end.",
  },
  "the-third-hairpin": {
    "hairpin|revetting|track|bend":
      "Where the revetting went, the track's edge is a raw slope of earth and broken stone, and the stones of the revetting lie down the hillside in a long fan. On the inside of the bend, wheel grooves come round and then stop short of the broken edge.",
  },
  "the-raven-rock": {
    "rock|buttress|ravens|ledge|face":
      "The ledge where the ravens nest is a dark mass of sticks, and the rock under it is streaked white. At the foot of the buttress there are bones dropped from above, small ones, and a raven feather. The rock face drips steadily into a pool at its foot.",
  },
  "the-rope-post": {
    "post|ring|iron|rope|rock":
      "The ring in the post is worn thin as a wire on its inner edge, by a rope that ran through it for years. The post is leaded into a hole drilled in the rock. Far along the traverse you can see the next post standing alone with nothing between them.",
  },
  "the-moor-gate": {
    "posts|gate|hinge|iron|wall|track":
      "The hinge iron is a heavy pin rusted into the stone with a lump of lead. The other post has a hole for the latch. A line of stones in the heather either side shows where the wall ran, sunk and mossed, and the heather is a little greener along it.",
  },
  "the-shelter-stone": {
    "slab|stone|bracken|space|shelter":
      "The bracken on the floor is in layers, old brown at the bottom and less old on top, carried up by many people. The underside of the slab is blackened by small fires, and there are names scratched into the smoke, finger-drawn and knife-cut.",
  },
  "the-crag-foot": {
    "crag|rock|groove|overhang|stone|water":
      "The groove the water has cut in the stone at the bottom is a hand deep and smooth as a gutter. The overhang above is dry and the ground under it is trodden and scattered with droppings. The path along the crag's foot is worn into the stone.",
  },
  "the-beck-gully": {
    "gully|beck|rock|scarp|sides":
      "The gully's sides are scored by the beck in long smooth flutes, and moss grows thick in the shade. The path down into it is worn into steps in the rock. At the gully's head the beck comes out from under a big flat stone.",
  },
  "the-gully-steps": {
    "steps|stair|rock|roots|ferns|beck|pool|pools":
      "The roots used as steps are polished bare and slick. Each pool the beck drops into is round and clear, with a stone turning slowly at its bottom. Ferns hang over the stair so thickly that you push them aside, and they are wet.",
  },
  "the-alder-gill": {
    "alders|alder|bank|stones|beck|trunks":
      "The bank of stones under the alders is a path built up by hand, the stones set flat and close. The alders' roots run out into the water in red tangles. On the moss of one trunk there are claw-marks, fresh, going up.",
  },
  "the-gully-mouth": {
    "gully|beck|fan|stones|rushes|levels":
      "The fan of stones spreads out wide and pale and the beck threads through it in many small streams. Out on the levels the rushes start in a hard line. The air smells of salt, and there are gull feathers on the stones.",
  },
  "the-scarp-top": {
    "lip|scarp|track|moor|shelf":
      "At the lip the track's floor is worn into a hollow where everyone stops. There is a cairn of stones beside it, man-high, built by people setting one stone each. Far behind and below, the grey mark of the fortress is the only straight-edged thing in sight.",
  },
  "the-rush-levels": {
    "rush|levels|drains|grazing|ground":
      "The drains are cut straight and their sides were faced with turf once, now slumped. The rushes grow thickest along their edges. The firm line through is marked by a few stones set upright in the ground, a stride apart, half-sunk.",
  },
  "the-high-shelf": {
    "peat|cotton-grass|stones|track|shelf|water":
      "Lift the edge of one of the laid stones and its underside is dry and the peat it sits on is packed hard. The stones are long and flat and set end to end, and every one has sunk on its downhill edge. Cotton-grass nods between them.",
  },
  "the-old-drain": {
    "drain|plank|bridge|weed|reed|water|bank":
      "The plank bridge's planks are pegged to two cross-beams, and the pegs have rotted out so the planks lie loose. Kneel and the drain's sides are cut straight and faced with stakes. The water in it is brown and barely moving.",
  },
  "the-peat-cuttings": {
    "cuttings|trenches|peat|turfs|stacks|stack|moor":
      "The trench walls are marked with the long strokes of a peat spade, and every stroke is the same width. The stacks are built in herringbone and capped with a turf to keep the rain off. A peat spade lies at the end of the last trench, its blade rusted to lace.",
  },
  "the-lapwing-ground": {
    "grass|ground|plovers|lapwings|reed":
      "The open grass has shallow scrapes in it, lined with a few dry stems, and in some there are eggs the colour of the ground. The birds dive close enough that you hear their wings. At the reed's edge the ground is soft and full of prints.",
  },
  "the-boundary-cairn": {
    "cairn|stone|hollow|flat stone":
      "The hollow in the flat stone on top holds rainwater, and in it there are a few small coins, green and worn, and a ring. The cairn's stones are laid in courses, carefully. On its far side the stones have a mark scratched into them, a line with a cross through it.",
  },
  "the-cattle-causey": {
    "causeway|causey|stone|turf|water":
      "The causey's turf is trodden hard and bare down its middle, and its edges are faced with stones that have slipped outward. On the stones there are scratch marks from hooves. In the water on both sides there are sunk stones that fell off it.",
  },
  "the-watershed": {
    "runnels|ground|water|watershed":
      "The runnels on both sides start within a stride of each other, two thin threads in the turf going away in different directions. On the highest point, somebody set a stone upright, small, with a line cut across its top from one side to the other.",
  },
  "the-willow-holt-edge": {
    "willows|willow|gap|causey|reed":
      "The willows are cut back in the gap, and the cut stumps are healed over into grey knobs. Their leaves are crusted white with salt on their seaward side. The causey through the gap is worn into a shallow hollow by feet.",
  },
  "the-first-sight": {
    "water|valley|track|hill":
      "At the edge where the moor drops away, the turf is worn bare in a short strip, where everybody stops at once. Small stones have been set in a line along the lip, one on another in little stacks. There are many of them.",
  },
  "the-reed-edge": {
    "reed|causey|wall":
      "The causey going into the reed is built of brushwood and stone, and where it enters the reed the reed on either side has been cut back and kept, the stumps sharp underfoot. The cut is old. The reed is closing it slowly from both sides.",
  },
  "the-far-shore-stone": {
    "pillar|stone|bench|face":
      "The pillar's face is clean, the lichen scraped off it with a blade, and the scrape marks are fresh. The bench is a single slab on two stones, worn smooth and slightly hollow. Cut into the pillar's back, out of sight from the bench, there is a mason's mark you have seen on the road's kerbs.",
  },
  "the-reed-path": {
    "path|reed|ground":
      "The cut stumps along the path's edges are old and the new reed is growing up between them. The path underfoot is soft and wet and trodden into a narrow line. In the reed beside it, at knee height, there is a tunnel going alongside.",
  },
  "the-bittern-pool": {
    "pool|water|weed|reed":
      "The floating weed is broken in a line across the pool where something passed. At the reed's edge there is a flattened platform of reed stems, and on it a few long brown feathers, striped like the reeds. The water smells of mud.",
  },
  "the-marsh-sill": {
    "sill|ground|marsh|reed|water":
      "The sill's ground is firm sand and shell, and it is printed with gull feet and the boots of somebody who came this way not long ago. At its seaward end there is a heap of shells, opened, and a few burnt sticks.",
  },
  "the-causey-foot": {
    "causeys|causey|sill|path|ways":
      "Where the path meets the causey the old wood is worn into a step, and the step is polished by feet. The causey's timbers are black and hard as stone. Along their edges, every few strides, a short stake stands with a notch in its top.",
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
      "NORTH — ASSART END, by the hurdle gate. Roofs, and other people under them.",
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

// ---------------------------------------------------------------------------
// THE WAYSTONES (rome, 2026-08-15: a new player has to be able to get back to a
// gate)
// ---------------------------------------------------------------------------
//
// The fingerposts above say where the ROADS go. They were the right answer to
// the question they were asked and they do not answer this one: a person who is
// turned around in seven hundred rooms does not need to know where the causeway
// ends, they need to know which way the door is.
//
// Same institution, same logic that put arms on the junctions. Whoever cut the
// milestones and set the toll stones marked the way back to their own gates,
// because a road nobody can navigate collects nothing. So the stones already
// standing in the world start doing the job they were cut for.
//
// WHAT IS AND IS NOT A WAYSTONE. Only markers — a stone or a post set up to be
// READ. Stepping stones, hearth stones, the capstan and the anchor stone are
// objects that happen to have "stone" in the name and stay mute.
//
// AND THE WOOD GETS NONE, deliberately. Its whole character is that it stops
// telling you the truth about which way you are facing, and a wood that signs
// its own exits is not that wood any more. The road and the water are made
// country, marked by people who wanted to be found. The trees are not.
export const WAYSTONES = new Set<string>([
  // the road: the numbered stones and the markers between them
  "the-first-milestone", "the-drowned-milestone", "the-second-milestone",
  "the-third-milestone", "the-fifth-milestone", "the-sixth-milestone",
  "the-seventh-milestone", "the-eighth-milestone",
  "the-toll-stone", "the-marker-stone", "the-drovers-cairn", "the-boundary-cairn",
  "the-broken-cross", "the-roadwarden-post",
  // the crossing: the stones the water people set, on both banks
  "the-weeded-milestone", "the-far-milestone", "the-first-crossing-stone",
  "the-second-crossing-stone", "the-toll-post", "the-causeway-cross",
  "the-shepherds-stone",
  // and the one cross in the middle of the houses
  "the-street-cross",
]);

// What the stone IS, before it says which way. Kept short — the room has
// already described itself and this is the sentence that turns a piece of
// scenery into a thing you can steer by.
export function waystoneLine(roomId: string): string {
  if (roomId.includes("milestone")) return "The road-facing flat of the stone carries the old cut, and it is still legible.";
  if (roomId.includes("cairn")) return "The cairn has one long stone laid into it deliberately, level, not fallen that way.";
  if (roomId.includes("cross")) return "The cross has lost its head, and what is left is the shaft and one weathered arm.";
  if (roomId.includes("post")) return "The post is iron-shod against the weather and has outlasted everything wooden near it.";
  return "The stone is dressed on one face, and dressed by somebody who meant it to be read.";
}

// How far, in the language a stone would use. Never a room count: a milestone
// does not say "eleven squares", and a number that precise turns the country
// into a grid you solve instead of a place you learn.
export function wayFar(steps: number): string {
  if (steps <= 2) return "the door is close, and you would see it from the next turn";
  if (steps <= 5) return "a short walk";
  if (steps <= 10) return "the better part of an hour on foot";
  if (steps <= 16) return "a long walk, and not one to start at dusk";
  return "a day's walk, near enough, and nothing between here and there that is anybody's business but yours";
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
    // The Gate Arch's outer works (mig 311): the arch stands inside them now.
    "the-paved-road", "the-road-ruts", "the-outer-ditch", "the-counterscarp",
    "the-barbican-footings", "the-killing-ground", "the-guard-footings", "the-pay-stone", "the-mounting-block",
    "the-outer-bailey", "the-bailey-wall", "the-rampart-walk", "the-old-palisade", "the-ward-ditch",
    "the-turning-bay", "the-tilt-yard", "the-horse-pond", "the-boundary-cross",
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
    // The withy holt round the Withy Hut (mig 311).
    "the-withy-holt", "the-cut-osiers", "the-soaking-pit", "the-willow-stools", "the-bundle-ground",
    "the-wet-ride", "the-pollard-line", "the-holt-drain", "the-osier-carr", "the-peeling-bank",
    "the-basket-ground", "the-withy-drain",
  ],
  worked: [
    "the-holly-maze", "the-dry-gully", "the-open-canopy", "the-deer-lawn", "the-lichen-wood",
    "the-thin-birches", "the-old-burn", "the-ant-hills", "the-poachers-camp", "the-timber-stack",
    "the-charcoal-ring", "the-fallen-wall", "the-pine-dark", "the-windfall", "the-empty-ride",
    "the-bracken-sea", "the-far-north-turning", "the-last-oaks", "the-thin-soil", "the-north-ride",
    "the-bracken-edge", "the-outer-scrub",
    // The old felling round the Timber Stack (mig 311).
    "the-felling-edge", "the-stump-field", "the-hauling-ride", "the-brash-heaps", "the-saw-pit",
    "the-sawdust-floor", "the-skid-road", "the-axe-stumps", "the-bark-strip", "the-cord-stacks",
    "the-sawyers-bench", "the-wedge-ground", "the-split-oak", "the-coppice-stools",
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
  ],  // THE OLD GROWTH (mig 309, rome 2026-10-19): the wood's west fringe, grown out
  // along the whole west side so a den can stand in the trees. Wood that was
  // never felled, under a closed canopy, so it is cover like the deep wood.
  oldgrowth: [
    "the-boundary-bank", "the-dry-rise", "the-ward-oak", "the-moss-hall", "the-standing-oaks",
    "the-burners-flat", "the-windthrow", "the-grass-island", "the-hidden-spring",
    "the-ferny-bank", "the-dark-pool", "the-spring-mire", "the-wet-oaks", "the-badger-banks",
    "the-bramble-tunnel", "the-root-hollow", "the-grey-trunks", "the-oak-knees",
    "the-green-ridge", "the-deep-litter", "the-split-ash", "the-ivy-wall", "the-holly-dark",
    "the-lichen-stones", "the-dead-stand", "the-fern-floor", "the-hornbeam-gloom",
    "the-moss-steps", "the-crooked-oaks", "the-dead-air", "the-wych-elms", "the-high-crowns",
    "the-toadstool-ring", "the-cold-hollow-oaks", "the-woodpecker-stand", "the-yew-shade",
    "the-tangle", "the-silent-beeches", "the-mossed-wall", "the-owl-oak", "the-leaf-drifts",
    "the-moss-boulders", "the-leaning-limes", "the-black-oaks", "the-thorn-thicket",
    "the-old-pollards", "the-sunless-floor", "the-bent-hazels", "the-great-root",
    "the-dappled-way", "the-deer-browse", "the-cracked-oak", "the-grey-mist", "the-ancient-ash",
    "the-ground-ivy", "the-snapped-limbs", "the-murk", "the-clean-floor", "the-wolf-run",
    "the-rot-wood", "the-sunk-way", "the-last-of-the-light", "the-oak-aisle",
    "the-fallen-crowns", "the-thin-light", "the-holly-wall", "the-lime-stand",
    "the-rotten-gate", "the-beech-mast", "the-buckled-ground", "the-sapling-crowd",
    "the-twisted-yews", "the-moss-tunnel", "the-hornets-oak", "the-long-fall",
    "the-elder-brake", "the-holly-tree", "the-stone-oak", "the-drowned-hollow",
    "the-grey-stools", "the-wild-cherry", "the-fungus-fall", "the-sloe-thicket",
    "the-deep-roots", "the-crows-oak", "the-soft-floor", "the-hazel-ride",
    "the-black-alder-stand", "the-old-boundary-stone", "the-oak-fall-gap", "the-last-oak",
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
    "the-rope-post", "the-crag-foot", "the-shelter-stone", "the-scarp-top", "the-high-shelf",
    "the-peat-cuttings", "the-boundary-cairn", "the-watershed", "the-first-sight",
    "the-far-shore-stone",
  ],
  // THE HOLDINGS (mig 221). The sixteen rooms of the east's own den country sat
  // in no quarter at all, so the map captioned them as more east road — which is
  // what the sim calls them and is exactly the wrong thing to tell a player, who
  // is looking at that map to find somewhere to LIVE. Same caption-only trick as
  // every quarter above it: mapRegionOf still says road, the arcs and the weather
  // and the ecology are all still the road's, and only the paper says otherwise.
  holdings: [
    "the-turf-road", "the-turf-stacks", "the-peat-house",
    "the-sheep-trod", "the-wether-fold", "the-herds-hut", "the-hut-yard",
    "the-deep-lane", "the-well-house", "the-moss-path",
    "the-sledge-track", "the-winding-house", "the-beck-lane",
    "the-spring-bank", "the-hill-gate", "the-top-wall",
  ],
  // THE TWO LANES (rome, 2026-10-19). Caption-only, like the rest of this table:
  // both are band 'road' for every rule in the sim. The Drove Lane leaves the
  // West Road at the Dry Well for the wood (regions/the-drove-lane.rooms); the
  // Scarp Foot track leaves the hill road at the Moss Path for the crossing
  // (regions/the-scarp-foot-track.rooms).
  drovelane: [
    "the-drove-mouth", "the-hollow-lane", "the-hedge-gap", "the-holly-bank",
    "the-drovers-spring", "the-steep-pitch", "the-blackthorn-lane", "the-wall-end",
    "the-high-lane", "the-cattle-stance", "the-stony-rise", "the-cairn-shoulder",
    "the-bent-thorn", "the-sheep-scrape", "the-tops", "the-sheepwalk", "the-dewpond",
    "the-shepherds-ruin", "the-boundary-dyke", "the-west-brow", "the-brow-path",
    "the-scree-turn", "the-bracken-hillside", "the-first-oaks", "the-wood-bank", "the-hanger",
    "the-holly-scarp", "the-spring-line-oaks", "the-wet-margin", "the-seep-edge",
  ],
  scarpfoot: [
    "the-peat-track", "the-under-scarp", "the-fallen-crag", "the-heather-bench",
    "the-turf-stack-ruin", "the-raven-rock", "the-moor-gate", "the-beck-gully",
    "the-gully-steps", "the-beck-ford", "the-alder-gill", "the-gully-mouth", "the-rush-levels",
    "the-old-drain", "the-lapwing-ground", "the-cattle-causey", "the-willow-holt-edge",
    "the-reed-edge", "the-reed-path", "the-bittern-pool", "the-marsh-sill", "the-causey-foot",
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
  // THE SALTINGS (mig 310, rome 2026-10-19): salt marsh and dunes above the
  // ford's tidal flats, dry at every hour.
  saltings: [
    "the-high-water-mark", "the-salt-workings", "the-sea-purslane", "the-crooked-creek",
    "the-sea-lavender", "the-samphire-flats", "the-storm-ridge", "the-wide-creek",
    "the-grey-marsh", "the-cord-grass", "the-saltmarsh-pools", "the-redshank-ground",
    "the-drained-creek", "the-samphire-island", "the-old-sea-bank", "the-white-dunes",
    "the-dune-slack", "the-marram-sea", "the-blowout", "the-dune-ridge", "the-sea-buckthorn",
    "the-grey-dunes",
  ],
};
export const CROSSING_QUARTERS: Record<string, string> = {};
for (const q in CROSSING_QUARTER_ROOMS) for (const id of CROSSING_QUARTER_ROOMS[q]) CROSSING_QUARTERS[id] = q;

/** THE OPEN GROUND'S FOUR (mig 193). The nine-room ring keeps the region's own
 *  caption — it IS the open ground — and the four spurs off it are each a place
 *  with a name, so the map tells you whether you are in the siege lines or the
 *  village rather than lumping the lot as one ring. */
export const OUT_QUARTER_ROOMS: Record<string, string[]> = {
  siegelines: [
    "the-siege-bank", "the-spoil-heap", "the-battery", "the-shot-pile", "the-forge-pit",
    "the-camp-ground", "the-suttlers-row", "the-horse-lines", "the-marshals-lodging",
    "the-sap-head", "the-mine-mouth", "the-mine-gallery", "the-camouflet",
  ],
  village: [
    "the-village-street", "the-pound", "the-tithe-barn", "the-well-head",
    "the-church-shell", "the-churchyard", "the-bell-pit", "the-green", "the-village-smithy",
  ],
  orchard: ["the-fish-stew", "the-orchard-rows", "the-cider-house", "the-culver-house"],
  gallows: ["the-gibbet-field", "the-crossroads-grave", "the-charnel"],
};
export const OUT_QUARTERS: Record<string, string> = {};
for (const q in OUT_QUARTER_ROOMS) for (const id of OUT_QUARTER_ROOMS[q]) OUT_QUARTERS[id] = q;

/** THE MOUNTAIN'S TIERS. Empty until the ground exists — the table is stood up
 *  now because the tier is not decoration here the way a wood quarter is. Three
 *  separate systems will read it the moment the first rooms land:
 *
 *    - the map caption, same as every other band;
 *    - the ambience and dark-touch pools, so a room with nothing of its own
 *      still sounds like the height it is standing at;
 *    - and the CREATURE SHARD. Every other band is one blob; the mountain is
 *      planned at ~300 bodies against a 64KB-per-shard warn that lands near
 *      200, so it shards by TIER instead (see zone.ts's shardOf). simstore has
 *      named that answer in its own header since the rows shipped: "a finer
 *      shard — a wood by quarter, a mountain by tier."
 *
 *  Which means a mountain room with no tier is not a missing caption, it is a
 *  body in the wrong blob. Every room added gets a tier, in the same ship. */
export const MOUNTAIN_QUARTER_ROOMS: Record<string, string[]> = {
  // THE SUMMIT (mig 236). One room, its own shard, because the thing standing in
  // it is the only creature in the world with per-beat state of its own and it
  // has no business sharing a blob with 96 vultures.
  summit: ["the-summit"],
  // TIER FIVE — THE TERRITORY (mig 234). The ground the summit owns: warm rock
  // with adders on it, the terraces where kills carried up from four tiers below
  // are opened, an eyrie built to a scale nothing on the roster fits, and past
  // all of it nine rooms of swept ground with nothing standing in any of them.
  territory: [
    "the-ramp-head", "the-glazed-slab", "the-warm-flags", "the-black-glass",
    "the-run-stone", "the-heat-shimmer", "the-scald", "the-basking-flags",
    "the-crack-line", "the-adder-shelf", "the-sun-trap", "the-warm-scree",
    "the-thin-crack", "the-vent", "the-under-warmth", "the-dry-heat",
    "the-first-terrace", "the-second-terrace", "the-third-terrace",
    "the-last-terrace", "the-drag-mark", "the-scatter", "the-gorge-ground",
    "the-picked-ground", "the-tallow-stone", "the-grease-flat", "the-crack-heap",
    "the-white-heap", "the-eyrie-foot", "the-eyrie-ledge", "the-nest-shelf",
    "the-eyrie-head", "the-guano-face", "the-white-wall", "the-updraught",
    "the-lookout", "the-high-perch", "the-wind-post", "the-first-step",
    "the-shoulder-stone", "the-tower-foot", "the-black-tower", "the-tower-gap",
    "the-north-lip", "the-cold-side", "the-shadow-step", "the-high-notch",
    "the-crown-edge", "the-last-crest", "the-scorched-step", "the-swept-terrace",
    "the-ash-ground", "the-hot-flags", "the-quiet-ground", "the-bare-place",
    "the-threshold", "the-last-shelter", "the-summit-gate", "the-red-tail",
    "the-low-traverse", "the-south-shelf", "the-warm-gutter", "the-lower-flags",
    "the-south-step", "the-step-up", "the-south-gully", "the-terrace-foot",
    "the-under-terrace", "the-north-step", "the-cold-shoulder",
    "the-shoulder-end", "the-lee-side", "the-north-crest", "the-crest-walk",
    "the-crest-gap", "the-under-step", "the-shelf-walk", "the-warm-under",
    "the-heat-under", "the-lower-warm",
  ],
  // TIER FOUR — THE HIGH GROUND (mig 232). Above the cloud, where the mountain
  // stops producing anything and everything that lives is living on what is
  // DELIVERED: the snowfield, the fan the whole face empties onto, the glacier
  // that hands back what it swallowed, the red bowl with iron in it, and the
  // swept ground above all four where nothing lives at all.
  high: [
    "the-upper-brim", "the-frost-face", "the-snow-brim", "the-high-neve",
    "the-drift-foot", "the-white-slope", "the-wind-slab", "the-sun-cup",
    "the-snow-dome", "the-broken-crust", "the-runnel", "the-hard-pack",
    "the-blue-shadow", "the-snow-hollow", "the-snow-tongue", "the-tongue-foot",
    "the-shelf-tail", "the-fall-fan", "the-bone-ground", "the-catch-slope",
    "the-boulder-nose", "the-splinter-field", "the-lower-fan", "the-grey-run",
    "the-rib-cage", "the-scoured-flat", "the-dry-bones", "the-last-fan",
    "the-red-edge", "the-oxide-flat", "the-burnt-ground", "the-high-red",
    "the-red-scree", "the-iron-band", "the-ochre-shelf", "the-scree-head",
    "the-rust-slope", "the-stained-run", "the-red-gully", "the-gully-top",
    "the-crest-step", "the-first-notch", "the-knife", "the-north-drop",
    "the-second-notch", "the-gendarme", "the-ridge-walk", "the-wind-tooth",
    "the-third-notch", "the-lean", "the-ridge-end", "the-last-tooth",
    "the-ridge-drop", "the-serac-field", "the-ice-blocks", "the-crevasse-lip",
    "the-glacier-bend", "the-white-tower", "the-blue-ice", "the-slot",
    "the-melt-lip", "the-ice-plain", "the-drift-hollow", "the-glacier-head",
    "the-moulin", "the-melt-run", "the-glacier-toe", "the-stone-desert",
    "the-swept-ground", "the-pavement", "the-cold-terrace", "the-cold-plain",
    "the-wind-cut", "the-approach", "the-shelf-under", "the-last-ground",
    "the-summit-foot", "the-under-shelf", "the-way-up",
    // ...and the fifth way up off the cloud line, added with tier five.
    "the-fan-head",
  ],
  // TIER ONE — THE FOOT (mig 226). Sea level to the first crag: the last
  // grazing anybody bothered with, the burn that comes down through it, the
  // moraine the ice left, and the scree where walking stops being walking.
  // One tier, one shard.
  // TIER TWO — THE MIDDLE (mig 228). The corrie and its lochan, the wind-scoured
  // north shoulder and the plateau on top of it, the snow that never goes, the
  // sun flank where the deer are, and the burn that runs between them and spends
  // half its length underground.
  // TIER THREE — THE CLOUD LINE (mig 230). The height at which the mountain
  // makes its own weather and stops letting you look at it: the ribs and the
  // arete, a valley hanging above another valley, the permanent ice, the bare
  // north spur, and the sun shelves that carry the last grass on the hill.
  cloud: [
    "the-rake-top", "the-first-buttress", "the-rib-foot", "the-rib-gap",
    "the-second-rib", "the-scoop", "the-hanging-scree", "the-under-rib",
    "the-fall-line", "the-arete-foot", "the-first-tower", "the-notch-of-air",
    "the-second-tower", "the-arete-walk", "the-bad-step", "the-horns",
    "the-arete-end", "the-drop-either-side", "the-blade", "the-valley-mouth",
    "the-hanging-floor", "the-upper-lochan", "the-far-shore-high", "the-valley-head",
    "the-moraine-loop", "the-outwash", "the-braided-flats", "the-till",
    "the-step-in-the-floor", "the-valley-shoulder", "the-north-bank", "the-south-bank",
    "the-cloud-base", "the-white-out", "the-grey-nothing", "the-inversion",
    "the-brocken", "the-standing-cloud", "the-clear-window", "the-cloud-shelf",
    "the-cloud-foot", "the-rising-ground", "the-neve", "the-ice-fall",
    "the-crevasse-field", "the-blue-wall", "the-bergschrund", "the-ice-shelf",
    "the-rime", "the-cornice", "the-cold-crest", "the-crown-step",
    "the-north-rib", "the-spur-walk", "the-spur-head", "the-wind-scoop",
    "the-cold-plateau", "the-frost-pavement", "the-stripe-field", "the-high-tarn",
    "the-tarn-edge", "the-spur-end", "the-lee-drift", "the-shelf-head",
    "the-long-shelf", "the-shelf-break", "the-upper-heather", "the-last-green",
    "the-stone-run", "the-sun-buttress", "the-warm-gully", "the-shelf-end",
    "the-scoop-of-grass", "the-high-spring", "the-dry-shelf", "the-south-rib",
    "the-sun-notch", "the-terrace-end", "the-last-shelf", "the-shelf-drop",
    "the-cold-ramp", "the-hot-ledge", "the-sun-traverse", "the-dry-ledge",
    "the-heather-step",
  ],
  middle: [
    "the-brink",
    "the-gully-head", "the-corrie-mouth", "the-lochan", "the-lochan-shore",
    "the-back-wall", "the-corrie-floor", "the-drift-edge", "the-old-snow",
    "the-black-scree", "the-fallen-block", "the-corrie-lip", "the-water-lip",
    "the-hanging-step", "the-corrie-rim", "the-upper-drift", "the-pass-head",
    "the-shoulder-walk", "the-wind-scour", "the-stone-stripes", "the-frost-shatter",
    "the-high-cairn", "the-shoulder-drop", "the-north-corrie", "the-snow-gully",
    "the-cold-face", "the-plateau-edge", "the-flat-top", "the-bare-plateau",
    "the-blown-ground", "the-wind-lane", "the-lower-band", "the-terrace",
    "the-ledge-walk", "the-second-band", "the-broken-terrace", "the-chimney-foot",
    "the-chimney", "the-third-band", "the-slab-nose", "the-airy-step",
    "the-band-end", "the-rake", "the-snow-bed", "the-firn",
    "the-melt-runnel", "the-grey-ice", "the-moat", "the-cold-shadow",
    "the-old-drift", "the-snow-edge", "the-shattered-crown", "the-white-hollow",
    "the-late-field", "the-sun-shoulder", "the-heather-shelf", "the-dry-corrie",
    "the-warm-slabs", "the-basking-stone", "the-deer-lawn-high", "the-wallow",
    "the-thin-turf", "the-rowan", "the-gravel-shelf", "the-broken-ground-high",
    "the-sun-gully", "the-hot-scree", "the-hidden-burn", "the-cut",
    "the-pothole", "the-sink", "the-dry-gorge", "the-resurgence",
    "the-upper-force", "the-boulder-gate", "the-water-notch", "the-mid-shelf",
    // The two ways up added with tier four (mig 228, rebuilt): a ramp under the
    // pass wall and a block wedged in the foot's fissure. Both are MIDDLE — they
    // are ways INTO this tier, and a room with no tier is a body in the wrong
    // shard.
    "the-slant", "the-wedge",
  ],
  foot: [
    "the-track-head", "the-boulder-beach", "the-burn-mouth", "the-cobble-bank",
    "the-first-rise", "the-wind-flat", "the-thorn-scrub", "the-lower-beck",
    "the-alder-thicket", "the-turf-wall", "the-shieling", "the-milking-fold",
    "the-nettle-ground", "the-hearth-stone", "the-last-pasture", "the-rush-hollow",
    "the-stell", "the-bracken-slope", "the-cotton-grass", "the-peat-hags",
    "the-peat-pool", "the-drowned-fence", "the-clapper", "the-beck-narrows",
    "the-plunge-pool", "the-water-slide", "the-gravel-race", "the-fallen-birch",
    "the-beck-fork", "the-dry-course", "the-spring-eye", "the-flood-gravel",
    "the-lower-force", "the-force-pool", "the-boulder-field", "the-erratic",
    "the-hollow-under", "the-moraine-bank", "the-stone-river", "the-sorted-ground",
    "the-lichen-boulders", "the-glacier-mouth", "the-cold-hollow", "the-scree-toe",
    "the-loose-slope", "the-fan", "the-shifting-ground", "the-rock-glacier",
    "the-boulder-choke", "the-first-crag", "the-crag-shadow", "the-notch",
    "the-shattered-rib", "the-gully-foot", "the-goat-track", "the-hanging-turf",
    "the-wether-ledge", "the-high-fold", "the-shelter-crag", "the-north-scree",
    "the-raven-stone", "the-cairn-line", "the-wind-notch", "the-bealach",
    "the-sphagnum-flat", "the-quaking-moss", "the-sunk-boulders", "the-mire-foot",
    "the-black-runnel", "the-slabs", "the-wet-slabs", "the-south-shoulder",
    "the-cleft",
  ],
};
export const MOUNTAIN_QUARTERS: Record<string, string> = {};
for (const q in MOUNTAIN_QUARTER_ROOMS) for (const id of MOUNTAIN_QUARTER_ROOMS[q]) MOUNTAIN_QUARTERS[id] = q;

export const MAP_QUARTERS: Record<string, string> = { ...WOOD_QUARTERS, ...EAST_QUARTERS, ...CROSSING_QUARTERS, ...OUT_QUARTERS, ...MOUNTAIN_QUARTERS };

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
// The Old Growth (mig 309) is cover too: never felled, the canopy closed overhead.
const COVER_QUARTERS = new Set(["deepwood", "sunken", "heart", "oldgrowth"]);

/** Does this room have canopy enough to keep the rain off what stands under it? */
export function underCover(roomId: string): boolean {
  return COVER_QUARTERS.has(WOOD_QUARTERS[roomId] ?? "");
}

// The quarter's own voice. Read when a wood room has no pool of its own, which
// after this file is most of them — so this is what the wood mostly sounds like,
// and it is written to be somewhere rather than to be atmospheric.
export const QUARTER_AMBIENCE: Record<string, string[]> = {
  // ---- THE NEW GROUND OF 2026-10-19 (migs 309-312).
  oldgrowth: [
    "Somewhere a long way off a branch lets go, and the fall of it comes to you through the trunks a long time after.",
    "Nothing has been cut here. You can tell by the dead: every tree that ever fell is still lying where it fell.",
    "The canopy moves overhead in a wind you cannot feel down here, and the light on the floor moves with it.",
    "A woodpecker drums somewhere, stops, and drums again further off, as if it were leading you or leaving you.",
    "The leaf-mould gives under your boot with a soft sound, and a smell comes up out of it that is older than the trees.",
    "A deer barks once, out of sight, and the whole wood goes still to listen to what it saw.",
  ],
  saltings: [
    "A curlew calls somewhere out on the marsh, long and rising, and another answers it from further off.",
    "The tide is working in the creeks. You can hear it filling them, a whisper everywhere at once.",
    "Wind off the sea combs the grass flat in long silver waves, and then lets it up again.",
    "Sand hisses across the top of a dune and comes down the lee side in a thin bright stream.",
    "Gulls go over high, heading inland, all of them crying, which means weather.",
  ],
  drovelane: [
    "A sheep bell, somewhere, once. There are no sheep up here any more.",
    "The wind comes over the hill in long gusts, and between them it is so quiet you can hear the grass.",
    "Larks go up off the turf ahead of you and hang, singing, over the place they left.",
    "The hedge banks are full of small sounds that stop as you come level with them and start again behind.",
    "Hoofprints in the mud of the lane, cloven, a lot of them, all going the same way, all old but the last few.",
  ],
  scarpfoot: [
    "A stone comes down the scarp somewhere above you, knocking from ledge to ledge, and stops.",
    "Ravens talk on the face of the scarp in a language that is almost words.",
    "The smell of the sea comes up off the levels on the wind, salt and weed and mud.",
    "Plovers cry out over the wet ground, tumbling, and settle again when nothing follows.",
    "The beck is louder for a moment as the wind turns, and then falls back to a murmur.",
  ],
  // ---- THE OPEN GROUND'S FOUR (mig 193).
  siegelines: [
    "The earthworks run away in long grassed lines, and from down in them you cannot see out, which was the point.",
    "The turf gives under your boot with the particular softness of ground that was dug and put back.",
    "Larks are up over the camp streets, several of them, going at it as though nothing had ever happened here.",
    "Something metal turns up under your heel — a buckle, a strap end, a nail. There is a great deal of this in the ground.",
    "From this side the fortress is all wall and no gate, which is how the men who dug this saw it every day for a season.",
    "Chalk shows white through the grass wherever anything has scuffed it, and it has not weathered in two hundred years.",
  ],
  village: [
    "Elder and nettle have the plots, which is what grows where people used to live and no longer do.",
    "A gable end stands up out of the grass with a fireplace in it, twelve feet off the ground, opening onto nothing.",
    "The black line of the burning is visible in the soil wherever the ground has been broken.",
    "Something has been living in the church shell and it is not birds.",
    "Underfoot the street is still a street — cobbles, and a worn dip down the middle of them.",
    "The yews in the churchyard move all together, once, and go still.",
  ],
  orchard: [
    "The stew ponds lie flat and green and something works at the surface of the far one.",
    "Windfalls lie under the old trees, small and hard and going over on their own schedule, for nobody.",
    "Mistletoe hangs in the tops of the orchard in great dark balls, and there is far too much of it.",
    "The smell of old fruit comes up warm out of the grass, which after this long should not still be happening.",
    "Wings go over inside the culver house — many of them, briefly, and then nothing.",
  ],
  gallows: [
    "The iron arm on the gibbet post turns a little in the wind and does not squeak, which is worse than if it did.",
    "Grass grows to the foot of the post and stops in a circle, and nothing has grown inside that circle for a long time.",
    "The roads cross here and go four ways and there is nobody on any of them.",
    "Something in the charnel shifts its weight, settles, and is a stack of bones again.",
  ],
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

  // ---- THE MOUNTAIN'S SIX (rome, 2026-08-22). The region declared its quarters
  // when it shipped and never wrote a voice for any of them, so all 398 rooms
  // fell through to one ten-line band pool — and four of those ten are only true
  // above the snow. Standing in the summer pasture at the foot, in grass, beside
  // a turf wall, the hill would tell you that nothing grows at this height. The
  // altitude-specific lines have moved out of AMBIENCE.mountain and into the
  // tiers that own them; what is left up there is true anywhere on the hill.
  foot: [
    "The grass here is cropped to the roots and the ground under it is stitched through with old sheep tracks.",
    "Bracken to the waist, brown and dead and still standing, and it rattles as you come through it.",
    "A wall of turf sods runs away along the contour and stops, for a reason somebody knew.",
    "The burn goes under a slab of rock, sounds louder for a moment, and comes out the other side.",
    "Somewhere below and behind you a hill is between you and the road, and you notice you cannot see it any more.",
    "A curlew goes up off the grass ahead, complaining, and puts itself down again forty yards on.",
    "The ground goes soft and black in a runnel where a spring comes out, and there are prints in it.",
  ],
  middle: [
    "The face is built in bands — a wall of rock, a ledge of grass, a wall, a ledge — and you are walking one of the ledges.",
    "Something comes off the crag above and lands somewhere below, and neither end of it is visible.",
    "A gully runs down the flank, floored with the same grey chips as every other gully, and it is not the one you want.",
    "The wind stops entirely for a moment in the lee of the buttress, and the silence is the strange part.",
    "Water comes off the rock in a thin thread and is blown sideways to nothing before it lands.",
    "The rock here is dry and warm on its south side and running wet on the other, a stride apart.",
  ],
  cloud: [
    "The cloud comes down over you in one step and the world shrinks to eight feet of grey.",
    "Everything you are wearing is beaded with water that never fell as rain.",
    "Sound goes wrong in this: something moves close by and you cannot say which side of you it was on.",
    "The cloud thins for a second, shows you the drop, and closes again before you have finished looking.",
    "Your own hands are the furthest thing you can see clearly.",
    "The line of it moves up and down the mountain through the day and nobody consults you.",
  ],
  high: [
    "The air comes thin and cold off the stone and takes the warmth out of your hands.",
    "Nothing grows at this height but a grey lichen, clinging where it can.",
    "The cold up here is dry and clean and entirely without mercy.",
    "Below you the country lies out flat and small and none of it is any help.",
    "Old snow lies in every hollow that has not seen the sun this year, and there are hollows that never do.",
    "The snow is scoured into hard flutes by the wind, and it takes your boot without giving anything back.",
  ],
  territory: [
    "The rock underfoot is warm through your boots, which it has no business being at this height.",
    "Bone lies about in quantity, none of it arranged, none of it fresh, all of it carried up here from somewhere else.",
    "A shelf of stone off to the side has been used, and used, and used — the marks on it are all the same marks.",
    "Nothing calls up here. There are birds, and they do not call.",
    "Something has come down this slope at speed, once, and gouged it, and the gouge has not weathered.",
    "The wind carries a smell up off the rock that is not the mountain's.",
  ],
  summit: [
    "The floor of the bowl is swept, and it is not the wind that swept it.",
    "The rock has run here and set in ropes and lobes, and the front edges of them are curled over.",
    "It is warm. That is the thing you keep coming back to.",
    "There is no snow in this bowl and there is snow on every other thing you can see.",
  ],
};

// Blind in the wood used to be one line, everywhere, for 170 rooms. Now the
// quarter answers by touch and sound and smell — never sight, since you
// genuinely cannot see. Read after DARK_TOUCH's own per-room entries.
export const QUARTER_DARK: Record<string, string> = {
  oldgrowth: "Your hand finds a trunk, and then cannot find the other side of it however far you reach. The floor is deep and soft and full of fallen wood that nobody has ever cleared, and the air is still and cool and smells of moss.",
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
// THE OPEN GROUND'S SIGNATURE ROOMS (mig 193). Nine, out of forty-two — the
// ring speaks as the band and the four spurs speak as their quarter, and these
// are the rooms that are a THING.
export const OUT_ROOM_AMBIENCE: Record<string, string[]> = {
  "the-mine-mouth": ["Cold comes up out of the timbered hole, steadily, and it smells of chalk and nothing else.", "The props are two hundred years old and they are not moving at all."],
  "the-mine-gallery": ["The charred props hold. They have held since the night they were fired, which is the one thing about this place nobody planned.", "Somewhere ahead a pick goes into chalk, twice, and stops.", "Your light finds the end of the gallery and the end of the gallery is not where it was."],
  "the-camouflet": ["The grooves in the chalk at chest height are the width of a pick and there are a great many of them.", "The fall at the east end shifts, settles, and lets a little chalk dust down.", "It is very quiet in here in a way that suggests the quiet is recent."],
  "the-marshals-lodging": ["From the hearth you can see the gate, the lines, and every hut hollow between, which is exactly what this room was for.", "Wind comes over the chimney stub and makes one low note out of it."],
  "the-camp-ground": ["The hut hollows run away in ranks with streets between them and the streets are still walkable.", "Larks over the camp, several, and nothing else moving on the whole hillside."],
  "the-church-shell": ["The east window is a shape with nothing in it and the sky comes through it in the shape of a window.", "A slate lets go somewhere up in the tower and takes a long time to arrive.", "The font lies on its side in the grass, full of rainwater, and something has been drinking from it."],
  "the-bell-pit": ["Grey metal set hard in the bottom of the pit, and it has not weathered, and it will not.", "The runner channel still shows the direction it flowed, which was out and down and into the ground."],
  "the-gibbet-field": ["The iron arm turns a few degrees in the wind and comes back.", "The circle of bare ground at the foot of the post has not closed in two hundred years."],
  "the-culver-house": ["Five hundred nest holes, in perfect spirals, all the way up into the dome.", "Something moves in the top of the tower — the wrong weight for a pigeon, and it settles."],
};

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
  // ---- THE OPEN GROUND (mig 194). The first place a player meets the idea the
  // whole world runs on, so it is said plainly here and elaborated later.
  "the-sapper": "He is going EAST. That is the thing to hold onto, because everything else about him is ordinary: a man on his knees in four feet of headroom, working chalk out in front of him with a short pick, at a rhythm he could keep up all day and did. East is the wall. The wall came down two hundred years ago — he brought it down, that was the job, the job succeeded — and he is still driving the gallery toward it. Nobody came back to tell him it had worked.",
  "the-cook": "Somebody has to feed them. That is the whole of it, and it was the whole of it then: the garrison was due in off the walls and the meal had to be on the tables when the bell went. The bell never went. The garrison never came in. He has laid the refectory every day since, scrubbed what he used, hung back what he did not, and he has never once been late with it. The dust on the trenchers is two hundred years thick, and under it every place is set the same.",
  "the-bellfounder": "The melt is cold. It has been cold since before anybody now alive was born, it is a lump of grey metal set hard in a clay hole, and he is watching the surface of it the way you watch metal that is nearly ready. He got that bell out of the tower, into the pit, and most of the way to being money, and the last step never happened. He is still on the step before it. He will not be hurried and he will not be interrupted, and you have done the second one.",
  "gibbet-crow": "There is nothing on the post. There has been nothing on the post for longer than anything alive remembers, and it is sitting on the post anyway, with its head turned to put one eye on you. Crows live thirty years and teach their young where the food was. Work out how many generations of that it takes to get from a body on a gibbet to a bird that still checks, and then consider that it is still checking.",
  // ---- THE CROSSING (mig 191). The east road's dead were doing a JOB that had
  // outlasted its reason. These are doing a job that outlasted the WATER'S
  // permission — every one of them died at work, in a place that is only a
  // place for part of the day, and none of them was told when the part ended.
  "the-drowned-ferryman": "Look at the hands and nothing else. They are the only part of him above the water and they are the part that still works: white, swollen to twice a hand's proper size, and absolutely steady on wet hemp, which is a thing a living hand cannot do for long. He is not coming for you. He is coming along the rope, because coming along the rope is the entire content of him, and you are standing at the end that he arrives at. Everybody who ever used this ferry stood exactly where you are and waited for exactly this.",
  "the-pilot": "He is reading. That is the thing to understand: the brass plate in his hand is a diagram of one safe line across one mile of water, and he is checking the water against it, and the water stopped matching two hundred years ago and he has not stopped checking. A pilot's whole worth was knowing a channel better than the channel knew itself. He still does. The channel simply is not the channel any more, and nobody has been able to tell him.",
  "the-tide-warden": "The stick is a tally and both edges are cut: height on one, hour on the other, and the last dozen notches are crowded together and driven deep. That is a man cutting faster than he wants to. Read down the stick and you can watch him work out, over about two hours, that the water was coming up quicker than the road allowed for. He got to the end of the record. He did not get to the end of the causeway.",
  "the-refuge-man": "The hands are flat on the stone at shoulder height, and that is not a defensive posture and it is not a dying one — it is the way a man braces in a doorway when something is going past outside and he is waiting it out. He got to the refuge. Getting to the refuge was the correct decision and it was made in time. The refuge is a stone box with an opening at one end, and it is dry now, and it is dry twice a day, and that is the whole of what went wrong.",
  "the-bridge-mason": "He is dressing the joint at the broken edge — squaring off the exact stone where the bridge stops. It is good work. It is the best work anywhere in this country and it is being done on a face that leads nowhere, because a mason finishes an edge whether or not anything is going to be built onto it, and finishing the edge is where he was when the span went. He does not look up for you. He looks up for the mallet, and the mallet is what he comes at you with, and he has never in two centuries let go of it.",
  "the-scaffold-hand": "Look at the arms and nothing else. They are up over his head and they have been up over his head since the fall: bare bone from the shoulder down, worn smooth at the joints, the hands still shaping an underside that went into the channel with the span. A scaffold hand worked overhead all day — it is the only posture the trade has, and it is the one he is still in. The scaffold came down two centuries ago. He did not come down with it. Look at him long enough and the question stops being how he is still up there and becomes what is actually taking the weight.",
  "the-drover": "There is nothing in front of him. He is driving nothing, at the pace of something, across a mile of water, and every so often he says something over his shoulder to a beast that is not there and has not been there since the fall. This is the gentlest thing in the region and it is the worst one to watch, because everything about him is competent and unhurried and correct, and he will keep the stock off the deep channel all the way over, and there is no stock.",
  "the-eel-cutter": "He works the line in order and he does not skip one: lift, empty, re-bait, set, pole on. The grigs are mended. The bait is fresh. Somewhere in this marsh there is fresh bait coming from somewhere, and that is a more unsettling fact than anything about the man himself. He has not looked up since before you were born. He will look up now, and the thing to know is that he will finish setting the trap in his hands first.",
  "the-fowler": "You did not see him and you were not going to. That is not a boast about him; it is what the hood is for. A man in sacking and reed on his front in wet turf is not a man-shaped thing to a bird, and birds are considerably better at this than you are. He was there when you came onto the turf, he was there while you crossed it, and the difference between those minutes and this one is that you have now ruined a morning's work and he is going to charge you for it.",
  "the-reed-walker": "It is one cut over, on your side, at your pace. Not following — ALONGSIDE, which is worse, because following can be outrun and alongside cannot. The reed is too thick to see through and sound in a reed bed does not come from where the thing is. It has been in the maze long enough to be the only thing in here that is not lost, and it has learned the one trick the maze rewards, which is to always be at the far end of the cut you are about to take.",
  "the-salt-widow": "The pan is cold. There is no fire in the flue and there has not been one since the fall, and she is feeding it, in a coat crusted white to the elbow, at the steady unhurried rate of somebody who knows exactly how long a boil takes. Salt was the only reason anybody lived on this shore. It took a fire going day and night and somebody to keep it going, and keeping it going is the whole of what is left of her.",
  "strand-thief": "He saw you before you saw him and he has already worked out how this goes. Everything he owns came off this beach — the coat, the knife, the boots that do not match. He does not consider it stealing and he will tell you why if you give him the room: the sea does not own things, the sea only puts them down, and a thing put down on a beach belongs to whoever is standing on that part of the beach. You are standing on part of the beach.",
  "the-wrecker": "Wrecking was the trade of walking a lantern along a headland at the height and pace of a ship's riding light, so that something following it came in where the rocks were. The law hanged men for it and the coast fed on it. He is patient in a way a beachcomber never has to be.",
  "conger": "It is an arm, and the arm goes back into the pier, and what you can see of it is the last third — the part that moves. It will not chase you anywhere. It does not have anywhere to chase you TO. Everything about the animal assumes that sooner or later the food comes past the hole, which over the life of a stone pier in a tidal channel is an entirely reasonable assumption, and the teeth all rake inward so that the assumption only has to pay off once.",
  "old-conger": "Congers do not stop growing. One that has held the same hole for decades is a different animal from the ones out on the sand — thicker than a man's thigh at the head, and it strikes from cover without ever leaving it. Fishermen who lose fingers to congers lose them to this one.",
  "grey-seal": "On the gravel it is a joke: enormous, boneless, asleep, and shaped like something dropped. Every part of that is true and none of it survives the waterline. In the channel it has a dog's head, a dog's teeth and a dog's entire opinion about what is worth chasing, and it is faster than you are in the only medium available. The joke is not that it looks silly on land. The joke is that you will form your opinion of it on land.",
  "bull-seal": "A grey seal bull holds a haul-out through the breeding season against every other bull that tries it, and the half-moon scars on the neck are all the arguments he has won. On land he looks slow. He is not slow. He is simply not built to look like what he is.",
  "great-gull": "It is not frightened of you. Work outward from that, because everything else about the bird follows: the bill is a tool for opening things that do not want opening, the eye has no give in it whatever, and it has taken a rat off this parapet without landing to do it. There is no version of this where it becomes frightened of you, and there is no distance at which it stops considering you, and it is only waiting to find out which of those two facts is going to be relevant.",
  "black-backed-gull": "The great black-back is the largest gull in the world and it is a predator, not a scavenger with ambitions. It takes puffins whole and drowns other gulls' chicks in the rock pools. When the colony goes quiet instead of loud, this is what has landed.",
  "oystercatcher": "The bird is not the threat and was never going to be. It is the ANNOUNCEMENT. Black and white and built out of two straight lines, running ahead of you along the tideline, stopping, running again — and at some distance it privately settles on, it goes up screaming and does not stop, and everything on a mile of open gravel is told where you are and which way you are facing. The ford is the safe crossing. This is the price of the safe crossing.",
  "bittern": "It is within ten feet of you. It has been within ten feet of you for a while. It is pointing straight up, striped precisely like the reed it is standing in, and swaying — and this is the part that undoes people — at the reed's rate, not its own. You will not find it by looking, because looking is the thing it is built to defeat. You will find it when it decides the distance is wrong, and it comes out of the stems at the height of your face.",
  "fen-viper": "It does not want this. Read the animal honestly and that is the only conclusion available: it is coiled on the one dry plank in a hundred yards of water, it has nowhere to go that is not water, and you are standing on the plank. Everything that happens next happens because two things that would both rather be elsewhere are on the only piece of dry wood in the marsh. What it leaves in you outlasts the encounter by a considerable margin.",
  "marsh-hound": "Watch the pattern, not the dog. It is quartering — working the ground in overlapping arcs, nose down, ears up, covering everything and covering it once. That is taught. Somebody taught it, with a whistle and a great deal of patience, and then that somebody stopped existing, and the dog kept the method and lost the point of it. It is still searching the marsh very thoroughly. It no longer has anything it is searching for, which means what it finds will do.",
  "a-lymer": "A lymer was the finding-hound, run ahead of the pack on a line: silent, slow, and certain. It does not bay and it does not quarter, because both of those are for dogs that have not found anything yet. If you can see it, it has been on you for some time.",
  "wrack-crab": "There is never one. That is the entire natural history of the animal and it is the only part worth knowing. Move the weed and you find out how many there were, and the number is not the one you had in mind, and each of them is two hands across with a claw that shuts on a tendon and goes on shutting after the crab has stopped caring.",
  "devil-crab": "A velvet crab, and the fishermen who named it a devil were being accurate rather than colourful. It is the one crab on this coast that comes forward. Take the claws off a dead one before you put your hand in the pack: they keep closing for a while.",
  "ford-eel": "A yard of it in four inches of water, going upstream over gravel, and entirely untroubled by the shallowness — because it is not swimming, it is CROSSING, and it can cross wet grass if it has to. The ford is a mile of ankle-deep water that you are picking your way over with great care. It is a road, and it is being used as one, by something that does not need it to be deep.",
  "silver-eel": "An eel that has turned silver has stopped eating and started travelling — it is running for the sea to breed, and it will die out there having never fed again. Everything it is carrying, it is carrying to spend. That is why it is heavier than the others and why it does not give ground.",

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
  "dog-otter": "The big dog otter holds a length of water against every other otter on it, and the white scarring on the muzzle is the record of how. He is not defending cubs and he is not hungry. He simply does not concede water.",
  "grey-heron": "It is a hinge with a spear on the end. Everything about it is arranged around one movement made once, at the correct moment, and the hours of stillness are not patience — they are the mechanism cocked. When it goes up it makes more noise than anything else on this water, which is why everything else on this water watches it and not you.",
  "the-miller": "He is facing his own millstones and he is still working at them, under the water, with both hands. The pond backed up into his floor because the tail-race silted and nobody dug it out, and the reason nobody dug it out is standing in it. Whatever the water did to him it did slowly enough that he has never had to admit anything happened. He will not leave the mill. He does not need to: the mill is where people come.",
  "gill-adder": "It has no interest in you at all and that is exactly the danger. It will not chase, it will not follow, it will not defend anything — it will simply be lying in the one warm place in the cleft, which is also the one place your hand goes when the ledge runs out. Killing it is easy and largely beside the point. What it puts in you does the work afterwards.",
  "feral-goat": "The horns have been used against something and the something is not down here. Nothing on this scarp browses but this, nothing hunts it but the drove, and it has solved the problem by living on ground the drove cannot follow it onto. It is watching you with the flat pupil of an animal that has already worked out you cannot climb, and it is not wrong.",
  "old-billy": "An uncastrated male past his prime and driven off by younger ones, living alone and rank with it. The smell is deliberate — it is how he advertises. What makes him dangerous is not the horns but the arithmetic: he backs up before he comes, and he only does it once.",
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
  "the-baited-bear": "The band worn through the coat around its neck is a collar mark, and the two bald patches at the shoulders are where a harness sat. The ears are torn down to stubs — that is dogs, and it is dogs plural, and it is dogs over years. A bearward went from fair to fair down this road with it and made his living setting terriers on it in a ring while people paid to shout. Whatever ended the fairs did not end the bear. It has been walking the drove road ever since, dragging the far end of a chain that has not been held by anybody in a very long time.",
  "the-chain-breaker": "Four links and a swivel, still locked under the jaw. The fifth link is opened out, and the metal at the break is bright in a way that iron this old has no business being — it went recently, or it goes on going. Nothing about this one is worn. It is a third again the size of the other and it carries itself like something that has never been led anywhere, and the only mark on it that was not earned in a fight is that collar. Somewhere down this road a man was holding the other end when it went.",
  "brown-bear": "There was always a bear in this wood. The baited one on the road is a thing people did; this is the thing they did it to, before they caught one. No collar mark, no torn ears, nothing missing. It has five places it sleeps and it uses them in no order anybody has worked out, and the trees near each are scored higher than you can reach. It does not want you. It wants you to have gone the other way, and most of the time it is content to let you choose to.",
  "tawny-owl": "The wood's own owl, and it owns the wood after dark the way the wolves own it by day. It cannot see well in daylight and does not try; it sits against a trunk until the light goes and then it is the quietest thing alive. Its feathers are soft at the edges so the air goes over them without a sound, which is why nothing it hunts has ever heard it, and why you will not either.",
  "wood-sloth": "Nobody at the hatch can tell you how a sloth came to be in this wood, and the sloth is not going to tell you either. It eats leaves, which are not much food, so it does everything slowly enough to live on them. It does not run from what hunts it. It has never needed to, until the owls.",
  "hedgehog": "A hedgehog's whole answer to the world is to stop being something you can get hold of. The spines go up, the face goes in, and what is left is a ball that a fox will roll about and give up on, and that a blade skates off. It comes out at night to eat beetles and slugs, and it is louder doing it than anything its size should be.",
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
  "coyote": "The only hunters with no ground of their own. Every other animal that kills for a living keeps to a few rooms round its den; these four go wherever the world is fullest, and stay until it is not. Where they have been, the game is thinner and the weak ones are gone. They eat the dead as readily as the living, and they will follow a hurt man a long way.",
  "the-old-grey": "Wolves do not live long. This one has, behind a door that only the moon opens, where nothing has hunted it and everything it hunts has nowhere else to go. It leads the pack that lies up with it. Whatever it is waiting for at the back of its lie, it has been waiting a long time, and it has not once been made to give it up.",
  "the-woodward": "A woodward was a real office: the man who walked the wood, counted the timber, and dealt with whoever he found on it, with the full authority of whoever owned the ground. The office outlived the man, and the wood grew into what was left of him. He is not searching. He looks up when you come into view and what is in the grain of his face is not surprise — it is the unhurried interest of somebody who has found you on ground he is responsible for.",
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
