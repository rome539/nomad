// Exercise the actual served client with a clock and sockets that never emit close.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { parse } from 'acorn';
const source = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
const module = { exports: {} };
vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, { module, exports: module.exports });
const js = module.exports.PAGE.split('<script type="module">')[1].split('</script>')[0];
const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
const fn = name => { const n = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); return js.slice(n.start, n.end); };
function setup() {
  let now = 100000, id = 0;
  const timers = new Map(), sockets = [], lines = [];
  const c = {
    Date: { now: () => now }, setTimeout: (f, ms) => { timers.set(++id, { f, ms }); return id; },
    clearTimeout: i => timers.delete(i), setInterval: f => { c.beat = f; return 999; }, clearInterval() {},
    identityEpoch: 0, crossed: true, stilled: false, connecting: false, ws: null,
    sessionToken: 'synthetic', method: 'guest', retryMs: 1000, openedAt: 0, lastDialAt: 0,
    pongTimer: null, probeWire: null, pendingLookAt: 0, hbTimer: null, frayTimer: null, frayTold: false,
    failedOpens: 0, freshLoad: true, dialAttempt: 0, pageId: 'test', CONNECT_STALL_MS: 10000, FRAY_QUIET_MS: 3000,
    location: { protocol: 'https:', host: 'test.invalid' }, print: t => lines.push(t),
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ticket: 'synthetic' }) }),
    history: [], localCmd: () => false, queuePrivateTell: () => false, isSpeech: () => false, guideNotice() {},
    WebSocket: class { constructor() { this.readyState = 0; this.sent = []; sockets.push(this); } send(s) { this.sent.push(s); } close() { this.readyState = 2; } },
  };
  for (const name of ['closeBench', 'closeTrade', 'closeMap', 'closeJournal', 'closeForge', 'closeBounty', 'closeSwap']) c[name] = () => {};
  vm.createContext(c);
  vm.runInContext(['connect', 'scheduleRetry', 'wakeReconnect', 'sendCmd'].map(fn).join('\n'), c);
  return { c, timers, sockets, lines, advance: ms => { now += ms; }, fire(i) { const t = timers.get(i); assert.ok(t); timers.delete(i); t.f(); }, async open() { await c.connect(); const s = c.ws; s.readyState = 1; s.onopen(); return s; } };
}
{
  const g = setup(), s = await g.open();
  g.c.beat(); assert.deepEqual(s.sent, ['ping']);
  const deadline = g.c.pongTimer;
  s.onmessage({ data: 'pong' }); assert.equal(g.c.pongTimer, null); assert.equal(g.timers.has(deadline), false);
  g.c.beat(); const oldDeadline = g.c.pongTimer;
  g.c.wakeReconnect(); assert.equal(g.timers.has(oldDeadline), false); assert.notEqual(g.c.pongTimer, oldDeadline);
  g.advance(11000); g.fire(g.c.pongTimer);
  assert.equal(g.c.ws, null); assert.equal(s.readyState, 2);
  assert.ok([...g.timers.values()].some(t => t.ms === 300), 'retries without a close event');
  const replacement = await g.open();
  s.onclose({ code: 1000, reason: 'reconnected' });
  s.onmessage({ data: 'pong' });
  assert.equal(g.c.ws, replacement); assert.equal(g.c.stilled, false);
  g.c.beat(); assert.ok(g.c.pongTimer);
  s.onmessage({ data: 'pong' }); assert.ok(g.c.pongTimer, 'stale pong cannot acknowledge new socket');
}
{
  const g = setup(); g.c.connecting = true; // authentication still pending
  g.c.sendCmd('look'); g.c.sendCmd('l'); g.c.sendCmd('look'); g.c.sendCmd('go north');
  assert.equal(g.lines.filter(l => l.includes('looking when')).length, 1);
  g.c.connecting = false;
  const s = await g.open();
  assert.deepEqual(s.sent.map(JSON.parse), [{ v: 0, t: 'cmd', text: 'look' }]);
  assert.equal(g.c.pendingLookAt, 0);
}
{
  const g = setup(); const old = await g.open(); g.advance(6000);
  old.readyState = 3; old.onclose({ code: 1006, reason: '' });
  g.c.connecting = true;
  g.c.sendCmd('look'); g.c.sendCmd('look'); g.c.sendCmd('look');
  g.fire(g.c.frayTimer); assert.ok(g.lines.some(l => l.includes('(1006)')));
  g.c.connecting = false; const next = await g.open();
  assert.equal(next.sent.length, 1); assert.equal(JSON.parse(next.sent[0]).text, 'look');
  assert.ok(g.lines.some(l => l.includes('you are back')));
}
{
  const g = setup(); g.c.pendingLookAt = 1;
  const s = await g.open(); assert.deepEqual(s.sent, [], 'expired look is discarded');
  g.c.pendingLookAt = 100000;
  s.onclose({ code: 1000, reason: 'reconnected' });
  assert.equal(g.c.pendingLookAt, 0); g.c.wakeReconnect(); assert.equal(g.sockets.length, 1);
}
{
  const g = setup(); const s = await g.open();
  g.c.pendingLookAt = 100000; g.c.beat();
  Object.assign(g.c, { pendingTells: new Map(), hpEl: {}, renderFx() {}, idpanel: { classList: { contains: () => false } } });
  vm.runInContext(fn('reconnect'), g.c);
  g.c.reconnect(); assert.equal(g.c.pendingLookAt, 0); assert.equal(g.c.pongTimer, null); assert.equal(g.c.identityEpoch, 1);
  s.onclose({ code: 1000, reason: 'reconnected' }); assert.equal(g.c.stilled, false);
}
console.log('PASS: pong deadlines, wake probes, recovery without close events, stale socket isolation, look coalescing/expiry, displacement and identity reset.');
