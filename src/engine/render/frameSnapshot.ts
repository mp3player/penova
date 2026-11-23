import '../../plugins';
import { LessonScene, Point } from '../../model/scene';
import {
  EvaluatedFrameSnapshot,
  EvaluatedGlyphSnapshot,
  EvaluatedGroupFrameSnapshot,
  EvaluatedSceneSnapshot,
  EvaluatedStrokeSnapshot,
  EvaluatedTextLineSnapshot,
} from '../../plugins/contracts';
import { presentationRegistry } from '../../plugins/registry';
import { StrokePath } from '../../sdk/strokePath';
import { getActiveSubtitleAt } from '../subtitle/subtitleEngine';
import {
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../timeline/projectTimeline';
import { CompiledTimeline, evaluateTimelineAt } from '../timeline/timelineEngine';
import { getActiveCamera, worldToScreen } from './sceneRenderer';
import { resolveColorHex } from './themes';

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

function renderStrokeSvg(
  stroke: StrokePath,
  colorHex: string,
  progress: number
): string {
  const pts = slicePolylinePoints(
    stroke.points,
    stroke.cumLengths,
    stroke.totalLength,
    progress
  );
  if (pts.length < 2) return '';
  const d = pointsToSvgPath(pts);
  const dashAttr = stroke.dashed ? ' stroke-dasharray="12 9"' : '';
  return `<path d="${d}" fill="none" stroke="${escapeXml(
    colorHex
  )}" stroke-width="${stroke.width.toFixed(2)}" stroke-opacity="${stroke.opacity.toFixed(
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

    if (item.kind === 'group-frame') {
      groupFrames.push({
        id: item.id,
        color: item.color,
        colorHex: resolveColorHex(scene.theme, item.color),
        progress: p,
        stroke: item.stroke,
      });
    } else if (item.kind === 'stroke') {
      strokes.push({
        id: item.id,
        color: item.color,
        colorHex: resolveColorHex(scene.theme, item.color),
        progress: p,
        stroke: item.stroke,
      });
    } else if (item.kind === 'text-line') {
      const spans: EvaluatedGlyphSnapshot[] = [];
      for (const span of item.spans) {
        let charP = 0;
        if (evalState.tMs >= span.endMs) {
          charP = 1;
        } else if (evalState.tMs > span.startMs) {
          charP =
            (evalState.tMs - span.startMs) /
            Math.max(1, span.endMs - span.startMs);
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
    fontFamily: presentation.fontFamily,
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
  ];

  if (theme === 'blueprint') {
    defs.push(
      `<pattern id="${gradId}-grid-minor" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(103, 232, 249, 0.08)" stroke-width="1"/></pattern>`,
      `<pattern id="${gradId}-grid-major" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(103, 232, 249, 0.18)" stroke-width="1"/></pattern>`
    );
  }

  parts.push(`<defs>${defs.join('')}</defs>`);
  parts.push(`<rect width="${width}" height="${height}" fill="url(#${gradId})"/>`);

  if (theme === 'blueprint') {
    const margin = Math.max(12, Math.round(Math.min(width, height) * 0.018));
    parts.push(
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-grid-minor)"/>`,
      `<rect width="${width}" height="${height}" fill="url(#${gradId}-grid-major)"/>`,
      `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${
        height - margin * 2
      }" fill="none" stroke="rgba(186, 230, 253, 0.22)" stroke-width="1"/>`
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
        `<path d="${rulePaths.join(' ')}" fill="none" stroke="rgba(155, 130, 96, 0.2)" stroke-width="${strokeW}"/>`
      );
    }
    const marginX = Math.max(34, Math.round(width * 0.082));
    parts.push(
      `<path d="M${(marginX + 0.5).toFixed(1)},0 L${(marginX + 0.5).toFixed(
        1
      )},${height} M${(marginX + 4.5).toFixed(1)},0 L${(marginX + 4.5).toFixed(
        1
      )},${height}" fill="none" stroke="rgba(196, 104, 94, 0.26)" stroke-width="${strokeW}"/>`
    );
  } else if (theme === 'chalkboard') {
    const ledgeH = Math.max(8, Math.round(height * 0.012));
    const ledgeY = height - ledgeH;
    parts.push(
      `<rect x="0" y="${ledgeY}" width="${width}" height="${ledgeH}" fill="#3b2819"/>`,
      `<rect x="0" y="${ledgeY}" width="${width}" height="1" fill="rgba(255, 232, 198, 0.14)"/>`
    );
  }

  return parts.join('');
}

function renderSceneLayerSvg(
  snap: EvaluatedSceneSnapshot,
  gradId: string
): string {
  const { width, height, palette, camera } = snap;
  const parts: string[] = [];

  parts.push(renderSurfaceBackgroundSvg(snap, gradId));

  parts.push(
    `<g transform="translate(${(width / 2).toFixed(2)},${(height / 2).toFixed(
      2
    )}) scale(${camera.zoom.toFixed(4)}) translate(${(-camera.cx).toFixed(
      2
    )},${(-camera.cy).toFixed(2)})">`
  );

  for (const gf of snap.groupFrames) {
    const svg = renderStrokeSvg(gf.stroke, gf.colorHex, gf.progress);
    if (svg) parts.push(svg);
  }

  for (const st of snap.strokes) {
    const svg = renderStrokeSvg(st.stroke, st.colorHex, st.progress);
    if (svg) parts.push(svg);
  }

  for (const line of snap.textLines) {
    if (line.isEdgeLabel || line.isGroupTitle) {
      const pillAlpha = Math.min(1, line.progress * 3.5).toFixed(3);
      const rx = (line.centerX - line.bgWidth / 2).toFixed(2);
      const ry = (line.centerY - line.bgHeight / 2).toFixed(2);
      parts.push(
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

    for (const span of line.spans) {
      if (span.progress >= 0.999 || span.segments.length === 0) {
        const tx = (span.boxX + span.padX).toFixed(2);
        const ty = (span.boxY + span.height * 0.52).toFixed(2);
        parts.push(
          `<text x="${tx}" y="${ty}" fill="${escapeXml(
            line.colorHex
          )}" font-family="${escapeXml(
            snap.fontFamily
          )}" font-size="${span.fontSize.toFixed(
            1
          )}" font-weight="${boldWeight}" dominant-baseline="central">${escapeXml(
            span.char
          )}</text>`
        );
      } else {
        let remaining = span.progress * span.totalLength;
        const strokeWidth = Math.max(1.6, span.fontSize * 0.1).toFixed(2);
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
            parts.push(
              `<path d="${pointsToSvgPath(shifted)}" fill="none" stroke="${escapeXml(
                line.colorHex
              )}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
            );
          }
          remaining -= seg.length;
        }
      }
    }
  }

  parts.push('</g>');

  if (
    snap.pen.visible &&
    snap.handStyle !== 'hidden' &&
    snap.pen.alpha > 0.02
  ) {
    const px = snap.pen.screenX.toFixed(2);
    const py = (snap.pen.screenY - snap.pen.lift * 0.8).toFixed(2);
    const bodyHeight = snap.handStyle === 'tip-only' ? 18 : 30;
    const handSilhouette =
      snap.handStyle === 'hand-chalk'
        ? '<path d="M2,12 C12,6 22,12 24,26 L6,34 Z" fill="rgba(226,184,150,0.85)" stroke="rgba(90,58,36,0.65)" stroke-width="0.9"/>'
        : snap.handStyle === 'hand-minimal'
        ? '<path d="M2,12 C10,7 19,12 21,24" fill="none" stroke="rgba(226,232,240,0.6)" stroke-width="1.4" stroke-linecap="round"/>'
        : '';
    parts.push(
      `<g transform="translate(${px},${py}) rotate(35)" opacity="${snap.pen.alpha.toFixed(
        3
      )}">${handSilhouette}<rect x="-3" y="0" width="6" height="${bodyHeight}" rx="2" fill="${escapeXml(
        snap.pen.colorHex
      )}" stroke="#111827" stroke-width="0.9"/><circle cx="0" cy="0" r="2.2" fill="${escapeXml(
        snap.pen.colorHex
      )}"/></g>`
    );
  }

  return parts.join('');
}

function wrapSubtitleLinesSvg(text: string, maxCharsPerLine: number): string[] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return [];
  const weightOf = (ch: string) => {
    const code = ch.codePointAt(0) ?? 0;
    return code >= 0x2e80 ? 1.0 : 0.56;
  };
  const lines: string[] = [];
  let cur = '';
  let curWeight = 0;
  for (const ch of clean) {
    const w = weightOf(ch);
    if (cur && curWeight + w > maxCharsPerLine && lines.length === 0) {
      lines.push(cur.trimEnd());
      cur = ch === ' ' ? '' : ch;
      curWeight = ch === ' ' ? 0 : w;
    } else {
      cur += ch;
      curWeight += w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 2);
}

function renderSubtitleSvg(
  width: number,
  height: number,
  text?: string
): string {
  const trimmed = text?.trim();
  if (!trimmed) return '';
  const fontSize = Math.max(13, Math.round(height * 0.032));
  const maxBoxW = Math.max(200, width - 32, Math.round(width * 0.74));
  const clampedMaxW = Math.min(width - 24, Math.round(width * 0.78));
  const maxChars = Math.max(12, clampedMaxW / Math.max(10, fontSize * 0.96));
  const lines = wrapSubtitleLinesSvg(trimmed, maxChars);
  if (lines.length === 0) return '';

  const lineHeight = fontSize * 1.32;
  const padY = Math.round(fontSize * 0.45);
  const boxH = Math.round(lines.length * lineHeight + padY * 2);
  const longestChars = Math.max(
    ...lines.map((l) =>
      [...l].reduce(
        (acc, ch) => acc + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1.0 : 0.56),
        0
      )
    )
  );
  const boxW = Math.min(
    clampedMaxW,
    Math.min(
      maxBoxW,
      Math.max(160, Math.round(longestChars * fontSize * 1.02 + fontSize * 1.8))
    )
  );
  const x = (width - boxW) / 2;
  const y = Math.min(height - boxH - 14, height * 0.89 - boxH / 2);

  const textEls = lines
    .map((line, i) => {
      const cy = y + padY + lineHeight * (i + 0.5);
      return `<text x="${(width / 2).toFixed(1)}" y="${cy.toFixed(
        1
      )}" fill="#f8fafc" font-family="sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(
        line
      )}</text>`;
    })
    .join('');

  return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(
    1
  )}" width="${boxW}" height="${boxH}" rx="9" ry="9" fill="rgba(11,15,22,0.82)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>${textEls}</g>`;
}

function renderChalkboardEraserSvg(
  width: number,
  height: number,
  p: number
): string {
  const sweepU = Math.min(1, p / 0.88);
  const wipeX = sweepU * width;
  const eraserY = height * 0.5 + Math.sin(p * Math.PI * 5) * height * 0.24;
  const alpha = p <= 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
  if (alpha <= 0.01) return '';
  const scale = Math.max(0.85, Math.min(1.45, height / 560));

  return `<g transform="translate(${wipeX.toFixed(1)},${eraserY.toFixed(
    1
  )}) scale(${scale.toFixed(2)})" opacity="${alpha.toFixed(
    3
  )}"><circle cx="-28" cy="-8" r="24" fill="#e8ece6" opacity="0.22"/><circle cx="-48" cy="10" r="18" fill="#e8ece6" opacity="0.16"/><rect x="-48" y="-19" width="100" height="48" rx="8" fill="rgba(0,0,0,0.34)"/><rect x="-50" y="-8" width="100" height="31" rx="6" fill="#2c3138"/><rect x="-48" y="-25" width="96" height="21" rx="5" fill="#9b6336" stroke="#5a3417" stroke-width="1.2"/></g>`;
}

export function renderSnapshotToSvg(snapshot: EvaluatedFrameSnapshot): string {
  const { width, height } = snapshot;
  const uid = `f${Math.max(0, Math.round(snapshot.globalTMs))}`;

  if (snapshot.kind === 'scene') {
    const body = renderSceneLayerSvg(snapshot, `${uid}-bg-scene`);
    const sub = renderSubtitleSvg(width, height, snapshot.subtitleText);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}${sub}</svg>`;
  }

  const p = Math.max(0, Math.min(1, snapshot.progress));
  const sub = renderSubtitleSvg(width, height, snapshot.subtitleText);

  if (snapshot.transitionId === 'cut') {
    const chosen = p >= 0.5 ? snapshot.toScene : snapshot.fromScene;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${renderSceneLayerSvg(
      chosen,
      `${uid}-bg-cut`
    )}${sub}</svg>`;
  }

  const toLayer = renderSceneLayerSvg(snapshot.toScene, `${uid}-bg-to`);
  const fromLayer = renderSceneLayerSvg(snapshot.fromScene, `${uid}-bg-from`);

  if (snapshot.transitionId === 'chalkboard-eraser') {
    const sweepU = Math.min(1, p / 0.88);
    const wipeX = Math.max(0, Math.min(width, sweepU * width));
    const remW = Math.max(0, width - wipeX);
    const clipId = `${uid}-eraser-wipe-clip`;
    const clipDef = `<defs><clipPath id="${clipId}"><rect x="${wipeX.toFixed(
      1
    )}" y="0" width="${remW.toFixed(1)}" height="${height}"/></clipPath></defs>`;
    const eraser = renderChalkboardEraserSvg(width, height, p);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${clipDef}${toLayer}<g clip-path="url(#${clipId})">${fromLayer}</g>${eraser}${sub}</svg>`;
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
