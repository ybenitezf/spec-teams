# archive-agent Delta Specification

Delta spec for `prompt-complexity` — consolidates internal duplication, removes duplicated skill content, adds missing-skill hard-stop, streamlines headless constraint.

## MODIFIED Requirements

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

## ADDED Requirements

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
