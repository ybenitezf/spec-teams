## MODIFIED Requirements

### Requirement: Session storage outside repository
The extension SHALL store subagent session files at `~/.pi/spec-teams/<encoded-cwd>/` where `<encoded-cwd>` is an encoded representation of the project's absolute working directory. Session files SHALL NOT be stored inside the project repository directory. This includes both Pi session persistence files and explore→propose findings handoff files. The findings handoff file SHALL be stored at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` and SHALL NOT be stored inside `.pi/spec-sessions/` within the project repository.

#### Scenario: Session directory is outside the project
- **WHEN** the extension initializes in a project at `/home/user/projects/my-app`
- **THEN** subagent sessions are written to `~/.pi/spec-teams/<encoded-cwd>/`
- **AND** no session files are created inside `/home/user/projects/my-app/.pi/spec-sessions/`

#### Scenario: Different projects have isolated sessions
- **WHEN** the extension runs in two different project directories
- **THEN** each project's subagent sessions are stored under distinct encoded-cwd directories
- **AND** a `session_start` event in one project does not affect sessions in the other

#### Scenario: Findings file stored outside repository
- **WHEN** the explore agent writes a findings file for change "add-dark-mode"
- **THEN** the findings file is written to `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md`
- **AND** no findings file is created inside the project repository's `.pi/spec-sessions/` directory

#### Scenario: Findings file deleted after consumption
- **WHEN** the propose agent reads the findings file at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`
- **THEN** the propose agent deletes the file after reading
- **AND** no stale findings files remain in the session directory