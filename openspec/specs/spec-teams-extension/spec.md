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
The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. The lifecycle SHALL describe five fluid activities: explore, propose, apply, verify, and archive. Each activity SHALL be described with general role keywords for description-based agent matching (no hardcoded agent names). The archive activity SHALL be described as focused on mechanical finalization (syncing delta specs via openspec CLI, merging into main specs, moving to archive/) — audit and validation concerns SHALL belong to the verify activity. The propose activity SHALL be described as focused on formalizing explored decisions into structured artifacts and SHALL include guidance that propose agents expect a clear brief (not an open-ended investigation). The "Working with Agents" section SHALL include guidance for each activity transition including: exploration that produces clear decisions SHOULD lead to dispatching propose with a structured brief; archiving SHALL only be suggested after a clean verification AND user approval. The system prompt SHALL NOT contain a static lookup table mapping phases to specific agent names. The system prompt SHALL NOT contain pipeline-enforcing language.

#### Scenario: System prompt includes five activities
- **WHEN** an agent starts
- **THEN** the system prompt includes activity descriptions for explore, propose, apply, verify, and archive
- **AND** the verify activity is described with keywords covering review, validation, audit, spec compliance, and gap detection
- **AND** the archive activity is described as focused on syncing delta specs, merging into main specs, and moving to archive/
- **AND** the propose activity is described with guidance that propose agents expect a clear brief rather than open-ended investigation

#### Scenario: Propose transition guidance present
- **WHEN** an agent starts
- **THEN** the system prompt includes guidance that when exploration produces clear decisions, the dispatcher SHOULD dispatch to propose with a structured brief including change name, problem, approach, scope, and constraints

#### Scenario: Archive gating guidance present
- **WHEN** an agent starts
- **THEN** the system prompt includes guidance that archiving SHALL only be suggested after a clean verification
- **AND** the dispatcher SHALL ask the user for approval before dispatching the archive agent

#### Scenario: Verify does not reference specific agent names
- **WHEN** an agent starts
- **THEN** the verify activity description does NOT contain hardcoded agent names
- **AND** the dispatcher can match the verify phase to any agent whose description signals verification

#### Scenario: Existing routing constraints preserved
- **WHEN** an agent starts
- **THEN** the system prompt still does NOT contain hardcoded agent names in routing instructions
- **AND** the system prompt still does NOT contain pipeline-enforcing language

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

### Requirement: Intent-based routing guidance
The system prompt SHALL include guidance that matches the dispatcher's activity choice to user intent: quick fixes SHALL NOT force unnecessary exploration, unclear requirements SHALL NOT be rushed to implementation, exploration that produces clear decisions SHALL lead to dispatching propose with a structured brief (change name, problem, approach, scope, constraints), implementations reported complete SHALL be verified before suggesting archive, verification issues SHALL be routed back to apply with specific fix tasks, and a clean verification SHALL lead the dispatcher to ask the user for archive approval before dispatching the archive agent.

#### Scenario: Quick fix bypasses exploration
- **WHEN** a user requests a simple change (e.g., "fix the typo in the footer")
- **THEN** the dispatcher MAY dispatch directly to an apply agent without first exploring or proposing

#### Scenario: Unclear requirements trigger exploration
- **WHEN** a user expresses uncertainty (e.g., "I'm not sure how to handle auth")
- **THEN** the dispatcher SHOULD route to an explore agent before creating artifacts

#### Scenario: Explored decisions trigger propose
- **WHEN** exploration has produced clear, agreed-upon decisions about what to build
- **THEN** the dispatcher SHOULD dispatch a propose agent with a structured task string containing the change name, problem statement, technical approach, scope boundaries, and constraints

#### Scenario: Implementation verification gating
- **WHEN** an apply agent returns status "done"
- **THEN** the dispatcher SHOULD dispatch a verify agent to audit the implementation before suggesting archive

#### Scenario: Verification issues loop back to apply
- **WHEN** a verify agent returns issues-found
- **THEN** the dispatcher SHOULD route the specific issues back to an apply agent for targeted fixes

#### Scenario: Clean verification prompts user for archive
- **WHEN** a verify agent returns a clean verdict
- **THEN** the dispatcher SHALL ask the user for approval to archive
- **AND** the dispatcher SHALL NOT dispatch the archive agent without user confirmation

#### Scenario: User approves archive
- **WHEN** the user confirms archive after a clean verification
- **THEN** the dispatcher SHALL dispatch the archive agent with the change name and instruction to sync

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

### Requirement: Explore relay protocol in system prompt
The dispatcher's system prompt SHALL include instructions for the explore relay protocol: when an explore agent is available on the team, exploration SHALL be conducted through multi-turn dispatch with the explore agent. The dispatcher SHALL relay explore agent responses to the user and relay user responses back to the explore agent via continued dispatches.

#### Scenario: Dispatcher relays explore responses to user
- **WHEN** the explore agent returns `need-input` with analysis and questions
- **THEN** the dispatcher presents the explore agent's response to the user
- **AND** the dispatcher waits for the user's response before dispatching again

#### Scenario: Dispatcher continues explore session with user response
- **WHEN** the user responds to an explore agent's question
- **THEN** the dispatcher dispatches the explore agent again with the user's message
- **AND** the explore agent resumes its session automatically

#### Scenario: Dispatcher recognizes ready-to-propose
- **WHEN** the explore agent returns `Status: ready-to-propose` with a structured brief
- **THEN** the dispatcher SHALL extract the structured brief (change name, problem, approach, scope, constraints)
- **AND** the dispatcher SHALL dispatch the propose agent with the structured brief as the task

#### Scenario: Dispatcher recognizes done-exploring
- **WHEN** the explore agent returns `Status: done-exploring`
- **THEN** the dispatcher SHALL present the summary to the user
- **AND** the dispatcher SHALL return to normal operation without creating a change

### Requirement: Explore multi-turn routing scenarios
The system prompt's "Working with Agents" section SHALL include guidance for the explore multi-turn flow: the explore agent may return `need-input` repeatedly as the conversation develops; each time the dispatcher relays and waits for user input; when `ready-to-propose` is returned, the dispatcher routes to the propose agent with the provided brief; when `done-exploring` is returned, no further action is needed.

#### Scenario: Multiple need-input rounds
- **WHEN** the explore agent returns `need-input` for a second time
- **THEN** the dispatcher continues relaying messages without treating the repeated signal as an error

#### Scenario: Explore to propose handoff is automatic
- **WHEN** the explore agent returns `ready-to-propose`
- **THEN** the dispatcher dispatches propose without asking the user for confirmation about the handoff

#### Scenario: Explore ends without artifacts
- **WHEN** the explore agent returns `done-exploring`
- **THEN** the dispatcher does NOT attempt to dispatch propose or create any artifacts

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

