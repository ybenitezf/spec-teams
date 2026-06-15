## 1. Fix vitest.config.ts for Portable Resolution

- [x] 1.1 Replace hardcoded `PI_CODING_AGENT` and `PI_TUI` constants with `require.resolve()` via `createRequire` from `node:module`
- [x] 1.2 Add `resolvePkg()` helper that tries `require.resolve()` for each Pi SDK alias (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `@earendil-works/pi-ai`, `typebox`)
- [x] 1.3 Verify `npx vitest run` passes locally after the config change (all 153 tests)

## 1b. Replace resolvePkg with stubs for CI portability

- [x] 1.4 Create `tests/__stubs__/pi-coding-agent.ts` with minimal implementations of ExtensionAPI, SettingsManager, DefaultResourceLoader, and utility functions
- [x] 1.5 Create `tests/__stubs__/pi-tui.ts` with stub Box, Text, Container, Markdown, Spacer, Key, matchesKey, and string utilities
- [x] 1.6 Create `tests/__stubs__/typebox.ts` with stub Type builder (Type.String, Type.Object, etc.)
- [x] 1.7 Update vitest.config.ts aliases to fall back to test stubs when packages are not installed
- [x] 1.8 Verify all 153 tests pass with stub fallback

## 2. Create GitHub Actions Workflow

- [x] 2.1 Create `.github/workflows/ci.yml` with trigger on `push` to `main` and `pull_request` targeting `main`
- [x] 2.2 Add concurrency group (`${{ github.ref }}`) with `cancel-in-progress: true`
- [x] 2.3 Define `test` job with `runs-on: ubuntu-latest` and `strategy.matrix.node-version: [18, 20, 22]`
- [x] 2.4 Add `actions/checkout@v6` as first step
- [x] 2.5 Add `actions/setup-node@v6` with `node-version: ${{ matrix.node-version }}` and `cache: 'npm'`
- [x] 2.6 Add `npm ci` install step
- [x] 2.7 Add `npm test` step

## 3. Verify and Document

- [x] 3.1 Push branch to GitHub
- [ ] 3.2 Verify all three Node.js matrix jobs pass in CI (requires creating a PR from add-ci-workflow → main)
- [ ] 3.3 Verify concurrency: push rapidly to PR branch and confirm older runs are cancelled (requires PR to be open)
- [ ] 3.1a Create pull request from `add-ci-workflow` → `main` to trigger CI
- [x] 3.4 Add CI status badge to README.md
