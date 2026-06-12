## Why

The `extensions/spec-teams.ts` extension (1497 lines) has zero automated tests. It is a complex OpenSpec workflow dispatcher that registers tools, commands, and event handlers with nuanced logic (team YAML parsing, frontmatter extraction, status signal detection, metrics formatting, interleaved rendering, subprocess coordination). Without tests, there is no safety net for refactoring, no regression prevention, and no executable documentation of expected behavior. Every change to the extension carries risk of silently breaking dispatching, rendering, or prompt generation.

## What Changes

- Extract 13 pure/helper functions from `spec-teams.ts` into a co-located `extensions/spec-teams-utils.ts` module (following the plan-mode pattern), marked with a testability comment
- Write ~60-80 unit test cases for the extracted pure functions using vitest, with `fs` mocked where needed for file-reading functions
- Write integration tests using Pi SDK primitives (`DefaultResourceLoader`, `SessionManager.inMemory()`, `SettingsManager.inMemory()`) to verify extension loading, tool/command registration, system prompt generation, and result rendering
- Add vitest configuration (`vitest.config.ts`), test scripts to `package.json`, and devDependencies
- Wire `spec-teams.ts` to import from `spec-teams-utils.ts` instead of inlining the extracted functions

## Capabilities

### New Capabilities

- `spec-teams-unit-tests`: Unit tests for all pure utility functions extracted from `spec-teams.ts`, verifying `parseTeamsYaml`, `displayName`, `encodeCwd`, `parseAgentFile`, `formatDuration`, `formatTokens`, `detectStatusSignal`, `formatMetricsFooter`, `splitOutputWithSignals`, `computeColumns`, `renderAgentCell`, `isLocalPath`, and `scanAgentDirs` with deterministic inputs and mocked filesystem access
- `spec-teams-integration-tests`: Integration tests for the spec-teams extension as a whole, verifying extension loading via `DefaultResourceLoader`, tool registration (`dispatch_agent`), command registration (`specs-team`, `specs-list`, `specs-grid`), system prompt generation from the `before_agent_start` handler, and tool rendering (`renderCall`, `renderResult`)

### Modified Capabilities

None. The existing extension behavior is not changed — only code is reorganized and tests are added.

## Impact

- **New files**: `extensions/spec-teams-utils.ts`, `tests/unit/spec-teams-utils.test.ts`, `tests/integration/spec-teams.test.ts`, `vitest.config.ts`
- **Modified files**: `extensions/spec-teams.ts` (replaces inline function definitions with imports from `spec-teams-utils.ts`), `package.json` (adds test scripts and vitest devDependency)
- **No API changes**: All exported types and the exported default function remain identical
- **No runtime impact**: Extracted functions are pure — no behavioral difference
