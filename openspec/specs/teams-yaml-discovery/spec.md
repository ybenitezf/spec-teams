# teams-yaml-discovery Specification

## Purpose

Define multi-directory discovery of `teams.yaml` across the same five agent scan directories, with first-seen-wins priority, sharing the directory list with agent discovery to prevent drift.

## Requirements

### Requirement: Multi-directory teams.yaml discovery

The `findTeamsYaml(cwd: string)` function SHALL scan the same 5 directories as `scanAgentDirs()` for a `teams.yaml` file, in the same priority order. The directories and their order SHALL be:

1. `<cwd>/agents/`
2. `<cwd>/.claude/agents/`
3. `<cwd>/.pi/agents/`
4. `<getAgentDir()>/agents/` — resolves to `~/.pi/agent/agents/` by default, respects `$PI_CODING_AGENT_DIR`
5. `<homedir()>/.agents/agents/`

The function SHALL return the full path to the first `teams.yaml` file found, or `null` if none exists. Project-level directories take precedence over user-level directories (first-seen-wins).

#### Scenario: teams.yaml found in project-level agents/ directory
- **WHEN** `<cwd>/agents/teams.yaml` exists
- **THEN** `findTeamsYaml(cwd)` returns the path `<cwd>/agents/teams.yaml`
- **AND** no other directories are checked for teams.yaml

#### Scenario: teams.yaml found in .pi/agents/ directory
- **WHEN** `<cwd>/agents/teams.yaml` does NOT exist
- **AND** `<cwd>/.pi/agents/teams.yaml` exists
- **THEN** `findTeamsYaml(cwd)` returns the path `<cwd>/.pi/agents/teams.yaml`

#### Scenario: teams.yaml found in user-level directory
- **WHEN** no project-level `teams.yaml` exists
- **AND** `~/.pi/agent/agents/teams.yaml` exists
- **THEN** `findTeamsYaml(cwd)` returns the path `~/.pi/agent/agents/teams.yaml`

#### Scenario: teams.yaml found in .agents user directory
- **WHEN** no project-level `teams.yaml` exists
- **AND** no `teams.yaml` exists in `~/.pi/agent/agents/`
- **AND** `~/.agents/agents/teams.yaml` exists
- **THEN** `findTeamsYaml(cwd)` returns the path `~/.agents/agents/teams.yaml`

#### Scenario: Project-level teams.yaml shadows user-level
- **WHEN** `<cwd>/.pi/agents/teams.yaml` exists (project-level)
- **AND** `~/.pi/agent/agents/teams.yaml` exists (user-level)
- **THEN** `findTeamsYaml(cwd)` returns the project-level path `<cwd>/.pi/agents/teams.yaml`
- **AND** the user-level file is NOT read

#### Scenario: No teams.yaml found anywhere
- **WHEN** no `teams.yaml` file exists in any of the 5 directories
- **THEN** `findTeamsYaml(cwd)` returns `null`

#### Scenario: PI_CODING_AGENT_DIR env var respected for teams
- **WHEN** `$PI_CODING_AGENT_DIR` is set to `/custom/pi/config`
- **THEN** `findTeamsYaml(cwd)` checks `/custom/pi/config/agents/teams.yaml` as directory #4

#### Scenario: Missing directories skipped
- **WHEN** a scan directory does not exist (e.g., `~/.agents/agents/`)
- **THEN** no error is raised and scanning continues to the next directory

### Requirement: Shared agent directory list

The 5-directory scan list used for agent discovery and teams.yaml discovery SHALL be defined in a single shared function `getAgentDirs(cwd: string): string[]`. Both `scanAgentDirs()` and `findTeamsYaml()` SHALL use this shared function to iterate directories. This ensures the directory order and paths never drift between agent and teams discovery.

#### Scenario: scanAgentDirs and findTeamsYaml use same directory list
- **WHEN** `scanAgentDirs(cwd)` and `findTeamsYaml(cwd)` are both called with the same cwd
- **THEN** both functions iterate the same directories in the same order
- **AND** neither function contains a hardcoded directory list that differs from the other

### Requirement: loadAgents uses findTeamsYaml

The `loadAgents()` function SHALL use `findTeamsYaml(cwd)` to locate `teams.yaml` instead of the hardcoded path `join(cwd, ".pi", "agents", "teams.yaml")`. When `findTeamsYaml()` returns a path, that file SHALL be read and parsed. When `findTeamsYaml()` returns `null`, the default "all" team (excluding opt-in agents) SHALL be created — identical to the current behavior when no `teams.yaml` file exists.

#### Scenario: loadAgents discovers teams.yaml in user-level directory
- **WHEN** no project-level `teams.yaml` exists
- **AND** `~/.pi/agent/agents/teams.yaml` exists
- **THEN** `loadAgents()` loads teams from the user-level file
- **AND** the teams are available for selection via `/specs-team`

#### Scenario: loadAgents falls back to default team when no teams.yaml exists anywhere
- **WHEN** `findTeamsYaml()` returns `null`
- **THEN** `loadAgents()` creates the default "all" team excluding opt-in agents
- **AND** behavior is identical to the current single-directory implementation when no file exists

#### Scenario: loadAgents with existing .pi/agents/teams.yaml unchanged
- **WHEN** `<cwd>/.pi/agents/teams.yaml` exists (current standard location)
- **THEN** `loadAgents()` finds and loads it (directory #3 in scan order)
- **AND** team definitions are identical to the current implementation

#### Scenario: loadAgents with agents/teams.yaml at project root
- **WHEN** `<cwd>/agents/teams.yaml` exists (top-priority directory)
- **THEN** `loadAgents()` finds and loads it
- **AND** no other `teams.yaml` files are checked

### Requirement: Startup notification shows discovered teams path

The extension's startup notification and `/specs-team` warning message SHALL display the actual path where `teams.yaml` was found, rather than the hardcoded string `.pi/agents/teams.yaml`. When no `teams.yaml` was found (default team), the notification SHALL indicate that the default team is active.

#### Scenario: Startup notification with project-level teams.yaml
- **WHEN** the extension loads and finds `teams.yaml` at `<cwd>/.pi/agents/teams.yaml`
- **THEN** the startup notification shows `Team sets loaded from: <cwd>/.pi/agents/teams.yaml`

#### Scenario: Startup notification with user-level teams.yaml
- **WHEN** the extension loads and finds `teams.yaml` at `~/.pi/agent/agents/teams.yaml`
- **THEN** the startup notification shows `Team sets loaded from: ~/.pi/agent/agents/teams.yaml`

#### Scenario: Startup notification with default team
- **WHEN** the extension loads and no `teams.yaml` is found in any directory
- **THEN** the startup notification shows that the default "all" team is active
