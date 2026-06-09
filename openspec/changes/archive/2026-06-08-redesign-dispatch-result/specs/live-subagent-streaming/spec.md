## MODIFIED Requirements

### Requirement: renderResult renders live partial state

When `renderResult` is called with `options.isPartial === true`, it SHALL render a live progress display using a `Container`-based layout instead of a flat `Text` with newline-joined strings. The partial display SHALL include: agent icon and name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete original task/prompt sent to the sub-agent (shown in full, no truncation), the full accumulated streaming text output (every line produced so far, no truncation), a collapsed thinking hint if thinking content is present, and a status line showing tool call count, accumulated token counts (↑), and context usage percentage.

#### Scenario: Partial render with streaming output
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains streaming text output
- **THEN** the rendered output is a `Container` with header, task section, output section, and metrics line
- **AND** the header includes the agent icon (`●`), agent name, and elapsed time in human-readable format (e.g., "45s", "2m 30s")
- **AND** the output section includes the full accumulated streaming text output (every line, not truncated) as a `Text` child
- **AND** the metrics line includes tool count, accumulated input tokens, and context percentage

#### Scenario: Partial render before any output shows full task
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** no streaming text output has been received yet
- **THEN** the rendered output includes the task section with the complete task/prompt text (no truncation, the full dispatch message)
- **AND** the output section is omitted

#### Scenario: Partial render with thinking content
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains thinking text
- **THEN** thinking content is shown as a collapsed hint `▶ Thinking (N lines)` (themed dim)
- **AND** the full thinking text is NOT displayed in the partial view

### Requirement: Final renderResult shows task and output

When `renderResult` is called with `options.isPartial === false` (or `isPartial` absent), the rendering SHALL use a `Container`-based layout with section dividers. The rendering SHALL display: a status icon (`✓` or `✗`), agent name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete input task (shown in full, no truncation), the final output rendered through the `Markdown` component (truncated to 4000 characters in normal mode, full when expanded via Ctrl+O), a thinking section (collapsed hint when not expanded, full text when expanded), and a metrics footer with tool count, token counts (↑↓), cost, and context%.

#### Scenario: Final render with done status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent completed successfully
- **THEN** the rendered output uses a `Container` with sectioned layout
- **AND** the header includes `✓ {agent} {formatted-duration}` (e.g., "✓ explore 1m 46s")
- **AND** the Task section includes the complete input task
- **AND** the Output section renders the final output through `Markdown`, truncated to 4000 characters when collapsed
- **AND** expansion (Ctrl+O) shows the full untruncated output through `Markdown`
- **AND** a metrics footer is displayed

#### Scenario: Final render with error status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent encountered an error
- **THEN** the rendered header includes `✗ {agent} {formatted-duration}` (e.g., "✗ explore 2m 30s")
- **AND** the Task section includes the complete input task
- **AND** the Output section renders the final output through `Markdown`, truncated to 4000 characters (may contain error message)
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render with empty task or output
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** `details.task` is empty or undefined
- **THEN** the Task section is not included
- **AND** when `details.fullOutput` is empty or undefined
- **THEN** the Output section is not included

#### Scenario: Final render with output exceeding truncation limit
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** `details.fullOutput` exceeds 4000 characters
- **THEN** the displayed output is truncated to 4000 characters
- **AND** a truncation marker `... [truncated]` is appended
- **AND** expansion (Ctrl+O) shows the full untruncated output through `Markdown`

#### Scenario: Final render includes thinking section
- **WHEN** `renderResult` is called for a final result
- **AND** `details.thinkingText` is non-empty
- **THEN** when `options.expanded` is false, a Thinking section shows `▶ Thinking (N lines)` hint
- **AND** when `options.expanded` is true, the Thinking section shows the full thinking text themed dim
- **AND** when `details.thinkingText` is empty, the Thinking section is omitted

#### Scenario: Final render includes metrics footer
- **WHEN** `renderResult` is called for a final result
- **AND** the result details contain usage metrics
- **THEN** a metrics footer is displayed showing tool count, token counts (↑↓), cost, and context%
- **AND** the footer uses the format `🔧 N calls  ↑Xk ↓Yk  $Z.WXYZ  ctx P%`

#### Scenario: Final render highlights status signals
- **WHEN** the output text contains a relay protocol signal line (e.g., `Status: need-input`)
- **THEN** that line is displayed with visual emphasis (colored and/or bold) in the Output section
