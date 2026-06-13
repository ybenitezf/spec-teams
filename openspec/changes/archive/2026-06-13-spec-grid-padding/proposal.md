## Why

The spec-teams dashboard widget (agent roster grid) renders directly above Pi's editor with only Pi's built-in `Spacer(1)` separating it from the conversation/status content above. This creates a cramped visual — the grid sits too close to the conversation flow, making it hard to visually distinguish the roster from the conversation area.

## What Changes

- Prepend an empty string `""` to the `string[]` returned by the widget's `render(width)` method in `updateWidget()`, adding one blank line of visual padding before the agent grid
- This padding applies to all render paths: empty state, single-column layout, and multi-column grid layout
- Combined with Pi's existing `Spacer(1)` above `widgetContainerAbove`, this gives 2 lines of total visual breathing room

## Capabilities

### New Capabilities
- `grid-top-padding`: A blank line prepended to the widget's rendered output, providing additional visual spacing above the agent roster grid

### Modified Capabilities
- `spec-teams-extension`: The `render(width)` method in `updateWidget()` now prepends `""` to its return value on all paths

## Impact

- **Code**: `extensions/spec-teams.ts` — `updateWidget()` function, specifically the `render(width)` method
- **Visual**: The spec-team widget will have one additional blank line above it in all layouts (empty state, single-column, multi-column)
- **No breaking changes**: The existing `Spacer(1)` from Pi's layout is unaffected; this only adds padding within the widget's own rendered output