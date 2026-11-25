// AUTO-GENERATED SELF-CONTAINED PENOVA SKILL RUNNER
// Do not edit manually; regenerate via: npm run build:skill
// Zero external project or npm dependencies required.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { basename, join, resolve } from 'node:path';
import process from 'node:process';

// --- Types: src/model/scene.ts ---

type BuiltinThemeId = 'chalkboard' | 'whiteboard' | 'blueprint' | 'letter-paper';

type ThemeId = BuiltinThemeId | (string & {});

type BuiltinLayoutMode =
  | 'flow-horizontal'
  | 'flow-vertical'
  | 'mindmap'
  | 'concept-graph'
  | 'document'
  | 'freeform';

type LayoutMode = BuiltinLayoutMode | (string & {});

type BuiltinCameraMode =
  | 'auto-follow'
  | 'progressive-fit'
  | 'static-overview'
  | 'pen-follow';

type CameraMode = BuiltinCameraMode | (string & {});

type AspectRatio = '16:9' | '9:16';

type BuiltinHandStyle =
  | 'hand-chalk'
  | 'hand-minimal'
  | 'tip-only'
  | 'hidden';

type HandStyle = BuiltinHandStyle | (string & {});

type ChalkColor = 'white' | 'yellow' | 'cyan' | 'pink' | 'green' | 'orange';

type BuiltinNodeShape =
  | 'rounded'
  | 'circle'
  | 'cloud'
  | 'underline'
  | 'diamond'
  | 'divider'
  | 'none';

type NodeShape = BuiltinNodeShape | (string & {});

type TextAlign = 'left' | 'center' | 'right';

type BuiltinSceneNodeType = 'text' | 'shape' | 'connector' | 'group';

type CustomSceneNodeType = 'custom' | `custom:${string}`;

type SceneNodeType = BuiltinSceneNodeType | CustomSceneNodeType;

type CardRole = 'root' | 'step' | 'concept' | 'highlight' | 'note';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseSceneNode {
  id: string;
  name: string;
  color: ChalkColor;
  visible?: boolean;
  offset?: Point;
  meta?: Record<string, string | number | boolean | undefined>;
}

interface TextSceneNode extends BaseSceneNode {
  type: 'text';
  text: string;
  fontSize?: number;
  fontWeight?: 400 | 700;
  maxWidth?: number;
  align?: TextAlign;
  indentChars?: number;
}

interface ShapeSceneNode extends BaseSceneNode {
  type: 'shape';
  shape: NodeShape;
  width?: number;
  height?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
}

interface ConnectorSceneNode extends BaseSceneNode {
  type: 'connector';
  fromId?: string;
  toId?: string;
  fromPoint?: Point;
  toPoint?: Point;
  label?: string;
  style?: 'solid' | 'dashed';
}

interface GroupSceneNode extends BaseSceneNode {
  type: 'group';
  children: SceneNode[];
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
}

interface CustomSceneNode extends BaseSceneNode {
  type: CustomSceneNodeType;
  kind: string;
  props?: Record<string, string | number | boolean | undefined>;
}

type SceneNode =
  | TextSceneNode
  | ShapeSceneNode
  | ConnectorSceneNode
  | GroupSceneNode
  | CustomSceneNode;

interface TeachingStep {
  id: string;
  title: string;
  nodeIds: string[];
  pauseMs?: number;
}

type BuiltinTransitionId =
  | 'chalkboard-eraser'
  | 'page-turn'
  | 'crossfade'
  | 'cut';

type TransitionId = BuiltinTransitionId | (string & {});

interface SceneTransitionConfig {
  type: TransitionId;
  durationMs?: number;
}

interface LessonScene {
  id: string;
  title: string;
  theme: ThemeId;
  layoutMode: LayoutMode;
  cameraMode: CameraMode;
  aspectRatio: AspectRatio;
  handStyle: HandStyle;
  nodes: SceneNode[];
  customSteps?: TeachingStep[];
  transitionOut?: SceneTransitionConfig;
}

// --- Types: src/sdk/propSchema.ts ---

type PropPrimitiveType = 'string' | 'number' | 'boolean';

type BuiltInPropFormat =
  | 'plain'
  | 'multiline'
  | 'code'
  | 'svg'
  | 'icon-id'
  | 'enum'
  | 'color'
  | 'shape-id'
  | 'node-ref';

type PropDataFormat = BuiltInPropFormat | (string & {});

type PropValuesMap = Record<string, string | number | boolean | undefined>;

interface PropFieldDescriptor {
  readonly key: string;
  readonly type: PropPrimitiveType;
  readonly format?: PropDataFormat;
  readonly default?: string | number | boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly string[];
  readonly aliases?: readonly string[];
  readonly description?: string;
  readonly when?: (values: PropValuesMap) => boolean;
}

interface PropBuilderConfig<
  T extends PropPrimitiveType,
  V extends string | number | boolean = string | number | boolean,
> {
  readonly type: T;
  readonly format?: PropDataFormat;
  readonly default?: V;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly string[];
  readonly aliases?: readonly string[];
  readonly description?: string;
  readonly when?: (values: PropValuesMap) => boolean;
}

type PropSpecMap = Record<string, PropBuilderConfig<PropPrimitiveType>>;

type InferFieldValue<C> =
  C extends { readonly enumValues: readonly (infer E extends string)[] }
    ? C extends { readonly default: E }
      ? E
      : E | undefined
    : C extends { readonly type: 'string' }
    ? C extends { readonly default: string }
      ? string
      : string | undefined
    : C extends { readonly type: 'number' }
    ? C extends { readonly default: number }
      ? number
      : number | undefined
    : C extends { readonly type: 'boolean' }
    ? C extends { readonly default: boolean }
      ? boolean
      : boolean | undefined
    : unknown;

type InferPropValues<S extends PropSpecMap> = {
  [K in keyof S]: InferFieldValue<S[K]>;
};

interface DefinedPropSchema<S extends PropSpecMap> {
  readonly fields: readonly PropFieldDescriptor[];
  readonly defaults: Record<string, string | number | boolean>;
  resolve(rawProps?: Record<string, string | number | boolean | undefined>): InferPropValues<S>;
  readField<K extends keyof S & string>(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: K
  ): InferFieldValue<S[K]> | undefined;
  writeField(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: keyof S & string,
    value: string | number | boolean | undefined
  ): Record<string, string | number | boolean | undefined>;
  resetField(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: keyof S & string
  ): Record<string, string | number | boolean | undefined>;
}

// --- Types: src/sdk/strokePath.ts ---

interface StrokePath {
  id: string;
  points: Point[];
  width: number;
  color: ChalkColor;
  opacity: number;
  fillOpacity?: number;
  surfaceShadow?: boolean;
  dashed?: boolean;
  speedFactor?: number;
  totalLength: number;
  cumLengths: number[];
}

// --- Types: src/plugins/contracts.ts ---

interface ThemePalette {
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

interface MeasuredTextNode {
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

interface MeasuredShapeNode {
  type: 'shape';
  width: number;
  height: number;
  padX: number;
  padY: number;
  textOffsetY?: number;
}

interface MeasuredConnectorNode {
  type: 'connector';
  width: number;
  height: number;
}

interface MeasuredGroupNode {
  type: 'group';
  width: number;
  height: number;
  primaryShape?: NodeShape;
  textOffsetY?: number;
  childMeasurements: Map<string, MeasuredSceneNode>;
}

interface MeasuredCustomNode {
  type: 'custom';
  kind: string;
  width: number;
  height: number;
  composedNode?: SceneNode;
  composedMeasured?: MeasuredSceneNode;
  payload?: unknown;
}

type MeasuredSceneNode =
  | MeasuredTextNode
  | MeasuredShapeNode
  | MeasuredConnectorNode
  | MeasuredGroupNode
  | MeasuredCustomNode;

interface PositionedSceneNode {
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

interface GroupBox {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: ChalkColor;
}

interface ComputedLayout {
  nodes: PositionedSceneNode[];
  nodeMap: Map<string, PositionedSceneNode>;
  zones: GroupBox[];
  bounds: Rect;
}

interface SceneTextCodec {
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

interface ShapeRenderInput {
  id: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  color: ChalkColor;
  emphasized?: boolean;
  dashed?: boolean;
}

interface ShapePlugin {
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

interface LayoutHelpers {
  measureNode(node: SceneNode): MeasuredSceneNode;
  positionGroupChildren(
    group: GroupSceneNode,
    cx: number,
    cy: number,
    measured: MeasuredGroupNode
  ): PositionedSceneNode[];
}

type LayoutIconKind =
  | 'flow-lr'
  | 'flow-tb'
  | 'mindmap'
  | 'concept-graph'
  | 'document'
  | 'freeform';

interface LayoutPlugin {
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

interface PresentationSoundProfile {
  baseFreqHz: number;
  velocityFreqBoostHz: number;
  baseGain: number;
}

interface PresentationPlugin {
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

interface GlyphStrokeSegment {
  points: Point[];
  length: number;
}

interface GlyphProviderContext {
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

interface GlyphProviderPlugin {
  id: string;
  name: string;
  priority: number;
  resolveStrokes(ctx: GlyphProviderContext): GlyphStrokeSegment[] | null;
}

interface HandRenderContext {
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

interface HandPlugin {
  id: string;
  name: string;
  draw(context: HandRenderContext): void;
}

interface CameraState {
  cx: number;
  cy: number;
  zoom: number;
}

interface CameraStepSummary {
  startMs: number;
  drawStartMs: number;
  drawEndMs: number;
  endMs: number;
  focusBounds: Rect;
  cumulativeBounds: Rect;
}

interface CameraPenHint {
  visible: boolean;
  worldX: number;
  worldY: number;
  penDown: boolean;
}

interface CameraEvalContext {
  steps: CameraStepSummary[];
  outroStartMs: number;
  totalDurationMs: number;
  fullBounds: Rect;
  tMs: number;
  viewportW: number;
  viewportH: number;
  activePen?: CameraPenHint;
}

interface CameraPlugin {
  id: string;
  name: string;
  evaluate(ctx: CameraEvalContext): CameraState;
}

interface TransitionRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  progress: number;
  fromCanvas: HTMLCanvasElement;
  toCanvas: HTMLCanvasElement;
  fromScene: LessonScene;
  toScene: LessonScene;
}

interface TransitionPlugin {
  id: string;
  name: string;
  defaultDurationMs: number;
  render(context: TransitionRenderContext): void;
}

interface ExportFrameSource {
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

interface EvaluatedGlyphSnapshot {
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

interface EvaluatedTextLineSnapshot {
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

interface EvaluatedStrokeSnapshot {
  id: string;
  color: ChalkColor;
  colorHex: string;
  progress: number;
  stroke: StrokePath;
}

interface EvaluatedGroupFrameSnapshot {
  id: string;
  color: ChalkColor;
  colorHex: string;
  progress: number;
  stroke: StrokePath;
}

interface EvaluatedPenSnapshot {
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

interface EvaluatedSceneSnapshot {
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

interface EvaluatedTransitionSnapshot {
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

type EvaluatedFrameSnapshot =
  | EvaluatedSceneSnapshot
  | EvaluatedTransitionSnapshot;

interface ExportRunOptions {
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}

interface ExportOutput {
  blob: Blob;
  filename: string;
  mimeType: string;
  summary?: string;
}

interface ExportPlugin {
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

interface SceneNodeMeasureContext {
  measureNode(node: SceneNode): MeasuredSceneNode;
  measureText(text: string, font: string): number;
  fontFamily: string;
}

interface SceneNodeTextLineInput {
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

interface SceneNodeCompileHelpers {
  theme: ThemeId;
  fontFamily: string;
  pushStroke(stroke: StrokePath, gapAfterMs?: number): void;
  pushTextLine(input: SceneNodeTextLineInput): void;
}

interface SceneNodePlugin {
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

// --- Types: src/sdk/workflowDag.ts ---

interface WorkflowTraceEntry {
  nodeId: string;
  kind: 'atomic' | 'composite';
  durationMs: number;
}

interface WorkflowContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Map<string, WorkflowNode<any, any>>;
  trace?: WorkflowTraceEntry[];
}

interface WorkflowNode<I, O> {
  id: string;
  kind: 'atomic' | 'composite';
  run(input: I, ctx?: WorkflowContext): O;
}

interface DagNodeSpec {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: WorkflowNode<any, any>;
  from: string[];
}

interface WorkflowGraphSpec {
  id: string;
  nodes: DagNodeSpec[];
  output: string;
}

// --- Types: src/sdk/sketchPipeline.ts ---

interface SketchRawPolyline {
  id: string;
  points: Point[];
  closed: boolean;
  colorHint?: ChalkColor;
  fill?: boolean;
}

interface SketchGrayBitmap {
  width: number;
  height: number;
  data: Uint8Array;
}

interface SketchBinaryMask {
  width: number;
  height: number;
  mask: Uint8Array;
}

type SketchAssetInput =
  | { kind: 'svg'; svgText: string }
  | { kind: 'bitmap'; bitmap: SketchGrayBitmap; threshold?: number; invert?: boolean };

interface SketchPipelineOptions {
  seed?: string;
  centerX?: number;
  centerY?: number;
  targetWidth?: number;
  targetHeight?: number;
  defaultColor?: ChalkColor;
  strokeWidth?: number;
  opacity?: number;
  wobbleAmp?: number;
  orderStrategy?: 'nearest-top-down' | 'longest-first' | 'preserve';
  fillClosedShapes?: boolean;
}

interface SketchPipelineRequest {
  asset: SketchAssetInput;
  options?: SketchPipelineOptions;
}

interface ExtractedSketchSvgPath {
  id: string;
  d: string;
  colorHint?: ChalkColor;
  fill: boolean;
}

interface SketchBitmapBranchInput {
  bitmap: SketchGrayBitmap;
  threshold?: number;
  invert?: boolean;
}

interface SketchPostProcessInput {
  polylines: SketchRawPolyline[];
  options: SketchPipelineOptions;
}

// --- Types: src/model/builders.ts ---

interface CardSummary {
  label: string;
  subtitle?: string;
  role: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  icon?: string;
  zone?: string;
  say?: string;
  pause?: number;
}

// --- Types: src/plugins/codecs/scriptParser.ts ---

interface ParsedMetaBlock {
  color?: ChalkColor;
  shape?: NodeShape;
  icon?: string;
  zone?: string;
  role?: CardRole;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  align?: TextAlign;
  bold?: boolean;
  maxWidth?: number;
  indentChars?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
  say?: string;
  pause?: number;
  props?: Record<string, string | number | boolean>;
}

interface NodeDraft {
  id: string;
  explicitId?: string;
  draftType: 'card' | 'text' | 'shape' | 'custom' | 'group';
  label: string;
  subtitle?: string;
  role: CardRole;
  explicitRole?: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  icon?: string;
  zone?: string;
  say?: string;
  pause?: number;
  offset?: Point;
  width?: number;
  height?: number;
  fontSize?: number;
  align?: TextAlign;
  bold?: boolean;
  maxWidth?: number;
  indentChars?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
  childrenDrafts?: NodeDraft[];
  customKind?: string;
  customProps?: Record<string, string | number | boolean | undefined>;
}

// --- Types: src/plugins/layouts/shared.ts ---

interface SplitSceneNodes {
  vertices: SceneNode[];
  ownerVertexIdMap: Map<string, string>;
  boundConnectors: ConnectorSceneNode[];
  unboundConnectors: ConnectorSceneNode[];
}

interface ObstacleAwareRouteOptions {
  preferredBow?: number;
  preferredSide?: -1 | 1;
  routedMidpoints?: Point[];
}

// --- Types: src/plugins/layouts/dagreFlow.ts ---

interface LayeredDagResult {
  positions: Map<string, Point>;
  ranks: Map<string, number>;
}

// --- Types: src/plugins/codecs/documentParser.ts ---

interface DocBlockMeta {
  color?: ChalkColor;
  align?: TextAlign;
  fontSize?: number;
  bold?: boolean;
  indentChars?: number;
  offset?: Point;
  say?: string;
  pause?: number;
}

// --- Types: src/sdk/surfaceCache.ts ---

type SurfacePainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => void;

// --- Types: src/plugins/glyphs/strokeOrderProvider.ts ---

type NormStroke = Array<[number, number]>;

// --- Types: src/plugins/hands/imageHandFactory.ts ---

interface ImageHandOptions {
  id: string;
  name: string;
  imageSrc: string;
  tipAnchorX: number;
  tipAnchorY: number;
  scale?: number;
}

// --- Types: src/plugins/exporters/helpers.ts ---

interface TarEntry {
  name: string;
  data: Uint8Array;
}

// --- Types: src/plugins/exporters/httpBridgeFactory.ts ---

type HttpBridgeFrameFormat = 'auto' | 'png-base64' | 'svg' | 'snapshot';

interface HttpBridgeExportConfig {
  id: string;
  name: string;
  shortLabel?: string;
  description?: string;
  endpointUrl: string;
  fps?: number;
  frameFormat?: HttpBridgeFrameFormat;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  mimeType?: string;
  ext?: string;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  encodeFrame?: (canvas: HTMLCanvasElement) => Promise<string>;
}

// --- Types: src/model/project.ts ---

interface SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

interface LessonProject {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  scenes: LessonScene[];
  subtitles?: SubtitleCue[];
  showSubtitles?: boolean;
}

// --- Types: src/engine/layout/textMeasure.ts ---

type MeasureTextFn = (text: string, font: string) => number;

// --- Types: src/engine/sketch/textStrokes.ts ---

interface GlyphStrokeData {
  char: string;
  fontSize: number;
  width: number;
  height: number;
  padX: number;
  advanceWidth: number;
  colorHex: string;
  segments: GlyphStrokeSegment[];
  totalLength: number;
  chalkCanvas?: HTMLCanvasElement;
}

// --- Types: src/engine/timeline/types.ts ---

interface CompiledGlyphSpan {
  char: string;
  boxX: number;
  boxY: number;
  glyph: GlyphStrokeData;
  startMs: number;
  endMs: number;
  startTip: Point;
  endTip: Point;
}

interface CompiledStrokeItem {
  kind: 'stroke';
  id: string;
  startMs: number;
  endMs: number;
  color: ChalkColor;
  stroke: StrokePath;
  startPoint: Point;
  endPoint: Point;
}

interface CompiledGroupFrameItem {
  kind: 'group-frame';
  id: string;
  startMs: number;
  endMs: number;
  color: ChalkColor;
  group: GroupBox;
  stroke: StrokePath;
  startPoint: Point;
  endPoint: Point;
}

interface CompiledTextLineItem {
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
}

type CompiledItem =
  | CompiledStrokeItem
  | CompiledGroupFrameItem
  | CompiledTextLineItem;

interface CompiledStep {
  stepIndex: number;
  step: TeachingStep;
  startMs: number;
  drawStartMs: number;
  drawEndMs: number;
  endMs: number;
  items: CompiledItem[];
  focusBounds: Rect;
  cumulativeBounds: Rect;
}

interface CompiledTimeline {
  steps: CompiledStep[];
  allItems: CompiledItem[];
  outroStartMs: number;
  totalDurationMs: number;
  layout: ComputedLayout;
  fullBounds: Rect;
}

interface PenState {
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

interface TimelineEvalState {
  tMs: number;
  activeStepIndex: number;
  itemProgress: Map<string, number>;
  pen: PenState;
}

// --- Types: src/engine/timeline/projectTimeline.ts ---

interface CompiledTransitionWindow {
  id: TransitionId;
  name: string;
  durationMs: number;
  startMs: number;
  endMs: number;
  fromSceneIndex: number;
  toSceneIndex: number;
}

interface CompiledSceneSegment {
  sceneIndex: number;
  scene: LessonScene;
  timeline: CompiledTimeline;
  startMs: number;
  endMs: number;
  transitionOut?: CompiledTransitionWindow;
}

interface CompiledProjectTimeline {
  project: LessonProject;
  segments: CompiledSceneSegment[];
  totalDurationMs: number;
}

type ProjectEvalState =
  | {
      kind: 'scene';
      sceneIndex: number;
      segment: CompiledSceneSegment;
      localTMs: number;
      globalTMs: number;
    }
  | {
      kind: 'transition';
      fromSegment: CompiledSceneSegment;
      toSegment: CompiledSceneSegment;
      transitionId: TransitionId;
      transitionName: string;
      progress: number;
      globalTMs: number;
    };

// --- Types: src/engine/parser/projectScript.ts ---

interface ParseProjectScriptOptions {
  fallbackTitle?: string;
  fallbackAspectRatio?: AspectRatio;
}

interface ParseProjectScriptResult {
  project: LessonProject;
  warnings: string[];
  autoSubtitles: boolean;
}

interface RawSceneSection {
  explicitTitle?: string;
  lines: string[];
}

// --- Types: src/engine/render/chalkHand.ts ---

interface WritingHandMotion {
  penDown?: boolean;
  velocity?: number;
  tMs?: number;
}

// --- Types: src/engine/render/sceneRenderer.ts ---

interface RenderOptions {
  manualCamera?: CameraState | null;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  showUiOverlays?: boolean;
}

// --- Types: src/engine/render/projectRenderer.ts ---

interface EndpointCacheKey {
  timeline: CompiledTimeline;
  scene: LessonScene;
  pixelW: number;
  pixelH: number;
  dpr: number;
}

interface EndpointBufferSlot {
  canvas: HTMLCanvasElement | null;
  key: EndpointCacheKey | null;
}

interface ProjectRenderOptions extends RenderOptions {
  dpr?: number;
}

// --- Types: src/engine/export/videoExporter.ts ---

interface ExportVideoOptions {
  fps?: number;
  exporterId?: string;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}

interface ExportScriptOptions extends ParseProjectScriptOptions {
  fps?: number;
  exporterId?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

interface ExportScriptResult extends ExportOutput {
  project: LessonProject;
  warnings: string[];
  subtitlesSrt: string;
}

type ExportVideoResult = ExportOutput;

// --- Types: src/model/projectStorage.ts ---

interface SerializedProjectFile {
  format: 'penova-project' | 'pencil-project';
  version: number;
  exportedAt: string;
  project: LessonProject;
}

// --- Module: src/model/scene.ts ---
const { isCustomSceneNode, resolveCustomNodeKind, cloneSceneNode, findNodeById, deriveTeachingSteps } = (() => {
  function isCustomSceneNode(node: SceneNode): node is CustomSceneNode {
    return (
      node.type !== 'text' &&
      node.type !== 'shape' &&
      node.type !== 'connector' &&
      node.type !== 'group'
    );
  }
  function resolveCustomNodeKind(node: CustomSceneNode): string {
    if (node.kind && node.kind.trim()) return node.kind.trim();
    return node.type.startsWith('custom:')
      ? node.type.slice('custom:'.length)
      : node.type;
  }
  function cloneSceneNode(node: SceneNode): SceneNode {
    const baseCopy = {
      ...node,
      offset: node.offset ? { ...node.offset } : undefined,
      meta: node.meta ? { ...node.meta } : undefined,
    };
    if (baseCopy.type === 'group') {
      return {
        ...baseCopy,
        children: baseCopy.children.map(cloneSceneNode),
      };
    }
    if (baseCopy.type === 'connector') {
      return {
        ...baseCopy,
        fromPoint: baseCopy.fromPoint ? { ...baseCopy.fromPoint } : undefined,
        toPoint: baseCopy.toPoint ? { ...baseCopy.toPoint } : undefined,
      };
    }
    if (isCustomSceneNode(baseCopy)) {
      return {
        ...baseCopy,
        props: baseCopy.props ? { ...baseCopy.props } : undefined,
      };
    }
    return baseCopy;
  }
  function findNodeById(
    nodes: SceneNode[],
    id: string
  ): SceneNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === 'group') {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }
  function collectSubtreeIds(node: SceneNode, target: Set<string>): void {
    target.add(node.id);
    if (node.type === 'group') {
      for (const child of node.children) {
        collectSubtreeIds(child, target);
      }
    }
  }
  function updateNodeInTree(
    nodes: SceneNode[],
    id: string,
    updater: (node: SceneNode) => SceneNode
  ): SceneNode[] {
    let changed = false;
    const next = nodes.map((node) => {
      if (node.id === id) {
        changed = true;
        return updater(node);
      }
      if (node.type === 'group') {
        const nextChildren = updateNodeInTree(node.children, id, updater);
        if (nextChildren !== node.children) {
          changed = true;
          if ((node.arrange ?? 'card') === 'card') {
            const prevTitle = node.children.find(
              (c): c is TextSceneNode => c.type === 'text'
            );
            const nextTitle = nextChildren.find(
              (c): c is TextSceneNode => c.type === 'text'
            );
            if (nextTitle) {
              const nameChanged =
                prevTitle?.text !== nextTitle.text ? nextTitle.text : node.name;
              const colorChanged =
                prevTitle?.color !== nextTitle.color &&
                node.color === prevTitle?.color;
              const syncedColor = colorChanged ? nextTitle.color : node.color;
              const syncedChildren = colorChanged
                ? nextChildren.map((child) =>
                    child.type === 'shape' &&
                    (child.fitMode ?? 'auto-group') === 'auto-group'
                      ? { ...child, color: syncedColor }
                      : child
                  )
                : nextChildren;
              return {
                ...node,
                name: nameChanged,
                color: syncedColor,
                children: syncedChildren,
              };
            }
          }
          return { ...node, children: nextChildren };
        }
      }
      return node;
    });
    return changed ? next : nodes;
  }
  function removeNodeWithSet(
    nodes: SceneNode[],
    removedIds: Set<string>
  ): SceneNode[] {
    const filtered: SceneNode[] = [];
    for (const node of nodes) {
      if (removedIds.has(node.id)) continue;
      if (
        node.type === 'connector' &&
        ((node.fromId && removedIds.has(node.fromId)) ||
          (node.toId && removedIds.has(node.toId)))
      ) {
        continue;
      }
      if (node.type === 'group') {
        filtered.push({
          ...node,
          children: removeNodeWithSet(node.children, removedIds),
        });
      } else {
        filtered.push(node);
      }
    }
    return filtered;
  }
  function removeNodeInTree(nodes: SceneNode[], id: string): SceneNode[] {
    const removedIds = new Set<string>();
    const target = findNodeById(nodes, id);
    if (target) {
      collectSubtreeIds(target, removedIds);
    } else {
      removedIds.add(id);
    }
    return removeNodeWithSet(nodes, removedIds);
  }
  function moveNodeInTree(
    nodes: SceneNode[],
    id: string,
    delta: -1 | 1
  ): SceneNode[] {
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const target = idx + delta;
      if (target < 0 || target >= nodes.length) return nodes;
      const copy = [...nodes];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    }

    let changed = false;
    const next = nodes.map((node) => {
      if (node.type === 'group') {
        const nextChildren = moveNodeInTree(node.children, id, delta);
        if (nextChildren !== node.children) {
          changed = true;
          return { ...node, children: nextChildren };
        }
      }
      return node;
    });
    return changed ? next : nodes;
  }
  function addChildToGroup(
    nodes: SceneNode[],
    groupId: string,
    child: SceneNode
  ): SceneNode[] {
    return updateNodeInTree(nodes, groupId, (node) => {
      if (node.type !== 'group') return node;
      return {
        ...node,
        children: [...node.children, child],
      };
    });
  }
  function hasAnyOffset(nodes: SceneNode[]): boolean {
    for (const n of nodes) {
      if ((n.offset?.x ?? 0) !== 0 || (n.offset?.y ?? 0) !== 0) return true;
      if (n.type === 'group' && hasAnyOffset(n.children)) return true;
    }
    return false;
  }
  function clearAllOffsets(nodes: SceneNode[]): SceneNode[] {
    return nodes.map((n) => {
      if (n.type === 'group') {
        return {
          ...n,
          offset: undefined,
          children: clearAllOffsets(n.children),
        };
      }
      return { ...n, offset: undefined };
    });
  }
  /**
   * Derive classroom teaching order from unified SceneNode[] graph:
   * starts from root / zero-in-degree vertices, advancing via BFS + topological readiness
   * so each new step draws incoming bound connectors together with the newly revealed node.
   */
  function deriveTeachingSteps(scene: LessonScene): TeachingStep[] {
    if (scene.customSteps && scene.customSteps.length > 0) {
      return scene.customSteps;
    }

    const allVertexCandidates = scene.nodes.filter((n) => n.type !== 'connector');
    const ownerTopId = new Map<string, string>();
    const registerTopOwner = (node: SceneNode, topId: string) => {
      ownerTopId.set(node.id, topId);
      if (node.type === 'group') {
        for (const child of node.children) {
          if (child.type !== 'connector') {
            registerTopOwner(child, topId);
          }
        }
      }
    };
    for (const v of allVertexCandidates) {
      registerTopOwner(v, v.id);
    }

    const isBoundConnector = (n: SceneNode): n is ConnectorSceneNode =>
      n.type === 'connector' &&
      Boolean(n.fromId && n.toId) &&
      n.fromId !== n.toId &&
      ownerTopId.has(n.fromId!) &&
      ownerTopId.has(n.toId!);

    const boundConnectors = scene.nodes.filter(isBoundConnector);
    const vertices = scene.nodes.filter((n) => !isBoundConnector(n));

    const nodeMap = new Map<string, SceneNode>();
    const orderIndex = new Map<string, number>();
    vertices.forEach((node, idx) => {
      nodeMap.set(node.id, node);
      orderIndex.set(node.id, idx);
    });

    const outgoing = new Map<string, ConnectorSceneNode[]>();
    const incoming = new Map<string, ConnectorSceneNode[]>();
    const selfConnectors = new Map<string, ConnectorSceneNode[]>();
    const inDegree = new Map<string, number>();

    for (const node of vertices) {
      outgoing.set(node.id, []);
      incoming.set(node.id, []);
      selfConnectors.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const conn of boundConnectors) {
      const topFrom = ownerTopId.get(conn.fromId!)!;
      const topTo = ownerTopId.get(conn.toId!)!;
      if (topFrom === topTo) {
        selfConnectors.get(topFrom)?.push(conn);
      } else {
        outgoing.get(topFrom)?.push(conn);
        incoming.get(topTo)?.push(conn);
        inDegree.set(topTo, (inDegree.get(topTo) ?? 0) + 1);
      }
    }

    const visited = new Set<string>();
    const placedConnectors = new Set<string>();
    const steps: TeachingStep[] = [];

    const roots = vertices.filter((n) => n.meta?.role === 'root');
    const zeroIn = vertices.filter(
      (n) => n.meta?.role !== 'root' && (inDegree.get(n.id) ?? 0) === 0
    );
    const queue: string[] = [...roots.map((n) => n.id), ...zeroIn.map((n) => n.id)];

    if (queue.length === 0 && vertices.length > 0) {
      queue.push(vertices[0].id);
    }

    const emitVertexStep = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodeMap.get(nodeId)!;
      const stepConnIds: string[] = [];

      for (const conn of incoming.get(nodeId) ?? []) {
        const topFrom = ownerTopId.get(conn.fromId!)!;
        if (visited.has(topFrom) && !placedConnectors.has(conn.id)) {
          placedConnectors.add(conn.id);
          stepConnIds.push(conn.id);
        }
      }

      for (const conn of outgoing.get(nodeId) ?? []) {
        const topTo = ownerTopId.get(conn.toId!)!;
        if (visited.has(topTo) && !placedConnectors.has(conn.id)) {
          placedConnectors.add(conn.id);
          stepConnIds.push(conn.id);
        }
      }

      for (const conn of selfConnectors.get(nodeId) ?? []) {
        if (!placedConnectors.has(conn.id)) {
          placedConnectors.add(conn.id);
          stepConnIds.push(conn.id);
        }
      }

      const rawPause = node.meta?.pause;
      const pauseMs =
        typeof rawPause === 'number' && Number.isFinite(rawPause) && rawPause >= 0
          ? Math.round(rawPause)
          : undefined;

      steps.push({
        id: `step-${steps.length + 1}-${node.id}`,
        title: node.name || '节点',
        nodeIds: [...stepConnIds, node.id],
        ...(pauseMs !== undefined ? { pauseMs } : {}),
      });

      const nextNeighbors = (outgoing.get(nodeId) ?? [])
        .map((c) => ownerTopId.get(c.toId!)!)
        .filter((id) => !visited.has(id))
        .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

      for (const nextId of nextNeighbors) {
        if (!queue.includes(nextId)) {
          queue.push(nextId);
        }
      }
    };

    while (visited.size < vertices.length) {
      if (queue.length === 0) {
        const nextUnvisited = vertices.find((n) => !visited.has(n.id));
        if (!nextUnvisited) break;
        queue.push(nextUnvisited.id);
      }

      let pickIdx = queue.findIndex((id) => {
        if (visited.has(id)) return false;
        const preds = incoming.get(id) ?? [];
        return preds.every((c) => visited.has(ownerTopId.get(c.fromId!)!));
      });

      if (pickIdx === -1) {
        pickIdx = queue.findIndex((id) => !visited.has(id));
      }

      if (pickIdx === -1) {
        queue.length = 0;
        continue;
      }

      const [pickedId] = queue.splice(pickIdx, 1);
      emitVertexStep(pickedId);
    }

    const leftoverConnectors = boundConnectors.filter(
      (c) => !placedConnectors.has(c.id)
    );
    if (leftoverConnectors.length > 0) {
      if (steps.length > 0) {
        const last = steps[steps.length - 1];
        last.nodeIds = [...last.nodeIds, ...leftoverConnectors.map((c) => c.id)];
      } else {
        steps.push({
          id: 'step-connectors',
          title: '关联连线',
          nodeIds: leftoverConnectors.map((c) => c.id),
        });
      }
    }

    return steps;
  }
  return { isCustomSceneNode, resolveCustomNodeKind, cloneSceneNode, findNodeById, deriveTeachingSteps };
})();

// --- Module: src/sdk/propSchema.ts ---
const { prop, defineProps } = (() => {
  const prop = {
    string<
      const O extends Omit<PropBuilderConfig<'string', string>, 'type'> = Record<string, never>,
    >(opts: O = {} as O): { readonly type: 'string' } & O {
      return { type: 'string', ...opts };
    },
    number<
      const O extends Omit<PropBuilderConfig<'number', number>, 'type'> = Record<string, never>,
    >(opts: O = {} as O): { readonly type: 'number' } & O {
      return { type: 'number', ...opts };
    },
    boolean<
      const O extends Omit<PropBuilderConfig<'boolean', boolean>, 'type'> = Record<string, never>,
    >(opts: O = {} as O): { readonly type: 'boolean' } & O {
      return { type: 'boolean', ...opts };
    },
    enum<
      const T extends readonly string[],
      const O extends Omit<
        PropBuilderConfig<'string', T[number]>,
        'type' | 'format' | 'enumValues'
      > = Record<string, never>,
    >(
      values: T,
      opts: O = {} as O
    ): {
      readonly type: 'string';
      readonly format: 'enum';
      readonly enumValues: T;
    } & O {
      return {
        type: 'string',
        format: 'enum',
        enumValues: values,
        ...opts,
      };
    },
  };
  function shouldPreserveEmptyString(field: PropFieldDescriptor): boolean {
    return (
      field.type === 'string' &&
      (!field.enumValues || field.enumValues.length === 0) &&
      field.format !== 'icon-id' &&
      typeof field.default === 'string' &&
      field.default.length > 0
    );
  }
  function coerceFieldValue(
    field: PropFieldDescriptor,
    raw: unknown
  ): string | number | boolean | undefined {
    if (raw === undefined || raw === null) return undefined;

    if (field.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) return undefined;
      let clamped = n;
      if (field.min !== undefined) clamped = Math.max(field.min, clamped);
      if (field.max !== undefined) clamped = Math.min(field.max, clamped);
      return clamped;
    }

    if (field.type === 'boolean') {
      if (typeof raw === 'boolean') return raw;
      const lower = String(raw).trim().toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      return undefined;
    }

    const str = typeof raw === 'string' ? raw : String(raw);
    if (field.enumValues && field.enumValues.length > 0 && !field.enumValues.includes(str)) {
      return undefined;
    }
    return str;
  }
  /**
   * Symmetric read accessor (UI / Canvas / Script -> normalized explicit value).
   * Returns `undefined` when no explicit key or alias is present or valid.
   */
  function readPropBySchema(
    fields: readonly PropFieldDescriptor[],
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: string
  ): string | number | boolean | undefined {
    const field = fields.find((f) => f.key === key);
    if (!field || !rawProps) return undefined;

    const preserveEmpty = shouldPreserveEmptyString(field);
    const lookupKeys = [field.key, ...(field.aliases ?? [])];
    for (const k of lookupKeys) {
      if (!(k in rawProps)) continue;
      const val = rawProps[k];
      if (val === undefined || val === null) continue;
      if (val === '') {
        if (preserveEmpty) return '';
        continue;
      }
      const coerced = coerceFieldValue(field, val);
      if (coerced !== undefined) return coerced;
    }
    return undefined;
  }
  /**
   * Symmetric immutable write accessor (UI / Canvas / Script -> canonical `node.props`).
   * Normalizes aliases onto the canonical key and enforces min/max bounds.
   */
  function writePropBySchema(
    fields: readonly PropFieldDescriptor[],
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: string,
    value: string | number | boolean | undefined
  ): Record<string, string | number | boolean | undefined> {
    const nextProps: Record<string, string | number | boolean | undefined> = {
      ...(rawProps ?? {}),
    };
    const field = fields.find((f) => f.key === key);

    if (field) {
      for (const alias of field.aliases ?? []) {
        delete nextProps[alias];
      }
      const preserveEmpty = shouldPreserveEmptyString(field);
      if (value === undefined || (value === '' && !preserveEmpty)) {
        delete nextProps[key];
        return nextProps;
      }
      if (value === '' && preserveEmpty) {
        nextProps[key] = '';
        return nextProps;
      }
      const coerced = coerceFieldValue(field, value);
      if (coerced === undefined) {
        delete nextProps[key];
      } else {
        nextProps[key] = coerced;
      }
      return nextProps;
    }

    if (value === undefined || value === '') {
      delete nextProps[key];
    } else {
      nextProps[key] = value;
    }
    return nextProps;
  }
  /**
   * Compiles a declarative property table into a single-source-of-truth
   * metadata descriptor + strongly typed read/write/reset helpers.
   */
  function defineProps<const S extends PropSpecMap>(
    spec: S
  ): DefinedPropSchema<S> {
    const fields: PropFieldDescriptor[] = [];
    const defaults: Record<string, string | number | boolean> = {};

    for (const [key, cfg] of Object.entries(spec)) {
      const desc: PropFieldDescriptor = {
        key,
        type: cfg.type,
        format: cfg.format,
        default: cfg.default,
        min: cfg.min,
        max: cfg.max,
        step: cfg.step,
        enumValues: cfg.enumValues,
        aliases: cfg.aliases,
        description: cfg.description,
        when: cfg.when,
      };
      fields.push(desc);
      if (cfg.default !== undefined) {
        defaults[key] = cfg.default;
      }
    }

    return {
      fields,
      defaults,
      resolve(rawProps) {
        const out: Record<string, string | number | boolean | undefined> = {};
        for (const field of fields) {
          const explicit = readPropBySchema(fields, rawProps, field.key);
          out[field.key] = explicit !== undefined ? explicit : field.default;
        }
        return out as InferPropValues<S>;
      },
      readField(rawProps, key) {
        return readPropBySchema(fields, rawProps, key) as
          | InferFieldValue<S[typeof key]>
          | undefined;
      },
      writeField(rawProps, key, value) {
        return writePropBySchema(fields, rawProps, key, value);
      },
      resetField(rawProps, key) {
        const field = fields.find((f) => f.key === key);
        return writePropBySchema(fields, rawProps, key, field?.default);
      },
    };
  }
  function isFieldVisible(
    field: PropFieldDescriptor,
    values: PropValuesMap
  ): boolean {
    return field.when ? field.when(values) : true;
  }
  function filterVisibleFields(
    fields: readonly PropFieldDescriptor[],
    values: PropValuesMap
  ): PropFieldDescriptor[] {
    return fields.filter((field) => isFieldVisible(field, values));
  }
  return { prop, defineProps };
})();

// --- Module: src/sdk/random.ts ---
const { hashString, hash2D, mulberry32 } = (() => {
  function hashString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  /**
   * Isotropic 2D integer avalanche hash (avoids linear modulo striping artifacts).
   */
  function hash2D(px: number, py: number, seed = 0): number {
    let hash =
      (Math.imul(px + 17, 374761393) ^
        Math.imul(py + 31, 668265263) ^
        seed) >>>
      0;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    hash ^= hash >>> 13;
    return hash >>> 0;
  }
  function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  return { hashString, hash2D, mulberry32 };
})();

// --- Module: src/sdk/strokePath.ts ---
const { buildStrokePath, samplePointAlongStroke, sketchSegment, sketchPolyline, buildRoundedRectPoints } = (() => {
  function buildStrokePath(
    id: string,
    points: Point[],
    options: {
      width: number;
      color: ChalkColor;
      opacity?: number;
      fillOpacity?: number;
      surfaceShadow?: boolean;
      dashed?: boolean;
      speedFactor?: number;
    }
  ): StrokePath {
    const safePts =
      points.length >= 2
        ? points
        : [points[0] ?? { x: 0, y: 0 }, points[0] ?? { x: 0, y: 0 }];
    const cumLengths: number[] = [0];
    let total = 0;

    for (let i = 1; i < safePts.length; i++) {
      total += Math.hypot(
        safePts[i].x - safePts[i - 1].x,
        safePts[i].y - safePts[i - 1].y
      );
      cumLengths.push(total);
    }

    return {
      id,
      points: safePts,
      width: options.width,
      color: options.color,
      opacity: options.opacity ?? 0.94,
      fillOpacity: options.fillOpacity,
      surfaceShadow: options.surfaceShadow,
      dashed: options.dashed,
      speedFactor: options.speedFactor ?? 1,
      totalLength: total,
      cumLengths,
    };
  }
  function samplePointAlongStroke(
    stroke: StrokePath,
    progress: number
  ): Point {
    const clamped = Math.max(0, Math.min(1, progress));
    const pts = stroke.points;
    if (pts.length === 0) return { x: 0, y: 0 };
    if (clamped <= 0) return pts[0];
    if (clamped >= 1 || stroke.totalLength <= 1e-4) return pts[pts.length - 1];

    const target = clamped * stroke.totalLength;
    const cum = stroke.cumLengths;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= target) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const segLen = cum[lo + 1] - cum[lo];
    const frac = segLen > 1e-5 ? (target - cum[lo]) / segLen : 0;
    return {
      x: pts[lo].x + (pts[lo + 1].x - pts[lo].x) * frac,
      y: pts[lo].y + (pts[lo + 1].y - pts[lo].y) * frac,
    };
  }
  function sketchSegment(
    a: Point,
    b: Point,
    rand: () => number,
    wobbleAmp = 1.6,
    stepSize = 14
  ): Point[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) return [a, b];

    const steps = Math.max(3, Math.ceil(len / stepSize));
    const nx = -dy / len;
    const ny = dx / len;
    const bow = (rand() - 0.5) * wobbleAmp * 1.4;
    const phase = rand() * Math.PI * 2;
    const pts: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const envelope = Math.sin(t * Math.PI);
      const wave =
        bow * envelope +
        Math.sin(t * Math.PI * 2.5 + phase) * wobbleAmp * 0.45 * envelope +
        (rand() - 0.5) * wobbleAmp * 0.45 * envelope;
      pts.push({
        x: a.x + dx * t + nx * wave,
        y: a.y + dy * t + ny * wave,
      });
    }
    return pts;
  }
  function sketchPolyline(
    points: Point[],
    seedStr: string,
    wobbleAmp = 1.4
  ): Point[] {
    if (points.length < 2) return points;
    const rand = mulberry32(hashString(seedStr));
    const out: Point[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const seg = sketchSegment(points[i], points[i + 1], rand, wobbleAmp, 12);
      if (i === 0) {
        out.push(...seg);
      } else {
        out.push(...seg.slice(1));
      }
    }
    return out;
  }
  function buildRoundedRectPoints(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    rand: () => number,
    overshoot = 4
  ): Point[] {
    const r = Math.min(radius, w * 0.25, h * 0.35);
    const corners: Point[] = [];
    const arcSteps = 5;

    const addArc = (cx: number, cy: number, startAng: number, endAng: number) => {
      for (let i = 0; i <= arcSteps; i++) {
        const a = startAng + ((endAng - startAng) * i) / arcSteps;
        corners.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    };

    addArc(x + w - r, y + r, -Math.PI / 2, 0);
    addArc(x + w - r, y + h - r, 0, Math.PI / 2);
    addArc(x + r, y + h - r, Math.PI / 2, Math.PI);
    addArc(x + r, y + r, Math.PI, Math.PI * 1.5);

    const startPt = { x: x + r - overshoot * 0.5, y: y + (rand() - 0.5) * 1.5 };
    const endPt = { x: x + r + overshoot, y: y + (rand() - 0.5) * 1.8 };
    const baseLoop = [startPt, ...corners, endPt];

    const out: Point[] = [];
    for (let i = 0; i < baseLoop.length - 1; i++) {
      const seg = sketchSegment(baseLoop[i], baseLoop[i + 1], rand, 1.15, 16);
      if (i === 0) out.push(...seg);
      else out.push(...seg.slice(1));
    }
    return out;
  }
  return { buildStrokePath, samplePointAlongStroke, sketchSegment, sketchPolyline, buildRoundedRectPoints };
})();

// --- Module: src/plugins/registry.ts ---
const { layoutRegistry, presentationRegistry, shapeRegistry, glyphProviderRegistry, handRegistry, cameraRegistry, transitionRegistry, exportRegistry, sceneNodeRegistry } = (() => {
  class PluginRegistry<T extends { id: string }> {
    private readonly items = new Map<string, T>();
    private readonly listeners = new Set<() => void>();
    private readonly kindLabel: string;
    private cachedList: T[] | null = null;

    constructor(kindLabel: string) {
      this.kindLabel = kindLabel;
    }

    public register(plugin: T, options?: { override?: boolean }): void {
      if (this.items.has(plugin.id) && !options?.override) {
        throw new Error(
          `Duplicate ${this.kindLabel} plugin id "${plugin.id}". Pass { override: true } to replace it.`
        );
      }
      this.items.set(plugin.id, plugin);
      this.notifyChanged();
    }

    public unregister(id: string): boolean {
      const deleted = this.items.delete(id);
      if (deleted) {
        this.notifyChanged();
      }
      return deleted;
    }

    public get(id: string): T | undefined {
      return this.items.get(id);
    }

    public getOrDefault(id: string): T {
      const exact = this.items.get(id);
      if (exact) return exact;
      const first = this.items.values().next().value;
      if (!first) {
        throw new Error(
          `${this.kindLabel} registry is empty; ensure built-in plugins are registered.`
        );
      }
      return first;
    }

    public has(id: string): boolean {
      return this.items.has(id);
    }

    public list(): T[] {
      if (!this.cachedList) {
        this.cachedList = Array.from(this.items.values());
      }
      return this.cachedList;
    }

    public subscribe(listener: () => void): () => void {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }

    public notifyChanged(): void {
      this.cachedList = null;
      for (const listener of this.listeners) {
        listener();
      }
    }
  }
  const layoutRegistry = new PluginRegistry<LayoutPlugin>('layout');
  const presentationRegistry = new PluginRegistry<PresentationPlugin>(
    'presentation'
  );
  const shapeRegistry = new PluginRegistry<ShapePlugin>('shape');
  const glyphProviderRegistry = new PluginRegistry<GlyphProviderPlugin>(
    'glyph-provider'
  );
  const handRegistry = new PluginRegistry<HandPlugin>('hand');
  const cameraRegistry = new PluginRegistry<CameraPlugin>('camera');
  const transitionRegistry = new PluginRegistry<TransitionPlugin>(
    'transition'
  );
  const exportRegistry = new PluginRegistry<ExportPlugin>('export');
  const sceneNodeRegistry = new PluginRegistry<SceneNodePlugin>(
    'scene-node'
  );
  return { layoutRegistry, presentationRegistry, shapeRegistry, glyphProviderRegistry, handRegistry, cameraRegistry, transitionRegistry, exportRegistry, sceneNodeRegistry };
})();

// --- Module: src/sdk/workflowDag.ts ---
const { GRAPH_INPUT_ID, createAtomicNode, compileWorkflowGraph } = (() => {
  const GRAPH_INPUT_ID = '__input__';
  function createAtomicNode<I, O>(
    id: string,
    fn: (input: I, ctx?: WorkflowContext) => O
  ): WorkflowNode<I, O> {
    const self: WorkflowNode<I, O> = {
      id,
      kind: 'atomic',
      run(input: I, ctx?: WorkflowContext): O {
        const target = ctx?.overrides?.get(id) as WorkflowNode<I, O> | undefined;
        if (target && target !== self) {
          const nextOverrides = new Map(ctx!.overrides);
          nextOverrides.delete(id);
          return target.run(input, { ...ctx, overrides: nextOverrides });
        }
        const start = performance.now();
        const out = fn(input, ctx);
        if (ctx?.trace) {
          ctx.trace.push({
            nodeId: id,
            kind: 'atomic',
            durationMs: Math.max(0, performance.now() - start),
          });
        }
        return out;
      },
    };
    return self;
  }
  /**
   * Compiles a declarative recursive DAG specification into a composable WorkflowNode.
   * Validates upstream bindings and detects cycles at compile time via Kahn topological sort.
   */
  function compileWorkflowGraph<I, O>(
    spec: WorkflowGraphSpec
  ): WorkflowNode<I, O> {
    const nodeMap = new Map<string, DagNodeSpec>();
    for (const item of spec.nodes) {
      if (item.id === GRAPH_INPUT_ID) {
        throw new Error(`Workflow "${spec.id}": reserved node id "${GRAPH_INPUT_ID}"`);
      }
      if (nodeMap.has(item.id)) {
        throw new Error(`Workflow "${spec.id}": duplicate node id "${item.id}"`);
      }
      nodeMap.set(item.id, item);
    }

    if (!nodeMap.has(spec.output)) {
      throw new Error(
        `Workflow "${spec.id}": output node "${spec.output}" does not exist`
      );
    }

    const dependents = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const item of spec.nodes) {
      dependents.set(item.id, []);
      inDegree.set(item.id, 0);
    }

    for (const item of spec.nodes) {
      const seenUp = new Set<string>();
      for (const up of item.from) {
        if (up === GRAPH_INPUT_ID) continue;
        if (!nodeMap.has(up)) {
          throw new Error(
            `Workflow "${spec.id}": node "${item.id}" depends on unknown node "${up}"`
          );
        }
        if (!seenUp.has(up)) {
          seenUp.add(up);
          dependents.get(up)!.push(item.id);
          inDegree.set(item.id, (inDegree.get(item.id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const item of spec.nodes) {
      if ((inDegree.get(item.id) ?? 0) === 0) {
        queue.push(item.id);
      }
    }

    const sortedOrder: DagNodeSpec[] = [];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      sortedOrder.push(nodeMap.get(currId)!);
      for (const nextId of dependents.get(currId) ?? []) {
        const rem = (inDegree.get(nextId) ?? 0) - 1;
        inDegree.set(nextId, rem);
        if (rem === 0) {
          queue.push(nextId);
        }
      }
    }

    if (sortedOrder.length !== spec.nodes.length) {
      throw new Error(
        `Workflow "${spec.id}": cyclic dependency detected in DAG specification`
      );
    }

    return {
      id: spec.id,
      kind: 'composite',
      run(input: I, ctx?: WorkflowContext): O {
        const start = performance.now();
        const results = new Map<string, unknown>();
        results.set(GRAPH_INPUT_ID, input);

        for (const step of sortedOrder) {
          let stepInput: unknown;
          if (step.from.length === 0) {
            stepInput = undefined;
          } else if (step.from.length === 1) {
            stepInput = results.get(step.from[0]);
          } else {
            const bundled: Record<string, unknown> = {};
            for (const up of step.from) {
              bundled[up] = results.get(up);
            }
            stepInput = bundled;
          }

          const overrideNode = ctx?.overrides?.get(step.id);
          let stepOut: unknown;
          if (overrideNode && overrideNode !== step.node) {
            const nextOverrides = new Map(ctx!.overrides);
            nextOverrides.delete(step.id);
            stepOut = overrideNode.run(stepInput, { ...ctx, overrides: nextOverrides });
          } else {
            stepOut = step.node.run(stepInput, ctx);
          }
          results.set(step.id, stepOut);
        }

        if (ctx?.trace) {
          ctx.trace.push({
            nodeId: spec.id,
            kind: 'composite',
            durationMs: Math.max(0, performance.now() - start),
          });
        }

        return results.get(spec.output) as O;
      },
    };
  }
  return { GRAPH_INPUT_ID, createAtomicNode, compileWorkflowGraph };
})();

// --- Module: src/sdk/sketchPipeline.ts ---
const { sketchPipeline, getSketchIconSvg } = (() => {
  function mapSvgStrokeColorHint(raw?: string): ChalkColor | undefined {
    if (!raw) return undefined;
    const v = raw.trim().toLowerCase();
    if (!v || v === 'none' || v === 'transparent') return undefined;
    if (
      v === 'white' ||
      v === 'yellow' ||
      v === 'cyan' ||
      v === 'pink' ||
      v === 'green' ||
      v === 'orange'
    ) {
      return v;
    }
    if (v.includes('gold') || v.includes('amber')) return 'yellow';
    if (v.includes('blue') || v.includes('cyan') || v.includes('sky')) return 'cyan';
    if (v.includes('red') || v.includes('pink') || v.includes('rose')) return 'pink';
    if (v.includes('green') || v.includes('emerald') || v.includes('mint')) return 'green';
    if (v.includes('orange')) return 'orange';
    return undefined;
  }
  function readSvgAttr(tag: string, name: string): string | undefined {
    const re = new RegExp(`(?:^|[\\s<])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
    const m = tag.match(re);
    return m ? m[1] ?? m[2] : undefined;
  }
  function readSvgNum(tag: string, name: string, fallback = 0): number {
    const raw = readSvgAttr(tag, name);
    if (!raw) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  function stripHiddenSvgBlocks(svgText: string): string {
    return svgText
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(defs|clipPath|mask|symbol)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  }
  function extractSvgPrimitivesFn(svgText: string): ExtractedSketchSvgPath[] {
    const out: ExtractedSketchSvgPath[] = [];
    const cleanedSvg = stripHiddenSvgBlocks(svgText);
    const tagRe = /<(path|line|rect|circle|ellipse|polyline|polygon)\b([^>]*?)\/?>/gi;
    let match: RegExpExecArray | null;
    let seq = 0;

    while ((match = tagRe.exec(cleanedSvg)) !== null) {
      const tagName = match[1].toLowerCase();
      const attrs = match[2];
      const id = readSvgAttr(attrs, 'id') ?? `svg-${tagName}-${seq++}`;
      const strokeAttr = readSvgAttr(attrs, 'stroke');
      const fillAttr = readSvgAttr(attrs, 'fill');
      const fillNorm = fillAttr?.trim().toLowerCase();
      const fill = fillNorm !== 'none' && fillNorm !== 'transparent';
      const colorHint = mapSvgStrokeColorHint(strokeAttr);

      if (tagName === 'path') {
        const d = readSvgAttr(attrs, 'd');
        if (d && d.trim()) out.push({ id, d, colorHint, fill });
        continue;
      }

      if (tagName === 'line') {
        const x1 = readSvgNum(attrs, 'x1');
        const y1 = readSvgNum(attrs, 'y1');
        const x2 = readSvgNum(attrs, 'x2');
        const y2 = readSvgNum(attrs, 'y2');
        out.push({ id, d: `M ${x1} ${y1} L ${x2} ${y2}`, colorHint, fill: false });
        continue;
      }

      if (tagName === 'rect') {
        const x = readSvgNum(attrs, 'x');
        const y = readSvgNum(attrs, 'y');
        const w = readSvgNum(attrs, 'width');
        const h = readSvgNum(attrs, 'height');
        if (w <= 0 || h <= 0) continue;
        let rx = readSvgNum(attrs, 'rx', readSvgNum(attrs, 'ry', 0));
        let ry = readSvgNum(attrs, 'ry', rx);
        rx = Math.max(0, Math.min(rx, w / 2));
        ry = Math.max(0, Math.min(ry, h / 2));
        const d =
          rx > 0.2 || ry > 0.2
            ? `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} L ${x + w} ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} L ${x + rx} ${y + h} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} L ${x} ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
            : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        out.push({ id, d, colorHint, fill });
        continue;
      }

      if (tagName === 'circle' || tagName === 'ellipse') {
        const cx = readSvgNum(attrs, 'cx');
        const cy = readSvgNum(attrs, 'cy');
        const rx =
          tagName === 'circle' ? readSvgNum(attrs, 'r') : readSvgNum(attrs, 'rx');
        const ry = tagName === 'circle' ? rx : readSvgNum(attrs, 'ry', rx);
        if (rx <= 0 || ry <= 0) continue;
        const d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
        out.push({ id, d, colorHint, fill });
        continue;
      }

      if (tagName === 'polyline' || tagName === 'polygon') {
        const rawPts = readSvgAttr(attrs, 'points') ?? '';
        const nums = rawPts
          .trim()
          .split(/[\s,]+/)
          .map(Number)
          .filter(Number.isFinite);
        if (nums.length < 4) continue;
        const segs = [`M ${nums[0]} ${nums[1]}`];
        for (let i = 2; i + 1 < nums.length; i += 2) {
          segs.push(`L ${nums[i]} ${nums[i + 1]}`);
        }
        if (tagName === 'polygon') segs.push('Z');
        out.push({ id, d: segs.join(' '), colorHint, fill });
      }
    }

    return out;
  }
  function sampleSvgArc(
    p0: Point,
    rxRaw: number,
    ryRaw: number,
    angleDeg: number,
    largeArcFlag: number,
    sweepFlag: number,
    p1: Point
  ): Point[] {
    if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1e-5) return [];
    if (rxRaw === 0 || ryRaw === 0) return [p1];

    let rx = Math.abs(rxRaw);
    let ry = Math.abs(ryRaw);
    const phi = (angleDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const dx2 = (p0.x - p1.x) / 2;
    const dy2 = (p0.y - p1.y) / 2;
    const x1p = cosPhi * dx2 + sinPhi * dy2;
    const y1p = -sinPhi * dx2 + cosPhi * dy2;

    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
      const scale = Math.sqrt(lambda);
      rx *= scale;
      ry *= scale;
    }

    const rx2 = rx * rx;
    const ry2 = ry * ry;
    const x1p2 = x1p * x1p;
    const y1p2 = y1p * y1p;
    const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
    const den = rx2 * y1p2 + ry2 * x1p2;
    const coef =
      (largeArcFlag !== sweepFlag ? 1 : -1) *
      (den > 1e-9 ? Math.sqrt(num / den) : 0);

    const cxp = coef * ((rx * y1p) / ry);
    const cyp = coef * (-(ry * x1p) / rx);

    const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

    const vecAngle = (ux: number, uy: number, vx: number, vy: number) => {
      const dot = ux * vx + uy * vy;
      const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
      const ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
      return ux * vy - uy * vx < 0 ? -ang : ang;
    };

    const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dTheta = vecAngle(
      (x1p - cxp) / rx,
      (y1p - cyp) / ry,
      (-x1p - cxp) / rx,
      (-y1p - cyp) / ry
    );
    if (!sweepFlag && dTheta > 0) dTheta -= Math.PI * 2;
    if (sweepFlag && dTheta < 0) dTheta += Math.PI * 2;

    const steps = Math.max(8, Math.ceil((Math.abs(dTheta) / (Math.PI * 2)) * 28));
    const pts: Point[] = [];
    for (let i = 1; i <= steps; i++) {
      const t = theta1 + (dTheta * i) / steps;
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      pts.push({
        x: cx + cosPhi * rx * cosT - sinPhi * ry * sinT,
        y: cy + sinPhi * rx * cosT + cosPhi * ry * sinT,
      });
    }
    return pts;
  }
  function sampleSvgDToPolylines(
    baseId: string,
    d: string,
    colorHint?: ChalkColor,
    fill = false
  ): SketchRawPolyline[] {
    const polylines: SketchRawPolyline[] = [];
    let pos = 0;
    const len = d.length;
    let cmd = '';
    let cur: Point = { x: 0, y: 0 };
    let start: Point = { x: 0, y: 0 };
    let currentPts: Point[] = [];
    let lastCubicCtrl: Point | null = null;
    let lastQuadCtrl: Point | null = null;
    let subSeq = 0;

    const flushSubpath = (closed: boolean) => {
      if (currentPts.length >= 2) {
        polylines.push({
          id: subSeq === 0 ? baseId : `${baseId}-${subSeq}`,
          points: currentPts,
          closed,
          colorHint,
          fill,
        });
        subSeq++;
      }
      currentPts = [];
    };

    const skipSep = () => {
      while (pos < len) {
        const ch = d[pos];
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
          pos++;
        } else {
          break;
        }
      }
    };

    const numRe = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y;
    const hasNumberAhead = (): boolean => {
      skipSep();
      if (pos >= len) return false;
      numRe.lastIndex = pos;
      return numRe.test(d);
    };

    const readNumber = (): number | null => {
      skipSep();
      if (pos >= len) return null;
      numRe.lastIndex = pos;
      const m = numRe.exec(d);
      if (!m) return null;
      const n = Number.parseFloat(m[0]);
      if (!Number.isFinite(n)) return null;
      pos = numRe.lastIndex;
      return n;
    };

    const readFlag = (): number | null => {
      skipSep();
      if (pos >= len) return null;
      const ch = d[pos];
      if (ch === '0' || ch === '1') {
        pos++;
        return ch === '1' ? 1 : 0;
      }
      return null;
    };

    let abort = false;
    while (pos < len && !abort) {
      skipSep();
      if (pos >= len) break;

      if (/[MmLlHhVvQqTtCcSsAaZz]/.test(d[pos])) {
        cmd = d[pos++];
        if (cmd === 'Z' || cmd === 'z') {
          if (
            currentPts.length > 0 &&
            Math.hypot(cur.x - start.x, cur.y - start.y) > 0.5
          ) {
            currentPts.push({ ...start });
          }
          cur = { ...start };
          flushSubpath(true);
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          continue;
        }
      } else if (!cmd || !hasNumberAhead()) {
        pos++;
        continue;
      }

      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();

      if (C === 'M') {
        const rx = readNumber();
        const ry = readNumber();
        if (rx === null || ry === null) {
          abort = true;
          break;
        }
        flushSubpath(false);
        const x = rx + (rel ? cur.x : 0);
        const y = ry + (rel ? cur.y : 0);
        cur = { x, y };
        start = { x, y };
        currentPts = [{ x, y }];
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        cmd = rel ? 'l' : 'L';
      } else if (C === 'L') {
        while (hasNumberAhead()) {
          const rx = readNumber();
          const ry = readNumber();
          if (rx === null || ry === null) {
            abort = true;
            break;
          }
          const x = rx + (rel ? cur.x : 0);
          const y = ry + (rel ? cur.y : 0);
          cur = { x, y };
          currentPts.push({ x, y });
          lastCubicCtrl = null;
          lastQuadCtrl = null;
        }
      } else if (C === 'H') {
        while (hasNumberAhead()) {
          const rx = readNumber();
          if (rx === null) {
            abort = true;
            break;
          }
          const x = rx + (rel ? cur.x : 0);
          cur = { x, y: cur.y };
          currentPts.push({ ...cur });
          lastCubicCtrl = null;
          lastQuadCtrl = null;
        }
      } else if (C === 'V') {
        while (hasNumberAhead()) {
          const ry = readNumber();
          if (ry === null) {
            abort = true;
            break;
          }
          const y = ry + (rel ? cur.y : 0);
          cur = { x: cur.x, y };
          currentPts.push({ ...cur });
          lastCubicCtrl = null;
          lastQuadCtrl = null;
        }
      } else if (C === 'Q' || C === 'T') {
        while (hasNumberAhead()) {
          let cp: Point;
          if (C === 'Q') {
            const cx1 = readNumber();
            const cy1 = readNumber();
            if (cx1 === null || cy1 === null) {
              abort = true;
              break;
            }
            cp = {
              x: cx1 + (rel ? cur.x : 0),
              y: cy1 + (rel ? cur.y : 0),
            };
          } else {
            cp = lastQuadCtrl
              ? { x: 2 * cur.x - lastQuadCtrl.x, y: 2 * cur.y - lastQuadCtrl.y }
              : { ...cur };
          }
          const rx2 = readNumber();
          const ry2 = readNumber();
          if (rx2 === null || ry2 === null) {
            abort = true;
            break;
          }
          const p2 = {
            x: rx2 + (rel ? cur.x : 0),
            y: ry2 + (rel ? cur.y : 0),
          };
          const p0 = { ...cur };
          const steps = 10;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            currentPts.push({
              x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p2.x,
              y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p2.y,
            });
          }
          cur = p2;
          lastQuadCtrl = cp;
          lastCubicCtrl = null;
        }
      } else if (C === 'C' || C === 'S') {
        while (hasNumberAhead()) {
          let c1: Point;
          if (C === 'C') {
            const cx1 = readNumber();
            const cy1 = readNumber();
            if (cx1 === null || cy1 === null) {
              abort = true;
              break;
            }
            c1 = {
              x: cx1 + (rel ? cur.x : 0),
              y: cy1 + (rel ? cur.y : 0),
            };
          } else {
            c1 = lastCubicCtrl
              ? { x: 2 * cur.x - lastCubicCtrl.x, y: 2 * cur.y - lastCubicCtrl.y }
              : { ...cur };
          }
          const cx2 = readNumber();
          const cy2 = readNumber();
          const rx3 = readNumber();
          const ry3 = readNumber();
          if (cx2 === null || cy2 === null || rx3 === null || ry3 === null) {
            abort = true;
            break;
          }
          const c2 = {
            x: cx2 + (rel ? cur.x : 0),
            y: cy2 + (rel ? cur.y : 0),
          };
          const p3 = {
            x: rx3 + (rel ? cur.x : 0),
            y: ry3 + (rel ? cur.y : 0),
          };
          const p0 = { ...cur };
          const steps = 12;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            currentPts.push({
              x:
                mt * mt * mt * p0.x +
                3 * mt * mt * t * c1.x +
                3 * mt * t * t * c2.x +
                t * t * t * p3.x,
              y:
                mt * mt * mt * p0.y +
                3 * mt * mt * t * c1.y +
                3 * mt * t * t * c2.y +
                t * t * t * p3.y,
            });
          }
          cur = p3;
          lastCubicCtrl = c2;
          lastQuadCtrl = null;
        }
      } else if (C === 'A') {
        while (hasNumberAhead()) {
          const rx = readNumber();
          const ry = readNumber();
          const rot = readNumber();
          const largeArc = readFlag();
          const sweep = readFlag();
          const rxEnd = readNumber();
          const ryEnd = readNumber();
          if (
            rx === null ||
            ry === null ||
            rot === null ||
            largeArc === null ||
            sweep === null ||
            rxEnd === null ||
            ryEnd === null
          ) {
            abort = true;
            break;
          }
          const p1 = {
            x: rxEnd + (rel ? cur.x : 0),
            y: ryEnd + (rel ? cur.y : 0),
          };
          const arcPts = sampleSvgArc(cur, rx, ry, rot, largeArc, sweep, p1);
          currentPts.push(...arcPts);
          cur = p1;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
        }
      } else {
        break;
      }
    }

    flushSubpath(false);
    return polylines;
  }
  const extractSvgPrimitivesNode = createAtomicNode<
    string,
    ExtractedSketchSvgPath[]
  >('svg.extractPrimitives', extractSvgPrimitivesFn);
  const sampleSvgCurvesNode = createAtomicNode<
    ExtractedSketchSvgPath[],
    SketchRawPolyline[]
  >('svg.sampleCurves', (items) => {
    const out: SketchRawPolyline[] = [];
    for (const item of items) {
      out.push(...sampleSvgDToPolylines(item.id, item.d, item.colorHint, item.fill));
    }
    return out;
  });
  const svgToPolylinesWorkflow = compileWorkflowGraph<
    string,
    SketchRawPolyline[]
  >({
    id: 'svg.toPolylines',
    nodes: [
      {
        id: 'svg.extractPrimitives',
        node: extractSvgPrimitivesNode,
        from: [GRAPH_INPUT_ID],
      },
      {
        id: 'svg.sampleCurves',
        node: sampleSvgCurvesNode,
        from: ['svg.extractPrimitives'],
      },
    ],
    output: 'svg.sampleCurves',
  });
  function computeOtsuThreshold(data: Uint8Array): number {
    const hist = new Uint32Array(256);
    for (let i = 0; i < data.length; i++) {
      hist[data[i]]++;
    }
    const total = data.length;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVar = -1;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;

      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) {
        maxVar = between;
        threshold = t;
      }
    }
    return threshold;
  }
  const binarizeBitmapNode = createAtomicNode<
    SketchBitmapBranchInput,
    SketchBinaryMask
  >('bitmap.binarize', ({ bitmap, threshold, invert }) => {
    const { width, height, data } = bitmap;
    if (width <= 0 || height <= 0 || data.length < width * height) {
      return {
        width: Math.max(0, width),
        height: Math.max(0, height),
        mask: new Uint8Array(0),
      };
    }
    const pixelCount = width * height;
    const thresh = threshold ?? computeOtsuThreshold(data);
    const mask = new Uint8Array(pixelCount);

    let below = 0;
    for (let i = 0; i < pixelCount; i++) {
      if (data[i] <= thresh) below++;
    }
    const darkIsInk = invert !== undefined ? !invert : below <= pixelCount / 2;

    for (let i = 0; i < pixelCount; i++) {
      const isDark = data[i] <= thresh;
      mask[i] = darkIsInk ? (isDark ? 1 : 0) : isDark ? 0 : 1;
    }
    return { width, height, mask };
  });
  const zhangSuenThinningNode = createAtomicNode<
    SketchBinaryMask,
    SketchBinaryMask
  >('bitmap.thinning', ({ width, height, mask }) => {
    if (width < 3 || height < 3 || mask.length < width * height) {
      return { width, height, mask: new Uint8Array(mask) };
    }
    const img = new Uint8Array(mask);
    for (let x = 0; x < width; x++) {
      img[x] = 0;
      img[(height - 1) * width + x] = 0;
    }
    for (let y = 0; y < height; y++) {
      img[y * width] = 0;
      img[y * width + (width - 1)] = 0;
    }

    const toDelete: number[] = [];

    for (let pass = 0; pass < 64; pass++) {
      let changed = false;

      for (let sub = 0; sub < 2; sub++) {
        toDelete.length = 0;
        for (let y = 1; y < height - 1; y++) {
          const row = y * width;
          for (let x = 1; x < width - 1; x++) {
            const idx = row + x;
            if (img[idx] === 0) continue;

            const p2 = img[idx - width];
            const p3 = img[idx - width + 1];
            const p4 = img[idx + 1];
            const p5 = img[idx + width + 1];
            const p6 = img[idx + width];
            const p7 = img[idx + width - 1];
            const p8 = img[idx - 1];
            const p9 = img[idx - width - 1];

            const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (b < 2 || b > 6) continue;

            let a = 0;
            if (p2 === 0 && p3 === 1) a++;
            if (p3 === 0 && p4 === 1) a++;
            if (p4 === 0 && p5 === 1) a++;
            if (p5 === 0 && p6 === 1) a++;
            if (p6 === 0 && p7 === 1) a++;
            if (p7 === 0 && p8 === 1) a++;
            if (p8 === 0 && p9 === 1) a++;
            if (p9 === 0 && p2 === 1) a++;
            if (a !== 1) continue;

            if (sub === 0) {
              if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                toDelete.push(idx);
              }
            } else {
              if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                toDelete.push(idx);
              }
            }
          }
        }
        if (toDelete.length > 0) {
          changed = true;
          for (const idx of toDelete) img[idx] = 0;
        }
      }

      if (!changed) break;
    }

    // Sequential staircase-elbow cleanup preserving 8-connectivity and endpoints
    const ringCoords = [
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
    ];
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        if (img[idx] === 0) continue;

        const p2 = img[idx - width];
        const p3 = img[idx - width + 1];
        const p4 = img[idx + 1];
        const p5 = img[idx + width + 1];
        const p6 = img[idx + width];
        const p7 = img[idx + width - 1];
        const p8 = img[idx - 1];
        const p9 = img[idx - width - 1];

        const hasOrthElbow =
          (p2 === 1 && p4 === 1) ||
          (p4 === 1 && p6 === 1) ||
          (p6 === 1 && p8 === 1) ||
          (p8 === 1 && p2 === 1);
        if (!hasOrthElbow) continue;

        const ring = [p2, p3, p4, p5, p6, p7, p8, p9];
        const seen = [false, false, false, false, false, false, false, false];
        let components = 0;
        for (let s = 0; s < 8; s++) {
          if (ring[s] === 0 || seen[s]) continue;
          components++;
          if (components > 1) break;
          const stack = [s];
          seen[s] = true;
          while (stack.length > 0) {
            const u = stack.pop()!;
            for (let v = 0; v < 8; v++) {
              if (ring[v] === 1 && !seen[v]) {
                const dx = Math.abs(ringCoords[u][0] - ringCoords[v][0]);
                const dy = Math.abs(ringCoords[u][1] - ringCoords[v][1]);
                if (dx <= 1 && dy <= 1) {
                  seen[v] = true;
                  stack.push(v);
                }
              }
            }
          }
        }
        if (components === 1) {
          img[idx] = 0;
        }
      }
    }

    return { width, height, mask: img };
  });
  const SKELETON_NEIGHBORS = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ] as const;
  function skelEdgeKey(a: number, b: number): string {
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }
  function sketchPolylineLen(pts: Point[]): number {
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      sum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return sum;
  }
  const traceSkeletonPolylinesNode = createAtomicNode<
    SketchBinaryMask,
    SketchRawPolyline[]
  >('bitmap.tracePolylines', ({ width, height, mask }) => {
    const neighborsOf = new Map<number, number[]>();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (mask[idx] === 0) continue;
        const nbs: number[] = [];
        for (const [dx, dy] of SKELETON_NEIGHBORS) {
          const nIdx = (y + dy) * width + (x + dx);
          if (mask[nIdx] === 1) nbs.push(nIdx);
        }
        neighborsOf.set(idx, nbs);
      }
    }

    const visitedEdges = new Set<string>();
    const rawChains: number[][] = [];

    const walkChain = (startIdx: number, firstNextIdx: number): number[] => {
      const chain = [startIdx, firstNextIdx];
      visitedEdges.add(skelEdgeKey(startIdx, firstNextIdx));
      let prev = startIdx;
      let curr = firstNextIdx;

      while (true) {
        const nbs = neighborsOf.get(curr) ?? [];
        if (curr === startIdx) break;
        if (nbs.length !== 2 && nbs.length > 0) {
          const unvisited = nbs.filter((n) => !visitedEdges.has(skelEdgeKey(curr, n)));
          if (nbs.length >= 3 || unvisited.length === 0) break;
        }

        const dirX = (curr % width) - (prev % width);
        const dirY = Math.floor(curr / width) - Math.floor(prev / width);
        const dirLen = Math.hypot(dirX, dirY) || 1;

        const candidates = nbs.filter(
          (n) => n !== prev && !visitedEdges.has(skelEdgeKey(curr, n))
        );
        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          const ax = (a % width) - (curr % width);
          const ay = Math.floor(a / width) - Math.floor(curr / width);
          const bx = (b % width) - (curr % width);
          const by = Math.floor(b / width) - Math.floor(curr / width);
          const dotA = (ax * dirX + ay * dirY) / ((Math.hypot(ax, ay) || 1) * dirLen);
          const dotB = (bx * dirX + by * dirY) / ((Math.hypot(bx, by) || 1) * dirLen);
          return dotB - dotA;
        });

        const next = candidates[0];
        visitedEdges.add(skelEdgeKey(curr, next));
        chain.push(next);
        prev = curr;
        curr = next;
      }
      return chain;
    };

    const anchors = [...neighborsOf.entries()]
      .filter(([, nbs]) => nbs.length === 1 || nbs.length >= 3)
      .sort((a, b) => a[1].length - b[1].length);

    for (const [startIdx, nbs] of anchors) {
      for (const nextIdx of nbs) {
        if (!visitedEdges.has(skelEdgeKey(startIdx, nextIdx))) {
          rawChains.push(walkChain(startIdx, nextIdx));
        }
      }
    }

    for (const [startIdx, nbs] of neighborsOf.entries()) {
      for (const nextIdx of nbs) {
        if (!visitedEdges.has(skelEdgeKey(startIdx, nextIdx))) {
          rawChains.push(walkChain(startIdx, nextIdx));
        }
      }
    }

    const chains = rawChains.map((c) => [...c]);
    const junctionOutTangent = (chain: number[], atStart: boolean): Point => {
      const a = atStart ? chain[0] : chain[chain.length - 1];
      const lookIdx = atStart
        ? Math.min(chain.length - 1, 5)
        : Math.max(0, chain.length - 1 - 5);
      const b = chain[lookIdx];
      const dx = (b % width) - (a % width);
      const dy = Math.floor(b / width) - Math.floor(a / width);
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    };

    const mergeCosThreshold = Math.cos((42 * Math.PI) / 180);
    let mergedAny = true;
    while (mergedAny) {
      mergedAny = false;
      for (let i = 0; i < chains.length; i++) {
        if (chains[i].length === 0) continue;
        for (const endIsStart of [false, true]) {
          const jNode = endIsStart ? chains[i][0] : chains[i][chains[i].length - 1];
          if ((neighborsOf.get(jNode)?.length ?? 0) < 3) continue;
          const tI = junctionOutTangent(chains[i], endIsStart);

          let bestJ = -1;
          let bestJAtStart = true;
          let bestAlign = -Infinity;

          for (let j = i + 1; j < chains.length; j++) {
            if (chains[j].length === 0) continue;
            for (const jStart of [true, false]) {
              const candNode = jStart ? chains[j][0] : chains[j][chains[j].length - 1];
              if (candNode !== jNode) continue;
              const tJ = junctionOutTangent(chains[j], jStart);
              const align = -(tI.x * tJ.x + tI.y * tJ.y);
              if (align > mergeCosThreshold && align > bestAlign) {
                bestAlign = align;
                bestJ = j;
                bestJAtStart = jStart;
              }
            }
          }

          if (bestJ !== -1) {
            const cA = endIsStart ? [...chains[i]].reverse() : chains[i];
            const cB = bestJAtStart ? chains[bestJ] : [...chains[bestJ]].reverse();
            chains[i] = [...cA, ...cB.slice(1)];
            chains[bestJ] = [];
            mergedAny = true;
            break;
          }
        }
        if (mergedAny) break;
      }
    }

    const polylines: SketchRawPolyline[] = [];
    let seq = 0;
    for (const ch of chains) {
      if (ch.length < 4) continue;
      const pts: Point[] = ch.map((idx) => ({
        x: idx % width,
        y: Math.floor(idx / width),
      }));
      if (sketchPolylineLen(pts) < 4) continue;
      const head = pts[0];
      const tail = pts[pts.length - 1];
      const closed = Math.hypot(tail.x - head.x, tail.y - head.y) <= 2.5;
      polylines.push({
        id: `skel-${seq++}`,
        points: pts,
        closed,
      });
    }

    return polylines;
  });
  function perpendicularPtDist(pt: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return Math.hypot(pt.x - a.x, pt.y - a.y);
    return Math.abs(dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x) / len;
  }
  function rdpSimplifyPts(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let index = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const d = perpendicularPtDist(points[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const left = rdpSimplifyPts(points.slice(0, index + 1), epsilon);
      const right = rdpSimplifyPts(points.slice(index), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  }
  function chaikinSmoothPts(points: Point[], closed: boolean): Point[] {
    if (points.length < 3) return points;
    const out: Point[] = [];
    if (!closed) out.push(points[0]);
    const limit = closed ? points.length : points.length - 1;
    for (let i = 0; i < limit; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      out.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    if (!closed) {
      out.push(points[points.length - 1]);
    } else if (out.length > 0) {
      out.push({ ...out[0] });
    }
    return out;
  }
  const simplifyBitmapPolylinesNode = createAtomicNode<
    SketchRawPolyline[],
    SketchRawPolyline[]
  >('bitmap.simplify', (polylines) => {
    return polylines
      .map((poly) => ({
        ...poly,
        points: chaikinSmoothPts(rdpSimplifyPts(poly.points, 1.4), poly.closed),
      }))
      .filter((p) => p.points.length >= 2);
  });
  const bitmapToPolylinesWorkflow = compileWorkflowGraph<
    SketchBitmapBranchInput,
    SketchRawPolyline[]
  >({
    id: 'bitmap.toPolylines',
    nodes: [
      {
        id: 'bitmap.binarize',
        node: binarizeBitmapNode,
        from: [GRAPH_INPUT_ID],
      },
      {
        id: 'bitmap.thinning',
        node: zhangSuenThinningNode,
        from: ['bitmap.binarize'],
      },
      {
        id: 'bitmap.tracePolylines',
        node: traceSkeletonPolylinesNode,
        from: ['bitmap.thinning'],
      },
      {
        id: 'bitmap.simplify',
        node: simplifyBitmapPolylinesNode,
        from: ['bitmap.tracePolylines'],
      },
    ],
    output: 'bitmap.simplify',
  });
  const normalizeSketchFitNode = createAtomicNode<
    SketchPostProcessInput,
    SketchPostProcessInput
  >('sketch.normalizeFit', ({ polylines, options }) => {
    if (polylines.length === 0) return { polylines: [], options };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const poly of polylines) {
      for (const pt of poly.points) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }

    const srcW = Math.max(1e-3, maxX - minX);
    const srcH = Math.max(1e-3, maxY - minY);
    const targetW = options.targetWidth ?? 180;
    const targetH = options.targetHeight ?? 180;
    const cx = options.centerX ?? 0;
    const cy = options.centerY ?? 0;

    const scale = Math.min(targetW / srcW, targetH / srcH);
    const srcMidX = (minX + maxX) / 2;
    const srcMidY = (minY + maxY) / 2;

    return {
      polylines: polylines.map((poly) => ({
        ...poly,
        points: poly.points.map((pt) => ({
          x: cx + (pt.x - srcMidX) * scale,
          y: cy + (pt.y - srcMidY) * scale,
        })),
      })),
      options,
    };
  });
  const orderSketchStrokesNode = createAtomicNode<
    SketchPostProcessInput,
    SketchPostProcessInput
  >('sketch.orderStrokes', ({ polylines, options }) => {
    const strategy = options.orderStrategy ?? 'nearest-top-down';
    if (polylines.length <= 1 || strategy === 'preserve') {
      return { polylines, options };
    }

    if (strategy === 'longest-first') {
      return {
        polylines: [...polylines].sort(
          (a, b) => sketchPolylineLen(b.points) - sketchPolylineLen(a.points)
        ),
        options,
      };
    }

    const remaining = polylines.map((p) => ({
      ...p,
      points: [...p.points],
    }));

    let bestStartIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const pts = remaining[i].points;
      const head = pts[0];
      const lenBonus = Math.min(60, sketchPolylineLen(pts) * 0.12);
      const score = head.y * 1.15 + head.x * 0.7 - lenBonus;
      if (score < bestScore) {
        bestScore = score;
        bestStartIdx = i;
      }
    }

    const ordered: SketchRawPolyline[] = [];
    let current = remaining.splice(bestStartIdx, 1)[0];
    ordered.push(current);

    while (remaining.length > 0) {
      const penPos = current.points[current.points.length - 1];
      let nearestIdx = 0;
      let nearestDist = Infinity;
      let shouldReverse = false;

      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i];
        const head = cand.points[0];
        const tail = cand.points[cand.points.length - 1];
        const dHead = Math.hypot(head.x - penPos.x, head.y - penPos.y);
        const dTail = cand.closed
          ? Infinity
          : Math.hypot(tail.x - penPos.x, tail.y - penPos.y);

        if (dHead < nearestDist) {
          nearestDist = dHead;
          nearestIdx = i;
          shouldReverse = false;
        }
        if (dTail < nearestDist) {
          nearestDist = dTail;
          nearestIdx = i;
          shouldReverse = true;
        }
      }

      const nextPoly = remaining.splice(nearestIdx, 1)[0];
      if (shouldReverse) nextPoly.points.reverse();
      ordered.push(nextPoly);
      current = nextPoly;
    }

    return { polylines: ordered, options };
  });
  function subdivideSketchPolyline(points: Point[], maxStep = 12): Point[] {
    if (points.length < 2) return points;
    const out: Point[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / maxStep));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  }
  const wobbleSketchStrokesNode = createAtomicNode<
    SketchPostProcessInput,
    SketchPostProcessInput
  >('sketch.wobble', ({ polylines, options }) => {
    const wobbleAmp = options.wobbleAmp ?? 0.85;
    const seedPrefix = options.seed ?? 'sketch';

    const wobbled = polylines.map((poly, idx) => {
      if (wobbleAmp <= 0.01) {
        return {
          ...poly,
          points: subdivideSketchPolyline(poly.points, 12),
        };
      }

      const pts = poly.points;
      const rand = mulberry32(hashString(`${seedPrefix}:${poly.id}:${idx}`));
      const arc = sketchPolylineLen(pts);
      const localAmp = Math.min(wobbleAmp, Math.max(0.22, arc * 0.012));
      const basePts = sketchPolyline(pts, `${seedPrefix}:${poly.id}:${idx}`, localAmp);

      if (poly.closed && basePts.length >= 3) {
        const first = basePts[0];
        basePts[basePts.length - 1] = {
          x: first.x + (rand() - 0.5) * 0.4,
          y: first.y + (rand() - 0.5) * 0.4,
        };
      }

      return {
        ...poly,
        points: basePts,
      };
    });

    return { polylines: wobbled, options };
  });
  const sketchToStrokePathsNode = createAtomicNode<
    SketchPostProcessInput,
    StrokePath[]
  >('sketch.toStrokePaths', ({ polylines, options }) => {
    const defaultColor = options.defaultColor ?? 'white';
    const strokeWidth = options.strokeWidth ?? 2.3;
    const opacity = options.opacity ?? 0.94;
    const fillClosed = options.fillClosedShapes ?? false;

    return polylines.map((poly, idx) =>
      buildStrokePath(`${options.seed ?? 'sketch'}-${poly.id}-${idx}`, poly.points, {
        width: strokeWidth,
        color: poly.colorHint ?? defaultColor,
        opacity,
        fillOpacity: fillClosed && poly.closed && poly.fill !== false ? 0.75 : undefined,
        speedFactor: 1.25,
      })
    );
  });
  const polylinesToSketchWorkflow = compileWorkflowGraph<
    SketchPostProcessInput,
    StrokePath[]
  >({
    id: 'sketch.postProcess',
    nodes: [
      {
        id: 'sketch.normalizeFit',
        node: normalizeSketchFitNode,
        from: [GRAPH_INPUT_ID],
      },
      {
        id: 'sketch.orderStrokes',
        node: orderSketchStrokesNode,
        from: ['sketch.normalizeFit'],
      },
      {
        id: 'sketch.wobble',
        node: wobbleSketchStrokesNode,
        from: ['sketch.orderStrokes'],
      },
      {
        id: 'sketch.toStrokePaths',
        node: sketchToStrokePathsNode,
        from: ['sketch.wobble'],
      },
    ],
    output: 'sketch.toStrokePaths',
  });
  const dispatchSketchIngestNode = createAtomicNode<
    SketchPipelineRequest,
    SketchPostProcessInput
  >('sketch.ingest', (req: SketchPipelineRequest, ctx?: WorkflowContext) => {
    const polylines =
      req.asset.kind === 'svg'
        ? svgToPolylinesWorkflow.run(req.asset.svgText, ctx)
        : bitmapToPolylinesWorkflow.run(
            {
              bitmap: req.asset.bitmap,
              threshold: req.asset.threshold,
              invert: req.asset.invert,
            },
            ctx
          );
    return {
      polylines,
      options: req.options ?? {},
    };
  });
  const sketchPipeline = compileWorkflowGraph<
    SketchPipelineRequest,
    StrokePath[]
  >({
    id: 'sketch.pipeline',
    nodes: [
      {
        id: 'sketch.ingest',
        node: dispatchSketchIngestNode,
        from: [GRAPH_INPUT_ID],
      },
      {
        id: 'sketch.postProcess',
        node: polylinesToSketchWorkflow,
        from: ['sketch.ingest'],
      },
    ],
    output: 'sketch.postProcess',
  });
  const SKETCH_ICON_LIBRARY: Record<string, string> = {
    browser: `<svg viewBox="0 0 120 120">
      <rect x="14" y="22" width="92" height="76" rx="8"/>
      <line x1="14" y1="42" x2="106" y2="42"/>
      <circle cx="26" cy="32" r="2.6"/>
      <circle cx="35" cy="32" r="2.6"/>
      <circle cx="44" cy="32" r="2.6"/>
      <path fill="none" d="M38 62 L28 70 L38 78"/>
      <path fill="none" d="M82 62 L92 70 L82 78"/>
      <line x1="65" y1="58" x2="55" y2="82"/>
    </svg>`,
    server: `<svg viewBox="0 0 120 120">
      <rect x="20" y="18" width="80" height="24" rx="5"/>
      <rect x="20" y="48" width="80" height="24" rx="5"/>
      <rect x="20" y="78" width="80" height="24" rx="5"/>
      <circle cx="34" cy="30" r="3"/>
      <circle cx="34" cy="60" r="3"/>
      <circle cx="34" cy="90" r="3"/>
      <line x1="54" y1="30" x2="86" y2="30"/>
      <line x1="54" y1="60" x2="86" y2="60"/>
      <line x1="54" y1="90" x2="86" y2="90"/>
    </svg>`,
    database: `<svg viewBox="0 0 120 120">
      <ellipse cx="60" cy="28" rx="34" ry="12"/>
      <path fill="none" d="M26 28 L26 90 A34 12 0 0 0 94 90 L94 28"/>
      <path fill="none" d="M26 50 A34 12 0 0 0 94 50"/>
      <path fill="none" d="M26 70 A34 12 0 0 0 94 70"/>
    </svg>`,
    globe: `<svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="40"/>
      <ellipse cx="60" cy="60" rx="18" ry="40"/>
      <line x1="20" y1="60" x2="100" y2="60"/>
      <path fill="none" d="M26 42 Q60 48 94 42"/>
      <path fill="none" d="M26 78 Q60 72 94 78"/>
    </svg>`,
    lock: `<svg viewBox="0 0 120 120">
      <rect x="28" y="52" width="64" height="48" rx="8"/>
      <path fill="none" d="M40 52 L40 38 A20 20 0 0 1 80 38 L80 52"/>
      <circle cx="60" cy="72" r="5.5"/>
      <line x1="60" y1="78" x2="60" y2="88"/>
    </svg>`,
    handshake: `<svg viewBox="0 0 120 120">
      <path fill="none" d="M16 56 L36 38 L58 50 L74 38 L104 54"/>
      <path fill="none" d="M24 64 L48 86 L62 84 L88 64"/>
      <path fill="none" d="M44 62 L58 72 M54 54 L70 66 M66 48 L80 60"/>
      <circle cx="60" cy="30" r="8"/>
    </svg>`,
    cpu: `<svg viewBox="0 0 120 120">
      <rect x="30" y="30" width="60" height="60" rx="6"/>
      <rect x="44" y="44" width="32" height="32" rx="3"/>
      <line x1="44" y1="16" x2="44" y2="30"/>
      <line x1="60" y1="16" x2="60" y2="30"/>
      <line x1="76" y1="16" x2="76" y2="30"/>
      <line x1="44" y1="90" x2="44" y2="104"/>
      <line x1="60" y1="90" x2="60" y2="104"/>
      <line x1="76" y1="90" x2="76" y2="104"/>
      <line x1="16" y1="44" x2="30" y2="44"/>
      <line x1="16" y1="60" x2="30" y2="60"/>
      <line x1="16" y1="76" x2="30" y2="76"/>
      <line x1="90" y1="44" x2="104" y2="44"/>
      <line x1="90" y1="60" x2="104" y2="60"/>
      <line x1="90" y1="76" x2="104" y2="76"/>
    </svg>`,
    brain: `<svg viewBox="0 0 120 120">
      <path d="M58 24 C42 18 24 28 24 44 C16 48 16 64 24 70 C22 86 38 96 54 90 C56 96 58 98 58 98"/>
      <path d="M62 24 C78 18 96 28 96 44 C104 48 104 64 96 70 C98 86 82 96 66 90 C64 96 62 98 62 98"/>
      <line x1="60" y1="24" x2="60" y2="98"/>
      <path fill="none" d="M38 44 Q48 48 44 58"/>
      <path fill="none" d="M82 44 Q72 48 76 58"/>
      <path fill="none" d="M36 72 Q46 68 50 76"/>
      <path fill="none" d="M84 72 Q74 68 70 76"/>
    </svg>`,
    spark: `<svg viewBox="0 0 120 120">
      <path d="M60 14 Q64 52 104 60 Q64 68 60 106 Q56 68 16 60 Q56 52 60 14 Z"/>
      <line x1="24" y1="24" x2="34" y2="34"/>
      <line x1="96" y1="24" x2="86" y2="34"/>
      <line x1="24" y1="96" x2="34" y2="86"/>
    </svg>`,
    code: `<svg viewBox="0 0 120 120">
      <path fill="none" d="M40 34 L16 60 L40 86"/>
      <path fill="none" d="M80 34 L104 60 L80 86"/>
      <line x1="68" y1="26" x2="52" y2="94"/>
    </svg>`,
    puzzle: `<svg viewBox="0 0 120 120">
      <path d="M26 36 L48 36 A10 10 0 1 1 68 36 L88 36 L88 58 A10 10 0 1 1 88 76 L88 94 L26 94 L26 76 A10 10 0 1 0 26 58 Z"/>
    </svg>`,
    user: `<svg viewBox="0 0 120 120">
      <circle cx="60" cy="40" r="18"/>
      <path fill="none" d="M24 98 C24 72 96 72 96 98"/>
    </svg>`,
    document: `<svg viewBox="0 0 120 120">
      <path d="M28 18 L74 18 L92 36 L92 102 L28 102 Z"/>
      <path fill="none" d="M74 18 L74 36 L92 36"/>
      <line x1="42" y1="54" x2="78" y2="54"/>
      <line x1="42" y1="70" x2="78" y2="70"/>
      <line x1="42" y1="86" x2="64" y2="86"/>
    </svg>`,
    rocket: `<svg viewBox="0 0 120 120">
      <path d="M60 12 C78 28 84 56 80 82 L40 82 C36 56 42 28 60 12 Z"/>
      <circle cx="60" cy="48" r="10"/>
      <path fill="none" d="M40 64 L22 82 L40 84"/>
      <path fill="none" d="M80 64 L98 82 L80 84"/>
      <path fill="none" d="M48 86 Q54 106 60 100 Q66 108 72 86"/>
    </svg>`,
    lightbulb: `<svg viewBox="0 0 120 120">
      <path d="M44 76 C32 66 28 48 36 34 C44 20 76 20 84 34 C92 48 88 66 76 76 L74 88 L46 88 Z"/>
      <line x1="48" y1="95" x2="72" y2="95"/>
      <line x1="52" y1="102" x2="68" y2="102"/>
      <path fill="none" d="M52 54 L58 64 L64 54"/>
      <line x1="60" y1="10" x2="60" y2="18"/>
      <line x1="20" y1="48" x2="28" y2="48"/>
      <line x1="92" y1="48" x2="100" y2="48"/>
    </svg>`,
    cat: `<svg viewBox="0 0 120 120">
      <path d="M28 52 L24 22 L46 36 Q60 32 74 36 L96 22 L92 52 C100 72 88 98 60 98 C32 98 20 72 28 52 Z"/>
      <circle cx="46" cy="58" r="4.5"/>
      <circle cx="74" cy="58" r="4.5"/>
      <polygon points="56,68 64,68 60,74"/>
      <path fill="none" d="M60 74 Q54 82 48 78"/>
      <path fill="none" d="M60 74 Q66 82 72 78"/>
      <line x1="16" y1="66" x2="36" y2="68"/>
      <line x1="18" y1="76" x2="36" y2="74"/>
      <line x1="104" y1="66" x2="84" y2="68"/>
      <line x1="102" y1="76" x2="84" y2="74"/>
    </svg>`,
    chart: `<svg viewBox="0 0 120 120">
      <path fill="none" d="M20 22 L20 96 L102 96"/>
      <rect x="32" y="64" width="14" height="32" rx="2"/>
      <rect x="54" y="44" width="14" height="52" rx="2"/>
      <rect x="76" y="28" width="14" height="68" rx="2"/>
    </svg>`,
    gear: `<svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="24"/>
      <circle cx="60" cy="60" r="10"/>
      <line x1="60" y1="22" x2="60" y2="36"/>
      <line x1="60" y1="84" x2="60" y2="98"/>
      <line x1="22" y1="60" x2="36" y2="60"/>
      <line x1="84" y1="60" x2="98" y2="60"/>
      <line x1="33" y1="33" x2="43" y2="43"/>
      <line x1="77" y1="77" x2="87" y2="87"/>
      <line x1="87" y1="33" x2="77" y2="43"/>
      <line x1="43" y1="77" x2="33" y2="87"/>
    </svg>`,
    check: `<svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="38"/>
      <path fill="none" d="M40 62 L54 76 L82 44"/>
    </svg>`,
    layers: `<svg viewBox="0 0 120 120">
      <polygon points="60,20 100,40 60,60 20,40"/>
      <path fill="none" d="M20 60 L60 80 L100 60"/>
      <path fill="none" d="M20 80 L60 100 L100 80"/>
    </svg>`,
  };
  const sketchIconListeners = new Set<() => void>();
  let cachedSketchIconNames: string[] | null = null;
  function registerSketchIcon(name: string, svgText: string): void {
    const key = name.trim().toLowerCase();
    if (key && svgText.trim()) {
      SKETCH_ICON_LIBRARY[key] = svgText;
      cachedSketchIconNames = null;
      for (const listener of sketchIconListeners) {
        listener();
      }
    }
  }
  function getSketchIconSvg(name: string): string | undefined {
    return SKETCH_ICON_LIBRARY[name.trim().toLowerCase()];
  }
  function listSketchIcons(): string[] {
    if (!cachedSketchIconNames) {
      cachedSketchIconNames = Object.keys(SKETCH_ICON_LIBRARY);
    }
    return cachedSketchIconNames;
  }
  function subscribeSketchIcons(listener: () => void): () => void {
    sketchIconListeners.add(listener);
    return () => {
      sketchIconListeners.delete(listener);
    };
  }
  return { sketchPipeline, getSketchIconSvg };
})();

// --- Module: src/plugins/shapes/clipHelpers.ts ---
const { clipRayToRect, clipRayToEllipse, clipRayToDiamond } = (() => {
  function clipRayToRect(
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
  function clipRayToEllipse(
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
  function clipRayToDiamond(
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
  return { clipRayToRect, clipRayToEllipse, clipRayToDiamond };
})();

// --- Module: src/plugins/nodes/sketchNodePlugin.ts ---
const { iconNodePlugin, sketchNodePlugin } = (() => {
  function wrapBareSvgSnippet(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('<')) return trimmed;
    return `<svg viewBox="0 0 120 120"><path d="${trimmed}"/></svg>`;
  }
  const iconProps = defineProps({
    icon: prop.string({ default: 'spark', format: 'icon-id', description: 'Built-in icon name' }),
    size: prop.number({ default: 36, min: 12, max: 120, step: 2, description: 'Square icon size in px' }),
    svg: prop.string({ format: 'svg', description: 'Custom inline SVG or path d attribute' }),
  });
  const sketchProps = defineProps({
    icon: prop.string({ default: 'rocket', format: 'icon-id', description: 'Built-in icon name' }),
    caption: prop.string({
      default: 'Hand-Drawn',
      aliases: ['title', 'text'],
      description: 'Caption rendered below sketch',
    }),
    width: prop.number({ min: 40, step: 8, aliases: ['w'] }),
    height: prop.number({ min: 40, step: 8, aliases: ['h'] }),
    svg: prop.string({ format: 'svg', description: 'Custom inline SVG or path d attribute' }),
  });
  const iconNodePlugin: SceneNodePlugin = {
    id: 'icon',
    name: 'Sketch Icon',
    defaultName: 'Icon',
    defaultColor: 'yellow',
    defaultProps: iconProps.defaults,
    snippet: '[node:icon] Badge {color: yellow, icon: spark, size: 36}',
    propFields: iconProps.fields,
    measure(node) {
      const resolved = iconProps.resolve(
        isCustomSceneNode(node) ? node.props : undefined
      );
      return {
        width: resolved.size,
        height: resolved.size,
      };
    },
    clipRay(positioned, toward, extraMargin) {
      return clipRayToRect(
        positioned.cx,
        positioned.cy,
        positioned.width,
        positioned.height,
        toward,
        extraMargin
      );
    },
    compile(positioned, helpers) {
      const props = isCustomSceneNode(positioned.node)
        ? positioned.node.props
        : undefined;
      const iconName =
        (iconProps.readField(props, 'icon') ?? '').trim() || positioned.node.name;
      const svgOverride = (iconProps.readField(props, 'svg') ?? '').trim();
      const rawSvg = svgOverride
        ? wrapBareSvgSnippet(svgOverride)
        : getSketchIconSvg(iconName) ?? getSketchIconSvg('spark')!;

      const targetW = Math.max(16, positioned.width - 4);
      const targetH = Math.max(16, positioned.height - 4);
      const strokeW = Math.max(1.75, Math.min(2.5, positioned.width * 0.068));

      const strokes = sketchPipeline.run({
        asset: { kind: 'svg', svgText: rawSvg },
        options: {
          seed: positioned.id,
          centerX: positioned.cx,
          centerY: positioned.cy,
          targetWidth: targetW,
          targetHeight: targetH,
          defaultColor: positioned.node.color,
          strokeWidth: strokeW,
          wobbleAmp: 0.45,
          fillClosedShapes: false,
        },
      });

      strokes.forEach((s, idx) => {
        helpers.pushStroke(s, idx === strokes.length - 1 ? 38 : 16);
      });
    },
  };
  const sketchNodePlugin: SceneNodePlugin = {
    id: 'sketch',
    name: 'Hand-Drawn Sketch',
    defaultName: 'Sketch',
    defaultColor: 'pink',
    defaultProps: sketchProps.defaults,
    snippet:
      '[node:sketch] Art {color: pink, icon: rocket, caption: "Hand-Drawn"}',
    propFields: sketchProps.fields,
    measure(node, ctx) {
      const explicitW = sketchProps.readField(node.props, 'width');
      const explicitH = sketchProps.readField(node.props, 'height');
      const caption = (sketchProps.readField(node.props, 'caption') ?? '').trim();
      let width = 168;
      if (explicitW !== undefined) {
        width = explicitW;
      } else if (caption) {
        const capW = ctx.measureText(caption, `700 15px ${ctx.fontFamily}`);
        width = Math.max(168, Math.min(360, Math.ceil(capW + 24)));
      }
      const baseH = explicitH ?? 128;
      return {
        width,
        height: caption ? baseH + 26 : baseH,
      };
    },
    clipRay(positioned, toward, extraMargin) {
      return clipRayToRect(
        positioned.cx,
        positioned.cy,
        positioned.width,
        positioned.height,
        toward,
        extraMargin
      );
    },
    compile(positioned, helpers) {
      const props = isCustomSceneNode(positioned.node)
        ? positioned.node.props
        : undefined;
      const caption = (sketchProps.readField(props, 'caption') ?? '').trim();
      const iconName =
        (sketchProps.readField(props, 'icon') ?? '').trim() || positioned.node.name;
      const svgOverride = (sketchProps.readField(props, 'svg') ?? '').trim();
      const svgText = svgOverride
        ? wrapBareSvgSnippet(svgOverride)
        : getSketchIconSvg(iconName) ?? getSketchIconSvg('lightbulb')!;

      const areaH = caption ? positioned.height - 28 : positioned.height;
      const strokes = sketchPipeline.run({
        asset: { kind: 'svg', svgText },
        options: {
          seed: positioned.id,
          centerX: positioned.cx,
          centerY: positioned.cy - (caption ? 12 : 0),
          targetWidth: Math.max(32, positioned.width - 16),
          targetHeight: Math.max(32, areaH - 14),
          defaultColor: positioned.node.color,
          strokeWidth: 2.5,
          wobbleAmp: 0.75,
          fillClosedShapes: true,
        },
      });

      strokes.forEach((s, idx) => {
        helpers.pushStroke(s, idx === strokes.length - 1 ? 45 : 20);
      });

      if (caption) {
        helpers.pushTextLine({
          id: `${positioned.id}-caption`,
          text: caption,
          boxLeftX: positioned.cx - positioned.width / 2,
          boxWidth: positioned.width,
          centerY: positioned.cy + positioned.height / 2 - 12,
          align: 'center',
          fontSize: 15,
          fontWeight: 700,
          color: positioned.node.color,
          msPerChar: 78,
          gapAfterMs: 40,
        });
      }
    },
  };
  return { iconNodePlugin, sketchNodePlugin };
})();

// --- Module: src/plugins/nodes/codeNodePlugin.ts ---
const { codeNodePlugin } = (() => {
  const CODE_MONO_FONT = '"JetBrains Mono", "SF Mono", "Consolas", monospace';
  const codeProps = defineProps({
    title: prop.string({
      default: 'demo.penova.md',
      description: 'Header filename',
    }),
    lines: prop.string({
      default: 'const penova = true;\nrender(penova);',
      format: 'code',
      aliases: ['code'],
      description: 'Code content (supports \\n)',
    }),
    width: prop.number({
      min: 180,
      step: 10,
      aliases: ['w'],
      description: 'Explicit window width',
    }),
  });
  function parseCodeLines(node: CustomSceneNode): string[] {
    const raw = codeProps.readField(node.props, 'lines') ?? '';
    if (!raw.trim()) {
      return [node.name || 'script.penova.md'];
    }
    const normalized = raw.replace(/\\n/g, '\n');
    const lines = normalized.includes('\n')
      ? normalized.split(/\r?\n/)
      : normalized.split(/\s*;\s*/);
    const cleaned = lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
    return cleaned.length > 0 ? cleaned : [node.name || 'script.penova.md'];
  }
  function buildTinyCirclePts(
    cx: number,
    cy: number,
    r: number,
    steps = 12
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }
  const codeNodePlugin: SceneNodePlugin = {
    id: 'code',
    name: 'Code Window',
    defaultName: 'CodeBox',
    defaultColor: 'cyan',
    defaultProps: codeProps.defaults,
    snippet:
      '[node:code] Snippet {color: cyan, title: "demo.ts", lines: "const x = 1;\\nrender(x);"}',
    propFields: codeProps.fields,
    measure(node, ctx) {
      const lines = parseCodeLines(node);
      const title =
        (codeProps.readField(node.props, 'title') ?? '').trim() ||
        node.name ||
        'script.penova.md';
      const font = `400 13.5px ${CODE_MONO_FONT}`;
      let widest = ctx.measureText(title, `700 12.5px ${ctx.fontFamily}`) + 74;
      for (const line of lines) {
        widest = Math.max(widest, ctx.measureText(line, font) + 38);
      }
      const explicitW = codeProps.readField(node.props, 'width');
      const width =
        explicitW !== undefined
          ? explicitW
          : Math.max(230, Math.min(540, Math.ceil(widest)));
      const height = Math.max(96, 48 + lines.length * 22 + 14);
      return { width, height, payload: { title, lines } };
    },
    clipRay(positioned, toward, extraMargin) {
      return clipRayToRect(
        positioned.cx,
        positioned.cy,
        positioned.width,
        positioned.height,
        toward,
        extraMargin
      );
    },
    compile(positioned, helpers) {
      if (!isCustomSceneNode(positioned.node)) {
        return;
      }
      const node = positioned.node;
      const lines = parseCodeLines(node);
      const title =
        (codeProps.readField(node.props, 'title') ?? '').trim() ||
        node.name ||
        'script.penova.md';

      const x = positioned.cx - positioned.width / 2;
      const y = positioned.cy - positioned.height / 2;
      const rand = mulberry32(hashString(`code:${positioned.id}`));

      // 1. Hand-drawn outer window card
      const boxPts = buildRoundedRectPoints(
        x,
        y,
        positioned.width,
        positioned.height,
        12,
        rand,
        3
      );
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-window`, boxPts, {
          width: 2.5,
          color: node.color,
          opacity: 0.94,
          fillOpacity: 1,
          surfaceShadow: true,
          speedFactor: 1.25,
        }),
        35
      );

      // 2. Window titlebar separator
      const barY = y + 32;
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-bar`,
          sketchSegment(
            { x: x + 6, y: barY },
            { x: x + positioned.width - 6, y: barY },
            rand,
            0.9,
            18
          ),
          {
            width: 1.6,
            color: node.color,
            opacity: 0.52,
            speedFactor: 1.5,
          }
        ),
        20
      );

      // 3. Three window dots
      const dotColors = ['pink', 'yellow', 'green'] as const;
      dotColors.forEach((dc, idx) => {
        helpers.pushStroke(
          buildStrokePath(
            `${positioned.id}-dot-${idx}`,
            buildTinyCirclePts(x + 20 + idx * 14, y + 16, 3.6),
            {
              width: 1.9,
              color: dc,
              opacity: 0.9,
              speedFactor: 1.8,
            }
          ),
          10
        );
      });

      // 4. Title filename
      helpers.pushTextLine({
        id: `${positioned.id}-title`,
        text: title,
        boxLeftX: x + 64,
        boxWidth: Math.max(80, positioned.width - 78),
        centerY: y + 16,
        align: 'left',
        fontSize: 12.5,
        fontWeight: 700,
        color: node.color,
        msPerChar: 45,
        gapAfterMs: 28,
      });

      // 5. Progressive code lines
      lines.forEach((line, idx) => {
        helpers.pushTextLine({
          id: `${positioned.id}-code-${idx}`,
          text: line,
          boxLeftX: x + 18,
          boxWidth: Math.max(120, positioned.width - 36),
          centerY: y + 48 + idx * 22,
          align: 'left',
          fontSize: 13.5,
          fontWeight: 400,
          fontFamily: CODE_MONO_FONT,
          color: 'white',
          msPerChar: 28,
          gapAfterMs: 24,
        });
      });
    },
  };
  return { codeNodePlugin };
})();

// --- Module: src/plugins/nodes/chartNodePlugin.ts ---
const { chartNodePlugin } = (() => {
  const chartProps = defineProps({
    title: prop.string({ default: 'Growth', description: 'Chart title' }),
    values: prop.string({
      default: '22,48,76,100',
      description: 'Comma-separated bar values',
    }),
    labels: prop.string({
      default: 'Q1,Q2,Q3,Q4',
      description: 'Comma-separated bar labels',
    }),
    highlight: prop.number({
      default: 3,
      min: 0,
      max: 7,
      step: 1,
      description: '0-based highlighted bar index',
    }),
    width: prop.number({ min: 180, step: 10, aliases: ['w'] }),
    height: prop.number({ min: 140, step: 10, aliases: ['h'] }),
  });
  function parseChartData(node: CustomSceneNode): {
    title: string;
    values: number[];
    labels: string[];
    highlightIdx: number;
  } {
    const title =
      (chartProps.readField(node.props, 'title') ?? '').trim() ||
      node.name ||
      'Metrics';

    const rawValuesStr = (chartProps.readField(node.props, 'values') ?? '').trim();
    const rawValues = rawValuesStr
      ? rawValuesStr
          .split(',')
          .map((v) => Number.parseFloat(v.trim()))
          .filter((n) => Number.isFinite(n) && n >= 0)
      : [];
    const values = rawValues.length >= 2 ? rawValues.slice(0, 8) : [25, 48, 76, 100];

    const rawLabelsStr = (chartProps.readField(node.props, 'labels') ?? '').trim();
    const rawLabels = rawLabelsStr
      ? rawLabelsStr.split(',').map((s) => s.trim())
      : [];
    const labels = values.map((_, idx) => rawLabels[idx] || `#${idx + 1}`);

    const resolvedHi = chartProps.readField(node.props, 'highlight');
    const highlightIdx =
      resolvedHi !== undefined && resolvedHi < values.length
        ? Math.round(resolvedHi)
        : values.length - 1;

    return { title, values, labels, highlightIdx };
  }
  const chartNodePlugin: SceneNodePlugin = {
    id: 'chart',
    name: 'Bar Chart',
    defaultName: 'Metrics',
    defaultColor: 'orange',
    defaultProps: chartProps.defaults,
    snippet:
      '[node:chart] Speed {color: orange, title: "Growth", values: "20,45,75,100", labels: "Q1,Q2,Q3,Q4", highlight: 3}',
    propFields: chartProps.fields,
    measure(node, ctx) {
      const explicitW = chartProps.readField(node.props, 'width');
      const explicitH = chartProps.readField(node.props, 'height');
      let width = 296;
      if (explicitW !== undefined) {
        width = explicitW;
      } else {
        const { title, values, labels } = parseChartData(node);
        const titleW = ctx.measureText(title, `700 15px ${ctx.fontFamily}`);
        const widestLabelW = Math.max(
          32,
          ...labels.map((l) => ctx.measureText(l, `700 12px ${ctx.fontFamily}`))
        );
        width = Math.max(
          296,
          Math.min(
            560,
            Math.ceil(
              Math.max(
                titleW + 48,
                values.length * Math.max(54, widestLabelW + 14) + 56
              )
            )
          )
        );
      }
      const height = explicitH ?? 196;
      return { width, height };
    },
    clipRay(positioned, toward, extraMargin) {
      return clipRayToRect(
        positioned.cx,
        positioned.cy,
        positioned.width,
        positioned.height,
        toward,
        extraMargin
      );
    },
    compile(positioned, helpers) {
      if (!isCustomSceneNode(positioned.node)) {
        return;
      }
      const node = positioned.node;
      const { title, values, labels, highlightIdx } = parseChartData(node);
      const x = positioned.cx - positioned.width / 2;
      const y = positioned.cy - positioned.height / 2;
      const rand = mulberry32(hashString(`chart:${positioned.id}`));

      // 1. Card backdrop
      const framePts = buildRoundedRectPoints(
        x,
        y,
        positioned.width,
        positioned.height,
        14,
        rand,
        3
      );
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-card`, framePts, {
          width: 2.4,
          color: node.color,
          opacity: 0.9,
          fillOpacity: 1,
          surfaceShadow: true,
          speedFactor: 1.25,
        }),
        35
      );

      // 2. Title
      helpers.pushTextLine({
        id: `${positioned.id}-title`,
        text: title,
        boxLeftX: x + 16,
        boxWidth: positioned.width - 32,
        centerY: y + 22,
        align: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: node.color,
        msPerChar: 55,
        gapAfterMs: 30,
      });

      // 3. Axes (L-shape inside card)
      const plotLeft = x + 30;
      const plotRight = x + positioned.width - 24;
      const plotTop = y + 46;
      const plotBottom = y + positioned.height - 34;
      const plotW = Math.max(80, plotRight - plotLeft);
      const plotH = Math.max(50, plotBottom - plotTop);

      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-y-axis`,
          sketchSegment(
            { x: plotLeft, y: plotBottom },
            { x: plotLeft, y: plotTop },
            rand,
            0.9,
            14
          ),
          {
            width: 2.1,
            color: 'white',
            opacity: 0.8,
            speedFactor: 1.4,
          }
        ),
        18
      );
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-x-axis`,
          sketchSegment(
            { x: plotLeft, y: plotBottom },
            { x: plotRight, y: plotBottom },
            rand,
            0.9,
            14
          ),
          {
            width: 2.1,
            color: 'white',
            opacity: 0.8,
            speedFactor: 1.4,
          }
        ),
        26
      );

      // 4. Bars + Excalidraw-style diagonal hachure on highlighted bar
      const maxVal = Math.max(1e-3, ...values);
      const slotW = plotW / values.length;
      const barW = Math.min(44, Math.max(18, slotW * 0.58));
      const barColors: ChalkColor[] = ['cyan', 'green', 'yellow', 'orange'];
      const barTopPoints: Point[] = [];

      values.forEach((val, idx) => {
        const barH = Math.max(10, (val / maxVal) * (plotH - 14));
        const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
        const by = plotBottom - barH;
        const isHi = idx === highlightIdx;
        const barColor: ChalkColor = isHi
          ? 'orange'
          : barColors[idx % barColors.length];

        const barPts = buildRoundedRectPoints(bx, by, barW, barH, 3, rand, 1.5);
        helpers.pushStroke(
          buildStrokePath(`${positioned.id}-bar-${idx}`, barPts, {
            width: isHi ? 2.6 : 2.1,
            color: barColor,
            opacity: 0.94,
            fillOpacity: 1,
            speedFactor: 1.35,
          }),
          14
        );

        // Hand-drawn diagonal hachure stripes inside the highlighted bar
        if (isHi && barH > 16) {
          const pitch = 9;
          let hatchIdx = 0;
          for (let hy = by + 7; hy < plotBottom - 4; hy += pitch) {
            const xStart = bx + 3;
            const xEnd = bx + barW - 3;
            const yEnd = Math.min(plotBottom - 3, hy + (xEnd - xStart) * 0.42);
            helpers.pushStroke(
              buildStrokePath(
                `${positioned.id}-hatch-${hatchIdx++}`,
                sketchSegment(
                  { x: xStart, y: hy },
                  { x: xEnd, y: yEnd },
                  rand,
                  0.55,
                  14
                ),
                {
                  width: 1.35,
                  color: barColor,
                  opacity: 0.65,
                  speedFactor: 1.9,
                }
              ),
              6
            );
          }
        }

        barTopPoints.push({ x: bx + barW / 2, y: Math.max(plotTop + 4, by - 7) });

        helpers.pushTextLine({
          id: `${positioned.id}-lbl-${idx}`,
          text: labels[idx],
          boxLeftX: plotLeft + slotW * idx,
          boxWidth: slotW,
          centerY: plotBottom + 16,
          align: 'center',
          fontSize: 12,
          fontWeight: isHi ? 700 : 400,
          color: isHi ? 'orange' : 'white',
          msPerChar: 40,
          gapAfterMs: 14,
        });
      });

      // 5. Trend curve above bars
      if (barTopPoints.length >= 2) {
        const trendPts: Point[] = [];
        for (let i = 1; i < barTopPoints.length; i++) {
          const seg = sketchSegment(
            barTopPoints[i - 1],
            barTopPoints[i],
            rand,
            0.9,
            14
          );
          trendPts.push(...(i === 1 ? seg : seg.slice(1)));
        }
        helpers.pushStroke(
          buildStrokePath(`${positioned.id}-trend`, trendPts, {
            width: 2.2,
            color: 'yellow',
            opacity: 0.9,
            speedFactor: 1.4,
          }),
          24
        );
      }
    },
  };
  return { chartNodePlugin };
})();

// --- Module: src/plugins/shapes/roundedShape.ts ---
const { roundedShapePlugin } = (() => {
  const roundedShapePlugin: ShapePlugin = {
    id: 'rounded',
    name: 'Rounded Box',
    measureBox(contentW, contentH) {
      const padX = 28;
      const padY = 18;
      return {
        padX,
        padY,
        width: Math.max(136, Math.ceil(contentW + padX * 2)),
        height: Math.max(62, Math.ceil(contentH + padY * 2)),
      };
    },
    clipRay: clipRayToRect,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const x = cx - width / 2;
      const y = cy - height / 2;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 3.3 : 2.6;
      const strokes: StrokePath[] = [];

      const primaryPts = buildRoundedRectPoints(x, y, width, height, 14, rand, 4);
      strokes.push(
        buildStrokePath(`${id}-box-1`, primaryPts, {
          width: baseWidth,
          color,
          opacity: 0.94,
          fillOpacity: 1,
          surfaceShadow: true,
          dashed,
          speedFactor: 1.12,
        })
      );

      if (emphasized) {
        const accentPts = buildRoundedRectPoints(
          x - 3.5,
          y - 3.5,
          width + 7,
          height + 7,
          16,
          rand,
          3
        );
        strokes.push(
          buildStrokePath(`${id}-box-2`, accentPts, {
            width: 1.8,
            color,
            opacity: 0.52,
            dashed,
            speedFactor: 1.4,
          })
        );
      }

      return strokes;
    },
  };
  return { roundedShapePlugin };
})();

// --- Module: src/plugins/shapes/circleShape.ts ---
const { circleShapePlugin } = (() => {
  const circleShapePlugin: ShapePlugin = {
    id: 'circle',
    name: 'Ellipse',
    maxTextWidth() {
      return 162;
    },
    measureBox(contentW, contentH) {
      const padX = 34;
      const padY = 28;
      const width = Math.max(
        148,
        Math.ceil(contentW + padX * 2),
        Math.ceil(contentH + 56)
      );
      const height = Math.max(
        94,
        Math.ceil(contentH + padY * 2),
        Math.round(width * 0.64)
      );
      return { padX, padY, width, height };
    },
    clipRay: clipRayToEllipse,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 3.3 : 2.6;
      const strokes: StrokePath[] = [];

      const rx = width / 2;
      const ry = height / 2;
      const steps = 42;
      const pts: Point[] = [];
      const startAngle = -Math.PI * 0.55;
      const totalAngle = Math.PI * 2.08;
      const phase = rand() * Math.PI * 2;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = startAngle + totalAngle * t;
        const radialJitter =
          1 +
          Math.sin(ang * 3 + phase) * 0.025 +
          (rand() - 0.5) * 0.022;
        const spiral = 1 + (t - 0.5) * 0.02;
        pts.push({
          x: cx + Math.cos(ang) * rx * radialJitter * spiral,
          y: cy + Math.sin(ang) * ry * radialJitter * spiral,
        });
      }

      strokes.push(
        buildStrokePath(`${id}-circle-1`, pts, {
          width: baseWidth,
          color,
          opacity: 0.94,
          fillOpacity: 1,
          surfaceShadow: true,
          dashed,
          speedFactor: 1.1,
        })
      );

      if (emphasized) {
        const pts2: Point[] = [];
        for (let i = 0; i <= 34; i++) {
          const t = i / 34;
          const ang = startAngle + 0.35 + Math.PI * 1.92 * t;
          pts2.push({
            x: cx + Math.cos(ang) * (rx + 2.5 + (rand() - 0.5) * 3),
            y: cy + Math.sin(ang) * (ry + 2.5 + (rand() - 0.5) * 3),
          });
        }
        strokes.push(
          buildStrokePath(`${id}-circle-2`, pts2, {
            width: 1.9,
            color,
            opacity: 0.55,
            dashed,
            speedFactor: 1.35,
          })
        );
      }

      return strokes;
    },
  };
  return { circleShapePlugin };
})();

// --- Module: src/plugins/shapes/cloudShape.ts ---
const { cloudShapePlugin } = (() => {
  const cloudShapePlugin: ShapePlugin = {
    id: 'cloud',
    name: 'Cloud',
    measureBox(contentW, contentH) {
      const padX = 38;
      const padY = 26;
      return {
        padX,
        padY,
        width: Math.max(156, Math.ceil(contentW + padX * 2)),
        height: Math.max(76, Math.ceil(contentH + padY * 2)),
      };
    },
    clipRay: clipRayToRect,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 3.3 : 2.6;

      const bumps = 12;
      const rx = width * 0.45;
      const ry = height * 0.42;
      const pts: Point[] = [];
      const subSteps = 6;

      for (let b = 0; b < bumps; b++) {
        const a0 = (b / bumps) * Math.PI * 2 - Math.PI * 0.5;
        const a1 = ((b + 1) / bumps) * Math.PI * 2 - Math.PI * 0.5;
        const midA = (a0 + a1) / 2;
        const puffR = 11 + (rand() - 0.5) * 4;

        for (let s = 0; s < subSteps; s++) {
          const t = s / subSteps;
          const a = a0 + (a1 - a0) * t;
          const lobe = Math.sin(t * Math.PI) * puffR;
          const nx = Math.cos(midA);
          const ny = Math.sin(midA);
          pts.push({
            x: cx + Math.cos(a) * rx + nx * lobe + (rand() - 0.5) * 1.4,
            y: cy + Math.sin(a) * ry + ny * lobe + (rand() - 0.5) * 1.4,
          });
        }
      }
      if (pts.length > 0) pts.push({ ...pts[0] });

      return [
        buildStrokePath(`${id}-cloud`, pts, {
          width: baseWidth,
          color,
          opacity: 0.92,
          fillOpacity: 1,
          surfaceShadow: true,
          dashed,
          speedFactor: 1.15,
        }),
      ];
    },
  };
  return { cloudShapePlugin };
})();

// --- Module: src/plugins/shapes/underlineShape.ts ---
const { underlineShapePlugin } = (() => {
  const underlineShapePlugin: ShapePlugin = {
    id: 'underline',
    name: 'Underline',
    measureBox(contentW, contentH) {
      const padX = 20;
      const padY = 14;
      return {
        padX,
        padY,
        textOffsetY: -4,
        width: Math.max(128, Math.ceil(contentW + padX * 2)),
        height: Math.max(54, Math.ceil(contentH + padY * 2 + 6)),
      };
    },
    clipRay: clipRayToRect,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const x = cx - width / 2;
      const y = cy - height / 2;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 3.3 : 2.6;

      const lineY1 = y + height - 10;
      const lineY2 = lineY1 + 5.5;
      const leftX = x + 12;
      const rightX = x + width - 12;

      const u1 = sketchSegment(
        { x: leftX, y: lineY1 },
        { x: rightX, y: lineY1 - 1.2 },
        rand,
        1.3,
        14
      );
      const u2 = sketchSegment(
        { x: leftX + 8, y: lineY2 },
        { x: rightX - 6, y: lineY2 - 0.8 },
        rand,
        1.2,
        14
      );

      return [
        buildStrokePath(`${id}-ul-1`, u1, {
          width: baseWidth + 0.4,
          color,
          opacity: 0.95,
          dashed,
          speedFactor: 1.25,
        }),
        buildStrokePath(`${id}-ul-2`, u2, {
          width: 1.9,
          color,
          opacity: 0.72,
          dashed,
          speedFactor: 1.35,
        }),
      ];
    },
  };
  return { underlineShapePlugin };
})();

// --- Module: src/plugins/shapes/diamondShape.ts ---
const { diamondShapePlugin } = (() => {
  const diamondShapePlugin: ShapePlugin = {
    id: 'diamond',
    name: 'Diamond',
    maxTextWidth() {
      return 168;
    },
    measureBox(contentW, contentH) {
      const padX = 48;
      const padY = 34;
      return {
        padX,
        padY,
        width: Math.max(198, Math.ceil(contentW * 1.62 + 52)),
        height: Math.max(118, Math.ceil(contentH * 1.72 + 48)),
      };
    },
    clipRay: clipRayToDiamond,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const x = cx - width / 2;
      const y = cy - height / 2;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 3.3 : 2.6;

      const top = { x: cx, y };
      const right = { x: x + width, y: cy };
      const bottom = { x: cx, y: y + height };
      const left = { x, y: cy };

      const edges = [
        [top, right],
        [right, bottom],
        [bottom, left],
        [left, top],
      ];

      const pts: Point[] = [];
      edges.forEach(([a, b], idx) => {
        const seg = sketchSegment(a, b, rand, 1.5, 14);
        pts.push(...(idx === 0 ? seg : seg.slice(1)));
      });

      return [
        buildStrokePath(`${id}-diamond-1`, pts, {
          width: baseWidth,
          color,
          opacity: 0.94,
          fillOpacity: 1,
          surfaceShadow: true,
          dashed,
          speedFactor: 1.15,
        }),
      ];
    },
  };
  return { diamondShapePlugin };
})();

// --- Module: src/plugins/shapes/dividerShape.ts ---
const { dividerShapePlugin } = (() => {
  const dividerShapePlugin: ShapePlugin = {
    id: 'divider',
    name: 'Divider',
    measureBox(contentW, contentH) {
      const padX = 16;
      const padY = 8;
      return {
        padX,
        padY,
        width: Math.max(280, Math.ceil(contentW + 40)),
        height: Math.max(24, Math.ceil(contentH + 16)),
      };
    },
    clipRay: clipRayToRect,
    generateStrokes(input) {
      const { id, cx, cy, width, height, color, emphasized, dashed } = input;
      const rand = mulberry32(hashString(`shape:${id}`));
      const baseWidth = emphasized ? 2.6 : 2.0;

      const halfSpan = Math.max(24, width / 2 - 8);
      const centerGap = Math.min(14, halfSpan * 0.35);
      const rX = Math.max(4, centerGap * 0.52);
      const rY = Math.min(6, Math.max(3.5, height * 0.24));

      const leftPts = sketchSegment(
        { x: cx - halfSpan, y: cy },
        { x: cx - centerGap, y: cy + 0.4 },
        rand,
        0.85,
        16
      );

      const diamondPts: Point[] = [
        ...sketchSegment({ x: cx - rX, y: cy }, { x: cx, y: cy - rY }, rand, 0.4, 4),
        ...sketchSegment({ x: cx, y: cy - rY }, { x: cx + rX, y: cy }, rand, 0.4, 4).slice(1),
        ...sketchSegment({ x: cx + rX, y: cy }, { x: cx, y: cy + rY }, rand, 0.4, 4).slice(1),
        ...sketchSegment({ x: cx, y: cy + rY }, { x: cx - rX, y: cy }, rand, 0.4, 4).slice(1),
      ];

      const rightPts = sketchSegment(
        { x: cx + centerGap, y: cy - 0.3 },
        { x: cx + halfSpan, y: cy },
        rand,
        0.85,
        16
      );

      const strokes: StrokePath[] = [
        buildStrokePath(`${id}-div-left`, leftPts, {
          width: baseWidth,
          color,
          opacity: 0.78,
          dashed,
          speedFactor: 1.45,
        }),
        buildStrokePath(`${id}-div-center`, diamondPts, {
          width: baseWidth * 0.9,
          color,
          opacity: 0.88,
          speedFactor: 1.5,
        }),
        buildStrokePath(`${id}-div-right`, rightPts, {
          width: baseWidth,
          color,
          opacity: 0.78,
          dashed,
          speedFactor: 1.45,
        }),
      ];

      return strokes;
    },
  };
  return { dividerShapePlugin };
})();

// --- Module: src/model/builders.ts ---
const { createTextNode, createShapeNode, createConnectorNode, createCustomNode, createCardNode, getCardSummary } = (() => {
  function createTextNode(opts: {
    id: string;
    text: string;
    name?: string;
    color?: ChalkColor;
    fontSize?: number;
    fontWeight?: 400 | 700;
    maxWidth?: number;
    align?: TextAlign;
    indentChars?: number;
    offset?: Point;
    meta?: Record<string, string | number | boolean | undefined>;
  }): TextSceneNode {
    return {
      id: opts.id,
      type: 'text',
      name: opts.name ?? (opts.text.trim().slice(0, 18) || '文本'),
      color: opts.color ?? 'white',
      text: opts.text,
      fontSize: opts.fontSize,
      fontWeight: opts.fontWeight,
      maxWidth: opts.maxWidth,
      align: opts.align,
      indentChars: opts.indentChars,
      offset: opts.offset,
      meta: opts.meta,
    };
  }
  function createShapeNode(opts: {
    id: string;
    shape: NodeShape;
    name?: string;
    color?: ChalkColor;
    width?: number;
    height?: number;
    fitMode?: 'auto-group' | 'fixed';
    emphasized?: boolean;
    dashed?: boolean;
    offset?: Point;
  }): ShapeSceneNode {
    return {
      id: opts.id,
      type: 'shape',
      name: opts.name ?? `图形 (${opts.shape})`,
      color: opts.color ?? 'white',
      shape: opts.shape,
      width: opts.width,
      height: opts.height,
      fitMode: opts.fitMode ?? 'fixed',
      emphasized: opts.emphasized,
      dashed: opts.dashed,
      offset: opts.offset,
    };
  }
  function createConnectorNode(opts: {
    id: string;
    fromId?: string;
    toId?: string;
    fromPoint?: Point;
    toPoint?: Point;
    label?: string;
    style?: 'solid' | 'dashed';
    color?: ChalkColor;
    name?: string;
  }): ConnectorSceneNode {
    return {
      id: opts.id,
      type: 'connector',
      name:
        opts.name ??
        (opts.label ? `连线 · ${opts.label}` : '连线箭头'),
      color: opts.color ?? 'white',
      fromId: opts.fromId,
      toId: opts.toId,
      fromPoint: opts.fromPoint,
      toPoint: opts.toPoint,
      label: opts.label,
      style: opts.style ?? 'solid',
    };
  }
  function createCustomNode(opts: {
    id: string;
    kind: string;
    name?: string;
    color?: ChalkColor;
    props?: Record<string, string | number | boolean | undefined>;
    offset?: Point;
    meta?: Record<string, string | number | boolean | undefined>;
  }): CustomSceneNode {
    return {
      id: opts.id,
      type: `custom:${opts.kind}`,
      kind: opts.kind,
      name: opts.name ?? opts.kind,
      color: opts.color ?? 'white',
      props: opts.props ? { ...opts.props } : undefined,
      offset: opts.offset,
      meta: opts.meta,
    };
  }
  /**
   * Layer 2 Builder: constructs a classroom diagram card as a composite GroupSceneNode
   * containing optional shape + title text + optional subtitle text.
   */
  function createCardNode(opts: {
    id: string;
    label: string;
    subtitle?: string;
    role?: CardRole;
    color: ChalkColor;
    shape?: NodeShape;
    icon?: string;
    zone?: string;
    say?: string;
    pause?: number;
    offset?: Point;
    meta?: Record<string, string | number | boolean | undefined>;
  }): GroupSceneNode {
    const role: CardRole = opts.role ?? 'concept';
    const shape: NodeShape = opts.shape ?? 'rounded';
    const cleanIcon = opts.icon?.trim() ? opts.icon.trim().toLowerCase() : undefined;

    const titleFontSize =
      role === 'root'
        ? 25
        : role === 'highlight'
        ? 21
        : role === 'note'
        ? 18
        : 20;
    const subtitleFontSize = role === 'root' ? 14.5 : 13.5;

    const maxWidth =
      shape === 'circle'
        ? 162
        : shape === 'diamond'
        ? 168
        : role === 'root'
        ? 230
        : 210;

    const emphasized = role === 'root' || role === 'highlight';

    const iconNode: CustomSceneNode | null = cleanIcon
      ? {
          id: `${opts.id}-icon`,
          type: 'custom:icon',
          kind: 'icon',
          name: cleanIcon,
          color: opts.color,
          props: {
            icon: cleanIcon,
            size: role === 'root' ? 32 : 26,
          },
        }
      : null;

    const titleNode: TextSceneNode = {
      id: `${opts.id}-title`,
      type: 'text',
      name: opts.label || '标题文字',
      color: opts.color,
      text: opts.label,
      fontSize: titleFontSize,
      fontWeight: 700,
      maxWidth,
      align: 'center',
    };

    const subtitleNode: TextSceneNode | null = opts.subtitle
      ? {
          id: `${opts.id}-sub`,
          type: 'text',
          name: '副标题',
          color: 'white',
          text: opts.subtitle,
          fontSize: subtitleFontSize,
          fontWeight: 400,
          maxWidth: maxWidth + 18,
          align: 'center',
        }
      : null;

    const shapeNode: ShapeSceneNode | null =
      shape === 'none'
        ? null
        : {
            id: `${opts.id}-frame`,
            type: 'shape',
            name: `外框 (${shape})`,
            color: opts.color,
            shape,
            fitMode: 'auto-group',
            emphasized,
          };

    const contentNodes: SceneNode[] = [
      ...(iconNode ? [iconNode] : []),
      titleNode,
      ...(subtitleNode ? [subtitleNode] : []),
    ];

    // Child order naturally determines draw order:
    // underline draws after text; enclosed frames draw before text; shape === 'none' omits frame.
    const children: SceneNode[] = !shapeNode
      ? contentNodes
      : shape === 'underline'
      ? [...contentNodes, shapeNode]
      : [shapeNode, ...contentNodes];

    return {
      id: opts.id,
      type: 'group',
      name: opts.label,
      color: opts.color,
      arrange: 'card',
      gap: 6,
      offset: opts.offset,
      meta: {
        ...(opts.meta ?? {}),
        role,
        isCard: true,
        ...(cleanIcon ? { icon: cleanIcon } : {}),
        zone: opts.zone,
        ...(opts.say !== undefined ? { say: opts.say } : {}),
        ...(opts.pause !== undefined ? { pause: opts.pause } : {}),
      },
      children,
    };
  }
  function isCardGroupNode(node: SceneNode): node is GroupSceneNode {
    if (node.type !== 'group' || (node.arrange ?? 'card') !== 'card') {
      return false;
    }
    let shapeCount = 0;
    let textCount = 0;
    let iconCount = 0;
    for (const child of node.children) {
      if (child.type === 'shape') {
        shapeCount++;
      } else if (child.type === 'text') {
        textCount++;
      } else if (
        isCustomSceneNode(child) &&
        resolveCustomNodeKind(child) === 'icon'
      ) {
        iconCount++;
      } else {
        return false;
      }
    }
    return shapeCount <= 1 && iconCount <= 1 && textCount >= 1 && textCount <= 2;
  }
  function updateCardGroupNode(
    group: GroupSceneNode,
    patch: Partial<CardSummary> & { offset?: Point }
  ): GroupSceneNode {
    const current = getCardSummary(group);
    const nextLabel = patch.label !== undefined ? patch.label : current.label;
    const nextSubtitle =
      patch.subtitle !== undefined ? patch.subtitle : current.subtitle;
    const nextRole: CardRole = patch.role ?? current.role;
    const nextColor: ChalkColor = patch.color ?? current.color;
    const nextShape: NodeShape = patch.shape ?? current.shape;
    const nextIconRaw = patch.icon !== undefined ? patch.icon : current.icon;
    const nextIcon = nextIconRaw?.trim() ? nextIconRaw.trim().toLowerCase() : undefined;
    const nextZone = patch.zone !== undefined ? patch.zone : current.zone;
    const nextSay = patch.say !== undefined ? patch.say : current.say;
    const nextPause = patch.pause !== undefined ? patch.pause : current.pause;

    const titleFontSize =
      nextRole === 'root'
        ? 25
        : nextRole === 'highlight'
        ? 21
        : nextRole === 'note'
        ? 18
        : 20;
    const subtitleFontSize = nextRole === 'root' ? 14.5 : 13.5;

    const maxWidth =
      nextShape === 'circle'
        ? 162
        : nextShape === 'diamond'
        ? 168
        : nextRole === 'root'
        ? 230
        : 210;

    const emphasized = nextRole === 'root' || nextRole === 'highlight';

    const existingShape = group.children.find(
      (c): c is ShapeSceneNode => c.type === 'shape'
    );
    const existingIcon = group.children.find(
      (c): c is CustomSceneNode => isCustomSceneNode(c) && resolveCustomNodeKind(c) === 'icon'
    );
    const existingTexts = group.children.filter(
      (c): c is TextSceneNode => c.type === 'text'
    );
    const existingTitle = existingTexts[0];
    const existingSub = existingTexts[1];

    const iconNode: CustomSceneNode | null = nextIcon
      ? {
          ...(existingIcon ?? {}),
          id: existingIcon?.id ?? `${group.id}-icon`,
          type: 'custom:icon',
          kind: 'icon',
          name: nextIcon,
          color: nextColor,
          props: {
            icon: nextIcon,
            size: nextRole === 'root' ? 32 : 26,
          },
        }
      : null;

    const titleNode: TextSceneNode = {
      ...(existingTitle ?? {}),
      id: existingTitle?.id ?? `${group.id}-title`,
      type: 'text',
      name: nextLabel || '标题文字',
      color: nextColor,
      text: nextLabel,
      fontSize: titleFontSize,
      fontWeight: 700,
      maxWidth,
      align: 'center',
    };

    const trimmedSub = nextSubtitle?.trim() ? nextSubtitle : undefined;
    const subtitleNode: TextSceneNode | null = trimmedSub
      ? {
          ...(existingSub ?? {}),
          id: existingSub?.id ?? `${group.id}-sub`,
          type: 'text',
          name: '副标题',
          color: 'white',
          text: trimmedSub,
          fontSize: subtitleFontSize,
          fontWeight: 400,
          maxWidth: maxWidth + 18,
          align: 'center',
        }
      : null;

    const shapeNode: ShapeSceneNode | null =
      nextShape === 'none'
        ? null
        : {
            ...(existingShape ?? {}),
            id: existingShape?.id ?? `${group.id}-frame`,
            type: 'shape',
            name: `外框 (${nextShape})`,
            color: nextColor,
            shape: nextShape,
            fitMode: 'auto-group',
            emphasized,
          };

    const contentNodes: SceneNode[] = [
      ...(iconNode ? [iconNode] : []),
      titleNode,
      ...(subtitleNode ? [subtitleNode] : []),
    ];

    const children: SceneNode[] = !shapeNode
      ? contentNodes
      : nextShape === 'underline'
      ? [...contentNodes, shapeNode]
      : [shapeNode, ...contentNodes];

    const nextMeta: Record<string, string | number | boolean | undefined> = {
      ...(group.meta ?? {}),
      role: nextRole,
      isCard: true,
      icon: nextIcon,
      zone: nextZone || undefined,
      say: nextSay || undefined,
      pause:
        nextPause !== undefined && Number.isFinite(nextPause) && nextPause >= 0
          ? Math.round(nextPause)
          : undefined,
    };

    return {
      ...group,
      name: nextLabel,
      color: nextColor,
      arrange: 'card',
      gap: group.gap ?? 6,
      offset: patch.offset !== undefined ? patch.offset : group.offset,
      meta: nextMeta,
      children,
    };
  }
  function getCardSummary(node: SceneNode): CardSummary {
    const roleRaw = node.meta?.role;
    const role: CardRole =
      roleRaw === 'root' ||
      roleRaw === 'step' ||
      roleRaw === 'concept' ||
      roleRaw === 'highlight' ||
      roleRaw === 'note'
        ? roleRaw
        : 'concept';
    const zone =
      typeof node.meta?.zone === 'string' && node.meta.zone.trim()
        ? node.meta.zone
        : undefined;
    const iconFromMeta =
      typeof node.meta?.icon === 'string' && node.meta.icon.trim()
        ? node.meta.icon.trim()
        : undefined;
    const say =
      typeof node.meta?.say === 'string' && node.meta.say.trim()
        ? node.meta.say.trim()
        : undefined;
    const pause =
      typeof node.meta?.pause === 'number' &&
      Number.isFinite(node.meta.pause) &&
      node.meta.pause >= 0
        ? node.meta.pause
        : undefined;

    if (node.type === 'group') {
      const texts = node.children.filter(
        (c): c is TextSceneNode => c.type === 'text'
      );
      const frame = node.children.find(
        (c): c is ShapeSceneNode => c.type === 'shape'
      );
      const iconChild = node.children.find(
        (c): c is CustomSceneNode => isCustomSceneNode(c) && resolveCustomNodeKind(c) === 'icon'
      );
      const icon =
        (typeof iconChild?.props?.icon === 'string' && iconChild.props.icon.trim()
          ? iconChild.props.icon.trim()
          : undefined) ?? iconFromMeta;
      const titleText = texts[0]?.text ?? node.name;
      const subText = texts[1]?.text;
      return {
        label: titleText,
        subtitle: subText,
        role,
        color: texts[0]?.color ?? node.color,
        shape: frame?.shape ?? 'none',
        icon,
        zone,
        say,
        pause,
      };
    }

    if (node.type === 'text') {
      return {
        label: node.text,
        role,
        color: node.color,
        shape: 'none',
        zone,
        say,
        pause,
      };
    }

    if (node.type === 'shape') {
      return {
        label: node.name,
        role,
        color: node.color,
        shape: node.shape,
        zone,
        say,
        pause,
      };
    }

    if (isCustomSceneNode(node)) {
      return {
        label: node.name,
        role,
        color: node.color,
        shape: 'none',
        zone,
        say,
        pause,
      };
    }

    return {
      label: node.name,
      role,
      color: node.color,
      shape: 'rounded',
      zone,
      say,
      pause,
    };
  }
  return { createTextNode, createShapeNode, createConnectorNode, createCustomNode, createCardNode, getCardSummary };
})();

// --- Module: src/plugins/codecs/shared.ts ---
const { stripMarkdownFence, splitMetaPairs, unquoteMetaString, formatMetaString, extractTrailingMetaBlock } = (() => {
  /**
   * Strips an outer Markdown fenced code block (``` or ~~~) when external tools
   * or pasted snippets wrap the entire script in triple backticks/tildes.
   */
  function stripMarkdownFence(raw: string): string {
    const normalized = raw.replace(/\r\n/g, '\n').trim();
    const fenceMatch = normalized.match(
      /^(```|~~~)[^\n]*\n([\s\S]*?)\n\1\s*$/
    );
    if (fenceMatch) {
      return fenceMatch[2];
    }
    return raw;
  }
  /**
   * Splits a `{k1: v1, k2: v2}` metadata body on `,` / `，` / `;` / `；`
   * while respecting single/double quoted strings and backslash escapes.
   */
  function splitMetaPairs(metaRaw: string): string[] {
    const pairs: string[] = [];
    let current = '';
    let quoteChar: '"' | "'" | null = null;
    let escaped = false;

    for (let i = 0; i < metaRaw.length; i++) {
      const ch = metaRaw[i];
      if (escaped) {
        current += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        current += ch;
        escaped = true;
        continue;
      }
      if (quoteChar) {
        current += ch;
        if (ch === quoteChar) {
          quoteChar = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        current += ch;
        quoteChar = ch;
        continue;
      }
      if (ch === ',' || ch === '，' || ch === ';' || ch === '；') {
        const trimmed = current.trim();
        if (trimmed) pairs.push(trimmed);
        current = '';
        continue;
      }
      current += ch;
    }

    const tail = current.trim();
    if (tail) pairs.push(tail);
    return pairs;
  }
  function unquoteMetaString(raw: string): string {
    const trimmed = raw.trim();
    let inner = trimmed;
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
    ) {
      inner = trimmed.slice(1, -1);
    }
    return inner.replace(/\\(n|"|'|\\)/g, (_, ch: string) =>
      ch === 'n' ? '\n' : ch
    );
  }
  function formatMetaString(raw: string): string {
    const trimmed = raw.trim();
    const needsQuoting =
      /[\r\n,，;；:{}"'\\]/.test(trimmed) ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      (trimmed !== '' && !Number.isNaN(Number(trimmed)));
    if (needsQuoting) {
      const escaped = trimmed
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '\\n');
      return `"${escaped}"`;
    }
    return trimmed;
  }
  /**
   * Extracts a trailing `{...}` metadata block while ignoring apostrophes,
   * quotes, or unmatched `{` in the body text outside the trailing block.
   */
  function extractTrailingMetaBlock(
    text: string
  ): { body: string; metaRaw: string } | null {
    const trimmed = text.trimEnd();
    if (!trimmed.endsWith('}')) return null;

    for (let start = 0; start < trimmed.length; start++) {
      if (trimmed[start] !== '{') continue;

      let quote: '"' | "'" | null = null;
      let depth = 0;
      let matchedEnd = -1;

      for (let i = start; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (quote) {
          if (ch === '\\') {
            i++;
          } else if (ch === quote) {
            quote = null;
          }
          continue;
        }
        if (depth > 0 && (ch === '"' || ch === "'")) {
          quote = ch;
          continue;
        }
        if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            matchedEnd = i;
            break;
          }
        }
      }

      if (matchedEnd === trimmed.length - 1 && quote === null) {
        return {
          body: trimmed.slice(0, start).trimEnd(),
          metaRaw: trimmed.slice(start + 1, matchedEnd),
        };
      }
    }

    return null;
  }
  return { stripMarkdownFence, splitMetaPairs, unquoteMetaString, formatMetaString, extractTrailingMetaBlock };
})();

// --- Module: src/plugins/codecs/scriptParser.ts ---
const { parseScriptToScene, serializeNodeLines, serializeConnectorLines, graphScriptCodec } = (() => {
  const VALID_ROLES = new Set<CardRole>([
    'root',
    'step',
    'concept',
    'highlight',
    'note',
  ]);
  const VALID_COLORS = new Set<ChalkColor>([
    'white',
    'yellow',
    'cyan',
    'pink',
    'green',
    'orange',
  ]);
  const VALID_ALIGNS = new Set<TextAlign>(['left', 'center', 'right']);
  const VALID_ARRANGES = new Set<'card' | 'stack' | 'free'>([
    'card',
    'stack',
    'free',
  ]);
  const BUILTIN_SHAPES = new Set<string>([
    'rounded',
    'circle',
    'cloud',
    'underline',
    'diamond',
    'divider',
    'none',
  ]);
  const COORD_PAIR_REGEX =
    /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;
  function isKnownShape(shape: string): boolean {
    return shapeRegistry.has(shape) || BUILTIN_SHAPES.has(shape);
  }
  const DEFAULT_COLOR_BY_ROLE: Record<CardRole, ChalkColor> = {
    root: 'yellow',
    step: 'cyan',
    concept: 'white',
    highlight: 'orange',
    note: 'green',
  };
  function escapeInlineText(raw: string): string {
    return raw.replace(/\r?\n/g, '\\n').trim();
  }
  function unescapeInlineText(raw: string): string {
    return raw.replace(/\\n/g, '\n');
  }
  function escapeCardTitle(raw: string): string {
    return escapeInlineText(raw).replace(/\|/g, '\\|');
  }
  function findUnescapedPipe(raw: string): number {
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '|' && raw[i - 1] !== '\\') {
        return i;
      }
    }
    return -1;
  }
  function hasAmbiguousConnectorChars(label: string): boolean {
    return (
      label.includes(':') ||
      label.includes('：') ||
      label.includes('->') ||
      label.includes('-.->') ||
      label.includes('|')
    );
  }
  function sanitizeIdFragment(label: string): string {
    const cleaned = label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '');
    return cleaned.slice(0, 18) || 'node';
  }
  function parseMetaValue(raw: string): string | number | boolean {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw !== '' && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
    return raw;
  }
  function parseBooleanFlag(val: string): boolean | undefined {
    const lower = val.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === '700') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === '400') {
      return false;
    }
    return undefined;
  }
  function parseMetaBlock(
    metaRaw: string,
    lineNum: number,
    warnings: string[],
    allowCustomProps = false
  ): ParsedMetaBlock {
    const result: ParsedMetaBlock = {};
    const pairs = splitMetaPairs(metaRaw);

    for (const pair of pairs) {
      const colonIdx = pair.search(/[:：]/);
      if (colonIdx === -1) {
        warnings.push(
          `第 ${lineNum} 行属性格式无效："${pair}"，应为 key: value`
        );
        continue;
      }
      const rawKey = pair.slice(0, colonIdx).trim();
      const key = rawKey.toLowerCase();
      const val = pair.slice(colonIdx + 1).trim();

      if (key === 'color' || key === '颜色') {
        const lower = val.toLowerCase() as ChalkColor;
        if (VALID_COLORS.has(lower)) {
          result.color = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知颜色 "${val}"`);
        }
      } else if (key === 'group' || key === 'zone' || key === '分组') {
        const zoneVal = unquoteMetaString(val).trim();
        if (zoneVal) result.zone = zoneVal;
      } else if (key === 'x') {
        const num = Number(val);
        if (Number.isFinite(num)) {
          result.x = num;
        } else {
          warnings.push(`第 ${lineNum} 行坐标 x 无效："${val}"`);
        }
      } else if (key === 'y') {
        const num = Number(val);
        if (Number.isFinite(num)) {
          result.y = num;
        } else {
          warnings.push(`第 ${lineNum} 行坐标 y 无效："${val}"`);
        }
      } else if (
        key === 'say' ||
        (!allowCustomProps && key === 'caption') ||
        key === '字幕' ||
        key === '讲解'
      ) {
        const textVal = unquoteMetaString(val).trim();
        if (textVal) result.say = textVal;
      } else if (key === 'pause' || key === 'pausems' || key === '停顿') {
        const num = Number(val);
        if (Number.isFinite(num) && num >= 0) {
          result.pause = Math.round(num);
        } else {
          warnings.push(`第 ${lineNum} 行停顿时长无效："${val}"`);
        }
      } else if (allowCustomProps) {
        if (!result.props) result.props = {};
        const isQuoted =
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"));
        result.props[rawKey] = isQuoted
          ? unquoteMetaString(val)
          : parseMetaValue(val);
      } else if (key === 'shape' || key === '形状') {
        const lower = val.toLowerCase() as NodeShape;
        if (isKnownShape(lower)) {
          result.shape = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知形状 "${val}"`);
        }
      } else if (key === 'icon' || key === '图标') {
        const iconVal = unquoteMetaString(val).trim().toLowerCase();
        if (iconVal) result.icon = iconVal;
      } else if (key === 'role' || key === '角色') {
        const lower = val.toLowerCase() as CardRole;
        if (VALID_ROLES.has(lower)) {
          result.role = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知角色 "${val}"`);
        }
      } else if (key === 'w' || key === 'width') {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          result.width = num;
        } else {
          warnings.push(`第 ${lineNum} 行宽度无效："${val}"`);
        }
      } else if (key === 'h' || key === 'height') {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          result.height = num;
        } else {
          warnings.push(`第 ${lineNum} 行高度无效："${val}"`);
        }
      } else if (key === 'size' || key === 'fontsize' || key === '字号') {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          result.fontSize = num;
        } else {
          warnings.push(`第 ${lineNum} 行字号无效："${val}"`);
        }
      } else if (key === 'align' || key === '对齐') {
        const lower = val.toLowerCase() as TextAlign;
        if (VALID_ALIGNS.has(lower)) {
          result.align = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知对齐方式 "${val}"`);
        }
      } else if (key === 'bold' || key === '加粗') {
        const b = parseBooleanFlag(val);
        if (b !== undefined) {
          result.bold = b;
        } else {
          warnings.push(`第 ${lineNum} 行 bold 值无效："${val}"`);
        }
      } else if (key === 'maxw' || key === 'maxwidth' || key === '行宽') {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          result.maxWidth = num;
        } else {
          warnings.push(`第 ${lineNum} 行行宽无效："${val}"`);
        }
      } else if (key === 'indent' || key === 'indentchars' || key === '缩进') {
        const num = Number(val);
        if (Number.isFinite(num) && num >= 0) {
          result.indentChars = num;
        } else {
          warnings.push(`第 ${lineNum} 行缩进值无效："${val}"`);
        }
      } else if (key === 'fit' || key === 'fitmode') {
        const lower = val.toLowerCase();
        if (lower === 'auto-group' || lower === 'fixed') {
          result.fitMode = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知 fit 模式 "${val}"`);
        }
      } else if (key === 'emphasized' || key === '强调') {
        const b = parseBooleanFlag(val);
        if (b !== undefined) {
          result.emphasized = b;
        } else {
          warnings.push(`第 ${lineNum} 行 emphasized 值无效："${val}"`);
        }
      } else if (key === 'dashed' || key === '虚线') {
        const b = parseBooleanFlag(val);
        if (b !== undefined) {
          result.dashed = b;
        } else {
          warnings.push(`第 ${lineNum} 行 dashed 值无效："${val}"`);
        }
      } else if (key === 'arrange' || key === '排列') {
        const lower = val.toLowerCase() as 'card' | 'stack' | 'free';
        if (VALID_ARRANGES.has(lower)) {
          result.arrange = lower;
        } else {
          warnings.push(`第 ${lineNum} 行未知排列方式 "${val}"`);
        }
      } else if (key === 'gap' || key === '间距') {
        const num = Number(val);
        if (Number.isFinite(num) && num >= 0) {
          result.gap = num;
        } else {
          warnings.push(`第 ${lineNum} 行间距值无效："${val}"`);
        }
      } else {
        warnings.push(`第 ${lineNum} 行未知属性 "${rawKey}"`);
      }
    }

    return result;
  }
  function buildNodeMeta(
    d: NodeDraft,
    includeRole = false
  ): Record<string, string | number | boolean | undefined> | undefined {
    const meta: Record<string, string | number | boolean | undefined> = {};
    if (includeRole && d.explicitRole) meta.role = d.explicitRole;
    if (d.zone) meta.zone = d.zone;
    if (d.say !== undefined) meta.say = d.say;
    if (d.pause !== undefined) meta.pause = d.pause;
    return Object.keys(meta).length > 0 ? meta : undefined;
  }
  function buildNodeFromDraft(d: NodeDraft): SceneNode {
    if (d.draftType === 'text') {
      return createTextNode({
        id: d.id,
        text: d.label,
        color: d.color,
        fontSize: d.fontSize ?? 21,
        fontWeight: d.bold ? 700 : 400,
        maxWidth: d.maxWidth,
        align: d.align ?? 'center',
        indentChars: d.indentChars,
        offset: d.offset,
        meta: buildNodeMeta(d),
      });
    }
    if (d.draftType === 'shape') {
      const shapeNode = createShapeNode({
        id: d.id,
        shape: d.shape,
        name: d.label,
        color: d.color,
        width: d.width,
        height: d.height,
        fitMode: d.fitMode ?? 'fixed',
        emphasized: d.emphasized,
        dashed: d.dashed,
        offset: d.offset,
      });
      const meta = buildNodeMeta(d);
      if (meta) shapeNode.meta = meta;
      return shapeNode;
    }
    if (d.draftType === 'custom') {
      return createCustomNode({
        id: d.id,
        kind: d.customKind ?? 'custom',
        name: d.label,
        color: d.color,
        props: d.customProps,
        offset: d.offset,
        meta: buildNodeMeta(d),
      });
    }
    if (d.draftType === 'group') {
      return {
        id: d.id,
        type: 'group',
        name: d.label,
        color: d.color,
        arrange: d.arrange ?? 'card',
        gap: d.gap,
        offset: d.offset,
        meta: buildNodeMeta(d, true),
        children: (d.childrenDrafts ?? []).map(buildNodeFromDraft),
      };
    }
    return createCardNode(d);
  }
  function parseScriptToScene(
    script: string,
    base: LessonScene
  ): { scene: LessonScene; warnings: string[] } {
    const warnings: string[] = [];
    const lines = stripMarkdownFence(script).replace(/\r\n/g, '\n').split('\n');

    let title = base.title;
    const existingByLabel = new Map<
      string,
      { node: SceneNode; summary: ReturnType<typeof getCardSummary> }
    >();
    const existingById = new Map<
      string,
      { node: SceneNode; summary: ReturnType<typeof getCardSummary> }
    >();
    const registerExisting = (nodes: SceneNode[], isTopLevel: boolean) => {
      for (const oldNode of nodes) {
        if (oldNode.type === 'connector') continue;
        const summary = getCardSummary(oldNode);
        const entry = { node: oldNode, summary };
        existingById.set(oldNode.id, entry);
        if (isTopLevel) {
          existingByLabel.set(summary.label.trim(), entry);
        }
        if (oldNode.type === 'group') {
          registerExisting(oldNode.children, false);
        }
      }
    };
    registerExisting(base.nodes, true);

    const nodeDrafts: NodeDraft[] = [];
    const draftByLabel = new Map<string, NodeDraft>();
    const draftById = new Map<string, NodeDraft>();
    const usedIds = new Set<string>();
    const usedPrevChildIds = new Set<string>();
    const connectors: ConnectorSceneNode[] = [];
    const groupStack: Array<{ depth: number; draft: NodeDraft }> = [];

    const allocateId = (label: string, existingId?: string): string => {
      if (existingId && !usedIds.has(existingId)) {
        usedIds.add(existingId);
        return existingId;
      }
      const stem = sanitizeIdFragment(label);
      let candidate = `n-${stem}`;
      let counter = 2;
      while (usedIds.has(candidate)) {
        candidate = `n-${stem}-${counter++}`;
      }
      usedIds.add(candidate);
      return candidate;
    };

    const ensureDraftByLabel = (ref: string): NodeDraft => {
      const clean = ref.trim();
      if (clean.startsWith('#')) {
        const byHashId = draftById.get(clean.slice(1));
        if (byHashId) return byHashId;
      }
      const byExactId = draftById.get(clean);
      if (byExactId) return byExactId;

      const found = draftByLabel.get(clean);
      if (found) return found;

      const prev = existingByLabel.get(clean);
      const prevNode = prev?.node;
      const draftType: NodeDraft['draftType'] = prevNode
        ? prevNode.type === 'text'
          ? 'text'
          : prevNode.type === 'shape'
          ? 'shape'
          : isCustomSceneNode(prevNode)
          ? 'custom'
          : 'card'
        : 'card';

      const draft: NodeDraft = prev
        ? {
            id: allocateId(clean, prev.node.id),
            draftType,
            label: clean,
            subtitle: prev.summary.subtitle,
            role: prev.summary.role,
            color: prev.summary.color,
            shape: prev.summary.shape,
            icon: prev.summary.icon,
            zone: prev.summary.zone,
            say: prev.summary.say,
            pause: prev.summary.pause,
            offset: prev.node.offset ? { ...prev.node.offset } : undefined,
            width: prevNode?.type === 'shape' ? prevNode.width : undefined,
            height: prevNode?.type === 'shape' ? prevNode.height : undefined,
            fontSize: prevNode?.type === 'text' ? prevNode.fontSize : undefined,
            align: prevNode?.type === 'text' ? prevNode.align : undefined,
            bold:
              prevNode?.type === 'text' ? prevNode.fontWeight === 700 : undefined,
            maxWidth: prevNode?.type === 'text' ? prevNode.maxWidth : undefined,
            indentChars:
              prevNode?.type === 'text' ? prevNode.indentChars : undefined,
            customKind:
              prevNode && isCustomSceneNode(prevNode)
                ? resolveCustomNodeKind(prevNode)
                : undefined,
            customProps:
              prevNode && isCustomSceneNode(prevNode) && prevNode.props
                ? { ...prevNode.props }
                : undefined,
          }
        : {
            id: allocateId(clean),
            draftType: 'card',
            label: clean,
            role: 'concept',
            color: 'white',
            shape: 'rounded',
          };

      nodeDrafts.push(draft);
      draftById.set(draft.id, draft);
      draftByLabel.set(clean, draft);
      return draft;
    };

    lines.forEach((rawLine, idx) => {
      const lineNum = idx + 1;
      const indentMatch = rawLine.match(/^( *)/);
      const depth = Math.floor((indentMatch ? indentMatch[1].length : 0) / 2);
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) return;

      if (/^#+\s+/.test(line)) {
        const parsedTitle = line.replace(/^#+\s+/, '').trim();
        if (parsedTitle) {
          title = parsedTitle;
        }
        return;
      }

      const outerMetaSplit = extractTrailingMetaBlock(line);
      const lineWithoutMeta = outerMetaSplit ? outerMetaSplit.body : line;
      const hasCardPrefix =
        /^\[[a-zA-Z0-9_:-]+(?:#[a-zA-Z0-9_:-]+)?\]\s+/.test(line);
      const hasMetaSuffix = outerMetaSplit !== null;
      const rawPipeIdx = findUnescapedPipe(lineWithoutMeta);
      const arrowIdx = lineWithoutMeta.search(/-\.->|->/);
      const hasPipeBeforeArrow =
        rawPipeIdx !== -1 && (arrowIdx === -1 || rawPipeIdx < arrowIdx);
      const isExplicitCardLine =
        hasCardPrefix ||
        hasPipeBeforeArrow ||
        (hasMetaSuffix && arrowIdx === -1);

      // Edge/connector line: A -> B : 说明 {color: pink}  OR  (x1, y1) -> (x2, y2) : 说明
      const edgeMatch = !isExplicitCardLine
        ? line.match(/^(.+?)\s*(-\.->|->)\s*(.+)$/)
        : null;
      if (edgeMatch) {
        const fromLabel = unescapeInlineText(edgeMatch[1].trim());
        const arrow = edgeMatch[2];
        let rhs = edgeMatch[3].trim();

        let edgeMeta: ParsedMetaBlock = {};
        const edgeMetaSplit = extractTrailingMetaBlock(rhs);
        if (edgeMetaSplit) {
          edgeMeta = parseMetaBlock(edgeMetaSplit.metaRaw, lineNum, warnings, false);
          rhs = edgeMetaSplit.body.trim();
        }

        let toLabel = rhs;
        let edgeLabel: string | undefined;

        const unescapedFullRhs = unescapeInlineText(rhs);
        const exactRhsMatch =
          draftByLabel.has(unescapedFullRhs) ||
          existingByLabel.has(unescapedFullRhs) ||
          (rhs.startsWith('#') && draftById.has(rhs.slice(1)));

        if (!exactRhsMatch) {
          const labelSepIdx = rhs.search(/[:：]/);
          if (labelSepIdx !== -1) {
            toLabel = rhs.slice(0, labelSepIdx).trim();
            const rawEdgeLabel = rhs.slice(labelSepIdx + 1).trim();
            if (rawEdgeLabel) edgeLabel = unescapeInlineText(rawEdgeLabel);
          }
        }
        toLabel = unescapeInlineText(toLabel);

        if (!fromLabel || !toLabel) {
          warnings.push(`第 ${lineNum} 行连线缺少起点或终点`);
          return;
        }

        const edgeOffset: Point | undefined =
          edgeMeta.x !== undefined || edgeMeta.y !== undefined
            ? { x: edgeMeta.x ?? 0, y: edgeMeta.y ?? 0 }
            : undefined;

        const fromCoord = fromLabel.match(COORD_PAIR_REGEX);
        const toCoord = toLabel.match(COORD_PAIR_REGEX);
        if (fromCoord && toCoord) {
          const freeConn = createConnectorNode({
            id: `e-${connectors.length + 1}-free`,
            fromPoint: { x: Number(fromCoord[1]), y: Number(fromCoord[2]) },
            toPoint: { x: Number(toCoord[1]), y: Number(toCoord[2]) },
            label: edgeLabel,
            style: arrow === '-.->' ? 'dashed' : 'solid',
            color: edgeMeta.color ?? 'white',
          });
          if (edgeOffset) freeConn.offset = edgeOffset;
          connectors.push(freeConn);
          return;
        }

        const fromDraft = ensureDraftByLabel(fromLabel);
        const toDraft = ensureDraftByLabel(toLabel);

        const boundConn = createConnectorNode({
          id: `e-${connectors.length + 1}-${fromDraft.id}-${toDraft.id}`,
          fromId: fromDraft.id,
          toId: toDraft.id,
          label: edgeLabel,
          style: arrow === '-.->' ? 'dashed' : 'solid',
          color: edgeMeta.color ?? fromDraft.color,
        });
        if (edgeOffset) boundConn.offset = edgeOffset;
        connectors.push(boundConn);
        return;
      }

      // Pop active groups down to current indentation depth
      while (
        groupStack.length > 0 &&
        groupStack[groupStack.length - 1].depth >= depth
      ) {
        groupStack.pop();
      }
      const parentGroup =
        groupStack.length > 0
          ? groupStack[groupStack.length - 1].draft
          : undefined;

      // Node declaration
      let body = line;
      let draftType: NodeDraft['draftType'] | undefined;
      let role: CardRole | undefined;
      let explicitShape: NodeShape | undefined;
      let explicitId: string | undefined;
      let customKind: string | undefined;

      const kindMatch = body.match(
        /^\[([a-zA-Z0-9_:-]+?)(?:#([a-zA-Z0-9_:-]+))?\]\s*(.+)$/
      );
      if (kindMatch) {
        const rawTag = kindMatch[1];
        const tagLower = rawTag.toLowerCase();
        explicitId = kindMatch[2]?.trim() || undefined;

        if (tagLower === 'text') {
          draftType = 'text';
        } else if (tagLower === 'group') {
          draftType = 'group';
        } else if (tagLower.startsWith('shape:')) {
          const shapeId = rawTag.slice('shape:'.length).trim().toLowerCase();
          draftType = 'shape';
          if (isKnownShape(shapeId) && shapeId !== 'none') {
            explicitShape = shapeId as NodeShape;
          } else {
            warnings.push(`第 ${lineNum} 行未知独立图形 "${shapeId}"，已转为 rounded`);
            explicitShape = 'rounded';
          }
        } else if (tagLower.startsWith('node:')) {
          draftType = 'custom';
          customKind = rawTag.slice('node:'.length).trim();
          if (!customKind) {
            warnings.push(`第 ${lineNum} 行自定义节点缺少类型名称 [node:<kind>]`);
            customKind = 'custom';
          }
        } else {
          draftType = 'card';
          const candidateRole = tagLower as CardRole;
          if (VALID_ROLES.has(candidateRole)) {
            role = candidateRole;
          } else {
            warnings.push(
              `第 ${lineNum} 行未知节点类型 "[${rawTag}]"，已默认转为 concept`
            );
            role = 'concept';
          }
        }
        body = kindMatch[3].trim();
      }

      let meta: ParsedMetaBlock = {};
      const nodeMetaSplit = extractTrailingMetaBlock(body);
      if (nodeMetaSplit) {
        meta = parseMetaBlock(
          nodeMetaSplit.metaRaw,
          lineNum,
          warnings,
          draftType === 'custom'
        );
        body = nodeMetaSplit.body.trim();
      }

      let label = body;
      let subtitle: string | undefined;
      const pipeIdx = findUnescapedPipe(body);
      if (pipeIdx !== -1 && (draftType === undefined || draftType === 'card')) {
        label = body.slice(0, pipeIdx).trim();
        const sub = body.slice(pipeIdx + 1).trim();
        if (sub) subtitle = unescapeInlineText(sub);
      }
      label = unescapeInlineText(label).replace(/\\\|/g, '|');

      if (!label) {
        warnings.push(`第 ${lineNum} 行节点名称为空，已跳过`);
        return;
      }

      if (parentGroup) {
        const childDraftType = draftType ?? 'text';
        const childRole = role ?? meta.role ?? 'concept';
        let matchedPrevChildId: string | undefined = explicitId;
        if (!matchedPrevChildId) {
          const prevParent = existingById.get(parentGroup.id)?.node;
          if (prevParent?.type === 'group') {
            const idxInParent = parentGroup.childrenDrafts?.length ?? 0;
            const byLabel = prevParent.children.find(
              (c) =>
                !usedPrevChildIds.has(c.id) &&
                getCardSummary(c).label.trim() === label
            );
            const candidateAtIdx = prevParent.children[idxInParent];
            const byIdx =
              candidateAtIdx &&
              !usedPrevChildIds.has(candidateAtIdx.id) &&
              (candidateAtIdx.type === childDraftType ||
                (childDraftType === 'card' && candidateAtIdx.type === 'group'))
                ? candidateAtIdx
                : undefined;
            matchedPrevChildId = (byLabel ?? byIdx)?.id;
          }
        }
        if (matchedPrevChildId) {
          usedPrevChildIds.add(matchedPrevChildId);
        }
        const childDraft: NodeDraft = {
          id: allocateId(label, matchedPrevChildId),
          explicitId,
          draftType: childDraftType,
          label,
          subtitle,
          role: childRole,
          explicitRole: meta.role,
          color: meta.color ?? 'white',
          shape: explicitShape ?? meta.shape ?? 'rounded',
          icon: meta.icon,
          zone: meta.zone,
          say: meta.say,
          pause: meta.pause,
          offset:
            meta.x !== undefined || meta.y !== undefined
              ? { x: meta.x ?? 0, y: meta.y ?? 0 }
              : undefined,
          width: meta.width,
          height: meta.height,
          fontSize: meta.fontSize,
          align: meta.align,
          bold: meta.bold,
          maxWidth: meta.maxWidth,
          indentChars: meta.indentChars,
          fitMode: meta.fitMode,
          emphasized: meta.emphasized,
          dashed: meta.dashed,
          arrange: meta.arrange,
          gap: meta.gap,
          childrenDrafts: childDraftType === 'group' ? [] : undefined,
          customKind,
          customProps: meta.props,
        };
        if (!parentGroup.childrenDrafts) parentGroup.childrenDrafts = [];
        parentGroup.childrenDrafts.push(childDraft);
        draftById.set(childDraft.id, childDraft);
        draftByLabel.set(`#${childDraft.id}`, childDraft);
        if (!draftByLabel.has(label)) {
          draftByLabel.set(label, childDraft);
        }
        if (childDraftType === 'group') {
          groupStack.push({ depth, draft: childDraft });
        }
        return;
      }

      const existing = explicitId
        ? draftById.get(explicitId)
        : draftByLabel.get(label);
      const prev = explicitId
        ? existingById.get(explicitId)
        : existingByLabel.get(label);
      const resolvedDraftType = draftType ?? existing?.draftType ?? 'card';
      const resolvedRole =
        role ?? meta.role ?? existing?.role ?? prev?.summary.role ?? 'concept';
      const resolvedColor =
        meta.color ??
        existing?.color ??
        prev?.summary.color ??
        (resolvedDraftType === 'card'
          ? DEFAULT_COLOR_BY_ROLE[resolvedRole]
          : 'white');
      const resolvedShape =
        explicitShape ??
        meta.shape ??
        existing?.shape ??
        prev?.summary.shape ??
        'rounded';
      const resolvedIcon = meta.icon ?? existing?.icon ?? prev?.summary.icon;
      const resolvedZone = meta.zone ?? existing?.zone ?? prev?.summary.zone;
      const resolvedSay = meta.say ?? existing?.say ?? prev?.summary.say;
      const resolvedPause = meta.pause ?? existing?.pause ?? prev?.summary.pause;
      const resolvedOffset: Point | undefined =
        meta.x !== undefined || meta.y !== undefined
          ? {
              x: meta.x ?? existing?.offset?.x ?? prev?.node.offset?.x ?? 0,
              y: meta.y ?? existing?.offset?.y ?? prev?.node.offset?.y ?? 0,
            }
          : existing?.offset ??
            (prev?.node.offset ? { ...prev.node.offset } : undefined);

      if (existing) {
        existing.draftType = resolvedDraftType;
        existing.role = resolvedRole;
        if (meta.role) existing.explicitRole = meta.role;
        existing.color = resolvedColor;
        existing.shape = resolvedShape;
        if (resolvedIcon !== undefined) existing.icon = resolvedIcon;
        if (subtitle !== undefined) existing.subtitle = subtitle;
        if (resolvedZone !== undefined) existing.zone = resolvedZone;
        if (resolvedSay !== undefined) existing.say = resolvedSay;
        if (resolvedPause !== undefined) existing.pause = resolvedPause;
        if (resolvedOffset !== undefined) existing.offset = resolvedOffset;
        if (meta.width !== undefined) existing.width = meta.width;
        if (meta.height !== undefined) existing.height = meta.height;
        if (meta.fontSize !== undefined) existing.fontSize = meta.fontSize;
        if (meta.align !== undefined) existing.align = meta.align;
        if (meta.bold !== undefined) existing.bold = meta.bold;
        if (meta.maxWidth !== undefined) existing.maxWidth = meta.maxWidth;
        if (meta.indentChars !== undefined)
          existing.indentChars = meta.indentChars;
        if (meta.fitMode !== undefined) existing.fitMode = meta.fitMode;
        if (meta.emphasized !== undefined) existing.emphasized = meta.emphasized;
        if (meta.dashed !== undefined) existing.dashed = meta.dashed;
        if (meta.arrange !== undefined) existing.arrange = meta.arrange;
        if (meta.gap !== undefined) existing.gap = meta.gap;
        if (customKind) existing.customKind = customKind;
        if (meta.props) {
          existing.customProps = {
            ...(existing.customProps ?? {}),
            ...meta.props,
          };
        }
        if (resolvedDraftType === 'group') {
          if (!existing.childrenDrafts) existing.childrenDrafts = [];
          groupStack.push({ depth, draft: existing });
        }
      } else {
        const prevNode = prev?.node;
        const draft: NodeDraft = {
          id: allocateId(label, explicitId ?? prevNode?.id),
          explicitId,
          draftType: resolvedDraftType,
          label,
          subtitle,
          role: resolvedRole,
          explicitRole: meta.role,
          color: resolvedColor,
          shape: resolvedShape,
          icon: resolvedIcon,
          zone: resolvedZone,
          say: resolvedSay,
          pause: resolvedPause,
          offset: resolvedOffset,
          width:
            meta.width ?? (prevNode?.type === 'shape' ? prevNode.width : undefined),
          height:
            meta.height ?? (prevNode?.type === 'shape' ? prevNode.height : undefined),
          fontSize:
            meta.fontSize ??
            (prevNode?.type === 'text' ? prevNode.fontSize : undefined),
          align:
            meta.align ?? (prevNode?.type === 'text' ? prevNode.align : undefined),
          bold:
            meta.bold ??
            (prevNode?.type === 'text' ? prevNode.fontWeight === 700 : undefined),
          maxWidth:
            meta.maxWidth ??
            (prevNode?.type === 'text' ? prevNode.maxWidth : undefined),
          indentChars:
            meta.indentChars ??
            (prevNode?.type === 'text' ? prevNode.indentChars : undefined),
          fitMode:
            meta.fitMode ??
            (prevNode?.type === 'shape' ? prevNode.fitMode : undefined),
          emphasized:
            meta.emphasized ??
            (prevNode?.type === 'shape' ? prevNode.emphasized : undefined),
          dashed:
            meta.dashed ??
            (prevNode?.type === 'shape' ? prevNode.dashed : undefined),
          arrange:
            meta.arrange ??
            (prevNode?.type === 'group' ? prevNode.arrange : undefined),
          gap: meta.gap ?? (prevNode?.type === 'group' ? prevNode.gap : undefined),
          childrenDrafts: resolvedDraftType === 'group' ? [] : undefined,
          customKind:
            customKind ??
            (prevNode && isCustomSceneNode(prevNode)
              ? resolveCustomNodeKind(prevNode)
              : undefined),
          customProps:
            meta.props ??
            (prevNode && isCustomSceneNode(prevNode) && prevNode.props
              ? { ...prevNode.props }
              : undefined),
        };
        nodeDrafts.push(draft);
        draftById.set(draft.id, draft);
        draftByLabel.set(`#${draft.id}`, draft);
        if (!explicitId || !draftByLabel.has(label)) {
          draftByLabel.set(label, draft);
        }
        if (resolvedDraftType === 'group') {
          groupStack.push({ depth, draft });
        }
      }
    });

    const vertexNodes: SceneNode[] = nodeDrafts.map(buildNodeFromDraft);
    const nodes: SceneNode[] = [...vertexNodes, ...connectors];

    return {
      scene: {
        ...base,
        title,
        nodes,
        customSteps: undefined,
      },
      warnings,
    };
  }
  function appendOffsetMeta(metaParts: string[], offset?: Point): void {
    const ox = offset?.x ?? 0;
    const oy = offset?.y ?? 0;
    if (ox !== 0 || oy !== 0) {
      metaParts.push(`x: ${Math.round(ox)}`, `y: ${Math.round(oy)}`);
    }
  }
  function appendStepMeta(
    metaParts: string[],
    meta?: Record<string, string | number | boolean | undefined>
  ): void {
    if (typeof meta?.say === 'string' && meta.say.trim()) {
      metaParts.push(`say: ${formatMetaString(meta.say)}`);
    }
    if (
      typeof meta?.pause === 'number' &&
      Number.isFinite(meta.pause) &&
      meta.pause >= 0
    ) {
      metaParts.push(`pause: ${Math.round(meta.pause)}`);
    }
  }
  function getTopLevelDisplayLabel(node: SceneNode): string {
    if (node.type === 'text') return escapeInlineText(node.text);
    if (node.type === 'shape' || isCustomSceneNode(node)) {
      return escapeInlineText(node.name);
    }
    if (node.type === 'group') {
      if (isStandardCardGroup(node)) {
        return escapeInlineText(getCardSummary(node).label);
      }
      return escapeInlineText(node.name);
    }
    return '';
  }
  function isStandardCardGroup(node: GroupSceneNode): boolean {
    if ((node.arrange ?? 'card') !== 'card') return false;
    if (node.gap !== undefined && node.gap !== 6) return false;

    const roleRaw = node.meta?.role;
    const role: CardRole =
      roleRaw === 'root' ||
      roleRaw === 'step' ||
      roleRaw === 'concept' ||
      roleRaw === 'highlight' ||
      roleRaw === 'note'
        ? roleRaw
        : 'concept';

    const shapes: ShapeSceneNode[] = [];
    const texts: TextSceneNode[] = [];
    let iconCount = 0;
    for (const child of node.children) {
      if (child.visible === false) return false;
      if (child.type === 'shape') {
        shapes.push(child);
      } else if (child.type === 'text') {
        texts.push(child);
      } else if (
        isCustomSceneNode(child) &&
        resolveCustomNodeKind(child) === 'icon' &&
        child.color === node.color &&
        typeof child.props?.svg !== 'string' &&
        typeof child.props?.icon === 'string' &&
        child.props.icon.trim().length > 0 &&
        (child.props?.size === undefined ||
          child.props.size === (role === 'root' ? 32 : 26)) &&
        (child.offset?.x ?? 0) === 0 &&
        (child.offset?.y ?? 0) === 0
      ) {
        iconCount++;
      } else {
        return false;
      }
    }

    if (shapes.length > 1 || iconCount > 1 || texts.length < 1 || texts.length > 2) {
      return false;
    }

    const frame = shapes[0];
    if (frame) {
      if (frame.fitMode === 'fixed' || frame.dashed) return false;
      if (frame.color !== node.color) return false;
      if ((frame.offset?.x ?? 0) !== 0 || (frame.offset?.y ?? 0) !== 0) {
        return false;
      }
      if (frame.shape === 'underline') {
        if (node.children[node.children.length - 1] !== frame) return false;
      } else {
        if (node.children[0] !== frame) return false;
      }
    }

    const expectedTitleSize =
      role === 'root'
        ? 25
        : role === 'highlight'
        ? 21
        : role === 'note'
        ? 18
        : 20;
    const expectedSubSize = role === 'root' ? 14.5 : 13.5;

    const title = texts[0];
    if (
      (title.fontWeight ?? 400) !== 700 ||
      (title.align ?? 'center') !== 'center' ||
      (title.indentChars ?? 0) !== 0 ||
      (title.fontSize ?? expectedTitleSize) !== expectedTitleSize ||
      title.color !== node.color ||
      (title.offset?.x ?? 0) !== 0 ||
      (title.offset?.y ?? 0) !== 0
    ) {
      return false;
    }

    const sub = texts[1];
    if (
      sub &&
      (sub.color !== 'white' ||
        (sub.fontWeight ?? 400) !== 400 ||
        (sub.align ?? 'center') !== 'center' ||
        (sub.indentChars ?? 0) !== 0 ||
        (sub.fontSize ?? expectedSubSize) !== expectedSubSize ||
        (sub.offset?.x ?? 0) !== 0 ||
        (sub.offset?.y ?? 0) !== 0)
    ) {
      return false;
    }

    return true;
  }
  function serializeNodeLines(
    node: SceneNode,
    indentLevel: number,
    lines: string[],
    idToLabel: Map<string, string>,
    idToColor: Map<string, ChalkColor>,
    connectors: ConnectorSceneNode[],
    labelCounts: Map<string, number>,
    referencedIds: Set<string> = new Set<string>()
  ): void {
    if (node.type === 'connector') {
      connectors.push(node);
      return;
    }

    const prefix = '  '.repeat(indentLevel);

    if (isCustomSceneNode(node)) {
      const kind = resolveCustomNodeKind(node);
      const singleLineName = escapeInlineText(node.name);
      const disambiguate =
        (indentLevel === 0 &&
          ((labelCounts.get(singleLineName) ?? 0) > 1 ||
            (referencedIds.has(node.id) &&
              hasAmbiguousConnectorChars(singleLineName)))) ||
        (indentLevel > 0 && referencedIds.has(node.id));
      const idSuffix = disambiguate ? `#${node.id}` : '';
      const refLabel =
        indentLevel === 0 && !disambiguate ? singleLineName : `#${node.id}`;
      idToLabel.set(node.id, refLabel);
      idToColor.set(node.id, node.color);
      const metaParts: string[] = [`color: ${node.color}`];
      if (node.props) {
        for (const [k, v] of Object.entries(node.props)) {
          if (v !== undefined) {
            const encoded =
              typeof v === 'string' ? formatMetaString(v) : String(v);
            metaParts.push(`${k}: ${encoded}`);
          }
        }
      }
      if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
        metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
      }
      appendStepMeta(metaParts, node.meta);
      appendOffsetMeta(metaParts, node.offset);
      lines.push(
        `${prefix}[node:${kind}${idSuffix}] ${singleLineName} {${metaParts.join(', ')}}`
      );
      return;
    }

    if (node.type === 'text') {
      const singleLineText = escapeInlineText(node.text);
      const disambiguate =
        (indentLevel === 0 &&
          ((labelCounts.get(singleLineText) ?? 0) > 1 ||
            (referencedIds.has(node.id) &&
              hasAmbiguousConnectorChars(singleLineText)))) ||
        (indentLevel > 0 && referencedIds.has(node.id));
      const idSuffix = disambiguate ? `#${node.id}` : '';
      const refLabel =
        indentLevel === 0 && !disambiguate ? singleLineText : `#${node.id}`;
      idToLabel.set(node.id, refLabel);
      idToColor.set(node.id, node.color);
      const metaParts: string[] = [`color: ${node.color}`];
      if (node.fontSize && node.fontSize !== 21) {
        metaParts.push(`size: ${node.fontSize}`);
      }
      if (node.fontWeight === 700) {
        metaParts.push('bold: true');
      }
      if (node.align && node.align !== 'center') {
        metaParts.push(`align: ${node.align}`);
      }
      if (node.maxWidth !== undefined) {
        metaParts.push(`maxW: ${Math.round(node.maxWidth)}`);
      }
      if ((node.indentChars ?? 0) > 0) {
        metaParts.push(`indent: ${node.indentChars}`);
      }
      if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
        metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
      }
      appendStepMeta(metaParts, node.meta);
      appendOffsetMeta(metaParts, node.offset);
      lines.push(
        `${prefix}[text${idSuffix}] ${singleLineText} {${metaParts.join(', ')}}`
      );
      return;
    }

    if (node.type === 'shape') {
      const singleLineName = escapeInlineText(node.name);
      const disambiguate =
        (indentLevel === 0 &&
          ((labelCounts.get(singleLineName) ?? 0) > 1 ||
            (referencedIds.has(node.id) &&
              hasAmbiguousConnectorChars(singleLineName)))) ||
        (indentLevel > 0 && referencedIds.has(node.id));
      const idSuffix = disambiguate ? `#${node.id}` : '';
      const refLabel =
        indentLevel === 0 && !disambiguate ? singleLineName : `#${node.id}`;
      idToLabel.set(node.id, refLabel);
      idToColor.set(node.id, node.color);
      const metaParts: string[] = [`color: ${node.color}`];
      if (node.fitMode && node.fitMode !== 'fixed') {
        metaParts.push(`fit: ${node.fitMode}`);
      }
      if (node.emphasized) {
        metaParts.push('emphasized: true');
      }
      if (node.dashed) {
        metaParts.push('dashed: true');
      }
      if (node.width !== undefined) {
        metaParts.push(`w: ${Math.round(node.width)}`);
      }
      if (node.height !== undefined) {
        metaParts.push(`h: ${Math.round(node.height)}`);
      }
      if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
        metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
      }
      appendStepMeta(metaParts, node.meta);
      appendOffsetMeta(metaParts, node.offset);
      lines.push(
        `${prefix}[shape:${node.shape}${idSuffix}] ${singleLineName} {${metaParts.join(', ')}}`
      );
      return;
    }

    // GroupSceneNode
    if (indentLevel === 0 && isStandardCardGroup(node)) {
      const summary = getCardSummary(node);
      const singleLineLabel = escapeInlineText(summary.label);
      const disambiguate =
        (labelCounts.get(singleLineLabel) ?? 0) > 1 ||
        (referencedIds.has(node.id) &&
          hasAmbiguousConnectorChars(singleLineLabel));
      const idSuffix = disambiguate ? `#${node.id}` : '';
      idToLabel.set(node.id, disambiguate ? `#${node.id}` : singleLineLabel);
      idToColor.set(node.id, summary.color);

      const metaParts: string[] = [`color: ${summary.color}`];
      if (summary.shape !== 'rounded') {
        metaParts.push(`shape: ${summary.shape}`);
      }
      if (summary.icon) {
        metaParts.push(`icon: ${summary.icon}`);
      }
      if (summary.zone) {
        metaParts.push(`group: ${formatMetaString(summary.zone)}`);
      }
      appendStepMeta(metaParts, node.meta);
      appendOffsetMeta(metaParts, node.offset);

      const subtitlePart = summary.subtitle
        ? ` | ${escapeInlineText(summary.subtitle)}`
        : '';
      lines.push(
        `[${summary.role}${idSuffix}] ${escapeCardTitle(summary.label)}${subtitlePart} {${metaParts.join(', ')}}`
      );
      return;
    }

    const groupName = escapeInlineText(node.name);
    const disambiguate =
      (indentLevel === 0 &&
        ((labelCounts.get(groupName) ?? 0) > 1 ||
          (referencedIds.has(node.id) &&
            hasAmbiguousConnectorChars(groupName)))) ||
      (indentLevel > 0 && referencedIds.has(node.id));
    const idSuffix = disambiguate ? `#${node.id}` : '';
    const refLabel =
      indentLevel === 0 && !disambiguate ? groupName : `#${node.id}`;
    idToLabel.set(node.id, refLabel);
    idToColor.set(node.id, node.color);
    const groupMetaParts: string[] = [`color: ${node.color}`];
    groupMetaParts.push(`arrange: ${node.arrange ?? 'card'}`);
    if (node.gap !== undefined) {
      groupMetaParts.push(`gap: ${node.gap}`);
    }
    if (typeof node.meta?.role === 'string' && node.meta.role) {
      groupMetaParts.push(`role: ${node.meta.role}`);
    }
    if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
      groupMetaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
    }
    appendStepMeta(groupMetaParts, node.meta);
    appendOffsetMeta(groupMetaParts, node.offset);
    lines.push(
      `${prefix}[group${idSuffix}] ${groupName} {${groupMetaParts.join(', ')}}`
    );

    for (const child of node.children) {
      serializeNodeLines(
        child,
        indentLevel + 1,
        lines,
        idToLabel,
        idToColor,
        connectors,
        labelCounts,
        referencedIds
      );
    }
  }
  function serializeConnectorLines(
    connectors: ConnectorSceneNode[],
    idToLabel: Map<string, string>,
    idToColor: Map<string, ChalkColor>
  ): string[] {
    const lines: string[] = [];
    for (const conn of connectors) {
      const arrow = conn.style === 'dashed' ? '-.->' : '->';
      const labelPart = conn.label
        ? ` : ${escapeInlineText(conn.label)}`
        : '';
      const edgeMetaParts: string[] = [];
      if (conn.fromId && conn.toId) {
        const fromLabel = idToLabel.get(conn.fromId);
        const toLabel = idToLabel.get(conn.toId);
        if (!fromLabel || !toLabel) continue;
        const defaultColor = idToColor.get(conn.fromId) ?? 'white';
        if (conn.color !== defaultColor) {
          edgeMetaParts.push(`color: ${conn.color}`);
        }
        appendOffsetMeta(edgeMetaParts, conn.offset);
        const metaPart =
          edgeMetaParts.length > 0 ? ` {${edgeMetaParts.join(', ')}}` : '';
        lines.push(`${fromLabel} ${arrow} ${toLabel}${labelPart}${metaPart}`);
      } else {
        if (conn.color !== 'white') {
          edgeMetaParts.push(`color: ${conn.color}`);
        }
        appendOffsetMeta(edgeMetaParts, conn.offset);
        const metaPart =
          edgeMetaParts.length > 0 ? ` {${edgeMetaParts.join(', ')}}` : '';
        const fx = Math.round(conn.fromPoint?.x ?? -90);
        const fy = Math.round(conn.fromPoint?.y ?? 0);
        const tx = Math.round(conn.toPoint?.x ?? 90);
        const ty = Math.round(conn.toPoint?.y ?? 0);
        lines.push(
          `(${fx}, ${fy}) ${arrow} (${tx}, ${ty})${labelPart}${metaPart}`
        );
      }
    }
    return lines;
  }
  function serializeSceneToScript(scene: LessonScene): string {
    const lines: string[] = [];
    lines.push(`# ${scene.title}`);
    lines.push('');

    const labelCounts = new Map<string, number>();
    const referencedIds = new Set<string>();
    for (const node of scene.nodes) {
      if (node.type === 'connector') {
        if (node.fromId) referencedIds.add(node.fromId);
        if (node.toId) referencedIds.add(node.toId);
        continue;
      }
      const lbl = getTopLevelDisplayLabel(node);
      labelCounts.set(lbl, (labelCounts.get(lbl) ?? 0) + 1);
    }

    const idToLabel = new Map<string, string>();
    const idToColor = new Map<string, ChalkColor>();
    const connectors: ConnectorSceneNode[] = [];

    for (const node of scene.nodes) {
      serializeNodeLines(
        node,
        0,
        lines,
        idToLabel,
        idToColor,
        connectors,
        labelCounts,
        referencedIds
      );
    }

    const connLines = serializeConnectorLines(connectors, idToLabel, idToColor);
    if (connLines.length > 0) {
      lines.push('');
      lines.push(...connLines);
    }

    return lines.join('\n');
  }
  const graphScriptCodec: SceneTextCodec = {
    id: 'graph-dsl',
    label: 'Graph Script',
    hintTitle: 'Quick Graph Script (Live Two-Way Sync)',
    hintLines: [
      '# Title · [kind] Label | Subtitle {color: yellow, shape: circle|none}',
      '[text] Free text · [shape:divider] Line · [group] Stack {arrange: stack}',
      'A -> B : Relation · (x1, y1) -> (x2, y2) : Free arrow {color: cyan}',
    ],
    syntaxRules: [
      'Optional scene title line: `# Scene Title`',
      'Card declaration: `[role] Label | Optional Subtitle {color, shape: <shape|none>, icon: <iconName>, group, say: "spoken subtitle", pause: <ms>, x, y}` (use `[role#id]` when two nodes share the same label; use `\\n` for line breaks)',
      'Standalone atomic & widget nodes: `[text] Content {color, size, bold, align, maxW, indent, say, pause, x, y}`, `[shape:<shapeId>] Label {color, fit, emphasized, dashed, w, h, say, pause, x, y}`, `[node:icon|sketch|code|chart|<customKind>] Name {color, <prop>: <val>, say, pause}`',
      'Composite groups: `[group] Group Name {color, arrange: card|stack|free, gap, say, pause}` followed by 2-space-indented child node lines',
      'Valid `role` values: `root`, `step`, `concept`, `highlight`, `note`',
      'Valid `color` values: `white`, `yellow`, `cyan`, `pink`, `green`, `orange`',
      'Connectors: `From Label -> To Label : Optional Label {color}` (or `#fromId -> #toId` for disambiguated nodes), `-.->` for dashed, or `(x1, y1) -> (x2, y2) : Label`',
      'Lines starting with `//` are ignored as comments.',
    ],
    example: [
      '# Client-Server Flow',
      '[root] Client | Sends request {color: yellow, shape: circle, group: Edge}',
      '[step] API Gateway | Routes & validates {color: cyan, shape: rounded, group: Core}',
      '[highlight] Database | Persists records {color: green, shape: underline, group: Core}',
      'Client -> API Gateway : HTTPS',
      'API Gateway -> Database : Query',
    ].join('\n'),
    parse: parseScriptToScene,
    serialize: serializeSceneToScript,
  };
  return { parseScriptToScene, serializeNodeLines, serializeConnectorLines, graphScriptCodec };
})();

// --- Module: src/plugins/layouts/shared.ts ---
const { splitSceneNodes, makePositionedNode, clipPointToNodeBorder, sampleCubicBezier, createPositionedConnectorFromPoints, buildConnectorNode, computeConnectorBowMap, indexNodesRecursively, finalizeLayout, pointHitsAnyObstacle, countPolylineCollisions, collectObstaclesForConnector, routeObstacleAwareConnector } = (() => {
  function splitSceneNodes(nodes: SceneNode[]): SplitSceneNodes {
    const vertices = nodes.filter((n) => n.type !== 'connector');
    const ownerVertexIdMap = new Map<string, string>();
    const registerOwner = (node: SceneNode, topId: string) => {
      ownerVertexIdMap.set(node.id, topId);
      if (node.type === 'group') {
        for (const child of node.children) {
          if (child.type !== 'connector') {
            registerOwner(child, topId);
          }
        }
      }
    };
    for (const v of vertices) {
      registerOwner(v, v.id);
    }

    const boundConnectors: ConnectorSceneNode[] = [];
    const unboundConnectors: ConnectorSceneNode[] = [];

    for (const n of nodes) {
      if (n.type !== 'connector') continue;
      if (
        n.fromId &&
        n.toId &&
        n.fromId !== n.toId &&
        ownerVertexIdMap.has(n.fromId) &&
        ownerVertexIdMap.has(n.toId)
      ) {
        boundConnectors.push(n);
      } else {
        unboundConnectors.push(n);
      }
    }

    return { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors };
  }
  function makePositionedNode(
    node: SceneNode,
    cx: number,
    cy: number,
    measured: MeasuredSceneNode,
    helpers: LayoutHelpers
  ): PositionedSceneNode {
    const finalCx = cx + (node.offset?.x ?? 0);
    const finalCy = cy + (node.offset?.y ?? 0);

    let children: PositionedSceneNode[] | undefined;
    if (node.type === 'group' && measured.type === 'group') {
      children = helpers.positionGroupChildren(node, finalCx, finalCy, measured);
    } else if (
      measured.type === 'custom' &&
      measured.composedNode &&
      measured.composedMeasured
    ) {
      if (
        measured.composedNode.type === 'group' &&
        measured.composedMeasured.type === 'group'
      ) {
        children = helpers.positionGroupChildren(
          measured.composedNode,
          finalCx,
          finalCy,
          measured.composedMeasured
        );
      } else {
        children = [
          makePositionedNode(
            measured.composedNode,
            finalCx,
            finalCy,
            measured.composedMeasured,
            helpers
          ),
        ];
      }
    }

    return {
      id: node.id,
      node,
      cx: finalCx,
      cy: finalCy,
      width: measured.width,
      height: measured.height,
      measured,
      children,
    };
  }
  /**
   * Ray-clip from a node's center toward an external target point via ShapePlugin or SceneNodePlugin.
   */
  function clipPointToNodeBorder(
    pNode: PositionedSceneNode,
    toward: Point,
    extraMargin = 4
  ): Point {
    if (pNode.node.type === 'shape') {
      return shapeRegistry
        .getOrDefault(pNode.node.shape)
        .clipRay(
          pNode.cx,
          pNode.cy,
          pNode.width,
          pNode.height,
          toward,
          extraMargin
        );
    }
    if (pNode.measured.type === 'group' && pNode.measured.primaryShape) {
      return shapeRegistry
        .getOrDefault(pNode.measured.primaryShape)
        .clipRay(
          pNode.cx,
          pNode.cy,
          pNode.width,
          pNode.height,
          toward,
          extraMargin
        );
    }
    if (pNode.measured.type === 'custom') {
      const plugin = sceneNodeRegistry.get(pNode.measured.kind);
      if (plugin?.clipRay) {
        return plugin.clipRay(pNode, toward, extraMargin);
      }
      if (
        pNode.measured.composedMeasured?.type === 'group' &&
        pNode.measured.composedMeasured.primaryShape
      ) {
        return shapeRegistry
          .getOrDefault(pNode.measured.composedMeasured.primaryShape)
          .clipRay(
            pNode.cx,
            pNode.cy,
            pNode.width,
            pNode.height,
            toward,
            extraMargin
          );
      }
    }
    return clipRayToRect(
      pNode.cx,
      pNode.cy,
      pNode.width,
      pNode.height,
      toward,
      extraMargin
    );
  }
  function sampleQuadraticBezier(
    p0: Point,
    p1: Point,
    p2: Point,
    segments = 18
  ): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      pts.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      });
    }
    return pts;
  }
  function sampleCubicBezier(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    segments = 20
  ): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      pts.push({
        x:
          mt2 * mt * p0.x +
          3 * mt2 * t * p1.x +
          3 * mt * t2 * p2.x +
          t2 * t * p3.x,
        y:
          mt2 * mt * p0.y +
          3 * mt2 * t * p1.y +
          3 * mt * t2 * p2.y +
          t2 * t * p3.y,
      });
    }
    return pts;
  }
  function midpointOnPolyline(points: Point[]): Point | undefined {
    if (points.length === 0) return undefined;
    if (points.length === 1) return points[0];

    const lengths: number[] = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y
      );
      lengths.push(total);
    }
    if (total < 1e-3) return points[0];

    const target = total * 0.5;
    for (let i = 1; i < lengths.length; i++) {
      if (lengths[i] >= target) {
        const segLen = lengths[i] - lengths[i - 1];
        const frac = segLen > 1e-4 ? (target - lengths[i - 1]) / segLen : 0;
        return {
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * frac,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * frac,
        };
      }
    }
    return points[Math.floor(points.length / 2)];
  }
  function createPositionedConnectorFromPoints(
    conn: ConnectorSceneNode,
    points: Point[]
  ): PositionedSceneNode {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 0;
      maxY = 0;
    }

    return {
      id: conn.id,
      node: conn,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      width: Math.max(12, maxX - minX),
      height: Math.max(12, maxY - minY),
      measured: { type: 'connector', width: 0, height: 0 },
      routedPoints: points,
      labelPoint: conn.label ? midpointOnPolyline(points) : undefined,
    };
  }
  function buildConnectorNode(
    conn: ConnectorSceneNode,
    nodeMap: Map<string, PositionedSceneNode>,
    bowOffset = 0
  ): PositionedSceneNode {
    const fromNode = conn.fromId ? nodeMap.get(conn.fromId) : undefined;
    const toNode = conn.toId ? nodeMap.get(conn.toId) : undefined;

    if (fromNode && toNode) {
      const dx = toNode.cx - fromNode.cx;
      const dy = toNode.cy - fromNode.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;

      const mid = {
        x: (fromNode.cx + toNode.cx) / 2 + nx * bowOffset,
        y: (fromNode.cy + toNode.cy) / 2 + ny * bowOffset,
      };

      const start = clipPointToNodeBorder(fromNode, mid, 5);
      const end = clipPointToNodeBorder(toNode, mid, 6);

      const ctrl = {
        x: (start.x + end.x) / 2 + nx * bowOffset * 0.85,
        y: (start.y + end.y) / 2 + ny * bowOffset * 0.85,
      };

      const points = sampleQuadraticBezier(start, ctrl, end, 18);
      return createPositionedConnectorFromPoints(conn, points);
    }

    // Unbound / standalone coordinate arrow
    const ox = conn.offset?.x ?? 0;
    const oy = conn.offset?.y ?? 0;
    const startPt = {
      x: (conn.fromPoint?.x ?? -90) + ox,
      y: (conn.fromPoint?.y ?? 0) + oy,
    };
    const endPt = {
      x: (conn.toPoint?.x ?? 90) + ox,
      y: (conn.toPoint?.y ?? 0) + oy,
    };
    const ctrl = {
      x: (startPt.x + endPt.x) / 2,
      y: (startPt.y + endPt.y) / 2,
    };
    const points = sampleQuadraticBezier(startPt, ctrl, endPt, 14);
    return createPositionedConnectorFromPoints(conn, points);
  }
  function computeConnectorBowMap(
    connectors: ConnectorSceneNode[]
  ): Map<string, number> {
    const pairGroups = new Map<string, ConnectorSceneNode[]>();
    for (const conn of connectors) {
      if (!conn.fromId || !conn.toId) continue;
      const a = conn.fromId < conn.toId ? conn.fromId : conn.toId;
      const b = conn.fromId < conn.toId ? conn.toId : conn.fromId;
      const key = `${a}__${b}`;
      const list = pairGroups.get(key) ?? [];
      list.push(conn);
      pairGroups.set(key, list);
    }

    const bowMap = new Map<string, number>();
    for (const list of pairGroups.values()) {
      if (list.length === 1) {
        const c = list[0];
        bowMap.set(c.id, c.style === 'dashed' ? -36 : 0);
      } else {
        const step = 42;
        list.forEach((c, idx) => {
          const offsetIndex = idx - (list.length - 1) / 2;
          const dirSign = c.fromId! < c.toId! ? 1 : -1;
          bowMap.set(c.id, offsetIndex * step * dirSign);
        });
      }
    }
    return bowMap;
  }
  function computeBounds(
    nodes: PositionedSceneNode[],
    zones: GroupBox[]
  ): Rect {
    if (nodes.length === 0 && zones.length === 0) {
      return { x: -400, y: -225, width: 800, height: 450 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const visitNode = (n: PositionedSceneNode) => {
      if (n.routedPoints && n.routedPoints.length > 0) {
        for (const pt of n.routedPoints) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      } else {
        minX = Math.min(minX, n.cx - n.width / 2);
        minY = Math.min(minY, n.cy - n.height / 2);
        maxX = Math.max(maxX, n.cx + n.width / 2);
        maxY = Math.max(maxY, n.cy + n.height / 2);
      }
      if (n.children && n.children.length > 0) {
        for (const child of n.children) {
          visitNode(child);
        }
      }
    };

    for (const n of nodes) {
      visitNode(n);
    }

    for (const g of zones) {
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.width);
      maxY = Math.max(maxY, g.y + g.height);
    }

    if (!Number.isFinite(minX)) {
      return { x: -400, y: -225, width: 800, height: 450 };
    }

    const margin = 48;
    return {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
    };
  }
  function indexNodesRecursively(
    nodes: PositionedSceneNode[],
    nodeMap: Map<string, PositionedSceneNode>
  ): void {
    for (const n of nodes) {
      nodeMap.set(n.id, n);
      if (n.children && n.children.length > 0) {
        indexNodesRecursively(n.children, nodeMap);
      }
    }
  }
  function finalizeLayout(
    nodes: PositionedSceneNode[],
    zones: GroupBox[] = []
  ): ComputedLayout {
    const nodeMap = new Map<string, PositionedSceneNode>();
    indexNodesRecursively(nodes, nodeMap);
    return {
      nodes,
      nodeMap,
      zones,
      bounds: computeBounds(nodes, zones),
    };
  }
  function segmentIntersectsBox(
    a: Point,
    b: Point,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): boolean {
    let t0 = 0;
    let t1 = 1;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const p = [-dx, dx, -dy, dy];
    const q = [a.x - minX, maxX - a.x, a.y - minY, maxY - a.y];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-8) {
        if (q[i] < 0) return false;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }
    return t0 <= t1;
  }
  function polylineLength(points: Point[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }
  function pointInsideObstacle(
    pt: Point,
    obs: PositionedSceneNode,
    padX: number,
    padY = padX
  ): boolean {
    return (
      pt.x > obs.cx - obs.width / 2 - padX &&
      pt.x < obs.cx + obs.width / 2 + padX &&
      pt.y > obs.cy - obs.height / 2 - padY &&
      pt.y < obs.cy + obs.height / 2 + padY
    );
  }
  function pointHitsAnyObstacle(
    pt: Point,
    obstacles: PositionedSceneNode[],
    padX: number,
    padY = padX
  ): boolean {
    return obstacles.some((obs) => pointInsideObstacle(pt, obs, padX, padY));
  }
  function segmentHitsAnyObstacle(
    a: Point,
    b: Point,
    obstacles: PositionedSceneNode[],
    pad: number
  ): boolean {
    for (const obs of obstacles) {
      if (
        segmentIntersectsBox(
          a,
          b,
          obs.cx - obs.width / 2 - pad,
          obs.cy - obs.height / 2 - pad,
          obs.cx + obs.width / 2 + pad,
          obs.cy + obs.height / 2 + pad
        )
      ) {
        return true;
      }
    }
    return false;
  }
  function countPolylineCollisions(
    points: Point[],
    obstacles: PositionedSceneNode[],
    pad: number
  ): number {
    let count = 0;
    for (const obs of obstacles) {
      const minX = obs.cx - obs.width / 2 - pad;
      const maxX = obs.cx + obs.width / 2 + pad;
      const minY = obs.cy - obs.height / 2 - pad;
      const maxY = obs.cy + obs.height / 2 + pad;
      for (let i = 1; i < points.length; i++) {
        if (segmentIntersectsBox(points[i - 1], points[i], minX, minY, maxX, maxY)) {
          count++;
          break;
        }
      }
    }
    return count;
  }
  function collectObstaclesForConnector(
    conn: ConnectorSceneNode,
    allVertices: PositionedSceneNode[],
    ownerVertexIdMap: Map<string, string>
  ): PositionedSceneNode[] {
    const fromOwner = conn.fromId
      ? ownerVertexIdMap.get(conn.fromId) ?? conn.fromId
      : undefined;
    const toOwner = conn.toId
      ? ownerVertexIdMap.get(conn.toId) ?? conn.toId
      : undefined;
    return allVertices.filter(
      (v) =>
        v.id !== conn.fromId &&
        v.id !== conn.toId &&
        v.id !== fromOwner &&
        v.id !== toOwner
    );
  }
  function findBlockingObstacles(
    points: Point[],
    obstacles: PositionedSceneNode[],
    pad: number
  ): PositionedSceneNode[] {
    const hit: PositionedSceneNode[] = [];
    for (const obs of obstacles) {
      const minX = obs.cx - obs.width / 2 - pad;
      const maxX = obs.cx + obs.width / 2 + pad;
      const minY = obs.cy - obs.height / 2 - pad;
      const maxY = obs.cy + obs.height / 2 + pad;
      for (let i = 1; i < points.length; i++) {
        if (segmentIntersectsBox(points[i - 1], points[i], minX, minY, maxX, maxY)) {
          hit.push(obs);
          break;
        }
      }
    }
    return hit;
  }
  function buildEnvelopeArchPoints(
    fromNode: PositionedSceneNode,
    toNode: PositionedSceneNode,
    obstacles: PositionedSceneNode[],
    initialBlockers: PositionedSceneNode[],
    side: -1 | 1,
    extraClearance: number
  ): Point[] {
    const dx = toNode.cx - fromNode.cx;
    const dy = toNode.cy - fromNode.cy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    const blockers = new Set<PositionedSceneNode>(initialBlockers);
    let points: Point[] = [];

    for (let iter = 0; iter < 5; iter++) {
      let extremeN = side === -1 ? Infinity : -Infinity;
      const envelopeNodes =
        blockers.size > 0 ? [...blockers, fromNode, toNode] : [fromNode, toNode];

      for (const node of envelopeNodes) {
        const hw = node.width / 2;
        const hh = node.height / 2;
        const corners = [
          { x: node.cx - hw, y: node.cy - hh },
          { x: node.cx + hw, y: node.cy - hh },
          { x: node.cx + hw, y: node.cy + hh },
          { x: node.cx - hw, y: node.cy + hh },
        ];
        for (const c of corners) {
          const projN = (c.x - fromNode.cx) * nx + (c.y - fromNode.cy) * ny;
          extremeN =
            side === -1 ? Math.min(extremeN, projN) : Math.max(extremeN, projN);
        }
      }

      const targetN = extremeN + side * extraClearance;
      const inset = Math.min(84, Math.max(22, dist * 0.14));

      const aim1 = {
        x: fromNode.cx + ux * inset + nx * targetN,
        y: fromNode.cy + uy * inset + ny * targetN,
      };
      const aim2 = {
        x: toNode.cx - ux * inset + nx * targetN,
        y: toNode.cy - uy * inset + ny * targetN,
      };
      const start = clipPointToNodeBorder(fromNode, aim1, 5);
      const end = clipPointToNodeBorder(toNode, aim2, 6);

      const startN = (start.x - fromNode.cx) * nx + (start.y - fromNode.cy) * ny;
      const endN = (end.x - fromNode.cx) * nx + (end.y - fromNode.cy) * ny;
      const avgEndN = (startN + endN) / 2;
      const rawCtrlN = (targetN - 0.25 * avgEndN) / 0.75;
      const ctrlN =
        side === -1 ? Math.min(targetN, rawCtrlN) : Math.max(targetN, rawCtrlN);

      const c1 = {
        x: fromNode.cx + ux * inset + nx * ctrlN,
        y: fromNode.cy + uy * inset + ny * ctrlN,
      };
      const c2 = {
        x: toNode.cx - ux * inset + nx * ctrlN,
        y: toNode.cy - uy * inset + ny * ctrlN,
      };
      points = sampleCubicBezier(start, c1, c2, end, 28);

      const newHits = findBlockingObstacles(points, obstacles, 12);
      let added = false;
      for (const h of newHits) {
        if (!blockers.has(h)) {
          blockers.add(h);
          added = true;
        }
      }
      if (!added) break;
    }

    return points;
  }
  function sampleSubdividedLine(a: Point, b: Point, steps = 6): Point[] {
    const out: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
    return out;
  }
  function smoothFilletPolyline(pts: Point[], maxRadius = 34): Point[] {
    if (pts.length <= 2) {
      return pts.length === 2
        ? sampleQuadraticBezier(
            pts[0],
            { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
            pts[1],
            14
          )
        : pts;
    }
    const out: Point[] = [pts[0]];
    let cursor = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
      const r = Math.min(maxRadius, lenIn * 0.35, lenOut * 0.35);
      if (r < 2 || lenIn < 1e-3 || lenOut < 1e-3) {
        out.push(...sampleSubdividedLine(cursor, curr, 6).slice(1));
        cursor = curr;
        continue;
      }
      const enterPt = {
        x: curr.x - ((curr.x - prev.x) / lenIn) * r,
        y: curr.y - ((curr.y - prev.y) / lenIn) * r,
      };
      const exitPt = {
        x: curr.x + ((next.x - curr.x) / lenOut) * r,
        y: curr.y + ((next.y - curr.y) / lenOut) * r,
      };
      if (Math.hypot(enterPt.x - cursor.x, enterPt.y - cursor.y) > 0.5) {
        out.push(...sampleSubdividedLine(cursor, enterPt, 6).slice(1));
      }
      out.push(...sampleQuadraticBezier(enterPt, curr, exitPt, 10).slice(1));
      cursor = exitPt;
    }
    out.push(...sampleSubdividedLine(cursor, pts[pts.length - 1], 6).slice(1));
    return out;
  }
  function buildVisibilityDetourPoints(
    fromNode: PositionedSceneNode,
    toNode: PositionedSceneNode,
    obstacles: PositionedSceneNode[]
  ): Point[] | null {
    if (obstacles.length === 0) return null;

    const minX = Math.min(fromNode.cx - fromNode.width / 2, toNode.cx - toNode.width / 2) - 240;
    const maxX = Math.max(fromNode.cx + fromNode.width / 2, toNode.cx + toNode.width / 2) + 240;
    const minY = Math.min(fromNode.cy - fromNode.height / 2, toNode.cy - toNode.height / 2) - 240;
    const maxY = Math.max(fromNode.cy + fromNode.height / 2, toNode.cy + toNode.height / 2) + 240;

    const midX = (fromNode.cx + toNode.cx) / 2;
    const midY = (fromNode.cy + toNode.cy) / 2;
    const localObstacles = obstacles
      .filter(
        (o) =>
          o.cx + o.width / 2 >= minX &&
          o.cx - o.width / 2 <= maxX &&
          o.cy + o.height / 2 >= minY &&
          o.cy - o.height / 2 <= maxY
      )
      .sort(
        (a, b) =>
          Math.hypot(a.cx - midX, a.cy - midY) - Math.hypot(b.cx - midX, b.cy - midY)
      )
      .slice(0, 24);

    const waypoints: Point[] = [];
    const startPortIndices: number[] = [];
    const endPortIndices: number[] = [];

    const cardinalPorts = (node: PositionedSceneNode, pad = 16): Point[] => [
      { x: node.cx, y: node.cy - node.height / 2 - pad },
      { x: node.cx + node.width / 2 + pad, y: node.cy },
      { x: node.cx, y: node.cy + node.height / 2 + pad },
      { x: node.cx - node.width / 2 - pad, y: node.cy },
    ];

    for (const pt of cardinalPorts(fromNode)) {
      const borderPt = clipPointToNodeBorder(fromNode, pt, 5);
      if (
        !pointHitsAnyObstacle(pt, obstacles, 10) &&
        !segmentHitsAnyObstacle(borderPt, pt, obstacles, 4)
      ) {
        startPortIndices.push(waypoints.length);
        waypoints.push(pt);
      }
    }
    for (const pt of cardinalPorts(toNode)) {
      const borderPt = clipPointToNodeBorder(toNode, pt, 6);
      if (
        !pointHitsAnyObstacle(pt, obstacles, 10) &&
        !segmentHitsAnyObstacle(pt, borderPt, obstacles, 4)
      ) {
        endPortIndices.push(waypoints.length);
        waypoints.push(pt);
      }
    }

    if (startPortIndices.length === 0 || endPortIndices.length === 0) {
      return null;
    }

    const cornerPad = 24;
    for (const obs of localObstacles) {
      const hw = obs.width / 2 + cornerPad;
      const hh = obs.height / 2 + cornerPad;
      const corners = [
        { x: obs.cx - hw, y: obs.cy - hh },
        { x: obs.cx + hw, y: obs.cy - hh },
        { x: obs.cx + hw, y: obs.cy + hh },
        { x: obs.cx - hw, y: obs.cy + hh },
      ];
      for (const c of corners) {
        if (
          !pointHitsAnyObstacle(c, obstacles, 10) &&
          !pointInsideObstacle(c, fromNode, 4) &&
          !pointInsideObstacle(c, toNode, 4)
        ) {
          waypoints.push(c);
        }
      }
    }

    const n = waypoints.length;
    const edges: Array<Array<{ to: number; cost: number }>> = Array.from(
      { length: n },
      () => []
    );
    const endpointObstacles = [fromNode, toNode];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = waypoints[i];
        const b = waypoints[j];
        // Do not slice across source/target bodies or any padded obstacle
        if (
          segmentHitsAnyObstacle(a, b, obstacles, 10) ||
          segmentHitsAnyObstacle(a, b, endpointObstacles, -2)
        ) {
          continue;
        }
        const d = Math.hypot(b.x - a.x, b.y - a.y) + 22;
        edges[i].push({ to: j, cost: d });
        edges[j].push({ to: i, cost: d });
      }
    }

    // Multi-source Dijkstra from start ports to end ports
    const distArr = new Array<number>(n).fill(Infinity);
    const prevArr = new Array<number>(n).fill(-1);
    const used = new Array<boolean>(n).fill(false);
    const endSet = new Set<number>(endPortIndices);

    for (const sIdx of startPortIndices) {
      distArr[sIdx] = 0;
    }

    let reachedEnd = -1;
    for (let step = 0; step < n; step++) {
      let u = -1;
      let bestD = Infinity;
      for (let i = 0; i < n; i++) {
        if (!used[i] && distArr[i] < bestD) {
          bestD = distArr[i];
          u = i;
        }
      }
      if (u === -1 || !Number.isFinite(bestD)) break;
      used[u] = true;
      if (endSet.has(u)) {
        reachedEnd = u;
        break;
      }
      for (const e of edges[u]) {
        const alt = bestD + e.cost;
        if (alt < distArr[e.to]) {
          distArr[e.to] = alt;
          prevArr[e.to] = u;
        }
      }
    }

    if (reachedEnd === -1) return null;

    const rawPath: Point[] = [];
    let cur = reachedEnd;
    while (cur !== -1) {
      rawPath.push(waypoints[cur]);
      cur = prevArr[cur];
    }
    rawPath.reverse();
    if (rawPath.length < 2) return null;

    // Greedy string-pulling to remove collinear / unnecessary turns
    const pulled: Point[] = [rawPath[0]];
    let idx = 0;
    while (idx < rawPath.length - 1) {
      let farthest = idx + 1;
      for (let cand = rawPath.length - 1; cand > idx + 1; cand--) {
        if (
          !segmentHitsAnyObstacle(rawPath[idx], rawPath[cand], obstacles, 14) &&
          !segmentHitsAnyObstacle(rawPath[idx], rawPath[cand], [fromNode, toNode], -2)
        ) {
          farthest = cand;
          break;
        }
      }
      pulled.push(rawPath[farthest]);
      idx = farthest;
    }

    const fullWaypoints: Point[] = [];
    const startPort = pulled[0];
    const endPort = pulled[pulled.length - 1];
    const startClip = clipPointToNodeBorder(fromNode, startPort, 5);
    const endClip = clipPointToNodeBorder(toNode, endPort, 6);

    fullWaypoints.push(startClip);
    // Keep startPort unless skipping directly to pulled[1] stays completely clear of obstacles & endpoints
    const canSkipStartPort =
      pulled.length >= 2 &&
      !segmentHitsAnyObstacle(startClip, pulled[1], obstacles, 10) &&
      !segmentHitsAnyObstacle(startClip, pulled[1], [fromNode], -2);
    if (!canSkipStartPort && Math.hypot(startPort.x - startClip.x, startPort.y - startClip.y) > 2) {
      fullWaypoints.push(startPort);
    }

    for (let k = 1; k < pulled.length - 1; k++) {
      fullWaypoints.push(pulled[k]);
    }

    const prevBeforeEnd = fullWaypoints[fullWaypoints.length - 1];
    const canSkipEndPort =
      pulled.length >= 2 &&
      !segmentHitsAnyObstacle(prevBeforeEnd, endClip, obstacles, 10) &&
      !segmentHitsAnyObstacle(prevBeforeEnd, endClip, [toNode], -2);
    if (!canSkipEndPort && Math.hypot(endClip.x - endPort.x, endClip.y - endPort.y) > 2) {
      fullWaypoints.push(endPort);
    }
    fullWaypoints.push(endClip);

    for (const r of [28, 14, 6]) {
      const smooth = smoothFilletPolyline(fullWaypoints, r);
      if (countPolylineCollisions(smooth, obstacles, 6) === 0) {
        return smooth;
      }
    }
    return smoothFilletPolyline(fullWaypoints, 4);
  }
  /**
   * General obstacle-aware connector router across all graph layouts:
   * 1. Keeps crisp direct / bowed Bezier curves when collision-free.
   * 2. On collision, compares dual-side smooth envelope arches against a 2D visibility-graph fillet spline.
   */
  function routeObstacleAwareConnector(
    conn: ConnectorSceneNode,
    vertexMap: Map<string, PositionedSceneNode>,
    allVertices: PositionedSceneNode[],
    ownerVertexIdMap: Map<string, string>,
    options: ObstacleAwareRouteOptions = {}
  ): PositionedSceneNode {
    const fromNode = conn.fromId ? vertexMap.get(conn.fromId) : undefined;
    const toNode = conn.toId ? vertexMap.get(conn.toId) : undefined;
    if (!fromNode || !toNode) {
      return buildConnectorNode(conn, vertexMap, options.preferredBow ?? 0);
    }

    const obstacles = collectObstaclesForConnector(conn, allVertices, ownerVertexIdMap);
    const directNode = buildConnectorNode(conn, vertexMap, options.preferredBow ?? 0);
    const directPts = directNode.routedPoints ?? [];
    const directHits = countPolylineCollisions(directPts, obstacles, 10);
    const directLabelHit =
      directNode.labelPoint && pointHitsAnyObstacle(directNode.labelPoint, obstacles, 24, 12);

    if (obstacles.length === 0 || (directHits === 0 && !directLabelHit)) {
      const directMid =
        directNode.labelPoint ?? midpointOnPolyline(directPts);
      if (directMid && options.routedMidpoints) {
        options.routedMidpoints.push(directMid);
      }
      return directNode;
    }

    const initialBlockers = findBlockingObstacles(directPts, obstacles, 10);
    const baseClearance = 40 + (conn.label ? 18 : 0);
    const routedMidpoints = options.routedMidpoints ?? [];
    const candidates: Array<{
      node: PositionedSceneNode;
      side?: -1 | 1;
      isDirect?: boolean;
    }> = [{ node: directNode, isDirect: true }];

    for (const side of [-1, 1] as const) {
      const pts0 = buildEnvelopeArchPoints(
        fromNode,
        toNode,
        obstacles,
        initialBlockers,
        side,
        baseClearance
      );
      const node0 = createPositionedConnectorFromPoints(conn, pts0);
      candidates.push({ node: node0, side });

      // If midpoint crowds an existing detoured curve, evaluate an extra lane offset
      const mid0 = node0.labelPoint ?? midpointOnPolyline(pts0);
      if (
        mid0 &&
        routedMidpoints.some((m) => Math.hypot(m.x - mid0.x, m.y - mid0.y) < 38)
      ) {
        const pts1 = buildEnvelopeArchPoints(
          fromNode,
          toNode,
          obstacles,
          initialBlockers,
          side,
          baseClearance + 46
        );
        candidates.push({
          node: createPositionedConnectorFromPoints(conn, pts1),
          side,
        });
      }
    }

    const visPts = buildVisibilityDetourPoints(fromNode, toNode, obstacles);
    if (visPts && visPts.length >= 2) {
      candidates.push({ node: createPositionedConnectorFromPoints(conn, visPts) });
    }

    let bestNode = directNode;
    let bestScore = Infinity;

    for (const cand of candidates) {
      const pts = cand.node.routedPoints ?? [];
      if (pts.length < 2) continue;
      const segHits = countPolylineCollisions(pts, obstacles, 6);
      const labelHit =
        cand.node.labelPoint && pointHitsAnyObstacle(cand.node.labelPoint, obstacles, 16, 8)
          ? 1
          : 0;
      const arcLen = polylineLength(pts);
      const mid = cand.node.labelPoint ?? midpointOnPolyline(pts);
      const crowded =
        mid && routedMidpoints.some((m) => Math.hypot(m.x - mid.x, m.y - mid.y) < 34)
          ? 140
          : 0;
      const sideBias =
        options.preferredSide && cand.side && cand.side !== options.preferredSide ? 28 : 0;
      const grazePenalty =
        cand.isDirect && segHits === 0 ? directHits * 120 : 0;

      const score =
        arcLen + segHits * 10000 + labelHit * 4000 + crowded + sideBias + grazePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestNode = cand.node;
      }
    }

    const bestMid = bestNode.labelPoint ?? midpointOnPolyline(bestNode.routedPoints ?? []);
    if (bestMid && options.routedMidpoints) {
      options.routedMidpoints.push(bestMid);
    }
    return bestNode;
  }
  return { splitSceneNodes, makePositionedNode, clipPointToNodeBorder, sampleCubicBezier, createPositionedConnectorFromPoints, buildConnectorNode, computeConnectorBowMap, indexNodesRecursively, finalizeLayout, pointHitsAnyObstacle, countPolylineCollisions, collectObstaclesForConnector, routeObstacleAwareConnector };
})();

// --- Module: src/plugins/layouts/dagreFlow.ts ---
const { computeDagreFlowLayout } = (() => {
  /**
   * Self-contained Sugiyama layered DAG layout (zero external dependencies):
   * 1. Cycle-safe topological longest-path rank assignment
   * 2. Two-pass barycenter crossing minimization
   * 3. Symmetric horizontal (LR) or vertical (TB) coordinate placement
   */
  function computeLayeredDagPositions(
    vertexIds: string[],
    rootIds: Set<string>,
    measuredMap: Map<string, MeasuredSceneNode>,
    edges: Array<{ from: string; to: string }>,
    rankdir: 'LR' | 'TB'
  ): LayeredDagResult {
    const indexOf = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    vertexIds.forEach((id, i) => {
      indexOf.set(id, i);
      outgoing.set(id, []);
      incoming.set(id, []);
      inDegree.set(id, 0);
    });

    const seenEdges = new Set<string>();
    for (const e of edges) {
      if (e.from === e.to) continue;
      const key = `${e.from}->${e.to}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      outgoing.get(e.from)?.push(e.to);
      incoming.get(e.to)?.push(e.from);
      inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    }

    // Kahn topological order with deterministic cycle breaking
    const remIn = new Map(inDegree);
    const visited = new Set<string>();
    const topoOrder: string[] = [];

    while (topoOrder.length < vertexIds.length) {
      const ready = vertexIds
        .filter((id) => !visited.has(id) && (remIn.get(id) ?? 0) <= 0)
        .sort((a, b) => {
          const ra = rootIds.has(a) ? 0 : 1;
          const rb = rootIds.has(b) ? 0 : 1;
          return ra !== rb ? ra - rb : (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
        });

      const pick =
        ready[0] ??
        vertexIds
          .filter((id) => !visited.has(id))
          .sort((a, b) => (remIn.get(a) ?? 0) - (remIn.get(b) ?? 0))[0];
      if (!pick) break;

      visited.add(pick);
      topoOrder.push(pick);
      for (const next of outgoing.get(pick) ?? []) {
        if (!visited.has(next)) {
          remIn.set(next, Math.max(0, (remIn.get(next) ?? 0) - 1));
        }
      }
    }

    const ranks = new Map<string, number>();
    const topoIdx = new Map<string, number>();
    topoOrder.forEach((id, i) => topoIdx.set(id, i));

    for (const id of topoOrder) {
      let r = 0;
      for (const prev of incoming.get(id) ?? []) {
        if ((topoIdx.get(prev) ?? 0) < (topoIdx.get(id) ?? 0)) {
          r = Math.max(r, (ranks.get(prev) ?? 0) + 1);
        }
      }
      ranks.set(id, r);
    }

    const maxRank = Math.max(0, ...ranks.values());
    const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
    for (const id of vertexIds) {
      layers[ranks.get(id) ?? 0].push(id);
    }

    // Crossing minimization via forward/backward neighbor barycenter sweeps
    const orderInLayer = new Map<string, number>();
    const refreshOrder = () => {
      for (const layer of layers) {
        layer.forEach((id, i) => orderInLayer.set(id, i));
      }
    };
    refreshOrder();

    const sortLayerByNeighbors = (
      r: number,
      neighborMap: Map<string, string[]>
    ) => {
      const layer = layers[r];
      if (layer.length <= 1) return;
      layer.sort((a, b) => {
        const avg = (id: string) => {
          const nbrs = neighborMap.get(id) ?? [];
          if (nbrs.length === 0) return orderInLayer.get(id) ?? 0;
          const sum = nbrs.reduce(
            (acc, n) => acc + (orderInLayer.get(n) ?? 0),
            0
          );
          return sum / nbrs.length;
        };
        const diff = avg(a) - avg(b);
        return Math.abs(diff) > 1e-4
          ? diff
          : (orderInLayer.get(a) ?? 0) - (orderInLayer.get(b) ?? 0);
      });
      refreshOrder();
    };

    for (let pass = 0; pass < 2; pass++) {
      for (let r = 1; r <= maxRank; r++) sortLayerByNeighbors(r, incoming);
      for (let r = maxRank - 1; r >= 0; r--) sortLayerByNeighbors(r, outgoing);
    }

    const nodesep = 68;
    const ranksep = 108;
    const positions = new Map<string, Point>();

    const rankBreadths = layers.map((layer) =>
      layer.reduce((maxB, id) => {
        const m = measuredMap.get(id)!;
        return Math.max(maxB, rankdir === 'LR' ? m.width : m.height);
      }, 0)
    );
    const totalPrimary =
      rankBreadths.reduce((a, b) => a + b, 0) +
      Math.max(0, layers.length - 1) * ranksep;

    let primaryCursor = -totalPrimary / 2;
    for (let r = 0; r < layers.length; r++) {
      const layer = layers[r];
      const layerPrimary = primaryCursor + rankBreadths[r] / 2;
      primaryCursor += rankBreadths[r] + ranksep;

      const totalSecondary =
        layer.reduce((acc, id) => {
          const m = measuredMap.get(id)!;
          return acc + (rankdir === 'LR' ? m.height : m.width);
        }, 0) +
        Math.max(0, layer.length - 1) * nodesep;

      let secCursor = -totalSecondary / 2;
      for (const id of layer) {
        const m = measuredMap.get(id)!;
        const span = rankdir === 'LR' ? m.height : m.width;
        const secCenter = secCursor + span / 2;
        secCursor += span + nodesep;
        positions.set(
          id,
          rankdir === 'LR'
            ? { x: layerPrimary, y: secCenter }
            : { x: secCenter, y: layerPrimary }
        );
      }
    }

    return { positions, ranks };
  }
  function computeDagreFlowLayout(
    scene: LessonScene,
    helpers: LayoutHelpers,
    rankdir: 'LR' | 'TB'
  ): ComputedLayout {
    const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
      splitSceneNodes(scene.nodes);

    const measuredMap = new Map<string, MeasuredSceneNode>();
    const rootIds = new Set<string>();
    for (const node of vertices) {
      measuredMap.set(node.id, helpers.measureNode(node));
      if (node.meta?.role === 'root') rootIds.add(node.id);
    }

    const dagEdges: Array<{ from: string; to: string }> = [];
    for (const conn of boundConnectors) {
      const topFrom = ownerVertexIdMap.get(conn.fromId!);
      const topTo = ownerVertexIdMap.get(conn.toId!);
      if (topFrom && topTo && topFrom !== topTo) {
        dagEdges.push({ from: topFrom, to: topTo });
      }
    }

    const { positions, ranks } = computeLayeredDagPositions(
      vertices.map((v) => v.id),
      rootIds,
      measuredMap,
      dagEdges,
      rankdir
    );

    const positionedNodes: PositionedSceneNode[] = [];
    const vertexMap = new Map<string, PositionedSceneNode>();
    const positionedVertices: PositionedSceneNode[] = [];

    for (const node of vertices) {
      const m = measuredMap.get(node.id)!;
      const pt = positions.get(node.id) ?? { x: 0, y: 0 };
      const pNode = makePositionedNode(node, pt.x, pt.y, m, helpers);
      positionedNodes.push(pNode);
      positionedVertices.push(pNode);
      indexNodesRecursively([pNode], vertexMap);
    }

    const bowMap = computeConnectorBowMap(boundConnectors);
    const routedMidpoints: Point[] = [];
    for (const conn of boundConnectors) {
      const topFrom = ownerVertexIdMap.get(conn.fromId!);
      const topTo = ownerVertexIdMap.get(conn.toId!);
      const rankFrom = topFrom ? ranks.get(topFrom) ?? 0 : 0;
      const rankTo = topTo ? ranks.get(topTo) ?? 0 : 0;

      let preferredBow = bowMap.get(conn.id) ?? 0;
      if (preferredBow === 0 && rankTo < rankFrom) {
        preferredBow = -48;
      }

      positionedNodes.push(
        routeObstacleAwareConnector(
          conn,
          vertexMap,
          positionedVertices,
          ownerVertexIdMap,
          {
            preferredBow,
            // Edge normal flips when direction reverses, so -1 arches forward edges
            // over the top (-y) and back-edges under the bottom (+y).
            preferredSide: -1,
            routedMidpoints,
          }
        )
      );
    }

    for (const conn of unboundConnectors) {
      positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
    }

    return finalizeLayout(positionedNodes, []);
  }
  return { computeDagreFlowLayout };
})();

// --- Module: src/plugins/layouts/flowHorizontalPlugin.ts ---
const { flowHorizontalPlugin } = (() => {
  const flowHorizontalPlugin: LayoutPlugin = {
    id: 'flow-horizontal',
    name: 'Horizontal Flow',
    category: 'diagram',
    icon: 'flow-lr',
    dragMode: 'offset',
    supportsEdges: true,
    textCodec: graphScriptCodec,
    deriveSteps: deriveTeachingSteps,
    compute(scene, helpers) {
      return computeDagreFlowLayout(scene, helpers, 'LR');
    },
  };
  return { flowHorizontalPlugin };
})();

// --- Module: src/plugins/layouts/flowVerticalPlugin.ts ---
const { flowVerticalPlugin } = (() => {
  const flowVerticalPlugin: LayoutPlugin = {
    id: 'flow-vertical',
    name: 'Vertical Flow',
    category: 'diagram',
    icon: 'flow-tb',
    dragMode: 'offset',
    supportsEdges: true,
    textCodec: graphScriptCodec,
    deriveSteps: deriveTeachingSteps,
    compute(scene, helpers) {
      return computeDagreFlowLayout(scene, helpers, 'TB');
    },
  };
  return { flowVerticalPlugin };
})();

// --- Module: src/plugins/layouts/mindmapPlugin.ts ---
const { mindmapPlugin } = (() => {
  const mindmapPlugin: LayoutPlugin = {
    id: 'mindmap',
    name: 'Mind Map',
    category: 'diagram',
    icon: 'mindmap',
    dragMode: 'offset',
    supportsEdges: true,
    textCodec: graphScriptCodec,
    deriveSteps: deriveTeachingSteps,
    compute(scene, helpers) {
      const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
        splitSceneNodes(scene.nodes);

      if (vertices.length === 0) {
        const emptyVertexMap = new Map<string, PositionedSceneNode>();
        const unbound = unboundConnectors.map((c) =>
          buildConnectorNode(c, emptyVertexMap, 0)
        );
        return finalizeLayout(unbound, []);
      }

      const measuredMap = new Map<string, MeasuredSceneNode>();
      const nodeById = new Map<string, SceneNode>();
      const inDegree = new Map<string, number>();
      const adj = new Map<string, string[]>();

      for (const n of vertices) {
        measuredMap.set(n.id, helpers.measureNode(n));
        nodeById.set(n.id, n);
        inDegree.set(n.id, 0);
        adj.set(n.id, []);
      }

      for (const c of boundConnectors) {
        const topFrom = ownerVertexIdMap.get(c.fromId!);
        const topTo = ownerVertexIdMap.get(c.toId!);
        if (topFrom && topTo && topFrom !== topTo) {
          adj.get(topFrom)!.push(topTo);
          inDegree.set(topTo, (inDegree.get(topTo) ?? 0) + 1);
        }
      }

      const rootNode =
        vertices.find((n) => n.meta?.role === 'root') ??
        vertices.find((n) => (inDegree.get(n.id) ?? 0) === 0) ??
        vertices[0];

      const treeChildren = new Map<string, string[]>();
      for (const n of vertices) treeChildren.set(n.id, []);
      const treeEdgeSet = new Set<string>();
      const visited = new Set<string>([rootNode.id]);
      const bfsQueue: string[] = [rootNode.id];

      while (bfsQueue.length > 0) {
        const curr = bfsQueue.shift()!;
        for (const nextId of adj.get(curr) ?? []) {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            treeChildren.get(curr)!.push(nextId);
            treeEdgeSet.add(`${curr}->${nextId}`);
            bfsQueue.push(nextId);
          }
        }
      }

      const gapX = 115;
      const gapY = 38;

      const weightCache = new Map<string, number>();
      const computeSubtreeWeight = (id: string): number => {
        if (weightCache.has(id)) return weightCache.get(id)!;
        const children = treeChildren.get(id) ?? [];
        const w =
          children.length === 0
            ? 1
            : children.reduce((acc, c) => acc + computeSubtreeWeight(c), 0);
        weightCache.set(id, w);
        return w;
      };

      const heightCache = new Map<string, number>();
      const computeSubtreeHeight = (id: string): number => {
        if (heightCache.has(id)) return heightCache.get(id)!;
        const ownH = measuredMap.get(id)!.height;
        const children = treeChildren.get(id) ?? [];
        if (children.length === 0) {
          heightCache.set(id, ownH);
          return ownH;
        }
        const childrenSum =
          children.reduce((acc, c) => acc + computeSubtreeHeight(c), 0) +
          (children.length - 1) * gapY;
        const total = Math.max(ownH, childrenSum);
        heightCache.set(id, total);
        return total;
      };

      const baseCenters = new Map<string, Point>();
      const branchDir = new Map<string, 1 | -1>();
      baseCenters.set(rootNode.id, { x: 0, y: 0 });

      const rootChildren = treeChildren.get(rootNode.id) ?? [];
      const rightChildren: string[] = [];
      const leftChildren: string[] = [];

      if (rootChildren.length === 1) {
        rightChildren.push(rootChildren[0]);
      } else {
        let rightWeight = 0;
        let leftWeight = 0;
        for (const childId of rootChildren) {
          const w = computeSubtreeWeight(childId);
          if (rightWeight <= leftWeight) {
            rightChildren.push(childId);
            rightWeight += w;
          } else {
            leftChildren.push(childId);
            leftWeight += w;
          }
        }
      }

      const layoutSubtree = (
        parentId: string,
        children: string[],
        dir: 1 | -1
      ) => {
        if (children.length === 0) return;
        const parentCenter = baseCenters.get(parentId)!;
        const parentM = measuredMap.get(parentId)!;

        const totalChildrenH =
          children.reduce((acc, c) => acc + computeSubtreeHeight(c), 0) +
          (children.length - 1) * gapY;

        let cursorY = parentCenter.y - totalChildrenH / 2;

        for (const childId of children) {
          const subH = computeSubtreeHeight(childId);
          const childM = measuredMap.get(childId)!;
          const childCy = cursorY + subH / 2;
          const childCx =
            parentCenter.x + dir * (parentM.width / 2 + gapX + childM.width / 2);

          baseCenters.set(childId, { x: childCx, y: childCy });
          branchDir.set(childId, dir);
          cursorY += subH + gapY;

          layoutSubtree(childId, treeChildren.get(childId) ?? [], dir);
        }
      };

      layoutSubtree(rootNode.id, rightChildren, 1);
      layoutSubtree(rootNode.id, leftChildren, -1);

      const unvisitedNodes = vertices.filter((n) => !baseCenters.has(n.id));
      if (unvisitedNodes.length > 0) {
        let maxBottom = measuredMap.get(rootNode.id)!.height / 2;
        for (const [id, pt] of baseCenters.entries()) {
          maxBottom = Math.max(
            maxBottom,
            pt.y + measuredMap.get(id)!.height / 2
          );
        }

        const rowGapX = 56;
        const rowGapY = 44;
        const rowWidthLimit = 980;
        let rowNodes: SceneNode[] = [];
        let rowWidth = 0;
        let cursorY = maxBottom + 96;

        const flushRow = () => {
          if (rowNodes.length === 0) return;
          const maxH = Math.max(
            ...rowNodes.map((n) => measuredMap.get(n.id)!.height)
          );
          let cursorX = -rowWidth / 2;
          for (const n of rowNodes) {
            const m = measuredMap.get(n.id)!;
            baseCenters.set(n.id, {
              x: cursorX + m.width / 2,
              y: cursorY + maxH / 2,
            });
            cursorX += m.width + rowGapX;
          }
          cursorY += maxH + rowGapY;
          rowNodes = [];
          rowWidth = 0;
        };

        for (const n of unvisitedNodes) {
          const m = measuredMap.get(n.id)!;
          const nextW =
            rowNodes.length === 0 ? m.width : rowWidth + rowGapX + m.width;
          if (rowNodes.length > 0 && nextW > rowWidthLimit) {
            flushRow();
          }
          rowNodes.push(n);
          rowWidth =
            rowNodes.length === 1 ? m.width : rowWidth + rowGapX + m.width;
        }
        flushRow();
      }

      const positionedNodes: PositionedSceneNode[] = [];
      const vertexMap = new Map<string, PositionedSceneNode>();
      const positionedVertices: PositionedSceneNode[] = [];
      for (const n of vertices) {
        const pt = baseCenters.get(n.id)!;
        const pNode = makePositionedNode(
          n,
          pt.x,
          pt.y,
          measuredMap.get(n.id)!,
          helpers
        );
        positionedNodes.push(pNode);
        positionedVertices.push(pNode);
        indexNodesRecursively([pNode], vertexMap);
      }

      const bowMap = computeConnectorBowMap(boundConnectors);
      const routedMidpoints: Point[] = [];

      for (const conn of boundConnectors) {
        const fromNode = vertexMap.get(conn.fromId!)!;
        const toNode = vertexMap.get(conn.toId!)!;
        const topFrom = ownerVertexIdMap.get(conn.fromId!) ?? conn.fromId!;
        const topTo = ownerVertexIdMap.get(conn.toId!) ?? conn.toId!;
        const obstacles = collectObstaclesForConnector(
          conn,
          positionedVertices,
          ownerVertexIdMap
        );

        if (treeEdgeSet.has(`${topFrom}->${topTo}`)) {
          const dir: 1 | -1 =
            branchDir.get(topTo) ?? (toNode.cx >= fromNode.cx ? 1 : -1);
          const start = clipPointToNodeBorder(
            fromNode,
            { x: fromNode.cx + dir * 200, y: fromNode.cy },
            5
          );
          const end = clipPointToNodeBorder(
            toNode,
            { x: toNode.cx - dir * 200, y: toNode.cy },
            6
          );
          const spanX = Math.max(Math.abs(end.x - start.x) * 0.48, 36);
          const c1 = { x: start.x + dir * spanX, y: start.y };
          const c2 = { x: end.x - dir * spanX, y: end.y };
          const pts = sampleCubicBezier(start, c1, c2, end, 20);
          const treeEdge = createPositionedConnectorFromPoints(conn, pts);

          const hitsObstacle =
            countPolylineCollisions(pts, obstacles, 6) > 0 ||
            (treeEdge.labelPoint &&
              pointHitsAnyObstacle(treeEdge.labelPoint, obstacles, 20, 10));

          positionedNodes.push(
            hitsObstacle
              ? routeObstacleAwareConnector(
                  conn,
                  vertexMap,
                  positionedVertices,
                  ownerVertexIdMap,
                  {
                    preferredBow: bowMap.get(conn.id) ?? 0,
                    routedMidpoints,
                  }
                )
              : treeEdge
          );
        } else {
          positionedNodes.push(
            routeObstacleAwareConnector(
              conn,
              vertexMap,
              positionedVertices,
              ownerVertexIdMap,
              {
                preferredBow: bowMap.get(conn.id) || 44,
                routedMidpoints,
              }
            )
          );
        }
      }

      for (const conn of unboundConnectors) {
        positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
      }

      return finalizeLayout(positionedNodes, []);
    },
  };
  return { mindmapPlugin };
})();

// --- Module: src/plugins/layouts/conceptGraphPlugin.ts ---
const { conceptGraphPlugin } = (() => {
  const conceptGraphPlugin: LayoutPlugin = {
    id: 'concept-graph',
    name: 'Concept Graph',
    category: 'diagram',
    icon: 'concept-graph',
    dragMode: 'offset',
    supportsEdges: true,
    supportsGroups: true,
    textCodec: graphScriptCodec,
    deriveSteps: deriveTeachingSteps,
    compute(scene, helpers) {
      const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
        splitSceneNodes(scene.nodes);

      if (vertices.length === 0) {
        const emptyMap = new Map<string, PositionedSceneNode>();
        const unbound = unboundConnectors.map((c) =>
          buildConnectorNode(c, emptyMap, 0)
        );
        return finalizeLayout(unbound, []);
      }

      const measuredMap = new Map<string, MeasuredSceneNode>();
      for (const n of vertices) {
        measuredMap.set(n.id, helpers.measureNode(n));
      }

      const groupOrder: string[] = [];
      const groupBuckets = new Map<string, SceneNode[]>();

      for (const node of vertices) {
        const rawZone = node.meta?.zone;
        const zoneName =
          typeof rawZone === 'string' && rawZone.trim()
            ? rawZone.trim()
            : '核心概念';
        if (!groupBuckets.has(zoneName)) {
          groupBuckets.set(zoneName, []);
          groupOrder.push(zoneName);
        }
        groupBuckets.get(zoneName)!.push(node);
      }

      const nodeGapX = 74;
      const nodeGapY = 62;
      const groupPad = 42;
      const groupHeader = 34;
      const groupGapX = 110;
      const groupGapY = 85;

      interface PackedGroup {
        title: string;
        color: ChalkColor;
        width: number;
        height: number;
        localCenters: Map<string, Point>;
        nodes: SceneNode[];
      }

      const packedGroups: PackedGroup[] = groupOrder.map((title) => {
        const members = groupBuckets.get(title)!;
        const cols =
          members.length === 1
            ? 1
            : scene.aspectRatio === '9:16' && members.length <= 2
            ? 1
            : members.length >= 7
            ? 3
            : 2;
        const rows = Math.ceil(members.length / cols);

        const colWidths = new Array<number>(cols).fill(0);
        const rowHeights = new Array<number>(rows).fill(0);

        members.forEach((n, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const m = measuredMap.get(n.id)!;
          colWidths[c] = Math.max(colWidths[c], m.width);
          rowHeights[r] = Math.max(rowHeights[r], m.height);
        });

        const contentW =
          colWidths.reduce((a, b) => a + b, 0) + Math.max(0, cols - 1) * nodeGapX;
        const contentH =
          rowHeights.reduce((a, b) => a + b, 0) +
          Math.max(0, rows - 1) * nodeGapY;

        const width = contentW + groupPad * 2;
        const height = groupHeader + contentH + groupPad * 2;

        const colOffsets: number[] = [];
        let cxCursor = groupPad;
        for (let c = 0; c < cols; c++) {
          colOffsets.push(cxCursor + colWidths[c] / 2);
          cxCursor += colWidths[c] + nodeGapX;
        }

        const rowOffsets: number[] = [];
        let cyCursor = groupPad + groupHeader;
        for (let r = 0; r < rows; r++) {
          rowOffsets.push(cyCursor + rowHeights[r] / 2);
          cyCursor += rowHeights[r] + nodeGapY;
        }

        const localCenters = new Map<string, Point>();
        members.forEach((n, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          localCenters.set(n.id, { x: colOffsets[c], y: rowOffsets[r] });
        });

        return {
          title,
          color: members[0].color,
          width,
          height,
          localCenters,
          nodes: members,
        };
      });

      const outerCols =
        packedGroups.length <= 1 || scene.aspectRatio === '9:16' ? 1 : 2;
      const outerRows = Math.ceil(packedGroups.length / outerCols);
      const outerColWidths = new Array<number>(outerCols).fill(0);
      const outerRowHeights = new Array<number>(outerRows).fill(0);

      packedGroups.forEach((pg, idx) => {
        const r = Math.floor(idx / outerCols);
        const c = idx % outerCols;
        outerColWidths[c] = Math.max(outerColWidths[c], pg.width);
        outerRowHeights[r] = Math.max(outerRowHeights[r], pg.height);
      });

      const outerColX: number[] = [];
      let gxCursor = 0;
      for (let c = 0; c < outerCols; c++) {
        outerColX.push(gxCursor);
        gxCursor += outerColWidths[c] + groupGapX;
      }

      const outerRowY: number[] = [];
      let gyCursor = 0;
      for (let r = 0; r < outerRows; r++) {
        outerRowY.push(gyCursor);
        gyCursor += outerRowHeights[r] + groupGapY;
      }

      const positionedNodes: PositionedSceneNode[] = [];
      const vertexMap = new Map<string, PositionedSceneNode>();
      const positionedVertices: PositionedSceneNode[] = [];
      const zones: GroupBox[] = [];

      packedGroups.forEach((pg, idx) => {
        const r = Math.floor(idx / outerCols);
        const c = idx % outerCols;
        const originX = outerColX[c] + (outerColWidths[c] - pg.width) / 2;
        const originY = outerRowY[r] + (outerRowHeights[r] - pg.height) / 2;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const node of pg.nodes) {
          const local = pg.localCenters.get(node.id)!;
          const m = measuredMap.get(node.id)!;
          const pNode = makePositionedNode(
            node,
            originX + local.x,
            originY + local.y,
            m,
            helpers
          );
          positionedNodes.push(pNode);
          positionedVertices.push(pNode);
          indexNodesRecursively([pNode], vertexMap);

          minX = Math.min(minX, pNode.cx - pNode.width / 2);
          minY = Math.min(minY, pNode.cy - pNode.height / 2);
          maxX = Math.max(maxX, pNode.cx + pNode.width / 2);
          maxY = Math.max(maxY, pNode.cy + pNode.height / 2);
        }

        zones.push({
          id: `group-${idx}-${pg.title}`,
          title: pg.title,
          x: minX - groupPad * 0.72,
          y: minY - groupPad * 0.72 - groupHeader,
          width: maxX - minX + groupPad * 1.44,
          height: maxY - minY + groupPad * 1.44 + groupHeader,
          color: pg.color,
        });
      });

      const bowMap = computeConnectorBowMap(boundConnectors);
      const routedMidpoints: Point[] = [];
      for (const conn of boundConnectors) {
        const fromNode = vertexMap.get(conn.fromId!)!;
        const toNode = vertexMap.get(conn.toId!)!;
        let bow = bowMap.get(conn.id) ?? 0;
        const dist = Math.hypot(
          toNode.cx - fromNode.cx,
          toNode.cy - fromNode.cy
        );
        if (bow === 0 && dist > 320) {
          bow = 28;
        }
        positionedNodes.push(
          routeObstacleAwareConnector(
            conn,
            vertexMap,
            positionedVertices,
            ownerVertexIdMap,
            {
              preferredBow: bow,
              routedMidpoints,
            }
          )
        );
      }

      for (const conn of unboundConnectors) {
        positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
      }

      return finalizeLayout(positionedNodes, zones);
    },
  };
  return { conceptGraphPlugin };
})();

// --- Module: src/plugins/codecs/documentParser.ts ---
const { documentScriptCodec } = (() => {
  const DEFAULT_MAX_WIDTH = 580;
  const VALID_DOC_COLORS = new Set<ChalkColor>([
    'white',
    'yellow',
    'cyan',
    'pink',
    'green',
    'orange',
  ]);
  const VALID_DOC_ALIGNS = new Set<TextAlign>(['left', 'center', 'right']);
  function extractDocBlockMeta(raw: string): {
    text: string;
    meta: DocBlockMeta;
  } {
    const split = extractTrailingMetaBlock(raw);
    if (!split) {
      return { text: raw, meta: {} };
    }

    const pairs = splitMetaPairs(split.metaRaw);
    if (pairs.length === 0) {
      return { text: raw, meta: {} };
    }

    const meta: DocBlockMeta = {};
    let xVal: number | undefined;
    let yVal: number | undefined;

    for (const pair of pairs) {
      const colonIdx = pair.search(/[:：]/);
      if (colonIdx === -1) return { text: raw, meta: {} };
      const key = pair.slice(0, colonIdx).trim().toLowerCase();
      const val = pair.slice(colonIdx + 1).trim();

      if (key === 'color' || key === '颜色') {
        const lower = val.toLowerCase() as ChalkColor;
        if (!VALID_DOC_COLORS.has(lower)) return { text: raw, meta: {} };
        meta.color = lower;
      } else if (key === 'align' || key === '对齐') {
        const lower = val.toLowerCase() as TextAlign;
        if (!VALID_DOC_ALIGNS.has(lower)) return { text: raw, meta: {} };
        meta.align = lower;
      } else if (key === 'size' || key === 'fontsize' || key === '字号') {
        const num = Number(val);
        if (!Number.isFinite(num) || num <= 0) return { text: raw, meta: {} };
        meta.fontSize = num;
      } else if (key === 'bold' || key === '加粗') {
        const lower = val.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === '700') {
          meta.bold = true;
        } else if (lower === 'false' || lower === '0' || lower === '400') {
          meta.bold = false;
        } else {
          return { text: raw, meta: {} };
        }
      } else if (key === 'indent' || key === 'indentchars' || key === '缩进') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0) return { text: raw, meta: {} };
        meta.indentChars = Math.round(num);
      } else if (key === 'x') {
        const num = Number(val);
        if (!Number.isFinite(num)) return { text: raw, meta: {} };
        xVal = num;
      } else if (key === 'y') {
        const num = Number(val);
        if (!Number.isFinite(num)) return { text: raw, meta: {} };
        yVal = num;
      } else if (
        key === 'say' ||
        key === 'caption' ||
        key === '字幕' ||
        key === '讲解'
      ) {
        const textVal = unquoteMetaString(val).trim();
        if (!textVal) return { text: raw, meta: {} };
        meta.say = textVal;
      } else if (key === 'pause' || key === 'pausems' || key === '停顿') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0) return { text: raw, meta: {} };
        meta.pause = Math.round(num);
      } else {
        return { text: raw, meta: {} };
      }
    }

    if (xVal !== undefined || yVal !== undefined) {
      meta.offset = { x: xVal ?? 0, y: yVal ?? 0 };
    }

    return { text: split.body, meta };
  }
  function formatDocBlockMeta(
    node: {
      color: ChalkColor;
      fontSize?: number;
      fontWeight?: 400 | 700;
      align?: TextAlign;
      indentChars?: number;
      offset?: Point;
      meta?: Record<string, string | number | boolean | undefined>;
    },
    defaults: {
      color: ChalkColor;
      fontSize?: number;
      fontWeight?: 400 | 700;
      align?: TextAlign;
      indentChars?: number;
    }
  ): string {
    const parts: string[] = [];
    if (node.color !== defaults.color) {
      parts.push(`color: ${node.color}`);
    }
    if (
      defaults.fontSize !== undefined &&
      node.fontSize !== undefined &&
      node.fontSize !== defaults.fontSize
    ) {
      parts.push(`size: ${node.fontSize}`);
    }
    if (
      defaults.fontWeight !== undefined &&
      (node.fontWeight ?? 400) !== defaults.fontWeight
    ) {
      parts.push(`bold: ${(node.fontWeight ?? 400) === 700}`);
    }
    if (
      defaults.align !== undefined &&
      node.align !== undefined &&
      node.align !== defaults.align
    ) {
      parts.push(`align: ${node.align}`);
    }
    if (
      defaults.indentChars !== undefined &&
      (node.indentChars ?? 0) !== defaults.indentChars
    ) {
      parts.push(`indent: ${node.indentChars ?? 0}`);
    }
    if (typeof node.meta?.say === 'string' && node.meta.say.trim()) {
      parts.push(`say: ${formatMetaString(node.meta.say)}`);
    }
    if (
      typeof node.meta?.pause === 'number' &&
      Number.isFinite(node.meta.pause) &&
      node.meta.pause >= 0
    ) {
      parts.push(`pause: ${Math.round(node.meta.pause)}`);
    }
    if ((node.offset?.x ?? 0) !== 0 || (node.offset?.y ?? 0) !== 0) {
      parts.push(
        `x: ${Math.round(node.offset?.x ?? 0)}`,
        `y: ${Math.round(node.offset?.y ?? 0)}`
      );
    }
    return parts.length > 0 ? ` {${parts.join(', ')}}` : '';
  }
  const COORD_PAIR_REGEX =
    /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;
  function isGraphTagLine(trimmed: string): boolean {
    return /^\[(?:text|shape:[^\]\s]+|node:[^\]\s]+|group|root|step|concept|highlight|note)(?:#[^\]]+)?\]\s+\S/i.test(
      trimmed
    );
  }
  function isConnectorLine(trimmed: string): boolean {
    if (/^>/.test(trimmed) || /^[-*#]/.test(trimmed)) return false;
    if (/\{[^}]*\}\s*$/.test(trimmed)) {
      const withoutMeta = trimmed.replace(/\s*\{[^}]*\}\s*$/, '');
      return /^(.+?)\s*(-\.->|->)\s*(.+)$/.test(withoutMeta);
    }
    return /^(.+?)\s*(-\.->|->)\s*(.+)$/.test(trimmed);
  }
  function makeUniqueId(prefix: string, idx: number, usedIds: Set<string>): string {
    const base = `${prefix}-${idx + 1}`;
    let candidate = base;
    let n = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${n}`;
      n++;
    }
    usedIds.add(candidate);
    return candidate;
  }
  const documentScriptCodec: SceneTextCodec = {
    id: 'document-md',
    label: 'Document',
    hintTitle: 'Document Markdown (Letter / Plain Text)',
    hintLines: [
      '# Title  Set document title',
      '## Greeting or Heading  Bold left-aligned',
      '>> Paragraph {color: cyan}  Indented body paragraph',
      '---  Insert hand-drawn divider',
      '> Sign-off & Date  Right-aligned block',
    ],
    syntaxRules: [
      'Optional scene title header at top: `# Scene Title`',
      'Bold left-aligned heading / salutation: `## Greeting or Heading`',
      'Indented body paragraph (2-char first-line indent): `>> Paragraph text...`',
      'Plain body paragraph (no indent): plain text lines separated by blank lines',
      'Hand-drawn horizontal divider stroke: `---`',
      'Right-aligned sign-off / date block (consecutive `>` lines merge into one block): `> Line 1`',
      'Optional trailing style & narration metadata on any block: `{color: white|yellow|cyan|pink|green|orange, align: left|center|right, size: <num>, say: "spoken subtitle", pause: <ms>}`',
    ],
    example: [
      '# Letter to Creators',
      '',
      '## Dear Creators,',
      '',
      '>> Penova compiles plain text into stroke-by-stroke handwriting animations.',
      '',
      '---',
      '',
      '> Crafted with Penova',
      '> MIT Open Source',
    ].join('\n'),
    parse(text, base) {
      const warnings: string[] = [];
      const lines = stripMarkdownFence(text).replace(/\r\n/g, '\n').split('\n');
      const existingVertices = base.nodes.filter((n) => n.type !== 'connector');

      let title = base.title;
      let cursor = 0;

      // Skip leading blank lines and optional # title header
      while (cursor < lines.length && lines[cursor].trim() === '') {
        cursor++;
      }
      if (cursor < lines.length && /^#\s+/.test(lines[cursor].trim())) {
        const parsedTitle = lines[cursor].trim().replace(/^#\s+/, '').trim();
        if (parsedTitle) {
          title = parsedTitle;
        }
        cursor++;
      }

      type DraftBlock =
        | { kind: 'divider'; meta: DocBlockMeta }
        | { kind: 'heading'; text: string; meta: DocBlockMeta }
        | { kind: 'quote-right'; text: string; meta: DocBlockMeta }
        | { kind: 'indented'; text: string; meta: DocBlockMeta }
        | { kind: 'paragraph'; text: string; meta: DocBlockMeta }
        | { kind: 'graph'; rawLines: string[] }
        | { kind: 'connector-candidate'; rawLine: string };

      const blocks: DraftBlock[] = [];
      const isDividerLine = (t: string) => /^---+(?:\s*\{[^}]*\})?$/.test(t);
      const isSpecialDocBoundary = (t: string) =>
        t === '' ||
        isDividerLine(t) ||
        /^##\s+/.test(t) ||
        /^>/.test(t) ||
        isGraphTagLine(t) ||
        isConnectorLine(t);

      while (cursor < lines.length) {
        const raw = lines[cursor];
        const trimmed = raw.trim();

        if (trimmed === '') {
          cursor++;
          continue;
        }

        if (isGraphTagLine(trimmed)) {
          const blockLines = [raw];
          cursor++;
          while (cursor < lines.length) {
            const nextRaw = lines[cursor];
            const nextTrimmed = nextRaw.trim();
            if (nextTrimmed === '' || !/^ {2,}/.test(nextRaw)) break;
            blockLines.push(nextRaw);
            cursor++;
          }
          blocks.push({ kind: 'graph', rawLines: blockLines });
          continue;
        }

        if (isConnectorLine(trimmed)) {
          blocks.push({ kind: 'connector-candidate', rawLine: trimmed });
          cursor++;
          continue;
        }

        if (isDividerLine(trimmed)) {
          const { meta } = extractDocBlockMeta(trimmed.replace(/^---+/, '').trim());
          blocks.push({ kind: 'divider', meta });
          cursor++;
          continue;
        }

        if (/^##\s+/.test(trimmed)) {
          const extracted = extractDocBlockMeta(
            trimmed.replace(/^##\s+/, '').trim()
          );
          blocks.push({
            kind: 'heading',
            text: extracted.text,
            meta: extracted.meta,
          });
          cursor++;
          continue;
        }

        // Check >> before > so indented lines are never treated as right-aligned quotes
        if (/^>>/.test(trimmed)) {
          const paraLines: string[] = [];
          while (cursor < lines.length) {
            const curTrimmed = lines[cursor].trim();
            if (
              curTrimmed === '' ||
              isDividerLine(curTrimmed) ||
              /^##\s+/.test(curTrimmed) ||
              (/^>/.test(curTrimmed) && !/^>>/.test(curTrimmed)) ||
              isGraphTagLine(curTrimmed) ||
              isConnectorLine(curTrimmed)
            ) {
              break;
            }
            paraLines.push(curTrimmed.replace(/^>>\s?/, ''));
            cursor++;
          }
          const extracted = extractDocBlockMeta(paraLines.join('\n'));
          blocks.push({
            kind: 'indented',
            text: extracted.text,
            meta: extracted.meta,
          });
          continue;
        }

        if (/^>/.test(trimmed)) {
          const quoteLines: string[] = [];
          while (cursor < lines.length) {
            const curTrimmed = lines[cursor].trim();
            if (!/^>/.test(curTrimmed) || /^>>/.test(curTrimmed)) {
              break;
            }
            quoteLines.push(curTrimmed.replace(/^>\s?/, ''));
            cursor++;
          }
          const extracted = extractDocBlockMeta(quoteLines.join('\n'));
          blocks.push({
            kind: 'quote-right',
            text: extracted.text,
            meta: extracted.meta,
          });
          continue;
        }

        // Plain paragraph block until blank line or block marker
        const plainLines: string[] = [];
        while (cursor < lines.length) {
          const curTrimmed = lines[cursor].trim();
          if (isSpecialDocBoundary(curTrimmed)) {
            break;
          }
          plainLines.push(curTrimmed);
          cursor++;
        }
        const extracted = extractDocBlockMeta(plainLines.join('\n'));
        blocks.push({
          kind: 'paragraph',
          text: extracted.text,
          meta: extracted.meta,
        });
      }

      if (blocks.length === 0) {
        warnings.push(
          'Document body is empty; add at least one paragraph or divider (---).'
        );
      }

      const usedIds = new Set<string>();
      const nodeByRef = new Map<string, SceneNode>();
      const registerNodeRefs = (node: SceneNode) => {
        nodeByRef.set(`#${node.id}`, node);
        nodeByRef.set(node.id, node);
        if (node.name && !nodeByRef.has(node.name)) {
          nodeByRef.set(node.name, node);
        }
        if (node.type === 'text') {
          const t = node.text.trim();
          if (t && !nodeByRef.has(t)) nodeByRef.set(t, node);
          const firstLine = t.split(/\r?\n/)[0]?.trim();
          if (firstLine && !nodeByRef.has(firstLine)) {
            nodeByRef.set(firstLine, node);
          }
        }
        if (node.type === 'group') {
          for (const child of node.children) {
            registerNodeRefs(child);
          }
        }
      };

      const buildBlockNodeMeta = (
        m: DocBlockMeta
      ): Record<string, string | number | boolean | undefined> | undefined => {
        if (m.say === undefined && m.pause === undefined) return undefined;
        return {
          ...(m.say !== undefined ? { say: m.say } : {}),
          ...(m.pause !== undefined ? { pause: m.pause } : {}),
        };
      };

      const existingDocVertices = existingVertices.filter(
        (n) =>
          n.type === 'text' || (n.type === 'shape' && n.shape === 'divider')
      );
      let docVertexCursor = 0;

      const slotNodes = new Map<number, SceneNode[]>();
      const appendVertex = (slotIdx: number, n: SceneNode) => {
        const list = slotNodes.get(slotIdx) ?? [];
        list.push(n);
        slotNodes.set(slotIdx, list);
        registerNodeRefs(n);
      };

      for (let idx = 0; idx < blocks.length; idx++) {
        const block = blocks[idx];
        if (block.kind === 'connector-candidate') continue;

        if (block.kind === 'graph') {
          const subResult = parseScriptToScene(
            [`# ${title}`, ...block.rawLines].join('\n'),
            { ...base, nodes: base.nodes }
          );
          warnings.push(...subResult.warnings);
          for (const n of subResult.scene.nodes) {
            if (n.type === 'connector') continue;
            if (usedIds.has(n.id)) {
              let nIdx = 2;
              while (usedIds.has(`${n.id}-${nIdx}`)) nIdx++;
              n.id = `${n.id}-${nIdx}`;
            }
            usedIds.add(n.id);
            appendVertex(idx, n);
          }
          continue;
        }

        const existing = existingDocVertices[docVertexCursor++];
        const stepMeta = buildBlockNodeMeta(block.meta);

        if (block.kind === 'divider') {
          const matchDiv =
            existing?.type === 'shape' && existing.shape === 'divider'
              ? existing
              : undefined;
          const id =
            matchDiv && !usedIds.has(matchDiv.id)
              ? (usedIds.add(matchDiv.id), matchDiv.id)
              : makeUniqueId('doc-div', idx, usedIds);
          const shapeNode: ShapeSceneNode = {
            id,
            type: 'shape',
            name: matchDiv?.name ?? 'Divider',
            shape: 'divider',
            color: (block.meta.color ?? matchDiv?.color ?? 'orange') as ChalkColor,
            width: matchDiv?.width ?? 560,
            height: matchDiv?.height ?? 24,
            fitMode: 'fixed',
            offset: block.meta.offset ?? matchDiv?.offset,
            meta: stepMeta,
          };
          appendVertex(idx, shapeNode);
          continue;
        }

        const existingText =
          existing?.type === 'text' ? existing : undefined;
        const id =
          existing && !usedIds.has(existing.id)
            ? (usedIds.add(existing.id), existing.id)
            : makeUniqueId('doc-text', idx, usedIds);

        let textNode: TextSceneNode;
        if (block.kind === 'heading') {
          textNode = {
            id,
            type: 'text',
            name: block.text.slice(0, 18) || 'Heading',
            color: block.meta.color ?? existingText?.color ?? 'white',
            text: block.text,
            fontSize:
              block.meta.fontSize ??
              (existingText?.fontWeight === 700 ? existingText.fontSize ?? 25 : 25),
            fontWeight: block.meta.bold === false ? 400 : 700,
            maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
            align: block.meta.align ?? 'left',
            ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
            offset: block.meta.offset ?? existing?.offset,
            meta: stepMeta,
          };
        } else if (block.kind === 'quote-right') {
          textNode = {
            id,
            type: 'text',
            name: existingText?.align === 'right' ? existingText.name : 'Sign-off',
            color:
              block.meta.color ??
              (existingText?.align === 'right' ? existingText.color : 'orange'),
            text: block.text,
            fontSize:
              block.meta.fontSize ??
              (existingText?.align === 'right' ? existingText.fontSize ?? 20 : 20),
            fontWeight: block.meta.bold ? 700 : 400,
            maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
            align: block.meta.align ?? 'right',
            ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
            offset: block.meta.offset ?? existing?.offset,
            meta: stepMeta,
          };
        } else if (block.kind === 'indented') {
          textNode = {
            id,
            type: 'text',
            name:
              existingText && (existingText.indentChars ?? 0) > 0
                ? existingText.name
                : block.text.slice(0, 18) || 'Body',
            color: block.meta.color ?? existingText?.color ?? 'white',
            text: block.text,
            fontSize: block.meta.fontSize ?? existingText?.fontSize ?? 21,
            fontWeight: block.meta.bold ? 700 : 400,
            maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
            align: block.meta.align ?? 'left',
            indentChars: block.meta.indentChars ?? 2,
            offset: block.meta.offset ?? existing?.offset,
            meta: stepMeta,
          };
        } else {
          textNode = {
            id,
            type: 'text',
            name: block.text.slice(0, 18) || 'Paragraph',
            color: block.meta.color ?? existingText?.color ?? 'white',
            text: block.text,
            fontSize: block.meta.fontSize ?? existingText?.fontSize ?? 21,
            fontWeight: block.meta.bold ? 700 : 400,
            maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
            align: block.meta.align ?? existingText?.align ?? 'left',
            ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
            offset: block.meta.offset ?? existing?.offset,
            meta: stepMeta,
          };
        }
        appendVertex(idx, textNode);
      }

      const parsedConnectors: ConnectorSceneNode[] = [];
      for (let idx = 0; idx < blocks.length; idx++) {
        const block = blocks[idx];
        if (block.kind !== 'connector-candidate') continue;

        const m = block.rawLine.match(/^(.+?)\s*(-\.->|->)\s*(.+)$/);
        if (!m) continue;
        const fromRef = m[1].trim();
        const arrow = m[2];
        let rhs = m[3].trim();

        const extracted = extractDocBlockMeta(rhs);
        rhs = extracted.text.trim();
        let toRef = rhs;
        let edgeLabel: string | undefined;
        if (!nodeByRef.has(rhs) && !(rhs.startsWith('#') && nodeByRef.has(rhs))) {
          const colonIdx = rhs.search(/[:：]/);
          if (colonIdx !== -1) {
            toRef = rhs.slice(0, colonIdx).trim();
            const rawLbl = rhs.slice(colonIdx + 1).trim();
            if (rawLbl) edgeLabel = rawLbl;
          }
        }

        const fromCoord = fromRef.match(COORD_PAIR_REGEX);
        const toCoord = toRef.match(COORD_PAIR_REGEX);
        if (fromCoord && toCoord) {
          const freeConn = createConnectorNode({
            id: `e-doc-${parsedConnectors.length + 1}-free`,
            fromPoint: { x: Number(fromCoord[1]), y: Number(fromCoord[2]) },
            toPoint: { x: Number(toCoord[1]), y: Number(toCoord[2]) },
            label: edgeLabel,
            style: arrow === '-.->' ? 'dashed' : 'solid',
            color: extracted.meta.color ?? 'white',
          });
          if (extracted.meta.offset) freeConn.offset = extracted.meta.offset;
          parsedConnectors.push(freeConn);
          continue;
        }

        const fromHit = nodeByRef.get(fromRef);
        const toHit = nodeByRef.get(toRef);
        const isExplicitRef = fromRef.startsWith('#') || toRef.startsWith('#');
        if (!isExplicitRef && (!fromHit || !toHit)) {
          // Treat plain prose line containing '->' (without resolved nodes) as a document paragraph
          const extractedPara = extractDocBlockMeta(block.rawLine);
          const existing = existingDocVertices[docVertexCursor++];
          const id =
            existing && !usedIds.has(existing.id)
              ? (usedIds.add(existing.id), existing.id)
              : makeUniqueId('doc-text', idx, usedIds);
          const paraNode: TextSceneNode = {
            id,
            type: 'text',
            name: extractedPara.text.slice(0, 18) || 'Paragraph',
            color: extractedPara.meta.color ?? 'white',
            text: extractedPara.text,
            fontSize: extractedPara.meta.fontSize ?? 21,
            fontWeight: extractedPara.meta.bold ? 700 : 400,
            maxWidth: DEFAULT_MAX_WIDTH,
            align: extractedPara.meta.align ?? 'left',
            ...(extractedPara.meta.indentChars
              ? { indentChars: extractedPara.meta.indentChars }
              : {}),
            offset: extractedPara.meta.offset,
            meta: buildBlockNodeMeta(extractedPara.meta),
          };
          appendVertex(idx, paraNode);
          continue;
        }

        const resolveOrCreateNode = (ref: string, hit?: SceneNode): SceneNode => {
          if (hit) return hit;
          const card = createCardNode({
            id: makeUniqueId('doc-card', idx, usedIds),
            label: ref,
            color: 'white',
          });
          appendVertex(idx, card);
          return card;
        };

        const fromNode = resolveOrCreateNode(fromRef, fromHit);
        const toNode = resolveOrCreateNode(toRef, toHit);
        const boundConn = createConnectorNode({
          id: `e-doc-${parsedConnectors.length + 1}-${fromNode.id}-${toNode.id}`,
          fromId: fromNode.id,
          toId: toNode.id,
          label: edgeLabel,
          style: arrow === '-.->' ? 'dashed' : 'solid',
          color: extracted.meta.color ?? fromNode.color,
        });
        if (extracted.meta.offset) boundConn.offset = extracted.meta.offset;
        parsedConnectors.push(boundConn);
      }

      const parsedVertices: SceneNode[] = [];
      for (let idx = 0; idx < blocks.length; idx++) {
        const list = slotNodes.get(idx);
        if (list) parsedVertices.push(...list);
      }

      const nextScene: LessonScene = {
        ...base,
        title,
        customSteps: undefined,
        nodes: [...parsedVertices, ...parsedConnectors],
      };

      return { scene: nextScene, warnings };
    },
    serialize(scene) {
      const out: string[] = [`# ${scene.title}`, ''];
      const labelCounts = new Map<string, number>();
      const referencedIds = new Set<string>();
      const idToLabel = new Map<string, string>();
      const idToColor = new Map<string, ChalkColor>();
      const connectors: ConnectorSceneNode[] = [];

      for (const node of scene.nodes) {
        if (node.type === 'connector') {
          if (node.fromId) referencedIds.add(node.fromId);
          if (node.toId) referencedIds.add(node.toId);
          connectors.push(node);
          continue;
        }
        const lbl =
          node.type === 'text'
            ? node.text.trim().split(/\r?\n/)[0]?.trim() || node.name
            : node.name.trim();
        labelCounts.set(lbl, (labelCounts.get(lbl) ?? 0) + 1);
      }

      for (const node of scene.nodes) {
        if (node.type === 'connector' || node.visible === false) continue;

        if (
          node.type === 'shape' &&
          node.shape === 'divider' &&
          !referencedIds.has(node.id)
        ) {
          idToLabel.set(node.id, node.name || `#${node.id}`);
          idToColor.set(node.id, node.color);
          const metaStr = formatDocBlockMeta(node, { color: 'orange' });
          out.push(`---${metaStr}`, '');
          continue;
        }

        if (
          node.type === 'shape' ||
          node.type === 'group' ||
          isCustomSceneNode(node)
        ) {
          const extraLines: string[] = [];
          serializeNodeLines(
            node,
            0,
            extraLines,
            idToLabel,
            idToColor,
            connectors,
            labelCounts,
            referencedIds
          );
          if (extraLines.length > 0) {
            out.push(...extraLines, '');
          }
          continue;
        }

        // TextSceneNode
        const singleLine = node.text.trim().split(/\r?\n/)[0]?.trim() ?? '';
        const docRef =
          singleLine &&
          !node.text.includes('\n') &&
          (labelCounts.get(singleLine) ?? 0) === 1
            ? singleLine
            : `#${node.id}`;
        idToLabel.set(node.id, docRef);
        idToColor.set(node.id, node.color);

        if (node.align === 'right') {
          const qLines = node.text
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((l) => `> ${l}`);
          const metaStr = formatDocBlockMeta(node, {
            color: 'orange',
            fontSize: 20,
            fontWeight: 400,
            align: 'right',
            indentChars: 0,
          });
          if (metaStr && qLines.length > 0) {
            qLines[qLines.length - 1] += metaStr;
          }
          out.push(...qLines, '');
        } else if ((node.indentChars ?? 0) > 0) {
          const iLines = node.text
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((l) => `>> ${l}`);
          const metaStr = formatDocBlockMeta(node, {
            color: 'white',
            fontSize: 21,
            fontWeight: 400,
            align: 'left',
            indentChars: 2,
          });
          if (metaStr && iLines.length > 0) {
            iLines[iLines.length - 1] += metaStr;
          }
          out.push(...iLines, '');
        } else if ((node.fontWeight ?? 400) === 700) {
          const single = node.text.replace(/\r?\n/g, ' ').trim();
          const metaStr = formatDocBlockMeta(node, {
            color: 'white',
            fontSize: 25,
            fontWeight: 700,
            align: 'left',
            indentChars: 0,
          });
          out.push(`## ${single}${metaStr}`, '');
        } else if (/^(?:#|>|---+|\[)/.test(node.text.trim())) {
          const extraLines: string[] = [];
          serializeNodeLines(
            node,
            0,
            extraLines,
            idToLabel,
            idToColor,
            connectors,
            labelCounts,
            referencedIds
          );
          if (extraLines.length > 0) {
            out.push(...extraLines, '');
          }
        } else {
          const metaStr = formatDocBlockMeta(node, {
            color: 'white',
            fontSize: 21,
            fontWeight: 400,
            align: 'left',
            indentChars: 0,
          });
          out.push(`${node.text}${metaStr}`, '');
        }
      }

      const connLines = serializeConnectorLines(connectors, idToLabel, idToColor);
      if (connLines.length > 0) {
        out.push(...connLines, '');
      }

      return out.join('\n').trimEnd();
    },
  };
  return { documentScriptCodec };
})();

// --- Module: src/plugins/layouts/documentLayoutPlugin.ts ---
const { documentLayoutPlugin } = (() => {
  const documentLayoutPlugin: LayoutPlugin = {
    id: 'document',
    name: 'Letter / Doc',
    category: 'basic',
    icon: 'document',
    dragMode: 'offset',
    supportsEdges: false,
    supportsGroups: false,
    textCodec: documentScriptCodec,
    deriveSteps(scene: LessonScene): TeachingStep[] {
      if (scene.customSteps && scene.customSteps.length > 0) {
        return scene.customSteps;
      }

      const { ownerVertexIdMap: ownerTopId, boundConnectors } = splitSceneNodes(
        scene.nodes
      );

      const visitedVertices = new Set<string>();
      const placedConnectors = new Set<string>();
      const steps: TeachingStep[] = [];

      for (const node of scene.nodes) {
        if (node.type === 'connector') {
          const isBound = boundConnectors.some((c) => c.id === node.id);
          if (!isBound && !placedConnectors.has(node.id)) {
            placedConnectors.add(node.id);
            steps.push({
              id: `doc-step-${steps.length + 1}-${node.id}`,
              title: node.name || '线条',
              nodeIds: [node.id],
            });
          }
          continue;
        }

        visitedVertices.add(node.id);
        const readyConns: string[] = [];
        for (const c of boundConnectors) {
          const topFrom = ownerTopId.get(c.fromId!);
          const topTo = ownerTopId.get(c.toId!);
          if (
            !placedConnectors.has(c.id) &&
            topFrom &&
            topTo &&
            visitedVertices.has(topFrom) &&
            visitedVertices.has(topTo)
          ) {
            placedConnectors.add(c.id);
            readyConns.push(c.id);
          }
        }

        const rawPause = node.meta?.pause;
        const pauseMs =
          typeof rawPause === 'number' &&
          Number.isFinite(rawPause) &&
          rawPause >= 0
            ? Math.round(rawPause)
            : undefined;

        steps.push({
          id: `doc-step-${steps.length + 1}-${node.id}`,
          title: node.name || '段落',
          nodeIds: [...readyConns, node.id],
          ...(pauseMs !== undefined ? { pauseMs } : {}),
        });
      }

      return steps;
    },
    compute(scene, helpers) {
      const { vertices, boundConnectors, unboundConnectors } = splitSceneNodes(
        scene.nodes
      );

      const pageWidth = scene.aspectRatio === '9:16' ? 440 : 600;
      const gap = 26;

      const measuredList = vertices.map((v) => {
        let measured = helpers.measureNode(v);
        if (
          v.type === 'shape' &&
          v.shape === 'divider' &&
          measured.type === 'shape'
        ) {
          const targetW =
            v.width !== undefined ? Math.min(pageWidth, v.width) : pageWidth;
          measured = { ...measured, width: targetW };
        }
        return { v, measured };
      });

      let totalHeight = 0;
      measuredList.forEach(({ measured }, idx) => {
        totalHeight += measured.height + (idx > 0 ? gap : 0);
      });

      const nodeMap = new Map<string, PositionedSceneNode>();
      const positionedNodes: PositionedSceneNode[] = [];
      let cursorY = -totalHeight / 2;

      for (const { v, measured } of measuredList) {
        let cx = 0;
        if (v.type === 'text') {
          if (v.align === 'left') {
            cx = -pageWidth / 2 + measured.width / 2;
          } else if (v.align === 'right') {
            cx = pageWidth / 2 - measured.width / 2;
          }
        }
        const cy = cursorY + measured.height / 2;
        cursorY += measured.height + gap;

        const pNode = makePositionedNode(v, cx, cy, measured, helpers);
        positionedNodes.push(pNode);
        indexNodesRecursively([pNode], nodeMap);
      }

      const bowMap = computeConnectorBowMap(boundConnectors);
      for (const conn of boundConnectors) {
        positionedNodes.push(
          buildConnectorNode(conn, nodeMap, bowMap.get(conn.id) ?? 0)
        );
      }
      for (const conn of unboundConnectors) {
        positionedNodes.push(buildConnectorNode(conn, nodeMap, 0));
      }

      return finalizeLayout(positionedNodes, []);
    },
  };
  return { documentLayoutPlugin };
})();

// --- Module: src/plugins/layouts/freeformLayoutPlugin.ts ---
const { freeformLayoutPlugin } = (() => {
  const freeformLayoutPlugin: LayoutPlugin = {
    id: 'freeform',
    name: 'Freeform',
    category: 'basic',
    icon: 'freeform',
    dragMode: 'absolute',
    supportsEdges: true,
    supportsGroups: false,
    textCodec: graphScriptCodec,
    deriveSteps: deriveTeachingSteps,
    compute(scene, helpers) {
      const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
        splitSceneNodes(scene.nodes);

      const positionedNodes: PositionedSceneNode[] = [];
      const positionedVertices: PositionedSceneNode[] = [];
      const nodeMap = new Map<string, PositionedSceneNode>();

      if (vertices.length > 0) {
        const cols =
          vertices.length <= 2
            ? vertices.length
            : scene.aspectRatio === '9:16'
            ? 2
            : 3;
        const rows = Math.ceil(vertices.length / cols);
        const measuredList = vertices.map((v) => helpers.measureNode(v));

        const colWidths = new Array<number>(cols).fill(120);
        const rowHeights = new Array<number>(rows).fill(60);

        measuredList.forEach((m, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          colWidths[c] = Math.max(colWidths[c], m.width);
          rowHeights[r] = Math.max(rowHeights[r], m.height);
        });

        const gapX = 64;
        const gapY = 56;
        const totalW =
          colWidths.reduce((s, w) => s + w, 0) + Math.max(0, cols - 1) * gapX;
        const totalH =
          rowHeights.reduce((s, h) => s + h, 0) + Math.max(0, rows - 1) * gapY;

        const colCenters: number[] = [];
        let xCursor = -totalW / 2;
        for (let c = 0; c < cols; c++) {
          colCenters.push(xCursor + colWidths[c] / 2);
          xCursor += colWidths[c] + gapX;
        }

        const rowCenters: number[] = [];
        let yCursor = -totalH / 2;
        for (let r = 0; r < rows; r++) {
          rowCenters.push(yCursor + rowHeights[r] / 2);
          yCursor += rowHeights[r] + gapY;
        }

        vertices.forEach((v, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const pNode = makePositionedNode(
            v,
            colCenters[c],
            rowCenters[r],
            measuredList[idx],
            helpers
          );
          positionedNodes.push(pNode);
          positionedVertices.push(pNode);
          indexNodesRecursively([pNode], nodeMap);
        });
      }

      const bowMap = computeConnectorBowMap(boundConnectors);
      const routedMidpoints: Point[] = [];
      for (const conn of boundConnectors) {
        positionedNodes.push(
          routeObstacleAwareConnector(
            conn,
            nodeMap,
            positionedVertices,
            ownerVertexIdMap,
            {
              preferredBow: bowMap.get(conn.id) ?? 0,
              routedMidpoints,
            }
          )
        );
      }
      for (const conn of unboundConnectors) {
        positionedNodes.push(buildConnectorNode(conn, nodeMap, 0));
      }

      return finalizeLayout(positionedNodes, []);
    },
  };
  return { freeformLayoutPlugin };
})();

// --- Module: src/sdk/chalkBrush.ts ---
const { drawPowderyStroke, drawSmoothLineStroke, drawFallingDustParticles } = (() => {
  const dabCache = new Map<string, HTMLCanvasElement>();
  function getChalkDab(colorHex: string): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const cached = dabCache.get(colorHex);
    if (cached) return cached;

    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const cx = size / 2;
      const cy = size / 2;
      const rand = mulberry32(hashString(colorHex));

      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cx - 1);
      grad.addColorStop(0, colorHex);
      grad.addColorStop(0.55, colorHex);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 24; i++) {
        const rx = 3 + rand() * (size - 6);
        const ry = 3 + rand() * (size - 6);
        const r = 0.7 + rand() * 1.4;
        ctx.fillStyle = `rgba(0,0,0,${0.18 + rand() * 0.32})`;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    dabCache.set(colorHex, canvas);
    return canvas;
  }
  function drawPowderyStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokePath,
    progress: number,
    colorHex: string
  ): void {
    const clamped = Math.max(0, Math.min(1, progress));
    if (clamped <= 0 || stroke.points.length < 2) return;

    const targetLen = clamped * stroke.totalLength;
    const pts = stroke.points;
    const cum = stroke.cumLengths;
    const dab = getChalkDab(colorHex);
    const stepSize = Math.max(1.4, stroke.width * 0.42);
    const dashPeriod = 22;
    const dashOn = 13;
    let segIdx = 0;
    const seedBase = hashString(stroke.id);

    ctx.save();
    ctx.globalAlpha *= stroke.opacity;

    for (let d = 0; d <= targetLen; d += stepSize) {
      if (stroke.dashed && d % dashPeriod > dashOn) {
        continue;
      }

      while (segIdx < cum.length - 2 && cum[segIdx + 1] < d) {
        segIdx++;
      }

      const segLen = cum[segIdx + 1] - cum[segIdx];
      const frac = segLen > 1e-4 ? (d - cum[segIdx]) / segLen : 0;
      const p0 = pts[segIdx];
      const p1 = pts[segIdx + 1];
      const px = p0.x + (p1.x - p0.x) * frac;
      const py = p0.y + (p1.y - p0.y) * frac;

      const u = stroke.totalLength > 1 ? d / stroke.totalLength : 0.5;
      const endTaper =
        u < 0.06
          ? 0.74 + (u / 0.06) * 0.26
          : u > 0.94
          ? 0.74 + ((1 - u) / 0.06) * 0.26
          : 1;

      const h = ((Math.round(d * 3) * 2654435761) ^ seedBase) >>> 0;
      const jx = ((h & 255) / 255 - 0.5) * 0.85;
      const jy = (((h >> 8) & 255) / 255 - 0.5) * 0.85;
      const radius =
        stroke.width * endTaper * (0.9 + (((h >> 16) & 31) / 31) * 0.22);

      if (dab) {
        ctx.drawImage(
          dab,
          px + jx - radius,
          py + jy - radius,
          radius * 2,
          radius * 2
        );
      } else {
        ctx.fillStyle = colorHex;
        ctx.beginPath();
        ctx.arc(px + jx, py + jy, Math.max(0.8, radius * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
  function drawSmoothLineStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokePath,
    progress: number,
    colorHex: string,
    options?: { glow?: boolean }
  ): void {
    const clamped = Math.max(0, Math.min(1, progress));
    if (clamped <= 0 || stroke.points.length < 2) return;

    const targetLen = clamped * stroke.totalLength;
    const pts = stroke.points;
    const cum = stroke.cumLengths;

    ctx.save();
    ctx.globalAlpha *= stroke.opacity;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.dashed) {
      ctx.setLineDash([12, 9]);
    }
    if (options?.glow) {
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 4;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= targetLen) {
        ctx.lineTo(pts[i].x, pts[i].y);
      } else {
        const prevLen = cum[i - 1];
        const segLen = cum[i] - prevLen;
        const frac = segLen > 1e-4 ? (targetLen - prevLen) / segLen : 0;
        ctx.lineTo(
          pts[i - 1].x + (pts[i].x - pts[i - 1].x) * frac,
          pts[i - 1].y + (pts[i].y - pts[i - 1].y) * frac
        );
        break;
      }
    }

    ctx.stroke();
    ctx.restore();
  }
  function drawFallingDustParticles(
    ctx: CanvasRenderingContext2D,
    tipX: number,
    tipY: number,
    colorHex: string,
    tMs: number,
    seed: number
  ): void {
    ctx.save();
    ctx.fillStyle = colorHex;
    const phase = (tMs % 320) / 320;

    for (let i = 0; i < 7; i++) {
      const h = ((seed + i * 7919) * 2654435761) >>> 0;
      const life = (phase + (h & 255) / 255) % 1;
      const vx = (((h >> 8) & 255) / 255 - 0.5) * 18;
      const vy = 8 + (((h >> 16) & 255) / 255) * 24;
      const px = tipX + vx * life;
      const py = tipY + vy * life + life * life * 12;
      const r = 0.8 + (1 - life) * 1.1;

      ctx.globalAlpha = (1 - life) * 0.42;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return { drawPowderyStroke, drawSmoothLineStroke, drawFallingDustParticles };
})();

// --- Module: src/sdk/surfaceCache.ts ---
const { paintRadialBackdrop, drawCachedSurface } = (() => {
  const surfaceCache = new Map<string, HTMLCanvasElement>();
  const MAX_SURFACE_CACHE = 8;
  function paintRadialBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: { bgPrimary: string; bgSecondary: string }
  ): void {
    const grad = ctx.createRadialGradient(
      width * 0.48,
      height * 0.44,
      Math.min(width, height) * 0.1,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78
    );
    grad.addColorStop(0, palette.bgPrimary);
    grad.addColorStop(1, palette.bgSecondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  function drawCachedSurface(
    ctx: CanvasRenderingContext2D,
    cacheKey: string,
    width: number,
    height: number,
    painter: SurfacePainter
  ): void {
    if (typeof document === 'undefined') {
      painter(ctx, width, height);
      return;
    }

    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const fullKey = `${cacheKey}:${w}x${h}`;

    let cached = surfaceCache.get(fullKey);
    if (!cached) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const cCtx = canvas.getContext('2d');
      if (cCtx) {
        painter(cCtx, w, h);
      }
      if (surfaceCache.size >= MAX_SURFACE_CACHE) {
        const oldest = surfaceCache.keys().next().value;
        if (oldest !== undefined) surfaceCache.delete(oldest);
      }
      surfaceCache.set(fullKey, canvas);
      cached = canvas;
    }

    ctx.drawImage(cached, 0, 0, width, height);
  }
  return { paintRadialBackdrop, drawCachedSurface };
})();

// --- Module: src/plugins/presentations/chalkboardPlugin.ts ---
const { chalkboardPlugin } = (() => {
  const CHALKBOARD_FONT =
    "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";
  const palette: ThemePalette = {
    id: 'chalkboard',
    label: 'Chalkboard',
    bgPrimary: '#1e2c26',
    bgSecondary: '#131d19',
    vignetteColor: 'rgba(6, 11, 9, 0.56)',
    subtitleColor: '#d2ddd6',
    labelPillBg: 'rgba(20, 32, 27, 0.92)',
    labelPillBorder: 'rgba(244, 241, 234, 0.18)',
    cardFillOpacity: 0.13,
    zoneFillOpacity: 0.06,
    cardShadow: {
      dx: 3,
      dy: 4,
      color: 'rgba(0, 0, 0, 0.24)',
    },
    subtitleBg: 'rgba(13, 21, 18, 0.80)',
    subtitleBorder: 'rgba(244, 241, 234, 0.16)',
    subtitleTextColor: '#f4f1ea',
    colors: {
      white: '#f4f1ea',
      yellow: '#f3cf7a',
      cyan: '#89c9dc',
      pink: '#e89ca3',
      green: '#98cf9e',
      orange: '#ebaa76',
    },
  };
  const GRAIN_TILE_SIZE = 128;
  let cachedChalkGrainTile: HTMLCanvasElement | null = null;
  function getChalkGrainTile(): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    if (cachedChalkGrainTile) return cachedChalkGrainTile;

    const tile = document.createElement('canvas');
    tile.width = GRAIN_TILE_SIZE;
    tile.height = GRAIN_TILE_SIZE;
    const tCtx = tile.getContext('2d');
    if (!tCtx) return null;

    const imgData = tCtx.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
    const data = imgData.data;
    for (let py = 0; py < GRAIN_TILE_SIZE; py++) {
      for (let px = 0; px < GRAIN_TILE_SIZE; px++) {
        const idx = (py * GRAIN_TILE_SIZE + px) * 4;
        const n = (hash2D(px, py) & 255) / 255 - 0.5;
        const tone = n >= 0 ? 255 : 0;
        data[idx] = tone;
        data[idx + 1] = tone;
        data[idx + 2] = tone;
        data[idx + 3] = Math.round(Math.abs(n) * 18);
      }
    }
    tCtx.putImageData(imgData, 0, 0);
    cachedChalkGrainTile = tile;
    return tile;
  }
  const chalkboardPlugin: PresentationPlugin = {
    id: 'chalkboard',
    name: 'Chalkboard',
    palette,
    fontFamily: CHALKBOARD_FONT,
    glyphGrain: {
      enabled: true,
      minAlphaFactor: 0.8,
      range: 0.24,
    },
    shadowColor: 'rgba(0, 0, 0, 0.28)',
    soundProfile: {
      baseFreqHz: 2350,
      velocityFreqBoostHz: 550,
      baseGain: 0.065,
    },
    drawSurface(ctx, width, height) {
      drawCachedSurface(ctx, 'chalkboard', width, height, (c, w, h) => {
        paintRadialBackdrop(c, w, h, palette);
        const rand = mulberry32(9973 * 99 + w * 31 + h);

        // Faint lived-in chalk smudge clouds (erased board atmosphere)
        c.save();
        for (let i = 0; i < 16; i++) {
          const cx = rand() * w;
          const cy = rand() * h;
          const rx = 80 + rand() * 210;
          const ry = 40 + rand() * 110;
          const angle = (rand() - 0.5) * 0.6;
          c.save();
          c.translate(cx, cy);
          c.rotate(angle);
          const smudge = c.createRadialGradient(0, 0, 5, 0, 0, rx);
          smudge.addColorStop(0, 'rgba(235, 242, 232, 0.032)');
          smudge.addColorStop(1, 'rgba(235, 242, 232, 0)');
          c.fillStyle = smudge;
          c.scale(1, ry / rx);
          c.beginPath();
          c.arc(0, 0, rx, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
        c.restore();

        // Isotropic mineral slate grain via tiled 128x128 offscreen noise pattern
        const grainTile = getChalkGrainTile();
        const pattern = grainTile ? c.createPattern(grainTile, 'repeat') : null;
        if (pattern) {
          c.fillStyle = pattern;
          c.fillRect(0, 0, w, h);
        }

        // Soft vignette + classroom wooden chalk ledge hint
        const vig = c.createRadialGradient(
          w * 0.5,
          h * 0.5,
          Math.min(w, h) * 0.35,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.72
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, palette.vignetteColor);
        c.fillStyle = vig;
        c.fillRect(0, 0, w, h);

        const ledgeH = Math.max(8, Math.round(h * 0.012));
        const ledgeGrad = c.createLinearGradient(0, h - ledgeH, 0, h);
        ledgeGrad.addColorStop(0, '#5c4028');
        ledgeGrad.addColorStop(0.5, '#3e2a19');
        ledgeGrad.addColorStop(1, '#24170d');
        c.fillStyle = ledgeGrad;
        c.fillRect(0, h - ledgeH, w, ledgeH);

        c.fillStyle = 'rgba(255, 238, 210, 0.16)';
        c.fillRect(0, h - ledgeH, w, 1);

        c.strokeStyle = 'rgba(244, 241, 234, 0.05)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0.5, h - ledgeH);
        c.lineTo(0.5, 0.5);
        c.lineTo(w - 0.5, 0.5);
        c.lineTo(w - 0.5, h - ledgeH);
        c.stroke();
      });
    },
    drawStroke(ctx, stroke, progress) {
      const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
      drawPowderyStroke(ctx, stroke, progress, colorHex);
    },
    drawInstrument(ctx, colorHex) {
      // Tapered chalk stick anchored at (0, 0)
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.lineTo(14, -4.5);
      ctx.lineTo(74, -5);
      ctx.arc(74, 0, 5, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(14, 4.5);
      ctx.lineTo(0, 1.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(16, 1, 56, 3.2);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(28, -5.1, 24, 10.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(28, -5.1, 24, 10.2);
    },
    drawParticles(ctx, tipX, tipY, colorHex, tMs, seed) {
      drawFallingDustParticles(ctx, tipX, tipY, colorHex, tMs, seed);
    },
  };
  return { chalkboardPlugin };
})();

// --- Module: src/plugins/presentations/whiteboardPlugin.ts ---
const { whiteboardPlugin } = (() => {
  const WHITEBOARD_FONT =
    "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";
  const palette: ThemePalette = {
    id: 'whiteboard',
    label: 'Whiteboard',
    bgPrimary: '#faf9f5',
    bgSecondary: '#f2efe9',
    vignetteColor: 'rgba(120, 113, 108, 0.10)',
    subtitleColor: '#4b5563',
    labelPillBg: 'rgba(250, 249, 245, 0.96)',
    labelPillBorder: 'rgba(35, 38, 41, 0.14)',
    cardFillOpacity: 0.92,
    zoneFillOpacity: 0.055,
    cardFillColors: {
      white: '#ffffff',
      yellow: '#fef3c7',
      cyan: '#e0f2fe',
      pink: '#ffe4e6',
      green: '#dcfce7',
      orange: '#ffedd5',
    },
    cardShadow: {
      dx: 4,
      dy: 5,
      color: 'rgba(35, 38, 41, 0.08)',
    },
    preferNeutralCardTitle: true,
    subtitleBg: 'rgba(255, 254, 250, 0.93)',
    subtitleBorder: 'rgba(35, 38, 41, 0.15)',
    subtitleTextColor: '#1f2421',
    colors: {
      white: '#232629',
      yellow: '#b7791f',
      cyan: '#1d6fa5',
      pink: '#be3a68',
      green: '#2b7a57',
      orange: '#c85a28',
    },
  };
  const whiteboardPlugin: PresentationPlugin = {
    id: 'whiteboard',
    name: 'Whiteboard',
    palette,
    fontFamily: WHITEBOARD_FONT,
    shadowColor: 'rgba(15, 23, 42, 0.14)',
    soundProfile: {
      baseFreqHz: 1750,
      velocityFreqBoostHz: 450,
      baseGain: 0.028,
    },
    drawSurface(ctx, width, height) {
      drawCachedSurface(ctx, 'whiteboard', width, height, (c, w, h) => {
        paintRadialBackdrop(c, w, h, palette);

        c.fillStyle = 'rgba(120, 113, 108, 0.18)';
        const pitch = 24;
        for (let y = pitch; y < h; y += pitch) {
          for (let x = pitch; x < w; x += pitch) {
            c.fillRect(x, y, 1.4, 1.4);
          }
        }

        const vig = c.createRadialGradient(
          w * 0.5,
          h * 0.5,
          Math.min(w, h) * 0.4,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.78
        );
        vig.addColorStop(0, 'rgba(255,255,255,0)');
        vig.addColorStop(1, palette.vignetteColor);
        c.fillStyle = vig;
        c.fillRect(0, 0, w, h);
      });
    },
    drawStroke(ctx, stroke, progress) {
      const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
      drawSmoothLineStroke(ctx, stroke, progress, colorHex);
    },
    drawInstrument(ctx, colorHex) {
      // Sleek dry-erase marker barrel anchored at (0, 0)
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(0, -1.5);
      ctx.lineTo(9, -3.5);
      ctx.lineTo(14, -3.5);
      ctx.lineTo(14, 3.5);
      ctx.lineTo(9, 3.5);
      ctx.lineTo(0, 1.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colorHex;
      ctx.fillRect(14, -5.4, 10, 10.8);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(24, -6.2, 64, 12.4, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colorHex;
      ctx.fillRect(78, -6.2, 10, 12.4);
    },
  };
  return { whiteboardPlugin };
})();

// --- Module: src/plugins/presentations/blueprintPlugin.ts ---
const { blueprintPlugin } = (() => {
  const BLUEPRINT_FONT =
    "'JetBrains Mono', 'SF Mono', 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const palette: ThemePalette = {
    id: 'blueprint',
    label: 'Blueprint',
    bgPrimary: '#132f53',
    bgSecondary: '#0a1c35',
    vignetteColor: 'rgba(4, 11, 24, 0.54)',
    subtitleColor: '#b7dcf2',
    labelPillBg: 'rgba(11, 28, 52, 0.92)',
    labelPillBorder: 'rgba(116, 212, 247, 0.24)',
    cardFillOpacity: 0.16,
    zoneFillOpacity: 0.07,
    subtitleBg: 'rgba(9, 22, 42, 0.82)',
    subtitleBorder: 'rgba(116, 212, 247, 0.24)',
    subtitleTextColor: '#f2f7fc',
    colors: {
      white: '#f2f7fc',
      yellow: '#f4ca64',
      cyan: '#74d4f7',
      pink: '#f39aa7',
      green: '#7fd8a8',
      orange: '#f3a668',
    },
  };
  const blueprintPlugin: PresentationPlugin = {
    id: 'blueprint',
    name: 'Blueprint',
    palette,
    fontFamily: BLUEPRINT_FONT,
    shadowColor: 'rgba(0, 0, 0, 0.28)',
    soundProfile: {
      baseFreqHz: 2900,
      velocityFreqBoostHz: 550,
      baseGain: 0.028,
    },
    drawSurface(ctx, width, height) {
      drawCachedSurface(ctx, 'blueprint', width, height, (c, w, h) => {
        paintRadialBackdrop(c, w, h, palette);

        const minor = 24;
        const major = 120;
        c.lineWidth = 1;

        c.strokeStyle = 'rgba(116, 212, 247, 0.07)';
        c.beginPath();
        for (let x = 0; x <= w; x += minor) {
          c.moveTo(x + 0.5, 0);
          c.lineTo(x + 0.5, h);
        }
        for (let y = 0; y <= h; y += minor) {
          c.moveTo(0, y + 0.5);
          c.lineTo(w, y + 0.5);
        }
        c.stroke();

        c.strokeStyle = 'rgba(116, 212, 247, 0.16)';
        c.beginPath();
        for (let x = 0; x <= w; x += major) {
          c.moveTo(x + 0.5, 0);
          c.lineTo(x + 0.5, h);
        }
        for (let y = 0; y <= h; y += major) {
          c.moveTo(0, y + 0.5);
          c.lineTo(w, y + 0.5);
        }
        c.stroke();

        const margin = Math.max(12, Math.round(Math.min(w, h) * 0.018));
        c.strokeStyle = 'rgba(186, 230, 253, 0.24)';
        c.strokeRect(margin + 0.5, margin + 0.5, w - margin * 2 - 1, h - margin * 2 - 1);
        c.strokeStyle = 'rgba(116, 212, 247, 0.12)';
        c.strokeRect(
          margin + 4.5,
          margin + 4.5,
          w - (margin + 4) * 2 - 1,
          h - (margin + 4) * 2 - 1
        );

        // Corner crosshair registration marks
        const tickArm = 8;
        const tickOffset = margin + 14;
        const corners = [
          [tickOffset, tickOffset],
          [w - tickOffset, tickOffset],
          [tickOffset, h - tickOffset],
          [w - tickOffset, h - tickOffset],
        ];
        c.strokeStyle = 'rgba(186, 230, 253, 0.28)';
        c.beginPath();
        for (const [cx, cy] of corners) {
          c.moveTo(cx - tickArm, cy + 0.5);
          c.lineTo(cx + tickArm, cy + 0.5);
          c.moveTo(cx + 0.5, cy - tickArm);
          c.lineTo(cx + 0.5, cy + tickArm);
        }
        c.stroke();

        const vig = c.createRadialGradient(
          w * 0.5,
          h * 0.5,
          Math.min(w, h) * 0.36,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.74
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, palette.vignetteColor);
        c.fillStyle = vig;
        c.fillRect(0, 0, w, h);
      });
    },
    drawStroke(ctx, stroke, progress) {
      const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
      drawSmoothLineStroke(ctx, stroke, progress, colorHex, { glow: true });
    },
    drawInstrument(ctx, colorHex) {
      // Blueprint drafting pencil anchored at (0, 0)
      ctx.fillStyle = '#e5c49f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(18, -5);
      ctx.lineTo(18, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(6, -1.7);
      ctx.lineTo(6, 1.7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(18, -5, 68, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(18, -5, 68, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(18, 2, 68, 3);
    },
  };
  return { blueprintPlugin };
})();

// --- Module: src/plugins/presentations/letterPaperPlugin.ts ---
const { letterPaperPlugin } = (() => {
  const LETTER_PAPER_FONT =
    "'KaiTi', 'STKaiti', 'FangSong', 'Segoe Script', 'Georgia', serif";
  const palette: ThemePalette = {
    id: 'letter-paper',
    label: 'Letter Paper',
    bgPrimary: '#fdf8ee',
    bgSecondary: '#f3e8d2',
    vignetteColor: 'rgba(128, 98, 62, 0.16)',
    subtitleColor: '#5c4d3c',
    labelPillBg: 'rgba(253, 248, 238, 0.96)',
    labelPillBorder: 'rgba(128, 98, 62, 0.24)',
    cardFillOpacity: 0.76,
    zoneFillOpacity: 0.05,
    cardFillColors: {
      white: '#fffdf7',
      yellow: '#fbf0d1',
      cyan: '#e4edf7',
      pink: '#f8e2e4',
      green: '#e3f0e8',
      orange: '#fae7d7',
    },
    cardShadow: {
      dx: 3,
      dy: 4,
      color: 'rgba(108, 82, 52, 0.09)',
    },
    preferNeutralCardTitle: true,
    subtitleBg: 'rgba(253, 248, 238, 0.94)',
    subtitleBorder: 'rgba(128, 98, 62, 0.26)',
    subtitleTextColor: '#1f2733',
    colors: {
      white: '#1f2733',
      yellow: '#916216',
      cyan: '#264c7d',
      pink: '#9e3039',
      green: '#255941',
      orange: '#a64d24',
    },
  };
  const PAPER_GRAIN_TILE_SIZE = 128;
  let cachedPaperGrainTile: HTMLCanvasElement | null = null;
  function getPaperGrainTile(): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    if (cachedPaperGrainTile) return cachedPaperGrainTile;

    const tile = document.createElement('canvas');
    tile.width = PAPER_GRAIN_TILE_SIZE;
    tile.height = PAPER_GRAIN_TILE_SIZE;
    const tCtx = tile.getContext('2d');
    if (!tCtx) return null;

    const imgData = tCtx.createImageData(
      PAPER_GRAIN_TILE_SIZE,
      PAPER_GRAIN_TILE_SIZE
    );
    const data = imgData.data;
    for (let py = 0; py < PAPER_GRAIN_TILE_SIZE; py++) {
      for (let px = 0; px < PAPER_GRAIN_TILE_SIZE; px++) {
        const idx = (py * PAPER_GRAIN_TILE_SIZE + px) * 4;
        const n = (hash2D(px, py, 7919) & 255) / 255 - 0.5;
        if (n >= 0) {
          data[idx] = 255;
          data[idx + 1] = 252;
          data[idx + 2] = 244;
        } else {
          data[idx] = 138;
          data[idx + 1] = 108;
          data[idx + 2] = 68;
        }
        data[idx + 3] = Math.round(Math.abs(n) * 14);
      }
    }
    tCtx.putImageData(imgData, 0, 0);
    cachedPaperGrainTile = tile;
    return tile;
  }
  const letterPaperPlugin: PresentationPlugin = {
    id: 'letter-paper',
    name: 'Letter Paper',
    palette,
    fontFamily: LETTER_PAPER_FONT,
    shadowColor: 'rgba(68, 48, 24, 0.16)',
    soundProfile: {
      baseFreqHz: 1520,
      velocityFreqBoostHz: 320,
      baseGain: 0.022,
    },
    drawSurface(ctx, width, height) {
      drawCachedSurface(ctx, 'letter-paper', width, height, (c, w, h) => {
        paintRadialBackdrop(c, w, h, palette);

        // Fine warm cotton-paper fiber grain via tiled 128x128 offscreen noise pattern
        const grainTile = getPaperGrainTile();
        const pattern = grainTile ? c.createPattern(grainTile, 'repeat') : null;
        if (pattern) {
          c.fillStyle = pattern;
          c.fillRect(0, 0, w, h);
        }

        // Subtle ruled stationery horizontal lines (scales evenly across preview & 1080p export)
        const linePitch = Math.max(26, Math.round(Math.min(w, h) * 0.068));
        const firstRuleY = Math.round(h * 0.115);
        c.strokeStyle = 'rgba(150, 126, 94, 0.18)';
        c.lineWidth = Math.max(1, h / 650);
        c.beginPath();
        for (let y = firstRuleY; y < h - linePitch * 0.7; y += linePitch) {
          const crispY = Math.round(y) + 0.5;
          c.moveTo(0, crispY);
          c.lineTo(w, crispY);
        }
        c.stroke();

        // Delicate double top header rule
        const headerY = Math.round(firstRuleY - 4) + 0.5;
        c.strokeStyle = 'rgba(150, 126, 94, 0.15)';
        c.beginPath();
        c.moveTo(0, headerY);
        c.lineTo(w, headerY);
        c.stroke();

        // Classic double terracotta left margin lines
        const marginX = Math.max(34, Math.round(w * 0.082));
        c.strokeStyle = 'rgba(194, 96, 84, 0.24)';
        c.lineWidth = Math.max(1, h / 650);
        c.beginPath();
        c.moveTo(marginX + 0.5, 0);
        c.lineTo(marginX + 0.5, h);
        c.moveTo(marginX + 4.5, 0);
        c.lineTo(marginX + 4.5, h);
        c.stroke();

        // Soft antique warm vignette
        const vig = c.createRadialGradient(
          w * 0.5,
          h * 0.5,
          Math.min(w, h) * 0.38,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.76
        );
        vig.addColorStop(0, 'rgba(255,255,255,0)');
        vig.addColorStop(1, palette.vignetteColor);
        c.fillStyle = vig;
        c.fillRect(0, 0, w, h);
      });
    },
    drawStroke(ctx, stroke, progress) {
      const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
      drawSmoothLineStroke(ctx, stroke, progress, colorHex);
    },
    drawInstrument(ctx, colorHex) {
      // Classic fountain pen anchored with nib tip at (0, 0)
      // Gold nib
      ctx.fillStyle = '#d7ad53';
      ctx.strokeStyle = '#8b651e';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(7, -3.2);
      ctx.lineTo(17, -4.6);
      ctx.lineTo(19, 0);
      ctx.lineTo(17, 4.6);
      ctx.lineTo(7, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ink slit + breather hole
      ctx.strokeStyle = '#2d2112';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0.8, 0);
      ctx.lineTo(11, 0);
      ctx.stroke();
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(11.5, 0, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Grip section + brass collar ring
      ctx.fillStyle = '#252b3b';
      ctx.fillRect(17, -4.7, 9, 9.4);
      ctx.fillStyle = '#d7ad53';
      ctx.fillRect(26, -5.4, 3.2, 10.8);

      // Deep lacquer barrel
      ctx.fillStyle = '#1d283f';
      ctx.beginPath();
      ctx.roundRect(29, -5.8, 62, 11.6, 3.5);
      ctx.fill();

      // Ink color accent band + glossy highlight
      ctx.fillStyle = colorHex;
      ctx.fillRect(42, -5.8, 4.5, 11.6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(32, -4.1, 54, 2.1);

      // Brass end cap
      ctx.fillStyle = '#d7ad53';
      ctx.fillRect(86, -5.2, 5, 10.4);
    },
  };
  return { letterPaperPlugin };
})();

// --- Module: src/plugins/glyphs/strokeOrderProvider.ts ---
const { strokeOrderGlyphProvider } = (() => {
  const STROKE_ORDER_DICT: Record<string, NormStroke[]> = {
    // Uppercase Latin A-Z
    A: [
      [[0.5, 0.05], [0.1, 0.95]],
      [[0.5, 0.05], [0.9, 0.95]],
      [[0.24, 0.62], [0.76, 0.62]],
    ],
    B: [
      [[0.18, 0.06], [0.18, 0.94]],
      [[0.18, 0.06], [0.72, 0.12], [0.82, 0.28], [0.68, 0.48], [0.18, 0.48]],
      [[0.18, 0.48], [0.76, 0.54], [0.85, 0.74], [0.72, 0.92], [0.18, 0.94]],
    ],
    C: [[[0.85, 0.22], [0.55, 0.06], [0.22, 0.22], [0.14, 0.5], [0.24, 0.8], [0.58, 0.94], [0.86, 0.78]]],
    D: [
      [[0.18, 0.06], [0.18, 0.94]],
      [[0.18, 0.06], [0.68, 0.12], [0.86, 0.48], [0.7, 0.88], [0.18, 0.94]],
    ],
    E: [
      [[0.2, 0.08], [0.2, 0.92]],
      [[0.2, 0.08], [0.82, 0.08]],
      [[0.2, 0.48], [0.72, 0.48]],
      [[0.2, 0.92], [0.84, 0.92]],
    ],
    F: [
      [[0.22, 0.08], [0.22, 0.94]],
      [[0.22, 0.08], [0.82, 0.08]],
      [[0.22, 0.48], [0.72, 0.48]],
    ],
    G: [
      [[0.84, 0.22], [0.54, 0.06], [0.22, 0.24], [0.16, 0.54], [0.26, 0.82], [0.58, 0.94], [0.85, 0.76], [0.85, 0.52]],
      [[0.55, 0.52], [0.88, 0.52]],
    ],
    H: [
      [[0.18, 0.06], [0.18, 0.94]],
      [[0.82, 0.06], [0.82, 0.94]],
      [[0.18, 0.49], [0.82, 0.49]],
    ],
    I: [
      [[0.28, 0.08], [0.72, 0.08]],
      [[0.5, 0.08], [0.5, 0.92]],
      [[0.28, 0.92], [0.72, 0.92]],
    ],
    J: [
      [[0.32, 0.08], [0.82, 0.08]],
      [[0.68, 0.08], [0.68, 0.74], [0.5, 0.93], [0.22, 0.82]],
    ],
    K: [
      [[0.2, 0.06], [0.2, 0.94]],
      [[0.82, 0.08], [0.22, 0.52]],
      [[0.4, 0.4], [0.84, 0.94]],
    ],
    L: [
      [[0.22, 0.08], [0.22, 0.92]],
      [[0.22, 0.92], [0.84, 0.92]],
    ],
    M: [
      [[0.14, 0.94], [0.18, 0.08]],
      [[0.18, 0.08], [0.5, 0.62]],
      [[0.5, 0.62], [0.82, 0.08]],
      [[0.82, 0.08], [0.86, 0.94]],
    ],
    N: [
      [[0.18, 0.94], [0.18, 0.08]],
      [[0.18, 0.08], [0.82, 0.92]],
      [[0.82, 0.92], [0.82, 0.08]],
    ],
    O: [[[0.5, 0.06], [0.18, 0.24], [0.14, 0.56], [0.24, 0.84], [0.54, 0.94], [0.84, 0.76], [0.86, 0.42], [0.74, 0.14], [0.5, 0.06]]],
    P: [
      [[0.2, 0.08], [0.2, 0.94]],
      [[0.2, 0.08], [0.74, 0.14], [0.84, 0.34], [0.7, 0.54], [0.2, 0.54]],
    ],
    Q: [
      [[0.5, 0.06], [0.18, 0.24], [0.14, 0.56], [0.28, 0.84], [0.62, 0.9], [0.86, 0.66], [0.82, 0.26], [0.5, 0.06]],
      [[0.58, 0.68], [0.88, 0.96]],
    ],
    R: [
      [[0.2, 0.08], [0.2, 0.94]],
      [[0.2, 0.08], [0.74, 0.14], [0.84, 0.32], [0.68, 0.52], [0.2, 0.52]],
      [[0.46, 0.52], [0.84, 0.94]],
    ],
    S: [[[0.82, 0.2], [0.54, 0.06], [0.22, 0.22], [0.26, 0.44], [0.74, 0.58], [0.82, 0.8], [0.52, 0.94], [0.18, 0.82]]],
    T: [
      [[0.12, 0.08], [0.88, 0.08]],
      [[0.5, 0.08], [0.5, 0.94]],
    ],
    U: [[[0.18, 0.08], [0.18, 0.7], [0.36, 0.92], [0.66, 0.92], [0.82, 0.7], [0.82, 0.08]]],
    V: [
      [[0.14, 0.08], [0.5, 0.94]],
      [[0.5, 0.94], [0.86, 0.08]],
    ],
    W: [
      [[0.1, 0.08], [0.3, 0.92]],
      [[0.3, 0.92], [0.5, 0.36]],
      [[0.5, 0.36], [0.7, 0.92]],
      [[0.7, 0.92], [0.9, 0.08]],
    ],
    X: [
      [[0.16, 0.08], [0.84, 0.92]],
      [[0.84, 0.08], [0.16, 0.92]],
    ],
    Y: [
      [[0.16, 0.08], [0.5, 0.52]],
      [[0.84, 0.08], [0.5, 0.52]],
      [[0.5, 0.52], [0.5, 0.94]],
    ],
    Z: [[[0.16, 0.1], [0.84, 0.1], [0.16, 0.9], [0.84, 0.9]]],

    // Lowercase Latin a-z
    a: [
      [[0.76, 0.42], [0.46, 0.34], [0.22, 0.52], [0.26, 0.84], [0.56, 0.92], [0.78, 0.74]],
      [[0.78, 0.38], [0.78, 0.92]],
    ],
    b: [
      [[0.22, 0.06], [0.22, 0.92]],
      [[0.22, 0.48], [0.58, 0.36], [0.82, 0.54], [0.78, 0.82], [0.48, 0.94], [0.22, 0.82]],
    ],
    c: [[[0.8, 0.44], [0.52, 0.34], [0.22, 0.5], [0.24, 0.8], [0.54, 0.94], [0.82, 0.82]]],
    d: [
      [[0.78, 0.48], [0.46, 0.36], [0.2, 0.54], [0.24, 0.84], [0.54, 0.94], [0.78, 0.78]],
      [[0.78, 0.06], [0.78, 0.94]],
    ],
    e: [[[0.22, 0.62], [0.8, 0.6], [0.74, 0.38], [0.44, 0.34], [0.2, 0.56], [0.28, 0.86], [0.6, 0.94], [0.82, 0.82]]],
    f: [
      [[0.74, 0.14], [0.52, 0.06], [0.42, 0.24], [0.42, 0.94]],
      [[0.2, 0.44], [0.72, 0.44]],
    ],
    g: [
      [[0.78, 0.4], [0.48, 0.3], [0.22, 0.46], [0.26, 0.72], [0.56, 0.76], [0.78, 0.6]],
      [[0.78, 0.34], [0.78, 0.82], [0.54, 0.96], [0.24, 0.9]],
    ],
    h: [
      [[0.22, 0.06], [0.22, 0.94]],
      [[0.22, 0.54], [0.54, 0.36], [0.78, 0.48], [0.78, 0.94]],
    ],
    i: [
      [[0.5, 0.38], [0.5, 0.94]],
      [[0.5, 0.14], [0.5, 0.22]],
    ],
    j: [
      [[0.62, 0.38], [0.62, 0.82], [0.44, 0.96], [0.22, 0.88]],
      [[0.62, 0.14], [0.62, 0.22]],
    ],
    k: [
      [[0.24, 0.06], [0.24, 0.94]],
      [[0.78, 0.38], [0.26, 0.66]],
      [[0.44, 0.56], [0.8, 0.94]],
    ],
    l: [[[0.5, 0.06], [0.5, 0.94]]],
    m: [
      [[0.14, 0.38], [0.14, 0.94]],
      [[0.14, 0.52], [0.36, 0.36], [0.5, 0.5], [0.5, 0.94]],
      [[0.5, 0.52], [0.72, 0.36], [0.86, 0.5], [0.86, 0.94]],
    ],
    n: [
      [[0.22, 0.38], [0.22, 0.94]],
      [[0.22, 0.52], [0.54, 0.36], [0.78, 0.5], [0.78, 0.94]],
    ],
    o: [[[0.5, 0.34], [0.22, 0.48], [0.22, 0.8], [0.5, 0.94], [0.78, 0.8], [0.78, 0.48], [0.5, 0.34]]],
    p: [
      [[0.22, 0.3], [0.22, 0.96]],
      [[0.22, 0.42], [0.58, 0.3], [0.8, 0.48], [0.74, 0.72], [0.44, 0.76], [0.22, 0.66]],
    ],
    q: [
      [[0.78, 0.42], [0.46, 0.3], [0.2, 0.48], [0.26, 0.72], [0.56, 0.76], [0.78, 0.64]],
      [[0.78, 0.32], [0.78, 0.96]],
    ],
    r: [
      [[0.28, 0.38], [0.28, 0.94]],
      [[0.28, 0.54], [0.54, 0.36], [0.78, 0.44]],
    ],
    s: [[[0.76, 0.42], [0.48, 0.34], [0.24, 0.46], [0.32, 0.6], [0.72, 0.7], [0.76, 0.86], [0.46, 0.94], [0.22, 0.84]]],
    t: [
      [[0.46, 0.1], [0.46, 0.84], [0.64, 0.92], [0.8, 0.86]],
      [[0.22, 0.38], [0.74, 0.38]],
    ],
    u: [
      [[0.22, 0.38], [0.22, 0.78], [0.46, 0.94], [0.76, 0.78]],
      [[0.78, 0.38], [0.78, 0.94]],
    ],
    v: [
      [[0.18, 0.38], [0.5, 0.92]],
      [[0.5, 0.92], [0.82, 0.38]],
    ],
    w: [
      [[0.12, 0.38], [0.32, 0.92]],
      [[0.32, 0.92], [0.5, 0.54]],
      [[0.5, 0.54], [0.68, 0.92]],
      [[0.68, 0.92], [0.88, 0.38]],
    ],
    x: [
      [[0.2, 0.38], [0.8, 0.92]],
      [[0.8, 0.38], [0.2, 0.92]],
    ],
    y: [
      [[0.2, 0.34], [0.5, 0.72]],
      [[0.8, 0.34], [0.44, 0.96], [0.22, 0.94]],
    ],
    z: [[[0.2, 0.38], [0.8, 0.38], [0.2, 0.92], [0.8, 0.92]]],

    // Digits 0-9 & basic symbols
    '0': [[[0.5, 0.06], [0.2, 0.28], [0.18, 0.7], [0.48, 0.94], [0.8, 0.72], [0.82, 0.28], [0.5, 0.06]]],
    '1': [[[0.3, 0.24], [0.54, 0.08], [0.54, 0.92]], [[0.26, 0.92], [0.8, 0.92]]],
    '2': [[[0.2, 0.26], [0.48, 0.08], [0.78, 0.22], [0.74, 0.48], [0.2, 0.92], [0.84, 0.92]]],
    '3': [[[0.22, 0.2], [0.56, 0.08], [0.78, 0.26], [0.5, 0.48], [0.8, 0.68], [0.58, 0.92], [0.22, 0.82]]],
    '4': [[[0.66, 0.08], [0.16, 0.66], [0.86, 0.66]], [[0.66, 0.08], [0.66, 0.94]]],
    '5': [[[0.8, 0.08], [0.24, 0.08], [0.22, 0.46], [0.64, 0.46], [0.82, 0.7], [0.58, 0.92], [0.2, 0.84]]],
    '6': [[[0.72, 0.12], [0.36, 0.18], [0.18, 0.54], [0.28, 0.86], [0.62, 0.94], [0.82, 0.7], [0.6, 0.48], [0.2, 0.56]]],
    '7': [[[0.18, 0.1], [0.84, 0.1], [0.38, 0.94]]],
    '8': [[[0.5, 0.48], [0.22, 0.3], [0.48, 0.08], [0.78, 0.28], [0.5, 0.48], [0.18, 0.72], [0.5, 0.94], [0.82, 0.72], [0.5, 0.48]]],
    '9': [[[0.8, 0.36], [0.54, 0.54], [0.22, 0.42], [0.24, 0.16], [0.56, 0.08], [0.8, 0.3], [0.78, 0.74], [0.48, 0.94], [0.24, 0.86]]],
    '-': [[[0.12, 0.5], [0.88, 0.5]]],
    '+': [[[0.14, 0.5], [0.86, 0.5]], [[0.5, 0.14], [0.5, 0.86]]],
    '/': [[[0.78, 0.08], [0.22, 0.92]]],
    ':': [[[0.5, 0.26], [0.5, 0.34]], [[0.5, 0.7], [0.5, 0.78]]],
    '.': [[[0.45, 0.45], [0.55, 0.55]]],
    '·': [[[0.45, 0.45], [0.55, 0.55]]],
    '→': [[[0.1, 0.5], [0.88, 0.5]], [[0.66, 0.24], [0.88, 0.5], [0.66, 0.76]]],

    // Fundamental & high-frequency Chinese characters (standard stroke order)
    一: [[[0.08, 0.5], [0.92, 0.5]]],
    二: [[[0.2, 0.32], [0.8, 0.32]], [[0.08, 0.76], [0.92, 0.76]]],
    三: [[[0.18, 0.2], [0.82, 0.2]], [[0.24, 0.5], [0.76, 0.5]], [[0.08, 0.82], [0.92, 0.82]]],
    四: [
      [[0.14, 0.22], [0.18, 0.84]],
      [[0.14, 0.22], [0.86, 0.22], [0.82, 0.84]],
      [[0.4, 0.22], [0.34, 0.56]],
      [[0.6, 0.22], [0.6, 0.56], [0.74, 0.58]],
      [[0.18, 0.82], [0.82, 0.82]],
    ],
    五: [
      [[0.2, 0.18], [0.82, 0.18]],
      [[0.5, 0.18], [0.42, 0.86]],
      [[0.24, 0.5], [0.72, 0.5], [0.68, 0.86]],
      [[0.1, 0.86], [0.9, 0.86]],
    ],
    六: [
      [[0.48, 0.1], [0.54, 0.24]],
      [[0.1, 0.36], [0.9, 0.36]],
      [[0.36, 0.54], [0.18, 0.88]],
      [[0.64, 0.54], [0.84, 0.88]],
    ],
    七: [
      [[0.12, 0.54], [0.88, 0.4]],
      [[0.44, 0.14], [0.44, 0.8], [0.68, 0.88], [0.86, 0.74]],
    ],
    八: [
      [[0.38, 0.24], [0.12, 0.86]],
      [[0.58, 0.16], [0.88, 0.86]],
    ],
    九: [
      [[0.48, 0.1], [0.36, 0.62], [0.14, 0.88]],
      [[0.18, 0.38], [0.66, 0.34], [0.6, 0.82], [0.84, 0.88], [0.88, 0.74]],
    ],
    十: [[[0.1, 0.46], [0.9, 0.46]], [[0.5, 0.1], [0.5, 0.92]]],
    人: [[[0.5, 0.1], [0.34, 0.54], [0.1, 0.9]], [[0.46, 0.42], [0.9, 0.9]]],
    大: [[[0.12, 0.4], [0.88, 0.4]], [[0.5, 0.1], [0.4, 0.6], [0.12, 0.9]], [[0.52, 0.46], [0.88, 0.9]]],
    小: [
      [[0.5, 0.12], [0.5, 0.88], [0.4, 0.8]],
      [[0.26, 0.38], [0.14, 0.72]],
      [[0.74, 0.38], [0.88, 0.72]],
    ],
    中: [
      [[0.16, 0.32], [0.22, 0.68]],
      [[0.16, 0.32], [0.84, 0.32], [0.78, 0.66]],
      [[0.22, 0.66], [0.78, 0.66]],
      [[0.5, 0.08], [0.5, 0.94]],
    ],
    上: [
      [[0.5, 0.12], [0.5, 0.84]],
      [[0.5, 0.46], [0.8, 0.46]],
      [[0.1, 0.84], [0.9, 0.84]],
    ],
    下: [
      [[0.1, 0.18], [0.9, 0.18]],
      [[0.5, 0.18], [0.5, 0.9]],
      [[0.54, 0.42], [0.82, 0.6]],
    ],
    左: [
      [[0.14, 0.3], [0.86, 0.3]],
      [[0.5, 0.12], [0.34, 0.54], [0.12, 0.84]],
      [[0.36, 0.56], [0.8, 0.56]],
      [[0.58, 0.56], [0.58, 0.86]],
      [[0.26, 0.86], [0.88, 0.86]],
    ],
    右: [
      [[0.14, 0.3], [0.86, 0.3]],
      [[0.5, 0.12], [0.34, 0.54], [0.12, 0.84]],
      [[0.36, 0.56], [0.4, 0.88]],
      [[0.36, 0.56], [0.8, 0.56], [0.76, 0.86]],
      [[0.4, 0.86], [0.76, 0.86]],
    ],
    口: [
      [[0.2, 0.22], [0.24, 0.82]],
      [[0.2, 0.22], [0.8, 0.22], [0.76, 0.8]],
      [[0.24, 0.8], [0.76, 0.8]],
    ],
    日: [
      [[0.24, 0.16], [0.24, 0.86]],
      [[0.24, 0.16], [0.76, 0.16], [0.76, 0.86]],
      [[0.24, 0.5], [0.76, 0.5]],
      [[0.24, 0.84], [0.76, 0.84]],
    ],
    月: [
      [[0.28, 0.16], [0.28, 0.58], [0.18, 0.9]],
      [[0.28, 0.16], [0.76, 0.16], [0.76, 0.88], [0.64, 0.82]],
      [[0.28, 0.4], [0.76, 0.4]],
      [[0.28, 0.64], [0.76, 0.64]],
    ],
    水: [
      [[0.5, 0.1], [0.5, 0.9], [0.38, 0.82]],
      [[0.14, 0.42], [0.38, 0.42], [0.16, 0.78]],
      [[0.84, 0.26], [0.56, 0.48]],
      [[0.52, 0.46], [0.88, 0.84]],
    ],
    火: [
      [[0.24, 0.36], [0.32, 0.54]],
      [[0.82, 0.28], [0.64, 0.48]],
      [[0.5, 0.12], [0.46, 0.58], [0.14, 0.9]],
      [[0.5, 0.5], [0.88, 0.9]],
    ],
    木: [
      [[0.14, 0.38], [0.86, 0.38]],
      [[0.5, 0.1], [0.5, 0.92]],
      [[0.5, 0.38], [0.14, 0.84]],
      [[0.5, 0.38], [0.86, 0.84]],
    ],
    金: [
      [[0.5, 0.1], [0.12, 0.48]],
      [[0.5, 0.1], [0.88, 0.48]],
      [[0.3, 0.46], [0.7, 0.46]],
      [[0.24, 0.64], [0.76, 0.64]],
      [[0.5, 0.46], [0.5, 0.88]],
      [[0.28, 0.72], [0.36, 0.82]],
      [[0.74, 0.7], [0.64, 0.82]],
      [[0.14, 0.88], [0.86, 0.88]],
    ],
    土: [
      [[0.2, 0.46], [0.8, 0.46]],
      [[0.5, 0.12], [0.5, 0.86]],
      [[0.1, 0.86], [0.9, 0.86]],
    ],
    心: [
      [[0.2, 0.54], [0.12, 0.78]],
      [[0.32, 0.44], [0.38, 0.84], [0.76, 0.84], [0.84, 0.68]],
      [[0.46, 0.22], [0.56, 0.42]],
      [[0.78, 0.38], [0.9, 0.56]],
    ],
    手: [
      [[0.74, 0.12], [0.24, 0.22]],
      [[0.18, 0.4], [0.82, 0.4]],
      [[0.1, 0.62], [0.9, 0.62]],
      [[0.52, 0.18], [0.52, 0.9], [0.38, 0.82]],
    ],
    工: [
      [[0.18, 0.2], [0.82, 0.2]],
      [[0.5, 0.2], [0.5, 0.84]],
      [[0.1, 0.84], [0.9, 0.84]],
    ],
    王: [
      [[0.18, 0.18], [0.82, 0.18]],
      [[0.22, 0.5], [0.78, 0.5]],
      [[0.5, 0.18], [0.5, 0.84]],
      [[0.1, 0.84], [0.9, 0.84]],
    ],
    玉: [
      [[0.18, 0.18], [0.82, 0.18]],
      [[0.22, 0.5], [0.78, 0.5]],
      [[0.5, 0.18], [0.5, 0.84]],
      [[0.1, 0.84], [0.9, 0.84]],
      [[0.68, 0.6], [0.78, 0.74]],
    ],
    天: [
      [[0.18, 0.2], [0.82, 0.2]],
      [[0.12, 0.48], [0.88, 0.48]],
      [[0.5, 0.2], [0.42, 0.62], [0.12, 0.9]],
      [[0.5, 0.48], [0.88, 0.9]],
    ],
    本: [
      [[0.14, 0.34], [0.86, 0.34]],
      [[0.5, 0.1], [0.5, 0.92]],
      [[0.5, 0.34], [0.14, 0.78]],
      [[0.5, 0.34], [0.86, 0.78]],
      [[0.3, 0.74], [0.7, 0.74]],
    ],
    末: [
      [[0.1, 0.3], [0.9, 0.3]],
      [[0.22, 0.5], [0.78, 0.5]],
      [[0.5, 0.1], [0.5, 0.92]],
      [[0.5, 0.5], [0.14, 0.86]],
      [[0.5, 0.5], [0.86, 0.86]],
    ],
    白: [
      [[0.52, 0.1], [0.4, 0.26]],
      [[0.22, 0.28], [0.22, 0.88]],
      [[0.22, 0.28], [0.78, 0.28], [0.78, 0.88]],
      [[0.22, 0.56], [0.78, 0.56]],
      [[0.22, 0.86], [0.78, 0.86]],
    ],
    目: [
      [[0.24, 0.14], [0.24, 0.88]],
      [[0.24, 0.14], [0.76, 0.14], [0.76, 0.88]],
      [[0.24, 0.38], [0.76, 0.38]],
      [[0.24, 0.62], [0.76, 0.62]],
      [[0.24, 0.86], [0.76, 0.86]],
    ],
    田: [
      [[0.18, 0.2], [0.22, 0.84]],
      [[0.18, 0.2], [0.82, 0.2], [0.78, 0.84]],
      [[0.5, 0.2], [0.5, 0.82]],
      [[0.2, 0.5], [0.8, 0.5]],
      [[0.22, 0.82], [0.78, 0.82]],
    ],
    电: [
      [[0.2, 0.24], [0.24, 0.66]],
      [[0.2, 0.24], [0.78, 0.24], [0.74, 0.64]],
      [[0.22, 0.44], [0.76, 0.44]],
      [[0.24, 0.64], [0.74, 0.64]],
      [[0.5, 0.1], [0.5, 0.84], [0.84, 0.86], [0.88, 0.72]],
    ],
    长: [
      [[0.72, 0.14], [0.34, 0.42]],
      [[0.12, 0.48], [0.88, 0.48]],
      [[0.36, 0.14], [0.36, 0.86], [0.58, 0.72]],
      [[0.46, 0.5], [0.86, 0.88]],
    ],
    门: [
      [[0.24, 0.12], [0.34, 0.24]],
      [[0.2, 0.32], [0.2, 0.88]],
      [[0.44, 0.2], [0.82, 0.2], [0.82, 0.88], [0.68, 0.82]],
    ],
    问: [
      [[0.24, 0.12], [0.34, 0.24]],
      [[0.18, 0.32], [0.18, 0.88]],
      [[0.44, 0.2], [0.82, 0.2], [0.82, 0.88], [0.68, 0.82]],
      [[0.36, 0.46], [0.38, 0.74]],
      [[0.36, 0.46], [0.64, 0.46], [0.62, 0.74]],
      [[0.38, 0.74], [0.62, 0.74]],
    ],
    同: [
      [[0.18, 0.18], [0.18, 0.88]],
      [[0.18, 0.18], [0.82, 0.18], [0.82, 0.88], [0.68, 0.82]],
      [[0.34, 0.36], [0.66, 0.36]],
      [[0.36, 0.5], [0.38, 0.72]],
      [[0.36, 0.5], [0.64, 0.5], [0.62, 0.72]],
      [[0.38, 0.72], [0.62, 0.72]],
    ],
    回: [
      [[0.14, 0.18], [0.18, 0.86]],
      [[0.14, 0.18], [0.86, 0.18], [0.82, 0.86]],
      [[0.36, 0.38], [0.38, 0.66]],
      [[0.36, 0.38], [0.64, 0.38], [0.62, 0.66]],
      [[0.38, 0.66], [0.62, 0.66]],
      [[0.18, 0.84], [0.82, 0.84]],
    ],
    学: [
      [[0.26, 0.12], [0.36, 0.24]],
      [[0.48, 0.1], [0.54, 0.22]],
      [[0.74, 0.12], [0.64, 0.24]],
      [[0.16, 0.34], [0.14, 0.44]],
      [[0.16, 0.32], [0.84, 0.32], [0.78, 0.42]],
      [[0.32, 0.46], [0.68, 0.46], [0.5, 0.6]],
      [[0.5, 0.6], [0.5, 0.88], [0.38, 0.82]],
      [[0.14, 0.66], [0.86, 0.66]],
    ],
    文: [
      [[0.46, 0.1], [0.54, 0.24]],
      [[0.12, 0.32], [0.88, 0.32]],
      [[0.66, 0.32], [0.46, 0.66], [0.14, 0.88]],
      [[0.3, 0.38], [0.86, 0.88]],
    ],
    生: [
      [[0.32, 0.18], [0.18, 0.46]],
      [[0.26, 0.36], [0.8, 0.36]],
      [[0.22, 0.6], [0.78, 0.6]],
      [[0.5, 0.12], [0.5, 0.86]],
      [[0.1, 0.86], [0.9, 0.86]],
    ],
    力: [
      [[0.18, 0.36], [0.8, 0.34], [0.7, 0.86], [0.54, 0.78]],
      [[0.5, 0.12], [0.4, 0.58], [0.14, 0.88]],
    ],
    正: [
      [[0.16, 0.2], [0.84, 0.2]],
      [[0.5, 0.2], [0.5, 0.84]],
      [[0.5, 0.52], [0.78, 0.52]],
      [[0.26, 0.44], [0.26, 0.84]],
      [[0.1, 0.84], [0.9, 0.84]],
    ],
    方: [
      [[0.46, 0.1], [0.54, 0.24]],
      [[0.12, 0.32], [0.88, 0.32]],
      [[0.46, 0.48], [0.76, 0.48], [0.68, 0.86], [0.54, 0.8]],
      [[0.48, 0.32], [0.36, 0.64], [0.14, 0.88]],
    ],
    不: [
      [[0.12, 0.2], [0.88, 0.2]],
      [[0.54, 0.2], [0.36, 0.52], [0.12, 0.72]],
      [[0.5, 0.36], [0.5, 0.9]],
      [[0.56, 0.48], [0.86, 0.7]],
    ],
    有: [
      [[0.14, 0.28], [0.88, 0.28]],
      [[0.5, 0.1], [0.34, 0.5], [0.12, 0.74]],
      [[0.36, 0.46], [0.36, 0.88]],
      [[0.36, 0.46], [0.76, 0.46], [0.76, 0.88], [0.64, 0.82]],
      [[0.36, 0.62], [0.76, 0.62]],
      [[0.36, 0.76], [0.76, 0.76]],
    ],
    无: [
      [[0.18, 0.2], [0.82, 0.2]],
      [[0.12, 0.48], [0.88, 0.48]],
      [[0.5, 0.2], [0.38, 0.64], [0.14, 0.88]],
      [[0.54, 0.48], [0.54, 0.82], [0.86, 0.84], [0.88, 0.7]],
    ],
    在: [
      [[0.14, 0.28], [0.88, 0.28]],
      [[0.5, 0.12], [0.32, 0.52], [0.12, 0.74]],
      [[0.26, 0.46], [0.26, 0.88]],
      [[0.38, 0.54], [0.8, 0.54]],
      [[0.6, 0.36], [0.6, 0.86]],
      [[0.32, 0.86], [0.88, 0.86]],
    ],
    为: [
      [[0.28, 0.18], [0.38, 0.32]],
      [[0.58, 0.12], [0.4, 0.56], [0.14, 0.88]],
      [[0.22, 0.44], [0.8, 0.42], [0.72, 0.86], [0.58, 0.78]],
      [[0.48, 0.56], [0.6, 0.68]],
    ],
    和: [
      [[0.44, 0.14], [0.16, 0.24]],
      [[0.12, 0.44], [0.48, 0.44]],
      [[0.32, 0.2], [0.32, 0.88]],
      [[0.32, 0.44], [0.12, 0.76]],
      [[0.34, 0.54], [0.46, 0.66]],
      [[0.56, 0.32], [0.58, 0.76]],
      [[0.56, 0.32], [0.86, 0.32], [0.82, 0.74]],
      [[0.58, 0.74], [0.82, 0.74]],
    ],
    的: [
      [[0.32, 0.12], [0.24, 0.26]],
      [[0.14, 0.28], [0.14, 0.82]],
      [[0.14, 0.28], [0.42, 0.28], [0.42, 0.82]],
      [[0.14, 0.54], [0.42, 0.54]],
      [[0.14, 0.8], [0.42, 0.8]],
      [[0.62, 0.12], [0.5, 0.4]],
      [[0.54, 0.32], [0.86, 0.3], [0.8, 0.86], [0.64, 0.8]],
      [[0.56, 0.54], [0.68, 0.68]],
    ],
    了: [
      [[0.2, 0.18], [0.82, 0.18], [0.5, 0.4]],
      [[0.52, 0.4], [0.52, 0.88], [0.38, 0.8]],
    ],
    是: [
      [[0.28, 0.14], [0.3, 0.4]],
      [[0.28, 0.14], [0.72, 0.14], [0.7, 0.4]],
      [[0.3, 0.27], [0.7, 0.27]],
      [[0.3, 0.4], [0.7, 0.4]],
      [[0.14, 0.52], [0.86, 0.52]],
      [[0.5, 0.52], [0.5, 0.8]],
      [[0.5, 0.66], [0.76, 0.66]],
      [[0.32, 0.62], [0.16, 0.88]],
      [[0.3, 0.72], [0.88, 0.88]],
    ],
    这: [
      [[0.58, 0.12], [0.64, 0.24]],
      [[0.38, 0.28], [0.86, 0.28]],
      [[0.74, 0.28], [0.56, 0.58], [0.38, 0.72]],
      [[0.48, 0.42], [0.84, 0.72]],
      [[0.18, 0.18], [0.28, 0.28]],
      [[0.12, 0.48], [0.26, 0.48], [0.22, 0.72]],
      [[0.12, 0.78], [0.34, 0.78], [0.88, 0.88]],
    ],
    那: [
      [[0.16, 0.2], [0.48, 0.2], [0.46, 0.86], [0.34, 0.78]],
      [[0.18, 0.42], [0.46, 0.42]],
      [[0.18, 0.64], [0.46, 0.64]],
      [[0.32, 0.2], [0.28, 0.62], [0.12, 0.86]],
      [[0.62, 0.2], [0.86, 0.2], [0.74, 0.42], [0.86, 0.64], [0.7, 0.68]],
      [[0.62, 0.2], [0.62, 0.9]],
    ],
  };
  function registerStrokeOrderGlyphs(
    entries: Record<string, NormStroke[]>
  ): void {
    for (const [char, strokes] of Object.entries(entries)) {
      STROKE_ORDER_DICT[char] = strokes;
    }
    glyphProviderRegistry.notifyChanged();
  }
  function resolveTargetBounds(
    inkBounds: Rect | undefined,
    boxW: number,
    boxH: number
  ): Rect {
    if (inkBounds) {
      const cx = inkBounds.x + inkBounds.width * 0.5;
      const cy = inkBounds.y + inkBounds.height * 0.5;
      const w = Math.max(4, inkBounds.width);
      const h = Math.max(4, inkBounds.height);
      return {
        x: cx - w * 0.5,
        y: cy - h * 0.5,
        width: w,
        height: h,
      };
    }
    const padX = boxW * 0.2;
    const padY = boxH * 0.18;
    return {
      x: padX,
      y: padY,
      width: Math.max(6, boxW - padX * 2),
      height: Math.max(6, boxH - padY * 2),
    };
  }
  const strokeOrderGlyphProvider: GlyphProviderPlugin = {
    id: 'stroke-order-dict',
    name: 'Standard Stroke Order',
    priority: 80,
    resolveStrokes(ctx): GlyphStrokeSegment[] | null {
      const normStrokes = STROKE_ORDER_DICT[ctx.char];
      if (!normStrokes || normStrokes.length === 0) {
        return null;
      }

      const bounds = resolveTargetBounds(ctx.inkBounds, ctx.boxW, ctx.boxH);
      const segments: GlyphStrokeSegment[] = [];

      for (const stroke of normStrokes) {
        if (stroke.length === 0) continue;
        const pts: Point[] = stroke.map(([nx, ny]) => ({
          x: bounds.x + nx * bounds.width,
          y: bounds.y + ny * bounds.height,
        }));
        if (pts.length === 1) {
          pts.push({ x: pts[0].x + 2.5, y: pts[0].y + 1.5 });
        }
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
          len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }
        segments.push({ points: pts, length: Math.max(1, len) });
      }

      return segments.length > 0 ? segments : null;
    },
  };
  return { strokeOrderGlyphProvider };
})();

// --- Module: src/plugins/glyphs/inkGridProvider.ts ---
const { inkGridGlyphProvider } = (() => {
  const inkGridGlyphProvider: GlyphProviderPlugin = {
    id: 'ink-grid-fallback',
    name: 'Ink Grid Fallback',
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
  return { inkGridGlyphProvider };
})();

// --- Module: src/plugins/hands/illustratedHandPlugin.ts ---
const { illustratedHandPlugin } = (() => {
  const illustratedHandPlugin: HandPlugin = {
    id: 'hand-chalk',
    name: 'Drawing Hand',
    draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
      ctx.translate(screenX, screenY - lift * 0.8);

      const microSway = penDown
        ? Math.sin(tMs * 0.018) * 0.028 * Math.min(1.2, velocity)
        : 0;
      const angle = Math.PI * 0.22 + microSway;

      // Soft board shadow scaling cleanly with pen lift
      ctx.save();
      ctx.translate(4 + lift * 0.55, 6 + lift * 0.72);
      ctx.rotate(angle);
      ctx.fillStyle = presentation.shadowColor;
      ctx.beginPath();
      ctx.ellipse(38, 2, 46, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.rotate(angle);
      presentation.drawInstrument(ctx, colorHex);

      const skinBase = '#f4c7a5';
      const skinShadow = '#dfb08c';
      const outline = 'rgba(72, 46, 30, 0.42)';

      // Curled lower fingers behind the stick
      ctx.fillStyle = skinShadow;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(26, 4, 24, 16, 8);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(38, 11, 22, 14, 7);
      ctx.fill();
      ctx.stroke();

      // Palm / back of hand
      ctx.fillStyle = skinBase;
      ctx.beginPath();
      ctx.moveTo(42, -14);
      ctx.bezierCurveTo(64, -22, 92, -16, 110, -4);
      ctx.lineTo(112, 24);
      ctx.bezierCurveTo(84, 30, 56, 24, 44, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Index finger resting along top of instrument
      ctx.fillStyle = skinBase;
      ctx.beginPath();
      ctx.moveTo(20, -4.5);
      ctx.bezierCurveTo(26, -13, 46, -14, 62, -9);
      ctx.bezierCurveTo(65, -4, 58, 1, 44, 0.5);
      ctx.bezierCurveTo(32, 0.5, 22, -0.5, 20, -4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thumb pinching gently from the bottom-front
      ctx.fillStyle = '#f8d2b4';
      ctx.beginPath();
      ctx.moveTo(25, 2);
      ctx.bezierCurveTo(32, 0, 50, 4, 58, 11);
      ctx.bezierCurveTo(54, 18, 38, 16, 26, 10);
      ctx.bezierCurveTo(22, 7.5, 22, 3.5, 25, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Clean studio cuff sleeve fading out smoothly
      const sleeveGrad = ctx.createLinearGradient(96, 0, 155, 0);
      sleeveGrad.addColorStop(0, '#334155');
      sleeveGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
      ctx.fillStyle = sleeveGrad;
      ctx.beginPath();
      ctx.moveTo(98, -14);
      ctx.lineTo(156, -18);
      ctx.lineTo(158, 30);
      ctx.lineTo(98, 26);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },
  };
  return { illustratedHandPlugin };
})();

// --- Module: src/plugins/hands/minimalHandPlugin.ts ---
const { minimalHandPlugin } = (() => {
  const minimalHandPlugin: HandPlugin = {
    id: 'hand-minimal',
    name: 'Minimal Hand',
    draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
      ctx.translate(screenX, screenY - lift * 0.8);

      const microSway = penDown
        ? Math.sin(tMs * 0.018) * 0.022 * Math.min(1.2, velocity)
        : 0;
      const angle = Math.PI * 0.22 + microSway;

      // Subtle lift shadow
      ctx.save();
      ctx.translate(3 + lift * 0.45, 5 + lift * 0.65);
      ctx.rotate(angle);
      ctx.fillStyle = presentation.shadowColor;
      ctx.beginPath();
      ctx.ellipse(34, 2, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.rotate(angle);
      presentation.drawInstrument(ctx, colorHex);

      // Translucent minimalist hand silhouette adapting to surface ink polarity
      const inkColor = presentation.palette.colors.white;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.save();
      ctx.globalAlpha *= 0.22;
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.moveTo(42, -13);
      ctx.bezierCurveTo(64, -20, 92, -14, 110, -4);
      ctx.lineTo(110, 22);
      ctx.bezierCurveTo(84, 28, 56, 22, 42, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha *= 0.68;
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.6;

      // Back of hand contour
      ctx.beginPath();
      ctx.moveTo(42, -12);
      ctx.bezierCurveTo(64, -20, 92, -15, 112, -4);
      ctx.moveTo(112, 22);
      ctx.bezierCurveTo(84, 28, 56, 22, 44, 12);
      ctx.stroke();

      // Index finger & thumb minimal grip lines
      ctx.beginPath();
      ctx.moveTo(21, -4.5);
      ctx.bezierCurveTo(28, -12, 46, -13, 60, -8);
      ctx.moveTo(26, 3);
      ctx.bezierCurveTo(34, 1, 49, 5, 56, 11);
      ctx.bezierCurveTo(50, 17, 36, 15, 26, 9);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    },
  };
  return { minimalHandPlugin };
})();

// --- Module: src/plugins/hands/tipOnlyHandPlugin.ts ---
const { tipOnlyHandPlugin } = (() => {
  const tipOnlyHandPlugin: HandPlugin = {
    id: 'tip-only',
    name: 'Pen Only',
    draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
      ctx.translate(screenX, screenY - lift * 0.8);

      const microSway = penDown
        ? Math.sin(tMs * 0.018) * 0.02 * Math.min(1.2, velocity)
        : 0;
      const angle = Math.PI * 0.22 + microSway;

      ctx.save();
      ctx.translate(4 + lift * 0.55, 6 + lift * 0.72);
      ctx.rotate(angle);
      ctx.fillStyle = presentation.shadowColor;
      ctx.beginPath();
      ctx.ellipse(38, 2, 46, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.rotate(angle);
      presentation.drawInstrument(ctx, colorHex);
      ctx.restore();
    },
  };
  return { tipOnlyHandPlugin };
})();

// --- Module: src/plugins/hands/hiddenHandPlugin.ts ---
const { hiddenHandPlugin } = (() => {
  const hiddenHandPlugin: HandPlugin = {
    id: 'hidden',
    name: 'Hidden',
    draw() {
      // Intentional no-op for clean unobstructed drawing mode
    },
  };
  return { hiddenHandPlugin };
})();

// --- Module: src/plugins/hands/imageHandFactory.ts ---
(() => {
  function createImageHandPlugin(opts: ImageHandOptions): HandPlugin {
    let cachedImg: HTMLImageElement | null = null;
    let loaded = false;

    const ensureImage = (): HTMLImageElement | null => {
      if (typeof Image === 'undefined') return null;
      if (!cachedImg) {
        const img = new Image();
        img.onload = () => {
          loaded = true;
        };
        img.src = opts.imageSrc;
        cachedImg = img;
        if (img.complete && img.naturalWidth > 0) {
          loaded = true;
        }
      }
      return loaded && cachedImg.naturalWidth > 0 ? cachedImg : null;
    };

    const scale = opts.scale ?? 1;

    return {
      id: opts.id,
      name: opts.name,
      draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha }) {
        if (alpha <= 0.01) return;
        const img = ensureImage();
        ctx.save();
        ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
        ctx.translate(screenX, screenY - lift * 0.8);

        if (img) {
          ctx.save();
          ctx.shadowColor = presentation.shadowColor;
          ctx.shadowOffsetX = 4 + lift * 0.55;
          ctx.shadowOffsetY = 6 + lift * 0.72;
          ctx.shadowBlur = 8 + lift * 0.4;
          ctx.drawImage(
            img,
            -opts.tipAnchorX * scale,
            -opts.tipAnchorY * scale,
            img.naturalWidth * scale,
            img.naturalHeight * scale
          );
          ctx.restore();
        } else {
          // Fallback instrument until external PNG finishes decoding
          ctx.rotate(Math.PI * 0.22);
          presentation.drawInstrument(ctx, colorHex);
        }

        ctx.restore();
      },
    };
  }
})();

// --- Module: src/plugins/cameras/helpers.ts ---
const { clamp01, easeInOutCubic, lerpCamera, fitBounds, findActiveStepIndex, evaluateStepCamera } = (() => {
  function clamp01(t: number): number {
    return Math.max(0, Math.min(1, t));
  }
  function easeInOutCubic(t: number): number {
    const c = clamp01(t);
    return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
  }
  function lerpCamera(
    a: CameraState,
    b: CameraState,
    t: number
  ): CameraState {
    const u = easeInOutCubic(t);
    return {
      cx: a.cx + (b.cx - a.cx) * u,
      cy: a.cy + (b.cy - a.cy) * u,
      zoom: a.zoom + (b.zoom - a.zoom) * u,
    };
  }
  function fitBounds(
    bounds: Rect,
    viewportW: number,
    viewportH: number,
    padding = 64,
    minZoom = 0.28,
    maxZoom = 1.65
  ): CameraState {
    const effPad = Math.min(padding, Math.round(Math.min(viewportW, viewportH) * 0.085));
    const safeW = Math.max(100, viewportW - effPad * 2);
    const safeH = Math.max(100, viewportH - effPad * 2);
    const bw = Math.max(40, bounds.width);
    const bh = Math.max(40, bounds.height);

    const rawZoom = Math.min(safeW / bw, safeH / bh);
    const zoom = Math.max(minZoom, Math.min(maxZoom, rawZoom));

    return {
      cx: bounds.x + bounds.width / 2,
      cy: bounds.y + bounds.height / 2,
      zoom,
    };
  }
  function findActiveStepIndex(
    steps: CameraEvalContext['steps'],
    tMs: number
  ): number {
    for (let i = 0; i < steps.length; i++) {
      if (tMs < steps[i].endMs) {
        return i;
      }
    }
    return Math.max(0, steps.length - 1);
  }
  function evaluateStepCamera(
    ctx: CameraEvalContext,
    options: {
      boundsMode: 'focus' | 'cumulative';
      padding: number;
      maxZoom: number;
    }
  ): CameraState {
    const overviewCam = fitBounds(
      ctx.fullBounds,
      ctx.viewportW,
      ctx.viewportH,
      56,
      0.22,
      1.35
    );

    if (ctx.steps.length === 0) {
      return overviewCam;
    }

    const tMs = Math.max(0, Math.min(ctx.totalDurationMs, ctx.tMs));
    const steps = ctx.steps;

    const stepCameras: CameraState[] = steps.map((s) =>
      fitBounds(
        options.boundsMode === 'focus' ? s.focusBounds : s.cumulativeBounds,
        ctx.viewportW,
        ctx.viewportH,
        options.padding,
        0.26,
        options.maxZoom
      )
    );

    if (tMs >= ctx.outroStartMs) {
      const lastCam = stepCameras[stepCameras.length - 1];
      const outroDur = Math.max(1, ctx.totalDurationMs - ctx.outroStartMs);
      const moveDur = Math.min(outroDur * 0.72, 1100);
      const u = Math.min(1, (tMs - ctx.outroStartMs) / Math.max(1, moveDur));
      return lerpCamera(lastCam, overviewCam, u);
    }

    const idx = findActiveStepIndex(steps, tMs);
    const currentStep = steps[idx];
    const targetCam = stepCameras[idx];

    if (idx === 0) {
      const initialWide: CameraState = {
        cx: targetCam.cx,
        cy: targetCam.cy,
        zoom: Math.max(0.28, targetCam.zoom * 0.88),
      };
      const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 220);
      const u = Math.min(
        1,
        (tMs - currentStep.startMs) / Math.max(1, panEnd - currentStep.startMs)
      );
      return lerpCamera(initialWide, targetCam, u);
    }

    const prevCam = stepCameras[idx - 1];
    const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 250);
    if (tMs <= panEnd) {
      const u =
        (tMs - currentStep.startMs) / Math.max(1, panEnd - currentStep.startMs);
      return lerpCamera(prevCam, targetCam, u);
    }

    return targetCam;
  }
  return { clamp01, easeInOutCubic, lerpCamera, fitBounds, findActiveStepIndex, evaluateStepCamera };
})();

// --- Module: src/plugins/cameras/autoFollowCamera.ts ---
const { autoFollowCameraPlugin } = (() => {
  const autoFollowCameraPlugin: CameraPlugin = {
    id: 'auto-follow',
    name: 'Auto Follow',
    evaluate(ctx) {
      return evaluateStepCamera(ctx, {
        boundsMode: 'focus',
        padding: 84,
        maxZoom: 1.55,
      });
    },
  };
  return { autoFollowCameraPlugin };
})();

// --- Module: src/plugins/cameras/progressiveFitCamera.ts ---
const { progressiveFitCameraPlugin } = (() => {
  const progressiveFitCameraPlugin: CameraPlugin = {
    id: 'progressive-fit',
    name: 'Progressive Fit',
    evaluate(ctx) {
      return evaluateStepCamera(ctx, {
        boundsMode: 'cumulative',
        padding: 62,
        maxZoom: 1.38,
      });
    },
  };
  return { progressiveFitCameraPlugin };
})();

// --- Module: src/plugins/cameras/staticOverviewCamera.ts ---
const { staticOverviewCameraPlugin } = (() => {
  const staticOverviewCameraPlugin: CameraPlugin = {
    id: 'static-overview',
    name: 'Overview',
    evaluate(ctx) {
      return fitBounds(ctx.fullBounds, ctx.viewportW, ctx.viewportH, 56, 0.22, 1.35);
    },
  };
  return { staticOverviewCameraPlugin };
})();

// --- Module: src/plugins/cameras/penFollowCamera.ts ---
const { penFollowCameraPlugin } = (() => {
  const penFollowCameraPlugin: CameraPlugin = {
    id: 'pen-follow',
    name: 'Pen Follow',
    evaluate(ctx) {
      const overviewCam = fitBounds(
        ctx.fullBounds,
        ctx.viewportW,
        ctx.viewportH,
        56,
        0.22,
        1.35
      );

      if (ctx.steps.length === 0) {
        return overviewCam;
      }

      const safeW = Math.max(160, ctx.viewportW - 112);
      const widthZoom = safeW / Math.max(260, ctx.fullBounds.width);
      const readingZoom = Math.max(
        0.55,
        Math.min(1.28, Math.max(overviewCam.zoom, widthZoom))
      );
      const visibleH = ctx.viewportH / readingZoom;

      const clampY = (y: number): number => {
        if (ctx.fullBounds.height <= visibleH * 0.92) {
          return ctx.fullBounds.y + ctx.fullBounds.height / 2;
        }
        const minY = ctx.fullBounds.y + visibleH * 0.44;
        const maxY = ctx.fullBounds.y + ctx.fullBounds.height - visibleH * 0.44;
        if (minY >= maxY) {
          return (minY + maxY) / 2;
        }
        return Math.max(minY, Math.min(maxY, y));
      };

      const pageCenterX = ctx.fullBounds.x + ctx.fullBounds.width / 2;
      const stepCamAt = (stepIdx: number, uDraw: number): CameraState => {
        const step = ctx.steps[stepIdx];
        const topY =
          step.focusBounds.y + Math.min(step.focusBounds.height * 0.35, 70);
        const botY =
          step.focusBounds.y +
          Math.max(step.focusBounds.height * 0.72, step.focusBounds.height - 50);
        const cy = clampY(topY + (botY - topY) * clamp01(uDraw));
        return {
          cx: pageCenterX,
          cy,
          zoom: readingZoom,
        };
      };

      const tMs = Math.max(0, Math.min(ctx.totalDurationMs, ctx.tMs));
      const steps = ctx.steps;

      if (tMs >= ctx.outroStartMs) {
        const lastCam = stepCamAt(steps.length - 1, 1);
        const outroDur = Math.max(1, ctx.totalDurationMs - ctx.outroStartMs);
        const moveDur = Math.min(outroDur * 0.72, 1100);
        const u = Math.min(1, (tMs - ctx.outroStartMs) / Math.max(1, moveDur));
        return lerpCamera(lastCam, overviewCam, u);
      }

      const idx = findActiveStepIndex(steps, tMs);
      const currentStep = steps[idx];
      const drawU = clamp01(
        (tMs - currentStep.drawStartMs) /
          Math.max(1, currentStep.drawEndMs - currentStep.drawStartMs)
      );
      const targetCam = stepCamAt(idx, drawU);

      if (
        ctx.activePen?.visible &&
        tMs >= currentStep.drawStartMs &&
        tMs <= currentStep.drawEndMs
      ) {
        const penWeight = 0.35 * Math.sin(Math.PI * drawU);
        targetCam.cy =
          targetCam.cy + (clampY(ctx.activePen.worldY) - targetCam.cy) * penWeight;
      }

      if (idx > 0) {
        const prevEndCam = stepCamAt(idx - 1, 1);
        const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 280);
        if (tMs <= panEnd) {
          const u =
            (tMs - currentStep.startMs) /
            Math.max(1, panEnd - currentStep.startMs);
          return lerpCamera(prevEndCam, targetCam, u);
        }
      }

      return targetCam;
    },
  };
  return { penFollowCameraPlugin };
})();

// --- Module: src/plugins/transitions/chalkboardEraserTransition.ts ---
const { chalkboardEraserTransitionPlugin } = (() => {
  let cachedEraseCanvas: HTMLCanvasElement | null = null;
  function getEraseCanvas(w: number, h: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    if (!cachedEraseCanvas) {
      cachedEraseCanvas = document.createElement('canvas');
    }
    const safeW = Math.max(1, w);
    const safeH = Math.max(1, h);
    if (cachedEraseCanvas.width !== safeW || cachedEraseCanvas.height !== safeH) {
      cachedEraseCanvas.width = safeW;
      cachedEraseCanvas.height = safeH;
    }
    return cachedEraseCanvas;
  }
  function buildSweepWaypoints(width: number, height: number): Point[] {
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
  function samplePolylinePrefix(
    waypoints: Point[],
    fraction: number
  ): { points: Point[]; tip: Point; angleRad: number } {
    if (waypoints.length < 2) {
      const p = waypoints[0] ?? { x: 0, y: 0 };
      return { points: [p], tip: p, angleRad: 0 };
    }

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
        const local = segLen > 1e-4 ? (targetLen - acc) / segLen : 1;
        const clamped = Math.max(0, Math.min(1, local));
        const tip = {
          x: a.x + (b.x - a.x) * clamped,
          y: a.y + (b.y - a.y) * clamped,
        };
        points.push(tip);
        return {
          points,
          tip,
          angleRad: Math.atan2(b.y - a.y, b.x - a.x),
        };
      }
      points.push(b);
      acc += segLen;
    }

    const last = waypoints[waypoints.length - 1];
    return { points, tip: last, angleRad: 0 };
  }
  function drawFeltEraser(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angleRad: number,
    scale: number,
    alpha: number
  ): void {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    // Keep eraser handle comfortably tilted regardless of L->R or R->L swipe direction
    const gentleTilt = Math.sin(angleRad) * 0.16 - 0.14;
    ctx.rotate(gentleTilt);
    ctx.scale(scale, scale);

    // Drop shadow on board
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.roundRect(-48, -19, 100, 48, 8);
    ctx.fill();

    // Dark chalk-dusted felt pad
    ctx.fillStyle = '#2c3138';
    ctx.beginPath();
    ctx.roundRect(-50, -8, 100, 31, 6);
    ctx.fill();

    // Subtle dusty chalk residue along wiping base
    const dustGrad = ctx.createLinearGradient(0, 8, 0, 23);
    dustGrad.addColorStop(0, 'rgba(226, 232, 224, 0.08)');
    dustGrad.addColorStop(1, 'rgba(226, 232, 224, 0.42)');
    ctx.fillStyle = dustGrad;
    ctx.fillRect(-46, 10, 92, 12);

    // Warm hardwood eraser block handle
    const woodGrad = ctx.createLinearGradient(0, -25, 0, -2);
    woodGrad.addColorStop(0, '#c08552');
    woodGrad.addColorStop(0.55, '#9b6336');
    woodGrad.addColorStop(1, '#784823');
    ctx.fillStyle = woodGrad;
    ctx.strokeStyle = '#5a3417';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-48, -25, 96, 21, 5);
    ctx.fill();
    ctx.stroke();

    // Top finger-grip bevel highlight
    ctx.fillStyle = 'rgba(255, 235, 205, 0.22)';
    ctx.fillRect(-42, -21, 84, 3);

    ctx.restore();
  }
  const chalkboardEraserTransitionPlugin: TransitionPlugin = {
    id: 'chalkboard-eraser',
    name: 'Chalkboard Eraser',
    defaultDurationMs: 1150,
    render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
      const p = Math.max(0, Math.min(1, progress));
      const sweepU = Math.min(1, p / 0.88);

      // Draw incoming scene cleanly underneath
      ctx.drawImage(toCanvas, 0, 0, width, height);

      const eraseCanvas = getEraseCanvas(fromCanvas.width, fromCanvas.height);
      const eCtx = eraseCanvas?.getContext('2d') ?? null;
      if (eraseCanvas && eCtx) {
        eCtx.save();
        eCtx.setTransform(1, 0, 0, 1, 0, 0);
        eCtx.clearRect(0, 0, eraseCanvas.width, eraseCanvas.height);
        eCtx.drawImage(fromCanvas, 0, 0);

        const sx = eraseCanvas.width / Math.max(1, width);
        const sy = eraseCanvas.height / Math.max(1, height);
        eCtx.setTransform(sx, 0, 0, sy, 0, 0);

        const waypoints = buildSweepWaypoints(width, height);
        const { points, tip, angleRad } = samplePolylinePrefix(waypoints, sweepU);
        const brushWidth = Math.max(height * 0.44, 165);

        if (points.length >= 2 && sweepU > 0.001) {
          eCtx.globalCompositeOperation = 'destination-out';
          eCtx.lineCap = 'round';
          eCtx.lineJoin = 'round';

          const tracePath = () => {
            eCtx.beginPath();
            eCtx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              eCtx.lineTo(points[i].x, points[i].y);
            }
          };

          // Soft outer feather pass
          eCtx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
          eCtx.lineWidth = brushWidth * 1.16;
          tracePath();
          eCtx.stroke();

          // Crisp core eraser pass
          eCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
          eCtx.lineWidth = brushWidth;
          tracePath();
          eCtx.stroke();
        }
        eCtx.restore();

        ctx.drawImage(eraseCanvas, 0, 0, width, height);

        // Draw translucent chalk cloud puffs & chalkboard eraser tool on top
        const eraserAlpha =
          p <= 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
        if (eraserAlpha > 0.01) {
          const uiScale = Math.max(0.85, Math.min(1.45, height / 560));
          ctx.save();
          ctx.globalAlpha = eraserAlpha * 0.24;
          ctx.fillStyle = '#e8ece6';
          for (let i = 0; i < 4; i++) {
            const offset = (i + 1) * 18 * uiScale;
            const puffX = tip.x - Math.cos(angleRad) * offset;
            const puffY = tip.y - Math.sin(angleRad) * offset + i * 5 * uiScale;
            ctx.beginPath();
            ctx.arc(puffX, puffY, (22 + i * 7) * uiScale, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          drawFeltEraser(ctx, tip.x, tip.y, angleRad, uiScale, eraserAlpha);
        }
      }
    },
  };
  return { chalkboardEraserTransitionPlugin };
})();

// --- Module: src/plugins/transitions/pageTurnTransition.ts ---
const { pageTurnTransitionPlugin } = (() => {
  const pageTurnTransitionPlugin: TransitionPlugin = {
    id: 'page-turn',
    name: 'Page Turn',
    defaultDurationMs: 800,
    render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
      const u = easeInOutCubic(progress);
      const slideX = -width * u;
      const underShift = (1 - u) * Math.min(36, width * 0.04);

      // Subtle settle-in for the incoming page underneath
      ctx.save();
      ctx.globalAlpha = 0.72 + 0.28 * u;
      ctx.drawImage(toCanvas, underShift, 0, width, height);
      ctx.restore();

      // Soft cast shadow beside the receding page edge
      const edgeX = width + slideX;
      if (edgeX > 0 && edgeX < width) {
        const shadowW = Math.min(44, width * 0.05);
        const grad = ctx.createLinearGradient(edgeX, 0, edgeX + shadowW, 0);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(edgeX, 0, shadowW, height);
      }

      // Outgoing page slides smoothly left off the stage
      ctx.drawImage(fromCanvas, slideX, 0, width, height);
    },
  };
  return { pageTurnTransitionPlugin };
})();

// --- Module: src/plugins/transitions/crossfadeTransition.ts ---
const { crossfadeTransitionPlugin } = (() => {
  const crossfadeTransitionPlugin: TransitionPlugin = {
    id: 'crossfade',
    name: 'Crossfade',
    defaultDurationMs: 650,
    render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
      const u = easeInOutCubic(progress);
      ctx.drawImage(fromCanvas, 0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = u;
      ctx.drawImage(toCanvas, 0, 0, width, height);
      ctx.restore();
    },
  };
  return { crossfadeTransitionPlugin };
})();

// --- Module: src/plugins/transitions/cutTransition.ts ---
const { cutTransitionPlugin } = (() => {
  const cutTransitionPlugin: TransitionPlugin = {
    id: 'cut',
    name: 'Cut',
    defaultDurationMs: 0,
    render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
      ctx.drawImage(progress < 0.5 ? fromCanvas : toCanvas, 0, 0, width, height);
    },
  };
  return { cutTransitionPlugin };
})();

// --- Module: src/plugins/exporters/helpers.ts ---
const { safeFilename, waitMs, throwIfAborted, createOffscreenCanvas, canvasToBlob, bytesToBase64, buildTarArchive } = (() => {
  function safeFilename(title: string, ext: string): string {
    const cleaned = title
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_');
    const cleanExt = ext.replace(/^\./, '') || 'bin';
    return `${cleaned || 'penova-lesson'}.${cleanExt}`;
  }
  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new DOMException('导出已取消', 'AbortError');
    }
  }
  function createOffscreenCanvas(
    width: number,
    height: number
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (typeof document === 'undefined') {
      throw new Error('当前环境不支持 2D 离屏画布导出');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法初始化离屏 2D 画布');
    }
    return { canvas, ctx };
  }
  function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType = 'image/png',
    quality?: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`画布编码为 ${mimeType} 失败`));
          }
        },
        mimeType,
        quality
      );
    });
  }
  function bytesToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
  }
  const textEncoder = new TextEncoder();
  function writeAsciiField(
    buf: Uint8Array,
    offset: number,
    maxLen: number,
    str: string
  ): void {
    const bytes = textEncoder.encode(str);
    const count = Math.min(maxLen, bytes.length);
    buf.set(bytes.subarray(0, count), offset);
  }
  /**
   * Builds a POSIX ustar archive cleanly in memory with 512-byte headers,
   * valid unsigned byte checksums, and two zero EOF blocks.
   */
  function buildTarArchive(entries: TarEntry[]): Uint8Array {
    const mtimeOctal = Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, '0');

    let totalBytes = 1024; // two 512-byte EOF zero blocks
    const prepared = entries.map((entry) => {
      const paddedDataLen = Math.ceil(entry.data.length / 512) * 512;
      totalBytes += 512 + paddedDataLen;
      return { entry, paddedDataLen };
    });

    const out = new Uint8Array(totalBytes);
    let cursor = 0;

    for (const { entry, paddedDataLen } of prepared) {
      const header = out.subarray(cursor, cursor + 512);

      // Split long paths across ustar prefix (345..499) + name (0..99) when needed
      const nameBytes = textEncoder.encode(entry.name);
      if (nameBytes.length <= 100) {
        header.set(nameBytes, 0);
      } else {
        const slash = entry.name.lastIndexOf('/');
        if (slash > 0) {
          writeAsciiField(header, 345, 155, entry.name.slice(0, slash));
          writeAsciiField(header, 0, 100, entry.name.slice(slash + 1));
        } else {
          header.set(nameBytes.subarray(0, 100), 0);
        }
      }

      writeAsciiField(header, 100, 8, '0000644\0'); // mode
      writeAsciiField(header, 108, 8, '0000000\0'); // uid
      writeAsciiField(header, 116, 8, '0000000\0'); // gid
      writeAsciiField(
        header,
        124,
        12,
        `${entry.data.length.toString(8).padStart(11, '0')}\0`
      );
      writeAsciiField(header, 136, 12, `${mtimeOctal}\0`);
      header.fill(0x20, 148, 156); // checksum placeholder spaces
      header[156] = 0x30; // regular file ('0')
      writeAsciiField(header, 257, 6, 'ustar\0');
      writeAsciiField(header, 263, 2, '00');

      let sum = 0;
      for (let i = 0; i < 512; i++) {
        sum += header[i];
      }
      writeAsciiField(header, 148, 8, `${sum.toString(8).padStart(6, '0')}\0 `);

      cursor += 512;
      out.set(entry.data, cursor);
      cursor += paddedDataLen;
    }

    return out;
  }
  return { safeFilename, waitMs, throwIfAborted, createOffscreenCanvas, canvasToBlob, bytesToBase64, buildTarArchive };
})();

// --- Module: src/plugins/exporters/mediaRecorderExporter.ts ---
const { mediaRecorderExporterPlugin } = (() => {
  function pickSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('当前浏览器不支持 MediaRecorder 视频录制');
    }

    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }
  const mediaRecorderExporterPlugin: ExportPlugin = {
    id: 'mediarecorder-video',
    name: '1080P Video (WebM/MP4)',
    shortLabel: '1080P Video',
    category: 'sequence',
    description: 'Encode 1080P animation video in browser via MediaRecorder',
    isSupported() {
      return (
        typeof document !== 'undefined' && typeof MediaRecorder !== 'undefined'
      );
    },
    async export(source, options) {
      throwIfAborted(options.signal);

      const mimeType = pickSupportedMimeType();
      const { canvas, ctx } = createOffscreenCanvas(source.width, source.height);

      // Paint initial frame before captureStream begins recording
      source.renderFrame(ctx, source.width, source.height, 0);

      const stream = canvas.captureStream(source.fps);
      const videoTrack = stream.getVideoTracks()[0] as
        | (MediaStreamTrack & { requestFrame?: () => void })
        | undefined;

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 8_000_000,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const stopPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const resolvedMime = recorder.mimeType || mimeType || 'video/webm';
          resolve(new Blob(chunks, { type: resolvedMime }));
        };
        recorder.onerror = () => {
          reject(new Error('视频编码过程中出现错误'));
        };
      });

      const totalFrames = Math.max(
        1,
        Math.ceil((source.totalDurationMs / 1000) * source.fps)
      );
      const frameIntervalMs = 1000 / source.fps;

      recorder.start(250);
      options.onProgress(0);
      const startWall = performance.now();

      try {
        for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
          if (options.signal?.aborted) {
            if (recorder.state !== 'inactive') recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
            throw new DOMException('导出已取消', 'AbortError');
          }

          const tMs = Math.min(
            source.totalDurationMs,
            frameIdx * frameIntervalMs
          );
          source.renderFrame(ctx, source.width, source.height, tMs);

          if (videoTrack && typeof videoTrack.requestFrame === 'function') {
            videoTrack.requestFrame();
          }

          options.onProgress(
            Math.min(99, Math.round((frameIdx / totalFrames) * 100))
          );
          const targetWall = startWall + (frameIdx + 1) * frameIntervalMs;
          const remain = targetWall - performance.now();
          if (remain > 1) {
            await waitMs(remain);
          } else if (frameIdx % 4 === 0) {
            await waitMs(0);
          }
        }

        // Hold final frame slightly so recorder flushes tail buffer cleanly
        await waitMs(120);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }

        const blob = await stopPromise;
        options.onProgress(100);

        const finalMime = blob.type || mimeType || 'video/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        return {
          blob,
          filename: safeFilename(source.title, ext),
          mimeType: finalMime,
          summary: `${source.width}×${source.height} @ ${source.fps}fps`,
        };
      } finally {
        stream.getTracks().forEach((t) => t.stop());
      }
    },
  };
  return { mediaRecorderExporterPlugin };
})();

// --- Module: src/plugins/exporters/posterPngExporter.ts ---
const { posterPngExporterPlugin } = (() => {
  const posterPngExporterPlugin: ExportPlugin = {
    id: 'poster-png',
    name: 'HD Poster (1080P PNG)',
    shortLabel: 'HD PNG',
    category: 'snapshot',
    description: 'Instantly export the final board frame as a lossless 1080P PNG',
    isSupported() {
      return typeof document !== 'undefined';
    },
    async export(source, options) {
      throwIfAborted(options.signal);
      options.onProgress(15);

      const { canvas, ctx } = createOffscreenCanvas(source.width, source.height);
      source.renderFrame(
        ctx,
        source.width,
        source.height,
        source.totalDurationMs
      );
      throwIfAborted(options.signal);

      options.onProgress(70);
      const blob = await canvasToBlob(canvas, 'image/png');
      options.onProgress(100);

      return {
        blob,
        filename: safeFilename(source.title, 'png'),
        mimeType: 'image/png',
        summary: `${source.width}×${source.height} PNG`,
      };
    },
  };
  return { posterPngExporterPlugin };
})();

// --- Module: src/plugins/exporters/pngSequenceTarExporter.ts ---
const { pngSequenceTarExporterPlugin } = (() => {
  const TAR_EXPORT_FPS = 12;
  const encoder = new TextEncoder();
  const pngSequenceTarExporterPlugin: ExportPlugin = {
    id: 'png-sequence-tar',
    name: 'Offline Frames (FFmpeg .tar)',
    shortLabel: 'FFmpeg Tar',
    category: 'sequence',
    description: 'Render lossless PNG frame sequence and FFmpeg script into a .tar bundle',
    isSupported() {
      return typeof document !== 'undefined';
    },
    async export(source, options) {
      throwIfAborted(options.signal);

      const width = source.width || (source.aspectRatio === '9:16' ? 1080 : 1920);
      const height = source.height || (source.aspectRatio === '9:16' ? 1920 : 1080);
      const { canvas, ctx } = createOffscreenCanvas(width, height);

      const exportFps = Math.max(1, Math.round(source.fps || TAR_EXPORT_FPS));
      const frameIntervalMs = 1000 / exportFps;
      const totalFrames = Math.max(
        1,
        Math.ceil((source.totalDurationMs / 1000) * exportFps)
      );

      const entries: TarEntry[] = [];
      options.onProgress(0);

      for (let i = 0; i <= totalFrames; i++) {
        throwIfAborted(options.signal);

        const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
        source.renderFrame(ctx, width, height, tMs);

        const pngBlob = await canvasToBlob(canvas, 'image/png');
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        const frameNum = String(i + 1).padStart(5, '0');
        entries.push({
          name: `frames/frame_${frameNum}.png`,
          data: pngBytes,
        });

        options.onProgress(
          Math.min(92, Math.round((i / Math.max(1, totalFrames)) * 92))
        );
        if (i % 4 === 0) {
          await waitMs(0);
        }
      }

      throwIfAborted(options.signal);
      const frameCount = entries.length;

      const manifest = {
        title: source.title,
        aspectRatio: source.aspectRatio,
        width,
        height,
        fps: exportFps,
        frameCount,
        totalDurationMs: source.totalDurationMs,
        ffmpegCommand: `ffmpeg -framerate ${exportFps} -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4`,
      };
      entries.push({
        name: 'manifest.json',
        data: encoder.encode(JSON.stringify(manifest, null, 2)),
      });
      entries.push({
        name: 'README-ffmpeg.txt',
        data: encoder.encode(
          [
            `Penova Offline Lossless Frame Bundle · ${source.title}`,
            `Resolution: ${width}x${height}, FPS: ${exportFps} fps, Frames: ${frameCount}`,
            '',
            'Extract this archive and run the following command in the extracted folder to build MP4:',
            manifest.ffmpegCommand,
            '',
            'To mux a local voiceover or background audio track (e.g. audio.mp3):',
            `ffmpeg -framerate ${exportFps} -i frames/frame_%05d.png -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest output_with_audio.mp4`,
          ].join('\n')
        ),
      });

      const tarBytes = buildTarArchive(entries);
      options.onProgress(100);

      return {
        blob: new Blob([tarBytes as unknown as BlobPart], {
          type: 'application/x-tar',
        }),
        filename: safeFilename(source.title, 'tar'),
        mimeType: 'application/x-tar',
        summary: `${frameCount} frames @ ${exportFps}fps`,
      };
    },
  };
  return { pngSequenceTarExporterPlugin };
})();

// --- Module: src/plugins/exporters/posterSvgExporter.ts ---
const { posterSvgExporterPlugin } = (() => {
  const encoder = new TextEncoder();
  const posterSvgExporterPlugin: ExportPlugin = {
    id: 'poster-svg',
    name: 'Vector Poster (1080P SVG)',
    shortLabel: 'HD SVG',
    category: 'snapshot',
    description:
      'Export the final board frame as a resolution-independent 1080P SVG without Canvas',
    isSupported() {
      return true;
    },
    async export(source, options) {
      throwIfAborted(options.signal);
      if (!source.renderSvgFrame) {
        throw new Error('当前导出源不支持 SVG 矢量帧渲染');
      }
      options.onProgress(20);

      const svg = source.renderSvgFrame(
        source.totalDurationMs,
        source.width,
        source.height
      );
      throwIfAborted(options.signal);
      options.onProgress(100);

      const bytes = encoder.encode(svg);
      return {
        blob: new Blob([bytes], { type: 'image/svg+xml;charset=utf-8' }),
        filename: safeFilename(source.title, 'svg'),
        mimeType: 'image/svg+xml;charset=utf-8',
        summary: `${source.width}×${source.height} SVG`,
      };
    },
  };
  return { posterSvgExporterPlugin };
})();

// --- Module: src/plugins/exporters/svgSequenceTarExporter.ts ---
const { svgSequenceTarExporterPlugin } = (() => {
  const SVG_TAR_EXPORT_FPS = 12;
  const encoder = new TextEncoder();
  const svgSequenceTarExporterPlugin: ExportPlugin = {
    id: 'svg-sequence-tar',
    name: 'Vector Frames (SVG .tar)',
    shortLabel: 'SVG Tar',
    category: 'sequence',
    description:
      'Render platform-agnostic SVG frame sequence and FFmpeg script into a .tar bundle without Canvas',
    isSupported() {
      return true;
    },
    async export(source, options) {
      throwIfAborted(options.signal);
      if (!source.renderSvgFrame) {
        throw new Error('当前导出源不支持 SVG 矢量帧渲染');
      }

      const width = source.width;
      const height = source.height;
      const exportFps = Math.max(1, Math.round(source.fps || SVG_TAR_EXPORT_FPS));
      const frameIntervalMs = 1000 / exportFps;
      const totalFrames = Math.max(
        1,
        Math.ceil((source.totalDurationMs / 1000) * exportFps)
      );

      const entries: TarEntry[] = [];
      options.onProgress(0);

      for (let i = 0; i <= totalFrames; i++) {
        throwIfAborted(options.signal);
        const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
        const svg = source.renderSvgFrame(tMs, width, height);
        const frameNum = String(i + 1).padStart(5, '0');
        entries.push({
          name: `frames/frame_${frameNum}.svg`,
          data: encoder.encode(svg),
        });

        options.onProgress(
          Math.min(92, Math.round((i / Math.max(1, totalFrames)) * 92))
        );
        if (i % 10 === 0) {
          await waitMs(0);
        }
      }

      throwIfAborted(options.signal);
      const frameCount = entries.length;
      const manifest = {
        title: source.title,
        aspectRatio: source.aspectRatio,
        width,
        height,
        fps: exportFps,
        frameFormat: 'svg',
        frameCount,
        totalDurationMs: source.totalDurationMs,
        ffmpegCommand: `for f in frames/*.svg; do rsvg-convert "$f" -o "\${f%.svg}.png"; done && ffmpeg -framerate ${exportFps} -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4`,
      };
      entries.push({
        name: 'manifest.json',
        data: encoder.encode(JSON.stringify(manifest, null, 2)),
      });
      entries.push({
        name: 'README-ffmpeg.txt',
        data: encoder.encode(
          [
            `Penova Platform-Agnostic Vector Frame Bundle · ${source.title}`,
            `Resolution: ${width}x${height}, FPS: ${exportFps} fps, Frames: ${frameCount}`,
            '',
            'Rasterize SVG frames (e.g. via rsvg-convert / resvg / Inkscape) and encode MP4 with FFmpeg:',
            manifest.ffmpegCommand,
          ].join('\n')
        ),
      });

      const tarBytes = buildTarArchive(entries);
      options.onProgress(100);

      return {
        blob: new Blob([tarBytes.slice()], { type: 'application/x-tar' }),
        filename: safeFilename(source.title, 'tar'),
        mimeType: 'application/x-tar',
        summary: `${frameCount} SVG frames @ ${exportFps}fps`,
      };
    },
  };
  return { svgSequenceTarExporterPlugin };
})();

// --- Module: src/plugins/exporters/httpBridgeFactory.ts ---
(() => {
  /**
   * Factory helper for wiring a local FFmpeg service or cloud encoding endpoint
   * as a first-class ExportPlugin.
   */
  function createHttpBridgeExportPlugin(
    config: HttpBridgeExportConfig
  ): ExportPlugin {
    return {
      id: config.id,
      name: config.name,
      shortLabel: config.shortLabel ?? config.name,
      description:
        config.description ?? `通过服务端接口 (${config.endpointUrl}) 合成成片`,
      isSupported() {
        return typeof (config.fetchImpl ?? globalThis.fetch) === 'function';
      },
      async export(source, options) {
        throwIfAborted(options.signal);

        const fps = Math.max(1, config.fps ?? source.fps);
        const frameIntervalMs = 1000 / fps;
        const totalFrames = Math.max(
          1,
          Math.ceil((source.totalDurationMs / 1000) * fps)
        );

        const requestedFormat = config.frameFormat ?? 'auto';
        const resolvedFormat: 'png-base64' | 'svg' | 'snapshot' =
          requestedFormat !== 'auto'
            ? requestedFormat
            : config.createCanvas || typeof document !== 'undefined'
            ? 'png-base64'
            : source.renderSvgFrame
            ? 'svg'
            : 'snapshot';

        const frames: string[] = [];
        options.onProgress(0);

        if (resolvedFormat === 'svg') {
          if (!source.renderSvgFrame) {
            throw new Error('当前导出源不支持 SVG 帧渲染');
          }
          for (let i = 0; i <= totalFrames; i++) {
            throwIfAborted(options.signal);
            const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
            frames.push(source.renderSvgFrame(tMs, source.width, source.height));
            options.onProgress(
              Math.min(80, Math.round((i / Math.max(1, totalFrames)) * 80))
            );
          }
        } else if (resolvedFormat === 'snapshot') {
          if (!source.evaluateFrame) {
            throw new Error('当前导出源不支持平台无关帧快照求值');
          }
          for (let i = 0; i <= totalFrames; i++) {
            throwIfAborted(options.signal);
            const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
            frames.push(
              JSON.stringify(source.evaluateFrame(tMs, source.width, source.height))
            );
            options.onProgress(
              Math.min(80, Math.round((i / Math.max(1, totalFrames)) * 80))
            );
          }
        } else {
          const canvas = config.createCanvas
            ? config.createCanvas(source.width, source.height)
            : createOffscreenCanvas(source.width, source.height).canvas;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('无法获取离屏画布上下文');
          }

          for (let i = 0; i <= totalFrames; i++) {
            throwIfAborted(options.signal);
            const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
            source.renderFrame(ctx, source.width, source.height, tMs);

            if (config.encodeFrame) {
              frames.push(await config.encodeFrame(canvas));
            } else {
              const blob = await canvasToBlob(canvas, 'image/png');
              frames.push(bytesToBase64(new Uint8Array(await blob.arrayBuffer())));
            }

            options.onProgress(
              Math.min(80, Math.round((i / Math.max(1, totalFrames)) * 80))
            );
          }
        }

        throwIfAborted(options.signal);
        const fetcher = config.fetchImpl ?? fetch;
        const resp = await fetcher(config.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers ?? {}),
          },
          signal: options.signal,
          body: JSON.stringify({
            title: source.title,
            aspectRatio: source.aspectRatio,
            width: source.width,
            height: source.height,
            fps,
            frameFormat: resolvedFormat,
            totalDurationMs: source.totalDurationMs,
            frames,
          }),
        });

        if (!resp.ok) {
          throw new Error(`远端导出服务返回错误 (${resp.status})`);
        }

        const blob = await resp.blob();
        options.onProgress(100);
        const mimeType =
          config.mimeType ?? (blob.type || 'video/mp4');
        const ext = config.ext ?? (mimeType.includes('webm') ? 'webm' : 'mp4');

        return {
          blob,
          filename: safeFilename(source.title, ext),
          mimeType,
          summary: `${frames.length} 帧服务端编码`,
        };
      },
    };
  }
})();

// --- Module: src/plugins/index.ts ---
(() => {
  let initialized = false;
  function registerBuiltinPlugins(): void {
    if (initialized) return;
    initialized = true;

    // Register shapes
    shapeRegistry.register(roundedShapePlugin, { override: true });
    shapeRegistry.register(circleShapePlugin, { override: true });
    shapeRegistry.register(cloudShapePlugin, { override: true });
    shapeRegistry.register(underlineShapePlugin, { override: true });
    shapeRegistry.register(diamondShapePlugin, { override: true });
    shapeRegistry.register(dividerShapePlugin, { override: true });

    // Register custom SceneNode visual widgets
    sceneNodeRegistry.register(iconNodePlugin, { override: true });
    sceneNodeRegistry.register(sketchNodePlugin, { override: true });
    sceneNodeRegistry.register(codeNodePlugin, { override: true });
    sceneNodeRegistry.register(chartNodePlugin, { override: true });

    // Register layouts
    layoutRegistry.register(flowHorizontalPlugin, { override: true });
    layoutRegistry.register(flowVerticalPlugin, { override: true });
    layoutRegistry.register(mindmapPlugin, { override: true });
    layoutRegistry.register(conceptGraphPlugin, { override: true });
    layoutRegistry.register(documentLayoutPlugin, { override: true });
    layoutRegistry.register(freeformLayoutPlugin, { override: true });

    // Register presentations
    presentationRegistry.register(chalkboardPlugin, { override: true });
    presentationRegistry.register(whiteboardPlugin, { override: true });
    presentationRegistry.register(blueprintPlugin, { override: true });
    presentationRegistry.register(letterPaperPlugin, { override: true });

    // Register glyph stroke providers (sorted by priority descending at lookup)
    glyphProviderRegistry.register(strokeOrderGlyphProvider, { override: true });
    glyphProviderRegistry.register(inkGridGlyphProvider, { override: true });

    // Register writing hands
    handRegistry.register(illustratedHandPlugin, { override: true });
    handRegistry.register(minimalHandPlugin, { override: true });
    handRegistry.register(tipOnlyHandPlugin, { override: true });
    handRegistry.register(hiddenHandPlugin, { override: true });

    // Register cameras
    cameraRegistry.register(autoFollowCameraPlugin, { override: true });
    cameraRegistry.register(progressiveFitCameraPlugin, { override: true });
    cameraRegistry.register(staticOverviewCameraPlugin, { override: true });
    cameraRegistry.register(penFollowCameraPlugin, { override: true });

    // Register scene transitions
    transitionRegistry.register(chalkboardEraserTransitionPlugin, { override: true });
    transitionRegistry.register(pageTurnTransitionPlugin, { override: true });
    transitionRegistry.register(crossfadeTransitionPlugin, { override: true });
    transitionRegistry.register(cutTransitionPlugin, { override: true });

    // Register exporters
    exportRegistry.register(mediaRecorderExporterPlugin, { override: true });
    exportRegistry.register(posterPngExporterPlugin, { override: true });
    exportRegistry.register(pngSequenceTarExporterPlugin, { override: true });
    exportRegistry.register(posterSvgExporterPlugin, { override: true });
    exportRegistry.register(svgSequenceTarExporterPlugin, { override: true });
  }
  registerBuiltinPlugins();
})();

// --- Module: src/model/project.ts ---
const { createProjectFromScene, cloneProject } = (() => {
  function cloneSceneWithDetails(scene: LessonScene): LessonScene {
    return {
      ...scene,
      nodes: scene.nodes.map(cloneSceneNode),
      customSteps: scene.customSteps
        ? scene.customSteps.map((s) => ({
            ...s,
            nodeIds: [...s.nodeIds],
          }))
        : undefined,
      transitionOut: scene.transitionOut ? { ...scene.transitionOut } : undefined,
    };
  }
  function createProjectFromScene(scene: LessonScene): LessonProject {
    const cloned = cloneSceneWithDetails(scene);
    return {
      id: `proj-${cloned.id}`,
      title: cloned.title,
      aspectRatio: cloned.aspectRatio,
      scenes: [cloned],
    };
  }
  function cloneProject(project: LessonProject): LessonProject {
    return {
      ...project,
      scenes: project.scenes.map(cloneSceneWithDetails),
      subtitles: project.subtitles
        ? project.subtitles.map((c) => ({ ...c }))
        : undefined,
    };
  }
  function createBlankScene(
    template: LessonScene,
    index: number,
    locale: 'en' | 'zh-CN' = 'en'
  ): LessonScene {
    const uid = `${Date.now().toString(36)}-${index + 1}`;
    const isDoc = template.layoutMode === 'document';
    const isEn = locale === 'en';
    const starterNodes: SceneNode[] = isDoc
      ? [
          createTextNode({
            id: `scene-${uid}-p1`,
            name: isEn ? 'New Paragraph' : '新段落',
            text: isEn
              ? `Scene ${index + 1} body paragraph. Edit directly in the Outline or Document tab.`
              : `第 ${index + 1} 幕正文内容，可直接在右侧或文稿视图中编辑。`,
            align: 'left',
            indentChars: 2,
            fontSize: 21,
            maxWidth: 580,
            color: 'white',
          }),
        ]
      : [
          createCardNode({
            id: `scene-${uid}-root`,
            label: isEn ? `Scene ${index + 1} Topic` : `第 ${index + 1} 幕核心主题`,
            subtitle: isEn
              ? 'Double-click or expand outline to add nodes'
              : '双击或展开大纲继续细化节点',
            role: 'root',
            color: 'yellow',
            shape: 'rounded',
          }),
        ];

    return {
      id: `scene-${uid}`,
      title: isEn ? `Scene ${index + 1}` : `第 ${index + 1} 幕`,
      theme: template.theme,
      layoutMode: template.layoutMode,
      cameraMode: template.cameraMode,
      aspectRatio: template.aspectRatio,
      handStyle: template.handStyle,
      nodes: starterNodes,
      transitionOut: {
        type: template.theme === 'letter-paper' ? 'page-turn' : 'chalkboard-eraser',
      },
    };
  }
  return { createProjectFromScene, cloneProject };
})();

// --- Module: src/engine/layout/textMeasure.ts ---
const { estimateCharAdvanceWidth, defaultMeasureText, wrapText, measureSceneNode, positionGroupChildren } = (() => {
  const BOARD_FONT_FAMILY =
    "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";
  let cachedMeasureCtx: CanvasRenderingContext2D | null = null;
  function getBrowserMeasureCtx(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!cachedMeasureCtx) {
      const canvas = document.createElement('canvas');
      cachedMeasureCtx = canvas.getContext('2d');
    }
    return cachedMeasureCtx;
  }
  function parseFontSize(font: string): number {
    const m = font.match(/(\d+(?:\.\d+)?)px/);
    return m ? parseFloat(m[1]) : 18;
  }
  function isWideChar(ch: string): boolean {
    const code = ch.codePointAt(0) ?? 0;
    return (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3000 && code <= 0x303f)
    );
  }
  const NARROW_ASCII = new Set([
    'i', 'l', 'I', '!', '|', '.', ',', ':', ';', "'", '`', '1',
  ]);
  const SEMI_NARROW_ASCII = new Set([
    'j', 't', 'f', 'r', '(', ')', '[', ']', '{', '}', '/', '\\', '-', '"', '*',
  ]);
  const WIDE_LOWER_ASCII = new Set(['m', 'w']);
  const WIDE_UPPER_ASCII = new Set(['M', 'W', '@', '%', '&']);
  /**
   * 估算单字符在无浏览器 Canvas 上下文时的排版前进宽度，用于修复等宽近似导致的 ASCII 间距失真。
   */
  function estimateCharAdvanceWidth(
    ch: string,
    fontSize: number,
    boldBoost = 1.0,
  ): number {
    if (ch === ' ') {
      return fontSize * 0.33;
    }
    if (isWideChar(ch)) {
      return fontSize * 1.02 * boldBoost;
    }
    if (NARROW_ASCII.has(ch)) {
      return fontSize * 0.3 * boldBoost;
    }
    if (SEMI_NARROW_ASCII.has(ch)) {
      return fontSize * 0.4 * boldBoost;
    }
    if (WIDE_LOWER_ASCII.has(ch)) {
      return fontSize * 0.82 * boldBoost;
    }
    if (WIDE_UPPER_ASCII.has(ch)) {
      return fontSize * 0.88 * boldBoost;
    }
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 65 && code <= 90) || (code >= 48 && code <= 57)) {
      return fontSize * 0.64 * boldBoost;
    }
    return fontSize * 0.55 * boldBoost;
  }
  function defaultMeasureText(text: string, font: string): number {
    const ctx = getBrowserMeasureCtx();
    if (ctx) {
      ctx.font = font;
      return ctx.measureText(text).width;
    }

    const fontSize = parseFontSize(font);
    const boldBoost =
      font.trim().startsWith('700') || font.includes('bold') ? 1.05 : 1.0;
    let total = 0;
    for (const ch of text) {
      total += estimateCharAdvanceWidth(ch, fontSize, boldBoost);
    }
    return total;
  }
  function tokenizeForWrap(paragraph: string): string[] {
    const tokens: string[] = [];
    const regex = /[A-Za-z0-9._+-]+|\s+|./gu;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(paragraph)) !== null) {
      tokens.push(match[0]);
    }
    return tokens;
  }
  function wrapText(
    text: string,
    maxWidth: number,
    measureFn: (s: string) => number,
    firstLineMaxWidth?: number
  ): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [''];

    const paragraphs = trimmed.split(/\r?\n/);
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      const tokens = tokenizeForWrap(para.trim());
      let current = '';
      let paraEmittedLine = false;
      const getActiveMaxWidth = () =>
        !paraEmittedLine && firstLineMaxWidth !== undefined
          ? Math.max(40, firstLineMaxWidth)
          : maxWidth;

      const pushLine = (line: string) => {
        lines.push(line);
        paraEmittedLine = true;
      };

      for (const token of tokens) {
        const isSpace = /^\s+$/.test(token);
        if (isSpace && current === '') continue;

        const limit = getActiveMaxWidth();
        const candidate = current + token;
        if (measureFn(candidate) <= limit) {
          current = candidate;
          continue;
        }

        if (current.trim().length > 0) {
          pushLine(current.trimEnd());
          current = '';
          if (isSpace) continue;
        }

        const nextLimit = getActiveMaxWidth();
        if (measureFn(token) > nextLimit && token.length > 1) {
          let piece = '';
          for (const ch of token) {
            const pieceLimit = getActiveMaxWidth();
            if (piece && measureFn(piece + ch) > pieceLimit) {
              pushLine(piece);
              piece = ch;
            } else {
              piece += ch;
            }
          }
          current = piece;
        } else {
          current = token;
        }
      }

      if (current.trim().length > 0) {
        pushLine(current.trimEnd());
      }
    }

    return lines.length > 0 ? lines : [''];
  }
  function measureSceneNode(
    node: SceneNode,
    measureFn: MeasureTextFn = defaultMeasureText,
    fallbackMaxTextWidth?: number,
    fontFamily: string = BOARD_FONT_FAMILY
  ): MeasuredSceneNode {
    if (node.type === 'text') {
      const fontSize = node.fontSize ?? 20;
      const fontWeight = node.fontWeight ?? 400;
      const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const lineHeight = Math.round(fontSize * 1.33);
      const align = node.align ?? 'center';
      const indentPx = (node.indentChars ?? 0) * fontSize;
      const maxWidth = node.maxWidth ?? fallbackMaxTextWidth ?? 220;
      const firstLineMaxWidth =
        indentPx > 0 ? Math.max(40, maxWidth - indentPx) : undefined;

      const lines = wrapText(
        node.text,
        maxWidth,
        (s) => measureFn(s, font),
        firstLineMaxWidth
      );
      let maxMeasuredW = 0;
      lines.forEach((line, idx) => {
        const w = measureFn(line, font) + (idx === 0 ? indentPx : 0);
        if (w > maxMeasuredW) maxMeasuredW = w;
      });

      const width =
        align === 'center'
          ? Math.max(36, Math.ceil(maxMeasuredW))
          : Math.max(80, Math.ceil(Math.max(maxMeasuredW, node.maxWidth ?? 0)));
      const height = Math.max(lineHeight, lines.length * lineHeight);

      return {
        type: 'text',
        font,
        fontSize,
        lineHeight,
        align,
        indentPx,
        lines,
        width,
        height,
      };
    }

    if (node.type === 'shape') {
      const shapePlugin = shapeRegistry.getOrDefault(node.shape);
      const defaultBox = shapePlugin.measureBox(0, 0);
      return {
        type: 'shape',
        width: Math.max(40, node.width ?? defaultBox.width),
        height: Math.max(16, node.height ?? defaultBox.height),
        padX: defaultBox.padX,
        padY: defaultBox.padY,
      };
    }

    if (node.type === 'connector') {
      return { type: 'connector', width: 0, height: 0 };
    }

    if (isCustomSceneNode(node)) {
      const kind = resolveCustomNodeKind(node);
      const plugin = sceneNodeRegistry.get(kind);
      if (plugin?.compose) {
        const composedNode = plugin.compose(node);
        const composedMeasured = measureSceneNode(
          composedNode,
          measureFn,
          fallbackMaxTextWidth,
          fontFamily
        );
        return {
          type: 'custom',
          kind,
          width: composedMeasured.width,
          height: composedMeasured.height,
          composedNode,
          composedMeasured,
        };
      }
      if (plugin?.measure) {
        const res = plugin.measure(node, {
          measureNode: (n) =>
            measureSceneNode(n, measureFn, fallbackMaxTextWidth, fontFamily),
          measureText: measureFn,
          fontFamily,
        });
        return {
          type: 'custom',
          kind,
          width: Math.max(16, Math.ceil(res.width)),
          height: Math.max(16, Math.ceil(res.height)),
          payload: res.payload,
        };
      }
      return {
        type: 'custom',
        kind,
        width: 140,
        height: 54,
      };
    }

    // GroupSceneNode
    const arrange = node.arrange ?? 'card';
    const childMeasurements = new Map<string, MeasuredSceneNode>();

    if (arrange === 'card') {
      const autoShape = node.children.find(
        (c) => c.type === 'shape' && c.fitMode !== 'fixed'
      );
      const shapePlugin =
        autoShape && autoShape.type === 'shape'
          ? shapeRegistry.getOrDefault(autoShape.shape)
          : undefined;
      const groupFallbackMaxW = shapePlugin?.maxTextWidth?.();

      const contentChildren = node.children.filter((c) => c !== autoShape);
      const gap = node.gap ?? 6;
      let contentW = 0;
      let contentH = 0;
      let measuredContentCount = 0;

      for (const child of contentChildren) {
        if (child.visible === false || child.type === 'connector') continue;
        const cm = measureSceneNode(
          child,
          measureFn,
          groupFallbackMaxW,
          fontFamily
        );
        childMeasurements.set(child.id, cm);
        contentW = Math.max(contentW, cm.width);
        contentH += cm.height;
        measuredContentCount++;
      }
      if (measuredContentCount > 1) {
        contentH += (measuredContentCount - 1) * gap;
      }

      if (autoShape && autoShape.type === 'shape' && shapePlugin) {
        const box = shapePlugin.measureBox(contentW, contentH);
        const shapedM: MeasuredShapeNode = {
          type: 'shape',
          width: box.width,
          height: box.height,
          padX: box.padX,
          padY: box.padY,
          textOffsetY: box.textOffsetY,
        };
        childMeasurements.set(autoShape.id, shapedM);

        return {
          type: 'group',
          width: box.width,
          height: box.height,
          primaryShape: autoShape.shape,
          textOffsetY: box.textOffsetY,
          childMeasurements,
        };
      }

      const padX = 22;
      const padY = 14;
      return {
        type: 'group',
        width: Math.max(96, Math.ceil(contentW + padX * 2)),
        height: Math.max(46, Math.ceil(contentH + padY * 2)),
        childMeasurements,
      };
    }

    if (arrange === 'stack') {
      const gap = node.gap ?? 16;
      const stackItems: Array<{ child: SceneNode; cm: MeasuredSceneNode }> = [];
      let maxW = 0;
      let totalH = 0;
      for (const child of node.children) {
        if (child.visible === false || child.type === 'connector') continue;
        const cm = measureSceneNode(child, measureFn, undefined, fontFamily);
        childMeasurements.set(child.id, cm);
        stackItems.push({ child, cm });
        maxW = Math.max(maxW, cm.width);
        totalH += cm.height;
      }
      if (stackItems.length > 1) totalH += (stackItems.length - 1) * gap;

      let minX = -maxW / 2;
      let maxX = maxW / 2;
      let minY = -totalH / 2;
      let maxY = totalH / 2;
      let yCursor = -totalH / 2;
      for (const { child, cm } of stackItems) {
        const ox = child.offset?.x ?? 0;
        const oy = child.offset?.y ?? 0;
        const childCy = yCursor + cm.height / 2 + oy;
        minX = Math.min(minX, ox - cm.width / 2);
        maxX = Math.max(maxX, ox + cm.width / 2);
        minY = Math.min(minY, childCy - cm.height / 2);
        maxY = Math.max(maxY, childCy + cm.height / 2);
        yCursor += cm.height + gap;
      }

      const halfW = Math.max(30, Math.abs(minX) + 8, Math.abs(maxX) + 8);
      const halfH = Math.max(20, Math.abs(minY) + 8, Math.abs(maxY) + 8);
      return {
        type: 'group',
        width: Math.ceil(halfW * 2),
        height: Math.ceil(halfH * 2),
        childMeasurements,
      };
    }

    // arrange === 'free'
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const child of node.children) {
      if (child.visible === false || child.type === 'connector') continue;
      const cm = measureSceneNode(child, measureFn, undefined, fontFamily);
      childMeasurements.set(child.id, cm);
      const ox = child.offset?.x ?? 0;
      const oy = child.offset?.y ?? 0;
      minX = Math.min(minX, ox - cm.width / 2);
      minY = Math.min(minY, oy - cm.height / 2);
      maxX = Math.max(maxX, ox + cm.width / 2);
      maxY = Math.max(maxY, oy + cm.height / 2);
    }
    if (!Number.isFinite(minX)) {
      return { type: 'group', width: 120, height: 60, childMeasurements };
    }
    const halfW = Math.max(30, Math.abs(minX), Math.abs(maxX));
    const halfH = Math.max(20, Math.abs(minY), Math.abs(maxY));
    return {
      type: 'group',
      width: Math.ceil(halfW * 2),
      height: Math.ceil(halfH * 2),
      childMeasurements,
    };
  }
  function positionGroupChildren(
    group: GroupSceneNode,
    cx: number,
    cy: number,
    measured: MeasuredGroupNode
  ): PositionedSceneNode[] {
    const arrange = group.arrange ?? 'card';
    const result: PositionedSceneNode[] = [];

    if (arrange === 'card' || arrange === 'stack') {
      const autoShape =
        arrange === 'card'
          ? group.children.find(
              (c) => c.type === 'shape' && c.fitMode !== 'fixed'
            )
          : undefined;

      const stackChildren = group.children.filter(
        (c) =>
          c !== autoShape && c.visible !== false && c.type !== 'connector'
      );
      const gap = group.gap ?? (arrange === 'card' ? 6 : 16);

      let totalStackH = 0;
      stackChildren.forEach((c, idx) => {
        const cm = measured.childMeasurements.get(c.id);
        if (!cm) return;
        totalStackH += cm.height + (idx > 0 ? gap : 0);
      });

      const stackCenterOffsetY =
        arrange === 'card' ? measured.textOffsetY ?? 0 : 0;
      let yCursor = cy - totalStackH / 2 + stackCenterOffsetY;

      const childPosMap = new Map<string, PositionedSceneNode>();

      if (autoShape) {
        const sm = measured.childMeasurements.get(autoShape.id);
        if (sm) {
          childPosMap.set(autoShape.id, {
            id: autoShape.id,
            node: autoShape,
            cx: cx + (autoShape.offset?.x ?? 0),
            cy: cy + (autoShape.offset?.y ?? 0),
            width: sm.width,
            height: sm.height,
            measured: sm,
          });
        }
      }

      for (const c of stackChildren) {
        const cm = measured.childMeasurements.get(c.id);
        if (!cm) continue;
        const childCx = cx + (c.offset?.x ?? 0);
        const childCy = yCursor + cm.height / 2 + (c.offset?.y ?? 0);
        yCursor += cm.height + gap;

        const pChild: PositionedSceneNode = {
          id: c.id,
          node: c,
          cx: childCx,
          cy: childCy,
          width: cm.width,
          height: cm.height,
          measured: cm,
          children: positionMeasuredChildren(c, childCx, childCy, cm),
        };
        childPosMap.set(c.id, pChild);
      }

      // Preserve exact group.children ordering so child array order drives draw order
      for (const c of group.children) {
        const positioned = childPosMap.get(c.id);
        if (positioned) result.push(positioned);
      }
      return result;
    }

    // arrange === 'free'
    for (const c of group.children) {
      if (c.visible === false || c.type === 'connector') continue;
      const cm = measured.childMeasurements.get(c.id);
      if (!cm) continue;
      const childCx = cx + (c.offset?.x ?? 0);
      const childCy = cy + (c.offset?.y ?? 0);
      result.push({
        id: c.id,
        node: c,
        cx: childCx,
        cy: childCy,
        width: cm.width,
        height: cm.height,
        measured: cm,
        children: positionMeasuredChildren(c, childCx, childCy, cm),
      });
    }
    return result;
  }
  function positionMeasuredChildren(
    node: SceneNode,
    cx: number,
    cy: number,
    measured: MeasuredSceneNode
  ): PositionedSceneNode[] | undefined {
    if (node.type === 'group' && measured.type === 'group') {
      return positionGroupChildren(node, cx, cy, measured);
    }
    if (
      measured.type === 'custom' &&
      measured.composedNode &&
      measured.composedMeasured
    ) {
      if (
        measured.composedNode.type === 'group' &&
        measured.composedMeasured.type === 'group'
      ) {
        return positionGroupChildren(
          measured.composedNode,
          cx,
          cy,
          measured.composedMeasured
        );
      }
      return [
        {
          id: measured.composedNode.id,
          node: measured.composedNode,
          cx: cx + (measured.composedNode.offset?.x ?? 0),
          cy: cy + (measured.composedNode.offset?.y ?? 0),
          width: measured.composedMeasured.width,
          height: measured.composedMeasured.height,
          measured: measured.composedMeasured,
          children: positionMeasuredChildren(
            measured.composedNode,
            cx + (measured.composedNode.offset?.x ?? 0),
            cy + (measured.composedNode.offset?.y ?? 0),
            measured.composedMeasured
          ),
        },
      ];
    }
    return undefined;
  }
  return { estimateCharAdvanceWidth, defaultMeasureText, wrapText, measureSceneNode, positionGroupChildren };
})();

// --- Module: src/engine/layout/diagramLayout.ts ---
const { computeDiagramLayout } = (() => {
  function computeDiagramLayout(
    scene: LessonScene,
    measureFn?: MeasureTextFn
  ): ComputedLayout {
    const layoutPlugin = layoutRegistry.getOrDefault(scene.layoutMode);
    const presentation = presentationRegistry.getOrDefault(scene.theme);
    return layoutPlugin.compute(scene, {
      measureNode: (node) =>
        measureSceneNode(node, measureFn, undefined, presentation.fontFamily),
      positionGroupChildren,
    });
  }
  return { computeDiagramLayout };
})();

// --- Module: src/engine/sketch/handDrawnGeometry.ts ---
const { generateShapeStrokes, generateGroupFrameStrokes, generateConnectorStrokes } = (() => {
  function generateShapeStrokes(pNode: PositionedSceneNode): StrokePath[] {
    if (pNode.node.type !== 'shape') return [];
    const sNode = pNode.node;
    return shapeRegistry.getOrDefault(sNode.shape).generateStrokes({
      id: pNode.id,
      cx: pNode.cx,
      cy: pNode.cy,
      width: pNode.width,
      height: pNode.height,
      color: sNode.color,
      emphasized: sNode.emphasized,
      dashed: sNode.dashed,
    });
  }
  function generateGroupFrameStrokes(zone: GroupBox): StrokePath[] {
    const rand = mulberry32(hashString(`group:${zone.id}`));
    const pts = buildRoundedRectPoints(
      zone.x,
      zone.y,
      zone.width,
      zone.height,
      18,
      rand,
      0
    );
    return [
      buildStrokePath(`${zone.id}-frame`, pts, {
        width: 2.1,
        color: zone.color,
        opacity: 0.52,
        fillOpacity: 1,
        dashed: true,
        speedFactor: 1.45,
      }),
    ];
  }
  function generateConnectorStrokes(
    pNode: PositionedSceneNode,
    colorOverride?: ChalkColor
  ): StrokePath[] {
    const pts = pNode.routedPoints;
    if (!pts || pts.length < 2) return [];
    const color = colorOverride ?? pNode.node.color;
    const isDashed =
      pNode.node.type === 'connector' && pNode.node.style === 'dashed';

    const mainPts = sketchPolyline(pts, `edge:${pNode.id}`, 1.25);
    const strokes: StrokePath[] = [
      buildStrokePath(`${pNode.id}-shaft`, mainPts, {
        width: 2.5,
        color,
        opacity: 0.92,
        dashed: isDashed,
        speedFactor: 1.22,
      }),
    ];

    // Hand-drawn 2-stroke arrowhead aligned with final tangent
    const tip = mainPts[mainPts.length - 1];
    const prevIdx = Math.max(0, mainPts.length - 4);
    const prev = mainPts[prevIdx];
    const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const headLen = 13;
    const wingSpread = 0.45;
    const rand = mulberry32(hashString(`head:${pNode.id}`));

    const wing1 = {
      x: tip.x - Math.cos(angle - wingSpread) * headLen,
      y: tip.y - Math.sin(angle - wingSpread) * headLen,
    };
    const wing2 = {
      x: tip.x - Math.cos(angle + wingSpread) * headLen,
      y: tip.y - Math.sin(angle + wingSpread) * headLen,
    };

    strokes.push(
      buildStrokePath(
        `${pNode.id}-head-1`,
        sketchSegment(wing1, tip, rand, 0.7, 7),
        {
          width: 2.6,
          color,
          opacity: 0.95,
          speedFactor: 1.5,
        }
      )
    );
    strokes.push(
      buildStrokePath(
        `${pNode.id}-head-2`,
        sketchSegment(tip, wing2, rand, 0.7, 7),
        {
          width: 2.6,
          color,
          opacity: 0.95,
          speedFactor: 1.5,
        }
      )
    );

    return strokes;
  }
  return { generateShapeStrokes, generateGroupFrameStrokes, generateConnectorStrokes };
})();

// --- Module: src/engine/sketch/textStrokes.ts ---
const { getGlyphStrokeData, getGlyphTipAtProgress, drawProgressiveGlyph } = (() => {
  const MAX_GLYPH_CACHE = 1600;
  const glyphCache = new Map<string, GlyphStrokeData>();
  let measureCanvasCtx: CanvasRenderingContext2D | null = null;
  function clearGlyphCache(): void {
    glyphCache.clear();
  }
  // Automatically invalidate cached glyph strokes whenever providers are registered/unregistered
  glyphProviderRegistry.subscribe(clearGlyphCache);
  function getMeasureCtx(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!measureCanvasCtx) {
      const c = document.createElement('canvas');
      measureCanvasCtx = c.getContext('2d');
    }
    return measureCanvasCtx;
  }
  function isWide(ch: string): boolean {
    const code = ch.codePointAt(0) ?? 0;
    return (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3000 && code <= 0x303f)
    );
  }
  function cacheGlyphData(key: string, data: GlyphStrokeData): void {
    if (glyphCache.size >= MAX_GLYPH_CACHE) {
      const oldest = glyphCache.keys().next().value;
      if (oldest !== undefined) glyphCache.delete(oldest);
    }
    glyphCache.set(key, data);
  }
  function measureSegmentLength(pts: Point[]): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return len;
  }
  function buildFallbackSegments(
    width: number,
    height: number,
    fontSize: number,
    char = ''
  ): GlyphStrokeSegment[] {
    const cx = width * 0.5;
    const cy = height * 0.52;
    const rx = Math.max(4, Math.min(width * 0.36, fontSize * 0.38));
    const ry = Math.max(5, Math.min(height * 0.34, fontSize * 0.42));
    const charSeed = hashString(char || '?');
    const jitter = (a: number, b: number, amp = 0.22) =>
      (((hash2D(a, b, charSeed) & 255) / 255) - 0.5) * 2 * amp;

    // Deterministic character-seeded multi-stroke calligraphic fallback (3-4 strokes)
    const strokes: Point[][] = [
      [
        { x: cx - rx * (0.85 + jitter(1, 1)), y: cy - ry * (0.62 + jitter(1, 2)) },
        { x: cx + rx * (0.05 + jitter(1, 3, 0.12)), y: cy - ry * (0.72 + jitter(1, 4, 0.14)) },
        { x: cx + rx * (0.88 + jitter(1, 5)), y: cy - ry * (0.58 + jitter(1, 6)) },
      ],
      [
        { x: cx + rx * jitter(2, 1, 0.28), y: cy - ry * (0.82 + jitter(2, 2, 0.12)) },
        { x: cx + rx * jitter(2, 3, 0.18), y: cy + ry * 0.08 },
        { x: cx + rx * jitter(2, 4, 0.28), y: cy + ry * (0.86 + jitter(2, 5, 0.12)) },
      ],
      [
        { x: cx - rx * (0.75 + jitter(3, 1)), y: cy + ry * (0.12 + jitter(3, 2)) },
        { x: cx, y: cy + ry * (0.05 + jitter(3, 3, 0.15)) },
        { x: cx + rx * (0.82 + jitter(3, 4)), y: cy + ry * (0.28 + jitter(3, 5)) },
      ],
    ];

    if (isWide(char) || (hash2D(4, 0, charSeed) & 1) === 1) {
      strokes.push([
        { x: cx - rx * (0.58 + jitter(4, 1)), y: cy + ry * (0.74 + jitter(4, 2, 0.14)) },
        { x: cx + rx * (0.74 + jitter(4, 3)), y: cy + ry * (0.68 + jitter(4, 4, 0.14)) },
      ]);
    }

    return strokes.map((points) => ({
      points,
      length: measureSegmentLength(points),
    }));
  }
  function computeInkBounds(
    imgData: ImageData,
    pixelW: number,
    pixelH: number,
    boxW: number,
    boxH: number
  ): Rect | undefined {
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

    if (maxPx < minPx || maxPy < minPy) return undefined;

    return {
      x: (minPx / pixelW) * boxW,
      y: (minPy / pixelH) * boxH,
      width: Math.max(1, ((maxPx - minPx + 1) / pixelW) * boxW),
      height: Math.max(1, ((maxPy - minPy + 1) / pixelH) * boxH),
    };
  }
  function resolveGlyphStrokes(
    char: string,
    font: string,
    fontSize: number,
    boxW: number,
    boxH: number,
    inkBounds?: Rect,
    imgData?: ImageData,
    pixelW?: number,
    pixelH?: number
  ): GlyphStrokeSegment[] {
    if (char.trim().length === 0) return [];

    const providers = [...glyphProviderRegistry.list()].sort(
      (a, b) => b.priority - a.priority
    );
    for (const provider of providers) {
      const resolved = provider.resolveStrokes({
        char,
        font,
        fontSize,
        boxW,
        boxH,
        inkBounds,
        imgData,
        pixelW,
        pixelH,
      });
      if (resolved && resolved.length > 0) {
        return resolved;
      }
    }

    return buildFallbackSegments(boxW, boxH, fontSize, char);
  }
  function getGlyphStrokeData(
    char: string,
    font: string,
    fontSize: number,
    colorHex: string,
    theme: ThemeId
  ): GlyphStrokeData {
    const key = `${char}|${font}|${Math.round(fontSize)}|${colorHex}|${theme}`;
    const cached = glyphCache.get(key);
    if (cached) return cached;

    const mCtx = getMeasureCtx();
    if (!mCtx || typeof document === 'undefined') {
      const boldBoost =
        font.trim().startsWith('700') || font.includes('bold') ? 1.05 : 1.0;
      const advanceWidth = estimateCharAdvanceWidth(char, fontSize, boldBoost);
      const padX = Math.ceil(fontSize * 0.24);
      const width = Math.max(8, advanceWidth + padX * 2);
      const height = Math.max(12, fontSize * 1.48);
      const segments = resolveGlyphStrokes(char, font, fontSize, width, height);
      const totalLength = segments.reduce((a, s) => a + s.length, 0);

      const data: GlyphStrokeData = {
        char,
        fontSize,
        width,
        height,
        padX,
        advanceWidth,
        colorHex,
        segments,
        totalLength,
      };
      cacheGlyphData(key, data);
      return data;
    }

    mCtx.font = font;
    const advanceWidth = mCtx.measureText(char).width;
    const padX = Math.ceil(fontSize * 0.24);
    const boxW = Math.max(10, Math.ceil(advanceWidth + padX * 2));
    const boxH = Math.max(14, Math.ceil(fontSize * 1.48));

    if (char.trim().length === 0) {
      const spaceData: GlyphStrokeData = {
        char,
        fontSize,
        width: boxW,
        height: boxH,
        padX,
        advanceWidth,
        colorHex,
        segments: [],
        totalLength: 0,
      };
      cacheGlyphData(key, spaceData);
      return spaceData;
    }

    const scale = 2;
    const chalkCanvas = document.createElement('canvas');
    chalkCanvas.width = boxW * scale;
    chalkCanvas.height = boxH * scale;

    const gCtx = chalkCanvas.getContext('2d');
    let segments: GlyphStrokeSegment[] = [];

    if (gCtx) {
      gCtx.scale(scale, scale);
      gCtx.font = font;
      gCtx.fillStyle = colorHex;
      gCtx.textBaseline = 'middle';
      gCtx.textAlign = 'left';
      gCtx.fillText(char, padX, boxH * 0.52);

      const imgData = gCtx.getImageData(
        0,
        0,
        chalkCanvas.width,
        chalkCanvas.height
      );

      const grain = presentationRegistry.getOrDefault(theme).glyphGrain;
      if (grain?.enabled) {
        const minFactor = grain.minAlphaFactor ?? 0.8;
        const range = grain.range ?? 0.24;
        const pxData = imgData.data;
        const charSeed = hashString(char);
        const cw = chalkCanvas.width;
        const ch = chalkCanvas.height;
        for (let py = 0; py < ch; py++) {
          for (let px = 0; px < cw; px++) {
            const idx = (py * cw + px) * 4;
            const a = pxData[idx + 3];
            if (a === 0) continue;
            const h = hash2D(px, py, charSeed);
            const n = (h & 255) / 255;
            const factor = minFactor + n * range;
            pxData[idx + 3] = Math.min(255, Math.round(a * factor));
          }
        }
        gCtx.putImageData(imgData, 0, 0);
      }

      const inkBounds = computeInkBounds(
        imgData,
        chalkCanvas.width,
        chalkCanvas.height,
        boxW,
        boxH
      );

      segments = resolveGlyphStrokes(
        char,
        font,
        fontSize,
        boxW,
        boxH,
        inkBounds,
        imgData,
        chalkCanvas.width,
        chalkCanvas.height
      );
    }

    const totalLength = segments.reduce((acc, s) => acc + s.length, 0);
    const result: GlyphStrokeData = {
      char,
      fontSize,
      width: boxW,
      height: boxH,
      padX,
      advanceWidth,
      colorHex,
      segments,
      totalLength,
      chalkCanvas,
    };

    cacheGlyphData(key, result);
    return result;
  }
  function getGlyphTipAtProgress(
    glyph: GlyphStrokeData,
    boxX: number,
    boxY: number,
    progress: number
  ): Point {
    if (glyph.segments.length === 0 || glyph.totalLength <= 1e-4) {
      return { x: boxX + glyph.width * 0.5, y: boxY + glyph.height * 0.52 };
    }

    const target = Math.max(0, Math.min(1, progress)) * glyph.totalLength;
    let acc = 0;

    for (const seg of glyph.segments) {
      if (
        acc + seg.length >= target ||
        seg === glyph.segments[glyph.segments.length - 1]
      ) {
        const localTarget = Math.max(0, target - acc);
        let segAcc = 0;
        for (let i = 1; i < seg.points.length; i++) {
          const a = seg.points[i - 1];
          const b = seg.points[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (segAcc + len >= localTarget || i === seg.points.length - 1) {
            const frac =
              len > 1e-4 ? Math.min(1, (localTarget - segAcc) / len) : 1;
            return {
              x: boxX + a.x + (b.x - a.x) * frac,
              y: boxY + a.y + (b.y - a.y) * frac,
            };
          }
          segAcc += len;
        }
        const last = seg.points[seg.points.length - 1];
        return { x: boxX + last.x, y: boxY + last.y };
      }
      acc += seg.length;
    }

    return { x: boxX + glyph.width * 0.5, y: boxY + glyph.height * 0.5 };
  }
  function drawProgressiveGlyph(
    ctx: CanvasRenderingContext2D,
    glyph: GlyphStrokeData,
    boxX: number,
    boxY: number,
    progress: number,
    scratchCanvas?: HTMLCanvasElement | null
  ): void {
    if (progress <= 0) return;

    if (!glyph.chalkCanvas || !scratchCanvas) {
      if (glyph.segments.length === 0 || glyph.totalLength <= 1e-4) return;
      ctx.save();
      ctx.translate(boxX, boxY);
      ctx.strokeStyle = glyph.colorHex;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.6, glyph.fontSize * 0.1);

      let remaining = Math.max(0, Math.min(1, progress)) * glyph.totalLength;
      for (const seg of glyph.segments) {
        if (remaining <= 0) break;
        const pts = seg.points;
        if (pts.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (remaining >= seg.length) {
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
          remaining -= seg.length;
        } else {
          let drawn = 0;
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (drawn + len <= remaining) {
              ctx.lineTo(b.x, b.y);
              drawn += len;
            } else {
              const frac = len > 1e-4 ? (remaining - drawn) / len : 0;
              ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
              break;
            }
          }
          ctx.stroke();
          remaining = 0;
        }
      }
      ctx.restore();
      return;
    }

    if (
      progress >= 0.999 ||
      glyph.segments.length === 0 ||
      glyph.totalLength <= 1e-4
    ) {
      ctx.drawImage(glyph.chalkCanvas, boxX, boxY, glyph.width, glyph.height);
      return;
    }

    const cw = glyph.chalkCanvas.width;
    const ch = glyph.chalkCanvas.height;
    if (scratchCanvas.width !== cw) scratchCanvas.width = cw;
    if (scratchCanvas.height !== ch) scratchCanvas.height = ch;

    const sCtx = scratchCanvas.getContext('2d');
    if (!sCtx) {
      ctx.drawImage(glyph.chalkCanvas, boxX, boxY, glyph.width, glyph.height);
      return;
    }

    const scaleX = cw / glyph.width;
    const scaleY = ch / glyph.height;

    sCtx.save();
    try {
      sCtx.globalCompositeOperation = 'source-over';
      sCtx.setTransform(1, 0, 0, 1, 0, 0);
      sCtx.clearRect(0, 0, cw, ch);

      sCtx.scale(scaleX, scaleY);
      sCtx.strokeStyle = '#ffffff';
      sCtx.lineCap = 'round';
      sCtx.lineJoin = 'round';
      sCtx.lineWidth = Math.max(5.5, glyph.fontSize * 0.38);

      let remaining = Math.max(0, Math.min(1, progress)) * glyph.totalLength;

      for (const seg of glyph.segments) {
        if (remaining <= 0) break;
        const pts = seg.points;
        if (pts.length === 0) continue;

        sCtx.beginPath();
        sCtx.moveTo(pts[0].x, pts[0].y);

        if (remaining >= seg.length) {
          for (let i = 1; i < pts.length; i++) {
            sCtx.lineTo(pts[i].x, pts[i].y);
          }
          sCtx.stroke();
          remaining -= seg.length;
        } else {
          let drawn = 0;
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (drawn + len <= remaining) {
              sCtx.lineTo(b.x, b.y);
              drawn += len;
            } else {
              const frac = len > 1e-4 ? (remaining - drawn) / len : 0;
              sCtx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
              break;
            }
          }
          sCtx.stroke();
          remaining = 0;
        }
      }

      sCtx.setTransform(1, 0, 0, 1, 0, 0);
      sCtx.globalCompositeOperation = 'source-in';
      sCtx.drawImage(glyph.chalkCanvas, 0, 0);
    } finally {
      sCtx.globalCompositeOperation = 'source-over';
      sCtx.restore();
    }

    ctx.drawImage(scratchCanvas, boxX, boxY, glyph.width, glyph.height);
  }
  return { getGlyphStrokeData, getGlyphTipAtProgress, drawProgressiveGlyph };
})();

// --- Module: src/engine/render/themes.ts ---
const { resolveColorHex } = (() => {
  function getThemePalette(theme: ThemeId): ThemePalette {
    return presentationRegistry.getOrDefault(theme).palette;
  }
  function resolveColorHex(theme: ThemeId, color: ChalkColor): string {
    const palette = getThemePalette(theme);
    return palette.colors[color] ?? palette.colors.white;
  }
  return { resolveColorHex };
})();

// --- Module: src/engine/timeline/timelineCompiler.ts ---
const { compileTimeline } = (() => {
  function mergeBounds(rects: Rect[], pad = 0): Rect {
    if (rects.length === 0) {
      return { x: -300, y: -180, width: 600, height: 360 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const r of rects) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }
  function nodeRect(pNode: PositionedSceneNode, pad = 28): Rect {
    return {
      x: pNode.cx - pNode.width / 2 - pad,
      y: pNode.cy - pNode.height / 2 - pad,
      width: pNode.width + pad * 2,
      height: pNode.height + pad * 2,
    };
  }
  function compileTextLineItem(
    id: string,
    text: string,
    boxLeftX: number,
    boxWidth: number,
    centerY: number,
    align: TextAlign,
    indentPx: number,
    font: string,
    fontSize: number,
    color: ChalkColor,
    theme: ThemeId,
    startMs: number,
    msPerChar: number,
    flags?: { isEdgeLabel?: boolean; isGroupTitle?: boolean }
  ): CompiledTextLineItem {
    const colorHex = resolveColorHex(theme, color);
    const chars = Array.from(text);
    const glyphs = chars.map((ch) =>
      getGlyphStrokeData(ch, font, fontSize, colorHex, theme)
    );

    const totalAdvance = glyphs.reduce((acc, g) => acc + g.advanceWidth, 0);
    let cursorX: number;
    if (align === 'left') {
      cursorX = boxLeftX + indentPx;
    } else if (align === 'right') {
      cursorX = boxLeftX + boxWidth - totalAdvance;
    } else {
      cursorX = boxLeftX + (boxWidth - totalAdvance) / 2;
    }
    const lineCenterX = cursorX + totalAdvance / 2;

    let tCursor = startMs;
    const spans: CompiledGlyphSpan[] = [];
    const interCharHopMs = 16;

    const nonSpaceCount = chars.filter((c) => c.trim().length > 0).length;
    const maxLineDuration = flags?.isEdgeLabel ? 1500 : 2600;
    const rawCharMs =
      nonSpaceCount > 0
        ? Math.min(msPerChar, maxLineDuration / nonSpaceCount)
        : msPerChar;

    chars.forEach((ch, idx) => {
      const g = glyphs[idx];
      const boxX = cursorX - g.padX;
      const boxY = centerY - g.height * 0.52;
      cursorX += g.advanceWidth;

      if (ch.trim().length === 0) {
        tCursor += 18;
        return;
      }

      const strokeFactor = Math.max(0.72, Math.min(1.35, g.segments.length / 4));
      const charDur = Math.max(58, Math.round(rawCharMs * strokeFactor));
      const spanStart = tCursor;
      const spanEnd = spanStart + charDur;
      const startTip = getGlyphTipAtProgress(g, boxX, boxY, 0);
      const endTip = getGlyphTipAtProgress(g, boxX, boxY, 1);

      spans.push({
        char: ch,
        boxX,
        boxY,
        glyph: g,
        startMs: spanStart,
        endMs: spanEnd,
        startTip,
        endTip,
      });

      tCursor = spanEnd + interCharHopMs;
    });

    const endMs =
      spans.length > 0 ? spans[spans.length - 1].endMs : startMs + 140;

    return {
      kind: 'text-line',
      id,
      startMs,
      endMs,
      color,
      font,
      fontSize,
      isEdgeLabel: flags?.isEdgeLabel,
      isGroupTitle: flags?.isGroupTitle,
      centerX: lineCenterX,
      centerY,
      bgWidth: Math.max(24, totalAdvance + 16),
      bgHeight: Math.round(fontSize * 1.45),
      spans,
      startPoint:
        spans.length > 0 ? spans[0].startTip : { x: lineCenterX, y: centerY },
      endPoint:
        spans.length > 0
          ? spans[spans.length - 1].endTip
          : { x: lineCenterX, y: centerY },
    };
  }
  function strokeDurationMs(stroke: StrokePath): number {
    const speed = 440 * (stroke.speedFactor ?? 1);
    return Math.round(
      Math.max(150, Math.min(980, (stroke.totalLength / speed) * 1000))
    );
  }
  function compileTimeline(
    scene: LessonScene,
    layout: ComputedLayout
  ): CompiledTimeline {
    const layoutPlugin = layoutRegistry.getOrDefault(scene.layoutMode);
    const presentation = presentationRegistry.getOrDefault(scene.theme);
    const boardFontFamily = presentation.fontFamily;
    const rawSteps =
      scene.customSteps && scene.customSteps.length > 0
        ? scene.customSteps
        : layoutPlugin.deriveSteps?.(scene) ?? deriveTeachingSteps(scene);

    const zoneByTitle = new Map(layout.zones.map((g) => [g.title, g]));
    const drawnZones = new Set<string>();

    const compiledSteps: CompiledStep[] = [];
    const allItems: CompiledItem[] = [];
    const cumulativeRects: Rect[] = [];
    let cursorMs = 0;

    rawSteps.forEach((step, stepIndex) => {
      const startMs = cursorMs;
      const leadInMs = stepIndex === 0 ? 320 : 440;
      const drawStartMs = startMs + leadInMs;
      let itemCursor = drawStartMs;
      const items: CompiledItem[] = [];
      const stepRects: Rect[] = [];

      const pushStroke = (stroke: StrokePath, gapAfterMs = 45) => {
        const dur = strokeDurationMs(stroke);
        const item: CompiledStrokeItem = {
          kind: 'stroke',
          id: stroke.id,
          startMs: itemCursor,
          endMs: itemCursor + dur,
          color: stroke.color,
          stroke,
          startPoint: samplePointAlongStroke(stroke, 0),
          endPoint: samplePointAlongStroke(stroke, 1),
        };
        items.push(item);
        allItems.push(item);
        itemCursor = item.endMs + gapAfterMs;
      };

      // 1. Reveal any zone frame newly entered by vertices in this step
      for (const nodeId of step.nodeIds) {
        const pNode = layout.nodeMap.get(nodeId);
        if (!pNode || pNode.node.type === 'connector') continue;
        const rawZone = pNode.node.meta?.zone;
        const zoneTitle =
          typeof rawZone === 'string' && rawZone.trim()
            ? rawZone.trim()
            : '核心概念';
        const zoneBox = zoneByTitle.get(zoneTitle);
        if (zoneBox && !drawnZones.has(zoneBox.id)) {
          drawnZones.add(zoneBox.id);
          const frameStrokes = generateGroupFrameStrokes(zoneBox);
          if (frameStrokes.length > 0) {
            const fs = frameStrokes[0];
            const dur = strokeDurationMs(fs);
            const frameItem: CompiledGroupFrameItem = {
              kind: 'group-frame',
              id: fs.id,
              startMs: itemCursor,
              endMs: itemCursor + dur,
              color: fs.color,
              group: zoneBox,
              stroke: fs,
              startPoint: samplePointAlongStroke(fs, 0),
              endPoint: samplePointAlongStroke(fs, 1),
            };
            items.push(frameItem);
            allItems.push(frameItem);
            itemCursor = frameItem.endMs + 55;
          }

          const titleFont = `700 16px ${boardFontFamily}`;
          const titleItem = compileTextLineItem(
            `${zoneBox.id}-title`,
            zoneBox.title,
            zoneBox.x + 18,
            Math.max(80, zoneBox.width - 36),
            zoneBox.y + 20,
            'left',
            0,
            titleFont,
            16,
            zoneBox.color,
            scene.theme,
            itemCursor,
            82,
            { isGroupTitle: true }
          );
          items.push(titleItem);
          allItems.push(titleItem);
          itemCursor = titleItem.endMs + 95;
          stepRects.push({
            x: zoneBox.x,
            y: zoneBox.y,
            width: zoneBox.width,
            height: zoneBox.height,
          });
        }
      }

      const compilePositionedNode = (curr: PositionedSceneNode, insideCard = false) => {
        if (curr.node.visible === false) return;

        if (curr.node.type === 'shape') {
          const strokes = generateShapeStrokes(curr);
          strokes.forEach((s, idx) => {
            pushStroke(s, idx === strokes.length - 1 ? 65 : 34);
          });
          return;
        }

        if (curr.node.type === 'connector') {
          const cStrokes = generateConnectorStrokes(curr, curr.node.color);
          cStrokes.forEach((cs, idx) => {
            pushStroke(cs, idx === cStrokes.length - 1 ? 65 : 32);
          });

          if (curr.node.label && curr.labelPoint) {
            const edgeFont = `400 14px ${boardFontFamily}`;
            const labelItem = compileTextLineItem(
              `edge-label-${curr.id}`,
              curr.node.label,
              curr.labelPoint.x - 100,
              200,
              curr.labelPoint.y - 2,
              'center',
              0,
              edgeFont,
              14,
              curr.node.color,
              scene.theme,
              itemCursor,
              82,
              { isEdgeLabel: true }
            );
            items.push(labelItem);
            allItems.push(labelItem);
            itemCursor = labelItem.endMs + 95;
          }
          return;
        }

        if (curr.node.type === 'text') {
          if (curr.measured.type !== 'text') return;
          const m = curr.measured;
          const weight = curr.node.fontWeight ?? 400;
          const lineFont = `${weight} ${m.fontSize}px ${boardFontFamily}`;
          const boxLeftX = curr.cx - curr.width / 2;
          const msPerChar = m.fontSize >= 20 ? 122 : 88;
          const textColor: ChalkColor =
            insideCard && presentation.palette.preferNeutralCardTitle
              ? 'white'
              : curr.node.color;
          let yCursor = curr.cy - m.height / 2;

          m.lines.forEach((line, lineIdx) => {
            const lineCy = yCursor + m.lineHeight / 2;
            const lineIndent = lineIdx === 0 ? m.indentPx : 0;
            const tItem = compileTextLineItem(
              `${curr.id}-line-${lineIdx}`,
              line,
              boxLeftX,
              curr.width,
              lineCy,
              m.align,
              lineIndent,
              lineFont,
              m.fontSize,
              textColor,
              scene.theme,
              itemCursor,
              msPerChar
            );
            items.push(tItem);
            allItems.push(tItem);
            itemCursor = tItem.endMs + 40;
            yCursor += m.lineHeight;
          });
          return;
        }

        if (curr.node.type === 'group') {
          const nextInsideCard = insideCard || curr.node.meta?.isCard === true;
          for (const child of curr.children ?? []) {
            compilePositionedNode(child, nextInsideCard);
          }
          return;
        }

        if (isCustomSceneNode(curr.node)) {
          const kind =
            curr.measured.type === 'custom'
              ? curr.measured.kind
              : resolveCustomNodeKind(curr.node);
          const plugin = sceneNodeRegistry.get(kind);
          if (plugin?.compile) {
            let customTextSeq = 0;
            const nodeColor = curr.node.color;
            plugin.compile(curr, {
              theme: scene.theme,
              fontFamily: boardFontFamily,
              pushStroke,
              pushTextLine: (input) => {
                const fontSize = input.fontSize ?? 18;
                const weight = input.fontWeight ?? 400;
                const lineFontFamily = input.fontFamily ?? boardFontFamily;
                const lineFont = `${weight} ${fontSize}px ${lineFontFamily}`;
                const tItem = compileTextLineItem(
                  input.id ?? `${curr.id}-text-${customTextSeq++}`,
                  input.text,
                  input.boxLeftX,
                  input.boxWidth,
                  input.centerY,
                  input.align ?? 'center',
                  input.indentPx ?? 0,
                  lineFont,
                  fontSize,
                  input.color ?? nodeColor,
                  scene.theme,
                  itemCursor,
                  input.msPerChar ?? (fontSize >= 20 ? 122 : 88)
                );
                items.push(tItem);
                allItems.push(tItem);
                itemCursor = tItem.endMs + (input.gapAfterMs ?? 40);
              },
            });
            return;
          }
          for (const child of curr.children ?? []) {
            compilePositionedNode(child);
          }
        }
      };

      // 2. Compile every node listed in this step in exact step order
      for (const nodeId of step.nodeIds) {
        const pNode = layout.nodeMap.get(nodeId);
        if (!pNode || pNode.node.visible === false) continue;

        if (
          pNode.node.type === 'connector' &&
          pNode.routedPoints &&
          pNode.routedPoints.length > 0
        ) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const pt of pNode.routedPoints) {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
          }
          stepRects.push({
            x: minX - 24,
            y: minY - 24,
            width: maxX - minX + 48,
            height: maxY - minY + 48,
          });
        } else {
          const nRect = nodeRect(pNode, 36);
          stepRects.push(nRect);
          cumulativeRects.push(nRect);
        }

        compilePositionedNode(pNode);
      }

      const drawEndMs =
        items.length > 0 ? items[items.length - 1].endMs : drawStartMs + 200;
      const pauseMs = step.pauseMs ?? 420;
      const endMs = drawEndMs + pauseMs;

      const focusBounds =
        stepRects.length > 0 ? mergeBounds(stepRects, 24) : layout.bounds;
      const cumulativeBounds =
        cumulativeRects.length > 0
          ? mergeBounds(cumulativeRects, 36)
          : layout.bounds;

      compiledSteps.push({
        stepIndex,
        step,
        startMs,
        drawStartMs,
        drawEndMs,
        endMs,
        items,
        focusBounds,
        cumulativeBounds,
      });

      cursorMs = endMs;
    });

    const outroStartMs = cursorMs;
    const totalDurationMs =
      compiledSteps.length > 0 ? outroStartMs + 1800 : 1200;

    return {
      steps: compiledSteps,
      allItems,
      outroStartMs,
      totalDurationMs,
      layout,
      fullBounds: layout.bounds,
    };
  }
  return { compileTimeline };
})();

// --- Module: src/engine/timeline/timelineEvaluator.ts ---
const { evaluateTimelineAt } = (() => {
  function easeInOut(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
  }
  function evaluatePenForTextLine(
    item: CompiledTextLineItem,
    tMs: number
  ): { x: number; y: number; penDown: boolean; lift: number; velocity: number } {
    if (item.spans.length === 0) {
      return {
        x: item.centerX,
        y: item.centerY,
        penDown: false,
        lift: 4,
        velocity: 0,
      };
    }

    for (let i = 0; i < item.spans.length; i++) {
      const span = item.spans[i];
      if (tMs <= span.endMs) {
        if (tMs >= span.startMs) {
          const p =
            (tMs - span.startMs) / Math.max(1, span.endMs - span.startMs);
          const pt = getGlyphTipAtProgress(span.glyph, span.boxX, span.boxY, p);
          return {
            x: pt.x,
            y: pt.y,
            penDown: true,
            lift: 0,
            velocity: 0.9,
          };
        }
        // Hop between previous char end and current char start
        const prevEnd = i > 0 ? item.spans[i - 1].endTip : span.startTip;
        const prevMs = i > 0 ? item.spans[i - 1].endMs : item.startMs;
        const u = easeInOut(
          (tMs - prevMs) / Math.max(1, span.startMs - prevMs)
        );
        return {
          x: prevEnd.x + (span.startTip.x - prevEnd.x) * u,
          y: prevEnd.y + (span.startTip.y - prevEnd.y) * u,
          penDown: false,
          lift: Math.sin(u * Math.PI) * 5.5,
          velocity: 0.3,
        };
      }
    }

    const last = item.spans[item.spans.length - 1];
    return {
      x: last.endTip.x,
      y: last.endTip.y,
      penDown: false,
      lift: 3,
      velocity: 0,
    };
  }
  function evaluateTimelineAt(
    timeline: CompiledTimeline,
    rawTMs: number
  ): TimelineEvalState {
    const tMs = Math.max(0, Math.min(timeline.totalDurationMs, rawTMs));
    const itemProgress = new Map<string, number>();

    let activeStepIndex = Math.max(0, timeline.steps.length - 1);
    for (let i = 0; i < timeline.steps.length; i++) {
      if (tMs < timeline.steps[i].endMs) {
        activeStepIndex = i;
        break;
      }
    }

    const allItems = timeline.allItems;
    let activeItemIdx = -1;

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (tMs >= item.endMs) {
        itemProgress.set(item.id, 1);
      } else if (tMs <= item.startMs) {
        itemProgress.set(item.id, 0);
      } else {
        const p = (tMs - item.startMs) / Math.max(1, item.endMs - item.startMs);
        itemProgress.set(item.id, p);
        activeItemIdx = i;
      }
    }

    // Default hidden pen if empty timeline
    if (allItems.length === 0) {
      return {
        tMs,
        activeStepIndex: 0,
        itemProgress,
        pen: {
          visible: false,
          worldX: 0,
          worldY: 0,
          penDown: false,
          lift: 0,
          color: 'white',
          velocity: 0,
          seed: 0,
          alpha: 0,
        },
      };
    }

    // Case 1: Actively drawing an item
    if (activeItemIdx !== -1) {
      const item = allItems[activeItemIdx];
      const p = itemProgress.get(item.id) ?? 0;

      if (item.kind === 'text-line') {
        const tip = evaluatePenForTextLine(item, tMs);
        return {
          tMs,
          activeStepIndex,
          itemProgress,
          pen: {
            visible: true,
            worldX: tip.x,
            worldY: tip.y,
            penDown: tip.penDown,
            lift: tip.lift,
            color: item.color,
            velocity: tip.velocity,
            seed: Math.floor(tMs / 35),
            alpha: 1,
          },
        };
      }

      const pt = samplePointAlongStroke(item.stroke, p);
      const vel = Math.sin(p * Math.PI) * 0.65 + 0.35;
      return {
        tMs,
        activeStepIndex,
        itemProgress,
        pen: {
          visible: true,
          worldX: pt.x,
          worldY: pt.y,
          penDown: true,
          lift: 0,
          color: item.color,
          velocity: vel,
          seed: Math.floor(tMs / 35),
          alpha: 1,
        },
      };
    }

    // Case 2: Before very first item starts (lead-in)
    const firstItem = allItems[0];
    if (tMs < firstItem.startMs) {
      const u = easeInOut(tMs / Math.max(1, firstItem.startMs));
      return {
        tMs,
        activeStepIndex: 0,
        itemProgress,
        pen: {
          visible: true,
          worldX: firstItem.startPoint.x + (1 - u) * 28,
          worldY: firstItem.startPoint.y + (1 - u) * 24,
          penDown: false,
          lift: (1 - u) * 14,
          color: firstItem.color,
          velocity: 0.15,
          seed: 1,
          alpha: u,
        },
      };
    }

    // Case 3: Outro after all drawing completed
    const lastItem = allItems[allItems.length - 1];
    if (tMs >= lastItem.endMs) {
      const sinceEnd = tMs - lastItem.endMs;
      const retreatU = easeInOut(Math.min(1, sinceEnd / 550));
      const alpha = Math.max(0, 1 - retreatU);
      return {
        tMs,
        activeStepIndex,
        itemProgress,
        pen: {
          visible: alpha > 0.02,
          worldX: lastItem.endPoint.x + retreatU * 48,
          worldY: lastItem.endPoint.y + retreatU * 40,
          penDown: false,
          lift: 8 + retreatU * 18,
          color: lastItem.color,
          velocity: 0,
          seed: 0,
          alpha,
        },
      };
    }

    // Case 4: Pen-up travel arc between previous completed item and next upcoming item
    let prevIdx = 0;
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].endMs <= tMs) {
        prevIdx = i;
      } else {
        break;
      }
    }
    const prevItem = allItems[prevIdx];
    const nextItem = allItems[Math.min(allItems.length - 1, prevIdx + 1)];
    const gapSpan = Math.max(1, nextItem.startMs - prevItem.endMs);
    const rawU = (tMs - prevItem.endMs) / gapSpan;

    const moveWindow = Math.min(gapSpan, 360);
    const moveStart = nextItem.startMs - moveWindow;

    if (tMs < moveStart) {
      return {
        tMs,
        activeStepIndex,
        itemProgress,
        pen: {
          visible: true,
          worldX: prevItem.endPoint.x + 8,
          worldY: prevItem.endPoint.y + 8,
          penDown: false,
          lift: 10,
          color: nextItem.color,
          velocity: 0,
          seed: 0,
          alpha: 0.92,
        },
      };
    }

    const u = easeInOut((tMs - moveStart) / Math.max(1, moveWindow));
    const dist = Math.hypot(
      nextItem.startPoint.x - prevItem.endPoint.x,
      nextItem.startPoint.y - prevItem.endPoint.y
    );
    const maxLift = Math.min(24, Math.max(6, dist * 0.06));
    const startX = gapSpan > 360 ? prevItem.endPoint.x + 8 : prevItem.endPoint.x;
    const startY = gapSpan > 360 ? prevItem.endPoint.y + 8 : prevItem.endPoint.y;

    return {
      tMs,
      activeStepIndex,
      itemProgress,
      pen: {
        visible: true,
        worldX: startX + (nextItem.startPoint.x - startX) * u,
        worldY: startY + (nextItem.startPoint.y - startY) * u,
        penDown: false,
        lift: Math.sin(rawU * Math.PI) * maxLift,
        color: nextItem.color,
        velocity: 0.2,
        seed: 0,
        alpha: 1,
      },
    };
  }
  return { evaluateTimelineAt };
})();

// --- Module: src/engine/timeline/projectTimeline.ts ---
const { compileProjectTimeline, evaluateProjectAt } = (() => {
  let sceneCompileCache = new WeakMap<LessonScene, CompiledTimeline>();
  function clearSceneCompileCache(): void {
    sceneCompileCache = new WeakMap<LessonScene, CompiledTimeline>();
  }
  layoutRegistry.subscribe(clearSceneCompileCache);
  shapeRegistry.subscribe(clearSceneCompileCache);
  presentationRegistry.subscribe(clearSceneCompileCache);
  glyphProviderRegistry.subscribe(clearSceneCompileCache);
  sceneNodeRegistry.subscribe(clearSceneCompileCache);
  transitionRegistry.subscribe(clearSceneCompileCache);
  function compileProjectTimeline(
    project: LessonProject
  ): CompiledProjectTimeline {
    const segments: CompiledSceneSegment[] = [];
    let cursorMs = 0;

    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      let timeline = sceneCompileCache.get(scene);
      if (!timeline) {
        const layout = computeDiagramLayout(scene);
        timeline = compileTimeline(scene, layout);
        sceneCompileCache.set(scene, timeline);
      }
      const startMs = cursorMs;
      const endMs = startMs + timeline.totalDurationMs;
      cursorMs = endMs;

      let transitionOut: CompiledTransitionWindow | undefined;
      if (i < project.scenes.length - 1) {
        const configuredId = scene.transitionOut?.type ?? 'chalkboard-eraser';
        const plugin = transitionRegistry.getOrDefault(configuredId);
        const durationMs = Math.max(
          0,
          scene.transitionOut?.durationMs ?? plugin.defaultDurationMs
        );
        if (durationMs > 0) {
          transitionOut = {
            id: plugin.id,
            name: plugin.name,
            durationMs,
            startMs: cursorMs,
            endMs: cursorMs + durationMs,
            fromSceneIndex: i,
            toSceneIndex: i + 1,
          };
          cursorMs += durationMs;
        }
      }

      segments.push({
        sceneIndex: i,
        scene,
        timeline,
        startMs,
        endMs,
        transitionOut,
      });
    }

    return {
      project,
      segments,
      totalDurationMs: cursorMs,
    };
  }
  function evaluateProjectAt(
    compiled: CompiledProjectTimeline,
    rawGlobalTMs: number
  ): ProjectEvalState {
    const globalTMs = Math.max(
      0,
      Math.min(compiled.totalDurationMs, rawGlobalTMs)
    );
    const { segments } = compiled;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;

      if (globalTMs < seg.endMs || (isLast && globalTMs <= seg.endMs)) {
        return {
          kind: 'scene',
          sceneIndex: i,
          segment: seg,
          localTMs: Math.max(
            0,
            Math.min(seg.timeline.totalDurationMs, globalTMs - seg.startMs)
          ),
          globalTMs,
        };
      }

      if (seg.transitionOut && globalTMs < seg.transitionOut.endMs) {
        const nextSeg = segments[i + 1];
        if (nextSeg) {
          const progress =
            (globalTMs - seg.transitionOut.startMs) /
            Math.max(1, seg.transitionOut.durationMs);
          return {
            kind: 'transition',
            fromSegment: seg,
            toSegment: nextSeg,
            transitionId: seg.transitionOut.id,
            transitionName: seg.transitionOut.name,
            progress: Math.max(0, Math.min(1, progress)),
            globalTMs,
          };
        }
      }
    }

    // Fallback (unreachable when segments.length > 0)
    const fallback = segments[Math.max(0, segments.length - 1)];
    return {
      kind: 'scene',
      sceneIndex: Math.max(0, segments.length - 1),
      segment: fallback,
      localTMs: fallback ? fallback.timeline.totalDurationMs : 0,
      globalTMs,
    };
  }
  function collectGlobalStepStarts(
    compiled: CompiledProjectTimeline
  ): number[] {
    const starts: number[] = [];
    for (const seg of compiled.segments) {
      if (seg.timeline.steps.length === 0) {
        starts.push(seg.startMs);
      } else {
        for (const s of seg.timeline.steps) {
          starts.push(seg.startMs + s.startMs);
        }
      }
    }
    return starts;
  }
  return { compileProjectTimeline, evaluateProjectAt };
})();

// --- Module: src/engine/subtitle/subtitleEngine.ts ---
const { getActiveSubtitleAt, generateAutoSubtitles, serializeSubtitlesToSrt, drawSubtitleOverlay } = (() => {
  function getActiveSubtitleAt(
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
  function generateAutoSubtitles(
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
  function formatSrtTimestamp(rawMs: number): string {
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
  function parseSrtTimestamp(ts: string): number {
    const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
    if (!m) return 0;
    return (
      Number(m[1]) * 3_600_000 +
      Number(m[2]) * 60_000 +
      Number(m[3]) * 1000 +
      Number(m[4])
    );
  }
  function serializeSubtitlesToSrt(cues: SubtitleCue[]): string {
    return cues
      .map(
        (cue, idx) =>
          `${idx + 1}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(
            cue.endMs
          )}\n${cue.text.trim()}`
      )
      .join('\n\n');
  }
  function parseSrtToSubtitles(srt: string): SubtitleCue[] {
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
  function drawSubtitleOverlay(
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
  return { getActiveSubtitleAt, generateAutoSubtitles, serializeSubtitlesToSrt, drawSubtitleOverlay };
})();

// --- Module: src/engine/parser/projectScript.ts ---
const { parseProjectScript, generateScriptSpec } = (() => {
  const SCENE_HEADER_REGEX = /^===\s*scene(?::\s*(.+?))?\s*===$/i;
  const SUBTITLES_HEADER_REGEX = /^===\s*subtitles\s*===$/i;
  const SCENE_META_KEYS = new Set([
    'title',
    'theme',
    'layout',
    'camera',
    'hand',
    'transition',
    'transitionduration',
    'transition-duration',
  ]);
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
  function splitSceneSections(lines: string[]): {
    sections: RawSceneSection[];
    subtitleLines: string[];
  } {
    const sections: RawSceneSection[] = [];
    const subtitleLines: string[] = [];
    let current: RawSceneSection | null = null;
    const prelude: string[] = [];
    let inSubtitles = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (SUBTITLES_HEADER_REGEX.test(trimmed)) {
        if (current) {
          sections.push(current);
          current = null;
        }
        inSubtitles = true;
        continue;
      }
      const match = trimmed.match(SCENE_HEADER_REGEX);
      if (match) {
        inSubtitles = false;
        if (current) {
          sections.push(current);
        }
        current = {
          explicitTitle: match[1]?.trim() || undefined,
          lines: [],
        };
      } else if (inSubtitles) {
        subtitleLines.push(line);
      } else if (current) {
        current.lines.push(line);
      } else {
        prelude.push(line);
      }
    }

    if (current) {
      sections.push(current);
      return { sections, subtitleLines };
    }

    if (sections.length > 0) {
      return { sections, subtitleLines };
    }

    // Fallback when no `=== scene ===` delimiter is present: single-scene script
    return { sections: [{ lines: prelude }], subtitleLines };
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
  function parseProjectScript(
    raw: string,
    options?: ParseProjectScriptOptions
  ): ParseProjectScriptResult {
    const warnings: string[] = [];
    const cleaned = stripMarkdownFence(raw).replace(/\r\n/g, '\n');
    const lines = cleaned.split('\n');

    const { meta: projectMeta, restLines } = splitTopFrontmatter(lines);
    const { sections: rawSections, subtitleLines } =
      splitSceneSections(restLines);

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
      const rawTransDur = meta.transitionduration ?? meta['transition-duration'];
      const parsedTransDur =
        rawTransDur !== undefined &&
        Number.isFinite(Number(rawTransDur)) &&
        Number(rawTransDur) >= 0
          ? Math.round(Number(rawTransDur))
          : undefined;
      const transitionConfig = {
        type: transitionType,
        ...(parsedTransDur !== undefined ? { durationMs: parsedTransDur } : {}),
      };

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
        transitionOut: transitionConfig,
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
        transitionOut: transitionConfig,
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

    const customSubtitles: SubtitleCue[] = [];
    for (const rawSubLine of subtitleLines) {
      const trimmedSub = rawSubLine.trim();
      if (!trimmedSub || trimmedSub.startsWith('//')) continue;
      const m = trimmedSub.match(
        /^(\d+(?:\.\d+)?)\s*->\s*(\d+(?:\.\d+)?)\s*[:：]\s*(.+)$/
      );
      if (m) {
        customSubtitles.push({
          id: `sub-${customSubtitles.length + 1}`,
          startMs: Math.round(Number(m[1])),
          endMs: Math.round(Number(m[2])),
          text: m[3].trim().replace(/\\n/g, '\n'),
        });
      } else {
        warnings.push(`Invalid subtitle cue syntax: "${trimmedSub}"`);
      }
    }

    if (customSubtitles.length > 0) {
      project = {
        ...project,
        subtitles: customSubtitles,
        showSubtitles: true,
      };
    } else if (autoSubtitles) {
      const compiled = compileProjectTimeline(project);
      project = {
        ...project,
        subtitles: generateAutoSubtitles(compiled),
        showSubtitles: true,
      };
    }

    return { project, warnings, autoSubtitles };
  }
  function serializeProjectScript(project: LessonProject): string {
    const existingSubtitles = project.subtitles ?? [];
    let subtitleMode: 'auto' | 'custom' | 'off' = 'off';
    if (existingSubtitles.length > 0) {
      const autoCues = generateAutoSubtitles(compileProjectTimeline(project));
      const matchesAuto =
        autoCues.length === existingSubtitles.length &&
        autoCues.every(
          (c, idx) =>
            c.startMs === existingSubtitles[idx].startMs &&
            c.endMs === existingSubtitles[idx].endMs &&
            c.text === existingSubtitles[idx].text
        );
      subtitleMode = matchesAuto ? 'auto' : 'custom';
    }

    const lines: string[] = [
      '---',
      `title: ${project.title}`,
      `aspectRatio: ${project.aspectRatio}`,
      `subtitles: ${subtitleMode}`,
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
      if (scene.transitionOut?.durationMs !== undefined) {
        lines.push(
          `transitionDuration: ${Math.round(scene.transitionOut.durationMs)}`
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

    if (subtitleMode === 'custom' && existingSubtitles.length > 0) {
      lines.push('=== subtitles ===');
      for (const cue of existingSubtitles) {
        lines.push(
          `${Math.round(cue.startMs)} -> ${Math.round(cue.endMs)} : ${cue.text
            .replace(/\r?\n/g, '\\n')
            .trim()}`
        );
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }
  function generateScriptSpec(): string {
    const themes = presentationRegistry.list();
    const layouts = layoutRegistry.list();
    const shapes = shapeRegistry.list();
    const sceneNodes = sceneNodeRegistry.list();
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
      `- **shape**: ${shapes.map((s) => `\`${s.id}\` (${s.name})`).join(', ')}, \`none\` (Frameless)`,
      ...(sceneNodes.length > 0
        ? [
            `- **scene-node**: ${sceneNodes
              .map((sn) => `\`${sn.id}\` (${sn.name})`)
              .join(', ')}`,
            ...sceneNodes
              .filter((sn) => sn.propFields && sn.propFields.length > 0)
              .map((sn) => {
                const fieldsSummary = sn
                  .propFields!.map((f) => {
                    const fmt = f.format && f.format !== 'plain' ? `/${f.format}` : '';
                    const range =
                      f.min !== undefined || f.max !== undefined
                        ? ` [${f.min ?? ''}..${f.max ?? ''}]`
                        : '';
                    return `\`${f.key}\`: ${f.type}${fmt}${range}`;
                  })
                  .join(', ');
                return `  - \`[node:${sn.id}]\` props: ${fieldsSummary}`;
              }),
          ]
        : []),
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
  return { parseProjectScript, generateScriptSpec };
})();

// --- Module: src/engine/camera/cameraDirector.ts ---
const { evaluateCameraAt } = (() => {
  function evaluateCameraAt(
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
  return { evaluateCameraAt };
})();

// --- Module: src/engine/render/chalkHand.ts ---
const { drawWritingHand } = (() => {
  function drawWritingHand(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    themeOrPlugin: ThemeId | PresentationPlugin,
    colorHex: string,
    lift: number,
    alpha: number,
    handStyle: HandStyle,
    motion: WritingHandMotion = {}
  ): void {
    const presentation =
      typeof themeOrPlugin === 'string'
        ? presentationRegistry.getOrDefault(themeOrPlugin)
        : themeOrPlugin;

    handRegistry.getOrDefault(handStyle).draw({
      ctx,
      screenX,
      screenY,
      presentation,
      colorHex,
      lift,
      alpha,
      penDown: motion.penDown ?? false,
      velocity: motion.velocity ?? 0,
      tMs: motion.tMs ?? 0,
    });
  }
  return { drawWritingHand };
})();

// --- Module: src/engine/render/sceneRenderer.ts ---
const { worldToScreen, getActiveCamera, renderSceneFrame } = (() => {
  let sharedScratchCanvas: HTMLCanvasElement | null = null;
  function getScratchCanvas(): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    if (!sharedScratchCanvas) {
      sharedScratchCanvas = document.createElement('canvas');
    }
    return sharedScratchCanvas;
  }
  function screenToWorld(
    screenX: number,
    screenY: number,
    viewportW: number,
    viewportH: number,
    cam: CameraState
  ): Point {
    return {
      x: (screenX - viewportW / 2) / cam.zoom + cam.cx,
      y: (screenY - viewportH / 2) / cam.zoom + cam.cy,
    };
  }
  function worldToScreen(
    worldX: number,
    worldY: number,
    viewportW: number,
    viewportH: number,
    cam: CameraState
  ): Point {
    return {
      x: (worldX - cam.cx) * cam.zoom + viewportW / 2,
      y: (worldY - cam.cy) * cam.zoom + viewportH / 2,
    };
  }
  function getActiveCamera(
    scene: LessonScene,
    timeline: CompiledTimeline,
    tMs: number,
    viewportW: number,
    viewportH: number,
    manualCamera?: CameraState | null,
    activePen?: CameraPenHint
  ): CameraState {
    if (manualCamera) return manualCamera;
    return evaluateCameraAt(
      timeline,
      tMs,
      viewportW,
      viewportH,
      scene.cameraMode,
      activePen
    );
  }
  function drawStrokeInteriorFill(
    ctx: CanvasRenderingContext2D,
    stroke: StrokePath,
    colorHex: string,
    progress: number,
    baseFillOpacity: number,
    palette: ThemePalette,
    allowShadow: boolean
  ): void {
    if (!stroke.fillOpacity || stroke.fillOpacity <= 0 || stroke.points.length < 3) {
      return;
    }
    const fillReveal = Math.max(0, Math.min(1, (progress - 0.55) / 0.45));
    const isSurfaceCard = allowShadow && Boolean(stroke.surfaceShadow);
    const effectiveBaseOpacity = isSurfaceCard
      ? baseFillOpacity
      : allowShadow
      ? 0.22
      : baseFillOpacity;
    const alpha = effectiveBaseOpacity * stroke.fillOpacity * fillReveal;
    if (alpha <= 0.005) return;

    const tracePath = () => {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.closePath();
    };

    if (isSurfaceCard && palette.cardShadow) {
      ctx.save();
      ctx.translate(palette.cardShadow.dx, palette.cardShadow.dy);
      ctx.globalAlpha = fillReveal;
      ctx.fillStyle = palette.cardShadow.color;
      tracePath();
      ctx.fill();
      ctx.restore();
    }

    const fillStyle =
      isSurfaceCard && palette.cardFillColors?.[stroke.color]
        ? palette.cardFillColors[stroke.color]!
        : colorHex;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fillStyle;
    tracePath();
    ctx.fill();
    ctx.restore();
  }
  function renderSceneFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: LessonScene,
    timeline: CompiledTimeline,
    tMs: number,
    options: RenderOptions = {}
  ): void {
    const presentation = presentationRegistry.getOrDefault(scene.theme);
    const palette = presentation.palette;
    const evalState = evaluateTimelineAt(timeline, tMs);
    const cam = getActiveCamera(
      scene,
      timeline,
      tMs,
      width,
      height,
      options.manualCamera,
      evalState.pen
    );

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Presentation surface background
    presentation.drawSurface(ctx, width, height);

    // 2. Camera transform (world space)
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cx, -cam.cy);

    const scratch = getScratchCanvas();
    const zoneFillOpacity = palette.zoneFillOpacity ?? 0.05;
    const cardFillOpacity = palette.cardFillOpacity ?? 0.085;

    // Pass A: Group frames first so node content sits cleanly above them
    for (const item of timeline.allItems) {
      if (item.kind !== 'group-frame') continue;
      const p = evalState.itemProgress.get(item.id) ?? 0;
      if (p <= 0) continue;
      const fillHex = palette.colors[item.stroke.color] ?? palette.colors.white;
      drawStrokeInteriorFill(
        ctx,
        item.stroke,
        fillHex,
        p,
        zoneFillOpacity,
        palette,
        false
      );
      presentation.drawStroke(ctx, item.stroke, p);
    }

    // Pass B: Strokes (edges + node shapes)
    for (const item of timeline.allItems) {
      if (item.kind !== 'stroke') continue;
      const p = evalState.itemProgress.get(item.id) ?? 0;
      if (p <= 0) continue;
      const fillHex = palette.colors[item.stroke.color] ?? palette.colors.white;
      drawStrokeInteriorFill(
        ctx,
        item.stroke,
        fillHex,
        p,
        cardFillOpacity,
        palette,
        true
      );
      presentation.drawStroke(ctx, item.stroke, p);
    }

    // Pass C: Text lines (edge label pills, group titles, node titles & subtitles)
    for (const item of timeline.allItems) {
      if (item.kind !== 'text-line') continue;
      const lineProgress = evalState.itemProgress.get(item.id) ?? 0;
      if (lineProgress <= 0) continue;

      if (item.isEdgeLabel || item.isGroupTitle) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, lineProgress * 3.5);
        ctx.fillStyle = palette.labelPillBg;
        ctx.strokeStyle = palette.labelPillBorder;
        ctx.lineWidth = 1;
        const rx = item.centerX - item.bgWidth / 2;
        const ry = item.centerY - item.bgHeight / 2;
        ctx.beginPath();
        ctx.roundRect(rx, ry, item.bgWidth, item.bgHeight, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

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
        drawProgressiveGlyph(
          ctx,
          span.glyph,
          span.boxX,
          span.boxY,
          charP,
          scratch
        );
      }
    }

    // Pass D: Optional presentation particles (e.g. falling chalk dust)
    if (
      presentation.drawParticles &&
      scene.handStyle !== 'hidden' &&
      evalState.pen.visible &&
      evalState.pen.penDown
    ) {
      presentation.drawParticles(
        ctx,
        evalState.pen.worldX,
        evalState.pen.worldY,
        resolveColorHex(scene.theme, evalState.pen.color),
        evalState.tMs,
        evalState.pen.seed
      );
    }

    // Pass E: Subtle UI hover/selection overlays (strictly suppressed during video export)
    if (options.showUiOverlays) {
      const highlightTargets: Array<{ id: string; isSelected: boolean }> = [];
      if (options.hoveredNodeId && options.hoveredNodeId !== options.selectedNodeId) {
        highlightTargets.push({ id: options.hoveredNodeId, isSelected: false });
      }
      if (options.selectedNodeId) {
        highlightTargets.push({ id: options.selectedNodeId, isSelected: true });
      }

      for (const target of highlightTargets) {
        const pNode = timeline.layout.nodeMap.get(target.id);
        if (!pNode) continue;

        ctx.save();
        ctx.strokeStyle = target.isSelected
          ? 'rgba(243, 201, 105, 0.85)'
          : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = (target.isSelected ? 2.2 : 1.5) / cam.zoom;
        ctx.setLineDash([6 / cam.zoom, 5 / cam.zoom]);
        const pad = 10;
        ctx.beginPath();
        ctx.roundRect(
          pNode.cx - pNode.width / 2 - pad,
          pNode.cy - pNode.height / 2 - pad,
          pNode.width + pad * 2,
          pNode.height + pad * 2,
          12
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore(); // exit world transform

    // 3. Screen-space writing hand anchored to transformed pen tip
    if (evalState.pen.visible) {
      const tipScreen = worldToScreen(
        evalState.pen.worldX,
        evalState.pen.worldY,
        width,
        height,
        cam
      );
      drawWritingHand(
        ctx,
        tipScreen.x,
        tipScreen.y,
        presentation,
        resolveColorHex(scene.theme, evalState.pen.color),
        evalState.pen.lift,
        evalState.pen.alpha,
        scene.handStyle,
        {
          penDown: evalState.pen.penDown,
          velocity: evalState.pen.velocity,
          tMs: evalState.tMs,
        }
      );
    }

    ctx.restore();
  }
  return { worldToScreen, getActiveCamera, renderSceneFrame };
})();

// --- Module: src/engine/render/frameSnapshot.ts ---
const { evaluateSceneFrameSnapshot, evaluateProjectFrameSnapshot, renderSceneFrameSvg, renderProjectFrameSvg } = (() => {
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
  function evaluateSceneFrameSnapshot(
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
        seed: evalState.pen.seed,
      },
      subtitleText,
    };
  }
  function evaluateProjectFrameSnapshot(
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
      if (fillSvg) parts.push(fillSvg);
      const svg = renderStrokeSvg(gf.stroke, gf.colorHex, gf.progress, theme);
      if (svg) parts.push(svg);
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
      if (fillSvg) parts.push(fillSvg);
      const svg = renderStrokeSvg(st.stroke, st.colorHex, st.progress, theme);
      if (svg) parts.push(svg);
    }

    const maskDefs: string[] = [];
    const textEls: string[] = [];
    let maskSeq = 0;

    for (const line of snap.textLines) {
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
            textEls.push(
              `<text x="${midX}" y="${ty}" fill="${escColor}" font-family="${escFont}" font-size="${first.fontSize.toFixed(
                1
              )}" font-weight="${boldWeight}" text-anchor="middle" dominant-baseline="central">${escapeXml(
                runText
              )}</text>`
            );
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
  function renderSnapshotToSvg(snapshot: EvaluatedFrameSnapshot): string {
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
  function renderSceneFrameSvg(
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
  function renderProjectFrameSvg(
    compiledProject: CompiledProjectTimeline,
    globalTMs: number,
    width: number,
    height: number
  ): string {
    return renderSnapshotToSvg(
      evaluateProjectFrameSnapshot(compiledProject, globalTMs, width, height)
    );
  }
  return { evaluateSceneFrameSnapshot, evaluateProjectFrameSnapshot, renderSceneFrameSvg, renderProjectFrameSvg };
})();

// --- Module: src/engine/render/projectRenderer.ts ---
const { renderProjectFrame } = (() => {
  const fromBufferSlot: EndpointBufferSlot = { canvas: null, key: null };
  const toBufferSlot: EndpointBufferSlot = { canvas: null, key: null };
  function clearTransitionBufferCache(): void {
    fromBufferSlot.key = null;
    toBufferSlot.key = null;
  }
  presentationRegistry.subscribe(clearTransitionBufferCache);
  handRegistry.subscribe(clearTransitionBufferCache);
  cameraRegistry.subscribe(clearTransitionBufferCache);
  shapeRegistry.subscribe(clearTransitionBufferCache);
  glyphProviderRegistry.subscribe(clearTransitionBufferCache);
  layoutRegistry.subscribe(clearTransitionBufferCache);
  sceneNodeRegistry.subscribe(clearTransitionBufferCache);
  function matchesCacheKey(
    cached: EndpointCacheKey | null,
    timeline: CompiledTimeline,
    scene: LessonScene,
    pixelW: number,
    pixelH: number,
    dpr: number
  ): boolean {
    return (
      cached !== null &&
      cached.timeline === timeline &&
      cached.scene === scene &&
      cached.pixelW === pixelW &&
      cached.pixelH === pixelH &&
      cached.dpr === dpr
    );
  }
  function getOrRenderEndpointBuffer(
    slot: EndpointBufferSlot,
    scene: LessonScene,
    timeline: CompiledTimeline,
    localTMs: number,
    width: number,
    height: number,
    pixelW: number,
    pixelH: number,
    dpr: number
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const safeW = Math.max(1, Math.round(pixelW));
    const safeH = Math.max(1, Math.round(pixelH));
    if (!slot.canvas) {
      slot.canvas = document.createElement('canvas');
    }
    const sizeChanged =
      slot.canvas.width !== safeW || slot.canvas.height !== safeH;
    if (sizeChanged) {
      slot.canvas.width = safeW;
      slot.canvas.height = safeH;
      slot.key = null;
    }

    if (!matchesCacheKey(slot.key, timeline, scene, safeW, safeH, dpr)) {
      const bufCtx = slot.canvas.getContext('2d');
      if (bufCtx) {
        bufCtx.save();
        bufCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderSceneFrame(bufCtx, width, height, scene, timeline, localTMs, {
          showUiOverlays: false,
        });
        bufCtx.restore();
      }
      slot.key = { timeline, scene, pixelW: safeW, pixelH: safeH, dpr };
    }

    return slot.canvas;
  }
  function renderProjectFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    compiledProject: CompiledProjectTimeline,
    globalTMs: number,
    options: ProjectRenderOptions = {}
  ): void {
    if (compiledProject.segments.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const evalState = evaluateProjectAt(compiledProject, globalTMs);
    if (evalState.kind === 'scene') {
      renderSceneFrame(
        ctx,
        width,
        height,
        evalState.segment.scene,
        evalState.segment.timeline,
        evalState.localTMs,
        options
      );
    } else {
      const dpr = Math.max(1, options.dpr ?? 1);
      const pixelW = Math.max(1, Math.round(width * dpr));
      const pixelH = Math.max(1, Math.round(height * dpr));

      const fromCanvas = getOrRenderEndpointBuffer(
        fromBufferSlot,
        evalState.fromSegment.scene,
        evalState.fromSegment.timeline,
        evalState.fromSegment.timeline.totalDurationMs,
        width,
        height,
        pixelW,
        pixelH,
        dpr
      );
      const toCanvas = getOrRenderEndpointBuffer(
        toBufferSlot,
        evalState.toSegment.scene,
        evalState.toSegment.timeline,
        0,
        width,
        height,
        pixelW,
        pixelH,
        dpr
      );

      if (!fromCanvas || !toCanvas) {
        const fallbackSeg =
          evalState.progress < 0.5 ? evalState.fromSegment : evalState.toSegment;
        const fallbackT =
          evalState.progress < 0.5
            ? evalState.fromSegment.timeline.totalDurationMs
            : 0;
        renderSceneFrame(
          ctx,
          width,
          height,
          fallbackSeg.scene,
          fallbackSeg.timeline,
          fallbackT,
          options
        );
      } else {
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        const transitionPlugin = transitionRegistry.getOrDefault(
          evalState.transitionId
        );
        transitionPlugin.render({
          ctx,
          width,
          height,
          progress: evalState.progress,
          fromCanvas,
          toCanvas,
          fromScene: evalState.fromSegment.scene,
          toScene: evalState.toSegment.scene,
        });
        ctx.restore();
      }
    }

    if (compiledProject.project.showSubtitles !== false) {
      const activeCue = getActiveSubtitleAt(
        compiledProject.project.subtitles,
        globalTMs
      );
      if (activeCue) {
        const activeTheme =
          evalState.kind === 'scene'
            ? evalState.segment.scene.theme
            : evalState.progress < 0.5
            ? evalState.fromSegment.scene.theme
            : evalState.toSegment.scene.theme;
        drawSubtitleOverlay(ctx, width, height, activeCue.text, activeTheme);
      }
    }
  }
  return { renderProjectFrame };
})();

// --- Module: src/engine/export/videoExporter.ts ---
const { exportScriptToVideo } = (() => {
  function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function createSceneFrameSource(
    scene: LessonScene,
    timeline: CompiledTimeline,
    fps = 30
  ): ExportFrameSource {
    const width = scene.aspectRatio === '9:16' ? 1080 : 1920;
    const height = scene.aspectRatio === '9:16' ? 1920 : 1080;

    return {
      title: scene.title,
      aspectRatio: scene.aspectRatio,
      totalDurationMs: timeline.totalDurationMs,
      width,
      height,
      fps,
      renderFrame(ctx, w, h, tMs) {
        renderSceneFrame(ctx, w, h, scene, timeline, tMs, {
          showUiOverlays: false,
        });
      },
      evaluateFrame(tMs, w = width, h = height) {
        return evaluateSceneFrameSnapshot(scene, timeline, tMs, w, h);
      },
      renderSvgFrame(tMs, w = width, h = height) {
        return renderSceneFrameSvg(scene, timeline, tMs, w, h);
      },
    };
  }
  function createProjectFrameSource(
    compiledProject: CompiledProjectTimeline,
    fps = 30
  ): ExportFrameSource {
    const aspectRatio = compiledProject.project.aspectRatio;
    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;

    return {
      title: compiledProject.project.title,
      aspectRatio,
      totalDurationMs: compiledProject.totalDurationMs,
      width,
      height,
      fps,
      renderFrame(ctx, w, h, tMs) {
        renderProjectFrame(ctx, w, h, compiledProject, tMs, {
          showUiOverlays: false,
          dpr: 1,
        });
      },
      evaluateFrame(tMs, w = width, h = height) {
        return evaluateProjectFrameSnapshot(compiledProject, tMs, w, h);
      },
      renderSvgFrame(tMs, w = width, h = height) {
        return renderProjectFrameSvg(compiledProject, tMs, w, h);
      },
    };
  }
  async function exportSceneVideo(
    scene: LessonScene,
    timeline: CompiledTimeline,
    options: ExportVideoOptions
  ): Promise<ExportVideoResult> {
    const exporterId = options.exporterId ?? 'mediarecorder-video';
    const defaultFps =
      exporterId === 'png-sequence-tar' || exporterId === 'svg-sequence-tar'
        ? 12
        : 30;
    const source = createSceneFrameSource(
      scene,
      timeline,
      options.fps ?? defaultFps
    );
    const plugin = exportRegistry.getOrDefault(exporterId);
    return plugin.export(source, {
      onProgress: options.onProgress,
      signal: options.signal,
    });
  }
  async function exportProjectVideo(
    compiledProject: CompiledProjectTimeline,
    options: ExportVideoOptions
  ): Promise<ExportVideoResult> {
    const exporterId = options.exporterId ?? 'mediarecorder-video';
    const defaultFps =
      exporterId === 'png-sequence-tar' || exporterId === 'svg-sequence-tar'
        ? 12
        : 30;
    const source = createProjectFrameSource(
      compiledProject,
      options.fps ?? defaultFps
    );
    const plugin = exportRegistry.getOrDefault(exporterId);
    return plugin.export(source, {
      onProgress: options.onProgress,
      signal: options.signal,
    });
  }
  async function exportScriptToVideo(
    scriptText: string,
    options: ExportScriptOptions = {}
  ): Promise<ExportScriptResult> {
    const parsed = parseProjectScript(scriptText, {
      fallbackTitle: options.fallbackTitle,
      fallbackAspectRatio: options.fallbackAspectRatio,
    });
    const compiled = compileProjectTimeline(parsed.project);
    const mediaSupported =
      exportRegistry.get('mediarecorder-video')?.isSupported?.() ?? false;
    const exporterId =
      options.exporterId ??
      (mediaSupported ? 'mediarecorder-video' : 'svg-sequence-tar');

    const out = await exportProjectVideo(compiled, {
      fps: options.fps,
      exporterId,
      onProgress: options.onProgress ?? (() => {}),
      signal: options.signal,
    });

    return {
      ...out,
      project: parsed.project,
      warnings: parsed.warnings,
      subtitlesSrt: parsed.project.subtitles
        ? serializeSubtitlesToSrt(parsed.project.subtitles)
        : '',
    };
  }
  return { exportScriptToVideo };
})();

// --- Module: src/model/projectStorage.ts ---
const { serializeProjectToJson } = (() => {
  const PROJECT_SCHEMA_VERSION = 1;
  const LEGACY_DRAFT_STORAGE_KEY = 'pencil-studio:draft:v1';
  const DRAFT_STORAGE_KEY = 'penova-studio:draft:v1';
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
  function serializeProjectToJson(project: LessonProject): string {
    const envelope: SerializedProjectFile = {
      format: 'penova-project',
      version: PROJECT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      project: cloneProject(project),
    };
    return JSON.stringify(envelope, null, 2);
  }
  function parseProjectFromJson(raw: string): {
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
  function saveProjectDraft(project: LessonProject): void {
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
  function loadProjectDraft(): LessonProject | null {
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
  function clearProjectDraft(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
  return { serializeProjectToJson };
})();


function printUsage(): void {
  console.log(
    [
      'Usage (Self-Contained Penova Skill Runner):',
      '  node render-script.ts --spec',
      '  node render-script.ts <input.penova.md> [output-dir] [--exporter=poster-svg|svg-sequence-tar] [--fps=12]',
      '  # On Node < 22.6 use: npx tsx render-script.ts ...',
    ].join('\n')
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.includes('--spec')) {
    process.stdout.write(generateScriptSpec());
    return;
  }

  const positional = args.filter((a) => !a.startsWith('--'));
  const inputPath = positional[0];
  if (!inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outDir = resolve(positional[1] ?? './penova-output');
  const exporterArg = args.find((a) => a.startsWith('--exporter='));
  const exporterId = exporterArg
    ? exporterArg.slice('--exporter='.length)
    : 'poster-svg';
  const fpsArg = args.find((a) => a.startsWith('--fps='));
  const fps = fpsArg
    ? Math.max(1, Number(fpsArg.slice('--fps='.length)) || 12)
    : 12;

  const scriptText = readFileSync(resolve(inputPath), 'utf8');
  const stem = basename(inputPath).replace(/\.(penova\.md|md|txt)$/i, '');
  mkdirSync(outDir, { recursive: true });

  const poster = await exportScriptToVideo(scriptText, {
    exporterId: 'poster-svg',
    fps,
    onProgress: () => {},
  });

  if (poster.warnings.length > 0) {
    console.warn('Warnings:');
    for (const w of poster.warnings) console.warn(`  - ${w}`);
  }

  const jsonPath = join(outDir, `${stem}.penova.json`);
  writeFileSync(jsonPath, serializeProjectToJson(poster.project), 'utf8');

  const posterPath = join(outDir, `${stem}.svg`);
  writeFileSync(posterPath, await poster.blob.text(), 'utf8');

  let srtPath: string | null = null;
  if (poster.subtitlesSrt.trim()) {
    srtPath = join(outDir, `${stem}.srt`);
    writeFileSync(srtPath, poster.subtitlesSrt, 'utf8');
  }

  console.log(
    `Project: ${poster.project.title} (${poster.project.scenes.length} scenes)`
  );
  console.log(`  - Studio JSON: ${jsonPath}`);
  console.log(`  - Vector Poster: ${posterPath}`);
  if (srtPath) console.log(`  - Subtitles: ${srtPath}`);

  if (exporterId !== 'poster-svg') {
    const out = await exportScriptToVideo(scriptText, {
      exporterId,
      fps,
      onProgress: (pct) => {
        if (pct === 100 || pct % 25 === 0) {
          console.log(`  [${exporterId}] ${pct}%`);
        }
      },
    });
    const outPath = join(outDir, out.filename);
    const buf = Buffer.from(await out.blob.arrayBuffer());
    writeFileSync(outPath, buf);
    console.log(
      `  - Exported (${exporterId}): ${outPath} (${out.summary ?? ''})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
