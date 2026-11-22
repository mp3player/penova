import React from 'react';
import {
  ChalkColor,
  SceneNode,
  TextAlign,
  TextSceneNode,
} from '../../../model/scene';
import { ALIGN_OPTIONS, COLOR_OPTIONS } from '../constants';

interface TextNodeInspectorProps {
  node: TextSceneNode;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
}

export const TextNodeInspector: React.FC<TextNodeInspectorProps> = ({
  node,
  onUpdateNode,
}) => {
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
      <textarea
        className="studio-textarea"
        rows={2}
        value={node.text}
        onChange={(e) => {
          const val = e.target.value;
          onUpdateNode(node.id, (curr) =>
            curr.type === 'text'
              ? {
                  ...curr,
                  text: val,
                  name: val.trim().slice(0, 20) || '文本',
                }
              : curr
          );
        }}
        placeholder="输入文字内容..."
        style={{ resize: 'vertical', lineHeight: 1.4 }}
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
              颜色：{c.label}
            </option>
          ))}
        </select>

        <select
          className="studio-select"
          value={node.align ?? 'center'}
          onChange={(e) =>
            onUpdateNode(node.id, (c) =>
              c.type === 'text'
                ? { ...c, align: e.target.value as TextAlign }
                : c
            )
          }
        >
          {ALIGN_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              对齐：{a.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          字号
          <input
            type="number"
            className="studio-input"
            min={10}
            max={64}
            value={node.fontSize ?? 20}
            onChange={(e) => {
              const val = Math.max(
                10,
                Math.min(64, Number(e.target.value) || 20)
              );
              onUpdateNode(node.id, (c) =>
                c.type === 'text' ? { ...c, fontSize: val } : c
              );
            }}
            style={{ padding: '4px 6px' }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          行宽
          <input
            type="number"
            className="studio-input"
            min={60}
            max={1200}
            step={10}
            value={node.maxWidth ?? 220}
            onChange={(e) => {
              const val = Math.max(
                60,
                Math.min(1200, Number(e.target.value) || 220)
              );
              onUpdateNode(node.id, (c) =>
                c.type === 'text' ? { ...c, maxWidth: val } : c
              );
            }}
            style={{ padding: '4px 6px' }}
          />
        </label>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={(node.fontWeight ?? 400) === 700}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'text'
                  ? { ...c, fontWeight: e.target.checked ? 700 : 400 }
                  : c
              )
            }
          />
          加粗
        </label>
      </div>
    </div>
  );
};
