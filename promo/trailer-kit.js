/* NOMAD trailer kit.
 *
 * The terminal, the sound, and the contract the capture harness depends on —
 * shared, so a trailer file is nothing but its own words and its own timing.
 *
 * WHAT A TRAILER FILE OWES THE HARNESS (capture.mjs), all handled here:
 *   window.__renderAudio(dur, offset) -> base64 wav, rebuilt offline
 *   window.__take = { t0, log }       -> when the take is good
 *   #hint gets .show                  -> the "stop recording" signal
 *   window.__T = { beat: seconds }    -> so probe.mjs can sample the beats
 *
 * A trailer calls KIT.mount(), then KIT.begin(), schedules with KIT.at(),
 * and closes with KIT.finish(). See nomad-mountain.html for the pattern.
 *
 * THE ONE RULE ABOUT TEXT: every word a trailer puts on screen is the game's
 * own, off the region files or the source. If a line has to be written for the
 * trailer it belongs on a card, not in the terminal.
 */
window.KIT = (() => {

  // ---- sound ----------------------------------------------------------
  const SFX = {
    _noise(ctx){ if(ctx.__nb)return ctx.__nb; const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; ctx.__nb=b; return b; },
    _burst(ctx,t,{type="lowpass",freq=300,q=1,dur=0.1,gain=0.3,sweep=0}){
      const src=ctx.createBufferSource();src.buffer=this._noise(ctx);
      const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(freq,t);
      if(sweep)f.frequency.exponentialRampToValueAtTime(Math.max(sweep,20),t+dur);
      const g=ctx.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      src.connect(f).connect(g).connect(ctx.destination);src.start(t,Math.random());src.stop(t+dur+0.05); },
    _tone(ctx,t,{type="sine",f0=440,f1=0,dur=0.3,gain=0.2}){
      const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);
      if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
      const g=ctx.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
      o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+0.05); },

    // a bed that runs under a whole trailer and can be aimed: outdoors it is
    // wind, in the deep it is the room's own breathing
    bed(ctx,t,end,{from=0.03,to=0.09,f0=340,f1=1100,q=0.7}={}){ if(end-t<=0)return;
      const src=ctx.createBufferSource();src.buffer=this._noise(ctx);src.loop=true;
      const f=ctx.createBiquadFilter();f.type="bandpass";f.Q.value=q;
      f.frequency.setValueAtTime(f0,t);f.frequency.linearRampToValueAtTime(f1,end);
      const g=ctx.createGain();g.gain.setValueAtTime(from,t);g.gain.linearRampToValueAtTime(to,end);
      const lfo=ctx.createOscillator();lfo.frequency.value=0.16;const lg=ctx.createGain();lg.gain.value=0.03;
      lfo.connect(lg).connect(g.gain);lfo.start(t);lfo.stop(end);
      src.connect(f).connect(g).connect(ctx.destination);src.start(t);src.stop(end); },
    bedOut(ctx,t,dur=1.2){
      const src=ctx.createBufferSource();src.buffer=this._noise(ctx);src.loop=true;
      const f=ctx.createBiquadFilter();f.type="bandpass";f.Q.value=0.7;f.frequency.setValueAtTime(1200,t);
      f.frequency.exponentialRampToValueAtTime(110,t+dur);
      const g=ctx.createGain();g.gain.setValueAtTime(0.10,t);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
      src.connect(f).connect(g).connect(ctx.destination);src.start(t);src.stop(t+dur+0.1); },

    key(ctx,t){ this._burst(ctx,t,{type:"bandpass",freq:2400,q:6,dur:0.022,gain:0.10}); },
    step(ctx,t){this._burst(ctx,t,{freq:230,dur:0.08,gain:0.34});this._tone(ctx,t,{f0:60,f1:38,dur:0.1,gain:0.4});},
    steps(ctx,t,n=4,dt=0.36){ for(let i=0;i<n;i++)this.step(ctx,t+i*dt); },
    bones(ctx,t){ for(let i=0;i<5;i++) this._burst(ctx,t+i*0.055+Math.random()*0.03,
      {type:"bandpass",freq:1500+Math.random()*900,q:7,dur:0.06,gain:0.18}); },
    hit(ctx,t){this._burst(ctx,t,{type:"bandpass",freq:420,q:1.5,dur:0.16,gain:0.40});this._tone(ctx,t,{f0:120,f1:60,dur:0.18,gain:0.30});},
    crit(ctx,t){this.hit(ctx,t);this._burst(ctx,t,{type:"bandpass",freq:1900,q:9,dur:0.07,gain:0.45});this._tone(ctx,t,{f0:80,f1:30,dur:0.5,gain:0.5});},
    heart(ctx,t){this._tone(ctx,t,{f0:72,f1:42,dur:0.16,gain:0.55});this._tone(ctx,t+0.27,{f0:62,f1:36,dur:0.18,gain:0.45});},
    death(ctx,t){this._tone(ctx,t,{f0:200,f1:34,dur:1.8,gain:0.52});this._burst(ctx,t+0.1,{freq:300,sweep:60,dur:1.5,gain:0.26});},
    // the gate closing over what you brought back: the one good sound
    seal(ctx,t){[523.25,783.99,1046.5].forEach((f,i)=>this._tone(ctx,t+i*0.09,{f0:f,dur:2.0,gain:0.15}));
      this._tone(ctx,t,{f0:130,f1:260,dur:0.4,gain:0.11});},
    roar(ctx,t){
      const o=ctx.createOscillator();o.type="sawtooth";
      o.frequency.setValueAtTime(96,t);o.frequency.linearRampToValueAtTime(74,t+1.5);o.frequency.linearRampToValueAtTime(52,t+2.6);
      const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(260,t+2.6);
      const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.72,t+0.35);
      g.gain.setValueAtTime(0.72,t+1.7);g.gain.exponentialRampToValueAtTime(0.001,t+2.7);
      const lfo=ctx.createOscillator();lfo.frequency.value=23;const lg=ctx.createGain();lg.gain.value=26;
      lfo.connect(lg).connect(o.frequency);lfo.start(t);lfo.stop(t+2.7);
      o.connect(f).connect(g).connect(ctx.destination);o.start(t);o.stop(t+2.8);
      this._tone(ctx,t,{f0:44,f1:31,dur:2.6,gain:0.48});
      const e=t+1.15; const o2=ctx.createOscillator();o2.type="sawtooth";
      o2.frequency.setValueAtTime(72,e);o2.frequency.linearRampToValueAtTime(50,e+1.6);
      const f2=ctx.createBiquadFilter();f2.type="lowpass";f2.frequency.value=420;
      const g2=ctx.createGain();g2.gain.setValueAtTime(0.0001,e);g2.gain.exponentialRampToValueAtTime(0.19,e+0.3);
      g2.gain.exponentialRampToValueAtTime(0.001,e+1.7);
      o2.connect(f2).connect(g2).connect(ctx.destination);o2.start(e);o2.stop(e+1.8); },
    drop(ctx,t){this._tone(ctx,t,{f0:92,f1:30,dur:1.6,gain:0.95});this._burst(ctx,t,{freq:200,dur:0.5,gain:0.45});this._tone(ctx,t,{type:"sine",f0:55,dur:2.4,gain:0.45});},
    chime(ctx,t){[523.25,783.99,1046.5].forEach((f,i)=>this._tone(ctx,t+i*0.09,{f0:f,dur:2.0,gain:0.14}));},
  };

  let actx=null, sfxLog=[], t0Perf=performance.now();
  let term=null, card=null, hint=null, sndhint=null, timers=[], run=0;

  const updateSndHint=()=>sndhint&&sndhint.classList.toggle("show",!(actx&&actx.state==="running"));
  function ensureAudio(){ if(!actx){try{actx=new AudioContext();}catch{}}
    if(actx&&actx.state==="suspended")actx.resume().catch(()=>{});
    if(actx)actx.onstatechange=updateSndHint; updateSndHint(); return actx; }
  function playSfx(name,...a){ sfxLog.push([name,(performance.now()-t0Perf)/1000,a]);
    if(actx&&actx.state==="running"){try{SFX[name](actx,actx.currentTime+0.02,...a);}catch{}} }

  window.__renderAudio=async(dur,offset)=>{
    const sr=44100,oc=new OfflineAudioContext(1,Math.ceil(sr*dur),sr);
    for(const [name,tRel,a] of (window.__take?.log??sfxLog)){ const t=tRel+offset;
      if(t>=0&&t<dur-0.05){try{SFX[name](oc,t,...a);}catch{}} }
    const buf=await oc.startRendering(),ch=buf.getChannelData(0);
    const ab=new ArrayBuffer(44+ch.length*2),v=new DataView(ab);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    w(0,"RIFF");v.setUint32(4,36+ch.length*2,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,ch.length*2,true);
    for(let i=0;i<ch.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,ch[i]))*0x7fff,true);
    const bytes=new Uint8Array(ab);let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
    return btoa(bin);
  };

  // ---- the screen -----------------------------------------------------
  const CSS = `
  :root{--amber:#E0B25C;--amber-dim:#8A6D38;--blood:#A63226;--bone:#D8D2C4;--gold:#F0C86A;--slate:#6E7A85;
    --mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace;}
  html,body{height:100%;}
  body{margin:0;background:#020202;display:flex;align-items:center;justify-content:center;font-family:var(--mono);overflow:hidden;cursor:pointer;}
  #stage{position:relative;aspect-ratio:16/9;width:min(100vw,177.78vh);overflow:hidden;background:#000;}
  #stage::before{content:"";position:absolute;inset:0;z-index:6;pointer-events:none;
    background:repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0 1px,transparent 1px 3px);}
  #stage::after{content:"";position:absolute;inset:0;z-index:7;pointer-events:none;
    background:radial-gradient(ellipse 92% 86% at 50% 46%,transparent 52%,rgba(0,0,0,0.62) 100%);}
  #term{position:absolute;left:11%;right:11%;top:50%;transform:translateY(-50%);z-index:5;
    display:flex;flex-direction:column;gap:.85em;}
  .ln{opacity:0;transition:opacity .5s ease;}
  .ln.in{opacity:1;}
  .cmd{color:var(--amber-dim);font-size:clamp(11px,1.5vw,22px);letter-spacing:.04em;}
  .cmd b{color:var(--amber);font-weight:400;}
  .room{color:var(--amber);font-size:clamp(15px,2.2vw,33px);letter-spacing:.05em;font-weight:700;}
  .prose{color:var(--bone);opacity:.82;font-size:clamp(12px,1.72vw,26px);line-height:1.62;max-width:38em;}
  .feed{color:var(--blood);font-size:clamp(12px,1.72vw,26px);line-height:1.62;max-width:38em;text-shadow:0 0 14px rgba(166,50,38,.4);}
  .gain{color:var(--gold);font-size:clamp(12px,1.72vw,26px);line-height:1.62;max-width:38em;text-shadow:0 0 14px rgba(240,200,106,.35);}
  .sys{color:var(--slate);font-size:clamp(10px,1.35vw,20px);letter-spacing:.22em;text-transform:uppercase;}
  #card{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;opacity:0;transition:opacity .55s ease;pointer-events:none;padding:0 9%;}
  #card.show{opacity:1;}
  .eyebrow{color:var(--slate);font-size:clamp(9px,1.2vw,18px);letter-spacing:.42em;text-transform:uppercase;margin-bottom:1.2em;}
  .toll{color:var(--blood);font-size:clamp(17px,2.9vw,44px);line-height:1.35;font-weight:700;text-shadow:0 0 18px rgba(166,50,38,.55);}
  .claim{color:var(--bone);font-size:clamp(17px,2.9vw,44px);line-height:1.35;font-weight:700;text-shadow:0 0 20px rgba(216,210,196,.25);}
  .after{color:var(--slate);font-size:clamp(11px,1.6vw,24px);line-height:1.6;margin-top:1.2em;}
  .wordmark{color:var(--amber);font-weight:800;font-size:clamp(56px,13vw,190px);letter-spacing:.02em;line-height:1;
    text-shadow:0 0 30px rgba(224,178,92,.55),0 0 90px rgba(224,178,92,.25);}
  .tagsub{color:var(--bone);font-size:clamp(13px,2.1vw,31px);letter-spacing:.05em;margin-top:.25em;}
  .url{color:var(--gold);font-weight:800;font-size:clamp(20px,3.4vw,50px);letter-spacing:.04em;margin-top:.55em;
    text-shadow:0 0 18px rgba(240,200,106,.5);}
  .stat{color:var(--amber-dim);font-size:clamp(10px,1.3vw,19px);letter-spacing:.3em;margin-top:1.5em;text-transform:uppercase;}
  @keyframes tremor{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.1px,.5px)}50%{transform:translate(.8px,-.6px)}75%{transform:translate(-.5px,-.4px)}}
  .shake{animation:tremor .09s infinite;}
  #hint,#sndhint{position:absolute;bottom:2.8%;z-index:9;color:var(--amber-dim);font-size:clamp(9px,1vw,14px);
    letter-spacing:.15em;opacity:0;transition:opacity .8s ease;pointer-events:none;}
  #hint{right:2.2%;} #sndhint{left:2.2%;}
  #hint.show,#sndhint.show{opacity:.85;}`;

  // A trailer file is all head and no markup, so its script runs before the
  // parser has made a body to mount into. Everything goes through here.
  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  function mount(){
    const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    const stage=document.createElement("div"); stage.id="stage";
    stage.innerHTML='<div id="term"></div><div id="card"></div>'
      +'<div id="sndhint">CLICK FOR SOUND</div><div id="hint">CLICK &middot; REPLAY</div>';
    document.body.appendChild(stage);
    term=stage.querySelector("#term"); card=stage.querySelector("#card");
    hint=stage.querySelector("#hint"); sndhint=stage.querySelector("#sndhint");
  }

  // ---- terminal -------------------------------------------------------
  const at=(ms,fn)=>{ timers.push(setTimeout(fn,ms)); };
  function line(cls,html){ const d=document.createElement("div"); d.className="ln "+cls; d.innerHTML=html;
    term.appendChild(d); requestAnimationFrame(()=>d.classList.add("in")); return d; }
  function clearTerm(){ [...term.children].forEach(c=>c.classList.remove("in")); at(560,()=>{ term.innerHTML=""; }); }
  function showCard(html){ card.innerHTML=html; card.classList.add("show"); }
  function hideCard(){ card.classList.remove("show"); }

  // A room's prose has to HOLD long enough to be read — a text game that does
  // not let you read is advertising the wrong thing.
  const holdFor=(s)=>Math.max(2600,Math.min(6200,String(s).split(/\s+/).length*260));

  function begin(){
    const token=++run;
    timers.forEach(clearTimeout); timers=[];
    term.innerHTML=""; hideCard(); card.innerHTML="";
    // the hint is NOT cleared: it is the recorder's stop signal, and a looping
    // page that takes it back down can pull it out from under a poll
    t0Perf=performance.now(); window.__t0Wall=Date.now(); sfxLog=[];
    ensureAudio();
    return token;
  }
  function finish(marks,totalMs,token,replay){
    marks.END=totalMs/1000; window.__T=marks;
    at(totalMs,()=>{ hint.classList.add("show"); window.__take={t0:window.__t0Wall,log:sfxLog.slice()}; });
    at(totalMs+3200,()=>{ if(token===run) replay(); });
  }
  function bindReplay(fn){
    document.body.addEventListener("click",fn);
    document.addEventListener("keydown",e=>{ if(e.key==="r"||e.key==="R") fn(); });
  }
  const isShort=()=>new URLSearchParams(location.search).get("cut")==="short";

  return { SFX, ready, mount, at, line, clearTerm, showCard, hideCard, holdFor,
           begin, finish, bindReplay, playSfx, ensureAudio, isShort };
})();
