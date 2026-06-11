## REMOVED Requirements

### Requirement: Thinking text is always collapsed in partial (streaming) view

**Reason**: Native Pi has no `isPartial` concept for thinking visibility — `AssistantMessageComponent` renders thinking inline during streaming when `hideThinkingBlock` is false. Suppressing thinking during streaming is unnecessary friction inconsistent with native behavior.

**Migration**: The `showFull` condition no longer includes `!isPartial`. When `hideThinkingBlock` is false, full thinking text is shown in both streaming and final states. When `hideThinkingBlock` is true, the collapsed hint is shown in both states.

## MODIFIED Requirements

### Requirement: Thinking text is collapsed by default in final result

When the user's `hideThinkingBlock` setting is `true`, thinking text SHALL NOT be displayed in full. Instead, a collapsed hint SHALL be shown inline between output paragraphs indicating the presence and size of thinking content. The hint SHALL use `theme.fg("thinkingText", ...)` theming when present. When `hideThinkingBlock` is `false`, full thinking text SHALL be displayed regardless of `options.expanded` or `isPartial` state.

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

#### Scenario: hideThinkingBlock false shows full thinking inline
- **WHEN** `renderResult` is called
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is false
- **THEN** the full thinking text is displayed inline between output and metrics, regardless of `options.expanded` or `isPartial` state
- **AND** thinking text is styled with `theme.fg("thinkingText", ...)` to distinguish it from output
- **AND** no "─── Thinking ───" section divider is present

#### Scenario: hideThinkingBlock true never reveals full thinking
- **WHEN** `renderResult` is called
- **AND** `details.thinkingText` is non-empty
- **AND** the user's `hideThinkingBlock` setting is true
- **THEN** only the collapsed hint `▶ Thinking (N lines)` is shown
- **AND** the full thinking text is NOT displayed regardless of `options.expanded` or `isPartial` state

### Requirement: Thinking respects hideThinkingBlock user setting

The `hideThinkingBlock` user setting (from Pi settings, default `false`) SHALL be the sole control for whether full thinking text is displayed. When `true`, only the collapsed hint `▶ Thinking (N lines)` SHALL be shown. When `false`, full thinking text SHALL be displayed inline in all states (streaming and final), without any dependency on `options.expanded` or `isPartial`.

#### Scenario: hideThinkingBlock true suppresses full thinking
- **WHEN** `hideThinkingBlock` is true
- **THEN** only `▶ Thinking (N lines)` is shown, styled with `theme.fg("thinkingText", ...)`
- **AND** the full thinking text is never revealed, regardless of `options.expanded` or `isPartial` state

#### Scenario: hideThinkingBlock false shows expanded thinking in all states
- **WHEN** `hideThinkingBlock` is false (default)
- **THEN** full thinking text is displayed inline with dimmed theming, regardless of `options.expanded` or `isPartial` state
