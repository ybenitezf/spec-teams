# worker-agent Specification

## Purpose
Defines the worker agent — a general-purpose task execution agent for the spec-teams extension. The worker executes non-OpenSpec tasks directly without workflow constraints.

## Requirements
### Requirement: Agent definition file

The project SHALL contain `.pi/agents/worker.md` with valid YAML frontmatter including `name: worker`, a `description` field, `tools`, and `opt-in: true`.

#### Scenario: File exists with frontmatter
- **WHEN** the agent loader scans `.pi/agents/`
- **THEN** `.pi/agents/worker.md` is parsed successfully
- **AND** the parsed definition has `name: worker`

#### Scenario: Full tool access
- **WHEN** the agent definition is parsed
- **THEN** the `tools` field includes `read`, `write`, `edit`, `bash`, `grep`, and `find`

#### Scenario: Opt-in field present
- **WHEN** the agent definition is parsed
- **THEN** the `opt-in` frontmatter field is `true`

### Requirement: Agent description signals general-purpose execution

The agent's frontmatter description SHALL signal general-purpose task execution distinct from OpenSpec phases. The description SHALL NOT contain words "explore", "propose", "apply", "verify", or "archive" in a context that would match OpenSpec routing.

#### Scenario: Dispatcher distinguishes worker from OpenSpec agents
- **WHEN** the dispatcher scans agent descriptions
- **THEN** the worker agent is NOT matched for OpenSpec-typed intents (exploration, proposal, implementation, verification, archiving)
- **AND** the worker agent IS matched for general task execution (git, file ops, quick scripts, web requests, one-off edits)

### Requirement: Execution stance — no OpenSpec awareness

The worker agent's system prompt SHALL contain zero OpenSpec references. It SHALL NOT describe OpenSpec lifecycle, mention `openspec` CLI commands, reference spec artifacts, or describe OpenSpec session management. The worker SHALL be a task executor with no workflow awareness.

#### Scenario: Zero OpenSpec references in system prompt
- **WHEN** the worker agent's system prompt is read
- **THEN** no mention of "openspec", "explore", "propose", "apply", "verify", "archive", "spec-teams", "change", or "delta spec" appears
- **AND** the prompt describes a power-tool stance: execute tasks directly, report results

#### Scenario: Worker does not run openspec commands
- **WHEN** the worker agent is dispatched with a non-OpenSpec task
- **THEN** the worker does NOT invoke the `openspec` CLI
- **AND** the worker does NOT create any OpenSpec artifacts

### Requirement: Thinking is off

The worker agent's `thinking` frontmatter field SHALL be `off` to signal an execution stance rather than reasoning.

#### Scenario: Thinking field is off
- **WHEN** the agent definition is parsed
- **THEN** the `thinking` field is `off` (or absent, defaulting to `off`)

### Requirement: No explicit model — falls through to dispatcher model

The worker agent's frontmatter SHALL NOT include a `model` field. The dispatched model SHALL fall through to the dispatcher's model via existing fallback logic.

#### Scenario: Model resolution falls through
- **WHEN** a task is dispatched to the worker agent
- **THEN** the spawned `pi` process uses the dispatcher's model (or the hardcoded fallback if no dispatcher model exists)

#### Scenario: User override via frontmatter
- **WHEN** a user adds `model: <specific>` to the worker's frontmatter
- **THEN** the explicit model takes precedence over the dispatcher's model
- **AND** this is consistent with existing per-agent model behavior

### Requirement: Simple status signals — done and blocked

The worker agent SHALL conclude responses with `Status: done` for completed tasks or `Status: blocked` for tasks it cannot execute. The worker SHALL NOT use multi-turn relay signals (`need-input`, `ready-to-propose`, `done-exploring`).

#### Scenario: Task completed successfully
- **WHEN** the worker agent finishes executing a task
- **THEN** the response ends with `Status: done`
- **AND** the response includes a summary of what was done

#### Scenario: Task cannot be completed
- **WHEN** the worker agent encounters an unrecoverable issue
- **THEN** the response ends with `Status: blocked`
- **AND** the response describes the blocker and what would unblock it

#### Scenario: Worker does not use relay signals
- **WHEN** the worker agent concludes any response
- **THEN** the response does NOT contain `Status: need-input`, `Status: ready-to-propose`, or `Status: done-exploring`

### Requirement: No session lifecycle management

The worker agent SHALL NOT manage a dedicated session file or deletion logic. The existing per-agent session mechanism managed by `dispatchAgent()` (session file at `~/.pi/spec-teams/<encoded-cwd>/<agent-name>.json`) SHALL provide continuity. The worker SHALL NOT create or delete `.pi/spec-sessions/*` files.

#### Scenario: Worker session is managed by extension
- **WHEN** the worker agent is dispatched
- **THEN** the extension spawns `pi` with `--session` pointing to the existing per-agent session path
- **AND** the worker does NOT reference or manage session files in its system prompt

#### Scenario: No explore-style session file
- **WHEN** the worker agent executes
- **THEN** no `.pi/spec-sessions/explore.json` or `.pi/spec-sessions/explore-*.md` file is created or deleted by the worker

### Requirement: Headless execution

The worker agent SHALL run headless with no user interaction tools. The tools field SHALL NOT include AskUserQuestion or any user interaction tool.

#### Scenario: No user interaction tools available
- **WHEN** the worker agent is dispatched
- **THEN** the worker does NOT have AskUserQuestion or any user interaction tool
- **AND** the worker's `tools` field does NOT include user interaction tools
