## MODIFIED Requirements

### Requirement: truncation marker for collapsed final output

When `options.expanded` is false, text content SHALL be truncated to 4000 cumulative characters across interleaved text segments, with a `\n... [truncated]` marker appended to the last rendered text segment. Thinking segments SHALL NOT count toward the 4000-character limit. When a text segment would exceed the remaining character allowance, it SHALL be sliced to fit and no further segments (text or thinking) SHALL be rendered. When `options.expanded` is true, the full untruncated interleaved output SHALL be shown.

#### Scenario: Collapsed text exceeds 4000 characters across interleaved segments
- **WHEN** `options.expanded` is false
- **AND** `orderedContent` contains two text segments of 2500 characters each, with a thinking segment between them
- **THEN** the first text segment (2500 chars) is rendered via Markdown
- **AND** the thinking segment is rendered via Markdown with thinkingText color + italic (not counted toward limit)
- **AND** the second text segment is truncated to 1500 characters (4000 - 2500 remaning)
- **AND** `\n... [truncated]` is appended to the truncated second segment
- **AND** no further segments after the truncation point are rendered

#### Scenario: Collapsed text under 4000 characters shows full interleaved content
- **WHEN** `options.expanded` is false
- **AND** cumulative text characters across all segments total 3000
- **THEN** all text and thinking segments are rendered interleaved in stream order
- **AND** no truncation marker is appended
- **AND** the output is structurally identical to the live/expanded rendering (same segment order, same spacers)

#### Scenario: Truncation occurs mid-segment in a text block
- **WHEN** `options.expanded` is false
- **AND** the first text segment contains 4200 characters
- **THEN** the segment is rendered as Markdown with only the first 4000 characters
- **AND** `\n... [truncated]` is appended
- **AND** no subsequent segments (text or thinking) are rendered

#### Scenario: Only thinking segments after truncation cutoff
- **WHEN** `options.expanded` is false
- **AND** the last text segment reaches the 4000-char limit, causing truncation
- **AND** a thinking segment follows the truncated text segment
- **THEN** the thinking segment is NOT rendered (no orphan thinking after text truncation)

#### Scenario: Expanded output shows full untruncated content
- **WHEN** `options.expanded` is true
- **THEN** the full interleaved content is rendered without truncation
- **AND** all text and thinking segments are displayed in stream order regardless of character count
