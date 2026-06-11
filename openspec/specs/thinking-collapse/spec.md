## MODIFIED Requirements

### Requirement: Thinking text is collapsed by default in final result

When the user's `hideThinkingBlock` setting is `true`, thinking text SHALL NOT be displayed in full. Instead, a collapsed hint SHALL be shown inline between output paragraphs indicating the presence and size of thinking content. The hint SHALL use `theme.fg("thinkingText", ...)` theming when present. When `hideThinkingBlock` is `false`, full thinking text SHALL be rendered as `Markdown` with `thinkingText` color + italic styling, matching native Pi's treatment of thinking content.

#### Scenario: hideThinkingBlock true shows collapsed hint
- **WHEN** `renderResult` is called
- **AND** the user's `hideThinkingBlock` setting is true
- **AND** `details.thinkingText` is non-empty with 42 lines of content
- **THEN** an inline dimmed hint is shown: `▶ Thinking (42 lines)` using `theme.fg("thinkingText", ...)`
- **AND** the full thinking text is not included in the rendered output
- **AND** the hint appears inline between the output Markdown and the metrics footer

#### Scenario: No thinking text present
- **WHEN** `renderResult` is called
- **AND** `details.thinkingText` is empty or undefined
- **THEN** no thinking hint or block is displayed at all

#### Scenario: hideThinkingBlock false shows full thinking as Markdown
- **WHEN** `renderResult` is called
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is false
- **THEN** the full thinking text is displayed inline between output and metrics, regardless of `options.expanded` or `isPartial` state
- **AND** thinking text is rendered as `Markdown` with `{color: theme.fg("thinkingText", ...), italic: true}` styling
- **AND** markdown formatting within thinking (code spans, bold, lists) is parsed and displayed correctly
- **AND** no "─── Thinking ───" section divider is present

#### Scenario: hideThinkingBlock true never reveals full thinking
- **WHEN** `renderResult` is called
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** only the collapsed hint `▶ Thinking (N lines)` is shown
- **AND** the full thinking text is NOT displayed regardless of `options.expanded` or `isPartial` state

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

### Requirement: Thinking renders as Markdown with Pi-native theming

Thinking blocks SHALL be rendered inline between output paragraphs using the `Markdown` component with `thinkingText` color + italic styling, matching native Pi's `AssistantMessageComponent`. Thinking SHALL NOT be rendered in a separate labeled section. When `hideThinkingBlock` is true, a collapsed `▶ Thinking (N lines)` hint SHALL be shown instead, using `Text` with `theme.fg("thinkingText", ...)`.

#### Scenario: Thinking rendered as Markdown with code spans
- **WHEN** `renderResult` renders thinking as full text
- **AND** thinking content contains "Check `auth.ts` for **critical** issues:\n- Token expiry\n- Session cleanup"
- **THEN** the thinking block is rendered as `Markdown` with `{color: theme.fg("thinkingText", ...), italic: true}`
- **AND** `auth.ts` is rendered with code span formatting
- **AND** "critical" is rendered in bold
- **AND** list items are rendered with bullet formatting
- **AND** the thinking block appears between the output and the metrics footer

#### Scenario: Thinking uses thinkingText theme with italic
- **WHEN** `renderResult` renders thinking text
- **THEN** the text is rendered via `Markdown` with `{color: (text) => theme.fg("thinkingText", text), italic: true}`
- **AND** plain thinking text (no markdown) renders identically in appearance to the old `Text`-based rendering (no visual regression for simple thinking)

### Requirement: Thinking respects hideThinkingBlock user setting

The `hideThinkingBlock` user setting (from Pi settings, default `false`) SHALL be the sole control for whether full thinking text is displayed. When `true`, only the collapsed hint `▶ Thinking (N lines)` SHALL be shown. When `false`, full thinking text SHALL be rendered as `Markdown` with `thinkingText` color + italic styling in all states (streaming and final), without any dependency on `options.expanded` or `isPartial` state.

#### Scenario: hideThinkingBlock true suppresses full thinking
- **WHEN** `hideThinkingBlock` is true
- **THEN** only `▶ Thinking (N lines)` is shown, styled with `theme.fg("thinkingText", ...)`
- **AND** the full thinking Markdown is never rendered, regardless of `options.expanded` or `isPartial` state

#### Scenario: hideThinkingBlock false shows expanded thinking as Markdown in all states
- **WHEN** `hideThinkingBlock` is false (default)
- **THEN** full thinking text is displayed as `Markdown` with thinkingText color + italic, regardless of `options.expanded` or `isPartial` state
