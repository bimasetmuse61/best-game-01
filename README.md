# Starshard Salvage

A complete, original arcade game for [best-game-01](https://make.fun/bounty/best-game-01) ($1,000, 10 places).

You are the Keeper of the last salvage skiff, sweeping a dead nebula for
starshards. Destroy void drones, bank the shards they drop, and fly
through the warp gate to escape each wave. Between waves, draft one of
three upgrades — rapid coils, twin barrels, hull plating, a magnet array
and more. Survive all 10 waves and destroy the Void Maw to win.

## How to play

- **WASD / arrows** — fly
- **Mouse** — aim
- **Hold click / Space** — fire
- **1 / 2 / 3 or click** — pick an upgrade between waves
- **P** — pause, **M** — mute, **R** — restart

## Run it locally

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

No build step, no network requests, no libraries: plain HTML, CSS and ES
modules on a 2D canvas, with all sound synthesized through WebAudio.

## Screenshots

The four shots under `screenshots/` are real renders of the game's own
code in headless Chromium, driven by `game/src/shots.js`
(`?shot=start|play|upgrade|victory&seed=1`): title, play, the upgrade
draft, and the victory screen.

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with
`vendor/makefun-game.ts` from the kit.
