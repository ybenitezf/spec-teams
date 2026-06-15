## 1. Adaptive Height Calculation

- [x] 1.1 Add a `computeMaxVisibleLines(tui)` helper function inside `renderDashboardDialog()` that reads `tui.terminal.rows`, computes `availableHeight = Math.floor(rows * 0.8)`, and returns `Math.max(5, availableHeight - 4)`. When `tui` is undefined or `tui.terminal.rows` is inaccessible, fall back to returning `30`
- [x] 1.2 Replace the hardcoded `const maxVisibleLines = Math.max(5, 30)` in `render()` with a call to `computeMaxVisibleLines(tui)`
- [x] 1.3 Replace the hardcoded `const maxVisibleLines = 30` in `handleInput()` with a call to `computeMaxVisibleLines(tui)`

## 2. Pin Footer Hint Outside Scrollable Content

- [x] 2.1 Remove the footer hint line (`"Press Escape, Enter, or q to close · ↑↓/jk to scroll · PgUp/PgDn for pages"`) from `buildContentLines()`
- [x] 2.2 In `render()`, after the scrollable content lines and fill lines, render the footer hint as a fixed bordered line (with `PADDING_H`, `theme.fg("dim", ...)` styling, and side borders), before the scroll indicator/spacer line and bottom border

## 3. Cache Height-Based Invalidation

- [x] 3.1 Add a `cachedHeight` variable alongside `cachedWidth` in the `renderDashboardDialog()` closure
- [x] 3.2 In `render()`, after computing `maxVisibleLines`, compare the current terminal height (`tui.terminal.rows` or a sentinel value) against `cachedHeight`. If different, invalidate the cache and update `cachedHeight`
- [x] 3.3 In `invalidate()`, also clear `cachedHeight` (or set to `undefined`) so height changes trigger a full rebuild on next render

## 4. Scroll Math Alignment

- [x] 4.1 Verify that scroll offset clamping in `render()` uses the adaptive `maxVisibleLines` for both the overflow check (`totalLines <= maxVisibleLines`) and the max scroll offset (`totalLines - maxVisibleLines`)
- [x] 4.2 Verify that `handleInput()` scroll actions (up/down, page up/page down, home/end) all use the adaptive `maxVisibleLines` and operate on `totalLines` that excludes the footer hint (since it's no longer part of `buildContentLines()`)

## 5. Visual Verification

- [x] 5.1 Test on a terminal with ≥ 50 rows: dialog fills up to 80% height, bottom border/footer hint/scroll indicator all visible
- [x] 5.2 Test on a terminal with ~24 rows: dialog is compact but complete — bottom border, footer hint, and scroll indicator all visible
- [x] 5.3 Test with many agents so content overflows: footer hint stays pinned below content, scroll indicator shows correct range
- [x] 5.4 Test terminal resize while dialog is open: dialog re-renders at new height, scroll offset is re-clamped