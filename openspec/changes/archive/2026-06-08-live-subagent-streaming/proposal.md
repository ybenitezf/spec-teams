## Why

When the dispatcher launches a specialist agent via the `dispatch_agent` tool, the user sees a static `● explore working...` placeholder in the tool call box for potentially minutes with no indication of progress, output, or activity. The sub-agent's streaming output and thinking events are captured internally but never surfaced to the tool call box where the user is looking. This creates a poor user experience: the user has no way to know if the agent is stuck, making progress, or producing useful output until it finishes completely.

## What Changes

- The `dispatchAgent` function will accept an optional `onUpdate` callback and call it with throttled (~250ms) streaming state: text output, thinking output, tool call count, elapsed time, context usage percentage, and the original task.
- `thinking_delta` events (currently silently discarded) will be captured and included in the streaming state.
- `renderResult` will render live partial state when `isPartial` is true, showing: agent icon + name + elapsed, the complete task/prompt sent to the sub-agent, the full accumulated streaming text output, full thinking output, and a status line with tool count and context percentage. No truncation — the user sees the full sub-agent output exactly as it streams.
- Final rendering (when `isPartial` is false) remains mostly unchanged: `✓ explore 124s` with Ctrl+O to expand full output.
- Updates are throttled to 250ms to balance responsiveness with TUI rendering performance.

## Capabilities

### New Capabilities

- `live-subagent-streaming`: The dispatch_agent tool call box renders live streaming feedback (text output, thinking, tool count, elapsed time, context %) while the sub-agent executes, replacing the static "working..." placeholder.

### Modified Capabilities

<!-- No existing spec-level requirement changes. The renderResult behavior change is an implementation detail — the contract of the dispatch_agent tool (parameters, return value, final rendering) remains unchanged. -->

## Impact

- **Affected code**: `extensions/spec-teams.ts` only (~50 lines changed)
- **Affected functions**: `dispatchAgent`, `renderResult`, `execute` (dispatch_agent tool)
- **No new dependencies**: Uses existing `onUpdate` callback already provided by pi's tool execution API
- **No breaking changes**: The `dispatch_agent` tool's parameters, return value, and final rendering contract remain identical
- **Backwards compatible**: The `onUpdate` parameter to `dispatchAgent` is optional; nothing outside the extension calls `dispatchAgent` directly
