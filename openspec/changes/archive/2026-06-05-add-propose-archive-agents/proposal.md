## Why

The dispatcher currently describes five OpenSpec activities (explore, propose, apply, verify, archive) but only two have specialist agents (apply and verify). Users cannot formalize explored decisions into structured change proposals, nor can they archive completed changes, without the dispatcher falling back to a general-purpose agent or stalling. This leaves the workflow incomplete.

## What Changes

- **New `propose` agent** — headless agent that formalizes explored decisions into OpenSpec artifacts (proposal.md, design.md, tasks.md, delta specs). Follows `openspec-propose` skill. Receives context via structured task string from the dispatcher and expects decisions to be already clear (explore precedes propose).
- **New `archive` agent** — headless agent that finalizes completed changes by syncing delta specs and moving to archive/. Follows `openspec-archive-change` skill. Always syncs (no user-prompting in headless mode). Blocks on incomplete artifacts or unchecked tasks rather than warning-and-proceeding.
- **Updated dispatcher prompt** — adds routing guidance for propose and archive activities. Archives are gated behind user approval (dispatcher asks user after verify returns clean). Propose dispatch includes guidance on packaging explored context into the task string. **BREAKING**: none — existing apply and verify behavior is unchanged.

## Capabilities

### New Capabilities

- `propose-agent`: A headless specialist agent that creates OpenSpec change proposals from structured briefs. Follows the `openspec-propose` skill with headless adaptations (returns `need-input` instead of asking user questions). Expects decisions crystallized during explore.
- `archive-agent`: A headless specialist agent that finalizes completed changes. Follows the `openspec-archive-change` skill with headless adaptations (always syncs, blocks on warnings). Gated by dispatcher behind verify + user approval.

### Modified Capabilities

- `spec-teams-extension`: The dispatcher system prompt SHALL include routing guidance for propose and archive activities. The archive activity SHALL be dispatched only after user approval following a clean verification. The propose activity SHALL include guidance on packaging explored context into the task string.

## Impact

- **New files**: `agents/propose.md`, `agents/archive.md`
- **Modified files**: `extensions/spec-teams.ts` (dispatcher `before_agent_start` prompt)
- **Optional**: `agents/teams.yaml` entries to include new agents in team definitions (if teams.yaml exists)
- No changes to existing agent definitions, tools, or the `dispatch_agent` infrastructure
