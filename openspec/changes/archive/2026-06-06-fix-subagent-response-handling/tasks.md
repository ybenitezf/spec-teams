## 1. Remove response truncation

- [x] 1.1 Comment out the 8000-character truncation in `dispatch_agent` tool's `execute()` method (lines 479-481), assign `result.output` directly to `truncated`, and add a TODO comment for future revisit
- [x] 1.2 Verify the dispatcher receives full subagent output by checking that `content[0].text` is no longer sliced

## 2. Relocate session storage outside repository

- [x] 2.1 Add `os` import to `extensions/spec-teams.ts` for `os.homedir()`
- [x] 2.2 Add a cwd encoding helper that mirrors Pi's session manager encoding: strip leading `/` or `\`, replace `/`, `\`, `:` with `-`, wrap with `--...--`
- [x] 2.3 Change `sessionDir` assignment in `loadAgents()` from `join(cwd, ".pi", "spec-sessions")` to the encoded path under `~/.pi/spec-teams/`
- [x] 2.4 Update the session file wipe code in `session_start` handler to use the new `sessionDir` instead of `join(_ctx.cwd, ".pi", "spec-sessions")`
- [x] 2.5 Verify old `.pi/spec-sessions/` directory is no longer accessed; manually clean up existing session files from the repo
