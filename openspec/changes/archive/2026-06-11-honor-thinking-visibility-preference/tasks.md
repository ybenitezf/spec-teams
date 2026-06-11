## 1. Implementation

- [x] 1.1 Replace `!isPartial && options.expanded && !shouldHideThinking` with `!shouldHideThinking` at line 982 of `extensions/spec-teams.ts`

## 2. Verification

- [x] 2.1 Verify `hideThinkingBlock = false` + final result → thinking shown expanded without Ctrl+O
- [x] 2.2 Verify `hideThinkingBlock = false` + streaming → thinking shown as full text (not collapsed hint)
- [x] 2.3 Verify `hideThinkingBlock = true` + final result → collapsed hint `▶ Thinking (N lines)` shown
- [x] 2.4 Verify `hideThinkingBlock = true` + streaming → collapsed hint `▶ Thinking (N lines)` shown
