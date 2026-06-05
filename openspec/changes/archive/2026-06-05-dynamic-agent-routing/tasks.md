## 1. Replace hardcoded routing in system prompt

- [x] 1.1 Remove the "Phase → Agent Routing" section (hardcoded routing table) from the system prompt in `before_agent_start`
- [x] 1.2 Remove the "User Trigger Mapping" section (command-to-agent mapping) from the system prompt
- [x] 1.3 Remove the "Common Workflow Patterns" section (hardcoded agent names in workflow patterns) from the system prompt
- [x] 1.4 Remove the old "How to Work" section (references specific agent names) from the system prompt

## 2. Add generic routing and workflow guidance

- [x] 2.1 Add a "## Routing" section with phase-to-role heuristics (explore → investigation/research, propose → design/architecture, apply → implementation/coding, archive → review/audit)
- [x] 2.2 Add a "## Working with Agents" section with generic guidelines (chain across phases, one objective per dispatch, evaluate results, handle failures)

## 3. Preserve existing dynamic sections

- [x] 3.1 Verify the OpenSpec Lifecycle descriptions (explore, propose, apply, archive) remain intact
- [x] 3.2 Verify the Rules section (never read/write directly, always use dispatch_agent) remains intact
- [x] 3.3 Verify the dynamic agent catalog (`${agentCatalog}`) remains intact at the bottom of the prompt

## 4. Verify

- [x] 4.1 Run `pi -e ./extensions/spec-teams.ts -p "hello"` to confirm the extension loads without errors
- [x] 4.2 Inspect the injected system prompt (via debug or logging) to confirm no hardcoded agent names ("scout", "change-designer", "spec-writer", "spec-reviewer", "prompt-engineer") appear in routing instructions
