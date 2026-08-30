// MUD-traditional verb + object parser — no NLP, but forgiving: natural
// aliases ("grab", "pick up"), articles stripped ("kill the rat"), and a
// did-you-mean suggestion when the verb is close but wrong.

export type Verb =
  | "look"
  | "board"
  | "post"
  | "tear"
  | "go"
  | "say"
  | "shout"
  | "attack"
  | "throw"
  | "stance"
  | "get"
  | "drop"
  | "equip"
  | "remove"
  | "unlock"
  | "salvage"
  | "burn"
  | "forge"
  | "smelt"
  | "repair"
  | "barter"
  | "bounty"
  | "dice"
  | "roll"
  | "stand"
  | "buy"
  | "offer"
  | "inventory"
  | "who"
  | "census"
  | "name"
  | "rest"
  | "eat"
  | "feed"
  | "bandage"
  | "light"
  | "carve"
  | "claim"
  | "stash"
  | "unstash"
  | "vault"
  | "unvault"
  | "publish"
  | "sheet"
  | "leaderboard"
  | "map"
  | "study"
  | "journal"
  | "fish"
  | "ring"
  | "listen"
  | "dive"
  | "wash"
  | "smoke"
  | "cure"
  | "cook"
  | "squink"
  | "enter"
  | "exit"
  | "tell"
  | "xyzzy"
  | "deal"
  | "settle"
  | "abandon"
  | "bar"
  | "bunk"
  | "unbunk"
  | "den"
  | "stow"
  | "fetch"
  // ---- THE GESTURES (rome, 2026-08-30) ----------------------------------
  // Three postures the room keeps, and three signals that cost something.
  // There is deliberately no free-text emote here and there never will be: in
  // a world whose whole economy is information with a toll on it, arbitrary
  // player prose is a forged telling waiting to happen, and the keeper's
  // voice is the one thing that must not be wearable.
  | "guard"
  | "lean"
  | "crouch"
  | "point"
  | "beckon"
  | "whistle"
  | "wave"
  | "nod"
  | "brow"
  | "dance"
  | "keen"
  | "sing"
  | "help";

export interface Command {
  verb: Verb;
  arg: string; // rest of the line, lowercased and trimmed ("" if none)
}

// Unknown input. `suggestion` is a real command the input was probably
// reaching for, ready to echo back: "Did you mean 'attack rat'?"
export interface Miss {
  miss: true;
  suggestion: string | null;
}

export type ParseResult = Command | Miss;

export const DIRECTIONS: Record<string, string> = {
  n: "north", north: "north",
  s: "south", south: "south",
  e: "east", east: "east",
  w: "west", west: "west",
  u: "up", up: "up",
  d: "down", down: "down",
};

const VERB_ALIASES: Record<string, Verb> = {
  look: "look", l: "look", x: "look", examine: "look", read: "look", inspect: "look",
  go: "go", walk: "go", run: "go", move: "go", head: "go", climb: "go",
  say: "say", "'": "say", talk: "say", speak: "say",
  shout: "shout", yell: "shout", holler: "shout", bellow: "shout", scream: "shout",
  attack: "attack", kill: "attack", k: "attack", hit: "attack", fight: "attack",
  throw: "throw", hurl: "throw", chuck: "throw", toss: "throw", lob: "throw",
  stance: "stance", style: "stance", footing: "stance",
  get: "get", take: "get", grab: "get", pick: "get", loot: "get",
  drop: "drop", put: "drop", leave: "drop", discard: "drop",
  equip: "equip", wield: "equip", wear: "equip", don: "equip", ready: "equip", hold: "equip",
  remove: "remove", unequip: "remove", unwield: "remove", doff: "remove", sheathe: "remove", sheath: "remove",
  // `cut` and `unbind` reach the unlock handler because the WETHER'S BELL lives
  // there and its own hint says "a glassed stone would cut it free" (2026-08-30,
  // a live player report: Lunapilot had the bell, had the stone, read the line
  // and had no verb to say it with). A game that names an action in its own
  // prose has to answer to that word.
  unlock: "unlock", open: "unlock", pry: "unlock", force: "unlock",
  cut: "unlock", unbind: "unlock", snip: "unlock",
  // ...and `pour` for the same reason at the bell-pit: its own refusal says the
  // mould "wants bell-metal — a lump of it, and the pour", and until now the
  // only sentence that worked was `unlock mould`. (`cast` is NOT added here —
  // it belongs to fishing, and casting a line is the older claim on the word.)
  pour: "unlock",
  salvage: "salvage", scrap: "salvage", dismantle: "salvage", break: "salvage",
  burn: "burn", destroy: "burn",
  forge: "forge", craft: "forge", make: "forge", smith: "forge",
  smelt: "smelt", melt: "smelt",
  repair: "repair", mend: "repair", fix: "repair",
  barter: "barter", trade: "barter", shop: "barter", browse: "barter", fence: "barter",
  bounty: "bounty", bounties: "bounty", // the keeper's trophy board: trophies in, meals out
  // THE BONES (gatehouse only). 'hold' is already equip's, so the game's word
  // for holding is 'stand' \u2014 which is what you'd say at the table anyway.
  dice: "dice", bones: "dice", gamble: "dice", wager: "dice", bet: "dice",
  roll: "roll",
  stand: "stand", stay: "stand",
  buy: "buy", purchase: "buy",
  offer: "offer", pay: "offer", sell: "offer", give: "offer",
  inventory: "inventory", inv: "inventory", i: "inventory", bag: "inventory", items: "inventory",
  who: "who", players: "who",
  census: "census",
  name: "name", rename: "name", callme: "name",
  rest: "rest", sleep: "rest", sit: "rest", camp: "rest",
  // THE GESTURES. Fixed words, no free text. `sit` is already rest's and
  // `listen` is already the wall's, so neither is claimed here.
  // ---- THE GESTURES: ONE WORD EACH, AND ONLY THAT WORD (rome, 2026-08-30) ----
  // Every other verb in this table carries a fistful of synonyms, and these
  // deliberately carry none. The reason is the gatehouse: in there the input
  // line is a MOUTH, and anything the parser recognises stops being speech. An
  // alias list for the gestures would have quietly eaten the commonest words a
  // person types at a fire — `hi`, `hello`, `greet`, `come`, `cap`, `tip`,
  // `duck` — and turned each of them into a silent gesture instead of the thing
  // the player was plainly saying. So the gesture fires on its own name and on
  // nothing else, everywhere, and every other word a player might reach for
  // stays available to say out loud.
  //
  // (`watch` was never here either, for a different reason: it has belonged to
  // `study` — the bestiary — since long before this, and that claim is older.)
  guard: "guard",
  lean: "lean",
  crouch: "crouch",
  point: "point",
  // `wave` is the GREETING, not the summons — a raised hand means hello before
  // it means come here, and it is the word a player reaches for first.
  beckon: "beckon",
  wave: "wave",
  nod: "nod",
  brow: "brow",
  whistle: "whistle",
  // The three the world has an answer for — see COURTESIES' note in zone-data.
  dance: "dance",
  keen: "keen",
  sing: "sing",
  eat: "eat", consume: "eat", chew: "eat", devour: "eat",
  feed: "feed", // feed <thing> <food> — a raven for a barter
  bandage: "bandage", bind: "bandage", dress: "bandage", bandages: "bandage",
  light: "light", kindle: "light", ignite: "light", torch: "light", lantern: "light",
  carve: "carve", scratch: "carve", etch: "carve", inscribe: "carve", write: "carve",
  // The gatehouse board. `board` is bare-only in there (GATEHOUSE_NOARG), so
  // "board up the door" stays a sentence; post/tear take arguments and must
  // always command.
  board: "board", noticeboard: "board", notices: "board",
  post: "post", pin: "post", notice: "post",
  tear: "tear", rip: "tear", unpin: "tear",
  claim: "claim", seal: "claim", extract: "claim", sign: "claim",
  stash: "stash", store: "stash", box: "stash",
  // THE DENS (mig 162). 'stow' moved off the lockbox and onto the den on
  // purpose: you STASH in a box you carry the key to, you STOW something in the
  // place you live. 'stash/store/box' still reach the lockbox untouched.
  settle: "settle", homestead: "settle", inhabit: "settle",
  abandon: "abandon", forsake: "abandon", vacate: "abandon",
  bar: "bar", barricade: "bar", fortify: "bar",
  bunk: "bunk", invite: "bunk", house: "bunk", shelter: "bunk",
  unbunk: "unbunk", evict: "unbunk", turnout: "unbunk",
  den: "den", home: "den", holding: "den", hearth: "den",
  stow: "stow", shelve: "stow",
  fetch: "fetch", unstow: "fetch",
  unstash: "unstash", unbox: "unstash",
  vault: "vault", bank: "vault", deposit: "vault",
  unvault: "unvault", withdraw: "unvault", retrieve: "unvault",
  publish: "publish", proclaim: "publish", announce: "publish",
  sheet: "sheet", score: "sheet", stats: "sheet", record: "sheet", tally: "sheet",
  leaderboard: "leaderboard", leaderboards: "leaderboard", boards: "leaderboard",
  ranks: "leaderboard", ranking: "leaderboard", rankings: "leaderboard",
  top: "leaderboard", standings: "leaderboard", reckoning: "leaderboard",
  map: "map", chart: "map", atlas: "map",
  study: "study", observe: "study", watch: "study", note: "study",
  journal: "journal", bestiary: "journal", logbook: "journal", ledger: "journal",
  fish: "fish", cast: "fish", angle: "fish",
  ring: "ring", toll: "ring", chime: "ring",
  listen: "listen", hark: "listen", eavesdrop: "listen",
  dive: "dive", swim: "dive", plunge: "dive",
  wash: "wash", scrub: "wash", rinse: "wash", clean: "wash",
  // The door in the wall. At a gate, 'in' is the gatehouse — the sanctuary, and
  // the only room in the world where other people can hear you and nothing else can.
  enter: "enter", in: "enter", inside: "enter", gatehouse: "enter",
  exit: "exit", out: "exit", outside: "exit", // NOT 'leave' — that's already 'drop'
  // A quiet word, one to one, in the gatehouse. Nobody else in the room hears it.
  tell: "tell", whisper: "tell", quietly: "tell",
  // A wanderer-to-wanderer trade, not the keeper's hatch ("trade"/"barter" stay
  // his alone). Named to match the chip it grows ("deal with X").
  deal: "deal", swap: "deal",
  smoke: "smoke", puff: "smoke", // light one from the tin. undocumented.
  cure: "cure", preserve: "cure", // hang raw meat in the smokehouse racks to keep it
  // The racks' opposite: a catch on a fire, wherever the fire is. NOT 'smoke'
  // (that word is the cigarette's, and the racks' when you stand in them) and
  // NOT 'burn' (which is destroying a thing, and means it elsewhere).
  cook: "cook", roast: "cook", grill: "cook", fry: "cook",

  squink: "squink", // means anything. not documented. never will be.
  xyzzy: "xyzzy", plugh: "xyzzy", frotz: "xyzzy", plover: "xyzzy", // the old words.
  help: "help", "?": "help", commands: "help", h: "help",
};

// Second words that belong to the verb, not the object: "pick up key",
// "look at rat", "put down torch".
const VERB_PARTICLES = new Set(["up", "down", "at", "on", "to", "with", "around"]);

// Words that never change what the player means: "kill the rat",
// "get a key please".
const FILLER = new Set(["the", "a", "an", "some", "my", "that", "this", "please"]);

function stripFiller(arg: string): string {
  return arg
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(" ");
}

// Damerau-Levenshtein distance, small-string edition — close enough to
// catch "atack", "invetory", "hlep".
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

function nearestVerb(word: string): string | null {
  let best: string | null = null;
  let bestDist = 3; // only suggest at distance 1-2
  for (const alias of Object.keys(VERB_ALIASES)) {
    if (alias.length < 3) continue; // don't suggest from one-letter aliases
    const dist = editDistance(word, alias);
    if (dist < bestDist) {
      bestDist = dist;
      best = alias;
    }
  }
  for (const dir of Object.keys(DIRECTIONS)) {
    if (dir.length < 3) continue;
    const dist = editDistance(word, dir);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

export function parse(input: string): ParseResult | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return null;

  // Leading apostrophe is classic MUD shorthand for say.
  if (text.startsWith("'")) {
    return { verb: "say", arg: text.slice(1).trim() };
  }

  const space = text.indexOf(" ");
  const head = (space === -1 ? text : text.slice(0, space)).toLowerCase();
  let rest = space === -1 ? "" : text.slice(space + 1).trim();

  // Bare direction = go <direction>. "north please" also counts.
  if (DIRECTIONS[head] && stripFiller(rest.toLowerCase()) === "") {
    return { verb: "go", arg: DIRECTIONS[head] };
  }

  const verb = VERB_ALIASES[head];
  // The bare noun carries its own intent: "lantern" alone means light THE
  // LANTERN. ("torch" predates it and stays the bare-light default.)
  if (verb === "light" && head === "lantern" && !rest) rest = "lantern";
  if (!verb) {
    const near = nearestVerb(head);
    if (near) {
      const reparse = parse(near + (rest ? " " + rest : ""));
      if (reparse && !("miss" in reparse)) {
        return { miss: true, suggestion: near + (rest ? " " + rest : "") };
      }
    }
    return { miss: true, suggestion: null };
  }

  // say keeps the player's original casing and filler words; a name is yours
  // exactly as you capitalize it; the wall gets your words verbatim.
  if (verb === "say") return { verb, arg: rest };
  if (verb === "shout") return { verb, arg: rest };
  if (verb === "tell") return { verb, arg: rest }; // "<name> <words>" — the words are theirs, verbatim
  if (verb === "name") return { verb, arg: rest };
  if (verb === "carve") return { verb, arg: rest };

  rest = rest.toLowerCase();

  // Swallow verb particles: "pick up key", "look at rat", "go to north".
  const restWords = rest.split(/\s+/).filter(Boolean);

  // Phrasal verbs that flip the meaning — now that gear can be worn, "put on X"
  // is wearing it, not dropping it ("put down X" stays a drop), and
  // "take off X" is removing it, not picking something up.
  if (restWords.length > 1) {
    if (head === "put" && restWords[0] === "on") {
      restWords.shift();
      return { verb: "equip", arg: stripFiller(restWords.join(" ")) };
    }
    if (head === "take" && restWords[0] === "off") {
      restWords.shift();
      return { verb: "remove", arg: stripFiller(restWords.join(" ")) };
    }
  }

  if (restWords.length > 0 && VERB_PARTICLES.has(restWords[0])) {
    // "go up" / "climb down" / "listen up": the particle IS the direction.
    if ((verb === "go" || verb === "listen") && DIRECTIONS[restWords[0]] && restWords.length === 1) {
      return { verb, arg: DIRECTIONS[restWords[0]] };
    }
    restWords.shift();
  }
  rest = stripFiller(restWords.join(" "));

  if (verb === "go") {
    const dir = DIRECTIONS[rest];
    return { verb, arg: dir ?? rest };
  }
  return { verb, arg: rest };
}

export const HELP_TEXT = [
  // WHAT YOU KEEP, SAID ONCE AND SAID FIRST (2026-08-07). A real player asked
  // outright whether their things survive logging off, and whether that only
  // works inside a gatehouse — which is the single most important rule in the
  // game and was written down NOWHERE. It was only ever implied, scattered
  // across four command entries (claim, stash, vault, quit), none of which say
  // the actual model: LEAVING IS FREE, DYING IS WHAT COSTS YOU.
  "WHAT YOU KEEP",
  "  Leaving is free. Log off anywhere — in the open, in the dark, deep in the",
  "  wood. Your wanderer and everything on you live on your KEY, and it is all",
  "  exactly where you left it when you come back. You never have to reach a",
  "  gate first. (One catch: if something is fighting you when you drop, your",
  "  body stands there and keeps swinging for 45 seconds. Pulling the plug is",
  "  not an escape.)",
  "",
  "  Dying costs you EVERYTHING YOU ARE CARRYING — sealed or not. The seal is",
  "  title, not armor: it cracks as the thing leaves your hands, and your gear",
  "  lies on the stones where you fell for anyone, or anything, to pick up.",
  "  There is no version of dying where the dungeon hands your pack back.",
  "",
  "  So the only things that are still yours tomorrow are the ones you LEFT",
  "  BEHIND. Bank before you go deep:",
  "    your pack     20 slots, on your body, every one of them at risk",
  "    the lockbox    8 slots, at any gate, takes anything, sealed or raw",
  "    the vault     50 slots, at any gate, sealed wealth only",
  "    your shelf    12 slots, in the den you built, out where you built it",
  "",
  "  Sealing ('claim', at a gate) puts the dungeon's mint on a piece and its",
  "  name in the book — that is what makes it provable, publishable, and the",
  "  vault's price of entry. It buys you nothing at all when you die.",
  "",
  "  GEAR WEARS OUT. Every blow you take grinds down what you are wearing and",
  "  every blow you land wears what you swing: sound, then worn, battered,",
  "  failing, and then it comes apart in your hands and is GONE for good. Mend",
  "  it at a gate ('repair') before it gets there — that costs scrap iron, and",
  "  it is always cheaper than the piece. Nothing repairs itself, and nothing",
  "  out in the world will fix it for you.",
  "",
  "Commands (short forms in parens):",
  "  look [thing]      (l, x, read, inspect) — the room, or a closer look at",
  "                    something in it. Look at ANYTHING the room mentions, not",
  "                    just what you can pick up: the gibbet, the millstones, the",
  "                    graves, the trees, the water, the walls. Most places have",
  "                    more to say than the first paragraph. It needs light —",
  "                    you cannot examine what you cannot see.",
  "  go <direction>    or just: n s e w u d",
  "                    THE FEN is the one crossing that weighs you: it carries",
  "                    a man and what keeps him alive — rations, torches and",
  "                    dressings free — and no more than 6 other things. Goods",
  "                    go round by the road, west or east, and always will.",
  "  say <words>       (') — speak to the room",
  "  shout <words>     (yell) — throw your voice through the walls: every",
  "                    neighboring room hears the words — and everything",
  "                    with ears comes to see who owns the voice.",
  "  ring              (toll) — ring the bell-buoy (a mile of crossing hears",
  "                    it), or a bell you carry: the drowned bell, the cast",
  "                    clapper, an unbound wether's bell. Every bell is a",
  "                    dinner bell with a name on it.",
  "  attack <mob>      (k, kill) — engage; combat resolves in rounds. Move to flee.",
  "                    A wanderer's name works too. Killing one drops EVERYTHING",
  "                    they carry, seals cracked — and their blood stays on your",
  "                    hands for anyone standing close enough to read.",
  "                    Two of a kind? 'attack second hyena' or 'look hyena 2'",
  "                    picks by the order the room lists them.",
  "                    You focus one foe, turning to the next the moment it falls —",
  "                    but everything on you hits back. Fast steel swings twice;",
  "                    sweeping steel drags through a crowd; light armor dodges",
  "                    and flees clean, heavy mail turns more but drags at escape.",
  "                    Combat narrows the world: no carving, claiming, stashing,",
  "                    renaming, or armor-swaps mid-fight; eating or swapping",
  "                    steel leaves an opening.",
  "                    Strike something that hasn't marked you and the first",
  "                    blow lands heavy. Wounded fighters (under a third of",
  "                    their blood) swing softer and fumble more — them too.",
  "  throw <item> at <mob>  its bite plus your arm; then it's on the stones",
  "  stance <how>      reckless | steady | guarded — trade offense for defense",
  "  get <item>        (take, grab) — pick something up. Mind the load: past a",
  "                    few loose pieces of gear the pack rides LOUD — no slipping",
  "                    blows, no clean break from a fight, and your moving can be",
  "                    heard. Trophies, food and the like stack silent forever.",
  "  drop <item>       put something down (mid-chase, this is how you get quiet)",
  "  equip <item>      (wield, wear) — put on a weapon or armor; your first is auto-equipped",
  "  remove <item>     (unequip) — take it off",
  "  unlock <cache>    (open, pry) — spend a found key on a locked strongbox and",
  "                    take what's inside. Keys are rare; the deep holds the best.",
  "  in                (enter) — at any gate: step INSIDE, into the gatehouse.",
  "                    Every gate opens on the same warm room: the keeper's hatch,",
  "                    the bench, the brazier, and whoever else came in off the",
  "                    dark. Nothing in the dungeon can reach you there. In the",
  "                    gatehouse ANYTHING YOU TYPE IS SPOKEN ALOUD, unless it's a",
  "                    command — it is the one room where a wanderer can be heard.",
  "  out               (exit) — back through the door, into the world.",
  "  settle            raise a den of your own on a holding. The ROOM is ground,",
  "                    not a seat — however many already live there, there is",
  "                    always room for another door, and yours is yours. It costs",
  "                    12 iron and 20 scrap carried out there — iron is smelted",
  "                    five scrap to the bar, so that is a season's salvage and",
  "                    the walk. You hold ONE anywhere in the world; 'abandon' gives",
  "                    it up and moves nothing off your shelf. An unbarred frame",
  "                    falls in if you stop coming home; bar the door and it",
  "                    stands until you give it up.",
  "  in / out          on a den site: through your own door, and back out onto",
  "                    the ground. The ground is public and always will be — the",
  "                    door is the only thing that is yours, and only once it is",
  "                    barred does anything stop at it.",
  "  bar               fit a bar and its sockets to your own door. 2 iron and 3",
  "                    scrap. Behind it nothing reaches you at all — no creature,",
  "                    no wanderer without a key. Unbarred it stops nothing, and",
  "                    most doors out there are unbarred.",
  "  bunk <name>       hand somebody a key. They have to be standing in front of",
  "                    you. (unbunk takes it back — from anywhere, and you don't",
  "                    have to be alive to type it.) Draw steel on anybody under",
  "                    a roof that isn't yours and that roof is shut to you for",
  "                    good: the key goes that instant, nobody can hand it back,",
  "                    and you can never settle the room yourself. Your things",
  "                    stay on its shelf and you can still collect them at the",
  "                    door.",
  "  stow <item>       put something down in your den. (fetch takes it back.)",
  "                    Nothing here is sealed against time the way the vault",
  "                    seals it — food ages on your shelf and iron wears. That",
  "                    is the difference between a bank and a house.",
  "  den               how your holding stands: the door, the bunks, the shelf,",
  "                    and how long it has left if you stop coming back.",
  "  deal <name>      strike an item-for-item trade with another wanderer —",
  "                    anywhere, in the world or the gatehouse. Both sides lay",
  "                    goods down; either side changing the table un-shakes both",
  "                    hands. No coin changes it — only what you both agree to",
  "                    carry. Sealed, worn, and journal pages never cross a deal.",
  "                    Steel drawn on either end calls the whole thing off.",
  "  tell <name> <...> (whisper) — in the gatehouse: lean in and speak to ONE",
  "                    person. The room doesn't hear it. It is the only thing you",
  "                    can say in this world that is truly sealed — it goes out",
  "                    encrypted to their key alone, and no relay keeps it.",
  "  salvage <gear>    (scrap) — at any gate: break steel down at the bench vice",
  "                    for scrap iron. The rarer the piece, the bigger the pile.",
  "  burn <item>       (destroy) — gone for good, no scrap, no trace. Anywhere.",
  "  forge [item]      (craft) — at any gate: work scrap iron (and the odd trophy)",
  "                    into gear. 'forge' alone reads the bench's recipe book.",
  "  repair <gear>     (mend) — at any gate: spend scrap iron to hammer out the",
  "                    wear. Do it before a piece is failing; past that it breaks",
  "                    for good and no amount of iron brings it back.",
  "  smelt             at any gate: five scrap iron into one bar at the brazier.",
  "                    Scrap is what the vice gives you; iron is what builds.",
  "  bandage [thing]   (bind, dress) — stop a bleed and close some of the wound",
  "                    with a dressing from your pack. Carry them BEFORE you need",
  "                    them: a bleed does not wait, and nothing out here sells to",
  "                    you in the dark.",
  "  cure <meat>       turn a raw joint into food that keeps. Behind any gate the",
  "                    racks are safe; the old smokehouse deep below the larder",
  "                    works too, if you bring a torch and can hold the room.",
  "  cook <catch>      (roast, grill) — a fish, an eel, a crab, an egg, over a",
  "                    fire on the stone. It heals a good deal more and it will",
  "                    NOT keep, which is the racks' job and not the fire's. Any",
  "                    gate's brazier does it free; out in the world it takes a",
  "                    torch set burning on the ground, and everything there can",
  "                    see the flame and smell the cooking.",
  "  smoke             light a cigarette. It steadies you for a breath. Out in the",
  "                    world the room sees the ember and so does the dark — inside",
  "                    a gatehouse it is only company.",
  "  barter            (trade) — at any gate: the keeper stocks kit and deals in",
  "                    kind. 'buy <thing>' names your want, then 'offer <thing>'",
  "                    lays goods on the counter until he's square. He gives no",
  "                    change, buys nothing outright, and touches nothing sealed.",
  "  dice              (bones) — the gatehouse bench only. Push your luck: two",
  "                    bones to open, then one at a time, and over 21 you're out",
  "                    where you stand. 'roll' takes another, 'stand' holds it.",
  "                    The answering hand has to BEAT you; a tie pushes. Whoever",
  "                    calls the game rolls first, and busting first loses before",
  "                    the other hand is touched. Bare 'dice' takes the bones up",
  "                    against the keeper for nothing; 'dice <trophy>' stakes one",
  "                    against his bowl ('dice bowl' just reads the table);",
  "                    'dice <name> [trophy]' calls out anyone by the fire.",
  "                    Trophies or nothing — never gear, never food.",
  "  bounty            the keeper's OTHER board: named trophies, paid in a meal.",
  "                    Not a better price than his shelves — what it pays is food",
  "                    he never stocks, and it pays when the shelves are bare.",
  "                    'bounty' reads it; 'bounty claim <trophy>' hands the trophy",
  "                    over. Each posting pays you once; the board turns over every",
  "                    hour or so, and everyone reads the same four.",
  "  fish              (cast) — at any standing water: the black fen, the drowned",
  "                    orchard, the flooded quarry, and the Tideways' pools far",
  "                    below. The catch is rare, but a fish is good food, and the",
  "                    surface waters wake under rain.",
  "  listen [dir]      (hark) — press an ear to the dark and take the next rooms",
  "                    by sound: breathing, bone, water, a fight, someone keeping",
  "                    still. Quiet — nothing hears you doing it.",
  "  dive [item]       (swim) — in a tide-drowned room: go under and feel across",
  "                    the flooded floor; name a thing to bring it up. The splash",
  "                    carries, and everything with ears knows where you are.",
  "  wash              (scrub, rinse) — at any water, or in the rain: scrub a",
  "                    killing off your hands. The blood a murder leaves on you",
  "                    fades on its own; water takes it now. Anyone watching",
  "                    sees you do it.",
  "  rest              sit and let wounds close. Any effort ends it.",
  "  guard / lean / crouch",
  "                    stand a way, and keep standing it. Anyone who comes in",
  "                    afterwards sees it on you. Type the same word again to",
  "                    stand out of it. Any effort ends it too, same as a rest.",
  "  point <thing>     hold a hand out toward something — a door, a direction, a",
  "                    beast, anything lying there. The hand stays out. It says",
  "                    there is something here and nothing whatever about it,",
  "                    which is generally all you want to say. Bare 'point'",
  "                    lowers the hand again.",
  "  beckon [name]     call someone on with a hand.",
  "  wave [name]       a raised hand. If your hands are empty the room",
  "                    says so, and to an armed stranger in a dark corridor that",
  "                    is the only sentence that matters. It is not refused with",
  "                    steel in your fist; it just does not read the same.",
  "  nod [name]        the passing acknowledgement. Claims nothing.",
  "  brow [name]       two fingers to the brow. The road's own",
  "                    courtesy, and the one to give the keeper.",
  "  dance             mostly it is a few steps of something, alone. Not always.",
  "  keen              grieve where you are standing. The ground",
  "                    remembers who fell on it, and so does this.",
  "  sing              a human noise. The dark takes most of it.",
  "  whistle           one hard note. It carries into the next room, and it wakes",
  "                    what is sleeping in this one. Consider what that is first.",
  "  eat <food>        wounds also close from the inside",
  "  feed <bird> <food> hold out food to a raven or crow. One that has been",
  "                    working the road may drop what it picked up for the meal",
  "                    — sometimes. Never a certainty, and never from a bird",
  "                    carrying nothing.",
  "  light             (kindle) — set a carried torch burning. It shows the",
  "                    lightless deep and burns a while before it gutters out;",
  "                    an open flame sends some things fleeing. 'light lantern'",
  "                    burns a hooded lantern instead: three times the burn,",
  "                    kept in the pack — but a tame flame frightens nothing.",
  "  carve <words>     scratch up to 40 characters into the stone; it weathers within a day",
  "  claim [item]      at any gate — the dungeon seals your claim on what you carry",
  "  stash <item>      at any gate — the lockbox (8 slots) holds ANYTHING you",
  "                    don't want to lose on the run. 'stash' alone looks inside.",
  "  unstash <item>    take something back out of the lockbox",
  "  vault <item>      at any gate — the vault (50 slots) banks SEALED wealth.",
  "                    'vault' alone looks inside; 'unvault' draws it back out.",
  "  sheet             (score, stats) — your ledger: kills, deaths, kings,",
  "                    wanderers, and your age under this name.",
  "  leaderboard       (boards, top) — the dungeon's reckoning: the mighty who",
  "                    entered the boards. 'publish score' enters you.",
  "  publish sheet|<item>  (proclaim) — the dungeon speaks your claim to the relays.",
  "                    Nothing is ever published unless you ask.",
  "  publish score     (rank) — post your standing to the leaderboards: your",
  "                    trophies, and your legend of kills.",
  "  publish kind 1    (brag) — post your wanderer to your OWN feed, in your own",
  "                    hand — a note your followers will see. Only this touches it.",
  "  map               (chart) — open a map you carry. A surveyor's map charts the",
  "                    halls its carrier walks, set down true — steal a full one;",
  "                    a crude one is half a lie and will walk you wrong.",
  "  study <mob>       (observe) — with a journal IN HAND, watch a creature and note",
  "                    its habits. Study it AND kill it to fill out the account:",
  "                    three for the heaviest things in the world, eight for the",
  "                    small stuff you trip over — the price runs by what it is,",
  "                    so a rat's page is a record that you really did hunt them.",
  "                    A full account reads what the thing IS: where it came from,",
  "                    what it wants, and what the world made it.",
  "  journal           (bestiary) — open your journal: everything you've logged. You",
  "                    must carry it to write in it (kills and study); leave it in the",
  "                    lockbox to keep it safe between hunts. It drops when you die,",
  "                    and can be taken — your logs with it.",
  "  inventory         (i) — what you carry",
  "  who               everyone awake in the dungeon",
  "  name <newname>    choose what the dungeon calls you",
  "  quit              (leave, exit) — step back out through the door. Your",
  "                    wanderer and everything sealed wait for your return.",
  "  help              (?) — this text",
  "",
  "Wounds do not close on their own. The dead stay dead until something",
  "new finds its way in. What you drop stays where you dropped it.",
  // This said "unsealed loot scatters where you die; what the dungeon sealed,
  // the dungeon returns" — the ORIGINAL loot rule, from before 2026-07-05.
  // zone.ts's death path has said the opposite ever since: everything carried
  // scatters, sealed included, and the mint is VOIDED on the way down (the seal
  // is title, not armor — only the lockbox protects). The footer outlived the
  // rule by a year and taught every reader exactly the wrong lesson about the
  // one decision that matters most.
  "What you carry, you carry at risk. Everything on your body scatters where",
  "you die — seal and all, and the mint voided. Only what you left behind at",
  "a gate, or on your own shelf, is still yours in the morning.",
  // THE DOORS MOVED AND THIS DID NOT (2026-08-07). It still said "four gates:
  // three on the walls, and the waystation out on the old road" — which was
  // true before the road's door moved (mig 174) and before the wood got three
  // of its own. Seven, verified against the rows. It matters more than a count:
  // the keeper's telling is keyed to WHICH DOOR YOU BANKED AT, so a player who
  // believes there are four doors, all of them fortress-and-road, never learns
  // the wood has a story at all. The sewer line went too — the Sewer Mouth is
  // not a gate, and every one of its ways is two-way.
  // TEN, AND THE DOORS MOVED AGAIN (2026-08-16). Seven was right until the
  // Crossing shipped with two of its own and the road gained the relay house.
  // Verified against the is_entry rows, and it matters for the same reason it
  // did in August: a wanderer who believes there are seven doors, all fortress
  // and road and wood, never learns the crossing has gates at all.
  "Ten gates: three on the walls, two out on the road — the first milestone",
  "and the relay house — three in the wood, being the timber stack, the withy",
  "hut and the gate arch of the old holding, and two on the crossing, the",
  "ferry house and the crossing house. You drop in, extract, and bank at any",
  "of them. Which door you bank at decides what the keeper tells you, so a",
  "wanderer who only ever runs for the keep never hears a word about the wood.",
  "",
  // AND DYING DOES NOT PUT YOU AT ONE, which this used to say outright. Spawns
  // stopped being gates in mig 126 and randomGate (which serves both a fresh
  // wanderer and a dead one) draws the Waystation and the open road alongside
  // the three fortress thresholds.
  "Waking is not the same as banking. Death puts you at a SPAWN — one of the",
  "fortress thresholds, the old waystation, or somewhere out on the open road",
  "— or at your own door, if you have raised a den. Only three of the five",
  "ways you can wake are a gate, so do not count on standing at one.",
  "",
  // This list is WHAT TO TYPE. How any of it actually works — armour, weight,
  // bleeding, the dens, why the world keeps going while you are away — is the
  // guide's job, and it deliberately prints no numbers.
  "This is the list of commands. For how the world actually WORKS — what",
  "armour does, what weight costs you, why some things bleed you and some",
  "cave you in — read nomadmud.com/guide.",
].join("\n");
