# grid-top-padding Specification

## Purpose
Provides visual padding above the agent roster grid in the spec-teams dashboard widget.

## Requirements
### Requirement: Grid top padding via empty string
The widget's `render(width)` method SHALL prepend an empty string `""` as the first element of the returned `string[]` on all render paths (empty state, single-column, and multi-column grid), providing one additional blank line of visual spacing above the grid content.

#### Scenario: Empty state has top padding
- **WHEN** no agents are loaded and `render(width)` is called
- **THEN** the returned array SHALL start with `""` followed by the "No agents found" dim message

#### Scenario: Single-column grid has top padding
- **WHEN** agents are loaded and `computeColumns` returns 1
- **THEN** the returned array SHALL start with `""` followed by the single-column agent cell strings

#### Scenario: Multi-column grid has top padding
- **WHEN** agents are loaded and `computeColumns` returns 2 or more columns
- **THEN** the returned array SHALL start with `""` followed by the multi-column grid row strings
