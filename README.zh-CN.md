# Penova

[English](README.md) | **简体中文**

**Penova**（*Pen + Nova*）是一个运行在浏览器端的**可插件化手绘笔迹动画引擎与工作室**（React + TypeScript + Vite + HTML5 Canvas）：将结构化知识图谱、思维导图与手写书信文稿编译为逐字逐笔书写动画、智能运镜、多幕转场、字幕配音与 1080P 视频输出。

---

## 产品深度介绍六幕效果展示

以下 6 幕效果均已内置于教学模板 **`Penova 产品深度介绍（六幕）` / `Penova Product Intro (6 Scenes)`**（亦可由 [docs/examples/penova-intro.penova.md](docs/examples/penova-intro.penova.md) 一键脚本解析生成），可在工作室内预览并直接导出 `16:9`（`1920×1080`）与 `9:16`（`1080×1920`）1080P 视频。

![Penova 工作室主界面](docs/assets/studio-overview.png)

| 黑板粉笔 · Why Penova（横向流程） | 蓝图线稿 · Core Design Principles（概念图谱） |
| :---: | :---: |
| ![Why Penova 黑板横向流程](docs/assets/promo-1-chalkboard.png) | ![核心设计原则蓝图概念图谱](docs/assets/promo-2-blueprint.png) |
| **蓝图线稿 · 8-Registry Plugin System（思维导图）** | **白板马克笔 · Script-Driven Custom Plugins（纵向流程）** |
| ![八大注册表插件系统思维导图](docs/assets/promo-3-mindmap.png) | ![脚本驱动自定义插件白板纵向流程](docs/assets/promo-4-whiteboard.png) |
| **信纸钢笔 · Real Penmanship (EN + 汉字)** | **黑板粉笔 · Full Studio & Open Source（概念图谱）** |
| ![中英双语真迹信纸手写文稿](docs/assets/promo-5-letter.png) | ![全功能工作室与开源黑板概念图谱](docs/assets/promo-6-studio.png) |

---

## 核心特性

- **通用 `SceneNode` 组合节点树 IR**：统一抽象 `text`、`shape`、`connector`、`group` 四类原子节点与嵌套组，支持流程图、思维导图、概念图谱、手写信纸文稿与自由画布等多种形态。
- **八大可插拔扩展注册表 (8-Registry Plugin System)**：
  - **外形插件 (`ShapePlugin`)**：`rounded`（圆角框）、`circle`（椭圆圈）、`cloud`（云朵框）、`underline`（双下划线）、`diamond`（菱形判断）、`divider`（手绘分割线）。
  - **布局插件 (`LayoutPlugin`)**：`flow-horizontal`（横向流程）、`flow-vertical`（纵向流程）、`mindmap`（思维导图）、`concept-graph`（概念图谱）、`document`（信纸文稿）、`freeform`（自由画布），配套可逆文本编解码器 (`graphScriptCodec` / `documentScriptCodec`)。
  - **表现形式 (`PresentationPlugin`)**：`chalkboard`（黑板粉笔）、`whiteboard`（白板马克笔）、`blueprint`（蓝图线稿）、`letter-paper`（信纸钢笔）。
  - **字形笔画源 (`GlyphProviderPlugin`)**：`stroke-order-dict` 笔顺库（涵盖拉丁字母、数字与基础汉字，支持 `registerStrokeOrderGlyphs` 动态注入） + `ink-grid-fallback` 任意 Unicode 字符墨迹网格追踪兜底。
  - **执笔手势 (`HandPlugin`)**：`hand-chalk`（手握画笔）、`hand-minimal`（极简线稿手）、`tip-only`（仅笔杆）、`hidden`（隐藏），支持 `createImageHandPlugin` 快速接入实拍手图 PNG。
  - **运镜策略 (`CameraPlugin`)**：`auto-follow`（智能聚焦）、`progressive-fit`（渐进全景）、`static-overview`（固定全景）、`pen-follow`（跟写滚屏）。
  - **多幕转场 (`TransitionPlugin`)**：`chalkboard-eraser`（黑板擦擦除）、`page-turn`（翻页滑切）、`crossfade`（柔和淡化）、`cut`（直接硬切）。
  - **成品导出 (`ExportPlugin`)**：零后端导出 **1080P 视频**（WebM/MP4 `MediaRecorder`）、**高清 PNG 海报**、**离线 FFmpeg 无损 PNG 帧序列包 (`.tar`)**，并提供 `createHttpBridgeExportPlugin` 工厂对接本地/云端合成服务。
- **声明式多幕脚本管道与 AI Agent Skill（`.penova.md` → 自动组装插件 → 视频）**：支持使用纯文本 `.penova.md` 声明各幕 `theme`、`layout`、`camera`、`hand` 与 `transition` 插件，通过 `generateScriptSpec()` 实时导出插件语法规范，并已内置 [.agents/skills/penova-animation/SKILL.md](.agents/skills/penova-animation/SKILL.md) 供 AI 直接规划分镜、生成脚本并无头导出动画产物（示例见 [docs/examples/penova-intro.penova.md](docs/examples/penova-intro.penova.md)）。
- **内置双语体验 (`EN / 简体中文`)**：界面默认英文，顶栏一键切换 `EN / 中文`，且自带 6 套中英双语教学演示预设模板；第三方插件只需提供默认 `name`，无需感知多语言字典即可自动显示。
- **完整工作室能力**：多幕时间轴编排、单幕与 `.penova.md` 多幕工程脚本在线编辑/规范复制、自动字幕生成与 `.srt` 导入/导出、本地配音轨同步与 Web Audio 程序化书写音效、撤销/重做历史栈、`16:9` / `9:16` 画幅切换、`.penova.json` 与 `.penova.md` 工程导入导出及草稿自动保存。

---

## 分层架构

```text
src/components/, src/hooks/, src/i18n/   工作室 UI、工作区状态管理、音频同步与多语言层
                  │
                  ▼
           src/engine/                    布局编译器、字形笔顺动画器、时间轴、运镜、音效与渲染器
                  │
                  ▼
           src/plugins/                   8 大独立插件注册表与全套内置插件实现
                  │
                  ▼
             src/sdk/                     引擎与插件复用的纯数学/路径/笔刷/离屏缓存原语
                  │
                  ▼
            src/model/                    通用 SceneNode IR、LessonProject、双语预设、历史栈与存储
```

更完整的插件契约定义与扩展示例请查阅：[docs/PLUGIN_SPEC.zh-CN.md](docs/PLUGIN_SPEC.zh-CN.md)（英文版：[docs/PLUGIN_SPEC.md](docs/PLUGIN_SPEC.md)）。

---

## 快速开始

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

## 插件扩展极简示例

```ts
import { layoutRegistry, LayoutPlugin } from './src/plugins';
import { finalizeLayout, makePositionedNode } from './src/plugins/layouts/shared';

const customVerticalLayout: LayoutPlugin = {
  id: 'custom-vertical',
  name: 'Custom Vertical Doc',
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

## 开源协议

基于 [MIT License](LICENSE) 开源。
