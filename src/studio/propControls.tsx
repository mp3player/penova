import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { RotateCcw } from 'lucide-react';
import type { MessageKey } from '../i18n';
import type { ChalkColor } from '../model/scene';
import { PluginRegistry } from '../plugins/registry';
import type { PropFieldDescriptor } from '../sdk/propSchema';
import { listSketchIcons, subscribeSketchIcons } from '../sdk/sketchPipeline';
import {
  PropControlContext,
  PropControlPlugin,
  PropControlRenderer,
  StudioNodeUiExtension,
} from './uiRegistry';

const STUDIO_COLOR_OPTIONS: { id: ChalkColor; key: MessageKey }[] = [
  { id: 'white', key: 'color.white' },
  { id: 'yellow', key: 'color.yellow' },
  { id: 'cyan', key: 'color.cyan' },
  { id: 'pink', key: 'color.pink' },
  { id: 'green', key: 'color.green' },
  { id: 'orange', key: 'color.orange' },
];

/**
 * Browser-only registry for property-level UI controls.
 * Even primitive controls ('string', 'number', 'boolean') can be replaced
 * via `propControlRegistry.register(..., { override: true })`, and custom
 * plugins can register bespoke semantic formats (e.g. 'bezier-curve').
 */
export const propControlRegistry = new PluginRegistry<PropControlPlugin>(
  'prop-control'
);

export const ResetPropButton: React.FC<{ ctx: PropControlContext }> = ({
  ctx,
}) => {
  if (!ctx.canReset) return null;
  const resetTarget = ctx.effectiveDefault ?? ctx.field.default;
  return (
    <button
      type="button"
      className="studio-btn"
      onClick={ctx.onReset}
      title={`Reset ${ctx.field.key} -> ${String(resetTarget)}`}
      style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }}
    >
      <RotateCcw size={10} />
    </button>
  );
};

/**
 * 3-tier property control resolution:
 * 1. Per-node/per-field custom component (`uiExt.fieldControls[key]`)
 * 2. UI hint redirect (`uiExt.fieldHints[key].controlId`) or semantic `field.format`
 * 3. Primitive fallback (`field.type`: 'string' | 'number' | 'boolean')
 */
export function resolvePropControl(
  field: PropFieldDescriptor,
  uiExt?: StudioNodeUiExtension
): PropControlRenderer | undefined {
  const fieldOverride = uiExt?.fieldControls?.[field.key];
  if (fieldOverride) return fieldOverride;

  const hintControlId = uiExt?.fieldHints?.[field.key]?.controlId;
  if (hintControlId) {
    const hinted = propControlRegistry.get(hintControlId);
    if (hinted) return hinted.render;
  }

  if (field.format) {
    const formatted = propControlRegistry.get(field.format);
    if (formatted) return formatted.render;
  }

  return propControlRegistry.get(field.type)?.render;
}

const renderStringControl: PropControlRenderer = (ctx) => {
  const strVal = ctx.value !== undefined ? String(ctx.value) : '';
  const compact = Boolean(ctx.hint?.compact);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          className="studio-input"
          value={strVal}
          onChange={(e) => ctx.onChange(e.target.value)}
          placeholder={ctx.placeholder ?? ctx.label}
          title={ctx.label}
          style={{ flex: 1, minWidth: 0 }}
        />
        <ResetPropButton ctx={ctx} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 82,
          flexShrink: 0,
          fontSize: 11,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={ctx.label}
      >
        {ctx.label}
      </span>
      <input
        className="studio-input"
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value)}
        placeholder={ctx.placeholder ?? ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      />
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const NumberControl: React.FC<{ ctx: PropControlContext }> = ({ ctx }) => {
  const valueStr =
    ctx.value !== undefined && ctx.value !== '' ? String(ctx.value) : '';
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(valueStr);

  useEffect(() => {
    if (!focused) {
      setDraft(valueStr);
    }
  }, [focused, valueStr]);

  const effectiveDef = ctx.effectiveDefault ?? ctx.field.default;
  const placeholder =
    ctx.placeholder ??
    (effectiveDef !== undefined ? String(effectiveDef) : undefined);

  const commitDraft = (rawInput: string, finalize: boolean) => {
    const raw = rawInput.trim();
    if (!raw) {
      if (finalize || ctx.field.min === undefined) {
        ctx.onChange(undefined);
      }
      if (finalize) setDraft('');
      return;
    }
    if (!finalize && (raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.'))) {
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      if (finalize) setDraft(valueStr);
      return;
    }
    if (!finalize) {
      const belowMin = ctx.field.min !== undefined && parsed < ctx.field.min;
      const aboveMax = ctx.field.max !== undefined && parsed > ctx.field.max;
      if (belowMin || aboveMax) return;
    }
    ctx.onChange(parsed);
    if (finalize) {
      let clamped = parsed;
      if (ctx.field.min !== undefined) clamped = Math.max(ctx.field.min, clamped);
      if (ctx.field.max !== undefined) clamped = Math.min(ctx.field.max, clamped);
      setDraft(String(clamped));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setDraft(next);
    commitDraft(next, false);
  };

  const handleBlur = () => {
    setFocused(false);
    commitDraft(draft, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitDraft(draft, true);
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setDraft(valueStr);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  if (ctx.hint?.compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {!ctx.hint.hideLabel && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {ctx.label}
          </span>
        )}
        <input
          type="number"
          min={ctx.field.min}
          max={ctx.field.max}
          step={ctx.field.step ?? 1}
          className="studio-input"
          value={focused ? draft : valueStr}
          onFocus={() => {
            setDraft(valueStr);
            setFocused(true);
          }}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? ctx.label}
          title={ctx.label}
          style={{ flex: 1, minWidth: 0, padding: '4px 6px' }}
        />
        <ResetPropButton ctx={ctx} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 82,
          flexShrink: 0,
          fontSize: 11,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={ctx.label}
      >
        {ctx.label}
      </span>
      <input
        type="number"
        min={ctx.field.min}
        max={ctx.field.max}
        step={ctx.field.step ?? 1}
        className="studio-input"
        value={focused ? draft : valueStr}
        onFocus={() => {
          setDraft(valueStr);
          setFocused(true);
        }}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0 }}
      />
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const renderBooleanControl: PropControlRenderer = (ctx) => {
  const checked =
    typeof ctx.resolvedValue === 'boolean'
      ? ctx.resolvedValue
      : ctx.field.default === true;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 24,
      }}
    >
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11.5,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => ctx.onChange(e.target.checked)}
        />
        {ctx.label}
      </label>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const renderTextAreaControl = (
  ctx: PropControlContext,
  opts: { mono: boolean; defaultRows: number }
) => {
  const strVal = ctx.value !== undefined ? String(ctx.value) : '';
  const hideHeader = Boolean(ctx.hint?.hideLabel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {(!hideHeader || ctx.canReset) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            {hideHeader ? '' : ctx.label}
          </span>
          <ResetPropButton ctx={ctx} />
        </div>
      )}
      <textarea
        className="studio-textarea"
        rows={ctx.hint?.rows ?? opts.defaultRows}
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value)}
        placeholder={ctx.placeholder}
        spellCheck={!opts.mono}
        style={{
          fontFamily: opts.mono ? 'var(--font-mono)' : 'inherit',
          fontSize: opts.mono ? 11.5 : undefined,
          lineHeight: opts.mono ? 1.45 : 1.4,
          resize: 'vertical',
        }}
      />
    </div>
  );
};

const renderEnumControl: PropControlRenderer = (ctx) => {
  const strVal = ctx.resolvedValue !== undefined ? String(ctx.resolvedValue) : '';
  const options = ctx.field.enumValues ?? [];
  const hasUnlisted = strVal !== '' && !options.includes(strVal);

  const formatOptionLabel = (opt: string): string => {
    const labelKey = ctx.hint?.optionLabelKeys?.[opt];
    const resolvedText = labelKey
      ? ctx.t(labelKey)
      : ctx.hint?.optionLabels?.[opt] ?? opt;

    if (ctx.hint?.optionTemplateKey) {
      const varName = ctx.hint.optionTemplateVar ?? 'label';
      return ctx.t(ctx.hint.optionTemplateKey, { [varName]: resolvedText });
    }
    return ctx.hint?.hideLabel ? resolvedText : `${ctx.label}: ${resolvedText}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        className="studio-select"
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value || undefined)}
        title={ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      >
        {ctx.field.default === undefined && strVal === '' && (
          <option value="">{ctx.label}: —</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatOptionLabel(opt)}
          </option>
        ))}
        {hasUnlisted && <option value={strVal}>{strVal}</option>}
      </select>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const renderColorControl: PropControlRenderer = (ctx) => {
  const strVal =
    ctx.resolvedValue !== undefined ? String(ctx.resolvedValue) : 'white';
  const tplKey = ctx.hint?.optionTemplateKey ?? 'inspector.colorOption';
  const known = STUDIO_COLOR_OPTIONS.some((c) => c.id === strVal);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        className="studio-select"
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value)}
        title={ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      >
        {STUDIO_COLOR_OPTIONS.map((c) => (
          <option key={c.id} value={c.id}>
            {ctx.hint?.hideLabel
              ? ctx.t(c.key)
              : ctx.t(tplKey, { label: ctx.t(c.key) })}
          </option>
        ))}
        {!known && strVal !== '' && <option value={strVal}>{strVal}</option>}
      </select>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const IconIdControl: React.FC<{ ctx: PropControlContext }> = ({ ctx }) => {
  const iconOptions = useSyncExternalStore(
    subscribeSketchIcons,
    listSketchIcons,
    listSketchIcons
  );
  const rawVal = ctx.resolvedValue ?? ctx.value;
  const strVal = rawVal !== undefined ? String(rawVal).toLowerCase() : '';
  const hasUnlisted = strVal !== '' && !iconOptions.includes(strVal);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        className="studio-select"
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value || undefined)}
        title={ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      >
        <option value="">
          {ctx.label}: {ctx.t('inspector.cardIconNone')}
        </option>
        {iconOptions.map((iconId) => (
          <option key={iconId} value={iconId}>
            {ctx.label}: {iconId}
          </option>
        ))}
        {hasUnlisted && (
          <option value={strVal}>
            {ctx.label}: {strVal}
          </option>
        )}
      </select>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const renderShapeIdControl: PropControlRenderer = (ctx) => {
  const strVal =
    ctx.resolvedValue !== undefined ? String(ctx.resolvedValue) : 'rounded';
  const exclude = new Set(ctx.hint?.excludeIds ?? []);
  const shapes = ctx.shapeOptions.filter((s) => !exclude.has(s.id));
  const isListed =
    (ctx.hint?.allowNone && strVal === 'none') ||
    shapes.some((s) => s.id === strVal);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        className="studio-select"
        value={strVal}
        onChange={(e) => ctx.onChange(e.target.value)}
        title={ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      >
        {ctx.hint?.allowNone && (
          <option value="none">
            {ctx.t(ctx.hint.noneLabelKey ?? 'inspector.cardShapeNone')}
          </option>
        )}
        {shapes.map((s) => {
          const localized = ctx.pluginName(s.id, s.name);
          const text = ctx.hint?.optionTemplateKey
            ? ctx.t(ctx.hint.optionTemplateKey, {
                [ctx.hint.optionTemplateVar ?? 'shape']: localized,
              })
            : localized;
          return (
            <option key={s.id} value={s.id}>
              {text}
            </option>
          );
        })}
        {!isListed && strVal !== '' && <option value={strVal}>{strVal}</option>}
      </select>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

const renderNodeRefControl: PropControlRenderer = (ctx) => {
  const strVal =
    ctx.value !== undefined && ctx.value !== ''
      ? String(ctx.value)
      : '__free__';
  const freeKey = ctx.hint?.freeLabelKey ?? 'inspector.fromFree';
  const nodeKey = ctx.hint?.nodeOptionKey ?? 'inspector.fromNode';
  const isKnownVertex =
    strVal === '__free__' || ctx.topVertices.some((v) => v.id === strVal);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        className="studio-select"
        value={strVal}
        onChange={(e) => {
          const v = e.target.value;
          ctx.onChange(v === '__free__' ? undefined : v);
        }}
        title={ctx.label}
        style={{ flex: 1, minWidth: 0 }}
      >
        <option value="__free__">{ctx.t(freeKey)}</option>
        {ctx.topVertices.map((v) => (
          <option key={v.id} value={v.id}>
            {ctx.t(nodeKey, { name: v.name })}
          </option>
        ))}
        {!isKnownVertex && (
          <option value={strVal}>
            {ctx.t(nodeKey, { name: strVal })}
          </option>
        )}
      </select>
      <ResetPropButton ctx={ctx} />
    </div>
  );
};

export function registerBuiltInPropControls(): void {
  propControlRegistry.register(
    { id: 'string', render: renderStringControl },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'plain', render: renderStringControl },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'number', render: (ctx) => <NumberControl ctx={ctx} /> },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'boolean', render: renderBooleanControl },
    { override: true }
  );
  propControlRegistry.register(
    {
      id: 'multiline',
      render: (ctx) =>
        renderTextAreaControl(ctx, { mono: false, defaultRows: 3 }),
    },
    { override: true }
  );
  propControlRegistry.register(
    {
      id: 'code',
      render: (ctx) =>
        renderTextAreaControl(ctx, { mono: true, defaultRows: 4 }),
    },
    { override: true }
  );
  propControlRegistry.register(
    {
      id: 'svg',
      render: (ctx) =>
        renderTextAreaControl(ctx, { mono: true, defaultRows: 2 }),
    },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'enum', render: renderEnumControl },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'color', render: renderColorControl },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'icon-id', render: (ctx) => <IconIdControl ctx={ctx} /> },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'shape-id', render: renderShapeIdControl },
    { override: true }
  );
  propControlRegistry.register(
    { id: 'node-ref', render: renderNodeRefControl },
    { override: true }
  );
}

registerBuiltInPropControls();
