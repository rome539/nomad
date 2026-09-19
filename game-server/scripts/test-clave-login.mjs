// Local browser UI test: synthetic signer only, no relays or real identities.
// Node 22+, promo/capture dependencies, and CHROME_PATH (or macOS Chrome).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { parse } from 'acorn';
const requireCapture=createRequire(new URL('../../promo/capture/package.json',import.meta.url));
const {default:puppeteer}=await import(requireCapture.resolve('puppeteer-core'));
const {code}=await transform(fs.readFileSync(new URL('../src/public.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {PAGE}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const js=PAGE.split('<script type="module">')[1].split('</script>')[0];
const ast=parse(js,{ecmaVersion:'latest',sourceType:'module'});
const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n);return js.slice(n.start,n.end)};
const relayDecl=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name==='BUNKER_RELAYS');
const relays=relayDecl.declarations[0].init.elements.map(e=>e.value);
assert(relays.includes('wss://relay.powr.build'));
const fixture=PAGE.replace(' autofocus','').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')+`<script>
var log=document.getElementById('log'), identityChoice=0,pendingBunker=null,pendingSignerCard=null,bunkerClient=null,method='guest';
var clients=[],writes=[],adoptions=[],reconnects=0;
let localStorage={setItem:function(k,v){writes.push([k,v])}};
var nip19={npubEncode:function(pk){return 'npub-'+pk}};
function print(){} function burnPocketIfGraduated(pk){adoptions.push(pk)} function reconnect(){reconnects++}
async function makeBunkerClient(){
 var c={resumes:0,saveSession:function(){this.saved=true},resumeConnection:function(){this.resumes++},cancel:function(){this.cancelled=true;this.reject?.(new Error('cancelled'))}};
 c.startClientFlow=async function(){return {connectUri:'nostrconnect://'+'1'.repeat(64)+'?relay=wss%3A%2F%2Frelay.powr.build&secret=synthetic'+clients.length+'&name=NOMAD',waitForConnect:new Promise((resolve,reject)=>{c.resolve=resolve;c.reject=reject})}};
 clients.push(c);return c;
}
${fn('cancelPendingBunker')}
${fn('connectSignerApp')}
</script>`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.setContent(fixture);
 await page.evaluate(()=>{window.loginPromise=connectSignerApp()});
 await page.waitForSelector('.signer-connect a');
 const first=await page.$eval('.signer-connect a',a=>({href:a.href,target:a.target,label:a.textContent}));
 assert.equal(first.target,'_self');assert.equal(first.label,'Connect with Clave');
 const link=new URL(first.href);assert.equal(link.origin,'https://clave.casa');assert.equal(link.pathname,'/connect/');
 const uri=await page.$eval('.signer-connect textarea',e=>e.value);assert.equal(link.searchParams.get('uri'),uri);
 await page.evaluate(()=>connectSignerApp());
 assert.equal(await page.evaluate(()=>clients.length),1,'retry retains same client');
 assert.equal(await page.$eval('.signer-connect a',e=>e.href),first.href,'retry retains same secret');
 await page.evaluate(()=>{document.querySelector('.signer-connect a').addEventListener('click',e=>e.preventDefault());document.querySelector('.signer-connect a').click()});
 assert.equal(await page.evaluate(()=>clients[0].resumes),2);
 await page.evaluate(()=>{cancelPendingBunker();clients[0].resolve('abandoned')});
 await page.evaluate(()=>window.loginPromise);
 assert.deepEqual(await page.evaluate(()=>adoptions),[]);assert.equal(await page.$('.signer-connect'),null);
 await page.evaluate(()=>{window.loginPromise=connectSignerApp()});await page.waitForSelector('.signer-connect a');
 assert.notEqual(await page.$eval('.signer-connect a',e=>e.href),first.href,'new attempt after cancellation');
 const cardWidth=await page.$eval('.signer-connect',e=>({width:e.clientWidth,scroll:e.scrollWidth}));
 assert(cardWidth.scroll<=cardWidth.width+1,'phone card fits');
 await page.evaluate(()=>clients[1].resolve('approved'));
 await page.evaluate(()=>window.loginPromise);
 assert.deepEqual(await page.evaluate(()=>adoptions),['approved']);
 assert.equal(await page.evaluate(()=>method),'bunker');assert.equal(await page.evaluate(()=>clients[1].saved),true);
 assert.equal(await page.evaluate(()=>reconnects),1);assert.equal(await page.$('.signer-connect'),null);
 assert.deepEqual(errors,[]);
 console.log('PASS Clave URL encoding, wake relay, same-tab link, retry identity, cancellation, adoption, and phone layout');
}finally{await browser.close()}
