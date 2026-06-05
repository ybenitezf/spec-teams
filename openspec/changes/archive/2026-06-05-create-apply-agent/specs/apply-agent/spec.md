## ADDED Requirements

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

### Requirement: Agent references openspec-apply-change skill by name
The agent's system prompt SHALL reference the `openspec-apply-change` skill by its exact name (as it appears in the `<available_skills>` block injected by Pi) rather than by filesystem path.

#### Scenario: Skill reference by name
- **WHEN** the agent system prompt is read
- **THEN** it contains the string `openspec-apply-change` as a skill name reference
- **AND** it does NOT contain an absolute or relative filesystem path to the skill file

### Requirement: Agent adapts skill for headless sub-agent context
The agent's system prompt SHALL include an adaptation guide that maps user-facing skill instructions to sub-agent-appropriate behavior. Specifically, instructions to ask the user questions, prompt for input, or wait for guidance SHALL be translated to returning a structured status to the dispatcher.

#### Scenario: Adaptation table present
- **WHEN** the agent system prompt is read
- **THEN** it maps at least the following skill instructions to sub-agent behavior:
  - "ask the user" or "AskUserQuestion" → return to dispatcher with what's needed
  - "wait for guidance" or "pause" → return status and explanation
- **AND** it specifies that the agent never initiates user interaction

#### Scenario: Return format specified
- **WHEN** the agent system prompt is read
- **THEN** it describes a structured return format including at minimum: status (done/blocked/need-input), tasks completed count, and a summary of what happened or what's needed

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
