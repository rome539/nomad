// THE GUIDE — nomadmud.com/guide
//
// `help` is a COMMAND REFERENCE: what to type, and the one rule you must know
// before you die (what you keep). It has never explained how anything WORKS —
// why an axe struggles against plate, what a bleed actually does, why the
// quiet man hears you coming. That is what this is for.
//
// THE RULE THIS PAGE IS WRITTEN UNDER (rome, 2026-08-07): THE LAWS, NOT THE
// NUMBERS. Every system's shape is explained and no constant is printed — no
// drop rates, no stat blocks, no bestiary. A player should finish this able to
// reason about the world and still have to go and find out what is in it. The
// moment this page lists the woodward's hitpoints it has replaced the game with
// a spreadsheet, and the secret economy (which nothing in-game ever names) dies
// the same day.
//
// Its own module rather than more of public.ts, per the standing rule about the
// spine: public.ts is the client, this is a document. No JavaScript at all —
// nothing here needs to move, and a page that cannot break is worth more than a
// page that scrolls prettily.
export const GUIDE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>NOMAD — how it works</title>
<meta name="description" content="How NOMAD works: what you keep, what armour does, what weight costs, and why the world does not wait for you.">
<meta property="og:title" content="NOMAD — how it works">
<meta property="og:description" content="What you keep, what armour does, what weight costs, and why the world does not wait for you.">
<meta property="og:image" content="https://nomadmud.com/og.jpg?v=2">
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
</style>
</head>
<body>
<div class="wrap">

<header>
  <h1>NOMAD</h1>
  <div class="sub">How it works. Not what to type — <code>help</code> does that, in the game.
  This is the shape of the rules underneath: what you keep, what armour does, what weight
  costs you, and why the world carries on without you.</div>
  <a class="back" href="/">&#8592; back to the door</a>
</header>


<div class="tldr">
  <div class="lbl">The short version</div>
  <ul>
    <li><b>Die and you drop everything you were carrying</b>, sealed things included.
    Anything you put in the lockbox, the vault or your own shelf survives you.</li>
    <li><b>Loot is worth nothing until you have banked it.</b> The gatehouse behind
    any gate is the bank, and the only room nothing can reach you in.</li>
    <li><b>Armour is subtracted from every blow.</b> Edge pays full price against it
    and answers with bleeding; blunt caves it in; a point slips past it.</li>
    <li><b>Combat runs on a four-second beat.</b> You do not swing by typing —
    you pick a fight and it keeps happening until someone stops.</li>
    <li><b>Weight is noise.</b> The safest kit and the quietest kit are opposites,
    and things hunt by sound.</li>
    <li><b>Bleeding ignores armour entirely.</b> Carry dressings.</li>
    <li><b>The dark is really dark.</b> A torch is fire — it frightens most things,
    burns out, and dies in rain. A lantern lasts and frightens nothing.</li>
    <li><b>The world runs while you are logged out.</b> Things get hungry, move,
    hold grudges; food spoils and iron rusts.</li>
    <li><b>Your key is your character.</b> No accounts, no wipes.</li>
    <li><b>Nothing about you is published unless you ask.</b> The leaderboards are
    opt-in, and only one command ever posts to your own feed.</li>
  </ul>
  <div class="tail">The rest of this page is why each of those is true.</div>
</div>

<nav>
  <div class="lbl">Contents</div>
  <ol>
<li><span class="n">01</span> <a href="#keep">What you keep</a></li>
    <li><span class="n">02</span> <a href="#walk">The walk home</a></li>
    <li><span class="n">03</span> <a href="#beat">The four-second beat</a></li>
    <li><span class="n">04</span> <a href="#armour">Armour and the three damages</a></li>
    <li><span class="n">05</span> <a href="#wounds">Wounds</a></li>
    <li><span class="n">06</span> <a href="#load">What you carry</a></li>
    <li><span class="n">07</span> <a href="#stance">How you stand</a></li>
    <li><span class="n">08</span> <a href="#dark">Light and the dark</a></li>
    <li><span class="n">09</span> <a href="#alive">The world does not wait</a></li>
    <li><span class="n">10</span> <a href="#sky">Weather, night and the tide</a></li>
    <li><span class="n">11</span> <a href="#home">Living somewhere</a></li>
    <li><span class="n">12</span> <a href="#trade">Trade, forge and fire</a></li>
    <li><span class="n">13</span> <a href="#know">Knowing where you are</a></li>
    <li><span class="n">14</span> <a href="#others">Other wanderers</a></li>
    <li><span class="n">15</span> <a href="#key">Your key is your character</a></li>
    <li><span class="n">16</span> <a href="#boards">Your standing, and saying so</a></li>
  </ol>
</nav>

<section id="keep">
  <h2>01 &nbsp;What you keep</h2>
  <p>This is the rule to know before anything else, because it is the rule that
  costs you.</p>
  <div class="law"><b>Die, and everything you were carrying stays where you fell.</b>
  Everything. The sealed things too — the gate's seal is a title, not armour.
  What is put away somewhere is what survives you.</div>
  <p>There are four places to put a thing, and only one of them is your pockets:</p>
  <ul>
    <li><b>Your pack</b> is what you are carrying. It is lost the moment you are.</li>
    <li><b>The lockbox</b> is set into the gatehouse wall. Small, and it is the
    same lockbox at every gate — put something in at one, take it out at another.</li>
    <li><b>The vault</b> is bigger and it <em>stops time</em>: nothing in it ages,
    rusts or spoils. It is also the hardest to fill.</li>
    <li><b>Your shelf</b>, if you have raised a den, holds as much gear as you
    like — but it is out where you built it, and the world's clock runs in it.
    Food ages on that shelf. Iron rusts on it.</li>
  </ul>
  <p>What lies where you died does not vanish. Anyone can pick it up, including
  you, if you can get back before something else does.</p>
</section>

<section id="walk">
  <h2>02 &nbsp;The walk home</h2>
  <p>Nothing you find is yours until you have put it somewhere. That single fact
  is the whole game: every step further out is worth more loot and a longer walk
  back through it.</p>
  <p>A <strong>gate</strong> is a door in the world. Behind it is a
  <strong>gatehouse</strong> — the only warm room there is. Step in and you are
  out of the world entirely: nothing can reach you, and everything is there —
  your lockbox and vault, the keeper's hatch, the forge, the smoke racks, the
  wall chart, the board.</p>
  <div class="law">There is <b>no timer and no queue</b>. Nobody makes you leave
  and nothing calls the raid. The only thing deciding whether you push on or turn
  back is how far you are from a door and how much you are carrying — which is
  why both of those things matter more here than anywhere else.</div>
  <p>Gates are not all in the same place, and some parts of the world are a long
  way from any of them.</p>
</section>

<section id="beat">
  <h2>03 &nbsp;The four-second beat</h2>
  <p>Combat is not turn-based and it does not wait for you to type. Once you are
  in a fight, <strong>blows land every four seconds</strong>, on a clock, whether
  your hands are on the keyboard or not.</p>
  <div class="law"><b>You do not swing by typing.</b> You pick a fight and the
  fight keeps happening. What you type between beats is which fight, what stance,
  what is in your hands — and whether you are still here.</div>
  <p>What that buys you is four seconds to think, every four seconds, and the
  knowledge that thinking too long is itself a decision. What it costs you is the
  option of standing still while you work something out.</p>
  <h3>What happens on a beat</h3>
  <ul>
    <li><b>You swing first.</b> The living get initiative — your blow lands before
    theirs each round.</li>
    <li><b>You fight one thing at a time</b>, and turn to the next the moment it
    falls. Everything facing you swings back. That is why a crowd is so much worse
    than one big thing: they all answer, and you answer one of them — unless your
    weapon <em>cleaves</em>, which is exactly what cleaving is for.</li>
    <li><b>Being stunned costs you the swing</b>, not just some damage. One beat,
    gone.</li>
    <li>Some steel is <b>fast</b> enough to land more than once in a beat.</li>
  </ul>
  <p>Everything else in the world runs on its own faster clock — creatures moving,
  wounds bleeding, torches burning down. Only the exchange of blows waits for the
  beat, so a fight reads at a human pace instead of a blur.</p>
  <h3>The exception, and it is the one worth knowing</h3>
  <p>Striking something that has <strong>not noticed you</strong> does not wait for
  the beat. It lands immediately, and it lands hard. An ambush is the whole reward
  for being quiet — which is the other half of why weight matters.</p>
  <p>Leaving is a decision like any other, and it is made on the beat too. Walk out
  and whatever you were fighting may well come after you.</p>
</section>

<section id="armour">
  <h2>04 &nbsp;Armour and the three damages</h2>
  <p>Armour is not a chance to avoid a hit. It is <strong>subtracted from every
  blow that lands</strong> — which means a small hit against good armour is
  almost nothing, and armour is worth far more against many light blows than
  against one heavy one.</p>
  <p>Weapons answer that in three different ways, and the difference is the whole
  of combat:</p>
  <ul>
    <li><span class="atk">EDGE</span> — swords, axes, knives. It opens flesh.
    Against armour it pays <em>full price</em>: an edge does not cheat plate at
    all. Its answer to armour is not the swing, it is the <strong>bleed</strong>
    that follows.</li>
    <li><span class="atk">BLUNT</span> — maces, mauls, hammers. Weight caves
    armour in, so a blunt weapon <strong>ignores some armour outright</strong>.
    It is also the heaviest thing you can swing, and it can leave a man
    <strong>stunned</strong>.</li>
    <li><span class="atk">POINT</span> — picks, spikes, war-pikes. A point slips
    between the plates. It ignores <strong>more armour than blunt does</strong>,
    and it is lighter, but it opens far less.</li>
  </ul>
  <p>A fourth thing some weapons do is <strong>cleave</strong>: one swing reaches
  more than one enemy. That is worth nothing in a duel and a great deal when
  three things come at you at once.</p>
  <div class="law">So the useful question is never <b>what is the best weapon</b>.
  It is <b>what is it wearing</b> — and whether there is one of them or five.</div>
  <p>One more thing, and it is easy to miss: when a creature's own swing goes
  wide it is briefly off balance, and <strong>your very next blow</strong> hits
  harder for it. Every weapon gets something from that moment. It is the one time
  an edge gets past armour.</p>
</section>

<section id="wounds">
  <h2>05 &nbsp;Wounds</h2>
  <p>Damage is not the only thing that happens to you.</p>
  <ul>
    <li><b>Bleeding</b> keeps taking from you after the fight has stopped, and it
    <strong>ignores armour completely</strong> — a bleed is subtracted raw, which
    is why lightly-armed things that cut can be far worse than their damage
    suggests. It clots on its own eventually. A <span class="mend">dressing</span>
    stops it now.</li>
    <li><b>Hobbled</b> means something went for your legs. You can still leave —
    it is never a lock on the door — but you leave slowly, and slowly is the
    problem.</li>
    <li><b>Stunned</b> costs you the moment you needed.</li>
  </ul>
  <p>Healing is food, dressings and <span class="mend">rest</span>. Resting works
  anywhere, and anywhere is not always wise: it takes time, and time is when
  things arrive.</p>
  <p>Certain gear is made against all this — some of it stops a wound opening at
  all, and some makes one you already have clot sooner. Read what a piece says
  about itself; it will tell you which.</p>
</section>

<section id="load">
  <h2>06 &nbsp;What you carry</h2>
  <p>Weight is the price of power, and it is charged three times.</p>
  <ul>
    <li><b>It is heard.</b> The more you carry the more noise you make moving,
    and noise is how things find you. An empty-handed wanderer is very nearly
    silent. Someone in full plate with a mace is not, and everything with ears
    knows where they are.</li>
    <li><b>It is slower to get out of the way.</b> Dodging is a load problem.</li>
    <li><b>It costs you the parting</b> — leaving a fight cleanly is easier
    light than heavy.</li>
  </ul>
  <div class="law">Armour is weight and weight is noise, so <b>the safest kit and
  the quietest kit are opposites</b>. There is no build that is simply best. There
  is the one that suits what you are about to do.</div>
  <p>Weight is not only what you wear. What you are holding counts, and so does
  loose metal past what a person can comfortably carry. A pack full of salvage is
  a pack that announces you.</p>
  <p>Rain covers noise. Deep stone does not.</p>
</section>

<section id="stance">
  <h2>07 &nbsp;How you stand</h2>
  <p>Three ways to hold yourself in a fight, changeable at any time:</p>
  <ul>
    <li><span class="atk">Reckless</span> — hit harder, take more.</li>
    <li><b>Steady</b> — neither.</li>
    <li><span class="def">Guarded</span> — hit softer, take less.</li>
  </ul>
  <p>A shield is a separate argument. A big one blocks a great deal and
  <strong>drags the swing it is protecting</strong> — it says so when you pick it
  up. A small one costs you almost nothing and saves you almost nothing.</p>
</section>

<section id="dark">
  <h2>08 &nbsp;Light and the dark</h2>
  <p>Dark rooms are genuinely dark. You cannot see the room, its exits, what is
  on the floor, or what is in there with you.</p>
  <ul>
    <li>A <b>torch</b> is fire: it burns out, it dies in the rain, and it
    <strong>frightens most living things</strong> — a great many creatures will
    break off a fight rather than stay near an open flame, though not every round
    and never the ones with a reason to hold their ground.</li>
    <li>A <b>lantern</b> is shuttered. It lasts far longer and it is
    <strong>not fire</strong>, so it scares nothing at all.</li>
  </ul>
  <p>Both occupy a hand. A light in your shield hand means you are not really
  carrying a shield, and the game will tell you so rather than quietly halving
  your guard.</p>
  <div class="law">A torch buys you passage and costs you the dark's one gift:
  <b>things cannot see you either</b>.</div>
</section>

<section id="alive">
  <h2>09 &nbsp;The world does not wait</h2>
  <p>This is the part that is not like other games of this kind. The world is not
  a set of rooms that come alive when you walk in. It is running now, and it was
  running while you were away.</p>
  <ul>
    <li>Creatures get <b>hungry</b>, and a hungry thing behaves differently from
    a fed one. Some of them hunt each other. You can walk into the middle of
    that.</li>
    <li>They hold <b>territory</b>, keep to ground they know, and remember. Hurt
    something and get away, and it has not forgotten you.</li>
    <li>They <b>travel</b>. Things come up out of the deep and walk to where they
    live. Some patrol a fixed round, forever, and are exactly where their round
    says they should be.</li>
    <li>Food <b>spoils</b>. Iron <b>rusts</b>. A corpse draws scavengers.</li>
  </ul>
  <p>Log out for two days and you do not return to a paused world. You return to
  one that has had two days.</p>
</section>

<section id="sky">
  <h2>10 &nbsp;Weather, night and the tide</h2>
  <p>Outdoors is outdoors. It rains, and rain drowns torches, masks noise and
  leaves mud that holds a footprint. Night falls and the surface goes properly
  dark. Water rises and falls, and there are places you can only cross at the
  right hour — and places you should not be standing at the wrong one.</p>
  <p>You always know what weather you are standing in. The world will not hide
  that from you; it will only make you deal with it.</p>
</section>

<section id="home">
  <h2>11 &nbsp;Living somewhere</h2>
  <p>Out past the road there is ground where people used to live, and you can
  live there too.</p>
  <ul>
    <li><b>Raise a door</b> and you have a house: a shelf that holds unlimited
    gear, and bunks you can hand to other wanderers face to face.</li>
    <li><b>It opens exposed.</b> A new den shelters you from nothing — things
    walk straight in. Only a <strong>bar</strong>, made of iron you carried out
    there yourself, changes that.</li>
    <li><b>The ground stays public.</b> Anyone can stand on it, learn who lives
    there, and wait. The door is yours; the street never is.</li>
    <li><b>An unbarred hold falls in</b> if you stop coming home. There is no
    rent and no upkeep bar — the only question it asks is whether you still live
    there. Bar the door and it stands until you give it up.</li>
  </ul>
  <p>Nothing in a den is frozen the way the vault freezes things. That is the
  difference between a bank and a home.</p>
</section>

<section id="trade">
  <h2>12 &nbsp;Trade, forge and fire</h2>
  <p>The keeper at the hatch <strong>deals in kind</strong>. There is no coin: you
  name what you want, and you lay things on the counter until he is square. He
  gives no change, so pay attention to what you are handing over.</p>
  <p>He does not carry everything at once. What is not on his shelf today comes
  back another day — the hatch tells you what he is not carrying, so you know to
  come back rather than wonder whether it ever existed.</p>
  <p>What he privately prizes, he never says. Some things are worth far more than
  they look.</p>
  <p>The <strong>forge</strong> turns salvage into iron and iron into gear. The
  <strong>smoke racks</strong> turn raw meat into food that keeps. Both are in the
  gatehouse, and both take time you spend not out there.</p>
</section>

<section id="know">
  <h2>13 &nbsp;Knowing where you are</h2>
  <p>Nothing hands you a map. Knowledge is a thing you find, carry, and can lose
  like anything else.</p>
  <ul>
    <li>A <b>surveyor's map</b> is true. A <b>crude map</b> is somebody's honest
    attempt, and it is wrong in ways that are consistent — the same copy lies the
    same way every time you open it.</li>
    <li>A <b>journal</b> is somebody's record. It can be taken off them.</li>
    <li>The <b>wall chart</b> in the gatehouse is shared: what one wanderer carves
    into it, every wanderer reads.</li>
    <li>The <b>board</b> in the gatehouse is where people leave word for each
    other. A notice keeps for a week, and it is the only thing anyone says here
    that is still there after they log off. Nobody checks a word of it, anybody
    can tear any of it down, and some of it is a lie somebody wants you to
    believe. <code>board</code> reads it, <code>post &lt;words&gt;</code> pins
    one up.</li>
    <li>Some things out in the world <b>keep a list of names</b>, and comparing
    two such lists tells you who went on and who turned back.</li>
  </ul>
  <p>Reading needs light. Carving is loud and takes a while.</p>
</section>

<section id="others">
  <h2>14 &nbsp;Other wanderers</h2>
  <p>Other people are real and they are not on your side by default.</p>
  <ul>
    <li>You can <b>kill them</b>, and they drop what they were carrying like
    anyone else.</li>
    <li>Killing leaves <b>blood on your hands</b> that others can see. Nothing
    punishes you with dice for it — the consequence is that people know.</li>
    <li>A <b>fresh key is weak</b> for a while, which makes hunting the newly
    arrived a poor way to spend an afternoon.</li>
    <li>You can <b>trade</b> face to face, item for item, no keeper involved.</li>
    <li>You can <b>talk</b>. Speech carries to the next room. In the gatehouse,
    anything you type that is not a command is something you said out loud.</li>
  </ul>
</section>

<section id="key">
  <h2>15 &nbsp;Your key is your character</h2>
  <p>NOMAD runs on Nostr. Your key <em>is</em> your wanderer — there is no account,
  no password and no server that owns you. Arrive with a key you already have and
  it is the same you; arrive without one and you are handed a fresh one at the
  door.</p>
  <div class="law">There are no wipes. <b>The dead stay dead</b> and the living
  keep going, and both of those are permanent on purpose.</div>
  <p>The dungeon can put its own signature to what you have done — your standing,
  your ledger, a thing you own. What that is worth, and how you use it, is the
  next section.</p>
</section>

<section id="boards">
  <h2>16 &nbsp;Your standing, and saying so</h2>
  <p>Everything you do is counted. <b>sheet</b> shows you the count: what you have
  killed, what has killed you, kings put down, wanderers put down, and how long you
  have been alive under this name. That ledger is yours and it is private.</p>
  <div class="law">Nothing about you leaves this world unless you ask for it. There
  is no profile, no directory, no automatic posting. <b>The world does not
  snitch.</b></div>
  <p>When you do want to be seen, there are three separate things you can do, and
  they are separate on purpose.</p>
  <h3>The reckoning</h3>
  <p><b>publish score</b> enters you into the boards. <b>leaderboard</b> reads them,
  and so does the plaque on the door before you have even entered. There are two,
  and they reward opposite lives:</p>
  <ul>
    <li><b>Trophies</b> — what every trophy you hold is worth, counting your pack,
    your lockbox and your vault together. This board is about what you have
    <em>brought home and kept</em>. Die with it all on your back and the board
    knows.</li>
    <li><b>Legend</b> — everything you have killed for as long as you have lived,
    with kings and wanderers weighing heaviest. This one cannot be lost, only
    added to.</li>
  </ul>
  <p>Your entry is <strong>signed by the dungeon, not by you</strong>. That is the
  whole point: the world attests the number, so nobody can post a legend they did
  not earn. Publish again whenever you like — a new score replaces your old one
  rather than piling up beside it. The boards reach outside as well as in, so a
  score put up here is a score standing on the open network.</p>
  <h3>Your own feed</h3>
  <p><b>publish kind 1</b> posts your wanderer to your own timeline, in your own
  hand, signed with your own key — an ordinary note, in front of whoever follows
  you, permanent. It draws your ledger onto a card so the post carries the numbers
  as a picture, and tags the dungeon's signed copy so anyone who cares can check
  the figures against the world's own word.</p>
  <div class="law">This is the only thing that touches your feed. Entering the
  boards does not post anything to it, and neither does anything else you do here.</div>
  <h3>Claims</h3>
  <p><b>publish sheet</b> speaks who you are with the dungeon's signature behind it,
  and <b>publish &lt;sealed item&gt;</b> proclaims a thing you own. These are
  certificates, not announcements — proof you can show, made when you ask for it.</p>
  <p>None of it is required. You can play the whole game and never appear anywhere.</p>
</section>

<footer>
  Everything here is the shape of a rule, never a table of numbers — the numbers
  are for finding out. <a href="/">Go to the door.</a>
</footer>

</div>
</body>
</html>`;
