# spec-teams — Agent Definitions

## Overview

spec-teams defines sub-agents as Markdown files with **YAML frontmatter**. Each
file declares an agent's identity, capabilities, and behavior. The frontmatter
holds structured metadata (name, tools, thinking level, model), and the Markdown
body becomes the agent's system prompt.

## File Locations

Agents are loaded from these directories, scanned in order:

1. `agents/`
2. `.claude/agents/`
3. `.pi/agents/`

Place shared project agents in `agents/`. Place IDE-specific overrides in
`.claude/agents/` or `.pi/agents/`.

## File Structure

```markdown
---
name: my-agent
description: Does something useful
tools: read,write,bash
thinking: medium
model: provider-id/some-model
---

You are a my-agent in the spec-teams extension. You are a headless sub-agent…

Your job is to do the thing. You do NOT design, propose, or archive. You IMPLEMENT.
```

Everything before the closing `---` is YAML frontmatter. Everything after it is
the system prompt body, passed verbatim to the LLM when the agent is dispatched.

## Field Reference

| Field | Required | Type | Default | Description |
|---|---|---|---|---|
| `name` | **Yes** | string | — | Agent identifier used for dispatch routing. Must be unique across all loaded agent files. |
| `description` | No | string | `""` | Short description shown in the agent catalog / listing. |
| `tools` | No | comma-separated string | `read,grep,find,ls` | Tool allowlist. Passed as `--tools` when spawning the agent process. |
| `thinking` | No | string | `off` | Reasoning effort level. See [Thinking Levels](#thinking-levels) below. Legacy values: `on` maps to `medium`, `off` maps to `off`. |
| `model` | No | string | *(dispatcher default)* | Model override in `provider/model-id` format (e.g., `opencode-go/glm-5`). |
| *(body)* | No¹ | string | — | Everything after the closing `---` becomes the system prompt. |

¹ The body is technically optional but an agent without a system prompt is
rarely useful. In practice all agents include one.

## Thinking Levels

The `thinking` field controls how much reasoning effort the model applies before
responding. Higher levels produce more thorough (but slower and costlier)
responses.

| Level | Effort | Best For |
|---|---|---|
| `off` | No extended thinking | Agents that don't benefit from chain-of-thought. |
| `minimal` | Bare minimum | Trivial routing or formatting agents. |
| `low` | Light reasoning | Mechanical, straightforward tasks (e.g., archive). |
| `medium` | Balanced reasoning | General-purpose tasks (e.g., propose, verify). |
| `high` | Deep reasoning | Complex analysis or open-ended exploration (e.g., explore). |
| `xhigh` | Maximum reasoning | Extremely hard problems requiring exhaustive analysis. |

### Legacy Mapping

Older agent definitions may use boolean-like values:

- `on` → maps to `medium`
- `off` → maps to `off`

New definitions should use the level names listed above.

## Deduplication

If multiple files define the same `name`, only the **first one found** wins.
Directories are scanned in order: `agents/` → `.claude/agents/` → `.pi/agents/`.

This lets you override a shared agent with an IDE-specific variant by placing a
file with the same `name` in a higher-priority directory.

## Built-in Agents

These agents ship with spec-teams:

| Agent | File | Thinking | Model | Purpose |
|---|---|---|---|---|
| `apply` | `agents/apply.md` | `low` | `deepseek-v4-flash` | Implements tasks — writes code, edits files, marks tasks complete. |
| `archive` | `agents/archive.md` | `low` | `deepseek-v4-flash` | Finalizes completed changes — syncs specs, moves to archive/. |
| `explore` | `agents/explore.md` | `high` | `glm-5` | Investigates problems, explores the codebase, clarifies requirements. |
| `propose` | `agents/propose.md` | `medium` | *(default)* | Creates OpenSpec change proposals with design, specs, and tasks. |
| `verify` | `agents/verify.md` | `medium` | `minimax-m3` | Audits spec compliance, traces scenarios to code, runs tests. |
