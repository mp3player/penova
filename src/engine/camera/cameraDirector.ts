import '../../plugins';
import { CameraMode } from '../../model/scene';
import { fitBounds } from '../../plugins/cameras/helpers';
import { CameraPenHint, CameraState } from '../../plugins/contracts';
import { cameraRegistry } from '../../plugins/registry';
import { CompiledTimeline, evaluateTimelineAt } from '../timeline/timelineEngine';

export type { CameraState };
export { fitBounds };

export function evaluateCameraAt(
  timeline: CompiledTimeline,
  rawTMs: number,
  viewportW: number,
  viewportH: number,
  mode: CameraMode,
  precomputedPen?: CameraPenHint
): CameraState {
  const tMs = Math.max(0, Math.min(timeline.totalDurationMs, rawTMs));
  const activePen = precomputedPen ?? evaluateTimelineAt(timeline, tMs).pen;
  const plugin = cameraRegistry.getOrDefault(mode);

  return plugin.evaluate({
    steps: timeline.steps,
    outroStartMs: timeline.outroStartMs,
    totalDurationMs: timeline.totalDurationMs,
    fullBounds: timeline.fullBounds,
    tMs,
    viewportW,
    viewportH,
    activePen,
  });
}
