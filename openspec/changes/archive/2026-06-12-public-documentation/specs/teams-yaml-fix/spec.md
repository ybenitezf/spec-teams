## MODIFIED Requirements

In the existing spec-teams-extension capability, the team configuration behavior is modified:

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