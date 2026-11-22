import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  GitFork,
  Hand,
  Move,
  Network,
  RotateCcw,
  Volume2,
  VolumeX,
  Workflow,
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
import {
  cameraRegistry,
  handRegistry,
  LayoutIconKind,
  layoutRegistry,
  useRegistryList,
} from '../plugins';
import { CameraState } from '../engine/camera/cameraDirector';
import { renderProjectFrame } from '../engine/render/projectRenderer';
import { getActiveCamera, screenToWorld } from '../engine/render/sceneRenderer';
import {
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';

interface CanvasStageProps {
  scene: LessonScene;
  compiledProject: CompiledProjectTimeline;
  tMs: number;
  isPlaying: boolean;
  selectedNodeId: string | null;
  soundEnabled: boolean;
  onSelectNode: (nodeId: string | null) => void;
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

export const CanvasStage: React.FC<CanvasStageProps> = ({
  scene,
  compiledProject,
  tMs,
  isPlaying,
  selectedNodeId,
  soundEnabled,
  onSelectNode,
  onChangeLayoutMode,
  onChangeCameraMode,
  onChangeHandStyle,
  onToggleSound,
  onNudgeNode,
  onResetAdjustments,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 960, height: 540 });
  const [manualCamera, setManualCamera] = useState<CameraState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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

  // Reset manual pan/zoom when starting playback or changing preset/scene/ratio
  useEffect(() => {
    if (isPlaying) {
      setManualCamera(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    setManualCamera(null);
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

    const nodes = activeTimeline.layout.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.node.type === 'connector') continue;
      if (
        world.x >= n.cx - n.width / 2 - 8 &&
        world.x <= n.cx + n.width / 2 + 8 &&
        world.y >= n.cy - n.height / 2 - 8 &&
        world.y <= n.cy + n.height / 2 + 8
      ) {
        return n.node.id;
      }
    }
    return null;
  };

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPlaying || evalState.kind !== 'scene') return;
    const pt = getLocalCoords(e);
    const cam = getActiveCamera(
      scene,
      activeTimeline,
      activeLocalTMs,
      viewportSize.width,
      viewportSize.height,
      manualCamera
    );
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

    const currentCam = getActiveCamera(
      scene,
      activeTimeline,
      activeLocalTMs,
      viewportSize.width,
      viewportSize.height,
      manualCamera
    );
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

  const handleDoubleClick = () => {
    setManualCamera(null);
  };

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
      {/* Top Canvas Toolbar (non-overlapping flex row) */}
      <div
        style={{
          padding: '10px 14px 4px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 7,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div className="studio-pill-group" title="默认图式布局算法">
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
              {plugin.name}
            </button>
          ))}
        </div>

        <div className="studio-pill-group" title="智能运镜策略">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 5px',
              color: 'var(--text-muted)',
            }}
          >
            <Camera size={13} />
          </span>
          {cameras.map((camPlugin) => (
            <button
              key={camPlugin.id}
              type="button"
              className={`studio-pill-item ${
                scene.cameraMode === camPlugin.id ? 'active' : ''
              }`}
              onClick={() => {
                setManualCamera(null);
                onChangeCameraMode(camPlugin.id);
              }}
            >
              {camPlugin.name}
            </button>
          ))}
        </div>

        <div className="studio-pill-group" title="执笔显示">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 5px',
              color: 'var(--text-muted)',
            }}
          >
            <Hand size={13} />
          </span>
          {hands.map((hand) => (
            <button
              key={hand.id}
              type="button"
              className={`studio-pill-item ${
                scene.handStyle === hand.id ? 'active' : ''
              }`}
              onClick={() => onChangeHandStyle(hand.id)}
            >
              {hand.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`studio-btn ${soundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={soundEnabled ? '关闭粉笔书写音效' : '开启粉笔书写音效'}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>音效</span>
        </button>

        {showReset && (
          <button
            type="button"
            className="studio-btn"
            onClick={() => {
              setManualCamera(null);
              onResetAdjustments();
            }}
            title="重置拖拽节点偏移与画布视角"
          >
            <RotateCcw size={13} />
            重置微调
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
                ? 'default'
                : hoveredNodeId
                ? 'grab'
                : manualCamera
                ? 'move'
                : 'default',
            }}
          />
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
          ? `当前处于转场动画（${evalState.transitionName}） · 拖动时间轴或点击分幕标签可进入节点编辑`
          : isPlaying
          ? '正在播放板书动画 · 按 Space 暂停并进入自由微调'
          : '暂停时可拖拽节点微调位置、滚轮缩放画布，双击空白恢复自动运镜 · 按 Space 播放/暂停'}
      </div>
    </main>
  );
};
