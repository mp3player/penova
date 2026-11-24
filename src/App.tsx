import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { getPresetProjects } from './model/presets';
import { usePlaybackAudio } from './hooks/usePlaybackAudio';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';
import { TopBar } from './components/TopBar';
import { SidebarEditor } from './components/SidebarEditor';
import { CanvasStage } from './components/CanvasStage';
import { SceneStrip } from './components/SceneStrip';
import { TimelineBar } from './components/TimelineBar';
import { useI18n } from './i18n';

export const App: React.FC = () => {
  const { locale, t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tMs, setTMs] = useState(0);
  const tMsRef = useRef(tMs);
  tMsRef.current = tMs;

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

  const activeSceneRange = useMemo(() => {
    const seg = workspace.compiledProject.segments[workspace.safeSceneIndex];
    if (!seg) {
      return { startMs: 0, endMs: workspace.compiledProject.totalDurationMs };
    }
    return { startMs: seg.startMs, endMs: seg.endMs };
  }, [workspace.compiledProject.segments, workspace.compiledProject.totalDurationMs, workspace.safeSceneIndex]);

  const handleSelectNode = useCallback(
    (nodeId: string | null, opts?: { reveal?: boolean }) => {
      setSelectedNodeId(nodeId);
      if (nodeId && opts?.reveal) {
        workspace.revealNodeOnTimeline(nodeId);
      }
    },
    [workspace]
  );

  const playback = usePlaybackAudio({
    compiledProject: workspace.compiledProject,
    evalState: workspace.evalState,
    activeTheme: workspace.activeScene.theme,
    activeSceneRange,
    selectedNodeId,
    isPlaying,
    setIsPlaying,
    tMs,
    setTMs,
    tMsRef,
    exporting,
    onUndo: workspace.handleUndo,
    onRedo: workspace.handleRedo,
    onDeleteSelectedNode: () => {
      if (selectedNodeId) workspace.handleDeleteNode(selectedNodeId);
    },
    onDuplicateSelectedNode: () => {
      if (selectedNodeId) workspace.handleDuplicateNode(selectedNodeId);
    },
    onClearSelection: () => setSelectedNodeId(null),
    showToast,
  });

  const handleStartExport = async (overrideExporterId?: string) => {
    if (exporting) return;
    setIsPlaying(false);
    setExporting(true);
    setExportProgress(0);

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await exportProjectVideo(workspace.compiledProject, {
        exporterId: overrideExporterId ?? 'mediarecorder-video',
        onProgress: setExportProgress,
        signal: controller.signal,
      });
      triggerBlobDownload(result.blob, result.filename);
      showToast(
        result.summary
          ? t('toast.exportedVideoWithSummary', {
              filename: result.filename,
              summary: result.summary,
            })
          : t('toast.exportedVideo', { filename: result.filename })
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        showToast(t('toast.exportCanceled'));
      } else {
        const msg = err instanceof Error ? err.message : t('toast.exportFailed');
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

  const matchingPreset = getPresetProjects(locale).find(
    (p) => p.id === workspace.project.id
  );

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
            onSelectNode={handleSelectNode}
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
            onApplyProjectScript={workspace.handleApplyProjectScript}
            onImportProjectFile={workspace.handleImportProjectJson}
            onExportProjectScript={workspace.handleExportProjectScript}
            onNotify={showToast}
          />
        )}

        <CanvasStage
          scene={workspace.activeScene}
          compiledProject={workspace.compiledProject}
          tMs={tMs}
          isPlaying={isPlaying}
          selectedNodeId={selectedNodeId}
          soundEnabled={playback.soundEnabled}
          restoredFromDraft={workspace.restoredFromDraft}
          onSelectNode={handleSelectNode}
          onPausePlayback={() => setIsPlaying(false)}
          onInlineEditNode={workspace.handleInlineUpdateNodeText}
          onDuplicateNode={workspace.handleDuplicateNode}
          onDeleteNode={workspace.handleDeleteNode}
          onResetToDefaultPreset={
            matchingPreset
              ? () => workspace.handleResetPreset(matchingPreset.id)
              : undefined
          }
          onDismissDraftBanner={workspace.dismissDraftBanner}
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
        loopCurrentScene={playback.loopCurrentScene}
        speed={playback.speed}
        onTogglePlay={playback.handleTogglePlay}
        onToggleLoopScene={() => playback.setLoopCurrentScene((l) => !l)}
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
