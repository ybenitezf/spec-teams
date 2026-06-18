## ADDED Requirements

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

## MODIFIED Requirements

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
