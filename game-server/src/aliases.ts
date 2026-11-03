// ALIASES (rome, 2026-11-03). A wanderer's own short words for what they type
// often: `alias kr = attack rat`, and `kr` is sent on as `attack rat`. Words
// after an alias ride along (`bb arm` with bb = bandage is `bandage arm`).
//
// An alias only saves typing. It stands for ONE command, the very text you
// could have typed yourself — no chaining, no repeat, no placeholders, nothing
// the game does not already do. What it expands to is never checked: if that
// is not a command, the game answers it the way it answers any unknown text.
// It is expanded once (an alias naming another alias is not followed), and a
// built-in word always wins, so an alias can never hide a real command.
//
// Kept on the player row (players.aliases, mig 364), so they follow the key to
// every browser, like the stance and the keepers' tellings.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { parse } from "./parser";
import { setAliases } from "./world";

export const ALIAS_MAX = 40;
export const ALIAS_NAME = /^[a-z0-9]{1,12}$/;
export const ALIAS_TEXT_MAX = 120;
// The words the page answers itself and never sends: an alias can neither be
// named one (the page would eat it first) nor stand for one (the server cannot
// reach back into the page to run it).
export const PAGE_WORDS = new Set(["login", "logout", "keys", "quit", "leave", "exit", "fullscreen", "tutorial"]);

export function unpack(packed: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!packed) return out;
  try {
    const o = JSON.parse(packed);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o)) {
        if (ALIAS_NAME.test(k) && typeof v === "string" && v) out.set(k, v);
      }
    }
  } catch {}
  return out;
}

export function pack(aliases: Map<string, string>): string {
  return aliases.size ? JSON.stringify(Object.fromEntries(aliases)) : "";
}

function headOf(text: string): { head: string; rest: string } {
  const t = text.trim().replace(/\s+/g, " ");
  const space = t.indexOf(" ");
  return { head: (space === -1 ? t : t.slice(0, space)).toLowerCase(), rest: space === -1 ? "" : t.slice(space + 1) };
}

// A word the game (or the page) already answers to.
export function builtIn(word: string): boolean {
  if (word === "alias" || word === "unalias" || PAGE_WORDS.has(word)) return true;
  const p = parse(word);
  return !!p && !("miss" in p);
}

// What the typed line becomes. Untouched unless its first word is one of yours.
export function expand(session: Session, text: string): string {
  const aliases = session.aliases;
  if (!aliases?.size) return text; // ('kr is speech: no alias starts with a quote)
  const { head, rest } = headOf(text);
  const to = aliases.get(head);
  if (!to) return text;
  return rest ? `${to} ${rest}` : to;
}

// `alias`, `alias kr`, `alias kr = attack rat`, `unalias kr`. True when the line
// was one of these and has been answered.
export async function handle(z: ZoneDO, session: Session, text: string): Promise<boolean> {
  const { head, rest } = headOf(text);
  if (head !== "alias" && head !== "unalias") return false;
  const aliases = session.aliases ?? (session.aliases = new Map());

  if (head === "unalias") {
    const name = rest.trim().toLowerCase();
    if (!name) { z.send(session, "unalias <word> drops one of your aliases. 'alias' lists them."); return true; }
    if (!aliases.delete(name)) { z.send(session, `You have no alias '${name}'.`); return true; }
    await save(z, session);
    z.send(session, `'${name}' is gone.`);
    return true;
  }

  if (!rest) {
    if (!aliases.size) { z.send(session, "You have no aliases. alias <word> = <command> makes one, e.g. alias kr = attack rat."); return true; }
    const lines = [...aliases].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${k} = ${v}`);
    z.send(session, ["Your aliases:", ...lines, "unalias <word> drops one."].join("\n"));
    return true;
  }

  const eq = rest.indexOf("=");
  const name = (eq === -1 ? rest : rest.slice(0, eq)).trim().toLowerCase();
  const to = eq === -1 ? "" : rest.slice(eq + 1).trim().replace(/\s+/g, " ");
  if (eq === -1) {
    const have = aliases.get(name);
    z.send(session, have ? `${name} = ${have}` : `You have no alias '${name}'. alias ${name} = <command> makes it.`);
    return true;
  }
  if (!ALIAS_NAME.test(name)) { z.send(session, "An alias is one word of letters and numbers, up to 12 long."); return true; }
  if (builtIn(name)) { z.send(session, `'${name}' is already a command, and it stays one.`); return true; }
  if (!to) { z.send(session, `alias ${name} = <command>: say what it stands for.`); return true; }
  if (to.length > ALIAS_TEXT_MAX) { z.send(session, `That is too long for an alias (${ALIAS_TEXT_MAX} letters at most).`); return true; }
  const toHead = headOf(to).head;
  if (toHead === "alias" || toHead === "unalias") { z.send(session, "An alias can't make or drop aliases."); return true; }
  if (PAGE_WORDS.has(toHead)) { z.send(session, `'${toHead}' is answered by your page, not the world, so an alias can't stand for it.`); return true; }
  if (!aliases.has(name) && aliases.size >= ALIAS_MAX) { z.send(session, `You have ${ALIAS_MAX} aliases, the most there can be. unalias one first.`); return true; }
  aliases.set(name, to);
  await save(z, session);
  z.send(session, `${name} = ${to}`);
  return true;
}

async function save(z: ZoneDO, session: Session): Promise<void> {
  try { await setAliases(z.env.DB, session.pubkey, pack(session.aliases ?? new Map())); } catch {}
}
