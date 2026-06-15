## Why

The spec-teams-extension project has no CI/CD pipeline. Tests are only run manually ("ensure tests pass before submitting" in CONTRIBUTING.md). Without automated test execution on PRs and pushes to main, regressions go undetected and contribution friction is high. Adding a lightweight CI workflow ensures every change is validated before merge.

## What Changes

- Add `.github/workflows/ci.yml` — a GitHub Actions workflow that runs `npm test` on every push to `main` and every pull request targeting `main`
- Test against Node.js 18, 20, and 22 via a version matrix
- Use `npm ci` for clean, reproducible installs
- Enable concurrency with cancel-in-progress to avoid redundant runs
- Fix `vitest.config.ts` to use portable path resolution instead of hardcoded absolute paths (`/home/yoel/.nvm/...`) so tests pass in any environment

## Capabilities

### New Capabilities

- `ci-workflow`: Automated test execution via GitHub Actions on pushes to main and pull requests targeting main, with a Node.js version matrix (18, 20, 22) and concurrency management

### Modified Capabilities

- `spec-teams-unit-tests`: The vitest configuration must use portable path resolution (removing hardcoded `/home/yoel/...` paths) so tests run in CI and other environments
- `spec-teams-integration-tests`: Same vitest configuration change applies — integration tests also depend on the portable alias resolution

## Impact

- **New file**: `.github/workflows/ci.yml` (GitHub Actions workflow)
- **Modified file**: `vitest.config.ts` (resolve aliases using `require.resolve()` or `createRequire()` instead of absolute paths)
- **CI runtime**: ~60-90s per matrix entry (install + 153 tests)
- **No dependency changes**: vitest is already a devDependency; no new packages needed
- **No breaking changes**: the vitest config fix is backward-compatible with local development
