-- THE MARKS YOU HAVE SEEN (2026-08-24).
--
-- The journal gains a second ledger beside the bestiary: the mob traits a
-- wanderer has MET and can now name. A trait is written here only when a
-- traited creature is STUDIED or KILLED (the same "study + blood" law that
-- fills the bestiary), so the list reads as what you have actually seen out in
-- the world, never a catalogue of everything that exists.

CREATE TABLE IF NOT EXISTS journal_traits (
  journal_id TEXT NOT NULL,
  trait TEXT NOT NULL,
  discovered_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (journal_id, trait)
);
