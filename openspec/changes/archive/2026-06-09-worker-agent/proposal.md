## Why

The spec-teams extension routes all user requests through a dispatcher to OpenSpec-specialized agents (explore, propose, apply, verify, archive). When a user needs something outside the OpenSpec workflow — git commit, web fetch, quick script, file cleanup, one-off edit — there is no appropriate agent. The dispatcher falls back to the explore agent, which is constrained (restricted write access, OpenSpec session management, exploration stance) and ill-suited for direct task execution. Users need a general-purpose "worker" agent that executes tasks without OpenSpec constraints or ceremony.

## What Changes

- **New `worker` agent definition** — `.pi/agents/worker.md` with full tool access, no OpenSpec awareness, execution stance (`thinking: off`), and simple `done`/`blocked` status signals
- **Opt-in team membership frontmatter field** — New `opt-in: true` field on agent definitions. Agents with `opt-in: true` are excluded from the default "all" team when no `teams.yaml` is defined
- **`teams.yaml` with two teams** — An `openspec` team (5 agents: explore, propose, apply, verify, archive) and a `full` team (all 6 including worker). The `openspec` team is first and becomes the default
- **Dispatcher routing for non-OpenSpec tasks** — Updated system prompt with "Non-OpenSpec Tasks" routing section and "Worker Hand-off" guidance for recognizing when a worker task reveals complexity warranting OpenSpec workflow
- **Status signal detection extended** — `detectStatusSignal()` updated to recognize `done` and `blocked` from worker agent responses

## Capabilities

### New Capabilities
- `worker-agent`: General-purpose task execution agent with full tool access, no OpenSpec awareness, and simple status signals. Executes tasks directly without OpenSpec workflow constraints.

### Modified Capabilities
- `spec-teams-extension`: Agent routing extended for non-OpenSpec tasks, default team logic modified to respect `opt-in` frontmatter field, and teams.yaml with structured team definitions.
- `status-signal-highlighting`: Status signal detection expanded to recognize `done` and `blocked` signals from worker agent responses.

## Impact

- **`extensions/spec-teams.ts`**: Modified `parseAgentFile()` to parse `opt-in` field, `loadAgents()` default team logic to exclude opt-in agents, `detectStatusSignal()` regex to match `done` and `blocked`, and system prompt generation to include non-OpenSpec routing and worker hand-off guidance
- **`.pi/agents/worker.md`**: New file — agent definition for the worker
- **`.pi/agents/teams.yaml`**: New file — team definitions with `openspec` and `full` teams
- **No changes** to existing OpenSpec agents (explore, propose, apply, verify, archive)
- **No changes** to dashboard widget or Tool type registrations
