## 1. Extension code — encoded-cwd injection

- [x] 1.1 Store `currentEncodedCwd` as a module-level variable in `spec-teams.ts`, set in `loadAgents()` alongside `sessionDir`
- [x] 1.2 Add a private helper `injectEncodedCwd(agentName: string, task: string): string` that prepends `encoded-cwd: <value>\n\n` to the task string when `agentName` is `"explore"` or `"propose"`, otherwise returns the task unchanged
- [x] 1.3 Call `injectEncodedCwd` inside `dispatchAgent()` before spawning the sub-process, applying the prefix to the `task` argument

## 2. Agent prompt updates

- [x] 2.1 Update `agents/explore.md`: replace opaque `<encoded-cwd>` references with instructions to extract the value from the task string prefix (`encoded-cwd: <value>`), and document the encoding algorithm as a fallback (3 steps: strip leading `/`, replace `/` `\` `:` with `-`, wrap in `--...--`)
- [x] 2.2 Update `agents/propose.md`: same change — extract `<encoded-cwd>` from task string prefix, with the encoding algorithm as a fallback

## 3. Session-start stale findings cleanup

- [x] 3.1 Extend the `session_start` handler to remove stale `explore-*.md` files from `sessionDir` (in addition to existing `.json` cleanup)
- [x] 3.2 Use a glob pattern (`explore-*.md`) to avoid deleting non-findings `.md` files that might exist in `sessionDir`

## 4. Tests and verification

- [x] 4.1 Add a unit test for `injectEncodedCwd` verifying it prepends the prefix for explore/propose agents and passes through for other agents (worker, apply, archive)
- [x] 4.2 Add a unit test verifying the prefix format (`encoded-cwd: <value>\n\n<task>`) is correct
- [x] 4.3 Update existing `encodeCwd` unit tests if needed to ensure no regression
- [x] 4.4 Manual verification: dispatch explore agent with the updated extension, confirm it writes findings to the correct `~/.pi/spec-teams/<encoded-cwd>/` directory
- [x] 4.5 Manual verification: dispatch propose agent after explore, confirm it reads and deletes the findings file from the correct directory
