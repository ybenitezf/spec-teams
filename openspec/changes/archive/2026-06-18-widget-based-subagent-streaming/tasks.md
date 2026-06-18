## 1. Widget lifecycle integration in dispatchAgent

- [x] 1.1 Add `ctx` parameter passthrough from `execute()` to `dispatchAgent()` so widget API is accessible during streaming
- [x] 1.2 Add `hideThinkingBlock` parameter passthrough from `execute()` to `dispatchAgent()` for thinking-hint behavior in widget
- [x] 1.3 Compute widget key as `"spec-team-${agentName.toLowerCase().replace(/\s+/g, '-')}"` and store in closure
- [x] 1.4 Guard all `ctx.ui.setWidget()` calls with `ctx.hasUI` check — skip widget operations entirely when false
- [x] 1.5 Implement widget throttle: 150ms between `setWidget` calls, with immediate fire on first delta (track `lastWidgetUpdate` timestamp)

## 2. Widget content construction

- [x] 2.1 Write `buildWidgetContent(agentName, elapsed, status, textOutput, hideThinkingBlock): string[]` helper that builds the string array
- [x] 2.2 Line 1 format: `● {displayName} ({formatDuration(elapsed)}) - {status}` where status is "running" or "✓ completed"
- [x] 2.3 When `textOutput` is non-empty: append last 15 lines (split by `\n`, take last 15)
- [x] 2.4 When `textOutput` is empty and `hideThinkingBlock` is false: append `Thinking...`
- [x] 2.5 When `textOutput` is empty and `hideThinkingBlock` is true: append `▶ Thinking...`
- [x] 2.6 On first streaming delta (text_delta or thinking_delta): call `ctx.ui.setWidget(key, buildWidgetContent(...))` to create widget
- [x] 2.7 On each subsequent delta within throttle window: accumulate output, call `ctx.ui.setWidget(key, buildWidgetContent(...))` when throttle allows

## 3. Widget cleanup

- [x] 3.1 In `dispatchAgent()` close handler: call `ctx.ui.setWidget(key, [])` after resolving the promise (clears widget immediately on completion)
- [x] 3.2 In `session_start` handler: iterate all known agent names and call `ctx.ui.setWidget("spec-team-<name>", [])` for each to clear any stale widgets
- [x] 3.3 Handle error path: widget cleared on spawn error same as successful completion

## 4. Mode switching in execute

- [x] 4.1 In `execute()`, after the initial "Dispatching to {agent}..." `onUpdate` call, check `ctx.hasUI`
- [x] 4.2 When `ctx.hasUI` is true: suppress further `onUpdate` calls for streaming progress (the widget handles live display). The `dispatchAgent` still receives the callback for non-TUI fallback but doesn't call it for every delta
- [x] 4.3 When `ctx.hasUI` is false: keep full `onUpdate` → `renderResult` inline streaming path unchanged
- [x] 4.4 Final `renderResult` (non-partial) is always rendered inline regardless of TUI mode
- [x] 4.5 Verify the conversation scroll position is not reset during widget streaming (smoke test: scroll up during dispatch, confirm position holds)

## 5. Concurrent agent support

- [x] 5.1 Verify that per-agent widget keys (`"spec-team-explore"`, `"spec-team-apply"`) isolate each agent's widget state — each `dispatchAgent()` call manages its own key independently
- [x] 5.2 Test dispatching two agents simultaneously: both widgets appear and update independently
- [x] 5.3 Test dispatching same agent twice (sequentially): first widget cleared, second widget created fresh under same key
- [x] 5.4 Test `session_start` clears all per-agent widgets

## 6. Backwards compatibility and edge cases

- [x] 6.1 Verify `dispatchAgent()` return type unchanged — same fields (`output`, `exitCode`, `elapsed`, `orderedContent`, etc.)
- [x] 6.2 Verify relay protocol status signals still detected in final `renderResult` (no regression in signal detection)
- [x] 6.3 Verify `renderResult` behavior completely unchanged for both partial and final renders
- [x] 6.4 Verify non-TUI modes (JSON, RPC, Print) work identically to before — no widget created, full inline streaming preserved
- [x] 6.5 Test with agent that produces only thinking (no text output): widget shows "▶ Thinking..." or "Thinking..." appropriately
- [x] 6.6 Test with agent that produces no output at all (immediate error): widget never created, error flows through existing renderResult path
- [x] 6.7 Verify widget updates with `formatDuration()` elapsed time — timer interval-driven (existing 1s timer in dispatchAgent)

## 7. Manual verification and cleanup

- [x] 7.1 Run the full dispatch flow in TUI mode and confirm widget appears, updates, and clears correctly
- [x] 7.2 Confirm the conversation scroll position is preserved during widget streaming (can scroll up to read history)
- [x] 7.3 Run `pi -e extensions/spec-teams.ts -p "dispatch explore to investigate the codebase"` and observe widget behavior
- [x] 7.4 Remove any stale references to previous widget attempt (if any code from `widget-streaming-with-session-logs` was committed)
