## MODIFIED Requirements

### Requirement: renderResult renders live partial state

When `renderResult` is called with `options.isPartial === true`, it SHALL render a live progress display instead of the static `working...` placeholder. The partial display SHALL include: agent icon and name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete original task/prompt sent to the sub-agent (shown in full, no truncation), the full accumulated streaming text output (every line produced so far, no truncation), the full accumulated thinking output (every reasoning line emitted, no truncation), and a status line showing tool call count and context usage percentage.

#### Scenario: Partial render with streaming output
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains streaming text output
- **THEN** the rendered text includes the agent icon (`●`), agent name, and elapsed time in human-readable format (e.g., "45s", "2m 30s")
- **AND** the rendered text includes the full accumulated streaming text output (every line, not truncated)
- **AND** the rendered text includes a status line with tool count and context percentage

#### Scenario: Partial render before any output shows full task
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** no streaming text output has been received yet
- **THEN** the rendered text includes the complete task/prompt text (no truncation, the full dispatch message)

#### Scenario: Partial render with thinking content
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains thinking text
- **THEN** the rendered text includes the full accumulated thinking content (every reasoning line, no truncation)
- **AND** thinking content is displayed distinctly (e.g., dimmed) from the text output

### Requirement: Final renderResult shows task and output

When `renderResult` is called with `options.isPartial === false` (or `isPartial` absent), the rendering SHALL display: a status icon (`✓` or `✗`), agent name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete input task (shown in full, no truncation), and the final output (truncated to 4000 characters in normal mode, full when expanded via Ctrl+O).

#### Scenario: Final render with done status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent completed successfully
- **THEN** the rendered text includes `✓ {agent} {formatted-duration}` (e.g., "✓ explore 1m 46s")
- **AND** the rendered text includes the complete input task
- **AND** the rendered text includes the final output truncated to 4000 characters
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render with error status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent encountered an error
- **THEN** the rendered text includes `✗ {agent} {formatted-duration}` (e.g., "✗ explore 2m 30s")
- **AND** the rendered text includes the complete input task
- **AND** the rendered text includes the final output truncated to 4000 characters (may contain error message)
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render with empty task or output
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** `details.task` is empty or undefined
- **THEN** the task line is not displayed
- **AND** when `details.fullOutput` is empty or undefined
- **THEN** the output section is not displayed

#### Scenario: Final render with output exceeding truncation limit
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** `details.fullOutput` exceeds 4000 characters
- **THEN** the displayed output is truncated to 4000 characters
- **AND** a truncation marker "\n... [truncated]" is appended
- **AND** expansion (Ctrl+O) shows the full untruncated output

## ADDED Requirements

### Requirement: formatDuration helper function

The `formatDuration(ms: number): string` function SHALL format millisecond durations as human-readable strings. The format SHALL omit zero-value components: "45s" for durations under 1 minute, "2m 30s" for durations under 1 hour, "1h 15m" for durations of 1 hour or more. A duration of 0 milliseconds SHALL return "0s".

#### Scenario: Duration under 1 minute
- **WHEN** `formatDuration()` is called with a duration less than 60000 milliseconds
- **THEN** it returns the duration in seconds (e.g., "45s")

#### Scenario: Duration between 1 minute and 1 hour
- **WHEN** `formatDuration()` is called with a duration between 60000 and 3600000 milliseconds
- **THEN** it returns the duration in minutes and seconds (e.g., "2m 30s")
- **AND** zero-value seconds are omitted (e.g., "2m" not "2m 0s")

#### Scenario: Duration of 1 hour or more
- **WHEN** `formatDuration()` is called with a duration of 3600000 milliseconds or more
- **THEN** it returns the duration in hours and minutes (e.g., "1h 15m")
- **AND** zero-value minutes are omitted (e.g., "1h" not "1h 0m")

#### Scenario: Zero duration
- **WHEN** `formatDuration()` is called with 0 milliseconds
- **THEN** it returns "0s"

### Requirement: Elapsed time uses human-readable format across all display locations

All display locations that show elapsed time SHALL use the `formatDuration()` function instead of raw seconds. This includes: notification messages, tool result summaries, widget headers during execution, and widget headers after completion.

#### Scenario: Notification message uses formatted duration
- **WHEN** a notification message displays elapsed time
- **THEN** it uses `formatDuration()` to format the elapsed time (e.g., "2m 30s" not "150s")

#### Scenario: Tool result summary uses formatted duration
- **WHEN** the tool result summary displays elapsed time
- **THEN** it uses `formatDuration()` to format the elapsed time

#### Scenario: Widget header during execution uses formatted duration
- **WHEN** the widget header displays elapsed time during execution (partial state)
- **THEN** it uses `formatDuration()` to format the elapsed time

#### Scenario: Widget header after completion uses formatted duration
- **WHEN** the widget header displays elapsed time after completion (final state)
- **THEN** it uses `formatDuration()` to format the elapsed time
