## MODIFIED Requirements

### Requirement: renderResult uses Container-based layout with section dividers

The `renderResult` function SHALL escape the default Box frame by using `renderShell: "self"` on the tool definition. The result SHALL be rendered as a flowing, Pi-native layout without explicit "─── Section ───" dividers. The layout SHALL consist of: a subtle agent label header (status icon, agent name, elapsed time), the task rendered as dimmed prefix text, the output rendered as flowing Markdown, thinking rendered inline between output paragraphs (when present), and a subtle single-line metrics footer.

#### Scenario: Single-agent final result with all content
- **WHEN** `renderResult` is called with a done result containing task, output, thinking, and metrics
- **AND** `options.expanded` is true
- **THEN** the rendered output is a `Container` (self-rendered, no Box frame) containing in order:
  - A header `Text` with status icon, agent name, and elapsed time (themed subtle/accent)
  - A `Text` with the task text as dimmed prefix (no "─── Task ───" divider)
  - A `Spacer`
  - A `Markdown` component rendering the output text with live syntax highlighting
  - An inline thinking block rendered with `theme.fg("thinkingText", ...)` styling, collapsible
  - A subtle single-line metrics footer: `🔧 N calls · ↑in ↓out · ctx P% · model`

#### Scenario: Final result with empty task omitted
- **WHEN** `renderResult` is called with a result where `details.task` is empty or undefined
- **THEN** the task prefix is not included in the Container
- **AND** when `details.fullOutput` is empty or undefined
- **THEN** the output Markdown is not included

#### Scenario: No Box frame visible
- **WHEN** the `dispatch_agent` tool definition sets `renderShell: "self"`
- **AND** `renderResult` renders the result
- **THEN** no default Pi Box background, border, or padding wraps the rendered output
- **AND** the rendered content appears visually integrated with the surrounding conversation

### Requirement: Output text is rendered through Markdown component

The agent output text SHALL be rendered through the `Markdown` component from `@earendil-works/pi-tui`, configured with `getMarkdownTheme()` from `@earendil-works/pi-coding-agent`. This applies to BOTH streaming (partial) and final render paths, enabling syntax highlighting for code blocks and rich formatting even during live streaming.

#### Scenario: Output with code blocks during streaming
- **WHEN** `renderResult` is called with `options.isPartial === true`
- **AND** the streaming output contains partial fenced code blocks (e.g., ```typescript ... ```)
- **THEN** the output is rendered via the `Markdown` component with syntax highlighting applied to completed code blocks
- **AND** incomplete code blocks render gracefully without errors

#### Scenario: Output with lists and formatting
- **WHEN** the agent output contains Markdown formatting (lists, bold, italic, headers)
- **THEN** the formatting is rendered correctly by the Markdown component in both partial and final views

#### Scenario: Plain text output
- **WHEN** the agent output contains no special Markdown syntax
- **THEN** the text is rendered as-is by the Markdown component without errors in both partial and final views

### Requirement: Partial streaming result uses Container layout

When `options.isPartial` is true, `renderResult` SHALL render a Container with: header (agent icon, name, elapsed), task as dimmed prefix, live output via `Markdown` component, inline thinking block (collapsed hint when not expanded, full text when expanded), and a subtle single-line metrics footer.

#### Scenario: Partial render with streaming output
- **WHEN** `options.isPartial` is true
- **AND** `details.outputText` contains streaming text
- **THEN** the output is rendered via the `Markdown` component (not plain `Text`)
- **AND** the output section has no "─── Output ───" divider
- **AND** a metrics line shows current tool count, context%, and any accumulated token counts

#### Scenario: Partial render with thinking content
- **WHEN** `options.isPartial` is true
- **AND** `details.thinkingText` is non-empty
- **THEN** thinking is rendered inline between output paragraphs, styled with `theme.fg("thinkingText", ...)`
- **AND** when collapsed, thinking shows `▶ Thinking (N lines)` as a dimmed hint
- **AND** when expanded, thinking shows the full text with Pi-native thinking theming

#### Scenario: Partial render before any output
- **WHEN** `options.isPartial` is true
- **AND** `details.outputText` is empty
- **THEN** the task is displayed as dimmed prefix text (no "─── Task ───" divider)
- **AND** the output Markdown area is not displayed

### Requirement: Expanded mode includes all sections

When `options.expanded` is true, the rendered result SHALL include all available content: header, task prefix, full untruncated output via Markdown, full thinking text (unless `hideThinkingBlock` is true), and metrics footer.

#### Scenario: Expanded result shows thinking inline and full output
- **WHEN** `options.expanded` is true
- **AND** thinking text is present in the result details
- **THEN** the full thinking text is displayed inline between output paragraphs with `theme.fg("thinkingText", ...)` styling
- **AND** the full untruncated output is displayed through Markdown
- **AND** no "─── Thinking ───" or "─── Output ───" section dividers are present

#### Scenario: Expanded result respects hideThinkingBlock
- **WHEN** `options.expanded` is true
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** thinking content shows only the collapsed hint `▶ Thinking (N lines)`
- **AND** the full thinking text is NOT displayed even in expanded mode

## ADDED Requirements

### Requirement: renderShell: "self" escapes default Box frame

The `dispatch_agent` tool definition SHALL set `renderShell: "self"` to escape Pi's default Box frame (background, padding, border). The `renderResult` function SHALL provide its own visual framing.

#### Scenario: Tool definition has renderShell self
- **WHEN** the `dispatch_agent` tool is registered with the Pi extension API
- **THEN** its definition includes `renderShell: "self"`
- **AND** the default Pi Box (with background and padding) does NOT wrap the rendered result

#### Scenario: Other modes unaffected
- **WHEN** a Pi session is running in JSON, RPC, or Print mode
- **THEN** the `renderShell: "self"` setting has no effect on the output format
- **AND** the tool result content is delivered in the mode's native format

### Requirement: Task renders as dimmed prefix text without section divider

The dispatched task/prompt SHALL be rendered as dimmed text placed between the agent label header and the output. No "─── Task ───" label or section divider SHALL be present.

#### Scenario: Task with content
- **WHEN** `renderResult` is called with a result where `details.task` is "Investigate the auth module for OAuth vulnerabilities"
- **THEN** the task text is rendered as a `Text` child with `theme.fg("dim", ...)` styling
- **AND** no label or divider precedes the task text

#### Scenario: Task empty or undefined
- **WHEN** `renderResult` is called with a result where `details.task` is empty or undefined
- **THEN** no dimmed prefix text is rendered

### Requirement: Thinking renders inline between output paragraphs

Thinking content SHALL be rendered inline within the output flow using `theme.fg("thinkingText", ...)` for Pi-native thinking theming. Thinking SHALL NOT be rendered in a separate labeled section. When collapsed, a `▶ Thinking (N lines)` hint SHALL be shown. When expanded, the full thinking text SHALL be displayed with dimmed styling.

#### Scenario: Thinking inline in final result
- **WHEN** `renderResult` is called for a final result with `options.expanded === true`
- **AND** `details.thinkingText` is non-empty
- **THEN** thinking text is rendered inline between the output Markdown and the metrics footer
- **AND** thinking text uses `theme.fg("thinkingText", ...)` for consistent Pi-native styling
- **AND** no "─── Thinking ───" section divider is present

#### Scenario: Thinking inline in partial result
- **WHEN** `renderResult` is called for a partial result with `options.isPartial === true`
- **AND** `details.thinkingText` is non-empty
- **THEN** thinking is rendered inline, collapsed as `▶ Thinking (N lines)` when not expanded
- **AND** thinking uses `theme.fg("thinkingText", ...)` theming

#### Scenario: No thinking text
- **WHEN** `details.thinkingText` is empty or undefined
- **THEN** no thinking block or hint is rendered
- **AND** the output flows directly to the metrics footer

### Requirement: Metrics footer is a subtle single line

The metrics information SHALL be rendered as a single-line footer with space-separated fields, using muted theming. The format SHALL be: `🔧 N calls · ↑in ↓out · ctx P% · model`. Unlike the previous section-divided metrics, no "─── Metrics ───" divider SHALL be present.

#### Scenario: Metrics footer with all fields present
- **WHEN** the result details contain tool count, token counts, cost, context %, and model
- **THEN** the footer renders as a single `Text` line: `🔧 5 calls · ↑12k ↓3.0k · $0.0520 · ctx 21% · claude-sonnet-4`
- **AND** the footer uses muted/dim theming
- **AND** no section divider precedes the footer

#### Scenario: Metrics footer with missing optional fields
- **WHEN** model information is not available
- **THEN** the model segment is omitted from the footer line

#### Scenario: Metrics footer in partial view
- **WHEN** `options.isPartial` is true
- **THEN** the metrics footer shows current accumulated values (tool count, context %) with the same single-line format
