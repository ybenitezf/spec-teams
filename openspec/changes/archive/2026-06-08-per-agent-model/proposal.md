## Why

Users cannot control which model individual specialist agents use. The `model` field in agent `.md` frontmatter is already parsed and stored (in `AgentDef.model`) and even displayed in `renderCall`, but `dispatchAgent()` ignores it entirely — always using the dispatcher's model or a hardcoded fallback. This means a team of agents (explore, propose, apply, verify, archive) all run on the same model, regardless of what the user specifies in each agent's definition. The scaffolding is already in place; only the wiring is missing.

## What Changes

- **Model resolution priority flip**: `dispatchAgent()` changes from `ctx.model → fallback` to `state.def.model → ctx.model → fallback`, so agent-level `model` from `.md` frontmatter takes precedence over the dispatcher's model.
- **Model surfaced in details objects**: The resolved model string is added to `details` objects in `pushUpdate()` (streaming updates), `execute()` return (final result), and `execute()` error catch — making it available to `renderResult` and other consumers.
- **Model displayed in metrics footer**: `formatMetricsFooter()` appends the resolved model after existing metrics, using robot emoji (🤖) and a short model identifier for compact readability.
- **No breaking changes**: All existing behavior is preserved when an agent has no `model` field; in that case, resolution falls through to `ctx.model` and then the fallback as before.

## Capabilities

### New Capabilities

- `per-agent-model`: Agent `.md` frontmatter `model` field controls which model the dispatched child `pi` process uses. When set, it overrides the dispatcher's model. The resolved model (the one actually passed to `pi --model`) is propagated through `details` objects and rendered in the metrics footer.

### Modified Capabilities

- `metrics-footer`: The `formatMetricsFooter()` function gains a model display field appended after existing metrics. Requirements for footer content in both final and partial results are modified to include the resolved model.
- `spec-teams-extension`: `dispatchAgent()` model resolution logic changes from two-tier (`ctx.model → fallback`) to three-tier (`state.def.model → ctx.model → fallback`).

## Impact

- **Code**: `extensions/spec-teams.ts` — `dispatchAgent()`, `pushUpdate()`, `execute()`, `formatMetricsFooter()`
- **No API changes**: No new tools, commands, or events. No changes to `teams.yaml` format.
- **No dependency changes**
