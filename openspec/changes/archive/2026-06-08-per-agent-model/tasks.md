## 1. Model Resolution in dispatchAgent

- [x] 1.1 Flip model resolution priority in `dispatchAgent()` (line ~422): change from `ctx.model ? \`${ctx.model.provider}/${ctx.model.id}\` : "openrouter/google/gemini-3-flash-preview"` to `state.def.model || (ctx.model ? \`${ctx.model.provider}/${ctx.model.id}\` : "") || "openrouter/google/gemini-3-flash-preview"` so agent-level `model` from frontmatter takes precedence

## 2. Propagate Model in details Objects

- [x] 2.1 Add `model` property to `pushUpdate()` details object (line ~459): include the resolved model string so live streaming renderResult receives it
- [x] 2.2 Add `model` property to `execute()` success return details (line ~655): include the resolved model string in the final result
- [x] 2.3 Add `model` property to `execute()` error catch return details (line ~672): include the resolved model string even on error

## 3. Display Model in Metrics Footer

- [x] 3.1 Update `formatMetricsFooter()` (line ~131): extract compact model name from `details.model` (last `/` segment), append `  🤖 <short-model>` when model is present, skip when absent
