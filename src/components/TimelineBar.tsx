import React, { useRef } from 'react';
import {
  Pause,
  Play,
  Repeat1,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import {
  collectGlobalStepStarts,
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';
import { useI18n } from '../i18n';

interface TimelineBarProps {
  compiledProject: CompiledProjectTimeline;
  tMs: number;
  isPlaying: boolean;
  loopCurrentScene: boolean;
  speed: number;
  onTogglePlay: () => void;
  onToggleLoopScene: () => void;
  onRestart: () => void;
  onSeek: (tMs: number) => void;
  onChangeSpeed: (speed: number) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.5, 2];

function formatTime(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${secs
    .toFixed(1)
    .padStart(4, '0')}`;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  compiledProject,
  tMs,
  isPlaying,
  loopCurrentScene,
  speed,
  onTogglePlay,
  onToggleLoopScene,
  onRestart,
  onSeek,
  onChangeSpeed,
}) => {
  const { t, pluginName, transitionShort } = useI18n();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const total = Math.max(1, compiledProject.totalDurationMs);
  const evalState = evaluateProjectAt(compiledProject, tMs);
  const stepStarts = collectGlobalStepStarts(compiledProject);

  let currentGlobalStepIdx = 0;
  for (let i = 0; i < stepStarts.length; i++) {
    if (tMs >= stepStarts[i] - 5) {
      currentGlobalStepIdx = i;
    }
  }

  const jumpStep = (delta: -1 | 1) => {
    if (stepStarts.length === 0) return;
    const nextIdx = Math.max(
      0,
      Math.min(stepStarts.length - 1, currentGlobalStepIdx + delta)
    );
    onSeek(stepStarts[nextIdx]);
  };

  const scrubFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * total);
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFromPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.buttons & 1) === 1) {
      scrubFromPointer(e.clientX);
    }
  };

  const playheadPct = Math.max(0, Math.min(100, (tMs / total) * 100));
  const isMultiScene = compiledProject.segments.length > 1;
  const singleTimeline =
    compiledProject.segments.length === 1
      ? compiledProject.segments[0].timeline
      : null;

  let singleStepIdx = 0;
  if (singleTimeline) {
    for (let i = 0; i < singleTimeline.steps.length; i++) {
      if (tMs >= singleTimeline.steps[i].startMs) {
        singleStepIdx = i;
      }
    }
  }

  let statusLabel = '';
  if (evalState.kind === 'transition') {
    statusLabel = t('timeline.statusTransition', {
      name: pluginName(evalState.transitionId, evalState.transitionName),
    });
  } else if (evalState.segment) {
    const segTimeline = evalState.segment.timeline;
    const localMs = evalState.localTMs;
    if (localMs >= segTimeline.outroStartMs && segTimeline.steps.length > 0) {
      statusLabel = isMultiScene
        ? t('timeline.statusMultiOverview', {
            current: evalState.sceneIndex + 1,
            total: compiledProject.segments.length,
          })
        : t('timeline.statusOverview');
    } else if (segTimeline.steps.length > 0) {
      let sIdx = 0;
      for (let i = 0; i < segTimeline.steps.length; i++) {
        if (localMs >= segTimeline.steps[i].startMs) sIdx = i;
      }
      const stepTitle = segTimeline.steps[sIdx].step.title;
      statusLabel = isMultiScene
        ? t('timeline.statusMultiStep', {
            scene: evalState.sceneIndex + 1,
            totalScenes: compiledProject.segments.length,
            step: sIdx + 1,
            totalSteps: segTimeline.steps.length,
            title: stepTitle,
          })
        : t('timeline.statusSingleStep', {
            step: sIdx + 1,
            totalSteps: segTimeline.steps.length,
            title: stepTitle,
          });
    } else {
      statusLabel = evalState.segment.scene.title;
    }
  }

  return (
    <footer
      style={{
        height: 82,
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '8px 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 6,
      }}
    >
      {/* Top transport controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="studio-btn primary"
            onClick={onTogglePlay}
            style={{ width: 82 }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? t('timeline.pause') : t('timeline.play')}
          </button>

          <button
            type="button"
            className="studio-btn"
            onClick={onRestart}
            title={t('timeline.restartTitle')}
          >
            <RotateCcw size={13} />
            {t('timeline.restart')}
          </button>

          {isMultiScene && (
            <button
              type="button"
              className={`studio-btn ${loopCurrentScene ? 'active' : ''}`}
              onClick={onToggleLoopScene}
              title={
                loopCurrentScene
                  ? t('timeline.loopSceneOnTitle')
                  : t('timeline.loopSceneOffTitle')
              }
            >
              <Repeat1 size={13} />
              {t('timeline.loopSceneBtn')}
            </button>
          )}

          <button
            type="button"
            className="studio-btn"
            onClick={() => jumpStep(-1)}
            disabled={stepStarts.length === 0}
            title={t('timeline.prevStepTitle')}
          >
            <SkipBack size={13} />
          </button>
          <button
            type="button"
            className="studio-btn"
            onClick={() => jumpStep(1)}
            disabled={stepStarts.length === 0}
            title={t('timeline.nextStepTitle')}
          >
            <SkipForward size={13} />
          </button>

          <span
            style={{
              marginLeft: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            {formatTime(tMs)} / {formatTime(total)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {statusLabel && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('timeline.nowPrefix')}
              <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {statusLabel}
              </strong>
            </span>
          )}

          <div className="studio-pill-group" title={t('timeline.speedTitle')}>
            {SPEED_OPTIONS.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`studio-pill-item ${speed === sp ? 'active' : ''}`}
                onClick={() => onChangeSpeed(sp)}
                style={{ padding: '0 7px', fontSize: 11.5 }}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive step/scene blocks & scrubber track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        style={{
          position: 'relative',
          height: 28,
          borderRadius: 7,
          background: '#0d1117',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {singleTimeline ? (
          <>
            {singleTimeline.steps.map((step, idx) => {
              const widthPct = ((step.endMs - step.startMs) / total) * 100;
              const isCurrent =
                idx === singleStepIdx && tMs < singleTimeline.outroStartMs;
              const isPast = tMs >= step.endMs;
              return (
                <div
                  key={step.step.id}
                  title={t('timeline.stepTitle', {
                    num: idx + 1,
                    title: step.step.title,
                  })}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSeek(step.startMs);
                  }}
                  style={{
                    width: `${widthPct}%`,
                    minWidth: 10,
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    background: isCurrent
                      ? 'rgba(243, 201, 105, 0.22)'
                      : isPast
                      ? 'rgba(125, 216, 247, 0.12)'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 6px',
                    overflow: 'hidden',
                    fontSize: 11,
                    color: isCurrent
                      ? '#f7d584'
                      : isPast
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {idx + 1}. {step.step.title}
                  </span>
                </div>
              );
            })}

            {singleTimeline.totalDurationMs > singleTimeline.outroStartMs && (
              <div
                style={{
                  flex: 1,
                  minWidth: 62,
                  padding: '0 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color:
                    tMs >= singleTimeline.outroStartMs
                      ? '#f7d584'
                      : 'var(--text-muted)',
                  background:
                    tMs >= singleTimeline.outroStartMs
                      ? 'rgba(243, 201, 105, 0.18)'
                      : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {t('timeline.outroLabel')}
              </div>
            )}
          </>
        ) : (
          compiledProject.segments.map((seg, idx) => {
            const segWidthPct = ((seg.endMs - seg.startMs) / total) * 100;
            const isCurrentScene =
              evalState.kind === 'scene' && evalState.sceneIndex === idx;
            const isPastScene = tMs >= seg.endMs;
            const trans = seg.transitionOut;
            const transWidthPct = trans
              ? ((trans.endMs - trans.startMs) / total) * 100
              : 0;
            const isCurrentTrans =
              evalState.kind === 'transition' &&
              evalState.fromSegment.sceneIndex === idx;
            const transDisplayName = trans
              ? pluginName(trans.id, trans.name)
              : '';

            return (
              <React.Fragment key={seg.scene.id}>
                <div
                  title={t('timeline.sceneBlockTitle', {
                    num: idx + 1,
                    title: seg.scene.title,
                  })}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSeek(seg.startMs);
                  }}
                  style={{
                    width: `${segWidthPct}%`,
                    minWidth: 28,
                    position: 'relative',
                    borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                    background: isCurrentScene
                      ? 'rgba(243, 201, 105, 0.2)'
                      : isPastScene
                      ? 'rgba(125, 216, 247, 0.11)'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    overflow: 'hidden',
                    fontSize: 11,
                    color: isCurrentScene
                      ? '#f7d584'
                      : isPastScene
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  }}
                >
                  {/* Subtle internal step tick marks */}
                  {seg.timeline.steps.slice(1).map((step) => {
                    const segDur = Math.max(1, seg.endMs - seg.startMs);
                    const tickPct = (step.startMs / segDur) * 100;
                    return (
                      <div
                        key={step.step.id}
                        style={{
                          position: 'absolute',
                          left: `${tickPct}%`,
                          top: 4,
                          bottom: 4,
                          width: 1,
                          background: 'rgba(255, 255, 255, 0.08)',
                          pointerEvents: 'none',
                        }}
                      />
                    );
                  })}
                  <span
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('timeline.sceneBlockLabel', {
                      num: idx + 1,
                      title: seg.scene.title,
                    })}
                  </span>
                </div>

                {trans && (
                  <div
                    title={t('timeline.transitionBlockTitle', {
                      name: transDisplayName,
                    })}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onSeek((trans.startMs + trans.endMs) / 2);
                    }}
                    style={{
                      width: `${transWidthPct}%`,
                      minWidth: 26,
                      borderRight: '1px solid rgba(125, 216, 247, 0.22)',
                      background: isCurrentTrans
                        ? 'rgba(125, 216, 247, 0.28)'
                        : 'rgba(125, 216, 247, 0.1)',
                      color: '#7dd8f7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      padding: '0 3px',
                    }}
                  >
                    {transitionShort(trans.id, transDisplayName)}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}

        {/* Scrubber Playhead */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${playheadPct}%`,
            width: 2,
            background: '#f3c969',
            boxShadow: '0 0 8px rgba(243, 201, 105, 0.85)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: -5,
              width: 12,
              height: 6,
              borderRadius: 2,
              background: '#f3c969',
            }}
          />
        </div>
      </div>
    </footer>
  );
};
