## Context

The spec-teams-extension has two specialist agents (apply, verify) and a dispatcher that routes intent to agents based on activity descriptions. This change adds two more agents (propose, archive) covering the remaining activities in the OpenSpec lifecycle. The existing agent pattern — Markdown frontmatter definition + headless system prompt + session-resume via JSON files — is well-established and reused without reinvention.

No changes to the `dispatch_agent` tool, agent scanning, teams loading, or TUI widget infrastructure. The existing infrastructure handles any agent defined under `agents/*.md` automatically.

## Goals / Non-Goals

**Goals:**
- Deliver two new agent definition files following the established Markdown frontmatter pattern
- The propose agent SHALL follow `openspec-propose` skill with headless adaptations
- The archive agent SHALL follow `openspec-archive-change` skill with headless adaptations
- Update the dispatcher system prompt with routing guidance for propose and archive transitions
- Archive is gated: dispatcher asks user after clean verify before dispatching archive

**Non-Goals:**
- No explore agent (deferred to a future change)
- No modifications to the `openspec-propose` or `openspec-archive-change` skills themselves
- No changes to the `dispatch_agent` tool implementation
- No changes to session management or agent spawning logic
- No changes to the propose→apply handoff (apply agent already reads tasks.md from the change)

## Decisions

### 1. Two separate agents, not one combined

**Chosen:** `agents/propose.md` and `agents/archive.md` as distinct files.

**Alternatives considered:**
- **Single "planner" agent**: Would cover both propose and archive under one definition. Rejected because propose (creative, design-oriented) and archive (procedural, safety-critical) are different cognitive modes. The dispatcher's description-based routing works better with distinct agents. Safety boundaries are clearer when the archive agent is tightly scoped.

### 2. Archive agent always syncs; blocks on warnings

**Chosen:** The `openspec-archive-change` skill prompts the user with sync/skip and warn/continue choices. In headless mode, the agent SHALL always sync delta specs and SHALL return `blocked` for incomplete artifacts or unchecked tasks.

**Rationale:** By the time the archive agent is dispatched, three gates have been passed: apply says "done," verify says "clean," and the user approved the archive. At that point, asking "sync or skip?" is noise. Incomplete artifacts or tasks at this stage indicate a process failure (verify should have caught them), so blocking is the safe choice.

**Alternatives considered:**
- **Warn in output but proceed anyway**: Rejected — an incomplete change should not be archived. The dispatcher would need to parse warnings from output text, which is fragile.
- **Return need-input for sync/skip**: Rejected — adds a dispatcher roundtrip for a question the user already answered.

### 3. Propose agent receives context via structured task string

**Chosen:** The dispatcher packages explore decisions into a structured task string with sections for change name, problem, approach, scope, and constraints. The propose agent treats this as authoritative input.

**Rationale:** Unlike the propose→apply handoff (where context lives in files), the explore→propose handoff has no file artifacts. The task string is the only context bridge. The propose agent does NOT re-investigate or second-guess explore decisions.

**Alternatives considered:**
- **Explore writes an intermediate file (BRIEF.md)**: Rejected — adds a non-OpenSpec artifact to the filesystem with no lifecycle management.
- **Dispatcher creates the proposal skeleton first**: Rejected — the dispatcher has no write tools and cannot create files.

### 4. Tool set differences

**Chosen:** 
- Propose: `read, write, edit, bash, grep, find` — needs `edit` for modifying artifact files during iteration, and `grep`/`find` for reading existing specs during context gathering.
- Archive: `read, write, bash` — needs `write` only for edge cases (directory creation), no `edit` needed. The `mv` and `mkdir` operations run through `bash`.

**Rationale:** The archive agent's work is mostly CLI-driven (`openspec status`, `mkdir`, `mv`). It reads files to check completion but doesn't produce or edit files beyond what the CLI handles. The propose agent, however, writes proposal.md, design.md, tasks.md, and spec deltas — all through `write` tool calls, with occasional `edit` for iteration.

### 5. Both agents use thinking: on

**Chosen:** Both agents get `--thinking on` when spawned.

**Rationale:** Propose involves design decisions and tradeoff analysis. Archive involves conflict detection and correctness verification. Both benefit from extended reasoning. The existing apply and verify agents also use thinking, establishing the pattern.

### 6. No changes to existing agent loader or dispatch infrastructure

**Chosen:** The existing `scanAgentDirs()`, `parseAgentFile()`, `dispatchAgent()`, and `agentStates` Map handle any agent definition automatically. No code changes needed beyond the system prompt string in `before_agent_start`.

**Rationale:** The infrastructure was designed to be agent-agnostic — it reads Markdown files, parses frontmatter, and spawns `pi` processes with the extracted configuration. Adding agents is purely additive (new `.md` files).

## Risks / Trade-offs

- **[Archive runs before verify]** → If the dispatcher routes directly to archive without a prior verify, an incomplete change could be finalized. Mitigation: The system prompt explicitly states archiving SHALL only be suggested after clean verification AND user approval. The archive agent itself checks artifact/task completion as a defense-in-depth measure.
- **[Propose agent receives insufficient context]** → If the dispatcher provides a vague task string (e.g., just "create a proposal for 2FA"), the propose agent may produce a misaligned proposal. Mitigation: The propose agent returns `need-input` when context is insufficient. The dispatcher prompt includes guidance on what a structured brief should contain.
- **[Archive sync conflicts]** → Delta specs may conflict with main specs if another change modified the same spec domain. Mitigation: The `openspec archive` CLI (or manual sync) handles conflict resolution. This risk exists regardless of agent design.

## Open Questions

- **Explore agent design** will revisit the explore→propose handoff. When an explore agent exists, the dispatcher might delegate the context-synthesis step to the explore agent (returning a structured brief) rather than doing it itself. This is deferred to the explore agent change.
