## Why

The spec-teams extension footer currently shows only a minimal 1-line format (`model · team [####---] 45%`) that omits aggregate token usage, cost, and tool-call counts. The dispatcher widget already renders rich metrics via `formatMetricsFooter()` for individual dispatch results, but this function is not wired into the extension's persistent footer. Users lose visibility into the total cost and aggregate usage across all dispatched subagents when operating in spec-teams mode, making it harder to track spend and session activity at a glance.

## What Changes

- **Add a second footer line** that reuses the existing `formatMetricsFooter()` function to display aggregate metrics as the footer's bottom line
- **Compute combined token and cost totals** by summing the dispatcher/main session usage (from `_ctx.sessionManager.getBranch()`) plus all subagent stats aggregated from the closed-over `agentStates` map
- **Compute combined tool-call count** by summing all subagent `toolCount` values from `agentStates` plus dispatcher `dispatch_agent` calls from the session branch
- **Show main-session context percentage only** (from `_ctx.getContextUsage()`) — subagent context usage is already visible per-agent in the dashboard widget grid
- **Show the active model name** using the existing `_ctx.model?.id` reference
- Keep the existing top line (model · team · context bar) unchanged

## Capabilities

### New Capabilities

- `spec-teams-footer-metrics`: The extension footer renders a second line with aggregate metrics (total tool calls, combined input/output tokens, combined cost, main session context percentage, active model) using the `formatMetricsFooter()` format

### Modified Capabilities

<!-- No existing specs are changing. This is a new integration of an existing function into a new context. -->

## Impact

- **Affected file**: `extensions/spec-teams.ts` — the `setFooter` factory's render function only
- **No API changes**: Internal-only refactor within the extension; no changes to `formatMetricsFooter()`, `AgentState`, or any exported interfaces
- **Performance**: The render function iterates `getBranch()` and the `agentStates` map each frame — acceptable since Pi's built-in footer already performs equivalent iteration
- **No breaking changes**: The existing top line is preserved; the new second line is additive
