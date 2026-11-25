import type { ReactNode } from 'react';
import type { MessageKey } from '../i18n';
import type { SceneNode } from '../model/scene';
import type { ShapePlugin } from '../plugins/contracts';
import { PluginRegistry } from '../plugins/registry';
import type { PropFieldDescriptor } from '../sdk/propSchema';

export interface StudioFieldUiHint {
  label?: string;
  labelKey?: MessageKey;
  placeholder?: string;
  placeholderKey?: MessageKey;
  rows?: number;
  span?: 1 | 2;
  compact?: boolean;
  hideLabel?: boolean;
  controlId?: string;
  optionLabels?: Record<string, string>;
  optionLabelKeys?: Record<string, MessageKey>;
  optionTemplateKey?: MessageKey;
  optionTemplateVar?: string;
  allowNone?: boolean;
  noneLabelKey?: MessageKey;
  excludeIds?: readonly string[];
  freeLabelKey?: MessageKey;
  nodeOptionKey?: MessageKey;
}

export interface PropControlContext {
  field: PropFieldDescriptor;
  value: string | number | boolean | undefined;
  resolvedValue: string | number | boolean | undefined;
  effectiveDefault?: string | number | boolean;
  label: string;
  placeholder?: string;
  hint?: StudioFieldUiHint;
  onChange: (nextVal: string | number | boolean | undefined) => void;
  onReset: () => void;
  canReset: boolean;
  node: SceneNode;
  shapeOptions: ShapePlugin[];
  topVertices: SceneNode[];
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  pluginName: (id: string, fallback: string) => string;
}

export type PropControlRenderer = (ctx: PropControlContext) => ReactNode;

export interface PropControlPlugin {
  id: string;
  render: PropControlRenderer;
}

export interface StudioExtraSectionContext {
  node: SceneNode;
  onUpdateNode: (
    nodeId: string,
    updater: (node: SceneNode) => SceneNode
  ) => void;
  onUpdateProps: (
    nextProps: Record<string, string | number | boolean | undefined>
  ) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

export interface StudioNodeUiExtension {
  id: string;
  inlineEditPropKey?: string;
  fieldHints?: Record<string, StudioFieldUiHint>;
  fieldControls?: Record<string, PropControlRenderer>;
  renderExtra?(ctx: StudioExtraSectionContext): ReactNode;
}

/**
 * Browser-only companion UI registry (decoupled from headless Engine & Plugins).
 * Optional entries refine editor hints, inline-edit targets, per-field controls,
 * or custom sections without polluting engine contracts or scripts/bundle-skill.py.
 */
export const studioNodeUiRegistry = new PluginRegistry<StudioNodeUiExtension>(
  'studio-node-ui'
);
