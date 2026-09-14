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
  const i = zd.search(new RegExp("^export const " + n + " = new Set", "m"));
  if (i < 0) return false;
  return zd.slice(i, zd.indexOf("]);", i)).includes(`"${id}"`);
};
const src = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
let blk = src.slice(src.indexOf("var MOB_ANIM = {")); blk = blk.slice(0, blk.indexOf("\n};"));
const row = blk.match(new RegExp(`^\\s{2}"${id}":\\s*\\{ n: \\d+, aspect: [\\d.]+, f: (\\{[^}]*\\})`, "m"));
const had = row ? Object.keys(JSON.parse(row[1])) : [];
const flyer = had.includes("up");


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
const LINES = {
"the-tide-warden": {
  idle: "Standing still in a coat sodden black to the hem, a notched stick held upright in one hand, facing along the way",
  "cut-the-stick": "Head down over the notched stick held up close to the chest, cutting a fresh notch into it with a small blade",
  alert: "The knife and the stick stopped dead mid-notch, both hands still on them, the ruined head come up off the tally and levelled straight at the viewer for the first time",
  "move-a": "Locomotion contact pose A, natural walking gait on the bare shin bones",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
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
  death: "Gone slack and face down, arms spread, both hands open and empty, the wasted legs trailing loose behind him",
},
"the-pilot": {
  idle: "Standing very straight and still, a small brass plate held flat on the open palm at chest height, the ruined head down over it. The plate is the only object in the cell",
  "read-the-water": "One arm out straight and level, sighting along it at something far past the viewer's shoulder, the brass plate still held in the other hand",
  alert: "The brass plate lowered out of the sighting line and held forgotten at the hip, the bare-socketed head come round off the sighting line and levelled at the viewer",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A short hard downward strike with the edge of the brass plate, the other arm out for balance",
  recover: "Drawing the brass plate back in to the chest after the strike, the other arm coming down",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-drover": {
  idle: "Standing at ease with a long stick across the worn grooves of both shoulders and both wrists hooked over it, coat tied at the waist, looking past you up the road",
  "drive-the-road": "Stick brought down into one hand and swung out low and wide to the side, the other arm out, moving something that is not there",
  alert: "The stick come down off the worn shoulder grooves into both hands across the body, head up, the easy working stance gone out of him entirely",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A hard level swing of the long stick from the shoulder, arms staying below head height",
  recover: "The stick swinging back down to rest after the blow, the body coming back square",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-eel-cutter": {
  idle: "Standing stooped with a long punt pole held level across the body in both hands, a wicker eel trap hanging at his belt, back half turned, not looking up",
  "lift-the-trap": "Bent right down with both arms out and low in front of him, hauling a dripping wicker eel trap up on its line, the trap and the line hanging clear in his hands. No water and no boat is drawn",
  alert: "The head finally come up. The punt pole still held level and the body still turned away, and only the ruined face come round over the shoulder and fixed on the viewer",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A hard two-handed forward jab with the punt pole, arms staying below head height",
  recover: "Drawing the punt pole back in after the jab, the body settling back into its stoop",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-refuge-man": {
  idle: "Seen from behind: standing upright with both arms raised and both hands flat and open at shoulder height, palms forward, bracing against nothing - no wall is drawn. The entire back of him stripped: bare skull, shoulder blades and the whole line of the spine through a coat torn open down the back",
  "turn-from-the-wall": "Body rotating, one arm still up and back behind him with the hand flat and open, the other coming round with it, the whole and undamaged face beginning to come round toward the viewer",
  alert: "Turned fully round now, both arms down at his sides, squared up and facing, the intact face on the viewer and the stripped back hidden behind him",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A close two-handed shove driving forward from the chest, shoulders behind it",
  recover: "Drawing both hands back in to the chest after the shove, the shoulders coming down",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-bridge-mason": {
  idle: "Standing three-quarters turned away, a heavy mallet hanging down in one bare-bone fist, the ruined head down and angled at something low in front of him. No stone and no stonework is drawn",
  "dress-the-stone": "Crouched low on one knee, the mallet raised in the bone fist and a chisel held out steady in the whole hand, both hands working together at about knee height in front of him. The mallet and the chisel are the only objects in the cell",
  alert: "Turned round from the work at last, the mallet coming UP in the bare-bone fist rather than down, the head levelled at the viewer",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A hard mallet blow driven forward from the shoulder, both hands on the shaft",
  recover: "The mallet coming back down off the blow, the body returning to its working guard",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-reed-walker": {
  idle: "Standing still, reed stems rooted through the ribs and shoulders and rising well above the head so the outline reads as much reed as man, one bare shoulder clear, the face indistinct behind his own stems. No reed bed and no loose reed is drawn",
  "part-the-reed": "One arm out and sweeping across in front of him at chest height, body turning with it, the reed growing out of his own ribs bending with the movement",
  alert: "Stopped dead and square-on to the viewer, the reed growing out of his ribs no longer moving, the face still not quite clear behind it",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "Coming out at full stretch with both arms forward and low, body committed",
  recover: "Drawing back after the lunge, arms coming in, his own reed settling back around him and the outline closing up again",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-scaffold-hand": {
  idle: "Standing with the head tipped right back and both bare-bone arms raised straight up over his head, hands working at something above him, weight settled. What he is working on is NOT drawn",
  "work-the-stone": "Standing, head back, both bone arms straight up and committed, hands picking at nothing overhead, the body leaning back into it",
  swing: "The gather before a blow: both bone arms taken up and back behind the head, elbows high, the body leaning away and loading, nothing released yet",
  attack: "The blow, and the only pose where the arms come down: both bone arms swung down hard from overhead in a two-handed overhand strike, fists together, driven past the waist with the whole body and the head behind it. Everywhere else in this sheet his arms are up; here they are down, and it should read as something a body should not be able to do that fast",
  recover: "The arms travelling back UP over the head after the blow, head tipping back with them, returning to the only posture he has",
  death: "Dead, lying limp on its side with both arms still up past the head, no gore and no effects",
},
"the-fowler": {
  idle: "Lying flat on his front in a hood of sacking and cut reed, face down, absolutely still, the exposed back of him bone-white, the long fowling pole under one hand and part-covered by cut sedge caught on his own sacking. No ground is drawn",
  "rise-from-the-turf": "Coming up onto one knee, the sacking hood falling back, the brown bog-tanned underside and its crust of root now showing, both hands closing on the long fowling pole",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "A hard forward thrust with the long fowling pole held in both hands, body low and driving",
  death: "Dead, lying limp on its side, no gore and no effects",
},
"the-salt-widow": {
  idle: "Standing side on and stooped a little forward from the waist, both brown leather arms down and working at something low in front of her at knee height, hands busy, sleeves and coat crusted white to the elbow. What she is working at is NOT drawn",
  "feed-the-flue": "Crouched right down with both arms driven straight out forward and low, in to the elbow, pushing something away from her at ground level. Her hands are empty and nothing she is pushing, and nothing she is pushing it into, is drawn",
  "work-the-pan": "Standing and leaning far out forward from the hips, a long rake held in both hands with its head down and out at full arm's length, drawing it back toward her across knee height. The rake is the only object in the cell",
  attack: "A hard level swing of the long rake from the shoulder, both hands on it",
  recover: "Pulling back after the blow, the rake coming back in across the body, returning to her guard",
  death: "Dead, lying limp on its side, no gore and no effects",
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
  "the-drowned-ferryman": ["idle","alert","move-a","move-b","attack","death"],
  "the-scaffold-hand": ["idle","work-the-stone","swing","attack","recover","death"],
  "the-fowler":        ["idle","rise-from-the-turf","move-a","move-b","attack","death"],
  "the-salt-widow":    ["idle","feed-the-flue","work-the-pan","attack","recover","death"],
};

// --- the pose set --------------------------------------------------------
let poses = given.length ? given : CROSSING_POSES[id] ? CROSSING_POSES[id] : (() => {
  const p = flyer ? ["idle", "up", "down", "glide", "landing"] : ["idle", "move-a", "move-b"];
  p.push("attack");
  if (inSet("NAPPERS")) p.push("rest");
  p.push("death");
  if (inSet("SCAVENGERS")) p.push("feed");
  if (inSet("GRAZERS") && !p.includes("feed")) p.push("graze");
  if (inSet("PACK_CALLERS")) p.push("call");
  if (inSet("DRINKERS") && p.length < 8) p.push("drink");
  if (inSet("RUNNERS") && p.length < 8) p.push("flee");
  // keep whatever species pose it already had, if there is room
  for (const h of had) if (p.length < 8 && !p.includes(h) && !["hit"].includes(h)) p.push(h);
  return p.slice(0, 8);
})();

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

// The shared half, which the widow does not get: she is the one the sea missed.
const SALT_SKIN = `
THE SKIN THAT REMAINS IS SALT-CURED, NOT ROTTEN: waxy, translucent, bleached bone-white, drawn tight over what is underneath. Something preserved, not something decaying. It is NOT green, NOT grey-green, NOT the colour of a video-game zombie.`;

const HOLLOW_EYES = `
THE EYES ARE A MARKER COLOUR, NOT A DESIGN CHOICE. Draw the visible interior of both eye sockets as flat solid opaque #00D0D0 CYAN, filling the opening edge to edge, with no highlight, no pupil, no iris detail and no dark line drawn across them. NOTHING ELSE anywhere on this sheet may be cyan or near cyan. This is not the colour they end up: it is a key the pipeline replaces, exactly the way the magenta background is. Keep them the same shape, the same size and the same set in the skull across all poses.`;

const WHAT_IT_IS = !inSet("HOLLOW") ? "" : inSet("GRAVE_FLESH") ? `
THIS IS NOT A LIVING PERSON, AND THE BODY ITSELF MUST SAY SO. The test: if you covered the head completely, this must still be unmistakably a dead thing. Do not put the deadness in the face or the skin tone alone. The wrongness is in the anatomy - in what is missing, and in mass that is wrong for a living body.

WHAT IS LEFT OF THIS ONE:
- THE HEAD READS AS A SKULL FIRST: jaw and one cheekbone bare to the bone, teeth showing where the lip is gone, eye sockets deep and hollowed, hair down to a few plastered strands.
- THE TORSO HAS THE WRONG MASS: collapsed and narrow where a living man is thick, the clothing hanging off a frame with no bulk in it, ribs plain at the opening.
${DECAY[id] || "- [NO DECAY SIGNATURE FOR THIS ONE - write one before generating, or it comes back as the same grey man as the others]"}
${id === "the-salt-widow"
  ? "- THE COAT IS STIFF, PALE AND SALT-RIMED, standing away from the body in board-like folds rather than hanging wet."
  : "- The clothing is sodden black through to the hem, salt-crusted, weed caught in it."}${inSet("GRAVE_FLESH") && id === "the-salt-widow" ? "" : SALT_SKIN}

No gore, no blood, no red wounds, no exposed organs, no bandages. No mist, no aura, no glow, no supernatural effect of any kind. Not menacing the viewer and not looking at the viewer: finishing a shift that ended two hundred years ago, and the viewer is not part of it.
${HOLLOW_EYES}
` : `
THIS IS NOT A LIVING PERSON. There is nothing inside it. Draw old dry remains held together and still moving: bone and hardened leather-dry tissue, no wet flesh and no blood anywhere. No aura, no mist, no supernatural effect of any kind.
${HOLLOW_EYES}
`;

// NOTHING IS IN THE CELL BUT THE CREATURE, and this applies to every sheet.
//
// The pose lines used to name the thing being worked on - a flue, a pan, fuel
// going into a fire, a wall to brace on, stonework to dress. Every one of those
// gets drawn, fills the cell, wrecks the silhouette and throws the scale off:
// the salt widow came back loading firewood. The law was already written down
// for exactly one creature ("the boat is NOT drawn - a punt fills the cell") and
// never generalised.
//
const ALONE = `
NOTHING IS IN THE CELL BUT THE CREATURE. Draw ONLY the body, what it is wearing, and what it is holding in its hands or carrying on its person. Do NOT draw the thing it is working on, standing on, leaning against, hanging from, reaching into or looking at. Specifically: no ground, no floor, no wall, no stone, no stonework, no water, no waterline, no surface, no boat, no scaffold, no flue, no pan, no fire, no fuel, no firewood, no reed bed, no bank, no furniture, no object resting on the ground, and no rope, chain or line crossing the frame.

Every pose is the BODY making the shape of the work, alone in empty magenta, with the work itself implied by the posture. Where a pose reads as reaching toward, leaning over, bracing against or working at something, THAT SOMETHING IS NOT DRAWN - only the reach, the lean, the brace, and the hands.
`;
;

// what each pose is, said the way the sheet needs it said
const SAY = {
  idle: "Natural resting alert stance",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "Natural physical attack for the species, full body in frame",
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
  bask: "Settled still and flat in a warm spot, not asleep but not going anywhere",
  hit: "Struck and rocked by it, body recoiling away from the blow, no wound drawn",
  bite: "A closing bite with the jaws, head and neck committed",
  sweep: "A wide swinging blow across the body, full reach",
  "hold-ground": "Refusing to give the ground - square on, braced, not retreating",
  "snatch-escape": "Going away fast with something taken, clutched to the body",
};

console.log(`# ${id} — ${poses.length} poses, ${COLS}x${ROWS} sheet at ${W}x${H}
# after generating:
#   node scripts/cut-mob-sheet.mjs <sheet.png> ${id} ${poses.join(" ")}
#   node scripts/build-mob-strips.mjs ${id} --patch && node scripts/audit-mob-strips.mjs
${"-".repeat(72)}
Use case: stylized-concept. Asset: NOMAD ${region || "world"} mob animation sprite sheet.

The attached sheet is STYLE REFERENCE ONLY: match its handmade dark ink contours, etched crosshatching, dry muted mineral browns/greys, bone highlights, subdued colour, old dungeon-crawler bestiary remastered as crisp illustrated cutout art. Not photographic, not smooth painted/3D, not cartoon, not voxel. Species anatomy must remain authentic.

Subject: ${name}. Exact game description: ${desc || "[PASTE THE IN-GAME DESCRIPTION HERE]"}
${WHAT_IT_IS}${ALONE}
Create ${poses.length} full-body poses of this SAME individual in a strict ${COLS} COLUMNS by ${ROWS} ROWS sheet, landscape ${W}x${H}. Each equal cell 512x512. Pure opaque solid #FF00FF MAGENTA everywhere outside the creature. Generous blank gutters at all four edges of each cell. Every wing, tail, limb and carried item fully contained WITHIN its cell. Never cross row or column boundaries. Consistent eye-level three-quarter camera, facing slightly toward the viewer's right. Consistent physical body scale across poses; size ALL poses to fit the widest wingspan. Stable body proportions and markings. Feet aligned near the lower edge in ground poses; flight body centred.

Reading order left to right, top row then bottom row:
${poses.map((p, i) => `${i + 1}. ${WORDING[p] || (LINES[id] && LINES[id][p]) || SAY[p] || p.replace(/-/g, " ")}`).join("\n")}

No invented magic, no armour on animals, no fire, smoke, dust, trails, glows, scenery, cast shadows, text, grid lines, labels, borders, humans except when the specified subject is human. Do not make the animal a dragon hybrid.`);
