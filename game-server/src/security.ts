// Limits apply to custom clients as well as the browser UI.
export const MAX_FRAME_BYTES = 8192;
export const MAX_COMMAND_CHARS = 512;
export const MAX_BATCH_ROWS = 20;
export const SECRET_INPUT = /(?:nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}|\b[0-9a-f]{64}\b|bunker:\/\/\S+)/i;

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
