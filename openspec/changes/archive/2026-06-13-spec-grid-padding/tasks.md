## 1. Add top padding to widget render

- [x] 1.1 In `updateWidget()` in `extensions/spec-teams.ts`, prepend `""` to the empty-state return path: change `return [theme.fg("dim", "No agents found. Add .md files to agents/ or user-level agent dirs")]` to `return ["", theme.fg("dim", "No agents found. Add .md files to agents/ or user-level agent dirs")]`
- [x] 1.2 In `updateWidget()`, prepend `""` to the single-column return path: change `return agents.map(s => renderAgentCell(s, width, theme))` to `return ["", ...agents.map(s => renderAgentCell(s, width, theme))]`
- [x] 1.3 In `updateWidget()`, prepend `""` to the multi-column return path: change `return lines` to `return ["", ...lines]`

## 2. Verify

- [x] 2.1 Confirm no TypeScript compilation errors in `extensions/spec-teams.ts`
- [x] 2.2 Visually verify the grid has a blank line above it in all three render states (empty, single-column, multi-column)