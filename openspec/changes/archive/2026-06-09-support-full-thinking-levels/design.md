## Context

The `pi` CLI accepts `--thinking` with one of six levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. These map to underlying model reasoning budgets. The spec-teams extension currently treats thinking as a boolean (`on`/`off`) in the `AgentDef` interface and passes `--thinking on` or `--thinking off` to the CLI. Since `"on"` is not a valid level, the CLI rejects it with a warning and falls back to the internal default (`medium`).

All five current agent definitions (`agents/*.md`) set `thinking: on`, which works only because the fallback happens to be `medium` — a reasonable default. However, users have no way to configure distinct thinking levels per agent (e.g., higher for explore, lower for mechanical archive operations).

The `ThinkingLevel` type is already defined upstream in `@earendil-works/pi-agent-core` as `"off" | "minimal" | "low" | "medium" | "high" | "xhigh"`.

## Goals / Non-Goals

**Goals:**
- Allow each agent definition to specify a valid thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`)
- Maintain backward compatibility with existing agent files that use `thinking: on` or `thinking: off`
- Validate thinking values and warn on invalid input without crashing
- Pass the thinking level directly to `pi` CLI as a valid value

**Non-Goals:**
- Changing how thinking levels are rendered or displayed in the TUI
- Modifying the `pi` CLI itself
- Adding thinking level validation at the CLI level
- Per-agent thinking budgets or fine-grained token controls

## Decisions

### Decision 1: Change `AgentDef.thinking` from `boolean` to `string`

**Rationale:** The thinking level is inherently a string enum, not a binary flag. Using a string matches the upstream `ThinkingLevel` type and allows all six valid levels. The `AgentDef` is an internal type used only within `spec-teams.ts`, so the scope of the breaking change is limited to that single file.

**Alternatives considered:**
- **Keep boolean and add a separate `thinkingLevel` field**: Would avoid a breaking change but creates confusion — two fields controlling the same thing. The old boolean path (`--thinking on`) is already broken, so there's no value in preserving it.
- **Use a union type (`ThinkingLevel` from `@earendil-works/pi-agent-core`)**: Cleaner typing, but the extension doesn't currently import from `@earendil-works/pi-agent-core` for types. Adding the import for a single type alias is minimal overhead, but using a plain string with runtime validation keeps the change self-contained and avoids potential peer dependency version issues.

**Chosen:** `string` with runtime validation. The `ThinkingLevel` type is 6 specific string literals. Runtime validation against the set `{off, minimal, low, medium, high, xhigh}` provides equivalent safety without adding a peer dependency import.

### Decision 2: Legacy mapping strategy

**Rationale:** Existing agent files use `thinking: on` or `thinking: off`. These should continue to work without requiring immediate migration.

**Mapping:**
- `"on"` → `"medium"` (CLI's default when thinking is enabled; matches current behavior)
- `"true"` → `"medium"` (YAML boolean `true` may serialize as `"true"`)
- `"off"` → `"off"`
- `"false"` → `"off"`
- Any other unrecognized value → `"medium"` with a console warning

**Alternatives considered:**
- **Map `on` to `high`**: Would change behavior for all existing agents, potentially increasing cost and latency without user intent.
- **Reject unknown values and skip the agent**: Too harsh — a typo shouldn't prevent the extension from loading agents.
- **Default to `off` for unknown values**: Safer but changes current behavior (currently `on` → `medium` via fallback). Keeping `medium` as the unrecognized fallback preserves the status quo.

### Decision 3: No default change for agents without `thinking` field

**Rationale:** Currently, agents without a `thinking` field default to `false` (→ `off`). Changing this to `"medium"` would alter behavior for any existing or future agent that omits the field. Keeping `off` as the implicit default when the field is absent is the safer choice.

**Note:** This means agents must explicitly opt into thinking by setting a level. All current agents already set `thinking: on`, so they already opt in — the migration just changes `on` → an explicit level.

### Decision 4: Per-agent default thinking levels

**Rationale:** Different agent roles benefit from different reasoning depth:

| Agent | Recommended Level | Reasoning |
|-------|------------------|-----------|
| explore | `high` | Deep investigation, codebase analysis, ambiguity resolution |
| propose | `medium` | Formalizing already-crystallized decisions into structured artifacts |
| apply | `low` | Implementing well-defined tasks from a clear tasks.md |
| verify | `medium` | Auditing implementation against specs requires careful reasoning |
| archive | `low` | Mechanical operations: syncing delta specs, moving files |

These are defaults set in the agent `.md` files. Users can override them by editing the frontmatter.

## Risks / Trade-offs

- **[Risk] Breaking change to `AgentDef.thinking` type**: Any code that reads `.thinking` as a boolean will break. → **Mitigation**: `AgentDef` is only used within `spec-teams.ts` itself. The only consumer is the dispatch `args` construction and the thinking comparison logic. No external code depends on this type.
- **[Risk] Legacy mapping may mask user errors**: If a user writes `thinking: high` but makes a typo (`thinking: hgih`), it maps silently to `medium`. → **Mitigation**: Console warning is emitted for unrecognized values. This is consistent with how other frontmatter fields are handled (unknown values don't crash).
- **[Trade-off] Agents without `thinking` field default to `off`**: This is conservative but means new agents must remember to set thinking explicitly. → The `agents/` README or template should document the field.

## Migration Plan

1. **Code change**: Update `AgentDef`, `parseAgentFile()`, and dispatch args in `extensions/spec-teams.ts`.
2. **Agent file update**: Edit all five `agents/*.md` files to use explicit valid levels (as recommended above).
3. **No rollback complexity**: The old behavior (`--thinking on`) was already broken. Rolling back would restore the warning-and-fallback behavior. The agent files could be reverted to `thinking: on` and the legacy mapping would handle them.
4. **No data migration needed**: Agent `.md` files are plain Markdown. No session files or persistent state affected.

## Open Questions

- Should the extension emit a deprecation warning when `thinking: on` or `thinking: off` is encountered, nudging users toward explicit levels? **Decision deferred** — the legacy mapping is silent for now; a warning could be added later without breaking anything.
