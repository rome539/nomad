// Browser regression checks against the served CSS, markup, and modal handlers.
// Requires Node 22+, promo/capture's existing puppeteer-core, and local Chrome.
// CHROME_PATH=/path/to/chrome node scripts/test-mobile-modals.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
const requireCapture = createRequire(new URL('../../promo/capture/package.json', import.meta.url));
const { default: puppeteer } = await import(requireCapture.resolve('puppeteer-core'));
const src = fs.readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
const { code } = await transform(src, { loader: 'ts', format: 'esm' });
const { PAGE } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const modalJS = PAGE.slice(PAGE.indexOf('// Modal taps must stay'), PAGE.indexOf('// ---- the map modal:'));
const focusJS = PAGE.slice(PAGE.indexOf('document.body.addEventListener("click"'), PAGE.indexOf('// The keys panel:'));
assert(modalJS.includes('renderForge') && focusJS.includes('MODAL_SURFACES'));
const fixture = PAGE.replace(' autofocus', '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') + `<script>
var cmd = document.getElementById('cmd'), chipsEl = document.getElementById('chips');
${PAGE.slice(PAGE.indexOf('function phoneControls()'), PAGE.indexOf('function submitCommand()'))}
var sent = [], ws = {readyState:1, send:function(m){sent.push(JSON.parse(m))}};
function hideModalChat(){} function setNote(e,t){e.textContent=t || ''} function print(){}
function rarityClass(r){return 'r-'+r}
function gearNameSpan(n){var e=document.createElement('span');e.textContent=n;return e}
${modalJS}
${focusJS}
</script>`;
const item = i => ({row:String(i), rows:[String(i),String(i+100)], id:String(i), itemId:String(i), name:'Weathered iron longsword of the northern watch '+i,
  slot:'weapon', rarity:'common', stat:'8 dmg, heavy', cond:45, fix:true, condWord:'battered', cost:4, can:true, scrap:2});
const items = Array.from({length:12},(_,i)=>item(i));
const note = 'A long status message about your gear and the contents of your keeping. '.repeat(5);
const bench = {pack:items, lockbox:items.slice(0,4), vault:[item(40)], shelf:[item(50)], packCap:20, lockboxCap:20, vaultCap:50,
  sheet:{slots:['weapon','shield','helm','armor','cloak','feet'].map(slot=>({slot,name:'Old iron equipment',cond:'battered'})),
    atk:{name:'Sword',style:'cut',dmg:8},def:{armor:12,mitigate:20},stance:'steady',hp:30,maxHp:40}};
const cases = [
  ['bench','renderBench',{...bench,atGate:true}],
  ['bench','renderBench',{...bench,atGate:false}],
  ['bench','renderBench',{...bench,den:true}],
  ['trade','renderTrade',{note,stock:items,goods:{pack:items},want:{items,cost:48,paid:0}}],
  ['swap','renderSwap',{note,partner:'A fellow wanderer',pack:items,yourOffer:items.slice(0,3),theirOffer:items}],
  ['bounty','renderBounty',{note,board:items.map(it=>({...it,food:'smoked venison',meals:2,heal:5,have:true}))}],
  ['forge','renderForge',{note,scrap:20,recipes:items,read:[]}],
];
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for (const [width,height,touch] of [[390,844,true],[390,664,true],[844,390,true],[320,568,true],[1280,800,false]]) {
    await page.setViewport({width,height,isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
    await page.setContent(fixture);
    for (const [id,render,state] of cases) {
      await page.evaluate(({id,render,state})=>{
        document.querySelectorAll(MODAL_SURFACES).forEach(e=>e.classList.remove('open'));
        cmd.focus();window[render](state);
      },{id,render,state});
      const result = await page.evaluate(id=>{
        const root=document.getElementById(id), box=root.querySelector('.bbox'), sc=root.querySelector('.bbody, .modalbody');
        const r=box.getBoundingClientRect();
        const cols=[...root.querySelectorAll('.bcol')].filter(e=>getComputedStyle(e).display!=='none');
        return {box:[r.left,r.top,r.right,r.bottom],overflow:sc.scrollWidth>sc.clientWidth+1,height:sc.clientHeight,
          cols:cols.map(e=>e.getBoundingClientRect().x),focused:document.activeElement.id};
      },id);
      assert(!result.overflow,`${id} ${width}: horizontal overflow`);
      assert(result.box[0]>=0&&result.box[1]>=0&&result.box[2]<=width+1&&result.box[3]<=height+1,`${id}: ${JSON.stringify(result)}`);
      assert.notEqual(result.focused,'cmd',`${id}: keyboard on entry`);
      if(touch) {
        assert(result.height>120,`${id}: usable scrolling space`);
        assert(new Set(result.cols).size<=1,`${id}: columns must stack`);
        const end = await page.evaluate(id=>{
          const root=document.getElementById(id),sc=root.querySelector('.bbody, .modalbody');sc.scrollTop=sc.scrollHeight;
          return {bottom:sc.lastElementChild.getBoundingClientRect().bottom,edge:sc.getBoundingClientRect().bottom,
            close:root.querySelector('.bhead button').getBoundingClientRect().top};
        },id);
        assert(end.bottom<=end.edge+1&&end.close>=0,`${id}: last content or close unreachable`);
      } else if(result.cols.length) assert.equal(new Set(result.cols).size,result.cols.length,`${id}: desktop columns`);
      if(process.env.MODAL_SCREENSHOTS && width===390 && height===844) {
        fs.mkdirSync(process.env.MODAL_SCREENSHOTS,{recursive:true});
        await page.evaluate(id=>{document.querySelector('#'+id+' .bbody, #'+id+' .modalbody').scrollTop=0},id);
        await page.screenshot({path:process.env.MODAL_SCREENSHOTS+'/'+id+'.png'});
      }
      await page.$eval(`#${id} .bhead`,e=>e.click());
      assert.notEqual(await page.evaluate(()=>document.activeElement.id),'cmd',`${id}: text steals focus`);
    }
    // Knowledge dialogs use their real scroll containers; map controls must fit.
    for(const id of ['mapm','jrnl','reckm']) {
      const result=await page.evaluate(id=>{
        document.querySelectorAll(MODAL_SURFACES).forEach(e=>e.classList.remove('open'));
        const root=document.getElementById(id);root.classList.add('open');
        if(id==='jrnl') document.getElementById('jbody').innerHTML='<div class="jent">Long journal entry</div>'.repeat(30);
        if(id==='reckm') document.getElementById('reckbody').innerHTML='<div><div class="rrows">Wanderers</div></div>'.repeat(4);
        const box=root.querySelector('.lbox'),r=box.getBoundingClientRect();
        const controls=id==='mapm'?document.getElementById('mapctl').getBoundingClientRect():r;
        return {right:r.right,bottom:r.bottom,controls:controls.bottom,overflow:box.scrollWidth>box.clientWidth+1};
      },id);
      assert(result.right<=width+1&&result.bottom<=height+1&&result.controls<=height+1&&!result.overflow,`${id} ${width}: ${JSON.stringify(result)}`);
    }
    for(const id of ['vmodal','idpanel','setpanel','dealreq']) {
      const result=await page.evaluate(id=>{
        document.querySelectorAll(MODAL_SURFACES).forEach(e=>e.classList.remove('open'));
        const root=document.getElementById(id);root.classList.add('open');
        if(id==='vmodal')document.getElementById('vmtitle').textContent='Enter your vault PIN';
        if(id==='dealreq')renderDealReq({role:'incoming',partner:'A fellow wanderer'});
        const box=root.querySelector('.vbox')||root,r=box.getBoundingClientRect();
        return {right:r.right,bottom:r.bottom,overflow:box.scrollWidth>box.clientWidth+1};
      },id);
      assert(result.right<=width+1&&result.bottom<=height+1&&!result.overflow,`${id} ${width}: ${JSON.stringify(result)}`);
    }
    console.log(`PASS modal layouts ${width}x${height}`);
  }
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.setContent(fixture);
  await page.evaluate(s=>renderBench(s),{...bench,atGate:true});
  await new Promise(r=>setTimeout(r,400));
  // A real Chrome touch event must reach the same server command as a click.
  await page.tap('#bpack .acts button');
  assert.equal(await page.evaluate(()=>sent.at(-1)?.action),'equip');
  await page.evaluate(()=>{sent=[];document.querySelector('#bpack .drop').click()});
  assert.equal(await page.evaluate(()=>sent.length),0,'drop needs confirmation');
  await page.$eval('#bpack .drop',e=>e.click());
  assert.deepEqual(await page.evaluate(()=>sent.at(-1).rows),['0'],'drop only one member of a stack');
  await page.evaluate(()=>{sent=[];document.querySelector('#bpack .burn').click()});
  assert.equal(await page.evaluate(()=>sent.length),0,'burn needs confirmation');
  await page.$eval('#bpack .burn',e=>e.click());
  assert.deepEqual(await page.evaluate(()=>sent.at(-1).rows),['0','100'],'burn retains stack behavior');
  // Exercise gesture guards deterministically, including a browser-generated
  // click following movement/cancellation, and replacement during a press.
  for(const scenario of ['drag','cancel','replace','shift','fresh','valid','keyboard']) {
    const count=await page.evaluate(async scenario=>{
      const root=document.getElementById('bench');
      const b=document.createElement('button'); b.textContent='test';root.querySelector('.bbody').prepend(b);
      let count=0; b.addEventListener('click',()=>count++);
      await new Promise(r=>setTimeout(r,scenario==='fresh'?0:400));
      const r=b.getBoundingClientRect();
      const fire=(target,type,extra={})=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,clientX:r.x+5,clientY:r.y+5,...extra}));
      if(scenario==='keyboard'){b.click();b.remove();return count;}
      fire(b,'pointerdown');
      if(scenario==='drag')fire(b,'pointermove',{clientY:r.y+25});
      if(scenario==='cancel')fire(b,'pointercancel');
      let target=b;
      if(scenario==='replace'){target=b.cloneNode(true);target.addEventListener('click',()=>count++);b.replaceWith(target);}
      if(scenario==='shift')b.style.transform='translateY(20px)';
      fire(target,'pointerup');fire(target,'click',{detail:1});target.remove();return count;
    },scenario);
    assert.equal(count,['valid','keyboard'].includes(scenario)?1:0,scenario);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS touch, update/scroll guards, drop/burn confirmation, keyboard activation');
} finally {await browser.close();}
