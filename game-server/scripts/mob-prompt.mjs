// WRITE THE GENERATION PROMPT for one creature, ready to paste.
//
//   node scripts/mob-prompt.mjs hill-wolf
//   node scripts/mob-prompt.mjs hill-wolf idle move-a move-b attack rest death feed call
//
// With no poses given it proposes a set from what the world actually makes that
// creature do — a scavenger gets `feed`, a grazer gets `graze`, a pack caller
// gets `call` — and from what its strip is already missing. Override by listing
// poses yourself.
//
// The exact in-game description is pulled live from D1, because that prose is
// the subject paragraph and paraphrasing it is how a creature stops looking like
// itself. Attach an approved sheet as the style reference when you paste this.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const [id, ...given] = process.argv.slice(2);
if (!id) { console.error("usage: node scripts/mob-prompt.mjs <creature-id> [pose|pose=wording …]"); process.exit(2); }

// A POSE MAY CARRY ITS OWN WORDING: `graze=Turning wrack over with one boot`.
// SAY below is deliberately species-neutral - "head down cropping the ground"
// is right for a hind and wrong for a man working a tideline, and the pose NAME
// is what the client looks up, so the two have to be able to differ. Split the
// wording off here; the name is what goes in the cut command.
const WORDING = {};
for (let i = 0; i < given.length; i++) {
  const eq = given[i].indexOf("=");
  if (eq > 0) { WORDING[given[i].slice(0, eq)] = given[i].slice(eq + 1); given[i] = given[i].slice(0, eq); }
}

// --- what the world makes this one do -------------------------------------
const zd = fs.readFileSync(path.join(GAME, "src/zone-data.ts"), "utf8");
const inSet = (n) => {
  // PREYS_ON is a Map of predator -> prey, so the plain contains-test would call
  // every PREY a predator. Its keys are the only half that matters here.
  if (n === "PREYS_ON") {
    const i = zd.indexOf("export const PREYS_ON");
    if (i < 0) return false;
    const body = zd.slice(i, zd.indexOf("\n]);", i));
    return [...body.matchAll(/\[\s*"([a-z0-9-]+)"\s*,\s*new Set/g)].some((m) => m[1] === id);
  }
  const i = zd.search(new RegExp("^export const " + n + " = new Set", "m"));
  if (i < 0) return false;
  return zd.slice(i, zd.indexOf("]);", i)).includes(`"${id}"`);
};
const src = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
let blk = src.slice(src.indexOf("var MOB_ANIM = {")); blk = blk.slice(0, blk.indexOf("\n};"));
const row = blk.match(new RegExp(`^\\s{2}"${id}":\\s*\\{ n: \\d+, aspect: [\\d.]+, f: (\\{[^}]*\\})`, "m"));
const had = row ? Object.keys(JSON.parse(row[1])) : [];
const flyer = had.includes("up");

// --- WHAT THE WORLD ASKS FOR, AND WHAT THE DRIVER CAN ACTUALLY SHOW ---------
//
// EVERY POSE LIST BEFORE THIS ONE WAS PICKED BY HAND, and the hand only ever
// checked NAPPERS. That is why every sheet drawn this month came back with a
// sleep frame and not one came back with a feeding frame, while thirty
// creatures that eat on a schedule had nothing to eat with. The table below is
// the whole of it: each behaviour set in zone-data.ts that a frame answers,
// the frame it wants, and - the part that matters - WHERE IN public.ts that
// frame is read. If a row cannot name the reader, the frame is decoration.
//
// Do not add a row from the set's NAME. Read what reads it first.
//
// THE FOURTH COLUMN IS THE LIST THE FRAME IS SEARCHED THROUGH, or null when the
// frame fires on an event of its own. A slot is filled ONCE, with the first name
// in its list the creature owns, so a napper can never show `graze` - CALM_POSES
// opens with `rest` and the loop stops there. An event frame is asked for by
// name and nothing shadows it, which is why the SAME `feed` name is dead weight
// on a starve-hunter and essential on a vermin.
//
// AND EVERY WAY AN ANIMAL EATS NOW REACHES THE PICTURE (2026-09-18). `fxFed`
// used to fire from one place only, so the vulture was the sole creature whose
// eating was ever drawn - a grazer cleared its hunger and printed a line while
// its sprite stood idle. Two calls fixed that. The eating rows are therefore all
// EVENTS, and nothing shadows them.
const WANTS = [
  ["SCAVENGERS",     "feed",         "the fed event",                            null],
  ["VERMIN",         "feed",         "the fed event, once hungry",               null],
  ["LURKERS",        "feed",         "the fed event, once hungry",               null],
  ["PREYS_ON",       "feed",         "the fed event, on a kill it runs down",    null],
  ["GRAZERS",        "graze",        "the fed event, grazing forage ground",     null],
  ["THIEVES",        "snatch-escape","travel branch, first 55% of the crossing", null],
  ["NAPPERS",        "rest",         "SLEEP_POSES head + CALM_POSES head",       "CALM"],
  ["ALARM_CALLERS",  "alert-alarm",  "WATCH_POSES slot 3",                       "WATCH"],
];
// The real preference lists, read out of public.ts so this cannot drift from the
// driver the way a copied constant would.
const LISTS = {};
for (const [k, n] of [["CALM", "CALM_POSES"], ["WATCH", "WATCH_POSES"]]) {
  const i = src.indexOf("var " + n + " = [");
  LISTS[k] = [...src.slice(i, src.indexOf("];", i)).replace(/\/\/[^\n]*/g, "")
    .matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
}
// Unreachable only when the winner sits EARLIER in the list than the wanted
// frame. "Is something else picked" is the wrong question and gets the tail of a
// list backwards - WATCH_POSES ends with `idle`, which everything owns.
// EAT_POSES, read from the driver. One eat frame is resolved per creature, so a
// creature that owns EITHER name can answer the fed event and every eating row
// is satisfied by it. Asking a crab for `feed` AND `graze` would be asking for a
// cell the driver has no second slot for.
const EAT = (() => {
  const t = src.indexOf("var EAT_POSES = [");
  return [...src.slice(t, src.indexOf("];", t)).matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
})();
const eats = (poses) => poses.some((p) => EAT.includes(p));
const shadowedBy = (key, poses, frame) => {
  const l = LISTS[key] || [], b = l.indexOf(frame);
  const won = l.find((p) => poses.includes(p));
  return won && b >= 0 && l.indexOf(won) < b ? won : null;
};
// SETS WITH NO FRAME AT ALL. Named here so the next pass does not rediscover
// them as an idea: nothing in the driver reads these, and a cell spent on one
// is a cell burned.
//   DRINKERS / PACK_CALLERS / RUNNERS - 28 creatures, no branch reads drink,
//     call or flee. The names exist in SAY and nowhere else.
//   BITERS / BEAKS / COILS / SMALL_BITE - text registers (zone.ts:7263,:7282).
//     They pick the wording of a hit message. They never want a picture.
//   DROWNERS - seize and hold, excluded from starve-hunting (ai.ts:1494).
//     Not a feeding route.
const DEAD_NAMES = { drink: "DRINKERS", call: "PACK_CALLERS", flee: "RUNNERS",
  // A POSE CAN BE DEAD FOR A SECOND REASON: the cell law forbids the thing it
  // is about. SURFACERS climb up out of the wells and the oubliettes, which is
  // a real behaviour and sounds like a real frame - but the sheet draws NO
  // ground, no floor, no edge, no hole, and a body defined entirely by its
  // relation to a hole that is not drawn is a body floating upright in empty
  // magenta gripping nothing. It came back exactly that way.
  //
  // The test for any new pose: cover the scenery and ask whether the BODY still
  // says what the pose means. A crouch says crouch. A lunge says lunge. Climbing
  // out says nothing at all without the edge, so it cannot be asked for.
  surface: "SURFACERS - the cell has no edge to climb out of" };
// POSES THAT ARE OUT BY RULING, not by mechanism. The driver reads both of these
// perfectly well; rome has decided twice that a cell is not to be spent on them,
// and both times a later pass put them back - because a new spec was built from
// what the OLD strip already carried, and the old strips carry them. Reading the
// existing frames forward is exactly how a settled decision gets un-settled.
//
// So the generator refuses them outright, the same way it refuses a dead name. A
// creature that already has one keeps it until its sheet is redrawn; no new sheet
// is allowed to ask for one.
const RULED_OUT = {
  // HIT IS THE ONE THAT IS OUT, and recover stays (rome, 2026-09-21). I had
  // these the wrong way round for most of a day and acted on it twice - first
  // deleting recover frames out of eight drawn sheets, then writing two redraw
  // prompts around hit. The frame that goes is the STRUCK one, the flinch when
  // a blow lands on the creature. The settle afterwards is kept.
  hit: "the struck frame - out by ruling 2026-09-17",
};


// WHAT EACH OF THE CROSSING'S DEAD IS DOING IN EACH FRAME.
//
// SAY below is species-neutral by design and cannot carry these: "head down
// cropping the ground" is right for a hind and meaningless for a man notching a
// tally. Without an entry here a work pose falls through to its own hyphenated
// name - "feed the flue" - which is not a drawing instruction, and the sheet
// comes back generic.
//
// Every line here is written to the law above: the BODY makes the shape and the
// thing being worked on is never named, because naming it draws it.
const WALK_A = "Contact pose A: One leg reaches forward with the heel making contact, while the opposite leg trails behind. The body is transferring weight forward.";
const WALK_B = "Passing pose B: The rear leg has swung forward, with its knee bent and foot lifted, passing beside the planted supporting leg. The legs are close together, not spread apart.";
const LINES = {
// THE WOOD SLOTH (rome, 2026-10-21): it lives on the ground, never hangs, and
// its claws are SHORT and the same size in every cell - they kept coming back a
// different length each frame. The walk is the four-legged one (QUAD_WALK).
// The bear's standing frame and the hedgehog's own five, as their 2026-10-21
// sheets were drawn - they lived only in the handed-over prompt until now.
"brown-bear": {
  "inspect-upright": "Reared up on its hind legs to full height, forepaws hanging, head up and turned toward the viewer",
},
"hedgehog": {
  attack: "Lunging forward with a snap of the snout, spines raised",
  graze: "Nose down rooting through unseen leaf litter",
  rest: "Asleep curled loosely, nose tucked under, spines flat",
  "curl-up": "Rolled completely into a tight ball of raised spines, no face, no legs showing",
  alert: "Frozen with nose up and spines half raised along the back",
},
"wood-sloth": {
  idle: "Sitting on its haunches, short claws folded in front, head turned mildly toward the viewer",
  attack: "Rearing back and swinging one front paw in a slow wide swipe, its short claws out",
  graze: "Sitting and holding a bunch of leaves to its mouth with both front paws, chewing",
  rest: "Asleep curled on the ground into a bundle of fur, paws wrapped round itself",
  "reach-up": "Sitting up tall and reaching straight up overhead with one front paw, as if hooking an unseen branch above",
  alert: "Sitting still with its head turned fully round toward the viewer, small mild face",
},
// THE REDO OF 2026-10-18 (nine cells, no recover). These three had no LINES of
// their own; the carrier's two work poses are the wording his sheet was drawn
// with, and the strand thief's graze is the wrack-turning his description gives.
"cutthroat": {
  alert: "Has seen you and squared up to you: weight forward on both feet, the head up and the eyes on you, ready to move, the thin knife held low and out in front",
  rest: "Asleep, lying up low on the ground",
  graze: "Crouched on his heels going through something on the ground with both hands, head down over it. What he is going through is NOT drawn",
  attack: "A fast slash with the thin knife, swung flat across at throat height, the body low",
},
"road-carrier": {
  alert: "Has seen you and squared up to you: weight forward on both feet, the head up and the eyes on you, ready to move, the satchel pushed back behind the hip",
  "check-the-satchel": "One hand come across to the buckles of the satchel at the hip, thumb on them, the head barely turned down to it and the stride not broken",
  "set-down-the-load": "The strap lifted off the shoulder and the satchel swung down to knee height, both hands on it, the body straightening - the one moment it is not carrying",
  attack: "A hard blow with the open hand, swung flat across the body at full reach, the satchel swinging out on its strap",
},
// THE REDO OF 2026-10-20, second batch. The generic lines are an animal's - the
// wrecker was asked to crop grass - so each of these gets its own.
"the-keeper-of-the-holding": {
  "check-the-keys": "Head bowed, one long hand lifting and turning the ring of iron keys at its belt",
  attack: "Lunging forward with both long spidery hands out to seize at full reach, the long body pitched after them",
},
"the-bellfounder": {
  alert: "Has seen you and squared up to you: weight forward on both feet, the head up and the eyes on you, ready to move, the long iron rake held across the body in both hands",
  "rake-the-melt": "Crouched low on his heels with the long iron rake in both hands, drawing it slowly back through the melt below him. The melt is NOT drawn",
  attack: "A hard overhead swing of the long iron rake, brought down with both hands",
},
"the-drowned": {
  "take-hold": "Both swollen hands closed on something at chest height and hauling it in, the weight thrown back. What it holds is NOT drawn",
  listen: "Standing still, the head lifted and turned a little to one side, listening",
  attack: "Lunging forward with both swollen hands out to seize at full reach, the heavy body pitched after them",
},
"drowned-hulk": {
  "take-hold": "Both huge swollen hands closed on something at chest height and hauling it in, the vast weight thrown back. What it holds is NOT drawn",
  attack: "Lunging forward with both huge swollen hands out to seize at full reach, the vast body pitched after them",
},
"the-wrecker": {
  alert: "Has seen you and squared up to you: weight forward on both feet, the head up and the eyes on you, ready to move, the fists low",
  graze: "Crouched on his heels going through something on the ground with both hands, head down over it. What he is going through is NOT drawn",
  attack: "A hard punch thrown straight from the shoulder, the whole heavy body behind it",
},
"strand-thief": {
  alert: "Has seen you and squared up to you: weight forward on both feet, the head up and the eyes on you, ready to move, the knife held low and out in front",
  graze: "Turning wrack over with one boot",
  attack: "A fast low swipe across the body at full reach, crouched low",
},
// THE ARMED DEAD OF THE KEEP. Every one of these came back throwing a punch
// with the weapon still frozen in its carry position, because the generic
// attack line is written for an animal and says nothing about a hand holding
// something. The blow names the weapon here, and so does the recovery, because
// a man does not come back to guard from a punch he did not throw.
"skeleton": {
  "look-behind": "Standing guard, the skull turned slowly round over one shoulder toward something behind it, the body not following, the rusted sword still carried low",
  sweep: "A flat cut with the rusted sword, swung across the body at full reach",
  attack: "A downward cut with the rusted sword, the arm come through and the blade past the low point, the whole light frame leaning into it. The sword is IN THE SWING, not held at rest",
  recover: "Bringing the sword back up and in across the body after the cut, coming back to a guard, weight settling onto the back foot",
},
"bone-knight": {
  "ground-the-sword": "Standing at rest with the point of the rusted sword grounded in front of it and both bone hands stacked on the pommel, the kite-shield hanging from the forearm at the side",
  sweep: "A shove with the kite-shield: the rim driven straight out from the body at chest height, the shoulder behind it and the front foot planted, the sword held back low ready to follow",
  attack: "A committed sword cut from the shoulder, blade driven through and out past the body, the kite-shield brought up and across the chest behind it. Sword in the blow, shield covering - it fights with both",
  recover: "Sword drawn back in and up, shield settling back onto the forearm, squaring up again behind it",
},
"warden-captain": {
  "ground-the-maul": "Standing at rest, the head of the rusted maul grounded on the floor in front of it and both fused gauntlets stacked on the top of the haft, the tower shield hanging square at the side",
  attack: "The rusted maul swung through in both fused gauntlets, the head of it past the low point and the whole harness turned behind the weight of it, the tower shield carried through on the other arm. It has no free hand and never strikes with one",
  recover: "The maul hauled back up out of the swing, slow with its own weight, the shield coming back across the front",
  "hold-the-salute": "Standing to attention and holding a salute: heels together, back straight, the rusted maul brought up upright in front of the helm in both fused gauntlets, its head high, the tower shield held square at the side",
  sweep: "A shove with the tower shield: the worn rim driven straight out from the body at chest height, the shoulder behind it and the front foot planted, the maul held back low in the fused gauntlets",
},
"last-watchman": {
  "look-down-the-road": "Standing his post with the spear grounded upright beside him in one hand, the helm turned and lifted, looking a long way down a road that is not drawn",
  sweep: "A low swing of the spear across the body at knee height, both hands on the shaft - the shaft doing the work, not the point",
  attack: "A hard spear thrust, straight and level: both hands on the shaft, the point driven out past the front foot at chest height, the body behind it in a long lunge, the mantle thrown back off the shoulders. THE SPEAR IS LEVEL AND GOING FORWARD - it is not upright, it is not at the shoulder, and the fist is not doing the work",
  recover: "The spear hauled back in from the thrust, point coming up off the line, the front foot recovering under him and the body straightening back toward his post",
},
"warden": {
  "raise-the-lantern": "Holding the unlit lantern up at full stretch to the height of the visor and turning it toward a dark corner, the empty gauntlet down at the side, the empty visor turned the way the lantern points",
  attack: "A straight armoured punch with the empty gauntlet, driven out from the shoulder past the front foot, the unlit lantern still hanging from the other hand and swinging with the movement. This one has no weapon, so the fist is correct",
  recover: "The punching arm drawn back in and down, the lantern settling, the body squaring up again",
  "hold-the-salute": "Standing to attention and holding a salute: heels together, back straight, the empty gauntlet raised flat to the brow of the helm and held there, the unlit lantern hanging dead still from the other hand",
  sweep: "A backhand blow with the empty gauntlet, swung flat across the body at full reach from the far side, the shoulder turned into it, the unlit lantern swinging wide on the other hand",
},
"warden-surface": {
  attack: "A straight armoured punch with the empty gauntlet, driven out from the shoulder past the front foot, the unlit lantern still hanging from the other hand and swinging with the movement. This one has no weapon, so the fist is correct",
  recover: "The punching arm drawn back in and down, the lantern settling, the body squaring up again",
},
"the-tide-warden": {
  "look-at-the-water": "Stopped at a milestone, the notched stick held still at the side, the ruined head turned away and down, looking out at water that is not drawn",
  sweep: "A flat swing of the notched stick across the body at full reach, the other arm out for balance",
  idle: "Standing still in a coat sodden black to the hem, a notched stick held upright in one hand, facing along the way",
  "cut-the-stick": "Head down over the notched stick held up close to the chest, cutting a fresh notch into it with a small blade",
  alert: "The knife and the stick stopped dead mid-notch, both hands still on them, the ruined head come up off the tally and levelled straight at the viewer for the first time",
  "move-a": WALK_A + " The legs are bare shin bones.",
  "move-b": WALK_B,
  attack: "A hard level swing of the notched stick from the shoulder, both hands on it",
  recover: "Coming down off the swing, the stick dropping back toward one hand, the body squaring up again",
  death: "Dead, collapsed limp on its side, no gore and no effects",
},
"the-drowned-ferryman": {
  idle: "Standing at full length and braced, leaning back into the pull, both hands closed at chest height on a SHORT length of thick hemp rope that begins and ends inside his fists - no rope crossing the cell - bare skull, huge white swollen hands, the wasted legs planted wide and bare feet set against a current that is not drawn",
  alert: "Come up straighter and squared to the viewer, both hands still closed on the short length of rope, the skull come round and level to face, his weight shifting onto one wasted leg",
  "move-a": "Hauling contact pose A: one fist ahead of the other on the short rope length, the body swung forward under them, one leg dragging through behind and the other taking a slow wide step",
  "move-b": "Hauling passing pose B: the other fist ahead, the body swung the other way, the legs in the opposite phase, same direction and body size",
  attack: "One hand opened and driven straight forward and down in a grab at full reach, the other still closed in its grip",
  // HIS WORK POSE, AND IT IS NOT THE HAUL. The idle above already shows him
  // pulling on the short length of rope, and move-a/move-b are the same haul in
  // phase - so a work pose that is also hauling would give him four frames of
  // one action and still nothing to cut to. This is the other half of the job:
  // the rope is gone and he is looking for it. It is the only frame in which
  // his hands are empty and open, which is what makes it read against the rest.
  "find-the-line": "Both arms out and sweeping slowly across at chest height, hands OPEN and closing on nothing, fingers spread - feeling for a rope that is not there and not drawn. The bare skull is down and turned slightly, following the hands. The wasted legs stay planted wide against a current that is not drawn",
  recover: "Drawing the grabbing hand back in to the chest after the reach, the fist closing again, the body settling back into its braced lean",
  death: "Gone slack and face down, arms spread, both hands open and empty, the wasted legs trailing loose behind him",
},
"the-pilot": {
  idle: "Standing very straight and still, a small brass plate held flat on the open palm at chest height, the ruined head down over it. The plate is the only object in the cell",
  "read-the-water": "One arm out straight and level, sighting along it at something far past the viewer's shoulder, the brass plate still held in the other hand",
  alert: "The brass plate lowered out of the sighting line and held forgotten at the hip, the bare-socketed head come round off the sighting line and levelled at the viewer",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A short hard downward strike with the edge of the brass plate, the other arm out for balance",
  recover: "Drawing the brass plate back in to the chest after the strike, the other arm coming down",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-drover": {
  "lean-on-the-stick": "Standing at rest, leaning on the long stick planted upright in front of him, both hands folded over the top of it, waiting the way a man waits on the tide",
  sweep: "A low swing of the long stick across the body at knee height, arms staying below head height",
  idle: "Standing at ease with a long stick across the worn grooves of both shoulders and both wrists hooked over it, coat tied at the waist, looking past you up the road",
  "drive-the-road": "Stick brought down into one hand and swung out low and wide to the side, the other arm out, moving something that is not there",
  alert: "The stick come down off the worn shoulder grooves into both hands across the body, head up, the easy working stance gone out of him entirely",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A hard level swing of the long stick from the shoulder, arms staying below head height",
  recover: "The stick swinging back down to rest after the blow, the body coming back square",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-eel-cutter": {
  idle: "Standing stooped with a long punt pole held level across the body in both hands, a wicker eel trap hanging at his belt, back half turned, not looking up",
  "lift-the-trap": "Bent right down with both arms out and low in front of him, hauling a dripping wicker eel trap up on its line, the trap and the line hanging clear in his hands. No water and no boat is drawn",
  alert: "The head finally come up. The punt pole still held level and the body still turned away, and only the ruined face come round over the shoulder and fixed on the viewer",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A hard two-handed forward jab with the punt pole, arms staying below head height",
  recover: "Drawing the punt pole back in after the jab, the body settling back into its stoop",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-refuge-man": {
  "hold-the-door": "Standing side-on, one flat hand held out at shoulder height as if holding a narrow door a hand's width open, the head turned to listen through the gap, still as a hare. No door is drawn - only the hand and the listening",
  idle: "Seen from behind: standing upright with both arms raised and both hands flat and open at shoulder height, palms forward, bracing against nothing - no wall is drawn. The entire back of him stripped: bare skull, shoulder blades and the whole line of the spine through a coat torn open down the back",
  "turn-from-the-wall": "Body rotating, one arm still up and back behind him with the hand flat and open, the other coming round with it, the whole and undamaged face beginning to come round toward the viewer",
  alert: "Turned fully round now, both arms down at his sides, squared up and facing, the intact face on the viewer and the stripped back hidden behind him",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A close two-handed shove driving forward from the chest, shoulders behind it",
  recover: "Drawing both hands back in to the chest after the shove, the shoulders coming down",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-bridge-mason": {
  "test-the-joint": "Standing close in at chest height, head cocked to one side, tapping lightly with the mallet in the bone fist at a joint in front of him and listening to it, the chisel hand flat beside the tap. No stone is drawn - only the tap, the cocked head and the flat hand",
  idle: "Standing three-quarters turned away, a heavy mallet hanging down in one bare-bone fist, the ruined head down and angled at something low in front of him. No stone and no stonework is drawn",
  "dress-the-stone": "Crouched low on one knee, the mallet raised in the bone fist and a chisel held out steady in the whole hand, both hands working together at about knee height in front of him. The mallet and the chisel are the only objects in the cell",
  alert: "Turned round from the work at last, the mallet coming UP in the bare-bone fist rather than down, the head levelled at the viewer",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A hard mallet blow driven forward from the shoulder, both hands on the shaft",
  recover: "The mallet coming back down off the blow, the body returning to its working guard",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-reed-walker": {
  "keep-pace": "Stopped mid-stride and half turned, the head turned back over one shoulder toward the viewer, utterly still, the reed growing out of him gone still too - it stops when you stop",
  idle: "Standing still, reed stems rooted through the ribs and shoulders and rising well above the head so the outline reads as much reed as man, one bare shoulder clear, the face indistinct behind his own stems. No reed bed and no loose reed is drawn",
  "part-the-reed": "One arm out and sweeping across in front of him at chest height, body turning with it, the reed growing out of his own ribs bending with the movement",
  alert: "Stopped dead and square-on to the viewer, the reed growing out of his ribs no longer moving, the face still not quite clear behind it",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "Coming out at full stretch with both arms forward and low, body committed",
  recover: "Drawing back after the lunge, arms coming in, his own reed settling back around him and the outline closing up again",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-scaffold-hand": {
  "reach-for-the-span": "Up on the balls of both feet, both bone arms stretched straight up as far as they will go, fingers spread, reaching for something higher than he can get to. Nothing above him is drawn",
  sweep: "Both bone arms, still raised, swung across sideways together over the head like a falling beam, the body braced under them",
  idle: "Standing with the head tipped right back and both bare-bone arms raised straight up over his head, hands working at something above him, weight settled. What he is working on is NOT drawn",
  "work-the-stone": "Standing, head back, both bone arms straight up and committed, hands picking at nothing overhead, the body leaning back into it",
  swing: "The gather before a blow: both bone arms taken up and back behind the head, elbows high, the body leaning away and loading, nothing released yet",
  alert: "Both raised arms stopped dead overhead, hands still up and open at the work, and the head come DOWN off the stonework for the first time - levelled straight at the viewer. The arms have not moved; only the head has",
  hit: "Struck: the whole body rocked back and down off the overhead work, both arms falling from above the head, the head snapping away from the blow, weight going onto the back foot. No wound drawn",
  attack: "The blow, and the only pose where the arms come down: both bone arms swung down hard from overhead in a two-handed overhand strike, fists together, driven past the waist with the whole body and the head behind it. Everywhere else in this sheet his arms are up; here they are down, and it should read as something a body should not be able to do that fast",
  recover: "The arms travelling back UP over the head after the blow, head tipping back with them, returning to the only posture he has",
  death: "Dead, lying limp on its side with both arms still up past the head, no gore and no effects",
},
"the-fowler": {
  idle: "Lying flat on his front in a hood of sacking and cut reed, face down, absolutely still, the exposed back of him bone-white, the long fowling pole under one hand and part-covered by cut sedge caught on his own sacking. No ground is drawn",
  "rise-from-the-turf": "Coming up onto one knee, the sacking hood falling back, the brown bog-tanned underside and its crust of root now showing, both hands closing on the long fowling pole",
  "watch-the-sky": "Still flat on his front in the sacking hood, the long fowling pole lying under one hand, but the head and shoulders lifted a little off the turf and the face turned up, watching the sky for birds that are not drawn. Absolutely still. No ground is drawn",
  "move-a": WALK_A,
  "move-b": WALK_B,
  attack: "A hard forward thrust with the long fowling pole held in both hands, body low and driving",
  alert: "Up on his feet out of the turf and crouched low, both hands on the long fowling pole levelled across him, the head pushed forward at you - furious at being found",
  sweep: "A low swing of the long fowling pole across the body at knee height, both hands on the shaft - the shaft doing the work, not the point",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-salt-widow": {
  sweep: "A low sweep of the long rake across the body at knee height, both hands on it",
  idle: "Standing side on and stooped a little forward from the waist, both brown leather arms down and working at something low in front of her at knee height, hands busy, sleeves and coat crusted white to the elbow. What she is working at is NOT drawn",
  "feed-the-flue": "Crouched right down with both arms driven straight out forward and low, in to the elbow, pushing something away from her at ground level. Her hands are empty and nothing she is pushing, and nothing she is pushing it into, is drawn",
  "work-the-pan": "Standing and leaning far out forward from the hips, a long rake held in both hands with its head down and out at full arm's length, drawing it back toward her across knee height. The rake is the only object in the cell",
  alert: "The rake stopped dead mid-draw and still held in both hands, and she has come UP out of the stoop for the first time - straightened, squared to the viewer, the cured brown face levelled at you. Everything else about her is still at work; only she has stopped",
  hit: "Struck and rocked back off the pan: the body thrown up and away, the rake swinging loose in one hand, the other arm out for balance, the stoop broken. No wound drawn",
  attack: "A hard level swing of the long rake from the shoulder, both hands on it",
  recover: "Pulling back after the blow, the rake coming back in across the body, returning to her guard",
  death: "Dead, lying limp on its side, no gore and no effects",
},

// ---- THE THREE THAT WERE WRITTEN AND NEVER DRAWN --------------------------
// Twelve of the crossing's dead carry GRAVE_FLESH and eleven of them have art.
// These three have descriptions, a place in the world and no sheet at all.
//
// Each one already tells you its work pose, because that is how these were
// written - the miller has his hands under the water, the clerk has his hand
// out, the warden has his distance. The rule below is the rule for all of them:
// THE BODY MAKES THE SHAPE AND THE THING WORKED ON IS NEVER DRAWN. The miller's
// water is not in the cell. Neither is the clerk's toll, nor the warden's road.
"the-miller": {
  "haul-it-up": "Straightening hard up out of the stoop, both arms coming up and back with the elbows bent and the fists closed on what he has hold of. What is in them is NOT drawn",
  sweep: "A heavy swing of one closed fist across the body at full reach, the other fist still shut against the chest, the whole swollen weight behind it",
  idle: "Standing upright and still, turned three-quarters away from the viewer, the head bowed to look down in front of him, both arms hanging straight down at his sides with the hands open. Heavy and patient. NOTHING he is looking at is drawn - no water, no floor, no surface, no wheel",
  "work-the-water": "Bent right over from the waist, both arms reaching down in front of him to knee height, hands open and fingers spread, working at something low that is NOT drawn - no water, no floor, no surface",
  alert: "Come round to face the viewer for the first time, still bent, and BOTH HANDS ARE UP OUT OF IT AND CLOSED - he has kept hold of whatever it was. What is in his fists is NOT drawn; only the grip and the forearms streaming",
  "move-a": "Wading contact pose A: One leg reaches forward with the heel making contact, while the opposite leg trails behind. It is driven down against a resistance that is not drawn, both arms out wide for balance. The body is transferring weight forward.",
  "move-b": "Wading passing pose B: The rear leg has swung forward, with its knee bent and foot lifted, passing beside the planted supporting leg. The legs are close together, not spread apart.",
  attack: "Both closed fists driven down and forward together in one heavy swing from above the shoulder, the whole swollen weight behind it",
  recover: "The fists coming back in to the chest after the blow, the body settling back into its stoop",
  death: "Dead, collapsed face down and spread, both hands finally open and empty",
},
"the-toll-clerk": {
  idle: "Standing very straight and still, a satchel hanging at the hip on a broad strap that crosses the chest, ONE HAND HELD OUT AT CHEST HEIGHT, PALM UP AND OPEN, held long enough that it has stopped being a gesture. The other arm hangs. Nothing is in the open palm",
  "shift-the-weight": "The free hand come across to take the weight of the satchel from underneath and lift it an inch, the head down toward it, the strap slack for a moment - and THE OUT-HELD HAND HAS NOT MOVED. It stays exactly where it was, palm up",
  alert: "The head come up off the satchel and levelled straight at the viewer, the satchel dropped back onto the strap, and the open palm still out, still waiting, now unmistakably meant for you",
  "move-a": WALK_A + " A slow even walk, the satchel swinging - and the open palm STILL HELD OUT in front, carried along unchanged.",
  "move-b": WALK_B + " The palm still out.",
  attack: "The out-held hand finally closes and is driven straight forward in a grab at full reach, the other arm back",
  recover: "The hand opening again on the way back in and returning to exactly where it was, palm up at chest height",
  death: "Dead, lying limp on its side, the strap still across the chest, the hand open and empty at last",
},
"the-long-warden": {
  idle: "Standing at rest in a long coat of overlapping plates worn the colour of dust, facing along the way it is going, weight even, entirely unhurried. It is not guarding this spot and does not look like it is",
  "turn-the-distance": "Stopped and turning on the spot, the body coming round through three-quarters to face back the way it came, one boot pivoting, the head already level and looking down the new direction. The end of a beat, done ten thousand times",
  alert: "Stopped square to the viewer and settled, the head come round and levelled, weight dropping back onto the rear foot - the first time it has been interested in a thing rather than a distance",
  "move-a": WALK_A + " A long even marching stride, the coat of plates swinging heavily with it.",
  "move-b": WALK_B,
  attack: "A hard straight-armed drive forward from the shoulder with the leading arm, the body stepping into it, the other arm braced back",
  recover: "The arm drawn back in and the shoulders squaring, the body settling back into its marching stance",
  death: "Dead, collapsed sideways, the plated coat splayed open, one arm folded under",
},

// ---- THE SLEEPERS OF THE CROSSING -----------------------------------------
// SAY.rest below is one line for every animal in the game - "low on the ground,
// eyes closed" - and it is wrong for most of the coast. A bittern asleep is
// STANDING. A gull asleep has no legs in the shape at all. A crab does not lie
// down, it stops being visible. Generated off the neutral line these eleven all
// come back as the same lump in the sand.
//
// The wording is drawn from REST_LINES in zone-data.ts, which already describes
// each of these sleeps in the world's own voice - but it is NOT lifted from it
// verbatim, for two reasons the pipeline cares about. That prose names scenery
// (reeds, a parapet, a stone) and the sheet prompt bans scenery outright, so
// anything the body does not do itself has to come out. And in one case the
// world's line and the drawing disagree on purpose: REST_LINES has the bittern
// bill-up in the reeds, which is the bird at its most AWAKE - that freeze is
// what its `alert` already is, and drawing it twice would leave it with no
// sleep at all.
//
// FOUR OF THE ELEVEN ARE RARE BLOOD and were missed by the first audit, which
// counted spawns: bull-seal, black-backed-gull, silver-eel and old-conger have
// no spawn rows of their own, they come up out of mob_variants off grey-seal,
// great-gull, ford-eel and conger. A variant carries its own strip, so it needs
// its own frame. The clearest case is the conger, which sleeps perfectly well,
// beside the old-conger, which is the rarer animal and stands up all night.
"a-lymer": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"cave-lion": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"ermine": {
  feed: "Head down and pulling hard at something held down under both forefeet, the long back humped over it, the jaws working. WHAT IT HOLDS IS NOT DRAWN",
  rest: "Asleep curled into a tight ball with the nose tucked under the tail, the long body wound round on itself, eyes shut",
},
"fen-viper": {
  graze: "The head low and pushing forward along the ground with the jaws parted, the forebody flat and searching, the coil loose behind it",
  rest: "Asleep wound into a tight flat spiral with the head laid down on the outside of its own coil, the whole body slack against the ground",
},
"feral-goat": {
  graze: "Head right down to the ground, cropping, the neck stretched long and low and the muzzle at the ground, the body still and the weight even on all four feet. THE GROUND IS NOT DRAWN - only the animal reaching down to it",
  rest: "Lying up with the legs folded under the body and the head still raised, settled low on the ground, eyes shut",
  alert: "Head snapped up and round to face, ears hard forward, the body frozen mid-step with the weight shifted back - the instant before it decides to run",
},
"gill-adder": {
  graze: "The head low and pushing forward along the ground with the jaws parted, the forebody flat and searching, the coil loose behind it",
  rest: "Asleep wound into a tight flat spiral with the head laid down on the outside of its own coil, the whole body slack against the ground",
  alert: "The forward third lifted clear off the ground and drawn back into a tight S over itself, the head level and square at the viewer, the tongue out",
},
"glutton": {
  feed: "Head down and pulling hard at something held down under both forefeet, the long back humped over it, the jaws working. WHAT IT HOLDS IS NOT DRAWN",
  rest: "Asleep curled into a tight ball with the nose tucked under the tail, the long body wound round on itself, eyes shut",
  alert: "Stopped dead and risen on the forelegs with the head and neck stretched up and forward at the viewer, the body low and long behind it",
},
"hill-fox": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"hill-wolf": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"coyote": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"the-old-grey": {
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"lead-wolf": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
},
"lynx": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"the-chainman": {
  "count-it-out": "Head bent, counting the links of the small chain round his neck one by one between finger and thumb, lips moving",
  "mark-it-down": "Head bent over a small notebook open in one hand, writing in it with a stub of pencil, the small chain hanging still round his neck - the count marked before he looks up",
  attack: "A hard backhand blow with the small chain wrapped tight round his fist, pulled half off his neck for it, the body turned in behind the swing",
  "coil-the-chain": "Settling the small chain back round his neck with both hands, straightening it on his chest, getting ready to walk on without a word",
},
"the-one-who-stayed": {
  "look-down-the-hill": "Standing still with one hand up shading his eyes and the stick held down along his leg, looking far off down the hill the way the others went",
  "tend-the-fire": "Crouched low on his heels, one arm out laying something small down in front of him, the other forearm on his knee, the face lit by nothing. No fire and no fuel is drawn - only the crouch and the reaching hand",
  advance: "Stepping toward you with one open hand lifted in greeting, the head up and the eyes on you, as if he has known you all his life and has been waiting at this door for you to come back",
},
"twice-dead": {
  listen: "Standing still with the skull lifted and turned a little to one side, listening, the hard brown hands hanging at its sides - waiting, unhurried, for whatever it heard",
  rise: "Getting back up after being put down: one knee and one hand on the ground, the body hauling itself upright without hurry, the head still hanging - it does not stay down",
  // It has no weapon in its hands: it fights with them.
  attack: "Lunging forward at full reach with both hard brown hands out and hooked to seize, the dry body pitched after them without hurry",
  sweep: "A swipe of one hard brown hand across the body at full reach, the other arm back",
},
"thrice-dead": {
  rise: "Gathering itself up off the ground once more: on both hands and one knee, the cured, yellow-boned body pushing itself upright, the skull lifting last - it does not stay down",
  attack: "Lunging forward with one cured hand driven out to seize at full reach, the yellow finger bones hooked, the dry body behind it",
  sweep: "A rake of one cured hand across the body at full reach, the finger bones hooked",
},
"verdigris-thing": {
  "seek-the-metal": "Head lifted and turning slowly, one green-crusted hand half raised and open in front of it, the body leaning toward something it can feel rather than see - the metal you are wearing",
  "lay-on-the-hand": "Reaching out and laying one open green-crusted hand flat on something at chest height in front of it, slowly, almost gently, the arm at full stretch and the body leaning after it. WHAT IT TOUCHES IS NOT DRAWN - only the reach and the flat hand",
},
"marrow-cantor": {
  "hold-the-note": "Standing tall with the skull tipped back, the wired jaw wide open on a held note, the hollow chest swollen, the arms a little out from the sides. No sound is drawn - only the open jaw and the swelling chest",
  listen: "Standing still and listening: the skull tilted a little to one side and lifted, the whole body stopped, the hands held still at its sides",
  // attack and sweep read off its shipped strip (2026-10-27): a low two-handed
  // grab, then one arm flung across.
  attack: "Lunging forward low at full reach with both bony hands out and the long fingers hooked to seize, the torn robe swinging after the body",
  sweep: "A swipe of one bony hand flung out across the body at full reach, the other arm back, the skull turned after it",
},
"something-ahead": {
  listen: "Stopped dead mid-step and listening: one foot lifted off the ground and held there, the body stooped forward, the long arms hanging loose, the head pushed forward and perfectly still - it stops when you stop",
  lurk: "Waiting unseen in the way ahead: standing dead still and upright, turned half away, the long arms hanging, the head bowed - so still it could be a post or a dead tree left standing on the path, something you would walk straight up to",
},
"the-follower": {
  lurk: "Waiting unseen before it closes in: crouched right down and folded small, knees drawn up, the long arms wrapped round them, the head down, utterly still - something you would take for a shadow or a stump and walk past",
},
"marsh-hound": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
},
"mountain-hare": {
  graze: "Crouched low with the head down to the ground, cropping, the ears laid back along the shoulders and the hind legs folded tight under the body. THE GROUND IS NOT DRAWN",
  rest: "Asleep pressed flat and round into a squat, the ears laid right back along the body, the legs folded away out of sight, eyes shut",
  alert: "Sat up on the hind legs with the front paws tucked at the chest, the ears straight up and the head turned to the viewer, frozen",
},
"old-billy": {
  graze: "Head right down to the ground, cropping, the neck stretched long and low and the muzzle at the ground, the body still and the weight even on all four feet. THE GROUND IS NOT DRAWN - only the animal reaching down to it",
  rest: "Lying up with the legs folded under the body and the head still raised, settled low on the ground, eyes shut",
  alert: "Head snapped up and round to face, ears hard forward, the body frozen mid-step with the weight shifted back - the instant before it decides to run",
},
"red-hind": {
  graze: "Head right down to the ground, cropping, the neck stretched long and low and the muzzle at the ground, the body still and the weight even on all four feet. THE GROUND IS NOT DRAWN - only the animal reaching down to it",
  rest: "Lying up with the legs folded under the body and the head still raised, settled low on the ground, eyes shut",
  alert: "Head snapped up and round to face, ears hard forward, the body frozen mid-step with the weight shifted back - the instant before it decides to run",
},
"red-stag": {
  graze: "Head right down to the ground, cropping, the neck stretched long and low and the muzzle at the ground, the body still and the weight even on all four feet. THE GROUND IS NOT DRAWN - only the animal reaching down to it",
  rest: "Lying up with the legs folded under the body and the head still raised, settled low on the ground, eyes shut",
},
"snow-fox": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"snow-hare": {
  graze: "Crouched low with the head down to the ground, cropping, the ears laid back along the shoulders and the hind legs folded tight under the body. THE GROUND IS NOT DRAWN",
  rest: "Asleep pressed flat and round into a squat, the ears laid right back along the body, the legs folded away out of sight, eyes shut",
  alert: "Sat up on the hind legs with the front paws tucked at the chest, the ears straight up and the head turned to the viewer, frozen",
},
"stone-adder": {
  feed: "The head and forward body low over prey held against the ground in a loop of its own coil, the jaws open and worked wide around it, the throat distended. THE PREY IS NOT DRAWN - only the open jaw and the loop that holds",
  rest: "Asleep wound into a tight flat spiral with the head laid down on the outside of its own coil, the whole body slack against the ground",
},
"the-blue-fox": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"the-dancer": {
  feed: "Head down and pulling hard at something held down under both forefeet, the long back humped over it, the jaws working. WHAT IT HOLDS IS NOT DRAWN",
  alert: "Stopped dead and risen on the forelegs with the head and neck stretched up and forward at the viewer, the body low and long behind it",
},
"the-gravid-adder": {
  rest: "Asleep wound into a tight flat spiral with the head laid down on the outside of its own coil, the whole body slack against the ground",
  alert: "The forward third lifted clear off the ground and drawn back into a tight S over itself, the head level and square at the viewer, the tongue out",
},
"the-old-glutton": {
  feed: "Head down and pulling hard at something held down under both forefeet, the long back humped over it, the jaws working. WHAT IT HOLDS IS NOT DRAWN",
  rest: "Asleep curled into a tight ball with the nose tucked under the tail, the long body wound round on itself, eyes shut",
  alert: "Stopped dead and risen on the forelegs with the head and neck stretched up and forward at the viewer, the body low and long behind it",
},
"the-raiding-fox": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
},
"the-tom": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"wildcat": {
  feed: "Head down over a carcass on the ground, one forefoot planted on it, the neck twisted to pull upward and the jaws working. THE CARCASS IS NOT DRAWN - only the animal's posture over it, head low, shoulders braced, the pull in the neck",
  rest: "Asleep curled round on its side with the tail over the nose, the whole body gone slack and settled low, eyes shut",
  alert: "Stopped square and facing, the head up and level, ears forward, the weight settled back over the hind legs - it has seen you and decided about it",
},
"grey-seal": {
  bite: "The jaws shut hard on nothing at full reach with the head and neck driven straight out low over the ground, the fore flippers braced under the chest, the whole body committed forward behind the bite",
  alert: "Come up off the belly onto the fore flippers with the chest lifted clear of the ground and the head thrown back and round at the viewer, the mouth open on the peg teeth. The hind flippers still trailing flat behind - a seal out of water does NOT stand",
  "move-a": "Hauling contact pose A: the whole body humped up in the middle with both fore flippers planted forward and the chest swung up over them, the hind flippers dragging together behind. A seal on land moves by lurching the body over the fore flippers. NO WALKING, NO LEGS",
  "move-b": "Hauling passing pose B: the hump collapsed forward, the belly back down flat, the fore flippers coming free for the next reach, the body now further along in the same direction. Same size, same direction as A",
  feed: "Head down and turned side-on to tear at a fish held down against the ground under one fore flipper, the neck twisted over, the mouth open and working",
  rest: "Asleep hauled out on its side, the whole body slack and boneless with nothing holding it up, fore flippers folded in loose against the chest, head tipped back with the throat uppermost, eyes shut and the mouth slightly open",
},
"bull-seal": {
  bite: "The heavy jaws closing hard on nothing at full reach, the scarred neck driven straight out and low, the fore flippers braced under the chest, the full weight of him behind it",
  alert: "Reared up on the fore flippers to full height with the scarred chest and neck lifted clear and thrown out, the head back, the mouth wide open on the whole set of teeth. The hind flippers still flat behind him",
  "move-a": "Hauling contact pose A: the huge body humped up over both planted fore flippers, chest swung forward, the hind flippers dragging behind. NO WALKING, NO LEGS",
  "move-b": "Hauling passing pose B: the hump dropped, the belly flat again, the fore flippers reaching ahead for the next lurch, further along the same line",
  feed: "Head down side-on, tearing at something pinned under one fore flipper, the neck twisted hard over and the jaw working",
  rest: "Asleep on his side with the whole enormous bulk gone slack and spread under its own weight, the scarred neck and chest uppermost, the head thrown right back and the mouth open, eyes shut",
},
"eagle-owl": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Mantled forward over a kill held down in both feet, the wings dropped and spread low around it, the head down and the bill tearing. What it is standing on is NOT drawn",
},
"hill-eagle": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Mantled over a kill gripped in both feet, wings dropped and half-spread to cover it, the head down and turned side-on, the hooked bill pulling upward. What it holds is NOT drawn",
},
"scarp-raven": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head down and driving the bill into something held under one foot, the body low and level, the throat hackles loose. What it is working at is NOT drawn",
},
"mountain-chough": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head down with the curved red bill driven into the ground at full stretch, the body tipped forward over it, probing rather than pecking",
  "alert-alarm": "Head and body up and squared, the bill wide open mid-call, the throat feathers out, one wing just lifting off the flank - the whole bird committed to the noise",
},
"ptarmigan": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  graze: "Head down close over the ground, cropping, the body settled low and round on folded legs with the feathered feet under it",
  "alert-alarm": "Neck stretched straight up out of the round body to full height, the head small and high on it, the bill open mid-call, the whole bird suddenly tall",
},
"the-old-raven": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head down and driving the heavy bill into something held under one foot, the body low, the shaggy throat hackles stood out. What it is working at is NOT drawn",
  "snatch-escape": "Going away low and fast with something gripped crosswise in the bill, wings driving down hard, the feet drawn up tight under the body. What it has taken IS drawn, in the bill",
},
"the-bone-dropper": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  "snatch-escape": "Climbing away with something gripped in one foot and held in close under the body, the wings at the top of a hard downstroke, the head turned down and back toward it. What it has taken IS drawn, in the foot",
},
"bittern": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head and the whole long neck driven straight down and forward at full stretch, the bill closed on a fish held crosswise in it, the body still crouched back over the legs",
  rest: "Asleep, hunched right down into itself with the neck folded away out of sight entirely, standing on one leg with the other drawn up into the belly feathers, the bill laid back along the shoulder, eyes shut. NOT the upright bill-to-the-sky freeze",
},
"great-gull": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head down and pulling hard at something held under one foot, the neck twisted over and the bill open and working, wings half-lifted for balance. What it is pulling at is NOT drawn",
  rest: "Asleep sat down on its keel with the legs folded away out of sight under the body, feathers loosened and puffed out, the bill laid back in over the shoulder and buried in the back feathers, the visible eye a closed slit",
},
"black-backed-gull": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  feed: "Head down and hauling at something pinned under one foot, the heavy black-backed wings half-open for balance, the neck twisted and the bill working. What it is pulling at is NOT drawn",
  rest: "Asleep and hunched right down with the head pulled back into the shoulders until there is no neck in the shape, the heavy dark back and the great bill making it wider than it is tall, feathers puffed, eyes shut",
},
"oystercatcher": {
  up: "In flight with the wings caught at the BOTTOM of a hard downstroke, fully spread and reaching down and forward, the primaries open at the tips, the body carried level and the feet tucked. THIS IS THE ONLY WINGBEAT FRAME ON THE SHEET - it stands for the whole beat, so it has to read as a bird flying under its own power all by itself. Not a glide, not a launch, not a landing: wings DOWN and working",
  graze: "Head down with the long straight bill driven vertically into the ground up to the base, the body tipped hard forward over it, the legs braced back",
  "alert-alarm": "Neck stretched up and forward, the head low and levelled, the orange bill wide open mid-call, the body tipped down onto the front of the legs",
  rest: "Asleep standing on one leg with the other drawn up out of sight into the belly feathers, the long straight bill laid back along the shoulder, head sunk down into the shoulders, eyes shut. The bill stays the one clear line in the shape",
},
"wrack-crab": {
  rest: "Asleep settled flat down onto the ground, all the legs folded in tight underneath the shell and both claws drawn in hard against the front of the body, the shell low, the eyestalks laid down flat. THE WHOLE ANIMAL IS VISIBLE ON TOP OF THE GROUND - nothing buried, nothing hidden under sand or weed, no empty shell",
  alert: "Risen up off the ground on all eight legs and turned square to the viewer, the high claw lifted higher still and opened wide above the line of the shell, the low claw drawn in tight across the front, both eyestalks up and forward",
  attack: "The high claw driven out and forward at full reach with the pincer wide open, the body lunging low behind it on the legs, the other claw still tucked in against the front of the body",
  bite: "THE CLOSING OF THE HIGH CLAW - the two halves of that one pincer shutting hard on nothing at full reach, the body braced low behind it on the legs. This is the CLAW closing",
  recover: "The high claw drawn back in and down to the front of the body, half closed, the legs settling the shell low and square again, the eyestalks still up",
  "move-a": "Scuttling contact pose A, TRAVELLING SIDEWAYS: the legs on the leading side reaching out and planting, the legs on the trailing side folded in close, the whole body carried across the cell edge-first with the claws held up clear. A crab does NOT walk forward - it goes sideways",
  "move-b": "Scuttling passing pose B, same sideways direction: the leading legs now folded and the trailing legs extended and pushing, the body further along the same line, same size as A",
  graze: "Down low over the ground with both claws working in to the front of the body, picking at what is in the weed under it. What it is picking at is NOT drawn",
  feed: "Feeding, down over something on the ground directly beneath it, both claws in to the mouthparts, the body low and braced over what it is working at. What it is feeding on is NOT drawn",
  "snatch-escape": "Going away fast and sideways with something clutched up in one claw and held in close under the body, all the legs driving, the shell tipped in the direction of travel. What it has taken is NOT drawn",
},
"devil-crab": {
  "move-a": "Scuttling contact pose A, TRAVELLING SIDEWAYS: the legs on the leading side reaching out and planting, the legs on the trailing side folded in close, the whole body carried across the cell edge-first with both heavy claws held up clear of the ground. A crab does NOT walk forward - it goes sideways",
  "move-b": "Scuttling passing pose B, same sideways direction: the leading legs now folded and the trailing legs extended and pushing, the body further along the same line, same size as A",
  rest: "Asleep settled flat down onto the ground, all eight legs folded in tight underneath the shell and both heavy claws drawn in hard against the front of the body, the shell low, the eyestalks laid down flat. THE WHOLE ANIMAL IS VISIBLE ON TOP OF THE GROUND - nothing buried, nothing worked down into sand or gravel, no empty shell",
  alert: "Risen up off the ground on all eight legs and turned square to the viewer, both heavy claws lifted and opened wide above the line of the shell, the eyestalks up and forward",
  attack: "One heavy claw driven out and forward at full reach with the pincer wide open, the body lunging low behind it on the legs, the other claw held cocked and open across the front",
  bite: "THE CLOSING OF THE LEADING CLAW - the two halves of that one pincer shutting hard on nothing at full reach, the body braced low behind it. This is the CLAW closing",
  recover: "Both claws drawn back in and down to the front of the body, half closed, the legs settling the shell low and square again, the eyestalks still up",
  graze: "Down low over the ground with both heavy claws working in to the front of the body, picking at what is under it. What it is picking at is NOT drawn",
  feed: "Feeding, down over something on the ground directly beneath it, both heavy claws in to the mouthparts, the body low and braced and taking up too much room. What it is feeding on is NOT drawn",
  "snatch-escape": "Going away fast and sideways with something clutched up in one heavy claw and held in close under the body, all the legs driving, the shell tipped in the direction of travel. What it has taken is NOT drawn",
},

// ---- THE TWO GREAT CRABS -------------------------------------------------
// THEIR CLAWS CAME BACK MANGLED EVERY TIME, AND THE GENERIC WORDING IS WHY.
// With no entry here every pose falls through to SAY, which is written for
// animals with a spine - and the fourth cell of the established sheet asks for
// "a closing bite with the jaws, head and neck committed". A crab has no jaws
// and no neck. Told to bite with a face it does not have, the generator invents
// one, and what it invents is built out of the claws.
//
// The second half of it is the asymmetry. The great crab's own description says
// one claw is twice the other, so across eight cells the big one changes sides,
// or both go big, or the two merge. A thing that must stay the same in every
// cell has to be STATED in every cell, so each pose below names which claw.
//
// THE COUNT IS FIXED AND SAID OUT LOUD: two claws, eight walking legs, no more.
"the-great-crab": {
  sweep: "A wide sideways SWEEP of the LARGE LEFT CLAW held closed, swung flat across the front of the body at full reach like a bar being shoved, the legs braced against the swing. The claw stays SHUT through this - it is a blow with the weight of the claw, not a grab",
  graze: "Down low over the ground with the SMALL RIGHT CLAW working in to the front of the body and the LARGE LEFT CLAW held out and clear to the side, picking at what is under it. What it is picking at is NOT drawn",
  idle: "Settled square and low on all eight walking legs, the cart-wide shell crusted white with salt and riding barnacles, the LARGE LEFT CLAW held closed and down in front of the body and the SMALL RIGHT CLAW tucked in beside it. EXACTLY TWO CLAWS AND EIGHT LEGS, no more of either. Unhurried",
  alert: "Turned square to face the viewer and risen slightly on the legs, the LARGE LEFT CLAW lifted up and open above the line of its own back and held there, the SMALL RIGHT CLAW drawn in tight. It is not retreating - the whole pose is waiting",
  attack: "The LARGE LEFT CLAW driven out and forward at full reach with the pincer wide open, the body lunging low behind it, the SMALL RIGHT CLAW folded in against the front. The large claw is the whole blow",
  bite: "THE CLOSING OF THE LARGE LEFT CLAW - the two halves of that one pincer shutting hard on nothing at full reach, the worn smooth edge meeting the other edge, the body braced behind it. This is the CLAW closing. The crab has NO JAWS, NO MOUTHPARTS RAISED, NO HEAD AND NO NECK - do not draw any",
  recover: "The LARGE LEFT CLAW drawn back in and down to the front of the body, half closed, the legs settling the shell square and low again",
  hit: "Rocked hard sideways: the shell tipped up off the legs on one side, both claws thrown wide and open, the legs on the struck side lifted clear, the whole mass going over and catching itself. No wound drawn",
  rest: "Closed right up and asleep: the body settled flat and low, all eight legs folded in tight against the underside, and both claws drawn in and folded flat across the front. The eyestalks laid down. The salt crust and the barnacles are the readable part of it. THE WHOLE CRAB IS IN FRAME AND WHOLE - every leg and both claws visible and folded, not hidden, not buried, not cropped, nothing covering it",
  death: "Dead and turned over onto its back, all eight legs curled in loosely over the pale underside, both claws slack and hanging open. No gore and no effects",
},
"the-great-devil-crab": {
  sweep: "A wide sideways SWEEP of one of the matched heavy claws held closed, swung flat across the front of the body at full reach, the legs braced against the swing. The claw stays SHUT - a blow with its weight, not a grab",
  graze: "Down low over the ground with both of the matched heavy claws working in to the front of the body, picking at what is under it. What it is picking at is NOT drawn",
  idle: "Settled square and low on all eight walking legs, the overgrown shell deep bruised red with the plates split along the seams and healed over in ridges, a pale filed line running the whole edge. BOTH CLAWS ARE THE LARGE ONE - a matched pair, each the size of the great crab's big one - held closed and down in front. EXACTLY TWO CLAWS AND EIGHT LEGS, no more of either",
  alert: "Turned square to face the viewer and risen on the legs, BOTH great claws lifted up and open above the line of its own back and held there. It does not go sideways out of the way. The waiting is the pose",
  attack: "BOTH great claws driven out and forward together at full reach with both pincers wide open, the body lunging low behind them, the ridged shell squared to the viewer",
  bite: "THE CLOSING OF BOTH GREAT CLAWS - each pincer's two halves shutting hard on nothing at full reach, the pale filed edges meeting, the body braced behind them. This is the CLAWS closing. The crab has NO JAWS, NO MOUTHPARTS RAISED, NO HEAD AND NO NECK - do not draw any",
  recover: "Both great claws drawn back in and down across the front of the body, half closed, the legs settling the split-and-healed shell square and low again",
  hit: "Rocked hard sideways: the shell tipped up off the legs on one side, both great claws thrown wide and open, the legs on the struck side lifted clear, the ridged mass going over and catching itself. No wound drawn",
  rest: "Closed right up and asleep: the body settled flat and low, all eight legs folded in tight against the underside, and both great claws drawn in and folded flat across the front - and even folded they are too much animal for the space. The eyestalks laid down, the healed ridges catching the light. THE WHOLE CRAB IS IN FRAME AND WHOLE - every leg and both claws visible and folded, not hidden, not buried, not cropped, nothing covering it",
  death: "Dead and turned over onto its back, all eight legs curled in loosely over the pale underside, both great claws slack and hanging open. No gore and no effects",
},
"ford-eel": {
  bite: "The jaws shut hard on nothing at full reach with the head driven straight out of the S-curve behind it, the body still curved and braced to hold whatever the jaws close on",
  alert: "The forward third of the body lifted clear off the ground and drawn back into a tight S over itself, the head held level and square at the viewer, the mouth open. The rest of the body still laid along the ground behind",
  "move-a": "Swimming contact pose A: the whole body thrown into deep even S-curves along its length, the head leading, travelling head-first. NO LEGS, NO FEET - an eel moves by waving its whole body",
  "move-b": "Swimming passing pose B: the same body with every curve reversed, the crests where the troughs were, head leading the same direction, same size as A",
  graze: "Head down hard into the ground with the snout pushed under and the forebody braced in a tight curve behind it, rooting for what is buried rather than cropping anything",
  rest: "Asleep knotted into itself in a tight close coil rather than stretched out, the head laid flat down across its own body, the mouth shut, none of the open S-curve of the idle left in it",
},
"silver-eel": {
  bite: "The jaws shut hard on nothing at full reach, the head driven straight out of the S-curve, the bright flank turned to the light, the body behind still curved and braced to hold",
  alert: "The forward third lifted clear and drawn back into a tight S, the bright flank turned to the light, the head level and square at the viewer, the mouth open",
  "move-a": "Swimming contact pose A: deep even S-curves down the whole length, head leading, travelling head-first. NO LEGS, NO FEET",
  "move-b": "Swimming passing pose B: every curve reversed, head leading the same direction, same size as A",
  graze: "Head down with the snout driven under into the ground, the forebody braced in a tight curve above it, rooting rather than cropping",
  rest: "Asleep knotted into itself in a tight close coil rather than stretched out, the bright flank uppermost, the head laid flat down across its own body, the mouth shut, none of the open S-curve of the idle left in it",
},
"conger": {
  feed: "Head down and jaws working on something held against the ground under a loop of its own body, the forebody curved over it, tearing rather than swallowing whole",
  rest: "Asleep and gone completely still, the heavy body laid slack along the ground in one loose curve, the head flat to the ground and the jaw shut, the eye open and unmoving the way an eel's is",
  alert: "The head and forward body raised clear of the ground and cocked back over itself ready to drive forward, the great jaw parted, the eye on the viewer",
  "move-a": "Swimming contact pose A: the heavy body in deep S-curves along its length, head leading, travelling head-first. NO LEGS, NO FEET",
  "move-b": "Swimming passing pose B: every curve reversed, head leading the same direction, same size as A",
  bite: "The jaws shut hard on nothing at full reach with the head and forward body driven straight out of the coil behind it, the body still curved and braced to hold whatever the jaws close on",
},
"old-conger": {
  feed: "The great head down and the heavy jaws working on something pinned under a loop of its own body, the forebody curved over it, tearing at it",
  alert: "The great head and the forward body hauled up clear and cocked back, the heavy jaw parted, the old eye fixed and unblinking on the viewer",
  "move-a": "Swimming contact pose A: the long heavy body in deep S-curves, head leading, travelling head-first. NO LEGS, NO FEET",
  "move-b": "Swimming passing pose B: every curve reversed, head leading the same direction, same size as A",
  bite: "The heavy jaws closing hard on nothing at full reach, the head driven straight out of the coil, the body behind still curved and braced to hold",
  rest: "Asleep and gone completely still, the long heavy body laid slack along the ground in one loose curve, the great head flat to the ground and the jaw shut, the eye open and unmoving the way an eel's is",
},
};

// The pose SET each of them wants, which is not what its current strip has:
// seven were drawn a frame short and gain an alert and a recover.
const CROSSING_POSES = {
  "the-tide-warden":   ["idle","cut-the-stick","alert","move-a","move-b","attack","recover","death"],
  "the-pilot":         ["idle","read-the-water","alert","move-a","move-b","attack","recover","death"],
  "the-drover":        ["idle","drive-the-road","alert","move-a","move-b","attack","recover","death"],
  "the-eel-cutter":    ["idle","lift-the-trap","alert","move-a","move-b","attack","recover","death"],
  "the-refuge-man":    ["idle","turn-from-the-wall","alert","move-a","move-b","attack","recover","death"],
  "the-bridge-mason":  ["idle","dress-the-stone","alert","move-a","move-b","attack","recover","death"],
  "the-reed-walker":   ["idle","part-the-reed","alert","move-a","move-b","attack","recover","death"],
  // ---- AND THE FOUR THAT WERE LEFT AT SIX ---------------------------------
  // This table began as a catch-up list: seven of the dead were a frame short
  // and were written up to eight, and these four were left describing whatever
  // their existing six-frame sheets already had. Nobody came back to them, so
  // the page went on asking for six because six was what they had in September.
  // By then the fowler had been redrawn to EIGHT and the table was asking for a
  // downgrade of a creature that had already been fixed.
  //
  // All four are eight now, and NONE OF THEM LOSES A FRAME IT ALREADY OWNS. The
  // standard eight for the dead is idle / work / alert / gait / gait / attack /
  // recover / death, but two of these do not walk and one of them has two work
  // poses, so each is topped up with what it is actually missing instead of
  // being forced into the same row. What every one of them gains is `alert` -
  // the moment it stops working and decides about you - which is the whole
  // point of the tier and which three of the four could not do.
  //
  // The ferryman is the one that needed more than a top-up: he is the only one
  // of the eleven with NO work pose at all, so every state he has resolves to
  // the same picture. `find-the-line` is his - see LINES for why it is not the
  // haul his idle already shows.
  "the-drowned-ferryman": ["idle","find-the-line","alert","move-a","move-b","attack","recover","death"],
  // HE CAME DOWN OFF THE ROPE, SO HE WALKS NOW (rome, 2026-09-21). This said a
  // man hanging under a scaffold does not walk anywhere, and that was true of
  // the creature as first written - migration 289 brought him down to work
  // standing, and nothing in the art followed. He is not in the server's ROOTED
  // set, so the world has been moving him the whole time and he slid. The gait
  // costs him `swing`, his windup: it was a second entry in STRIKE_POSES and the
  // driver cycles those, so this is a real frame given up, not a spare one.
  "the-scaffold-hand": ["idle","work-the-stone","alert","move-a","move-b","attack","recover","death"],
  // Already redrawn to eight. This row now matches what the creature carries
  // rather than what it used to.
  "the-fowler":        ["idle","rise-from-the-turf","move-a","move-b","attack","recover","death"],
  // ...AND SO DOES SHE. Same case: not in ROOTED, moved by the world, no gait
  // drawn. The two work poses were both worth keeping and only one can stay now
  // - `work-the-pan` is the one that goes. It is a real loss and worth naming:
  // it was unreachable for months because CALM_POSES kept only the first work
  // pose a creature owned, that was fixed on 2026-09-21, and it is being cut
  // three days later. Feeding a fire that went out is the better of the two.
  "the-salt-widow":    ["idle","feed-the-flue","alert","move-a","move-b","attack","recover","death"],
  // The three that were written and never drawn. Same eight as the others:
  // idle, the work, alert, the gait, the blow, the way out of it, the fall.
  "the-miller":        ["idle","work-the-water","alert","move-a","move-b","attack","recover","death"],
  "the-toll-clerk":    ["idle","shift-the-weight","alert","move-a","move-b","attack","recover","death"],
  "the-long-warden":   ["idle","turn-the-distance","alert","move-a","move-b","attack","recover","death"],
};

// TOPPING UP A STRIP THAT IS ALREADY GOOD, WHICH IS NOT THE SAME JOB.
//
// These eleven have approved art. Nothing here may replace it, so every set
// below names ONLY poses the creature does not already own — re-asking for a
// pose it has would overwrite a drawing somebody already signed off.
//
// The cutter takes 4, 6, 8, 9 or 12 cells and no other number, so a creature
// short of exactly one frame still costs a four-cell sheet. The two throwaway
// names earn those cells back rather than wasting them:
//
//   _anchor  cell 1, always. The creature's ORDINARY stance, drawn to match the
//            attached strip. It is not kept. It is there because a generator
//            asked for one lone pose invents its own scale, and a rest frame at
//            the wrong size is the one error that is invisible in the sheet and
//            obvious the moment the strip moves. Cut it, look at it beside the
//            real idle, and if they do not match, the other cells are wrong too
//            — throw the sheet out rather than the frame.
//   _spare   a second attempt at the sleeping pose from a different angle, for
//            the creatures with nothing else left to ask for. Keep whichever of
//            the two reads better as `rest` and delete the other.
//
// DELETE BOTH PNGs BEFORE BUILDING. build-mob-strips.mjs packs every .png in
// the folder, so a leftover _anchor.png becomes a real twelfth frame.
const SLEEP_TOPUP = {
  // ---- THE FOUR BIRDS ARE A FULL SHEET, NOT A TOP-UP ------------------------
  // EIGHT CELLS, AND THE EIGHT ARE NOT A CHOICE - they are what every bird in
  // the game already carries. The hill eagle, the eagle owl, the scarp raven,
  // the chough and the ptarmigan are all exactly this; the vultures are the
  // same with `feed` where `rest` goes. Match it and a coast bird flies like a
  // mountain bird, which is the whole point.
  //
  //   idle  up glide down landing  attack  rest  death
  //
  // The redraw that prompted this came back as idle/alert/up/down/attack/
  // recover/rest/death - eight cells, but two of them spent on states no bird
  // in this game owns, and GLIDE AND LANDING missing as a result. The driver
  // needs both or it takes the "no arc drawn: just fly" path, so those birds
  // had a bare beat and nothing else: no climb, no glide, no coming down.
  //
  // So `alert` and `recover` are not in this list. Nothing with feathers has
  // them, WATCH_POSES falls through to idle for the whole aviary already, and
  // buying them costs the arc.
  //
  // ORDER IS FLIGHT ORDER, not alphabetical: it is the order the sheet is read
  // in and the order the cut command names, so a mis-generated cell shows up as
  // an obviously wrong picture rather than a subtle one.
  "great-gull":        ["idle","up","glide","down","landing","attack","rest","death"],
  "black-backed-gull": ["idle","up","glide","down","landing","attack","rest","death"],
  "bittern":           ["idle","up","glide","down","landing","attack","rest","death"],
  // The oystercatcher had to be decided rather than copied. Its redraw came
  // back as a WALKER - a real gait pair - and the driver takes the gait first
  // (the travel branch reads move-a, and wings are only the else), so a bird
  // given both walks and never flies. It goes back to the aviary's eight.
  "oystercatcher":     ["idle","up","glide","down","landing","attack","rest","death"],

  // ---- THE ESTABLISHED EIGHT --------------------------------------------
  // This is the crossing's sheet and it is not up for redesign:
  //
  //     [ Idle     ] [ Threat ] [ Attack ] [ Closing bite ]
  //     [ Recovery ] [ Struck ] [ Sleep  ] [ Dead         ]
  //
  //   idle  alert  attack  bite  recover  hit  rest  death
  //
  // Earlier passes here proposed twelve cells, then nine, then three different
  // orderings with a gait in them. All of them were wrong and all of them cost
  // rome a round trip. The set below is the one that was already established;
  // read it off this comment and do not re-derive it.
  "grey-seal":            ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "bull-seal":            ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "ford-eel":             ["idle","alert","move-a","move-b","attack","graze","rest","death"],
  "silver-eel":           ["idle","alert","move-a","move-b","attack","graze","rest","death"],
  "conger":               ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "old-conger":           ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "wrack-crab":           ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "devil-crab":           ["idle","alert","move-a","move-b","attack","feed","rest","death"],
  "the-great-crab":       ["idle","alert","attack","bite","sweep","recover","rest","death"],
  "the-great-devil-crab": ["idle","alert","attack","bite","sweep","recover","rest","death"],
};


// --- the pose set --------------------------------------------------------
// THE BIRDS' EIGHT, WITH THE MEAL IN IT (2026-09-18).
//
// Every flyer was drawn before the fed event reached anything but a scavenger,
// so none of them has a frame for eating and all of them eat. Their eight cells
// were already full - four of the eight went on flight - and the first answer
// here was a four-cell top-up against the shipped art. That was wrong for a
// reason that is not mechanical: a frame generated in a second pass does not
// match the first pass, and ONE FULL SHEET IS THE ONLY WAY THE ART COMES BACK
// CONSISTENT (rome's ruling, and the reason every creature in the game was made
// this way). Nothing gets dropped to pay for it either.
//
// The cell comes from the WINGBEAT. `up` and `down` are one drawing now - two
// names on one frame index, which the strip builder does through ALIAS - so the
// beat costs one cell instead of two and the meal takes the one it gives back.
// The glide and the landing are untouched, so the flight arc still plays.
const BIRD_SHEETS = {
  "bittern":            ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "great-gull":         ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "black-backed-gull":  ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "eagle-owl":          ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "hill-eagle":         ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "scarp-raven":        ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  // the ones the freed cell cannot cover twice: each is short the meal AND the
  // thing it is named for, so the meal goes in and the rest waits for a sheet.
  "mountain-chough":    ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "oystercatcher":      ["idle", "up", "glide", "landing", "attack", "graze", "rest", "death"],
  "ptarmigan":          ["idle", "up", "glide", "landing", "attack", "graze", "rest", "death"],
  "the-old-raven":      ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
  "the-bone-dropper":   ["idle", "up", "glide", "landing", "attack", "feed", "rest", "death"],
};

// THE REDRAW SET (2026-09-18). Creatures already drawn whose sheets cannot
// answer something the world makes them do.
//
// NO STRUCK FRAME AND NO RECOVERY. Both are out by ruling, and between them
// they were holding two cells on the sheets that had them. That is where these
// meals and sleeps come from - and it is also how three adders finally get a
// death frame, which they have never had in the game: they could be killed but
// not seen to die.
//
// Everything else each creature already carries is kept.
// NOTHING IN THESE TABLES MAY NAME A RULED-OUT FRAME (rome, 2026-09-21), and
// the table and the guard have to agree about WHICH. They did not: hit is the
// frame that is out - the flinch when a blow lands - and recover, the settle
// after the creature's own swing, stays. I read it backwards and purged the
// wrong one out of sixteen lists, which is how eight drawn sheets lost a real
// cell. Restored, with hit gone instead.
const REDRAW = {
  // ONE EATING FRAME FOR THE BEAR (rome, 2026-10-21). It hunts and forages, so it
  // was asked for feed AND graze - and with no carcass and no ground drawn the
  // two came back as the same head-down bear. Foraging shows the feed frame.
  "brown-bear":         ["idle", "move-a", "move-b", "attack", "feed", "rest", "inspect-upright", "death"],
  "a-lymer": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "cave-lion": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "ermine": ["idle","inspect-upright","rest","feed","move-a","move-b","attack","death"],
  "fen-viper": ["idle","alert","watch","rest","bask","graze","attack","death"],
  "feral-goat": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "gill-adder": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "glutton": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "hill-fox": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "hill-wolf": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "coyote": ["idle","alert","rest","feed","move-a","move-b","attack","death"], // the grey wolf's sheet, as cut
  "lead-wolf": ["idle","rest","hold-ground","feed","move-a","move-b","attack","death"],
  // THE OLD GREY (mig 323): the boss behind the moon door. Its pack feeds it, so
  // no eating frame; it holds its lie, so hold-ground.
  "the-old-grey": ["idle","alert","rest","hold-ground","move-a","move-b","attack","death"],
  "lynx": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "marsh-hound": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "mountain-hare": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "old-billy": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "red-hind": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "red-stag": ["idle","rest","hold-ground","graze","move-a","move-b","attack","death"],
  "snow-fox": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "snow-hare": ["idle","alert","rest","graze","move-a","move-b","attack","death"],
  "stone-adder": ["idle","watch","rest","bask","move-a","move-b","attack","death"],
  // redrawn 2026-10-20 to the cutthroat's and the carrier's layout: own poses, then alert, walk, one attack
  "strand-thief": ["idle","graze","snatch-escape","alert","move-a","move-b","attack","death"],
  "the-blue-fox": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "the-dancer": ["idle","alert","feed","move-a","move-b","twisting-leap","attack","death"],
  "the-gravid-adder": ["idle","watch","rest","bask","move-a","move-b","attack","death"],
  "the-old-glutton": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "the-raiding-fox": ["idle","rest","feed","move-a","move-b","snatch-escape","attack","death"],
  "the-tom": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
  "the-wrecker": ["idle","alert","graze","move-a","move-b","snatch-escape","attack","death"],
  // the sheet orders of the 2026-10-20 redo, read off the strips they replace
  "the-keeper-of-the-holding": ["idle","hold-ground","alert","check-the-keys","move-a","move-b","attack","death"],
  "the-bellfounder": ["idle","rake-the-melt","watch","alert","move-a","move-b","attack","death"],
  "the-drowned": ["idle","take-hold","alert","move-a","move-b","attack","listen","death"],
  "drowned-hulk": ["idle","take-hold","alert","move-a","move-b","attack","sweep","death"],
  // the barrow-wight and the cantor had no recorded sheet, so the tool invented
  // an eight with no sweep and death fifth (2026-10-27). These are the nine
  // frames they ship, in the order of the strips, death last.
  "twice-dead": ["idle","rise","listen","alert","move-a","move-b","attack","sweep","death"],
  "marrow-cantor": ["idle","listen","hold-the-note","alert","move-a","move-b","attack","sweep","death"],
  "wildcat": ["idle","alert","rest","feed","move-a","move-b","attack","death"],
};

let poses = given.length ? given : REDRAW[id] ? REDRAW[id] : BIRD_SHEETS[id] ? BIRD_SHEETS[id] : SLEEP_TOPUP[id] ? SLEEP_TOPUP[id] : CROSSING_POSES[id] ? CROSSING_POSES[id] : (() => {
  const p = flyer ? ["idle", "up", "down", "glide", "landing"] : ["idle", "move-a", "move-b"];
  p.push("attack");
  // EVERY set the world puts this one in, in WANTS order, rather than the one
  // set a hand happened to remember.
  for (const [set, frame] of WANTS) if (inSet(set) && !p.includes(frame) && p.length < 7) p.push(frame);
  p.push("death");
  // keep whatever species pose it already had, if there is room
  // ...and a pose it already owns is only worth re-asking for if it is still
  // allowed. This named "hit" and not "recover", so a creature that had one kept
  // being handed it back - the guard and this line disagreed. Driven off
  // RULED_OUT now, so there is one place the ruling lives.
  for (const h of had) if (p.length < 8 && !p.includes(h) && !RULED_OUT[h]) p.push(h);
  return p.slice(0, 8);
})();

// --- A REDRAW KEEPS THE SHEET'S ORDER (rome, 2026-10-16) --------------------
// The order a sheet was drawn in is the order it is cut in, and it is NOT the
// order the poses sit in the shipped strip: a strip gains poses at its end when
// a sheet is topped up, so the pilot's strip reads idle, move-a, move-b,
// attack, death, read-the-water... while his sheet was drawn with death last.
// A redraw prompt was once built off the strip order and moved his death to
// cell 5. So: hand this the same poses as a recorded sheet in another order and
// the recorded order wins, out loud; and with no record, death goes last, as it
// does on every sheet the game was built from.
if (given.length) {
  const recorded = REDRAW[id] || BIRD_SHEETS[id] || SLEEP_TOPUP[id] || CROSSING_POSES[id];
  const same = recorded && recorded.length === poses.length && recorded.every((p) => poses.includes(p));
  if (same && recorded.join(" ") !== poses.join(" ")) {
    console.error(`  ORDER KEPT: ${id}'s sheet is recorded as [${recorded.join(" ")}] - using that, not [${poses.join(" ")}]`);
    poses = recorded.slice();
  } else if (!recorded && poses.includes("death") && poses[poses.length - 1] !== "death") {
    console.error(`  ORDER KEPT: death moved to the last cell, where every sheet has it`);
    poses = poses.filter((p) => p !== "death").concat("death");
  }
}

// --- THE SHEET IS CHECKED AGAINST THE WORLD BEFORE IT IS PRINTED -----------
// This runs on EVERY pose list, including a hand-written one out of the tables
// above and one typed on the command line, because the hand-written ones are
// exactly where the misses came from.
{
  const missing = [], why = [], wasted = [];
  // WHAT THE CREATURE WILL OWN WHEN THIS SHEET IS CUT, not what is on the sheet.
  // A top-up carries only the new frames, so judging the sheet alone reports
  // every pose already shipped in the strip as missing.
  const ends = poses.filter((p) => p[0] !== "_").concat(had.filter((h) => !poses.includes(h)));
  for (const [set, frame, reader, list] of WANTS) {
    if (!inSet(set)) continue;
    // An eating row is answered by EITHER eat frame - the driver resolves one
    // per creature and the fed event uses that one, so a grazer drawn grazing is
    // not also short a `feed`.
    const has = EAT.includes(frame) ? eats(ends) : ends.includes(frame);
    // Shadowing cuts BOTH ways, and the second way is the expensive one:
    //   - not drawn and unreachable -> not a gap. Saying MISSING would send a
    //     sheet back to be redrawn for a cell that could only sit unused.
    //   - DRAWN and unreachable -> a wasted cell on a sheet about to be made.
    //     Four of the first ten specced this way carried one: a seal with both
    //     `rest` and `feed` shows the rest and never the feed, because
    //     CALM_POSES stops at the first match.
    const beaten = shadowedBy(list, ends.filter((p) => p !== frame || !has), frame);
    const dead = has && list && shadowedBy(list, ends, frame);
    why.push(set + " -> " + frame +
      (dead ? "  DEAD CELL, \"" + dead + "\" is picked first"
            : has ? ""
            : beaten ? "  n/a, \"" + beaten + "\" is picked first" : "  MISSING"));
    if (!has && !beaten) missing.push(frame + " (" + set + ": " + reader + ")");
    if (dead) wasted.push(frame + " (never shown: \"" + dead + "\" wins that slot)");
  }
  for (const pose of poses) if (DEAD_NAMES[pose]) {
    console.error("\n  " + pose + " is a dead name: " + DEAD_NAMES[pose] +
      ". That cell could never be shown.\n");
    process.exit(2);
  }
  for (const pose of poses) if (RULED_OUT[pose]) {
    console.error("\n  " + pose + " is " + RULED_OUT[pose] +
      ". Do not spec it on a new sheet; spend the cell on what the creature does.\n");
    process.exit(2);
  }
  console.error("  " + id + "  [" + poses.join(" ") + "]");
  for (const w of why) console.error("    " + w);
  if (missing.length) console.error("    ^ the sheet does not answer: " + missing.join(", "));
  if (wasted.length) console.error("    ^ WASTED CELLS: " + wasted.join(", "));
  if (!why.length) console.error("    (in no set that wants a frame)");
}

const COLS = { 4: 2, 6: 3, 8: 4, 9: 3, 12: 4 }[poses.length];
if (!COLS) { console.error(poses.length + " poses — the cutter takes 4, 6, 8, 9 or 12"); process.exit(2); }
const ROWS = Math.ceil(poses.length / COLS);
const W = COLS * 512, H = ROWS * 512;

// --- the creature's own words --------------------------------------------
// A CACHE, BECAUSE D1 IS A REMOTE AND THE DESCRIPTION IS THE ONE THING THAT
// MUST BE EXACT. Generating the whole crossing book is 31 creatures and up to
// 40 wrangler calls, and on 2026-09-12 that run came back with FIVE creatures
// silently carrying "[PASTE THE IN-GAME DESCRIPTION HERE]" — the remote had
// started throttling somewhere in the middle. Nothing failed loudly; the prompts
// looked fine at a glance and would have generated five creatures with no
// subject paragraph at all.
//
// So every successful read is kept, and a failed read falls back to the last
// good one rather than to a placeholder. A cached description can go stale if
// the prose is edited, which is why the fallback SAYS it is using the cache.
const CACHE = path.join(GAME, ".mob-desc-cache.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}

// DESCRIPTIONS A MIGRATION HAS CHANGED BUT PROD HAS NOT SEEN YET.
//
// The subject paragraph is read from D1 --remote, which is the right default:
// that prose is the creature and paraphrasing it is how one stops looking like
// itself. But it means a description rewritten in an unshipped migration is
// invisible here, and the prompt then argues with its own pose list - the
// scaffold hand's poses said he stands while his description still said he hung
// upside down in a harness.
//
// So an entry here wins over D1 until its migration ships. DELETE THE ENTRY the
// moment it does, or this quietly becomes the thing that overrides live prose.
const PENDING_DESC = {
  // migration 289 — he comes down off the rope and works standing
  "the-scaffold-hand": "Standing under the broken arch with both arms up over his head, dressing the underside of a span that is not there any more. The scaffold came down two centuries ago. He did not come down with it, and he has not put his arms down since.",
};

let name = id, desc = "", region = "";
try {
  const out = execFileSync(path.join(GAME, "node_modules/.bin/wrangler"),
    ["d1", "execute", "nomad", "--remote", "--json", "--command",
     `SELECT t.name, t.description, (SELECT r.region FROM mob_spawns s JOIN rooms r ON r.id = s.room_id` +
     ` WHERE s.template_id = t.id LIMIT 1) AS region FROM mob_templates t WHERE t.id = '${id}';`],
    { cwd: GAME, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const r = JSON.parse(out.slice(out.indexOf("[")))[0].results[0];
  name = r.name; desc = r.description; region = r.region || "";
  cache[id] = { name, desc, region: region || (cache[id] || {}).region || "" };
  try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); } catch {}
} catch {
  if (cache[id]) {
    name = cache[id].name; desc = cache[id].desc; region = cache[id].region || "";
    console.error("!! D1 did not answer — using the CACHED description for " + id + ". Check it is current.\n");
  } else {
    console.error("!! could not read the description from D1 and nothing is cached — paste it in by hand\n");
  }
}
if (PENDING_DESC[id]) {
  desc = PENDING_DESC[id];
  console.error("!! using the PENDING description for " + id + " (a migration has changed it and prod has not run that migration yet)\n");
}
// A rare form has no fixed spawns of its own - it arrives on a roll against its
// base - so it reads no region from the join above. Take its base's.
if (!region) {
  try {
    const out = execFileSync(path.join(GAME, "node_modules/.bin/wrangler"),
      ["d1", "execute", "nomad", "--remote", "--json", "--command",
       `SELECT r.region FROM mob_variants v JOIN mob_spawns s ON s.template_id = v.base_id` +
       ` JOIN rooms r ON r.id = s.room_id WHERE v.variant_id = '${id}' LIMIT 1;`],
      { cwd: GAME, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    region = JSON.parse(out.slice(out.indexOf("[")))[0].results[0]?.region || "";
    if (region && cache[id]) { cache[id].region = region; try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); } catch {} }
  } catch { region = (cache[id] || {}).region || ""; }
}

// WHETHER THE THING IS ALIVE, WHICH THE DESCRIPTION DOES NOT SAY.
//
// The crossing's prose is deliberately oblique about it. "It walks the causeway
// from end to end with a notched stick in one hand" does not tell a generator
// that the tide warden drowned two centuries ago, so the generator draws a wet
// man in a coat, and the whole point of the region walks out of the picture.
// Ten of the crossing's creatures are dead and the prose says so about none of
// them; the fowler got drawn as a living poacher on exactly this mistake.
//
// So it is read from the WORLD rather than written here: HOLLOW is the game's
// own register of things with nothing inside, and GRAVE_FLESH separates a wet
// body from bare bone. A sheet can no longer disagree with the tables that
// decide whether the thing bleeds.
//
// AND IT IS NOT A ZOMBIE, which is the note this most needs. The horror is that
// the work did not stop, so the picture has to be of somebody WORKING - not
// lurching, not reaching, not interested in you at all. Gore would make it a
// monster and make it boring. Every "no" below is load-bearing.
// HOW EACH OF THE CROSSING'S DEAD IS EATEN, one per creature and no two alike.
//
// The first sheets came back as eleven copies of one grey man because the block
// below used to ban every signal that reads as dead - "not a skeleton, no bare
// bone, no exposed ribs, no missing flesh" - and then asked skin tone to carry
// the whole job on its own. The cyan marker replaces the eyes, so what was left
// was how grey the face was. Cover the eyes and every one of them was a living
// peasant in a dirty coat.
//
// So the deadness moved into the BODY, and the differentiation moved into how
// each of them died. A warden who walked a causeway loses his legs; a mason who
// struck for two centuries loses the hand that held the mallet; the widow died
// indoors in salt and did not rot at all. That is what stops them being one man
// eleven times, and none of it can be got from the prose alone.
const DECAY = {
  "the-tide-warden":
    "- THE LEGS ARE GONE BELOW THE KNEE. Two centuries of moving salt water has taken them down to shin bone and dried tendon, with the heavy boots still laced on over them. He walks on that.\n"
  + "- THE HANDS ARE THE EXCEPTION and are still whole: white, swollen with water, and steady on the stick.",
  "the-drowned-ferryman":
    "- THE HANDS ARE UNTOUCHED AND MUST STAY SO. White, swollen with water to nearly twice a hand's proper size, fingers whole, and absolutely steady. They are the only part of him that still works and must read as the best-preserved thing on the sheet.\n"
  + "- THE HEAD IS A SKULL. Everything above the collar is gone: bare cranium, the jaw hanging with teeth showing, no hair at all. A skull beside two flawless hands, and the contrast IS the creature.\n"
  + "- THE ARMS BETWEEN THEM ARE THE TRANSITION, forearm bone giving way to whole swollen flesh at the wrist.\n"
  + "- HE HAS LEGS AND THEY ARE WASTED. Draw him in full, standing, wading the bed of the channel. The legs are the part of him that has done nothing for two hundred years, because he moves by hauling on the rope and not by walking: thin, slack, the muscle gone, the knees loose, the boots long since off bare grey feet. They carry him and no more than that.\n"
  + "- SO HE READS TOP-HEAVY AND WRONG. Enormous white swollen hands, working arms, and under them a body that trails. All the strength he has left is in the grip.\n"
  + "- DO NOT DRAW WATER, a waterline, a surface, a deck or a boat. The wading is in the POSTURE - braced, leaning back into the pull, feet planted wide against a current - and never in anything drawn around him.",
  "the-pilot":
    "- THE UPPER FACE IS GONE TO BONE. Brow, both orbits and the bridge of the nose are bare skull, the sockets enormous; the jaw and mouth still carry drawn grey-white skin, so the face is bone above and man below. A pilot's worth was his eyes and his eyes are the part that went.\n"
  + "- ONE SHOULDER IS STRIPPED to the blade and collarbone under the open coat.\n"
  + "- THE HANDS ARE STILL WHOLE - he holds the brass plate flat and level and does not shake.",
  "the-drover":
    "- THE STICK HAS WORN HIM THROUGH. Across the back of both shoulders, where the long stick has ridden for two hundred years, coat and flesh are worn away to a bright polished groove of bare collarbone and shoulder blade. The stick sits in the groove it made. This is the first thing to notice about him.\n"
  + "- BOTH WRISTS ARE BONE where they hook over the stick, the hands beyond them still whole.\n"
  + "- He is the gentlest thing in this region and must not look angry: the stance is unhurried, easy, a working man's.",
  "the-eel-cutter":
    "- HE HAS BEEN FED ON. Clean rounded bites are taken out of him, each down to clean bone, each the size and shape of something that fed in a circle and moved on: three or four out of each forearm, two out of one calf, one out of the cheek so the back teeth show through the side of the face. The edges are smooth and old, not ragged and not bloody.\n"
  + "- BETWEEN THE BITES THE SKIN IS INTACT and salt-white. He is not generally rotted, he is specifically eaten.\n"
  + "- THE HANDS ARE WHOLE and quick, because the hands are the job.",
  "the-refuge-man":
    "- HIS BACK IS GONE AND HIS FRONT IS NOT. He faced the stone and the sea came at him from behind, so everything on his back is stripped: the back of the skull bare, the shoulder blades bare, the whole line of the spine standing clear through a coat torn open down the back.\n"
  + "- THE FRONT OF HIM IS ALMOST WHOLE - face, chest and both hands intact, salt-white, preserved by being held against rock. When he turns he turns from a wreck into a man, and that is the effect to draw.\n"
  + "- THE HANDS ARE WHOLE AND STILL SPREAD, fingers together, exactly as a man braces.",
  "the-bridge-mason":
    "- THE MALLET HAND IS BARE BONE, AND POLISHED. Finger bones, wrist and half the forearm stripped clean, and where the mallet shaft sits in the grip the bone is worn glassy and bright - two hundred years of the same handle in the same place. The other hand, which only holds the chisel, is still whole.\n"
  + "- THE BACK OF THE SKULL AND THE TOP OF THE SPINE are bare and pitted: his head has been down at the work facing the weather since the fall, and the face underneath is more or less preserved.\n"
  + "- Stone dust is worked into every seam and has gone to grey paste with the salt. He is not angry; he is a good tradesman finishing an edge.",
  "the-reed-walker":
    "- THE REED HAS GROWN THROUGH HIM. Living reed stems are rooted in the cavity of his chest and come up out through the ribs, the shoulders and the open coat, standing well above him and swaying with him. Root matting fills the ribcage where the organs were. He is partly a clump of reed and partly a man and you cannot tell at a glance where one stops.\n"
  + "- BECAUSE OF THAT HE IS MOSTLY OUTLINE. The less of him that is legible the better this creature works: ribs, one bare shoulder, a jaw with the teeth showing, the face never fully clear.\n"
  + "- Draw reed ONLY where it is growing out of the body. No reed bed, no loose stems, nothing standing in the cell.",
  "the-scaffold-hand":
    "- BOTH ARMS ARE GONE TO BONE FROM THE SHOULDER DOWN. He worked with his arms up over his head and they are the part that failed: upper arm, forearm and every finger bare dry bone, still held up and still working. The legs and the body below are comparatively whole, which is the wrong way round for a drowned man and is the first thing to notice about him.\n"
  + "- THE SHOULDERS ARE WRECKED where the bone arms meet what is left of him, both joints standing open under a jerkin worn through at the seams.\n"
  + "- HE HAS NOT PUT HIS ARMS DOWN IN TWO HUNDRED YEARS. Head back, arms up, in every pose but one - and the one is the blow. That is the whole of him: the arms coming down is the only thing he does that is not the job, and it should look like the wrongest thing on the sheet.",
  "the-fowler":
    "- THE UNDERSIDE IS PEAT. The whole front of him has lain in wet turf since the fall and the bog has tanned it: dark brown, leathery, flattened, with moss and sedge roots grown in through the sacking and among the ribs, and a crust of peat and root still hanging off him when he lifts. Bog-preserved, not rotted.\n"
  + "- THE UPPERSIDE IS STRIPPED. The back of him, which has been in the weather, is bare: back of the skull, shoulder blades and spine bone-white and clean.\n"
  + "- SO HE IS BROWN UNDERNEATH AND WHITE ON TOP, and coming up off his front is what shows it. That transition is the creature. The hands are brown leather and whole.",
  "the-salt-widow":
    "- SHE IS CURED, NOT DROWNED, and must not match the other ten. She died indoors in a salt house and salt preserves: everything waxy, white and water-swollen on the rest of the crossing's dead is WRONG for her. Dry throughout. The skin is deep tan-brown, hard, papery and drawn tight over the bone like something smoked or salted down - leather where the others are wax.\n"
  + "- THE FACE IS SHRUNK ONTO THE SKULL, lips pulled right back off the teeth in a long dry grimace, nose collapsed, sockets sunk deep. Hair dry and brittle and mostly still there.\n"
  + "- THE ARMS ARE THE BEST-PRESERVED PART OF HER, in the salt to the elbow every day for two hundred years: hard brown leather, whole, every tendon standing out, crusted white to the elbow.\n"
  + "- WHERE SHE HAS CRACKED, SHE HAS CRACKED DRY. Splits across the shoulder and forearm, open and dark and dusty, with no wetness in them at all.",
};

// THE BARROW-WIGHT IS NOT ONE OF THE DROWNED. It shares their set and none of
// their sea: it dried in the earth, so it gets no salt, no sodden coat and no
// shift it is still working - only its own skin, its grave-rags and its patience.
const LAND_DEAD = {
  "twice-dead": {
    decay: "- THE SKIN IS BROWN AND HARD AS HARNESS-LEATHER, shrunk tight over every bone so the whole frame shows through it - ribs, knuckles, the line of the jaw. Nothing soft is left in it to spill.\n"
      + "- WHERE IT HAS SPLIT, IT HAS SPLIT DRY: dark, dusty cracks across the shoulders and the backs of the hands, with no wetness in them at all.",
    cloth: "- What it was buried in hangs off it in dry brown grave-rags, earth-stained and stiff with age.",
    skin: "\nTHE SKIN IS DRY, BROWN AND LEATHER-HARD, NOT ROTTEN AND NOT WET: an old body dried out in the barrow, not one decaying. It is NOT green, NOT grey-green, NOT the colour of a video-game zombie.",
    mood: "Unhurried and patient, not raging: it has been put down before and got back up, and it will come on again.",
  },
  // Older than the barrow-dead and further gone: less leather, more bone.
  "thrice-dead": {
    decay: "- THE BONE SHOWS YELLOW THROUGH IT. What is left on the frame is cured meat, dark and hard, worn right off in places so long yellowed bone stands bare: the forearms and hands, both shins, a run of ribs, half the jaw. More of it is bone than the barrow-wight's.\n"
      + "- IT IS DRY ALL THE WAY THROUGH, as dry as the stones it slept under: dusty, cracked, nothing wet anywhere in it.",
    cloth: "- What it was laid in is rotted to dark olive-brown grave-rags hanging off it in strips.",
    skin: "\nWHAT IS LEFT ON IT IS CURED, NOT ROTTEN AND NOT WET: dark hard meat over yellow bone, an old body dried out under a cairn, not one decaying. It is NOT green, NOT grey-green, NOT the colour of a video-game zombie.",
    mood: "Unhurried and patient, not raging: it has been put down twice and got back up both times, and it will come on again.",
  },
};

// The shared half, which the widow does not get: she is the one the sea missed.
const SALT_SKIN = `
THE SKIN THAT REMAINS IS SALT-CURED, NOT ROTTEN: waxy, translucent, bleached bone-white, drawn tight over what is underneath. Something preserved, not something decaying. It is NOT green, NOT grey-green, NOT the colour of a video-game zombie.`;

// WHAT MUST BE IDENTICAL IN EVERY CELL, for creatures the generator cannot hold
// steady on its own.
//
// The pose lines say what the body is DOING; nothing in the prompt said what the
// body IS. For most animals that is fine - a wolf has four legs and the model
// knows it. A crab is the worst case in the game: eight legs, two claws, two
// eyestalks, a shell wider than it is long, and a creature that walks SIDEWAYS,
// so the sheet's standard "facing slightly toward the viewer's right" does not
// even tell it which way to point. Left to itself it re-rotates the body every
// cell, grows a ninth leg, swaps which claw is the big one, and hangs a limb off
// the top of the carapace.
//
// So the invariants get stated ONCE, up front, and apply to all eight cells.
// This is an anatomy sheet, not a pose - if it ever reads like a pose, it is in
// the wrong table.

// NOTHING TOUCHES THE SIDE OF ITS CELL, AND THE PROMPT HAS TO SAY IT AS A TEST.
//
// "Generous blank gutters at all four edges" had been in this prompt for months
// and was being read as a mood. A scan on 2026-09-18 found FIFTEEN of twenty-one
// freshly drawn sheets with at least one frame cut off at a cell line: the grey
// seal in five frames, the great crab's claws in three, and every bird's glide.
// rome saw the wings, because a severed wing is obvious; a seal's flipper ending
// in a straight vertical line is not, and it had been shipping.
//
// What a cut frame costs is worth stating plainly in the prompt, because the
// generator has no way to know it: the missing part is not cropped, it is in the
// NEXT animal's cell, and it comes back as a stray limb the cutter has to guess
// about. Two frames are damaged by one overrun.
const CONTAIN = `
EVERY CELL IS A BOX AND THE ANIMAL STAYS INSIDE IT. In every single cell there must be CLEAR EMPTY MAGENTA between the animal and all four edges of that cell - no part of it touching an edge, and nothing crossing into a neighbouring cell. Not a claw, not a flipper, not a wingtip, not a tail, not a bill, not a foot, not a limb thrown out in a lunge, and not the spread of a body lying dead.

This matters more than filling the cell. A pose drawn small with empty space around it is CORRECT and costs nothing. A pose that reaches its cell edge is broken twice over: the part past the line is lost, and it lands in the next cell where it corrupts that frame too. If a pose will not fit - a lunge at full reach, a body stretched out, a wing fully open - then the animal is being DRAWN TOO BIG, and the answer is to draw the whole animal smaller in every cell, never to let the pose run over.`;


// THE WINGSPAN SETS THE SCALE FOR THE WHOLE SHEET, AND IT KEEPS COMING BACK WRONG.
//
// rome, 2026-09-18, on five birds at once: the wings are cut off in the flying
// frames. They were - and not by the cutter. In the sheets the spread-wing poses
// were drawn WIDER THAN THEIR CELLS, so each one's wingtips were over the line in
// the neighbour's cell, where nothing can get them back. The eagle owl's glide
// lost 72 pixels off one side and 66 off the other.
//
// The cause is scale, not composition: a bird drawn at a comfortable size perched
// has a wingspan two or three times that wide, and it does not fit the same cell.
// So the spread pose has to set the size and everything else has to be drawn
// SMALLER to match - which is the opposite of what a generator does by default,
// because it fills each cell with its subject.
//
// The clause is written as a measurable test rather than an instruction, because
// "generous gutters" had already been in the prompt for months and was being read
// as a suggestion. The cutter now fails a sheet that breaks it (cut-mob-sheet.mjs).
const WINGSPAN = `
THE WINGSPAN DECIDES THE SCALE OF EVERY CELL ON THIS SHEET. Find the pose with the widest spread of wing. That pose must sit INSIDE its cell with CLEAR MAGENTA VISIBLE BEYOND BOTH WINGTIPS - a margin you could fit a thumb in, on the left and on the right. Draw that pose first, at that size, and then draw EVERY OTHER POSE OF THE BIRD AT THE SAME BODY SCALE, which will leave the perched and standing poses looking small in their cells with a lot of empty magenta around them. THAT IS CORRECT. Empty space costs nothing; a wingtip touching the cell edge ruins the frame.

DO NOT enlarge any pose to fill its cell. DO NOT let a wing, a tail, a foot or a bill touch or cross a cell edge in any cell, for any reason. If a wingspan will not fit, the bird is drawn TOO BIG - shrink the whole bird on every cell until it does. A wingtip that reaches the edge of its cell is not a tight crop, it is a severed wing: the rest of it lands in the next bird's cell and is lost.`;

const CONSTANT = {
  "the-old-grey": `
IT IS OLD, AND IT IS THE SAME OLD WOLF IN EVERY CELL. A very big grey wolf, grey all over with age rather than colour: the muzzle and the brows gone white, the ears notched and torn at the edges, pale old scars showing through the coat on the shoulders and the face. Lean, heavy-boned, long in the leg. The same size, the same scars, the same torn ears in every cell. No red eyes, no glow, no moon. Camera: eye-level three-quarter view, facing slightly toward the viewer's right.
`,
  "wood-sloth": `
ITS CLAWS ARE SHORT, AND THE SAME SIZE IN EVERY CELL. Three short curved claws on each foot, about as long as its toes - never long hooks, never sickles, never longer than the paw itself. Count them and measure them against the paw in every cell: the same short claws, the same length, front and back, in all nine poses. It lives on the ground and walks on all fours; it never hangs from anything. Camera: eye-level three-quarter view, facing slightly toward the viewer's right.
`,
  // HIS ARMS ARE BONE (rome, 2026-10-18). Sunk out of sight in the water that
  // is never drawn, they came back as stumps ending at the forearm.
  "the-miller": `
HIS ARMS ARE BARE SKELETON ARMS. Both arms are bone and nothing else from the shoulder down - no flesh, no skin, no swelling on them at all: the upper arm bone, the two forearm bones side by side, the knuckled bones of the wrist and both hands of long finger bones. Normal length for a man, whole from shoulder to fingertip, both hands drawn in EVERY cell - never ending at the wrist or the forearm and never sunk out of sight. The water's swelling is in his face and his body; his arms are bone. Camera: eye-level three-quarter view, facing slightly toward the viewer's right.
`,
  // THE CHAIN IS SMALL (rome, 2026-10-17: the generator kept getting the long
  // chain wrong). Drawn short and worn round his neck, it stays one thing.
  "the-chainman": `
HIS CHAIN IS SMALL AND HANGS ROUND HIS NECK. A short, light iron surveyor's chain of small links, worn round his neck like a heavy necklace, the two ends hanging down his chest - in EVERY cell, the SAME small chain. It is never long, never looped over a shoulder, never trailing to the ground, never coiled in a heap and never crossing the frame. Ignore the description's chain over the shoulder: draw it round his neck. Where a pose has him handle it, he lifts a little of it in his fingers and it stays round his neck. Camera: eye-level three-quarter view, facing slightly toward the viewer's right.
`,
  "pale-crawler": `
IT HAS FOUR LEGS. "Boneless" in the description means soft and pale-skinned, NOT legless: this is NOT a slug, a worm, a grub, a leech or a snake, and it never moves on its belly. It is a low, long four-legged crawler built like a hairless salamander or a blind cave mole the size of a large dog: a heavy smooth eyeless head, rounded at the front, with a wide slit mouth of small pointed teeth; a thick pale body in loose folds of skin; a short tapering tail; and FOUR muscular limbs, two at the shoulders and two at the hips, each ending in a splayed hand of long pale clawed fingers that grip the ground. The body is carried clear of the ground on those four legs, elbows and knees bent out to the sides like a lizard's. Count the legs in every cell: FOUR, all of them drawn and attached, in every pose - standing, walking, feeding, striking, and lying dead. No eyes anywhere on the head. Camera: eye-level three-quarter view, facing slightly toward the viewer's right.
`,
  "wrack-crab": `
THE SAME ANIMAL IN ALL EIGHT CELLS - COUNT IT EVERY TIME. One carapace. TWO claws. EIGHT walking legs, four down each side. TWO eyestalks. Never a ninth leg, never a third claw, never a limb growing out of the top or the back of the shell, never a leg that does not reach the body. Every leg is jointed the same way and comes off the shell's edge, not its surface.

ONE CLAW IS HELD HIGH AND THE OTHER TUCKED IN LOW AGAINST THE BODY, and it is the SAME claw high in every cell. The two are close to the same size - this is a small crab, not a fiddler. The carapace is the width of two hands across, a broad low oval WIDER SIDE TO SIDE THAN FRONT TO BACK, mottled green-black, with weed caught along the back edge in the same places every time.

THIS ANIMAL HAS NO JAWS, NO MOUTHPARTS RAISED, NO HEAD AND NO NECK. It does not bite with a mouth and it does not have a face to turn. Everything it does, it does with the CLAWS and the eyestalks. Do not draw a head, a muzzle, a jaw or a neck on it in any cell.

CAMERA FOR THIS ANIMAL: it is a sideways-walking crab, so it has no profile to turn. Show it FRONT-QUARTER in every cell - the front edge of the shell and both eyestalks toward the viewer, the long axis of the body running across the cell from left to right, the legs spread to both sides. Keep that same viewpoint in all eight; do not rotate it to a side-on or top-down view in any of them.
`,
  "devil-crab": `
THE SAME ANIMAL IN ALL EIGHT CELLS - COUNT IT EVERY TIME. One carapace. TWO claws. EIGHT walking legs, four down each side. TWO eyestalks. Never a ninth leg, never a third claw, never a limb growing out of the top or the back of the shell, never a leg that does not reach the body. Every leg is jointed the same way and comes off the shell's edge, not its surface.

BOTH CLAWS ARE HEAVY AND CLOSE TO THE SAME SIZE AS EACH OTHER, blunt and thick for their length, and neither is ever drawn small. The carapace is a broad low oval WIDER SIDE TO SIDE THAN FRONT TO BACK, deep bruised red, smooth-plated. The eyes are red.

THIS ANIMAL HAS NO JAWS, NO MOUTHPARTS RAISED, NO HEAD AND NO NECK. It does not bite with a mouth and it does not have a face to turn. Everything it does, it does with the CLAWS and the eyestalks. Do not draw a head, a muzzle, a jaw or a neck on it in any cell.

CAMERA FOR THIS ANIMAL: it is a sideways-walking crab, so it has no profile to turn. Show it FRONT-QUARTER in every cell - the front edge of the shell and both eyestalks toward the viewer, the long axis of the body running across the cell from left to right, the legs spread to both sides. Keep that same viewpoint in all eight; do not rotate it to a side-on or top-down view in any of them.
`,
  "the-great-crab": `
THE SAME ANIMAL IN ALL EIGHT CELLS - COUNT IT EVERY TIME. One carapace. TWO claws. EIGHT walking legs, four down each side. TWO eyestalks. Never a ninth leg, never a third claw, never a limb growing out of the top or the back of the shell, never a leg that does not reach the body. Every leg is jointed the same way and comes off the shell's edge, not its surface.

THE LARGE CLAW IS ALWAYS THE ANIMAL'S LEFT AND THE SMALL CLAW ALWAYS ITS RIGHT. This does not swap between cells for any reason. The large one is roughly twice the other and its closing edge is worn smooth; the small one keeps its serrations.

The carapace is a broad low oval, clearly WIDER SIDE TO SIDE THAN IT IS LONG FRONT TO BACK, crusted white with salt and carrying barnacles in the same places in every cell.

CAMERA FOR THIS ANIMAL: it is a sideways-walking crab, so it has no profile to turn. Show it FRONT-QUARTER in every cell - the front edge of the shell and both eyestalks toward the viewer, the long axis of the body running across the cell from left to right, the legs spread to both sides. Keep that same viewpoint in all eight; do not rotate it to a side-on or top-down view in any of them.
`,
  "the-great-devil-crab": `
THE SAME ANIMAL IN ALL EIGHT CELLS - COUNT IT EVERY TIME. One carapace. TWO claws. EIGHT walking legs, four down each side. TWO eyestalks. Never a ninth leg, never a third claw, never a limb growing out of the top or the back of the shell, never a leg that does not reach the body. Every leg is jointed the same way and comes off the shell's edge, not its surface.

BOTH CLAWS ARE THE LARGE ONE - a MATCHED PAIR, the same size and shape as each other, each of them the size of a great crab's single big claw. Neither is ever drawn small. A pale filed line runs the closing edge of both.

The carapace is a broad low oval, clearly WIDER SIDE TO SIDE THAN IT IS LONG FRONT TO BACK, deep bruised red, the plates split along the seams and healed over in raised ridges - the same ridges in the same places in every cell.

CAMERA FOR THIS ANIMAL: it is a sideways-walking crab, so it has no profile to turn. Show it FRONT-QUARTER in every cell - the front edge of the shell and both eyestalks toward the viewer, the long axis of the body running across the cell from left to right, the legs spread to both sides. Keep that same viewpoint in all eight; do not rotate it to a side-on or top-down view in any of them.
`,
};

const HOLLOW_EYES = `
THE EYES ARE A MARKER COLOUR, NOT A DESIGN CHOICE. Draw the visible interior of both eye sockets as flat solid #00D0D0 CYAN, filling the opening edge to edge, with no highlight, no pupil, no iris detail and no dark line drawn across them. NOTHING ELSE anywhere on this sheet may be cyan or near cyan. This is not the colour they end up: it is a key the pipeline replaces, exactly the way the magenta background is. Keep them the same shape, the same size and the same set in the skull across all poses.`;

// A HELM WITH NOBODY IN IT HAS NO EYES TO KEY.
//
// HOLLOW drives the blood-moon eyes, so every HOLLOW creature was handed the
// cyan marker block automatically - and for the keep's armour that is a flat
// contradiction of the one line anybody remembers about it. The warden's entry
// is "where a face should be, the visor shows only the room behind it". It was
// drawn with two lit cyan eyes in the slot, which is the opposite of the
// creature. The watchman is the same: what looks down the road is the HELM.
//
// These get an explicit no-eyes instruction instead. The consequence is that
// they have no eye layer to turn red on a blood moon, and that is correct -
// nothing lights up in an empty visor. MOB_EYES gates the overlay, so a
// creature with no layer cut simply never gets one.
// MAN-SHAPED THINGS ARE NOT ANIMALS, AND THE BOILERPLATE SAYS ANIMAL.
//
// Every line of the standing template is written for a beast: ONE ANIMAL PER
// CELL, nothing in the cell but the ANIMAL, the ANIMAL stays inside the box,
// species anatomy must remain authentic, do not make the animal a dragon
// hybrid. For the HOLLOW that is answered by the body block, which opens "THIS
// IS NOT A LIVING PERSON" and describes a man. For anything man-shaped that is
// NOT hollow, nothing anywhere in the prompt says so - and the cutpurse came
// back as a beaked animal on all fours with claws.
//
// Its entry is "whatever it was, it has hands and it knows what a purse is".
// That is a degraded PERSON, and the picture has to start from a person.
const MANSHAPED = {
  "cutpurse": "Half the size of a man and twice as quick, but a MAN'S SHAPE: two arms, two legs, a head on a neck, upright or crouched on its heels the way a man crouches - never on all fours, never a muzzle, never a beak, never an animal's hind leg. Whatever it used to be, it has a man's hands and they are the whole point of it: long, knuckly, grabbing fingers. Ragged and filthy and starved down, not furred and not clawed.",
  // THE LIVING MEN (rome, 2026-10-20). The cutthroat was handed the cutpurse's
  // degraded half-man - "ragged and filthy and starved down" - and three living
  // men came back with gaunt faces and their eyes shut. They are people.
  "rag-and-bone": "IT IS MAN-SHAPED AND HALF AGAIN A MAN'S SIZE. Two arms, two legs, a head, standing upright - a big hunched human frame under its load, not a beast. Nothing of the body underneath is visible at all: every inch is hung with what it has found, buckles, snapped blades, mail skirts, a boot, a tin cup, lashed on with wire and gut, and all of it swings when it swings.",
  "verdigris-thing": "IT IS MAN-SHAPED. Two arms, two legs, a head, standing and moving upright like a man, under a century of green crust that has thickened its outline and blurred the features. A man under corrosion - not an animal, not a lump, not a blob. The shape is still a person's.",
  // THE KEEPER OF THE HOLDING (rome, 2026-09-27): a monster, not a human - "his"
  // stays in the world text, since a thing need not be human to be his. This is
  // the look its sheet was drawn from; it lived only in that one handed-over
  // prompt until the redo of 2026-10-20 came back without it.
  "the-keeper-of-the-holding": "IT IS A MONSTER, NOT A HUMAN. A very tall, very thin grey thing, far taller than a doorway is meant for: its limbs are too long and bend at one joint too many, its skin is dry, pale grey and pulled tight over the bones, and its hands are long and spidery with black nails. Its head is long and narrow and bald, hanging forward on a long neck, with a wide lipless mouth and two small, black, sunken eyes. It wears the old household coat with faded facings, too short in the sleeves for its arms, old boots, and the ring of iron keys at its belt. It stands upright on two legs, stooped under a ceiling that is not there.",
  "the-drowned": "IT IS A DROWNED MAN AND KEEPS A MAN'S SHAPE. Two arms, two legs, a head on a neck, standing upright. Bloated - swollen thick at the limbs and the belly, the skin tight and waterlogged - but still plainly the body of a person, not a beast and not a shapeless mass.",
  "drowned-hulk": "IT IS A DROWNED MAN AND KEEPS A MAN'S SHAPE, swollen vast. Two arms, two legs, a head on a neck, standing upright, enormously bloated and pale - far bigger than a man but built like one, not a beast and not a shapeless mass.",
};
const MAN = MANSHAPED[id] ? "\n" + MANSHAPED[id] + "\n" : "";

const FACELESS = {
  "warden": "visor", "warden-surface": "visor", "warden-captain": "visor",
  "last-watchman": "helm",
};
const NO_EYES = `
THERE IS NO FACE IN THERE, AND NOTHING LIGHTS UP IN THE GAP. The opening in the ${FACELESS[id] || "helm"} is EMPTY and stays empty in every cell: flat black shadow, no eyes, no eyeshine, no pupils, no glow, no points of light, no skull, no features of any kind behind it. Nothing anywhere on this sheet is cyan or near cyan. What the gap shows is dark, and the dark is the whole point of it.`;
const EYE_BLOCK = FACELESS[id] ? NO_EYES : HOLLOW_EYES;

// WHAT IT HAS IN ITS HANDS, from the world's own tables rather than from the
// look of the thing. Drawn empty-handed, the keep's soldiery came back as men
// throwing punches in plate - and the game had already answered the question:
// gear_item and loot_item say the bone knight holds a sword and a kite shield,
// the captain a maul rusted to its gauntlets and a tower shield, the warden the
// lantern that gives no light. An armed creature drawn unarmed is wrong in the
// one frame that matters most, the attack.
const CARRIES = {
  "skeleton": "IT IS ARMED, AND THE SWORD IS WHAT IT FIGHTS WITH. A soldier's arming sword, the edge gone to orange rust-lace, in one bare-boned hand. The sword is PRESENT in every cell and MOVES WITH THE POSE - carried low at rest, up in the guard, swung through in the blow, and lying with the body in death. It is never held in one frozen carry position while the pose changes around it.",
  "bone-knight": "IT IS ARMED, AND IT KEPT ITS SHIELD. A rusted arming sword in one hand, an ancient kite-shield on the other arm, lacquer crazed over older bone. Both are PRESENT in every cell and BOTH MOVE WITH THE POSE - the sword cuts and the shield covers. This is the one that remembers how to use them, so it must never be drawn striking with anything but the sword.",
  "warden": "IT CARRIES A LANTERN AND HAS NO WEAPON AT ALL. A dark iron lantern hangs from one gauntlet, unlit - no flame, no glow, no light coming out of it - in every cell. It is a thing carried on a round, not a light source. The other gauntlet is empty, and because it has nothing to fight with, the blow IS that empty gauntlet: a straight armoured punch. That is correct for this one and only this one.",
  "warden-surface": "IT CARRIES A LANTERN AND HAS NO WEAPON AT ALL. A dark iron lantern hangs from one gauntlet, unlit - no flame, no glow, no light coming out of it - in every cell. It is a thing carried on a round, not a light source. The other gauntlet is empty, and because it has nothing to fight with, the blow IS that empty gauntlet: a straight armoured punch. That is correct for this one and only this one.",
  "warden-captain": "IT IS ARMED, AND THE WEAPON IS PART OF IT. A long rusted maul CORRODED SOLID TO ITS GAUNTLETS - hands and haft are one piece of rust and do not come apart - and a tower shield on the other arm, its rim worn to an edge. Both are PRESENT in every cell and MOVE WITH THE POSE. It cannot put the maul down and it cannot punch: every blow it throws is thrown with the maul.",
  "last-watchman": "HE IS STILL IN HIS KIT AND HE IS ARMED WITH A SPEAR. A watchman's harness buckled tight, a grey mantle off the shoulders, boots resoled with mismatched scavenged leather, and a spear. The spear is PRESENT in every cell and MOVES WITH THE POSE - grounded and upright while he stands his post, levelled and driven forward in the blow, lying beside him in death. HE NEVER PUNCHES. A man with a spear in his hands does not throw a fist, and a spear held frozen upright while the body lunges is the single worst thing this sheet can come back as.",
};
const HELD = CARRIES[id] ? "\n" + CARRIES[id] + "\n" : "";

const WHAT_IT_IS = !inSet("HOLLOW") ? "" : inSet("GRAVE_FLESH") ? `
THIS IS NOT A LIVING PERSON, AND THE BODY ITSELF MUST SAY SO. The test: if you covered the head completely, this must still be unmistakably a dead thing. Do not put the deadness in the face or the skin tone alone. The wrongness is in the anatomy - in what is missing, and in mass that is wrong for a living body.

WHAT IS LEFT OF THIS ONE:
- THE HEAD READS AS A SKULL FIRST: jaw and one cheekbone bare to the bone, teeth showing where the lip is gone, eye sockets deep and hollowed, hair down to a few plastered strands.
- THE TORSO HAS THE WRONG MASS: collapsed and narrow where a living man is thick, the clothing hanging off a frame with no bulk in it, ribs plain at the opening.
${(LAND_DEAD[id] && LAND_DEAD[id].decay) || DECAY[id] || "- [NO DECAY SIGNATURE FOR THIS ONE - write one before generating, or it comes back as the same grey man as the others]"}
${LAND_DEAD[id] ? LAND_DEAD[id].cloth : id === "the-salt-widow"
  ? "- THE COAT IS STIFF, PALE AND SALT-RIMED, standing away from the body in board-like folds rather than hanging wet."
  : "- The clothing is sodden black through to the hem, salt-crusted, weed caught in it."}${LAND_DEAD[id] ? LAND_DEAD[id].skin : inSet("GRAVE_FLESH") && id === "the-salt-widow" ? "" : SALT_SKIN}

No gore, no blood, no red wounds, no exposed organs, no bandages. No mist, no aura, no glow, no supernatural effect of any kind. ${LAND_DEAD[id] ? LAND_DEAD[id].mood : "Not menacing the viewer and not looking at the viewer: finishing a shift that ended two hundred years ago, and the viewer is not part of it."}
${EYE_BLOCK}
${HELD}` : `
THIS IS NOT A LIVING PERSON. There is nothing inside it. Draw old dry remains held together and still moving: bone and hardened leather-dry tissue, no wet flesh and no blood anywhere. No aura, no mist, no supernatural effect of any kind.
${EYE_BLOCK}
${HELD}`;

// NOTHING IS IN THE CELL BUT THE CREATURE.
//
// The pose lines used to name the thing being worked on - a flue, a pan, fuel
// going into a fire, a wall to brace on, stonework to dress. Every one of those
// gets drawn, fills the cell, wrecks the silhouette and throws the scale off:
// the salt widow came back loading firewood.
//
// IT IS WRITTEN TWICE BECAUSE A WOLF HAS NO HANDS. The clause was drafted for the
// crossing's drowned workmen and then applied to the whole roster, so every
// animal in the game was being told what it may be "wearing", what it may hold
// "in its hands or carrying on its person", and not to draw a scaffold, a flue,
// a pan, firewood, a reed bed or furniture. None of that means anything to a hill
// wolf, and a prompt full of instructions that cannot apply is a prompt the
// generator is free to read loosely.
// WHO HAS HANDS. The worked version of the clause above talks about what a thing
// is wearing, what it holds in its hands, and a list of the objects a drowned
// workman is drawn beside. Every creature in the crossing's dead is one of those;
// so are the living people scattered through the other regions, and they are NOT
// in HOLLOW because they are not dead. Choosing the clause by HOLLOW alone handed
// a shore wrecker the animal version and told him not to draw vegetation.
//
// Kept as a plain list because there is no set in the world that means "person" -
// HOLLOW means undead, THIEVES means it robs you, and a stoat is in THIEVES.
const PEOPLE = new Set([
  "strand-thief", "the-wrecker",                       // the shore, living
  "the-bellfounder",                                   // the bell pit, living (rome, 2026-10-20)
  "cutthroat", "road-carrier",                         // the road, living
  "the-herd", "the-milker", "the-butter-wife", "the-one-who-stayed",   // the mountain's shepherds
]);
const worked = () => inSet("HOLLOW") || PEOPLE.has(id);
// Every person in PEOPLE who is not one of the dead.
const LIVING_MEN = { has: (x) => PEOPLE.has(x) && !(x === id && inSet("HOLLOW")) };
// THE LIVING LOOK (rome, 2026-10-20). The strand thief's sheet is the THEME of
// the living: ragged strip-cloth in olive-grey and bone, cord and thongs hung
// with found things, wrapped forearms and shins, worn sandals, etched in dry
// olive, bone and earth-brown. Every living person wears that theme.
// Two ways to get it wrong, both done the same day and both ruled out:
//   - ONE COSTUME FOR ALL: the strand thief's exact clothes on everyone made the
//     cutthroat and the wrecker the same man.
//   - A NEW COSTUME EACH: an officer's coat, a felt hat, an apron and clogs threw
//     the theme away entirely.
// So LIVING_LOOK varies a person INSIDE the theme only - how the head is
// covered, the build, how the rags hang, and what that person carries and has
// hung on them - never a different kind of clothing. A NEW living person goes
// into PEOPLE (and WOMEN if she is one) with a LIVING_LOOK of their own; the tool
// will not write one without it.
const WOMEN = new Set(["the-milker", "the-butter-wife"]);
// whose description puts them in their own clothes, so the strand rags are left off
const OWN_CLOTHES = new Set(["the-wrecker"]);
const COMES_AT_YOU = new Set(["cutthroat", "strand-thief", "road-carrier", "the-wrecker"]);
const LIVING_LOOK = {
  "strand-thief": "A short ragged cape. A length of old fishing net slung over one shoulder and a bundle on his back; shells and beach-finds hung on the cords.",
  "cutthroat": "A strip of dark cloth wound over the mouth and nose under the hood. The rags bound in tight to a lean, narrow body, nothing loose to catch; a cord belt hung with small pouches and a knife sheath. A thin knife in one hand.",
  "road-carrier": "A long ragged cape to the calf, the strips hanging longest of any of them. A heavy leather satchel on a long strap across the chest, riding at the hip, the one well-kept thing on him.",
  // HIS DESCRIPTION DRESSES HIM BETTER than the strand provides (rome, 2026-10-20:
  // follow it), so he is the one living man NOT in the strand rags - the same
  // weathered finish, his own clothes, and nothing invented on top.
  "the-wrecker": "Heavier than the strand folk, and dressed in better clothes than theirs, taken off wrecks: good cloth gone worn and salt-stained.",
  "the-bellfounder": "A grey beard singed short at the front, showing under the hood. The rags scorched and burn-marked down the front, the wraps on his forearms thick and blackened. A long iron rake in both hands.",
  "the-herd": "The rags hanging long and heavy like a coat gone the colour of the ground. A long shepherd's stick held across him in both hands.",
  "the-one-who-stayed": "A long grey beard showing under the hood, the rags worn through at the elbows and knotted together again. A long stick held down along his leg.",
  "the-milker": "A long ragged skirt of strip-cloth hitched up and tucked in, the forearms bare and wrapped at the wrist. A wooden pail.",
  "the-butter-wife": "The strip-cloth hanging long to the ankle, a ragged shawl crossed over the chest and tied behind.",
};
// EVERY LIVING FACE IS IN A HOOD'S SHADOW (rome, 2026-10-20). The eyes on a
// living face never once came out right - shut, half-lidded, buried in ink -
// through every wording tried. The strand thief's hood, face set back in its
// shadow, is the one thing that worked, so every living person wears one,
// whatever else they wear.
const HOOD = "A deep hood pulled well forward, the face set back in its shadow with only the nose, the cheek and the jaw catching the light.";
const livingLook = () => {
  const she = WOMEN.has(id), her = she ? "her" : "him", they = she ? "she" : "he";
  if (!LIVING_LOOK[id]) throw new Error(id + " is a living person with no LIVING_LOOK - write one inside the theme, different from every other person's");
  return (she ? "SHE IS A LIVING WOMAN" : "HE IS A LIVING MAN") + ", hard-lived and weathered, drawn in heavy etched detail, all dry olive, bone and earth-brown. " + (OWN_CLOTHES.has(id) ? "" : (she ? "She" : "He") + " is dressed in layer on layer of torn olive-grey and bone-coloured rags hanging off " + her + " in long tattered strips, all of it wound round with cord, thongs and narrow leather straps hung with small found things; bare wiry forearms bound with cloth wraps at the wrist, bare sinewy shins bound with rag wrappings, worn sandals. ") + "Where the description above says what " + they + " wears or how " + they + " is built, draw that first. " + HOOD + " " + LIVING_LOOK[id] + (COMES_AT_YOU.has(id) ? " Carried low, the knees bent and the head pushed forward, ready to move." : "") + " Not a corpse, not a ghoul: a hard living " + (she ? "woman" : "man") + ".";
};
// AN ANIMAL HAS NO RECOVER FRAME (rome, 2026-10-17). The settle after a blow
// is a fighter's frame - the dead and the people with something in their hands.
// The pale crawler's sheet carried one anyway, out of its recorded order, and so
// did its redraw. For every new sheet from here: an animal never gets one. A
// LURKER spends that cell on what it does before it strikes - waiting unseen in
// the dark. Anything else has to be given a pose list without it. Sheets already
// drawn keep what they have.
// NO NEW SHEET GETS A RECOVER FRAME AT ALL (rome, 2026-10-17, restated: the
// settle after a blow is not drawn again, for anything - people and the dead
// included). A lurker spends that cell on its lurk; anything else is given a
// pose list without it.
if (poses.includes("recover")) {
  if (inSet("LURKERS") && !poses.includes("lurk")) {
    console.error(`  RULED OUT: no recover frame - ${id} is a lurker, so that cell is its lurk`);
    poses = poses.map((p) => (p === "recover" ? "lurk" : p));
  } else {
    console.error(`  RULED OUT: no recover frame on any new sheet - give ${id} a pose list without it`);
    process.exit(1);
  }
}

const ALONE_WORKED = `
NOTHING IS IN THE CELL BUT THE CREATURE. Draw ONLY the body, what it is wearing, and what it is holding in its hands or carrying on its person. Do NOT draw the thing it is working on, standing on, leaning against, hanging from, reaching into or looking at. Specifically: no ground, no floor, no wall, no stone, no stonework, no water, no waterline, no surface, no boat, no scaffold, no flue, no pan, no fire, no fuel, no firewood, no reed bed, no bank, no furniture, no object resting on the ground, and no rope, chain or line crossing the frame.

Every pose is the BODY making the shape of the work, alone in empty magenta, with the work itself implied by the posture. Where a pose reads as reaching toward, leaning over, bracing against or working at something, THAT SOMETHING IS NOT DRAWN - only the reach, the lean, the brace, and the hands.
`;
const ALONE_ANIMAL = `
NOTHING IS IN THE CELL BUT THE ANIMAL. Draw ONLY the animal itself, and anything it has in its mouth or under a foot. Do NOT draw the ground it stands on, the thing it eats, the thing it hunts, the thing it climbs or the thing it looks at - no ground, no floor, no rock, no water, no waterline, no surface, no vegetation, no nest, no carcass, no prey, and no object resting on the ground.

Every pose is the BODY making the shape of what it is doing, alone in empty magenta, with the rest implied by the posture. Where a pose reads as reaching down to the ground, standing over a kill or pulling at something, THAT SOMETHING IS NOT DRAWN - only the reach, the crouch, the braced shoulder and the turn of the head.
`;


// A two-legged walk: the contact frame has the legs apart, and
// the passing frame has them together. The old "opposite leg phase" line came
// back as two near-identical spread strides.
const TWO_LEGS = worked() || ["cutthroat", "cutpurse", "footpad", "wayman", "road-carrier", "the-keeper-of-the-holding", "the-drowned", "drowned-hulk"].includes(id);
// A four-legged walk, said the same way (rome, 2026-10-21): "natural gait" and
// "opposite leg phase" came back for the bear, the sloth and the hedgehog as the
// same step drawn twice. The two-legged WALK_A/WALK_B wording, said for paws.
const FOUR_LEGS_WALK = ["brown-bear", "wood-sloth", "hedgehog"].includes(id);
const QUAD_WALK_A = "Contact pose A: One front leg reaches forward with the paw making contact, while the opposite hind leg trails behind. The body is transferring weight forward.";
const QUAD_WALK_B = "Passing pose B: The rear leg has swung forward, with its knee bent and paw lifted, passing beside the planted supporting leg. The legs are close together, not spread apart.";
// what each pose is, said the way the sheet needs it said
const SAY = {
  idle: "Natural resting alert stance",
  "move-a": TWO_LEGS ? WALK_A : FOUR_LEGS_WALK ? QUAD_WALK_A : "Locomotion contact pose A, natural species-specific gait",
  "move-b": TWO_LEGS ? WALK_B : FOUR_LEGS_WALK ? QUAD_WALK_B : "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "Natural physical attack for the species, full body in frame",
  // AN ARMED THING ATTACKS WITH WHAT IT IS HOLDING. The line above is written
  // for an animal, and for a soldier it says nothing at all - so the sheets came
  // back with a spearman throwing a punch, his spear still vertical at his
  // shoulder because the carry note had frozen it there. The weapon is named in
  // the blow itself now, for every creature that has one.
  rest: "Sleeping or lying up, low on the ground, eyes closed",
  death: "Dead, lying limp on its side, no gore and no effects",
  feed: "Feeding from a carcass on the ground, head down at the body",
  graze: "Head down cropping the ground, feeding",
  drink: "Head lowered to water, drinking",
  call: "Head up and mouth open, calling to the others at a distance",
  flee: "Running flat out directly away, full extension",
  up: "Wings at the top of the beat, in flight",
  down: "Wings at the bottom of the beat, in flight",
  glide: "Wings held straight and level, gliding",
  landing: "Landing, wings up and braking, feet reaching forward",
  takeoff: "Leaving the ground, crouched and shoving off, wings not yet biting air",
  alert: "Has seen you and decided about it - the species' own threat or fixing posture, body committed",
  watch: "Stopped and looking, head up, weight settled, not yet moving",
  recover: "Pulling back after a blow, body returning to its guard",
  lurk: "Hidden and waiting before it strikes: pressed flat and motionless into the dark, the body drawn in low and tight, head down along the ground, utterly still - something you would walk past",
  bask: "Settled still and flat in a warm spot, not asleep but not going anywhere",
  hit: "Struck and rocked by it, body recoiling away from the blow, no wound drawn",
  bite: "A closing bite with the jaws, head and neck committed",
  sweep: "A wide swinging blow across the body, full reach",
  "hold-ground": "Refusing to give the ground - square on, braced, not retreating",
  "snatch-escape": "Going away fast with something taken, clutched to the body",
  // The two throwaway cells. See SLEEP_TOPUP above for why they exist.
  _anchor: "The creature's ordinary standing alert stance, matching the attached strip as closely as possible. THIS CELL IS A SCALE AND STYLE CONTROL and will be discarded",
  _spare: "The same pose as the previous cell, seen from a slightly different angle. THIS CELL IS A SECOND ATTEMPT at that pose and one of the two will be discarded",
};

// A CLEAR BACKGROUND, NOT MAGENTA (rome, 2026-10-27), for the sheets named
// here. Magenta was tested and kept for every other sheet; these three redos
// are drawn on real transparency instead. The cutter needs no change: it counts
// any pixel with alpha as ink and keeps the alpha it finds, and the magenta key
// simply finds nothing to take. The swap runs on the finished text, so every
// magenta line in the prompt goes, wherever a template put it.
const CLEAR_BG = new Set(["twice-dead", "marrow-cantor", "the-drowned"]);
const clearBg = (s) => !CLEAR_BG.has(id) ? s : s
  .replace(/Pure solid #FF00FF MAGENTA everywhere outside the creature\./g,
    "A fully TRANSPARENT background everywhere outside the creature: real alpha, empty pixels. No checkerboard pattern drawn in, no white, no grey, no colour, no magenta.")
  .replace(/CLEAR EMPTY MAGENTA/g, "CLEAR EMPTY TRANSPARENT SPACE")
  .replace(/empty magenta/g, "empty transparent space")
  .replace(/exactly the way the magenta background is/g, "the same way the background is keyed")
  .replace(/#FF00FF|magenta/gi, "transparent");

const THROWAWAY = poses.filter((p) => p[0] === "_");
// THE WORD "OPAQUE" IS OUT OF THE MAGENTA LINE (rome, 2026-09-21: it kept
// fouling the sheets). "Pure opaque solid magenta" reads to a generator as an
// instruction about ALPHA, and what came back was the creature part-dissolved
// into its own ground, or a wash laid over the whole cell. The key never needed
// the word: the cutter drops alpha wherever min(r-g, b-g) > 30, which is a hue
// test and has never once asked whether a pixel was declared opaque. "Pure
// solid #FF00FF MAGENTA" says everything the pipeline reads.
//
// NOTE ALSO WHERE THIS COMMENT SITS. It was first written one line lower, which
// put it INSIDE the template literal below - so the note about removing a word
// from the prompt was itself printed into all 22 prompts. Everything from here
// to the end of that literal is prompt text, not source.
console.log(clearBg(`# ${id} — ${poses.length} poses, ${COLS}x${ROWS} sheet at ${W}x${H}
# after generating:
#   node scripts/cut-mob-sheet.mjs <sheet.png> ${id} ${poses.join(" ")}${THROWAWAY.length ? `
#   rm ${THROWAWAY.map((p) => `output/*/${id}/${p}.png`).join(" ")}   # BEFORE building — the builder packs every png it finds` : ""}
#   node scripts/build-mob-strips.mjs ${id} --patch && node scripts/audit-mob-strips.mjs
${"-".repeat(72)}
Use case: stylized-concept. Asset: NOMAD ${region || "world"} mob animation sprite sheet.

The attached sheet is STYLE REFERENCE ONLY: match its handmade dark ink contours, etched crosshatching, dry muted mineral browns/greys, bone highlights, subdued colour, old dungeon-crawler bestiary remastered as crisp illustrated cutout art. Not photographic, not smooth painted/3D, not cartoon, not voxel. ${LIVING_MEN.has(id) ? "Human anatomy must remain authentic: this is a living " + (WOMEN.has(id) ? "woman." : "man.") : "Species anatomy must remain authentic."}

Subject: ${name}. Exact game description: ${desc || "[PASTE THE IN-GAME DESCRIPTION HERE]"}

ONE ${MANSHAPED[id] || LIVING_MEN.has(id) ? "FIGURE" : "ANIMAL"} PER CELL, AND THE SAME ONE IN EVERY CELL. The description above is the creature's entry in the game, not a brief for the picture: it may say how the thing is met, how it behaves, or how many of them there usually are. None of that is an instruction to draw more than one. Draw a SINGLE individual, alone, in every cell - never a pair, never a group, never a second one behind or beside it, however the description phrases it.
${MAN || (LIVING_MEN.has(id) ? "\n" + livingLook() + "\n" : "")}
${CONSTANT[id] || ""}
${WHAT_IT_IS}${worked() ? ALONE_WORKED : ALONE_ANIMAL}Create ${poses.length} full-body poses of this SAME individual in a strict ${COLS} COLUMNS by ${ROWS} ROWS sheet, ${COLS === ROWS ? "square" : "landscape"} ${W}x${H}. Each equal cell 512x512. Pure solid #FF00FF MAGENTA everywhere outside the creature. ${LIVING_MEN.has(id) ? CONTAIN.replace(/the animal/g, "the figure").replace(/THE ANIMAL/g, "THE FIGURE").replace(/Not a claw, not a flipper, not a wingtip, not a tail, not a bill, not a foot,/, "Not a hand, not a foot, not a blade,").replace(/, a wing fully open/, "") : CONTAIN} ${CONSTANT[id] ? "Use the camera named above for this animal, the same in every cell." : "Consistent eye-level three-quarter camera, facing slightly toward the viewer's right."} Consistent physical body scale across poses; size ALL poses to fit ${flyer ? "the widest wingspan" : "the widest pose on the sheet"}.${flyer ? WINGSPAN : ""} Stable body proportions and markings. Feet aligned near the lower edge in ground poses${flyer ? "; body centred in the flight poses" : ""}.

Reading order left to right, top row then bottom row:
${poses.map((p, i) => `${i + 1}. ${WORDING[p] || (LINES[id] && LINES[id][p]) || SAY[p] || p.replace(/-/g, " ")}`).join("\n")}

No invented magic, no armour on animals, no fire, smoke, dust, trails, glows, scenery, cast shadows, text, grid lines, labels, borders, humans except when the specified subject is human.${MANSHAPED[id] || LIVING_MEN.has(id) ? "" : " Do not make the animal a dragon hybrid."}`));
