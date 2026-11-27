# Penova 插件架构与通用节点服务规范 (`PLUGIN_SPEC`)

[English](PLUGIN_SPEC.md) | **简体中文**

Penova 采用 **两层分离** 的编译器架构：

- **第一层（通用核心服务层）**：统一把一切可绘制对象抽象为 **`SceneNode` 组合节点树**（`text`、`shape`、`connector`、`group`），经 `LayoutPlugin` 排版后编译为底层绘制原语，再交由 `PresentationPlugin` 渲染与导出视频。
- **第二层（领域封装与语法糖层，可选）**：如 [src/model/builders.ts](../src/model/builders.ts) 的 `createCardNode`、教学预设模板及 `graphScriptCodec`（`A -> B` 板书脚本），均只是在第一层之上组合 `SceneNode` 的便捷封装。

---

## 一、通用场景树 (`SceneNode` IR)

定义在 [src/model/scene.ts](../src/model/scene.ts)：

| 节点类型 (`type`) | 定位 | 核心属性 |
| :--- | :--- | :--- |
| `text` | 纯文本节点（字、词、句、段落） | `text`、`fontSize`、`fontWeight`、`maxWidth`、`align`（`left`/`center`/`right`）、`indentChars` |
| `shape` | 图形/装饰节点（框、圆、云、菱形、下划线、分割线） | `shape`、`fitMode`（`auto-group` 随父组适配 / `fixed` 固定宽高）、`width`、`height`、`emphasized`、`dashed` |
| `connector` | 连线与指向箭头 | 支持绑定 `fromId` → `toId`，或独立自由坐标 `fromPoint` → `toPoint`，支持 `label` 与 `style` |
| `group` | 组合节点（可嵌套、子元素顺序即绘制顺序） | `children: SceneNode[]`、`arrange`（`card` / `stack` / `free`）、`gap` |
| `custom` / `custom:<kind>` | 可扩展自定义节点 | `kind`、`props`，由 `SceneNodePlugin` 驱动（`compose` 组合模式或 `measure` + `compile` 原语模式） |

> **绘制顺序由子节点数组顺序自然决定**：例如在 `card` 组合中，把 `shape` 放在 `text` 前面就是“先画框再写字”；把 `shape(underline)` 放在 `text` 后面就是“先写字再画下划线”。

---

## 二、插件契约与注册表

所有公开契约与注册表统一从 [src/plugins/index.ts](../src/plugins/index.ts) 导出（接口定义见 [contracts.ts](../src/plugins/contracts.ts)）。

### 0. 自定义节点插件 (`SceneNodePlugin` / `sceneNodeRegistry`)

无需修改核心布局器或时间轴编译器，即可按两级模式扩展全新 `SceneNode` 类型（内置提供 [src/plugins/nodes/](../src/plugins/nodes/) 下的 `icon`、`sketch`、`code`、`chart`、`wave`、`annotate`）：

- **组合模式 (`compose(node) => SceneNode`)**：用现有 `group` / `text` / `shape` 拼装出复合结构，引擎自动完成测量、连线裁剪与逐笔书写动画；
- **原语模式 (`measure(node, ctx)` + `compile(positioned, helpers)`)**：自主计算包围盒并通过 `helpers.pushStroke` / `helpers.pushTextLine` 输出自定义粉笔笔画与文字行；
- **画后连续动态笔画契约**：`helpers.pushStroke(stroke, gapAfterMs?, animate?, { sync?: 'item' | 'node' })` 支持传入纯时间函数 `(elapsedMs) => StrokePath`，在 Canvas 实时渲染（`sceneRenderer.ts`）与无头 SVG（`frameSnapshot.ts`）双路径上于绘制结束后连续求值；传入 `{ sync: 'node' }` 时会将节点内所有动态笔画统一对齐到整节点绘制结束时刻 `animateStartMs` 同步运动（如多帧 `[node:chart]` 柱子与趋势折线）；
- **纯数据属性元数据 (`propFields`)**：通过 [src/sdk/propSchema.ts](../src/sdk/propSchema.ts) 的 `defineProps(...)` 声明，既不在核心引擎层引入任何 UI 词汇，又能自动驱动工作室表单、双向不可变更新及 `generateScriptSpec()` 中的 `[node:<id>] props:` 规范输出。

```ts
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
```

### 1. 外形插件 (`ShapePlugin`)

纯几何与笔画协议，不绑定任何卡片角色或文字渲染顺序（内置提供 `rounded`、`circle`、`cloud`、`underline`、`diamond`、`divider`）：

```ts
export interface ShapePlugin {
  id: string;
  name: string;
  maxTextWidth?(): number;
  measureBox(contentW: number, contentH: number): {
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
```

### 2. 布局插件 (`LayoutPlugin`)

接收通用 `SceneNode[]` 树，返回 `ComputedLayout`（含坐标化节点树 `nodes`、扁平检索表 `nodeMap`、可选分区框 `zones` 与包围盒 `bounds`）：

```ts
export interface LayoutPlugin {
  id: string;
  name: string;
  category: 'basic' | 'diagram';
  icon: 'flow-lr' | 'flow-tb' | 'mindmap' | 'concept-graph' | 'document' | 'freeform';
  dragMode: 'offset' | 'absolute';
  supportsEdges: boolean;
  supportsGroups?: boolean;
  textCodec?: SceneTextCodec;
  compute(scene: LessonScene, helpers: LayoutHelpers): ComputedLayout;
  deriveSteps?(scene: LessonScene): TeachingStep[];
}
```

- 通过 `helpers.measureNode(node)` 测量任意节点（`text` / `shape` / `group`），通过 `helpers.positionGroupChildren(...)` 一键展开并定位组内子节点（含自适应 `auto-group` 外框）。
- 复用了 [src/plugins/layouts/shared.ts](../src/plugins/layouts/shared.ts) 的 `splitSceneNodes`、`buildConnectorNode` 与 `finalizeLayout`。
- 内置提供 6 种布局：`flow-horizontal`、`flow-vertical`、`mindmap`、`concept-graph`、`document`（信纸文稿，配套 `documentScriptCodec`）、`freeform`（自由画布）。

### 3. 表现形式插件 (`PresentationPlugin`)

封装画板底面材质、笔刷质感、执笔造型、粒子特效与书写摩擦音色（内置提供 `chalkboard` 黑板粉笔、`whiteboard` 白板马克笔、`blueprint` 工程蓝图、`letter-paper` 信纸钢笔）：

```ts
export interface PresentationPlugin {
  id: string;
  name: string;
  palette: ThemePalette;
  fontFamily: string;
  glyphGrain?: { enabled: boolean; minAlphaFactor?: number; range?: number };
  shadowColor: string;
  soundProfile: { baseFreqHz: number; velocityFreqBoostHz: number; baseGain: number };
  drawSurface(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokePath, progress: number): void;
  drawInstrument(ctx: CanvasRenderingContext2D, colorHex: string): void;
  drawParticles?(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, colorHex: string, tMs: number, seed: number): void;
}
```

---

### 4. 字形笔画源插件 (`GlyphProviderPlugin`)

按 `priority` 从高到低依次解析单个字符的书写轨迹。内置提供两级链：
1. `stroke-order-dict`（`priority: 80`）：内置拉丁字母、数字及基础汉字标准笔顺骨架，映射至字体实际墨迹 `inkBounds`，并支持通过 `registerStrokeOrderGlyphs` 批量注入扩展字库；
2. `ink-grid-fallback`（`priority: 10`）：对字库未收录的任意 Unicode 字符自动执行 14×14 墨迹网格动量追踪兜底。

```ts
export interface GlyphProviderPlugin {
  id: string;
  name: string;
  priority: number;
  resolveStrokes(ctx: GlyphProviderContext): GlyphStrokeSegment[] | null;
}
```

向 `glyphProviderRegistry` 注册或注销插件时，引擎会自动失效并重建字形笔画缓存。

---

### 5. 执笔手势插件 (`HandPlugin`)

控制屏幕空间的执笔手势与跟随微摆动画（笔尖精确锚定在 `(screenX, screenY - lift * 0.8)`）。内置提供 `hand-chalk`（手握画笔）、`hand-minimal`（极简线稿手）、`tip-only`（仅笔杆）与 `hidden`（隐藏），并导出工厂函数 `createImageHandPlugin` 支持 5 行接入自定义真实手图 PNG：

```ts
import { handRegistry, createImageHandPlugin } from '../plugins';

handRegistry.register(
  createImageHandPlugin({
    id: 'real-hand-1',
    name: 'Real Hand PNG',
    imageSrc: '/assets/hand-chalk.png',
    tipAnchorX: 18,
    tipAnchorY: 22,
    scale: 0.65,
  })
);
```

---

### 6. 运镜策略插件 (`CameraPlugin`)

每帧根据时间轴状态、包围盒与当前笔尖位置计算世界坐标摄像机 `(cx, cy, zoom)`。内置提供 `auto-follow`（智能聚焦）、`progressive-fit`（渐进全景）、`static-overview`（固定全景）与 `pen-follow`（跟写滚屏，适合竖向文稿与长信书写）：

```ts
export interface CameraPlugin {
  id: string;
  name: string;
  evaluate(ctx: CameraEvalContext): CameraState;
}
```

向 `cameraRegistry` 注册自定义运镜插件后，画布工具栏会自动显示并支持一键切换与导出。

---

### 7. 切幕转场插件 (`TransitionPlugin`)

当工程包含多幕场景（[LessonProject](../src/model/project.ts)）时，每一幕结尾可通过 `scene.transitionOut` 指定转场效果，引擎自动合成上一幕末帧 `fromCanvas` 与下一幕首帧 `toCanvas`。内置提供 `chalkboard-eraser`（黑板擦擦除）、`page-turn`（翻页滑切）、`crossfade`（柔和淡化）与 `cut`（直接硬切）：

```ts
export interface TransitionPlugin {
  id: string;
  name: string;
  defaultDurationMs: number;
  render(context: TransitionRenderContext): void;
}
```

向 `transitionRegistry` 注册自定义转场后，分幕条（[SceneStrip](../src/components/SceneStrip.tsx)）之间的转场下拉列表与视频导出器会自动识别并应用。

---

### 8. 视频/成品导出插件 (`ExportPlugin`)

通过 `ExportFrameSource` 将画布/帧求值与输出编码完全解耦。`ExportFrameSource` 同时提供 Canvas 回调（`renderFrame(ctx, w, h, tMs)`）以及**平台无关的数据/矢量接口**（`evaluateFrame(tMs)` 返回 `EvaluatedFrameSnapshot`，`renderSvgFrame(tMs)` 返回 `<svg>` 字符串），因此导出插件可以自由选择浏览器 Canvas、SVG 矢量、FFmpeg 桥接或纯数据导出：

1. `mediarecorder-video`（1080P 视频：浏览器实时编码 WebM / MP4）
2. `poster-png`（高清成品图：瞬时导出终幕无损 1080P PNG 海报）
3. `png-sequence-tar`（离线帧包：无丢帧导出 PNG 序列、`manifest.json` 及可执行的 FFmpeg 合成指令）
4. `poster-svg`（矢量海报：无 Canvas 依赖，直接导出 1080P `.svg` 矢量终幕）
5. `svg-sequence-tar`（矢量帧包：无 Canvas 依赖，在服务端/Node 端也能直接导出逐帧 `.svg` 序列包）

此外提供 `createHttpBridgeExportPlugin`（支持 `frameFormat: 'auto' | 'png-base64' | 'svg' | 'snapshot'`）对接本地 FFmpeg 服务或云端合成接口（TopBar 导出弹层会依据 `category` 自动将其归类到“高清定格图”或“视频与帧序列”分组），以及高层入口 `exportScriptToVideo(scriptText)` 一站式完成 `.penova.md` 文本到任意导出插件的编译出片：

```ts
export interface ExportPlugin {
  id: string;
  name: string;
  shortLabel?: string;
  category?: 'snapshot' | 'sequence';
  description?: string;
  isSupported?(): boolean;
  export(source: ExportFrameSource, options: ExportRunOptions): Promise<ExportOutput>;
}
```

---

## 三、扩展一个纯文字文稿布局的极简示例

```ts
import { layoutRegistry, LayoutPlugin } from '../plugins';
import { finalizeLayout, makePositionedNode } from '../plugins/layouts/shared';

const verticalDocLayout: LayoutPlugin = {
  id: 'doc-flow',
  name: 'Document Flow',
  category: 'basic',
  icon: 'document',
  dragMode: 'offset',
  supportsEdges: false,
  compute(scene, helpers) {
    let y = 0;
    const nodes = scene.nodes.map((n) => {
      const m = helpers.measureNode(n);
      const p = makePositionedNode(n, 0, y + m.height / 2, m, helpers);
      y += m.height + 24;
      return p;
    });
    return finalizeLayout(nodes, []);
  },
  deriveSteps(scene) {
    return scene.nodes.map((n, i) => ({
      id: `doc-step-${i}-${n.id}`,
      title: n.name,
      nodeIds: [n.id],
    }));
  },
};

layoutRegistry.register(verticalDocLayout);
```

---

## 四、声明式多幕工程脚本（`.penova.md`）

Penova 支持通过 [src/engine/parser/projectScript.ts](../src/engine/parser/projectScript.ts) 将纯文本 `.penova.md` 直接解析并组装为完整的 `LessonProject`，按每幕声明动态匹配 9 大注册表中的 `theme`、`layout`、`camera`、`hand`、`transition` 与 `[node:<kind>]` 插件：

- 任意自定义 `LayoutPlugin` 只要挂载配套的 `textCodec`（并可选填写 `syntaxRules` 与 `example`），即可直接在 `.penova.md` 中通过 `layout: <plugin-id>` 驱动成片。
- 内置全部 6 大布局均支持无损双向文本映射（`flow-horizontal` / `flow-vertical` / `mindmap` / `concept-graph` / `freeform` 使用 `graphScriptCodec`，`document` 使用 `documentScriptCodec`），支持无框节点 (`shape: none`)、独立原子节点 (`[text]` / `[shape:<id>]` / `[node:<kind>]`)、嵌套 `[group]` 树、`#<id>` 同名节点消歧以及 `{say: "口播字幕", pause: 800}` 分步台词与停顿控制。
- 调用 `generateScriptSpec()` 会实时扫描当前所有注册表，生成完整的纯文本插件能力与脚本语法规范，并根据各 `SceneNodePlugin` 的 `propFields` 自动生成 `[node:<id>] props:` 属性说明（可直接用于文档展示或任何外部生成流程）。
- 完整 6 幕声明式产品介绍脚本文档可参考：[docs/examples/penova-intro.penova.md](examples/penova-intro.penova.md)。

---

## 五、无头属性协议 (`defineProps`) 与引擎 / UI 解耦架构

Penova 严格遵循**单向依赖边界（`UI -> Engine`）**：

- `src/model/`、`src/sdk/`、`src/engine/` 以及 `src/plugins/` 下的全部插件定义保持 **100% 无头纯净**——不引入任何 DOM 依赖或 UI 展示词汇（如 `rows`、`placeholder`、`label`、`inlineEditPropKey`），并兼容 Node 22 原生 TypeScript 类型剥离与无头打包脚本 `scripts/bundle-skill.py`（仅浏览器订阅辅助钩子 `src/plugins/useRegistryList.ts` 使用 React 且会被无头打包自动排除）。
- `src/studio/` 与 `src/components/` 承载全部浏览器端交互细节与可选界面增强。

### `defineProps`（[src/sdk/propSchema.ts](../src/sdk/propSchema.ts)）

插件不再需要手写重复的默认值与解析校验代码，只需使用 `defineProps` 配合 `prop.string`、`prop.number`、`prop.boolean`、`prop.enum` 声明一次纯数据元信息：

```ts
import { defineProps, prop } from '../../sdk/propSchema';

const myProps = defineProps({
  title: prop.string({ default: 'Metrics', format: 'plain' }),
  lines: prop.string({ format: 'code', aliases: ['code'] }),
  curve: prop.string({
    format: 'bezier-curve', // 开放字符串：若 propControlRegistry 已注册则自动匹配对应控件
    when: (v) => v.mode === 'manual', // 纯数据条件显隐谓词
  }),
  height: prop.number({ default: 196, min: 96, max: 420, step: 4 }),
  mode: prop.enum(['auto', 'manual'], { default: 'auto' }),
});
```

- **开放语义格式与纯数据条件**：`format` 支持内置格式（`'plain' | 'multiline' | 'code' | 'svg' | 'icon-id' | 'enum' | 'color' | 'shape-id' | 'node-ref'`）及任意自定义控件 ID；`when(values)` 仅基于数据字段声明显隐，零 UI 耦合。
- **单一数据源**：统一产出 `fields`（挂载到 `SceneNodePlugin.propFields`）、`defaults`、`filterVisibleFields` 以及强类型的 `resolve(rawProps)`（`InferPropValues`）。
- **显式声明、按需接入（类似 Unreal `UPROPERTY` 语义）**：`propFields` 完全可选。纯无头插件可以不写 `propFields`、直接读取 `node.props`，不影响引擎编译与导出；仅当需要工作室属性面板与 `--spec` 文档生成时再声明 `propFields`。
- **对称双向不可变读写**：`readField`、`writeField`、`resetField`（以及泛化的 `readPropBySchema` / `writePropBySchema`）自动完成别名归一化、`min`/`max` 裁剪并返回新的 `node.props`，让侧边栏检查器、画布快编与脚本文本保持双向同步。

### 属性控件与伴生 UI 注册表（[src/studio/propControls.tsx](../src/studio/propControls.tsx)、[src/studio/uiRegistry.ts](../src/studio/uiRegistry.ts)）

所有内置基础 IR 节点（[src/studio/nodeSchemas.tsx](../src/studio/nodeSchemas.tsx) 中的 `core:text`、`core:shape`、`core:connector`、`core:card`、`core:group`）与第三方 `SceneNodePlugin` 已统一接入同一套声明式检查器（[NodeInspector.tsx](../src/components/sidebar/NodeInspector.tsx)），并按三级优先级为每个属性动态匹配控件：

1. **字段级专属组件覆写**：优先使用 `studioNodeUiRegistry` 中该节点配置的 `fieldControls[key]`。
2. **语义控件注册表 (`propControlRegistry`)**：依次匹配 `fieldHints[key].controlId` 或 `field.format`——支持通过 `propControlRegistry.register({ id: 'bezier-curve', render })` 扩展全新属性控件。
3. **基础类型兜底**：匹配 `propControlRegistry.get(field.type)`（`'string'`、`'number'`、`'boolean'`），且基础控件本身同样可通过 `{ override: true }` 全局替换。

```ts
import { propControlRegistry } from '../studio/propControls';
import { studioNodeUiRegistry } from '../studio/uiRegistry';

// 可选：注册可复用的自定义属性控件
propControlRegistry.register({
  id: 'bezier-curve',
  render: (ctx) => /* 基于 ctx.value / ctx.onChange / ctx.onReset 渲染 ReactNode */ null,
});

// 可选：为特定节点补充提示、双击快编目标、字段专属控件或附加交互区
studioNodeUiRegistry.register({
  id: 'my-widget',
  inlineEditPropKey: 'title', // 指定画布双击行内快编对应的属性键
  fieldHints: {
    lines: { label: 'Source Code', rows: 4, span: 2, placeholder: 'const x = 1;' },
  },
  // fieldControls: { curve: (ctx) => ... }, // 字段级 React 组件覆写
  // renderExtra(ctx) { ... } // 可选：向属性面板底部追加自定义 React 区块
});
```

### 配套 SDK 原语（`src/sdk/`）

- **[src/sdk/sketchPipeline.ts](../src/sdk/sketchPipeline.ts)**：SVG 路径与位图简笔画矢量化管线，内置 20 枚常用图标；支持 `registerSketchIcon` 动态扩展，并通过 `subscribeSketchIcons` / `listSketchIcons` 向工作室选择器提供响应式图标订阅。
- **[src/sdk/workflowDag.ts](../src/sdk/workflowDag.ts)**：面向自定义图谱与流水线布局插件的递归可组合 DAG 排版内核。
- **[src/sdk/mathExpr.ts](../src/sdk/mathExpr.ts)**：零 `eval` 安全数学表达式递归下降解析与求值器（`compileMathExpr`），支持 `x`/`t` 变量、三角与限幅函数及带嵌套深度/步数预算保护的 `sum(k, start, end, expr)` 级数展开，驱动 `[node:wave]` 等公式动画节点。
- **零位移覆盖标注插件（`SceneNodePlugin.isOverlay`）**：声明 `isOverlay: true` 的节点插件（如内置 `[node:annotate]`）不参与 DAG / 树 / 栏位排版计算，而是在 `computeDiagramLayout` 阶段按 `target` 节点包围盒原地叠绘，并在开启 `spotlight: true` 时与其目标节点同步保持高亮。
- **聚光灯聚焦变暗（`LessonScene.spotlight`）**：场景元数据开启 `spotlight: true` 后，引擎在逐步讲解过程中会将非当前焦点步骤元素平滑变暗（`0.26` 基底透明度、`260ms` 过渡），并在片尾收束阶段统一恢复全亮，同时作用于 Canvas 实时渲染与无头 SVG 导出。
- **原生 Mermaid 导入（`src/plugins/codecs/mermaidCodec.ts`）**：通过 `mermaidScriptCodec` 与 `parseScriptToScene` 自动识别，可直接解析 `flowchart` / `graph`、`subgraph` 区块、多形状节点以及虚线/标签/链式边并编译为标准场景图。

---

## 六、后续架构演进路径

- **动态文字层支持 (`CompiledTextLineItem`)**：当前动态钩子聚焦在笔画层（`CompiledStrokeItem`），文字写完后保持静态。后续如需支持“柱状图实时数字跳动”或“傅里叶阶数 `N = 1 -> 5` 动态标注”，可沿相同纯时间求值思路向 `CompiledTextLineItem` 扩展轻量响应式文字钩子。
- **单节点场景停留与通用微动效**：后续可补充场景级画后停留控制，并沉淀可组合的通用轻动效修饰（悬浮呼吸、脉冲、流动虚线箭头）。
- **检查器模式条件显隐**：借助 `defineProps` 的 `when(values)` 谓词为 `[node:wave]` 不同输入模式（公式 / 数据 / 预设）自动折叠无关参数，并在脚本面板补充快捷片段按钮。
