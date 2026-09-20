// A deploy may notify, but must never reload a player out of the gatehouse.
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
for (const fighting of [false, true]) {
  const lines = [];
  const ctx = vm.createContext({ BUILD: 'old', staleBuild: false, buildNoticeShown: false, lastCombat: fighting,
    print: t => lines.push(t), location: { reload() { assert.fail('must not reload'); } } });
  vm.runInContext(fn('checkBuild') + '\n' + fn('maybeReload'), ctx);
  ctx.checkBuild('old'); assert.equal(lines.length, 0);
  ctx.checkBuild('new'); assert.equal(lines.length, 1);
  ctx.lastCombat = false; ctx.maybeReload(); ctx.checkBuild('newer'); assert.equal(lines.length, 1);
}
console.log('PASS: build changes show one notice and never reload, including gatehouse exit and combat end.');
