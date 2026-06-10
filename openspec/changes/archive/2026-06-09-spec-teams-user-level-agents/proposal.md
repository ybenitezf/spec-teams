## Why

`scanAgentDirs()` only discovers agents from project-level directories (`agents/`, `.claude/agents/`, `.pi/agents/` under `cwd`). Users who work across multiple projects must duplicate agent `.md` files in every repository. Pi core already supports user-level resource discovery for skills, themes, and other assets — spec-teams should follow the same pattern so users can define shared agents once at `~/.pi/agent/agents/` or `~/.agents/agents/`.

## What Changes

- Extend `scanAgentDirs()` to scan user-level agent directories (`~/.pi/agent/agents/` and `~/.agents/agents/`) after project-level directories
- Use the SDK's `getAgentDir()` function to resolve the user config directory (respects `$PI_CODING_AGENT_DIR`)
- Project-level agents take precedence in case of name collisions (project overrides user)
- All existing semantics — opt-in flag, teams.yaml membership, deduplication, model/thinking fields — apply uniformly to user-level agents
- Update the function's doc comment and the file header to reflect the new discovery scope

## Capabilities

### New Capabilities

- `user-level-agent-discovery`: Discovery of agent `.md` definitions from user-level directories (`~/.pi/agent/agents/` and `~/.agents/agents/`) in addition to project-level directories, with project-first precedence on name collisions

### Modified Capabilities

<!-- No existing spec requirements are changing — agent discovery is an implementation detail not yet formalized in spec requirements. -->

## Impact

- **Code**: `extensions/spec-teams.ts` — `scanAgentDirs()` function, imports (add `getAgentDir`), doc comments
- **Dependencies**: Adds usage of `getAgentDir` from `@earendil-works/pi-coding-agent` (already imported transitively via `getMarkdownTheme`)
- **No breaking changes**: Project-level discovery is unchanged; user-level scanning is additive and project agents win collisions
- **No API changes**: No changes to `dispatch_agent`, teams.yaml format, or agent `.md` file format
