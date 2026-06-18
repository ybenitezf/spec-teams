## Why

When sub-agents produce streaming output in the Pi TUI, the differential rendering engine forcibly scrolls the conversation viewport to follow new content, overriding any manual scroll position. Users cannot read earlier conversation while a sub-agent runs. The `ctx.ui.setWidget()` API (confirmed available in Pi SDK v0.79.6) provides a persistent widget area that renders independently of the conversation scroll position, solving this problem without framework changes.

## What Changes

- **Widget-based live streaming** — Sub-agent output during execution renders in a persistent widget via `ctx.ui.setWidget()` using the string-array overload, instead of inline `onUpdate` partial-result rendering. The widget updates independently of conversation scroll position.
- **Per-agent widget keys** — Each dispatched agent gets its own widget key (`"spec-team-<agent-name>"`) to support multiple concurrent agents without interference.
- **Widget lifecycle** — Widget is created on first streaming event, updated on each throttled delta, and cleared when the agent completes (with a brief "completed" status before removal).
- **Widget content** — Shows agent name, elapsed time, status (running/completed), and the last 10–15 lines of output text as plain text (string array form does not support Markdown, but sub-agent output is already text).
- **Final result stays inline** — When the agent completes, the final `renderResult` still appears inline in the conversation for history, metrics, and signal detection — unchanged from current behavior.
- **`ctx.hasUI` guard** — In non-TUI modes (JSON, RPC, Print), streaming falls back to the existing `onUpdate` inline behavior, unchanged.

## Capabilities

### New Capabilities
- `widget-based-streaming`: Widget rendering of live sub-agent output using `ctx.ui.setWidget()` with per-agent widget keys, string-array content, throttled updates, and lifecycle management (create → update → clear).

### Modified Capabilities
- `live-subagent-streaming`: The primary streaming rendering surface changes from inline `onUpdate` partial-result rendering to widget-based display in TUI mode. The `onUpdate` callback is retained for non-TUI fallback and internal state tracking, but in TUI mode the widget takes over as the rendering target after the initial dispatching message.

## Impact

- **Extensions/spec-teams.ts**: `dispatchAgent()` — add widget lifecycle calls (`setWidget`, `setWidget` updates, `setWidget` clear). `execute()` — suppress `onUpdate` after initial message in TUI mode. No changes to `renderResult` or `renderCall`.
- **Extensions/spec-teams-utils.ts**: No changes required (widget content formatting is simple string arrays built inline).
- **No changes to**: Pi TUI framework, dashboard dialog, session file lifecycle, relay protocol, `renderResult` behavior, Markdown rendering pipeline.
