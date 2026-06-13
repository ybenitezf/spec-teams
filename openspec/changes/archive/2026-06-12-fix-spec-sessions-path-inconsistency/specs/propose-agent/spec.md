## MODIFIED Requirements

### Requirement: Consumes exploration findings
The propose agent SHALL check for exploration findings at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` (where `<encoded-cwd>` is the `encodeCwd(cwd)` representation of the project's absolute working directory) before creating artifacts. If the file exists, the agent SHALL read it to gain full exploration context (alternatives considered, constraints discovered, edge cases, user motivations). The agent SHALL delete the findings file after reading it.

#### Scenario: Findings file exists — consumed for context
- **WHEN** dispatched with change name "add-dark-mode"
- **AND** `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` exists
- **THEN** the propose agent reads the findings file
- **AND** the propose agent uses the findings to inform proposal.md, design.md, and tasks.md
- **AND** the propose agent deletes `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` after reading

#### Scenario: Findings file absent — proceeds normally
- **WHEN** dispatched with a change name
- **AND** no findings file exists at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`
- **THEN** the propose agent proceeds with only the structured brief from the task string
- **AND** no error or warning is raised

#### Scenario: Findings file provides deeper context than brief
- **WHEN** the findings file documents rejected alternatives and edge cases
- **THEN** the propose agent includes tradeoff analysis in design.md
- **AND** the propose agent includes edge case handling in tasks.md
- **AND** the propose agent does NOT re-investigate decisions already recorded in findings