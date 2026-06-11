## Context

The spec-teams extension renders sub-agent results in a dashboard widget via `renderResult`. Thinking text (model reasoning) is displayed between the main output and the metrics footer. Currently, thinking is shown as a collapsed hint (`▶ Thinking (N lines)`) by default, and only expands to full text when all three conditions are met:

1. The result is final (not streaming: `isPartial === false`), AND
2. The tool output is in expanded state (`options.expanded === true`, toggled via Ctrl+O), AND
3. The user's `hideThinkingBlock` setting is `false`

This triple-gate is inconsistent with native Pi behavior. In native Pi, `hideThinkingBlock` is the sole binary toggle — thinking streams incrementally alongside output text with no intermediate collapsed state, and there is no streaming suppression. The native rendering path (`AssistantMessageComponent`) has no `isPartial` or `expanded` concept for thinking visibility.

The change simplifies the `showFull` condition at line 982 of `extensions/spec-teams.ts` to a single check: `!shouldHideThinking`.

## Goals / Non-Goals

**Goals:**
- Honor the `hideThinkingBlock = false` setting by showing thinking expanded in ALL states (streaming and final), without requiring manual tool output expansion (Ctrl+O)
- Match native Pi behavior where `hideThinkingBlock` is the sole control for thinking visibility
- Preserve `hideThinkingBlock = true` behavior (collapsed hint is always shown regardless of streaming/expansion state)
- Update the `thinking-collapse` spec to reflect that `hideThinkingBlock` is the only gate

**Non-Goals:**
- Changing the dashboard widget layout or appearance
- Changing sub-agent spawning or dispatch logic
- Modifying Pi core thinking rendering
- Adding incremental word-by-word streaming — thinking text is rendered as a single block per partial update (existing behavior)

## Decisions

### Decision 1: Remove both `isPartial` and `options.expanded` from `showFull`

**Rationale:** Native Pi has no `isPartial` concept for thinking visibility — `AssistantMessageComponent` renders thinking inline during streaming when `hideThinkingBlock` is false. The dimmed/italic theming already visually distinguishes thinking from output, so there is no UX need to suppress it during streaming. Similarly, `options.expanded` is a global tool output toggle that shouldn't gate thinking visibility — the `hideThinkingBlock` setting alone captures user intent.

**Alternatives considered:**
- **Option A (previous): Remove only `options.expanded`, keep `isPartial`** — Partially addresses the issue but still suppresses thinking during streaming. Rejected because native Pi shows thinking during streaming and there's no UX reason to suppress it.
- **Option B: Separate thinking expansion state** — A new toggle independent from both `isPartial` and `options.expanded`. Rejected: over-engineered. The binary `hideThinkingBlock` setting is already the right control.
- **Option C: Keep current behavior** — Rejected by user. Both gates create unnecessary friction.

**Code change:**
```typescript
// Before (line 982):
const showFull = !isPartial && options.expanded && !shouldHideThinking;

// After:
const showFull = !shouldHideThinking;
```

**Behavior matrix:**

| `hideThinkingBlock` | Streaming (`isPartial=true`) | Final (`isPartial=false`) |
|---|---|---|
| `false` (default) | **Full text** (was: collapsed) | **Full text** (was: collapsed unless Ctrl+O) |
| `true` | Collapsed hint | Collapsed hint |

### Decision 2: Keep `showMore` hint for long thinking blocks

The `showMore` variable computes `(N lines total)` for blocks > 50 lines. It appends to the collapsed hint when `hideThinkingBlock` is true. With `hideThinkingBlock` false, the full text is always shown (no line limit), matching native Pi behavior where thinking is rendered without truncation.

### Decision 3: Keep thinking block as single snapshot per partial update

Native Pi streams thinking word-by-word with 50ms throttling. The spec-teams extension receives thinking as a complete block per dispatch result. This change does NOT add incremental streaming — thinking continues to render as a single `Text` block per partial update. This is an existing architectural limitation that a future change could address.

## Risks / Trade-offs

- **[Risk] Large thinking blocks may overwhelm the display during streaming** when `hideThinkingBlock = false` — Mitigation: This matches native Pi behavior where thinking streams incrementally alongside output. The dimmed/italic theming visually distinguishes thinking from output. If walls of dimmed text become an issue, native Pi handles it the same way and users can set `hideThinkingBlock = true`.

- **[Risk] Truncation interaction** — When `options.expanded = false`, output text is truncated to 4000 chars. Showing expanded thinking alongside truncated output is acceptable because thinking uses dimmed/italic theming and is clearly distinct from the main output content.

- **[Risk] Flickering during rapid streaming updates** — Previously, thinking was always collapsed during streaming, so only the hint text changed. Now full thinking text will re-render on each partial update. Mitigation: Pi's TUI only re-renders changed regions, and the existing `renderResult` already handles partial updates. The text widget is a single component that replaces itself, not an append operation.

## Migration Plan

No migration needed. This is a behavior change in the extension only. Users with `hideThinkingBlock = false` will immediately see thinking expanded in both streaming and final results without any config changes.
