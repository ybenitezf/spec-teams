# worker-agent Delta Specification

Delta spec for `prompt-complexity` — streamlines headless constraint to consistent pattern.

## MODIFIED Requirements

### Requirement: Headless execution
The worker agent SHALL run headless with no user interaction tools. The agent's system prompt SHALL open with a structured headless constraint block following the same pattern used by all spec-teams agents: identity → headless constraint (no user interaction tools, never wait for user input, return structured status) → role boundary. The tools field SHALL NOT include AskUserQuestion or any user interaction tool. The worker SHALL use the status signals `done` and `blocked` — it SHALL NOT use multi-turn relay signals.

#### Scenario: No user interaction tools available
- **WHEN** the worker agent is dispatched
- **THEN** the worker does NOT have AskUserQuestion or any user interaction tool
- **AND** the worker's `tools` field does NOT include user interaction tools

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the constraint states no user interaction tools and no waiting for user input

#### Scenario: Worker uses only done and blocked
- **WHEN** the worker agent concludes any response
- **THEN** the response does NOT contain `Status: need-input`, `Status: ready-to-propose`, or `Status: done-exploring`
