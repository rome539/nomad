-- 098 THE TRAIT LEDGER (rome, 2026-07-19): abilities move out of the code and
-- onto the item row. Every gear trait used to be a hardcoded Set of item ids in
-- zone-data.ts — one trait welded to a handful of names, and new gear meant a
-- code ship. Now `traits` is a column, like armor and weight: a comma list of
-- tags, valued tags as name:value ("wall,thorns:2"). The code reads the tag;
-- new gear becomes data entry, and one ability can land on many pieces.
--
-- Backfill is VERBATIM from the old code sets — no item gains or loses
-- anything the day this ships. Run once (the ALTER fails loudly if repeated).
-- Note forged-warspike keeps pierce:2 WITHOUT the piercing class tag — it
-- punches plate but never found the hound's throat; that asymmetry is old and
-- deliberate, so the ledger keeps it.

ALTER TABLE item_templates ADD COLUMN traits TEXT NOT NULL DEFAULT '';

-- Weapons: reach / two-handed / pierce (valued) / piercing (the vitals class)
UPDATE item_templates SET traits = 'reach' WHERE id IN ('quarterstaff', 'gaff-hook');
UPDATE item_templates SET traits = 'reach,pierce:1,piercing' WHERE id = 'pitted-spear';
UPDATE item_templates SET traits = 'reach,two-handed,pierce:2,piercing' WHERE id IN ('war-pike', 'abyssal-harpoon');
UPDATE item_templates SET traits = 'pierce:2,piercing' WHERE id IN ('rusted-pick', 'horsemans-pick');
UPDATE item_templates SET traits = 'pierce:3,piercing' WHERE id = 'crow-beak-pick';
UPDATE item_templates SET traits = 'pierce:2' WHERE id = 'forged-warspike';
UPDATE item_templates SET traits = 'strapped' WHERE id = 'strapped-baldric';

-- Off-hands: wall / thorns (valued) / riposte (valued) / the mancatcher's denial
UPDATE item_templates SET traits = 'wall' WHERE id IN ('warden-tower-shield', 'gravestone-shield');
UPDATE item_templates SET traits = 'wall,thorns:2' WHERE id IN ('crown-guard-pavise', 'smiths-aegis');
UPDATE item_templates SET traits = 'thorns:1' WHERE id = 'spiked-buckler';
UPDATE item_templates SET traits = 'thorns:2' WHERE id = 'bristling-targe';
UPDATE item_templates SET traits = 'riposte:2' WHERE id = 'parrying-dagger';
UPDATE item_templates SET traits = 'riposte:3' WHERE id = 'forged-main-gauche';
UPDATE item_templates SET traits = 'mancatcher' WHERE id = 'man-catcher';

-- Worn: padded (stun ward) / wardhide (wound+leg ward) / mailward (edge ward)
--       quiet (the bones don't hear) / slick (the grip slips)
UPDATE item_templates SET traits = 'padded' WHERE id IN ('quilted-coif', 'riveted-cuirass', 'padded-jerkin', 'deadplate-harness', 'padded-greathelm');
UPDATE item_templates SET traits = 'wardhide' WHERE id IN ('thick-hide-jack', 'sentinels-mantle', 'bone-barred-visor');
UPDATE item_templates SET traits = 'mailward' WHERE id IN ('mail-hauberk', 'riveted-coif', 'chain-lined-mantle');
UPDATE item_templates SET traits = 'quiet' WHERE id IN ('felt-soled-boots', 'grave-shroud', 'pale-hide-hood', 'shade-wrapped-greaves', 'shroud-hood', 'shadow-step-boots', 'drowned-divers-shroud');
UPDATE item_templates SET traits = 'slick' WHERE id IN ('eel-skin-cloak', 'kelp-woven-mail', 'abyssal-scale-coat', 'eel-hide-treads');
