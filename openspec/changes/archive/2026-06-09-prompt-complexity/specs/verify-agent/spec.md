# verify-agent Delta Specification

Delta spec for `prompt-complexity` — streamlines headless constraint to consistent pattern.

## MODIFIED Requirements

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
