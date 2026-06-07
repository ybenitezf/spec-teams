## 1. Fix renderAgentRow truncation

- [x] 1.1 Remove the local `truncate` closure in `renderAgentRow()`
- [x] 1.2 Replace `truncate(name, ...)` with `truncateToWidth(name, ...)` 
- [x] 1.3 Replace `truncate(desc, ...)` with `truncateToWidth(desc, ...)`
- [x] 1.4 Add post-render safety check: if `visibleWidth(result) > width`, re-truncate with `truncateToWidth(result, width)`

## 2. Audit footer renderer

- [x] 2.1 Review footer `render()` for the same class of width overflow bug
- [x] 2.2 Verify footer uses `visibleWidth()` for measurement (it does) and `truncateToWidth()` for final output (it does) — confirm no action needed

## 3. Validation

- [x] 3.1 Reproduce the crash: dispatch a verify agent (which produces ✅/❌ emoji) and confirm the crash occurs on the unfixed code
- [x] 3.2 Verify the fix: same dispatch scenario with fixed code, confirm no crash and rows render correctly
- [x] 3.3 Edge case: test with extremely narrow terminal (width < 40) to verify the fallback branch also uses width-safe truncation
- [x] 3.4 Edge case: test with CJK characters in agent descriptions (e.g., Japanese agent names) to verify `truncateToWidth` handles multi-cell characters
