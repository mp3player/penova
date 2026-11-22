import React, { useCallback, useRef, useState } from 'react';
import {
  CameraMode,
  HandStyle,
  LayoutMode,
  ThemeId,
} from './model/scene';
import {
  exportProjectVideo,
  triggerBlobDownload,
} from './engine/export/videoExporter';
import { usePlaybackAudio } from './hooks/usePlaybackAudio';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';
import { TopBar } from './components/TopBar';
import { SidebarEditor } from './components/SidebarEditor';
import { CanvasStage } from './components/CanvasStage';
import { SceneStrip } from './components/SceneStrip';
import { TimelineBar } from './components/TimelineBar';

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tMs, setTMs] = useState(0);
  const tMsRef = useRef(tMs);
  tMsRef.current = tMs;

  const [exporterId, setExporterId] = useState<string>('mediarecorder-video');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3600);
  }, []);

  const workspace = useProjectWorkspace({
    tMs,
    setTMs,
    tMsRef,
    setIsPlaying,
    setSelectedNodeId,
    showToast,
  });

  const playback = usePlaybackAudio({
    compiledProject: workspace.compiledProject,
    evalState: workspace.evalState,
    activeTheme: workspace.activeScene.theme,
    isPlaying,
    setIsPlaying,
    tMs,
    setTMs,
    tMsRef,
    exporting,
    onUndo: workspace.handleUndo,
    onRedo: workspace.handleRedo,
    showToast,
  });

  const handleStartExport = async () => {
    if (exporting) return;
    setIsPlaying(false);
    setExporting(true);
    setExportProgress(0);

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await exportProjectVideo(workspace.compiledProject, {
        fps: 30,
        exporterId,
        onProgress: setExportProgress,
        signal: controller.signal,
      });
      triggerBlobDownload(result.blob, result.filename);
      showToast(
        `已导出：${result.filename}${result.summary ? `（${result.summary}）` : ''}`
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        showToast('已取消导出');
      } else {
        const msg = err instanceof Error ? err.message : '导出失败';
        showToast(msg);
      }
    } finally {
      setExporting(false);
      exportAbortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
  };

  return (
    <div className="studio-shell">
      <TopBar
        project={workspace.project}
        scene={workspace.activeScene}
        sidebarOpen={sidebarOpen}
        canUndo={workspace.canUndo}
        canRedo={workspace.canRedo}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onSelectPreset={workspace.handleSelectPreset}
        onResetPreset={workspace.handleResetPreset}
        onChangeTheme={(theme: ThemeId) =>
          workspace.updateActiveScene((prev) => ({ ...prev, theme }))
        }
        onChangeAspectRatio={workspace.handleChangeAspectRatio}
        onUndo={workspace.handleUndo}
        onRedo={workspace.handleRedo}
        onSaveProjectJson={workspace.handleSaveProjectJson}
        onImportProjectJson={workspace.handleImportProjectJson}
        exporterId={exporterId}
        onChangeExporterId={setExporterId}
        exporting={exporting}
        exportProgress={exportProgress}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
      />

      <div className="studio-body">
        {sidebarOpen && (
          <SidebarEditor
            project={workspace.project}
            compiledProject={workspace.compiledProject}
            scene={workspace.activeScene}
            selectedNodeId={selectedNodeId}
            audioTrack={playback.audioTrack}
            onSelectNode={setSelectedNodeId}
            onUpdateScene={workspace.updateActiveScene}
            onUpdateSubtitles={workspace.handleUpdateSubtitles}
            onToggleShowSubtitles={workspace.handleToggleShowSubtitles}
            onSeekToMs={playback.handleSeek}
            onImportAudioFile={playback.handleImportAudioFile}
            onUpdateAudioTrack={(updater) =>
              playback.setAudioTrack((prev) => (prev ? updater(prev) : prev))
            }
            onRemoveAudioTrack={() => playback.setAudioTrack(null)}
            onExportSrt={workspace.handleExportSrt}
          />
        )}

        <CanvasStage
          scene={workspace.activeScene}
          compiledProject={workspace.compiledProject}
          tMs={tMs}
          isPlaying={isPlaying}
          selectedNodeId={selectedNodeId}
          soundEnabled={playback.soundEnabled}
          onSelectNode={setSelectedNodeId}
          onChangeLayoutMode={(layoutMode: LayoutMode) =>
            workspace.updateActiveScene((prev) => ({ ...prev, layoutMode }))
          }
          onChangeCameraMode={(cameraMode: CameraMode) =>
            workspace.updateActiveScene((prev) => ({ ...prev, cameraMode }))
          }
          onChangeHandStyle={(handStyle: HandStyle) =>
            workspace.updateActiveScene((prev) => ({ ...prev, handStyle }))
          }
          onToggleSound={() => playback.setSoundEnabled((s) => !s)}
          onNudgeNode={workspace.handleNudgeNode}
          onResetAdjustments={workspace.handleResetAdjustments}
        />
      </div>

      <SceneStrip
        project={workspace.project}
        activeSceneIndex={workspace.safeSceneIndex}
        onSelectScene={workspace.handleSelectScene}
        onAddScene={workspace.handleAddScene}
        onDuplicateScene={workspace.handleDuplicateScene}
        onDeleteScene={workspace.handleDeleteScene}
        onMoveScene={workspace.handleMoveScene}
        onChangeTransition={workspace.handleChangeTransition}
      />

      <TimelineBar
        compiledProject={workspace.compiledProject}
        tMs={tMs}
        isPlaying={isPlaying}
        speed={playback.speed}
        onTogglePlay={playback.handleTogglePlay}
        onRestart={playback.handleRestart}
        onSeek={playback.handleSeek}
        onChangeSpeed={playback.setSpeed}
      />

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 126,
            right: 20,
            zIndex: 50,
            padding: '9px 14px',
            borderRadius: 9,
            background: '#1e2631',
            border: '1px solid rgba(243, 201, 105, 0.45)',
            color: 'var(--text-primary)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
            fontSize: 12.5,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default App;
