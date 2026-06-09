## ADDED Requirements

### Requirement: Agent model field controls dispatched model

The `dispatchAgent()` function SHALL use the agent definition's `model` field (parsed from Markdown frontmatter) to set the `--model` flag when spawning the child `pi` process. When `model` is present and truthy, it SHALL take precedence over the dispatcher's model (`ctx.model`). When absent or falsy, resolution SHALL fall through to `ctx.model` and then to the hardcoded fallback.

#### Scenario: Agent with model gets its own model
- **WHEN** a task is dispatched to an agent with `model: "openrouter/anthropic/claude-sonnet-4"`
- **THEN** the spawned `pi` process receives `--model openrouter/anthropic/claude-sonnet-4`

#### Scenario: Agent without model uses dispatcher model
- **WHEN** a task is dispatched to an agent whose definition has no `model` field
- **AND** the dispatcher has `ctx.model` set
- **THEN** the spawned `pi` process receives `--model` with the dispatcher's model

#### Scenario: Existing behavior preserved for agents without model field
- **WHEN** a task is dispatched to an agent whose definition has no `model` field
- **THEN** behavior is identical to before this change
- **AND** the change is non-breaking
