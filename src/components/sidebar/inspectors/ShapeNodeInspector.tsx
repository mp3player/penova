import React from 'react';
import {
  ChalkColor,
  NodeShape,
  SceneNode,
  ShapeSceneNode,
} from '../../../model/scene';
import { ShapePlugin } from '../../../plugins';
import { useI18n } from '../../../i18n';
import { COLOR_OPTIONS } from '../constants';

interface ShapeNodeInspectorProps {
  node: ShapeSceneNode;
  shapeOptions: ShapePlugin[];
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
}

export const ShapeNodeInspector: React.FC<ShapeNodeInspectorProps> = ({
  node,
  shapeOptions,
  onUpdateNode,
}) => {
  const { t, pluginName } = useI18n();
  const isFixed = (node.fitMode ?? 'fixed') === 'fixed';
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
          value={node.shape}
          onChange={(e) => {
            const nextShape = e.target.value as NodeShape;
            onUpdateNode(node.id, (c) =>
              c.type === 'shape'
                ? {
                    ...c,
                    shape: nextShape,
                    name: t('inspector.shapeNamePrefix', { shape: nextShape }),
                  }
                : c
            );
          }}
        >
          {shapeOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {pluginName(s.id, s.name)}
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
              {t('inspector.colorOption', { label: t(c.key) })}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <select
          className="studio-select"
          value={node.fitMode ?? 'fixed'}
          onChange={(e) =>
            onUpdateNode(node.id, (c) =>
              c.type === 'shape'
                ? {
                    ...c,
                    fitMode: e.target.value as 'auto-group' | 'fixed',
                  }
                : c
            )
          }
        >
          <option value="auto-group">{t('inspector.fitAutoGroup')}</option>
          <option value="fixed">{t('inspector.fitFixed')}</option>
        </select>

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
            checked={Boolean(node.emphasized)}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'shape'
                  ? { ...c, emphasized: e.target.checked }
                  : c
              )
            }
          />
          {t('inspector.emphasize')}
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
            checked={Boolean(node.dashed)}
            onChange={(e) =>
              onUpdateNode(node.id, (c) =>
                c.type === 'shape' ? { ...c, dashed: e.target.checked } : c
              )
            }
          />
          {t('inspector.dashed')}
        </label>
      </div>

      {isFixed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
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
            {t('inspector.width')}
            <input
              type="number"
              className="studio-input"
              min={40}
              max={1000}
              value={node.width ?? 160}
              onChange={(e) =>
                onUpdateNode(node.id, (c) =>
                  c.type === 'shape'
                    ? {
                        ...c,
                        width: Math.max(40, Number(e.target.value) || 160),
                      }
                    : c
                )
              }
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
            {t('inspector.height')}
            <input
              type="number"
              className="studio-input"
              min={16}
              max={1000}
              value={node.height ?? (node.shape === 'divider' ? 24 : 78)}
              onChange={(e) =>
                onUpdateNode(node.id, (c) =>
                  c.type === 'shape'
                    ? {
                        ...c,
                        height: Math.max(
                          16,
                          Number(e.target.value) ||
                            (c.shape === 'divider' ? 24 : 78)
                        ),
                      }
                    : c
                )
              }
              style={{ padding: '4px 6px' }}
            />
          </label>
        </div>
      )}
    </div>
  );
};
