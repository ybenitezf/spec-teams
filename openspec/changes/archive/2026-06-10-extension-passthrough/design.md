## Context

The spec-teams extension spawns child `pi` processes to run specialist agents. Currently, the spawn arguments include `--no-extensions`, which disables ALL extension loading — including the explicitly-loaded `-e` extensions from the parent process. This is intentional (it prevents the spec-teams extension's `before_agent_start` handler from overwriting sub-agent system prompts), but it also blocks user extensions that were deliberately loaded via `-e`.

Pi's CLI supports `--no-extensions` + `-e` as a documented combination: auto-discovery is disabled, but explicitly listed extension paths are still loaded. The fix is to forward the surviving `-e` paths (minus spec-teams itself) to sub-agent processes.

## Goals / Non-Goals

**Goals:**
- Forward explicitly-loaded `-e` extension paths from the parent pi process to sub-agent `pi` processes
- Filter out the spec-teams extension itself so its `before_agent_start` handler does NOT fire in sub-agents
- Preserve existing behavior when no `-e` paths were passed (identical to `--no-extensions`-only)
- Use pi's own `parseArgs` utility for consistent argument parsing

**Non-Goals:**
- Forwarding auto-discovered extensions (these remain blocked by `--no-extensions`)
- Changing pi CLI behavior or the `--no-extensions` semantics
- Modifying other extensions' `before_agent_start` handlers
- Handling package-name extensions (e.g., `-e @scope/pkg`), which are not local file paths and may not be resolvable in sub-agents
- Using environment variables or other side channels for extension control

## Decisions

### Decision 1: Parse `process.argv` at module initialization

**Choice**: Parse CLI arguments once at module init (top level of the extension module), not in `session_start`.

**Alternatives considered**:
- **Parse in `session_start`**: Re-parse on every session. Unnecessary — extension paths don't change across sessions within the same process.
- **Parse from `ExtensionAPI` config**: The ExtensionAPI doesn't expose the raw CLI arguments in a structured form.

**Rationale**: Module-level init is simplest and most efficient. The paths are captured once when the process starts and remain valid for the lifetime of the process.

### Decision 2: Use `import.meta.url` for self-identification

**Choice**: Identify the spec-teams extension file path using `import.meta.url` (converted via `fileURLToPath` from the `url` module), then compare against resolved `-e` paths.

**Alternatives considered**:
- **Hardcode the path** (`extensions/spec-teams.ts`): Fragile — the file could be renamed or moved.
- **Compare by module content/name**: Too complex and unreliable.
- **Use `__filename`**: Available in CJS but not reliably in the jiti-loaded ESM context that pi uses.

**Rationale**: `import.meta.url` is the standard ESM mechanism for a module to know its own file path. Pi uses jiti to load TypeScript extensions, and jiti sets `import.meta.url` to the original `.ts` file path. Comparing resolved paths (using `fs.realpathSync` to normalize symlinks) against the resolved `import.meta.url` path is reliable.

### Decision 3: Resolve relative paths to absolute before comparison and forwarding

**Choice**: Use `path.resolve(process.cwd(), rawPath)` followed by `fs.realpathSync(...)` for symlink normalization, for each extension path extracted from CLI args.

**Alternatives considered**:
- **Forward raw paths as-is**: Would break if the sub-agent has a different `cwd` or if the paths were relative.
- **Only resolve for comparison, forward raw**: Inconsistent; the sub-agent's `cwd` from pi might differ.

**Rationale**: Absolute paths are unambiguous and work regardless of the sub-agent's current working directory. Pi resolves relative `-e` paths relative to `cwd` internally, so we replicate that logic for consistency. Symlink normalization ensures the comparison with `import.meta.url` is correct even when the same file is accessed through different link paths.

### Decision 4: Filter only the spec-teams extension, forward all other `-e` paths

**Choice**: Remove ONLY the path matching the spec-teams extension file. Forward all other explicitly-loaded extensions.

**Alternatives considered**:
- **Environment variable to disable spec-teams `before_agent_start` (Alternative A from findings)**: Forward all `-e` paths including spec-teams, set `PI_SPEC_TEAMS_SUBAGENT=1`, check in handler. Rejected — fragile env var, and other extensions might have similar handlers.
- **Detect sub-agent context from argv (Alternative D from findings)**: Check for `--mode json` patterns in sub-agent process. Rejected — heuristic, breakable by other extensions.
- **Replace `--no-extensions` with explicit exclusion list (Alternative C from findings)**: Enumerate all auto-discovered extensions and exclude them. Rejected — complex, fragile, reimplements pi's resolution logic.

**Rationale**: The user explicitly loaded these extensions via `-e`; they should persist in sub-agents. By only filtering spec-teams, we maintain the guard against its `before_agent_start` handler while allowing other extensions through. This approach is clean, minimal, and respects the documented pi CLI semantics.

### Decision 5: Store resolved paths in a module-level variable

**Choice**: Store the filtered, resolved extension paths in a `let forwardedExtensions: string[]` variable at module scope.

**Alternatives considered**:
- **Re-parse every time `dispatchAgent` is called**: Wasteful.
- **Store in a closure within `session_start`**: Would require threading through to `dispatchAgent`.
- **Environment variable**: Overkill for a simple string array.

**Rationale**: Module-level variable is the simplest approach. The value is set once at init time and read on each `dispatchAgent` call. No threading or closure complexity.

## Risks / Trade-offs

- **[Risk] `import.meta.url` returns unexpected format in some jiti configurations** → **Mitigation**: Use `fileURLToPath` from the `url` module for standards-compliant conversion. Add a defensive `try/catch` fallback that skips filtering if self-identification fails (all `-e` paths are forwarded, which is safer than filtering none).

- **[Risk] Symlinks cause false mismatch between `import.meta.url` path and CLI path** → **Mitigation**: Use `fs.realpathSync` on both the CLI paths and the self-identification path before comparison.

- **[Risk] Other extensions' `before_agent_start` handlers modify system prompts** → **Mitigation**: This is acceptable. The user explicitly loaded those extensions, and if one has a `before_agent_start` handler that modifies the sub-agent prompt, that's by the user's choice. The spec-teams guard only exists because we know its handler REPLACES the prompt entirely.

- **[Risk] Package-name extensions (`-e @scope/pkg`) are not forwarded correctly** → **Mitigation**: `isLocalPath` check (imported from pi or replicated) ensures only local file paths are forwarded. Package names are left as-is and passed through to the sub-agent's pi invocation, where they will be resolved in the sub-agent's context. If the package is not installed in the sub-agent's node_modules, pi will fail to load it — this is expected and no different from running pi with the same `-e` directly.

- **[Trade-off] Module-level init means extension paths are captured once at process startup** → If pi supported dynamic extension loading mid-session via some future API (it doesn't currently), this approach wouldn't pick up new paths. This is acceptable for current pi behavior.

## Open Questions

None. All technical decisions are settled based on the exploration findings.
