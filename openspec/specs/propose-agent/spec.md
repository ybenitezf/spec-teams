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

### Requirement: Consumes exploration findings
The propose agent SHALL check for exploration findings at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` where `<encoded-cwd>` is the value provided by the extension in the task string. If the file exists, the agent SHALL read it to gain full exploration context (alternatives considered, constraints discovered, edge cases, user motivations). The agent SHALL delete the findings file after reading it.

#### Scenario: Findings file exists — consumed for context
- **WHEN** dispatched with change name "add-dark-mode"
- **AND** the task string contains `encoded-cwd: <value>`
- **AND** `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` exists using the provided `<encoded-cwd>` value
- **THEN** the propose agent reads the findings file
- **AND** the propose agent uses the findings to inform proposal.md, design.md, and tasks.md
- **AND** the propose agent deletes `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md` after reading

#### Scenario: Findings file absent — proceeds normally
- **WHEN** dispatched with a change name
- **AND** no findings file exists at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` using the provided `<encoded-cwd>`
- **THEN** the propose agent proceeds with only the structured brief from the task string
- **AND** no error or warning is raised

#### Scenario: Findings file provides deeper context than brief
- **WHEN** the findings file documents rejected alternatives and edge cases
- **THEN** the propose agent includes tradeoff analysis in design.md
- **AND** the propose agent includes edge case handling in tasks.md
- **AND** the propose agent does NOT re-investigate decisions already recorded in findings

#### Scenario: Agent extracts encoded-cwd from task string
- **WHEN** the propose agent parses its task string
- **THEN** the task string contains `encoded-cwd: <value>` as the first line
- **AND** the agent uses `<value>` as the `<encoded-cwd>` for path construction
- **AND** the agent treats the remainder (after the blank separator line) as the actual task

#### Scenario: Fallback when encoded-cwd not in task string
- **WHEN** the task string does NOT contain an `encoded-cwd:` prefix
- **THEN** the agent SHALL compute `<encoded-cwd>` by: (1) stripping the leading `/` from the project's absolute working directory, (2) replacing `/`, `\`, and `:` with `-`, and (3) wrapping the result in `--...--`
- **AND** the agent proceeds using the computed value
