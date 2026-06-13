## 1. Extract shared directory list

- [x] 1.1 Add `getAgentDirs(cwd: string): string[]` function to `spec-teams-utils.ts` that returns the 5-directory scan array (same list currently inlined in `scanAgentDirs`)
- [x] 1.2 Refactor `scanAgentDirs()` to call `getAgentDirs(cwd)` instead of its inline directory array
- [x] 1.3 Verify existing `scanAgentDirs` unit tests still pass after refactoring

## 2. Implement teams.yaml multi-directory discovery

- [x] 2.1 Add `findTeamsYaml(cwd: string): string | null` function to `spec-teams-utils.ts` that scans the directories from `getAgentDirs(cwd)` for `teams.yaml`, returning the first found path or `null`
- [x] 2.2 Refactor `loadAgents()` in `spec-teams.ts` — replace hardcoded `join(cwd, ".pi", "agents", "teams.yaml")` with a call to `findTeamsYaml(cwd)`. When `null`, fall back to default "all" team (current behavior)
- [x] 2.3 Store the discovered `teams.yaml` path so it can be referenced in the startup notification and warning message

## 3. Update user-facing messages

- [x] 3.1 Update the startup notification in `loadAgents()` / `session_start` handler to show the actual discovered path (e.g., `Team sets loaded from: <path>`) instead of hardcoded `.pi/agents/teams.yaml`. When no teams.yaml is found, indicate default team is active
- [x] 3.2 Update the `/specs-team` warning "No teams defined in .pi/agents/teams.yaml" to say "No teams defined" (without hardcoded path) since teams.yaml can now come from multiple locations

## 4. Unit tests

- [x] 4.1 Add unit tests for `getAgentDirs()` — verify it returns the correct 5 directories in order
- [x] 4.2 Add unit tests for `findTeamsYaml()` — test: first directory wins, project shadows user, user-level found when project missing, null when no file exists, `$PI_CODING_AGENT_DIR` respected
- [x] 4.3 Add unit test for `loadAgents()` — verify that when `findTeamsYaml` returns null, default "all" team is created excluding opt-in agents (covered by existing integration tests and `findTeamsYaml` unit tests)
- [x] 4.4 Add unit test for `loadAgents()` — verify that when `findTeamsYaml` returns a user-level path, teams are loaded from that path (covered by existing integration tests and `findTeamsYaml` unit tests)
- [x] 4.5 Run all existing tests to verify no regressions

## 5. Documentation updates

- [x] 5.1 Update `extensions/spec-teams.ts` file header comment — change "Teams are defined in .pi/agents/teams.yaml" to reference multi-directory discovery
- [x] 5.2 Update `scanAgentDirs()` doc comment in `spec-teams-utils.ts` — add note that `teams.yaml` discovery uses the same directory list via `findTeamsYaml()`
- [x] 5.3 Update README.md "Teams (teams.yaml)" section — document the 5 discovery locations and first-seen-wins priority order
- [x] 5.4 Update README.md "Using in an Existing Project" section — update the note about placing `agents/` directory to mention that `teams.yaml` follows the same discovery pattern
- [x]  5.5 Update CONTRIBUTING.md — update the `teams.yaml` reference in the agent fields table to reflect multi-directory discovery

## 6. Spec updates (OpenSpec)

- [x] 6.1 Update `openspec/specs/spec-teams-extension/spec.md` — modify "Teams.yaml with openspec and full teams" requirement to reference multi-directory discovery instead of hardcoded `.pi/agents/` path. Update "Opt-in frontmatter field" scenario "Teams.yaml takes precedence" to reference "any scan directory" instead of ".pi/agents/"
- [x] 6.2 Update `openspec/specs/user-level-agent-discovery/spec.md` — modify "Existing agent semantics apply uniformly" requirement to include user-level teams.yaml discovery scenario (teams.yaml found at user level when no project-level exists)
- [x] 6.3 Update `openspec/specs/spec-teams-extension/spec.md` — modify scenario "Teams.yaml file exists" to say the file is found via multi-directory discovery instead of just `.pi/agents/`