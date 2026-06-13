## MODIFIED Requirements

### Requirement: OpenSpec-aware system prompt

The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. The system prompt SHALL be generated dynamically based on skill availability read from `event.systemPromptOptions.skills` (a `Skill[]` array provided by Pi) and agent availability from the active team. The system prompt SHALL be organized into clearly separated sections, conditionally included based on capabilities:

1. **Identity** — the dispatcher's role (always present)
2. **Team Config** — active team name and members (dynamic, always present)
3. **OpenSpec Lifecycle** — conditionally included phase blocks, one per available OpenSpec phase. Each block SHALL contain routing heuristics, skill references, and workflow transitions only — NO "Identity" descriptions that paraphrase skill content. Routing SHALL use agent-catalog-matching language ("dispatch the most suitable available agent") rather than hardcoded agent names. Unavailable phases SHALL include a brief "not available" notice. When no phases are available, the entire lifecycle section SHALL be replaced with a short explanation that OpenSpec workflow is unavailable.
4. **Explore Relay Protocol** — ALWAYS PRESENT regardless of explore capability. Contains signal definitions and per-signal dispatcher handling instructions. The relay protocol is the dispatcher's own operational mechanism for multi-turn exploration. References to the explore skill are conditional ("if the openspec-explore skill is available, instruct the agent to follow it"). Agent selection is generic ("dispatch the most suitable available agent for exploration"). When dispatching for exploration, the dispatcher SHALL inject signal definitions into the task string so any agent can participate.
5. **General Tasks** — lists all non-OpenSpec agents on the team with their descriptions. Replaces the previous hardcoded `hasWorker` section. When worker is on the team, includes Worker Status Signals guidance. Omitted when no non-OpenSpec agents exist.
6. **Rules** — operational rules (always present)
7. **Agent Catalog** — list of active team agents (always present)

The system prompt SHALL NOT contain hardcoded agent names in routing instructions. The system prompt SHALL NOT reproduce or paraphrase skill procedure content — it SHALL reference skills by name only (e.g., "instruct the agent to follow the `openspec-explore` skill"). The system prompt SHALL NOT contain "Identity" descriptions in lifecycle phase blocks — these duplicate skill content that agents receive via `<available_skills>`. The system prompt SHALL NOT contain pipeline-enforcing language.

The Lifecycle section SHALL describe each phase only once. Each phase block SHALL contain routing heuristics and skill references, not role descriptions. The archive phase routing SHALL mention that archiving follows clean verification. The propose phase routing SHALL mention that propose agents expect a clear brief. The verify phase routing, when included, SHALL mention audit and validation responsibilities.

#### Scenario: System prompt includes only available lifecycle phases
- **WHEN** an agent starts with an active team that has openspec-explore and openspec-apply-change skills available
- **AND** no openspec-propose, openspec-archive-change skills, and no verify agent on the team
- **THEN** the system prompt Lifecycle section includes blocks for explore and apply
- **AND** the system prompt includes "not available" notices for propose, verify, and archive
- **AND** no propose, verify, or archive phase blocks appear
- **AND** the Explore Relay Protocol section is present (always present)

#### Scenario: Full skills and specialist team — all phases present
- **WHEN** all four OpenSpec skills are available AND the team has a verify agent
- **THEN** all five lifecycle phase blocks are present
- **AND** no "not available" notices appear
- **AND** the Explore Relay Protocol section is present (always present)
- **AND** each phase block contains routing heuristics and skill references, NOT Identity descriptions

#### Scenario: No OpenSpec skills, no specialist agents — lifecycle replaced, relay still present
- **WHEN** no `openspec-*` skills exist and no OpenSpec specialist agents are on the team
- **THEN** the lifecycle section is replaced with an explanation that the OpenSpec workflow is unavailable
- **AND** the Explore Relay Protocol section is STILL PRESENT (always included)
- **AND** the relay protocol includes signal definitions and task injection instructions
- **AND** the system prompt still contains Identity, Team Config, General Tasks (if applicable), Rules, and Agent Catalog

#### Scenario: Verify unavailable when no skill and no agent
- **WHEN** the verify phase has no skill (verify has no `openspec-verify` skill) and no verify agent on the team
- **THEN** no Verify block appears in the Lifecycle section
- **AND** a notice appears: "Verify is not available"

#### Scenario: No hardcoded agent names in phase routing
- **WHEN** any lifecycle phase block is generated
- **THEN** routing instructions say "dispatch the most suitable available agent" or "dispatch for [phase]"
- **AND** routing instructions do NOT say "dispatch the explore agent", "dispatch the worker agent", or map phases to specific agent names

#### Scenario: Skills referenced by name, not duplicated
- **WHEN** a lifecycle phase block references an OpenSpec skill
- **THEN** the block says "instruct the agent to follow the `openspec-explore` skill" (or the appropriate skill name)
- **AND** the block does NOT reproduce or paraphrase the skill's procedure content

#### Scenario: No Identity descriptions in phase blocks
- **WHEN** any lifecycle phase block is generated
- **THEN** the block does NOT contain "**Identity**:" or any role description that paraphrases what the skill teaches
- **AND** the block contains only routing heuristics, skill references, and workflow transitions

#### Scenario: Explore relay protocol always present
- **WHEN** the system prompt is generated
- **THEN** the Explore Relay Protocol section is ALWAYS included regardless of explore availability
- **AND** the section includes the four signal definitions (need-input, ready-to-propose, done-exploring, blocked)
- **AND** the section includes per-signal handling instructions for the dispatcher

#### Scenario: Explore relay protocol includes conditional skill reference
- **WHEN** the openspec-explore skill is available
- **THEN** the Explore Relay Protocol section includes "If the openspec-explore skill is available, instruct the agent to follow it"
- **AND** the skill reference is included in addition to the always-present signal definitions

#### Scenario: Explore relay protocol without skill reference
- **WHEN** the openspec-explore skill is NOT available
- **THEN** the Explore Relay Protocol section is STILL present
- **AND** the section includes all four signal definitions
- **AND** the section does NOT reference the openspec-explore skill
- **AND** the section includes the task injection instruction for signal definitions

#### Scenario: General Tasks section lists non-OpenSpec agents
- **WHEN** the active team includes "worker" and "builder" (non-OpenSpec agents)
- **THEN** the General Tasks section lists both agents with their descriptions
- **AND** includes guidance about routing non-OpenSpec tasks
- **AND** includes Worker Status Signals guidance for the worker agent

#### Scenario: General Tasks section omitted when no non-OpenSpec agents
- **WHEN** the active team includes only OpenSpec specialist agents (explore, propose, apply, verify, archive)
- **THEN** the General Tasks section is omitted

#### Scenario: Rules do not restate lifecycle
- **WHEN** an agent starts
- **THEN** the Rules section does NOT contain "NEVER dispatch archive without user approval" (covered by archive phase block)
- **AND** the Rules section does NOT restate transition guidance from the Lifecycle section