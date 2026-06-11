## 1. Module-init flag extraction

- [x] 1.1 Read `parsedArgs.unknownFlags` after the existing `parseArgs(process.argv.slice(2))` call in `extensions/spec-teams.ts`
- [x] 1.2 Reconstruct flags as a `forwardedFlags: string[]` array: `--flag=value` for string entries, `--flag` for boolean `true` entries
- [x] 1.3 Guard reconstruction: only populate `forwardedFlags` when `parsedArgs.noExtensions === true`; otherwise set to empty array
- [x] 1.4 Add a console log or debug comment noting when flag forwarding is active (optional, for troubleshooting)

## 2. Integrate flags into dispatch spawn args

- [x] 2.1 In `dispatchAgent()`, add `...forwardedFlags` to the spawn args array after the forwarded `-e` extension paths and before `--model`, `--tools`, etc.
- [x] 2.2 Verify the args array ordering: `--mode json`, `-p`, `--no-extensions`, `-e` paths, `forwardedFlags`, `--model`, `--tools`, `--thinking`, `--append-system-prompt`, `--session`, `-c` (if resuming), task text

## 3. Edge case handling

- [x] 3.1 Verify that when `unknownFlags` is empty (most common case), `forwardedFlags` is an empty array and spawn args are identical to current behavior
- [x] 3.2 Verify that when `noExtensions` is falsy, `forwardedFlags` is empty and no extension flags are forwarded
- [x] 3.3 Verify that flag values with special characters (`=`, `&`, spaces) are handled correctly by the `--flag=value` reconstruction format (spawn passes args directly, no shell interpretation)
- [x] 3.4 Verify that multiple extensions each with their own flags all have their flags forwarded correctly

## 4. Validation

- [x] 4.1 Build the extension (`npm run build` or `tsc`) and verify no TypeScript errors
- [x] 4.2 Test with a real extension that registers a CLI flag: run `pi -ne -e extensions/spec-teams.ts -e <ext-with-flags> --<flag>=<value>` and verify sub-agents receive the flag
- [x] 4.3 Test without `--no-extensions`: run `pi -e extensions/spec-teams.ts` and verify sub-agents spawn without errors (no extension flags forwarded)
- [x] 4.4 Test backward compatibility: run `pi -ne -e extensions/spec-teams.ts` (no extension flags) and verify dispatch behavior is unchanged
