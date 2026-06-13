## Why

After the session storage migration (change `fix-subagent-response-handling`), sessions were moved from `.pi/spec-sessions/` inside the project repo to `~/.pi/spec-teams/<encoded-cwd>/` outside it. Two path inconsistencies remain:

1. **Ghost session reference** — `agents/explore.md` still instructs the explore agent to manage and delete a session file at `.pi/spec-sessions/explore.json`, but sessions now live at `~/.pi/spec-teams/<encoded-cwd>/explore.json`. The agent tries to `rm` a file that doesn't exist, which is misleading even though harmless.

2. **Findings file in-repo** — The explore→propose handoff writes findings to `.pi/spec-sessions/explore-<name>.md` inside the project repo, directly contradicting the `spec-teams-extension` spec requirement that "no session files are created inside `.pi/spec-sessions/`". These findings files are runtime artifacts that should live alongside the sessions they accompany.

Fixing these now prevents confusion for agents that follow stale instructions, eliminates a spec contradiction, and brings all runtime artifacts under the out-of-repo storage policy.

## What Changes

- Remove all references to `.pi/spec-sessions/explore.json` from the explore agent prompt (`agents/explore.md`). Session continuity is handled by the extension's `--session` flag; the explore agent doesn't need to know about session file management.
- Remove the **Self-Managed Session Lifecycle** section from `agents/explore.md` entirely — the explore agent no longer manages session files directly.
- Remove the session-file cleanup steps from the `ready-to-propose` and `done-exploring` signal sections in `agents/explore.md`.
- Change the findings file location from `.pi/spec-sessions/explore-<name>.md` (in-repo) to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` (out-of-repo, consistent with session storage).
- Update `agents/propose.md` to look for and delete findings at the new out-of-repo path.
- Update the explore-agent spec to remove session-persistence and session-lifecycle requirements, and update the findings-file requirement to reference the new path.
- Update the propose-agent spec to reference the new findings path.
- Update the `spec-teams-extension` spec's "Session storage outside repository" requirement to cover findings files as well as session files, resolving the contradiction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-agent`: Remove session-persistence and self-managed-session-lifecycle requirements; update findings-file requirement to write out-of-repo at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`.
- `propose-agent`: Update findings-file consumption requirement to read from and delete at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`.
- `spec-teams-extension`: Update "Session storage outside repository" requirement to explicitly cover findings files alongside session files, resolving the spec contradiction.

## Impact

- **Agent prompts**: `agents/explore.md` (significant edit — remove session lifecycle section, update findings path), `agents/propose.md` (moderate edit — update findings path).
- **Specs**: `explore-agent/spec.md`, `propose-agent/spec.md`, `spec-teams-extension/spec.md` — requirement changes.
- **No breaking API or dependency changes** — this is an internal path consistency fix affecting agent prompts and spec text only.
- The `encodeCwd()` utility and session directory resolution in `spec-teams.ts` are unaffected since the findings path uses the same `~/.pi/spec-teams/<encoded-cwd>/` base directory already established for sessions.