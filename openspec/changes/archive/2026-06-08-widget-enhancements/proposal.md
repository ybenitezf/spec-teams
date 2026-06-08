## Why

The subagent widget collapses to a one-line header (e.g., "✓ explore 106s") after completion, hiding both the input task and the final output. Users must expand with Ctrl+O to see what happened. Additionally, elapsed time is displayed in raw seconds (e.g., "106s") instead of a human-readable format (e.g., "1m 46s"). These issues reduce visibility and readability for a core part of the spec-teams workflow.

## What Changes

- Add a `formatDuration()` helper that formats millisecond durations as human-readable strings (e.g., "45s", "2m 30s", "1h 15m"), omitting zero-value components.
- Replace all 4 occurrences of raw seconds display (`Math.round(ms / 1000) + "s"`) with calls to `formatDuration()`.
- Modify the completed-state `renderResult()` to always show the input task and the full output (truncated to 4000 chars in normal mode, full when expanded via Ctrl+O), replacing the current header-only display.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `live-subagent-streaming`: The "Final renderResult behavior is unchanged" requirement is replaced — after completion, the widget SHALL show the task and output (truncated to 4000 chars in normal mode, full when expanded). The elapsed time format changes from raw seconds to human-readable duration across all display locations (notification, tool result, live header, completion header).

## Impact

- **File modified**: `extensions/spec-teams.ts` (only file)
- **API compatibility**: No breaking changes — the tool API and what the dispatcher receives remain identical.
- **Data**: `details.task` and `details.fullOutput` are already populated in the result object; no new data collection is needed.
- **Dependencies**: No new dependencies. The `formatDuration()` helper is self-contained.
