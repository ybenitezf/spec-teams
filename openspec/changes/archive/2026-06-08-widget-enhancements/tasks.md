## 1. Time Formatting Helper

- [x] 1.1 Create `formatDuration(ms: number): string` function in `extensions/spec-teams.ts` after line 70. The function shall format milliseconds as human-readable strings: "45s" for <1min, "2m 30s" for <1hr, "1h 15m" for >=1hr, omitting zero values. Handle 0ms as "0s".

## 2. Replace Raw Seconds Display

- [x] 2.1 Replace `Math.round(state.elapsed / 1000) + "s"` at line 476 (notification message) with `formatDuration(state.elapsed)`
- [x] 2.2 Replace `Math.round(result.elapsed / 1000) + "s"` at line 534 (tool result summary) with `formatDuration(result.elapsed)`
- [x] 2.3 Replace `Math.round(details.elapsed / 1000) + "s"` at line 577 (widget header during execution) with `formatDuration(details.elapsed)`
- [x] 2.4 Replace `Math.round(details.elapsed / 1000) + "s"` at lines 612-614 (widget header after completion) with `formatDuration(details.elapsed)`

## 3. Completed Widget Display Enhancement

- [x] 3.1 Modify `renderResult()` function (lines 607-625) to display the input task after the header. Add `details.task` in dim color, matching the pattern used in execution state (line 576-605). Skip if task is empty/undefined.
- [x] 3.2 Add display of `details.fullOutput` after the task. Truncate to 4000 characters in normal mode. Add "\n... [truncated]" marker when truncation occurs. Show full untruncated output when `options.expanded` is true. Skip if fullOutput is empty/undefined.
- [x] 3.3 Verify expansion behavior (Ctrl+O) shows full untruncated task and output, maintaining backward compatibility with existing expansion functionality.

## 4. Edge Cases and Validation

- [x] 4.1 Test `formatDuration()` with various inputs: 0ms, 30000ms (30s), 90000ms (1m 30s), 120000ms (2m), 3600000ms (1h), 5400000ms (1h 30m), 7200000ms (2h)
- [x] 4.2 Test completed widget with empty task and/or empty fullOutput (should not display those sections)
- [x] 4.3 Test completed widget with fullOutput exceeding 4000 characters (should show truncation marker)
- [x] 4.4 Test completed widget with error status (should show task and output, output may contain error message)
- [x] 4.5 Test expansion (Ctrl+O) with long output (should show full untruncated content)

## 5. Integration Testing

- [x] 5.1 Dispatch an explore agent with a test task and verify the completed widget shows: status icon, agent name, formatted duration, task, and truncated output
- [x] 5.2 Verify notification message displays formatted duration (e.g., "2m 30s" not "150s")
- [x] 5.3 Verify tool result summary displays formatted duration
- [x] 5.4 Verify widget header during execution displays formatted duration
- [x] 5.5 Verify the dispatcher still receives the correct tool result format (no breaking changes to API)
