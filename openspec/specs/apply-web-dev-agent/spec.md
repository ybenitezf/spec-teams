# apply-web-dev-agent Specification

## Purpose

The apply-web-dev agent implements OpenSpec changes focused on web development — CSS, visualization, component rendering, and browser UI tasks. It is a headless sub-agent that follows the `openspec-apply-change` skill with adaptations for non-interactive execution, and additionally uses the `chrome-devtools-cli` skill for browser automation (DOM inspection, visual verification, interaction testing, screenshot comparison).

## ADDED Requirements

### Requirement: Apply-web-dev agent file exists
The project SHALL contain `agents/apply-web-dev.md` as a valid agent definition file with YAML frontmatter and a system prompt body.

#### Scenario: File at correct location
- **WHEN** the project is checked out
- **THEN** `agents/apply-web-dev.md` exists at the project root

#### Scenario: Valid frontmatter
- **WHEN** the file is parsed by `parseAgentFile()`
- **THEN** it returns an `AgentDef` with `name: "apply-web-dev"`, a non-empty `description`, `tools` containing at least `read,write,edit,bash,grep,find`, `model: "opencode-go/kimi-k2.6"`, and `thinking: true`

#### Scenario: Non-empty system prompt
- **WHEN** the file is parsed
- **THEN** the `systemPrompt` field contains at least 200 characters of instruction text

### Requirement: Agent description signals apply phase
The agent's frontmatter description SHALL signal the apply phase so the dispatcher's routing heuristic maps it to web-development implementation tasks.

#### Scenario: Dispatcher routing match
- **WHEN** the dispatcher scans agent descriptions for a web development apply-phase task
- **THEN** the apply-web-dev agent is matchable by its description

### Requirement: Agent prompt references both required skills without duplicating skill content
The apply-web-dev agent's system prompt SHALL reference both the `openspec-apply-change` skill and the `chrome-devtools-cli` skill as authoritative sources for procedural content. The agent prompt SHALL instruct the agent to read each skill file via the `read` tool and follow its procedures. The agent prompt SHALL NOT contain inline copies of implementation procedure steps or guardrails that exist in either skill file.

#### Scenario: Both skills referenced, not duplicated
- **WHEN** the agent system prompt is read
- **THEN** it contains a reference to the `openspec-apply-change` skill by name
- **AND** it contains a reference to the `chrome-devtools-cli` skill by name
- **AND** it instructs the agent to read both skills via the `read` tool
- **AND** it does NOT contain a full inline implementation procedure duplicating either skill

#### Scenario: Agent-specific web-dev content retained
- **WHEN** the agent system prompt is read
- **THEN** it contains the return format specification
- **AND** it contains role identity and boundary
- **AND** it contains instructions for using chrome-devtools during implementation
- **AND** none of this material duplicates the skill files

### Requirement: Agent adapts skills for headless sub-agent context
The apply-web-dev agent SHALL run headless with no user interaction tools. The agent's system prompt SHALL open with a structured headless constraint block stating: the agent is a headless sub-agent, it has no AskUserQuestion or user interaction tools, it never waits for user input, and when it encounters ambiguity it returns structured status. The constraint block SHALL follow the consistent structure used by all spec-teams agents. When the `openspec-apply-change` skill instructs to ask the user questions, prompt for input, or wait for guidance, the agent SHALL translate those instructions to returning a structured status to the dispatcher. The agent SHALL never initiate user interaction.

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

### Requirement: Missing-skill hard-stop for both skills
The apply-web-dev agent SHALL attempt to `read` both the `openspec-apply-change` and `chrome-devtools-cli` skill files via the `read` tool at the start of every dispatch. If either `read` fails (skill not found or not available), the agent SHALL hard-stop: it SHALL return `Status: blocked` with a user-facing message stating both skills are required and recommending installation. The agent SHALL NOT proceed without both skills.

#### Scenario: Both skills loaded successfully
- **WHEN** the agent reads both the `openspec-apply-change` and `chrome-devtools-cli` skill files
- **AND** both reads succeed
- **THEN** the agent proceeds with task implementation using both skills' procedures

#### Scenario: openspec-apply-change skill missing
- **WHEN** the agent attempts to read the `openspec-apply-change` skill file
- **AND** the read fails
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the skill is required and recommends OpenSpec installation
- **AND** the agent does NOT proceed with implementation

#### Scenario: chrome-devtools-cli skill missing
- **WHEN** the agent attempts to read the `chrome-devtools-cli` skill file
- **AND** the read fails
- **THEN** the agent returns `Status: blocked`
- **AND** the blocked message states the skill is required along with OpenSpec
- **AND** the agent does NOT proceed with implementation

### Requirement: Agent thinking flag is enabled
The agent frontmatter SHALL set `thinking: on` to enable extended reasoning during web implementation tasks.

#### Scenario: Thinking enabled
- **WHEN** the agent is dispatched
- **THEN** the child `pi` process is spawned with `--thinking on`

### Requirement: Agent has necessary tools for implementation
The agent's `tools` field SHALL include `read,write,edit,bash,grep,find` — the minimum set needed to read change artifacts, write code, run `openspec` and `chrome-devtools` CLI commands, and search the codebase. Chrome DevTools automation operates through bash commands.

#### Scenario: Tools configured
- **WHEN** the agent definition is loaded
- **THEN** the `tools` string includes `read`, `write`, `edit`, `bash`, `grep`, and `find` (order-independent)

### Requirement: Agent uses vision-capable model
The agent frontmatter SHALL specify `model: opencode-go/kimi-k2.6`, a vision-capable model that can interpret screenshots taken during browser automation for visual verification of rendered output.

#### Scenario: Vision model configured
- **WHEN** the agent definition is loaded
- **THEN** the `model` field is `opencode-go/kimi-k2.6`

### Requirement: Agent instructs use of chrome-devtools for web tasks
The agent's system prompt SHALL instruct the agent to use `chrome-devtools` CLI commands for web-specific implementation tasks including: navigating to rendered pages, taking DOM snapshots (`take_snapshot`), capturing screenshots (`take_screenshot`), interacting with UI elements (`click`, `fill`), evaluating JavaScript in the browser (`evaluate_script`), and checking console messages (`list_console_messages`). The prompt SHALL describe when each tool is appropriate during implementation.

#### Scenario: chrome-devtools usage instructions present
- **WHEN** the agent system prompt is read
- **THEN** it contains guidance on using `chrome-devtools` for web-specific implementation verification
- **AND** it references the `chrome-devtools-cli` skill for full command documentation

### Requirement: Agent does not modify teams.yaml or other agent files
The apply-web-dev agent's creation SHALL be limited to the single new file `agents/apply-web-dev.md`. No other project files SHALL be modified, including `teams.yaml` and existing agent files.

#### Scenario: Only new file is created
- **WHEN** the change is implemented
- **THEN** `agents/apply-web-dev.md` exists
- **AND** no modifications were made to `teams.yaml`
- **AND** no modifications were made to `agents/apply.md` or any other agent file
