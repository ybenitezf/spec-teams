# live-subagent-streaming Specification

## Purpose

Enable live streaming of sub-agent output in the spec-teams extension. When the `dispatch_agent` tool dispatches a sub-agent (explore, propose, apply, verify, archive), the TUI renders real-time progress — streaming text output, thinking content, tool call counts, and context usage — replacing the static `working...` placeholder.
## Requirements
### Requirement: dispatchAgent accepts optional onUpdate callback

The `dispatchAgent()` function SHALL accept an optional `onUpdate` parameter of type `(update: PartialResult) => void`. When provided, `dispatchAgent` SHALL call `onUpdate` with streaming progress state during sub-agent execution. When not provided, `dispatchAgent` SHALL behave identically to before this change.

#### Scenario: onUpdate provided and called during execution
- **WHEN** `dispatchAgent` is called with an `onUpdate` callback
- **AND** the sub-agent process streams output events
- **THEN** `onUpdate` is called with partial progress state at least once before the promise resolves

#### Scenario: onUpdate not provided (backwards compatible)
- **WHEN** `dispatchAgent` is called without an `onUpdate` callback
- **THEN** the function executes normally and resolves with the final result
- **AND** no error is thrown due to the missing callback

### Requirement: Live updates are throttled to 250ms

The bridge between sub-agent streaming events and the `onUpdate` callback SHALL throttle updates such that `onUpdate` is called at most once every 250ms. The first streaming delta SHALL trigger an immediate update (no initial delay).

#### Scenario: First delta triggers immediate update
- **WHEN** the first streaming event (text_delta or thinking_delta) is received from the sub-agent process
- **THEN** `onUpdate` is called immediately without waiting for the throttle interval

#### Scenario: Rapid deltas are throttled
- **WHEN** multiple streaming events arrive within a 250ms window
- **THEN** `onUpdate` is called at most once during that 250ms window
- **AND** the update reflects the latest accumulated state at the time of the call

#### Scenario: State accumulates between throttled calls
- **WHEN** streaming events arrive faster than the 250ms throttle interval
- **THEN** all text content from the events is accumulated in `textChunks`
- **AND** the next `onUpdate` call includes all accumulated content

### Requirement: thinking_delta events are captured

The `dispatchAgent()` function SHALL capture `thinking_delta` events from the sub-agent stdout stream. Thinking content SHALL be accumulated in a separate `thinkingChunks` array and included in the `onUpdate` payload as `thinkingText`.

#### Scenario: thinking_delta event received
- **WHEN** the sub-agent process emits a `thinking_delta` event via stdout JSON stream
- **THEN** the delta content is accumulated in `thinkingChunks`
- **AND** the next `onUpdate` call includes the accumulated thinking text

#### Scenario: Agent without thinking mode
- **WHEN** a sub-agent does not emit any `thinking_delta` events (thinking mode disabled)
- **THEN** `thinkingText` in the `onUpdate` payload is an empty string
- **AND** no error occurs

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

### Requirement: execute passes onUpdate to dispatchAgent

The `execute` function of the `dispatch_agent` tool SHALL pass its own `onUpdate` callback (from the tool execution API) through to `dispatchAgent`. The initial static `"Dispatching to {agent}..."` message SHALL still be emitted before the streaming begins.

#### Scenario: onUpdate called with initial dispatching message
- **WHEN** the `dispatch_agent` tool's `execute` is called with an `onUpdate` callback
- **THEN** `onUpdate` is called immediately with a `"Dispatching to {agent}..."` message and `details: { agent, task, status: "dispatching" }`

#### Scenario: onUpdate forwarded to dispatchAgent for streaming
- **WHEN** the `dispatch_agent` tool's `execute` is called with an `onUpdate` callback
- **AND** `dispatchAgent` begins processing streaming events
- **THEN** `onUpdate` is called with partial progress state from `dispatchAgent`

### Requirement: Backwards compatibility with existing tool API

The changes SHALL NOT modify the tool's registered parameters, return type, or final `renderResult` contract. Existing callers (including the dispatcher LLM) SHALL observe no behavioral difference in the final result.

#### Scenario: Tool parameters unchanged
- **WHEN** the `dispatch_agent` tool is invoked with `agent` and `task` parameters
- **THEN** the parameters are accepted and processed identically to before the change

#### Scenario: Final content format unchanged
- **WHEN** the `dispatch_agent` tool completes execution
- **THEN** the returned `content` array follows the format `[agent] status in {formatted-duration}\n\n{output}` where duration is human-readable via `formatDuration()` (e.g., `1m 46s` rather than raw seconds)
- **AND** the dispatcher LLM can still detect status signal blocks in the output

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

