# propose-agent Delta Specification

Delta spec for `prompt-complexity` — streamlines headless constraint, removes duplicated skill content, adds missing-skill hard-stop.

## MODIFIED Requirements

### Requirement: Headless adaptation for user questions
The propose agent SHALL run headless with no user interaction tools. The agent's system prompt SHALL open with a structured headless constraint block stating: the agent is a headless sub-agent, it has no AskUserQuestion or user interaction tools, it never waits for user input, and when it encounters ambiguity it returns structured status. The constraint block SHALL follow the consistent structure used by all spec-teams agents. When the `openspec-propose` skill instructs to ask the user, the agent SHALL instead return a `need-input` status with structured information.

#### Scenario: No change name provided
- **WHEN** the task string does not include a change name
- **THEN** the agent returns status `need-input` with available changes from `openspec list --json`

#### Scenario: Unclear requirements
- **WHEN** the task string lacks sufficient detail to create a proposal
- **THEN** the agent returns status `need-input` describing what information is missing

#### Scenario: Change already exists
- **WHEN** a change with the given name already exists
- **THEN** the agent returns status `need-input` presenting options (continue existing or create new)

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the adaptation guidance (mapping skill instructions to headless behavior) is presented in a consistent table format

### Requirement: Agent prompt references skill, does not duplicate skill content
The propose agent's system prompt SHALL reference the `openspec-propose` skill as the authoritative source for procedural content (artifact creation steps, guardrails, and procedure details). The agent prompt SHALL instruct the agent to read the skill file via the `read` tool and follow its procedures. The agent prompt SHALL NOT contain inline copies of procedure steps, guardrails, or step-by-step instructions that exist in the skill file.

#### Scenario: Skill referenced, not duplicated
- **WHEN** the agent system prompt is read
- **THEN** it contains a reference to the `openspec-propose` skill by name
- **AND** it instructs the agent to read the skill via the `read` tool
- **AND** it does NOT contain a full inline artifact creation procedure duplicating the skill

#### Scenario: Agent-specific content retained
- **WHEN** the agent system prompt is read
- **THEN** it contains the task string contract (treat as authoritative, don't second-guess)
- **AND** it contains findings file consumption procedure
- **AND** it contains return format specification
- **AND** none of this material duplicates the skill

## ADDED Requirements

### Requirement: Missing-skill hard-stop
The propose agent SHALL attempt to `read` the `openspec-propose` skill file via the `read` tool at the start of every dispatch. If the `read` fails (skill not found or not available), the agent SHALL hard-stop: it SHALL return `Status: blocked` with a user-facing message stating the skill is required and recommending OpenSpec installation. The agent SHALL NOT proceed without the skill.

#### Scenario: Skill loaded successfully
- **WHEN** the agent reads the `openspec-propose` skill file
- **AND** the read succeeds
- **THEN** the agent proceeds with artifact creation using the skill's procedures

#### Scenario: Skill file missing
- **WHEN** the agent attempts to read the `openspec-propose` skill file
- **AND** the read fails
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the skill is required and recommends OpenSpec installation
- **AND** the agent does NOT proceed with artifact creation
