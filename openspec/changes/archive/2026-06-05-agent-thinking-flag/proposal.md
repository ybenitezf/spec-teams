## Why

Currently `--thinking off` is hardcoded for every agent dispatch. This forces ALL specialist agents to run without extended reasoning, regardless of their role. Agents that need deep thinking (explorers investigating codebases, designers reasoning about architecture) produce shallow results, and the dispatcher compensates by doing micro-orchestration — breaking work into tiny steps and reasoning between each one — despite having no direct code access. The result is high-latency, high-cost round-trips where the dispatcher puppeteers dumb agents instead of delegating coherent work to capable ones.

## What Changes

- Agent definition frontmatter gains a `thinking` field accepting `on` or `off`
- `parseAgentFile()` extracts the field, defaulting to `off` when absent (backward compatible)
- `dispatchAgent()` uses the agent's `thinking` value instead of the hardcoded `--thinking off`
- The dispatcher system prompt and agent catalog remain unchanged — thinking is an internal agent capability, not routing information

## Capabilities

### New Capabilities
<!-- No new capability domains introduced -->

### Modified Capabilities
- `spec-teams-extension`: Agent definitions now include a `thinking` field that controls whether the spawned agent process gets extended reasoning. Existing agent files without this field behave identically (thinking off). The `dispatch_agent` tool's behavior changes: the `--thinking` flag passed to the child `pi` process is now determined by the agent definition rather than being hardcoded.

## Impact

- `extensions/spec-teams.ts`: `AgentDef` interface, `parseAgentFile()`, `dispatchAgent()` spawn args
- Agent `.md` files: optional new frontmatter field (no existing files affected since none exist yet)
- No breaking changes — absent `thinking` field defaults to `off`, preserving current behavior
