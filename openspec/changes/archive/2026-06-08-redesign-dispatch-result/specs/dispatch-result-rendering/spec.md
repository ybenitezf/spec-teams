## ADDED Requirements

### Requirement: renderResult uses Container-based layout with section dividers

The `renderResult` function SHALL render sub-agent results using a `Container` component with structured child components instead of a flat `Text` with newline-joined strings. The layout SHALL include distinct sections separated by `Spacer` and labeled with themed `─── Section Name ───` dividers.

#### Scenario: Single-agent final result with all sections
- **WHEN** `renderResult` is called with a done result containing task, output, thinking, and metrics
- **AND** `options.expanded` is true
- **THEN** the rendered output is a `Container` containing in order:
  - A header `Text` with status icon, agent name, and elapsed time
  - A `Spacer`
  - A divider `Text` reading `─── Task ───` (themed muted)
  - A `Text` with the task text (themed dim)
  - A `Spacer`
  - A divider `Text` reading `─── Output ───` (themed muted)
  - A `Markdown` component rendering the output text
  - If thinking text is present, a `Spacer`, a divider `Text` reading `─── Thinking ───`, and a `Text` with thinking content
  - A `Spacer`
  - A metrics footer `Text` with tool count, token counts, cost, and context%

#### Scenario: Final result with empty task or output omitted
- **WHEN** `renderResult` is called with a result where `details.task` is empty or undefined
- **THEN** the Task section (divider + task text) is not included in the Container
- **AND** when `details.fullOutput` is empty or undefined
- **THEN** the Output section (divider + Markdown) is not included

#### Scenario: Container is used for both partial and final views
- **WHEN** `renderResult` is called with `options.isPartial === true`
- **THEN** the result SHALL still use a `Container` layout with section structure

### Requirement: Output text is rendered through Markdown component

The agent output text SHALL be rendered through the `Markdown` component from `@earendil-works/pi-tui`, configured with `getMarkdownTheme()` from `@earendil-works/pi-coding-agent`. This enables syntax highlighting for code blocks and rich formatting for structured text.

#### Scenario: Output with code blocks
- **WHEN** the agent output contains fenced code blocks (e.g., ```typescript ... ```)
- **THEN** the code blocks are rendered with syntax highlighting via the Markdown component

#### Scenario: Output with lists and formatting
- **WHEN** the agent output contains Markdown formatting (lists, bold, italic, headers)
- **THEN** the formatting is rendered correctly by the Markdown component

#### Scenario: Plain text output
- **WHEN** the agent output contains no special Markdown syntax
- **THEN** the text is rendered as-is by the Markdown component without errors

### Requirement: renderCall shows agent name, model, and task preview

The `renderCall` function SHALL display the agent name, optional model information, and a truncated task preview using themed formatting consistent with the subagent example pattern.

#### Scenario: renderCall with model available
- **WHEN** `renderCall` is called with args containing `agent: "explore"` and `task: "Investigate the codebase..."`
- **AND** model information is available in the agent definition
- **THEN** the rendered text includes `dispatch_agent` (bold, themed toolTitle), the agent name (themed accent), model in parentheses if available, and a truncated task preview (themed dim)

#### Scenario: renderCall with task exceeding 60 characters
- **WHEN** the task string exceeds 60 characters
- **THEN** the displayed task preview is truncated to 57 characters followed by `...`

### Requirement: truncation marker for collapsed final output

When `options.expanded` is false, output text SHALL be truncated to 4000 characters with a `... [truncated]` marker appended. When `options.expanded` is true, the full untruncated output SHALL be shown through the Markdown component.

#### Scenario: Collapsed output exceeds 4000 characters
- **WHEN** `options.expanded` is false
- **AND** `details.fullOutput` exceeds 4000 characters
- **THEN** the rendered output is truncated to 4000 characters with `... [truncated]` appended
- **AND** the truncated text is passed to the Markdown component

#### Scenario: Expanded output shows full content
- **WHEN** `options.expanded` is true
- **THEN** the full `details.fullOutput` text is passed to the Markdown component without truncation

### Requirement: Expanded mode includes all sections

When `options.expanded` is true, the rendered result SHALL include all available sections: header, task, output, thinking, and metrics footer. No information is omitted in expanded mode.

#### Scenario: Expanded result shows thinking and full output
- **WHEN** `options.expanded` is true
- **AND** thinking text is present in the result details
- **THEN** the full thinking text is displayed in the Thinking section
- **AND** the full untruncated output is displayed through Markdown

### Requirement: Partial streaming result uses Container layout

When `options.isPartial` is true, `renderResult` SHALL render a Container with streaming-compatible sections: header (agent icon, name, elapsed), task section, live output section, live thinking section (collapsed hint), and a metrics status line.

#### Scenario: Partial render with streaming output
- **WHEN** `options.isPartial` is true
- **AND** `details.outputText` contains streaming text
- **THEN** the Output section shows the live text (as `Text`, not `Markdown`, since streaming text may be incomplete)
- **AND** a metrics line shows current tool count, context%, and any accumulated token counts

#### Scenario: Partial render with thinking content
- **WHEN** `options.isPartial` is true
- **AND** `details.thinkingText` is non-empty
- **THEN** thinking content is shown as collapsed (dimmed hint), not expanded
- **AND** the hint shows `▶ Thinking (N lines)` where N is the line count of accumulated thinking text

#### Scenario: Partial render before any output
- **WHEN** `options.isPartial` is true
- **AND** `details.outputText` is empty
- **THEN** the Task section displays the complete task prompt
- **AND** the Output section is not displayed
