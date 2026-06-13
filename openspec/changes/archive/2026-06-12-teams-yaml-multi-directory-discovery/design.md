## Context

The spec-teams extension discovers agent `.md` files across 5 directories (3 project-level + 2 user-level) via `scanAgentDirs()`, but loads `teams.yaml` only from `<cwd>/.pi/agents/teams.yaml`. This means:

1. **User-level team definitions are ignored** — If a user places agents at `~/.pi/agent/agents/` and wants to define teams for them, they must also create a project-level `.pi/agents/teams.yaml`. There's no way to configure teams purely at the user level.

2. **Missing project file gives default instead of fallthrough** — If the project has no `.pi/agents/teams.yaml`, the extension falls back to a default `"all"` team rather than checking user-level directories for a `teams.yaml`.

3. **Asymmetric discovery model** — Agents follow a "project-first, fallthrough to user" pattern. Teams should use the same model for consistency and predictability.

The 5 directories `scanAgentDirs()` scans (in order):
1. `<cwd>/agents/`
2. `<cwd>/.claude/agents/`
3. `<cwd>/.pi/agents/`
4. `<getAgentDir()>/agents/` — `~/.pi/agent/agents/` by default
5. `<homedir()>/.agents/agents/`

## Goals / Non-Goals

**Goals:**
- Make `teams.yaml` discovery follow the same multi-directory, first-seen-wins pattern as agent `.md` files
- Preserve full backward compatibility — existing projects with `.pi/agents/teams.yaml` work identically
- Enable user-level team definitions that work alongside user-level agent definitions
- Update documentation to reflect the new discovery locations

**Non-Goals:**
- Changes to `parseTeamsYaml()` parsing logic (YAML format stays the same)
- Merging `teams.yaml` files across directories (first-seen-wins, no merge)
- Changes to the `teams.yaml` YAML schema (no new fields like `include` or `extends`)
- Changes to how teams are selected or activated after loading

## Decisions

### D1: Extract `findTeamsYaml()` utility function

**Chosen**: Create a new `findTeamsYaml(cwd: string): string | null` function in `spec-teams-utils.ts` that scans the same 5 directories as `scanAgentDirs()`, returning the first `teams.yaml` found or `null` if none exists.

**Alternatives considered**:
- **Inline the loop in `loadAgents()`** — Would couple discovery logic to the main extension file. Extracting keeps it testable and mirrors `scanAgentDirs()` pattern.
- **Merge all found `teams.yaml` files** — Would create complex conflict resolution (what if two files define the same team name?). First-seen-wins is simpler and matches agent name collision semantics.

**Rationale**: A dedicated utility function in `spec-teams-utils.ts` mirrors the architecture of `scanAgentDirs()` — both are pure, testable functions that handle directory scanning. The function reuses the exact same directory list and priority order.

### D2: Directory list shared constants

**Chosen**: Extract the 5-directory scan list into a shared `getAgentDirs(cwd: string): string[]` function that both `scanAgentDirs()` and `findTeamsYaml()` call. This ensures the directories and priority order never drift between the two functions.

**Alternatives considered**:
- **Duplicate the directory list in `findTeamsYaml()`** — Risk of drift if one is updated and the other isn't.
- **Hardcode paths differently for teams.yaml** — Would violate the constraint that teams discovery must use the same directories.

**Rationale**: A single source of truth for the directory list prevents bugs where agent discovery and teams discovery scan different directories.

### D3: `loadAgents()` uses `findTeamsYaml()` instead of hardcoded path

**Chosen**: Replace the hardcoded `join(cwd, ".pi", "agents", "teams.yaml")` path in `loadAgents()` with a call to `findTeamsYaml(cwd)`. When it returns `null`, fall back to the default "all" team (current behavior when no file exists).

**Alternatives considered**:
- **Keep hardcoded path as a fallback** — Unnecessary since `findTeamsYaml` checks `.pi/agents/` as directory #3, which is the current location. If a project has `.pi/agents/teams.yaml` today, it will be found first.
- **Log which directory provided `teams.yaml`** — Nice for debugging but not required for the initial change. Can be added later.

**Rationale**: Using `findTeamsYaml()` is a clean replacement. The only behavioral change is that `teams.yaml` can now be found in directories 1, 2, 4, or 5 as well. For all current users (who have it in `.pi/agents/`), behavior is unchanged.

### D4: Update startup notification and warning message to show discovery path

**Chosen**: The `/specs-team` warning message "No teams defined in .pi/agents/teams.yaml" and the startup notification "Team sets loaded from: .pi/agents/teams.yaml" should use the actual discovery path rather than a hardcoded string.

**Alternatives considered**:
- **Keep hardcoded message** — Misleading after this change since teams.yaml might not be in `.pi/agents/`.
- **Just remove the path from messages** — Loses useful debugging info.

**Rationale**: Showing the actual path is more honest and helps users debug where their teams.yaml is being loaded from, especially when using user-level configurations.

## Risks / Trade-offs

- **[Team name collision across directories]** → First-seen-wins means a project-level `teams.yaml` completely shadows a user-level one. If a user has `teams.yaml` at `.pi/agents/` and also at `~/.pi/agent/agents/`, only the project one is used. This is consistent with agent `.md` collision behavior and is the simplest semantics. **Mitigation**: Document this clearly.

- **[User-level teams referencing project-level agents]** → If `teams.yaml` at `~/.pi/agent/agents/` references an agent name only defined in the project, the team entry will be silently ignored at activation time (already handled — `activateTeam()` skips missing agents). **Mitigation**: This is existing behavior; no change needed.

- **[No merging] →** A user-level `teams.yaml` cannot supplement a project-level one. If both exist, only the project one is used. This is the simplest semantic and matches agent discovery. Users who want to extend teams must copy the project file and add to it. **Mitigation**: Acceptable trade-off; merging would add significant complexity.

- **[Current `.pi/agents/teams.yaml` location still works]** → Since `.pi/agents/` is directory #3 in the scan order, any existing project with `teams.yaml` at `.pi/agents/` continues to work. However, `agents/` (directory #1) takes precedence. If someone has `teams.yaml` in both `agents/` and `.pi/agents/`, the one in `agents/` wins. **Mitigation**: This is unlikely and consistent with agent discovery behavior.