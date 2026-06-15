## Context

The dashboard dialog (`/specs-dashboard`) displays per-agent detail cards in a TUI overlay. Currently, `render(width)` always emits 33 lines — 1 top border, 30 hardcoded `maxVisibleLines`, 1 scroll indicator, and 1 bottom border. The Pi TUI compositor clips overflow from the bottom (`overlayLines.slice(0, maxHeight)`), so any output exceeding `maxHeight: "80%"` of terminal rows loses bottom lines first. On terminals with fewer than ~42 rows, the bottom border and scroll indicator are always clipped. Additionally, the footer hint line ("Press Escape, Enter, or q to close…") is embedded inside `buildContentLines()` and scrolls with content, meaning it disappears when card content exceeds 30 lines.

## Goals / Non-Goals

**Goals:**
- Adapt the dialog height to the terminal so bottom border, scroll indicator, and footer hint are always visible
- Pin the footer hint outside the scrollable content area so it never scrolls out of view
- Ensure scroll calculations in `handleInput()` use the same adaptive height value
- Handle terminal resize by re-rendering with the updated height

**Non-Goals:**
- Changing the Pi TUI component interface (`render(width)` signature)
- Changing pi-tui's overlay clipping behavior
- Changing overlay options (`width`, `maxHeight`, `anchor`)
- Changes to `buildAgentCardLines()` or content formatting
- Making the dialog height configurable via overlay options

## Decisions

### Decision 1: Read terminal height from the `tui` instance

**Choice**: Use `tui.terminal.rows` (or equivalent property) to get the terminal row count at render time, then compute `availableHeight = Math.floor(rows * 0.8)` to match the `maxHeight: "80%"` overlay option.

**Alternatives considered**:
- *Change `render()` signature to accept height*: Would require changes to pi-tui's component interface, violating the out-of-scope constraint.
- *Hardcode a smaller maxVisibleLines (e.g., 20)*: Doesn't adapt to terminal size. Wastes space on large terminals. Still clips on very small terminals.
- *Read terminal height from process.stdout.rows*: Less portable and doesn't match the TUI's actual viewport dimensions.

**Rationale**: The `tui` object is already passed into `renderDashboardDialog()` and stored in the closure. It has access to terminal dimensions. This approach requires no API changes and stays within existing scope.

### Decision 2: Compute `maxVisibleLines` as `availableHeight - 3`

**Choice**: `maxVisibleLines = Math.max(5, availableHeight - 3)` where 3 accounts for the top border, scroll indicator line, and bottom border. (Note: the footer hint is now a fixed line rendered separately, so it's subtracted from `availableHeight` too — effectively `availableHeight - 4` lines for scrollable content when the footer hint is present.)

**Rationale**: The overlay produces exactly `availableHeight` lines, and each structural line (borders, scroll indicator, footer hint) must be accounted for. A minimum of 5 visible content lines prevents degenerate rendering on very small terminals.

### Decision 3: Pin footer hint as a fixed line between content and scroll indicator

**Choice**: Remove the footer hint from `buildContentLines()` and render it as a fixed line in `render()`, positioned between the scrollable content area and the scroll indicator.

**Alternatives considered**:
- *Pin footer hint above scrollable content (below title)*: Distracting when content scrolls; wastes premium screen space.
- *Add footer hint to the scroll indicator line*: Too crowded; both serve different purposes (keyboard hints vs. scroll state).
- *Keep footer hint in scrollable content but always scroll to bottom*: Confusing UX; users expect to see the latest agents at top, not hints at bottom.

**Rationale**: The footer hint contains essential keyboard shortcuts that users need to see regardless of scroll position. Placing it just above the scroll indicator mirrors how terminal status bars work — fixed, always visible, but visually distinct from scroll state.

### Decision 4: Track cached height alongside cached width for invalidation

**Choice**: Store `cachedHeight` alongside `cachedWidth` and invalidate when either changes. On each `render()`, compare `tui.terminal.rows` against `cachedHeight`.

**Rationale**: Terminal resize events change row count. The current cache only tracks `cachedWidth`. If we compute `maxVisibleLines` from terminal height, we must also re-render when height changes. Storing both dimensions in the cache is the minimal change.

### Decision 5: Fallback to 30 lines when `tui` is not available

**Choice**: When `tui` is undefined or `tui.terminal.rows` is unavailable, fall back to `maxVisibleLines = 30` (current behavior).

**Rationale**: Graceful degradation ensures the dialog still works in edge cases (testing, unusual environments). The fallback matches the existing hardcoded value so behavior is unchanged in those scenarios.

## Risks / Trade-offs

- **[Incorrect terminal height property]** → Mitigate by checking `tui.terminal.rows` at runtime and falling back gracefully. If the property doesn't exist, use the default of 30.
- **[Terminal resize during dialog]** → Mitigate by caching and comparing height on each `render()` call. If height changed, invalidate and rebuild.
- **[Very small terminals (< 12 rows)]** → `availableHeight` would be ~9 rows, leaving only 5 content lines after borders/indicators. This is the minimum viable experience. The `Math.max(5, ...)` floor prevents degenerate line counts.
- **[Height computation uses 80% which must match overlay option]** → This is a coupling risk. If `maxHeight` changes in the overlay options, the height calculation must be updated correspondingly. Mitigated by documenting the coupling in code comments.