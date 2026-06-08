## 1. Add maxColumns state and repurpose /specs-grid command

- [x] 1.1 Add `let maxColumns = 3` state variable near other extension state variables (alongside `contextWindow`, `sessionDir`, etc.)
- [x] 1.2 Replace `/specs-grid` handler: parse integer argument, validate range 1-6, store in `maxColumns`, call `updateWidget()`, and notify user. On invalid input, notify with warning showing valid range.
- [x] 1.3 Update startup notification string: replace `(deprecated) grid replaced by compact layout` with `Set grid columns (1-6, default 3)`

## 2. Implement renderAgentCell()

- [x] 2.1 Write `renderAgentCell(state: AgentState, cellWidth: number, theme: any): string` — compute icon (○/●/✓/✗ with color), display name, and `NN%` string
- [x] 2.2 Calculate name budget as `cellWidth - (1 + 1 + 1 + pctLen)` where 1+1+1 accounts for icon, space after icon, space before percent
- [x] 2.3 Implement narrow-cell fallback: if name budget < 1, drop percentage and render only icon + truncated name
- [x] 2.4 Apply post-render safety guard: if `visibleWidth(result) > cellWidth`, re-truncate with `truncateToWidth(result, cellWidth)`
- [x] 2.5 Pad cell to exact cellWidth with `truncateToWidth(result, cellWidth, "", true)` before returning

## 3. Implement computeColumns()

- [x] 3.1 Write `computeColumns(numAgents: number, width: number, maxCols: number): number` with MIN_CELL = 12
- [x] 3.2 Loop `cols` from `min(maxCols, numAgents)` down to 1, computing `cellWidth = Math.floor((width - (cols - 1)) / cols)`, return first `cols` where `cellWidth >= 12`
- [x] 3.3 Return 1 as ultimate fallback

## 4. Modify updateWidget() for grid rendering

- [x] 4.1 In `updateWidget()`, call `computeColumns(agentStates.size, width, maxColumns)` to get column count
- [x] 4.2 If `cols === 1`: render as before (full-width per agent), but using `renderAgentCell(state, width, theme)` instead of `renderAgentRow()`
- [x] 4.3 If `cols > 1`: compute `cellWidth`, chunk `agents` array into rows of `cols`, map each agent in row through `renderAgentCell()`, join with `│`
- [x] 4.4 Last row: only render cells for remaining agents (no trailing empty cells or separators), left-aligned
- [x] 4.5 Keep existing 0-agent placeholder: "No agents found. Add .md files to agents/"

## 5. Remove old renderAgentRow()

- [x] 5.1 Delete the `renderAgentRow()` function entirely (it is replaced by `renderAgentCell()`)
- [x] 5.2 Verify no remaining references to `renderAgentRow` in the codebase

## 6. Verify and test

- [x] 6.1 Verify with 0 agents: placeholder message renders
- [x] 6.2 Verify with 1 agent: single cell at full width
- [x] 6.3 Verify with 5 agents at default maxColumns=3 on 80-char terminal: 2 rows (3 + 2)
- [x] 6.4 Verify with `/specs-grid 1`: single-column mode
- [x] 6.5 Verify with `/specs-grid 6`: wide multi-column mode
- [x] 6.6 Verify with `/specs-grid 0` and `/specs-grid 7`: warning notifications
- [x] 6.7 Verify narrow terminal (~30 chars) gracefully falls to fewer columns
- [x] 6.8 Verify startup notification no longer says deprecated
