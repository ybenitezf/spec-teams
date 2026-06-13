## ADDED Requirements

### Requirement: Dynamic system prompt generation from skills and agents

The `before_agent_start` handler SHALL read `event.systemPromptOptions.skills` (a `Skill[]` array) to determine available OpenSpec skills. It SHALL NOT perform filesystem scanning for skills. It SHALL use `buildOpenSpecPhases(skills)` to compute phase availability, then dynamically assemble the system prompt from named segment functions. Each segment function SHALL return a string (possibly empty) based on the skills array and active team configuration.

The system prompt SHALL contain the following segments, assembled in order. Empty segments SHALL be omitted:

1. **Identity** — Always present: "You are an OpenSpec-aware dispatcher agent."
2. **Team Config** — Always present: active team name and member list
3. **OpenSpec Lifecycle** — One block per available phase (skill present, or verify with agent present). Each block contains routing heuristics and skill references only — NO "Identity" descriptions that paraphrase skill content. Unavailable phases get a brief "not available" notice. When no phases are available, the entire lifecycle section is replaced with a short explanation.
4. **Explore Relay Protocol** — ALWAYS PRESENT regardless of explore availability. Contains signal definitions, per-signal dispatcher handling instructions, and guidance on injecting signals into the dispatched task. Skill reference is conditional ("if the openspec-explore skill is available, instruct the agent to follow it"). Agent selection uses generic language ("dispatch the most suitable available agent for exploration").
5. **General Tasks** — Lists all non-OpenSpec agents on the team with their descriptions. Omitted when no non-OpenSpec agents exist.
6. **Rules** — Always present: operational rules
7. **Agent Catalog** — Always present: list of active team agents with names, descriptions, and tool lists

#### Scenario: Full OpenSpec skills and specialist team
- **WHEN** the skills array contains all four OpenSpec skills (openspec-explore, openspec-propose, openspec-apply-change, openspec-archive-change)
- **AND** the active team includes explore, propose, apply, verify, and archive agents
- **THEN** the lifecycle section includes all five phases (explore, propose, apply, verify available via skill or agent)
- **AND** the Explore Relay Protocol section is present (always present)
- **AND** the General Tasks section lists non-OpenSpec agents

#### Scenario: No OpenSpec skills, no specialist agents
- **WHEN** the skills array contains no `openspec-*` skills
- **AND** no OpenSpec specialist agents are on the team
- **THEN** a short explanation replaces the lifecycle section: "No OpenSpec skills or specialist agents are available on this team."
- **AND** the Explore Relay Protocol section is STILL PRESENT (always included)
- **AND** the system prompt still contains Identity, Team Config, General Tasks (if non-OpenSpec agents exist), Rules, and Agent Catalog

#### Scenario: Skills present, no specialist agents, worker on team
- **WHEN** the skills array contains openspec-explore, openspec-propose, openspec-apply-change, and openspec-archive-change
- **AND** the active team includes only "worker" and no OpenSpec specialist agents
- **THEN** the lifecycle section includes explore, propose, apply, and archive phases
- **AND** each phase block instructs the dispatcher to "dispatch the most suitable available agent" with instructions to follow the relevant skill
- **AND** verify is listed as unavailable because it has no skill and no verify agent on the team
- **AND** the Explore Relay Protocol section is present (always present)

### Requirement: Lifecycle phase blocks contain routing and skill references only — no Identity descriptions

Each available lifecycle phase block SHALL contain ONLY:
- The phase label (e.g., "Explore", "Propose")
- Routing heuristics: when to dispatch for this phase ("when requirements are unclear", "when exploration has produced decisions", etc.)
- Skill reference: "instruct the agent to follow the `openspec-explore` skill" (conditional — "if available")
- Workflow guidance: transition expectations (e.g., "after propose completes, verify artifacts were created")

The phase block SHALL NOT contain "Identity" descriptions (e.g., "**Identity**: The explore agent investigates problems..."). These descriptions paraphrase skill content that agents receive via `<available_skills>`. The phase block SHALL NOT reproduce or paraphrase skill procedure content.

For unavailable phases, a brief notice SHALL appear: "[Phase] is not available — no skill or specialist agent for this phase."

#### Scenario: Explore phase block with skill available
- **WHEN** the explore phase is available (openspec-explore skill present)
- **THEN** the lifecycle section includes an "Explore" block with routing heuristics and skill reference
- **AND** the block says "dispatch the most suitable available agent for exploration"
- **AND** the block says "instruct the agent to follow the `openspec-explore` skill"
- **AND** the block does NOT contain "**Identity**: The explore agent investigates problems..." or any similar role description
- **AND** the block does NOT reproduce or paraphrase skill procedure content

#### Scenario: Verify phase block with verify agent on team
- **WHEN** the verify phase has no skill but a verify agent is on the team
- **THEN** the lifecycle section includes a "Verify" block with routing heuristics only
- **AND** the block does NOT contain an Identity description
- **AND** verify does NOT appear in the unavailable phase notices

#### Scenario: Verify phase unavailable (no skill, no agent)
- **WHEN** the verify phase has no skill and no verify agent on the team
- **THEN** the lifecycle section does NOT include a Verify block
- **AND** a brief notice appears: "Verify is not available — no skill or specialist agent for this phase"

#### Scenario: No hardcoded agent names in routing
- **WHEN** any lifecycle phase block is generated
- **THEN** the block does NOT contain the strings "dispatch the explore agent", "dispatch the propose agent", "dispatch the worker agent", or any other phase-to-agent-name mapping
- **AND** routing uses "dispatch the most suitable available agent" language for all phases

### Requirement: Explore Relay Protocol is always present

The Explore Relay Protocol section SHALL be ALWAYS included in the dispatcher system prompt, regardless of whether the `openspec-explore` skill is available or an explore agent is on the team. The relay protocol is the dispatcher's own operational mechanism for handling multi-turn exploration conversations — it is not conditional on explore capability.

The relay protocol section SHALL contain:
1. **Signal definitions**: The four exploration signals (`need-input`, `ready-to-propose`, `done-exploring`, `blocked`) with descriptions of what each signal means and how the dispatcher should handle it
2. **Task injection instruction**: When dispatching for exploration, the dispatcher SHALL include the signal definitions in the task string so that any dispatched agent can participate in the relay protocol, regardless of whether it is a specialist explore agent
3. **Per-signal handling instructions**: How the dispatcher responds to each signal (relay verbatim, extract brief, ask for approval, etc.)
4. **Conditional skill reference**: "If the openspec-explore skill is available, also instruct the agent to follow it." This reference is included only when the skill is present in the skills array.
5. **Agent selection guidance**: "Dispatch the most suitable available agent for exploration" — no hardcoded explore agent name.

#### Scenario: Explore skill available — relay protocol includes skill reference
- **WHEN** the openspec-explore skill is in the skills array
- **THEN** the Explore Relay Protocol section is present
- **AND** includes the conditional skill reference: "If the openspec-explore skill is available, instruct the agent to follow it"
- **AND** includes all four signal definitions
- **AND** includes per-signal dispatcher handling instructions

#### Scenario: Explore skill NOT available — relay protocol still present, no skill reference
- **WHEN** openspec-explore is NOT in the skills array AND no explore agent is on the team
- **THEN** the Explore Relay Protocol section is STILL present
- **AND** includes all four signal definitions
- **AND** includes per-signal dispatcher handling instructions
- **AND** does NOT include the skill reference (since the skill is not available)
- **AND** includes the task injection instruction that the dispatcher should inject signal definitions into the explore task

#### Scenario: Relay protocol uses generic agent selection
- **WHEN** the relay protocol section is generated
- **THEN** the section says "dispatch the most suitable available agent for exploration"
- **AND** the section does NOT say "dispatch the explore agent" or reference any specific agent name

#### Scenario: Relay protocol injects signals into task
- **WHEN** the dispatcher dispatches an agent for exploration
- **THEN** the task string includes the signal definitions (need-input, ready-to-propose, done-exploring, blocked)
- **AND** the task string instructs the agent to respond with the appropriate status signal after each response

### Requirement: General Tasks section replaces hasWorker section

The hardcoded `hasWorker` "Non-OpenSpec Tasks" section SHALL be replaced by a "General Tasks" section that dynamically lists all non-OpenSpec agents on the active team. An agent is "non-OpenSpec" if its name does not match any of the OpenSpec phase agent names (explore, propose, apply, verify, archive).

The General Tasks section SHALL list each non-OpenSpec agent with its name and description. It SHALL include guidance about when to route general (non-OpenSpec) tasks to these agents.

When no non-OpenSpec agents are on the team, the General Tasks section SHALL be omitted.

#### Scenario: Worker and builder on team — both listed
- **WHEN** the active team includes "worker" and "builder" agents (neither matches an OpenSpec phase name)
- **THEN** the General Tasks section lists both worker and builder with their descriptions
- **AND** includes guidance about when to route non-OpenSpec tasks

#### Scenario: Only OpenSpec agents on team — section omitted
- **WHEN** the active team includes only explore, propose, apply, verify, and archive agents
- **THEN** the General Tasks section is omitted

#### Scenario: No agents on team — section omitted
- **WHEN** the active team is empty
- **THEN** the General Tasks section is omitted

#### Scenario: Worker agent status signals
- **WHEN** a "worker" agent is on the team
- **THEN** the General Tasks section includes the Worker Status Signals guidance (done/blocked) that was previously in the `hasWorker` section
- **AND** the Status Signals guidance applies only to the worker agent, not to all non-OpenSpec agents

### Requirement: Unavailable phase notices

When one or more OpenSpec phases are unavailable (no skill and no specialist agent), the Lifecycle section SHALL include a brief notice for each unavailable phase in the form: "[Phase] is not available — no skill or specialist agent for this phase."

When ALL OpenSpec phases are unavailable (no skills at all, no specialist agents), the Lifecycle section SHALL be replaced with a short explanation: "No OpenSpec skills or specialist agents are available on this team. The spec-driven workflow cannot be used. Install OpenSpec skills (openspec-explore, openspec-propose, openspec-apply-change, openspec-archive-change) or add specialist agents to enable the workflow."

#### Scenario: Some phases unavailable
- **WHEN** verify and archive phases are unavailable
- **THEN** brief notices appear for verify and archive

#### Scenario: All phases unavailable
- **WHEN** no OpenSpec skills exist and no OpenSpec specialist agents are on the team
- **THEN** the lifecycle section is replaced with the explanation about no OpenSpec capabilities available
- **AND** the explanation lists the installable skill names

#### Scenario: All phases available — no notices
- **WHEN** all five phases have either a skill or a specialist agent
- **THEN** no unavailable phase notices appear in the system prompt