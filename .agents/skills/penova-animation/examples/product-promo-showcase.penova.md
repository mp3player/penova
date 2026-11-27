---
title: Penova — 写一段脚本，直接画出你的想法
aspectRatio: 16:9
subtitles: auto
---

=== scene ===
title: 01 · 一段文本，自动长出整场手绘大片
theme: blueprint
layout: flow-horizontal
camera: auto-follow
hand: hand-chalk
spotlight: true
pacing: crisp
font: wenkai
transition: chalkboard-eraser
transitionDuration: 950
---
[node:code#script] ScriptInput {color: cyan, title: "lesson.penova.md", lines: "theme: blueprint\nA[代码逻辑] -> B[架构图]\nB -> C[1080P 视频]", highlight: "2", highlightColor: yellow, w: 300, say: "写几行纯文本脚本，描述你想讲的结构和重点。"}
[concept#engine] Penova 引擎 | 汉字真笔顺 · 智能运镜 {color: yellow, shape: circle, icon: spark, say: "Penova 自动完成排版、真实汉字笔顺拆解与镜头追踪。"}
[step#video] 1080P 成片 | 24fps 直出 · 零剪辑 {color: green, shape: rounded, icon: rocket, pause: 650, say: "无需 AE 关键帧，一键直接生成高清手绘讲解视频。"}
[node:annotate#focus] Focus {style: circle, target: "#engine", label: "全自动编排", color: pink, pad: 12, pause: 450}
#script -> #engine : 声明式编译
#engine -> #video : 逐笔合成 {color: yellow}

=== scene ===
title: 02 · 不止静态板书：公式与数据画完自己动起来
theme: chalkboard
layout: flow-horizontal
camera: auto-follow
hand: hand-chalk
pacing: crisp
font: wenkai
transition: chalkboard-eraser
transitionDuration: 950
---
[node:wave#fourier] 傅里叶叠加 {color: cyan, title: "公式驱动：傅里叶逐阶逼近方波", type: fourier, harmonics: 5, freq: 1.5, speed: 1.0, w: 325, h: 205, say: "更酷的是，写上傅里叶级数，波形画完就会从基波逐阶叠加逼近方波。"}
[node:wave#signal] 实时曲线 {color: green, title: "数据驱动：吞吐波动流", values: "18,28,24,52,74,60,34,46,82,92,64,30", speed: 1.25, w: 325, h: 205, say: "也可以直接传入监控指标序列，画完自动平滑滚动。"}
[node:chart#metrics] 多期指标 {color: orange, title: "统计进化：三阶段实测对比", frames: "22,45,70,96 | 64,88,42,74 | 94,58,86,48", labels: "Q1,Q2,Q3,Q4", speed: 1.15, highlight: 3, w: 325, h: 205, pause: 1500, say: "多组统计数据画完后还会同步联动变化，趋势一目了然。"}
#fourier -> #signal : 公式与数据双引擎
#signal -> #metrics : 画完即动 {color: yellow}

=== scene ===
title: 03 · 复杂架构与知识图谱，一键分区清晰呈现
theme: whiteboard
layout: concept-graph
camera: progressive-fit
hand: hand-chalk
spotlight: true
pacing: crisp
font: wenkai
transition: page-turn
transitionDuration: 950
---
[concept#user] 用户提问 | 自然语言意图 {color: cyan, icon: user, group: "提问与检索", say: "面对复杂架构图，系统还能按区域分组并智能避障连线。"}
[step#kb] 向量知识库 | 实时语义召回 {color: green, shape: rounded, icon: database, group: "提问与检索"}
[concept#rerank] 上下文重排 | 精选高相关证据 {color: yellow, shape: rounded, icon: layers, group: "推理与生成"}
[highlight#llm] 回答生成 | 严格引用溯源 {color: orange, shape: circle, icon: brain, group: "推理与生成", pause: 650, say: "配合聚光灯和重点标注，观众视线永远跟着重点走。"}
[node:annotate#rag-mark] Cite {style: underline, target: "#llm", label: "有据可查", color: pink, pad: 10, pause: 450}
#user -> #kb : 语义检索
#kb -> #rerank : 召回片段
#rerank -> #llm : 注入 Prompt {color: orange}

=== scene ===
title: 04 · 写给每一个热爱表达的人
theme: letter-paper
layout: document
camera: pen-follow
hand: hand-chalk
pacing: natural
font: kaiti-stroke
transition: crossfade
transitionDuration: 700
---
# 致创作者
## 写给每一个热爱表达的人： {color: orange, say: "切换信纸楷书真笔顺，还可以把任何思路写成一封温润的手写信。"}
>> 好的想法，值得被一笔一画地看见。 {pause: 600}
---
> Penova · 开源手绘动画引擎 {color: orange, bold: true, pause: 1100, say: "把繁琐动效交给 Penova，专注讲好你的故事。"}
