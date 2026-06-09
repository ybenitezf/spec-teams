## 1. Update AgentDef interface

- [x] 1.1 Change `AgentDef.thinking` from `boolean` to `string` in `extensions/spec-teams.ts`

## 2. Update parseAgentFile()

- [x] 2.1 Replace the boolean parsing logic (`thinkingRaw === "on"`) with string-based validation against the set `{off, minimal, low, medium, high, xhigh}`
- [x] 2.2 Add legacy mapping: `"on"` and `"true"` → `"medium"`; `"off"` and `"false"` → `"off"`
- [x] 2.3 Add console warning for unrecognized thinking values, falling back to `"medium"`
- [x] 2.4 Default to `"off"` when the `thinking` field is absent from frontmatter

## 3. Update dispatch CLI arguments

- [x] 3.1 Replace the ternary `state.def.thinking ? "on" : "off"` with `state.def.thinking` directly in the `--thinking` flag construction
- [x] 3.2 Ensure the thinking level is passed as-is (already validated during parsing)

## 4. Update agent definition files

- [x] 4.1 Update `agents/explore.md` to `thinking: high`
- [x] 4.2 Update `agents/propose.md` to `thinking: medium`
- [x] 4.3 Update `agents/apply.md` to `thinking: low`
- [x] 4.4 Update `agents/verify.md` to `thinking: medium`
- [x] 4.5 Update `agents/archive.md` to `thinking: low`

## 5. Verify

- [x] 5.1 Run `pi -e ./extensions/spec-teams.ts -p "hello"` and confirm the extension loads without errors
- [x] 5.2 Verify that a dispatch spawns with the correct `--thinking <level>` flag (check via `--verbose` or process inspection)
- [x] 5.3 Verify legacy `thinking: on` still works by temporarily reverting one agent file and confirming it maps to `--thinking medium`
- [x] 5.4 Verify an unrecognized value produces a console warning and falls back to `--thinking medium`
