## Why

The dashboard widget renders one agent per full terminal row (icon + name + context bar + description). With 5 agents this consumes 5 rows; as the team grows, vertical space is wasted on long description strings that are rarely fully readable. A compact grid layout that packs multiple agents per row reclaims vertical space and improves scanability at a glance.

## What Changes

- Replace `renderAgentRow()` with `renderAgentCell()` — drop the description field and `[#####]` context bar, render only `icon Name NN%` per agent
- Add `computeColumns()` that calculates responsive column count based on terminal width and a configurable max
- Add `maxColumns` state variable (default 3) to control maximum grid columns
- Modify `updateWidget()` to chunk agents into grid rows, join cells with `│` separators, and left-align the final row
- Repurpose the dead `/specs-grid` command from a no-op to a column setter: `/specs-grid <1-6>` sets `maxColumns`
- Update startup notification text to describe `/specs-grid <1-6>` as a column setter (not deprecated)

## Capabilities

### New Capabilities

None — this change modifies existing dashboard behavior within the same extension.

### Modified Capabilities

- `spec-teams-extension`: Dashboard widget rendering switches from per-row to grid-based cell layout; `/specs-grid` command changes from no-op to column setter.

## Impact

- **Code**: `extensions/spec-teams.ts` — replaces `renderAgentRow()` with `renderAgentCell()`, adds `computeColumns()` and `maxColumns` state, modifies `updateWidget()` grid logic, repurposes `/specs-grid` handler, updates startup notification string
- **Specs**: `openspec/specs/spec-teams-extension/spec.md` — dashboard widget and visual-width truncation requirements change; new requirement for `/specs-grid` command behavior
- **Dependencies**: Uses existing `truncateToWidth` and `visibleWidth` from `@earendil-works/pi-tui` (no new imports)
- **Breaking**: 1-column mode preserves identical visual effect to old layout minus the description field and context bar — existing rows lose description and bar, which is the intended compacting
