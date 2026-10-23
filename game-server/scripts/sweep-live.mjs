// THE SWEEP FOR IMPOSSIBLE STATES (rome, 2026-10-23). Reads a copy of the live
// database and lists everything in it that the game's own rules say cannot be
// true: things over their caps, items with no owner or no template, broken
// seals, dens that point nowhere. It never writes anything.
//
//   wrangler d1 export nomad --remote --output=<dir>/live.sql
//   sqlite3 <dir>/live.db < <dir>/live.sql
//   node scripts/sweep-live.mjs <dir>/live.db
//
// Keep the copy OUT of the repo: it is every player's inventory. The judging is
// done with the game's own functions (slotsUsed, stackable, denCap...), bundled
// from src/, so the sweep agrees with the game by construction.
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/sweep-live.mjs <live.db>'); process.exit(2); }
const sql = new DatabaseSync(file, { readOnly: true });
const all = (q, ...a) => sql.prepare(q).all(...a);

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'nomad-sweep-'));
const out = join(dir, 'sweep.mjs');
await build({
  stdin: { contents: [
    "export {ZoneDO} from './zone';",
    "export {loadWorld} from './world';",
    "export {denCap} from './den';",
    "export {PACK_CAP, PACK_FOOD_CAP, PACK_TORCH_CAP, LOCKBOX_CAP, VAULT_CAP, DEN_BUNKS, DEN_BUTT_CAP, DEN_BUILDS, TRAIT_POOL, BAD_TRAIT_POOL, TRAIT_MATERIAL, materialOf} from './zone-data';",
  ].join('\n'), resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent',
  plugins: [{ name: 'worker-text', setup(b) {
    b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
      async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
  } }],
});
const G = await import(pathToFileURL(out));
await rm(dir, { recursive: true, force: true });

// The game's loaders, over the copy.
const db = { prepare(q) { const st = sql.prepare(q); const bound = (...a) => ({
  async all() { return { results: st.all(...a) }; }, async first() { return st.get(...a) ?? null; },
  async run() { throw new Error('the sweep never writes'); } });
  return { bind: bound, ...bound() }; } };
const world = await G.loadWorld(db, 'door');
const z = new G.ZoneDO({}, {});
z.world = world;
const T = world.itemTemplates;

const findings = [];
const flag = (kind, who, what) => findings.push({ kind, who, what });
const players = new Map(all('SELECT * FROM players').map(p => [p.pubkey, p]));
const who = pk => players.get(pk)?.name ?? (pk ? pk.slice(0, 10) + '…' : '?');
const item = r => ({ rowId: r.id, itemId: r.item_id, serial: r.signed_serial, equipped: !!r.equipped,
  condition: r.condition, journalId: r.journal_id || undefined, loreId: r.lore_id || undefined });
const named = id => T.get(id)?.name ?? id;

const rows = all('SELECT * FROM player_items');
const byOwner = new Map();
for (const r of rows) {
  const k = r.pubkey + '\u0000' + r.container;
  if (!byOwner.has(k)) byOwner.set(k, []);
  byOwner.get(k).push(r);
}

// ---- every row on its own
const KNOWN = /^(|lockbox|vault|den:.+)$/;
for (const r of rows) {
  if (!T.has(r.item_id)) flag('item with no template', who(r.pubkey), `${r.item_id} (row ${r.id}, in ${r.container || 'pack'})`);
  if (!players.has(r.pubkey)) flag('item with no owner', r.pubkey.slice(0, 10) + '…', `${named(r.item_id)} in ${r.container || 'pack'}`);
  if (!KNOWN.test(r.container)) flag('item in an unknown place', who(r.pubkey), `${named(r.item_id)} in "${r.container}"`);
  if (r.condition < 0 || r.condition > 100) flag('condition out of range', who(r.pubkey), `${named(r.item_id)} at ${r.condition}`);
  if (r.fuel < 0) flag('negative fuel', who(r.pubkey), named(r.item_id));
  if (r.equipped && r.container !== '') flag('equipped but not on the body', who(r.pubkey), `${named(r.item_id)} in ${r.container}`);
  if (r.equipped && !z.isGear(r.item_id)) flag('equipped thing that is not gear', who(r.pubkey), named(r.item_id));
  if (r.vaulted && r.container !== 'vault') flag('old vaulted flag on a row outside the vault', who(r.pubkey), `${named(r.item_id)} in ${r.container || 'pack'}`);
  if (r.rolled_traits) {
    const pool = TRAITS_FOR(T.get(r.item_id));
    for (const t of r.rolled_traits.split(',').map(s => s.trim().split(':')[0]).filter(Boolean)) {
      if (pool && !pool.has(t)) flag('rolled trait outside its pool', who(r.pubkey), `${named(r.item_id)}: ${t}`);
      const fits = G.TRAIT_MATERIAL[t];
      if (fits && !fits(G.materialOf(r.item_id))) flag('rolled trait its material cannot carry', who(r.pubkey), `${named(r.item_id)} (${G.materialOf(r.item_id)}): ${t}`);
    }
  }
  if (r.signed_serial != null && z.stackable(r.item_id, null) && !r.journal_id)
    flag('a sealed fungible (scrap, food, trophies are never sealed)', who(r.pubkey), `${named(r.item_id)} #${r.signed_serial}`);
}
function TRAITS_FOR(t) {
  if (!t || !t.slot) return null;
  const p = [...(G.TRAIT_POOL[t.slot] ?? []), ...(G.BAD_TRAIT_POOL[t.slot] ?? [])];
  return p.length ? new Set(p) : null;
}

// ---- what each player carries and keeps, by the game's own counting
for (const [pk, p] of players) {
  const pack = (byOwner.get(pk + '\u0000') ?? []).map(item);
  const lock = (byOwner.get(pk + '\u0000lockbox') ?? []).map(item);
  const vault = (byOwner.get(pk + '\u0000vault') ?? []).map(item);
  const used = z.slotsUsed(pack, 'pack');
  if (used > G.PACK_CAP) flag('pack over its cap', p.name, `${used} slots of ${G.PACK_CAP} (a pocketed coat can raise it)`);
  const food = pack.filter(c => !c.equipped && T.get(c.itemId)?.edible).length;
  if (food > G.PACK_FOOD_CAP) flag('pack over its food cap', p.name, `${food} rations of ${G.PACK_FOOD_CAP}`);
  const torches = pack.filter(c => !c.equipped && c.itemId === 'torch').length;
  if (torches > G.PACK_TORCH_CAP) flag('pack over its torch cap', p.name, `${torches} of ${G.PACK_TORCH_CAP}`);
  const lu = z.slotsUsed(lock, 'lockbox'); if (lu > G.LOCKBOX_CAP) flag('lockbox over its cap', p.name, `${lu} of ${G.LOCKBOX_CAP}`);
  const vu = z.slotsUsed(vault, 'vault'); if (vu > G.VAULT_CAP) flag('vault over its cap', p.name, `${vu} of ${G.VAULT_CAP}`);
  const unsealed = vault.filter(c => z.isGear(c.itemId) && c.serial == null);
  if (unsealed.length) flag('unsealed gear in the vault (the vault takes sealed only)', p.name, unsealed.map(c => named(c.itemId)).join(', '));
  const slots = new Map();
  for (const c of pack) if (c.equipped) {
    const s = T.get(c.itemId)?.slot ?? '?';
    slots.set(s, [...(slots.get(s) ?? []), named(c.itemId)]);
  }
  for (const [s, names] of slots) if (names.length > 1) flag('two things equipped in one slot', p.name, `${s}: ${names.join(' + ')}`);
  if (!world.rooms.has(p.room_id)) flag('player standing in a room that does not exist', p.name, p.room_id);
  if (p.hp < 0 || p.hp > p.max_hp) flag('hp out of range', p.name, `${p.hp}/${p.max_hp}`);
  if (p.exhaustion) { try { JSON.parse(p.exhaustion); } catch { flag('unreadable exhaustion', p.name, p.exhaustion.slice(0, 40)); } }
}

// ---- seals: every live seal on one row, owned by whoever has the row
const mints = all('SELECT * FROM mints');
const bySerial = new Map(mints.map(m => [m.serial, m]));
const seen = new Map();
for (const r of rows) if (r.signed_serial != null) {
  seen.set(r.signed_serial, [...(seen.get(r.signed_serial) ?? []), r]);
  const m = bySerial.get(r.signed_serial);
  if (!m) flag('seal with no mint record', who(r.pubkey), `${named(r.item_id)} #${r.signed_serial}`);
  else {
    if (m.voided_at) flag('item carries a voided seal', who(r.pubkey), `${named(r.item_id)} #${r.signed_serial}`);
    if (m.item_id !== r.item_id) flag('seal minted for a different thing', who(r.pubkey), `#${r.signed_serial} minted as ${named(m.item_id)}, row is ${named(r.item_id)}`);
  }
}
for (const [s, rs] of seen) if (rs.length > 1)
  flag('ONE SEAL ON TWO ROWS (a dupe)', rs.map(r => who(r.pubkey)).join(' / '), `#${s} ${named(rs[0].item_id)} ×${rs.length}`);
const rowIds = new Set(rows.map(r => r.id));
const liveSerials = new Set(rows.filter(r => r.signed_serial != null).map(r => r.signed_serial));
const orphanMints = mints.filter(m => !m.voided_at && !m.superseded_by && !liveSerials.has(m.serial));
if (orphanMints.length) flag('live seals whose item is gone (never voided)', `${orphanMints.length} seals`,
  orphanMints.slice(0, 8).map(m => `#${m.serial} ${named(m.item_id)} (${who(m.pubkey)})`).join(', ') + (orphanMints.length > 8 ? ', …' : ''));
const journals = new Map();
for (const r of rows) if (r.journal_id) journals.set(r.journal_id, [...(journals.get(r.journal_id) ?? []), r]);
for (const [j, rs] of journals) if (rs.length > 1) flag('one journal on two rows', rs.map(r => who(r.pubkey)).join(' / '), j);
const lore = new Map();
for (const r of rows) if (r.lore_id) lore.set(r.lore_id, [...(lore.get(r.lore_id) ?? []), r]);
for (const [l, rs] of lore) if (rs.length > 1) flag('one engraving on two rows', rs.map(r => who(r.pubkey)).join(' / '), `${named(rs[0].item_id)} ${l}`);

// ---- dens
const dens = all('SELECT * FROM dens');
const denKeys = all('SELECT * FROM den_keys');
const holders = new Map();
for (const d of dens) {
  const name = who(d.holder);
  holders.set(d.holder, (holders.get(d.holder) ?? 0) + 1);
  if (!world.rooms.has(d.room_id)) flag('den on a room that does not exist', name, d.room_id);
  if (!players.has(d.holder)) flag('den with no holder', d.holder.slice(0, 10) + '…', d.room_id);
  for (const [k, b] of Object.entries(G.DEN_BUILDS)) {
    const has = k === 'bolthole' ? !!d.bolthole : !!d[k];
    const need = b.needs === 'barred' ? !!d.barred : b.needs === 'bolthole' ? !!d.bolthole : b.needs ? !!d[b.needs] : true;
    if (has && !need) flag('den build standing without what it needs', name, `${k} without ${b.needs}`);
  }
  if (d.bolthole && !(world.exits.get(d.room_id) ?? []).some(e => e.to_room === d.bolthole))
    flag('bolt-hole that comes up nowhere next door', name, `${d.room_id} -> ${d.bolthole}`);
  if (d.butt_water < 0 || d.butt_water > G.DEN_BUTT_CAP) flag('water butt out of range', name, `${d.butt_water} of ${G.DEN_BUTT_CAP}`);
  if (d.tended_at < d.claimed_at) flag('den tended before it was claimed', name, d.room_id);
  const shelf = (byOwner.get(d.holder + '\u0000den:' + d.room_id) ?? []).map(item);
  const den = { rack: !!d.rack, cellar: !!d.cellar };
  const su = z.slotsUsed(shelf.filter(c => !z.isGear(c.itemId)), 'lockbox');
  if (su > G.denCap(den)) flag('den shelf over its cap', name, `${su} of ${G.denCap(den)}`);
  const keys = denKeys.filter(k => k.room_id === d.room_id && k.holder === d.holder);
  if (keys.length > G.DEN_BUNKS) flag('more bunks than a den has', name, `${keys.length} of ${G.DEN_BUNKS}`);
  for (const k of keys) if (k.pubkey === d.holder) flag('holder holds a key to their own den', name, d.room_id);
}
for (const [h, n] of holders) if (n > 1) flag('more than one den', who(h), `${n} dens`);
for (const k of denKeys) if (!dens.some(d => d.room_id === k.room_id && d.holder === k.holder))
  flag('key to a den that is gone', who(k.pubkey), `${who(k.holder)}'s at ${k.room_id}`);
// A shelf with no den over it is NOT a finding (rome, 2026-10-23): the shelf
// outlives its door on purpose, and 'fetch' on that ground takes it back. Only
// a shelf on a room that no longer exists would be unreachable.
for (const r of rows) if (r.container.startsWith('den:') && !world.rooms.has(r.container.slice(4)))
  flag('on a den shelf in a room that does not exist', who(r.pubkey), `${named(r.item_id)} at ${r.container.slice(4)}`);

// ---- templates: bleed is damage a tick, always a whole number (2026-10-23:
// the old grey shipped with 0.3, written as if it were odds). Stun stays a
// chance and may be a fraction.
for (const t of all("SELECT id, bleed FROM mob_templates WHERE bleed != CAST(bleed AS INTEGER)"))
  flag('creature with a fractional bleed', t.id, String(t.bleed));
for (const t of all("SELECT id, bleed FROM item_templates WHERE bleed != CAST(bleed AS INTEGER)"))
  flag('item with a fractional bleed', t.id, String(t.bleed));

// ---- letters
const invites = new Map(all('SELECT * FROM invites').map(i => [i.code, i]));
for (const c of all('SELECT * FROM invite_claims')) {
  const i = invites.get(c.code);
  if (!i) flag('claimed a letter that does not exist', who(c.newcomer), c.code);
  else if (i.inviter !== c.inviter) flag('claim names the wrong inviter', who(c.newcomer), c.code);
  if (c.newcomer === c.inviter) flag('invited themselves', who(c.newcomer), c.code);
}
for (const r of rows) if (r.invite_code && !invites.has(r.invite_code)) flag('letter for a code that does not exist', who(r.pubkey), r.invite_code);

// ---- report
const kinds = new Map();
for (const f of findings) kinds.set(f.kind, [...(kinds.get(f.kind) ?? []), f]);
console.log(`swept ${players.size} players, ${rows.length} items, ${dens.length} dens, ${mints.length} seals\n`);
if (!findings.length) console.log('nothing impossible found');
for (const [k, fs] of [...kinds].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${k} — ${fs.length}`);
  for (const f of fs.slice(0, 12)) console.log(`    ${f.who}: ${f.what}`);
  if (fs.length > 12) console.log(`    … and ${fs.length - 12} more`);
}
process.exit(findings.length ? 1 : 0);
