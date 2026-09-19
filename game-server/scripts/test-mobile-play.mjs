// Local, synthetic play-loop regression: no game server or real character.
// Node 22+, promo/capture's puppeteer-core, CHROME_PATH or macOS Chrome.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {transform} from 'esbuild';
import {parse} from 'acorn';
const requireCapture=createRequire(new URL('../../promo/capture/package.json',import.meta.url));
const {default:puppeteer}=await import(requireCapture.resolve('puppeteer-core'));
const {code}=await transform(fs.readFileSync(new URL('../src/public.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {PAGE}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const js=PAGE.split('<script type="module">')[1].split('</script>')[0];
const ast=parse(js,{ecmaVersion:'latest',sourceType:'module'});
const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return js.slice(n.start,n.end)};
const controls=js.slice(js.indexOf('function phoneControls()'),js.indexOf('// The keys panel:'));
const fixture=PAGE.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')+`<script>
var log=document.getElementById('log'),cmd=document.getElementById('cmd'),chipsEl=document.getElementById('chips');
document.getElementById('threshold').remove();
var sent=[],lastSuggest=[],lastCombat=false,chipsOn=true,prevChipCmds=[],chipsExpanded=false,chipScrollRoom='',lastRoomName='Woods',CHIP_FOLD=12,CHIP_ARM_MS=400;
var BENCH_CHIP='inventory',DEN_CHIP='shelf',TRADE_CHIP='trade',FORGE_CHIP='forge',BOUNTY_CHIP='bounty',doorIsDen=false;
var hist=[],histAt=-1,viewMode='text',MODAL_SURFACES='#bench, #trade, #mapm, #jrnl, #idpanel, #setpanel';
var soundOn=false,actx=null;
function sendCmd(s){sent.push(s)} function benchSend(s){sent.push('bench:'+s)} function tradeSend(){} function forgeSend(){} function bountySend(){}
function maybeReload(){} function fitMobRow(){} function playSounds(){} function classify(){return ''}
function paintVoice(el,t){el.textContent=t} function modalChatPush(){}
${['chipLabel','chipKind','chipButton','renderChips','installModalTapGuard','fitPicture','print'].map(fn).join('\n')}
installModalTapGuard(chipsEl,false);
${controls}
</script>`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const commands=['go north','go west','go down','attack a marsh wolf','eat smoked venison','bandage',...Array.from({length:25},(_,i)=>'get a weathered iron object '+i)];
 for(const [width,height,touch] of [[390,844,true],[390,664,true],[844,390,true],[320,568,true],[1280,800,false]]){
  await page.setViewport({width,height,isMobile:touch,hasTouch:touch});await page.setContent(fixture);
  for(const mode of ['text','image']){
   await page.evaluate(({commands,mode})=>{viewMode=mode;document.body.dataset.view=mode;log.textContent='';for(let i=0;i<50;i++)print('The forest stirs around you. Footsteps approach. '+i);renderChips(commands,true)}, {commands,mode});
   await page.evaluate(()=>new Promise(requestAnimationFrame));
   const geometry=await page.evaluate(()=>{
    const input=document.getElementById('inputline').getBoundingClientRect(),r=log.getBoundingClientRect(),tray=chipsEl.getBoundingClientRect();
    return {input:input.bottom,log:r.height,top:r.top,body:document.body.scrollWidth,width:innerWidth,tray:tray.height};
   });
   assert(geometry.input<=height+1&&geometry.body<=width+1&&geometry.log>=55,`${mode} ${width} ${JSON.stringify(geometry)}`);
   if(process.env.PHONE_SCREENSHOTS && width===390 && height===844){
    fs.mkdirSync(process.env.PHONE_SCREENSHOTS,{recursive:true});
    await page.screenshot({path:process.env.PHONE_SCREENSHOTS+'/'+mode+'.png'});
   }
   if(touch){
    assert(geometry.tray<=height*.35,JSON.stringify(geometry));
    const pos=await page.$$eval('.chip-dirs button',els=>els.map(e=>e.getBoundingClientRect().x));
    await page.evaluate(()=>renderChips(['go south','go east','go up',...lastSuggest.filter(s=>!s.startsWith('go '))],true));
    assert.deepEqual(await page.$$eval('.chip-dirs button',els=>els.map(e=>e.getBoundingClientRect().x)),pos,'fixed movement slots');
    const actions=await page.evaluate(()=>{const a=chipsEl.querySelector('.chip-actions');a.scrollTop=a.scrollHeight;const before=a.scrollTop;renderChips(lastSuggest,true);return [before,chipsEl.querySelector('.chip-actions').scrollTop]});
    assert(actions[0]>0&&actions[0]===actions[1],'action scrolling survives updates');
    await page.$eval('.chip-actions button:last-child',e=>e.click());
    assert.equal(await page.$$eval('.chip-actions button',els=>els.length),28,'all actions accessible through more');
    await page.evaluate(()=>{log.scrollTop=0;print('A new voice reaches you.');});
    assert.equal(await page.$eval('#log',e=>e.scrollTop),0,'new lines preserve reading position');
    await page.$eval('#log',e=>e.click());assert.notEqual(await page.evaluate(()=>document.activeElement.id),'cmd','scene tap does not focus keyboard');
   }
  }
  console.log('PASS play layout',width,height);
 }
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.setContent(fixture);
 await page.evaluate(s=>{renderChips(s,true);for(let i=0;i<30;i++)print('The marsh wolf watches from the reeds. '+i)},commands);
 assert.equal(await page.$('#phone-tools'),null,'no unconditional shortcut bar');
 await page.focus('#cmd');await page.type('#cmd','look');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>sent.at(-1)),'look');assert.equal(await page.$eval('#cmd',e=>e.value),'');
 await page.type('#cmd','say hello');await page.click('#phone-send');assert.equal(await page.evaluate(()=>sent.at(-1)),'say hello');
 for(const mode of ['text','image']){
  const geometry=await page.evaluate(mode=>{
   viewMode=mode;document.body.dataset.view=mode;cmd.focus();
   Object.defineProperty(window,'visualViewport',{configurable:true,value:{height:390,offsetTop:180,scale:1}});syncPhoneViewport();
   fitPicture();const r=log.getBoundingClientRect(),input=document.getElementById('inputline').getBoundingClientRect(),bar=document.getElementById('bar').getBoundingClientRect();return {log:r.height,input:input.bottom-180,bar:bar.top-180,picture:r.top-bar.bottom,height:document.body.getBoundingClientRect().height};
  },mode);
  assert(geometry.height===844&&geometry.log>=60&&geometry.input<=391&&Math.abs(geometry.bar)<1,`${mode} keyboard ${JSON.stringify(geometry)}`);
  if(mode==='image')assert(geometry.picture>=70,'keyboard retains room: '+JSON.stringify(geometry));
 }
 await page.click('#phone-done');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'cmd');
 assert.deepEqual(errors,[]);
 console.log('PASS contextual controls, Send/Enter/Done, and panned keyboard viewport');
}finally{await browser.close()}
