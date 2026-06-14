## Context

The spec-teams extension currently renders a dashboard widget via `ctx.ui.setWidget("spec-team", ...)` that shows a compact grid of agent cards above the editor. Each card displays only an icon, agent name, and context percentage — too little information for a meaningful overview. The `AgentState` type tracks much richer data (model, thinking level, tools, description, cost, run count, elapsed time, session state) that has no display surface.

The Pi TUI SDK provides `ctx.ui.custom({ overlay: true })` for overlay dialogs that capture keyboard focus and render on top of the editor. This is already used by built-in select dialogs and is the right mechanism for a detailed dashboard view.

Key files:
- `extensions/spec-teams.ts` — main extension, registers widget, commands, tools, events
- `extensions/spec-teams-utils.ts` — utility functions including `computeColumns()`, `renderAgentCell()`, `formatDuration()`, `formatTokens()`, `formatMetricsFooter()`
- `openspec/specs/spec-teams-extension/spec.md` — main spec containing the dashboard widget, `/specs-grid`, and other requirements
- `openspec/specs/grid-top-padding/spec.md` — spec for the widget's top padding behavior

The extension already imports `Box`, `Text`, `Container`, `Markdown`, `Spacer` from `@earendil-works/pi-tui` — the same components needed for the overlay dialog.

## Goals / Non-Goals

**Goals:**
- Remove the dashboard widget entirely — no spatial clutter when not needed
- Remove the `/specs-grid` command (no longer applicable without a widget)
- Add a `/specs-dashboard` command that opens an overlay dialog with full agent detail
- Display all `AgentState` fields plus `AgentDef` frontmatter in each card
- Support keyboard navigation within the overlay (scroll, select agent, close)
- Support live-updating agent states while the dialog is open
- Implement proper `invalidate()` for theme change resilience
- Keep footer status bar completely untouched

**Non-Goals:**
- Changes to dispatch logic, AgentState data model, or sub-agent spawning
- Changes to the footer status bar
- Keyboard shortcuts to open the dashboard (Pi command API only)
- Editing agent state from the dashboard (read-only view)
- Persisting dashboard state across sessions

## Decisions

### Decision 1: Overlay dialog via `ctx.ui.custom()` rather than `setWidget()`

**Why:** `setWidget()` renders always-visible content above the editor — exactly the UX the user dislikes. `ctx.ui.custom()` with `{ overlay: true }` renders on demand, captures keyboard focus, and disposes cleanly on close. This matches the Pi SDK's intended pattern for interactive panels.

**Alternatives considered:**
- **Populated `setWidget()`** — still occupies persistent space, still constrained to a grid format. Rejected for same reason as current widget.
- **`ctx.ui.notify()` with full text** — not interactive, not scrollable, temporary. Rejected.
- **External command output** — no TUI rendering, no interactivity. Rejected.

### Decision 2: Single scrollable list of agent cards in the overlay

**Why:** A simple vertical list of stacked cards is the most readable layout for detailed information. Each card shows all fields for one agent. The list scrolls when agents exceed the overlay height. This avoids the complexity of a multi-column grid with detailed data per cell.

**Alternatives considered:**
- **Tabbed view per agent** — more navigation complexity, harder to compare agents at a glance. Rejected.
- **Two-column grid like current widget** — same space-constrained problems. Rejected.
- **Table layout** — alignment issues with varying field widths, hard to read. Rejected.

### Decision 3: Agent card layout — key-value pairs in a Box with sections

**Why:** Each agent card uses a `Container` with `Text` and `Markdown` children inside a `Box` (for padding and optional background). Fields are rendered as key-value lines: `● Explore  idle  3 runs`, `Model: openrouter/anthropic/claude-sonnet-4`, etc. This mirrors the pattern already used in `renderResult()`.

**Layout per card:**
```
┌─ ● Explore ────────────────────────────────────┐
│ idle · 3 runs · 42s · ctx 21% · $0.0421        │
│ Model: openrouter/anthropic/claude-sonnet-4      │
│ Thinking: medium · Tools: read,grep,bash,edit   │
│ Session: resumed                                 │
│ Investigate codebase for potential issues        │
└─────────────────────────────────────────────────┘
```

### Decision 4: Overlay dimensions and positioning

**Why:** `OverlayOptions` with `width: "60%"`, `maxHeight: "80%"`, `anchor: "center"` provides a centered, reasonably-sized panel that works across terminal sizes. The overlay is scrollable if content exceeds `maxHeight`.

### Decision 5: Live state updates via periodic `invalidate()`

**Why:** The `agentStates` map is already a reactive closure — agents update their state in `dispatchAgent()` and call `updateWidget()`. For the dialog, we replace `updateWidget()` with an `invalidate()` call on the overlay's root component whenever agent state changes. The component re-renders from the live `agentStates` map on each `invalidate()`. When no dialog is open, state updates are a no-op (dialog component ref is null).

### Decision 6: Remove `/specs-grid` command entirely

**Why:** The `/specs-grid` command controls `maxColumns` for the widget grid. With the widget removed, this command has no purpose. Removing it avoids dead commands and user confusion.

### Decision 7: Dispose overlay on Esc/Enter and return void

**Why:** `ctx.ui.custom()` returns a `Promise<T>` resolved by calling `done(result)`. For a dashboard view, the result is meaningless — the user just looks and closes. We'll call `done(undefined)` on Escape or Enter (with focus return to the editor). The overlay component is disposed automatically.

### Decision 8: Use correct `ctx.ui.custom()` API signature

**Why:** The Pi TUI SDK's `ctx.ui.custom()` method takes two arguments: `(factoryFunction, options)`. The factory function receives `(tui, theme, keybindings, done)` where `theme` is the actual TUI Theme instance with `.fg()`, `.bg()`, `.bold()` methods. Passing `getMarkdownTheme()` instead of using the callback's `theme` parameter causes runtime errors because the markdown config object doesn't have styling methods.

**Implementation pattern:**
```typescript
await ctx.ui.custom(
  (tui, theme, _keybindings, done) => {
    // Use 'theme' for .fg(), .bg(), .bold() calls
    // Use getMarkdownTheme() only for Markdown components
    const mdTheme = getMarkdownTheme();
    return renderDashboardDialog(states, activeTeamName, theme, done, tui);
  },
  { overlay: true, overlayOptions: { width: "60%", maxHeight: "80%", anchor: "center" } }
);
```

### Decision 9: Plain Component Object Pattern (not Container subclass)

**Why:** Returning a plain object with `{ render, handleInput, invalidate }` methods follows the proven pattern from `pi-openspec-status` and gives us full control over rendering, input handling, and scrolling. The Pi TUI framework expects this interface for custom overlays.

**Component Interface:**
```typescript
interface DashboardComponent {
  render(width: number): string[];  // Returns array of lines to render
  handleInput(data: string): void;   // Handles keyboard input
  invalidate(): void;                // Clears cached state for re-render
}
```

**Key Implementation Details:**

1. **Border Drawing**: Manual box-drawing characters (`╭─╮│╰─╯`) rendered in `render()` using `theme.fg("border", ...)` around content area. Top border includes centered title.

2. **Scrolling**: Manual implementation via `scrollOffset` state variable and viewport windowing. Only renders visible lines based on `scrollOffset` + `maxVisibleLines`. Supports up/down arrows, j/k, PgUp/PgDn, g/G (home/end).

3. **Input Handling**: Uses `matchesKey(data, Key.escape)` from `@earendil-works/pi-tui` to detect escape sequences. Handles Escape, Enter, q for closing; arrow keys and vi keys for scrolling.

4. **Line Safety**: Uses `truncateToWidth()` and `visibleWidth()` from pi-tui to ensure lines fit within terminal width and handle ANSI escape sequences correctly.

5. **Caching**: Caches rendered content lines and width to avoid recalculating on every frame. `invalidate()` clears cache, forcing rebuild on next render.

6. **TUI Integration**: Optional `tui` parameter allows calling `tui.requestRender()` after scroll changes to trigger immediate re-render.

**Alternatives considered:**
- **Container subclass** — no built-in border drawing or scrolling, requires manual `onKey` hack that doesn't work. Rejected.
- **Box wrapper** — adds padding but not borders or scrolling. Rejected.
- **Existing TUI scrollable component** — none exists in pi-tui. Rejected.
```

## Risks / Trade-offs

- **[Risk: Overlay disposal on agent state changes]** → Mitigation: Keep a nullable reference to the overlay root component. When the dialog is open, `updateWidget()` calls `component.invalidate()` instead. When the dialog closes (done callback fires), set the reference to null. If the dialog is closed mid-dispatch, the `invalidate()` call is a no-op on a disposed component — no crash.

- **[Risk: Theme changes while dialog is open]** → Mitigation: Implement proper `invalidate()` on all dialog components. The Pi TUI framework calls `invalidate()` on theme changes; our implementation must clear any cached theme-dependent strings.

- **[Risk: Changing terminal size while dialog is open]** → Mitigation: Overlay dimensions are percentage-based and re-render on each frame. The `render(width)` method receives the current width, and the overlay's `maxHeight` constrains vertical space. No manual resize handling needed.

- **[Trade-off: Removing always-visible widget]** → Users lose at-a-glance awareness of agent statuses. Mitigated by the footer status bar, which remains and shows aggregate metrics. Users who want detail invoke `/specs-dashboard`.

- **[Trade-off: Overlay requires explicit invocation]** → No global keyboard shortcut API exists. Mitigated by the command being short and memorable (`/specs-dashboard`).