## 1. Usage Data Accumulation

- [x] 1.1 Add `inputTokens`, `outputTokens`, `cost` fields to the `AgentState` interface in `extensions/spec-teams.ts`
- [x] 1.2 Initialize usage fields to 0 when a dispatch agent run begins (in `dispatchAgent`)
- [x] 1.3 Accumulate `inputTokens`, `outputTokens`, `cost` from `message_end.usage` in the stdout event handler
- [x] 1.4 Accumulate usage from `agent_end` events (last assistant message's usage) in the stdout event handler
- [x] 1.5 Include accumulated `inputTokens`, `outputTokens`, `cost` in `pushUpdate` details payload
- [x] 1.6 Include accumulated usage fields in final `resolve` details payload
- [x] 1.7 Handle missing/partial usage data gracefully (no crash, no NaN values)

## 2. Utility Functions

- [x] 2.1 Add `formatTokens(count: number): string` helper — format token counts with k/M suffixes (matching subagent example pattern)
- [x] 2.2 Add `detectStatusSignal(text: string): { signal: string; line: string } | null` helper — regex-based signal detection for relay protocol lines (`need-input`, `ready-to-propose`, `blocked`, `done-exploring`)
- [x] 2.3 Add `formatMetricsFooter(details): string` helper — assemble metrics line from tool count, token counts, cost, and context%

## 3. renderCall Enhancement

- [x] 3.1 Update `renderCall` to include model name (from agent definition) when available, in parentheses after agent name
- [x] 3.2 Ensure `renderCall` formatting is consistent with subagent example style (bold tool name, accent agent name, muted task preview)

## 4. renderResult Redesign — Core Structure

- [x] 4.1 Import `Container`, `Markdown`, `Spacer` from `@earendil-works/pi-tui` and `getMarkdownTheme` from `@earendil-works/pi-coding-agent`
- [x] 4.2 Restructure `renderResult` to use `Container` as root component instead of flat `Text` with `\n` joins
- [x] 4.3 Build header section: status icon (✓/✗/●), agent name (bold accent), elapsed time (dim, via `formatDuration`)
- [x] 4.4 Build `─── Task ───` section: divider (muted) + task text (dim), separated by `Spacer` from other sections
- [x] 4.5 Build `─── Output ───` section: divider (muted) + output through `Markdown` component with `getMarkdownTheme()`
- [x] 4.6 Handle output truncation: pass truncated text to `Markdown` when collapsed (4000 chars), full text when expanded
- [x] 4.7 Omit Task section when `details.task` is empty/undefined; omit Output section when `details.fullOutput` is empty/undefined

## 5. renderResult — Thinking Collapse

- [x] 5.1 Build `─── Thinking ───` section: shown only when `details.thinkingText` is non-empty
- [x] 5.2 When `options.expanded` is false (or `isPartial` is true): show dimmed `▶ Thinking (N lines)` hint where N is line count
- [x] 5.3 When `options.expanded` is true and not partial: show full thinking text themed dim
- [x] 5.4 Omit Thinking section entirely when `details.thinkingText` is empty or undefined

## 6. renderResult — Metrics Footer

- [x] 6.1 Build metrics footer section for both partial and final views
- [x] 6.2 Footer format: `🔧 N calls  ↑X.Xk ↓Y.Yk  $Z.ZZZZ  ctx P%` using `formatTokens` for token counts, 4 decimal places for cost
- [x] 6.3 Handle zero/missing cost gracefully: show `$0` when cost is 0 or undefined
- [x] 6.4 Omit token count segments when data is not available (e.g., no `message_end` events received yet)
- [x] 6.5 Use `Math.round()` for context percentage display

## 7. renderResult — Status Signal Highlighting

- [x] 7.1 Scan output text for relay protocol signals using `detectStatusSignal` helper
- [x] 7.2 When signals are detected, render matching lines with visual emphasis:
  - `need-input` → `theme.fg("warning", theme.bold(...))`
  - `ready-to-propose` → `theme.fg("success", theme.bold(...))`
  - `blocked` → `theme.fg("error", theme.bold(...))`
  - `done-exploring` → `theme.fg("success", theme.bold(...))`
- [x] 7.3 Apply signal highlighting in both partial and final render modes
- [x] 7.4 Ensure highlighted text preserves original content (only styling is changed)

## 8. Partial (Streaming) Result Specifics

- [x] 8.1 Use `Container` layout for partial view with header, task, output (as `Text`, not `Markdown`), thinking hint, and metrics line
- [x] 8.2 Show thinking as collapsed hint (`▶ Thinking (N lines)`) in partial view, never expanded
- [x] 8.3 Update metrics line with live tool count, input tokens, and context% on each render
- [x] 8.4 Show full accumulated output text (not truncated) in partial view

## 9. Final Verification

- [x] 9.1 Verify layout renders correctly in collapsed mode (Ctrl+O not pressed): sections visible, thinking hint, truncated output, metrics footer
- [x] 9.2 Verify layout renders correctly in expanded mode (Ctrl+O pressed): all sections visible, full thinking, full Markdown output, metrics footer
- [x] 9.3 Verify partial streaming view shows live updates with Container layout
- [x] 9.4 Verify signal highlighting works for all relay protocol signal types
- [x] 9.5 Verify metrics footer shows correct format with non-zero tokens and cost
- [x] 9.6 Verify graceful handling of empty task, empty output, missing thinking, missing usage data
- [x] 9.7 Verify renderCall shows model info when available
- [x] 9.8 Verify default Box shell is preserved (no `renderShell: "self"`)
