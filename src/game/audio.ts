import { WeaponId } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private lastCryMs = 0;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-10, this.ctx.currentTime);
      comp.knee.setValueAtTime(12, this.ctx.currentTime);
      comp.ratio.setValueAtTime(8, this.ctx.currentTime);
      comp.attack.setValueAtTime(0.002, this.ctx.currentTime);
      comp.release.setValueAtTime(0.15, this.ctx.currentTime);
      const boost = this.ctx.createGain();
      boost.gain.setValueAtTime(1.45, this.ctx.currentTime);
      comp.connect(boost).connect(this.ctx.destination);
      this.out = comp;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getDest(ctx: AudioContext): AudioNode {
    return this.out ?? ctx.destination;
  }

  public unlock() {
    this.ensureCtx();
  }

  private playNoiseBurst(
    ctx: AudioContext,
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    volume: number,
    q = 1.0,
  ) {
    const now = ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter).connect(gain).connect(this.getDest(ctx));
    src.start(now);
  }

  public playSwordSwing() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380 + Math.random() * 45, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.14);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
    this.playNoiseBurst(ctx, 0.11, 'bandpass', 1900, 750, 0.12, 1.4);
  }

  public playHammerSlam() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.33);
    this.playNoiseBurst(ctx, 0.22, 'lowpass', 720, 140, 0.22, 0.8);
  }

  public playBlasterShot() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.14);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playBowShot() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.12);
    gain.gain.setValueAtTime(0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
    this.playNoiseBurst(ctx, 0.08, 'highpass', 1800, 900, 0.09, 1.1);
  }

  // Very loud multi-layer impact + enemy vocal cry when hitting a mob
  public playHit(heavy = false) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getDest(ctx);
    const pitchVar = 0.92 + Math.random() * 0.16;

    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'sine';
    punch.frequency.setValueAtTime((heavy ? 170 : 225) * pitchVar, now);
    punch.frequency.exponentialRampToValueAtTime(40, now + (heavy ? 0.18 : 0.12));
    punchGain.gain.setValueAtTime(heavy ? 0.72 : 0.54, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.19 : 0.13));
    punch.connect(punchGain).connect(dest);
    punch.start(now);
    punch.stop(now + (heavy ? 0.2 : 0.14));

    const crunch = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    crunch.type = 'triangle';
    crunch.frequency.setValueAtTime((heavy ? 320 : 440) * pitchVar, now);
    crunch.frequency.exponentialRampToValueAtTime(85, now + 0.08);
    crunchGain.gain.setValueAtTime(heavy ? 0.42 : 0.3, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    crunch.connect(crunchGain).connect(dest);
    crunch.start(now);
    crunch.stop(now + 0.09);

    this.playNoiseBurst(ctx, heavy ? 0.12 : 0.08, 'bandpass', 1700 * pitchVar, 420, heavy ? 0.48 : 0.36, 1.2);
    this.playMobHitCry(ctx);
  }

  private playMobHitCry(ctx: AudioContext) {
    const now = ctx.currentTime;
    const dest = this.getDest(ctx);

    // 1. Instant loud stylized vocal "Аййй-ооой!" formant cry
    const pitch = 0.85 + Math.random() * 0.3;
    const voice = ctx.createOscillator();
    const formant = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(360 * pitch, now + 0.02);
    voice.frequency.linearRampToValueAtTime(470 * pitch, now + 0.1);
    voice.frequency.exponentialRampToValueAtTime(165 * pitch, now + 0.52);

    formant.type = 'bandpass';
    formant.Q.setValueAtTime(2.8, now);
    formant.frequency.setValueAtTime(1020, now + 0.02);
    formant.frequency.exponentialRampToValueAtTime(480, now + 0.52);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.68, now + 0.045);
    gain.gain.setValueAtTime(0.55, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);

    voice.connect(formant).connect(gain).connect(dest);
    voice.start(now + 0.015);
    voice.stop(now + 0.56);

    // 2. Throttled Ukrainian speech voice line ("Аййй, боляче!" / "Ай-яй-яй!")
    const ms = performance.now();
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      ms - this.lastCryMs > 550
    ) {
      this.lastCryMs = ms;
      try {
        window.speechSynthesis.cancel();
        const lines = ['Аййй, боляче!', 'Ай-яй-яй!', 'Оййй, рятуйте!'];
        const utter = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
        utter.lang = 'uk-UA';
        utter.volume = 1.0;
        utter.rate = 1.1;
        utter.pitch = 0.85 + Math.random() * 0.35;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore speech synthesis errors on restricted browsers
      }
    }
  }

  // Weapon / item draw sound ("діставання речей")
  public playEquip(weapon?: WeaponId) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (weapon === 'sword') {
      // Metallic sheath ring + leather slide
      this.playNoiseBurst(ctx, 0.09, 'bandpass', 2400, 3800, 0.11, 2.2);
      const ring = ctx.createOscillator();
      const gain = ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1180, now + 0.02);
      ring.frequency.exponentialRampToValueAtTime(1760, now + 0.14);
      gain.gain.setValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      ring.connect(gain).connect(ctx.destination);
      ring.start(now + 0.02);
      ring.stop(now + 0.19);
    } else if (weapon === 'blaster') {
      // Sci-fi charge chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Tactile wooden/leather pull-out thump + rustle
      this.playNoiseBurst(ctx, 0.09, 'bandpass', 900, 1600, 0.13, 1.3);
      const pop = ctx.createOscillator();
      const gain = ctx.createGain();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(180, now);
      pop.frequency.exponentialRampToValueAtTime(320, now + 0.07);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      pop.connect(gain).connect(ctx.destination);
      pop.start(now);
      pop.stop(now + 0.09);
    }
  }

  // Backpack / inventory open & close rustle
  public playInventoryToggle(opening: boolean) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(
      ctx,
      0.11,
      'bandpass',
      opening ? 950 : 1750,
      opening ? 2100 : 750,
      0.13,
      1.6,
    );
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opening ? 260 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 440 : 210, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playCraft() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.11].forEach((delay, idx) => {
      const anvil = ctx.createOscillator();
      const gain = ctx.createGain();
      anvil.type = 'triangle';
      anvil.frequency.setValueAtTime(idx === 0 ? 740 : 1040, now + delay);
      anvil.frequency.exponentialRampToValueAtTime(idx === 0 ? 520 : 880, now + delay + 0.16);
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
      anvil.connect(gain).connect(ctx.destination);
      anvil.start(now + delay);
      anvil.stop(now + delay + 0.19);
    });
  }

  public playMobDefeat() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [330, 440, 587];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(0.1, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.13);
    });
  }

  public playPickup() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.06);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playJump() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.11);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playSplash() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.playNoiseBurst(ctx, 0.16, 'bandpass', 720, 380, 0.14, 1.0);
  }

  public playJumpFart() {
    this.triggerFartSound(0.32 + Math.random() * 0.1, 1.05 + Math.random() * 0.25, 0.85);
  }

  // Extra-loud comedic procedural fart sound when player takes a hit
  public playPlayerHurt() {
    this.triggerFartSound(0.42 + Math.random() * 0.12, 0.85 + Math.random() * 0.25, 0.95);
  }

  private triggerFartSound(dur: number, pitch: number, level: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getDest(ctx);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(104 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(64 * pitch, now + dur * 0.45);
    osc.frequency.exponentialRampToValueAtTime(40 * pitch, now + dur);

    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.setValueAtTime(52 * pitch, now);
    sub.frequency.exponentialRampToValueAtTime(30 * pitch, now + dur);

    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.setValueAtTime(36 * pitch, now);
    lfo.frequency.linearRampToValueAtTime(20 * pitch, now + dur);

    const lfoFreqGain = ctx.createGain();
    lfoFreqGain.gain.setValueAtTime(26, now);
    lfo.connect(lfoFreqGain).connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.8, now);
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(175, now + dur);

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.setValueAtTime(190, now);
    lfo.connect(lfoFilterGain).connect(filter.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(level, now + 0.02);
    env.gain.setValueAtTime(level * 0.92, now + dur * 0.58);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.55, now);

    osc.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(env).connect(dest);

    osc.start(now);
    sub.start(now);
    lfo.start(now);
    osc.stop(now + dur + 0.02);
    sub.stop(now + dur + 0.02);
    lfo.stop(now + dur + 0.02);

    this.playNoiseBurst(ctx, dur * 0.9, 'lowpass', 560, 150, 0.65 * level, 1.6);
  }

  public playExplosion() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getDest(ctx);

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(145, now);
    boom.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    boomGain.gain.setValueAtTime(0.85, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    boom.connect(boomGain).connect(dest);
    boom.start(now);
    boom.stop(now + 0.46);

    const crack = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(260, now);
    crack.frequency.exponentialRampToValueAtTime(48, now + 0.25);
    crackGain.gain.setValueAtTime(0.45, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    crack.connect(crackGain).connect(dest);
    crack.start(now);
    crack.stop(now + 0.27);

    this.playNoiseBurst(ctx, 0.38, 'lowpass', 2200, 140, 0.72, 0.85);
  }
}

export const soundEngine = new SoundEngine();
