import type { ReactNode } from 'react';
import { CustomSceneNode } from '../model/scene';
import { PluginRegistry } from '../plugins/registry';

export interface StudioFieldUiHint {
  label?: string;
  placeholder?: string;
  rows?: number;
}

export interface StudioExtraSectionContext {
  node: CustomSceneNode;
  onUpdateProps: (
    nextProps: Record<string, string | number | boolean | undefined>
  ) => void;
}

export interface StudioNodeUiExtension {
  id: string;
  inlineEditPropKey?: string;
  fieldHints?: Record<string, StudioFieldUiHint>;
  renderExtra?(ctx: StudioExtraSectionContext): ReactNode;
}

/**
 * Browser-only companion UI registry (decoupled from headless Engine & Plugins).
 * Optional entries refine editor hints, inline-edit targets, or custom sections
 * without polluting engine contracts or scripts/bundle-skill.py.
 */
export const studioNodeUiRegistry = new PluginRegistry<StudioNodeUiExtension>(
  'studio-node-ui'
);

studioNodeUiRegistry.register(
  {
    id: 'code',
    inlineEditPropKey: 'title',
    fieldHints: {
      title: { label: 'Title', placeholder: 'demo.penova.md' },
      lines: {
        label: 'Code Lines',
        rows: 4,
        placeholder: 'const x = 1;\nrender(x);',
      },
      width: { label: 'Width', placeholder: 'Auto' },
    },
  },
  { override: true }
);

studioNodeUiRegistry.register(
  {
    id: 'chart',
    inlineEditPropKey: 'title',
    fieldHints: {
      title: { label: 'Title', placeholder: 'Metrics' },
      values: { label: 'Values', placeholder: '22,48,76,100' },
      labels: { label: 'Labels', placeholder: 'Q1,Q2,Q3,Q4' },
      highlight: { label: 'Highlight', placeholder: '3' },
      width: { label: 'Width', placeholder: 'Auto' },
      height: { label: 'Height', placeholder: '196' },
    },
  },
  { override: true }
);

studioNodeUiRegistry.register(
  {
    id: 'sketch',
    inlineEditPropKey: 'caption',
    fieldHints: {
      icon: { label: 'Icon' },
      caption: { label: 'Caption', placeholder: 'Optional caption' },
      width: { label: 'Width', placeholder: '168' },
      height: { label: 'Height', placeholder: '128' },
      svg: {
        label: 'Custom SVG / Path',
        rows: 2,
        placeholder: '<svg>...</svg> or d="..."',
      },
    },
  },
  { override: true }
);

studioNodeUiRegistry.register(
  {
    id: 'icon',
    fieldHints: {
      icon: { label: 'Icon' },
      size: { label: 'Size (px)', placeholder: '36' },
      svg: {
        label: 'Custom SVG / Path',
        rows: 2,
        placeholder: '<svg>...</svg> or d="..."',
      },
    },
  },
  { override: true }
);
