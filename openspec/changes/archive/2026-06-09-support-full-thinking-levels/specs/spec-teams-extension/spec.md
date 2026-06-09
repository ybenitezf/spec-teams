# spec-teams-extension Delta Spec

## MODIFIED Requirements

### Requirement: Agent Thinking Flag

The agent definition parser SHALL extract an optional `thinking` field from agent Markdown frontmatter. Valid values are `off`, `minimal`, `low`, `medium`, `high`, and `xhigh`. Legacy values `on` and `true` SHALL be mapped to `"medium"`. Legacy values `off` and `false` SHALL be mapped to `"off"`. Unrecognized values SHALL produce a console warning and fall back to `"medium"`. When absent, the field SHALL default to `"off"`.

#### Scenario: Valid thinking level accepted
- **WHEN** an agent `.md` file contains `thinking: high`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "high"`

#### Scenario: All six levels accepted
- **WHEN** an agent `.md` file contains any of `off`, `minimal`, `low`, `medium`, `high`, or `xhigh`
- **THEN** `parseAgentFile()` returns the definition with that exact string value

#### Scenario: Legacy `on` mapped to medium
- **WHEN** an agent `.md` file contains `thinking: on`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Legacy `off` mapped to off
- **WHEN** an agent `.md` file contains `thinking: off`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

#### Scenario: Legacy `true` mapped to medium
- **WHEN** an agent `.md` file contains `thinking: true`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Legacy `false` mapped to off
- **WHEN** an agent `.md` file contains `thinking: false`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

#### Scenario: Unrecognized value warned and defaulted
- **WHEN** an agent `.md` file contains `thinking: unknown`
- **THEN** a console warning is emitted indicating the unrecognized thinking level
- **AND** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Thinking field absent
- **WHEN** an agent `.md` file does NOT contain a `thinking` field
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

### Requirement: Thinking flag controls dispatched agent reasoning

The `dispatchAgent()` function SHALL use the agent definition's `thinking` value to set the `--thinking` flag when spawning the child `pi` process. The value SHALL be passed directly as `--thinking <level>` where `<level>` is one of the six valid thinking level strings.

#### Scenario: Agent with explicit level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "high"`
- **THEN** the spawned `pi` process receives `--thinking high`

#### Scenario: Agent with off level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "off"`
- **THEN** the spawned `pi` process receives `--thinking off`

#### Scenario: Agent with medium level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "medium"`
- **THEN** the spawned `pi` process receives `--thinking medium`

#### Scenario: Legacy mapped value produces valid CLI flag
- **WHEN** a task is dispatched to an agent whose `thinking: on` was mapped to `"medium"`
- **THEN** the spawned `pi` process receives `--thinking medium`

#### Scenario: Agent without thinking field spawns with off
- **WHEN** a task is dispatched to an agent whose definition has no `thinking` field
- **THEN** the spawned `pi` process receives `--thinking off`
