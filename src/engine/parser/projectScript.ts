import { createProjectFromScene, LessonProject } from '../../model/project';
import {
  AspectRatio,
  CameraMode,
  HandStyle,
  LayoutMode,
  LessonScene,
  ThemeId,
  TransitionId,
} from '../../model/scene';
import {
  cameraRegistry,
  handRegistry,
  layoutRegistry,
  presentationRegistry,
  SceneTextCodec,
  shapeRegistry,
  stripMarkdownFence,
  transitionRegistry,
} from '../../plugins';
import { generateAutoSubtitles } from '../subtitle/subtitleEngine';
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
const SCENE_META_KEYS = new Set([
  'title',
  'theme',
  'layout',
  'camera',
  'hand',
  'transition',
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

function splitSceneSections(lines: string[]): RawSceneSection[] {
  const sections: RawSceneSection[] = [];
  let current: RawSceneSection | null = null;
  const prelude: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(SCENE_HEADER_REGEX);
    if (match) {
      if (current) {
        sections.push(current);
      }
      current = {
        explicitTitle: match[1]?.trim() || undefined,
        lines: [],
      };
    } else if (current) {
      current.lines.push(line);
    } else {
      prelude.push(line);
    }
  }

  if (current) {
    sections.push(current);
    return sections;
  }

  // Fallback when no `=== scene ===` delimiter is present: single-scene script
  return [{ lines: prelude }];
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
  const rawSections = splitSceneSections(restLines);

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
      transitionOut: { type: transitionType },
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
    const finalScene: LessonScene = {
      ...parsed.scene,
      id: baseScene.id,
      theme,
      layoutMode,
      cameraMode,
      aspectRatio,
      handStyle,
      transitionOut: { type: transitionType },
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

  if (autoSubtitles) {
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
  const lines: string[] = [
    '---',
    `title: ${project.title}`,
    `aspectRatio: ${project.aspectRatio}`,
    `subtitles: ${project.subtitles && project.subtitles.length > 0 ? 'auto' : 'off'}`,
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
    if (idx < project.scenes.length - 1 || scene.transitionOut?.type) {
      lines.push(
        `transition: ${scene.transitionOut?.type ?? 'chalkboard-eraser'}`
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

  return lines.join('\n').trimEnd() + '\n';
}

export function generateScriptSpec(): string {
  const themes = presentationRegistry.list();
  const layouts = layoutRegistry.list();
  const shapes = shapeRegistry.list();
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
    '- Each scene starts with optional `key: value` metadata lines (`title`, `theme`, `layout`, `camera`, `hand`, `transition`), terminated by `---`, followed by the scene body formatted for that `layout`’s `textCodec`.',
    '',
    '## 2. Currently Registered Plugins (Valid IDs)',
    '',
    `- **theme**: ${themes.map((t) => `\`${t.id}\` (${t.name})`).join(', ')}`,
    `- **layout**: ${layouts.map((l) => `\`${l.id}\` (${l.name})`).join(', ')}`,
    `- **shape**: ${shapes.map((s) => `\`${s.id}\` (${s.name})`).join(', ')}`,
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
