import { getCardSummary } from '../../model/builders';
import { SubtitleCue } from '../../model/project';
import { findNodeById, ThemeId } from '../../model/scene';
import { presentationRegistry } from '../../plugins/registry';
import { wrapText } from '../layout/textMeasure';
import { CompiledProjectTimeline } from '../timeline/projectTimeline';

export function getActiveSubtitleAt(
  cues: SubtitleCue[] | undefined,
  globalTMs: number
): SubtitleCue | undefined {
  if (!cues || cues.length === 0) return undefined;
  return cues.find(
    (c) =>
      globalTMs >= c.startMs &&
      globalTMs <= c.endMs &&
      c.text.trim().length > 0
  );
}

export function generateAutoSubtitles(
  compiledProject: CompiledProjectTimeline
): SubtitleCue[] {
  const cues: SubtitleCue[] = [];

  for (const seg of compiledProject.segments) {
    seg.timeline.steps.forEach((step, stepIdx) => {
      const startMs = Math.round(seg.startMs + step.startMs);
      const endMs = Math.round(seg.startMs + step.endMs);

      let rawText = step.step.title || `第 ${stepIdx + 1} 步`;
      let hasCustomSay = false;
      for (const nid of step.step.nodeIds) {
        const node = findNodeById(seg.scene.nodes, nid);
        if (!node || node.type === 'connector') continue;
        const customSay =
          typeof node.meta?.say === 'string' ? node.meta.say.trim() : '';
        if (customSay) {
          rawText = customSay;
          hasCustomSay = true;
        } else if (node.type === 'text') {
          rawText = node.text.replace(/\s+/g, ' ').trim();
        } else {
          const summary = getCardSummary(node);
          rawText = summary.subtitle
            ? `${summary.label}：${summary.subtitle}`
            : summary.label;
        }
        break;
      }

      const compact = rawText.replace(/\s+/g, ' ').trim();
      const maxLen = hasCustomSay ? 120 : 44;
      const text =
        compact.length > maxLen ? `${compact.slice(0, maxLen - 3)}...` : compact;

      if (text) {
        cues.push({
          id: `sub-${seg.sceneIndex + 1}-${stepIdx + 1}`,
          startMs,
          endMs,
          text,
        });
      }
    });
  }

  return cues;
}

export function formatSrtTimestamp(rawMs: number): string {
  const totalMs = Math.max(0, Math.round(rawMs));
  const hours = Math.floor(totalMs / 3_600_000);
  const mins = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0'
  )}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function parseSrtTimestamp(ts: string): number {
  const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!m) return 0;
  return (
    Number(m[1]) * 3_600_000 +
    Number(m[2]) * 60_000 +
    Number(m[3]) * 1000 +
    Number(m[4])
  );
}

export function serializeSubtitlesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(
          cue.endMs
        )}\n${cue.text.trim()}`
    )
    .join('\n\n');
}

export function parseSrtToSubtitles(srt: string): SubtitleCue[] {
  const blocks = srt
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  blocks.forEach((block, idx) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (lines.length < 2) return;

    const timingLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timingLineIdx === -1) return;

    const [startRaw, endRaw] = lines[timingLineIdx].split('-->');
    const startMs = parseSrtTimestamp(startRaw ?? '');
    const endMs = Math.max(startMs, parseSrtTimestamp(endRaw ?? ''));
    const text = lines
      .slice(timingLineIdx + 1)
      .join('\n')
      .trim();
    if (!text) return;

    cues.push({
      id: `srt-${idx + 1}`,
      startMs,
      endMs,
      text,
    });
  });

  return cues;
}

export function drawSubtitleOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  theme?: ThemeId
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const palette = presentationRegistry.getOrDefault(theme ?? 'chalkboard').palette;
  const fontSize = Math.max(13, Math.round(height * 0.032));
  const lineHeight = Math.round(fontSize * 1.32);
  const maxTextW = Math.max(180, width * 0.78);
  const font = `600 ${fontSize}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;

  ctx.save();
  ctx.font = font;

  let lines = wrapText(trimmed, maxTextW, (s) => ctx.measureText(s).width);
  if (lines.length > 2) {
    const second = lines[1];
    lines = [
      lines[0],
      second.length > 2 ? `${second.slice(0, second.length - 1)}…` : second,
    ];
  }

  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, ctx.measureText(line).width);
  }

  const padX = Math.max(14, Math.round(fontSize * 0.85));
  const padY = Math.max(7, Math.round(fontSize * 0.42));
  const boxW = Math.min(width - 24, Math.ceil(widest + padX * 2));
  const boxH = lines.length * lineHeight + padY * 2;
  const centerY = Math.min(height - boxH / 2 - 14, height * 0.89);
  const x = (width - boxW) / 2;
  const y = centerY - boxH / 2;

  ctx.fillStyle = palette.subtitleBg ?? 'rgba(11, 15, 22, 0.78)';
  ctx.strokeStyle = palette.subtitleBorder ?? 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.subtitleTextColor ?? '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, idx) => {
    const ly = y + padY + lineHeight * (idx + 0.5);
    ctx.fillText(line, width / 2, ly);
  });

  ctx.restore();
}
