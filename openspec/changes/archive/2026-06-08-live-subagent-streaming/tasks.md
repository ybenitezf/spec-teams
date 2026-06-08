## 1. Streaming capture in dispatchAgent

- [x] 1.1 Add optional `onUpdate` parameter to `dispatchAgent` function signature
- [x] 1.2 Create `pushUpdate` throttled helper (250ms interval) that accumulates text and thinking chunks and calls `onUpdate` with a partial result payload including: `agent`, `task`, `status`, `elapsed`, `thinkingText`, `outputText`, `toolCount`, `contextPct`
- [x] 1.3 Wire `pushUpdate` into the stdout event parsing loop so `text_delta` events feed `textChunks` and trigger throttled pushes, and `tool_execution_start` increments `toolCount` and triggers updates
- [x] 1.4 Capture `thinking_delta` events (currently silently discarded) into a separate `thinkingChunks` array and include in `pushUpdate` payload as `thinkingText`
- [x] 1.5 Update context percentage from `message_end` and `agent_end` events and include in `pushUpdate` payload
- [x] 1.6 Ensure `pushUpdate` is a no-op (or not called) when `onUpdate` is undefined (backwards compatibility)

## 2. renderResult partial state rendering

- [x] 2.1 Replace the static `● {agent} working...` placeholder in `renderResult` (when `isPartial` is true) with a live progress display
- [x] 2.2 Render agent icon (`●`) + agent name + elapsed seconds as the first line
- [x] 2.3 Show the complete task/prompt text (no truncation, the full dispatch message) — rendered at the top of the partial display so the user sees exactly what was sent
- [x] 2.4 Show the full accumulated streaming text output — every line the sub-agent has produced so far, no truncation
- [x] 2.5 Show the full accumulated thinking output — every reasoning line the sub-agent has emitted, displayed distinctly (e.g., dimmed) from text output
- [x] 2.6 Render a status line with tool call count (e.g., `🔧 4 calls`) and context usage percentage (e.g., `ctx 23%`)
- [x] 2.7 Ensure `renderResult` with `isPartial: false` (or absent) renders identically to pre-change behavior (`✓ explore 124s` with expanded output on Ctrl+O)

## 3. execute wiring

- [x] 3.1 Pass the `onUpdate` callback from `execute` through to `dispatchAgent`
- [x] 3.2 Keep the initial `"Dispatching to {agent}..."` message emitted via `onUpdate` before `dispatchAgent` is called

## 4. Verification

- [x] 4.1 Verify the tool call box shows live streaming output when dispatching an agent (manual TUI test)
- [x] 4.2 Verify the static "working..." placeholder no longer appears
- [x] 4.3 Verify that thinking mode agents show reasoning content in the partial display
- [x] 4.4 Verify that agents without thinking mode work correctly (no errors, no empty thinking shown)
- [x] 4.5 Verify backwards compatibility: the `dispatch_agent` tool's final content format is unchanged and the dispatcher LLM can still detect status signal blocks
- [x] 4.6 Verify the explore relay protocol still works end-to-end (dispatcher can detect `Status: need-input`, `ready-to-propose`, etc.)
- [x] 4.7 Verify the compact dashboard widget still updates correctly alongside the new live streaming
