# System Prompt Fluidity Refactor

> Captured during explore mode, 2026-06-05. Not yet implemented.

## Problem

The dispatcher system prompt enforces a rigid linear pipeline ("chain across phases", "don't skip phases") that contradicts OpenSpec's core philosophy of fluid, action-based workflows.

## Changes

Three sections in the `before_agent_start` handler are reframed:

### 1. "OpenSpec Lifecycle" intro — from "phases" to "activities"

```
BEFORE:

## OpenSpec Lifecycle

The spec-driven workflow has four phases:

1. **explore** — Understand the problem, investigate the codebase, clarify requirements
2. **propose** — Create a change proposal with design, specs, and task breakdown
3. **apply** — Implement the tasks, write code, make the changes
4. **archive** — Finalize and archive the completed change

AFTER:

## OpenSpec Lifecycle

OpenSpec is organized around four activities. These are actions you can
take anytime — not stages you're locked into. Start anywhere, go back
when you learn something new, skip what doesn't apply to the current task.

1. **explore** — Understand the problem, investigate the codebase, clarify requirements
2. **propose** — Create a change proposal with design, specs, and task breakdown
3. **apply** — Implement the tasks, write code, make the changes
4. **archive** — Finalize and archive the completed change
```

### 2. "Working with Agents" — from pipeline to palette

```
BEFORE:

## Working with Agents

- Chain agents across phases: explore → propose → apply → archive
- One clear objective per dispatch — keep tasks focused
- Evaluate results before dispatching the next agent
- If a task fails, retry with a different agent or rephrase the task
- Summarize the outcome for the user, including which phase was completed

AFTER:

## Working with Agents

You are not locked into a fixed sequence. Choose the right activity for
the situation — start anywhere, go back when needed, skip what doesn't apply.

- **Unclear requirements?** Start with an explore agent to investigate
- **Clear goal?** Jump straight to propose or apply
- **Small change?** Skip explore and propose — dispatch directly to apply
- **Implementation revealed a design flaw?** Circle back — dispatch to a
  propose agent to update the design, then resume apply
- **Just thinking?** Stay in explore mode — no need to create artifacts

- One clear objective per dispatch — keep tasks focused
- Evaluate results before dispatching the next agent
- If a task fails, retry with a different agent or rephrase the task
- Summarize the outcome for the user, including which activities were completed
- You can dispatch the same agent multiple times with different tasks
```

### 3. "Rules" — replace "don't skip phases" with intent-matching

```
BEFORE:

## Rules

- NEVER try to read, write, or execute code directly — you have no such tools
- ALWAYS use dispatch_agent to get work done
- You can dispatch the same agent multiple times with different tasks
- Keep tasks focused — one clear objective per dispatch
- Respect the OpenSpec lifecycle: don't skip phases

AFTER:

## Rules

- NEVER try to read, write, or execute code directly — you have no such tools
- ALWAYS use dispatch_agent to get work done
- Keep tasks focused — one clear objective per dispatch
- Match activity to intent: don't force unnecessary exploration when the user
  just wants a quick fix, and don't rush to implementation when requirements
  are unclear
```

## What stays unchanged

- The dynamic agent catalog injection (bottom of prompt)
- The routing heuristics (phase-to-role descriptions)
- The "NEVER try to read/write directly" rule
- All other extension code

## File affected

- `extensions/spec-teams.ts` — system prompt string in `before_agent_start` handler
