-- 339: STUDY BY BEHAVIOUR (rome, 2026-10-24). A study now writes down what the
-- creature was DOING when it was watched (about its business, asleep, feeding,
-- hungry, dead), and a full account wants every behaviour the animal has (see
-- src/study.ts). `seen` is that list, comma-packed.
--
-- Nobody loses a page: an account already full under the old rule (studied,
-- and its kills: 9 minus the level, held between 1 and 6) is marked as having
-- seen everything, so it stays full. Any other page studied under the old rule
-- keeps its study as "about its business".
ALTER TABLE journal_logs ADD COLUMN seen TEXT NOT NULL DEFAULT '';
-- And WHERE the book has met it (study or kill): region names, comma-packed.
ALTER TABLE journal_logs ADD COLUMN met TEXT NOT NULL DEFAULT '';
UPDATE journal_logs SET seen = 'about,asleep,feeding,hungry,dead'
  WHERE studied = 1 AND kills >= 9 - MAX(1, MIN(6, COALESCE((SELECT m.level FROM mob_templates m WHERE m.id = journal_logs.template_id), 1)));
UPDATE journal_logs SET seen = 'about' WHERE studied = 1 AND seen = '';

-- A FULL ACCOUNT COUNTS ON THE LEGEND BOARD (rome, 2026-10-24): 10 points a
-- kind (LB_ACCOUNT_PTS), once per wanderer, to whoever finished the page.
-- Kept like a kill: losing the book does not take it back.
CREATE TABLE IF NOT EXISTS player_accounts (
  pubkey      TEXT NOT NULL,
  template_id TEXT NOT NULL,
  at          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pubkey, template_id)
);
ALTER TABLE players ADD COLUMN accounts INTEGER NOT NULL DEFAULT 0;
-- The pages already full today count, once, for whoever holds that book now.
INSERT OR IGNORE INTO player_accounts (pubkey, template_id, at)
  SELECT DISTINCT i.pubkey, j.template_id, CAST(strftime('%s', 'now') AS INTEGER)
  FROM journal_logs j JOIN player_items i ON i.journal_id = j.journal_id AND i.journal_id != ''
  WHERE j.seen = 'about,asleep,feeding,hungry,dead'
    AND j.kills >= 9 - MAX(1, MIN(6, COALESCE((SELECT m.level FROM mob_templates m WHERE m.id = j.template_id), 1)));
UPDATE players SET accounts = (SELECT COUNT(*) FROM player_accounts a WHERE a.pubkey = players.pubkey);
