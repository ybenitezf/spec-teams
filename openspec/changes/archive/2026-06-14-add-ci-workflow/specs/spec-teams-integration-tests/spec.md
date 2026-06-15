## MODIFIED Requirements

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
