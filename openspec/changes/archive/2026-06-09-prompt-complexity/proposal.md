## Why

The spec-teams prompt ecosystem (6 agent system prompts + the dispatcher system prompt template) has accumulated structural complexity through successive changes without holistic refactoring. The same concepts are stated in 2-3 places: the dispatcher describes the lifecycle three times across three sections, the archive agent restates the same rule three times internally, every agent that has an associated skill (explore, propose, apply, archive) duplicates skill content in its own prompt, and every agent independently re-encodes the "headless constraint" with only cosmetic variation. There is also a direct contradiction: the dispatcher is told to be a "dumb relay" yet must interpret `ready-to-propose` responses by extracting structured briefs. Additionally, agents that depend on external skills have no hard-stop mechanism — if a skill file is missing, the agent continues without its authoritative procedure, producing unreliable behavior. This tangled structure makes prompts harder to reason about, harder to maintain consistently, and introduces ambiguity that could produce unreliable agent behavior.

## What Changes

- **Collapse dispatcher lifecycle redundancy**: Merge the three overlapping sections (Lifecycle, Routing, Working with Agents) into one structured section that describes each phase's identity, routing rules, and workflow guidance in a single pass
- **Extract Explore Relay Protocol**: Move the 40-line relay protocol out of the Routing section into its own dedicated section
- **Resolve the "dumb relay" contradiction**: Clarify that the dispatcher relays `need-input` verbatim but interprets `ready-to-propose` (extracting the structured brief for propose dispatch)
- **Establish consistent headless constraint structure**: Replace 6× near-identical "I am headless" boilerplate with a consistent opening structure that each agent follows — same pattern, agent-specific details — reducing the conceptual surface area
- **Agent prompts reference skills, never duplicate them** (general principle): Every agent that has an associated skill (explore → `openspec-explore`, propose → `openspec-propose`, apply → `openspec-apply-change`, archive → `openspec-archive-change`) SHALL reference the skill as authoritative for procedural content — stance, procedure steps, and guardrails. Agent prompts SHALL contain ONLY material the skill does NOT cover: headless constraint, role boundary, return signal vocabulary, tool notes, and agent-specific adaptations. The explore agent's current five-point stance duplication is the most visible instance of a pattern that also exists in propose, apply, and archive at lower severity.
- **Consolidate archive's internal duplication**: Merge the procedure steps, adaptation table, and decision rules table into a single authoritative flow description
- **Make status signals canonical in agent prompts only**: Define each agent's status signals in its own prompt; the dispatcher references them generically without re-defining individual handling rules
- **Hard-stop on missing skill files**: Every agent that depends on an external skill (explore, propose, apply, archive) SHALL attempt to `read` its skill at startup. If the `read` fails, the agent SHALL hard-stop — return `Status: blocked` with a clear user-facing message explaining which skill is missing, that it is required, and recommending installation of OpenSpec. The agent SHALL NOT proceed without its skill.

## Capabilities

### New Capabilities

None — this change restructures existing content within existing files; no new features are introduced.

### Modified Capabilities

- `explore-agent`: Remove duplicated stance description (stays authoritative in skill). Streamline headless constraint to consistent pattern. Add missing-skill hard-stop. Retain agent-specific: relay protocol, session lifecycle, write constraints, return signals.
- `propose-agent`: Remove duplicated procedure content (stays authoritative in skill). Streamline headless constraint to consistent pattern. Add missing-skill hard-stop. Retain agent-specific: task string contract, findings consumption, return format.
- `apply-agent`: Remove duplicated procedure content (stays authoritative in skill). Streamline headless constraint to consistent pattern. Add missing-skill hard-stop. Retain agent-specific: implementation procedure reference, return format.
- `archive-agent`: Consolidate internal duplication — merge procedure steps, adaptation table, and decision rules into one flow. Remove duplicated skill content. Streamline headless constraint to consistent pattern. Add missing-skill hard-stop.
- `verify-agent`: Streamline headless constraint to consistent pattern. Retain agent-specific: read-only constraint, 7-phase procedure, verdict format.
- `worker-agent`: Streamline headless constraint to consistent pattern. Retain agent-specific: execution stance, return signals, constraints.
- `spec-teams-extension`: Restructure dispatcher prompt template — collapse lifecycle/routing/workflow into one section per phase, extract Explore Relay Protocol as dedicated section, resolve "dumb relay" contradiction, remove duplicated rules.

## Impact

- All 6 `agents/*.md` files — prompt body content restructured
- `extensions/spec-teams.ts` — dispatcher system prompt template string restructured (template string only, no TypeScript logic changes)
- No changes to external files (`.pi/skills/`, `.pi/prompts/`)
- No changes to dispatch mechanism, TUI, metrics, or OpenSpec CLI
- Agent frontmatter (name, description, tools, thinking, model) remains unchanged
- Status signal strings (need-input, done, blocked, etc.) remain unchanged — they are parsed by `detectStatusSignal()`
