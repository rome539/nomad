-- 269 the pack should not read the vault (rome, 2026-08-23): the index the
-- inventory reads actually needed.
--
-- WHAT WAS MEASURED. A day of production D1: 4,392,264 rows read, and
-- 4,217,236 of them — 96% — came from two queries against player_items, one
-- for the pack and one for a container. Between them they burned 8,049ms of
-- the 8,162ms of total database time in that day. Ninety-nine percent. Every
-- one of those reads is an await on the zone's single thread, so it is never
-- one player's wait; it is everyone in the zone queued behind it.
--
-- WHY. The only index was on pubkey alone. So "give me what this wanderer is
-- CARRYING" — pubkey = ? AND container = '' — seeks to the wanderer and then
-- reads every row they own anywhere, vault and lockbox and den shelf and all,
-- and throws away the ones in the wrong container afterward. On the deepest
-- account in the world that is 1,182 rows read to find the 28 in their hands,
-- and it happens on nearly every command that touches the pack.
--
-- The vault is not at fault and is not overfull: VAULT_CAP counts SEALED
-- things, and fungibles ride free there on purpose. What it holds is 159
-- bloodwort, 113 linen strips, 99 knucklebones, 88 torches and a long tail
-- after them — one row per item, none sealed, exactly as designed. The cost
-- is not that the hoard exists. It is that the pack was reading it.
--
-- And it compounds: the vault only grows, so every hour played made every
-- inventory read slower for everybody. The same shape as the wall_marks write
-- storm, which was 90% of all queries until it was cut.
--
-- THE FIX. Put container in the index next to pubkey, so the seek lands on
-- the rows actually wanted. acquired_at rides along as the third column
-- because every one of these queries ends in ORDER BY acquired_at, and
-- without it the planner builds a temp b-tree to sort what it just read
-- (confirmed on the live plan: USE TEMP B-TREE FOR ORDER BY).
CREATE INDEX IF NOT EXISTS idx_player_items_pubkey_container
  ON player_items (pubkey, container, acquired_at);

-- The old one is a strict prefix of the new one, so it can answer nothing the
-- composite cannot. Kept, it would only be a second tree to write on every
-- item taken, dropped, worn, banked or lost.
DROP INDEX IF EXISTS idx_player_items_pubkey;
