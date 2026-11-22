import { describe, expect, it } from 'vitest';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import {
  CODEC_HINTS,
  EXPORTER_SHORT_LABELS,
  localizeCodecMeta,
  localizeExporterShort,
  localizePluginName,
  localizeTransitionShort,
  MESSAGES,
  PLUGIN_NAMES,
  TRANSITION_SHORT_LABELS,
  translate,
} from '../i18n';
import { getPresetProjects } from '../model/presets';
import {
  cameraRegistry,
  exportRegistry,
  glyphProviderRegistry,
  handRegistry,
  layoutRegistry,
  presentationRegistry,
  shapeRegistry,
  transitionRegistry,
} from '../plugins';

describe('i18n dictionaries, plugin fallbacks, and bilingual presets', () => {
  it('keeps complete non-empty key parity between en and zh-CN dictionaries', () => {
    const enKeys = Object.keys(MESSAGES.en).sort();
    const zhKeys = Object.keys(MESSAGES['zh-CN']).sort();

    expect(zhKeys).toEqual(enKeys);
    for (const key of enKeys) {
      expect(MESSAGES.en[key as keyof typeof MESSAGES.en].trim().length).toBeGreaterThan(0);
      expect(
        MESSAGES['zh-CN'][key as keyof (typeof MESSAGES)['zh-CN']].trim().length
      ).toBeGreaterThan(0);
    }

    expect(translate('en', 'topbar.exportingPct', { pct: 42 })).toBe(
      'Exporting · 42%'
    );
    expect(translate('zh-CN', 'topbar.exportingPct', { pct: 42 })).toBe(
      '正在导出 · 42%'
    );
  });

  it('covers all built-in plugins in EN and zh-CN while gracefully falling back for custom plugins', () => {
    const allBuiltInIds = [
      ...presentationRegistry.list().map((p) => p.id),
      ...shapeRegistry.list().map((p) => p.id),
      ...layoutRegistry.list().map((p) => p.id),
      ...cameraRegistry.list().map((p) => p.id),
      ...handRegistry.list().map((p) => p.id),
      ...transitionRegistry.list().map((p) => p.id),
      ...exportRegistry.list().map((p) => p.id),
      ...glyphProviderRegistry.list().map((p) => p.id),
    ];

    for (const id of allBuiltInIds) {
      expect(PLUGIN_NAMES.en[id]).toBeTruthy();
      expect(PLUGIN_NAMES['zh-CN'][id]).toBeTruthy();
      expect(localizePluginName('en', id, 'Fallback')).toBe(PLUGIN_NAMES.en[id]);
      expect(localizePluginName('zh-CN', id, 'Fallback')).toBe(
        PLUGIN_NAMES['zh-CN'][id]
      );
    }

    for (const exp of exportRegistry.list()) {
      expect(EXPORTER_SHORT_LABELS.en[exp.id]).toBeTruthy();
      expect(EXPORTER_SHORT_LABELS['zh-CN'][exp.id]).toBeTruthy();
      expect(localizeExporterShort('en', exp.id, exp.shortLabel)).toBe(
        EXPORTER_SHORT_LABELS.en[exp.id]
      );
    }

    for (const tr of transitionRegistry.list()) {
      expect(TRANSITION_SHORT_LABELS.en[tr.id]).toBeTruthy();
      expect(TRANSITION_SHORT_LABELS['zh-CN'][tr.id]).toBeTruthy();
      expect(localizeTransitionShort('en', tr.id, tr.name)).toBe(
        TRANSITION_SHORT_LABELS.en[tr.id]
      );
    }

    const customMeta = localizeCodecMeta('zh-CN', {
      id: 'third-party-codec',
      label: 'Custom DSL',
      hintTitle: 'Custom Syntax',
      hintLines: ['A => B'],
    });
    expect(customMeta.label).toBe('Custom DSL');
    expect(CODEC_HINTS['zh-CN']['graph-dsl'].label).toBe('板书脚本');
    expect(localizePluginName('zh-CN', 'custom-third-party', 'Third-Party')).toBe(
      'Third-Party'
    );
  });

  it('provides parity across all English and Chinese preset projects with clean layouts & timelines', () => {
    const enPresets = getPresetProjects('en');
    const zhPresets = getPresetProjects('zh-CN');

    expect(enPresets.map((p) => p.id)).toEqual(zhPresets.map((p) => p.id));

    for (let i = 0; i < enPresets.length; i++) {
      const enProj = enPresets[i];
      const zhProj = zhPresets[i];
      expect(enProj.scenes.length).toBe(zhProj.scenes.length);

      for (const proj of [enProj, zhProj]) {
        const compiled = compileProjectTimeline(proj);
        expect(compiled.totalDurationMs).toBeGreaterThan(2000);

        for (const scene of proj.scenes) {
          const layout = computeDiagramLayout(scene);
          const vertices = layout.nodes.filter(
            (n) => n.node.type !== 'connector'
          );
          expect(vertices.length).toBeGreaterThan(0);

          for (const v of vertices) {
            expect(Number.isFinite(v.cx)).toBe(true);
            expect(Number.isFinite(v.cy)).toBe(true);
            expect(Number.isFinite(v.width)).toBe(true);
            expect(Number.isFinite(v.height)).toBe(true);
          }

          for (let a = 0; a < vertices.length; a++) {
            for (let b = a + 1; b < vertices.length; b++) {
              const va = vertices[a];
              const vb = vertices[b];
              const sepX = Math.abs(va.cx - vb.cx) < (va.width + vb.width) / 2 - 1;
              const sepY =
                Math.abs(va.cy - vb.cy) < (va.height + vb.height) / 2 - 1;
              expect(sepX && sepY).toBe(false);
            }
          }
        }
      }
    }
  });
});
