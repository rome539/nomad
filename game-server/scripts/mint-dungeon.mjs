// The key ceremony. Run OFFLINE, writes NOTHING to disk — everything prints
// to the terminal, and what you do with it is the ceremony:
//
//   1. ROOT nsec  -> cold storage (paper, twice). Never a server.
//   2. EPOCH hex  -> `wrangler secret put GAME_SK_HEX`. This key signs
//                    day-to-day; leak it and the root mints a successor.
//   3. Attestation event -> publish (it is how verifiers learn which epoch
//                    key currently speaks for the root).
//
// First mint (generates a fresh root, attests epoch 1):
//
//   node scripts/mint-dungeon.mjs
//
// ROTATION (epoch key leaked or retired) — same root, next epoch:
//
//   ROOT_NSEC=nsec1... node scripts/mint-dungeon.mjs 2 '<old attestation content JSON>'
//
//   arg 1: the new epoch number
//   arg 2: the *content* string of the current attestation (from the relays
//          or your notes) — its epoch entries become the history, with the
//          outgoing epoch closed `until` now. Certs signed inside a closed
//          window keep verifying forever; see NIP.md "The dungeon's keys".
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;
const { generateSecretKey, getPublicKey, finalizeEvent, nip19 } = await import("nostr-tools");

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const now = Math.floor(Date.now() / 1000);

const epochNum = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
if (!Number.isInteger(epochNum) || epochNum < 1) {
  console.error("epoch must be a positive integer");
  process.exit(1);
}

// Root: pasted for a rotation, freshly generated for a first mint.
let rootSk;
if (process.env.ROOT_NSEC) {
  const raw = process.env.ROOT_NSEC.trim();
  if (raw.startsWith("nsec1")) {
    const dec = nip19.decode(raw);
    if (dec.type !== "nsec") { console.error("ROOT_NSEC did not decode as an nsec"); process.exit(1); }
    rootSk = dec.data;
  } else if (/^[0-9a-f]{64}$/i.test(raw)) {
    rootSk = Uint8Array.from(raw.match(/../g).map((h) => parseInt(h, 16)));
  } else {
    console.error("ROOT_NSEC must be nsec1... or 64 hex chars");
    process.exit(1);
  }
} else {
  if (epochNum > 1) {
    console.error("Rotation (epoch > 1) requires ROOT_NSEC — the same root must sign, or history breaks.");
    process.exit(1);
  }
  rootSk = generateSecretKey();
}
const rootPk = getPublicKey(rootSk);

// History: on rotation, carry every prior epoch forward and close the
// outgoing one. The attestation is the whole trust set (NIP.md) — the old
// event is replaced on relays, so nothing else remembers the windows.
let history = [];
if (epochNum > 1) {
  if (!process.argv[3]) {
    console.error("Rotation requires the current attestation's content JSON as the 2nd argument.");
    process.exit(1);
  }
  const prev = JSON.parse(process.argv[3]);
  history = [
    ...(prev.history ?? []),
    { epoch: prev.epoch, pubkey: prev.pubkey, since: prev.since, until: now },
  ];
}

const epochSk = generateSecretKey();
const epochPk = getPublicKey(epochSk);

const content = { epoch: epochNum, pubkey: epochPk, since: now };
if (history.length > 0) content.history = history;

const attestation = finalizeEvent(
  {
    kind: 31574,
    created_at: now,
    tags: [
      ["d", "epoch"],
      ["p", epochPk],
    ],
    content: JSON.stringify(content),
  },
  rootSk,
);

console.log("=== THE DUNGEON'S KEYS — this prints once, save it now ===\n");
console.log("ROOT (the identity; cold storage, never a server):");
console.log("  npub :", nip19.npubEncode(rootPk));
if (!process.env.ROOT_NSEC) {
  console.log("  nsec :", nip19.nsecEncode(rootSk));
} else {
  console.log("  nsec : (yours already — unchanged)");
}
console.log("");
console.log(`EPOCH ${epochNum} (the hand; goes to Cloudflare):`);
console.log("  npub :", nip19.npubEncode(epochPk));
console.log("  hex  :", hex(epochSk), " <- wrangler secret put GAME_SK_HEX");
console.log("");
console.log("ATTESTATION (kind 31574, root-signed; publish it):");
console.log(JSON.stringify(attestation, null, 2));
if (epochNum > 1) {
  console.log("\nRotation checklist (the full drill: game-server/RUNBOOK.md):");
  console.log("  1. wrangler secret put GAME_SK_HEX   (the new epoch hex)");
  console.log("  2. publish the attestation above to the relay set");
  console.log("  3. re-publish the kind-0 profile (new epoch npub = new author)");
  console.log("  4. void any mint serials from the breach window");
} else {
  console.log("\nIf the epoch key ever leaks: run this again with ROOT_NSEC set,");
  console.log("attest the next epoch, rotate the secret. History stays valid.");
}
