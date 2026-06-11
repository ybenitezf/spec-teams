## ADDED Requirements

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
