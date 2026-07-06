export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayUTC(): string {
  return dayString(Date.now());
}

export function yesterdayUTC(): string {
  return dayString(Date.now() - 86_400_000);
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
