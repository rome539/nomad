-- THE SECOND WAVE OF INTERACTABLES (2026-09-01). One new world row: the
-- osier beds give up their cords. The withies grow there — somebody cut them
-- before (the gibbet's cord came from somewhere), and the floor's roaming law
-- carries each new cord out into the wood band, which is exactly how a cut
-- withy should behave. The beam-walk's whole answer now has a home.

INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('hempen-cord', 'the-osier-beds', 1);
