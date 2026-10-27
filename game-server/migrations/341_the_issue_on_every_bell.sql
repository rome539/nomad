-- THE ISSUE CHEST REFILLS FOR EVERY BELL (rome, 2026-10-26). It took a day to
-- refill, and its door opens only with the fortress bell: near 01:00 and 13:00
-- UTC, up to twenty minutes either way, for about eleven and a half minutes.
-- So the bell after an opening always found it empty, and the one after that
-- did too whenever the ringer was early - it refilled every second or third
-- bell, never the next. Eleven hours is under the shortest gap between two
-- ringings, so every bell finds it refilled. Some of those refills come up
-- empty (PRIZE_EMPTY_ODDS in zone-data.ts): the last issue already given out.
UPDATE caches SET refill_secs = 39600 WHERE id = 'box-armory';
