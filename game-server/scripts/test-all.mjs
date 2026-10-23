// Runs every scripts/test-*.mjs and says which pass. Part of every ship:
// a bug that was fixed once gets a test here so it can't come back unseen.
//   node scripts/test-all.mjs            all of them
//   node scripts/test-all.mjs den parser only names containing a word
// A failing test prints the tail of its output; the full log is in
// .test-logs/<name>.log.
import { spawn } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cpus } from 'node:os';

const here = fileURLToPath(new URL('.', import.meta.url));
const logs = join(here, '..', '.test-logs');
const TIMEOUT_MS = 240_000;
const words = process.argv.slice(2);
const all = (await readdir(here)).filter(f => /^test-.*\.mjs$/.test(f) && f !== 'test-all.mjs').sort();
const picked = words.length ? all.filter(f => words.some(w => f.includes(w))) : all;
await mkdir(logs, { recursive: true });

function run(file) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, [join(here, file)], { cwd: join(here, '..'), env: process.env });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { out += `\n[timed out after ${TIMEOUT_MS / 1000}s]`; child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ file, code, out, secs: ((Date.now() - started) / 1000).toFixed(1) });
    });
  });
}

const queue = [...picked];
const results = [];
const lanes = Math.max(1, Math.min(4, cpus().length - 1));
await Promise.all(Array.from({ length: lanes }, async () => {
  while (queue.length) {
    const r = await run(queue.shift());
    results.push(r);
    await writeFile(join(logs, r.file.replace(/\.mjs$/, '.log')), r.out);
    console.log(`${r.code === 0 ? 'pass' : 'FAIL'}  ${r.secs.padStart(6)}s  ${r.file}`);
  }
}));

const failed = results.filter(r => r.code !== 0);
for (const r of failed) {
  console.log(`\n--- ${r.file} (exit ${r.code}) ---`);
  console.log(r.out.trim().split('\n').slice(-15).join('\n'));
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
