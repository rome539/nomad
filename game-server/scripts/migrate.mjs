// THE MIGRATION RECORD (2026-11-10). Migrations were applied by hand, one file
// at a time, and nothing wrote down which had run: a skipped or doubled file
// could only be caught by memory. This applies whatever has not run yet, in
// order, with the same `wrangler d1 execute --file` as before, and writes each
// one down in the database's own `schema_migrations` table as it lands.
//
//   node scripts/migrate.mjs --remote              apply what is pending on production
//   node scripts/migrate.mjs --local               ...or on the local database
//   node scripts/migrate.mjs --remote --status     list what is pending; exits 1 if anything is
//   node scripts/migrate.mjs --remote --baseline 379
//       FIRST TIME ONLY: the database already holds migrations 001-379 and has
//       no record yet. Writes them down as applied without running anything.
//
// It never guesses. With no record and no --baseline it stops; with a file
// numbered below something already applied (a skipped one) it stops; with two
// files sharing a number it stops. A file and its record go to the database in
// one execution, so a file that failed is not written down as done.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MIGRATION_NAME = /^(\d{3})_[a-z0-9_]+\.sql$/;
const TABLE = 'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)';

/**
 * What to do, from the files on disk and the names the database has written
 * down. Pure, so the test can hold it to its rules.
 *   files   - every name in migrations/
 *   applied - names in schema_migrations, or null when the table is not there
 */
export function plan(files, applied) {
  const bad = files.filter((f) => f.endsWith('.sql') && !MIGRATION_NAME.test(f));
  if (bad.length) return { stop: 'These files are not named like a migration (NNN_words.sql): ' + bad.join(', ') };
  const sorted = files.filter((f) => MIGRATION_NAME.test(f)).sort();
  const byNumber = new Map();
  for (const f of sorted) byNumber.set(f.slice(0, 3), [...(byNumber.get(f.slice(0, 3)) ?? []), f]);
  const twins = [...byNumber.values()].filter((g) => g.length > 1);
  if (twins.length) return { stop: 'Two migrations share a number: ' + twins.map((g) => g.join(' and ')).join('; ') + '. Renumber one before applying anything.' };
  if (applied === null) return { stop: 'This database has no migration record yet. Run once with --baseline <number of the last migration it already holds>.' };
  const done = new Set(applied);
  const unknown = applied.filter((n) => !sorted.includes(n));
  if (unknown.length) return { stop: 'The database records migrations that are not in this folder: ' + unknown.join(', ') + '. Is this checkout behind?' };
  const pending = sorted.filter((f) => !done.has(f));
  const last = sorted.filter((f) => done.has(f)).at(-1);
  const skipped = last ? pending.filter((f) => f < last) : [];
  if (skipped.length) return { stop: 'Skipped: ' + skipped.join(', ') + ' never ran, but later ones did (through ' + last + '). Apply or record these by hand before going on.' };
  return { pending, last: last ?? null };
}

/** The names a baseline writes down: every file numbered at or below `upTo`. */
export function baselineNames(files, upTo) {
  return files.filter((f) => MIGRATION_NAME.test(f) && Number(f.slice(0, 3)) <= upTo).sort();
}

/** One migration and its record, as the single file handed to the database. */
export function withRecord(name, sql) {
  if (!MIGRATION_NAME.test(name)) throw new Error('not a migration name: ' + name);
  // Production refuses an empty statement ("SQL code did not contain a
  // statement"), so the closing `;` is added only where the file left its last
  // statement open; trailing notes are looked past to find out.
  const body = sql.replace(/\s*$/, '');
  const closed = body.replace(/(\s|--[^\n]*(\n|$))*$/, '').endsWith(';');
  return body + `\n${closed ? '' : ';\n'}INSERT INTO schema_migrations (name, applied_at) VALUES ('${name}', unixepoch());\n`;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const where = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null;
  const known = new Set(['--remote', '--local', '--status', '--baseline']);
  const at = args.indexOf('--baseline');
  const baseline = at === -1 ? null : Number(args[at + 1]);
  const stray = args.filter((a, i) => !known.has(a) && !(at !== -1 && i === at + 1));
  if (!where || (args.includes('--remote') && args.includes('--local')) || stray.length
      || (at !== -1 && !(Number.isInteger(baseline) && baseline > 0))) {
    console.error('usage: node scripts/migrate.mjs --local|--remote [--status | --baseline <number>]');
    process.exit(2);
  }
  const tidy = (s) => String(s ?? '').replaceAll(homedir(), '~').trim();
  const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  // NOMAD_D1_PERSIST points --local at a throwaway database folder (the tool's own test).
  const persist = where === '--local' && process.env.NOMAD_D1_PERSIST ? ['--persist-to', process.env.NOMAD_D1_PERSIST] : [];
  const d1 = (extra) => spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'nomad', where, '--yes', ...persist, ...extra],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  const query = (sql) => {
    const r = d1(['--json', '--command', sql]);
    if (r.status !== 0) throw new Error('The database did not answer.\n' + tidy(r.stderr || r.stdout).slice(-600));
    return JSON.parse(r.stdout)[0].results;
  };
  const name = where === '--remote' ? 'production' : 'the local database';
  const files = readdirSync(join(root, 'migrations'));
  const scratch = mkdtempSync(join(tmpdir(), 'nomad-migrate-'));
  const runFile = (label, sql) => {
    const file = join(scratch, label);
    writeFileSync(file, sql);
    const r = d1(['--file', file]);
    if (r.status !== 0) throw new Error(tidy(r.stderr || r.stdout).slice(-900));
  };
  try {
    const has = query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='schema_migrations'")[0].n > 0;
    const applied = has ? query('SELECT name FROM schema_migrations ORDER BY name').map((r) => r.name) : null;

    if (baseline !== null) {
      if (applied?.length) throw new Error(`${name} already has a migration record (through ${applied.at(-1)}). A baseline is for the first time only.`);
      const names = baselineNames(files, baseline);
      if (!names.length || Number(names.at(-1).slice(0, 3)) !== baseline) throw new Error('There is no migration numbered ' + baseline + ' in this folder.');
      const rows = names.map((n) => `('${n}', unixepoch())`);
      let sql = TABLE + ';\n';
      for (let i = 0; i < rows.length; i += 100) sql += 'INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES\n' + rows.slice(i, i + 100).join(',\n') + ';\n';
      runFile('baseline.sql', sql);
      console.log(`Written down on ${name}: ${names.length} migrations, through ${names.at(-1)}. Nothing was run.`);
      return;
    }

    const p = plan(files, applied);
    if (p.stop) throw new Error(p.stop);
    console.log(`${name}: last applied ${p.last ?? 'none'}; ${p.pending.length} pending${p.pending.length ? ':' : '.'}`);
    for (const f of p.pending) console.log('  ' + f);
    if (args.includes('--status')) { process.exitCode = p.pending.length ? 1 : 0; return; }
    if (!p.pending.length) return;

    if (where === '--remote') {
      // The way back, written down before anything changes (RUNBOOK.md, "A bad
      // migration"). A missing bookmark does not stop the work; the time does.
      const tt = spawnSync(process.execPath, [wrangler, 'd1', 'time-travel', 'info', 'nomad', '--json'], { cwd: root, encoding: 'utf8' });
      let bookmark = '';
      try { bookmark = JSON.parse(tt.stdout).bookmark ?? ''; } catch { bookmark = (/bookmark is '([^']+)'/.exec(tt.stdout ?? '') ?? [])[1] ?? ''; }
      console.log('Restore point before these migrations: ' + (bookmark || '(not read)') + '  at ' + new Date().toISOString());
    }
    for (const f of p.pending) {
      try { runFile(f, withRecord(f, readFileSync(join(root, 'migrations', f), 'utf8'))); }
      catch (e) { throw new Error(`STOPPED at ${f}. It is not written down as applied, and nothing after it ran.\n` + e.message); }
      console.log('  applied ' + f);
    }
    console.log(`${name} is at ${p.pending.at(-1)}.`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
