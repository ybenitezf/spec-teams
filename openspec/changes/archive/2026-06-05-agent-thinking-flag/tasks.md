## 1. Agent Definition Changes

- [x] 1.1 Add `thinking?: boolean` field to the `AgentDef` interface
- [x] 1.2 Update `parseAgentFile()` to extract `thinking` from frontmatter, mapping `"on"` → `true`, everything else → `false`

## 2. Dispatch Wiring

- [x] 2.1 Replace hardcoded `"--thinking", "off"` in `dispatchAgent()` spawn args with `"--thinking", state.def.thinking ? "on" : "off"`

## 3. Validation

- [x] 3.1 Verify `parseAgentFile()` returns `thinking: false` for agent files without the field
- [x] 3.2 Verify `parseAgentFile()` returns `thinking: true` for agent files with `thinking: on`
- [x] 3.3 Manual smoke test: dispatch to an agent with `thinking: on` and confirm `--thinking on` appears in the spawned process
