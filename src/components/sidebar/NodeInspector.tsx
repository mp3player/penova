import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { isCustomSceneNode, SceneNode } from '../../model/scene';
import { sceneNodeRegistry, ShapePlugin, useRegistryList } from '../../plugins';
import {
  filterVisibleFields,
  PropFieldDescriptor,
  writePropBySchema,
} from '../../sdk/propSchema';
import { resolveNodeSchemaBinding } from '../../studio/nodeSchemas';
import { propControlRegistry, resolvePropControl } from '../../studio/propControls';
import {
  PropControlContext,
  PropControlRenderer,
  StudioExtraSectionContext,
  StudioFieldUiHint,
  studioNodeUiRegistry,
} from '../../studio/uiRegistry';

interface NodeInspectorProps {
  node: SceneNode;
  shapeOptions: ShapePlugin[];
  topVertices: SceneNode[];
  supportsGroups: boolean;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
}

const rendererIdMap = new WeakMap<object, number>();
let nextRendererId = 1;

function getRendererId(fn: object): number {
  let id = rendererIdMap.get(fn);
  if (id === undefined) {
    id = nextRendererId++;
    rendererIdMap.set(fn, id);
  }
  return id;
}

/**
 * Dedicated fiber host for each property control so controls using React Hooks
 * (`useState`, `useEffect`, `useSyncExternalStore`) never attach to NodeInspector's
 * own hook list when `visibleFields` changes or controls are swapped dynamically.
 */
const PropControlHost: React.FC<{
  renderControl: PropControlRenderer;
  ctx: PropControlContext;
}> = ({ renderControl, ctx }) => <>{renderControl(ctx)}</>;

const ExtraSectionHost: React.FC<{
  renderExtra: (ctx: StudioExtraSectionContext) => React.ReactNode;
  ctx: StudioExtraSectionContext;
}> = ({ renderExtra, ctx }) => <>{renderExtra(ctx)}</>;

function parsePropValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  return raw;
}

const RawPropValueInput: React.FC<{
  value: string | number | boolean;
  onCommit: (nextVal: string | number | boolean) => void;
}> = ({ value, onCommit }) => {
  const externalStr = String(value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(externalStr);

  useEffect(() => {
    if (!focused) {
      setDraft(externalStr);
    }
  }, [focused, externalStr]);

  return (
    <input
      className="studio-input"
      value={focused ? draft : externalStr}
      onFocus={() => {
        setDraft(externalStr);
        setFocused(true);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parsePropValue(draft);
        onCommit(parsed);
        setDraft(String(parsed));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const parsed = parsePropValue(draft);
          onCommit(parsed);
          setDraft(String(parsed));
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(externalStr);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      style={{ padding: '4px 6px', fontSize: 11.5 }}
    />
  );
};

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  shapeOptions,
  topVertices,
  supportsGroups,
  onUpdateNode,
  onAddChildToGroup,
}) => {
  const { t, pluginName } = useI18n();

  // Subscribe reactively to both Engine node registry and Browser UI registries
  useRegistryList(propControlRegistry);
  useRegistryList(studioNodeUiRegistry);
  useRegistryList(sceneNodeRegistry);

  const binding = resolveNodeSchemaBinding(node, {
    supportsGroups,
    topVertices,
    t,
  });
  const uiExt = studioNodeUiRegistry.get(binding.uiId);
  const visibleFields = filterVisibleFields(
    binding.fields,
    binding.resolvedValues
  );

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [showRawProps, setShowRawProps] = useState(
    () => binding.showRawProps && !binding.hasPluginSchema
  );

  useEffect(() => {
    setNewKey('');
    setNewVal('');
    setShowRawProps(binding.showRawProps && !binding.hasPluginSchema);
  }, [node.id, binding.showRawProps, binding.hasPluginSchema]);

  const renderFieldCell = (field: PropFieldDescriptor) => {
    const hint: StudioFieldUiHint | undefined =
      uiExt?.fieldHints?.[field.key] ?? binding.fallbackHints?.[field.key];
    const control = resolvePropControl(field, uiExt);
    if (!control) return null;

    const label = hint?.labelKey
      ? t(hint.labelKey)
      : hint?.label ?? field.key;
    const placeholder = hint?.placeholderKey
      ? t(hint.placeholderKey)
      : hint?.placeholder ?? field.description;

    const effectiveDefault =
      binding.fieldDefaults?.[field.key] ?? field.default;
    const explicitVal = binding.explicitValues[field.key];
    const resolvedVal = binding.resolvedValues[field.key];
    const canReset =
      effectiveDefault !== undefined &&
      explicitVal !== undefined &&
      explicitVal !== effectiveDefault;

    const ctx: PropControlContext = {
      field,
      value: explicitVal,
      resolvedValue: resolvedVal,
      effectiveDefault,
      label,
      placeholder,
      hint,
      canReset,
      onChange: (nextVal) =>
        onUpdateNode(node.id, (curr) => binding.write(curr, field.key, nextVal)),
      onReset: () =>
        onUpdateNode(node.id, (curr) => binding.reset(curr, field.key)),
      node,
      shapeOptions,
      topVertices,
      t,
      pluginName,
    };

    const span = hint?.span ?? 2;
    const hostKey = `${field.key}:${getRendererId(control)}`;
    return (
      <div
        key={field.key}
        style={{
          gridColumn: span === 2 ? '1 / -1' : 'auto',
          minWidth: 0,
        }}
      >
        <PropControlHost key={hostKey} renderControl={control} ctx={ctx} />
      </div>
    );
  };

  const rawEntries = isCustomSceneNode(node)
    ? Object.entries(node.props ?? {}).filter(
        (entry): entry is [string, string | number | boolean] =>
          entry[1] !== undefined
      )
    : [];

  const updateRawProp = (
    key: string,
    val: string | number | boolean | undefined
  ) => {
    onUpdateNode(node.id, (curr) => {
      if (!isCustomSceneNode(curr)) return curr;
      const nextProps = { ...(curr.props ?? {}) };
      if (val === undefined) {
        delete nextProps[key];
      } else {
        nextProps[key] = val;
      }
      return { ...curr, props: nextProps };
    });
  };

  const handleAddRawProp = () => {
    const cleanKey = newKey.trim();
    if (!cleanKey) return;
    onUpdateNode(node.id, (curr) =>
      isCustomSceneNode(curr)
        ? {
            ...curr,
            props: writePropBySchema(
              binding.pluginFields,
              curr.props,
              cleanKey,
              parsePropValue(newVal)
            ),
          }
        : curr
    );
    setNewKey('');
    setNewVal('');
  };

  const extraSection = uiExt?.renderExtra;

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
      {binding.badgeText && (
        <div
          style={{
            fontSize: 10.8,
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: 0.2,
          }}
        >
          {binding.badgeText}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '7px 6px',
          alignItems: 'center',
        }}
      >
        {visibleFields.map(renderFieldCell)}
      </div>

      {extraSection && (
        <ExtraSectionHost
          key={`${binding.uiId}:${getRendererId(extraSection)}`}
          renderExtra={extraSection}
          ctx={{
            node,
            onUpdateNode,
            onUpdateProps: (nextProps) =>
              onUpdateNode(node.id, (curr) =>
                isCustomSceneNode(curr) ? { ...curr, props: nextProps } : curr
              ),
            onAddChildToGroup,
            t,
          }}
        />
      )}

      {binding.showRawProps && isCustomSceneNode(node) && (
        <>
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
            {showRawProps ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            <span>
              {binding.hasPluginSchema
                ? t('inspector.advancedPropsToggle')
                : t('inspector.customPropsHeading')}
            </span>
          </button>

          {showRawProps && (
            <>
              {rawEntries.map(([k, v]) => (
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
                  <RawPropValueInput
                    value={v}
                    onCommit={(parsed) => updateRawProp(k, parsed)}
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
                      handleAddRawProp();
                    }
                  }}
                  placeholder={t('inspector.customValPlaceholder')}
                  style={{ padding: '4px 6px', fontSize: 11 }}
                />
                <button
                  type="button"
                  className="studio-btn"
                  onClick={handleAddRawProp}
                  title={t('inspector.customAddProp')}
                  style={{ height: 24, padding: '0 7px', fontSize: 11 }}
                >
                  <Plus size={11} />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
