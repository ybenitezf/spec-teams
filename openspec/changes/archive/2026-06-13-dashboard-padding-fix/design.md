## Context

The `dashboard-dialog-tweaks` change introduced two visual regressions in the dashboard overlay dialog rendered by `renderDashboardDialog()` in `extensions/spec-teams-utils.ts`:

1. **Asymmetric padding**: Content lines use `" ".repeat(PADDING_H) + truncated` — left padding is present but right padding is missing. The `truncateToWidth(line, innerContentWidth, "…", true)` with `pad=true` ensures `truncated` fills exactly `innerContentWidth` visible characters, but those characters sit flush against the right border. Adding `PADDING_H` spaces after `truncated` produces symmetric padding and makes the total visible width between borders exactly `innerW` (since `innerContentWidth + 2 * PADDING_H = innerW`).

2. **Status-colored agent names**: `buildAgentCardLines()` renders the first line as `theme.fg(statusColor, theme.bold(\`${statusIcon} ${displayName(state.def.name)}\`))`, which applies the status color to the entire string including the name. The intended design is that only the status icon carries the status color for quick state indication, while the agent name should be plain bold text.

Fill lines (empty space between cards) are already correct — they use `" ".repeat(innerW)` which fills the full inner width between borders, giving symmetric visual padding.

## Goals / Non-Goals

**Goals:**
- Make content line padding symmetric (equal left and right padding)
- Make scroll indicator padding symmetric for visual consistency
- Render agent names in plain bold text, separate from the status-colored icon

**Non-Goals:**
- Refactoring `renderDashboardDialog()` or `buildAgentCardLines()` architecture
- Changing scrolling behavior, keybindings, or overlay dimensions
- Modifying `renderResult`, `renderCall`, or any other dialog
- Altering `innerContentWidth` calculation or `truncateToWidth` parameters

## Decisions

### D1: Add explicit right padding as `" ".repeat(PADDING_H)` after `truncated`

**Decision**: Change `" ".repeat(PADDING_H) + truncated` to `" ".repeat(PADDING_H) + truncated + " ".repeat(PADDING_H)` on content lines.

**Rationale**: The `pad=true` flag in `truncateToWidth` fills `truncated` to exactly `innerContentWidth` visible characters. Adding `PADDING_H` spaces on both sides produces `innerContentWidth + 2 * PADDING_H = innerW` visible characters between the `│` borders — which is the correct width. The alternative of increasing `innerContentWidth` by `PADDING_H` would break the semantic meaning of `innerContentWidth` (the space available for content) and require downstream changes.

**Alternative considered**: Reduce `innerContentWidth` and let `pad=true` fill the rest — rejected because it conflates content width with padding width and makes the relationship between `innerW`, `PADDING_H`, and `innerContentWidth` unclear.

### D2: Apply same right padding to scroll indicator line

**Decision**: Change the scroll indicator from `theme.fg("border", "│") + scrollTruncated + theme.fg("border", "│")` to `theme.fg("border", "│") + " ".repeat(PADDING_H) + scrollTruncated + " ".repeat(PADDING_H) + theme.fg("border", "│")`.

**Rationale**: The scroll indicator line currently uses `truncateToWidth(scrollHint, innerW, "…", true)` which fills the full `innerW`. To maintain visual consistency with the content lines (which now have symmetric padding), the scroll indicator should also have `PADDING_H` spaces on both sides. The `truncateToWidth` call should be changed to use `innerContentWidth` instead of `innerW`, so the scroll text fills `innerContentWidth` and the explicit padding accounts for the remaining width.

### D3: Split agent name from status icon styling

**Decision**: Change from `theme.fg(statusColor, theme.bold(\`${statusIcon} ${displayName(state.def.name)}\`))` to `theme.fg(statusColor, statusIcon) + " " + theme.bold(displayName(state.def.name))`.

**Rationale**: This preserves the status-indicating color on the icon (○●✓✗) while rendering the agent name in plain bold — readable regardless of the status color applied. The space separator between icon and name is a literal string, not part of either styled segment.

**Alternative considered**: Using a neutral color for the icon while keeping the name bold — rejected because the status icon's color provides valuable at-a-glance state information that should be preserved.

## Risks / Trade-offs

- **[Width overflow if `truncateToWidth` miscalculated]** → Mitigated by the mathematical guarantee: `visibleWidth(truncated) = innerContentWidth`, so `PADDING_H + innerContentWidth + PADDING_H = innerW` exactly fills the space between borders.
- **[Breaking visual tests if any exist for exact output]** → No visual snapshot tests exist for the dashboard dialog output. The 153 existing unit tests verify functional behavior, not rendered string layout.
- **[Scroll indicator builds differently from content lines]** → Mitigated by making both use the same `innerContentWidth` + explicit padding pattern, ensuring consistent rendering logic.