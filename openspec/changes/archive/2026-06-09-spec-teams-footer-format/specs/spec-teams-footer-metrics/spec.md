## ADDED Requirements

### Requirement: Footer renders single-line metrics with team name

The spec-teams extension footer SHALL render a single line combining aggregate usage metrics (using the `formatMetricsFooter()` format) suffixed with the active team name. The footer SHALL produce exactly 1 line.

#### Scenario: Footer with active team and usage
- **WHEN** the extension is loaded in TUI mode with an active team
- **AND** the dispatcher has consumed tokens through its own LLM calls
- **AND** subagents have accumulated usage through dispatch runs
- **THEN** the footer renders 1 line:
  - `🔧 N calls  ↑inputs  ↓outputs  $cost  ctx M%  🤖 short-model · teamName`

#### Scenario: Footer when no subagents have run
- **WHEN** no subagents have been dispatched yet (all `agentStates` entries have `toolCount === 0`)
- **AND** the dispatcher has made some LLM calls
- **THEN** the metrics line shows combined dispatcher-only totals
- **AND** the tool call count includes at least the dispatcher's dispatch_agent calls if any

#### Scenario: Footer with zero usage across all sources
- **WHEN** no dispatcher LLM calls have been made and no subagents have run
- **THEN** the metrics line shows `🔧 0 calls  $0  ctx N%  🤖 short-model`

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

### Requirement: Footer line respects terminal width

The footer line SHALL be truncated to the terminal width using `truncateToWidth()`. The full string (`formatMetricsFooter(details) · teamName`) SHALL be built first, then truncated to the terminal width.

#### Scenario: Narrow terminal
- **WHEN** the terminal width is 40 columns
- **THEN** the footer line is truncated to 40 characters without wrapping
- **AND** no line-width exceptions are thrown

#### Scenario: Wide terminal
- **WHEN** the terminal width is 120 columns
- **THEN** the footer line renders fully without truncation
