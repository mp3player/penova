import { ChalkColor, Point, Rect, TeachingStep } from '../../model/scene';
import { ComputedLayout, GroupBox } from '../layout/diagramLayout';
import { StrokePath } from '../sketch/handDrawnGeometry';
import { GlyphStrokeData } from '../sketch/textStrokes';

export interface CompiledGlyphSpan {
  char: string;
  boxX: number;
  boxY: number;
  glyph: GlyphStrokeData;
  startMs: number;
  endMs: number;
  startTip: Point;
  endTip: Point;
}

export interface CompiledStrokeItem {
  kind: 'stroke';
  id: string;
  startMs: number;
  endMs: number;
  color: ChalkColor;
  stroke: StrokePath;
  startPoint: Point;
  endPoint: Point;
  stepIndex?: number;
  nodeId?: string;
}

export interface CompiledGroupFrameItem {
  kind: 'group-frame';
  id: string;
  startMs: number;
  endMs: number;
  color: ChalkColor;
  group: GroupBox;
  stroke: StrokePath;
  startPoint: Point;
  endPoint: Point;
  stepIndex?: number;
  nodeId?: string;
}

export interface CompiledTextLineItem {
  kind: 'text-line';
  id: string;
  startMs: number;
  endMs: number;
  color: ChalkColor;
  font: string;
  fontSize: number;
  isEdgeLabel?: boolean;
  isGroupTitle?: boolean;
  centerX: number;
  centerY: number;
  bgWidth: number;
  bgHeight: number;
  spans: CompiledGlyphSpan[];
  startPoint: Point;
  endPoint: Point;
  stepIndex?: number;
  nodeId?: string;
}

export type CompiledItem =
  | CompiledStrokeItem
  | CompiledGroupFrameItem
  | CompiledTextLineItem;

export interface CompiledStep {
  stepIndex: number;
  step: TeachingStep;
  startMs: number;
  drawStartMs: number;
  drawEndMs: number;
  endMs: number;
  items: CompiledItem[];
  focusBounds: Rect;
  cumulativeBounds: Rect;
  focusNodeIds?: string[];
}

export interface CompiledTimeline {
  steps: CompiledStep[];
  allItems: CompiledItem[];
  outroStartMs: number;
  totalDurationMs: number;
  layout: ComputedLayout;
  fullBounds: Rect;
  spotlight?: boolean;
}

export interface PenState {
  visible: boolean;
  worldX: number;
  worldY: number;
  penDown: boolean;
  lift: number;
  color: ChalkColor;
  velocity: number;
  seed: number;
  alpha: number;
}

export interface TimelineEvalState {
  tMs: number;
  activeStepIndex: number;
  itemProgress: Map<string, number>;
  itemOpacity?: Map<string, number>;
  pen: PenState;
}
