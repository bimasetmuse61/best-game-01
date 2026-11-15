// Starshard Salvage — tuning constants. One place for every number the
// designers (us) tweak: arena size, ship handling, enemy stats per kind,
// wave composition, shard economy and the boss. Nothing here is read at
// runtime from anywhere else, so a balance pass touches only this file.
export const VIEW = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const ARENA = { x: 24, y: 24, width: 912, height: 552 };

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 300,
  drag: 3.2,
  hull: 100,
  fireInterval: 0.22,
  bulletSpeed: 560,
  bulletDamage: 12,
  bulletRadius: 4,
  pickupRadius: 90,
  invulnerableSeconds: 1.2,
};

export const ENEMIES = {
  drifter: { radius: 15, speed: 95, hull: 22, damage: 10, score: 50, shards: 1, color: '#ff5d73', glow: '#ff8ba0' },
  spitter: { radius: 14, speed: 62, hull: 16, damage: 8, score: 80, shards: 2, color: '#c77dff', glow: '#e0aaff', shotInterval: 2.4, shotSpeed: 190 },
  brute: { radius: 24, speed: 46, hull: 70, damage: 18, score: 150, shards: 3, color: '#ff9f43', glow: '#ffc46b' },
  maw: { radius: 46, speed: 38, hull: 900, damage: 24, score: 2000, shards: 12, color: '#7b2fbe', glow: '#b388ff', shotInterval: 1.6, shotSpeed: 220 },
};

export const WAVES = 10;
// How many drones each wave fields, and the mix. Wave 10 is the boss alone
// plus a trickle of drifters so the player never runs dry of shards.
export const WAVE_TABLE = [
  { drifters: 6, spitters: 0, brutes: 0 },
  { drifters: 8, spitters: 2, brutes: 0 },
  { drifters: 9, spitters: 3, brutes: 1 },
  { drifters: 10, spitters: 4, brutes: 2 },
  { drifters: 11, spitters: 5, brutes: 2 },
  { drifters: 12, spitters: 6, brutes: 3 },
  { drifters: 13, spitters: 7, brutes: 3 },
  { drifters: 14, spitters: 8, brutes: 4 },
  { drifters: 15, spitters: 9, brutes: 5 },
  { drifters: 0, spitters: 0, brutes: 0, boss: true },
];
// Shards the player must bank to open the warp gate out of the wave.
export const SHARD_QUOTA = [6, 8, 10, 12, 14, 16, 18, 20, 22, 12];

export const SHARD = { radius: 8, magnetSpeed: 340, value: 1, score: 25 };
export const GATE = { radius: 34 };
export const PICKUP = { heal: 20, hullChance: 0.08 };

export const COLORS = {
  background: '#070b1d',
  nebulaA: '#1b2a5e',
  nebulaB: '#3d1e63',
  nebulaC: '#0e3a4d',
  grid: 'rgba(120, 160, 255, 0.07)',
  arenaEdge: '#2e4a8f',
  player: '#5df2ff',
  playerGlow: '#b8fbff',
  bullet: '#ffe66d',
  enemyBullet: '#ff7ad9',
  shard: '#ffd166',
  gate: '#7CFFB2',
  text: '#eaf2ff',
  dimText: '#9fb3d9',
  danger: '#ff5d73',
};
