# per-agent-model Specification

## Purpose
Define the model resolution priority for agent dispatch: agent definition model takes precedence over dispatcher model, resolved model is propagated through details objects, and displayed in the metrics footer.

## Requirements

### Requirement: Agent model override takes precedence in dispatch

The `dispatchAgent()` function SHALL resolve the model with priority: agent definition `model` field → dispatcher `ctx.model` → hardcoded fallback (`openrouter/google/gemini-3-flash-preview`). When a model is present in the agent's Markdown frontmatter `model` field, it SHALL be used regardless of the dispatcher's model.

#### Scenario: Agent has model, dispatcher has different model

- **WHEN** `dispatchAgent()` is called for an agent whose `AgentDef.model` is `"openrouter/anthropic/claude-sonnet-4"`
- **AND** `ctx.model` is `{ provider: "openrouter", id: "google/gemini-3-flash-preview" }`
- **THEN** the spawned `pi` process receives `--model openrouter/anthropic/claude-sonnet-4`

#### Scenario: Agent has no model, dispatcher has model

- **WHEN** `dispatchAgent()` is called for an agent whose `AgentDef.model` is `undefined`
- **AND** `ctx.model` is `{ provider: "openrouter", id: "google/gemini-3-flash-preview" }`
- **THEN** the spawned `pi` process receives `--model openrouter/google/gemini-3-flash-preview`

#### Scenario: Neither agent nor dispatcher has a model

- **WHEN** `dispatchAgent()` is called for an agent whose `AgentDef.model` is `undefined`
- **AND** `ctx.model` is `undefined`
- **THEN** the spawned `pi` process receives `--model openrouter/google/gemini-3-flash-preview` (the hardcoded fallback)

#### Scenario: Agent model is empty string

- **WHEN** `dispatchAgent()` is called for an agent whose `AgentDef.model` is `""` (falsy)
- **THEN** the empty string SHALL NOT be used as the model
- **AND** resolution falls through to `ctx.model` and then the hardcoded fallback as normal

### Requirement: Resolved model is propagated in details objects

The `dispatch_agent` tool SHALL include the resolved model string (the one actually passed to `pi --model`) in the `details` object of:
- **Streaming updates**: `pushUpdate()` calls during agent execution
- **Final result**: The `execute()` method's successful return value
- **Error result**: The `execute()` method's error catch return value

#### Scenario: Streaming update includes model

- **WHEN** `pushUpdate()` is called during agent execution
- **THEN** the `details` object contains a `model` property with the resolved model string
- **AND** the value is the same model passed to the child `pi` process

#### Scenario: Final result includes model

- **WHEN** `execute()` returns a successful result after agent completion
- **THEN** the `details` object contains a `model` property with the resolved model string

#### Scenario: Error result includes model

- **WHEN** `execute()` catches an error during agent dispatch
- **THEN** the `details` object contains a `model` property with the resolved model string
- **AND** the model reflects what was (or would be) passed to the child `pi` process

### Requirement: Metrics footer displays resolved model

The `formatMetricsFooter()` function SHALL append the resolved model to the metrics line using a robot emoji (🤖) followed by a compact model identifier, taken from the `model` property of the `details` object. The compact identifier SHALL be the last path segment of the model string (after the final `/`).

#### Scenario: Model present in details

- **WHEN** `formatMetricsFooter()` is called with `details.model = "openrouter/anthropic/claude-sonnet-4"`
- **THEN** the returned string ends with `🤖 claude-sonnet-4`
- **AND** the model portion SHALL be separated from preceding metrics by two spaces (matching existing spacing)

#### Scenario: No model in details

- **WHEN** `formatMetricsFooter()` is called with `details.model` being `undefined` or falsy
- **THEN** the model portion (🤖 ...) SHALL NOT be appended
- **AND** the returned string is identical to the pre-change behavior (only 🔧, ↑, ↓, $, ctx%)

#### Scenario: Model with single-segment name

- **WHEN** the resolved model string has no `/` separators (e.g., `claude-sonnet-4`)
- **THEN** the compact identifier SHALL be the full string as-is
