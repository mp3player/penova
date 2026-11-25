# Penova Studio UI Architecture & Evolution Design (Internal Developer Doc)

> **Audience**: Penova core maintainers. This document captures architectural decisions, strict Engine/UI boundaries, cleanup debt, and the future shell roadmap. It is intentionally internal and separate from user-facing plugin specs (`PLUGIN_SPEC*.md`).

---

## 1. Core Philosophy

### Keep UI Permanently Thinner Than the Engine

The Studio shell exists solely to project Engine capabilities into the browser—never to accumulate domain logic, parallel data models, or IDE-style layout engines.

### Strict One-Way Dependency (`UI -> Engine`)

- **Headless Core (`src/model/`, `src/sdk/`, `src/engine/`, and plugin definitions in `src/plugins/`)**:
  - Must remain **100% free of DOM, React, or UI layout vocabulary** (`rows`, `placeholder`, `label`, `span`, context menus, drawer states). (Only `src/plugins/useRegistryList.ts` imports React's `useSyncExternalStore`, and `scripts/bundle-skill.py` explicitly excludes it.)
  - Must remain compatible with **Node 22 native TypeScript type-stripping** (no `@decorator`, `enum`, `namespace`, parameter properties, or colliding exported type names).
- **Browser Studio Layer (`src/studio/`, `src/components/`, `src/hooks/`, `src/i18n/`)**:
  - Observes Engine registries unilaterally (`UI -> Engine`).
  - Deleting `src/studio/` and `src/components/` in their entirety must leave all headless tests, layout/timeline compilers, SVG/TAR exporters, and `scripts/bundle-skill.py` 100% functional.

### Explicit Opt-In, No Implicit Fallback (Unreal `UPROPERTY` Semantics)

Analogous to C++ members vs. `UPROPERTY(EditAnywhere)` in Unreal Engine:

- **Opt-In with `defineProps` / `propFields`**: A plugin declares pure-data property descriptors in `src/sdk/propSchema.ts` only when it wants Studio property projection, two-way editing, reset-to-default, and automatic `--spec` documentation.
- **Pure Headless Without UI Declarations**: A plugin that does **not** need Studio UI simply omits `propFields` and reads `node.props` (or custom state) directly. Engine compilation, `.penova.md` script parsing, and headless export work without any restriction.
- **No Fabricated Fallback UI**: When a plugin intentionally declares no `propFields` and no `studioNodeUiRegistry` customization, Studio must **not** invent a cluttered raw key-value fallback editor. Declare what should appear; omit what should stay headless.

---

## 2. Current Implemented Baseline & Known Cleanup Debt

### Already Implemented

| Layer / File | Status & Responsibility |
| :--- | :--- |
| `src/sdk/propSchema.ts` | Headless `defineProps`, `prop.string/number/boolean/enum` with non-nullable `InferPropValues<S>` for defaulted fields, open `PropDataFormat`, pure `when(values)` conditional visibility predicates, symmetric `readPropBySchema` / `writePropBySchema`, explicit empty-string preservation for defaulted text fields. |
| `src/studio/propControls.tsx` | `propControlRegistry` registering primitive (`string`, `plain`, `number`, `boolean`) and semantic (`multiline`, `code`, `svg`, `enum`, `color`, `icon-id`, `shape-id`, `node-ref`) controls, plus 3-tier resolution (`fieldControls[key]` → `fieldHints[key].controlId` / `field.format` → `field.type`). |
| `src/studio/uiRegistry.ts` | Pure `studioNodeUiRegistry` with **zero hardcoded built-in visual plugin overrides** (`code`, `chart`, `sketch`, `icon` render purely from headless `propFields`). |
| `src/studio/nodeSchemas.tsx` | Unified `resolveNodeSchemaBinding`, `readInlineNodeText` / `writeInlineNodeText`, core IR schemas (`core:text`, `core:shape`, `core:connector`, `core:card`, `core:group`), namespaced synthetic keys (`$name`, `$color`, `$zone`, `$say`, `$pause`, `$supportsGroups`), divider height defaults, and connector self-loop guards. |
| `src/components/sidebar/NodeInspector.tsx` | Single schema-driven 2-column inspector using dedicated React Fiber hosts (`PropControlHost`, `ExtraSectionHost`) + `WeakMap` renderer keys so controls with hooks never violate Rules of Hooks. All 5 legacy per-type inspector files removed. |
| `src/components/SidebarEditor.tsx` | Removed hardcoded 4-button core IR creation row and hardcoded `Widgets` creation grid; only outline tree, scene title, script tab, and media tab remain. |

### Known Cleanup Debt (Aligned with "No Implicit Fallback")

- **`NodeInspector` Raw-Props Fallback**: `src/components/sidebar/NodeInspector.tsx` still renders the collapsible `Advanced Raw Properties (props)` key-value fallback editor (`RawPropValueInput`, `parsePropValue`, `showRawProps`, `newKey`, `newVal`, `rawEntries`) for custom nodes, and `src/studio/nodeSchemas.tsx` exposes `showRawProps` / `hasPluginSchema` for it.
  - **Planned Cleanup**: Remove that fallback block completely during the next UI shell pass so undeclared properties are never guessed or exposed via ad-hoc key-value rows.

---

## 3. Target Studio Shell Architecture (3 Orthogonal Primitives)

When the next Studio UI pass begins, the shell should converge on **three orthogonal primitives** rather than bespoke per-panel widgets:

### Primitive 1 — Unified Selection (`StudioSelection`)

Replace standalone `selectedNodeId: string | null` with a single discriminated union:

```ts
export type StudioSelection =
  | { kind: 'none' }
  | { kind: 'node'; nodeId: string }
  | { kind: 'scene'; sceneIndex: number }
  | { kind: 'transition'; sceneIndex: number };
```

Shortcuts, context menus, and the right-hand Inspector all read this single selection state, eliminating scattered `if/else` branching across components.

### Primitive 2 — Right Contextual On-Demand Inspector Slot

Move property editing **out of the left `NodeTree` rows** and into an on-demand **right-side contextual projection slot** (`~280px`):

- **Left Panel (`Outline` / `Script` / `Media`)**: Pure hierarchy list, script editor, and subtitle/audio tracks—compact and stable with zero row-expansion jumpiness.
- **Right Inspector Slot**: Projects the active `StudioSelection`'s declared `propFields` via `propControlRegistry`:
  - `kind: 'none'` → hidden by default (maximizing stage canvas space), or optionally projecting scene-level properties.
  - `kind: 'node'` → projects `core:*` or `SceneNodePlugin.propFields`. If a custom node has neither `propFields` nor `studioNodeUiRegistry` overrides (`fields.length === 0` and no `renderExtra`), nothing is fabricated.
  - `kind: 'scene'` / `'transition'` (optional Phase 3) → projects scene or transition plugin parameters via the exact same schema renderer.
- **Zero-Complexity Responsiveness**: On narrower viewports (`< 1280px`), switch the right Inspector via CSS alone into a floating right drawer (`position: absolute; right: 0`) so canvas auto-fit zoom never reflows.

### Primitive 3 — Unified Command & Context Menu Registry (`studioCommandRegistry`)

Keep node creation and contextual actions out of fixed chrome by converging on one browser-side command registry:

```ts
export interface StudioCommandContext {
  target: 'canvas' | 'node' | 'tree-node' | 'toolbar';
  selection: StudioSelection;
  scene: LessonScene;
  layout: LayoutPlugin;
  node?: SceneNode;
}

export interface StudioCommand {
  id: string;
  group: 'create' | 'node' | 'canvas' | 'view';
  labelKey?: MessageKey;
  label?: string;
  shortcut?: string;
  when(ctx: StudioCommandContext): boolean;
  run(ctx: StudioCommandContext): void;
}
```

- **One Registry, Multiple Surfaces**:
  - **Canvas blank right-click & single discoverable `+` button**: Collect `group === 'create'` where `when(ctx)` is true (no duplicated button grids).
  - **Node / tree-row right-click**: Collect `group === 'node'` commands (`Duplicate`, `Delete`, `Move Up/Down`, plus optional plugin actions).
  - **Keyboard shortcuts**: Dispatch through the same `run(ctx)` handlers.
- **Layout Capability Filtering (Headless-Safe)**:
  - Layout plugins already expose `supportsEdges` and `supportsGroups`. If finer filtering is needed later (for example, hiding unsupported core IR nodes or surfacing only domain widgets), add an optional pure-data whitelist to `LayoutPlugin` in `src/plugins/contracts.ts`:
    ```ts
    supportedNodeKinds?: readonly string[];
    ```
  - Omitting it preserves full backward compatibility; setting it lets `studioCommandRegistry` filter `create` entries cleanly without Layout plugins knowing anything about menus or React.

---

## 4. Hard Guardrails (Explicit Non-Goals)

1. **No Engine -> UI Back-Edges**: Headless packages must never import from `src/studio/` or `src/components/`.
2. **No Freeform Docking / Nested Layout DSLs**: Shell topology stays permanently fixed and shallow (TopBar, Left Structure, Center Stage + Timeline/SceneStrip, Right On-Demand Inspector). Plugins populate fields, controls, or commands—they never spawn arbitrary floating panels or custom window splits.
3. **No Implicit Fallback Forms**: Plugins without `propFields` or `studioNodeUiRegistry` extensions stay UI-less without raw key-value scaffolding.
4. **Zero Heavy State Dependencies**: Keep using `PluginRegistry` + React's built-in `useSyncExternalStore`.

---

## 5. Phased Implementation Roadmap

### Phase 1 — Pure Opt-In Cleanup & Right On-Demand Inspector
1. Remove the legacy `Advanced Raw Properties` fallback from `src/components/sidebar/NodeInspector.tsx` and drop `showRawProps` / `hasPluginSchema` from `src/studio/nodeSchemas.tsx`.
2. Detach `NodeInspector` from inside `NodeTree.tsx` rows and mount it in a collapsible/on-demand right Inspector rail (`App.tsx` / `StudioShell`), auto-hiding when no editable schema is active and overlaying on viewports `< 1280px`.
3. Verify zero regressions in canvas selection, timeline reveal, undo/redo, and Vitest suite.

### Phase 2 — `studioCommandRegistry` & Unified Context Menu
1. Create `src/studio/commandRegistry.ts` (`studioCommandRegistry`) and a lightweight portal/popover `ContextMenu` component.
2. Add optional `supportedNodeKinds?: readonly string[]` on `LayoutPlugin` (`src/plugins/contracts.ts`) and wire capability checks (`supportsEdges`, `shapeRegistry.list().length > 0`, `sceneNodeRegistry.list()`) inside Studio's `create` commands.
3. Attach context menu triggers to canvas background, canvas nodes, `NodeTree` rows, and one clean `+` button sharing the exact `create` subset.

### Phase 3 (Optional) — Expand `StudioSelection` to Scene & Transition
1. Unify `selectedNodeId` into `StudioSelection` (`none | node | scene | transition`).
2. Optionally allow `TransitionPlugin` / `LayoutPlugin` / `ExportPlugin` / `Scene` settings to declare `propFields` and render cleanly inside the same right-hand Inspector.
