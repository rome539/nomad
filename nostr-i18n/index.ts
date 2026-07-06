// nostr-i18n — tiny UI translation + optional live chat/DM translation. Copy-in.
//
//   import { t, setLang } from './nostr-i18n';
//   label.textContent = t('login.connect_nostr');
//
// Two independent pieces:
//   • i18n.ts       — static UI strings (13 bundled languages, English fallback)
//   • translator.ts — translate arbitrary user text (Chrome on-device + proxy fallback)
//
// See README.md.

export {
  t,
  setLang,
  getCurrentLang,
  availableLangs,
  onLangChange,
  registerDictionary,
} from './i18n';

export {
  isTranslatorSupported,
  getUserLang,
  setUserLang,
  maybeTranslate,
  setTranslateEndpoint,
} from './translator';
export type { TranslationResult } from './translator';
