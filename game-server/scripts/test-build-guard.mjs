// TEST THE STALE-BUILD GUARD.
//
//   node scripts/test-build-guard.mjs
//
// Lifts checkBuild and maybeReload out of public.ts and runs them against a stub
// - no browser, and no copy of the logic that can drift from the client.
//
// The guard exists because a page open across a deploy keeps its OLD script and
// is handed the NEW assets. The socket reconnects silently by design, so nothing
// ever told the page it had gone stale, and a player saw creature strips drawn
// as one flat picture (2026-09-08).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, "..", "src/public.ts"), "utf8");
const cut = (name) => { const i = src.indexOf("\nfunction " + name + "(");
  let d=0; for (let k=src.indexOf("{",i); k<src.length; k++){ if(src[k]==="{")d++; else if(src[k]==="}"&&--d===0) return src.slice(i+1,k+1); } };
const body = "var lastCombat=false, staleBuild=false, BUILD='aaa', reloaded=0, printed=[];\n"
  + "var sessionStorage={getItem:()=>store, setItem:(k,v)=>{store=v}};\n"
  + "var location={reload:()=>{reloaded++}};\n"
  + "function print(m,c){printed.push(m)}\n"
  + cut("checkBuild") + "\n" + cut("maybeReload") + "\n"
  + "return { checkBuild, maybeReload, st:()=>({reloaded, printed, staleBuild}), fight:(v)=>{lastCombat=v}, setBuild:(b)=>{BUILD=b}, reset:()=>{staleBuild=false;reloaded=0;printed=[]} };";
let store = 0;
const mk = () => new Function("store", body)(store);

let fail = 0;
const t = (n,c,e) => { console.log((c?"  ok   ":"  FAIL ")+n+(e?"   "+e:"")); if(!c) fail++; };

let g = mk();
g.checkBuild("aaa"); t("same build does nothing", g.st().reloaded === 0);

g = mk(); g.checkBuild("bbb");
t("a changed build reloads", g.st().reloaded === 1);

g = mk(); g.fight(true); g.checkBuild("bbb");
t("...but never mid-fight", g.st().reloaded === 0);
g.fight(false); g.maybeReload();
t("...and takes it the moment the fight ends", g.st().reloaded === 1);

g = mk(); g.setBuild("__BUILD__"); g.checkBuild("bbb");
t("an unstamped dev page is left alone", g.st().reloaded === 0);

g = mk(); g.checkBuild("bbb"); g.checkBuild("ccc"); g.checkBuild("ddd");
t("it only ever fires once", g.st().reloaded === 1);

store = Date.now();                       // as if we reloaded a second ago
g = mk(); g.checkBuild("bbb");
t("a reload loop is refused, and says so", g.st().reloaded === 0 && g.st().printed.length === 1,
  g.st().printed[0] ? g.st().printed[0].slice(0,48) + "…" : "no line printed");
console.log(fail ? "\n" + fail + " FAILED" : "\nall pass");
process.exit(fail ? 1 : 0);
