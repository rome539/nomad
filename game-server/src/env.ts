export interface Env {
  DB: D1Database;
  ZONE: DurableObjectNamespace;
  JWT_SECRET: string;
  AUTH_RATE_LIMITER: RateLimit;
  GAME_SK_HEX: string;
  // Comma-separated wss:// urls. Unset = the relay door stays shut (dev).
  RELAYS?: string;
  // Bearer for the keeper-only routes (publishing the dungeon's own profile).
  // Unset = those routes are shut.
  ADMIN_TOKEN?: string;
  // Legacy custodial records only. Current Drive login does not use this key.
  // Retain it until the historical custody migration is resolved.
  KEY_ENC_SECRET: string;
}
