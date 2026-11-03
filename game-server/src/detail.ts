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
    "Overcast, and the same overcast it always is — a flat grey lid, unbroken from one horizon to the other, doing nothing today that it does not do every day.",
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
      "Stars, and a great many more of them than the low country ever gets — up here the lid is under you as often as it is over you, and on the nights it is under you the whole sky is out.",
    "sun":
      "The sun is real on this hill in a way it is not in the country below. It cuts the mountain in two: one side it lies on all day and one side it never does, and every living thing on this hill that can choose has chosen the side it keeps.",
    "sky|cloud|clouds":
      "The sky up here is not the flat lid the low country keeps — it moves and it breaks, and the cloud line climbs and falls across the slope as the day goes. Where you stand decides whether the sun is on you or the cloud is, and you are nearer the sky than any ground below ever gets.",
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
  },
  "catacomb": {
    "niches|niche|shrouds|dead|burials":
      "The niches near the steps are full, and the ones further in are empty and swept, waiting. They were cut ahead for a garrison's dead, generation by generation, and the generations stopped coming before the niches ran out.",
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
