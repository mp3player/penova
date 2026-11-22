import { ThemeId } from '../../model/scene';
import { presentationRegistry } from '../../plugins/registry';

export class ChalkSoundEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  private ensureGraph(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx && this.gainNode && this.filterNode) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return true;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-tinted granular noise for natural chalk-on-slate friction
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.14) * 0.85;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.ctx = ctx;
    this.filterNode = filter;
    this.gainNode = gain;
    this.sourceNode = source;
    return true;
  }

  public update(
    enabled: boolean,
    isPlaying: boolean,
    penDown: boolean,
    velocity: number,
    theme: ThemeId
  ): void {
    if (!enabled || !isPlaying) {
      if (this.ctx && this.gainNode) {
        this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      }
      return;
    }

    if (!this.ensureGraph() || !this.ctx || !this.gainNode || !this.filterNode) {
      return;
    }

    const now = this.ctx.currentTime;
    const profile = presentationRegistry.getOrDefault(theme).soundProfile;
    this.filterNode.frequency.setTargetAtTime(
      profile.baseFreqHz + velocity * profile.velocityFreqBoostHz,
      now,
      0.04
    );

    const targetGain = penDown
      ? profile.baseGain * Math.max(0.35, Math.min(1.15, velocity))
      : 0;
    this.gainNode.gain.setTargetAtTime(targetGain, now, 0.025);
  }

  public dispose(): void {
    try {
      this.sourceNode?.stop();
    } catch {
      // ignore if already stopped
    }
    if (this.ctx) {
      void this.ctx.close();
    }
    this.ctx = null;
    this.gainNode = null;
    this.filterNode = null;
    this.sourceNode = null;
  }
}
