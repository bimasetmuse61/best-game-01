// Bootstrap: wire the canvas, the input and the audio together, then run
// the fixed-step loop. In screenshot mode (?shot=<scene>&seed=<n>) it
// renders one deterministic scene instead and signals readiness, so an
// automated browser can capture exactly that frame.
import { STEP, VIEW } from './config.js';
import { makeRng } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createWorld, updateWorld } from './world.js';
import { renderWorld } from './render.js';
import { buildShotWorld } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const shotSeed = Number(params.get('seed') ?? '1') || 1;

if (shotScene) {
  const world = buildShotWorld(shotScene, shotSeed);
  renderWorld(ctx, world);
  window.__shotReady = true;
} else {
  const audio = createAudio();
  const input = createInput(canvas);
  const world = createWorld(makeRng((Math.random() * 0xffffffff) >>> 0), audio);
  let lastScreen = world.screen;
  let lastTime = performance.now();
  let accumulator = 0;

  function describeScreen(screen) {
    if (screen === 'title') return 'Starshard Salvage title screen. Press any key to launch.';
    if (screen === 'play') return `Wave ${world.wave}. Score ${world.score}. Hull ${Math.ceil(world.player.hull)}.`;
    if (screen === 'upgrade') return 'Wave cleared. Choose one upgrade.';
    if (screen === 'paused') return 'Paused.';
    if (screen === 'victory') return `Victory! Final score ${world.score}. Press R to play again.`;
    return `Skiff lost. Final score ${world.score}. Press R to try again.`;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      updateWorld(world, STEP, input);
      accumulator -= STEP;
    }
    renderWorld(ctx, world);
    if (world.screen !== lastScreen || world.screen === 'play') {
      const text = describeScreen(world.screen);
      if (statusLine.textContent !== text) statusLine.textContent = text;
      lastScreen = world.screen;
    }
  }
  requestAnimationFrame(frame);
}
