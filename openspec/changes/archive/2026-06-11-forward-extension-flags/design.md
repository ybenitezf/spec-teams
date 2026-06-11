## Context

The spec-teams extension acts as a dispatcher-orchestrator. It spawns child `pi` processes for specialist agents (explore, propose, apply, verify, archive, worker). The existing `extension-passthrough` change forwards explicitly-loaded `-e` extension paths so sub-agents load the same extensions as the parent. However, extensions that register CLI flags via `pi.registerFlag()` (e.g., `--obs-token` for observability) never receive their flag values in sub-agents, causing those extensions to break.

Pi's argument parser (`parseArgs`) separates recognized built-in flags into typed fields and collects unrecognized `--flag` args into `unknownFlags: Map<string, boolean | string>`. Extension flags fall into `unknownFlags`. The fatal constraint is that any flag in `unknownFlags` NOT registered by a loaded extension causes `process.exit(1)` in the child process.

The invariant that makes forwarding safe: when the parent runs with `--no-extensions`, ONLY explicitly `-e` extensions load. Since spec-teams already forwards all `-e` paths (minus itself) and sub-agents also run with `--no-extensions`, the same extensions load in both processes and register the same flags. Forwarding `unknownFlags` alongside `-e` paths guarantees all flags find their registrations.

## Goals / Non-Goals

**Goals:**
- Forward extension CLI flags from parent to sub-agent processes
- Ensure extensions with runtime configuration work inside dispatched agents
- Maintain the safety invariant via `--no-extensions` guard
- Backward compatible when no extension flags are present

**Non-Goals:**
- Forwarding flags when parent lacks `--no-extensions` (settings-discovered extensions create untraceable flag origins)
- Per-agent flag overrides (agents always inherit parent flag values)
- Forwarding `--skill`, `--prompt-template`, or `--theme` settings
- Modifying pi's argument parser or extension loading system

## Decisions

### Decision 1: Forward `unknownFlags` by reconstruction, guarded by `--no-extensions`

**Choice**: At module-init time, extract `parsedArgs.unknownFlags` and `parsedArgs.noExtensions`. Reconstruct `--flag=value` (string) and `--flag` (boolean) args. Only add them to spawn args when `parsedArgs.noExtensions === true`.

**Rationale**: This avoids all fatal crash scenarios. Under `--no-extensions`, only `-e` extensions load — their flags are the ONLY things in `unknownFlags`. We forward those same `-e` extensions, so the sub-agent loads and registers the same flags. Without `--no-extensions`, settings-discovered extensions could inject flags into `unknownFlags` that won't find registrations in the sub-agent — we skip forwarding entirely in that case.

**Alternatives considered**:
- **Option A (Forward all `process.argv` minus denylist)**: Rejected — forwarding flags from settings-discovered extensions causes fatal "Unknown option" crashes in sub-agents.
- **Option B (Map flags to extensions)**: Rejected — no mechanism exists to determine which extension registered which flag at module-init time.
- **Option F (Forward all + `--` passthrough)**: Rejected — pi's `parseArgs` doesn't support `--` for pass-through, and unknown flags still cause fatal errors.

### Decision 2: Reconstruct as `--flag=value` / `--flag`, not `--flag value`

**Choice**: Use `--flag=value` form for string values, `--flag` for boolean `true`.

**Rationale**: The `--flag=value` form is unambiguous with `spawn()` — the entire string is a single argv element. Using `--flag value` as two separate args would be equivalent for pi's parser but adds unnecessary complexity. Boolean flags (`true`) produce `--flag` with no value, which pi's parser interprets as boolean.

### Decision 3: Place reconstructed flags before spec-teams–controlled args in spawn

**Choice**: Order in spawn args: `-e` paths → reconstructed flags → `--model` → `--tools` → `--thinking` → `--append-system-prompt` → `--session` → `-c` → task.

**Rationale**: In theory, no collision exists (spec-teams–controlled args are recognized flags and NOT in `unknownFlags`). But placing spec-teams args after ensures that if a collision ever occurs (e.g., future pi change), the later arg (spec-teams intent) wins. This is defensive ordering.

### Decision 4: Skip forwarding when `noExtensions` is falsy/absent

**Choice**: When `parsedArgs.noExtensions` is not `true`, set `forwardedFlags` to empty array. No warning or notification.

**Rationale**: This is a non-standard usage pattern (spec-teams is designed around `--no-extensions`). Forwarding flags in this scenario would be dangerous. The user can still use spec-teams — extensions just won't receive their flags in sub-agents, which is the same as current behavior.

## Risks / Trade-offs

- **[Risk] User runs parent without `--no-extensions` and expects flag forwarding** → **Mitigation**: No crash occurs — we skip forwarding. This is identical to current behavior. The documented usage pattern (`pi -ne -e spec-teams.ts`) naturally includes `--no-extensions`.

- **[Risk] Future pi version adds a recognized flag that happens to be in `unknownFlags` of a newer pi** → **Mitigation**: The recognized flag would be in a typed field, not `unknownFlags`. Pi's `parseArgs` separates recognized flags from unknown directly. This is forward-compatible.

- **[Risk] Flag value contains characters that break `spawn()`** → **Mitigation**: `spawn()` passes args directly to the child process without shell interpretation (no quoting, no escaping issues). Safe.

- **[Trade-off] All sub-agents get the same flag values** → **Mitigation**: This matches the current extension-forwarding model where all sub-agents share the same extensions. Per-agent flag overrides would be a separate feature requiring agent definition changes.

## Open Questions

None. The design is constrained by pi's existing parseArgs behavior and extension loading model. All edge cases are handled by the `--no-extensions` guard.
