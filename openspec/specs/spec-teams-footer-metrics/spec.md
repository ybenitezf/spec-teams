## MODIFIED Requirements

### Requirement: Footer renders single-line metrics with team name

The spec-teams extension SHALL publish aggregate usage metrics and active team name onto the default footer's extension statuses line via `setStatus("spec-team", ...)`. It SHALL NOT replace the default footer via `setFooter`. The status line SHALL be a single string combining a styled prefix, the `formatMetricsFooter()` output, and the active team name suffix.

#### Scenario: Status line with active team and usage
- **WHEN** the extension is loaded in TUI mode with an active team
- **AND** the dispatcher has consumed tokens through its own LLM calls
- **AND** subagents have accumulated usage through dispatch runs
- **THEN** `setStatus` is called with key `"spec-team"` and a value containing:
  - A styled prefix (ANSI-formatted, including an emoji and the team label)
  - Metrics from `formatMetricsFooter()`: `🔧 N calls  ↑inputs  ↓outputs  $cost  ctx M%  🤖 short-model`
  - Suffix: `· <activeTeamName>`
- **AND** the value is a single string (no newlines)

#### Scenario: Status line coexists with other extensions
- **WHEN** the extension calls `setStatus("spec-team", ...)`
- **AND** another extension calls `setStatus("other-ext", ...)`
- **THEN** the default footer's line 3 renders both statuses space-separated
- **AND** the default footer's lines 1-2 (PWD, git branch, session name, token stats, model) remain visible

#### Scenario: Status line when no subagents have run
- **WHEN** no subagents have been dispatched yet (all `agentStates` entries have `toolCount === 0`)
- **AND** the dispatcher has made some LLM calls
- **THEN** the status line shows combined dispatcher-only totals
- **AND** the tool call count includes at least the dispatcher's dispatch_agent calls if any

#### Scenario: Status line with zero usage across all sources
- **WHEN** no dispatcher LLM calls have been made and no subagents have run
- **THEN** the status line shows `🔧 0 calls  $0  ctx N%  🤖 short-model` (with styled prefix and team name suffix)

### Requirement: Aggregate token and cost computation

The metrics line SHALL compute combined totals by summing:
- **Input tokens**: Sum of dispatcher session input tokens (from iterating `_ctx.sessionManager.getBranch()`, summing `usage.input` on assistant messages) + sum of all subagent `inputTokens` from `agentStates`
- **Output tokens**: Sum of dispatcher session output tokens (from iterating `_ctx.sessionManager.getBranch()`, summing `usage.output` on assistant messages) + sum of all subagent `outputTokens` from `agentStates`
- **Cost**: Sum of dispatcher session cost (from iterating `_ctx.sessionManager.getBranch()`, summing `usage.cost.total` on assistant messages) + sum of all subagent `cost` from `agentStates`

#### Scenario: Dispatcher and subagents both have usage
- **WHEN** the dispatcher session has 1 assistant message with 5000 input, 2000 output, $0.050
- **AND** the `agentStates` map has 2 agents: Agent A (10000 input, 5000 output, $0.10), Agent B (3000 input, 1000 output, $0.03)
- **THEN** the metrics line shows `↑18k  ↓8.0k  $0.1800`

#### Scenario: Only dispatcher has usage
- **WHEN** the dispatcher session has 3 assistant messages totaling 15000 input, 8000 output, $0.15
- **AND** `agentStates` are all idle with zero tokens
- **THEN** the metrics line shows `↑15k  ↓8.0k  $0.1500`

#### Scenario: Only subagents have usage
- **WHEN** the dispatcher session has zero assistant messages (no dispatcher LLM usage)
- **AND** one subagent has 5000 input, 2000 output, $0.05
- **THEN** the metrics line shows `↑5.0k  ↓2.0k  $0.0500`

### Requirement: Aggregate tool call count

The tool call count in the metrics line SHALL be the sum of all subagent `toolCount` values from `agentStates`. Dispatcher `dispatch_agent` calls SHALL be counted by iterating `_ctx.sessionManager.getBranch()` and counting entries where the tool name is `dispatch_agent`.

#### Scenario: Multiple subagents with tool calls
- **WHEN** Agent A has `toolCount: 5` and Agent B has `toolCount: 12`
- **AND** the dispatcher has made 2 `dispatch_agent` calls
- **THEN** the metrics line shows `🔧 19 calls`

#### Scenario: No dispatches yet
- **WHEN** no `dispatch_agent` calls have been made and all agents are idle with `toolCount: 0`
- **THEN** the metrics line shows `🔧 0 calls`

### Requirement: Context percentage uses main session only

The context percentage in the metrics line SHALL be derived from `_ctx.getContextUsage().percent`, representing the dispatcher's main session context window usage. Subagent context usage SHALL NOT be included in this percentage.

#### Scenario: Main session has partial context usage
- **WHEN** `_ctx.getContextUsage()` returns `{ percent: 65.3 }`
- **AND** subagents have various context percentages (visible in dashboard)
- **THEN** the metrics line shows `ctx 65%` (rounded from 65.3)

#### Scenario: Context usage unavailable
- **WHEN** `_ctx.getContextUsage()` returns `undefined`
- **THEN** the metrics line shows `ctx 0%`

### Requirement: Model display in footer metrics

The metrics line SHALL display the active model using the short form (last segment after `/`) via `_ctx.model?.id`. When no model is available, the model segment SHALL be omitted.

#### Scenario: Model with full provider path
- **WHEN** `_ctx.model?.id` is `"openrouter/anthropic/claude-sonnet-4"`
- **THEN** the model segment shows `🤖 claude-sonnet-4`

#### Scenario: No model set
- **WHEN** `_ctx.model?.id` is `undefined` or falsy
- **THEN** the metrics line does NOT include a `🤖` segment

## ADDED Requirements

### Requirement: Status line includes styled prefix

The status string SHALL include a styled prefix before the metrics. The prefix SHALL use ANSI escape codes for visual formatting and SHALL be terminated with an ANSI reset before the metrics portion. The prefix SHALL include a team-related emoji and the text `"spec-team"`.

#### Scenario: Styled prefix with ANSI formatting
- **WHEN** the status line is built
- **THEN** the prefix is formatted with ANSI bold and color codes (e.g., `\x1b[1m\x1b[36m👥 spec-team\x1b[0m`)
- **AND** the ANSI reset (`\x1b[0m`) immediately follows the prefix text
- **AND** no ANSI codes leak into the metrics portion

#### Scenario: ANSI codes have zero visible width
- **WHEN** the status string contains ANSI escape codes
- **THEN** the default footer's visible-width calculation ignores them
- **AND** truncation is based on visible characters only

### Requirement: Status refreshes at key update points

The extension SHALL refresh the `setStatus` value at discrete points where aggregate metrics change. A private `refreshStatus()` helper SHALL build and publish the status string from current state.

#### Scenario: Refresh on session start
- **WHEN** the `session_start` event fires
- **THEN** `refreshStatus()` is called, publishing the initial metrics status line

#### Scenario: Refresh on team switch
- **WHEN** the user switches to a different team via the `/specs-team` command
- **THEN** `refreshStatus()` is called, publishing metrics with the new team name in the suffix

#### Scenario: Refresh after dispatch completion
- **WHEN** a `dispatch_agent` call completes (subagent finishes)
- **AND** the subagent's `inputTokens`, `outputTokens`, `cost`, and `toolCount` are recorded in `agentStates`
- **THEN** `refreshStatus()` is called, reflecting the updated aggregate totals

#### Scenario: Refresh after dispatcher LLM completion
- **WHEN** the dispatcher's LLM call completes (producing assistant messages with usage data)
- **THEN** `refreshStatus()` is called, reflecting updated dispatcher token/cost totals

### Requirement: No setFooter call

The extension SHALL NOT call `_ctx.ui.setFooter()` (or `pi.ui.setFooter()`). The default pi-agent footer SHALL remain intact and unmodified.

#### Scenario: Default footer structure preserved
- **WHEN** the spec-teams extension is loaded in TUI mode
- **THEN** the default footer renders its standard three lines:
  - Line 1: PWD and git branch
  - Line 2: Session name, token count, model
  - Line 3: All extension statuses (including spec-team)
- **AND** no custom footer component is active from spec-teams

### Requirement: Status line respects terminal width

The status string passed to `setStatus` SHALL NOT be pre-truncated by the spec-teams extension. Terminal-width truncation SHALL be handled by the default footer's status line renderer. The extension SHALL build the full status string and pass it as-is to `setStatus`.

#### Scenario: Narrow terminal
- **WHEN** the terminal width is 40 columns
- **THEN** the default footer truncates the status line appropriately
- **AND** no line-width exceptions are thrown by the extension

#### Scenario: Wide terminal
- **WHEN** the terminal width is 120 columns
- **THEN** the full status line renders without truncation
