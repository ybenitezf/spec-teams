## MODIFIED Requirements

### Requirement: thinking_delta events are captured

The `dispatchAgent()` function SHALL capture `thinking_delta` events from the sub-agent stdout stream. Text and thinking content SHALL be accumulated in a single ordered array (`orderedContent`) that preserves stream order by merging consecutive same-type deltas and splitting on type change. This ensures `renderResult` can render content interleaved as the sub-agent emitted it, rather than all output followed by all thinking.

#### Scenario: thinking_delta event received
- **WHEN** the sub-agent process emits a `thinking_delta` event via stdout JSON stream
- **THEN** the delta content is appended to the last segment in `orderedContent` if it is type `"thinking"`, or a new `{type: "thinking", content: delta}` segment is pushed if the last segment is type `"text"` or the array is empty
- **AND** the next `onUpdate` call includes the ordered content in the details payload

#### Scenario: text_delta followed by thinking_delta followed by text_delta
- **WHEN** the sub-agent emits: text_delta("Hello") → thinking_delta("Let me check...") → text_delta("World")
- **THEN** `orderedContent` is: `[{type: "text", content: "Hello"}, {type: "thinking", content: "Let me check..."}, {type: "text", content: "World"}]`
- **AND** `renderResult` renders them interleaved with blank line separators between different types: Markdown("Hello") → Spacer(1) → Markdown("Let me check...", thinkingText+italic) → Spacer(1) → Markdown("World")

#### Scenario: Consecutive same-type deltas are merged
- **WHEN** the sub-agent emits: text_delta("Hello ") → text_delta("World")
- **THEN** `orderedContent` is: `[{type: "text", content: "Hello World"}]`
- **AND** no redundant Markdown component is created for the consecutive same-type deltas

#### Scenario: Agent without thinking mode
- **WHEN** a sub-agent does not emit any `thinking_delta` events (thinking mode disabled)
- **THEN** `orderedContent` contains only text-type segments
- **AND** no error occurs
- **AND** `outputText` and `thinkingText` are still populated for backward compatibility with the dispatcher LLM

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

### Requirement: dispatchAgent manages widget lifecycle

The `dispatchAgent()` function SHALL manage the widget lifecycle: create on first streaming delta (via `ctx.ui.setWidget(key, content)`), update on each throttled delta, and clear on completion (via `ctx.ui.setWidget(key, [])`). Widget updates SHALL be throttled at 150ms, independently of the 50ms `onUpdate` throttle. The widget key SHALL be `"spec-team-<agent-name>"` derived from the agent's lowercase name.

#### Scenario: Widget created on first delta
- **WHEN** the first streaming delta arrives from the sub-agent
- **AND** `ctx.hasUI` is true
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", stringArray)` is called immediately
- **AND** the string array contains the agent status line and current output

#### Scenario: Widget updated on subsequent deltas with throttle
- **WHEN** subsequent streaming deltas arrive
- **AND** at least 150ms have passed since the last widget update
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", updatedStringArray)` is called
- **AND** the updated array reflects the latest output

#### Scenario: Widget cleared on completion
- **WHEN** the sub-agent process closes (completes)
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", [])` is called
- **AND** the widget area for that agent becomes empty

#### Scenario: Multiple agents each manage their own widget
- **WHEN** agent "explore" and agent "apply" run concurrently
- **THEN** each `dispatchAgent()` invocation manages its own widget key independently
- **AND** clearing one agent's widget does not affect the other

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
- **THEN** all text and thinking content from the events is accumulated in `orderedContent`
- **AND** the next `onUpdate` call includes all accumulated content

### Requirement: renderResult renders live partial state

When `renderResult` is called with `options.isPartial === true`, it SHALL render a live progress display using `renderShell: "self"` escaping the Box frame. The partial display SHALL include: agent icon and name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete original task/prompt displayed as dimmed Markdown prefix (no "─── Task ───" divider), the content segments interleaved in stream order with blank line separators between different-type segments (text as `Markdown`, thinking as `Markdown` with thinkingText color + italic), and a subtle single-line metrics footer.

#### Scenario: Partial render with streaming output via Markdown
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains ordered content segments
- **THEN** the rendered output is a self-rendered Container (no Box) with header, task prefix (dimmed Markdown), interleaved content segments via Markdown (with blank line separators between text and thinking segments), and metrics line
- **AND** the header includes the agent icon (`●`), agent name, and elapsed time in human-readable format (e.g., "45s", "2m 30s")
- **AND** text segments render as `Markdown` with default theme
- **AND** thinking segments render as `Markdown` with thinkingText color + italic
- **AND** code blocks within any segment receive syntax highlighting where parsing is complete
- **AND** no "─── Output ───" divider is present

#### Scenario: Partial render before any output shows full task
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** ordered content is empty
- **THEN** the rendered output includes the task as dimmed Markdown prefix text (no truncation, no divider)
- **AND** the content area is omitted

#### Scenario: Partial render with thinking content interleaved
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the ordered content contains interleaved text and thinking segments
- **THEN** thinking segments are rendered between text segments in stream order, with blank line separators at each text↔thinking boundary
- **AND** when hideThinkingBlock is false, thinking uses `Markdown` with thinkingText color + italic
- **AND** when hideThinkingBlock is true, a single `▶ Thinking (N lines)` hint replaces all thinking segments (N = total lines across all thinking segments)

### Requirement: Final renderResult shows task and output

When `renderResult` is called with `options.isPartial === false` (or `isPartial` absent), the rendering SHALL use `renderShell: "self"` escaping the Box frame. The rendering SHALL display: a status icon (`✓` or `✗`), agent name, elapsed time in human-readable format (formatted via `formatDuration()`), the complete input task as dimmed Markdown prefix (no "─── Task ───" divider), content segments interleaved in stream order with blank line separators between different-type segments (text via `Markdown`, thinking via `Markdown` with thinkingText color + italic, truncated to 4000 characters in normal mode, full when expanded via Ctrl+O), and a subtle single-line metrics footer.

#### Scenario: Final render with done status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent completed successfully
- **THEN** the rendered output is a self-rendered Container with: header (`✓ {agent} {formatted-duration}`), dimmed Markdown task prefix, interleaved content segments via Markdown (with blank line separators between text and thinking segments), and metrics footer
- **AND** no "─── Output ───" or "─── Thinking ───" dividers are present
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render with error status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent encountered an error
- **THEN** the rendered header includes `✗ {agent} {formatted-duration}` (e.g., "✗ explore 2m 30s")
- **AND** the output renders through `Markdown`, truncated to 4000 characters
- **AND** expansion (Ctrl+O) shows the full untruncated output

#### Scenario: Final render includes interleaved thinking
- **WHEN** `renderResult` is called for a final result
- **AND** ordered content contains thinking segments interleaved with text
- **THEN** when hideThinkingBlock is false, thinking segments are rendered as `Markdown` with thinkingText color + italic, interleaved between text segments in stream order with blank line separators at text↔thinking boundaries
- **AND** when hideThinkingBlock is true, a `▶ Thinking (N lines)` hint is shown (N = total thinking lines)
- **AND** when there is no thinking content, no thinking hint or block is rendered

#### Scenario: Final render includes metrics footer
- **WHEN** `renderResult` is called for a final result
- **AND** the result details contain usage metrics
- **THEN** a single-line metrics footer is displayed: `🔧 N calls · ↑in ↓out · $W.XYZW · ctx P% · model`
- **AND** the footer uses muted theming
- **AND** no section divider precedes the footer

### Requirement: execute passes onUpdate to dispatchAgent

The `execute` function of the `dispatch_agent` tool SHALL pass its own `onUpdate` callback (from the tool execution API) through to `dispatchAgent`. The initial static `"Dispatching to {agent}..."` message SHALL still be emitted before the streaming begins. In TUI mode (`ctx.hasUI` is true), after the initial dispatching message, `onUpdate` SHALL NOT be called for subsequent streaming progress updates — the widget handles live display instead. In non-TUI modes (`ctx.hasUI` is false), `onUpdate` SHALL continue to fire for every throttled update as before.

#### Scenario: onUpdate called with initial dispatching message
- **WHEN** the `dispatch_agent` tool's `execute` is called with an `onUpdate` callback
- **THEN** `onUpdate` is called immediately with a `"Dispatching to {agent}..."` message and `details: { agent, task, status: "dispatching" }`

#### Scenario: onUpdate forwarded to dispatchAgent for streaming (non-TUI only)
- **WHEN** the `dispatch_agent` tool's `execute` is called with an `onUpdate` callback in non-TUI mode
- **AND** `dispatchAgent` begins processing streaming events
- **THEN** `onUpdate` is called with partial progress state from `dispatchAgent` at the 50ms throttle rate

#### Scenario: onUpdate NOT called for streaming in TUI mode
- **WHEN** the `dispatch_agent` tool's `execute` is called with an `onUpdate` callback in TUI mode
- **AND** the initial dispatching message has been sent
- **THEN** subsequent `onUpdate` calls for streaming progress are NOT made
- **AND** the widget (via `ctx.ui.setWidget()`) displays live streaming output instead
- **AND** the final `renderResult` (non-partial) is still rendered inline after completion

### Requirement: Widget is primary live rendering surface in TUI mode

When `ctx.hasUI` is true, the widget created via `ctx.ui.setWidget("spec-team-<agent-name>", ...)` SHALL be the primary rendering surface for live sub-agent streaming output during execution. Subsequent `onUpdate` calls for streaming updates (after the initial dispatching message) SHALL NOT be called in TUI mode. The widget SHALL update independently of the conversation scroll position, allowing the user to read earlier conversation while the sub-agent runs.

#### Scenario: Live streaming goes to widget in TUI mode
- **WHEN** a sub-agent is dispatched in TUI mode
- **AND** the agent begins streaming output
- **THEN** the live output appears in the widget area (via `ctx.ui.setWidget()`), not inline in the conversation tool output
- **AND** the conversation scroll position is unaffected by widget updates
- **AND** the widget header shows `● {agent} {formatted-duration} - running`

#### Scenario: Initial dispatching message still rendered inline
- **WHEN** a sub-agent dispatch begins in TUI mode
- **THEN** the initial "Dispatching to {agent}..." message appears inline in the conversation via `onUpdate`
- **AND** subsequent streaming output goes to the widget only (onUpdate NOT called after initial message)

#### Scenario: Non-TUI mode uses inline rendering unchanged
- **WHEN** a sub-agent is dispatched in JSON, RPC, or Print mode (`ctx.hasUI` is false)
- **THEN** all live streaming output is delivered through the existing `onUpdate` → `renderResult` inline path
- **AND** no widget is created or updated

#### Scenario: Final result still rendered inline in conversation
- **WHEN** the sub-agent completes
- **THEN** the final `renderResult` (with `isPartial: false`) is rendered inline in the conversation
- **AND** the widget is cleared
- **AND** the final result includes the full header, task, output, thinking, and metrics footer as before

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
