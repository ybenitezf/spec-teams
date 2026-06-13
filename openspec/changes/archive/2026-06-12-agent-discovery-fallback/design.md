## Context

The spec-teams extension currently builds the dispatcher system prompt as a ~180-line static template string in `before_agent_start`. The OpenSpec lifecycle section always includes all five phases (explore, propose, apply, verify, archive) regardless of whether the corresponding skills are available or specialist agents are on the team. The Explore Relay Protocol is embedded within the lifecycle and only meaningful when an explore agent exists. The only existing conditional is the `hasWorker` gate, which omits the worker routing section when no `worker` agent is found.

This creates a guidance/action gap: the dispatcher is instructed about phases it cannot fulfill. Meanwhile, Pi already passes `event.systemPromptOptions.skills` (a `Skill[]` array) to every `before_agent_start` event — but spec-teams currently ignores this parameter (using `_event`).

Three important constraints shape the design:

1. **Skills flow to sub-agents through Pi's own `<available_skills>` injection** — the dispatcher never needs to forward skill content. It only needs to reference skills by name in dispatch instructions.
2. **`--no-extensions` does NOT disable skills** — skills still load from package resolution even when the spec-teams extension uses `--no-extensions` to prevent duplicate extension loading in child processes.
3. **The Explore Relay Protocol is the dispatcher's own operational mechanism** — it describes how the dispatcher handles multi-turn exploration conversations. It is not a skill-specific protocol; it is always relevant because even without an explore specialist, the dispatcher can inject signal definitions into any agent's task and participate in multi-turn relay.

## Goals / Non-Goals

**Goals:**
- Make the system prompt dynamic: include only OpenSpec phases whose skills are available or whose specialist agents are on the team
- Always include the Explore Relay Protocol — it is the dispatcher's own mechanism, not conditional on explore capability
- Include signal definitions in dispatcher-owned knowledge so the dispatcher can inject them into any explore task
- Use `event.systemPromptOptions.skills` as the skill data source — no filesystem scanning
- Replace the hardcoded `hasWorker` worker-only section with a general tasks section listing all non-OpenSpec agents
- Reference skills by name in routing instructions, never duplicate skill content
- Remove "Identity" descriptions from lifecycle phase blocks — they paraphrase skill content that agents already receive via `<available_skills>`
- Maintain identical routing and relay content when all skills and agents are present (backward-compatible)

**Non-Goals:**
- Changing agent `.md` files or their skill guardrails
- Changing Pi's skill injection mechanism
- Changing `scanAgentDirs()` or team activation logic
- Changing `dispatchAgent()` function or sub-agent spawning
- Auto-installing missing agents or skills
- Adding new commands, CLI flags, or dashboard widget changes
- Checking for `openspec` CLI binary availability
- Duplicating skill procedure content in the dispatcher prompt

## Decisions

### Decision 1: Read skills from `event.systemPromptOptions.skills` instead of filesystem scanning

**Choice**: Use the `Skill[]` array that Pi already passes to the `before_agent_start` event via `event.systemPromptOptions.skills`. Each `Skill` object has `{ name, description, filePath, baseDir }`. Filter for `openspec-*` prefixed skills to determine available OpenSpec capabilities.

**Rationale**: Pi's own skill loading already discovers skills from project and user-level directories with proper priority and caching. Re-implementing filesystem scanning would duplicate this logic. Using the event data ensures consistency — if Pi makes a skill available, spec-teams sees it; if Pi doesn't, spec-teams doesn't fabricate it.

**Alternatives considered**:
- _Scan `<cwd>/.pi/skills/` for SKILL.md files_: Duplicates Pi's skill discovery. Could miss user-level skills that Pi includes. Requires filesystem I/O in the `before_agent_start` handler (which fires every turn).
- _Parse SKILL.md frontmatter for phase field_: Over-engineering. The `openspec-` prefix naming convention is clearer and already established.

### Decision 2: Phase availability determined by skill presence, not agent presence

**Choice**: A phase is "available" when its corresponding skill (e.g., `openspec-explore`) exists in the skills array. Agent presence is secondary — the routing instructions say "dispatch the most suitable available agent" rather than hardcoding agent names. The verify phase (which has no skill) is available only when a `verify` agent exists on the team.

**Rationale**: Skills are the actual mechanism by which agents operate. If the `openspec-explore` skill exists, any agent can be dispatched with a task to follow it. The agent's own `<available_skills>` block (injected by Pi) will include the skill, so the agent knows how to use it. This decouples routing from specific agent names.

**Alternatives considered**:
- _Phase available only when matching-named agent exists on team_: Fails in the common case where only a `worker` agent is present but skills are available. The dispatcher would be blocked from routing OpenSpec work even though it's possible.
- _Phase available when either skill OR agent exists_: This is effectively what we're doing, but agent presence is discovered through the agent catalog already in the prompt, not through a separate lookup.

### Decision 3: Segment-function prompt assembly, not monolithic conditionals

**Choice**: Break the system prompt into named segment functions that each return a string (possibly empty) based on the skills array and active team. Assemble the final prompt by joining non-empty segments.

**Rationale**: The current 180-line template string already has one conditional (`hasWorker`). Adding per-phase conditionals inside this monolith would make it unreadable and untestable. Segment functions are independently testable and composable.

**Alternatives considered**:
- _Huge conditional blocks inside the template string_: Unmaintainable at 180+ lines with per-phase conditionals.
- _External template engine (Handlebars, etc.)_: Over-engineered. Adds a build step and indirection for string concatenation with conditionals.

### Decision 4: Agent-name-free routing — "dispatch the most suitable available agent"

**Choice**: Routing instructions in each lifecycle phase block say "dispatch the most suitable available agent for [phase]" — no hardcoded agent names like "dispatch the explore agent" or "dispatch the worker agent". The LLM reads the agent catalog to select the best match.

**Rationale**: The agent catalog already lists every dispatchable agent with descriptions. Hardcoding "dispatch the worker agent" couples the prompt to a specific agent name that may not exist on every team. Letting the LLM select from the catalog is more robust and works with any team composition.

**Alternatives considered**:
- _Hardcode specialist agent names_: Fails when agents are named differently or a team uses `worker` only.
- _Build a phase-to-agent-name regex lookup_: Fragile. The catalog approach lets the LLM do description-based matching, which is what the existing prompt already encourages.

### Decision 5: General Tasks section replaces hardcoded `hasWorker` section

**Choice**: Instead of a worker-specific "Non-OpenSpec Tasks" section that only shows when `worker` is on the team, generate a "General Tasks" section that lists all non-OpenSpec agents on the team with their descriptions. If there are no non-OpenSpec agents, the section is omitted.

**Rationale**: Hardcoding "worker" assumes a specific agent name. Listing all non-OpenSpec agents is more flexible and works for teams with custom agents like `scout`, `planner`, `builder`, etc.

**Alternatives considered**:
- _Keep `hasWorker` conditional but also add a general agents section_: Redundant. A single section subsumes both concerns.
- _Remove the section entirely_: Too aggressive. The dispatcher still benefits from guidance about which tasks are "general" vs "OpenSpec workflow" tasks.

### Decision 6: Verify phase determined by agent presence only (no skill fallback)

**Choice**: The verify phase has no corresponding `openspec-verify` skill. Its availability is determined solely by whether a verify agent is on the team. When no verify-suitable agent exists, verify is unavailable.

**Rationale**: No `openspec-verify` skill exists. Creating one is out of scope. The phase config reflects reality with `skillName: null`.

**Alternatives considered**:
- _Create an openspec-verify skill_: Out of scope — that's a separate change.
- _Treat verify as always available_: Misleading — without a skill or agent, dispatching for verification would fail.

### Decision 7: Reference skills by name, never duplicate content

**Choice**: The system prompt says "instruct the agent to follow the `openspec-explore` skill" — it never reproduces the skill's procedure content. Each dispatched agent receives the full `<available_skills>` block through Pi's own injection.

**Rationale**: Duplicating skill procedures would bloat the prompt and create a sync problem (the prompt copy would drift from the actual skill). References by name are concise and always accurate.

**Alternatives considered**:
- _Include skill procedure summaries_: Bloats the prompt. Creates sync drift.
- _Include full skill content_: Unacceptable token waste.

### Decision 8: Explore Relay Protocol is always present — it is dispatcher-owned knowledge

**Choice**: The Explore Relay Protocol section is ALWAYS included in the dispatcher prompt, regardless of whether the `openspec-explore` skill is available or an explore agent is on the team. It describes the dispatcher's own multi-turn relay mechanism: how the dispatcher handles `need-input`, `ready-to-propose`, `done-exploring`, and `blocked` signals from any dispatched agent.

The relay protocol includes signal definitions that the dispatcher injects into explore task instructions. When dispatching for exploration, the dispatcher includes these signal definitions in the task string so any agent can participate — not just specialist explore agents. The skill reference is conditional: "if the openspec-explore skill is available, instruct the agent to follow it."

**Rationale**: The relay protocol is not an explore-skill-specific mechanism. It is the dispatcher's own operational procedure for handling multi-turn exploration conversations. Even without a specialist explore agent, the dispatcher needs to know how to handle `need-input` vs `ready-to-propose` vs `done-exploring` vs `blocked` signals from any agent it dispatches for exploration. Making the protocol always-present ensures the dispatcher can relay multi-turn conversations regardless of team composition.

**Alternatives considered**:
- _Include only when explore skill or agent is available_: The dispatcher would lose the ability to handle relay signals from any agent dispatched for exploration. A worker or other agent could still produce `Status: need-input` signals, and the dispatcher would not know how to handle them.
- _Include only when explore skill is available_: Same problem — the dispatcher would not know how to handle relay signals when the explore skill is missing but exploration is still happening.
- _Move the protocol to each agent's .md file_: The protocol is dispatcher behavior, not agent behavior. It describes what the dispatcher does with the agent's responses, not what the agent does.

### Decision 9: Remove "Identity" descriptions from lifecycle phase blocks

**Choice**: Each lifecycle phase block in the system prompt should contain only routing heuristics, skill references, and workflow transitions — NOT descriptions of what each phase does (e.g., "**Identity**: The explore agent investigates problems..."). These "Identity" fields paraphrase skill content that agents already receive via `<available_skills>`.

**Rationale**: The `openspec-explore` skill's own SKILL.md describes what explore does in detail. Reproducing this in the dispatcher prompt wastes context tokens and creates a sync problem — if the skill changes, the dispatcher prompt would drift. The dispatcher only needs to know WHEN to dispatch for each phase and WHAT skill to reference, not WHAT the phase does.

**Alternatives considered**:
- _Keep short identity descriptions_: Still redundant with skill content. Even brief descriptions like "investigates problems and clarifies requirements" paraphrase what `openspec-explore` already teaches.
- _Include skill description from `event.systemPromptOptions.skills`_: Pulls in content that the dispatched agent will see anyway. No value added.

## Risks / Trade-offs

- **[Risk] `event.systemPromptOptions.skills` might be undefined or empty on older Pi versions** → Mitigation: Degrade gracefully — if `skills` is undefined, treat it as an empty array. Phase availability falls back to "no skills," which shows unavailable notices. The relay protocol is still present because it's always included.
- **[Risk] Agent-name-free routing could lead to suboptimal agent selection** → Mitigation: Phase blocks include brief routing heuristics ("when requirements are unclear") that guide the LLM toward the right agent. The agent catalog provides descriptions for matching.
- **[Risk] Always-present relay protocol could confuse when no exploration is possible** → Mitigation: The relay protocol clearly states it applies "dispatching for exploration." If no agent can be dispatched, the lifecycle section shows "no OpenSpec skills available" and the agent catalog is empty. The dispatcher will naturally not dispatch for exploration.
- **[Risk] Removing Identity descriptions could reduce context for the dispatcher** → Mitigation: The routing heuristics (when to dispatch for each phase) and skill references (which skill to follow) provide sufficient context for routing decisions. What each phase does is the skill's job to teach, not the dispatcher's.
- **[Trade-off] Computing phases on every `before_agent_start` call rather than caching** → The handler fires every turn, but `event.systemPromptOptions.skills` is always fresh. The computation is lightweight. Caching adds complexity for negligible benefit.
- **[Trade-off] Signal injection into task strings effectively makes the relay protocol a contract between dispatcher and any agent** → This is actually a feature: any agent can participate in multi-turn exploration as long as it follows the signal contract. The specialist explore agent has richer instructions in its own .md file, but the basic signal protocol is universal.