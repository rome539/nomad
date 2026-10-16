// Artwork is intentionally Git-ignored but MUST be present in a release.
// Keep this manifest when packaging from Git; never infer completeness from
// the files that happen to be in the release directory.
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ? resolve(process.argv[2]) : resolve(here, '../public');
const required = JSON.parse(readFileSync(resolve(here, 'deploy-artwork.json'), 'utf8'));
const missing = required.filter(name => {
  try { const s = statSync(resolve(root, name)); return !s.isFile() || !s.size; }
  catch { return true; }
});
if (missing.length) {
  console.error(`DEPLOY BLOCKED: ${missing.length}/${required.length} required artwork files missing or empty.`);
  console.error(missing.slice(0, 12).join('\n'));
  console.error('Restore the ignored artwork folders from the working copy before deploying.');
  process.exitCode = 1;
} else console.log(`Artwork check passed: ${required.length} required files present.`);
