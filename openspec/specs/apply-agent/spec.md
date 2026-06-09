# apply-agent Specification

## Purpose

The apply agent implements OpenSpec changes by executing tasks described in a change's tasks.md. It is a headless sub-agent that follows the `openspec-apply-change` skill with adaptations for non-interactive execution.

## Requirements

### Requirement: Apply agent file exists
The project SHALL contain `agents/apply.md` as a valid agent definition file with YAML frontmatter and a system prompt body.

#### Scenario: File at correct location
- **WHEN** the project is checked out
- **THEN** `agents/apply.md` exists at the project root

#### Scenario: Valid frontmatter
- **WHEN** the file is parsed by `parseAgentFile()`
- **THEN** it returns an `AgentDef` with `name: "apply"`, a non-empty `description`, `tools` containing at least `read,write,edit,bash`, and `thinking: true`

#### Scenario: Non-empty system prompt
- **WHEN** the file is parsed
- **THEN** the `systemPrompt` field contains at least 200 characters of instruction text

### Requirement: Agent description signals apply phase
The agent's frontmatter description SHALL start with the word "Applies" or contain "apply" in the first sentence so the dispatcher's routing heuristic unambiguously maps it to the apply phase.

#### Scenario: Dispatcher routing match
- **WHEN** the dispatcher scans agent descriptions for an apply-phase task
- **THEN** the apply agent is matched by its description containing "apply" as a primary signal

### Requirement: Agent prompt references skill, does not duplicate skill content
The apply agent's system prompt SHALL reference the `openspec-apply-change` skill as the authoritative source for procedural content (implementation steps, guardrails, and task-tracking procedures). The agent prompt SHALL instruct the agent to read the skill file via the `read` tool and follow its procedures. The agent prompt SHALL NOT contain inline copies of implementation procedure steps or guardrails that exist in the skill file.

#### Scenario: Skill referenced, not duplicated
- **WHEN** the agent system prompt is read
- **THEN** it contains a reference to the `openspec-apply-change` skill by name
- **AND** it instructs the agent to read the skill via the `read` tool
- **AND** it does NOT contain a full inline implementation procedure duplicating the skill

#### Scenario: Agent-specific content retained
- **WHEN** the agent system prompt is read
- **THEN** it contains the return format specification
- **AND** it contains role identity and boundary
- **AND** none of this material duplicates the skill

### Requirement: Agent adapts skill for headless sub-agent context
The apply agent SHALL run headless with no user interaction tools. The agent's system prompt SHALL open with a structured headless constraint block stating: the agent is a headless sub-agent, it has no AskUserQuestion or user interaction tools, it never waits for user input, and when it encounters ambiguity it returns structured status. The constraint block SHALL follow the consistent structure used by all spec-teams agents. When the `openspec-apply-change` skill instructs to ask the user questions, prompt for input, or wait for guidance, the agent SHALL translate those instructions to returning a structured status to the dispatcher. The agent SHALL never initiate user interaction.

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the adaptation table maps interactive skill instructions to headless behavior in a consistent format

#### Scenario: Return format specified
- **WHEN** the agent system prompt is read
- **THEN** it describes a structured return format including at minimum: status (done/blocked/need-input), tasks completed count, and a summary

#### Scenario: Agent never initiates user interaction
- **WHEN** the agent encounters a situation where the skill says to ask the user
- **THEN** the agent returns structured status instead
- **AND** the agent does NOT attempt to use AskUserQuestion or any user interaction tool

### Requirement: Missing-skill hard-stop
The apply agent SHALL attempt to `read` the `openspec-apply-change` skill file via the `read` tool at the start of every dispatch. If the `read` fails (skill not found or not available), the agent SHALL hard-stop: it SHALL return `Status: blocked` with a user-facing message stating the skill is required and recommending OpenSpec installation. The agent SHALL NOT proceed without the skill.

#### Scenario: Skill loaded successfully
- **WHEN** the agent reads the `openspec-apply-change` skill file
- **AND** the read succeeds
- **THEN** the agent proceeds with task implementation using the skill's procedures

#### Scenario: Skill file missing
- **WHEN** the agent attempts to read the `openspec-apply-change` skill file
- **AND** the read fails
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the skill is required and recommends OpenSpec installation
- **AND** the agent does NOT proceed with implementation

### Requirement: Agent thinking flag is enabled
The agent frontmatter SHALL set `thinking: on` to enable extended reasoning during implementation tasks.

#### Scenario: Thinking enabled
- **WHEN** the agent is dispatched
- **THEN** the child `pi` process is spawned with `--thinking on`

### Requirement: Agent has necessary tools for implementation
The agent's `tools` field SHALL include `read,write,edit,bash,grep,find` — the minimum set needed to read change artifacts, write code, run `openspec` CLI commands, and search the codebase.

#### Scenario: Tools configured
- **WHEN** the agent definition is loaded
- **THEN** the `tools` string includes `read`, `write`, `edit`, `bash`, `grep`, and `find` (order-independent)
