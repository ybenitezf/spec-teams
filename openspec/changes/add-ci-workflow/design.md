## Context

The spec-teams-extension project currently has no automated CI. The 153 tests (unit + integration) run only when a developer manually executes `npm test`. CONTRIBUTING.md instructs contributors to "ensure tests pass before submitting" but there is no automated enforcement. The project uses Vitest as its test runner, TypeScript source, and depends on Pi SDK packages as peer dependencies.

The vitest configuration uses hardcoded absolute paths (`/home/yoel/.nvm/versions/node/v24.15.0/...`) to alias Pi SDK packages. This works on the author's machine but will fail in any other environment — including CI runners. The configuration must be made portable.

## Goals / Non-Goals

**Goals:**
- Add a single GitHub Actions workflow file that runs tests on pushes to `main` and PRs targeting `main`
- Test across Node.js 20 and 22 (Node 18 dropped — Pi SDK `@earendil-works/pi-coding-agent` requires Node >=20.6.0)
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

### Decision 2: npm ci + peer dep install over npm install

**Chosen**: `npm ci` for base dependencies, then `npm install --no-save` for Pi SDK peer dependencies.

`npm ci` is designed for CI: it respects `package-lock.json` exactly, deletes `node_modules` first for clean state, and fails if `package-lock.json` is missing or out of sync.

Pi SDK packages are peer dependencies (not listed in `package.json devDependencies`), so `npm ci` doesn't install them. However, the integration tests use `vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => { ... })` which requires the real module to be resolvable for `importOriginal()`. A stub is insufficient.

Since `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, and `typebox` are all published to npm (as of 2026-06), we install them explicitly. The `@latest` tag forces install even when the package declares higher Node.js engine requirements — the tests mock the SDK so the packages don't need to be fully functional at runtime.

For Node 20, compatible versions are pinned (0.74.x series, requires >=20.6.0). For Node 22, the latest stable versions are used.

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

- **[Risk] `require.resolve()` may resolve Pi packages to `node_modules` if installed locally** → **Mitigation**: Pi packages are peer dependencies, not dev dependencies, so `require.resolve()` won't find them locally. In CI, peer deps are installed explicitly via `npm install --no-save`.
- **[Risk] Node 18 dropped from CI** → Node 18 is EOL (April 2025) and the Pi SDK requires Node >=20.6.0. Dropped from matrix in favor of 20/22.
- **[Risk] Peer dependency installs failing on older Node versions** → **Mitigation**: CI uses conditional install — compatible Pi SDK versions for Node 20 (0.74.x, requires >=20.6.0), latest for Node 22. The `@latest` tag forces install regardless of engine checks.
