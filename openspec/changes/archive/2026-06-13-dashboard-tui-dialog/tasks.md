## 1. Remove Dashboard Widget and Grid Command

- [x] 1.1 Remove `updateWidget()` function from `spec-teams.ts` — delete the entire function body and all call sites (`dispatchAgent()`, `session_start` handler, state timer intervals)
- [x] 1.2 Remove `setWidget("spec-team", ...)` registration from `session_start` handler — delete the call and the `widgetCtx.ui.setWidget(...)` cleanup in `session_start`
- [x] 1.3 Remove `maxColumns` variable and all references to it — it's only used by the widget grid logic
- [x] 1.4 Remove `/specs-grid` command registration from `spec-teams.ts` — delete the entire `pi.registerCommand("specs-grid", ...)` block
- [x] 1.5 Remove `computeColumns()` and `renderAgentCell()` from `spec-teams-utils.ts` — these are widget-only utilities
- [x] 1.6 Remove unused imports that were only needed by widget code (`truncateToWidth`, `visibleWidth` from `@earendil-works/pi-tui` if no longer used elsewhere)
- [x] 1.7 Update the startup notification in `session_start` to replace `/specs-grid <1-6>` with `/specs-dashboard` for viewing the agent dashboard
- [x] 1.8 Remove the `widgetCtx` variable and all assignments to it — it's only used for widget context; refreshStatus uses its own `ctx` pattern

## 2. Implement Dashboard Dialog Component

- [x] 2.1 Create `renderDashboardDialog()` function in `spec-teams-utils.ts` that takes `AgentState[]`, `activeTeamName`, and `theme`, returns a `Container` with scrollable agent detail cards
- [x] 2.2 Implement agent detail card rendering — a `Box`-wrapped `Container` per agent showing: status icon + name, status/model/thinking/tools line, description, metrics line (runs, elapsed, context%, cost, session state)
- [x] 2.3 Implement proper `invalidate()` method on the dialog root component that clears cached theme strings and triggers re-render
- [x] 2.4 Implement keyboard handling in the dialog component — Escape and Enter call `done(undefined)` to close the dialog; arrow keys or vi keys for scrolling within the overlay

## 3. Register /specs-dashboard Command

- [x] 3.1 Register `/specs-dashboard` command in `spec-teams.ts` using `pi.registerCommand("specs-dashboard", ...)`
- [x] 3.2 Implement the command handler to call `ctx.ui.custom()` with correct signature: factory function FIRST, options SECOND — `(factoryFn, { overlay: true, overlayOptions: {...} })`
- [x] 3.3 Use the callback's `theme` parameter (not `getMarkdownTheme()`) for `.fg()`, `.bg()`, `.bold()` styling calls — this is the actual TUI Theme instance
- [x] 3.4 Pass `getMarkdownTheme()` only to Markdown components that require a markdown theme config object
- [x] 3.5 The command handler SHALL capture the returned overlay component reference and store it so `updateWidget()` equivalents can call `invalidate()` on it
- [x] 3.6 Clear the overlay component reference when the dialog's `done` callback fires (set to null before resolving the promise)

## 4. Live State Updates for Dialog

- [x] 4.1 Create a `dialogComponentRef` variable (nullable) to hold the current dialog root component
- [x] 4.2 In `dispatchAgent()` state-change sites, call `dialogComponentRef?.invalidate()` instead of `updateWidget()` — when dialog is open, state changes trigger re-render; when closed, the ref is null and the call is a no-op
- [x] 4.3 In `refreshStatus()`, also call `dialogComponentRef?.invalidate()` so footer updates also refresh the dialog if open
- [x] 4.4 Verify that timer-based `setInterval` updates for `elapsed` field also trigger dialog re-render when the dialog is open

## 5. Cleanup and Verification

- [x] 5.1 Verify no leftover references to `setWidget`, `computeColumns`, `renderAgentCell`, or `maxColumns` exist in the codebase
- [x] 5.2 Verify no import of `truncateToWidth` or `visibleWidth` remains unless still used in `dispatchAgent` renderResult logic
- [x] 5.3 Run existing unit tests and verify they pass — adjust any tests that referenced widget functions or `/specs-grid`
- [x] 5.4 Manual test: launch Pi with the extension, verify no widget appears above the editor
- [x] 5.5 Manual test: run `/specs-dashboard`, verify the overlay opens with agent detail cards
- [x] 5.6 Manual test: run `/specs-dashboard` while an agent is dispatching, verify live updates in the dialog
- [x] 5.7 Manual test: press Escape/Enter in the dashboard dialog, verify it closes cleanly
- [x] 5.8 Manual test: verify footer status bar is unchanged and still displays `👥 spec-team 🔧 N calls · ↑N · ↓N · $N · ctx N% · 🤖 model · teamName`

## 6. Fix Dashboard Dialog Bugs

- [x] 6.1 Rewrite `renderDashboardDialog()` to return plain Component object `{ render, handleInput, invalidate }` instead of Container subclass
- [x] 6.2 Implement manual border drawing in `render()` using box-drawing characters (`╭─╮│╰─╯`) and `theme.fg("border", ...)`
- [x] 6.3 Implement manual scrolling via `scrollOffset` state + viewport windowing (render only visible lines)
- [x] 6.4 Replace `(container as any).onKey` hack with proper `handleInput(data)` using `matchesKey()` from pi-tui
- [x] 6.5 Support ESC, Enter, q for closing; up/down arrows, j/k, PgUp/PgDn, g/G for scrolling
- [x] 6.6 Use `truncateToWidth()` and `visibleWidth()` from pi-tui for line safety
- [x] 6.7 Pass `tui` parameter to component so it can call `tui.requestRender()` after scroll changes
- [x] 6.8 Update command handler to pass `tui` to `renderDashboardDialog()`
- [x] 6.9 Update unit tests to test new Component interface (render returns string[], handleInput takes data string)
- [x] 6.10 Update design.md to document Component object pattern, border drawing, scroll implementation, and handleInput