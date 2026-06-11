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
