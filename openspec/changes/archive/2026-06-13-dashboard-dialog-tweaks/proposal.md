## Why

The `/specs-dashboard` overlay dialog has three visual defects that make it hard to read: nearly all content text appears dimmed/washed out because primary detail lines use `muted`/`dim` theme tokens instead of `text`, content is flush against box borders with no internal padding, and long agent descriptions don't word-wrap — they get silently truncated at the border.

## What Changes

- **Brighten primary text** — Change `theme.fg("muted", ...)` → `theme.fg("text", ...)` for Model, Thinking, Tools, Session, and Description lines. Change status metrics line from `theme.fg("dim", ...)` → `theme.fg("muted", ...)`. Keep footer hint as `dim`. This creates proper visual hierarchy: accent (header) → text (detail) → muted (secondary metrics) → dim (hint).
- **Add internal padding** — Introduce `PADDING_H = 2` and `PADDING_V = 1` constants. Reduce `innerW` to account for horizontal padding. Prepend padding spaces to each content line. Add vertical blank lines at top and bottom. Adjust scroll math.
- **Enable word-wrapping for descriptions** — Import `wrapTextWithAnsi` from `@earendil-works/pi-tui`. Apply word-wrapping to description text instead of splitting on `\n` only. Each wrapped line gets `theme.fg("text", ...)` styling (per the brightness fix).

## Capabilities

### New Capabilities

_(None — this change modifies an existing capability.)_

### Modified Capabilities

- `dashboard-dialog`: Visual hierarchy, padding, and word-wrapping requirements for the dashboard overlay dialog

## Impact

- **Code**: `extensions/spec-teams-utils.ts` — `renderDashboardDialog()`, `buildContentLines()`, `buildAgentCardLines()`, and the pi-tui import line
- **Dependencies**: Adds `wrapTextWithAnsi` import from `@earendil-works/pi-tui` (already exported, not currently imported)
- **No breaking changes** — dialog behavior and keybindings unchanged; purely visual improvements