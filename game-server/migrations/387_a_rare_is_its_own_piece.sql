-- 387: A RARE IS ITS OWN PIECE (2026-11-10). The last of the gear pass: twenty-six
-- rares that another piece of the same or a lower rarity matched or beat, in
-- numbers and in traits. Each gets the one thing that makes it worth choosing.
-- (Commons and uncommons that share numbers across regions are left: they are
-- the same cheap piece under a local name, and a second worn ward now counts.)

UPDATE item_templates SET weight = 3 WHERE id = 'boiled-cuirass';
UPDATE item_templates SET weight = 4, traits = 'wardhide,quiet' WHERE id = 'white-hide-coat';
UPDATE item_templates SET traits = 'wardhide,staunched' WHERE id = 'hyena-mantle';
UPDATE item_templates SET traits = 'wardhide,hooded' WHERE id = 'white-hide-mantle';
UPDATE item_templates SET traits = 'slick,watertight' WHERE id = 'eel-skin-cloak';
UPDATE item_templates SET traits = 'hooded,fleeced,strapped' WHERE id = 'hill-mantle';
UPDATE item_templates SET armor = 3 WHERE id = 'plated-greaves';
UPDATE item_templates SET traits = 'quiet,staunched' WHERE id = 'shade-wrapped-greaves';
UPDATE item_templates SET traits = 'slick,watertight' WHERE id = 'eel-hide-treads';
UPDATE item_templates SET traits = 'quiet,wardhide' WHERE id = 'white-hide-boots';
UPDATE item_templates SET traits = 'quiet,watertight' WHERE id = 'adder-skin-boots';
UPDATE item_templates SET traits = 'quiet,strapped' WHERE id = 'sappers-treads';
UPDATE item_templates SET traits = 'padded,mailward' WHERE id = 'warden-greathelm';
UPDATE item_templates SET traits = 'padded,strapped' WHERE id = 'padded-greathelm';
UPDATE item_templates SET traits = 'quiet,hooded' WHERE id = 'shroud-hood';
UPDATE item_templates SET traits = 'padded,spiked:1' WHERE id = 'wolf-skull-helm';
UPDATE item_templates SET block = 0.28 WHERE id = 'warden-tower-shield';
UPDATE item_templates SET traits = 'riposte:1' WHERE id = 'knights-kite-shield';
UPDATE item_templates SET traits = 'wicked' WHERE id = 'notched-greatsword';
UPDATE item_templates SET bleed = 3 WHERE id = 'headtaker-axe';
UPDATE item_templates SET traits = 'tripping' WHERE id = 'warden-maul';
UPDATE item_templates SET sweep = 2 WHERE id = 'two-headed-maul';
UPDATE item_templates SET traits = 'weighted' WHERE id = 'skull-headed-maul';
UPDATE item_templates SET traits = 'burning,reach' WHERE id = 'longbrand';
UPDATE item_templates SET sweep = 2 WHERE id = 'greatblade';
UPDATE item_templates SET bleed = 3 WHERE id = 'reaping-blade';
