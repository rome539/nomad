// A deploy reweaves the page onto the new build - but never mid-fight, and never in a loop.
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
const make = (fighting, last) => {
  const lines = [], store = { nomad_reloaded: last ? String(Date.now() - 1000) : null };
  const ctx = vm.createContext({ BUILD: 'old', staleBuild: false, buildNoticeShown: false, lastCombat: fighting, reloads: 0,
    print: t => lines.push(t), Date, sessionStorage: { getItem: k => store[k], setItem: (k, v) => { store[k] = v; } } });
  ctx.location = { reload() { ctx.reloads++; } };
  vm.runInContext(fn('checkBuild') + '\n' + fn('maybeReload'), ctx);
  return { ctx, lines };
};
// Out of a fight: a new build reweaves at once.
{ const { ctx } = make(false, false); ctx.checkBuild('old'); assert.equal(ctx.reloads, 0); ctx.checkBuild('new'); assert.equal(ctx.reloads, 1); }
// In a fight: it waits, then reweaves when the fight ends.
{ const { ctx } = make(true, false); ctx.checkBuild('new'); assert.equal(ctx.reloads, 0); ctx.lastCombat = false; ctx.maybeReload(); assert.equal(ctx.reloads, 1); }
// Just reloaded and still out of step: one notice, no loop.
{ const { ctx, lines } = make(false, true); ctx.checkBuild('new'); ctx.maybeReload(); assert.equal(ctx.reloads, 0); assert.equal(lines.length, 1); }
console.log('PASS: a new build reweaves the page, waits out a fight, and never loops.');
