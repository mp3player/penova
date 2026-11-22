# Penova

[English](README.md) | **简体中文**

**Penova**（*Pen + Nova*）是一个运行在浏览器端的**可插件化手绘笔迹动画引擎与工作室**（React + TypeScript + Vite + HTML5 Canvas）：将结构化知识图谱、思维导图与手写书信文稿编译为逐字逐笔书写动画、智能运镜、多幕转场、字幕配音与 1080P 视频输出。

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
- **内置双语体验 (`EN / 简体中文`)**：界面默认英文，顶栏一键切换 `EN / 中文`，且自带 5 套中英双语教学演示预设模板；第三方插件只需提供默认 `name`，无需感知多语言字典即可自动显示。
- **完整工作室能力**：多幕时间轴编排、自动字幕生成与 `.srt` 导入/导出、本地配音轨同步与 Web Audio 程序化书写音效、撤销/重做历史栈、`16:9` / `9:16` 画幅切换、`.penova.json`（兼容 `.pencil.json`）工程读写与本地草稿自动保存。

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
