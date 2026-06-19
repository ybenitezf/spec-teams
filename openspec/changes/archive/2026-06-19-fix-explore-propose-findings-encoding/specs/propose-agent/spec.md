## MODIFIED Requirements

### Requirement: Consumes exploration findings
The propose agent SHALL check for exploration findings at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` where `<encoded-cwd>` is the value provided by the extension in the task string. If the file exists, the agent SHALL read it to gain full exploration context (alternatives considered, constraints discovered, edge cases, user motivations). The agent SHALL delete the findings file after reading it.

#### Scenario: Findings file exists — consumed for context
- **WHEN** dispatched with change name "add-dark-mode"
- **AND** the task string contains `encoded-cwd: <value>`
- **AND** `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` exists using the provided `<encoded-cwd>` value
- **THEN** the propose agent reads the findings file
- **AND** the propose agent uses the findings to inform proposal.md, design.md, and tasks.md
- **AND** the propose agent deletes `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` after reading

#### Scenario: Findings file absent — proceeds normally
- **WHEN** dispatched with a change name
- **AND** no findings file exists at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` using the provided `<encoded-cwd>`
- **THEN** the propose agent proceeds with only the structured brief from the task string
- **AND** no error or warning is raised

#### Scenario: Findings file provides deeper context than brief
- **WHEN** the findings file documents rejected alternatives and edge cases
- **THEN** the propose agent includes tradeoff analysis in design.md
- **AND** the propose agent includes edge case handling in tasks.md
- **AND** the propose agent does NOT re-investigate decisions already recorded in findings

#### Scenario: Agent extracts encoded-cwd from task string
- **WHEN** the propose agent parses its task string
- **THEN** the task string contains `encoded-cwd: <value>` as the first line
- **AND** the agent uses `<value>` as the `<encoded-cwd>` for path construction
- **AND** the agent treats the remainder (after the blank separator line) as the actual task

#### Scenario: Fallback when encoded-cwd not in task string
- **WHEN** the task string does NOT contain an `encoded-cwd:` prefix
- **THEN** the agent SHALL compute `<encoded-cwd>` by: (1) stripping the leading `/` from the project's absolute working directory, (2) replacing `/`, `\`, and `:` with `-`, and (3) wrapping the result in `--...--`
- **AND** the agent proceeds using the computed value
