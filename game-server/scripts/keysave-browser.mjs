// Runs inside the isolated Worker/D1 browser suite, with a fresh profile per recovery.
import assert from 'node:assert/strict';

export async function checkKeySaveBrowser(browser, origin, db) {
  const contexts = [];
  async function fresh() {
    const context = await browser.createBrowserContext();
    contexts.push(context);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      return url.startsWith(origin + '/') || /^(data|blob):/.test(url) ? request.continue() : request.abort();
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('nomad_guided', '1');
      const NativeSocket = WebSocket;
      window.WebSocket = class extends NativeSocket {
        constructor(url, ...args) {
          if (new URL(url).host !== location.host) throw Error('External sockets disabled');
          super(url, ...args);
          window.testGameSocket = this;
          this.addEventListener('message', event => {
            const frame = JSON.parse(event.data);
            if (frame.t === 'status') window.testPlayerName = frame.name;
          });
        }
      };
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    return page;
  }
  const hasText = (page, selector, text) => page.waitForFunction(
    (s, t) => document.querySelector(s)?.textContent.includes(t), {}, selector, text);
  async function prompt(page, title, value) {
    await page.waitForSelector('#vmodal.open', { visible: true });
    await hasText(page, '#vmtitle', title);
    if (value !== undefined) await page.type('#vminput', value);
    await page.click('#vmok');
  }
  async function panel(page) {
    await page.click('#idbtn');
    await page.waitForSelector('#idpanel.open', { visible: true });
  }
  async function save(page, password, replacing) {
    await page.click('#idnsave');
    await prompt(page, replacing ? 'is already saved' : 'A password for', password);
    await prompt(page, 'once more', password);
    await hasText(page, '#log', replacing ? 'password changed' : 'saved. If this browser');
  }
  async function open(page, name, password) {
    await page.click('#thr-back');
    await prompt(page, 'wanderer', name);
    await prompt(page, 'password for', password);
  }
  async function player(page, name) {
    await page.waitForFunction(n => window.testPlayerName === n, {}, name);
    await panel(page);
    return page.$eval('#idnpub', el => el.getAttribute('data-npub'));
  }
  try {
    const firstPassword = crypto.randomUUID(), secondPassword = crypto.randomUUID();
    const original = await fresh();
    await original.click('#thr-enter');
    // A browser with no key is asked who it is (2026-11-18): a new wanderer the
    // dungeon names, and no password yet.
    const typed = async (page, text) => { await page.focus('#cmd'); if (text) await page.type('#cmd', text); await page.keyboard.press('Enter'); };
    await hasText(original, '#log', 'By what name are you known');
    await typed(original, 'new');
    await hasText(original, '#log', 'What shall the dungeon call you');
    await typed(original, '');
    await original.waitForFunction(() => document.getElementById('cmd').type === 'password');
    await typed(original, 'skip'); // this browser has walked before (nomad_guided), so it steps straight in
    await original.waitForFunction(() => !!window.testPlayerName);
    const name = await original.evaluate(() => window.testPlayerName);
    const pub = await player(original, name);
    assert.ok(pub?.startsWith('npub1'));
    await save(original, firstPassword);
    const row = await db.prepare('SELECT pubkey, minted FROM key_saves').first();
    assert.equal(row.minted, 1);
    const restored = await fresh();
    await open(restored, name, firstPassword);
    assert.equal(await player(restored, name), pub);
    await hasText(restored, '#idnsave', 'change the password');
    await save(restored, secondPassword, true);
    const next = await fresh();
    await open(next, name, firstPassword);
    await hasText(next, '#thr-backmsg', 'open nothing');
    await open(next, name, secondPassword);
    assert.equal(await player(next, name), pub);
    await next.waitForSelector('#idnremove', { visible: true });
    await next.click('#idnremove');
    await next.waitForSelector('#vmodal.open');
    await next.click('#vmcancel');
    assert.ok(await db.prepare('SELECT pubkey FROM key_saves').first());
    await panel(next);
    await next.waitForSelector('#idnremove', { visible: true });
    await next.click('#idnremove');
    await prompt(next, 'Remove');
    await hasText(next, '#log', 'save is gone');
    assert.equal(await db.prepare('SELECT pubkey FROM key_saves').first(), null);
    // Deliver the normal banking notification and check the rendered reminder.
    await next.evaluate(() => window.testGameSocket.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ v: 0, t: 'kept' })
    })));
    await hasText(next, '#log', 'you have something to lose');
    const removed = await fresh();
    await open(removed, name, secondPassword);
    await hasText(removed, '#thr-backmsg', 'open nothing');
    console.log('PASS: browser save, recovery, password change, canceled and confirmed removal, and backup reminder.');

    // Simulate the pre-migration default on an otherwise valid encrypted backup.
    await panel(next);
    await save(next, firstPassword);
    await db.prepare('UPDATE key_saves SET minted = 0 WHERE pubkey = ?').bind(row.pubkey).run();
    const legacy = await fresh();
    await open(legacy, name, firstPassword);
    assert.equal(await player(legacy, name), pub);
    await legacy.waitForSelector('#idnremove', { visible: true });
    assert.equal(await legacy.$eval('#idnsave', el => el.getClientRects().length), 0);
    await legacy.click('#idnremove');
    await prompt(legacy, 'Remove');
    await hasText(legacy, '#log', 'save is gone');
    console.log('PASS: legacy backup restores and can be removed without classifying the recovered key as game-generated.');
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
}
