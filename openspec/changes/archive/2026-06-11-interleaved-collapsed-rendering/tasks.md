## 1. Replace collapsed-mode rendering with interleaved loop + truncation

- [x] 1.1 In `renderResult()`, replace the `else` branch (lines ~1034–1058) with an interleaved loop that walks `orderedContent` segments in order, tracks cumulative text character count, renders thinking segments as `Markdown` with thinkingText color + italic (not counted toward limit), and inserts `Spacer(1)` at type transitions (same as the live/expanded path)
- [x] 1.2 Add truncation logic: maintain a `charsRendered` counter; for each text segment, if `charsRendered + segmentLength <= 4000`, render normally; otherwise slice the segment to `4000 - charsRendered`, append `\n... [truncated]`, render, and `break` out of the loop (no further segments rendered)
- [x] 1.3 In the interleaved loop, skip empty segments (`!segment.content.trim()`) same as the live/expanded path; skip thinking segments when `shouldHideThinking` is true
- [x] 1.4 Apply per-segment signal detection (via `splitOutputWithSignals`) to each rendered text segment, same as the live/expanded path

## 2. Simplify post-text thinking section

- [x] 2.1 Change the post-text thinking condition from `if (hasThinking && (shouldHideThinking || (!isPartial && !options.expanded)))` to `if (hasThinking && shouldHideThinking)` — only the collapsed hint case remains
- [x] 2.2 Remove the `else` branch that renders all thinking as a single concatenated `Markdown` block (thinking is now always inline in the content section)

## 3. Add hideThinkingBlock to pushUpdate() details

- [x] 3.1 In the `pushUpdate()` function, add `hideThinkingBlock: hideThinkingBlockSetting` to the `details` object so that live streaming updates include the user's thinking visibility preference

## 4. Verification

- [x] 4.1 Verify the collapsed final rendering path shows interleaved text/thinking blocks with spacers (structurally identical to live/expanded layout)
- [x] 4.2 Verify truncation at 4000 cumulative text characters, with thinking segments excluded from the count
- [x] 4.3 Verify `\n... [truncated]` marker appears when truncation occurs and no segments follow
- [x] 4.4 Verify expanded (Ctrl+O) shows full untruncated interleaved content
- [x] 4.5 Verify live streaming behavior is unchanged (already interleaved, no truncation)
- [x] 4.6 Verify `hideThinkingBlock: true` now works during live streaming (thinking segments suppressed, hint shown)
- [x] 4.7 Verify `hideThinkingBlock: false` shows thinking interleaved inline in both live and final views
- [x] 4.8 Verify no post-text full thinking block appears in any mode
