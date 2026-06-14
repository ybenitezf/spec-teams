## Context

The `/specs-dashboard` dialog is a plain `Component` (not a Container/Box) that manually draws borders using `╭─╮│╰─╯` characters in `renderDashboardDialog()`. Content lines are built by `buildContentLines()` which calls `buildAgentCardLines()` per agent. All text styling, truncation, and spacing is managed as string output — there is no layout engine.

Currently:
- Primary detail lines (Model, Thinking, Tools, Session, Description) use `theme.fg("muted", ...)`, which renders as dim/faded text in most themes
- Status metrics use `theme.fg("dim", ...)`, making even the primary status line hard to read
- Content lines are rendered as `│{content}│` with zero horizontal padding — text is flush against the border
- No vertical padding — content starts immediately below the top border
- Description text is only split on `\n` — long single-line descriptions get truncated via `truncateToWidth()` instead of wrapped

## Goals / Non-Goals

**Goals:**
- Establish a clear visual hierarchy using the theme token ladder: accent → text → muted → dim
- Add breathing room between content and borders with configurable padding
- Ensure long descriptions are readable via word-wrapping that preserves ANSI color codes

**Non-Goals:**
- Changing the scrolling behavior or keybindings
- Changing the theme color definitions themselves
- Converting the dialog to a Container/Box layout system
- Adding horizontal scrolling for any content
- Modifying any other dialog or the `renderResult`/`renderCall` display methods

## Decisions

### 1. Theme token ladder: accent → text → muted → dim

**Decision**: Change `muted` → `text` for primary content lines, `dim` → `muted` for status metrics, keep `dim` only for the footer hint.

**Rationale**: The existing code uses only `muted` and `dim`, collapsing the visual hierarchy into two levels. The `text` token is the appropriate level for content the user actually needs to read (model name, tools, description). Muted is appropriate for glanceable secondary info (metrics). Dim is appropriate for peripheral hints (footer).

**Alternatives considered**:
- Using `accent` for detail lines — rejected, would make detail lines compete with the header for attention
- Using theme-specific hardcoded ANSI codes — rejected, goes against the theme token system
- Leaving `muted` and only changing `dim` — rejected, `muted` is still too hard to read for primary content

### 2. String-based padding with constants

**Decision**: Introduce `PADDING_H = 2` and `PADDING_V = 1` as module-level constants. Prepend `PADDING_H` spaces to each content line before truncation. Reduce `innerW` by `2 * PADDING_H`. Add `PADDING_V` blank lines at top and bottom of content.

**Rationale**: Since the dialog is a plain Component with hand-drawn borders, there is no layout engine to manage padding. String-based padding is the simplest approach that doesn't require a structural refactor.

**Alternatives considered**:
- Converting to a Container/Box layout — rejected per scope, would be a larger refactor
- Using Unicode thin spaces — rejected, inconsistent width across terminals
- Variable padding based on dialog width — rejected, unnecessary complexity for this use case

### 3. wrapTextWithAnsi for description word-wrapping

**Decision**: Import `wrapTextWithAnsi` from `@earendil-works/pi-tui`. Call `wrapTextWithAnsi(description, innerContentWidth)` in `buildAgentCardLines()` instead of `description.split("\n")`. Each wrapped line gets `theme.fg("text", ...)` styling.

**Rationale**: `wrapTextWithAnsi` is an existing pi-tui utility that handles word-wrapping while preserving ANSI escape codes. It is the correct tool for this job because descriptions may contain inline color codes, and naive `.split()` would break them.

**Alternatives considered**:
- Implementing custom word-wrap — rejected, reinvents what pi-tui already provides
- Truncating descriptions with ellipsis — rejected, loses information the user needs to see
- Horizontal scrolling — rejected, complex and beyond scope

### 4. Width parameter passing to buildContentLines

**Decision**: Modify `buildContentLines(theme)` to accept `innerContentWidth: number` parameter. This value is `width - 2 - 2 * PADDING_H` (border chars + horizontal padding). `buildAgentCardLines()` receives the same width for wrapping descriptions.

**Rationale**: The inner content width is needed by both `buildContentLines()` (for line truncation) and `buildAgentCardLines()` (for description wrapping). Passing it as a parameter rather than computing it inside each function avoids duplication and ensures consistency.

**Alternatives considered**:
- Computing width inside `buildAgentCardLines()` from a global — rejected, creates hidden coupling
- Passing the full `width` and computing padding inside each function — rejected, DRY violation

## Risks / Trade-offs

- **[Reduced content width due to padding]** → Each agent card loses 4 characters of display width (2 per side). For a 60%-width dialog on an 80-column terminal (~48 chars inner), this reduces effective content to ~44 chars. This is acceptable because readability improves more than the width loss hurts.
- **[Wrapped descriptions increase scroll height]** → A long description that previously showed as 1 truncated line may now occupy 3–4 wrapped lines, increasing total dialog height and requiring more scrolling. Mitigated by the fact that the dialog already supports scrolling and most descriptions are short.
- **[wrapTextWithAnsi import adds a dependency on pi-tui internals]** → `wrapTextWithAnsi` is already a published export of `@earendil-works/pi-tui`. It is a stable API, not an internal. Risk is minimal.