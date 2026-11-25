import { Plus } from 'lucide-react';
import type { MessageKey } from '../i18n';
import {
  getCardSummary,
  isCardGroupNode,
  updateCardGroupNode,
} from '../model/builders';
import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  GroupSceneNode,
  isCustomSceneNode,
  NodeShape,
  resolveCustomNodeKind,
  SceneNode,
  ShapeSceneNode,
  TextAlign,
  TextSceneNode,
} from '../model/scene';
import { sceneNodeRegistry } from '../plugins';
import {
  defineProps,
  prop,
  PropFieldDescriptor,
  PropValuesMap,
  readPropBySchema,
  writePropBySchema,
} from '../sdk/propSchema';
import { StudioFieldUiHint, studioNodeUiRegistry } from './uiRegistry';

export const FIELD_CONTEXT_SUPPORTS_GROUPS = '$supportsGroups';

const CARD_ROLES = ['root', 'step', 'concept', 'highlight', 'note'] as const;
const ARRANGE_VALUES = ['card', 'stack', 'free'] as const;
const ALIGN_VALUES = ['left', 'center', 'right'] as const;
const FIT_MODE_VALUES = ['auto-group', 'fixed'] as const;

export const textNodeSchema = defineProps({
  text: prop.string({ format: 'multiline' }),
  color: prop.string({ format: 'color', default: 'white' }),
  align: prop.enum(ALIGN_VALUES, { default: 'center' }),
  fontSize: prop.number({ default: 20, min: 10, max: 64, step: 1 }),
  maxWidth: prop.number({ default: 220, min: 60, max: 1200, step: 10 }),
  bold: prop.boolean({ default: false }),
  say: prop.string({ format: 'plain' }),
  pause: prop.number({ min: 0, step: 50 }),
});

export const shapeNodeSchema = defineProps({
  shape: prop.string({ format: 'shape-id', default: 'rounded' }),
  color: prop.string({ format: 'color', default: 'white' }),
  fitMode: prop.enum(FIT_MODE_VALUES, { default: 'fixed' }),
  emphasized: prop.boolean({ default: false }),
  dashed: prop.boolean({ default: false }),
  width: prop.number({
    default: 160,
    min: 40,
    max: 1000,
    step: 1,
    when: (v) => (v.fitMode ?? 'fixed') === 'fixed',
  }),
  height: prop.number({
    default: 78,
    min: 16,
    max: 1000,
    step: 1,
    when: (v) => (v.fitMode ?? 'fixed') === 'fixed',
  }),
});

export const connectorNodeSchema = defineProps({
  fromId: prop.string({ format: 'node-ref' }),
  toId: prop.string({ format: 'node-ref' }),
  fromX: prop.number({
    default: -90,
    step: 1,
    when: (v) => !v.fromId || !v.toId,
  }),
  fromY: prop.number({
    default: 0,
    step: 1,
    when: (v) => !v.fromId || !v.toId,
  }),
  toX: prop.number({
    default: 90,
    step: 1,
    when: (v) => !v.fromId || !v.toId,
  }),
  toY: prop.number({
    default: 0,
    step: 1,
    when: (v) => !v.fromId || !v.toId,
  }),
  label: prop.string({ format: 'plain' }),
  color: prop.string({ format: 'color', default: 'white' }),
  dashed: prop.boolean({ default: false }),
});

export const cardGroupSchema = defineProps({
  label: prop.string({ format: 'plain' }),
  subtitle: prop.string({ format: 'plain' }),
  role: prop.enum(CARD_ROLES, { default: 'concept' }),
  shape: prop.string({ format: 'shape-id', default: 'rounded' }),
  icon: prop.string({ format: 'icon-id' }),
  arrange: prop.enum(ARRANGE_VALUES, { default: 'card' }),
  color: prop.string({ format: 'color', default: 'white' }),
  zone: prop.string({
    format: 'plain',
    when: (v) => v[FIELD_CONTEXT_SUPPORTS_GROUPS] === true,
  }),
  say: prop.string({ format: 'plain' }),
  pause: prop.number({ min: 0, step: 50 }),
});

export const plainGroupSchema = defineProps({
  name: prop.string({ format: 'plain' }),
  arrange: prop.enum(ARRANGE_VALUES, { default: 'stack' }),
  color: prop.string({ format: 'color', default: 'white' }),
  zone: prop.string({
    format: 'plain',
    when: (v) => v[FIELD_CONTEXT_SUPPORTS_GROUPS] === true,
  }),
  say: prop.string({ format: 'plain' }),
  pause: prop.number({ min: 0, step: 50 }),
});

// Namespaced synthetic keys so custom plugin props (`name`, `color`, `zone`,
// `say`, `pause`) can coexist safely in node.props without colliding.
const customBaseSchema = defineProps({
  $name: prop.string({ format: 'plain' }),
  $color: prop.string({ format: 'color', default: 'white' }),
});

const customMetaSchema = defineProps({
  $zone: prop.string({
    format: 'plain',
    when: (v) => v[FIELD_CONTEXT_SUPPORTS_GROUPS] === true,
  }),
  $say: prop.string({ format: 'plain' }),
  $pause: prop.number({ min: 0, step: 50 }),
});

const META_UI_HINTS = {
  zone: {
    compact: true,
    span: 2 as const,
    placeholderKey: 'inspector.zonePlaceholder' as MessageKey,
  },
  say: {
    compact: true,
    span: 1 as const,
    placeholderKey: 'inspector.nodeSayLabel' as MessageKey,
  },
  pause: {
    compact: true,
    hideLabel: true,
    span: 1 as const,
    placeholderKey: 'inspector.nodePauseLabel' as MessageKey,
    labelKey: 'inspector.nodePauseLabel' as MessageKey,
  },
};

export function registerCoreNodeUiExtensions(): void {
  studioNodeUiRegistry.register(
    {
      id: 'core:text',
      inlineEditPropKey: 'text',
      fieldHints: {
        text: {
          rows: 2,
          span: 2,
          hideLabel: true,
          placeholderKey: 'inspector.textPlaceholder',
        },
        color: { span: 1 },
        align: {
          span: 1,
          optionLabelKeys: {
            left: 'align.left',
            center: 'align.center',
            right: 'align.right',
          },
          optionTemplateKey: 'inspector.alignOption',
          optionTemplateVar: 'label',
        },
        fontSize: { compact: true, span: 1, labelKey: 'inspector.fontSize' },
        maxWidth: { compact: true, span: 1, labelKey: 'inspector.lineWidth' },
        bold: { span: 2, labelKey: 'inspector.bold' },
        say: META_UI_HINTS.say,
        pause: META_UI_HINTS.pause,
      },
    },
    { override: true }
  );

  studioNodeUiRegistry.register(
    {
      id: 'core:shape',
      fieldHints: {
        shape: { span: 1, excludeIds: [] },
        color: { span: 1 },
        fitMode: {
          span: 2,
          hideLabel: true,
          optionLabelKeys: {
            'auto-group': 'inspector.fitAutoGroup',
            fixed: 'inspector.fitFixed',
          },
        },
        emphasized: { span: 1, labelKey: 'inspector.emphasize' },
        dashed: { span: 1, labelKey: 'inspector.dashed' },
        width: { compact: true, span: 1, labelKey: 'inspector.width' },
        height: { compact: true, span: 1, labelKey: 'inspector.height' },
      },
    },
    { override: true }
  );

  studioNodeUiRegistry.register(
    {
      id: 'core:connector',
      inlineEditPropKey: 'label',
      fieldHints: {
        fromId: {
          span: 1,
          freeLabelKey: 'inspector.fromFree',
          nodeOptionKey: 'inspector.fromNode',
        },
        toId: {
          span: 1,
          freeLabelKey: 'inspector.toFree',
          nodeOptionKey: 'inspector.toNode',
        },
        fromX: { compact: true, span: 1, labelKey: 'inspector.fromXTitle' },
        fromY: { compact: true, span: 1, labelKey: 'inspector.fromYTitle' },
        toX: { compact: true, span: 1, labelKey: 'inspector.toXTitle' },
        toY: { compact: true, span: 1, labelKey: 'inspector.toYTitle' },
        label: {
          compact: true,
          span: 2,
          placeholderKey: 'inspector.edgeLabelPlaceholder',
        },
        color: { span: 1, hideLabel: true },
        dashed: { span: 1, labelKey: 'inspector.dashed' },
      },
    },
    { override: true }
  );

  studioNodeUiRegistry.register(
    {
      id: 'core:card',
      inlineEditPropKey: 'label',
      fieldHints: {
        label: {
          compact: true,
          span: 2,
          placeholderKey: 'inspector.cardTitleLabel',
        },
        subtitle: {
          compact: true,
          span: 2,
          placeholderKey: 'inspector.cardSubtitleLabel',
        },
        role: {
          span: 1,
          optionTemplateKey: 'inspector.cardRoleLabel',
          optionTemplateVar: 'role',
        },
        shape: {
          span: 1,
          allowNone: true,
          noneLabelKey: 'inspector.cardShapeNone',
          excludeIds: ['divider'],
          optionTemplateKey: 'inspector.cardShapeLabel',
          optionTemplateVar: 'shape',
        },
        icon: { span: 2, labelKey: 'inspector.cardIconLabel' },
        arrange: {
          span: 1,
          optionLabelKeys: {
            card: 'arrange.card',
            stack: 'arrange.stack',
            free: 'arrange.free',
          },
          optionTemplateKey: 'inspector.groupArrangeOption',
          optionTemplateVar: 'label',
        },
        color: { span: 1, optionTemplateKey: 'inspector.groupToneOption' },
        zone: META_UI_HINTS.zone,
        say: META_UI_HINTS.say,
        pause: META_UI_HINTS.pause,
      },
    },
    { override: true }
  );

  studioNodeUiRegistry.register(
    {
      id: 'core:group',
      inlineEditPropKey: 'name',
      fieldHints: {
        name: {
          compact: true,
          span: 2,
          placeholderKey: 'inspector.groupNamePlaceholder',
        },
        arrange: {
          span: 1,
          optionLabelKeys: {
            card: 'arrange.card',
            stack: 'arrange.stack',
            free: 'arrange.free',
          },
          optionTemplateKey: 'inspector.groupArrangeOption',
          optionTemplateVar: 'label',
        },
        color: { span: 1, optionTemplateKey: 'inspector.groupToneOption' },
        zone: META_UI_HINTS.zone,
        say: META_UI_HINTS.say,
        pause: META_UI_HINTS.pause,
      },
      renderExtra: ({ node, onAddChildToGroup, t }) => {
        if (node.type !== 'group') return null;
        const isCard: boolean = isCardGroupNode(node);
        if (isCard) return null;
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="studio-btn"
              style={{ flex: 1, height: 26, fontSize: 11.5 }}
              onClick={() => onAddChildToGroup(node.id, 'text')}
            >
              <Plus size={12} />
              {t('inspector.addChildText')}
            </button>
            <button
              type="button"
              className="studio-btn"
              style={{ flex: 1, height: 26, fontSize: 11.5 }}
              onClick={() => onAddChildToGroup(node.id, 'shape')}
            >
              <Plus size={12} />
              {t('inspector.addChildShape')}
            </button>
          </div>
        );
      },
    },
    { override: true }
  );
}

registerCoreNodeUiExtensions();

export interface NodeSchemaBindingOptions {
  supportsGroups: boolean;
  topVertices: SceneNode[];
  t?: (key: MessageKey, params?: Record<string, string | number>) => string;
}

export interface ResolvedNodeSchemaBinding {
  uiId: string;
  badgeText?: string;
  fields: readonly PropFieldDescriptor[];
  pluginFields: readonly PropFieldDescriptor[];
  fieldDefaults?: Record<string, string | number | boolean | undefined>;
  fallbackHints?: Record<string, StudioFieldUiHint>;
  explicitValues: PropValuesMap;
  resolvedValues: PropValuesMap;
  write(
    node: SceneNode,
    key: string,
    value: string | number | boolean | undefined
  ): SceneNode;
  reset(node: SceneNode, key: string): SceneNode;
  showRawProps: boolean;
  hasPluginSchema: boolean;
}

function clampNumber(
  value: string | number | boolean | undefined,
  min?: number,
  max?: number
): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  let out = n;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function normalizePause(
  value: string | number | boolean | undefined
): number | undefined {
  const n = clampNumber(value, 0);
  return n !== undefined ? Math.round(n) : undefined;
}

function readMetaValues(
  node: SceneNode,
  supportsGroups: boolean,
  prefix = ''
): PropValuesMap {
  return {
    [FIELD_CONTEXT_SUPPORTS_GROUPS]: supportsGroups,
    [`${prefix}zone`]:
      typeof node.meta?.zone === 'string' ? node.meta.zone : undefined,
    [`${prefix}say`]:
      typeof node.meta?.say === 'string' ? node.meta.say : undefined,
    [`${prefix}pause`]:
      typeof node.meta?.pause === 'number' && Number.isFinite(node.meta.pause)
        ? node.meta.pause
        : undefined,
  };
}

function writeMetaField(
  node: SceneNode,
  key: 'zone' | 'say' | 'pause',
  value: string | number | boolean | undefined
): SceneNode {
  const nextVal =
    key === 'pause'
      ? normalizePause(value)
      : typeof value === 'string' && value.length > 0
      ? value
      : undefined;
  return {
    ...node,
    meta: { ...(node.meta ?? {}), [key]: nextVal },
  };
}

const defaultTranslate = (
  key: MessageKey,
  params?: Record<string, string | number>
): string => {
  if (key === 'inspector.defaultTextName') return 'Text';
  if (key === 'inspector.shapeNamePrefix') return `Shape (${params?.shape ?? ''})`;
  if (key === 'inspector.edgeNamePrefix') return `Edge · ${params?.label ?? ''}`;
  if (key === 'inspector.edgeDefaultName') return 'Connector Arrow';
  if (key === 'inspector.customKindBadge') return `Custom Node (${params?.kind ?? ''})`;
  return String(key);
};

export function resolveNodeSchemaBinding(
  node: SceneNode,
  opts: NodeSchemaBindingOptions
): ResolvedNodeSchemaBinding {
  const tr = opts.t ?? defaultTranslate;

  if (node.type === 'text') {
    const explicitValues: PropValuesMap = {
      text: node.text,
      color: node.color,
      align: node.align,
      fontSize: node.fontSize,
      maxWidth: node.maxWidth,
      bold: node.fontWeight === 700,
      ...readMetaValues(node, opts.supportsGroups),
    };
    const resolvedValues: PropValuesMap = {
      ...explicitValues,
      align: node.align ?? 'center',
      fontSize: node.fontSize ?? 20,
      maxWidth: node.maxWidth ?? 220,
      bold: (node.fontWeight ?? 400) === 700,
    };

    const writeText = (
      curr: SceneNode,
      key: string,
      value: string | number | boolean | undefined
    ): SceneNode => {
      if (curr.type !== 'text') return curr;
      const tNode: TextSceneNode = curr;
      switch (key) {
        case 'text': {
          const textVal = typeof value === 'string' ? value : String(value ?? '');
          return {
            ...tNode,
            text: textVal,
            name: textVal.trim().slice(0, 18) || tr('inspector.defaultTextName'),
          };
        }
        case 'color':
          return { ...tNode, color: (value as ChalkColor) ?? 'white' };
        case 'align':
          return { ...tNode, align: (value as TextAlign) ?? 'center' };
        case 'fontSize':
          return { ...tNode, fontSize: clampNumber(value, 10, 64) };
        case 'maxWidth':
          return { ...tNode, maxWidth: clampNumber(value, 60, 1200) };
        case 'bold':
          return { ...tNode, fontWeight: value ? 700 : 400 };
        case 'say':
        case 'pause':
          return writeMetaField(tNode, key, value);
        default:
          return tNode;
      }
    };

    return {
      uiId: 'core:text',
      fields: textNodeSchema.fields,
      pluginFields: [],
      explicitValues,
      resolvedValues,
      write: writeText,
      reset: (curr, key) =>
        writeText(
          curr,
          key,
          key === 'fontSize' || key === 'maxWidth'
            ? undefined
            : textNodeSchema.fields.find((f) => f.key === key)?.default
        ),
      showRawProps: false,
      hasPluginSchema: false,
    };
  }

  if (node.type === 'shape') {
    const defaultH = node.shape === 'divider' ? 24 : 78;
    const explicitValues: PropValuesMap = {
      shape: node.shape,
      color: node.color,
      fitMode: node.fitMode ?? 'fixed',
      emphasized: Boolean(node.emphasized),
      dashed: Boolean(node.dashed),
      width: node.width,
      height: node.height,
    };
    const resolvedValues: PropValuesMap = {
      ...explicitValues,
      width: node.width ?? 160,
      height: node.height ?? defaultH,
    };

    const writeShape = (
      curr: SceneNode,
      key: string,
      value: string | number | boolean | undefined
    ): SceneNode => {
      if (curr.type !== 'shape') return curr;
      const sNode: ShapeSceneNode = curr;
      switch (key) {
        case 'shape': {
          const nextShape = (value as NodeShape) || 'rounded';
          return {
            ...sNode,
            shape: nextShape,
            name: tr('inspector.shapeNamePrefix', { shape: nextShape }),
          };
        }
        case 'color':
          return { ...sNode, color: (value as ChalkColor) ?? 'white' };
        case 'fitMode':
          return {
            ...sNode,
            fitMode: (value as 'auto-group' | 'fixed') ?? 'fixed',
          };
        case 'emphasized':
          return { ...sNode, emphasized: Boolean(value) };
        case 'dashed':
          return { ...sNode, dashed: Boolean(value) };
        case 'width':
          return { ...sNode, width: clampNumber(value, 40, 1000) };
        case 'height':
          return { ...sNode, height: clampNumber(value, 16, 1000) };
        default:
          return sNode;
      }
    };

    return {
      uiId: 'core:shape',
      fields: shapeNodeSchema.fields,
      pluginFields: [],
      fieldDefaults: { height: defaultH },
      explicitValues,
      resolvedValues,
      write: writeShape,
      reset: (curr, key) =>
        writeShape(
          curr,
          key,
          key === 'width' || key === 'height'
            ? undefined
            : shapeNodeSchema.fields.find((f) => f.key === key)?.default
        ),
      showRawProps: false,
      hasPluginSchema: false,
    };
  }

  if (node.type === 'connector') {
    const explicitValues: PropValuesMap = {
      fromId: node.fromId,
      toId: node.toId,
      fromX: node.fromPoint?.x,
      fromY: node.fromPoint?.y,
      toX: node.toPoint?.x,
      toY: node.toPoint?.y,
      label: node.label,
      color: node.color,
      dashed: node.style === 'dashed',
    };
    const resolvedValues: PropValuesMap = {
      ...explicitValues,
      fromX: node.fromPoint?.x ?? -90,
      fromY: node.fromPoint?.y ?? 0,
      toX: node.toPoint?.x ?? 90,
      toY: node.toPoint?.y ?? 0,
    };

    const writeConnector = (
      curr: SceneNode,
      key: string,
      value: string | number | boolean | undefined
    ): SceneNode => {
      if (curr.type !== 'connector') return curr;
      const cNode: ConnectorSceneNode = curr;
      switch (key) {
        case 'fromId': {
          const v = typeof value === 'string' && value.length > 0 ? value : undefined;
          if (!v) {
            return {
              ...cNode,
              fromId: undefined,
              toId: undefined,
              fromPoint: cNode.fromPoint ?? { x: -90, y: 0 },
              toPoint: cNode.toPoint ?? { x: 90, y: 0 },
            };
          }
          const nextTo =
            cNode.toId && cNode.toId !== v
              ? cNode.toId
              : opts.topVertices.find((vertex) => vertex.id !== v)?.id;
          return {
            ...cNode,
            fromId: v,
            toId: nextTo,
          };
        }
        case 'toId': {
          const v = typeof value === 'string' && value.length > 0 ? value : undefined;
          if (!v) {
            return {
              ...cNode,
              fromId: undefined,
              toId: undefined,
              fromPoint: cNode.fromPoint ?? { x: -90, y: 0 },
              toPoint: cNode.toPoint ?? { x: 90, y: 0 },
            };
          }
          const nextFrom =
            cNode.fromId && cNode.fromId !== v
              ? cNode.fromId
              : opts.topVertices.find((vertex) => vertex.id !== v)?.id;
          return {
            ...cNode,
            fromId: nextFrom,
            toId: v,
          };
        }
        case 'fromX':
          return {
            ...cNode,
            fromPoint: {
              x: clampNumber(value) ?? -90,
              y: cNode.fromPoint?.y ?? 0,
            },
          };
        case 'fromY':
          return {
            ...cNode,
            fromPoint: {
              x: cNode.fromPoint?.x ?? -90,
              y: clampNumber(value) ?? 0,
            },
          };
        case 'toX':
          return {
            ...cNode,
            toPoint: {
              x: clampNumber(value) ?? 90,
              y: cNode.toPoint?.y ?? 0,
            },
          };
        case 'toY':
          return {
            ...cNode,
            toPoint: {
              x: cNode.toPoint?.x ?? 90,
              y: clampNumber(value) ?? 0,
            },
          };
        case 'label': {
          const nextLabel =
            typeof value === 'string' && value.length > 0 ? value : undefined;
          return {
            ...cNode,
            label: nextLabel,
            name: nextLabel
              ? tr('inspector.edgeNamePrefix', { label: nextLabel })
              : tr('inspector.edgeDefaultName'),
          };
        }
        case 'color':
          return { ...cNode, color: (value as ChalkColor) ?? 'white' };
        case 'dashed':
          return { ...cNode, style: value ? 'dashed' : 'solid' };
        default:
          return cNode;
      }
    };

    return {
      uiId: 'core:connector',
      fields: connectorNodeSchema.fields,
      pluginFields: [],
      explicitValues,
      resolvedValues,
      write: writeConnector,
      reset: (curr, key) =>
        writeConnector(
          curr,
          key,
          connectorNodeSchema.fields.find((f) => f.key === key)?.default
        ),
      showRawProps: false,
      hasPluginSchema: false,
    };
  }

  if (node.type === 'group') {
    const groupNode: GroupSceneNode = node;
    const isCard: boolean = isCardGroupNode(groupNode);
    if (isCard) {
      const summary = getCardSummary(groupNode);
      const explicitValues: PropValuesMap = {
        [FIELD_CONTEXT_SUPPORTS_GROUPS]: opts.supportsGroups,
        label: summary.label,
        subtitle: summary.subtitle,
        role: summary.role,
        shape: summary.shape,
        icon: summary.icon,
        arrange: groupNode.arrange ?? 'card',
        color: summary.color,
        zone: summary.zone,
        say: summary.say,
        pause: summary.pause,
      };

      const writeCard = (
        curr: SceneNode,
        key: string,
        value: string | number | boolean | undefined
      ): SceneNode => {
        if (curr.type !== 'group') return curr;
        if (key === 'arrange') {
          return {
            ...curr,
            arrange: (value as GroupSceneNode['arrange']) ?? 'card',
          };
        }
        if (!isCardGroupNode(curr)) return curr;
        switch (key) {
          case 'label':
            return updateCardGroupNode(curr, {
              label: typeof value === 'string' ? value : String(value ?? ''),
            });
          case 'subtitle':
            return updateCardGroupNode(curr, {
              subtitle:
                typeof value === 'string' && value.length > 0
                  ? value
                  : undefined,
            });
          case 'role':
            return updateCardGroupNode(curr, {
              role: (value as CardRole) ?? 'concept',
            });
          case 'shape':
            return updateCardGroupNode(curr, {
              shape: (value as NodeShape) ?? 'rounded',
            });
          case 'icon':
            return updateCardGroupNode(curr, {
              icon:
                typeof value === 'string' && value.length > 0
                  ? value
                  : undefined,
            });
          case 'color':
            return updateCardGroupNode(curr, {
              color: (value as ChalkColor) ?? 'white',
            });
          case 'zone':
            return updateCardGroupNode(curr, {
              zone:
                typeof value === 'string' && value.length > 0
                  ? value
                  : undefined,
            });
          case 'say':
            return updateCardGroupNode(curr, {
              say:
                typeof value === 'string' && value.length > 0
                  ? value
                  : undefined,
            });
          case 'pause':
            return updateCardGroupNode(curr, {
              pause: normalizePause(value),
            });
          default:
            return curr;
        }
      };

      return {
        uiId: 'core:card',
        fields: cardGroupSchema.fields,
        pluginFields: [],
        explicitValues,
        resolvedValues: { ...explicitValues },
        write: writeCard,
        reset: (curr, key) =>
          writeCard(
            curr,
            key,
            cardGroupSchema.fields.find((f) => f.key === key)?.default
          ),
        showRawProps: false,
        hasPluginSchema: false,
      };
    }

    const explicitValues: PropValuesMap = {
      name: groupNode.name,
      arrange: groupNode.arrange ?? 'stack',
      color: groupNode.color,
      ...readMetaValues(groupNode, opts.supportsGroups),
    };

    const writeGroup = (
      curr: SceneNode,
      key: string,
      value: string | number | boolean | undefined
    ): SceneNode => {
      if (curr.type !== 'group') return curr;
      switch (key) {
        case 'name':
          return {
            ...curr,
            name: typeof value === 'string' ? value : String(value ?? ''),
          };
        case 'arrange':
          return {
            ...curr,
            arrange: (value as GroupSceneNode['arrange']) ?? 'stack',
          };
        case 'color':
          return { ...curr, color: (value as ChalkColor) ?? 'white' };
        case 'zone':
        case 'say':
        case 'pause':
          return writeMetaField(curr, key, value);
        default:
          return curr;
      }
    };

    return {
      uiId: 'core:group',
      fields: plainGroupSchema.fields,
      pluginFields: [],
      explicitValues,
      resolvedValues: { ...explicitValues },
      write: writeGroup,
      reset: (curr, key) =>
        writeGroup(
          curr,
          key,
          plainGroupSchema.fields.find((f) => f.key === key)?.default
        ),
      showRawProps: false,
      hasPluginSchema: false,
    };
  }

  // Custom SceneNodePlugin node
  const kind = isCustomSceneNode(node) ? resolveCustomNodeKind(node) : 'custom';
  const plugin = sceneNodeRegistry.get(kind);
  const pluginFields = plugin?.propFields ?? [];
  const baseFields = customBaseSchema.fields;
  const metaFields = customMetaSchema.fields;
  const combinedFields: PropFieldDescriptor[] = [
    ...baseFields,
    ...pluginFields,
    ...metaFields,
  ];

  const fallbackHints: Record<string, StudioFieldUiHint> = {
    $name: {
      compact: true,
      span: 1,
      placeholderKey: 'inspector.customNamePlaceholder',
    },
    $color: { span: 1 },
    $zone: META_UI_HINTS.zone,
    $say: META_UI_HINTS.say,
    $pause: META_UI_HINTS.pause,
  };

  const explicitValues: PropValuesMap = {
    $name: node.name,
    $color: node.color,
    ...readMetaValues(node, opts.supportsGroups, '$'),
  };
  const resolvedValues: PropValuesMap = { ...explicitValues };

  if (isCustomSceneNode(node)) {
    for (const f of pluginFields) {
      const val = readPropBySchema(pluginFields, node.props, f.key);
      explicitValues[f.key] = val;
      resolvedValues[f.key] = val !== undefined ? val : f.default;
    }
  }

  const writeCustom = (
    curr: SceneNode,
    key: string,
    value: string | number | boolean | undefined
  ): SceneNode => {
    if (!isCustomSceneNode(curr)) return curr;
    if (key === '$name') {
      return {
        ...curr,
        name: typeof value === 'string' ? value : String(value ?? ''),
      };
    }
    if (key === '$color') {
      return { ...curr, color: (value as ChalkColor) ?? 'white' };
    }
    if (key === '$zone' || key === '$say' || key === '$pause') {
      return writeMetaField(curr, key.slice(1) as 'zone' | 'say' | 'pause', value);
    }

    return {
      ...curr,
      props: writePropBySchema(pluginFields, curr.props, key, value),
    };
  };

  return {
    uiId: kind,
    badgeText: tr('inspector.customKindBadge', { kind }),
    fields: combinedFields,
    pluginFields,
    fallbackHints,
    explicitValues,
    resolvedValues,
    write: writeCustom,
    reset: (curr, key) => {
      if (key.startsWith('$')) {
        const def = combinedFields.find((f) => f.key === key)?.default;
        return writeCustom(curr, key, def);
      }
      const pluginDef = pluginFields.find((f) => f.key === key)?.default;
      return writeCustom(curr, key, pluginDef);
    },
    showRawProps: true,
    hasPluginSchema: pluginFields.length > 0,
  };
}

export function readInlineNodeText(node: SceneNode): string {
  const binding = resolveNodeSchemaBinding(node, {
    supportsGroups: false,
    topVertices: [],
  });
  const propKey = studioNodeUiRegistry.get(binding.uiId)?.inlineEditPropKey;
  if (propKey) {
    const val = binding.explicitValues[propKey] ?? binding.resolvedValues[propKey];
    if (typeof val === 'string') {
      return val;
    }
  }
  return node.name;
}

export function writeInlineNodeText(
  node: SceneNode,
  nextText: string,
  topVertices: SceneNode[] = []
): SceneNode {
  const trimmed = nextText.trim();
  if (!trimmed) return node;
  const binding = resolveNodeSchemaBinding(node, {
    supportsGroups: false,
    topVertices,
  });
  const propKey = studioNodeUiRegistry.get(binding.uiId)?.inlineEditPropKey;
  if (propKey) {
    return binding.write(node, propKey, trimmed);
  }
  return { ...node, name: trimmed };
}
