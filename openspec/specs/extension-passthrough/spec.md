# extension-passthrough Specification

## Purpose
TBD - created by archiving change extension-passthrough. Update Purpose after archive.
## Requirements
### Requirement: Parent extension paths detected at module init
The extension SHALL parse `process.argv.slice(2)` at module initialization using `parseArgs` from `@earendil-works/pi-coding-agent` to extract explicitly-loaded extension paths from the parent `pi` process. The parsed paths SHALL be stored in a module-level variable for use during sub-agent dispatch.

#### Scenario: Extension paths extracted from CLI
- **WHEN** the parent process was started with `-e ./extensions/spec-teams.ts -e /home/user/my-extension/index.ts`
- **THEN** two extension paths are parsed from `process.argv`
- **AND** both paths are stored in the module-level variable

#### Scenario: No -e flags passed
- **WHEN** the parent process was started without any `-e` or `--extension` flags
- **THEN** the module-level variable is an empty array
- **AND** no `-e` arguments are forwarded to sub-agents

#### Scenario: Long form --extension flag
- **WHEN** the parent process was started with `--extension ./path/to/extension.ts`
- **THEN** the path is parsed and stored identically to the `-e` short form

### Requirement: Relative paths resolved to absolute
The extension SHALL resolve each local extension path (paths starting with `./`, `../`, or `/`) to an absolute path using `path.resolve(process.cwd(), rawPath)`. The resolved path SHALL be normalized with `fs.realpathSync` to handle symlinks.

#### Scenario: Relative path resolved
- **WHEN** a parsed extension path is `../my-extension/index.ts` and the cwd is `/home/user/project`
- **THEN** the resolved absolute path is `/home/user/my-extension/index.ts`

#### Scenario: Symlink resolved to real path
- **WHEN** a parsed extension path is a symlink `/home/user/link-to-ext` pointing to `/home/user/actual-ext/index.ts`
- **THEN** the stored path after resolution is `/home/user/actual-ext/index.ts`

#### Scenario: Already-absolute path preserved
- **WHEN** a parsed extension path is `/absolute/path/to/extension.ts`
- **THEN** the path is resolved and normalized but remains absolute

### Requirement: Spec-teams extension filtered from forwarded paths
The extension SHALL identify its own file path using `import.meta.url` (converted via `fileURLToPath` from the `url` module) and SHALL exclude that path from the set of forwarded extension paths. The comparison SHALL use normalized absolute paths (after `fs.realpathSync`) to handle symlink variations.

#### Scenario: Spec-teams path filtered out
- **WHEN** the parsed extension paths include the spec-teams extension file
- **THEN** the spec-teams path is NOT included in the forwarded paths
- **AND** all other parsed paths remain in the forwarded set

#### Scenario: Spec-teams not in explicit -e paths
- **WHEN** the spec-teams extension was loaded via auto-discovery (not via `-e`)
- **AND** other extensions were explicitly loaded via `-e`
- **THEN** the spec-teams path is not in the parsed paths
- **AND** all other `-e` paths are forwarded unchanged

#### Scenario: Only spec-teams was passed as -e
- **WHEN** the only `-e` path is the spec-teams extension itself
- **THEN** the forwarded paths array is empty
- **AND** sub-agent behavior is identical to `--no-extensions`-only (no `-e` args forwarded)

#### Scenario: Self-identification fails gracefully
- **WHEN** `import.meta.url` is unavailable or `fileURLToPath` throws
- **THEN** all parsed extension paths are forwarded without filtering
- **AND** the extension does not crash or prevent sub-agent dispatch

### Requirement: Extension paths forwarded in sub-agent spawn args
The extension SHALL append each surviving extension path as a `-e <path>` argument in the sub-agent spawn argument array, after the `--no-extensions` flag and before other flags. The spawn argument builder SHALL produce `--no-extensions` followed by zero or more `-e <resolved-path>` arguments.

#### Scenario: Paths forwarded alongside --no-extensions
- **WHEN** two user extension paths survive filtering
- **THEN** the spawn args include `--no-extensions -e /path/to/ext1.ts -e /path/to/ext2.ts`
- **AND** `--no-extensions` disables auto-discovery while `-e` paths load explicitly

#### Scenario: No paths to forward
- **WHEN** the forwarded paths array is empty
- **THEN** the spawn args include `--no-extensions` without any `-e` arguments
- **AND** behavior is identical to the current implementation

#### Scenario: Forwarded paths do not interfere with other spawn args
- **WHEN** extension paths are forwarded
- **THEN** the `--mode json`, `-p`, `--model`, `--tools`, `--thinking`, `--append-system-prompt`, `--session`, and task arguments are present and unchanged in the spawn args
