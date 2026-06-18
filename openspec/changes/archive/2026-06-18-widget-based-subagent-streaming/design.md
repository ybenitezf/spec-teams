## Context

The spec-teams extension dispatches sub-agent `pi` processes and currently renders their streaming output inline in the conversation via the `onUpdate` → `renderResult` partial rendering path. This causes scroll position resets in the Pi TUI because the differential rendering engine auto-scrolls to follow new tool output content.

The Pi SDK (v0.79.6) provides the `ctx.ui.setWidget()` API — confirmed available and actively used by the plan-mode extension as a working reference. This API offers two overloads:
1. **String array**: `ctx.ui.setWidget(key, string[])` — simple, plain text, minimal overhead
2. **Component factory**: `ctx.ui.setWidget(key, () => Component)` — complex, supports Markdown/Box/etc.

The string-array overload is chosen for this change because sub-agent output is already text, no Markdown rendering is needed in the widget, and it's simpler to implement.

**Constraints:**
- Must check `ctx.hasUI` before using widget APIs (widgets unavailable in JSON/RPC/Print modes)
- Widget area height is limited — output must be concise (last 10–15 lines per agent)
- String array form doesn't support Markdown — plain text only
- Must not break the relay protocol (status signals in final output)
- Must preserve existing `renderResult` behavior for final results

## Goals / Non-Goals

**Goals:**
- Decouple live sub-agent streaming output from conversation scroll position using `ctx.ui.setWidget()`
- Support multiple concurrent sub-agents via per-agent widget keys
- Clean widget lifecycle: create on first delta → update throttled → clear on completion
- Graceful fallback to inline `onUpdate` when `ctx.hasUI` is false

**Non-Goals:**
- Session file viewer (separate future change)
- Markdown rendering in widget (string array overload = plain text only)
- Changes to Pi TUI framework, dashboard dialog, or session file lifecycle
- Any changes to `renderResult` or the final output format

## Decisions

### Decision 1: String-array overload of `ctx.ui.setWidget()`

**Choice:** Use the string-array overload `ctx.ui.setWidget(key, string[])` for simplicity.

**Rationale:** Sub-agent output is already plain text — no Markdown rendering needed in the live widget. The string array form is simpler to build (just split output into lines, prepend status header), has lower overhead, and avoids the complexity of Component lifecycle management. The plan-mode extension uses this same overload successfully.

**Alternatives considered:**
- *Component factory overload*: Would allow Markdown rendering of output (syntax highlighting for code blocks during streaming), but adds complexity. Rejected for simplicity; users can review formatted output in the final `renderResult` inline.

### Decision 2: Per-agent widget keys

**Choice:** Each dispatched agent gets a unique widget key: `"spec-team-<agent-name>"` (e.g., `"spec-team-explore"`). Multiple concurrent agents each have their own independent widget.

**Rationale:** Pi widgets are keyed — each `setWidget(key, content)` call updates or creates a widget for that key. Separate keys for separate agents naturally isolate each agent's output. No need to merge multiple agents' output into a single string array.

**Alternatives considered:**
- *Single shared widget with stacked content*: Would require merging all agents' output into one string array, needing coordination between concurrent `dispatchAgent()` calls. More complex for no benefit. Rejected.

### Decision 3: Widget lifecycle managed within dispatchAgent

**Choice:** `dispatchAgent()` directly calls `ctx.ui.setWidget()` for create, update, and clear operations, rather than delegating widget management to `execute()` or a separate module.

**Rationale:** `dispatchAgent()` already has access to `ctx`, the streaming delta events, and the agent name. Adding widget lifecycle calls there keeps the streaming-to-widget pipeline in one place. Each `dispatchAgent()` invocation manages its own widget key independently — naturally supporting concurrency.

### Decision 4: 150ms widget update throttle

**Choice:** Throttle widget updates to once every 150ms (separate from the existing 50ms `onUpdate` throttle). First delta triggers immediate widget creation. Completion triggers immediate clear.

**Rationale:** `setWidget()` triggers TUI re-rendering which is more expensive than a data callback. 150ms provides a good balance between perceived responsiveness and avoiding flicker. The 50ms `onUpdate` throttle remains for non-TUI mode and internal state tracking.

### Decision 5: onUpdate suppressed in TUI mode after initial message

**Choice:** In `execute()`, after the initial "Dispatching to {agent}..." `onUpdate` call, suppress further `onUpdate` calls for streaming progress when `ctx.hasUI` is true. The widget handles live display.

**Rationale:** Prevents double-rendering (widget + inline partial renderResult) which would defeat the scroll-preservation goal. The initial dispensing message keeps the conversation aware that a dispatch started. The final `renderResult` (non-partial) still renders inline after completion, preserving history.

### Decision 6: Widget content — last 15 lines of text output

**Choice:** The widget displays the agent status line + last 15 lines of accumulated text output. When no text exists yet but thinking has been emitted, show "Thinking...". Thinking content itself is not shown in the widget.

**Rationale:** 15 lines keeps the widget compact and avoids consuming excessive terminal space. It provides enough context to see what the agent is doing without overwhelming the widget area. Thinking content is excluded from the widget because: (a) thinking can be very verbose, (b) string array is plain text so rich rendering of thinking isn't possible, and (c) thinking is available for review in the final `renderResult`.

### Decision 7: Widget cleared immediately on completion

**Choice:** When the sub-agent completes, clear the widget immediately via `ctx.ui.setWidget(key, [])`. No "completed" linger period.

**Rationale:** The final `renderResult` appears inline in the conversation immediately after completion, providing the full formatted output. Keeping a redundant widget around would be confusing. Immediate cleanup keeps the UI clean.

## Risks / Trade-offs

- **[Risk] Widget flicker on rapid updates** → Mitigation: 150ms throttle; string array form is lightweight (no Component tree rebuild).
- **[Risk] Widget usurps vertical space from editor** → Mitigation: Only 16 lines max (1 header + 15 output). Pi TUI widget area is designed for this use case (plan-mode uses similar approach).
- **[Risk] Thinking content invisible during execution** → Mitigation: "Thinking..." placeholder in widget. Full thinking content is available in final `renderResult` after completion. This is a deliberate trade-off for widget simplicity.
- **[Risk] No Markdown/syntax highlighting in widget** → Mitigation: The widget is for *live* awareness, not detailed review. The final `renderResult` inline provides full formatted output with Markdown/syntax highlighting. Accepted trade-off.
- **[Trade-off] Plain text widget is less visually rich** → Accepted: The goal is scroll-preservation and live awareness, not rich rendering. The final `renderResult` serves as the canonical formatted output.
- **[Risk] `ctx.hasUI` false paths not tested frequently** → Mitigation: No changes to the non-TUI code path — `onUpdate` → `renderResult` flow is completely unchanged when `ctx.hasUI` is false.
