## MODIFIED Requirements

### Requirement: renderResult uses Container-based layout with Box wrapper

The `renderResult` function SHALL escape the default Box frame by using `renderShell: "self"` on the tool definition. The result SHALL be rendered as a `Container` wrapped in an explicit `Box(2, 1, theme.bg("customMessageBg"))`, providing 2 cells of horizontal padding, 1 cell vertical padding, and a subtle `customMessageBg` background tint. The Container layout SHALL consist of: a subtle agent label header (status icon, agent name, elapsed time), the task rendered as dimmed Markdown prefix, the output and thinking rendered interleaved in stream order (each as flowing Markdown), and a subtle single-line metrics footer.

#### Scenario: Single-agent final result with all content
- **WHEN** `renderResult` is called with a done result containing task, output, thinking, and metrics
- **AND** `options.expanded` is true
- **THEN** the rendered output is a `Box(2, 1, theme.bg("customMessageBg"))` wrapping a `Container` containing in order:
  - A header `Text` with status icon, agent name, and elapsed time (themed subtle/accent)
  - A `Markdown` component with the task text as dimmed prefix (no "─── Task ───" divider)
  - Interleaved output and thinking segments rendered in stream order, each as `Markdown`:
    - Text segments: `Markdown` with default Markdown theme
    - Thinking segments: `Markdown` with `thinkingText` color + italic
  - A subtle single-line metrics footer: `🔧 N calls · ↑in ↓out · ctx P% · model`

#### Scenario: Final result with empty task omitted
- **WHEN** `renderResult` is called with a result where `details.task` is empty or undefined
- **THEN** the task prefix is not included in the Container
- **AND** when there are no content segments
- **THEN** the content area is not included

#### Scenario: Box wrapper provides padding and background
- **WHEN** the `dispatch_agent` tool definition sets `renderShell: "self"`
- **AND** `renderResult` renders the result
- **THEN** the rendered output is wrapped in an explicit `Box(2, 1, theme.bg("customMessageBg"))`
- **AND** content is indented 2 cells from each terminal edge (4 cells total width reduction)
- **AND** content has 1 cell of vertical padding above and below
- **AND** a subtle `customMessageBg` background tint spans the full terminal width behind the widget
- **AND** both loading (partial) and final (done/error) states receive identical Box wrapping
- **AND** no default Pi Box (with border, toolPendingBg/toolSuccessBg/toolErrorBg) wraps the rendered output

### Requirement: renderShell: "self" escapes default Box frame

The `dispatch_agent` tool definition SHALL set `renderShell: "self"` to escape Pi's default Box frame (background, padding, border). The `renderResult` function SHALL provide its own visual framing via an explicit `Box(2, 1, theme.bg("customMessageBg"))`.

#### Scenario: Tool definition has renderShell self
- **WHEN** the `dispatch_agent` tool is registered with the Pi extension API
- **THEN** its definition includes `renderShell: "self"`
- **AND** the default Pi Box (with border and state-dependent background colors) does NOT wrap the rendered result
- **AND** the explicit custom Box wrapper (with customMessageBg background and 2-cell horizontal padding) IS applied

#### Scenario: Other modes unaffected
- **WHEN** a Pi session is running in JSON, RPC, or Print mode
- **THEN** the `renderShell: "self"` setting and the explicit Box wrapper have no effect on the output format
- **AND** the tool result content is delivered in the mode's native format
