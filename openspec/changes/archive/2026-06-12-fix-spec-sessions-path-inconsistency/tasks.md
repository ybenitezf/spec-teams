## 1. Update Explore Agent Prompt

- [x] 1.1 Remove the "Self-Managed Session Lifecycle" section from `agents/explore.md` entirely (session persistence is handled by the extension, not the agent)
- [x] 1.2 Remove all references to `.pi/spec-sessions/explore.json` from `agents/explore.md` (including the "Input Expectations" section's reference to the session file, and the `ready-to-propose` and `done-exploring` signal sections' cleanup steps)
- [x] 1.3 Remove the `.pi/spec-sessions/explore.json` deletion instructions from the `ready-to-propose` status signal (step 3: "Delete your session file")
- [x] 1.4 Remove the `.pi/spec-sessions/explore.json` deletion instructions from the `done-exploring` status signal
- [x] 1.5 Update "Write Tool Constraints" in `agents/explore.md` to reference the out-of-repo findings path: change the ALLOWED path from `.pi/spec-sessions/explore-<name>.md` to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`
- [x] 1.6 Update the `ready-to-propose` signal's findings file step to write to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` instead of `.pi/spec-sessions/explore-<name>.md`
- [x] 1.7 Add a note to the findings file path explaining that `<encoded-cwd>` is the `encodeCwd(cwd)` representation of the project's absolute working directory, and that agents should use `$HOME` in bash commands for reliable path expansion

## 2. Update Propose Agent Prompt

- [x] 2.1 Update the "Exploration Findings" section in `agents/propose.md` to reference `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` instead of `.pi/spec-sessions/explore-<change-name>.md`
- [x] 2.2 Update the "Check for findings file" step 2 to use `bash: ls ~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` (with `$HOME` for reliable expansion)
- [x] 2.3 Update the "If findings file exists" delete step to use `bash: rm ~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md`
- [x] 2.4 Add a note to the findings file path in the propose agent prompt explaining that `<encoded-cwd>` is the `encodeCwd(cwd)` representation of the project's absolute working directory

## 3. Update Explore Agent Spec

- [x] 3.1 Modify the "Multi-turn conversation via session persistence" requirement in `openspec/specs/explore-agent/spec.md` to reference Pi's session persistence mechanism (the `--session` and `-c` CLI flags) instead of `.pi/spec-sessions/explore.json`, and add that the agent SHALL NOT reference, manage, or delete session files directly
- [x] 3.2 Remove the "Scenario: Topic mismatch detected" scenario's instruction about deleting the session file — replace with detection through task string context only
- [x] 3.3 Remove the "Self-managed session lifecycle" requirement entirely from `openspec/specs/explore-agent/spec.md` (with reason: session management was migrated to the extension)
- [x] 3.4 Modify the "Findings file contents" requirement to reference `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` instead of `.pi/spec-sessions/explore-<name>.md`
- [x] 3.5 Add a new "Findings file stored outside repository" requirement to `openspec/specs/explore-agent/spec.md` specifying that findings SHALL be written to the out-of-repo path and SHALL NOT be written inside `.pi/spec-sessions/`
- [x] 3.6 Update the "Explore is read-only by default — write only for findings" requirement to reference the out-of-repo findings path

## 4. Update Propose Agent Spec

- [x] 4.1 Modify the "Consumes exploration findings" requirement in `openspec/specs/propose-agent/spec.md` to reference `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` instead of `.pi/spec-sessions/explore-<change-name>.md`
- [x] 4.2 Update all scenarios under "Consumes exploration findings" to use the out-of-repo path for both check and delete operations

## 5. Update Spec-Teams Extension Spec

- [x] 5.1 Modify the "Session storage outside repository" requirement in `openspec/specs/spec-teams-extension/spec.md` to explicitly cover findings files alongside session files, and add that no findings files SHALL be created inside `.pi/spec-sessions/`
- [x] 5.2 Add scenarios for: findings file stored outside repository, and findings file deleted after consumption