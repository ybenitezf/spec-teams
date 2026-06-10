## Context

The dispatcher LLM in `spec-teams.ts` receives a system prompt on `before_agent_start` that includes an "Explore Relay Protocol" section. This section defines how the dispatcher should handle status signals returned by the explore sub-agent. Currently the `ready-to-propose` signal instruction says: "Extract the structured brief from the explore response. Relay the summary to the user. Dispatch the propose agent with the structured brief as the task. Do NOT ask the user for confirmation — the handoff is automatic."

The user wants the same gating pattern already used for archive (where the dispatcher must ask for user approval before dispatching archive) applied to the explore→propose transition.

All routing is handled by the dispatcher LLM interpreting the system prompt. There is no code-level routing or middleware that intercepts signals. The `detectStatusSignal()` function is used only for rendering (highlighting signal lines in the TUI), not for making routing decisions. The change is entirely a system-prompt text change.

## Goals / Non-Goals

**Goals:**
- Require user approval before the dispatcher dispatches the propose agent after `ready-to-propose`
- Let the user see the Change Brief summary and either approve, decline, or modify before the propose agent runs
- Mirror the existing archive-gating pattern for consistency across the lifecycle
- Apply the gate uniformly regardless of change size or complexity

**Non-Goals:**
- Change the explore agent's behavior, return format, or signals
- Change the propose agent's input contract
- Add programmatic interception or code-level routing enforcement
- Gate `need-input`, `done-exploring`, or `blocked` signals
- Add a second gate after propose (the archive gate already covers the apply→verify→archive path)

## Decisions

### 1. Gate is enforced by prompt wording, not code

**Decision**: Update the system prompt text only. No changes to `dispatchAgent()`, `detectStatusSignal()`, or any tool implementation.

**Alternatives considered**:
- *Code-level interception*: Add a check in the `dispatch_agent` tool result handler that blocks routing when `ready-to-propose` is detected and requires user interaction. Rejected because the dispatcher has no code-level access to tool results beyond what the LLM sees — tool results are opaque blobs. The LLM reads the raw output text, detects the signal, and decides what to do. Adding code-level gating would require a fundamentally different architecture (e.g., a state machine in the extension) which is out of scope.
- *Explore agent itself gating*: Have the explore agent ask the user for approval before returning `ready-to-propose`. Rejected because the explore agent is a headless sub-agent with no user interaction tools — it cannot ask for approval itself.

### 2. Gate is unconditional (no complexity-based heuristics)

**Decision**: Every `ready-to-propose` return triggers user approval, regardless of change size or complexity.

**Alternatives considered**:
- *Conditional gating*: Only gate when the Change Brief indicates a large or complex change. Rejected — adds complexity and requires the dispatcher LLM to judge scope, which is error-prone and inconsistent. The user explicitly requested unconditional gating.

### 3. Modified briefs are incorporated by the dispatcher

**Decision**: When the user modifies the brief (e.g., "change the scope to exclude X"), the dispatcher incorporates those modifications into the task string passed to the propose agent. The dispatcher does NOT re-dispatch explore — it edits the brief directly.

**Rationale**: The explore agent has already done its work. User modifications to the brief are edits to the output of exploration, not new exploration questions. Re-dispatching explore would be wasteful and could loop.

### 4. Declined proposals produce a clean end state

**Decision**: When the user declines to propose, the dispatcher reports that exploration ended without a proposal and returns to normal operation. No artifacts are created, no agents are dispatched.

**Rationale**: This is consistent with the `done-exploring` outcome — exploration concluded without a formal change. It also matches the archive path where the user can decline to archive.

### 5. Follow archive gating precedent for prompt phrasing

**Decision**: The new `ready-to-propose` instruction uses phrasing consistent with the existing archive gate: "ask the user for explicit approval," "SHALL NOT dispatch without user confirmation," and includes the user-declines path.

**Rationale**: Consistency makes the dispatcher LLM more likely to follow the pattern correctly, since it has already been trained (in-context) on the archive gate.

## Risks / Trade-offs

- **[Risk] LLM fails to gate**: The dispatcher LLM may ignore the new prompt instructions and dispatch propose automatically despite the gate. → **Mitigation**: The archive gate already works reliably with the same pattern. The new instructions use the same strong language ("CRITICAL", "SHALL NOT dispatch without explicit user approval"). Additionally, the spec scenarios provide testable assertions that verify gate behavior.
- **[Risk] Extra turn adds latency**: Adding a user confirmation turn means one extra round-trip (user reads brief → user approves → dispatcher dispatches propose) compared to the current automatic handoff. → **Mitigation**: The overhead is minimal — one short interaction. The user explicitly wants this control point. The explore agent has already done the heavy lifting; the propose agent does not start until the user confirms, so no wasted work.
- **[Trade-off] Simpler prompt, less automation**: The current auto-handoff is faster and more "agentic". Adding a gate makes the workflow more interactive. → **Acceptance**: The user requested this. The archive gating pattern is already accepted, and bringing explore→propose into parity makes the lifecycle consistent.

## Open Questions

None. All design decisions are settled.
