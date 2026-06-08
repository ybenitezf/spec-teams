## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Dashboard widget
The extension SHALL render a dashboard widget in the TUI showing agent status, context usage percentage, and agent name. The widget SHALL use a grid layout where multiple agents MAY appear on the same row separated by `│` (U+2502) box-drawing characters. The widget SHALL compute the number of columns responsively based on terminal width and a configurable `maxColumns` (default 3). When only one column fits (narrow terminal or `maxColumns=1`), each agent SHALL render on its own row at full terminal width.

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
