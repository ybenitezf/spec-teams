## ADDED Requirements

### Requirement: Relay protocol status signals are visually highlighted

The `renderResult` function SHALL detect relay protocol status signal lines in the agent output and render them with visual emphasis (colored and bold) to distinguish them from normal output text.

#### Scenario: need-input signal detected and highlighted
- **WHEN** the agent output contains a line matching `Status: need-input` (case-sensitive, at line start)
- **THEN** that line is rendered with `theme.fg("warning", theme.bold(...))` or equivalent visual emphasis
- **AND** the rest of the output is rendered normally

#### Scenario: ready-to-propose signal detected and highlighted
- **WHEN** the agent output contains a line matching `Status: ready-to-propose`
- **THEN** that line is rendered with success-colored emphasis (`theme.fg("success", theme.bold(...))`)

#### Scenario: blocked signal detected and highlighted
- **WHEN** the agent output contains a line matching `Status: blocked`
- **THEN** that line is rendered with error-colored emphasis (`theme.fg("error", theme.bold(...))`)

#### Scenario: done-exploring signal detected and highlighted
- **WHEN** the agent output contains a line matching `Status: done-exploring`
- **THEN** that line is rendered with success-colored emphasis

#### Scenario: No signal present in output
- **WHEN** the agent output does not contain any relay protocol signal line
- **THEN** all output text is rendered with normal (muted) styling
- **AND** no signal highlighting is applied

#### Scenario: Signal in partial streaming output
- **WHEN** `options.isPartial` is true
- **AND** the streaming output text contains a status signal line
- **THEN** the signal line is highlighted with visual emphasis in the partial view

#### Scenario: Signal detection is case-sensitive
- **WHEN** the output contains `status: need-input` (lowercase) or `STATUS: NEED-INPUT`
- **THEN** it is NOT highlighted as a signal
- **AND** is treated as normal output text

### Requirement: Signal detection uses regex matching

Signal detection SHALL use a regex pattern anchored to line start that matches the known relay protocol signal strings: `need-input`, `ready-to-propose`, `blocked`, `done-exploring`.

#### Scenario: Signal on its own line
- **WHEN** the output contains `Status: blocked` as a standalone line
- **THEN** the regex matches and the line is highlighted

#### Scenario: Signal as part of a larger block
- **WHEN** the output ends with a block like:
  ```
  Status: need-input
  
  The explore agent needs clarification on...
  ```
- **THEN** the `Status: need-input` line is highlighted
- **AND** subsequent lines are rendered normally

#### Scenario: Signal embedded mid-paragraph
- **WHEN** the output contains `Here is the Status: blocked signal` as part of a sentence
- **THEN** it is NOT highlighted (regex requires line start anchor)

### Requirement: Signal highlighting does not alter output text

Signal highlighting SHALL only add visual styling to the detected lines; it SHALL NOT modify, remove, or restructure the output text content. The original text must remain intact.

#### Scenario: Highlighted text preserves original content
- **WHEN** `Status: need-input` is detected and highlighted
- **THEN** the text content "Status: need-input" is preserved exactly
- **AND** only the theme styling is changed
