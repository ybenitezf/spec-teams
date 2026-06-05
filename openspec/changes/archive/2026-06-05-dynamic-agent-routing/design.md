## Context

The dispatcher system prompt in `extensions/spec-teams.ts` is constructed in the `before_agent_start` handler. The top portion is static text; the bottom (`## Agents`) is dynamically populated from `agentStates`. The static portion currently hardcodes agent names in a routing table, despite the agent catalog being dynamic.

The existing prompt structure:

```
Role definition (static ✓)
Active Team info (dynamic ✓)
OpenSpec Lifecycle descriptions (static ✓)
Routing table (static ✗ — hardcodes agent names)
Command mapping (static ✗ — hardcodes agent names)
Workflow patterns (static ✗ — hardcodes agent names)
How to Work (static ✗ — mentions specific agents)
Rules (static ✓)
Agent catalog (dynamic ✓)
```

## Goals / Non-Goals

**Goals:**
- Remove all hardcoded agent names from the system prompt's routing instructions
- Replace static routing table with phase-based heuristics that describe agent *roles* not agent *names*
- Preserve the OpenSpec lifecycle descriptions (they're phase knowledge, not routing)
- Preserve the existing dynamic agent catalog injection
- No changes to agent `.md` format, `teams.yaml`, or any file other than `extensions/spec-teams.ts`

**Non-Goals:**
- No new frontmatter fields for agents
- No new YAML configuration for routing
- No new tools or commands
- No changes to how agents are loaded or dispatched

## Decisions

### Decision 1: Phase-to-description heuristics over phase-to-name mapping

**Chosen**: Replace the routing table with descriptive guidance per phase.

Instead of:

```
| "explore X"        | explore | scout              |
| "create proposal"  | propose | change-designer    |
```

Use:

```
- **explore** — agents focused on investigation, research, codebase analysis, discovery
- **propose** — agents focused on design, architecture, planning, proposal writing
- **apply** — agents focused on implementation, coding, writing specs, editing files
- **archive** — agents focused on review, audit, validation, cleanup
```

The LLM matches the user's intent → OpenSpec phase → scans agent catalog for the agent whose description best fits the phase description. This works with any team composition.

**Alternatives considered:**
- Role tags in agent frontmatter (`role: explorer`) — rejected because it adds a new convention and the user wants to keep existing agent format
- Routes in `teams.yaml` — rejected because it separates routing from agent definitions, adding config burden
- Giving dispatcher a `list_agents` tool — rejected because it adds round-trips and the catalog is already in the prompt

### Decision 2: Drop command mapping entirely

The command mapping table (`/opsx-explore` → scout, `/opsx-propose` → change-designer, etc.) is removed without replacement. The lifecycle descriptions already explain what each phase does. The slash commands inherently imply a phase; the LLM doesn't need a separate mapping for that. The OpenSpec skill prompts handle per-phase behavior independently.

### Decision 3: Streamline workflow guidance

The hardcoded workflow patterns (`Exploration before design: Always explore first (scout)`) and "How to Work" instructions are collapsed into a single generic "Working with Agents" section. Key principles preserved:
- Chain agents across phases (explore → design → implement → review)
- One objective per dispatch
- Evaluate results before next dispatch
- Handle failures by retrying or rephrasing

### Decision 4: Preserve lifecycle descriptions and rules

The four-phase OpenSpec lifecycle descriptions and the dispatcher rules (`NEVER try to read/write directly`, `ALWAYS use dispatch_agent`) remain unchanged. These carry no agent-specific information and apply universally.

## Risks / Trade-offs

- [Risk: LLM picks the wrong agent without explicit name mapping] → Mitigation: The catalog includes agent descriptions; the LLM has strong semantic matching capability. In testing, phase-to-description matching is a well-understood pattern for LLMs. If an agent is mismatched, the user can correct the dispatcher.
- [Risk: Small teams with only one agent miss routing guidance] → Mitigation: The prompt already says "If no agent clearly matches, use the most general-purpose agent available. If unsure which phase applies, start with explore." This handles single-agent teams gracefully.
