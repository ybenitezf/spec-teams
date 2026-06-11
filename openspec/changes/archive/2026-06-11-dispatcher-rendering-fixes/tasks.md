## 1. Ordered content tracking in dispatchAgent

- [x] 1.1 Replace `textChunks` and `thinkingChunks` arrays with a single `orderedContent: {type: "text" | "thinking", content: string}[]` array in `dispatchAgent()`
- [x] 1.2 Update `text_delta` handler: if last segment in `orderedContent` is type `"text"`, append delta to it; otherwise push new `{type: "text", content: delta}`
- [x] 1.3 Update `thinking_delta` handler: if last segment in `orderedContent` is type `"thinking"`, append delta to it; otherwise push new `{type: "thinking", content: delta}`
- [x] 1.4 Update `pushUpdate()` to include `orderedContent` in the `details` payload, while preserving `outputText` and `thinkingText` for backward compatibility (the dispatcher LLM return)
- [x] 1.5 Update the final `resolve()` call to include `orderedContent` in the result, alongside existing `output` and `thinkingText`

## 2. Interleaved rendering in renderResult

- [x] 2.1 Read `details.orderedContent` (for final results) or `details.orderedContent` (for partial results) in `renderResult`; fall back to constructing ordered content from `details.outputText`/`details.thinkingText` when `orderedContent` is absent (backward compatibility)
- [x] 2.2 Iterate `orderedContent` and render each segment in order: text segments as `new Markdown(content, 0, 0, mdTheme)`, thinking segments as `new Markdown(content, 0, 0, mdTheme, {color: (text) => theme.fg("thinkingText", text), italic: true})`
- [x] 2.3 Handle `hideThinkingBlock`: when true, skip individual thinking Markdown components and render a single collapsed `▶ Thinking (N lines)` hint (computed from total thinking lines across all segments) instead
- [x] 2.4 Handle truncation for collapsed mode: when `options.expanded` is false, concatenate all text segments, truncate to 4000 chars, and render as single Markdown (same behavior as before, but uses ordered content concatenation)
- [x] 2.5 Adapt `detectStatusSignal` and `splitOutputWithSignals` to work on the concatenated text from all text-type segments in `orderedContent`, then render with signal-aware splitting per segment
- [x] 2.6 Add a blank line separator (`new Spacer(1)`) between consecutive segments in the ordered content loop when the current segment's type differs from the previous segment's type (i.e., text → thinking or thinking → text boundaries), to visually separate different content types

## 3. Task rendered as Markdown

- [x] 3.1 In `renderResult`, replace `new Text(theme.fg("dim", details.task), 0, 0)` with `new Markdown(details.task, 0, 0, mdTheme, {color: (text) => theme.fg("dim", text)})` for the task prefix
- [x] 3.2 Ensure the `mdTheme` variable is available at the task rendering location (it is already defined earlier in the function)

## 4. Thinking rendered as Markdown

- [x] 4.1 In the `hideThinkingBlock` false path (full thinking), replace `new Text(theme.fg("thinkingText", details.thinkingText), 0, 0)` with `new Markdown(details.thinkingText, 0, 0, mdTheme, {color: (text) => theme.fg("thinkingText", text), italic: true})` — this applies to the non-interleaved fallback path
- [x] 4.2 Ensure the collapsed `▶ Thinking (N lines)` hint stays as `Text` (not Markdown) since it's a control element, not user content

## 5. Edge cases and verification

- [x] 5.1 Verify empty thinking segments are skipped during interleaved rendering (guard: `if (segment.content.trim())`)
- [x] 5.2 Verify empty task (`details.task` is falsy) still omits the task prefix correctly
- [x] 5.3 Verify plain text tasks and thinking render identically to before (no regression for content without markdown)
- [x] 5.4 Verify signal detection works when signals appear in text segments within ordered content
- [x] 5.5 Verify the `50ms` throttle behavior is unchanged — `pushUpdate()` still rate-limits to ≤20 calls/sec
- [x] 5.6 Verify backward compatibility: the `content` returned to the dispatcher LLM via `execute()` is unchanged
