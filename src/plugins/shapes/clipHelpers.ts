import { Point } from '../../model/scene';

export function clipRayToRect(
  cx: number,
  cy: number,
  width: number,
  height: number,
  toward: Point,
  extraMargin = 4
): Point {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.hypot(dx, dy) < 1e-4) {
    return { x: cx + width / 2 + extraMargin, y: cy };
  }
  const rx = width / 2 + extraMargin;
  const ry = height / 2 + extraMargin;
  const tx = Math.abs(dx) > 1e-4 ? rx / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-4 ? ry / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

export function clipRayToEllipse(
  cx: number,
  cy: number,
  width: number,
  height: number,
  toward: Point,
  extraMargin = 4
): Point {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.hypot(dx, dy) < 1e-4) {
    return { x: cx + width / 2 + extraMargin, y: cy };
  }
  const rx = width / 2 + extraMargin;
  const ry = height / 2 + extraMargin;
  const t = 1 / Math.hypot(dx / rx, dy / ry);
  return { x: cx + dx * t, y: cy + dy * t };
}

export function clipRayToDiamond(
  cx: number,
  cy: number,
  width: number,
  height: number,
  toward: Point,
  extraMargin = 4
): Point {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.hypot(dx, dy) < 1e-4) {
    return { x: cx + width / 2 + extraMargin, y: cy };
  }
  const rx = width / 2 + extraMargin;
  const ry = height / 2 + extraMargin;
  const t = 1 / (Math.abs(dx) / rx + Math.abs(dy) / ry);
  return { x: cx + dx * t, y: cy + dy * t };
}
