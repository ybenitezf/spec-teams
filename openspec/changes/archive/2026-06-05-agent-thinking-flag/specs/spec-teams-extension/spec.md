## ADDED Requirements

### Requirement: Agent Thinking Flag
The agent definition parser SHALL extract an optional `thinking` field from agent Markdown frontmatter, accepting values `on` or `off`. When absent, the field SHALL default to `off`.

#### Scenario: Thinking flag present and on
- **WHEN** an agent `.md` file contains `thinking: on`
- **THEN** `parseAgentFile()` returns a definition with `thinking: true`

#### Scenario: Thinking flag present and off
- **WHEN** an agent `.md` file contains `thinking: off`
- **THEN** `parseAgentFile()` returns a definition with `thinking: false`

#### Scenario: Thinking flag absent
- **WHEN** an agent `.md` file does NOT contain a `thinking` field
- **THEN** `parseAgentFile()` returns a definition with `thinking: false` (default `off`)

#### Scenario: Unknown thinking value
- **WHEN** an agent `.md` file contains `thinking: unknown`
- **THEN** `parseAgentFile()` treats it as `off` and does NOT fail

### Requirement: Thinking flag controls dispatched agent reasoning
The `dispatchAgent()` function SHALL use the agent definition's `thinking` value to set the `--thinking` flag when spawning the child `pi` process. When `thinking` is `true`, the child process SHALL be spawned with `--thinking on`. When `thinking` is `false` or absent, the child process SHALL be spawned with `--thinking off`.

#### Scenario: Agent with thinking on gets reasoning
- **WHEN** a task is dispatched to an agent with `thinking: true`
- **THEN** the spawned `pi` process receives `--thinking on`

#### Scenario: Agent with thinking off gets no reasoning
- **WHEN** a task is dispatched to an agent with `thinking: false` or no `thinking` field
- **THEN** the spawned `pi` process receives `--thinking off`

#### Scenario: Existing behavior preserved for agents without thinking field
- **WHEN** a task is dispatched to an agent whose definition has no `thinking` field
- **THEN** behavior is identical to before this change (`--thinking off`)
- **AND** the change is non-breaking
