/**
 * NIP-46 Remote Signer (Bunker) Login — Raw WebSocket Implementation
 * Uses raw WebSockets instead of SimplePool for reliable relay communication.
 */

// =========================================================================
// NIP-44 ENCRYPTION
// =========================================================================

let _nip44mod = null;

async function _loadNip44() {
    if (_nip44mod) return _nip44mod;
    if (globalThis.__nip44mod) {
        _nip44mod = globalThis.__nip44mod;
        return _nip44mod;
    }
    _nip44mod = await import('nostr-tools/nip44');
    return _nip44mod;
}

async function nip44Encrypt(sk, pk, text) {
    const m = await _loadNip44();
    const ck = m.getConversationKey ? m.getConversationKey(sk, pk) : m.v2.utils.getConversationKey(sk, pk);
    return (m.encrypt || m.v2.encrypt)(text, ck);
}

async function nip44Decrypt(sk, pk, ct) {
    const m = await _loadNip44();
    const ck = m.getConversationKey ? m.getConversationKey(sk, pk) : m.v2.utils.getConversationKey(sk, pk);
    return (m.decrypt || m.v2.decrypt)(ct, ck);
}

// =========================================================================
// UTIL
// =========================================================================

// PROTOCOL CHATTER IS OFF BY DEFAULT (2026-08-07).
//
// This logged the client pubkey, the signer pubkey, the relay set, every
// response id and every session save — forty lines of running commentary on
// who is signed in as whom. None of it is secret (the secrets were taken out
// separately), but a browser console is a shared surface: a screen-share, a
// support screenshot, or someone else's turn at the machine reads it all.
// Real failures still print through console.warn/error; the narration needs
// asking for.
let DEBUG = false;
export function setBunkerDebug(on) { DEBUG = !!on; }
function dlog(...a) { if (DEBUG) console.log(...a); }

function randomHex(n = 16) {
    const a = new Uint8Array(n); crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
function skToHex(sk) { return Array.from(sk).map(b => b.toString(16).padStart(2, '0')).join(''); }
// A KEY IS 64 HEX CHARACTERS OR IT IS NOT A KEY. The old version took whatever
// it was handed: an odd-length string threw a TypeError on the null match, and
// anything non-hex became NaN bytes, which Uint8Array silently writes as zero.
// The input is a saved session blob — corrupted, truncated, or edited — so the
// failure mode was a key quietly made of zeros rather than a clean rejection.
function hexToSk(h) {
    if (typeof h !== 'string' || !/^[0-9a-f]{64}$/i.test(h)) {
        throw new Error('Invalid secret key: expected 64 hex characters');
    }
    return new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));
}

// =========================================================================
// RAW WEBSOCKET RELAY POOL
// =========================================================================

class RawRelayPool {
    constructor() {
        this._sockets = new Map(); // url -> WebSocket
        this._listeners = []; // { subId, filter, onEvent }
        this._queue = new Map(); // url -> messages queued while connecting
    }

    connect(urls) {
        for (const url of urls) {
            if (this._sockets.has(url)) continue;
            this._openSocket(url);
        }
    }

    _openSocket(url) {
        let ws;
        try { ws = new WebSocket(url); } catch(e) { return; }
        this._sockets.set(url, ws);
        this._queue.set(url, []);

        ws.onopen = () => {
            dlog(`[NIP-46 WS] Connected: ${url}`);
            const q = this._queue.get(url) || [];
            this._queue.delete(url);
            let flushed = 0;
            for (const msg of q) {
                try { ws.send(msg); flushed++; } catch(e) {}
            }
            if (flushed > 0) dlog(`[NIP-46 WS] Flushed ${flushed} queued msg(s) to ${url}`);
            for (const { subId, filter } of this._listeners) {
                try { ws.send(JSON.stringify(['REQ', subId, filter])); } catch(e) {}
            }
        };

        ws.onmessage = async (msg) => {
            try {
                const data = JSON.parse(msg.data);
                if (data[0] === 'EVENT' && data[2]) {
                    const ev = data[2];
                    const subId = data[1];
                    dlog(`[NIP-46 WS] EVENT received from ${url} sub=${subId} kind=${ev.kind}`);
                    for (const listener of this._listeners) {
                        if (listener.subId === subId) {
                            listener.onEvent(ev, url);
                        }
                    }
                } else if (data[0] === 'NOTICE') {
                    console.warn(`[NIP-46 WS] NOTICE from ${url}: ${data[1]}`);
                } else if (data[0] === 'OK') {
                    dlog(`[NIP-46 WS] OK from ${url}: id=${data[1]} accepted=${data[2]} msg=${data[3] || ''}`);
                }
            } catch(e) {}
        };

        ws.onerror = () => {};
        ws.onclose = () => { this._sockets.delete(url); };
    }

    subscribe(subId, filter, onEvent) {
        this._listeners.push({ subId, filter, onEvent });
        const msg = JSON.stringify(['REQ', subId, filter]);
        for (const [url, ws] of this._sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                try { ws.send(msg); } catch(e) {}
            } else if (ws.readyState === WebSocket.CONNECTING) {
                const q = this._queue.get(url) || [];
                q.push(msg);
                this._queue.set(url, q);
            }
        }
    }

    unsubscribe(subId) {
        this._listeners = this._listeners.filter(l => l.subId !== subId);
        const msg = JSON.stringify(['CLOSE', subId]);
        for (const [, ws] of this._sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                try { ws.send(msg); } catch(e) {}
            }
        }
    }

    publish(event) {
        const msg = JSON.stringify(['EVENT', event]);
        let sent = 0, queued = 0;
        for (const [url, ws] of this._sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                try { ws.send(msg); sent++; } catch(e) {}
            } else if (ws.readyState === WebSocket.CONNECTING) {
                // Queue for later — without this, publishing before any relay
                // finishes connecting silently drops the message (bunker URL
                // login on mobile would hang waiting for a response that
                // could never come because the request was never sent).
                const q = this._queue.get(url) || [];
                q.push(msg);
                this._queue.set(url, q);
                queued++;
            }
        }
        dlog(`[NIP-46 WS] Published to ${sent} relays, queued for ${queued}`);
    }

    destroy() {
        for (const [, ws] of this._sockets) {
            try { ws.close(); } catch(e) {}
        }
        this._sockets.clear();
        this._listeners = [];
        this._queue.clear();
    }
}

// =========================================================================
// QR RENDERER
// =========================================================================

export async function renderQR(container, data, opts = {}) {
    const max = opts.size || 240;
    container.innerHTML = '';
    try {
        if (!window.qrcode) {
            const mod = await import('qrcode-generator');
            window.qrcode = mod.default || mod;
        }
        const qr = window.qrcode(0, 'L'); qr.addData(data); qr.make();
        const mc = qr.getModuleCount();
        const cs = Math.max(3, Math.min(5, Math.floor(max / mc)));
        const mg = 12, sz = mc * cs + mg * 2;
        const cv = document.createElement('canvas');
        cv.width = sz; cv.height = sz;
        cv.style.width = Math.min(max, sz) + 'px';
        cv.style.height = Math.min(max, sz) + 'px';
        cv.style.borderRadius = '10px';
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz);
        ctx.fillStyle = '#000';
        for (let r = 0; r < mc; r++)
            for (let c = 0; c < mc; c++)
                if (qr.isDark(r, c)) ctx.fillRect(mg + c * cs, mg + r * cs, cs, cs);
        container.appendChild(cv);
    } catch (e) {
        container.textContent = 'QR unavailable — copy the string below';
    }
}

// =========================================================================
// BUNKER CLIENT
// =========================================================================

export class BunkerClient {
    constructor(opts) {
        this.NostrTools = opts.NostrTools;
        this.appName = opts.appName || 'Nostr App';
        this.appUrl = opts.appUrl || '';
        this.perms = opts.perms || '';
        this.relays = opts.relays || ['wss://nos.lol', 'wss://relay.primal.net', 'wss://nostr.mom'];
        this.storageKey = opts.storageKey || null;
        this.sessionMaxAge = opts.sessionMaxAge || 24 * 60 * 60 * 1000;
        this.heartbeatMs = opts.heartbeatMs !== undefined ? opts.heartbeatMs : 30000;
        // Default stays a popup for drop-in use, but only ever reached through
        // _emitAuthUrl's https check — and it asks, because the URL came off a
        // relay and nothing proves who sent it.
        this.onAuthUrl = opts.onAuthUrl || (url => {
            let host = url;
            try { host = new URL(url).host; } catch (e) {}
            if (confirm('Your signer wants to open ' + host + ' to approve this login.\n\nOpen it?')) {
                window.open(url, '_blank', 'width=600,height=700');
            }
        });
        this.onStatusChange = opts.onStatusChange || (() => {});
        this.onDisconnect = opts.onDisconnect || (() => {});

        // Optional nostr-tools SimplePool. When provided, the bunker URL
        // flow uses it (matching the proven Fren-finder pattern) instead of
        // the custom RawRelayPool, which can drop publishes on slow mobile
        // relay connections.
        this._simplePool = opts.simplePool || null;

        // Optional pre-existing clientSk (hex). When provided, connectBunkerUrl
        // reuses this client identity instead of generating a new one — this
        // is what makes "paste the same bunker URL twice" work, because Amber
        // and other signers track sessions by clientPk and reject re-uses of
        // the same secret from a DIFFERENT clientPk with "already connected".
        this._fixedClientSk = opts.clientSkHex
            ? hexToSk(opts.clientSkHex)
            : null;

        this._clientSk = null; this._clientPk = null;
        this._signerPk = null; this._userPk = null;
        this._relays = null;
        this._connecting = false; this._heartbeat = null;
        this._rawPool = null;
        this._urlFlowSub = null;
    }

    get connected() { return !!(this._signerPk && this._userPk); }
    get userPubkey() { return this._userPk; }
    get signerPubkey() { return this._signerPk; }

    // ------------------------------------------------------------------
    // FLOW 1: Client-initiated (nostrconnect://)
    // ------------------------------------------------------------------

    async startClientFlow() {
        if (this._connecting) throw new Error('Already connecting');
        if (this._signerPk) throw new Error('Already connected');
        this._connecting = true;
        this.onStatusChange('waiting', 'Generating connection…');

        const clientSk = this.NostrTools.generateSecretKey();
        const clientPk = this.NostrTools.getPublicKey(clientSk);
        const secret = randomHex(8);
        const relays = this.relays;
        this._clientSk = clientSk; this._clientPk = clientPk; this._relays = relays;

        const rp = relays.map(r => `relay=${encodeURIComponent(r)}`).join('&');
        const parts = [`nostrconnect://${clientPk}?${rp}`, `secret=${secret}`, `name=${encodeURIComponent(this.appName)}`];
        if (this.appUrl) parts.push(`url=${encodeURIComponent(this.appUrl)}`);
        if (this.perms) parts.push(`perms=${encodeURIComponent(this.perms)}`);
        const connectUri = parts.join('&');

        dlog('[NIP-46] Client pubkey:', clientPk);
        dlog('[NIP-46] Connecting to relays:', relays);

        // Open raw WebSocket connections FIRST
        this._rawPool = new RawRelayPool();
        this._rawPool.connect(relays);

        // Wait for connections to establish
        await new Promise(r => setTimeout(r, 800));

        const since = Math.floor(Date.now() / 1000) - 300;
        const subId = 'nip46-connect-' + randomHex(4);
        let settled = false;
        const self = this;

        let resolveFn, rejectFn;
        const waitForConnect = new Promise((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });

        this._rawPool.subscribe(subId, { kinds: [24133], '#p': [clientPk], since }, async (ev, relayUrl) => {
            if (settled) return;
            try {
                const decrypted = await nip44Decrypt(clientSk, ev.pubkey, ev.content);
                const resp = JSON.parse(decrypted);
                // Never log resp wholesale — resp.result IS the secret on success.
                dlog('[NIP-46] Response id:', resp.id, 'relay:', relayUrl);

                if (resp.result === 'auth_url' && resp.error) {
                    self._emitAuthUrl(resp.error);
                    return;
                }
                if (resp.error && resp.result !== 'auth_url') {
                    settled = true; self._connecting = false;
                    self._rawPool.unsubscribe(subId);
                    self.onStatusChange('error', resp.error);
                    rejectFn(new Error(resp.error));
                    return;
                }
                // The secret echo is the ONLY proof the responder saw the
                // out-of-band nostrconnect URI — anyone can encrypt a kind-24133
                // to our published clientPk, so a bare 'ack' proves nothing.
                if (resp.result !== secret) {
                    dlog('[NIP-46] Ignoring response: secret mismatch');
                    return;
                }

                settled = true;
                self._rawPool.unsubscribe(subId);
                self._signerPk = ev.pubkey;
                self.onStatusChange('waiting', 'Fetching identity…');
                dlog('[NIP-46] Signer approved! pubkey:', ev.pubkey);

                try { self._userPk = await self._request('get_public_key'); }
                catch (e) {
                    // Fail closed: adopting ev.pubkey here would report an
                    // unverified (attacker-chosen) identity as "signed in".
                    console.warn('[NIP-46] get_public_key failed:', e?.message || e);
                    self._signerPk = null; self._connecting = false;
                    self.onStatusChange('error', 'Identity fetch failed');
                    rejectFn(new Error('Signer connected but get_public_key failed'));
                    return;
                }

                self._finishConnect();
                resolveFn(self._userPk);
            } catch (e) {
                // decrypt failed — not for us
            }
        });

        this.onStatusChange('waiting', 'Waiting for remote signer…');
        return { connectUri, waitForConnect };
    }

    // ------------------------------------------------------------------
    // FLOW 2: Signer-initiated (bunker://)
    // ------------------------------------------------------------------

    async connectBunkerUrl(bunkerUrl) {
        if (this._connecting) throw new Error('Already connecting');
        if (this._signerPk) throw new Error('Already connected');
        this._connecting = true;
        this.onStatusChange('waiting', 'Connecting…');

        const url = new URL(bunkerUrl);
        if (url.protocol !== 'bunker:') throw new Error('URL must start with bunker://');
        const signerPk = url.hostname || url.pathname.replace(/^\/\//, '');
        if (!signerPk || signerPk.length !== 64) throw new Error('Invalid signer pubkey');
        const relays = url.searchParams.getAll('relay');
        if (!relays.length) throw new Error('No relays in bunker URL');
        const secret = url.searchParams.get('secret') || '';

        // Reuse a saved clientSk if provided (so Amber recognizes us as the
        // same client on re-login); otherwise generate a fresh one.
        const clientSk = this._fixedClientSk
            ? this._fixedClientSk
            : this.NostrTools.generateSecretKey();
        const clientPk = this.NostrTools.getPublicKey(clientSk);
        this._clientSk = clientSk; this._clientPk = clientPk;
        this._signerPk = signerPk; this._relays = relays;
        if (this._fixedClientSk) dlog('[NIP-46] Reusing saved clientSk, clientPk:', clientPk);

        // SimplePool path (preferred when injected) — copies the Fren-finder
        // pattern exactly: await ensureRelay on every relay, then subscribe,
        // then publish. RawRelayPool path below is the legacy fallback.
        if (this._simplePool) {
            dlog('[BUNKER-URL] using SimplePool, signerPk:', signerPk, 'relays:', relays);
            const pool = this._simplePool;

            dlog('[BUNKER-URL] ensuring relays...');
            await Promise.allSettled(relays.map(u => pool.ensureRelay(u).then(
                () => dlog('[BUNKER-URL] relay open:', u),
                (e) => console.warn('[BUNKER-URL] relay failed:', u, e?.message),
            )));

            const since = Math.floor(Date.now() / 1000) - 60;
            // The request id is minted BEFORE the subscription so the handler can
            // insist the response answers THIS connect and not some other traffic
            // on the wire. It never leaves the client in the clear (the payload is
            // nip44-sealed to the signer), so it doubles as a nonce.
            const reqId = randomHex(8);
            return new Promise((resolve, reject) => {
                let settled = false;
                let sub = null;
                const cleanup = () => {
                    if (sub) { try { sub.close(); } catch (e) {} sub = null; }
                    this._urlFlowSub = null;
                    this._cancelReject = null;
                };
                this._cancelReject = (err) => {
                    if (settled) return;
                    settled = true; cleanup();
                    this._connecting = false;
                    reject(err);
                };

                dlog('[BUNKER-URL] subscribing to', relays, 'filter', { kinds: [24133], '#p': [clientPk], since });
                sub = pool.subscribeMany(relays, [{ kinds: [24133], '#p': [clientPk], since }], {
                    onevent: async (ev) => {
                        dlog('[BUNKER-URL] event from', ev.pubkey.slice(0, 16), 'kind', ev.kind);
                        if (settled) return;
                        // ONLY THE SIGNER NAMED IN THE bunker:// URL. Our clientPk is
                        // public and anyone may nip44-encrypt to it, so "it decrypted"
                        // proves the sender chose to talk to us and nothing else. Here
                        // the signer's pubkey came from the URL the user pasted, so the
                        // check is free and the trust anchor is theirs, not a relay's.
                        if (ev.pubkey !== signerPk) return;
                        try {
                            const resp = JSON.parse(await nip44Decrypt(clientSk, ev.pubkey, ev.content));
                            dlog('[BUNKER-URL] response id:', resp.id);
                            if (resp.result === 'auth_url' && resp.error) { this._emitAuthUrl(resp.error); return; }
                            // ...and only an answer to the connect we actually sent.
                            if (resp.id && resp.id !== reqId) return;
                            if (resp.error && resp.result !== 'auth_url') {
                                settled = true; cleanup();
                                this._connecting = false;
                                this.onStatusChange('error', resp.error);
                                reject(new Error(resp.error));
                                return;
                            }
                            settled = true; cleanup();
                            dlog('[BUNKER-URL] connect ack, calling get_public_key');
                            // Fail closed. Falling back to signerPk reports an identity
                            // the signer never confirmed as "signed in" — and a signer
                            // pubkey is not a user pubkey even when the URL is honest.
                            try { this._userPk = await this._request('get_public_key'); }
                            catch (e) {
                                console.warn('[BUNKER-URL] get_public_key failed:', e?.message);
                                this._signerPk = null; this._connecting = false;
                                this.onStatusChange('error', 'Identity fetch failed');
                                reject(new Error('Signer connected but get_public_key failed'));
                                return;
                            }
                            dlog('[BUNKER-URL] connected, userPk:', this._userPk);
                            this._finishConnect();
                            resolve(this._userPk);
                        } catch (e) {
                            console.warn('[BUNKER-URL] decrypt/parse failed (ignoring):', e?.message);
                        }
                    },
                    oneose: () => dlog('[BUNKER-URL] EOSE'),
                });
                this._urlFlowSub = sub;

                (async () => {
                    try {
                        // reqId is the one minted above — the handler matches on it.
                        const payload = JSON.stringify({
                            id: reqId, method: 'connect', params: [signerPk, secret, this.perms],
                        });
                        dlog('[BUNKER-URL] encrypting + publishing connect, reqId:', reqId);
                        const enc = await nip44Encrypt(clientSk, signerPk, payload);
                        const signed = this.NostrTools.finalizeEvent({
                            kind: 24133, created_at: Math.floor(Date.now() / 1000),
                            tags: [['p', signerPk]], content: enc,
                        }, clientSk);
                        const results = await Promise.allSettled(relays.map(async u => {
                            const r = await pool.ensureRelay(u);
                            await r.publish(signed);
                            dlog('[BUNKER-URL] published to:', u);
                        }));
                        const ok = results.filter(r => r.status === 'fulfilled').length;
                        dlog(`[BUNKER-URL] publish summary: ${ok}/${relays.length} relays`);
                        if (ok === 0 && !settled) {
                            settled = true; cleanup();
                            this._connecting = false;
                            reject(new Error('Could not reach any relays in the bunker URL'));
                        }
                    } catch (e) {
                        console.error('[BUNKER-URL] publish error:', e);
                        if (settled) return;
                        settled = true; cleanup();
                        this._connecting = false;
                        reject(e);
                    }
                })();
            });
        }

        // ────────────────────────────────────────────────────────────────
        // Legacy RawRelayPool path (kept for QR flow / fallback)
        // ────────────────────────────────────────────────────────────────
        this._rawPool = new RawRelayPool();
        this._rawPool.connect(relays);

        const since = Math.floor(Date.now() / 1000) - 300;
        const subId = 'nip46-bunker-' + randomHex(4);
        let settled = false;
        // Minted before the subscription for the same reason as the SimplePool
        // path above: the handler has to be able to say "this answers MY connect".
        const reqId = randomHex(8);

        return new Promise((resolve, reject) => {
            this._cancelReject = (err) => {
                if (settled) return;
                settled = true;
                this._cancelReject = null;
                reject(err);
            };
            this._rawPool.subscribe(subId, { kinds: [24133], '#p': [clientPk], since }, async (ev) => {
                if (settled) return;
                if (ev.pubkey !== signerPk) return; // only the signer the user named
                try {
                    const decrypted = await nip44Decrypt(clientSk, ev.pubkey, ev.content);
                    const resp = JSON.parse(decrypted);
                    dlog('[BUNKER-URL] response id:', resp.id);
                    if (resp.result === 'auth_url' && resp.error) { this._emitAuthUrl(resp.error); return; }
                    if (resp.id && resp.id !== reqId) return; // and only our connect
                    if (resp.error && resp.result !== 'auth_url') {
                        settled = true; this._cancelReject = null; this._rawPool.unsubscribe(subId);
                        this._connecting = false;
                        this.onStatusChange('error', resp.error);
                        reject(new Error(resp.error)); return;
                    }
                    settled = true; this._cancelReject = null;
                    this._rawPool.unsubscribe(subId);
                    // Fail closed, same as every other flow.
                    try { this._userPk = await this._request('get_public_key'); }
                    catch (e) {
                        console.warn('[BUNKER-URL] get_public_key failed:', e?.message);
                        this._signerPk = null; this._connecting = false;
                        this.onStatusChange('error', 'Identity fetch failed');
                        reject(new Error('Signer connected but get_public_key failed'));
                        return;
                    }
                    dlog('[BUNKER-URL] Connect complete, userPk:', this._userPk);
                    this._finishConnect();
                    resolve(this._userPk);
                } catch (e) {
                    console.warn('[BUNKER-URL] Decrypt/parse failed for event from', ev.pubkey.slice(0, 16), ':', e?.message);
                }
            });

            nip44Encrypt(clientSk, signerPk, JSON.stringify({
                id: reqId, method: 'connect', params: [signerPk, secret, this.perms]
            })).then(enc => {
                const ev = this.NostrTools.finalizeEvent({
                    kind: 24133, created_at: Math.floor(Date.now() / 1000),
                    tags: [['p', signerPk]], content: enc,
                }, clientSk);
                this._rawPool.publish(ev);
            });
        });
    }

    // ------------------------------------------------------------------
    // SILENT RECONNECT — skip connect RPC, just ping existing session
    // Used when we have a saved clientSk + signerPk + relays from a prior
    // successful login. Amber tracks sessions by clientPk, so as long as
    // the signer app still has the session open, a ping is enough.
    // ------------------------------------------------------------------

    async reconnectSilent(signerPk, clientSkHex, relays, userPk) {
        if (this._connecting) throw new Error('Already connecting');
        if (this._signerPk) throw new Error('Already connected');
        this._connecting = true;
        this.onStatusChange('waiting', 'Reconnecting…');

        this._clientSk = hexToSk(clientSkHex);
        this._clientPk = this.NostrTools.getPublicKey(this._clientSk);
        this._signerPk = signerPk;
        this._relays = relays;
        this._userPk = userPk;

        // Connect raw relay pool (no SimplePool injected in this flow)
        this._rawPool = new RawRelayPool();
        this._rawPool.connect(relays);
        await new Promise(r => setTimeout(r, 800));

        try {
            const pong = await Promise.race([
                this._request('ping'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('ping timeout')), 10000)),
            ]);
            if (pong !== 'pong') throw new Error('unexpected pong: ' + pong);
        } catch (e) {
            this._clientSk = null; this._clientPk = null;
            this._signerPk = null; this._userPk = null; this._relays = null;
            this._connecting = false;
            if (this._rawPool) { this._rawPool.destroy(); this._rawPool = null; }
            throw new Error('Silent reconnect failed: ' + e.message);
        }

        this._finishConnect();
        return this._userPk;
    }

    // ------------------------------------------------------------------
    // POST-CONNECT
    // ------------------------------------------------------------------

    _finishConnect() {
        this._connecting = false;
        this.saveSession();
        this.startHeartbeat();
        this.onStatusChange('connected', 'Signed in');
    }

    // ------------------------------------------------------------------
    // SIGN EVENTS
    // ------------------------------------------------------------------

    async signEvent(tmpl) {
        if (!this.connected) throw new Error('Not connected');
        try {
            const r = await this._request('sign_event', [JSON.stringify({
                kind: tmpl.kind, content: tmpl.content || '', tags: tmpl.tags || [],
                created_at: tmpl.created_at || Math.floor(Date.now() / 1000),
            })]);
            return JSON.parse(r);
        } catch (e) {
            console.warn('[NIP-46] signEvent failed:', e.message);
            // A declined/failed signature must NOT tear down the session — the remote
            // signer is almost always still connected; the user just said no (or
            // ignored) this one request. Previously any failure here called
            // _handleDisconnect(), which nuked the session and left every later
            // sign throwing "Not connected" until a full re-login. Instead verify
            // connectivity with a bounded ping (the same signal the heartbeat trusts):
            // only a ping failure is a real disconnect; otherwise it's a decline and
            // the session stays alive so the user can simply retry.
            let alive = false;
            try {
                const pong = await Promise.race([
                    this._request('ping'),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('ping timeout')), 8000)),
                ]);
                alive = pong === 'pong';
            } catch (_) {}
            if (!alive) { this._handleDisconnect(); throw new Error('Signer disconnected'); }
            throw new Error('Signature declined');
        }
    }

    async ping() { return this._request('ping'); }

    /**
     * NIP-44 encrypt via remote signer (NIP-46 nip44_encrypt method).
     * Not all signers support this — throws the original error on failure.
     */
    async nip44Encrypt(recipientPubkey, plaintext) {
        if (!this.connected) throw new Error('Bunker not connected');
        return this._request('nip44_encrypt', [recipientPubkey, plaintext]);
    }

    /**
     * NIP-44 decrypt via remote signer (NIP-46 nip44_decrypt method).
     * Not all signers support this — throws the original error on failure.
     */
    async nip44Decrypt(senderPubkey, ciphertext) {
        if (!this.connected) throw new Error('Bunker not connected');
        return this._request('nip44_decrypt', [senderPubkey, ciphertext]);
    }

    // ------------------------------------------------------------------
    // auth_url — THE ONE THING A STRANGER CAN MAKE US DO
    // ------------------------------------------------------------------
    //
    // Every other response is gated: the nostrconnect flow wants the secret
    // echoed, the bunker flow wants the pubkey from the URL the user pasted.
    // auth_url is handled BEFORE any of that, and it has to be — a signer sends
    // it to say "the user must approve in a browser first", which by definition
    // arrives before we can verify anything. So anybody who can encrypt to our
    // published clientPk can hand us a URL, and the default handler opened it in
    // a popup. That is a phishing primitive with our own app's login flow as the
    // pretext: the window appears exactly when the user is expecting one.
    //
    // It cannot be authenticated, so it is CONSTRAINED instead: https only (no
    // javascript:, no data:, no blob:), parseable, and length-capped. The
    // consumer still decides whether to open it — the game asks first, naming
    // the host — but nothing that isn't a real https URL gets that far.
    _emitAuthUrl(raw) {
        if (typeof raw !== 'string' || raw.length > 2048) return;
        let u;
        try { u = new URL(raw); } catch (e) { return; }
        if (u.protocol !== 'https:') {
            console.warn('[NIP-46] refusing non-https auth_url:', u.protocol);
            return;
        }
        this.onAuthUrl(u.href);
    }

    // ------------------------------------------------------------------
    // HEARTBEAT
    // ------------------------------------------------------------------

    startHeartbeat() {
        this.stopHeartbeat();
        if (!this.heartbeatMs) return;
        this._heartbeat = setInterval(async () => {
            if (!this.connected) { this.stopHeartbeat(); return; }
            try {
                const pong = await Promise.race([
                    this._request('ping'),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
                ]);
                if (pong === 'pong') dlog('[NIP-46] Heartbeat OK');
                else throw new Error('bad response');
            } catch (e) {
                dlog('[NIP-46] Heartbeat failed:', e.message);
                this._handleDisconnect();
            }
        }, this.heartbeatMs);
    }

    stopHeartbeat() {
        if (this._heartbeat) { clearInterval(this._heartbeat); this._heartbeat = null; }
    }

    _handleDisconnect() {
        this.stopHeartbeat();
        this._signerPk = null; this._userPk = null;
        this._clientSk = null; this._clientPk = null;
        this._relays = null;
        this.clearSession();
        this.onStatusChange('error', 'Signer disconnected');
        this.onDisconnect();
    }

    // ------------------------------------------------------------------
    // SESSION PERSISTENCE
    // ------------------------------------------------------------------

    // WHAT IS IN localStorage, AND WHY IT IS NOT THE nsec.
    //
    // `sk` here is the CLIENT key of the NIP-46 pair — the identity this browser
    // uses to talk to the remote signer. It is not the user's key and it cannot
    // become one: the signer holds that, every signature is the signer's own
    // decision, the permissions we asked for are the narrow pair declared at
    // construction, and the user can revoke this client in their signer app.
    // What it does buy an attacker who reads it is the ability to ASK for those
    // signatures as us until it is revoked or expires.
    //
    // A browser has nowhere confidential to put it. sessionStorage dies with the
    // tab (so every reload re-prompts the signer), IndexedDB is exactly as
    // readable, and a non-extractable CryptoKey can't be used for schnorr here.
    // Anything that can read localStorage is already running as this origin,
    // which is game over regardless. So the mitigations are the only ones that
    // exist: keep the permissions narrow, age the session out (sessionMaxAge),
    // and clear it on logout — all three of which this class does.
    saveSession() {
        if (!this.storageKey || !this._clientSk || !this._signerPk || !this._userPk) return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                sk: skToHex(this._clientSk), pk: this._clientPk,
                signer: this._signerPk, user: this._userPk,
                relays: this._relays, t: Date.now(),
            }));
            dlog('[NIP-46] Session saved');
        } catch (e) {}
    }

    async restoreSession() {
        if (!this.storageKey) return false;
        let d;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;
            d = JSON.parse(raw);
        } catch (e) { return false; }

        if (!d.sk || !d.pk || !d.signer || !d.user || !d.relays?.length) {
            this.clearSession(); return false;
        }
        if (d.t && Date.now() - d.t > this.sessionMaxAge) {
            this.clearSession(); return false;
        }

        dlog('[NIP-46] Restoring session…');
        // A stored blob is not trusted input. hexToSk now refuses anything that
        // isn't 64 hex, so a truncated or edited session must clear itself and
        // send the user back through a real login rather than throw out of here.
        try {
            this._clientSk = hexToSk(d.sk);
        } catch (e) {
            console.warn('[NIP-46] stored session is malformed; clearing');
            this.clearSession(); return false;
        }
        this._clientPk = d.pk;
        this._signerPk = d.signer; this._userPk = d.user; this._relays = d.relays;

        this._rawPool = new RawRelayPool();
        this._rawPool.connect(d.relays);
        await new Promise(r => setTimeout(r, 800));

        try {
            const pong = await Promise.race([
                this._request('ping'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
            ]);
            if (pong !== 'pong') throw new Error('bad pong');
        } catch (e) {
            dlog('[NIP-46] Saved session dead:', e.message);
            this._clientSk = null; this._clientPk = null;
            this._signerPk = null; this._userPk = null; this._relays = null;
            if (this._rawPool) { this._rawPool.destroy(); this._rawPool = null; }
            this.clearSession();
            return false;
        }

        dlog('[NIP-46] Session restored');
        this.startHeartbeat();
        this.onStatusChange('connected', 'Session restored');
        return true;
    }

    clearSession() {
        if (this.storageKey) try { localStorage.removeItem(this.storageKey); } catch (e) {}
    }

    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------

    cancel() {
        this._connecting = false;
        if (this._cancelReject) {
            const r = this._cancelReject; this._cancelReject = null;
            r(new Error('cancelled'));
        }
        if (this._urlFlowSub) { try { this._urlFlowSub.close(); } catch (e) {} this._urlFlowSub = null; }
        if (this._rawPool) { this._rawPool.destroy(); this._rawPool = null; }
        this.onStatusChange('idle', 'Cancelled');
    }

    destroy() {
        this.cancel();
        this.stopHeartbeat();
        this._clientSk = null; this._clientPk = null;
        this._signerPk = null; this._userPk = null; this._relays = null;
        this.clearSession();
        this.onStatusChange('idle', 'Disconnected');
    }

    // ------------------------------------------------------------------
    // INTERNAL — NIP-46 JSON-RPC over raw WebSockets
    // ------------------------------------------------------------------

    async _request(method, params = []) {
        if (!this._signerPk) throw new Error('No signer');
        const { _clientSk: sk, _clientPk: pk, _signerPk: spk, _relays: relays } = this;
        const id = randomHex(8);
        const enc = await nip44Encrypt(sk, spk, JSON.stringify({ id, method, params }));
        const signed = this.NostrTools.finalizeEvent({
            kind: 24133, created_at: Math.floor(Date.now() / 1000),
            tags: [['p', spk]], content: enc,
        }, sk);

        const since = Math.floor(Date.now() / 1000) - 60;

        // SimplePool path (used by URL flow when simplePool injected).
        if (this._simplePool) {
            const pool = this._simplePool;
            return new Promise((resolve, reject) => {
                let done = false;
                let sub = null;
                const to = setTimeout(() => {
                    if (done) return;
                    done = true;
                    if (sub) { try { sub.close(); } catch (e) {} }
                    reject(new Error(`${method} timed out (45s)`));
                }, 45000);

                sub = pool.subscribeMany(relays, [{ kinds: [24133], '#p': [pk], since }], {
                    onevent: async (ev) => {
                        // The id already has to match, and it never travels in the
                        // clear — but the signer is known here, so require it too
                        // rather than resting the whole check on one secret.
                        if (ev.pubkey !== spk) return;
                        try {
                            const r = JSON.parse(await nip44Decrypt(sk, ev.pubkey, ev.content));
                            if (r.id !== id) return;
                            if (r.result === 'auth_url' && r.error) { this._emitAuthUrl(r.error); return; }
                            if (done) return;
                            done = true; clearTimeout(to);
                            if (sub) { try { sub.close(); } catch (e) {} }
                            r.error ? reject(new Error(r.error)) : resolve(r.result);
                        } catch (e) {}
                    },
                });

                Promise.allSettled(relays.map(async u => {
                    try { (await pool.ensureRelay(u)).publish(signed); } catch (e) {}
                }));
            });
        }

        // RawRelayPool fallback (QR / legacy flows).
        const subId = 'nip46-req-' + id;
        return new Promise((resolve, reject) => {
            let done = false;
            const to = setTimeout(() => {
                if (!done) {
                    done = true;
                    if (this._rawPool) this._rawPool.unsubscribe(subId);
                    reject(new Error(`${method} timed out (45s)`));
                }
            }, 45000);

            if (this._rawPool) {
                this._rawPool.subscribe(subId, { kinds: [24133], '#p': [pk], since }, async (ev) => {
                    if (ev.pubkey !== spk) return; // same law as the SimplePool path
                    try {
                        const r = JSON.parse(await nip44Decrypt(sk, ev.pubkey, ev.content));
                        if (r.id !== id) return;
                        if (r.result === 'auth_url' && r.error) { this._emitAuthUrl(r.error); return; }
                        if (done) return;
                        done = true; clearTimeout(to);
                        if (this._rawPool) this._rawPool.unsubscribe(subId);
                        r.error ? reject(new Error(r.error)) : resolve(r.result);
                    } catch (e) {}
                });
            }

            if (this._rawPool) this._rawPool.publish(signed);
        });
    }
}