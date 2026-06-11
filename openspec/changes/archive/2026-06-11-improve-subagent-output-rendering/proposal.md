## Why

The spec-teams `dispatch_agent` tool renders sub-agent output inside a default Pi Box frame with explicit section headers ("─── Task ───", "─── Output ───", "─── Thinking ───"). This creates a fragmented, artificial display that differs markedly from a normal Pi session, where text streams word-by-word, thinking appears inline as dimmed collapsible text, and there are no labeled section boundaries. The user wants sub-agent output to feel like a natural extension of the Pi conversation — unified, fluid, and Pi-native in its visual language.

## What Changes

- **Remove default Box frame** via `renderShell: "self"`, taking full control over the tool result rendering area
- **Remove explicit section headers** "─── Output ───" and "─── Thinking ───" from the render
- **Replace three-section layout** with a flowing, native Pi-like layout: subtle agent label → dimmed task prefix → live streaming Markdown output → inline thinking blocks → subtle metrics footer
- **Render output as live Markdown** during streaming (currently plain `Text`), with syntax highlighting for partial code blocks
- **Render thinking inline** between output paragraphs using `theme.fg("thinkingText", ...)`, styled as Pi-native dimmed collapsible blocks, respecting the user's `hideThinkingBlock` setting
- **Reduce pushUpdate throttle** from 250ms to 50ms for near-word-by-word streaming feel
- **Replace section-divided metrics footer** with a subtle one-liner showing tool count, tokens, context %, and model
- **Maintain existing expanded view** (Ctrl+O) support and error-state rendering

## Capabilities

### New Capabilities
<!-- None — all changes are modifications to existing rendering behavior -->

### Modified Capabilities
- `dispatch-result-rendering`: **BREAKING** — Removes Container-based section-divided layout, replaces with flowing Pi-native layout using `renderShell: "self"`. Removes "─── Task ───", "─── Output ───", "─── Thinking ───" divider requirements. Task becomes a dimmed prefix, output renders as live Markdown during streaming, thinking renders inline instead of as a separate section.
- `live-subagent-streaming`: Reduces `pushUpdate` throttle from 250ms to 50ms. Changes partial render from `Text` to `Markdown` component for live Markdown rendering during streaming.
- `thinking-collapse`: Thinking blocks move from a separate section to inline rendering between output paragraphs. Collapsed hint behavior adapts to the inline context.

## Impact

- **Affected code**: `renderResult()` function in `src/spec-teams.ts` (~200 lines, the core rendering function)
- **Affected file**: `src/spec-teams.ts` — primarily `dispatchAgent()` (throttle constant) and `renderResult()` (complete rewrite of layout)
- **Dependencies**: Uses existing `Markdown` component and `renderShell: "self"` from Pi SDK; no new dependencies
- **TUI only**: No impact on JSON/RPC/Print modes; sub-agent spawning and relay protocol unchanged
- **Risk**: `Markdown` component performance at 50ms throttle during rapid streaming needs validation
