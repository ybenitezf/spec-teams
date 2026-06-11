## Why

The spec-teams dispatcher widget renders sub-agent output with three visual inconsistencies compared to native Pi sessions: task markdown renders as plain text, thinking and output appear as separate sequential blocks instead of interleaved, and thinking text renders without markdown parsing (code spans, lists, bold appear as raw syntax). These inconsistencies degrade the reading experience when reviewing sub-agent results inside the TUI. Fixing them aligns the dispatcher rendering with native Pi's `AssistantMessageComponent` behavior.

## What Changes

- **Task → Markdown**: Render task descriptions through the `Markdown` component (with dimmed styling) instead of plain `Text`, so bold, code, and list formatting in task descriptions is parsed and displayed correctly.
- **Interleaved output/thinking**: Track text and thinking deltas in a single ordered array during streaming so they are rendered in stream order (interleaved) rather than all-output-first-then-all-thinking.
- **Thinking → Markdown**: Render thinking content through the `Markdown` component (with `thinkingText` color + italic styling) instead of plain `Text`, matching native Pi's treatment of thinking content.

## Capabilities

### New Capabilities

*(None — this change modifies existing rendering behavior, not new capabilities.)*

### Modified Capabilities

- `dispatch-result-rendering`: Task prefix SHALL be rendered as `Markdown` (dimmed) instead of `Text`; thinking text SHALL be rendered as `Markdown` (thinkingText color + italic) instead of `Text`; output and thinking SHALL be interleaved in stream order instead of sequential blocks.
- `live-subagent-streaming`: The `dispatchAgent()` function SHALL accumulate text and thinking deltas in a single ordered array (interleaved by type change) instead of separate `textChunks[]` and `thinkingChunks[]` arrays. The partial `details` payload SHALL carry ordered content segments rather than separate `outputText`/`thinkingText` strings.
- `thinking-collapse`: Thinking content SHALL be rendered via the `Markdown` component (with thinkingText color + italic) instead of plain `Text`, in both collapsed-hint and full-text paths.

## Impact

- **Affected code**: `extensions/spec-teams.ts` — specifically `dispatchAgent()` (event loop and `pushUpdate()`), `renderResult()` (task, output, and thinking layout), and the `details` payload structure flowing between them.
- **No API changes**: The `dispatch_agent` tool's parameters, return type, and `renderCall` are unchanged. The dispatcher LLM's `content` field returned from `execute()` is unchanged.
- **No dependency changes**: Uses existing `Markdown` component and `getMarkdownTheme()` from `@earendil-works/pi-tui` / `@earendil-works/pi-coding-agent`.
- **User-facing**: Sub-agent results in the TUI will render task descriptions, thinking content, and interleaved output/thinking as proper Markdown, visually matching native Pi sessions.
