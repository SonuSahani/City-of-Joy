// ============================================================
// Procedural audio (WebAudio) — no external files.
// Soft ambient drone + occasional birds, plus SFX:
// tram bell, camera shutter, UI blips, success chime.
// Must be started after a user gesture (browser autoplay policy).
// ============================================================

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.started = false;
    this.muted = false;
  }

  // Call from a user gesture (Play button / first tap).
  start() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this._buildAmbient();
    this.started = true;
  }

  _buildAmbient() {
    const ctx = this.ctx;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.12;
    this.ambientGain.connect(this.master);

    // two detuned oscillators -> warm pad
    const freqs = [110, 110.5, 165];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.18 : 0.5;
      // slow LFO on gain for gentle movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(this.ambientGain);
      osc.start();
      lfo.start();
    });

    // occasional bird chirps
    this._birdTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      if (Math.random() < 0.5) this._chirp();
    }, 4200);
  }

  _chirp() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const base = 1800 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  _ping(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  tramBell() {
    this._ping(1320, 0.5, 'square', 0.12);
    setTimeout(() => this._ping(1760, 0.5, 'square', 0.10), 160);
  }

  shutter() {
    if (!this.ctx || this.muted) return;
    // quick noise burst
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(g).connect(this.master);
    src.start(t);
  }

  blip() { this._ping(620, 0.08, 'triangle', 0.12); }
  good() { this._ping(660, 0.12, 'sine', 0.18); setTimeout(() => this._ping(990, 0.18, 'sine', 0.18), 110); }
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._ping(f, 0.3, 'triangle', 0.16), i * 140));
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }
}
