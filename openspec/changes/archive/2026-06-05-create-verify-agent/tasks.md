## 1. Verify Agent Definition

- [x] 1.1 Create `agents/verify.md` with YAML frontmatter: `name: verify`, description starting with "Verifies", `tools: read,bash,grep,find` (no write/edit), `thinking: on`
- [x] 1.2 Write Layer 1 (identity): establish agent as headless verify agent that never interacts with users, is read-only, and reports back to dispatcher
- [x] 1.3 Write Layer 2 (procedure): embed the 7-phase verification procedure (Load → Tasks → Requirements → Scenarios → Design → Tests → Verdict) with specific instructions for each phase
- [x] 1.4 Write Layer 3 (adaptation): map user-facing instruction patterns (ask user, wait for guidance) to dispatcher-return equivalents, matching the apply agent's adaptation pattern
- [x] 1.5 Specify verdict format: `clean | issues-found | blocked` with structured issues list referencing specific artifact locations (tasks.md line, spec requirement name, source file path, design decision)

## 2. Dispatcher Prompt Changes

- [x] 2.1 Add verify as 5th activity in the system prompt routing section: `- **verify** — review implementations, validate spec compliance, audit correctness, detect gaps between spec and code`
- [x] 2.2 Update archive activity description to focus on mechanical finalization: sync delta specs via openspec CLI, merge into main specs, move to archive/
- [x] 2.3 Add situational guidance: "Implementation reported complete? → Verify before suggesting archive", "Verification found issues? → Route back to apply with specific fixes", "Verification clean? → Suggest archive"
- [x] 2.4 Add verify to the fluidity guidance section: include verify in the list of activities that can be done in any order, not a fixed sequence

## 3. Verify

- [x] 3.1 Confirm `agents/verify.md` parses correctly with `parseAgentFile()` — returns valid AgentDef with name "verify", tools without write/edit, thinking true
- [x] 3.2 Confirm dispatcher prompt text includes all five activities (grep for "explore", "propose", "apply", "verify", "archive" in the prompt string)
- [x] 3.3 Confirm archive activity description no longer contains "audit" or "validation" keywords (those belong to verify)
- [x] 3.4 Manual review: verify agent system prompt mentions all 7 inspection phases and all 3 verdict states
