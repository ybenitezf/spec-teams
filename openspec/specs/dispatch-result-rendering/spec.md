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

### Requirement: renderCall shows agent name, model, and task preview

The `renderCall` function SHALL display the agent name, optional model information, and a truncated task preview using themed formatting consistent with the subagent example pattern.

#### Scenario: renderCall with model available
- **WHEN** `renderCall` is called with args containing `agent: "explore"` and `task: "Investigate the codebase..."`
- **AND** model information is available in the agent definition
- **THEN** the rendered text includes `dispatch_agent` (bold, themed toolTitle), the agent name (themed accent), model in parentheses if available, and a truncated task preview (themed dim)

#### Scenario: renderCall with task exceeding 60 characters
- **WHEN** the task string exceeds 60 characters
- **THEN** the displayed task preview is truncated to 57 characters followed by `...`

### Requirement: truncation marker for collapsed final output

When `options.expanded` is false, text content SHALL be truncated to 4000 cumulative characters across interleaved text segments, with a `\n... [truncated]` marker appended to the last rendered text segment. Thinking segments SHALL NOT count toward the 4000-character limit. When a text segment would exceed the remaining character allowance, it SHALL be sliced to fit and no further segments (text or thinking) SHALL be rendered. When `options.expanded` is true, the full untruncated interleaved output SHALL be shown.

#### Scenario: Collapsed text exceeds 4000 characters across interleaved segments
- **WHEN** `options.expanded` is false
- **AND** `orderedContent` contains two text segments of 2500 characters each, with a thinking segment between them
- **THEN** the first text segment (2500 chars) is rendered via Markdown
- **AND** the thinking segment is rendered via Markdown with thinkingText color + italic (not counted toward limit)
- **AND** the second text segment is truncated to 1500 characters (4000 - 2500 remaining)
- **AND** `\n... [truncated]` is appended to the truncated second segment
- **AND** no further segments after the truncation point are rendered

#### Scenario: Collapsed text under 4000 characters shows full interleaved content
- **WHEN** `options.expanded` is false
- **AND** cumulative text characters across all segments total 3000
- **THEN** all text and thinking segments are rendered interleaved in stream order
- **AND** no truncation marker is appended
- **AND** the output is structurally identical to the live/expanded rendering (same segment order, same spacers)

#### Scenario: Truncation occurs mid-segment in a text block
- **WHEN** `options.expanded` is false
- **AND** the first text segment contains 4200 characters
- **THEN** the segment is rendered as Markdown with only the first 4000 characters
- **AND** `\n... [truncated]` is appended
- **AND** no subsequent segments (text or thinking) are rendered

#### Scenario: Only thinking segments after truncation cutoff
- **WHEN** `options.expanded` is false
- **AND** the last text segment reaches the 4000-char limit, causing truncation
- **AND** a thinking segment follows the truncated text segment
- **THEN** the thinking segment is NOT rendered (no orphan thinking after text truncation)

#### Scenario: Expanded output shows full untruncated content
- **WHEN** `options.expanded` is true
- **THEN** the full interleaved content is rendered without truncation
- **AND** all text and thinking segments are displayed in stream order regardless of character count

### Requirement: Expanded mode includes all sections

When `options.expanded` is true, the rendered result SHALL include all available content: header, task prefix as dimmed Markdown, all content segments interleaved in stream order via Markdown (thinking with thinkingText color + italic), and metrics footer.

#### Scenario: Expanded result shows thinking inline and full output
- **WHEN** `options.expanded` is true
- **AND** thinking content is present in the result details
- **THEN** thinking segments are rendered as `Markdown` with `thinkingText` color + italic, interleaved between text segments in stream order
- **AND** the full untruncated output is displayed
- **AND** no "─── Thinking ───" or "─── Output ───" section dividers are present

#### Scenario: Expanded result respects hideThinkingBlock
- **WHEN** `options.expanded` is true
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** thinking content shows only the collapsed hint `▶ Thinking (N lines)`
- **AND** the full thinking text is NOT displayed even in expanded mode

### Requirement: Partial streaming result uses Container layout

When `options.isPartial` is true, `renderResult` SHALL render a Container with: header (agent icon, name, elapsed), task as dimmed Markdown prefix, live output and thinking segments interleaved via `Markdown` component (thinking with thinkingText color + italic, collapsed when hideThinkingBlock is true), and a subtle single-line metrics footer.

#### Scenario: Partial render with streaming output
- **WHEN** `options.isPartial` is true
- **AND** ordered content segments contain text output
- **THEN** text segments are rendered via the `Markdown` component (not plain `Text`)
- **AND** thinking segments are rendered as `Markdown` with `thinkingText` color + italic (or collapsed hint when hiding)
- **AND** no "─── Output ───" divider is present
- **AND** a metrics line shows current tool count, context%, and any accumulated token counts

#### Scenario: Partial render with thinking content
- **WHEN** `options.isPartial` is true
- **AND** ordered content segments contain thinking segments
- **THEN** thinking segments are rendered interleaved between text segments in stream order
- **AND** when collapsed, a single `▶ Thinking (N lines)` hint replaces all thinking segments
- **AND** when expanded and hideThinkingBlock is false, thinking segments are rendered as `Markdown` with `thinkingText` color + italic

#### Scenario: Partial render before any output
- **WHEN** `options.isPartial` is true
- **AND** ordered content segments are empty
- **THEN** the task is displayed as dimmed Markdown prefix text (no "─── Task ───" divider)
- **AND** the output Markdown area is not displayed

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

### Requirement: Task renders as dimmed Markdown prefix without section divider

The dispatched task/prompt SHALL be rendered as dimmed Markdown placed between the agent label header and the output. No "─── Task ───" label or section divider SHALL be present. Task text SHALL be parsed through the `Markdown` component so that formatting (bold, code spans, lists) is displayed correctly.

#### Scenario: Task with content
- **WHEN** `renderResult` is called with a result where `details.task` is "Investigate the `auth` module for **OAuth** vulnerabilities:\n- Check tokens\n- Verify sessions"
- **THEN** the task text is rendered as a `Markdown` child with `{color: (text) => theme.fg("dim", text)}` styling
- **AND** code spans, bold text, and list items are rendered as formatted Markdown (not raw syntax)
- **AND** no label or divider precedes the task text

#### Scenario: Task with plain text (no markdown)
- **WHEN** `renderResult` is called with a result where `details.task` is "Fix the login bug"
- **THEN** the task text is rendered as a `Markdown` child with dimmed styling
- **AND** the plain text renders identically to how `Text` would have displayed it (no regressions for plain text)

#### Scenario: Task empty or undefined
- **WHEN** `renderResult` is called with a result where `details.task` is empty or undefined
- **THEN** no dimmed prefix text is rendered

### Requirement: Output and thinking are interleaved in stream order

Content rendered between the task prefix and the metrics footer SHALL be ordered in stream order — as the sub-agent emitted text and thinking deltas — rather than grouped by type. Text segments SHALL be rendered as `Markdown` with the default Markdown theme. Thinking segments SHALL be rendered as `Markdown` with `thinkingText` color + italic styling, matching native Pi's `AssistantMessageComponent`. A blank line separator (`Spacer(1)`) SHALL be inserted between consecutive segments of different types (text → thinking or thinking → text) to visually separate distinct content types.

#### Scenario: Interleaved final result
- **WHEN** a sub-agent emits: text delta → thinking delta → text delta
- **THEN** `renderResult` renders: Markdown(text1) → Spacer(1) → Markdown(thinking, thinkingText+italic) → Spacer(1) → Markdown(text2)
- **AND** thinking appears between the two text blocks, not after all text
- **AND** blank lines separate the thinking block from the surrounding text blocks

#### Scenario: Multiple consecutive text deltas merged
- **WHEN** a sub-agent emits: text delta → text delta → thinking delta → text delta
- **THEN** consecutive text deltas are merged into a single text segment
- **AND** the thinking segment is rendered between the merged text and the final text segment
- **AND** a blank line separator is inserted between the merged text and the thinking segment, and between the thinking segment and the final text segment (type-change boundaries)
- **AND** no blank line separator is inserted between the merged consecutive text deltas (same type)

#### Scenario: Stream order preserved with empty segments filtered
- **WHEN** ordered content contains segments with empty `content` strings
- **THEN** empty segments are skipped during rendering
- **AND** the remaining segments preserve their relative order
- **AND** blank line separators are still inserted between remaining segments of different types (the separator is based on the types of consecutive non-empty rendered segments)

### Requirement: Thinking renders as Markdown with thinkingText color and italic

Thinking content SHALL be rendered through the `Markdown` component with `thinkingText` color and italic styling, matching native Pi's treatment of thinking content. This applies to both full thinking text and individual interleaved thinking segments. Code spans, bold, lists, and other Markdown formatting within thinking SHALL be parsed and rendered correctly.

#### Scenario: Thinking with code spans and lists
- **WHEN** thinking content contains "Let me check `auth.ts`:\n- Token validation\n- Session handling"
- **THEN** the thinking is rendered as `Markdown` with `{color: theme.fg("thinkingText", ...), italic: true}`
- **AND** `auth.ts` is rendered with code span formatting (not as raw backtick text)
- **AND** the list items are rendered with bullet formatting (not as raw dash text)

#### Scenario: Thinking with bold text
- **WHEN** thinking content contains "**Important:** this must be verified"
- **THEN** "Important:" is rendered in bold with thinkingText color + italic
- **AND** the raw `**` syntax is not visible

#### Scenario: Thinking in partial render
- **WHEN** `options.isPartial` is true
- **AND** thinking segments are present
- **THEN** when hideThinkingBlock is false, thinking segments are rendered as `Markdown` with thinkingText color + italic
- **AND** when hideThinkingBlock is true, a collapsed `▶ Thinking (N lines)` hint replaces all thinking segments

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
