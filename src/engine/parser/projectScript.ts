import { createProjectFromScene, LessonProject, SubtitleCue } from '../../model/project';
import {
  AspectRatio,
  CameraMode,
  HandStyle,
  LayoutMode,
  LessonScene,
  PacingPreset,
  ThemeId,
  TransitionId,
} from '../../model/scene';
import {
  cameraRegistry,
  handRegistry,
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
  SceneTextCodec,
  shapeRegistry,
  stripMarkdownFence,
  transitionRegistry,
} from '../../plugins';
import { generateAutoSubtitles } from '../subtitle/subtitleEngine';
import { isPacingPreset } from '../timeline/pacing';
import { compileProjectTimeline } from '../timeline/projectTimeline';

export interface ParseProjectScriptOptions {
  fallbackTitle?: string;
  fallbackAspectRatio?: AspectRatio;
}

export interface ParseProjectScriptResult {
  project: LessonProject;
  warnings: string[];
  autoSubtitles: boolean;
}

const SCENE_HEADER_REGEX = /^===\s*scene(?::\s*(.+?))?\s*===$/i;
const SUBTITLES_HEADER_REGEX = /^===\s*subtitles\s*===$/i;
const SCENE_META_KEYS = new Set([
  'title',
  'theme',
  'layout',
  'camera',
  'hand',
  'transition',
  'transitionduration',
  'transition-duration',
  'spotlight',
  'pacing',
]);

interface RawSceneSection {
  explicitTitle?: string;
  lines: string[];
}

function unquote(val: string): string {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function looksLikeDocumentBody(body: string): boolean {
  return /^(##\s+|>>\s+|>\s+|---+$)/m.test(body);
}

function splitTopFrontmatter(lines: string[]): {
  meta: Record<string, string>;
  restLines: string[];
} {
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') {
    start++;
  }

  if (start >= lines.length || lines[start].trim() !== '---') {
    return { meta: {}, restLines: lines };
  }

  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return { meta: {}, restLines: lines };
  }

  const headerLines = lines.slice(start + 1, end);
  const looksLikeKv = headerLines.every((l) => {
    const t = l.trim();
    return t === '' || t.startsWith('//') || /^[a-zA-Z_-]+\s*:/.test(t);
  });

  if (!looksLikeKv) {
    return { meta: {}, restLines: lines };
  }

  const meta: Record<string, string> = {};
  for (const l of headerLines) {
    const t = l.trim();
    if (!t || t.startsWith('//')) continue;
    const colonIdx = t.indexOf(':');
    if (colonIdx !== -1) {
      const k = t.slice(0, colonIdx).trim().toLowerCase();
      const v = unquote(t.slice(colonIdx + 1));
      if (v !== '') meta[k] = v;
    }
  }

  return { meta, restLines: lines.slice(end + 1) };
}

function splitSceneSections(lines: string[]): {
  sections: RawSceneSection[];
  subtitleLines: string[];
} {
  const sections: RawSceneSection[] = [];
  const subtitleLines: string[] = [];
  let current: RawSceneSection | null = null;
  const prelude: string[] = [];
  let inSubtitles = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (SUBTITLES_HEADER_REGEX.test(trimmed)) {
      if (current) {
        sections.push(current);
        current = null;
      }
      inSubtitles = true;
      continue;
    }
    const match = trimmed.match(SCENE_HEADER_REGEX);
    if (match) {
      inSubtitles = false;
      if (current) {
        sections.push(current);
      }
      current = {
        explicitTitle: match[1]?.trim() || undefined,
        lines: [],
      };
    } else if (inSubtitles) {
      subtitleLines.push(line);
    } else if (current) {
      current.lines.push(line);
    } else {
      prelude.push(line);
    }
  }

  if (current) {
    sections.push(current);
    return { sections, subtitleLines };
  }

  if (sections.length > 0) {
    return { sections, subtitleLines };
  }

  // Fallback when no `=== scene ===` delimiter is present: single-scene script
  return { sections: [{ lines: prelude }], subtitleLines };
}

function extractSceneMetadata(lines: string[]): {
  meta: Record<string, string>;
  body: string;
} {
  let idx = 0;
  while (idx < lines.length && lines[idx].trim() === '') {
    idx++;
  }

  const meta: Record<string, string> = {};
  let metaLineCount = 0;
  let scan = idx;

  while (scan < lines.length) {
    const trimmed = lines[scan].trim();
    if (trimmed === '' || trimmed.startsWith('//')) {
      scan++;
      continue;
    }
    if (trimmed === '---') {
      if (metaLineCount > 0) {
        scan++;
      }
      break;
    }
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) break;
    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    if (!SCENE_META_KEYS.has(key)) break;

    const val = unquote(trimmed.slice(colonIdx + 1));
    if (val) meta[key] = val;
    metaLineCount++;
    scan++;
  }

  const bodyStart = metaLineCount > 0 ? scan : idx;
  const body = lines.slice(bodyStart).join('\n').trim();
  return { meta, body };
}

function resolveRegistryId(
  rawId: string | undefined,
  fallbackId: string,
  hasFn: (id: string) => boolean,
  kindLabel: string,
  sceneIdx: number,
  warnings: string[]
): string {
  if (!rawId) return fallbackId;
  if (hasFn(rawId)) return rawId;
  warnings.push(
    `Scene ${sceneIdx + 1}: unknown ${kindLabel} "${rawId}", falling back to "${fallbackId}"`
  );
  return fallbackId;
}

export function parseProjectScript(
  raw: string,
  options?: ParseProjectScriptOptions
): ParseProjectScriptResult {
  const warnings: string[] = [];
  const cleaned = stripMarkdownFence(raw).replace(/\r\n/g, '\n');
  const lines = cleaned.split('\n');

  const { meta: projectMeta, restLines } = splitTopFrontmatter(lines);
  const { sections: rawSections, subtitleLines } =
    splitSceneSections(restLines);

  let aspectRatio: AspectRatio = options?.fallbackAspectRatio ?? '16:9';
  const rawRatio = projectMeta.aspectratio ?? projectMeta['aspect-ratio'];
  if (rawRatio) {
    if (rawRatio === '16:9' || rawRatio === '9:16') {
      aspectRatio = rawRatio;
    } else {
      warnings.push(
        `Unknown aspectRatio "${rawRatio}", defaulting to "${aspectRatio}"`
      );
    }
  }

  const rawSub = (projectMeta.subtitles ?? '').toLowerCase();
  const autoSubtitles =
    rawSub === 'auto' || rawSub === 'true' || rawSub === 'on';

  const defaultTheme = presentationRegistry.getOrDefault('chalkboard').id;
  const defaultHand = handRegistry.getOrDefault('hand-chalk').id;
  const defaultTransition =
    transitionRegistry.getOrDefault('chalkboard-eraser').id;

  const scenes: LessonScene[] = rawSections.map((section, idx) => {
    const { meta, body } = extractSceneMetadata(section.lines);

    const inferredLayout =
      !meta.layout && rawSections.length === 1 && looksLikeDocumentBody(body)
        ? 'document'
        : 'flow-horizontal';

    const layoutMode: LayoutMode = resolveRegistryId(
      meta.layout,
      layoutRegistry.getOrDefault(inferredLayout).id,
      (id) => layoutRegistry.has(id),
      'layout',
      idx,
      warnings
    );

    const preferredTheme =
      !meta.theme && layoutMode === 'document' && presentationRegistry.has('letter-paper')
        ? 'letter-paper'
        : defaultTheme;
    const theme: ThemeId = resolveRegistryId(
      meta.theme,
      preferredTheme,
      (id) => presentationRegistry.has(id),
      'theme',
      idx,
      warnings
    );

    const preferredCamera =
      !meta.camera && layoutMode === 'document' && cameraRegistry.has('pen-follow')
        ? 'pen-follow'
        : cameraRegistry.getOrDefault('auto-follow').id;
    const cameraMode: CameraMode = resolveRegistryId(
      meta.camera,
      preferredCamera,
      (id) => cameraRegistry.has(id),
      'camera',
      idx,
      warnings
    );

    const handStyle: HandStyle = resolveRegistryId(
      meta.hand,
      defaultHand,
      (id) => handRegistry.has(id),
      'hand',
      idx,
      warnings
    );

    const defaultSceneTrans: TransitionId =
      theme === 'letter-paper' && transitionRegistry.has('page-turn')
        ? 'page-turn'
        : defaultTransition;
    const transitionType: TransitionId = resolveRegistryId(
      meta.transition,
      defaultSceneTrans,
      (id) => transitionRegistry.has(id),
      'transition',
      idx,
      warnings
    );
    const rawTransDur = meta.transitionduration ?? meta['transition-duration'];
    const parsedTransDur =
      rawTransDur !== undefined &&
      Number.isFinite(Number(rawTransDur)) &&
      Number(rawTransDur) >= 0
        ? Math.round(Number(rawTransDur))
        : undefined;
    const transitionConfig = {
      type: transitionType,
      ...(parsedTransDur !== undefined ? { durationMs: parsedTransDur } : {}),
    };

    const rawSpotlight = (meta.spotlight ?? '').trim().toLowerCase();
    const spotlight =
      rawSpotlight === 'true' ||
      rawSpotlight === '1' ||
      rawSpotlight === 'on' ||
      rawSpotlight === 'yes';

    const rawPacing = (meta.pacing ?? '').trim().toLowerCase();
    let pacing: PacingPreset | undefined;
    if (rawPacing) {
      if (isPacingPreset(rawPacing)) {
        pacing = rawPacing;
      } else {
        warnings.push(
          `Scene ${idx + 1}: unknown pacing "${rawPacing}", defaulting to "natural"`
        );
      }
    }

    const initialTitle =
      meta.title ??
      section.explicitTitle ??
      `Scene ${idx + 1}`;

    const baseScene: LessonScene = {
      id: `script-scene-${idx + 1}`,
      title: initialTitle,
      theme,
      layoutMode,
      cameraMode,
      aspectRatio,
      handStyle,
      nodes: [],
      transitionOut: transitionConfig,
      ...(spotlight ? { spotlight: true } : {}),
      ...(pacing ? { pacing } : {}),
    };

    const layoutPlugin = layoutRegistry.getOrDefault(layoutMode);
    if (!layoutPlugin.textCodec) {
      if (body.trim()) {
        warnings.push(
          `Scene ${idx + 1}: layout "${layoutMode}" does not define a textCodec`
        );
      }
      return baseScene;
    }

    const parsed = layoutPlugin.textCodec.parse(body, baseScene);
    for (const w of parsed.warnings) {
      warnings.push(`Scene ${idx + 1}: ${w}`);
    }

    // Preserve explicit scene metadata title unless body explicitly declared `# Title`
    const resolvedLayoutMode = meta.layout
      ? layoutMode
      : parsed.scene.layoutMode;
    const finalScene: LessonScene = {
      ...parsed.scene,
      id: baseScene.id,
      theme,
      layoutMode: resolvedLayoutMode,
      cameraMode,
      aspectRatio,
      handStyle,
      transitionOut: transitionConfig,
      ...(spotlight ? { spotlight: true } : {}),
      ...(pacing ? { pacing } : {}),
    };
    return finalScene;
  });

  if (scenes.length === 0) {
    throw new Error('Project script must contain at least one scene');
  }

  const projectTitle =
    projectMeta.title ??
    options?.fallbackTitle ??
    scenes[0].title ??
    'Script Project';

  let project: LessonProject =
    scenes.length === 1
      ? {
          ...createProjectFromScene(scenes[0]),
          id: `proj-script-${Date.now().toString(36)}`,
          title: projectTitle,
          aspectRatio,
        }
      : {
          id: `proj-script-${Date.now().toString(36)}`,
          title: projectTitle,
          aspectRatio,
          scenes,
        };

  const customSubtitles: SubtitleCue[] = [];
  for (const rawSubLine of subtitleLines) {
    const trimmedSub = rawSubLine.trim();
    if (!trimmedSub || trimmedSub.startsWith('//')) continue;
    const m = trimmedSub.match(
      /^(\d+(?:\.\d+)?)\s*->\s*(\d+(?:\.\d+)?)\s*[:：]\s*(.+)$/
    );
    if (m) {
      customSubtitles.push({
        id: `sub-${customSubtitles.length + 1}`,
        startMs: Math.round(Number(m[1])),
        endMs: Math.round(Number(m[2])),
        text: m[3].trim().replace(/\\n/g, '\n'),
      });
    } else {
      warnings.push(`Invalid subtitle cue syntax: "${trimmedSub}"`);
    }
  }

  if (customSubtitles.length > 0) {
    project = {
      ...project,
      subtitles: customSubtitles,
      showSubtitles: true,
    };
  } else if (autoSubtitles) {
    const compiled = compileProjectTimeline(project);
    project = {
      ...project,
      subtitles: generateAutoSubtitles(compiled),
      showSubtitles: true,
    };
  }

  return { project, warnings, autoSubtitles };
}

export function serializeProjectScript(project: LessonProject): string {
  const existingSubtitles = project.subtitles ?? [];
  let subtitleMode: 'auto' | 'custom' | 'off' = 'off';
  if (existingSubtitles.length > 0) {
    const autoCues = generateAutoSubtitles(compileProjectTimeline(project));
    const matchesAuto =
      autoCues.length === existingSubtitles.length &&
      autoCues.every(
        (c, idx) =>
          c.startMs === existingSubtitles[idx].startMs &&
          c.endMs === existingSubtitles[idx].endMs &&
          c.text === existingSubtitles[idx].text
      );
    subtitleMode = matchesAuto ? 'auto' : 'custom';
  }

  const lines: string[] = [
    '---',
    `title: ${project.title}`,
    `aspectRatio: ${project.aspectRatio}`,
    `subtitles: ${subtitleMode}`,
    '---',
    '',
  ];

  project.scenes.forEach((scene, idx) => {
    const layoutPlugin = layoutRegistry.get(scene.layoutMode);
    lines.push('=== scene ===');
    lines.push(`title: ${scene.title}`);
    lines.push(`theme: ${scene.theme}`);
    lines.push(`layout: ${scene.layoutMode}`);
    lines.push(`camera: ${scene.cameraMode}`);
    lines.push(`hand: ${scene.handStyle}`);
    if (scene.spotlight) {
      lines.push('spotlight: true');
    }
    if (typeof scene.pacing === 'string') {
      lines.push(`pacing: ${scene.pacing}`);
    }
    if (idx < project.scenes.length - 1 || scene.transitionOut?.type) {
      lines.push(
        `transition: ${scene.transitionOut?.type ?? 'chalkboard-eraser'}`
      );
    }
    if (scene.transitionOut?.durationMs !== undefined) {
      lines.push(
        `transitionDuration: ${Math.round(scene.transitionOut.durationMs)}`
      );
    }
    lines.push('---');

    if (layoutPlugin?.textCodec) {
      lines.push(layoutPlugin.textCodec.serialize(scene));
    } else {
      lines.push(
        `// Layout "${scene.layoutMode}" uses visual positioning and has no textCodec (${scene.nodes.length} nodes).`
      );
    }
    lines.push('');
  });

  if (subtitleMode === 'custom' && existingSubtitles.length > 0) {
    lines.push('=== subtitles ===');
    for (const cue of existingSubtitles) {
      lines.push(
        `${Math.round(cue.startMs)} -> ${Math.round(cue.endMs)} : ${cue.text
          .replace(/\r?\n/g, '\\n')
          .trim()}`
      );
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function generateScriptSpec(): string {
  const themes = presentationRegistry.list();
  const layouts = layoutRegistry.list();
  const shapes = shapeRegistry.list();
  const sceneNodes = sceneNodeRegistry.list();
  const cameras = cameraRegistry.list();
  const hands = handRegistry.list();
  const transitions = transitionRegistry.list();

  // Group layouts by their textCodec id so each codec rule set is documented cleanly once
  const codecGroups = new Map<
    string,
    { codec: SceneTextCodec; layoutIds: string[] }
  >();
  for (const layout of layouts) {
    if (!layout.textCodec) continue;
    const existing = codecGroups.get(layout.textCodec.id);
    if (existing) {
      existing.layoutIds.push(layout.id);
    } else {
      codecGroups.set(layout.textCodec.id, {
        codec: layout.textCodec,
        layoutIds: [layout.id],
      });
    }
  }

  const out: string[] = [
    '# Penova Declarative Project Script Specification (.penova.md)',
    '',
    'This specification is dynamically generated from Penova’s active plugin registries.',
    'Any script following this format compiles directly into plugins, scenes, animations, and 1080P video.',
    '',
    '## 1. Document Structure',
    '',
    '- Optional top frontmatter (`--- ... ---`): `title`, `aspectRatio` (`16:9` | `9:16`), `subtitles` (`auto` | `off`).',
    '- Divide scenes with `=== scene ===` (or `=== scene: Scene Title ===`).',
    '- Each scene starts with optional `key: value` metadata lines (`title`, `theme`, `layout`, `camera`, `hand`, `transition`, `spotlight`: `true` | `false`, `pacing`: `natural` | `crisp` | `deliberate` | `linear`), terminated by `---`, followed by the scene body formatted for that `layout`’s `textCodec`.',
    '',
    '## 2. Currently Registered Plugins (Valid IDs)',
    '',
    `- **theme**: ${themes.map((t) => `\`${t.id}\` (${t.name})`).join(', ')}`,
    `- **layout**: ${layouts.map((l) => `\`${l.id}\` (${l.name})`).join(', ')}`,
    `- **shape**: ${shapes.map((s) => `\`${s.id}\` (${s.name})`).join(', ')}, \`none\` (Frameless)`,
    ...(sceneNodes.length > 0
      ? [
          `- **scene-node**: ${sceneNodes
            .map((sn) => `\`${sn.id}\` (${sn.name})`)
            .join(', ')}`,
          ...sceneNodes
            .filter((sn) => sn.propFields && sn.propFields.length > 0)
            .map((sn) => {
              const fieldsSummary = sn
                .propFields!.map((f) => {
                  const fmt = f.format && f.format !== 'plain' ? `/${f.format}` : '';
                  const range =
                    f.min !== undefined || f.max !== undefined
                      ? ` [${f.min ?? ''}..${f.max ?? ''}]`
                      : '';
                  return `\`${f.key}\`: ${f.type}${fmt}${range}`;
                })
                .join(', ');
              return `  - \`[node:${sn.id}]\` props: ${fieldsSummary}`;
            }),
        ]
      : []),
    `- **camera**: ${cameras.map((c) => `\`${c.id}\` (${c.name})`).join(', ')}`,
    `- **hand**: ${hands.map((h) => `\`${h.id}\` (${h.name})`).join(', ')}`,
    `- **transition**: ${transitions.map((tr) => `\`${tr.id}\` (${tr.name})`).join(', ')}`,
    '',
    '## 3. Registered Layout Script Formats (`SceneTextCodec`)',
    '',
  ];

  for (const { codec, layoutIds } of codecGroups.values()) {
    out.push(`### Codec \`${codec.id}\` (${codec.label})`);
    out.push(
      `Used by layouts: ${layoutIds.map((id) => `\`${id}\``).join(', ')}`
    );
    out.push('');
    const rules = codec.syntaxRules ?? codec.hintLines;
    for (const r of rules) {
      out.push(`- ${r}`);
    }
    if (codec.example) {
      out.push('');
      out.push('Example scene body:');
      out.push('```markdown');
      out.push(codec.example);
      out.push('```');
    }
    out.push('');
  }

  return out.join('\n').trimEnd() + '\n';
}
