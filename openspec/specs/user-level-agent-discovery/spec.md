# user-level-agent-discovery Specification

## Purpose

Define agent discovery from user-level directories (`~/.pi/agent/agents/` and `~/.agents/agents/`) in addition to existing project-level directories, with project-first precedence on name collisions.

## ADDED Requirements

### Requirement: User-level agent directories scanned

The agent discovery function SHALL scan the following user-level directories in addition to project-level directories:
- `<getAgentDir()>/agents/` (resolves to `~/.pi/agent/agents/` by default, respects `$PI_CODING_AGENT_DIR`)
- `~/.agents/agents/` (Agent Skills standard user-level directory)

#### Scenario: User-level agent found in ~/.pi/agent/agents/
- **WHEN** a user has an agent `.md` file at `~/.pi/agent/agents/custom-expert.md`
- **THEN** the agent is discovered and available for dispatch

#### Scenario: User-level agent found in ~/.agents/agents/
- **WHEN** a user has an agent `.md` file at `~/.agents/agents/custom-expert.md`
- **THEN** the agent is discovered and available for dispatch

#### Scenario: User-level directory missing
- **WHEN** `~/.pi/agent/agents/` or `~/.agents/agents/` does not exist
- **THEN** no error is raised and agent discovery continues with other directories

### Requirement: Project-level agents take precedence on name collision

When a user-level agent and a project-level agent share the same name (case-insensitive), the project-level agent SHALL be used and the user-level agent SHALL be ignored.

#### Scenario: Project agent overrides user agent of same name
- **WHEN** a project has `.pi/agents/explore.md` defining an agent named "explore"
- **AND** the user has `~/.pi/agent/agents/explore.md` defining a different agent also named "explore"
- **THEN** the project-level `explore` agent is used
- **AND** the user-level `explore` agent is ignored

#### Scenario: User agent available when no project collision
- **WHEN** a user has `~/.pi/agent/agents/custom-expert.md` defining an agent named "custom-expert"
- **AND** no project-level agent with the name "custom-expert" exists
- **THEN** the user-level "custom-expert" agent is discovered and available

### Requirement: User-level agent directory resolved via SDK

The agent discovery function SHALL use `getAgentDir()` from `@earendil-works/pi-coding-agent` to resolve the user configuration directory, and SHALL use `homedir()` from the `os` module to resolve `~/.agents/agents/`.

#### Scenario: PI_CODING_AGENT_DIR env var respected
- **WHEN** `$PI_CODING_AGENT_DIR` is set to `/custom/pi/config`
- **THEN** user-level agents are discovered from `/custom/pi/config/agents/` instead of `~/.pi/agent/agents/`

### Requirement: Existing agent semantics apply uniformly

All existing agent definition fields (name, description, model, thinking, opt-in, tools, system prompt) and their semantics SHALL apply identically to user-level agents as they do to project-level agents.

#### Scenario: Opt-in flag honored for user-level agent
- **WHEN** a user-level agent has `opt-in: true` in its frontmatter
- **THEN** the agent is excluded from the default "all" team (same as project-level opt-in agents)

#### Scenario: Model field honored for user-level agent
- **WHEN** a user-level agent has `model: "openrouter/anthropic/claude-sonnet-4"` in its frontmatter
- **THEN** dispatching that agent spawns `pi` with `--model openrouter/anthropic/claude-sonnet-4`

#### Scenario: Thinking field honored for user-level agent
- **WHEN** a user-level agent has `thinking: high` in its frontmatter
- **THEN** dispatching that agent spawns `pi` with `--thinking high`

#### Scenario: Teams.yaml membership includes user-level agents
- **WHEN** a teams.yaml defines a team that includes "custom-expert"
- **AND** "custom-expert" is only defined at the user level (no project-level agent of that name)
- **THEN** the user-level "custom-expert" agent is included in the team

### Requirement: Documentation reflects discovery scope

The file header comment of `extensions/spec-teams.ts` and the doc comment for `scanAgentDirs()` SHALL document that agents are discovered from both project-level and user-level directories.

#### Scenario: File header mentions user-level discovery
- **WHEN** a developer reads the file header of `extensions/spec-teams.ts`
- **THEN** the comment documents that agent definitions are loaded from user-level directories (`~/.pi/agent/agents/`, `~/.agents/agents/`) in addition to project-level directories

#### Scenario: scanAgentDirs doc comment mentions user-level paths
- **WHEN** a developer reads the doc comment of `scanAgentDirs()`
- **THEN** the comment lists both project-level and user-level scan paths in correct precedence order
