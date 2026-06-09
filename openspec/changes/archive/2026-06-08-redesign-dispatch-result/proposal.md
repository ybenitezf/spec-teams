## Why

The `dispatch_agent` tool's `renderResult` renders sub-agent output as a single unstructured `Text` component — no visual hierarchy, no Markdown rendering, thinking text always visible as walls of dimmed text, usage/cost metrics that vanish on completion, and relay protocol signals buried in plain text. Pi's own subagent example demonstrates a richer pattern using `Container` + `Markdown` + `Spacer` + collapsible views that the dispatch tool should follow.

## What Changes

- **Section-based result rendering** — Replace flat `Text(\n\nJoined)` with `Container` children: header, `─── Task ───` section, `─── Output ───` section (rendered through `Markdown`), `─── Thinking ───` section, and a metrics footer. Each section separated by `Spacer`.

- **Markdown rendering for output** — Render agent output text through the `Markdown` component (with `getMarkdownTheme()`) for syntax highlighting, code blocks, and rich formatting.

- **Thinking text collapsed by default** — Hide thinking content behind a `▶ Thinking (N lines)` hint. Expand to full thinking when `options.expanded` is true (Ctrl+O). This mirrors the subagent example's collapsed/expanded pattern.

- **Status signal highlighting** — Detect relay protocol signal lines (`Status: need-input`, `Status: ready-to-propose`, `Status: blocked`) in output and render them with visual emphasis (colored, bold, or boxed) so the dispatcher can visually identify state transitions.

- **Metrics footer in final result** — Show tool count, token counts (`↑N ↓N`), cost (`$X.XXXX`), and context% in both partial (streaming) and final (done/error) views. Currently these metrics disappear from the final result.

- **Usage/cost accumulation** — The `Usage` data (input/output tokens, cost) flows through `message_end` events but is discarded. Add accumulation fields (`inputTokens`, `outputTokens`, `cost`) to the streaming state, accumulate across all `message_end` events, and pass through to `renderResult` via details.

- **Rich renderCall header** — Enhance `renderCall` to show agent name, task preview, and model info using themed formatting consistent with the subagent example.

## Capabilities

### New Capabilities

- `dispatch-result-rendering`: Section-based result layout using Container, Markdown, Spacer, and themed dividers replacing flat Text rendering
- `thinking-collapse`: Thinking text hidden by default with expand hint, shown fully only when expanded (Ctrl+O)
- `status-signal-highlighting`: Visual emphasis (color, bold) for relay protocol signal blocks in agent output
- `metrics-footer`: Persistent metrics display (tool count, tokens ↑↓, cost, context%) in both streaming and final views
- `usage-accumulation`: Accumulate input/output tokens and cost from `message_end`/`agent_end` events and expose through streaming state and final details

### Modified Capabilities

- `live-subagent-streaming`: The renderResult requirements change — partial view switches from flat Text to Container-based layout with Markdown, thinking is collapsed not always-visible, and the status line format changes to include token counts and cost

## Impact

- **extensions/spec-teams.ts**: `renderResult()`, `renderCall()`, `pushUpdate()`, and `message_end`/`agent_end` event handling in `dispatchAgent()`
- **AgentState interface**: New fields for `inputTokens`, `outputTokens`, `cost`
- **pushUpdate details**: New fields passed to `onUpdate` for usage data
- **No impact**: Agent definitions, system prompts, TUI commands, sub-agent process management, widget grid, archive/verify behavior
