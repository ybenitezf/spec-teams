## MODIFIED Requirements

### Requirement: Dashboard dialog is scrollable
The dashboard dialog SHALL support scrolling when the total height of agent cards exceeds the visible content area. The dialog SHALL adapt its visible line count to the terminal height by computing `maxVisibleLines` from `tui.terminal.rows`. The available overlay height SHALL be calculated as `Math.floor(rows * 0.8)` to match the `maxHeight: "80%"` overlay option. The max visible content lines SHALL be `Math.max(5, availableHeight - 4)` where 4 accounts for: top border (1), footer hint (1), scroll indicator or spacer (1), and bottom border (1). When `tui` is unavailable or `tui.terminal.rows` is inaccessible, the dialog SHALL fall back to `maxVisibleLines = 30`. The overlay SHALL use `OverlayOptions` with `anchor: "center"`, `width: "60%"`, and `maxHeight: "80%"`. Vertical padding lines SHALL be included in scroll height calculations.

#### Scenario: Many agents overflow overlay height
- **WHEN** the dashboard dialog is open and agents produce more card lines (including padded and wrapped description lines) than the max visible lines for the current terminal height
- **THEN** the dialog is scrollable and the user can scroll to see all agents
- **AND** the scroll indicator, footer hint, and bottom border are always visible (never clipped)

#### Scenario: Few agents fit in overlay
- **WHEN** the dashboard dialog is open and agents produce card lines that fit within the max visible lines for the current terminal height
- **THEN** all cards are visible without scrolling
- **AND** the footer hint, bottom border are visible
- **AND** the scroll indicator is replaced by a spacer line

#### Scenario: Terminal with 40 rows
- **WHEN** the dashboard dialog is open on a terminal with 40 rows
- **THEN** `availableHeight` is 32 (Math.floor(40 * 0.8))
- **AND** `maxVisibleLines` is 28 (32 - 4), excluding the top border, footer hint, scroll indicator, and bottom border
- **AND** the dialog renders exactly 32 lines so no bottom clipping occurs

#### Scenario: Terminal with 24 rows
- **WHEN** the dashboard dialog is open on a terminal with 24 rows
- **THEN** `availableHeight` is 19
- **AND** `maxVisibleLines` is 15 (19 - 4)
- **AND** the dialog renders exactly 19 lines with complete bottom border, footer hint, and scroll indicator visible

#### Scenario: Terminal resize while dialog is open
- **WHEN** the dashboard dialog is open and the terminal is resized to a different number of rows
- **THEN** the dialog re-renders with the new `maxVisibleLines` computed from the updated terminal height
- **AND** the scroll offset is clamped to the new maximum if necessary

#### Scenario: Fallback when tui is unavailable
- **WHEN** the dashboard dialog is rendered and `tui` is undefined or `tui.terminal.rows` is inaccessible
- **THEN** `maxVisibleLines` falls back to 30 (preserving current behavior)

### Requirement: Footer hint is pinned outside scrollable content
The footer hint line ("Press Escape, Enter, or q to close · ↑↓/jk to scroll · PgUp/PgDn for pages") SHALL be rendered as a fixed line between the scrollable content area and the scroll indicator, outside of `buildContentLines()`. It SHALL always be visible regardless of scroll position. The footer hint SHALL use `theme.fg("dim", ...)` styling.

#### Scenario: Footer hint visible when content overflows
- **WHEN** the dashboard dialog is open and agent cards produce more content lines than `maxVisibleLines`
- **AND** the user scrolls down through the content
- **THEN** the footer hint remains visible in its fixed position and does not scroll with the content

#### Scenario: Footer hint visible when content fits
- **WHEN** the dashboard dialog is open and all agent cards fit within `maxVisibleLines`
- **THEN** the footer hint is visible in its fixed position below the content area

#### Scenario: Footer hint not included in scroll offset calculations
- **WHEN** the scroll offset is calculated or clamped
- **THEN** the footer hint is excluded from the scrollable content line count
- **AND** `totalLines` in scroll math refers only to lines from `buildContentLines()`, not including the footer hint

### Requirement: Dashboard dialog handles theme changes
The dashboard dialog components SHALL implement `invalidate()` to clear any cached theme-dependent rendering. When Pi's theme changes while the dialog is open, the dialog SHALL re-render with updated colors. The cache SHALL invalidate when either the width or the terminal height changes.

#### Scenario: Theme change while dialog is open
- **WHEN** the dashboard dialog is open and Pi's theme changes
- **THEN** the dialog re-renders with new theme colors applied to all card elements

#### Scenario: Height change detected on render
- **WHEN** the dashboard dialog renders and the cached terminal height differs from the current `tui.terminal.rows`
- **THEN** the dialog invalidates cached lines and re-renders with the new height