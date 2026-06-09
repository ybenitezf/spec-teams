## MODIFIED Requirements

### Requirement: Relay protocol status signals are visually highlighted

The `renderResult` function SHALL detect status signal lines in the agent output and render them with visual emphasis (colored and bold) to distinguish them from normal output text. This applies to both OpenSpec relay protocol signals (`need-input`, `ready-to-propose`, `done-exploring`) and the worker agent's execution signals (`done`, `blocked`).

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

#### Scenario: done signal detected and highlighted
- **WHEN** the agent output contains a line matching `Status: done`
- **THEN** that line is rendered with success-colored emphasis (`theme.fg("success", theme.bold(...))`)

#### Scenario: No signal present in output
- **WHEN** the agent output does not contain any status signal line
- **THEN** all output text is rendered with normal (muted) styling
- **AND** no signal highlighting is applied

#### Scenario: Signal in partial streaming output
- **WHEN** `options.isPartial` is true
- **AND** the streaming output text contains a status signal line
- **THEN** the signal line is highlighted with visual emphasis in the partial view

#### Scenario: Signal detection is case-sensitive
- **WHEN** the output contains `status: done` (lowercase) or `STATUS: DONE`
- **THEN** it is NOT highlighted as a signal
- **AND** is treated as normal output text

### Requirement: Signal detection uses regex matching

Signal detection SHALL use a regex pattern anchored to line start that matches known status signal strings: `need-input`, `ready-to-propose`, `blocked`, `done-exploring`, and `done`. The `done` pattern SHALL NOT match `done-exploring` — the longer string SHALL take precedence when both could match.

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

#### Scenario: done does not override done-exploring
- **WHEN** the output contains `Status: done-exploring` on its own line
- **THEN** `detectStatusSignal()` returns `{ signal: "done-exploring", ...}`
- **AND** the signal is NOT misidentified as `done`

#### Scenario: done as standalone signal
- **WHEN** the output contains `Status: done` on its own line
- **THEN** `detectStatusSignal()` returns `{ signal: "done", line: "Status: done" }`
