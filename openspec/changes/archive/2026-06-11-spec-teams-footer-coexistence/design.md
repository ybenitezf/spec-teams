## Context

The spec-teams extension currently monopolizes the terminal footer via `setFooter()`. The function signature `_ctx.ui.setFooter(callback)` returns a component that completely replaces the default pi-agent footer. The default footer has three lines:

1. PWD + git branch info
2. Session name, token count, model
3. Extension statuses (from `setStatus` calls by all extensions)

When spec-teams calls `setFooter`, it wipes all three lines and renders only its single-line metrics footer. Other extensions that call `setStatus` (e.g., thinking-level indicators, git status) are invisible. This is an anti-pattern for extension coexistence.

The `setStatus(key, text)` API publishes a short string onto line 3 of the default footer. Multiple extensions can call `setStatus` with different keys, and the default footer renders them all, space-separated. This is the intended coexistence mechanism.

The extension already calls `setStatus("spec-team", ...)` at startup (line 1332) and on team switch (line 997), but these only show `"Team: <name> (N)"` — they don't include metrics. The strategic change is: remove `setFooter`, enhance the `setStatus` call to carry the full metrics line, and ensure it refreshes when data changes.

## Goals / Non-Goals

**Goals:**
- Remove the `setFooter` takeover; restore the default 3-line footer
- Publish spec-teams aggregate metrics on the default footer's status line via `setStatus`
- Preserve the `· <activeTeamName>` suffix in the status line
- Add a visually delightful styled prefix (ANSI colors, emoji, bold) to the status line
- Ensure metrics refresh at meaningful update points (agent end, dispatch complete, team switch)
- Keep the `"spec-team"` key for alphabetical grouping among extension statuses

**Non-Goals:**
- Changing the aggregate computation logic (`formatMetricsFooter`, dispatcher totals, subagent totals)
- Adding new metrics or changing `formatMetricsFooter` output format
- Modifying the default footer itself (that's pi-core territory)
- Auto-refresh with a timer interval (liveness achieved through event hooks instead)
- Battery/performance concerns — the refresh logic is lightweight (string building from in-memory state)

## Decisions

### Decision 1: Remove `setFooter`, use only `setStatus`

**Chosen:** Remove the entire `_ctx.ui.setFooter(...)` call (~55 lines) and enhance the existing `setStatus("spec-team", ...)` call to carry full metrics.

**Alternatives considered:**
- **Approach B (partial footer):** Keep `setFooter` but expand it to render other extensions' statuses and default info. Rejected because it requires reimplementing pi-core's footer logic and breaks whenever the default footer changes.
- **Approach C (line injection):** Use a hypothetical API to inject a line into the default footer. Rejected because no such API exists.

**Rationale:** `setStatus` is the designed coexistence API. It's simple, lightweight, and lets the default footer handle rendering, truncation, and multi-extension display. The only trade-off is loss of auto-refresh (setFooter components can re-render on invalidation; setStatus is static), which we mitigate with explicit refresh calls.

### Decision 2: Styled prefix design

**Chosen:** A bold colored prefix containing a team icon and the team name, styled with ANSI escape codes, followed by the metrics. Format: `\x1b[1m\x1b[36m👥 spec-team\x1b[0m  🔧 N calls  ↑↓tok  $cost  ctx N%  🤖 model · openspec`

The prefix uses:
- Bold (`\x1b[1m`) for visual weight
- Cyan (`\x1b[36m`) — a distinct but readable color on most terminal themes
- 👥 emoji for "team" connotation
- Reset (`\x1b[0m`) to avoid ANSI leakage into metrics

**Alternatives considered:**
- No prefix (just metrics raw). Rejected — hard to distinguish from other extensions' statuses.
- `[spec-team]` plain text prefix. Functional but not visually delightful.
- Complex gradient/styled prefix with multiple ANSI colors. Rejected — risks terminal compatibility and visual noise.

### Decision 3: Refresh strategy

**Chosen:** Explicit `setStatus` calls at these update points:

1. **On `agent_end` / `message_end`**: The dispatcher's LLM call completes, changing dispatcher token/cost totals. Hook into pi's event system.
2. **After dispatch Promise resolves**: A subagent completes, adding its totals to `agentStates`. The dispatch call (in the `dispatch_agent` tool handler) already has a Promise chain — add a refresh after resolution.
3. **On team switch**: Already exists at line 997 but only shows `"Team: ..."`. Update to emit full metrics.
4. **In `session_start`**: The initial `setStatus` at line 1332 — enhance to emit full metrics.

**Not chosen:** A periodic timer (e.g., every 2 seconds). Rejected as unnecessary — metrics only change at discrete events (tool calls, LLM completions). A timer would add noise with no benefit.

**Not chosen:** Polling `agentStates` or the session branch. State changes already flow through the event hooks listed above.

### Decision 4: Extract a `refreshStatus()` helper

**Chosen:** A private helper function `refreshStatus()` that builds the status string from current state and calls `setStatus`. This avoids duplicating the string-building logic across multiple update points.

## Risks / Trade-offs

**[Risk] Status line may be visually long** → The default footer's status line is space-separated and may wrap. Mitigation: keep the status string concise. The metrics portion is already compact (e.g., `🔧 5 calls  ↑4.2k  ↓1.1k  $0.0231  ctx 12%  🤖 claude-sonnet-4`). The prefix adds ~20 chars.

**[Risk] ANSI escape codes may affect terminal width calculation** → If the default footer uses `visibleWidth()` for truncation, ANSI escapes are correctly handled (they have zero visible width). If it uses raw string length, the styled prefix could cause early truncation. Mitigation: test with a narrow terminal. pi-tui's `visibleWidth` already handles ANSI escapes.

**[Risk] `setStatus` is static — stale data between events** → Between explicit refresh calls, metrics won't change because no data changes. The only "in-flight" period is during a dispatch call (subagent running). Mitigation: the dispatch Promise resolution triggers a refresh.

**[Risk] Event name uncertainty** → The brief mentions `agent_end` / `message_end` but no such events are currently used in the codebase. Pi's event system may use different names (e.g., `message_end` might not exist). Mitigation: during implementation, check the pi SDK event catalog and use the correct event name, or piggyback on existing hooks that fire after LLM completions.
