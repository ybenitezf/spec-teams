## MODIFIED Requirements

### Requirement: Extension file at correct location
The project SHALL contain `extensions/spec-teams.ts` as its extension entry point. The file SHALL include the `updateWidget()` function with a `render(width)` method that prepends an empty string `""` as the first element of all `string[]` return values, ensuring visual padding above the agent roster grid.

#### Scenario: File exists
- **WHEN** the project is checked out
- **THEN** `extensions/spec-teams.ts` exists and exports a default function

#### Scenario: Placeholder removed
- **WHEN** the project is checked out
- **THEN** `extensions/index.ts` does NOT exist

#### Scenario: Widget render includes top padding
- **WHEN** the `render(width)` method of the widget component in `updateWidget()` is called
- **THEN** the first element of the returned `string[]` SHALL be `""` (empty string)