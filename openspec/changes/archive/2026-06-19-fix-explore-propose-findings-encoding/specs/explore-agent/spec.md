## MODIFIED Requirements

### Requirement: Explore is read-only by default — write only for findings
The explore agent SHALL NOT create OpenSpec artifacts (proposal.md, design.md, tasks.md, specs/). The agent MAY write exploration findings to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` where `<encoded-cwd>` is the value provided by the extension in the task string (prepended as `encoded-cwd: <value>`). The agent SHALL NOT modify existing project files.

#### Scenario: Findings file written
- **WHEN** the agent is ready to propose
- **THEN** the agent extracts `<encoded-cwd>` from the task string prefix `encoded-cwd: <value>`
- **AND** the agent writes findings to `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md`
- **AND** the findings include alternatives considered, constraints discovered, edge cases, and user motivations

#### Scenario: OpenSpec artifacts not created
- **WHEN** the agent completes exploration
- **THEN** no proposal.md, design.md, tasks.md, or spec files are created by the explore agent

#### Scenario: Project files not modified
- **WHEN** the agent investigates the codebase
- **THEN** the agent does NOT modify any existing project source files

#### Scenario: encoded-cwd extraction from task string
- **WHEN** the agent parses its task string
- **THEN** the task string contains `encoded-cwd: <value>` as the first line
- **AND** the agent uses `<value>` as the `<encoded-cwd>` for path construction
- **AND** the agent treats the remainder (after the blank separator line) as the actual task

### Requirement: Findings file stored outside repository
The explore agent SHALL write exploration findings to `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` where `<encoded-cwd>` is the value provided by the extension in the task string. The findings file SHALL NOT be written inside the project repository's `.pi/spec-sessions/` directory.

#### Scenario: Findings file written to out-of-repo location
- **WHEN** the explore agent is ready to hand off to the propose agent
- **THEN** the findings file is written to `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` using the provided `<encoded-cwd>` value
- **AND** the propose agent can locate and read the file at that path

#### Scenario: No files written inside .pi/spec-sessions/
- **WHEN** the explore agent writes its findings file
- **THEN** no file is created at `.pi/spec-sessions/explore-<change-name>.md`
- **AND** no file is created at `.pi/spec-sessions/explore.json`

#### Scenario: Fallback when encoded-cwd not in task string
- **WHEN** the task string does NOT contain an `encoded-cwd:` prefix
- **THEN** the agent SHALL compute `<encoded-cwd>` by: (1) stripping the leading `/` from the project's absolute working directory, (2) replacing `/`, `\`, and `:` with `-`, and (3) wrapping the result in `--...--`
- **AND** the agent proceeds using the computed value
