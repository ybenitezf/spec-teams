## Why

The dashboard dialog always renders exactly 33 lines (1 top border + 30 hardcoded content lines + 1 scroll indicator + 1 bottom border), regardless of terminal height. The Pi TUI compositor clips overflow from the bottom via `overlayLines.slice(0, maxHeight)`, so on terminals with fewer than ~42 rows, the bottom border, scroll indicator, and footer tips are always cut off. When agent content exceeds 30 lines, the footer hint ("Press Escape, Enter, or q to close…") scrolls out of view because it's embedded in scrollable content rather than pinned.

## What Changes

- Replace the hardcoded `maxVisibleLines = 30` in `render()` and `handleInput()` with an adaptive calculation based on `tui.terminal.rows`, computing `maxVisibleLines = Math.max(5, availableHeight - 3)` where `availableHeight = Math.floor(rows * 0.8)` matches the overlay's `maxHeight: "80%"`.
- Extract the footer hint from `buildContentLines()` and render it as a fixed line in `render()`, positioned between the scrollable content and the scroll indicator — similar to how the scroll indicator is already rendered outside the scrolling content.
- Invalidate cached lines when terminal height changes (not just width), so resizing triggers a re-render with the new `maxVisibleLines`.
- Gracefully degrade when `tui` is unavailable by falling back to the current fixed value (30 lines).

## Capabilities

### New Capabilities

_(None — this change modifies an existing capability.)_

### Modified Capabilities

- `dashboard-dialog`: Adaptive overlay height and pinned footer hint — the dialog now adapts its visible line count to terminal height and pins the footer hint outside the scrolling content so it is always visible.

## Impact

- **Code**: `renderDashboardDialog()` in `extensions/spec-teams-utils.ts` — changes to `render()`, `handleInput()`, `invalidate()`, and `buildContentLines()`
- **Behavior**: Users on smaller terminals (24–40 rows) will see the complete dialog with bottom border, scroll indicator, and footer hint. Users on large terminals see no change in behavior.
- **Dependencies**: No new dependencies. Uses the existing `tui` instance already passed to `renderDashboardDialog()`.
- **APIs**: No changes to the Pi TUI component interface (`render(width)` still only receives width).