import React, { useEffect, useRef, useState } from 'react';
import { Code2, Layers, Subtitles } from 'lucide-react';
import { AudioTrackState } from '../engine/audio/voiceTrackPlayer';
import { CompiledProjectTimeline } from '../engine/timeline/projectTimeline';
import { LessonProject, SubtitleCue } from '../model/project';
import {
  addChildToGroup,
  LessonScene,
  moveNodeInTree,
  removeNodeInTree,
  SceneNode,
  updateNodeInTree,
} from '../model/scene';
import {
  createShapeNode,
  createTextNode,
} from '../model/builders';
import {
  layoutRegistry,
  shapeRegistry,
  useRegistryList,
} from '../plugins';
import { MediaTrackPane } from './sidebar/MediaTrackPane';
import { NodeTree } from './sidebar/NodeTree';
import { ScriptCodecPane } from './sidebar/ScriptCodecPane';
import { useI18n } from '../i18n';

interface SidebarEditorProps {
  project: LessonProject;
  compiledProject: CompiledProjectTimeline;
  scene: LessonScene;
  selectedNodeId: string | null;
  audioTrack: AudioTrackState | null;
  onSelectNode: (nodeId: string | null, opts?: { reveal?: boolean }) => void;
  onUpdateScene: (updater: (prev: LessonScene) => LessonScene) => void;
  onUpdateSubtitles: (cues: SubtitleCue[]) => void;
  onToggleShowSubtitles: (show: boolean) => void;
  onSeekToMs: (ms: number) => void;
  onImportAudioFile: (file: File) => void;
  onUpdateAudioTrack: (
    updater: (prev: AudioTrackState) => AudioTrackState
  ) => void;
  onRemoveAudioTrack: () => void;
  onExportSrt: () => void;
  onApplyProjectScript: (raw: string) => { ok: boolean; warnings: string[] };
  onImportProjectFile: (file: File) => void;
  onExportProjectScript: () => void;
  onNotify: (msg: string) => void;
}

export const SidebarEditor: React.FC<SidebarEditorProps> = ({
  project,
  compiledProject,
  scene,
  selectedNodeId,
  audioTrack,
  onSelectNode,
  onUpdateScene,
  onUpdateSubtitles,
  onToggleShowSubtitles,
  onSeekToMs,
  onImportAudioFile,
  onUpdateAudioTrack,
  onRemoveAudioTrack,
  onExportSrt,
  onApplyProjectScript,
  onImportProjectFile,
  onExportProjectScript,
  onNotify,
}) => {
  const { t, codecMeta } = useI18n();
  const layoutOptions = useRegistryList(layoutRegistry);
  const shapeOptions = useRegistryList(shapeRegistry);
  const activeLayout =
    layoutOptions.find((l) => l.id === scene.layoutMode) ??
    layoutRegistry.getOrDefault(scene.layoutMode);
  const activeCodec = activeLayout.textCodec;
  const activeCodecMeta = activeCodec ? codecMeta(activeCodec) : null;
  const defaultShapeId = shapeOptions[0]?.id ?? 'rounded';

  const [tab, setTab] = useState<'outline' | 'script' | 'media'>('outline');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set()
  );
  const [scriptText, setScriptText] = useState(() =>
    activeCodec ? activeCodec.serialize(scene) : ''
  );
  const [scriptWarnings, setScriptWarnings] = useState<string[]>([]);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const lastParsedSceneRef = useRef<LessonScene | null>(null);

  useEffect(() => {
    if (!isEditingScript && scene !== lastParsedSceneRef.current) {
      setScriptText(activeCodec ? activeCodec.serialize(scene) : '');
      setScriptWarnings([]);
    }
  }, [scene, isEditingScript, activeCodec]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const findAncestorGroups = (
      nodes: SceneNode[],
      targetId: string,
      ancestors: string[]
    ): string[] | null => {
      for (const n of nodes) {
        if (n.id === targetId) return ancestors;
        if (n.type === 'group') {
          const hit = findAncestorGroups(n.children, targetId, [
            ...ancestors,
            n.id,
          ]);
          if (hit) return hit;
        }
      }
      return null;
    };
    const parents = findAncestorGroups(scene.nodes, selectedNodeId, []);
    if (parents && parents.length > 0) {
      setExpandedGroups((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const pid of parents) {
          if (!next.has(pid)) {
            next.add(pid);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [selectedNodeId, scene.nodes]);

  const handleScriptChange = (value: string) => {
    if (!activeCodec) return;
    setScriptText(value);
    const { scene: parsed, warnings } = activeCodec.parse(value, scene);
    lastParsedSceneRef.current = parsed;
    setScriptWarnings(warnings);
    onUpdateScene(() => parsed);
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateNode = (
    nodeId: string,
    updater: (node: SceneNode) => SceneNode
  ) => {
    onUpdateScene((prev) => ({
      ...prev,
      customSteps: undefined,
      nodes: updateNodeInTree(prev.nodes, nodeId, updater),
    }));
  };

  const moveNode = (nodeId: string, delta: -1 | 1) => {
    onUpdateScene((prev) => ({
      ...prev,
      customSteps: undefined,
      nodes: moveNodeInTree(prev.nodes, nodeId, delta),
    }));
  };

  const deleteNode = (nodeId: string) => {
    onUpdateScene((prev) => ({
      ...prev,
      customSteps: undefined,
      nodes: removeNodeInTree(prev.nodes, nodeId),
    }));
    if (selectedNodeId === nodeId) {
      onSelectNode(null);
    }
  };

  const addChildIntoGroup = (groupId: string, childKind: 'text' | 'shape') => {
    const childId = `${childKind}-${Date.now().toString(36)}`;
    const child: SceneNode =
      childKind === 'text'
        ? createTextNode({
            id: childId,
            text: t('sidebar.newChildTextDefault'),
            color: 'white',
            fontSize: 15,
            maxWidth: 220,
          })
        : createShapeNode({
            id: childId,
            shape: defaultShapeId,
            color: 'yellow',
            fitMode: 'auto-group',
          });

    onUpdateScene((prev) => ({
      ...prev,
      customSteps: undefined,
      nodes: addChildToGroup(prev.nodes, groupId, child),
    }));
    setExpandedGroups((prev) => new Set(prev).add(groupId));
    onSelectNode(childId);
  };

  const topVertices: SceneNode[] = [];
  const collectConnectable = (nodes: SceneNode[]) => {
    for (const n of nodes) {
      if (n.type === 'connector') continue;
      topVertices.push(n);
      if (n.type === 'group' && (n.arrange ?? 'card') !== 'card') {
        collectConnectable(n.children);
      }
    }
  };
  collectConnectable(scene.nodes);
  const nodeNameMap = new Map<string, string>();
  const registerNodeNames = (nodes: SceneNode[]) => {
    for (const n of nodes) {
      nodeNameMap.set(n.id, n.name);
      if (n.type === 'group') {
        registerNodeNames(n.children);
      }
    }
  };
  registerNodeNames(scene.nodes);

  return (
    <aside
      style={{
        width: 332,
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Tab switcher */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 5,
        }}
      >
        <button
          type="button"
          className={`studio-btn ${tab === 'outline' ? 'active' : ''}`}
          style={{ flex: 1, padding: '0 6px', fontSize: 11.5 }}
          onClick={() => {
            setIsEditingScript(false);
            setTab('outline');
          }}
        >
          <Layers size={12} />
          {t('sidebar.tabOutline')}
        </button>
        <button
          type="button"
          className={`studio-btn ${tab === 'script' ? 'active' : ''}`}
          style={{ flex: 1, padding: '0 6px', fontSize: 11.5 }}
          onClick={() => {
            setScriptText(activeCodec ? activeCodec.serialize(scene) : '');
            setTab('script');
          }}
        >
          <Code2 size={12} />
          {activeCodecMeta
            ? activeCodecMeta.label
            : t('sidebar.tabScriptFallback')}
        </button>
        <button
          type="button"
          className={`studio-btn ${tab === 'media' ? 'active' : ''}`}
          style={{ flex: 1, padding: '0 6px', fontSize: 11.5 }}
          onClick={() => {
            setIsEditingScript(false);
            setTab('media');
          }}
        >
          <Subtitles size={12} />
          {t('sidebar.tabMedia')}
        </button>
      </div>

      {tab === 'media' ? (
        <MediaTrackPane
          project={project}
          compiledProject={compiledProject}
          audioTrack={audioTrack}
          onUpdateSubtitles={onUpdateSubtitles}
          onToggleShowSubtitles={onToggleShowSubtitles}
          onSeekToMs={onSeekToMs}
          onImportAudioFile={onImportAudioFile}
          onUpdateAudioTrack={onUpdateAudioTrack}
          onRemoveAudioTrack={onRemoveAudioTrack}
          onExportSrt={onExportSrt}
        />
      ) : tab === 'script' ? (
        <ScriptCodecPane
          project={project}
          scene={scene}
          codec={activeCodec}
          scriptText={scriptText}
          warnings={scriptWarnings}
          onFocus={() => setIsEditingScript(true)}
          onBlur={() => setIsEditingScript(false)}
          onChange={handleScriptChange}
          onApplyProjectScript={onApplyProjectScript}
          onImportProjectFile={onImportProjectFile}
          onExportProjectScript={onExportProjectScript}
          onNotify={onNotify}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Scene Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                marginBottom: 5,
              }}
            >
              {t('sidebar.sceneTitleLabel')}
            </label>
            <input
              className="studio-input"
              value={scene.title}
              onChange={(e) =>
                onUpdateScene((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={t('sidebar.sceneTitlePlaceholder')}
            />
          </div>

          {/* Universal SceneNode Tree */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                {t('sidebar.nodeTreeHeading', { count: scene.nodes.length })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <NodeTree
                nodes={scene.nodes}
                theme={scene.theme}
                selectedNodeId={selectedNodeId}
                expandedGroups={expandedGroups}
                nodeNameMap={nodeNameMap}
                topVertices={topVertices}
                shapeOptions={shapeOptions}
                supportsGroups={Boolean(activeLayout.supportsGroups)}
                onSelectNode={(id) => onSelectNode(id, { reveal: Boolean(id) })}
                onToggleGroup={toggleGroupExpand}
                onUpdateNode={updateNode}
                onMoveNode={moveNode}
                onDeleteNode={deleteNode}
                onAddChildToGroup={addChildIntoGroup}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
