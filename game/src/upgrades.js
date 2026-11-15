// The between-wave draft: after each cleared wave the player picks one of
// three upgrade cards. Each upgrade stacks up to three times; the pool
// offers only what still has room, and the draft is drawn fresh every wave.
export const UPGRADES = [
  {
    id: 'coils', name: 'Rapid Coils', max: 3,
    blurb: '+22% fire rate',
    apply(player) { player.fireRate *= 1.22; },
  },
  {
    id: 'twin', name: 'Twin Barrels', max: 2,
    blurb: '+1 projectile per shot',
    apply(player) { player.projectiles += 1; },
  },
  {
    id: 'rounds', name: 'Heavy Rounds', max: 3,
    blurb: '+6 bullet damage',
    apply(player) { player.bulletDamage += 6; },
  },
  {
    id: 'plating', name: 'Hull Plating', max: 3,
    blurb: '+25 max hull, repair 25',
    apply(player) {
      player.maxHull += 25;
      player.hull = Math.min(player.maxHull, player.hull + 25);
    },
  },
  {
    id: 'thrusters', name: 'Ion Thrusters', max: 3,
    blurb: '+12% speed and handling',
    apply(player) { player.speed *= 1.12; },
  },
  {
    id: 'magnet', name: 'Magnet Array', max: 3,
    blurb: '+45% shard pickup range',
    apply(player) { player.magnet *= 1.45; },
  },
  {
    id: 'doubler', name: 'Shard Doubler', max: 2,
    blurb: 'Drones drop +1 shard',
    apply(player) { player.shardBonus += 1; },
  },
  {
    id: 'aegis', name: 'Aegis Shield', max: 2,
    blurb: 'Block 4 damage from every hit',
    apply(player) { player.shield += 4; },
  },
];

export function drawDraft(rng, taken) {
  const available = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const pool = available.slice();
  const draft = [];
  while (draft.length < 3 && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    draft.push(pool.splice(index, 1)[0]);
  }
  return draft;
}

export function draftCardRect(index) {
  const width = 250;
  const gap = 24;
  const total = width * 3 + gap * 2;
  const x = (960 - total) / 2 + index * (width + gap);
  return { x, y: 210, width, height: 220 };
}
