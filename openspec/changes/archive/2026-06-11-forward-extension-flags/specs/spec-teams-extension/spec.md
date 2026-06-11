## ADDED Requirements

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
