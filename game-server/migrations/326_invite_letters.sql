CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  inviter TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS invite_claims (
  newcomer TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  inviter TEXT NOT NULL,
  gifted INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invite_claims_inviter ON invite_claims (inviter, claimed_at);
ALTER TABLE player_items ADD COLUMN invite_code TEXT NOT NULL DEFAULT '';

-- Floor instances live in the DO snapshot; containers retain player_items rows.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES ('invite-letter', 'a folded letter', 'A much-handled letter, folded small enough to keep close. Someone has traced the creases with a thumb many times.',
  'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, '');
