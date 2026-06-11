## 1. Extract refreshStatus helper

- [x] 1.1 Create `refreshStatus()` function that builds the full status string from current state (dispatcher totals, subagent totals, context %, model, active team name) and calls `_ctx.ui.setStatus("spec-team", statusString)`
- [x] 1.2 The status string format: `\x1b[1m\x1b[36m👥 spec-team\x1b[0m  <formatMetricsFooter output> · <activeTeamName>`
- [x] 1.3 The helper must access closure variables: `_ctx`, `agentStates`, `activeTeamName`, `formatMetricsFooter`

## 2. Remove setFooter, enhance session_start setStatus

- [x] 2.1 Delete the entire `_ctx.ui.setFooter(...)` call and its render closure (~55 lines, approximately lines 1344–1407)
- [x] 2.2 Replace the existing `_ctx.ui.setStatus("spec-team", ...)` call at line 1332 with a call to `refreshStatus()`
- [x] 2.3 Verify the initial status line renders correctly on session start with zero usage

## 3. Update team switch handler

- [x] 3.1 In the team switch command handler (around line 997), replace `ctx.ui.setStatus("spec-team", `Team: ${name} (${agentStates.size})`)` with a call to `refreshStatus()`
- [x] 3.2 Verify the status line updates with the new team name suffix after team switch

## 4. Add event-driven refresh for dispatcher completions

- [x] 4.1 Add `pi.on("agent_end", async () => { refreshStatus(); })` handler so dispatcher token/cost totals refresh after each agent turn ends
- [x] 4.2 Verify that after the dispatcher makes an LLM call (producing assistant messages with usage), the status line reflects updated totals

## 5. Add refresh after dispatch completion

- [x] 5.1 In the `dispatch_agent` tool's `execute` method, after the `await dispatchAgent(...)` call resolves (around line 768), call `refreshStatus()` to reflect updated subagent totals
- [x] 5.2 Also call `refreshStatus()` in the catch block (around line 796) to ensure refresh happens on errors too
- [x] 5.3 Verify that after a subagent dispatch completes, the status line shows combined dispatcher + subagent totals

## 6. Verification and edge cases

- [x] 6.1 Verify the default footer's all three lines are visible (PWD/git, session info, extension statuses)
- [x] 6.2 Verify other extensions' `setStatus` calls remain visible alongside spec-team status
- [x] 6.3 Verify ANSI styled prefix renders correctly on common terminal emulators (no garbage characters)
- [x] 6.4 Verify status line truncation works in narrow terminals (< 80 cols) — default footer handles this
- [x] 6.5 Verify zero-usage state: `👥 spec-team  🔧 0 calls  $0  ctx 0% · <team>` (model omitted if unavailable)
- [x] 6.6 Verify that after a session reload/restore, the status line correctly reflects accumulated usage
- [x] 6.7 Verify team switch updates the team name suffix while preserving metrics
