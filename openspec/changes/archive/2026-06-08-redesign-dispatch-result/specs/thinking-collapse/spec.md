## ADDED Requirements

### Requirement: Thinking text is collapsed by default in final result

When `renderResult` is called with `options.expanded === false` (the default collapsed state), thinking text SHALL NOT be displayed in full. Instead, a collapsed hint SHALL be shown indicating the presence and size of thinking content.

#### Scenario: Collapsed final result hides thinking text
- **WHEN** `renderResult` is called for a final result (`options.isPartial` is false)
- **AND** `options.expanded` is false
- **AND** `details.thinkingText` is non-empty with 42 lines of content
- **THEN** the Thinking section shows a dimmed hint: `▶ Thinking (42 lines)`
- **AND** the full thinking text is not included in the rendered output

#### Scenario: Collapsed final result with no thinking
- **WHEN** `renderResult` is called for a final result
- **AND** `options.expanded` is false
- **AND** `details.thinkingText` is empty or undefined
- **THEN** the Thinking section is not displayed at all
- **AND** no `▶ Thinking` hint is shown

#### Scenario: Expanded final result shows full thinking
- **WHEN** `renderResult` is called for a final result
- **AND** `options.expanded` is true
- **AND** `details.thinkingText` is non-empty
- **THEN** the Thinking section displays the full thinking text
- **AND** thinking text is styled with `theme.fg("dim", ...)` to distinguish it from output

### Requirement: Thinking text is always collapsed in partial (streaming) view

During streaming (`options.isPartial === true`), thinking text SHALL always be shown as a collapsed hint regardless of `options.expanded` state. This prevents walls of rapidly-changing dimmed text from obscuring the streaming output.

#### Scenario: Partial view with thinking content
- **WHEN** `options.isPartial` is true
- **AND** `details.thinkingText` contains accumulated thinking lines
- **THEN** thinking is shown as `▶ Thinking (N lines)` hint
- **AND** full thinking text is not displayed even if `options.expanded` is true

#### Scenario: Partial view thinking hint updates with line count
- **WHEN** `options.isPartial` is true
- **AND** thinking lines accumulate from 5 to 20 lines between render calls
- **THEN** the hint updates from `▶ Thinking (5 lines)` to `▶ Thinking (20 lines)`

### Requirement: Thinking hint format

The thinking collapsed hint SHALL use the format `▶ Thinking (N lines)` where N is the number of newline-delimited lines in the thinking text. The hint SHALL be themed with dim coloring.

#### Scenario: Thinking hint for single line
- **WHEN** thinking text contains "Let me analyze this codebase"
- **THEN** the hint reads `▶ Thinking (1 line)`

#### Scenario: Thinking hint for multiple lines
- **WHEN** thinking text contains 15 newline-delimited lines
- **THEN** the hint reads `▶ Thinking (15 lines)`

#### Scenario: Thinking hint for empty single-line text
- **WHEN** thinking text is an empty string
- **THEN** no thinking hint or section is shown
