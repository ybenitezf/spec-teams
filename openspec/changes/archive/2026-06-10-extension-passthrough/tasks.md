## 1. Imports and module-level setup

- [x] 1.1 Add `parseArgs` import from `@earendil-works/pi-coding-agent` alongside existing pi imports
- [x] 1.2 Add `fileURLToPath` import from the `url` Node module
- [x] 1.3 Add `realpathSync` import from the `fs` Node module (alongside existing fs imports)

## 2. Extension path parsing and filtering

- [x] 2.1 At module level (after imports, before `export default`), call `parseArgs(process.argv.slice(2))` to extract `parsed.extensions` (array of strings or undefined)
- [x] 2.2 Resolve each extension path to absolute: use `path.resolve(process.cwd(), rawPath)` for paths that look local (start with `./`, `../`, or `/`), then normalize with `realpathSync`
- [x] 2.3 Identify the current spec-teams extension file path using `fileURLToPath(import.meta.url)` and normalize with `realpathSync`
- [x] 2.4 Filter the spec-teams path from the resolved extension paths (compare normalized paths)
- [x] 2.5 Store the surviving paths in a module-level `const forwardedExtensions: string[]` variable
- [x] 2.6 Handle package-name extensions (non-local paths) by passing them through unresolved — they will be resolved by the sub-agent's pi instance
- [x] 2.7 Wrap self-identification in try/catch: if `import.meta.url` or `realpathSync` throws, skip filtering and forward all parsed paths

## 3. Sub-agent spawn argument forwarding

- [x] 3.1 In `dispatchAgent()`, after the `"--no-extensions"` entry in the args array, insert `-e <path>` for each path in `forwardedExtensions`
- [x] 3.2 Ensure the `-e` paths are inserted before `"--model"`, `"--tools"`, and other flags so the argument order remains coherent

## 4. Edge case handling

- [x] 4.1 No `-e` paths passed: `forwardedExtensions` is empty, no extra args inserted — behavior identical to current
- [x] 4.2 Only spec-teams passed: `forwardedExtensions` is empty after filtering — behavior identical to current
- [x] 4.3 Multiple `-e` flags with mixed relative/absolute paths: all resolved correctly, spec-teams filtered, others forwarded
- [x] 4.4 `--extension` long form: handled identically to `-e` by parseArgs

## 5. Verification

- [x] 5.1 Manual test: Run `pi -ne -e ./extensions/spec-teams.ts -e ./path/to/test-extension.ts -p "test"` and verify sub-agents receive `--no-extensions -e <resolved-test-extension-path>` via examining spawn args
- [x] 5.2 Manual test: Run `pi -ne -e ./extensions/spec-teams.ts -p "test"` (no other extensions) and verify sub-agents receive only `--no-extensions` (no `-e` paths)
- [x] 5.3 Manual test: Run `pi -ne -p "test"` (no `-e` at all) and verify sub-agents receive only `--no-extensions`
- [x] 5.4 Verify sub-agent system prompts are not overwritten (spec-teams filtered correctly) by checking sub-agent output contains expected specialist agent prompt
