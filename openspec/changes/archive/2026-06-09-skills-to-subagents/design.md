## Context

The spec-teams extension dispatches worker agents via `pi --no-extensions --append-system-prompt agents/worker.md`. The `--no-skills` flag is NOT passed, so pi's skill discovery mechanism loads skills from `~/.agents/skills/`, `.pi/skills/`, etc., and appends them as an `<available_skills>` XML block at the end of the subagent's system prompt.

However, `agents/worker.md` contains no instructions about discovering or using these skills. The worker model (deepseek-v4-flash at `thinking: low`) does not reliably notice or act on the `<available_skills>` block without explicit prompting. This contrasts with the OpenSpec specialist agents (explore, propose, apply, archive), which all have "Missing-Skill Guard" and "Skill Reference" sections that direct the model to discover and follow their respective skills.

The exploration (`.pi/spec-sessions/explore-skills-to-subagents.md`) confirmed skills ARE present, the root cause is the worker prompt's lack of skill-awareness instructions, and the recommended approach is adding a "Skill Awareness" section to `agents/worker.md` following the established pattern but adapted for a general-purpose worker.

## Goals / Non-Goals

**Goals:**
- Add skill-awareness instructions to `agents/worker.md` so the worker discovers and uses skills from `<available_skills>` when relevant to its task
- Follow the same structural pattern used by OpenSpec agents for consistency
- Adapt for a general-purpose worker (opportunistic rather than mandatory — no single required skill)
- Preserve all existing worker structure: identity, headless constraint, role boundary, return format, constraints, guiding principle

**Non-Goals:**
- Changing the dispatcher's system prompt or routing logic
- Changing the pi CLI or skill injection mechanism (`--append-system-prompt`, `--no-skills`)
- Changing the worker's model (`deepseek-v4-flash`) or thinking level (`low`)
- Making any specific skill mandatory for the worker
- Adding skill-awareness to the dispatcher agent itself (unnecessary — it only dispatches)

## Decisions

### Decision 1: Opportunistic skill check (not mandatory guard)

The worker does NOT have a "Missing-Skill Guard" like OpenSpec agents, because no single skill is required for the worker to function. Instead, the worker is instructed to check `<available_skills>` when a task matches a skill domain, and to use any relevant skill it finds.

**Alternatives considered:**
- **Mandatory guard** (rejected): The worker is general-purpose and must work for tasks without any matching skill. A hard requirement would break tasks that have no associated skill.
- **Dispatcher injects skill references into task** (rejected): Couples dispatch logic to skill inventory, fragile, requires code changes to `spec-teams.ts`.

### Decision 2: Section placement — after "Guiding Principles"

The new "Skill Awareness" section is placed after the existing "Guiding Principles" section. This keeps it prominent (before the Execution Tools and return format boilerplate) without disrupting the established opening flow (identity → headless constraint → role boundary → guiding principle → skill awareness).

**Alternatives considered:**
- **Merge into Guiding Principles** (rejected): Keeps skill-awareness as its own clear section, distinct from the general principle of "Use the Right Tool for the Job."
- **Place before Guiding Principles** (rejected): The guiding principle is more universal and should come first.
- **Place at end of prompt** (rejected): The `<available_skills>` block is appended by pi AFTER the agent prompt, so referencing it earlier in the prompt draws the model's attention forward toward it.

### Decision 3: Explicit read-then-follow instructions

The skill-awareness text explicitly instructs the worker to: (1) check `<available_skills>` for relevant skills, (2) read the skill file with the `read` tool, and (3) follow its procedure. This mirrors the OpenSpec agents' "Skill Reference" pattern. For `thinking: low` models, explicit step-by-step instructions are essential — vague guidance like "use skills when available" would be ignored.

**Alternatives considered:**
- **Vague instruction** ("You have access to skills, use them when appropriate"): Too ambiguous for a low-thinking model.
- **Specific skill invocation flag** (`--skills git-commit`): Requires code changes to spec-teams.ts, doesn't scale to all future skills.

### Decision 4: No frontmatter changes

The only change is to the agent's system prompt content in `agents/worker.md`. No frontmatter fields are added (no `skills` field, no new metadata). The existing `skills: git-commit` approach was rejected because it requires code changes to `spec-teams.ts` and doesn't scale — the dispatcher would need to maintain a skill inventory.

## Risks / Trade-offs

- **[Token cost]:** The new section adds ~150 tokens to the worker's system prompt. → **Mitigation**: Negligible compared to the existing prompt and skills block. Acceptable cost for the capability gain.
- **[Model compliance]:** Even with instructions, a `thinking: low` model might still miss relevant skills occasionally. → **Mitigation**: The instruction is explicit and placed prominently. If compliance proves low, the model or thinking level can be adjusted separately (out of scope for this change).
- **[False positives]:** The worker might read and apply skills that are tangentially relevant but not the best fit. → **Mitigation**: The instruction says "if a relevant skill exists" — the model's judgment determines relevance. This is inherent to LLM-based agents and acceptable.
- **[Skill loading order]:** The `<available_skills>` block is appended AFTER the agent prompt. Placing skill-awareness instructions in the agent prompt ensures the model is primed to look for skills when it reaches them. → **Mitigation**: The heading draws attention forward toward the skills block.

## Open Questions

None — the approach is fully specified and requires only a prompt edit.
