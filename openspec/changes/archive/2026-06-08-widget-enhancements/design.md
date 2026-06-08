## Context

The spec-teams extension dispatches subagents (explore, propose, apply, verify, archive) via the `dispatch_agent` tool. Each dispatch creates a TUI widget that streams live progress during execution. After completion, the widget collapses to a one-line header showing only status icon, agent name, and elapsed time in raw seconds.

The widget rendering is handled in `extensions/spec-teams.ts` by the `renderResult()` function, which receives a `details` object containing `task` (input prompt), `fullOutput` (complete output), `elapsed` (milliseconds), `status`, and `agent` fields. All data needed for enhanced display is already collected — the task and fullOutput are populated but hidden in the completed state.

Time is currently displayed at 4 locations using `Math.round(ms / 1000) + "s"` pattern, resulting in raw seconds like "106s" instead of human-readable "1m 46s".

## Goals / Non-Goals

**Goals:**
- Make elapsed time human-readable across all display locations (notification, tool result, widget headers)
- Show the input task and final output in the completed widget state without requiring expansion
- Maintain backward compatibility with expansion behavior (Ctrl+O shows full untruncated output)
- Keep all changes localized to the widget rendering layer

**Non-Goals:**
- Modify the dispatcher logic or what it receives
- Change event streaming or tool API
- Add new data collection — use existing `task` and `fullOutput` fields
- Modify the dashboard widget (top-of-terminal summary)

## Decisions

### Decision 1: formatDuration() helper function

**Choice:** Create a standalone `formatDuration(ms: number): string` function that formats milliseconds as "45s", "2m 30s", or "1h 15m", omitting zero-value components.

**Rationale:**
- Simple, self-contained, no external dependencies needed
- Omitting zero values produces natural, concise output (e.g., "1h 15m" not "1h 15m 0s")
- Placed near the top of spec-teams.ts (after line 70) as a utility function
- Replaces 4 occurrences of `Math.round(ms / 1000) + "s"` pattern

**Alternatives considered:**
- Use an existing library: No suitable time formatting library found in the pi ecosystem
- Always show all units ("0h 0m 45s"): Rejected — wasteful for short durations, less readable

### Decision 2: Show task and output in completed state

**Choice:** Modify `renderResult()` to always display `details.task` and `details.fullOutput` after completion, truncated to 4000 chars in normal mode, full when expanded (Ctrl+O).

**Rationale:**
- Users need visibility into what was asked and what was returned without expanding every widget
- The task provides context for understanding the output
- 4000-char truncation matches the existing expanded-view behavior, so no new magic number
- `details.task` and `details.fullOutput` are already populated — no new data collection needed
- Task shown in full (typically short enough); output truncated for readability

**Alternatives considered:**
- Show task and output only when expanded: Rejected — defeats the purpose, user wants to see this without expanding
- Show only output, not task: Rejected — loses context, user doesn't know what was asked
- Truncate task: Rejected — tasks are typically short, truncation adds complexity without benefit

### Decision 3: Output truncation strategy

**Choice:** Truncate `fullOutput` to 4000 characters in normal mode, show full output when expanded. Add "\n... [truncated]" marker when truncation occurs.

**Rationale:**
- 4000 chars is a reasonable default that shows most output while keeping widget manageable
- Matches existing expanded-view truncation behavior, so consistent with current design
- Truncation marker makes it clear when output was cut off
- Expansion behavior (Ctrl+O) remains unchanged — shows full untruncated output

### Decision 4: Replacement sites for time formatting

**Choice:** Replace all 4 occurrences of raw seconds display with `formatDuration()`:
1. Line 476: Notification message
2. Line 534: Tool result summary
3. Line 577: Widget header during execution
4. Lines 612-614: Widget header after completion

**Rationale:**
- Consistent time format across all display locations
- Single source of truth for time formatting logic
- Easy to adjust format in the future if needed

## Risks / Trade-offs

**Risk:** Completed widget takes more vertical space due to showing task and output.
→ **Mitigation:** Output truncated to 4000 chars in normal mode. Terminal scrolling handles overflow. Users can collapse widgets if needed.

**Risk:** Very long tasks could clutter the display.
→ **Mitigation:** Tasks are typically short (a few sentences). If needed, could truncate to ~2000 chars in the future, but not required now.

**Risk:** Truncation hides important information.
→ **Mitigation:** Truncation marker makes it clear when output was cut. Expansion (Ctrl+O) shows full output. Users can always expand to see everything.

**Risk:** Breaking change to widget appearance.
→ **Mitigation:** No breaking changes to tool API or dispatcher. Only widget display changes. Users will see more information, not less.

**Risk:** Performance impact from rendering more text.
→ **Mitigation:** Rendering text is fast. No performance concerns. Terminal handles scrolling efficiently.

## Migration Plan

Not applicable — this is a UI enhancement with no data migration or deployment concerns. Changes are purely presentational in the widget rendering layer.

## Open Questions

None — all design decisions are clear from exploration findings.
