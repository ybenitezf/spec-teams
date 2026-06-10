## Context

`scanAgentDirs()` in `extensions/spec-teams.ts` currently scans three project-local directories relative to `cwd`:

```ts
const dirs = [
    join(cwd, "agents"),
    join(cwd, ".claude", "agents"),
    join(cwd, ".pi", "agents"),
];
```

Pi core's resource discovery (`package-manager.js`) already discovers skills from both project and user levels. Pi's subagent example (`examples/extensions/subagent/agents.ts`) demonstrates a `discoverAgents()` function with explicit user+project scope support using `getAgentDir()`. The `getAgentDir()` function (exported from `@earendil-works/pi-coding-agent`) resolves to `~/.pi/agent/` or the value of `$PI_CODING_AGENT_DIR`, providing a consistent user config path.

The Agent Skills ecosystem standardizes user-level skill storage at `~/.agents/`. The equivalent for agents is `~/.agents/agents/`. Both paths should be scanned to maximize compatibility.

**Constraints:**
- `getAgentDir()` must be used, not a hardcoded path (respects `$PI_CODING_AGENT_DIR`)
- Project-level agents must take precedence on name collisions
- The existing opt-in mechanic (`optIn: true` in frontmatter) must work the same way for user-level agents
- No changes to teams.yaml, dispatch logic, or UI

## Goals / Non-Goals

**Goals:**
- Add user-level agent discovery to `scanAgentDirs()`: `~/.pi/agent/agents/` and `~/.agents/agents/`
- Preserve project-first precedence in deduplication order
- Use `getAgentDir()` from the Pi SDK for path resolution
- Update doc comments to document the new discovery scope

**Non-Goals:**
- Scope-aware team configuration (e.g., "use only project agents")
- Changes to the teams.yaml mechanism or team selection
- UI changes for distinguishing user vs project agents in the dashboard
- Scanning `~/.claude/agents/` (Claude-specific user config — not a Pi standard)
- Ancestor-directory walking (scanning parent dirs of `cwd`)

## Decisions

### Decision 1: Scan user dirs after project dirs, rely on existing dedup

**Chosen:** Append user-level directory paths to the `dirs` array after project paths. The existing deduplication loop already uses a `seen` Set keyed on `def.name.toLowerCase()`. Since project paths are iterated first, a project agent with the same name as a user agent will be added first and the user version skipped.

**Alternatives considered:**
- *Separate merge pass*: Scan project and user dirs separately, then merge with explicit project-wins logic. More code, no benefit — the existing loop already handles this correctly.
- *Scan user dirs first*: Would allow user agents to override project agents. Violates the established Pi pattern of project scope winning over global scope.

**Rationale:** Zero behavioral change to deduplication. The `seen` Set naturally enforces first-match-wins. By appending user dirs, project agents are "first match."

### Decision 2: Use `getAgentDir()` + hardcoded `~/.agents/agents/`

**Chosen:** Resolve the Pi user config dir via `getAgentDir()` and append `agents/` to get `~/.pi/agent/agents/`. Hardcode `~/.agents/agents/` for the Agent Skills standard path. Use `homedir()` from the `os` module (already imported) to resolve `~`.

**Alternatives considered:**
- *Only `getAgentDir()`*: Misses `~/.agents/agents/` which is the Agent Skills ecosystem standard. Users coming from other tools may store agents there.
- *Only `~/.agents/agents/`*: Misses `~/.pi/agent/agents/` which is Pi's canonical user config location.
- *Environment variable for additional paths*: Over-engineering for this scope.

**Rationale:** Cover both Pi-native and Agent Skills ecosystem paths. `homedir()` is already imported by spec-teams.ts. `getAgentDir()` is a one-line import addition.

### Decision 3: Keep `cwd` parameter, add user paths unconditionally

**Chosen:** `scanAgentDirs(cwd)` continues to accept `cwd`. User-level paths are computed inside the function using `getAgentDir()` and `homedir()`. No new parameters or configuration.

**Alternatives considered:**
- *Add a `scope` parameter*: Would require changes to the call site and configuration. Out of scope.
- *Make user paths configurable via an env var*: Unnecessary complexity for this change.

**Rationale:** Minimal API surface change. The function signature stays the same. User-level scanning happens transparently.

## Risks / Trade-offs

- **[Risk] User-level agent accidentally shadows a project agent name** → Mitigation: Project agents win (project-first ordering). If a user defines `explore.md` at user level and the project also has one, the project's version is used. This is the desired behavior.
- **[Risk] User-level agent with same name but different frontmatter** → Mitigation: Since project wins, the user-level version is silently ignored. Could be confusing if user expected their user-level config to apply. Acceptable trade-off — project scope should override.
- **[Risk] `getAgentDir()` returns a non-existent directory** → Mitigation: The `existsSync(dir)` guard already skips missing directories. No error.
- **[Risk] Breaking change in `getAgentDir()` API** → Mitigation: It's a stable exported function from the Pi SDK. Used throughout Pi core. Low risk.
