# explore-agent Specification

## Purpose

The explore agent is a headless sub-agent in the spec-teams extension that follows the `openspec-explore` skill stance. It investigates problems, reads the codebase, clarifies requirements with the user through multi-turn relayed conversation, and hands off crystallized decisions to the propose agent via a structured brief and findings file.

## Requirements

### Requirement: Agent definition file
The project SHALL contain `agents/explore.md` with valid YAML frontmatter including `name: explore`, a `description` field, `tools`, and `thinking`.

#### Scenario: File exists with frontmatter
- **WHEN** the agent loader scans `agents/`
- **THEN** `agents/explore.md` is parsed successfully
- **AND** the parsed definition has `name: explore`

#### Scenario: Tools include read and write
- **WHEN** the agent definition is parsed
- **THEN** the `tools` field includes `read`, `write`, `bash`, `grep`, and `find`

#### Scenario: Thinking is enabled
- **WHEN** the agent definition is parsed
- **THEN** the `thinking` field is `on`

### Requirement: Agent description signals explore phase
The agent's frontmatter description SHALL contain the word "explore", "investigate", or "discover" so the dispatcher's routing heuristic maps it to the explore phase.

#### Scenario: Dispatcher routing match
- **WHEN** the dispatcher scans agent descriptions for an explore-phase task
- **THEN** the explore agent is matched by its description containing an explore-signaling keyword

### Requirement: Follows openspec-explore skill stance
The explore agent's system prompt SHALL embed the `openspec-explore` skill stance: curious, not prescriptive; open threads, not interrogations; visual; adaptive; patient; grounded in the codebase. The agent SHALL be a thinking partner, not a task executor.

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

### Requirement: Multi-turn conversation via session persistence
The explore agent SHALL maintain conversation context across dispatches through Pi session persistence (`.pi/spec-sessions/explore.json`). Each dispatch SHALL resume prior context automatically.

#### Scenario: First dispatch starts fresh
- **WHEN** dispatched for the first time with a user message
- **THEN** the agent has no prior session context
- **AND** the agent investigates the codebase and forms an initial response

#### Scenario: Subsequent dispatch resumes conversation
- **WHEN** dispatched again after returning `need-input`
- **THEN** the agent resumes the existing session
- **AND** the agent has access to the full prior conversation history
- **AND** the agent continues the exploration from where it left off

#### Scenario: Topic mismatch detected
- **WHEN** the incoming user message is unrelated to the prior exploration
- **THEN** the agent SHALL detect the mismatch
- **AND** the agent SHALL delete its session file to reset
- **AND** the agent SHALL treat this dispatch as a fresh exploration

### Requirement: Self-managed session lifecycle
The explore agent SHALL manage its own session file. On exploration completion (`ready-to-propose` or `done-exploring`), the agent SHALL delete `.pi/spec-sessions/explore.json` before returning.

#### Scenario: Session deleted on ready-to-propose
- **WHEN** the agent determines exploration has crystallized
- **THEN** the agent deletes `.pi/spec-sessions/explore.json`
- **AND** the agent returns `ready-to-propose` status

#### Scenario: Session deleted on done-exploring
- **WHEN** the user signals they have clarity without needing artifacts
- **THEN** the agent deletes `.pi/spec-sessions/explore.json`
- **AND** the agent returns `done-exploring` status

### Requirement: Structured return signals
The explore agent SHALL conclude every response with a structured status block. The status SHALL be one of: `need-input`, `ready-to-propose`, `done-exploring`, or `blocked`.

#### Scenario: need-input — conversation continues
- **WHEN** the agent has investigated and needs user direction
- **THEN** the agent returns `Status: need-input` with its analysis and follow-up questions

#### Scenario: ready-to-propose — decisions crystallized
- **WHEN** exploration has produced clear, agreed-upon decisions
- **THEN** the agent returns `Status: ready-to-propose` with a structured brief containing change name, problem, approach, scope, and constraints

#### Scenario: done-exploring — user has clarity
- **WHEN** the user has what they need without creating a change
- **THEN** the agent returns `Status: done-exploring` with a summary of what was figured out

#### Scenario: blocked — cannot proceed
- **WHEN** the agent encounters an unrecoverable issue (e.g., cannot access codebase)
- **THEN** the agent returns `Status: blocked` describing the blocker

### Requirement: Headless adaptation
The explore agent SHALL run headless with no user interaction tools. When the explore stance would normally ask the user a question, the agent SHALL instead return `need-input` with the question in the response body.

#### Scenario: No user interaction tools available
- **WHEN** the agent is dispatched
- **THEN** the agent does NOT have AskUserQuestion or any user interaction tool
- **AND** the agent's `tools` field does NOT include user interaction tools

#### Scenario: Question returned as need-input
- **WHEN** the agent would ask the user a question
- **THEN** the agent returns `Status: need-input` with the question and context
- **AND** the agent does NOT attempt to use AskUserQuestion

### Requirement: Explore is read-only by default — write only for findings
The explore agent SHALL NOT create OpenSpec artifacts (proposal.md, design.md, tasks.md, specs/). The agent MAY write exploration findings to `.pi/spec-sessions/explore-<name>.md` for handoff to the propose agent. The agent SHALL NOT modify existing project files.

#### Scenario: Findings file written
- **WHEN** the agent is ready to propose
- **THEN** the agent writes findings to `.pi/spec-sessions/explore-<change-name>.md`
- **AND** the findings include alternatives considered, constraints discovered, edge cases, and user motivations

#### Scenario: OpenSpec artifacts not created
- **WHEN** the agent completes exploration
- **THEN** no proposal.md, design.md, tasks.md, or spec files are created by the explore agent

#### Scenario: Project files not modified
- **WHEN** the agent investigates the codebase
- **THEN** the agent does NOT modify any existing project source files

### Requirement: Findings file contents
The findings file at `.pi/spec-sessions/explore-<name>.md` SHALL document the exploration context: problem space understanding, existing architecture relevant to the change, alternatives considered with reasons for rejection, constraints discovered during investigation, edge cases and gotchas, and user motivations gathered from the conversation.

#### Scenario: Complete context for propose
- **WHEN** the propose agent reads the findings file
- **THEN** the propose agent has sufficient context to create informed proposal.md, design.md, and tasks.md without re-investigating

### Requirement: Agent has necessary tools for exploration
The explore agent's `tools` field SHALL include `read, write, bash, grep, find` — the minimum set needed to read the codebase, write findings, run `openspec` CLI commands, and search the codebase.

#### Scenario: Tools configured
- **WHEN** the agent definition is loaded
- **THEN** the `tools` string includes `read`, `write`, `bash`, `grep`, and `find` (order-independent)
