## Why

When the spec-teams dispatcher spawns a worker agent to execute tasks like "commit these changes," the worker doesn't use available skills like `git-commit` even though skills ARE present in its system prompt via the `<available_skills>` XML block. The root cause is that `agents/worker.md` contains no instructions about discovering or using skills, unlike the OpenSpec specialist agents (explore, propose, apply, archive) which all have explicit "Missing-Skill Guard" and "Skill Reference" sections. For a model running at `thinking: low` (deepseek-v4-flash), the `<available_skills>` block requires explicit prompting to be noticed and acted upon.

## What Changes

- Add a "Skill Awareness" section to `agents/worker.md` instructing the worker to check `<available_skills>` for skills relevant to the current task, read them, and follow their procedures
- The section follows the pattern established by OpenSpec specialist agents but adapted for a general-purpose worker: opportunistic rather than mandatory
- The worker's existing structure (identity, critical constraint, role boundary, return format, constraints, guiding principle) is preserved

## Capabilities

### New Capabilities
<!-- None — this change modifies an existing agent prompt, not introducing a new capability -->

### Modified Capabilities
- `worker-agent`: The worker's system prompt gains a Skill Awareness section that instructs it to discover and use skills from `<available_skills>`. This modifies the existing requirement about the system prompt content without violating the "no OpenSpec awareness" requirement (skills are a general pi mechanism, not OpenSpec-specific).

## Impact

- Affected file: `agents/worker.md` (system prompt content change)
- No code changes to `spec-teams.ts` or the dispatcher
- No change to the pi CLI, skill injection mechanism, or model configuration
- No conflict with existing OpenSpec agent skill patterns
