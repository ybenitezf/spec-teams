## Why

The spec-teams dispatcher system prompt is a ~180-line static template that always includes the full OpenSpec lifecycle routing (Explore → Propose → Apply → Verify → Archive), the Explore Relay Protocol, and a hardcoded "worker" section — regardless of which agents or skills are actually available. This wastes context tokens on dead routing instructions, guides the LLM to dispatch to agents that don't exist on the active team (producing "Agent not found" errors), and provides no fallback path when specialist agents are missing but OpenSpec skills are present.

Pi already passes skill availability to the `before_agent_start` event via `event.systemPromptOptions.skills`, but spec-teams ignores this data. Meanwhile, any agent dispatched by spec-teams receives skills through Pi's own `<available_skills>` injection — so the dispatcher only needs to reference skills by name, never duplicate their content.

Additionally, the current prompt includes "Identity" descriptions for each lifecycle phase (e.g., "**Identity**: The explore agent investigates problems...") that paraphrase what the skill already teaches. These should be removed — the dispatcher should reference skill names, not describe skill procedures.

## What Changes

- **Read skills from `event.systemPromptOptions.skills`**: Use the `Skill[]` array already provided by Pi in the `before_agent_start` event to determine which OpenSpec skills are available. No filesystem scanning — Pi resolves skills from project and user-level directories and passes them to every turn.
- **Phase availability map from `OPENSPEC_PHASES` config**: Define a static config array mapping each OpenSpec phase to its skill name (or `null` for verify, which has no skill). A phase is "available" when its skill exists in the skills array, OR (for verify) when a matching agent is on the team.
- **Dynamic lifecycle section**: Include only available phase blocks in the Lifecycle section. Phase blocks contain routing heuristics and skill references only — NO "Identity" descriptions that duplicate skill content. Unavailable phases get a brief "not available" notice. When no OpenSpec skills exist, omit the entire lifecycle and show a short explanation.
- **Explore Relay Protocol is ALWAYS-PRESENT**: The relay protocol is the dispatcher's own operational mechanism for handling multi-turn exploration conversations. It is NOT conditional on having an explore agent or skill. It is always included in the prompt.
- **Dispatcher injects signal definitions**: When dispatching an explore task, the dispatcher includes signal definitions (need-input, ready-to-propose, done-exploring, blocked) in the task string so ANY agent can participate in the relay protocol, regardless of whether a specialist explore agent exists.
- **Agent-name-free routing**: Routing instructions say "dispatch the most suitable available agent for [phase]" — no hardcoded agent names. The LLM reads the agent catalog to select the best match.
- **General Tasks section replaces `hasWorker`**: Instead of a hardcoded worker-specific section, include a "General Tasks" section listing all non-OpenSpec agents on the team with their descriptions.
- **Reference skills, never duplicate them**: The prompt says "instruct the agent to follow the `openspec-explore` skill" — it never reproduces skill procedure content.
- **Hard-stop for no OpenSpec capability**: When no OpenSpec skills are present and no specialist agents are on the team, omit the lifecycle and show a clear warning.

## Capabilities

### New Capabilities
- `capability-detection`: Read OpenSpec skill availability from `event.systemPromptOptions.skills` and build a phase availability map from a static `OPENSPEC_PHASES` config
- `dynamic-system-prompt`: Generate the dispatcher system prompt dynamically based on available skills and agents. Always include the Explore Relay Protocol. Conditionally include lifecycle phases and general tasks. Never include Identity descriptions. Inject signal definitions into explore task dispatches.

### Modified Capabilities
- `spec-teams-extension`: The OpenSpec-aware system prompt requirement changes from static to dynamic — lifecycle sections are conditionally included based on skill/agent availability, the relay protocol is always present, routing uses agent catalog rather than hardcoded names, phase "Identity" descriptions are removed, and the `hasWorker` section is replaced by a general tasks section

## Impact

- **`extensions/spec-teams.ts`**: The `before_agent_start` handler changes from `_event` to `event`, reading `event.systemPromptOptions.skills` for skill availability. The static template string is replaced by dynamic assembly from segment functions. The `hasWorker` conditional is replaced by a general tasks section. The Explore Relay Protocol is always included. Phase "Identity" descriptions are removed from lifecycle blocks.
- **`extensions/spec-teams-utils.ts`**: New `OPENSPEC_PHASES` config array, `buildOpenSpecPhases()` helper, signal definitions constant (`EXPLORE_SIGNALS`), and related types.
- **Backward compatibility**: When all OpenSpec skills and specialist agents are present, the generated system prompt contains equivalent routing and relay content (minus the removed Identity descriptions, which are redundant with skill content).
- **Testing**: Unit tests for phase availability logic (all skills present, partial, none). Unit tests for each segment function with various skill/agent configurations.