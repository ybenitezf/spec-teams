## Why

The current spec-teams dashboard widget is a space-constrained grid above the editor that displays only an icon, agent name, and context percentage per agent. This provides far too little information for a meaningful overview — users cannot see model, thinking level, tools, description, cost, run count, or elapsed time without running `/specs-list`. The user has explicitly stated dislike for this widget and wants it removed. Meanwhile, the extension's `AgentState` data model already tracks rich per-agent data (model, thinking, tools, description, cost, run count, elapsed time, session state) that has nowhere to be displayed. A demand-driven overlay dialog — opened only when the user wants it — provides a better UX: full detail on request, zero clutter when not needed.

## What Changes

- **BREAKING**: Remove the dashboard widget entirely — the `setWidget("spec-team", ...)` registration, `updateWidget()`, `renderAgentCell()`, `computeColumns()`, and related grid/column logic are all eliminated
- **BREAKING**: Remove the `/specs-grid` command (no longer applicable without a widget)
- Add a new `/specs-dashboard` Pi command that opens a TUI overlay dialog showing detailed per-agent cards
- Each agent card in the overlay displays: status icon, name, model, thinking level, tools, description, context %, cost, run count, elapsed time, and session state
- The overlay dialog is scrollable and interactive (keyboard navigation to select agents)
- The footer status bar (showing `👥 spec-team 🔧 N calls · ↑N · ↓N · $N · ctx N% · 🤖 model · openspec`) remains exactly as-is — no changes to `refreshStatus()` or `ui.setStatus()`

## Capabilities

### New Capabilities
- `dashboard-dialog`: TUI overlay dialog command and component for viewing detailed per-agent state

### Modified Capabilities
- `spec-teams-extension`: Remove dashboard widget registration, remove `/specs-grid` command, add `/specs-dashboard` command
- `grid-top-padding`: **Removed** — widget top padding is eliminated along with the widget
- `metrics-footer`: No change (footer status bar untouched)

## Impact

- **Code**: `extensions/spec-teams.ts` (remove widget registration, `updateWidget()`, `/specs-grid`; add `/specs-dashboard` command and dialog component), `extensions/spec-teams-utils.ts` (remove `computeColumns()`, `renderAgentCell()`; add dialog rendering helpers)
- **APIs**: Removal of `setWidget("spec-team", ...)` call, removal of `/specs-grid` command, addition of `/specs-dashboard` command using `ctx.ui.custom({ overlay: true })`
- **Dependencies**: `@earendil-works/pi-tui` (already in use; overlay uses `Container`, `Box`, `Text`, `Markdown`, `Spacer` — same as `renderResult`)
- **User-facing**: Users lose the always-visible widget but gain a much more informative overlay on demand. The `/specs-grid` command is gone. The footer status bar is unchanged.