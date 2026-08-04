-- BLOOD UNDER THE ROOF (rome, 2026-08-04: "what happens your sharing a den with
-- someone who murders you and steals your stuff? ... this sharing dens makes no
-- fucking sense").
--
-- He is right, and not about the murder — the murder is the game. About the
-- SHAPE. As it shipped, a bunk was a one-sided gift: the holder hands somebody
-- the ability to stand inside the one fixed point they are obliged to keep
-- coming back to, and gets nothing back for it. The guest gets a free safehouse
-- and risks a room they do not own. Every scrap of the exposure sat on whoever
-- was generous, which is a bad trade wearing a social feature's clothes.
--
-- The fix is not to make dens safe — nothing in this world is safe, and the bar
-- is already the whole of a den's security. It is to make the betrayal cost the
-- betrayer THE THING THEY CAME FOR. Draw steel on anybody under a roof you do
-- not hold, and the roof is shut to you: the key is gone that instant, and no
-- holder can ever hand it back. You do not get to sleep in a house you spilled
-- blood in.
--
-- WHY PERMANENT, AND WHY A TABLE. A revoked key is worth nothing if the same
-- person can be re-keyed an hour later by a holder who has forgotten, or by the
-- next holder after a lapse, or by a friend of the killer who takes the house on
-- purpose. The room remembers, past the hold that was standing when it happened.
-- That is the only version of this rule that a player cannot simply wait out.
--
-- It records the VICTIM too, because the holder is owed the account: they find
-- out who, and to whom, wherever in the world they are standing when it lands.
CREATE TABLE IF NOT EXISTS den_blood (
  room_id TEXT NOT NULL,
  pubkey  TEXT NOT NULL,        -- the one who drew steel; barred from this roof for good
  victim  TEXT NOT NULL,        -- who they drew it on, for the telling
  at      INTEGER NOT NULL,
  PRIMARY KEY (room_id, pubkey)
);

CREATE INDEX IF NOT EXISTS idx_den_blood_room ON den_blood (room_id);

-- NOT DONE, deliberately:
--
--   NOTHING HAPPENS TO THE HOLDER'S OWN VIOLENCE. A man who kills somebody in
--   his own house keeps his house. It is his house. What he loses is the bunk he
--   gave away, the person who was in it, and whatever that person tells the rest
--   of the world — which is a real cost, paid in the only currency six doors and
--   forty-two beds can be paid in.
--
--   NO REFUND, NO RECOVERY, NO GUARD. The victim still loses everything they
--   were carrying, because that is what dying is here. Their SHELF was never
--   reachable by the killer and still is not. This rule takes the safehouse off
--   the killer; it does not put the run back in the victim's pack.
