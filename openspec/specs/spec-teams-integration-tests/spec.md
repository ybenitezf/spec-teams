## ADDED Requirements

### Requirement: Extension loads via DefaultResourceLoader

The integration test suite SHALL verify that the spec-teams extension loads successfully using Pi SDK's `DefaultResourceLoader` without file I/O.

#### Scenario: Extension factory is accepted
- **WHEN** `DefaultResourceLoader` is instantiated with `extensionFactories: [specTeamsExtension]`
- **AND** the extension is loaded
- **THEN** no error is thrown during loading
- **AND** the extension's `session_start` event handler is available

#### Scenario: In-memory session manager is usable
- **WHEN** `SessionManager.inMemory()` is used for test isolation
- **THEN** session entries can be read and written without touching the filesystem

### Requirement: dispatch_agent tool is registered

The integration test suite SHALL verify that the `dispatch_agent` tool is registered when the extension loads and has the expected properties.

#### Scenario: Tool exists after extension load
- **WHEN** the spec-teams extension is loaded via `DefaultResourceLoader`
- **THEN** a tool named `dispatch_agent` is registered
- **AND** the tool has a `label` property
- **AND** the tool has a `description` property containing "Dispatch"

#### Scenario: Tool parameters are defined
- **WHEN** the `dispatch_agent` tool registration is inspected
- **THEN** it requires `agent` (string) and `task` (string) parameters

### Requirement: Commands are registered

The integration test suite SHALL verify that `specs-team`, `specs-list`, and `specs-grid` commands are registered.

#### Scenario: specs-team command exists
- **WHEN** the spec-teams extension loads
- **THEN** a command named `specs-team` is registered with a non-empty description

#### Scenario: specs-list command exists
- **WHEN** the spec-teams extension loads
- **THEN** a command named `specs-list` is registered with a non-empty description

#### Scenario: specs-grid command exists
- **WHEN** the spec-teams extension loads
- **THEN** a command named `specs-grid` is registered with a non-empty description

### Requirement: before_agent_start handler produces system prompt

The integration test suite SHALL verify that the `before_agent_start` event handler returns a system prompt override with the expected sections.

#### Scenario: Handler returns prompt with identity section
- **WHEN** the `before_agent_start` event is fired after extension load
- **THEN** the handler returns an object with a `systemPrompt` string
- **AND** the system prompt contains `"OpenSpec-aware dispatcher agent"`

#### Scenario: System prompt includes active team name
- **WHEN** the `before_agent_start` handler generates the prompt
- **THEN** the system prompt contains a line with `"Active Team:"`

#### Scenario: System prompt includes lifecycle sections
- **WHEN** the `before_agent_start` handler generates the prompt
- **THEN** the system prompt contains `"### Explore"` and `"### Propose"` and `"### Apply"` headers

#### Scenario: System prompt includes rules section
- **WHEN** the `before_agent_start` handler generates the prompt
- **THEN** the system prompt contains `"NEVER try to read, write, or execute code directly"`

### Requirement: renderCall produces valid rendering output

The integration test suite SHALL verify that the `dispatch_agent` tool's `renderCall` function produces valid TUI output when called with mock theme and arguments.

#### Scenario: renderCall with agent name
- **WHEN** `renderCall` is invoked with `{ agent: "worker", task: "do work" }` and a mock theme
- **THEN** the result is a `Text` TUI component (from `@earendil-works/pi-tui`)
- **AND** the text content includes `"dispatch_agent"` and `"worker"`

#### Scenario: renderCall with long task truncates
- **WHEN** `renderCall` is invoked with a `task` string longer than 60 characters
- **THEN** the task portion in the rendered text ends with `"..."`

#### Scenario: renderCall with unknown agent renders placeholder
- **WHEN** `renderCall` is invoked with `{ agent: "nonexistent", task: "" }`
- **THEN** the rendered text uses `"?"` as the agent name fallback (wait — it uses the agent arg as-is, so it would show "nonexistent")
- **THEN** wait — re-examine: the renderCall uses `(args as any).agent || "?"`, so if agent is provided it renders it
- **THEN** the rendered text contains `"nonexistent"` as the agent name

### Requirement: renderResult produces valid rendering output

The integration test suite SHALL verify that `dispatch_agent` tool's `renderResult` function produces valid TUI output.

#### Scenario: renderResult with done result
- **WHEN** `renderResult` is invoked with a result object where `details.status === "done"` and `details.agent === "worker"` and a mock theme
- **THEN** the result is a `Box` TUI component
- **AND** the box contains child components

#### Scenario: renderResult with error result
- **WHEN** `renderResult` is invoked with `details.status === "error"`
- **THEN** the rendered output contains an error indicator

#### Scenario: renderResult with partial/dispatching result
- **WHEN** `renderResult` is invoked with `details.status === "dispatching"` and `options.isPartial = true`
- **THEN** the rendered output contains a running indicator

#### Scenario: renderResult includes metrics footer
- **WHEN** `renderResult` is invoked with any completed result
- **THEN** the rendered output includes a metrics line with token counts, tool count, and cost

#### Scenario: renderResult with no details produces plain text
- **WHEN** `renderResult` is invoked with a result that has no `details` property
- **THEN** it returns a `Text` component with the first content item's text

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

### Requirement: Test scripts are added to package.json

The project's `package.json` SHALL include test execution scripts.

#### Scenario: test script exists
- **WHEN** `package.json` is inspected
- **THEN** a `"test"` script is defined that runs vitest

#### Scenario: devDependencies include vitest
- **WHEN** `package.json` is inspected
- **THEN** `vitest` is listed in `devDependencies` with a version constraint
