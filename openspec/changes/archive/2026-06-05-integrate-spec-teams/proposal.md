## Why

The repository currently has a placeholder skeleton (`extensions/index.ts`) that only logs a startup message. The real extension — a dispatcher-orchestrator for spec-driven team workflows — exists as a standalone file in another project. Integrating it establishes the actual extension this package is meant to deliver.

## What Changes

- **Remove** `extensions/index.ts` (the scaffold skeleton)
- **Add** `extensions/spec-teams.ts` (the dispatcher-orchestrator extension)

## Capabilities

### New Capabilities

- `spec-teams-extension`: The full dispatcher-orchestrator extension providing:
  - `dispatch_agent` tool — spawn specialist agents as child `pi` processes with session persistence
  - Team configuration — load agent definitions from `agents/*.md` files and team membership from `.pi/agents/teams.yaml`
  - Compact single-line dashboard widget showing agent status and context usage
  - Commands: `/specs-team` (switch active team), `/specs-list` (list loaded agents), `/specs-grid` (deprecated)
  - OpenSpec lifecycle-aware system prompt override — routes user requests to appropriate specialist agents based on workflow phase (explore → propose → apply → archive)
  - Footer widget showing model, active team, and context bar

### Modified Capabilities

None — no existing specs to modify.

## Impact

- `extensions/index.ts` — removed
- `extensions/spec-teams.ts` — added (~700 lines)
- No changes to `package.json`, `tsconfig.json`, or OpenSpec config
