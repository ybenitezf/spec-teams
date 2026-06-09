## ADDED Requirements

### Requirement: Metrics footer shown in final result

When `renderResult` is called for a final result (not partial), a metrics footer SHALL be displayed at the bottom of the rendered output. The footer SHALL include: tool call count, input tokens (↑), output tokens (↓), cost in dollars, and context window percentage.

#### Scenario: Final result with all metrics available
- **WHEN** `renderResult` is called with `options.isPartial` false
- **AND** the result details contain `toolCount: 5`, `inputTokens: 4200`, `outputTokens: 1100`, `cost: 0.0231`, `contextPct: 12`
- **THEN** the metrics footer shows: `🔧 5 calls  ↑4.2k ↓1.1k  $0.0231  ctx 12%`
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

### Requirement: Metrics footer shown in partial (streaming) result

When `renderResult` is called with `options.isPartial === true`, a live metrics status line SHALL be displayed showing current values that update with each render call.

#### Scenario: Partial result with streaming metrics
- **WHEN** `options.isPartial` is true
- **AND** the result details contain `toolCount: 3`, `inputTokens: 1500`, `contextPct: 25`
- **THEN** the metrics line shows current tool count, accumulated input tokens, and context%
- **AND** output tokens and cost may be omitted if not yet known

#### Scenario: Partial result metrics update with each render
- **WHEN** `options.isPartial` is true
- **AND** new `pushUpdate` calls increment `toolCount` from 2 to 4 and `inputTokens` from 800 to 2100
- **THEN** the metrics line in the next render shows `🔧 4 calls  ↑2.1k  ctx 25%`

### Requirement: Token counts use human-readable format

Token counts in the metrics footer SHALL be formatted using a `formatTokens` helper: counts under 1000 shown as-is, 1000-9999 shown with one decimal and `k` suffix (e.g., `4.2k`), 10000+ shown as rounded `k` (e.g., `42k`), 1000000+ shown with `M` suffix.

#### Scenario: Small token count
- **WHEN** input tokens are 856
- **THEN** displayed as `↑856`

#### Scenario: Medium token count
- **WHEN** input tokens are 4200
- **THEN** displayed as `↑4.2k`

#### Scenario: Large token count
- **WHEN** input tokens are 25000
- **THEN** displayed as `↑25k`

#### Scenario: Very large token count
- **WHEN** input tokens are 1500000
- **THEN** displayed as `↑1.5M`

### Requirement: Cost display format

Cost in the metrics footer SHALL be displayed with a `$` prefix and 4 decimal places (e.g., `$0.0231`). When cost is exactly 0, it SHALL display as `$0`.

#### Scenario: Non-zero cost
- **WHEN** cost is 0.0231
- **THEN** displayed as `$0.0231`

#### Scenario: Zero cost
- **WHEN** cost is 0 or undefined
- **THEN** displayed as `$0`

#### Scenario: Very small cost
- **WHEN** cost is 0.0001
- **THEN** displayed as `$0.0001`

### Requirement: Context percentage format

Context window percentage SHALL be displayed as a whole-number percentage rounded via `Math.round()` with the `ctx` prefix and `%` suffix (e.g., `ctx 12%`).

#### Scenario: Context percentage rounding
- **WHEN** contextPct is 12.7
- **THEN** displayed as `ctx 13%`

#### Scenario: Zero context percentage
- **WHEN** contextPct is 0
- **THEN** displayed as `ctx 0%`

#### Scenario: Context percentage over 100
- **WHEN** contextPct exceeds 100 (overflow)
- **THEN** the value is still displayed as-is (e.g., `ctx 145%`)
