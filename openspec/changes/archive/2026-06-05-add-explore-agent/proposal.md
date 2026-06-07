## Why

The spec-teams dispatcher currently handles the explore phase itself, but it has only the `dispatch_agent` tool — no `read`, `bash`, or file access. It cannot read the `openspec-explore` skill, investigate the codebase, or run the OpenSpec CLI. This means exploration is either done by the dispatcher without proper tooling, or skipped entirely. A dedicated explore sub-agent solves this: it can read the codebase, run `openspec list --json`, follow the explore skill's stance, and conduct structured multi-turn conversations with the user (via the dispatcher relay).

## What Changes

- **New agent**: `agents/explore.md` — a headless sub-agent that follows the `openspec-explore` skill for investigating problems, reading code, and clarifying requirements with the user through multi-turn conversation
- **Findings handoff**: The explore agent writes exploration context to `.pi/spec-sessions/explore-<name>.md` so the propose agent can create deeply informed artifacts without re-investigating
- **Dispatcher prompt update**: The `before_agent_start` system prompt gains explore relay instructions — multi-turn relay protocol, recognition of explore return signals (`need-input`, `ready-to-propose`, `done-exploring`), and automatic routing from `ready-to-propose` to the propose agent
- **Propose agent update**: The propose agent's system prompt gains instructions to check for and consume exploration findings at `.pi/spec-sessions/explore-<name>.md`

## Capabilities

### New Capabilities
- `explore-agent`: The explore sub-agent — its definition, system prompt, tools, thinking flag, return protocol, and integration into the dispatcher's routing

### Modified Capabilities
- `spec-teams-extension`: The dispatcher's system prompt gains the explore relay protocol (multi-turn conversation relaying, explore signal detection, ready-to-propose → propose routing)
- `propose-agent`: The propose agent gains instructions to discover and consume exploration findings files for deeper artifact context

## Impact

- **New file**: `agents/explore.md`
- **Modified file**: `extensions/spec-teams.ts` (dispatcher prompt in `before_agent_start`)
- **Modified file**: `agents/propose.md` (minor: add findings consumption instructions)
- **New spec**: `openspec/specs/explore-agent/spec.md`
- **No breaking changes**: existing agents (apply, verify, archive) unaffected
- **No new extension code**: the dispatch mechanism, session persistence, and tool registration already support all needed behavior
