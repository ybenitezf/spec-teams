## Why

The dispatcher's system prompt in `extensions/spec-teams.ts` embeds a hardcoded routing table that maps OpenSpec phases to specific agent names (`scout`, `change-designer`, `spec-writer`, `spec-reviewer`, `prompt-engineer`). This breaks for any team that uses different agent names. The agent catalog is already injected dynamically — the routing guidance should be too.

## What Changes

- **Remove** the hardcoded routing table from the system prompt (phase-to-agent-name mappings)
- **Remove** the hardcoded command mapping table (slash commands to specific agents)
- **Remove** the hardcoded workflow pattern instructions mentioning specific agent names
- **Replace** with phase-based routing heuristics that describe what *kind* of agent fits each phase, letting the LLM match against the already-dynamic agent catalog
- Streamline "How to Work" / "Working with Agents" instructions to be generic

## Capabilities

### New Capabilities

None — no new capability surface.

### Modified Capabilities

- `spec-teams-extension`: The system prompt injected on `before_agent_start` no longer contains hardcoded agent names in routing instructions. Routing guidance uses descriptive heuristics per phase instead of a static lookup table. The agent catalog at the bottom of the prompt remains dynamic as before.

## Impact

- `extensions/spec-teams.ts` — system prompt string modified (~60 lines removed, ~25 lines added)
- No changes to agent `.md` format, `teams.yaml`, or any other file
