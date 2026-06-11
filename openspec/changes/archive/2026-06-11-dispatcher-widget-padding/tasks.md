## 1. Import

- [x] 1.1 Add `Box` to the existing `@earendil-works/pi-tui` import in `extensions/spec-teams.ts`

## 2. Wrap Container in Box

- [x] 2.1 In `renderResult`, create `const box = new Box(2, 1, (t: string) => theme.bg("customMessageBg", t))` at the return point
- [x] 2.2 Add the existing `container` as a child via `box.addChild(container)`
- [x] 2.3 Return `box` instead of `container`

## 3. Verification

- [x] 3.1 Verify both loading (partial) and final (done/error) states receive the Box wrapping by checking that the Box wraps the Container at the single return point used by both states
- [x] 3.2 Verify no regressions: `renderCall` output, dashboard grid widget, streaming pipeline, and other agent rendering are unaffected (only `renderResult` was changed)
