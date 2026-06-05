# propose-agent Specification

## Purpose

The propose agent formalizes explored decisions into structured OpenSpec change artifacts. It is a headless sub-agent that follows the `openspec-propose` skill with adaptations for non-interactive execution.

## ADDED Requirements

### Requirement: Agent definition file
The project SHALL contain `agents/propose.md` with valid YAML frontmatter including `name: propose`, a `description` field, `tools`, and `thinking`.

#### Scenario: File exists with frontmatter
- **WHEN** the agent loader scans `agents/`
- **THEN** `agents/propose.md` is parsed successfully
- **AND** the parsed definition has `name: propose`

#### Scenario: Tools include write and edit
- **WHEN** the agent definition is parsed
- **THEN** the `tools` field includes `read`, `write`, `edit`, `bash`, `grep`, and `find`

#### Scenario: Thinking is enabled
- **WHEN** the agent definition is parsed
- **THEN** the `thinking` field is `on`

### Requirement: Follows openspec-propose skill
The propose agent SHALL follow the `openspec-propose` skill procedure: read the skill file, run `openspec new change`, check artifact status, create artifacts in dependency order using `openspec instructions`.

#### Scenario: Creates a new change directory
- **WHEN** dispatched with a change name not yet existing
- **THEN** the agent runs `openspec new change "<name>"`
- **AND** a scaffolded change directory is created at `openspec/changes/<name>/`

#### Scenario: Creates artifacts in dependency order
- **WHEN** the change directory exists
- **THEN** the agent reads `openspec status --change "<name>" --json`
- **AND** creates artifacts in the order specified by artifact dependencies
- **AND** re-checks status after each artifact is written

### Requirement: Headless adaptation for user questions
The propose agent SHALL NOT use AskUserQuestion or any user-interaction tool. When the `openspec-propose` skill instructs to ask the user, the agent SHALL instead return a `need-input` status with structured information.

#### Scenario: No change name provided
- **WHEN** the task string does not include a change name
- **THEN** the agent returns status `need-input` with available changes from `openspec list --json`

#### Scenario: Unclear requirements
- **WHEN** the task string lacks sufficient detail to create a proposal
- **THEN** the agent returns status `need-input` describing what information is missing

#### Scenario: Change already exists
- **WHEN** a change with the given name already exists
- **THEN** the agent returns status `need-input` presenting options (continue existing or create new)

### Requirement: Structured return format
The propose agent SHALL conclude every response with a structured status block containing at minimum: `Status:` (one of `done`, `blocked`, `need-input`), and a `Summary` section.

#### Scenario: Successful completion
- **WHEN** all artifacts are created
- **THEN** the agent returns `Status: done` with a list of created artifacts

#### Scenario: Blocked by error
- **WHEN** an unrecoverable error occurs (e.g., CLI failure)
- **THEN** the agent returns `Status: blocked` with the error description

#### Scenario: Needs clarification
- **WHEN** the agent cannot proceed due to ambiguity
- **THEN** the agent returns `Status: need-input` with the specific question or missing information

### Requirement: Receives context via task string
The propose agent SHALL treat the task string received from the dispatcher as the authoritative context for the change. It SHALL NOT second-guess decisions made during explore nor re-investigate settled questions.

#### Scenario: Task includes approach and scope
- **WHEN** the task string describes the problem, approach, and scope
- **THEN** the agent uses that information directly in the proposal and design artifacts

#### Scenario: Task lacks critical detail
- **WHEN** the task string is missing scope boundaries or technical approach
- **THEN** the agent returns `need-input` flagging the missing information
