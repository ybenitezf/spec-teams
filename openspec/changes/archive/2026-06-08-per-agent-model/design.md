## Context

The spec-teams extension loads agent definitions from Markdown frontmatter. Each agent can declare a `model` field (e.g., `model: openrouter/anthropic/claude-sonnet-4`). This field is already parsed by `parseAgentFile()` and stored in `AgentDef.model`, and `renderCall()` already displays it — but it has no effect on dispatch. The `dispatchAgent()` function always resolves the model to `ctx.model` (the dispatcher's model) or a hardcoded fallback (`openrouter/google/gemini-3-flash-preview`).

The extension uses `dispatchAgent()` to spawn child `pi` processes via `spawn("pi", [...args])`. The model is passed as `--model <provider/id>` in the argument list. The extension also builds a `details` object passed to `pushUpdate()` (streaming), `execute()` return (final), and error handlers — this `details` flows into `renderResult()` and `formatMetricsFooter()`.

## Goals / Non-Goals

**Goals:**
- Wire the already-parsed `model` field from `AgentDef` into the dispatch chain
- Flip resolution priority so agent model overrides dispatcher model
- Surface the resolved model in `details` objects for downstream consumers
- Display the resolved model in the metrics footer

**Non-Goals:**
- Team-level model configuration in `teams.yaml`
- Model validation or model-name normalization
- Header line changes (model only in metrics footer)
- Changes to `renderCall` (already shows model from agent def, fine as-is)

## Decisions

### Decision 1: Resolution priority: agent → dispatcher → fallback

**Chosen**: `state.def.model (agent override) → ctx.model (dispatcher) → hardcoded fallback`

**Rationale**: Agent definitions express explicit per-agent intent — if a user puts `model: openrouter/anthropic/claude-sonnet-4` in an agent's frontmatter, they clearly want that agent to use that model. The dispatcher's model is a session-level default, not a mandate for all subagents. This is the intuitive layering: most-specific overrides least-specific.

**Alternatives considered**:
- *Dispatcher model takes precedence*: This would make `model` in agent frontmatter a mere fallback, which is less useful. Users set per-agent model to get specific behavior from that agent.
- *Disallow agent model when dispatcher model is set*: Unnecessary restriction; the layering is clean.

**Resolution code** (replaces the current two-line model assignment):
```typescript
const model = state.def.model
  || (ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "")
  || "openrouter/google/gemini-3-flash-preview";
```

### Decision 2: Store resolved model in details, not agent definition model

**Chosen**: Save the actually-resolved model string (what was passed to `pi --model`) in `details.model`

**Rationale**: Consumers (`renderResult`, `formatMetricsFooter`) care about what model was *actually used*, not what the agent *claims* in its definition. In the common case where no agent override exists, the details should reflect the dispatcher's model or fallback, not an empty/undefined value.

### Decision 3: Compact model display in metrics footer

**Chosen**: Append `🤖 short-model-name` to the metrics footer line, where `short-model-name` is extracted from the resolved model string.

**Rationale**: Full model strings like `openrouter/anthropic/claude-sonnet-4` are long. The metrics footer already contains 4 elements (🔧 calls, ↑tokens, ↓tokens, $cost, ctx%). Adding the full string would overflow most terminals. A compact form keeps readability.

**Short form extraction**: Since models follow `provider/id` format, extract the last segment after `/` and optionally shorten well-known names. For now, simply use the last path segment: `claude-sonnet-4`, `gemini-3-flash-preview`, etc.

**Format**: `🔧 18 calls  ↑34k  ↓7.1k  $0.0867  ctx 0%  🤖 claude-sonnet-4`

### Decision 4: Add model to details in all three result paths

**Chosen**: Add `model: <resolved>` to `pushUpdate()` details, `execute()` success return details, and `execute()` error catch details.

**Rationale**: Any of these paths may be consumed by `renderResult`. Missing model in any path creates inconsistency. The error path should still report what model was attempted.

## Risks / Trade-offs

- **[Risk] Long model names cause footer overflow**: If a model name like `openrouter/meta-llama/llama-4-maverick` is used, the short form (`llama-4-maverick`) still adds ~20 chars to an already-long metrics line. → **Mitigation**: Accept that very narrow terminals already truncate the footer; model info is supplementary, not critical.

- **[Risk] Agent model is incompatible with agent tasks**: A user might assign a weak/cheap model to an agent that needs strong reasoning (e.g., `model: openrouter/google/gemini-3-flash-preview` on the `propose` agent). → **Mitigation**: Out of scope — model selection is the user's responsibility.

- **[Trade-off] No model validation**: Invalid model strings (typos, unsupported models) will cause child `pi` processes to fail. → **Mitigation**: Accept for now; model validation could be a future feature.

## Migration Plan

No migration needed. Existing agent definitions without a `model` field continue to work exactly as before (falls through to dispatcher model or hardcoded fallback). Users can add `model: <provider/id>` to any agent `.md` file to opt into per-agent model selection.

## Open Questions

None.
