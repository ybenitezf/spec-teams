## Context

The spec-teams extension dispatches work to specialist agents via the `dispatch_agent` tool. Currently, all five agents are OpenSpec-specialized (explore, propose, apply, verify, archive). The dispatcher system prompt embeds OpenSpec lifecycle knowledge for routing. When a user issues a non-OpenSpec request (git commit, file operations, quick scripts), there is no appropriate agent — the dispatcher falls back to explore, which is constrained and ill-suited.

The existing architecture:
- Agent definitions are Markdown files with YAML frontmatter parsed by `parseAgentFile()`
- Teams are defined in `.pi/agents/teams.yaml` or default to an "all" team containing every parsed agent
- Status signal detection uses regex `/^Status:\s+(need-input|ready-to-propose|blocked|done-exploring)$/m`
- The system prompt is generated in the `before_agent_start` hook with lifecycle descriptions and agent catalog

## Goals / Non-Goals

**Goals:**
- Create a general-purpose `worker` agent that executes tasks directly without OpenSpec constraints
- Ensure the worker is opt-in only — excluded from the default team
- Extend dispatcher routing to handle non-OpenSpec tasks clearly
- Allow the dispatcher to suggest OpenSpec workflow when a worker task reveals complexity
- Keep changes minimal and non-breaking for existing OpenSpec agents

**Non-Goals:**
- Multi-turn relay protocol for worker (worker uses simple done/blocked)
- OpenSpec awareness in worker (zero references in its system prompt)
- Changes to explore/propose/apply/verify/archive agent definitions
- Dashboard widget changes or new status signal types
- Multi-agent orchestration for non-OpenSpec workflows

## Decisions

### Decision 1: Worker agent design — power-tool stance

**Chosen**: Single general-purpose agent with full tool access, no OpenSpec awareness, execution stance (`thinking: off`), simple `done`/`blocked` status signals.

**Alternatives considered**:
- **Multiple specialist general agents** (git-agent, web-agent, file-agent): Excessive granularity. Increases dispatcher routing complexity and agent maintenance burden. Rejected.
- **Worker with multi-turn relay like explore**: Over-engineered. The point is fast execution, not interactive exploration. If a task needs multi-turn, it likely warrants OpenSpec.
- **Adding OpenSpec capabilities to worker**: Breaks separation of concerns. Worker should be clean. OpenSpec workflow intelligence belongs in the dispatcher and OpenSpec-specialized agents.

**Rationale**: The simplest design that covers the use case. An agent that receives a directive, executes it, and reports done/blocked.

### Decision 2: Opt-in team membership via `opt-in` frontmatter field

**Chosen**: New `opt-in: true` frontmatter field on agent definitions. When no `teams.yaml` exists, the default "all" team excludes agents tagged `opt-in: true`.

**Alternatives considered**:
- **Always require teams.yaml for opt-in control**: Would be a breaking change — users without teams.yaml lose their workflow. Rejected.
- **Separate opt-out field for default team exclusion**: Semantically clear but introduces two mechanisms (opt-in vs opt-out). Single `opt-in` field is simpler.
- **No frontmatter field, just document team configuration**: Doesn't protect users who haven't set up teams.yaml from accidentally having worker in their default team.

**Rationale**: The `opt-in` field encodes the agent author's intent (this agent requires explicit team inclusion). When teams.yaml exists, it already provides the opt-in mechanism — the field mainly protects the "no teams.yaml" case.

### Decision 3: Default team from "all" to "openspec"

**Chosen**: Ship a `teams.yaml` with two teams: `openspec` (5 agents, first/default) and `full` (all 6 including worker). When teams.yaml exists, the first team becomes default. Users who already have a teams.yaml are unaffected.

**Alternatives considered**:
- **No teams.yaml, rely solely on opt-in field**: Simpler but the user gets no structured team selection. Having teams.yaml makes the worker opt-in explicit and provides a `full` team for those who want it.
- **Only one team in teams.yaml**: Forces users who want the worker to edit the file. Two teams provides a smooth path.

**Rationale**: Teams.yaml gives users a clear UX for team selection. The openspec team as default preserves existing behavior. The full team provides a one-command path to add the worker.

### Decision 4: Dispatcher-side hand-off intelligence

**Chosen**: The dispatcher (not the worker) recognizes when a worker task reveals complexity and suggests an OpenSpec workflow. The dispatcher SHALL NOT auto-dispatch an OpenSpec agent without user confirmation.

**Alternatives considered**:
- **Worker signals for hand-off**: The worker would need OpenSpec awareness to know when a task warrants exploration. Violates the "zero OpenSpec knowledge" constraint. Rejected.
- **Auto-dispatch explore on worker blocked**: Too aggressive. Worker blocked could mean a transient technical issue, not a scope problem. User needs to decide.

**Rationale**: The dispatcher is the routing intelligence. It already reads all agent output. It can recognize patterns suggesting OpenSpec (complexity uncovered, architectural concerns, multi-component changes) without the worker's awareness. Soft suggestion is safer than automated hand-off.

### Decision 5: Status signal extension — repurpose `done` for worker

**Chosen**: Extend the `detectStatusSignal()` regex to also match `done` (for worker agent). `blocked` is already in the regex (used by explore, also used by worker).

**Alternatives considered**:
- **New signal type `task-complete`**: Avoids confusion with existing `done` usage. But `done` is the simplest, most intuitive word for "task finished." The regex already handles multiple signals; adding one more is trivial.
- **No signal from worker, just return text**: The dispatcher needs a reliable way to detect task completion vs. blocking. Parsing free text is error-prone.

**Rationale**: `done` is the natural counterpart to `blocked`. Both are already used by apply agent. The regex extension is a one-line change.

### Decision 6: Worker model — default to dispatcher model

**Chosen**: No explicit `model` field in worker frontmatter. Falls through to `ctx.model` and then the hardcoded fallback. This is the standard behavior for agents without `model` — no code change needed.

**Rationale**: Users may want different models for different tasks. Following the dispatcher's model is the least surprising default. Users can override by adding `model:` to the frontmatter.

## Risks / Trade-offs

- **[Dispatcher mis-routing]** The dispatcher could route OpenSpec tasks to worker or non-OpenSpec tasks to explore. → Mitigation: Clear heuristics in the system prompt distinguishing intent. Description-based matching signals the dispatcher.
- **[Worker blocked ambiguity]** `blocked` from worker could mean "technical blocker" or "this needs exploration." → Mitigation: Dispatcher presents the blocker to the user and asks how to proceed (rather than auto-dispatching explore).
- **[Teams.yaml editing]** Users who want the worker in their default team must edit teams.yaml. → Mitigation: /specs-team command makes switching quick. Documentation in startup notification can mention available teams.
- **[Opt-in field in existing agents]** If someone adds `opt-in: true` to an existing OpenSpec agent, it gets excluded from their default team. → Mitigation: This is intentional behavior — opt-in is an author choice. No existing agents are being modified.

## Open Questions

- None — all design decisions are settled per the exploration findings.
