## Context

The spec-teams extension's `dispatch_agent` tool renders sub-agent output via `renderResult()` inside a `Container`-based layout with explicit "─── Section ───" dividers. This layout is wrapped by Pi's default Box frame (background, padding). The result feels like a foreign box inserted into the conversation — jarring against Pi's native rendering where text flows word-by-word, thinking appears inline as dimmed collapsible text, and no artificial section boundaries exist.

The extension already supports live streaming (via 250ms-throttled `pushUpdate`), Markdown rendering (final only), thinking capture, and metrics aggregation. The rendering function just needs to escape the default Box and adopt Pi-native visual patterns.

Key constraints:
- Must remain TUI-only (JSON/RPC/Print modes unaffected)
- Must respect the `width` parameter
- Must handle absence of `thinkingText` (agents with thinking: off)
- Must still show task text (user requirement)
- Must not require Pi core changes
- Must maintain Ctrl+O expanded view support

## Goals / Non-Goals

**Goals:**
- Escape the default Box frame via `renderShell: "self"`
- Create a flowing, Pi-native visual layout: subtle agent label → dimmed task prefix → live Markdown output → inline thinking blocks → subtle metrics footer
- Render output as live Markdown during streaming (not just at completion)
- Render thinking inline between output paragraphs with Pi-native theming
- Respect user's `hideThinkingBlock` setting
- Reduce pushUpdate throttle from 250ms to 50ms
- Keep the task/prompt visible as dimmed prefix text
- Maintain Ctrl+O expanded view support

**Non-Goals:**
- Changes to the dashboard widget (grid, status cells)
- Changes to sub-agent spawning or relay protocol
- Interleaving thinking with output by timestamp (future enhancement)
- Changes to JSON/RPC/Print mode behavior
- Adding new Pi SDK features or dependencies
- Replacing the tool result with native assistant messages

## Decisions

### Decision 1: Use `renderShell: "self"` to escape the Box frame

**Choice**: Set `renderShell: "self"` on the `dispatch_agent` tool definition, taking full control of the rendering area.

**Rationale**: Pi's `renderShell: "self"` is the documented escape hatch for tools that want custom rendering. It removes the default Box background and padding, allowing the tool to define its own visual boundaries. This is the lightest-touch approach — no Pi core changes needed, no new SDK features.

**Alternatives considered**:
- *Message injection* (inject output chunks as custom messages): Rejected because messages would queue for next turn, tool execution must complete before the turn advances, and custom messages can't replace the tool result.
- *Overlay panel*: Rejected as over-engineered. Would feel disconnected from the conversation and require significant custom TUI work.
- *Header-only removal* (keep Box, just remove headers): Rejected as insufficient — the Box frame itself (padding, background) creates visual discontinuity.

### Decision 2: Inline thinking between output paragraphs

**Choice**: Render thinking blocks inline between output text, using `theme.fg("thinkingText", ...)` for Pi-native dimmed styling. Collapsed state shows a `▶` hint; expanded shows full text. If `hideThinkingBlock` is true, the hint is shown but content is hidden even in expanded mode (matching Pi's native behavior where Ctrl+T hides thinking globally).

**Rationale**: This mirrors how Pi renders thinking in native assistant messages — as dimmed collapsible blocks woven into the text flow. Users already understand this visual language. It eliminates the "─── Thinking ───" section that segregates thinking from its context.

**Limitation**: The current implementation collects thinking and output into separate arrays without interleaving metadata. Thinking will appear as a single block rather than interleaved at the exact timestamp positions where it occurred. This is a known limitation documented as a future enhancement. For the initial implementation, thinking renders as a contiguous block at its position in the current sequential layout.

**Edge case — large thinking blocks**: If thinking exceeds ~50 lines, render it with a `maxHeight` and a "… show more" prompt to prevent flooding the display.

### Decision 3: Live Markdown during streaming

**Choice**: Replace the current `Text` component (used during streaming) with the `Markdown` component, even for partial/streaming output. Configure with `getMarkdownTheme()`.

**Rationale**: The `Markdown` component handles rendering as a unit — it re-parses and re-renders the full content on each update. At 50ms throttle, this means a full Markdown re-render up to 20 times per second. For typical sub-agent output (a few KB of text), this is acceptable. Syntax highlighting on code blocks uses incremental rendering internally, so re-renders of unchanged portions are efficient.

**Risk mitigation**: If performance profiling shows excessive CPU usage, we can implement hybrid rendering — use `Markdown` at a slower cadence (e.g., every 200ms) and fall back to `Text` between Markdown refreshes. This is noted as a fallback strategy, not the default.

### Decision 4: Reduce throttle from 250ms to 50ms

**Choice**: Change the `pushUpdate` throttle interval constant from 250ms to 50ms in `dispatchAgent()`.

**Rationale**: At 250ms, text appears in visible chunks — not word-by-word. At 50ms, the update cadence is fast enough that text appears to stream fluidly (20 updates/second). This matches the perceptual threshold for smooth text animation. The tradeoff is increased CPU usage from more frequent TUI re-renders, but the actual render cost per frame is low (a Container with a few Text/Markdown children).

### Decision 5: Task as dimmed prefix, not a separate section

**Choice**: Render the task as a `Text` child with dimmed theming, placed between the agent label header and the output text. No "─── Task ───" divider.

**Rationale**: The user explicitly requested the task be kept visible ("I want the task visible..."). Showing it as a dimmed prefix preserves this visibility while eliminating the artificial section boundary. The dimmed styling signals "this was the question, what follows is the answer."

### Decision 6: Subtle metrics footer

**Choice**: Replace the current multi-field metrics footer section with a single-line footer: `🔧 N calls · ↑in ↓out · ctx P% · model`. No section divider.

**Rationale**: The metrics are reference data, not primary content. A single subtle line at the end of the output provides the same information without visual weight.

## Risks / Trade-offs

- **[Performance] Markdown re-rendering at 50ms**: The `Markdown` component re-parses and re-renders the full text on every update. For very long outputs (>10KB), this could cause jank. → *Mitigation*: Profile with realistic sub-agent output. Fall back to hybrid `Text`/`Markdown` if needed. Most sub-agent outputs are <5KB.

- **[Usability] Thinking inline may be distracting**: Inline thinking breaks the flow of the output text. Some users may prefer the current segregated layout. → *Mitigation*: The `hideThinkingBlock` setting gives users control. When hidden, thinking only shows as a compact `▶` hint. The inline placement actually improves context — users see thinking near the output it produced.

- **[Compatibility] renderShell: "self" behavior**: Pi's handling of `renderShell: "self"` may have edge cases we haven't tested (e.g., with `maxHeight`, overflow, scrolling). → *Mitigation*: The existing expanded view (Ctrl+O) mechanism is independent of renderShell. If self-rendering behaves unexpectedly in some Pi versions, we can wrap the Container in defensive min-width/max-width constraints.

- **[Regression] Breaking existing spec contract**: The `dispatch-result-rendering` spec currently requires section dividers and a Container with distinct sections. Removing these is a breaking spec change. → *Mitigation*: This is intentional. The delta spec documents the breaking change. No other tools depend on the dispatch_agent rendering format.

## Open Questions

- None. All design decisions are resolved.
