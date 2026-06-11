## Context

The spec-teams dispatcher widget (`extensions/spec-teams.ts`) renders sub-agent results in the Pi TUI. The `dispatch_agent` tool uses `renderShell: "self"` to escape the default Box frame, and `renderResult` builds a `Container` with children: header, task (Text), output (Markdown), thinking (Text), and metrics.

Three rendering inconsistencies exist vs native Pi sessions:
1. Task markdown renders as plain `Text` — no bold, code, or list parsing
2. Output and thinking appear as separate sequential blocks — all output first, then all thinking — instead of interleaved in stream order
3. Thinking text renders as plain `Text` — no markdown parsing for code spans, lists, or bold

The native Pi `AssistantMessageComponent` (in `dist/modes/interactive/components/assistant-message.js`) shows the correct pattern: it iterates `message.content[]` in order, rendering both text and thinking segments as `Markdown` components, with thinking using `thinkingText` color plus italic styling.

The exploration findings document provides detailed analysis of the root causes, alternatives, and edge cases. This design formalizes those findings into actionable technical decisions.

## Goals / Non-Goals

**Goals:**
- Render task descriptions as `Markdown` (dimmed) so bold, code, and lists are parsed
- Render thinking content as `Markdown` (thinkingText color + italic) so code spans, lists, and bold are parsed
- Interleave output text and thinking in stream order (as the sub-agent emits them) rather than separate sequential blocks
- Maintain all existing constraints: 50ms throttle, `hideThinkingBlock` control, `renderShell: "self"`, backward-compatible dispatcher LLM content

**Non-Goals:**
- Change `renderCall` (tool call label preview) — the truncated 60-char preview stays as `Text`
- Change dispatcher LLM content — the `content` field returned from `execute()` is unchanged
- Change the dashboard widget, footer metrics, or `formatMetricsFooter`
- Implement contentIndex-based ordering — the alternating-type merge approach is simpler and equally correct
- Add new Markdown rendering capabilities beyond what the existing `Markdown` component provides

## Decisions

### Decision 1: Use alternating-type merge for interleaving (not contentIndex)

**Chosen**: Track deltas as `orderedContent: {type: "text" | "thinking", content: string}[]`. On each delta, merge consecutive same-type segments; split on type change.

```typescript
// On text_delta: if last segment is "text", append; else push new {type: "text"}
// On thinking_delta: if last segment is "thinking", append; else push new {type: "thinking"}
```

**Alternative**: Use `contentIndex` from delta events to build a sparse array, then sort. Rejected because: (a) ContentIndex parsing adds complexity, (b) the sub-agent always alternates text/thinking blocks (no out-of-order segments), and (c) merging consecutive same-type deltas naturally produces the correct order.

**Rationale**: Simpler, no contentIndex dependency, correct for the actual data the sub-agent produces.

### Decision 2: Render thinking as Markdown with thinkingText color + italic (matching native Pi)

**Chosen**: Replace `new Text(theme.fg("thinkingText", ...))` with:
```typescript
new Markdown(content, 0, 0, mdTheme, {
    color: (text) => theme.fg("thinkingText", text),
    italic: true,
})
```

**Alternative**: Keep thinking as `Text` but render thinking with Markdown — wouldn't work since `Text` doesn't parse markdown. Rejected.

**Rationale**: This exactly matches native Pi's `AssistantMessageComponent` behavior, where thinking segments use `Markdown` with `{color: thinkingText, italic: true}` styling.

### Decision 3: Render task as Markdown with dimmed color

**Chosen**: Replace `new Text(theme.fg("dim", details.task), 0, 0)` with:
```typescript
new Markdown(details.task, 0, 0, mdTheme, {
    color: (text) => theme.fg("dim", text),
})
```

**Rationale**: Task descriptions containing code, bold, or lists are currently displayed with raw syntax visible. The `Markdown` component handles this correctly. The `mdTheme` variable is already in scope (used for output Markdown). No additional config needed.

### Decision 4: Pass ordered content through details (not separate outputText/thinkingText)

**Chosen**: Add `orderedContent: {type: "text"|"thinking", content: string}[]` to the details payload in `pushUpdate()` and the final result. Keep `outputText` and `thinkingText` as well for backward compatibility with `execute()` return values.

**Rationale**: `renderResult` needs ordered content for interleaved rendering. The `execute()` function needs the full output text as a flat string (for the dispatcher LLM). Both can coexist — `orderedContent` for rendering, `outputText`/`thinkingText` for the LLM-facing content.

### Decision 5: Signal detection works on concatenated text segments

**Chosen**: After interleaving, concatenate all text-type segments into a single string for signal detection (`detectStatusSignal` and `splitOutputWithSignals`). Then render each segment individually with signal-aware splitting.

**Rationale**: The existing signal detection logic scans the full output string. With interleaving, signals always appear in output text (not thinking), so concatenating text segments preserves correct signal detection. If a signal spans a boundary, it would only be split at a text/thinking boundary, which cannot happen because signals are always in output text.

### Decision 6: Add blank line separator between segments of different types

**Chosen**: When iterating `orderedContent` in `renderResult()`, insert a blank `Spacer(1)` line between consecutive segments of different types (text → thinking or thinking → text).

```typescript
let prevType: string | null = null;
for (const segment of orderedContent) {
    if (prevType !== null && segment.type !== prevType) {
        container.addChild(new Spacer(1));
    }
    prevType = segment.type;
    // ... render segment
}
```

**Alternative**: Do nothing — allow segments to run together. Rejected because: when text and thinking segments alternate (e.g., text → thinking → text), they visually merge into one continuous block without any boundary indication.

**Rationale**: A blank line between different-type segments creates a clear visual boundary, making it easy to distinguish where thinking ends and output resumes (or vice versa). This matches natural document formatting conventions where a paragraph break separates distinct content. A `Spacer(1)` is the simplest and most consistent separator — it adds one blank line, which is minimal visual overhead.

## Risks / Trade-offs

- **[Risk] More Markdown components = more re-renders on each update** → **Mitigation**: Total text volume is unchanged; the 50ms throttle limits re-renders to ≤20/sec. The Markdown component already re-renders on each update for the current single-component approach. Multiple smaller Markdown components sum to the same total work.

- **[Risk] Empty thinking segments between text blocks** → **Mitigation**: Already handled — skip rendering segments with empty content.

- **[Risk] Signal detection might break if signal line spans a text/thinking boundary** → **Mitigation**: Signals (`Status: ...`) are always in the output text, never in thinking text. Even with interleaving, a signal line will be fully contained within a single text segment.

- **[Risk] Thinking styled with italic may look different from native Pi on some terminals** → **Mitigation**: Pi's `Markdown` component handles terminal capability detection for italic support (fallback handling already built in).
