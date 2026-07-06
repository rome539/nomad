// Google Picker — lets the user select one file from their Drive so we can
// import a portable, cross-app key backup (a JSON file another Nostr app wrote to
// their visible My Drive — any filename; the importer validates by decryption,
// not by name). Used only for cross-app recovery; the normal login path (hidden
// app-data folder) never needs it.
//
// Requires a Google API key with the Picker API (VITE_GOOGLE_PICKER_API_KEY),
// separate from the OAuth client id. The key is inlined into the client bundle
// at build time and is not a secret (restrict it to the Picker API + referrer).

import { getNostrAuthConfig } from './config';

const GAPI_SRC = 'https://apis.google.com/js/api.js';

// The Picker renders its dialog at z-index ~1001, but our login screen sits at
// 9999 — so without this the picker opens *behind* the login overlay and looks
// like "nothing happened." Lift the picker above everything, once.
function ensurePickerOnTop(): void {
  if (document.getElementById('nd-picker-zfix')) return;
  const s = document.createElement('style');
  s.id = 'nd-picker-zfix';
  s.textContent = '.picker-dialog{z-index:2000000000 !important}.picker-dialog-bg{z-index:1999999999 !important}';
  document.head.appendChild(s);
}

/** True when a Picker API key has been provided via configureNostrAuth(). */
export function isPickerConfigured(): boolean {
  return !!getNostrAuthConfig().googlePickerApiKey;
}

function apiKey(): string {
  const k = getNostrAuthConfig().googlePickerApiKey;
  if (!k) throw new Error('Drive file picker is unavailable — call configureNostrAuth({ googlePickerApiKey }) first.');
  return k;
}

let gapiLoading: Promise<void> | null = null;

/** Inject api.js once and load its 'picker' module so `google.picker` exists. */
function loadPicker(): Promise<void> {
  if ((window as any).google?.picker) return Promise.resolve();
  if (gapiLoading) return gapiLoading;
  gapiLoading = new Promise<void>((resolve, reject) => {
    const finish = () => {
      const gapi = (window as any).gapi;
      if (!gapi) { reject(new Error('Failed to load Google API')); return; }
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('Failed to load Google Picker')),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GAPI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () => reject(new Error('Failed to load Google API')));
      return;
    }
    const s = document.createElement('script');
    s.src = GAPI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = finish;
    s.onerror = () => reject(new Error('Failed to load Google API'));
    document.head.appendChild(s);
  });
  return gapiLoading;
}

/**
 * Open the Google Picker and resolve with the chosen file's id, or null if the
 * user cancels. `accessToken` must carry a Drive scope (`drive.file`); picking a
 * file grants the app per-file access to it, so it can then be downloaded.
 */
export async function pickDriveFile(accessToken: string): Promise<string | null> {
  const key = apiKey();
  await loadPicker();
  ensurePickerOnTop();
  const google = (window as any).google;
  // Under `drive.file`, picking a file grants THIS app access to it — but only
  // when the Picker knows which app: without setAppId(project number) the grant
  // never registers and the later files.get 404s. The project number is the
  // numeric prefix of the OAuth client id (client id + Picker key must belong
  // to the same Cloud project, so deriving it is always safe).
  const appId = (getNostrAuthConfig().googleClientId || '').split('-')[0];
  return new Promise<string | null>((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMode(google.picker.DocsViewMode.LIST)
      .setMimeTypes('application/json');
    let builder = new google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(key)
      .addView(view);
    if (appId) builder = builder.setAppId(appId);
    const picker = builder
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(data.docs?.[0]?.id ?? null);
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
