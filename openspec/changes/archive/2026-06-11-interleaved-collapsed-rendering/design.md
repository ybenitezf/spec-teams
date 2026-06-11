## Context

The `renderResult()` function in `extensions/spec-teams.ts` has three rendering paths controlled by `isPartial` (live streaming) and `options.expanded` (Ctrl+O):

| Path | Condition | Behavior |
|---|---|---|
| Live/expanded | `isPartial \|\| options.expanded` | Interleaved loop over `orderedContent` — no truncation |
| Collapsed final | `else` (neither partial nor expanded) | Single concatenated `allText` truncated to 4000 chars, no interleaving |

The collapsed path discards the structural information in `orderedContent` (thinking positions), causing a jarring visual transition from streaming. The fix replaces the collapsed `else` branch with the same interleaved loop, adding per-segment truncation.

A secondary issue: `pushUpdate()` omits `hideThinkingBlock` from its details payload, so live streaming always shows thinking regardless of user preference.

## Goals / Non-Goals

**Goals:**
- Collapsed final rendering SHALL use the same interleaved loop as live/expanded, preserving thinking positions
- Text characters SHALL be truncated at 4000 cumulative count, with thinking segments excluded from the count
- The post-text thinking section SHALL be simplified to only the `hideThinkingBlock` hint (no concatenated full-thinking block)
- `pushUpdate()` SHALL include `hideThinkingBlock` so live streaming respects the user preference

**Non-Goals:**
- Live streaming rendering path (unchanged)
- Expanded/Ctrl+O rendering path (unchanged)
- `renderCall`, widget grid, dashboard, metrics footer
- Sub-agent process management, relay protocol

## Decisions

### Decision 1: Reuse the interleaved loop with truncation guard

**Chosen:** Walk `orderedContent` segments in order, counting cumulative text characters. When a text segment exceeds the remaining 4000-char allowance, slice it and stop.

**Alternatives considered:**
- **Pre-truncate `allText` then re-split into segments**: Complex and fragile — would need to reconstruct `orderedContent` boundaries from the truncated string. Rejected because segment boundaries are lost in concatenation.
- **Truncate each segment independently with proportional allocation**: Would distort segment proportions. Rejected because the exact stream order is more valuable.

**Rationale:** The interleaved loop already handles thinking/text separation, spacer insertion, signal detection, and theme application. Adding a character counter and early-exit guard is the minimal change. The existing live/expanded path proves the loop is correct.

### Decision 2: Thinking segments excluded from truncation count

**Chosen:** Only text segments count toward the 4000-character limit. Thinking segments pass through un-truncated.

**Rationale:** This matches the current behavior where only `allText` (text-only concatenation) is truncated. Thinking is secondary content — the user is most interested in the agent's output text, and the 4000-char limit is for scannability of results in the dispatcher LLM's context. Thinking segments are typically short, so excluding them from the count doesn't risk overflow.

### Decision 3: Truncation stops ALL subsequent segments

**Chosen:** Once truncation occurs on a text segment, no further segments (text or thinking) are rendered.

**Alternatives considered:**
- **Continue rendering thinking after text truncation**: Would show orphan thinking blocks disconnected from their associated text. Rejected as confusing to users.
- **Render only thinking after truncation**: Same orphan problem. Rejected.

**Rationale:** Once the text viewport is "full," showing partial content with trailing thinking would be misleading. The expanded view (Ctrl+O) recovers everything. The `\n... [truncated]` suffix on the last rendered text segment signals that content was cut.

### Decision 4: Simplify post-text thinking section

**Chosen:** Remove the `else` branch that renders all thinking as a single concatenated Markdown block. Keep only the `shouldHideThinking` hint.

**Before:**
```
if (hasThinking && (shouldHideThinking || (!isPartial && !options.expanded))) {
  if (shouldHideThinking) { /* hint */ }
  else { /* full thinking block */ }  ← REMOVED
}
```

**After:**
```
if (hasThinking && shouldHideThinking) {
  /* hint only */
}
```

**Rationale:** Since thinking is now interleaved inline for ALL modes, there is never a need for a separate post-text thinking block. The collapse hint (`▶ Thinking (N lines)`) is still needed when the user has `hideThinkingBlock: true`, because inline thinking segments are skipped during the interleaved loop.

### Decision 5: Add `hideThinkingBlock` to `pushUpdate()` details

**Chosen:** Include `hideThinkingBlock: hideThinkingBlockSetting` in the details object sent by `pushUpdate()`.

**Rationale:** The `pushUpdate()` call site constructs details from the current agent state. The `hideThinkingBlockSetting` variable is already available in scope (resolved at function entry from Pi settings). Adding one field fixes the inconsistency where streaming shows thinking but the collapsed result hides it.

## Risks / Trade-offs

- **Risk: Truncation mid-Markdown** — If truncation slices a text segment in the middle of a Markdown construct (e.g., an incomplete code fence), the Markdown component may render it oddly. **Mitigation:** The existing collapsed path has the same issue with `allText.slice(0, 4000)`. The Markdown component handles incomplete constructs gracefully (partial code blocks display as plain text). No regression.
- **Risk: Signal line after truncation point** — `detectStatusSignal()` runs on full `allText` before truncation, but per-segment `splitOutputWithSignals()` runs on truncated segments. A signal line after the cutoff won't render in collapsed view. **Mitigation:** Signals (need-input, blocked, done) are always at the end of output, so this is exceptionally unlikely. Expanded view recovers it.
- **Trade-off: Thinking segments inflate collapsed view height** — Since thinking no longer counts toward truncation, a result with heavy thinking could produce a taller collapsed view than before. **Mitigation:** Thinking segments are styled with `thinkingText` + italic, visually distinct and scannable. Users who want compactness can enable `hideThinkingBlock`.
