export interface AudioTrackState {
  name: string;
  url: string;
  offsetMs: number;
  volume: number;
  muted: boolean;
  durationMs?: number;
}

export class VoiceTrackPlayer {
  private audio: HTMLAudioElement | null = null;
  private activeUrl: string | null = null;

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  public sync(
    isPlaying: boolean,
    globalTMs: number,
    speed: number,
    track: AudioTrackState | null
  ): void {
    if (!track || !track.url) {
      if (this.audio) {
        this.audio.pause();
      }
      this.activeUrl = null;
      return;
    }

    const audio = this.ensureAudio();
    if (!audio) return;

    if (this.activeUrl !== track.url) {
      this.activeUrl = track.url;
      audio.src = track.url;
    }

    audio.volume = Math.max(0, Math.min(1, track.volume));
    audio.playbackRate = Math.max(0.25, Math.min(4, speed));

    const targetSec = (globalTMs - track.offsetMs) / 1000;
    const withinDuration =
      !Number.isFinite(audio.duration) || targetSec < audio.duration;

    if (!isPlaying || track.muted || targetSec < 0 || !withinDuration) {
      if (!audio.paused) {
        audio.pause();
      }
      return;
    }

    if (Math.abs(audio.currentTime - targetSec) > 0.22) {
      try {
        audio.currentTime = targetSec;
      } catch {
        // Ignore seek errors before metadata is loaded
      }
    }

    if (audio.paused) {
      void audio.play().catch(() => {
        // Browser autoplay policy may block until user interacts
      });
    }
  }

  public dispose(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.activeUrl = null;
  }
}
