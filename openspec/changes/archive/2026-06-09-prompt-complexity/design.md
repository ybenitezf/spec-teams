## Context

The spec-teams extension uses a dispatcher pattern: a primary agent receives a system prompt (built from a TypeScript template string in `spec-teams.ts`) that teaches it to route user intent to specialized sub-agents. Each sub-agent receives its system prompt from the body of its `agents/*.md` file (everything after YAML frontmatter). At runtime, agents use the `read` tool to load external skill files from `.pi/skills/`.

Over successive changes, these prompts accumulated:
- **Dispatcher**: lifecycle described 3 times (Lifecycle section, Routing section, Working with Agents section) with slightly different framing each time
- **Agents**: each independently defines a "headless constraint" with ~75% identical content across 6 files
- **Agents with skills**: explore, propose, apply, and archive agents each duplicate content from their respective skill files (stance, procedure steps, guardrails) in their own prompts
- **Archive**: same rule (artifacts not done → blocked) appears in procedure steps, adaptation table, AND decision rules table
- **Dispatcher contradiction**: "you are a dumb relay" vs. "extract the structured brief from the explore response"

External constraints:
- `.pi/skills/*/SKILL.md` — not modifiable (external skill files); we can only reference them
- `.pi/prompts/` — not modifiable (external prompt fragments); we cannot add files here
- Agent frontmatter (name, description, tools, thinking, model) — must remain valid
- Status signal strings — parsed by TypeScript `detectStatusSignal()`, cannot change format
- `${agentCatalog}` and `${hasWorker}` interpolations in the dispatcher template — code-level concerns, not prompt text

## Goals / Non-Goals

**Goals:**
- Collapse the dispatcher's 3 overlapping lifecycle descriptions into 1 structured section
- Extract the Explore Relay Protocol from Routing into its own dedicated section
- Resolve the "dumb relay" vs. "interpret and act" contradiction
- Establish a consistent headless constraint structure across all 6 agents (same pattern, not shared file)
- Remove duplicated skill content from all agent prompts (explore, propose, apply, archive) — skills are authoritative for procedural content
- Consolidate archive's internal 3-way duplication into a single flow
- Make status signal definitions canonical in agent prompts only

**Non-Goals:**
- Create, modify, or delete any file under `.pi/skills/` or `.pi/prompts/`
- Change TypeScript dispatch logic, TUI rendering, or tool registration
- Change agent frontmatter or status signal strings
- Add new agent capabilities or change agent behavior
- Reduce token count (this is about structural clarity)

## Decisions

### Decision 1: Collapse dispatcher lifecycle sections into per-phase blocks

**Choice**: Replace the three separate sections (Lifecycle, Routing, Working with Agents) with a single "OpenSpec Lifecycle" section where each phase is a single block containing: identity description, routing heuristics, and workflow guidance — all in one place.

**Structure**:
```
## OpenSpec Lifecycle
### Explore — [identity: what explore does]
- Route when: [routing heuristics]
- Workflow: [what happens before/after explore]
### Propose — [identity: what propose does]
- Route when: [routing heuristics]
- Workflow: [what happens before/after propose]
### Apply — ...
### Verify — ...
### Archive — ...
```

**Rationale**: Currently, to understand "when do I dispatch archive?", the dispatcher must read three different sections and reconcile slightly different descriptions. The per-phase block puts everything about one phase in one place. This also eliminates the duplication where the same rule (e.g., "NEVER dispatch archive without user approval") appears in multiple sections.

**Alternatives considered**:
- *Keep 3 sections but deduplicate*: Less disruptive but preserves the "jumping around" problem. Rejected because the structural tangle is the root cause.
- *Merge only Lifecycle and Routing, keep Working with Agents separate*: Half-measure. The working-with-agents section largely restates routing + lifecycle with transition advice appended.

### Decision 2: Explore Relay Protocol as dedicated section

**Choice**: Pull the ~40-line explore relay protocol out of the Routing section into `## Explore Relay Protocol`. This section covers: signal detection (need-input, ready-to-propose, done-exploring, blocked), the multi-turn relay flow, and the propose handoff.

**Rationale**: The relay protocol is conceptually distinct from routing (which agent to pick). It's about HOW to conduct a conversation with an already-dispatched agent. Mixing them confuses both concerns. A dedicated section makes the relay contract explicit and scannable.

### Decision 3: Resolve "dumb relay" with per-signal clarity

**Choice**: Remove the blanket "you are a dumb relay — do not interpret" statement. Replace with explicit per-signal instructions:
- `need-input` → relay the full response to the user verbatim, wait for response
- `ready-to-propose` → extract the structured brief from the response, dispatch propose agent with it
- `done-exploring` → relay summary to user, return to normal operation
- `blocked` → relay blocker to user, ask how to proceed

**Rationale**: The blanket "dumb relay" rule contradicts the explicit handling for `ready-to-propose`. The dispatcher must interpret that signal to extract the brief. Per-signal instructions eliminate the ambiguity — the dispatcher knows exactly when to relay verbatim and when to interpret.

### Decision 4: Consistent headless constraint pattern (not shared file)

**Choice**: Define a consistent opening structure that all 6 agents follow. Each agent's prompt starts with a structured block:

```
You are a [role] agent in the spec-teams extension. You are a headless
sub-agent dispatched by a primary agent to [purpose]. You have no direct
user interaction. You work autonomously until [completion condition].

**Critical constraint:** You run headless. You have NO AskUserQuestion tool,
NO user interaction tools, and NO way to ask for help. When you encounter
ambiguity or blockers, you return `need-input` or `blocked` status. You
NEVER wait for user input — there is no user waiting.

Your job is to [verb] — [elaboration]. You do NOT [other roles]. You [ROLE].
```

Then for agents that need the adaptation table (apply, archive, propose, verify), include the table in a consistent format. Explore and worker keep their own adaptation (explore has a longer one because of its multi-turn nature; worker has a minimal one).

**Rationale**: Since we cannot create shared external files under `.pi/prompts/`, we make the pattern consistent across agents by structural convention. Each agent still has its own text, but the structure, phrasing, and coverage are uniform. This means when someone reads all 6 agents, they see the same mental model rather than 6 independent reinventions.

**The role negation sentence** ("You do NOT X, Y, Z. You ROLE.") is renamed from listing 4 negated roles to a single positive boundary: "You [ROLE]. Do not perform work that belongs to other agents." This removes the implicit phase-list encoding.

### Decision 5: Agent prompts reference skills, never duplicate skill content (GENERAL PRINCIPLE)

**Choice**: Every agent that has an associated skill SHALL reference the skill as the authoritative source for procedural content. The agent prompt SHALL NOT duplicate stance descriptions, procedure steps, or guardrails that exist in the skill. The agent prompt SHALL contain ONLY material the skill does NOT cover.

**Per-agent breakdown**:

| Agent | Skill | What stays in agent prompt | What moves to skill-only |
|-------|-------|---------------------------|--------------------------|
| explore | `openspec-explore` | Relay protocol, session lifecycle, write constraints, return signals, guiding principles not in skill | Five-point stance (curious, visual, adaptive, patient, grounded), procedure steps |
| propose | `openspec-propose` | Task string contract, findings consumption, return format | Artifact creation procedure, guardrails, step-by-step instructions |
| apply | `openspec-apply-change` | Return format, tool notes | Implementation procedure, guardrails |
| archive | `openspec-archive-change` | Blocking conditions, return format | Archive procedure steps, sync instructions |
| verify | (none — no skill) | Full procedure stays inline | N/A — no skill to conflict with |
| worker | (none — no skill) | Full procedure stays inline | N/A — no skill to conflict with |

**Pattern for each agent prompt**: "Follow the `openspec-X` skill exactly. Use the `<available_skills>` block in your prompt to find its location, then read it with the `read` tool. Adopt its stance and follow its procedures." The agent prompt then contains agent-specific material only.

**Rationale**: The explore agent is the worst case (stance duplicated identically across agent prompt and skill), but the same pattern exists for propose, apply, and archive at lower severity — each duplicates parts of its associated skill's procedure. When content exists in both places, the LLM processes it twice, and if the copies ever diverge, contradictory instructions result. Making skills authoritative for procedural content means there is one place to update, and agent prompts stay focused on what's unique to being a headless sub-agent.

**Alternatives considered**:
- *Keep partial duplication for "safety"*: Some procedure steps in the agent prompt ensure the agent has minimal guidance even if it fails to read the skill. Rejected because Decision 8 (missing-skill hard-stop) prevents the agent from running without its skill — the safety net is unnecessary.

### Decision 6: Consolidate archive's internal duplication

**Choice**: Merge the archive agent's three containers (Procedure steps, Adaptation table, Decision rules table) into a single "Archive Procedure" section. Each step describes what to do, what to check, and what happens in headless mode — all inline.

**Before** (3 separate sections):
```
## Procedure
Step 2: If any artifacts are NOT done → return blocked

## Adaptation for Headless Context
| Skill says "warn user" | Agent does "hard block" |

## Headless Decision Rules
| Any artifact not done | blocked |
```

**After** (1 merged section):
```
## Archive Procedure
### Step 2: Check artifact completion
Run `openspec status --json`. If any artifact is not `done`, return
`Status: blocked` listing incomplete artifacts. Do NOT warn-and-proceed;
incomplete artifacts are a hard block.
```

**Rationale**: The three separate containers all encode the same logic. Having them separate means changing one rule requires updating three locations. Merging them makes each step self-contained: the procedure, the headless constraint, and the decision are all in one place.

### Decision 7: Status signals canonical in agent prompts only

**Choice**: Each agent defines its status signals with format templates in its own prompt. The dispatcher prompt references status signals generically: "Sub-agents return a structured status block. Inspect the `Status:` field to determine next action." Specific handling (e.g., explore's `need-input` means relay to user) is documented in the Explore Relay Protocol section — but only for explore, since other agents' signals don't have special multi-turn handling.

**Rationale**: Currently, the dispatcher restates what each signal means for each agent. This is both redundant (if the agent changes its signals, the dispatcher must also change) and incomplete (the dispatcher only has detailed handling for explore signals, not for apply/archive/propose/verify/worker). Making agent prompts authoritative means the signal contract is in one place, and the dispatcher only needs to know the explore-specific relay flow.

### Decision 8: Missing-skill hard-stop

**Choice**: Every agent that depends on an external skill (explore, propose, apply, archive) SHALL include a hard-stop mechanism at the start of execution. The agent SHALL:

1. Attempt to `read` its associated skill file via the `read` tool
2. If the `read` fails (file not found, not available):
   - HARD-STOP — do NOT proceed, do NOT attempt to work without the skill
   - Return `Status: blocked` with a clear message:
     ```
     The skill `openspec-X` is not available. This skill is required for the
     [agent-name] agent to function correctly. Please install OpenSpec to get
     the required skill files, or verify that `.pi/skills/openspec-X/SKILL.md`
     exists in your project.
     ```
   - The agent SHALL NOT fall back to any inline content, attempt to reconstruct the procedure from memory, or proceed in a degraded mode

**Affected agents**: explore (`openspec-explore`), propose (`openspec-propose`), apply (`openspec-apply-change`), archive (`openspec-archive-change`). Verify and worker are NOT affected (they have no skill dependency).

**Rationale**: Currently, if a skill file is missing, agents may proceed using whatever inline content exists in their prompt. After this change removes duplicated inline content (Decision 5), the skill becomes the ONLY source for procedural guidance. Without a hard-stop, a missing skill would leave the agent with no procedure at all — producing unpredictable or wrong behavior. The hard-stop makes the dependency explicit and fails safely.

**Dispatcher handling**: The dispatcher already handles `Status: blocked` generically — it relays the blocker message to the user. No dispatcher prompt changes are needed. The blocked message from the agent contains the actionable recommendation.

**Alternatives considered**:
- *Let the agent fall back to inline content*: Defeats the purpose of deduplication. Requires maintaining two copies of everything. Rejected.
- *Have the dispatcher detect missing-skill blocked and auto-install*: Too invasive — installing packages is outside the dispatcher's scope. Rejected.

## Risks / Trade-offs

- **[Risk] Collapsing dispatcher sections could lose nuance**: The three separate sections each had slightly different framing. Merging them into per-phase blocks might lose some detail. Mitigation: audit each phase block to ensure all behavioral guidance from the original three sections is preserved.

- **[Risk] Consistent headless pattern may not fit all agents equally**: Apply, archive, propose, and verify have similar headless needs, but explore's multi-turn nature and worker's simplicity are different. Mitigation: the pattern is a structural convention, not a rigid template. Explore and worker adapt it to their context while maintaining the same conceptual envelope.

- **[Risk] Removing duplicated skill content from agent prompts could cause agents to miss their procedure**: If an agent fails to load its skill file and has no inline backup, it won't know what to do. Mitigation: the missing-skill hard-stop (Decision 8) prevents the agent from proceeding without its skill. The agent returns `blocked` with a clear installation recommendation rather than attempting to work blind.

- **[Risk] Missing-skill hard-stop adds a startup dependency on file I/O**: If the `read` tool itself is unavailable or filesystem is slow, agents may falsely report skills as missing. Mitigation: the `read` tool is a core Pi agent tool and is always available; filesystem reads are local and fast. If `read` genuinely fails, the agent cannot function regardless — the hard-stop is the safest default.

- **[Risk] Dispatcher prompt restructuring is the riskiest change**: The template string in `spec-teams.ts` has evolved organically and contains subtle dependencies (conditional sections, interpolation points). Restructuring it could break the extension's prompt generation. Mitigation: test the extension loads and produces a valid system prompt after changes. Verify all `${...}` interpolations are preserved.

- **[Trade-off] No shared external file for headless preamble**: Since we cannot create files under `.pi/prompts/`, each agent still has its own headless text. The improvement is structural consistency, not text deduplication. If `.pi/prompts/shared/` becomes available in the future, the pattern could be extracted.

## Open Questions

- Should the "Guiding Principles" in explore.md be removed along with the stance, or do they contain agent-specific material not in the skill? They overlap with the skill's Guardrails section but are not identical — need to check during implementation.
