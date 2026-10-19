// A deploy shows the reweave line once and tells the player to refresh - the page never reloads itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { parse } from 'acorn';
const module = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' }).code, { module });
const js = module.exports.PAGE.split('<script type="module">')[1].split('</script>')[0];
const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
const fn = name => { const n = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); return js.slice(n.start, n.end); };
const ctx = vm.createContext({ BUILD: 'old', seenBuild: '', latestBuild: '', worldBuild: '', lines: [], reloads: 0 });
ctx.print = t => ctx.lines.push(t);
ctx.location = { reload() { ctx.reloads++; } };
vm.runInContext(fn('checkBuild'), ctx);
const at = (latest, world) => { ctx.latestBuild = latest; ctx.worldBuild = world; ctx.checkBuild(); };
at('old', 'old'); assert.equal(ctx.lines.length, 0);
// A deploy lands: the Worker serves 'new' but the world still runs 'old'. Say
// nothing yet - a refresh now would put a new page on the old rules.
at('new', 'old'); assert.equal(ctx.lines.length, 0);
// The world restarts onto it: now, once.
at('new', 'new'); at('new', 'new');
assert.equal(ctx.reloads, 0);
assert.equal(ctx.lines.length, 1);
assert.match(ctx.lines[0], /reweaves.*Refresh the page/);
// ...and a page still open when ANOTHER build lands says so again, once.
at('newer', 'new'); assert.equal(ctx.lines.length, 1);
at('newer', 'newer'); at('newer', 'newer');
assert.equal(ctx.lines.length, 2);
assert.equal(ctx.reloads, 0);
// A page that is already the newest build never asks for a refresh.
ctx.BUILD = 'newest'; at('newest', 'newer'); at('newest', 'newest');
assert.equal(ctx.lines.length, 2);
assert.ok(!js.includes('location.reload();\n}\nvar') && !/maybeReload|nomad_rewoven/.test(js));
console.log('PASS: each new build says it reweaves once the world runs it, asks for a refresh, and never reloads the page.');
