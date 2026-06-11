## MODIFIED Requirements

### Requirement: Thinking text is collapsed by default in final result

When `renderResult` is called with `options.expanded === false` (the default collapsed state), thinking text SHALL NOT be displayed in full. Instead, a collapsed hint SHALL be shown inline between output paragraphs indicating the presence and size of thinking content. The hint SHALL use `theme.fg("thinkingText", ...)` theming when present.

#### Scenario: Collapsed final result hides thinking text
- **WHEN** `renderResult` is called for a final result (`options.isPartial` is false)
- **AND** `options.expanded` is false
- **AND** `details.thinkingText` is non-empty with 42 lines of content
- **THEN** an inline dimmed hint is shown: `▶ Thinking (42 lines)` using `theme.fg("thinkingText", ...)` 
- **AND** the full thinking text is not included in the rendered output
- **AND** the hint appears inline between the output Markdown and the metrics footer

#### Scenario: Collapsed final result with no thinking
- **WHEN** `renderResult` is called for a final result
- **AND** `options.expanded` is false
- **AND** `details.thinkingText` is empty or undefined
- **THEN** no thinking hint or block is displayed at all

#### Scenario: Expanded final result shows full thinking inline
- **WHEN** `renderResult` is called for a final result
- **AND** `options.expanded` is true
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is false
- **THEN** the full thinking text is displayed inline between output and metrics
- **AND** thinking text is styled with `theme.fg("thinkingText", ...)` to distinguish it from output
- **AND** no "─── Thinking ───" section divider is present

#### Scenario: Expanded final result with hideThinkingBlock true
- **WHEN** `renderResult` is called for a final result
- **AND** `options.expanded` is true
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** only the collapsed hint `▶ Thinking (N lines)` is shown
- **AND** the full thinking text is NOT displayed even in expanded mode

### Requirement: Thinking text is always collapsed in partial (streaming) view

During streaming (`options.isPartial === true`), thinking text SHALL always be shown as a collapsed hint regardless of `options.expanded` state. The hint SHALL be rendered inline between the streaming output and metrics footer. This prevents walls of rapidly-changing dimmed text from obscuring the streaming output.

#### Scenario: Partial view with thinking content inline
- **WHEN** `options.isPartial` is true
- **AND** `details.thinkingText` contains accumulated thinking lines
- **THEN** thinking is shown as `▶ Thinking (N lines)` hint rendered inline with `theme.fg("thinkingText", ...)`
- **AND** full thinking text is not displayed even if `options.expanded` is true
- **AND** the hint appears between the output Markdown and the metrics footer

#### Scenario: Partial view thinking hint updates with line count
- **WHEN** `options.isPartial` is true
- **AND** thinking lines accumulate from 5 to 20 lines between render calls
- **THEN** the hint updates from `▶ Thinking (5 lines)` to `▶ Thinking (20 lines)`

### Requirement: Thinking hint format

The thinking collapsed hint SHALL use the format `▶ Thinking (N lines)` where N is the number of newline-delimited lines in the thinking text. The hint SHALL be styled with `theme.fg("thinkingText", ...)` for Pi-native thinking theming. When `hideThinkingBlock` is true, the hint SHALL still appear to indicate thinking exists, but the full text is never shown.

#### Scenario: Thinking hint for single line
- **WHEN** thinking text contains "Let me analyze this codebase"
- **THEN** the hint reads `▶ Thinking (1 line)`

#### Scenario: Thinking hint for multiple lines
- **WHEN** thinking text contains 15 newline-delimited lines
- **THEN** the hint reads `▶ Thinking (15 lines)`

#### Scenario: Thinking hint for empty single-line text
- **WHEN** thinking text is an empty string
- **THEN** no thinking hint or block is shown

## ADDED Requirements

### Requirement: Thinking renders inline with Pi-native theming

Thinking blocks SHALL be rendered inline between the output Markdown and the metrics footer using `theme.fg("thinkingText", ...)` for consistent Pi-native styling. Thinking SHALL NOT be rendered in a separate labeled section. When rendered as full text (expanded, `hideThinkingBlock` false), thinking text SHALL use dimmed theming to visually distinguish it from the output.

#### Scenario: Thinking inline between output and metrics
- **WHEN** `renderResult` renders thinking as full text
- **THEN** the thinking block appears between the output `Markdown` component and the metrics footer `Text`
- **AND** a thin visual delimiter or spacer separates thinking from output and metrics

#### Scenario: Thinking uses thinkingText theme
- **WHEN** `renderResult` renders thinking text
- **THEN** the text is wrapped with `theme.fg("thinkingText", ...)` for the collapsed hint
- **AND** full thinking text uses dimmed styling consistent with Pi's native thinking display

### Requirement: Thinking respects hideThinkingBlock user setting

The `hideThinkingBlock` user setting (from Pi settings, default `false`) SHALL control whether full thinking text is ever displayed. When `true`, even in expanded mode, only the collapsed hint `▶ Thinking (N lines)` SHALL be shown.

#### Scenario: hideThinkingBlock true suppresses full thinking
- **WHEN** `hideThinkingBlock` is true
- **AND** `options.expanded` is true
- **THEN** only `▶ Thinking (N lines)` is shown, styled with `theme.fg("thinkingText", ...)`
- **AND** the full thinking text is never revealed

#### Scenario: hideThinkingBlock false allows expanded thinking
- **WHEN** `hideThinkingBlock` is false (default)
- **AND** `options.expanded` is true
- **THEN** full thinking text is displayed inline with dimmed theming
