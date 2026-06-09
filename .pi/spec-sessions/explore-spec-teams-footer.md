# Findings: Does spec-teams change the Pi UI footer?

## Problem Space
Investigate whether loading the spec-teams extension modifies or replaces the main Pi UI footer, and if so, what information is lost or gained.

## Existing Architecture

### Pi's Built-in Footer (`FooterComponent`)
Located in `dist/modes/interactive/components/footer.js`, the built-in footer renders **3 lines**:

1. **PWD line**: Working directory + git branch + session name  
   (e.g., `~/projects/my-app (main) • session-1`)
2. **Stats line**: Cumulative token stats + cost + context % with color coding  
   (e.g., `↑4.2k ↓1.1k R2.1k W800 CH62.5% $0.023 (sub) 15.0%/128k (auto)  anthropic/claude-sonnet-4`)
3. **Extension statuses line**: One line with all `ctx.ui.setStatus()` entries, sorted alphabetically

The built-in footer also:
- Shows cache read/write stats and cache hit rate (R, W, CH%)
- Shows "(sub)" indicator for OAuth subscription models
- Color-codes context percentage: >90% = error, >70% = warning
- Shows thinking level indicator (e.g., "• medium")
- Shows provider prefix when multiple providers available
- Has auto-compact indicator "(auto)"
- Handles session name display
- Uses `FooterDataProvider` for git branch, extension statuses, and reactive branch change watching

### Extension Footer Replacement Mechanism
`ctx.ui.setFooter(factoryOrUndefined)` — introduced in Pi for extensions:
- **With a factory function**: Removes the built-in `FooterComponent` from the UI tree entirely, replaces it with the custom component returned by the factory
- **With `undefined`**: Restores the built-in footer
- Only one custom footer can be active at a time (calling `setFooter` again disposes the previous one)

### Spec-Teams Extension Footer (`extensions/spec-teams.ts`, line ~1191)
On `session_start`, the extension calls `_ctx.ui.setFooter(...)` which **completely replaces** the built-in footer with a custom one that renders **1 line**:

```
 model-id · teamName    [#########-] 45%
```

Components:
- **Left side**: `model · activeTeamName` (dim + accent colors)
- **Right side**: A 10-character context bar `[###-------] 45%` showing context usage
- No PWD, no git branch, no token stats, no cost, no cache stats, no thinking level, no session name, no extension statuses

## What Is Lost

When spec-teams replaces the footer, these built-in features are **completely absent**:

| Feature | Built-in | Spec-Teams |
|---|---|---|
| PWD / working directory | ✅ | ❌ |
| Git branch | ✅ | ❌ |
| Session name | ✅ | ❌ |
| Input tokens (↑) | ✅ | ❌ |
| Output tokens (↓) | ✅ | ❌ |
| Cache read (R) | ✅ | ❌ |
| Cache write (W) | ✅ | ❌ |
| Cache hit rate (CH%) | ✅ | ❌ |
| Cost ($) | ✅ | ❌ |
| Subscription indicator (sub) | ✅ | ❌ |
| Context % with color coding | ✅ (3 levels) | ⚠️ (plain, no color) |
| Context window size | ✅ (e.g., `/128k`) | ❌ |
| Auto-compact indicator | ✅ | ❌ |
| Thinking level indicator | ✅ | ❌ |
| Model with provider prefix | ✅ (cond.) | ⚠️ (bare model ID) |
| Extension statuses (setStatus) | ✅ | ❌ |
| Team name | ❌ | ✅ |
| Visual context bar | ❌ | ✅ |

## Edge Cases and Gotchas
- `footerData` parameter is passed to the factory but **not used** by spec-teams — the extension doesn't call `getGitBranch()`, `getExtensionStatuses()`, or `onBranchChange()`, so reactive git branch updates are lost
- The built-in footer renders 2-3 lines; spec-teams renders 1 line. This might cause a visual layout shift
- The `setStatus("spec-team", ...)` call from spec-teams still writes to `footerDataProvider`, but those statuses never appear because the built-in footer (which renders them) is replaced
- If another extension also calls `setFooter`, whichever runs wins — it's last-writer-wins, not additive

## Alternatives Considered

1. **Use `setStatus()` instead of `setFooter()`** — spec-teams could display team info via `ctx.ui.setStatus("spec-team", "Team: explore (3)")` which would appear in the built-in footer's extension statuses line. This preserves all built-in info while adding team context. However, this sacrifices the compact grid widget in the footer area and the visual context bar.

2. **Hybrid approach: compose built-in data into custom footer** — pass `footerData` through and include PWD, stats, and extension statuses alongside team info. More complex but preserves all information.

3. **Keep custom footer as-is** — minimal, focused on team dispatching workflow, accepts the information loss as a reasonable tradeoff for a dedicated dispatching mode.

4. **Make the footer toggle-able** — add a command like `/specs-footer` that switches between built-in and custom, letting the user choose.

## User Motivations
The user wants to understand the impact of loading spec-teams on the Pi UI. The answer is clear and unambiguous: **yes, it replaces the entire footer**, losing significant diagnostic information.