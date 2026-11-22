import { Point } from '../../model/scene';
import { GlyphProviderPlugin, GlyphStrokeSegment } from '../contracts';

export const inkGridGlyphProvider: GlyphProviderPlugin = {
  id: 'ink-grid-fallback',
  name: '通用墨迹网格追踪',
  priority: 10,
  resolveStrokes(ctx): GlyphStrokeSegment[] | null {
    const { imgData, pixelW, pixelH, boxW, boxH } = ctx;
    if (!imgData || !pixelW || !pixelH) {
      return null;
    }

    const data = imgData.data;

    let minPx = pixelW;
    let minPy = pixelH;
    let maxPx = -1;
    let maxPy = -1;

    for (let py = 0; py < pixelH; py++) {
      const rowOff = py * pixelW * 4;
      for (let px = 0; px < pixelW; px++) {
        if (data[rowOff + px * 4 + 3] > 24) {
          if (px < minPx) minPx = px;
          if (px > maxPx) maxPx = px;
          if (py < minPy) minPy = py;
          if (py > maxPy) maxPy = py;
        }
      }
    }

    if (maxPx < minPx || maxPy < minPy) {
      return [];
    }

    const inkW = Math.max(1, maxPx - minPx + 1);
    const inkH = Math.max(1, maxPy - minPy + 1);

    const gridN = 14;
    const occupied: boolean[][] = Array.from({ length: gridN }, () =>
      new Array<boolean>(gridN).fill(false)
    );
    const cellCenterX: number[][] = Array.from({ length: gridN }, () =>
      new Array<number>(gridN).fill(0)
    );
    const cellCenterY: number[][] = Array.from({ length: gridN }, () =>
      new Array<number>(gridN).fill(0)
    );

    let occupiedCount = 0;

    for (let gy = 0; gy < gridN; gy++) {
      const y0 = minPy + Math.floor((gy * inkH) / gridN);
      const y1 = Math.max(
        y0 + 1,
        minPy + Math.floor(((gy + 1) * inkH) / gridN)
      );

      for (let gx = 0; gx < gridN; gx++) {
        const x0 = minPx + Math.floor((gx * inkW) / gridN);
        const x1 = Math.max(
          x0 + 1,
          minPx + Math.floor(((gx + 1) * inkW) / gridN)
        );

        let sumA = 0;
        let sumX = 0;
        let sumY = 0;
        let hit = 0;

        for (let py = y0; py < y1; py++) {
          const rowOff = py * pixelW * 4;
          for (let px = x0; px < x1; px++) {
            const a = data[rowOff + px * 4 + 3];
            if (a > 24) {
              sumA += a;
              sumX += px * a;
              sumY += py * a;
              hit++;
            }
          }
        }

        if (hit > 0) {
          occupied[gy][gx] = true;
          occupiedCount++;
          cellCenterX[gy][gx] = (sumX / sumA / pixelW) * boxW;
          cellCenterY[gy][gx] = (sumY / sumA / pixelH) * boxH;
        }
      }
    }

    if (occupiedCount <= 3) {
      const cx = (((minPx + maxPx) * 0.5) / pixelW) * boxW;
      const cy = (((minPy + maxPy) * 0.5) / pixelH) * boxH;
      const dab: Point[] = [
        { x: cx - 2, y: cy - 2 },
        { x: cx + 2, y: cy + 2 },
      ];
      return [{ points: dab, length: Math.hypot(4, 4) }];
    }

    const visited: boolean[][] = Array.from({ length: gridN }, () =>
      new Array<boolean>(gridN).fill(false)
    );
    const segments: GlyphStrokeSegment[] = [];

    const findStartCell = (): [number, number] | null => {
      let bestScore = Infinity;
      let best: [number, number] | null = null;
      for (let gy = 0; gy < gridN; gy++) {
        for (let gx = 0; gx < gridN; gx++) {
          if (!occupied[gy][gx] || visited[gy][gx]) continue;
          const score = gy * 1.45 + gx * 0.85;
          if (score < bestScore) {
            bestScore = score;
            best = [gy, gx];
          }
        }
      }
      return best;
    };

    let start = findStartCell();
    while (start) {
      let [cy, cx] = start;
      visited[cy][cx] = true;
      const pts: Point[] = [{ x: cellCenterX[cy][cx], y: cellCenterY[cy][cx] }];
      let prevDirX = 1;
      let prevDirY = 0.25;

      for (let step = 0; step < gridN * gridN; step++) {
        let bestNeighbor: [number, number] | null = null;
        let bestCost = Infinity;

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = cy + dy;
            const nx = cx + dx;
            if (ny < 0 || ny >= gridN || nx < 0 || nx >= gridN) continue;
            if (!occupied[ny][nx] || visited[ny][nx]) continue;

            const dist = Math.hypot(dx, dy);
            const pLen = Math.hypot(prevDirX, prevDirY) || 1;
            const dot = (dx * prevDirX + dy * prevDirY) / (dist * pLen);
            const turnPenalty = (1 - dot) * 0.9;
            const upwardPenalty = dy < 0 ? 0.55 : 0;
            const cost = dist + turnPenalty + upwardPenalty;

            if (cost < bestCost) {
              bestCost = cost;
              bestNeighbor = [ny, nx];
            }
          }
        }

        if (!bestNeighbor || bestCost > 3.4) {
          break;
        }

        const [ny, nx] = bestNeighbor;
        prevDirX = nx - cx;
        prevDirY = ny - cy;
        cy = ny;
        cx = nx;
        visited[cy][cx] = true;
        pts.push({ x: cellCenterX[cy][cx], y: cellCenterY[cy][cx] });
      }

      if (pts.length === 1) {
        pts.push({ x: pts[0].x + 2.5, y: pts[0].y + 1.5 });
      }

      let segLen = 0;
      for (let i = 1; i < pts.length; i++) {
        segLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }

      segments.push({ points: pts, length: Math.max(1, segLen) });
      start = findStartCell();
    }

    return segments.length > 0 ? segments : null;
  },
};
