## ADDED Requirements

### Requirement: Pure utility functions extracted into spec-teams-utils.ts

The extension SHALL have a co-located `extensions/spec-teams-utils.ts` module containing 13 pure/helper functions extracted from `extensions/spec-teams.ts`.

#### Scenario: File exists with extraction comment
- **WHEN** the project is checked out
- **THEN** `extensions/spec-teams-utils.ts` exists
- **AND** the file begins with `/**\n * Pure utility functions for spec-teams. Extracted for testability.\n */`

#### Scenario: All 13 functions are exported
- **WHEN** `spec-teams-utils.ts` is inspected
- **THEN** the following functions are exported: `isLocalPath`, `displayName`, `encodeCwd`, `parseTeamsYaml`, `formatDuration`, `formatTokens`, `detectStatusSignal`, `formatMetricsFooter`, `splitOutputWithSignals`, `computeColumns`, `renderAgentCell`, `parseAgentFile`, `scanAgentDirs`

#### Scenario: Main extension imports from utils
- **WHEN** `extensions/spec-teams.ts` is inspected
- **THEN** it imports the extracted functions from `./spec-teams-utils.ts` using the `.ts` extension
- **AND** the inline function definitions are removed from `spec-teams.ts`

### Requirement: Unit tests cover parseTeamsYaml

The unit test suite SHALL verify `parseTeamsYaml` with deterministic YAML-like input strings and expected output maps.

#### Scenario: Single team with members
- **WHEN** `parseTeamsYaml` is called with `"team-a:\n  - agent1\n  - agent2"`
- **THEN** it returns `{ "team-a": ["agent1", "agent2"] }`

#### Scenario: Multiple teams
- **WHEN** `parseTeamsYaml` is called with `"alpha:\n  - a\nbeta:\n  - b\n  - c"`
- **THEN** it returns `{ alpha: ["a"], beta: ["b", "c"] }`

#### Scenario: Empty input
- **WHEN** `parseTeamsYaml` is called with `""`
- **THEN** it returns `{}`

#### Scenario: Teams with no members
- **WHEN** `parseTeamsYaml` is called with `"lonely:"`
- **THEN** it returns `{ lonely: [] }`

#### Scenario: Lines with no team context are ignored
- **WHEN** `parseTeamsYaml` is called with `"  - orphan\n  - another"`
- **THEN** it returns `{}`

#### Scenario: Comment-like lines are treated as team headers
- **WHEN** `parseTeamsYaml` is called with `"#team:\n  - member"`
- **THEN** the `#team:` line IS matched as a team header
- **AND** the `- member` line is added to the `#team` team members

#### Scenario: Team names with special characters
- **WHEN** `parseTeamsYaml` is called with `"my-team_v2:\n  - agent"`
- **THEN** it returns `{ "my-team_v2": ["agent"] }`

### Requirement: Unit tests cover displayName

The unit test suite SHALL verify `displayName` transforms kebab-case agent names to Title Case display names.

#### Scenario: Single word
- **WHEN** `displayName` is called with `"worker"`
- **THEN** it returns `"Worker"`

#### Scenario: Multi-word kebab-case
- **WHEN** `displayName` is called with `"spec-teams-dispatcher"`
- **THEN** it returns `"Spec Teams Dispatcher"`

#### Scenario: Single letter words
- **WHEN** `displayName` is called with `"a-b-c"`
- **THEN** it returns `"A B C"`

#### Scenario: Already title case words
- **WHEN** `displayName` is called with `"Worker-Agent"`
- **THEN** it returns `"Worker Agent"` (uppercased first letters preserved, rest lowered)

### Requirement: Unit tests cover encodeCwd

The unit test suite SHALL verify `encodeCwd` transforms file paths into session directory-safe names.

#### Scenario: Standard Unix path
- **WHEN** `encodeCwd` is called with `"/home/user/projects/my-app"`
- **THEN** it returns `"--home-user-projects-my-app--"`

#### Scenario: Path with Windows backslashes
- **WHEN** `encodeCwd` is called with `"C:\\Users\\name\\project"`
- **THEN** it returns `"--C--Users-name-project--"`

#### Scenario: Root path
- **WHEN** `encodeCwd` is called with `"/"`
- **THEN** it returns `"----"`

#### Scenario: Relative path
- **WHEN** `encodeCwd` is called with `"./local/path"`
- **THEN** it returns `"--.-local-path--"`

### Requirement: Unit tests cover parseAgentFile

The unit test suite SHALL verify `parseAgentFile` extracts agent definitions from Markdown files with YAML frontmatter, with mocked filesystem access.

#### Scenario: Valid agent file
- **WHEN** `parseAgentFile` is called with a path to a file containing `---\nname: worker\ndescription: Does work\ntools: read,bash\n---\n\nYou are a worker agent.`
- **THEN** it returns an object with `name: "worker"`, `description: "Does work"`, `tools: "read,bash"`, `systemPrompt: "You are a worker agent."`

#### Scenario: File with thinking level
- **WHEN** `parseAgentFile` is called with a file having `thinking: high` in frontmatter
- **THEN** the returned object has `thinking: "high"`

#### Scenario: File with model
- **WHEN** `parseAgentFile` is called with a file having `model: openrouter/anthropic/claude-sonnet-4.5` in frontmatter
- **THEN** the returned object has `model: "openrouter/anthropic/claude-sonnet-4.5"`

#### Scenario: File with opt-in flag
- **WHEN** `parseAgentFile` is called with a file having `opt-in: true` in frontmatter
- **THEN** the returned object has `optIn: true`

#### Scenario: File without opt-in flag
- **WHEN** `parseAgentFile` is called with a file having no `opt-in` field
- **THEN** the returned object has `optIn: false`

#### Scenario: Missing name field
- **WHEN** `parseAgentFile` is called with a file that has frontmatter but no `name` field
- **THEN** it returns `null`

#### Scenario: File without frontmatter
- **WHEN** `parseAgentFile` is called with a file containing no YAML frontmatter (`---`)
- **THEN** it returns `null`

#### Scenario: File read error
- **WHEN** `parseAgentFile` is called with a path where `readFileSync` throws
- **THEN** it returns `null`

#### Scenario: Legacy thinking: on maps to medium
- **WHEN** `parseAgentFile` is called with `thinking: on`
- **THEN** the returned object has `thinking: "medium"`

#### Scenario: Legacy thinking: true maps to medium
- **WHEN** `parseAgentFile` is called with `thinking: true`
- **THEN** the returned object has `thinking: "medium"`

#### Scenario: Legacy thinking: off maps to off
- **WHEN** `parseAgentFile` is called with `thinking: off`
- **THEN** the returned object has `thinking: "off"`

#### Scenario: Legacy thinking: false maps to off
- **WHEN** `parseAgentFile` is called with `thinking: false`
- **THEN** the returned object has `thinking: "off"`

#### Scenario: Absent thinking defaults to off
- **WHEN** `parseAgentFile` is called with no `thinking` field in frontmatter
- **THEN** the returned object has `thinking: "off"`

#### Scenario: Default tools when absent
- **WHEN** `parseAgentFile` is called with no `tools` field in frontmatter
- **THEN** the returned object has `tools: "read,grep,find,ls"`

#### Scenario: Empty description defaults to empty string
- **WHEN** `parseAgentFile` is called with no `description` field in frontmatter
- **THEN** the returned object has `description: ""`

### Requirement: Unit tests cover formatDuration

The unit test suite SHALL verify `formatDuration` formats milliseconds into human-readable strings.

#### Scenario: Zero milliseconds
- **WHEN** `formatDuration` is called with `0`
- **THEN** it returns `"0s"`

#### Scenario: Less than one second
- **WHEN** `formatDuration` is called with `500`
- **THEN** it returns `"0s"`

#### Scenario: Exactly one second
- **WHEN** `formatDuration` is called with `1000`
- **THEN** it returns `"1s"`

#### Scenario: Seconds only
- **WHEN** `formatDuration` is called with `45000`
- **THEN** it returns `"45s"`

#### Scenario: Minutes and seconds
- **WHEN** `formatDuration` is called with `125000`
- **THEN** it returns `"2m 5s"`

#### Scenario: Minutes only
- **WHEN** `formatDuration` is called with `180000`
- **THEN** it returns `"3m"`

#### Scenario: Hours and minutes
- **WHEN** `formatDuration` is called with `5400000`
- **THEN** it returns `"1h 30m"`

#### Scenario: Hours only
- **WHEN** `formatDuration` is called with `7200000`
- **THEN** it returns `"2h"`

### Requirement: Unit tests cover formatTokens

The unit test suite SHALL verify `formatTokens` formats token counts into compact human-readable strings.

#### Scenario: Less than 1000
- **WHEN** `formatTokens` is called with `500`
- **THEN** it returns `"500"`

#### Scenario: Exactly 1000
- **WHEN** `formatTokens` is called with `1000`
- **THEN** it returns `"1.0k"`

#### Scenario: Between 1k and 10k
- **WHEN** `formatTokens` is called with `3500`
- **THEN** it returns `"3.5k"`

#### Scenario: 10k or more, less than 1M
- **WHEN** `formatTokens` is called with `12500`
- **THEN** it returns `"13k"` (rounded)

#### Scenario: 1M or more
- **WHEN** `formatTokens` is called with `1500000`
- **THEN** it returns `"1.5M"`

### Requirement: Unit tests cover detectStatusSignal

The unit test suite SHALL verify `detectStatusSignal` extracts status signals from output text.

#### Scenario: need-input signal
- **WHEN** `detectStatusSignal` is called with `"Some text\nStatus: need-input\nMore text"`
- **THEN** it returns `{ signal: "need-input", line: "Status: need-input" }`

#### Scenario: ready-to-propose signal
- **WHEN** `detectStatusSignal` is called with `"Summary\nStatus: ready-to-propose"`
- **THEN** it returns `{ signal: "ready-to-propose" }`

#### Scenario: blocked signal
- **WHEN** `detectStatusSignal` is called with `"Status: blocked"`
- **THEN** it returns `{ signal: "blocked" }`

#### Scenario: done-exploring signal
- **WHEN** `detectStatusSignal` is called with `"Status: done-exploring\n"`
- **THEN** it returns `{ signal: "done-exploring" }`

#### Scenario: done signal
- **WHEN** `detectStatusSignal` is called with `"Status: done"`
- **THEN** it returns `{ signal: "done" }`

#### Scenario: No signal present
- **WHEN** `detectStatusSignal` is called with `"Just some text"`
- **THEN** it returns `null`

#### Scenario: Signal not at line start
- **WHEN** `detectStatusSignal` is called with `"prefix Status: done"`
- **THEN** it returns `null` (signal must be at beginning of line)

### Requirement: Unit tests cover formatMetricsFooter

The unit test suite SHALL verify `formatMetricsFooter` builds the compact metrics footer string.

#### Scenario: Minimal details
- **WHEN** `formatMetricsFooter` is called with `{ toolCount: 5 }`
- **THEN** it returns a string containing `"🔧 5 calls"` and `"$0"` and `"ctx 0%"`

#### Scenario: With token counts
- **WHEN** `formatMetricsFooter` is called with `{ toolCount: 3, inputTokens: 1500, outputTokens: 800 }`
- **THEN** it returns a string containing `"↑1.5k"` and `"↓800"`

#### Scenario: With cost
- **WHEN** `formatMetricsFooter` is called with `{ toolCount: 1, cost: 0.0123 }`
- **THEN** it returns a string containing `"$0.0123"`

#### Scenario: With model
- **WHEN** `formatMetricsFooter` is called with `{ toolCount: 0, model: "openrouter/anthropic/claude-sonnet-4.5" }`
- **THEN** it returns a string containing `"🤖 claude-sonnet-4.5"`

#### Scenario: Separator between fields
- **WHEN** `formatMetricsFooter` returns
- **THEN** fields are separated by `" · "`

### Requirement: Unit tests cover splitOutputWithSignals

The unit test suite SHALL verify `splitOutputWithSignals` splits text around Status signal lines into typed segments.

#### Scenario: Text with single signal
- **WHEN** `splitOutputWithSignals` is called with `"Hello\nStatus: done\nWorld"`
- **THEN** it returns `[{ type: "text", content: "Hello\n" }, { type: "signal", content: "Status: done", signalName: "done" }, { type: "text", content: "\nWorld" }]`

#### Scenario: Text with no signal
- **WHEN** `splitOutputWithSignals` is called with `"Just plain text"`
- **THEN** it returns `[{ type: "text", content: "Just plain text" }]`

#### Scenario: Text with multiple signals
- **WHEN** `splitOutputWithSignals` is called with `"A\nStatus: need-input\nB\nStatus: done\nC"`
- **THEN** it returns segments for both signals in order

#### Scenario: Empty input
- **WHEN** `splitOutputWithSignals` is called with `""`
- **THEN** it returns `[]`

#### Scenario: Signal with surrounding whitespace text segments preserved
- **WHEN** `splitOutputWithSignals` is called with `"text\nStatus: blocked\n\nmore"`
- **THEN** text before and after the signal are separate text segments

### Requirement: Unit tests cover computeColumns

The unit test suite SHALL verify `computeColumns` calculates the optimal grid column count given constraints.

#### Scenario: One agent, wide terminal
- **WHEN** `computeColumns` is called with `(1, 80, 3)`
- **THEN** it returns `1`

#### Scenario: Six agents, wide terminal, max 3
- **WHEN** `computeColumns` is called with `(6, 80, 3)`
- **THEN** it returns `3`

#### Scenario: Six agents, narrow terminal, max 6
- **WHEN** `computeColumns` is called with `(6, 30, 6)`
- **THEN** it returns `2`

#### Scenario: Narrow terminal forces single column
- **WHEN** `computeColumns` is called with `(3, 12, 3)`
- **THEN** it returns `1` (cell width < 12 chars)

### Requirement: Unit tests cover renderAgentCell

The unit test suite SHALL verify `renderAgentCell` produces correctly padded, color-coded agent status cells for the dashboard grid.

#### Scenario: Idle agent cell
- **WHEN** `renderAgentCell` is called with an idle state, cellWidth 20, and a mock theme
- **THEN** the result contains the idle icon and agent name
- **AND** the visible width of the result equals cellWidth

#### Scenario: Running agent cell
- **WHEN** `renderAgentCell` is called with a running state
- **THEN** the result contains a running indicator icon

#### Scenario: Done agent cell
- **WHEN** `renderAgentCell` is called with a done state
- **THEN** the result contains a checkmark icon

#### Scenario: Error agent cell
- **WHEN** `renderAgentCell` is called with an error state
- **THEN** the result contains an error icon

#### Scenario: Narrow cell drops percentage
- **WHEN** `renderAgentCell` is called with cellWidth less than required for name + pct
- **THEN** the percentage string is omitted from the result

#### Scenario: Cell is correctly padded
- **WHEN** `renderAgentCell` is called with any state and cellWidth
- **THEN** the visible width of the result exactly equals cellWidth

### Requirement: Unit tests cover isLocalPath

The unit test suite SHALL verify `isLocalPath` correctly identifies local file paths.

#### Scenario: Relative path with ./
- **WHEN** `isLocalPath` is called with `"./extensions/spec-teams.ts"`
- **THEN** it returns `true`

#### Scenario: Relative path with ../
- **WHEN** `isLocalPath` is called with `"../some/extension.ts"`
- **THEN** it returns `true`

#### Scenario: Absolute path
- **WHEN** `isLocalPath` is called with `"/home/user/ext.ts"`
- **THEN** it returns `true`

#### Scenario: Package name (not local)
- **WHEN** `isLocalPath` is called with `"@scope/package"`
- **THEN** it returns `false`

#### Scenario: Plain package name (not local)
- **WHEN** `isLocalPath` is called with `"spec-teams-extension"`
- **THEN** it returns `false`

### Requirement: Unit tests cover scanAgentDirs

The unit test suite SHALL verify `scanAgentDirs` discovers agent files from configured directories with correct collision resolution, with mocked filesystem access.

#### Scenario: Agents found in project directory
- **WHEN** `scanAgentDirs` is called with a cwd where `agents/` contains `worker.md`
- **THEN** it returns an array containing the parsed `worker` agent definition

#### Scenario: Project agent wins over user-level collision
- **WHEN** `agents/worker.md` exists in project AND `~/.pi/agent/agents/worker.md` exists
- **THEN** only the project-level definition appears in the result

#### Scenario: No agent directories exist
- **WHEN** `scanAgentDirs` is called and none of the configured directories exist
- **THEN** it returns an empty array `[]`

#### Scenario: Non-.md files are ignored
- **WHEN** a directory contains `notes.txt` alongside `agent.md`
- **THEN** only `agent.md` is processed

#### Scenario: Invalid agent files are skipped
- **WHEN** a directory contains a `.md` file with no valid frontmatter
- **THEN** that file is excluded from results

#### Scenario: Case-insensitive name collision
- **WHEN** `agents/Worker.md` and `.pi/agents/worker.md` both define agent `worker`
- **THEN** only the first definition found (project-level) appears in results

### Requirement: vitest configuration is present and working

The project SHALL have a `vitest.config.ts` that allows running tests with `npx vitest run` in any environment, not just the project author's machine.

#### Scenario: vitest config exists
- **WHEN** the project root is inspected
- **THEN** `vitest.config.ts` exists with valid TypeScript configuration

#### Scenario: vitest config uses portable path resolution
- **WHEN** `vitest.config.ts` is inspected
- **THEN** package aliases are resolved using `require.resolve()` via `createRequire` from `node:module`
- **AND** no hardcoded absolute paths (e.g., `/home/yoel/`) are present in the file

#### Scenario: vitest can run unit tests
- **WHEN** `npx vitest run tests/unit/` is executed
- **THEN** tests execute without configuration errors
- **AND** all test files in `tests/unit/` are discovered

#### Scenario: vitest can run all tests
- **WHEN** `npx vitest run` is executed
- **THEN** all test files in `tests/` are discovered and executed

#### Scenario: vitest config resolves packages from node_modules
- **WHEN** Pi SDK packages are installed in `node_modules` (as peer dependencies or dev dependencies)
- **THEN** `require.resolve('@earendil-works/pi-coding-agent')` resolves the package path
- **AND** the resolved path is used as the alias value

#### Scenario: vitest config handles missing peer dependencies gracefully
- **WHEN** Pi SDK packages are NOT installed locally (CI environment without Pi)
- **THEN** `require.resolve()` calls for aliases may fail
- **AND** tests that mock the SDK still run successfully because the aliases are only used when tests actually import those packages
