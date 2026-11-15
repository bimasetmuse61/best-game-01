// The game itself: its states (title, play, upgrade draft, pause, victory,
// defeat), the wave director, collisions, scoring and the warp gate. The
// renderer only draws this; the input only steers it.
import {
  ARENA, COLORS, ENEMIES, GATE, PICKUP, PLAYER, SHARD, SHARD_QUOTA,
  STEP, VIEW, WAVE_TABLE, WAVES,
} from './config.js';
import { distance, range } from './random.js';
import {
  enemyWantsShot, fireBullets, fireEnemyShot, makeEnemy, makeFloatText,
  makeParticles, makePlayer, makeRepairKit, makeShard, playerWantsFire,
  spawnEdgePosition, stepBullet, stepEnemy, stepFloatText, stepParticle,
  stepPickup, stepPlayer,
} from './entities.js';
import { drawDraft, draftCardRect } from './upgrades.js';

export const BEST_KEY = 'starshard-salvage-best';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private mode or no storage: the best score just does not persist.
  }
}

export function createWorld(rng, audio) {
  const world = {
    rng,
    audio,
    screen: 'title',
    player: makePlayer(VIEW.width / 2, VIEW.height / 2 + 60),
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    texts: [],
    stars: [],
    wave: 0,
    score: 0,
    best: loadBest(),
    shardsBanked: 0,
    quota: 0,
    spawnQueue: [],
    spawnTimer: 0,
    bossTrickleTimer: 0,
    gate: null,
    gateOpen: false,
    draft: [],
    taken: {},
    banner: null,
    bannerTime: 0,
    shake: 0,
    time: 0,
    kills: 0,
    shotsFired: 0,
    elapsed: 0,
    pausedFrom: null,
  };
  // A fixed starfield backdrop, drawn behind everything.
  for (let i = 0; i < 130; i += 1) {
    world.stars.push({
      x: range(rng, 0, VIEW.width), y: range(rng, 0, VIEW.height),
      size: range(rng, 0.6, 2.2), twinkle: range(rng, 0, Math.PI * 2),
    });
  }
  return world;
}

export function setBanner(world, text, sub = '') {
  world.banner = { text, sub };
  world.bannerTime = 2.4;
}

function clearArena(world) {
  world.enemies = [];
  world.bullets = [];
  world.pickups = [];
  world.particles = [];
  world.texts = [];
  world.gate = null;
  world.gateOpen = false;
}

export function startRun(world) {
  world.player = makePlayer(VIEW.width / 2, VIEW.height / 2 + 60);
  world.score = 0;
  world.shardsBanked = 0;
  world.kills = 0;
  world.shotsFired = 0;
  world.elapsed = 0;
  world.taken = {};
  world.draft = [];
  clearArena(world);
  world.wave = 0;
  startWave(world);
  world.screen = 'play';
  world.audio.waveHorn();
}

function startWave(world) {
  world.wave += 1;
  const spec = WAVE_TABLE[world.wave - 1];
  world.quota = SHARD_QUOTA[world.wave - 1];
  world.shardsBanked = 0;
  world.spawnQueue = [];
  for (let i = 0; i < spec.drifters; i += 1) world.spawnQueue.push('drifter');
  for (let i = 0; i < spec.spitters; i += 1) world.spawnQueue.push('spitter');
  for (let i = 0; i < spec.brutes; i += 1) world.spawnQueue.push('brute');
  if (spec.boss) world.spawnQueue.push('maw');
  // Shuffle so the wave never arrives in kind order.
  for (let i = world.spawnQueue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng() * (i + 1));
    [world.spawnQueue[i], world.spawnQueue[j]] = [world.spawnQueue[j], world.spawnQueue[i]];
  }
  world.spawnTimer = 0.4;
  world.bossTrickleTimer = 6;
  world.gate = null;
  world.gateOpen = false;
  setBanner(world, spec.boss ? 'WAVE 10 — THE VOID MAW' : `WAVE ${world.wave}`, spec.boss
    ? 'Destroy the Maw to win the salvage'
    : `Bank ${world.quota} starshards to open the warp gate`);
}

function openGate(world) {
  world.gateOpen = true;
  const margin = 90;
  world.gate = {
    x: range(world.rng, ARENA.x + margin, ARENA.x + ARENA.width - margin),
    y: range(world.rng, ARENA.y + margin, ARENA.y + ARENA.height - margin),
    radius: GATE.radius, pulse: 0,
  };
  setBanner(world, 'WARP GATE OPEN', 'Fly into the gate to leave this wave');
  world.audio.gateOpen();
}

function dropLoot(world, enemy) {
  const shards = enemy.shards + world.player.shardBonus;
  for (let i = 0; i < shards; i += 1) {
    world.pickups.push(makeShard(enemy.x, enemy.y, world.rng));
  }
  if (world.rng() < PICKUP.hullChance) {
    world.pickups.push(makeRepairKit(enemy.x, enemy.y));
  }
}

function damagePlayer(world, amount, x, y) {
  const player = world.player;
  if (!player.alive || player.invulnerable > 0) return;
  const blocked = Math.min(player.shield, amount);
  const dealt = Math.max(1, amount - blocked);
  player.hull -= dealt;
  player.invulnerable = PLAYER.invulnerableSeconds;
  world.shake = Math.min(16, world.shake + 7);
  world.particles.push(...makeParticles(x, y, COLORS.danger, 14, 220, world.rng));
  world.texts.push(makeFloatText(player.x, player.y - 24, `-${dealt}`, COLORS.danger));
  world.audio.hurt();
  if (player.hull <= 0) {
    player.hull = 0;
    player.alive = false;
    world.particles.push(...makeParticles(player.x, player.y, COLORS.player, 60, 340, world.rng));
    world.particles.push(...makeParticles(player.x, player.y, '#ffffff', 30, 200, world.rng));
    world.shake = 22;
    world.audio.explosion(true);
    world.audio.defeat();
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
    world.screen = 'defeat';
  }
}

function killEnemy(world, enemy, index) {
  world.enemies.splice(index, 1);
  const spec = ENEMIES[enemy.kind];
  world.score += spec.score;
  world.kills += 1;
  world.particles.push(...makeParticles(enemy.x, enemy.y, spec.glow, enemy.kind === 'maw' ? 70 : 22, enemy.kind === 'maw' ? 380 : 240, world.rng));
  world.texts.push(makeFloatText(enemy.x, enemy.y - enemy.radius, `+${spec.score}`, '#eaf2ff'));
  dropLoot(world, enemy);
  world.audio.explosion(enemy.kind === 'brute' || enemy.kind === 'maw');
  world.shake = Math.min(18, world.shake + (enemy.kind === 'maw' ? 14 : 3));
  if (enemy.kind === 'maw') {
    // The Maw is the whole game: killing it wins the run on the spot.
    world.score += 500;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
    world.audio.victory();
    world.screen = 'victory';
  }
}

function stepPlay(world, dt, input) {
  const player = world.player;
  world.elapsed += dt;
  if (player.alive) {
    stepPlayer(player, input, dt);
    if (playerWantsFire(player, input)) {
      fireBullets(player, world.bullets);
      world.shotsFired += 1;
      world.audio.shoot();
    }
  }

  // The director feeds the wave in from the arena edges.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      const pos = kind === 'maw'
        ? { x: VIEW.width / 2, y: ARENA.y + 70 }
        : spawnEdgePosition(world.rng);
      world.enemies.push(makeEnemy(kind, pos.x, pos.y, world.rng));
      world.spawnTimer = kind === 'maw' ? 1 : 0.65;
    }
  } else if (WAVE_TABLE[world.wave - 1].boss) {
    // Boss wave: a slow trickle of drifters keeps shards in play.
    world.bossTrickleTimer -= dt;
    if (world.bossTrickleTimer <= 0 && world.enemies.filter((e) => e.kind === 'drifter').length < 3) {
      const pos = spawnEdgePosition(world.rng);
      world.enemies.push(makeEnemy('drifter', pos.x, pos.y, world.rng));
      world.bossTrickleTimer = 6;
    }
  }

  for (const enemy of world.enemies) {
    stepEnemy(enemy, player, dt, world.rng);
    if (enemyWantsShot(enemy) && player.alive) {
      fireEnemyShot(enemy, player, world.bullets, world.rng);
      world.audio.enemyShoot();
    }
  }

  // Bullets move and hit.
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = world.bullets[i];
    stepBullet(bullet, dt);
    const out = bullet.x < ARENA.x - 40 || bullet.x > ARENA.x + ARENA.width + 40
      || bullet.y < ARENA.y - 40 || bullet.y > ARENA.y + ARENA.height + 40;
    if (bullet.life <= 0 || out) {
      world.bullets.splice(i, 1);
      continue;
    }
    if (bullet.kind === 'player') {
      for (let j = world.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = world.enemies[j];
        if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < bullet.radius + enemy.radius) {
          enemy.hull -= bullet.damage;
          enemy.flash = 1;
          world.particles.push(...makeParticles(bullet.x, bullet.y, '#ffe66d', 4, 120, world.rng));
          world.audio.hit();
          world.bullets.splice(i, 1);
          if (enemy.hull <= 0) killEnemy(world, enemy, j);
          break;
        }
      }
    } else if (player.alive && distance(bullet.x, bullet.y, player.x, player.y) < bullet.radius + player.radius - 2) {
      damagePlayer(world, bullet.damage, bullet.x, bullet.y);
      world.bullets.splice(i, 1);
    }
    if (world.screen !== 'play') return;
  }

  // Drones that ram the skiff.
  if (player.alive) {
    for (let j = world.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = world.enemies[j];
      if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius - 2) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        player.vx += Math.cos(angle) * 320;
        player.vy += Math.sin(angle) * 320;
        damagePlayer(world, enemy.damage, enemy.x, enemy.y);
        // The drone is knocked back too, so one ram cannot chain-hit.
        enemy.x -= Math.cos(angle) * 26;
        enemy.y -= Math.sin(angle) * 26;
        if (world.screen !== 'play') return;
      }
    }
  }

  // Pickups drift, magnetise and get banked.
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const item = world.pickups[i];
    stepPickup(item, player, dt);
    const d = distance(item.x, item.y, player.x, player.y);
    if (player.alive && d < item.radius + player.radius) {
      if (item.kind === 'shard') {
        world.shardsBanked += item.value;
        world.score += SHARD.score;
        world.audio.shard();
        world.texts.push(makeFloatText(item.x, item.y - 12, `+${SHARD.score}`, '#ffd166'));
        if (!world.gateOpen && world.shardsBanked >= world.quota) openGate(world);
      } else {
        player.hull = Math.min(player.maxHull, player.hull + PICKUP.heal);
        world.audio.heal();
        world.texts.push(makeFloatText(item.x, item.y - 12, `+${PICKUP.heal} HULL`, '#7CFFB2'));
      }
      world.pickups.splice(i, 1);
    } else if (item.age > 25) {
      world.pickups.splice(i, 1);
    }
  }

  // The open gate is the way out of the wave.
  if (world.gateOpen && world.gate && player.alive) {
    world.gate.pulse += dt;
    if (distance(player.x, player.y, world.gate.x, world.gate.y) < world.gate.radius) {
      world.score += 100 * world.wave;
      if (world.wave >= WAVES) {
        world.audio.victory();
        world.screen = 'victory';
        return;
      }
      world.draft = drawDraft(world.rng, world.taken);
      world.screen = 'upgrade';
      world.audio.upgrade();
    }
  }

  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    stepParticle(world.particles[i], dt);
    if (world.particles[i].life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.texts.length - 1; i >= 0; i -= 1) {
    stepFloatText(world.texts[i], dt);
    if (world.texts[i].life <= 0) world.texts.splice(i, 1);
  }
  world.shake = Math.max(0, world.shake - dt * 26);
  world.bannerTime = Math.max(0, world.bannerTime - dt);
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
}

export function chooseUpgrade(world, index) {
  const upgrade = world.draft[index];
  if (!upgrade) return;
  upgrade.apply(world.player);
  world.taken[upgrade.id] = (world.taken[upgrade.id] ?? 0) + 1;
  world.draft = [];
  clearArena(world);
  world.player.x = VIEW.width / 2;
  world.player.y = VIEW.height / 2 + 60;
  world.player.vx = 0;
  world.player.vy = 0;
  startWave(world);
  world.screen = 'play';
  world.audio.waveHorn();
}

export function updateWorld(world, dt, input) {
  world.time += dt;
  if (input.wasPressed('m') || input.wasPressed('M')) {
    world.audio.toggleMute();
  }
  if (world.screen === 'title') {
    if (input.consumeAnyKey() || input.consumeClick()) {
      world.audio.unlock();
      world.audio.click();
      startRun(world);
    }
    return;
  }
  if (world.screen === 'play') {
    if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) {
      world.screen = 'paused';
      world.audio.click();
      return;
    }
    stepPlay(world, STEP, input);
    return;
  }
  if (world.screen === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape') || input.consumeClick()) {
      world.screen = 'play';
      world.audio.click();
    }
    return;
  }
  if (world.screen === 'upgrade') {
    const click = input.consumeClick();
    if (click) {
      for (let i = 0; i < world.draft.length; i += 1) {
        const r = draftCardRect(i);
        if (click.x >= r.x && click.x <= r.x + r.width && click.y >= r.y && click.y <= r.y + r.height) {
          chooseUpgrade(world, i);
          return;
        }
      }
    }
    if (input.wasPressed('1')) { chooseUpgrade(world, 0); return; }
    if (input.wasPressed('2')) { chooseUpgrade(world, 1); return; }
    if (input.wasPressed('3')) { chooseUpgrade(world, 2); return; }
    return;
  }
  if (world.screen === 'victory' || world.screen === 'defeat') {
    if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.consumeClick()) {
      world.audio.click();
      startRun(world);
    }
  }
}

// The upgrade-card rectangles, shared with the renderer so clicks and
// drawing can never drift apart.
export { draftCardRect };
