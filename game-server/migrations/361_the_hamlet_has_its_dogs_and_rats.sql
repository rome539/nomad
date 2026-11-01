-- THE HAMLET HAS ITS DOGS AND ITS RATS (rome, 2026-11-01). The den ground was
-- built near-empty on purpose, five bodies in sixty rooms, and stayed that way
-- after the dens moved out of it, at twelve rooms to a creature where the wood
-- and the crossing stand at two. It is given what an emptied hamlet would
-- have: the rats that took the mill, the lofts and the houses when the people
-- went, and the village's dogs run wild in the street, a pack with one at its
-- head. Nothing new: the scabby rat, the masterless dog and the lead dog, at
-- their own templates. With ids, so no live creature is reshuffled (309).
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('hamlet-rat-1',  'rat', 'the-mill'),
  ('hamlet-rat-2',  'rat', 'the-wheel-pit'),
  ('hamlet-rat-3',  'rat', 'the-reeves-loft'),
  ('hamlet-rat-4',  'rat', 'the-reeves-house'),
  ('hamlet-rat-5',  'rat', 'the-north-house'),
  ('hamlet-rat-6',  'rat', 'the-smithy'),
  ('hamlet-rat-7',  'rat', 'the-burnt-croft'),
  ('hamlet-rat-8',  'rat', 'the-croft-backs'),
  ('hamlet-rat-9',  'rat', 'the-black-hut'),
  ('hamlet-rat-10', 'rat', 'the-hurdle-yard'),
  ('hamlet-rat-11', 'rat', 'the-warreners-lodge'),
  ('hamlet-rat-12', 'rat', 'the-lodge-yard'),
  ('hamlet-dog-lead', 'lead-dog', 'the-street-cross'),
  ('hamlet-dog-1', 'masterless-dog', 'the-street'),
  ('hamlet-dog-2', 'masterless-dog', 'the-cart-turn'),
  ('hamlet-dog-3', 'masterless-dog', 'the-village-pound'),
  ('hamlet-dog-4', 'masterless-dog', 'the-chapel-green'),
  ('hamlet-dog-5', 'masterless-dog', 'the-squatters-row'),
  ('hamlet-dog-6', 'masterless-dog', 'the-hearth-stones');
