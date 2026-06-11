## MODIFIED Requirements

### Requirement: Thinking text is collapsed by default in final result

When the user's `hideThinkingBlock` setting is `true`, thinking text SHALL NOT be displayed in full. Instead, a collapsed hint SHALL be shown after the content section indicating the presence and size of thinking content. The hint SHALL use `theme.fg("thinkingText", ...)` theming. When `hideThinkingBlock` is `false`, thinking segments SHALL be rendered inline, interleaved between text segments in stream order as `Markdown` with `thinkingText` color + italic styling, matching native Pi's treatment of thinking content. No separate post-text thinking block SHALL be rendered — thinking is always displayed inline within the interleaved content section when visible.

#### Scenario: hideThinkingBlock true shows collapsed hint
- **WHEN** `renderResult` is called
- **AND** the user's `hideThinkingBlock` setting is true
- **AND** `orderedContent` contains thinking segments totaling 42 lines of content
- **THEN** an inline dimmed hint is shown after the content section: `▶ Thinking (42 lines)` using `theme.fg("thinkingText", ...)`
- **AND** the full thinking text is not included in the rendered output (thinking segments are skipped during the interleaved loop)
- **AND** the hint appears between the last content segment and the metrics footer

#### Scenario: No thinking text present
- **WHEN** `renderResult` is called
- **AND** `orderedContent` contains no thinking segments with non-empty content
- **THEN** no thinking hint or block is displayed at all

#### Scenario: hideThinkingBlock false shows thinking interleaved inline
- **WHEN** `renderResult` is called
- **AND** `orderedContent` contains text and thinking segments interleaved
- **AND** the user's `hideThinkingBlock` setting is false
- **THEN** thinking segments are rendered as `Markdown` with `{color: theme.fg("thinkingText", ...), italic: true}` styling, interleaved between text segments in stream order
- **AND** blank line separators are inserted between text→thinking and thinking→text transitions
- **AND** markdown formatting within thinking (code spans, bold, lists) is parsed and displayed correctly
- **AND** no separate post-text thinking block is rendered below the content section
- **AND** thinking segments are rendered regardless of `options.expanded` or `isPartial` state

#### Scenario: hideThinkingBlock true never reveals full thinking
- **WHEN** `renderResult` is called
- **AND** `orderedContent` contains thinking segments
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** only the collapsed hint `▶ Thinking (N lines)` is shown
- **AND** the full thinking text is NOT displayed regardless of `options.expanded` or `isPartial` state

#### Scenario: live streaming respects hideThinkingBlock via pushUpdate
- **WHEN** the sub-agent is streaming output via `pushUpdate()`
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** the `pushUpdate()` details payload includes `hideThinkingBlock: true`
- **AND** `renderResult` called with `isPartial: true` sees `shouldHideThinking === true`
- **AND** thinking segments are skipped during the interleaved loop and the collapsed hint is shown

### Requirement: Thinking hint format

The thinking collapsed hint SHALL use the format `▶ Thinking (N lines)` where N is the number of newline-delimited lines across all thinking segments in `orderedContent`. The hint SHALL be styled with `theme.fg("thinkingText", ...)` for Pi-native thinking theming. When `hideThinkingBlock` is true, the hint SHALL still appear to indicate thinking exists, but the full text is never shown.

#### Scenario: Thinking hint for single line
- **WHEN** thinking segments in `orderedContent` collectively contain "Let me analyze this codebase"
- **THEN** the hint reads `▶ Thinking (1 line)`

#### Scenario: Thinking hint for multiple lines
- **WHEN** thinking segments in `orderedContent` collectively contain 15 newline-delimited lines
- **THEN** the hint reads `▶ Thinking (15 lines)`

#### Scenario: Thinking hint for empty segments
- **WHEN** all thinking segments in `orderedContent` have empty content
- **THEN** no thinking hint or block is shown

### Requirement: Thinking renders as Markdown with Pi-native theming

Thinking blocks SHALL be rendered inline between text segments using the `Markdown` component with `thinkingText` color + italic styling, matching native Pi's `AssistantMessageComponent`. Thinking SHALL NOT be rendered in a separate labeled section. When `hideThinkingBlock` is true, a collapsed `▶ Thinking (N lines)` hint SHALL be shown instead, using `Text` with `theme.fg("thinkingText", ...)`.

#### Scenario: Thinking rendered as Markdown with code spans
- **WHEN** `renderResult` renders thinking as full text
- **AND** a thinking segment contains "Check `auth.ts` for **critical** issues:\n- Token expiry\n- Session cleanup"
- **THEN** the thinking segment is rendered as `Markdown` with `{color: theme.fg("thinkingText", ...), italic: true}`
- **AND** `auth.ts` is rendered with code span formatting
- **AND** "critical" is rendered in bold
- **AND** list items are rendered with bullet formatting
- **AND** the thinking segment appears interleaved between text segments in stream order

#### Scenario: Thinking uses thinkingText theme with italic
- **WHEN** `renderResult` renders thinking text
- **THEN** the text is rendered via `Markdown` with `{color: (text) => theme.fg("thinkingText", text), italic: true}`
- **AND** plain thinking text (no markdown) renders identically in appearance to the old `Text`-based rendering (no visual regression for simple thinking)

### Requirement: Thinking respects hideThinkingBlock user setting

The `hideThinkingBlock` user setting (from Pi settings, default `false`) SHALL be the sole control for whether full thinking text is displayed. When `true`, only the collapsed hint `▶ Thinking (N lines)` SHALL be shown. When `false`, full thinking segments SHALL be rendered as `Markdown` with `thinkingText` color + italic styling in all states (streaming and final), interleaved between text segments, without any dependency on `options.expanded` or `isPartial` state.

#### Scenario: hideThinkingBlock true suppresses full thinking
- **WHEN** `hideThinkingBlock` is true
- **THEN** only `▶ Thinking (N lines)` is shown, styled with `theme.fg("thinkingText", ...)`
- **AND** the full thinking Markdown is never rendered, regardless of `options.expanded` or `isPartial` state

#### Scenario: hideThinkingBlock false shows expanded thinking as Markdown in all states
- **WHEN** `hideThinkingBlock` is false (default)
- **THEN** full thinking segments are displayed as `Markdown` with thinkingText color + italic, interleaved between text segments, regardless of `options.expanded` or `isPartial` state
