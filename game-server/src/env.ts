export interface Env {
  DB: D1Database;
  ZONE: DurableObjectNamespace;
  JWT_SECRET: string;
  GAME_SK_HEX: string;
  // Comma-separated wss:// urls. Unset = the relay door stays shut (dev).
  RELAYS?: string;
  // Bearer for the keeper-only routes (publishing the dungeon's own profile).
  // Unset = those routes are shut.
  ADMIN_TOKEN?: string;
  // 64-char hex AES-256 key that seals custodial (Google) wanderer secrets at
  // rest. Unset = "Continue with Google" is shut.
  KEY_ENC_SECRET: string;
}
