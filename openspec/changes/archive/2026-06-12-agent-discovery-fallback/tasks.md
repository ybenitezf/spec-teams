## 1. Phase Configuration, Availability, and Signal Definitions

- [x] 1.1 Define `OPENSPEC_PHASES` config array in `spec-teams-utils.ts` with entries for each phase: `{ phase: "explore", label: "Explore", skillName: "openspec-explore" }`, `{ phase: "propose", label: "Propose", skillName: "openspec-propose" }`, `{ phase: "apply", label: "Apply", skillName: "openspec-apply-change" }`, `{ phase: "verify", label: "Verify", skillName: null }`, `{ phase: "archive", label: "Archive", skillName: "openspec-archive-change" }`. Each entry includes phase key, human-readable label, and skill name (or null). No role descriptions or Identity fields.
- [x] 1.2 Define `PhaseAvailability` type in `spec-teams-utils.ts`: `{ phase: string, label: string, skillName: string | null, available: boolean }`.
- [x] 1.3 Implement `buildOpenSpecPhases(skills: Skill[] | undefined | null): PhaseAvailability[]` in `spec-teams-utils.ts`. For each entry in `OPENSPEC_PHASES`: if `skillName` is non-null and exists in the skills array (matched by `skill.name`), mark `available: true`; if `skillName` is null but an agent matching the phase name exists, mark `available: true`; otherwise `available: false`. Handle null/undefined skills input by treating it as an empty array.
- [x] 1.4 Define `EXPLORE_SIGNALS` constant in `spec-teams-utils.ts` with the four signal definitions and their descriptions: `need-input` (has questions for user — relay verbatim, wait for reply), `ready-to-propose` (exploration done with brief — extract, relay summary, ask approval), `done-exploring` (no change needed — relay summary, return to normal), `blocked` (cannot proceed — relay blocker, ask how to proceed).
- [x] 1.5 Add unit tests for `buildOpenSpecPhases`: all skills present, no skills, partial skills, null/undefined input, non-OpenSpec skills ignored
- [x] 1.6 Add unit test for `EXPLORE_SIGNALS`: verify four signals present with expected names and descriptions matching the existing relay protocol

## 2. Import Skill Type and Wire into before_agent_start

- [x] 2.1 Import `Skill` type from `@earendil-works/pi-coding-agent` in `spec-teams.ts` (it's re-exported from the SDK).
- [x] 2.2 Change the `before_agent_start` handler signature from `async (_event, _ctx)` to `async (event, ctx)` so the event parameter is accessible.
- [x] 2.3 Extract `event.systemPromptOptions.skills` at the top of the `before_agent_start` handler. If undefined, default to an empty array.
- [x] 2.4 Call `buildOpenSpecPhases(skills, agentNames)` to compute phase availability for use in segment functions.

## 3. System Prompt Segment Functions

- [x] 3.1 Create `buildIdentitySegment()` function returning the static identity section ("You are an OpenSpec-aware dispatcher agent...").
- [x] 3.2 Create `buildTeamConfigSegment(activeTeamName, teamMembers)` function returning the team configuration section with active team name and dispatchable agent list.
- [x] 3.3 Create `buildLifecycleSegment(phases: PhaseAvailability[], agentNames: string[]): string` function that generates one block per available phase using agent-catalog-matching routing ("dispatch the most suitable available agent for [phase]"). Each block contains routing heuristics and skill references ONLY — NO "Identity" descriptions. For each available phase, include the phase label, when to route, which skill to reference (e.g., "instruct the agent to follow the `openspec-explore` skill"), and workflow transition notes. For unavailable phases, include a brief "[Phase] is not available" notice. When no phases are available, return a short explanation that the OpenSpec workflow is unavailable. Do NOT hardcode agent names. Do NOT reproduce skill content.
- [x] 3.4 Create `buildExploreRelaySegment(phases: PhaseAvailability[]): string` function that ALWAYS returns the Explore Relay Protocol section (never returns empty string). The section SHALL include: (a) signal definitions from `EXPLORE_SIGNALS` with per-signal handling instructions for the dispatcher, (b) task injection instruction — when dispatching for exploration, inject signal definitions into the task string so any agent can participate, (c) conditional skill reference — "If the openspec-explore skill is available, instruct the agent to follow it" (included only when the explore skill is present in `phases`). Use generic agent selection language ("dispatch the most suitable available agent for exploration").
- [x] 3.5 Create `buildGeneralTasksSegment(agentStates: Map<string, AgentState>, phases: PhaseAvailability[]): string` function that replaces the previous `hasWorker` section. Identify non-OpenSpec agents (agents whose name does NOT match any OpenSpec phase name). List each non-OpenSpec agent with its name and description. Include Worker Status Signals guidance if worker is on the team. Include Worker Hand-off guidance if worker is on the team. Return empty string when no non-OpenSpec agents exist.
- [x] 3.6 Create `buildRulesSegment()` function returning the static rules section.
- [x] 3.7 Create `buildAgentCatalogSegment(agentStates: Map<string, AgentState>): string` function returning the agent catalog from current logic (unchanged).
- [x] 3.8 Add unit tests for each segment function covering: all phases available, partial phases, no phases, explore relay always present (with and without skill), worker present/absent, mixed agents, no Identity descriptions in phase blocks

## 4. Dynamic Prompt Assembly in before_agent_start

- [x] 4.1 Replace the static system prompt template string in `before_agent_start` with dynamic assembly: call segment functions in order (Identity, Team Config, Lifecycle, Explore Relay, General Tasks, Rules, Agent Catalog), filter out empty strings, join with double newlines.
- [x] 4.2 Remove the `hasWorker` conditional and the `workerRoutingSection` template variable. The `buildGeneralTasksSegment` function handles this logic now.
- [x] 4.3 Verify the full-availability scenario (all skills present, all specialist agents on team) produces a system prompt with equivalent routing, relay, and catalog content to the current static version (without Identity descriptions in phase blocks).

## 5. Backward Compatibility and Edge Cases

- [x] 5.1 Test: When all OpenSpec skills are present and all specialist agents are on the team, the generated prompt contains equivalent lifecycle routing, relay protocol, and rules content to the current static prompt (same routing information, no hardcoded agent names, no Identity descriptions)
- [x] 5.2 Test: Explore Relay Protocol is ALWAYS present in the prompt, even when no OpenSpec skills exist and no explore agent is on the team
- [x] 5.3 Test: When no OpenSpec skills exist and no specialist agents are on the team, the lifecycle section is replaced with the "no OpenSpec capabilities" explanation but the relay protocol is still present
- [x] 5.4 Test: When skills are present but no specialist agents (only worker), lifecycle blocks reference skills by name and use agent-catalog-matching routing
- [x] 5.5 Test: When `event.systemPromptOptions.skills` is undefined, the handler degrades gracefully (all phases marked unavailable, relay protocol still present)
- [x] 5.6 Test: Verify phase is unavailable when no `openspec-verify` skill exists and no verify agent is on the team
- [x] 5.7 Test: Phase blocks do NOT contain "Identity" descriptions or role descriptions that paraphrase skill content
- [x] 5.8 Test: Relay protocol includes signal definitions and task injection instruction in ALL cases
- [x] 5.9 Test: General Tasks section lists all non-OpenSpec agents, not just worker
- [x] 5.10 Test: General Tasks section is omitted when all team agents are OpenSpec specialists

## 6. Documentation and Commit

- [x] 6.1 Update the file header comment in `spec-teams.ts` to document dynamic prompt generation based on skill availability and always-present relay protocol
- [x] 6.2 Add a code comment above the segment assembly explaining: skills from Pi's event, agent-catalog-matching routing, reference skills by name, relay protocol always present, signal injection into explore tasks, no Identity descriptions
- [x] 6.3 Remove any dead code related to the old `hasWorker` conditional and `workerRoutingSection` template variable
- [x] 6.4 Commit with message `feat(spec-teams): dynamic system prompt with always-present relay protocol`