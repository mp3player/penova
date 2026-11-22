import React, { useRef } from 'react';
import {
  Clock,
  Download,
  Music,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AudioTrackState } from '../../engine/audio/voiceTrackPlayer';
import { generateAutoSubtitles } from '../../engine/subtitle/subtitleEngine';
import { CompiledProjectTimeline } from '../../engine/timeline/projectTimeline';
import { LessonProject, SubtitleCue } from '../../model/project';
import { useI18n } from '../../i18n';

interface MediaTrackPaneProps {
  project: LessonProject;
  compiledProject: CompiledProjectTimeline;
  audioTrack: AudioTrackState | null;
  onUpdateSubtitles: (cues: SubtitleCue[]) => void;
  onToggleShowSubtitles: (show: boolean) => void;
  onSeekToMs: (ms: number) => void;
  onImportAudioFile: (file: File) => void;
  onUpdateAudioTrack: (
    updater: (prev: AudioTrackState) => AudioTrackState
  ) => void;
  onRemoveAudioTrack: () => void;
  onExportSrt: () => void;
}

export const MediaTrackPane: React.FC<MediaTrackPaneProps> = ({
  project,
  compiledProject,
  audioTrack,
  onUpdateSubtitles,
  onToggleShowSubtitles,
  onSeekToMs,
  onImportAudioFile,
  onUpdateAudioTrack,
  onRemoveAudioTrack,
  onExportSrt,
}) => {
  const { t } = useI18n();
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const cues = project.subtitles ?? [];
  const showSubtitles = project.showSubtitles !== false;

  const handleAutoGenerate = () => {
    const generated = generateAutoSubtitles(compiledProject);
    onUpdateSubtitles(generated);
  };

  const handleAddCue = () => {
    const lastEnd = cues.length > 0 ? cues[cues.length - 1].endMs : 0;
    const startMs = Math.min(
      Math.max(0, lastEnd),
      Math.max(0, compiledProject.totalDurationMs - 2000)
    );
    const endMs = Math.min(
      compiledProject.totalDurationMs,
      startMs + 2500
    );
    onUpdateSubtitles([
      ...cues,
      {
        id: `sub-custom-${Date.now().toString(36)}`,
        startMs,
        endMs: Math.max(startMs + 500, endMs),
        text: t('media.newCueDefaultText'),
      },
    ]);
  };

  const updateCue = (id: string, patch: Partial<SubtitleCue>) => {
    onUpdateSubtitles(
      cues.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const removeCue = (id: string) => {
    onUpdateSubtitles(cues.filter((c) => c.id !== id));
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Subtitle Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 10,
          borderRadius: 8,
          background: '#11161d',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {t('media.subtitlesHeading', { count: cues.length })}
          </span>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showSubtitles}
              onChange={(e) => onToggleShowSubtitles(e.target.checked)}
            />
            {t('media.showSubtitles')}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          <button
            type="button"
            className="studio-btn active"
            style={{ flex: 1, height: 26, fontSize: 11, padding: '0 6px' }}
            onClick={handleAutoGenerate}
            title={t('media.autoGenTitle')}
          >
            <Sparkles size={11} />
            {t('media.autoGenBtn')}
          </button>
          <button
            type="button"
            className="studio-btn"
            style={{ height: 26, fontSize: 11, padding: '0 8px' }}
            onClick={handleAddCue}
            title={t('media.addCueTitle')}
          >
            <Plus size={11} />
            {t('media.addCueBtn')}
          </button>
          <button
            type="button"
            className="studio-btn"
            style={{ height: 26, fontSize: 11, padding: '0 8px' }}
            onClick={onExportSrt}
            disabled={cues.length === 0}
            title={t('media.exportSrtTitle')}
          >
            <Download size={11} />
            .srt
          </button>
        </div>

        {cues.length === 0 ? (
          <div
            style={{
              padding: '14px 10px',
              textAlign: 'center',
              fontSize: 11.5,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              background: '#0d1117',
              borderRadius: 6,
            }}
          >
            {t('media.emptySubtitlesHint')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cues.map((cue, idx) => (
              <div
                key={cue.id}
                style={{
                  padding: 7,
                  borderRadius: 6,
                  background: '#161c24',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    className="studio-btn"
                    onClick={() => onSeekToMs(cue.startMs + 20)}
                    title={t('media.seekCueTitle')}
                    style={{
                      height: 22,
                      padding: '0 5px',
                      fontSize: 10.5,
                      color: 'var(--accent)',
                    }}
                  >
                    <Clock size={10} />#{idx + 1}
                  </button>

                  <input
                    type="number"
                    className="studio-input"
                    step={0.1}
                    min={0}
                    aria-label={t('media.cueStartAria', { num: idx + 1 })}
                    value={Number((cue.startMs / 1000).toFixed(1))}
                    onChange={(e) => {
                      const nextStart = Math.max(
                        0,
                        Math.round((Number(e.target.value) || 0) * 1000)
                      );
                      updateCue(cue.id, {
                        startMs: nextStart,
                        endMs: Math.max(nextStart + 200, cue.endMs),
                      });
                    }}
                    style={{
                      width: 56,
                      height: 22,
                      padding: '0 4px',
                      fontSize: 11,
                    }}
                    title={t('media.cueStartTitle')}
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    ~
                  </span>
                  <input
                    type="number"
                    className="studio-input"
                    step={0.1}
                    min={0.2}
                    aria-label={t('media.cueEndAria', { num: idx + 1 })}
                    value={Number((cue.endMs / 1000).toFixed(1))}
                    onChange={(e) => {
                      const nextEnd = Math.max(
                        cue.startMs + 200,
                        Math.round((Number(e.target.value) || 0) * 1000)
                      );
                      updateCue(cue.id, { endMs: nextEnd });
                    }}
                    style={{
                      width: 56,
                      height: 22,
                      padding: '0 4px',
                      fontSize: 11,
                    }}
                    title={t('media.cueEndTitle')}
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    s
                  </span>

                  <button
                    type="button"
                    className="studio-btn danger"
                    onClick={() => removeCue(cue.id)}
                    title={t('media.deleteCueTitle')}
                    style={{
                      marginLeft: 'auto',
                      width: 22,
                      height: 22,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                <input
                  className="studio-input"
                  value={cue.text}
                  onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                  placeholder={t('media.cuePlaceholder')}
                  style={{ height: 26, fontSize: 11.5, padding: '2px 7px' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audio / Voiceover Track Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 10,
          borderRadius: 8,
          background: '#11161d',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <Music size={12} />
            {t('media.audioHeading')}
          </span>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImportAudioFile(file);
              }
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="studio-btn"
            style={{ height: 25, fontSize: 11, padding: '0 8px' }}
            onClick={() => audioInputRef.current?.click()}
          >
            <Upload size={11} />
            {audioTrack ? t('media.replaceAudio') : t('media.importAudio')}
          </button>
        </div>

        {!audioTrack ? (
          <div
            style={{
              padding: '10px',
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              background: '#0d1117',
              borderRadius: 6,
            }}
          >
            {t('media.audioEmptyHint')}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              padding: 8,
              borderRadius: 6,
              background: '#161c24',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--accent)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={audioTrack.name}
              >
                {audioTrack.name}
              </span>
              <button
                type="button"
                className="studio-btn danger"
                onClick={onRemoveAudioTrack}
                title={t('media.removeAudioTitle')}
                style={{
                  width: 22,
                  height: 22,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                {t('media.audioOffsetLabel')}
                <input
                  type="number"
                  className="studio-input"
                  step={100}
                  value={audioTrack.offsetMs}
                  onChange={(e) =>
                    onUpdateAudioTrack((prev) => ({
                      ...prev,
                      offsetMs: Number(e.target.value) || 0,
                    }))
                  }
                  style={{ width: 68, height: 24, padding: '0 6px', fontSize: 11 }}
                />
              </label>

              <button
                type="button"
                className={`studio-btn ${audioTrack.muted ? '' : 'active'}`}
                onClick={() =>
                  onUpdateAudioTrack((prev) => ({
                    ...prev,
                    muted: !prev.muted,
                  }))
                }
                style={{ height: 24, padding: '0 7px', fontSize: 11 }}
              >
                {audioTrack.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                {audioTrack.muted
                  ? t('media.audioMuted')
                  : t('media.audioActive')}
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {t('media.audioVolumeLabel', {
                pct: Math.round(audioTrack.volume * 100),
              })}
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audioTrack.volume * 100)}
                onChange={(e) =>
                  onUpdateAudioTrack((prev) => ({
                    ...prev,
                    volume: Number(e.target.value) / 100,
                  }))
                }
                style={{ flex: 1 }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
