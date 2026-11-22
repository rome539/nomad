# Creatures change the world: the idea

Noted 2026-11-22. An idea only: nothing is decided or built.

## The idea

Creatures leave marks on the ground they live on, the way players might
(see the parked "players leave a lasting mark" thread). The first example is
rats: where a lot of rats gather, they make a nest there. The room changes and
stays changed until something undoes it.

## What exists already (fixed places, not made by the creatures)

- **Brood-mothers' nests** (ai.ts `broodBirths`): a mother births scabby rats
  into her nest up to a cap. The nests are rooms set in advance; a mother never
  starts a new one.
- **The ravens' nests** (ai.ts, "THE RAVEN'S NEST"): ravens carry unguarded
  things to a fixed nest room (`z.nests`, capped).
- **The Hoard-Hole** (ai.ts `ratHoards`): warren rats carry things to one fixed
  pile.

What is new: the creatures make the place themselves, wherever enough of them
gather.

## The shape it might take (rats first)

- **Forming:** enough rats in one room, or in a few rooms close together, for
  long enough, and a nest forms there.
- **What a nest does:** the room's words and its picture both change (both,
  always). Rats breed there and come back to it. Maybe they carry food or things
  into it, as the Hoard-Hole works. Maybe it fouls the room: sickness, people
  passing through get bitten.
- **Growing and spreading:** a nest left alone gets bigger, and a big one sends
  rats out to start another nearby.
- **Ending:** players clear it by killing the rats, burning it, or digging it
  out. Once it is cleared, the room goes back to how it was, maybe slowly. A
  nest with no rats left falls apart on its own.
- **The chronicle** keeps it: a nest forming or being burned goes on the
  region's record.

## Other creatures it could reach later

Not chosen: these are just examples.

- Wolves: a den with gnawed bones round it.
- Ravens and crows: a roost, with droppings under it.
- Grazers: worn paths and grass cropped to the earth.
- Boar: ground rooted up.
- Bears: claw marks on the trees round their caves (the wood fauna plan).

## Open questions

- What "a lot" is: how many rats, over how long.
- Which rooms can hold a nest: never on the roads, at the gates or in Assart
  End? Or anywhere?
- The picture: does each nest need its own plate, or a layer laid over the
  room's plate (as fog and rain are)?
- Does it come before or after the living-world plan (herds and the
  hunter-scaled floor)? It sits on the same counts of creatures per room.
