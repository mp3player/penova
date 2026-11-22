import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Folder,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import { SceneNode, ThemeId } from '../../model/scene';
import { ShapePlugin } from '../../plugins';
import { resolveColorHex } from '../../engine/render/themes';
import { NodeInspector } from './NodeInspector';

interface NodeTreeProps {
  nodes: SceneNode[];
  depth?: number;
  theme: ThemeId;
  selectedNodeId: string | null;
  expandedGroups: Set<string>;
  nodeNameMap: Map<string, string>;
  topVertices: SceneNode[];
  shapeOptions: ShapePlugin[];
  supportsGroups: boolean;
  onSelectNode: (nodeId: string | null) => void;
  onToggleGroup: (groupId: string) => void;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
  onMoveNode: (nodeId: string, delta: -1 | 1) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
}

function renderNodeIcon(node: SceneNode): React.ReactNode {
  switch (node.type) {
    case 'text':
      return <Type size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />;
    case 'shape':
      return <Square size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />;
    case 'connector':
      return <ArrowRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
    case 'group':
      return <Folder size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
  }
}

export const NodeTree: React.FC<NodeTreeProps> = ({
  nodes,
  depth = 0,
  theme,
  selectedNodeId,
  expandedGroups,
  nodeNameMap,
  topVertices,
  shapeOptions,
  supportsGroups,
  onSelectNode,
  onToggleGroup,
  onUpdateNode,
  onMoveNode,
  onDeleteNode,
  onAddChildToGroup,
}) => {
  return (
    <>
      {nodes.map((node, idx) => {
        const isSelected = node.id === selectedNodeId;
        const isGroup = node.type === 'group';
        const isExpanded = isGroup && expandedGroups.has(node.id);
        const dotColor = resolveColorHex(theme, node.color);

        let displayTitle = node.name;
        if (node.type === 'text') {
          displayTitle = node.text.trim() || '（空文本）';
        } else if (node.type === 'connector') {
          if (node.fromId && node.toId) {
            const fromN = nodeNameMap.get(node.fromId) ?? node.fromId;
            const toN = nodeNameMap.get(node.toId) ?? node.toId;
            displayTitle = `${fromN} ${
              node.style === 'dashed' ? '-.->' : '→'
            } ${toN}${node.label ? ` (${node.label})` : ''}`;
          } else {
            displayTitle = node.label ? `自由箭头 (${node.label})` : '自由箭头';
          }
        }

        return (
          <div
            key={node.id}
            style={{
              marginLeft: depth * 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                borderRadius: 8,
                border: isSelected
                  ? '1px solid rgba(243, 201, 105, 0.55)'
                  : '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'rgba(243, 201, 105, 0.06)'
                  : depth > 0
                  ? '#131820'
                  : 'var(--bg-elevated)',
                padding: '7px 8px',
                transition: 'border-color 120ms ease',
              }}
            >
              <div
                onClick={() => onSelectNode(isSelected ? null : node.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 5,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {isGroup ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleGroup(node.id);
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title={isExpanded ? '收起子节点' : '展开子节点'}
                    >
                      {isExpanded ? (
                        <ChevronDown size={13} />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                    </button>
                  ) : (
                    <span style={{ width: 14, flexShrink: 0 }} />
                  )}

                  {renderNodeIcon(node)}

                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor,
                      border: '1px solid rgba(255,255,255,0.28)',
                      flexShrink: 0,
                    }}
                  />

                  <span
                    style={{
                      fontWeight: node.type === 'group' ? 600 : 500,
                      fontSize: depth > 0 ? 12 : 12.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayTitle}
                  </span>

                  {isGroup && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      ({node.children.length})
                    </span>
                  )}
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="studio-btn"
                    style={{ width: 21, height: 21, padding: 0 }}
                    disabled={idx === 0}
                    onClick={() => onMoveNode(node.id, -1)}
                    title="上移（调整绘制顺序）"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    className="studio-btn"
                    style={{ width: 21, height: 21, padding: 0 }}
                    disabled={idx === nodes.length - 1}
                    onClick={() => onMoveNode(node.id, 1)}
                    title="下移（调整绘制顺序）"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    type="button"
                    className="studio-btn danger"
                    style={{ width: 21, height: 21, padding: 0 }}
                    onClick={() => onDeleteNode(node.id)}
                    title="删除节点"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {isSelected && (
                <NodeInspector
                  node={node}
                  shapeOptions={shapeOptions}
                  topVertices={topVertices}
                  supportsGroups={supportsGroups}
                  onUpdateNode={onUpdateNode}
                  onAddChildToGroup={onAddChildToGroup}
                />
              )}
            </div>

            {isGroup && isExpanded && node.children.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <NodeTree
                  nodes={node.children}
                  depth={depth + 1}
                  theme={theme}
                  selectedNodeId={selectedNodeId}
                  expandedGroups={expandedGroups}
                  nodeNameMap={nodeNameMap}
                  topVertices={topVertices}
                  shapeOptions={shapeOptions}
                  supportsGroups={supportsGroups}
                  onSelectNode={onSelectNode}
                  onToggleGroup={onToggleGroup}
                  onUpdateNode={onUpdateNode}
                  onMoveNode={onMoveNode}
                  onDeleteNode={onDeleteNode}
                  onAddChildToGroup={onAddChildToGroup}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
