## Context

The spec-teams extension dispatches work to headless sub-agents (apply, verify, propose, archive) via `dispatch_agent`. Each sub-agent runs as a separate Pi process with its own tools and system prompt. The dispatcher's role is to route user intent to the right agent based on OpenSpec lifecycle phase.

The **explore** phase is currently a gap: the dispatcher has only the `dispatch_agent` tool (no `read`, `bash`, or codebase access), so it cannot investigate the codebase or run the OpenSpec CLI. There is no explore sub-agent to dispatch to. Exploration is either skipped or done without proper tooling.

The `openspec-explore` skill defines explore as a conversational stance — not a fire-and-forget task. This creates tension with the dispatch model, which is one-shot (dispatch → result → done). The other agents (apply, verify, etc.) return a single result; explore is a multi-turn dialogue.

## Goals / Non-Goals

**Goals:**
- Define an explore sub-agent (`agents/explore.md`) that follows the `openspec-explore` skill stance
- Support multi-turn explore conversations via the dispatcher relay with session persistence
- Transfer exploration context to the propose agent via a findings file so artifacts are deeply informed
- Update the dispatcher's system prompt to understand the explore relay protocol
- Keep extension code changes minimal — leverage existing dispatch, session, and tool infrastructure

**Non-Goals:**
- Changing the dispatch mechanism itself
- Giving the dispatcher its own tools for exploration (it remains a pure dispatcher)
- Supporting concurrent multiple exploration topics (one focused change at a time)
- Changing apply, verify, or archive agent behavior
- Session handoff (explore agent taking over the primary session)

## Decisions

### 1. Relay model for multi-turn conversations

**Decision:** The dispatcher acts as a dumb relay — forwarding user messages to the explore agent and explore responses back to the user. The explore agent maintains context via session persistence (`.pi/spec-sessions/explore.json`).

**Alternatives considered:**
- **Session handoff** (explore replaces dispatcher temporarily): Rejected — requires Pi-level session control that doesn't exist in the extension API.
- **Embed explore skill in dispatcher prompt**: Rejected — dispatcher has no codebase tools (only `dispatch_agent`), so it can't effectively explore.
- **One-shot explore** (single dispatch, full result): Rejected — explore is inherently conversational; pre-computing all threads is impossible.

**Rationale:** The relay model reuses existing infrastructure (session persistence already works for cross-invocation memory). The dispatcher already relays results for other agents — adding explore is a protocol addition, not a mechanism change.

### 2. Self-managed session lifecycle

**Decision:** The explore agent manages its own session file. On `ready-to-propose` or `done-exploring`, it deletes `.pi/spec-sessions/explore.json`. On a new topic that doesn't follow from prior context, it detects the mismatch and self-resets.

**Alternatives considered:**
- **Dispatcher-managed sessions** (track metadata, signal fresh/continue): Rejected — adds complexity to dispatcher prompt and extension code. String-matching `[CONTINUE]` conventions are fragile.
- **New session per dispatch**: Rejected — loses cross-turn context, defeating the purpose.

**Rationale:** The explore agent is the only one that knows whether incoming context relates to the current exploration. Trusting it to self-manage is consistent with how other agents manage their own state (apply decides when it's blocked, verify decides its verdict).

### 3. Findings file for explore → propose handoff

**Decision:** The explore agent writes findings to `.pi/spec-sessions/explore-<change-name>.md`. The propose agent reads it for context and deletes it after consuming. The file is ephemeral — it exists only between explore completion and propose start.

**Alternatives considered:**
- **Inline context in task string**: Rejected — exploration findings can be thousands of words; task strings aren't designed for that volume. Dispatcher would need to extract and re-embed, adding fragility.
- **Persistent findings** (committed to repo): Rejected — findings are an internal handoff mechanism. The proper record is the OpenSpec artifacts propose creates, not the raw exploration dump.
- **No handoff — propose re-investigates**: Rejected — defeats the purpose of exploring. Propose would produce shallow artifacts or waste time rediscovering what explore already found.

**Rationale:** `.pi/spec-sessions/` is already an untracked runtime directory. The findings file is self-cleaning (propose deletes it). The convention is simple: `<change-name>` is the shared key between explore and propose.

### 4. Explore agent tools

**Decision:** `read, write, bash, grep, find` — with `write` restricted to findings files only. The explore agent does NOT create OpenSpec artifacts (that is propose's job).

**Alternatives considered:**
- **Read-only** (like verify): Rejected — without `write`, findings cannot be persisted for propose to consume.
- **Full write** (including OpenSpec artifacts): Rejected — the explore skill says "you MAY create artifacts if the user asks," but in spec-teams, artifact creation is propose's responsibility. Constraining explore to findings-only prevents phase boundary blurring.

**Rationale:** `write` is needed solely for the findings bridge file. The system prompt constrains its use.

### 5. Explore return signals

**Decision:** Four signals: `need-input` (conversation continues), `ready-to-propose` (decisions crystallized, includes structured brief), `done-exploring` (user has clarity, no artifacts needed), `blocked` (cannot proceed).

**Alternatives considered:**
- **Two signals** (need-input / done): Rejected — doesn't distinguish "ready to create a change" from "user just wanted to think."
- **Open-ended** (no signals, dispatcher infers): Rejected — dispatcher needs clear signals to route correctly.

**Rationale:** These mirror the existing patterns in apply (`done/blocked/need-input`) and verify (`clean/issues-found/blocked`), maintaining consistency while adding explore-specific states.

### 6. Dispatcher prompt changes

**Decision:** Add explore relay protocol to `before_agent_start` system prompt. The dispatcher learns: (1) explore is multi-turn — relay messages, don't interpret; (2) detect `need-input` → wait for user, dispatch explore again with user response; (3) detect `ready-to-propose` → extract structured brief, dispatch propose; (4) detect `done-exploring` → return to normal operation.

**Rationale:** The dispatcher already has phase-matching logic. Adding explore-specific relay instructions is an incremental change to the existing prompt. No new extension code beyond the prompt string.

## Risks / Trade-offs

- **[Risk] Latency per turn**: Each explore turn spawns a new Pi sub-process (~1-2s startup). → **Mitigation**: Explore sessions persist, so sub-process startup is offset by having full prior context immediately available. For substantial explorations (reading codebase, analyzing), the startup overhead is negligible compared to agent work time.
- **[Risk] Dispatcher may meddle with explore responses**: The dispatcher could summarize, reinterpret, or truncate explore's messages before relaying to the user. → **Mitigation**: The dispatcher prompt instructs it to relay, not interpret. The `dispatch_agent` tool already returns full agent output (truncation only happens in renderResult at 8000 chars).
- **[Risk] Stale session**: If explore returns `ready-to-propose` but the user pivots to a completely new topic before propose runs, the explore session file may have been deleted. Next explore dispatch starts fresh — correct behavior. → **Mitigation**: Already handled by self-managed session lifecycle.
- **[Risk] Findings file lingers**: If propose crashes before deleting the findings file, it remains in `.pi/spec-sessions/`. → **Mitigation**: The file is untracked (not in git). Next exploration with the same change name overwrites it. `session_start` could be extended to clean up `.md` files in that directory, but this is a minor cleanup concern, not a correctness issue.

## Open Questions

- Should `session_start` be extended to wipe non-JSON files in `.pi/spec-sessions/` as a hygiene measure? (Nice-to-have, not required for correctness.)
- Should the explore agent's `write` tool be further restricted (e.g., only allow paths matching `.pi/spec-sessions/explore-*.md`)? The system prompt constraint is sufficient for an AI agent; programmatic restriction adds complexity with marginal benefit.
