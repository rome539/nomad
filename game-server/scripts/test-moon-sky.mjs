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
const hook=`window.demo={skyPick,fitSky,grantArt,setView,setLogBig,fitPicture,paintScene,updateMobs,renderChips,view:()=>viewMode,painted:()=>scenePainted};`;
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

 for(const [width,height] of [[390,844],[844,390],[1440,900],[1920,1080]]) {
  await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900});
  await page.goto('http://nomad.test');await page.waitForFunction(()=>window.demo);
  await page.evaluate(()=>{document.getElementById('threshold').remove();demo.grantArt();demo.setView('image');demo.setLogBig(false);});
  for(const kind of ['moon','blood']) {
   const turns=new Set();
   for(let day=0;day<12;day++) {
    await page.evaluate(({kind,day})=>{demo.paintScene('mountain',kind,'moor','audit-moon-'+day,0,day);demo.fitPicture();},{kind,day});
    await page.waitForFunction(kind=>document.getElementById('sky').style.backgroundImage.includes('/sky/'+kind+'.webp'),{},kind);
    const sky=await page.evaluate(()=>{demo.fitPicture();const e=document.getElementById('sky'),r=e.getBoundingClientRect();return {w:r.width,h:r.height,position:e.style.backgroundPosition,turn:e.style.transform};});
    turns.add(sky.turn);assert(['','scaleX(-1)'].includes(sky.turn),'calendar skies never turn upside down');
    const [x,y]=sky.position.split(' ').map(parseFloat),s=Math.max(sky.w/1584,sky.h/993);
    const [cx,cy,radius]=kind==='blood'?[462,169,83]:[468,185,68];
    const px=x+cx*s,py=y+cy*s,r=radius*s;
    assert(px-r>=-1&&px+r<=sky.w+1&&py-r>=-1&&py+r<=sky.h+1,'moon must remain inside viewport: '+JSON.stringify({kind,width,height,sky,px,py,r}));
   }
   assert.equal(turns.size,2,'exercise both original and mirrored skies');
   await page.waitForNetworkIdle({idleTime:100,timeout:10000});
   if(process.env.MOON_SCREENSHOT_DIR){fs.mkdirSync(process.env.MOON_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MOON_SCREENSHOT_DIR,kind+'-'+width+'.png')});}
  }
  console.log('PASS full/blood moon framing and horizontal-only mirroring',width,height);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
}finally{await browser.close()}
