# archive-agent Specification

## Purpose

The archive agent finalizes completed OpenSpec changes by syncing delta specs into main specs and moving the change to the archive directory. It is a headless sub-agent that follows the `openspec-archive-change` skill with adaptations for non-interactive execution.

## ADDED Requirements

### Requirement: Agent definition file
The project SHALL contain `agents/archive.md` with valid YAML frontmatter including `name: archive`, a `description` field, `tools`, and `thinking`.

#### Scenario: File exists with frontmatter
- **WHEN** the agent loader scans `agents/`
- **THEN** `agents/archive.md` is parsed successfully
- **AND** the parsed definition has `name: archive`

#### Scenario: Tools are read, write, bash
- **WHEN** the agent definition is parsed
- **THEN** the `tools` field includes `read`, `write`, and `bash`

#### Scenario: Thinking is enabled
- **WHEN** the agent definition is parsed
- **THEN** the `thinking` field is `on`

### Requirement: Follows openspec-archive-change skill
The archive agent SHALL follow the `openspec-archive-change` skill procedure: receive change name, check artifact completion, check task completion, assess delta spec sync state, sync deltas, and move to archive.

#### Scenario: Checks artifact completion
- **WHEN** dispatched with a change name
- **THEN** the agent runs `openspec status --change "<name>" --json`
- **AND** inspects artifact completion status

#### Scenario: Checks task completion
- **WHEN** a tasks.md file exists for the change
- **THEN** the agent reads it and counts checked vs unchecked tasks

#### Scenario: Moves change to archive
- **WHEN** all checks pass
- **THEN** the agent creates `openspec/changes/archive/` if needed
- **AND** moves the change directory to `openspec/changes/archive/YYYY-MM-DD-<name>/`

### Requirement: Always syncs delta specs
The archive agent SHALL always sync delta specs into main specs when delta specs exist. In headless mode, the sync-or-skip question from the skill SHALL be resolved as "always sync."

#### Scenario: Delta specs exist
- **WHEN** the change has delta specs at `openspec/changes/<name>/specs/`
- **THEN** the agent syncs them into the corresponding main specs
- **AND** does NOT prompt for a sync decision

#### Scenario: No delta specs
- **WHEN** the change has no delta specs
- **THEN** the agent proceeds directly to the move step without attempting sync

### Requirement: Blocks on warnings instead of warning-and-proceeding
The archive agent SHALL treat incomplete artifacts and unchecked tasks as blockers, not as warnings to confirm past. It SHALL return `Status: blocked` if either condition is detected.

#### Scenario: Incomplete artifacts
- **WHEN** `openspec status --json` shows any artifact not `done`
- **THEN** the agent returns `Status: blocked` listing the incomplete artifacts

#### Scenario: Unchecked tasks
- **WHEN** `tasks.md` contains any `- [ ]` lines
- **THEN** the agent returns `Status: blocked` listing the unchecked tasks

#### Scenario: Archive target already exists
- **WHEN** the target archive path already exists
- **THEN** the agent returns `Status: blocked` with the conflict description

### Requirement: Structured return format
The archive agent SHALL conclude every response with a structured status block containing at minimum: `Status:` (one of `done` or `blocked`), the change name, archive location, sync status, and a `Summary` section.

#### Scenario: Successful archival
- **WHEN** the change is moved to archive
- **THEN** the agent returns `Status: done` with change name, archive path, and sync status

#### Scenario: Blocked
- **WHEN** any check fails
- **THEN** the agent returns `Status: blocked` with the specific blocking condition and what would unblock it

### Requirement: Receives change name from dispatcher
The archive agent SHALL expect the change name in the task string from the dispatcher. It SHALL NOT prompt for change selection.

#### Scenario: Change name provided
- **WHEN** the task string contains a valid change name
- **THEN** the agent uses it directly

#### Scenario: No change name provided
- **WHEN** the task string does not specify a change name
- **THEN** the agent returns `Status: blocked` indicating the change name is required
