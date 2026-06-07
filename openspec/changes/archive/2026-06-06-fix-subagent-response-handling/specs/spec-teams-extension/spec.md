## ADDED Requirements

### Requirement: Subagent response completeness
The `dispatch_agent` tool SHALL pass the complete subagent output to the dispatcher model without truncation. The dispatcher model SHALL receive the full text content of the subagent response so that status signal blocks (e.g., `Status: need-input`, `Status: ready-to-propose`) at the end of the response are always visible.

#### Scenario: Long explore response with status block at end
- **WHEN** an explore agent returns a response exceeding 8000 characters
- **AND** the status block is at the end of the response
- **THEN** the dispatcher model receives the full response including the status block
- **AND** the dispatcher can detect and act on the status signal

#### Scenario: Short response unaffected
- **WHEN** a subagent returns a response under any previous truncation threshold
- **THEN** the dispatcher model receives the complete response unchanged

### Requirement: Session storage outside repository
The extension SHALL store subagent session files at `~/.pi/spec-teams/<encoded-cwd>/` where `<encoded-cwd>` is an encoded representation of the project's absolute working directory. Session files SHALL NOT be stored inside the project repository directory.

#### Scenario: Session directory is outside the project
- **WHEN** the extension initializes in a project at `/home/user/projects/my-app`
- **THEN** subagent sessions are written to `~/.pi/spec-teams/<encoded-cwd>/`
- **AND** no session files are created inside `/home/user/projects/my-app/.pi/spec-sessions/`

#### Scenario: Different projects have isolated sessions
- **WHEN** the extension runs in two different project directories
- **THEN** each project's subagent sessions are stored under distinct encoded-cwd directories
- **AND** a `session_start` event in one project does not affect sessions in the other
