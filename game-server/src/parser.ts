// MUD-traditional verb + object parser — no NLP, but forgiving: natural
// aliases ("grab", "pick up"), articles stripped ("kill the rat"), and a
// did-you-mean suggestion when the verb is close but wrong.

export type Verb =
  | "look"
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
  | "forge"
  | "repair"
  | "barter"
  | "buy"
  | "offer"
  | "inventory"
  | "who"
  | "name"
  | "rest"
  | "eat"
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
  | "map"
  | "study"
  | "journal"
  | "fish"
  | "listen"
  | "dive"
  | "smoke"
  | "squink"
  | "xyzzy"
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

const DIRECTIONS: Record<string, string> = {
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
  unlock: "unlock", open: "unlock", pry: "unlock", force: "unlock",
  salvage: "salvage", scrap: "salvage", dismantle: "salvage", break: "salvage",
  forge: "forge", craft: "forge", make: "forge", smith: "forge",
  repair: "repair", mend: "repair", fix: "repair",
  barter: "barter", trade: "barter", shop: "barter", browse: "barter", fence: "barter",
  buy: "buy", purchase: "buy",
  offer: "offer", pay: "offer", sell: "offer", give: "offer",
  inventory: "inventory", inv: "inventory", i: "inventory", bag: "inventory", items: "inventory",
  who: "who", players: "who",
  name: "name", rename: "name", callme: "name",
  rest: "rest", sleep: "rest", sit: "rest", camp: "rest",
  eat: "eat", consume: "eat", chew: "eat", devour: "eat",
  bandage: "bandage", bind: "bandage", dress: "bandage", bandages: "bandage",
  light: "light", kindle: "light", ignite: "light", torch: "light", lantern: "light",
  carve: "carve", scratch: "carve", etch: "carve", inscribe: "carve", write: "carve",
  claim: "claim", seal: "claim", extract: "claim", sign: "claim",
  stash: "stash", store: "stash", box: "stash", stow: "stash",
  unstash: "unstash", unbox: "unstash",
  vault: "vault", bank: "vault", deposit: "vault",
  unvault: "unvault", withdraw: "unvault", retrieve: "unvault",
  publish: "publish", proclaim: "publish", announce: "publish",
  sheet: "sheet", score: "sheet", stats: "sheet", record: "sheet", tally: "sheet",
  map: "map", chart: "map", atlas: "map",
  study: "study", observe: "study", watch: "study", note: "study",
  journal: "journal", bestiary: "journal", logbook: "journal", ledger: "journal",
  fish: "fish", cast: "fish", angle: "fish",
  listen: "listen", hark: "listen", eavesdrop: "listen",
  dive: "dive", swim: "dive", plunge: "dive",
  smoke: "smoke", puff: "smoke", // light one from the tin. undocumented.
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
  "Commands (short forms in parens):",
  "  look [thing]      (l, x) — the room, or a closer look at something in it",
  "  go <direction>    or just: n s e w u d",
  "  say <words>       (') — speak to the room",
  "  shout <words>     (yell) — throw your voice through the walls: every",
  "                    neighboring room hears the words — and everything",
  "                    with ears comes to see who owns the voice.",
  "  attack <mob>      (k, kill) — engage; combat resolves in rounds. Move to flee.",
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
  "  get <item>        (take, grab) — pick something up",
  "  drop <item>       put something down",
  "  equip <item>      (wield, wear) — put on a weapon or armor; your first is auto-equipped",
  "  remove <item>     (unequip) — take it off",
  "  unlock <cache>    (open, pry) — spend a found key on a locked strongbox and",
  "                    take what's inside. Keys are rare; the deep holds the best.",
  "  salvage <gear>    (scrap) — at any gate: break steel down at the bench vice",
  "                    for scrap iron. The rarer the piece, the bigger the pile.",
  "  forge [item]      (craft) — at any gate: work scrap iron (and the odd trophy)",
  "                    into gear. 'forge' alone reads the bench's recipe book.",
  "  repair <gear>     (mend) — at any gate: spend scrap iron to hammer out the wear",
  "  barter            (trade) — at any gate: the keeper stocks kit and deals in",
  "                    kind. 'buy <thing>' names your want, then 'offer <thing>'",
  "                    lays goods on the counter until he's square. He gives no",
  "                    change, buys nothing outright, and touches nothing sealed.",
  "  fish              (cast) — only from the Pocket of Air: drop a line into the",
  "                    flood below. The catch is rare, but a fish is good food.",
  "  listen [dir]      (hark) — press an ear to the dark and take the next rooms",
  "                    by sound: breathing, bone, water, a fight, someone keeping",
  "                    still. Quiet — nothing hears you doing it.",
  "  dive [item]       (swim) — in a tide-drowned room: go under and feel across",
  "                    the flooded floor; name a thing to bring it up. The splash",
  "                    carries, and everything with ears knows where you are.",
  "  rest              sit and let wounds close. Any effort ends it.",
  "  eat <food>        wounds also close from the inside",
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
  "  vault <item>      at any gate — the vault (40 slots) banks SEALED wealth.",
  "                    'vault' alone looks inside; 'unvault' draws it back out.",
  "  sheet             (score, stats) — your ledger: kills, deaths, kings,",
  "                    wanderers, and your age under this name.",
  "  publish sheet|<item>  (proclaim) — the dungeon speaks your claim to the relays.",
  "                    Nothing is ever published unless you ask.",
  "  map               (chart) — open a map you carry. A surveyor's map is true;",
  "                    a crude one is half a lie and will walk you wrong.",
  "  study <mob>       (observe) — with a journal IN HAND, watch a creature and note",
  "                    its habits. Study it AND kill a few to fill out its account.",
  "  journal           (bestiary) — open your journal: everything you've logged. You",
  "                    must carry it to write in it (kills and study); leave it in the",
  "                    lockbox to keep it safe between hunts. It drops when you die,",
  "                    and can be taken — your logs with it.",
  "  inventory         (i) — what you carry",
  "  who               everyone awake in the dungeon",
  "  name <newname>    choose what the dungeon calls you",
  "  help              (?) — this text",
  "",
  "Wounds do not close on their own. The dead stay dead until something",
  "new finds its way in. What you drop stays where you dropped it.",
  "What you carry is provisional until a gate seals it: unsealed loot",
  "scatters where you die; what the dungeon sealed, the dungeon returns.",
  "Four gates: three on the walls, and the waystation out on the old road.",
  "You drop in, extract, and bank at any of them; death wakes you at a",
  "random one. The sewer is a thief's door — a way in, never an out.",
].join("\n");
