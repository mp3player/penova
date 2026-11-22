import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AspectRatio,
  clearAllOffsets,
  LessonScene,
  Point,
  TransitionId,
  updateNodeInTree,
} from '../model/scene';
import {
  cloneProject,
  cloneSceneWithDetails,
  createBlankScene,
  LessonProject,
  SubtitleCue,
} from '../model/project';
import {
  createHistory,
  HistoryState,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
} from '../model/history';
import {
  clearProjectDraft,
  loadProjectDraft,
  parseProjectFromJson,
  saveProjectDraft,
  serializeProjectToJson,
} from '../model/projectStorage';
import { PRESET_PROJECTS } from '../model/presets';
import {
  compileProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';
import { serializeSubtitlesToSrt } from '../engine/subtitle/subtitleEngine';
import { triggerBlobDownload } from '../engine/export/videoExporter';
import { safeFilename } from '../plugins/exporters/helpers';

export interface UseProjectWorkspaceParams {
  tMs: number;
  setTMs: React.Dispatch<React.SetStateAction<number>>;
  tMsRef: React.MutableRefObject<number>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (msg: string) => void;
}

export function useProjectWorkspace({
  tMs,
  setTMs,
  tMsRef,
  setIsPlaying,
  setSelectedNodeId,
  showToast,
}: UseProjectWorkspaceParams) {
  const [history, setHistory] = useState<HistoryState<LessonProject>>(() =>
    createHistory(loadProjectDraft() ?? cloneProject(PRESET_PROJECTS[0]))
  );
  const project = history.present;
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  const pendingSceneSeekRef = useRef<number | null>(null);
  const lastCoalesceRef = useRef<{ key: string | null; at: number }>({
    key: null,
    at: 0,
  });

  const safeSceneIndex = Math.min(
    activeSceneIndex,
    Math.max(0, project.scenes.length - 1)
  );
  const activeScene = project.scenes[safeSceneIndex];

  const activeSceneIndexRef = useRef(safeSceneIndex);
  activeSceneIndexRef.current = safeSceneIndex;

  const compiledTimelineBase = useMemo(
    () => compileProjectTimeline(project),
    // Subtitle edits must not trigger layout or timeline recompilation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id, project.title, project.aspectRatio, project.scenes]
  );

  const compiledProject = useMemo(
    () => ({ ...compiledTimelineBase, project }),
    [compiledTimelineBase, project]
  );

  const evalState = useMemo(
    () => evaluateProjectAt(compiledProject, tMs),
    [compiledProject, tMs]
  );

  const commitProject = useCallback(
    (
      updater: (prev: LessonProject) => LessonProject,
      options?: { coalesceKey?: string }
    ) => {
      const now = Date.now();
      const key = options?.coalesceKey ?? null;
      const shouldCoalesce =
        Boolean(key) &&
        lastCoalesceRef.current.key === key &&
        now - lastCoalesceRef.current.at < 700;

      lastCoalesceRef.current = { key, at: now };

      setHistory((prev) =>
        pushHistory(prev, updater(prev.present), { coalesce: shouldCoalesce })
      );
    },
    []
  );

  const handleUndo = useCallback(() => {
    lastCoalesceRef.current = { key: null, at: 0 };
    setSelectedNodeId(null);
    setHistory((prev) => undoHistory(prev));
  }, [setSelectedNodeId]);

  const handleRedo = useCallback(() => {
    lastCoalesceRef.current = { key: null, at: 0 };
    setSelectedNodeId(null);
    setHistory((prev) => redoHistory(prev));
  }, [setSelectedNodeId]);

  // Auto-save working project draft cleanly to localStorage
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveProjectDraft(project);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project]);

  // Apply deferred scene seek after add / duplicate / move / delete recomputes timeline offsets
  useEffect(() => {
    const targetIdx = pendingSceneSeekRef.current;
    if (targetIdx === null) return;
    pendingSceneSeekRef.current = null;
    const clampedIdx = Math.max(
      0,
      Math.min(targetIdx, compiledProject.segments.length - 1)
    );
    const seg = compiledProject.segments[clampedIdx];
    if (seg) {
      setActiveSceneIndex(clampedIdx);
      tMsRef.current = seg.startMs;
      setTMs(seg.startMs);
    }
  }, [compiledProject, setTMs, tMsRef]);

  // Clamp tMs when scene changes shorten total duration
  useEffect(() => {
    setTMs((prev) => Math.min(prev, compiledProject.totalDurationMs));
  }, [compiledProject.totalDurationMs, setTMs]);

  // Automatically track active scene when playback or scrubbing enters a different scene segment
  useEffect(() => {
    if (
      evalState.kind === 'scene' &&
      evalState.sceneIndex !== activeSceneIndexRef.current &&
      evalState.sceneIndex < project.scenes.length &&
      pendingSceneSeekRef.current === null
    ) {
      setActiveSceneIndex(evalState.sceneIndex);
      setSelectedNodeId(null);
    }
  }, [evalState, project.scenes.length, setSelectedNodeId]);

  const updateActiveScene = useCallback(
    (updater: (prev: LessonScene) => LessonScene) => {
      commitProject((prevProj) => {
        const idx = Math.min(
          activeSceneIndexRef.current,
          Math.max(0, prevProj.scenes.length - 1)
        );
        return {
          ...prevProj,
          scenes: prevProj.scenes.map((s, i) => (i === idx ? updater(s) : s)),
        };
      });
    },
    [commitProject]
  );

  const applyPreset = (
    presetId: string,
    options?: { clearDraft?: boolean }
  ) => {
    const found = PRESET_PROJECTS.find((p) => p.id === presetId);
    if (!found) return;
    if (options?.clearDraft) {
      clearProjectDraft();
    }
    commitProject((prevProj) => {
      const cloned = cloneProject(found);
      const currentHand =
        prevProj.scenes[activeSceneIndexRef.current]?.handStyle;
      return {
        ...cloned,
        aspectRatio: prevProj.aspectRatio,
        scenes: cloned.scenes.map((s) => ({
          ...s,
          aspectRatio: prevProj.aspectRatio,
          handStyle: currentHand ?? s.handStyle,
        })),
      };
    });
    setActiveSceneIndex(0);
    setSelectedNodeId(null);
    tMsRef.current = 0;
    setTMs(0);
    setIsPlaying(true);
    if (options?.clearDraft) {
      showToast(`已恢复模板默认内容：${found.title}`);
    }
  };

  const handleSelectPreset = (presetId: string) => applyPreset(presetId);

  const handleResetPreset = (presetId: string) =>
    applyPreset(presetId, { clearDraft: true });

  const handleSelectScene = (index: number) => {
    const seg = compiledProject.segments[index];
    if (!seg) return;
    setIsPlaying(false);
    setSelectedNodeId(null);
    setActiveSceneIndex(index);
    tMsRef.current = seg.startMs;
    setTMs(seg.startMs);
  };

  const handleAddScene = () => {
    setIsPlaying(false);
    setSelectedNodeId(null);
    commitProject((prev) => {
      const nextIdx = prev.scenes.length;
      const newScene = createBlankScene(
        prev.scenes[activeSceneIndexRef.current] ?? prev.scenes[0],
        nextIdx
      );
      const nextScenes = prev.scenes.map((s, i) =>
        i === prev.scenes.length - 1 && !s.transitionOut
          ? {
              ...s,
              transitionOut: {
                type:
                  s.theme === 'letter-paper'
                    ? 'page-turn'
                    : 'chalkboard-eraser',
              },
            }
          : s
      );
      pendingSceneSeekRef.current = nextIdx;
      return {
        ...prev,
        scenes: [...nextScenes, newScene],
      };
    });
  };

  const handleDuplicateScene = (index: number) => {
    setIsPlaying(false);
    setSelectedNodeId(null);
    commitProject((prev) => {
      const target = prev.scenes[index];
      if (!target) return prev;
      const cloned = cloneSceneWithDetails(target);
      cloned.id = `${target.id}-copy-${Date.now().toString(36)}`;
      cloned.title = `${target.title}（副本）`;
      cloned.transitionOut = target.transitionOut ?? {
        type:
          target.theme === 'letter-paper' ? 'page-turn' : 'chalkboard-eraser',
      };
      const nextScenes = [...prev.scenes];
      nextScenes.splice(index + 1, 0, cloned);
      pendingSceneSeekRef.current = index + 1;
      return {
        ...prev,
        scenes: nextScenes,
      };
    });
  };

  const handleDeleteScene = (index: number) => {
    if (project.scenes.length <= 1) return;
    setIsPlaying(false);
    setSelectedNodeId(null);
    commitProject((prev) => {
      if (prev.scenes.length <= 1) return prev;
      const nextScenes = prev.scenes.filter((_, i) => i !== index);
      pendingSceneSeekRef.current = Math.min(index, nextScenes.length - 1);
      return {
        ...prev,
        scenes: nextScenes,
      };
    });
  };

  const handleMoveScene = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= project.scenes.length) return;
    setIsPlaying(false);
    setSelectedNodeId(null);
    commitProject((prev) => {
      const nextScenes = [...prev.scenes];
      const [item] = nextScenes.splice(index, 1);
      nextScenes.splice(target, 0, item);
      pendingSceneSeekRef.current = target;
      return {
        ...prev,
        scenes: nextScenes,
      };
    });
  };

  const handleChangeTransition = (
    sceneIndex: number,
    transitionId: TransitionId
  ) => {
    commitProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, transitionOut: { type: transitionId } } : s
      ),
    }));
  };

  const handleNudgeNode = (nodeId: string, offset: Point) => {
    commitProject(
      (prevProj) => {
        const idx = Math.min(
          activeSceneIndexRef.current,
          Math.max(0, prevProj.scenes.length - 1)
        );
        return {
          ...prevProj,
          scenes: prevProj.scenes.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  nodes: updateNodeInTree(s.nodes, nodeId, (n) => ({
                    ...n,
                    offset,
                  })),
                }
              : s
          ),
        };
      },
      { coalesceKey: `nudge:${nodeId}` }
    );
  };

  const handleResetAdjustments = () => {
    updateActiveScene((prev) => ({
      ...prev,
      nodes: clearAllOffsets(prev.nodes),
    }));
  };

  const handleChangeAspectRatio = (aspectRatio: AspectRatio) => {
    commitProject((prev) => ({
      ...prev,
      aspectRatio,
      scenes: prev.scenes.map((s) => ({ ...s, aspectRatio })),
    }));
  };

  const handleSaveProjectJson = () => {
    const json = serializeProjectToJson(project);
    const filename = safeFilename(project.title, 'penova.json');
    triggerBlobDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      filename
    );
    showToast(`已保存工程：${filename}`);
  };

  const handleImportProjectJson = async (file: File) => {
    try {
      const raw = await file.text();
      const { project: imported, warnings } = parseProjectFromJson(raw);
      lastCoalesceRef.current = { key: null, at: 0 };
      setHistory(resetHistory(imported));
      setActiveSceneIndex(0);
      setSelectedNodeId(null);
      setIsPlaying(false);
      tMsRef.current = 0;
      setTMs(0);
      showToast(
        warnings.length > 0
          ? `已导入工程（${warnings[0]}）`
          : `已导入工程：${imported.title}`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入工程文件失败');
    }
  };

  const handleUpdateSubtitles = (cues: SubtitleCue[]) => {
    commitProject((prev) => ({ ...prev, subtitles: cues }));
  };

  const handleToggleShowSubtitles = (show: boolean) => {
    commitProject((prev) => ({ ...prev, showSubtitles: show }));
  };

  const handleExportSrt = () => {
    const cues = project.subtitles ?? [];
    if (cues.length === 0) return;
    const srt = serializeSubtitlesToSrt(cues);
    const filename = safeFilename(project.title, 'srt');
    triggerBlobDownload(
      new Blob([srt], { type: 'application/x-subrip;charset=utf-8' }),
      filename
    );
    showToast(`已导出字幕：${filename}`);
  };

  return {
    project,
    safeSceneIndex,
    activeScene,
    compiledProject,
    evalState,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    handleUndo,
    handleRedo,
    updateActiveScene,
    handleSelectPreset,
    handleResetPreset,
    handleSelectScene,
    handleAddScene,
    handleDuplicateScene,
    handleDeleteScene,
    handleMoveScene,
    handleChangeTransition,
    handleNudgeNode,
    handleResetAdjustments,
    handleChangeAspectRatio,
    handleSaveProjectJson,
    handleImportProjectJson,
    handleUpdateSubtitles,
    handleToggleShowSubtitles,
    handleExportSrt,
  };
}
