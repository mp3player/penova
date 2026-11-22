# Penova

**Penova** (*Pen + Nova*) is a browser-native, plugin-extensible hand-drawn animation engine and studio built with React, TypeScript, Vite, and HTML5 Canvas.

**Penova** 是一个运行在浏览器端的**可插件化手绘笔迹动画引擎与知识板书工作室**：将结构化图文与手写文稿编译为逐字逐笔书写动画、智能运镜、多幕转场、字幕配音与 1080P 视频输出。

---

## 核心特性 (Features)

- **通用 `SceneNode` 组合节点树 IR**：统一抽象 `text`、`shape`、`connector`、`group` 四类原子节点与嵌套组，支持卡片图、概念图、手写文稿与自由画布等多种形态。
- **八大可插拔扩展注册表 (8-Registry Plugin System)**：
  - **外形插件 (`ShapePlugin`)**：`rounded`、`circle`、`cloud`、`underline`、`diamond`、`divider`。
  - **布局插件 (`LayoutPlugin`)**：`flow-horizontal`、`flow-vertical`、`mindmap`、`concept-graph`、`document`（信纸文稿）、`freeform`（自由画布），配套可逆文本编解码器 (`graphScriptCodec` / `documentScriptCodec`)。
  - **表现形式 (`PresentationPlugin`)**：`chalkboard`（黑板粉笔）、`whiteboard`（白板马克笔）、`blueprint`（工程蓝图）、`letter-paper`（信纸钢笔）。
  - **字形笔画源 (`GlyphProviderPlugin`)**：`stroke-order-dict` 笔顺库（支持 `registerStrokeOrderGlyphs` 动态注入） + `ink-grid-fallback` 任意 Unicode 字符墨迹网格追踪兜底。
  - **执笔手势 (`HandPlugin`)**：`hand-chalk`、`hand-minimal`、`tip-only`、`hidden`，支持 `createImageHandPlugin` 快速接入实拍手图 PNG。
  - **运镜策略 (`CameraPlugin`)**：`auto-follow`、`progressive-fit`、`static-overview`、`pen-follow`（跟写滚屏）。
  - **多幕转场 (`TransitionPlugin`)**：`chalkboard-eraser`（黑板擦擦除）、`page-turn`（翻页滑切）、`crossfade`（柔和淡化）、`cut`（硬切）。
  - **成品导出 (`ExportPlugin`)**：零后端导出 **1080P 视频**（WebM/MP4 `MediaRecorder`）、**高清成品 PNG**、**离线 FFmpeg 无损 PNG 帧序列包 (`.tar`)**，并提供 `createHttpBridgeExportPlugin` 工厂对接本地/云端合成服务。
- **完整工作室能力**：多幕时间轴编排、自动字幕生成与 `.srt` 导入/导出、本地配音轨同步与 Web Audio 程序化书写音效、撤销/重做历史栈、`16:9` / `9:16` 画幅切换、`.penova.json`（兼容 `.pencil.json`）工程读写与本地草稿自动保存。

---

## 分层架构 (Architecture)

```text
src/components/ & src/hooks/   Studio UI & React workspace/audio hooks
              │
              ▼
src/engine/                    Layout compiler, glyph stroke animator, timeline, camera, audio & renderer
              │
              ▼
src/plugins/                   8 independent plugin registries & built-in implementations
              │
              ▼
src/sdk/                       Pure math/path/brush/cache primitives shared by engine & plugins
              │
              ▼
src/model/                     Universal SceneNode tree, LessonProject, presets, history & storage
```

更完整的插件契约定义与扩展示例请查阅：[docs/PLUGIN_SPEC.md](docs/PLUGIN_SPEC.md)。

---

## 快速开始 (Quick Start)

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 运行单元测试
npm test

# TypeScript 类型检查 + 生产构建
npm run build
```

---

## 插件扩展极简示例 (Plugin Example)

```ts
import { layoutRegistry, LayoutPlugin } from './src/plugins';
import { finalizeLayout, makePositionedNode } from './src/plugins/layouts/shared';

const customVerticalLayout: LayoutPlugin = {
  id: 'custom-vertical',
  name: '自定义纵向排版',
  category: 'basic',
  icon: 'document',
  dragMode: 'offset',
  supportsEdges: false,
  compute(scene, helpers) {
    let y = 0;
    const nodes = scene.nodes.map((node) => {
      const measured = helpers.measureNode(node);
      const positioned = makePositionedNode(node, 0, y + measured.height / 2, measured, helpers);
      y += measured.height + 24;
      return positioned;
    });
    return finalizeLayout(nodes, []);
  },
};

layoutRegistry.register(customVerticalLayout);
```

---

## 开源协议 (License)

基于 [MIT License](LICENSE) 开源。
