## Context

The Pi TUI has a strict enforcement mechanism: the `doRender` method in `pi-tui` measures each rendered line with `visibleWidth()` and throws a hard crash if any line exceeds the terminal width. Extensions are expected to use `visibleWidth()` to measure and `truncateToWidth()` to truncate — the crash message says this explicitly.

The spec-teams extension's dashboard widget (`renderAgentRow`) builds compact single-line rows showing agent status, context usage bar, and current task description. It uses manual arithmetic with a fixed `OVERHEAD` constant and a local character-based `truncate()`, bypassing the TUI's width-safe utilities.

## Root Cause Analysis

The crash line (91) contains a `✅` emoji from the Verify agent's streaming output. The emoji occupies 2 terminal cell widths but the budget calculation treats it as if it fits in 1 position.

```
Line construction:   icon + name + ctxBar + description
Fixed overhead:      1    + 6   + 11     = 18 visible chars + spacing
Budget for desc:     width(76) - overhead(23) = 53 chars

Actual rendered:     ● Verify  [##---] 27%  | Endpoint exists... | ✅ PASS | `dec…
                                                                     ↑
                                                   2 visual cells, budget reserved 1
Result: 77 > 76 → crash
```

Two contributing factors:
1. **Character-based truncation**: The local `truncate()` uses `s.length` and `s.slice(0, max)`. In JavaScript, `"✅".length` is 2 (surrogate pair), but the budget holes don't account for the visual expansion of emoji within the description string.
2. **No post-render validation**: The function returns the concatenated string without checking `visibleWidth()` against `width`. A simple guard clause at the end would catch any off-by-one errors.

## Decisions

### Decision 1: Use `truncateToWidth()` for all truncation in the row renderer

Replace the local `truncate()` helper with the imported `truncateToWidth()`. This ensures truncation respects visual width (2 cells for emoji, 1 for ASCII) rather than JavaScript code units.

**Rationale**: `truncateToWidth` is the TUI's intended API for this exact purpose. It handles CJK, emoji, combining characters, and ANSI escape sequences correctly. The local `truncate()` was an early shortcut that needs to be retired.

### Decision 2: Add a `visibleWidth()` safety net at the end of `renderAgentRow()`

After computing the row string, check `visibleWidth(result)` against `width`. If it exceeds, re-truncate with `truncateToWidth(result, width)`. This is a defense-in-depth measure: even if the budget calculation has a bug, the safety net prevents a crash.

**Rationale**: The OVERHEAD constant and budget math are fragile — they make assumptions about ANSI styling not contributing visible width, but the actual concatenation might introduce discrepancies. A post-render guard is cheap (one function call) and guarantees safety.

### Decision 3: Keep the OVERHEAD-based budget as a first pass, with safety net

Don't rewrite the entire budget system. The OVERHEAD calculation works correctly for the common case (ASCII-only text). Replace only the truncation function and add the safety net. This minimizes change surface and risk.

**Alternatives considered**:
- Full rewrite using `Text` objects and `truncateToWidth` for every segment — rejected because it's a larger change with no additional benefit given Decision 2's safety net
- Just the safety net without changing truncation — rejected because truncating the final string would cut mid-word; using `truncateToWidth` on individual segments produces better visual results

### Decision 4: Audit the footer renderer for the same class of bug

The footer (line ~535) also does manual width arithmetic (`width - visibleWidth(left) - visibleWidth(right)`) with a `" ".repeat()` for padding. This is safer because it uses `visibleWidth()` for measurement, but we should verify it doesn't have edge cases. The footer produces only ASCII text (model name, team name, context bar), so it's unlikely to trigger, but we'll add it to the audit scope.

## Risks / Trade-offs

- [Risk: `truncateToWidth` with multi-segment ANSI text might split ANSI codes] → Mitigation: `truncateToWidth` is designed to handle ANSI sequences correctly; it resets styles at truncation boundaries
- [Risk: The safety net truncating mid-emoji could produce garbled output] → Mitigation: `truncateToWidth` handles grapheme clusters correctly; it won't split a surrogate pair or combining character sequence
- [Risk: Performance of calling `visibleWidth` on every row render] → Mitigation: `visibleWidth` is a lightweight regex-based measurement; the dashboard has ≤10 rows and renders at most once per second (on agent state updates)
