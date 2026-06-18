## Context

The spec-teams extension uses a multi-agent system where each agent is defined as a standalone markdown file in `agents/`. Agents follow a consistent pattern: YAML frontmatter with name, description, tools, model, and thinking fields, followed by a system prompt body. The existing `apply` agent (`agents/apply.md`) handles general-purpose implementation tasks but lacks browser automation for web development verification. The `chrome-devtools-cli` skill is already available in the skill environment and provides DOM inspection, visual verification, interaction testing, and screenshot capabilities through bash commands — no new tools need to be added to the agent definition.

## Goals / Non-Goals

**Goals:**
- Create a standalone agent file `agents/apply-web-dev.md` specializing in web development implementation tasks with browser automation
- Use the `chrome-devtools-cli` skill for visual verification during implementation
- Use a vision-capable model (`opencode-go/kimi-k2.6`) capable of interpreting screenshots
- Guard for both required skills (`openspec-apply-change` and `chrome-devtools-cli`) with hard-stop on missing
- Follow the same headless workflow pattern as the base `apply` agent

**Non-Goals:**
- Do NOT modify `teams.yaml`, the existing `apply.md`, or any other agent files
- Do NOT modify extension code (TypeScript, Pi SDK integration)
- Do NOT add new runtime dependencies
- Do NOT change how the dispatcher routes tasks — this is determined by the description field in frontmatter and user configuration in `teams.yaml`
- Do NOT modify existing OpenSpec specs for other agents

## Decisions

### Decision 1: Standalone agent file rather than modifying existing apply agent

**Rationale:** The existing apply agent has a well-defined spec (`apply-agent`), a specific model (`deepseek-v4-flash`), and a focused skill set. Web development tasks require a vision-capable model (for screenshot inspection) and a different skill requirement (`chrome-devtools-cli`). Modifying the existing agent would:
- Couple web-specific concerns to general implementation tasks
- Force all apply tasks to use a vision-capable model (higher cost/latency)
- Add an optional skill check that's irrelevant for non-web tasks
- Violate the established pattern of specialized, single-responsibility agents

**Alternatives considered:**
- **Modify apply.md to optionally use chrome-devtools:** Rejected because it adds conditional complexity, burdens the general agent, and forces a model change.
- **Use worker agent with chrome-devtools skill:** Rejected because the worker agent doesn't follow `openspec-apply-change` procedures — it's a general task executor, not a spec-driven implementation agent.
- **Create a separate "verify-web" agent that only validates after apply:** Rejected because web implementation benefits from iterative visual verification during the apply phase (inspect rendered output, verify correctness, iterate), not just a post-hoc check.

### Decision 2: Use chrome-devtools-cli skill via bash rather than adding Playwright directly

**Rationale:** The `chrome-devtools-cli` skill is already installed in the skill environment (`~/.agents/skills/chrome-devtools-cli/SKILL.md`). It operates entirely through bash commands (`chrome-devtools take_snapshot`, `chrome-devtools take_screenshot`, etc.), which means:
- No new tools need to be added to the agent's `tools` field — bash is already present
- No new npm packages or system dependencies
- The skill file provides authoritative procedures and documentation

**Alternatives considered:**
- **Add Playwright as an npm dependency and use it directly:** Rejected because it adds a dependency, requires tool registration, and duplicates functionality already available through `chrome-devtools-cli`.
- **Use Puppeteer:** Rejected for same reasons as Playwright.

### Decision 3: Use opencode-go/kimi-k2.6 as the model

**Rationale:** Web development verification often involves inspecting rendered output visually — checking CSS styling, layout correctness, component positioning, and visual regressions. The `kimi-k2.6` model is vision-capable, meaning it can interpret screenshots taken by `chrome-devtools-cli`. The base apply agent's `deepseek-v4-flash` model is not vision-capable.

**Alternatives considered:**
- **Use the same deepseek-v4-flash as apply:** Rejected because it cannot interpret screenshots, defeating the purpose of browser automation for visual verification.
- **Use a different vision model (e.g., GPT-4o, Claude):** These are valid alternatives but `kimi-k2.6` is selected based on availability and cost in the current environment.

### Decision 4: Guard for both skills with hard-stop

**Rationale:** The agent depends on two skills: `openspec-apply-change` (for task implementation procedures) and `chrome-devtools-cli` (for browser automation). If either is missing, the agent cannot function correctly. Following the same pattern as the base apply agent's single-skill guard, the web-dev variant guards for both with a clear message specifying both are required.

**Alternatives considered:**
- **Soft-fail (warn but proceed) if chrome-devtools is missing:** Rejected because web verification is core to the agent's purpose — without it, the agent is just a duplicate of the base apply agent with a different model.
- **Guard only for openspec-apply-change:** Rejected because chrome-devtools-cli is equally critical for this agent's specialized role.

### Decision 5: System prompt mirrors apply.md structure with web-specific additions

**Rationale:** The `apply-web-dev.md` prompt should follow the same structural pattern as `apply.md` to maintain consistency across agents. The differences are:
- Two-skill guard block (instead of one)
- Web-specific adaptation instructions (use chrome-devtools for visual verification during implementation)
- Model selection handled by frontmatter

The prompt does NOT duplicate the `chrome-devtools-cli` skill content — it references the skill by name and instructs the agent to read it via the `read` tool, following the same "reference skill, don't duplicate" pattern as all other agents.

## Risks / Trade-offs

- **[Risk] Vision model latency/cost:** `kimi-k2.6` may have higher latency or cost than non-vision models used by the base apply agent. → **Mitigation:** The agent is only dispatched for web-specific tasks; general implementation tasks continue using the base apply agent. Users configure routing in `teams.yaml`.
- **[Risk] chrome-devtools-cli not installed in all environments:** The skill may not be available in all pi installations. → **Mitigation:** The missing-skill guard hard-stops with a clear message, preventing the agent from silently failing. The skill is listed in `<available_skills>` and is part of the standard skill set.
- **[Risk] Screenshot-based verification may be flaky:** Visual differences can be subtle or environment-dependent (fonts, OS rendering). → **Mitigation:** The agent uses DOM snapshots (`take_snapshot`) as the primary verification method and screenshots as supplementary visual confirmation. The skill file provides both tools.
- **[Trade-off] Agent proliferation:** Adding more specialized agents increases the agent roster. → **Acceptable:** This follows the established pattern of specialized agents (explore, propose, apply, verify, archive, worker). Web development is a distinct enough domain to warrant specialization.
