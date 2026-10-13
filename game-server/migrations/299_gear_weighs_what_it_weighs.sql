-- 299: GEAR WEIGHS WHAT IT WEIGHS (rome, 2026-10-12).
--
-- Weight was a 0-4 abstraction per piece, and a whole kit topped out at 15, so
-- a light kit of 3 read like a man holding a sword and nothing else. Every
-- piece now carries its real weight in kilograms, taken from what the thing
-- actually is: knives and shivs under a kilo (0), swords and hatchets 1-2,
-- greatswords and polearms 3-4; bucklers 1, targes 2-3, kite and round shields
-- 4, tower shields and pavises 8, a headstone 10; padded and leather jacks 2-5,
-- a mail hauberk 10, scale and brigandine 9, plate 12-16; caps and hoods 0-1,
-- coifs and kettle-helms 2, great helms 3; cloaks 1-3 (a lion's whole pelt 4,
-- a chain-lined mantle 5); boots 1-2, greaves and sabatons 3.
--
-- Where a piece's own description says it is light, it is: the chitin harness
-- ("light as horn") 4, the abyssal scale coat ("light as skin") 3, the coral
-- crown 1, the warden sabatons ("weigh almost nothing") 1. That is what gives
-- a light kit its epics.
--
-- Kits now run about 2 kg (sword and rag vest) to 34 (plate, wall shield), 41
-- at the very most. Every rule that reads weight was rescaled to kilograms in
-- the same change (exhaustion.ts, zone-data.ts). Armour and damage untouched.
UPDATE item_templates SET weight = 0 WHERE id IN (
  'bounds-hood', 'fleshing-knife', 'fowlers-hood', 'oyster-knife', 'stiletto', 
  'wool-lined-cap'
);
UPDATE item_templates SET weight = 1 WHERE id IN (
  'adder-skin-boots', 'antler-braced-cap', 'battered-buckler', 'coral-crown', 
  'cracked-leather-shoes', 'crawlers-hooks', 'drowned-divers-shroud', 'eel-hide-treads', 
  'eel-skin-cloak', 'felt-soled-boots', 'forged-main-gauche', 'gaff-hook', 
  'hide-wound-boots', 'horsemans-pick', 'kings-guard-blade', 'knotted-lash', 
  'marrow-scepter', 'moss-lined-boots', 'moth-eaten-mantle', 'quilted-coif', 'rag-vest', 
  'riding-mace', 'rust-eaten-cleaver', 'rusted-sword', 'rusty-billhook', 
  'shade-wrapped-greaves', 'spiked-buckler', 'sword-breaker', 'tattered-cloak', 
  'wolfskin-hood', 'worn-boots'
);
UPDATE item_templates SET weight = 2 WHERE id IN (
  'bog-pearl-targe', 'bristling-targe', 'cutters-jerkin', 'drovers-frock', 'flanged-mace', 
  'glutton-skull-helm', 'harness-leathers', 'hobnailed-boots', 'ironshod-boots', 
  'keepers-wrap', 'lead-wolf-ruff', 'lopped-stave', 'masons-mallet', 'mirror-bright-helm', 
  'oilskin-cape', 'oilskin-jack', 'pedlars-coat', 'pitted-spear', 'quarterstaff', 
  'reaver-glaive', 'reed-thatch-cape', 'riveted-coif', 'rusted-pick', 'rusted-sallet', 
  'sappers-treads', 'sentinels-mantle', 'the-white-roe', 'tusk-studded-targe', 
  'wardens-watch-mantle', 'watchmans-boots', 'watchmans-kettle-helm', 'wolf-skull-helm'
);
UPDATE item_templates SET weight = 3 WHERE id IN (
  'abyssal-harpoon', 'abyssal-scale-coat', 'boar-spear', 'cargo-coat', 'carriers-jack', 
  'cork-lined-jack', 'forged-warmaul', 'halberd', 'headsman-sword', 'hide-cloak', 
  'hill-mantle', 'houndsbane', 'hyena-mantle', 'iron-man-catcher', 'lashed-plank-shield', 
  'man-catcher', 'moss-packed-jerkin', 'notched-greatsword', 'padded-greathelm', 
  'padded-jerkin', 'pale-scale-mantle', 'plated-greaves', 'scavenger-coat', 
  'shepherds-mantle', 'skull-headed-maul', 'storm-cloak', 'studded-maul', 'the-hedge-bill', 
  'the-last-bear', 'war-pike', 'warden-greathelm', 'warden-maul', 'white-hide-mantle', 
  'wolfskin-cloak', 'woodwards-axe'
);
UPDATE item_templates SET weight = 4 WHERE id IN (
  'boiled-cuirass', 'chitin-harness', 'coppice-hurdle', 'fleece-lined-jack', 
  'hill-wolf-jerkin', 'iron-bound-shield', 'knights-kite-shield', 'lion-pelt-cloak', 
  'smiths-ruin', 'two-headed-maul', 'woodwards-coat'
);
UPDATE item_templates SET weight = 5 WHERE id IN (
  'barbed-round-shield', 'bristle-hide-jack', 'chain-lined-mantle', 'mirror-bright-jack', 
  'nail-studded-jack', 'tail-board-targe', 'thick-hide-jack', 'white-hide-coat'
);
UPDATE item_templates SET weight = 6 WHERE id IN (
  'drake-scale-shield', 'glutton-hide-coat', 'kelp-woven-mail', 'shell-plate', 
  'warden-plate'
);
UPDATE item_templates SET weight = 7 WHERE id IN (
  'captains-wall', 'riveted-cuirass'
);
UPDATE item_templates SET weight = 8 WHERE id IN (
  'crown-guard-pavise', 'smiths-aegis', 'tarred-cuirass', 'warden-tower-shield'
);
UPDATE item_templates SET weight = 9 WHERE id IN (
  'tusk-sewn-brigandine', 'winter-cuirass'
);
UPDATE item_templates SET weight = 10 WHERE id IN (
  'gravestone-shield', 'lashed-warcoat', 'mail-hauberk'
);
UPDATE item_templates SET weight = 12 WHERE id IN (
  'cargo-plate', 'deadplate-harness', 'last-watch', 'riveted-warplate'
);
UPDATE item_templates SET weight = 13 WHERE id IN (
  'barbed-warplate'
);
UPDATE item_templates SET weight = 14 WHERE id IN (
  'hulks-iron', 'mirror-plate'
);
UPDATE item_templates SET weight = 15 WHERE id IN (
  'the-tenor-bell'
);
UPDATE item_templates SET weight = 16 WHERE id IN (
  'smiths-greatplate'
);
