// Terminal client for the direct door. Interactive by default; pass commands
// as args for a scripted run:
//   node scripts/play.mjs                          # play
//   node scripts/play.mjs "look" "go north" 5 "attack rat"   # script (numbers = sleep secs)
// Env: NOMAD_URL (default http://localhost:8787), NOMAD_SK (hex; default ephemeral)
import { createInterface } from "node:readline";
import { webcrypto } from "node:crypto";
import WebSocket from "ws";
globalThis.crypto ??= webcrypto; // node 18
const { generateSecretKey, getPublicKey, finalizeEvent } = await import("nostr-tools");

const BASE = process.env.NOMAD_URL ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");

const sk = process.env.NOMAD_SK
  ? Uint8Array.from(process.env.NOMAD_SK.match(/../g).map((b) => parseInt(b, 16)))
  : generateSecretKey();
console.log(`# pubkey ${getPublicKey(sk)}`);

const ch = await (await fetch(`${BASE}/auth/challenge`, { method: "POST" })).json();
const ev = finalizeEvent(
  { kind: 27235, created_at: Math.floor(Date.now() / 1000), tags: [], content: ch.challenge },
  sk,
);
const { token } = await (
  await fetch(`${BASE}/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: ev }),
  })
).json();
if (!token) throw new Error("login failed");

const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`);
ws.on("message", (data) => {
  const f = JSON.parse(data.toString());
  if (f.kind === 24912) console.log(f.text);
  else if (f.kind === 24913) console.log(`· ${f.text}`);
  else if (f.t === "status") console.log(`# ${f.name} — ${f.room} — ${f.hp}/${f.max_hp} hp`);
  else if (f.t === "ctx") console.log(`# chips: ${f.suggest.join(" | ")}`);
});
ws.on("close", () => {
  console.log("# disconnected");
  process.exit(0);
});
await new Promise((res) => ws.on("open", res));

const script = process.argv.slice(2);
if (script.length > 0) {
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  await sleep(0.5);
  for (const step of script) {
    if (/^\d+(\.\d+)?$/.test(step)) {
      await sleep(Number(step));
    } else {
      console.log(`▸ ${step}`);
      ws.send(JSON.stringify({ v: 0, t: "cmd", text: step }));
      await sleep(0.4);
    }
  }
  await sleep(1);
  ws.close();
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("line", (line) => {
    if (line.trim()) ws.send(JSON.stringify({ v: 0, t: "cmd", text: line.trim() }));
    rl.prompt();
  });
  rl.prompt();
}
