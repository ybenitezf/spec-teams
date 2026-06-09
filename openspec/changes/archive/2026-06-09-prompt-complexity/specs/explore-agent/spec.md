# explore-agent Delta Specification

Delta spec for `prompt-complexity` — removes duplicated stance, streamlines headless constraint.

## MODIFIED Requirements

### Requirement: Follows openspec-explore skill stance
The explore agent's system prompt SHALL instruct the agent to adopt the `openspec-explore` skill stance by reading the skill file via the `read` tool. The skill file SHALL be the authoritative source for the stance content (curious, not prescriptive; open threads, not interrogations; visual; adaptive; patient; grounded in the codebase). The agent prompt SHALL reference the stance by name but SHALL NOT re-embed the full five-point stance description. The agent SHALL be a thinking partner, not a task executor.

#### Scenario: Curious and adaptive behavior
- **WHEN** dispatched with a user's vague idea
- **THEN** the agent reads the codebase, surfaces multiple directions, and asks follow-up questions
- **AND** the agent does NOT prescribe a solution prematurely

#### Scenario: Codebase-grounded investigation
- **WHEN** dispatched to explore a problem
- **THEN** the agent uses `read`, `grep`, `find`, and `bash` to investigate the actual codebase
- **AND** the agent references specific files and patterns in its responses

#### Scenario: Visual thinking
- **WHEN** the topic has spatial or systemic relationships
- **THEN** the agent uses ASCII diagrams to clarify thinking

#### Scenario: Stance is referenced, not embedded
- **WHEN** the agent system prompt is read
- **THEN** it references the `openspec-explore` skill stance by name
- **AND** it instructs the agent to read the skill to obtain the full stance
- **AND** it does NOT contain an inline copy of the five stance qualities (curious, visual, adaptive, patient, grounded)

### Requirement: Headless adaptation
The explore agent SHALL run headless with no user interaction tools. The agent's system prompt SHALL open with a structured headless constraint block stating: the agent is a headless sub-agent, it has no AskUserQuestion or user interaction tools, it never waits for user input, and when it would normally ask the user it returns structured status instead. The constraint block SHALL follow the consistent structure used by all spec-teams agents. When the explore stance would normally ask the user a question, the agent SHALL instead return `need-input` with the question in the response body.

#### Scenario: No user interaction tools available
- **WHEN** the agent is dispatched
- **THEN** the agent does NOT have AskUserQuestion or any user interaction tool
- **AND** the agent's `tools` field does NOT include user interaction tools

#### Scenario: Question returned as need-input
- **WHEN** the agent would ask the user a question
- **THEN** the agent returns `Status: need-input` with the question and context
- **AND** the agent does NOT attempt to use AskUserQuestion

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the constraint states the agent has no user interaction tools and never waits for user input

## ADDED Requirements

### Requirement: Missing-skill hard-stop
The explore agent SHALL attempt to `read` the `openspec-explore` skill file via the `read` tool at the start of every dispatch. If the `read` fails (skill not found or not available), the agent SHALL hard-stop: it SHALL return `Status: blocked` with a user-facing message stating the skill is required and recommending OpenSpec installation. The agent SHALL NOT proceed without the skill, SHALL NOT fall back to any inline content, and SHALL NOT attempt to reconstruct the procedure from memory.

#### Scenario: Skill loaded successfully
- **WHEN** the agent reads the `openspec-explore` skill file
- **AND** the read succeeds
- **THEN** the agent proceeds with its exploration using the skill's stance and procedures

#### Scenario: Skill file missing
- **WHEN** the agent attempts to read the `openspec-explore` skill file
- **AND** the read fails (file not found)
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the `openspec-explore` skill is not available
- **AND** the blocked message includes a recommendation to install OpenSpec
- **AND** the agent does NOT proceed with exploration
