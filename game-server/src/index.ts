import type { Env } from "./env";
import { CORS, json } from "./http";
import { handleChallenge, handleVerify } from "./auth";
import { GOOGLE_CLIENT_ID } from "./google";
import { verifyJwt } from "./jwt";
import { PAGE } from "./public";
import { iconBytes } from "./icon";
import { touchIconBytes, ogImageBytes } from "./assets";
import { signProfileEvent, isGameKeyConfigured } from "./signing";
import { publishEvent, relayList } from "./relay";
import BUNKER_SRC from "../../nostr-auth/nip46-bunker.js";
import VAULT_SRC from "./vault-bundle.js";

// Public, referrer-restricted browser credential for the Drive file picker
// (cross-app vault import). Not a secret — pairs with GOOGLE_CLIENT_ID.
const GOOGLE_PICKER_KEY = "AIzaSyDPS4uIAQyDfCOfUY9xyTTy9HeQnp1ZMGY";

export { ZoneDO } from "./zone";

const ZONES = new Set(["door"]); // v1 ships one zone

// The dungeon's public identity, as every Nostr client will show it.
const PROFILE = {
  name: "NOMAD",
  about:
    "The door has been open a hundred years. Come down.\n\n" +
    "A living text dungeon on Nostr. Your key is your character. What you carry " +
    "is provisional until the gate seals it — and the dead stay dead.",
  picture: "https://nomadmud.com/icon.png",
  website: "https://nomadmud.com",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const { pathname } = url;
    const m = req.method;

    try {
      if (m === "GET" && (pathname === "/" || pathname === "/index.html")) {
        const page = PAGE.replace("__GOOGLE_CLIENT_ID__", GOOGLE_CLIENT_ID).replace(
          "__GOOGLE_PICKER_KEY__",
          GOOGLE_PICKER_KEY,
        );
        return new Response(page, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            // GIS token popups (the Drive-vault flow) need the opener link kept
            // alive; plain `same-origin` makes them fail as popup_closed.
            "cross-origin-opener-policy": "same-origin-allow-popups",
          },
        });
      }
      if (m === "GET" && pathname === "/nip46-bunker.js") {
        return new Response(BUNKER_SRC, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      }
      if (m === "GET" && pathname === "/vault.js") {
        return new Response(VAULT_SRC, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      }
      if (m === "POST" && pathname === "/auth/challenge") return await handleChallenge(env);
      if (m === "POST" && pathname === "/auth/verify") return await handleVerify(req, env);
      // Google is now self-custody only: the browser talks straight to Drive
      // (see /vault.js). The old custodial /auth/google endpoint is retired.

      // The dungeon serves its own faces: avatar, home-screen tile, and the
      // share card — all the same parting-gate seal. Cached hard.
      const IMMUTABLE = "public, max-age=31536000, immutable";
      if (m === "GET" && pathname === "/icon.png") {
        return new Response(iconBytes(), {
          headers: { "content-type": "image/png", "cache-control": IMMUTABLE },
        });
      }
      if (m === "GET" && (pathname === "/apple-touch-icon.png" || pathname === "/apple-touch-icon-precomposed.png")) {
        return new Response(touchIconBytes(), {
          headers: { "content-type": "image/png", "cache-control": IMMUTABLE },
        });
      }
      if (m === "GET" && pathname === "/og.jpg") {
        return new Response(ogImageBytes(), {
          headers: { "content-type": "image/jpeg", "cache-control": IMMUTABLE },
        });
      }

      // Keeper-only: sign the dungeon's kind-0 profile with the epoch key and
      // speak it to the relays. Guarded by ADMIN_TOKEN; shut if unset.
      if (m === "POST" && pathname === "/admin/publish-profile") {
        const token = env.ADMIN_TOKEN?.trim();
        if (!token || req.headers.get("x-admin-token") !== token) {
          return json({ error: "unauthorized" }, 401);
        }
        if (!isGameKeyConfigured(env)) return json({ error: "no_game_key" }, 409);
        if (relayList(env).length === 0) return json({ error: "no_relays" }, 409);
        const ev = signProfileEvent(env, PROFILE);
        await publishEvent(env, ev);
        return json({ published: true, id: ev.id, pubkey: ev.pubkey, relays: relayList(env) });
      }

      // The blinded mint counter (NIP.md): supply is public — serial,
      // time, rarity. Ownership is nobody's business.
      if (m === "GET" && pathname === "/mints") {
        const res = await env.DB.prepare(
          "SELECT serial, item_id, rarity, minted_at FROM mints WHERE voided_at IS NULL ORDER BY serial LIMIT 5000",
        ).all();
        const mints = res.results ?? [];
        return json({ count: mints.length, mints });
      }

      // The direct door: same protocol the relay door will speak, minus the relay.
      // Auth via ?token= because browser WebSocket can't set headers.
      if (m === "GET" && pathname === "/ws") {
        if (req.headers.get("Upgrade") !== "websocket") {
          return json({ error: "expected_websocket" }, 426);
        }
        const token = url.searchParams.get("token") ?? "";
        const payload = await verifyJwt(token, env.JWT_SECRET);
        const pubkey = typeof payload?.sub === "string" ? payload.sub : null;
        if (!pubkey) return json({ error: "unauthorized" }, 401);

        const zone = url.searchParams.get("zone") ?? "door";
        if (!ZONES.has(zone)) return json({ error: "no_such_zone" }, 404);

        const headers = new Headers(req.headers);
        headers.set("x-pubkey", pubkey);
        headers.set("x-zone", zone);
        const stub = env.ZONE.get(env.ZONE.idFromName(zone));
        return await stub.fetch(new Request(req.url, { headers }));
      }

      return json({ error: "not_found" }, 404);
    } catch (err: any) {
      return json({ error: "internal", message: err?.message ?? String(err) }, 500);
    }
  },

  // The dungeon forgets the forgettable: guests who never chose a name,
  // carry nothing, hold no living claim, and haven't been seen in 30 days
  // fade from the ledger. Named players are never pruned.
  async scheduled(_ctrl: ScheduledController, env: Env): Promise<void> {
    const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    await env.DB.prepare(
      `DELETE FROM players
       WHERE named = 0
         AND last_seen < ?
         AND pubkey NOT IN (SELECT pubkey FROM player_items)
         AND pubkey NOT IN (SELECT pubkey FROM mints WHERE voided_at IS NULL)`,
    ).bind(cutoff).run();
  },
} satisfies ExportedHandler<Env>;
