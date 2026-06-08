## Context

The spec-teams extension dashboard widget currently renders one agent per terminal row via `renderAgentRow()`. Each row includes: status icon, agent display name, a `[#####]` context bar, and a long description/active-work string. With 5 agents, this consumes 5 terminal rows. As the team grows, the widget wastes vertical space — the long description strings are rarely fully readable and the context bars are redundant with the percentage alone.

The `/specs-grid` command already exists but is a dead no-op (it prints a deprecation notice). The user wants to repurpose it to configure grid columns.

The TUI uses `truncateToWidth` and `visibleWidth` from `@earendil-works/pi-tui` for visual-width-aware string manipulation. These handle CJK characters and emoji correctly.

## Goals / Non-Goals

**Goals:**
- Compact grid layout: multiple agents per row, packing horizontally instead of vertically
- Drop description field and `[#####]` context bar from each cell — show only `icon Name NN%`
- Responsive column count that adapts to terminal width
- Configurable max columns via `/specs-grid <1-6>` command
- Graceful degradation: single-column mode renders at full width (identical visual effect to old layout minus description/bar)
- Lines never exceed terminal width (hard TUI requirement)

**Non-Goals:**
- Adding back description on hover/expand
- Color-coding percentage by context level
- Per-agent column override
- Changing the footer widget
- Any changes to the dispatch system prompt or agent routing

## Decisions

### Decision 1: Cell format — `icon Name NN%` only

**Rationale:** The description field is the primary space consumer and is rarely fully readable in a compact widget. The `[#####]` bar is visually redundant with the `NN%` number. Dropping both yields a cell that fits in ~15 chars instead of the full terminal width.

**Alternatives considered:**
- Keep the bar but drop description → still ~27 chars per cell, too wide
- Keep description truncated to 3 chars → description fragments are misleading
- Use tooltip-on-hover → out of scope, TUI doesn't support hover

### Decision 2: Separator character — `│` (box-drawing vertical bar)

**Rationale:** `│` (U+2502) is a standard box-drawing character that visually separates columns without ambiguity. It's a single visible-width character.

**Alternatives considered:**
- `|` (ASCII pipe) → indistinguishable from text content that might contain `|`
- Two spaces → invisible boundary when cells are empty or short
- No separator → ambiguous column boundaries with short names

### Decision 3: `computeColumns()` formula — `min(maxColumns, numAgents)` with 12-char minimum

**Rationale:** A cell below 12 visible chars cannot fit `○ Exp 100%` (icon + 3-char name + space + 4-char percent = 12). The algorithm tries the max columns first and reduces until cells are wide enough, falling back to 1 column for extremely narrow terminals.

**Alternatives considered:**
- Fixed 3 columns always → wastes space on wide terminals, breaks on narrow ones
- Dynamic by agent count only → ignores terminal width (the TUI constraint)
- `cellWidth = floor(width / cols)` without separator accounting → off-by-one, lines exceed width

### Decision 4: Max columns range 1-6, default 3

**Rationale:** 6 agents wide fits comfortably on a 120-char terminal (6 × ~18 chars + 5 separators = 113 visible chars). Default 3 balances compactness with readability on standard 80-char terminals.

**Alternatives considered:**
- 1-4 range → too conservative for ultrawide monitors
- 1-8 range → cells too narrow even at 120 chars
- No max → would try to fit all agents on one row, producing unreadable cells

### Decision 5: Last row left-aligned without trailing separators or empty cells

**Rationale:** A partially filled last row looks cleaner left-aligned. Trailing empty cells waste space and confusingly suggest missing agents.

## Grid Layout Mockups

### 80-char terminal, 5 agents, maxColumns=3 (default)

computeColumns: 5 agents, width=80, max=3 → cols=min(3,5)=3
cellWidth = floor((80 - 2) / 3) = floor(78/3) = 26 ✓ (≥12)

```
○ Explore      21%│○ Propose      45%│● Apply        78%
○ Verify        5%│○ Archive       0%
```

### 80-char terminal, 2 agents, maxColumns=3 (default)

computeColumns: 2 agents, width=80, max=3 → cols=min(3,2)=2
cellWidth = floor((80 - 1) / 2) = floor(79/2) = 39 ✓ (≥12)

```
○ Explore                             21%│○ Propose                             45%
```

### 40-char terminal, 5 agents, maxColumns=3

computeColumns: 5 agents, width=40, max=3
- cols=3: cellWidth = floor((40-2)/3) = floor(38/3) = 12 ✓ (≥12) → return 3

```
○ Expl  21%│○ Prop  45%│○ Appl  78%
○ Veri   5%│○ Arch   0%
```

### 30-char terminal, 5 agents, maxColumns=3

computeColumns: 5 agents, width=30, max=3
- cols=3: cellWidth = floor((30-2)/3) = floor(28/3) = 9 < 12 → try 2
- cols=2: cellWidth = floor((30-1)/2) = floor(29/2) = 14 ✓ (≥12) → return 2

```
○ Explore     21%│○ Propose     45%
○ Apply       78%│○ Verify       5%
○ Archive      0%
```

### 20-char terminal, 5 agents, maxColumns=3

computeColumns: 5 agents, width=20, max=3
- cols=3: cellWidth = floor((20-2)/3) = 6 < 12 → try 2
- cols=2: cellWidth = floor((20-1)/2) = 9 < 12 → try 1
- cols=1: returns 1 (full-width fallback)

```
○ Explore  21%
○ Propose  45%
○ Apply    78%
○ Verify    5%
○ Archive   0%
```

### 120-char ultrawide, 8 agents, maxColumns=6

computeColumns: 8 agents, width=120, max=6
- cols=6: cellWidth = floor((120-5)/6) = floor(115/6) = 19 ✓ (≥12) → return 6

```
○ Explorer    21%│○ Proposer    45%│○ Applier     78%│○ Verifier     5%│○ Archiver     0%│○ Reviewer    12%
○ Builder      8%│○ Tester      33%
```

### 1-column mode (maxColumns=1, or narrow terminal fallback)

```
○ Explore                                                              21%
○ Propose                                                              45%
○ Apply                                                                78%
○ Verify                                                                5%
○ Archive                                                               0%
```

### 0 agents

```
No agents found. Add .md files to agents/
```

## Risks / Trade-offs

- **Description visibility loss** → Users can no longer see what each agent is working on from the dashboard. Mitigation: the description was rarely fully readable anyway in the old layout; agent activity is visible through the status icon (idle/running/done/error) and context percentage.
- **Context bar removal** → Users lose the visual `[#####]` fill bar. Mitigation: the percentage still provides the same information; the bar was redundant.
- **Very long agent names** → Names like "open-spec-architect" may take significant space. Mitigation: names are truncated to fit cell budget; in worst case (cell < 12), percentage is dropped and only icon + truncated name shown.
- **CJK/emoji agent names** → Double-width characters could cause miscalculation. Mitigation: `visibleWidth` and `truncateToWidth` handle these correctly; post-render safety guard re-truncates if `visibleWidth(result) > cellWidth`.
