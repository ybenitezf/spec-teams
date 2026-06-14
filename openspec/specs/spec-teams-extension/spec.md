# spec-teams-extension Specification

## Purpose
TBD - created by archiving change integrate-spec-teams. Update Purpose after archive.
## Requirements
### Requirement: Extension file at correct location
The project SHALL contain `extensions/spec-teams.ts` as its extension entry point. The file SHALL NOT include any `setWidget()` call for a "spec-team" widget. The `updateWidget()` function and all grid/column rendering logic SHALL be removed.

#### Scenario: File exists
- **WHEN** the project is checked out
- **THEN** `extensions/spec-teams.ts` exists and exports a default function

#### Scenario: Placeholder removed
- **WHEN** the project is checked out
- **THEN** `extensions/index.ts` does NOT exist

#### Scenario: No widget registration
- **WHEN** the extension loads
- **THEN** no `setWidget("spec-team", ...)` call is made
- **AND** no widget is rendered above the editor

### Requirement: Extension loads in Pi
The extension SHALL load without errors when Pi is launched with `-e ./extensions/spec-teams.ts`.

#### Scenario: Successful load
- **WHEN** running `pi -e ./extensions/spec-teams.ts -p "hello"`
- **THEN** Pi starts without import or runtime errors
- **AND** the extension's `session_start` handler fires

### Requirement: Agent dispatch tool
The extension SHALL register a `dispatch_agent` tool that spawns specialist agent Pi processes.

#### Scenario: Tool registered
- **WHEN** the extension loads
- **THEN** the `dispatch_agent` tool is available for use via the Pi agent

### Requirement: Team selection command
The extension SHALL register a `/specs-team` command to switch the active team.

#### Scenario: Command registered
- **WHEN** the extension loads
- **THEN** the `/specs-team` command is available in the Pi session

### Requirement: Agent listing command
The extension SHALL register a `/specs-list` command to display loaded agents and their status. The command output SHALL remain unchanged from current behavior.

#### Scenario: Command registered
- **WHEN** the extension loads
- **THEN** the `/specs-list` command is available in the Pi session

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

### Requirement: Dashboard widget
~~The extension SHALL render a dashboard widget in the TUI showing agent status, context usage percentage, and agent name.~~ The extension SHALL NOT render a dashboard widget. The previous `setWidget("spec-team", ...)` registration, `updateWidget()` function, `renderAgentCell()`, `computeColumns()`, and `/specs-grid` command are all removed. Agent state overview is provided via the `/specs-dashboard` command's overlay dialog (see dashboard-dialog capability).

#### Scenario: No widget registered
- **WHEN** the extension loads
- **THEN** no `spec-team` widget is registered via `setWidget()`
- **AND** no widget appears above the editor

### Requirement: Dashboard cells use visual-width truncation
This requirement is removed along with the dashboard widget. Visual-width truncation for cells is no longer needed.

### Requirement: Grid column command
This requirement is removed. The `/specs-grid` command is no longer registered by the extension. Users view detailed agent information via `/specs-dashboard`.

### Requirement: Startup notification describes dashboard command
The extension's startup notification SHALL describe `/specs-dashboard` as the command to open the agent dashboard overlay dialog. The notification SHALL NOT mention `/specs-grid`.

#### Scenario: Notification text updated
- **WHEN** the extension completes `session_start`
- **THEN** the notification includes a line describing `/specs-dashboard` as opening the agent dashboard (e.g., `/specs-dashboard    View agent dashboard`)
- **AND** the notification does NOT mention `/specs-grid`

### Requirement: Agent model field controls dispatched model

The `dispatchAgent()` function SHALL use the agent definition's `model` field (parsed from Markdown frontmatter) to set the `--model` flag when spawning the child `pi` process. When `model` is present and truthy, it SHALL take precedence over the dispatcher's model (`ctx.model`). When absent or falsy, resolution SHALL fall through to `ctx.model` and then to the hardcoded fallback.

#### Scenario: Agent with model gets its own model
- **WHEN** a task is dispatched to an agent with `model: "openrouter/anthropic/claude-sonnet-4"`
- **THEN** the spawned `pi` process receives `--model openrouter/anthropic/claude-sonnet-4`

#### Scenario: Agent without model uses dispatcher model
- **WHEN** a task is dispatched to an agent whose definition has no `model` field
- **AND** the dispatcher has `ctx.model` set
- **THEN** the spawned `pi` process receives `--model` with the dispatcher's model

#### Scenario: Existing behavior preserved for agents without model field
- **WHEN** a task is dispatched to an agent whose definition has no `model` field
- **THEN** behavior is identical to before this change
- **AND** the change is non-breaking

### Requirement: Agent Thinking Flag

The agent definition parser SHALL extract an optional `thinking` field from agent Markdown frontmatter. Valid values are `off`, `minimal`, `low`, `medium`, `high`, and `xhigh`. Legacy values `on` and `true` SHALL be mapped to `"medium"`. Legacy values `off` and `false` SHALL be mapped to `"off"`. Unrecognized values SHALL produce a console warning and fall back to `"medium"`. When absent, the field SHALL default to `"off"`.

#### Scenario: Valid thinking level accepted
- **WHEN** an agent `.md` file contains `thinking: high`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "high"`

#### Scenario: All six levels accepted
- **WHEN** an agent `.md` file contains any of `off`, `minimal`, `low`, `medium`, `high`, or `xhigh`
- **THEN** `parseAgentFile()` returns the definition with that exact string value

#### Scenario: Legacy `on` mapped to medium
- **WHEN** an agent `.md` file contains `thinking: on`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Legacy `off` mapped to off
- **WHEN** an agent `.md` file contains `thinking: off`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

#### Scenario: Legacy `true` mapped to medium
- **WHEN** an agent `.md` file contains `thinking: true`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Legacy `false` mapped to off
- **WHEN** an agent `.md` file contains `thinking: false`
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

#### Scenario: Unrecognized value warned and defaulted
- **WHEN** an agent `.md` file contains `thinking: unknown`
- **THEN** a console warning is emitted indicating the unrecognized thinking level
- **AND** `parseAgentFile()` returns a definition with `thinking: "medium"`

#### Scenario: Thinking field absent
- **WHEN** an agent `.md` file does NOT contain a `thinking` field
- **THEN** `parseAgentFile()` returns a definition with `thinking: "off"`

### Requirement: Thinking flag controls dispatched agent reasoning

The `dispatchAgent()` function SHALL use the agent definition's `thinking` value to set the `--thinking` flag when spawning the child `pi` process. The value SHALL be passed directly as `--thinking <level>` where `<level>` is one of the six valid thinking level strings.

#### Scenario: Agent with explicit level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "high"`
- **THEN** the spawned `pi` process receives `--thinking high`

#### Scenario: Agent with off level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "off"`
- **THEN** the spawned `pi` process receives `--thinking off`

#### Scenario: Agent with medium level gets correct CLI flag
- **WHEN** a task is dispatched to an agent with `thinking: "medium"`
- **THEN** the spawned `pi` process receives `--thinking medium`

#### Scenario: Legacy mapped value produces valid CLI flag
- **WHEN** a task is dispatched to an agent whose `thinking: on` was mapped to `"medium"`
- **THEN** the spawned `pi` process receives `--thinking medium`

#### Scenario: Agent without thinking field spawns with off
- **WHEN** a task is dispatched to an agent whose definition has no `thinking` field
- **THEN** the spawned `pi` process receives `--thinking off`

### Requirement: Subagent response completeness
The `dispatch_agent` tool SHALL pass the complete subagent output to the dispatcher model without truncation. The dispatcher model SHALL receive the full text content of the subagent response so that status signal blocks (e.g., `Status: need-input`, `Status: ready-to-propose`) at the end of the response are always visible.

#### Scenario: Long explore response with status block at end
- **WHEN** an explore agent returns a response exceeding 8000 characters
- **AND** the status block is at the end of the response
- **THEN** the dispatcher model receives the full response including the status block
- **AND** the dispatcher can detect and act on the status signal

#### Scenario: Short response unaffected
- **WHEN** a subagent returns a response under any previous truncation threshold
- **THEN** the dispatcher model receives the complete response unchanged

### Requirement: Session storage outside repository
The extension SHALL store subagent session files at `~/.pi/spec-teams/<encoded-cwd>/` where `<encoded-cwd>` is an encoded representation of the project's absolute working directory. Session files SHALL NOT be stored inside the project repository directory. This includes both Pi session persistence files and explore→propose findings handoff files. The findings handoff file SHALL be stored at `~/.pi/spec-teams/<encoded-cwd>/explore-<change-name>.md` and SHALL NOT be stored inside `.pi/spec-sessions/` within the project repository.

#### Scenario: Session directory is outside the project
- **WHEN** the extension initializes in a project at `/home/user/projects/my-app`
- **THEN** subagent sessions are written to `~/.pi/spec-teams/<encoded-cwd>/`
- **AND** no session files are created inside `/home/user/projects/my-app/.pi/spec-sessions/`

#### Scenario: Different projects have isolated sessions
- **WHEN** the extension runs in two different project directories
- **THEN** each project's subagent sessions are stored under distinct encoded-cwd directories
- **AND** a `session_start` event in one project does not affect sessions in the other

#### Scenario: Findings file stored outside repository
- **WHEN** the explore agent writes a findings file for change "add-dark-mode"
- **THEN** the findings file is written to `~/.pi/spec-teams/<encoded-cwd>/explore-add-dark-mode.md`
- **AND** no findings file is created inside the project repository's `.pi/spec-sessions/` directory

#### Scenario: Findings file deleted after consumption
- **WHEN** the propose agent reads the findings file at `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`
- **THEN** the propose agent deletes the file after reading
- **AND** no stale findings files remain in the session directory

### Requirement: Opt-in frontmatter field

The `parseAgentFile()` function SHALL extract an optional `opt-in` field from agent Markdown frontmatter. When present and truthy (case-insensitive match to "true"), the agent SHALL be marked as opt-in in its `AgentDef`. When absent or any other value, the agent is treated as standard (non-opt-in). When no `teams.yaml` file is found in any scan directory, agents with `optIn: true` SHALL be excluded from the default "all" team.

#### Scenario: Opt-in field present and true
- **WHEN** an agent `.md` file contains `opt-in: true`
- **THEN** `parseAgentFile()` returns a definition with `optIn: true`

#### Scenario: Opt-in field absent
- **WHEN** an agent `.md` file does NOT contain an `opt-in` field
- **THEN** `parseAgentFile()` returns a definition with `optIn: false` (or undefined, treated as false)

#### Scenario: Opt-in field with non-truthy value
- **WHEN** an agent `.md` file contains `opt-in: false` or `opt-in: no`
- **THEN** the agent is treated as standard (non-opt-in)

#### Scenario: Existing agents unaffected
- **WHEN** an existing agent file without an `opt-in` field is parsed
- **THEN** the parsed AgentDef works identically to before this change

#### Scenario: Default team excludes opt-in agents
- **WHEN** `loadAgents()` runs and no `teams.yaml` is found in any scan directory
- **AND** the parsed agents include a worker agent with `optIn: true` and five standard agents
- **THEN** the default "all" team contains only the five standard agents
- **AND** the worker agent is excluded from the active team

#### Scenario: All agents are standard
- **WHEN** `loadAgents()` runs and no `teams.yaml` is found in any scan directory
- **AND** all parsed agents are standard (no `optIn: true`)
- **THEN** the default "all" team contains all agents
- **AND** behavior is identical to before this change

#### Scenario: Teams.yaml takes precedence
- **WHEN** a `teams.yaml` file is found in any scan directory (project or user level)
- **THEN** the opt-in frontmatter field has NO effect on team membership
- **AND** team membership is determined solely by teams.yaml

### Requirement: Teams.yaml with openspec and full teams

The project SHALL contain a `teams.yaml` file discoverable in one of the agent scan directories (in priority order: `<cwd>/agents/`, `<cwd>/.claude/agents/`, `<cwd>/.pi/agents/`, `<getAgentDir()>/agents/`, `<homedir()>/.agents/agents/`). The file SHALL define at least two teams: an `openspec` team (explore, propose, apply, verify, archive) and a `full` team (all agents including worker). The `openspec` team SHALL be listed first and become the default.

#### Scenario: Teams.yaml file discovered at project-level
- **WHEN** the extension loads
- **AND** a `teams.yaml` file exists in `<cwd>/.pi/agents/` (or any project-level scan directory)
- **THEN** the `teams.yaml` is found and parsed
- **AND** the `openspec` and `full` teams are available for selection

#### Scenario: Teams.yaml file discovered at user-level
- **WHEN** the extension loads
- **AND** no project-level `teams.yaml` exists
- **AND** a `teams.yaml` file exists in `<getAgentDir()>/agents/` (or `~/.agents/agents/`)
- **THEN** the user-level `teams.yaml` is found and parsed
- **AND** the teams defined in it are available for selection

#### Scenario: Openspec team is first (default)
- **WHEN** the extension starts a session
- **THEN** the `openspec` team is activated by default (first in list)
- **AND** the active team contains explore, propose, apply, verify, and archive agents

#### Scenario: Full team includes worker
- **WHEN** the user runs `/specs-team` and selects the `full` team
- **THEN** the active team contains all six agents including worker
- **AND** the worker agent is available for dispatch

#### Scenario: Worker not in openspec team
- **WHEN** the `openspec` team is active
- **THEN** the worker agent is NOT in the agent catalog
- **AND** the dispatcher cannot dispatch to worker


#### Scenario: Project-level teams.yaml takes precedence over user-level
- **WHEN** a `teams.yaml` exists at both `<cwd>/.pi/agents/teams.yaml` and `<getAgentDir()>/agents/teams.yaml`
- **THEN** the project-level file is used
- **AND** the user-level file is NOT read

### Requirement: Distinct team definitions
The `teams.yaml` file SHALL define the `openspec` and `full` teams as distinct compositions. The `openspec` team SHALL include only the core lifecycle agents (explore, propose, apply, verify, archive) without the worker agent. The `full` team SHALL include all lifecycle agents plus the worker agent.

#### Scenario: User selects the openspec team
- **WHEN** a user selects the "openspec" team via `/specs-team`
- **THEN** the team includes only explore, propose, apply, verify, and archive agents — no worker

#### Scenario: User selects the full team
- **WHEN** a user selects the "full" team via `/specs-team`
- **THEN** the team includes explore, propose, apply, verify, archive, AND worker agents

#### Scenario: README team documentation matches configuration
- **WHEN** a user reads the README's team configuration description
- **THEN** the documented team compositions match what's in teams.yaml (openspec without worker, full with worker)

### Requirement: Sub-agent spawn args include forwarded extension paths
The `dispatchAgent()` function SHALL include forwarded parent `-e` extension paths in the argument list when spawning child `pi` processes. The spawned process SHALL receive `--no-extensions` followed by `-e <path>` for each surviving extension path (after filtering out the spec-teams extension). This enables user extensions explicitly loaded in the parent process to also load in sub-agent processes.

#### Scenario: User extensions forwarded to sub-agent
- **WHEN** the parent process was started with `-e ./extensions/spec-teams.ts -e ./extensions/my-tool.ts`
- **AND** a task is dispatched to a specialist agent
- **THEN** the spawned `pi` process receives `--no-extensions -e /absolute/path/to/my-tool.ts`
- **AND** the spec-teams extension path is NOT forwarded

#### Scenario: No explicit -e extensions to forward
- **WHEN** the parent process was started with only `-e ./extensions/spec-teams.ts` (or no `-e` flags)
- **AND** a task is dispatched to a specialist agent
- **THEN** the spawned `pi` process receives `--no-extensions` without any `-e` arguments
- **AND** behavior is identical to the current implementation

#### Scenario: Multiple user extensions forwarded
- **WHEN** the parent process was started with `-e ext-a.ts -e ext-b.ts -e ext-c.ts` (plus spec-teams)
- **AND** a task is dispatched to a specialist agent
- **THEN** the spawned `pi` process receives `--no-extensions -e <ext-a> -e <ext-b> -e <ext-c>`
- **AND** all three user extensions load in the sub-agent

#### Scenario: Forwarded paths are absolute
- **WHEN** extension paths are forwarded to a sub-agent
- **THEN** all forwarded `-e` paths are absolute paths resolved from the parent process's working directory
- **AND** relative paths are resolved before forwarding

### Requirement: Sub-agent receives parent extension flags

The extension SHALL forward extension-registered CLI flags from the parent process to sub-agent `pi` processes. At module-init time, the extension SHALL extract `unknownFlags` from `parseArgs(process.argv.slice(2))` and reconstruct them as CLI arguments. Reconstructed flags SHALL be included in the spawn args passed to `dispatchAgent()` only when `parsedArgs.noExtensions` is `true`.

#### Scenario: Extension flags included in dispatch spawn args

- **WHEN** a task is dispatched to any agent
- **AND** `parsedArgs.noExtensions` is `true`
- **AND** `parsedArgs.unknownFlags` contains extension-registered flags
- **THEN** the spawned `pi` process receives the reconstructed flag arguments
- **AND** extension flags do NOT cause "Unknown option" errors in the sub-agent

#### Scenario: No extension flags when parent lacks --no-extensions

- **WHEN** a task is dispatched to any agent
- **AND** `parsedArgs.noExtensions` is falsy or absent
- **THEN** no reconstructed extension flags are forwarded
- **AND** the sub-agent spawn args are identical to current behavior (only `-e` paths forwarded)

#### Scenario: Empty unknownFlags produces no additional args

- **WHEN** a task is dispatched to any agent
- **AND** `parsedArgs.unknownFlags` is empty
- **THEN** no additional flags are included in the spawn args
- **AND** behavior is identical to current
