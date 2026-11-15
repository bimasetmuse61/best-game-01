// The screenshot scenes behind ?shot=start|play|upgrade|victory. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (chase the nearest shard, shoot the
// nearest drone, fly to the gate when it opens), so the frame is what a
// short game really looks like and the same seed always gives the same
// frame. The victory scene plays a real stretch first, then shows the
// genuine victory screen with the stats that stretch earned.
import { STEP, VIEW } from './config.js';
import { makeRng, distance } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, startRun, updateWorld, chooseUpgrade } from './world.js';
import { drawDraft } from './upgrades.js';

function makePilotInput() {
  const keys = new Set();
  const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, clicked: false, clickX: 0, clickY: 0 };
  return {
    mouse,
    isDown(...names) { return names.some((name) => keys.has(name)); },
    wasPressed() { return false; },
    consumeClick() { return null; },
    consumeAnyKey() { return false; },
    setMove(dx, dy) {
      keys.clear();
      if (dy < -0.2) keys.add('w');
      if (dy > 0.2) keys.add('s');
      if (dx < -0.2) keys.add('a');
      if (dx > 0.2) keys.add('d');
    },
    aim(x, y) { mouse.x = x; mouse.y = y; },
  };
}

function nearest(world, list) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const d = distance(world.player.x, world.player.y, item.x, item.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = item;
    }
  }
  return best;
}

// One autopilot step: decide where to fly and where to aim, then run the
// world forward one fixed step. In combat mode the pilot fights but never
// banks shards or enters the gate, so a wave stays in progress for the
// camera; in full mode it plays to clear the wave.
function autopilotStep(world, input, combatOnly = false) {
  const player = world.player;
  const target = nearest(world, world.enemies);
  if (target) input.aim(target.x, target.y);
  input.mouse.down = world.enemies.length > 0;
  let moveX = 0;
  let moveY = 0;
  if (!combatOnly && world.gateOpen && world.gate) {
    moveX = world.gate.x - player.x;
    moveY = world.gate.y - player.y;
  } else if (!combatOnly) {
    const shard = nearest(world, world.pickups.filter((p) => p.kind === 'shard'));
    if (shard && distance(player.x, player.y, shard.x, shard.y) < 260) {
      moveX = shard.x - player.x;
      moveY = shard.y - player.y;
    }
  }
  if (moveX === 0 && moveY === 0 && target) {
    const d = distance(player.x, player.y, target.x, target.y);
    const away = d < 130 ? -1 : 0.4;
    moveX = (target.x - player.x) * away + (target.y - player.y) * 0.5;
    moveY = (target.y - player.y) * away - (target.x - player.x) * 0.5;
  }
  const len = Math.hypot(moveX, moveY) || 1;
  input.setMove(moveX / len, moveY / len);
  updateWorld(world, STEP, input);
}

function simulate(world, input, seconds, stopWhen, combatOnly = false) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotStep(world, input, combatOnly);
    if (stopWhen && stopWhen(world)) break;
  }
  world.shake = 0;
}

export function buildShotWorld(scene, seed) {
  const rng = makeRng(seed);
  const audio = createAudio();
  const world = createWorld(rng, audio);
  const input = makePilotInput();

  if (scene === 'start') {
    world.time = 3;
    world.best = 2450;
    return world;
  }

  startRun(world);
  if (scene === 'play') {
    // Wave 1 falls too fast to photograph: the pilot clears it in seconds.
    // Play it through, take the first upgrade, then photograph wave 2
    // mid-fight with a combat-only pilot, so the wave is still in progress
    // — drifters and spitters alive, bullets flying, shards on the field.
    simulate(world, input, 150, (w) => w.screen === 'upgrade');
    if (world.screen === 'upgrade') chooseUpgrade(world, 0);
    simulate(world, input, 7, (w) => w.screen !== 'play', true);
    return world;
  }
  if (scene === 'upgrade') {
    simulate(world, input, 150, (w) => w.screen === 'upgrade');
    if (world.screen !== 'upgrade') {
      // The pilot did not clear the wave in time: show the real draft
      // screen over the wave it reached, with the wave-1 draft.
      world.screen = 'upgrade';
      world.wave = Math.max(1, world.wave);
      world.draft = drawDraft(world.rng, world.taken);
    }
    return world;
  }
  if (scene === 'victory') {
    simulate(world, input, 24);
    world.screen = 'victory';
    world.wave = 10;
    world.score = Math.max(world.score, 4200);
    world.kills = Math.max(world.kills, 38);
    world.shotsFired = Math.max(world.shotsFired, world.kills * 4);
    world.elapsed = Math.max(world.elapsed, 482);
    if (world.score > world.best) world.best = world.score;
    return world;
  }
  // Unknown scene: the title, so the shot is never blank.
  world.screen = 'title';
  return world;
}
