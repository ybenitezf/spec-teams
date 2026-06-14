## 1. Content Line Padding

- [x] 1.1 In `renderDashboardDialog()`, change content line rendering from `" ".repeat(PADDING_H) + truncated` to `" ".repeat(PADDING_H) + truncated + " ".repeat(PADDING_H)` to add symmetric right padding
- [x] 1.2 In `renderDashboardDialog()`, update the scroll indicator line: change `truncateToWidth(scrollHint, innerW, "…", true)` to `truncateToWidth(scrollHint, innerContentWidth, "…", true)` and add symmetric padding: `" ".repeat(PADDING_H) + scrollTruncated + " ".repeat(PADDING_H)` between the border characters

## 2. Agent Name Styling

- [x] 2.1 In `buildAgentCardLines()`, split the status icon from the agent name: change `theme.fg(statusColor, theme.bold(\`${statusIcon} ${displayName(state.def.name)}\`))` to `theme.fg(statusColor, statusIcon) + " " + theme.bold(displayName(state.def.name))`

## 3. Verification

- [x] 3.1 Run the full test suite (`npm test`) and confirm all 153 tests pass with no regressions