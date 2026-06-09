## ADDED Requirements

### Requirement: Opt-in frontmatter field

The `parseAgentFile()` function SHALL extract an optional `opt-in` field from agent Markdown frontmatter. When present and truthy (case-insensitive match to "true"), the agent SHALL be marked as opt-in in its `AgentDef`. When absent or any other value, the agent is treated as standard (non-opt-in).

#### Scenario: Opt-in field present and true
- **WHEN** an agent `.md` file contains `opt-in: true`
- **THEN** `parseAgentFile()` returns a definition with `optIn: true`

#### Scenario: Opt-in field absent
- **WHEN** an agent `.md` file does NOT contain an `opt-in` field
- **THEN** `parseAgentFile()` returns a definition with `optIn: false` (or undefined, treated as false)

#### Scenario: Opt-in field with non-truthy value
- **WHEN** an agent `.md` file contains `opt-in: false` or `opt-in: no`
- **THEN** the agent is treated as standard (non-opt-in)

#### Scenario: Existing agents unaffected
- **WHEN** an existing agent file without an `opt-in` field is parsed
- **THEN** the parsed AgentDef works identically to before this change

### Requirement: Default team excludes opt-in agents

When no `teams.yaml` file exists in `.pi/agents/`, the `loadAgents()` function SHALL create a default team that includes all parsed agents EXCEPT those with `optIn: true`. The default team SHALL be named "all".

#### Scenario: Default team without opt-in agents
- **WHEN** `loadAgents()` runs and no `teams.yaml` exists
- **AND** the parsed agents include a worker agent with `optIn: true` and five standard agents
- **THEN** the default "all" team contains only the five standard agents
- **AND** the worker agent is excluded from the active team

#### Scenario: All agents are standard
- **WHEN** `loadAgents()` runs and no `teams.yaml` exists
- **AND** all parsed agents are standard (no `optIn: true`)
- **THEN** the default "all" team contains all agents
- **AND** behavior is identical to before this change

#### Scenario: Teams.yaml takes precedence
- **WHEN** a `teams.yaml` file exists in `.pi/agents/`
- **THEN** the opt-in frontmatter field has NO effect on team membership
- **AND** team membership is determined solely by teams.yaml

### Requirement: Teams.yaml with openspec and full teams

The project SHALL contain `.pi/agents/teams.yaml` defining at least two teams: an `openspec` team (explore, propose, apply, verify, archive) and a `full` team (all agents including worker). The `openspec` team SHALL be listed first and become the default.

#### Scenario: Teams.yaml file exists
- **WHEN** the extension loads
- **THEN** `.pi/agents/teams.yaml` is found and parsed
- **AND** the `openspec` and `full` teams are available for selection

#### Scenario: Openspec team is first (default)
- **WHEN** the extension starts a session
- **THEN** the `openspec` team is activated by default (first in list)
- **AND** the active team contains explore, propose, apply, verify, and archive agents

#### Scenario: Full team includes worker
- **WHEN** the user runs `/specs-team` and selects the `full` team
- **THEN** the active team contains all six agents including worker
- **AND** the worker agent is available for dispatch

#### Scenario: Worker not in openspec team
- **WHEN** the `openspec` team is active
- **THEN** the worker agent is NOT in the agent catalog
- **AND** the dispatcher cannot dispatch to worker

### Requirement: Worker agent routing guidance in system prompt

The dispatcher system prompt SHALL include a "Non-OpenSpec Tasks" section with heuristics for routing to the worker agent. The guidance SHALL distinguish general task execution (git, file operations, quick scripts, web requests, one-off edits) from OpenSpec workflow activities (exploring, proposing, implementing, verifying, archiving). The system prompt SHALL include a "Worker Hand-off" section instructing the dispatcher to review worker output for patterns suggesting OpenSpec workflow (complexity uncovered, architectural issues, multi-component changes) and to suggest — but NOT automatically dispatch — an explore or propose agent.

#### Scenario: Non-OpenSpec task routed to worker
- **WHEN** a user requests a non-OpenSpec task (git commit, web fetch, quick script, file operation, one-off edit)
- **AND** the worker agent is on the active team
- **THEN** the dispatcher routes the task to the worker agent

#### Scenario: OpenSpec task NOT routed to worker
- **WHEN** a user request matches OpenSpec workflow patterns (exploring, proposing, implementing a spec change)
- **THEN** the dispatcher does NOT route to the worker agent
- **AND** the dispatcher routes to the appropriate OpenSpec agent

#### Scenario: Worker output reveals complexity — dispatcher suggests exploration
- **WHEN** the worker agent completes a task
- **AND** the output reveals broader complexity, architectural concerns, or multi-component implications
- **THEN** the dispatcher SHALL suggest to the user that an OpenSpec exploration may be warranted
- **AND** the dispatcher SHALL NOT automatically dispatch an explore agent without user confirmation

#### Scenario: Worker returns blocked — dispatcher asks user
- **WHEN** the worker agent returns `Status: blocked`
- **THEN** the dispatcher SHALL present the blocker to the user
- **AND** the dispatcher SHALL ask the user how to proceed (retry, explore, abandon)

#### Scenario: Worker not on team — no non-OpenSpec routing
- **WHEN** a user requests a non-OpenSpec task
- **AND** the worker agent is NOT on the active team
- **THEN** the dispatcher SHALL use the most general-purpose agent available
- **AND** this fallback behavior is identical to before this change

### Requirement: Worker status signals handled by dispatcher

The dispatcher system prompt SHALL include guidance for handling the worker agent's status signals: when `Status: done` is returned, the dispatcher SHALL review the output and summarize results for the user; when `Status: blocked` is returned, the dispatcher SHALL present the blocker and ask the user how to proceed.

#### Scenario: Worker done — dispatcher summarizes
- **WHEN** the worker agent returns `Status: done` with execution results
- **THEN** the dispatcher SHALL present a summary of what was accomplished to the user

#### Scenario: Worker blocked — dispatcher presents options
- **WHEN** the worker agent returns `Status: blocked` with a blocker description
- **THEN** the dispatcher SHALL present the blocker and ask the user how to proceed
