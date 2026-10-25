import type { Env } from "./env";
import { json } from "./http";

// Runs before authentication work or public reads. Separate bucket prefixes
// keep public polling from consuming authentication capacity.
// Cloudflare supplies this address at the edge. Never trust X-Forwarded-For.
// Counter keys use an HMAC so they do not retain the literal client address.
export async function admitAuthentication(req: Request, env: Env, bucket: "auth" | "public" = "auth"): Promise<Response | null> {
  const unavailable = bucket === "auth" ? "auth_unavailable" : "public_unavailable";
  try {
    if (!env.AUTH_RATE_LIMITER || !env.JWT_SECRET) return json({ error: unavailable }, 503);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(env.JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const address = req.headers.get("CF-Connecting-IP") ?? "local-or-unknown";
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode("nomad-" + bucket + "-v1:" + address)));
    const counter = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
    if ((await env.AUTH_RATE_LIMITER.limit({ key: counter })).success) return null;
    const response = json({ error: "rate_limited" }, 429);
    response.headers.set("retry-after", "60");
    return response;
  } catch {
    return json({ error: unavailable }, 503);
  }
}
