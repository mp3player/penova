import React from 'react';
import { Plus } from 'lucide-react';
import { ChalkColor, GroupSceneNode, SceneNode } from '../../../model/scene';
import { ARRANGE_OPTIONS, COLOR_OPTIONS } from '../constants';

interface GroupNodeInspectorProps {
  node: GroupSceneNode;
  supportsGroups: boolean;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
}

export const GroupNodeInspector: React.FC<GroupNodeInspectorProps> = ({
  node,
  supportsGroups,
  onUpdateNode,
  onAddChildToGroup,
}) => {
  const zoneVal = typeof node.meta?.zone === 'string' ? node.meta.zone : '';
  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <input
        className="studio-input"
        value={node.name}
        onChange={(e) =>
          onUpdateNode(node.id, (c) => ({ ...c, name: e.target.value }))
        }
        placeholder="组合节点名称"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        <select
          className="studio-select"
          value={node.arrange ?? 'card'}
          onChange={(e) =>
            onUpdateNode(node.id, (c) =>
              c.type === 'group'
                ? {
                    ...c,
                    arrange: e.target.value as GroupSceneNode['arrange'],
                  }
                : c
            )
          }
        >
          {ARRANGE_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              组合：{a.label}
            </option>
          ))}
        </select>

        <select
          className="studio-select"
          value={node.color}
          onChange={(e) =>
            onUpdateNode(node.id, (c) => ({
              ...c,
              color: e.target.value as ChalkColor,
            }))
          }
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              色调：{c.label}
            </option>
          ))}
        </select>
      </div>

      {supportsGroups && (
        <input
          className="studio-input"
          value={zoneVal}
          onChange={(e) => {
            const nextZone = e.target.value || undefined;
            onUpdateNode(node.id, (c) => ({
              ...c,
              meta: { ...(c.meta ?? {}), zone: nextZone },
            }));
          }}
          placeholder="所属分区名称（概念图谱分框用）"
        />
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="studio-btn"
          style={{ flex: 1, height: 26, fontSize: 11.5 }}
          onClick={() => onAddChildToGroup(node.id, 'text')}
        >
          <Plus size={12} />
          子文字
        </button>
        <button
          type="button"
          className="studio-btn"
          style={{ flex: 1, height: 26, fontSize: 11.5 }}
          onClick={() => onAddChildToGroup(node.id, 'shape')}
        >
          <Plus size={12} />
          子图形
        </button>
      </div>
    </div>
  );
};
