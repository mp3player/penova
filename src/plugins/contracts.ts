import {
  AspectRatio,
  ChalkColor,
  CustomSceneNode,
  GroupSceneNode,
  LessonScene,
  NodeShape,
  Point,
  Rect,
  SceneNode,
  TeachingStep,
  TextAlign,
  ThemeId,
} from '../model/scene';
import { PropFieldDescriptor } from '../sdk/propSchema';
import { StrokePath } from '../sdk/strokePath';

export interface ThemePalette {
  id: string;
  label: string;
  bgPrimary: string;
  bgSecondary: string;
  vignetteColor: string;
  subtitleColor: string;
  labelPillBg: string;
  labelPillBorder: string;
  cardFillOpacity?: number;
  zoneFillOpacity?: number;
  cardFillColors?: Partial<Record<ChalkColor, string>>;
  cardShadow?: { dx: number; dy: number; color: string };
  preferNeutralCardTitle?: boolean;
  subtitleBg?: string;
  subtitleBorder?: string;
  subtitleTextColor?: string;
  colors: Record<ChalkColor, string>;
}

export interface MeasuredTextNode {
  type: 'text';
  font: string;
  fontSize: number;
  lineHeight: number;
  align: TextAlign;
  indentPx: number;
  lines: string[];
  width: number;
  height: number;
}

export interface MeasuredShapeNode {
  type: 'shape';
  width: number;
  height: number;
  padX: number;
  padY: number;
  textOffsetY?: number;
}

export interface MeasuredConnectorNode {
  type: 'connector';
  width: number;
  height: number;
}

export interface MeasuredGroupNode {
  type: 'group';
  width: number;
  height: number;
  primaryShape?: NodeShape;
  textOffsetY?: number;
  childMeasurements: Map<string, MeasuredSceneNode>;
}

export interface MeasuredCustomNode {
  type: 'custom';
  kind: string;
  width: number;
  height: number;
  composedNode?: SceneNode;
  composedMeasured?: MeasuredSceneNode;
  payload?: unknown;
}

export type MeasuredSceneNode =
  | MeasuredTextNode
  | MeasuredShapeNode
  | MeasuredConnectorNode
  | MeasuredGroupNode
  | MeasuredCustomNode;

export interface PositionedSceneNode {
  id: string;
  node: SceneNode;
  cx: number;
  cy: number;
  width: number;
  height: number;
  measured: MeasuredSceneNode;
  children?: PositionedSceneNode[];
  routedPoints?: Point[];
  labelPoint?: Point;
}

export interface GroupBox {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: ChalkColor;
}

export interface ComputedLayout {
  nodes: PositionedSceneNode[];
  nodeMap: Map<string, PositionedSceneNode>;
  zones: GroupBox[];
  bounds: Rect;
}

export interface SceneTextCodec {
  id: string;
  label: string;
  hintTitle: string;
  hintLines: string[];
  syntaxRules?: string[];
  example?: string;
  parse(
    text: string,
    base: LessonScene
  ): { scene: LessonScene; warnings: string[] };
  serialize(scene: LessonScene): string;
}

export interface ShapeRenderInput {
  id: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  color: ChalkColor;
  emphasized?: boolean;
  dashed?: boolean;
}

export interface ShapePlugin {
  id: string;
  name: string;
  maxTextWidth?(): number;
  measureBox(
    contentW: number,
    contentH: number
  ): {
    width: number;
    height: number;
    padX: number;
    padY: number;
    textOffsetY?: number;
  };
  clipRay(
    cx: number,
    cy: number,
    width: number,
    height: number,
    toward: Point,
    extraMargin: number
  ): Point;
  generateStrokes(input: ShapeRenderInput): StrokePath[];
}

export interface LayoutHelpers {
  measureNode(node: SceneNode): MeasuredSceneNode;
  positionGroupChildren(
    group: GroupSceneNode,
    cx: number,
    cy: number,
    measured: MeasuredGroupNode
  ): PositionedSceneNode[];
}

export type LayoutIconKind =
  | 'flow-lr'
  | 'flow-tb'
  | 'mindmap'
  | 'concept-graph'
  | 'document'
  | 'freeform';

export interface LayoutPlugin {
  id: string;
  name: string;
  category: 'basic' | 'diagram';
  icon: LayoutIconKind;
  dragMode: 'offset' | 'absolute';
  supportsEdges: boolean;
  supportsGroups?: boolean;
  textCodec?: SceneTextCodec;
  compute(scene: LessonScene, helpers: LayoutHelpers): ComputedLayout;
  deriveSteps?(scene: LessonScene): TeachingStep[];
}

export interface PresentationSoundProfile {
  baseFreqHz: number;
  velocityFreqBoostHz: number;
  baseGain: number;
}

export interface PresentationPlugin {
  id: string;
  name: string;
  palette: ThemePalette;
  fontFamily: string;
  glyphGrain?: {
    enabled: boolean;
    minAlphaFactor?: number;
    range?: number;
  };
  shadowColor: string;
  soundProfile: PresentationSoundProfile;
  drawSurface(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void;
  drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokePath,
    progress: number
  ): void;
  drawInstrument(ctx: CanvasRenderingContext2D, colorHex: string): void;
  drawParticles?(
    ctx: CanvasRenderingContext2D,
    tipX: number,
    tipY: number,
    colorHex: string,
    tMs: number,
    seed: number
  ): void;
}

export interface GlyphStrokeSegment {
  points: Point[];
  length: number;
}

export interface GlyphProviderContext {
  char: string;
  font: string;
  fontSize: number;
  boxW: number;
  boxH: number;
  inkBounds?: Rect;
  imgData?: ImageData;
  pixelW?: number;
  pixelH?: number;
}

export interface GlyphProviderPlugin {
  id: string;
  name: string;
  priority: number;
  resolveStrokes(ctx: GlyphProviderContext): GlyphStrokeSegment[] | null;
}

export interface HandRenderContext {
  ctx: CanvasRenderingContext2D;
  screenX: number;
  screenY: number;
  presentation: PresentationPlugin;
  colorHex: string;
  lift: number;
  alpha: number;
  penDown: boolean;
  velocity: number;
  tMs: number;
}

export interface HandPlugin {
  id: string;
  name: string;
  draw(context: HandRenderContext): void;
}

export interface CameraState {
  cx: number;
  cy: number;
  zoom: number;
}

export interface CameraStepSummary {
  startMs: number;
  drawStartMs: number;
  drawEndMs: number;
  endMs: number;
  focusBounds: Rect;
  cumulativeBounds: Rect;
}

export interface CameraPenHint {
  visible: boolean;
  worldX: number;
  worldY: number;
  penDown: boolean;
}

export interface CameraEvalContext {
  steps: CameraStepSummary[];
  outroStartMs: number;
  totalDurationMs: number;
  fullBounds: Rect;
  tMs: number;
  viewportW: number;
  viewportH: number;
  activePen?: CameraPenHint;
}

export interface CameraPlugin {
  id: string;
  name: string;
  evaluate(ctx: CameraEvalContext): CameraState;
}

export interface TransitionRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  progress: number;
  fromCanvas: HTMLCanvasElement;
  toCanvas: HTMLCanvasElement;
  fromScene: LessonScene;
  toScene: LessonScene;
}

export interface TransitionPlugin {
  id: string;
  name: string;
  defaultDurationMs: number;
  render(context: TransitionRenderContext): void;
}

export interface ExportFrameSource {
  title: string;
  aspectRatio: AspectRatio;
  totalDurationMs: number;
  width: number;
  height: number;
  fps: number;
  renderFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tMs: number
  ): void;
  evaluateFrame?(
    tMs: number,
    width?: number,
    height?: number
  ): EvaluatedFrameSnapshot;
  renderSvgFrame?(
    tMs: number,
    width?: number,
    height?: number
  ): string;
}

export interface EvaluatedGlyphSnapshot {
  char: string;
  boxX: number;
  boxY: number;
  width: number;
  height: number;
  padX: number;
  fontSize: number;
  progress: number;
  segments: GlyphStrokeSegment[];
  totalLength: number;
}

export interface EvaluatedTextLineSnapshot {
  id: string;
  color: ChalkColor;
  colorHex: string;
  font: string;
  fontSize: number;
  isEdgeLabel?: boolean;
  isGroupTitle?: boolean;
  centerX: number;
  centerY: number;
  bgWidth: number;
  bgHeight: number;
  progress: number;
  spans: EvaluatedGlyphSnapshot[];
}

export interface EvaluatedStrokeSnapshot {
  id: string;
  color: ChalkColor;
  colorHex: string;
  progress: number;
  stroke: StrokePath;
}

export interface EvaluatedGroupFrameSnapshot {
  id: string;
  color: ChalkColor;
  colorHex: string;
  progress: number;
  stroke: StrokePath;
}

export interface EvaluatedPenSnapshot {
  visible: boolean;
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  penDown: boolean;
  lift: number;
  color: ChalkColor;
  colorHex: string;
  velocity: number;
  alpha: number;
  seed?: number;
}

export interface EvaluatedSceneSnapshot {
  kind: 'scene';
  sceneId: string;
  title: string;
  theme: ThemeId;
  handStyle: string;
  fontFamily: string;
  palette: ThemePalette;
  width: number;
  height: number;
  localTMs: number;
  globalTMs: number;
  camera: CameraState;
  groupFrames: EvaluatedGroupFrameSnapshot[];
  strokes: EvaluatedStrokeSnapshot[];
  textLines: EvaluatedTextLineSnapshot[];
  pen: EvaluatedPenSnapshot;
  subtitleText?: string;
}

export interface EvaluatedTransitionSnapshot {
  kind: 'transition';
  transitionId: string;
  transitionName: string;
  progress: number;
  width: number;
  height: number;
  globalTMs: number;
  fromScene: EvaluatedSceneSnapshot;
  toScene: EvaluatedSceneSnapshot;
  subtitleText?: string;
}

export type EvaluatedFrameSnapshot =
  | EvaluatedSceneSnapshot
  | EvaluatedTransitionSnapshot;

export interface ExportRunOptions {
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}

export interface ExportOutput {
  blob: Blob;
  filename: string;
  mimeType: string;
  summary?: string;
}

export interface ExportPlugin {
  id: string;
  name: string;
  shortLabel?: string;
  category?: 'snapshot' | 'sequence';
  description?: string;
  isSupported?(): boolean;
  export(
    source: ExportFrameSource,
    options: ExportRunOptions
  ): Promise<ExportOutput>;
}

export interface SceneNodeMeasureContext {
  measureNode(node: SceneNode): MeasuredSceneNode;
  measureText(text: string, font: string): number;
  fontFamily: string;
}

export interface SceneNodeTextLineInput {
  id?: string;
  text: string;
  boxLeftX: number;
  boxWidth: number;
  centerY: number;
  align?: TextAlign;
  indentPx?: number;
  fontSize?: number;
  fontWeight?: 400 | 700;
  fontFamily?: string;
  color?: ChalkColor;
  msPerChar?: number;
  gapAfterMs?: number;
}

export interface SceneNodeCompileHelpers {
  theme: ThemeId;
  fontFamily: string;
  pushStroke(stroke: StrokePath, gapAfterMs?: number): void;
  pushTextLine(input: SceneNodeTextLineInput): void;
}

export interface SceneNodePlugin {
  id: string;
  name: string;
  defaultName?: string;
  defaultColor?: ChalkColor;
  defaultProps?: Record<string, string | number | boolean>;
  snippet?: string;
  propFields?: readonly PropFieldDescriptor[];
  compose?(node: CustomSceneNode): SceneNode;
  measure?(
    node: CustomSceneNode,
    ctx: SceneNodeMeasureContext
  ): { width: number; height: number; payload?: unknown };
  compile?(
    positioned: PositionedSceneNode,
    helpers: SceneNodeCompileHelpers
  ): void;
  clipRay?(
    positioned: PositionedSceneNode,
    toward: Point,
    extraMargin: number
  ): Point;
}
