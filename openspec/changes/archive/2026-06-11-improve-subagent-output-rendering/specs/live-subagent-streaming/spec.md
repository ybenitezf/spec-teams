## MODIFIED Requirements

### Requirement: Live updates are throttled to 250ms

The bridge between sub-agent streaming events and the `onUpdate` callback SHALL throttle updates such that `onUpdate` is called at most once every 50ms. The first streaming delta SHALL trigger an immediate update (no initial delay).

#### Scenario: First delta triggers immediate update
- **WHEN** the first streaming event (text_delta or thinking_delta) is received from the sub-agent process
- **THEN** `onUpdate` is called immediately without waiting for the throttle interval

#### Scenario: Rapid deltas are throttled at 50ms
- **WHEN** multiple streaming events arrive within a 50ms window
- **THEN** `onUpdate` is called at most once during that 50ms window
- **AND** the update reflects the latest accumulated state at the time of the call

#### Scenario: State accumulates between throttled calls
- **WHEN** streaming events arrive faster than the 50ms throttle interval
- **THEN** all text content from the events is accumulated in `textChunks`
- **AND** the next `onUpdate` call includes all accumulated content

### Requirement: renderResult renders live partial state

When `renderResult` is called with `options.isPartial === true`, it SHALL render a live progress display using `renderShell: "self"` escaping the Box frame. The partial display SHALL include: agent icon and name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete original task/prompt displayed as dimmed prefix text (no "─── Task ───" divider), the full accumulated streaming text output rendered via the `Markdown` component (with syntax highlighting applied to completed code blocks), a collapsed thinking hint rendered inline between output paragraphs if thinking content is present and `hideThinkingBlock` is not active, and a subtle single-line metrics footer.

#### Scenario: Partial render with streaming output via Markdown
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains streaming text output
- **THEN** the rendered output is a self-rendered Container (no Box) with header, task prefix, Markdown output, and metrics line
- **AND** the header includes the agent icon (`●`), agent name, and elapsed time in human-readable format (e.g., "45s", "2m 30s")
- **AND** the output section renders the accumulated streaming text as a `Markdown` component (not plain `Text`)
- **AND** code blocks within the streaming output receive syntax highlighting where parsing is complete
- **AND** no "─── Output ───" divider is present

#### Scenario: Partial render before any output shows full task
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** no streaming text output has been received yet
- **THEN** the rendered output includes the task as dimmed prefix text (no truncation, no divider)
- **AND** the output Markdown area is omitted

#### Scenario: Partial render with thinking content inline
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains thinking text
- **THEN** thinking content is shown as a collapsed hint `▶ Thinking (N lines)` rendered inline between output and metrics
- **AND** thinking text uses `theme.fg("thinkingText", ...)` theming
- **AND** the full thinking text is NOT displayed in the partial view unless expanded

### Requirement: Final renderResult shows task and output

When `renderResult` is called with `options.isPartial === false` (or `isPartial` absent), the rendering SHALL use `renderShell: "self"` escaping the Box frame. The rendering SHALL display: a status icon (`✓` or `✗`), agent name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete input task as dimmed prefix text (no "─── Task ───" divider), the final output rendered through the `Markdown` component (truncated to 4000 characters in normal mode, full when expanded via Ctrl+O), thinking rendered inline between output paragraphs (collapsed hint when not expanded, full text when expanded, respecting `hideThinkingBlock`), and a subtle single-line metrics footer.

#### Scenario: Final render with done status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent completed successfully
- **THEN** the rendered output is a self-rendered Container with: header (`✓ {agent} {formatted-duration}`), dimmed task prefix, Markdown output, inline thinking (if present), and metrics footer
- **AND** no "─── Output ───" or "─── Thinking ───" dividers are present
- **AND** expansion (Ctrl+O) shows the full untruncated output through `Markdown`

#### Scenario: Final render with error status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent encountered an error
- **THEN** the rendered header includes `✗ {agent} {formatted-duration}` (e.g., "✗ explore 2m 30s")
- **AND** the output renders the error content through `Markdown`, truncated to 4000 characters
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render includes inline thinking
- **WHEN** `renderResult` is called for a final result
- **AND** `details.thinkingText` is non-empty
- **THEN** when `options.expanded` is false, thinking shows `▶ Thinking (N lines)` hint inline
- **AND** when `options.expanded` is true, the full thinking text is displayed inline with `theme.fg("thinkingText", ...)` styling
- **AND** when `hideThinkingBlock` is true, only the `▶` hint is shown even in expanded mode
- **AND** when `details.thinkingText` is empty, no thinking block is rendered

#### Scenario: Final render includes metrics footer
- **WHEN** `renderResult` is called for a final result
- **AND** the result details contain usage metrics
- **THEN** a single-line metrics footer is displayed: `🔧 N calls · ↑in ↓out · $W.XYZW · ctx P% · model`
- **AND** the footer uses muted theming
- **AND** no section divider precedes the footer
