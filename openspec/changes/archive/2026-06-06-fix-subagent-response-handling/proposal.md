## Why

Two infrastructure issues in the spec-teams extension break subagent communication and risk repository pollution. The `dispatch_agent` tool truncates subagent responses at 8000 characters, which cuts off the status block (e.g., `Status: need-input`) that the dispatcher relies on to route the relay protocol. Session files for subagents are stored inside the project repository at `.pi/spec-sessions/`, creating a risk of accidental commits with conversation data.

## What Changes

- Remove the 8000-character truncation on subagent responses so the dispatcher sees the full output including the status signal block
- Relocate subagent session storage from `<cwd>/.pi/spec-sessions/` to `~/.pi/spec-teams/<encoded-cwd>/`, following Pi's convention of storing session data outside the project repository

## Capabilities

### New Capabilities
<!-- None — this is a bugfix, no new capabilities introduced -->

### Modified Capabilities
- `spec-teams-extension`: Subagent response truncation removed; session storage relocated outside the project repository

## Impact

- `extensions/spec-teams.ts`: Comment out 8000-char truncation in `dispatch_agent` tool's `execute()`; change `sessionDir` from `join(cwd, ".pi", "spec-sessions")` to a path under `~/.pi/spec-teams/`
- No API changes, no breaking changes to the dispatch protocol
- No new dependencies
