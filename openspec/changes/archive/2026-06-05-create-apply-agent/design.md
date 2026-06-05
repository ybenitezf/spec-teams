## Context

The spec-teams extension is a dispatcher-orchestrator for OpenSpec workflows. It loads agent definitions from `.md` files with YAML frontmatter, organizes them into teams via `teams.yaml`, and spawns specialist `pi` subprocesses per agent. Currently no agent files exist — teams are empty.

The `openspec-apply-change` skill (`.pi/skills/openspec-apply-change/SKILL.md`) provides the canonical procedure for implementing changes. However, this skill was written for a primary agent with user interaction tools (AskUserQuestion, Task tool, TodoWrite). Sub-agents have a different tool profile and interaction model.

Pi injects an `<available_skills>` block into every agent's system prompt, mapping skill names to file locations. This means agents can reference skills by name and use the `read` tool to load them.

## Goals / Non-Goals

**Goals:**
- Create the first concrete agent definition that teams can include
- Agent must correctly implement OpenSpec changes when dispatched
- Agent must never attempt user interaction (headless sub-agent constraint)
- Agent must reference the skill by name, not embed full procedure
- Agent description must signal "apply" phase for dispatcher routing

**Non-Goals:**
- Multiple apply agents (frontend/backend specialization) — one general agent first
- Modifying the extension code — this is purely data (an agent `.md` file)
- Modifying the skill file — we reference it as-is
- Defining a full team — just the agent definition
- Machine-parseable output format (JSON) — text summary is sufficient

## Decisions

### Decision 1: Skill reference by name (not path, not inline)

**Choice:** Agent prompt says "Follow the `openspec-apply-change` skill" by name.

**Rationale:** Pi already injects an `<available_skills>` block with name→location mappings. The agent can `read` the file using the name as lookup key. No hardcoded paths. No risk of path drift.

**Alternatives considered:**
- *Inline the skill content* — Too long, duplicates maintenance burden, skill updates wouldn't propagate
- *Full filesystem path* — Fragile, paths differ across environments
- *Just trust the agent knows what to do* — Too vague, no procedural guidance

### Decision 2: Explicit adaptation table (Approach B)

**Choice:** Include a short table mapping user-facing skill instructions to sub-agent behavior.

```
Skill says...              →  Agent does...
────────────────────────      ───────────────
Ask the user / prompt     →  Return status to dispatcher
Wait for guidance / pause →  Stop, return explanation
Suggest archive           →  Return "ready to archive"
```

**Rationale:** The skill was written for primary agents with user interaction tools. Without explicit adaptation, the agent might hallucinate nonexistent tools (AskUserQuestion) or stall waiting for input it can't receive. Three lines of mapping eliminate this ambiguity.

**Alternatives considered:**
- *Trust the agent to adapt* — Shorter prompt but higher risk of tool hallucination or deadlock
- *Rewrite the skill for sub-agents* — Duplicates maintenance, skill updates wouldn't propagate

### Decision 3: Three-layer prompt structure

The agent system prompt has three layers:

```
1. IDENTITY        "You are an apply agent. You work headless."
2. SKILL REF       "Follow the openspec-apply-change skill."
3. ADAPTATION      "When skill says X, you do Y. Return format: ..."
```

**Rationale:** Identity establishes the agent's role and constraints. The skill reference provides full procedural detail without bloating the prompt. The adaptation layer bridges the gap between skill instructions and sub-agent capabilities.

### Decision 4: thinking: on

**Choice:** Enable extended reasoning (`thinking: on`) for the apply agent.

**Rationale:** Implementation tasks require careful reasoning about existing code, design intent, edge cases, and test coverage. The apply agent makes irreversible changes to the codebase — accuracy matters more than token efficiency. We can change this later if cost/latency is an issue.

### Decision 5: Description starts with "Applies"

**Choice:** Frontmatter description begins with "Applies (implements) tasks from OpenSpec changes..."

**Rationale:** The dispatcher's routing heuristic scans descriptions for phase keywords. Starting with "Applies" makes the apply-phase match immediate and unambiguous. When multiple apply agents exist later, the description can differentiate while keeping the leading keyword.

### Decision 6: Sub-agents inherit skills from Pi's default prompt

**Choice:** Rely on Pi's default system prompt to inject the `<available_skills>` block into sub-agents, rather than embedding skill content or paths in the agent prompt.

**Rationale:** Sub-agents are spawned with `--no-extensions` (so the spec-teams extension's `before_agent_start` handler does NOT fire and does NOT replace their system prompt) and `--append-system-prompt` (so the agent's prompt appends to Pi's default). Pi's CLI separates `--no-extensions` from `--no-skills` — they are independent flags. Since `--no-skills` is not passed, Pi's default prompt includes the `<available_skills>` block. The agent can resolve `openspec-apply-change` by name via this block.

**Contrast with primary dispatcher:** The primary agent runs with the spec-teams extension loaded. Its `before_agent_start` handler returns `{ systemPrompt: "..." }` which REPLACES the entire system prompt, removing the skills block. This is acceptable because the dispatcher only uses `dispatch_agent` and does not need skills.

**Alternatives considered:**
- *Embed skill path in agent prompt* — Fragile, paths differ across environments
- *Copy skill content into agent prompt* — Duplicates maintenance, skill updates wouldn't propagate
- *Pass `--skills` explicitly to sub-agent spawn* — Unnecessary; skills load by default

### Decision 7: Return format — structured text, not JSON

**Choice:** Agent returns a Markdown-structured summary with sections: Status, Tasks Completed, Summary.

**Rationale:** The dispatcher reads text output, not structured data. A consistent Markdown format is human-readable, dispatcher-parseable, and simple. JSON would add parsing complexity without benefit at this stage.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Skill file changes (maintained by OpenSpec) may invalidate adaptation assumptions | Adaptation table maps general patterns (user interaction → return), not specific steps. Should survive most skill updates. |
| thinking: on increases token usage and latency | Monitor. Can toggle to `off` in agent frontmatter without code changes. |
| Agent may still attempt user interaction despite adaptation instructions | Prompt emphasizes "NEVER ask questions. Just return." Multiple phrasings reinforce. If it happens, tighten prompt. |
| General apply agent may struggle with unfamiliar tech stacks | Acceptable for v1. Specialized agents can be added later. The dispatcher task description provides context. |
| Return format is not machine-parseable by dispatcher | Currently the dispatcher just passes text to the user. When dispatcher evolves to parse results, we can add JSON output. |
| Sub-agents depend on Pi's default prompt including skills | If a future Pi version changes how `--no-extensions` interacts with skill loading, or if `--no-skills` is ever added to the spawn args, skill references would break. Mitigation: this is a stable, documented Pi behavior (`--no-extensions` and `--no-skills` are independent CLI flags). |
