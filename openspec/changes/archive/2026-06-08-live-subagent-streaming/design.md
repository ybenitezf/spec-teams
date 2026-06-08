## Context

The `dispatch_agent` tool in the spec-teams extension spawns a child `pi` process to execute a task on a specialist agent. Currently, the tool's `execute` function calls `dispatchAgent()` and awaits the full result before returning. The `onUpdate` callback provided by Pi's tool execution API is only called once at the start with a static `"Dispatching to {agent}..."` message. The `renderResult` function renders a static `"● explore working..."` placeholder for the entire duration of the sub-agent's execution.

Meanwhile, `dispatchAgent()` internally parses streaming JSON events from the child process stdout — `text_delta`, `tool_execution_start`, `message_end`, `agent_end` — and updates the compact dashboard widget with progress. However, this streaming data never reaches the tool call box via `onUpdate`, so the primary user-facing UI element shows no live progress.

Pi's tool execution API provides the `onUpdate` callback specifically for this purpose: to push partial/streaming results that get rendered by `renderResult` with `isPartial: true`. The official pi subagent example extension demonstrates this pattern.

The missing piece is a throttled bridge between `dispatchAgent`'s internal event parsing and the `onUpdate` callback.

## Goals / Non-Goals

**Goals:**
- Show live streaming text output from the sub-agent in the tool call box
- Show live thinking/reasoning output (currently silently discarded `thinking_delta` events)
- Show live tool call count incrementing as the sub-agent uses tools
- Show elapsed time updating in real-time
- Show context usage percentage when available
- Show the original task/prompt sent to the sub-agent
- Throttle updates to ~250ms to avoid overwhelming the TUI render loop
- Maintain the existing final rendering behavior (`✓ explore 124s` with Ctrl+O expansion)

**Non-Goals:**
- Exposing intermediate sub-agent output to the dispatcher LLM (the dispatcher still only sees the final result)
- Integrating with an observability server
- Changes to agent definitions, the dispatch protocol, or the compact dashboard widget
- Multi-agent parallel dispatch streaming
- Adding new dependencies

## Decisions

### Decision 1: Throttle at 250ms via `pushUpdate()` helper

**Choice:** Use a 250ms interval throttle that accumulates streaming chunks into `textChunks` and `thinkingChunks` arrays, and pushes the latest state to `onUpdate` at most every 250ms.

**Alternatives considered:**
- **Push on every event**: Would flood the TUI render loop with dozens of updates per second, causing visible lag and potential race conditions.
- **Debounce**: A debounce would delay the first update until streaming pauses, defeating the purpose of live feedback.
- **100ms throttle**: Too aggressive — the TUI renders at ~60fps (~16ms per frame), but each render involves string manipulation and visible-width calculation. 250ms is ~4fps, a good balance.
- **500ms throttle**: Too sluggish — the user would see updates only twice per second, making the experience feel disconnected.

**Rationale:** Throttling (leading-edge fire, then cooldown) ensures the first delta triggers an immediate update, then subsequent deltas update at most every 250ms. This gives immediate feedback followed by smooth, regular updates.

### Decision 2: Capture `thinking_delta` events

**Choice:** Accumulate thinking content in a separate `thinkingChunks` array and expose it as `thinkingText` in the update payload.

**Alternatives considered:**
- **Discard thinking (current behavior)**: The user gets no visibility into the sub-agent's reasoning, which is especially problematic for long-running thinking tasks where the agent might be stuck in a reasoning loop.
- **Merge thinking into text output**: Would make the streaming output confusing — thinking and text have different semantics.

**Rationale:** Separate tracking allows `renderResult` to show thinking content distinctly (e.g., as a dimmed prefix line), and allows future variations (collapsing thinking by default, etc.).

### Decision 3: Partial rendering shows the full sub-agent experience

**Choice:** When `isPartial` is true, `renderResult` renders the complete streaming state without truncation:
1. Agent icon (`●`) + name + elapsed time (human-readable via `formatDuration()`)
2. The complete task/prompt sent to the sub-agent (shown in full, not shortened or previewed)
3. The full accumulated streaming text output — every line the sub-agent has produced so far
4. The full accumulated thinking output — every reasoning line the sub-agent has emitted
5. Status line: tool count (e.g., "🔧 4 calls") + context % (e.g., "ctx 23%")

Nothing is truncated. The user sees exactly what they would see if watching the sub-agent session directly, the same way they see reasoning and text in the main dispatcher conversation. The tool call box may grow significantly during streaming — this is intentional and desired by the user.

**Alternatives considered:**
- **Show last 1-2 lines only**: Gives progress signals but hides the full picture. The user wants to see everything, not a summary.
- **Show only a spinner**: No progress information — barely better than current state.
- **Show only thinking output**: Misleading — not all agents use thinking mode.

**Rationale:** The user explicitly wants the full sub-agent experience — watching the sub-agent's output unfold in real time, just as they watch the main dispatcher's output. The tool call box growing is acceptable because it provides the same level of visibility as the main conversation. The status line remains compact to provide at-a-glance progress metrics.

### Decision 4: Pass `onUpdate` through `dispatchAgent` as optional parameter

**Choice:** Add an optional `onUpdate` parameter to the `dispatchAgent` function signature. The `execute` function of the tool passes its own `onUpdate` callback through.

**Alternatives considered:**
- **Make `dispatchAgent` return an event emitter**: More invasive API change, would require the caller to attach listeners. The `onUpdate` callback is simpler and matches Pi's existing API surface.
- **Wire `onUpdate` in `execute` without changing `dispatchAgent`**: Would require duplicating the event parsing logic or using a closure over `dispatchAgent`'s internals. Messy.

**Rationale:** The optional parameter is backwards-compatible — `dispatchAgent` is only called from one place (the tool's `execute`), and the parameter defaults to a no-op if not provided.

### Decision 5: Thinking content shown in full during streaming

**Choice:** When rendering partial state, show the full accumulated thinking content — every `thinking_delta` line the sub-agent has emitted. No truncation, no `...` ellipsis. The thinking content is displayed distinctly (e.g., dimmed) from the text output.

**Alternatives considered:**
- **Show last 1-2 lines only**: Hides context the user wants to see. Thinking is valuable for understanding the agent's reasoning process.
- **Show only the most recent thinking line**: Loses all context from earlier reasoning steps.

**Rationale:** The user wants the full sub-agent experience — this includes seeing all reasoning, not just the tail end. The thinking content is shown alongside the full text output, giving the user complete visibility into what the sub-agent is doing. The 250ms throttle keeps rendering performant regardless of content size.

## Risks / Trade-offs

- **[Risk] Throttled updates might miss intermediate text** → **Mitigation**: The `textChunks` array accumulates all content; only the push to `onUpdate` is throttled. The last update before completion captures the full accumulated text, and the final result provides the complete output.
- **[Risk] Thinking content could contain sensitive information** → **Mitigation**: Thinking is only shown in the tool call box during execution (visible to the same user who initiated the dispatch). After completion, thinking is not persisted in the final result content (only in details for potential future expansion). Same visibility model as current dashboard widget.
- **[Risk] Rapid tool calls could make the status line jumpy** → **Mitigation**: The tool count is a simple incrementing counter — no rapid toggling. The throttling also smooths out updates.
- **[Trade-off] 250ms throttle means output might appear slightly behind real-time** → **Acceptable**: The purpose is progress indication, not real-time telemetry. 250ms delay is imperceptible to the user for this use case.
