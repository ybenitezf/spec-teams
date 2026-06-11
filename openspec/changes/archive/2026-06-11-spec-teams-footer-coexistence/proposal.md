## Why

The spec-teams extension currently calls `setFooter()` in its `session_start` handler, which completely replaces the default pi-agent footer with a custom single-line footer. This is an aggressive takeover: other extensions' `setStatus()` calls become invisible (the default footer's line 3 that renders all extension statuses is gone), and useful built-in footer info (PWD, git branch, session name, token stats, model) is hidden. The footer should coexist with the default footer and other extensions, not replace them.

## What Changes

- **BREAKING** Remove the `_ctx.ui.setFooter(...)` call (the entire ~55-line render closure that builds the one-line aggregate footer). The extension will no longer replace the default footer.
- Replace the footer takeover with a `setStatus("spec-team", formattedMetrics)` call that publishes spec-teams metrics onto the default footer's extension statuses line. This uses the same `formatMetricsFooter()` helper already in use.
- Add a styled prefix to the status line for visual delight (ANSI colors, emoji, and/or bold formatting).
- Preserve the `· <activeTeamName>` suffix — the active team name from teams.yaml.
- Add `setStatus` refresh calls at key update points: on `agent_end` / `message_end`, after dispatch Promise resolution, and on team switch.
- The status key remains `"spec-team"` for alphabetical positioning among other extension statuses.

## Capabilities

### New Capabilities

None. This change does not introduce new capabilities — it changes how an existing capability (footer metrics display) is rendered.

### Modified Capabilities

- `spec-teams-footer-metrics`: The `Footer renders single-line metrics with team name` requirement changes. Instead of rendering in a standalone footer via `setFooter`, the metrics SHALL be published via `setStatus` onto the default footer's extension statuses line. All aggregate computation (dispatcher + subagent totals, context percentage, model short-name) remains identical. The status line format changes to include a styled prefix. The "single line" constraint remains, but the rendering responsibility shifts from a custom footer component to the default footer's status line renderer.

## Impact

- Affected code: `extensions/spec-teams.ts` — the `session_start` handler (lines ~1344–1407), the team switch handler (line ~997), and any dispatch-completion hooks.
- Affected dependency: `@earendil-works/pi-tui` — the `setStatus` API is already available and used; no changes needed.
- No API changes to the spec-teams extension's public interface.
- No changes to `formatMetricsFooter()`, `truncateToWidth()`, or aggregate computation logic — only the display mechanism changes.
