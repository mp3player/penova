import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AspectRatio,
  clearAllOffsets,
  findNodeById,
  LessonScene,
  Point,
  removeNodeInTree,
  SceneNode,
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
import { writeInlineNodeText } from '../studio/nodeSchemas';
import { getPresetProjects } from '../model/presets';
import { Locale, useI18n } from '../i18n';
import {
  clearSceneCompileCache,
  compileProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';
import { serializeSubtitlesToSrt } from '../engine/subtitle/subtitleEngine';
import {
  parseProjectScript,
  serializeProjectScript,
} from '../engine/parser/projectScript';
import { triggerBlobDownload } from '../engine/export/videoExporter';
import { getSceneFontPresetOption } from '../engine/render/fonts';
import { ensureCjkStrokeDataLoaded } from '../plugins';
import { clearGlyphCache } from '../engine/sketch/textStrokes';
import { safeFilename } from '../plugins/exporters/helpers';

export interface UseProjectWorkspaceParams {
  tMs: number;
  setTMs: React.Dispatch<React.SetStateAction<number>>;
  tMsRef: React.MutableRefObject<number>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (msg: string) => void;
}

function isUnmodifiedPreset(
  current: LessonProject,
  preset: LessonProject
): boolean {
  if (
    current.id !== preset.id ||
    current.scenes.length !== preset.scenes.length ||
    (current.subtitles && current.subtitles.length > 0)
  ) {
    return false;
  }
  const normalize = (proj: LessonProject) =>
    proj.scenes.map((s) => ({
      ...s,
      aspectRatio: '16:9' as const,
      handStyle: 'hand-chalk' as const,
    }));
  return (
    JSON.stringify(normalize(current)) === JSON.stringify(normalize(preset))
  );
}

export function useProjectWorkspace({
  tMs,
  setTMs,
  tMsRef,
  setIsPlaying,
  setSelectedNodeId,
  showToast,
}: UseProjectWorkspaceParams) {
  const { locale, t } = useI18n();
  const [initialDraft] = useState<LessonProject | null>(() => loadProjectDraft());
  const [restoredFromDraft, setRestoredFromDraft] = useState<boolean>(
    () => initialDraft !== null
  );
  const [history, setHistory] = useState<HistoryState<LessonProject>>(() =>
    createHistory(initialDraft ?? cloneProject(getPresetProjects(locale)[0]))
  );
  const project = history.present;
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const prevLocaleRef = useRef<Locale>(locale);

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

  const [fontVersion, setFontVersion] = useState(0);
  const sceneFontKey = project.scenes.map((s) => s.font ?? '').join('|');
  const hasVectorKaitiScene = project.scenes.some(
    (s) => s.font === 'kaiti-stroke'
  );

  useEffect(() => {
    let cancelled = false;
    ensureCjkStrokeDataLoaded({ includeOutlines: hasVectorKaitiScene })
      .then((loaded) => {
        if (cancelled || !loaded) return;
        clearGlyphCache();
        clearSceneCompileCache();
        setFontVersion((v) => v + 1);
      })
      .catch(() => {
        // Fallback to built-in glyph providers when static data assets are absent
      });
    return () => {
      cancelled = true;
    };
  }, [hasVectorKaitiScene]);

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const families = new Set<string>();
    for (const scene of project.scenes) {
      if (!scene.font || scene.font === 'theme-default') continue;
      for (const fam of getSceneFontPresetOption(scene.font).loadFamilies) {
        families.add(fam);
      }
    }
    if (families.size === 0) return;

    let cancelled = false;
    const tasks: Promise<FontFace[]>[] = [];
    for (const fam of families) {
      tasks.push(document.fonts.load(`400 20px "${fam}"`, '永Aa'));
      tasks.push(document.fonts.load(`700 20px "${fam}"`, '永Aa'));
    }
    Promise.all(tasks)
      .then(() => {
        if (cancelled) return;
        clearGlyphCache();
        clearSceneCompileCache();
        setFontVersion((v) => v + 1);
      })
      .catch(() => {
        // Ignore font load errors and rely on fallback family
      });
    return () => {
      cancelled = true;
    };
  }, [sceneFontKey, project.scenes]);

  const compiledTimelineBase = useMemo(
    () => compileProjectTimeline(project),
    // Subtitle edits must not trigger layout or timeline recompilation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id, project.title, project.aspectRatio, project.scenes, fontVersion]
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

  // When switching UI language on an untouched built-in preset, swap to its localized version
  useEffect(() => {
    const oldLocale = prevLocaleRef.current;
    if (oldLocale === locale) return;
    prevLocaleRef.current = locale;

    const oldPreset = getPresetProjects(oldLocale).find(
      (p) => p.id === project.id
    );
    const nextPreset = getPresetProjects(locale).find(
      (p) => p.id === project.id
    );
    if (!oldPreset || !nextPreset || !isUnmodifiedPreset(project, oldPreset)) {
      return;
    }

    const cloned = cloneProject(nextPreset);
    const currentHand = project.scenes[activeSceneIndexRef.current]?.handStyle;
    const localized: LessonProject = {
      ...cloned,
      aspectRatio: project.aspectRatio,
      scenes: cloned.scenes.map((s) => ({
        ...s,
        aspectRatio: project.aspectRatio,
        handStyle: currentHand ?? s.handStyle,
      })),
    };
    setHistory((prev) => ({
      ...prev,
      present: localized,
    }));
  }, [locale, project]);

  const applyPreset = (
    presetId: string,
    options?: { clearDraft?: boolean }
  ) => {
    const found = getPresetProjects(locale).find((p) => p.id === presetId);
    if (!found) return;
    if (options?.clearDraft) {
      clearProjectDraft();
    }
    setRestoredFromDraft(false);
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
      showToast(t('toast.presetReset', { title: found.title }));
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
        nextIdx,
        locale
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
      cloned.title = `${target.title}${t('workspace.sceneCopySuffix')}`;
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

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      updateActiveScene((prev) => ({
        ...prev,
        customSteps: undefined,
        nodes: removeNodeInTree(prev.nodes, nodeId),
      }));
      setSelectedNodeId((curr) => (curr === nodeId ? null : curr));
      showToast(t('toast.nodeDeleted'));
    },
    [setSelectedNodeId, showToast, t, updateActiveScene]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const target = findNodeById(activeScene.nodes, nodeId);
      if (!target) return;
      const suffix = Date.now().toString(36).slice(-4);
      const cloneWithFreshIds = (n: SceneNode): SceneNode => {
        const nextId = `${n.id}-copy-${suffix}`;
        if (n.type === 'group') {
          return {
            ...n,
            id: nextId,
            children: n.children.map(cloneWithFreshIds),
          };
        }
        return { ...n, id: nextId };
      };
      const cloned = cloneWithFreshIds(target);
      if (target.type !== 'connector') {
        cloned.offset = {
          x: (target.offset?.x ?? 0) + 28,
          y: (target.offset?.y ?? 0) + 28,
        };
      }
      updateActiveScene((prev) => {
        const idx = prev.nodes.findIndex((n) => n.id === nodeId);
        const nextNodes = [...prev.nodes];
        if (idx !== -1) {
          nextNodes.splice(idx + 1, 0, cloned);
        } else {
          nextNodes.push(cloned);
        }
        return {
          ...prev,
          customSteps: undefined,
          nodes: nextNodes,
        };
      });
      setSelectedNodeId(cloned.id);
      showToast(t('toast.nodeDuplicated'));
    },
    [activeScene.nodes, setSelectedNodeId, showToast, t, updateActiveScene]
  );

  const handleInlineUpdateNodeText = useCallback(
    (nodeId: string, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) return;
      updateActiveScene((prev) => ({
        ...prev,
        customSteps: undefined,
        nodes: updateNodeInTree(prev.nodes, nodeId, (node) =>
          writeInlineNodeText(node, trimmed, prev.nodes)
        ),
      }));
    },
    [updateActiveScene]
  );

  const revealNodeOnTimeline = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return;
      const seg = compiledProject.segments[safeSceneIndex];
      if (!seg) return;
      const matchedStep = seg.timeline.steps.find((s) =>
        s.step.nodeIds.includes(nodeId)
      );
      const localRevealMs = matchedStep
        ? matchedStep.endMs
        : seg.timeline.outroStartMs;
      const absRevealMs = Math.min(
        seg.endMs - 20,
        seg.startMs + Math.max(80, localRevealMs)
      );
      if (tMsRef.current < absRevealMs - 30 || tMsRef.current > seg.endMs) {
        setIsPlaying(false);
        tMsRef.current = absRevealMs;
        setTMs(absRevealMs);
      }
    },
    [compiledProject.segments, safeSceneIndex, setIsPlaying, setTMs, tMsRef]
  );

  const dismissDraftBanner = useCallback(() => {
    setRestoredFromDraft(false);
  }, []);

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
    showToast(t('toast.projectSaved', { filename }));
  };

  const handleImportProjectJson = async (file: File) => {
    try {
      const raw = await file.text();
      const lowerName = file.name.toLowerCase();
      const isScriptFile =
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.txt') ||
        !/^\s*[\[{]/.test(raw);

      const { project: imported, warnings } = isScriptFile
        ? parseProjectScript(raw, {
            fallbackTitle: file.name.replace(/\.(penova\.)?(md|txt)$/i, ''),
            fallbackAspectRatio: project.aspectRatio,
          })
        : parseProjectFromJson(raw);

      lastCoalesceRef.current = { key: null, at: 0 };
      setRestoredFromDraft(false);
      setHistory(resetHistory(imported));
      setActiveSceneIndex(0);
      setSelectedNodeId(null);
      setIsPlaying(false);
      tMsRef.current = 0;
      setTMs(0);
      showToast(
        warnings.length > 0
          ? t('toast.projectImportedWarning', { warning: warnings[0] })
          : t('toast.projectImported', { title: imported.title })
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t('toast.projectImportFailed')
      );
    }
  };

  const handleApplyProjectScript = (
    raw: string
  ): { ok: boolean; warnings: string[] } => {
    try {
      const { project: compiledProj, warnings } = parseProjectScript(raw, {
        fallbackTitle: project.title,
        fallbackAspectRatio: project.aspectRatio,
      });
      commitProject(() => compiledProj);
      setActiveSceneIndex(0);
      setSelectedNodeId(null);
      tMsRef.current = 0;
      setTMs(0);
      setIsPlaying(true);
      showToast(
        warnings.length > 0
          ? t('toast.scriptAppliedWarning', { warning: warnings[0] })
          : t('toast.scriptApplied', {
              title: compiledProj.title,
              count: compiledProj.scenes.length,
            })
      );
      return { ok: true, warnings };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t('toast.scriptApplyFailed');
      showToast(msg);
      return { ok: false, warnings: [msg] };
    }
  };

  const handleExportProjectScript = () => {
    const md = serializeProjectScript(project);
    const filename = safeFilename(project.title, 'penova.md');
    triggerBlobDownload(
      new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      filename
    );
    showToast(t('toast.scriptExported', { filename }));
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
    showToast(t('toast.srtExported', { filename }));
  };

  return {
    project,
    safeSceneIndex,
    activeScene,
    compiledProject,
    evalState,
    restoredFromDraft,
    dismissDraftBanner,
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
    handleDeleteNode,
    handleDuplicateNode,
    handleInlineUpdateNodeText,
    revealNodeOnTimeline,
    handleChangeAspectRatio,
    handleSaveProjectJson,
    handleImportProjectJson,
    handleApplyProjectScript,
    handleExportProjectScript,
    handleUpdateSubtitles,
    handleToggleShowSubtitles,
    handleExportSrt,
  };
}
