// A name and a password bring a wanderer back (keysave.ts, 2026-11-18).
// Synthetic keys and an in-memory database only; no network, no real accounts.
//   node scripts/test-keysave.mjs
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const src = join(root, 'game-server/src');
const { build } = await import(pathToFileURL(join(root, 'game-server/node_modules/esbuild/lib/main.js')));
globalThis.crypto ??= webcrypto;
const dir = await mkdtemp(join(tmpdir(), 'nomad-keysave-'));
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('  ok   ' + name); };

try {
  const out = join(dir, 'api.mjs');
  await build({
    stdin: { contents: "export * from './keysave'; export { signJwt } from './jwt'; export { default as worker } from './index'; export { PAGE } from './public'; export { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';", resolveDir: src, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async (a) => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' })); } }],
  });
  const api = await import(pathToFileURL(out));

  // ---- a real SQLite behind a D1-shaped shim ----
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE players (pubkey TEXT PRIMARY KEY, name TEXT NOT NULL, named INTEGER NOT NULL DEFAULT 0, last_seen INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE player_items (id TEXT PRIMARY KEY, pubkey TEXT);
            CREATE TABLE auth_spent (jti TEXT PRIMARY KEY, exp INTEGER NOT NULL);
            CREATE TABLE mints (pubkey TEXT, voided_at INTEGER);`);
  sql.exec(readFileSync(join(root, 'game-server/migrations/403_a_name_and_a_password.sql'), 'utf8'));
  sql.exec(readFileSync(join(root, 'game-server/migrations/404_key_save_origin.sql'), 'utf8'));
  const DB = { prepare(q) { const run = (args) => ({
    async first() { return sql.prepare(q).get(...args) ?? null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
    async run() { return { meta: { changes: Number(sql.prepare(q).run(...args).changes) } }; },
  }); const self = run([]); self.bind = (...args) => run(args); return self; } };
  const env = { DB, JWT_SECRET: 'keysave-test-' + crypto.randomUUID(), AUTH_RATE_LIMITER: { limit: async () => ({ success: true }) } };

  const post = (path, body, token) => new Request('https://audit.invalid' + path, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body ?? {}),
  });
  const call = (path, body, token) => api.worker.fetch(post(path, body, token), env);
  const session = (pk) => api.signJwt({ sub: pk }, env.JWT_SECRET, 3600);

  // ---- the client's lock, the same steps public.ts takes ----
  const AAD = new TextEncoder().encode('nomad-keysave-v1');
  const hex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
  const b64 = (u) => Buffer.from(u).toString('base64');
  const derive = async (pw, salt, iter) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, 512));
    return { aes: await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']), check: hex(bits.slice(32)) };
  };
  const lock = async (sk, pw) => {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const d = await derive(pw, salt, api.KEYSAVE_ITER);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, d.aes, sk));
    return { salt: b64(salt), iter: api.KEYSAVE_ITER, iv: b64(iv), ct: b64(ct), check: d.check };
  };
  const signed = async (path, payload, secret, age = 0) => {
    const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))));
    const proof = api.finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now()/1000) - age, content: '',
      tags: [['u', 'https://audit.invalid' + path], ['method', 'POST'], ['payload', hash], ['nonce', crypto.randomUUID()]] }, secret);
    return { ...payload, proof };
  };
  const recover = async (name, pw) => {
    const s = await (await call('/keysave/salt', { name })).json();
    const d = await derive(pw, Buffer.from(s.salt, 'base64'), s.iter);
    const r = await call('/keysave/open', { name, check: d.check });
    if (!r.ok) return { status: r.status, error: (await r.json()).error };
    const o = await r.json();
    const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(o.iv, 'base64'), additionalData: AAD }, d.aes, Buffer.from(o.ct, 'base64')));
    return { status: 200, sk: raw, pubkey: o.pubkey };
  };

  const sk = api.generateSecretKey(), pk = api.getPublicKey(sk);
  const pw = 'river stone lantern';
  sql.prepare('INSERT INTO players (pubkey, name, named, last_seen) VALUES (?, ?, 0, ?)').run(pk, 'Ironwren', Math.floor(Date.now() / 1000));

  await check('saving needs the key: no session, a challenge token, or a stranger with no wanderer are all refused', async () => {
    const body = await lock(sk, pw);
    assert.equal((await call('/keysave', body)).status, 401);
    const chal = await api.signJwt({ purpose: 'challenge', jti: crypto.randomUUID() }, env.JWT_SECRET, 300);
    assert.equal((await call('/keysave', body, chal)).status, 401, 'a challenge is not a session');
    const ticket = await api.signJwt({ sub: pk, purpose: 'ws', jti: crypto.randomUUID() }, env.JWT_SECRET, 90);
    assert.equal((await call('/keysave', body, ticket)).status, 401, 'a websocket ticket is not a session');
    const otherKey = api.generateSecretKey(), other = api.getPublicKey(otherKey);
    assert.equal((await call('/keysave', await signed('/keysave', body, otherKey), await session(other))).status, 404, 'no wanderer, nothing to file it under');
    assert.equal((await call('/keysave', { ...body, iter: 1000 }, await session(pk))).status, 400, 'the rounds are ours, not the caller\'s');
    assert.equal((await call('/keysave', { ...body, check: 'nothex' }, await session(pk))).status, 400);
  });

  await check('a saved wanderer comes back with its name and password, and the server never holds the key or the password', async () => {
    const r = await call('/keysave', await signed('/keysave', await lock(sk, pw), sk), await session(pk));
    assert.equal(r.status, 200);
    assert.equal((await r.json()).name, 'Ironwren');
    const row = sql.prepare('SELECT * FROM key_saves WHERE pubkey = ?').get(pk);
    const stored = JSON.stringify(row);
    assert.ok(!stored.includes(hex(sk)) && !stored.includes(Buffer.from(sk).toString('base64')), 'no key in the row');
    assert.ok(!stored.includes(pw), 'no password in the row');
    const back = await recover('ironwren', pw); // any case
    assert.equal(back.status, 200);
    assert.equal(hex(back.sk), hex(sk));
    assert.equal(back.pubkey, pk);
    const st = await (await call('/keysave/status', {}, await session(pk))).json();
    assert.deepEqual(st, { saved: true, name: 'Ironwren' });
  });

  await check('a wrong password opens nothing, and a name with no save looks the same as one with', async () => {
    assert.deepEqual(await recover('Ironwren', 'river stone lanterns'), { status: 401, error: 'no' });
    assert.deepEqual(await recover('Nobody', pw), { status: 401, error: 'no' });
    const real = await (await call('/keysave/salt', { name: 'Ironwren' })).json();
    const fake1 = await (await call('/keysave/salt', { name: 'Nobody' })).json();
    const fake2 = await (await call('/keysave/salt', { name: 'nobody' })).json();
    assert.equal(fake1.salt, fake2.salt, 'a made-up salt is always the same for a name');
    assert.equal(fake1.salt.length, real.salt.length);
    assert.equal(fake1.iter, real.iter);
    sql.prepare('UPDATE key_saves SET tries = 0, tries_at = 0').run();
  });

  await check('five wrong passwords an hour per wanderer, then even the right one waits; the hour passing clears it', async () => {
    for (let i = 0; i < api.KEYSAVE_TRIES; i++) assert.equal((await recover('Ironwren', 'wrong password ' + i)).status, 401);
    assert.deepEqual(await recover('Ironwren', pw), { status: 429, error: 'too_many' });
    sql.prepare('UPDATE key_saves SET tries_at = tries_at - ? WHERE pubkey = ?').run(api.KEYSAVE_TRIES_WINDOW, pk);
    assert.equal((await recover('Ironwren', pw)).status, 200, 'an hour later it opens');
    assert.equal(sql.prepare('SELECT tries FROM key_saves WHERE pubkey = ?').get(pk).tries, 0, 'and the count starts over');
  });

  await check('a rename carries the save; the old name opens nothing, even for someone who takes it', async () => {
    sql.prepare('UPDATE players SET name = ?, named = 1 WHERE pubkey = ?').run('Ashwren', pk);
    assert.equal((await recover('Ironwren', pw)).status, 401);
    assert.equal(hex((await recover('Ashwren', pw)).sk), hex(sk));
    const sk2 = api.generateSecretKey(), pk2 = api.getPublicKey(sk2);
    sql.prepare('INSERT INTO players (pubkey, name, named, last_seen) VALUES (?, ?, 1, ?)').run(pk2, 'Ironwren', Math.floor(Date.now() / 1000));
    assert.equal((await recover('Ironwren', pw)).status, 401, 'the new Ironwren has no save, and never gets the old one');
  });

  await check('each mutation requires fresh one-time proof for this key, operation and backup', async () => {
    const payload = await lock(sk, 'new test password');
    const token = await session(pk);
    const proof = await signed('/keysave', payload, sk);
    for (const invalid of [payload, await signed('/keysave', payload, sk, 120),
      await signed('/keysave', payload, api.generateSecretKey()), await signed('/keysave/remove', payload, sk),
      { ...proof, proof: { ...proof.proof, sig: '0'.repeat(128) } },
      { ...proof, iv: b64(crypto.getRandomValues(new Uint8Array(12))) }]) {
      assert.equal((await call('/keysave', invalid, token)).status, 401);
    }
    assert.equal((await call('/keysave/remove', {}, token)).status, 401);
    assert.equal((await call('/keysave/remove', proof, token)).status, 401);
    assert.equal((await recover('Ashwren', pw)).status, 200);
    assert.equal((await call('/keysave', proof, token)).status, 200);
    assert.equal((await call('/keysave', proof, token)).status, 401);
  });

  await check('changing the password replaces the save; removing it ends it', async () => {
    assert.equal((await call('/keysave', await signed('/keysave', await lock(sk, 'a brand new password'), sk), await session(pk))).status, 200);
    assert.equal((await recover('Ashwren', pw)).status, 401, 'the old password is done');
    assert.equal(hex((await recover('Ashwren', 'a brand new password')).sk), hex(sk));
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM key_saves').get().n, 1);
    assert.equal((await call('/keysave/remove', {}, null)).status, 401);
    const removal = await signed('/keysave/remove', {}, sk);
    assert.equal((await call('/keysave/remove', removal, await session(pk))).status, 200);
    assert.equal((await recover('Ashwren', 'a brand new password')).status, 401);
    assert.deepEqual(await (await call('/keysave/status', {}, await session(pk))).json(), { saved: false, name: 'Ashwren' });
    const replacement = await signed('/keysave', await lock(sk, pw), sk);
    assert.equal((await call('/keysave', replacement, await session(pk))).status, 200);
    assert.equal((await call('/keysave/remove', removal, await session(pk))).status, 401);
    assert.equal((await recover('Ashwren', pw)).status, 200);
  });

  await check('the cleanup keeps a saved guest and takes a save whose wanderer is gone', async () => {
    const old = Math.floor(Date.now() / 1000) - 40 * 86400;
    const keep = api.getPublicKey(api.generateSecretKey()), lose = api.getPublicKey(api.generateSecretKey()), orphan = api.getPublicKey(api.generateSecretKey());
    sql.prepare('INSERT INTO players (pubkey, name, named, last_seen) VALUES (?, ?, 0, ?)').run(keep, 'Keepme', old);
    sql.prepare('INSERT INTO players (pubkey, name, named, last_seen) VALUES (?, ?, 0, ?)').run(lose, 'Loseme', old);
    for (const p of [keep, orphan]) sql.prepare("INSERT INTO key_saves (pubkey, salt, iter, iv, ct, check_hash, saved_at) VALUES (?, 'a', 1, 'b', 'c', 'd', 0)").run(p);
    await api.worker.scheduled({}, env);
    const left = new Set(sql.prepare('SELECT pubkey FROM players').all().map((r) => r.pubkey));
    assert.ok(left.has(keep), 'a saved guest is never pruned');
    assert.ok(!left.has(lose), 'an unsaved, unnamed, empty-handed guest still is');
    const saves = new Set(sql.prepare('SELECT pubkey FROM key_saves').all().map((r) => r.pubkey));
    assert.ok(saves.has(keep) && !saves.has(orphan), 'a save with no wanderer goes');
  });

  await check('the routes ride the login rate limit', async () => {
    let asked = 0;
    const limited = { ...env, AUTH_RATE_LIMITER: { limit: async () => { asked++; return { success: false }; } } };
    for (const path of Object.keys(api.KEYSAVE_ROUTES)) {
      const r = await api.worker.fetch(post(path, { name: 'Ashwren' }), limited);
      assert.equal(r.status, 429, path);
    }
    assert.equal(asked, Object.keys(api.KEYSAVE_ROUTES).length);
  });

  await check('the door asks whether a new name is free, and its answer says nothing about saves', async () => {
    const ask = async (name) => (await call('/keysave/name', { name })).json();
    assert.deepEqual(await ask('ashwren'), { ok: true, free: false }, 'a name in use, in any case');
    assert.deepEqual(await ask('Nobodyyet'), { ok: true, free: true });
    assert.deepEqual(await ask('no spaces'), { ok: false, free: false }, 'not a name at all');
    sql.prepare('INSERT INTO players (pubkey, name, named, last_seen) VALUES (?, ?, 1, ?)').run(api.getPublicKey(api.generateSecretKey()), 'Plainwren', Math.floor(Date.now() / 1000));
    assert.deepEqual(await ask('Plainwren'), await ask('Ashwren'), 'a saved name and an unsaved one answer alike');
  });

  // ---- the client: only the game's own keys, never a pasted or borrowed one ----
  const page = api.PAGE;
  await check('the door asks a browser with no key who it is; the password is locked at once and never kept', async () => {
    assert.match(page, /var doorMenu = !stored;/, 'only a browser that came with no key');
    const door = page.slice(page.indexOf('async function doorName(name)'), page.indexOf('// IN THE WORLD AT LAST'));
    assert.ok(door.length > 500);
    assert.match(door, /pw = await doorPwAsk\("Password:"\);/, 'the password is asked on the command line');
    assert.match(door, /var own = !\(name === "" \|\| name\.toLowerCase\(\) === "name me"\);/, 'Enter or \'name me\' lets the dungeon name you, as it always did');
    assert.match(page, /var named = !w\.name \|\| lastName/, 'and then nothing renames it');
    assert.doesNotMatch(door, /askSecret|vmOpen/, 'not in a box');
    assert.match(page, /if \(doorPwMasked && \/\^\(show\|hide\)\$\/i\.test\(pwTyped\.trim\(\)\)\) \{ doorPwToggle\(\); return; \}/, '\'show\' and \'hide\' are never taken for the password');
    assert.match(page, /cmd\.type = shown \? "text" : "password";/, 'show lets you see what you typed');
    assert.match(page, /if \(done\) done\(!s \|\| \(masked && s\.toLowerCase\(\) === "skip"\) \? null : masked \? v : s\);/, '\'skip\' or an empty line goes without');
    assert.match(page, /function submitCommand\(\) \{\n[^\n]*\n[^\n]*\n\s+if \(typeof doorPwWait !== "undefined" && doorPwWait\) \{\n\s+var pwTyped = cmd\.value;\n\s+cmd\.value = "";\n[^\n]*\n\s+doorPwInput\(pwTyped\);\n\s+return;\n\s+\}\n\s+var text = cmd\.value\.trim\(\);/, 'a typed password is taken before the log, the history or the wire');
    assert.match(door, /doorWant\.lock = \{ salt: ksB64\(salt\), iter: KEYSAVE_ITER, iv: ksB64\(iv\), ct: ksB64\(ct\), check: d\.check \}/, 'only the locked copy is held');
    assert.doesNotMatch(door, /doorWant\.(pw|password)\b|localStorage\.setItem\([^)]*pw/, 'the password itself is never kept');
    assert.match(page, /if \(typeof doorMenu !== "undefined" && doorMenu\) \{ if \(identityEpoch === doorMenuEpoch\) return; doorMenuEnd\(\); \}/, 'nothing dials at the menu unless the keys changed');
  });
  await check('only keys the game made are offered the save; pasted keys, extensions and signers never are', async () => {
    assert.match(page, /function keySaveAllowed\(\) \{\n\s*try \{ return method === "guest" && !!sk && keyListed\("nomad_minted_v2", getPublicKey\(sk\)\);/);
    assert.doesNotMatch(page, /noteMinted\(getPublicKey\(fromHex|keyListed\("nomad_minted",/);
    assert.match(page, /if \(o\.minted === true\) noteMinted\(o\.pubkey\)/);
    const importKey = page.slice(page.indexOf('function importKey(arg)'), page.indexOf('// The other direction: WE mint'));
    assert.ok(importKey.length > 100 && !/noteMinted|nomad_minted/.test(importKey), 'a pasted key is never listed as minted');
    const mints = page.match(/sk = generateSecretKey\(\);[^\n]*\n?[^\n]*\n?[^\n]*/g);
    assert.ok(mints.length >= 3 && mints.every((m) => /noteMinted\(getPublicKey\(sk\)\)/.test(m)), 'every key the game makes is listed');
    const extBranch = page.slice(page.indexOf('if (method === "ext" || method === "bunker") {\n    idname'), page.indexOf('  } else {\n    var myPk = getPublicKey(sk);'));
    assert.match(extBranch, /sectname\.style\.display = "none"/, 'an extension or signer never sees the section');
    assert.match(page, /async function keySave\(typed\) \{\n\s*if \(!keySaveAllowed\(\)\)/, 'the typed command checks too');
  });

  await check('the password is at least 10, and login <name> is the name rule so it never swallows a key', async () => {
    assert.match(page, /var KEYSAVE_MIN = 10;/);
    const rule = readFileSync(join(src, 'verbs.ts'), 'utf8').match(/if \(!(\/\^\[a-z0-9\]\[a-z0-9_-\]\{1,15\}\$\/i)\.test\(name\)\)/);
    assert.ok(rule, 'the name rule moved; keep KEYSAVE_NAME with it');
    assert.ok(page.includes('var KEYSAVE_NAME = ' + rule[1].replace(/\\/g, '\\') + ';'));
    const name = new RegExp(rule[1].slice(1, -2), 'i');
    for (const key of [api.getPublicKey(api.generateSecretKey()), 'nsec1' + 'q'.repeat(58), 'bunker://abc']) assert.ok(!name.test(key), key);
    assert.match(page, /if \(KEYSAVE_NAME\.test\(loginArg\)\) keyRecover\(loginArg, false\);\n\s*else importKey\(loginArg\);/);
  });

  await check('the client and the server agree on the rounds, and a hostile round count is clamped', async () => {
    assert.ok(page.includes('var KEYSAVE_ITER = ' + api.KEYSAVE_ITER + ';'));
    assert.match(page, /var iter = Math\.min\(2000000, Math\.max\(100000, Math\.floor\(Number\(sj\.iter\) \|\| 0\)\)\);/);
    assert.match(page, /if \(raw\.length !== 32 \|\| getPublicKey\(raw\) !== o\.pubkey\) throw/, 'a key that is not the wanderer it claims is refused');
  });

  await check('the first thing put away tells the client, from the pack modal and the typed verb alike', async () => {
    const gate = readFileSync(join(src, 'gate.ts'), 'utf8');
    assert.equal((gate.match(/noteKept\(session\);/g) || []).length, 2);
    let sent = [];
    const s = { ws: { send: (m) => sent.push(JSON.parse(m)) } };
    api.noteKept(s); api.noteKept(s);
    assert.deepEqual(sent, [{ v: 0, t: 'kept' }], 'once a session');
    assert.match(page, /\} else if \(f\.t === "kept"\) \{\n\s*keySaveNudge\("kept"\);/);
  });

  console.log(`\n${passed} keysave checks pass`);
} finally { await rm(dir, { recursive: true, force: true }); }
