## Why

The apply agent implements changes and returns `done`, but there is no independent check that the implementation actually matches the spec. Tasks can be checked off without corresponding code. Requirements can be missed. Design decisions can drift from code. Without verification, the dispatcher has no way to know whether an implementation is truly ready for archiving — it must trust the apply agent's self-report. A verify agent closes this gap by auditing completions before the archive phase is ever offered.

## What Changes

- Create `agents/verify.md` — a new headless agent definition that inspects implementations against OpenSpec changes (read-only, no mutation)
- Modify the dispatcher system prompt in `extensions/spec-teams.ts` to expand from 4 to 5 activities (adding `verify`), adjust archive description to remove audit/validation (now handled by verify), and add situational guidance for verify → apply feedback loops
- Verify agent inspects at Level 3 depth: task completeness, requirement coverage, scenario tracing, design coherence, and test execution
- Verify agent returns structured issues list (text, not files) that the dispatcher can relay back to apply for targeted fixes

## Capabilities

### New Capabilities

- `verify-agent`: A headless sub-agent that audits OpenSpec change implementations — compares spec requirements to code, traces scenarios to implementation paths, checks design coherence, runs tests. Read-only inspection. Returns `verdict: clean | issues-found | blocked` with a structured issues list.

### Modified Capabilities

- `spec-teams-extension`: The dispatcher system prompt gains a 5th activity (`verify`), the archive activity description shifts to focus on mechanical sync/merge (audit/validation now belong to verify), and new situational guidance covers verify→apply feedback loops and verify→archive gating.

## Impact

- New file: `agents/verify.md` (agent definition, ~50 lines)
- Modified file: `extensions/spec-teams.ts` (system prompt tweaks, ~10 lines changed)
- No new dependencies, no new tools, no extension API changes
- Coexists with apply agent; both are loaded by existing `scanAgentDirs()` logic
