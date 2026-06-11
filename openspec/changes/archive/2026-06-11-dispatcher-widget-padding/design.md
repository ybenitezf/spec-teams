## Context

The `dispatch_agent` tool uses `renderShell: "self"` to escape Pi's default Box frame. The `renderResult` function returns a bare `Container` with no framing — content sits flush against the left edge of the terminal with no visual padding or background tint. Other Pi extension widgets (custom messages, branch summaries, etc.) use an explicit `Box(1, 1, theme.bg("customMessageBg"))` to provide visual framing.

The wrapping point is straightforward: `renderResult` builds a Container with all children (header, task, content, metrics), then returns it. A Box can wrap that Container just before the return, applying padding and background to all states uniformly.

## Goals / Non-Goals

**Goals:**
- Add 2 cells of horizontal padding to dispatcher widget content (both edges)
- Add a subtle `customMessageBg` background tint matching Pi's extension widget convention
- Apply identical framing to both loading (partial) and final (done/error) states
- Add 1 cell of vertical padding matching Pi's custom message widget convention

**Non-Goals:**
- No state-specific logic — both states go through the same code path
- No configuration or commands for padding/background
- No changes to the dashboard grid widget (`setWidget`)
- No changes to `renderCall`, `dispatchAgent`, or the streaming pipeline
- No changes to `renderShell: "self"` or the ToolExecutionContext
- No changes to theme files or theme schema

## Decisions

### Decision 1: Wrap Container in Box vs. per-child padding

**Chosen**: Wrap the entire Container in `new Box(2, 1, bgFn)` at the return point of `renderResult`.

**Alternatives considered**:
- *Per-child padding* (set `x=2` on each Container child): Would require touching every `new Text(...)`, `new Markdown(...)`, and `new Spacer(...)` call. Error-prone, verbose, and would miss any future children.
- *Container-level padding*: Container doesn't support padding — it's a layout composition primitive. Box is the designated framing primitive.
- *Remove renderShell: "self" and use default Box frame*: Would add the default Box's border and state-dependent background colors (toolPendingBg/toolSuccessBg/toolErrorBg), which are too visually heavy. The customMessageBg tint and 2px padding are more subtle and appropriate.

**Rationale**: A single Box wrapping is the simplest change (2 lines added), applies uniformly to all states, requires no per-child modifications, and matches Pi's established pattern for extension widgets.

### Decision 2: Padding dimensions (2 horizontal, 1 vertical)

**Chosen**: `Box(2, 1, bgFn)`.

**Alternatives considered**:
- *Box(1, 1, bgFn)* (Pi's custom message convention): 1 cell horizontal padding is narrower than desired; 2 cells provides slightly more breathing room that matches Pi's internal padding conventions.
- *Box(2, 0, bgFn)*: 0 vertical padding is too compact; the existing leading blank line from `ToolExecutionComponent` alone provides insufficient visual separation.
- *Box(3, 0, bgFn)*: 3 cells horizontal is wider than Pi's custom message convention and visually inconsistent with other widgets, and 0 vertical padding is too compact.

**Rationale**: 2 cells horizontal padding matches Pi's internal padding conventions (terminal text rarely starts at column 0). 1 cell vertical padding matches Pi's custom message widget convention (`Box(1, 1, ...)`) and provides consistent visual separation above and below widget content.

### Decision 3: Background color (customMessageBg)

**Chosen**: `theme.bg("customMessageBg")` — the same token used by `CustomMessageComponent`, `BranchSummaryMessageComponent`, `CompactionSummaryMessageComponent`, and `SkillInvocationMessageComponent`.

**Alternatives considered**:
- *No background*: Would add padding but the widget would still blend into conversation text. A subtle tint helps visually distinguish dispatched sub-agent output.
- *New theme token*: Unnecessary — `customMessageBg` already encodes exactly the intent (extension-provided widget background). Creating a new token adds theme schema work for no benefit.
- *Default Box state-dependent colors* (toolPendingBg/toolSuccessBg/toolErrorBg): Too visually heavy and would require state-specific logic. The dispatcher widget is a single self-contained component, not a tool result in the default framing sense.

**Rationale**: `customMessageBg` is the established convention for extension widgets. It's guaranteed to be available (required by the theme schema), renders as a subtle eggplant tint (`#2d2838`) in dark theme and lilac (`#ede7f6`) in light theme, and provides just enough visual contrast without being distracting.

### Decision 4: Both states share identical framing

**Chosen**: No state-specific logic — the Box wraps the Container identically for `isPartial=true` and `isPartial=false`.

**Rationale**: The `isPartial` flag only controls which children are added to the Container (animated icon vs. static icon, expanded vs. collapsed content). The Box wrapping is applied after all children are added, at the return point. This is the simplest possible approach and avoids any complexity around conditional framing.

## Risks / Trade-offs

**[Content reflow at narrower width]** The Box reduces content width by `paddingX * 2 = 4` cells. Markdown content (code blocks, lists, paragraphs) will reflow at this slightly narrower width. Since `renderResult` children already set `x=0` (meaning "use parent's remaining width"), the Markdown component will automatically reflow. No manual width calculations needed.

**[Background spans full terminal width]** Box pads each rendered line to the terminal width and applies the background function, creating a colored band the full width of the terminal. This is standard Box behavior and matches how `CustomMessageComponent` and other Pi widgets render. It provides visual separation but may feel heavy at very wide terminal widths — this is acceptable and consistent with Pi's design language.

**[Empty content edge case]** If the Container has no visible output lines, `ToolExecutionComponent.render()` returns `[]` (empty array), so an empty Box band will not appear. No special handling needed.

**[Theme changes propagate correctly]** The `bgFn` passed to Box is a closure over `theme`. Box evaluates `bgFn` on every `render()` call, so theme hot-reloads pick up color changes automatically through Pi's standard invalidation chain (Box → Container → children). No special invalidation logic required.
