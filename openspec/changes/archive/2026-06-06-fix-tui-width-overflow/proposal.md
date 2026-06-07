## Why

Pi crashes with an uncaught exception when the spec-teams extension renders an agent dashboard row containing emoji characters:

```
pi exiting due to uncaughtException:
Error: Rendered line 91 exceeds terminal width (77 > 76).
This is likely caused by a custom TUI component not truncating its output.
Use visibleWidth() to measure and truncateToWidth() to truncate lines.
```

The root cause is in `renderAgentRow()` — it uses a custom `truncate()` helper based on JavaScript `String.length` and `String.slice()` for budget calculations and truncation. Some characters (emoji like ✅, ❌) occupy 2 terminal cells but `String.length` counts them as either 1 or 2 JavaScript code units. Even when the character count is correct, the OVERHEAD budget arithmetic builds the final string without validating actual visual width against the terminal width, and without post-render checking.

The imported `truncateToWidth()` and `visibleWidth()` from `@earendil-works/pi-tui` (the TUI library) exist for exactly this purpose but are not used in the row renderer — the local `truncate()` closure shadows them.

This bug is triggered whenever a streaming agent produces emoji in its progress text. The Verify agent routinely outputs `✅ PASS` / `❌ FAIL`, making it a reliable trigger.

## What Changes

- `renderAgentRow()` replaces its local `truncate()` helper with the imported `truncateToWidth()` from pi-tui
- The final rendered line is validated with `visibleWidth()` and re-truncated if it exceeds the terminal width
- The footer renderer (which also does manual width arithmetic) is audited and fixed if needed

## Capabilities

### Modified Capabilities
- `spec-teams-extension`: Dashboard widget rendering uses TUI-provided width-safe truncation instead of custom character-count truncation. Agent rows no longer crash Pi when they contain double-width characters.

## Impact

- `extensions/spec-teams.ts`: `renderAgentRow()` function, and possibly the footer renderer
- No breaking changes — rows that previously fit still fit; rows with double-width chars are now safely truncated
- No changes to agent definitions, teams, dispatch logic, or system prompt
