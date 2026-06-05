## Context

The spec-teams extension currently has one agent definition (`apply`) and a dispatcher prompt with 4 activities (explore, propose, apply, archive). The apply agent reports its own status as `done`, but there is no independent verification that the implementation matches the spec. The archive activity description currently lumps audit/validation together with mechanical archiving — but these are fundamentally different operations: verification is read-only inspection; archiving mutates file structure.

Two distinct agents are needed: a verify agent (read-only, gates archive) and a future archive agent (mutates, runs `openspec archive`). This design covers the verify agent and the dispatcher prompt changes to support it.

## Goals / Non-Goals

**Goals:**
- Create a verify agent that independently audits apply agent output
- Agent must be read-only — no `write` or `edit` tools
- Agent must perform Level 3 inspection: task completeness, requirement coverage, scenario tracing, design coherence, and test execution
- Agent must return structured verdicts the dispatcher can route (clean → suggest archive; issues-found → route back to apply)
- Dispatcher prompt must gain a 5th activity (verify) with phase-appropriate keywords
- Archive activity description must shift from audit/validation to mechanical sync/merge
- Dispatcher must have situational guidance for verify→apply feedback loops
- No new dependencies, no extension code changes beyond system prompt text

**Non-Goals:**
- Creating an archive agent (future change)
- Modifying the `dispatch_agent` tool or spawn logic
- Adding verify as a new OpenSpec skill (`.pi/skills/openspec-verify-change/`)
- Running `openspec validate` in verify — that belongs to archive
- Verify agent re-dispatching apply directly — it always returns to dispatcher
- Machine-parseable output (JSON) — text format is sufficient
- Auto-fixing issues — verify only reports

## Decisions

### Decision 1: Verify agent has no skill dependency

**Choice:** The verify agent does NOT reference an `openspec-verify-change` skill. Its entire procedure is embedded in the system prompt.

**Rationale:** Unlike apply (which follows the well-defined `openspec-apply-change` skill), verification in this context is a custom inspection procedure designed for the spec-teams workflow. No equivalent skill exists in the OpenSpec ecosystem, and creating one would add a maintenance dependency without a corresponding upstream standard. The verification procedure (load → check tasks → cover requirements → trace scenarios → check design → run tests → verdict) is concise enough to embed directly.

**Alternatives considered:**
- *Create a custom skill at `.pi/skills/openspec-verify-change/SKILL.md`* — Adds file to maintain, no upstream standard, no reuse benefit at this stage.
- *Reference the apply skill and adapt* — The apply skill is about implementation, not verification. Different procedure entirely.

### Decision 2: Read-only tool set (no write, no edit)

**Choice:** Agent tools: `read,bash,grep,find`. Explicitly exclude `write` and `edit`.

**Rationale:** Verification is inspection, not mutation. Granting `write`/`edit` would allow the verify agent to accidentally modify code or artifacts — undermining its role as an impartial auditor. The `bash` tool is retained for running `openspec list`, `npm test`, `grep` via shell, and reading files via CLI when needed.

**Alternatives considered:**
- *Include write for "marking verification results in tasks.md"* — Dangerous; verification results belong in the return text, not in artifacts. Modifying artifacts during audit creates confusing state.
- *Remove bash entirely* — Too restrictive; bash is needed for `openspec list --json`, test execution, and pattern searching via `grep -r`.

### Decision 3: Level 3 inspection procedure

**Choice:** The agent prompt describes a 7-phase procedure: Load artifacts → Check task completeness → Cover requirements → Trace scenarios → Check design coherence → Run tests → Return verdict.

**Rationale:** This covers the full spectrum from mechanical (are tasks checked?) to deep (does this scenario trace to specific code?). Level 3 is the maximum value an AI agent can provide without runtime execution — it can read code, reason about coverage, and run tests, but it can't do dynamic analysis or integration testing. Each phase has a clear success criterion so the agent knows when to move on vs flag an issue.

**Alternatives considered:**
- *Level 1 only (task checkboxes)* — Fast but shallow. Misses the most valuable verification: spec-code gap detection.
- *Level 2 (requirement grep)* — Better but doesn't trace scenarios or check design coherence. Leaves significant blind spots.
- *Full static analysis with AST parsing* — Impractical for a prompt-based agent without dedicated tools.

### Decision 4: Verdict format — clean | issues-found | blocked

**Choice:** Three-state verdict, with issues referencing specific artifact locations.

**Rationale:**
- `clean` — All phases pass. Dispatcher can suggest archive.
- `issues-found` — Problems detected. Each issue references a specific location (tasks.md line, spec requirement name, source file path, design decision). This precision lets the dispatcher construct targeted fix tasks for apply.
- `blocked` — Can't complete verification (missing artifacts, can't find change, test suite broken). Dispatcher needs to resolve the blocker before verification can proceed.

Issues are text, not files. The dispatcher reads the return text and constructs fix tasks in its own dispatch to apply.

**Alternatives considered:**
- *Pass/fail binary* — Loses the distinction between "verification found problems" and "verification couldn't run." The dispatcher needs to handle these differently.
- *JSON output* — Machine-parseable but adds complexity. The dispatcher currently parses text output, not structured data. Consistent Markdown format is human-readable and dispatcher-parseable.

### Decision 5: Change name — explicit with auto-detect fallback

**Choice:** Agent accepts optional change name from dispatcher. If not provided, auto-detects via `openspec list --json` and selects the most recently modified change.

**Rationale:** At verification time, the dispatcher already knows which change was just implemented (it dispatched the apply agent for that change). The dispatcher can pass the name explicitly. Auto-detect is a safety net for cases where the dispatcher omits it.

**Alternatives considered:**
- *Always require explicit name* — Adds friction; dispatcher might forget to pass it.
- *Only auto-detect* — Ambiguous if multiple changes are in progress.

### Decision 6: thinking: on

**Choice:** Enable extended reasoning for the verify agent.

**Rationale:** Verification requires careful comparison of spec text to code, tracing scenarios across files, and evaluating whether patterns match design intent. This is reasoning-heavy work. Accuracy matters more than token cost — false positives (flagging non-issues) erode trust, and false negatives (missing real gaps) defeat the purpose.

**Alternatives considered:**
- *thinking: off for speed* — Verification is not latency-sensitive (it runs between apply and archive, not in a user-facing loop). Accuracy is more important.

### Decision 7: Test execution — best effort, report failures

**Choice:** Agent attempts to detect and run the project's test suite. If tests exist and pass, that's positive evidence. If tests fail or don't exist, that's flagged as an issue but not a blocker.

**Rationale:** Tests are the strongest signal of correctness, but not all projects have them. The agent should try to run them but not fail verification solely because tests are absent. Detection heuristics: check `package.json` scripts (npm test), `Makefile`, `pytest`, `cargo test` patterns. If no test framework is detectable, flag it as a coverage gap.

**Alternatives considered:**
- *Always require tests* — Too strict; many projects in early stages don't have tests. Verification would always fail.
- *Never run tests* — Misses the strongest correctness signal available to a read-only agent.

### Decision 8: Dispatcher prompt — add verify as 5th activity, shift archive

**Choice:** The dispatcher prompt's activity list expands from 4 to 5. The archive activity description changes from "review, audit, validation, cleanup" to "finalize changes: sync delta specs via openspec CLI, merge into main specs, move to archive/". The new verify activity covers "review implementations, validate spec compliance, audit correctness, detect gaps between spec and code."

**Rationale:** Audit/validation is verification work, not archiving work. Moving these keywords to verify makes each activity's scope clear and non-overlapping. The dispatcher can now reason about a verify-before-archive gate without hardcoded rules — it's a natural consequence of the activity descriptions.

**Alternatives considered:**
- *Keep 4 activities, fold verify under archive* — Confuses two different operations. Archive needs write access; verify must be read-only. Keeping them separate aligns tool profiles with activity descriptions.
- *Add verify but keep archive description unchanged* — Creates overlap (both mention audit/validation) and ambiguity for the dispatcher's routing heuristic.

### Decision 9: Situational guidance additions

**Choice:** Add three guidance points to the dispatcher prompt:
1. "Implementation reported complete? → Verify before suggesting archive"
2. "Verification found issues? → Route back to apply with specific fixes"
3. "Verification clean? → Suggest archive"

**Rationale:** These are heuristics, not rules. They guide the dispatcher toward a natural verify→apply→verify→archive loop without mandating it. The dispatcher can still skip verification for trivial changes or when the user explicitly wants to archive immediately. This maintains the fluidity principle.

**Alternatives considered:**
- *No guidance, let dispatcher figure it out* — The dispatcher might never discover the verify-before-archive pattern on its own.
- *Mandatory pipeline (always verify after apply)* — Violates the fluidity principle. Small changes shouldn't require full verification.

### Decision 10: Prompt structure — three layers, same pattern as apply

**Choice:** The verify agent prompt follows the same three-layer structure as apply:
1. **Identity** — "You are a verify agent. Headless. Read-only."
2. **Procedure** — The 7-phase verification procedure embedded inline (no skill reference).
3. **Adaptation** — "When skill/pattern says 'ask user', return to dispatcher."

**Rationale:** Consistency with the apply agent makes both agents easier to understand and maintain. The difference is Layer 2: apply references an external skill; verify embeds its procedure directly (Decision 1).

**Alternatives considered:**
- *Single monolithic prompt* — Less maintainable, harder to see the structure.
- *Reference a skill despite no upstream standard* — Would require creating and maintaining a custom skill file.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Verify agent may flag false positives (correct code flagged as missing) | Agent prompt emphasizes "evidence of implementation" — grep finding a function name is evidence; requiring exact line-level match is not. Agent should err toward caution in ambiguous cases and note uncertainty. |
| Verify agent may miss real gaps (false negatives) | Level 3 depth covers multiple dimensions. Scenario tracing catches what grep-only would miss. But some gaps (runtime behavior, integration edge cases) are inherently invisible to static inspection. Acceptable limitation for v1. |
| Dispatcher may over-verify (verify trivial changes) | Situational guidance says "Implementation reported complete? → Verify" but fluency principle allows dispatcher to skip. The dispatcher's judgment call — not a hard rule. |
| Test execution may hang or have side effects | Agent should set a reasonable timeout on test execution via bash. If tests hang, flag as blocked with explanation. |
| No openspec-verify-change skill means no upstream updates | Acceptable. Verification is custom to spec-teams workflow. If OpenSpec later adds a verify skill, we can adopt it and reduce embedded procedure. |
| Dispatcher prompt changes may shift routing for existing teams | The verify activity uses keywords (verify, validate, audit, review) that don't overlap with existing apply/propose activities. If a team has no verify agent, dispatcher won't find one for that phase — graceful degradation. |
