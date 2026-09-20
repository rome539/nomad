// Render the actual tutorial with isolated storage and no live game/provider traffic.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {transform} from 'esbuild';
import {createRequire} from 'node:module';
const requireCapture=createRequire(new URL('../../promo/capture/package.json',import.meta.url));
const {default:puppeteer}=await import(requireCapture.resolve('puppeteer-core'));
const {code}=await transform(fs.readFileSync(new URL('../src/public.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {PAGE}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const hook=`window.practice={crossThreshold,sendCmd,guideStart,guideOff,connect,wakeReconnect,at:()=>guideAt,wire:[],disconnect(){ws=null;},live(){ws={readyState:1,send:m=>this.wire.push(m)};},print};`;
const html=PAGE.replace('</script>\n</body>',hook+'</script>\n</body>');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 for(const [width,height] of [[390,844],[844,390],[1440,900]]) {
  const context=await browser.createBrowserContext();
  const page=await context.newPage();let auth=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height});
  await page.setRequestInterception(true);
  page.on('request',r=>{
   const u=new URL(r.url());if(u.protocol==='data:')return r.continue();
   if(u.hostname!=='nomad.test')return r.abort();
   if(u.pathname==='/')return r.respond({contentType:'text/html',body:html});
   if(u.pathname.startsWith('/auth/')){auth++;return r.respond({status:503,body:'test'});}
   const bundles={'/nostr.js':'nostr-bundle.js','/qrcode.js':'qrcode-bundle.js','/vault.js':'vault-bundle.js'};
   if(bundles[u.pathname])return r.respond({contentType:'application/javascript',body:fs.readFileSync(new URL('../src/'+bundles[u.pathname],import.meta.url))});
   return r.respond({contentType:'application/json',body:'{}'});
  });
  await page.evaluateOnNewDocument(()=>localStorage.setItem('nomad_sound','off'));
  await page.goto('http://nomad.test');await page.waitForFunction(()=>window.practice);
  await page.evaluate(async()=>{practice.crossThreshold();await practice.connect();practice.wakeReconnect();});
  assert.equal(auth,0,'first-time practice never authenticates into the live world');
  await page.evaluate(()=>practice.live());
  for(const command of ['look','go north','go north','attack keeper','inventory','stance guarded','keys'])await page.evaluate(c=>practice.sendCmd(c),command);
  const result=await page.evaluate(()=>{
   const log=document.getElementById('log');
   document.getElementById('idpanel').classList.remove('open');
   log.scrollTop=0;
   const first=Array.from(log.children).find(e=>e.textContent.includes('THE FIRST WALK'));
   practice.print('hidden live room response','head');
   return {at:practice.at(),wire:practice.wire,scroll:log.scrollTop,overflow:log.scrollHeight>log.clientHeight,firstVisible:first.getBoundingClientRect().bottom>log.getBoundingClientRect().top,lessons:Array.from(log.children).filter(e=>e.classList.contains('guide-step')).map(e=>e.textContent),hidden:getComputedStyle(log.lastElementChild).display};
  });
  assert.equal(result.at,6);assert.deepEqual(result.wire,[],'no practice actions reach an already connected socket');
  assert(result.overflow);assert(result.firstVisible);assert.equal(result.scroll,0,'hidden output must not pull the reader away');assert.equal(result.hidden,'none');
  for(const title of ['THE FIRST WALK','lesson 2/5','lesson 3/5','lesson 4/5','lesson 5/5','THE DOOR IS YOURS'])assert(result.lessons.some(t=>t.includes(title)),title);
  await page.evaluate(()=>Array.from(document.querySelectorAll('button.guide-step')).find(e=>e.textContent==='Enter the dungeon').click());
  assert.deepEqual(await page.evaluate(()=>practice.wire.map(x=>JSON.parse(x).text)),['look'],'finishing restores live commands');
  await page.evaluate(()=>{practice.guideStart();practice.disconnect();practice.guideOff();});
  await page.waitForFunction(()=>document.getElementById('log').textContent.includes('reconnecting'));
  await new Promise(resolve=>setTimeout(resolve,150));
  assert.equal(auth,1,'skipping a fresh walkthrough starts the real connection');
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('PASS tutorial browser: three screen sizes, scrollback, isolated commands, no initial login, finish restores live play');
} finally {await browser.close();}
