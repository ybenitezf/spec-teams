## Why

When the spec-teams extension spawns sub-agent `pi` processes, it forwards `-e` extension paths (so sub-agents load the same extensions) but does NOT forward the CLI flags those extensions registered (e.g., `--obs-token`). Extensions that require runtime configuration break inside sub-agents because they never receive their flag values. This is a correctness gap — the sub-agent environment should mirror the parent's extension configuration.

## What Changes

- Extract `unknownFlags` from `parseArgs(process.argv.slice(2))` at module-init time in `extensions/spec-teams.ts`
- Reconstruct extension flags as CLI args (`--flag=value` for string flags, `--flag` for boolean flags)
- Forward reconstructed flags alongside the existing `-e` extension paths when spawning sub-agents
- Guard forwarding behind the `--no-extensions` invariant: only forward when `parsedArgs.noExtensions === true`, ensuring all unknown flags originate from explicitly-loaded `-e` extensions that are also forwarded
- Skip forwarding entirely when `--no-extensions` is absent, avoiding fatal "Unknown option" crashes from settings-discovered extension flags
- Spec-teams–controlled args (`--model`, `--tools`, `--thinking`, `--append-system-prompt`, `--session`, `--mode`, `-p`, `--no-extensions`) are already stored in typed parser fields and are NOT in `unknownFlags` — no filtering needed
- Fully backward compatible: when `unknownFlags` is empty, no additional args are forwarded, behavior is identical to current

## Capabilities

### New Capabilities

- `forward-extension-flags`: Sub-agents receive the extension CLI flags from the parent process, ensuring extensions that require runtime configuration function correctly inside dispatched agents.

### Modified Capabilities

- `spec-teams-extension`: The dispatch agent tool's sub-agent spawn behavior is modified to forward reconstructed extension flags alongside `-e` extension paths.

## Impact

- **Code**: `extensions/spec-teams.ts` — module-init parsing and `dispatchAgent()` spawn arg construction
- **Dependencies**: None. Uses existing `parseArgs` import from `@earendil-works/pi-coding-agent`
- **Breaking changes**: None. Additive only; empty `unknownFlags` → identical behavior
- **User-visible**: Extensions with runtime CLI flags (e.g., observability token) now work inside sub-agents
