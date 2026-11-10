// Limits apply to custom clients as well as the browser UI.
export const MAX_FRAME_BYTES = 8192;
export const MAX_COMMAND_CHARS = 512;
export const MAX_BATCH_ROWS = 20;
export const SECRET_INPUT = /(?:nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}|\b[0-9a-f]{64}\b|bunker:\/\/\S+)/i;

// What a typed line may not carry: control characters (the rarity markers the
// server itself writes into gear names are two of them, so a typed one could
// paint a spoken line as loot) and the marks that reverse the reading order.
// Tab and newline stay; the parser folds them to a space.
const UNTYPEABLE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
export function cleanCommand(text: string): string {
  return text.replace(UNTYPEABLE, "");
}
// The page's own id for its dials (zone.ts, the stale-handshake guard). It
// rides the socket's attachment, which has a small size limit, so a long one
// is treated as absent instead of being stored.
export function dialId(pid: string | null, att: string | null): { pid: string | null; att: number | null } {
  const n = att === null || att === "" ? NaN : Number(att);
  return {
    pid: pid && pid.length <= 64 ? pid : null,
    att: Number.isSafeInteger(n) && n >= 0 ? n : null,
  };
}

// D1 awaits do not hold a Durable Object's storage input gate. Serialize all
// state-changing entry points, including alarms and reconnects, across them.
// Callers reject excess client work BEFORE enqueueing; lifecycle work is kept.
export class EventQueue {
  private tail: Promise<unknown> = Promise.resolve();
  public pending = 0;
  run<T>(work: () => Promise<T>): Promise<T> {
    this.pending++;
    const result = this.tail.then(work);
    this.tail = result.catch(() => {});
    return result.finally(() => { this.pending--; });
  }
}
