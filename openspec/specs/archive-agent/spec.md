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

### Requirement: Agent prompt references skill, does not duplicate skill content
The archive agent's system prompt SHALL reference the `openspec-archive-change` skill as the authoritative source for procedural content (archive steps, sync instructions). The agent prompt SHALL instruct the agent to read the skill file via the `read` tool and follow its procedures. The agent prompt SHALL NOT contain inline copies of archive procedure steps that exist in the skill file.

#### Scenario: Skill referenced, not duplicated
- **WHEN** the agent system prompt is read
- **THEN** it contains a reference to the `openspec-archive-change` skill by name
- **AND** it instructs the agent to read the skill via the `read` tool
- **AND** it does NOT contain a full inline archive procedure duplicating the skill

#### Scenario: Agent-specific content retained
- **WHEN** the agent system prompt is read
- **THEN** it contains the role identity and boundary
- **AND** it contains blocking conditions specific to headless mode
- **AND** it contains return format specification
- **AND** none of this material duplicates the skill

### Requirement: Consolidated procedure flow
The archive agent's system prompt SHALL present its procedure as a single integrated flow where each step combines the procedural action, the headless-mode constraint, and the decision rule in one place. The system prompt SHALL NOT present procedure steps, an adaptation table, and decision rules as three separate containers that restate the same logic.

#### Scenario: Single flow, not three containers
- **WHEN** the agent system prompt is read
- **THEN** the archive procedure is presented as one sequential flow
- **AND** there is NO separate "Adaptation for Headless Context" table
- **AND** there is NO separate "Headless Decision Rules" table

#### Scenario: Each step is self-contained
- **WHEN** reading any individual procedure step
- **THEN** the step describes what action to take, what headless constraint applies, and what the decision outcome is — all inline
- **AND** the same rule (e.g., "incomplete artifacts → blocked") does not appear in multiple separate locations

### Requirement: Headless constraint follows consistent pattern
The archive agent's system prompt SHALL open with a structured headless constraint block following the same pattern used by all spec-teams agents: identity → headless constraint → role boundary. The adaptation of skill instructions (e.g., "ask the user to confirm") to headless behavior (e.g., "hard block") SHALL be expressed within the consolidated procedure flow, not in a separate table.

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the "always sync deltas" and "block on warnings" decisions are expressed in the procedure flow

### Requirement: Missing-skill hard-stop
The archive agent SHALL attempt to `read` the `openspec-archive-change` skill file via the `read` tool at the start of every dispatch. If the `read` fails (skill not found or not available), the agent SHALL hard-stop: it SHALL return `Status: blocked` with a user-facing message stating the skill is required and recommending OpenSpec installation. The agent SHALL NOT proceed without the skill.

#### Scenario: Skill loaded successfully
- **WHEN** the agent reads the `openspec-archive-change` skill file
- **AND** the read succeeds
- **THEN** the agent proceeds with archive operations using the skill's procedures

#### Scenario: Skill file missing
- **WHEN** the agent attempts to read the `openspec-archive-change` skill file
- **AND** the read fails
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the skill is required and recommends OpenSpec installation
- **AND** the agent does NOT proceed with archiving

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
