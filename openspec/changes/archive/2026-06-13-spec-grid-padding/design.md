## Context

The spec-teams extension registers a dashboard widget via `ctx.ui.setWidget("spec-team", factory)` with placement `"aboveEditor"`. Pi's TUI layout renders the widget inside `widgetContainerAbove`, which prepends a `Spacer(1)` above the widget. The widget factory returns a plain object with `render(width): string[]` and `invalidate()` methods.

The current `render()` method returns raw string lines that Pi wraps into `Text(line, 1, 0)` components inside a Container. This means TUI layout primitives like `Spacer` or `Box` cannot be used inside `render()` — only string content is possible.

The user reports the grid feels visually cramped with only 1 line of spacing from Pi's `Spacer(1)`. Adding 1 more blank line (empty string `""`) to the widget's own output solves this with minimal code change.

## Goals / Non-Goals

**Goals:**
- Add one blank line of visual padding above the agent roster grid on all render paths
- Maintain consistency across empty state, single-column, and multi-column grid layouts

**Non-Goals:**
- Refactoring the widget to use Container-based components
- Changing Pi's built-in `Spacer(1)` above widget containers
- Adding configurable padding (the padding amount is fixed at 1 additional blank line)
- Modifying the `renderResult` method (already has Box padding)

## Decisions

### Decision 1: Prepend empty string vs. Container refactor

**Chosen**: Prepend `""` to the `string[]` output of `render(width)`.

**Rationale**: The widget uses the `render(): string[]` pattern. Pi wraps each string in `Text(line, 1, 0)`, so an empty string `""` becomes `Text("", 1, 0)` — a blank row with no visible content. This is the simplest, most reliable way to add spacing without restructuring the widget factory.

**Alternatives considered**:
- **Container-based component**: Rewrite the factory to return a Container with Spacer + Text children. More idiomatic but requires significant refactoring of `updateWidget()` and managing child component lifecycle.
- **Themed blank line**: Use `theme.bg("customMessageBg", " ")` as a separator line. More visually distinct but theme-dependent and fragile.
- **Two empty strings**: Could add 2 blank lines for even more spacing, but 1 additional line (on top of Pi's existing Spacer(1)) gives 2 total lines of breathing room, which is sufficient.

### Decision 2: Apply padding to all render paths

**Chosen**: Prepend `""` on all three return paths (empty state, single-column, multi-column).

**Rationale**: The widget has 3 distinct return paths in `render(width)`. Consistency requires padding on all paths — the "No agents found" empty state also benefits from spacing above it.

### Decision 3: Where to prepend

**Chosen**: Prepend `""` as the first element of the returned array in each return path, rather than using `lines.unshift("")` on a shared array.

**Rationale**: The empty state returns immediately with a single-element array and doesn't have a `lines` variable. While we could refactor to use `unshift` on the multi-column path, explicitly prepending `""` in each return statement is clearer and doesn't require introducing a shared variable.

## Risks / Trade-offs

- **[Pi renders empty strings as blank rows]** → Confirmed: Pi's Container wraps each `string[]` element as `Text(line, 1, 0)`, so `""` produces a zero-width text child that occupies one row. This is the expected behavior.
- **[Excessive spacing]** → With Pi's `Spacer(1)` plus one `""` line, total spacing is 2 blank lines. If this proves too much, the `""` can be removed easily since it's a single-element prepend, not embedded in layout logic.
- **[All paths must be updated]** → Adding padding to only some return paths would create visual inconsistency. All three paths (empty, single-column, multi-column) are modified together.