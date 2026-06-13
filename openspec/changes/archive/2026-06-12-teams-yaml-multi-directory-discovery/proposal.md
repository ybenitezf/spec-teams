## Why

Agent `.md` files are discovered across 5 directories (3 project-level + 2 user-level), but `teams.yaml` is only read from `<cwd>/.pi/agents/teams.yaml`. This asymmetry means user-level team definitions are silently ignored, and if the project-level file is missing, the extension falls back to a default `"all"` team instead of checking user-level locations. Users who set up agents at `~/.pi/agent/agents/` or `~/.agents/agents/` have no way to define corresponding teams at those levels — they must always create a project-level file even for purely user-level agent setups.

## What Changes

- **Multi-directory `teams.yaml` discovery** — `loadAgents()` will scan the same 5 directories as `scanAgentDirs()`, looking for `teams.yaml` alongside agent `.md` files. The first `teams.yaml` found wins (project overrides user), mirroring the agent discovery semantics.
- **Backward-compatible semantics** — Projects with an existing `<cwd>/.pi/agents/teams.yaml` (or `<cwd>/agents/teams.yaml`) are unaffected; the first-seen-wins rule preserves current behavior.
- **User-level team configuration** — Users can place `teams.yaml` at `~/.pi/agent/agents/teams.yaml` or `~/.agents/agents/teams.yaml` to define teams for user-level agents.

## Capabilities

### New Capabilities
- `teams-yaml-discovery`: Multi-directory discovery for `teams.yaml` files, following the same directories and priority order as agent `.md` discovery.

### Modified Capabilities
- `spec-teams-extension`: The `loadAgents()` function's `teams.yaml` loading behavior changes from single-path to multi-path discovery. The `Teams.yaml with openspec and full teams` requirement needs an update to specify that `teams.yaml` is discovered across multiple directories (not just `.pi/agents/`).
- `user-level-agent-discovery`: The existing requirement about "Teams.yaml membership includes user-level agents" assumes teams.yaml is project-level only. This changes to allow user-level `teams.yaml` to define teams that reference user-level agents.

## Impact

- **Code**: `extensions/spec-teams.ts` — `loadAgents()` function changes from single-path to multi-path `teams.yaml` discovery. `extensions/spec-teams-utils.ts` — new `findTeamsYaml()` utility function (or extension of `scanAgentDirs` pattern).
- **Documentation**: README.md — update Teams section to document the multi-directory discovery locations and priority order. CONTRIBUTING.md — update any references to the `teams.yaml` path.
- **Specs**: `spec-teams-extension` spec — update `Teams.yaml with openspec and full teams` requirement. `user-level-agent-discovery` spec — update `Teams.yaml membership includes user-level agents` scenario.
- **No breaking changes** — Projects with `teams.yaml` at the current `.pi/agents/` location continue to work identically (first-seen-wins).