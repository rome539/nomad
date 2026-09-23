// The whole client: one page, one log, one input line. Text is the art.
// WHICH BUILD THIS IS. Derived from the served page rather than a number
// somebody has to remember to bump: any change to the client changes this, and
// nothing else can. The client is told its own id at serve time and the world's
// id on the wire, and offers a refresh when they stop matching.
//
// A player with the game open across a deploy keeps the OLD script and gets the
// NEW assets, which is how a strip drawn as one flat picture reached a real
// player (2026-09-08). The reconnect is seamless by design, so nothing about it
// ever told the page it had gone stale.
export function buildId(s: string): string {
  let h = 2166136261;                       // FNV-1a, enough to notice a change
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>NOMAD — Multiplayer Text Dungeon on Nostr</title>
<link rel="canonical" href="https://nomadmud.com/">
<meta name="description" content="A living text dungeon on Nostr. The dead stay dead.">
<link rel="icon" type="image/png" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#16120c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NOMAD">
<meta property="og:title" content="NOMAD">
<meta property="og:description" content="A living text dungeon on Nostr. The dead stay dead.">
<meta property="og:url" content="https://nomadmud.com">
<meta property="og:image" content="https://nomadmud.com/og.jpg?v=4">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="NOMAD">
<meta name="twitter:description" content="A living text dungeon on Nostr. The dead stay dead.">
<meta name="twitter:image" content="https://nomadmud.com/og.jpg?v=4">
<style>
  :root {
    --bg: #16120c;
    --panel: #1e1912;
    --cream: #ede3cc;
    --dim: #9a8b66;
    --gold: #d8a94e;
    /* Wear's own amber. NOT --gold: gold is the theme's ACCENT and each theme
       repaints it (green on moss, blue on abyss), which made a battered piece
       read as good news. Tuned per theme like --heal and --blood, for the same
       reason: a severity colour has to stay the same KIND of colour on every
       ground it is shown against. */
    --wear: #d8a94e;
    --blood: #c96f5a;
    --bone: #c9bda3;
    --steel: #a4bec0;
    --heal: #8faa6b;
    --omen: #b195c9;
    --voice: #e79ab6;
    /* THE FIRST BLUE IN THIS PALETTE (rome, 2026-08-11: the Crossing "is
       drew yellow, the same colour as the warrens). It was:
       'crossing' had no case in mapRegionColor at all and fell through to the
       default, which is gold — the HALLS' colour — and gold sits at hue 40deg
       against the warrens' dim at 43deg, so the newest region on the map drew
       as the oldest one and as a second dungeon besides.
       Measured against every colour in use: 216deg, and its nearest neighbour
       is steel (the gates) 32deg away — and steel is a pale desaturated grey
       (18% sat, 70% light) against this at 45%/61%, so the two gates standing
       inside the Crossing still read as gates. Nothing else is within 90deg.
       There was no blue in this palette. There is a mile of water in the world
       now, and water is drawn blue on every map anybody has ever read. */
    --tide: #6f93c9;
    /* THE FIRST NEUTRAL IN THIS PALETTE (rome, 2026-08-19, picking the
       mountain's colour). Every other colour on this chart carries saturation
       18 to 64 - the whole palette is coloured - so a near-grey is not
       competing for a hue slot at all. It occupies the one axis nothing else
       uses, which is why it can sit at 6% saturation and still read as its own
       region rather than as a washed-out version of somebody else's.
       Measured against what it has to live beside: steel (the gates) is
       18% sat / 70% light and visibly BLUE next to this; cream (the overworks)
       is the same lightness but strongly warm at 48% sat. The join that
       actually matters is with the crossing at the Shingle Stair, and the
       crossing is a 45% blue - the two could not be confused.
       It is stone and snow, and it has no colour in it, which is the region. */
    --stone: #d3d6d8;
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
  /* HOW THE WINDOW IS DIVIDED IN IMAGE VIEW. One number: the prose band's
     height. The picture takes what is left, and every measurement inside the
     picture - the standing line, every sprite's height and width - is a share
     of --picth rather than of the viewport, which is what keeps the camera
     lock true when the band moves. */
  /* BOTH ON THE BODY, AND THAT IS NOT A STYLE CHOICE. A custom property is
     inherited as a COMPUTED value, so --picth declared on :root would resolve
     var(--logh) against :root's own --logh and keep that number forever -
     data-log and data-view live on the body, so every override of the dial
     would have been inherited by the band and ignored by the picture, and the
     two halves would overlap by exactly the amount the grip moved. Declared on
     the same element as the overrides, the reference resolves against whichever
     --logh won there. */
  body {
    /* 24vh, not 34 (rome, 2026-09-15). The band and the picture's width are the
       same dial wearing two hats: the plate is 1.60:1 and whatever the band
       leaves is wider than that, so every vh of prose is taken off the sides of
       the room. At 34 the plate drew 895px of a 1512 window; at 24 it draws
       1030 and the sky either side falls from 309px to 241. Still a third more
       prose than the quarter it was before any of this. */
    /* ...plus half an inch (rome, 2026-09-15). The band's top edge moves up by
       exactly that much and the picture, being the complement, gives up the
       same. 0.5in is 48px flat - a CSS inch is 96px by definition and does not
       vary with the screen. */
    --logh: calc(24vh + 0.5in);
    /* --botth IS MEASURED, NOT ASSUMED, and that is the whole lesson of this
       rule. The first cut said calc(100vh - var(--logh)) - the picture is the
       window less the prose band - and the column does not end at the band:
       the chip tray and the input line sit below it, in flow. So the plate's
       bottom edge landed BELOW the band's top by exactly their height, the two
       overlapped, and the picture ran on behind the chips.
       fitPicture() sets --botth to the real distance from the top of the grip
       to the bottom of the window, so whatever is down there - a wrapped chip
       row, a taller input, something not built yet - the picture ends where the
       words begin and nowhere else. The fallback is only for the first frame,
       before any measuring has happened. */
    --botth: var(--logh);
    --picth: calc(100dvh - var(--botth));
  }
  /* THE GRIP MUST NOT MOVE THE DIAL (rome, 2026-09-15). It set --logh to 62vh,
     and the picture is the dial's complement stretched to fill it - so opening
     the log squashed the room into a third of its height. --logh holds still
     now and the band grows UPWARD over the plate. */
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
    /* THE CHROME DOES NOT GIVE. Every one of these is a flex item in the body
       column, and a flex item's default is 0 1 auto — it may SHRINK. So when
       the opened log asked for the whole column, the bar was squeezed shorter
       and, having overflow:hidden, quietly clipped its own text: the room name
       cut in half across the middle, the hp with its top sliced off. It read
       like the bar had moved. It had not; it had been crushed.
       The log is the only thing in this column that may take or give space.
       Everything else states its size and keeps it. */
    flex: 0 0 auto;
    /* And it sits above the picture and above the prose: image-mode #log is
       relative and z-indexed 1 so it can lie on the scene, and static chrome
       would lose to it on any overlap. */
    position: relative;
    z-index: 2;
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
  #room { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: center; white-space: nowrap; }
  /* The bar names the room, then the country it stands in \u2014 dimmer and
     second, so a glance still lands on the room first. On a narrow screen the
     region is the half that goes: the room name is the one you need. */
  #room .rrg { color: var(--dim); }
  @media (max-width: 520px) { #room .rrg { display: none; } }
  #idbtn { color: var(--gold); cursor: pointer; user-select: none; min-width: 0; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  /* The first step of wear: gold, from the theme's own wear amber rather than
     its accent — see --wear. */
  .fx-wear { color: var(--wear); }
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
  /* The deal ASK: a small top-right card, never the trading floor itself —
     the other side has to answer before either of you sees that. Sits above
     everything (z 10002) since it can land while a modal's already open. */
  #dealreq {
    display: none; position: fixed; z-index: 10002; top: 12px; right: 12px;
    max-width: 280px; background: var(--panel); border: 1px solid var(--gold);
    border-radius: 8px; padding: 10px 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.45);
    animation: mfade 0.2s ease-out;
  }
  #dealreq.open { display: block; }
  #drtext { color: var(--cream); font-size: 13px; line-height: 1.4; margin-bottom: 8px; }
  #dracts { display: flex; gap: 6px; }
  #dracts button {
    background: transparent; border: 1px solid var(--border2); border-radius: 4px;
    color: var(--cream); font: inherit; font-size: 12px; padding: 5px 12px; cursor: pointer;
  }
  #dracts button:first-child:hover { color: var(--heal); border-color: var(--heal); }
  #dracts button:last-child:hover { color: var(--blood); border-color: var(--blood); }
  #bench.open { display: flex; }
  #bench .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(920px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #bench .bbody { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
  #bgear { display: none; }
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
  /* ...and louder as the piece goes: gold, then the wound colour. The gold is
     --wear, NOT --gold — the accent is green on moss and blue on abyss, which
     made a battered piece read as good news. These need the same ID-led
     specificity as the rule above, or the dim grey wins the cascade and no
     colour ever lands. */
  #bdoll .dslot .cd.wear-mid { color: var(--wear); }
  #bdoll .dslot .cd.wear-bad { color: var(--blood); }
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
  /* Under a roof of your own the shelf takes the third column. A den is never a
     gate, so the vault and the shelf can never both want it. */
  #bench.nogate.hasden .bcols { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
  /* Destructive actions retain their warning and armed states. */
  #bench .bitem button.burn { color: var(--dim); }
  #bench .bitem button.burn:hover { color: var(--blood); border-color: var(--blood); }
  #bench .bitem button.arm { color: var(--blood); border-color: var(--blood); font-weight: 700; }
  /* Keep controls compact, with space between distinct actions. */
  #bench .bitem .risks {
    display: flex; flex-wrap: wrap; gap: 8px; padding-top: 8px;
    border-top: 1px solid var(--line); margin-top: 4px;
  }
  #bench .bitem .risks button { color: var(--dim); }
  #bench .bitem .risks button.arm { color: var(--blood); }
  @media (pointer: coarse), (max-width: 680px) {
    #bench .bitem .acts { gap: 8px; }
    #bench .bitem { gap: 6px; padding: 8px 0; }
  }
  /* One scroll surface for ALL content; the close button never scrolls away.
     Match the location selectors so dungeon/den cannot restore desktop columns. */
  @media (max-width: 680px), (max-height: 500px) and (pointer: coarse) {
    #bench {
      padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
        env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
      height: 100%; height: var(--play-height, 100dvh);
    }
    #bench .bbox {
      width: 100%; height: 100%; max-height: none; border-radius: 0;
      padding: 12px 12px 0; overflow: hidden;
    }
    #bench .bhead { align-items: center; gap: 8px; }
    #bench .bhead > div { min-width: 0; }
    #bench .bbody {
      flex: 1 1 auto; overflow-y: auto; overscroll-behavior-y: contain;
      padding-bottom: 12px;
    }
    #bench .bbody > * { flex-shrink: 0; }
    #bench .bcols, #bench.nogate .bcols, #bench.nogate.hasden .bcols {
      flex: 0 0 auto; grid-template-columns: minmax(0, 1fr);
      overflow: visible; grid-auto-rows: max-content; align-content: start;
      padding-bottom: 0;
    }
    #bench .bcol { overflow: visible; min-height: 0; }
    #bench .bcolh { flex-wrap: wrap; }
    #bgear {
      display: block; width: 100%; padding: 8px 10px; text-align: left; background: transparent;
      border: 1px solid var(--border2); border-radius: 5px; color: var(--cream); font-family: inherit;
    }
    #bgear[hidden] { display: none; }
    #bdoll { gap: 8px; padding: 8px 10px; }
    #bench:not(.showgear) #bdoll { display: none; }
    #dleft { flex-shrink: 1; }
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
  /* Off the shelf, not out of the world: dim, no price, nothing to press. */
  #trade .trow.tgone .nm { color: var(--dim); }
  #trade .trow.tgone .tcost { color: var(--line); }
  #trade .tgnote { color: var(--dim); font-size: 11px; font-style: italic; padding: 5px 0 2px; }
  #trade .trow button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
  }
  #trade .trow button:hover { color: var(--gold); border-color: var(--gold); }
  #trade .trow button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  @media (max-width: 680px) {
    #trade .bbox { max-height: 92vh; }
    /* grid-auto-rows is LOAD-BEARING, not tidying. Stacked columns are
       min-height: 0 so they can't hold the grid open, which also drops each
       row's base size to nothing — and a grid with a definite height then
       shares that height out evenly between the rows instead of sizing them to
       what's in them. His stock got 237px to show 898px of shelves, and since
       these columns are overflow: visible on a phone the surplus wasn't
       scrolled or clipped, it was PAINTED over the column below: his goods on
       top of yours. Pinning the rows to their content is what stops the share-
       out; .bcols does the scrolling for both columns. */
    #trade .bcols {
      grid-template-columns: minmax(0, 1fr); overflow-y: auto;
      grid-auto-rows: max-content; align-content: start;
    }
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
  /* The keeper's bounty board: same shell as the hatch, one column — the
     trophies he's paying for, each offering a named meal. */
  #bounty {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  #bounty.open { display: flex; }
  #bounty .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(560px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #bounty .bhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #bytitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #bysub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 52ch; }
  #byclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #byclose:hover { color: var(--gold); border-color: var(--gold); }
  #bynote { flex: 0 0 auto; color: var(--blood); font-size: 12.5px; }
  #bynote:empty { display: none; }
  #byboard { overflow-y: auto; flex: 1 1 auto; min-height: 0; padding-bottom: 12px; }
  #bounty .byrow {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px;
    padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  #bounty .byrow:last-child { border-bottom: none; }
  #bounty .byrow .byarrow { color: var(--dim); }
  #bounty .byrow .byfood { color: var(--heal); font-weight: 600; }
  #bounty .byrow .byheal { color: var(--dim); font-size: 11.5px; }
  #bounty .byrow .byhave { color: var(--bone); font-size: 11.5px; flex: 1 1 auto; text-align: right; }
  #bounty .byrow button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 4px 12px; cursor: pointer;
  }
  #bounty .byrow button:hover { color: var(--gold); border-color: var(--gold); }
  #bounty .byrow button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  @media (max-width: 680px) {
    #bounty .bbox { max-height: 92vh; }
    #bounty .byrow button { padding: 8px 16px; font-size: 13px; }
  }
  /* The wanderer-to-wanderer deal: same shell and item-row look as the hatch,
     but three columns (your pack to draw from, what's on your side, what's on
     theirs) since there's no keeper here — just the two of you. Works
     anywhere, not only at a gate, so it never claims the gatehouse's shell
     styling (no bdoll, no away framing). */
  #swap {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.82);
    align-items: center; justify-content: center; padding: 16px 12px;
  }
  #swap.open { display: flex; }
  #swap .bbox {
    background: var(--panel); border: 1px solid var(--border2); border-radius: 10px;
    padding: 14px 14px 0; width: min(920px, 96vw); min-width: 0; max-height: 90vh;
    display: flex; flex-direction: column; gap: 10px;
  }
  #swap .bhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #swtitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #swsub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 52ch; }
  #swclose {
    background: transparent; border: 1px solid var(--border2); border-radius: 5px;
    color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
    flex: 0 0 auto; white-space: nowrap;
  }
  #swclose:hover { color: var(--blood); border-color: var(--blood); }
  #swnote { flex: 0 0 auto; color: var(--blood); font-size: 12.5px; }
  #swnote:empty { display: none; }
  #swconfirm {
    flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
    color: var(--bone); font-size: 12.5px;
    border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px;
  }
  #swconfirm .swside { display: inline-flex; align-items: center; gap: 6px; }
  #swconfirm .swok { color: var(--heal); font-weight: 700; }
  #swconfirm .swpending { color: var(--dim); font-style: italic; }
  #swconfirm button {
    background: transparent; border: 1px solid var(--border2); border-radius: 4px;
    color: var(--cream); font: inherit; font-size: 12px; padding: 5px 14px; cursor: pointer;
    margin-left: auto;
  }
  #swconfirm button:hover { color: var(--gold); border-color: var(--gold); }
  #swconfirm button.on { color: var(--heal); border-color: var(--heal); }
  #swap .bcols {
    flex: 1 1 auto; min-height: 0; padding-bottom: 14px;
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  }
  #swap .bcol {
    border: 1px solid var(--line); border-radius: 8px; padding: 0 10px 8px;
    overflow-y: auto; min-width: 0; min-height: 120px;
    display: flex; flex-direction: column; gap: 6px;
  }
  #swap .bcolh {
    position: sticky; top: 0; background: var(--panel); z-index: 1;
    color: var(--bone); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid var(--line); padding: 10px 0 6px;
  }
  #swap .bempty { color: var(--dim); font-size: 12px; font-style: italic; padding: 4px 0; }
  #swap .bsubh {
    color: var(--dim); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 6px 0 2px;
  }
  #swap .bsubh:first-of-type { padding-top: 2px; }
  #swap .trow {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  #swap .trow:last-child { border-bottom: none; }
  #swap .trow .nm { color: var(--cream); font-size: 13px; flex: 1 1 auto; min-width: 11ch; overflow-wrap: anywhere; }
  #swap .trow button {
    background: transparent; border: 1px solid var(--border); border-radius: 4px;
    color: var(--bone); font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer;
  }
  #swap .trow button:hover { color: var(--gold); border-color: var(--gold); }
  #swap .trow button:disabled { color: var(--dim); border-color: var(--line); cursor: default; }
  @media (max-width: 680px) {
    #swap .bbox { max-height: 92vh; }
    /* Rows sized to their lists, never to the leftover height — see the note in
       the hatch's phone block. Three stacked sides put your offer on top of
       theirs, which is the last table you want to misread. */
    #swap .bcols {
      grid-template-columns: minmax(0, 1fr); overflow-y: auto;
      grid-auto-rows: max-content; align-content: start;
    }
    #swap .bcol { overflow-y: visible; min-height: 0; }
    #swconfirm button { padding: 8px 14px; font-size: 13px; }
    #swap .trow button { padding: 8px 14px; font-size: 13px; }
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
    padding: 14px 14px 0; width: min(920px, 96vw); min-width: 0; max-height: 90vh;
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
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
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
  #forge .bitem .cost { font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
  #forge .bitem .tags {
    color: var(--bone); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  }
  #forge .bitem .quiet { color: var(--dim); font-size: 12px; line-height: 1.4; }
  #forge .bitem .tags .statv { text-transform: none; letter-spacing: 0; font-size: 12px; }
  #forge .bitem .takes { display: grid; grid-template-columns: max-content 1fr; gap: 1px 12px; font-size: 12px; }
  #forge .bitem .takes > div { display: contents; }
  #forge .bitem .takes .tadj { color: var(--bone); }
  #forge .bitem .takes .tdoes { color: var(--dim); }
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
    #forge .bcols {
      grid-template-columns: minmax(0, 1fr); overflow-y: auto;
      grid-auto-rows: max-content; align-content: start;
    }
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
  /* The field note. Set apart with a rule rather than another colour: the card
     already runs bone (behaviour) into dim italic (description), and a third
     shade would read as a third kind of hedging. A line down the left says
     "this is the part you earned" without changing the voice. */
  .jent .jlore { color: var(--cream); font-size: 12.5px; margin-top: 8px; line-height: 1.5; border-left: 2px solid var(--steel); padding-left: 9px; }
  .jent .jstats { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; }
  .jent .jstats span { color: var(--dim); font-size: 12px; }
  .jent .jstats b { color: var(--steel); font-weight: 700; }
  .jmarks { border-top: 1px solid var(--line); padding-top: 12px; margin-top: 4px; }
  .jmarks .jmh { color: var(--cream); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
  .jmarks .jmk { color: var(--gold); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 10px; }
  .jmarks .jmr { color: var(--dim); font-size: 12.5px; margin-top: 3px; line-height: 1.45; }
  .jmarks .jmr b { color: var(--bone); font-weight: 700; }
  .jmarks .jmr b.jflaw { color: var(--steel); }
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

  /* ------------------------------------------------------------------ *
   * THE SCENE. Two ways to be in this world: READ it, or LOOK at it.
   * Text is the default and is untouched — the log keeps the whole
   * column, exactly as it always has, and #scene is not in the layout at
   * all. Ask for pictures and the two swap weight: the plate takes the
   * room and the prose keeps a footing under it, because the prose is
   * still where the fight is won and a player who cannot read the last
   * four lines cannot play. It is a strip, not a caption, and it scrolls.
   * ------------------------------------------------------------------ */
  #scene { display: none; }
  /* FULL BLEED. The picture is not a panel with the text under it — it is the
     room, edge to edge, and everything else floats on top of it. Fixed rather
     than flexed so it fills the window whatever the log is doing, and z-indexed
     under the chrome, which is already opaque and needs no help. */
  /* THE PICTURE HAS ITS OWN BOX AGAIN (rome, 2026-09-15). It was full bleed
     with the prose lying on top of it, and the two were fighting for the same
     band: MOB_LINE exists to push a creature DOWN onto the near ground, and the
     near ground is exactly where the words were. Measured on the coast, where
     every line was lifted six to get animals out of the water, between 15 and
     ALL 23 of the region's creatures had their feet in the text depending on
     the ground - 23 of 23 on the storm beach. No tuning fixes that while the
     words sit on the picture, because every point that puts feet on silt puts
     them further into the prose.
     So: the plate ends where the prose begins, and neither covers the other.
     --logh is the one dial; --picth is what everything in the picture measures
     itself against, and it is a REAL box, not the window. */
  body[data-view="image"] #scene {
    display: block;
    position: fixed;
    left: 0; right: 0; top: 0;
    bottom: var(--botth);
    z-index: 0;
    background-color: transparent;
    /* COVER, NOT CONTAIN. Fitting the whole plate inside the window sounds like
       the generous choice and is not: the plate is 1584x993 and a window is not,
       so contain leaves a band of bare sky down BOTH SIDES of every picture and
       the scene stops being the room you are standing in. Cover crops instead -
       the camera lock reserves the edges for exactly this - and the picture
       reaches every corner, which is what it did from the first plate and what
       it does again (rome, 2026-09-12).

       AND THAT HELD WHILE THE PICTURE WAS THE WHOLE WINDOW (rome, 2026-09-15).
       It stopped holding the moment the prose took a third of the screen: the
       plate is 1.60:1 and the box left over is about 2.70:1, so cover scaled to
       the width and threw away between 32% and 41% of every plate, top and
       bottom - which is the near ground the stage lock spends its whole bottom
       third on. Contain shows the room, all of it.

       THE LEFTOVER IS SKY, NOT A BAR. That is the half of the old argument
       still worth keeping: contain on its own leaves dead ground down both
       sides. So only the SCENE is contained; the sky layer behind it stays
       cover and runs edge to edge. A sky is built to survive an arbitrary crop
       - no focal object, interest spread evenly, and that is written into its
       own recipe - so it is the one layer in the game that loses nothing by
       being cut, and it turns two dead margins into more of the same weather. */
    /* STRETCHED TO THE BOX (rome, 2026-09-15). Not contain, not cover: the
       plate is pulled to fill the picture box exactly, so the whole room shows
       with no crop AND no sky margin. It costs the aspect - the box runs about
       2.3:1 against the plate's 1.60:1, so the room is drawn roughly 47% wider
       than it was painted - and the creature sprites do NOT stretch with it,
       being their own elements. Revert is this one line back to contain. */
    background-size: 100% 100%;
    background-position: center center;
    /* AND ITS EDGES DISSOLVE INTO THE WEATHER. Contained, the plate stops dead
       partway across the box and the hard vertical line reads as a frame - a
       picture of a room hung on a wall, rather than the room. The sky layer is
       already behind it and already running edge to edge, so fading the
       SCENE's alpha at the plate's own edges hands those pixels back to the
       sky and the seam goes.
       --pmarg is where the plate actually starts: contain fills the box's
       height, so the plate is picth * 1.60 wide and the rest is split evenly.
       max() pins it at zero on a window narrow enough that the plate already
       spans the full width, where there is no seam to hide. */
    /* ZERO WHILE THE PLATE IS STRETCHED. There is no margin any more, so the
       fade would have nothing to dissolve into and would simply rub out 64px
       of real room at each edge. Put it back to 64px the moment the size goes
       back to contain - the two belong together. */
    --pmarg: 0px;
    --feather: 0px;
    -webkit-mask-image: linear-gradient(to right,
      transparent var(--pmarg),
      #000 calc(var(--pmarg) + var(--feather)),
      #000 calc(100% - var(--pmarg) - var(--feather)),
      transparent calc(100% - var(--pmarg)));
    mask-image: linear-gradient(to right,
      transparent var(--pmarg),
      #000 calc(var(--pmarg) + var(--feather)),
      #000 calc(100% - var(--pmarg) - var(--feather)),
      transparent calc(100% - var(--pmarg)));
    background-repeat: no-repeat;
    transition: filter .8s ease;
  }
  /* THE SKY IS ITS OWN LAYER, and it has to be, for one reason: the hour's tint
     must reach the GROUND without touching the sky. When both lived on one
     element the tint was an overlay across the whole thing, so a dawn wash over
     a painted dawn sky tinted it twice — and worse, it painted colour over the
     cut-out holes where the sky shows through a sign or a fence. Two elements
     and the tint becomes a FILTER on the scene alone, which respects its alpha:
     the holes stay holes, the sky stays as painted, and only the stone changes. */
  #sky { display: none; }
  body[data-view="image"] #sky {
    display: block;
    position: fixed;
    /* THE SAME BOX AS THE SCENE, to the pixel. The scene is keyed above its
       horizon and this shows through the hole; a sky on a different box would
       slide against the skyline it is supposed to sit behind. */
    left: 0; right: 0; top: 0;
    bottom: var(--botth);
    /* NOT -1. A fixed element at a negative z-index paints BEHIND the body's
       background, and this body has an opaque one — so the sky was drawn, and
       covered, and every layered room showed its scene over flat brown with no
       sky at all. Zero puts it in the positioned layer with the scene, and DOM
       order (sky first) is what keeps the scene on top of it. */
    z-index: 0;
    background-color: var(--bg);
    background-size: cover;
    background-position: center 55%;
    background-repeat: no-repeat;
  }
  /* AGREEING THE GROUND WITH THE SKY. A borrowed scene is the right place under
     the wrong light: the day stone under a dusk sky is still lit for noon, and
     the eye reads the mismatch instantly. These bring it into line — dim and
     warm for the low hours, red for the blood moon — and they are only ever
     applied when the scene is NOT the one painted for the condition. */
  /* THERE ARE NO t-dawn OR t-dusk RULES FOR THE GROUND, and their absence is the
     decision (rome, 2026-09-08). Both hours stand on the night plate now, which
     is the right dark ground for a dark hour — so there is nothing to correct,
     and a warm wash over it would be inventing light that is not reaching the
     stone. The sky behind carries the evening; the ground is simply dark.
     The three below stay because each is a real change to what falls on the
     ground rather than a repair to a borrowed picture. */
  body[data-view="image"] #scene.t-eclipse { filter: brightness(.70) saturate(.55) contrast(1.06); }
  body[data-view="image"] #scene.t-moon    { filter: brightness(1.10) saturate(.92); }
  /* THE BLOOD MOON IS THE ONE TINT A FILTER CANNOT DO. Every CSS filter treats
     every pixel the same, so reddening the cold stone also reddens the torch —
     sepia(1) took the lamp from amber to a washed pink and put the flame out.
     Backing the sepia off saves the torch and stops reddening the stone. There
     is no setting that does both, because the two things want opposite
     treatment: the grey must gain a hue and the amber must keep the one it has.
     MULTIPLY makes that distinction for nothing. Scaling by a red leaves what is
     already red alone and pulls everything else toward it — stone #969696 goes
     to #7d483f while the lamp at #e1aa5a goes to #bc5226, which is still a
     flame. The mask is what keeps it honest: it is the scene's own image, so
     the red lands only where the scene is opaque and never on the sky showing
     through a doorway or a gap in the turf. */
  /* A GROUND STANDING IN FOR WEATHER IT WAS NOT SHOT FOR. Only ever reached
     when that scene has not been made yet — dry stone in the rain is still
     wrong, but wrong and dimmed reads better than wrong and bright. */
  /* A DAY GROUND STANDING IN AFTER DARK. Only reached where a night scene has
     not been made yet. Dimming is all this can honestly do — the shadows still
     fall the way noon threw them — so it is deliberately plain, and it should
     look like something waiting to be replaced. */
  body[data-view="image"] #scene.t-night { filter: brightness(.42) saturate(.85); }
  body[data-view="image"] #scene.t-after-rain { filter: brightness(.94) saturate(.80) contrast(.96); }
  body[data-view="image"] #scene.t-fog   { filter: brightness(.92) saturate(.45) contrast(.86); }
  body[data-view="image"] #scene.t-rain  { filter: brightness(.74) saturate(.80) contrast(1.04); }
  body[data-view="image"] #scene.t-snow  { filter: brightness(1.04) saturate(.55); }
  /* UNREACHABLE AS OF 2026-09-09 and kept on purpose: the blood moon is in
     NO_GROUND_TINT now, so nothing ever sets t-blood on the scene. Left standing
     because this is the rule you would switch back on, and a deleted one is a
     rule nobody knows was ever considered. */
  body[data-view="image"] #scene.t-blood::after {
    background: #d67c6c;
    mix-blend-mode: multiply;
    /* NOTE, if this is ever made reachable again: it REPLACES the edge feather
       the base rule sets, because mask-image does not compose across rules. A
       revived blood tint would want both - the scene's own image to keep red
       off the sky, and the horizontal fade to keep the plate's edge soft. */
    -webkit-mask-image: var(--sceneimg); mask-image: var(--sceneimg);
    -webkit-mask-size: cover; mask-size: cover;
    -webkit-mask-position: center 55%; mask-position: center 55%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  body[data-view="image"] #bar,
  body[data-view="image"] #chips,
  body[data-view="image"] #inputline { position: relative; z-index: 1; }
  /* The weather is a WASH over the plate, not a second plate. One picture
   * per band, nine skies over it — so the hour and the storm cost nothing
   * in art and change the moment the world does. When there are real
   * per-condition plates these scrims go quiet and stay as the polish. */
  body[data-view="image"] #scene::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--scrim, transparent);
    transition: background .8s ease;
    pointer-events: none;
  }
  /* THE WASHES ARE TINTS, NOT SHUTTERS. The first cut of these was set by eye
     against nothing, and it put a 64% black scrim over the torch plate — a
     painting whose own mean luma is FOUR. Black on black: the picture loaded,
     was painted, and could not be seen, and it looked for all the world like a
     broken feature. Halved across the board, and each now leans on hue rather
     than on simply subtracting light. Any of them can go darker once it has
     been judged on a real plate; none may take a picture below being one. */
  /* WHAT IS STANDING IN THE ROOM WITH YOU. A row of cut-out sprites resting on
     the near ground of whatever plate is showing — which is the whole reason
     the stage lock reserved the bottom third of every picture. Sized by kind so
     a hare and an eagle owl stay a hare and an eagle owl, and laid out with the
     biggest nearest the middle so nothing important hides behind anything else.
     Hidden with the scene: in text mode there is nothing to stand on. */
  #weather-particles { display: none; position: fixed; z-index: 0; pointer-events: none; }
  #mobs { display: none; }
  body[data-view="image"] #mobs {
    display: flex;
    position: fixed;
    left: 0; right: 0;
    /* CENTRED ON THE HORIZON, NOT STOOD ON A LINE. Sharing one bottom edge is
       what a real ground plane does, and it was the wrong model here: a common
       standing line puts every creature's FEET at the same height, so the
       shorter it is the further it sinks toward the prose, and the fixed tuck
       that costs a 22vh man a tenth of his legs takes a third of a 7vh adder.
       An adder ended up hiding behind the text while a hind stood clear of it,
       which is exactly backwards — the small ones are the ones that need the
       room. So each sprite is centred on one line instead of stood on one, and
       the line is the camera's own: the lock puts the horizon at 55% of the
       frame, which is where an eye-level view looks. Everything meets the eye
       there whatever size it is, nothing small is lost under the prose, and the
       biggest thing on the hill is the only one whose feet reach it at all.
       This is also how the crawlers this is drawn after framed a monster: in
       the middle of the view window, not standing at the bottom of it. */
    /* 55% OF THE PICTURE, NOT OF THE WINDOW. The element is position:fixed, so
       a bare percentage here would resolve against the viewport and the whole
       roster would sit wherever the prose band happened to leave it. */
    top: calc(var(--picth) * 0.55);
    transform: translateY(-50%);
    z-index: 0;
    align-items: center;
    justify-content: center;
    gap: 3vw;
    pointer-events: none;
    padding: 0 4vw;
  }
  /* The creatures take the hour the same way the ground does. The blood moon is
     a filter here rather than the scene's masked multiply: a mask needs the
     picture it is masking, and each sprite is its own picture — and nothing on
     four legs is carrying a lamp that has to survive. */
  /* A CREATURE IS DARKER THAN THE GROUND IT STANDS ON, and these numbers are
     its own rather than the scene's. Reusing the scene's was measurably wrong:
     the night plates run about .66 of their own day plate, and the eagle-owl
     sprite comes out of the sheet at luminance 57.7 against a snow-night ground
     of 57.0 — the same value, which is precisely why an owl on a moonless
     glacier read as a sticker laid on the photograph.
     The reason is physical and it is why one shared number could never serve
     both: open ground faces the sky and catches what light there is, and snow
     throws most of it back. A creature is a vertical thing with the sky edge-on
     to it, lit only by what the ground bounces up. So each hour here goes a
     step past the scene's — the drop-shadow is re-appended every time because a
     filter list replaces, it does not add. */
  /* DAWN CAME DOWN WITH ITS GROUND. This was .55 against a ground standing at
     .74 of day — and when dawn moved onto the night plate the ground fell to
     .59 while the creature stayed put, which left it at 93% of the stone it is
     standing on. That is the sticker-on-a-photograph failure this whole block
     was written to stop. .44 holds the same creature-to-ground ratio the hour
     had before anything moved; the number changed only to keep the relationship
     that was already there. */
  body[data-view="image"] #mobs.t-dawn img, body[data-view="image"] #mobs.t-dawn .mob { filter: brightness(.44) saturate(.80) sepia(.16) hue-rotate(-6deg) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  body[data-view="image"] #mobs.t-dusk img, body[data-view="image"] #mobs.t-dusk .mob { filter: brightness(.42) saturate(.95) sepia(.30) hue-rotate(-16deg) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  body[data-view="image"] #mobs.t-night img, body[data-view="image"] #mobs.t-night .mob { filter: brightness(.26) saturate(.70) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  /* A CARRIED FLAME INVERTS THE RULE ABOVE. Every other hour a creature is
     DARKER than the ground it stands on, because open ground faces the sky and
     a creature stands edge-on to it. A torch is the opposite kind of light: it
     is low, near, and it falls on the upright thing in front of you before it
     reaches anything else. So this is the only tint in the table that goes
     BRIGHTER than its own scene — the near ground on these plates lifts about
     double and the creature standing on it lifts further, which is what puts it
     in the light rather than on it. Warm, and short of daylight: the flame is
     orange and it does not reach far. */
  body[data-view="image"] #mobs.t-night-torch img, body[data-view="image"] #mobs.t-night-torch .mob { filter: brightness(.80) saturate(1.04) sepia(.22) hue-rotate(-14deg) drop-shadow(0 3px 6px rgba(0,0,0,.8)); }
  body[data-view="image"] #mobs.t-eclipse img, body[data-view="image"] #mobs.t-eclipse .mob { filter: brightness(.48) saturate(.45) contrast(1.06) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  /* The full moon LIGHTS the ground — the scene brightens to 1.10 — and a
     creature standing on lit ground is the thing between you and it. It stays
     dark; the difference from an ordinary night is that you can see its shape. */
  body[data-view="image"] #mobs.t-moon img, body[data-view="image"] #mobs.t-moon .mob { filter: brightness(.52) saturate(.80) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  /* A TRACE OF RED, NOT A SHEET OF IT (rome, 2026-09-09). This was
     brightness(.52) sepia(1) saturate(1.5) hue-rotate(-38deg) — a solid red
     figure, calibrated against a ground that was itself being washed red. That
     wash is gone (NO_GROUND_TINT), so the animal was standing bright crimson on
     the plain night plate, which is the sticker-on-a-photograph failure these
     tints exist to prevent, in its most obvious form.
     DAWN IS THE SHAPE TO COPY, having been through exactly this: it stands on
     the same untinted night plate and carries sepia(.16) — a hint that says
     which hour it is, not a colour laid over the animal. Blood gets twice that
     hint because its cast really is stronger, and its brightness sits just above
     night's .26 rather than at dawn's .44, because its sky is the darkest in the
     game (mean 13, against night's 47 and dawn's 85). It is still a full moon,
     so there is light; there is just very little of it and it is red. */
  body[data-view="image"] #mobs.t-blood img, body[data-view="image"] #mobs.t-blood .mob { filter: brightness(.28) saturate(.85) sepia(.30) hue-rotate(-24deg) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  /* Fog and falling snow are the two that also push a shape AWAY from you:
     less contrast and less colour is what distance looks like through weather,
     and it is what stops a creature reading as a cut-out on a flat wash. */
  body[data-view="image"] #mobs.t-after-rain img, body[data-view="image"] #mobs.t-after-rain .mob { filter: brightness(.94) saturate(.82) contrast(.97) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  body[data-view="image"] #mobs.t-fog img, body[data-view="image"] #mobs.t-fog .mob { filter: brightness(.78) saturate(.35) contrast(.80) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  body[data-view="image"] #mobs.t-rain img, body[data-view="image"] #mobs.t-rain .mob { filter: brightness(.58) saturate(.70) contrast(1.04) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  body[data-view="image"] #mobs.t-snow img, body[data-view="image"] #mobs.t-snow .mob { filter: brightness(.82) saturate(.45) contrast(.92) drop-shadow(0 3px 6px rgba(0,0,0,.75)); }
  #mobs img, #mobs .mob {
    display: block;
    width: auto;
    image-rendering: pixelated;
    filter: drop-shadow(0 3px 6px rgba(0,0,0,.75));
    /* THE ROW HAS TO FIT THE WINDOW IT IS IN. A sprite is sized in vh, so its
       WIDTH in vw depends on the shape of the viewport — and a phone held
       upright is the case that breaks it: the same four creatures that take
       64vw on a desktop take 245vw on a 390x844 screen, and a row that
       overflows a centred flex line is simply clipped at both ends, so the
       outermost creatures lose their heads and tails with nothing to say they
       were ever there. Images will not shrink on their own — min-width resolves
       to their intrinsic width — so the two properties below are what let the
       line give: min-width lets flex take the width, and object-fit keeps the
       animal's proportions while it does instead of squashing it. A crowded
       row on a narrow screen now scales itself down to fit, which is the right
       answer anyway: four things in a room SHOULD read as further off than
       one thing filling the frame. */
    min-width: 0;
    object-fit: contain;
  }
  /* AN ANIMATED CREATURE IS A WINDOW ONTO A STRIP. Six frames live side by side
     in one file, and this element shows one of them at a time — background-size
     is n*100% wide so each frame lands exactly on the element, and stepping
     background-position-x walks along them. One file, one request, and the
     frames compress almost to nothing because they are nearly identical.
     aspect-ratio carries ONE frame's shape, so setting height still gives the
     right width the way it does for an img. */
  /* A BODY IS NOT TRANSPARENT (rome, 2026-09-08). This carried opacity .68, on
     the reasoning that a corpse should read differently from a living thing and
     that opacity was the only property which composes with the hour tints —
     those are filters, and a filter here would have cancelled the night wash and
     left a daylit corpse on a dark hill.
     The reasoning about the cascade was right and the premise was wrong: a body
     is a solid object, and you could see the ground through it. The thing that
     says it is dead is the DEATH FRAME — the animal is down, held on its last
     pose, not moving — and that says it without making it a ghost. So there is
     no rule here at all now, and the absence is the decision. */
  #mobs .mob {
    background-repeat: no-repeat;
    background-position-y: center;
    /* An <img> may give width to fit a crowded row (see min-width above); a strip
       window may NOT. Its width is one frame wide by construction, and flex
       taking any of it stretches the picture instead of scaling it. */
    flex: 0 0 auto;
  }
  #scene.sky-day   { --scrim: transparent; }
  #scene.sky-dawn  { --scrim: linear-gradient(rgba(84,104,148,.20), rgba(198,168,118,.10)); }
  #scene.sky-dusk  { --scrim: linear-gradient(rgba(58,38,28,.20), rgba(188,108,48,.14)); }
  #scene.sky-night { --scrim: linear-gradient(rgba(8,10,26,.46), rgba(8,10,26,.38)); }
  #scene.sky-moon  { --scrim: linear-gradient(rgba(20,30,60,.32), rgba(30,44,80,.24)); }
  /* The blood moon was collapsing into ordinary night, so the one night the
     world changes colour looked like every other one. */
  #scene.sky-blood { --scrim: linear-gradient(rgba(70,14,14,.42), rgba(46,10,10,.34)); }
  /* Totality: the light goes wrong at midday. Cold and dim, not warm like dusk,
     which is the whole difference between an eclipse and an evening. */
  #scene.sky-eclipse { --scrim: linear-gradient(rgba(18,20,34,.44), rgba(30,26,30,.36)); }
  #scene.sky-fog   { --scrim: linear-gradient(rgba(150,150,145,.30), rgba(118,120,118,.24)); }
  #scene.sky-rain  { --scrim: linear-gradient(rgba(30,40,50,.28), rgba(24,32,44,.22)); }
  #scene.sky-snow  { --scrim: linear-gradient(rgba(202,212,226,.22), rgba(168,184,204,.16)); }
  /* Under a roof the light is one you are carrying, so this warms and vignettes
     rather than dims — the plate is already the darkest thing in the game. */
  #scene.sky-in    { --scrim: radial-gradient(ellipse at 50% 62%, rgba(60,40,18,.10) 0%, rgba(10,8,6,.30) 55%, rgba(6,5,4,.52) 100%); }
  /* THE PROSE LIES ON THE PICTURE. No hard edge, no border, no panel: the log
     falls to the floor of the column and fades up out of the image, darkest
     where the newest line sits. It is a BAND now rather than a veil over the
     picture (rome, 2026-09-15): it holds a fixed share of the window, the plate
     holds the rest, and a long fight scrolls inside it instead of creeping up
     over the room. */
  body[data-view="image"] #log {
    position: relative;
    z-index: 1;
    /* ...and NOT here: see the grip above. */
    margin-top: 0;
    /* A BAND, NOT A VEIL. Fixed to --logh both ways: the picture's box is the
       exact complement of it, so growing one shrinks the other and nothing ever
       lies over anything. "flex: none" rather than a max-height, because a
       max-height lets the band shrink to its content and the picture would then
       stretch to a height the sprites were not measured against. */
    flex: none;
    height: var(--logh);
    min-height: 0;
    transition: height .22s ease;
    /* Opaque now, and built from --bg so a repainted theme repaints this too.
       The gradient existed to let the picture read through the words; there is
       no picture under here any more. A single hairline keeps the edge honest. */
    background: var(--bg);
    /* No rule across the top (rome, 2026-09-15). The plate stopping is the edge;
       it does not need drawing, and a full-width hairline under the picture is
       the one bit of chrome the room cannot afford. */
  }
  /* PULLED OPEN IS THE WHOLE COLUMN (rome, 2026-09-06). It was half the window,
     which is the worst of both: not enough to read a long fight back through,
     and still enough to bury the picture. So the grip is a switch between two
     whole things rather than a nudge between two partial ones — closed you are
     LOOKING at the room, open you are READING it, and open is the text client
     exactly as it stands with no strip and no ceiling.
     The picture is not thrown away, it is behind the words: the fade at the top
     is kept so the prose still rises out of the image instead of arriving as a
     panel with a border, but it reaches full ground within a tenth of the
     column so nothing you are actually reading sits on stone. */
  body[data-view="image"][data-log="big"] #log {
    /* TALLER ON SCREEN, THE SAME SIZE IN THE COLUMN. A flex item's outer size is
       its height plus its margins, so 62vh of band with (--logh - 62vh) of
       negative margin still occupies exactly --logh of the column: nothing
       below it moves and the extra height goes upward, over the plate. z-index
       1 is on the base rule and the scene is 0, so it paints over the room. */
    height: 62vh;
    margin-top: calc(var(--logh) - 62vh);
    /* Over a picture again, so the veil comes back for this state only. */
    background: linear-gradient(to bottom,
      color-mix(in srgb, var(--bg) 0%, transparent) 0%,
      color-mix(in srgb, var(--bg) 82%, transparent) 5%,
      color-mix(in srgb, var(--bg) 96%, transparent) 14%,
      color-mix(in srgb, var(--bg) 99%, transparent) 100%);
    border-top: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.8);
  }
  body[data-view="image"][data-log="big"] #loggrip {
    transform: translateY(calc(var(--logh) - 62vh));
  }
  /* On a short window the picture yields first, never the words - the rule has
     not changed, only where it is written: one dial moves both halves. */
  @media (max-height: 620px) {
    body[data-view="image"] { --logh: 46vh; }
  }
  /* The handle: a slim tab on the top edge of the strip, the only chrome the
     picture is allowed. Hidden entirely in text mode, where the log is already
     the whole column and there is nothing to pull open. */
  #loggrip { display: none; }
  body[data-view="image"] #loggrip {
    display: block;
    position: relative;
    z-index: 2;
    /* THE AUTO MARGIN BELONGS TO THE FIRST THING IN THE BOTTOM CLUSTER, and
       that is the grip, not the log. In a column flex every pixel of free space
       is absorbed by the FIRST auto margin it meets - so with it on the log,
       the space opened up BETWEEN the grip and the log and left the grip
       stranded up by the bar. Harmless while nothing measured it; fatal once
       the picture's floor was measured from it, which put the plate's bottom
       edge above its top and painted the room into a forty-pixel sliver.
       On the grip, the whole cluster - grip, band, chips, input - sits down at
       the bottom together and the grip is genuinely the top of it. */
    /* NO ROW OF ITS OWN (rome, 2026-09-15). The strip of space between the
       plate and the first line was this button's flow row, and the band's top
       edge sat under it - which is where the text was being cut. A negative
       bottom margin equal to its own height takes that row back out of the
       column, so the band rises to meet the plate and there is no gap left for
       anything to hide in. The transform then lifts the button clear onto the
       plate above, so it sits over the picture rather than over the words.
       margin-top stays auto: it is still the first thing in the bottom cluster
       and still the one absorbing the column's free space. */
    margin: auto auto calc(0px - var(--griph, 18px));
    transform: translateY(calc(0px - var(--griph, 18px)));
    width: 74px;
    padding: 3px 0 4px;
    border: 0;
    border-radius: 3px 3px 0 0;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    color: var(--dim);
    font: inherit;
    font-size: 11px;
    line-height: 1;
    letter-spacing: .18em;
    cursor: pointer;
    transition: color .15s, background .15s;
  }
  body[data-view="image"] #loggrip:hover,
  body[data-view="image"] #loggrip:focus-visible { color: var(--gold); background: color-mix(in srgb, var(--bg) 94%, transparent); outline: none; }
  #log div { white-space: pre-wrap; word-break: break-word; margin-bottom: 2px; }
  #log .feed { color: var(--dim); }
  #log .sys  { color: var(--gold); }
  #log .echo { color: var(--dim); opacity: 0.7; margin-top: 6px; }
  /* Color-coded events (the trailer's language, in-game): wounds bleed,
     gains glow, the room announces itself, the furniture recedes. */
  #log .head { display: flex; align-items: center; gap: 12px; color: var(--gold); font-weight: 700; letter-spacing: 0.05em; margin-top: 8px; }
  #log .head::after {
    content: "";
    flex: 1 1 20px;
    min-width: 12px;
    height: 1px;
    background: color-mix(in srgb, var(--gold) 40%, transparent);
  }
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
  /* Gear wearing down — an amber caution so a fraying blade or thinning plate is
     a warning you SEE coming, never a silent break. Italic: an aside, not combat. */
  #log .wear   { color: var(--gold); font-style: italic; }
  /* A locked chest in the room is loot-in-waiting — it must not read as white
     scenery you walk past. Gold and bold so it catches the eye on the way in. */
  #log .loot   { color: var(--gold); font-weight: 700; }
  /* RARITY COLOURS. The five tiers ride the SAME adaptive brightness system as
     names (--name-s / --name-l: saturation/lightness reset per theme from its
     own ground in applyThemeColors), so the hues survive any ground — dark
     Door, light Bone, or a worn Nostr theme. Each tier is a fixed hue nothing
     else in the palette wears, so a legendary reads as itself on any screen.
     Hue choices, stated: common = the floor's own grey (bone); uncommon = the
     mending-green's hue but a tier up the ladder; rare = the tide's blue;
     epic = the omen's violet; legendary = the gold. Never pure white or the
     theme's cream — an item name must never masquerade as a headline. */
  #log .r-common    { color: var(--dim); }
  #log .r-uncommon  { color: hsl(95, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #log .r-rare      { color: hsl(214, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #log .r-epic      { color: hsl(275, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #log .r-legendary { color: hsl(42, var(--rar-s, 58%), var(--rar-l, 68%)); }
  /* ...and by the paperdoll's slots and the forge's recipe list, which are
     nothing but gear from top to bottom. */
  #bdoll .dslot .it.r-common    { color: var(--dim); }
  #bdoll .dslot .it.r-uncommon  { color: hsl(95, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #bdoll .dslot .it.r-rare      { color: hsl(214, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #bdoll .dslot .it.r-epic      { color: hsl(275, var(--rar-s, 58%), var(--rar-l, 68%)); }
  #bdoll .dslot .it.r-legendary { color: hsl(42, var(--rar-s, 58%), var(--rar-l, 68%)); }
  /* The same five, worn by inventory rows and bench/shelf entries. */
  .bitem .r-common    { color: var(--dim); }
  .bitem .r-uncommon  { color: hsl(95, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .bitem .r-rare      { color: hsl(214, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .bitem .r-epic      { color: hsl(275, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .bitem .r-legendary { color: hsl(42, var(--rar-s, 58%), var(--rar-l, 68%)); }
  /* And the same five again on a counter row (.trow) — the keeper's shelves and
     both sides of a deal. The colours were only ever scoped to .bitem, so a
     shop row could carry the class and still draw grey. */
  .trow .r-common    { color: var(--dim); }
  .trow .r-uncommon  { color: hsl(95, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .trow .r-rare      { color: hsl(214, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .trow .r-epic      { color: hsl(275, var(--rar-s, 58%), var(--rar-l, 68%)); }
  .trow .r-legendary { color: hsl(42, var(--rar-s, 58%), var(--rar-l, 68%)); }
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
  /* A TELLING. The keeper's stories, his word on the weather on his own ground,
     and the asides about his doors — the only lines in the game that are one
     man handing you knowledge, at a place you had to walk to. They were printing
     in the log's ordinary grey, indistinguishable from "dry bones clatter from
     below", which for the single highest-value text in the world is the wrong
     way round (rome, 2026-08-31).
     Bone rather than a new hue: this is old knowledge, not an omen and not a
     living voice, and it should not compete with either. The rule down the left
     is what actually does the work — nothing else in the log carries one, so a
     telling is recognisable before a word of it is read, and a long one holds
     together as a block instead of dissolving into the scroll. */
  #log .lore   { color: var(--bone); border-left: 2px solid var(--border);
                 padding-left: 0.6em; margin: 0.15em 0; font-style: italic; }
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
    flex: 0 0 auto;   /* chrome does not give — see #bar */
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
  /* A chip that just took this slot refuses the click it caught on the way in
     (CHIP_ARM_MS). The refusal has to be visible or it reads as a dead button —
     one short shake, no colour change, so it never looks like an error. */
  #chips button.c-block { animation: chipnope 0.2s ease-out; }
  @keyframes chipnope {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }
  @media (prefers-reduced-motion: reduce) {
    #chips button.c-block { animation: none; opacity: 0.55; }
  }
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
    flex: 0 0 auto;   /* chrome does not give — see #bar. The one thing you must
                         never lose is the line you type into. */
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
  /* There is no "bring your keys" line any more (rome, 2026-08-08). It pressed
     enter for you and opened the identity panel — a panel that is already one
     tap away in the top-right of the bar, and that crossing the door already
     points you at in so many words. A door with one button on it should have
     one button on it. */
  /* THE FOOTER LINE. Pinned to the bottom of the door and taken out of flow
     entirely, so the centred stack above it — title, line, button, keys — sits
     exactly where it has always sat and does not move by a pixel whether this
     is here or not (rome, 2026-08-08: "you shifted everything up"). It used to
     be a plaque in the top-right corner, which nobody was ever going to look
     at; the bottom of a page is where a first-timer looks for the small print. */
  #thr-help {
    position: absolute; left: 0; right: 0; bottom: 20px; z-index: 2;
    color: var(--dim); font-size: 12.5px; text-align: center; padding: 0 16px;
  }
  #thr-guide { color: var(--bone); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  #thr-guide:hover, #thr-guide:focus-visible { color: var(--cream); outline: none; }
  /* ---- the door's news: one live line under the keys, and the reckoning ----
     The line is the hook (something is happening and you are not in it); the
     board is for anyone the hook works on. Both hidden until /world.json
  /* ---- the reckoning: top-left of the door, and nothing else ----
     Absolutely positioned, so it sits outside the centred stack entirely:
     it cannot compete with the enter button, and it cannot move the door by
     a pixel whether the fetch lands, fails, or never returns. Hidden until
     there is actually a board to show. */
  /* A PLAQUE, NOT A LINK (rome, 2026-08-07: "it looks exactly like bring your
     keys"). It did — dim text under a bone underline is the door's inline-link
     style, so the boards read as a second footnote to the same sentence. This
     is a different KIND of thing: a notice posted on the wall. Uppercase and
     letter-spaced (the same treatment the boards' own column heads get), no
     underline, and a hairline box around it so it reads as something nailed up
     rather than something written in a line of prose. */
  #thr-reck {
    position: absolute; top: 16px; left: 16px; z-index: 2; display: none;
    background: rgba(22, 18, 12, .55); border: 1px solid var(--border);
    font-family: inherit; font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
    color: var(--dim); cursor: pointer; padding: 7px 12px;
    transition: color .18s ease, border-color .18s ease;
  }
  #thr-reck.on { display: block; }
  #thr-reck:hover, #thr-reck:focus-visible { color: var(--gold); border-color: var(--gold); outline: none; }
  /* The reckoning modal reuses the map/journal shell verbatim. */
  #reckm { display: none; position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,.82); align-items: center; justify-content: center; padding: 16px 12px; }
  #reckm.open { display: flex; }
  #reckm .lbox { background: var(--panel); border: 1px solid var(--border2); border-radius: 10px; padding: 14px 14px 0; width: min(720px, 96vw); max-height: 90vh; display: flex; flex-direction: column; gap: 10px; }
  #reckm .lhead { flex: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  #recktitle { color: var(--gold); font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
  #recksub { color: var(--dim); font-size: 12px; margin-top: 3px; max-width: 56ch; }
  #reckclose { background: transparent; border: 1px solid var(--border2); border-radius: 5px; color: var(--cream); font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer; flex: 0 0 auto; white-space: nowrap; }
  #reckclose:hover, #reckclose:focus-visible { color: var(--gold); border-color: var(--gold); outline: none; }
  #reckbody { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
  #reckbody h3 { color: var(--dim); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; font-weight: 400; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  #reckbody .rrow { display: grid; grid-template-columns: 1.8em 1fr auto; gap: 10px; align-items: baseline; padding: 7px 0; font-size: 13.5px; border-bottom: 1px solid var(--line); }
  /* THE PODIUM. Gold is the palette's own; the other two are mixed for THIS
     ground rather than borrowed from the tokens — --steel is a cold blue that
     reads as UI here, and --blood is the death colour and cannot mean "second
     best". So: a warm-neutral silver that still reads as metal against a brown
     ground, and a bronze pitched well under the gold so first and third are
     never confused at a glance. Everything from 4th down stays dim: a podium
     only means something if the rest of the list doesn't glow. */
  #reckbody .rrk { color: var(--dim); font-size: 11.5px; font-variant-numeric: tabular-nums; }
  #reckbody .rrk1 { color: var(--gold); font-weight: 700; }
  #reckbody .rrk2 { color: #bcbdb4; font-weight: 700; }
  #reckbody .rrk3 { color: #b07a4a; font-weight: 700; }
  /* The name carries the rank too, or the medal is a detail nobody's eye lands
     on — the name is what people actually read down. */
  #reckbody .rnm1 { color: var(--cream); }
  #reckbody .crown { width: 11px; height: 9px; margin-left: 7px; vertical-align: baseline; fill: var(--gold); flex: 0 0 auto; }
  #reckbody .rnm { display: flex; align-items: center; min-width: 0; }
  #reckbody .rnm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #reckbody .rnm { color: var(--bone); }
  #reckbody .rsc { color: var(--gold); font-variant-numeric: tabular-nums; }
  #reckbody .rfoot { color: var(--dim); font-size: 11.5px; padding-top: 9px; }
  #reckbody .rempty { color: var(--dim); font-size: 12.5px; font-style: italic; padding: 8px 0; }
  /* The pager. Ten to a page; the arrows only appear when there is somewhere to
     go, so a board of four looks exactly as it did before pagination existed. */
  #reckbody .rpage { display: flex; align-items: center; gap: 10px; padding-top: 10px; }
  #reckbody .rpage .rcount { color: var(--dim); font-size: 11px; letter-spacing: .06em; font-variant-numeric: tabular-nums; }
  #reckbody .rpage button {
    font-family: inherit; font-size: 12px; line-height: 1;
    background: transparent; border: 1px solid var(--border); color: var(--bone);
    padding: 4px 9px; cursor: pointer; border-radius: 3px;
  }
  #reckbody .rpage button:hover:not(:disabled), #reckbody .rpage button:focus-visible:not(:disabled) { color: var(--gold); border-color: var(--gold); outline: none; }
  #reckbody .rpage button:disabled { opacity: .3; cursor: default; }
  /* A short last page must not make the column jump as you step through it. */
  #reckbody .rrows { display: flex; flex-direction: column; min-height: 266px; }
  @media (max-width: 560px) { #reckbody { grid-template-columns: 1fr; gap: 20px; } }
  /* Shared modal containment: tall summaries must scroll with their lists. */
  #trade .modalbody, #swap .modalbody, #bounty .modalbody, #forge .modalbody {
    display: flex; flex-direction: column; gap: 10px; min-height: 0;
  }
  .modal-tap-blocked { outline: 1px solid var(--gold); outline-offset: 2px; }
  @media (max-width: 680px), (max-height: 500px) and (pointer: coarse) {
    #trade, #swap, #bounty, #forge, #mapm, #jrnl, #reckm {
      padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
        env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
      height: 100%; height: var(--play-height, 100dvh);
    }
    #trade .bbox, #swap .bbox, #bounty .bbox, #forge .bbox,
    #mapm .lbox, #jrnl .lbox, #reckm .lbox {
      width: 100%; height: 100%; max-height: none; min-width: 0;
      border-radius: 0; padding: 12px 12px 0; overflow: hidden;
    }
    #trade .modalbody, #swap .modalbody, #bounty .modalbody, #forge .modalbody {
      flex: 1 1 auto; overflow-y: auto; overscroll-behavior-y: contain; padding-bottom: 12px;
    }
    #trade .modalbody > *, #swap .modalbody > *,
    #bounty .modalbody > *, #forge .modalbody > * { flex-shrink: 0; }
    #trade .bcols, #swap .bcols, #forge .bcols {
      flex: 0 0 auto; grid-template-columns: minmax(0, 1fr); overflow: visible;
      grid-auto-rows: max-content; align-content: start; padding-bottom: 0;
    }
    #trade .bcol, #swap .bcol, #forge .bcol { overflow: visible; min-height: 0; }
    #byboard { flex: 0 0 auto; overflow: visible; }
    #bench .bhead, #trade .bhead, #swap .bhead, #bounty .bhead, #forge .bhead,
    #mapm .lhead, #jrnl .lhead, #reckm .lhead { gap: 8px; }
    .bhead > div, .lhead > div { min-width: 0; overflow-wrap: anywhere; }
    #forge .bitem .takes { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); overflow-wrap: anywhere; }
    #mapbody { flex: 1 1 0; margin-bottom: 12px; }
    #mapwrap { height: 100%; }
    #jbody, #reckbody { overscroll-behavior-y: contain; overflow-wrap: anywhere; }
    #reckbody { grid-template-columns: minmax(0, 1fr); grid-auto-rows: max-content; align-content: start; }
    #vmodal { padding: 12px; height: var(--play-height, 100dvh); bottom: auto; }
    #vmodal .vbox { max-height: calc(var(--play-height, 100dvh) - 24px); overflow-y: auto; }
    #idpanel, #setpanel { max-height: calc(var(--play-height, 100dvh) - 60px); }
    #vminput, #idpanel input { font-size: 16px; }
    #idpanel .row { flex-wrap: wrap; }
    #dealreq { top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); max-height: calc(100dvh - 24px); overflow-y: auto; }
  }
  .signer-connect { border: 1px solid var(--border2); border-radius: 6px; padding: 12px; margin: 10px 0; max-width: 420px; white-space: normal; }
  .signer-connect p { margin: 8px 0; font-size: 13px; line-height: 1.5; }
  .signer-connect img { display: block; width: 220px; max-width: 100%; margin: 8px 0; }
  .signer-connect a, .signer-connect button { display: inline-block; border: 1px solid var(--border2); border-radius: 4px; background: var(--panel); color: var(--cream); font: inherit; font-size: 13px; padding: 8px 10px; margin: 4px 8px 4px 0; text-decoration: none; cursor: pointer; }
  .signer-connect a { color: var(--gold); }
  .signer-connect textarea { display: block; width: 100%; margin: 8px 0; background: var(--bg); color: var(--dim); border: 1px solid var(--border); font: inherit; font-size: 16px; resize: vertical; }
  /* Optional theme designs. Geometry and typography, no art filters. */
  #setpanel .setrow[hidden] { display: none; }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) {
    --design-ink: var(--panel);
    --design-rule: var(--border2);
    --design-pale: var(--cream);
    --design-page: var(--bg);
    --design-inset: var(--panel);
    --design-accent: var(--gold);
    --design-font: Georgia, "Times New Roman", serif;
    --design-radius: 0px;
    --design-arch: 30px 30px 0 0;
  }
  body[data-atmosphere="door"] {
    --design-ink: #141311; --design-rule: #777063; --design-pale: #ded6c4;
    --design-page: #191713; --design-inset: #1d1b17; --design-accent: #a69a82;
  }
  body[data-atmosphere="bone"] {
    --design-ink: #efe8d8; --design-rule: #998464; --design-pale: #33291e;
    --design-page: #e9e1cd; --design-inset: #e1d5bc; --design-accent: #866334;
    --design-arch: 2px; --design-radius: 2px;
  }
  body[data-atmosphere="moss"] {
    --design-ink: #111a14; --design-rule: #597158; --design-pale: #d4e2cb;
    --design-page: #0d1510; --design-inset: #19241a; --design-accent: #9eb77b;
    --design-arch: 24px 4px 24px 4px; --design-radius: 12px 2px 12px 2px;
  }
  body[data-atmosphere="abyss"] {
    --design-ink: #101724; --design-rule: #566d8c; --design-pale: #dce5f0;
    --design-page: #0c111b; --design-inset: #172236; --design-accent: #a3bddd;
    --design-arch: 0px; --design-radius: 0px;
  }
  body[data-atmosphere="ember"] {
    --design-ink: #1d120e; --design-rule: #916446; --design-pale: #efdaca;
    --design-page: #160e0b; --design-inset: #2b1b13; --design-accent: #e29b65;
    --design-arch: 4px; --design-radius: 4px;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) :is(#setpanel, #idpanel, .bbox, .lbox, .vbox, .signer-connect) {
    background: var(--design-ink);
    border: 1px solid var(--design-rule);
    border-radius: var(--design-radius);
    outline: 1px solid color-mix(in srgb, var(--design-rule) 33%, transparent);
    outline-offset: -5px;
    box-shadow: 0 14px 32px #0009;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) :is(#bar, #inputline, #chips) {
    background: var(--design-ink);
    border-color: var(--design-rule);
    box-shadow: none;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #idbtn { color: var(--design-pale); }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #bar .brand {
    font-family: var(--design-font);
    letter-spacing: .22em;
    color: var(--design-pale);
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) :is(#btitle, #maptitle, #jtitle, #setpanel > .lbl, #idpanel .lbl) {
    font-family: var(--design-font);
    font-weight: normal;
    letter-spacing: .12em;
    color: var(--design-pale);
    text-transform: uppercase;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) :is(#btitle, #maptitle, #jtitle) { font-size: 18px; }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #setpanel > .lbl {
    text-align: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--design-rule);
    font-size: 13px;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) :is(#setpanel button, #idpanel button, .bbox button, .lbox button, #chips button) {
    border-radius: var(--design-radius);
    background-image: none;
    box-shadow: none;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #log {
    background: var(--design-page);
    scrollbar-color: var(--design-rule) var(--design-page);
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #log .head {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--design-font);
    font-weight: normal;
    font-size: 20px;
    letter-spacing: .06em;
    color: var(--gold);
    margin: 14px 0 8px;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #log .head::before {
    content: "";
    width: 6px;
    height: 6px;
    flex: 0 0 6px;
    border: 1px solid var(--design-accent);
    transform: rotate(45deg);
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #log .head::after {
    content: "";
    flex: 1 1 20px;
    min-width: 12px;
    height: 1px;
    background: color-mix(in srgb, var(--design-rule) 44%, transparent);
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #bench .bcol {
    background: var(--design-page);
    border: 1px solid var(--design-rule);
    border-radius: var(--design-arch);
    padding-top: 14px;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #bench .bcolh {
    justify-content: center;
    text-align: center;
    font-family: var(--design-font);
    color: var(--design-pale);
    border-bottom: 1px solid var(--design-rule);
    padding-bottom: 10px;
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #bench .bitem { border-bottom-color: color-mix(in srgb, var(--design-rule) 25%, transparent); }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #bdoll {
    border-radius: var(--design-radius);
    background: var(--design-inset);
    border-color: var(--design-rule);
  }
  body[data-atmosphere]:where(:not([data-atmosphere=""])) #inputline .prompt { color: var(--design-pale); }
  body[data-atmosphere="bone"] #log .head { font-style: italic; }
  body[data-atmosphere="bone"] #log .head::after { height: 3px; background: none; border-block: 1px solid var(--design-rule); }
  body[data-atmosphere="moss"] #log .head::before { border-radius: 7px 0 7px 0; width: 9px; height: 9px; flex-basis: 9px; }
  body[data-atmosphere="abyss"] #log .head::before { transform: none; border-radius: 50%; }
  body[data-atmosphere="abyss"] #bench .bcolh { border-bottom-style: double; border-bottom-width: 3px; }
  body[data-atmosphere="ember"] #log .head::before { background: var(--design-accent); width: 5px; height: 5px; flex-basis: 5px; }
  body[data-atmosphere="ember"] #bench .bcolh { border-bottom-width: 2px; }
  body[data-atmosphere="custom"] {
    --design-font: var(--theme-font, Georgia, "Times New Roman", serif);
    --design-rule: color-mix(in srgb, var(--cream) 35%, var(--panel));
  }
  #roomframe { display: contents; }
  body[data-ornate]:where(:not([data-ornate=""])) #roomframe {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 8px;
    overflow: hidden;
  }
  body[data-ornate]:where(:not([data-ornate=""])) #roomframe #room { flex: 0 1 auto; }
  body[data-ornate]:where(:not([data-ornate=""])) #roomframe:not(:has(#room:empty))::before,
  body[data-ornate]:where(:not([data-ornate=""])) #roomframe:not(:has(#room:empty))::after {
    content: "";
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    background: var(--design-accent, var(--gold));
    mask: var(--ornament) center / contain no-repeat;
    pointer-events: none;
  }
  body[data-ornate]:where(:not([data-ornate=""])) #roomframe::after { transform: scaleX(-1); }
  @media (max-width: 520px) {
    body[data-ornate]:where(:not([data-ornate=""])) #roomframe { gap: 4px; }
    body[data-ornate]:where(:not([data-ornate=""])) #roomframe:not(:has(#room:empty))::before,
    body[data-ornate]:where(:not([data-ornate=""])) #roomframe:not(:has(#room:empty))::after { width: 12px; height: 12px; flex-basis: 12px; }
  }
  /* Decorative overlays never participate in layout or intercept taps. */
  body[data-ornate]:where(:not([data-ornate=""])) :is(.bbox, .lbox, .vbox, .signer-connect) { position: relative; }
  body[data-ornate]:where(:not([data-ornate=""])) :is(#setpanel, #idpanel, .bbox, .lbox, .vbox, .signer-connect)::after {
    content: "";
    position: absolute;
    inset: 2px;
    pointer-events: none;
    border-radius: inherit;
    background: var(--design-accent, var(--gold));
    opacity: .7;
    mask-image: var(--ornament), var(--ornament), var(--ornament), var(--ornament);
    mask-size: 14px 14px;
    mask-position: left top, right top, left bottom, right bottom;
    mask-repeat: no-repeat;
  }
  body[data-ornate="door"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M5%2025V15Q5%207%2015%202Q25%207%2025%2015V25M9%2025V16Q9%2010%2015%206Q21%2010%2021%2016V25M3%2026H27%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="bone"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M3%2012V3H12M18%203H27V12M27%2018V27H18M12%2027H3V18M8%208H22V22H8Z%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="moss"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M5%2025L25%205M8%2022V14M8%2022H16M15%2015V6M15%2015H24M22%208V3M22%208H27%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="abyss"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M15%202L28%2015L15%2028L2%2015ZM15%208L22%2015L15%2022L8%2015ZM15%202V8M28%2015H22M15%2028V22M2%2015H8%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="ember"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2215%22%20r%3D%229%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2215%22%20r%3D%223%22%2F%3E%3Cpath%20d%3D%22M15%202V6M24%2015H28M15%2024V28M2%2015H6%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="custom"] { --ornament: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M4%2012V4H12M18%204H26V12M26%2018V26H18M12%2026H4V18%22%2F%3E%3C%2Fsvg%3E"); }
  body[data-ornate="door"] :is(.bbox, .lbox, .vbox)::after {
    mask-image: var(--ornament), var(--ornament), var(--ornament), var(--ornament), var(--ornament);
    mask-size: 14px 14px, 14px 14px, 14px 14px, 14px 14px, 22px 22px;
    mask-position: left top, right top, left bottom, right bottom, center top;
  }
  /* The first walk owns the log until the player finishes or skips it. */
  body[data-tutorial="on"] #log > :not(.guide-step) { display: none; }
  body[data-tutorial="on"] :is(#scene, #sky, #mobs, #loggrip, #chips) { display: none; }
  body[data-tutorial="on"] #log {
    flex: 1 1 auto !important;
    height: auto !important;
    min-height: 0;
    margin-top: 0 !important;
    background: var(--bg);
    transition: none;
  }
  #log .guide-step { max-width: 64ch; white-space: pre-wrap; }
  #log button.guide-step {
    color: var(--cream); background: var(--panel); border: 1px solid var(--gold);
    font: inherit; padding: 8px 14px; margin-top: 14px; cursor: pointer;
  }
  #phone-send, #phone-done { display: none; }
  #chips .chip-dirs, #chips .chip-actions { display: contents; }
  #chips .chip-dirs button:disabled { display: none; }
  #cmd { min-width: 0; }
  @media (pointer: coarse) and (max-width: 1000px), (max-width: 680px) {
    html, body { overflow: hidden; overscroll-behavior: none; }
    /* Anchor the entire game, including fixed scene/modal layers, to the
       visible viewport. Safari can pan that viewport when an input focuses. */
    body { position: fixed; top: var(--play-top, 0px); left: 0; width: 100%; height: var(--play-height, 100dvh); transform: translateZ(0); --picth: calc(var(--play-height, 100dvh) - var(--botth)); }
    #bar { gap: 8px; padding: calc(8px + env(safe-area-inset-top, 0px)) max(10px, env(safe-area-inset-right, 0px)) 8px max(10px, env(safe-area-inset-left, 0px)); }
    #chips {
      display: flex; flex-direction: column; gap: 6px;
      padding: 6px max(10px, env(safe-area-inset-right, 0px)) 6px max(10px, env(safe-area-inset-left, 0px));
    }
    #chips:empty { display: none; }
    #chips .chip-dirs { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
    #chips .chip-dirs button { padding: 5px 0; min-width: 0; }
    #chips .chip-dirs button:disabled { display: block; opacity: .3; cursor: default; }
    #chips .chip-actions { display: flex; flex-wrap: wrap; gap: 8px; max-height: min(20dvh, 148px); overflow-y: auto; overscroll-behavior-y: contain; align-content: start; }
    #chips .chip-actions:empty { display: none; }
    #chips .chip-actions button { max-width: 100%; white-space: normal; text-align: left; overflow-wrap: anywhere; padding: 5px 9px; font-size: 13px; }
    #phone-send, #phone-done { color: var(--bone); background: transparent; border: 1px solid var(--border); border-radius: 4px; font: inherit; font-size: 12px; padding: 5px 8px; }
    #inputline { align-items: center; gap: 6px; padding: 7px max(10px, env(safe-area-inset-right, 0px)) calc(7px + env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px)); }
    #phone-send { display: block; }
    body.command-focus #phone-done { display: block; }
    #log { overscroll-behavior-y: contain; }
    body[data-view="image"] { --logh: min(calc(var(--play-height, 100dvh) * .25), 180px); }
    body[data-view="image"][data-log="big"] #log { height: min(55dvh, calc(var(--play-height, 100dvh) - 220px)); margin-top: calc(var(--logh) - min(55dvh, calc(var(--play-height, 100dvh) - 220px))); }
    body[data-view="image"][data-log="big"] #loggrip { transform: translateY(calc(var(--logh) - min(55dvh, calc(var(--play-height, 100dvh) - 220px)))); }
    body.command-focus #inputline { transform: translateY(calc(-1 * var(--keyboard-cover, 0px))); z-index: 3; }
  }

</style>
</head>
<body>
  <script>/* Before paint, so a picture-mode player never sees the text layout
    flash past. Wrapped because a locked-down browser throws on storage. */
    try { document.body.setAttribute("data-view",
      localStorage.getItem("nomad_view") === "image" && localStorage.getItem("nomad_art") === "1"
        ? "image" : "text"); } catch (e) {}</script>
  <div id="bar">
    <span class="brand" id="brand" title="settings">NOMAD<span class="caret">&#9662;</span></span>
    <span id="roomframe"><span id="room"></span></span>
    <span id="rightbar"><span id="fx"></span><span id="idbtn"><span id="hp">keys</span> <span class="caret">&#9662;</span></span></span>
  </div>
  <div id="threshold">
    <div id="thr-title">NOMAD</div>
    <div id="thr-line">a shared dungeon, alive whether or not anyone is watching</div>
    <button id="thr-enter" type="button">enter</button>
    <button id="thr-reck" type="button">the reckoning</button>
    <div id="thr-help">first time? <a id="thr-guide" href="/guide">how it works</a></div>
  </div>
  <div id="reckm" role="dialog" aria-modal="true" aria-labelledby="recktitle">
    <div class="lbox">
      <div class="lhead">
        <div>
          <div id="recktitle">The reckoning</div>
          <div id="recksub">Wanderers who entered the boards. Nobody appears here without asking to.</div>
        </div>
        <button id="reckclose" type="button">close</button>
      </div>
      <div id="reckbody"></div>
    </div>
  </div>
  <div id="setpanel">
    <span class="lbl">SETTINGS</span>
    <div class="setrow"><span>what is NOMAD</span><button id="aboutbtn">read</button></div>
    <div class="setrow"><span>sound</span><button id="sndbtn">off</button></div>
    <div class="setrow"><span>theme</span><button id="thbtn">door</button></div>
    <div class="setrow" id="dooratmorow"><span>theme design</span><button id="dooratmobtn" type="button" role="switch" aria-label="Enhanced theme design" aria-checked="false">off</button></div>
    <div class="setrow"><span>ornate borders</span><button id="ornatebtn" type="button" role="switch" aria-label="Ornate borders" aria-checked="false">off</button></div>
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
      <span class="note" id="gnote">Your key, sealed in a vault in your own Drive and opened by a PIN only you know. Sign in on any device to return.</span>
    </div>
    <div class="sect" id="sectown">
      <span class="lbl">USE YOUR OWN KEYS</span>
      <div class="row">
        <button id="idext">extension</button>
        <button id="idconn">signer</button>
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
  <div id="dealreq">
    <div id="drtext"></div>
    <div id="dracts"></div>
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
      <div class="bbody">
        <div id="bnote" role="status"></div>
        <button id="bgear" type="button" aria-expanded="false" aria-controls="bdoll">Show equipment &amp; stats</button>
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
          <div class="bcol" id="bshelf"></div>
        </div>
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
      <div class="modalbody">
        <div id="tnote"></div>
        <div id="twant"></div>
        <div class="bcols">
          <div class="bcol" id="tstock"></div>
          <div class="bcol" id="tgoods"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="swap">
    <div class="bbox">
      <div class="bhead">
        <div>
          <div id="swtitle">Striking a deal</div>
          <div id="swsub">Item for item &#8212; there's no coin here. Either side changing the table un-shakes both hands.</div>
        </div>
        <button id="swclose">wave it off</button>
      </div>
      <div class="modalbody">
        <div id="swnote"></div>
        <div id="swconfirm"></div>
        <div class="bcols">
          <div class="bcol" id="swpack"></div>
          <div class="bcol" id="swmine"></div>
          <div class="bcol" id="swtheirs"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="bounty">
    <div class="bbox">
      <div class="bhead">
        <div>
          <div id="bytitle">The keeper's bounty board</div>
          <div id="bysub">Trophies in, meals out &#8212; food the keeper never puts on the shelves, from a counter that doesn't sell out. The board turns over every hour or so.</div>
        </div>
        <button id="byclose">step back out</button>
      </div>
      <div class="modalbody">
        <div id="bynote"></div>
        <div id="byboard"></div>
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
      <div class="modalbody">
        <div id="fnote"></div>
        <div id="fhave"></div>
        <div class="bcols">
          <div class="bcol" id="frecipes"></div>
          <div class="bcol" id="fread"></div>
        </div>
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
  <div id="sky" aria-hidden="true"></div>
  <div id="scene" aria-hidden="true"></div>
  <div id="mobs" aria-hidden="true"></div>
  <canvas id="weather-particles" aria-hidden="true"></canvas>
  <button id="loggrip" type="button" aria-expanded="false" title="more of the log">▲</button>
  <div id="log"></div>
  <div id="chips"></div>
  <div id="inputline">
    <span class="prompt">&#9656;</span>
    <input id="cmd" type="search" name="q" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" aria-label="Game command" placeholder="Type a command…">
    <button id="phone-send" type="button">Send</button>
    <button id="phone-done" type="button" aria-label="Dismiss keyboard">Done</button>
  </div>
<script src="https://accounts.google.com/gsi/client" async></script>
<script type="module">
// Our own copy, served by this same worker (/nostr.js) — never a public CDN.
// generateSecretKey mints the key that IS the player's account; code that does
// that cannot come from a third party's server. See src/nostr-entry.mjs.
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent, nip19 } from "/nostr.js";

// "Continue with Google" — the dungeon keeps your key backed up to your Google
// account (server-side, sealed). Injected at serve time; public by design.
var GOOGLE_CLIENT_ID = "__GOOGLE_CLIENT_ID__";
// Picker API key for the Drive vault (public, referrer-restricted).
var GOOGLE_PICKER_KEY = "__GOOGLE_PICKER_KEY__";

var log = document.getElementById("log");
var cmd = document.getElementById("cmd");
var roomEl = document.getElementById("room");
var lastRoomName = ""; // the room the bar last named, for the chip-fold test
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
  resting:  { label: "resting",  cls: "fx-heal" },
  "guard-down": { label: "guard down", cls: "fx-warn" },
  // Kit going. One pill for the worst piece you have on: gold, then blood.
  // The bench's figure names which piece; this only says to go and look.
  "kit-worn":    { label: "kit worn",    cls: "fx-wear" },
  "kit-failing": { label: "kit failing", cls: "fx-blood" }
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
  // A locked chest pops gold (loot waiting); a sprung, empty one recedes (spent husk).
  // Doubled backslashes (2026-08-20): a lone \\. inside the PAGE template is
  // consumed by the template parser, so the served regex was /…locked./ and the
  // dot matched any character ("locked up" classed as loot, "sprung and empty!"
  // classed as dim).
  if (/ sits here, locked\\./.test(s)) return "loot";
  if (/ sits here, sprung and empty\\./.test(s)) return "dim";
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
// NOTHING STARTS OR STOPS AT FULL GAIN (rome, 2026-08-07: "the speakers pop").
//
// A waveform cut off at non-zero amplitude is a step change, and a step change
// is what a speaker cone reproduces as a CLICK. The 39Hz heartbeat was the
// worst of it: a low sine chopped mid-cycle is close to a pure DC jump, which
// is the loudest pop a browser can make. Both the bed and the heartbeat used to
// start at their working gain and be killed with a bare .stop().
//
// So every start ramps in and every stop ramps out. AMB_FADE is short enough
// that toggling sound still feels instant and long enough (250ms is ~10 cycles
// of the heartbeat) to land on silence rather than on an edge.
var AMB_FADE = 0.25;
function fadeGain(ctx, param, to, secs) {
  if (!ctx || !param) return;
  try {
    var t = ctx.currentTime;
    param.cancelScheduledValues(t);
    // Anchor at the CURRENT value first, or the ramp starts from whatever was
    // last scheduled and jumps — a pop cure that causes a pop.
    param.setValueAtTime(param.value, t);
    // Linear, not exponential: exponential can never reach zero, and "almost
    // silent" is still a step when the node stops.
    param.linearRampToValueAtTime(to, t + secs);
  } catch (e) {}
}
function startAmb() {
  if (ambNodes || !actx) return;
  var src = actx.createBufferSource();
  src.buffer = SND._noise(); src.loop = true;
  var f = actx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 140;
  var g = actx.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(aout());
  src.start();
  fadeGain(actx, g.gain, 0.028, AMB_FADE);
  var o = actx.createOscillator(); o.frequency.value = 39;
  var og = actx.createGain(); og.gain.value = 0;
  var lfo = actx.createOscillator(); lfo.frequency.value = 0.11;
  var lg = actx.createGain(); lg.gain.value = 0.008;
  lfo.connect(lg); lg.connect(og.gain);
  o.connect(og); og.connect(aout());
  o.start(); lfo.start();
  fadeGain(actx, og.gain, 0.017, AMB_FADE);
  // Gains kept alongside the sources: the stop needs something to ride down.
  ambNodes = { srcs: [src, o, lfo], gains: [g, og] };
}
function stopAmb() {
  if (!ambNodes) return;
  var dying = ambNodes;
  ambNodes = null;
  for (var i = 0; i < dying.gains.length; i++) fadeGain(actx, dying.gains[i].gain, 0, AMB_FADE);
  // Stop only once the ramp has actually reached zero. Stopping on the same
  // beat as the fade is exactly the hard cut this is here to avoid.
  setTimeout(function () {
    for (var j = 0; j < dying.srcs.length; j++) { try { dying.srcs[j].stop(); } catch (e) {} }
  }, AMB_FADE * 1000 + 60);
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
  if (c === "lore") return "scratch"; // a telling keeps the knowledge channel's voice
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
    || (bountyEl && bountyEl.classList.contains("open"))
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
// Drop every rarity marker from a line, leaving the bare prose — for anything
// that READS a line rather than paints it (classify, the sound picker, a
// clipboard copy). Painting is the only place the marker means anything.
function stripRarity(s) {
  return String(s).replace(/\u0001[a-z]+\u0001([^\u0002]*)\u0002/g, "$1");
}
// The rarity marker maps a tier string to its CSS class.
function rarityClass(r) {
  return r === "uncommon" ? "r-uncommon" : r === "rare" ? "r-rare"
    : r === "epic" ? "r-epic" : r === "legendary" ? "r-legendary" : "r-common";
}
// ONE law for a name drawn inside a modal, wherever it is drawn: gear wears its
// tier, nothing else does. The test is a TRUTHY slot, because a row that ships
// without the field at all (an older frame) must read as "not gear" rather than
// colour every ration on the shelf, which a not-equal-empty-string test would
// have done for undefined. The loose rock is slotted and is not gear.
function gearNameSpan(name, rarity, slot) {
  var s = document.createElement("span");
  s.textContent = name;
  if (rarity && slot && String(name).indexOf("loose rock") === -1) s.className = rarityClass(rarity);
  return s;
}
// Paint a line that carries one or more rarity markers, ANYWHERE in it. The
// server wraps a gear name as \u0001<rarity>\u0001<name>\u0002; everything
// between markers is ordinary prose. Scanning rather than anchoring is the
// whole point: "The raven fetches A RUSTED SWORD from its nest" puts the name
// mid-sentence, and an anchored parser left the raw control characters sitting
// in the text. Nobody writing the next line should have to remember to lead
// with the item. Returns false when the line holds no marker at all, so the
// speech painter below can have it.
function paintRarity(el, text) {
  var s = String(text);
  if (s.indexOf("\u0001") === -1) return false;
  var re = /\u0001([a-z]+)\u0001([^\u0002]*)\u0002/g;
  var at = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > at) el.appendChild(document.createTextNode(s.slice(at, m.index)));
    var rn = document.createElement("span");
    rn.textContent = m[2];
    rn.className = rarityClass(m[1]);
    el.appendChild(rn);
    at = m.index + m[0].length;
  }
  if (at < s.length) el.appendChild(document.createTextNode(s.slice(at)));
  return true;
}
// A MODAL'S NOTE LINE IS PROSE FROM THE SERVER AND MAY NAME GEAR.
//
// The log paints rarity markers and the modals did not: every note was set with
// .textContent, so \u0001uncommon\u0001a horseman's pick\u0002 went to the
// screen as three tofu boxes with the word "uncommon" sitting in the middle of
// the sentence. Reported at the keeper's hatch, where it is worst - the line
// that tells you what you just bought is the one that names it.
//
// Two of the five notes can hold a marker today (the hatch's settle line, built
// from gearName, and the forge's "comes off the bench"). All five go through
// here anyway: a note that carries no marker paints as plain text at no cost,
// and the next person to put an item name in a note does not have to know this
// rule exists.
function setNote(el, text) {
  el.textContent = "";
  var t = String(text || "");
  if (!t) return;
  if (!paintRarity(el, t)) el.textContent = t;
}
function paintVoice(el, text, cls, who, pk) {
  if (paintRarity(el, text)) return;
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
  // Scrolling only follows when the reader is already at the bottom — an old
  // log being read must not yank itself down for every feed line that lands.
  var stick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  for (var i = 0; i < lines.length; i++) {
    var div = document.createElement("div");
    // classify and the sound picker read the PLAIN line: a rarity marker is
    // painting, not content, and a control character in the middle of a phrase
    // must never change which class or which sound a line gets.
    var plain = lines[i].indexOf("\u0001") === -1 ? lines[i] : stripRarity(lines[i]);
    var c = cls || classify(plain);
    if (c) div.className = c;
    paintVoice(div, lines[i], c, who, pk);
    log.appendChild(div);
    // A person spoke or moved while you're in a modal: float it over the top.
    if (c === "say" || c === "tell" || c === "who") modalChatPush(lines[i], c, who, pk);
    if (soundOn && actx && cls !== "sys" && cls !== "echo") {
      var s = sndFor(plain, c || "");
      if (s) sounds.push(s);
    }
  }
  playSounds(sounds);
  if (stick) log.scrollTop = log.scrollHeight;
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
var BUNKER_RELAYS = ["wss://relay.powr.build", "wss://relay.nsec.app", "wss://relay.primal.net", "wss://nos.lol", "wss://nostr.mom"];
var bunkerClient = null;
async function makeBunkerClient() {
  if (!globalThis.__nip44mod) {
    globalThis.__nip44mod = (await import("/nostr.js")).nip44;
  }
  var mod = await import("/nip46-bunker.js");
  return new mod.BunkerClient({
    NostrTools: { generateSecretKey: generateSecretKey, getPublicKey: getPublicKey, finalizeEvent: finalizeEvent, verifyEvent: verifyEvent },
    appName: "NOMAD",
    appUrl: location.origin,
    perms: "get_public_key,sign_event:27235,sign_event:24913,sign_event:24914,sign_event:24915,nip44_encrypt,nip44_decrypt",
    relays: BUNKER_RELAYS,
    storageKey: "nomad_bunker_session",
    sessionMaxAge: 30 * 24 * 3600 * 1000,
    heartbeatMs: 0,
    // Only a verified, bound signer response can request an approval page.
    // The client requires HTTPS; show the destination before opening it.
    onAuthUrl: function (url) {
      var host = url;
      try { host = new URL(url).host; } catch (e) {}
      print("\\u2014 your signer wants to open " + host + " to approve this \\u2014", "sys");
      if (confirm("Your signer is asking to open:\\n\\n" + host + "\\n\\nOpen it to approve the login?")) {
        window.open(url, "_blank", "noopener,noreferrer,width=600,height=700");
      } else {
        print("\\u2014 left it closed \\u2014", "sys");
      }
    },
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

async function fetchJson(url, opts, ms) {
  var res = await Promise.race([
    fetch(url, opts),
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error("the gate is slow to answer")); }, ms); }),
  ]);
  return await res.json();
}
async function login() {
  var epoch = identityEpoch;
  var ch = await fetchJson("/auth/challenge", { method: "POST" }, 8000);
  if (epoch !== identityEpoch) throw new Error("identity changed");
  var evt = { kind: 27235, created_at: Math.floor(Date.now()/1000), tags: [], content: ch.challenge };
  var ev;
  if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
  else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
  else ev = finalizeEvent(evt, sk);
  if (epoch !== identityEpoch) throw new Error("identity changed");
  var r = await fetchJson("/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: ev }) }, 8000);
  if (epoch !== identityEpoch) throw new Error("identity changed");
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
    var poolMod = await import("/nostr.js");
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
      var poolMod = await import("/nostr.js");
      gpubPool = new poolMod.SimplePool();
    }
    // A shout carries across rooms and rings the dinner bell (creatureNoise) \\u2014
    // it's already the loud, findable half of speech, so it rides the SAME
    // 15s hold as the arena feed (FEED_HOLD_MS below): published late enough
    // that it can't be read as a real-time tracker of where you are right now.
    // 'say' publishes nothing at all (dropped 2026-07-21); gatehouse talk stays
    // immediate \\u2014 sanctuary, no noise/tracking concern to hedge against.
    if (tag === "nomad-shout") setTimeout(function () { try { gpubPool.publish(SPEECH_RELAYS, ev); } catch (e) {} }, FEED_HOLD_MS);
    else gpubPool.publish(SPEECH_RELAYS, ev);
  } catch (e) {
    console.warn("[speech] publish failed:", e && e.message ? e.message : e);
  }
}

// Private words are encrypted BEFORE they leave this browser. The server
// resolves presence and forwards a signed ciphertext, never the words.
var TELL_KIND = 24915;
var nip44mod = null;
var pendingTells = new Map();
var identityEpoch = 0;
async function sealTo(pk, text) {
  if (method === "ext") {
    if (!window.nostr || !window.nostr.nip44) throw new Error("Your extension does not support encrypted private messages.");
    return await window.nostr.nip44.encrypt(pk, text);
  }
  if (method === "bunker") return await (await ensureBunkerClient()).nip44Encrypt(pk, text);
  if (!nip44mod) nip44mod = (await import("/nostr.js")).nip44;
  return nip44mod.v2.encrypt(text, nip44mod.v2.utils.getConversationKey(sk, pk));
}
function queuePrivateTell(text) {
  var m = /^(?:tell|whisper|quietly)(?:\\s|$)/i.exec(text);
  if (!m) return false;
  var parts = /^(?:tell|whisper|quietly)\\s+(\\S+)\\s+([\\s\\S]+)$/i.exec(text);
  if (!parts) { print("Tell who what? ('tell <name> <words>')", "sys"); return true; }
  if (!ws || ws.readyState !== 1) { print("Not connected.", "sys"); return true; }
  if (pendingTells.size >= 4) { print("Wait for your quiet words to arrive.", "sys"); return true; }
  var id = crypto.randomUUID();
  pendingTells.set(id, { text: parts[2].trim().slice(0, 240), epoch: identityEpoch, socket: ws });
  ws.send(JSON.stringify({ v: 0, t: "tell-key", id: id, who: parts[1] }));
  setTimeout(function () { if (pendingTells.delete(id)) print("Your quiet word timed out. Try again.", "sys"); }, 60000);
  return true;
}
async function sendPrivateTell(frame) {
  var pending = pendingTells.get(frame.id);
  if (!pending || pending.sending || pending.epoch !== identityEpoch || pending.socket !== ws) return;
  if (!/^[0-9a-f]{64}$/.test(frame.to)) return;
  pending.sending = true;
  try {
    var content = await sealTo(frame.to, pending.text);
    var template = { kind: TELL_KIND, created_at: Math.floor(Date.now()/1000), tags: [["p", frame.to], ["t", "nomad-tell"], ["enc", "nip44"], ["v", "0"]], content: content };
    var event;
    if (method === "ext") event = await window.nostr.signEvent(template);
    else if (method === "bunker") event = await (await ensureBunkerClient()).signEvent(template);
    else event = finalizeEvent(template, sk);
    if (pending.epoch !== identityEpoch || pending.socket !== ws || !pendingTells.has(frame.id)) return;
    if (!verifyEvent(event) || event.kind !== template.kind || event.content !== content || JSON.stringify(event.tags) !== JSON.stringify(template.tags)) throw new Error("The signer changed the message.");
    pending.event = event;
    ws.send(JSON.stringify({ v: 0, t: "sealed-tell", id: frame.id, event: event }));
  } catch (e) { pendingTells.delete(frame.id); print("Quiet word: " + verr(e), "sys"); }
}
async function publishSealedTell(event) {
  try {
    if (!gpubPool) gpubPool = new (await import("/nostr.js")).SimplePool();
    await Promise.allSettled(gpubPool.publish(SPEECH_RELAYS, event));
  } catch (e) { console.warn("[tell] relay delivery failed"); }
}
async function receivePrivateTell(frame) {
  var epoch = identityEpoch;
  try {
    var ev = frame.event;
    if (!ev || ev.kind !== TELL_KIND || typeof ev.content !== "string" || ev.content.length > 4096 || !verifyEvent(ev)) return;
    var ownPk = method === "ext" ? await window.nostr.getPublicKey() : method === "bunker" ? (await ensureBunkerClient()).userPubkey : getPublicKey(sk);
    if (!ev.tags.some(function (t) { return t[0] === "p" && t[1] === ownPk; })) return;
    var text;
    if (method === "ext") {
      if (!window.nostr.nip44) throw new Error("Your extension does not support private-message decryption.");
      text = await window.nostr.nip44.decrypt(ev.pubkey, ev.content);
    } else if (method === "bunker") text = await (await ensureBunkerClient()).nip44Decrypt(ev.pubkey, ev.content);
    else {
      if (!nip44mod) nip44mod = (await import("/nostr.js")).nip44;
      text = nip44mod.v2.decrypt(ev.content, nip44mod.v2.utils.getConversationKey(sk, ev.pubkey));
    }
    if (epoch === identityEpoch) print(frame.name + " leans in, close, and says quietly: " + String(text).slice(0, 240), "tell", frame.name, ev.pubkey);
  } catch (e) { print("Could not open that quiet word: " + verr(e), "sys"); }
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
    // PLAIN, AND NOW ACTUALLY PLAIN. The note above has always promised the
    // arena a readable content field, and the rarity marker was riding out
    // inside it anyway: the Colosseum drew three empty boxes through the middle
    // of every gear name, because U+0001 and U+0002 are tofu in a browser font
    // and not, as the marker's own comment assumed, quietly ignored. Stripped
    // at the boundary, so no caller upstream has to remember.
    var evt = {
      kind: FEED_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: tags,
      content: stripRarity(String(text)),
    };
    var ev;
    if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
    else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
    else ev = finalizeEvent(evt, sk);
    if (!gpubPool) {
      var poolMod = await import("/nostr.js");
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
// ---- THE CARD: the brag as a picture -------------------------------------
//
// A wall of text in a Nostr timeline is invisible. So the brag draws itself
// onto one of the door's own scenes and goes out as an IMAGE.
//
// WHY THIS IS AN UPLOAD AND NOT AN ATTACHMENT. A kind-1 note is a text field;
// there is no such thing as image bytes inside an event. Every photo you have
// ever seen on Nostr is a URL that the client fetched — Damus and Primal just
// hide the upload step. So we do exactly what they do: draw it here, put it on
// a Blossom server under the WANDERER'S OWN key, and carry the address. The
// reader never sees a link; their client fetches it and renders the picture.
//
// DRAWN IN THE BROWSER, on a canvas, which is the whole reason this needs no
// image library on the server. The scenes are served from our own origin, so
// the canvas never tucks tainted pixels and toBlob works.
// The card set is its OWN art (2026-08-07) — creature plates painted for this,
// not the door's wide backdrops, which keep their middle empty for a title.
var CARD_SCENES = ["whiteroe", "gaunt", "wolves", "nomad", "cavelion", "bear", "hyena", "crows", "broodrat", "king"];
var CARD_PX = 1080;

function cardScene() {
  return CARD_SCENES[Math.floor(Math.random() * CARD_SCENES.length)];
}
function loadImg(src) {
  return new Promise(function (res, rej) {
    var im = new Image();
    im.onload = function () { res(im); };
    im.onerror = rej;
    im.src = src;
  });
}
// Cover-crop: the scenes are landscape and the card is square, so take the
// middle rather than squashing somebody's face into a box.
function drawCover(ctx, im, w, h) {
  var s = Math.max(w / im.width, h / im.height);
  var dw = im.width * s, dh = im.height * s;
  ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
// Drawing and encoding are separate on purpose: the drawing half has to be
// runnable against any canvas (the preview harness paints straight to a visible
// one), and only the encoding half can taint.
// A LEDGER FIGURE THAT CANNOT OUTGROW ITS CELL. Kills only ever go up, so any
// layout with a fixed-width slot is a layout with a breaking point in it. Under
// six digits the number is printed whole, the way it reads in game; above that
// it compacts, so the longest string this can ever return is five characters
// (9007T at the top of what a JS integer holds) — a bound, not a bet.
function cardNum(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  if (n < 100000) return String(n);
  var u = [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]];
  for (var i = 0; i < u.length; i++) {
    if (n >= u[i][1]) {
      var v = n / u[i][1];
      return (v < 10 ? v.toFixed(1).replace(/\\.0$/, "") : String(Math.floor(v))) + u[i][0];
    }
  }
  return String(n);
}
async function drawCardTo(ctx, card, W) {
  ctx.fillStyle = "#16120c";
  ctx.fillRect(0, 0, W, W);
  try { drawCover(ctx, await loadImg("/card-bg/" + cardScene() + ".jpg?v=" + CARD_V), W, W); } catch (e) {}

  // THE PAINTINGS DECIDE THE LAYOUT, not the other way round. Every one of the
  // card scenes is composed the same way — a dark top third, the subject low
  // and centre, a busy floor. So all the type lives in the top band where the
  // canvas is already black, and the bottom two-thirds are left to the picture.
  // The first cut ran the ledger down the middle of the card and put the
  // figures across the deer's flank and the wolves' faces.
  var top = ctx.createLinearGradient(0, 0, 0, W * 0.54);
  top.addColorStop(0, "rgba(22,18,12,.94)");
  top.addColorStop(0.55, "rgba(22,18,12,.84)");
  top.addColorStop(1, "rgba(22,18,12,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, W * 0.54);
  // Just enough at the foot to seat the mark; the art keeps the rest.
  var bot = ctx.createLinearGradient(0, W * 0.86, 0, W);
  bot.addColorStop(0, "rgba(22,18,12,0)");
  bot.addColorStop(1, "rgba(22,18,12,.86)");
  ctx.fillStyle = bot;
  ctx.fillRect(0, W * 0.86, W, W * 0.14);

  var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  var M = 84; // margin
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = "#d8a94e";
  ctx.font = "700 30px " + MONO;
  ctx.letterSpacing = "10px";
  ctx.fillText("NOMAD", M, 96);
  ctx.letterSpacing = "0px";

  // Shrink to fit rather than clip: names run to sixteen characters. The floor
  // is 36px so the name never shrinks into the furniture — and below that floor
  // it gets cut with an ellipsis, because a claimed kind-0 name is whatever its
  // owner typed and the shrink alone would happily draw it off both edges.
  ctx.fillStyle = "#ede3cc";
  var nm = String(card.name || "");
  var size = 84;
  do { ctx.font = "700 " + size + "px " + MONO; size -= 4; }
  while (size > 36 && ctx.measureText(nm).width > W - M * 2);
  while (nm.length > 1 && ctx.measureText(nm).width > W - M * 2) nm = nm.slice(0, -2) + "…";
  ctx.fillText(nm, M, 204);

  ctx.fillStyle = "#9a8b66";
  ctx.font = "400 23px " + MONO;
  ctx.fillText(card.days === 0 ? "born this very day"
    : card.days === 1 ? "one day under this name"
    : card.days + " days under this name", M, 248);

  // The ledger as a strip of four: figure over label, evenly spaced. Compact
  // enough to stay inside the dark band, and it reads at thumbnail size, which
  // a column of prose rows never did.
  var cells = [
    [cardNum(card.kills), "KILLS"],
    [cardNum(card.bosses), "KINGS"],
    [cardNum(card.pvp), "BLOOD"],
    [cardNum(card.deaths), "DEATHS"]
  ];
  var span = (W - M * 2) / cells.length;
  // Belt and braces: one size shared by all four figures, fitted to the widest.
  // Compaction alone keeps them short, but the strip is measured, not assumed —
  // and it must be ONE size, since four figures at four sizes would read worse
  // than a collision. Nothing under six digits moves off 54px.
  ctx.font = "700 54px " + MONO;
  var wmax = 1;
  for (var i = 0; i < cells.length; i++) wmax = Math.max(wmax, ctx.measureText(cells[i][0]).width);
  var numSize = Math.max(28, Math.min(54, Math.floor(54 * (span - 28) / wmax)));
  ctx.textAlign = "center";
  for (var i = 0; i < cells.length; i++) {
    var cx = M + span * i + span / 2;
    ctx.fillStyle = "#d8a94e";
    ctx.font = "700 " + numSize + "px " + MONO;
    ctx.fillText(cells[i][0], cx, 356);
    ctx.fillStyle = "#9a8b66";
    ctx.font = "400 17px " + MONO;
    ctx.letterSpacing = "3px";
    ctx.fillText(cells[i][1], cx, 390);
    ctx.letterSpacing = "0px";
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#c9bda3";
  ctx.font = "400 23px " + MONO;
  ctx.fillText("nomadmud.com", M, W - 62);
  ctx.textAlign = "right";
  ctx.fillStyle = "#8a7a56";
  ctx.font = "400 20px " + MONO;
  ctx.fillText("the dead stay dead", W - M, W - 62);
  ctx.textAlign = "left";
}
async function buildCard(card) {
  var cv = document.createElement("canvas");
  cv.width = CARD_PX; cv.height = CARD_PX;
  await drawCardTo(cv.getContext("2d"), card, CARD_PX);
  return await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.92); });
}

// Blossom (BUD-02): PUT the bytes, authorised by a kind-24242 event signed with
// the wanderer's own key. Content-addressed — the server hands back a URL whose
// name is the SHA-256 of what we sent, so the picture cannot be swapped later.
// YOUR OWN SERVERS FIRST (BUD-03). A wanderer who uses Nostr already has a
// Blossom list configured in their client — kind 10063, a replaceable event of
// "server" tags — and their card belongs on THEIR hosts, not on whichever ones
// we happened to hardcode. So we look that up and put it in front; the list
// below is only what a brand-new key with no configuration falls back to.
//
// All three were verified to accept an anonymous key and serve the bytes back
// (2026-08-07). NOT cdn.satellite.earth: it answers 401 "blossom.upload
// required" without a paid account, so it could only ever cost a round trip.
var BLOSSOM_SERVERS = ["https://blossom.primal.net", "https://blossom.band", "https://nostr.download"];
var blossomMine = null; // cached per session; one lookup is enough
async function blossomServers() {
  if (blossomMine) return blossomMine;
  var mine = [];
  try {
    if (!gpubPool) {
      var poolMod = await import("/nostr.js");
      gpubPool = new poolMod.SimplePool();
    }
    var me = await currentIdentityPubkey(); // handles extension, bunker and local key
    if (!me) return BLOSSOM_SERVERS;
    // Short leash: the brag must not sit waiting on a relay that is having a
    // bad day. No answer inside two seconds and we just use the defaults.
    var ev = await Promise.race([
      gpubPool.get(SPEECH_RELAYS, { kinds: [10063], authors: [me] }),
      new Promise(function (r) { setTimeout(function () { r(null); }, 2000); })
    ]);
    if (ev && ev.tags) {
      for (var i = 0; i < ev.tags.length; i++) {
        var t = ev.tags[i];
        if (t[0] === "server" && typeof t[1] === "string" && t[1].indexOf("https://") === 0) {
          mine.push(t[1].replace(/\\/+$/, ""));
        }
      }
    }
  } catch (e) { /* no list, or no relay: the defaults are perfectly good */ }
  var seen = {}, out = [];
  for (var j = 0; j < mine.length + BLOSSOM_SERVERS.length; j++) {
    var srv = j < mine.length ? mine[j] : BLOSSOM_SERVERS[j - mine.length];
    if (seen[srv]) continue;
    seen[srv] = 1; out.push(srv);
  }
  blossomMine = out;
  return out;
}
function hex(buf) {
  var b = new Uint8Array(buf), out = "";
  for (var i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, "0");
  return out;
}
// btoa throws on anything above U+00FF; names are ASCII by the name rule, but a
// signer is not ours to make promises about, so encode properly.
function b64utf8(str) {
  var bytes = new TextEncoder().encode(str), bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function blossomUpload(blob) {
  var buf = await blob.arrayBuffer();
  var sha = hex(await crypto.subtle.digest("SHA-256", buf));
  var evt = {
    kind: 24242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["t", "upload"], ["x", sha], ["expiration", String(Math.floor(Date.now() / 1000) + 300)]],
    content: "NOMAD card"
  };
  var ev;
  if (method === "bunker") ev = await (await ensureBunkerClient()).signEvent(evt);
  else if (method === "ext" && window.nostr) ev = await window.nostr.signEvent(evt);
  else ev = finalizeEvent(evt, sk);
  var auth = "Nostr " + b64utf8(JSON.stringify(ev));
  var servers = await blossomServers();
  for (var i = 0; i < servers.length; i++) {
    try {
      var r = await fetch(servers[i] + "/upload", {
        method: "PUT", body: blob, headers: { Authorization: auth, "Content-Type": "image/jpeg" }
      });
      if (!r.ok) continue;
      var d = await r.json();
      if (d && d.url) return { url: d.url, sha: sha, size: buf.byteLength };
    } catch (e) { /* try the next host */ }
  }
  return null;
}

async function publishNote(text, atag, card, short, alt) {
  if (!text) return;
  try {
    var tags = [["t", "nomad"]];
    if (atag) tags.push(["a", atag]);
    // THE PICTURE IS BEST-EFFORT AND THE BRAG IS NOT. If the canvas, the
    // signer or every Blossom host fails, the note still goes out as the text
    // it has always been — a failed upload must never eat somebody's post.
    if (card) {
      try {
        var up = await blossomUpload(await buildCard(card));
        if (up) {
          // The card carries the tally now, so the note drops to its name line
          // and the numbers ride along as the image's alt text.
          text = (short || text).replace("\\n\\n#nomad", "\\n\\n" + up.url + "\\n\\n#nomad");
          // NIP-92: tells a client this URL IS the image, so it renders the
          // picture instead of printing the address.
          var im = ["imeta", "url " + up.url, "m image/jpeg", "x " + up.sha,
                    "size " + up.size, "dim " + CARD_PX + "x" + CARD_PX];
          if (alt) im.push("alt " + alt);
          tags.push(im);
        }
      } catch (e) { console.warn("[card] " + (e && e.message ? e.message : e)); }
    }
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
      var poolMod = await import("/nostr.js");
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
  var epoch = identityEpoch;
  fetchProfileName(pk).then(function (nm) {
    if (!nm || epoch !== identityEpoch) return;
    nameHint = nm;
    claimName(nm);
  });
}

function maybeAdoptProfileName(f) {
  var epoch = identityEpoch;
  if (profileTried) return;
  profileTried = true;
  // Guests get a silent lookup: a fresh-minted key has no kind-0, so nothing
  // happens and nothing prints. But a restored key (vault, pasted nsec) is a
  // real identity — if the relays know its name, the dungeon adopts it.
  var quiet = method !== "ext" && method !== "bunker";
  currentIdentityPubkey().then(function (pk) {
    if (epoch !== identityEpoch) return;
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
      if (epoch !== identityEpoch) return;
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
var openedAt = 0; // ms the last good socket opened; a wire that lived <5s must not reset the backoff
var pongTimer = null;
var probeWire = null;
var pendingLookAt = 0; // coalesce unsent look requests; never replay movement or combat
var lastDialAt = 0; // ms of the last dial attempt; wake events must not storm the gate
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
// A tab the server handed the body AWAY from. It is not "disconnected" and
// it must not behave like it: no retry chain, and no waking on focus. Only a
// reload takes the thread back, the same deliberate act it always was.
var stilled = false;
var connectingSince = 0; // when the in-flight handshake started, so a wedged
                         // one can be told from a slow one (see connect)
// ONE DIAL AT A TIME (2026-08-20): true from connect()'s first line until a
// socket opens (onopen) or a retry is scheduled (scheduleRetry). During the
// login/ticket prologue the 'ws' var is still null, so a focus/online event could
// re-enter connect() and dial a SECOND socket — and a stall-abandoned zombie
// whose handshake later completed server-side could displace the healthy wire
// (the server's one-body-per-soul close lands as 1000 "reconnected" on the
// LIVE socket, and this tab used to go still forever). The flag closes the
// prologue; the readyState===1 check closes the live-wire case.
var connecting = false;
var CONNECT_STALL_MS = 10000;
// WHO IS DIALLING, AND WHICH DIAL THIS IS. Minted once per page load and counted
// up per dial, sent to the server on every handshake. The server needs both to
// tell a real second window from THIS page's own abandoned handshake arriving
// late — a stalled dial is closed here, but the upgrade request it already sent
// cannot be recalled, and when it lands the server used to read it as another
// client and close the live wire out from under us. See the guard in zone's /ws.
var pageId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
var dialAttempt = 0;
var freshLoad = true;    // this page just loaded with an EMPTY scroll — the first connect must ask the server to repaint the room (fresh=1), or a fast refresh lands on a blank pane. A websocket reweave keeps its scroll and never sets this.

async function connect() {
  if (typeof guideActive === "function" && guideActive()) return;
  // The stilled tab never dials, whoever asks, and neither does a page whose
  // player has not crossed the threshold. Both guards sit on the door as well
  // as on wakeReconnect: the whole shape of this bug, twice now, has been a
  // second caller appearing later and not knowing the rules.
  if (stilled || !crossed) return;
  // A HANDSHAKE CAN HANG, AND THE OLD GUARD LET IT KILL THE LOOP. This used to
  // return flat when a connect was in flight, and scheduleRetry is only ever
  // called from onclose — so a socket stuck in CONNECTING (what a laptop that
  // slept with a half-open wire wakes up holding) meant onclose never fired,
  // every scheduled retry hit this line and scheduled nothing, and the reweave
  // chain was dead for good. The scroll then answered every command with 'not
  // connected' forever, with no way back but a reload.
  if (connecting) return;                    // one dial at a time (see the flag's note)
  if (ws && ws.readyState === 1) return;     // a live wire is already up — nothing to dial
  connecting = true;
  var epoch = identityEpoch;
  lastDialAt = Date.now();
  if (ws && ws.readyState === 0) {
    // Still plausibly opening: come back to it, but ALWAYS keep the chain alive.
    if (Date.now() - connectingSince < CONNECT_STALL_MS) { scheduleRetry(); return; }
    // Long past plausible: abandon it. Handlers are cleared first so this
    // corpse cannot fire onclose later and race a live socket.
    try { ws.onopen = null; ws.onclose = null; ws.onmessage = null; ws.onerror = null; ws.close(); } catch (e) {}
    ws = null;
  }
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
    try {
      token = await login();
      if (epoch !== identityEpoch) return;
      sessionToken = token;
    }
    catch (e) {
      if (epoch !== identityEpoch) return;
      // AN EXPIRED SIGNER SESSION IS NOT A NETWORK BLIP (2026-08-20). The old
      // catch retried everything forever: a dead bunker session threw "signer
      // session expired — use 'connect signer app' again", the retry loop
      // backed off to 15s and tried the same failing login for good — the
      // wanderer sat locked out of their own keys with no way in but a manual
      // pocket-key command. Expiry demotes to the pocket keys once, says so in
      // the signer's own words, and forgets the dead session.
      if (method === "bunker" && /signer session expired/i.test(String(e && e.message))) {
        print("— " + e.message + " —", "sys");
        try { localStorage.removeItem("nomad_bunker_session"); } catch (err) {}
        method = "guest";
        bunkerClient = null;
        return scheduleRetry();
      }
      print("— the gate does not answer (" + e.message + "); retrying —", "sys");
      return scheduleRetry();
    }
  }

  // A connection always needs a fresh, single-use ticket. Never put the
  // reusable session credential in a URL, including on a failed exchange.
  var wsAuth;
  try {
    var tr = await Promise.race([
      fetch("/auth/ticket", { method: "POST", headers: { authorization: "Bearer " + token } }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error("slow")); }, 8000); }),
    ]);
    if (epoch !== identityEpoch) return;
    if (tr.status === 401) sessionToken = null;
    if (!tr.ok) throw new Error("ticket refused");
    var tj = await tr.json();
    if (epoch !== identityEpoch) return;
    if (!tj || !tj.ticket) throw new Error("ticket missing");
    wsAuth = "ticket=" + encodeURIComponent(tj.ticket);
  } catch (e) { if (epoch === identityEpoch) return scheduleRetry(); else return; }

  var proto = location.protocol === "https:" ? "wss://" : "ws://";
  var opened = false;
  connectingSince = Date.now();
  // THIS socket, held locally, so its handlers can tell whether they are still
  // the live one. A close event can arrive LATE \u2014 a backgrounded tab on a
  // phone delivers it on resume, after wakeReconnect has already dialled again
  // \u2014 and every handler below mutates page-wide state. Without this, a dead
  // socket's late event speaks for the living one.
  var stallWatch = null;
  dialAttempt++;
  var sock = new WebSocket(proto + location.host + "/ws?" + wsAuth + (freshLoad ? "&fresh=1" : "")
    + "&tell=1&pid=" + encodeURIComponent(pageId) + "&att=" + dialAttempt);
  ws = sock;
  var mine = function () { return ws === sock && epoch === identityEpoch; };
  // A FIRST dial can hang in CONNECTING with no close event and nothing left
  // to re-enter connect() — the stall-abandon above only runs when the retry
  // chain is already armed. This watchdog is the first dial's own chain.
  stallWatch = setTimeout(function () {
    if (ws !== sock || sock.readyState !== 0) return;
    try { sock.onopen = null; sock.onclose = null; sock.onmessage = null; sock.onerror = null; sock.close(); } catch (e) {}
    ws = null;
    connecting = false;
    scheduleRetry();
  }, CONNECT_STALL_MS);

  ws.onopen = function () {
    if (!mine()) return;
    opened = true;
    connecting = false; // the wire is up — a wake event may dial again freely (the readyState===1 guard also holds)
    freshLoad = false; // the scroll is (being) painted now — any later reweave is a true seamless one
    failedOpens = 0;
    openedAt = Date.now(); // the backoff reset happens in scheduleRetry, once this wire has PROVED it can hold
    if (stallWatch) { clearTimeout(stallWatch); stallWatch = null; }
    if (frayTimer) { clearTimeout(frayTimer); frayTimer = null; }
    if (frayTold) { print("— the thread holds; you are back —", "sys"); frayTold = false; }
    clearInterval(hbTimer);
    clearTimeout(pongTimer); pongTimer = null;
    probeWire = function () {
      if (!mine() || sock.readyState !== 1 || pongTimer !== null) return;
      // Give a resumed tab a fresh probe, rather than judging time spent asleep.
      pongTimer = setTimeout(function () {
        pongTimer = null;
        if (!mine()) return;
        // A half-open TCP connection may never finish its close handshake.
        // Run recovery now and retire this socket before its late events arrive.
        sock.onclose({ code: 4000, reason: "heartbeat timeout" });
        ws = null;
        try { sock.close(4000, "heartbeat timeout"); } catch (e) {}
      }, 10000);
      try { sock.send("ping"); } catch (e) { /* the watchdog owns recovery */ }
    };
    hbTimer = setInterval(function () { if (probeWire) probeWire(); }, 25000);
    if (pendingLookAt && Date.now() - pendingLookAt <= 30000) {
      sock.send(JSON.stringify({ v: 0, t: "cmd", text: "look" }));
    }
    pendingLookAt = 0;
  };
  ws.onmessage = function (m) {
    if (!mine()) return;
    if (m.data === "pong") { clearTimeout(pongTimer); pongTimer = null; return; }
    var f; try { f = JSON.parse(m.data); } catch (e) { return; }
    // During the first walk the world holds its tongue: the feed (others'
    // deeds, sounds through walls) and the ambient weather stay out of the
    // lesson text. Other output stays in history, hidden by tutorial mode.
    if (f.kind === 24912) { if (guideActive() && f.cls === "amb") return; print(f.text, f.cls, f.who, f.sp); }
    else if (f.kind === 24913) { if (guideActive()) return; print(f.text, f.cls || "feed", f.who, f.sp); }
    else if (f.t === "status") {
      // A real room change is the only thing that should re-fold the chips
      // (rome, 2026-07-26): keyed on the suggest LIST before, so a mob simply
      // walking into your room — adding one chip — changed the key and
      // collapsed an expanded "+more" right when a fight might be starting.
      // Keyed on the room NAME, not on what the element reads \u2014 the bar now
      // carries the region too, and folding the chips every time that changed
      // would collapse a "+more" for a step that never left the room.
      if (f.room && f.room !== lastRoomName) chipsExpanded = false;
      lastRoomName = f.room || "";
      if (f.art) grantArt();
      paintScene(f.band, f.sky, f.terrain, f.room, f.torch, f.skyroll, f.place, f.sea, f.red, f.covered);
      roomEl.textContent = "";
      if (f.room) {
        roomEl.appendChild(document.createTextNode(f.room));
        if (f.region) {
          var rg = document.createElement("span");
          rg.className = "rrg";
          rg.textContent = " \u00b7 " + f.region;
          roomEl.appendChild(rg);
        }
      }
      paintWayHome();
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
      updateMobs(f.mobs, f.doing, f.dead);
      inGatehouseNow = !!f.gh; // in the tavern the input line is a mouth
      doorIsDen = f.door === "den"; // ...and on den ground the door is a house's
      // WHICH WAY THE DOOR IS, for the first walk only (see chips.sendCtx). The
      // server sends it every time; the client is what decides it is training
      // wheels, and takes them off the moment the guide is done. A wanderer past
      // the lessons reads the waystones like everybody else.
      wayHome = f.home || "";
      paintWayHome();
      renderChips(f.suggest, f.combat);
      updateGuideExits();
      if (f.build) checkBuild(f.build);
    } else if (f.t === "beat") {
      // A creature that swung shows its attack; one that was hit recoils. Both
      // are one-shot: they run once and drop back to whatever they were doing.
      mobBeat(f.swung, f.struck, f.died, f.fed, f.grazed);
    } else if (f.t === "bench") {
      if (f.open) { renderBench(f); } else closeBench();
    } else if (f.t === "trade") {
      if (f.open) renderTrade(f); else closeTrade();
    } else if (f.t === "forge") {
      if (f.open) renderForge(f); else closeForge();
    } else if (f.t === "bounty") {
      if (f.open) renderBounty(f); else closeBounty();
    } else if (f.t === "swap") {
      if (!f.open) closeSwap();
      else if (f.pending) renderDealReq(f);
      else renderSwap(f);
    } else if (f.t === "map") {
      renderMap(f);
    } else if (f.t === "journal") {
      renderJournal(f);
    } else if (f.t === "gpub") {
      publishSpeech(f.text, f.tag); // your words, your key, your signature
    } else if (f.t === "tell-key") {
      sendPrivateTell(f);
    } else if (f.t === "sealed-tell") {
      receivePrivateTell(f);
    } else if (f.t === "tell-sent" || f.t === "tell-error") {
      var pending = pendingTells.get(f.id);
      if (pending && pending.epoch === identityEpoch && pending.socket === ws) {
        print(f.t === "tell-sent" ? "You lean in to " + f.name + ": " + pending.text : f.error, f.t === "tell-sent" ? "tell" : "sys");
        pendingTells.delete(f.id);
        if (f.t === "tell-sent" && pending.event) publishSealedTell(pending.event);
      }
    } else if (f.t === "fpub") {
      publishFeed(f.room, f.text, f.fx);  // your deed, your key — the arena broadcast
    } else if (f.t === "npost") {
      publishNote(f.text, f.atag, f.card, f.short, f.alt);  // your brag, your key — a kind 1 in your own feed
    }
  };
  // The fray line names its cause: the close code (and reason, when the server
  // gave one) rides the message, so "it reweaves at random" reports carry data.
  // 1000 "reconnected" = you opened another tab/device (the server said so);
  // 1006 = the wire dropped without a goodbye (network blip, or the server's
  // whole DO aborted); 1001 = the far side went away cleanly.
  ws.onclose = function (e) {
    // A LATE EVENT FROM A SOCKET WE HAVE ALREADY REPLACED SPEAKS FOR NOBODY.
    // This is the bug the stilled flag shipped with (d7caa5b): a tab wakes,
    // wakeReconnect opens a new socket, the server closes the OLD one with
    // 1000 "reconnected" because a new connection arrived for that wanderer,
    // and the old socket's close then lands in this same page and sets stilled
    // \u2014 while the new socket is live and well. The tab looks fine until the
    // next drop, at which point connect() refuses and it is dead until reload.
    // Every branch below (stilled, the retry chain, the fray line, closing the
    // panels) belongs to the CURRENT wire only.
    if (!mine()) return;
    // EVERY panel goes with the wire, not just the four that were listed here
    // when the forge, the deal and the board didn't exist yet. A modal left
    // standing over a dead socket is a trap: its buttons send into nothing, and
    // there is no way out of it but a reload.
    clearInterval(hbTimer);
    clearTimeout(pongTimer); pongTimer = null; probeWire = null;
    closeBench(); closeTrade(); closeMap(); closeJournal(); closeForge(); closeBounty(); closeSwap();
    // You opened this wanderer in another tab or on another device: the server
    // hands the body over and closes THIS socket on purpose (1000 "reconnected").
    // Don't fight it — reconnecting here would yank the body back and forth.
    if (e && e.code === 1000 && e.reason === "reconnected") {
      print("— your spirit is called to another window; this one goes still. (type anything to call it back) —", "sys");
      ws = null;
      // AND IT STAYS STILL. Setting ws = null used to be enough, because the
      // only way back was the retry chain and this branch skips it. Then
      // wakeReconnect arrived (615b116, this morning) and reconnects on focus,
      // visibilitychange or online whenever there is no live socket, which is
      // EXACTLY the state a stilled tab sits in. So merely LOOKING at the old
      // tab yanked the body back, which stilled the new tab, whose own focus
      // event yanked it back again: two windows trading the body several times
      // a second, "goes still" and "take up the thread" alternating down the
      // scroll. This flag is the one thing that outranks a wake.
      pendingLookAt = 0;
      stilled = true;
      connecting = false; // this attempt is over, and none will follow it
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
  connecting = false; // the attempt that is abandoning its claim releases the dial
  // A wire that stayed up a while earns the fast retry; a socket that opens and
  // dies in a crash loop must NOT redial every few hundred ms forever.
  // The lifetime is SPENT here, once. Left standing, a single good wire's
  // openedAt keeps aging and every later retry reads "lived long, retry fast"
  // — which pins a real outage at 300ms forever: the exact storm this guards
  // against, inverted. One wire, one earned fast retry, then honest backoff.
  var lived = openedAt ? Date.now() - openedAt : 0;
  openedAt = 0;
  retryMs = lived > 5000 ? 300 : Math.min(retryMs * 2, 15000);
  setTimeout(connect, retryMs);
}

// THE SECOND WAY BACK. The retry chain is one path to recovery and it is now
// unkillable, but a machine waking from sleep should not have to wait out a
// 15-second backoff to notice the world is reachable again. The browser tells
// us: coming back online, the tab being looked at again, the window taking
// focus. Any of those, with no live socket, tries immediately and resets the
// backoff — so a lid opening reconnects in the time it takes to draw the page.
function wakeReconnect() {
  // NOBODY IS HERE YET. These listeners are bound at script load, and focus,
  // visibilitychange and online all fire perfectly well while the threshold
  // screen is still up \u2014 so clicking the window before you had come in
  // dialled the socket, built a session, and told the arena you had blinked
  // into being while you were still looking at the login art. crossThreshold
  // sets crossed before it calls connect, so its own call still gets through.
  if (!crossed) return;
  // The body is in another window; looking at this one must not steal it back.
  if (stilled) return;
  if (ws && ws.readyState === 1) {
    clearTimeout(pongTimer); pongTimer = null;
    if (probeWire) probeWire();
    return;
  }
  if (ws && ws.readyState === 0) return;
  if (Date.now() - lastDialAt < 5000) return; // a wake must not storm the gate
  retryMs = 300;
  connect();
}
window.addEventListener("online", wakeReconnect);
window.addEventListener("focus", wakeReconnect);
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) wakeReconnect();
});

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
  salvage: 1, scrap: 1, claim: 1, seal: 1, sheet: 1, publish: 1,
  map: 1, study: 1, journal: 1, rest: 1, sleep: 1, sit: 1, camp: 1,
  eat: 1, bandage: 1, bind: 1, equip: 1, wield: 1, wear: 1, remove: 1,
  unequip: 1, name: 1, rename: 1, smoke: 1, puff: 1,
  // The bones, and the words that reach them (2026-08-20): these were missing
  // from this table, so a typed 'roll'/'stand'/'dice' read as speech and got no
  // echo even though the server ran them as commands. 'keys'/'theme'/'login'
  // were LISTED here, which made the client echo them AND the server speak
  // them back — every such line printed twice. They are not server verbs:
  // 'keys' is handled locally below (localCmd), and the other two are just
  // words by the fire.
  // Exactly the three the server answers (dice/roll/stand). A word listed here
  // that the server does NOT know is worse than one missing: the client echoes
  // it as a command, the server reads it as speech and says it back, and the
  // line prints twice — which is the same fault as the keys/theme/login entries
  // above. 'bones', 'gamble', 'wager' and 'bet' are not verbs, and the last
  // three are things a person actually says at a fire.
  dice: 1, roll: 1, stand: 1,
  // The board. post/tear carry words so they must always read as commands;
  // board is bare-only and is listed in the no-arg table below as well.
  board: 1, noticeboard: 1, notices: 1,
  post: 1, pin: 1, notice: 1, tear: 1, rip: 1, unpin: 1,
  // carve was missing from this list entirely, so the gatehouse's own wall-chart
  // verb read as speech here and its echo was swallowed. The server has always
  // carved it; only the local echo was wrong.
  carve: 1, scratch: 1, etch: 1, inscribe: 1,
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
  board: 1, noticeboard: 1, notices: 1,
  // The bones, matching the server's GATEHOUSE_NOARG (2026-08-20): bare they
  // command, "stand up"/"roll with it" stay sentences at the fire. 'dice' is
  // deliberately NOT here — it carries a stake or a name.
  roll: 1, stand: 1,
};
var inGatehouseNow = false;
// Whether the 'in'/'out' the server is offering here is a den door rather than a
// gate. Set from the ctx frame before the chips render; old servers send no
// field, which reads false — the gatehouse wording, exactly as it was.
var doorIsDen = false;
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
  // Identify and consume private-key input before history, echo, or the wire.
  // The same parser handles casing and every whitespace spelling of login.
  var loginMatch = /^login(?:\\s+([\\s\\S]*))?$/i.exec(t);
  var bareSecret = /^(?:nsec1[a-z0-9]+|[0-9a-f]{64}|bunker:\\/\\/\\S+)$/i.test(t);
  if (loginMatch) {
    var arg = (loginMatch[1] || "").trim();
    var normalized = "login " + arg;
    if (!arg) { print("Use 'login extension', 'login signer', or paste your key.", "sys"); return; }
    localCmd(normalized);
    return;
  }
  if (bareSecret) { importKey(t); return; }
  if (/(?:nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}|\\b[0-9a-f]{64}\\b|bunker:\\/\\/\\S+)/i.test(t)) {
    print("That looks like a private key. Paste it on its own to sign in; it will not be sent.", "sys");
    return;
  }
  history.unshift(text); histAt = -1;
  if (guideCommand(t)) return;
  // Speech doesn't need an echo. The server answers every spoken line with
  // 'You say, "..."' \\u2014 so echoing the command first just prints the words twice
  // and buries the conversation in its own scaffolding. Commands still echo:
  // there, seeing exactly what you typed is the whole point.
  if (!isSpeech(t)) print("\\u25b8 " + text, "echo");
  if (localCmd(text)) return;
  if (queuePrivateTell(t)) return;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "cmd", text: text }));
  // A STILLED TAB IS NOT A DEAD ONE. The stilled flag outranks every AUTOMATIC wake —
  // focus, visibility, online — and must keep doing so: two windows trading the
  // body several times a second is the storm it was written to stop. A keystroke
  // is not a wake. It is the wanderer saying, deliberately, that they want the
  // body in this window, which is the one thing that was always allowed to move
  // it. Without this the flag is a one-way door: a single displacement costs a
  // reload, and the scroll with it — and a displacement can be spurious, which
  // is the whole reason the /ws staleness guard exists.
  else if (stilled) {
    stilled = false;
    if (/^(look|l)$/i.test(t)) pendingLookAt = Date.now();
    print("— you take the thread up again —", "sys");
    connect();
  }
  else {
    if (/^(look|l)$/i.test(t)) {
      if (!pendingLookAt) print("— reconnecting; looking when the thread holds —", "sys");
      pendingLookAt = Date.now();
    } else print("— reconnecting; command not sent —", "sys");
    wakeReconnect();
  }
}

// Identity commands never leave this page — the server has no business
// seeing a secret key.
function localCmd(text) {
  var t = text.trim(), lower = t.toLowerCase();
  if (lower === "login extension" || lower === "login ext") { loginExtension(); return true; }
  if (lower === "login signer" || lower === "login bunker") { connectSignerApp(); return true; }
  if (/^login(?:\\s|$)/i.test(t)) { importKey(t.replace(/^login\\s*/i, "")); return true; }
  if (lower === "logout") { logout(); return true; }
  // 'keys' shows the identity panel; 'keys reveal' shows the secret itself.
  // Both the server's welcome line and the panel's own help advertise these,
  // and until 2026-08-20 neither side had a handler — the server answered
  // "the dungeon doesn't understand" (or spoke the word back in the
  // gatehouse). The keys never leave this page: showKeys prints from the
  // in-memory key only.
  if (lower === "keys" || lower === "keys reveal") { showKeys(lower === "keys reveal"); return true; }
  // Quit: back out through the door to the threshold. A clean reload — keys
  // stay in the pocket, the world handles the vanishing (linkdead linger).
  // Bare words only: the server owns "leave <thing>" (it's a drop).
  //
  // INSIDE THE GATEHOUSE, 'exit'/'leave' are NOT quit — they are the server's
  // own door-out verb (parser: out/exit/outside → leaveGatehouse), and the
  // help says so ("out (exit) — back through the door, into the world").
  // Intercepting them here used to hard-reload the page instead, wiping the
  // scroll and re-triggering signer login (2026-08-20). They only mean quit
  // while you are actually out in the world.
  if (lower === "quit" || ((lower === "leave" || lower === "exit") && !inGatehouseNow)) {
    print("— you step back through the door —", "sys");
    setTimeout(function () { location.reload(); }, 400);
    return true;
  }
  if (lower === "tutorial off" || lower === "tutorial stop") { guideOff(); return true; }
  if (lower === "tutorial") { guideStart(); return true; } // the first walk, on demand — for anyone, any time
  return false;
}

function reconnect() {
  identityEpoch++;
  pendingLookAt = 0;
  clearTimeout(pongTimer); pongTimer = null; probeWire = null;
  pendingTells.clear();
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
  var previous = ws;
  ws = null;
  connecting = false;
  stilled = false;
  clearInterval(hbTimer);
  try { if (previous) previous.close(); } catch (e) {}
  connect();
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
  try { getPublicKey(fromHex(hex)); } catch (e) { print("That key is outside the valid key range.", "sys"); return false; }
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
var pendingSignerCard = null;
var pendingBunker = null; // a BunkerClient still waiting for its signer
var identityChoice = 0; // invalidates asynchronous identity choices, even before reconnect
function cancelPendingBunker() {
  identityChoice++;
  if (pendingSignerCard) { pendingSignerCard.remove(); pendingSignerCard = null; }
  if (!pendingBunker) return;
  try { pendingBunker.cancel(); } catch (e) {}
  pendingBunker = null;
}

function preferredSignerApp() {
  var ua = navigator.userAgent || "";
  if (/Android/i.test(ua) || (navigator.userAgentData && navigator.userAgentData.platform === "Android")) return "Amber";
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "Clave";
  return "";
}

async function connectSignerApp() {
  if (pendingBunker) {
    pendingBunker.resumeConnection();
    if (pendingSignerCard) pendingSignerCard.scrollIntoView({ block: "nearest" });
    return; // Reuse the URI and secret while approval is pending.
  }
  cancelPendingBunker();
  var choice = identityChoice;
  var timeout = null;
  var client = null;
  try {
    client = await makeBunkerClient();
    if (choice !== identityChoice) { client.cancel(); return; }
    // Persist only after this choice still owns the page. Late signer replies
    // must not replace the next login's remembered session.
    client.storageKey = null;
    pendingBunker = client;
    var flow = await client.startClientFlow();
    if (choice !== identityChoice) { client.cancel(); return; }
    // Attach a rejection handler before asynchronous QR generation/cancellation.
    flow.waitForConnect.catch(function () {});
    var uri = flow.connectUri;
    var card = document.createElement("div"); card.className = "signer-connect";
    pendingSignerCard = card;
    var title = document.createElement("strong"); title.textContent = "Connect your signer"; card.appendChild(title);
    var hint = document.createElement("p");
    var app = preferredSignerApp();
    hint.textContent = app
      ? "Open " + app + " on this device, approve the connection, then return to this NOMAD tab. If the app does not open, copy the URI into your signer or scan the QR code."
      : "Open a compatible signer on this device, or scan/copy with Clave, Amber, nsec.app, or another signer. After approving, return to this NOMAD tab.";
    card.appendChild(hint);
    var link = document.createElement("a");
    link.textContent = app ? "Open " + app : "Open signer";
    link.href = app === "Clave" ? "https://clave.casa/connect/?uri=" + encodeURIComponent(uri) : uri;
    link.target = "_self"; link.rel = "noreferrer";
    link.addEventListener("click", function () { client.resumeConnection(); });
    card.appendChild(link);
    var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy connect URI";
    var raw = document.createElement("textarea"); raw.readOnly = true; raw.value = uri;
    raw.setAttribute("aria-label", "Signer connection URI");
    copy.addEventListener("click", async function () {
      try { await navigator.clipboard.writeText(uri); copy.textContent = "Copied"; }
      catch (e) { raw.focus(); raw.select(); copy.textContent = "Select and copy the URI below"; }
    });
    card.appendChild(copy); card.appendChild(raw);
    var cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel connection";
    cancel.addEventListener("click", cancelPendingBunker); card.appendChild(cancel);
    log.appendChild(card); log.scrollTop = log.scrollHeight;
    // QR is optional and must never delay adoption of an approved connection.
    (async function () {
      try {
        var qrMod = await import("/qrcode.js"); var QR = qrMod.default || qrMod;
        var data = await QR.toDataURL(uri, { margin: 2, width: 220 });
        if (pendingBunker !== client || choice !== identityChoice) return;
        var img = document.createElement("img"); img.src = data; img.alt = "Scan with any Nostr signer";
        card.insertBefore(img, link); log.scrollTop = log.scrollHeight;
      } catch (e) {}
    })();
    var userPk = await Promise.race([
      flow.waitForConnect,
      new Promise(function (rs, rj) { timeout = setTimeout(function () { rj(new Error("connection expired; choose connect signer app to try again")); }, 600000); }),
    ]);
    if (pendingBunker !== client || choice !== identityChoice) return;
    pendingBunker = null;
    if (pendingSignerCard) { pendingSignerCard.remove(); pendingSignerCard = null; }
    client.storageKey = "nomad_bunker_session";
    client.saveSession();
    bunkerClient = client;
    burnPocketIfGraduated(userPk);
    localStorage.setItem("nomad_login", "bunker");
    method = "bunker";
    print("— your signer answers: you are " + nip19.npubEncode(userPk) + " —", "sys");
    reconnect();
  } catch (e) {
    var superseded = choice !== identityChoice || (client && pendingBunker !== client);
    if (!superseded && pendingSignerCard) { pendingSignerCard.remove(); pendingSignerCard = null; }
    if (pendingBunker === client) pendingBunker = null;
    if (client) { try { client.cancel(); } catch (e2) {} }
    if (!superseded) {
      print("— no signer answered (" + (e && e.message ? e.message : "timeout") + ") —", "sys");
    }
  } finally { if (timeout) clearTimeout(timeout); }
}

// iOS may suspend the relay sockets while the signer is foregrounded. Replay
// subscriptions on return; only the secret-bound relay reply completes login.
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") resumeSignerConnection();
});
function resumeSignerConnection() {
  var client = pendingBunker || bunkerClient;
  if (client) client.resumeConnection();
}
window.addEventListener("pageshow", resumeSignerConnection);

function startBunker(url) {
  var choice = identityChoice;
  (async function () {
    print("— you send word to the bunker\\u2026 —", "sys");
    try {
      var client = await makeBunkerClient();
      if (choice !== identityChoice) { client.cancel(); return; }
      client.storageKey = null;
      pendingBunker = client;
      var userPk = await client.connectBunkerUrl(url);
      if (choice !== identityChoice || pendingBunker !== client) { client.cancel(); return; }
      pendingBunker = null;
      client.storageKey = "nomad_bunker_session";
      client.saveSession();
      bunkerClient = client;
      burnPocketIfGraduated(userPk);
      localStorage.setItem("nomad_login", "bunker");
      method = "bunker";
      print("— the bunker answers: you are " + nip19.npubEncode(userPk) + " —", "sys");
      reconnect();
    } catch (e) {
      if (pendingBunker === client) pendingBunker = null;
      if (client) client.cancel();
      if (choice !== identityChoice) return;
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
  var choice = identityChoice;
  var extPk = null;
  try { extPk = await window.nostr.getPublicKey(); } catch (e) {}
  if (choice !== identityChoice) return;
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
// THE WORLD WAS REBUILT UNDER YOU. A deploy is state-safe and the socket
// reconnects without a word, so a page open across one keeps its OLD script and
// is handed the NEW assets - which is how a creature strip drawn as one flat
// picture reached a real player. The page now carries the id of the build it
// came from and the room frame carries the world's; a mismatch shows a notice.
//
// A new build is a notice, never a forced navigation during play.
var staleBuild = false;
function checkBuild(world) {
  if (!BUILD || BUILD.charAt(0) === "_" || world === BUILD) return;  // unstamped in dev
  if (staleBuild) return;
  staleBuild = true;
  maybeReload();
}
function maybeReload() {
  // Deploys must never throw a connected player back to the threshold.
  // Keep the current session; the player chooses when to refresh the page.
  if (!staleBuild || buildNoticeShown) return;
  buildNoticeShown = true;
  print("— a game update is available; refresh the page when you are ready —", "sys");
}
var buildNoticeShown = false;
// What each chip slot held on the previous render, so a slot whose command
// changed under the cursor can refuse the click that was already on its way.
var prevChipCmds = [];
// The one chip that isn't a command: tapping 'inventory' opens the keeping
// modal (pack + lockbox, plus the vault & seal at a gate) instead of sending
// text — typing 'inventory' still prints the plain list. Must match BENCH_CHIP
// / TRADE_CHIP in zone.ts.
var BENCH_CHIP = "inventory";
// THE SHELF CHIP OPENS THE MODAL (rome, 2026-08-04: "keep the command you write
// text, but the chip opens a panel like the gatehouse does). Same bargain as
// 'inventory': the chip is a door to the box, the typed 'stow <item>' still
// moves one thing by name. Must match DEN_CHIP in chips.ts.
var DEN_CHIP = "stow";
var TRADE_CHIP = "barter with the keeper";
// The 'forge' chip opens the forge modal (reads your pack, shows what the bench
// can make); typing 'forge' still reads the slate. Must match FORGE_CHIP in zone.ts.
var FORGE_CHIP = "forge";
// And the bounty board: the chip opens the board modal; typing 'bounty' still
// reads it as text. Must match BOUNTY_CHIP in zone-data.ts.
var BOUNTY_CHIP = "bounty";
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
  // ...but only where that IS the door. On den ground the same two verbs are a
  // house and the ground outside it, and dressing them as the gatehouse told a
  // man standing in his own doorway to go to the tavern. The door it opens can
  // be somebody else's (a bunk you were given), so the label stays "the door".
  if (s === "in") return doorIsDen ? "through the door" : "into the gatehouse";
  if (s === "out") return doorIsDen ? "out onto the ground" : "out into the dark";
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
  if (/^(get|unlock|equip|offer) /.test(s) || s === "offer nothing" || s === TRADE_CHIP || s === FORGE_CHIP || s === BOUNTY_CHIP) return "c-gain";
  if (s === "stance guarded") return "c-def";
  // The door wears the VOICE colour, and it is the only chip that does. That is
  // the whole visual argument: rose means people. Speech is rose; the door to the
  // room where the people are is rose. Nothing else in the world is.
  if (s === "in" || s === "out") return "c-door";
  return "";
}
// A CHIP THAT JUST ARRIVED DOES NOT TAKE A CLICK (rome, 2026-08-07: "the deer
// runs away before i even click the chip and i always end up clicking a
// different command").
//
// The row is rebuilt whole on every ctx frame, so when a creature leaves, its
// chip goes and every chip to its right slides one slot left — arriving under a
// cursor that was already coming down. A roe deer bolts on sight, which makes
// this constant in the wood: you aim at "attack a roe deer" and you eat, or
// walk, or rest instead.
//
// Layout can't be frozen (the row has to tell the truth about the room), so the
// CLICK is guarded instead: a chip whose slot changed in the last CHIP_ARM_MS
// refuses the press and flashes. The cost is having to click twice in the rare
// case you genuinely wanted the new chip that instant; the thing it buys is that
// a moving row can never fire a command you didn't choose.
var CHIP_ARM_MS = 400;
function chipButton(s, fresh) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = chipKind(s);
  b.textContent = chipLabel(s);
  if (fresh) b._armAt = Date.now() + CHIP_ARM_MS;
  b.addEventListener("click", function (e) {
    e.stopPropagation();
    if (b._armAt && Date.now() < b._armAt) {
      // Not yours to click yet — say so, and let them aim again.
      b.classList.add("c-block");
      setTimeout(function () { b.classList.remove("c-block"); }, 220);
      return;
    }
    if (s === BENCH_CHIP || s === DEN_CHIP) {
      benchSend("open");
    } else if (s === TRADE_CHIP) {
      tradeSend("open");
    } else if (s === FORGE_CHIP) {
      forgeSend("open");
    } else if (s === BOUNTY_CHIP) {
      bountySend("open");
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
// is unchanged and collapses on a real room change (status frame, above) —
// a mob merely walking in and adding a chip no longer folds it back up.
var CHIP_FOLD = 12;
var chipsExpanded = false;
var chipScrollRoom = "";
function renderChips(suggest, combat) {
  lastSuggest = suggest;
  var wasFighting = lastCombat;
  lastCombat = !!combat;
  if (wasFighting && !lastCombat) maybeReload();   // idempotent update notice; never navigates
  var followLive = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
  var previousActions = chipsEl.querySelector(".chip-actions");
  var actionScroll = previousActions && chipScrollRoom === lastRoomName && !(lastCombat && !wasFighting) ? previousActions.scrollTop : 0;
  chipScrollRoom = lastRoomName;
  chipsEl.textContent = "";
  if (!chipsOn) return; // the quiet terminal: no training wheels
  // The identity lives behind the name button top right — no keys chip, no
  // nostr words in a stranger's face (rome, 2026-07-11).
  var all = suggest;
  var dirs = [];
  var rest = [];
  all.forEach(function (s) {
    (/^go (north|south|east|west|up|down)$/.test(s) ? dirs : rest).push(s);
  });
  var dirTray = document.createElement("div"); dirTray.className = "chip-dirs";
  var actionTray = document.createElement("div"); actionTray.className = "chip-actions";
  ["north", "south", "east", "west", "up", "down"].forEach(function (direction) {
    var command = "go " + direction;
    var b = chipButton(command, false);
    b.disabled = dirs.indexOf(command) === -1;
    b.setAttribute("aria-label", "Go " + direction + (b.disabled ? " (no exit)" : ""));
    dirTray.appendChild(b);
  });
  if (dirs.length) chipsEl.appendChild(dirTray);
  chipsEl.appendChild(actionTray);
  var ordered = rest;
  var folded = 0;
  if (!chipsExpanded && ordered.length > CHIP_FOLD + 1) {
    folded = ordered.length - CHIP_FOLD;
    ordered = ordered.slice(0, CHIP_FOLD);
  }
  // Fresh = this SLOT now holds a different command than it did a moment ago.
  // That is the exact condition under which a click lands on the wrong thing.
  // A slot whose command changed is a slot that may have moved under the
  // cursor, and it arms — INCLUDING the first one, which is exactly where a
  // new arrival's attack chip gets inserted and shoves everything right.
  // The one exception is the renumber: "attack rat" becoming "attack rat 2"
  // is the same chip for the same thing, wearing a count because a second one
  // walked in. Nothing moved and nothing changed meaning, so it stays live.
  function chipBase(cmd) { return String(cmd === undefined ? "" : cmd).replace(/\s+\d+$/, ""); }
  ordered.forEach(function (s, i) {
    var was = prevChipCmds[i];
    var changed = was !== undefined && was !== s && chipBase(was) !== chipBase(s);
    actionTray.appendChild(chipButton(s, changed));
  });
  prevChipCmds = ordered.slice();
  if (folded > 0) {
    var more = document.createElement("button");
    more.type = "button";
    more.textContent = "+" + folded + " more";
    more.addEventListener("click", function (e) {
      e.stopPropagation();
      chipsExpanded = true;
      renderChips(lastSuggest, lastCombat);
    });
    actionTray.appendChild(more);
  }
  actionTray.scrollTop = actionScroll;
  var settledScroll = log.scrollTop;
  requestAnimationFrame(function () {
    fitPicture();
    if (followLive && Math.abs(log.scrollTop - settledScroll) < 1) log.scrollTop = log.scrollHeight;
  });
}

// Modal taps must stay on the button the finger started on. Live item lists
// are rebuilt after actions; newly inserted controls get a short settling time.
var MODAL_SURFACES = "#bench, #trade, #swap, #bounty, #forge, #mapm, #jrnl, #reckm, #vmodal, #idpanel, #setpanel, #dealreq";
function installModalTapGuard(root, settleNewButtons) {
  new MutationObserver(function () {
    if (root.classList.contains("open") && document.activeElement === cmd) cmd.blur();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  var born = new WeakMap();
  var press = null;
  new MutationObserver(function (changes) {
    changes.forEach(function (change) {
      change.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        if (node.matches("button")) born.set(node, performance.now());
        node.querySelectorAll("button").forEach(function (b) { born.set(b, performance.now()); });
      });
    });
  }).observe(root, { childList: true, subtree: true });
  root.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") { press = null; return; }
    var button = e.target.closest("button");
    press = { id: e.pointerId, button: button, x: e.clientX, y: e.clientY,
      rect: button && button.getBoundingClientRect(), at: performance.now(),
      bad: !e.isPrimary || !button || (settleNewButtons !== false && born.has(button) && performance.now() - born.get(button) < 350), up: false };
  }, true);
  root.addEventListener("pointermove", function (e) {
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.bad = true;
  }, true);
  root.addEventListener("pointercancel", function () { if (press) press.bad = true; }, true);
  root.addEventListener("pointerup", function (e) {
    if (!press || e.pointerId !== press.id) return;
    press.up = true;
    var b = press.button;
    if (!b || !b.isConnected) { press.bad = true; return; }
    var r = b.getBoundingClientRect(), old = press.rect;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10 ||
        Math.abs(r.x - old.x) > 4 || Math.abs(r.y - old.y) > 4 ||
        Math.abs(r.width - old.width) > 4 || Math.abs(r.height - old.height) > 4 ||
        e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) press.bad = true;
  }, true);
  root.addEventListener("click", function (e) {
    // Keyboard and assistive activation have no physical press to validate.
    if (e.detail === 0) return;
    var touch = e.pointerType === "touch" || e.pointerType === "pen" ||
      (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) ||
      (press && performance.now() - press.at < 1500);
    if (!touch) return;
    var b = e.target.closest("button");
    if (!b) return;
    if (!press || !press.up || press.bad || press.button !== b) {
      e.preventDefault(); e.stopImmediatePropagation();
      b.classList.add("modal-tap-blocked");
      setTimeout(function () { b.classList.remove("modal-tap-blocked"); }, 250);
    }
    press = null;
  }, true);
}
document.querySelectorAll(MODAL_SURFACES).forEach(function (root) { installModalTapGuard(root); });
installModalTapGuard(chipsEl, false);

// ---- the gatehouse bench: sort your pack, out of the world's reach ----
var benchEl = document.getElementById("bench");
var bpack = document.getElementById("bpack");
var block = document.getElementById("block");
var bvault = document.getElementById("bvault");
var bshelf = document.getElementById("bshelf");
var bnote = document.getElementById("bnote");
var benchAtGate = false; // vault + seal only when the bench is opened at a gate
var benchAtDen = false;  // the shelf column, only under a roof you may keep in
document.getElementById("bclose").addEventListener("click", function () { benchSend("close"); });

document.getElementById("bgear").addEventListener("click", function () {
  var expanded = benchEl.classList.toggle("showgear");
  this.setAttribute("aria-expanded", String(expanded));
  this.textContent = expanded ? "Hide equipment & stats" : "Show equipment & stats";
});

function benchSend(action, row) {
  // One frame carries the WHOLE selection: a stack sends all its rows at once, so
  // the server moves the pile in a single handler and renders one settled count —
  // no per-row fan racing at the server's DB awaits (the "weird amount" bug).
  var rows = Array.isArray(row) ? row : (row == null || row === "" ? [] : [row]);
  if (rows.length > 20) print("Sort up to 20 items at a time; repeat for the rest.", "sys");
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "bench", action: action, rows: rows.slice(0, 20) }));
  // If the wire is gone the frame goes nowhere \u2014 so a CLOSE still closes,
  // locally. Nothing traps a wanderer behind a panel that cannot answer.
  else if (action === "close") closeBench();
}
function closeBench() { benchEl.classList.remove("open"); hideModalChat(); }

function benchItemNode(it, place) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  // The item's name wears its rarity colour (gear only — food, keys, trophies
  // and the free rock stay plain, same law as the floor lines).
  var nmsp = document.createElement("span");
  nmsp.textContent = it.name;
  // Gear only, and the test is a TRUTHY slot: a row that ships without the
  // field at all (an older frame) must read as "not gear" rather than colour
  // every ration on the shelf, which a not-equal-empty-string test would have
  // done for undefined.
  if (it.rarity && it.slot && it.name.indexOf("loose rock") === -1) nmsp.className = rarityClass(it.rarity);
  nm.appendChild(nmsp);
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
  // What the piece rolled, NAMED rather than merely implied: the adjective in
  // the name is easy to miss and only ever carries the first tag.
  if (it.traits && it.traits.length) { var tw = document.createElement("span"); tw.className = "cond"; tw.textContent = " \\u2014 " + it.traits.join(", "); nm.appendChild(tw); }
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
  function armBtn(label, action, cls, single) {
    var b = document.createElement("button");
    b.type = "button"; b.className = cls || "burn"; b.textContent = label;
    var armed = false, t = null;
    b.addEventListener("click", function () {
      if (!armed) {
        armed = true; b.textContent = label + " \\u2014 sure?"; b.classList.add("arm");
        t = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove("arm"); }, 3000);
      } else {
        if (t) clearTimeout(t);
        if (single) benchSend(action, rows[0]); else fire(action);
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
    // The shelf, when you're standing under your own roof. Sits next to the box
    // because it is the same act — putting a thing down somewhere it keeps.
    if (benchAtDen) btn("\\u2192 shelf", "stow");
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
  } else if (place === "shelf") {
    // Off the shelf, one at a time, same reason as the vault: a stack fanning
    // into the pack spends slots you didn't mean to spend.
    btn1("\\u2192 pack", "fetch");
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
  // Confirm before dropping THIS one to the floor — a single row, never the "dropped both" ambiguity
  // of a name. Placed LAST, off on its own past burn, so a stray click among the
  // box/vault banking buttons can't shed gear by mistake (rome, 2026-07-17). Not
  // offered for what you're wearing (remove it first).
  if (place === "pack" && !it.equipped) armBtn("drop", "drop", "drop", true);
  var risks = document.createElement("div"); risks.className = "risks";
  Array.from(acts.querySelectorAll(".burn, .scrap, .drop")).forEach(function (b) { risks.appendChild(b); });
  wrap.appendChild(acts);
  wrap.appendChild(risks);
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

// THE DURABILITY WORD, COLOURED (rome, 2026-08-22). The figure has always shown
// the condition beside each piece, in the same dim grey as the slot labels — so
// "(failing)" and "(worn)" carried the same weight as the word "head", and a
// mace came apart mid-fight with nothing having stood out to say it was going.
// The word is the signal; it just needed to look like one.
//
// The ladder is conditionWord() on the server: pristine (no tag), worn,
// battered, failing, nearly broken. Worn stays grey — most gear in this world
// is worn and a colour that is always on is wallpaper. Battered goes gold and
// the last two go blood (the gold is --wear, never the theme accent).
var COND_CLS = {
  battered:         "wear-mid",
  failing:          "wear-bad",
  "nearly broken":  "wear-bad"
};

function renderDoll(sheet) {
  if (!sheet) { bdoll.classList.remove("on"); return; }
  dslots.textContent = ""; dstats.textContent = "";
  (sheet.slots || []).forEach(function (s) {
    var d = document.createElement("div"); d.className = "dslot";
    var l = document.createElement("span"); l.className = "lb"; l.textContent = DOLL_SLOTS[s.slot] || s.slot; d.appendChild(l);
    var v = document.createElement("span"); v.className = "it" + (s.name ? "" : " none");
    v.textContent = s.name ? s.name : "\\u2014";
    // Everything on the figure is gear by definition — colour it all.
    if (s.name && s.rarity) v.classList.add(rarityClass(s.rarity));
    d.appendChild(v);
    if (s.name && s.cond && s.cond !== "sound") {
      var c = document.createElement("span");
      c.className = "cd" + (COND_CLS[s.cond] ? " " + COND_CLS[s.cond] : "");
      c.textContent = " (" + s.cond + ")";
      d.appendChild(c);
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
  // Dismiss the command keyboard only on entry, never during item updates.
  if (!benchEl.classList.contains("open")) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    benchEl.querySelector(".bbody").scrollTop = 0;
  }
  document.getElementById("bgear").hidden = !state.sheet;
  benchAtGate = !!state.atGate;
  benchAtDen = !!state.den;
  // At a gate you truly step out of the world; in the dungeon you only crouch to
  // dig through your lockbox — still in the open, still in reach. Say so plainly.
  document.getElementById("btitle").textContent = benchAtGate ? "The gatehouse bench" : benchAtDen ? "Under your own roof" : "Your lockbox";
  document.getElementById("bsub").textContent = benchAtGate
    ? "You've stepped out of the world. Nothing can reach you here \\u2014 sort your kit."
    : benchAtDen
    ? "Your shelf, your pack, your box. A door only keeps things out if you barred it \\u2014 keep your eyes up."
    : "You crouch to dig through your kit \\u2014 but you're still in the dungeon, in the open and in reach. Keep your eyes up.";
  setNote(bnote, state.note || ((benchAtGate ? ""
    : benchAtDen ? "Nothing here is sealed against time: food ages on the shelf and iron rusts \\u2014 though iron left here never rusts away to nothing."
    : "Away from a gate \\u2014 lockbox only. The vault and the seal wait at the gates.")));
  benchEl.classList.toggle("nogate", !benchAtGate);
  benchEl.classList.toggle("hasden", benchAtDen);
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
  // The shelf. Its header carries the den's own law instead of an n/cap, because
  // its law is not an n/cap: gear on it is endless and everything else is
  // capped, and the header is the only place that can say so at a glance.
  if (benchAtDen) {
    bshelf.style.display = "";
    fillBenchCol(bshelf, "Your shelf \\u00b7 " + (state.denName || "your den"), state.shelf || [], 0, "shelf");
    var lawEl = bshelf.querySelector(".cnt");
    if (lawEl) lawEl.textContent = (state.shelfGear || 0) + " gear, no limit \\u00b7 "
      + (state.shelfRest || 0) + "/" + (state.denCap || 0) + " else";
  } else {
    bshelf.style.display = "none";
    bshelf.textContent = "";
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
  // If the wire is gone the frame goes nowhere \u2014 so a CLOSE still closes,
  // locally. Nothing traps a wanderer behind a panel that cannot answer.
  else if (action === "close") closeTrade();
}
function closeTrade() { tradeEl.classList.remove("open"); tradeState = null; hideModalChat(); }

// ---- the keeper's bounty board ----
// The hatch's other business: named trophies, paid in food at ~2x their trade
// value. One column, a row per bounty — claim trades the trophy in for the meal.
var bountyEl = document.getElementById("bounty");
var byboard = document.getElementById("byboard");
var bynote = document.getElementById("bynote");
document.getElementById("byclose").addEventListener("click", function () { bountySend("close"); });

function bountySend(action, row) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "bounty", action: action, row: row || "" }));
  // If the wire is gone the frame goes nowhere \u2014 so a CLOSE still closes,
  // locally. Nothing traps a wanderer behind a panel that cannot answer.
  else if (action === "close") closeBounty();
}
function closeBounty() { bountyEl.classList.remove("open"); hideModalChat(); }
function renderBounty(state) {
  setNote(bynote, state.note);
  byboard.textContent = "";
  if (!state.board || !state.board.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\u2014 the board is bare \u2014";
    byboard.appendChild(e);
  }
  state.board.forEach(function (b) {
    var row = document.createElement("div");
    row.className = "byrow";
    var t = document.createElement("span");
    t.textContent = b.name;
    if (b.rarity) t.className = rarityClass(b.rarity);
    row.appendChild(t);
    var arrow = document.createElement("span");
    arrow.className = "byarrow";
    arrow.textContent = "\u2192";
    row.appendChild(arrow);
    var f = document.createElement("span");
    f.className = "byfood";
    f.textContent = b.meals > 1 ? b.food + " \\u00d7" + b.meals : b.food;
    row.appendChild(f);
    var heal = document.createElement("span");
    heal.className = "byheal";
    heal.textContent = "(mends " + b.heal + ")";
    row.appendChild(heal);
    var have = document.createElement("span");
    have.className = "byhave";
    // A posting you've already collected on stays up — it's still live for
    // everyone else — so it reads as settled rather than disappearing.
    have.textContent = b.took ? "paid" : b.have ? "you have it" : "";
    row.appendChild(have);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = b.took ? "paid" : "claim";
    btn.disabled = !b.have || !!b.took;
    btn.addEventListener("click", function () { bountySend("claim", b.id); });
    row.appendChild(btn);
    byboard.appendChild(row);
  });
  bountyEl.classList.add("open");
}

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
  nm.appendChild(gearNameSpan(it.name, it.rarity, it.slot));
  if (it.n > 1) nm.appendChild(document.createTextNode(" (x" + it.n + ")"));
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

// Both sides of the counter read as shelves, not a ledger: steel, kit,
// physic, sundries — cheapest first within each on his side; on yours, gear
// stays apart from trophies/oddments instead of interleaved by pack order.
// Older servers send no kind; everything falls to one unlabelled shelf and
// the modal still works.
var TRADE_SHELVES = [["steel", "STEEL"], ["kit", "KIT"], ["physic", "PHYSIC"], ["sundries", "SUNDRIES"]];
function renderItemList(el, items, place) {
  if (!items.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = place === "goods" ? "\\u2014 nothing he'd take \\u2014" : "\\u2014 bare shelves \\u2014";
    el.appendChild(e);
    return;
  }
  if (items.some(function (it) { return it.kind; })) {
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
function fillTradeCol(el, title, items, place, gone) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = title;
  el.appendChild(h);
  renderItemList(el, items, place);
  // What he isn't carrying, at the foot of his own shelf: named so you know it
  // exists, dimmed and priceless so it never reads as something you can take.
  // Without it a rotated-out thing and a thing that was never in the world
  // looked exactly alike \\u2014 an empty space with nothing to come back for.
  if (place !== "stock" || !gone || !gone.length) return;
  var sh = document.createElement("div");
  sh.className = "tsech";
  sh.textContent = "NOT CARRYING";
  el.appendChild(sh);
  gone.forEach(function (it) {
    var row = document.createElement("div");
    row.className = "trow tgone";
    var nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = it.name;
    row.appendChild(nm);
    var dash = document.createElement("span");
    dash.className = "tcost";
    dash.textContent = "\\u2014";
    row.appendChild(dash);
    el.appendChild(row);
  });
  var note = document.createElement("div");
  note.className = "tgnote";
  note.textContent = "he'll have these again before long";
  el.appendChild(note);
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
  renderItemList(tgoods, items, "goods");
}

function renderTrade(state) {
  tradeState = state;
  // The cart: a list of wants (buy the same thing twice and it lists twice),
  // paid against their summed cost. Truthy only while something's on the counter
  // \\u2014 that's what unlocks the offer buttons.
  tradeWant = (state.want && state.want.items && state.want.items.length) ? state.want : null;
  setNote(tnote, state.note);
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
  fillTradeCol(tstock, "His stock", state.stock || [], "stock", state.gone || []);
  renderGoods();
  tradeEl.classList.add("open");
}

// ---- a deal with another wanderer: item for item, no keeper, no coin ----
// Same shell and row look as the hatch, but three columns (your pack to draw
// from, your offer, theirs) since it's two people, not a shop. Works
// anywhere a deal was struck, not only at a gate.
var swapEl = document.getElementById("swap");
var swpack = document.getElementById("swpack");
var swmine = document.getElementById("swmine");
var swtheirs = document.getElementById("swtheirs");
var swnote = document.getElementById("swnote");
var swconfirm = document.getElementById("swconfirm");
document.getElementById("swclose").addEventListener("click", function () { swapSend("cancel"); });

function swapSend(action, row, pool) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "swap", action: action, row: row || "", pool: pool || "" }));
  // If the wire is gone the frame goes nowhere \u2014 so a CLOSE still closes,
  // locally. Nothing traps a wanderer behind a panel that cannot answer.
  else if (action === "cancel" || action === "decline") closeSwap();
}
function closeSwap() { swapEl.classList.remove("open"); dealreqEl.classList.remove("open"); hideModalChat(); }

// The ask itself, before either side sees the modal: a small top-right card,
// not a full screen. Incoming gets accept/decline; outgoing gets a cancel
// while it waits. Deliberately separate from renderSwap's DOM — nobody sees
// the trading floor until the ask is answered.
var dealreqEl = document.getElementById("dealreq");
var drtext = document.getElementById("drtext");
var dracts = document.getElementById("dracts");
function renderDealReq(f) {
  swapEl.classList.remove("open");
  drtext.textContent = f.role === "incoming"
    ? f.partner + " wants to strike a deal."
    : "Waiting on " + f.partner + " to answer\\u2026";
  dracts.textContent = "";
  function actButton(label, action) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", function () { swapSend(action); });
    dracts.appendChild(b);
  }
  if (f.role === "incoming") {
    actButton("accept", "accept");
    actButton("decline", "decline");
  } else {
    actButton("cancel", "cancel");
  }
  dealreqEl.classList.add("open");
}

// A row on either side of a deal. Takes the item itself so the name can wear
// its tier — the same law as the keeper's shelves, since both sides of a deal
// are looking at gear and judging it.
function swapRow(it, action, pool) {
  var wrap = document.createElement("div");
  wrap.className = "trow";
  var nm = document.createElement("span");
  nm.className = "nm";
  nm.appendChild(gearNameSpan(it.name, it.rarity, it.slot));
  if (it.n > 1) nm.appendChild(document.createTextNode(" (x" + it.n + ")"));
  wrap.appendChild(nm);
  if (action) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = action === "offer" ? "offer" : "take back";
    b.addEventListener("click", function () { swapSend(action, it.itemId, pool); });
    wrap.appendChild(b);
  }
  return wrap;
}

function fillSwapCol(el, title, rows) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = title;
  el.appendChild(h);
  if (!rows.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\\u2014 nothing here \\u2014";
    el.appendChild(e);
    return;
  }
  rows.forEach(function (r) { el.appendChild(r); });
}

var SWAP_POOL_LABEL = { "": "Pack", lockbox: "Lockbox", vault: "Vault" };

// "Your goods" is grouped into sub-headed clusters by where the item actually
// lives (pack/lockbox/vault) — same itemId can sit in more than one pool at
// once, and the offer action needs to know which one it's pulling from.
function fillSwapGoods(el, title, items) {
  el.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = title;
  el.appendChild(h);
  if (!items.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\\u2014 nothing here \\u2014";
    el.appendChild(e);
    return;
  }
  var groups = { "": [], lockbox: [], vault: [] };
  items.forEach(function (it) { (groups[it.pool] || groups[""]).push(it); });
  ["", "lockbox", "vault"].forEach(function (pool) {
    var list = groups[pool];
    if (!list.length) return;
    var sh = document.createElement("div");
    sh.className = "bsubh";
    sh.textContent = SWAP_POOL_LABEL[pool];
    el.appendChild(sh);
    list.forEach(function (it) {
      el.appendChild(swapRow(it, "offer", pool));
    });
  });
}

function swapSideNode(label, confirmed) {
  var side = document.createElement("span");
  side.className = "swside";
  var lbl = document.createElement("span");
  lbl.textContent = label + ": ";
  side.appendChild(lbl);
  var st = document.createElement("span");
  st.className = confirmed ? "swok" : "swpending";
  st.textContent = confirmed ? "shaken on it" : "still deciding";
  side.appendChild(st);
  return side;
}

function renderSwap(state) {
  dealreqEl.classList.remove("open");
  setNote(swnote, state.note);
  var partner = state.partner || "your partner";
  fillSwapGoods(swpack, "Your goods", state.pack || []);
  fillSwapCol(swmine, "Your offer", (state.yourOffer || []).map(function (it) {
    return swapRow(it, "unoffer");
  }));
  fillSwapCol(swtheirs, partner + "'s offer", (state.theirOffer || []).map(function (it) {
    return swapRow(it, null);
  }));
  swconfirm.textContent = "";
  swconfirm.appendChild(swapSideNode("You", state.yourConfirm));
  swconfirm.appendChild(swapSideNode(partner, state.theirConfirm));
  var shake = document.createElement("button");
  shake.type = "button";
  shake.textContent = state.yourConfirm ? "hold on" : "shake on it";
  if (state.yourConfirm) shake.classList.add("on");
  shake.addEventListener("click", function () { swapSend(state.yourConfirm ? "unconfirm" : "confirm"); });
  swconfirm.appendChild(shake);
  swapEl.classList.add("open");
}

// ---- the gatehouse forge: what the bench can make from what you carry ----
var forgeEl = document.getElementById("forge");
var frecipes = document.getElementById("frecipes");
var fnote = document.getElementById("fnote");
var fhave = document.getElementById("fhave");
document.getElementById("fclose").addEventListener("click", function () { forgeSend("close"); });

function forgeSend(action, row) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ v: 0, t: "forge", action: action, row: row || "" }));
  // If the wire is gone the frame goes nowhere \u2014 so a CLOSE still closes,
  // locally. Nothing traps a wanderer behind a panel that cannot answer.
  else if (action === "close") closeForge();
}
function closeForge() { forgeEl.classList.remove("open"); hideModalChat(); }

function forgeItemNode(it) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  // The bench only ever makes gear, so every recipe name wears its tier.
  var fnm = document.createElement("span");
  fnm.textContent = it.name;
  if (it.rarity) fnm.className = rarityClass(it.rarity);
  nm.appendChild(fnm);
  if (it.stat) { var st = document.createElement("span"); st.className = "stat"; st.textContent = " (" + it.stat + ")"; nm.appendChild(st); }
  var rr = document.createElement("span"); rr.className = "rar"; rr.textContent = " [" + it.rarity + "]"; nm.appendChild(rr);
  wrap.appendChild(nm);
  var cost = document.createElement("div");
  cost.className = "cost " + (it.can ? "ok" : "no");
  var txt = it.scrap + " iron";
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

// ---- WHAT A PIECE TELLS YOU AT THE BENCH ----
// One row per piece of gear the vice can reach; click it and the reading
// unfolds underneath. Nobody is speaking — there is no smith at the gate, only
// the keeper at his hatch. This is the piece under a good light. The whole sheet ships inside the forge payload, so
// opening one costs no round trip and nothing can desync from the panel — and
// the open row survives a re-render (a craft, a repair) by rowId, because
// losing your place every time you touch a button is its own small hell.
var freadEl = document.getElementById("fread");
var fopen = "";
function forgeSheetNode(it) {
  var wrap = document.createElement("div");
  wrap.className = "bitem";
  var nm = document.createElement("div");
  nm.className = "nm";
  var a = document.createElement("span");
  a.textContent = it.name;
  if (it.rarity) a.className = rarityClass(it.rarity);
  nm.appendChild(a);
  var tags = document.createElement("span");
  tags.className = "rar";
  var bits = [it.where];
  if (it.cond && it.cond !== "sound") bits.push(it.cond);
  if (it.sealed) bits.push("sealed");
  tags.textContent = " [" + bits.join(" \\u00b7 ") + "]";
  nm.appendChild(tags);
  wrap.appendChild(nm);
  var open = fopen === String(it.id);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = open ? "close" : "read";
  btn.addEventListener("click", function () {
    fopen = open ? "" : String(it.id);
    paintRead(lastRead);
  });
  var acts = document.createElement("div");
  acts.className = "acts";
  acts.appendChild(btn);
  if (!open) { wrap.appendChild(acts); return wrap; }
  // WHAT IT IS, on one line: substance, class, numbers. This replaced a stack
  // of paragraphs that repeated themselves all the way down the column.
  var tg = document.createElement("div");
  tg.className = "tags";
  var tagTxt = (it.tags || []).join("  \u00b7  ");
  if (tagTxt) tg.appendChild(document.createTextNode(tagTxt));
  // The numbers keep their own case. Small-caps suits STEEL and EDGED; it just
  // shouts at "3 armor, heavy", which is a reading and not a label.
  if (it.stat) {
    var sv = document.createElement("span");
    sv.className = "statv";
    sv.textContent = (tagTxt ? "  \u00b7  " : "") + it.stat;
    tg.appendChild(sv);
  }
  if (tagTxt || it.stat) wrap.appendChild(tg);
  // ITS TRAITS, each with what it does. Two columns so the eye can run down the
  // effects; this is the piece in your hand, never a catalogue of what it isn't.
  if (it.own && it.own.length) {
    var tbl = document.createElement("div");
    tbl.className = "takes";
    it.own.forEach(function (tr) {
      var row = document.createElement("div");
      var a = document.createElement("span");
      a.className = "tadj";
      a.textContent = tr.name;
      var d = document.createElement("span");
      d.className = "tdoes";
      d.textContent = tr.does;
      row.appendChild(a); row.appendChild(d);
      tbl.appendChild(row);
    });
    wrap.appendChild(tbl);
  }
  if (it.damp) {
    var dp = document.createElement("div");
    dp.className = "quiet";
    dp.textContent = it.damp;
    wrap.appendChild(dp);
  }
  if (it.tell) {
    var tl = document.createElement("div");
    tl.className = "cost ok";
    tl.textContent = it.tell;
    wrap.appendChild(tl);
  }
  var mend = document.createElement("div");
  mend.className = "cost " + (it.mend ? "no" : "ok");
  mend.textContent = it.mend ? "The mend wants " + it.mend + " at the vice." : "Sound.";
  wrap.appendChild(mend);
  // The vice is right there. A piece the bench can read is a piece it can mend,
  // including one sitting in the lockbox or the vault \u2014 the server looks in
  // the same three places this list came from. Disabled rather than hidden when
  // the scrap is short, so the cost above still explains the refusal.
  if (it.mend) {
    var mb = document.createElement("button");
    mb.type = "button";
    mb.textContent = "mend";
    mb.disabled = !it.canMend;
    mb.addEventListener("click", function () { forgeSend("mend", String(it.id)); });
    acts.insertBefore(mb, acts.firstChild); // the doing comes before the closing

  }
  wrap.appendChild(acts);
  return wrap;
}
var lastRead = [];
function paintRead(read) {
  lastRead = read || [];
  freadEl.textContent = "";
  var h = document.createElement("div");
  h.className = "bcolh";
  h.textContent = "In the bench light";
  freadEl.appendChild(h);
  if (!lastRead.length) {
    var e = document.createElement("div");
    e.className = "bempty";
    e.textContent = "\\u2014 nothing on you the vice could hold \\u2014";
    freadEl.appendChild(e);
    return;
  }
  lastRead.forEach(function (it) { freadEl.appendChild(forgeSheetNode(it)); });
}

function renderForge(state) {
  setNote(fnote, state.note);
  fhave.textContent = "";
  var lbl = document.createElement("span");
  lbl.textContent = "You have ";
  fhave.appendChild(lbl);
  var sc = document.createElement("span");
  sc.className = "scrap";
  sc.textContent = state.scrap + " iron";
  fhave.appendChild(sc);
  var tail = document.createElement("span");
  var raw = (state.scrapRaw || 0);
  tail.textContent = " across pack and keeping (and " + raw + " scrap). Salvage gear to make scrap; 'smelt' casts 5 scrap into 1 iron.";
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
  // A piece that has left your hands since the last paint takes its open sheet
  // with it \\u2014 otherwise a salvaged item stays expanded over nothing.
  var still = (state.read || []).some(function (r) { return String(r.id) === fopen; });
  if (!still) fopen = "";
  paintRead(state.read);
  if (state.sfx) sndOne(state.sfx);
  forgeEl.classList.add("open");
}

// ---- the map modal: a chart you carry (true, or half a lie) ----
var mapEl = document.getElementById("mapm");
var mapBody = document.getElementById("mapbody");
document.getElementById("mapclose").addEventListener("click", closeMap);
// Closing DROPS the camera. It is kept only for as long as the sheet is open,
// so a redraw while you are reading it does not throw away your panning — but
// the NEXT map you open is a new sheet and gets centred on you like the first
// one did. Without this the flag was set once per page load and never cleared,
// so every chart after your first opened with the view still parked over
// wherever you had last looked: carve at one gatehouse, walk to another, study,
// and the canvas showed empty plaster with all your halls off-screen. Nothing
// was ever lost from the wall — you were looking at the wrong part of it.
function closeMap() { mapEl.classList.remove("open"); mapCamKept = false; hideModalChat(); }
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
function mapRegionColor(region, isGate) {
  // A GATE IS A GATE WHEREVER IT STANDS. Colour used to ride the region alone,
  // which was fine while every gate was in the fortress: since the doors spread
  // onto the road and into the wood their region is road/wood, and they were
  // drawing as ordinary ground — the map hid five banks (rome, 2026-08-02).
  if (isGate) return mapCssVar("--steel");
  if (region === "gate") return mapCssVar("--steel");
  if (region === "deep") return mapCssVar("--blood");
  if (region === "out") return mapCssVar("--heal");   // the open ground: green and alive
  if (region === "sky") return mapCssVar("--cream");  // the overworks: pale, up in the wind
  if (region === "warrens") return mapCssVar("--dim"); // the warrens: packed earth
  if (region === "crossing") return mapCssVar("--tide"); // the crossing: a mile of water, and the only blue on the chart
  // THE SURFACE BANDS NEED THEIR OWN COLOURS (rome, 2026-08-02: "the road is
  // the same exact colour as the halls"). road/wood/mountain fell through to
  // the default and drew gold — the buried keep's colour — so the open road
  // read as more dungeon. Bone for the road: pale dust and old paving, the
  // one thing out there that people made. Omen for the wood, because it is
  // the band that lies to you about which way you are facing.
  // MEASURED, NOT EYEBALLED. Four of the palette's colours sit on the SAME hue
  // — cream 42deg, dim 43deg, gold 40deg, bone 41deg — so they differ only in
  // lightness, and a pale one among them reads as the overworks or the halls.
  // I picked bone for the road on looks and it was 1deg off both (rome: "the
  // overworks is bone already"). Only two hue families are actually free:
  //   voice  338deg  61-66deg clear of every warm colour   -> THE ROAD
  //   omen   272deg  66deg clear of voice, 90+ of the rest -> THE WOOD
  // Voice is also the real cartographic convention: roads are drawn red. Its
  // nearest neighbour is blood at 33deg, and blood is the DEEP — four strata
  // down, never on screen beside a road.
  if (region === "road") return mapCssVar("--voice");
  if (region === "wood") return mapCssVar("--omen");
  // THE DENS. They sit physically between the road and the wood on the chart, so
  // they have to read as a third thing at a glance against BOTH of those and
  // against the halls' gold, which is the default everything else falls back to.
  // Heal is 85deg — 45 clear of gold, 100+ clear of voice and omen — and it is
  // the only green in the palette, which is what the dens are: grass, fields, a
  // common. Narrower clearance than the road and the wood got, but green against
  // amber is a hue difference the eye names, not just measures.
  if (region === "den") return mapCssVar("--heal");
  // THE MOUNTAIN. 398 rooms, a third of the world, and until now it drew GOLD -
  // the default, which is the buried keep's colour - so the biggest region in
  // the game read as more dungeon. Same bug the road and the crossing each hit
  // in their turn, and the same fix: give it its own entry.
  if (region === "mountain") return mapCssVar("--stone");
  // No colour for the mountain until the mountain exists — the cream I first
  // gave it was the overworks exactly.
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
// The strata themselves. WHICH band a room is in is the server's call now and
// ships on the frame (zone-data.MAP_BAND_OF) — this is only their order and
// their names, which are a drawing concern.
var MAP_BANDS = [
  { band: 0, label: "THE OVERWORKS" },
  { band: 1, label: "THE SURFACE" },
  { band: 2, label: "THE HALLS" },
  { band: 3, label: "THE WARRENS" },
  { band: 4, label: "THE DEEP" },
];
// EVERY REGION IS NAMED ON A TRUE MAP (rome, 2026-08-06). The strata above are
// still what a CRUDE copy stacks by — it is a shattered pack of lies laid out
// locally, and bands are the only shape it has. A true sheet captions PLACES:
// the five strata got names while the surface, 311 of 408 rooms, got one word
// covering the keep's ground, the road, the wood and the hamlet together. The
// anchor for each rides on the frame (lore.worldGrid) so a caption never moves
// when you find a new room. The 'gate' region is deliberately absent: the three
// fortress doors stand on its open ground, and would caption inside a caption.
var MAP_REGION_LABELS = {
  sky: "THE OVERWORKS",
  out: "THE OPEN GROUND",
  upper: "THE HALLS",
  warrens: "THE WARRENS",
  deep: "THE DEEP",
  road: "THE WEST ROAD",
  wood: "THE WOOD",
  den: "THE DENS",
  mountain: "THE MOUNTAIN",
  crossing: "THE CROSSING",
  // THE WOOD'S SEVEN QUARTERS. It is 170 rooms — 42% of the world — and it
  // carried one caption while the fortress's 110 carried five, so the biggest
  // region on the paper was the one that told you least about where you were.
  // These are caption-only: the wood stays one colour and one region, and every
  // rule keyed on region is untouched. Server side is detail.WOOD_QUARTERS.
  heath: "THE DRY HEATH",
  holding: "THE LOST HOLDING",
  sunken: "THE SUNKEN WOOD",
  carr: "THE CARR",
  worked: "THE WORKED WOOD",
  enclosure: "THE OLD ENCLOSURE",
  deepwood: "THE DEEP WOOD",
  heart: "THE HEART",
  // THE EAST ROAD'S FOUR (mig 187), same caption-only trick. Note that 'road'
  // above says THE WEST ROAD and still does: both halves are one band for every
  // rule in the sim, and only the paper distinguishes them.
  eastroad: "THE EAST ROAD",
  drove: "THE DROVE",
  beck: "THE BECK",
  rise: "THE RISE",
  holdings: "THE HOLDINGS",
  // THE CROSSING'S SEVEN (mig 190). These are the only caption-only quarters in
  // the world that are load-bearing rather than flavour: the five middle ones
  // are the five WAYS OVER, and knowing which of them your dot is standing on
  // is the entire skill of the region. The map is the region's tutorial.
  // THE OPEN GROUND'S FOUR (mig 193). The ring keeps "THE OPEN GROUND".
  siegelines: "THE SIEGE LINES",
  village: "THE BURNED VILLAGE",
  orchard: "THE HOLDING",
  gallows: "THE GALLOWS GROUND",
  nearshore: "THE NEAR SHORE",
  causeway: "THE CAUSEWAY",
  bridge: "THE BRIDGE",
  ford: "THE FORD",
  ferry: "THE FERRY",
  eyots: "THE EYOTS",
  farstrand: "THE FAR STRAND",
};
function buildMapGraph(f) {
  var nodes = {}, order = [];
  var regions = f.regions || [];
  for (var r = 0; r < regions.length; r++) {
    var grp = regions[r], key = grp.key || "upper", rooms = grp.rooms || [];
    for (var i = 0; i < rooms.length; i++) {
      var rm = rooms[i];
      if (nodes[rm.id]) continue;
      // The band is the SERVER's now (zone-data.MAP_BAND_OF) — it ships on the
      // frame, so there is one copy of the strata and not two to drift apart.
      var band = (rm.band !== undefined && rm.band !== null) ? rm.band : 1;
      nodes[rm.id] = { id: rm.id, name: rm.name || rm.id, region: key, band: band, exits: rm.exits || [], here: !!rm.here, gate: !!rm.gate, home: rm.home || 0, safe: !!rm.safe, hold: !!rm.hold,
                       q: rm.q || "", gx: rm.x, gy: rm.y };
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
  // THE SHEET IS ALREADY DRAWN. YOU ARE ONLY UNCOVERING IT.
  //
  // rome has said this every single time and I kept only half-doing it: "HAVE
  // the map laid out flat, with the rooms filled in as they are explored; let
  // the rooms map the
  // WORLD". I baked the coordinates into the rooms (mig 166/167) and then left
  // ALL OF THIS still here — a walker, a packer, a per-band row-filler and a
  // centring pass — so the moment anything was missing the client threw the
  // baked sheet away and re-laid the whole stratum around x = 0. That is why a
  // band kept appearing shoved off to one side no matter what the server said.
  //
  // So a TRUE map does none of it. Every room carries its square; plot the
  // square. No walking, no packing, no per-band stacking, no centring, no
  // normalising against what you happen to know. A room you have never seen is
  // a gap in the paper, and every room you HAVE seen is in the same square it
  // was in last week and will be in next year.
  //
  // The one exception stays the crude map, which ships no coordinates on
  // purpose: it is a shattered pack of lies and gets laid out here, locally,
  // because there is nothing true to plot.
  var placed = {}, labels = [];
  var canon = true;
  for (var cq = 0; cq < order.length; cq++) {
    var gq = nodes[order[cq]];
    if (gq.gx === undefined || gq.gx === null) { canon = false; break; }
  }
  if (canon) {
    for (var g4 = 0; g4 < order.length; g4++) {
      var gid = order[g4], gnn = nodes[gid];
      placed[gid] = { x: gnn.gx, y: gnn.gy, displaced: false };
    }
    // The stratum labels ride on the server's own measure of where each band
    // hangs — against the WHOLE world, not against your corner of it, so a label
    // never slides when you find a new room.
    var anchors = f.bands || [];
    for (var bl = 0; bl < anchors.length; bl++) {
      var ba = anchors[bl];
      var text = MAP_REGION_LABELS[ba.region];
      if (!text) continue;
      // Only caption ground you have actually walked some of — an unvisited
      // region is a gap in the paper, and a name floating over a gap would be
      // telling you a place exists that your copy has never charted.
      // A wood quarter's caption is satisfied by having walked a room OF THAT
      // QUARTER, not by having walked the wood — otherwise one step past the
      // Eaves would print all seven names across ground you have never seen.
      var anyHere = false;
      for (var ah = 0; ah < order.length && !anyHere; ah++) {
        var nd = nodes[order[ah]], nr = nd.region;
        if (nr === ba.region || nd.q === ba.region || (ba.region === "out" && nr === "gate")) anyHere = true;
      }
      if (anyHere) labels.push({ x: ba.x, y: ba.y, text: text });
    }
  } else {
    // A CRUDE COPY ONLY. Pieces packed into rows and each stratum centred — the
    // right shape for a map that is lying to you, and reached by nothing else.
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
      var bx0 = 1e9, bx1 = -1e9, by1 = -1e9;
      for (var bb = 0; bb < bandIds.length; bb++) {
        var bp = placed[bandIds[bb]];
        if (bp.x < bx0) bx0 = bp.x; if (bp.x > bx1) bx1 = bp.x; if (bp.y > by1) by1 = bp.y;
      }
      var shiftX = -Math.round((bx0 + bx1) / 2);
      for (var bs = 0; bs < bandIds.length; bs++) placed[bandIds[bs]].x += shiftX;
      labels.push({ x: bx0 + shiftX - 0.35, y: bandY - 1.05, text: MAP_BANDS[bi].label });
      bandY = by1 + 3.4;
    }
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
    // TWO CAPTIONS ON THE SAME GROUND (rome, 2026-08-31: THE OPEN GROUND and
    // THE EAST ROAD printed through each other). The anchors are the server's
    // measure of where a band hangs against the whole world, which is what keeps
    // a caption from sliding when you chart a new room — but nothing ever
    // checked whether two of them landed in the same place, and where two bands
    // meet they do. Letter-spaced text at fourteen characters is wide, so the
    // overlap is not subtle: it reads as one ruined word.
    //
    // Measured in SCREEN space, after the zoom, because that is where the
    // collision actually is — two anchors a comfortable distance apart on the
    // paper are on top of each other at low magnification. A caption that lands
    // on one already placed steps down a line and tries again. First come keeps
    // its place, so the label that has always been there does not move when a
    // new one appears beside it.
    var lrects = [], lh = 13 * s;
    for (var lb = 0; lb < g.labels.length; lb++) {
      var ltx = g.labels[lb].text.split("").join("\\u2009");
      var lpx = sx(g.labels[lb].x), lpy = sy(g.labels[lb].y), lpw = ctx.measureText(ltx).width;
      for (var lg = 0; lg < 8; lg++) {
        var clash = false;
        for (var lr = 0; lr < lrects.length; lr++) {
          var q = lrects[lr];
          if (lpx < q.x + q.w && lpx + lpw > q.x && lpy - lh / 2 < q.y + q.h && lpy + lh / 2 > q.y) { clash = true; break; }
        }
        if (!clash) break;
        lpy += lh * 1.35;
      }
      lrects.push({ x: lpx, y: lpy - lh / 2, w: lpw, h: lh });
      ctx.fillText(ltx, lpx, lpy);
    }
    ctx.globalAlpha = 1;
  }
  // rooms — wide, low label-plates so a name has somewhere to sit
  var tw = MAP_CELL * s * 0.80, th = MAP_CELL * s * 0.33;
  for (var o = 0; o < g.order.length; o++) {
    var id = g.order[o], p = g.placed[id]; if (!p) continue;
    var nd = g.nodes[id], cx = sx(p.x), cy = sy(p.y), col = mapRegionColor(nd.region, nd.gate);
    mapRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6 * s);
    // A DOOR LOOKS LIKE A DOOR (rome, 2026-08-02: "you made a gate not blue").
    // Steel at a 15% wash and a hairline stroke reads as grey — which was fine
    // when every gate sat in a crowd of fortress rooms to contrast against, and
    // is not fine now that one can stand alone in an otherwise empty band. A
    // gate gets a solid steel plate and a heavy stroke: it is the single most
    // important tile on the paper, because it is the bank and the way out.
    // AND YOUR OWN ROOF LOOKS LIKE ONE (rome, 2026-08-04: "on the map your den
    // should be easily noticed"). Same argument as the gate, for the same
    // reason: it is a fixed point you steer for from anywhere on the paper, and
    // it was a plate among four hundred plates. It takes the gate's weight — a
    // solid wash, a heavy stroke and a glow — in GOLD, which is the colour this
    // client has always used for what is yours. A bunk you hold a key to gets
    // the stroke without the glow: somewhere you can sleep, not somewhere you
    // live. Nobody else's house is marked at all.
    var mine = nd.home === 2, bunked = nd.home === 1;
    // A BOLTHOLE READS AS ONE, AND NOT AS A GATE (rome, 2026-08-06: "lets color
    // the hidding spots", then "it kind of looks like the gate" — and he is
    // right, that one was mine). I gave it STEEL, which is the one colour that
    // was already spoken for: mapRegionColor returns steel for every gate,
    // wherever it stands. So a bolthole was drawn in the bank's own colour.
    //
    // AND NO OTHER HUE IS FREE. blood is the deep, cream the overworks, dim the
    // warrens, bone the road, omen the wood, heal the open ground and where you
    // stand, gold your own roof — and voice-rose is spoken for hardest of all,
    // because in this client rose means PEOPLE, which is the opposite of what a
    // hole in the ground is for.
    //
    // So it is not a colour, it is a TREATMENT: the ground's own colour, drawn
    // as a broken outline. Which is also the truer statement — a bolthole is not
    // another kind of place, it is a gap in the place you are already in. A gate
    // is solid, heavy and lit; a hideaway is the same ground with a way into it.
    var hide = nd.safe && !mine && !bunked;
    // GROUND WITH ROOM FOR A DOOR. Same doctrine as the bolthole above: not a
    // new colour (rose means PEOPLE here, gold means YOURS), but a treatment.
    // An empty site is drawn a shade heavier than open ground and carries an
    // OUTLINE roof, so the paper says "somebody could live here" without
    // saying "somebody does" — which stays the room prose's business.
    var site = nd.hold && !mine && !bunked;
    ctx.globalAlpha = nd.here ? 0.30 : (nd.gate || mine ? 0.42 : hide ? 0.24 : bunked ? 0.26 : site ? 0.22 : 0.15);
    ctx.fillStyle = mine || bunked ? gold : col; ctx.fill(); ctx.globalAlpha = 1;
    if (nd.here) { ctx.shadowColor = heal; ctx.shadowBlur = 16 * s; }
    else if (mine) { ctx.shadowColor = gold; ctx.shadowBlur = 12 * s; }
    else if (nd.gate) { ctx.shadowColor = col; ctx.shadowBlur = 10 * s; }
    ctx.lineWidth = nd.here ? Math.max(2, 2.2 * s) : (nd.gate || mine) ? Math.max(2, 2.0 * s) : (hide || bunked || site) ? Math.max(1, 1.6 * s) : Math.max(1, 1.1 * s);
    ctx.strokeStyle = nd.here ? heal : (mine || bunked) ? gold : col;
    // The broken line. Set on the stroke only, and cleared straight after, so
    // nothing else drawn this frame inherits it.
    if (hide && !nd.here) ctx.setLineDash([4 * s, 3 * s]);
    mapRoundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6 * s); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    var hasU = false, hasD = false;
    for (var x = 0; x < nd.exits.length; x++) { if (nd.exits[x].dir === "up") hasU = true; if (nd.exits[x].dir === "down") hasD = true; }
    if (hasU || hasD) {
      ctx.fillStyle = gold; ctx.font = ((10 * s) | 0) + "px ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText((hasU ? "\\u25b2" : "") + (hasD ? "\\u25bc" : ""), cx + tw / 2 - 3 * s, cy - th / 2 + 2 * s);
    }
    // The roof, top-LEFT, where nothing else sits — the stair badges own the
    // right corner. Full weight for your own door, half for a bunk.
    if (mine || bunked || hide || site) {
      ctx.globalAlpha = mine ? 1 : bunked ? 0.55 : site ? 0.7 : 0.9;
      ctx.fillStyle = (hide || site) ? col : gold; ctx.font = ((11 * s) | 0) + "px ui-monospace, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      // A roof for a door of your own; an arch \\u2014 a burrow mouth \\u2014 for a hole
      // the world left lying about.
      ctx.fillText(hide ? "\\u2229" : "\\u2302", cx - tw / 2 + 4 * s, cy - th / 2 + 2 * s);
      ctx.globalAlpha = 1;
    }
    if (mapCam.scale >= 0.6) {
      ctx.fillStyle = nd.here ? cream : bone; ctx.font = (((nd.here ? 11.5 : 11) * s) | 0) + "px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // clip to the plate so even a mis-measured label can't bleed out; leave
      // extra right margin when an up/down badge shares the top corner, and
      // extra left when a roof shares the other one.
      var maxW = tw - ((hasU || hasD) ? 24 * s : 12 * s) - ((mine || bunked || hide) ? 12 * s : 0);
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
  else if (mapGraph) {
    // YOU ARE NOT ON THIS SHEET. The wall chart holds only what you carved, so
    // standing in a gatehouse whose gate you have not set down leaves 'here'
    // off the drawing entirely — and this used to do nothing at all, which
    // meant the one button that recovers a lost view was dead in exactly the
    // case you need it. Fall back to the middle of what IS drawn.
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, any = false;
    for (var k in mapGraph.placed) {
      var q = mapGraph.placed[k];
      if (!q || !isFinite(q.x) || !isFinite(q.y)) continue;
      any = true;
      if (q.x < minx) minx = q.x;
      if (q.x > maxx) maxx = q.x;
      if (q.y < miny) miny = q.y;
      if (q.y > maxy) maxy = q.y;
    }
    if (any) { mapCam.cx = (minx + maxx) / 2; mapCam.cy = (miny + maxy) / 2; }
  }
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
  // ...and the creature row re-fits, or a window dragged narrower leaves the
  // room standing at the size it was when you last walked into it. It goes
  // through fitPicture because the BOX has to be re-measured before the row
  // inside it can be: a shorter window wraps the chip tray, which moves the top
  // of the prose, which is where the picture stops.
  window.addEventListener("resize", fitPicture);
  // ...and once the band has finished growing or shrinking. Guarded on the
  // property because the band also transitions other things, and a measurement
  // per animated property is a measurement three times too many.
  var logForFit = document.getElementById("log");
  if (logForFit) logForFit.addEventListener("transitionend", function (e) {
    if (e.propertyName === "height") fitPicture();
  });
}

function renderMap(f) {
  var detailed = !!f.detailed;
  var wall = !!f.wall;
  mapEl.classList.toggle("crude", !detailed);
  document.getElementById("maptitle").textContent = wall ? "The Wall Chart" : detailed ? "Surveyor's Map" : "Crude Map";
  document.getElementById("mapsub").textContent = wall
    ? "Scratched into the plaster by everyone who walked it and made it back."
    : detailed
      ? "Set down true, hall by hall \\u2014 as far as this copy's carriers have walked."
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
    // The field note: what a FULL account is worth, and the only part of the
    // page that is knowledge rather than description or behaviour. Server-gated
    // to tier 3 (lore.ts) — this is the reward for having filled the page.
    if (e.lore) { var lo = document.createElement("div"); lo.className = "jlore"; lo.textContent = e.lore; card.appendChild(lo); }
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
      // Name EXACTLY what's missing (rome, 2026-07-26): the old line read "Kill
      // and study it more for the hard numbers", which sent a player who'd
      // already killed 83 of a thing off to kill more \\u2014 when kills past the
      // mark do nothing and the account was only ever waiting on one 'study'. A
      // full account is study AND its own number of kills; say which half is
      // short. The number is the SERVER's (lore.killsForAccount, 9 minus the
      // creature's level) and rides on the entry \\u2014 a boss wants three, a rat
      // wants eight, and the client must never hold its own copy of that.
      if (e.tier >= 2) {
        var need = (e.want || 3) - e.kills;
        lk.textContent = !e.studied
          ? (need > 0
            ? "Study one alive, and " + need + " more kill" + (need === 1 ? "" : "s") + ", for the hard numbers."
            : "You've bled it enough. Study one alive \\u2014 that's all the account wants now.")
          : need + " more kill" + (need === 1 ? "" : "s") + " for the hard numbers.";
      } else {
        lk.textContent = "You've watched it, not fought it. Blood fills the rest.";
      }
      card.appendChild(lk);
    }
    jBody.appendChild(card);
  }
  // THE MARKS YOU HAVE MET, at the foot of the book. Grouped by the kind of
  // thing that wears them, because knowing what a mark DOES is only half of it
  // — the other half is where to go looking. The server sends only marks this
  // book has actually seen on a body, so this section is earned, not a
  // catalogue, and it simply is not there until you have met one.
  var marks = f.marks || [];
  if (marks.length) {
    var mw = document.createElement("div");
    mw.className = "jmarks";
    var mh = document.createElement("div");
    mh.className = "jmh";
    mh.textContent = "Marks you have met";
    mw.appendChild(mh);
    for (var m = 0; m < marks.length; m++) {
      var grp = marks[m];
      var gh = document.createElement("div");
      gh.className = "jmk";
      gh.textContent = grp.kind;
      mw.appendChild(gh);
      var rows = grp.traits || [];
      for (var r = 0; r < rows.length; r++) {
        var row = document.createElement("div");
        row.className = "jmr";
        var mn = document.createElement("b");
        mn.textContent = rows[r].name;
        if (rows[r].flaw) mn.className = "jflaw";
        row.appendChild(mn);
        var md = document.createElement("span");
        md.textContent = " \\u2014 " + rows[r].does;
        row.appendChild(md);
        mw.appendChild(row);
      }
    }
    jBody.appendChild(mw);
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

function phoneControls() {
  return window.matchMedia("(pointer: coarse) and (max-width: 1000px), (max-width: 680px)").matches;
}
function submitCommand() {
  var text = cmd.value.trim();
  if (!text) return;
  cmd.value = "";
  sendCmd(text);
}
document.getElementById("phone-send").addEventListener("pointerdown", function (e) {
  if (document.activeElement === cmd) e.preventDefault(); // keep the keyboard for conversation
});
document.getElementById("phone-send").onclick = submitCommand;
document.getElementById("phone-done").onclick = function () { cmd.blur(); };
// With the keyboard overlay, the layout is intentionally taller than the
// visual viewport. Contain one-finger drags in actual scrollable content so
// Safari cannot pan the outer page (including at a log/list scroll boundary).
var phoneTouchX = 0, phoneTouchY = 0;
document.addEventListener("touchstart", function (e) {
  if (e.touches.length !== 1) return;
  phoneTouchX = e.touches[0].clientX;
  phoneTouchY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener("touchmove", function (e) {
  if (!phoneControls() || document.activeElement !== cmd || e.touches.length !== 1 ||
      (window.visualViewport && window.visualViewport.scale !== 1)) return;
  var x = e.touches[0].clientX, y = e.touches[0].clientY;
  var dx = x - phoneTouchX, dy = y - phoneTouchY;
  phoneTouchX = x; phoneTouchY = y;
  if (!dy || Math.abs(dx) > Math.abs(dy)) return; // keep horizontal caret selection
  var el = e.target instanceof Element ? e.target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    var overflow = getComputedStyle(el).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      if ((dy > 0 && el.scrollTop > 0) ||
          (dy < 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return;
    }
    el = el.parentElement;
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });
var phoneLayoutHeight = 0, phoneLayoutWidth = 0;
function syncPhoneViewport() {
  var vv = window.visualViewport;
  if (phoneControls() && vv && vv.scale === 1) {
    // Keep the pre-keyboard game geometry. Only the input moves above the
    // keyboard; shrinking the game would resize the scene and shove its UI up.
    var typing = document.activeElement === cmd;
    if (!typing || !phoneLayoutHeight || phoneLayoutWidth !== window.innerWidth) {
      phoneLayoutHeight = vv.height;
      phoneLayoutWidth = window.innerWidth;
    }
    document.body.style.setProperty("--play-height", Math.round(phoneLayoutHeight) + "px");
    document.body.style.setProperty("--keyboard-cover", Math.max(0, Math.round(phoneLayoutHeight - vv.height)) + "px");
    document.body.style.setProperty("--play-top", Math.round(vv.offsetTop || 0) + "px");
  } else if (!phoneControls()) {
    document.body.style.removeProperty("--play-height");
    document.body.style.removeProperty("--play-top");
    document.body.style.removeProperty("--keyboard-cover");
    phoneLayoutHeight = 0;
  }
  requestAnimationFrame(function () { fitPicture(); });
}
cmd.addEventListener("focus", function () { document.body.classList.add("command-focus"); syncPhoneViewport(); });
cmd.addEventListener("blur", function () { document.body.classList.remove("command-focus"); syncPhoneViewport(); });
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncPhoneViewport);
  window.visualViewport.addEventListener("scroll", syncPhoneViewport);
}
window.addEventListener("resize", syncPhoneViewport);
syncPhoneViewport();

cmd.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    if (e.isComposing) return;
    e.preventDefault();
    submitCommand();
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
  if (t.closest(".signer-connect")) return;
  if (t.closest(MODAL_SURFACES)) return; // modal text must never summon the command keyboard
  var onBtn = t.closest("#idbtn");
  var panel = document.getElementById("idpanel");
  if (!onBtn && panel) panel.classList.remove("open");
  if (onBtn || t.tagName === "BUTTON" || t.tagName === "INPUT") return; // no keyboard steal
  var sel = window.getSelection();
  if (sel && sel.toString()) return; // selecting text from the log — don't wipe it
  if (!phoneControls()) cmd.focus();
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
var signerApp = preferredSignerApp();
idconn.textContent = signerApp ? "signer / " + signerApp : "signer";
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
async function askNewPassphrase(m, title) {
  while (true) {
    var value = await askSecret(title + " Use at least 14 characters; several unrelated words are best.", "seal");
    if (value === null) return null;
    try { m.validatePassphrase(value); return value; }
    catch (e) { print(verr(e), "sys"); }
  }
}
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
  var epoch = identityEpoch, choice = identityChoice;
  try { if (!(await m.isPasskeySupported())) return; } catch (e) { return; }
  if (epoch !== identityEpoch || choice !== identityChoice) return;
  var ok = await askConfirm(
    "Add Face ID / Touch ID as a backup key to this vault, so a forgotten PIN can still get you in?",
    "add Face ID",
  );
  if (!ok) return;
  try {
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    var rp = await m.createRecoveryPasskey(lastName || "wanderer");
    var wrap = await m.wrapDekWithPasskey(dek, rp.prfSecret, rp.credentialId, rp.prfSalt);
    var updated = m.withPasskeyWrap(found.backup, wrap);
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    found.fileId = await m.writeVault(tok, updated, found.fileId || null);
    found.backup = updated;
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
  var epoch = identityEpoch, choice = identityChoice;
  var np1 = await askNewPassphrase(m, "Set a NEW passphrase for this vault? It's the portable key that opens it on your other devices. Cancel to skip \\u2014 you're already in.", "set passphrase");
  if (!np1) return;
  var np2 = await askSecret("The same new passphrase, once more.", "set passphrase");
  if (np1 !== np2) { print("\\u2014 the passphrases disagree; nothing changed \\u2014", "sys"); return; }
  try {
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    var updated = await m.rewrapPin(found.backup, dek, np1);
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    found.fileId = await m.writeVault(tok, updated, found.fileId || null);
    found.backup = updated;
    print("\\u2014 new passphrase set \\u2014", "sys");
  } catch (e) { print("\\u2014 couldn't set new passphrase: " + verr(e) + " \\u2014", "sys"); }
}

// Get into the found vault, or offer the ways out. Returns
// { secret, dek, mode, found, hasBio } or null. mode is "pin" | "recovered" |
// "fresh". Every dead end has an exit: forget the PIN and you get Face ID;
// forget BOTH and you can start over with a new vault. (Starting over erases
// the old key for good — that's the price of a keeper-less, self-custody vault.)
async function openVault(m, tok, found, identity) {
  var hasBio = false;
  try { hasBio = m.hasPasskeyWrap(found.backup); } catch (e) {}
  // Primary door: the PIN. A wrong PIN is almost always a typo, so it just
  // RE-PROMPTS — it never cascades toward creating or replacing a key. Only a
  // deliberate Cancel opens the "other ways in" menu below.
  while (true) {
    var pin = await askSecret("Vault passphrase (or your old PIN) \\u2014 the one you chose when you made it. (Wrong vault, or lost the PIN? Cancel for other ways in.)");
    if (!pin) break; // cancelled → escape menu
    try {
      var dek = await m.unlockDekWithPin(found.backup, pin);
      var secret = await m.decryptNsecFromDek(found.backup, dek);
      return { secret: secret, dek: dek, mode: "pin", found: found, hasBio: hasBio, weakPin: !m.isStrongPassphrase(pin) };
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
        return await openVault(m, tok, { fileId: picked, backup: pb }, identity);
      } catch (e) {
        print("\\u2014 couldn't read that file: " + verr(e) + " \\u2014", "sys");
      }
    }
  }
  if (await askConfirm(
    "Start over with a NEW vault? This ERASES the vault on this Google account \\u2014 its key is lost for good \\u2014 and seals your current wanderer in its place.",
    "start over",
  )) {
    return await replaceVault(m, tok, found, identity);
  }
  return null;
}

// Seal the CURRENT wanderer into a fresh vault, overwriting the old one. The
// only way through when both the PIN and Face ID are lost: the old key can't be
// recovered (by design), so this trades it for a clean start.
async function replaceVault(m, tok, found, identity) {
  identity = identity || { epoch: identityEpoch, choice: identityChoice, secret: nip19.nsecEncode(sk) };
  var epoch = identity.epoch;
  var secret = identity.secret;
  var pin1 = await askNewPassphrase(m, "Choose a passphrase for your NEW vault \\u2014 the only thing that opens it. Nobody can reset it.", "seal");
  if (!pin1) { print("\\u2014 nothing written \\u2014", "sys"); return null; }
  var pin2 = await askSecret("The same passphrase, once more.", "seal");
  if (pin1 !== pin2) { print("\\u2014 the passphrases disagree; nothing written \\u2014", "sys"); return null; }
  if (epoch !== identityEpoch || identity.choice !== identityChoice) throw new Error("Your identity changed; restart the vault operation.");
  var made = await m.createBackup(secret, pin1);
  if (epoch !== identityEpoch || identity.choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
  var fid = await m.writeVault(tok, made.backup, found ? found.fileId : null);
  return { secret: secret, dek: made.dek, mode: "fresh", found: { fileId: fid, backup: made.backup }, hasBio: false };
}

// The one Google door: sign in, then open your Drive vault — or, if there
// isn't one yet, seal THIS wanderer into a new one. Login and backup are the
// same act, because the vault IS the identity. Self-custody: the dungeon never
// holds the key or the PIN.
var vaultBusy = false;
async function continueWithGoogle() {
  if (vaultBusy) return;
  vaultBusy = true;
  cancelPendingBunker();
  var choice = identityChoice;
  var epoch = identityEpoch;
  var secret = nip19.nsecEncode(sk);
  var vaultPk = getPublicKey(sk);
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
        if (!picked) return;
        if (picked) { found = { fileId: picked, backup: await m.readVaultById(tok, picked) }; m.setVaultId(picked); }
      }
    }

    if (found) {
      // Unlock first, sign in, THEN offer any follow-ups — so cancelling an
      // offer never feels like being thrown back to the start.
      var opened = await openVault(m, tok, found, { epoch: epoch, choice: choice, secret: secret });
      if (!opened) { print("\\u2014 the vault stays shut \\u2014", "sys"); return; }
      if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; restart the vault operation.");
      if (importKey(opened.secret)) {
        localStorage.setItem("nomad_vault_pk", getPublicKey(sk));
        print(opened.mode === "fresh"
          ? "\\u2014 a fresh vault sealed; the old one is gone. This wanderer is yours to keep. \\u2014"
          : "\\u2014 the vault opens; you are yourself again \\u2014", "sys");
        // Now signed in. Optional follow-ups: set a fresh PIN if you just
        // recovered by Face ID; otherwise offer to enroll Face ID if there
        // isn't one yet (covers a brand-new vault and a PIN-only login).
        if (opened.mode === "recovered" || opened.weakPin) {
          if (opened.weakPin) print("Your old PIN is weak. Upgrade to a long passphrase to protect your backup.", "sys");
          await offerNewPin(m, tok, opened.found, opened.dek);
        }
        else if (!opened.hasBio) await offerPasskeyRecovery(m, tok, opened.found, opened.dek);
      }
      return;
    }

    // CREATE: no vault — seal the current wanderer into a new one.
    var pin1 = await askNewPassphrase(m, "Choose a passphrase to seal this wanderer into a new Drive vault. It is the ONLY thing that opens it \\u2014 nobody can reset it.", "seal");
    if (!pin1) { print("\\u2014 nothing written \\u2014", "sys"); return; }
    var pin2b = await askSecret("The same passphrase, once more.", "seal");
    if (pin1 !== pin2b) { print("\\u2014 the passphrases disagree; nothing written \\u2014", "sys"); return; }
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    var made = await m.createBackup(secret, pin1);
    if (epoch !== identityEpoch || choice !== identityChoice) throw new Error("Your identity changed; nothing written.");
    // A new vault always creates a file. A remembered id is not authority to
    // overwrite a file that discovery did not successfully open.
    var fid = await m.writeVault(tok, made.backup, null);
    if (epoch !== identityEpoch || choice !== identityChoice) return;
    localStorage.setItem("nomad_vault_pk", vaultPk);
    print("\\u2014 sealed into your Drive. This wanderer is yours to keep; your passphrase brings it back anywhere. \\u2014", "sys");
    await offerPasskeyRecovery(m, tok, { fileId: fid, backup: made.backup }, made.dek);
  } catch (e) {
    print("\\u2014 vault: " + verr(e) + " \\u2014", "sys");
  } finally { vaultBusy = false; }
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
      gstate.textContent = "\\u2713 your key lives in a vault in your own Drive \\u2014 Continue with Google + your passphrase restores it on any device.";
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
var THEME_VARS = ["bg", "panel", "cream", "dim", "gold", "wear", "blood", "bone", "steel", "heal", "omen", "voice", "stone", "border", "border2", "line"];
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
  door:  { stone: "#d3d6d8", bg: "#16120c", panel: "#1e1912", cream: "#ede3cc", dim: "#9a8b66", gold: "#d8a94e", wear: "#d8a94e", blood: "#c96f5a", bone: "#c9bda3", steel: "#a4bec0", heal: "#8faa6b", omen: "#b195c9", voice: "#e79ab6", border: "#3a3020", border2: "#4a3c22", line: "#2c2418" },
  bone:  { stone: "#6f7378", bg: "#e9e1cd", panel: "#efe8d8", cream: "#2c2418", dim: "#7c6f52", gold: "#8a6414", wear: "#8a6414", blood: "#a33c2a", bone: "#57503e", steel: "#3f6470", heal: "#4c6b2c", omen: "#6b4291", voice: "#a5325f", border: "#c6b791", border2: "#a8996f", line: "#d6cbaa" },
  moss:  { stone: "#d3d6d8", bg: "#0a100a", panel: "#111a11", cream: "#cfe3c4", dim: "#6f8a63", gold: "#93d45f", wear: "#d8a94e", blood: "#d4785f", bone: "#a8bf9a", steel: "#9cc2b8", heal: "#5fbf8a", omen: "#c0a3dc", voice: "#eb9cba", border: "#2a3a22", border2: "#39512c", line: "#1c2a16" },
  abyss: { stone: "#d3d6d8", bg: "#0a0d14", panel: "#111624", cream: "#ccd9e8", dim: "#6e82a0", gold: "#7fb4e0", wear: "#d8a94e", blood: "#d06a5a", bone: "#a4b4c8", steel: "#9fc2dc", heal: "#7fc48a", omen: "#b6a2e2", voice: "#e79cbc", border: "#243049", border2: "#2f4160", line: "#171f33" },
  ember: { stone: "#d3d6d8", bg: "#150b07", panel: "#1e110b", cream: "#ecd8c2", dim: "#a37c5e", gold: "#e8873c", wear: "#e8a24c", blood: "#e0563a", bone: "#c8a88e", steel: "#a6b4c4", heal: "#9cba63", omen: "#c9a2c4", voice: "#f2a4c1", border: "#46291a", border2: "#5c3722", line: "#331e12" },
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
  // Rarity rides the same adaptive lightness as names, but a touch deeper on
  // light grounds — the mid-hues (uncommon, legendary) wash out at 36% against
  // a pale page, where the name hues don't (they're darker to start). This is
  // the one place rarity differs from names: it wants legibility on the floor
  // more than it wants to pop, so it dips a little lower in the light.
  document.documentElement.style.setProperty("--rar-s", lightGround ? "66%" : "58%");
  document.documentElement.style.setProperty("--rar-l", lightGround ? "30%" : "68%");
  if (!okColor(c.wear)) document.documentElement.style.setProperty("--wear", ensureContrast("#d8a94e", c.bg, 3.5));
  if (!okColor(c.stone)) document.documentElement.style.setProperty("--stone", lightGround ? "#6f7378" : "#d3d6d8");
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
var doorAtmosphere = (localStorage.getItem("nomad_theme_design") || localStorage.getItem("nomad_door_atmosphere")) === "on";
var doorAtmosphereAvailable = "";
var ornateBorders = localStorage.getItem("nomad_ornate_borders") !== "off";
function syncDoorAtmosphere() {
  document.body.dataset.ornate = ornateBorders ? doorAtmosphereAvailable : "";
  var ornateButton = document.getElementById("ornatebtn");
  ornateButton.textContent = ornateBorders ? "on" : "off";
  ornateButton.setAttribute("aria-checked", String(ornateBorders));
  document.body.dataset.atmosphere = doorAtmosphere ? doorAtmosphereAvailable : "";
  document.getElementById("dooratmorow").hidden = !doorAtmosphereAvailable;
  var button = document.getElementById("dooratmobtn");
  button.textContent = doorAtmosphere ? "on" : "off";
  button.setAttribute("aria-checked", String(doorAtmosphere));
}
document.getElementById("ornatebtn").addEventListener("click", function () {
  ornateBorders = !ornateBorders;
  localStorage.setItem("nomad_ornate_borders", ornateBorders ? "on" : "off");
  syncDoorAtmosphere();
});
document.getElementById("dooratmobtn").addEventListener("click", function () {
  doorAtmosphere = !doorAtmosphere;
  localStorage.setItem("nomad_theme_design", doorAtmosphere ? "on" : "off");
  syncDoorAtmosphere();
});
function setTheme(name, colors) {
  doorAtmosphereAvailable = THEMES[name] && !colors ? name : "custom";
  syncDoorAtmosphere();
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
        doorAtmosphereAvailable = "custom";
        syncDoorAtmosphere();
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
// ONE STAMP PER KIND OF PICTURE, NOT ONE FOR ALL OF THEM.
//
// This was a single ART_V appended to every asset URL in the game, and that is
// a cache-buster that busts the wrong caches. A version in the query string
// makes a NEW URL, and the assets come back "immutable, max-age=1 year", so
// bumping the number tells every browser it has never seen any of it before.
//
// Measured on the 2026-09-14 ship: twenty-two mob strips changed and the bump
// re-downloaded 111MB — 251 room plates and 9 skies that were byte-for-byte
// what the player already had. A plate is ~400KB and takes several seconds on
// an ordinary line, so every room walked into after an art deploy paid for a
// picture it already owned. That is what "everything feels slightly delayed"
// was, and it would have happened on every art ship from here on.
//
// So the stamp is split by what it protects. Change a mob and mobs re-download;
// the plates and the skies are untouched. BUMP THE ONE YOU REPLACED — and only
// when a filename that already exists gets new content, since a new filename
// needs no bust at all.
var MOB_V  = "45";      // /mob/      strips and their eye layers
var BG_V   = "33";      // /room-bg/  the room plates - 91MB, the expensive one
var SKY_V  = "30";      // /sky/      the nine skies
var CARD_V = "30";      // /card-bg/ and /door-bg/  the threshold paintings
var BUILD = "__BUILD__";        // stamped at serve time; compared against the world's

// ---------------------------------------------------------------------------
// THE VIEW. A band of country per region, washed by whatever the sky is doing.
//
// EIGHT PLATES, ELEVEN BANDS: the pictures here are the threshold's own scenes,
// already painted, already in the right world, already cached by every player
// who has ever seen the door. So picture mode works TODAY, coarse — one plate a
// region rather than one a terrain — and when real per-terrain plates exist they
// drop in behind this same table and nothing else moves.
//
// THE LOOKUP IS THE SECURITY. The band and sky values arrive from the server as bare
// strings and are used ONLY as keys into these two tables. Nothing from the wire
// is ever concatenated into a URL, so the worst a bad value can do is miss and
// paint nothing. The log stays textContent-only either way — the scene is its
// sibling, never its content.
// (Kept for the threshold only — these are the LOGIN backdrops and no longer
// paint any room. See paintScene: room art comes from /room-bg alone.)
var BAND_PLATE = {
  // ONLY PLATES THAT ARE A PLACE. The threshold's scene set was painted to sit
  // behind a login screen, and three of the eight assert something a room may
  // not be: drake and hound each have a CREATURE in them, and rain has weather
  // of its own that would argue with the sky the server just reported. A
  // backdrop that claims a drake is on the summit of every mountain room is
  // worse than no backdrop, so those three are not here, and a band with no
  // honest plate paints the bare ground instead of lying.
  //
  // Which leaves the mountain — the single biggest region in the world, 399
  // rooms — with nothing. That is not a gap to paper over with the nearest
  // wrong picture. It is the argument for the real per-terrain set.
  deep: "torch",         // no sky down here; the light is one you carry
  upper: "torch",
  gate: "torch",
  warrens: "warrens",
  den: "warrens",
  wood: "wood",
  crossing: "holdings",  // roofs, a bridge, somewhere people meant to stay
  road: "bellcote",
  sky: "bellcote",
};
// THE PLATES THAT EXIST. Keyed by terrain, which is finer than band: the
// mountain alone is scree and snow and glazed rock and a beck, and painting one
// picture across all 398 of its rooms was never going to read as a place. A
// terrain with no plate yet falls back to its band, and a band with no plate
// paints bare ground — so the set can land one picture at a time and the game
// is never wrong in the meantime, only sparse.
// EACH TERRAIN IS A LIST, not one picture. Seven plates over 398 mountain rooms
// put a hundred and thirty-two of them under the SAME image, and a world where
// every third room is the same photograph is not a world you believe. So a
// terrain owns as many plates as have been painted for it, and a room picks one
// by hashing its own name: stable, so a place always looks like itself; spread,
// so its neighbours do not. Adding "scree-2" here is the entire cost of killing
// the repetition — no server change, no migration, nothing else moves.
var TERRAIN_PLATE = {
  scree: ["scree"], gully: ["gully"], snow: ["snow"], cairn: ["cairn"],
  alder: ["alder"], "corrie-rim": ["corrie-rim"], "corrie-floor": ["corrie-floor"],
  gatehouse: ["gatehouse"],
  // THIS TABLE IS WHAT DECIDES A TERRAIN EXISTS AT ALL, and four grounds were
  // painted, cut, installed and declared in TERRAIN_SCENES without ever being
  // named here — so every boulder field, tilted slab, glazed rock and stone pen
  // in the world went on falling through TERRAIN_NEAR onto scree and cairn. All
  // that art was sitting on disk unreachable. Add a ground to BOTH tables or it
  // may as well not have been drawn.
  boulder: ["boulder"], slab: ["slab"], glass: ["glass"], fold: ["fold"],
  // THE ORDINARY HILL (rome, 2026-09-10). Not a ground anything matches — it is
  // what you get when nothing does, and it is deliberately nothing
  // in particular: a broad open shoulder of frost-shattered rock and wind-burnt
  // turf, no path, no cairn, no built thing. Thirty-nine mountain rooms whose
  // names and descriptions never say what they are standing on have been wearing
  // the scree plate, which is a specific ground and was answering a question
  // they never asked.
  //
  // IT GETS NO TERRAIN_RULES ENTRY, and that is the point of it. Give a
  // catch-all a regex and it starts taking rooms off the named grounds, which is
  // the opposite of what a default is for. It is reached only through
  // BAND_FALLBACK below, which fires when a room has no terrain at all.
  mountainside: ["mountainside"],
  // THE ROAD'S THREE AGES (2026-09-20), and they went in here a ship late. The
  // grounds were drawn, cut, installed and declared in TERRAIN_SCENES, the
  // server was taught to name them - and none of it reached a player, because
  // this is the table that decides a terrain exists at all and it had never
  // heard of them. The note above says add a ground to BOTH tables or it may as
  // well not have been drawn. It was right, and I read it and wired one.
  "the-kept-road": ["the-kept-road"],
  "the-frost-heaved-paving": ["the-frost-heaved-paving"],
  "the-cart-ruts": ["the-cart-ruts"],
  // THE LAST THREE GROUNDS ON THE HILL (rome, 2026-09-10). Every one of them was
  // a real terrain the rules already named and the art never answered, so each
  // has been wearing a stand-in out of TERRAIN_NEAR below: 52 rooms of face and
  // buttress drawn as a drain, 18 rooms of running water drawn as the same
  // drain, and the whole geothermal ground — the one genuinely strange terrain
  // the mountain has — drawn as a scree slope.
  crag: ["crag"], beck: ["beck"], vent: ["vent"],
  // THE FIRST GROUND OUTSIDE THE MOUNTAIN (2026-09-11). It reaches nothing in
  // the game yet — the crossing is not in BANDS_WITH_PLATES, so no room in that
  // region asks for a picture at all — but naming it here is what puts it in
  // front of the preview, which is where a plate is judged before it is trusted.
  causeway: ["causeway"], ford: ["ford"],
  // AND THE DEEP WATER AND THE WORKING SHORE (2026-09-12), which takes the
  // crossing to four grounds of eleven. The ferry is the rope stage over the
  // channel; the staithe is the hard, the pots and the drying nets.
  ferry: ["ferry"], staithe: ["staithe"],
  // AND THREE MORE (2026-09-12), which takes the crossing to seven grounds of
  // eleven. The bridge is the pier tops and the plank; the marsh is the samphire
  // flats behind the creeks; the shell is the shingle and its wrack line.
  bridge: ["bridge"], marsh: ["marsh"], shell: ["shell"],
  // AND THE LAST FOUR, which finishes the crossing: eleven grounds, 217 rooms,
  // nothing left wearing a stand-in.
  reed: ["reed"], eyot: ["eyot"], "shore-road": ["shore-road"],
  works: ["works"],
  "sea-cave": ["sea-cave"],
};
// FNV-1a: the same cheap trick the world already uses to hang per-instance
// detail off an id without storing a byte of it.
function plateHash(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// AND WHAT A BAND FALLS BACK TO when the room's own ground has no picture yet.
// The mountain is 398 rooms across a dozen kinds of ground and has seven plates,
// so without this two rooms in three paint NOTHING — and a blank window reads as
// a broken feature, not as an honest gap. The open bare shoulder is the closest
// thing the set has to "generic mountain", so it holds the line until the real
// default exists. Approximate beats absent; only WRONG loses to absent.
// AND WHEN A TERRAIN HAS NO PLATE, THE NEAREST ONE THAT DOES. Falling every
// unpainted terrain onto "cairn" made two rooms in three the same bare shoulder,
// which is how a working feature comes to look broken: the picture stops
// answering the room. A beck is a rock channel with water in it and the gully
// already IS that; a boulder field is loose stone at a larger size and the scree
// already IS that. These are stand-ins chosen on what the ground DOES, and each
// one retires the moment its own plate lands.
// THREE ENTRIES RETIRED, 2026-09-10: beck -> gully, crag -> gully and
// vent -> scree are gone, because all three now have plates of their own and the
// note above always said a stand-in retires the moment its own ground lands.
// Nothing depended on them being here — TERRAIN_PLATE is consulted first, so the
// new plates would have won anyway — but a stand-in left in this table is a
// claim that the ground has no picture, and that claim is now false.
var TERRAIN_NEAR = {
  boulder: "scree",
  // Warm flags, glazed rock and steaming ground are all BARE STONE, and the
  // cairn plate is a grassy shoulder — it was the worst possible stand-in for
  // the hottest, barest ground on the hill. Scree at least agrees about what
  // the ground is made of.
  slab: "scree", glass: "scree", fold: "cairn",
};
// And an unclassified mountain room is bare rock before it is pasture.
// ...AND WHAT AN UNNAMED ROOM IN THAT BAND STANDS ON. It was "scree" — the
// nearest thing the set owned to generic hill, and still a specific ground: a
// slope of loose broken stone, given to thirty-nine rooms that never said they
// were on one. The mountainside plate exists for exactly this slot.
// ...and on the road it is the road. ROAD_RULES ends in a catch-all so no road
// room reaches this by having no terrain; it is here for the other caller, a
// road gate whose plate has not been cut yet.
var BAND_FALLBACK = { mountain: "mountainside", crossing: "shell", road: "the-kept-road" };
// WHICH BANDS OWN PICTURES AT ALL. Add a band here only once plates exist for
// it — this is the one line that stops a region wearing another region's face.
// AND THE CROSSING JOINS IT (2026-09-12). This one line is what the region's
// eighty-four plates were waiting on, and without it every one of them was dead
// weight on the edge: terrain resolves to "" for any band not named here, so a
// crossing room asked for no picture at all and got none. The art had been
// shipping for a day and reaching nobody.
// THE SERVER HAD TO LEARN THE GROUND FIRST, which is the other half and the half
// that could not be a one-liner. terrainOf is what decides WHICH ground a room
// is, it lives on the server, and it had never heard of a causeway or a staithe
// - so switching this on alone would have painted a hundred and twelve crossing
// rooms as crag, scree and snowfield. See CROSSING_RULES in zone-data.ts.
// AND THE ROAD JOINS IT (2026-09-20) - the same one-line switch, missed the same
// way the crossing's nearly was. Its forty-two plates shipped, deployed and
// reached nobody: terrain resolves to "" for any band not named here, so every
// room on the road asked for no picture at all and got none. The art was live
// on the edge for a ship and invisible in the game.
var BANDS_WITH_PLATES = { mountain: 1, crossing: 1, road: 1 };
// THE FOURTEEN DOORS. A gate is the one room in its region that is not its
// region: a specific built thing, with a keeper's shuttered hatch in the wall of
// it, standing on whatever ground happens to be there. No terrain rule can see
// that — the stell classified as a fold and the ferry house as a beck, and both
// were handed a hillside. So the server names a gate by its own id and this is
// the mapping; a gate whose plate is not cut yet is simply absent here and falls
// back to its terrain like any other room. Band never enters into it: a door
// looks like a door in a country with no pictures at all.
// AN ID GOES IN HERE WHEN ITS SCENE EXISTS, and not before, so a gate still
// waiting keeps the fallback it has today instead of painting a hole.
//
// A SCENE HAS NO SKY IN IT. That is the whole architecture and it is what makes
// the art finite. The scene is cut out — building, ground, hills, everything
// solid — and saved as a PNG with nothing where the sky was; the sky is a
// SEPARATE picture drawn behind it. So the hours are painted ONCE for the whole
// world, not once per room: nine skies total, and they sit behind all 1,186
// rooms. A room costs one picture, not nine, and adding a room costs one more.
//
// Weather that is only in the air — the hour, the moon, fog — is the sky
// changing behind an unchanged scene. Weather that is on the GROUND is not:
// rain darkens and wets the stone and snow lies on it, and no sky behind a dry
// scene will ever look wet. Those get their own scene photo, and the value here
// lists which of them were painted. Empty means the base scene answers every
// sky on its own.
//   "the-relay-house": "rain snow",
// "night-torch" IS A SIXTH CONDITION, and it belongs in this table rather than
// in the sky list because it is a photograph of the ground, not of the air. A
// plate that has one is shown it whenever you are standing in the dark with a
// flame of your own; a plate that has not been shot that way is simply not
// listed and keeps its ordinary night, which is what it looked like yesterday.
// AND THE ROOMS THAT ARE ONE OF ONE. Same law as the gate table and the terrain
// table: a name goes in here when its plate has been cut, and not before. Until
// then the server names the room, this table misses, and the ground rules answer
// exactly as they did — so the three below can land one at a time.
//
// The value is the file stem, so a plate is public/room-bg/<stem>-<condition>.webp
// and the conditions listed are the ones that were actually shot.
//   "the-summit": "day night night-torch fog rain snow",
var ROOM_PLATE = {
  // The top of the mountain, and the two rooms of the approach to it. All three
  // were being answered by the ground rules and answered wrongly — the Summit
  // was painted as a snowfield by a room whose own text says there is no snow
  // in it, and the other two matched "vent" on their warm air and were handed a
  // bare scree slope.
  "the-summit":       "day night night-torch fog rain snow",
  "the-summit-gate":  "day night night-torch fog rain snow",
  // TWO CONDITIONS, AND NO DAY AT ALL (rome, 2026-09-09). It was three, and the
  // third was a lie: this is a hole under a fallen block with one slot in it,
  // and there is no hour at which the inside of it is a daylit room. The slot
  // gets bright, the room does not. So the interior is always the dark plate and
  // what changes with the hour is the SKY BEHIND THE SLOT — at noon that is the
  // day sky in a dark hole, which is what standing in there actually looks like.
  //
  // The other three conditions stay unshot for the older reason: under a roof
  // they would be three photographs spent on the light in one slot. See
  // SHELTERED and WEATHER_FROM_INSIDE.
  "the-last-shelter": "night night-torch",
  // THE LION'S GROUND. Three rooms of the bone fan, shot as open hillside and
  // cut on the skyline like every other outdoor plate.
  "the-dry-bones":    "day night night-torch fog rain snow",
  "the-rib-cage":     "day night night-torch fog rain snow",
  "the-ochre-shelf":  "day night night-torch fog rain snow",
  // THE RIDDLE DOOR'S ROOM. Six conditions like any hillside, but the only plate
  // in the game with NO SKY IN IT: you are at the foot of seven hundred feet of
  // wall that leans over you, so the rock runs off the top of the frame and the
  // shared sky is drawn behind an opaque picture and never seen. That costs
  // nothing and is the honest composition — the room says there is no way up.
  "the-back-wall":    "day night night-torch fog rain snow",
  // AND WHAT IS BEHIND IT. One plate, and one is the whole set: the room reports
  // sky "in", SKY_BASE maps that to the day slot, and "in" is not in TORCH_HOURS
  // so no flame ever swaps it. It is also in DARK_ROOMS, which means nobody has
  // ever seen this room without a light in their hand — so the single plate is
  // painted already lit by the torch you must be carrying to be standing in it.
  "the-kept-room":    "day",
  // TWO ROOMS THAT BORROW. Same conditions as the plate they point at — see
  // PLATE_OF below for why they are not simply copies of the files.
  "the-bone-ground":  "day night night-torch fog rain snow",
  "the-oxide-flat":   "day night night-torch fog rain snow",
  // THE CRAB'S LAIR (2026-09-12). Two conditions and that is the whole set it
  // can have: the back of a sea cave has no sky over it and no weather in it, so
  // night is the pool without a torch and night-torch is the pool with one. The
  // room branch already handles a plate with no day - it falls back to the first
  // condition listed, and a plate that resolved to "night" counts as dark enough
  // for a flame - so unlike the ground table this needed no code to go with it.
  "the-salt-pool":    "night night-torch",
  // THE DEEP MARK (2026-09-14). A depth post on an open mudflat with the tide
  // door buried at the foot of it - out under the whole sky, so it takes the
  // full six where the two interiors above take two.
  "the-deep-mark":    "day night night-torch fog rain snow",
  // ---- THE FORTRESS, 108 ROOMS ON 31 PLATES (2026-09-23). The Door is the
  // oldest region in the game and the last with no picture of itself. Its four
  // doors already had gate plates; everything behind them was painted as a kind
  // of ground rather than a room, and most of it is not ground at all.
  //
  // A plate here is a KIND OF PLACE, not a room: PLATE_OF below points every
  // room at the one it shares. The grounds and the overworks are outdoors and
  // take the full six; everything under them has no sky and takes NIGHT, which
  // is the room lit by the torches burning in it. The eleven rooms in
  // DARK_ROOMS take a second plate, NIGHT-TORCH, and those two are the same
  // photograph lit twice - the room as your own flame shows it, and the room
  // with no light in it at all, which is very nearly a black frame.
  "the-causeway":           "day night night-torch fog rain snow",
  "the-old-road":           "day night night-torch fog rain snow",
  "the-sally-ditch":        "day night night-torch fog rain snow",
  "the-gatefall":           "day night night-torch fog rain snow",
  "the-wall-breach":        "day night night-torch fog rain snow",
  "the-dry-moat":           "day night night-torch fog rain snow",
  "the-thorn-court":        "day night night-torch fog rain snow",
  "the-briar-field":        "day night night-torch fog rain snow",
  "the-mass-grave":         "day night night-torch fog rain snow",
  "the-hanging-hill":       "day night night-torch fog rain snow",
  "the-black-fen":          "day night night-torch fog rain snow",
  "the-drowned-orchard":    "day night night-torch fog rain snow",
  "the-burned-village":     "day night night-torch fog rain snow",
  "the-wall-walk":          "day night night-torch fog rain snow",
  "the-broken-battlement":  "day night night-torch fog rain snow",
  "the-rotted-scaffold":    "day night night-torch fog rain snow",
  "the-watch-turret":       "day night night-torch fog rain snow",
  "the-bell-cote":          "day night night-torch fog rain snow",
  "the-leaning-spire":      "day night night-torch fog rain snow",
  "the-weepers-crown":      "day night night-torch fog rain snow",
  "stair":                  "night",
  "crypt-steps":            "night",
  "weeper-hall":            "night",
  "hollow-crack":           "night",
  "ossuary":                "night",
  "catacomb":               "night",
  "larder":                 "night",
  "smokehouse":             "night",
  "scullery":               "night",
  "cistern":                "night",
  "forge":                  "night",
  "well":                   "night",
  "barracks":               "night",
  "guardroom":              "night",
  "kennels":                "night",
  "warden-post":            "night",
  "cells":                  "night",
  "debtors-pit":            "night",
  "oubliette":              "night",
  "library":                "night",
  "scriptorium":            "night",
  "chapter-house":          "night",
  "gallery":                "night",
  "chapel":                 "night",
  "shrine":                 "night",
  "hall":                   "night",
  "muster":                 "night",
  "refectory":              "night",
  "undercroft":             "night",
  "armory":                 "night",
  "the-issue-room":         "night",
  "sewer":                  "night",
  "the-root-gnawed-run":    "night night-torch",
  "a-dry-burrow":           "night night-torch",
  "bone-nook":              "night night-torch",
  "the-crawl-of-teeth":     "night night-torch",
  "the-rat-warren":         "night",
  "the-gnaw-hollow":        "night",
  "the-hyena-den":          "night",
  "the-bone-midden":        "night",
  "the-undermine":          "night night-torch",
  "the-dripping-gallery":   "night night-torch",
  "the-sewer-slip":         "night night-torch",
  "the-earth-throat":       "night night-torch",
  "the-buried-chapel":      "night",
  "the-descent":            "night night-torch",
  "silted-stair":           "night night-torch",
  "the-marrow-road":        "night night-torch",
  "the-lightless-march":    "night night-torch",
  "bone-processional":      "night night-torch",
  "worm-cloister":          "night night-torch",
  "worm-bore":              "night night-torch",
  "the-undertow":           "night night-torch",
  "black-canal":            "night night-torch",
  "drowned-court":          "night",
  "drowned-nave":           "night",
  "sunken-gallery":         "night",
  "drowned-barracks":       "night",
  "kings-oratory":          "night",
  "the-cold-hearth":        "night",
  "deep-ossuary":           "night",
  "bone-reliquary":         "night",
  "carrion-gallery":        "night",
  "weeping-cells":          "night",
  "the-death-cell":         "night",
  "the-sump":               "night",
  "the-weir":               "night",
  "the-cistern":            "night",
  "leech-pools":            "night",
  "sunless-well":           "night",
  "root-vault":             "night",
  "tide-vault":             "night",
  "pocket-of-air":          "night",
  "blackreach":             "night night-torch",
  "the-gasping-dark":       "night night-torch",
  "black-threshold":        "night night-torch",
  "sunken-throne":          "night",
  "kings-hoard":            "night",
  "the-tide-gate":          "night night-torch",
  "the-tide-throat":        "night night-torch",
  "the-long-swallow":       "night night-torch",
  "the-still-cradle":       "night night-torch",
  "the-under-weir":         "night night-torch",
  "the-drowning-stair":     "night night-torch",
  "the-eel-run":            "night night-torch",
  "the-salt-vault":         "night night-torch",
  "the-silt-chapel":        "night night-torch",
  "the-breathing-hall":     "night",
};
// A PLATE MAY BE SHARED (rome, 2026-09-09). A room plate's file stem has always
// been the room id, so two rooms that look the same meant two copies of six
// photographs — twelve files and four megabytes to say a thing twice. This says
// it once instead: the room is still named in its own right, and the picture it
// reaches for is somebody else's.
//
// ONLY WHERE IT IS HONEST, which is a narrower test than "nearby". Of the eleven
// rooms around the Ochre Shelf, ten are slopes, gullies, slots or a view out
// over country, and its picture is flat open ground — it would be wrong in all
// of them. The Oxide Flat is a flat pavement of red rock and it is right.
// The Bone Ground is the stronger of the two, and it reads better in the
// borrowed plate than the plate's own room does: the Dry Bones is bone gone
// chalky and crumbling to powder, while the picture is full of solid ribs, a
// horn and a skull — which is the Bone Ground's own sentence, word for word.
var PLATE_OF = {
  "the-bone-ground": "the-dry-bones",
  "the-oxide-flat":  "the-ochre-shelf",
  // ---- THE FORTRESS. One plate serves every room of a kind, which is the only
  // reason 108 rooms cost 31 pictures. The stem is the plate; the key is the room.
  "the-causeway":           "fort-approach",
  "the-old-road":           "fort-approach",
  "the-sally-ditch":        "fort-approach",
  "the-gatefall":           "fort-wall",
  "the-wall-breach":        "fort-wall",
  "the-dry-moat":           "fort-wall",
  "the-thorn-court":        "fort-waste",
  "the-briar-field":        "fort-waste",
  "the-mass-grave":         "fort-waste",
  "the-hanging-hill":       "fort-waste",
  "the-black-fen":          "fort-drowned",
  "the-drowned-orchard":    "fort-drowned",
  "the-wall-walk":          "fort-overworks",
  "the-broken-battlement":  "fort-overworks",
  "the-rotted-scaffold":    "fort-overworks",
  "the-watch-turret":       "fort-overworks",
  "the-bell-cote":          "fort-overworks",
  "the-leaning-spire":      "fort-overworks",
  "the-weepers-crown":      "fort-overworks",
  "stair":                  "keep-passage",
  "crypt-steps":            "keep-passage",
  "weeper-hall":            "keep-passage",
  "hollow-crack":           "keep-passage",
  "ossuary":                "keep-passage",
  "catacomb":               "keep-passage",
  "larder":                 "keep-store",
  "smokehouse":             "keep-store",
  "scullery":               "keep-store",
  "cistern":                "keep-store",
  "forge":                  "keep-store",
  "well":                   "keep-store",
  "barracks":               "keep-quarters",
  "guardroom":              "keep-quarters",
  "kennels":                "keep-quarters",
  "warden-post":            "keep-quarters",
  "cells":                  "keep-holes",
  "debtors-pit":            "keep-holes",
  "oubliette":              "keep-holes",
  "library":                "keep-letters",
  "scriptorium":            "keep-letters",
  "chapter-house":          "keep-letters",
  "gallery":                "keep-letters",
  "chapel":                 "keep-worship",
  "shrine":                 "keep-worship",
  "muster":                 "keep-great",
  "refectory":              "keep-great",
  "the-root-gnawed-run":    "warren-run",
  "a-dry-burrow":           "warren-run",
  "bone-nook":              "warren-run",
  "the-crawl-of-teeth":     "warren-run",
  "the-rat-warren":         "warren-den",
  "the-gnaw-hollow":        "warren-den",
  "the-hyena-den":          "warren-den",
  "the-bone-midden":        "warren-den",
  "the-undermine":          "warren-mine",
  "the-dripping-gallery":   "warren-mine",
  "the-sewer-slip":         "warren-mine",
  "the-earth-throat":       "warren-mine",
  "the-descent":            "deep-passage",
  "silted-stair":           "deep-passage",
  "the-marrow-road":        "deep-passage",
  "the-lightless-march":    "deep-passage",
  "bone-processional":      "deep-passage",
  "worm-cloister":          "deep-passage",
  "worm-bore":              "deep-passage",
  "the-undertow":           "deep-passage",
  "black-canal":            "deep-passage",
  "drowned-court":          "deep-hall",
  "drowned-nave":           "deep-hall",
  "sunken-gallery":         "deep-hall",
  "drowned-barracks":       "deep-hall",
  "kings-oratory":          "deep-hall",
  "the-cold-hearth":        "deep-hall",
  "deep-ossuary":           "deep-bone",
  "bone-reliquary":         "deep-bone",
  "carrion-gallery":        "deep-bone",
  "weeping-cells":          "deep-bone",
  "the-death-cell":         "deep-bone",
  "the-sump":               "deep-water",
  "the-weir":               "deep-water",
  "the-cistern":            "deep-water",
  "leech-pools":            "deep-water",
  "sunless-well":           "deep-water",
  "root-vault":             "deep-water",
  "tide-vault":             "deep-water",
  "pocket-of-air":          "deep-water",
  "blackreach":             "deep-dark",
  "the-gasping-dark":       "deep-dark",
  "black-threshold":        "deep-dark",
  "sunken-throne":          "kings-rooms",
  "kings-hoard":            "kings-rooms",
  "the-tide-gate":          "tideway-throat",
  "the-tide-throat":        "tideway-throat",
  "the-long-swallow":       "tideway-throat",
  "the-still-cradle":       "tideway-throat",
  "the-under-weir":         "tideway-works",
  "the-drowning-stair":     "tideway-works",
  "the-eel-run":            "tideway-works",
  "the-salt-vault":         "tideway-works",
  "the-silt-chapel":        "tideway-works",
};
// AND WHICH OF THEM THE WEATHER DOES NOT REACH (rome, 2026-09-08).
//
// The gatehouse has had this rule since the day it was painted — whatever is
// happening outside stops at the door — but it lives in the old single-plate
// branch and a room plate goes through the layered one, so a sheltered room
// would have been washed with rain it cannot feel.
//
// It is not the same thing as being INDOORS to the world. The Last Shelter is a
// hole under a fallen block on an open mountain: the world rightly counts it
// outdoors, so it goes dark at night and the cold finds you there. What stops at
// the stone is the PICTURE of the weather. Rain cannot change a room with a roof
// on it; all it can change is the light in the slot you can see out of, which is
// a sixth of the frame and not worth three photographs.
//
// So a sheltered plate takes no hour or weather correction at all, and the
// creatures standing in it read the plate's own condition rather than the sky
// outside. The sky layer is still drawn — that is the whole point of the slot.
var SHELTERED = {
  "the-last-shelter": 1,
  // ---- THE FORTRESS UNDERGROUND (2026-09-23). Not a roof with a slot in it
  // like the shelter above - no opening at all, and a great deal of stone. The
  // hour cannot reach these rooms, so they must take no hour correction: a
  // torchlit cellar washed to dusk is a picture of nothing.
  "stair": 1,
  "crypt-steps": 1,
  "weeper-hall": 1,
  "hollow-crack": 1,
  "ossuary": 1,
  "catacomb": 1,
  "larder": 1,
  "smokehouse": 1,
  "scullery": 1,
  "cistern": 1,
  "forge": 1,
  "well": 1,
  "barracks": 1,
  "guardroom": 1,
  "kennels": 1,
  "warden-post": 1,
  "cells": 1,
  "debtors-pit": 1,
  "oubliette": 1,
  "library": 1,
  "scriptorium": 1,
  "chapter-house": 1,
  "gallery": 1,
  "chapel": 1,
  "shrine": 1,
  "hall": 1,
  "muster": 1,
  "refectory": 1,
  "undercroft": 1,
  "armory": 1,
  "the-issue-room": 1,
  "sewer": 1,
  "the-root-gnawed-run": 1,
  "a-dry-burrow": 1,
  "bone-nook": 1,
  "the-crawl-of-teeth": 1,
  "the-rat-warren": 1,
  "the-gnaw-hollow": 1,
  "the-hyena-den": 1,
  "the-bone-midden": 1,
  "the-undermine": 1,
  "the-dripping-gallery": 1,
  "the-sewer-slip": 1,
  "the-earth-throat": 1,
  "the-buried-chapel": 1,
  "the-descent": 1,
  "silted-stair": 1,
  "the-marrow-road": 1,
  "the-lightless-march": 1,
  "bone-processional": 1,
  "worm-cloister": 1,
  "worm-bore": 1,
  "the-undertow": 1,
  "black-canal": 1,
  "drowned-court": 1,
  "drowned-nave": 1,
  "sunken-gallery": 1,
  "drowned-barracks": 1,
  "kings-oratory": 1,
  "the-cold-hearth": 1,
  "deep-ossuary": 1,
  "bone-reliquary": 1,
  "carrion-gallery": 1,
  "weeping-cells": 1,
  "the-death-cell": 1,
  "the-sump": 1,
  "the-weir": 1,
  "the-cistern": 1,
  "leech-pools": 1,
  "sunless-well": 1,
  "root-vault": 1,
  "tide-vault": 1,
  "pocket-of-air": 1,
  "blackreach": 1,
  "the-gasping-dark": 1,
  "black-threshold": 1,
  "sunken-throne": 1,
  "kings-hoard": 1,
  "the-tide-gate": 1,
  "the-tide-throat": 1,
  "the-long-swallow": 1,
  "the-still-cradle": 1,
  "the-under-weir": 1,
  "the-drowning-stair": 1,
  "the-eel-run": 1,
  "the-salt-vault": 1,
  "the-silt-chapel": 1,
  "the-breathing-hall": 1,
};
// AND WHAT WEATHER LOOKS LIKE FROM UNDER ONE (rome, 2026-09-08). A sheltered
// room takes no weather plate, but that does not mean weather changes nothing:
// there is a slot, and what comes through it is the whole of the light in there.
//
// Rain, fog and snow are dark grey days. Seen from inside a hole they do two
// things and neither of them is a wash over the picture: the room goes DARK, so
// it takes its night plate, and the slot goes GREY, so the after-rain sky is
// drawn behind it — the one bright overcast sky the game owns, and the closest
// thing to weather-seen-from-indoors without shooting three more plates for a
// sixth of a frame. A dark hole with grey light in the gap.
//
// AND THE AFTERMATH IS ONE OF THEM (rome, 2026-09-08). It is the odd entry here
// because it is not weather at all — it is the phase after the rain, and out on
// the hill it is a bright churned grey day that keeps the DAY ground. Under a
// roof that distinction stops mattering: overcast is overcast, and a hole with
// a slot in it is dim under any of the four. It is also the only one whose slot
// sky was already right, so it costs nothing but the darkening.
var WEATHER_FROM_INSIDE = { rain: 1, fog: 1, snow: 1, "after-rain": 1 };
var GATE_PLATE = {
  "the-relay-house":  "day night night-torch fog rain snow",
  "the-shieling":     "day night night-torch fog rain snow",
  "the-stell":        "day night night-torch fog rain snow",
  "the-slabs":        "day night night-torch fog rain snow",
  "the-shelter-crag": "day night night-torch fog rain snow",
  // THE CROSSING'S TWO (2026-09-12), and they are a matched pair on purpose: the
  // region's own notes say the far bank repeats the near bank exactly, and the
  // ferry house's description says the same arrangement holds on both sides. One
  // is a shingle yard with a wrecked boat and a rope-drum, the other a cobbled
  // yard with a well and empty stabling, and both carry the lit hatch every
  // gatehouse in the world has.
  "the-ferry-house":    "day night night-torch fog rain snow",
  "the-crossing-house": "day night night-torch fog rain snow",
  // THE FORTRESS'S OWN TWO, AND THE WEST ROAD'S GATE (2026-09-20). The first
  // two are the oldest doors in the game and were the last without a picture:
  // the gate every player has walked in through, and the postern the beck line
  // leaves by. The third is the second gatehouse on the road - the west road's,
  // where the Relay House is the east's - and it is a milestone with a house
  // grown onto it rather than a yard with a wall round it.
  "gate":                "day night night-torch fog rain snow",
  "sally-port":          "day night night-torch fog rain snow",
  "the-first-milestone": "day night night-torch fog rain snow",
  // AND THE LAST FOUR (2026-09-21). Every door in the world now has a picture
  // of itself, which is the first time that has been true: the weeper arch on
  // the mountain, the gate arch, the timber stack and the withy hut. The
  // "still unpainted" list that stood here is gone because there is nothing
  // left to put in it.
  "weeper-arch":         "day night night-torch fog rain snow",
  "the-gate-arch":       "day night night-torch fog rain snow",
  "the-timber-stack":    "day night night-torch fog rain snow",
  "the-withy-hut":       "day night night-torch fog rain snow",
};
// The nine skies, painted once, shared by every scene in the game. A sky that
// has not been painted yet leaves the scene on the flat ground colour and takes
// the old wash instead, so this fills in one file at a time.
// THE SAME TABLE FOR GROUND AS FOR DOORS. A terrain plate is shared by every
// room of that ground — which is the only reason 1,185 rooms do not cost 1,185
// pictures — so it earns its scenes exactly the way a gate does: name the ones
// that were painted, and the four hours that reuse a scene come free. A terrain
// listed here is layered; one that is not keeps the old single JPEG with a wash
// over it, so the eight already shipped go on working untouched.
//   scree: "day night",
var TERRAIN_SCENES = {
  // Eleven mountain grounds, 256 rooms between them — and since 2026-09-08 all
  // eleven carry a torch-lit night. The gully was the last one waiting; there is
  // no ground left on the mountain that goes dark under a flame.
  snow:  "day night night-torch fog rain snow",
  cairn: "day night night-torch fog rain snow",
  gully: "day night night-torch fog rain snow",
  scree: "day night night-torch fog rain snow",
  boulder: "day night night-torch fog rain snow",
  slab:  "day night night-torch fog rain snow",
  glass: "day night night-torch fog rain snow",
  fold:  "day night night-torch fog rain snow",
  alder: "day night night-torch fog rain snow",
  "corrie-rim":   "day night night-torch fog rain snow",
  "corrie-floor": "day night night-torch fog rain snow",
  mountainside:   "day night night-torch fog rain snow",
  crag:           "day night night-torch fog rain snow",
  beck:           "day night night-torch fog rain snow",
  vent:           "day night night-torch fog rain snow",
  // ONE CONDITION, because one is what has been shot. The other five fall back
  // to it, which is the same law every plate in this table has always had.
  causeway:       "day night night-torch fog rain snow",
  ford:           "day night night-torch fog rain snow",
  // BOTH COMPLETE FROM THE FIRST DAY, all six conditions, so neither of these
  // ever falls back to the day plate under weather it was not shot for.
  ferry:          "day night night-torch fog rain snow",
  staithe:        "day night night-torch fog rain snow",
  bridge:         "day night night-torch fog rain snow",
  marsh:          "day night night-torch fog rain snow",
  shell:          "day night night-torch fog rain snow",
  reed:           "day night night-torch fog rain snow",
  eyot:           "day night night-torch fog rain snow",
  "shore-road":   "day night night-torch fog rain snow",
  works:          "day night night-torch fog rain snow",
  // THE ROAD, IN THE THREE STATES IT IS IN (2026-09-20). Not three kinds of
  // ground so much as one road at three ages, which is the region's whole
  // argument: dressed squared setts with kerbs and a camber that still drains;
  // the same stone lifted and tipped by frost with grass standing in the
  // cracks; and no stone at all, two ruts and a spine of turf between them.
  // A player walking east out of the fortress should be able to watch the road
  // fail under them without being told.
  "the-kept-road":           "day night night-torch fog rain snow",
  "the-frost-heaved-paving": "day night night-torch fog rain snow",
  "the-cart-ruts":           "day night night-torch fog rain snow",
  // TWO, AND THAT IS THE WHOLE SET IT WILL EVER HAVE. The sea cave is a black
  // interior lit by the torch in your hand: there is no weather in it, no sky
  // over it, and daylight does not reach it. Night is the cave without a torch
  // and night-torch is the cave with one, and every other hour resolves to the
  // first of those - which is why the fallback above had to stop saying "day".
  "sea-cave":     "night night-torch",
};
// AND THE SAME GROUND WITH THE SEA OVER IT. A twin of the plate, not a layer on
// top of one, and the layer is what this replaces (rome, 2026-09-11).
//
// THE OVERLAY WAS THE CHEAPER IDEA AND IT DID NOT HOLD. One sheet of water
// drawn over every flooded room would have cost three images for seventy-five
// rooms instead of six per ground, and it failed on the thing a shared layer
// cannot know: WHERE THE GROUND STOPS. A sheet has one waterline and every
// plate puts its horizon somewhere different — the causeway measures 46 against
// the lock's 55 — so the water either began below the skyline and drew a band
// across the road, or it climbed the frame with the tide and drew wet ground in
// FRONT of dry ground behind it, which is the one thing a level sea cannot do.
// Both were models of water. A photograph is not a model.
//
// Same table shape as TERRAIN_SCENES, and the same law: a condition is listed
// when its file exists. A ground absent here simply never floods on screen, and
// a condition absent from a ground falls back the way every other plate does.
var FLOOD_SCENES = {
  causeway: "day night night-torch fog",
  ford:     "day night night-torch fog",
};
var SKY_PAINTED = {
  day: 1, night: 1, dawn: 1, dusk: 1, moon: 1, blood: 1, eclipse: 1,
  // THE HOUR AFTER THE RAIN. The world already knew about it — the rain's
  // aftermath is a real phase, the ground is churned to mud and the prose says
  // so — and the picture went straight back to a blue midday. This is the one
  // sky that exists for a phase rather than an hour.
  "after-rain": 1,
  // fog, rain and snow need none: those scenes carry their own sky, because
  // weather you can see the far hills through is weather in the SCENE.
};
// WHICH SCENE EACH SKY WANTS. Five of the nine are a different photograph of
// the place, because five of them change the ground and not just the air: day,
// night, fog, rain and snow. The rest are the same ground under a different
// sky, so they cost a sky and no scene at all.
//
// DUSK AND DAWN STAND ON THE NIGHT GROUND (rome, 2026-09-08). They used to take
// the day one and get dimmed, and that was the wrong photograph twice over: the
// shadows in it fall the way noon threw them, and the ground itself is lit for
// noon — so the evening was a bright hillside turned down rather than a dark
// one. The ground goes before the sky does. By the time the sky is still
// burning overhead the stone underfoot has already gone, which is exactly why
// anyone reaches for a torch at that hour, and the night plate is the one that
// says so. Their tints move with them: see the note on those rules, which now
// bring a night ground UP toward the evening instead of a day one down.
var SKY_BASE = {
  day: "day", "in": "day", dawn: "night", dusk: "night",
  // The ground it borrows is the DAY ground, not the rain ground: the rain
  // plates have rain falling in them, and it has stopped.
  "after-rain": "day",
  // TOTALITY IS A DARK SCENE, not a daylit one under a strange sky. It sits
  // at midday, so the day ground was the obvious answer and the obvious
  // answer was wrong: the light goes out, and bright noon stone under a
  // blacked sun is the one mismatch nobody can look past.
  eclipse: "night",
  night: "night", moon: "night", blood: "night",
  fog: "fog", rain: "rain", snow: "snow",
};
// EVERY PICTURE IN THIS GAME IS WEBP, and it is not a passing preference — it
// is the only format that does both jobs at once. The keyed grounds need a real
// alpha channel (the sky is cut out of them), which rules JPEG out, and PNG
// stores a photograph about seven times larger than it needs to be: the art was
// 244MB and is 38MB. That is not a hosting bill, it is the thing the player
// feels — a room was a 3MB download and is now under half a megabyte, which is
// the difference between a held frame you notice and one you do not.
//
// Encoded at q92 with alphaQuality 100. THE CUT IS THE PART THAT MUST NOT MOVE,
// and it does not: every one of the 121 files was checked pixel by pixel after
// encoding and not one transparent pixel became opaque or the reverse. Colour
// costs under 1% average error, which is well inside what the hour's tint does
// to the same picture on purpose.
// KEYED IS THE ONLY THING THAT DECIDES WHETHER A SKY IS DRAWN. It used to also
// ask whether the server said "in", and that was a hole waiting to happen: a
// room is "in" when it has a ROOF — a hollow under a boulder, a lean, a gate
// hut — and those rooms still stand on ground whose plate is an exterior with
// the sky cut out of it. Twenty-two of them on the mountain alone were painting
// a cut scene with nothing behind the cut. The vignette is for a plate that was
// painted as an interior, and such a plate is not keyed, so it never reaches
// here. If the ground has a hole in it, something goes behind it. Always.
// WHICH SCENES ARE CUT. Only these two are painted with the sky keyed out, so
// only these two need one drawn behind them; fog, rain and snow are whole
// photographs that carry their own and must not have a second sky put under.
// The torch plates are cut on the same skyline as their night siblings (checked
// plate by plate: the two profiles agree to within 0.14%), so they need a sky
// drawn behind them exactly as night does — and it is the SAME sky. Lighting the
// ground does nothing to what is over it.
var KEYED = { day: 1, night: 1, "night-torch": 1 };
// WHICH HOURS A CARRIED FLAME SHOWS IN. Its own table, because it is a judgement
// and not a consequence — and the first version got the judgement wrong by
// deriving it: it asked whether the ground being used was the NIGHT ground, so a
// torch lit at dusk did nothing at all until the clock rolled over to night.
//
// Dusk is when a light gets struck. Nobody waits for full dark to reach for a
// torch — you light it because you can see the dark coming, and the game's own
// hour switch (night or not night, nothing in between) is not a reason for the
// picture to ignore you for the last of the evening. Dawn is the same moment
// running the other way, with the flame going out instead of on.
//
// Six hours, and the four that are missing are missing for a reason: plain day
// has nothing to show, and fog, rain and snow are whole photographs that carry
// their own light and were never shot with a flame in them.
var TORCH_HOURS = { night: 1, moon: 1, blood: 1, eclipse: 1, dusk: 1, dawn: 1 };
// AND WHICH BORROWED GROUNDS WANT NO CORRECTION AT ALL (rome, 2026-09-08).
// The hour tint exists for a ground lit for the WRONG light — a noon hillside
// standing in after dark. Dusk and dawn are not that any more: since they moved
// onto the night plate they stand on the RIGHT dark ground, and the sky behind
// it is the thing carrying the hour. Tinting it warm was inventing light that
// is not reaching the stone — at dusk the sun is already down, and what is left
// on the ground is the sky's, which the picture behind it is already showing.
// So these two take the plate raw.
// Deliberately not the whole family: the full moon genuinely LIGHTS the ground
// and totality genuinely takes the light away. Those are real changes to what
// falls on the stone and they keep theirs.
// AND THE BLOOD MOON JOINS THE OTHER TWO (rome, 2026-09-09). It was argued into
// the keep-your-tint list on the grounds that a blood moon really does redden
// what it falls on, which is true of the light and was not true of the picture:
// the wash is a flat multiply over the whole plate, so it reddened the far
// country and the near stone by the same amount, and a coloured sheet laid over
// a photograph is the one thing this table exists to stop. Its ground is the
// night plate, which is already the right dark ground, and the sky behind it is
// doing the work — same argument that moved dusk and dawn.
var NO_GROUND_TINT = { dawn: 1, dusk: 1, blood: 1 };
// MORE THAN ONE SKY FOR AN HOUR. An hour listed here owns a POOL, and which one
// is up is decided by the world-day count the server sends — so the sky changes
// from one day to the next and never from one room to the next. A sky picked per
// room would be the end of the whole two-layer idea: walk three steps, get a
// different evening, and the world stops being a place. An hour not listed here,
// or listed with one entry, behaves exactly as it always has.
//
// SWAPPING AND TURNING ARE DIFFERENT PERMISSIONS, and conflating them locked a
// sky out of something that could never have harmed it.
//
// SWAPPING — showing one hour's picture for another's — is the one that can
// lie, and the full moon, the blood moon and totality may never do it: a full
// moon lights the ground and shuts a door, so its sky is a statement about the
// world and not a mood. Day, night, dawn and dusk assert nothing but the hour
// and may do it; none of them currently does. Dawn and dusk borrowed each other
// until 2026-09-08 and no longer do — see the note on the pools. What those four
// are free to hold instead is SEVERAL PICTURES OF THEIR OWN HOUR, which is not a
// swap at all and is what the pools are really for: prompts for four more are
// waiting in output/imagegen.
//
// TURNING cannot lie at all. It is the same photograph, the same colour, the
// same claim, with the cloud somewhere else — so "after-rain" takes its four
// turns (rome, 2026-09-08) while still being the only sky that means the rain
// has just stopped. The three calendar skies are left out of even this, and
// only because nobody has asked for them; there is no argument against it.
//
// DAWN AND DUSK SHARE, and can because of a rule the sky recipe already keeps:
// no sun, no moon, no comet, no focal object of any kind in any sky, ever — it
// is there so an arbitrary skyline can crop one without cutting a subject in
// half. What that leaves is a field of coloured cloud at low light, which
// asserts no direction and no side of the day. The deep red one reads as a hard
// sunrise as readily as a hard sunset, and the violet one as either.
//
// AND A POOL ENTRY MAY BE A TURN OF ONE (rome, 2026-09-08). "night/x" is the
// night sky mirrored, "night/y" flipped, "night/xy" turned through 180 — the
// four turns a rectangle has, and all four are here because they are four
// different arrangements of cloud: /y is not /xy, it is /xy mirrored. It costs
// NOTHING —
// no second file, no second download, no cache entry — because it is a CSS
// transform on the sky layer, and the ground in front is untouched by it, so
// the same country stands under a sky whose cloud has moved. A field of cloud
// with no sun, moon or focal object in it (the recipe forbids all three) is
// unrecognisable mirrored, which is exactly why this works at all.
//
// TWO OF THE FOUR INVERT THE LIGHT, and that is a real cost worth stating
// rather than hiding. Every sky in the set is painted dark at the top and pale
// toward the bottom, because the bottom is thickening air near a horizon below
// the frame — measured, they run 85->190 by day and 25->93 at night. /x leaves
// that alone and only moves the cloud, so it is free. /y and /xy turn it over,
// and a pale zenith above a dark roof may read as a lid lit from above rather
// than as a sky. Both are in the pools to be looked at, and they are the first
// things to cut if they do not hold: deleting the entry is the whole cost.
var SKY_POOL = {
  day:   ["day", "day/x", "day/y", "day/xy"],
  night: ["night", "night/x", "night/y", "night/xy"],
  // THE DUSK SKY WAS REPLACED, NOT ADDED TO (rome, 2026-09-08). The one it
  // replaced ran 24 31 40 49 86 from the top of the frame down; this one runs
  // 21 26 28 28 25 — flat, and half as bright overall. That is a departure from
  // the recipe's rule about the lower edge (thickening pale air toward a horizon
  // below the frame, never a flat wall) and it was judged better on the picture
  // rather than on the rule, which is the right way round.
  //
  // Its flatness has one real consequence: it is the only sky in the set whose
  // /y and /xy turns cost NOTHING, because there is no gradient to put upside
  // down. Dawn still has one, so dawn/y and dawn/xy still invert it.
  //
  // AND THE TWO NO LONGER BORROW EACH OTHER (rome, 2026-09-08). They did, on the
  // argument that a sky with no sun in it asserts no side of the day — which is
  // still true, and stopped being the point once the new dusk landed. Dawn
  // measures 85 and dusk 25, so half of dawn's pool would have been a sky less
  // than a third as bright as the other half: not variety, a flicker between two
  // different times of day. Each hour keeps its own picture now, turned four
  // ways.
  dawn:  ["dawn", "dawn/x", "dawn/y", "dawn/xy"],
  // DUSK DOES NOT TURN OVER (rome, 2026-09-12). The other three hours here take
  // all four turns because what they have most of is cloud, and cloud upside
  // down is still cloud. Dusk's subject is the BURN along the horizon - the
  // orange is the bottom of the picture and it is the whole reason the hour
  // looks like itself - so /y and /xy hang it in the top of the frame and put
  // the light in the sky above a dark horizon, which is not a dusk, it is a
  // mistake. So: two turns each, and a SECOND PICTURE to make the four back up.
  // That is the first time a sky has had more than one file, and it is the
  // cheaper half of the trade - a turn costs nothing and a photograph costs a
  // generation, but a turn can only ever rearrange what is already there, and
  // an hour whose whole character lives in one edge of the frame has nothing it
  // can safely rearrange. The two measure 17.5 apart of 255, which is real
  // variety rather than a mirror: same hour, different evening.
  dusk:  ["dusk", "dusk/x", "dusk-2", "dusk-2/x"],
  // One file, four arrangements. It never borrows and is never borrowed — an
  // aftermath sky over a midday is the one swap that would still be a lie.
  "after-rain": ["after-rain", "after-rain/x", "after-rain/y", "after-rain/xy"],
  // THE THREE CALENDAR SKIES GET THE MIRROR AND NOTHING ELSE (rome, 2026-09-09).
  // They were left out of turning entirely, and only because nobody had asked.
  //
  // MIRRORING IS WORTH MORE HERE THAN ANYWHERE ELSE, because unlike the other
  // five these three have a SUBJECT — a full moon, a blood moon, a corona — and
  // /x carries it right across the sky. Every other pool's turns only move cloud
  // about; this one moves the thing you are looking at, and does it without
  // touching the colour, the light or the claim the sky makes about the world.
  //
  // AND /y AND /xy ARE OUT FOR THE SAME REASON, not for the usual one. The
  // standing objection to a vertical turn is that it inverts the light: measured
  // top-to-bottom, moon runs 47->95 and eclipse 30->116, so both would hang a
  // pale zenith over a dark horizon and read as a lid. True, and the smaller
  // problem. The bigger one is that flipping drops the SUBJECT to the bottom of
  // the frame, where the first ridgeline eats it — a moon half-buried in a hill,
  // and on the eclipse the sunset band laid across the top of the sky with the
  // corona down in the rocks. Blood is flat enough (8->24) that the light
  // argument does not touch it, and it is still out, because its moon goes down
  // there with the others.
  moon:    ["moon", "moon/x"],
  blood:   ["blood", "blood/x"],
  eclipse: ["eclipse", "eclipse/x"],
};
var SKY_TURN = { x: "scaleX(-1)", y: "scaleY(-1)", xy: "scale(-1, -1)" };
// WHERE THE GROUND IS IN THIS PARTICULAR PICTURE (rome, 2026-09-08: the mobs in
// the Dry Corrie were standing on the lake).
//
// Creatures are centred on 55% of the frame, and that number is not arbitrary —
// it is the CAMERA LOCK every plate was generated under, horizon at 55% of the
// frame height, paired with the STAGE LOCK that reserves the bottom third for
// ground you can stand a large animal on. Hold both and 55% is right for every
// picture in the game, which is why it was a constant.
//
// The two corries hold neither, and they were always going to: a corrie IS a
// bowl seen from its edge, so the plate looks DOWN across water and the nearest
// standing ground begins around 72% of the frame. At 55% a big animal's feet
// land at 76% and just catch the near terrace, which is why this survived — but
// a creature is centred, not stood, so a hill adder's feet land at 58% and it
// floats over the tarn. The small ones gave it away.
//
// So the line is per plate, and only named where the locks were broken. The
// number is the CENTRE, and feet land at roughly centre + half the creature's
// height — 21% for the largest thing in the game, which is what caps this at 72
// rather than 80: at 80 a stag's feet go off the bottom of the frame.
var MOB_LINE_DEFAULT = 55;
// The Back Wall's scree begins at 62% and the Kept Room's floor at 65%, both
// well below the 55% camera lock — at the default a small creature stands with
// its feet in the rock face or in the far wall. Same fault the corries had.
// FOUR MORE READ OFF THE PLATES (rome, 2026-09-09). Every one of these puts
// its nearest standing ground well under the 55% lock, so a creature centred
// on the lock stood in the middle distance and small ones floated outright:
//   boulder     a dome of rounded blocks with no level ground until ~64%
//   glass       broken slabs; everything above ~70% is mid-field rubble
//   snow        the field dips away and comes back; near snow starts ~64%
//   the-rib-cage the fan is loose stone from ~66% down, the cage sits on it
// The rib cage is a SANCTUARY and nothing stands in it in the game, so its
// number only ever shows in the preview. It is here because a plate that
// breaks the lock should say so wherever it is drawn.
var MOB_LINE = {
  // THE COAST STOOD SIX POINTS TOO LOW (rome, 2026-09-13). Measured against the
  // hill, which is the only reference that matters: a mountain creature's feet
  // land between 76% and 85% of the frame, and the crossing's were landing at
  // 83% to 91% - the shell put a man's boots a tenth of the screen from the
  // bottom edge, well under a prose strip that starts at 67%.
  //
  // Every crossing ground is lifted six, which keeps the per-plate tuning
  // (a marsh is not a bridge) and moves the whole region into the hill's band:
  // 77 · 81 · 77 · 83 · 79 · 79 · 85 · 81 · 81 · 83 · 77 · 75.
  //
  // It became visible now because the sprites grew. Feet sit at line + half a
  // man whatever the creature is, so enlarging the roster pushed every short
  // thing DOWN toward that line and the error stopped hiding in the gap.
 "corrie-rim": 72, "corrie-floor": 72, "the-back-wall": 62, "the-kept-room": 65,
                 boulder: 64, glass: 70, snow: 64, "the-rib-cage": 66,
                 // THE ALDER IS A BANK WITH WATER BEHIND IT (rome, 2026-09-09:
                 // the animals sit too high in it). Its near ground starts around
                 // 70% and the mire lies behind that, so at the default 55 only
                 // the biggest thing on the plate reached peat: a creature is
                 // CENTRED on this line, not stood on it, so half its height is
                 // the whole argument. A hill fox is 23vh and put its feet at
                 // 67%, a gill adder is 19vh and put them at 64% — both of them
                 // standing on open water, which the small ones always give away
                 // first. At 62 the adder lands at 72% and the goat at 78%, and
                 // everything on this ground is on the bank.
                 // THE FIRST TWO CROSSING GROUNDS EVER SHOT, and the two that
                 // spent longest with no line at all - they were painted,
                 // declared and shipped while this table still only knew the
                 // hill, so both sat on MOB_LINE_DEFAULT's 55 and put the
                 // smallest things on the plate out in the water. Neither was
                 // reachable in game yet, which is exactly why it went unseen:
                 // an unwired ground cannot look wrong at you.
                 // The causeway's road runs from about 60% down between its
                 // kerbs; the ford's near shingle from 64%, with the channel
                 // behind it, so it wants four points more.
                 causeway: 56, ford: 60,
                 alder: 62,
                 // THE GULLY IS A FLOOR WITH WALLS OVER IT (rome, 2026-09-10).
                 // Its near floor starts around 67% and the walls stand behind
                 // it, so at the default 55 the smallest thing on the plate put
                 // its feet at 64% — above the floor's near edge, on wall. Four
                 // points down and the adder lands at 68%, the fox at 71% and
                 // the wolf at 76%, all three on gravel, and nothing has sunk
                 // behind the prose. 62 was tried and is too far: it puts the
                 // adder under the text, which is the one thing the centred line
                 // exists to avoid.
                 gully: 59,
                 // THE BECK IS A POOL WITH A BANK IN FRONT OF IT. Its gravel
                 // starts around 67%, so at 55 the wolf reached it and the adder
                 // stood in the water. Five down and all three are on gravel.
                 beck: 60,
                 // AND THE CRAG IS A WALL WITH A LEDGE AT THE FOOT OF IT — the
                 // one ground in the game whose subject is the thing you CANNOT
                 // stand on. Its floor is the bone-strewn shelf at about 88% and
                 // everything above that is vertical rock, so at 55 all three
                 // were pinned to the face like flies. 72 is the documented cap
                 // on this table (above it the biggest sprite's feet leave the
                 // picture) and it is what this plate needs: the wolf lands on
                 // the shelf, the two small ones just above it.
                 //
                 // IT IS AT THE CAP, WHICH IS THE THING TO KNOW. If this still
                 // reads wrong the answer is not a bigger number, it is a plate
                 // whose shelf sits higher in frame — there is no line left to
                 // give.
                 crag: 72,
                 // THE FERRY IS A DECK, AND THE DECK IS HALF THE PICTURE. The
                 // stage was re-shot for exactly this: the first version put its
                 // back edge at 66% and left a band of planking too shallow to
                 // stand three creatures on, so the camera stepped back and the
                 // timber now fills from 52% down. That is the widest standing
                 // ground on any plate in the game, and the line sits mid-deck
                 // rather than at either edge - the adder lands at 72%, the wolf
                 // at 78%, a man at 83%, all three on wood with water behind
                 // them and planking still running on in front.
                 ferry: 56,
                 // THE DEEP MARK IS A MUDFLAT WITH THE CHANNEL BEHIND IT, and
                 // it reads the same as the staithe: the silt begins right at
                 // the waterline around 62% and runs unbroken to the bottom
                 // edge, and everything above that is open water. 62 lands a
                 // conger at 74%, a man at 83% - all of them out on the flat
                 // with the post beside them and no small thing standing in
                 // the channel.
                 "the-deep-mark": 62,
                 // THE STAITHE IS A SHORE, and its hard starts lower than the
                 // ferry's deck - around 62%, with the jetty and the water
                 // behind it. Six points further down accordingly: the adder at
                 // 78%, the wolf at 84%, a man at 89%, which puts all three on
                 // the shingle among the pots rather than out on the jetty.
                 staithe: 62,
                 // THE BRIDGE IS A STONE DECK FORTY FEET UP, and its near edge
                 // is the parapet rather than a shoreline - there is no shallow
                 // margin to get wrong. The deck runs from 62% down, so 64 sits
                 // the adder at 74%, the wolf at 80% and a man at 85%, all three
                 // well inside the flags with masonry in front of and behind
                 // them, and nothing standing on the drop.
                 bridge: 58,
                 // THE MARSH IS FLAT AND THE CREEKS ARE BEHIND IT. The samphire
                 // starts about 63% and the cut banks stand behind that, so the
                 // risk here is the reverse of the alder's: not water in front
                 // but a creek edge a creature could appear to be standing in.
                 // 64 keeps all three on the near flat.
                 marsh: 58,
                 // AND THE SHELL IS A STORM BEACH WITH ITS WRACK LINE ACROSS IT.
                 // The shingle starts around 65% but the weed, driftwood and
                 // bones lie in a band just above it, and a creature standing in
                 // that band reads as wading through rubbish rather than walking
                 // the beach. 70 puts the adder at 80% and a man at 91%, which
                 // is the clean stone below the wrack.
                 shell: 64,
                 // THE REED IS A CUT PATH WITH WALLS OF STEM EITHER SIDE. Its
                 // mud floor starts about 64% and the reeds stand from it, so
                 // the only way to be wrong here is to put a creature up in the
                 // stems. 66 lands the adder at 76% and a man at 87%, all three
                 // on the mud with the bed towering over them - which is also
                 // the scale check: a reed bed IS taller than a man.
                 reed: 60,
                 // THE EYOT IS THE BARE CROWN OF AN ISLAND, willows behind it
                 // and reed beyond them. The bare ground runs from about 64%
                 // down and everything above it is somebody else's ground.
                 eyot: 60,
                 // THE SHORE ROAD IS A METALLED ROAD BETWEEN TWO KERBS, and the
                 // kerbs are the whole constraint: off them is either the storm
                 // beach or the bank. 68 keeps all three between the stones.
                 "shore-road": 62,
                 // AND THE SEA CAVE IS THE ONLY INTERIOR ON THE CROSSING. Wet
                 // sand from about 55% with the tide line on the walls behind
                 // it, so there is more standing room here than anywhere else
                 // in the region and the line can sit high without risk. 60
                 // puts the tide mark at eye level behind the animals, which is
                 // the reading the room wants: you are standing below it.
                 // THE YARD BETWEEN THE BUILDINGS runs from about 60% down,
                 // and the buildings stand behind it, so the risk is a creature
                 // up against a wall rather than out on the ground. 62 puts the
                 // adder at 72% and a man at 83%, all three well out in the open
                 // with worn earth in front of and behind them.
                 works: 56,
                 "sea-cave": 54,
                 // THE TWO CROSSING GATES. Both are a yard in front of a
                 // building with the water behind it, and both yards run from
                 // about 60% down, so they take the same line: the adder at 72%,
                 // a man at 83%, everything on the ground in front of the door
                 // rather than up against the wall of it.
                 "gate-the-ferry-house": 56, "gate-the-crossing-house": 56,
                 // AND THE SALT POOL, where the standing ground is the last of
                 // the dry cave floor and the pool lies across everything behind
                 // it. The floor starts about 58%, so 64 keeps all three on wet
                 // rock with the black water behind them - which is the reading
                 // the room wants, because the thing that lives here comes OUT
                 // of that water at you.
                 "the-salt-pool": 58,
  // ---- THE FORTRESS, 31 PLATES. All start at the camera lock and none has been
  // measured against a standing creature yet - the near ground in these was
  // written to be a level band across the bottom third, so 55 should hold, but
  // the small creatures are the ones that give it away. Check the rats.
  "fort-approach": 55,
  "fort-wall": 55,
  "fort-waste": 55,
  "fort-drowned": 55,
  "the-burned-village": 55,
  "fort-overworks": 55,
  "keep-passage": 55,
  "keep-store": 55,
  "keep-quarters": 55,
  "keep-holes": 55,
  "keep-letters": 55,
  "keep-worship": 55,
  "hall": 55,
  "keep-great": 55,
  "undercroft": 55,
  "armory": 55,
  "the-issue-room": 55,
  "sewer": 55,
  "warren-run": 55,
  "warren-den": 55,
  "warren-mine": 55,
  "the-buried-chapel": 55,
  "deep-passage": 55,
  "deep-hall": 55,
  "deep-bone": 55,
  "deep-water": 55,
  "deep-dark": 55,
  "kings-rooms": 55,
  "tideway-throat": 55,
  "tideway-works": 55,
  "the-breathing-hall": 55,
};
// The day count from the server: one number, the same for everybody, up by one
// each cycle. Zero until a status frame carries it, which simply means the first
// entry of every pool until the world says otherwise.
var skyRoll = 0;
// WHICH PICTURE THIS HOUR IS WEARING. The one place the pool is read, so a sky
// can never be chosen from anywhere else — and it falls through to the hour's
// own name whenever no pool is declared, which is what the other four want.
// NOT IN ORDER (rome, 2026-09-08). This indexed the pool with the day count
// directly, so a four-entry hour marched plain, mirrored, flipped, turned, plain
// — and came back to the same sky every fourth day, which is a pattern a player
// learns without meaning to.
//
// It cannot become a real random, though: the one sky over the world is the
// claim the whole two-layer scheme rests on, and Math.random() in here would
// give two people standing in the same room two different evenings. So the day
// count is HASHED instead — the same cheap FNV-1a the plates are picked with.
// Every client computes the same answer from the same day, and the sequence has
// no period short enough to notice. Salted with the hour as well, so day, night,
// dawn and dusk stop moving in lockstep with each other, and a sky may repeat
// two days running, which is what weather does anyway.
// AND FNV-1a ALONE IS NOT ENOUGH TO SHUFFLE WITH. Its low bits track the last
// characters of the string, so hashing "night:7" and taking it modulo four read
// the day's last digit almost directly: the first attempt at this produced a
// permuted cycle rather than a scatter, and day and night — differing only at
// the START of the string — came out with identical sequences. The murmurhash3
// finalizer is the standard fix and is four lines: it pushes the high bits down
// into the low ones so a modulo can see the whole hash.
function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 2246822507);
  h ^= h >>> 13; h = Math.imul(h, 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
function skyPick(hour) {
  var pool = SKY_POOL[hour];
  var e = (pool && pool.length) ? pool[mix32(plateHash(hour + ":" + skyRoll)) % pool.length] : hour;
  var cut = e.indexOf("/");
  return cut < 0 ? { file: e, turn: "" }
                 : { file: e.slice(0, cut), turn: SKY_TURN[e.slice(cut + 1)] || "" };
}
var SKY_KNOWN = { day:1, dawn:1, dusk:1, night:1, moon:1, blood:1, eclipse:1, fog:1, rain:1, snow:1, "in":1, "after-rain":1 };
var sceneEl = document.getElementById("scene");
var skyEl = document.getElementById("sky");
// Cover may crop the moon off either axis. Keep its disc inside the viewport
// without stretching it or flipping it vertically; clouds still fill the box.
function fitSky() {
  if (!skyEl || !skyEl.getBoundingClientRect) return;
  var image = skyEl.style.backgroundImage || "";
  var focus = image.indexOf("/sky/blood.webp") >= 0 ? [462, 169, 83]
    : image.indexOf("/sky/moon.webp") >= 0 ? [468, 185, 68] : null;
  skyEl.style.backgroundPosition = "center 55%";
  if (!focus) return;
  var rect = skyEl.getBoundingClientRect(), w = rect.width, h = rect.height;
  if (!w || !h) return;
  var scale = Math.max(w / 1584, h / 993), radius = focus[2] * scale;
  var x = Math.max(radius + 8, Math.min(w - radius - 8, w * .30));
  var y = Math.max(radius + 8, Math.min(h - radius - 8, h * .24));
  var left = Math.max(w - 1584 * scale, Math.min(0, x - focus[0] * scale));
  var top = Math.max(h - 993 * scale, Math.min(0, y - focus[1] * scale));
  skyEl.style.backgroundPosition = left + "px " + top + "px";
}
var viewBtn = null;   // built only for a granted key, see buildViewRow
var viewMode = "text";   // what is ON SCREEN; viewWant below is what was ASKED FOR
var lastBand = "", lastSky = "", lastTerrain = "", lastRoomKey = "", lastPlace = "";
// Whether the moon is red, kept apart from which sky is painted - see the
// note beside "red" in zone.ts. Weather decides the picture; the moon decides
// the eyes, and reading both off one value put the eyes out in any fog.
var lastRed = 0;
// WHETHER YOU ARE CARRYING A LIGHT. Sticky like the other four: applyView calls
// paintScene with nothing at all when the player turns pictures on, and the
// scene has to come back the way it was rather than as an unlit night.
var lastTorch = false;
// WHAT IS ACTUALLY ON SCREEN, and which request owns it. scenePainted is the
// plate the player can see right now (not the one most recently asked for);
// sceneSeq is bumped by every request so a slow one can tell it has been
// overtaken and must not paint. See the swap at the end of paintScene.
var scenePainted = "", sceneSeq = 0;
// THE ANIMATION STATE LIVES UP HERE WITH THE REST OF THE VIEW STATE, and it has
// to: applyView() runs at load and calls runAnims(), and a var further down the
// file is hoisted but not yet ASSIGNED at that moment - so a declaration next to
// the code that uses it would read undefined.length on the first paint. paintMobs
// survives the same order only because it checks mobsEl first.
var anims = [], animTimer = null;
var lastMobFrame = null; // retained in text view so switching does not wait for another status
var stillness = false;
try { stillness = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
// THE SERVER DECIDES WHETHER THERE ARE PICTURES. Until a status frame arrives
// carrying the grant, this client is a text client and has no view control at
// all — an unlisted wanderer is not shown a door they cannot open. The grant is
// mirrored to storage only so the next load can skip the text-mode flash.
var artAllowed = false;
// NOT HIDDEN — ABSENT. A hidden row still ships in the HTML of every page the
// world is served, so anyone who opened the source found a control they were
// never meant to know about. The row does not exist until the server says it
// does, and for everybody else there is nothing in the document to find.
var viewRow = null;
function buildViewRow() {
  if (viewRow) return;
  var panel = document.getElementById("setpanel");
  var anchor = document.getElementById("chipbtn");
  if (!panel) return;
  viewRow = document.createElement("div");
  viewRow.className = "setrow";
  var label = document.createElement("span");
  label.textContent = "view";
  viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.id = "viewbtn";
  viewBtn.setAttribute("role", "switch");
  viewBtn.setAttribute("aria-label", "Image view");
  viewBtn.textContent = viewWant;
  viewBtn.onclick = function () {
    setView(viewWant === "image" ? "text" : "image");
    if (phoneControls()) panel.classList.remove("open");
  };
  viewRow.appendChild(label);
  viewRow.appendChild(viewBtn);
  var after = anchor && anchor.parentNode && anchor.parentNode.parentNode === panel ? anchor.parentNode : null;
  if (after && after.nextSibling) panel.insertBefore(viewRow, after.nextSibling);
  else panel.appendChild(viewRow);
}
// WHAT WAS ASKED FOR, kept strictly apart from what is on screen. These came
// apart the hard way: applying the view on load also SAVED it, and on load the
// grant has not arrived yet, so every refresh wrote "text" over the player's
// real choice a half-second before the server said they were allowed pictures.
// The setting could never survive a reload because loading destroyed it.
//
// So storage is now written in exactly one place — a deliberate click — and
// nothing the page does on its own can touch it.
var viewWant = "text";
try { if (localStorage.getItem("nomad_view") === "image") viewWant = "image"; } catch (e) {}
function grantArt() {
  if (artAllowed) return;
  artAllowed = true;
  buildViewRow();
  try { localStorage.setItem("nomad_art", "1"); } catch (e) {}
  try { if (typeof print === "function") print("\u2014 pictures unlocked: settings \u203a view \u2014", "sys"); } catch (e) {}
  applyView();   // and if pictures are what they wanted, they get them now
}

// HOW MUCH WATER IS OVER THE ROOM ON SCREEN, 0-3, and DECLARED, which is the
// whole of this line's history. It was written as a bare assignment inside
// paintScene and read by floodSuffix, and nothing else ever touched it, so it
// looked like a local that happened to live between two calls. The served page
// is a MODULE, and a module is strict: assigning to a name that was never
// declared is not an implicit global there, it is a ReferenceError. paintScene
// is called once at the bottom of applyView, applyView is called once at the
// top level, and so the throw landed during module evaluation and took the
// whole script with it - every handler defined below that point never bound,
// which is why the door came up with its static markup and nothing behind it.
// Shipped that way 2026-09-11; it never worked for anybody, not once.
var lastSea = 0;
// THE TIDE LAYER. Called from the two places a scene is painted, and it is the
// only thing that reads lastSea.
//
// A CONDITION IT HAS NOT GOT FALLS BACK TO DAY, not to nothing: the alternative
// is a room whose prose says the causeway is under and whose picture says it is
// a road, which is the failure this layer exists to end. A day sheet under a
// night plate is the wrong light on the water; no sheet at all is the wrong
// world.
// IS THIS ROOM UNDER, AND HAS THE GROUND BEEN SHOT THAT WAY. Returns the "-flood"
// a plate name takes when both are true and nothing at all when either is not,
// so a ground with no flood twin goes on painting dry and a dry room goes on
// painting dry — which is every room outside the crossing.
//
// THE CONDITION HAS TO MATCH TOO. The sea does not care what the weather is
// doing, but the pictures do: a flood plate exists for the day, the night, the
// torch and the fog, and not yet for rain or snow. Asking for a file that is
// not there would put a hole in the world at exactly the hour the room most
// needs to say something, so an unshot condition falls back to the dry plate.
// The prose still says the causeway is under; the picture is merely a state
// behind, which is the same bargain every unpainted condition already makes.
function floodSuffix(ground, cond) {
  if (!lastSea) return "";
  var have = FLOOD_SCENES[ground];
  if (!have) return "";
  return (" " + have + " ").indexOf(" " + cond + " ") >= 0 ? "-flood" : "";
}
// Precipitation is cosmetic and follows the committed scene, never a local weather clock.
var weatherCanvas = document.getElementById("weather-particles");
var weatherCtx = weatherCanvas && weatherCanvas.getContext && weatherCanvas.getContext("2d");
var weatherKind = "", weatherFrame = null, weatherTime = 0, weatherStamp = 0;
var weatherMotion = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
function runWeather() {
  var active = weatherCtx && weatherKind && viewMode === "image" && !document.hidden && !weatherMotion.matches;
  if (!active) {
    if (weatherFrame !== null) cancelAnimationFrame(weatherFrame);
    weatherFrame = null; weatherStamp = 0;
    if (weatherCanvas) weatherCanvas.style.display = "none";
    if (weatherCtx) weatherCtx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
    return;
  }
  weatherCanvas.style.display = "block";
  if (weatherFrame === null) weatherFrame = requestAnimationFrame(drawWeather);
}
function setWeather(kind) {
  kind = kind === "rain" || kind === "snow" ? kind : "";
  if (kind !== weatherKind) { weatherKind = kind; weatherTime = 0; weatherStamp = 0; }
  runWeather();
}
function drawWeather(now) {
  weatherFrame = null;
  if (!weatherKind || viewMode !== "image" || document.hidden || weatherMotion.matches) { runWeather(); return; }
  // Thirty draws per second, capped resolution and density even on large Retina screens.
  if (weatherStamp && now - weatherStamp < 32) { weatherFrame = requestAnimationFrame(drawWeather); return; }
  weatherTime += weatherStamp ? Math.min(.1, (now - weatherStamp) / 1000) : 0;
  weatherStamp = now;
  var box = sceneEl.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height);
  if (!w || !h) { weatherFrame = requestAnimationFrame(drawWeather); return; }
  weatherCanvas.style.left = box.left + "px"; weatherCanvas.style.top = box.top + "px";
  weatherCanvas.style.width = w + "px"; weatherCanvas.style.height = h + "px";
  var scale = Math.min(1, 1280 / w), rw = Math.max(1, Math.round(w * scale)), rh = Math.max(1, Math.round(h * scale));
  if (weatherCanvas.width !== rw || weatherCanvas.height !== rh) { weatherCanvas.width = rw; weatherCanvas.height = rh; }
  var ctx = weatherCtx, t = weatherTime, rain = weatherKind === "rain";
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, w, h);
  var count = Math.min(rain ? 170 : 115, Math.max(24, Math.round(w * h / (rain ? 6500 : 9500))));
  ctx.strokeStyle = "rgba(195,205,203,.33)"; ctx.lineWidth = 1.1;
  ctx.fillStyle = "rgba(235,231,210,.72)";
  for (var i = 0; i < count; i++) {
    var x, y;
    if (rain) {
      x = ((i * 173.7 - t * 185) % (w + 100) + w + 100) % (w + 100) - 50;
      y = (i * 79.1 + t * (650 + i % 7 * 35)) % (h + 70) - 35;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 27); ctx.stroke();
    } else {
      x = ((i * 131.3 + t * 24 + Math.sin(t + i) * 15) % (w + 80) + w + 80) % (w + 80) - 40;
      y = (i * 89.1 + t * (24 + i % 35)) % (h + 60) - 30;
      ctx.beginPath(); ctx.arc(x, y, .8 + i % 3 * .65, 0, Math.PI * 2); ctx.fill();
    }
  }
  weatherFrame = requestAnimationFrame(drawWeather);
}
if (document.addEventListener) document.addEventListener("visibilitychange", runWeather);
if (weatherMotion.addEventListener) weatherMotion.addEventListener("change", runWeather);

var lastCovered = false;
function paintScene(band, sky, terrain, roomKey, torch, roll, place, sea, red, covered) {
  var previousRoom = lastRoomKey;
  if (covered !== undefined) lastCovered = !!covered;
  else if (sky !== undefined && sky !== null) lastCovered = sky === "in";
  // Remove the old sky immediately when stepping inside, even while its
  // replacement ground plate is downloading.
  if (lastCovered && skyEl) { skyEl.style.backgroundImage = ""; skyEl.style.transform = ""; }
  // HOW MUCH WATER IS OVER THIS ROOM, and cleared the same way place is:
  // walking off a flooded shoal onto a dry road has to put the sheet away, so
  // an absent field is zero rather than "leave it as it was".
  lastSea = sea || 0;
  if (roomKey) lastRoomKey = roomKey;
  // Cleared as well as set: walking out of a singular room and into ordinary
  // ground must stop naming the room, or the summit follows you down the hill.
  if (place !== undefined) lastPlace = place || "";
  if (band) lastBand = band;
  if (sky) lastSky = sky;
  if (red !== undefined && red !== null) lastRed = red ? 1 : 0;
  // A bare truth test would not do: the whole point is that going dark is a
  // change too, and a falsy-but-present 0 has to be able to put the light out.
  if (torch !== undefined && torch !== null) lastTorch = !!torch;
  if (roll !== undefined && roll !== null) skyRoll = roll;
  if (terrain !== undefined && terrain !== null) lastTerrain = terrain;
  if (!sceneEl || viewMode !== "image") { setWeather(""); return; }
  if (lastCovered || lastRoomKey !== previousRoom || lastSky !== weatherKind) setWeather("");
  // Terrain first, band second: the room's own ground beats its region's.
  // ROOM ART ONLY. The threshold's paintings were never room art: they are oil,
  // painterly, and each one is a specific somewhere — so a beam walk over open
  // water was being handed a dusk village in a different MEDIUM entirely. A
  // region with no plates of its own paints bare ground and waits its turn.
  // A PLATE BELONGS TO THE COUNTRY IT WAS PAINTED FOR. The terrain rules were
  // written against the mountain and then let loose on all 1,186 rooms, so a
  // briar court inside the fortress ring matched a rock word and was handed the
  // mountain's drain. Scree, gully, snow, cairn, corrie: every one of those is
  // a MOUNTAIN picture, and nowhere else may borrow them however well the words
  // happen to line up. Other bands paint bare ground until they own plates.
  // The gatehouse belongs to no band — it is the same small warm room at every
  // door — so it paints wherever it is found rather than waiting for the
  // country outside to have pictures of its own.
  // A gate is asked for by name before anything else, and if it has no plate
  // yet the terrain it is standing on answers instead — hence the fallthrough
  // rather than an early return.
  // A SINGULAR ROOM IS ASKED FOR FIRST, before the door it might be and before
  // the ground it stands on — it is the most specific thing anything can know
  // about where you are. It falls through to both when it has no plate yet.
  var place = (lastPlace && ROOM_PLATE[lastPlace] !== undefined) ? lastPlace : "";
  var gate = lastTerrain.slice(0, 5) === "gate:" ? lastTerrain.slice(5) : "";
  // "lit" below is whether the TORCH PLATE WAS ACTUALLY USED, not the same
  // question as whether a torch is burning: a ground with no torch plate cut
  // yet is standing in the plain dark however bright your hand is. The
  // creatures read this rather than lastTorch, so nothing ever blazes on a
  // hillside the picture left unlit.
  var scene = "", sky = "", tint = "", lit = false, turn = "", line = MOB_LINE_DEFAULT;
  // WHAT HOUR THE CREATURES ARE STANDING IN, which is the sky outside everywhere
  // except under a roof, where it is whatever the plate was lit for.
  var mobHour = lastSky;
  if (place) {
    // Identical to the gate branch below, and deliberately so: a plate is a
    // plate, and the only thing that differs is which table named it.
    var phave = " " + ROOM_PLATE[place] + " ";
    var shut = !!SHELTERED[place];
    var pbase = SKY_BASE[lastSky] || "day";
    // What the slot shows, which is only ever different from the hour under a
    // roof in bad weather — there is no rain sky in the game, and a dark room
    // under a bright noon sky would be the wrong half of the picture.
    var slot = lastSky;
    if (shut && WEATHER_FROM_INSIDE[lastSky]) { pbase = "night"; slot = "after-rain"; }
    // AND WHEN THE PLATE HAS NOT GOT THAT CONDITION, THE FIRST ONE IT LISTS.
    // This was hardcoded to "day" on the assumption every plate owns one, which
    // held until the Last Shelter gave its up: a room with no day plate resolved
    // day -> day and asked for a file that is not there, which is a 404 and an
    // empty frame at the one hour it is most likely to be walked into. Falling
    // back to the plate's own first condition cannot miss, because a plate is
    // only ever listed once its files exist. Every other plate in the game leads
    // with "day", so this changes nothing anywhere else.
    if (phave.indexOf(" " + pbase + " ") < 0) pbase = ROOM_PLATE[place].split(" ")[0];
    // A TORCH SHOWS WHEREVER THE ROOM IS DARK, which under a roof is not the same
    // question as which hour it is. TORCH_HOURS answers it outdoors — rain and
    // snow are daylit there, whole photographs with their own light in them. But
    // a sheltered room in rain has just resolved to its NIGHT plate, and a room
    // dark enough to be drawn at night is a room a flame belongs in. Outdoors
    // this clause changes nothing: every hour whose ground is the night plate is
    // already in TORCH_HOURS.
    var darkEnough = TORCH_HOURS[lastSky] || pbase === "night";
    var pwant = (lastTorch && darkEnough && phave.indexOf(" night-torch ") >= 0) ? "night-torch" : pbase;
    // The picture, which may belong to another room (PLATE_OF).
    var stem = PLATE_OF[place] || place;
    scene = "/room-bg/" + stem + "-" + pwant + ".webp";
    if (KEYED[pwant]) {
      var pp = skyPick(SKY_PAINTED[slot] ? slot : pbase);
      sky = "/sky/" + pp.file + ".webp"; turn = pp.turn;
    }
    lit = pwant === "night-torch";
    tint = (lit || shut || NO_GROUND_TINT[lastSky] || pbase === lastSky) ? "" : lastSky;
    // A ROOF IS OVER THEM TOO — AND SO IS A HILL. SHELTERED names the rooms with
    // a slot in them; it does not name the ones with no opening at all, because
    // until the coast there were none. The salt pool is at the back of a sea
    // cave and the light in there is whatever you carried in, so a creature
    // standing in it must not be lit by a sky it cannot see.
    //
    // The test needs no new table and MUST NOT HAVE ONE, or the table and the
    // plates drift: a plate list with no DAY in it IS a place daylight never
    // reaches. That is the same sentence, and the terrain branch below already
    // reasons this way. pbase has resolved to the plate's own first condition by
    // here, which for a cave is night — so the creature takes t-night and stands
    // at brightness .26, a shape in the dark, until a torch says otherwise.
    //
    // AND A ROOM CAN BE DARK OF DAYLIGHT AND STILL BE A LIT ROOM (2026-09-23).
    // "No day plate" meant "a hole you must carry a light into" for as long as
    // the only such places were holes. The fortress is not: its halls are lit by
    // the torches burning in them, the picture shows them burning, and a
    // creature standing in that light was being painted as a shape in the dark.
    // The plate's own list still answers it and still needs no table — a room
    // you must light YOURSELF is the one that has a night-torch plate to do it
    // with. No day and no night-torch is a room that lights itself, and nothing
    // standing in it takes an hour tint.
    var selfLit = phave.indexOf(" day ") < 0 && phave.indexOf(" night-torch ") < 0;
    if (shut || phave.indexOf(" day ") < 0) mobHour = (lit || selfLit) ? "" : pbase;
    line = MOB_LINE[stem] || MOB_LINE_DEFAULT;   // the standing line belongs to the PICTURE
  }
  if (!scene && gate && GATE_PLATE[gate] !== undefined) {
    // GROUND WEATHER IS A DIFFERENT PHOTOGRAPH. Night is not the day gone dim,
    // fog is not a grey wash, rain wets the stone and snow lies on it — none of
    // those is anything a sky behind a dry daylit scene can do. Five scenes.
    var have = " " + GATE_PLATE[gate] + " ";
    // The scene this sky wants, or the day scene if it has not been shot yet —
    // so a gate can land with one photograph and gain the other four later
    // without anything breaking in between.
    var base = SKY_BASE[lastSky] || "day";
    if (have.indexOf(" " + base + " ") < 0) base = "day";
    // AND A FLAME OF YOUR OWN IS A SIXTH. Only over the night ground, because
    // that is the only condition it was shot under — and the check is against
    // this door's own list, so one gate can have the torch plate and its
    // neighbour go without.
    var want = (lastTorch && TORCH_HOURS[lastSky] && have.indexOf(" night-torch ") >= 0) ? "night-torch" : base;
    scene = "/room-bg/gate-" + gate + "-" + want + ".webp";
    // AND A KEYED SCENE MUST ALWAYS GET A SKY. This said so and then did not do
    // it: it asked for the sky of the CONDITION, so a gate with no rain scene
    // fell back to its day ground — which is cut, and transparent where the sky
    // was — and then drew nothing behind it, because no rain sky exists. A hole
    // in the world, every time it rained anywhere a scene was missing. The sky
    // to draw is the condition's when there is one, and otherwise the sky that
    // belongs to the GROUND actually being used.
    // THE SKY IS THE BASE'S, NEVER THE TORCH VARIANT'S. There is no
    // night-torch.webp in the sky folder and there never will be: a torch is on
    // the ground and the sky over it is the ordinary night.
    if (KEYED[want]) {
      var gp = skyPick(SKY_PAINTED[lastSky] ? lastSky : base);
      sky = "/sky/" + gp.file + ".webp"; turn = gp.turn;
    }
    // BORROWED GROUND NEEDS BRINGING INTO LINE. The tint used to switch off the
    // moment a real sky was drawn, on the reasoning that the picture already WAS
    // the weather — true when the scene was painted for this hour, and false
    // whenever it was borrowed. Day stone under a dusk sky is still lit for
    // noon, and the eye catches that before it catches anything else.
    lit = want === "night-torch";
    line = MOB_LINE["gate-" + gate] || MOB_LINE_DEFAULT;
    // A TORCH PLATE TAKES NO HOUR CORRECTION, EVER. The correction exists to
    // relight a ground that was shot under the wrong sky — and a torch plate's
    // light does not come from the sky. It comes from the flame, and it is the
    // same flame at every hour it is carried, so there is nothing for the hour
    // to put right. Dusk is the case that makes it obvious: t-dusk was written
    // to take a NOON ground down to evening, and laid over an already-dark
    // picture it dims the one thing the picture is of.
    tint = (lit || NO_GROUND_TINT[lastSky] || base === lastSky) ? "" : lastSky;
  }
  if (!scene) {
    var kind = lastTerrain === "gatehouse" ? "gatehouse"
      : gate ? ""
      : BANDS_WITH_PLATES[lastBand]
        ? (TERRAIN_PLATE[lastTerrain] ? lastTerrain
           : (TERRAIN_NEAR[lastTerrain] || BAND_FALLBACK[lastBand] || ""))
        : "";
    if (!kind && gate && BANDS_WITH_PLATES[lastBand]) kind = BAND_FALLBACK[lastBand] || "";
    var list = kind ? TERRAIN_PLATE[kind] : null;
    var terr = (list && list.length) ? list[plateHash(lastRoomKey || kind) % list.length] : "";
    if (terr && TERRAIN_SCENES[terr] !== undefined) {
      // Painted for layering: same law as a gate, and it falls through to the
      // shared code below rather than repeating it.
      var thave = " " + TERRAIN_SCENES[terr] + " ";
      var tbase = SKY_BASE[lastSky] || "day";
      // A CONDITION THIS GROUND HAS NOT GOT FALLS BACK TO ITS FIRST, not to
      // "day". Every terrain until now was outdoors and had a day plate, so a
      // hardcoded day was indistinguishable from "the one it always has" - and
      // the sea cave is the first ground that has no day at all. It is a black
      // interior lit by the torch you carry, so it was shot at night and at
      // night with a torch and nothing else, and asking it for daylight asked
      // for a file that does not exist: a room with a hole in it instead of a
      // picture. The first name in the list is the ground's own default, which
      // is what this was always meant to mean.
      // Same fault and same fix as the room-plate fallback a few lines down;
      // that one was found by a room and this one by a ground.
      if (thave.indexOf(" " + tbase + " ") < 0) tbase = TERRAIN_SCENES[terr].split(" ")[0];
      // AND INDOORS THE TORCH ANSWERS AT ANY HOUR. TORCH_HOURS is a list of the
      // hours when a flame changes what you can see, and it is right about the
      // open air: at noon on a hillside a torch shows you nothing, so it must
      // not swap the plate. A cave does not care what the sky is doing. The
      // test for one needs no new table - a ground with no DAY in its list is a
      // ground daylight never reaches, which is the same sentence.
      var indoors = thave.indexOf(" day ") < 0;
      var twant = (lastTorch && (indoors || TORCH_HOURS[lastSky]) && thave.indexOf(" night-torch ") >= 0) ? "night-torch" : tbase;
      scene = "/room-bg/" + terr + "-" + twant + floodSuffix(terr, twant) + ".webp";
      if (KEYED[twant]) {
        var tp = skyPick(SKY_PAINTED[lastSky] ? lastSky : tbase);
        sky = "/sky/" + tp.file + ".webp"; turn = tp.turn;
      }
      lit = twant === "night-torch";
      line = MOB_LINE[terr] || MOB_LINE_DEFAULT;
      tint = (lit || NO_GROUND_TINT[lastSky] || tbase === lastSky) ? "" : lastSky;
      // AND THE SAME FOR WHAT IS STANDING IN IT. The ground already knows it is
      // indoors two lines up and takes its night plate at noon; the creature on
      // that ground did not, and kept the hour from the sky outside. At any
      // daylight hour that is the tint named day, there is no rule for day, and
      // the result was a wrack crab lit for a bright afternoon standing on a
      // pitch-black cave floor. It reads as a cut-out, because that is what it
      // was. Only the sea cave is dark enough for this to show, which is why it
      // survived every mountain ground and both crossing shores.
      if (indoors) mobHour = lit ? "" : tbase;
    } else {
      // The old single-layer plates: sky baked in, wash on top, unchanged.
      // It still claims the sequence and records what it left on screen, so the
      // held-frame swap below cannot be fooled by a plate this branch painted:
      // without these two lines, walking gatehouse -> hillside and back would
      // find scenePainted still naming the hillside and put it up unloaded.
      sceneSeq++;
      scenePainted = terr ? "/room-bg/" + terr + ".webp" : "";
      if (skyEl) { skyEl.style.backgroundImage = ""; skyEl.style.transform = ""; }
      sceneEl.style.backgroundImage = terr ? "url(/room-bg/" + terr + ".webp?v=" + BG_V + ")" : "";
      sceneEl.style.backgroundSize = "100% 100%";   // see the layered path below
      // NO WEATHER INDOORS. The gatehouse is one baked plate lit by its own
      // fire, and washing it with the hour put rain on a room with a roof and
      // dusk on a room with no window. Whatever is happening outside stops at
      // the door (rome, 2026-09-08).
      sceneEl.className = (kind === "gatehouse") ? "" : (SKY_KNOWN[lastSky] ? "sky-" + lastSky : "");
      if (mobsEl) { mobsEl.className = ""; mobsEl.style.top = boxPct(MOB_LINE_DEFAULT); }
      sceneEl.style.backgroundPosition = "center center";
      return;
    }
  }
  // THE SKY MUST NOT ARRIVE BEFORE THE GROUND (rome, 2026-09-06). Both layers
  // are assigned in the same breath, so this is not an ordering mistake — it is
  // the CACHE. There are seven sky files for the entire world, so after the
  // first minute of play every one of them is local and paints in the same
  // frame it is asked for. There are eighty scenes averaging 2.7MB, one per
  // ground per condition, so nearly every room you walk into is a fresh
  // download. Set both at once and the sky lands instantly and the ground lands
  // when it lands, and in between the player is looking at an empty sky over
  // nothing, which reads as the world failing to load rather than as loading.
  //
  // So the swap WAITS for the ground. The room you are leaving stays on screen,
  // whole, until the next one can be shown whole — a held frame reads as a
  // pause, a skeleton reads as a fault, and the pause is shorter than it looks
  // because the picture is decoded before it goes up rather than during. A
  // sequence number makes walking fast safe: a slow plate that arrives after
  // you have already left cannot paint over the room you are now in.
  var url = "url(" + scene + "?v=" + BG_V + ")";
  var mine = ++sceneSeq;
  if (lastCovered) { sky = ""; turn = ""; }
  var precipitation = scene && !lastCovered && !SHELTERED[place] ? mobHour : "";
  var put = function () {
    if (mine !== sceneSeq) return;         // a newer room got here first
    sceneEl.style.backgroundImage = url;
    // CONTAIN, AND SET INLINE BECAUSE THE PAINT IS INLINE. The stylesheet says
    // contain; this line said cover on every repaint and an inline style wins,
    // so the sheet's rule would have been dead the moment a room was walked
    // into. They have to agree, and the room is the one that must be whole.
    sceneEl.style.backgroundSize = "100% 100%";
    // The mask on the blood tint needs the same picture; a custom property is
    // the only way to hand a stylesheet a URL that is decided at runtime.
    sceneEl.style.setProperty("--sceneimg", url);
    if (skyEl) {
      skyEl.style.backgroundImage = sky ? "url(" + sky + "?v=" + SKY_V + ")" : "";
      skyEl.style.backgroundPosition = "center 55%";
      // Set every time, cleared when there is no turn: a transform left behind
      // from the last room would mirror a sky that was never asked to be.
      skyEl.style.transform = turn;
      fitSky();
    }
    // No overlay on a layered room — the sky is real. The only thing that
    // changes is how the ground is lit, and that is a filter that respects the cut.
    sceneEl.className = tint ? "t-" + tint : "";
    // WHAT IS STANDING THERE IS STANDING IN THE SAME LIGHT — but it does not
    // take the same class, and sharing one was the bug. The scene's tint is a
    // CORRECTION: it is only set when the ground is borrowed, because a plate
    // photographed for this hour needs nothing done to it. A sprite is never in
    // that position. There is exactly one picture of each creature, lit for day,
    // and it is borrowed EVERY hour that is not day — so on the night plate,
    // where the scene rightly asked for no correction, an owl stood in full
    // daylight on a moonless glacier.
    //
    // So the creatures read the HOUR, not the scene's correction for it. Day
    // and "in" have no rule and pass through untouched, which is what they want.
    // AND WHAT IS STANDING IN IT IS IN THE TORCHLIGHT TOO. This is the one
    // place the creatures do not simply read the hour: the hour is still night,
    // but the light on the thing three yards in front of you is coming from
    // your hand, and t-night at brightness .26 would leave a wolf as a silhouette
    // on ground the plate has lit to orange. It follows the PLATE, so an unpainted
    // ground keeps its dark and nothing is lit by a torch the picture cannot see.
    if (mobsEl) {
      mobsEl.className = lit ? "t-night-torch" : mobHour ? "t-" + mobHour : "";
      // ...and standing where this plate's ground actually is. Set every time,
      // never only when it differs: a line left over from the room behind you
      // would put the next room's animals wherever the last one's stood.
      mobsEl.style.top = boxPct(line);
    }
    // ...and centred rather than pinned at 55%. The 55% only ever meant
    // anything while the picture overflowed its box; contained, it does not
    // overflow vertically at all and the plate fills the box's height exactly -
    // which is what keeps MOB_LINE honest, since the line is a share of that
    // same box and the plate now occupies all of it.
    sceneEl.style.backgroundPosition = "center center";
    scenePainted = scene;
    setWeather(precipitation);
  };
  // Already up: this is a light change on the same ground (the hour turning, a
  // sky the scene is borrowed under). Nothing to fetch, so do not hold a frame.
  if (scene === scenePainted) { put(); return; }
  var pre = new Image();
  // A plate that 404s or a connection that dies must not freeze the last room
  // on screen forever — put it up regardless and let the layer be empty. Same
  // handler both ways on purpose: the failure case and the success case want
  // exactly the same thing to happen next.
  pre.onload = put;
  pre.onerror = put;
  pre.src = scene + "?v=" + BG_V;
  // A picture already in the browser's cache is complete the moment its src is
  // set and may never fire a load event, which would hold the previous room up
  // for good. Walking back the way you came is the common case, so this is the
  // common path, not the edge.
  if (pre.complete) put();
}

// Put on screen whatever is currently both wanted and permitted. Saves nothing,
// so it is safe to call on load, on the grant, and on every reconnect.
function applyView() {
  viewMode = (viewWant === "image" && artAllowed) ? "image" : "text";
  document.body.setAttribute("data-view", viewMode);
  // The grip, the band and the chips all appear or vanish with the view, so the
  // floor of the picture is a different number either side of this line. After
  // a frame, because none of it has been laid out yet.
  requestAnimationFrame(fitPicture);
  // The button reads the CHOICE, not the compromise — otherwise it would say
  // "text" back to someone who had just asked for pictures and was waiting.
  if (viewBtn) {
    viewBtn.textContent = viewWant;
    viewBtn.setAttribute("aria-checked", viewMode === "image" ? "true" : "false");
  }
  paintScene(null, null, null, null);
  if (viewMode !== "image") { lastMobs = "x"; paintMobs(null); }
  else if (lastMobFrame) paintMobs(lastMobFrame.ids, lastMobFrame.doing, lastMobFrame.dead);
  runAnims();   // a hidden strip must not keep a timer alive
  // The strip changes height under the text, so put the newest line back on
  // the floor of it — switching view must never lose your place in a fight.
  if (typeof log !== "undefined" && log) log.scrollTop = log.scrollHeight;
}
// The ONLY thing that writes the preference: somebody clicking the control.
function setView(mode) {
  viewWant = mode === "image" ? "image" : "text";
  try { localStorage.setItem("nomad_view", viewWant); } catch (e) {}
  applyView();
}
applyView();

// THE GRIP. The strip is a quarter of the window because the picture is the
// point; pull it and you get half, for reading back through a fight you just
// had. Remembered, because whichever way you like it you will like it every
// time.
// THE SPRITES. Keyed by template id through a fixed table, same law as the
// plates: nothing off the wire is ever built into a path, and a creature with
// no sprite yet simply does not appear rather than appearing wrong. The heights
// are a fraction of the viewport and they are the ONLY thing keeping a stoat
// from arriving the size of a wolf.
// ONE DIAL FOR THE WHOLE MENAGERIE (rome, 2026-09-06: most of them are too
// small). The table below is a set of RELATIONSHIPS, not a set of sizes — a man
// stands at 22, so the hind above him is genuinely taller at the shoulder and
// the stoat below comes to your shin — and re-typing thirty numbers to make
// them all bigger would throw every one of those away. So the numbers stay as
// written and this multiplies them at paint time. Change this line, not the
// table; the table is the drawing, this is how close you are standing.
//
// WHAT SETS THE CEILING: a room paints four at most (chips.ts), and the row
// gives way rather than clipping now (see #mobs img), so this is chosen for the
// COMMON case — one or two creatures — instead of the worst one. A crowd on a
// narrow screen scales itself down from here.
// HOW BIG A CREATURE IS ON SCREEN.
//
// MOB_SPRITE holds real height: 22 units is a standing man at 1.75m. Drawing
// that range straight was the problem. The hill runs from a 3-unit stoat to a
// 44-unit drake - fifteen to one - so any single multiplier that made a wolf
// read properly made the drake taller than the window, and any multiplier the
// drake could live with left the small things as smudges over the prose.
//
// So the range is COMPRESSED rather than scaled: vh = K * units^P. Games have
// always done this; a stoat you cannot see is not more realistic, it is just
// absent. P below is the amount of squeeze (1 would be the old straight
// multiply) and K is set so a standing man lands at 42vh - a bit under half the
// view, which is how the crawlers this is drawn after framed a monster.
//
// The art's own stage lock asks for a man at a FIFTH of the frame, which works
// out at ~22vh. That was followed and it reads as a diorama seen from across
// the room. This is deliberately larger.
// A MAN IS THE ANCHOR OF THE CURVE and also of the FRAME. 42vh is not a free
// number: centred on the horizon at 55%, a standing man's feet land at 76%.
//
// THAT USED TO BE THE TEXT LINE EXACTLY. The closed prose strip was a quarter of
// the column, so it began at 75% and he stood on it with the whole picture above
// him his. The strip is a third now (rome, 2026-09-09) and begins at 67%, so the
// bottom 9vh of a standing man — about a fifth of him, feet and shins — is behind
// the prose. Written down because 42 was CHOSEN for the old coincidence and the
// note claiming it still held would otherwise be a lie in the one place someone
// would go looking before re-tuning the curve.
//
// It is not a defect: the gradient is near-clear at its top edge, and a figure
// whose feet run under the words reads as standing IN the room rather than in
// front of it. Restoring the old exactness is possible and neither way is free —
// the horizon would have to come up from 55% to 46%, which desyncs the creatures
// from the horizon the plates are actually photographed to, or MAN_VH would have
// to drop from 42 to 24, which shrinks the whole roster back past where the two
// MOB_P cuts below just brought it. Left alone deliberately.
// Everything smaller sits comfortably inside that, which is why "centred, not
// stood on a line" works for the other forty.
// (The unit is vh: a share of the WINDOW, which is what the picture fills. It
// spent a day as cqh, measured against a box the picture had to itself, and the
// box is gone — it cost more of the plate than it was worth.)
var MAN_VH = 42;
// 0.85 -> 0.65 -> 0.45 (rome, 2026-09-09: twice, the small ones are too small). P is the amount
// of squeeze and it works from the anchor outwards, so lowering it moves the two
// ends of the roster and leaves the middle where it is. Across the two steps an
// adder went 7.7 -> 17.1vh and a ptarmigan 9.9 -> 19.5, while a hill-wolf shifted
// 26.9 -> 33.1 and a red hind barely moved at all. A standing man is the anchor
// and does not move by construction.
//
// IT ALSO PULLS THE DRAKE IN, 75.7 -> 57.4vh, which is the other half of what was
// asked for.
//
// HOW MUCH FURTHER THIS CAN GO. 0.35 would put an adder at 20.9vh, and that is
// where the curve starts costing something real: a hare would be 26.7 against a
// wolf at 34.9 and a hind at 39.2, and the ladder between a small animal, a
// middling one and a big one stops being readable. 0.45 still has that ladder. Worth knowing that it is the SAME number doing both: the curve has
// one dial and you cannot raise the small end without lowering the big one.
// Everything here is further from life-size than it was, and deliberately so —
// see the note above. A stoat you cannot see is not more realistic, it is absent.
var MOB_P = 0.45;
var MOB_K = 42 / Math.pow(22, MOB_P);
function mobVh(id) { return MOB_K * Math.pow(MOB_SPRITE[id], MOB_P); }
// A SHARE OF THE PICTURE, WRITTEN AS CSS. Every number in MOB_SPRITE and
// MOB_LINE is a percentage of the FRAME, and the frame is now a box inside the
// window rather than the window itself - so the unit is --picth and not vh.
// Kept as one function because four callers used to spell "vh" themselves and
// three of them would have been missed.
function boxPct(n) { return "calc(var(--picth) * " + (n / 100).toFixed(4) + ")"; }
var MOB_SPRITE = {
  // EVERY NUMBER HERE IS A HEIGHT IN METRES, CONVERTED. A standing man is 1.75m
  // and he is 22, so a sprite's number is 22 * (its height / 1.75) and nothing
  // else. The table used to be written by eye and it drifted badly: a red hind
  // was 24 against the man's 22, which said a deer stands taller than a person,
  // and on screen it plainly did. A hind is about 1.2m at the shoulder and 1.45m
  // with its head up. It is 18. Twenty of the twenty-six were wrong the same
  // way — everything four-legged and everything with feathers was drifting up
  // toward human size, because eyeballing a sprite in isolation always does
  // that. Derive, do not adjust: if one of these looks wrong, change the METRES
  // in the comment and recompute, so the animals stay right relative to each
  // other instead of each being right on its own.
  //
  // ---- the summer people, and the ruler everything is measured against ------
  "the-herd": 22,          // 1.75  a man standing. Their sprites carry a baked
  // THE ONE DELIBERATE EXCEPTION TO THE METRE RULE, corrected once (rome,
  // 2026-09-08: the milker was much larger than the herd). She is crouched at
  // her pail, and a crouched adult is ~1.3m to the crown, which converts to 16.
  // This was set to 20 instead — sized as the person rather than the posture —
  // on the argument that A VIEWER READS THE HEAD FIRST, there being no shared
  // ground line in this row to read a posture against (the sprites are centred
  // on the horizon, not stood on a line).
  //
  // The principle was right and the correction was its opposite. Sizing her by
  // the height a STANDING woman would have, while the art shows her folded into
  // about 0.6 of that, inflates everything about her by the same factor — and
  // the first thing it inflates is the head. Measured: at 20 her head came out
  // 1.88x the herdsman's. She did not read as a woman crouching, she read as a
  // giant crouching, which is a worse failure than the one being avoided.
  //
  // So she is head-matched, and to the BUTTER WIFE rather than to the herdsman:
  // he is drawn long and lanky with a notably small head, and she is the second
  // standing human here and the ordinary build of the two. At 13 their heads
  // measure 7.32 and 7.66 — the same woman, one of them kneeling. That lands her
  // at 0.64 of a standing man, which is a person on her haunches with her back
  // straight, and it is still well clear of reading as a child.
  //
  // THE TRAP THIS CAME FROM, for whoever sizes the next one: the frame is filled
  // by the pose, not by the animal. A creature drawn standing has its own height
  // in the frame; one drawn low has only its crouched extent, and the scale
  // number governs whatever is IN the picture. Every other human here is drawn
  // upright, so she is the only entry the distinction has ever bitten.
  "the-milker": 13,        // 1.30  crouched, and head-matched to the butter wife.
  //                                alpha 140/255:
  "a-fold-dog": 9,         // 0.70  they are not solid, and a player should be
  //                                able to see that without being told.
  // ---- the big animals -------------------------------------------------------
  "cave-lion": 19,         // 1.50  the size of a pony, and it is head-up here
  "red-hind": 18,          // 1.45  1.2m at the shoulder — SHORTER than the man
  "bone-breaker": 14,      // 1.15  a lammergeier stood on the ground
  "brooding-vulture": 14,  // 1.10
  "hill-wolf": 13,         // 1.05  a wolf is chest-high on a man, not eye-high
  "feral-goat": 13,        // 1.00
  "carrion-vulture": 13,   // 1.00
  "hill-eagle": 11,        // 0.90  perched. Wings out is a wider sprite, not a taller one
  "lynx": 10,              // 0.80
  // ---- and the small ones, which are small ----------------------------------
  "eagle-owl": 9,          // 0.70  the biggest owl there is, and still knee-high
  "scarp-raven": 7,        // 0.55
  "mountain-hare": 6,      // 0.50  sitting up
  "snow-fox": 6,           // 0.50
  "hill-fox": 6,           // 0.50
  "glutton": 6,            // 0.45  a wolverine is a badger's size, not a bear's
  "wildcat": 5,            // 0.40
  "mountain-chough": 5,    // 0.39
  "ptarmigan": 4,          // 0.33
  "gill-adder": 4,         // 0.30  coiled
  "the-gravid-adder": 3,   // 0.25  coiled, and heavier than the stone adder rather than taller
  "ermine": 3,             // 0.25  up on its hind legs
  "stone-adder": 3,        // 0.25  coiled
  // ---- THE RARE BLOOD OF THE MOUNTAIN (mig 247) ------------------------------
  // Every one of these is the uncommon form of an animal already on this list,
  // and until now not one of them had a picture: a 12% pale drake and a 15% snow
  // hare are exactly the things a player should get to SEE are different, and
  // they were rendering as nothing at all. The gravid adder above was the first
  // of them to be drawn; these are the rest.
  "great-vulture": 14,        // 1.15
  "lead-wolf": 14,            // 1.10
  "old-billy": 14,            // 1.10
  "red-stag": 22,             // 1.75  a stag stands as tall as a man; the hind beside him is 18
  "snow-hare": 6,             // 0.50
  "the-blue-fox": 6,          // 0.50
  "the-bone-dropper": 14,     // 1.15
  // 20 IS RIGHT, THE NOTE THAT WAS HERE WAS NOT. It read "sized to read like the
  // milker, seated at her churn" — the exception that was corrected on
  // 2026-09-08. It does not apply to her: the DESCRIPTION has her sitting at the
  // churn and the ART has her standing with a pail, so she needs no exception at
  // all. 20 is the plain metre rule for a woman on her feet, and her head
  // measures 7.66vh against the crouched milker's 7.32 — the same build.
  "the-butter-wife": 20,      // 1.60  a woman standing. Sized like anything else.
  "the-dancer": 3,            // 0.25
  "the-last-dog": 9,          // 0.70
  "the-old-glutton": 6,       // 0.50
  // ---- THE ROAD'S TWENTY-TWO (2026-09-21) -----------------------------------
  // NOT IN THIS TABLE IS NOT IN THE GAME. Every one of these had a cut sheet, a
  // packed strip and a MOB_ANIM row, and not one of them could be seen: the
  // strip builder patches MOB_ANIM and nothing else, mobVh reads MOB_SPRITE, and
  // a creature this table has never heard of resolves to a height of NaN. They
  // were in the roster, in the DOM, and drawn at no size at all.
  //
  // Sized by the hill's own rule rather than the coast's, because this is the
  // hill's country: V is metres x 12.5, which is exactly what the rest of the
  // set already solves to - the ermine at 0.25 is 3, the wildcat at 0.40 is 5,
  // the hill wolf at 1.05 is 13, the hind at 1.45 is 18 and a man at 1.75 is 22.
  // Measured first rather than assumed: all twenty-two sheets fill 96-98% of
  // their cell, so there is none of the drawn-in air that made the crossing's
  // dead solve to 29 and the crabs to 10, and the plain rule applies directly.
  "drove-dog": 9,             // 0.70  a lurcher; just over the marsh hound at 9
  "the-drove-master": 10,     // 0.80  heavier, and still short of a hill wolf
  "masterless-dog": 9,        // 0.70
  "lead-dog": 10,             // 0.80
  "footpad": 22,              // 1.75  a man
  "wayman": 22,               // 1.75
  "road-carrier": 23,         // 1.85  a tall figure, as the prose has it
  "the-miller": 22,           // 1.75
  "the-toll-clerk": 22,       // 1.75
  "the-long-warden": 23,      // 1.85
  "the-mire-walker": 23,      // 1.80
  "otter": 4,                 // 0.30  low on land, which is the whole joke of it
  "dog-otter": 4,             // 0.35
  "rat": 3,                   // 0.15  the ermine's number, and the floor
  "brood-rat": 3,             // 0.20
  "fleet-rat": 3,             // 0.15
  "albino-rat": 3,            // 0.15
  "grey-heron": 13,           // 1.00  standing; the same as the feral goat at 1.00
  "roe-deer": 13,             // 1.00  head up. Smaller than the red hind at 18
  "white-roe": 13,            // 1.00
  "the-baited-bear": 15,      // 1.20  on all fours, chained
  "the-chain-breaker": 17,    // 1.35  the bigger of the two, and the chain is off
  "the-old-raven": 7,         // 0.55
  "the-one-who-stayed": 22,   // 1.75
  "the-pale-drake": 44,       // 3.50  twice a standing man, same as the drake it is a variant of
  "the-raiding-fox": 6,       // 0.50
  "the-tom": 5,               // 0.40
  // ---- THE TWO THAT ARE NOT MEASURED AGAINST A MAN --------------------------
  // The eyrie holder's own line is that it stands as tall as a man, so it does:
  // the same 22, and what makes it enormous is that it is a BIRD at that height.
  "eyrie-holder": 22,      // 1.75
  // And the one thing on the hill that is one of one — twice the height of a
  // standing man and half again as wide, which on any window is most of what
  // you can see. There is no version of meeting this that fits beside a hare.
  "the-drake": 44,         // 3.50
  // ---- THE CROSSING (mig 191) ------------------------------------------------
  // THE HILL STANDS UP AND THE COAST LIES DOWN, and that breaks the metre rule.
  // Every number here is a HEIGHT, which is the honest measure of an animal that
  // stands and a bad one for a crab. Three passes settled how to size this coast,
  // and the method is worth more than the numbers:
  //
  //  1 · The number scales the CELL, and the cell is the union of every pose. How
  //      much of it the animal fills in the pose you actually look at runs from
  //      54% to 98% here. Every hill creature sits at 96-98% because they are all
  //      drawn standing, which is why the table never had to say this.
  //  2 · No single SPAN is posture-free. Ink height called the lymer the bigger
  //      dog, nose-to-tail called the marsh hound bigger by a lot, and both were
  //      honestly measured - the hound's idle is head-down, the lymer's head-up.
  //  3 · So match INK AREA, which goes as size squared whatever the animal is
  //      doing: sqrt(ink fraction x vh x vh x aspect), against a creature of the
  //      SAME BUILD already in the game. Same build is the whole of the caveat -
  //      see the crabs below.
  //
  // Measured references, taken the same way: the herdsman 20.3, a hill wolf 22.3,
  // a fold dog 19.4, a carrion vulture 15.5, a scarp raven 11.8, the butter wife
  // 24.9. Re-measure after ANY re-cut: a new pose moves the bbox and silently
  // resizes the animal without the number changing at all.
  //
  // ---- THE DEAD STAND TALLER THAN THE LIVING (rome, 2026-09-13) -------------
  // These eleven were area-matched to the herdsman and landed at 32-45vh as
  // drawn, which put most of them under the hill's own men. That is defensible
  // arithmetic and it is the wrong call for this region: the crossing's whole
  // idea is that these people drowned and the shift did not end, and a thing you
  // read as a slightly short man in a wet coat is not that.
  //
  // So every one of them is solved to 46vh standing - clear of the herdsman at
  // 37.4 and the one who stayed at 40.3 - measured on the pose that actually
  // shows the creature upright. That last part is most of the work: the fowler's
  // idle is PRONE in the sedge, the ferryman's is chest-deep with only his head
  // and hands out, and measuring either of those would have sized the man by the
  // part of him you cannot see. Both are solved on a standing frame instead, and
  // the water and the turf then take the difference, which is the point of them.
  //
  // The numbers look large beside the hill's 22 and that is the same lesson this
  // table keeps teaching: the number buys CELL, and a densely drawn figure needs
  // more of it. Read the standing column, never the number.
  //
  // ---- the two LIVING men keep the herdsman's scale -------------------------
  // The strand thief and the wrecker are ordinary robbers, not dead, and they
  // are sized against the hill's living people on purpose: when one of them is
  // in a room with the tide warden, the difference in height is the difference
  // between a man who can be reasoned with and a man who cannot.
  "the-salt-widow": 28,    // matched to the butter wife, who is drawn chunkier than the herdsman
  "the-reed-walker": 30,   // half behind the stems, so a lot of his cell is reed and air
  "the-drowned-ferryman": 29, // A MAN, and sized as one. No pose of his shows all of him -
                           // the idle is head and hands on the rope with the rest under water -
                           // so area-matching read him as a dog. He is 22 like the rest of them
                           // and the water takes the difference, which is the whole idea of him.
  "the-pilot": 29,
  "the-drover": 30,
  "strand-thief": 19,
  "the-eel-cutter": 29,
  // ---- THE FORTRESS (2026-09-23). Sized against the roster already here: a man
  // is 29-30, a wolf 13, the drake 44. Each number below is the creature's own
  // entry read as a height, not a guess at a silhouette.
  "skeleton": 28,          // a soldier's frame with nothing on it - a man, and lighter
  "bone-knight": 32,       // "a TALL skeleton", and it stands in mail
  "warden": 30,            // a man in plate, walking rounds
  "warden-surface": 30,    // the same warden, outdoors
  "warden-captain": 34,    // "BIGGER than the wardens it once led"
  "last-watchman": 30,     // a watchman, dried inside his kit
  "twice-dead": 29,        // an old man of the barrow-dead
  "thrice-dead": 29,       // his elder, no bigger
  "marrow-cantor": 33,     // "a TALL frame of fused bone"
  "forgotten-king": 31,    // crowned, and mostly seated
  "marrow-king": 31,       // the same frame, wound through with others
  "drowned-god": 46,       // "IMMENSE" - sits chest-deep and the dark leans in with it
  "the-drowned": 30,       // a drowned man, bloated but a man
  "drowned-hulk": 40,      // "swollen VAST, filling the flooded dark where it stands"
  "rag-and-bone": 44,      // "about half again the size of" a man, and hung with its load
  "verdigris-thing": 30,   // "something man-shaped" under a century of crust
  "pale-crawler": 14,      // low and long on all fours, under a wolf
  "pale-stalker": 17,      // the bigger blood of the same thing
  "three-hound": 20,       // a heavy hound - taller than a wolf, three heads up
  "two-hound": 18,         // "a head short and without the bulk to make up the difference"
  "grave-hyena": 12,       // a hyena stands under a wolf and slopes away behind
  "dire-hyena": 15,        // the mean one, and bigger with it
  "cutpurse": 15,          // "HALF THE SIZE OF A PERSON and twice as quick"
  "cutthroat": 15,         // the same build with a knife in it
  "the-refuge-man": 30,
  "the-tide-warden": 29,
  "the-bridge-mason": 29,
  "the-fowler": 29,        // drawn broad in the reed cloak, so the number comes down
  "the-scaffold-hand": 32, // hangs in a harness: a tall cell with a man across the middle of it
  "the-wrecker": 14,       // the densest sheet of the twelve, and the largest figure of them
  // ---- the beasts, each against its own kind --------------------------------
  "bull-seal": 34,         // forty stone, against the grey seal at 23
  "a-lymer": 11,           // stands with a hill wolf, which is what the prose claims
  "marsh-hound": 9,        // just over a fold dog, which is the same animal
  "black-backed-gull": 12, // against a carrion vulture; it is the one that eats other birds
  "great-gull": 15,        // a goose, and a looser silhouette than the vulture
  "bittern": 20,           // tall but SLIGHT - all neck and no width, so it needs a big cell
  "oystercatcher": 14,     // see the floor note below
  // ---- and the ones area cannot measure -------------------------------------
  // A CRAB IS MOSTLY GAPS. Ink area works between two dogs and lies between a
  // crab and a cat: the space between eight legs is not the animal, so the great
  // crab area-matched to a cave lion came out at 46 - drake scale. These five are
  // sized by what they measure ACROSS instead, which is the dimension a sprawling
  // thing actually occupies.
  "the-great-devil-crab": 34, // 2.30m across, and both claws are the big one
  "the-great-crab": 28,    // 2.00m across: the size of a cart, as the room says
  // ...AND THE TWO SMALL CRABS ARE THE ONE PLACE THE RULE IS OVERRIDDEN. Measured
  // honestly a wrack crab is 0.38m across and solves to ONE, below the floor the
  // hill set for an ermine and a coiled adder. That floor is not an accident and
  // the note at the top of this table says why: a thing you cannot see is not
  // more realistic, it is absent. So they sit on it, in proportion to each other.
  "devil-crab": 10,        // see the floor note below
  "wrack-crab": 10,        // see the floor note below
  // ---- A FLOOR ON THE SMALL END (rome, 2026-09-13) ---------------------------
  // Four of these measured 13-17vh as drawn, which is exactly the band the hill
  // puts its ermine (12.2), its ptarmigan (12.9) and its wildcat (16.0) in - so
  // by the metre rule and by precedent they were not wrong. Standing in a room
  // they still read as too small, and a room is where the question is settled.
  //
  // So they are lifted to 20vh drawn, which is the size at which a thing on a
  // beach is an animal rather than a detail of the shingle. It is the same
  // argument the note at the top of this table already makes about the ermine,
  // taken one step further: everything here is further from life-size than it
  // was, deliberately, because a creature you have to look for is absent.
  //
  // Solved, not chosen: measure the drawn height at a trial size, scale to 20,
  // invert the curve. wrack-crab 4->10, devil-crab 6->10, oystercatcher 7->14,
  // fen-viper 4->6. The wrack crab and the devil crab land on the same number
  // and are still different sizes on screen - the devil crab rears with both
  // claws up and fills more of its cell, which is 27vh of crab against 38vh.
  // ---- the six whose sheets did not change on 13 September -------------------
  // Still the numbers solved on the 12th, and still correct: their art was not
  // re-cut, so their cells and their fill fractions are exactly what they were.
  "grey-seal": 23,         // two metres of animal, lying down
  "silver-eel": 21,        // 54% fill - the S-curve's gap is half the cell
  "ford-eel": 17,          // the same, on a smaller eel
  "old-conger": 15,        // the heavy coil
  "conger": 14,            // the lighter coil
  "fen-viper": 6,          // see the floor note below
};

// WHAT A CREATURE DOES WHILE YOU STAND THERE. A sprite with an entry here is not
// one picture but SIX, side by side in one file, and the frames are a small piece
// of behaviour rather than a loop: an animal mostly holds still, and now and then
// it does something. So the frames are named in two groups. IDLE is what it does
// almost all of the time and cycles slowly. ACT is the thing it occasionally
// breaks into — for an adder, tightening and striking and drawing back — played
// once, start to finish, and then it settles again.
//
// Cycling all six would have every snake in the world striking every three
// seconds, which is both wrong about snakes and exhausting to stand next to.
//
// The 'aspect' field is ONE frame's width over its height, measured off the strip at build
// time. The element is sized by height like every other sprite, and this is what
// turns that into the right width.
// HOW A CREATURE MOVES, AND IT IS NOT MY DESIGN. These animals were drawn as
// POSE STUDIES with a viewer of their own, and that viewer already worked out
// what each pose is for and how it is played: a gait is two poses alternating at
// 5Hz with the body swaying through a sine, a hare and the dancer leave the
// ground on the beat, a bird beats its wings at 4Hz and rises and shrinks with
// the distance, and a resting animal breathes on a scale pulse of three parts in
// a thousand. Cycling the frames in place instead threw all of that away.
//
// So the frames are addressed BY NAME here rather than by position, and the
// driver below is a port of that viewer's own draw(): same constants, same
// per-species exceptions, same feel. The names are the pose vocabulary the
// studies were generated with - idle, move-a, move-b, up, down, glide, landing -
// and each creature simply has the ones it was drawn with.
var MOB_ANIM = {
  "warden-surface":   { n: 8, aspect: 0.93, f: {"idle":0,"hold-the-salute":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "warden":           { n: 8, aspect: 0.93, f: {"idle":0,"hold-the-salute":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "cutthroat":   { n: 8, aspect: 1.026, f: {"idle":0,"rest":1,"graze":2,"snatch-escape":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "cutpurse":   { n: 8, aspect: 1.243, f: {"idle":0,"rest":1,"graze":2,"snatch-escape":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "dire-hyena":   { n: 8, aspect: 1.063, f: {"idle":0,"alert":1,"feed":2,"guard-the-kill":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "grave-hyena":   { n: 8, aspect: 1.238, f: {"idle":0,"alert":1,"feed":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "forgotten-king":   { n: 8, aspect: 0.931, f: {"idle":0,"keep-the-seat":1,"stand-from-the-throne":2,"call-the-dark":3,"alert":4,"attack":5,"recover":6,"death":7} },
  "two-hound":   { n: 6, aspect: 1.287, f: {"idle":0,"hold-ground":1,"rest":2,"feed":3,"attack":4,"death":5} },
  "three-hound":   { n: 6, aspect: 1.219, f: {"idle":0,"hold-ground":1,"rest":2,"feed":3,"attack":4,"death":5} },
  "pale-stalker":   { n: 8, aspect: 1.528, f: {"idle":0,"alert":1,"feed":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "pale-crawler":   { n: 8, aspect: 1.661, f: {"idle":0,"alert":1,"feed":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "verdigris-thing":   { n: 8, aspect: 1.041, f: {"idle":0,"lay-on-the-hand":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "rag-and-bone":   { n: 8, aspect: 0.978, f: {"idle":0,"take-it-up":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "drowned-god":   { n: 8, aspect: 0.991, f: {"idle":0,"keep-the-seat":1,"take-hold":2,"lift-you-clear":3,"alert":4,"attack":5,"recover":6,"death":7} },
  "drowned-hulk":   { n: 8, aspect: 0.997, f: {"idle":0,"take-hold":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-drowned":   { n: 8, aspect: 1.05, f: {"idle":0,"take-hold":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "marrow-king":   { n: 8, aspect: 1.012, f: {"idle":0,"keep-the-seat":1,"rise":2,"take-hold":3,"alert":4,"attack":5,"recover":6,"death":7} },
  "thrice-dead":   { n: 8, aspect: 1.003, f: {"idle":0,"rise":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "twice-dead":   { n: 8, aspect: 1, f: {"idle":0,"rise":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "last-watchman":   { n: 8, aspect: 1.284, f: {"idle":0,"hold-the-salute":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "warden-captain":   { n: 8, aspect: 1.061, f: {"idle":0,"hold-the-salute":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "bone-knight":   { n: 8, aspect: 1.02, f: {"idle":0,"hold-the-salute":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "marrow-cantor":   { n: 8, aspect: 0.941, f: {"idle":0,"listen":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "skeleton":   { n: 8, aspect: 1.132, f: {"idle":0,"listen":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "white-roe":           { n: 8, aspect: 1.037, f: {"idle":0,"alert-alarm":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "wayman":              { n: 8, aspect: 0.957, f: {"idle":0,"alert":1,"graze":2,"snatch-escape":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-toll-clerk":      { n: 8, aspect: 0.969, f: {"idle":0,"shift-the-weight":1,"alert":2,"count-it-out":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-mire-walker":     { n: 8, aspect: 1.024, f: {"idle":0,"stand-in-it":1,"alert":2,"let-it-settle":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-miller":          { n: 8, aspect: 1.009, f: {"idle":0,"work-the-water":1,"alert":2,"haul-it-up":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-long-warden":     { n: 8, aspect: 1.04, f: {"idle":0,"turn-the-distance":1,"alert":2,"square-the-plates":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-drove-master":    { n: 8, aspect: 1.1, f: {"idle":0,"alert":1,"work-the-line":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-chain-breaker":   { n: 8, aspect: 1.107, f: {"idle":0,"rest":1,"feed":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-baited-bear":     { n: 8, aspect: 1.284, f: {"idle":0,"rest":1,"feed":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "roe-deer":            { n: 8, aspect: 1.028, f: {"idle":0,"alert-alarm":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "road-carrier":        { n: 8, aspect: 0.939, f: {"idle":0,"check-the-satchel":1,"alert":2,"set-down-the-load":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "rat":                 { n: 8, aspect: 1.693, f: {"idle":0,"rest":1,"feed":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "otter":               { n: 8, aspect: 1.618, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "masterless-dog":      { n: 8, aspect: 1.299, f: {"idle":0,"alert":1,"cast-about":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "lead-dog":            { n: 8, aspect: 1.103, f: {"idle":0,"alert":1,"cast-about":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "grey-heron":          { n: 8, aspect: 1.136, f: {"idle":0,"alert-alarm":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "footpad":             { n: 8, aspect: 0.929, f: {"idle":0,"alert":1,"graze":2,"snatch-escape":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "fleet-rat":           { n: 8, aspect: 1.563, f: {"idle":0,"rest":1,"feed":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "drove-dog":           { n: 8, aspect: 1.156, f: {"idle":0,"alert":1,"work-the-line":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "dog-otter":           { n: 8, aspect: 1.448, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "brood-rat":           { n: 8, aspect: 1.475, f: {"idle":0,"rest":1,"feed":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "albino-rat":          { n: 8, aspect: 1.454, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-tide-warden":        { n: 7, aspect: 0.978, f: {"idle":0,"move-a":1,"move-b":2,"attack":3,"death":4,"cut-the-stick":5,"recover":6} },
  "the-scaffold-hand":      { n: 8, aspect: 0.972, f: {"idle":0,"work-the-stone":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-salt-widow":         { n: 8, aspect: 1.136, f: {"idle":0,"feed-the-flue":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-refuge-man":         { n: 8, aspect: 1.033, f: {"idle":0,"turn-from-the-wall":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-reed-walker":        { n: 8, aspect: 1.026, f: {"idle":0,"move-a":1,"move-b":2,"attack":3,"death":4,"part-the-reed":5,"recover":6,"hit":7} },
  "the-pilot":              { n: 8, aspect: 0.988, f: {"idle":0,"move-a":1,"move-b":2,"attack":3,"death":4,"read-the-water":5,"alert":6,"recover":7} },
  "the-great-devil-crab":   { n: 8, aspect: 1.254, f: {"idle":0,"alert":1,"attack":2,"recover":3,"death":4,"rest":5,"bite":6,"sweep":7} },
  "the-eel-cutter":         { n: 8, aspect: 1.387, f: {"idle":0,"lift-the-trap":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-drowned-ferryman":   { n: 8, aspect: 0.986, f: {"idle":0,"find-the-line":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-drover":             { n: 8, aspect: 1.278, f: {"idle":0,"drive-the-road":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-bridge-mason":       { n: 8, aspect: 1.025, f: {"idle":0,"dress-the-stone":1,"alert":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "bull-seal":              { n: 8, aspect: 1.279, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"feed":5,"move-a":6,"move-b":7} },
  "the-wrecker":    { n: 8, aspect: 1.014, f: {"idle":0,"alert":1,"graze":2,"move-a":3,"move-b":4,"snatch-escape":5,"attack":6,"death":7} },
  "the-fowler":     { n: 7, aspect: 1.478, f: {"idle":0,"rise-from-the-turf":1,"move-a":2,"move-b":3,"attack":4,"death":5,"recover":6} },
  "strand-thief":   { n: 8, aspect: 0.958, f: {"idle":0,"alert":1,"graze":2,"move-a":3,"move-b":4,"snatch-escape":5,"attack":6,"death":7} },
  "the-great-crab":   { n: 8, aspect: 1.503, f: {"idle":0,"alert":1,"attack":2,"death":3,"recover":4,"rest":5,"bite":6,"sweep":7} },
  "marsh-hound":      { n: 8, aspect: 1.06, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "a-lymer":          { n: 8, aspect: 1.243, f: {"idle":0,"alert":1,"move-a":2,"move-b":3,"attack":4,"death":5,"rest":6,"feed":7} },
  "wrack-crab":          { n: 8, aspect: 1.301, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"feed":5,"move-a":6,"move-b":7} },
  "silver-eel":          { n: 8, aspect: 1.178, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"graze":5,"move-a":6,"move-b":7} },
  "oystercatcher":       { n: 8, aspect: 1.18, f: {"idle":0,"attack":1,"death":2,"rest":3,"glide":4,"landing":5,"graze":6,"up":7,"down":4} },
  "old-conger":          { n: 8, aspect: 1.172, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"feed":5,"move-a":6,"move-b":7} },
  "grey-seal":           { n: 8, aspect: 1.477, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"feed":5,"move-a":6,"move-b":7} },
  "great-gull":          { n: 8, aspect: 1.19, f: {"idle":0,"attack":1,"death":2,"rest":3,"glide":4,"landing":5,"feed":6,"up":7,"down":4} },
  "ford-eel":            { n: 8, aspect: 1.408, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"graze":5,"move-a":6,"move-b":7} },
  "fen-viper":           { n: 8, aspect: 1.253, f: {"idle":0,"alert":1,"watch":2,"rest":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "devil-crab":          { n: 8, aspect: 1.155, f: {"idle":0,"alert":1,"attack":2,"death":3,"rest":4,"feed":5,"move-a":6,"move-b":7} },
  "conger":              { n: 8, aspect: 1.147, f: {"idle":0,"alert":1,"rest":2,"attack":3,"death":4,"feed":5,"move-a":6,"move-b":7} },
  "black-backed-gull":   { n: 8, aspect: 1.418, f: {"idle":0,"attack":1,"death":2,"rest":3,"glide":4,"landing":5,"feed":6,"up":7,"down":4} },
  "bittern":             { n: 8, aspect: 1.307, f: {"idle":0,"attack":1,"death":2,"rest":3,"glide":4,"landing":5,"feed":6,"up":7,"down":4} },
  "a-fold-dog":           { n: 8, aspect: 1.314, f: {"idle":0,"alert":1,"rest":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "bone-breaker":         { n: 8, aspect: 1.132, f: {"idle":0,"up":1,"glide":2,"down":3,"landing":4,"feed":5,"attack":6,"death":7} },
  "brooding-vulture":     { n: 8, aspect: 1.086, f: {"idle":0,"rest":1,"recover":2,"attack":3,"death":4,"feed":5,"move-a":6,"move-b":7} },
  "carrion-vulture":      { n: 8, aspect: 1.115, f: {"idle":0,"up":1,"glide":2,"down":3,"landing":4,"attack":5,"feed":6,"death":7} },
  "cave-lion":            { n: 8, aspect: 1.255, f: {"idle":0,"rest":1,"move-a":2,"move-b":3,"attack":4,"death":5,"alert":6,"feed":7} },
  "eagle-owl":            { n: 8, aspect: 1.315, f: {"idle":0,"glide":1,"landing":2,"attack":3,"rest":4,"death":5,"feed":6,"up":7,"down":1} },
  "ermine":               { n: 8, aspect: 1.234, f: {"idle":0,"inspect-upright":1,"move-a":2,"move-b":3,"attack":4,"death":5,"rest":6,"feed":7} },
  "eyrie-holder":         { n: 8, aspect: 1.149, f: {"idle":0,"up":1,"glide":2,"down":3,"landing":4,"attack":5,"feed":6,"death":7} },
  "feral-goat":           { n: 8, aspect: 1.075, f: {"idle":0,"graze":1,"move-a":2,"move-b":3,"attack":4,"death":5,"alert":6,"rest":7} },
  "gill-adder":           { n: 8, aspect: 1.342, f: {"idle":0,"alert":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "glutton":              { n: 8, aspect: 1.234, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "great-vulture":        { n: 8, aspect: 1.091, f: {"idle":0,"up":1,"glide":2,"down":3,"landing":4,"attack":5,"feed":6,"death":7} },
  "hill-eagle":           { n: 8, aspect: 1.203, f: {"idle":0,"glide":1,"landing":2,"attack":3,"rest":4,"death":5,"feed":6,"up":7,"down":1} },
  "hill-fox":             { n: 8, aspect: 1.373, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "hill-wolf":            { n: 8, aspect: 1.136, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "lead-wolf":            { n: 8, aspect: 1.152, f: {"idle":0,"rest":1,"hold-ground":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "lynx":                 { n: 8, aspect: 1.186, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "mountain-chough":      { n: 8, aspect: 1.258, f: {"idle":0,"glide":1,"landing":2,"rest":3,"attack":4,"death":5,"feed":6,"up":7,"down":1} },
  "mountain-hare":        { n: 8, aspect: 1.048, f: {"idle":0,"alert":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "old-billy":            { n: 8, aspect: 1.104, f: {"idle":0,"alert":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "ptarmigan":            { n: 8, aspect: 1.207, f: {"idle":0,"glide":1,"landing":2,"rest":3,"attack":4,"death":5,"graze":6,"up":7,"down":1} },
  "red-hind":             { n: 8, aspect: 1.009, f: {"idle":0,"alert":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "red-stag":             { n: 8, aspect: 1.074, f: {"idle":0,"rest":1,"hold-ground":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "scarp-raven":          { n: 8, aspect: 1.181, f: {"idle":0,"glide":1,"landing":2,"attack":3,"rest":4,"death":5,"feed":6,"up":7,"down":1} },
  "snow-fox":             { n: 8, aspect: 1.231, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "snow-hare":            { n: 8, aspect: 1.12, f: {"idle":0,"alert":1,"rest":2,"graze":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "stone-adder":          { n: 8, aspect: 1.627, f: {"idle":0,"watch":1,"rest":2,"bask":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-blue-fox":         { n: 8, aspect: 1.294, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-bone-dropper":     { n: 8, aspect: 1.172, f: {"idle":0,"glide":1,"landing":2,"feed":3,"attack":4,"death":5,"rest":6,"up":7,"down":1} },
  "the-butter-wife":      { n: 6, aspect: 1.209, f: {"idle":0,"listen":1,"move-a":2,"move-b":3,"attack":4,"death":5} },
  "the-dancer":           { n: 8, aspect: 1.246, f: {"idle":0,"alert":1,"feed":2,"move-a":3,"move-b":4,"twisting-leap":5,"attack":6,"death":7} },
  "the-drake":            { n: 14, aspect: 1.483, f: {"idle":0,"alert":1,"bite":2,"sweep":3,"inhale":4,"breath":5,"takeoff":6,"up":7,"glide":8,"down":9,"dive":10,"landing":11,"hit":12,"death":13} },
  "the-gravid-adder":     { n: 8, aspect: 1.774, f: {"idle":0,"watch":1,"rest":2,"bask":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-herd":             { n: 6, aspect: 0.991, f: {"idle":0,"keep-the-line":1,"move-a":2,"move-b":3,"attack":4,"death":5} },
  "the-last-dog":         { n: 8, aspect: 1.231, f: {"idle":0,"alert":1,"call-uphill":2,"move-a":3,"move-b":4,"attack":5,"recover":6,"death":7} },
  "the-milker":           { n: 6, aspect: 1.167, f: {"idle":0,"work-pull":1,"move-a":2,"move-b":3,"attack":4,"death":5} },
  "the-old-glutton":      { n: 8, aspect: 1.174, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "the-old-raven":        { n: 8, aspect: 1.165, f: {"idle":0,"glide":1,"landing":2,"rest":3,"attack":4,"death":5,"feed":6,"up":7,"down":1} },
  "the-one-who-stayed":   { n: 6, aspect: 1.108, f: {"idle":0,"advance":1,"move-a":2,"move-b":3,"attack":4,"death":5} },
  "the-pale-drake":       { n: 14, aspect: 1.523, f: {"idle":0,"alert":1,"bite":2,"sweep":3,"inhale":4,"breath":5,"takeoff":6,"up":7,"glide":8,"down":9,"dive":10,"landing":11,"hit":12,"death":13} },
  "the-raiding-fox":      { n: 8, aspect: 1.27, f: {"idle":0,"rest":1,"feed":2,"move-a":3,"move-b":4,"snatch-escape":5,"attack":6,"death":7} },
  "the-tom":              { n: 8, aspect: 1.117, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
  "wildcat":              { n: 8, aspect: 1.223, f: {"idle":0,"alert":1,"rest":2,"feed":3,"move-a":4,"move-b":5,"attack":6,"death":7} },
};
// Straight from the studies' viewer, and worth keeping as the numbers they are.
// Which of the drawn poses read as an animal at rest rather than an animal
// doing something — the one it cuts to between breaths.
// "alert" IS NOT IN HERE, AND THAT IS THE WHOLE POINT (2026-09-13). It used to
// be, and it sits at the head of WATCH_POSES, so any creature whose only spare
// frame was an alert used the SAME picture for idling and for having decided
// about you: it cut to "head up, fixed on you" every three seconds whether or
// not you existed, and then had nothing left to change to when it actually saw
// you. Twenty-two creatures were in that state - fourteen of them on the
// crossing - and on every one of them hunt, fight, eyeing and watch were
// invisible by construction.
//
// It also made the frame impossible to ADD. The crossing's dead are drawn with
// a work pose in slot two and that pose IS the creature; an alert drawn for
// them would have won this list ahead of it and quietly taken the work off the
// screen. So the alert could not be given to the seven that needed it until
// this word came out of this list.
//
// What a creature with nothing but an alert does now: it holds its idle and
// breathes, which is what a thing going about its business looks like, and the
// alert means one thing only.
// WHAT IT DOES INSTEAD OF STANDING THERE. A second picture, held for a few
// seconds at a time, so an idle creature is not a statue.
//
// NOT SLEEP AND NOT EATING, though this list led with "rest" and carried "graze"
// and "feed" until 2026-09-18. Thirty-four of seventy-three creatures had their
// SLEEPING frame as their calm pose, so a third of the roster lay curled up with
// its eyes shut every few seconds while wide awake, and rome watched mobs cycle
// through poses they had no business being in.
//
// Sleep has its own path already - 'asleep' holds one pose out of SLEEP_POSES and
// does not cut to anything on a clock - so 'rest' here was never anything but a
// second, wrong way to show it. Feeding is the same case since the fed beat
// started firing for grazers and hunters: a frame that has a real trigger must
// not also be idle filler, or the animal eats on a timer with nothing dead in
// front of it. An EVENT FRAME AND A SLEEP FRAME ARE NEVER IDLES.
//
// Basking is not sleeping and stays: an adder flat on a warm stone with its eyes
// open is exactly what this list is for.
var CALM_POSES = ["bask","listen","watch","hold-ground",
  "stand-ground","hold-warm-ground","keep-the-line","inspect-upright",
  // THE VARIANTS' OWN POSES, which were drawn and shipped and never named here
  // (2026-09-09). Every rare form on the hill is six frames — idle, its own
  // pose, two of gait, a blow and a death — and the second slot is the one this
  // list reads. The common forms all have theirs in it: a fold dog rests, an
  // ermine goes up on its hind legs, a herdsman keeps the line, the butter wife
  // listens. The variants were drawn with something better in that same slot and
  // nobody added the new words, so the pose existed in the strip and the driver
  // could not ask for it. Three of them are the same kind of thing their base
  // form does, so they belong here and nowhere else:
  "work-pull",      // the milker, pulling at the pail. She is rooted and this is
                    // her ordinary work, not an event
  "twisting-leap",  // the dancer. A stoat dancing IS a stoat at rest — it is
                    // what the animal is named for and when it does it
  "call-uphill",    // the last dog, still calling for people who are not coming
  // AND THE CROSSING'S DEAD, WHICH IS THE SAME LESSON AT NINE TIMES THE SIZE
  // (2026-09-13). The region's whole idea is that these people drowned and the
  // shift did not end, so the pose in slot two IS the creature — a warden who
  // never cuts his tally is just a wet man standing in the road. Every one of
  // them was drawn, shipped in the strip, and unreachable, because a name this
  // list does not know can only ever be selected on the ROOTED path and eight of
  // the nine have a walk.
  //
  // They are all CALM rather than WATCH: this is work, not a decision about you.
  // The one that is a decision — the fowler coming up out of the turf — is in
  // WATCH_POSES below with the one who stayed, for exactly that reason.
  "cut-the-stick",      // the tide warden, notching the tally at every milestone
  "read-the-water",     // the pilot, sighting a channel that stopped existing
  "lift-the-trap",      // the eel cutter, hauling a grig he set two centuries ago
  "drive-the-road",     // the drover, moving stock that is not there
  "dress-the-stone",    // the bridge mason, making the broken end neat
  "part-the-reed",      // the reed walker, one cut over and keeping pace
  "turn-from-the-wall", // the refuge man, coming off the stone he waited at
  "work-the-stone",     // the scaffold hand, upside down, working the underside
  "feed-the-flue",      // the salt widow, feeding a fire that went out
  "work-the-pan",       // ...and drawing the rake across a pan that is cold
  // THE LAST THREE OF THE TWELVE, NAMED HERE BEFORE THEY ARE DRAWN. The note
  // above is a record of the same mistake made nine times over - a pose drawn,
  // cut, packed and shipped, and unreachable because this list had never heard
  // of it. The only way that stops happening is to add the word first, so the
  // slot is waiting when the sheet arrives. A name in here that no strip owns
  // yet costs nothing: the lookup simply never matches.
  "work-the-water",     // the miller, both arms in past the elbow, and he keeps hold
  "shift-the-weight",   // the toll clerk, taking the satchel's weight - the OTHER hand never moves
  "turn-the-distance",  // the long warden, at the end of a beat, coming round to walk it back
  // AND THE FERRYMAN FINALLY HAS ONE. He was the only one of the eleven with no
  // work pose at all, which is why his idle, his hurt and his stroll were all
  // the same picture. His hands are empty in this one and in no other.
  "find-the-line",      // the drowned ferryman, feeling for a rope that is not there
  // ---- THE ROAD'S NINE (2026-09-21), added BEFORE the sheets were built, which
  // is the whole point of the note above. Four creatures carry one of these and
  // reach it; five carry TWO and reach only the first, because this list fills a
  // single slot with the earliest name a creature owns. Those five are marked in
  // the road batch and the driver is what has to change, not the art.
  "work-the-line",      // the drove dog and the drove master, putting you somewhere
  "cast-about",         // the masterless dog and the lead dog, nose down, quartering
  "check-the-satchel",  // the carrier, a thumb on the buckles without breaking stride
  "set-down-the-load",  // ...and the one moment the carrier is not carrying
  "stand-in-it",        // the mire-walker, sunk to the knee and in no hurry
  "let-it-settle",      // ...and the stillness just after it stops
  "haul-it-up",         // the miller, straightening out of the stoop with his fists shut
  "count-it-out",       // the toll clerk, telling coin into a palm that never moves
  "square-the-plates",  // the long warden, settling the coat at the end of a beat
  // ---- THE FORTRESS'S SEVEN (2026-09-21), added BEFORE the sheets are drawn.
  // The Door is the least-illustrated ground in the game: nineteen templates
  // spawn in it and the only four with art are the rats.
  //
  // THE FIRST TWO ATTEMPTS AT THIS LIST WERE BOTH WRONG, and in the same way.
  // One padded the eighth cell with "sweep", which exists on four creatures in
  // the world (two giant crabs, two drakes) and is a huge animal's wide blow.
  // The other read each creature's DESCRIPTION and wrote a pose off the prose -
  // better, and still a guess. What a creature does is not in its description,
  // it is in the sets it belongs to, and those are right here in zone-data.
  // These seven come from that: each one is a behaviour the world already
  // performs for this creature, in text, with nobody drawing it.
  //
  // Two more were needed and already existed in WATCH_POSES - "listen" and
  // "hold-ground" - so they are NOT repeated here. Note that WATCH_POSES fills
  // a single slot with its FIRST match, and "alert" leads that list: a creature
  // meant to show "listen" must therefore be drawn WITHOUT an alert, or the
  // alert wins and the listen is another cell nothing can reach.
  "hold-the-salute",    // DRILL_SOLDIERS: two of them meet and salute, forever
  "rise",               // REVENANTS: put one down and it gets back up and comes again
  "take-hold",          // DROWNERS: it closes on you and does not let go
  "take-it-up",         // HOARDERS: the rag-and-bone scoops and caches
  "lay-on-the-hand",    // CORRODERS: metal blooms and flakes where it touches
  // "surface" WAS HERE AND IS NOT A POSE. SURFACERS climb up out of the wells,
  // which is a real behaviour and reads like a real frame - but a cell draws no
  // ground, no edge and no hole, and a body defined only by its relation to a
  // hole that is not drawn comes back floating upright in empty magenta holding
  // on to nothing. It did. The generator refuses the name now.
  "keep-the-seat",      // ...and the forgotten king, who is only ever saluted
  // AND THE TWO HYENAS ARE NOT THE SAME ANIMAL. They were given one list
  // between them, which is how the two dogs ended up the same dog. The code
  // separates them and always did: the dire hyena is the only member of
  // AGGRO_SCAVENGERS - walk in on it standing over a corpse and it turns on you
  // unprovoked, hits harder, and holds the grudge an hour longer than its
  // cousin. That is a posture, and it is the one thing the grave hyena does not
  // do.
  //
  // The grave hyena was going to take a DRINK off DRINKERS, and that was wrong:
  // the generator refuses "drink" outright as a dead name, because no branch in
  // this file reads DRINKERS - 26 creatures keep an appointment at the water and
  // not one of them has a picture of doing it. Putting the cell in CALM_POSES
  // would not have rescued it either, it would have made it worse: the calm
  // cycle fires anywhere, so the hyena would drink in a dry room, which is the
  // same bug as the sleep frame in the idle rotation. It keeps its feed.
  "guard-the-kill",     // AGGRO_SCAVENGERS: the dire hyena, over a meal, daring you
  // THE THRONE ROOM (2026-09-23). Every boss climbs phases as it goes down -
  // dmg + phase*3 - but only the forgotten king has the theatre written for it,
  // and it is two beats, both of them pictures nobody had drawn:
  //   phase 1  "rises from the throne. The dark rises with him."
  //   phase 2  "calls - and the dark answers", and something comes out of it
  // Named "call-the-dark" rather than "call", which the generator refuses as a
  // dead name: PACK_CALLERS has no branch anywhere, but this one is scripted in
  // ai.bossPhase and actually happens.
  "stand-from-the-throne", // the king, up off the seat, and the dark up with him
  "call-the-dark",         // ...and the summons that answers him
  "lift-you-clear"];       // the drowned god, holding you off the floor under nothing at all   // the verdigris thing, touching what you are wearing
var GAIT_HZ = 5;            // gait poses alternate this fast...
var GAIT_HZ_SLOW = 2;       // ...except the old glutton, which lumbers
var WINGBEAT_HZ = 4;        // and wings beat this fast...
var WINGBEAT_HZ_FAST = 8;   // ...except the ptarmigan, which whirrs
var SWAY = 0.11;            // body sway while travelling, as a fraction of width
var HOP = 0.16;             // how far a hare or the dancer leaves the ground, of its height
var BOB = 0.024;            // and how much everything else nods as it walks
var LIFT = 0.9;             // a flying bird rises about its own height
var AIR_SHRINK = 0.25;      // and shrinks, because it is further away
var BREATH = 0.003;         // the resting scale pulse: three parts in a thousand
var TRAVEL_MS = 2600;       // how long a creature walks once it starts
var ROOTED = { "the-milker": 1, "the-butter-wife": 1 };   // they work in place
// ...and one thing in the world is not drawn at all. See the note in paintMobs:
// a creature whose entire design is that you cannot see it cannot be given a
// picture without being ruined by it.
var UNSEEN = { "the-quicksand": 1 };
// WHICH CREATURES SHIP A SECOND STRIP OF EYES. Every one is HOLLOW - the game's
// own register of things with nothing inside - and every one was drawn with its
// eyes in a flat key colour so the cutter could split them into their own layer.
// On any night but a red one this table is not read at all: the cold eyes are
// simply part of the picture, which is what they should be.
var MOB_EYES = {
  "the-drowned-ferryman": 1, "the-fowler": 1, "the-eel-cutter": 1, "the-pilot": 1,
  "the-drover": 1, "the-tide-warden": 1, "the-refuge-man": 1, "the-bridge-mason": 1,
  "the-reed-walker": 1, "the-scaffold-hand": 1, "the-salt-widow": 1,
  // THE FORTRESS'S HOLLOW (2026-09-23). Eight of the Door's dead carry the cyan
  // marker and so turn their eyes on a blood moon. The keep's ARMOUR does not
  // and is deliberately absent: the warden's entry says the visor shows only the
  // room behind it, so there is nothing in the gap to light up. Its sheets were
  // drawn with the opening empty and no eye layer was cut for them.
  "skeleton": 1, "bone-knight": 1, "marrow-cantor": 1, "twice-dead": 1,
  "thrice-dead": 1, "marrow-king": 1, "drowned-god": 1, "forgotten-king": 1,
  // THE ROAD'S THREE (2026-09-21). They were written as HOLLOW long before they
  // were drawn, their sheets came back with the cyan marker in them, and the
  // cutter split an eye layer off every frame that shows a face - so all that
  // existed and only this line was missing. Without it the overlay ships and is
  // never once drawn, which is the same shape as every other miss this week.
  //
  // The miller carries eyes on six frames of eight, and that is correct rather
  // than a detection failure: his idle and his work are both drawn turned away
  // and bent, with the head down between the shoulders, so there is no eye in
  // the picture to key. Those two frames simply have nothing laid over them.
  "the-miller": 1, "the-toll-clerk": 1, "the-long-warden": 1
};

var IDLE_MS = 1400;      // how long one idle frame is held...
var IDLE_JITTER = 1100;  // ...plus this much, so two snakes never breathe in step
var ACT_MS = 190;        // and how fast the thing it does actually happens
var ACT_ODDS = 0.06;     // per idle beat: roughly once every half-minute
var mobsEl = document.getElementById("mobs");
var lastMobs = "";
function updateMobs(ids, doing, dead) {
  lastMobFrame = { ids: ids || [], doing: doing || null, dead: dead || [] };
  paintMobs(lastMobFrame.ids, lastMobFrame.doing, lastMobFrame.dead);
}
function paintMobs(ids, doing, dead) {
  if (!mobsEl) return;
  if (mobHold && Date.now() < mobHold) { mobPending = ids; mobPendingRest = doing; mobPendingDead = dead; return; }
  var list = [];
  if (viewMode === "image" && ids && ids.length) {
    // EACH SPRITE CARRIES WHERE IT CAME FROM. The server sends one state per
    // creature in this list, so a sprite has to remember its own slot in it —
    // the row is about to be sorted by size and dealt out from the middle, and
    // after that position in the row says nothing about position on the wire.
    for (var i = 0; i < ids.length; i++) if (MOB_SPRITE[ids[i]]) list.push({ id: ids[i], idx: i });
  }
  // BODIES FIRST, and only ones we have a death frame for. They are part of the
  // key: a corpse appearing or being eaten has to reflow the row like anything else.
  var bodies = [];
  if (viewMode === "image" && dead)
    for (var d0 = 0; d0 < dead.length; d0++)
      if (MOB_ANIM[dead[d0]] && MOB_ANIM[dead[d0]].f.death !== undefined) bodies.push(dead[d0]);
  // THE RED NIGHT IS PART OF THE KEY, because the sprite itself changes on it.
  // Everything else about a creature's light is a filter on the row and needs no
  // repaint; the eyes are a second IMAGE, chosen when the element is built. Left
  // out of the key, a moon that turned red while you stood still would not reach
  // the things in front of you until something else happened to reflow the row -
  // you would walk into the next room and find their eyes lit, having watched
  // them stay cold through the moment the sky went over.
  var key = bodies.join(",") + "|" + (lastRed ? "R|" : "")
    + list.map(function (e) { return e.id; }).join(",");
  // Sleep is NOT part of the key: a creature bedding down must not reflow the
  // row, which would throw away every animation running in it. It is applied
  // to the sprites already standing there instead.
  if (key === lastMobs) { applyState(doing); return; }
  lastMobs = key;
  while (mobsEl.firstChild) mobsEl.removeChild(mobsEl.firstChild);
  // Biggest toward the centre, so a hare is never lost behind a hind.
  list.sort(function (a, b) { return MOB_SPRITE[b.id] - MOB_SPRITE[a.id]; });
  var order = [];
  for (var j = 0; j < list.length; j++) (j % 2 ? order.push : order.unshift).call(order, list[j]);
  anims.length = 0;
  // A body lies at the near edge of the row, out from under the living.
  for (var d1 = 0; d1 < bodies.length; d1++) {
    var bid = bodies[d1];
    if (UNSEEN[bid]) continue;          // nothing was drawn, so nothing lies there
    var bspec = MOB_ANIM[bid], bvh = mobVh(bid);
    var bel = document.createElement("div");
    bel.className = "mob dead";
    bel.style.height = boxPct(bvh);
    bel.style.width = boxPct(bvh * bspec.aspect);
    bel.dataset.w = (bvh * bspec.aspect).toFixed(2);   // fitMobRow reads this, not the style
    bel.style.backgroundImage = "url(/mob/" + bid + ".webp?v=" + MOB_V + ")";
    bel.style.backgroundSize = (bspec.n * 100) + "% 100%";
    bel.style.backgroundPositionX = (bspec.f.death * 100 / (bspec.n - 1)) + "%";
    // The same rule as the living, applied once: a body never animates, so this
    // is the only place it can be said. Without it a dead drake lies with its
    // hindquarters under the prose.
    // ONE FOOT LINE FOR EVERYTHING (rome, 2026-09-13). This was clamped at zero,
    // so only a creature TALLER than a man was moved and everything shorter was
    // simply centred on the line - which means its feet stop short of the ground
    // by half the difference. On the hill that was invisible: the roster was
    // small, the plates have broad foreground, and nobody stands beside anybody.
    // The coast put a crab, a gull and a drowned man in the same room and it is
    // plain - a fen viper was standing 9.3vh in the AIR above the man's boots.
    //
    // Unclamped, the number goes negative for anything short and pushes it DOWN
    // instead, so every creature's feet land at line + MAN_VH/2 whatever its
    // size. That is what standing on the same ground means.
    var blift = (bvh - MAN_VH) / 2 / bvh;
    if (blift) bel.style.transform = "translateY(" + (-blift * 100).toFixed(1) + "%)";
    mobsEl.appendChild(bel);
  }
  for (var k = 0; k < order.length; k++) {
    var id = order[k].id;
    // SOME THINGS IN A ROOM HAVE NOTHING TO SHOW. The quicksand is not a
    // creature, it is a piece of ground with an opinion - the world's own words
    // for it are "there is no animal here", "it has no shape and there is
    // nothing in it to hit", and it listens as "nothing at all, from a piece of
    // ground exactly like every other piece of ground".
    //
    // Drawn, it defeats itself. The sheet that shipped was a rimmed oval fenced
    // with withies and rope, which is a signpost saying HERE over the one thing
    // in this region whose whole fight is that you are in it to the knee before
    // you know it is there. No picture can be right: anything legible enough to
    // draw is legible enough to avoid.
    //
    // So it paints nothing, and everything else about it is untouched - it is in
    // the room, in the chips, in the wire's state list, and it fights. The slot
    // is skipped rather than blanked so it does not take a gap in the row.
    if (UNSEEN[id]) continue;
    var slot = order[k].idx, vh = mobVh(id), h = boxPct(vh);
    // NOTHING PUTS ITS FEET THROUGH THE PROSE (rome, 2026-09-08: the drake might
    // be too big). Centring on the horizon is right up to about the size of a
    // man and then stops being: at 75.7vh the drake's feet land at 93% with
    // eighteen points of it behind the text, and a bigger sprite only buries
    // more. So anything TALLER than a man grows upward out of his line instead
    // of downward past it — its feet stay where his are and its head goes up,
    // which is also how you would actually meet the thing. Everything at or
    // under 42vh gets zero and is untouched.
    // Expressed as a fraction of the element's OWN height, because that is what
    // a percentage translate means.
    var lift = (vh - MAN_VH) / 2 / vh;   // see the note on blift above
    var spec = MOB_ANIM[id];
    if (!spec) {
      var im = document.createElement("img");
      im.src = "/mob/" + id + ".webp?v=" + MOB_V;
      im.alt = "";
      im.style.height = h;
      mobsEl.appendChild(im);
      continue;
    }
    // A creature with frames is a window onto its strip, not a picture.
    var el = document.createElement("div");
    el.className = "mob";
    el.style.height = h;
    // WIDTH IS STATED, NOT DERIVED. A strip window only shows one clean frame
    // while its box is exactly one frame's shape: background-size is n*100% wide,
    // so if anything moves the width — flex shrinking it, an aspect-ratio the
    // layout declines to honour — every frame is squeezed or pulled and the whole
    // row stretches. So the width is computed here from the same height the table
    // gave, and the element is told not to flex at all.
    el.style.width = boxPct(vh * spec.aspect);
    el.dataset.w = (vh * spec.aspect).toFixed(2);
    // TWO LAYERS ON ONE ELEMENT, and they must be one element rather than two.
    // A hollow thing is drawn with cold pale eyes, and on a blood moon the game
    // says they come up "two coals the colour of the moon above" - so the red
    // ones ride in a second strip cut from the same pixels on the same rect, and
    // the whole of the trick is that the browser steps BOTH layers with one
    // background-position. A separate overlay element would need its own width,
    // its own scale and its own frame stepping kept in sync with this one, and
    // would drift by a subpixel the moment any of the three disagreed.
    var redEyes = lastRed && MOB_EYES[id];
    el.style.backgroundImage = (redEyes ? "url(/mob/" + id + ".eyes.webp?v=" + MOB_V + "), " : "")
      + "url(/mob/" + id + ".webp?v=" + MOB_V + ")";
    el.style.backgroundSize = redEyes
      ? (spec.n * 100) + "% 100%, " + (spec.n * 100) + "% 100%"
      : (spec.n * 100) + "% 100%";
    el.style.backgroundPositionX = "0%";
    mobsEl.appendChild(el);
    // What this creature can do while you stand there: the calm pose it cuts to
    // between breaths, and — for one with neither a gait nor wings — the poses it
    // works through in place.
    // EVERY CALM POSE IT WAS DRAWN WITH, not the first one found - the same fix
    // the strikes list below already carries, and the same bug (2026-09-21).
    // This kept ONE name, which is right for a creature with a single work pose
    // and wrong for every one with two: the salt widow's work-the-pan has been
    // in her strip, shipped, since the day she was drawn and has never once been
    // shown, and the road batch added five more - the miller's haul, the clerk's
    // count, the warden squaring his coat, the carrier setting the load down and
    // the mire-walker settling. Ten cells of finished art unreachable because a
    // loop broke early. It cycles them now, the way it cycles the drake's blows.
    var calms = [], acts = [];
    for (var q = 0; q < CALM_POSES.length; q++)
      if (spec.f[CALM_POSES[q]] !== undefined) calms.push(CALM_POSES[q]);
    var calm = calms[0] || "";
    acts = mobActs(spec.f);
    spec.acts = acts.length ? acts : ["idle"];
    var sleep = "idle", strike = "", recoil = "idle";
    for (var z2 = 0; z2 < SLEEP_POSES.length; z2++)
      if (spec.f[SLEEP_POSES[z2]] !== undefined) { sleep = SLEEP_POSES[z2]; break; }
    // EVERY BLOW IT WAS DRAWN WITH, not the first one found. This broke on the
    // first match and kept a single frame, which is right for forty-one of the
    // forty-three: they have "attack" and nothing else. The two drakes have
    // three — bite, sweep and breath — so the break made the other two
    // unreachable by construction, sitting unused in the most expensive sheet
    // in the game since the day it shipped.
    var strikes = [];
    for (var z3 = 0; z3 < STRIKE_POSES.length; z3++)
      if (spec.f[STRIKE_POSES[z3]] !== undefined) strikes.push(STRIKE_POSES[z3]);
    strike = strikes[0] || "";
    for (var z4 = 0; z4 < HIT_POSES.length; z4++)
      if (spec.f[HIT_POSES[z4]] !== undefined) { recoil = HIT_POSES[z4]; break; }
    // The pose it fixes you with, and how restless it is. A thing with a gait
    // shifts often; a thing drawn sitting on a nest hardly ever does.
    var watch = "idle";
    for (var z5 = 0; z5 < WATCH_POSES.length; z5++)
      if (spec.f[WATCH_POSES[z5]] !== undefined) { watch = WATCH_POSES[z5]; break; }
    // THE POSE IT EATS IN, which is not always called "feed". The fed beat used
    // to name that frame literally, so an animal drawn with its head down in the
    // ground could be sent the signal and had nothing to answer it with — and
    // every grazer in the game is exactly that animal. Read like every other
    // pose: a preference list, so the art's own word for eating is enough.
    // BOTH OF THEM, because the two are different acts. This took the first and
    // stopped, which is right for an animal drawn with one - and every rat and
    // both bears are drawn with both, so their graze cell could never be chosen.
    // The server says which act it is now (fed vs grazed); this keeps the pair
    // so there is something to choose between, and eat stays the default for
    // anything that only ever sends the one signal.
    var eat = "", grazeAt = "";
    for (var z6 = 0; z6 < EAT_POSES.length; z6++)
      if (spec.f[EAT_POSES[z6]] !== undefined) { eat = EAT_POSES[z6]; break; }
    if (spec.f["graze"] !== undefined) grazeAt = "graze";
    if (spec.f["feed"] !== undefined) eat = "feed";
    var rate = spec.f["move-a"] !== undefined ? 7000 : spec.f.up !== undefined ? 11000 : 20000;
    anims.push({ el: el, spec: spec, id: id, phase: "idle", t: 0, calm: calm, calms: calms, state: "",
                 sleep: sleep, strike: strike, strikes: strikes, blow: strike, eat: eat,
                 recoil: recoil, watch: watch, rate: rate, slot: slot, lift: lift, grazeAt: grazeAt,
                 next: Date.now() + 2000 + Math.random() * rate * 2 });
  }
  applyState(doing);
  fitMobRow();
  runAnims();
}
// A crowded room stands further off. Worked out from the sizes rather than
// measured off the DOM: a centred flex line that overflows reports its width
// unreliably, and these numbers are known exactly.
function fitMobRow() {
  if (!mobsEl) return;
  // THE WIDTHS ARE ON THE ELEMENTS, NOT IN THEIR STYLE. They used to be plain
  // vh strings this could parse; they are calc() against the picture box now,
  // and parseFloat("calc(...)") is NaN - which would silently fall through to
  // getBoundingClientRect and measure a row that is already scaled, compounding
  // the scale a little more on every repaint. Each sprite carries its width as
  // a share of the box in dataset.w, which is the same number the style was
  // built from and cannot drift from it.
  var picth = picBoxPx(), vw = window.innerWidth / 100, need = 0, n = 0;
  for (var i = 0; i < mobsEl.children.length; i++) {
    var c = mobsEl.children[i];
    var w = parseFloat(c.dataset.w || "0");
    need += w ? w / 100 * picth : c.getBoundingClientRect().width;
    n++;
  }
  if (!n) return;
  need += (n - 1) * 3 * vw + 8 * vw;          // the gap and the padding, same as the CSS
  var k = Math.min(1, (window.innerWidth - 8 * vw) / Math.max(1, need - 8 * vw));
  mobsEl.style.transform = "translateY(-50%)" + (k < 1 ? " scale(" + k.toFixed(3) + ")" : "");
}
// THE PICTURE BOX, IN PIXELS. Read from the scene element itself rather than
// recomputed from --logh: the dial can be moved by a media query or the grip,
// and asking the element is the one answer that is always current.
function picBoxPx() {
  var el = document.getElementById("scene");
  var h = el ? el.getBoundingClientRect().height : 0;
  return h || window.innerHeight;             // text mode, or before the first paint
}
// WHERE THE WORDS ACTUALLY BEGIN. The bottom of the window is not just the
// prose band: the grip sits on top of it and the chip tray and the input line
// sit under it, all of them in flow and all of them able to change height - a
// chip row wraps, the input grows, a theme sets a different line-height. So the
// picture's floor is measured off the DOM rather than derived from --logh, and
// re-measured whenever the shape of that stack could have changed.
//
// Read from the GRIP because it is the topmost thing in the bottom cluster and
// it is always present in image view; falling back to the log covers the moment
// before the grip has been laid out.
function fitPicture() {
  if (viewMode !== "image") return;
  // Measure the collapsed footprint even when the log overlays the room.
  // Freezing this measurement while expanded left portrait dimensions in
  // place after rotation, collapsing the landscape scene and its sprites.
  var top = document.getElementById("loggrip"), lg = document.getElementById("log");
  // Its own height, which the CSS needs to pull it out of the flow. offsetHeight
  // is the border box, so neither the margin nor the transform doing the moving
  // changes it, and this cannot chase itself.
  if (top && top.offsetParent !== null)
    document.body.style.setProperty("--griph", top.offsetHeight + "px");
  // MEASURED OFF THE BAND. The button is transformed, and getBoundingClientRect
  // reports the visual rect - transform included - so reading the button would
  // put the picture's floor a row too high and squash the room.
  var r = lg ? lg.getBoundingClientRect() : null;
  if (!r) return;
  var overlay = Math.min(0, parseFloat(getComputedStyle(lg).marginTop) || 0);
  var baselineTop = r.top - overlay;
  var viewportBottom = phoneControls() ? document.body.getBoundingClientRect().bottom : window.innerHeight;
  var bott = Math.max(0, Math.round(viewportBottom - baselineTop));
  document.body.style.setProperty("--botth", bott + "px");
  fitSky();
  fitMobRow();                     // the row is measured against the box, so it follows
}
// WHAT THE WORLD SAYS EACH OF THEM IS DOING. A creature holds this until the
// world says otherwise; the one-shots (a blow, a meal, a death) play over the
// top and drop back into it.
function applyState(doing) {
  for (var i = 0; i < anims.length; i++) {
    // BY SLOT, NOT BY NAME. Keyed by creature id this read one state for every
    // sprite of a kind, so one wolf waking woke the whole heap.
    var a = anims[i], st = (doing && doing[a.slot]) || "";
    if (a.phase === "death") continue;
    if (st === a.state) continue;
    a.state = st;
    a.asleep = st === "rest";
    a.t = 0;
    // a creature that has just noticed you does not finish its stroll first
    if (a.phase === "travel" && st) { a.phase = "idle"; }
  }
}

// ONE CLOCK FOR EVERY CREATURE IN THE ROOM, not a timer each: at most four
// sprites are ever on screen, and a single interval that walks them costs
// nothing and keeps them from drifting into lockstep with each other.
// It runs only while there is something animated to run, and stops dead in text
// mode — a hidden strip must not keep a timer alive.
// THE DRIVER, ported from the pose studies' viewer. A creature holds its idle
// pose and breathes; every so often it travels - walkers alternate their two
// gait poses and sway, birds beat up and down and rise - and then it settles.
// Position and lift are a CSS transform, so the frame window itself never moves
// and the strip keeps landing exactly on the box.
// WHICH OF A CREATURE'S FRAMES ARE THINGS IT DOES WHILE NOTHING IS HAPPENING.
// The rooted path in poseAt shows one of these per second, so this is the list
// a thing with no gait lives its idle life out of.
//
// It used to be every pose but idle, which meant a rooted creature spent that
// idle cycling through its own attack, its recoil and ITS OWN DEATH. Six of
// them did it - measured against this same driver - and an undisturbed one
// reaches the cycle every 20-52 seconds. A conger lying up in its hole rolled
// over dead, held it a beat, and got up. The salt widow swung at nothing and
// died at her cold pan, about twice a minute, forever.
//
// Everything excluded here is already reachable by its own route - the attack
// phase owns the blow and the recover, mobBeat owns death, hit and feed - so
// nothing is lost by keeping them out of the idle.
//
// IT LIVES IN ONE PLACE BECAUSE IT USED TO LIVE IN FOUR. This loop was written
// out by hand in paintMobs, twice more in the preview builder and again in the
// driver test's fixture, so the bug above was invisible to the suite that
// exists to catch exactly it: every copy agreed with every other copy and all
// four were wrong together.
// POSES THE ROOTED CYCLE MUST NEVER STEP THROUGH. A creature with no gait spends
// a travel working through its spare poses one per second, and anything with its
// own trigger has no business turning up in that rotation - a rooted animal was
// "travelling" by lying down asleep, dying, and grazing in turn. Same rule as
// CALM_POSES above: an event frame and a sleep frame are never idles.
var NOT_AN_IDLE = ["attack", "bite", "sweep", "breath", "inhale",
                   "swing", "recover", "hit", "death", "feed", "graze", "rest"];
function mobActs(f) {
  var acts = [];
  for (var w in f) if (w !== "idle" && NOT_AN_IDLE.indexOf(w) < 0) acts.push(w);
  return acts;
}
function poseAt(a, now) {
  var f = a.spec.f, t = a.t, x = 0, air = 0, s = 1, name = "idle";
  // WHICH OF ITS CALM POSES THIS TIME. Kept inside poseAt on purpose: the
  // driver test and the preview builder both lift this function whole by
  // brace-matching, so a helper beside it is invisible to them and the page
  // throws on the first calm beat. One pose is the common case and comes back
  // unchanged; a creature drawn with two or more walks through them in turn, so
  // the second is not a cell of art nobody ever sees. Driven off the beat, so it
  // is steady for a given breath rather than flickering per frame, and offset
  // per sprite so two of a kind are never in step.
  var calmNow = function (beat) {
    var list = a.calms;
    if (!list || list.length < 2) return a.calm;
    var k = (Math.floor(beat / 3) + (a.actOff | 0)) % list.length;
    return list[(k + list.length) % list.length];
  };
  if (a.phase === "death") {
    // It drops, and then it is a thing on the ground. The only motion is the
    // settle in the first quarter second; after that nothing about it moves.
    name = "death";
    s *= 1 + (1 - Math.min(t / 0.25, 1)) * 0.05;
  } else if (a.phase === "attack") {
    if (t < 0) {
      name = a.watch;                                   // its turn has not come yet
    } else {
      var blow = a.blow || a.strike;
      var u = Math.min(t / ATTACK_S, 1);
      // A BREATH IS NOT A BITE AND MUST NOT BE TIMED LIKE ONE. The windup is the
      // whole of what makes it frightening — the chest drawing up and swelling
      // before anything comes out — and the drakes were drawn a frame for
      // exactly that. So the gather runs twice as long and is spent on "inhale"
      // rather than on the watch pose, the release runs longer than a lunge, and
      // the body swells into it and empties instead of driving forward. Nothing
      // else in the game owns either frame, so nothing else takes this path.
      if (blow === "breath" && f.inhale !== undefined) {
        if (u < 0.38) {                                 // draws it in, and grows
          name = "inhale";
          x = -Math.sin(u / 0.38 * Math.PI / 2) * SWAY * 0.18;
          s *= 1 + (u / 0.38) * 0.045;
        } else if (u < 0.74) {                          // and lets it go
          name = "breath";
          x = Math.sin((u - 0.38) / 0.36 * Math.PI) * SWAY * 0.55;
          s *= 1.045 - ((u - 0.38) / 0.36) * 0.06;
        } else {                                        // and is empty after it
          name = a.watch;
          x = -(1 - (u - 0.74) / 0.26) * SWAY * 0.14;
          s *= 0.985 + ((u - 0.74) / 0.26) * 0.015;
        }
      } else if (u < 0.20) {                            // gathers, and draws back
        // THROUGH THE FRAME DRAWN FOR THE GATHER, where one exists - the mirror
        // of the "recover" rule below. One creature carries a "swing", and it is
        // the load before the blow rather than the blow: arms taken up and back,
        // body leaning away, nothing released. Without this it was in his IDLE
        // cycle instead, so he wound up to hit nobody every few seconds and then
        // struck from a pose he was never drawn gathering in.
        name = (f.swing !== undefined) ? "swing" : a.watch;
        x = -Math.sin(u / 0.20 * Math.PI / 2) * SWAY * 0.30;
      } else if (u < 0.58) {                            // and goes
        name = blow;
        x = Math.sin((u - 0.20) / 0.38 * Math.PI) * SWAY * 1.0;
      } else {                                          // and comes off it
        // THROUGH THE FRAME DRAWN FOR COMING OFF IT, where one exists
        // (2026-09-09). Four creatures carry a "recover" and it is the only
        // pose in the set whose name says which instant it is for: the adder
        // gathering itself back into the coil after the strike. The brooding
        // vulture already showed it, because with no alert and no watch drawn
        // it wins WATCH_POSES by default — and that accident was the only
        // reason the frame was ever on screen. The three adders each have an
        // alert or a watch that beats it in that list, so all three struck and
        // then snapped straight back to a head-up pose they were not drawn
        // returning through. The recovery is a real third of the swing here;
        // it is worth the frame it was given.
        name = (f.recover !== undefined) ? "recover" : a.watch;
        x = -(1 - (u - 0.58) / 0.42) * SWAY * 0.22;
      }
    }
  } else if (a.phase === "hit") {
    name = a.recoil;
    // driven back hard, then a shudder on the way out of it
    var hu = Math.min(t / HIT_S, 1);
    x = -0.085 * Math.exp(-t * 6.5) + Math.sin(t * 22) * 0.03 * Math.exp(-t * 4);
    a.rot = -0.055 * Math.exp(-t * 7) + 0.022 * Math.sin(t * 13) * Math.exp(-t * 3.5);
    s *= 1 - 0.05 * Math.exp(-t * 9);      // it gives, and comes back up
  } else if (a.phase === "feed") {
    // Head down at the body, with the small working shift of something pulling
    // at meat rather than standing over it. A grazer does the same thing at the
    // ground, so the frame is whichever of the two this one was drawn with.
    name = a.eatAs || a.eat || "feed";   // whichever act the signal said this was
    x = Math.sin(t * 3.4) * SWAY * 0.10;
  } else if (a.state === "hunt") {
    // IT HAS YOU. It does not wander, it does not cut to its calm pose - it
    // holds the alert it was drawn with and closes, slowly, on a breath that is
    // too long to be comfortable. The nearest thing this driver has to menace.
    name = a.watch;
    x = Math.sin(t * 0.55) * SWAY * 0.42;
    s *= 1 + Math.sin(t * 0.8) * BREATH * 2.2;
  } else if (a.state === "fight") {
    // Busy with somebody else: the same tension, quicker, and not aimed at you.
    name = a.watch;
    x = Math.sin(t * 1.9) * SWAY * 0.22;
  } else if (a.state === "flee") {
    // Going, and going away: the gait at speed, shrinking as it leaves.
    // AND ONE OF THEM LEAVES WITH SOMETHING IN ITS MOUTH (2026-09-09). The
    // raiding fox was drawn going off with what it came for, which is the whole
    // of the difference between it and the hill fox it is a variant of — and no
    // state the wire can report ever reached the frame. It holds for the first
    // stride only and then the gait takes over, because a held picture stops
    // reading as flight about half a second in. Nothing else owns the frame, so
    // nothing else takes this path.
    name = (f["snatch-escape"] !== undefined && t < 0.55) ? "snatch-escape"
         : f["move-a"] !== undefined ? (Math.floor(t * GAIT_HZ * 1.6) % 2 ? "move-a" : "move-b")
         : f.up !== undefined ? (Math.floor(t * WINGBEAT_HZ_FAST) % 2 ? "up" : "down") : "idle";
    x = -SWAY * Math.min(1, t / 1.2) * 1.5;
    if (f.up !== undefined) air = LIFT * Math.min(1, t / 1.2);
    s *= 1 - 0.08 * Math.min(1, t / 1.5);
  } else if (a.state === "reel") {
    // Rung, and not over it: the hit shudder, held rather than decaying out.
    name = a.recoil;
    x = Math.sin(t * 9) * 0.02;
    a.rot = 0.02 * Math.sin(t * 5);
  } else if (a.state === "hurt") {
    // Still up, but it has been opened. Low, slow, and it sags.
    name = a.calm && Math.floor(t / 4) % 3 === 0 ? calmNow(t / 4) : "idle";
    air = -0.012;
    s *= 1 + Math.sin(t * 1.1) * BREATH * 2.6;
  } else if (a.state === "eyeing" || a.state === "watch") {
    // Head up, fixed on something: the floor gear it means to take, or the room
    // the noise came from. It has stopped doing anything else.
    name = a.watch;
    s *= 1 + Math.sin(t * 1.6) * BREATH;
  } else if (a.asleep) {
    // Lying up. It does not travel, it does not cut to its calm pose on a
    // clock - it holds the one pose and breathes deeper and slower than a
    // standing creature does.
    name = a.sleep;
    s *= 1 + Math.sin(t * 0.9) * BREATH * 1.8;
  } else if (a.phase === "travel") {
    if (f["move-a"] !== undefined) {
      var hz = a.id === "the-old-glutton" ? GAIT_HZ_SLOW : GAIT_HZ;
      name = Math.floor(t * hz) % 2 ? "move-a" : "move-b";
      if (!ROOTED[a.id]) {
        x = Math.sin(t * 1.7) * SWAY;
        if (a.id.indexOf("hare") >= 0 || a.id === "the-dancer") air = Math.abs(Math.sin(t * 5 * Math.PI)) * HOP;
        else if (a.id === "a-fold-dog") { x *= 1.8; s *= 1 + 0.05 * Math.cos(t * 1.7); }
        else air = Math.abs(Math.sin(t * 5 * Math.PI)) * BOB;
      }
    } else if (f.up !== undefined) {
      var wh = a.id === "ptarmigan" ? WINGBEAT_HZ_FAST : WINGBEAT_HZ;
      var uf = Math.min(t / (TRAVEL_MS / 1000), 1);
      var beat = Math.floor(t * wh) % 2 ? "up" : "down";
      // LEAVING THE GROUND IS ITS OWN MOVEMENT for anything drawn doing it: the
      // crouch and the shove, before the wings have air to bite on.
      //
      // THIS USED TO SIT INSIDE THE FULL-ARC BRANCH BELOW, which meant a bird
      // only ever showed its takeoff if it ALSO owned a glide and a landing.
      // That was true of the drakes and of nobody else, and when the coast's
      // birds were redrawn with a takeoff and no arc, the frame was cut, packed
      // and shipped and could never appear. A creature that owns the drawing
      // gets the drawing; what it does after the first stride is a separate
      // question, answered below.
      if (f.takeoff !== undefined && uf < 0.13) {
        name = "takeoff";
        air = LIFT * (uf / 0.32);
      } else if (f.glide === undefined || f.landing === undefined) {
        name = beat; air = LIFT + Math.sin(t * 3) * 0.04;      // no arc drawn: just fly
      } else if (uf < 0.32) {
        name = beat;
        air = LIFT * (uf / 0.32);
      } else if (uf < (f.dive !== undefined ? 0.60 : 0.72)) {
        name = "glide"; air = LIFT; x = Math.sin(t * 1.2) * SWAY * 0.6;
      } else if (f.dive !== undefined && uf < 0.84) {
        // AND IT DOES NOT DRIFT DOWN. A thing that hunts from the air comes off
        // the glide in a stoop — wings back, head down, and fast — and puts them
        // out to land only at the end of it. Two frames the drakes carried and
        // never used, and between them they turn a flat circuit into a flight.
        name = "dive";
        air = LIFT * (1 - (uf - 0.60) / 0.24 * 0.72);
        x = Math.sin(t * 1.2) * SWAY * 0.22;
        s *= 1 - (uf - 0.60) / 0.24 * 0.05;
      } else {
        var d0 = f.dive !== undefined ? 0.84 : 0.72;
        name = "landing";
        air = LIFT * (1 - (uf - d0) / (1 - d0)) * (f.dive !== undefined ? 0.28 : 1);
      }
    } else {
      // No gait and no wings. The rooted ones - the brooding vulture on its nest,
      // an adder holding its warm stone - travel by doing the thing they were
      // drawn doing instead of going anywhere, one pose per second.
      //
      // AND IT STARTS WHERE THE LAST ONE STOPPED, which it did not until the
      // crossing's dead arrived (2026-09-13). A travel lasts TRAVEL_MS, which is
      // 2.6 seconds, and this shows one pose per second from the top every time -
      // so a creature with more than three spare poses had the fourth and fifth
      // drawn, packed, shipped, and never once put on screen. The salt widow
      // works a cold pan and the scaffold hand swings on his rope; both were
      // invisible. Rotating the start by one each travel costs nothing and means
      // every pose comes round, which is all the fixed cycle was ever meant to do.
      name = a.spec.acts[(((a.actOff | 0) + Math.floor(t)) % a.spec.acts.length)];
    }
  } else {
    name = a.calm && Math.floor(t / 3) % 2 ? calmNow(t / 3) : "idle";
    s *= 1 + Math.sin(t * 2) * BREATH;
  }
  if (a.phase !== "hit") a.rot = 0;
  if (f[name] === undefined) name = "idle";
  s *= 1 - AIR_SHRINK * Math.min(1, air / LIFT);
  return { k: f[name], x: x, air: air, s: s };
}
function runAnims() {
  var want = anims.length > 0 && viewMode === "image" && !stillness;
  if (want && !animTimer) animTimer = setInterval(stepAnims, 60);
  else if (!want && animTimer) { clearInterval(animTimer); animTimer = null; releaseMobs(); }
}
// ONE-SHOT COMBAT POSES. attack holds for the first two thirds of its beat and
// lunges through a half-sine; hit keeps the idle pose and shudders, a decaying
// wobble in both position and rotation — both taken from the studies' viewer,
// which is where they were designed. A creature with no attack frame drawn just
// keeps doing what it was doing.
var ATTACK_S = 1.7, HIT_S = 0.9, DEATH_S = 1.1, FEED_S = 2.4;
var ROUND_S = 4;          // COMBAT_ROUND_MS, and the beat everything here answers to
var STAGGER_S = 0.75;     // how far apart blows in the same round are spread
// WHAT A SLEEPING ONE LOOKS LIKE, best pose first. A wolf curls up, an adder
// keeps its warm stone; anything with none of these just stands and breathes
// slower, which is still the difference between a thing lying up and a thing
// watching you.
var SLEEP_POSES = ["rest", "bask", "hold-warm-ground", "hold-ground", "feed"];
var STRIKE_POSES = ["attack", "bite", "sweep", "breath"];
var HIT_POSES = ["hit"];
// WHAT EATING LOOKS LIKE. Separate from CALM_POSES on purpose: this one answers
// an EVENT — the world says this animal just ate — so nothing shadows it. A
// grazer that also sleeps still shows the sleep as its idle alternate and the
// graze at the moment it feeds, which are two different questions and were
// being answered by one list.
var EAT_POSES = ["feed", "graze"];
// How it looks at you when it has decided something about you.
// AND ONE OF THE VARIANTS' POSES IS NOT AN IDLE CUT. The one who stayed was
// drawn walking at you, and a man closing the distance is a claim about you,
// not something a creature does to fill a breath. So it goes here rather than
// in CALM_POSES with the other three: it is what he does once he has decided
// something, which is this list's whole subject. He has no other pose in here,
// so before now his every hunt, fight and windup was drawn on the bare idle.
// AND THE FOWLER IS THE SAME CASE, ARRIVING FROM THE COAST. He is drawn flat on
// his face in the turf under a hood of sacking, and that IS his idle — the whole
// creature is that you did not see him. So the second thing he was drawn doing
// is him coming up off the ground onto one knee with both hands going to the
// pole beside him, which is not a breath he fills, it is the moment he has
// decided about you. Same slot as the one who stayed, same reason.
//
// The audit found this one before a player could: a name no list here knows is
// unreachable for anything that has a gait, because only the ROOTED path cycles
// a creature's spare poses. Ten more of the crossing's dead are still to come
// and every one of them has a pose like this - cut-the-stick, read-the-water,
// lift-the-trap - so this list grows once per sheet until they are all in.
var WATCH_POSES = ["alert", "watch", "alert-alarm", "listen", "stand-ground",
                   "hold-ground", "inspect-upright", "advance", "rise-from-the-turf",
                   "recover", "idle"];
// A body stays where it fell for a beat before the room repaints without it.
var mobHold = 0, mobPending = null, mobPendingRest = null, mobPendingDead = null;
function mobBeat(swung, struck, died, fed, grazed) {
  for (var i = 0; i < anims.length; i++) {
    var a = anims[i];
    // Dying outranks everything: a thing that took the last blow is not also
    // recoiling from it. Only a creature with the pose drawn goes down on
    // screen - the rest simply stop being there, the way they always have.
    if (died && died.indexOf(a.id) >= 0 && a.spec.f.death !== undefined && a.phase !== "death") {
      a.phase = "death"; a.t = 0; a.asleep = false;
      mobHold = Date.now() + DEATH_S * 1000;
    } else if (a.phase === "death") continue;
    else if (swung && swung.indexOf(a.id) >= 0 && a.strike) {
      // NOT ALL AT ONCE. The wire reports a whole round in one message, so
      // without this every creature in a dogpile swings on the same frame.
      a.phase = "attack"; a.t = -Math.random() * STAGGER_S;
      // AND NOT ALWAYS THE SAME BLOW. Rolled per swing rather than held once, so
      // a long fight with a drake is bite, sweep and breath in no order you can
      // count on. Everything else has a list one long and gets the frame it
      // always got.
      a.blow = (a.strikes && a.strikes.length > 1)
        ? a.strikes[Math.floor(Math.random() * a.strikes.length)]
        : a.strike;
    }
    else if (struck && struck.indexOf(a.id) >= 0) { a.phase = "hit"; a.t = 0; }
    // WHICH EATING FRAME, decided by which signal arrived. A creature drawn with
    // only one uses it for both, which is what every grazer and every scavenger
    // did before either signal existed.
    else if (grazed && grazed.indexOf(a.id) >= 0 && (a.grazeAt || a.eat)) {
      a.phase = "feed"; a.t = 0; a.eatAs = a.grazeAt || a.eat;
    }
    else if (fed && fed.indexOf(a.id) >= 0 && a.eat) { a.phase = "feed"; a.t = 0; a.eatAs = a.eat; }
  }
}
function stepAnims() {
  var now = Date.now();
  for (var i = 0; i < anims.length; i++) {
    var a = anims[i];
    a.t += 0.06;
    // A dead one has no next phase. It holds until the room repaints without it.
    if (a.phase === "death") { /* it stays down */ }
    else if (a.phase === "travel") { if (a.t > TRAVEL_MS / 1000 || a.asleep) { a.phase = "idle"; a.t = 0; } }
    else if (a.phase === "attack") { if (a.t > ATTACK_S) { a.phase = "idle"; a.t = 0; } }
    else if (a.phase === "hit") { if (a.t > HIT_S) { a.phase = "idle"; a.t = 0; } }
    else if (a.phase === "feed") { if (a.t > FEED_S) { a.phase = "idle"; a.t = 0; } }
    // IT ONLY WANDERS WHEN IT HAS NOTHING ELSE ON. Everything above is the world
    // telling the picture what is happening; the stroll is what is left when
    // nothing is. Its cadence comes from the animal - a wolf paces, a vulture
    // sits - so a room is not a metronome with four hands.
    else if (!a.state && now > a.next) { a.phase = "travel"; a.t = 0; a.actOff = (a.actOff | 0) + 1; a.next = now + a.rate + Math.random() * a.rate * 1.6; }
    var p = poseAt(a, now);
    a.el.style.backgroundPositionX = (p.k * 100 / (a.spec.n - 1)) + "%";
    a.el.style.transform = "translate(" + (p.x * 100).toFixed(1) + "%,"
      + (-(p.air + (a.lift || 0)) * 100).toFixed(1) + "%)"
      + " rotate(" + ((a.rot || 0) * 57.3).toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";
  }
  if (mobHold && now >= mobHold) releaseMobs();
}
// The room frame that drops a dead creature arrives immediately behind the
// death itself, so paintMobs defers while a body is on the ground and the last
// deferred picture is the one that lands.
function releaseMobs() {
  mobHold = 0;
  if (!mobPending) return;
  var p = mobPending, r = mobPendingRest, d = mobPendingDead;
  mobPending = null; mobPendingRest = null; mobPendingDead = null;
  paintMobs(p, r, d);
}

var logGrip = document.getElementById("loggrip");
var logBig = false;
try { logBig = localStorage.getItem("nomad_logbig") === "1"; } catch (e) {}
function setLogBig(on) {
  logBig = !!on;
  document.body.setAttribute("data-log", logBig ? "big" : "small");
  // MEASURE AFTER THE MOVEMENT, NEVER DURING IT. The open band is an overlay -
  // it occupies exactly as much of the column as the closed one - so the
  // picture's floor is the same number either side of this toggle and there is
  // nothing here that needs re-measuring at all. What there IS, is a .22s
  // height transition, and a measurement taken inside it reads a column that is
  // briefly too tall, which pushes the grip up and shrinks the picture to fit a
  // floor that was never there. That was the snap on closing.
  //
  // So: no measurement on the frame after the toggle. One when the transition
  // actually ends, and one late fallback in case the transition never fires
  // (interrupted by a second click, or a reduced-motion setting that skips it).
  setTimeout(fitPicture, 420);
  if (logGrip) {
    logGrip.textContent = logBig ? "\u25bc" : "\u25b2";
    logGrip.setAttribute("aria-expanded", logBig ? "true" : "false");
    logGrip.title = logBig ? "less of the log" : "more of the log";
  }
  try { localStorage.setItem("nomad_logbig", logBig ? "1" : "0"); } catch (e) {}
  if (typeof log !== "undefined" && log) log.scrollTop = log.scrollHeight;
}
setLogBig(logBig);
if (logGrip) logGrip.onclick = function () { setLogBig(!logBig); };

// HOW HARD THE SCRIM PRESSES, per painting. The gradient below is weakest at
// 45% height \u2014 which is exactly where the title and the line sit \u2014 and one
// setting cannot serve eight pictures that range from a torchlit corridor to
// an open dusk sky. Measured mean luma of the band the copy lands in: torch 4,
// hound 9, rain 11, warrens 13, wood 20, gatehouse 21, bellcote 30, and the
// holdings ONE HUNDRED AND TEN. On the dark ones a heavier scrim would be
// invisible; on that one, .15 left the line unreadable. Anything absent takes
// the default. Darkening the painting itself was the wrong lever \u2014 it took
// the village down to silhouette to fix the sky.
var THR_DIM = { holdings: ".55", bellcote: ".28", drake: ".25" };
var THR_SCENES = { torch: "center 65%", warrens: "40% 60%", hound: "center 55%", rain: "center 45%", bellcote: "35% 45%", wood: "center 45%", holdings: "20% 60%", drake: "35% 65%" };
var thrPick = new URLSearchParams(location.search).get("scene");
if (!THR_SCENES[thrPick]) {
  var thrNames = Object.keys(THR_SCENES);
  thrPick = thrNames[Math.floor(Math.random() * thrNames.length)];
}
var thrImg = new Image();
thrImg.onload = function () {
  var mid = THR_DIM[thrPick] || ".15";
  threshold.style.backgroundImage = "linear-gradient(rgba(22,18,12,.5), rgba(22,18,12," + mid + ") 45%, rgba(22,18,12,.6)), url(" + thrImg.src + ")";
  threshold.style.backgroundPosition = "center, " + THR_SCENES[thrPick];
};
// THE VERSION STAMP BUSTS THE CACHE, and it is not optional. Both image routes answer with
// "immutable", which promises the browser the bytes at that URL will never
// change \u2014 so a browser that has seen a scene once keeps it for a YEAR and
// will not revalidate, hard reload included. Repaint a scene in place and only
// brand-new visitors ever see it. Bump CARD_V whenever a door or card plate
// is replaced (the manifest icons have done this with ?v= since they shipped).
thrImg.src = "/door-bg/" + thrPick + ".jpg?v=" + CARD_V;
if (thrKnown && stored) thrEnter.textContent = "enter as " + thrKnown;

// THE DOOR'S MUSIC — grim and hollow, played live by oscillators (no file,
// no loop point). A constant low pedal on A; over it, bare open fifths — no
// thirds, no hope — walk a Phrygian line: A, B-flat, A, G. The half-step
// grinding against the pedal is the dread. No melody: only a dead bell,
// tolling now and then on the root or its fifth. Browsers refuse audio
// before a gesture, so it starts at the page's first touch; the enter click
// hands it a long fade through the door. A saved sound-off is silence here.
// thrOut is the LAST node before the speakers and NOTHING modulates it — see
// thrMusicStart for why that matters. thrMaster carries the LFO; thrOut is the
// only handle that can actually reach silence.
var thrCtx = null, thrMaster = null, thrOut = null, thrTimers = [];
var THR_STEPS = [110, 116.54, 110, 98]; // A, B-flat (the rub), A, G — and around again
function thrMusicStart() {
  if (thrCtx || crossed) return;
  if (localStorage.getItem("nomad_sound") === "0") return;
  try { thrCtx = new AudioContext(); } catch (e) { return; }
  if (thrCtx.state === "suspended") { try { thrCtx.resume(); } catch (e) {} }
  var c = thrCtx;
  var t0 = c.currentTime;
  // A CLEAN LAST NODE. The tremor below connects an oscillator INTO
  // thrMaster.gain, and an audio-rate connection to an AudioParam is SUMMED
  // with the param's own value — so ramping thrMaster.gain to zero still leaves
  // the LFO swinging +/-0.02 through it. That is why the fade-outs did not
  // silence anything and the refresh still popped (rome, 2026-08-07). thrOut
  // hangs below the master with nothing modulating it, so it is the one handle
  // that can truly reach zero.
  thrOut = c.createGain();
  thrOut.gain.value = 1;
  thrOut.connect(c.destination);
  thrMaster = c.createGain();
  thrMaster.gain.setValueAtTime(0.0001, t0);
  thrMaster.gain.exponentialRampToValueAtTime(0.16, t0 + 4);
  thrMaster.connect(thrOut);
  var lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.5;
  lp.connect(thrMaster);
  // The pedal: A, low and constant. Everything else grinds against it.
  var pedal = [110, 220];
  for (var i = 0; i < pedal.length; i++) {
    var po = c.createOscillator();
    po.type = i ? "triangle" : "sine";
    po.frequency.value = pedal[i] * (i ? 1.002 : 1);
    // Ramped in, not switched on: a 110Hz sine jumping straight to working
    // gain is a step change, and a step change is a click. Two seconds is well
    // inside the master's own four-second bloom, so nothing sounds slower.
    var pg = c.createGain();
    pg.gain.setValueAtTime(0.0001, t0);
    pg.gain.exponentialRampToValueAtTime(i ? 0.032 : 0.07, t0 + 2);
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
  var c = thrCtx, m = thrMaster, out = thrOut, t = c.currentTime;
  thrCtx = null; thrMaster = null; thrOut = null;
  try {
    m.gain.cancelScheduledValues(t);
    m.gain.setValueAtTime(Math.max(m.gain.value, 0.0001), t);
    // Caught young (the gesture WAS the enter click): swell briefly first,
    // so even the instant-clicker hears the door as they pass through it.
    if (t < 1.5) m.gain.exponentialRampToValueAtTime(0.07, t + 1.2);
    m.gain.exponentialRampToValueAtTime(0.0001, t + 7);
    // The master's exponential can only ever approach zero, and the LFO summed
    // into it keeps swinging regardless — so the last half second is taken on
    // the CLEAN node, linearly, all the way to true silence. Without this the
    // close() below cut a live waveform and popped on the way through the door.
    if (out) {
      out.gain.setValueAtTime(1, t);
      out.gain.setValueAtTime(1, t + 6.5);
      out.gain.linearRampToValueAtTime(0, t + 7);
    }
  } catch (e) {}
  setTimeout(function () { try { c.close(); } catch (e) {} }, 7500);
}
document.addEventListener("pointerdown", thrMusicStart, true);
document.addEventListener("keydown", thrMusicStart, true);

// THE REFRESH POP (rome, 2026-08-07: "I refresh the page and then the speakers
// pop"). Nothing here ever handled the page going away, so a reload tore the
// audio graph down mid-waveform — the drone and the heartbeat were both still
// sounding — and the device got a step change straight to zero.
//
// A very fast ramp fixes it. The audio thread renders in 128-sample quanta
// (under 3ms), so a 40ms ramp is silent long before the page is destroyed, and
// unlike close() it never cuts a cycle in half. We deliberately do NOT close
// the contexts: close() is itself an abrupt stop, and a context on a dying page
// is collected anyway — silent.
//
// pagehide, not beforeunload: it fires for the bfcache and for tab-close on
// mobile Safari, which beforeunload does not.
function hushAudio() {
  fadeGain(actx, amaster && amaster.gain, 0, 0.04);
  // thrOut, NOT thrMaster: the master has the tremor LFO summed into its gain
  // and can never actually reach zero.
  fadeGain(thrCtx, thrOut && thrOut.gain, 0, 0.04);
}
window.addEventListener("pagehide", hushAudio);
// Safari desktop can skip pagehide on a same-document reload; this is the belt.
window.addEventListener("beforeunload", hushAudio);

// ---- THE RECKONING, ON THE DOOR (2026-08-07) -------------------------------
//
// A leaderboard nobody outside the game can see is a leaderboard that does no
// work. So the threshold carries one button, top-left, and the boards open in
// the same modal shell the map and journal already use.
//
// IT FAILS QUIET. /world.json is fetched once, unauthenticated, before anyone
// has a key. If it is slow, errors, or comes back with nobody on the boards,
// the button never appears and the door is exactly what it has always been.
// Nothing here can block or move the enter button.
var thrBoards = null;

function thrSpan(cls, text) {
  var s = document.createElement("span");
  s.className = cls;
  s.textContent = text;
  return s;
}
// DRAWN, NOT TYPED. A crown glyph would be at the mercy of the font: the
// monospace stack falls through SF Mono, Menlo and Consolas, and the ones that
// have no chess/crown codepoint render a tofu box in its place. An inline SVG
// is the same eleven pixels on every machine and inherits its colour from CSS.
function thrCrown() {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 20");
  svg.setAttribute("class", "crown");
  svg.setAttribute("aria-hidden", "true");
  var p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M1 4 L6 11 L12 2 L18 11 L23 4 L21 18 L3 18 Z");
  svg.appendChild(p);
  return svg;
}
// Ten to a page, and the page index is per board so the two columns move
// independently. RANK IS ABSOLUTE, never the row's position on the page — the
// crown and the medals belong to the top of the BOARD, and page two must not
// grow a second first place.
var RECK_PAGE = 10;
var reckPage = { legend: 0, trophies: 0 };

function thrRenderBoards() {
  var body = document.getElementById("reckbody");
  body.replaceChildren();
  var defs = [
    { key: "legend", head: "Legend \\u00b7 blood owed", foot: "Bosses felled, wanderers put down, and everything else that died." },
    { key: "trophies", head: "Trophies \\u00b7 what they carry", foot: "Barter value held in the pack, the lockbox and the vault." }
  ];
  for (var d = 0; d < defs.length; d++) {
    var def = defs[d];
    var col = document.createElement("div"), h = document.createElement("h3");
    h.textContent = def.head;
    col.appendChild(h);
    var rows = (thrBoards && thrBoards[def.key]) || [];
    var pages = Math.max(1, Math.ceil(rows.length / RECK_PAGE));
    if (reckPage[def.key] > pages - 1) reckPage[def.key] = pages - 1;
    var page = reckPage[def.key];
    var from = page * RECK_PAGE;
    var slice = rows.slice(from, from + RECK_PAGE);

    var rowsBox = document.createElement("div");
    rowsBox.className = "rrows";
    if (!rows.length) {
      var em = document.createElement("div");
      em.className = "rempty";
      em.textContent = "No names on this board yet.";
      rowsBox.appendChild(em);
    }
    for (var r = 0; r < slice.length; r++) {
      var rank = from + r + 1; // absolute
      // Built as NODES, never innerHTML: a wanderer picks their own name, and
      // textContent-only is the law that makes this client structurally
      // XSS-proof. The door does not get to be the exception.
      var row = document.createElement("div");
      row.className = "rrow";
      row.appendChild(thrSpan("rrk" + (rank <= 3 ? " rrk" + rank : ""), String(rank)));
      var nameCell = document.createElement("span");
      nameCell.className = "rnm" + (rank === 1 ? " rnm1" : "");
      nameCell.appendChild(thrSpan("", slice[r].name));
      if (rank === 1) nameCell.appendChild(thrCrown());
      row.appendChild(nameCell);
      row.appendChild(thrSpan("rsc", Number(slice[r].score).toLocaleString()));
      rowsBox.appendChild(row);
    }
    col.appendChild(rowsBox);

    // Only when there is somewhere to go: a board of four shows no controls at
    // all, which is how it looked before any of this existed.
    if (pages > 1) {
      var pg = document.createElement("div");
      pg.className = "rpage";
      pg.appendChild(thrPageBtn(def.key, -1, "\\u2039", page <= 0));
      pg.appendChild(thrPageBtn(def.key, 1, "\\u203a", page >= pages - 1));
      var count = document.createElement("span");
      count.className = "rcount";
      count.textContent = (from + 1) + "\\u2013" + (from + slice.length) + " of " + rows.length;
      pg.appendChild(count);
      col.appendChild(pg);
    }

    var f = document.createElement("div");
    f.className = "rfoot";
    f.textContent = def.foot;
    col.appendChild(f);
    body.appendChild(col);
  }
}
function thrPageBtn(key, delta, label, disabled) {
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.setAttribute("aria-label", delta < 0 ? "previous page" : "next page");
  if (disabled) b.disabled = true;
  else b.addEventListener("click", function () { reckPage[key] += delta; thrRenderBoards(); });
  return b;
}
function thrWorld() {
  fetch("/world.json", { cache: "no-store" }).then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (w) {
    if (!w || crossed) return;
    var lg = (w.boards && w.boards.legend) || [], tr = (w.boards && w.boards.trophies) || [];
    if (!lg.length && !tr.length) return; // nobody has entered: no button, no empty modal
    thrBoards = w.boards;
    document.getElementById("thr-reck").classList.add("on");
  }).catch(function () { /* the door is not held up by its own news */ });
}
var reckm = document.getElementById("reckm");
function reckOpen() { reckPage = { legend: 0, trophies: 0 }; thrRenderBoards(); reckm.classList.add("open"); document.getElementById("reckclose").focus(); }
function reckClose() { reckm.classList.remove("open"); document.getElementById("thr-reck").focus(); }
document.getElementById("thr-reck").addEventListener("click", reckOpen);
document.getElementById("reckclose").addEventListener("click", reckClose);
reckm.addEventListener("click", function (e) { if (e.target === reckm) reckClose(); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && reckm.classList.contains("open")) { e.stopPropagation(); reckClose(); }
}, true);
// The guide is plain markup in the stack now, visible from the first paint. It
// waits on no fetch and no boards — the door being empty is precisely when
// somebody wants to know how any of this works.
thrWorld();

var crossed = false;
function crossThreshold() {
  if (crossed) return;
  crossed = true;
  thrMusicStop();
  if (localStorage.getItem("nomad_sound") === null) setSound(true);
  threshold.classList.add("gone");
  setTimeout(function () { threshold.remove(); }, 1000);
  if (guideFresh) guideStart();
  print("— you feel keys in your pocket. tap your name, top right, to see them —", "sys");
  if (!guideActive()) connect();
  if (!phoneControls()) cmd.focus();
  // Start before connecting so new players never see a burst of welcome text.
}
thrEnter.addEventListener("click", crossThreshold);

// THE FIRST WALK: five lessons with readable scrollback in the log — where this game's
// teaching belongs — each one explaining a real system, each advancing only
// when you DO the thing it asked. Auto-runs once for a freshly minted key;
// 'tutorial' replays it for anyone; 'tutorial off' ends it. The lessons
// teach the typed language — chips send the same words, so a tap counts,
// but nothing here depends on chips existing at all.
var guideFresh = !stored && !localStorage.getItem("nomad_guided");
var GUIDE_LESSONS = [
  { re: null, text: [
    "\\u2500 THE FIRST WALK (1/5) \\u2500 the world \\u2500",
    "This is practice: commands here do not move or change your character.",
    "Scroll up any time to reread earlier lessons.",
    "Beyond this walkthrough is one live dungeon, shared by everyone. It is not",
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
    "\\u2192 practice moving: type 'go north'.",
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
function guideActive() { return guideAt >= 1 && guideAt <= GUIDE_LESSONS.length; }
// THE FIRST WALK KNOWS WHERE THE DOOR IS. Hung on the room bar, in the same
// muted style the region caption uses, and only while the guide is running:
// seven hundred rooms and no map is the thing that loses somebody in their
// first hour. It disappears for good when the lessons do, and from then on the
// waystones are the answer.
var wayHome = "";
function paintWayHome() {
  var old = document.getElementById("wayhome");
  if (old) old.remove();
  if (!guideActive() || !wayHome) return;
  var el = document.createElement("span");
  el.className = "rrg"; el.id = "wayhome";
  el.textContent = wayHome === "here" ? " \u00b7 the door is here" : " \u00b7 the way out lies " + wayHome;
  roomEl.appendChild(el);
}
function updateGuideExits() {
  var exits = document.getElementById("guide-exits");
  if (!exits) return;
  exits.textContent = "Practice exit: go north. Your real character stays where it is.";
}
function guideCommand(text) {
  if (!guideActive()) return false;
  var lower = text.toLowerCase();
  if (lower === "tutorial off" || lower === "tutorial stop") { guideOff(); return true; }
  if (lower === "tutorial") { guideStart(); return true; }
  if (lower === "keys") { idbtn.click(); return true; }
  var expected = guideAt < GUIDE_LESSONS.length && GUIDE_LESSONS[guideAt].re;
  if (expected && expected.test(lower) && (guideAt !== 2 || lower === "go north")) {
    print("Practice: " + text + " — nothing sent to the live dungeon.", "sys guide-step");
    guideNotice(text);
  } else {
    print("Follow the current lesson above, or type 'tutorial off' to enter the live dungeon.", "sys guide-step");
  }
  return true;
}
function guidePrint(i) {
  // Keep completed lessons and their exit snapshot available for scrolling back.
  var previousExits = document.getElementById("guide-exits");
  if (previousExits) previousExits.removeAttribute("id");
  print(GUIDE_LESSONS[i].text.join("\\n"), "sys guide-step");
  var lesson = log.lastElementChild;
  if (i === 1) {
    var exits = document.createElement("div");
    exits.id = "guide-exits"; exits.className = "guide-step";
    log.appendChild(exits); updateGuideExits();
  }
  if (i === GUIDE_LESSONS.length - 1) {
    var finish = document.createElement("button");
    finish.type = "button"; finish.className = "guide-step";
    finish.textContent = "Enter the dungeon";
    finish.addEventListener("click", guideOff);
    log.appendChild(finish);
  }
  log.scrollTop += lesson.getBoundingClientRect().top - log.getBoundingClientRect().top - 14;
}
function guideStart() {
  log.querySelectorAll(".guide-step").forEach(function (el) { el.remove(); });
  guideAt = 1;
  document.body.dataset.tutorial = "on";
  guidePrint(0);
  paintWayHome();
}
function guideOff() {
  if (!guideActive()) { print("\\u2014 no walk is running; 'tutorial' starts one \\u2014", "sys"); return; }
  localStorage.setItem("nomad_guided", "1");
  guideAt = -1;
  delete document.body.dataset.tutorial;
  log.querySelectorAll(".guide-step").forEach(function (el) { el.remove(); });
  paintWayHome();
  print("\\u2014 the walk ends here; 'tutorial' brings it back \\u2014", "sys");
  log.scrollTop = log.scrollHeight;
  fitPicture();
  sendCmd("look");
}
function guideNotice(cmdText) {
  if (guideAt < 1 || guideAt >= GUIDE_LESSONS.length) return;
  if (!GUIDE_LESSONS[guideAt].re.test(cmdText.trim().toLowerCase())) return;
  var landed = guideAt++;
  guidePrint(landed);
}

</script>
</body>
</html>`;

// Computed once, from the finished page. index.ts stamps it into the copy it
// serves; chips.ts puts the same value on the wire.
export const BUILD_ID = buildId(PAGE);
