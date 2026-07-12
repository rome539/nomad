-- 072: the first blood — the dungeon's Cain and Abel, carved where it happened.
-- On 2026-07-11, in the first fight between wanderers this world ever ran,
-- Graystep fell upon Stonemantle bare-handed at the Collapsed Sally Port.
-- Stonemantle had picked the room's one loose rock off the floor first.
-- The ambusher ate a stun, fumbled at 1 hp, and died to the stone — no dice
-- punished the aggressor; the aggressor lost a fair gamble. The scripture is
-- inverted Genesis: here Abel picked up the stone, and the mark rides the
-- living. The lines teach three mechanics as myth: striking first is not
-- winning, the floor's rock is a weapon, and man-blood stays on the hands.
UPDATE rooms SET description = description || ' One flagstone by the door sits darker than its neighbors, scratched over in a hand nobody remembers: ''TWO WERE BORN OF ONE DOOR. GRAYSTEP FELL UPON STONEMANTLE WITH EMPTY HANDS, AND THE FLOOR GAVE THE QUIET ONE A STONE. FIRST MAN-BLOOD THIS HOUSE EVER DRANK. THE MARK RIDES THE LIVING.'''
WHERE id = 'sally-port';
