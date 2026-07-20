// The relay door, outbound only (NIP.md, Transports): the dungeon publishes
// what happened — it never listens here. Publish only when events occur, so
// an idle dungeon stays silent and costs nothing.
import type { Event } from "nostr-tools";
import type { Env } from "./env";

export function relayList(env: Env): string[] {
  return (env.RELAYS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function publishEvent(env: Env, ev: Event): Promise<void> {
  await Promise.allSettled(relayList(env).map((r) => sendOne(r, ev)));
}

// Gamestr's indexing relay — leaderboard score events (kind 30762) go here so
// the directory picks them up, ALONGSIDE the dungeon's own relays.
export const GAMESTR_RELAY = "wss://main.relay.gamestr.io";

export async function publishScore(env: Env, ev: Event): Promise<void> {
  const relays = [...new Set([...relayList(env), GAMESTR_RELAY])];
  await Promise.allSettled(relays.map((r) => sendOne(r, ev)));
}

// Workers outbound WebSocket: fetch with an Upgrade header; wss:// -> https://.
async function sendOne(relay: string, ev: Event): Promise<void> {
  const resp = await fetch(relay.replace(/^ws/, "http"), {
    headers: { Upgrade: "websocket" },
  });
  const ws = (resp as unknown as { webSocket: WebSocket | null }).webSocket;
  if (!ws) return;
  ws.accept();
  await new Promise<void>((resolve) => {
    const bail = setTimeout(() => { try { ws.close(); } catch {} resolve(); }, 4000);
    ws.addEventListener("message", (m) => {
      try {
        const frame = JSON.parse(typeof m.data === "string" ? m.data : "");
        if (frame[0] === "OK" && frame[1] === ev.id) {
          clearTimeout(bail);
          try { ws.close(); } catch {}
          resolve();
        }
      } catch {}
    });
    ws.send(JSON.stringify(["EVENT", ev]));
  });
}
