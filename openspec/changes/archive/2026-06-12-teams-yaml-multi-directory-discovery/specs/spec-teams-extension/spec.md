## MODIFIED Requirements

### Requirement: Teams.yaml with openspec and full teams

The project SHALL contain a `teams.yaml` file discoverable in one of the agent scan directories (in priority order: `<cwd>/agents/`, `<cwd>/.claude/agents/`, `<cwd>/.pi/agents/`, `<getAgentDir()>/agents/`, `<homedir()>/.agents/agents/`). The file SHALL define at least two teams: an `openspec` team (explore, propose, apply, verify, archive) and a `full` team (all agents including worker). The `openspec` team SHALL be listed first and become the default.

#### Scenario: Teams.yaml file discovered at project-level
- **WHEN** the extension loads
- **AND** a `teams.yaml` file exists in `<cwd>/.pi/agents/` (or any project-level scan directory)
- **THEN** the `teams.yaml` is found and parsed
- **AND** the `openspec` and `full` teams are available for selection

#### Scenario: Teams.yaml file discovered at user-level
- **WHEN** the extension loads
- **AND** no project-level `teams.yaml` exists
- **AND** a `teams.yaml` file exists in `<getAgentDir()>/agents/` (or `~/.agents/agents/`)
- **THEN** the user-level `teams.yaml` is found and parsed
- **AND** the teams defined in it are available for selection

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

#### Scenario: Project-level teams.yaml takes precedence over user-level
- **WHEN** a `teams.yaml` exists at both `<cwd>/.pi/agents/teams.yaml` and `<getAgentDir()>/agents/teams.yaml`
- **THEN** the project-level file is used
- **AND** the user-level file is NOT read

### Requirement: Opt-in frontmatter field

The `parseAgentFile()` function SHALL extract an optional `opt-in` field from agent Markdown frontmatter. When present and truthy (case-insensitive match to "true"), the agent SHALL be marked as opt-in in its `AgentDef`. When absent or any other value, the agent is treated as standard (non-opt-in). When no `teams.yaml` file is found in any scan directory, agents with `optIn: true` SHALL be excluded from the default "all" team.

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

#### Scenario: Default team excludes opt-in agents
- **WHEN** `loadAgents()` runs and no `teams.yaml` is found in any scan directory
- **AND** the parsed agents include a worker agent with `optIn: true` and five standard agents
- **THEN** the default "all" team contains only the five standard agents
- **AND** the worker agent is excluded from the active team

#### Scenario: All agents are standard
- **WHEN** `loadAgents()` runs and no `teams.yaml` is found in any scan directory
- **AND** all parsed agents are standard (no `optIn: true`)
- **THEN** the default "all" team contains all agents
- **AND** behavior is identical to before this change

#### Scenario: Teams.yaml takes precedence
- **WHEN** a `teams.yaml` file is found in any scan directory (project or user level)
- **THEN** the opt-in frontmatter field has NO effect on team membership
- **AND** team membership is determined solely by teams.yaml