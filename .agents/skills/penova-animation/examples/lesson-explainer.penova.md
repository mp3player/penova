---
title: How Large Language Models Work
aspectRatio: 16:9
subtitles: auto
---

=== scene ===
title: From Tokens to Answers
theme: chalkboard
layout: flow-horizontal
camera: auto-follow
hand: hand-chalk
transition: chalkboard-eraser
transitionDuration: 1100
---
[root] Prompt Text | Raw user question {color: yellow, shape: circle, say: "Every LLM response begins when plain text enters the pipeline.", pause: 700}
[step] Tokenizer | Split into subword IDs {color: cyan, shape: rounded, say: "First, text is broken into compact numerical tokens."}
[step] Transformer | Contextual attention {color: green, shape: rounded, say: "Next, self-attention weighs how every token relates to every other."}
[highlight] Next Token | Autoregressive loop {color: orange, shape: underline, say: "Finally, the model predicts the most likely next token, one step at a time.", pause: 1100}

Prompt Text -> Tokenizer : Encode
Tokenizer -> Transformer : Embed
Transformer -> Next Token : Sample

=== scene ===
title: Inside a Transformer Block
theme: blueprint
layout: mindmap
camera: progressive-fit
hand: hand-chalk
transition: page-turn
---
[root] Self-Attention | Core mechanism {color: yellow, shape: circle, say: "Inside each Transformer layer, attention computes three projections."}
[concept] Query (Q) | What am I looking for? {color: cyan, shape: rounded, say: "The Query vector asks what context a token needs."}
[concept] Key (K) | What do I represent? {color: green, shape: rounded, say: "Keys advertise what information each token holds."}
[highlight] Value (V) | Weighted readout {color: orange, shape: diamond, say: "Values carry the payload blended according to attention scores.", pause: 900}
[note] Feed-Forward | Per-token refinement {color: pink, shape: cloud, say: "A feed-forward MLP then transforms each representation independently."}

Self-Attention -> Query (Q)
Self-Attention -> Key (K)
Self-Attention -> Value (V)
Self-Attention -> Feed-Forward

=== scene ===
title: Three Stages of Training
theme: whiteboard
layout: concept-graph
camera: auto-follow
hand: hand-minimal
transition: crossfade
---
[step] Web Corpus | Trillions of tokens {color: cyan, shape: rounded, group: 1. Pre-training, say: "Pre-training teaches grammar and world knowledge via next-token prediction."}
[concept] Instruction Pairs | Human demonstrations {color: green, shape: rounded, group: 2. Post-training, say: "Supervised fine-tuning aligns answers to helpful assistant formats."}
[highlight] Preference & RL | Reasoning & safety {color: orange, shape: diamond, group: 2. Post-training, say: "Reinforcement learning sharpens multi-step reasoning and safety boundaries.", pause: 1000}

Web Corpus -> Instruction Pairs : Fine-tune
Instruction Pairs -> Preference & RL : Align

=== scene ===
title: Key Takeaways
theme: letter-paper
layout: document
camera: pen-follow
hand: hand-chalk
---
## Key Mental Model,

>> An LLM does not retrieve fixed paragraphs from a database. Instead, it compresses patterns across billions of examples and synthesizes each token fresh from context. {say: "Remember the core takeaway: LLMs synthesize answers token by token from context.", pause: 1200}

---

> Generated with Penova
> Text -> Timeline -> 1080P Video
