## Why

The spec-teams extension forces users to expand tool output (Ctrl+O) before seeing thinking text, and suppresses thinking entirely during streaming, even when they have explicitly set `hideThinkingBlock = false` in Pi settings. This is inconsistent with native Pi behavior, where `hideThinkingBlock` is the sole toggle — thinking streams incrementally in dimmed/italic color alongside output text, with no intermediate collapsed state and no streaming suppression. The extra gates create unnecessary friction for users who want to see thinking by default.

## What Changes

- Remove both `isPartial` and `options.expanded` from the `showFull` condition in `renderResult`, simplifying it to `const showFull = !shouldHideThinking`
- Thinking visibility is now controlled purely by `hideThinkingBlock`: when `false`, full thinking text is shown in both streaming and final states; when `true`, only the collapsed hint `▶ Thinking (N lines)` is shown
- Update the `thinking-collapse` spec to remove all references to `isPartial` and `options.expanded` as gates for thinking visibility; `hideThinkingBlock` is the sole control

## Capabilities

### New Capabilities

None. This change modifies existing behavior only.

### Modified Capabilities

- `thinking-collapse`: All requirements that reference `isPartial` or `options.expanded` as conditions for thinking visibility are updated. The "Thinking text is always collapsed in partial (streaming) view" requirement is removed entirely — streaming no longer suppresses thinking. The "Thinking text is collapsed by default in final result" and "Thinking respects hideThinkingBlock user setting" requirements are updated to use `hideThinkingBlock` as the sole control. Thinking hint format, inline rendering, and theming requirements remain unchanged.

## Impact

- **Code**: One-line change in `extensions/spec-teams.ts` (line 982) — replace `!isPartial && options.expanded && !shouldHideThinking` with `!shouldHideThinking`
- **Specs**: Delta spec for `openspec/specs/thinking-collapse/spec.md`
- **No breaking changes**: `hideThinkingBlock = true` behavior is unchanged (collapsed hint always shown); dashboard, sub-agent spawning, and Pi core are untouched
