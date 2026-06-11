## Why

The spec-teams dispatcher widget renders sub-agent output with no visual margins — content sits flush against the left edge of the terminal. The widget intentionally uses `renderShell: "self"` to escape Pi's default Box frame, but without any replacement framing the output feels cramped and visually indistinguishable from surrounding conversation text. Adding explicit padding and a subtle tinted background via a manual Box wrapper will give the widget the same polished visual framing that Pi's custom message components provide.

## What Changes

- `renderResult` wraps its Container in an explicit `Box(2, 1, theme.bg("customMessageBg"))` from `@earendil-works/pi-tui`, adding 2 cells of horizontal padding, 1 cell vertical padding, and a subtle `customMessageBg` background tint
- `Box` is added to the existing `@earendil-works/pi-tui` import in `extensions/spec-teams.ts`
- 1 cell vertical padding is added, matching Pi's custom message widget convention (`Box(1, 1, ...)`) and providing consistent visual separation above and below widget content
- Both loading (partial) and final (done/error) states receive identical framing — no state-specific logic

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dispatch-result-rendering`: The rendered output now includes an explicit `Box` wrapper providing horizontal padding and `customMessageBg` background, replacing the previous visually unadorned self-rendered content.

## Impact

- **File**: `extensions/spec-teams.ts` — `renderResult` function and import statement
- **No API changes**: The Box is internal to `renderResult`; `ToolExecutionContext` and `ToolExecutionComponent` are unaffected
- **No configuration**: Padding and background are fixed, no commands or settings added
- **No streaming impact**: Both partial and final render paths go through the same Container → Box wrapping
- **No dashboard changes**: Only the dispatcher widget is affected; dashboard grid widget is unchanged
