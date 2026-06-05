## Context

The `before_agent_start` handler in `extensions/spec-teams.ts` builds a system prompt string that governs the dispatcher agent's behavior. This prompt was previously refactored to remove hardcoded agent names (dynamic agent routing change), but still retained pipeline-enforcing language from an earlier version. The prompt currently uses two problematic directives:

1. "Chain agents across phases: explore → propose → apply → archive"
2. "Respect the OpenSpec lifecycle: don't skip phases"

These contradict OpenSpec's documented philosophy of fluid, action-based workflows. OpenSpec explicitly states "actions, not phases" and "no phase gates." This change aligns the dispatcher prompt with the actual OpenSpec design.

## Goals / Non-Goals

**Goals:**
- Remove pipeline-enforcing language ("chain across phases", "don't skip phases")
- Add fluidity-first language: activities can be taken anytime, start anywhere, go back, skip as needed
- Add situation-based guidance so the dispatcher can match activity choice to user intent
- Preserve all existing functionality: routing heuristics, agent catalog injection, lifecycle vocabulary

**Non-Goals:**
- No changes to agent `.md` format, `teams.yaml`, or agent loading
- No new tools, commands, or UI components
- No changes to dispatch logic or `dispatch_agent` tool behavior
- No changes to the `session_start` or footer widgets

## Decisions

### Decision 1: Frame lifecycle as "activities" not "phases"

**Chosen**: Change introductory language from "four phases" to "four activities" with explicit fluidity framing.

```
Before: "The spec-driven workflow has four phases:"
After:  "OpenSpec is organized around four activities. These are actions you
         can take anytime — not stages you're locked into."
```

**Rationale**: The word "phase" implies a stage in a linear progression. "Activity" implies something you can engage in at any time. This mirrors OpenSpec's own language choices in their documentation.

**Alternatives considered:**
- "workflows" — rejected because OpenSpec uses that word for workflow patterns (quick feature, exploratory, etc.)
- "modes" — rejected because it implies exclusivity (can only be in one mode)
- "steps" — rejected for same reason as phases; implies sequence

### Decision 2: Situation-based guidance over generic "chain" instruction

**Chosen**: Replace the single pipeline instruction with 5 situation-based bullet points.

```
Before: "Chain agents across phases: explore → propose → apply → archive"
After:  "You are not locked into a fixed sequence..."
        "- Unclear requirements? → Start with explore"
        "- Clear goal? → Jump to propose or apply"
        "- Small change? → Skip explore and propose"
        "- Design flaw found? → Circle back to propose"
        "- Just thinking? → Stay in explore"
```

**Rationale**: This gives the LLM concrete patterns to match user intent against, rather than an abstract pipeline rule. Each bullet maps to a real user scenario we identified (typo fix, auth exploration, design iteration, etc.).

**Alternatives considered:**
- Just removing the line without replacement — rejected because the dispatcher needs *some* guidance on when to use which activity
- Adding a decision flowchart — rejected as too rigid; LLMs work better with natural language heuristics

### Decision 3: "Don't skip phases" → "Match activity to intent"

**Chosen**: Replace the prohibition with a balancing principle.

```
Before: "Respect the OpenSpec lifecycle: don't skip phases"
After:  "Match activity to intent: don't force unnecessary exploration when
         the user just wants a quick fix, and don't rush to implementation
         when requirements are unclear"
```

**Rationale**: This addresses the real concern behind "don't skip phases" — making sure work is done properly — while avoiding the rigidity. It's a bidirectional constraint: don't over-engineer simple tasks, don't under-engineer complex ones.

### Decision 4: Keep routing heuristics and agent catalog unchanged

The phase-to-role heuristics ("explore → agents focused on investigation") and the dynamic agent catalog remain unchanged. These are already working correctly and are independent of the pipeline-vs-fluidity question. The routing section tells the dispatcher *which agent to pick*; the working with agents section tells it *when to pick one*. These are orthogonal concerns.

## Risks / Trade-offs

- [Risk: dispatcher skips exploration for complex tasks] → Mitigation: The new guidance includes "don't rush to implementation when requirements are unclear." The intent-matching rule is bidirectional. Additionally, the `before_agent_start` handler still lists all four activities with descriptions, so the vocabulary is available.
- [Risk: dispatcher over-explores simple tasks] → Mitigation: The new guidance explicitly says "skip explore and propose" for small changes. The intent-matching rule addresses this directly.
- [Risk: LLM gets confused by more open-ended guidance] → Mitigation: The situation-based bullets are concrete and pattern-matchable. LLMs respond well to "if X, then Y" guidance. This is a well-tested prompt engineering pattern.

## Open Questions

None — the changes are scoped, the desired behavior is clear from the prompt-fluidity-refactor.md spec created during exploration, and all decisions have been made.
