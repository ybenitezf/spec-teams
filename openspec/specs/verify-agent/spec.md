# verify-agent Specification

## Purpose
TBD - created by archiving change create-verify-agent. Update Purpose after archive.
## Requirements
### Requirement: Verify agent file exists
The project SHALL contain `agents/verify.md` as a valid agent definition file with YAML frontmatter and a system prompt body.

#### Scenario: File at correct location
- **WHEN** the project is checked out
- **THEN** `agents/verify.md` exists at the project root

#### Scenario: Valid frontmatter
- **WHEN** the file is parsed by `parseAgentFile()`
- **THEN** it returns an `AgentDef` with `name: "verify"`, a non-empty `description`, `tools` containing `read,bash,grep,find`, and `thinking: true`

#### Scenario: Non-empty system prompt
- **WHEN** the file is parsed
- **THEN** the `systemPrompt` field contains at least 200 characters of instruction text

### Requirement: Agent description signals verify phase
The agent's frontmatter description SHALL start with the word "Verifies" or contain "verify" in the first sentence so the dispatcher's routing heuristic unambiguously maps it to the verify phase.

#### Scenario: Dispatcher routing match
- **WHEN** the dispatcher scans agent descriptions for a verify-phase task
- **THEN** the verify agent is matched by its description containing "verify" as a primary signal

### Requirement: Agent is read-only — no mutation tools
The agent's `tools` field SHALL NOT include `write` or `edit`. The agent SHALL only inspect and report, never modify code or artifacts.

#### Scenario: Write tool absent
- **WHEN** the agent definition is loaded
- **THEN** the `tools` string does NOT contain `write` or `edit`

#### Scenario: Read tools present
- **WHEN** the agent definition is loaded
- **THEN** the `tools` string includes `read`, `bash`, `grep`, and `find`

### Requirement: Agent inspects implementations at Level 3 depth
The agent's system prompt SHALL describe a verification procedure that covers: (1) task completeness — all tasks in tasks.md checked [x], (2) requirement coverage — each ADDED/MODIFIED/REMOVED requirement has evidence in code, (3) scenario tracing — each GIVEN/WHEN/THEN scenario traceable to specific code paths, (4) design coherence — design.md decisions reflected in actual code patterns, (5) test execution — run test suite if available, flag if absent.

#### Scenario: Procedure described
- **WHEN** the agent system prompt is read
- **THEN** it describes verification steps covering task completeness, requirement coverage, scenario tracing, design coherence, and test execution

### Requirement: Agent returns structured verdict
The agent's system prompt SHALL specify a structured return format including: `verdict` (one of `clean`, `issues-found`, `blocked`), a list of issues with severity and location, and a summary. Issues SHALL reference specific artifacts (task line, spec requirement, design decision, source file) so the dispatcher can route them back to apply with precision.

#### Scenario: Verdict format specified
- **WHEN** the agent system prompt is read
- **THEN** it describes a return format with verdict states `clean`, `issues-found`, `blocked`

#### Scenario: Issues reference artifacts
- **WHEN** the agent system prompt is read
- **THEN** issue descriptions include references to specific locations (tasks.md line, spec requirement name, source file path)

### Requirement: Agent adapts headless context
The verify agent's system prompt SHALL establish it as a headless sub-agent that never initiates user interaction. The agent's system prompt SHALL open with a structured headless constraint block following the same pattern used by all spec-teams agents: identity → headless constraint (no user interaction tools, never wait for user input, return structured status) → role boundary (read-only: no write/edit tools). The agent SHALL map any instruction to "ask the user" into returning structured status to the dispatcher.

#### Scenario: Headless constraint stated
- **WHEN** the agent system prompt is read
- **THEN** it states the agent has no user interaction tools and must never wait for user input

#### Scenario: Read-only constraint present
- **WHEN** the agent system prompt is read
- **THEN** it states the agent is read-only — it inspects and reports, never modifies code or artifacts
- **AND** the read-only constraint is integrated into the role boundary statement

#### Scenario: Headless constraint block follows consistent pattern
- **WHEN** the agent system prompt is read
- **THEN** the opening block follows the same structural pattern as other spec-teams agents (identity → headless constraint → role boundary)
- **AND** the adaptation guidance is presented consistently

### Requirement: Agent thinking flag is enabled
The agent frontmatter SHALL set `thinking: on` to enable extended reasoning during verification tasks.

#### Scenario: Thinking enabled
- **WHEN** the agent is dispatched
- **THEN** the child `pi` process is spawned with `--thinking on`

### Requirement: Agent accepts change name as input
The agent's system prompt SHALL instruct it to accept a change name (kebab-case) from the dispatcher. If no change name is provided, it SHALL auto-detect the active change via `openspec list --json`.

#### Scenario: Change name passed explicitly
- **WHEN** the dispatcher provides a change name
- **THEN** the agent uses that change name for verification

#### Scenario: Change name auto-detected
- **WHEN** no change name is provided
- **THEN** the agent runs `openspec list --json` to find active changes and selects the most recently modified one
