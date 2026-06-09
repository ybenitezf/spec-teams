## 1. Compute dispatcher session totals

- [x] 1.1 In the `setFooter` render function, compute dispatcher session totals by iterating `_ctx.sessionManager.getBranch()`, summing `usage.input`, `usage.output`, and `usage.cost.total` from assistant messages, and counting `dispatch_agent` tool call entries
- [x] 1.2 Verify that the iteration pattern matches Pi's built-in footer and the `custom-footer.ts` example: filter entries where `e.type === "message"` and `e.message.role === "assistant"`, then access `(e.message as any).usage`

## 2. Compute combined subagent totals

- [x] 2.1 Sum `inputTokens`, `outputTokens`, `cost`, and `toolCount` from all entries in the `agentStates` Map
- [x] 2.2 Add dispatcher session totals (from step 1) to the subagent totals to produce combined aggregate values
- [x] 2.3 Compute total tool call count: dispatcher `dispatch_agent` calls (from step 1) + sum of all subagent `toolCount` values

## 3. Build details object and render second line

- [x] 3.1 Construct a `details` object with the combined totals (`toolCount`, `inputTokens`, `outputTokens`, `cost`), main session `contextPct` from `_ctx.getContextUsage()?.percent`, and `model` from `_ctx.model?.id`
- [x] 3.2 Call `formatMetricsFooter(details)` to produce the metrics string
- [x] 3.3 Change the render function's return from a two-element array `[line1, line2]` to a single-element array with metrics suffixed by team name: `[line]` where `line = truncateToWidth(formatMetricsFooter(details) + " · " + teamName, width)`
- [x] 3.4 Apply `truncateToWidth(line2, width)` to the metrics line before returning to prevent line-width exceptions on narrow terminals

## 4. Verify and test

- [x] 4.1 Manual test: Launch Pi with `-e ./extensions/spec-teams.ts`, verify the footer shows 1 line with the format `🔧 N calls  ↑inputs  ↓outputs  $cost  ctx M%  🤖 short-model · teamName`
- [x] 4.2 Manual test: Dispatch a subagent and observe the metrics line updating (tool count, tokens, cost increase)
- [x] 4.3 Manual test on a narrow terminal (~40 columns) to verify truncation works without exceptions
- [x] 4.4 Verify the team name appears at the end of the footer line as ` · teamName` suffix
