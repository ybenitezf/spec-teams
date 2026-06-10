## Why

When the explore agent crystallizes its findings and returns `ready-to-propose`, the dispatcher currently routes to the propose agent automatically — without user confirmation. This means the user has no opportunity to review the Change Brief, adjust scope, or decline before proposal artifacts are created. The archive workflow already gates on user approval; this change brings the explore→propose handoff into parity with that pattern, giving the user control at every lifecycle transition that commits to formal artifacts.

## What Changes

- The dispatcher system prompt's "Explore Relay Protocol" section is updated so that `ready-to-propose` no longer triggers automatic dispatch to the propose agent. Instead, the dispatcher extracts the Change Brief, relays a summary to the user, and waits for explicit approval before dispatching propose.
- If the user declines, the dispatcher reports that exploration ended without a proposal (no change artifacts created).
- If the user modifies the brief (e.g., changes scope or approach), the dispatcher incorporates those modifications into the task string passed to propose.
- The multi-turn flow example in the system prompt is updated to show the new approval step.
- The formal spec for `spec-teams-extension` is updated: the "Explore to propose handoff is automatic" scenario is replaced with a scenario asserting the user-approval gate, and a new scenario covers the user-declines path.

## Capabilities

### New Capabilities

None. This is a behavioral change to existing relay protocol, not a new capability.

### Modified Capabilities

- `spec-teams-extension`: The "Explore relay protocol in system prompt" requirement is modified — the `ready-to-propose` per-signal instruction changes from automatic dispatch to user-gated approval. The "Explore multi-turn routing scenarios" requirement is modified — the automatic-handoff scenario is replaced with a user-approval-gate scenario, and a new user-declines scenario is added.

## Impact

- **System prompt** (`extensions/spec-teams.ts`, `before_agent_start` handler): strings in the "Explore Relay Protocol" section and the multi-turn flow example are updated.
- **Spec** (`openspec/specs/spec-teams-extension/spec.md`): two requirements are modified.
- **No code-level routing changes**: `detectStatusSignal()`, `dispatchAgent()`, and all tool implementations remain unchanged. The gate is enforced entirely through prompt instructions.
- **Explore agent** (`agents/explore.md`) and **explore agent spec** (`openspec/specs/explore-agent/spec.md`) are unaffected.
- **Propose agent** (`agents/propose.md`) and **propose agent spec** are unaffected.
