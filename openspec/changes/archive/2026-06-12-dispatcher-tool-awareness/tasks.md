## 1. Update buildRulesSegment

- [x] 1.1 Add tool-checking rule to `buildRulesSegment()` in `extensions/spec-teams-utils.ts` with the text: "Before dispatching, check the ## Agents catalog to confirm the agent has the tools required for the task (e.g., write and edit for implementation, read and grep for investigation, bash for running commands)"
- [x] 1.2 Verify the existing five rules are preserved unchanged in the returned string

## 2. Tests

- [x] 2.1 Add a test in `tests/unit/spec-teams-utils.test.ts` for `buildRulesSegment()` that asserts the returned string contains `## Agents` (catalog reference)
- [x] 2.2 Add a test asserting the returned string contains `write and edit` as implementation tool examples
- [x] 2.3 Add a test asserting the returned string contains `read and grep` as investigation tool examples
- [x] 2.4 Add a test asserting the returned string contains `bash` as a command-running tool example
- [x] 2.5 Add a test asserting existing rules ("NEVER try to read", "ALWAYS use dispatch_agent", "Keep tasks focused") are still present

## 3. Verification

- [x] 3.1 Run `npx vitest run tests/unit/spec-teams-utils.test.ts` and confirm all tests pass
- [x] 3.2 Inspect the full system prompt output (via `buildSystemPrompt` or integration test) to confirm the rule appears in the `## Rules` section and the `## Agents` catalog is also present in the same prompt