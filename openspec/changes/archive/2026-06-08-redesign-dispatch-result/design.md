## Context

The `dispatch_agent` tool in the spec-teams extension spawns sub-agent processes and renders their results in the TUI. Currently `renderResult` produces a flat `Text` component with `\n`-joined strings. Pi's own subagent example (`examples/extensions/subagent/`) demonstrates a richer pattern: `Container` with child components (`Text`, `Markdown`, `Spacer`), `─── Section ───` dividers, collapsed/expanded state handling, and usage stats footers. The dispatch tool should adopt this pattern.

Current limitations:
- No visual section hierarchy — task, output, and thinking blend together
- Thinking text always visible (all 5 agents use `thinking: on`), burying actual output
- Tool count and context% visible during streaming but vanish from final result
- Usage/cost data from `message_end` events is ignored entirely
- Relay protocol signals (`Status: need-input`, `Status: ready-to-propose`, `Status: blocked`) are plain text with no visual callout
- Output is raw text without Markdown rendering or syntax highlighting

## Goals / Non-Goals

**Goals:**
- Restructure `renderResult` to use `Container` with sectioned children (header, task, output, thinking, metrics)
- Render output through `Markdown` component for syntax highlighting and rich formatting
- Collapse thinking text by default, expandable via Ctrl+O (`options.expanded`)
- Highlight relay protocol status signals with visual emphasis
- Show metrics footer (tools, tokens ↑↓, cost, context%) in both partial and final views
- Accumulate usage/cost data from `message_end`/`agent_end` events and pass through to render
- Enhance `renderCall` with model info and consistent formatting

**Non-Goals:**
- Changing widget grid rendering (`renderAgentCell`, `updateWidget`) — separate concern
- Modifying agent definitions, system prompts, or team configuration
- Changing TUI commands (`/specs-team`, `/specs-grid`)
- Altering sub-agent process spawning or lifecycle management
- Archive/verify agent behavior or the relay protocol definition itself

## Decisions

### 1. Container-based layout with themed dividers

**Decision:** Use `Container` as the root component with child `Text` and `Markdown` blocks separated by `Spacer`. Section dividers use `theme.fg("muted", "─── Section Name ───")`.

**Rationale:** Matches the subagent example pattern. Provides clean visual hierarchy. The `Container` component naturally handles child layout without manual `\n` counting. Each section is a distinct child, making the code more maintainable.

**Alternative considered:** Keep `Text` as root but format with ANSI box-drawing characters. Rejected — would be complex to maintain, no Markdown support, and diverges from the established subagent pattern.

### 2. Markdown for output, Text for other sections

**Decision:** Render agent output text through the `Markdown` component (with `getMarkdownTheme()` from `@earendil-works/pi-coding-agent`). All other sections (header, task, thinking, metrics) use `Text`.

**Rationale:** Output often contains code blocks, lists, and structured text that benefits from syntax highlighting. Task text and thinking are plain prose that doesn't need Markdown. Using `Markdown` only for output keeps the component tree simple.

**Alternative considered:** Render everything as `Markdown`. Rejected — thinking text is raw LLM reasoning (not formatted), and task prompts are plain strings. Wrapping them in Markdown would add unnecessary parsing overhead.

### 3. Thinking collapsed via options.expanded

**Decision:** When `options.expanded` is false (collapsed), show a dimmed `▶ Thinking (N lines)` hint. When true, show the full thinking text with dimmed styling. No separate state management — rely entirely on `options.expanded` which is toggled by Pi's Ctrl+O.

**Rationale:** Pi already provides `options.expanded` in the `renderResult` signature. Reusing it avoids introducing custom state. The subagent example uses the same pattern (collapsed shows fewer items, expanded shows everything).

**Alternative considered:** Custom collapsible state managed in the extension. Rejected — would need additional event handling and could conflict with Pi's built-in expand behavior.

### 4. Regex-based status signal detection in renderResult

**Decision:** Scan the output text in `renderResult` for regex pattern `/^Status:\s+(need-input|ready-to-propose|blocked|done-exploring)/m`. When matched, render the matching line(s) with `theme.fg("warning", theme.bold(...))` or similar emphasis, and optionally add a boxed border via ANSI styling.

**Rationale:** The signal format is fixed, simple, and line-based. A regex scan in the render function is lightweight and doesn't require changes to the data flow. The dispatcher LLM already detects these signals from content text; this change only adds visual emphasis for the human viewing the TUI.

**Alternative considered:** Parse signals in `execute` and pass as structured `details` field. Rejected — would duplicate signal parsing logic, add coupling between execute and render, and require passing signal metadata through the partial update pipeline.

### 5. Metrics footer format following subagent pattern

**Decision:** Format metrics as: `🔧 3 calls  ↑1.2k ↓856  $0.0042  ctx 12%`. Use `formatTokens()` (k for thousands) for token counts, 4 decimal places for cost. Show `$0` or omit cost line when cost is zero (pricing may not be configured).

**Rationale:** The subagent example uses `↑N ↓N $X.XXXX` format which is concise and familiar. Using the same format maintains consistency across Pi extensions.

**Alternative considered:** Full numeric display (e.g., `1200 input tokens`). Rejected — consumes too much horizontal space in the TUI and diverges from the established pattern.

### 6. Usage accumulation in AgentState

**Decision:** Add `inputTokens`, `outputTokens`, `cost` fields to `AgentState`. Accumulate from `message_end.usage.input`, `message_end.usage.output`, and `message_end.usage.cost.total` (if present). Pass through `pushUpdate` details and final resolve details.

**Rationale:** The `message_end` events already carry this data but only `input` is used (for `contextPct`). Accumulation is additive across all assistant messages in a session. This data then flows naturally to `renderResult` via the existing details mechanism.

**Alternative considered:** Compute usage from final messages array only (no streaming accumulation). Rejected — would lose the ability to show metrics during streaming, which is a key goal.

### 7. Keep default Box renderShell

**Decision:** Do not set `renderShell: "self"`. Keep the default Box shell which provides automatic status-dependent backgrounds (pending = dim, success = green, error = red) and maintains visual consistency with other tools.

**Rationale:** The default Box is the standard for tools in Pi. Using `"self"` would require manually implementing status backgrounds, adding complexity with no benefit. The Box border also provides a natural visual frame for the structured content.

### 8. renderCall enhancement

**Decision:** Add model name display to renderCall when available, format as `dispatch_agent explore (claude-sonnet-4-20250514) — task preview...`. Keep the existing agent name + task preview structure, just add model info.

**Rationale:** Model info helps users understand which model is processing their request. This is visible before the result renders and doesn't interfere with the tool header's compact format.

## Risks / Trade-offs

**[Risk] Markdown rendering on truncated output may produce incomplete blocks** → Mitigation: When output is truncated (4000 chars in collapsed mode), pass the truncated text to Markdown. Incomplete code fences or lists may render oddly, but this is acceptable since the user can expand (Ctrl+O) to see the full rendered output. The subagent example has the same behavior.

**[Risk] Regex signal detection could false-positive on output that literally contains "Status: need-input"** → Mitigation: The signal format is unambiguous (exact string match at line start) and the relay protocol is the only source of these strings. If false positives become an issue, add context requirements (e.g., must be at end of output, must be on its own line).

**[Risk] Cost field may be unavailable (pricing not configured)** → Mitigation: When cost is 0 or undefined, display `$0` or omit the cost segment entirely. The metrics footer gracefully degrades: always show tool count and context%, show token counts when available, show cost when non-zero.

**[Risk] Container with many children may impact TUI rendering performance** → Mitigation: The component tree is small (5-8 children max). Pi's TUI rendering is optimized for this pattern. Streaming updates arrive at 250ms throttle, giving ample time between renders.

**[Risk] Expanded mode (Ctrl+O) shows thinking text unconditionally** → Mitigation: This is by design — expanded mode means "show me everything." Users who want to hide thinking should remain in collapsed mode. The thinking section is clearly labeled and dimmed, so it doesn't compete with output visually.
