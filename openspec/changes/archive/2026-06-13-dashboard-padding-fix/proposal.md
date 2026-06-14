## Why

Two visual regressions appeared in the dashboard dialog after the `dashboard-dialog-tweaks` change: (1) content lines are missing right-side padding, creating an asymmetrical 2-character gap between content and the right border; (2) agent names are colored using status-dependent accent/dim styling instead of plain bold text, making names harder to read and inconsistent with the intended design.

## What Changes

- Add explicit right padding (`" ".repeat(PADDING_H)`) to all content lines in `renderDashboardDialog()`, making left and right padding symmetric around truncated content
- Add the same right padding to the scroll indicator line for visual consistency with content lines
- Split agent name styling in `buildAgentCardLines()`: status icon retains its status-dependent color while the agent name is rendered in plain bold text without accent coloring

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `dashboard-dialog`: Content line rendering now requires symmetric horizontal padding; agent name styling must use plain bold instead of status-colored text

## Impact

- `extensions/spec-teams-utils.ts` — `renderDashboardDialog()` and `buildAgentCardLines()` functions
- `openspec/specs/dashboard-dialog/spec.md` — delta spec updating content rendering and name styling requirements
- No API, dependency, or system-level changes