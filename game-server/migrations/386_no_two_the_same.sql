-- 386: NO TWO THE SAME (2026-11-10). A recheck after 382-385 found pieces that
-- pass had made into copies of another, and the epics still matched by one:
-- pulling the stiletto and the oyster knife back made three of the bone shiv;
-- the shadow-step boots became the coppice treads; the coral crown, the
-- lion-pelt cloak and the smith's aegis each beat a piece they should sit
-- beside. Each gets something that is its own. This supersedes 382 where the
-- two name the same piece.

-- the knives: one finds the seam, one opens what it cuts
UPDATE item_templates SET traits = 'pierce:1,piercing' WHERE id = 'stiletto';
UPDATE item_templates SET bleed = 2 WHERE id = 'oyster-knife';
-- feet: the only weightless boots, and the only boots with 3
UPDATE item_templates SET weight = 0, traits = 'quiet' WHERE id = 'shadow-step-boots';
UPDATE item_templates SET armor = 3 WHERE id = 'warden-sabatons';
-- the epic helms
UPDATE item_templates SET traits = 'slick' WHERE id = 'coral-crown';
UPDATE item_templates SET traits = 'wardhide,spiked:1' WHERE id = 'cast-antler-crown';
UPDATE item_templates SET traits = 'watertight' WHERE id = 'crab-shell-casque';
-- the only cloak with 3
UPDATE item_templates SET armor = 3 WHERE id = 'pale-scale-mantle';
-- shields: the best thorns, and the heaviest wall blocks most
UPDATE item_templates SET block = 0.3, traits = 'wall,thorns:3' WHERE id = 'smiths-aegis';
UPDATE item_templates SET block = 0.35 WHERE id = 'gravestone-shield';
-- the rest
UPDATE item_templates SET traits = 'spiked:1' WHERE id = 'chitin-harness';
UPDATE item_templates SET traits = 'quiet,staunched' WHERE id = 'grave-shroud';
UPDATE item_templates SET traits = 'quiet,slick,watertight' WHERE id = 'drowned-divers-shroud';
UPDATE item_templates SET traits = 'weighted' WHERE id = 'shell-cracker';
-- and the four the fixes above would otherwise have left matched
UPDATE item_templates SET traits = 'wardhide,strapped' WHERE id = 'bone-barred-visor';
UPDATE item_templates SET weight = 8, traits = 'wall,thorns:2,riposte:1' WHERE id = 'crown-guard-pavise';
UPDATE item_templates SET stun = 0.22 WHERE id = 'flanged-mace';
