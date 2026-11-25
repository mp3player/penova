import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Copy,
  FileText,
  GitFork,
  Hand,
  Maximize2,
  Move,
  Network,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CameraMode,
  findNodeById,
  HandStyle,
  hasAnyOffset,
  LayoutMode,
  LessonScene,
  Point,
} from '../model/scene';
import { readInlineNodeText } from '../studio/nodeSchemas';
import {
  cameraRegistry,
  handRegistry,
  LayoutIconKind,
  layoutRegistry,
  PositionedSceneNode,
  useRegistryList,
} from '../plugins';
import { CameraState } from '../engine/camera/cameraDirector';
import { renderProjectFrame } from '../engine/render/projectRenderer';
import {
  getActiveCamera,
  screenToWorld,
  worldToScreen,
} from '../engine/render/sceneRenderer';
import {
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';
import { useI18n } from '../i18n';

interface CanvasStageProps {
  scene: LessonScene;
  compiledProject: CompiledProjectTimeline;
  tMs: number;
  isPlaying: boolean;
  selectedNodeId: string | null;
  soundEnabled: boolean;
  restoredFromDraft: boolean;
  onSelectNode: (nodeId: string | null, opts?: { reveal?: boolean }) => void;
  onPausePlayback: () => void;
  onInlineEditNode: (nodeId: string, nextText: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onResetToDefaultPreset?: () => void;
  onDismissDraftBanner: () => void;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onChangeHandStyle: (style: HandStyle) => void;
  onToggleSound: () => void;
  onNudgeNode: (nodeId: string, offset: Point) => void;
  onResetAdjustments: () => void;
}

function renderLayoutIcon(icon: LayoutIconKind): React.ReactNode {
  switch (icon) {
    case 'flow-lr':
      return <Workflow size={13} />;
    case 'flow-tb':
      return <Workflow size={13} style={{ transform: 'rotate(90deg)' }} />;
    case 'mindmap':
      return <GitFork size={13} />;
    case 'concept-graph':
      return <Network size={13} />;
    case 'document':
      return <FileText size={13} />;
    case 'freeform':
      return <Move size={13} />;
  }
}

function readInlineEditableText(
  scene: LessonScene,
  nodeId: string
): string | null {
  const node = findNodeById(scene.nodes, nodeId);
  return node ? readInlineNodeText(node) : null;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  scene,
  compiledProject,
  tMs,
  isPlaying,
  selectedNodeId,
  soundEnabled,
  restoredFromDraft,
  onSelectNode,
  onPausePlayback,
  onInlineEditNode,
  onDuplicateNode,
  onDeleteNode,
  onResetToDefaultPreset,
  onDismissDraftBanner,
  onChangeLayoutMode,
  onChangeCameraMode,
  onChangeHandStyle,
  onToggleSound,
  onNudgeNode,
  onResetAdjustments,
}) => {
  const { t, pluginName } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 960, height: 540 });
  const [manualCamera, setManualCamera] = useState<CameraState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{
    nodeId: string;
    value: string;
    screenX: number;
    screenY: number;
    width: number;
  } | null>(null);

  const layouts = useRegistryList(layoutRegistry);
  const cameras = useRegistryList(cameraRegistry);
  const hands = useRegistryList(handRegistry);

  const evalState = evaluateProjectAt(compiledProject, tMs);

  const dragRef = useRef<{
    type: 'node' | 'pan';
    nodeId?: string;
    startScreenX: number;
    startScreenY: number;
    startOffset: Point;
    startCam: CameraState;
    zoom: number;
  } | null>(null);

  // Reset manual pan/zoom and inline editor when starting playback or changing preset/scene/ratio
  useEffect(() => {
    if (isPlaying) {
      setManualCamera(null);
      setInlineEdit(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    setManualCamera(null);
    setInlineEdit(null);
  }, [compiledProject.project.id, scene.id, scene.aspectRatio, scene.layoutMode]);

  // Fit 16:9 or 9:16 stage responsively inside the board slot below the toolbar
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const padX = 24;
      const padY = 16;
      const availW = Math.max(240, rect.width - padX * 2);
      const availH = Math.max(180, rect.height - padY * 2);
      const targetRatio = scene.aspectRatio === '9:16' ? 9 / 16 : 16 / 9;

      let w = availW;
      let h = w / targetRatio;
      if (h > availH) {
        h = availH;
        w = h * targetRatio;
      }

      setViewportSize({
        width: Math.max(200, Math.floor(w)),
        height: Math.max(180, Math.floor(h)),
      });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.aspectRatio]);

  // Render crisp high-DPI canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = viewportSize.width;
    const cssH = viewportSize.height;
    const backingW = Math.round(cssW * dpr);
    const backingH = Math.round(cssH * dpr);

    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderProjectFrame(ctx, cssW, cssH, compiledProject, tMs, {
      dpr,
      manualCamera,
      selectedNodeId,
      hoveredNodeId,
      showUiOverlays: !isPlaying,
    });
    ctx.restore();
  }, [
    compiledProject,
    tMs,
    viewportSize,
    manualCamera,
    selectedNodeId,
    hoveredNodeId,
    isPlaying,
  ]);

  const activeTimeline =
    evalState.kind === 'scene'
      ? evalState.segment.timeline
      : evalState.fromSegment.timeline;
  const activeLocalTMs =
    evalState.kind === 'scene'
      ? evalState.localTMs
      : evalState.fromSegment.timeline.totalDurationMs;

  const hitTestNode = (screenX: number, screenY: number): string | null => {
    if (evalState.kind !== 'scene') return null;

    const cam = getActiveCamera(
      scene,
      activeTimeline,
      activeLocalTMs,
      viewportSize.width,
      viewportSize.height,
      manualCamera
    );
    const world = screenToWorld(
      screenX,
      screenY,
      viewportSize.width,
      viewportSize.height,
      cam
    );

    const hitBox = (n: PositionedSceneNode): string | null => {
      if (n.node.type === 'connector') return null;
      if (
        n.node.type === 'group' &&
        (n.node.arrange ?? 'card') !== 'card' &&
        n.children &&
        n.children.length > 0
      ) {
        for (let j = n.children.length - 1; j >= 0; j--) {
          const childHit = hitBox(n.children[j]);
          if (childHit) return childHit;
        }
      }
      if (
        world.x < n.cx - n.width / 2 - 8 ||
        world.x > n.cx + n.width / 2 + 8 ||
        world.y < n.cy - n.height / 2 - 8 ||
        world.y > n.cy + n.height / 2 + 8
      ) {
        return null;
      }
      return n.node.id;
    };

    const nodes = activeTimeline.layout.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const hit = hitBox(nodes[i]);
      if (hit) return hit;
    }
    return null;
  };

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getCurrentCam = () =>
    getActiveCamera(
      scene,
      activeTimeline,
      activeLocalTMs,
      viewportSize.width,
      viewportSize.height,
      manualCamera
    );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (evalState.kind !== 'scene') return;
    if (isPlaying) {
      onPausePlayback();
    }
    const pt = getLocalCoords(e);
    const cam = getCurrentCam();
    const hitId = hitTestNode(pt.x, pt.y);

    e.currentTarget.setPointerCapture(e.pointerId);

    if (hitId) {
      const node = findNodeById(scene.nodes, hitId);
      onSelectNode(hitId);
      dragRef.current = {
        type: 'node',
        nodeId: hitId,
        startScreenX: pt.x,
        startScreenY: pt.y,
        startOffset: {
          x: node?.offset?.x ?? 0,
          y: node?.offset?.y ?? 0,
        },
        startCam: cam,
        zoom: cam.zoom,
      };
    } else {
      onSelectNode(null);
      dragRef.current = {
        type: 'pan',
        startScreenX: pt.x,
        startScreenY: pt.y,
        startOffset: { x: 0, y: 0 },
        startCam: cam,
        zoom: cam.zoom,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getLocalCoords(e);
    const drag = dragRef.current;

    if (drag) {
      const dx = (pt.x - drag.startScreenX) / drag.zoom;
      const dy = (pt.y - drag.startScreenY) / drag.zoom;
      if (drag.type === 'node' && drag.nodeId) {
        onNudgeNode(drag.nodeId, {
          x: Math.round(drag.startOffset.x + dx),
          y: Math.round(drag.startOffset.y + dy),
        });
      } else if (drag.type === 'pan') {
        setManualCamera({
          cx: drag.startCam.cx - dx,
          cy: drag.startCam.cy - dy,
          zoom: drag.startCam.zoom,
        });
      }
      return;
    }

    if (!isPlaying) {
      setHoveredNodeId(hitTestNode(pt.x, pt.y));
    } else if (hoveredNodeId) {
      setHoveredNodeId(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (isPlaying || evalState.kind !== 'scene') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const currentCam = getCurrentCam();
    const worldBefore = screenToWorld(
      sx,
      sy,
      viewportSize.width,
      viewportSize.height,
      currentCam
    );

    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const nextZoom = Math.max(0.22, Math.min(2.6, currentCam.zoom * factor));

    const nextCx =
      worldBefore.x - (sx - viewportSize.width / 2) / nextZoom;
    const nextCy =
      worldBefore.y - (sy - viewportSize.height / 2) / nextZoom;

    setManualCamera({ cx: nextCx, cy: nextCy, zoom: nextZoom });
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (evalState.kind !== 'scene') {
      setManualCamera(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const hitId = hitTestNode(pt.x, pt.y);
    if (!hitId) {
      setManualCamera(null);
      return;
    }

    const pNode = activeTimeline.layout.nodeMap.get(hitId);
    const initialVal = readInlineEditableText(scene, hitId);
    if (!pNode || initialVal === null) return;

    if (isPlaying) {
      onPausePlayback();
    }
    onSelectNode(hitId);
    const cam = getCurrentCam();
    const screenCenter = worldToScreen(
      pNode.cx,
      pNode.cy,
      viewportSize.width,
      viewportSize.height,
      cam
    );
    const estW = Math.max(150, Math.min(320, Math.round(pNode.width * cam.zoom)));
    setInlineEdit({
      nodeId: hitId,
      value: initialVal,
      screenX: screenCenter.x,
      screenY: screenCenter.y,
      width: estW,
    });
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const { nodeId, value } = inlineEdit;
    setInlineEdit(null);
    if (value.trim()) {
      onInlineEditNode(nodeId, value);
    }
  };

  const adjustZoomBy = (factor: number) => {
    if (evalState.kind !== 'scene') return;
    if (isPlaying) {
      onPausePlayback();
    }
    const currentCam = getCurrentCam();
    const nextZoom = Math.max(0.22, Math.min(2.6, currentCam.zoom * factor));
    setManualCamera({ cx: currentCam.cx, cy: currentCam.cy, zoom: nextZoom });
  };

  const currentCamZoom =
    evalState.kind === 'scene' ? getCurrentCam().zoom : 1;
  const zoomPct = Math.round(currentCamZoom * 100);
  const hasNodeOffsets = hasAnyOffset(scene.nodes);
  const showReset = hasNodeOffsets || manualCamera !== null;

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 50% 45%, #171c24 0%, #0d1015 100%)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {/* Compact 1-row Canvas Toolbar */}
      <div
        style={{
          padding: '8px 14px 4px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 7,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div className="studio-pill-group" title={t('canvas.layoutGroupTitle')}>
          {layouts.map((plugin) => (
            <button
              key={plugin.id}
              type="button"
              className={`studio-pill-item ${
                scene.layoutMode === plugin.id ? 'active' : ''
              }`}
              onClick={() => onChangeLayoutMode(plugin.id)}
            >
              {renderLayoutIcon(plugin.icon)}
              {pluginName(plugin.id, plugin.name)}
            </button>
          ))}
        </div>

        <div
          className="studio-pill-group"
          title={t('canvas.cameraGroupTitle')}
          style={{ padding: '2px 6px', gap: 5 }}
        >
          <Camera size={13} color="var(--text-muted)" />
          <select
            className="studio-select"
            aria-label={t('canvas.cameraGroupTitle')}
            value={scene.cameraMode}
            onChange={(e) => {
              setManualCamera(null);
              onChangeCameraMode(e.target.value as CameraMode);
            }}
            style={{
              width: 'auto',
              height: 26,
              padding: '0 4px',
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              boxShadow: 'none',
            }}
          >
            {cameras.map((camPlugin) => (
              <option key={camPlugin.id} value={camPlugin.id} style={{ background: '#161b22' }}>
                {t('canvas.cameraLabel')}: {pluginName(camPlugin.id, camPlugin.name)}
              </option>
            ))}
          </select>
        </div>

        <div
          className="studio-pill-group"
          title={t('canvas.handGroupTitle')}
          style={{ padding: '2px 6px', gap: 5 }}
        >
          <Hand size={13} color="var(--text-muted)" />
          <select
            className="studio-select"
            aria-label={t('canvas.handGroupTitle')}
            value={scene.handStyle}
            onChange={(e) => onChangeHandStyle(e.target.value as HandStyle)}
            style={{
              width: 'auto',
              height: 26,
              padding: '0 4px',
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              boxShadow: 'none',
            }}
          >
            {hands.map((hand) => (
              <option key={hand.id} value={hand.id} style={{ background: '#161b22' }}>
                {t('canvas.handLabel')}: {pluginName(hand.id, hand.name)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`studio-btn ${soundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={
            soundEnabled ? t('canvas.soundOnTitle') : t('canvas.soundOffTitle')
          }
          style={{ padding: '0 9px' }}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{t('canvas.soundBtn')}</span>
        </button>

        {showReset && (
          <button
            type="button"
            className="studio-btn"
            onClick={() => {
              setManualCamera(null);
              onResetAdjustments();
            }}
            title={t('canvas.resetAdjustmentsTitle')}
          >
            <RotateCcw size={13} />
            {t('canvas.resetAdjustmentsBtn')}
          </button>
        )}
      </div>

      {/* Board Viewport Slot */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Dismissible Local Draft Notice Pill */}
        {restoredFromDraft && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 16,
              zIndex: 18,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 99,
              background: 'rgba(22, 27, 34, 0.9)',
              border: '1px solid rgba(243, 201, 105, 0.38)',
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.38)',
            }}
          >
            <span>{t('canvas.draftRestoredBanner')}</span>
            {onResetToDefaultPreset && (
              <button
                type="button"
                onClick={onResetToDefaultPreset}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  color: 'var(--accent)',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {t('canvas.draftResetAction')}
              </button>
            )}
            <button
              type="button"
              onClick={onDismissDraftBanner}
              aria-label={t('canvas.draftDismissAria')}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                display: 'inline-flex',
                color: 'var(--text-muted)',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div
          style={{
            borderRadius: 12,
            padding: 4,
            background: '#1e242d',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 22px 60px rgba(0, 0, 0, 0.55)',
            position: 'relative',
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            style={{
              display: 'block',
              width: viewportSize.width,
              height: viewportSize.height,
              borderRadius: 8,
              cursor: isPlaying
                ? 'pointer'
                : hoveredNodeId
                ? 'grab'
                : manualCamera
                ? 'move'
                : 'default',
            }}
          />

          {/* Floating Inline Quick-Text Editor (double-click node) */}
          {inlineEdit && (
            <div
              style={{
                position: 'absolute',
                left: Math.max(
                  12,
                  Math.min(
                    viewportSize.width - inlineEdit.width - 12,
                    inlineEdit.screenX - inlineEdit.width / 2 + 4
                  )
                ),
                top: Math.max(
                  12,
                  Math.min(
                    viewportSize.height - 46,
                    inlineEdit.screenY - 18
                  )
                ),
                width: inlineEdit.width,
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <input
                autoFocus
                className="studio-input"
                value={inlineEdit.value}
                onChange={(e) =>
                  setInlineEdit((prev) =>
                    prev ? { ...prev, value: e.target.value } : null
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitInlineEdit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setInlineEdit(null);
                  }
                }}
                onBlur={commitInlineEdit}
                style={{
                  background: 'rgba(16, 20, 25, 0.96)',
                  border: '1.5px solid var(--accent)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
              <span
                style={{
                  alignSelf: 'center',
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  background: 'rgba(16, 20, 25, 0.85)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {t('canvas.inlineEditHint')}
              </span>
            </div>
          )}

          {/* Bottom-Right Floating Zoom & Node Action HUD */}
          <div className="studio-canvas-hud">
            {!isPlaying && selectedNodeId && (
              <>
                <button
                  type="button"
                  className="studio-pill-item"
                  onClick={() => onDuplicateNode(selectedNodeId)}
                  title={t('canvas.duplicateNodeTitle')}
                  style={{ height: 24, padding: '0 6px' }}
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  className="studio-pill-item"
                  onClick={() => onDeleteNode(selectedNodeId)}
                  title={t('canvas.deleteNodeTitle')}
                  style={{ height: 24, padding: '0 6px', color: '#fca5a5' }}
                >
                  <Trash2 size={12} />
                </button>
                <div
                  style={{
                    width: 1,
                    height: 14,
                    background: 'var(--border-subtle)',
                    margin: '0 2px',
                  }}
                />
              </>
            )}
            <button
              type="button"
              className="studio-pill-item"
              onClick={() => adjustZoomBy(0.88)}
              title={t('canvas.zoomOutTitle')}
              style={{ height: 24, padding: '0 6px' }}
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              className="studio-pill-item"
              onClick={() => setManualCamera(null)}
              title={t('canvas.zoomFitTitle')}
              style={{
                height: 24,
                padding: '0 6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                minWidth: 44,
                justifyContent: 'center',
              }}
            >
              {manualCamera ? `${zoomPct}%` : <Maximize2 size={11} />}
            </button>
            <button
              type="button"
              className="studio-pill-item"
              onClick={() => adjustZoomBy(1.14)}
              title={t('canvas.zoomInTitle')}
              style={{ height: 24, padding: '0 6px' }}
            >
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle interaction hint bar */}
      <div
        style={{
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {evalState.kind === 'transition'
          ? t('canvas.hintTransition', {
              name: pluginName(
                evalState.transitionId,
                evalState.transitionName
              ),
            })
          : isPlaying
          ? t('canvas.hintPlaying')
          : t('canvas.hintPaused')}
      </div>
    </main>
  );
};
