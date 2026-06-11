## Why

The dispatcher widget renders sub-agent output with a structural "jump" when transitioning from live streaming to the final collapsed result. During streaming, text and thinking blocks are interleaved in stream order with proper styling. After completion, the collapsed view concatenates all text into a single Markdown block and places thinking at the bottom — a fundamentally different layout that is visually jarring.

## What Changes

- Replace the collapsed-mode code path in `renderResult()` with the same interleaved rendering loop used in the live/expanded path, adding per-segment text truncation at 4000 cumulative characters (thinking segments excluded from the count)
- Simplify the post-text thinking section: remove the concatenated full-thinking block (now rendered inline), keeping only the `hideThinkingBlock` collapsed hint
- Fix the `hideThinkingBlock` gap in `pushUpdate()` so the live streaming state respects the user's thinking visibility preference

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dispatch-result-rendering`: The collapsed-mode rendering path changes from single concatenated Markdown block to interleaved segments with per-segment text truncation. Truncation now applies to cumulative text characters across segments rather than a single concatenated string.
- `thinking-collapse`: The post-text thinking section is simplified — the full concatenated thinking block in collapsed mode is removed since thinking renders inline. The `hideThinkingBlock` hint remains unchanged. The `hideThinkingBlock` setting is now propagated through `pushUpdate()` so live streaming respects the preference.

## Impact

- **Code**: `renderResult()` collapsed `else` branch (~line 1034 in `extensions/spec-teams.ts`), post-text thinking section, and `pushUpdate()` details payload
- **APIs**: No changes — `dispatch_agent` parameters, return type, and `renderCall` unchanged
- **Dependencies**: None — uses existing `Markdown` component and `getMarkdownTheme()`
- **Throttle**: 50ms `pushUpdate()` throttle unchanged
- **Breaking changes**: None — the structural rendering change is visual-only for the collapsed view; expanded (Ctrl+O) and live streaming are unchanged
