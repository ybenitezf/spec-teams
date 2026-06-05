# spec-teams-extension Specification

## Purpose
TBD - created by archiving change integrate-spec-teams. Update Purpose after archive.
## Requirements
### Requirement: Extension file at correct location
The project SHALL contain `extensions/spec-teams.ts` as its extension entry point.

#### Scenario: File exists
- **WHEN** the project is checked out
- **THEN** `extensions/spec-teams.ts` exists and exports a default function

#### Scenario: Placeholder removed
- **WHEN** the project is checked out
- **THEN** `extensions/index.ts` does NOT exist

### Requirement: Extension loads in Pi
The extension SHALL load without errors when Pi is launched with `-e ./extensions/spec-teams.ts`.

#### Scenario: Successful load
- **WHEN** running `pi -e ./extensions/spec-teams.ts -p "hello"`
- **THEN** Pi starts without import or runtime errors
- **AND** the extension's `session_start` handler fires

### Requirement: Agent dispatch tool
The extension SHALL register a `dispatch_agent` tool that spawns specialist agent Pi processes.

#### Scenario: Tool registered
- **WHEN** the extension loads
- **THEN** the `dispatch_agent` tool is available for use via the Pi agent

### Requirement: Team selection command
The extension SHALL register a `/specs-team` command to switch the active team.

#### Scenario: Command registered
- **WHEN** the extension loads
- **THEN** the `/specs-team` command is available in the Pi session

### Requirement: Agent listing command
The extension SHALL register a `/specs-list` command to display loaded agents and their status.

#### Scenario: Command registered
- **WHEN** the extension loads
- **THEN** the `/specs-list` command is available in the Pi session

### Requirement: OpenSpec-aware system prompt
The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. The lifecycle SHALL be described as fluid activities (not rigid phases), using language that emphasizes actions can be taken anytime — start anywhere, go back when needed, skip what doesn't apply. Routing instructions SHALL use generic phase-to-role heuristics (e.g., "explore → agents focused on investigation, research, discovery") rather than hardcoded agent names. The system prompt SHALL NOT contain a static lookup table mapping phases to specific agent names. The system prompt SHALL NOT contain pipeline-enforcing language such as "chain across phases" or "don't skip phases."

#### Scenario: System prompt injected
- **WHEN** an agent starts
- **THEN** the system prompt includes OpenSpec activity descriptions (explore, propose, apply, archive) framed as fluid actions rather than mandatory phases
- **AND** the system prompt includes the active team's agent catalog
- **AND** the system prompt does NOT contain hardcoded agent names (such as "scout", "change-designer", "spec-writer", "spec-reviewer", "prompt-engineer") in routing instructions
- **AND** the system prompt does NOT contain pipeline-enforcing language such as "chain across phases" or "don't skip phases"

#### Scenario: Routing adapts to any team
- **WHEN** a team is loaded with custom agent names (e.g., "researcher", "architect", "implementer")
- **THEN** the system prompt's routing guidance remains valid
- **AND** the dispatcher can match phases to agents by their descriptions rather than by name

#### Scenario: Fluidity guidance present
- **WHEN** an agent starts
- **THEN** the system prompt includes situation-based guidance describing when to start with explore (unclear requirements), jump to apply (clear goal, small change), circle back to propose (design flaw found), or stay in explore (just thinking)
- **AND** the system prompt states that activities are not a fixed sequence and can be done in any order

### Requirement: Dashboard widget
The extension SHALL render a compact single-line dashboard widget in the TUI showing agent status, context usage, and active task.

#### Scenario: Widget rendered
- **WHEN** the extension loads in TUI mode
- **THEN** a `spec-team` widget is registered and visible showing loaded agents

### Requirement: Intent-based routing guidance
The system prompt SHALL include guidance that matches the dispatcher's activity choice to user intent: quick fixes SHALL NOT force unnecessary exploration, and unclear requirements SHALL NOT be rushed to implementation.

#### Scenario: Quick fix bypasses exploration
- **WHEN** a user requests a simple change (e.g., "fix the typo in the footer")
- **THEN** the dispatcher MAY dispatch directly to an apply agent without first exploring or proposing

#### Scenario: Unclear requirements trigger exploration
- **WHEN** a user expresses uncertainty (e.g., "I'm not sure how to handle auth")
- **THEN** the dispatcher SHOULD route to an explore agent before creating artifacts

