## Why

The spec-teams extension spawns child `pi` processes with `--no-extensions`, which disables ALL extension loading — including explicitly-loaded `-e` extensions from the parent process. Users who run `pi -ne -e ./path/to/my-extension ...` expect sub-agents to inherit those explicit extensions, but currently they don't. This violates the principle of least surprise: `--no-extensions` disables auto-discovery, but explicit `-e` paths are a documented, intentional CLI combination that should survive into sub-agents.

## What Changes

- Parse `-e` / `--extension` paths from the parent process's CLI arguments using `parseArgs` (already exported by `@earendil-works/pi-coding-agent`)
- Resolve each relative path to an absolute path and identify which one is the spec-teams extension itself (via `import.meta.url`)
- Filter out the spec-teams extension from the forwarded paths to prevent its `before_agent_start` handler from overwriting sub-agent system prompts
- Forward surviving extension paths as `-e <path>` arguments in the sub-agent spawn args, alongside the existing `--no-extensions` flag
- When no `-e` paths were passed or only spec-teams was passed, behavior is identical to current `--no-extensions`-only behavior

## Capabilities

### New Capabilities
- `extension-passthrough`: The spec-teams extension detects and forwards explicitly-loaded parent `-e` extension paths to sub-agent `pi` processes, excluding the spec-teams extension itself to preserve sub-agent system prompt integrity.

### Modified Capabilities
- `spec-teams-extension`: The sub-agent spawn argument construction in `dispatchAgent()` is modified to include forwarded `-e` paths alongside `--no-extensions`. The `session_start` handler is modified to parse and store extension paths at module init. No external API change; no change to the `before_agent_start` handler or system prompt.

## Impact

- **Affected code**: `extensions/spec-teams.ts` — specifically `dispatchAgent()` (line ~484) and `session_start` (or module-level init), plus a new module-level variable to store resolved extension paths
- **Dependencies**: `parseArgs` from `@earendil-works/pi-coding-agent` (already a peer dependency, already exported), Node built-ins (`path`, `fs`, `url`)
- **No breaking changes**: Existing behavior is preserved when no `-e` paths are forwarded. Sub-agent system prompts are not affected (spec-teams is filtered out)
- **No API changes**: The extension's public API (tools, commands, events) is unchanged
