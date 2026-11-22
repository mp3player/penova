import React, { useEffect, useState } from 'react';
import { Code2, Layers, Plus, Subtitles } from 'lucide-react';
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
  createCardNode,
  createConnectorNode,
  createShapeNode,
  createTextNode,
} from '../model/builders';
import { layoutRegistry, shapeRegistry, useRegistryList } from '../plugins';
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
  onSelectNode: (nodeId: string | null) => void;
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

  useEffect(() => {
    if (!isEditingScript) {
      setScriptText(activeCodec ? activeCodec.serialize(scene) : '');
      setScriptWarnings([]);
    }
  }, [scene, isEditingScript, activeCodec]);

  const handleScriptChange = (value: string) => {
    if (!activeCodec) return;
    setScriptText(value);
    const { scene: parsed, warnings } = activeCodec.parse(value, scene);
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

  const addTopNode = (kind: 'text' | 'shape' | 'connector' | 'card') => {
    const id = `${kind}-${Date.now().toString(36)}`;
    let newNode: SceneNode;
    if (kind === 'text') {
      const isDoc = scene.layoutMode === 'document';
      newNode = createTextNode({
        id,
        text: t('sidebar.newTextDefault'),
        color: 'white',
        align: isDoc ? 'left' : 'center',
        fontSize: isDoc ? 21 : 20,
        maxWidth: isDoc ? 580 : 240,
      });
    } else if (kind === 'shape') {
      const isDoc = scene.layoutMode === 'document';
      newNode = createShapeNode({
        id,
        shape: isDoc ? 'divider' : defaultShapeId,
        color: isDoc ? 'orange' : 'cyan',
        width: isDoc ? 560 : 170,
        height: isDoc ? 24 : 78,
      });
    } else if (kind === 'connector') {
      const vertices = scene.nodes.filter((n) => n.type !== 'connector');
      newNode =
        vertices.length >= 2
          ? createConnectorNode({
              id,
              fromId: vertices[0].id,
              toId: vertices[1].id,
              color: vertices[0].color,
            })
          : createConnectorNode({
              id,
              fromPoint: { x: -90, y: 0 },
              toPoint: { x: 90, y: 0 },
              color: 'yellow',
            });
    } else {
      const lastZone = [...scene.nodes]
        .reverse()
        .find((n) => typeof n.meta?.zone === 'string')?.meta?.zone;
      newNode = createCardNode({
        id,
        label: t('sidebar.newCardDefaultLabel', {
          num: scene.nodes.filter((n) => n.type !== 'connector').length + 1,
        }),
        subtitle: t('sidebar.newCardDefaultSubtitle'),
        role: 'concept',
        color: 'cyan',
        shape: defaultShapeId,
        zone: typeof lastZone === 'string' ? lastZone : undefined,
      });
    }

    onUpdateScene((prev) => ({
      ...prev,
      customSteps: undefined,
      nodes: [...prev.nodes, newNode],
    }));
    onSelectNode(id);
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

  const topVertices = scene.nodes.filter((n) => n.type !== 'connector');
  const nodeNameMap = new Map(scene.nodes.map((n) => [n.id, n.name]));

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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 5,
                marginBottom: 9,
              }}
            >
              <button
                type="button"
                className="studio-btn"
                onClick={() => addTopNode('text')}
                style={{ height: 26, padding: '0 4px', fontSize: 11 }}
                title={t('sidebar.addTextTitle')}
              >
                <Plus size={11} />
                {t('sidebar.addTextBtn')}
              </button>
              <button
                type="button"
                className="studio-btn"
                onClick={() => addTopNode('shape')}
                style={{ height: 26, padding: '0 4px', fontSize: 11 }}
                title={t('sidebar.addShapeTitle')}
              >
                <Plus size={11} />
                {t('sidebar.addShapeBtn')}
              </button>
              <button
                type="button"
                className="studio-btn"
                onClick={() => addTopNode('connector')}
                style={{ height: 26, padding: '0 4px', fontSize: 11 }}
                title={t('sidebar.addArrowTitle')}
              >
                <Plus size={11} />
                {t('sidebar.addArrowBtn')}
              </button>
              <button
                type="button"
                className="studio-btn"
                onClick={() => addTopNode('card')}
                style={{ height: 26, padding: '0 4px', fontSize: 11 }}
                title={t('sidebar.addCardTitle')}
              >
                <Plus size={11} />
                {t('sidebar.addCardBtn')}
              </button>
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
                onSelectNode={onSelectNode}
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
