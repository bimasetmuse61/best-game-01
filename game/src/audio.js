// All sound is synthesized with WebAudio: no audio files, no network.
// Short blips for actions, and a quiet generative music loop (a slow bass
// pulse under a pentatonic arpeggio) that starts on the first user gesture,
// because browsers will not let audio start before one.
export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // The pentatonic ladder the music walks, in Hz (A minor pentatonic).
  const SCALE = [110, 130.81, 164.81, 196, 220, 261.63, 329.63, 392];

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    startMusic();
    return true;
  }

  function tone(freq, duration, type, volume, slideTo, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, lowpass) {
    if (!context || muted) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function startMusic() {
    if (musicTimer !== null) return;
    // One bar every 500 ms: bass on the beat, a wandering pluck above it.
    musicTimer = window.setInterval(() => {
      if (!context || muted) return;
      const bar = Math.floor(musicStep / 4) % 4;
      const roots = [55, 65.41, 49, 58.27];
      if (musicStep % 4 === 0) tone(roots[bar], 0.5, 'sine', 0.5, null, 0);
      if (musicStep % 2 === 0) {
        const note = SCALE[(musicStep * 3 + bar) % SCALE.length] * 2;
        tone(note, 0.22, 'triangle', 0.16, null, 0);
      }
      musicStep += 1;
    }, 250);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() { tone(720, 0.09, 'square', 0.08, 240); },
    enemyShoot() { tone(300, 0.12, 'sawtooth', 0.05, 160); },
    explosion(big = false) {
      noise(big ? 0.5 : 0.25, big ? 0.5 : 0.28, big ? 900 : 1400);
      tone(big ? 90 : 140, big ? 0.4 : 0.22, 'sine', 0.4, 40);
    },
    hit() { tone(190, 0.07, 'square', 0.1, 120); },
    hurt() {
      tone(160, 0.25, 'sawtooth', 0.22, 60);
      noise(0.15, 0.2, 700);
    },
    shard() { tone(880, 0.1, 'sine', 0.12, 1320); },
    heal() { tone(520, 0.18, 'sine', 0.14, 780); tone(780, 0.22, 'sine', 0.1, 1040, 0.08); },
    waveHorn() {
      tone(220, 0.4, 'triangle', 0.2, 330);
      tone(330, 0.4, 'triangle', 0.14, 440, 0.1);
    },
    gateOpen() { tone(440, 0.5, 'sine', 0.16, 880); tone(660, 0.5, 'sine', 0.1, 990, 0.12); },
    upgrade() {
      [523.25, 659.25, 783.99].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.14, null, i * 0.09));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.16, null, i * 0.13));
    },
    defeat() {
      [392, 329.63, 261.63, 196].forEach((freq, i) => tone(freq, 0.4, 'sawtooth', 0.1, null, i * 0.16));
    },
    click() { tone(600, 0.05, 'square', 0.08, 500); },
  };
}
