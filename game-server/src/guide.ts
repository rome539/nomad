// THE GUIDE — nomadmud.com/guide
//
// Two halves (rome, 2026-11-01): how the world works, kept lean, and then every
// command in full. In the game `help` is the short list (parser.HELP_TEXT) and
// points here for the rest. Both were checked against the parser and the code
// that day; when a command changes, change it in both.
//
// THE LAWS, NOT THE NUMBERS (rome, 2026-08-07) still holds for the first half:
// the shape of each system and never its odds, drop rates or stat blocks, so a
// player can reason about the world and still has to find out what is in it.
// The command half gives the counts a player needs to use a command (slots,
// costs, lengths), the ones the old help always gave.
//
// Its own module rather than more of public.ts, per the standing rule about the
// spine: public.ts is the client, this is a document. No JavaScript at all.
export const GUIDE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>NOMAD — how it works</title>
<link rel="canonical" href="https://nomadmud.com/guide">
<meta name="description" content="How NOMAD works, and every command: what you keep, how fights run, why weight is noise, and a world that keeps going without you.">
<meta property="og:title" content="NOMAD — how it works">
<meta property="og:description" content="How the world works, and every command in full.">
<meta property="og:image" content="https://nomadmud.com/og.jpg?v=4">
<link rel="icon" href="/icon.png">
<style>
  :root {
    --bg: #16120c; --panel: #1e1912; --cream: #ede3cc; --dim: #9a8b66;
    --gold: #d8a94e; --blood: #c96f5a; --bone: #c9bda3; --steel: #a4bec0;
    --heal: #8faa6b; --line: #2c2418; --border: #3a3020;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scrollbar-color: var(--border) var(--bg); scrollbar-width: thin; scroll-behavior: smooth; }
  body {
    background: var(--bg); color: var(--cream);
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 15px; line-height: 1.62;
    padding: 0 20px 96px;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 74ch; margin: 0 auto; }

  header { padding: 64px 0 28px; border-bottom: 1px solid var(--line); }
  h1 { font-size: 15px; font-weight: 700; color: var(--gold); letter-spacing: 0.42em; text-transform: uppercase; }
  .sub { color: var(--bone); font-size: 14px; margin-top: 14px; max-width: 58ch; }
  .back { display: inline-block; margin-top: 22px; color: var(--dim); font-size: 12.5px; text-decoration: none; border-bottom: 1px solid var(--line); padding-bottom: 2px; }
  .back:hover { color: var(--gold); border-color: var(--gold); }

  /* THE SHORT VERSION. Everything below is the long answer; a lot of people
     want the eight sentences that stop them losing a pack on day one. Set as a
     panel rather than prose so the eye takes it as a card, not an intro. */
  .tldr { margin-top: 30px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel); padding: 16px 18px 18px; }
  .tldr .lbl { color: var(--gold); font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; }
  .tldr ul { margin-top: 12px; }
  .tldr li { margin-top: 7px; padding-left: 16px; font-size: 14px; line-height: 1.5; color: var(--bone); }
  .tldr li::before { content: "\\00b7"; color: var(--gold); }
  .tldr li b { color: var(--cream); }
  .tldr .tail { margin-top: 13px; padding-top: 11px; border-top: 1px solid var(--line); color: var(--dim); font-size: 12.5px; }

  nav { margin: 30px 0 8px; }
  nav .lbl { color: var(--dim); font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; }
  nav ol { list-style: none; margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 22px; }
  nav a { color: var(--bone); font-size: 13px; text-decoration: none; }
  nav a:hover { color: var(--gold); }
  nav .n { color: var(--dim); }
  /* the numbers ARE the list marker here; the body's em-dash would double it */
  nav li { margin-top: 0; padding-left: 0; }
  nav li::before { content: none; }

  section { padding-top: 52px; }
  h2 {
    color: var(--gold); font-size: 12.5px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase;
    padding-bottom: 8px; border-bottom: 1px solid var(--line);
  }
  h3 { color: var(--bone); font-size: 14px; font-weight: 700; margin-top: 26px; }
  p { margin-top: 14px; }
  p + p { margin-top: 12px; }
  strong { color: var(--cream); font-weight: 700; }
  em { color: var(--bone); font-style: italic; }

  /* the one visual device: a rule stated as a rule */
  .law {
    margin-top: 20px; padding: 13px 16px;
    border: 1px solid var(--border); border-left: 2px solid var(--gold);
    border-radius: 5px; background: rgba(216,169,78,0.045);
    color: var(--cream);
  }
  .law b { color: var(--gold); font-weight: 700; }

  ul { margin-top: 14px; padding-left: 0; list-style: none; }
  li { margin-top: 9px; padding-left: 18px; position: relative; }
  li::before { content: "\\2014"; position: absolute; left: 0; color: var(--dim); }
  li b { color: var(--cream); }

  .atk { color: var(--blood); font-weight: 700; }
  .def { color: var(--steel); font-weight: 700; }
  .mend { color: var(--heal); font-weight: 700; }
  .gain { color: var(--gold); font-weight: 700; }
  code { color: var(--gold); font-size: 0.94em; }

  footer { margin-top: 76px; padding-top: 22px; border-top: 1px solid var(--line); color: var(--dim); font-size: 12.5px; }
  footer a { color: var(--bone); text-decoration: none; border-bottom: 1px solid var(--line); }
  footer a:hover { color: var(--gold); border-color: var(--gold); }

  @media (max-width: 620px) {
    body { font-size: 14.5px; padding: 0 16px 72px; }
    header { padding-top: 44px; }
    h1 { letter-spacing: 0.3em; }
    nav ol { grid-template-columns: minmax(0, 1fr); }
  }
  /* the command reference: each command, then what it does */
  dl { margin-top: 6px; }
  dt { margin-top: 18px; color: var(--cream); }
  dd { margin-top: 5px; color: var(--bone); }
</style>
</head>
<body>
<div class="wrap">

<header>
  <h1>NOMAD</h1>
  <div class="sub">How the world works, then every command in full. In the game,
  <code>help</code> gives the short list.</div>
  <a class="back" href="/">&#8592; back to the door</a>
</header>

<nav>
  <div class="lbl">Contents</div>
  <ol>
    <li><span class="n">01</span> <a href="#keep">What you keep</a></li>
    <li><span class="n">02</span> <a href="#gates">Gates and the walk home</a></li>
    <li><span class="n">03</span> <a href="#fight">Fighting</a></li>
    <li><span class="n">04</span> <a href="#load">Weight is noise</a></li>
    <li><span class="n">05</span> <a href="#dark">Light and the dark</a></li>
    <li><span class="n">06</span> <a href="#alive">A world that keeps going</a></li>
    <li><span class="n">07</span> <a href="#home">A place of your own</a></li>
    <li><span class="n">08</span> <a href="#others">Other wanderers</a></li>
    <li><span class="n">09</span> <a href="#key">Your key and your name</a></li>
    <li><span class="n">10</span> <a href="#commands">Every command</a></li>
  </ol>
</nav>

<section id="keep">
  <h2>01 &nbsp;What you keep</h2>
  <div class="law"><b>Die, and everything you were carrying stays where you fell</b>,
  sealed things included. What survives you is what you put away.</div>
  <p>Logging off costs nothing: log off anywhere and you, and everything on you, are
  exactly where you left them. Dying is what costs. There are three places to put
  things that death cannot reach: the <b>lockbox</b> and the <b>vault</b>, at any
  gate, and the <b>shelf</b> in a den of your own. Whatever lies where you died can
  be picked up by anyone, you included, if you get back to it first.</p>
</section>

<section id="gates">
  <h2>02 &nbsp;Gates and the walk home</h2>
  <p>Nothing you find is safe until you have put it somewhere, and every step
  further out is better loot and a longer walk back. There is no timer: the only
  thing deciding when you turn back is how far you are from a door and how much
  you are carrying.</p>
  <p>Behind every gate is a <b>gatehouse</b>, the one room nothing in the world can
  reach. The keeper, the lockbox and vault, the bench, the brazier and the board are
  all there. There are gates on the fortress walls, on the road, in the wood, on the
  crossing and up the mountain, and some ground is a long way from any of them.</p>
</section>

<section id="fight">
  <h2>03 &nbsp;Fighting</h2>
  <p>A fight runs on a <b>four-second beat</b>. You pick it and it keeps happening,
  typing or not; what you type between beats is who you are fighting, how you stand,
  and whether you stay. Striking something that has not noticed you does not wait
  for the beat: it lands at once, and hard.</p>
  <p><b>Every swing spends stamina</b>, more in heavy kit, and tired arms hit softer.
  None of it comes back until the fight is over.</p>
  <p><b>Armour is taken off every blow that lands.</b> Weapons answer it three ways:
  <span class="atk">edge</span> pays full price against armour and opens bleeding
  wounds; <span class="atk">blunt</span> ignores some armour and can stun;
  <span class="atk">point</span> slips past more armour still and opens less. So the
  question is never which weapon is best, it is what the thing in front of you is
  wearing, and how many of them there are.</p>
  <p><b>Bleeding ignores armour</b> and keeps taking after the fight; a dressing
  stops it. Wounds do not close on their own: food, dressings and rest close them,
  and rest takes about a minute, less by a fire.</p>
</section>

<section id="load">
  <h2>04 &nbsp;Weight is noise</h2>
  <p>The more you carry, the louder you move, and things hunt by sound. Weight also
  makes you slower to get out of the way and harder to break off a fight. Armour is
  weight, so the safest kit and the quietest kit are opposites, and there is no
  build that is simply best. Rain covers noise. Stone does not.</p>
</section>

<section id="dark">
  <h2>05 &nbsp;Light and the dark</h2>
  <p>Dark rooms are really dark: no room, no exits, nothing on the floor, nothing
  with you. A <b>torch</b> is fire. It burns out, dies in rain, and frightens most
  living things. A <b>lantern</b> lasts far longer and frightens nothing. Either one
  takes your shield hand, and a light lets things see you too.</p>
</section>

<section id="alive">
  <h2>06 &nbsp;A world that keeps going</h2>
  <p>The world runs whether you are in it or not. Creatures get hungry, hunt each
  other, keep to their ground, travel, and remember who hurt them. Rain, fog, wind
  and cold come and go over different ground, night falls, and the tide rises and
  falls. Food spoils and iron rusts. Log out for two days and you come back to a
  world that has had two days.</p>
</section>

<section id="home">
  <h2>07 &nbsp;A place of your own</h2>
  <p>Well out from the gates, open ground will take a den, and where is your choice.
  It is a door, a shelf and bunks you can hand out. You can build into it: a hearth,
  a smoke rack, a larder, a water butt and more, each made of what you carry out
  there. It opens with nothing shut, so things walk straight in, until you fit a
  <b>bar</b>. The ground outside stays public. An unbarred den falls in if you stop
  coming home; a barred one stands until you give it up. Nothing on the shelf is
  frozen the way the vault freezes things.</p>
</section>

<section id="others">
  <h2>08 &nbsp;Other wanderers</h2>
  <p>Other people are real. <b>Fighting them is a choice</b>: everyone starts out of
  it, and only two wanderers who have both chosen it at a gate can fight each other.
  Once on it stays on until you turn it off, which you can only do after a day, and
  anyone who looks at you can see it. A
  killing drops everything the dead one carried and leaves blood on the killer's
  hands for anyone close enough to read.</p>
  <p>You can trade face to face, item for item. You can talk: a word to the room, a
  shout through the walls, or, in the gatehouse, a private word to one person.</p>
</section>

<section id="key">
  <h2>09 &nbsp;Your key and your name</h2>
  <p>NOMAD runs on Nostr. Your key is your wanderer: no account, no password, no
  wipes. Lose the key and nobody can give the wanderer back.</p>
  <p>Everything you do is counted, privately. Nothing about you leaves the world
  unless you ask: the boards are opt-in, and only one command ever posts to your
  own feed.</p>
</section>

<section id="commands">
  <h2>10 &nbsp;Every command</h2>
  <p>Short forms are in brackets. Most commands take the first few letters of a
  name: <code>attack hy</code> is enough for a hyena. Two of a kind?
  <code>attack second hyena</code> or <code>look hyena 2</code> picks by the order
  the room lists them.</p>

  <h3>Getting about</h3>
  <dl>
    <dt><code>look [thing]</code> (l, x, examine, read)</dt>
    <dd>The room, or a closer look at anything it mentions, not just what you can
    pick up: the walls, the water, the graves, the trees. Most places have more to say
    than their first paragraph. It needs light. <code>look east</code> (or any
    direction) names the country that way; big things carry far, small ones do not,
    and fog and the dark take it unless the moon is full.</dd>
    <dt><code>go &lt;direction&gt;</code>, or <code>n s e w u d</code></dt>
    <dd>Move. The fen is the one crossing that weighs you: it carries you and what
    keeps you alive (rations, torches, dressings) and no more than 6 other things.</dd>
    <dt><code>in</code> / <code>out</code></dt>
    <dd>At a gate, into the gatehouse and back out. On a den site, through your own
    door and back out onto the ground.</dd>
    <dt><code>listen [direction]</code> (hark)</dt>
    <dd>Take the rooms around you by sound: breathing, bone, water, a fight, someone
    keeping still. Nothing hears you do it.</dd>
    <dt><code>scan</code></dt>
    <dd>From a height or an edge, read the ground one step out: what is standing in
    it, and which way. Fog takes it, and so does the dark unless the moon is full.</dd>
    <dt><code>map</code> (chart)</dt>
    <dd>Open a map you carry. A surveyor's map starts blank and sets down every room
    its carrier walks. A crude map comes with part of the world already drawn, true as
    far as it goes, and takes what you walk too.</dd>
    <dt><code>dive [item]</code> (swim)</dt>
    <dd>In a drowned room, go under and feel across the floor; name a thing to bring
    it up. The splash carries. Some water soaks you to the skin.</dd>
  </dl>

  <h3>Fighting</h3>
  <dl>
    <dt><code>attack &lt;foe&gt;</code> (k, kill)</dt>
    <dd>Start a fight; it runs on the four-second beat until it ends. Walk out of the
    room to flee. You face one foe and turn to the next when it falls, but everything
    facing you swings back. Fast steel can land twice in a beat, and sweeping steel
    drags through a crowd. A wanderer's name works too, if both of you have chosen to
    fight other wanderers. A fight narrows what you can do: no carving, claiming,
    stashing, renaming or armour swaps, and eating or changing weapons leaves an
    opening. Under a third of your health you hit softer and fumble more, and so does
    everything else.</dd>
    <dt><code>throw &lt;item&gt; at &lt;foe&gt;</code> (hurl)</dt>
    <dd>Its weight plus your arm, and then it is on the floor. One throw a beat.</dd>
    <dt><code>stance reckless|steady|guarded</code></dt>
    <dd>Hit harder and take more, neither, or hit softer and take less. Change it any
    time.</dd>
    <dt><code>bandage</code> (bind, dress)</dt>
    <dd>Stop a bleed and close some of the wound with a dressing from your pack.
    Carry them before you need them.</dd>
    <dt><code>rest</code> (sit)</dt>
    <dd>Let wounds close and your wind come back: about a minute from nothing,
    sooner by a fire. On your feet your stamina comes back slowly and your wounds not
    at all. Any effort ends a rest.</dd>
    <dt><code>pvp on</code> / <code>pvp off</code> / <code>pvp</code></dt>
    <dd>At a gate, choose to fight other wanderers or not. Everyone starts out of it.
    Once on, it stays on until you turn it off yourself, and <code>pvp off</code> only
    works once it has been on a full day. Bare
    <code>pvp</code> says where you stand. Both wanderers have to have chosen it for
    either to attack the other.</dd>
  </dl>

  <h3>Your things</h3>
  <dl>
    <dt><code>inventory</code> (i)</dt>
    <dd>What you carry. The pack holds 20.</dd>
    <dt><code>get &lt;item&gt;</code> (take) / <code>drop &lt;item&gt;</code></dt>
    <dd>Pick up and put down. Past a few loose pieces of gear the pack rides loud, so
    dropping is also how you get quiet mid-chase. A sealed thing set down loses its
    seal.</dd>
    <dt><code>equip &lt;item&gt;</code> (wear, wield) / <code>remove &lt;item&gt;</code></dt>
    <dd>Put armour or a shield on, and take it off. The best weapon in your pack is the
    one you fight with.</dd>
    <dt><code>eat &lt;food&gt;</code></dt>
    <dd>Wounds close from the inside. In a fight, a meal you carry goes down by itself
    once you are badly hurt, one at a time.</dd>
    <dt><code>light</code> (kindle) / <code>light lantern</code></dt>
    <dd>Set a torch burning, or a lantern. A torch burns about ten minutes; a lump of
    fat in a lantern burns three times that.</dd>
    <dt><code>douse</code> (snuff, shutter)</dt>
    <dd>Put out your light. A lantern keeps the fat left in it; a torch is spent.
    <code>equip shield</code> does it too, and gives you your guard back.</dd>
    <dt><code>fill lantern</code></dt>
    <dd>Put a lump of fat in your lantern's well. It holds three.</dd>
    <dt><code>unlock &lt;box&gt;</code> (open, pry)</dt>
    <dd>Use a key you found on a locked chest or box, and take what is inside.</dd>
    <dt><code>burn &lt;item&gt;</code> (destroy)</dt>
    <dd>Gone for good: no scrap, no trace.</dd>
  </dl>

  <h3>At a gate</h3>
  <dl>
    <dt><code>claim [item]</code> (seal)</dt>
    <dd>Put the dungeon's seal on a piece: it is provable and publishable, and it is the
    vault's price of entry. It does nothing for you when you die.</dd>
    <dt><code>stash &lt;item&gt;</code> / <code>unstash &lt;item&gt;</code></dt>
    <dd>The lockbox: 8 slots, takes anything. The same lockbox at every gate.
    <code>stash</code> alone looks inside.</dd>
    <dt><code>vault &lt;item&gt;</code> / <code>unvault &lt;item&gt;</code></dt>
    <dd>The vault: 50 slots; gear is sealed going in, and nothing in it ages, rusts or
    spoils. <code>vault</code> alone looks inside. A count moves that many of a stack:
    <code>unvault 6 leather</code>, <code>vault all scrap</code> (stash, unstash, stow
    and fetch take counts too).</dd>
    <dt><code>barter</code> (trade, shop), <code>buy &lt;thing&gt;</code>, <code>offer &lt;thing&gt;</code></dt>
    <dd>The keeper deals in kind. <code>buy</code> names what you want, then
    <code>offer</code> lays goods on the counter until he is square. He gives no change
    and touches nothing sealed. <code>buy 3 torch</code> buys three. What he is not
    carrying today comes back another day.</dd>
    <dt><code>bounty</code> / <code>bounty claim &lt;trophy&gt;</code></dt>
    <dd>The keeper's board of four trophies he pays for in meals he never stocks. It
    reaches your keeping as well as your pack, pays each wanderer once a posting, and
    turns over every hour or so.</dd>
    <dt><code>salvage &lt;gear&gt;</code> (scrap)</dt>
    <dd>Break gear down at the vice for scrap iron. The rarer the piece, the bigger the
    pile.</dd>
    <dt><code>smelt</code></dt>
    <dd>Five scrap iron into one bar of iron at the brazier.</dd>
    <dt><code>forge [item]</code> (craft)</dt>
    <dd>Work scrap and iron, and the odd trophy, into gear. <code>forge</code> alone
    reads the recipe book.</dd>
    <dt><code>repair &lt;gear&gt;</code> (mend)</dt>
    <dd>Spend scrap iron to hammer out wear. Gear wears with every blow, from sound to
    worn, battered, failing and then gone for good; mend it before it fails.</dd>
    <dt><code>dice</code> (bones), <code>roll</code>, <code>stand</code></dt>
    <dd>On the gatehouse bench. Two bones to open, then one at a time; over 21 and you
    are out. <code>roll</code> takes another, <code>stand</code> holds. Bare
    <code>dice</code> plays the keeper for nothing, <code>dice &lt;trophy&gt;</code>
    stakes one against his bowl, <code>dice bowl</code> reads the table, and
    <code>dice &lt;name&gt; [trophy]</code> calls out anyone by the fire. Trophies or
    nothing.</dd>
    <dt><code>board</code>, <code>post &lt;words&gt;</code>, <code>tear &lt;number&gt;</code></dt>
    <dd>The notice board inside. Read it, pin up a notice of up to 120 characters, or
    tear one down. A notice keeps a week, and the board holds twenty. Nobody checks a
    word of it.</dd>
    <dt><code>tell &lt;name&gt; &lt;words&gt;</code> (whisper)</dt>
    <dd>In the gatehouse, a word to one person. It goes to their key alone. In the
    gatehouse, anything you type that is not a command is said aloud to the room.</dd>
  </dl>

  <h3>Food and fire</h3>
  <dl>
    <dt><code>cook &lt;catch&gt;</code> (roast)</dt>
    <dd>A fish, an eel, a crab, an egg, over a fire. It heals more and will not keep.
    A gate's brazier does it free; out in the world it takes a campfire, and
    everything there sees the flame.</dd>
    <dt><code>cure &lt;meat&gt;</code></dt>
    <dd>Hang raw meat on a smoke rack and it becomes food that keeps. Behind any gate
    the racks are safe and slow. Out in the world, the old smokehouse in the fortress
    (feed its cold racks a torch), the Hollow Under on the mountain, the crossing's
    smoke house and the wood's charcoal flat are quicker, and anyone can lift what is
    hanging there. A smoke rack over your own hearth cures while you are away, and
    nobody else can reach it.</dd>
    <dt><code>campfire</code> (stoke)</dt>
    <dd>Lay a bundle of split wood and light it, from a torch or a rock struck on scrap
    iron. It warms and dries whoever stands at it. <code>campfire</code> again feeds it
    another bundle.</dd>
    <dt><code>fish</code> (cast)</dt>
    <dd>At open water: the fen, the drowned orchard, the flooded quarry, the millpond
    and the pools of the road, the crossing's stages and shore, and the water in the
    deep. Rain wakes the surface waters.</dd>
    <dt><code>feed &lt;bird&gt; &lt;food&gt;</code></dt>
    <dd>Hold out food to a raven or crow. One that has been working the road may drop
    what it picked up. Sometimes.</dd>
    <dt><code>smoke</code></dt>
    <dd>Light a cigarette. It steadies you for a breath, and out in the world the dark
    sees the ember.</dd>
  </dl>

  <h3>A place of your own</h3>
  <dl>
    <dt><code>settle</code></dt>
    <dd>Raise a den on open ground of your choosing, well out from every gate. It costs
    20 split wood, 10 leather offcuts, 4 iron and 10 scrap, carried out there. You hold
    one den in the world. Dying sometimes wakes you at your own door.</dd>
    <dt><code>bar</code></dt>
    <dd>Fit a bar to your door: 2 iron and 3 scrap. Behind it nothing reaches you, no
    creature and no wanderer without a key. Unbarred, it stops nothing.</dd>
    <dt><code>build [thing]</code></dt>
    <dd>Inside your den, <code>build</code> alone lists what else it can have and what
    each costs: a hearth, a smoke rack over it, oiled hides, a bone rattle on the door,
    a second rack, a larder, a water butt, a whetstone, a stretching frame, stakes and
    a snare line outside, a slit in the wall, a root cellar, a bolt-hole.
    <code>build &lt;thing&gt;</code> sets to work; it takes a few goes, and the right
    tool in your pack halves it.</dd>
    <dt><code>stow &lt;item&gt;</code> / <code>fetch &lt;item&gt;</code></dt>
    <dd>Put things on your shelf, and take them back. It holds any amount of gear, and
    12 of everything else (20 with a second rack). Food ages on it and iron rusts.</dd>
    <dt><code>bunk &lt;name&gt;</code> / <code>unbunk &lt;name&gt;</code></dt>
    <dd>Hand someone standing in front of you a key, and take it back from anywhere.
    Draw steel on anybody under a roof that is not yours and that roof is shut to you
    for good.</dd>
    <dt><code>den</code></dt>
    <dd>How your holding stands: the door, the bunks, the shelf, and how long it has
    left if you stop coming home.</dd>
    <dt><code>stretch &lt;pelt&gt;</code>, <code>draw water</code>, <code>bolt</code></dt>
    <dd>On the stretching frame, a pelt off a kill becomes leather (it needs a blade).
    From the water butt, a draught of water; rain fills it. Through the bolt-hole, out
    and up in the next room over, unseen at your own door.</dd>
    <dt><code>abandon</code></dt>
    <dd>Give your den up. Nothing on the shelf moves.</dd>
  </dl>

  <h3>Other wanderers</h3>
  <dl>
    <dt><code>say &lt;words&gt;</code> (')</dt>
    <dd>Speak to the room.</dd>
    <dt><code>shout &lt;words&gt;</code> (yell)</dt>
    <dd>Every room around hears it, and everything with ears comes to see who owns the
    voice.</dd>
    <dt><code>deal &lt;name&gt;</code></dt>
    <dd>Trade item for item with someone in the same room, anywhere. Both sides lay
    goods down, and changing the table unshakes both hands. Anything off your body can
    cross, sealed things and journals included; what you are wearing cannot. Steel
    drawn on either side calls it off.</dd>
    <dt><code>emote &lt;words&gt;</code></dt>
    <dd>Show the room what you do: <code>emote crouches by the fire</code> is seen as
    your name and then your words. It has to be seen, so in the dark or thick fog
    nobody makes it out.</dd>
    <dt><code>follow &lt;name&gt;</code></dt>
    <dd>Fall in behind someone in the room: when they take a way out, you take it
    after them, a step like any other. It holds until you say <code>follow</code> on
    its own or go somewhere yourself. If you can't take a step (in a fight, at rest,
    or where they went is shut to you) you stay, still following.</dd>
    <dt><code>wash</code> (scrub)</dt>
    <dd>At water, or in the rain, scrub a killing off your hands. It fades on its own;
    water takes it now. Anyone watching sees you do it.</dd>
    <dt><code>guard</code>, <code>lean</code>, <code>crouch</code></dt>
    <dd>Stand a way and keep standing it; anyone who comes in sees it on you. The same
    word again stands out of it, and any effort ends it.</dd>
    <dt><code>point &lt;thing&gt;</code></dt>
    <dd>Hold a hand out toward something and leave it there. Bare <code>point</code>
    lowers it.</dd>
    <dt><code>beckon</code>, <code>wave</code>, <code>nod</code>, <code>brow</code> [name]</dt>
    <dd>Call someone on; a raised hand (which shows whether yours is empty); the passing
    acknowledgement; two fingers to the brow, the road's courtesy.</dd>
    <dt><code>dance</code>, <code>keen</code>, <code>sing</code>, <code>whistle</code></dt>
    <dd>A few steps; grieving where you stand; a human noise; one hard note that carries
    to the next room and wakes what sleeps in this one.</dd>
    <dt><code>ring</code> (toll)</dt>
    <dd>Ring the bell-buoy, or a bell you carry. Every bell is a dinner bell with a name
    on it.</dd>
  </dl>

  <h3>Marks and records</h3>
  <dl>
    <dt><code>carve &lt;words&gt;</code></dt>
    <dd>Scratch up to 40 characters into the surface where you stand; it weathers off
    within a day. Bare <code>carve</code> at a milestone cuts your name into the road's
    register, and in the gatehouse sets the halls you walked down on the wall chart.</dd>
    <dt><code>carve rock</code></dt>
    <dd>With a loose rock and a tool that cuts stone in your pack, work it into a small
    carving. What it becomes is the stone's business; how finely it is cut is the
    tool's.</dd>
    <dt><code>place &lt;carving&gt;</code></dt>
    <dd>Set a carving down where you stand and leave it. Nobody can pick it up. In your
    own den it lasts; anywhere else it weathers away over a few days. A spot holds
    three.</dd>
    <dt><code>study &lt;creature&gt;</code> (observe)</dt>
    <dd>With a journal in your pack, watch a creature and note what it is doing.
    <code>study dead &lt;creature&gt;</code> reads a body on the floor and uses it up. A
    full account wants everything the animal does, and its kills.</dd>
    <dt><code>journal [creature]</code></dt>
    <dd>Read your journal, or one creature's page. It drops when you die, and can be
    taken, pages and all.</dd>
    <dt><code>sheet</code> (score, stats)</dt>
    <dd>Your ledger: kills, deaths, kings, wanderers, your age under this name, and
    whether you fight other wanderers.</dd>
    <dt><code>leaderboard</code> (top)</dt>
    <dd>The boards: <b>trophies</b> (what you have brought home and kept) and
    <b>legend</b> (everything you have killed, and every full account in your
    journal).</dd>
    <dt><code>publish score</code></dt>
    <dd>Enter the boards, signed by the dungeon so nobody can post a legend they did
    not earn. Publish again to replace it.</dd>
    <dt><code>publish sheet</code> / <code>publish &lt;sealed item&gt;</code></dt>
    <dd>The dungeon speaks your ledger, or your claim on a thing you own, to the
    relays.</dd>
    <dt><code>publish kind 1</code></dt>
    <dd>Post your wanderer to your own feed, in your own hand. The only thing that ever
    touches your feed.</dd>
    <dt><code>invite [message]</code> / <code>invite post</code></dt>
    <dd>Write a letter for someone new and get a link; your message goes with it.
    Whoever comes in through it wakes with a plain kit, supplies and your letter.
    Someone already on the road who opens it gets the letter and a little food, up to
    three a day. <code>invite post</code> posts the letter to your own feed.</dd>
    <dt><code>who</code></dt>
    <dd>Everyone awake in the world.</dd>
    <dt><code>name &lt;new name&gt;</code></dt>
    <dd>Choose what the world calls you.</dd>
    <dt><code>alias &lt;word&gt; = &lt;command&gt;</code> / <code>unalias &lt;word&gt;</code></dt>
    <dd>Your own short word for something you type often: after <code>alias kr = attack rat</code>,
    <code>kr</code> is <code>attack rat</code>. Words after it carry on, so with
    <code>alias bb = bandage</code>, <code>bb arm</code> is <code>bandage arm</code>. One word stands
    for one command, and a command the game already knows can't be taken.
    <code>alias</code> on its own lists yours. They follow your key.</dd>
    <dt><code>quit</code> (leave)</dt>
    <dd>Step out. Your wanderer and everything you carry wait where you are. If
    something is fighting you when you go, your body stands and swings for 45 seconds
    first.</dd>
    <dt><code>fullscreen</code></dt>
    <dd>Fill the screen (also in settings). Again to leave, or hold Esc.</dd>
    <dt><code>help</code> (?)</dt>
    <dd>The short list, in the game.</dd>
  </dl>
</section>

<footer>
  <a href="/">Go to the door.</a>
</footer>

</div>
</body>
</html>`;
