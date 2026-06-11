# forward-extension-flags Specification

## Purpose
TBD - created by archiving change forward-extension-flags. Update Purpose after archive.
## Requirements
### Requirement: Extension flags forwarded to sub-agents

The extension SHALL extract unknown CLI flags from the parent process's parsed arguments at module-init time and forward them to sub-agent `pi` processes alongside the existing forwarded `-e` extension paths. Forwarding SHALL only occur when the parent process was invoked with `--no-extensions` (or `-ne`).

#### Scenario: String flag forwarded to sub-agent

- **WHEN** the parent process is invoked as `pi -ne -e spec-teams.ts -e my-ext.ts --api-key=abc123`
- **AND** `parseArgs` places `"api-key" → "abc123"` in `unknownFlags`
- **AND** `parsedArgs.noExtensions` is `true`
- **THEN** the sub-agent spawn args SHALL include `--api-key=abc123`

#### Scenario: Boolean flag forwarded to sub-agent

- **WHEN** the parent process is invoked as `pi -ne -e spec-teams.ts -e my-ext.ts --verbose`
- **AND** `parseArgs` places `"verbose" → true` in `unknownFlags`
- **AND** `parsedArgs.noExtensions` is `true`
- **THEN** the sub-agent spawn args SHALL include `--verbose`

#### Scenario: No extension flags present

- **WHEN** the parent process is invoked as `pi -ne -e spec-teams.ts` with no additional `-e` paths and no extension flags
- **AND** `unknownFlags` is empty
- **THEN** no additional flags are forwarded to sub-agents
- **AND** spawn args are identical to current behavior

#### Scenario: Forwarding skipped when --no-extensions is absent

- **WHEN** the parent process is invoked as `pi -e spec-teams.ts -e my-ext.ts --api-key=abc123` (without `--no-extensions`)
- **THEN** the `forwardedFlags` array SHALL be empty
- **AND** no extension flags are forwarded to sub-agents
- **AND** sub-agents still receive forwarded `-e` extension paths

#### Scenario: Multiple extension flags forwarded

- **WHEN** the parent process is invoked with `-ne` and multiple `-e` extensions each registering flags
- **AND** `unknownFlags` contains entries for flags from all forwarded extensions
- **THEN** all reconstructed flags SHALL appear in the sub-agent spawn args

### Requirement: Flag reconstruction format

Extension SHALL reconstruct `unknownFlags` entries into CLI argument strings as follows: for string values, use `--flag=value` format; for boolean `true` values, use `--flag` format (no value argument).

#### Scenario: String value reconstructed as single arg

- **WHEN** `unknownFlags` contains `"api-token" → "secret123"`
- **THEN** the reconstructed arg SHALL be `--api-token=secret123` as a single array element

#### Scenario: Boolean true value reconstructed as bare flag

- **WHEN** `unknownFlags` contains `"plan" → true`
- **THEN** the reconstructed arg SHALL be `--plan` as a single array element

#### Scenario: Flag value with special characters preserved

- **WHEN** `unknownFlags` contains `"token" → "abc=123&key=val"`
- **THEN** the reconstructed arg SHALL be `--token=abc=123&key=val`
- **AND** `spawn()` passes the value without shell interpretation

### Requirement: Flag ordering in sub-agent spawn args

The reconstructed extension flags SHALL be placed in the sub-agent spawn args array after the `-e` extension paths and before the spec-teams–controlled args (`--model`, `--tools`, `--thinking`, `--append-system-prompt`, `--session`).

#### Scenario: Reconstructed flags placed between extensions and spec-teams args

- **WHEN** the spawn args array is constructed
- **THEN** `-e` paths appear first, followed by reconstructed flags, followed by `--model`, `--tools`, `--thinking`, `--append-system-prompt`, `--session`, `-c` (if resuming), and the task text

