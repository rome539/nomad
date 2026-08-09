-- NO ROCK AT THE DOOR (rome, 2026-08-09: no gate should come with a rock).
--
-- The fortress has seven rock spawns and every one of them was a gate or the
-- room next to one: the Broken Gate, the Weeper's Arch, the Collapsed Sally
-- Port, and then the Sewer Mouth, the Sunken Stair, the Gatefall, the
-- Wall-Breach. Nothing in the other 103 rooms of the ruin. You could not walk
-- out of a door without tripping over a weapon, and you could not find one
-- anywhere else.
--
-- The code half of this ships alongside: every rock in the fortress WANDERS now
-- (zone.ts rockWanders / pickRubble). A rock taken does not come back where it
-- was — the ruin coughs one up somewhere else entirely, never at a door, never
-- in a bolthole, never in a room that already has one. Its whereabouts is live
-- state, not a spawn row.
--
-- What THIS file does is fix where they START. The rows below are the seven
-- slots; the three sitting on the gates are moved off them, so no door has a
-- rock on it at first light and none of them can drift back.
--
-- Moved, not added: the fortress holds exactly the seven rocks it held before.
UPDATE ground_spawns SET room_id = 'crypt-steps' WHERE item_id = 'loose-rock' AND room_id = 'gate';
UPDATE ground_spawns SET room_id = 'cistern'     WHERE item_id = 'loose-rock' AND room_id = 'weeper-arch';
UPDATE ground_spawns SET room_id = 'forge'       WHERE item_id = 'loose-rock' AND room_id = 'sally-port';

-- A NOTE ON THE LIVE WORLD, since this lands on a running one. The floor is
-- Durable Object state, not a table: the three rocks currently lying at the
-- gates are already down and no migration reaches them. They stay until someone
-- picks them up, and then they wander off into the ruin like everything else and
-- never come back to a door. The three rows above are unplaced as far as the
-- world is concerned, so it lays them down on the next load — the ruin runs a
-- few rocks heavy for as long as it takes players to clear the doorsteps, and
-- settles at seven on its own. No reseed, nothing lost.
