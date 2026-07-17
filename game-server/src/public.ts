// The whole client: one page, one log, one input line. Text is the art.
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>NOMAD — the Door</title>
<meta name="description" content="A living text dungeon on Nostr. Your key is your character. The dead stay dead.">
<link rel="icon" type="image/png" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#16120c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NOMAD">
<meta property="og:title" content="NOMAD — the Door">
<meta property="og:description" content="A living text dungeon on Nostr. Your key is your character. What you carry is provisional until the gate seals it — and the dead stay dead.">
<meta property="og:url" content="https://nomadmud.com">
<meta property="og:image" content="https://nomadmud.com/og.jpg?v=2">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="NOMAD — the Door">
<meta name="twitter:description" content="A living text dungeon on Nostr. The dead stay dead.">
<meta name="twitter:image" content="https://nomadmud.com/og.jpg?v=2">
<style>
  :root {
    --bg: #16120c;
    --panel: #1e1912;
    --cream: #ede3cc;
    --dim: #9a8b66;
    --gold: #d8a94e;
    --blood: #c96f5a;
    --bone: #c9bda3;
    --steel: #a4bec0;
    --heal: #8faa6b;
    --omen: #b195c9;
    --voice: #e79ab6;
    --name-s: 55%; /* key-coloured names: saturation/lightness, reset per theme from its ground (applyThemeColors) */
    --name-l: 70%;
    --border: #3a3020;
    --border2: #4a3c22;
    --line: #2c2418;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scrollbar-color: var(--border) var(--bg); scrollbar-width: thin; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 5px; border: 2px solid var(--bg); }
  ::-webkit-scrollbar-thumb:hover { background: var(--border2); }
  html, body { height: 100%; }
  @supports (height: 100dvh) { html, body { height: 100dvh; } }
  body {
    background: var(--bg);
    color: var(--cream);
    font-family: var(--theme-font, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
    font-size: 15px;
    /* A worn theme may swap the face; this pins every font to the monospace
       x-height so a big-running display face can't change the text size. */
    font-size-adjust: var(--theme-fadjust, none);
    line-height: 1.55;
    display: flex;
    flex-direction: column;
  }
  #bar {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding: 10px 14px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    color: var(--dim);
    white-space: nowrap;
    overflow: hidden;
  }
  #bar .brand { color: var(--gold); letter-spacing: 0.18em; cursor: pointer; user-select: none; }
  #setpanel {
    position: absolute;
    top: 44px;
    left: 10px;
    z-index: 10;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    width: min(92vw, 320px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    display: none;
    padding: 12px 14px;
  }
  #setpanel.open { display: block; }
  #setpanel .lbl {
    display: block;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    color: var(--dim);
    margin-bottom: 9px;
  }
  #setpanel .setrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  #setpanel .setrow { margin-top: 8px; }
  #setpanel .lbl + .setrow { margin-top: 0; }
  #setpanel .setrow > span { color: var(--cream); font-size: 13px; }
  #setpanel button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--dim);
    font: inherit;
    font-size: 12px;
    letter-spacing: 0.1em;
    padding: 4px 12px;
    cursor: pointer;
    min-width: 56px;
  }
  #setpanel button:hover { border-color: var(--gold); }
  #setpanel .abtn {
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--dim);
    font-size: 12px;
    letter-spacing: 0.1em;
    padding: 4px 12px;
    text-decoration: none;
    min-width: 56px;
    text-align: center;
  }
  #setpanel .abtn:hover { border-color: var(--gold); color: var(--gold); }
  #setpanel button.on { color: var(--gold); border-color: var(--border2); }
  #thlist { display: none; margin: 8px 0; border-top: 1px solid var(--line); padding-top: 8px; max-height: 260px; overflow-y: auto; overflow-x: hidden; }
  #thlist.open { display: block; }
  #thlist .thent {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-top: 6px;
    text-align: left;
    min-width: 0;
    overflow: hidden;
  }
  #thlist .thent .nm { color: var(--cream); flex: 1 1 auto; min-width: 3em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #thlist .thent .who { color: var(--dim); font-size: 10px; flex: 0 1 auto; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #thlist .dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--line); flex: none; }
  #thlist .thempty { color: var(--dim); font-size: 12px; margin-top: 6px; }
  #thlist .thpager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 8px; }
  #thlist .thpager button { min-width: 0; padding: 3px 10px; font-size: 11px; }
  #thlist .thpager button:disabled { opacity: 0.35; cursor: default; }
  #thlist .thpager span { color: var(--dim); font-size: 11px; }
  #bar .hp-low { color: var(--blood); }
  /* The bar must never lose its two doors: NOMAD (settings) and the name
     (keys). The room label is the one that gives — it shrinks and ellipsizes
     first (the log already says where you are); a marathon name ellipsizes
     last. Without these, a phone clips one end of the bar or the other. */
  #room { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: center; }
  #idbtn { cursor: pointer; user-select: none; min-width: 0; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #idbtn .caret { color: var(--gold); }
  #brand .caret { color: var(--gold); letter-spacing: 0; margin-left: 0.15em; font-size: 0.85em; }
  /* Kill the 350ms double-tap-zoom dance: combat is tapping the same chip
     fast, and iOS would zoom the page mid-fight without this. */
  button, #idbtn, #brand { touch-action: manipulation; }
  /* glanceable status: active effects as compact tags beside the hp button */
  #rightbar { display: flex; align-items: center; gap: 0.55em; min-width: 0; }
  /* Wound tags never shrink: under a tight bar the name (#idbtn) yields to
     ellipsis before a pill is clipped — combat state is urgent, identity you
     already know. Realistic max is 3 pills; a rare 4th runs off the edge
     rather than crushing the others. */
  #fx { display: flex; gap: 5px; overflow: hidden; flex-shrink: 0; }
  .fxtag { font-size: 11px; line-height: 1.65; padding: 0 8px; border-radius: 999px; border: 1px solid currentColor; background: color-mix(in srgb, currentColor 14%, transparent); letter-spacing: 0.03em; white-space: nowrap; }
  .fx-blood { color: var(--blood); }
  .fx-warn { color: var(--gold); }
  .fx-heal { color: var(--heal); }
  #idpanel {
    position: absolute;
    top: 44px;
    right: 10px;
    z-index: 10;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0;
    width: min(92vw, 360px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    display: none;
  }
  #idpanel.open { display: block; }
  #idpanel, #setpanel { max-height: calc(100dvh - 60px); overflow-y: auto; }
  #idpanel .sect { padding: 12px 14px; }
  #idpanel .sect + .sect { border-top: 1px solid var(--line); }
  #idpanel .lbl {
    display: block;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    color: var(--dim);
    margin-bottom: 7px;
  }
  #idpanel .ident { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
  #idname { color: var(--gold); }
  #idnpub { color: var(--dim); font-size: 12px; cursor: pointer; }
  #idnpub:hover { color: var(--cream); }
  #idpanel .note {
    display: block;
    margin-top: 7px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--dim);
  }
  #idpanel .row { display: flex; gap: 6px; margin-top: 8px; }
  #idpanel .row:first-child { margin-top: 0; }
  #idpanel button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--cream);
    font: inherit;
    font-size: 13px;
    padding: 6px 10px;
    cursor: pointer;
    flex: 1;
    white-space: nowrap;
  }
  #idpanel button:hover { color: var(--gold); border-color: var(--gold); }
  #idpanel button.primary { color: var(--gold); border-color: var(--border2); width: 100%; }
  #idpanel button.soon { opacity: 0.45; border-style: dashed; cursor: default; }
  #idpanel button.soon:hover { color: var(--cream); border-color: var(--border); }
  /* The vault's PIN dialog: in-world, masked — a PIN never sits on screen in
     plaintext, and never goes through a browser prompt. */
  #vmodal {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.65);
    align-items: center; justify-content: center;
  }
  #vmodal.open { display: flex; }
  #vmodal .vbox {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 18px; width: min(380px, 92vw);
    display: flex; flex-direction: column; gap: 12px;
  }
  #vmtitle { color: var(--cream); font-size: 14px; line-height: 1.4; }
  #vminput {
    background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
    color: var(--cream); font: inherit; padding: 8px 10px; width: 100%;
  }
  #vminput:focus { border-color: var(--gold); outline: none; }
  #vmodal .vrow { display: flex; gap: 8px; justify-content: flex-end; }
  #vmodal button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 5px 14px; cursor: pointer;
  }
  #vmodal button:hover { color: var(--gold); border-color: var(--gold); }
  /* The gatehouse bench: a safe keeping modal, capped to the viewport with a
     fixed header and columns that scroll on their own — never the whole page. */
  #bench {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  /* The conversation follows you into your kit. A modal is a full scrim, so
     chat arriving while you sort would land invisibly behind it — this strip
     floats it ABOVE the modal (z 10001), so a talk in progress never drops
     just because you opened your pack. Only people-lines ride it; the world's
     noise stays in the log. Empty and hidden until a modal is open and someone
     speaks. */
  #mchat {
    display: none; position: fixed; z-index: 10001; left: 12px; right: 12px; bottom: 12px;
    flex-direction: column; gap: 3px; pointer-events: none; max-width: 720px;
    margin: 0 auto; text-align: left;
  }
  #mchat.on { display: flex; }
  #mchat .mline {
    background: color-mix(in srgb, var(--panel) 92%, black);
    border: 1px solid var(--border2); border-left: 2px solid var(--voice);
    border-radius: 6px; padding: 5px 10px; font-size: 13px; line-height: 1.35;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4); animation: mfade 0.2s ease-out;
    overflow-wrap: anywhere;
  }
  #mchat .mline.say  { color: var(--voice); font-weight: 700; }
  #mchat .mline.tell { color: var(--voice); font-style: italic; }
  #mchat .mline.who  { color: var(--voice); }
  @keyframes mfade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  #bench.open { display: flex; }
  #bench .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(920px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #bench .bhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #btitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #bsub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 52ch; }
  #bclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #bclose:hover { color: var(--gold); border-color: var(--gold); }
  #bnote { flex: 0 0 auto; color: var(--blood); font-size: 12.5px; }
  #bnote:empty { display: none; }
  /* The paperdoll: your figure, what it wears, and the math it adds up to. */
  #bdoll {
    flex: 0 0 auto; display: none; gap: 16px; align-items: flex-start; flex-wrap: wrap;
    border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 2px;
  }
  #bdoll.on { display: flex; }
  #dleft { flex: 0 0 auto; display: flex; gap: 14px; align-items: flex-start; min-width: 0; }
  #bdoll svg { flex: 0 0 auto; width: 44px; height: 96px; fill: var(--cream); opacity: 0.2; }
  #dslots { flex: 0 1 auto; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  #bdoll .dslot { font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
  #bdoll .dslot .lb { color: var(--dim); display: inline-block; min-width: 9ch; padding-right: 6px; }
  #bdoll .dslot .it { color: var(--cream); }
  #bdoll .dslot .it.none { color: var(--dim); font-style: italic; }
  #bdoll .dslot .cd { color: var(--dim); }
  #dstats { flex: 1 1 220px; display: flex; flex-direction: column; gap: 5px; min-width: 200px; }
  #bdoll .dline { font-size: 12px; line-height: 1.45; }
  #bdoll .dline .lb { color: var(--gold); letter-spacing: 0.07em; text-transform: uppercase; font-size: 10px; display: block; }
  #bdoll .dline .vl { color: var(--bone); }
  /* The columns fill the rest and each scroll internally (desktop). */
  #bench .bcols {
    flex: 1 1 auto; min-height: 0; padding-bottom: 14px;
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  }
  #bench.nogate .bcols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #bench .bcol {
    border: 1px solid var(--line); border-radius: 8px; padding: 0 10px 8px;
    overflow-y: auto; min-width: 0; min-height: 120px;
    display: flex; flex-direction: column; gap: 6px;
  }
  #bench .bcolh {
    position: sticky; top: 0; background: var(--panel); z-index: 1;
    color: var(--bone); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid var(--line); padding: 10px 0 6px;
    display: flex; justify-content: space-between; gap: 8px;
  }
  #bench .bcolh .cnts { display: flex; gap: 8px; align-items: baseline; }
  #bench .bcolh .cnt { color: var(--dim); letter-spacing: 0; }
  #bench .bcolh .cnt.food { color: var(--voice); opacity: 0.85; text-transform: none; }
  #bench .bempty { color: var(--dim); font-size: 12px; font-style: italic; padding: 4px 0; }
  #bench .bitem { display: flex; flex-direction: column; gap: 4px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  #bench .bitem:last-child { border-bottom: none; }
  #bench .bitem .nm { color: var(--cream); font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
  #bench .bitem .nm .seal { color: var(--gold); }
  #bench .bitem .nm .mult { color: var(--gold); font-weight: 700; }
  #bench .bitem .nm .cond { color: var(--dim); font-style: italic; }
  #bench .bitem .nm .stat { color: var(--bone); }
  #bench .bitem .nm .tag { font-size: 11.5px; }
  #bench .bitem .nm .worn { color: var(--heal); }
  #bench .bitem .acts { display: flex; flex-wrap: wrap; gap: 4px; }
  #bench .bitem button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11px; padding: 2px 8px; cursor: pointer;
  }
  #bench .bitem button:hover { color: var(--gold); border-color: var(--gold); }
  /* burn is the only far-right, destructive action; scrap sits inline like the rest. */
  #bench .bitem button.burn { color: var(--dim); margin-left: auto; }
  #bench .bitem button.burn:hover { color: var(--blood); border-color: var(--blood); }
  #bench .bitem button.arm { color: var(--blood); border-color: var(--blood); font-weight: 700; }
  /* Phone: columns stack, the stack scrolls as one, headers still stick. */
  @media (max-width: 680px) {
    #bench .bbox { max-height: 92vh; }
    #bench .bcols { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
    #bench .bcol { overflow-y: visible; min-height: 0; }
    /* The paperdoll stacks on a phone: figure+slots one row, the math below. */
    #bdoll { gap: 8px; padding: 8px 10px; }
    #dstats { flex: 1 1 100%; min-width: 0; }
    #bdoll .dline { overflow-wrap: anywhere; }
  }
  /* The keeper's hatch: the trade modal. Same shell as the bench — you step
     out of the world to deal — with his stock and your goods side by side. */
  #trade {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  #trade.open { display: flex; }
  #trade .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(780px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #trade .bhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #ttitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #tsub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 52ch; }
  #tclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #tclose:hover { color: var(--gold); border-color: var(--gold); }
  #tnote { flex: 0 0 auto; color: var(--blood); font-size: 12.5px; }
  #tnote:empty { display: none; }
  #twant {
    flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px;
    color: var(--bone); font-size: 12.5px;
    border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px;
  }
  #twant .wname { color: var(--gold); font-weight: 600; }
  /* one cart line: the thing named, plus a small \\u2715 to take one copy back */
  #twant .wrow {
    display: inline-flex; align-items: center; gap: 4px; color: var(--cream);
    border: 1px solid var(--line); border-radius: 4px; padding: 2px 4px 2px 8px;
  }
  #twant .wprog { color: var(--gold); font-variant-numeric: tabular-nums; }
  #twant .wrow button {
    margin: 0; border: none; border-radius: 3px; padding: 1px 5px;
    color: var(--dim); font-size: 11px; line-height: 1;
  }
  #twant button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--dim); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
    margin-left: auto; white-space: nowrap;
  }
  #twant .wrow button { margin-left: 0; }
  #twant button:hover { color: var(--blood); border-color: var(--blood); }
  #trade .bcols {
    flex: 1 1 auto; min-height: 0; padding-bottom: 14px;
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  }
  #trade .bcol {
    border: 1px solid var(--line); border-radius: 8px; padding: 0 10px 8px;
    overflow-y: auto; min-width: 0; min-height: 120px;
    display: flex; flex-direction: column; gap: 6px;
  }
  #trade .bcolh {
    position: sticky; top: 0; background: var(--panel); z-index: 1;
    color: var(--bone); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid var(--line); padding: 10px 0 6px;
  }
  #trade .ttabs {
    display: flex; gap: 6px; padding: 8px 0 6px;
    border-bottom: 1px solid var(--line);
  }
  #trade .ttabs button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--dim); font: inherit; font-size: 11.5px; padding: 3px 10px; cursor: pointer;
  }
  #trade .ttabs button:hover { color: var(--gold); border-color: var(--gold); }
  #trade .ttabs button.on { color: var(--gold); border-color: var(--gold); }
  #trade .bempty { color: var(--dim); font-size: 12px; font-style: italic; padding: 4px 0; }
  #trade .bitem { display: flex; flex-direction: column; gap: 5px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  #trade .bitem:last-child { border-bottom: none; }
  #trade .bitem .nm { color: var(--cream); font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
  #trade .bitem .nm .stat { color: var(--bone); }
  #trade .bitem .nm .cost { color: var(--gold); }
  #trade .bitem .acts { display: flex; flex-wrap: wrap; gap: 5px; }
  #trade .bitem button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
  }
  #trade .bitem button:hover { color: var(--gold); border-color: var(--gold); }
  #trade .bitem button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  /* Shelf sections + one-line rows: name, stat tags in the chip colours (red
     bites, steel guards, gold gains, dim weighs), price right, buy inline. */
  #trade .tsech, #bench .tsech {
    color: var(--dim); font-size: 10px; letter-spacing: 0.2em;
    margin: 12px 0 2px; padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  #trade .tsech:first-of-type { margin-top: 6px; }
  #trade .trow {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  #trade .trow:last-child { border-bottom: none; }
  #trade .trow .nm { color: var(--cream); font-size: 13px; flex: 1 1 auto; min-width: 11ch; overflow-wrap: anywhere; }
  #trade .trow .tags { display: flex; flex-wrap: wrap; gap: 2px 8px; font-size: 11px; justify-content: flex-end; }
  /* Full-strength theme colours (no cream-mixing — that washed out on light
     themes) with a touch of weight so the tags read on any ground. */
  #trade .st-atk,  #bench .st-atk  { color: var(--blood); font-weight: 600; }
  #trade .st-def,  #bench .st-def  { color: var(--steel); font-weight: 600; }
  #trade .st-gain, #bench .st-gain { color: var(--gold);  font-weight: 600; }
  #trade .st-dim,  #bench .st-dim  { color: var(--dim); }
  #trade .trow .tcost { color: var(--gold); font-variant-numeric: tabular-nums; min-width: 3ch; text-align: right; }
  #trade .trow button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
  }
  #trade .trow button:hover { color: var(--gold); border-color: var(--gold); }
  #trade .trow button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  @media (max-width: 680px) {
    #trade .bbox { max-height: 92vh; }
    #trade .bcols { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
    #trade .bcol { overflow-y: visible; min-height: 0; }
    /* Finger-friendly tap targets: the cart's \\u2715, the tabs, and the
       buy/offer buttons all grow to a comfortable touch size on phones. */
    #twant .wrow { padding: 3px 4px 3px 10px; font-size: 13px; }
    #twant .wrow button { padding: 6px 10px; font-size: 15px; }
    #twant > button { padding: 8px 12px; font-size: 13px; }
    #trade .ttabs button { padding: 8px 14px; font-size: 13px; }
    #trade .bitem button { padding: 8px 14px; font-size: 13px; }
    #trade .trow button { padding: 8px 14px; font-size: 13px; }
  }
  /* The gatehouse forge: same shell as the hatch, single column. Reads your
     pack and shows what the bench can make — cost in gold when you can afford
     it, in blood when you can't. */
  #forge {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  #forge.open { display: flex; }
  #forge .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(560px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #forge .bhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #ftitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #fsub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 52ch; }
  #fclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #fclose:hover { color: var(--gold); border-color: var(--gold); }
  #fnote { flex: 0 0 auto; color: var(--blood); font-size: 12.5px; }
  #fnote:empty { display: none; }
  #fhave {
    flex: 0 0 auto; color: var(--bone); font-size: 12.5px;
    border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px;
  }
  #fhave .scrap { color: var(--gold); }
  #forge .bcols {
    flex: 1 1 auto; min-height: 0; padding-bottom: 14px;
    display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px;
  }
  #forge .bcol {
    border: 1px solid var(--line); border-radius: 8px; padding: 0 10px 8px;
    overflow-y: auto; min-width: 0; min-height: 120px;
    display: flex; flex-direction: column; gap: 6px;
  }
  #forge .bcolh {
    position: sticky; top: 0; background: var(--panel); z-index: 1;
    color: var(--bone); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid var(--line); padding: 10px 0 6px;
  }
  #forge .bempty { color: var(--dim); font-size: 12px; font-style: italic; padding: 4px 0; }
  #forge .bitem { display: flex; flex-direction: column; gap: 5px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  #forge .bitem:last-child { border-bottom: none; }
  #forge .bitem .nm { color: var(--cream); font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
  #forge .bitem .nm .stat { color: var(--bone); }
  #forge .bitem .nm .rar { color: var(--dim); }
  #forge .bitem .cost { font-size: 12px; }
  #forge .bitem .cost.ok { color: var(--gold); }
  #forge .bitem .cost.no { color: var(--blood); }
  #forge .bitem .acts { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
  #forge .bitem button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
  }
  #forge .bitem button:hover { color: var(--gold); border-color: var(--gold); }
  #forge .bitem button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  @media (max-width: 680px) {
    #forge .bbox { max-height: 92vh; }
    #forge .bcols { overflow-y: auto; }
    #forge .bcol { overflow-y: visible; min-height: 0; }
  }
  /* ---- the map & journal modals: knowledge you carry ---- */
  #mapm, #jrnl {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  #mapm.open, #jrnl.open { display: flex; }
  #mapm .lbox, #jrnl .lbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(880px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #mapm .lhead, #jrnl .lhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #maptitle, #jtitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #mapsub, #jsub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 56ch; }
  #mapm.crude #maptitle { color: var(--blood); }
  #mapclose, #jclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #mapclose:hover, #jclose:hover { color: var(--gold); border-color: var(--gold); }
  #mapbody, #jbody { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-bottom: 14px; }
  /* map: a live schematic the client draws from the room graph the Worker
     sends (rooms as tiles, exits as lines, your room aglow) — Achaea-style. */
  #mapbody { overflow: hidden; padding-bottom: 0; }
  #mapwrap { position: relative; width: 100%; height: min(64vh, 560px); border: 1px solid var(--line); border-radius: 8px; background: var(--bg); overflow: hidden; touch-action: none; }
  #mapcv { display: block; width: 100%; height: 100%; cursor: grab; }
  #mapwrap.drag #mapcv { cursor: grabbing; }
  #mapctl { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px; }
  #mapctl button { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border2); background: var(--panel); color: var(--cream); font: inherit; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  #mapctl button:hover { color: var(--gold); border-color: var(--gold); }
  #maphint { position: absolute; left: 10px; top: 8px; color: var(--dim); font-size: 11px; pointer-events: none; letter-spacing: 0.02em; }
  #mapm.crude #mapwrap { border-color: var(--blood); }
  #mapm.crude #maphint { color: var(--blood); }
  /* journal: a card per creature */
  #jbody { display: flex; flex-direction: column; gap: 10px; }
  .jent { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
  .jent .jn { color: var(--cream); font-size: 14px; font-weight: 700; display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .jent .jn .jboss { color: var(--gold); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
  .jent .jtier { color: var(--dim); font-size: 11px; letter-spacing: 0.06em; }
  .jent .jnat { color: var(--bone); font-size: 12.5px; margin-top: 5px; line-height: 1.4; }
  .jent .jnote { color: var(--dim); font-size: 12px; margin-top: 4px; line-height: 1.45; font-style: italic; }
  .jent .jstats { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; }
  .jent .jstats span { color: var(--dim); font-size: 12px; }
  .jent .jstats b { color: var(--steel); font-weight: 700; }
  .jent .jlocked { color: var(--dim); font-size: 12px; margin-top: 6px; font-style: italic; }
  .jempty { color: var(--dim); font-size: 13px; font-style: italic; padding: 8px 2px; }
  @media (max-width: 680px) {
    #mapm .lbox, #jrnl .lbox { max-height: 92vh; }
  }
  #idpanel input {
    flex: 1;
    min-width: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--cream);
    font: inherit;
    font-size: 12.5px;
    padding: 6px 9px;
    outline: none;
  }
  #idpanel input:focus { border-color: var(--gold); }
  #log {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
  }
  #log div { white-space: pre-wrap; word-break: break-word; margin-bottom: 2px; }
  #log .feed { color: var(--dim); }
  #log .sys  { color: var(--gold); }
  #log .echo { color: var(--dim); opacity: 0.7; margin-top: 6px; }
  /* Color-coded events (the trailer's language, in-game): wounds bleed,
     gains glow, the room announces itself, the furniture recedes. */
  #log .head   { color: var(--gold); font-weight: 700; letter-spacing: 0.05em; margin-top: 8px; }
  #log .dmgin  { color: var(--blood); padding-left: 12px; }
  #log .dmgout { color: var(--steel); padding-left: 12px; }
  #log .kill   { color: var(--gold); padding-left: 12px; }
  #log .death  { color: var(--blood); font-weight: 700; }
  #log .fumble { color: var(--blood); font-style: italic; opacity: 0.85; padding-left: 12px; }
  #log .block  { color: var(--steel); padding-left: 12px; }
  #log .dodge  { color: var(--dim); font-style: italic; padding-left: 12px; }
  #log .seize  { color: var(--blood); padding-left: 12px; }
  #log .stun   { color: var(--bone); padding-left: 12px; }
  #log .gain   { color: var(--gold); }
  #log .dim    { color: var(--dim); }
  /* The world's own voice — event beats (the bell, the tide of rats, the dark
     going wrong). A hue nothing else wears, so an omen never reads as scenery. */
  #log .evt    { color: var(--omen); font-style: italic; }
  /* A PERSON SPOKE. The highest-signal line in a shared world, and it was
     rendering in the same grey as "dry bones clatter from below" — a human read
     as weather. Speech gets the one hue nothing else in the palette wears, and
     it gets full weight: in a room full of the dungeon's noise, the living voice
     is the thing your eye must land on first. Quiet words (tell) lean italic. */
  #log .say    { color: var(--voice); font-weight: 700; }
  #log .tell   { color: var(--voice); font-style: italic; opacity: 0.92; }
  /* PRESENCE — another person arriving, leaving, blinking in, fading out. Same
     rose as speech (rose means people), but unbolded: a body moving is quieter
     than a body speaking, yet it must never sink into the world's grey. In a
     world where the other names are real people who can rob and kill you,
     someone stepping into your room is the most actionable line on the screen. */
  #log .who    { color: var(--voice); }
  #log .big    { animation: tremor 0.35s linear; }
  /* The vitals kill — the rarest strike, on both sides of it (you land one, or
     one lands on you). It keeps its side's colour (gold kill / steel out /
     blood in) and its tremor; this just makes it a touch larger, so the once-
     in-a-hundred blow never reads at the same size as a 4-damage poke. */
  #log .vital  { font-size: 1.16em; font-weight: 700; letter-spacing: 0.01em; }
  @keyframes tremor {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-1.5px, 1px); }
    40% { transform: translate(2px, -1px); }
    60% { transform: translate(-2px, -1px); }
    80% { transform: translate(1.5px, 1px); }
  }
  @media (prefers-reduced-motion: reduce) {
    #log .big { animation: none; }
  }
  #chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 14px 0;
    background: var(--panel);
    border-top: 1px solid var(--line);
  }
  #chips:empty { display: none; }
  #chips button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--dim);
    font: inherit;
    font-size: 13px;
    padding: 3px 9px;
    cursor: pointer;
    white-space: nowrap;
  }
  #chips button:hover, #chips button:active { color: var(--gold); border-color: var(--gold); }
  /* chips carry their meaning in colour (soft wash): a faint tint of the
     category hue under its full-strength outline, with the theme's OWN text
     colour on top — so it stays legible on any ground: the dark Door, the light
     Bone, or a worn Nostr theme. Violence red · mending green · gain gold · the
     guarded stance steel; movement and the quiet verbs stay dim, so the
     coloured ones read at a glance. */
  #chips button.c-atk  { background: color-mix(in srgb, var(--blood) 20%, transparent); border-color: var(--blood); color: var(--cream); }
  #chips button.c-heal { background: color-mix(in srgb, var(--heal) 22%, transparent);  border-color: var(--heal);  color: var(--cream); }
  #chips button.c-gain { background: color-mix(in srgb, var(--gold) 20%, transparent);  border-color: var(--gold);  color: var(--cream); }
  #chips button.c-def  { background: color-mix(in srgb, var(--steel) 20%, transparent); border-color: var(--steel); color: var(--cream); }
  /* The door: the way into the only warm room in the world, and the way back out
     of it. It wears the voice-rose, alone among the chips, because that is where
     the people are — and it carries a little more weight than its neighbours,
     because at a gate it is the thing you are most likely to want. */
  #chips button.c-door { background: color-mix(in srgb, var(--voice) 18%, transparent); border-color: var(--voice); color: var(--cream); font-weight: 700; letter-spacing: 0.02em; }
  #chips button.c-door:hover, #chips button.c-door:active { background: color-mix(in srgb, var(--voice) 32%, transparent); border-color: var(--voice); color: var(--cream); }
  /* hover deepens the wash and keeps the category's own outline (not the gold) */
  #chips button.c-atk:hover,  #chips button.c-atk:active  { background: color-mix(in srgb, var(--blood) 32%, transparent); border-color: var(--blood); color: var(--cream); }
  #chips button.c-heal:hover, #chips button.c-heal:active { background: color-mix(in srgb, var(--heal) 34%, transparent);  border-color: var(--heal);  color: var(--cream); }
  #chips button.c-gain:hover, #chips button.c-gain:active { background: color-mix(in srgb, var(--gold) 32%, transparent);  border-color: var(--gold);  color: var(--cream); }
  #chips button.c-def:hover,  #chips button.c-def:active  { background: color-mix(in srgb, var(--steel) 32%, transparent); border-color: var(--steel); color: var(--cream); }
  #inputline {
    display: flex;
    gap: 8px;
    padding: 10px calc(14px + env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) calc(14px + env(safe-area-inset-left, 0px));
    background: var(--panel);
  }
  #inputline .prompt { color: var(--gold); }
  #cmd {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--cream);
    font: inherit;
    /* type=search is the one classification Safari exempts from contact
       autofill; these strip WebKit's search dressing so it stays a bare
       terminal prompt. */
    -webkit-appearance: none;
    appearance: none;
  }
  #cmd::-webkit-search-cancel-button,
  #cmd::-webkit-search-decoration,
  #cmd::-webkit-search-results-button,
  #cmd::-webkit-search-results-decoration { display: none; -webkit-appearance: none; }
  /* Touch devices: inputs at 16px so iOS never auto-zooms on focus, and
     chips grow into honest tap targets. */
  @media (pointer: coarse), (max-width: 768px) {
    #cmd, #idpanel input, #vminput { font-size: 16px; }
    #chips button { font-size: 14px; padding: 8px 12px; }
    #setpanel button, #setpanel .abtn { padding: 7px 14px; }
    #idpanel button { padding: 9px 12px; }
    #thlist .thent { padding: 6px 4px; }
    #bench .bitem button { font-size: 13px; padding: 7px 12px; }
    #bclose { padding: 9px 14px; }
  }
  /* THE THRESHOLD: the door screen. One gold button between a stranger and
     the world; it fades and is removed the moment it's crossed. */
  #threshold {
    position: fixed; inset: 0; z-index: 9000;
    /* starts as plain darkness; the picked scene painting is set by script
       only after it has decoded, so nothing flashes between backdrops */
    background-color: #16120c;
    background-size: cover; background-position: center; background-repeat: no-repeat;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; text-align: center; padding: 24px; padding-bottom: 18vh; transition: opacity .9s ease;
  }
  #threshold.gone { opacity: 0; pointer-events: none; }
  #thr-title { color: var(--gold); font-size: clamp(48px, 5.5vw, 68px); letter-spacing: .16em; font-weight: 700; line-height: 1; margin-bottom: 0; }
  #thr-line { color: var(--dim); font-size: 14px; max-width: 46ch; line-height: 1.5; }
  #thr-enter {
    margin-top: 56px; font-family: inherit; font-size: 17px; letter-spacing: .08em;
    color: var(--bg); background: var(--gold); border: 0; padding: 12px 34px; cursor: pointer;
  }
  #thr-enter:hover, #thr-enter:focus-visible { background: var(--cream); outline: none; }
  #thr-keys { color: var(--dim); font-size: 12.5px; }
  #thr-keys span { color: var(--bone); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  #thr-keys span:hover { color: var(--cream); }
</style>
</head>
<body>
  <div id="bar">
    <span class="brand" id="brand" title="settings">NOMAD<span class="caret">&#9662;</span></span>
    <span id="room"></span>
    <span id="rightbar"><span id="fx"></span><span id="idbtn"><span id="hp">keys</span> <span class="caret">&#9662;</span></span></span>
  </div>
  <div id="threshold">
    <div id="thr-title">NOMAD</div>
    <div id="thr-line">a shared dungeon, alive whether or not anyone is watching</div>
    <button id="thr-enter" type="button">enter</button>
    <div id="thr-keys">been here before? <span id="thr-keys-link">bring your keys</span></div>
  </div>
  <div id="setpanel">
    <span class="lbl">SETTINGS</span>
    <div class="setrow"><span>what is NOMAD</span><button id="aboutbtn">read</button></div>
    <div class="setrow"><span>sound</span><button id="sndbtn">off</button></div>
    <div class="setrow"><span>theme</span><button id="thbtn">door</button></div>
    <div class="setrow"><span>nostr themes</span><button id="thbrowse">browse</button></div>
    <div id="thlist"></div>
    <div class="setrow"><span>command chips</span><button id="chipbtn">on</button></div>
    <div class="setrow"><span>source</span><a class="abtn" href="https://github.com/rome539/nomad" target="_blank" rel="noopener">github &#8599;</a></div>
  </div>
  <div id="idpanel">
    <div class="sect">
      <span class="lbl">YOU</span>
      <div class="ident"><span id="idname"></span><span id="idnpub" title="copy your public key"></span></div>
    </div>
    <div class="sect" id="sectsave">
      <button id="idcopy" class="primary">copy secret key</button>
      <span class="note">The only way back if this browser forgets you. Keep it secret.</span>
    </div>
    <div class="sect" id="sectgoogle">
      <span class="lbl" id="glbl">EASY MODE</span>
      <span class="note" id="gstate" style="display:none"></span>
      <button id="idgoogle" class="primary">Continue with Google</button>
      <span class="note" id="gnote">Your key, sealed in a vault in your own Drive and opened by a PIN only you know. Sign in on any device to return &#8212; and it works across other Nostr apps.</span>
    </div>
    <div class="sect" id="sectown">
      <span class="lbl">USE YOUR OWN KEYS</span>
      <div class="row">
        <button id="idext">extension</button>
        <button id="idconn">signer app</button>
      </div>
      <div class="row"><input id="idpaste" placeholder="or paste nsec1&#8230; / bunker:// &#8212; enter" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="go"></div>
    </div>
    <div class="sect" id="sectback">
      <button id="idback">return to previous keys</button>
    </div>
  </div>
  <div id="vmodal">
    <div class="vbox">
      <div id="vmtitle"></div>
      <input id="vminput" type="password" autocomplete="off" spellcheck="false">
      <div class="vrow">
        <button id="vmcancel">cancel</button>
        <button id="vmok">unlock</button>
      </div>
    </div>
  </div>
  <div id="mchat"></div>
  <div id="bench">
    <div class="bbox">
      <div class="bhead">
        <div>
          <div id="btitle">The gatehouse bench</div>
          <div id="bsub">You've stepped out of the world. Nothing can reach you here — sort your kit.</div>
        </div>
        <button id="bclose">step back out</button>
      </div>
      <div id="bnote"></div>
      <div id="bdoll">
        <div id="dleft">
          <svg id="dfig" viewBox="0 0 60 130" aria-hidden="true">
            <circle cx="30" cy="14" r="9"></circle>
            <path d="M30 25 C 20 27 16 34 15 44 L 12 74 L 18 74 L 21 50 L 21 78 L 16 122 L 25 122 L 30 88 L 35 122 L 44 122 L 39 78 L 39 50 L 42 74 L 48 74 L 45 44 C 44 34 40 27 30 25 Z"></path>
          </svg>
          <div id="dslots"></div>
        </div>
        <div id="dstats"></div>
      </div>
      <div class="bcols">
        <div class="bcol" id="bpack"></div>
        <div class="bcol" id="block"></div>
        <div class="bcol" id="bvault"></div>
      </div>
    </div>
  </div>
  <div id="trade">
    <div class="bbox">
      <div class="bhead">
        <div>
          <div id="ttitle">The keeper's hatch</div>
          <div id="tsub">You've stepped out of the world to deal. He trades in kind &#8212; name your want, then lay goods on the counter until he's square.</div>
        </div>
        <button id="tclose">step back out</button>
      </div>
      <div id="tnote"></div>
      <div id="twant"></div>
      <div class="bcols">
        <div class="bcol" id="tstock"></div>
        <div class="bcol" id="tgoods"></div>
      </div>
    </div>
  </div>
  <div id="forge">
    <div class="bbox">
      <div class="bhead">
        <div>
          <div id="ftitle">The gatehouse forge</div>
          <div id="fsub">Scrap iron and the brazier's heat. The bench works what you carry into gear &#8212; raw and unclaimed, yours to seal at the gate.</div>
        </div>
        <button id="fclose">bank the brazier</button>
      </div>
      <div id="fnote"></div>
      <div id="fhave"></div>
      <div class="bcols">
        <div class="bcol" id="frecipes"></div>
      </div>
    </div>
  </div>
  <div id="mapm">
    <div class="lbox">
      <div class="lhead">
        <div>
          <div id="maptitle">Map</div>
          <div id="mapsub"></div>
        </div>
        <button id="mapclose">roll it up</button>
      </div>
      <div id="mapbody">
        <div id="mapwrap">
          <canvas id="mapcv"></canvas>
          <div id="maphint"></div>
          <div id="mapctl">
            <button id="mapzin" title="zoom in" aria-label="zoom in">+</button>
            <button id="mapzout" title="zoom out" aria-label="zoom out">−</button>
            <button id="mapzhere" title="center on you" aria-label="center on you">⌖</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="jrnl">
    <div class="lbox">
      <div class="lhead">
        <div>
          <div id="jtitle">Journal</div>
          <div id="jsub">What you've studied, and killed enough of to know.</div>
        </div>
        <button id="jclose">close the book</button>
      </div>
      <div id="jbody"></div>
    </div>
  </div>
  <div id="log"></div>
  <div id="chips"></div>
  <div id="inputline">
    <span class="prompt">&#9656;</span>
    <input id="cmd" type="search" name="q" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" autofocus>
  </div>
<script src="https://accounts.google.com/gsi/client" async></script>
<script type="module">
import { generateSecretKey, getPublicKey, finalizeEvent, nip19 } from "https://esm.sh/nostr-tools@2.23.9";

// "Continue with Google" — the dungeon keeps your key backed up to your Google
// account (server-side, sealed). Injected at serve time; public by design.
var GOOGLE_CLIENT_ID = "__GOOGLE_CLIENT_ID__";
// Picker API key for the Drive vault (public, referrer-restricted).
var GOOGLE_PICKER_KEY = "__GOOGLE_PICKER_KEY__";

var log = document.getElementById("log");
var cmd = document.getElementById("cmd");
var roomEl = document.getElementById("room");
var hpEl = document.getElementById("hp");
var fxEl = document.getElementById("fx");
var chipsEl = document.getElementById("chips");

// Glanceable status: the server names your active effects (bleeding, seized,
// stunned, resting, hobbled...); we render each as a small colored tag next to
// the hp so a wound is never an invisible debuff. textContent only (XSS-safe).
var FX_META = {
  seized:   { label: "seized",   cls: "fx-warn" },
  stunned:  { label: "stunned",  cls: "fx-warn" },
  hobbled:  { label: "hobbled",  cls: "fx-blood" },
  bleeding: { label: "bleeding", cls: "fx-blood" },
  resting:  { label: "resting",  cls: "fx-heal" }
};
function renderFx(list) {
  fxEl.textContent = "";
  if (!Array.isArray(list)) return;
  for (var i = 0; i < list.length; i++) {
    var m = FX_META[list[i]];
    if (!m) continue;
    var pill = document.createElement("span");
    pill.className = "fxtag " + m.cls;
    pill.textContent = m.label;
    fxEl.appendChild(pill);
  }
}

// Rooms announce themselves as headers; the status frame teaches us their names.
var knownRooms = {};

// One glance should tell you what kind of line this is: wounds bleed red,
// kills and gains glow gold, furniture (exits, traces) recedes into dim.
// The big beats — deaths, savage blows — tremble.
// Combat, death, eat, and fumbles now arrive pre-tagged from the server (the
// cls field), so their color never drifts when the prose changes. This
// fallback only styles what still comes untagged: known room names, the loot/
// seal 'gain' lines, and the dim scene-setting (exits, traces).
function classify(s) {
  if (knownRooms[s]) return "head";
  if (/falls into your hands|falls from the dead|clatters free of the fallen|sealed\\. \\(mint #|^What is sealed is yours|locked in your box|back from the box|slides .* across the counter/.test(s)) return "gain";
  if (/^Exits: /.test(s)) return "dim";
  if (/bloodstain darkens|dust is freshly disturbed|swept clear, sat in|Fresh blood pools|Gnawed scraps|scratched into the stone/.test(s)) return "dim";
  return "";
}

// ---- sound: the trailer's own voices, synthesized on the spot ----
// Ported from promo/nomad-promo.html: same boom, same crack, same squink.
// Nothing is loaded; everything is oscillators and filtered noise, behind a
// master gain. Off by default; the NOMAD wordmark opens the switch.
var actx = null;
var amaster = null;
var ambNodes = null;
var soundOn = localStorage.getItem("nomad_sound") === "1";
function aout() { return amaster; }
var SND = {
  _noise: function () {
    if (actx.__nb) return actx.__nb;
    var b = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    actx.__nb = b;
    return b;
  },
  _burst: function (t, o) {
    var src = actx.createBufferSource();
    src.buffer = this._noise();
    var f = actx.createBiquadFilter();
    f.type = o.type || "lowpass";
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.freq || 300, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(o.sweep, 20), t + o.dur);
    var g = actx.createGain();
    g.gain.setValueAtTime(o.gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (o.dur || 0.1));
    src.connect(f); f.connect(g); g.connect(aout());
    src.start(t, Math.random());
    src.stop(t + (o.dur || 0.1) + 0.05);
  },
  _tone: function (t, o) {
    var os = actx.createOscillator();
    os.type = o.type || "sine";
    os.frequency.setValueAtTime(o.f0 || 440, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t + o.dur);
    var g = actx.createGain();
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + (o.dur || 0.3));
    os.connect(g); g.connect(aout());
    os.start(t); os.stop(t + (o.dur || 0.3) + 0.05);
  },
  step: function (t) {
    this._burst(t, { freq: 220, dur: 0.09, gain: 0.5 });
    this._tone(t, { f0: 58, f1: 36, dur: 0.1, gain: 0.55 });
  },
  boom: function (t) {
    this._tone(t, { f0: 64, f1: 28, dur: 0.9, gain: 0.9 });
    this._burst(t, { freq: 140, dur: 0.35, gain: 0.5 });
  },
  crack: function (t) {
    this._burst(t, { type: "bandpass", freq: 1900, q: 9, dur: 0.07, gain: 0.5 });
    this._tone(t + 0.02, { type: "square", f0: 640, f1: 180, dur: 0.3, gain: 0.08 });
  },
  grind: function (t, dur) {
    dur = dur || 1.4;
    var src = actx.createBufferSource();
    src.buffer = this._noise();
    src.loop = true;
    var f = actx.createBiquadFilter();
    f.type = "bandpass"; f.Q.value = 2.5;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.4);
    g.gain.setValueAtTime(0.38, t + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    var lfo = actx.createOscillator();
    lfo.frequency.value = 6.5;
    var lg = actx.createGain(); lg.gain.value = 0.16;
    lfo.connect(lg); lg.connect(g.gain);
    lfo.start(t); lfo.stop(t + dur);
    src.connect(f); f.connect(g); g.connect(aout());
    src.start(t); src.stop(t + dur + 0.1);
    this._tone(t, { type: "sawtooth", f0: 46, f1: 40, dur: dur, gain: 0.12 });
  },
  key: function (t) { this._burst(t, { type: "highpass", freq: 1500, dur: 0.03, gain: 0.09 }); },
  tick: function (t) { this._burst(t, { type: "highpass", freq: 2400, dur: 0.015, gain: 0.045 }); },
  hit: function (t) {
    this._burst(t, { type: "bandpass", freq: 420, q: 1.5, dur: 0.16, gain: 0.4 });
    this._tone(t, { f0: 120, f1: 60, dur: 0.18, gain: 0.3 });
  },
  crit: function (t) {
    this.hit(t);
    this.crack(t + 0.02);
    this._tone(t, { f0: 80, f1: 30, dur: 0.5, gain: 0.5 });
  },
  // The vitals kill — the rarest, most decisive blow in the game. A sharp point
  // finding the gap, a heavy final drop under it, and a clean ringing signature
  // (an octave + a fifth) that decays slow: the one strike that announces itself.
  vital: function (t) {
    this._burst(t, { type: "bandpass", freq: 2600, q: 8, dur: 0.05, gain: 0.5 });
    this._tone(t + 0.01, { f0: 96, f1: 30, dur: 0.75, gain: 0.6 });
    this._tone(t + 0.04, { f0: 880, dur: 1.5, gain: 0.17 });
    this._tone(t + 0.06, { f0: 1320, dur: 1.15, gain: 0.09 });
  },
  death: function (t) {
    this._tone(t, { f0: 200, f1: 34, dur: 1.8, gain: 0.45 });
    this._burst(t + 0.1, { freq: 300, sweep: 60, dur: 1.5, gain: 0.25 });
  },
  chime: function (t) {
    var fs = [523.25, 783.99, 1046.5];
    for (var i = 0; i < fs.length; i++) this._tone(t + i * 0.09, { f0: fs[i], dur: 1.9, gain: 0.15 });
  },
  squink: function (t) {
    var o = actx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(1180, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.26);
    var g = actx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(aout());
    o.start(t); o.stop(t + 0.35);
  },
  swell: function (t, dur) {
    dur = dur || 2.2;
    var f = actx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 320;
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    var fr = [55, 82.5];
    for (var i = 0; i < fr.length; i++) {
      var o = actx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = fr[i];
      o.connect(f);
      o.start(t); o.stop(t + dur + 0.1);
    }
    f.connect(g); g.connect(aout());
  },
  // ---- more voices: the world has a wider vocabulary now ----
  // A blow caught on a shield: a bright metallic ring, steel turning steel.
  clang: function (t) {
    this._burst(t, { type: "bandpass", freq: 2600, q: 12, dur: 0.12, gain: 0.32 });
    this._tone(t, { type: "square", f0: 880, f1: 520, dur: 0.18, gain: 0.06 });
  },
  // A blow slipped: air moving where you aren't. A soft falling whoosh.
  whiff: function (t) {
    this._burst(t, { type: "bandpass", freq: 1300, q: 0.7, sweep: 380, dur: 0.22, gain: 0.16 });
  },
  // Cold arms closing on you: a low, wet, muffled grab.
  grab: function (t) {
    this._tone(t, { f0: 92, f1: 44, dur: 0.34, gain: 0.4 });
    this._burst(t, { type: "lowpass", freq: 210, dur: 0.26, gain: 0.3 });
  },
  // A blunt blow rings something senseless: a dull, hollow knock.
  thud: function (t) {
    this._tone(t, { f0: 116, f1: 68, dur: 0.16, gain: 0.4 });
    this._burst(t, { type: "lowpass", freq: 160, dur: 0.1, gain: 0.32 });
  },
  // Pen on paper (or a nail on stone): a dry scritch-scritch.
  scratch: function (t) {
    this._burst(t, { type: "highpass", freq: 3000, dur: 0.05, gain: 0.12 });
    this._burst(t + 0.06, { type: "highpass", freq: 2500, dur: 0.05, gain: 0.1 });
    this._burst(t + 0.12, { type: "highpass", freq: 3200, dur: 0.04, gain: 0.08 });
  },
  // A book opened: two soft paper flaps.
  page: function (t) {
    this._burst(t, { type: "bandpass", freq: 1400, q: 0.8, dur: 0.09, gain: 0.16 });
    this._burst(t + 0.09, { type: "bandpass", freq: 950, q: 0.8, dur: 0.11, gain: 0.13 });
  },
  // A map unrolled: a longer, drier rustle of old vellum.
  unfurl: function (t) {
    this._burst(t, { type: "bandpass", freq: 1100, q: 0.6, sweep: 700, dur: 0.3, gain: 0.15 });
    this._burst(t + 0.13, { type: "bandpass", freq: 1550, q: 0.6, sweep: 900, dur: 0.24, gain: 0.11 });
  },
  // A lock giving: a high click, then the low clunk of the bolt.
  latch: function (t) {
    this._burst(t, { type: "highpass", freq: 2000, dur: 0.02, gain: 0.12 });
    this._tone(t + 0.03, { f0: 150, f1: 78, dur: 0.14, gain: 0.3 });
    this._burst(t + 0.03, { type: "lowpass", freq: 180, dur: 0.12, gain: 0.26 });
  },
  // Hammer on anvil: two ringing strikes at the bench.
  forge: function (t) {
    for (var i = 0; i < 2; i++) {
      var tt = t + i * 0.22;
      this._burst(tt, { type: "bandpass", freq: 2200, q: 10, dur: 0.1, gain: 0.28 });
      this._tone(tt, { f0: 200, f1: 118, dur: 0.2, gain: 0.11 });
    }
  },
  // Goods change hands at the hatch: two small bright tings.
  clink: function (t) {
    this._tone(t, { f0: 1400, dur: 0.12, gain: 0.08 });
    this._tone(t + 0.07, { f0: 1860, dur: 0.14, gain: 0.07 });
  },
};
// The cave breathes for as long as sound is on: filtered noise + a slow 39Hz
// heartbeat, the trailer's ambience minus the end time.
function startAmb() {
  if (ambNodes || !actx) return;
  var src = actx.createBufferSource();
  src.buffer = SND._noise(); src.loop = true;
  var f = actx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 140;
  var g = actx.createGain(); g.gain.value = 0.045;
  src.connect(f); f.connect(g); g.connect(aout());
  src.start();
  var o = actx.createOscillator(); o.frequency.value = 39;
  var og = actx.createGain(); og.gain.value = 0.028;
  var lfo = actx.createOscillator(); lfo.frequency.value = 0.11;
  var lg = actx.createGain(); lg.gain.value = 0.013;
  lfo.connect(lg); lg.connect(og.gain);
  o.connect(og); og.connect(aout());
  o.start(); lfo.start();
  ambNodes = [src, o, lfo];
}
function stopAmb() {
  if (!ambNodes) return;
  for (var i = 0; i < ambNodes.length; i++) { try { ambNodes[i].stop(); } catch (e) {} }
  ambNodes = null;
}
function sndInit() {
  if (!actx) {
    try { actx = new AudioContext(); } catch (e) { return; }
    amaster = actx.createGain();
    amaster.gain.value = 0.5;
    amaster.connect(actx.destination);
  }
  if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
}
// One event, one voice — same casting as the trailer.
function sndFor(line, c) {
  if (line.indexOf("grinds open") >= 0 || line.indexOf("grinds shut") >= 0 || line.indexOf("Iron grinds") >= 0) return "grind";
  if (/squink/i.test(line)) return "squink";
  if (line.indexOf("has fallen to") >= 0) return "swell";
  if (line.indexOf("across the counter") >= 0) return "clink";
  // The vitals kill wins over any other tag it rides with (kill/dmgout/dmgin):
  // the rarest strike gets the rarest voice, and it must never fall back to a
  // plain hit.
  if (c.indexOf("vital") >= 0) return "vital";
  // The wider vocabulary, keyed off the server's semantic tags.
  if (c === "block") return "clang";
  if (c === "dodge") return "whiff";
  if (c === "seize") return "grab";
  if (c === "stun") return "thud";
  if (c === "study") return "scratch";
  if (c === "unlock") return "latch";
  if (c === "forge") return "forge";
  if (c.indexOf("death") >= 0) return "death";
  if (c.indexOf("kill") >= 0) return "boom";
  if (c.indexOf("dmg") >= 0) return c.indexOf("big") >= 0 ? "crit" : "hit";
  if (c.indexOf("fumble") >= 0) return "crack";
  if (c.indexOf("gain") >= 0) return "chime";
  if (c.indexOf("head") >= 0) return "step";
  if (c === "feed") return "tick";
  return null;
}
// A combat round can print several lines at once; stagger their voices a
// hair and let at most four speak, biggest first.
var SND_RANK = {
  vital: 10, death: 9, swell: 8, boom: 7, grind: 6, forge: 6, grab: 5, crit: 5, hit: 4, crack: 4,
  clang: 4, latch: 4, chime: 3, squink: 3, thud: 3, page: 3, unfurl: 3, clink: 3,
  step: 2, whiff: 2, scratch: 2, tick: 1,
};
// Fire a single named voice now (for client-driven moments — opening a modal —
// that don't ride the print() path).
function sndOne(name) {
  if (!soundOn || !actx) return;
  try { SND[name](actx.currentTime + 0.01); } catch (e) {}
}
function playSounds(names) {
  if (!soundOn || !actx || names.length === 0) return;
  // One message, one voice each: sealing seven items is ONE chime, not a
  // bell choir. (Combat stays lively — each swing arrives as its own message.)
  var seen = {};
  names = names.filter(function (n) { if (seen[n]) return false; seen[n] = 1; return true; });
  names.sort(function (a, b) { return (SND_RANK[b] || 0) - (SND_RANK[a] || 0); });
  var n = Math.min(names.length, 4);
  var t = actx.currentTime + 0.01;
  for (var i = 0; i < n; i++) { try { SND[names[i]](t + i * 0.07); } catch (e) {} }
}

// ---- the conversation follows you into your kit ----
// While a full-screen modal is open the log is hidden behind it, so chat would
// arrive unseen. This strip floats people-lines (say/tell/who) over the modal
// so a talk in progress survives you opening your pack. Lines age out on their
// own; the strip vanishes when the modal closes.
var mchat = document.getElementById("mchat");
function anyModalOpen() {
  return (benchEl && benchEl.classList.contains("open"))
    || (tradeEl && tradeEl.classList.contains("open"))
    || (forgeEl && forgeEl.classList.contains("open"))
    || (mapEl && mapEl.classList.contains("open"))
    || (jrnlEl && jrnlEl.classList.contains("open"));
}
function hideModalChat() {
  if (!mchat) return;
  mchat.textContent = "";
  mchat.classList.remove("on");
}
// bitchat-style voices: a wanderer's NAME takes a colour so two people talking
// in a crowded gate read apart at a glance. Name only — the words stay in the
// voice tone. The colour is HSL: the HUE is hashed from their key (colour ==
// identity, and it persists), while SATURATION and LIGHTNESS ride --name-s /
// --name-l, which every theme sets from its OWN background brightness (see
// applyThemeColors). So the same person keeps their hue on the dark Door, the
// light Bone, AND any worn Nostr theme (light ones included) — only how bright
// the name rides flips with the ground, so contrast always holds.
function nameColor(pk) {
  var h = 0, s = String(pk || "");
  for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return "hsl(" + (h % 360) + ", var(--name-s, 55%), var(--name-l, 70%))";
}
// Paint a speech line into el: if it opens with the speaker's name, that name
// wears their colour and the rest stays neutral. All textContent — never
// innerHTML — so a crafted name or message can never inject markup.
function paintVoice(el, text, cls, who, pk) {
  if ((cls === "say" || cls === "tell") && who && pk && text.indexOf(who) === 0) {
    var nm = document.createElement("span");
    nm.textContent = who;
    nm.style.color = nameColor(pk);
    el.appendChild(nm);
    el.appendChild(document.createTextNode(text.slice(who.length)));
  } else {
    el.textContent = text;
  }
}

function modalChatPush(text, cls, who, pk) {
  if (!mchat || !anyModalOpen()) return; // log's visible otherwise — no need
  var line = document.createElement("div");
  line.className = "mline " + (cls || "");
  paintVoice(line, text, cls, who, pk);
  mchat.appendChild(line);
  mchat.classList.add("on");
  while (mchat.childNodes.length > 4) mchat.removeChild(mchat.firstChild); // keep the last few
  setTimeout(function () {
    if (line.parentNode) line.parentNode.removeChild(line);
    if (mchat.childNodes.length === 0) mchat.classList.remove("on");
  }, 14000);
}

function print(text, cls, who, pk) {
  // Explicit classes (sys/feed/echo) keep the whole block; everything else is
  // split per line so each event wears its own color.
  var lines = cls ? [text] : String(text).split("\\n");
  var sounds = [];
  for (var i = 0; i < lines.length; i++) {
    var div = document.createElement("div");
    var c = cls || classify(lines[i]);
    if (c) div.className = c;
    paintVoice(div, lines[i], c, who, pk);
    log.appendChild(div);
    // A person spoke or moved while you're in a modal: float it over the top.
    if (c === "say" || c === "tell" || c === "who") modalChatPush(lines[i], c, who, pk);
    if (soundOn && actx && cls !== "sys" && cls !== "echo") {
      var s = sndFor(lines[i], c || "");
      if (s) sounds.push(s);
    }
  }
  playSounds(sounds);
  log.scrollTop = log.scrollHeight;
}

// Identity: keys in pocket. Guests get keys minted silently; anyone with
// their own (nsec or NIP-07 extension) can knock with those instead.
function toHex(b){ return Array.from(b).map(function(x){return x.toString(16).padStart(2,"0");}).join(""); }
function fromHex(h){ var o=new Uint8Array(h.length/2); for(var i=0;i<o.length;i++) o[i]=parseInt(h.substr(i*2,2),16); return o; }
var stored = localStorage.getItem("nomad_sk");
var sk;
if (stored) { sk = fromHex(stored); }
else { sk = generateSecretKey(); localStorage.setItem("nomad_sk", toHex(sk)); }
var method = localStorage.getItem("nomad_login") || "guest"; // "guest" | "ext" | "bunker"

// NIP-46 remote signer: your keys stay in your signer app; the game only
// ever sends it things to sign. All protocol work lives in /nip46-bunker.js —
// the battle-tested client from nostr-district.
var BUNKER_RELAYS = ["wss://relay.nsec.app", "wss://relay.primal.net", "wss://nos.lol", "wss://nostr.mom"];
var bunkerClient = null;
async function makeBunkerClient() {
  if (!globalThis.__nip44mod) {
    globalThis.__nip44mod = await import("https://esm.sh/nostr-tools@2.23.9/nip44");
  }
  var mod = await import("/nip46-bunker.js");
  return new mod.BunkerClient({
    NostrTools: { generateSecretKey: generateSecretKey, getPublicKey: getPublicKey, finalizeEvent: finalizeEvent },
    appName: "NOMAD",
    appUrl: location.origin,
    perms: "get_public_key,sign_event:27235",
    relays: BUNKER_RELAYS,
    storageKey: "nomad_bunker_session",
    sessionMaxAge: 30 * 24 * 3600 * 1000,
    heartbeatMs: 0,
    onAuthUrl: function (url) { window.open(url, "_blank", "width=600,height=700"); },
    onStatusChange: function (st, msg) { if (st === "error" && msg) print("\\u2014 signer: " + msg + " \\u2014", "sys"); },
  });
}
async function ensureBunkerClient() {
  if (bunkerClient && bunkerClient.connected) return bunkerClient;
  bunkerClient = await makeBunkerClient();
  var ok = await bunkerClient.restoreSession();
  if (!ok) throw new Error("signer session expired \\u2014 use 'connect signer app' again");
  return bunkerClient;
}

async function login() {
  var ch = await (await fetch("/auth/challenge", { method: "POST" })).json();
  var evt = { kind: 27235, created_at: Math.floor(Date.now()/1000), tags: [], content: ch.challenge };
  var ev;
  if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
  else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
  else ev = finalizeEvent(evt, sk);
  var r = await (await fetch("/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: ev }) })).json();
  if (!r.token) throw new Error("login failed");
  return r.token;
}

// Real Nostr identities (extension/signer) arrive with a profile; the dungeon
// shouldn't call them by a hex stump. If the server-side name is still the
// pubkey-prefix default, fetch their kind-0 and adopt its name.
var profileTried = false;
async function currentIdentityPubkey() {
  try {
    if (method === "ext" && window.nostr) return await window.nostr.getPublicKey();
    if (method === "bunker" && bunkerClient) return bunkerClient.userPubkey;
    return getPublicKey(sk);
  } catch (e) { return null; }
}
async function fetchProfileName(pk) {
  try {
    var poolMod = await import("https://esm.sh/nostr-tools@2.23.9/pool");
    var pool = new poolMod.SimplePool();
    var ev = await pool.get(
      ["wss://purplepag.es", "wss://relay.damus.io", "wss://relay.primal.net", "wss://nos.lol"],
      { kinds: [0], authors: [pk] },
    );
    try { pool.destroy(); } catch (e) {}
    if (!ev) return null;
    var p = JSON.parse(ev.content);
    console.log("[profile-name] kind-0 found:", p.display_name || p.name);
    var nm = String(p.display_name || p.name || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
    if (!/^[a-zA-Z0-9]/.test(nm) || nm.length < 2) return null;
    return nm;
  } catch (e) {
    console.warn("[profile-name] lookup failed:", e && e.message ? e.message : e);
    return null;
  }
}
// ---- A WANDERER'S VOICE: your words, your key ----
// The dungeon's key signs what the DUNGEON says \\u2014 drops, deaths, the room feed.
// It does not speak for you. So every word a player speaks \\u2014 'say' out in the
// dark, or talk in the gatehouse \\u2014 is handed back here ("gpub"), and YOUR client
// signs it with YOUR key and puts it on the relays. Kind 24914 is ephemeral: no
// relay stores a word of it.
//
// The content is base64'd. That is OBFUSCATION, NOT A CIPHER \\u2014 it keeps speech
// from rendering as readable chatter in a relay explorer beside the 24913 feed;
// it does not stop anyone who decides to decode it.
//
// Fire-and-forget. The room already heard you over the socket; if a relay is
// down, or a signer refuses, the conversation carries on regardless.
var SPEECH_KIND = 24914;
var SPEECH_RELAYS = ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nos.lol", "wss://nostr.mom"];
var gpubPool = null;
async function publishSpeech(text, tag) {
  if (!text) return;
  try {
    var b64 = btoa(unescape(encodeURIComponent(String(text))));
    var evt = {
      kind: SPEECH_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["t", tag || "nomad-say"], ["enc", "b64"], ["v", "0"]],
      content: b64,
    };
    var ev;
    if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
    else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
    else ev = finalizeEvent(evt, sk);
    if (!gpubPool) {
      var poolMod = await import("https://esm.sh/nostr-tools@2.23.9/pool");
      gpubPool = new poolMod.SimplePool();
    }
    gpubPool.publish(SPEECH_RELAYS, ev);
  } catch (e) {
    console.warn("[speech] publish failed:", e && e.message ? e.message : e);
  }
}

// ---- A QUIET WORD: sealed, not merely hidden ----
// Public speech is base64'd, which is obfuscation. A tell is different: it has
// exactly ONE recipient, so it gets a real cipher. NIP-44 to their npub, kind
// 24915, ephemeral, p-tagged \\u2014 only they hold the other half of the key, and no
// relay keeps it. This is the one message in NOMAD that nobody else can read.
var TELL_KIND = 24915;
var nip44mod = null;
async function sealTo(pk, text) {
  if (method === "ext" && window.nostr && window.nostr.nip44) return await window.nostr.nip44.encrypt(pk, text);
  if (method === "bunker") return await (await ensureBunkerClient()).nip44Encrypt(pk, text);
  if (!nip44mod) nip44mod = await import("https://esm.sh/nostr-tools@2.23.9/nip44");
  var key = nip44mod.v2.utils.getConversationKey(sk, pk);
  return nip44mod.v2.encrypt(text, key);
}
async function publishTell(pk, text) {
  if (!pk || !text) return;
  try {
    var sealed = await sealTo(pk, String(text));
    var evt = {
      kind: TELL_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", pk], ["t", "nomad-tell"], ["enc", "nip44"], ["v", "0"]],
      content: sealed,
    };
    var ev;
    if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
    else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
    else ev = finalizeEvent(evt, sk);
    if (!gpubPool) {
      var poolMod = await import("https://esm.sh/nostr-tools@2.23.9/pool");
      gpubPool = new poolMod.SimplePool();
    }
    gpubPool.publish(SPEECH_RELAYS, ev);
  } catch (e) {
    console.warn("[tell] seal failed:", e && e.message ? e.message : e);
  }
}

// ---- THE ARENA BROADCAST: your deeds, your key ----
// The dungeon narrates a room, but it no longer SIGNS what a wanderer does. Your
// own movements, fights, kills and death (kind 24913) are handed back here
// ("fpub") and YOUR client signs them under YOUR key and puts them on the relays.
// The whole gladiator feed authors itself, spread across every player's own
// connection \\u2014 no single npub firehoses the relays.
//
// Two deliberate differences from speech: the content is PLAIN (a spectator
// client is MEANT to read it \\u2014 this is the show), and every event carries a
// fixed "nomad-arena" tag so one subscription catches the whole roster, plus a
// "mudroom-<id>" tag that says where. And it goes out on a 15s HOLD: the room
// already saw it live over the socket; the public copy trails a quarter-minute,
// so the feed can't be read as a real-time tracker to intercept anyone.
var FEED_KIND = 24913;
var ARENA_TAG = "nomad-arena";
var FEED_HOLD_MS = 15000;
async function publishFeed(room, text, fx) {
  if (!text) return;
  try {
    var tags = [["t", ARENA_TAG], ["t", "mudroom-" + (room || "door")], ["v", "0"]];
    // A combat deed carries how it landed (vital / bleed / stun / hobble / kill)
    // so a spectator client can size and colour it without guessing from prose.
    if (fx && fx !== "who") tags.push(["fx", String(fx)]);
    var evt = {
      kind: FEED_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: tags,
      content: String(text),
    };
    var ev;
    if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
    else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
    else ev = finalizeEvent(evt, sk);
    if (!gpubPool) {
      var poolMod = await import("https://esm.sh/nostr-tools@2.23.9/pool");
      gpubPool = new poolMod.SimplePool();
    }
    setTimeout(function () { try { gpubPool.publish(SPEECH_RELAYS, ev); } catch (e) {} }, FEED_HOLD_MS);
  } catch (e) {
    console.warn("[feed] publish failed:", e && e.message ? e.message : e);
  }
}

// ---- THE BRAG: your wanderer, your key, in your own feed ----
// 'publish kind 1' hands back the one thing NOMAD publishes that a normal Nostr
// timeline actually renders: a plain kind-1 note, signed by YOUR key, posted to
// YOUR relays, in front of YOUR followers. Permanent (not ephemeral) — a brag is
// meant to stick. It carries an "a" tag pointing at the dungeon-signed 31573 so
// anyone can verify the numbers against the dungeon's signature, and a "t":nomad
// tag so the posts are findable. Deliberate and rare: only 'publish kind 1' does
// this — publishing your sheet never touches your feed.
async function publishNote(text, atag) {
  if (!text) return;
  try {
    var tags = [["t", "nomad"]];
    if (atag) tags.push(["a", atag]);
    var evt = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: tags,
      content: String(text),
    };
    var ev;
    if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
    else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
    else ev = finalizeEvent(evt, sk);
    if (!gpubPool) {
      var poolMod = await import("https://esm.sh/nostr-tools@2.23.9/pool");
      gpubPool = new poolMod.SimplePool();
    }
    gpubPool.publish(SPEECH_RELAYS, ev);
  } catch (e) {
    console.warn("[note] publish failed:", e && e.message ? e.message : e);
  }
}

// Claim a restored identity's real (kind-0) name, once, if we're connected and
// still wearing a throwaway name we didn't choose. Both the pre-fetch (restore)
// and the status-frame lookup funnel through here, so neither double-claims and
// neither overrides a name the player deliberately set (lastNamed).
function claimName(nm) {
  if (nameClaimed || !nm) return;
  if (!ws || ws.readyState !== 1) return; // not in yet — the status frame will try again
  if (lastNamed) return;                  // they chose their current name; leave it
  if (!lastName || nm.toLowerCase() === lastName.toLowerCase()) return;
  nameClaimed = true;
  print("— the dungeon recognizes the name on your keys —", "sys");
  sendCmd("name " + nm);
}

// Fired at restore time (importKey): look the identity's name up ahead of the
// status frame and claim it the moment we're connected.
function prefetchAdoptName(pk) {
  fetchProfileName(pk).then(function (nm) {
    if (!nm) return;
    nameHint = nm;
    claimName(nm);
  });
}

function maybeAdoptProfileName(f) {
  if (profileTried) return;
  profileTried = true;
  // Guests get a silent lookup: a fresh-minted key has no kind-0, so nothing
  // happens and nothing prints. But a restored key (vault, pasted nsec) is a
  // real identity — if the relays know its name, the dungeon adopts it.
  var quiet = method !== "ext" && method !== "bunker";
  currentIdentityPubkey().then(function (pk) {
    console.log("[profile-name] method:", method, "pk:", pk, "server name:", f.name);
    if (!pk) {
      if (!quiet) print("— your signer would not say who you are; pick a name: name <yourname> —", "sys");
      return;
    }
    if (f.named) return; // they chose that name — leave it be
    // Fast path: a name already pulled at restore time — claim it now.
    if (nameHint) { claimName(nameHint); return; }
    if (!quiet) print("— asking the relays what your keys are called\\u2026 —", "sys");
    fetchProfileName(pk).then(function (nm) {
      console.log("[profile-name] relay lookup result:", nm);
      if (!nm) {
        if (!quiet) print("— the relays hold no name for these keys; the dungeon calls you " + f.name + " ('name <yourname>' to overrule) —", "sys");
        return;
      }
      nameHint = nm;
      claimName(nm);
    });
  });
}

var ws = null;
var retryMs = 1000;
var hbTimer = null; // keepalive: a bare "ping" every 25s the server auto-answers
                    // "pong" without waking the Durable Object — stops NAT/proxy
                    // idle-timeouts from reaping a quiet socket.
var sessionToken = null; // the gate token, kept between reweaves. It's good for a
                         // week, so a dropped wire reconnects on the token we
                         // already hold: no /auth round-trip, and — the real win —
                         // no signer popup on every blip (login() signs an event).
var frayTold = false;    // did we already show the "frays" line for this outage?
var frayTimer = null;    // holds that line back until an outage actually lasts
var failedOpens = 0;     // reweaves that never opened; enough of them and the
                         // cached token is suspect, so we force a fresh login
var FRAY_QUIET_MS = 3000;// a reweave that recovers faster than this stays unseen

async function connect() {
  if (ws && ws.readyState === 0) return; // a connect is already in flight
  profileTried = false;
  if (method === "ext" && !window.nostr) {
    print("— your key extension is not answering; entering with the pocket keys —", "sys");
    method = "guest";
  }
  if (method === "bunker" && !localStorage.getItem("nomad_bunker_session")) {
    method = "guest";
  }
  // Reuse the gate token across reweaves; only a missing/rejected one pays for a
  // login (and, for extension/bunker keys, a signature prompt).
  var usedCached = !!sessionToken;
  var token = sessionToken;
  if (!token) {
    try { token = await login(); sessionToken = token; }
    catch (e) { print("— the gate does not answer (" + e.message + "); retrying —", "sys"); return scheduleRetry(); }
  }

  var proto = location.protocol === "https:" ? "wss://" : "ws://";
  var opened = false;
  ws = new WebSocket(proto + location.host + "/ws?token=" + encodeURIComponent(token));

  ws.onopen = function () {
    opened = true;
    failedOpens = 0;
    retryMs = 300; // the first reweave after a good run retries near-instantly
    if (frayTimer) { clearTimeout(frayTimer); frayTimer = null; }
    if (frayTold) { print("— the thread holds; you are back —", "sys"); frayTold = false; }
    clearInterval(hbTimer);
    hbTimer = setInterval(function () { if (ws && ws.readyState === 1) ws.send("ping"); }, 25000);
  };
  ws.onmessage = function (m) {
    var f; try { f = JSON.parse(m.data); } catch (e) { return; }
    // During the first walk the world holds its tongue: the feed (others'
    // deeds, sounds through walls) and the ambient weather stay out of the
    // lesson text. Your own actions still speak — that's the tutorial.
    if (f.kind === 24912) { if (guideActive() && f.cls === "amb") return; print(f.text, f.cls, f.who, f.sp); }
    else if (f.kind === 24913) { if (guideActive()) return; print(f.text, f.cls || "feed", f.who, f.sp); }
    else if (f.t === "status") {
      roomEl.textContent = f.room || "";
      if (f.room) knownRooms[f.room] = 1;
      hpEl.textContent = f.hp + "/" + f.max_hp + " hp \\u00b7 " + f.name;
      // Remember the name for the threshold's greeting next visit.
      try { localStorage.setItem("nomad_name", f.name); } catch (e) {}
      hpEl.className = f.hp <= f.max_hp / 3 ? "hp-low" : "";
      renderFx(f.fx);
      dollPulse(f.hp, f.max_hp);
      lastName = f.name;
      lastNamed = !!f.named;
      maybeAdoptProfileName(f);
      // If the panel is open when the name arrives, don't make them reopen it.
      if (idpanel.classList.contains("open")) refreshIdPanel();
    } else if (f.t === "ctx" && Array.isArray(f.suggest)) {
      inGatehouseNow = !!f.gh; // in the tavern the input line is a mouth
      renderChips(f.suggest, f.combat);
    } else if (f.t === "bench") {
      if (f.open) renderBench(f); else closeBench();
    } else if (f.t === "trade") {
      if (f.open) renderTrade(f); else closeTrade();
    } else if (f.t === "forge") {
      if (f.open) renderForge(f); else closeForge();
    } else if (f.t === "map") {
      renderMap(f);
    } else if (f.t === "journal") {
      renderJournal(f);
    } else if (f.t === "gpub") {
      publishSpeech(f.text, f.tag); // your words, your key, your signature
    } else if (f.t === "tpub") {
      publishTell(f.to, f.text);    // a quiet word, sealed to them alone
    } else if (f.t === "fpub") {
      publishFeed(f.room, f.text, f.fx);  // your deed, your key — the arena broadcast
    } else if (f.t === "npost") {
      publishNote(f.text, f.atag);  // your brag, your key — a kind 1 in your own feed
    }
  };
  // The fray line names its cause: the close code (and reason, when the server
  // gave one) rides the message, so "it reweaves at random" reports carry data.
  // 1000 "reconnected" = you opened another tab/device (the server said so);
  // 1006 = the wire dropped without a goodbye (network blip, or the server's
  // whole DO aborted); 1001 = the far side went away cleanly.
  ws.onclose = function (e) {
    clearInterval(hbTimer); closeBench(); closeTrade(); closeMap(); closeJournal();
    // You opened this wanderer in another tab or on another device: the server
    // hands the body over and closes THIS socket on purpose (1000 "reconnected").
    // Don't fight it — reconnecting here would yank the body back and forth.
    if (e && e.code === 1000 && e.reason === "reconnected") {
      print("— your spirit is called to another window; this one goes still —", "sys");
      ws = null;
      return;
    }
    if (!opened) failedOpens++;
    // The token is good for a week, so a failure to open is almost always a dead
    // wire, not a bad token — keep the token (and skip the signer prompt) through
    // any normal outage. Only a LONG run of failures (~9s of retries) suggests a
    // genuinely stale token; then drop it so the next try logs in clean. A real
    // outage that trips this just pays one login when the wire finally returns.
    if (usedCached && failedOpens >= 5) { sessionToken = null; failedOpens = 0; }
    // Hold the "frays" line back: a reweave that recovers before the timer fires
    // stays invisible. Only a real, lasting outage announces itself.
    if (!frayTold && !frayTimer) {
      frayTimer = setTimeout(function () {
        frayTimer = null; frayTold = true;
        var why = e && e.code ? " (" + e.code + (e.reason ? ": " + e.reason : "") + ")" : "";
        print("— the connection frays" + why + "; reweaving —", "sys");
      }, FRAY_QUIET_MS);
    }
    scheduleRetry();
  };
}

function scheduleRetry() {
  setTimeout(connect, retryMs);
  retryMs = Math.min(retryMs * 2, 15000);
}

var history = [];
var histAt = -1;

// Is this line a thing you SAID, rather than a thing you did? Two ways to be:
// the speech verbs anywhere, and \\u2014 in the gatehouse \\u2014 any line that isn't one of
// the room's few commands, because in there the input box is a mouth. Getting it
// wrong costs one duplicated line or one missing echo; nothing breaks.
var SPEECH_VERBS = { say: 1, talk: 1, speak: 1, shout: 1, yell: 1, holler: 1, bellow: 1, scream: 1, tell: 1, whisper: 1, quietly: 1 };
var GATEHOUSE_CMDS = {
  out: 1, exit: 1, outside: 1, in: 1, enter: 1, inside: 1, gatehouse: 1,
  look: 1, l: 1, who: 1, players: 1, help: 1, "?": 1, commands: 1, h: 1,
  inventory: 1, inv: 1, i: 1, bag: 1, items: 1, kit: 1,
  stash: 1, store: 1, box: 1, stow: 1, unstash: 1, unbox: 1,
  vault: 1, bank: 1, deposit: 1, unvault: 1, withdraw: 1, retrieve: 1,
  barter: 1, trade: 1, shop: 1, browse: 1, fence: 1, buy: 1, purchase: 1,
  offer: 1, pay: 1, sell: 1, give: 1, forge: 1, craft: 1, repair: 1, mend: 1,
  salvage: 1, scrap: 1, claim: 1, seal: 1, keys: 1, sheet: 1, publish: 1,
  map: 1, study: 1, journal: 1, rest: 1, sleep: 1, sit: 1, camp: 1,
  eat: 1, bandage: 1, bind: 1, equip: 1, wield: 1, wear: 1, remove: 1,
  unequip: 1, name: 1, rename: 1, smoke: 1, puff: 1, theme: 1, login: 1,
};
// No-argument commands (aliases). Mirrors the server's GATEHOUSE_NOARG: bare
// they command, but with words after them they were a sentence. Kept in sync so
// the client's echo matches what the server treats as speech.
// Truly no-arg gatehouse verbs: bare = command, with trailing words = speech.
// look / forge / publish are DELIBERATELY absent — they take arguments, so an
// explicit 'look <thing>' / 'forge <thing>' / 'publish sheet' must go through as
// a command, not be eaten as chat (rome, 2026-07-15). They stay in GATEHOUSE_CMDS.
var GATEHOUSE_NOARG_CMDS = {
  out: 1, exit: 1, outside: 1, in: 1, enter: 1, inside: 1, gatehouse: 1,
  who: 1, players: 1, help: 1, "?": 1, commands: 1, h: 1,
  inventory: 1, inv: 1, i: 1, bag: 1, items: 1, kit: 1,
  barter: 1, trade: 1, shop: 1, browse: 1, fence: 1,
  map: 1, study: 1, carve: 1, journal: 1, sheet: 1,
  rest: 1, sleep: 1, sit: 1, camp: 1, smoke: 1, puff: 1,
};
var inGatehouseNow = false;
function isSpeech(t) {
  if (!t) return false;
  if (t.charAt(0) === "'") return true; // the old MUD shorthand
  var w = t.split(/\\s+/)[0].toLowerCase();
  if (SPEECH_VERBS[w]) return true;
  if (inGatehouseNow) {
    if (!GATEHOUSE_CMDS[w]) return true;                       // unknown word = speech
    if (GATEHOUSE_NOARG_CMDS[w] && /\\s/.test(t.trim())) return true; // "i am trying" = speech, bare "i" = command
  }
  return false;
}

function sendCmd(text) {
  // A secret never enters the log, the history, or the wire — whether typed
  // behind 'login' or pasted bare. A bare paste means what it obviously
  // means: these are my keys, let me in.
  var t = text.trim();
  var bareSecret = /^(nsec1[a-z0-9]{20,}|[0-9a-fA-F]{64}|bunker:\\/\\/\\S+)$/.test(t);
  var masked = bareSecret || /^login\\s+(nsec1|bunker:\\/\\/|[0-9a-fA-F]{64})/.test(t);
  history.unshift(masked ? "login \\u2022\\u2022\\u2022\\u2022" : text); histAt = -1;
  // Speech doesn't need an echo. The server answers every spoken line with
  // 'You say, "..."' \\u2014 so echoing the command first just prints the words twice
  // and buries the conversation in its own scaffolding. Commands still echo:
  // there, seeing exactly what you typed is the whole point.
  if (!isSpeech(t)) print("\\u25b8 " + (masked ? "login \\u2022\\u2022\\u2022\\u2022" : text), "echo");
  guideNotice(t); // the first walk listens for its steps
  if (bareSecret) { importKey(t); return; } // importKey routes bunker:// too
  if (localCmd(text)) return;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "cmd", text: text }));
  else print("— not connected —", "sys");
}

// Identity commands never leave this page — the server has no business
// seeing a secret key.
function localCmd(text) {
  var t = text.trim(), lower = t.toLowerCase();
  if (lower === "login extension" || lower === "login ext") { loginExtension(); return true; }
  if (lower === "login signer" || lower === "login bunker") { connectSignerApp(); return true; }
  if (lower.indexOf("login ") === 0) { importKey(t.slice(6).trim()); return true; }
  if (lower === "logout") { logout(); return true; }
  // Quit: back out through the door to the threshold. A clean reload — keys
  // stay in the pocket, the world handles the vanishing (linkdead linger).
  // Bare words only: the server owns "leave <thing>" (it's a drop).
  if (lower === "quit" || lower === "leave" || lower === "exit") {
    print("— you step back through the door —", "sys");
    setTimeout(function () { location.reload(); }, 400);
    return true;
  }
  if (lower === "tutorial off" || lower === "tutorial stop") { guideOff(); return true; }
  if (lower === "tutorial") { guideStart(); return true; } // the first walk, on demand — for anyone, any time
  return false;
}

function reconnect() {
  // Identity is changing: forget the old session's face immediately so the
  // bar and panel never mix the previous name with the next keys.
  // Drop the cached gate token too — it's minted for the OLD keys; reusing it
  // would reconnect as the wanderer we're leaving. Force a fresh login.
  sessionToken = null;
  frayTold = false;
  if (frayTimer) { clearTimeout(frayTimer); frayTimer = null; }
  failedOpens = 0;
  lastName = "";
  lastNamed = false;
  nameHint = null;
  nameClaimed = false;
  hpEl.textContent = "\\u2026";
  hpEl.className = "";
  renderFx([]);
  if (idpanel.classList.contains("open")) refreshIdPanel();
  try { if (ws) ws.close(); } catch (e) {}
}

async function showKeys(reveal) {
  if (method === "bunker") {
    print("Your keys live in a remote bunker; it signs for you.\\n'logout' returns to the pocket keys.", "sys");
    return;
  }
  if (method === "ext") {
    var pk = window.nostr ? await window.nostr.getPublicKey() : null;
    print("Your keys live in your extension." + (pk ? "\\nYou are " + nip19.npubEncode(pk) : "") + "\\n'logout' returns to the pocket keys.", "sys");
    return;
  }
  var lines = ["The keys in your pocket:", "who you are:  " + nip19.npubEncode(getPublicKey(sk))];
  if (reveal) {
    lines.push("the secret:   " + nip19.nsecEncode(sk));
    lines.push("Anyone holding the secret IS you. Copy it somewhere safe. Show no one.");
  } else {
    lines.push("Type 'keys reveal' to see your secret key. Save it: if this browser");
    lines.push("forgets, the secret is the only way back to this wanderer.");
  }
  lines.push("Return anywhere with 'login <nsec\\u2026>' \\u00b7 own keys? 'login extension'");
  print(lines.join("\\n"), "sys");
}

function importKey(arg) {
  cancelPendingBunker();
  if (arg.indexOf("bunker://") === 0) return startBunker(arg);
  var hex = null;
  try {
    if (arg.indexOf("nsec1") === 0) {
      var dec = nip19.decode(arg);
      if (dec.type === "nsec") hex = toHex(dec.data);
    } else if (/^[0-9a-fA-F]{64}$/.test(arg)) {
      hex = arg.toLowerCase();
    }
  } catch (e) {}
  if (!hex) { print("That is not a key. (nsec1\\u2026 or 64 hex characters)", "sys"); return false; }
  var current = localStorage.getItem("nomad_sk");
  if (current && current !== hex) localStorage.setItem("nomad_sk_prev", current);
  localStorage.setItem("nomad_sk", hex);
  localStorage.setItem("nomad_login", "guest");
  sk = fromHex(hex);
  method = "guest";
  print("— you pocket different keys ('logout' returns the old ones) —", "sys");
  reconnect();
  // A restored key is a real identity: pull its name from the relays NOW, in
  // parallel with reconnecting, so we can claim it the instant we're in —
  // instead of showing a throwaway wanderer name while a lookup catches up.
  prefetchAdoptName(getPublicKey(sk));
  return true;
}

// The other direction: WE mint a nostrconnect:// courier, the player scans
// or pastes it into their signer app (nsec.app, Amber, Primal...), and the
// signer knocks back. BunkerClient does the protocol; we do the terminal.
var pendingBunker = null; // a BunkerClient still waiting for its signer
function cancelPendingBunker() {
  if (!pendingBunker) return;
  try { pendingBunker.cancel(); } catch (e) {}
  pendingBunker = null;
}

async function connectSignerApp() {
  if (pendingBunker) {
    cancelPendingBunker();
    print("— the old courier is torn up; older QR codes are void —", "sys");
  }
  var client = null;
  try {
    client = await makeBunkerClient();
    var flow = await client.startClientFlow();
    pendingBunker = client;
    var uri = flow.connectUri;
    var copied = false;
    if (navigator.clipboard) { try { await navigator.clipboard.writeText(uri); copied = true; } catch (e) {} }
    print("Scan with your signer app (nsec.app, Amber, Primal\\u2026) or paste this" + (copied ? " \\u2014 already on your clipboard:" : ":"), "sys");
    print(uri);
    try {
      var qrMod = await import("https://esm.sh/qrcode@1.5.4");
      var QR = qrMod.default || qrMod;
      var img = document.createElement("img");
      img.src = await QR.toDataURL(uri, { margin: 2, width: 220 });
      img.alt = "nostrconnect qr";
      img.style.width = "220px";
      img.style.margin = "4px 0";
      log.appendChild(img);
      log.scrollTop = log.scrollHeight;
    } catch (e) {}
    print("— the gate waits for your signer (up to 5 minutes) —", "sys");
    var userPk = await Promise.race([
      flow.waitForConnect,
      new Promise(function (rs, rj) { setTimeout(function () { rj(new Error("no signer connected in time")); }, 300000); }),
    ]);
    if (pendingBunker !== client) return; // superseded by another login — stand down quietly
    pendingBunker = null;
    bunkerClient = client;
    burnPocketIfGraduated(userPk);
    localStorage.setItem("nomad_login", "bunker");
    method = "bunker";
    print("— your signer answers: you are " + nip19.npubEncode(userPk) + " —", "sys");
    reconnect();
  } catch (e) {
    var superseded = client && pendingBunker !== client;
    if (pendingBunker === client) pendingBunker = null;
    if (client) { try { client.cancel(); } catch (e2) {} }
    if (!superseded) {
      print("— no signer answered (" + (e && e.message ? e.message : "timeout") + ") —", "sys");
    }
  }
}

function startBunker(url) {
  (async function () {
    print("— you send word to the bunker\\u2026 —", "sys");
    try {
      var client = await makeBunkerClient();
      var userPk = await client.connectBunkerUrl(url);
      bunkerClient = client;
      burnPocketIfGraduated(userPk);
      localStorage.setItem("nomad_login", "bunker");
      method = "bunker";
      print("— the bunker answers: you are " + nip19.npubEncode(userPk) + " —", "sys");
      reconnect();
    } catch (e) {
      print("— the bunker did not answer (" + (e && e.message ? e.message : e) + ") —", "sys");
    }
  })();
  return true;
}

// A guest who moves their key into a real signer shouldn't leave the plaintext
// copy behind in localStorage — that voids the whole point of graduating. When
// the connected identity IS the pocket key, burn the pocket: promote the
// previous key if one waits, else mint a pristine nobody (the boot path
// auto-mints anyway; this keeps sk never-null with zero guards). A different
// identity leaves the pocket alone — their guest character waits behind 'logout'.
function burnPocketIfGraduated(connectedPk) {
  if (!sk || getPublicKey(sk) !== connectedPk) return;
  var burned = toHex(sk);
  var prev = localStorage.getItem("nomad_sk_prev");
  localStorage.removeItem("nomad_sk_prev");
  if (prev && prev !== burned) {
    localStorage.setItem("nomad_sk", prev);
    sk = fromHex(prev);
  } else {
    sk = generateSecretKey();
    localStorage.setItem("nomad_sk", toHex(sk));
  }
  print("Your pocket copy burns \\u2014 the signer holds the only key now.", "sys");
}

async function loginExtension() {
  if (!window.nostr) {
    print("No key extension answers. (Alby, nos2x\\u2026 \\u2014 or use 'login <nsec\\u2026>')", "sys");
    return;
  }
  cancelPendingBunker();
  var extPk = null;
  try { extPk = await window.nostr.getPublicKey(); } catch (e) {}
  if (!extPk) { print("The extension didn't answer.", "sys"); return; }
  burnPocketIfGraduated(extPk);
  method = "ext";
  localStorage.setItem("nomad_login", "ext");
  print("— you knock with your own keys —", "sys");
  reconnect();
}


// Sign out of a vault-restored wanderer. The keys stay sealed in the Drive
// vault — the PIN brings them back on any device; here we just set them down.
function vaultSignOut() {
  cancelPendingBunker();
  localStorage.removeItem("nomad_vault_pk");
  var prev = localStorage.getItem("nomad_sk_prev");
  if (prev) {
    localStorage.setItem("nomad_sk", prev);
    localStorage.removeItem("nomad_sk_prev");
    sk = fromHex(prev);
    print("\\u2014 signed out; your previous keys are back in the pocket. The vault keeps the others. \\u2014", "sys");
  } else {
    sk = generateSecretKey();
    localStorage.setItem("nomad_sk", toHex(sk));
    print("\\u2014 signed out. The vault keeps those keys; your PIN brings them back. \\u2014", "sys");
  }
  method = "guest";
  localStorage.setItem("nomad_login", "guest");
  reconnect();
}

function logout() {
  cancelPendingBunker();
  if (method === "ext" || method === "bunker") {
    if (method === "bunker") {
      if (bunkerClient) { try { bunkerClient.destroy(); } catch (e) {} bunkerClient = null; }
      localStorage.removeItem("nomad_bunker_session");
      localStorage.removeItem("nomad_bunker_url"); // pre-BunkerClient leftovers
      localStorage.removeItem("nomad_bunker_csk");
    }
    method = "guest";
    localStorage.setItem("nomad_login", "guest");
    print("— you set the borrowed keys down —", "sys");
  } else {
    var prev = localStorage.getItem("nomad_sk_prev");
    if (!prev) { print("These are the only keys you have.", "sys"); return; }
    localStorage.setItem("nomad_sk", prev);
    localStorage.removeItem("nomad_sk_prev");
    sk = fromHex(prev);
    print("— your old keys, back in the pocket —", "sys");
  }
  reconnect();
}

// Chips: the server tells us everything doable right here; tapping one sends
// the real command (and shows it, so the vocabulary rubs off). A chip ending
// in "…" only starts the command and leaves the rest to you.
var chipsOn = localStorage.getItem("nomad_chips") !== "0"; // default on
var lastSuggest = [];
var lastCombat = false;
// The one chip that isn't a command: tapping 'inventory' opens the keeping
// modal (pack + lockbox, plus the vault & seal at a gate) instead of sending
// text — typing 'inventory' still prints the plain list. Must match BENCH_CHIP
// / TRADE_CHIP in zone.ts.
var BENCH_CHIP = "inventory";
var TRADE_CHIP = "barter with the keeper";
// The 'forge' chip opens the forge modal (reads your pack, shows what the bench
// can make); typing 'forge' still reads the slate. Must match FORGE_CHIP in zone.ts.
var FORGE_CHIP = "forge";
// The chip's face is shorter than the command it fires. The two self-evident
// groups — the compass and the stances — shed their verb: a fixed row of
// north·south·east·west reads as movement without "go" on each, and a cluster
// of steady·guarded·reckless reads as a stance toggle. The button still SENDS
// the full command ("go north", "stance steady"), so the parser is untouched.
function chipLabel(s) {
  var m = /^go (north|south|east|west|up|down)$/.exec(s);
  if (m) return m[1];
  m = /^stance (reckless|steady|guarded)$/.exec(s);
  if (m) return m[1];
  // Where the colour already speaks the verb, the label sheds it: a red chip
  // bites (attack), a gold one gains (get). The button still sends the full
  // command, and the echo in the log is where the vocabulary rubs off.
  // The door. A bare "in" / "out" reads as nothing at all sitting next to "barter
  // with the keeper" — and it is the most important thing at a gate: the way to
  // the only warm room in the world, and the way back into the dark.
  if (s === "in") return "into the gatehouse";
  if (s === "out") return "out into the dark";
  m = /^(attack|get) (.+)$/.exec(s);
  if (m) return m[2];
  return s;
}
// A chip's colour tells you what tapping it DOES: red bites, green mends, gold
// gains, steel guards. The guarded stance and reckless stance split off from
// their siblings; everything unlisted (movement, look, map, say…) stays dim.
function chipKind(s) {
  if (/^(attack|throw|kill|strike) /.test(s) || s === "stance reckless") return "c-atk";
  if (/^(eat|bandage) /.test(s) || s === "bandage" || s === "rest") return "c-heal";
  if (/^(get|unlock|equip|offer) /.test(s) || s === "offer nothing" || s === TRADE_CHIP || s === FORGE_CHIP) return "c-gain";
  if (s === "stance guarded") return "c-def";
  // The door wears the VOICE colour, and it is the only chip that does. That is
  // the whole visual argument: rose means people. Speech is rose; the door to the
  // room where the people are is rose. Nothing else in the world is.
  if (s === "in" || s === "out") return "c-door";
  return "";
}
function chipButton(s) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = chipKind(s);
  b.textContent = chipLabel(s);
  b.addEventListener("click", function (e) {
    e.stopPropagation();
    if (s === BENCH_CHIP) {
      benchSend("open");
    } else if (s === TRADE_CHIP) {
      tradeSend("open");
    } else if (s === FORGE_CHIP) {
      forgeSend("open");
    } else if (s.slice(-1) === "\\u2026") {
      cmd.value = s.slice(0, -1).trim() + " ";
      cmd.focus();
    } else {
      sendCmd(s);
    }
  });
  return b;
}
// The movement chips ride at the front in a fixed compass order (the server
// sends them n·s·e·w·u·d), so directions never scramble room to room — only
// the ones that actually exist are shown, nothing dead. Everything else keeps
// its order behind them.
// A crowded room folds its tail: past CHIP_FOLD chips, the rest hide behind a
// dim "+N more". The server orders by relevance (foes first, housekeeping
// last), so what folds is never a fight. Expansion sticks while the chip set
// is unchanged (combat ticks re-send the same list) and collapses when it
// actually changes.
var CHIP_FOLD = 12;
var chipsExpanded = false;
var lastSuggestKey = "";
function renderChips(suggest, combat) {
  lastSuggest = suggest;
  lastCombat = !!combat;
  chipsEl.textContent = "";
  if (!chipsOn) return; // the quiet terminal: no training wheels
  // The identity lives behind the name button top right — no keys chip, no
  // nostr words in a stranger's face (rome, 2026-07-11).
  var all = suggest;
  var key = all.join("|");
  if (key !== lastSuggestKey) { lastSuggestKey = key; chipsExpanded = false; }
  var dirs = [];
  var rest = [];
  all.forEach(function (s) {
    (/^go (north|south|east|west|up|down)$/.test(s) ? dirs : rest).push(s);
  });
  var ordered = dirs.concat(rest);
  var folded = 0;
  if (!chipsExpanded && ordered.length > CHIP_FOLD + 1) {
    folded = ordered.length - CHIP_FOLD;
    ordered = ordered.slice(0, CHIP_FOLD);
  }
  ordered.forEach(function (s) { chipsEl.appendChild(chipButton(s)); });
  if (folded > 0) {
    var more = document.createElement("button");
    more.type = "button";
    more.textContent = "+" + folded + " more";
    more.addEventListener("click", function (e) {
      e.stopPropagation();
      chipsExpanded = true;
      renderChips(lastSuggest, lastCombat);
    });
    chipsEl.appendChild(more);
  }
}

// ---- the gatehouse bench: sort your pack, out of the world's reach ----
var benchEl = document.getElementById("bench");
var bpack = document.getElementById("bpack");
var block = document.getElementById("block");
var bvault = document.getElementById("bvault");
var bnote = document.getElementById("bnote");
var benchAtGate = false; // vault + seal only when the bench is opened at a gate
document.getElementById("bclose").addEventListener("click", function () { benchSend("close"); });

function benchSend(action, row) {
  // One frame carries the WHOLE selection: a stack sends all its rows at once, so
  // the server moves the pile in a single handler and renders one settled count —
  // no per-row fan racing at the server's DB awaits (the "weird amount" bug).
  var rows = Array.isArray(row) ? row : (row == null || row === "" ? [] : [row]);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "bench", action: action, rows: rows }));
}
function closeBench() { benchEl.classList.remove("open"); hideModalChat(); }

function benchItemNode(it, place) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  nm.textContent = it.name;
  if (it.n > 1) { var mu = document.createElement("span"); mu.className = "mult"; mu.textContent = " \\u00d7" + it.n; nm.appendChild(mu); }
  // Stats wear the chip colours, same language as the keeper's shelves.
  if (it.stat) {
    it.stat.split(", ").forEach(function (tok, i) {
      var s = document.createElement("span");
      s.className = "tag " + statTokenClass(tok);
      s.textContent = (i ? " \\u00b7 " : "  ") + tok;
      nm.appendChild(s);
    });
  }
  // "in hand" / "on you", never "worn" — that word belongs to condition, and
  // "a leather cap — worn — worn" was telling the player nothing twice.
  if (it.equipped) { var eq = document.createElement("span"); eq.className = "worn"; eq.textContent = " \\u2014 " + (it.slot === "weapon" || it.slot === "shield" ? "in hand" : "on you"); nm.appendChild(eq); }
  if (it.sealed) { var sp = document.createElement("span"); sp.className = "seal"; sp.textContent = " \\u2014 sealed #" + it.serial; nm.appendChild(sp); }
  // Gear shows its wear whether sealed or not (sealed just wears slower) — comma after the seal, em-dash on its own.
  if (it.condWord) { var cw = document.createElement("span"); cw.className = "cond"; cw.textContent = (it.sealed ? ", " : " \\u2014 ") + it.condWord; nm.appendChild(cw); }
  // The heart rots on the shelf too — a banked one must never read as a key.
  if (it.heart) { var hw = document.createElement("span"); hw.className = "cond"; hw.textContent = " \\u2014 " + it.heart; nm.appendChild(hw); }
  // Perishable food shows its age once it's past fresh (flavor — it still feeds you).
  if (it.fresh) { var fw = document.createElement("span"); fw.className = "cond"; fw.textContent = " \\u2014 " + it.fresh; nm.appendChild(fw); }
  wrap.appendChild(nm);
  var acts = document.createElement("div");
  acts.className = "acts";
  // A stack action hits every row in the pile (box/seal/burn a whole stack of
  // trophies at once); a single item is just a one-element fan.
  var rows = it.rows && it.rows.length ? it.rows : [it.row];
  function fire(action) { benchSend(action, rows); } // one frame, the whole stack — the server moves it atomically
  function btn(label, action) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    b.addEventListener("click", function () { fire(action); });
    acts.appendChild(b);
  }
  // A single-row action: hits ONE of a stack, not the whole pile. Drop is the
  // one thing you never want fanned — 'drop' on two studded mauls sheds one.
  function btn1(label, action) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    b.addEventListener("click", function () { benchSend(action, rows[0]); });
    acts.appendChild(b);
  }
  // Two-tap actions: the first arms it, the second does it. The cls arg sets the
  // look ("burn" for the destructive one; "scrap" reads as an ordinary action).
  function armBtn(label, action, cls) {
    var b = document.createElement("button");
    b.type = "button"; b.className = cls || "burn"; b.textContent = label;
    var armed = false, t = null;
    b.addEventListener("click", function () {
      if (!armed) {
        armed = true; b.textContent = label + " \\u2014 sure?"; b.classList.add("arm");
        t = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove("arm"); }, 3000);
      } else {
        if (t) clearTimeout(t);
        fire(action);
      }
    });
    acts.appendChild(b);
  }
  if (place === "pack") {
    // Manage what's on: anything with a slot (weapon, armor, helm, feet, cloak,
    // shield) can be worn/wielded; plain carryables can't.
    if (it.slot) {
      if (it.equipped) btn("remove", "remove");
      else btn(it.slot === "weapon" ? "wield" : "wear", "equip");
    }
    btn("\\u2192 box", "stash");
    // The vault and the seal are the gate's business — only offered at a gate.
    // Sealed wealth and raw fungibles both bank in the vault; only unsealed gear
    // needs the seal first (trophies and the like carry no title to seal).
    if (benchAtGate) { if (it.sealed || it.stack) btn("\\u2192 vault", "vault"); else btn("seal", "seal"); }
    // So are the vice and the hammer: mend the wear, or break gear to scrap —
    // sealed or not (the vice cracks the seal itself now, so sealed steel has
    // the same options as bare). The repair gate is 'fix' not 'slot' so the
    // slotless lantern gets its oil refill while the hammerstone (wears, but
    // nothing mends stone) never baits a refusal; only slotted steel scraps.
    if (benchAtGate && it.fix) {
      if (it.cond !== null && it.cond < 100) btn("repair", "repair");
      if (it.slot) armBtn("scrap", "salvage", "scrap");
    }
  } else {
    // Take ONE of a stack back to the pack, not the pile — banking in bulk is
    // fine (the vault is bottomless for fungibles), but withdrawing fans out a
    // whole stack into pack slots you didn't mean to spend (rome, 2026-07-16).
    btn1("\\u2192 pack", "take");
    // From the lockbox at a gate you can also seal a piece in place or send it
    // straight to the vault, no round-trip through the pack. (Same rule as the
    // pack: sealed wealth and raw fungibles vault; unsealed gear needs a seal.)
    if (place === "lockbox" && benchAtGate) {
      if (it.sealed || it.stack) btn("\\u2192 vault", "vault");
      else btn("seal", "seal");
    }
  }
  armBtn("burn", "burn");
  // Drop THIS one to the floor — a single row, never the "dropped both" ambiguity
  // of a name. Placed LAST, off on its own past burn, so a stray click among the
  // box/vault banking buttons can't shed gear by mistake (rome, 2026-07-17). Not
  // offered for what you're wearing (remove it first).
  if (place === "pack" && !it.equipped) btn1("drop", "drop");
  wrap.appendChild(acts);
  return wrap;
}

function fillBenchCol(el, title, items, cap, place, usedOverride, foodUsed, foodCap) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  var t = document.createElement("span"); t.textContent = title; h.appendChild(t);
  // Counts group on the right so the header stays title | counts, not spread three
  // ways. Slot counts come from the server for every column now: food costs no
  // slot in the pack (a count cap governs it) or the vault, but one slot each in
  // the box — none of which the client can get by counting rows.
  var right = document.createElement("span"); right.className = "cnts";
  var c = document.createElement("span"); c.className = "cnt";
  var used = (typeof usedOverride === "number")
    ? usedOverride
    : items.filter(function (it) { return !it.equipped; }).length;
  c.textContent = cap ? (used + "/" + cap) : String(used);
  right.appendChild(c);
  // The pack's food ceiling rides alongside the slot count — food eats no slot,
  // so its own "N/8" is the only thing that tells you when the next ration bounces.
  if (typeof foodCap === "number" && foodCap > 0) {
    var f = document.createElement("span"); f.className = "cnt food";
    f.textContent = "food " + (foodUsed || 0) + "/" + foodCap;
    right.appendChild(f);
  }
  h.appendChild(right);
  el.appendChild(h);
  if (!items.length) {
    var e = document.createElement("div"); e.className = "bempty"; e.textContent = "\\u2014 empty \\u2014";
    el.appendChild(e); return;
  }
  // Two columns split themselves in two, for the same reason: the thing that
  // costs you nothing shouldn't bury the thing that does.
  //   PACK  \\u2014 what rides your body vs what rides your back.
  //   VAULT \\u2014 the sealed wealth that eats the 50 slots, and below it the
  //           trophies and sundries that ride free.
  var secs = null;
  if (place === "pack") {
    secs = [["ON YOU", items.filter(function (it) { return it.equipped; })],
            ["IN THE PACK", items.filter(function (it) { return !it.equipped; })]];
  } else if (place === "vault") {
    secs = [["BANKED", items.filter(function (it) { return !it.trophy && !it.key && !it.food; })],
            ["KEYS", items.filter(function (it) { return it.key; })],
            ["FOOD", items.filter(function (it) { return it.food && !it.key; })],
            ["TROPHIES", items.filter(function (it) { return it.trophy; })]];
  }
  // Only bother sectioning when more than one section actually has anything in
  // it — a vault holding nothing but rat tails wants no headers over it.
  if (secs && secs.filter(function (s) { return s[1].length; }).length > 1) {
    secs.forEach(function (s) {
      if (!s[1].length) return;
      var hd = document.createElement("div"); hd.className = "tsech"; hd.textContent = s[0];
      el.appendChild(hd);
      s[1].forEach(function (it) { el.appendChild(benchItemNode(it, place)); });
    });
    return;
  }
  items.forEach(function (it) { el.appendChild(benchItemNode(it, place)); });
}

// ---- the paperdoll: gear on the figure, and the combat math it adds up to ----
var bdoll = document.getElementById("bdoll");
var dslots = document.getElementById("dslots");
var dstats = document.getElementById("dstats");
var DOLL_SLOTS = { weapon: "hand", shield: "off-hand", helm: "head", armor: "body", cloak: "back", feet: "feet" };
var dollSheet = null; // last sheet, so live status frames can re-dress the hp line
var dollHpVal = null; // the stance/hp value span, patched in place on every status

// The crouched-over-your-lockbox inventory keeps you IN the world — bleed ticks
// and blows land while the modal is open. Every status frame re-paints the
// doll's hp line so the figure never lies about your blood.
function dollPulse(hp, maxHp) {
  if (!dollSheet || !dollHpVal || !benchEl.classList.contains("open")) return;
  dollSheet.hp = hp; dollSheet.maxHp = maxHp;
  dollHpVal.textContent = dollStanceText();
}

function dollStanceText() {
  return dollSheet.stance + " \\u00b7 " + dollSheet.hp + "/" + dollSheet.maxHp + " hp"
    + (dollSheet.lit ? " \\u00b7 a torch burns in your grip" : "");
}

function dollLine(label, value) {
  var d = document.createElement("div");
  d.className = "dline";
  var l = document.createElement("span"); l.className = "lb"; l.textContent = label; d.appendChild(l);
  var v = document.createElement("span"); v.className = "vl"; v.textContent = value; d.appendChild(v);
  return d;
}

function renderDoll(sheet) {
  if (!sheet) { bdoll.classList.remove("on"); return; }
  dslots.textContent = ""; dstats.textContent = "";
  (sheet.slots || []).forEach(function (s) {
    var d = document.createElement("div"); d.className = "dslot";
    var l = document.createElement("span"); l.className = "lb"; l.textContent = DOLL_SLOTS[s.slot] || s.slot; d.appendChild(l);
    var v = document.createElement("span"); v.className = "it" + (s.name ? "" : " none");
    v.textContent = s.name ? s.name : "\\u2014";
    d.appendChild(v);
    if (s.name && s.cond && s.cond !== "sound") {
      var c = document.createElement("span"); c.className = "cd"; c.textContent = " (" + s.cond + ")"; d.appendChild(c);
    }
    dslots.appendChild(d);
  });
  var a = sheet.atk || {};
  var f = sheet.def || {};
  var atk = a.name + " \\u2014 " + a.style + " \\u00b7 " + a.dmg + " dmg";
  if (a.swings > 1) atk += " \\u00d7" + a.swings + " swings";
  if (a.sweep > 1) atk += " \\u00b7 sweeps " + a.sweep;
  if (a.bleed > 0) atk += " \\u00b7 opens bleeds";
  if (a.stun > 0) atk += " \\u00b7 can stun";
  if (a.ignore > 0) atk += " \\u00b7 ignores " + a.ignore + " armor";
  if (a.twoHanded) atk += " \\u00b7 both hands";
  dstats.appendChild(dollLine("attack", atk));
  var def = "armor " + f.armor + " \\u2014 turns " + f.mitigate + "% of a blow";
  if (f.block > 0) def += " \\u00b7 blocks " + f.block + "%";
  if (f.weight > 0) def += " \\u00b7 weight " + f.weight + " (drags at flight)";
  dstats.appendChild(dollLine("defence", def));
  dollSheet = sheet;
  var stanceLine = dollLine("stance", dollStanceText());
  dollHpVal = stanceLine.querySelector(".vl");
  dstats.appendChild(stanceLine);
  // No RECORD on the doll (rome, 2026-07-10) — the figure is about the kit you
  // stand in, not your history. The tallies live in the typed 'sheet' command.
  bdoll.classList.add("on");
}

function renderBench(state) {
  benchAtGate = !!state.atGate;
  // At a gate you truly step out of the world; in the dungeon you only crouch to
  // dig through your lockbox — still in the open, still in reach. Say so plainly.
  document.getElementById("btitle").textContent = benchAtGate ? "The gatehouse bench" : "Your lockbox";
  document.getElementById("bsub").textContent = benchAtGate
    ? "You've stepped out of the world. Nothing can reach you here \\u2014 sort your kit."
    : "You crouch to dig through your kit \\u2014 but you're still in the dungeon, in the open and in reach. Keep your eyes up.";
  bnote.textContent = state.note || (benchAtGate ? "" : "Away from a gate \\u2014 lockbox only. The vault and the seal wait at the gates.");
  benchEl.classList.toggle("nogate", !benchAtGate);
  renderDoll(state.sheet);
  fillBenchCol(bpack, "Your pack", state.pack || [], state.packCap || 0, "pack", state.packUsed, state.packFood, state.packFoodCap);
  fillBenchCol(block, "Lockbox", state.lockbox || [], state.lockboxCap, "lockbox", state.lockboxUsed);
  if (benchAtGate) {
    bvault.style.display = "";
    fillBenchCol(bvault, "Vault \\u00b7 the deep keep", state.vault || [], state.vaultCap, "vault", state.vaultUsed);
  } else {
    bvault.style.display = "none";
    bvault.textContent = "";
  }
  benchEl.classList.add("open");
}

// ---- the keeper's hatch: trade out of the world's reach ----
var tradeEl = document.getElementById("trade");
var tstock = document.getElementById("tstock");
var tgoods = document.getElementById("tgoods");
var tnote = document.getElementById("tnote");
var twant = document.getElementById("twant");
var tradeWant = null; // the named want, or null (offers disabled until named)
var tradeTab = "pack"; // which keeping the goods column shows: pack | lockbox | vault
var tradeState = null; // last trade payload, so tab switches re-render locally
document.getElementById("tclose").addEventListener("click", function () { tradeSend("close"); });

function tradeSend(action, row, src) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "trade", action: action, row: row || "", src: src || "" }));
}
function closeTrade() { tradeEl.classList.remove("open"); tradeState = null; hideModalChat(); }

// A stat token wears the chip colours: red bites, steel guards, gold gains,
// dim weighs. The shop teaches kit-building the same way the chips taught verbs.
function statTokenClass(tok) {
  if (/dmg|bleed|stun|swing|sweep|pierce/.test(tok)) return "st-atk";
  if (/armor|block/.test(tok)) return "st-def";
  if (/wards|quiet|slick|strapped|spiked|reach/.test(tok)) return "st-gain";
  return "st-dim"; // heavy, light, two-handed
}
function tradeItemNode(it, place) {
  var wrap = document.createElement("div");
  wrap.className = "trow";
  var nm = document.createElement("span");
  nm.className = "nm";
  nm.textContent = it.name + (it.n > 1 ? " (x" + it.n + ")" : "");
  wrap.appendChild(nm);
  if (it.stat) {
    var tags = document.createElement("span");
    tags.className = "tags";
    it.stat.split(", ").forEach(function (tok) {
      var s = document.createElement("span");
      s.className = statTokenClass(tok);
      s.textContent = tok;
      tags.appendChild(s);
    });
    wrap.appendChild(tags);
  }
  if (place === "stock") {
    var co = document.createElement("span");
    co.className = "tcost";
    co.textContent = String(it.cost);
    wrap.appendChild(co);
  }
  var b = document.createElement("button");
  b.type = "button";
  if (place === "stock") {
    b.textContent = "buy";
    b.addEventListener("click", function () { tradeSend("buy", it.id); });
  } else {
    b.textContent = "offer";
    b.disabled = !tradeWant;
    // The tab the item came from rides with the offer: '' = pack.
    var src = tradeTab === "pack" ? "" : tradeTab;
    b.addEventListener("click", function () { tradeSend("offer", it.id, src); });
  }
  wrap.appendChild(b);
  return wrap;
}

// His shelves read as a shop, not a ledger: steel, kit, physic, sundries —
// cheapest first within each. Older servers send no kind; everything falls
// to one unlabelled shelf and the modal still works.
var TRADE_SHELVES = [["steel", "STEEL"], ["kit", "KIT"], ["physic", "PHYSIC"], ["sundries", "KEYS & PAPERS"]];
function fillTradeCol(el, title, items, place) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = title;
  el.appendChild(h);
  if (!items.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = place === "goods" ? "\\u2014 nothing he'd take \\u2014" : "\\u2014 bare shelves \\u2014";
    el.appendChild(e);
    return;
  }
  if (place === "stock" && items.some(function (it) { return it.kind; })) {
    TRADE_SHELVES.forEach(function (shelf) {
      var group = items.filter(function (it) { return (it.kind || "sundries") === shelf[0]; });
      if (!group.length) return;
      var sh = document.createElement("div");
      sh.className = "tsech";
      sh.textContent = shelf[1];
      el.appendChild(sh);
      group.forEach(function (it) { el.appendChild(tradeItemNode(it, place)); });
    });
    return;
  }
  items.forEach(function (it) { el.appendChild(tradeItemNode(it, place)); });
}

// The goods column: tabs across your three keepings, so the lockbox and the
// vault trade as readily as your pockets. (Vault wealth is sealed — the
// keeper cracks seals when a deal closes.)
var TRADE_TABS = [["pack", "pockets"], ["lockbox", "lockbox"], ["vault", "vault"]];
function renderGoods() {
  tgoods.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = "Your goods";
  tgoods.appendChild(h);
  var tabs = document.createElement("div");
  tabs.className = "ttabs";
  TRADE_TABS.forEach(function (tb) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = tb[1];
    if (tb[0] === tradeTab) b.classList.add("on");
    b.addEventListener("click", function () { tradeTab = tb[0]; renderGoods(); });
    tabs.appendChild(b);
  });
  tgoods.appendChild(tabs);
  var items = (tradeState && tradeState.goods && tradeState.goods[tradeTab]) || [];
  if (!items.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\\u2014 nothing he'd take \\u2014";
    tgoods.appendChild(e);
    return;
  }
  items.forEach(function (it) { tgoods.appendChild(tradeItemNode(it, "goods")); });
}

function renderTrade(state) {
  tradeState = state;
  // The cart: a list of wants (buy the same thing twice and it lists twice),
  // paid against their summed cost. Truthy only while something's on the counter
  // \\u2014 that's what unlocks the offer buttons.
  tradeWant = (state.want && state.want.items && state.want.items.length) ? state.want : null;
  tnote.textContent = state.note || "";
  twant.textContent = "";
  if (tradeWant) {
    var lbl = document.createElement("span");
    lbl.className = "wname";
    lbl.textContent = "On the counter:";
    twant.appendChild(lbl);
    // Collapse duplicate wants into "name (x2)" rows, but remember one real
    // index per kind so 'remove' can pull a single copy back.
    var order = [];
    var seen = {};
    tradeWant.items.forEach(function (w, i) {
      if (seen[w.name] == null) { seen[w.name] = order.length; order.push({ name: w.name, n: 1, idx: i }); }
      else { order[seen[w.name]].n += 1; }
    });
    order.forEach(function (w) {
      var row = document.createElement("span");
      row.className = "wrow";
      var nm = document.createElement("span");
      nm.textContent = w.name + (w.n > 1 ? " (x" + w.n + ")" : "");
      row.appendChild(nm);
      var rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "\\u2715"; // pull one copy back off the counter
      rm.title = "take one back";
      rm.addEventListener("click", function () { tradeSend("unbuy", String(w.idx)); });
      row.appendChild(rm);
      twant.appendChild(row);
    });
    var prog = document.createElement("span");
    prog.className = "wprog";
    var short = tradeWant.cost - tradeWant.paid;
    prog.textContent = tradeWant.cost + " in trade \\u00b7 paid " + tradeWant.paid + (short > 0 ? " \\u00b7 " + short + " short" : "");
    twant.appendChild(prog);
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "wave it all off";
    cancel.addEventListener("click", function () { tradeSend("cancel"); });
    twant.appendChild(cancel);
  } else {
    var hint = document.createElement("span");
    hint.textContent = "Name your wants from his stock (buy as many as you like, the same twice if you want); then offer goods until he's square.";
    twant.appendChild(hint);
  }
  fillTradeCol(tstock, "His stock", state.stock || [], "stock");
  renderGoods();
  tradeEl.classList.add("open");
}

// ---- the gatehouse forge: what the bench can make from what you carry ----
var forgeEl = document.getElementById("forge");
var frecipes = document.getElementById("frecipes");
var fnote = document.getElementById("fnote");
var fhave = document.getElementById("fhave");
document.getElementById("fclose").addEventListener("click", function () { forgeSend("close"); });

function forgeSend(action, row) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "forge", action: action, row: row || "" }));
}
function closeForge() { forgeEl.classList.remove("open"); hideModalChat(); }

function forgeItemNode(it) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  nm.textContent = it.name;
  if (it.stat) { var st = document.createElement("span"); st.className = "stat"; st.textContent = " (" + it.stat + ")"; nm.appendChild(st); }
  var rr = document.createElement("span"); rr.className = "rar"; rr.textContent = " [" + it.rarity + "]"; nm.appendChild(rr);
  wrap.appendChild(nm);
  var cost = document.createElement("div");
  cost.className = "cost " + (it.can ? "ok" : "no");
  var txt = it.scrap + " scrap iron";
  if (it.material) txt += " + " + it.material.qty + " " + it.material.name + " (you have " + it.material.have + ")";
  cost.textContent = txt;
  wrap.appendChild(cost);
  var acts = document.createElement("div");
  acts.className = "acts";
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = "forge";
  b.disabled = !it.can;
  b.addEventListener("click", function () { forgeSend("craft", it.id); });
  acts.appendChild(b);
  wrap.appendChild(acts);
  return wrap;
}

function renderForge(state) {
  fnote.textContent = state.note || "";
  fhave.textContent = "";
  var lbl = document.createElement("span");
  lbl.textContent = "You have ";
  fhave.appendChild(lbl);
  var sc = document.createElement("span");
  sc.className = "scrap";
  sc.textContent = state.scrap + " scrap iron";
  fhave.appendChild(sc);
  var tail = document.createElement("span");
  tail.textContent = " across pack and keeping. Salvage gear at the bench to feed the pile.";
  fhave.appendChild(tail);
  frecipes.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = "The bench can make";
  frecipes.appendChild(h);
  var recipes = state.recipes || [];
  if (!recipes.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\\u2014 the recipe slate is blank \\u2014";
    frecipes.appendChild(e);
  } else {
    recipes.forEach(function (it) { frecipes.appendChild(forgeItemNode(it)); });
  }
  if (state.sfx) sndOne(state.sfx);
  forgeEl.classList.add("open");
}

// ---- the map modal: a chart you carry (true, or half a lie) ----
var mapEl = document.getElementById("mapm");
var mapBody = document.getElementById("mapbody");
document.getElementById("mapclose").addEventListener("click", closeMap);
function closeMap() { mapEl.classList.remove("open"); hideModalChat(); }
// The map is drawn live from the room graph the Worker sends (rooms + exits +
// which one you stand in) — not a fixed poster. Rooms have no coordinates, only
// directional exits, so we walk the graph onto a grid (north = up a cell, east =
// right, up/down = a vertical link) the way a MUD auto-mapper does. A crude map
// arrives already lied-to (rooms dropped, exits bent) and simply renders wrong.
var MAP_CELL = 108;             // px between cell centers at scale 1 (room to breathe)
var mapGraph = null;
var mapCam = { cx: 0, cy: 0, scale: 1 };
// The chart keeps its place: reopening shows where you last left it, not your
// room. First unrolling centers on you; the crosshair button recenters anytime.
var mapCamKept = false;
var mapCv = null, mapCtx = null, mapWrap = null, mapDpr = 1, mapWired = false;

function mapCssVar(name) {
  var v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || "#8a8a8a";
}
function mapRegionColor(region) {
  if (region === "gate") return mapCssVar("--steel");
  if (region === "deep") return mapCssVar("--blood");
  if (region === "out") return mapCssVar("--heal");   // the open ground: green and alive
  if (region === "sky") return mapCssVar("--cream");  // the overworks: pale, up in the wind
  if (region === "warrens") return mapCssVar("--dim"); // the warrens: packed earth
  return mapCssVar("--gold"); // the halls / default
}
// Fit a room name inside its tile: drop the leading "The " every room shares,
// then trim to the tile's inner width so the label can never spill onto a
// neighbour. Measured against the ctx's current font.
function mapFitLabel(ctx, name, maxW) {
  var t = String(name || "").replace(/^[Tt]he\\s+/, "");
  if (ctx.measureText(t).width <= maxW) return t;
  var ell = "\\u2026";
  while (t.length > 1 && ctx.measureText(t + ell).width > maxW) t = t.slice(0, -1);
  return t + ell;
}
function mapRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Walk the exit graph onto an integer grid, anchored at the room you're in so
// the map opens centered on you. Cells that collide (the graph has cycles) get
// nudged to the nearest free cell and their link is drawn bent.
// The world stacks like a cutaway: sky-road, the open surface (grounds and
// gates), then the HALLS — the buried keep. Every way from the surface into
// the halls is a stair (all three gates go DOWN; the sewer climbs UP out), so
// the gold dungeon draws a level beneath the green, as it truly lies (rome
// caught the flattened version, 2026-07-13). Then the warrens gnawed beneath,
// the deep at the bottom. Each stratum lays out on its own; no exit line ever
// crosses between strata — the tiles' \\u25b2\\u25bc badges carry the vertical ways.
var MAP_BAND_OF = { sky: 0, out: 1, gate: 1, upper: 2, warrens: 3, deep: 4 };
var MAP_BANDS = [
  { band: 0, label: "THE OVERWORKS" },
  { band: 1, label: "THE SURFACE" },
  { band: 2, label: "THE HALLS" },
  { band: 3, label: "THE WARRENS" },
  { band: 4, label: "THE DEEP" },
];
function buildMapGraph(f) {
  var nodes = {}, order = [];
  var regions = f.regions || [];
  for (var r = 0; r < regions.length; r++) {
    var grp = regions[r], key = grp.key || "upper", rooms = grp.rooms || [];
    for (var i = 0; i < rooms.length; i++) {
      var rm = rooms[i];
      if (nodes[rm.id]) continue;
      var band = MAP_BAND_OF[key] !== undefined ? MAP_BAND_OF[key] : 1;
      nodes[rm.id] = { id: rm.id, name: rm.name || rm.id, region: key, band: band, exits: rm.exits || [], here: !!rm.here };
      order.push(rm.id);
    }
  }
  var DELTA = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0], up: [-1, -1], down: [1, 1] };
  // A crude map drops rooms and severs exits, so its graph shatters into pieces.
  // Lay out each connected piece on its own, then pack the pieces as compact
  // clusters — never one endless row. The detailed map is one whole piece and
  // falls through this unchanged.
  var adj = {};
  for (var ai = 0; ai < order.length; ai++) adj[order[ai]] = [];
  for (var ai2 = 0; ai2 < order.length; ai2++) {
    var aex = nodes[order[ai2]].exits;
    for (var ae = 0; ae < aex.length; ae++) {
      var at2 = aex[ae]; if (!DELTA[at2.dir] || !nodes[at2.to]) continue;
      // Strata never merge: a cross-band exit is not a layout constraint, so
      // every connected piece stays pure to its own stratum.
      if (nodes[at2.to].band !== nodes[order[ai2]].band) continue;
      adj[order[ai2]].push(at2.to); adj[at2.to].push(order[ai2]);
    }
  }
  var compOf = {}, comps = [];
  for (var ci = 0; ci < order.length; ci++) {
    var seed = order[ci]; if (compOf[seed] !== undefined) continue;
    var list = [], stack = [seed]; compOf[seed] = comps.length;
    while (stack.length) {
      var cn = stack.pop(); list.push(cn);
      var nb = adj[cn]; for (var kb = 0; kb < nb.length; kb++) if (compOf[nb[kb]] === undefined) { compOf[nb[kb]] = comps.length; stack.push(nb[kb]); }
    }
    comps.push(list);
  }
  // Walk one piece onto its own local grid from an anchor room.
  function layoutComp(list, anchorId) {
    var lp = {}, occ = {};
    function ckey(x, y) { return x + "," + y; }
    function claim(id, x, y) {
      if (occ[ckey(x, y)] === undefined) { occ[ckey(x, y)] = id; lp[id] = { x: x, y: y, displaced: false }; return; }
      for (var ring = 1; ring <= 40; ring++) for (var dx = -ring; dx <= ring; dx++) for (var dy = -ring; dy <= ring; dy++) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        var k = ckey(x + dx, y + dy);
        if (occ[k] === undefined) { occ[k] = id; lp[id] = { x: x + dx, y: y + dy, displaced: true }; return; }
      }
      lp[id] = { x: x, y: y, displaced: true };
    }
    var anchor = (anchorId && nodes[anchorId]) ? anchorId : list[0];
    claim(anchor, 0, 0);
    var queue = [anchor], qi = 0;
    while (qi < queue.length) {
      var id = queue[qi++], at = lp[id];
      var exs = nodes[id].exits.slice().sort(function (a, b) {
        var av = (a.dir === "up" || a.dir === "down") ? 1 : 0, bv = (b.dir === "up" || b.dir === "down") ? 1 : 0;
        return av - bv;
      });
      for (var e = 0; e < exs.length; e++) {
        var d = DELTA[exs[e].dir], to = exs[e].to;
        if (d && nodes[to] && compOf[to] === compOf[anchor] && lp[to] === undefined) { claim(to, at.x + d[0], at.y + d[1]); queue.push(to); }
      }
    }
    // members the walk couldn't reach by direction (bent-only links) — tuck near origin
    for (var li = 0; li < list.length; li++) if (lp[list[li]] === undefined) claim(list[li], 0, 0);
    var mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (var pid in lp) { var p = lp[pid]; if (p.x < mnx) mnx = p.x; if (p.y < mny) mny = p.y; if (p.x > mxx) mxx = p.x; if (p.y > mxy) mxy = p.y; }
    return { lp: lp, mnx: mnx, mny: mny, w: mxx - mnx, h: mxy - mny };
  }
  // Strata stack top to bottom in true vertical order; within each, the pieces
  // (one whole piece on a true map; a crude copy's shattered fragments) pack
  // into rows, then the whole stratum centers on the shared axis — a cutaway,
  // not a staircase. The camera opens on your room, wherever it landed.
  var placed = {}, labels = [];
  var bandY = 0;
  for (var bi = 0; bi < MAP_BANDS.length; bi++) {
    var bcomps = [];
    for (var c2 = 0; c2 < comps.length; c2++) {
      if (nodes[comps[c2][0]].band === MAP_BANDS[bi].band) bcomps.push(comps[c2]);
    }
    if (!bcomps.length) continue;
    bcomps.sort(function (a, b) { return b.length - a.length; });
    var bandIds = [];
    var cursorX = 0, cursorY = bandY, rowH = 0, targetW = 12;
    for (var oi = 0; oi < bcomps.length; oi++) {
      var lo = layoutComp(bcomps[oi], bcomps[oi][0]);
      if (cursorX > 0 && cursorX + (lo.w + 1) > targetW) { cursorX = 0; cursorY += rowH + 2; rowH = 0; }
      var offx = cursorX - lo.mnx, offy = cursorY - lo.mny;
      for (var pid2 in lo.lp) {
        placed[pid2] = { x: lo.lp[pid2].x + offx, y: lo.lp[pid2].y + offy, displaced: lo.lp[pid2].displaced };
        bandIds.push(pid2);
      }
      cursorX += (lo.w + 1) + 2; if (lo.h > rowH) rowH = lo.h;
    }
    // center this stratum on x = 0
    var bx0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (var bb = 0; bb < bandIds.length; bb++) {
      var bp = placed[bandIds[bb]];
      if (bp.x < bx0) bx0 = bp.x; if (bp.x > bx1) bx1 = bp.x; if (bp.y > by1) by1 = bp.y;
    }
    var shiftX = -Math.round((bx0 + bx1) / 2);
    for (var bs = 0; bs < bandIds.length; bs++) placed[bandIds[bs]].x += shiftX;
    labels.push({ x: bx0 + shiftX - 0.35, y: bandY - 1.05, text: MAP_BANDS[bi].label });
    bandY = by1 + 3.4; // the gap between strata: room for the label beneath
  }
  var anchor = (f.here && placed[f.here]) ? f.here : (order.length ? order[0] : null);
  var edges = [], stubs = [], seen = {};
  for (var o = 0; o < order.length; o++) {
    var fid = order[o], fp = placed[fid]; if (!fp) continue;
    var fex = nodes[fid].exits;
    for (var e2 = 0; e2 < fex.length; e2++) {
      var ex = fex[e2], d2 = DELTA[ex.dir]; if (!d2) continue;
      var vertical = (ex.dir === "up" || ex.dir === "down");
      var tp = placed[ex.to];
      if (tp) {
        var ek = fid < ex.to ? fid + "|" + ex.to : ex.to + "|" + fid;
        if (seen[ek]) continue; seen[ek] = 1;
        // A way between strata draws as a faint gold thread across the gap —
        // the strata never lay out through each other, so these read clean.
        var cross = nodes[ex.to] && nodes[ex.to].band !== nodes[fid].band;
        var bent = fp.displaced || tp.displaced || Math.abs(fp.x - tp.x) > 1 || Math.abs(fp.y - tp.y) > 1;
        edges.push({ x1: fp.x, y1: fp.y, x2: tp.x, y2: tp.y, vertical: vertical, cross: !!cross, bent: bent && !vertical && !cross });
      } else if (!vertical) {
        // A compass way to a room this copy forgot; vertical stubs stay silent
        // (the badge already marks them).
        stubs.push({ x: fp.x, y: fp.y, dx: d2[0], dy: d2[1] });
      }
    }
  }
  return { nodes: nodes, order: order, placed: placed, edges: edges, stubs: stubs, labels: labels, here: anchor };
}

function mapResize() {
  if (!mapCv || !mapWrap) return;
  var rect = mapWrap.getBoundingClientRect();
  mapDpr = window.devicePixelRatio || 1;
  mapCv.width = Math.max(1, Math.round(rect.width * mapDpr));
  mapCv.height = Math.max(1, Math.round(rect.height * mapDpr));
  drawMap();
}
function drawMap() {
  if (!mapGraph || !mapCtx) return;
  var g = mapGraph, ctx = mapCtx, W = mapCv.width, H = mapCv.height, s = mapCam.scale * mapDpr;
  ctx.clearRect(0, 0, W, H);
  function sx(gx) { return (gx - mapCam.cx) * MAP_CELL * s + W / 2; }
  function sy(gy) { return (gy - mapCam.cy) * MAP_CELL * s + H / 2; }
  var dim = mapCssVar("--dim"), cream = mapCssVar("--cream"), bone = mapCssVar("--bone"), gold = mapCssVar("--gold"), heal = mapCssVar("--heal");
  // exits
  ctx.lineWidth = Math.max(1, 1.4 * s);
  for (var i = 0; i < g.edges.length; i++) {
    var ed = g.edges[i];
    ctx.strokeStyle = ed.vertical || ed.cross ? gold : dim;
    ctx.setLineDash(ed.vertical || ed.cross ? [2 * s, 4 * s] : (ed.bent ? [4 * s, 4 * s] : []));
    ctx.globalAlpha = ed.cross ? 0.4 : ed.vertical ? 0.85 : 1;
    ctx.beginPath(); ctx.moveTo(sx(ed.x1), sy(ed.y1)); ctx.lineTo(sx(ed.x2), sy(ed.y2)); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // exits that leave the map (off-chart or, on a crude copy, lead nowhere): a stub
  for (var st = 0; st < g.stubs.length; st++) {
    var su = g.stubs[st], x0 = sx(su.x), y0 = sy(su.y);
    ctx.strokeStyle = dim; ctx.globalAlpha = 0.45; ctx.setLineDash([3 * s, 3 * s]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + su.dx * MAP_CELL * s * 0.5, y0 + su.dy * MAP_CELL * s * 0.5); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // stratum names, set faint above each layer of the cutaway
  if (g.labels) {
    ctx.fillStyle = dim; ctx.globalAlpha = 0.65;
    ctx.font = ((11 * s) | 0) + "px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (var lb = 0; lb < g.labels.length; lb++) {
      ctx.fillText(g.labels[lb].text.split("").join("\\u2009"), sx(g.labels[lb].x), sy(g.labels[lb].y));
    }
    ctx.globalAlpha = 1;
  }
  // rooms — wide, low label-plates so a name has somewhere to sit
  var tw = MAP_CELL * s * 0.80, th = MAP_CELL * s * 0.33;
  for (var o = 0; o < g.order.length; o++) {
    var id = g.order[o], p = g.placed[id]; if (!p) continue;
    var nd = g.nodes[id], cx = sx(p.x), cy = sy(p.y), col = mapRegionColor(nd.region);
    mapRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6 * s);
    ctx.globalAlpha = nd.here ? 0.30 : 0.15; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    if (nd.here) { ctx.shadowColor = heal; ctx.shadowBlur = 16 * s; }
    ctx.lineWidth = nd.here ? Math.max(2, 2.2 * s) : Math.max(1, 1.1 * s);
    ctx.strokeStyle = nd.here ? heal : col;
    mapRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6 * s); ctx.stroke();
    ctx.shadowBlur = 0;
    var hasU = false, hasD = false;
    for (var x = 0; x < nd.exits.length; x++) { if (nd.exits[x].dir === "up") hasU = true; if (nd.exits[x].dir === "down") hasD = true; }
    if (hasU || hasD) {
      ctx.fillStyle = gold; ctx.font = ((10 * s) | 0) + "px ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText((hasU ? "\\u25b2" : "") + (hasD ? "\\u25bc" : ""), cx + tw / 2 - 3 * s, cy - th / 2 + 2 * s);
    }
    if (mapCam.scale >= 0.6) {
      ctx.fillStyle = nd.here ? cream : bone; ctx.font = (((nd.here ? 11.5 : 11) * s) | 0) + "px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // clip to the plate so even a mis-measured label can't bleed out; leave
      // extra right margin when an up/down badge shares the top corner.
      var maxW = tw - ((hasU || hasD) ? 24 * s : 12 * s);
      ctx.save();
      mapRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6 * s); ctx.clip();
      ctx.fillText(mapFitLabel(ctx, nd.name, maxW), cx, cy);
      ctx.restore();
    }
  }
}
function mapZoom(f) { mapCam.scale = Math.max(0.4, Math.min(2.6, mapCam.scale * f)); drawMap(); }
function mapCenterHere() {
  if (mapGraph && mapGraph.placed[mapGraph.here]) { var p = mapGraph.placed[mapGraph.here]; mapCam.cx = p.x; mapCam.cy = p.y; }
  drawMap();
}
function wireMap() {
  if (mapWired) return; mapWired = true;
  mapCv = document.getElementById("mapcv"); mapCtx = mapCv.getContext("2d"); mapWrap = document.getElementById("mapwrap");
  var dragging = false, lx = 0, ly = 0;
  mapCv.addEventListener("pointerdown", function (e) { dragging = true; lx = e.clientX; ly = e.clientY; mapWrap.classList.add("drag"); try { mapCv.setPointerCapture(e.pointerId); } catch (_) {} });
  mapCv.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    mapCam.cx -= (e.clientX - lx) / (MAP_CELL * mapCam.scale); mapCam.cy -= (e.clientY - ly) / (MAP_CELL * mapCam.scale);
    lx = e.clientX; ly = e.clientY; drawMap();
  });
  function end() { dragging = false; mapWrap.classList.remove("drag"); }
  mapCv.addEventListener("pointerup", end); mapCv.addEventListener("pointercancel", end);
  mapCv.addEventListener("wheel", function (e) { e.preventDefault(); mapZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  document.getElementById("mapzin").addEventListener("click", function () { mapZoom(1.25); });
  document.getElementById("mapzout").addEventListener("click", function () { mapZoom(1 / 1.25); });
  document.getElementById("mapzhere").addEventListener("click", mapCenterHere);
  window.addEventListener("resize", function () { if (mapEl.classList.contains("open")) mapResize(); });
}

function renderMap(f) {
  var detailed = !!f.detailed;
  var wall = !!f.wall;
  mapEl.classList.toggle("crude", !detailed);
  document.getElementById("maptitle").textContent = wall ? "The Wall Chart" : detailed ? "Surveyor's Map" : "Crude Map";
  document.getElementById("mapsub").textContent = wall
    ? "The shallow halls, scratched into the plaster by everyone who walked them and made it back."
    : detailed
      ? "Every hall of the Door, set down true."
      : "Copied from half a memory. Some of it is right. Trust it at your peril.";
  document.getElementById("maphint").textContent = wall
    ? "true, as far as it goes \\u00b7 the deep is not on it \\u00b7 drag to pan"
    : detailed
      ? "drag to pan \\u00b7 scroll to zoom"
      : "an unreliable copy \\u00b7 drag to pan";
  // A true map is knowledge kept: its rooms light gold on the HUD hereafter.
  if (detailed && Array.isArray(f.reveal)) {
    for (var i = 0; i < f.reveal.length; i++) knownRooms[f.reveal[i]] = 1;
  }
  wireMap();
  mapGraph = buildMapGraph(f);
  if (!mapCamKept) {
    mapCam.scale = 1;
    mapCenterHere();
    mapCamKept = true;
  }
  closeJournal();
  mapEl.classList.add("open");
  // The canvas has no size until the modal is laid out — size and draw next frame.
  requestAnimationFrame(mapResize);
  sndOne("unfurl");
}

// ---- the journal modal: your bestiary, earned by study and blood ----
var jrnlEl = document.getElementById("jrnl");
var jBody = document.getElementById("jbody");
document.getElementById("jclose").addEventListener("click", closeJournal);
function closeJournal() { jrnlEl.classList.remove("open"); hideModalChat(); }
var JTIER = { 1: "sighted", 2: "hunted", 3: "known cold" };
function renderJournal(f) {
  jBody.textContent = "";
  var entries = f.entries || [];
  if (!entries.length) {
    var em = document.createElement("div");
    em.className = "jempty";
    em.textContent = "The pages are blank. Study a creature, and kill a few, and it will fill.";
    jBody.appendChild(em);
  }
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var card = document.createElement("div");
    card.className = "jent";
    var head = document.createElement("div");
    head.className = "jn";
    var nm = document.createElement("span");
    nm.textContent = e.name;
    head.appendChild(nm);
    if (e.boss) { var bt = document.createElement("span"); bt.className = "jboss"; bt.textContent = "throne"; head.appendChild(bt); }
    card.appendChild(head);
    var tier = document.createElement("div");
    tier.className = "jtier";
    tier.textContent = (JTIER[e.tier] || "noted") + " \\u00b7 " + e.kills + (e.kills === 1 ? " kill" : " kills") + (e.studied ? " \\u00b7 studied" : "");
    card.appendChild(tier);
    if (e.nature) { var nat = document.createElement("div"); nat.className = "jnat"; nat.textContent = e.nature; card.appendChild(nat); }
    if (e.note) { var no = document.createElement("div"); no.className = "jnote"; no.textContent = e.note; card.appendChild(no); }
    if (e.tier >= 3) {
      var st = document.createElement("div");
      st.className = "jstats";
      function stat(label, val) {
        var s = document.createElement("span");
        s.textContent = label + " ";
        var b = document.createElement("b");
        b.textContent = val;
        s.appendChild(b);
        st.appendChild(s);
      }
      stat("level", String(e.level));
      stat("hp", String(e.hp));
      stat("damage", e.dmg);
      stat("armour", String(e.armor));
      if (e.loot) stat("drops", e.loot);
      card.appendChild(st);
    } else {
      var lk = document.createElement("div");
      lk.className = "jlocked";
      lk.textContent = e.tier >= 2
        ? "Kill and study it more for the hard numbers."
        : "You've watched it, not fought it. Blood fills the rest.";
      card.appendChild(lk);
    }
    jBody.appendChild(card);
  }
  closeMap();
  jrnlEl.classList.add("open");
  sndOne("page");
}

// Read-only, so a backdrop tap or Escape closes them (the bench/trade own their
// clicks because they hold live state; these hold none).
mapEl.addEventListener("click", function (e) { if (e.target === mapEl) closeMap(); });
jrnlEl.addEventListener("click", function (e) { if (e.target === jrnlEl) closeJournal(); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && (mapEl.classList.contains("open") || jrnlEl.classList.contains("open"))) {
    closeMap(); closeJournal();
  }
});

cmd.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    var text = cmd.value.trim();
    cmd.value = "";
    if (!text) return;
    sendCmd(text);
  } else if (e.key === "ArrowUp") {
    if (histAt < history.length - 1) { histAt++; cmd.value = history[histAt]; }
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    if (histAt > 0) { histAt--; cmd.value = history[histAt]; } else { histAt = -1; cmd.value = ""; }
    e.preventDefault();
  }
});
document.body.addEventListener("click", function (e) {
  var t = e.target;
  if (!t || !t.closest) return;
  if (t.closest("#idpanel")) return; // clicks inside the panel stay there
  if (t.closest("#bench")) return; // the bench owns its own clicks; no focus-steal, no backdrop-dismiss
  var onBtn = t.closest("#idbtn");
  var panel = document.getElementById("idpanel");
  if (!onBtn && panel) panel.classList.remove("open");
  if (onBtn || t.tagName === "BUTTON" || t.tagName === "INPUT") return; // no keyboard steal
  var sel = window.getSelection();
  if (sel && sel.toString()) return; // selecting text from the log — don't wipe it
  cmd.focus();
});

// The keys panel: same identity actions as the commands, for people who
// click before they type.
var idbtn = document.getElementById("idbtn");
var idpanel = document.getElementById("idpanel");
var idname = document.getElementById("idname");
var idnpub = document.getElementById("idnpub");
var idcopy = document.getElementById("idcopy");
var idext = document.getElementById("idext");
var idback = document.getElementById("idback");
var idconn = document.getElementById("idconn");
var idpaste = document.getElementById("idpaste");
var sectsave = document.getElementById("sectsave");
var sectown = document.getElementById("sectown");
var sectgoogle = document.getElementById("sectgoogle");
var glbl = document.getElementById("glbl");
var gstate = document.getElementById("gstate");
var gnote = document.getElementById("gnote");
var idgoogle = document.getElementById("idgoogle");
var sectback = document.getElementById("sectback");
var lastName = "";
var lastNamed = false;      // did the server say this name was chosen (named=1)?
var nameHint = null;        // a kind-0 name pre-fetched at restore, ready to claim
var nameClaimed = false;    // guard: claim a restored identity's real name once

function shortNpub(n) { return n.slice(0, 13) + "\\u2026" + n.slice(-6); }

idnpub.addEventListener("click", function () {
  var full = idnpub.getAttribute("data-npub");
  if (!full || !navigator.clipboard) return;
  navigator.clipboard.writeText(full).then(function () {
    var was = idnpub.textContent;
    idnpub.textContent = "copied";
    setTimeout(function () { idnpub.textContent = was; }, 1500);
  }, function () {});
});

idconn.addEventListener("click", function () {
  idpanel.classList.remove("open");
  connectSignerApp();
});

// The Drive vault: self-custody backup. One encrypted file in YOUR Drive,
// sealed by a PIN only you know — the dungeon never sees the key or the PIN.
// Cross-app by design: a vault written by another Nostr app restores here
// (picked once via Google's file picker, remembered forever after).
// Masked PIN dialog — a PIN never appears on screen or in a browser prompt.
var vmodal = document.getElementById("vmodal");
var vmtitle = document.getElementById("vmtitle");
var vminput = document.getElementById("vminput");
var vmok = document.getElementById("vmok");
var vmcancel = document.getElementById("vmcancel");
var vmResolve = null;
var vmMode = "secret"; // "secret" (masked input) | "confirm" (yes/no)
// One box, two uses: a masked PIN entry, and a themed yes/no. Resolves with the
// PIN string (or null) for secret; true/false for confirm.
function vmOpen(mode, title, okLabel) {
  return new Promise(function (resolve) {
    vmMode = mode;
    vmResolve = resolve;
    vmtitle.textContent = title;
    vmok.textContent = okLabel || (mode === "confirm" ? "yes" : "unlock");
    vminput.value = "";
    vminput.style.display = mode === "secret" ? "" : "none";
    vmodal.classList.add("open");
    setTimeout(function () { (mode === "secret" ? vminput : vmok).focus(); }, 40);
  });
}
function askSecret(title, okLabel) { return vmOpen("secret", title, okLabel); }
function askConfirm(title, okLabel) { return vmOpen("confirm", title, okLabel); }
function vmDone(ok) {
  if (!vmResolve) return;
  vmodal.classList.remove("open");
  var r = vmResolve;
  vmResolve = null;
  var val = vmMode === "confirm" ? ok : (ok ? vminput.value || null : null);
  vminput.value = "";
  r(val);
}
vmok.addEventListener("click", function () { vmDone(true); });
vmcancel.addEventListener("click", function () { vmDone(false); });
// Deliberately NO backdrop-click dismissal: a stray click on the dark area used
// to silently cancel — and on the PIN prompt that jumps to Face ID. Use a button.
vminput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") vmDone(true);
  if (e.key === "Escape") vmDone(false);
});

var vaultMod = null;
async function vaultKit() {
  if (!vaultMod) {
    vaultMod = await import("/vault.js");
    vaultMod.configureNostrAuth({
      googleClientId: GOOGLE_CLIENT_ID,
      googlePickerApiKey: GOOGLE_PICKER_KEY,
      appName: "NOMAD",
      driveVaultName: "nostr-account-vault.json",
    });
  }
  return vaultMod;
}

function verr(e) { return e && e.message ? e.message : String(e); }

// Offer Face ID / Touch ID as a BACKUP way into the vault, for when the PIN is
// forgotten. It adds a second wrap over the same DEK and writes the vault back;
// the PIN keeps working unchanged. The passkey is bound to nomadmud.com, so it
// can't ride along from another app — it's enrolled fresh here.
async function offerPasskeyRecovery(m, tok, found, dek) {
  try { if (!(await m.isPasskeySupported())) return; } catch (e) { return; }
  var ok = await askConfirm(
    "Add Face ID / Touch ID as a backup key to this vault, so a forgotten PIN can still get you in?",
    "add Face ID",
  );
  if (!ok) return;
  try {
    var rp = await m.createRecoveryPasskey(lastName || "wanderer");
    var wrap = await m.wrapDekWithPasskey(dek, rp.prfSecret, rp.credentialId, rp.prfSalt);
    var updated = m.withPasskeyWrap(found.backup, wrap);
    found.backup = updated;
    await m.writeVault(tok, updated, found.fileId || m.getVaultId());
    print("\\u2014 Face ID is now a backup key to your vault \\u2014", "sys");
  } catch (e) {
    print("\\u2014 couldn't add Face ID: " + verr(e) + " \\u2014", "sys");
  }
}

// Lost-PIN path: recover the vault's DEK with the enrolled passkey. Returns
// { secret, dek } or null. Sign-in and the optional new-PIN step happen AFTER
// this returns, so a recovery never blocks behind a PIN prompt.
async function recoverWithPasskey(m, found) {
  var meta = m.getPasskeyWrapMeta(found.backup);
  if (!meta) return null;
  print("\\u2014 present Face ID / Touch ID\\u2026 \\u2014", "sys");
  try {
    var prf = await m.getRecoveryPasskeyPrf(meta.credentialId, meta.salt);
    var dek = await m.unlockDekWithPasskey(found.backup, prf);
    var secret = await m.decryptNsecFromDek(found.backup, dek);
    return { secret: secret, dek: dek };
  } catch (e) {
    print("\\u2014 Face ID couldn't open this vault: " + verr(e) + " \\u2014", "sys");
    return null;
  }
}

// After a Face ID recovery (the PIN was forgotten) you're ALREADY signed in;
// this just offers a fresh PIN — the portable key that opens the vault on your
// other devices. Skipping it leaves you logged in with Face ID on this device.
async function offerNewPin(m, tok, found, dek) {
  var np1 = await askSecret("Set a NEW PIN for this vault? It's the portable key that opens it on your other devices. Cancel to skip \\u2014 you're already in.", "set PIN");
  if (!np1) return;
  var np2 = await askSecret("The same new PIN, once more.", "set PIN");
  if (np1 !== np2) { print("\\u2014 the PINs disagree; PIN unchanged \\u2014", "sys"); return; }
  try {
    var updated = await m.rewrapPin(found.backup, dek, np1);
    found.backup = updated;
    await m.writeVault(tok, updated, found.fileId || m.getVaultId());
    print("\\u2014 new PIN set \\u2014", "sys");
  } catch (e) { print("\\u2014 couldn't set new PIN: " + verr(e) + " \\u2014", "sys"); }
}

// Get into the found vault, or offer the ways out. Returns
// { secret, dek, mode, found, hasBio } or null. mode is "pin" | "recovered" |
// "fresh". Every dead end has an exit: forget the PIN and you get Face ID;
// forget BOTH and you can start over with a new vault. (Starting over erases
// the old key for good — that's the price of a keeper-less, self-custody vault.)
async function openVault(m, tok, found) {
  var hasBio = false;
  try { hasBio = m.hasPasskeyWrap(found.backup); } catch (e) {}
  // Primary door: the PIN. A wrong PIN is almost always a typo, so it just
  // RE-PROMPTS — it never cascades toward creating or replacing a key. Only a
  // deliberate Cancel opens the "other ways in" menu below.
  while (true) {
    var pin = await askSecret("Vault PIN \\u2014 the one you chose when you made it. (Wrong vault, or lost the PIN? Cancel for other ways in.)");
    if (!pin) break; // cancelled → escape menu
    try {
      var dek = await m.unlockDekWithPin(found.backup, pin);
      var secret = await m.decryptNsecFromDek(found.backup, dek);
      return { secret: secret, dek: dek, mode: "pin", found: found, hasBio: hasBio };
    } catch (e) {
      print("\\u2014 that PIN doesn't turn \\u2014 try again, or Cancel for other ways in \\u2014", "sys");
    }
  }
  // Only reached by a deliberate Cancel — never by a wrong PIN. Each option is
  // its own explicit choice; the destructive one is last and clearly labelled.
  if (hasBio && await askConfirm("Unlock with Face ID / Touch ID instead?", "use Face ID")) {
    var r = await recoverWithPasskey(m, found);
    if (r) return { secret: r.secret, dek: r.dek, mode: "recovered", found: found, hasBio: hasBio };
  }
  // Point Google at a DIFFERENT file in your Drive — e.g. this isn't the vault
  // it auto-opened, or it's a vault another app wrote. Picking grants per-file
  // access, so we can then unlock it like any other.
  if (await askConfirm("Pick a different vault file from your Google Drive?", "pick from Drive")) {
    var picked = await m.pickDriveFile(tok);
    if (picked) {
      m.setVaultId(picked);
      try {
        var pb = await m.readVaultById(tok, picked);
        return await openVault(m, tok, { fileId: picked, backup: pb });
      } catch (e) {
        print("\\u2014 couldn't read that file: " + verr(e) + " \\u2014", "sys");
      }
    }
  }
  if (await askConfirm(
    "Start over with a NEW vault? This ERASES the vault on this Google account \\u2014 its key is lost for good \\u2014 and seals your current wanderer in its place.",
    "start over",
  )) {
    return await replaceVault(m, tok, found);
  }
  return null;
}

// Seal the CURRENT wanderer into a fresh vault, overwriting the old one. The
// only way through when both the PIN and Face ID are lost: the old key can't be
// recovered (by design), so this trades it for a clean start.
async function replaceVault(m, tok, found) {
  var pin1 = await askSecret("Choose a PIN for your NEW vault \\u2014 the only thing that opens it. Nobody can reset it.", "seal");
  if (!pin1) { print("\\u2014 nothing written \\u2014", "sys"); return null; }
  var pin2 = await askSecret("The same PIN, once more.", "seal");
  if (pin1 !== pin2) { print("\\u2014 the PINs disagree; nothing written \\u2014", "sys"); return null; }
  var made = await m.createBackup(nip19.nsecEncode(sk), pin1);
  var fid = await m.writeVault(tok, made.backup, found ? found.fileId : m.getVaultId());
  return { secret: nip19.nsecEncode(sk), dek: made.dek, mode: "fresh", found: { fileId: fid, backup: made.backup }, hasBio: false };
}

// The one Google door: sign in, then open your Drive vault — or, if there
// isn't one yet, seal THIS wanderer into a new one. Login and backup are the
// same act, because the vault IS the identity. Self-custody: the dungeon never
// holds the key or the PIN.
async function continueWithGoogle() {
  idpanel.classList.remove("open");
  try {
    var m = await vaultKit();
    print("\\u2014 a courier climbs toward your Drive\\u2026 \\u2014", "sys");
    var tok = (await m.requestGoogleAuth()).accessToken;

    // Find a vault this account can open: remembered/created, then the legacy
    // hidden copy, then (offered) a foreign vault picked from Drive.
    var found = await m.findVault(tok);
    if (!found) {
      var legacy = null;
      try { legacy = await m.readLegacyAppData(tok); } catch (e) {}
      if (legacy) found = { fileId: null, backup: legacy };
    }
    if (!found) {
      var wantImport = await askConfirm(
        "Already have a vault in your Drive? Pick it from Google Drive to open it. (Cancel to seal THIS wanderer into a brand-new vault instead.)",
        "pick from Drive",
      );
      if (wantImport) {
        var picked = await m.pickDriveFile(tok);
        if (picked) { found = { fileId: picked, backup: await m.readVaultById(tok, picked) }; m.setVaultId(picked); }
      }
    }

    if (found) {
      // Unlock first, sign in, THEN offer any follow-ups — so cancelling an
      // offer never feels like being thrown back to the start.
      var opened = await openVault(m, tok, found);
      if (!opened) { print("\\u2014 the vault stays shut \\u2014", "sys"); return; }
      if (importKey(opened.secret)) {
        localStorage.setItem("nomad_vault_pk", getPublicKey(sk));
        print(opened.mode === "fresh"
          ? "\\u2014 a fresh vault sealed; the old one is gone. This wanderer is yours to keep. \\u2014"
          : "\\u2014 the vault opens; you are yourself again \\u2014", "sys");
        // Now signed in. Optional follow-ups: set a fresh PIN if you just
        // recovered by Face ID; otherwise offer to enroll Face ID if there
        // isn't one yet (covers a brand-new vault and a PIN-only login).
        if (opened.mode === "recovered") await offerNewPin(m, tok, opened.found, opened.dek);
        else if (!opened.hasBio) await offerPasskeyRecovery(m, tok, opened.found, opened.dek);
      }
      return;
    }

    // CREATE: no vault — seal the current wanderer into a new one.
    var pin1 = await askSecret("Choose a PIN to seal this wanderer into a new Drive vault. It is the ONLY thing that opens it \\u2014 nobody can reset it.", "seal");
    if (!pin1) { print("\\u2014 nothing written \\u2014", "sys"); return; }
    var pin2b = await askSecret("The same PIN, once more.", "seal");
    if (pin1 !== pin2b) { print("\\u2014 the PINs disagree; nothing written \\u2014", "sys"); return; }
    var made = await m.createBackup(nip19.nsecEncode(sk), pin1);
    var fid = await m.writeVault(tok, made.backup, m.getVaultId());
    localStorage.setItem("nomad_vault_pk", getPublicKey(sk));
    print("\\u2014 sealed into your Drive. This wanderer is yours to keep; your PIN brings it back anywhere. \\u2014", "sys");
    await offerPasskeyRecovery(m, tok, { fileId: fid, backup: made.backup }, made.dek);
  } catch (e) {
    print("\\u2014 vault: " + verr(e) + " \\u2014", "sys");
  }
}

async function refreshIdPanel() {
  var showName = lastName && !/^[0-9a-f]{8}$/.test(lastName) ? lastName : "";
  if (method === "ext" || method === "bunker") {
    idname.textContent = showName || (method === "ext" ? "your extension's keys" : "your signer's keys");
    idnpub.textContent = method === "ext" ? "extension" : "signer app";
    idnpub.removeAttribute("data-npub");
    try {
      var pk = method === "ext" ? await window.nostr.getPublicKey() : (bunkerClient && bunkerClient.userPubkey);
      if (pk) {
        var np = nip19.npubEncode(pk);
        idnpub.textContent = shortNpub(np);
        idnpub.setAttribute("data-npub", np);
      }
    } catch (e) {}
    sectsave.style.display = "none";
    sectown.style.display = "none";
    sectgoogle.style.display = "none";
    sectback.style.display = "";
    idback.textContent = "use the pocket keys instead";
  } else {
    var myPk = getPublicKey(sk);
    var np2 = nip19.npubEncode(myPk);
    idname.textContent = showName || "a nameless wanderer";
    idnpub.textContent = shortNpub(np2);
    idnpub.setAttribute("data-npub", np2);
    sectsave.style.display = "";
    idcopy.textContent = "copy secret key";
    sectgoogle.style.display = "";
    // Two states: signed into your Drive vault (self-custody), or a fresh
    // guest who sees every door.
    var vpk = localStorage.getItem("nomad_vault_pk");
    if (vpk && vpk === myPk) {
      glbl.textContent = "SIGNED IN \\u2014 DRIVE VAULT";
      gstate.textContent = "\\u2713 your key lives in a vault in your own Drive \\u2014 Continue with Google + your PIN restores it on any device.";
      gstate.style.display = "";
      idgoogle.style.display = "none";
      gnote.style.display = "none";
      sectown.style.display = "none";
      sectback.style.display = "";
      idback.textContent = "sign out";
    } else {
      glbl.textContent = "EASY MODE";
      gstate.style.display = "none";
      idgoogle.style.display = "";
      gnote.style.display = "";
      sectown.style.display = "";
      idext.style.display = window.nostr ? "" : "none";
      sectback.style.display = localStorage.getItem("nomad_sk_prev") ? "" : "none";
      idback.textContent = "return to previous keys";
    }
  }
}

// Settings live under the wordmark: click NOMAD, flip the sound.
var brand = document.getElementById("brand");
var setpanel = document.getElementById("setpanel");
var sndbtn = document.getElementById("sndbtn");
function renderSnd() {
  sndbtn.textContent = soundOn ? "on" : "off";
  sndbtn.className = soundOn ? "on" : "";
}
function setSound(on) {
  soundOn = on;
  localStorage.setItem("nomad_sound", on ? "1" : "0");
  renderSnd();
  if (on) {
    sndInit();
    if (actx) { startAmb(); playSounds(["chime"]); }
  } else {
    stopAmb();
  }
}
renderSnd();
brand.addEventListener("click", function () {
  idpanel.classList.remove("open");
  setpanel.classList.toggle("open");
});
sndbtn.addEventListener("click", function () { setSound(!soundOn); });

// Command chips: the tappable hints above the prompt. Veterans type; the
// toggle remembers, and flipping it back repaints the last set instantly.
var chipbtn = document.getElementById("chipbtn");
function renderChipBtn() {
  chipbtn.textContent = chipsOn ? "on" : "off";
  chipbtn.className = chipsOn ? "on" : "";
}
renderChipBtn();
chipbtn.addEventListener("click", function () {
  chipsOn = !chipsOn;
  localStorage.setItem("nomad_chips", chipsOn ? "1" : "0");
  renderChipBtn();
  renderChips(lastSuggest, lastCombat);
});

// ---- themes: the Door in different lights ----
// Five local presets, one row in settings; the relays add the rest below.
var THEME_VARS = ["bg", "panel", "cream", "dim", "gold", "blood", "bone", "steel", "heal", "omen", "voice", "border", "border2", "line"];
var THEME_ORDER = ["door", "bone", "moss", "abyss", "ember"];
// 'heal' is the mending-green (eat/bandage/rest chips): a distinct hue that must
// stay legible on each ground, so — like blood/steel — it's tuned per theme
// (bright on the dark grounds, dark on the light 'bone', kept off the acid gold
// on 'moss'). 'omen' is the world-event violet (#log .evt) under the same law:
// bright on the dark grounds, a dark plum on 'bone'. Foreign themes derive
// both in dittoToVars.
// 'voice' is the living-speech hue (#log .say) under the same law as heal/omen:
// a color nothing else wears, tuned per ground so a person never reads as
// weather. It is a ROSE — firelit flesh — because in a world of bone, rust and
// stone the one living thing should read like a face, not like a signal lamp.
// It is deliberately held ~33° of hue off 'blood' on every theme, and much
// lighter, so a voice can never be mistaken for a wound. On the light 'bone'
// ground it inverts to a deep wine-rose.
var THEMES = {
  door:  { bg: "#16120c", panel: "#1e1912", cream: "#ede3cc", dim: "#9a8b66", gold: "#d8a94e", blood: "#c96f5a", bone: "#c9bda3", steel: "#a4bec0", heal: "#8faa6b", omen: "#b195c9", voice: "#e79ab6", border: "#3a3020", border2: "#4a3c22", line: "#2c2418" },
  bone:  { bg: "#e9e1cd", panel: "#efe8d8", cream: "#2c2418", dim: "#7c6f52", gold: "#8a6414", blood: "#a33c2a", bone: "#57503e", steel: "#3f6470", heal: "#4c6b2c", omen: "#6b4291", voice: "#a5325f", border: "#c6b791", border2: "#a8996f", line: "#d6cbaa" },
  moss:  { bg: "#0a100a", panel: "#111a11", cream: "#cfe3c4", dim: "#6f8a63", gold: "#93d45f", blood: "#d4785f", bone: "#a8bf9a", steel: "#9cc2b8", heal: "#5fbf8a", omen: "#c0a3dc", voice: "#eb9cba", border: "#2a3a22", border2: "#39512c", line: "#1c2a16" },
  abyss: { bg: "#0a0d14", panel: "#111624", cream: "#ccd9e8", dim: "#6e82a0", gold: "#7fb4e0", blood: "#d06a5a", bone: "#a4b4c8", steel: "#9fc2dc", heal: "#7fc48a", omen: "#b6a2e2", voice: "#e79cbc", border: "#243049", border2: "#2f4160", line: "#171f33" },
  ember: { bg: "#150b07", panel: "#1e110b", cream: "#ecd8c2", dim: "#a37c5e", gold: "#e8873c", blood: "#e0563a", bone: "#c8a88e", steel: "#a6b4c4", heal: "#9cba63", omen: "#c9a2c4", voice: "#f2a4c1", border: "#46291a", border2: "#5c3722", line: "#331e12" },
};
var thbtn = document.getElementById("thbtn");
var thbrowse = document.getElementById("thbrowse");
var thlist = document.getElementById("thlist");
var themeName = localStorage.getItem("nomad_theme") || "door";
// Anything reaching our CSS vars must be strict hex — presets, or a vetted
// derivation of a foreign 36767. Never raw relay strings.
function okColor(v) { return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v); }
// Perceptual brightness of a hex colour, 0 (black) .. 1 (white).
function hexLum(hex) {
  var h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}
function applyThemeColors(c) {
  for (var i = 0; i < THEME_VARS.length; i++) {
    if (okColor(c[THEME_VARS[i]])) document.documentElement.style.setProperty("--" + THEME_VARS[i], c[THEME_VARS[i]]);
  }
  // Set how bright a key-coloured name should ride from THIS theme's ground,
  // whatever theme it is (built-in or a worn Nostr one). On a dark ground names
  // ride bright; on a light ground they go deep — so a name holds contrast on
  // any world the wearer has chosen. hsl() re-resolves these live, so names
  // recolour the instant the theme changes, with no re-render.
  var lightGround = hexLum(c && c.bg) > 0.5;
  document.documentElement.style.setProperty("--name-s", lightGround ? "62%" : "55%");
  document.documentElement.style.setProperty("--name-l", lightGround ? "36%" : "70%");
  applyThemeFont(c && c._font);
}
// A worn theme may bring its own face. We honor the family and, if Ditto gave
// a font URL, load it — but the SIZE stays locked: --theme-fadjust pins the
// swapped face to the monospace x-height so a big display font can't blow up
// the layout. Built-in themes carry no _font, so this clears back to mono.
function clearThemeFont() {
  document.documentElement.style.removeProperty("--theme-font");
  document.documentElement.style.removeProperty("--theme-fadjust");
}
function safeFontFamily(name) {
  return String(name || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 40);
}
function applyThemeFont(f) {
  var fam = f && safeFontFamily(f.family);
  if (!fam) { clearThemeFont(); return; }
  function wear() {
    document.documentElement.style.setProperty("--theme-font", '"' + fam + '", ui-monospace, "SF Mono", Menlo, Consolas, monospace');
    document.documentElement.style.setProperty("--theme-fadjust", "0.52");
  }
  var url = f && typeof f.url === "string" ? f.url.trim() : "";
  var ok = url.length < 300 && /^https:\\/\\/[^\\s"')]+\\.(woff2|woff|ttf|otf)(\\?[^\\s"')]*)?$/i.test(url);
  if (ok && window.FontFace) {
    try {
      var ff = new FontFace(fam, "url(" + JSON.stringify(url) + ")");
      ff.load().then(function (loaded) { document.fonts.add(loaded); wear(); }).catch(clearThemeFont);
      return;
    } catch (e) {}
  }
  // No usable URL — still honor the name in case the viewer has it installed.
  wear();
}
function setTheme(name, colors) {
  themeName = name;
  var c = colors || THEMES[name] || THEMES.door;
  if (THEMES[name] && !colors) {
    localStorage.setItem("nomad_theme", name);
    localStorage.removeItem("nomad_theme_custom");
  } else {
    // A theme worn off the relays: remembered whole, so reloads keep the look.
    localStorage.setItem("nomad_theme", "custom");
    localStorage.setItem("nomad_theme_custom", JSON.stringify({ name: name, colors: c }));
  }
  applyThemeColors(c);
  thbtn.textContent = String(name).slice(0, 14);
}
(function initTheme() {
  if (themeName === "custom") {
    try {
      var saved = JSON.parse(localStorage.getItem("nomad_theme_custom") || "");
      if (saved && saved.colors) {
        themeName = saved.name || "nostr theme";
        applyThemeColors(saved.colors);
        thbtn.textContent = String(themeName).slice(0, 14);
        return;
      }
    } catch (e) {}
    themeName = "door";
  }
  if (!THEMES[themeName]) themeName = "door";
  setTheme(themeName);
})();
thbtn.addEventListener("click", function () {
  var idx = THEME_ORDER.indexOf(THEMES[themeName] ? themeName : "door");
  setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
});
// Kind 36767: the EXISTING Nostr theming kind (Ditto's) — a public catalog
// already out on the relays. NOMAD only READS it, exactly like nostr-district:
// colors ride c-tags ["c","#hex","background|text|primary"], a "title" names
// it, and the client derives its whole palette from those three roles with
// contrast enforced. We never publish; browsing the world's themes is the point.
var THEME_RELAYS = [
  "wss://relay.ditto.pub",
  "wss://nos.lol",
  "wss://relay.mostr.pub",
  "wss://nostr.wine",
  "wss://relay.primal.net",
];
function parseTheme36767(ev) {
  var colors = {};
  var fonts = {};
  var title = "";
  var tags = ev.tags || [];
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (tag[0] === "c" && tag[1] && tag[2]) {
      var hex = String(tag[1]).trim();
      if (hex.charAt(0) !== "#") hex = "#" + hex;
      if (/^#[0-9a-fA-F]{6}$/.test(hex) || /^#[0-9a-fA-F]{3}$/.test(hex)) {
        colors[String(tag[2]).toLowerCase()] = hex.toLowerCase();
      }
    }
    // Ditto fonts ride "f" tags: ["f", family, url, role]. Some omit the url
    // (["f", family, role]); a theme may name a body and a title face.
    if (tag[0] === "f" && tag[1]) {
      var fam = String(tag[1]).trim();
      var url = "", role = "body";
      if (typeof tag[2] === "string" && /^https?:/i.test(tag[2].trim())) {
        url = tag[2].trim();
        role = String(tag[3] || "body").toLowerCase();
      } else if (tag[2]) {
        role = String(tag[2]).toLowerCase();
      }
      if (fam && !fonts[role]) fonts[role] = { family: fam.slice(0, 60), url: url };
    }
    if (tag[0] === "title" && tag[1]) title = String(tag[1]).trim().slice(0, 40);
  }
  if (!colors.background || !colors.text || !colors.primary) return null;
  return {
    background: colors.background, text: colors.text, primary: colors.primary,
    title: title, font: fonts.body || fonts.title || null,
  };
}
// Color math, ported from ND's nostrThemeService: mix, luminance, and the
// WCAG-contrast nudge that keeps every foreign theme legible.
function hexToRgb(hex) {
  var h = hex.replace("#", "");
  var full = h.length === 3 ? h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) : h.slice(0, 6);
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}
function rgbToHex(r, g, b) {
  var out = "#";
  var v = [r, g, b];
  for (var i = 0; i < 3; i++) out += Math.max(0, Math.min(255, Math.round(v[i]))).toString(16).padStart(2, "0");
  return out;
}
function mixHex(h1, h2, t) {
  var a = hexToRgb(h1);
  var b = hexToRgb(h2);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}
function luminance(hex) {
  var rgb = hexToRgb(hex);
  var out = [];
  for (var i = 0; i < 3; i++) {
    var c = rgb[i] / 255;
    out.push(c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  }
  return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
}
function contrastRatio(a, b) {
  var la = luminance(a);
  var lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function ensureContrast(color, bg, minRatio) {
  var target = luminance(bg) < 0.5 ? "#ffffff" : "#000000";
  var c = color;
  for (var i = 0; i < 30 && contrastRatio(c, bg) < minRatio; i++) c = mixHex(c, target, 0.25);
  return c;
}
// Three roles in, our ten vars out — same derivation idea as ND's --nd-* set.
function dittoToVars(t) {
  var bg = t.background;
  var text = ensureContrast(t.text, bg, 7.0);
  var primary = ensureContrast(t.primary, bg, 3.5);
  return {
    bg: bg,
    panel: mixHex(bg, primary, 0.12),
    cream: text,
    dim: ensureContrast(mixHex(text, bg, 0.35), bg, 4.5),
    gold: primary,
    blood: ensureContrast("#c96f5a", bg, 3.0),
    bone: mixHex(text, bg, 0.2),
    // The 'you deal damage' cool tone — nudged to stay legible on any ground.
    steel: ensureContrast("#6f9aa4", bg, 3.0),
    // The mending-green (eat/bandage/rest) — same nudge, so it reads on any bg.
    heal: ensureContrast("#7faa63", bg, 3.0),
    // The omen-violet (world-event lines) — same nudge; a hue no other var wears.
    omen: ensureContrast("#a98cc8", bg, 3.0),
    // The living voice (another person spoke) — the rose, nudged to read on any ground.
    voice: ensureContrast("#e08cad", bg, 4.0),
    border: mixHex(bg, primary, 0.3),
    border2: mixHex(bg, primary, 0.5),
    line: mixHex(bg, primary, 0.18),
    _font: t.font || null,
  };
}
// ND-style raw parallel WebSockets: every relay asked at once, themes stream
// in as they arrive, deduped by event id AND by color triple.
function fetchThemes36767(onTheme, onDone) {
  var seenIds = {};
  var seenCol = {};
  var sockets = [];
  var finished = false;
  var counted = 0;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    for (var i = 0; i < sockets.length; i++) { try { sockets[i].close(); } catch (e) {} }
    onDone();
  }
  function markDone() { counted++; if (counted >= THEME_RELAYS.length) finish(); }
  var timer = setTimeout(finish, 10000);
  for (var r = 0; r < THEME_RELAYS.length; r++) {
    (function (url) {
      try {
        var ws = new WebSocket(url);
        var sub = "nm" + Math.random().toString(36).slice(2, 8);
        sockets.push(ws);
        ws.onopen = function () { ws.send(JSON.stringify(["REQ", sub, { kinds: [36767], limit: 200 }])); };
        ws.onmessage = function (e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg[0] === "EVENT" && msg[2]) {
              var ev = msg[2];
              if (seenIds[ev.id]) return;
              seenIds[ev.id] = 1;
              var t = parseTheme36767(ev);
              if (!t) return;
              var key = (ev.pubkey || "") + ":" + t.background + ":" + t.text + ":" + t.primary;
              if (seenCol[key]) return;
              seenCol[key] = 1;
              onTheme(t, ev.pubkey || "");
            } else if (msg[0] === "EOSE") {
              ws.close();
            }
          } catch (err) {}
        };
        ws.onerror = function () { markDone(); };
        ws.onclose = function () { markDone(); };
      } catch (err) { markDone(); }
    })(THEME_RELAYS[r]);
  }
}
var thLoaded = false;
var thCards = [];
var thPage = 0;
var TH_PAGE_SIZE = 8; // same page size as nostr-district's browser
function themeButton(card) {
  var t = card.t;
  var b = document.createElement("button");
  b.className = "thent";
  var dots = [t.background, t.text, t.primary];
  for (var q = 0; q < dots.length; q++) {
    var dt = document.createElement("span");
    dt.className = "dot";
    dt.style.background = dots[q];
    b.appendChild(dt);
  }
  var short = card.pk ? nip19.npubEncode(card.pk).slice(0, 11) + "\u2026" : "";
  var nm = document.createElement("span");
  nm.className = "nm";
  nm.textContent = t.title || ("by " + (short || "unknown"));
  b.appendChild(nm);
  if (t.title && short) {
    var who = document.createElement("span");
    who.className = "who";
    who.textContent = short;
    b.appendChild(who);
  }
  b.addEventListener("click", function () {
    setTheme(t.title || "nostr theme", dittoToVars(t));
  });
  return b;
}
function renderThemePage() {
  var pages = Math.max(1, Math.ceil(thCards.length / TH_PAGE_SIZE));
  if (thPage >= pages) thPage = pages - 1;
  thlist.textContent = "";
  if (thCards.length === 0) {
    var empty = document.createElement("div");
    empty.className = "thempty";
    empty.textContent = thLoaded ? "the relays hold no themes right now" : "asking the relays\u2026";
    thlist.appendChild(empty);
    return;
  }
  var from = thPage * TH_PAGE_SIZE;
  var slice = thCards.slice(from, from + TH_PAGE_SIZE);
  for (var i = 0; i < slice.length; i++) thlist.appendChild(themeButton(slice[i]));
  if (pages > 1) {
    var pager = document.createElement("div");
    pager.className = "thpager";
    var prev = document.createElement("button");
    prev.textContent = "\u2190";
    prev.disabled = thPage === 0;
    prev.addEventListener("click", function () { thPage--; renderThemePage(); });
    var lbl = document.createElement("span");
    lbl.textContent = (thPage + 1) + " / " + pages;
    var next = document.createElement("button");
    next.textContent = "\u2192";
    next.disabled = thPage >= pages - 1;
    next.addEventListener("click", function () { thPage++; renderThemePage(); });
    pager.appendChild(prev);
    pager.appendChild(lbl);
    pager.appendChild(next);
    thlist.appendChild(pager);
  }
}
function browseThemes() {
  if (thlist.classList.contains("open")) { thlist.classList.remove("open"); return; }
  thlist.classList.add("open");
  if (thLoaded) { renderThemePage(); return; }
  thbrowse.textContent = "\u2026";
  thCards = [];
  thPage = 0;
  renderThemePage();
  fetchThemes36767(function (t, pk) {
    thCards.push({ t: t, pk: pk });
    renderThemePage();
  }, function () {
    thbrowse.textContent = "browse";
    thLoaded = true;
    renderThemePage();
  });
}
thbrowse.addEventListener("click", function () { browseThemes(); });

var aboutbtn = document.getElementById("aboutbtn");
aboutbtn.addEventListener("click", function () {
  setpanel.classList.remove("open");
  print([
    "NOMAD is a live extraction MUD over Nostr.",
    "",
    "A MUD \u2014 Multi-User Dungeon \u2014 is the oldest kind of online world:",
    "all text, one shared dungeon, real people inside. Extraction means",
    "getting your loot OUT alive is the whole game.",
    "",
    "And a nomad is what you are down here: someone who carries",
    "everything they own. Your character is a key in your pocket, not an",
    "account on a server. Save it once and you can return from any",
    "device, forever. Lose it, and nobody can give it back.",
    "",
    "The dungeon is a simulation. Creatures wander, get hungry, hold",
    "grudges \u2014 and remember you. It keeps living while you are gone:",
    "wounds stay, the dead stay dead, and what you dropped is where it",
    "fell, if nothing carried it off.",
    "",
    "Everything you carry can be lost \u2014 fumbled, shattered, scattered",
    "where you die. Walk it out to the Broken Gate alive and the dungeon",
    "seals your claim on it, provable to anyone; the gate lockbox is the",
    "only place death cannot reach. Getting treasure OUT is the game.",
    "",
    "Type 'help' for commands. Free and open source (MIT):",
    "github.com/rome539/nomad",
  ].join("\\n"));
});
// Sound remembered on from last visit: the context needs one real gesture
// before the browser lets it speak — arm the first click or key.
if (soundOn) {
  var armSnd = function () {
    document.removeEventListener("pointerdown", armSnd);
    document.removeEventListener("keydown", armSnd);
    sndInit();
    if (actx) startAmb();
  };
  document.addEventListener("pointerdown", armSnd);
  document.addEventListener("keydown", armSnd);
}
// The trailer's typing clicks, live: each printable key taps the highpass.
cmd.addEventListener("keydown", function (e) {
  if (soundOn && actx && e.key && e.key.length === 1) {
    try { SND.key(actx.currentTime); } catch (err) {}
  }
});

idbtn.addEventListener("click", function () {
  guideNotice("keys"); // the walk's last gate: opening your keys IS the lesson
  if (idpanel.classList.contains("open")) { idpanel.classList.remove("open"); return; }
  setpanel.classList.remove("open");
  refreshIdPanel();
  idpanel.classList.add("open");
  // Warm the vault kit + GIS so the Google popup opens promptly on click.
  vaultKit().then(function (m) { try { m.preloadGoogleAuth(); } catch (e) {} }).catch(function () {});
});
idcopy.addEventListener("click", function () {
  var nsec = nip19.nsecEncode(sk);
  var flash = function () {
    idcopy.textContent = "copied \\u2014 keep it safe";
    setTimeout(function () { idcopy.textContent = "copy secret key"; }, 2500);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(nsec).then(flash, function () { showKeys(true); });
  else { showKeys(true); idpanel.classList.remove("open"); }
});
idext.addEventListener("click", function () { idpanel.classList.remove("open"); loginExtension(); });
idgoogle.addEventListener("click", function () { continueWithGoogle(); });
idback.addEventListener("click", function () {
  idpanel.classList.remove("open");
  var vpk = localStorage.getItem("nomad_vault_pk");
  if (method === "guest" && vpk && vpk === getPublicKey(sk)) vaultSignOut();
  else logout();
});
idpaste.addEventListener("keydown", function (e) {
  if (e.key !== "Enter") return;
  var v = idpaste.value.trim();
  if (!v) return;
  idpaste.value = "";
  if (importKey(v)) idpanel.classList.remove("open");
});

// THE THRESHOLD: one click between a stranger and the world — never more.
// Nothing connects until it's crossed, so the wake-up text lands on an
// attentive reader instead of piling up behind a curtain. The click is also
// the browser's audio-unlock gesture, so sound can default ON at first
// crossing (a saved "off" stays off). A known wanderer is greeted by name.
var threshold = document.getElementById("threshold");
var thrEnter = document.getElementById("thr-enter");
var thrKnown = localStorage.getItem("nomad_name");
// One painting per visit, drawn from the scene set; each knows where its
// light sits so the crop keeps it in frame. ?scene=<name> forces one.
var THR_SCENES = { torch: "center 65%", hound: "center 55%", rain: "center 45%", arch: "center 40%", door: "center 50%", tide: "center 55%" };
var thrPick = new URLSearchParams(location.search).get("scene");
if (!THR_SCENES[thrPick]) {
  var thrNames = Object.keys(THR_SCENES);
  thrPick = thrNames[Math.floor(Math.random() * thrNames.length)];
}
var thrImg = new Image();
thrImg.onload = function () {
  threshold.style.backgroundImage = "linear-gradient(rgba(22,18,12,.5), rgba(22,18,12,.15) 45%, rgba(22,18,12,.6)), url(" + thrImg.src + ")";
  threshold.style.backgroundPosition = "center, " + THR_SCENES[thrPick];
};
thrImg.src = "/door-bg/" + thrPick + ".jpg";
if (thrKnown && stored) thrEnter.textContent = "enter as " + thrKnown;

// THE DOOR'S MUSIC — grim and hollow, played live by oscillators (no file,
// no loop point). A constant low pedal on A; over it, bare open fifths — no
// thirds, no hope — walk a Phrygian line: A, B-flat, A, G. The half-step
// grinding against the pedal is the dread. No melody: only a dead bell,
// tolling now and then on the root or its fifth. Browsers refuse audio
// before a gesture, so it starts at the page's first touch; the enter click
// hands it a long fade through the door. A saved sound-off is silence here.
var thrCtx = null, thrMaster = null, thrTimers = [];
var THR_STEPS = [110, 116.54, 110, 98]; // A, B-flat (the rub), A, G — and around again
function thrMusicStart() {
  if (thrCtx || crossed) return;
  if (localStorage.getItem("nomad_sound") === "0") return;
  try { thrCtx = new AudioContext(); } catch (e) { return; }
  if (thrCtx.state === "suspended") { try { thrCtx.resume(); } catch (e) {} }
  var c = thrCtx;
  var t0 = c.currentTime;
  thrMaster = c.createGain();
  thrMaster.gain.setValueAtTime(0.0001, t0);
  thrMaster.gain.exponentialRampToValueAtTime(0.16, t0 + 4);
  thrMaster.connect(c.destination);
  var lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.5;
  lp.connect(thrMaster);
  // The pedal: A, low and constant. Everything else grinds against it.
  var pedal = [110, 220];
  for (var i = 0; i < pedal.length; i++) {
    var po = c.createOscillator();
    po.type = i ? "triangle" : "sine";
    po.frequency.value = pedal[i] * (i ? 1.002 : 1);
    var pg = c.createGain(); pg.gain.value = i ? 0.032 : 0.07;
    po.connect(pg); pg.connect(lp); po.start();
  }
  // A slow tremor under it all — the ground is not quite still.
  var lfo = c.createOscillator(); lfo.frequency.value = 0.06;
  var lg = c.createGain(); lg.gain.value = 0.02;
  lfo.connect(lg); lg.connect(thrMaster.gain); lfo.start();
  var si = 0;
  // The fifths: bare and medieval, five slow seconds to bloom, walking the
  // Phrygian steps. Against the pedal, B-flat is a knife and G is a weight.
  var playStep = function () {
    if (!thrCtx) return;
    var t = c.currentTime;
    var root = THR_STEPS[si];
    si = (si + 1) % THR_STEPS.length;
    var tones = [root, root * 1.5, root * 2, root * 3];
    var gains = [0.1, 0.075, 0.05, 0.02];
    for (var k = 0; k < tones.length; k++) {
      for (var d = 0; d < 2; d++) {
        var o = c.createOscillator();
        o.type = "triangle";
        o.frequency.value = tones[k] * (d ? 1.005 : 0.997);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gains[k], t + 5);
        g.gain.setValueAtTime(gains[k], t + 8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 13);
        o.connect(g); g.connect(lp);
        o.start(t); o.stop(t + 13.2);
      }
    }
    thrTimers.push(setTimeout(playStep, 12000));
  };
  // The toll: a dead bell, inharmonic and long to die — a funeral sound,
  // never a melody.
  var playToll = function () {
    if (!thrCtx) return;
    if (Math.random() < 0.75) {
      var t = c.currentTime;
      var f = Math.random() < 0.6 ? 110 : 164.81;
      var parts = [1, 2.02, 2.94, 4.4], pgs = [0.11, 0.05, 0.025, 0.01];
      for (var k = 0; k < parts.length; k++) {
        var o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = f * parts[k];
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pgs[k], t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 8);
        o.connect(g); g.connect(thrMaster);
        o.start(t); o.stop(t + 8.2);
      }
    }
    thrTimers.push(setTimeout(playToll, 12000 + Math.random() * 14000));
  };
  playStep();
  thrTimers.push(setTimeout(playToll, 6000));
}
function thrMusicStop() {
  if (!thrCtx) return;
  for (var i = 0; i < thrTimers.length; i++) clearTimeout(thrTimers[i]);
  thrTimers = [];
  var c = thrCtx, m = thrMaster, t = c.currentTime;
  thrCtx = null; thrMaster = null;
  try {
    m.gain.cancelScheduledValues(t);
    m.gain.setValueAtTime(Math.max(m.gain.value, 0.0001), t);
    // Caught young (the gesture WAS the enter click): swell briefly first,
    // so even the instant-clicker hears the door as they pass through it.
    if (t < 1.5) m.gain.exponentialRampToValueAtTime(0.07, t + 1.2);
    m.gain.exponentialRampToValueAtTime(0.0001, t + 7);
  } catch (e) {}
  setTimeout(function () { try { c.close(); } catch (e) {} }, 7500);
}
document.addEventListener("pointerdown", thrMusicStart, true);
document.addEventListener("keydown", thrMusicStart, true);

var crossed = false;
function crossThreshold() {
  if (crossed) return;
  crossed = true;
  thrMusicStop();
  if (localStorage.getItem("nomad_sound") === null) setSound(true);
  threshold.classList.add("gone");
  setTimeout(function () { threshold.remove(); }, 1000);
  print("— you feel keys in your pocket. tap your name, top right, to see them —", "sys");
  connect();
  cmd.focus();
  // A brand-new key gets the first walk, once the wake-up text has landed.
  // (Anyone else can summon it by typing 'tutorial'.)
  if (guideFresh) setTimeout(guideStart, 3500);
}
thrEnter.addEventListener("click", crossThreshold);
document.getElementById("thr-keys-link").addEventListener("click", function (e) {
  // The returning-player path: cross as whoever's in the pocket, with the
  // identity panel already open to restore the keys that matter.
  e.stopPropagation();
  crossThreshold();
  refreshIdPanel();
  idpanel.classList.add("open");
});

// THE FIRST WALK: five lessons printed into the log — where this game's
// teaching belongs — each one explaining a real system, each advancing only
// when you DO the thing it asked. Auto-runs once for a freshly minted key;
// 'tutorial' replays it for anyone; 'tutorial off' ends it. The lessons
// teach the typed language — chips send the same words, so a tap counts,
// but nothing here depends on chips existing at all.
var guideFresh = !stored && !localStorage.getItem("nomad_guided");
var GUIDE_LESSONS = [
  { re: null, text: [
    "\\u2500 THE FIRST WALK (1/5) \\u2500 the world \\u2500",
    "This is one live dungeon, shared by everyone in it. It is not",
    "paused when you look away: creatures hunt, eat, sleep, and hold",
    "grudges \\u2014 they remember faces, and yours is a face. The other",
    "names you meet down here are real people. ('tutorial off' ends this walk)",
    "\\u2192 type 'look' to read the room you are standing in.",
  ] },
  { re: /^look(\\s|$)/, text: [
    "\\u2500 lesson 2/5 \\u2500 moving \\u2500",
    "Every room names its exits; walking is 'go down', 'go west'. Two",
    "things travel with you everywhere: light and noise. The deep is",
    "truly dark \\u2014 carry a torch and 'light' it, or see nothing while",
    "everything sees you. And all you do makes sound; sound draws feet.",
    "\\u2192 type 'go' and any exit the room names.",
  ] },
  { re: /^go\\s/, text: [
    "\\u2500 lesson 3/5 \\u2500 your hands \\u2500",
    "The floor is real. 'get' takes what lies there, 'drop' leaves it,",
    "and it stays where it fell \\u2014 unless something hungrier finds it",
    "first. 'equip' arms you; 'eat' when food is food. Nothing mends",
    "itself down here: the gate's bench and forge repair what's worn.",
    "\\u2192 type 'inventory' to see your pack, lockbox, and vault.",
  ] },
  { re: /^inventory(\\s|$)/, text: [
    "\\u2500 lesson 4/5 \\u2500 blood \\u2500",
    "'attack <name>' starts a fight. Blows land in rounds, seconds",
    "apart \\u2014 you have time to think, so think. Stances tilt the trade:",
    "'stance reckless' hits harder and gets you hit; 'stance guarded'",
    "turns blows but kills slowly. Walking out of the room is how you",
    "flee. Wounds keep bleeding until you 'bandage'. And health NEVER",
    "returns on its own \\u2014 'rest' where nothing is watching, or 'eat'.",
    "\\u2192 type 'stance guarded' (then 'stance steady' to square back up).",
  ] },
  { re: /^stance\\s/, text: [
    "\\u2500 lesson 5/5 \\u2500 the stakes \\u2500",
    "When you die, everything you carry scatters where you fall, and",
    "the world keeps it. The answer is a gate: the keeper barters in",
    "kind, and what you 'claim' there is SEALED to your name \\u2014 signed,",
    "provable, and safe in the gate's lockbox where death cannot reach.",
    "Extraction is the whole game: what you haul out and seal is yours.",
    "What you carry is a bet.",
    "\\u2192 tap your name, top right \\u2014 the last lesson is who you are.",
  ] },
  { re: /^keys(\\s|$)/, text: [
    "\\u2500 THE DOOR IS YOURS \\u2500",
    "You are a key, not an account. Top right \\u2014 your health and your",
    "name \\u2014 opens your keys: SAVE THE SECRET somewhere safe. It is the",
    "only way back to this wanderer from any other browser or device.",
    "Top left \\u2014 NOMAD \\u2014 is settings: sound, themes, command chips.",
    "'help' lists every verb; 'tutorial' replays this walk.",
    "The dungeon takes it from here.",
  ] },
];
var guideAt = -1; // index of the lesson whose action we are waiting on
function guideActive() { return guideAt >= 1 && guideAt < GUIDE_LESSONS.length; }
function guidePrint(i) { print(GUIDE_LESSONS[i].text.join("\\n"), "sys"); }
function guideStart() {
  guideAt = 1;
  guidePrint(0);
}
function guideOff() {
  if (guideAt < 0 || guideAt >= GUIDE_LESSONS.length) { print("\\u2014 no walk is running; 'tutorial' starts one \\u2014", "sys"); return; }
  localStorage.setItem("nomad_guided", "1");
  guideAt = -1;
  print("\\u2014 the walk ends here; 'tutorial' brings it back \\u2014", "sys");
}
function guideNotice(cmdText) {
  if (guideAt < 1 || guideAt >= GUIDE_LESSONS.length) return;
  if (!GUIDE_LESSONS[guideAt].re.test(cmdText.trim().toLowerCase())) return;
  var landed = guideAt;
  guideAt++;
  var last = guideAt >= GUIDE_LESSONS.length;
  // Let the world answer the command first; the lesson follows it.
  setTimeout(function () {
    guidePrint(landed);
    if (last) {
      localStorage.setItem("nomad_guided", "1");
      guideAt = -1;
    }
  }, 700);
}
</script>
</body>
</html>`;
