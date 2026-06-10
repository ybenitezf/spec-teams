## 1. Import SDK function

- [x] 1.1 Add `getAgentDir` to the import from `@earendil-works/pi-coding-agent` at the top of `extensions/spec-teams.ts`

## 2. Extend scanAgentDirs

- [x] 2.1 Add user-level paths to the `dirs` array after project-level paths: `<getAgentDir()>/agents/` and `<homedir()>/.agents/agents/`
- [x] 2.2 Verify that `homedir` is imported from `os` (already present) and `getAgentDir` is available
- [x] 2.3 Ensure the deduplication loop correctly handles the expanded `dirs` array (project-first ordering means project agents win collisions — existing logic handles this)

## 3. Update documentation

- [x] 3.1 Update the file header comment (lines 1–22 of `extensions/spec-teams.ts`) to mention user-level agent directories
- [x] 3.2 Add or update the doc comment above `scanAgentDirs()` to document all scanned paths and precedence order
- [x] 3.3 Update any inline comments that reference "project-level" only to reflect both levels

## 4. Verify correctness

- [x] 4.1 Test: Create a test agent at `~/.pi/agent/agents/test-user-agent.md` and verify it appears in `/specs-list` output
- [x] 4.2 Test: Create a project-level agent with the same name as a user-level agent and verify the project version is used
- [x] 4.3 Test: Set `PI_CODING_AGENT_DIR` to a temp directory and verify agents are loaded from there
- [x] 4.4 Test: Verify that opt-in flag, model, thinking, and other frontmatter fields work correctly for user-level agents
- [x] 4.5 Test: Verify that `~/.agents/agents/` path works for agent discovery
- [x] 4.6 Test: Verify no errors when user-level directories don't exist (graceful skip)
