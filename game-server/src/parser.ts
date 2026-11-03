// MUD-traditional verb + object parser — no NLP, but forgiving: natural
// aliases ("grab", "pick up"), articles stripped ("kill the rat"), and a
// did-you-mean suggestion when the verb is close but wrong.

export type Verb =
  | "invite"
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
  | "scan"
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
  | "skies"
  | "name"
  | "rest"
  | "eat"
  | "feed"
  | "bandage"
  | "light"
  | "fill"
  | "douse"
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
  | "campfire"
  | "squink"
  | "enter"
  | "exit"
  | "tell"
  | "xyzzy"
  | "deal"
  | "settle"
  | "abandon"
  | "bar"
  | "build"
  | "stretch"
  | "bolt"
  | "draw"
  | "bunk"
  | "unbunk"
  | "den"
  | "stow"
  | "fetch"
  | "place"
  | "pvp"
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
  | "emote"
  | "follow"
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

export const VERB_ALIASES: Record<string, Verb> = {
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
  skies: "skies",
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
  // One word each, like the gestures, and for the same gatehouse reason.
  emote: "emote",
  follow: "follow",
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
  // THE LANTERN'S WELL (2026-10-16): fat goes in, and the shutter comes down.
  fill: "fill", refill: "fill", refuel: "fill",
  douse: "douse", snuff: "douse", shutter: "douse", extinguish: "douse", quench: "douse",
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
  build: "build", construct: "build",
  stretch: "stretch", scrape: "stretch", tan: "stretch",
  draw: "draw",
  bolt: "bolt", tunnel: "bolt",
  bunk: "bunk", invite: "invite", house: "bunk", shelter: "bunk",
  unbunk: "unbunk", evict: "unbunk", turnout: "unbunk",
  den: "den", home: "den", holding: "den", hearth: "den",
  stow: "stow", shelve: "stow",
  fetch: "fetch", unstow: "fetch",
  place: "place",
  pvp: "pvp",
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
  scan: "scan", sight: "scan", glass: "scan",
  journal: "journal", bestiary: "journal", logbook: "journal", ledger: "journal",
  fish: "fish", cast: "fish", angle: "fish",
  ring: "ring", toll: "ring", chime: "ring",
  listen: "listen", hark: "listen", eavesdrop: "listen",
  dive: "dive", swim: "dive", plunge: "dive",
  wash: "wash", scrub: "wash", rinse: "wash", clean: "wash",
  // The door in the wall. At a gate, 'in' is the gatehouse — the sanctuary, and
  // the only room in the world where other people can hear you and nothing else can.
  enter: "enter", in: "enter", inside: "enter", gatehouse: "enter",
  // NOT 'leave' — that's already 'drop' — and not 'exit' either: bare 'exit'
  // is quit everywhere, the gatehouse included, and the client takes it first.
  out: "exit", outside: "exit",
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
  // Make a fire in the open, or feed the one burning ('light fire' and 'feed
  // fire' reach it too, through light and feed).
  campfire: "campfire", bonfire: "campfire", stoke: "campfire",

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
    // NEVER RE-ASK THE SAME WORD (rome, 2026-10-22: "soups nice" froze the
    // gatehouse). "soups" is nearest to the direction "south", and a direction
    // with words after it is not a verb, so "south nice" came back here and
    // found "south" nearest to itself - forever, until the stack ran out and
    // took the whole message with it.
    const near = nearestVerb(head);
    if (near && near !== head) {
      const reparse = parse(near + (rest ? " " + rest : ""));
      if (reparse && !("miss" in reparse)) {
        return { miss: true, suggestion: near + (rest ? " " + rest : "") };
      }
    }
    return { miss: true, suggestion: null };
  }

  // say keeps the player's original casing and filler words; a name is yours
  // exactly as you capitalize it; the wall gets your words verbatim.
  if (verb === "invite") return { verb, arg: input.trim().slice(head.length).trim() };
  if (verb === "say") return { verb, arg: rest };
  if (verb === "emote") return { verb, arg: rest }; // your words as you typed them
  if (verb === "shout") return { verb, arg: rest };
  if (verb === "tell") return { verb, arg: rest }; // "<name> <words>" — the words are theirs, verbatim
  if (verb === "name") return { verb, arg: rest };
  if (verb === "carve") return { verb, arg: rest };
  // ...and so does the gatehouse board: a notice goes up as you wrote it,
  // capitals and all (rome, 2026-09-28).
  if (verb === "post") return { verb, arg: rest };

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

// THE LEAN HELP (rome, 2026-11-01). What you keep, then every command on a
// line or two, grouped by what you are doing. The long form of every command,
// and how the world works, is the guide (guide.ts, nomadmud.com/guide) — this
// is only what to type. Checked against the parser and the code that day: keep
// it true when a command changes, and add a command here when you add one.
export const HELP_TEXT = [
  "WHAT YOU KEEP",
  "  Log off anywhere: you and everything on you wait where you left them.",
  "  Die, and everything you carry stays where you fell, sealed or not.",
  "  What survives is what you left behind: the lockbox and the vault at any",
  "  gate, or the shelf in your own den.",
  "",
  "GETTING ABOUT",
  "  look [thing]       (l) the room, or anything in it. 'look east' for a bearing",
  "  n s e w u d        go that way (or 'go north')",
  "  in / out           into a gatehouse or your den, and back out",
  "  listen [dir]       hear what is in the rooms around you",
  "  scan               from a height or an edge, see one step out",
  "  map                open a map you carry",
  "  dive [item]        go under in drowned rooms and feel for what is there",
  "",
  "FIGHTING",
  "  attack <foe>       (k) fight. Blows land every four seconds; walk off to flee",
  "  throw <item> at <foe>",
  "  stance <how>       reckless, steady or guarded",
  "  bandage            stop a bleed with a dressing from your pack",
  "  rest               let wounds close. Any effort ends it",
  "  pvp on|off         at a gate: fight other wanderers or not. Once on, it stays",
  "                     on until you turn it off, and that only after a day",
  "",
  "YOUR THINGS",
  "  inventory          (i) what you carry",
  "  get / drop <item>",
  "  equip / remove <item>",
  "  eat <food>",
  "  light / douse      a torch or a lantern. 'fill lantern' feeds it fat",
  "  unlock <box>       open a locked box with its key",
  "  burn <item>        destroy something for good",
  "",
  "AT A GATE",
  "  claim [item]       seal a piece as yours",
  "  stash / unstash    the lockbox: 8 slots, takes anything",
  "  vault / unvault    the vault: 50 slots, gear is sealed going in",
  "  barter, buy, offer trade with the keeper, in kind",
  "  bounty             the keeper's board of trophies he pays for in meals",
  "  salvage, smelt     break gear down for scrap, and scrap into iron",
  "  forge, repair      make gear, and mend it",
  "  dice               a game on the gatehouse bench",
  "  board, post, tear  the notice board inside",
  "  tell <name> <words>  a private word, in the gatehouse",
  "",
  "FOOD AND FIRE",
  "  cook <catch>       over a gate's brazier or a campfire",
  "  cure <meat>        on a smoke rack, so it keeps",
  "  campfire           light one from split wood",
  "  fish               at open water",
  "  feed <bird> <food>",
  "  smoke              light a cigarette",
  "",
  "A PLACE OF YOUR OWN",
  "  settle             raise a den, well out from the gates",
  "  bar                fit a bar to your door",
  "  build [thing]      what else a den can have",
  "  stow / fetch       put things on your shelf, and take them back",
  "  bunk / unbunk <name>  hand someone a key, and take it back",
  "  den                how your holding stands",
  "  stretch, draw water, bolt   the frame, the water butt, the bolt-hole",
  "  abandon            give your den up",
  "",
  "OTHER WANDERERS",
  "  say <words>        (') to the room",
  "  shout <words>      to the rooms around, and everything with ears",
  "  deal <name>        trade item for item",
  "  emote <words>      the room sees your name, then your words",
  "  follow <name>      go where they go. 'follow' alone stops",
  "  wash               scrub blood off your hands",
  "  guard, lean, crouch, point, beckon, wave, nod, brow",
  "  dance, keen, sing, whistle, ring",
  "",
  "MARKS AND RECORDS",
  "  carve <words>      scratch words into a surface",
  "  carve rock         work a loose rock into a small carving",
  "  place <carving>    set a carving down and leave it there",
  "  study <creature>   note what it does, in a journal you carry",
  "  journal [creature] read your journal",
  "  sheet              your ledger",
  "  leaderboard        the boards",
  "  publish            sheet, score, an item, or kind 1",
  "  invite [message]   a letter and a link for someone new",
  "  who                who is awake",
  "  name <new name>    what the world calls you",
  "  alias <word> = <command>  your own short word for it. 'alias' lists them,",
  "                     'unalias <word>' drops one",
  "  quit               step out (everything waits for you)",
  "  fullscreen         fill the screen",
  "",
  "Every command in full, and how the world works: nomadmud.com/guide",
].join("\n");
