import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NodeInspector } from '../components/sidebar/NodeInspector';
import { I18nProvider } from '../i18n';
import { createCardNode, createCustomNode, createShapeNode, createTextNode } from '../model/builders';
import { ConnectorSceneNode, GroupSceneNode } from '../model/scene';
import { sceneNodeRegistry, shapeRegistry } from '../plugins';
import { defineProps, filterVisibleFields, isFieldVisible, prop } from '../sdk/propSchema';
import {
  FIELD_CONTEXT_SUPPORTS_GROUPS,
  readInlineNodeText,
  resolveNodeSchemaBinding,
  writeInlineNodeText,
} from '../studio/nodeSchemas';
import { propControlRegistry, resolvePropControl } from '../studio/propControls';
import { studioNodeUiRegistry } from '../studio/uiRegistry';

describe('propSchema, propControlRegistry, and unified nodeSchemas', () => {
  it('infers non-nullable defaulted types, preserves intentional empty strings, and filters `when` predicates', () => {
    const schema = defineProps({
      mode: prop.enum(['simple', 'bezier'] as const, { default: 'simple' }),
      curve: prop.string({
        format: 'bezier-curve',
        default: '0.2,0.8,0.4,1',
        when: (v) => v.mode === 'bezier',
      }),
      label: prop.string({ default: 'Title' }),
      count: prop.number({ default: 3, min: 1, max: 10 }),
      enabled: prop.boolean({ default: true }),
      optionalTag: prop.string(),
    });

    const resolved = schema.resolve({ mode: 'simple' });
    // Compile-time type check: defaulted fields resolve to non-nullable types
    const nonNullMode: 'simple' | 'bezier' = resolved.mode;
    const nonNullLabel: string = resolved.label;
    const nonNullCount: number = resolved.count;
    const nonNullEnabled: boolean = resolved.enabled;
    const maybeTag: string | undefined = resolved.optionalTag;
    expect([nonNullMode, nonNullLabel, nonNullCount, nonNullEnabled, maybeTag]).toEqual([
      'simple',
      'Title',
      3,
      true,
      undefined,
    ]);

    expect(isFieldVisible(schema.fields[1], resolved)).toBe(false);
    expect(filterVisibleFields(schema.fields, resolved).map((f) => f.key)).toEqual([
      'mode',
      'label',
      'count',
      'enabled',
      'optionalTag',
    ]);

    const visibleValues = schema.resolve({ mode: 'bezier' });
    expect(isFieldVisible(schema.fields[1], visibleValues)).toBe(true);

    // Clearing a non-enum string with a non-empty default preserves explicit '' instead of deleting
    const clearedProps = schema.writeField(undefined, 'label', '');
    expect(clearedProps).toEqual({ label: '' });
    expect(schema.readField(clearedProps, 'label')).toBe('');
    expect(schema.resolve(clearedProps).label).toBe('');

    // Resetting restores the declared default cleanly
    expect(schema.resetField(clearedProps, 'label')).toEqual({ label: 'Title' });
  });

  it('resolves controls across all 3 tiers and allows custom + primitive overrides', () => {
    const fields = defineProps({
      plainStr: prop.string(),
      tint: prop.string({ format: 'color' }),
      curve: prop.string({ format: 'bezier-curve' }),
      priority: prop.number({ default: 1 }),
    }).fields;

    const defaultStringRenderer = resolvePropControl(fields[0]);
    const colorRenderer = resolvePropControl(fields[1]);
    const defaultNumberRenderer = resolvePropControl(fields[3]);
    expect(defaultStringRenderer).toBeDefined();
    expect(colorRenderer).toBeDefined();
    expect(colorRenderer).not.toBe(defaultStringRenderer);
    expect(defaultNumberRenderer).toBeDefined();

    // Missing custom format falls back to Tier 3 primitive ('string')
    expect(resolvePropControl(fields[2])).toBe(defaultStringRenderer);

    // Tier 2: Register a brand-new semantic format plugin control
    const customCurveRender = () => React.createElement('div', null, 'CurveEditor');
    propControlRegistry.register({ id: 'bezier-curve', render: customCurveRender });
    try {
      expect(resolvePropControl(fields[2])).toBe(customCurveRender);

      // Tier 1.5: UI hint controlId redirect
      expect(
        resolvePropControl(fields[0], {
          id: 'demo',
          fieldHints: { plainStr: { controlId: 'bezier-curve' } },
        })
      ).toBe(customCurveRender);

      // Tier 1: Per-plugin, per-field component override beats Tier 2 & Tier 3
      const perFieldRender = () => React.createElement('span', null, 'InlineOverride');
      expect(
        resolvePropControl(fields[2], {
          id: 'demo',
          fieldControls: { curve: perFieldRender },
          fieldHints: { curve: { controlId: 'color' } },
        })
      ).toBe(perFieldRender);

      // Even primitive controls ('number') can be globally overridden via propControlRegistry
      const customNumberRender = () => React.createElement('input', { type: 'range' });
      propControlRegistry.register(
        { id: 'number', render: customNumberRender },
        { override: true }
      );
      expect(resolvePropControl(fields[3])).toBe(customNumberRender);
    } finally {
      propControlRegistry.unregister('bezier-curve');
      if (defaultNumberRenderer) {
        propControlRegistry.register(
          { id: 'number', render: defaultNumberRenderer },
          { override: true }
        );
      }
    }
  });

  it('unifies IR & custom nodes, avoids prop key collisions, prevents connector self-loops, and preserves plain group children', () => {
    // 1. Text node
    const textNode = createTextNode({
      id: 'txt-1',
      text: 'Hello Penova',
      color: 'cyan',
      fontWeight: 700,
    });
    const textBinding = resolveNodeSchemaBinding(textNode, {
      supportsGroups: false,
      topVertices: [],
    });
    expect(textBinding.uiId).toBe('core:text');
    expect(textBinding.resolvedValues.bold).toBe(true);
    const updatedText = textBinding.write(textNode, 'text', 'Updated Headline');
    expect(updatedText.type === 'text' && updatedText.text).toBe('Updated Headline');
    expect(updatedText.name).toBe('Updated Headline');

    // 2. Shape node defaults (rounded=78 vs divider=24) & conditional `when` dimensions
    const fixedShape = createShapeNode({
      id: 'shp-1',
      shape: 'rounded',
      fitMode: 'fixed',
      width: 200,
    });
    const fixedBinding = resolveNodeSchemaBinding(fixedShape, {
      supportsGroups: false,
      topVertices: [],
    });
    expect(fixedBinding.fieldDefaults?.height).toBe(78);
    expect(
      filterVisibleFields(fixedBinding.fields, fixedBinding.resolvedValues).map((f) => f.key)
    ).toContain('width');

    const dividerShape = createShapeNode({
      id: 'div-1',
      shape: 'divider',
      fitMode: 'fixed',
    });
    const dividerBinding = resolveNodeSchemaBinding(dividerShape, {
      supportsGroups: false,
      topVertices: [],
    });
    expect(dividerBinding.fieldDefaults?.height).toBe(24);
    expect(dividerBinding.resolvedValues.height).toBe(24);

    const autoShape = fixedBinding.write(fixedShape, 'fitMode', 'auto-group');
    const autoBinding = resolveNodeSchemaBinding(autoShape, {
      supportsGroups: false,
      topVertices: [],
    });
    expect(
      filterVisibleFields(autoBinding.fields, autoBinding.resolvedValues).map((f) => f.key)
    ).not.toContain('width');

    // 3. Connector node conditional coordinates, auto-pair binding & self-loop prevention
    const cardA = createCardNode({ id: 'card-a', label: 'A', color: 'white' });
    const cardB = createCardNode({ id: 'card-b', label: 'B', color: 'cyan' });
    const freeConn: ConnectorSceneNode = {
      id: 'edge-1',
      type: 'connector',
      name: 'Edge',
      color: 'white',
      fromPoint: { x: -50, y: 0 },
      toPoint: { x: 50, y: 0 },
    };
    const freeConnBinding = resolveNodeSchemaBinding(freeConn, {
      supportsGroups: true,
      topVertices: [cardA, cardB],
    });
    expect(
      filterVisibleFields(freeConnBinding.fields, freeConnBinding.resolvedValues).map((f) => f.key)
    ).toContain('fromX');
    const boundConn = freeConnBinding.write(freeConn, 'fromId', 'card-a') as ConnectorSceneNode;
    expect(boundConn.fromId).toBe('card-a');
    expect(boundConn.toId).toBe('card-b');

    // Changing fromId to match toId flips toId to another vertex instead of creating B -> B self-loop
    const boundBinding = resolveNodeSchemaBinding(boundConn, {
      supportsGroups: true,
      topVertices: [cardA, cardB],
    });
    expect(
      filterVisibleFields(boundBinding.fields, boundBinding.resolvedValues).map((f) => f.key)
    ).not.toContain('fromX');
    const flippedConn = boundBinding.write(boundConn, 'fromId', 'card-b') as ConnectorSceneNode;
    expect(flippedConn.fromId).toBe('card-b');
    expect(flippedConn.toId).toBe('card-a');

    // Single-vertex scene does not create a self-loop
    const singleVertexBinding = resolveNodeSchemaBinding(freeConn, {
      supportsGroups: true,
      topVertices: [cardA],
    });
    const singleConn = singleVertexBinding.write(freeConn, 'fromId', 'card-a') as ConnectorSceneNode;
    expect(singleConn.fromId).toBe('card-a');
    expect(singleConn.toId).toBeUndefined();

    // 4. Card defaults (`concept`), Plain group defaults (`stack`), and inline edit safety
    const cardBinding = resolveNodeSchemaBinding(cardA, {
      supportsGroups: true,
      topVertices: [cardA, cardB],
    });
    expect(cardBinding.uiId).toBe('core:card');
    expect(cardBinding.fields.find((f) => f.key === 'role')?.default).toBe('concept');
    expect(cardBinding.explicitValues[FIELD_CONTEXT_SUPPORTS_GROUPS]).toBe(true);

    const plainGroup: GroupSceneNode = {
      id: 'grp-1',
      type: 'group',
      name: 'Stack Box',
      color: 'yellow',
      arrange: 'stack',
      children: [createTextNode({ id: 'child-1', text: 'Child 1', color: 'white' })],
    };
    const groupBinding = resolveNodeSchemaBinding(plainGroup, {
      supportsGroups: true,
      topVertices: [],
    });
    expect(groupBinding.uiId).toBe('core:group');
    expect(studioNodeUiRegistry.get('core:group')?.renderExtra).toBeTypeOf('function');

    // Inline editing a plain group updates `name` and preserves all children (never converts to card!)
    expect(readInlineNodeText(plainGroup)).toBe('Stack Box');
    const renamedGroup = writeInlineNodeText(plainGroup, 'Renamed Stack') as GroupSceneNode;
    expect(renamedGroup.name).toBe('Renamed Stack');
    expect(renamedGroup.arrange).toBe('stack');
    expect(renamedGroup.children).toHaveLength(1);

    // 5. Built-in custom node Reset restores schema defaults (matching plugin defaults)
    const chartNode = createCustomNode({
      id: 'chart-1',
      kind: 'chart',
      name: 'KPI Chart',
      props: { title: 'Revenue', values: '10,20,30', height: 220 },
    });
    const chartBinding = resolveNodeSchemaBinding(chartNode, {
      supportsGroups: false,
      topVertices: [],
    });
    expect(chartBinding.uiId).toBe('chart');
    expect(chartBinding.hasPluginSchema).toBe(true);
    const resetChart = chartBinding.reset(chartNode, 'values');
    expect(resetChart.type === 'custom:chart' && resetChart.props?.values).toBe('22,48,76,100');

    // 6. Custom SceneNodePlugin declaring `color`/`name`/`zone`/`say`/`pause` never collides
    const collisionProps = defineProps({
      color: prop.string({ default: '#ff00ff' }),
      name: prop.string({ default: 'BadgeName' }),
      zone: prop.string({ default: 'Z1' }),
      say: prop.string({ default: 'SayProp' }),
      pause: prop.number({ default: 150 }),
    });
    sceneNodeRegistry.register({
      id: 'collision-test-widget',
      name: 'Collision Test',
      propFields: collisionProps.fields,
    });
    try {
      const collisionNode = createCustomNode({
        id: 'col-1',
        kind: 'collision-test-widget',
        name: 'OuterName',
        color: 'cyan',
        props: { color: '#112233', name: 'InnerPropName' },
      });
      const colBinding = resolveNodeSchemaBinding(collisionNode, {
        supportsGroups: true,
        topVertices: [],
      });
      const fieldKeys = colBinding.fields.map((f) => f.key);
      expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
      expect(colBinding.explicitValues.$color).toBe('cyan');
      expect(colBinding.explicitValues.color).toBe('#112233');

      const afterPluginWrite = colBinding.write(collisionNode, 'color', '#445566');
      expect(afterPluginWrite.color).toBe('cyan');
      expect(
        afterPluginWrite.type === 'custom:collision-test-widget' &&
          afterPluginWrite.props?.color
      ).toBe('#445566');

      const afterBaseWrite = colBinding.write(afterPluginWrite, '$color', 'pink');
      expect(afterBaseWrite.color).toBe('pink');
      expect(
        afterBaseWrite.type === 'custom:collision-test-widget' &&
          afterBaseWrite.props?.color
      ).toBe('#445566');
    } finally {
      sceneNodeRegistry.unregister('collision-test-widget');
    }
  });

  it('mounts NodeInspector cleanly with hook-using custom controls, literal \\n in code, and fallback select options', () => {
    const shapes = shapeRegistry.list();
    const fixedShape = createShapeNode({
      id: 's-hook-1',
      shape: 'unregistered-custom-shape' as 'rounded',
      fitMode: 'fixed',
    });
    const autoShape = createShapeNode({
      id: 's-hook-2',
      shape: 'rounded',
      fitMode: 'auto-group',
    });

    // Register a stateful hook-using field control on `core:shape.width` (toggled by `when`)
    const prevCoreShapeUi = studioNodeUiRegistry.get('core:shape')!;
    studioNodeUiRegistry.register(
      {
        ...prevCoreShapeUi,
        fieldControls: {
          width: (ctx) => {
            const [localCount] = useState(42);
            return React.createElement('div', { 'data-hook-test': localCount }, String(ctx.resolvedValue));
          },
        },
      },
      { override: true }
    );

    try {
      const htmlFixed = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(NodeInspector, {
            node: fixedShape,
            shapeOptions: shapes,
            topVertices: [],
            supportsGroups: false,
            onUpdateNode: () => {},
            onAddChildToGroup: () => {},
          })
        )
      );
      expect(htmlFixed).toContain('data-hook-test="42"');
      // Unregistered shape ID gets an explicit fallback <option>
      expect(htmlFixed).toContain('unregistered-custom-shape');

      const htmlAuto = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(NodeInspector, {
            node: autoShape,
            shapeOptions: shapes,
            topVertices: [],
            supportsGroups: false,
            onUpdateNode: () => {},
            onAddChildToGroup: () => {},
          })
        )
      );
      expect(htmlAuto).not.toContain('data-hook-test');

      // Built-in SceneNode plugins ship zero hardcoded studioNodeUiRegistry overrides
      expect(studioNodeUiRegistry.get('code')).toBeUndefined();
      expect(studioNodeUiRegistry.get('chart')).toBeUndefined();
      expect(studioNodeUiRegistry.get('sketch')).toBeUndefined();
      expect(studioNodeUiRegistry.get('icon')).toBeUndefined();

      // Code node preserves literal `\n` instead of splitting into an actual newline
      const codeNode = createCustomNode({
        id: 'code-escaped',
        kind: 'code',
        name: 'Escaped',
        props: { lines: 'console.log("a\\nb");' },
      });
      const htmlCode = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(NodeInspector, {
            node: codeNode,
            shapeOptions: shapes,
            topVertices: [],
            supportsGroups: false,
            onUpdateNode: () => {},
            onAddChildToGroup: () => {},
          })
        )
      );
      expect(htmlCode).toContain('console.log(&quot;a\\nb&quot;);');

      // Sketch node with unset `icon` defaults selection to 'rocket'
      const sketchNode = createCustomNode({
        id: 'sketch-default-icon',
        kind: 'sketch',
        name: 'Sketch',
        props: {},
      });
      const htmlSketch = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(NodeInspector, {
            node: sketchNode,
            shapeOptions: shapes,
            topVertices: [],
            supportsGroups: false,
            onUpdateNode: () => {},
            onAddChildToGroup: () => {},
          })
        )
      );
      expect(htmlSketch).toMatch(/<option value="rocket" selected=""/);
    } finally {
      studioNodeUiRegistry.register(prevCoreShapeUi, { override: true });
    }
  });
});
