## Context

`extensions/spec-teams.ts` currently hardcodes `--thinking off` in the `dispatchAgent()` spawn args (line 336). Agent definitions are parsed from Markdown frontmatter by `parseAgentFile()` which currently extracts only `name`, `description`, and `tools`. The `AgentDef` TypeScript interface reflects this.

There are no existing agent `.md` files in the project — no backward compatibility risk with existing definitions.

## Goals / Non-Goals

**Goals:**
- Add a `thinking` field to agent definition frontmatter
- Wire it to the `--thinking` flag in dispatched `pi` processes
- Default to `off` when field is absent (preserve current behavior)

**Non-Goals:**
- Thinking budget / token limit (just on/off)
- Per-task overrides by the dispatcher
- Surfacing the thinking flag in the dispatcher system prompt or agent catalog
- Changing how the dispatcher routes or selects agents

## Decisions

**Decision 1: Boolean in frontmatter, on/off strings in YAML**
The frontmatter field accepts `on` or `off` strings. Internally it's stored as a boolean. This gives agent authors a simple, human-readable YAML field while keeping the code clean.

Alternatives considered:
- Numeric budget (e.g., `thinking: 16000`): useful but premature. On/off answers the immediate need. Can add budget later as a separate field if needed.
- True/false strings: less natural for YAML frontmatter conventions.

**Decision 2: Default to `off` (not `on`)**
Backward compatibility. All existing agent dispatch sends `--thinking off`. Changing the default would alter behavior for agents that don't explicitly set the field. Since thinking is expensive in both tokens and latency, `off` is the safer default.

**Decision 3: Dispatcher catalog omits the thinking flag**
The dispatcher routes agents by their role description, not their cognitive profile. Adding `Thinking: on` to the catalog would add noise without improving routing decisions. Agents with and without thinking can share the same role description; the dispatcher picks by role, not by cognition.

**Decision 4: Unknown thinking values treated as `off`**
If someone writes `thinking: yes` or `thinking: onn`, the parser treats it as `off` rather than failing or guessing. This is defensive — an agent that accidentally gets thinking off is less surprising (and less expensive) than one that accidentally gets it on.

## Risks / Trade-offs

- **Cost**: Agents with `thinking: on` will consume more tokens. Mitigation: default is `off`; agent authors opt in explicitly.
- **Latency**: Thinking adds seconds to minutes per dispatch. The dispatcher blocks synchronously on each dispatch, so a long-thinking agent delays the user. Mitigation: teams should be intentional about which agents get thinking.
- **Exploit surface**: A poorly-designed agent with `thinking: on` plus a vague task could burn tokens reasoning in circles. Mitigation: this is a team design concern, not a code concern. The flag is a capability, not a guardrail.

## Open Questions

- Should the `--thinking` flag be surfaced differently depending on whether the Pi version supports a budget argument? (Currently Pi only supports `on`/`off`, but this could change.)
