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
const hook=`window.demo={grantArt,setView,setLogBig,fitPicture,paintScene,updateMobs,renderChips,view:()=>viewMode,painted:()=>scenePainted};`;
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
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS real touch switch, local art loads, current creatures/corpses restored, empty room, preference and grant');
}finally{await browser.close()}
