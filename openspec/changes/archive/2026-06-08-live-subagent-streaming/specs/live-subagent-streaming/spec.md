## ADDED Requirements

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

When `renderResult` is called with `options.isPartial === true`, it SHALL render a live progress display instead of the static `working...` placeholder. The partial display SHALL include: agent icon and name, elapsed time in seconds, the complete original task/prompt sent to the sub-agent (shown in full, no truncation), the full accumulated streaming text output (every line produced so far, no truncation), the full accumulated thinking output (every reasoning line emitted, no truncation), and a status line showing tool call count and context usage percentage.

#### Scenario: Partial render with streaming output
- **WHEN** `renderResult` is called with `isPartial: true`
- **AND** the details object contains streaming text output
- **THEN** the rendered text includes the agent icon (`●`), agent name, and elapsed seconds
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

### Requirement: Final renderResult behavior is unchanged

When `renderResult` is called with `options.isPartial === false` (or `isPartial` absent), the rendering behavior SHALL be identical to the pre-change behavior: a status icon (`✓` or `✗`), agent name, elapsed time, and full output available on Ctrl+O expansion.

#### Scenario: Final render with done status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent completed successfully
- **THEN** the rendered text matches the pre-change format: `✓ {agent} {elapsed}s`
- **AND** full output is available via expanded view

#### Scenario: Final render with error status
- **WHEN** `renderResult` is called with `isPartial: false` or `isPartial` absent
- **AND** the agent encountered an error
- **THEN** the rendered text matches the pre-change format: `✗ {agent} {elapsed}s`

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
- **THEN** the returned `content` array contains the same `[agent] status in Ns\n\n{output}` format as before the change
- **AND** the dispatcher LLM can still detect status signal blocks in the output
