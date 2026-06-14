# dashboard-dialog Specification

## Purpose
Implements the `/specs-dashboard` TUI overlay dialog that displays detailed per-agent state information in a scrollable card-based dialog component.

## Requirements
### Requirement: Dashboard dialog command
The extension SHALL register a `/specs-dashboard` Pi command that opens a TUI overlay dialog showing detailed per-agent state information. When invoked, the command SHALL use `ctx.ui.custom(factoryFunction, { overlay: true, ... })` where the factory function receives `(tui, theme, keybindings, done)` parameters. The dialog SHALL be dismissed by pressing Escape or Enter, resolving the promise with `undefined`.

#### Scenario: Command opens overlay dialog
- **WHEN** the user runs `/specs-dashboard`
- **THEN** an overlay dialog appears centered on the screen showing the active team's agents
- **AND** each agent is displayed as a detail card with all available state information

#### Scenario: Command with no active team
- **WHEN** the user runs `/specs-dashboard` and no team is active or no agents are loaded
- **THEN** the overlay dialog displays a message indicating no agents are available
- **AND** the dialog is still dismissable via Escape or Enter

#### Scenario: Dialog dismissed via Escape
- **WHEN** the dashboard dialog is open and the user presses Escape
- **THEN** the dialog closes and focus returns to the editor

#### Scenario: Dialog dismissed via Enter
- **WHEN** the dashboard dialog is open and the user presses Enter
- **THEN** the dialog closes and focus returns to the editor

### Requirement: Agent detail cards in dashboard dialog
Each agent in the dashboard dialog SHALL be displayed as a detail card showing the following fields from `AgentDef` and `AgentState`:
- Status icon (`○` idle, `●` running, `✓` done, `✗` error) followed by display name
- Status text (idle, running, done, error)
- Model (from `AgentDef.model`, falling back to "default")
- Thinking level (from `AgentDef.thinking`)
- Tools (from `AgentDef.tools`)
- Description (from `AgentDef.description`)
- Context percentage (from `AgentState.contextPct`, formatted as `N%`)
- Cost (from `AgentState.cost`, formatted as `$N.NNNN`)
- Run count (from `AgentState.runCount`)
- Elapsed time (from `AgentState.elapsed`, formatted via `formatDuration()`)
- Session state (`resumed` if `AgentState.sessionFile` exists, `new` otherwise)

Primary detail lines (Model, Thinking, Tools, Session, Description) SHALL use `theme.fg("text", ...)` styling. The status metrics line SHALL use `theme.fg("muted", ...)` styling. The footer hint SHALL remain `theme.fg("dim", ...)`.

Descriptions longer than the available content width SHALL be word-wrapped using `wrapTextWithAnsi()` from `@earendil-works/pi-tui`, preserving ANSI color codes across line breaks. Each wrapped line SHALL have `theme.fg("text", ...)` styling.

Content lines SHALL be preceded by `PADDING_H` (2) horizontal spaces. The top and bottom of the content area SHALL have `PADDING_V` (1) blank line each.

#### Scenario: Running agent card displays all fields with correct styling
- **WHEN** the dashboard dialog is open and an agent with status "running" has `contextPct: 21`, `cost: 0.0421`, `runCount: 3`, `elapsed: 65000`, `sessionFile: "path/to/session.json"`, `def.model: "openrouter/anthropic/claude-sonnet-4"`, `def.thinking: "medium"`, `def.tools: "read,grep,bash,edit"`, `def.description: "Investigate issues"`
- **THEN** the card displays: status icon `●` in accent color, name in bold (not accent-colored), status "running" with `muted` styling, model "openrouter/anthropic/claude-sonnet-4" with `text` styling, thinking "medium" with `text` styling, tools "read,grep,bash,edit" with `text` styling, description "Investigate issues" with `text` styling, context "21%", cost "$0.0421", "3 runs", elapsed "1m 5s", session "resumed" with `text` styling

#### Scenario: Idle agent card shows dim status icon with bold name
- **WHEN** an agent has status "idle"
- **THEN** the status icon `○` is rendered in dim color and the agent name is rendered in bold without dim coloring

#### Scenario: Error agent card shows error-colored icon with bold name
- **WHEN** an agent has status "error"
- **THEN** the status icon `✗` is rendered in error color and the agent name is rendered in bold without error coloring

#### Scenario: Agent with no model shows default
- **WHEN** an agent's `def.model` is undefined or empty
- **THEN** the model field displays "default" with `text` styling

#### Scenario: Agent with zero cost
- **WHEN** an agent's `cost` is 0
- **THEN** the cost field displays "$0"

#### Scenario: Agent with no session file
- **WHEN** an agent's `sessionFile` is null
- **THEN** the session state displays "new" with `text` styling

#### Scenario: Long description wraps to multiple lines
- **WHEN** an agent's description is longer than the available content width (inner width minus horizontal padding)
- **THEN** the description SHALL be word-wrapped at word boundaries to fit within the available width
- **AND** each wrapped line SHALL have `theme.fg("text", ...)` styling
- **AND** ANSI color codes in the description SHALL be preserved across wrapped lines

#### Scenario: Content has horizontal and vertical padding
- **WHEN** the dashboard dialog is open with any agents displayed
- **THEN** each content line SHALL be preceded by 2 horizontal spaces (PADDING_H)
- **AND** there SHALL be 1 blank line at the top and 1 blank line at the bottom of the content area (PADDING_V)
- **AND** the available content width SHALL be reduced by `2 * PADDING_H` from the inner border width

### Requirement: Dashboard dialog is scrollable
The dashboard dialog SHALL support scrolling when the total height of agent cards exceeds the overlay's maximum height. The overlay SHALL use `OverlayOptions` with `anchor: "center"`, `width: "60%"`, and `maxHeight: "80%"`. Vertical padding lines SHALL be included in scroll height calculations.

#### Scenario: Many agents overflow overlay height
- **WHEN** the dashboard dialog is open and agents produce more card lines (including padded and wrapped description lines) than the overlay height allows
- **THEN** the dialog is scrollable and the user can scroll to see all agents

#### Scenario: Few agents fit in overlay
- **WHEN** the dashboard dialog is open and 3 agents produce card lines that fit within the overlay height
- **THEN** all cards are visible without scrolling

### Requirement: Dashboard dialog supports live state updates
While the dashboard dialog is open, agent state changes (status transitions, incrementing tool counts, growing elapsed time, updating context percentage) SHALL be reflected in the dialog. The dialog's root component SHALL implement `invalidate()` and be called whenever `agentStates` changes.

#### Scenario: Agent completes while dialog is open
- **WHEN** the dashboard dialog is open showing agent "explore" with status "running"
- **AND** the explore agent transitions to status "done"
- **THEN** the dialog updates to show the "✓" icon and "done" status for that agent

#### Scenario: Elapsed time updates while dialog is open
- **WHEN** the dashboard dialog is open showing an agent with elapsed 5000ms
- **AND** the agent's `setInterval` timer increments elapsed to 6000ms
- **THEN** the dialog updates the elapsed display from "5s" to "6s"

#### Scenario: Dialog already closed when state changes
- **WHEN** an agent state changes and the dashboard dialog was previously closed
- **THEN** the `invalidate()` call is a no-op and no error occurs

### Requirement: Dashboard dialog handles theme changes
The dashboard dialog components SHALL implement `invalidate()` to clear any cached theme-dependent rendering. When Pi's theme changes while the dialog is open, the dialog SHALL re-render with updated colors.

#### Scenario: Theme change while dialog is open
- **WHEN** the dashboard dialog is open and Pi's theme changes
- **THEN** the dialog re-renders with new theme colors applied to all card elements

### Requirement: Dashboard notification updated
The startup notification and the `/specs-list` command output SHALL reference `/specs-dashboard` instead of `/specs-grid`. The `/specs-grid` command SHALL NOT be registered.

#### Scenario: Startup notification mentions dashboard command
- **WHEN** the extension completes `session_start`
- **THEN** the notification includes a line describing `/specs-dashboard` as the command to view the agent dashboard
- **AND** the notification does NOT mention `/specs-grid`

#### Scenario: /specs-grid command not registered
- **WHEN** the extension loads
- **THEN** the `/specs-grid` command is NOT available in the Pi session
