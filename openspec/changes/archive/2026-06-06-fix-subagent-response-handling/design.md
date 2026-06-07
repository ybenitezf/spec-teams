## Context

The spec-teams extension spawns subagent Pi processes via `dispatchAgent()` and communicates with them through a relay protocol. The dispatcher agent reads subagent output (returned as tool result content) and parses it for status signals (`Status: need-input`, `Status: ready-to-propose`, etc.) that control the workflow.

Two problems exist:

1. **Truncation breaks the signal protocol.** The `dispatch_agent` tool's `execute()` method truncates subagent output at 8000 characters before passing it to the dispatcher model. Explore agent responses routinely exceed this limit (ASCII diagrams, investigation results, code snippets). The status block is at the end of the response by convention, so truncation from the front cuts it off. The dispatcher cannot detect the signal and the relay protocol stalls.

2. **Session files pollute the repository.** Subagent sessions are stored at `<cwd>/.pi/spec-sessions/` — inside the project directory. These JSONL files accumulate full conversation history (170KB+ for a single exploration). Without a `.gitignore`, a `git add .` commits them. Pi's own session manager already uses `~/.pi/agent/sessions/<encoded-cwd>/` — outside the repo by default.

## Goals / Non-Goals

**Goals:**
- Dispatcher receives complete subagent output so status signals are always visible
- Subagent session files are stored outside the project repository, following Pi's convention
- Both fixes are non-breaking — existing agent definitions and the relay protocol are unaffected

**Non-Goals:**
- Designing a permanent truncation strategy (this is a stop-gap: comment out the limit for testing, revisit later)
- Auto-creating or modifying `.gitignore`
- Migrating existing session files from `.pi/spec-sessions/` (one-time manual cleanup is acceptable)
- Changing how the dispatcher parses status signals

## Decisions

### Decision 1: Comment out truncation, don't remove it

The `slice(0, 8000)` truncation in `execute()` is commented out rather than deleted. A comment marks it for future revisit.

**Rationale:** The user wants to test without truncation first. The old limit is preserved as a reference for when a smarter truncation strategy (preserving the tail, or signal-aware truncation) is designed. Removing the code entirely loses that reference.

**Alternatives considered:**
- *Delete entirely*: Cleaner code, but loses the intent marker that truncation was considered and needs revisiting.
- *Raise to 64K*: Just kicks the can — still vulnerable to long responses, still risks cutting off the status block.

### Decision 2: Store sessions at `~/.pi/spec-teams/<encoded-cwd>/`

Subagent session files move from `<cwd>/.pi/spec-sessions/` to `~/.pi/spec-teams/<encoded-cwd>/`.

**Rationale:** Follows Pi's convention of using `~/.pi/` for session data. Uses a `spec-teams` subfolder for clear namespacing. The `<encoded-cwd>` component isolates sessions from different projects (same approach Pi uses for its own sessions). No XDG dependency — pure filesystem path construction.

**Alternatives considered:**
- *XDG_STATE_HOME (~/.local/state/)*: More standards-compliant, but not co-located with Pi data. Rejected for consistency with Pi's ecosystem.
- *Pi's own session dir (~/.pi/agent/sessions/)*: Would mix extension sessions with Pi's native sessions. Namespace collision risk. Rejected.
- *Keep in repo + .gitignore*: Leaves sessions inspectable but requires every project to maintain the gitignore. Brittle. Rejected.

### Decision 3: Encode cwd the same way Pi does

The `<encoded-cwd>` portion uses the same encoding scheme as Pi's `SessionManager.getDefaultSessionDir()` — replacing path separators and special characters with safe substitutes to produce a valid directory name.

**Rationale:** Consistency with Pi's session storage. If Pi changes its encoding scheme, this should follow. Implementation: use `encodeURIComponent` or equivalent on the absolute cwd path.

## Risks / Trade-offs

- **[Risk] No truncation means large subagent responses consume dispatcher context window.**
  → Mitigation: This is an acceptable tradeoff. A functional relay protocol with correct signal detection is more important than token efficiency. A smarter truncation strategy can be designed later.

- **[Risk] Existing sessions in `.pi/spec-sessions/` become orphaned after the move.**
  → Mitigation: Low impact — sessions are ephemeral by design and are wiped on each `session_start`. Users can manually delete the old directory if desired. No migration code needed.

- **[Risk] Encoding collisions between different cwd paths.**
  → Mitigation: Same risk Pi takes with its own session storage. In practice, projects are in distinct directories with distinct encoded names.

## Open Questions

- What should the permanent truncation strategy be? (Tail-preserving? Signal-aware? Configurable limit?) Deferred to future change.
- Should the extension clean up old `<cwd>/.pi/spec-sessions/` directories automatically? (Not for this change.)
