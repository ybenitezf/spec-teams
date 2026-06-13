## MODIFIED Requirements

### Requirement: Multi-turn conversation via session persistence
The explore agent SHALL maintain conversation context across dispatches through Pi's session persistence mechanism (the `--session` and `-c` CLI flags managed by the spec-teams extension). The explore agent SHALL NOT reference, manage, or delete session files directly — session lifecycle is handled entirely by the extension.

#### Scenario: First dispatch starts fresh
- **WHEN** dispatched for the first time with a user message
- **THEN** the agent has no prior session context
- **AND** the agent investigates the codebase and forms an initial response

#### Scenario: Subsequent dispatch resumes conversation
- **WHEN** dispatched again after returning `need-input`
- **THEN** the agent resumes the existing session automatically via the extension's session management
- **AND** the agent has access to the full prior conversation history
- **AND** the agent continues the exploration from where it left off

#### Scenario: Topic mismatch handled by extension
- **WHEN** the incoming user message is unrelated to the prior exploration
- **THEN** the agent detects the mismatch through the task string context
- **AND** the agent treats the dispatch as a fresh exploration
- **AND** the agent does NOT attempt to manage or delete any session file

## REMOVED Requirements

### Requirement: Self-managed session lifecycle
**Reason**: Session file management was migrated to the spec-teams extension in the `fix-subagent-response-handling` change. The extension handles session continuity via Pi's `--session` and `-c` flags. The explore agent no longer needs to manage or delete session files — this responsibility belongs to the extension, not the agent.

**Migration**: The explore agent prompt no longer contains instructions to delete `.pi/spec-sessions/explore.json`. Session lifecycle is handled by the extension transparently. No agent-level code changes are needed.

## ADDED Requirements

### Requirement: Findings file stored outside repository
The explore agent SHALL write exploration findings to `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` where `<encoded-cwd>` is the `encodeCwd(cwd)` representation of the project's absolute working directory. The findings file SHALL NOT be written inside the project repository's `.pi/spec-sessions/` directory.

#### Scenario: Findings file written to out-of-repo location
- **WHEN** the explore agent is ready to hand off to the propose agent
- **THEN** the findings file is written to `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md`
- **AND** the propose agent can locate and read the file at that path

#### Scenario: No files written inside .pi/spec-sessions/
- **WHEN** the explore agent writes its findings file
- **THEN** no file is created at `.pi/spec-sessions/explore-<change-name>.md`
- **AND** no file is created at `.pi/spec-sessions/explore.json`

### Requirement: Findings file contents
The findings file at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` SHALL document the exploration context: problem space understanding, existing architecture relevant to the change, alternatives considered with reasons for rejection, constraints discovered during investigation, edge cases and gotchas, and user motivations gathered from the conversation.

#### Scenario: Complete context for propose
- **WHEN** the propose agent reads the findings file
- **THEN** the propose agent has sufficient context to create informed proposal.md, design.md, and tasks.md without re-investigating