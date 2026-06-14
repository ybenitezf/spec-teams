## MODIFIED Requirements

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

### Requirement: Agent listing command
The extension SHALL register a `/specs-list` command to display loaded agents and their status. The command output SHALL remain unchanged from current behavior.

#### Scenario: Command registered
- **WHEN** the extension loads
- **THEN** the `/specs-list` command is available in the Pi session