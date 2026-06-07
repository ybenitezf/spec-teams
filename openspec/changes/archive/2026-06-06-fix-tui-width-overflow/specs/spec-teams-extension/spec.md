## ADDED Requirements

### Requirement: Dashboard rows use visual-width truncation

The `renderAgentRow()` function in the dashboard widget SHALL use `truncateToWidth()` from `@earendil-works/pi-tui` for all text truncation rather than a character-count based truncation.

#### Scenario: Row with emoji does not exceed terminal width

- **WHEN** an agent's `lastWork` or `task` description contains double-width characters (emoji like ✅, ❌, or CJK characters)
- **AND** the dashboard row is rendered at terminal width `W`
- **THEN** the visible width of the rendered row SHALL NOT exceed `W`
- **AND** Pi SHALL NOT crash with a line-width exception

#### Scenario: Row with ASCII-only text renders correctly

- **WHEN** an agent's `lastWork` or `task` description contains only single-width ASCII characters
- **THEN** the dashboard row renders identically to before the change (no regression)

#### Scenario: Row safety net catches off-by-one

- **WHEN** the budget calculation in `renderAgentRow()` produces a string whose `visibleWidth()` exceeds the terminal width, regardless of cause
- **THEN** a post-render guard SHALL re-truncate the row with `truncateToWidth(result, width)` to prevent a crash

#### Scenario: Extremely narrow terminal fallback

- **WHEN** the terminal width is less than 40 columns
- **THEN** the bare-minimum fallback branch in `renderAgentRow()` SHALL also use visual-width truncation
- **AND** the fallback row SHALL NOT exceed the terminal width
