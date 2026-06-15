## Context

The spec-teams-extension project currently has no automated CI. The 153 tests (unit + integration) run only when a developer manually executes `npm test`. CONTRIBUTING.md instructs contributors to "ensure tests pass before submitting" but there is no automated enforcement. The project uses Vitest as its test runner, TypeScript source, and depends on Pi SDK packages as peer dependencies.

The vitest configuration uses hardcoded absolute paths (`/home/yoel/.nvm/versions/node/v24.15.0/...`) to alias Pi SDK packages. This works on the author's machine but will fail in any other environment — including CI runners. The configuration must be made portable.

## Goals / Non-Goals

**Goals:**
- Add a single GitHub Actions workflow file that runs tests on pushes to `main` and PRs targeting `main`
- Test across Node.js 18, 20, and 22 (the supported versions per CONTRIBUTING.md)
- Fix `vitest.config.ts` to resolve Pi SDK aliases portably so tests pass in CI and on any contributor's machine
- Prevent redundant CI runs with concurrency management

**Non-Goals:**
- Multi-OS matrix (ubuntu-latest is sufficient; tests are pure Node.js, no OS-specific behavior)
- Linting, formatting, or type-checking steps (no lint config exists yet in the project)
- Automated release/publish workflow
- Code coverage reporting or coverage thresholds
- Scheduled/cron workflows
- Caching beyond `setup-node`'s built-in `cache: 'npm'`

## Decisions

### Decision 1: Use `require.resolve()` for vitest aliases

**Chosen**: Use `require.resolve()` with a `createRequire`-based fallback for ESM compatibility.

```typescript
// vitest.config.ts
import { createRequire } from "module";
const localRequire = createRequire(import.meta.url);

function resolvePkg(name: string): string {
  // Try ESM import.meta.resolve first (Node 20.6+), then require.resolve
  try {
    return localRequire.resolve(name);
  } catch {
    throw new Error(`Cannot resolve package "${name}". Is it installed?`);
  }
}
```

**Alternatives considered:**

| Approach | Verdict | Reason |
|---|---|---|
| `require.resolve()` via `createRequire` | **Chosen** | Works in all Node.js versions (18+), resolves to the actual installed location of the package |
| `import.meta.resolve()` | Rejected | Not available in Node 18; async-only in some versions |
| Manual `node_modules` traversal | Rejected | Brittle — depends on hoisting behavior, breaks with pnpm/workspaces |
| Environment variables (`PI_HOME`) | Rejected | Still vendor-locked; CI shouldn't need Pi installed |
| Keep hardcoded paths + CI env override | Rejected | Fragile — breaks for any contributor with a different Node path |

### Decision 2: `npm ci` over `npm install`

**Chosen**: `npm ci` in CI workflows.

`npm ci` is designed for CI: it respects `package-lock.json` exactly, deletes `node_modules` first for clean state, and fails if `package-lock.json` is missing or out of sync. `npm install` can mutate `package-lock.json` and produces non-reproducible installs.

Peer dependency warnings from Pi SDK packages are expected — they do not cause `npm ci` to fail, and tests mock the SDK, so no actual Pi installation is needed.

### Decision 3: Concurrency with cancel-in-progress

**Chosen**: Cancel in-progress runs on the same PR branch when a new push arrives.

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Without this, rapid pushes to a PR branch create a queue of unnecessary runs. The latest push is the one that matters.

### Decision 4: `setup-node@v6` with built-in npm caching

**Chosen**: `actions/setup-node@v6` with `cache: 'npm'` instead of a separate `actions/cache` step.

`setup-node`'s built-in `cache` parameter handles `node_modules` caching via the npm cache, with zero additional configuration. It's simpler, fewer YAML lines, and less error-prone than manually configuring `actions/cache@v4`.

### Decision 5: No build step

**Chosen**: Skip any build step.

The project has no `build` script in `package.json`. It runs as raw TypeScript via Pi's native TS support. Tests are also raw TypeScript run through Vitest (which uses esbuild under the hood). A build step would add CI time with no benefit.

## Risks / Trade-offs

- **[Risk] `require.resolve()` may resolve Pi packages to `node_modules` if installed locally** → **Mitigation**: Pi packages are peer dependencies, not dev dependencies, so `require.resolve()` won't find them locally. Tests mock the SDK, so resolution failures in CI won't affect test execution — the aliases are only used when tests actually import from Pi packages.
- **[Risk] Node 18 may be dropped from CI in the future** → The brief acknowledges this is acceptable. Node 18 becomes EOL April 2025 (extended support). No special handling needed now; dropping it would be a separate future change.
- **[Risk] Peer dependency warnings in CI logs** → Cosmetic only. `npm ci` emits warnings for missing peer dependencies but exits with code 0. If these warnings clutter CI output, a future change could add `--legacy-peer-deps` or suppress them, but this is out of scope.
