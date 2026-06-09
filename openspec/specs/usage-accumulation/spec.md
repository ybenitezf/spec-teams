# usage-accumulation Specification

## Purpose
TBD - created by archiving change redesign-dispatch-result. Update Purpose after archive.
## Requirements
### Requirement: Usage data accumulated from message_end events

The `dispatchAgent` function SHALL accumulate usage data from every `message_end` event received from the sub-agent process. Accumulated fields SHALL include: `inputTokens` (sum of `usage.input`), `outputTokens` (sum of `usage.output`), and `cost` (sum of `usage.cost.total`).

#### Scenario: Single message_end with usage data
- **WHEN** a `message_end` event is received with `message.usage = { input: 1200, output: 400, cost: { total: 0.0050 } }`
- **THEN** `state.inputTokens` is incremented by 1200
- **AND** `state.outputTokens` is incremented by 400
- **AND** `state.cost` is incremented by 0.0050

#### Scenario: Multiple message_end events accumulate
- **WHEN** three `message_end` events are received with usage.input values of 500, 800, and 300
- **THEN** `state.inputTokens` equals 1600 after all events

#### Scenario: message_end without usage data
- **WHEN** a `message_end` event is received with no `usage` property on the message
- **THEN** no usage fields are updated
- **AND** existing accumulated values remain unchanged

#### Scenario: message_end with partial usage data
- **WHEN** a `message_end` event has `usage: { input: 500 }` but no `output` or `cost`
- **THEN** only `state.inputTokens` is incremented by 500
- **AND** `state.outputTokens` and `state.cost` remain unchanged

### Requirement: Usage data accumulated from agent_end events

The `dispatchAgent` function SHALL also accumulate usage data from `agent_end` events by extracting the last assistant message's usage.

#### Scenario: agent_end with assistant message containing usage
- **WHEN** an `agent_end` event is received with `messages` array
- **AND** the last assistant message has `usage: { input: 2000, output: 800, cost: { total: 0.0100 } }`
- **THEN** `state.inputTokens` is incremented by 2000
- **AND** `state.outputTokens` is incremented by 800
- **AND** `state.cost` is incremented by 0.0100

#### Scenario: agent_end without assistant message
- **WHEN** an `agent_end` event is received with no assistant messages in the array
- **THEN** no usage fields are updated

### Requirement: Usage fields initialized to zero

The usage accumulation fields (`inputTokens`, `outputTokens`, `cost`) SHALL be initialized to 0 when a dispatch agent run begins.

#### Scenario: New dispatchAgent invocation
- **WHEN** `dispatchAgent` is called
- **THEN** `state.inputTokens`, `state.outputTokens`, and `state.cost` are set to 0

#### Scenario: Re-invocation of same agent
- **WHEN** the same agent is dispatched again after a previous run completed
- **THEN** accumulated usage fields are reset to 0 for the new run

### Requirement: Accumulated usage passed through pushUpdate details

The `pushUpdate` throttled callback SHALL include accumulated `inputTokens`, `outputTokens`, and `cost` fields in the `details` object passed to `onUpdate`.

#### Scenario: pushUpdate with accumulated usage
- **WHEN** `pushUpdate` is called after `state.inputTokens = 1500`, `state.outputTokens = 600`, `state.cost = 0.0080`
- **THEN** the `details` object in the `onUpdate` call includes `inputTokens: 1500`, `outputTokens: 600`, `cost: 0.0080`

#### Scenario: pushUpdate with zero accumulated usage
- **WHEN** `pushUpdate` is called before any `message_end` events with usage data
- **THEN** the `details` object includes `inputTokens: 0`, `outputTokens: 0`, `cost: 0`

### Requirement: Accumulated usage passed through final resolve details

The final `resolve` call in `dispatchAgent` SHALL include accumulated `inputTokens`, `outputTokens`, and `cost` in the result details passed to `renderResult`.

#### Scenario: Final resolve with accumulated usage
- **WHEN** the sub-agent process completes and `resolve` is called
- **AND** `state.inputTokens = 3200`, `state.outputTokens = 1400`, `state.cost = 0.0150`
- **THEN** the resolve details include `inputTokens: 3200`, `outputTokens: 1400`, `cost: 0.0150`

#### Scenario: Final resolve on error
- **WHEN** the sub-agent process fails and `resolve` is called with error
- **THEN** any accumulated usage data up to the failure point is included in resolve details

### Requirement: AgentState interface includes usage fields

The `AgentState` TypeScript interface SHALL define `inputTokens: number`, `outputTokens: number`, and `cost: number` fields.

#### Scenario: AgentState type definition
- **WHEN** the TypeScript code is compiled
- **THEN** `AgentState` includes `inputTokens`, `outputTokens`, and `cost` as `number` typed fields
- **AND** existing code using `AgentState` continues to compile without errors

