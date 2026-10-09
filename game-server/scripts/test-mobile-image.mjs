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
const hook=`window.demo={fitMobRow,setTheme, palettes:THEMES, contrastRatio, renderBench, renderTrade, renderForge, renderMap,
 themeOptions:(design,ornate)=>{doorAtmosphere=design;ornateBorders=ornate;syncDoorAtmosphere();},
 grantArt,setView,setLogBig,fitPicture,paintScene,updateMobs,renderChips,skyDrift,weatherState:()=>({kind:weatherKind,flash:weatherFlashAt,thunder:weatherThunderAt}),view:()=>viewMode,painted:()=>scenePainted,cacheSize:()=>readySceneImage.cache?.size||0,
 fxState:()=>({name:fxName,ready:fxReady,seq:fxSeq,mist:fxGl&&fxGl.getUniform(fxProg,fxU.mistOn),wet:fxGl&&fxGl.getUniform(fxProg,fxU.wetOn)}),
 evictImage:path=>readySceneImage.cache.delete(path+'?v='+BG_V),
 mobBeat,stepAnims,
 controlFx:()=>{
  const load=fxLoad;window.fxStops=new Map();
  window.holdFx=key=>{if(fxPrepare.cache)fxPrepare.cache.delete(key.split("/").pop().split(".")[0]);const h={calls:0};h.promise=new Promise((resolve,reject)=>{h.release=resolve;h.fail=reject;});fxStops.set(key,h);return h;};
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
  if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.respond({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.webp')?'image/webp':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream',body:fs.readFileSync(f)});
  missing.push(u.pathname);r.respond({status:404,body:''});
 });
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.goto('http://nomad.test');
 await page.waitForFunction(()=>window.demo);
 // The existing ornate switch controls both engravings and keeps its saved preference.
 for(const enabled of [false,true]) {
  await page.$eval('#ornatebtn',e=>e.click());
  assert.equal(await page.evaluate(()=>localStorage.getItem('nomad_ornate_borders')),enabled?'on':'off');
  await page.reload();await page.waitForFunction(()=>window.demo);
  const art=await page.evaluate(()=>({
   checked:document.getElementById('ornatebtn').getAttribute('aria-checked'),
   log:getComputedStyle(document.getElementById('log')).backgroundImage,
   panel:getComputedStyle(document.querySelector('#bench .bbox'),'::before').backgroundImage
  }));
  assert.equal(art.checked,String(enabled));
  assert.equal(art.log.includes('/ornate/floral-v1.svg'),enabled);
  assert.equal(art.panel.includes('/ornate/gate-v1.svg'),enabled);
  assert.equal(art.panel.includes('/ornate/windows-v1.svg'),enabled);
 }
 console.log('PASS ornate artwork switch and reload persistence');
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
 // Keep the same mobile emulation while resizing so Chrome retains the granted session.
 // Light-theme lettering stays solid and crisp while the panel keeps its shared faded edge.
 for(const [width,height] of [[390,844],[1280,800]]) {
  await page.setViewport({width,height,isMobile:true,hasTouch:true});
  for(const design of [false,true]) for(const ornate of [false,true]) {
   await page.evaluate(({design,ornate})=>{
    demo.setTheme('bone');demo.themeOptions(design,ornate);demo.setLogBig(true);
    document.getElementById('log').innerHTML='<div class="head">The hillside</div><div>The wind moves through the grass.</div><div class="say">A wanderer speaks.</div><div class="dmgin">The wolf strikes you.</div><div class="dmgout">You strike back.</div><div class="r-uncommon">a riding mace</div><div class="r-legendary">a legendary blade</div><div class="echo">look</div><div class="tell">A quiet word.</div><div class="fumble">You miss.</div>';
   },{design,ornate});
   const paint=await page.$eval('#log',e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,image:s.backgroundImage,shadow:s.textShadow, tone:document.body.dataset.themeTone, bgVar:s.getPropertyValue('--bg'), pageVar:s.getPropertyValue('--design-page'), view:document.body.dataset.view, big:document.body.dataset.log,opacity:s.opacity,ink:[...e.children].map(child=>{const c=getComputedStyle(child);return {opacity:c.opacity,color:c.color,shadow:c.textShadow}})}});
   assert.match(paint.image,/linear-gradient\(/,'Bone retains the shared reading-panel fade');
   assert.equal(paint.image.includes('/ornate/floral-v1.svg'),ornate,'artwork follows ornate independently of theme design');
   assert.match(paint.image,/\/ 0\) 0%/,'panel edge remains transparent');
   assert.match(paint.image,/\/ 0.99\) 100%/,'panel retains the original fade stops');
   assert.equal(paint.opacity,'1','the panel must not fade its lettering');
   for(const ink of paint.ink){assert.equal(ink.opacity,'1');assert.match(ink.color,/^rgb\(/,'lettering is opaque');assert.equal(ink.shadow,'none');}
   assert.equal(paint.shadow,'none','Bone text must not inherit the dark-theme glow');
  }
 }
 // Audit actual computed light-theme text and the real panel renderers.
 const audit=await page.evaluate(()=>{
  demo.setTheme('bone');demo.themeOptions(false,false);
  const root=getComputedStyle(document.documentElement),bg=root.getPropertyValue('--bg').trim(),panel=root.getPropertyValue('--panel').trim();
  const ratios={};
  for(const key of ['cream','dim','gold','wear','blood','bone','steel','heal','omen','voice','stone','tide']) {
   ratios[key]=Math.min(demo.contrastRatio(root.getPropertyValue('--'+key).trim(),bg),demo.contrastRatio(root.getPropertyValue('--'+key).trim(),panel));
  }
  function hex(color){return '#'+color.match(/[\d.]+/g).slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('');}
  const sample=document.createElement('span');document.getElementById('log').appendChild(sample);
  for(const tier of ['common','uncommon','rare','epic','legendary']) {
   sample.className='r-'+tier;ratios[tier]=demo.contrastRatio(hex(getComputedStyle(sample).color),bg);
  }
  sample.className='';
  ratios.names=Infinity;
  for(let hue=0;hue<360;hue++) {
   sample.style.color='hsl('+hue+', var(--name-s), var(--name-l))';
   ratios.names=Math.min(ratios.names,demo.contrastRatio(hex(getComputedStyle(sample).color),bg));
  }
  sample.remove();return ratios;
 });
 for(const [role,ratio] of Object.entries(audit))assert(ratio>=4.5,role+' light-theme contrast '+ratio.toFixed(2));
 const gear={row:'1',id:'1',itemId:'mace',name:'a riding mace',slot:'weapon',rarity:'uncommon',stat:'+2 dmg',cost:12,cond:100,can:true,scrap:2};
 for(const [width,height] of [[390,844],[1280,800]]) {
  await page.setViewport({width,height,isMobile:true,hasTouch:true});
  for(const layout of ['compact','classic']) for(const design of [false,true]) {
   await page.evaluate(({layout,design})=>{
    if(document.body.dataset.modalLayout!==layout)document.getElementById('modallayoutbtn').click();
    demo.themeOptions(design,true);
   },{layout,design});
   for(const [id,renderer,state] of [
    ['bench','renderBench',{atGate:true,pack:[gear],lockbox:[],vault:[],packCap:20,lockboxCap:8,vaultCap:50}],
    ['trade','renderTrade',{stock:[gear],goods:{pack:[gear]}}],
    ['forge','renderForge',{scrap:20,recipes:[gear],read:[]}],
    ['mapm','renderMap',{detailed:true,here:'r0',regions:[{key:'crossing',rooms:Array.from({length:4},(_,i)=>({id:'r'+i,name:'Crossing '+i,x:i,y:0,here:i===0,exits:i<3?[{dir:'east',to:'r'+(i+1)}]:[]}))}]}]
   ]) {
    await page.evaluate(({renderer,state})=>{document.querySelectorAll('#bench,#trade,#forge,#mapm').forEach(e=>e.classList.remove('open'));demo[renderer](state);},{renderer,state});
    const surface=await page.$eval('#'+id+' .bbox, #'+id+' .lbox',e=>{
     const s=getComputedStyle(e),r=e.getBoundingClientRect();return {bg:s.backgroundColor,color:s.color,shadow:s.textShadow,inBounds:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
    });
    assert.equal(surface.bg,'rgb(239, 232, 216)',id+' Bone panel');assert.equal(surface.shadow,'none');assert(surface.inBounds,id+' fits screen');
    if(process.env.THEME_SCREENSHOTS&&width===1280&&layout==='compact'&&design)await page.screenshot({path:process.env.THEME_SCREENSHOTS+'/bone-'+id+'.png'});
   }
  }
 }
 await page.evaluate(()=>{
  document.querySelectorAll('#bench,#trade,#forge,#mapm').forEach(e=>e.classList.remove('open'));
  demo.themeOptions(false,false);demo.setTheme('bone');demo.setView('text');
 });
 assert.equal(await page.$eval('#log',e=>getComputedStyle(e).textShadow),'none');
 await page.evaluate(()=>{demo.setTheme('paper',{...demo.palettes.bone});demo.setView('image');demo.setLogBig(true);});
 assert.match(await page.$eval('#log',e=>getComputedStyle(e).backgroundImage),/gradient/,'custom light theme retains the panel fade');
 assert.equal(await page.$eval('#log',e=>getComputedStyle(e).textShadow),'none','custom light lettering has no glow');
 await page.evaluate(()=>{demo.setTheme('bone');demo.themeOptions(true,true);});
 if(process.env.THEME_SCREENSHOTS)await page.screenshot({path:process.env.THEME_SCREENSHOTS+'/bone-reading.png'});
 await page.evaluate(()=>{demo.setTheme('door');demo.themeOptions(false,true);});
 assert.match(await page.$eval('#log',e=>getComputedStyle(e).backgroundImage),/gradient/,'dark-theme reading appearance preserved');
 assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--tide')),'#6f93c9','switching back restores dark map blue');
 console.log('PASS Bone text/gear/name/map contrast, inventory/barter/forge/map in both layouts and viewport sizes, custom light themes and switching back to dark');
 console.log('PASS solid Bone lettering without glow, shared transparent panel edge, desktop/mobile and design/ornaments on/off');
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
 // Animated mist and wet-floor reflections must commit with their image,
 // even when the effect map is slower than the room artwork.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>{demo.controlFx();demo.paintScene('mountain','night','gully','fx-outside',true,1,'',0,0,false);});
 await page.waitForFunction(()=>demo.fxState().ready&&demo.painted()==='/room-bg/gully-night-torch.webp');
 assert.equal(await page.evaluate(()=>demo.fxState().mist),0);
 await page.evaluate(()=>{holdFx('/room-fx/undercroft-night.png');demo.paintScene('upper','in','','mist-next',false,1,'undercroft',0,0,true);});
 await page.waitForFunction(()=>fxStops.get('/room-fx/undercroft-night.png').calls===1);
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/gully-night-torch.webp','room image waits for animated mist assets');
 assert.equal(await page.evaluate(()=>demo.fxState().name),'gully-night-torch','old effects stay with the held old image');
 await page.evaluate(()=>demo.paintScene('upper','in','','mist-next',false,1,'undercroft',0,0,true));
 assert.equal(await page.evaluate(()=>fxStops.get('/room-fx/undercroft-night.png').calls),1,'status updates share pending animation load');
 await page.evaluate(()=>fxStops.get('/room-fx/undercroft-night.png').release());
 await page.waitForFunction(()=>demo.painted()==='/room-bg/undercroft-night.webp');
 const mist=await page.evaluate(()=>({...demo.fxState(),display:document.getElementById('scene-fx').style.display}));
 assert.equal(mist.name,'undercroft-night');assert.equal(mist.ready,true);
 assert.equal(mist.mist,1);assert.equal(mist.wet,1);assert.equal(mist.display,'block','first animated frame exists when room image commits');
 // No-mist room: old animated mist never hangs over the new image.
 await page.evaluate(()=>demo.paintScene('mountain','day','scree','mist-gone',false,1,'',0,0,false));
 await page.waitForFunction(()=>demo.painted()==='/room-bg/scree-day.webp');
 assert.equal(await page.$eval('#scene-fx',e=>e.style.display),'none');
 assert.equal(await page.$eval('#scene-sparks',e=>e.style.display),'none');
 // A failed previous request cannot disable the current room's effects.
 await page.evaluate(()=>{holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','old-fx',true,1,'',0,0,false);});
 await page.waitForFunction(()=>fxStops.get('/room-fx/snow-night-torch.png').calls===1);
 await page.evaluate(()=>demo.paintScene('upper','in','','current-mist',false,1,'undercroft',0,0,true));
 await page.waitForFunction(()=>demo.painted()==='/room-bg/undercroft-night.webp');
 await page.evaluate(()=>fxStops.get('/room-fx/snow-night-torch.png').fail(Error('old room failed')));
 await new Promise(r=>setTimeout(r,50));
 assert.equal(await page.evaluate(()=>demo.fxState().name),'undercroft-night');
 assert.equal(await page.evaluate(()=>demo.fxState().mist),1);
 // Leave and return while two generations of the same mist map are pending.
 await page.evaluate(()=>{window.oldFx=holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','visit-one',true,1,'',0,0,false);});
 await page.waitForFunction(()=>oldFx.calls===1);
 await page.evaluate(()=>demo.paintScene('upper','in','','between-visits',false,1,'undercroft',0,0,true));
 await page.evaluate(()=>{window.newFx=holdFx('/room-fx/snow-night-torch.png');demo.paintScene('mountain','night','snow','visit-two',true,1,'',0,0,false);});
 await page.waitForFunction(()=>newFx.calls===1);
 await page.evaluate(()=>oldFx.release());await page.waitForNetworkIdle();
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/undercroft-night.webp','obsolete same-room load cannot commit any layer');
 await page.evaluate(()=>newFx.release());
 await page.waitForFunction(()=>demo.painted()==='/room-bg/snow-night-torch.webp');
 assert.equal(await page.evaluate(()=>demo.fxState().name),'snow-night-torch');
 assert.equal(await page.evaluate(()=>demo.fxState().mist),0);assert.equal(await page.evaluate(()=>demo.fxState().wet),0);
 assert.equal(await page.$eval('#scene-sparks',e=>e.style.display),'none','hand torch does not inherit wall embers');
 console.log('PASS animated mist/reflections prepared before image swap; first frame commits together; obsolete successes/failures cannot transfer effects');
 // No animation frame may expose the previous sky's tiles or stars.
 const skySwap=await page.evaluate(()=>{
  const cv=document.getElementById('sky-stars'),ctx=cv.getContext('2d');
  let clears=0;const clear=ctx.clearRect;ctx.clearRect=function(...args){clears++;return clear.apply(this,args);};
  demo.skyDrift.show('/sky/night.webp');clears=0;
  demo.skyDrift.show('/sky/moon.webp');
  const result={tiles:[...document.querySelectorAll('#sky-drift > i')].map(e=>e.style.backgroundImage),clears,stars:cv.style.display};
  demo.skyDrift.show('/sky/day.webp');result.dayStars=cv.style.display;
  demo.skyDrift.show('');result.hidden=document.getElementById('sky-drift').style.display;
  ctx.clearRect=clear;return result;
 });
 assert(skySwap.tiles.every(s=>s.includes('/sky/moon.webp')),'moving sky tiles switch synchronously');
 assert(skySwap.clears>0,'old star pixels replaced synchronously');assert.equal(skySwap.stars,'block');
 assert.equal(skySwap.dayStars,'none');assert.equal(skySwap.hidden,'none');
 // Keep outdoor weather with a delayed outdoor image, then remove it at the
 // exact indoor commit. A stale rainy request cannot restart it indoors.
 await page.evaluate(()=>demo.paintScene('mountain','rain','scree','wet-outside',false,1,'',0,0,false));
 await page.waitForFunction(()=>demo.weatherState().kind==='rain'&&document.getElementById('weather-particles').style.display==='block');
 const wetScene=await page.evaluate(()=>demo.painted());
 await page.evaluate(()=>{
  decodeStops.clear();
  demo.evictImage('/room-bg/gatehouse.webp');
  holdDecode('/room-bg/gatehouse.webp');
  demo.paintScene('mountain','day','gatehouse','dry-inside',false,1,'',0,0,true);
 });
 await page.waitForFunction(()=>decodeStops.get('/room-bg/gatehouse.webp').reached);
 assert.equal(await page.evaluate(()=>demo.painted()),wetScene);
 assert.equal(await page.evaluate(()=>demo.weatherState().kind),'rain','rain stays with old outdoor image while indoor image loads');
 assert.equal(await page.$eval('#weather-particles',e=>e.style.display),'block');
 await page.evaluate(()=>decodeStops.get('/room-bg/gatehouse.webp').release());
 await page.waitForFunction(()=>demo.painted()==='/room-bg/gatehouse.webp');
 assert.equal(await page.$eval('#weather-particles',e=>e.style.display),'none');
 assert.equal(await page.evaluate(()=>demo.weatherState().thunder),0);
 await page.evaluate(()=>{holdDecode('/room-bg/gully-rain.webp');demo.paintScene('mountain','rain','gully','stale-rain',false,1,'',0,0,false);});
 await page.waitForFunction(()=>decodeStops.get('/room-bg/gully-rain.webp').reached);
 await page.evaluate(()=>demo.paintScene('mountain','day','gatehouse','still-inside',false,1,'',0,0,true));
 await page.evaluate(()=>decodeStops.get('/room-bg/gully-rain.webp').release());
 await page.waitForNetworkIdle();
 assert.equal(await page.evaluate(()=>demo.painted()),'/room-bg/gatehouse.webp');
 assert.equal(await page.$eval('#weather-particles',e=>e.style.display),'none');
 console.log('PASS synchronous moving sky/star swap, delayed indoor weather handoff and obsolete rain request');
 // The death pose and persisted corpse use the same eye pixels in black,
 // including when the living creature had the blood-moon overlay.
 for(const red of [0,1]) {
  await page.evaluate(red=>{
   demo.paintScene('mountain','day','scree','eye-test',false,1,'',0,red,false);
   demo.updateMobs(['the-tide-warden'],null,[]);
  },red);
  await page.waitForFunction(()=>document.querySelector('#mobs .mob:not(.dead)')?.dataset.id==='the-tide-warden');
  const dying=await page.evaluate(()=>{
   demo.mobBeat(null,null,['the-tide-warden']);demo.stepAnims();
   const el=document.querySelector('#mobs .mob'),p=getComputedStyle(el,'::after');
   return {dead:el.dataset.death,filter:p.filter,image:p.backgroundImage,pos:p.backgroundPositionX,basePos:el.style.backgroundPositionX,size:p.backgroundSize,baseSize:el.style.backgroundSize};
  });
  assert.equal(dying.dead,'1');assert.equal(dying.filter,'brightness(0)');
  assert(dying.image.includes('the-tide-warden.eyes.webp'));
  assert.equal(dying.pos,dying.basePos.split(',')[0].trim());
  assert.equal(dying.size,dying.baseSize.split(',')[0].trim());
  await page.evaluate(()=>demo.updateMobs([],null,['the-tide-warden']));
  await page.waitForFunction(()=>document.querySelector('#mobs .mob.dead')?.dataset.death==='1');
  assert.equal(await page.$eval('#mobs .dead',e=>getComputedStyle(e,'::after').filter),'brightness(0)');
 }
 console.log('PASS Hollow death animation and corpse black eyes in ordinary light and blood moon, aligned with the death frame');
 // One opening kill with the horseman's pick sends died:['rat'], then a
 // context with two living rats and one body. Only one sprite may fall.
 const ratDeaths=await page.evaluate(()=>{
  demo.updateMobs(['rat','rat','rat'],null,[]);
  demo.mobBeat(null,['rat'],null);
  demo.mobBeat(null,null,['rat']);demo.stepAnims();
  const fallen=document.querySelectorAll('#mobs .mob[data-death="1"]').length;
  demo.updateMobs(['rat','rat'],null,['rat']);
  return fallen;
 });
 assert.equal(ratDeaths,1,'one kill must not drop all three rats');
 await page.waitForFunction(()=>document.querySelectorAll('#mobs .mob.dead').length===1&&document.querySelectorAll('#mobs .mob:not(.dead)').length===2);
 assert.equal(await page.$$eval('#mobs .mob:not(.dead)',els=>els.filter(e=>e.dataset.death==='1').length),0);
 console.log('PASS one rat kill drops one sprite and leaves two living rats after the death frame');
 // Reproduce the reported wall overlap: four living creatures and three bodies
 // on the shared crypt passage. Bodies must not shrink or displace the living.
 await page.evaluate(()=>{demo.setTheme('charcoal');demo.setLogBig(false);demo.setView('image');demo.paintScene('upper','in','','ossuary',false,1,'ossuary',0,0,false);});
 await page.waitForFunction(()=>demo.painted()==='/room-bg/keep-passage-night.webp');
 for(const [width,height] of [[2672,1260],[1280,800],[390,844],[844,390]]) {
  await page.setViewport({width,height,isMobile:true,hasTouch:true});
  // Rotation updates the CSS picture box asynchronously. Compare corpse/no-
  // corpse geometry only once that box has settled at the new viewport size.
  await page.evaluate(()=>new Promise(resolve=>{
   var prior='',steady=0;
   function settle(){
    demo.fitPicture();
    var box=document.getElementById('scene').getBoundingClientRect();
    var next=window.innerWidth+':'+window.innerHeight+':'+box.width+':'+box.height;
    steady=next===prior?steady+1:0;prior=next;
    if(steady>=20)resolve();else requestAnimationFrame(settle);
   }
   requestAnimationFrame(settle);
  }));
  await page.evaluate(()=>{demo.fitPicture();demo.updateMobs(['dire-hyena','warden','skeleton','pale-crawler'],null,[]);});
  const livingLayout=()=>page.$$eval('#mobs .mob:not(.dead)',els=>els.map(e=>({id:e.dataset.id,left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height})));
  const beforeBodies=await livingLayout();
  const livingScale=await page.$eval('#mobs',e=>e.style.transform);
  await page.evaluate(()=>demo.updateMobs(['dire-hyena','warden','skeleton','pale-crawler'],null,['skeleton','skeleton','skeleton']));
  assert.deepEqual(await livingLayout(),beforeBodies,'adding corpses must not shrink or move living mobs');
  assert.equal(await page.$eval('#mobs',e=>e.style.transform),livingScale,'bodies cannot change creature scale');
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const floor=await page.evaluate(()=>{
   const scene=document.getElementById('scene').getBoundingClientRect(),row=document.getElementById('mobs');
   return {height:scene.height,width:innerWidth,rects:[...row.children].map(e=>({dead:e.classList.contains('dead'),...e.getBoundingClientRect().toJSON()})),transform:row.style.transform};
  });
  assert.equal(floor.rects.length,7,'every living creature and corpse remains visible');
  for(const r of floor.rects) {
   assert(r.left>=width*.14-2&&r.right<=width*.86+2,'sprite stays between passage walls: '+JSON.stringify(r));
   assert(r.bottom>=floor.height*.76-3&&r.bottom<=floor.height*.94+3,'feet stay on the foreground floor: '+JSON.stringify({r,height:floor.height}));
  }
  await page.evaluate(()=>demo.updateMobs(['dire-hyena','warden','skeleton','pale-crawler','dire-hyena','warden','skeleton','pale-crawler'],null,[]));
  assert.equal(await page.$eval('#mobs',e=>e.style.transform),livingScale,'more living mobs add ranks, never shrink the whole group');
  assert(await page.$$eval('#mobs .mob',els=>new Set(els.map(e=>Math.round(parseFloat(e.style.top)+parseFloat(e.dataset.h)/100*document.getElementById('scene').getBoundingClientRect().height/2))).size)>1,'larger crowds stagger onto more floor ranks at '+width+'x'+height+': '+JSON.stringify(await livingLayout()));
  await page.evaluate(()=>demo.updateMobs(['dire-hyena','warden','skeleton','pale-crawler'],null,['skeleton','skeleton','skeleton']));
  await page.evaluate(()=>{for(let i=0;i<10;i++)demo.fitMobRow()});
  assert.equal(await page.$eval('#mobs',e=>e.style.transform),floor.transform,'repeated fitting cannot compound the scale');
  if(process.env.CROWD_SCREENSHOTS) {
   await page.waitForNetworkIdle();
   await page.screenshot({path:process.env.CROWD_SCREENSHOTS+'/passage-'+width+'.png'});
  }
 }
 await page.evaluate(()=>demo.paintScene('mountain','day','scree','open-ground',false,1,'',0,0,false));
 await page.waitForFunction(()=>demo.painted()==='/room-bg/scree-day.webp');
 assert.deepEqual(await page.$eval('#mobs',e=>[e.dataset.floorLeft,e.dataset.floorRight]),['4','96'],'moving outdoors resets passage bounds');
 console.log('PASS crowds stagger at normal sizes; corpses cannot shrink or displace the living; floor bounds, resize and room transitions');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS real touch switch, local art loads, current creatures/corpses restored, empty room, preference and grant');
}finally{await browser.close()}
