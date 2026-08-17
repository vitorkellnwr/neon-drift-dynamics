/**
 * Procedural car audio (no samples needed): engine with fake gearbox, tyre
 * screech, wind and impact thumps. Everything is synthesised with WebAudio so
 * it stays in sync with the physics loop.
 */

export type EngineState = {
  /** Absolute speed in m/s. */
  speed: number;
  maxSpeed: number;
  throttle: boolean;
  brake: boolean;
  drifting: boolean;
  /** Slip angle in degrees. */
  driftAngle: number;
  grounded: boolean;
};

function noiseBuffer(ctx: AudioContext, seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class CarAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private gear = 1;
  private rpm = 0.15;
  private muted = false;

  get ready() {
    return this.ctx !== null;
  }

  /** Must be called from a user gesture (menu click) for autoplay policies. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.55;
    master.connect(ctx.destination);
    this.master = master;

    // --- Engine: two detuned saws + sub, through a moving lowpass ---
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 6;
    engineGain.connect(filter);
    filter.connect(master);

    const oscA = ctx.createOscillator();
    oscA.type = "sawtooth";
    const oscB = ctx.createOscillator();
    oscB.type = "square";
    oscB.detune.value = 14;
    const oscSub = ctx.createOscillator();
    oscSub.type = "sine";

    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    oscSub.connect(subGain);
    subGain.connect(engineGain);
    oscA.connect(engineGain);
    const bGain = ctx.createGain();
    bGain.gain.value = 0.35;
    oscB.connect(bGain);
    bGain.connect(engineGain);

    oscA.start();
    oscB.start();
    oscSub.start();

    this.oscA = oscA;
    this.oscB = oscB;
    this.oscSub = oscSub;
    this.engineGain = engineGain;
    this.engineFilter = filter;

    // --- Tyre screech: bandpassed noise ---
    const screechSrc = ctx.createBufferSource();
    screechSrc.buffer = noiseBuffer(ctx);
    screechSrc.loop = true;
    const screechFilter = ctx.createBiquadFilter();
    screechFilter.type = "bandpass";
    screechFilter.frequency.value = 1800;
    screechFilter.Q.value = 7;
    const screechGain = ctx.createGain();
    screechGain.gain.value = 0.0001;
    screechSrc.connect(screechFilter);
    screechFilter.connect(screechGain);
    screechGain.connect(master);
    screechSrc.start();
    this.screechGain = screechGain;
    this.screechFilter = screechFilter;

    // --- Wind / road roar ---
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer(ctx);
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.0001;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
    this.windGain = windGain;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  /** Short thump for wall hits / hard landings. */
  impact(strength: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.4);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    const peak = Math.min(0.9, 0.25 + strength * 0.7);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + 0.34);
  }

  update(state: EngineState, delta: number) {
    const ctx = this.ctx;
    if (!ctx || !this.oscA || !this.oscB || !this.oscSub) return;
    const now = ctx.currentTime;
    const norm = Math.min(state.speed / Math.max(state.maxSpeed, 1), 1.2);

    // Fake 6-speed gearbox: rpm resets on each shift for that engine "bark".
    const gears = [0.16, 0.3, 0.45, 0.62, 0.8, 1.05];
    let gear = 0;
    while (gear < gears.length - 1 && norm > gears[gear]!) gear++;
    const low = gear === 0 ? 0 : gears[gear - 1]!;
    const span = Math.max(gears[gear]! - low, 0.01);
    const targetRpm = 0.22 + Math.min((norm - low) / span, 1.15) * 0.78;
    const shifted = gear !== this.gear;
    this.gear = gear;
    // Idle flutter keeps it alive when stopped.
    const idle = state.throttle ? 0 : Math.sin(now * 7) * 0.012;
    const smooth = shifted ? 0.35 : 1 - Math.pow(0.0006, delta);
    this.rpm += (targetRpm + idle - this.rpm) * smooth;

    const base = 44 + this.rpm * 190 + (state.throttle ? 12 : 0);
    this.oscA.frequency.setTargetAtTime(base, now, 0.02);
    this.oscB.frequency.setTargetAtTime(base * 1.5, now, 0.02);
    this.oscSub.frequency.setTargetAtTime(base * 0.5, now, 0.04);

    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(
        420 + this.rpm * 2600 + (state.throttle ? 500 : 0),
        now,
        0.05,
      );
    }
    if (this.engineGain) {
      const load = state.throttle ? 0.2 : 0.11;
      const target = load + this.rpm * 0.16 + (state.grounded ? 0 : 0.05);
      this.engineGain.gain.setTargetAtTime(target, now, 0.05);
    }

    if (this.screechGain && this.screechFilter) {
      const slip = Math.min(state.driftAngle / 45, 1.4);
      const active = state.drifting || (state.brake && state.speed > 6);
      const target = active ? 0.05 + slip * 0.2 : 0.0001;
      this.screechGain.gain.setTargetAtTime(target, now, active ? 0.04 : 0.12);
      this.screechFilter.frequency.setTargetAtTime(1400 + slip * 1400, now, 0.08);
    }

    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(0.0001 + norm * norm * 0.14, now, 0.1);
    }
  }

  dispose() {
    const ctx = this.ctx;
    this.ctx = null;
    if (!ctx) return;
    try {
      this.oscA?.stop();
      this.oscB?.stop();
      this.oscSub?.stop();
    } catch {
      /* already stopped */
    }
    void ctx.close();
  }
}
