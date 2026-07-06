// Authoritative, server-side RNG. Uses CSPRNG — never trust the client for rolls.

export function rand(): number {
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return u[0] / 4_294_967_296; // [0, 1)
}

// Inclusive on both ends.
export function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

export function chance(p: number): boolean {
  return rand() < p;
}

export function uuid(): string {
  return crypto.randomUUID();
}

// One at random from a non-empty list. The world speaks in variety — every
// repeated line (a blow landed, a bite taken, a rest begun) draws from a pool
// so the same beat never reads the same way twice.
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
