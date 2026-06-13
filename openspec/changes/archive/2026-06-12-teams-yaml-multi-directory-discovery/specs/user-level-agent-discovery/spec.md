## MODIFIED Requirements

### Requirement: Existing agent semantics apply uniformly

All existing agent definition fields (name, description, model, thinking, opt-in, tools, system prompt) and their semantics SHALL apply identically to user-level agents as they do to project-level agents. Team membership for user-level agents SHALL be determined from `teams.yaml` files discovered using the same multi-directory scan as agent `.md` files.

#### Scenario: Opt-in flag honored for user-level agent
- **WHEN** a user-level agent has `opt-in: true` in its frontmatter
- **THEN** the agent is excluded from the default "all" team (same as project-level opt-in agents)

#### Scenario: Model field honored for user-level agent
- **WHEN** a user-level agent has `model: "openrouter/anthropic/claude-sonnet-4"` in its frontmatter
- **THEN** dispatching that agent spawns `pi` with `--model openrouter/anthropic/claude-sonnet-4`

#### Scenario: Thinking field honored for user-level agent
- **WHEN** a user-level agent has `thinking: high` in its frontmatter
- **THEN** dispatching that agent spawns `pi` with `--thinking high`

#### Scenario: Teams.yaml membership includes user-level agents using user-level teams.yaml
- **WHEN** a `teams.yaml` file at `~/.pi/agent/agents/teams.yaml` defines a team that includes "custom-expert"
- **AND** "custom-expert" is only defined at the user level (no project-level agent of that name)
- **AND** no project-level `teams.yaml` exists
- **THEN** the user-level "custom-expert" agent is included in the team
- **AND** the team definitions from the user-level `teams.yaml` are used

#### Scenario: User-level teams.yaml with project-level agents
- **WHEN** a `teams.yaml` at `~/.pi/agent/agents/` references agents defined at the project level
- **THEN** those project-level agents are included in the team (agents are discovered across all directories)

#### Scenario: Project-level teams.yaml takes precedence over user-level
- **WHEN** a `teams.yaml` exists at `<cwd>/.pi/agents/teams.yaml` (project-level)
- **AND** a `teams.yaml` also exists at `~/.pi/agent/agents/teams.yaml` (user-level)
- **THEN** the project-level `teams.yaml` is used exclusively
- **AND** the user-level `teams.yaml` is NOT read