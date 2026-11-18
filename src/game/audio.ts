import { WeaponId } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientMode: 'none' | 'rain' | 'wind' = 'none';
  public muted = false;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playFilteredNoise(
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    q: number,
    gainStart: number,
    delay = 0,
  ) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(this.ctx);
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, t);
    filter.frequency.setValueAtTime(Math.max(40, freqStart), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, gainStart), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainStart: number,
    delay = 0,
  ) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);

    g.gain.setValueAtTime(Math.max(0.0001, gainStart), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // Gentle atmospheric rain/wind ambient loop when AudioContext is active
  public setAmbientWeather(mode: 'none' | 'rain' | 'wind') {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') {
      mode = 'none';
    }
    if (mode === this.ambientMode) return;
    this.ambientMode = mode;

    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch {
        // ignore already stopped
      }
      this.ambientSource.disconnect();
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }

    if (mode === 'none' || !this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = mode === 'rain' ? 'bandpass' : 'lowpass';
    filter.frequency.value = mode === 'rain' ? 1450 : 480;
    filter.Q.value = mode === 'rain' ? 0.65 : 1.1;

    const gain = ctx.createGain();
    gain.gain.value = mode === 'rain' ? 0.032 : 0.018;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.ambientSource = src;
    this.ambientGain = gain;
  }

  // Crisp realistic boot spring + air whoosh on Jump
  public playJump() {
    this.playTone(135, 290, 0.14, 'triangle', 0.14);
    this.playFilteredNoise(0.11, 'bandpass', 520, 1400, 1.2, 0.08);
  }

  // Soft earth/boot landing thud
  public playLand() {
    this.playTone(105, 48, 0.09, 'sine', 0.12);
    this.playFilteredNoise(0.08, 'lowpass', 360, 140, 0.8, 0.09);
  }

  // Sharp layered steel sword slash + metallic ring
  public playSwordSwing() {
    this.playFilteredNoise(0.17, 'bandpass', 1800, 520, 1.5, 0.14);
    this.playTone(640, 210, 0.13, 'triangle', 0.11);
    this.playTone(1380, 920, 0.09, 'sine', 0.045, 0.02);
  }

  // Heavy seismic warhammer smash
  public playHammerSlam() {
    this.playTone(138, 34, 0.34, 'triangle', 0.28);
    this.playTone(95, 28, 0.38, 'sine', 0.24);
    this.playFilteredNoise(0.28, 'lowpass', 950, 180, 0.7, 0.2);
  }

  // Punchy sci-fi plasma bolt discharge
  public playBlasterShot() {
    this.playTone(1480, 260, 0.14, 'sawtooth', 0.09);
    this.playTone(920, 190, 0.12, 'triangle', 0.08);
    this.playFilteredNoise(0.08, 'highpass', 1900, 900, 1.0, 0.05);
  }

  // Crisp bowstring twang + whistling arrow
  public playBowShot() {
    this.playTone(270, 115, 0.12, 'triangle', 0.15);
    this.playTone(540, 230, 0.08, 'sine', 0.08);
    this.playFilteredNoise(0.16, 'bandpass', 2400, 1100, 2.2, 0.09, 0.02);
  }

  // Metallic weapon/flesh impact hit
  public playHit(heavy = false) {
    if (heavy) {
      this.playTone(155, 42, 0.19, 'sawtooth', 0.16);
      this.playFilteredNoise(0.14, 'bandpass', 1100, 260, 1.0, 0.16);
    } else {
      this.playTone(230, 88, 0.11, 'triangle', 0.14);
      this.playFilteredNoise(0.08, 'bandpass', 1500, 520, 1.2, 0.11);
    }
  }

  // Shield raise leather/steel clack
  public playShieldRaise() {
    this.playTone(320, 440, 0.08, 'triangle', 0.09);
    this.playFilteredNoise(0.07, 'bandpass', 900, 500, 1.4, 0.06);
  }

  // Heavy shield block clang (or crisp bell-like parry!)
  public playShieldBlock(parry: boolean) {
    if (parry) {
      this.playTone(880, 1320, 0.22, 'triangle', 0.17);
      this.playTone(1460, 1780, 0.26, 'sine', 0.13, 0.02);
      this.playFilteredNoise(0.12, 'highpass', 2200, 1200, 1.4, 0.14);
    } else {
      this.playTone(280, 120, 0.16, 'triangle', 0.18);
      this.playTone(520, 310, 0.14, 'square', 0.06);
      this.playFilteredNoise(0.11, 'bandpass', 1100, 380, 1.2, 0.14);
    }
  }

  // Relic activation chimes / wind / berserk roar
  public playRelicSkill(kind: 'heal' | 'wind' | 'berserk') {
    if (kind === 'heal') {
      this.playTone(523, 659, 0.18, 'sine', 0.12);
      this.playTone(659, 784, 0.22, 'sine', 0.12, 0.07);
      this.playTone(1046, 1318, 0.26, 'triangle', 0.09, 0.14);
    } else if (kind === 'wind') {
      this.playFilteredNoise(0.32, 'bandpass', 700, 2600, 1.8, 0.16);
      this.playTone(340, 720, 0.24, 'sine', 0.11);
    } else {
      this.playTone(150, 62, 0.34, 'sawtooth', 0.16);
      this.playTone(220, 330, 0.28, 'triangle', 0.13, 0.03);
      this.playFilteredNoise(0.24, 'lowpass', 900, 220, 0.9, 0.16);
    }
  }

  // Realistic armor thud + low grunt when player takes damage (NO fart!)
  public playPlayerHurt() {
    this.playTone(170, 72, 0.17, 'triangle', 0.17);
    this.playFilteredNoise(0.12, 'lowpass', 720, 210, 0.9, 0.15);
  }

  // Mob defeat chime
  public playMobDefeat() {
    this.playTone(392, 523, 0.1, 'triangle', 0.11);
    this.playTone(523, 784, 0.16, 'sine', 0.1, 0.07);
  }

  // Coin / crystal / chest pickup sparkle
  public playPickup() {
    this.playTone(740, 1110, 0.08, 'sine', 0.1);
    this.playTone(1110, 1480, 0.11, 'sine', 0.08, 0.05);
  }

  // Water splash droplets
  public playSplash() {
    this.playFilteredNoise(0.24, 'bandpass', 1200, 320, 0.9, 0.15);
    this.playTone(210, 110, 0.12, 'sine', 0.09);
  }

  // Wooden door latch & warm timber creak
  public playDoorCreak(open: boolean) {
    this.playTone(open ? 210 : 280, open ? 310 : 175, 0.16, 'triangle', 0.075);
    this.playFilteredNoise(0.14, 'bandpass', 620, 420, 2.5, 0.045);
  }

  // Weapon swap draw sound
  public playEquip(id: WeaponId) {
    if (id === 'sword') {
      this.playFilteredNoise(0.12, 'highpass', 1800, 2900, 1.5, 0.07);
      this.playTone(760, 1140, 0.09, 'sine', 0.055);
    } else if (id === 'hammer') {
      this.playTone(125, 86, 0.12, 'triangle', 0.12);
    } else if (id === 'blaster') {
      this.playTone(460, 960, 0.11, 'sine', 0.075);
    } else {
      this.playTone(310, 465, 0.1, 'triangle', 0.08);
    }
  }

  // Crafting forge anvil / potion brew
  public playCraft() {
    this.playTone(440, 587, 0.11, 'triangle', 0.11);
    this.playTone(659, 880, 0.13, 'triangle', 0.11, 0.08);
    this.playTone(988, 1318, 0.18, 'sine', 0.09, 0.16);
  }

  // Quest completed fanfare
  public playQuestComplete() {
    this.playTone(523, 523, 0.11, 'triangle', 0.13);
    this.playTone(659, 659, 0.11, 'triangle', 0.13, 0.09);
    this.playTone(784, 784, 0.13, 'triangle', 0.14, 0.18);
    this.playTone(1046, 1175, 0.26, 'sine', 0.14, 0.28);
  }

  // UI inventory/shop open/close
  public playInventoryToggle(open: boolean) {
    this.playTone(open ? 420 : 540, open ? 620 : 380, 0.08, 'sine', 0.06);
  }
}

export const soundEngine = new SoundEngine();
