-- THE MAP TELLS THE TRUTH (rome, 2026-10-29: an exit said west and the map
-- drew the room below). Each room here is moved to the square its own exits
-- point at; the exits themselves are untouched, so every direction in the game
-- reads as it always did. The wood is left as it is: it is a maze on purpose.
-- Found by checking every compass exit against the map; these 19 moves put 42
-- of them right without putting any other exit wrong.
UPDATE rooms SET map_x = -1, map_y = 33 WHERE id = 'kennels';  -- was (0, 33)
UPDATE rooms SET map_x = 0, map_y = 43 WHERE id = 'sewer';  -- was (-1, 33)
UPDATE rooms SET map_x = 97, map_y = -4 WHERE id = 'the-blue-ice';  -- was (97, -1)
UPDATE rooms SET map_x = 95, map_y = 5 WHERE id = 'the-catch-slope';  -- was (93, 6)
UPDATE rooms SET map_x = 96, map_y = 7 WHERE id = 'the-fall-fan';  -- was (96, 6)
UPDATE rooms SET map_x = 2, map_y = 9 WHERE id = 'the-grave-drain';  -- was (-22, 21)
UPDATE rooms SET map_x = 100, map_y = -4 WHERE id = 'the-heat-under';  -- was (101, -3)
UPDATE rooms SET map_x = 97, map_y = 7 WHERE id = 'the-lower-fan';  -- was (96, 5)
UPDATE rooms SET map_x = 77, map_y = 3 WHERE id = 'the-north-corrie';  -- was (76, 2)
UPDATE rooms SET map_x = 101, map_y = -4 WHERE id = 'the-north-step';  -- was (102, -3)
UPDATE rooms SET map_x = 74, map_y = 1 WHERE id = 'the-pass-head';  -- was (76, 3)
UPDATE rooms SET map_x = 96, map_y = -5 WHERE id = 'the-serac-field';  -- was (97, -4)
UPDATE rooms SET map_x = 86, map_y = 8 WHERE id = 'the-shelf-head';  -- was (86, 10)
UPDATE rooms SET map_x = 75, map_y = 1 WHERE id = 'the-shoulder-walk';  -- was (77, 3)
UPDATE rooms SET map_x = 96, map_y = 5 WHERE id = 'the-splinter-field';  -- was (95, 5)
UPDATE rooms SET map_x = 105, map_y = 3 WHERE id = 'the-warm-under';  -- was (104, 1)
UPDATE rooms SET map_x = 97, map_y = -5 WHERE id = 'the-white-tower';  -- was (98, -1)
UPDATE rooms SET map_x = 86, map_y = -1 WHERE id = 'the-wind-scoop';  -- was (87, 0)
UPDATE rooms SET map_x = 3, map_y = 41 WHERE id = 'well';  -- was (3, 33)
