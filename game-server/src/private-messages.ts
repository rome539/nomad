import { verifyEvent } from "nostr-tools";
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";

// Resolve a name first; the text never enters this protocol unencrypted.
// Each resolution authorizes one signed ciphertext for one nearby recipient.
export class PrivateMessages {
  private pending = new Map<string, { to: string; until: number }>();
  handle(z: ZoneDO, session: Session, frame: any): void {
    const now = Date.now();
    for (const [id, p] of this.pending) if (p.until <= now) this.pending.delete(id);
    const id = frame.id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return;
    const key = session.pubkey + ":" + id;
    const reply = (data: object) => session.ws.send(JSON.stringify({ v: 0, id, ...data }));
    const fail = () => reply({ t: "tell-error", error: "Your quiet word could not reach them. Both players need an updated client and a place by the fire." });
    if (!session.sealedTell || !z.outOfWorld(session)) return fail();
    if (frame.t === "tell-key") {
      if (typeof frame.who !== "string" || frame.who.length > 64 || this.pending.size >= 1024) return fail();
      const who = frame.who.toLowerCase();
      const others = [...z.sessions.values()].filter(s => s.pubkey !== session.pubkey && z.outOfWorld(s));
      const target = others.find(s => s.name.toLowerCase() === who)
        ?? others.find(s => s.name.toLowerCase().startsWith(who));
      if (!who || !target?.sealedTell) return fail();
      this.pending.set(key, { to: target.pubkey, until: now + 60_000 });
      return reply({ t: "tell-key", to: target.pubkey, name: target.name });
    }
    const pending = this.pending.get(key);
    this.pending.delete(key);
    if (!pending) return fail();
    const target = z.sessions.get(pending.to);
    const event = frame.event;
    if (!target?.sealedTell || !z.outOfWorld(target) || !event || event.kind !== 24915 || event.pubkey !== session.pubkey
        || typeof event.content !== "string" || event.content.length > 4096
        || !Number.isSafeInteger(event.created_at) || Math.abs(now / 1000 - event.created_at) > 60
        || !Array.isArray(event.tags) || event.tags.length > 8
        || event.tags.filter((t: unknown) => Array.isArray(t) && t[0] === "p").length !== 1
        || !event.tags.some((t: unknown) => Array.isArray(t) && t[0] === "p" && t[1] === pending.to)) return fail();
    try { if (!verifyEvent(event)) return fail(); } catch { return fail(); }
    target.ws.send(JSON.stringify({ v: 0, t: "sealed-tell", name: session.name, event }));
    reply({ t: "tell-sent", name: target.name });
  }
}
