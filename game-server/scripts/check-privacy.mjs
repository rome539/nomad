// Local privacy gate. Reports categories/relative filenames, never matching data.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, basename, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const home = homedir();
const username = basename(home).toLowerCase();
const needles = [home.toLowerCase()];
// Short, common account names are too ambiguous to treat as personal names.
if (username.length >= 8) needles.push(username);
const leaks = (data) => {
  const text = data.toString('utf8').toLowerCase();
  const utf16 = data.toString('utf16le').toLowerCase();
  return needles.some(n => text.includes(n) || utf16.includes(n));
};
const safe = (value) => needles.reduce((s, n) => s.replaceAll(n, '[redacted]'), value.toLowerCase());
const files = new Set();
const violations = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.add(path);
  }
}

try {
  const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root });
  for (const path of tracked.toString().split('\0').filter(Boolean)) files.add(resolve(root, path));
  const assets = resolve(root, 'game-server/public');
  await walk(assets); // ignored art is still uploaded, so it must be checked too
  const at = process.argv.indexOf('--artifact-dir');
  if (at !== -1) {
    if (!process.argv[at + 1]) throw new Error('missing artifact directory');
    await walk(resolve(process.argv[at + 1]));
  }
  let count = 0;
  for (const path of files) {
    const label = safe(relative(root, path));
    let stat;
    try { stat = await lstat(path); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const publicAsset = path.startsWith(assets + sep);
    if (publicAsset && /(?:\.map$|\.sqlite(?:3)?$|\.db$|\.pem$|(?:^|\/)\.env(?:\.|$)|\.dev\.vars)/i.test(path)) {
      violations.push(`${label}: private build/configuration file in public assets`);
    }
    if (stat.isSymbolicLink()) {
      if (publicAsset) violations.push(`${label}: public symlink needs an explicit review`);
      continue;
    }
    if (!stat.isFile()) continue;
    if (leaks(Buffer.from(relative(root, path))) || leaks(await readFile(path))) violations.push(`${label}: local identity or home path`);
    count++;
  }
  for (const [label, args] of [
    ['commit metadata', ['log', '--all', '--format=%an <%ae> %cn <%ce> %B']],
    ['remote configuration', ['remote', '-v']],
  ]) {
    if (leaks(execFileSync('git', args, { cwd: root }))) violations.push(`${label}: local identity or home path`);
  }
  if (violations.length) {
    console.error(violations.join('\n'));
    console.error(`Privacy check failed (${violations.length} finding(s)); matching data was suppressed.`);
    process.exitCode = 1;
  } else console.log(`Privacy check passed (${count} files plus commit/remote metadata).`);
} catch {
  console.error('Privacy check could not complete; no sensitive diagnostic data printed.');
  process.exitCode = 1;
}
