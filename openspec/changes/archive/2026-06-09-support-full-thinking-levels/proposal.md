## Why

The spec-teams extension currently maps agent thinking to a binary `on`/`off` boolean, passing `--thinking on` or `--thinking off` to the `pi` CLI. However, `"on"` is not a valid thinking level — the CLI only accepts `off`, `minimal`, `low`, `medium`, `high`, or `xhigh`. As a result, `--thinking on` is rejected with a warning and silently falls back to the default (`medium`). Users cannot configure specific thinking levels per agent, and the current `thinking: on` in all agent definitions is functionally broken — it works only by accident because the fallback (`medium`) happens to be a sensible default.

## What Changes

- **BREAKING**: `AgentDef.thinking` changes from `boolean` to `string` — any code reading `.thinking` as a boolean must be updated
- `parseAgentFile()` is updated to parse the `thinking` frontmatter field as a string, validating it against the known valid levels (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`)
- Legacy values `on` and `true` are mapped to `"medium"` (the CLI default when thinking is enabled); `off` and `false` are mapped to `"off"`
- Invalid thinking values produce a console warning and fall back to `"medium"`
- The dispatch CLI invocation passes the thinking level directly (`--thinking <level>`) instead of the ternary `state.def.thinking ? "on" : "off"`
- All existing agent `.md` files in `agents/` are updated to use explicit valid thinking levels appropriate for each agent's role

## Capabilities

### New Capabilities

- `per-agent-thinking-level`: Each agent definition can specify a valid thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`) to control the reasoning depth when the agent is dispatched. Legacy boolean values (`on`/`off`) are accepted and mapped to valid levels.

### Modified Capabilities

- `spec-teams-extension`: The `AgentDef` interface and agent file parsing rules change — the `thinking` field is now a string level instead of a boolean. The dispatch command construction changes accordingly.

## Impact

- **`extensions/spec-teams.ts`**: `AgentDef` interface, `parseAgentFile()`, and the dispatch `args` construction (line ~442)
- **`agents/*.md`**: All five agent definition files need their `thinking` frontmatter updated
- **No API surface changes** beyond the `AgentDef` type — callers using the extension through `ExtensionAPI` are unaffected
