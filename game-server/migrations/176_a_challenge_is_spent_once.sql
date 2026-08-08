-- A CHALLENGE IS SPENT ONCE.
--
-- Login was: ask for a challenge, sign it, POST the signed event. The challenge
-- was a stateless JWT with a 5-minute life and nothing recorded, so the same
-- signed event replayed inside that window minted another session token every
-- time. Anywhere that event could be captured — a proxy, a log, a shared
-- machine's history — was a five-minute window to mint sessions for that npub.
--
-- The fix needs exactly one thing the stateless design refused to have: memory
-- of what has already been spent. Each challenge now carries a random jti, and
-- redeeming it INSERTs that jti here. The primary key does the work: a second
-- INSERT of the same jti fails, and a failed insert is a replay.
--
-- Rows are tiny and short-lived (exp is the challenge's own 5-minute expiry).
-- /auth/verify sweeps expired ones as it goes, so the table stays at roughly
-- "logins in the last five minutes" and never needs a cron.
CREATE TABLE IF NOT EXISTS auth_spent (
  jti TEXT PRIMARY KEY,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_spent_exp ON auth_spent (exp);
