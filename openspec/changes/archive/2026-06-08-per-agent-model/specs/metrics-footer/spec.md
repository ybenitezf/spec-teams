## MODIFIED Requirements

### Requirement: Metrics footer shown in final result

When `renderResult` is called for a final result (not partial), a metrics footer SHALL be displayed at the bottom of the rendered output. The footer SHALL include: tool call count, input tokens (↑), output tokens (↓), cost in dollars, context window percentage, and the resolved model (🤖). The model portion SHALL be omitted when no model is available in the details.

#### Scenario: Final result with all metrics available
- **WHEN** `renderResult` is called with `options.isPartial` false
- **AND** the result details contain `toolCount: 5`, `inputTokens: 4200`, `outputTokens: 1100`, `cost: 0.0231`, `contextPct: 12`
- **AND** `details.model` is `"openrouter/anthropic/claude-sonnet-4"`
- **THEN** the metrics footer shows: `🔧 5 calls  ↑4.2k  ↓1.1k  $0.0231  ctx 12%  🤖 claude-sonnet-4`
- **AND** the footer is themed dim

#### Scenario: Final result with zero tool calls
- **WHEN** the result details contain `toolCount: 0`
- **THEN** the metrics footer shows `🔧 0 calls`

#### Scenario: Final result with zero cost
- **WHEN** the result details contain `cost: 0` (pricing not configured)
- **THEN** the metrics footer shows `$0` or omits the cost segment entirely

#### Scenario: Final result with empty or missing metrics
- **WHEN** the result details contain no `inputTokens`, `outputTokens`, or `cost` fields
- **THEN** the metrics footer still shows tool count and context percentage
- **AND** token and cost segments are omitted

#### Scenario: Model absent from details
- **WHEN** `renderResult` is called with `details.model` being `undefined` or falsy
- **THEN** the model portion (🤖 ...) SHALL NOT be appended to the footer
- **AND** the footer format SHALL be identical to pre-change behavior

### Requirement: Metrics footer shown in partial (streaming) result

When `renderResult` is called with `options.isPartial === true`, a live metrics status line SHALL be displayed showing current values that update with each render call. The status line SHALL include the resolved model when available.

#### Scenario: Partial result with streaming metrics
- **WHEN** `options.isPartial` is true
- **AND** the result details contain `toolCount: 3`, `inputTokens: 1500`, `contextPct: 25`
- **AND** `details.model` is `"openrouter/anthropic/claude-sonnet-4"`
- **THEN** the metrics line shows current tool count, accumulated input tokens, context%, and model
- **AND** output tokens and cost may be omitted if not yet known

#### Scenario: Partial result metrics update with each render
- **WHEN** `options.isPartial` is true
- **AND** new `pushUpdate` calls increment `toolCount` from 2 to 4 and `inputTokens` from 800 to 2100
- **THEN** the metrics line in the next render shows `🔧 4 calls  ↑2.1k  ctx 25%`

#### Scenario: Partial result with model absent
- **WHEN** `options.isPartial` is true
- **AND** `details.model` is `undefined` or falsy
- **THEN** the model portion (🤖 ...) SHALL NOT be appended to the metrics line
