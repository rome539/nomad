-- 318: THE MOUNTAIN'S HUNTERS THIN (rome, 2026-10-20). The census found two
-- live hares against thirty-six dens: the mountain carried 126 hunters on 114
-- prey animals, about one mouth to every head of game, so the hares and the
-- grouse were eaten nearly as fast as a den could refill (one in ~40 minutes),
-- and the hunters went hungry, which is when they come for you. The hunters
-- come down to 60, about one to every two prey; the prey, the scavengers and
-- the cave lion are untouched. Each kind loses the dens standing closest to
-- another of its own, so what is left still covers the whole mountain. The
-- live animals go with their rows (ai.reconcilePopulation trims to the table).
-- The mountain then holds ~257 creatures in 399 rooms; growing it toward 514
-- rooms (one creature to two rooms) is the next step, not this one.

-- hill-wolf: 17 -> 8
DELETE FROM mob_spawns WHERE id IN (
  'spawn-hill-wolf@the-broken-crust#274',
  'spawn-hill-wolf@the-cloud-base#275',
  'spawn-hill-wolf@the-cold-plain#276',
  'spawn-hill-wolf@the-drag-mark#277',
  'spawn-hill-wolf@the-glacier-head#278',
  'spawn-hill-wolf@the-grey-nothing#279',
  'spawn-hill-wolf@the-hanging-scree#280',
  'spawn-hill-wolf@the-high-neve#281',
  'spawn-hill-wolf@the-rake-top#282');
-- stone-adder: 17 -> 8
DELETE FROM mob_spawns WHERE id IN (
  'spawn-stone-adder@the-adder-shelf#565',
  'spawn-stone-adder@the-adder-shelf#566',
  'spawn-stone-adder@the-basking-flags#567',
  'spawn-stone-adder@the-basking-flags#568',
  'spawn-stone-adder@the-crack-line#569',
  'spawn-stone-adder@the-dry-heat#570',
  'spawn-stone-adder@the-glazed-slab#571',
  'spawn-stone-adder@the-heat-under#572',
  'spawn-stone-adder@the-lower-warm#573');
-- ermine: 15 -> 6
DELETE FROM mob_spawns WHERE id IN (
  'spawn-ermine@the-cold-shadow#99',
  'spawn-ermine@the-cold-shoulder#100',
  'spawn-ermine@the-crest-gap#101',
  'spawn-ermine@the-grey-ice#102',
  'spawn-ermine@the-ice-blocks#103',
  'spawn-ermine@the-moat#104',
  'spawn-ermine@the-neve#105',
  'spawn-ermine@the-north-lip#106',
  'spawn-ermine@the-runnel#107');
-- snow-fox: 15 -> 7
DELETE FROM mob_spawns WHERE id IN (
  'spawn-snow-fox@the-black-glass#550',
  'spawn-snow-fox@the-blue-shadow#551',
  'spawn-snow-fox@the-burnt-ground#552',
  'spawn-snow-fox@the-cold-terrace#553',
  'spawn-snow-fox@the-crack-heap#554',
  'spawn-snow-fox@the-glacier-bend#555',
  'spawn-snow-fox@the-last-fan#556',
  'spawn-snow-fox@the-lower-fan#557');
-- glutton: 13 -> 5
DELETE FROM mob_spawns WHERE id IN (
  'spawn-glutton@the-fall-line#189',
  'spawn-glutton@the-glacier-toe#190',
  'spawn-glutton@the-last-ground#191',
  'spawn-glutton@the-last-terrace#192',
  'spawn-glutton@the-lean#193',
  'spawn-glutton@the-lower-flags#194',
  'spawn-glutton@the-shelf-drop#195',
  'spawn-glutton@the-tallow-stone#196');
-- hill-eagle: 13 -> 6
DELETE FROM mob_spawns WHERE id IN (
  'spawn-hill-eagle@the-band-end#253',
  'spawn-hill-eagle@the-crag-shadow#254',
  'spawn-hill-eagle@the-first-crag#255',
  'spawn-hill-eagle@the-first-tower#256',
  'spawn-hill-eagle@the-gendarme#257',
  'spawn-hill-eagle@the-high-notch#258',
  'spawn-hill-eagle@the-high-red#259');
-- lynx: 11 -> 5
DELETE FROM mob_spawns WHERE id IN (
  'spawn-lynx@the-approach#292',
  'spawn-lynx@the-chimney-foot#293',
  'spawn-lynx@the-corrie-mouth#294',
  'spawn-lynx@the-dry-ledge#295',
  'spawn-lynx@the-dry-shelf#296',
  'spawn-lynx@the-last-shelf#297');
-- eagle-owl: 9 -> 5
DELETE FROM mob_spawns WHERE id IN (
  'spawn-eagle-owl@the-firn#90',
  'spawn-eagle-owl@the-gully-top#91',
  'spawn-eagle-owl@the-inversion#92',
  'spawn-eagle-owl@the-last-crest#93');
-- hill-fox: 8 -> 5
DELETE FROM mob_spawns WHERE id IN (
  'spawn-hill-fox@the-dry-gorge#266',
  'spawn-hill-fox@the-hidden-burn#267',
  'spawn-hill-fox@the-hot-scree#268');
-- wildcat: 7 -> 4
DELETE FROM mob_spawns WHERE id IN (
  'spawn-wildcat@the-broken-ground-high#701',
  'spawn-wildcat@the-cleft#702',
  'spawn-wildcat@the-loose-slope#703');
