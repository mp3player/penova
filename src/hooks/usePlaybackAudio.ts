import { useEffect, useRef, useState } from 'react';
import { ThemeId } from '../model/scene';
import {
  CompiledProjectTimeline,
  ProjectEvalState,
} from '../engine/timeline/projectTimeline';
import { evaluateTimelineAt } from '../engine/timeline/timelineEngine';
import { ChalkSoundEngine } from '../engine/audio/chalkSound';
import {
  AudioTrackState,
  VoiceTrackPlayer,
} from '../engine/audio/voiceTrackPlayer';
import { useI18n } from '../i18n';

export interface UsePlaybackAudioParams {
  compiledProject: CompiledProjectTimeline;
  evalState: ProjectEvalState;
  activeTheme: ThemeId;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  tMs: number;
  setTMs: React.Dispatch<React.SetStateAction<number>>;
  tMsRef: React.MutableRefObject<number>;
  exporting: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showToast: (msg: string) => void;
}

export function usePlaybackAudio({
  compiledProject,
  evalState,
  activeTheme,
  isPlaying,
  setIsPlaying,
  tMs,
  setTMs,
  tMsRef,
  exporting,
  onUndo,
  onRedo,
  showToast,
}: UsePlaybackAudioParams) {
  const { t } = useI18n();
  const [speed, setSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioTrack, setAudioTrack] = useState<AudioTrackState | null>(null);

  const soundEngineRef = useRef<ChalkSoundEngine | null>(null);
  const voicePlayerRef = useRef<VoiceTrackPlayer | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Dispose sound & voiceover players on unmount
  useEffect(() => {
    const engine = new ChalkSoundEngine();
    const voicePlayer = new VoiceTrackPlayer();
    soundEngineRef.current = engine;
    voicePlayerRef.current = voicePlayer;
    return () => {
      engine.dispose();
      voicePlayer.dispose();
      soundEngineRef.current = null;
      voicePlayerRef.current = null;
    };
  }, []);

  // Revoke previous object URL cleanly when audio track changes or unmounts
  useEffect(() => {
    const url = audioTrack?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioTrack?.url]);

  // Sync external voiceover / background audio track cleanly with playback state
  useEffect(() => {
    voicePlayerRef.current?.sync(
      isPlaying && !exporting,
      tMs,
      speed,
      audioTrack
    );
  }, [isPlaying, exporting, tMs, speed, audioTrack]);

  // Sync writing / eraser friction sound cleanly with active project timeline state
  useEffect(() => {
    const engine = soundEngineRef.current;
    if (!engine) return;
    if (!soundEnabled || !isPlaying || exporting) {
      engine.update(false, false, false, 0, activeTheme);
      return;
    }

    if (evalState.kind === 'transition') {
      const isEraser = evalState.transitionId === 'chalkboard-eraser';
      engine.update(
        isEraser,
        isEraser,
        isEraser && evalState.progress < 0.86,
        0.72,
        evalState.fromSegment.scene.theme
      );
      return;
    }

    const sceneEval = evaluateTimelineAt(
      evalState.segment.timeline,
      evalState.localTMs
    );
    engine.update(
      true,
      true,
      sceneEval.pen.penDown,
      sceneEval.pen.velocity,
      evalState.segment.scene.theme
    );
  }, [soundEnabled, isPlaying, exporting, evalState, activeTheme]);

  // Playback loop via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || exporting) return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(80, now - lastTime);
      lastTime = now;
      const next = tMsRef.current + dt * speed;

      if (next >= compiledProject.totalDurationMs) {
        tMsRef.current = compiledProject.totalDurationMs;
        setTMs(compiledProject.totalDurationMs);
        setIsPlaying(false);
        return;
      }

      tMsRef.current = next;
      setTMs(next);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    isPlaying,
    exporting,
    speed,
    compiledProject.totalDurationMs,
    setIsPlaying,
    setTMs,
    tMsRef,
  ]);

  // Global shortcuts: Space play/pause & Ctrl/Cmd+Z/Y undo/redo (ignored when editing text)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isInput || exporting) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'y'
      ) {
        e.preventDefault();
        onRedo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlayingRef.current) {
          setIsPlaying(false);
        } else {
          if (tMsRef.current >= compiledProject.totalDurationMs - 20) {
            tMsRef.current = 0;
            setTMs(0);
          }
          setIsPlaying(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    exporting,
    compiledProject.totalDurationMs,
    onUndo,
    onRedo,
    setIsPlaying,
    setTMs,
    tMsRef,
  ]);

  const handleTogglePlay = () => {
    if (exporting) return;
    if (!isPlaying && tMs >= compiledProject.totalDurationMs - 20) {
      tMsRef.current = 0;
      setTMs(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleRestart = () => {
    if (exporting) return;
    tMsRef.current = 0;
    setTMs(0);
    setIsPlaying(true);
  };

  const handleSeek = (nextMs: number) => {
    setIsPlaying(false);
    const clamped = Math.max(
      0,
      Math.min(compiledProject.totalDurationMs, nextMs)
    );
    tMsRef.current = clamped;
    setTMs(clamped);
  };

  const handleImportAudioFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioTrack({
      name: file.name,
      url,
      offsetMs: 0,
      volume: 0.9,
      muted: false,
    });
    showToast(t('toast.audioImported', { name: file.name }));
  };

  return {
    speed,
    setSpeed,
    soundEnabled,
    setSoundEnabled,
    audioTrack,
    setAudioTrack,
    handleTogglePlay,
    handleRestart,
    handleSeek,
    handleImportAudioFile,
  };
}
