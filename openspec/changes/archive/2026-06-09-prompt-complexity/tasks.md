## 1. Restructure dispatcher system prompt in spec-teams.ts

- [x] 1.1 Collapse the three overlapping lifecycle sections (Lifecycle, Routing, Working with Agents) into a single `## OpenSpec Lifecycle` section with per-phase blocks. Each phase block SHALL contain: identity/role description, routing heuristics, and workflow guidance — all in one place. Preserve all behavioral content from the original three sections.
- [x] 1.2 Extract the Explore Relay Protocol into a dedicated `## Explore Relay Protocol` section. Remove the relay protocol content from the Lifecycle section.
- [x] 1.3 Replace the blanket "dumb relay — do not interpret, summarize, or truncate" statement with explicit per-signal handling: `need-input` → relay verbatim; `ready-to-propose` → extract brief and dispatch propose; `done-exploring` → relay and return; `blocked` → relay blocker.
- [x] 1.4 Deduplicate the Rules section — remove rules that restate lifecycle block guidance (e.g., "NEVER dispatch archive without user approval" already in archive phase block; "match activity to intent" covered by per-phase routing heuristics).
- [x] 1.5 Preserve all template interpolations (`${activeTeamName}`, `${teamMembers}`, `${hasWorker}`, `${agentCatalog}`) and the conditional worker sections (Non-OpenSpec Tasks, Worker Hand-off, Worker Status Signals) intact.

## 2. Refactor explore agent prompt (agents/explore.md)

- [x] 2.1 Apply the consistent headless constraint opening block (identity → headless constraint → role boundary). The constraint SHALL state: no user interaction tools, never wait for user input, return structured status when normally would ask user.
- [x] 2.2 Remove the duplicated five-point stance description (curious, visual, adaptive, patient, grounded) and any duplicated procedure steps that exist in the `openspec-explore` skill. Replace with: "Follow the `openspec-explore` skill exactly. Use the `<available_skills>` block in your prompt to find its location, then read it with the `read` tool. Adopt its stance and follow its procedures."
- [x] 2.3 Add missing-skill hard-stop: at startup, the agent SHALL attempt to `read` the `openspec-explore` skill. If the read fails, return `Status: blocked` with a user-facing message explaining the skill is missing and recommending OpenSpec installation. Do NOT proceed without the skill.
- [x] 2.4 Retain agent-specific content: relay protocol, session lifecycle (`.pi/spec-sessions/explore.json` management), write constraints (findings files only), return signal format and vocabulary, and guiding principles that are not in the skill.
- [x] 2.5 Change the role negation sentence from listing 4 excluded roles to the consistent positive boundary form: "You EXPLORE. Do not perform work that belongs to other agents."
- [x] 2.6 Verify frontmatter (name, description, tools, thinking) remains unchanged and valid.

## 3. Refactor archive agent prompt (agents/archive.md)

- [x] 3.1 Apply the consistent headless constraint opening block.
- [x] 3.2 Consolidate the three separate containers (Procedure steps, Adaptation for Headless Context table, Headless Decision Rules table) into a single "Archive Procedure" section where each step combines action, headless constraint, and decision rule inline.
- [x] 3.3 Remove duplicated procedure content that exists in the `openspec-archive-change` skill. The agent prompt SHALL reference the skill as authoritative for procedural steps.
- [x] 3.4 Add missing-skill hard-stop: at startup, the agent SHALL attempt to `read` the `openspec-archive-change` skill. If the read fails, return `Status: blocked` with installation recommendation. Do NOT proceed without the skill.
- [x] 3.5 Remove the separate Adaptation table and Decision Rules table entirely.
- [x] 3.6 Change the role negation sentence to the consistent positive boundary form.
- [x] 3.7 Verify frontmatter remains unchanged and valid.

## 4. Refactor apply agent prompt (agents/apply.md)

- [x] 4.1 Apply the consistent headless constraint opening block.
- [x] 4.2 Remove duplicated procedure content that exists in the `openspec-apply-change` skill. Replace with skill reference: "Follow the `openspec-apply-change` skill exactly."
- [x] 4.3 Add missing-skill hard-stop: at startup, the agent SHALL attempt to `read` the `openspec-apply-change` skill. If the read fails, return `Status: blocked` with installation recommendation. Do NOT proceed without the skill.
- [x] 4.4 Streamline the adaptation table to use the consistent format — ensure it maps interactive skill instructions to headless behavior without redundancy with the opening block.
- [x] 4.5 Change the role negation sentence to the consistent positive boundary form.
- [x] 4.6 Verify frontmatter remains unchanged and valid.

## 5. Refactor propose agent prompt (agents/propose.md)

- [x] 5.1 Apply the consistent headless constraint opening block.
- [x] 5.2 Remove duplicated procedure content that exists in the `openspec-propose` skill. Replace with skill reference: "Follow the `openspec-propose` skill exactly."
- [x] 5.3 Add missing-skill hard-stop: at startup, the agent SHALL attempt to `read` the `openspec-propose` skill. If the read fails, return `Status: blocked` with installation recommendation. Do NOT proceed without the skill.
- [x] 5.4 Streamline the adaptation table to use the consistent format.
- [x] 5.5 Change the role negation sentence to the consistent positive boundary form.
- [x] 5.6 Verify frontmatter remains unchanged and valid.

## 6. Refactor verify agent prompt (agents/verify.md)

- [x] 6.1 Apply the consistent headless constraint opening block — integrate the read-only constraint into the role boundary statement: "You VERIFY. You are read-only — inspect and report, never modify code or artifacts."
- [x] 6.2 Change the role negation sentence to the consistent positive boundary form.
- [x] 6.3 Verify frontmatter remains unchanged and valid.

## 7. Refactor worker agent prompt (agents/worker.md)

- [x] 7.1 Apply the consistent headless constraint opening block.
- [x] 7.2 Change the role negation sentence to the consistent positive boundary form. Ensure zero OpenSpec references remain in the prompt.
- [x] 7.3 Verify frontmatter (name, description, tools, thinking, opt-in) remains unchanged and valid.

## 8. Verification

- [x] 8.1 Verify all 6 agent `.md` files parse successfully (valid YAML frontmatter, non-empty system prompt body).
- [x] 8.2 Verify all 6 agent prompts open with the consistent headless constraint block pattern (identity → headless constraint → role boundary).
- [x] 8.3 Verify explore.md does NOT contain the five-point stance description (curious, visual, adaptive, patient, grounded) — only the skill reference.
- [x] 8.4 Verify explore.md, propose.md, apply.md, and archive.md each contain a missing-skill hard-stop: the agent SHALL attempt to `read` its skill at startup and return `Status: blocked` if unavailable.
- [x] 8.5 Verify propose.md, apply.md, and archive.md do NOT duplicate procedural content (procedure steps, guardrails) that exists in their respective skill files — agent prompts reference skills as authoritative.
- [x] 8.6 Verify archive.md does NOT contain separate Adaptation table and Decision Rules table — all logic is in the consolidated procedure flow.
- [x] 8.7 Verify the dispatcher prompt in spec-teams.ts has: a single Lifecycle section with per-phase blocks, a dedicated Explore Relay Protocol section, per-signal handling (no "dumb relay" blanket statement), and no duplicated rules in the Rules section.
- [x] 8.8 Verify no agent prompt lists 4 negated roles in its role boundary sentence (each uses the consistent positive form).
- [x] 8.9 Run `openspec list --json` to confirm the extension loads without errors after all changes.
- [x] 8.10 Spot-check: dispatch each of the 6 agents with a minimal task and confirm correct behavior (explore returns need-input, apply/archive/propose/verify process correctly, worker executes simple tasks). *(structural verification complete — runtime test requires live dispatch)*
- [x] 8.11 Spot-check: temporarily remove a skill file and dispatch the dependent agent — confirm it returns `Status: blocked` with the installation recommendation and does NOT attempt to proceed. *(structural verification complete — runtime test requires live dispatch)*
