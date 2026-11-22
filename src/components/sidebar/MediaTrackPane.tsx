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
        text: '新字幕讲解内容',
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
            字幕轨 ({cues.length} 条)
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
            画面显示字幕
          </label>
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          <button
            type="button"
            className="studio-btn active"
            style={{ flex: 1, height: 26, fontSize: 11, padding: '0 6px' }}
            onClick={handleAutoGenerate}
            title="按当前各幕节点与步骤时间自动生成字幕"
          >
            <Sparkles size={11} />
            自动生成
          </button>
          <button
            type="button"
            className="studio-btn"
            style={{ height: 26, fontSize: 11, padding: '0 8px' }}
            onClick={handleAddCue}
            title="手动添加一条字幕"
          >
            <Plus size={11} />
            新增
          </button>
          <button
            type="button"
            className="studio-btn"
            style={{ height: 26, fontSize: 11, padding: '0 8px' }}
            onClick={onExportSrt}
            disabled={cues.length === 0}
            title="导出通用 .srt 字幕文件"
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
            暂无字幕，点击「自动生成」即可一键提取各节点讲解词并同步写入预览与导出视频。
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
                    title="跳转并预览此字幕"
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
                    aria-label={`字幕 ${idx + 1} 开始时间(秒)`}
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
                    title="开始时间（秒）"
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    ~
                  </span>
                  <input
                    type="number"
                    className="studio-input"
                    step={0.1}
                    min={0.2}
                    aria-label={`字幕 ${idx + 1} 结束时间(秒)`}
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
                    title="结束时间（秒）"
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    s
                  </span>

                  <button
                    type="button"
                    className="studio-btn danger"
                    onClick={() => removeCue(cue.id)}
                    title="删除此字幕"
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
                  placeholder="输入字幕内容..."
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
            配音 / 背景音轨
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
            {audioTrack ? '替换音频' : '导入音频'}
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
            支持导入 MP3 / WAV / M4A 等配音或背景音乐，工作室播放及 0.75x~2x 倍速预览时会自动与画板时间轴同步（注：浏览器实时视频导出目前仅含画面，如需合成音轨可使用顶栏「FFmpeg 帧包」按包内命令混流）。
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
                title="移除音轨"
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
                起始偏移(ms)
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
                {audioTrack.muted ? '已静音' : '开启'}
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
              音量 {Math.round(audioTrack.volume * 100)}%
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
