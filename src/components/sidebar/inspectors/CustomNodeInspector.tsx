import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ChalkColor,
  CustomSceneNode,
  isCustomSceneNode,
  resolveCustomNodeKind,
  SceneNode,
} from '../../../model/scene';
import { useI18n } from '../../../i18n';
import { COLOR_OPTIONS } from '../constants';

interface CustomNodeInspectorProps {
  node: CustomSceneNode;
  supportsGroups: boolean;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
}

function parsePropValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  return raw;
}

export const CustomNodeInspector: React.FC<CustomNodeInspectorProps> = ({
  node,
  supportsGroups,
  onUpdateNode,
}) => {
  const { t } = useI18n();
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const kind = resolveCustomNodeKind(node);
  const zoneVal = typeof node.meta?.zone === 'string' ? node.meta.zone : '';
  const propEntries = Object.entries(node.props ?? {}).filter(
    ([, v]) => v !== undefined
  );

  const handleAddProp = () => {
    const cleanKey = newKey.trim();
    if (!cleanKey) return;
    onUpdateNode(node.id, (c) =>
      isCustomSceneNode(c)
        ? {
            ...c,
            props: {
              ...(c.props ?? {}),
              [cleanKey]: parsePropValue(newVal),
            },
          }
        : c
    );
    setNewKey('');
    setNewVal('');
  };

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
          fontSize: 10.8,
          fontWeight: 600,
          color: 'var(--accent)',
          letterSpacing: 0.2,
        }}
      >
        {t('inspector.customKindBadge', { kind })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        <input
          className="studio-input"
          value={node.name}
          onChange={(e) =>
            onUpdateNode(node.id, (c) => ({ ...c, name: e.target.value }))
          }
          placeholder={t('inspector.customNamePlaceholder')}
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
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {t('inspector.colorOption', { label: t(c.key) })}
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
          placeholder={t('inspector.zonePlaceholder')}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 84px',
          gap: 6,
        }}
      >
        <input
          className="studio-input"
          value={typeof node.meta?.say === 'string' ? node.meta.say : ''}
          onChange={(e) => {
            const nextSay = e.target.value || undefined;
            onUpdateNode(node.id, (c) => ({
              ...c,
              meta: { ...(c.meta ?? {}), say: nextSay },
            }));
          }}
          placeholder={t('inspector.nodeSayLabel')}
        />
        <input
          type="number"
          min={0}
          step={50}
          className="studio-input"
          value={
            typeof node.meta?.pause === 'number' &&
            Number.isFinite(node.meta.pause)
              ? String(node.meta.pause)
              : ''
          }
          onChange={(e) => {
            const raw = e.target.value.trim();
            const num = raw === '' ? undefined : Math.max(0, Number(raw));
            const nextPause =
              num !== undefined && Number.isFinite(num)
                ? Math.round(num)
                : undefined;
            onUpdateNode(node.id, (c) => ({
              ...c,
              meta: { ...(c.meta ?? {}), pause: nextPause },
            }));
          }}
          placeholder={t('inspector.nodePauseLabel')}
          title={t('inspector.nodePauseLabel')}
        />
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginTop: 2,
        }}
      >
        {t('inspector.customPropsHeading')}
      </div>

      {propEntries.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: 'grid',
            gridTemplateColumns: '88px 1fr 24px',
            gap: 5,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={k}
          >
            {k}
          </span>
          <input
            className="studio-input"
            value={String(v)}
            onChange={(e) => {
              const nextVal = parsePropValue(e.target.value);
              onUpdateNode(node.id, (c) =>
                isCustomSceneNode(c)
                  ? {
                      ...c,
                      props: {
                        ...(c.props ?? {}),
                        [k]: nextVal,
                      },
                    }
                  : c
              );
            }}
            style={{ padding: '4px 6px', fontSize: 11.5 }}
          />
          <button
            type="button"
            className="studio-btn danger"
            style={{ width: 24, height: 24, padding: 0 }}
            onClick={() =>
              onUpdateNode(node.id, (c) => {
                if (!isCustomSceneNode(c)) return c;
                const nextProps = { ...(c.props ?? {}) };
                delete nextProps[k];
                return { ...c, props: nextProps };
              })
            }
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '88px 1fr auto',
          gap: 5,
          alignItems: 'center',
        }}
      >
        <input
          className="studio-input"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={t('inspector.customKeyPlaceholder')}
          style={{ padding: '4px 6px', fontSize: 11 }}
        />
        <input
          className="studio-input"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddProp();
            }
          }}
          placeholder={t('inspector.customValPlaceholder')}
          style={{ padding: '4px 6px', fontSize: 11 }}
        />
        <button
          type="button"
          className="studio-btn"
          onClick={handleAddProp}
          title={t('inspector.customAddProp')}
          style={{ height: 24, padding: '0 7px', fontSize: 11 }}
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
};
