## Context

The `extensions/spec-teams.ts` extension (1497 lines) is a TypeScript module that exports a default function `(pi: ExtensionAPI) => void`. It registers a tool (`dispatch_agent`), three commands (`specs-team`, `specs-list`, `specs-grid`), event handlers (`before_agent_start`, `session_start`, `agent_end`), and a status widget. The extension has zero test coverage.

The Pi ecosystem provides the `plan-mode` extension as a reference for the extraction pattern: pure functions are extracted into a co-located `utils.ts` module with the comment `"Pure utility functions for <extension>. Extracted for testability."`, and the main extension imports them with `.ts` extensions for jiti/vitest compatibility.

The Pi SDK also provides in-memory test primitives:
- `DefaultResourceLoader({ extensionFactories: [...] })` loads extensions inline without file I/O
- `SessionManager.inMemory()` provides a session store with no filesystem dependency
- `SettingsManager.inMemory()` provides settings without reading auth.json
- `ModelRegistry.inMemory(authStorage)` avoids auth.json lookups

## Goals / Non-Goals

**Goals:**
- Extract 13 pure/helper functions from `spec-teams.ts` into `spec-teams-utils.ts`
- Achieve ~60-80 unit test cases covering all extracted pure functions
- Integration tests that verify extension loading, tool/command registration, system prompt generation, and tool rendering
- Zero file I/O in tests (all mocked or in-memory)
- Follow the plan-mode extraction pattern exactly

**Non-Goals:**
- Testing `dispatchAgent()` subprocess spawning (needs `child_process` mocking, deferred)
- TUI interactive flows (`ctx.ui.select`, `ctx.ui.confirm`, `ctx.ui.notify`)
- End-to-end agent dispatch workflows
- Code coverage thresholds (can add later)
- Modifying extension behavior or API surface

## Decisions

### Decision 1: Extraction pattern follows plan-mode exactly

**Why**: The plan-mode extension is the canonical reference in the Pi ecosystem. Following its pattern ensures consistency and leverages existing knowledge.

**Pattern**:
- File: `extensions/spec-teams-utils.ts` (co-located with `spec-teams.ts`)
- Comment: `/**\n * Pure utility functions for spec-teams. Extracted for testability.\n */`
- Imports use `.ts` extension: `import { ... } from "./spec-teams-utils.ts";`
- All extracted functions are standalone, side-effect-free (or have only filesystem side-effects that can be mocked)

**Alternatives considered**:
- `src/utils/spec-teams.ts` subdirectory — rejected: plan-mode pattern is co-located, simpler
- Inline tests with in-source test blocks — rejected: vitest is standard, more maintainable

### Decision 2: Two test tiers — unit and integration

**Why**: Unit tests provide fast, deterministic coverage of pure logic. Integration tests verify the extension's integration with the Pi SDK (loading, registration, event handlers) without spawning real processes.

**Unit tests** (`tests/unit/spec-teams-utils.test.ts`):
- Test each extracted function in isolation
- Mock `fs` (specifically `readFileSync`, `existsSync`, `readdirSync`) for `parseAgentFile` and `scanAgentDirs`
- All inputs are deterministic; no randomness, no timers, no networking
- Expected coverage: all branches, edge cases, error paths

**Integration tests** (`tests/integration/spec-teams.test.ts`):
- Load the extension via `DefaultResourceLoader`
- Use `SessionManager.inMemory()` and `SettingsManager.inMemory()`
- Verify tool and command registrations are present
- Verify `before_agent_start` handler produces expected system prompt structure
- Verify `renderCall` and `renderResult` produce valid rendering output (with mock theme objects)
- Omit model parameter on the resource loader to avoid API calls

### Decision 3: Mock theme objects for rendering tests

**Why**: `renderCall` and `renderResult` depend on `@earendil-works/pi-tui` classes (`Text`, `Box`, `Container`, `Markdown`, `Spacer`) and a theme object. Rather than importing the full TUI, we construct lightweight mock theme objects that exercise the rendering code paths.

**Mock theme shape**:
```typescript
const mockTheme = {
  fg: (color: string, text: string) => `[${color}]${text}[/${color}]`,
  bg: (color: string, text: string) => `[bg:${color}]${text}[/bg:${color}]`,
  bold: (text: string) => `**${text}**`,
  strikethrough: (text: string) => `~~${text}~~`,
};
```

### Decision 4: vitest configuration

**Why**: vitest is the standard test framework in the Pi ecosystem, compatible with jiti for TypeScript transpilation, and supports the `.ts` extension convention natively.

**Configuration**:
- `vitest.config.ts` at project root
- Environment: `node`
- Include: `tests/**/*.test.ts`
- Setup: minimal — only vitest imports

### Decision 5: Functions to extract

13 functions are extracted from `spec-teams.ts` that are pure or have only filesystem dependencies (mockable):

| # | Function | Dependencies | Testable Purely? |
|---|----------|-------------|-----------------|
| 1 | `isLocalPath` | none | yes |
| 2 | `displayName` | none | yes |
| 3 | `encodeCwd` | none | yes |
| 4 | `parseTeamsYaml` | none | yes |
| 5 | `formatDuration` | none | yes |
| 6 | `formatTokens` | none | yes |
| 7 | `detectStatusSignal` | none | yes |
| 8 | `formatMetricsFooter` | `formatTokens` (re-exported) | yes |
| 9 | `splitOutputWithSignals` | none | yes |
| 10 | `computeColumns` | none | yes |
| 11 | `renderAgentCell` | `displayName`, `truncateToWidth`, `visibleWidth` (imported from pi-tui) | yes (with mock theme) |
| 12 | `parseAgentFile` | `readFileSync` (mockable) | yes (with mocked fs) |
| 13 | `scanAgentDirs` | `parseAgentFile`, `existsSync`, `readdirSync` (mockable) | yes (with mocked fs) |

`renderAgentCell` imports `truncateToWidth` and `visibleWidth` from `@earendil-works/pi-tui`. These are pure string functions and do not need mocking beyond what vitest provides.

## Risks / Trade-offs

- **[Risk] Extraction could introduce import bugs at module load time** → Mitigation: The extension already runs module-level code with try/catch guards. The extracted functions are all function declarations — no module-level side effects. The only module-level code that stays in `spec-teams.ts` is the path resolution and flag parsing, which is already guarded.
- **[Risk] `renderAgentCell` test requires real `truncateToWidth` / `visibleWidth` from pi-tui** → Mitigation: These are pure string utility functions with no side effects. They can be imported directly from the peer dependency. If unavailable in test environment, mock them with simple implementations.
- **[Risk] Integration tests depend on Pi SDK exports that may not be available in all versions** → Mitigation: List `@earendil-works/pi-coding-agent` as a devDependency (it's already a peerDependency). The in-memory test primitives (`SessionManager.inMemory`, etc.) are part of the public SDK.
- **[Risk] Mocking fs for `parseAgentFile`/`scanAgentDirs` could diverge from real behavior** → Mitigation: Tests use vitest's `vi.mock('fs')` with simple in-memory file maps. The functions are tested for all branches (file found, file missing, invalid YAML frontmatter, collision handling).
