## 1. Brighten Text Styling

- [x] 1.1 In `buildAgentCardLines()`, change the status metrics line from `theme.fg("dim", statusLine)` to `theme.fg("muted", statusLine)`
- [x] 1.2 In `buildAgentCardLines()`, change Model line from `theme.fg("muted", ...)` to `theme.fg("text", ...)`
- [x] 1.3 In `buildAgentCardLines()`, change Thinking line from `theme.fg("muted", ...)` to `theme.fg("text", ...)`
- [x] 1.4 In `buildAgentCardLines()`, change Tools line from `theme.fg("muted", ...)` to `theme.fg("text", ...)`
- [x] 1.5 In `buildAgentCardLines()`, change Session line from `theme.fg("muted", ...)` to `theme.fg("text", ...)`
- [x] 1.6 In `buildAgentCardLines()`, change Description lines from `theme.fg("muted", ...)` to `theme.fg("text", ...)`
- [x] 1.7 Verify footer hint line remains `theme.fg("dim", ...)`

## 2. Add Internal Padding

- [x] 2.1 Add `PADDING_H = 2` and `PADDING_V = 1` constants at the top of `renderDashboardDialog()` or as module-level constants
- [x] 2.2 In `render()`, compute `innerContentWidth = innerW - 2 * PADDING_H` and use it for content line truncation and wrapping
- [x] 2.3 In `render()`, prepend `PADDING_H` spaces to each content line (after truncation to `innerContentWidth`)
- [x] 2.4 In `buildContentLines()`, add `PADDING_V` blank lines at the top and bottom of the content array
- [x] 2.5 Adjust scroll math in `handleInput()` to account for vertical padding in total line count

## 3. Enable Word-Wrapping for Descriptions

- [x] 3.1 Add `wrapTextWithAnsi` to the import from `@earendil-works/pi-tui` in the import statement
- [x] 3.2 Modify `buildContentLines(theme)` signature to `buildContentLines(theme, innerContentWidth: number)` and pass through to `buildAgentCardLines()`
- [x] 3.3 In `buildAgentCardLines()`, replace `state.def.description.split("\n")` with `wrapTextWithAnsi(state.def.description, innerContentWidth)`
- [x] 3.4 Ensure each wrapped line gets `theme.fg("text", ...)` styling (per task 1.6)
- [x] 3.5 Update `render()` to pass `innerContentWidth` when calling `buildContentLines()`

## 4. Verification

- [x] 4.1 Visually verify the dashboard dialog shows correct visual hierarchy (accent → text → muted → dim)
- [x] 4.2 Verify horizontal padding (2 spaces) appears between border and content
- [x] 4.3 Verify vertical padding (1 blank line) appears at top and bottom of content
- [x] 4.4 Verify long descriptions word-wrap correctly within the padded content area
- [x] 4.5 Verify scrolling still works after padding and wrapping changes