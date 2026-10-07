// Full client in a local intercepted browser, real bundled art, no game account or relay.
// Node 22+, promo/capture dependencies, CHROME_PATH or macOS Chrome.
import fs from 'node:fs';
import path from 'node:path';
import {transform} from 'esbuild';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const requireCapture=createRequire(new URL('../../promo/capture/package.json',import.meta.url));
const {default:puppeteer}=await import(requireCapture.resolve('puppeteer-core'));
const root=fileURLToPath(new URL('..',import.meta.url));
const {code}=await transform(fs.readFileSync(root+'/src/public.ts','utf8'),{loader:'ts',format:'esm'});
const {PAGE}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const hook=`window.demo={grantArt,setView,setLogBig,fitPicture,paintScene,updateMobs,renderChips,view:()=>viewMode,painted:()=>scenePainted,cacheSize:()=>readySceneImage.cache?.size||0,
 fxState:()=>({name:fxName,ready:fxReady,seq:fxSeq}),
 controlFx:()=>{
  const load=fxLoad;window.fxStops=new Map();
  window.holdFx=key=>{const h={calls:0};h.promise=new Promise((resolve,reject)=>{h.release=resolve;h.fail=reject;});fxStops.set(key,h);return h;};
  fxLoad=src=>{const found=[...fxStops].find(([key])=>src.includes(key));if(!found)return load(src);const h=found[1];h.calls++;return h.promise.then(()=>load(src));};
 }
};`;
const pageHTML=PAGE.replace(/<script src="https:\/\/accounts.google.com[^>]*><\/script>/,'').replace('</script>\n</body>',hook+'</script>\n</body>');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setRequestInterception(true);
 page.on('request',async r=>{
  const u=new URL(r.url());if(u.protocol==='data:')return r.continue();
  if(u.hostname!=='nomad.test')return r.abort();
  if(u.pathname==='/')return r.respond({contentType:'text/html',body:pageHTML});
  if(['/world','/world.json','/manifest.json'].includes(u.pathname))return r.respond({contentType:'application/json',body:'{}'});
  const files={'/nostr.js':'src/nostr-bundle.js','/qrcode.js':'src/qrcode-bundle.js'};
  const f=path.join(root,files[u.pathname]||'public'+u.pathname);
  if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.respond({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.webp')?'image/webp':'application/octet-stream',body:fs.readFileSync(f)});
  missing.push(u.pathname);r.respond({status:404,body:''});
 });
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.goto('http://nomad.test');
 await page.waitForFunction(()=>window.demo);
 // Access remains server-granted; a saved preference alone cannot enable art.
 assert.equal(await page.$('#viewbtn'),null);
 await page.evaluate(()=>{document.getElementById('threshold').remove();demo.grantArt();demo.renderChips(['go north','go west','attack hill-wolf','inventory','map'],true);demo.paintScene('mountain','day','hillside','The hillside',false,1,'',0,0);demo.updateMobs(['hill-wolf'],null,['red-hind']);});
 await new Promise(r=>setTimeout(r,400));
 assert.equal(await page.evaluate(()=>demo.view()),'text');
 await page.tap('#brand');await page.tap('#viewbtn');
 await page.waitForFunction(()=>demo.painted() && document.querySelectorAll('#mobs .mob').length===2);
 assert.equal(await page.evaluate(()=>demo.view()),'image');
 assert.equal(await page.$eval('#setpanel',e=>e.classList.contains('open')),false,'phone switch reveals the room');
 assert.equal(await page.$eval('#viewbtn',e=>e.getAttribute('aria-checked')),'true');
 assert.equal(await page.evaluate(()=>localStorage.getItem('nomad_view')),'image');
 assert.equal(await page.$eval('#mobs .dead',e=>e.style.backgroundImage.includes('red-hind')),true);
 const geom=()=>page.evaluate(()=>{const s=document.getElementById('scene'),m=document.querySelector('#mobs .mob'),l=document.getElementById('log');return {scene:s.getBoundingClientRect().toJSON(),mob:m.getBoundingClientRect().toJSON(),log:l.getBoundingClientRect().toJSON(),margin:parseFloat(getComputedStyle(l).marginTop)||0}});
 for(const [width,height] of [[390,844],[844,390],[390,664],[320,568]]){
  await page.setViewport({width,height,isMobile:true,hasTouch:true});
  for(const expanded of [false,true]){
   await page.evaluate(v=>demo.setLogBig(v),expanded);await new Promise(r=>setTimeout(r,500));
   const g=await geom();
   assert(g.scene.height>80,JSON.stringify(g));
   assert(Math.abs(g.scene.bottom-(g.log.top-Math.min(0,g.margin)))<2,'picture fits collapsed footprint: '+JSON.stringify(g));
   assert(g.mob.height>15&&g.mob.bottom<=g.scene.bottom+1,'sprite remains inside room: '+JSON.stringify(g));
  }
  console.log('PASS image scene/sprites, expanded log and rotation',width,height);
 }
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.evaluate(()=>demo.setLogBig(false));await new Promise(r=>setTimeout(r,500));
 await page.tap('#brand');await page.tap('#viewbtn');
 assert.equal(await page.evaluate(()=>demo.view()),'text');
 await page.tap('#brand');await page.tap('#viewbtn');
 assert.equal(await page.evaluate(()=>demo.view()),'image');
 assert.equal(await page.$$eval('#mobs .mob',els=>els.length),2,'switch restores without another status');
 if(process.env.IMAGE_SCREENSHOT) await page.screenshot({path:process.env.IMAGE_SCREENSHOT});
 await page.evaluate(()=>demo.updateMobs([],null,[]));
 await page.tap('#brand');await page.tap('#viewbtn');await page.tap('#brand');await page.tap('#viewbtn');
 assert.equal(await page.$$eval('#mobs .mob',els=>els.length),0,'empty status replaces cached creatures');
 // Exercise the full served client with decode deliberately held back. A
 // downloaded file is not ready to paint until the browser finishes decoding.
 await page.evaluate(()=>{
  const nativeDecode=HTMLImageElement.prototype.decode;
  window.decodeStops=new Map();window.failDecode='';
  window.holdDecode=key=>{
   const stop={reached:false};stop.promise=new Promise(r=>stop.release=r);
   decodeStops.set(key,stop);
  };
  HTMLImageElement.prototype.decode=function(){
   const src=this.src;
   return nativeDecode.call(this).then(()=>{
    if(window.failDecode&&src.includes(window.failDecode))throw Error('test decode failure');
    const entry=[...decodeStops].find(([key])=>src.includes(key));
    if(entry){entry[1].reached=true;return entry[1].promise;}
   });
  };
 });
 const oldScene=await page.evaluate(()=>demo.painted());
 const oldSky=await page.$eval('#sky',e=>e.style.backgroundImage);
 await page.evaluate(()=>{
  holdDecode('/room-bg/scree-night.webp');holdDecode('/sky/moon.webp');
  demo.paintScene('mountain','moon','scree','decode-room',false,1,'',0,0,false);
 });
 await page.waitForFunction(()=>[...decodeStops.values()].every(s=>s.reached));
 assert.equal(await page.evaluate(()=>demo.painted()),oldScene,'holds old room through download and decode');
 await page.evaluate(()=>decodeStops.get('/room-bg/scree-night.webp').release());
 await new Promise(r=>setTimeout(r,50));
 assert.equal(await page.evaluate(()=>demo.painted()),oldScene,'ground alone cannot replace the scene');
 assert.equal(await page.$eval('#sky',e=>e.style.backgroundImage),oldSky,'old sky stays with old ground');
 await page.evaluate(()=>decodeStops.get('/sky/moon.webp').release());
 await page.waitForFunction(()=>demo.painted()==='/room-bg/scree-night.webp'&&document.getElementById('scene-fade'));
 assert.equal(await page.$eval('#scene-fade',e=>getComputedStyle(e).pointerEvents),'none');
 if(process.env.TRANSITION_SCREENSHOT)await page.screenshot({path:process.env.TRANSITION_SCREENSHOT});
 await page.waitForFunction(()=>!document.getElementById('scene-fade'));
 // Fast travel: a slow previous room cannot replace the latest one.
 await page.evaluate(()=>{holdDecode('/room-bg/gully-day.webp');demo.paintScene('mountain','day','gully','slow-room',false,1,'',0,0,false);});
 await page.waitForFunction(()=>decodeStops.get('/room-bg/gully-day.webp').reached);
 await page.evaluate(()=>demo.paintScene('mountain','day','cairn','latest-room',false,1,'',0,0,false));
 await page.waitForFunction(()=>demo.painted()==='/room-bg/cairn-day.webp');
 await page.evaluate(()=>decodeStops.get('/room-bg/gully-day.webp').release());
 await new Promise(r=>setTimeout(r,50));
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/cairn-day.webp','late room cannot win');
 // Failed decode leaves the last good picture, and the next request retries.
 await page.evaluate(()=>{window.failDecode='/room-bg/snow-day.webp';demo.paintScene('mountain','day','snow','failed-room',false,1,'',0,0,false);});
 await page.waitForNetworkIdle();
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/cairn-day.webp','failed image never blanks the scene');
 await page.evaluate(()=>{window.failDecode='';demo.paintScene('mountain','day','snow','retry-room',false,1,'',0,0,false);});
 await page.waitForFunction(()=>demo.painted()==='/room-bg/snow-day.webp');
 // Gatehouse follows the same handoff, retaining the outdoor sky until ready.
 await page.evaluate(()=>{holdDecode('/room-bg/gatehouse');demo.paintScene('mountain','day','gatehouse','inside',false,1,'',0,0,true);});
 await page.waitForFunction(()=>decodeStops.get('/room-bg/gatehouse').reached);
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/snow-day.webp');
 assert.notEqual(await page.$eval('#sky',e=>e.style.backgroundImage),'','entering a roof must not strip the old sky early');
 await page.evaluate(()=>decodeStops.get('/room-bg/gatehouse').release());
 await page.waitForFunction(()=>demo.painted().startsWith('/room-bg/gatehouse'));
 assert.equal(await page.$eval('#sky',e=>e.style.backgroundImage),'');
 await page.waitForFunction(()=>!document.getElementById('scene-fade'));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.evaluate(()=>demo.paintScene('mountain','day','snow','cached-room',false,1,'',0,0,false));
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/snow-day.webp','recent decoded room returns immediately');
 assert.equal(await page.$('#scene-fade'),null,'reduced motion skips dissolve');
 assert(await page.evaluate(()=>demo.cacheSize()<=8),'decoded cache is bounded');
 console.log('PASS decoded ground/sky handoff, dissolve cleanup, rapid movement, failure retry, gatehouse, cache and reduced motion');
 // Start from real painted flames, then stall the next room's depth map.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>{demo.controlFx();demo.paintScene('upper','in','','torch-start',false,1,'undercroft',0,0,true);});
 await page.waitForFunction(()=>demo.fxState().ready&&document.getElementById('scene-sparks').style.display==='block');
 await page.evaluate(()=>{holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','torch-next',true,1,'',0,0,false);});
 await page.waitForFunction(()=>fxStops.get('/room-fx/snow-night-torch.png').calls===1);
 assert.equal(await page.$eval('#scene-fx',e=>e.style.display),'none','old flame canvas hidden while next effects load');
 assert.equal(await page.$eval('#scene-sparks',e=>e.style.display),'none','old embers hidden while next effects load');
 const pendingSeq=await page.evaluate(()=>demo.fxState().seq);
 await page.evaluate(()=>demo.paintScene('mountain','night','snow','torch-next',true,1,'',0,0,false));
 assert.equal(await page.evaluate(()=>demo.fxState().seq),pendingSeq,'status updates share one effects load');
 assert.equal(await page.evaluate(()=>fxStops.get('/room-fx/snow-night-torch.png').calls),1);
 // The old failed request cannot stop the newer room's effects.
 await page.evaluate(()=>demo.paintScene('mountain','night','gully','torch-current',true,1,'',0,0,false));
 await page.waitForFunction(()=>demo.fxState().name==='gully-night-torch'&&demo.fxState().ready&&document.getElementById('scene-fx').style.display==='block');
 await page.evaluate(()=>fxStops.get('/room-fx/snow-night-torch.png').fail(Error('old room failed')));
 await new Promise(r=>setTimeout(r,50));
 assert.equal(await page.evaluate(()=>demo.fxState().name),'gully-night-torch');
 assert.equal(await page.evaluate(()=>demo.fxState().ready),true);
 // Leave and return to the same plate: an older success with the SAME name
 // must not be accepted as the current load.
 await page.evaluate(()=>{window.oldFx=holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','visit-one',true,1,'',0,0,false);});
 await page.waitForFunction(()=>oldFx.calls===1);
 await page.evaluate(()=>demo.paintScene('mountain','night','gully','between-visits',true,1,'',0,0,false));
 await page.waitForFunction(()=>demo.fxState().name==='gully-night-torch'&&demo.fxState().ready);
 await page.evaluate(()=>{window.newFx=holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','visit-two',true,1,'',0,0,false);});
 await page.waitForFunction(()=>newFx.calls===1);
 await page.evaluate(()=>oldFx.release());await page.waitForNetworkIdle();
 assert.equal(await page.evaluate(()=>demo.fxState().ready),false,'earlier same-room effects cannot become current');
 assert.equal(await page.$eval('#scene-fx',e=>e.style.display),'none');
 await page.evaluate(()=>newFx.release());
 await page.waitForFunction(()=>demo.fxState().ready&&document.getElementById('scene-fx').style.display==='block');
 assert.equal(await page.$eval('#scene-sparks',e=>e.style.display),'none','hand torch does not inherit wall embers');
 console.log('PASS old torch/ember buffers hidden, shared pending FX, stale failure and same-room stale success ignored');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS real touch switch, local art loads, current creatures/corpses restored, empty room, preference and grant');
}finally{await browser.close()}
