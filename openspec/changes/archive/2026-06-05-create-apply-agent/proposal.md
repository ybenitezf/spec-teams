## Why

The spec-teams extension currently has no agent definitions. Without agents, the dispatcher has nothing to dispatch to — teams are empty shells. We need our first agent to make the extension usable, starting with the one that implements changes: the apply agent.

## What Changes

- Create `agents/` directory at project root (first agent home)
- Create `agents/apply.md` — agent definition frontmatter with name, description, tools, thinking flag
- Agent system prompt establishes identity as headless sub-agent, references `openspec-apply-change` skill, and includes an adaptation table mapping user-facing skill instructions to dispatcher-return equivalents
- Thinking enabled (`on`) for careful implementation reasoning

## Capabilities

### New Capabilities

- `apply-agent`: A headless sub-agent that implements tasks from OpenSpec changes — writes code, edits files, runs CLI commands, marks tasks complete. Follows the `openspec-apply-change` skill adapted for sub-agent context.

### Modified Capabilities

None. The extension already supports loading agents from `agents/` directory. This change adds data (an agent file), not behavior changes.

## Impact

- New directory: `agents/` at project root
- New file: `agents/apply.md` (~30 lines, frontmatter + system prompt)
- No code changes to extension
- Enables first usable team configuration (teams can now include `apply`)
