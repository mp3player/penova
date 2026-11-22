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

> **绘制顺序由子节点数组顺序自然决定**：例如在 `card` 组合中，把 `shape` 放在 `text` 前面就是“先画框再写字”；把 `shape(underline)` 放在 `text` 后面就是“先写字再画下划线”。

---

## 二、八大插件契约

所有公开契约与注册表统一从 [src/plugins/index.ts](../src/plugins/index.ts) 导出（接口定义见 [contracts.ts](../src/plugins/contracts.ts)）。

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

通过 `ExportFrameSource` 将画布逐帧渲染与输出编码完全解耦。内置提供三种零后端依赖导出插件：
1. `mediarecorder-video`（1080P 视频：浏览器实时编码 WebM / MP4）
2. `poster-png`（高清成品图：瞬时导出终幕无损 1080P PNG 海报）
3. `png-sequence-tar`（离线帧包：无丢帧导出 PNG 序列、`manifest.json` 及可执行的 FFmpeg 合成指令）

此外提供 `createHttpBridgeExportPlugin` 工厂函数，5 行即可将本地 FFmpeg 服务或云端合成接口接入 `exportRegistry`，顶栏导出下拉框会自动识别并展示：

```ts
export interface ExportPlugin {
  id: string;
  name: string;
  shortLabel?: string;
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
