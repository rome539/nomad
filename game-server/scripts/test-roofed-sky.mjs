// A ROOF IS NOT A CEILING OVER THE WHOLE SKY.
//
// artSkyFor answers "in" for a room that is not in OUTDOOR_ROOMS, and SKY_BASE
// maps "in" to the DAY plate. That is right for the sealed places it was
// written for and wrong for every roofed room standing in open country: the
// Carter's Rest is a three-walled cart shelter beside the road, and it was
// painting a sunlit road at midnight (rome, 2026-09-20).
//
// The rule now: a roofed room in an outdoor region keeps its shelter from the
// WEATHER and still takes the HOUR. The keep, the warrens and the deep are the
// only places left with no sky at all.
//
// The real function is lifted out of zone.ts rather than retyped, so this
// cannot drift from what ships.
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const src = fs.readFileSync(path.join(HERE, "..", "src/zone.ts"), "utf8");
const at = src.indexOf("public artSkyFor(session: Session)");
const body = src.slice(src.indexOf("{", at) + 1, src.indexOf("\n  }", at));

let fail = 0;
const t = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (e ? "   " + e : "")); if (!c) fail++; };

// The world this runs in: one roofed road room, one open road room, one sealed
// fortress room, and one gate. Weather is on, so a plate that ignores it shows.
const ROOMS = {
  "the-carters-rest": { region: "road",  outdoor: false },
  "the-east-paving":  { region: "road",  outdoor: true  },
  "the-deep-cell":    { region: null,    outdoor: false },
  "the-relay-house":  { region: "road",  outdoor: false },   // a gate: open sky by rule
  "the-black-hut":    { region: "den",   outdoor: false },   // a roof in a band with no plates
};
function skyFor(id, { night = false, raining = false, inside = false } = {}) {
  const ctx = {
    ART_KEYS: { has: () => true },
    OUTDOOR_ROOMS: { has: (r) => !!ROOMS[r]?.outdoor },
    OUTDOOR_REGIONS: { has: (r) => ["out", "road", "wood", "mountain", "den", "crossing"].includes(r) },
    events: {
      weatherNow: () => (raining ? "rain" : ""), snowed: () => false,
      foggy: () => false, raining: () => raining, phaseOf: () => "",
    },
    isNight: () => night, isBloodMoon: () => false, isFullMoon: () => false,
    eclipsePhase: () => "idle", isDusk: () => false, isDawn: () => false,
    session: { pubkey: "k", roomId: id },
    self: {
      outOfWorld: () => inside,
      world: { entryRooms: { has: (r) => r === "the-relay-house" }, rooms: { get: (r) => ROOMS[r] } },
      artSkyFor: null,
    },
  };
  const fn = new Function("ART_KEYS", "OUTDOOR_ROOMS", "OUTDOOR_REGIONS", "events",
    "isNight", "isBloodMoon", "isFullMoon", "eclipsePhase", "isDusk", "isDawn", "session", "self",
    body.replace(/\bthis\b/g, "self").replace(/!\./g, ".")   /* the TS non-null assertion is not JS */);
  return fn(ctx.ART_KEYS, ctx.OUTDOOR_ROOMS, ctx.OUTDOOR_REGIONS, ctx.events, ctx.isNight,
    ctx.isBloodMoon, ctx.isFullMoon, ctx.eclipsePhase, ctx.isDusk, ctx.isDawn, ctx.session, ctx.self);
}

// THE BUG, STATED AS A TEST.
t("a roofed road room takes the NIGHT at night", skyFor("the-carters-rest", { night: true }) === "night",
  skyFor("the-carters-rest", { night: true }));
t("...and the day by day", skyFor("the-carters-rest") === "day", skyFor("the-carters-rest"));
// ...and the roof still does its job.
t("...but the rain never reaches it", skyFor("the-carters-rest", { raining: true }) === "day",
  skyFor("the-carters-rest", { raining: true }));
t("...not even on a wet night", skyFor("the-carters-rest", { night: true, raining: true }) === "night",
  skyFor("the-carters-rest", { night: true, raining: true }));
// The open road beside it is unchanged in every respect.
t("the open road still takes the night", skyFor("the-east-paving", { night: true }) === "night",
  skyFor("the-east-paving", { night: true }));
t("...and still gets rained on", skyFor("the-east-paving", { raining: true }) === "rain",
  skyFor("the-east-paving", { raining: true }));
// And the genuinely sunless places keep their answer.
t("a sealed fortress room still has no sky", skyFor("the-deep-cell", { night: true }) === "in",
  skyFor("the-deep-cell", { night: true }));
// AND THE OTHER ROOFS IN THE WORLD ARE LEFT ALONE. Twenty rooms across the
// dens, the open ground and the wood have the same roof and the same argument,
// and their bands have no ground plates - so widening this would repaint
// interiors nobody asked about for no gain. They keep "in" until their own
// bands are painted.
t("a roof in an unpainted band is untouched", skyFor("the-black-hut", { night: true }) === "in",
  skyFor("the-black-hut", { night: true }));
// Gates are exterior approaches; the gatehouse is the separate interior.
t("an exterior gate keeps its sky and rain", skyFor("the-relay-house", { raining: true }) === "rain",
  skyFor("the-relay-house", { raining: true }));

t("entering the gatehouse hides the sky", skyFor("the-relay-house", { raining: true, inside: true }) === "in");
t("gatehouse at an open-air gate also hides the sky", skyFor("the-east-paving", { night: true, inside: true }) === "in");

console.log(fail ? "\n" + fail + " FAILED" : "\nall pass — a roof keeps the weather off and lets the hour in");
process.exit(fail ? 1 : 0);
