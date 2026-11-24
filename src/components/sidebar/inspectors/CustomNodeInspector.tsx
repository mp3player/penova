import React, { useState, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  PropFieldDescriptor,
  readPropBySchema,
  writePropBySchema,
} from '../../../sdk/propSchema';
import {
  listSketchIcons,
  subscribeSketchIcons,
} from '../../../sdk/sketchPipeline';
import {
  ChalkColor,
  CustomSceneNode,
  isCustomSceneNode,
  resolveCustomNodeKind,
  SceneNode,
} from '../../../model/scene';
import { sceneNodeRegistry } from '../../../plugins';
import { studioNodeUiRegistry } from '../../../studio/uiRegistry';
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
  const kind = resolveCustomNodeKind(node);
  const plugin = sceneNodeRegistry.get(kind);
  const uiExt = studioNodeUiRegistry.get(kind);
  const fields = plugin?.propFields ?? [];
  const hasSchema = fields.length > 0;

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [showRawProps, setShowRawProps] = useState(!hasSchema);

  const iconOptions = useSyncExternalStore(
    subscribeSketchIcons,
    listSketchIcons,
    listSketchIcons
  );
  const zoneVal = typeof node.meta?.zone === 'string' ? node.meta.zone : '';
  const propEntries = Object.entries(node.props ?? {}).filter(
    ([, v]) => v !== undefined
  );

  const commitProps = (
    nextProps: Record<string, string | number | boolean | undefined>
  ) => {
    onUpdateNode(node.id, (c) =>
      isCustomSceneNode(c) ? { ...c, props: nextProps } : c
    );
  };

  const updateSchemaField = (
    key: string,
    val: string | number | boolean | undefined
  ) => {
    onUpdateNode(node.id, (c) =>
      isCustomSceneNode(c)
        ? { ...c, props: writePropBySchema(fields, c.props, key, val) }
        : c
    );
  };

  const updateRawProp = (
    key: string,
    val: string | number | boolean | undefined
  ) => {
    onUpdateNode(node.id, (c) =>
      isCustomSceneNode(c)
        ? { ...c, props: writePropBySchema([], c.props, key, val) }
        : c
    );
  };

  const handleAddProp = () => {
    const cleanKey = newKey.trim();
    if (!cleanKey) return;
    updateSchemaField(cleanKey, parsePropValue(newVal));
    setNewKey('');
    setNewVal('');
  };

  const renderResetButton = (
    field: PropFieldDescriptor,
    explicitVal: string | number | boolean | undefined
  ) => {
    if (field.default === undefined || explicitVal === field.default) {
      return null;
    }
    return (
      <button
        type="button"
        className="studio-btn"
        onClick={() => updateSchemaField(field.key, field.default)}
        title={`Reset ${field.key} -> ${String(field.default)}`}
        style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }}
      >
        <RotateCcw size={10} />
      </button>
    );
  };

  const renderSchemaField = (field: PropFieldDescriptor) => {
    const explicitVal = readPropBySchema(fields, node.props, field.key);
    const strVal = explicitVal !== undefined ? String(explicitVal) : '';
    const hint = uiExt?.fieldHints?.[field.key];
    const label = hint?.label ?? field.key;
    const placeholder = hint?.placeholder ?? field.description;

    if (
      field.type === 'string' &&
      (field.format === 'code' ||
        field.format === 'svg' ||
        field.format === 'multiline')
    ) {
      const isMono = field.format === 'code' || field.format === 'svg';
      return (
        <div
          key={field.key}
          style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              {label}
            </span>
            {renderResetButton(field, explicitVal)}
          </div>
          <textarea
            className="studio-textarea"
            rows={hint?.rows ?? 3}
            value={field.format === 'code' ? strVal.replace(/\\n/g, '\n') : strVal}
            onChange={(e) => updateSchemaField(field.key, e.target.value)}
            placeholder={placeholder}
            spellCheck={!isMono}
            style={{
              fontFamily: isMono ? 'var(--font-mono)' : 'inherit',
              fontSize: 11.5,
              lineHeight: 1.45,
              resize: 'vertical',
            }}
          />
        </div>
      );
    }

    if (field.type === 'string' && field.format === 'icon-id') {
      return (
        <div
          key={field.key}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <select
            className="studio-select"
            value={strVal.toLowerCase()}
            onChange={(e) => updateSchemaField(field.key, e.target.value)}
            title={label}
            style={{ flex: 1 }}
          >
            <option value="">
              {label}: {t('inspector.cardIconNone')}
            </option>
            {iconOptions.map((iconId) => (
              <option key={iconId} value={iconId}>
                {label}: {iconId}
              </option>
            ))}
          </select>
          {renderResetButton(field, explicitVal)}
        </div>
      );
    }

    if (field.type === 'string' && field.format === 'enum') {
      return (
        <div
          key={field.key}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <select
            className="studio-select"
            value={strVal}
            onChange={(e) => updateSchemaField(field.key, e.target.value)}
            title={label}
            style={{ flex: 1 }}
          >
            {(field.enumValues ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {label}: {opt}
              </option>
            ))}
          </select>
          {renderResetButton(field, explicitVal)}
        </div>
      );
    }

    if (field.type === 'boolean') {
      const checked =
        typeof explicitVal === 'boolean'
          ? explicitVal
          : field.default === true;
      return (
        <div
          key={field.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => updateSchemaField(field.key, e.target.checked)}
            />
            {label}
          </label>
          {renderResetButton(field, explicitVal)}
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div
          key={field.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              width: 82,
              flexShrink: 0,
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </span>
          <input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className="studio-input"
            value={strVal}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                updateSchemaField(field.key, undefined);
                return;
              }
              const n = Number(raw);
              if (Number.isFinite(n)) {
                updateSchemaField(field.key, n);
              }
            }}
            placeholder={placeholder}
            style={{ flex: 1 }}
          />
          {renderResetButton(field, explicitVal)}
        </div>
      );
    }

    return (
      <div
        key={field.key}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          style={{
            width: 82,
            flexShrink: 0,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        <input
          className="studio-input"
          value={strVal}
          onChange={(e) => updateSchemaField(field.key, e.target.value)}
          placeholder={placeholder ?? label}
          style={{ flex: 1 }}
        />
        {renderResetButton(field, explicitVal)}
      </div>
    );
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

      {fields.map(renderSchemaField)}
      {uiExt?.renderExtra?.({ node, onUpdateProps: commitProps })}

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

      <button
        type="button"
        onClick={() => setShowRawProps((v) => !v)}
        style={{
          border: 'none',
          background: 'transparent',
          padding: '2px 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginTop: 2,
          textAlign: 'left',
        }}
      >
        {showRawProps ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>
          {hasSchema
            ? t('inspector.advancedPropsToggle')
            : t('inspector.customPropsHeading')}
        </span>
      </button>

      {showRawProps && (
        <>
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
                onChange={(e) => updateRawProp(k, parsePropValue(e.target.value))}
                style={{ padding: '4px 6px', fontSize: 11.5 }}
              />
              <button
                type="button"
                className="studio-btn danger"
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => updateRawProp(k, undefined)}
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
        </>
      )}
    </div>
  );
};
