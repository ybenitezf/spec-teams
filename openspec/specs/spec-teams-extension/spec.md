# spec-teams-extension Specification

## Purpose
TBD - created by archiving change integrate-spec-teams. Update Purpose after archive.
## Requirements
### Requirement: Extension file at correct location
The project SHALL contain `extensions/spec-teams.ts` as its extension entry point.

#### Scenario: File exists
- **WHEN** the project is checked out
- **THEN** `extensions/spec-teams.ts` exists and exports a default function

#### Scenario: Placeholder removed
- **WHEN** the project is checked out
- **THEN** `extensions/index.ts` does NOT exist

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
The extension SHALL register a `/specs-list` command to display loaded agents and their status.

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
The extension SHALL render a dashboard widget in the TUI showing agent status, context usage percentage, and agent name. The widget SHALL use a grid layout where multiple agents MAY appear on the same row separated by │ (U+2502) box-drawing characters. The widget SHALL compute the number of columns responsively based on terminal width and a configurable `maxColumns` (default 3). When only one column fits (narrow terminal or `maxColumns=1`), each agent SHALL render on its own row at full terminal width.

#### Scenario: Widget rendered in grid layout
- **WHEN** the extension loads in TUI mode
- **THEN** a `spec-team` widget is registered and visible showing loaded agents in a grid layout
- **AND** multiple agents MAY appear on the same row when terminal width permits

#### Scenario: Grid layout with default columns
- **WHEN** the extension loads with default `maxColumns=3` on a 80-char terminal with 5 agents
- **THEN** agents are arranged in rows of at most 3 per row
- **AND** cells within a row are separated by `│` characters
- **AND** the last row is left-aligned without trailing empty cells

#### Scenario: Single-column fallback on narrow terminal
- **WHEN** the terminal width is less than the minimum needed for 2 columns (cell width < 12 visible chars)
- **THEN** the widget renders in single-column mode with one agent per row at full terminal width

#### Scenario: Single-column mode via command
- **WHEN** the user runs `/specs-grid 1`
- **THEN** the widget renders one agent per row at full terminal width

#### Scenario: Zero agents placeholder
- **WHEN** no agents are loaded
- **THEN** the widget renders a placeholder message: "No agents found. Add .md files to agents/"

### Requirement: Dashboard cells use visual-width truncation

The widget's per-agent cell rendering function SHALL use `truncateToWidth()` from `@earendil-works/pi-tui` for all text truncation. Each cell SHALL be padded to its column's exact visible width via `truncateToWidth(result, cellWidth, "", true)`. A post-render safety guard SHALL re-truncate any cell whose `visibleWidth()` exceeds the target width to prevent line-width exceptions. Cells SHALL display icon, agent display name, and context percentage (e.g., `○ Explore 21%`). The description field and `[#####]` context bar SHALL NOT be rendered in cells.

#### Scenario: Cell with emoji does not exceed cell width

- **WHEN** an agent's display name contains double-width characters (emoji like ✅, ❌, or CJK characters)
- **AND** the cell is rendered at its calculated cell width
- **THEN** the visible width of the rendered cell SHALL NOT exceed the target cell width
- **AND** Pi SHALL NOT crash with a line-width exception

#### Scenario: Cell with ASCII-only text renders correctly

- **WHEN** an agent's display name contains only single-width ASCII characters
- **THEN** the cell renders correctly at the calculated cell width (no regression)

#### Scenario: Cell safety net catches off-by-one

- **WHEN** the budget calculation produces a string whose `visibleWidth()` exceeds the target cell width, regardless of cause
- **THEN** a post-render guard SHALL re-truncate the cell with `truncateToWidth(result, cellWidth)` to prevent a crash

#### Scenario: Extremely narrow cell fallback

- **WHEN** the name budget for a cell is less than 1 character (cell too narrow to fit icon + name + percentage)
- **THEN** the percentage SHALL be dropped and only icon + truncated name SHALL be rendered
- **AND** the cell SHALL still not exceed the target cell width

#### Scenario: Cell padded to equal width

- **WHEN** cells in the same grid row have different visible content lengths
- **THEN** each cell SHALL be padded to exactly the same visible width
- **AND** cells joined with `│` separators SHALL produce aligned columns

### Requirement: Grid column command
The extension SHALL repurpose the `/specs-grid` command to set the maximum number of grid columns in the dashboard widget. The command SHALL accept an integer argument between 1 and 6 inclusive and SHALL store it as `maxColumns`. If no argument or an out-of-range value is provided, the command SHALL notify the user of valid usage.

#### Scenario: Set valid column count
- **WHEN** the user runs `/specs-grid 4`
- **THEN** `maxColumns` is set to 4
- **AND** the dashboard widget re-renders with at most 4 agents per row
- **AND** the user is notified of the new column setting

#### Scenario: Default column count
- **WHEN** the extension loads and no `/specs-grid` command has been issued
- **THEN** `maxColumns` defaults to 3

#### Scenario: Invalid column count
- **WHEN** the user runs `/specs-grid 0` or `/specs-grid 7` or `/specs-grid abc`
- **THEN** the user receives a warning notification indicating valid range is 1-6
- **AND** `maxColumns` remains unchanged

#### Scenario: No argument
- **WHEN** the user runs `/specs-grid` without an argument
- **THEN** the user receives an informational notification showing current `maxColumns` and valid usage

### Requirement: Startup notification describes grid command
The extension's startup notification SHALL describe `/specs-grid <1-6>` as a command to set grid columns rather than as deprecated.

#### Scenario: Notification text updated
- **WHEN** the extension completes `session_start`
- **THEN** the notification includes a line describing `/specs-grid <1-6>` as setting grid columns (e.g., `/specs-grid <1-6>    Set grid columns (default 3)`)
- **AND** the notification does NOT describe `/specs-grid` as deprecated

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
The extension SHALL store subagent session files at `~/.pi/spec-teams/<encoded-cwd>/` where `<encoded-cwd>` is an encoded representation of the project's absolute working directory. Session files SHALL NOT be stored inside the project repository directory.

#### Scenario: Session directory is outside the project
- **WHEN** the extension initializes in a project at `/home/user/projects/my-app`
- **THEN** subagent sessions are written to `~/.pi/spec-teams/<encoded-cwd>/`
- **AND** no session files are created inside `/home/user/projects/my-app/.pi/spec-sessions/`

#### Scenario: Different projects have isolated sessions
- **WHEN** the extension runs in two different project directories
- **THEN** each project's subagent sessions are stored under distinct encoded-cwd directories
- **AND** a `session_start` event in one project does not affect sessions in the other

### Requirement: Opt-in frontmatter field

The `parseAgentFile()` function SHALL extract an optional `opt-in` field from agent Markdown frontmatter. When present and truthy (case-insensitive match to "true"), the agent SHALL be marked as opt-in in its `AgentDef`. When absent or any other value, the agent is treated as standard (non-opt-in). When no `teams.yaml` file exists, agents with `optIn: true` SHALL be excluded from the default "all" team.

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
- **WHEN** `loadAgents()` runs and no `teams.yaml` exists
- **AND** the parsed agents include a worker agent with `optIn: true` and five standard agents
- **THEN** the default "all" team contains only the five standard agents
- **AND** the worker agent is excluded from the active team

#### Scenario: All agents are standard
- **WHEN** `loadAgents()` runs and no `teams.yaml` exists
- **AND** all parsed agents are standard (no `optIn: true`)
- **THEN** the default "all" team contains all agents
- **AND** behavior is identical to before this change

#### Scenario: Teams.yaml takes precedence
- **WHEN** a `teams.yaml` file exists in `.pi/agents/`
- **THEN** the opt-in frontmatter field has NO effect on team membership
- **AND** team membership is determined solely by teams.yaml

### Requirement: Teams.yaml with openspec and full teams

The project SHALL contain `.pi/agents/teams.yaml` defining at least two teams: an `openspec` team (explore, propose, apply, verify, archive) and a `full` team (all agents including worker). The `openspec` team SHALL be listed first and become the default.

#### Scenario: Teams.yaml file exists
- **WHEN** the extension loads
- **THEN** `.pi/agents/teams.yaml` is found and parsed
- **AND** the `openspec` and `full` teams are available for selection

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
