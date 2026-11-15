// The things that live in the arena: the player's skiff, the void drones,
// bullets on both sides, starshards, repair kits and particles. Factories
// make them; step functions move them; the world decides what they hit.
import { ARENA, ENEMIES, PLAYER, SHARD } from './config.js';
import { angleTo, clamp, distance, range } from './random.js';

export function makePlayer(x, y) {
  return {
    kind: 'player', x, y, vx: 0, vy: 0, angle: -Math.PI / 2,
    radius: PLAYER.radius, hull: PLAYER.hull, maxHull: PLAYER.hull,
    fireCooldown: 0, invulnerable: 0, alive: true,
    // Upgrade levels, read by the world and the renderer.
    fireRate: 1, projectiles: 1, bulletDamage: 0, speed: 1,
    magnet: 1, shardBonus: 0, shield: 0,
  };
}

export function makeEnemy(kind, x, y, rng) {
  const spec = ENEMIES[kind];
  return {
    kind, x, y, vx: 0, vy: 0,
    angle: rng() * Math.PI * 2,
    radius: spec.radius, hull: spec.hull, maxHull: spec.hull,
    speed: spec.speed * range(rng, 0.9, 1.15),
    damage: spec.damage, score: spec.score, shards: spec.shards,
    shotCooldown: range(rng, 1, spec.shotInterval ?? 2),
    flash: 0, wobble: rng() * Math.PI * 2, spawnAge: 0,
  };
}

export function spawnEdgePosition(rng) {
  const side = Math.floor(rng() * 4);
  const margin = 30;
  if (side === 0) return { x: range(rng, ARENA.x, ARENA.x + ARENA.width), y: ARENA.y - margin };
  if (side === 1) return { x: range(rng, ARENA.x, ARENA.x + ARENA.width), y: ARENA.y + ARENA.height + margin };
  if (side === 2) return { x: ARENA.x - margin, y: range(rng, ARENA.y, ARENA.y + ARENA.height) };
  return { x: ARENA.x + ARENA.width + margin, y: range(rng, ARENA.y, ARENA.y + ARENA.height) };
}

export function stepPlayer(player, input, dt) {
  let ax = 0;
  let ay = 0;
  if (input.isDown('w', 'ArrowUp')) ay -= 1;
  if (input.isDown('s', 'ArrowDown')) ay += 1;
  if (input.isDown('a', 'ArrowLeft')) ax -= 1;
  if (input.isDown('d', 'ArrowRight')) ax += 1;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    ax /= len;
    ay /= len;
  }
  const accel = PLAYER.accel * player.speed;
  player.vx += ax * accel * dt;
  player.vy += ay * accel * dt;
  const drag = Math.exp(-PLAYER.drag * dt);
  player.vx *= drag;
  player.vy *= drag;
  const speed = Math.hypot(player.vx, player.vy);
  const max = PLAYER.maxSpeed * player.speed;
  if (speed > max) {
    player.vx = (player.vx / speed) * max;
    player.vy = (player.vy / speed) * max;
  }
  player.x = clamp(player.x + player.vx * dt, ARENA.x + player.radius, ARENA.x + ARENA.width - player.radius);
  player.y = clamp(player.y + player.vy * dt, ARENA.y + player.radius, ARENA.y + ARENA.height - player.radius);
  player.angle = angleTo(player.x, player.y, input.mouse.x, input.mouse.y);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
}

export function playerWantsFire(player, input) {
  return player.fireCooldown <= 0 && (input.mouse.down || input.isDown(' '));
}

export function fireBullets(player, bullets) {
  const spread = 0.14;
  const count = player.projectiles;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const angle = player.angle + offset;
    bullets.push({
      kind: 'player', x: player.x + Math.cos(angle) * (player.radius + 6),
      y: player.y + Math.sin(angle) * (player.radius + 6),
      vx: Math.cos(angle) * PLAYER.bulletSpeed, vy: Math.sin(angle) * PLAYER.bulletSpeed,
      radius: PLAYER.bulletRadius, damage: PLAYER.bulletDamage + player.bulletDamage,
      life: 1.1,
    });
  }
  player.fireCooldown = PLAYER.fireInterval / player.fireRate;
}

export function stepEnemy(enemy, player, dt, rng) {
  enemy.spawnAge += dt;
  enemy.flash = Math.max(0, enemy.flash - dt * 6);
  enemy.wobble += dt * 3;
  if (enemy.kind === 'drifter') {
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    const wob = Math.sin(enemy.wobble) * 0.5;
    enemy.vx = Math.cos(angle + wob) * enemy.speed;
    enemy.vy = Math.sin(angle + wob) * enemy.speed;
  } else if (enemy.kind === 'spitter') {
    const d = distance(enemy.x, enemy.y, player.x, player.y);
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    // Keep a shooting distance: close in when far, back off when near.
    const toward = d > 260 ? 1 : d < 170 ? -0.7 : 0;
    const strafe = Math.sin(enemy.wobble * 0.6) * 0.6;
    enemy.vx = Math.cos(angle) * enemy.speed * toward - Math.sin(angle) * enemy.speed * strafe;
    enemy.vy = Math.sin(angle) * enemy.speed * toward + Math.cos(angle) * enemy.speed * strafe;
    enemy.shotCooldown -= dt;
  } else if (enemy.kind === 'brute') {
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.vx = Math.cos(angle) * enemy.speed;
    enemy.vy = Math.sin(angle) * enemy.speed;
  } else if (enemy.kind === 'maw') {
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.vx = Math.cos(angle) * enemy.speed;
    enemy.vy = Math.sin(angle) * enemy.speed;
    enemy.shotCooldown -= dt;
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  // Drones drift back in if they wander out of the arena.
  enemy.x = clamp(enemy.x, ARENA.x - 60, ARENA.x + ARENA.width + 60);
  enemy.y = clamp(enemy.y, ARENA.y - 60, ARENA.y + ARENA.height + 60);
}

export function enemyWantsShot(enemy) {
  return (enemy.kind === 'spitter' || enemy.kind === 'maw') && enemy.shotCooldown <= 0;
}

export function fireEnemyShot(enemy, player, bullets, rng) {
  const spec = ENEMIES[enemy.kind];
  const count = enemy.kind === 'maw' ? 5 : 1;
  for (let i = 0; i < count; i += 1) {
    const base = angleTo(enemy.x, enemy.y, player.x, player.y);
    const angle = count === 1 ? base : base + (i - 2) * 0.22;
    bullets.push({
      kind: 'enemy', x: enemy.x + Math.cos(angle) * (enemy.radius + 4),
      y: enemy.y + Math.sin(angle) * (enemy.radius + 4),
      vx: Math.cos(angle) * spec.shotSpeed, vy: Math.sin(angle) * spec.shotSpeed,
      radius: 6, damage: enemy.damage, life: 4,
    });
  }
  enemy.shotCooldown = spec.shotInterval * range(rng, 0.85, 1.2);
}

export function stepBullet(bullet, dt) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.life -= dt;
}

export function makeShard(x, y, rng) {
  const angle = rng() * Math.PI * 2;
  const speed = range(rng, 40, 130);
  return {
    kind: 'shard', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius: SHARD.radius, age: 0, value: SHARD.value,
  };
}

export function makeRepairKit(x, y) {
  return { kind: 'repair', x, y, vx: 0, vy: 0, radius: 11, age: 0 };
}

export function stepPickup(item, player, dt) {
  item.age += dt;
  const d = distance(item.x, item.y, player.x, player.y);
  const pull = PLAYER.pickupRadius * player.magnet;
  if (d < pull && d > 1) {
    const strength = (1 - d / pull) * SHARD.magnetSpeed * 2.2;
    item.vx += ((player.x - item.x) / d) * strength * dt * 4;
    item.vy += ((player.y - item.y) / d) * strength * dt * 4;
  } else {
    item.vx *= Math.exp(-2 * dt);
    item.vy *= Math.exp(-2 * dt);
  }
  item.x += item.vx * dt;
  item.y += item.vy * dt;
}

export function makeParticles(x, y, color, count, speed, rng) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const v = range(rng, speed * 0.3, speed);
    out.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
      life: range(rng, 0.3, 0.8), maxLife: 0.8, size: range(rng, 2, 5), color,
    });
  }
  return out;
}

export function stepParticle(particle, dt) {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vx *= Math.exp(-2.5 * dt);
  particle.vy *= Math.exp(-2.5 * dt);
  particle.life -= dt;
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9 };
}

export function stepFloatText(item, dt) {
  item.y -= 34 * dt;
  item.life -= dt;
}
