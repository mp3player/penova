import React from 'react';
import {
  ChalkColor,
  ConnectorSceneNode,
  SceneNode,
} from '../../../model/scene';
import { COLOR_OPTIONS } from '../constants';

interface ConnectorNodeInspectorProps {
  node: ConnectorSceneNode;
  topVertices: SceneNode[];
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
}

export const ConnectorNodeInspector: React.FC<ConnectorNodeInspectorProps> = ({
  node,
  topVertices,
  onUpdateNode,
}) => {
  const isBound = Boolean(node.fromId && node.toId);
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        <select
          className="studio-select"
          value={node.fromId ?? '__free__'}
          onChange={(e) => {
            const v = e.target.value;
            onUpdateNode(node.id, (c) =>
              c.type === 'connector'
                ? v === '__free__'
                  ? {
                      ...c,
                      fromId: undefined,
                      toId: undefined,
                      fromPoint: c.fromPoint ?? { x: -90, y: 0 },
                      toPoint: c.toPoint ?? { x: 90, y: 0 },
                    }
                  : {
                      ...c,
                      fromId: v,
                      toId: c.toId ?? topVertices.find((n) => n.id !== v)?.id,
                    }
                : c
            );
          }}
        >
          <option value="__free__">起点：自由坐标</option>
          {topVertices.map((v) => (
            <option key={v.id} value={v.id}>
              起点：{v.name}
            </option>
          ))}
        </select>

        <select
          className="studio-select"
          value={node.toId ?? '__free__'}
          onChange={(e) => {
            const v = e.target.value;
            onUpdateNode(node.id, (c) =>
              c.type === 'connector'
                ? v === '__free__'
                  ? {
                      ...c,
                      fromId: undefined,
                      toId: undefined,
                      fromPoint: c.fromPoint ?? { x: -90, y: 0 },
                      toPoint: c.toPoint ?? { x: 90, y: 0 },
                    }
                  : {
                      ...c,
                      fromId:
                        c.fromId ?? topVertices.find((n) => n.id !== v)?.id,
                      toId: v,
                    }
                : c
            );
          }}
        >
          <option value="__free__">终点：自由坐标</option>
          {topVertices.map((v) => (
            <option key={v.id} value={v.id}>
              终点：{v.name}
            </option>
          ))}
        </select>
      </div>

      {!isBound && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 4,
          }}
        >
          <input
            type="number"
            className="studio-input"
            title="起点 X"
            value={node.fromPoint?.x ?? -90}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'connector'
                  ? {
                      ...c,
                      fromPoint: {
                        x: Number(e.target.value) || 0,
                        y: c.fromPoint?.y ?? 0,
                      },
                    }
                  : c
              )
            }
            style={{ padding: '4px 5px', fontSize: 11 }}
          />
          <input
            type="number"
            className="studio-input"
            title="起点 Y"
            value={node.fromPoint?.y ?? 0}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'connector'
                  ? {
                      ...c,
                      fromPoint: {
                        x: c.fromPoint?.x ?? 0,
                        y: Number(e.target.value) || 0,
                      },
                    }
                  : c
              )
            }
            style={{ padding: '4px 5px', fontSize: 11 }}
          />
          <input
            type="number"
            className="studio-input"
            title="终点 X"
            value={node.toPoint?.x ?? 90}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'connector'
                  ? {
                      ...c,
                      toPoint: {
                        x: Number(e.target.value) || 0,
                        y: c.toPoint?.y ?? 0,
                      },
                    }
                  : c
              )
            }
            style={{ padding: '4px 5px', fontSize: 11 }}
          />
          <input
            type="number"
            className="studio-input"
            title="终点 Y"
            value={node.toPoint?.y ?? 0}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'connector'
                  ? {
                      ...c,
                      toPoint: {
                        x: c.toPoint?.x ?? 0,
                        y: Number(e.target.value) || 0,
                      },
                    }
                  : c
              )
            }
            style={{ padding: '4px 5px', fontSize: 11 }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className="studio-input"
          value={node.label ?? ''}
          onChange={(e) => {
            const label = e.target.value || undefined;
            onUpdateNode(node.id, (c) =>
              c.type === 'connector'
                ? {
                    ...c,
                    label,
                    name: label ? `连线 · ${label}` : '连线箭头',
                  }
                : c
            );
          }}
          placeholder="连线说明文字（可选）"
          style={{ flex: 1 }}
        />
        <select
          className="studio-select"
          value={node.color}
          onChange={(e) =>
            onUpdateNode(node.id, (c) => ({
              ...c,
              color: e.target.value as ChalkColor,
            }))
          }
          style={{ width: 92 }}
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={node.style === 'dashed'}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'connector'
                  ? { ...c, style: e.target.checked ? 'dashed' : 'solid' }
                  : c
              )
            }
          />
          虚线
        </label>
      </div>
    </div>
  );
};
