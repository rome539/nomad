/**
 * i18n.ts — tiny UI-string translation. No framework; vanilla key→string lookup
 * over JSON dictionaries, with English fallback.
 *
 *   import { t, setLang, onLangChange } from './nostr-i18n';
 *   button.textContent = t('login.connect_nostr');
 *   button.textContent = t('greeting', { name: 'Alice' });   // {name} substitution
 *
 * The bundled dictionaries (13 languages of login/wallet/common strings) are
 * imported explicitly below — works in any bundler with resolveJsonModule, no
 * Vite `import.meta.glob`. Add your own app strings two ways:
 *   • edit translations/<code>.json (same keys across languages), or
 *   • call registerDictionary('en', { my_key: 'Hi' }) at runtime (merges in).
 *
 * Missing keys fall back to English; missing languages fall back to English.
 */

type Dict = Record<string, string>;

import ar from './translations/ar.json';
import de from './translations/de.json';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import it from './translations/it.json';
import ja from './translations/ja.json';
import ko from './translations/ko.json';
import nl from './translations/nl.json';
import pt from './translations/pt.json';
import ru from './translations/ru.json';
import zh from './translations/zh.json';

const LANG_KEY = 'nd-user-lang';
const FALLBACK_LANG = 'en';
const LANG_CHANGE_EVENT = 'nd-lang-change';

const dictionaries: Record<string, Dict> = {
  ar, de, en, es, fr, it, ja, ko, nl, pt, ru, zh,
};

/** Merge extra strings into a language dictionary (creates it if new). */
export function registerDictionary(code: string, dict: Dict): void {
  const c = code.slice(0, 2).toLowerCase();
  dictionaries[c] = { ...(dictionaries[c] || {}), ...dict };
}

let currentLang: string = FALLBACK_LANG;

function detectInitialLang(): string {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && dictionaries[stored]) return stored;
  } catch { /* private mode */ }
  const browser = (navigator.language || FALLBACK_LANG).slice(0, 2).toLowerCase();
  return dictionaries[browser] ? browser : FALLBACK_LANG;
}

/**
 * Translate a key in the current language. `{name}` placeholders are substituted
 * from `vars`. Resolution: current lang → English → the key itself (so a missing
 * string shows as a visible marker).
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[currentLang];
  const fallback = dictionaries[FALLBACK_LANG];
  let s = (dict && dict[key]) ?? (fallback && fallback[key]) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

export function getCurrentLang(): string { return currentLang; }

/** Languages that have a dictionary loaded. */
export function availableLangs(): string[] { return Object.keys(dictionaries); }

/**
 * Switch the active UI language. Persists to localStorage and dispatches
 * `nd-lang-change` so listeners can re-render. Unknown languages → English.
 */
export function setLang(lang: string): void {
  const normalized = lang.slice(0, 2).toLowerCase();
  currentLang = dictionaries[normalized] ? normalized : FALLBACK_LANG;
  try { localStorage.setItem(LANG_KEY, currentLang); } catch { /* ignore */ }
  window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(LANG_CHANGE_EVENT, handler);
  return () => window.removeEventListener(LANG_CHANGE_EVENT, handler);
}

currentLang = detectInitialLang();
