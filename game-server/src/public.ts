// The whole client: one page, one log, one input line. Text is the art.
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>NOMAD — the Door</title>
<meta name="description" content="A living text dungeon on Nostr. Your key is your character. The dead stay dead.">
<link rel="icon" type="image/png" href="/icon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NOMAD">
<meta property="og:title" content="NOMAD — the Door">
<meta property="og:description" content="A living text dungeon on Nostr. Your key is your character. What you carry is provisional until the gate seals it — and the dead stay dead.">
<meta property="og:url" content="https://nomadmud.com">
<meta property="og:image" content="https://nomadmud.com/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="NOMAD — the Door">
<meta name="twitter:description" content="A living text dungeon on Nostr. The dead stay dead.">
<meta name="twitter:image" content="https://nomadmud.com/og.jpg">
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
  #idbtn { cursor: pointer; user-select: none; }
  #idbtn .caret { color: var(--gold); }
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
  #bench .bcolh .cnt { color: var(--dim); letter-spacing: 0; }
  #bench .bempty { color: var(--dim); font-size: 12px; font-style: italic; padding: 4px 0; }
  #bench .bitem { display: flex; flex-direction: column; gap: 5px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  #bench .bitem:last-child { border-bottom: none; }
  #bench .bitem .nm { color: var(--cream); font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
  #bench .bitem .nm .seal { color: var(--gold); }
  #bench .bitem .nm .mult { color: var(--gold); font-weight: 700; }
  #bench .bitem .nm .cond { color: var(--dim); }
  #bench .bitem .nm .stat { color: var(--bone); }
  #bench .bitem .nm .worn { color: var(--gold); }
  #bench .bitem .acts { display: flex; flex-wrap: wrap; gap: 5px; }
  #bench .bitem button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
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
  /* map: a drawn chart — floors stacked deepest-last, rooms laid on a true grid */
  #mapbody { overflow-x: auto; }
  .mfloor { margin-bottom: 18px; }
  .mfl {
    color: var(--bone); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid var(--line); padding: 6px 0; margin-bottom: 12px;
  }
  .mgrid { position: relative; }
  .mgrid svg { position: absolute; inset: 0; pointer-events: none; display: block; }
  .mgrid line { stroke: var(--border2); stroke-width: 1.5; }
  .mgrid line.far { stroke: var(--blood); stroke-dasharray: 5 4; opacity: 0.55; }
  .mgrid line.stub { stroke-dasharray: 3 3; opacity: 0.6; }
  #mapm.crude .mgrid line { stroke-dasharray: 4 3; }
  .mcell {
    position: absolute; width: 84px; height: 44px; overflow: hidden;
    background: #241d13; border: 1px solid var(--border2); border-radius: 5px;
    padding: 4px 5px 2px;
  }
  .mcell .mn { color: var(--bone); font-size: 9px; line-height: 1.2; }
  .mcell.gate { border-color: var(--steel); }
  .mcell.gate .mn { color: var(--steel); }
  .mcell.deep { background: #251519; }
  .mcell.here { border-color: var(--gold); box-shadow: 0 0 10px rgba(216, 169, 78, 0.35); }
  .mcell.here .mn { color: var(--gold); font-weight: 700; }
  .mcell .mglyph { position: absolute; right: 5px; bottom: 2px; font-size: 8px; color: var(--dim); letter-spacing: 2px; }
  .mcell.here .mglyph { color: var(--gold); }
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
  #log .big    { animation: tremor 0.35s linear; }
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
  }
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
</style>
</head>
<body>
  <div id="bar">
    <span class="brand" id="brand" title="settings">NOMAD</span>
    <span id="room"></span>
    <span id="idbtn"><span id="hp">keys</span> <span class="caret">&#9662;</span></span>
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
      <div class="row"><input id="idpaste" placeholder="or paste nsec1&#8230; / bunker:// &#8212; enter" autocomplete="off" spellcheck="false"></div>
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
      <div id="mapbody"></div>
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
    <input id="cmd" autocomplete="off" spellcheck="false" autofocus>
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
var chipsEl = document.getElementById("chips");

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
  death: 9, swell: 8, boom: 7, grind: 6, forge: 6, grab: 5, crit: 5, hit: 4, crack: 4,
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

function print(text, cls) {
  // Explicit classes (sys/feed/echo) keep the whole block; everything else is
  // split per line so each event wears its own color.
  var lines = cls ? [text] : String(text).split("\\n");
  var sounds = [];
  for (var i = 0; i < lines.length; i++) {
    var div = document.createElement("div");
    var c = cls || classify(lines[i]);
    if (c) div.className = c;
    div.textContent = lines[i];
    log.appendChild(div);
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

async function connect() {
  profileTried = false;
  if (method === "ext" && !window.nostr) {
    print("— your key extension is not answering; entering with the pocket keys —", "sys");
    method = "guest";
  }
  if (method === "bunker" && !localStorage.getItem("nomad_bunker_session")) {
    method = "guest";
  }
  var token;
  try { token = await login(); }
  catch (e) { print("— the gate does not answer (" + e.message + "); retrying —", "sys"); return scheduleRetry(); }

  var proto = location.protocol === "https:" ? "wss://" : "ws://";
  ws = new WebSocket(proto + location.host + "/ws?token=" + encodeURIComponent(token));

  ws.onopen = function () { retryMs = 1000; };
  ws.onmessage = function (m) {
    var f; try { f = JSON.parse(m.data); } catch (e) { return; }
    if (f.kind === 24912) print(f.text, f.cls);
    else if (f.kind === 24913) print(f.text, "feed");
    else if (f.t === "status") {
      roomEl.textContent = f.room || "";
      if (f.room) knownRooms[f.room] = 1;
      hpEl.textContent = f.hp + "/" + f.max_hp + " hp \\u00b7 " + f.name;
      hpEl.className = f.hp <= f.max_hp / 3 ? "hp-low" : "";
      lastName = f.name;
      lastNamed = !!f.named;
      maybeAdoptProfileName(f);
      // If the panel is open when the name arrives, don't make them reopen it.
      if (idpanel.classList.contains("open")) refreshIdPanel();
    } else if (f.t === "ctx" && Array.isArray(f.suggest)) {
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
    }
  };
  ws.onclose = function () { closeBench(); closeTrade(); closeMap(); closeJournal(); print("— the connection frays; reweaving —", "sys"); scheduleRetry(); };
}

function scheduleRetry() {
  setTimeout(connect, retryMs);
  retryMs = Math.min(retryMs * 2, 15000);
}

var history = [];
var histAt = -1;

function sendCmd(text) {
  history.unshift(text); histAt = -1;
  var masked = /^login\\s+(nsec1|bunker:\\/\\/|[0-9a-fA-F]{64})/.test(text); // never echo a secret into the log
  print("\\u25b8 " + (masked ? "login \\u2022\\u2022\\u2022\\u2022" : text), "echo");
  if (localCmd(text)) return;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "cmd", text: text }));
  else print("— not connected —", "sys");
}

// Identity commands never leave this page — the server has no business
// seeing a secret key.
function localCmd(text) {
  var t = text.trim(), lower = t.toLowerCase();
  if (lower === "keys") { showKeys(false); return true; }
  if (lower === "keys reveal") { showKeys(true); return true; }
  if (lower === "login extension" || lower === "login ext") { loginExtension(); return true; }
  if (lower === "login signer" || lower === "login bunker") { connectSignerApp(); return true; }
  if (lower.indexOf("login ") === 0) { importKey(t.slice(6).trim()); return true; }
  if (lower === "logout") { logout(); return true; }
  return false;
}

function reconnect() {
  // Identity is changing: forget the old session's face immediately so the
  // bar and panel never mix the previous name with the next keys.
  lastName = "";
  lastNamed = false;
  nameHint = null;
  nameClaimed = false;
  hpEl.textContent = "\\u2026";
  hpEl.className = "";
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

function loginExtension() {
  if (!window.nostr) {
    print("No key extension answers. (Alby, nos2x\\u2026 \\u2014 or use 'login <nsec\\u2026>')", "sys");
    return;
  }
  cancelPendingBunker();
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
  return s;
}
function chipButton(s) {
  var b = document.createElement("button");
  b.type = "button";
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
function renderChips(suggest, combat) {
  lastSuggest = suggest;
  lastCombat = !!combat;
  chipsEl.textContent = "";
  if (!chipsOn) return; // the quiet terminal: no training wheels
  // In combat the chips are fight-only; even the standing 'keys' chip stands down.
  var all = suggest.concat(combat ? [] : ["keys"]);
  var dirs = [];
  var rest = [];
  all.forEach(function (s) {
    (/^go (north|south|east|west|up|down)$/.test(s) ? dirs : rest).push(s);
  });
  dirs.concat(rest).forEach(function (s) { chipsEl.appendChild(chipButton(s)); });
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
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "bench", action: action, row: row || "" }));
}
function closeBench() { benchEl.classList.remove("open"); }

function benchItemNode(it, place) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  nm.textContent = it.name;
  if (it.n > 1) { var mu = document.createElement("span"); mu.className = "mult"; mu.textContent = " \\u00d7" + it.n; nm.appendChild(mu); }
  if (it.stat) { var st = document.createElement("span"); st.className = "stat"; st.textContent = " (" + it.stat + ")"; nm.appendChild(st); }
  if (it.equipped) { var eq = document.createElement("span"); eq.className = "worn"; eq.textContent = " \\u2014 " + (it.slot === "weapon" ? "wielded" : "worn"); nm.appendChild(eq); }
  if (it.sealed) { var sp = document.createElement("span"); sp.className = "seal"; sp.textContent = " \\u2014 sealed #" + it.serial; nm.appendChild(sp); }
  // Gear shows its wear whether sealed or not (sealed just wears slower) — comma after the seal, em-dash on its own.
  if (it.condWord) { var cw = document.createElement("span"); cw.className = "cond"; cw.textContent = (it.sealed ? ", " : " \\u2014 ") + it.condWord; nm.appendChild(cw); }
  wrap.appendChild(nm);
  var acts = document.createElement("div");
  acts.className = "acts";
  // A stack action hits every row in the pile (box/seal/burn a whole stack of
  // trophies at once); a single item is just a one-element fan.
  var rows = it.rows && it.rows.length ? it.rows : [it.row];
  function fire(action) { for (var i = 0; i < rows.length; i++) benchSend(action, rows[i]); }
  function btn(label, action) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    b.addEventListener("click", function () { fire(action); });
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
    // So are the vice and the hammer: mend the wear (sealed gear wears now too,
    // so it can be mended too), or break UNSEALED gear to scrap.
    if (benchAtGate && it.slot) {
      if (it.cond !== null && it.cond < 100) btn("repair", "repair");
      if (!it.sealed) armBtn("scrap", "salvage", "scrap");
    }
  } else {
    btn("\\u2192 pack", "take");
    // From the lockbox at a gate you can also seal a piece in place or send it
    // straight to the vault, no round-trip through the pack. (Same rule as the
    // pack: sealed wealth and raw fungibles vault; unsealed gear needs a seal.)
    if (place === "lockbox" && benchAtGate) {
      if (it.sealed || it.stack) btn("\\u2192 vault", "vault");
      else btn("seal", "seal");
    }
  }
  armBtn("burn", "burn");
  wrap.appendChild(acts);
  return wrap;
}

function fillBenchCol(el, title, items, cap, place) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  var t = document.createElement("span"); t.textContent = title; h.appendChild(t);
  var c = document.createElement("span"); c.className = "cnt";
  // What you wear rides on the body, not in the pack \\u2014 don't count equipped
  // rows against the cap (matches the server's slot accounting).
  var used = items.filter(function (it) { return !it.equipped; }).length;
  c.textContent = cap ? (used + "/" + cap) : String(used);
  h.appendChild(c);
  el.appendChild(h);
  if (!items.length) {
    var e = document.createElement("div"); e.className = "bempty"; e.textContent = "\\u2014 empty \\u2014";
    el.appendChild(e); return;
  }
  items.forEach(function (it) { el.appendChild(benchItemNode(it, place)); });
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
  fillBenchCol(bpack, "Your pack", state.pack || [], state.packCap || 0, "pack");
  fillBenchCol(block, "Lockbox", state.lockbox || [], state.lockboxCap, "lockbox");
  if (benchAtGate) {
    bvault.style.display = "";
    fillBenchCol(bvault, "Vault \\u00b7 the deep keep", state.vault || [], state.vaultCap, "vault");
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
function closeTrade() { tradeEl.classList.remove("open"); tradeState = null; }

function tradeItemNode(it, place) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  nm.textContent = it.name + (it.n > 1 ? " (x" + it.n + ")" : "");
  if (it.stat) { var st = document.createElement("span"); st.className = "stat"; st.textContent = " (" + it.stat + ")"; nm.appendChild(st); }
  if (place === "stock") { var co = document.createElement("span"); co.className = "cost"; co.textContent = " \\u2014 " + it.cost + " in trade"; nm.appendChild(co); }
  wrap.appendChild(nm);
  var acts = document.createElement("div");
  acts.className = "acts";
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
  acts.appendChild(b);
  wrap.appendChild(acts);
  return wrap;
}

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
    prog.textContent = tradeWant.paid + " of " + tradeWant.cost + " paid";
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
function closeForge() { forgeEl.classList.remove("open"); }

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
function closeMap() { mapEl.classList.remove("open"); }
function renderMap(f) {
  var detailed = !!f.detailed;
  mapEl.classList.toggle("crude", !detailed);
  document.getElementById("maptitle").textContent = detailed ? "Surveyor's Map" : "Crude Map";
  document.getElementById("mapsub").textContent = detailed
    ? "Every hall of the Door, set down true."
    : "Copied from half a memory. Some of it is right. Trust it at your peril.";
  // A true map is knowledge kept: its rooms light gold on the HUD hereafter.
  if (detailed && Array.isArray(f.reveal)) {
    for (var i = 0; i < f.reveal.length; i++) knownRooms[f.reveal[i]] = 1;
  }
  mapBody.textContent = "";

  // ---- flatten the frame into one room table ----
  var byId = {}, order = [];
  var regions = f.regions || [];
  for (var r = 0; r < regions.length; r++) {
    var reg = regions[r];
    var rcls = reg.label === "The Gates" ? "gate" : reg.label === "The Deep" ? "deep" : "upper";
    var rrooms = reg.rooms || [];
    for (var j = 0; j < rrooms.length; j++) {
      rrooms[j].rcls = rcls;
      byId[rrooms[j].id] = rrooms[j];
      order.push(rrooms[j].id);
    }
  }
  if (!order.length) return;

  // ---- floors: walk the stairs (down = one deeper), keep the first claim ----
  var zOf = {};
  var start = f.here && byId[f.here] ? f.here : order[0];
  zOf[start] = 0;
  var queue = [start];
  while (queue.length) {
    var qid = queue.shift();
    var qex = byId[qid].exits || [];
    for (var k = 0; k < qex.length; k++) {
      var qe = qex[k];
      if (!byId[qe.to] || zOf[qe.to] !== undefined) continue;
      zOf[qe.to] = zOf[qid] + (qe.dir === "down" ? 1 : qe.dir === "up" ? -1 : 0);
      queue.push(qe.to);
    }
  }
  // Anything the walk never reached (a crude page's omissions cut the thread)
  // still carries its region — the copyist knows which part of the dungeon a
  // page came from, just not where it sits. Gates are never adrift.
  var floors = {};
  for (var o = 0; o < order.length; o++) {
    var oid = order[o];
    var fz = zOf[oid] !== undefined ? String(zOf[oid])
      : byId[oid].rcls === "gate" ? "gates"
      : "adrift-" + byId[oid].rcls;
    (floors[fz] = floors[fz] || []).push(oid);
  }
  // The widest floor is the surface; every band is named from it, and the thin
  // airs above it (the gates, the stair-tops) fold into one band at the top.
  var surfZ = 0, surfN = -1;
  var fkeys = Object.keys(floors);
  for (var s = 0; s < fkeys.length; s++) {
    if (!isNaN(Number(fkeys[s])) && floors[fkeys[s]].length > surfN) { surfN = floors[fkeys[s]].length; surfZ = Number(fkeys[s]); }
  }
  var merged = {}, floorOf = {};
  for (var s2 = 0; s2 < fkeys.length; s2++) {
    var mk = !isNaN(Number(fkeys[s2])) && Number(fkeys[s2]) < surfZ ? "gates" : fkeys[s2];
    var mids = floors[fkeys[s2]];
    merged[mk] = (merged[mk] || []).concat(mids);
    for (var s3 = 0; s3 < mids.length; s3++) floorOf[mids[s3]] = mk;
  }
  floors = merged;
  fkeys = Object.keys(floors);
  var BANDRANK = { gates: -1e9, "adrift-upper": 1e9 - 1, "adrift-deep": 1e9 };
  fkeys.sort(function (x, y) {
    var rx = BANDRANK[x] !== undefined ? BANDRANK[x] : Number(x);
    var ry = BANDRANK[y] !== undefined ? BANDRANK[y] : Number(y);
    return rx - ry;
  });

  // ---- within a floor: the compass lays the rooms on a grid ----
  var DXD = { east: 1, west: -1, north: 0, south: 0 };
  var DYD = { north: -1, south: 1, east: 0, west: 0 };
  var WRAP = 7; // columns before a band folds onto a fresh shelf
  var pos = {};
  for (var fi = 0; fi < fkeys.length; fi++) {
    var ids = floors[fkeys[fi]];
    var inFloor = {}, claimed = {};
    for (var a = 0; a < ids.length; a++) inFloor[ids[a]] = 1;
    // gather the connected pieces first, each laid out in its own coordinates
    var comps = [];
    for (var a2 = 0; a2 < ids.length; a2++) {
      if (claimed[ids[a2]]) continue;
      var tpos = {}, tcells = { "0,0": 1 };
      tpos[ids[a2]] = [0, 0];
      claimed[ids[a2]] = 1;
      var cq = [ids[a2]];
      while (cq.length) {
        var cid = cq.shift();
        var cex = byId[cid].exits || [];
        for (var k2 = 0; k2 < cex.length; k2++) {
          var ce = cex[k2];
          if (DXD[ce.dir] === undefined || !inFloor[ce.to] || claimed[ce.to]) continue;
          var want = [tpos[cid][0] + DXD[ce.dir], tpos[cid][1] + DYD[ce.dir]];
          // cell taken (a lying page, or a fold in the stone): nudge to the nearest open one
          for (var ring = 1; tcells[want[0] + "," + want[1]] && ring < 9; ring++) {
            var found = null;
            for (var dy = -ring; dy <= ring && !found; dy++) {
              for (var dx = -ring; dx <= ring && !found; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
                if (!tcells[(want[0] + dx) + "," + (want[1] + dy)]) found = [want[0] + dx, want[1] + dy];
              }
            }
            if (found) want = found;
          }
          tpos[ce.to] = want;
          tcells[want[0] + "," + want[1]] = 1;
          claimed[ce.to] = 1;
          cq.push(ce.to);
        }
      }
      var mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
      for (var tid in tpos) {
        if (tpos[tid][0] < mnx) mnx = tpos[tid][0];
        if (tpos[tid][1] < mny) mny = tpos[tid][1];
        if (tpos[tid][0] > mxx) mxx = tpos[tid][0];
        if (tpos[tid][1] > mxy) mxy = tpos[tid][1];
      }
      comps.push({ tpos: tpos, mnx: mnx, mny: mny, w: mxx - mnx + 1, h: mxy - mny + 1 });
    }
    // tall pieces first, so the shelves pack tight (fold when a shelf runs wide)
    comps.sort(function (p, q) { return q.h - p.h || q.w - p.w; });
    var nextX = 0, shelfY = 0, shelfH = 0;
    for (var c2 = 0; c2 < comps.length; c2++) {
      var cp = comps[c2];
      if (nextX > 0 && nextX + cp.w > WRAP) { nextX = 0; shelfY += shelfH; shelfH = 0; }
      for (var tid2 in cp.tpos) pos[tid2] = [cp.tpos[tid2][0] - cp.mnx + nextX, cp.tpos[tid2][1] - cp.mny + shelfY];
      nextX += cp.w + 1;
      if (cp.h > shelfH) shelfH = cp.h;
    }
  }

  // ---- draw: one band per floor, gates at the top, the deep below ----
  var BW = 84, BH = 44, GX = 26, GY = 24, CW = BW + GX, CH = BH + GY;
  var NUMS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  var SVGNS = "http://www.w3.org/2000/svg";
  for (var fi2 = 0; fi2 < fkeys.length; fi2++) {
    var key = fkeys[fi2];
    var fids = floors[key];
    var label;
    if (key === "adrift-upper") label = "the halls \\u2014 pages adrift";
    else if (key === "adrift-deep") label = "the deep \\u2014 pages adrift";
    else if (key === "gates") label = "the gates";
    else {
      var depth = Number(key) - surfZ;
      label = depth === 0 ? "the surface" : (NUMS[depth - 1] || String(depth)) + " down";
    }
    var cols = 0, rows = 0;
    for (var b = 0; b < fids.length; b++) {
      if (pos[fids[b]][0] + 1 > cols) cols = pos[fids[b]][0] + 1;
      if (pos[fids[b]][1] + 1 > rows) rows = pos[fids[b]][1] + 1;
    }
    var w = cols * CW - GX, h2 = rows * CH - GY;
    var band = document.createElement("div");
    band.className = "mfloor";
    var fl = document.createElement("div");
    fl.className = "mfl";
    fl.textContent = label;
    band.appendChild(fl);
    var grid = document.createElement("div");
    grid.className = "mgrid";
    grid.style.width = w + "px";
    grid.style.height = h2 + "px";
    // passages first, so the rooms sit on top of them
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h2));
    var seen = {};
    for (var b2 = 0; b2 < fids.length; b2++) {
      var rid = fids[b2];
      var cx = pos[rid][0] * CW + BW / 2, cy = pos[rid][1] * CH + BH / 2;
      var rex = byId[rid].exits || [];
      for (var x2 = 0; x2 < rex.length; x2++) {
        var re = rex[x2];
        if (DXD[re.dir] === undefined) continue; // stairs are glyphs, not lines
        var ln = document.createElementNS(SVGNS, "line");
        ln.setAttribute("x1", String(cx));
        ln.setAttribute("y1", String(cy));
        if (byId[re.to] && floorOf[re.to] === floorOf[rid] && pos[re.to]) {
          var pk = rid < re.to ? rid + "|" + re.to : re.to + "|" + rid;
          if (seen[pk]) continue;
          seen[pk] = 1;
          ln.setAttribute("x2", String(pos[re.to][0] * CW + BW / 2));
          ln.setAttribute("y2", String(pos[re.to][1] * CH + BH / 2));
          var adj = Math.abs(pos[re.to][0] - pos[rid][0]) + Math.abs(pos[re.to][1] - pos[rid][1]) === 1;
          if (!adj) ln.setAttribute("class", "far"); // a passage the page cannot make honest
        } else {
          // it leads off this page: a short stub toward wherever it claims to go
          ln.setAttribute("x2", String(cx + DXD[re.dir] * (BW / 2 + 16)));
          ln.setAttribute("y2", String(cy + DYD[re.dir] * (BH / 2 + 16)));
          ln.setAttribute("class", "stub");
        }
        svg.appendChild(ln);
      }
    }
    grid.appendChild(svg);
    for (var b3 = 0; b3 < fids.length; b3++) {
      var rm = byId[fids[b3]];
      var cell = document.createElement("div");
      cell.className = "mcell " + rm.rcls + (rm.here ? " here" : "");
      cell.style.left = pos[rm.id][0] * CW + "px";
      cell.style.top = pos[rm.id][1] * CH + "px";
      cell.title = rm.name;
      var nm = document.createElement("div");
      nm.className = "mn";
      nm.textContent = rm.name.replace(/^(The|A) /, "");
      cell.appendChild(nm);
      var up = false, down = false;
      var gex = rm.exits || [];
      for (var x3 = 0; x3 < gex.length; x3++) {
        if (gex[x3].dir === "up") up = true;
        if (gex[x3].dir === "down") down = true;
      }
      if (up || down) {
        var gl = document.createElement("div");
        gl.className = "mglyph";
        gl.textContent = (up ? "\\u25b2" : "") + (down ? "\\u25bc" : "");
        cell.appendChild(gl);
      }
      grid.appendChild(cell);
    }
    band.appendChild(grid);
    mapBody.appendChild(band);
  }
  closeJournal();
  mapEl.classList.add("open");
  sndOne("unfurl");
}

// ---- the journal modal: your bestiary, earned by study and blood ----
var jrnlEl = document.getElementById("jrnl");
var jBody = document.getElementById("jbody");
document.getElementById("jclose").addEventListener("click", closeJournal);
function closeJournal() { jrnlEl.classList.remove("open"); }
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
var THEME_VARS = ["bg", "panel", "cream", "dim", "gold", "blood", "bone", "steel", "border", "border2", "line"];
var THEME_ORDER = ["door", "bone", "moss", "abyss", "ember"];
var THEMES = {
  door:  { bg: "#16120c", panel: "#1e1912", cream: "#ede3cc", dim: "#9a8b66", gold: "#d8a94e", blood: "#c96f5a", bone: "#c9bda3", steel: "#a4bec0", border: "#3a3020", border2: "#4a3c22", line: "#2c2418" },
  bone:  { bg: "#e9e1cd", panel: "#efe8d8", cream: "#2c2418", dim: "#7c6f52", gold: "#8a6414", blood: "#a33c2a", bone: "#57503e", steel: "#3f6470", border: "#c6b791", border2: "#a8996f", line: "#d6cbaa" },
  moss:  { bg: "#0a100a", panel: "#111a11", cream: "#cfe3c4", dim: "#6f8a63", gold: "#93d45f", blood: "#d4785f", bone: "#a8bf9a", steel: "#9cc2b8", border: "#2a3a22", border2: "#39512c", line: "#1c2a16" },
  abyss: { bg: "#0a0d14", panel: "#111624", cream: "#ccd9e8", dim: "#6e82a0", gold: "#7fb4e0", blood: "#d06a5a", bone: "#a4b4c8", steel: "#9fc2dc", border: "#243049", border2: "#2f4160", line: "#171f33" },
  ember: { bg: "#150b07", panel: "#1e110b", cream: "#ecd8c2", dim: "#a37c5e", gold: "#e8873c", blood: "#e0563a", bone: "#c8a88e", steel: "#a6b4c4", border: "#46291a", border2: "#5c3722", line: "#331e12" },
};
var thbtn = document.getElementById("thbtn");
var thbrowse = document.getElementById("thbrowse");
var thlist = document.getElementById("thlist");
var themeName = localStorage.getItem("nomad_theme") || "door";
// Anything reaching our CSS vars must be strict hex — presets, or a vetted
// derivation of a foreign 36767. Never raw relay strings.
function okColor(v) { return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v); }
function applyThemeColors(c) {
  for (var i = 0; i < THEME_VARS.length; i++) {
    if (okColor(c[THEME_VARS[i]])) document.documentElement.style.setProperty("--" + THEME_VARS[i], c[THEME_VARS[i]]);
  }
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

print("— you feel keys in your pocket. tap your name in the corner, or type 'keys' —", "sys");
connect();
</script>
</body>
</html>`;
