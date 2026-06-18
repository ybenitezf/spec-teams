## ADDED Requirements

### Requirement: Widget created on first streaming event

The `dispatchAgent()` function SHALL create a widget via `ctx.ui.setWidget()` on the first streaming event (text_delta or thinking_delta) received from the sub-agent process. The widget key SHALL be `"spec-team-<agent-name>"` (e.g., `"spec-team-explore"`) using the agent's lowercase name. The widget SHALL use the string-array overload. The widget SHALL only be created when `ctx.hasUI` is true.

#### Scenario: Widget created on first text_delta
- **WHEN** the sub-agent process emits its first `text_delta` event
- **AND** `ctx.hasUI` is true
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", [...])` is called with a string array containing the agent name, elapsed time, status, and the delta text
- **AND** the widget appears above the editor/conversation area

#### Scenario: Widget created on first thinking_delta
- **WHEN** the sub-agent process emits its first `thinking_delta` event before any `text_delta`
- **AND** `ctx.hasUI` is true
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", [...])` is called with a string array containing the agent name, elapsed time, status, and a "Thinking..." indication
- **AND** the widget appears above the editor/conversation area

#### Scenario: Widget not created when hasUI is false
- **WHEN** the sub-agent process emits streaming events
- **AND** `ctx.hasUI` is false (JSON, RPC, or Print mode)
- **THEN** no widget is created
- **AND** streaming falls back to the existing `onUpdate` inline rendering

### Requirement: Widget content format

The widget string array SHALL display per-agent status in the following format:
- Line 1: `● {agent-name} ({formatted-elapsed}) - {status}` where status is "running" or "✓ completed"
- Lines 2–N: The last 15 lines of the agent's text output, preserving line breaks
- When no text output exists yet, line 2 SHALL be `Thinking...` (in italics-compatible plain text)

The agent name SHALL use the display name (e.g., "explore" not the key). The elapsed time SHALL be formatted via `formatDuration()`. Thinking content SHALL NOT be included in the widget (string array is plain text and thinking is best reviewed post-hoc).

#### Scenario: Widget with text output
- **WHEN** the sub-agent has produced text output
- **THEN** the widget shows the agent header line followed by the last 15 lines of text output
- **AND** the text output is split by newlines into individual array elements

#### Scenario: Widget with no text output yet
- **WHEN** the sub-agent has produced thinking deltas but no text deltas yet
- **THEN** the widget shows the agent header line followed by `Thinking...`

#### Scenario: Widget output truncated to last 15 lines
- **WHEN** the sub-agent has produced more than 15 lines of text output
- **THEN** only the last 15 lines are shown in the widget
- **AND** a `...` prefix line indicates earlier output was omitted (optional)

### Requirement: Widget updated on each throttled streaming delta

The widget SHALL be updated via `ctx.ui.setWidget()` on each streaming delta, throttled to at most once every 150ms. The first delta SHALL trigger an immediate update (no initial delay). State changes (agent completion) SHALL trigger immediate updates regardless of throttle.

#### Scenario: First delta triggers immediate update
- **WHEN** the first streaming event is received
- **THEN** the widget is created and updated immediately without waiting for the throttle interval

#### Scenario: Rapid deltas throttled at 150ms
- **WHEN** multiple streaming events arrive within a 150ms window after the first
- **THEN** the widget is updated at most once during that 150ms window
- **AND** the update reflects the latest accumulated output text

#### Scenario: Completion triggers immediate update
- **WHEN** the sub-agent process closes (completes)
- **THEN** the widget is updated immediately to show "✓ completed" status

### Requirement: Widget cleared after agent completion

When the sub-agent completes (process exits), the widget SHALL be cleared immediately via `ctx.ui.setWidget(key, [])` after the final `renderResult` is rendered. The widget SHALL NOT persist indefinitely after agent completion.

#### Scenario: Widget cleared after completion
- **WHEN** the sub-agent process closes and the final result is resolved
- **THEN** `ctx.ui.setWidget("spec-team-<agent-name>", [])` is called immediately
- **AND** the widget area for that agent becomes empty

#### Scenario: Widget cleared on session_start
- **WHEN** a new `session_start` event fires
- **THEN** all spec-team widget keys are cleared via `ctx.ui.setWidget(key, [])`
- **AND** no stale widget content from the previous session remains

### Requirement: Multiple concurrent agents each have their own widget key

Each dispatched agent SHALL use a unique widget key `"spec-team-<agent-name>"` (lowercase, hyphens for spaces). When multiple agents run concurrently, each SHALL have its own independent widget. The widget keys SHALL be derived from the agent's definition name.

#### Scenario: Two agents running concurrently
- **WHEN** agent "explore" and agent "apply" are both running
- **THEN** two widgets exist: `"spec-team-explore"` and `"spec-team-apply"`
- **AND** each widget updates independently with its agent's output
- **AND** clearing one agent's widget does not affect the other

#### Scenario: Same agent dispatched again after completion
- **WHEN** agent "explore" completes and its widget is cleared
- **AND** "explore" is dispatched again
- **THEN** a new widget is created under the same key `"spec-team-explore"`
- **AND** the widget shows fresh output from the new dispatch

### Requirement: Widget respects hideThinkingBlock for text display

When `hideThinkingBlock` is true and the agent is producing only thinking content, the widget SHALL show a collapsed indication rather than "Thinking...". When `hideThinkingBlock` is false, the widget SHALL show "Thinking..." as normal.

#### Scenario: Thinking hidden
- **WHEN** `hideThinkingBlock` is true
- **AND** the agent has produced only thinking content (no text)
- **THEN** the widget shows `▶ Thinking...` instead of `Thinking...`

#### Scenario: Thinking visible
- **WHEN** `hideThinkingBlock` is false
- **AND** the agent has produced only thinking content (no text)
- **THEN** the widget shows `Thinking...`
