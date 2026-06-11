## 1. Escape default Box frame

- [x] 1.1 Add `renderShell: "self"` to the `dispatch_agent` tool definition (around line 808, in the `pi.registerTool({...})` call)

## 2. Reduce streaming throttle

- [x] 2.1 In `dispatchAgent()`, change the throttle interval from 250ms to 50ms (line ~635: `if (now - lastPush < 250) return;` → `if (now - lastPush < 50) return;`)
- [x] 2.2 Update the comment on line ~630 from "at most every 250ms" to "at most every 50ms"

## 3. Access user hideThinkingBlock setting

- [x] 3.1 Determine how to access Pi's `hideThinkingBlock` setting from within the extension context (check `ctx.settingsManager`, `ctx.settings`, or Pi SDK API). Store the boolean value for use in renderResult. Default to `false` if unavailable.

## 4. Rewrite renderResult — header and task prefix

- [x] 4.1 In the partial (streaming) path of `renderResult()`: Remove the "─── Task ───" divider. Render `details.task` as dimmed prefix text directly after the header (using `theme.fg("dim", ...)`) with a single `Spacer` separating it from the header.
- [x] 4.2 In the final (done/error) path of `renderResult()`: Same change — remove the "─── Task ───" divider, render task as dimmed prefix text directly after the header.
- [x] 4.3 Keep the empty/undefined task guard: skip the task prefix when `details.task` is falsy.

## 5. Rewrite renderResult — live Markdown output during streaming

- [x] 5.1 In the partial path: Replace the `Text` component used for streaming output with a `Markdown` component configured with `getMarkdownTheme()`. Pass `details.outputText` to the Markdown component.
- [x] 5.2 Remove the "─── Output ───" divider from the partial path.
- [x] 5.3 Handle signal highlighting in the partial Markdown path: if `detectStatusSignal()` finds a signal, wrap the output in signal-highlighted segments (reuse existing `splitOutputWithSignals` and `renderSignalLine`). Merge signal Text lines with Markdown blocks for adjacent non-signal text.
- [x] 5.4 In the final path: Remove the "─── Output ───" divider. The Markdown component remains but no longer preceded by a section label.
- [x] 5.5 Keep the truncation logic: in the final path, when `options.expanded` is false, truncate output to 4000 chars with `... [truncated]` marker. When expanded, show full output.

## 6. Rewrite renderResult — inline thinking

- [x] 6.1 In the partial path: Remove the "─── Thinking ───" divider. Render the thinking collapsed hint (`▶ Thinking (N lines)`) inline between the output Markdown and the metrics footer, using `theme.fg("thinkingText", ...)` instead of `theme.fg("dim", ...)`. Add a thin `Spacer` above and below the thinking hint.
- [x] 6.2 In the final path, collapsed mode (`options.expanded === false`): Same as above — inline collapsed hint with `theme.fg("thinkingText", ...)`, no "─── Thinking ───" divider.
- [x] 6.3 In the final path, expanded mode (`options.expanded === true`): Render full thinking text inline between output and metrics, using `theme.fg("thinkingText", ...)` styling (Pi-native). Add thin `Spacer` separators.
- [x] 6.4 In the final path, expanded mode with `hideThinkingBlock === true`: Even when expanded, show only the collapsed `▶ Thinking (N lines)` hint, not the full text. Use `theme.fg("thinkingText", ...)` for the hint.
- [x] 6.5 Guard against absent thinking: when `details.thinkingText` is empty/undefined, skip rendering any thinking block entirely.
- [x] 6.6 Large thinking blocks (over ~50 lines): add a max-height guard by line-counting and showing a "… show more" truncated version when collapsed to prevent display flooding.

## 7. Rewrite renderResult — subtle metrics footer

- [x] 7.1 Replace `formatMetricsFooter()` double-space separator (`"  "`) with middot separator (`" · "`) in the format function (line ~216: `return parts.join("  ");` → `return parts.join(" · ");`).
- [x] 7.2 Remove the `Spacer` before the metrics footer in all paths (partial, final collapsed, final expanded). The metrics footer should flow naturally after the last content element.
- [x] 7.3 In the partial path: keep the metrics footer as is (it already uses `theme.fg("dim", ...)`), just remove the preceding Spacer.
- [x] 7.4 In the final path: keep the metrics footer as is (it already uses `theme.fg("dim", ...)`), just remove the preceding Spacer.

## 8. Verify expanded view (Ctrl+O) and edge cases

- [x] 8.1 Verify that Ctrl+O (expanded mode) still shows full untruncated output with Markdown rendering in the new layout.
- [x] 8.2 Verify that error states (agent crash, non-zero exit) render correctly with the new layout: error icon (✗), error output via Markdown, inline thinking if present, metrics footer.
- [x] 8.3 Verify that when `details.fullOutput` is absent, the output area is skipped entirely (no empty Markdown block).
- [x] 8.4 Verify that the render respects the `width` parameter passed from Pi's TUI — no line-width exceptions in narrow terminals.
- [x] 8.5 Verify that multiple sequential `dispatch_agent` calls each render independently with the new layout.

## 9. Final testing and polish

- [x] 9.1 Test with a real sub-agent dispatch (e.g., `dispatch_agent(explore, "test task")`) and confirm streaming feels fluid at 50ms throttle.
- [x] 9.2 Test with a thinking-enabled agent and confirm thinking renders inline with Pi-native theming.
- [x] 9.3 Test with `hideThinkingBlock: true` (if accessible) and confirm full thinking is never shown.
- [x] 9.4 Test in a narrow terminal (e.g., 80 cols) to verify no wrapping issues with the new layout.
- [x] 9.5 Test in JSON mode: confirm no rendering changes leak into JSON output (JSON mode bypasses renderResult).
- [x] 9.6 Profile `Markdown` component performance during rapid 50ms streaming updates — if CPU usage is excessive, consider hybrid Text/Markdown fallback.
