## Context

The spec-teams extension currently replaces Pi's built-in footer with a custom footer via `_ctx.ui.setFooter()`. This footer shows:
```
🔧 0 calls  ↑9.8k  ↓4.5k  $0.0338  ctx 1%  🤖 deepseek-v4-pro · all
```

The extension already has `formatMetricsFooter(details)` (line 131) which produces a rich metrics line used in `renderResult` for dispatch outputs:
```
🔧 5 calls  ↑4.2k  ↓1.1k  $0.0231  ctx 12%  🤖 claude-sonnet-4
```

The `formatMetricsFooter` function accepts a `details` object with: `toolCount`, `inputTokens`, `outputTokens`, `cost`, `contextPct`, `model`. All data needed to construct this object for the aggregate case is accessible within the `setFooter` closure.

### Data Sources

| Metric | Source | Access Pattern |
|---|---|---|
| Dispatcher session tokens/cost | `_ctx.sessionManager.getBranch()` | Iterate entries, filter `type === "message"` & `role === "assistant"`, sum `usage.input`, `usage.output`, `usage.cost.total` |
| Subagent tokens/cost | `agentStates` Map (closure) | Sum `.inputTokens`, `.outputTokens`, `.cost` across all agents |
| Dispatcher tool calls | `_ctx.sessionManager.getBranch()` | Count `dispatch_agent` tool calls (entries `type === "tool"`) |
| Subagent tool calls | `agentStates` Map | Sum `.toolCount` across all agents |
| Context % | `_ctx.getContextUsage()` | `.percent` field — main session only |
| Model | `_ctx.model?.id` | Already used in current footer |

### Constraints

- Footer render is called on every TUI frame — must be fast
- `setFooter` is last-writer-wins — other extensions cannot compose
- Footer height is limited; the 2-line format (team line + metrics line) is acceptable

## Goals / Non-Goals

**Goals:**
- Render a single footer line combining aggregate metrics (`formatMetricsFooter` format) with team name
- Compute combined dispatcher + subagent totals for tokens, cost, and tool calls
- Show main-session context percentage only (not subagent context)
- Drop the previous separate model/team/context-bar line entirely

**Non-Goals:**
- Modifying `formatMetricsFooter()` itself or its existing usages in `renderResult`
- Restoring Pi's built-in footer (the replacement is intentional)
- Showing per-agent breakdown in the footer (that belongs in the dashboard widget)
- Adding new commands or configuration options
- Restoring the separate model/team/context-bar line

## Decisions

### Decision 1: Single-line footer layout

The footer will produce 1 line:
1. **Single line**: `formatMetricsFooter(details) · teamName` — aggregate metrics suffixed with team name

**Rationale**: The context bar and model info are redundant when the metrics line already shows `ctx N%` and `🤖 model`. Combining metrics + team name on one line saves vertical space while preserving all useful information. The team name suffix grounds which team's metrics are being shown.

### Decision 2: Combined (dispatcher + subagents) totals for tokens/cost/tool calls

Sum the dispatcher's own session usage AND all subagent usage from `agentStates`.

**Rationale**: Users want to know the true total cost/usage picture. Showing only the dispatcher's own usage hides subagent consumption (which is the primary purpose of spec-teams). Showing only subagent totals ignores the dispatcher's own LLM calls (e.g., routing decisions).

**Alternative considered**: Dispatcher-only totals — rejected because it would miss the bulk of spec-teams usage (all subagent work).

### Decision 3: Main-session context percentage only

Use `_ctx.getContextUsage().percent` for the context percentage in the metrics footer.

**Rationale**: Subagent context usage is already visible per-agent in the dashboard widget grid cells. Duplicating it in the footer adds noise without additional value. The main session's context percentage is the critical resource constraint — when it fills up, compaction is triggered.

**Alternative considered**: Average or max subagent context — rejected because it conflicts with how the dashboard widget already surfaces this information.

### Decision 4: Use existing `formatMetricsFooter` without modification

Pass a crafted `details` object to `formatMetricsFooter()`. No changes to the function itself.

**Rationale**: DRY — the function already handles token formatting, model display, truncation, and null/zero cases. Creating a separate path would duplicate logic and risk divergence. The function accepts a simple object shape that is straightforward to construct.

### Decision 5: Compute session totals inline in render function

Iterate `_ctx.sessionManager.getBranch()` on every render call to compute dispatcher session totals.

**Rationale**: The render function is called frequently, but Pi's built-in footer already performs the same iteration. The branch is typically <200 entries and iteration is O(n) with cheap property access. More complex alternatives (maintaining a running total via events) add state management complexity without measurable benefit.

**Alternative considered**: Subscribe to events and maintain running totals — more complex, requires event filtering for dispatch_agent vs user-initiated calls. The simplicity of inline computation is preferred.

## Risks / Trade-offs

- **[Risk] Performance impact from iterating `getBranch()` on every frame**: Mitigation — same pattern used by Pi's built-in footer. Branch sizes are typically small (tens to low hundreds of entries). If performance becomes an issue, caching with invalidation can be added later.
- **[Risk] Token totals include tokens from non-spec-teams tool calls**: The dispatcher's session may include tool calls from other extensions. Mitigation — this is the user's true total session cost, which is what they want to see. The subagent portion is separately identifiable via `agentStates`.
- **[Trade-off] Dispatch tool-call count excludes non-spec-teams tool calls from dispatcher total**: Tool call counting from the dispatcher session only counts `dispatch_agent` calls (our own tool). Other tools in the session are not counted separately. This is intentional — the tool count should reflect spec-teams activity specifically, not all extension tools.
