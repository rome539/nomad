-- THE WEEPER'S ARCH STANDS OUTSIDE (rome, 2026-11-03: its lantern stopped
-- burning and moving).
--
-- Mig 366 took the arch off the gates. Its region was blank, the fortress's,
-- and a gate is counted outdoors for being a gate whatever its region says, so
-- nothing showed until it stopped being one: then it was read as a room inside
-- the keep. The server sent it no sky and no hour, the picture lost its night
-- and the lantern's flame and light with it, and the map drew it as the halls.
--
-- It is open ground, out under the wall like the Black Fen and the Old Road,
-- and now its region says so.

UPDATE rooms SET region = 'out' WHERE id = 'weeper-arch';
