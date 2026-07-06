# nostr-i18n

Two small, framework-agnostic translation tools. Copy this folder in. **Zero
dependencies** (browser APIs only). No Vite `import.meta.glob` — dictionaries are
imported explicitly, so it works in any bundler.

## 1. `t()` — static UI strings

13 bundled languages (ar, de, en, es, fr, it, ja, ko, nl, pt, ru, zh) with English
fallback. The bundled strings are the login/wallet/common set from the source app —
a head start; prune or replace with your own.

```ts
import { t, setLang, onLangChange, registerDictionary } from './nostr-i18n';

t('login.connect_nostr');                 // current language
t('greeting', { name: 'Alice' });         // {name} placeholder substitution

setLang('es');                            // persists to localStorage, fires change
onLangChange(() => rerenderUI());         // returns an unsubscribe fn

// Add your app's own strings (merges into the language):
registerDictionary('en', { catch_fish: 'Catch!', pond: 'Pond' });
registerDictionary('es', { catch_fish: '¡Pesca!', pond: 'Estanque' });
```

Add a whole language: drop `translations/<code>.json`, then add one `import` + one
map entry in `i18n.ts` (or just use `registerDictionary` at runtime).

Resolution order: current language → English → the key itself (missing strings show
up as visible markers, not blanks).

## 2. `maybeTranslate()` — live user-text translation

Translates arbitrary text (chat, DMs, bios) into the user's language:
1. **Chrome on-device** `Translator`/`LanguageDetector` — free, private, zero setup.
2. **Remote proxy fallback** for other browsers — off by default.

```ts
import { maybeTranslate, isTranslatorSupported, setTranslateEndpoint } from './nostr-i18n';

const res = await maybeTranslate('hola mundo');
// → { text, detectedLang, ... } if translated
// → null if already in the user's language / unsupported
```

**Chrome works out of the box.** For non-Chrome coverage you must host a proxy
(browsers can't call translation APIs directly — CORS) and point at it:

```ts
setTranslateEndpoint('/api/translate');   // your server-side proxy (default path)
```

Without a proxy, non-Chrome browsers just skip translation — the app still works.

## Files

```
i18n.ts               static UI strings (t / setLang / registerDictionary)
translator.ts         live text translation (Chrome on-device + proxy fallback)
translations/*.json   13 bundled language packs
index.ts              barrel
```

## tsconfig

Needs JSON imports enabled:

```json
{ "compilerOptions": { "resolveJsonModule": true, "esModuleInterop": true } }
```
