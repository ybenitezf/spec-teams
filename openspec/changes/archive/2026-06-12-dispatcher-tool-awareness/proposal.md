## Why

The dispatcher prompt contains 11 routing instructions that say "dispatch the most suitable available agent" (or similar), but none of them tell the dispatcher to verify the selected agent has the tools required for the task. Tool information exists in the `## Agents` catalog at the bottom of the prompt, but the routing language never cross-references it. An LLM may route based on name/description matching alone, potentially dispatching to an agent that lacks critical tools like `write`, `edit`, or `bash` — for example, dispatching a file-creation task to the verify agent, which is intentionally read-only (no `write` or `edit`).

## What Changes

- Add a single rule to `buildRulesSegment()` in `spec-teams-utils.ts` that instructs the dispatcher to check the `## Agents` catalog for tool availability before dispatching
- Update unit tests to verify the new rule text is present in the rules segment

## Capabilities

### New Capabilities

- `dispatcher-tool-awareness`: A new operational rule in the dispatcher prompt that bridges the gap between routing instructions and the agent catalog's tool information

### Modified Capabilities

None. The existing `spec-teams-extension` spec's system prompt requirements are refined, but the requirement structure (sections, ordering, content constraints) is unchanged — the new rule fits within the existing Rules section and does not alter any stated requirements or scenarios. No spec-level behavior change; this is an additive prompt rule within the existing framework.

## Impact

- `extensions/spec-teams-utils.ts` — one new bullet in `buildRulesSegment()`
- `tests/unit/spec-teams-utils.test.ts` — new test for the new rule content
- Dispatcher behavior — improved routing that considers tool availability alongside agent name/description matching