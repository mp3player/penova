import '../../plugins';
import { LessonScene, Point, ThemeId } from '../../model/scene';
import {
  EvaluatedFrameSnapshot,
  EvaluatedGlyphSnapshot,
  EvaluatedGroupFrameSnapshot,
  EvaluatedSceneSnapshot,
  EvaluatedStrokeSnapshot,
  EvaluatedTextLineSnapshot,
  ThemePalette,
} from '../../plugins/contracts';
import { presentationRegistry } from '../../plugins/registry';
import { hashString, mulberry32 } from '../../sdk/random';
import { easeGlyphProgress, StrokePath } from '../../sdk/strokePath';
import { getActiveSubtitleAt } from '../subtitle/subtitleEngine';
import { defaultMeasureText, wrapText } from '../layout/textMeasure';
import {
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../timeline/projectTimeline';
import { CompiledTimeline, evaluateTimelineAt } from '../timeline/timelineEngine';
import { getActiveCamera, worldToScreen } from './sceneRenderer';
import { resolveSceneFontFamily } from './fonts';
import { resolveColorHex } from './themes';

function extractFontFamilyFromCssFont(
  cssFont: string,
  fallback: string
): string {
  const m = cssFont.match(/^\s*(?:(?:normal|italic|oblique|bold|\d{3})\s+)*[\d.]+(?:px|pt|rem|em)\s+(.+)$/i);
  const raw = m ? m[1].trim() : '';
  return raw || fallback;
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slicePolylinePoints(
  points: Point[],
  cumLengths: number[] | undefined,
  totalLength: number,
  progress: number
): Point[] {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped <= 0 || points.length === 0) return [];
  if (clamped >= 0.999 || points.length === 1 || totalLength <= 1e-4) {
    return points;
  }

  const targetLen = clamped * totalLength;
  const out: Point[] = [points[0]];

  if (cumLengths && cumLengths.length === points.length) {
    for (let i = 1; i < points.length; i++) {
      if (cumLengths[i] <= targetLen) {
        out.push(points[i]);
      } else {
        const prevLen = cumLengths[i - 1];
        const segLen = cumLengths[i] - prevLen;
        const frac = segLen > 1e-4 ? (targetLen - prevLen) / segLen : 0;
        out.push({
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * frac,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * frac,
        });
        break;
      }
    }
    return out;
  }

  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + segLen <= targetLen) {
      out.push(b);
      acc += segLen;
    } else {
      const frac = segLen > 1e-4 ? (targetLen - acc) / segLen : 0;
      out.push({
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
      });
      break;
    }
  }
  return out;
}

function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  const parts = [`M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`);
  }
  return parts.join(' ');
}

function renderStrokeFillSvg(
  stroke: StrokePath,
  colorHex: string,
  progress: number,
  baseFillOpacity: number,
  palette: ThemePalette,
  allowShadow: boolean
): string {
  if (!stroke.fillOpacity || stroke.fillOpacity <= 0 || stroke.points.length < 3) {
    return '';
  }
  const fillReveal = Math.max(0, Math.min(1, (progress - 0.55) / 0.45));
  const isSurfaceCard = allowShadow && Boolean(stroke.surfaceShadow);
  const effectiveBaseOpacity = isSurfaceCard
    ? baseFillOpacity
    : allowShadow
    ? 0.22
    : baseFillOpacity;
  const alpha = effectiveBaseOpacity * stroke.fillOpacity * fillReveal;
  if (alpha <= 0.005) return '';

  const d = `${pointsToSvgPath(stroke.points)} Z`;
  let shadowSvg = '';
  if (isSurfaceCard && palette.cardShadow) {
    const sh = palette.cardShadow;
    shadowSvg = `<path d="${d}" transform="translate(${sh.dx.toFixed(1)},${sh.dy.toFixed(
      1
    )})" fill="${escapeXml(sh.color)}" fill-opacity="${fillReveal.toFixed(
      3
    )}" stroke="none"/>`;
  }

  const fillColor =
    isSurfaceCard && palette.cardFillColors?.[stroke.color]
      ? palette.cardFillColors[stroke.color]!
      : colorHex;

  return (
    shadowSvg +
    `<path d="${d}" fill="${escapeXml(fillColor)}" fill-opacity="${alpha.toFixed(
      3
    )}" stroke="none"/>`
  );
}

function renderStrokeSvg(
  stroke: StrokePath,
  colorHex: string,
  progress: number,
  theme: ThemeId
): string {
  const pts = slicePolylinePoints(
    stroke.points,
    stroke.cumLengths,
    stroke.totalLength,
    progress
  );
  if (pts.length < 2) return '';
  const d = pointsToSvgPath(pts);
  const escColor = escapeXml(colorHex);
  const dashAttr = stroke.dashed ? ' stroke-dasharray="12 9"' : '';

  if (theme === 'chalkboard') {
    const haloW = (stroke.width * 1.48).toFixed(2);
    const haloOp = (stroke.opacity * 0.22).toFixed(3);
    const coreW = stroke.width.toFixed(2);
    const coreOp = (stroke.opacity * 0.86).toFixed(3);
    const ridgeW = Math.max(0.9, stroke.width * 0.44).toFixed(2);
    const ridgeOp = (stroke.opacity * 0.42).toFixed(3);
    const ridgeDash = stroke.dashed ? ' stroke-dasharray="12 9"' : ' stroke-dasharray="4 1.6 7 1.3"';
    return (
      `<path d="${d}" fill="none" stroke="${escColor}" stroke-width="${haloW}" stroke-opacity="${haloOp}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>` +
      `<path d="${d}" fill="none" stroke="${escColor}" stroke-width="${coreW}" stroke-opacity="${coreOp}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>` +
      `<path d="${d}" transform="translate(-0.35,-0.35)" fill="none" stroke="${escColor}" stroke-width="${ridgeW}" stroke-opacity="${ridgeOp}" stroke-linecap="round" stroke-linejoin="round"${ridgeDash}/>`
    );
  }

  if (theme === 'blueprint') {
    const glowW = (stroke.width * 2.15).toFixed(2);
    const glowOp = (stroke.opacity * 0.22).toFixed(3);
    return (
      `<path d="${d}" fill="none" stroke="${escColor}" stroke-width="${glowW}" stroke-opacity="${glowOp}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>` +
      `<path d="${d}" fill="none" stroke="${escColor}" stroke-width="${stroke.width.toFixed(2)}" stroke-opacity="${stroke.opacity.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`
    );
  }

  return `<path d="${d}" fill="none" stroke="${escColor}" stroke-width="${stroke.width.toFixed(
    2
  )}" stroke-opacity="${stroke.opacity.toFixed(
    3
  )}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`;
}

export function evaluateSceneFrameSnapshot(
  scene: LessonScene,
  timeline: CompiledTimeline,
  tMs: number,
  width: number,
  height: number,
  globalTMs = tMs,
  subtitleText?: string
): EvaluatedSceneSnapshot {
  const presentation = presentationRegistry.getOrDefault(scene.theme);
  const boardFontFamily = resolveSceneFontFamily(scene, presentation.fontFamily);
  const evalState = evaluateTimelineAt(timeline, tMs);
  const cam = getActiveCamera(
    scene,
    timeline,
    tMs,
    width,
    height,
    null,
    evalState.pen
  );

  const groupFrames: EvaluatedGroupFrameSnapshot[] = [];
  const strokes: EvaluatedStrokeSnapshot[] = [];
  const textLines: EvaluatedTextLineSnapshot[] = [];

  for (const item of timeline.allItems) {
    const p = evalState.itemProgress.get(item.id) ?? 0;
    if (p <= 0) continue;
    const rawOpacity = evalState.itemOpacity?.get(item.id);
    const opacityProp =
      rawOpacity !== undefined && rawOpacity < 0.999 ? { opacity: rawOpacity } : {};

    if (item.kind === 'group-frame') {
      groupFrames.push({
        id: item.id,
        color: item.color,
        colorHex: resolveColorHex(scene.theme, item.color),
        progress: p,
        ...opacityProp,
        stroke: item.stroke,
      });
    } else if (item.kind === 'stroke') {
      strokes.push({
        id: item.id,
        color: item.color,
        colorHex: resolveColorHex(scene.theme, item.color),
        progress: p,
        ...opacityProp,
        stroke: item.stroke,
      });
    } else if (item.kind === 'text-line') {
      const spans: EvaluatedGlyphSnapshot[] = [];
      const glyphDecel = timeline.pacing?.endDecel ?? 0;
      for (const span of item.spans) {
        let charP = 0;
        if (evalState.tMs >= span.endMs) {
          charP = 1;
        } else if (evalState.tMs > span.startMs) {
          const rawCharP =
            (evalState.tMs - span.startMs) /
            Math.max(1, span.endMs - span.startMs);
          charP = easeGlyphProgress(rawCharP, glyphDecel);
        }
        if (charP <= 0) continue;
        spans.push({
          char: span.char,
          boxX: span.boxX,
          boxY: span.boxY,
          width: span.glyph.width,
          height: span.glyph.height,
          padX: span.glyph.padX,
          fontSize: span.glyph.fontSize,
          progress: charP,
          segments: span.glyph.segments,
          totalLength: span.glyph.totalLength,
        });
      }

      textLines.push({
        id: item.id,
        color: item.color,
        colorHex: resolveColorHex(scene.theme, item.color),
        font: item.font,
        fontSize: item.fontSize,
        isEdgeLabel: item.isEdgeLabel,
        isGroupTitle: item.isGroupTitle,
        centerX: item.centerX,
        centerY: item.centerY,
        bgWidth: item.bgWidth,
        bgHeight: item.bgHeight,
        progress: p,
        ...opacityProp,
        spans,
      });
    }
  }

  const tipScreen = worldToScreen(
    evalState.pen.worldX,
    evalState.pen.worldY,
    width,
    height,
    cam
  );

  return {
    kind: 'scene',
    sceneId: scene.id,
    title: scene.title,
    theme: scene.theme,
    handStyle: scene.handStyle,
    fontFamily: boardFontFamily,
    palette: presentation.palette,
    width,
    height,
    localTMs: evalState.tMs,
    globalTMs,
    camera: cam,
    groupFrames,
    strokes,
    textLines,
    pen: {
      visible: evalState.pen.visible,
      worldX: evalState.pen.worldX,
      worldY: evalState.pen.worldY,
      screenX: tipScreen.x,
      screenY: tipScreen.y,
      penDown: evalState.pen.penDown,
      lift: evalState.pen.lift,
      color: evalState.pen.color,
      colorHex: resolveColorHex(scene.theme, evalState.pen.color),
      velocity: evalState.pen.velocity,
      alpha: evalState.pen.alpha,
      seed: evalState.pen.seed,
    },
    subtitleText,
  };
}

export function evaluateProjectFrameSnapshot(
  compiledProject: CompiledProjectTimeline,
  globalTMs: number,
  width: number,
  height: number
): EvaluatedFrameSnapshot {
  const activeCue =
    compiledProject.project.showSubtitles !== false
      ? getActiveSubtitleAt(compiledProject.project.subtitles, globalTMs)
      : undefined;
  const subtitleText = activeCue?.text;

  if (compiledProject.segments.length === 0) {
    const fallbackTheme = presentationRegistry.getOrDefault('chalkboard');
    return {
      kind: 'scene',
      sceneId: 'empty',
      title: compiledProject.project.title,
      theme: fallbackTheme.id,
      handStyle: 'hidden',
      fontFamily: fallbackTheme.fontFamily,
      palette: fallbackTheme.palette,
      width,
      height,
      localTMs: 0,
      globalTMs,
      camera: { cx: 0, cy: 0, zoom: 1 },
      groupFrames: [],
      strokes: [],
      textLines: [],
      pen: {
        visible: false,
        worldX: 0,
        worldY: 0,
        screenX: width / 2,
        screenY: height / 2,
        penDown: false,
        lift: 0,
        color: 'white',
        colorHex: fallbackTheme.palette.colors.white,
        velocity: 0,
        alpha: 0,
      },
      subtitleText,
    };
  }

  const evalState = evaluateProjectAt(compiledProject, globalTMs);
  if (evalState.kind === 'scene') {
    return evaluateSceneFrameSnapshot(
      evalState.segment.scene,
      evalState.segment.timeline,
      evalState.localTMs,
      width,
      height,
      globalTMs,
      subtitleText
    );
  }

  const fromScene = evaluateSceneFrameSnapshot(
    evalState.fromSegment.scene,
    evalState.fromSegment.timeline,
    evalState.fromSegment.timeline.totalDurationMs,
    width,
    height,
    globalTMs
  );
  const toScene = evaluateSceneFrameSnapshot(
    evalState.toSegment.scene,
    evalState.toSegment.timeline,
    0,
    width,
    height,
    globalTMs
  );

  return {
    kind: 'transition',
    transitionId: evalState.transitionId,
    transitionName: evalState.transitionName,
    progress: evalState.progress,
    width,
    height,
    globalTMs,
    fromScene,
    toScene,
    subtitleText,
  };
}

function renderSurfaceBackgroundSvg(
  snap: EvaluatedSceneSnapshot,
  gradId: string
): string {
  const { width, height, palette, theme } = snap;
  const parts: string[] = [];
  const defs: string[] = [
    `<radialGradient id="${gradId}" cx="48%" cy="44%" r="78%"><stop offset="0%" stop-color="${escapeXml(
      palette.bgPrimary
    )}"/><stop offset="100%" stop-color="${escapeXml(
      palette.bgSecondary
    )}"/></radialGradient>`,
    `<radialGradient id="${gradId}-vig" cx="50%" cy="50%" r="74%"><stop offset="52%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="${escapeXml(
      palette.vignetteColor
    )}"/></radialGradient>`,
  ];

  if (theme === 'blueprint') {
    defs.push(
      `<pattern id="${gradId}-grid-minor" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(116, 212, 247, 0.07)" stroke-width="1"/></pattern>`,
      `<pattern id="${gradId}-grid-major" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(116, 212, 247, 0.16)" stroke-width="1"/></pattern>`
    );
  } else if (theme === 'whiteboard') {
    defs.push(
      `<pattern id="${gradId}-dot" width="24" height="24" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="1.4" height="1.4" fill="rgba(120, 113, 108, 0.18)"/></pattern>`
    );
  } else if (theme === 'chalkboard') {
    defs.push(
      `<radialGradient id="${gradId}-smudge" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(235, 242, 232, 0.036)"/><stop offset="100%" stop-color="rgba(235, 242, 232, 0)"/></radialGradient>`,
      `<linearGradient id="${gradId}-ledge" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#5c4028"/><stop offset="50%" stop-color="#3e2a19"/><stop offset="100%" stop-color="#24170d"/></linearGradient>`
    );
  }

  parts.push(`<defs>${defs.join('')}</defs>`);
  parts.push(`<rect width="${width}" height="${height}" fill="url(#${gradId})"/>`);

  if (theme === 'chalkboard') {
    const rand = mulberry32(9973 * 99 + width * 31 + height);
    for (let i = 0; i < 16; i++) {
      const cx = rand() * width;
      const cy = rand() * height;
      const rx = 80 + rand() * 210;
      const ry = 40 + rand() * 110;
      const deg = ((rand() - 0.5) * 0.6 * 180) / Math.PI;
      parts.push(
        `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${deg.toFixed(
          2
        )}) scale(1,${(ry / rx).toFixed(3)})"><circle cx="0" cy="0" r="${rx.toFixed(
          1
        )}" fill="url(#${gradId}-smudge)"/></g>`
      );
    }
    parts.push(`<rect width="${width}" height="${height}" fill="url(#${gradId}-vig)"/>`);
    const ledgeH = Math.max(8, Math.round(height * 0.012));
    const ledgeY = height - ledgeH;
    parts.push(
      `<rect x="0" y="${ledgeY}" width="${width}" height="${ledgeH}" fill="url(#${gradId}-ledge)"/>`,
      `<rect x="0" y="${ledgeY}" width="${width}" height="1" fill="rgba(255, 238, 210, 0.16)"/>`,
      `<path d="M0.5,${ledgeY} L0.5,0.5 L${(width - 0.5).toFixed(
        1
      )},0.5 L${(width - 0.5).toFixed(
        1
      )},${ledgeY}" fill="none" stroke="rgba(244, 241, 234, 0.05)" stroke-width="1"/>`
    );
  } else if (theme === 'whiteboard') {
    parts.push(
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-dot)"/>`,
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-vig)"/>`
    );
  } else if (theme === 'blueprint') {
    const margin = Math.max(12, Math.round(Math.min(width, height) * 0.018));
    const tickArm = 8;
    const tickOffset = margin + 14;
    const corners = [
      [tickOffset, tickOffset],
      [width - tickOffset, tickOffset],
      [tickOffset, height - tickOffset],
      [width - tickOffset, height - tickOffset],
    ];
    const crossPath = corners
      .map(
        ([cx, cy]) =>
          `M${(cx - tickArm).toFixed(1)},${(cy + 0.5).toFixed(1)} L${(
            cx + tickArm
          ).toFixed(1)},${(cy + 0.5).toFixed(1)} M${(cx + 0.5).toFixed(
            1
          )},${(cy - tickArm).toFixed(1)} L${(cx + 0.5).toFixed(1)},${(
            cy + tickArm
          ).toFixed(1)}`
      )
      .join(' ');
    parts.push(
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-grid-minor)"/>`,
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-grid-major)"/>`,
      `<rect x="${(margin + 0.5).toFixed(1)}" y="${(margin + 0.5).toFixed(
        1
      )}" width="${width - margin * 2 - 1}" height="${
        height - margin * 2 - 1
      }" fill="none" stroke="rgba(186, 230, 253, 0.24)" stroke-width="1"/>`,
      `<rect x="${(margin + 4.5).toFixed(1)}" y="${(margin + 4.5).toFixed(
        1
      )}" width="${width - (margin + 4) * 2 - 1}" height="${
        height - (margin + 4) * 2 - 1
      }" fill="none" stroke="rgba(116, 212, 247, 0.12)" stroke-width="1"/>`,
      `<path d="${crossPath}" fill="none" stroke="rgba(186, 230, 253, 0.28)" stroke-width="1"/>`,
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-vig)"/>`
    );
  } else if (theme === 'letter-paper') {
    const linePitch = Math.max(26, Math.round(Math.min(width, height) * 0.068));
    const firstRuleY = Math.round(height * 0.115);
    const strokeW = Math.max(1, height / 650).toFixed(2);
    const rulePaths: string[] = [];
    for (let y = firstRuleY; y < height - linePitch * 0.7; y += linePitch) {
      const cy = (Math.round(y) + 0.5).toFixed(1);
      rulePaths.push(`M0,${cy} L${width},${cy}`);
    }
    if (rulePaths.length > 0) {
      parts.push(
        `<path d="${rulePaths.join(' ')}" fill="none" stroke="rgba(150, 126, 94, 0.18)" stroke-width="${strokeW}"/>`
      );
    }
    const headerY = (Math.round(firstRuleY - 4) + 0.5).toFixed(1);
    const marginX = Math.max(34, Math.round(width * 0.082));
    parts.push(
      `<path d="M0,${headerY} L${width},${headerY}" fill="none" stroke="rgba(150, 126, 94, 0.15)" stroke-width="${strokeW}"/>`,
      `<path d="M${(marginX + 0.5).toFixed(1)},0 L${(marginX + 0.5).toFixed(
        1
      )},${height} M${(marginX + 4.5).toFixed(1)},0 L${(marginX + 4.5).toFixed(
        1
      )},${height}" fill="none" stroke="rgba(194, 96, 84, 0.24)" stroke-width="${strokeW}"/>`,
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-vig)"/>`
    );
  } else {
    parts.push(`<rect width="${width}" height="${height}" fill="url(#${gradId}-vig)"/>`);
  }

  return parts.join('');
}

function isCoalescibleAsciiSpan(span: EvaluatedGlyphSnapshot): boolean {
  if (span.progress < 0.999) return false;
  const code = span.char.codePointAt(0) ?? 0;
  return code >= 0x21 && code <= 0x7e;
}

function renderInstrumentSvg(theme: ThemeId, colorHex: string): string {
  const c = escapeXml(colorHex);
  if (theme === 'chalkboard') {
    return (
      `<path d="M0,-1.6 L14,-4.5 L74,-5 A5,5 0 0,1 74,5 L14,4.5 L0,1.6 Z" fill="${c}"/>` +
      `<rect x="16" y="1" width="56" height="3.2" fill="rgba(0,0,0,0.12)"/>` +
      `<rect x="28" y="-5.1" width="24" height="10.2" fill="rgba(255,255,255,0.88)" stroke="rgba(0,0,0,0.16)" stroke-width="0.8"/>`
    );
  }
  if (theme === 'whiteboard') {
    return (
      `<path d="M0,-1.5 L9,-3.5 L14,-3.5 L14,3.5 L9,3.5 L0,1.5 Z" fill="${c}"/>` +
      `<rect x="14" y="-5.4" width="10" height="10.8" fill="${c}"/>` +
      `<rect x="24" y="-6.2" width="64" height="12.4" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>` +
      `<rect x="78" y="-6.2" width="10" height="12.4" fill="${c}"/>`
    );
  }
  if (theme === 'blueprint') {
    return (
      `<path d="M0,0 L18,-5 L18,5 Z" fill="#e5c49f"/>` +
      `<path d="M0,0 L6,-1.7 L6,1.7 Z" fill="${c}"/>` +
      `<rect x="18" y="-5" width="68" height="10" fill="#f59e0b"/>` +
      `<rect x="18" y="-5" width="68" height="3" fill="rgba(255,255,255,0.22)"/>` +
      `<rect x="18" y="2" width="68" height="3" fill="rgba(0,0,0,0.18)"/>`
    );
  }
  if (theme === 'letter-paper') {
    return (
      `<path d="M0,0 L7,-3.2 L17,-4.6 L19,0 L17,4.6 L7,3.2 Z" fill="#d7ad53" stroke="#8b651e" stroke-width="0.8"/>` +
      `<line x1="0.8" y1="0" x2="11" y2="0" stroke="#2d2112" stroke-width="0.85"/>` +
      `<circle cx="11.5" cy="0" r="1.3" fill="${c}"/>` +
      `<rect x="17" y="-4.7" width="9" height="9.4" fill="#252b3b"/>` +
      `<rect x="26" y="-5.4" width="3.2" height="10.8" fill="#d7ad53"/>` +
      `<rect x="29" y="-5.8" width="62" height="11.6" rx="3.5" fill="#1d283f"/>` +
      `<rect x="42" y="-5.8" width="4.5" height="11.6" fill="${c}"/>` +
      `<rect x="32" y="-4.1" width="54" height="2.1" fill="rgba(255,255,255,0.18)"/>` +
      `<rect x="86" y="-5.2" width="5" height="10.4" fill="#d7ad53"/>`
    );
  }
  // Default marker fallback for whiteboard and custom PresentationPlugins
  return (
    `<path d="M0,-1.5 L9,-3.5 L14,-3.5 L14,3.5 L9,3.5 L0,1.5 Z" fill="${c}"/>` +
    `<rect x="14" y="-5.4" width="10" height="10.8" fill="${c}"/>` +
    `<rect x="24" y="-6.2" width="64" height="12.4" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>` +
    `<rect x="78" y="-6.2" width="10" height="12.4" fill="${c}"/>`
  );
}

function renderFallingDustSvg(
  tipX: number,
  tipY: number,
  colorHex: string,
  tMs: number,
  seed: number
): string {
  const escColor = escapeXml(colorHex);
  const phase = (tMs % 320) / 320;
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const h = ((seed + i * 7919) * 2654435761) >>> 0;
    const life = (phase + (h & 255) / 255) % 1;
    const vx = (((h >> 8) & 255) / 255 - 0.5) * 18;
    const vy = 8 + (((h >> 16) & 255) / 255) * 24;
    const px = tipX + vx * life;
    const py = tipY + vy * life + life * life * 12;
    const r = 0.8 + (1 - life) * 1.1;
    const op = (1 - life) * 0.42;
    parts.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(
        2
      )}" fill="${escColor}" opacity="${op.toFixed(3)}"/>`
    );
  }
  return parts.join('');
}

function renderHandAndInstrumentSvg(
  snap: EvaluatedSceneSnapshot,
  uid: string
): string {
  if (
    !snap.pen.visible ||
    snap.handStyle === 'hidden' ||
    snap.pen.alpha <= 0.02
  ) {
    return '';
  }

  const parts: string[] = [];

  const lift = snap.pen.lift;
  const px = snap.pen.screenX.toFixed(2);
  const py = (snap.pen.screenY - lift * 0.85).toFixed(2);
  const scale = (snap.pen.penDown ? 1 : 1 + lift * 0.008).toFixed(3);
  const microSway = snap.pen.penDown
    ? Math.sin(snap.localTMs * 0.012) * 0.025 +
      Math.min(0.06, snap.pen.velocity * 0.00018)
    : -0.04;
  const deg = (((Math.PI * 0.22 + microSway) * 180) / Math.PI).toFixed(2);
  const instrument = renderInstrumentSvg(snap.theme, snap.pen.colorHex);

  if (snap.handStyle === 'tip-only') {
    parts.push(
      `<g transform="translate(${px},${py}) scale(${scale}) rotate(${deg})" opacity="${snap.pen.alpha.toFixed(
        3
      )}">${instrument}</g>`
    );
    return parts.join('');
  }

  if (snap.handStyle === 'hand-minimal') {
    const shX = (34 + lift * 0.5).toFixed(1);
    const shY = (2 + lift * 0.9).toFixed(1);
    parts.push(
      `<g transform="translate(${px},${py}) scale(${scale}) rotate(${deg})" opacity="${snap.pen.alpha.toFixed(
        3
      )}">` +
        `<g transform="translate(${shX},${shY}) rotate(-11.5)"><ellipse cx="0" cy="0" rx="40" ry="14" fill="rgba(0,0,0,0.12)"/></g>` +
        instrument +
        `<g fill="rgba(248,250,252,0.22)" stroke="rgba(248,250,252,0.68)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">` +
        `<path d="M10,3 C24,-9 56,-13 84,3 L92,34 C64,42 30,36 12,18 Z"/>` +
        `<path d="M4,-1 C14,-10 34,-12 46,-7 C50,-5 48,1 42,2 C30,4 16,5 6,3 Z"/>` +
        `<path d="M12,2 C20,8 34,11 46,9 C51,8 52,1 46,-1 C35,-2 22,-3 12,-1 Z"/>` +
        `</g></g>`
    );
    return parts.join('');
  }

  // Illustrated warm hand (hand-chalk) matching illustratedHandPlugin.ts
  const cuffGradId = `${uid}-cuff`;
  const shX = (38 + lift * 0.6).toFixed(1);
  const shY = (2 + lift * 1.1).toFixed(1);
  parts.push(
    `<defs><linearGradient id="${cuffGradId}" x1="70" y1="0" x2="108" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs>` +
      `<g transform="translate(${px},${py}) scale(${scale}) rotate(${deg})" opacity="${snap.pen.alpha.toFixed(
        3
      )}">` +
      `<g transform="translate(${shX},${shY}) rotate(-11.5)"><ellipse cx="0" cy="0" rx="46" ry="18" fill="rgba(0,0,0,0.18)"/></g>` +
      `<rect x="26" y="4" width="24" height="16" rx="8" fill="#d9a482" stroke="#996444" stroke-width="1.1"/>` +
      `<rect x="38" y="11" width="22" height="14" rx="7" fill="#d9a482" stroke="#996444" stroke-width="1.1"/>` +
      `<path d="M12,3 C24,-10 56,-14 82,2 L92,38 C64,46 32,38 14,18 Z" fill="#f0c4a6" stroke="#9d6b4d" stroke-width="1.2"/>` +
      instrument +
      `<path d="M6,-2 C15,-12 36,-14 48,-8 C52,-6 50,1 44,2 C30,4 16,4 6,2 Z" fill="#f3ccb1" stroke="#9d6b4d" stroke-width="1.2"/>` +
      `<ellipse cx="14" cy="-7.2" rx="4.2" ry="2.2" fill="#fce4d6" opacity="0.65"/>` +
      `<path d="M14,2 C22,8 36,11 48,8 C53,7 54,0 47,-2 C36,-4 22,-4 14,-1 Z" fill="#eab897" stroke="#9d6b4d" stroke-width="1.1"/>` +
      `<path d="M74,-4 L112,26 L94,52 L68,28 Z" fill="url(#${cuffGradId})"/>` +
      `<path d="M68,-2 L82,36 L88,34 L74,-4 Z" fill="rgba(248,250,252,0.85)"/>` +
      `</g>`
  );
  return parts.join('');
}

function renderSceneLayerSvg(
  snap: EvaluatedSceneSnapshot,
  gradId: string
): string {
  const { width, height, palette, camera, theme } = snap;
  const parts: string[] = [];

  parts.push(renderSurfaceBackgroundSvg(snap, gradId));

  parts.push(
    `<g transform="translate(${(width / 2).toFixed(2)},${(height / 2).toFixed(
      2
    )}) scale(${camera.zoom.toFixed(4)}) translate(${(-camera.cx).toFixed(
      2
    )},${(-camera.cy).toFixed(2)})">`
  );

  const zoneFillOpacity = palette.zoneFillOpacity ?? 0.05;
  for (const gf of snap.groupFrames) {
    const fillSvg = renderStrokeFillSvg(
      gf.stroke,
      gf.colorHex,
      gf.progress,
      zoneFillOpacity,
      palette,
      false
    );
    const svg = renderStrokeSvg(gf.stroke, gf.colorHex, gf.progress, theme);
    const combined = `${fillSvg}${svg}`;
    if (!combined) continue;
    const op = gf.opacity ?? 1;
    parts.push(
      op < 0.999 ? `<g opacity="${op.toFixed(3)}">${combined}</g>` : combined
    );
  }

  const cardFillOpacity = palette.cardFillOpacity ?? 0.085;
  for (const st of snap.strokes) {
    const fillSvg = renderStrokeFillSvg(
      st.stroke,
      st.colorHex,
      st.progress,
      cardFillOpacity,
      palette,
      true
    );
    const svg = renderStrokeSvg(st.stroke, st.colorHex, st.progress, theme);
    const combined = `${fillSvg}${svg}`;
    if (!combined) continue;
    const op = st.opacity ?? 1;
    parts.push(
      op < 0.999 ? `<g opacity="${op.toFixed(3)}">${combined}</g>` : combined
    );
  }

  const maskDefs: string[] = [];
  const textEls: string[] = [];
  let maskSeq = 0;

  for (const line of snap.textLines) {
    const lineOp = line.opacity ?? 1;
    if (lineOp < 0.999) {
      textEls.push(`<g opacity="${lineOp.toFixed(3)}">`);
    }
    if (line.isEdgeLabel || line.isGroupTitle) {
      const pillAlpha = Math.min(1, line.progress * 3.5).toFixed(3);
      const rx = (line.centerX - line.bgWidth / 2).toFixed(2);
      const ry = (line.centerY - line.bgHeight / 2).toFixed(2);
      textEls.push(
        `<rect x="${rx}" y="${ry}" width="${line.bgWidth.toFixed(
          2
        )}" height="${line.bgHeight.toFixed(
          2
        )}" rx="7" ry="7" fill="${escapeXml(
          palette.labelPillBg
        )}" stroke="${escapeXml(
          palette.labelPillBorder
        )}" stroke-width="1" opacity="${pillAlpha}"/>`
      );
    }

    const boldWeight =
      line.font.trim().startsWith('700') || line.font.includes('bold')
        ? '700'
        : '400';
    const escColor = escapeXml(line.colorHex);
    const escFont = escapeXml(
      extractFontFamilyFromCssFont(line.font, snap.fontFamily)
    );
    const isMonoLine = /(?:mono|consolas|courier|menlo|jetbrains)/i.test(line.font);

    let i = 0;
    while (i < line.spans.length) {
      const span = line.spans[i];

      if (isCoalescibleAsciiSpan(span)) {
        let j = i;
        while (j + 1 < line.spans.length) {
          const prev = line.spans[j];
          const next = line.spans[j + 1];
          if (!isCoalescibleAsciiSpan(next)) break;
          if (Math.abs(next.boxY - prev.boxY) > 1.5) break;
          const prevRight = prev.boxX + prev.width - prev.padX;
          const nextLeft = next.boxX + next.padX;
          const gap = nextLeft - prevRight;
          if (gap < -2 || gap > prev.fontSize * 0.16) break;
          j++;
        }

        if (j > i) {
          const first = line.spans[i];
          const last = line.spans[j];
          const runText = line.spans
            .slice(i, j + 1)
            .map((s) => s.char)
            .join('');
          const runLeft = first.boxX + first.padX;
          const runRight = last.boxX + last.width - last.padX;
          const midX = ((runLeft + runRight) / 2).toFixed(2);
          const ty = (first.boxY + first.height * 0.52).toFixed(2);
          if (isMonoLine) {
            textEls.push(
              `<text x="${runLeft.toFixed(
                2
              )}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${first.fontSize.toFixed(
                1
              )}" font-weight="${boldWeight}" text-anchor="start" dominant-baseline="central">${escapeXml(
                runText
              )}</text>`
            );
          } else {
            textEls.push(
              `<text x="${midX}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${first.fontSize.toFixed(
                1
              )}" font-weight="${boldWeight}" text-anchor="middle" dominant-baseline="central">${escapeXml(
                runText
              )}</text>`
            );
          }
          i = j + 1;
          continue;
        }
      }

      const tx = (span.boxX + span.padX).toFixed(2);
      const ty = (span.boxY + span.height * 0.52).toFixed(2);
      if (span.progress >= 0.999) {
        textEls.push(
          `<text x="${tx}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${span.fontSize.toFixed(
            1
          )}" font-weight="${boldWeight}" dominant-baseline="central">${escapeXml(
            span.char
          )}</text>`
        );
      } else if (span.segments.length === 0 || span.totalLength <= 0) {
        textEls.push(
          `<text x="${tx}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${span.fontSize.toFixed(
            1
          )}" font-weight="${boldWeight}" opacity="${span.progress.toFixed(
            3
          )}" dominant-baseline="central">${escapeXml(span.char)}</text>`
        );
      } else {
        let remaining = span.progress * span.totalLength;
        const maskStrokeW = Math.max(4.5, span.fontSize * 0.34).toFixed(2);
        const revealPaths: string[] = [];
        for (const seg of span.segments) {
          if (remaining <= 0) break;
          const pts = slicePolylinePoints(
            seg.points,
            undefined,
            seg.length,
            Math.min(1, remaining / Math.max(1e-4, seg.length))
          );
          if (pts.length >= 2) {
            const shifted = pts.map((pt) => ({
              x: pt.x + span.boxX,
              y: pt.y + span.boxY,
            }));
            revealPaths.push(pointsToSvgPath(shifted));
          }
          remaining -= seg.length;
        }
        if (revealPaths.length > 0) {
          const mId = `${gradId}-tm-${maskSeq++}`;
          const mPad = span.fontSize * 0.35;
          const mx = (span.boxX - mPad).toFixed(1);
          const my = (span.boxY - mPad).toFixed(1);
          const mw = (span.width + mPad * 2).toFixed(1);
          const mh = (span.height + mPad * 2).toFixed(1);
          maskDefs.push(
            `<mask id="${mId}" maskUnits="userSpaceOnUse" x="${mx}" y="${my}" width="${mw}" height="${mh}">` +
              `<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="black"/>` +
              `<path d="${revealPaths.join(' ')}" fill="none" stroke="white" stroke-width="${maskStrokeW}" stroke-linecap="round" stroke-linejoin="round"/>` +
              `</mask>`
          );
          textEls.push(
            `<g mask="url(#${mId})"><text x="${tx}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${span.fontSize.toFixed(
              1
            )}" font-weight="${boldWeight}" dominant-baseline="central">${escapeXml(
              span.char
            )}</text></g>`
          );
        }
      }
      i++;
    }
    if (lineOp < 0.999) {
      textEls.push('</g>');
    }
  }

  if (maskDefs.length > 0) {
    parts.push(`<defs>${maskDefs.join('')}</defs>`);
  }
  parts.push(...textEls);

  if (
    snap.theme === 'chalkboard' &&
    snap.handStyle !== 'hidden' &&
    snap.pen.visible &&
    snap.pen.penDown
  ) {
    parts.push(
      renderFallingDustSvg(
        snap.pen.worldX,
        snap.pen.worldY,
        snap.pen.colorHex,
        snap.localTMs,
        snap.pen.seed ?? hashString(snap.sceneId)
      )
    );
  }

  parts.push('</g>');

  parts.push(renderHandAndInstrumentSvg(snap, gradId));

  return parts.join('');
}

function renderSubtitleSvg(
  width: number,
  height: number,
  text?: string,
  palette?: ThemePalette
): string {
  const trimmed = text?.trim();
  if (!trimmed) return '';
  const fontSize = Math.max(13, Math.round(height * 0.032));
  const maxTextW = Math.max(180, width * 0.78);
  const subtitleFont = `600 ${fontSize}px sans-serif`;
  const measureSub = (s: string) => defaultMeasureText(s, subtitleFont);

  let lines = wrapText(trimmed, maxTextW, measureSub);
  if (lines.length === 0) return '';
  if (lines.length > 2) {
    const second = lines[1];
    lines = [
      lines[0],
      second.length > 2 ? `${second.slice(0, second.length - 1)}…` : second,
    ];
  }

  const lineHeight = fontSize * 1.32;
  const padX = Math.max(14, Math.round(fontSize * 0.85));
  const padY = Math.round(fontSize * 0.45);
  const boxH = Math.round(lines.length * lineHeight + padY * 2);
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, measureSub(line));
  }
  const boxW = Math.min(width - 24, Math.max(160, Math.ceil(widest + padX * 2)));
  const x = (width - boxW) / 2;
  const y = Math.min(height - boxH - 14, height * 0.89 - boxH / 2);

  const fillBg = escapeXml(palette?.subtitleBg ?? 'rgba(11, 15, 22, 0.80)');
  const strokeBorder = escapeXml(
    palette?.subtitleBorder ?? 'rgba(255, 255, 255, 0.2)'
  );
  const textFill = escapeXml(palette?.subtitleTextColor ?? '#f8fafc');

  const textEls = lines
    .map((line, i) => {
      const cy = y + padY + lineHeight * (i + 0.5);
      return `<text x="${(width / 2).toFixed(1)}" y="${cy.toFixed(
        1
      )}" fill="${textFill}" font-family="sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(
        line
      )}</text>`;
    })
    .join('');

  return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(
    1
  )}" width="${boxW}" height="${boxH}" rx="10" ry="10" fill="${fillBg}" stroke="${strokeBorder}" stroke-width="1"/>${textEls}</g>`;
}

function buildEraserSweepWaypoints(width: number, height: number): Point[] {
  const padX = Math.max(70, width * 0.11);
  return [
    { x: -padX, y: height * 0.13 },
    { x: width + padX, y: height * 0.21 },
    { x: -padX, y: height * 0.46 },
    { x: width + padX, y: height * 0.56 },
    { x: -padX, y: height * 0.81 },
    { x: width + padX, y: height * 0.91 },
  ];
}

function sampleEraserSweepPrefix(
  waypoints: Point[],
  fraction: number
): { points: Point[]; tip: Point; angleRad: number } {
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const len = Math.hypot(
      waypoints[i].x - waypoints[i - 1].x,
      waypoints[i].y - waypoints[i - 1].y
    );
    segLengths.push(len);
    total += len;
  }

  const targetLen = Math.max(0, Math.min(1, fraction)) * total;
  const points: Point[] = [waypoints[0]];
  let acc = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (acc + segLen >= targetLen || i === segLengths.length - 1) {
      const clamped =
        segLen > 1e-4
          ? Math.max(0, Math.min(1, (targetLen - acc) / segLen))
          : 1;
      const tip = {
        x: a.x + (b.x - a.x) * clamped,
        y: a.y + (b.y - a.y) * clamped,
      };
      points.push(tip);
      return { points, tip, angleRad: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    points.push(b);
    acc += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { points, tip: last, angleRad: 0 };
}

function renderChalkboardEraserSvg(
  tip: Point,
  angleRad: number,
  height: number,
  p: number,
  uid: string
): string {
  const alpha = p <= 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
  if (alpha <= 0.01) return '';
  const scale = Math.max(0.85, Math.min(1.45, height / 560));
  const tiltDeg = (((Math.sin(angleRad) * 0.16 - 0.14) * 180) / Math.PI).toFixed(2);

  const puffs: string[] = [];
  for (let i = 0; i < 4; i++) {
    const offset = (i + 1) * 18 * scale;
    const puffX = tip.x - Math.cos(angleRad) * offset;
    const puffY = tip.y - Math.sin(angleRad) * offset + i * 5 * scale;
    const puffR = (22 + i * 7) * scale;
    puffs.push(
      `<circle cx="${puffX.toFixed(1)}" cy="${puffY.toFixed(1)}" r="${puffR.toFixed(
        1
      )}" fill="#e8ece6" opacity="${(alpha * 0.24).toFixed(3)}"/>`
    );
  }

  const woodId = `${uid}-ewood`;
  const dustId = `${uid}-edust`;
  return (
    puffs.join('') +
    `<defs>` +
    `<linearGradient id="${dustId}" x1="0" y1="8" x2="0" y2="23" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="rgba(226,232,224,0.08)"/><stop offset="100%" stop-color="rgba(226,232,224,0.42)"/></linearGradient>` +
    `<linearGradient id="${woodId}" x1="0" y1="-25" x2="0" y2="-2" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#c08552"/><stop offset="55%" stop-color="#9b6336"/><stop offset="100%" stop-color="#784823"/></linearGradient>` +
    `</defs>` +
    `<g transform="translate(${tip.x.toFixed(1)},${tip.y.toFixed(1)}) rotate(${tiltDeg}) scale(${scale.toFixed(
      2
    )})" opacity="${alpha.toFixed(3)}">` +
    `<rect x="-48" y="-19" width="100" height="48" rx="8" fill="rgba(0,0,0,0.34)"/>` +
    `<rect x="-50" y="-8" width="100" height="31" rx="6" fill="#2c3138"/>` +
    `<rect x="-46" y="10" width="92" height="12" fill="url(#${dustId})"/>` +
    `<rect x="-48" y="-25" width="96" height="21" rx="5" fill="url(#${woodId})" stroke="#5a3417" stroke-width="1.2"/>` +
    `<rect x="-42" y="-21" width="84" height="3" fill="rgba(255,235,205,0.22)"/>` +
    `</g>`
  );
}

export function renderSnapshotToSvg(snapshot: EvaluatedFrameSnapshot): string {
  const { width, height } = snapshot;
  const uid = `f${Math.max(0, Math.round(snapshot.globalTMs))}`;

  if (snapshot.kind === 'scene') {
    const body = renderSceneLayerSvg(snapshot, `${uid}-bg-scene`);
    const sub = renderSubtitleSvg(
      width,
      height,
      snapshot.subtitleText,
      snapshot.palette
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}${sub}</svg>`;
  }

  const p = Math.max(0, Math.min(1, snapshot.progress));

  if (snapshot.transitionId === 'cut') {
    const chosen = p >= 0.5 ? snapshot.toScene : snapshot.fromScene;
    const sub = renderSubtitleSvg(
      width,
      height,
      snapshot.subtitleText,
      chosen.palette
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${renderSceneLayerSvg(
      chosen,
      `${uid}-bg-cut`
    )}${sub}</svg>`;
  }

  const subPalette =
    p < 0.5 ? snapshot.fromScene.palette : snapshot.toScene.palette;
  const sub = renderSubtitleSvg(
    width,
    height,
    snapshot.subtitleText,
    subPalette
  );

  const toLayer = renderSceneLayerSvg(snapshot.toScene, `${uid}-bg-to`);
  const fromLayer = renderSceneLayerSvg(snapshot.fromScene, `${uid}-bg-from`);

  if (snapshot.transitionId === 'chalkboard-eraser') {
    const sweepU = Math.min(1, p / 0.88);
    const waypoints = buildEraserSweepWaypoints(width, height);
    const { points, tip, angleRad } = sampleEraserSweepPrefix(waypoints, sweepU);
    const brushWidth = Math.max(height * 0.44, 165);
    const sweepD = points.length >= 2 && sweepU > 0.001 ? pointsToSvgPath(points) : '';
    const maskId = `${uid}-eraser-wipe-mask`;
    const maskDef =
      `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">` +
      `<rect width="${width}" height="${height}" fill="white"/>` +
      (sweepD
        ? `<path d="${sweepD}" fill="none" stroke="black" stroke-width="${(
            brushWidth * 1.16
          ).toFixed(
            1
          )}" stroke-opacity="0.42" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<path d="${sweepD}" fill="none" stroke="black" stroke-width="${brushWidth.toFixed(
            1
          )}" stroke-linecap="round" stroke-linejoin="round"/>`
        : '') +
      `</mask></defs>`;
    const eraser = renderChalkboardEraserSvg(tip, angleRad, height, p, uid);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${maskDef}${toLayer}<g mask="url(#${maskId})">${fromLayer}</g>${eraser}${sub}</svg>`;
  }

  if (snapshot.transitionId === 'page-turn') {
    const eased =
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const shiftX = (-eased * width).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${toLayer}<g transform="translate(${shiftX},0)">${fromLayer}</g>${sub}</svg>`;
  }

  const fromOpacity = (1 - p).toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${toLayer}<g opacity="${fromOpacity}">${fromLayer}</g>${sub}</svg>`;
}

export function renderSceneFrameSvg(
  scene: LessonScene,
  timeline: CompiledTimeline,
  tMs: number,
  width: number,
  height: number
): string {
  return renderSnapshotToSvg(
    evaluateSceneFrameSnapshot(scene, timeline, tMs, width, height)
  );
}

export function renderProjectFrameSvg(
  compiledProject: CompiledProjectTimeline,
  globalTMs: number,
  width: number,
  height: number
): string {
  return renderSnapshotToSvg(
    evaluateProjectFrameSnapshot(compiledProject, globalTMs, width, height)
  );
}
