// THE GATE'S CHIPS MUST NOT OUTLIVE WHAT THEY NAME.
//
//   node scripts/test-gate-chips.mjs
//
// Three chips behind the gate door are built from a CACHE, not from a live read:
// `smelt`, `cure <meat>` and `cook <catch>` come from session.gateSmeltable /
// gateCureName / gateCookName, which chips.ts only READS. Just one function
// recomputes them — ZoneDO.refreshGateStock, reached through sendGateCtx.
//
// So any gate action that CONSUMES from the player's keeping and then pushes
// chips with the bare sendCtx leaves a chip naming a thing that is gone. That is
// not theoretical: Lunapilot reported "button called 'cook egg' when i have no
// eggs" on 2026-09-14, and the same fault was sitting in `cure` and in `smelt`
// beside it — all three consume, all three used the bare send.
//
// This asserts the rule rather than the three instances, because the next gate
// verb that spends something will be written by somebody who has never read
// this file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
let fail = 0;
const t = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (e ? "   " + e : "")); if (!c) fail++; };

// the cache and its one writer still exist and are still wired the way we think
const zone = fs.readFileSync(path.join(SRC, "zone.ts"), "utf8");
const chips = fs.readFileSync(path.join(SRC, "chips.ts"), "utf8");
t("refreshGateStock is the only thing that writes the cache",
  /session\.gateCookName =/.test(zone) && (zone.match(/session\.gateCookName =/g) || []).length === 2,
  (zone.match(/session\.gateCookName =/g) || []).length + " writes, both inside refreshGateStock");
t("sendGateCtx refreshes before it sends",
  /public async sendGateCtx[\s\S]{0,200}refreshGateStock[\s\S]{0,80}sendCtx/.test(zone));
t("chips.ts only reads the cache",
  !/gateCookName =|gateCureName =|gateSmeltable =/.test(chips));

// the rule: consume from the keeping behind the gate, then refresh
const CONSUMES = /removeItemRow|takeLooseAcross|takeLoose\(/;
const offenders = [];
for (const file of ["verbs.ts", "gate.ts"]) {
  const src = fs.readFileSync(path.join(SRC, file), "utf8").split("\n");
  const heads = [];
  src.forEach((l, i) => { if (/^(export )?(async )?function \w+/.test(l)) heads.push(i); });
  heads.push(src.length);
  for (let h = 0; h < heads.length - 1; h++) {
    // CODE ONLY. The first version of this matched on the raw text and was
    // fooled by its own fix: the comment explaining the bug says the words
    // "refreshGateStock", so a function could be reverted to the broken call and
    // still pass, because the explanation sitting above it satisfied the check.
    // A test that a comment can satisfy is not a test.
    const body = src.slice(heads[h], heads[h + 1]).join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const name = (src[heads[h]].match(/function (\w+)/) || [])[1];
    const gate = /outOfWorld|gatePools|gatehouseFeed/.test(body);
    if (!gate || !CONSUMES.test(body)) continue;
    if (!/z\.sendCtx\(session\)/.test(body)) continue;      // pushes no chips at all
    if (/sendGateCtx|refreshGateStock/.test(body)) continue; // refreshes somewhere
    // A function that hands the whole gate case to somebody else never touches
    // the pools itself - cmdCook's in-world branch is the only part it keeps,
    // and in-world the cache is deliberately blank (refreshGateStock clears it).
    if (/if \(z\.outOfWorld\(session\)\) return \w+AtGate/.test(body)) continue;
    // moving between pack/lockbox/vault leaves the union unchanged - not a consume
    if (/cmdStore|cmdRetrieve/.test(name || "")) continue;
    offenders.push(file + ":" + (heads[h] + 1) + " " + name);
  }
}
t("no gate action spends from your keeping and then pushes a stale chip",
  offenders.length === 0, offenders.join(", ") || "all clear");

console.log(fail ? "\n" + fail + " FAILED" : "\nall pass");
process.exit(fail ? 1 : 0);
