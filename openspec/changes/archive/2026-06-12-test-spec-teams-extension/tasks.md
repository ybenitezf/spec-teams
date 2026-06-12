## 1. Project setup

- [x] 1.1 Add vitest to `devDependencies` in `package.json` (`vitest@^3`)
- [x] 1.2 Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`
- [x] 1.3 Create `vitest.config.ts` at project root with `include: ["tests/**/*.test.ts"]`, `environment: "node"`
- [x] 1.4 Run `npm install` (or equivalent) to install vitest

## 2. Extract pure functions into spec-teams-utils.ts

- [x] 2.1 Create `extensions/spec-teams-utils.ts` with header comment `/**\n * Pure utility functions for spec-teams. Extracted for testability.\n */`
- [x] 2.2 Extract and export `isLocalPath` (no dependencies, pure)
- [x] 2.3 Extract and export `displayName` (no dependencies, pure)
- [x] 2.4 Extract and export `encodeCwd` (no dependencies, pure)
- [x] 2.5 Extract and export `parseTeamsYaml` (no dependencies, pure)
- [x] 2.6 Extract and export `formatDuration` (no dependencies, pure)
- [x] 2.7 Extract and export `formatTokens` (no dependencies, pure)
- [x] 2.8 Extract and export `detectStatusSignal` (no dependencies, pure)
- [x] 2.9 Extract and export `formatMetricsFooter` (depends on `formatTokens` — import from same file or call internally)
- [x] 2.10 Extract and export `splitOutputWithSignals` (no dependencies, pure)
- [x] 2.11 Extract and export `computeColumns` (no dependencies, pure)
- [x] 2.12 Extract and export `renderAgentCell` (depends on `displayName`, and imports `truncateToWidth`/`visibleWidth` from `@earendil-works/pi-tui`)
- [x] 2.13 Extract and export `parseAgentFile` (depends on `readFileSync` — calls it directly, mockable in tests)
- [x] 2.14 Extract and export `scanAgentDirs` (depends on `parseAgentFile`, `existsSync`, `readdirSync` — call directly, mockable)
- [x] 2.15 Also export the `AgentDef` interface and `AgentState` interface from `spec-teams-utils.ts` (shared types needed by tests)

## 3. Wire spec-teams.ts to use extracted utils

- [x] 3.1 Add `import { isLocalPath, displayName, encodeCwd, parseTeamsYaml, formatDuration, formatTokens, detectStatusSignal, formatMetricsFooter, splitOutputWithSignals, computeColumns, renderAgentCell, parseAgentFile, scanAgentDirs } from "./spec-teams-utils.ts";` at top of `spec-teams.ts`
- [x] 3.2 Remove the inline definitions of all 13 extracted functions from `spec-teams.ts`
- [x] 3.3 Remove the inline `AgentDef` and `AgentState` interfaces (now imported from utils)
- [x] 3.4 Verify the extension still type-checks and loads (manual smoke test: `pi -e extensions/spec-teams.ts -p "hello"` — expect no errors)

## 4. Write unit tests for spec-teams-utils.ts

- [x] 4.1 Create `tests/unit/spec-teams-utils.test.ts`
- [x] 4.2 Add tests for `parseTeamsYaml` (7 scenarios: single team, multi-team, empty, no members, orphan lines, comment-like lines, special chars)
- [x] 4.3 Add tests for `displayName` (4 scenarios: single word, multi-word, single letters, already title case)
- [x] 4.4 Add tests for `encodeCwd` (4 scenarios: Unix path, Windows path, root path, relative path)
- [x] 4.5 Add tests for `parseAgentFile` (13 scenarios: valid file, thinking level, model, opt-in, no opt-in, missing name, no frontmatter, read error, legacy thinking, absent thinking, default tools, empty description — mock `readFileSync` via `vi.mock("fs")`)
- [x] 4.6 Add tests for `formatDuration` (8 scenarios: 0ms, <1s, 1s, seconds only, minutes+seconds, minutes only, hours+minutes, hours only)
- [x] 4.7 Add tests for `formatTokens` (5 scenarios: <1k, 1k, 3.5k, 12.5k, 1.5M)
- [x] 4.8 Add tests for `detectStatusSignal` (7 scenarios: all 5 signals, no signal, signal not at line start)
- [x] 4.9 Add tests for `formatMetricsFooter` (5 scenarios: minimal, with tokens, with cost, with model, separator)
- [x] 4.10 Add tests for `splitOutputWithSignals` (5 scenarios: single signal, no signal, multiple signals, empty, whitespace preservation)
- [x] 4.11 Add tests for `computeColumns` (4 scenarios: 1 agent, wide, narrow, forcing single column)
- [x] 4.12 Add tests for `renderAgentCell` (6 scenarios: idle, running, done, error, narrow cell, correct padding — construct mock AgentState objects and mock theme)
- [x] 4.13 Add tests for `isLocalPath` (5 scenarios: ./, ../, absolute, @scope/package, plain name)
- [x] 4.14 Add tests for `scanAgentDirs` (5 scenarios: project agents found, collision resolution, no dirs exist, non-md files ignored, invalid files skipped, case-insensitive collision — mock `existsSync`, `readdirSync`, `readFileSync` via `vi.mock("fs")`)

## 5. Write integration tests

- [x] 5.1 Create `tests/integration/spec-teams.test.ts`
- [x] 5.2 Add test: extension loads via `DefaultResourceLoader` without errors
- [x] 5.3 Add test: `dispatch_agent` tool is registered with expected label and description
- [x] 5.4 Add test: `dispatch_agent` tool has `agent` (string) and `task` (string) parameters
- [x] 5.5 Add tests: `specs-team`, `specs-list`, `specs-grid` commands are registered
- [x] 5.6 Add test: `before_agent_start` handler returns system prompt with identity, team name, lifecycle sections, and rules
- [x] 5.7 Add test: `renderCall` produces valid `Text` TUI component with agent name and task preview
- [x] 5.8 Add test: `renderCall` truncates long task strings (>60 chars) with `...`
- [x] 5.9 Add test: `renderResult` with done status produces `Box` component with children
- [x] 5.10 Add test: `renderResult` with error status contains error indicator
- [x] 5.11 Add test: `renderResult` with partial/dispatching status contains running indicator
- [x] 5.12 Add test: `renderResult` includes metrics footer with tokens, tools, cost
- [x] 5.13 Add test: `renderResult` without details produces plain Text component

## 6. Verify and finalize

- [x] 6.1 Run `npx vitest run` — all unit tests pass
- [x] 6.2 Run `npx vitest run` — all integration tests pass
- [x] 6.3 Run the extension smoke test (`pi -e extensions/spec-teams.ts -p "hello"`) to confirm extraction didn't break runtime behavior
- [x] 6.4 Review test output for clarity — each test description clearly states what is being tested