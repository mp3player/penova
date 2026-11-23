import { cloneProject, LessonProject, SubtitleCue } from './project';
import {
  ChalkColor,
  ConnectorSceneNode,
  CustomSceneNode,
  GroupSceneNode,
  LessonScene,
  Point,
  SceneNode,
  ShapeSceneNode,
  TeachingStep,
  TextAlign,
  TextSceneNode,
} from './scene';

export const PROJECT_SCHEMA_VERSION = 1;
export const LEGACY_DRAFT_STORAGE_KEY = 'pencil-studio:draft:v1';
export const DRAFT_STORAGE_KEY = 'penova-studio:draft:v1';

export interface SerializedProjectFile {
  format: 'penova-project' | 'pencil-project';
  version: number;
  exportedAt: string;
  project: LessonProject;
}

const VALID_COLORS = new Set<ChalkColor>([
  'white',
  'yellow',
  'cyan',
  'pink',
  'green',
  'orange',
]);

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function finiteNumber(val: unknown): number | undefined {
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
}

function sanitizePoint(raw: unknown): Point | undefined {
  if (!isRecord(raw)) return undefined;
  const x = finiteNumber(raw.x);
  const y = finiteNumber(raw.y);
  return x !== undefined && y !== undefined ? { x, y } : undefined;
}

function sanitizeMeta(
  raw: unknown
): Record<string, string | number | boolean | undefined> | undefined {
  if (!isRecord(raw)) return undefined;
  const cleaned: Record<string, string | number | boolean | undefined> = {};
  let hasEntry = false;
  for (const [k, v] of Object.entries(raw)) {
    if (
      typeof v === 'string' ||
      typeof v === 'boolean' ||
      (typeof v === 'number' && Number.isFinite(v))
    ) {
      cleaned[k] = v;
      hasEntry = true;
    }
  }
  return hasEntry ? cleaned : undefined;
}

function sanitizeSceneNode(
  raw: unknown,
  pathLabel: string,
  warnings: string[]
): SceneNode | null {
  if (!isRecord(raw)) {
    warnings.push(`节点 ${pathLabel} 格式无效，已跳过`);
    return null;
  }

  const rawType = raw.type;
  const isCustomType =
    rawType === 'custom' ||
    (typeof rawType === 'string' && rawType.startsWith('custom:'));
  if (
    rawType !== 'text' &&
    rawType !== 'shape' &&
    rawType !== 'connector' &&
    rawType !== 'group' &&
    !isCustomType
  ) {
    warnings.push(
      `节点 ${pathLabel} 类型 "${String(rawType)}" 不受支持，已跳过`
    );
    return null;
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `imported-node-${pathLabel}`;
  const rawColor = typeof raw.color === 'string' ? raw.color : '';
  const color: ChalkColor = VALID_COLORS.has(rawColor as ChalkColor)
    ? (rawColor as ChalkColor)
    : 'white';
  const visible = typeof raw.visible === 'boolean' ? raw.visible : undefined;
  const offset = sanitizePoint(raw.offset);
  const meta = sanitizeMeta(raw.meta);

  if (rawType === 'text') {
    const text = typeof raw.text === 'string' ? raw.text : '';
    const fontSizeRaw = finiteNumber(raw.fontSize);
    const fontSize =
      fontSizeRaw !== undefined
        ? Math.max(8, Math.min(96, fontSizeRaw))
        : undefined;
    const fontWeight = raw.fontWeight === 700 ? 700 : 400;
    const maxW = finiteNumber(raw.maxWidth);
    const maxWidth = maxW !== undefined && maxW > 0 ? maxW : undefined;
    const align: TextAlign | undefined =
      raw.align === 'left' || raw.align === 'center' || raw.align === 'right'
        ? raw.align
        : undefined;
    const indentRaw = finiteNumber(raw.indentChars);
    const indentChars =
      indentRaw !== undefined && indentRaw >= 0 ? indentRaw : undefined;

    const node: TextSceneNode = {
      id,
      type: 'text',
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name
          : text.trim().slice(0, 18) || '文本',
      color,
      visible,
      offset,
      meta,
      text,
      fontSize,
      fontWeight,
      maxWidth,
      align,
      indentChars,
    };
    return node;
  }

  if (rawType === 'shape') {
    const shape =
      typeof raw.shape === 'string' && raw.shape.trim()
        ? raw.shape.trim()
        : 'rounded';
    const wRaw = finiteNumber(raw.width);
    const hRaw = finiteNumber(raw.height);
    const fitMode =
      raw.fitMode === 'auto-group' || raw.fitMode === 'fixed'
        ? raw.fitMode
        : undefined;

    const node: ShapeSceneNode = {
      id,
      type: 'shape',
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name
          : `图形 (${shape})`,
      color,
      visible,
      offset,
      meta,
      shape,
      width: wRaw !== undefined && wRaw > 0 ? wRaw : undefined,
      height: hRaw !== undefined && hRaw > 0 ? hRaw : undefined,
      fitMode,
      emphasized:
        typeof raw.emphasized === 'boolean' ? raw.emphasized : undefined,
      dashed: typeof raw.dashed === 'boolean' ? raw.dashed : undefined,
    };
    return node;
  }

  if (rawType === 'connector') {
    const label = typeof raw.label === 'string' ? raw.label : undefined;
    const node: ConnectorSceneNode = {
      id,
      type: 'connector',
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name
          : label
          ? `连线 · ${label}`
          : '连线箭头',
      color,
      visible,
      offset,
      meta,
      fromId: typeof raw.fromId === 'string' ? raw.fromId : undefined,
      toId: typeof raw.toId === 'string' ? raw.toId : undefined,
      fromPoint: sanitizePoint(raw.fromPoint),
      toPoint: sanitizePoint(raw.toPoint),
      label,
      style: raw.style === 'dashed' ? 'dashed' : 'solid',
    };
    return node;
  }

  if (isCustomType) {
    const rawKind =
      typeof raw.kind === 'string' && raw.kind.trim()
        ? raw.kind.trim()
        : typeof rawType === 'string' && rawType.startsWith('custom:')
        ? rawType.slice('custom:'.length).trim()
        : 'custom';
    const kind = rawKind || 'custom';
    const node: CustomSceneNode = {
      id,
      type: `custom:${kind}`,
      kind,
      name:
        typeof raw.name === 'string' && raw.name.trim() ? raw.name : kind,
      color,
      visible,
      offset,
      meta,
      props: sanitizeMeta(raw.props),
    };
    return node;
  }

  // GroupSceneNode
  if (!Array.isArray(raw.children)) {
    warnings.push(`组合节点 ${pathLabel} 缺少 children 数组，已重置为空组合`);
  }
  const rawChildren = Array.isArray(raw.children) ? raw.children : [];
  const children = rawChildren
    .map((child, idx) =>
      sanitizeSceneNode(child, `${pathLabel}-${idx + 1}`, warnings)
    )
    .filter((n): n is SceneNode => n !== null);
  const arrange =
    raw.arrange === 'card' ||
    raw.arrange === 'stack' ||
    raw.arrange === 'free'
      ? raw.arrange
      : undefined;
  const gap = finiteNumber(raw.gap);

  const node: GroupSceneNode = {
    id,
    type: 'group',
    name:
      typeof raw.name === 'string' && raw.name.trim() ? raw.name : '组合节点',
    color,
    visible,
    offset,
    meta,
    children,
    arrange,
    gap,
  };
  return node;
}

function normalizeSubtitleCue(raw: unknown, idx: number): SubtitleCue | null {
  if (!isRecord(raw)) return null;
  const text = typeof raw.text === 'string' ? raw.text : '';
  const startMs =
    typeof raw.startMs === 'number' && Number.isFinite(raw.startMs)
      ? Math.max(0, raw.startMs)
      : 0;
  const endMs =
    typeof raw.endMs === 'number' && Number.isFinite(raw.endMs)
      ? Math.max(startMs, raw.endMs)
      : startMs + 2000;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `sub-${idx + 1}`,
    startMs,
    endMs,
    text,
  };
}

function normalizeCustomSteps(raw: unknown): TeachingStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid: TeachingStep[] = [];
  for (const item of raw) {
    if (
      isRecord(item) &&
      typeof item.id === 'string' &&
      Array.isArray(item.nodeIds)
    ) {
      valid.push({
        id: item.id,
        title: typeof item.title === 'string' ? item.title : '步骤',
        nodeIds: item.nodeIds.filter((n): n is string => typeof n === 'string'),
        pauseMs: finiteNumber(item.pauseMs),
      });
    }
  }
  return valid.length > 0 ? valid : undefined;
}

function normalizeScene(
  raw: unknown,
  idx: number,
  projectRatio: '16:9' | '9:16',
  warnings: string[]
): LessonScene {
  if (!isRecord(raw)) {
    throw new Error(`第 ${idx + 1} 幕格式无效`);
  }
  if (!Array.isArray(raw.nodes)) {
    throw new Error(`第 ${idx + 1} 幕缺少有效的节点列表 nodes`);
  }

  const aspectRatio =
    raw.aspectRatio === '9:16' || raw.aspectRatio === '16:9'
      ? raw.aspectRatio
      : projectRatio;

  const nodes = raw.nodes
    .map((n, nIdx) =>
      sanitizeSceneNode(n, `s${idx + 1}-${nIdx + 1}`, warnings)
    )
    .filter((n): n is SceneNode => n !== null);

  const scene: LessonScene = {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : `imported-scene-${idx + 1}`,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title
        : `第 ${idx + 1} 幕`,
    theme: typeof raw.theme === 'string' && raw.theme ? raw.theme : 'chalkboard',
    layoutMode:
      typeof raw.layoutMode === 'string' && raw.layoutMode
        ? raw.layoutMode
        : 'flow-horizontal',
    cameraMode:
      typeof raw.cameraMode === 'string' && raw.cameraMode
        ? raw.cameraMode
        : 'auto-follow',
    aspectRatio,
    handStyle:
      typeof raw.handStyle === 'string' && raw.handStyle
        ? raw.handStyle
        : 'hand-chalk',
    nodes,
    customSteps: normalizeCustomSteps(raw.customSteps),
    transitionOut: isRecord(raw.transitionOut) &&
      typeof raw.transitionOut.type === 'string'
      ? {
          type: raw.transitionOut.type,
          durationMs: finiteNumber(raw.transitionOut.durationMs),
        }
      : undefined,
  };

  if (scene.nodes.length === 0) {
    warnings.push(`第 ${idx + 1} 幕 "${scene.title}" 节点为空`);
  }
  return scene;
}

export function serializeProjectToJson(project: LessonProject): string {
  const envelope: SerializedProjectFile = {
    format: 'penova-project',
    version: PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: cloneProject(project),
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseProjectFromJson(raw: string): {
  project: LessonProject;
  warnings: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('无法解析工程 JSON：文件内容不是合法的 JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('工程 JSON 根节点必须是对象');
  }

  const warnings: string[] = [];
  let candidate: Record<string, unknown>;

  if (
    (parsed.format === 'penova-project' ||
      parsed.format === 'pencil-project') &&
    isRecord(parsed.project)
  ) {
    if (
      typeof parsed.version === 'number' &&
      parsed.version > PROJECT_SCHEMA_VERSION
    ) {
      warnings.push(
        `工程版本 (${parsed.version}) 高于当前支持版本 (${PROJECT_SCHEMA_VERSION})，已尽力兼容导入`
      );
    }
    candidate = parsed.project;
  } else if (Array.isArray(parsed.scenes)) {
    candidate = parsed;
  } else {
    throw new Error('工程文件格式不正确：缺少 scenes 场景数组');
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    throw new Error('工程至少需要包含一幕有效场景');
  }

  const aspectRatio: '16:9' | '9:16' =
    candidate.aspectRatio === '9:16' ? '9:16' : '16:9';

  const scenes = candidate.scenes.map((s, idx) =>
    normalizeScene(s, idx, aspectRatio, warnings)
  );

  const subtitles = Array.isArray(candidate.subtitles)
    ? candidate.subtitles
        .map((c, idx) => normalizeSubtitleCue(c, idx))
        .filter((c): c is SubtitleCue => c !== null)
    : undefined;

  const project: LessonProject = cloneProject({
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `imported-project-${Date.now().toString(36)}`,
    title:
      typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title
        : scenes[0].title,
    aspectRatio,
    scenes,
    subtitles,
    showSubtitles:
      typeof candidate.showSubtitles === 'boolean'
        ? candidate.showSubtitles
        : true,
  });

  return { project, warnings };
}

export function saveProjectDraft(project: LessonProject): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeProjectToJson(project)
    );
  } catch {
    // Ignore storage quota or private browsing restrictions
  }
}

export function loadProjectDraft(): LessonProject | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw =
      window.localStorage.getItem(DRAFT_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseProjectFromJson(raw).project;
  } catch {
    return null;
  }
}

export function clearProjectDraft(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
}
