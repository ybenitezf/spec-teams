## Context

The explore→propose findings handoff uses a shared file path: `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md`. Both agents must construct the same path, but the `encodeCwd()` algorithm is opaque to them — it's a TypeScript function in `spec-teams-utils.ts` that agents cannot execute. Agents must guess the encoding, leading to path mismatches.

Current architecture:
- The extension computes `sessionDir = join(homedir(), ".pi", "spec-teams", encodeCwd(cwd))` at startup
- `dispatchAgent()` spawns sub-agent processes with `--append-system-prompt` (static markdown) and a task string (dynamic)
- The dispatcher prompt (`buildExploreRelaySegment`) already instructs the dispatcher agent to inject signal definitions into explore task strings
- Agent prompts reference `<encoded-cwd>` opaquely without specifying how to compute it

The `encodeCwd()` function:
1. Strips leading `/` or `\`
2. Replaces `/`, `\`, `:` with `-`
3. Wraps result in `--...--`

## Goals / Non-Goals

**Goals:**
- Make the explore→propose findings handoff reliable by eliminating agent guesswork
- Inject the computed `encoded-cwd` value into agent task strings at the `dispatchAgent()` level
- Update agent prompts to reference the injected value
- Optionally clean up stale `.md` findings on `session_start` to prevent cross-session contamination

**Non-Goals:**
- Changing the `encodeCwd()` algorithm itself
- Changing the findings file format or location
- Adding a discovery mechanism (e.g., directory listing fallback)
- Modifying the dispatcher agent's responsibilities — injection happens in extension code

## Decisions

### Decision 1: Inject `encoded-cwd` at `dispatchAgent()` level, not via dispatcher prompt

**Chosen:** When `dispatchAgent()` is called for an explore or propose agent, prepend the `encoded-cwd` value to the task string before spawning the sub-process.

**Rationale:** The dispatcher prompt approach would require the dispatcher agent (a third agent) to correctly construct task strings with the value. This adds an indirection layer that could fail if the dispatcher agent misinterprets instructions. Injecting at `dispatchAgent()` keeps the value injection in extension code — a single source of truth that agents cannot bypass.

**Alternative rejected (dispatcher prompt injection):** `buildExploreRelaySegment()` would include an instruction and the `encoded-cwd` literal. Rejected because it requires the dispatcher agent to faithfully copy the value into every explore/propose task, adding a failure mode for no benefit.

**Alternative rejected (document algorithm only):** Prompts would include the encoding steps. Rejected as fragile — if `encodeCwd()` changes, prompts drift. Also doesn't help agents that misread prompts.

### Decision 2: Module-level variable for `encodedCwd`

**Chosen:** Store `currentEncodedCwd` as a module-level variable, set in `loadAgents()` alongside `sessionDir`.

**Rationale:** `sessionDir` already exists as a module-level variable computed from `encodeCwd(cwd)`. Storing `encodedCwd` separately avoids extracting it from `sessionDir` via string manipulation. Same lifecycle — set on `session_start` / team activation, reused for all dispatches.

### Decision 3: Agent-specific injection (explore and propose only)

**Chosen:** Inject `encoded-cwd` only for agents named "explore" or "propose".

**Rationale:** Other agents (apply, archive, verify, worker) don't use the findings file path. Injecting into all task strings would be unnecessary noise.

### Decision 4: Prepend format — `encoded-cwd: <value>\n\n<original task>`

**Chosen:** Prepend a simple key-value line to the task string, separated by a blank line from the original task.

**Rationale:** Agents parse the task string; a simple prefix like `encoded-cwd: --home-yoel-src-...--` is machine-detectable (regex) and human-readable. The blank line separates injected metadata from the actual task so agents don't confuse them.

### Decision 5: Update agent prompts with fallback algorithm

**Chosen:** Agent prompts reference the injected value as the primary source, with the encoding algorithm documented as a fallback.

**Rationale:** If the injection mechanism ever fails (unlikely but possible), agents have a documented fallback. The algorithm is simple enough to include inline (3 steps) without maintenance burden.

### Decision 6: Session-start cleanup of stale `.md` files

**Chosen:** Extend `session_start` to also remove stale `.md` findings files from `sessionDir`.

**Rationale:** Currently `session_start` wipes `.json` session files but leaves `.md` findings. If a propose agent is never dispatched (user changes mind after explore), findings linger into the next session. A subsequent propose with the same change name could pick up stale context. Cleaning up `.md` files on session start prevents this.

## Risks / Trade-offs

**[Risk] Injected prefix breaks existing agent task parsing** → Mitigation: The prefix uses a simple key-value format (`encoded-cwd: <value>`) separated by a blank line. Agents can ignore unknown prefixes. Existing agents only parse the user message portion — adding a prefix doesn't change message semantics.

**[Risk] Session-start `.md` cleanup deletes non-findings files** → Mitigation: Only delete files matching the `explore-*.md` glob pattern, not all `.md` files. The `sessionDir` should only contain extension-managed files.

**[Risk] Module-level variable not thread-safe** → Mitigation: The extension runs single-threaded per session. No concurrent dispatches share state unsafely.
