// Everything the player sees: the nebula backdrop, the arena, every
// entity, the HUD, the wave banners and the five screens (title, upgrade
// draft, pause, victory, defeat). The world owns the state; this file only
// turns it into pixels, so the same world can be drawn for a screenshot
// scene without any input at all.
import { ARENA, COLORS, ENEMIES, VIEW } from './config.js';
import { draftCardRect } from './upgrades.js';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
  gradient.addColorStop(0, COLORS.background);
  gradient.addColorStop(0.55, '#0b1030');
  gradient.addColorStop(1, '#12082b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Slow nebula clouds, fixed in place so the backdrop never distracts.
  const clouds = [
    { x: 180, y: 130, r: 190, color: COLORS.nebulaA },
    { x: 780, y: 420, r: 210, color: COLORS.nebulaB },
    { x: 720, y: 110, r: 150, color: COLORS.nebulaC },
    { x: 200, y: 480, r: 160, color: COLORS.nebulaC },
  ];
  for (const cloud of clouds) {
    const glow = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
    glow.addColorStop(0, cloud.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = glow;
    ctx.fillRect(cloud.x - cloud.r, cloud.y - cloud.r, cloud.r * 2, cloud.r * 2);
  }
  ctx.globalAlpha = 1;

  for (const star of world.stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(world.time * 2 + star.twinkle);
    ctx.globalAlpha = 0.35 + 0.55 * twinkle;
    ctx.fillStyle = '#dfe9ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // Faint grid inside the arena so motion reads at a glance.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ARENA.x; x <= ARENA.x + ARENA.width; x += 48) {
    ctx.moveTo(x, ARENA.y);
    ctx.lineTo(x, ARENA.y + ARENA.height);
  }
  for (let y = ARENA.y; y <= ARENA.y + ARENA.height; y += 48) {
    ctx.moveTo(ARENA.x, y);
    ctx.lineTo(ARENA.x + ARENA.width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = COLORS.arenaEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
}

function drawGate(ctx, world) {
  const gate = world.gate;
  if (!gate) return;
  const pulse = 1 + 0.12 * Math.sin(gate.pulse * 5);
  const glow = ctx.createRadialGradient(gate.x, gate.y, 0, gate.x, gate.y, gate.radius * 2);
  glow.addColorStop(0, 'rgba(124,255,178,0.55)');
  glow.addColorStop(1, 'rgba(124,255,178,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, gate.radius * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.gate;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, gate.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.rotate(gate.pulse * 1.5);
  ctx.strokeStyle = 'rgba(124,255,178,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.moveTo(gate.radius * 0.55, 0);
    ctx.lineTo(gate.radius * 0.85, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = COLORS.gate;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARP GATE', gate.x, gate.y + gate.radius + 20);
}

function drawShard(ctx, item) {
  const bob = Math.sin(item.age * 4) * 2;
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  ctx.rotate(item.age * 1.5);
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffb703';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 9);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawRepairKit(ctx, item) {
  const bob = Math.sin(item.age * 4) * 2;
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  ctx.fillStyle = '#123f2a';
  ctx.strokeStyle = '#7CFFB2';
  ctx.lineWidth = 2;
  roundRect(ctx, -11, -11, 22, 22, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7CFFB2';
  ctx.fillRect(-2, -7, 4, 14);
  ctx.fillRect(-7, -2, 14, 4);
  ctx.restore();
}

function drawPlayer(ctx, player, world) {
  if (!player.alive) return;
  const blink = player.invulnerable > 0 && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (blink) ctx.globalAlpha = 0.35;
  // Engine flame, longer the faster the skiff moves.
  const speed = Math.hypot(player.vx, player.vy);
  const flame = 8 + (speed / 300) * 16;
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(-12, -5);
  ctx.lineTo(-12 - flame, 0);
  ctx.lineTo(-12, 5);
  ctx.closePath();
  ctx.fill();
  // Hull: a swept dart in cyan with a bright cockpit.
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 14;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shield ring from the Aegis upgrade.
  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDrifter(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.wobble);
  const spec = ENEMIES.drifter;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : spec.color;
  ctx.shadowColor = spec.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? spec.radius : spec.radius * 0.55;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2b0a12';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpitter(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.sin(enemy.wobble * 0.5) * 0.4);
  const spec = ENEMIES.spitter;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : spec.color;
  ctx.shadowColor = spec.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -spec.radius);
  ctx.lineTo(spec.radius, 0);
  ctx.lineTo(0, spec.radius);
  ctx.lineTo(-spec.radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1d0b2e';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7ad9';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrute(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.wobble * 0.3);
  const spec = ENEMIES.brute;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : spec.color;
  ctx.shadowColor = spec.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * spec.radius;
    const y = Math.sin(angle) * spec.radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, spec.radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3d1e00';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMaw(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const spec = ENEMIES.maw;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : spec.color;
  ctx.shadowColor = spec.glow;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(0, 0, spec.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Rotating teeth around the rim.
  ctx.fillStyle = '#2a0a4a';
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2 + enemy.wobble * 0.4;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(spec.radius - 4, -7);
    ctx.lineTo(spec.radius - 18, 0);
    ctx.lineTo(spec.radius - 4, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // The eye: it watches the player.
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0510';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Hull bar over the boss.
  const width = 120;
  const ratio = Math.max(0, enemy.hull / enemy.maxHull);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, enemy.x - width / 2, enemy.y - enemy.radius - 22, width, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#b388ff';
  roundRect(ctx, enemy.x - width / 2, enemy.y - enemy.radius - 22, width * ratio, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VOID MAW', enemy.x, enemy.y - enemy.radius - 28);
}

function drawEnemy(ctx, enemy) {
  if (enemy.kind === 'drifter') drawDrifter(ctx, enemy);
  else if (enemy.kind === 'spitter') drawSpitter(ctx, enemy);
  else if (enemy.kind === 'brute') drawBrute(ctx, enemy);
  else if (enemy.kind === 'maw') drawMaw(ctx, enemy);
  // Small hull bar for hurt non-boss drones.
  if (enemy.kind !== 'maw' && enemy.hull < enemy.maxHull) {
    const width = enemy.radius * 2;
    const ratio = Math.max(0, enemy.hull / enemy.maxHull);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width, 4);
    ctx.fillStyle = '#ff5d73';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width * ratio, 4);
  }
}

function drawHud(ctx, world) {
  const player = world.player;
  ctx.textBaseline = 'alphabetic';
  // Hull bar, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 12, 12, 220, 20, 6);
  ctx.fill();
  const hullRatio = Math.max(0, player.hull / player.maxHull);
  ctx.fillStyle = hullRatio > 0.5 ? '#7CFFB2' : hullRatio > 0.25 ? '#ffd166' : '#ff5d73';
  if (hullRatio > 0) {
    roundRect(ctx, 12, 12, 220 * hullRatio, 20, 6);
    ctx.fill();
  }
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HULL ${Math.ceil(player.hull)} / ${player.maxHull}`, 20, 27);
  // Score and best, top centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${world.score}`, VIEW.width / 2, 30);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(`BEST ${world.best}`, VIEW.width / 2, 47);
  // Wave and shard quota, top right.
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${world.wave} / 10`, VIEW.width - 14, 27);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = world.gateOpen ? COLORS.gate : '#ffd166';
  ctx.fillText(`◆ ${world.shardsBanked} / ${world.quota} shards`, VIEW.width - 14, 46);

  // Wave banner, centre screen, fading. Only during play: on the upgrade,
  // victory and defeat screens the overlay carries its own headings and a
  // banner behind it would collide with them.
  if (world.screen === 'play' && world.banner && world.bannerTime > 0) {
    ctx.globalAlpha = Math.min(1, world.bannerTime);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eaf2ff';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.shadowColor = '#5df2ff';
    ctx.shadowBlur = 18;
    ctx.fillText(world.banner.text, VIEW.width / 2, 150);
    ctx.shadowBlur = 0;
    if (world.banner.sub) {
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = COLORS.dimText;
      ctx.fillText(world.banner.sub, VIEW.width / 2, 176);
    }
    ctx.globalAlpha = 1;
  }

  // Low-hull warning.
  if (player.alive && player.hull > 0 && player.hull <= 25) {
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(world.time * 8);
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ HULL CRITICAL — FIND A REPAIR KIT ⚠', VIEW.width / 2, VIEW.height - 16);
    ctx.globalAlpha = 1;
  }
  // Mute hint, bottom right.
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('M mute · P pause', VIEW.width - 12, VIEW.height - 8);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(4, 7, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, world) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  // A hero skiff and drifting shards above the title.
  ctx.save();
  ctx.translate(VIEW.width / 2, 118);
  ctx.rotate(-0.5);
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-16, -16);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 5; i += 1) {
    const x = VIEW.width / 2 - 180 + i * 90;
    const y = 118 + Math.sin(world.time * 2 + i * 1.3) * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(world.time + i);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.shadowColor = '#5df2ff';
  ctx.shadowBlur = 24;
  ctx.fillText('STARSHARD SALVAGE', VIEW.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Ten waves. One skiff. Every shard counts.', VIEW.width / 2, 242);
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '16px system-ui, sans-serif';
  const lines = [
    'WASD / arrows — fly      Mouse — aim      Hold click / Space — fire',
    'Destroy void drones, bank starshards, fly through the warp gate.',
    'Between waves, draft one upgrade. Wave 10: destroy the Void Maw to win.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 288 + i * 26));
  if (world.best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`BEST SCORE: ${world.best}`, VIEW.width / 2, 386);
  }
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.fillText('CLICK OR PRESS ANY KEY TO LAUNCH', VIEW.width / 2, 440);
  ctx.globalAlpha = 1;
}

function drawUpgrade(ctx, world) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEARED`, VIEW.width / 2, 110);
  ctx.fillStyle = '#ffd166';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Score ${world.score}  ·  Hull ${Math.ceil(world.player.hull)} / ${world.player.maxHull}`, VIEW.width / 2, 140);
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('CHOOSE ONE UPGRADE', VIEW.width / 2, 180);
  world.draft.forEach((upgrade, index) => {
    const rect = draftCardRect(index);
    const level = world.taken[upgrade.id] ?? 0;
    ctx.fillStyle = 'rgba(20, 32, 66, 0.95)';
    ctx.strokeStyle = '#2e4a8f';
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`PRESS ${index + 1}`, rect.x + rect.width / 2, rect.y + 30);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(upgrade.name, rect.x + rect.width / 2, rect.y + 66);
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(upgrade.blurb, rect.x + rect.width / 2, rect.y + 100);
    // Level pips: filled for levels taken, outline for what remains.
    for (let i = 0; i < upgrade.max; i += 1) {
      const px = rect.x + rect.width / 2 + (i - (upgrade.max - 1) / 2) * 26;
      ctx.beginPath();
      ctx.arc(px, rect.y + 140, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < level ? '#ffd166' : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(level >= upgrade.max ? 'MAXED' : `Level ${level + 1} of ${upgrade.max}`, rect.x + rect.width / 2, rect.y + 176);
  });
}

function drawPaused(ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press P or click to resume', VIEW.width / 2, VIEW.height / 2 + 26);
}

function drawStats(ctx, world, y) {
  const minutes = Math.floor(world.elapsed / 60);
  const seconds = Math.floor(world.elapsed % 60).toString().padStart(2, '0');
  const rows = [
    ['FINAL SCORE', `${world.score}`],
    ['BEST SCORE', `${world.best}`],
    ['WAVE REACHED', `${world.wave} / 10`],
    ['DRONES DESTROYED', `${world.kills}`],
    ['SHOTS FIRED', `${world.shotsFired}`],
    ['TIME', `${minutes}:${seconds}`],
  ];
  ctx.font = '17px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 30;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(label, VIEW.width / 2 - 12, rowY);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eaf2ff';
    ctx.fillText(value, VIEW.width / 2 + 12, rowY);
  });
  return y + rows.length * 30;
}

function drawVictory(ctx, world) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7CFFB2';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.shadowColor = '#7CFFB2';
  ctx.shadowBlur = 22;
  ctx.fillText('SALVAGE COMPLETE!', VIEW.width / 2, 120);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaf2ff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('The Void Maw is scrap. Every shard is yours, Keeper.', VIEW.width / 2, 152);
  const endY = drawStats(ctx, world, 200);
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, endY + 30);
  ctx.globalAlpha = 1;
}

function drawDefeat(ctx, world) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.danger;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.shadowColor = COLORS.danger;
  ctx.shadowBlur = 22;
  ctx.fillText('SKIFF LOST', VIEW.width / 2, 120);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaf2ff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('The void keeps your shards this time, Keeper.', VIEW.width / 2, 152);
  const endY = drawStats(ctx, world, 200);
  ctx.fillStyle = '#eaf2ff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', VIEW.width / 2, endY + 30);
  ctx.globalAlpha = 1;
}

export function renderWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  if (world.gateOpen) drawGate(ctx, world);
  for (const item of world.pickups) {
    if (item.kind === 'shard') drawShard(ctx, item);
    else drawRepairKit(ctx, item);
  }
  for (const enemy of world.enemies) drawEnemy(ctx, enemy);
  drawPlayer(ctx, world.player, world);
  for (const bullet of world.bullets) {
    ctx.fillStyle = bullet.kind === 'player' ? '#ffe66d' : '#ff7ad9';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const text of world.texts) {
    ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
    ctx.fillStyle = text.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (world.screen === 'play' || world.screen === 'paused' || world.screen === 'upgrade') {
    drawHud(ctx, world);
  }
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'upgrade') drawUpgrade(ctx, world);
  else if (world.screen === 'paused') drawPaused(ctx);
  else if (world.screen === 'victory') drawVictory(ctx, world);
  else if (world.screen === 'defeat') drawDefeat(ctx, world);
}
