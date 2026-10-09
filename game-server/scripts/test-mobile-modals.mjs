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
const mapJS = PAGE.slice(PAGE.indexOf('// ---- the map modal:'), PAGE.indexOf('// ---- the journal modal:'));
const focusJS = PAGE.slice(PAGE.indexOf('document.body.addEventListener("click"'), PAGE.indexOf('// The keys panel:'));
assert(modalJS.includes('renderForge') && focusJS.includes('MODAL_SURFACES'));
const fixture = PAGE.replace(' autofocus', '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') + `<script>
var cmd = document.getElementById('cmd'), chipsEl = document.getElementById('chips'), hpEl = document.getElementById('hp');
${PAGE.slice(PAGE.indexOf('function wholeHp('), PAGE.indexOf('// Glanceable status:'))}
${PAGE.slice(PAGE.indexOf('function phoneControls()'), PAGE.indexOf('function submitCommand()'))}
var sent = [], ws = {readyState:1, send:function(m){sent.push(JSON.parse(m))}};
function hideModalChat(){} function setNote(e,t){e.textContent=t || ''} function print(){}
function rarityClass(r){return 'r-'+r}
function gearNameSpan(n){var e=document.createElement('span');e.textContent=n;return e}
var knownRooms={}; function sndOne(){} function fitPicture(){} function closeJournal(){}
${modalJS}
${mapJS}
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
  await page.setContent(fixture);
  for(const [hp,expected] of [[61.75,61],[99.99,99],[100,100],[0.25,1],[0,0],[-2,0]]) {
    const readings=await page.evaluate(({state,hp})=>{
      renderVitals({hp,max_hp:100,fatigue:0,name:'Wanderer'});
      renderBench({...state,atGate:true,sheet:{...state.sheet,hp,maxHp:100}});
      const initial=dollHpVal.textContent;
      dollPulse(hp,100);
      return {hud:hpEl.querySelector('.vital-hp').textContent,initial,live:dollHpVal.textContent};
    },{state:bench,hp});
    assert.equal(readings.hud,expected+'/100 hp');
    assert(readings.initial.includes(expected+'/100 hp'));assert.equal(readings.live,readings.initial);
  }
  console.log('PASS whole HP in HUD, inventory and live updates, including near-full and near-death values');

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
      if(id==='bench' && state.atGate) {
        await page.$eval('#bench [aria-controls=bvault]',e=>e.click());
        const fullVault={...state,vault:items,vaultUsed:37,vaultCap:50};
        await page.evaluate(s=>renderBench(s),fullVault);
        const capacity=await page.evaluate(()=>{
          const root=document.getElementById('bench'),count=root.querySelector('.bench-capacity');
          root.querySelectorAll('.bbody,.bcol').forEach(el=>{el.scrollTop=el.scrollHeight});
          const r=count.getBoundingClientRect(),box=root.querySelector('.bbox').getBoundingClientRect();
          return {text:count.textContent,visible:r.top>=box.top&&r.bottom<=box.bottom&&!count.closest('.bbody')};
        });
        assert.match(capacity.text,/37\/50/,'vault uses server capacity, not visible row count');
        assert(capacity.visible,'vault capacity stays outside the scroller');
        await page.evaluate(s=>renderBench({...s,vaultUsed:38}),fullVault);
        assert.match(await page.$eval('#bench .bench-capacity',e=>e.textContent),/38\/50/,'capacity updates after storage changes');
        await page.$eval('#bench [aria-controls=bpack]',e=>e.click());
        await page.evaluate(s=>renderBench(s),state);
      }
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
  await page.tap('#bpack .mud-row');
  await new Promise(r=>setTimeout(r,400));
  await page.tap('#bench .mud-reader .acts button');
  assert.equal(await page.evaluate(()=>sent.at(-1)?.action),'equip');
  await page.evaluate(()=>{sent=[];document.querySelector('#bench .mud-reader .drop').click()});
  assert.equal(await page.evaluate(()=>sent.length),0,'drop needs confirmation');
  await page.$eval('#bench .mud-reader .drop',e=>e.click());
  assert.deepEqual(await page.evaluate(()=>sent.at(-1).rows),['0'],'drop only one member of a stack');
  await page.evaluate(()=>{sent=[];document.querySelector('#bench .mud-reader .burn').click()});
  assert.equal(await page.evaluate(()=>sent.length),0,'burn needs confirmation');
  await page.$eval('#bench .mud-reader .burn',e=>e.click());
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
  // Search and section choices survive authoritative item-list refreshes.
  for(const [id,render,state,column,other] of [
    ['bench','renderBench',{...bench,atGate:true},'bpack','block'],
    ['trade','renderTrade',{stock:items,goods:{pack:items},want:null},'tstock','tgoods'],
    ['forge','renderForge',{scrap:20,recipes:items,read:[]},'frecipes','fread']
  ]) {
    await page.evaluate(({id,render,state})=>{
      document.querySelectorAll(MODAL_SURFACES).forEach(e=>e.classList.remove('open'));
      window[render](state);
      const sc=document.querySelector('#'+id+' .bbody, #'+id+' .modalbody');sc.scrollTop=300;
    },{id,render,state});
    const before=await page.$eval('#'+id+' .bbody, #'+id+' .modalbody',e=>e.scrollTop);
    await page.evaluate(({render,state})=>window[render](state),{render,state});
    assert.equal(await page.$eval('#'+id+' .bbody, #'+id+' .modalbody',e=>e.scrollTop),before,id+' preserves scroll');
    await page.$eval('#'+id+' input[type=search]',e=>{e.value='watch 11';e.dispatchEvent(new Event('input'))});
    assert.equal(await page.$$eval('#'+column+' :is(.bitem,.trow):not(.list-filtered)',els=>els.length),1,id+' filters by name');
    await page.evaluate(({render,state})=>window[render](state),{render,state});
    assert.equal(await page.$$eval('#'+column+' :is(.bitem,.trow):not(.list-filtered)',els=>els.length),1,id+' retains search on update');
    await page.$eval('#'+id+' input[type=search]',e=>{e.value='no such gear';e.dispatchEvent(new Event('input'))});
    assert.equal(await page.$eval('#'+column+' .list-empty',e=>e.hidden),false,id+' explains no matches');
    await page.$eval('#'+id+' input[type=search]',e=>{e.value='';e.dispatchEvent(new Event('input'))});
    await page.$eval('#'+id+' [aria-controls='+other+']',e=>e.click());
    assert.equal(await page.$eval('#'+other,e=>getComputedStyle(e).display),'flex',id+' switches section');
    assert.equal(await page.$eval('#'+column,e=>getComputedStyle(e).display),'none',id+' hides previous section on phone');
    await page.evaluate(({render,state})=>window[render](state),{render,state});
    assert.equal(await page.$eval('#'+id+' [aria-controls='+other+']',e=>e.getAttribute('aria-pressed')),'true',id+' retains section');
  }
  await page.evaluate(s=>{
    closeForge();renderBench({...s,atGate:true});listViews.bench.selected='bvault';refreshListView('bench');
    renderBench({...s,atGate:false});
  },bench);
  assert.equal(await page.evaluate(()=>listViews.bench.selected),'bpack','leaving gate cannot leave an unavailable vault selected');
  await page.evaluate(s=>{closeBench();renderForge({scrap:20,recipes:s,read:[]})},items.map((it,i)=>({...it,can:i%2===0})));
  await page.$eval('#forge input[type=checkbox]',e=>{e.checked=true;e.dispatchEvent(new Event('change'))});
  assert.equal(await page.$$eval('#frecipes .bitem:not(.list-filtered)',els=>els.length),6,'can-forge filter');
  await page.focus('#fclose');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(()=>document.getElementById('forge').contains(document.activeElement)),true,'focus stays in dialog');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>sent.at(-1)?.action),'close','Escape follows server close protocol');
  console.log('PASS search, section persistence, availability filter, focus and scroll retention');
  const trading={stock:items,goods:{pack:items},want:{items:[items[0],items[0],items[1]],cost:12,paid:4}};
  await page.evaluate(s=>{closeForge();renderTrade(s)},trading);
  assert.equal(await page.$eval('#twant details',e=>e.open),false,'counter starts compact');
  assert.match(await page.$eval('#twant .wprog',e=>e.textContent),/8 short/,'payment stays visible');
  await page.$eval('#twant summary',e=>e.click());
  await page.evaluate(s=>renderTrade(s),trading);
  assert.equal(await page.$eval('#twant details',e=>e.open),true,'expanded counter survives update');
  assert.equal(await page.$$eval('#twant .wrow',els=>els.length),2,'counter groups duplicate wants');
  await page.$eval('#twant .wrow button',e=>e.click());
  assert.equal(await page.evaluate(()=>sent.at(-1)?.action),'unbuy','counter still removes one selected copy');
  await page.evaluate(()=>closeTrade());
  console.log('PASS compact barter counter and unchanged removal command');
  // Shared reader: real action placement, stat colors and description toggle.
  await page.evaluate(s=>{closeTrade();renderBench({...s,atGate:true,inGatehouse:true,loadouts:[],pack:s.pack.map(it=>({...it,description:'A worn blade, carried through the northern passes.'}))});listViews.bench.selected='bpack';refreshListView('bench')},bench);
  await page.$eval('#bpack .mud-row',e=>e.click());
  assert(await page.$eval('#bench .mud-reader .mud-stats .st-atk',e=>e.textContent.includes('dmg')));
  await page.$eval('#bench .mud-reader .acts button',e=>e.click());
  assert.equal(await page.$eval('#bench .mud-description',e=>e.hidden),false,'Look reveals description');
  await page.$eval('#bench .mud-reader .acts button',e=>e.click());
  assert.equal(await page.$eval('#bench .mud-description',e=>e.hidden),true,'Look collapses description');
  await page.$eval('#bench .loadout-opener',e=>e.click());
  await page.type('#bench-loadouts input','Travel');
  await page.$eval('#bench-loadouts .loadout-line:last-child button',e=>e.click());
  assert.deepEqual(await page.evaluate(()=>sent.at(-1)),{v:0,t:'bench',action:'loadout-save',id:null,name:'Travel'});
  const presets=[{id:'saved-set',name:'Travel',slots:{weapon:{row:'0',name:'Weathered sword'}}}];
  await page.evaluate(({s,presets})=>renderBench({...s,atGate:true,inGatehouse:true,loadouts:presets}),{s:bench,presets});
  for(const [index,action] of [[0,'equip'],[1,'update'],[2,'delete']]) {
    await page.$$eval('#bench-loadouts .loadout-line:first-child button',(els,index)=>els[index].click(),index);
    assert.equal(await page.evaluate(()=>sent.at(-1).action),'loadout-'+action);
    assert.equal(await page.evaluate(()=>sent.at(-1).id),'saved-set');
  }
  await page.evaluate(s=>renderBench({...s,atGate:true,inGatehouse:false}),bench);
  assert.equal(await page.$eval('#bench .loadout-opener',e=>e.hidden),true,'outside gatehouse hides loadouts');
  await page.evaluate(s=>{closeBench();renderTrade({stock:s,goods:{pack:[]},want:null});listViews.trade.selected='tstock';refreshListView('trade')},items);
  await page.$eval('#tstock .mud-row',e=>e.click());
  assert.equal(await page.$eval('#trade .mud-cost',e=>e.textContent),'Cost: 4');
  assert.equal(await page.$eval('#trade .mud-cost',e=>e.parentElement.className),'acts','cost and buy share action row');
  assert.equal(await page.$eval('#trade .mud-stats',e=>getComputedStyle(e).justifyContent),'flex-start');
  console.log('PASS item description, shared stat/cost reader, server loadout commands and gatehouse-only controls');


  const map={detailed:true,here:'r0',regions:[{key:'road',rooms:Array.from({length:20},(_,i)=>({id:'r'+i,name:'Road '+i,x:i,y:0,here:i===0,exits:i<19?[{dir:'east',to:'r'+(i+1)}]:[]}))}]};
  await page.evaluate(f=>{closeForge();renderMap(f)},map);
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.$eval('#mapzfit',e=>e.click());
  assert(await page.evaluate(()=>mapCam.scale<0.4),'fit chart reaches overview scale');
  assert(await page.evaluate(()=>Object.values(mapGraph.placed).every(p=>Math.abs((p.x-mapCam.cx)*MAP_CELL*mapCam.scale)<mapWrap.clientWidth/2)),'all chart rooms fit');
  await page.$eval('#mapzhere',e=>e.click());
  assert.equal(await page.evaluate(()=>mapCam.cx),0,'center returns to player');
  assert(await page.evaluate(()=>mapCam.scale>=0.8),'center restores readable scale');
  await page.focus('#mapcv');await page.keyboard.press('ArrowRight');
  assert(await page.evaluate(()=>mapCam.cx>0),'keyboard pans map');
  await page.keyboard.press('Home');
  const scale=await page.evaluate(()=>mapCam.scale);
  await page.evaluate(()=>{
    const cv=mapCv,r=cv.getBoundingClientRect();
    function pointer(type,id,x){cv.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.x+x,clientY:r.y+150,bubbles:true}))}
    pointer('pointerdown',1,100);pointer('pointerdown',2,200);pointer('pointermove',2,250);
    pointer('pointerup',1,100);pointer('pointerup',2,250);
  });
  assert(await page.evaluate(()=>mapCam.scale)>scale,'two-finger pinch zooms');
  await page.evaluate(()=>renderMap({detailed:true,regions:[]}));
  await page.$eval('#mapzfit',e=>e.click());
  assert(await page.evaluate(()=>Number.isFinite(mapCam.scale)),'empty chart fit is safe');
  if(process.env.MODAL_SCREENSHOTS){
    await page.evaluate(f=>renderMap(f),map);await page.evaluate(()=>new Promise(requestAnimationFrame));
    await page.screenshot({path:process.env.MODAL_SCREENSHOTS+'/map.png'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS map fit, recenter, keyboard, pinch and empty chart');
  // Classic uses the original item builders/columns; switching is presentation only.
  await page.evaluate(()=>{closeMap();document.getElementById('modallayoutbtn').click()});
  assert.equal(await page.evaluate(()=>document.body.dataset.modalLayout),'classic');
  for(const [width,height] of [[390,844],[320,568],[1280,800]]) {
    await page.setViewport({width,height,isMobile:width<680,hasTouch:width<680,deviceScaleFactor:1});
    await page.setContent(fixture);
    await page.$eval('#modallayoutbtn',e=>e.click());
    for(const [id,render,state] of cases.filter(c=>['bench','trade','forge'].includes(c[0]))) {
      await page.evaluate(({id,render,state})=>{
        document.querySelectorAll(MODAL_SURFACES).forEach(e=>e.classList.remove('open'));
        window[render](state);
      },{id,render,state});
      const result=await page.evaluate(id=>{
        const root=document.getElementById(id),box=root.querySelector('.bbox'),r=box.getBoundingClientRect();
        const cols=[...root.querySelectorAll('.bcol')].filter(c=>getComputedStyle(c).display!=='none');
        return {right:r.right,bottom:r.bottom,overflow:box.scrollWidth>box.clientWidth+1,
          rows:root.querySelectorAll('.mud-row').length,cols:cols.length,actions:root.querySelectorAll('.bcol button').length};
      },id);
      assert(!result.overflow&&result.right<=width+1&&result.bottom<=height+1,`${id} classic ${width}: ${JSON.stringify(result)}`);
      assert.equal(result.rows,0,'classic uses per-item content');assert(result.actions>0,'classic has inline actions');
      if(width>=680)assert(result.cols>=2,'classic desktop restores multiple columns');
    }
  }
  await page.evaluate(s=>{
    closeForge();renderBench({...s,atGate:true,inGatehouse:true,loadouts:[],pack:s.pack.map(it=>({...it,description:'A real description.'}))});
    listViews.bench.selected='bpack';refreshListView('bench');sent=[];
  },bench);
  await page.$eval('#bpack .acts button',e=>e.click());
  assert.equal(await page.$eval('#bpack .mud-description',e=>e.hidden),false,'classic retains Look');
  await page.$eval('#bpack .acts button:nth-child(2)',e=>e.click());
  assert.equal(await page.evaluate(()=>sent.at(-1).action),'equip','classic uses the same equipment command');
  assert(await page.$eval('#bench .list-tools .loadout-opener',e=>e.getClientRects().length>0),'classic keeps loadouts accessible');
  const count=await page.evaluate(()=>sent.length);
  await page.$eval('#modallayoutbtn',e=>e.click());
  assert.equal(await page.evaluate(()=>sent.length),count,'layout change sends no gameplay commands');
  assert(await page.$eval('#bench',e=>e.classList.contains('open')),'switch keeps inventory open');
  assert(await page.$$eval('#bpack .mud-row',els=>els.length>0),'switch rebuilds compact rows');
  assert.equal(await page.evaluate(()=>document.body.dataset.modalLayout),'compact');
  assert.deepEqual(errors,[]);
  console.log('PASS classic desktop/mobile layouts, inline actions, descriptions/loadouts and live layout switching');
  // Every palette needs a real ornament mask: a missing mask paints the entire
  // panel in translucent gold instead of drawing just its border details.
  const palettes=Function('return ('+PAGE.slice(PAGE.indexOf('var THEMES = {')+13,PAGE.indexOf('\n};',PAGE.indexOf('var THEMES = {'))+2)+')')();
  const masksByTheme=new Map();
  for(const layout of ['compact','classic']) {
    for(const [theme,colors] of [...Object.entries(palettes),['custom',palettes.charcoal]]) {
      for(const design of [false,true]) {
        await page.evaluate(({layout,theme,colors,design,state})=>{
          if(modalLayout!==layout)document.getElementById('modallayoutbtn').click();
          Object.entries(colors).forEach(([key,value])=>document.documentElement.style.setProperty('--'+key,value));
          document.body.dataset.ornate=theme;document.body.dataset.atmosphere=design?theme:'';
          document.getElementById('room').textContent='The Gatehouse';
          renderBench({...state,atGate:true});
        },{layout,theme,colors,design,state:bench});
        const paint=await page.evaluate(()=>{
          const box=document.querySelector('#bench .bbox');
          return {mask:getComputedStyle(box,'::after').maskImage,roomMask:getComputedStyle(document.getElementById('roomframe'),'::before').maskImage,bg:getComputedStyle(box).backgroundColor};
        });
        assert(paint.mask.includes('data:image/svg+xml'),`${theme}/${layout}/design=${design}: missing panel ornament mask (${paint.mask})`);
        assert(paint.roomMask.includes('data:image/svg+xml'),`${theme}: missing room ornament mask`);
        masksByTheme.set(theme,paint.roomMask);
        if(theme==='charcoal')assert.equal(paint.bg,'rgb(24, 26, 29)','Charcoal keeps its dark panel with theme design enabled');
        if(process.env.MODAL_SCREENSHOTS&&theme==='charcoal'&&design)await page.screenshot({path:process.env.MODAL_SCREENSHOTS+'/charcoal-'+layout+'.png'});
      }
    }
  }
  assert.equal(new Set(masksByTheme.values()).size,masksByTheme.size,'every theme has a distinct ornament, including Charcoal');
  await page.evaluate(()=>{document.body.dataset.ornate='future-theme'});
  assert.match(await page.$eval('#bench .bbox',e=>getComputedStyle(e,'::after').maskImage),/gradient/,'unknown themes receive a transparent mask, never a solid overlay');
  await page.evaluate(()=>{document.body.dataset.ornate='';document.body.dataset.atmosphere=''});
  assert.equal(await page.$eval('#bench .bbox',e=>getComputedStyle(e,'::after').content),'none','ornaments can still be disabled');
  console.log('PASS all palette ornament masks, both layouts, theme design on/off, Charcoal background and safe unknown-theme fallback');


} finally {await browser.close();}
