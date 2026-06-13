# Spec Teams 🧠 → 👥

> **A Pi coding agent extension that transforms a single AI agent into a multi-agent team orchestrator for the OpenSpec spec-driven development workflow.**
>
> *Built on [disler's agent-team.ts](https://github.com/disler/pi-vs-claude-code/blob/main/extensions/agent-team.ts) foundation.*

[![Pi Extension](https://img.shields.io/badge/Pi-Extension-6C47FF)](https://github.com/earendil-works/pi-coding-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

Spec Teams extends the [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) with a **multi-agent orchestration layer** purpose-built for the [OpenSpec](https://github.com/earendil-works/OpenSpec) spec-driven development (SDD) methodology.

Instead of one agent doing everything, Spec Teams registers a `dispatch_agent` tool that spawns and coordinates **specialist sub-agents** — each with its own session persistence, tool set, and focused system prompt. The result is a structured, disciplined development workflow where every phase of the OpenSpec lifecycle has a dedicated agent tuned for that job.

```
User Request → Dispatcher → Explore → Propose → Apply → Verify → Archive
                                ↕
                            Worker (git, files, scripts)
```

---

## How It Works

### 🧭 Intelligent Routing

The dispatcher agent understands the OpenSpec lifecycle and intelligently routes user requests to the right specialist. Stuck during exploration? It sends you to the Explore agent. Ready to implement? It routes to Apply. Need a final check? Verify takes it from there.

### 🧩 Specialist Sub-Agents

Each sub-agent runs as its own headless Pi process with:

- **Dedicated session persistence** — memory and context carry across invocations
- **Scoped tool access** — agents only get the tools they need
- **Specialized system prompts** — deep expertise in their phase of the workflow
- **Structured status signals** — `need-input`, `ready-to-propose`, `done`, `blocked`

### 📋 OpenSpec Convention

The team follows the OpenSpec change lifecycle rigorously:

1. **Change proposal** — `proposal.md`, `design.md`, `tasks.md`, and delta specs are generated as structured artifacts
2. **Implementation** — tasks are executed, code is written, files are edited
3. **Verification** — spec compliance is audited, scenarios are traced to code, tests are run
4. **Archival** — completed changes are finalized, delta specs synced, moved to `archive/`

### ⚙️ Configurable Teams

Team composition is defined in `teams.yaml`. Two teams ship by default:

- **`openspec`** — the core OpenSpec lifecycle agents
- **`full`** — includes the Worker agent for general-purpose tasks

Switch teams on the fly with the `/specs-team` command.

---

## The Specialist Agents

| Agent | Purpose |
|---|---|
| **Explore** | Investigates problems, explores the codebase, clarifies requirements through multi-turn conversation. High reasoning depth for open-ended analysis. |
| **Propose** | Creates structured OpenSpec change proposals — generates `proposal.md`, `design.md`, `tasks.md`, and delta specs from briefs. Balanced reasoning for structured creativity. |
| **Apply** | Implements tasks directly — writes code, edits files, runs CLI commands, and marks tasks complete. Low latency for fast iteration. |
| **Verify** | Read-only auditor that checks spec compliance, traces scenarios to code, runs tests, and reports findings without making changes. Medium reasoning for thorough analysis. |
| **Archive** | Finalizes completed changes — syncs delta specs, moves artifacts to `archive/`, and cleans up. Minimal reasoning for mechanical tasks. |
| **Worker** | General-purpose executor for git operations, file operations, scripts, and quick edits. The utility player of the team. |

---

## Key Design Patterns

### 🏗️ Headless Sub-Agent Architecture

Specialist agents are spawned as independent Pi processes with no TUI or user interaction. They communicate via structured **Status signals** (`done`, `blocked`, `need-input`, `ready-to-propose`), making the orchestration predictable and inspectable.

### 📡 Signal-Based Orchestration

The dispatcher and sub-agents coordinate through a lightweight signal protocol:
- **`need-input`** — agent requires more information before proceeding
- **`ready-to-propose`** — agent has produced artifacts for review
- **`done`** — task completed successfully
- **`blocked`** — unrecoverable issue encountered

### 🔄 OpenSpec Delta Pattern

Changes are structured as incremental, reviewable deltas. Each phase produces artifacts that feed naturally into the next, making the development process transparent and auditable.

### 🖥️ Real-Time Streaming

Sub-agent output streams live to the Pi terminal UI, so you can watch progress as it happens. The compact dashboard widget (`/specs-grid`) shows agent status at a glance.

### 💾 Session Persistence

Each sub-agent maintains its own Pi session across invocations, preserving context, conversation history, and working state. The dispatcher knows which agents have active sessions and can route follow-up requests accordingly.

---

## Agent System

### Dispatcher / Sub-Agent Architecture

Spec Teams uses a **dispatcher/sub-agent architecture** to orchestrate work:

- **Dispatcher agent** — The central coordinator that understands the OpenSpec lifecycle and routes user requests to the right specialist agent.
- **Sub-agents** — Each specialist (Explore, Propose, Apply, Verify, Archive, Worker) runs as an **independent headless Pi process**. They have no TUI or direct user interaction. The dispatcher spawns them, sends instructions, and receives structured status signals back.

This separation means each sub-agent maintains its own session, tools, and context independently. The dispatcher knows which agents have active sessions and can route follow-up requests to the same agent for continuity.

### Signal-Based Orchestration

The dispatcher and sub-agents coordinate through a lightweight signal protocol. Every sub-agent returns one of four status signals:

| Signal | Meaning |
|---|---|
| `done` | Task completed successfully |
| `blocked` | Unrecoverable issue encountered — cannot proceed without intervention |
| `need-input` | Agent requires more information from the user before proceeding |
| `ready-to-propose` | Agent has produced artifacts (proposal, design, specs) ready for review |

The dispatcher interprets these signals to decide what happens next: route to another agent, pause for user input, or report completion.

### Agent .md Files: Dual-Purpose Format

Each agent is defined by a single `.md` file that serves two purposes:

1. **YAML frontmatter** — Configuration metadata (name, description, tools, thinking level, model)
2. **Markdown body** — The system prompt that defines the agent's behavior and expertise

```markdown
---
name: explore
description: Investigates problems and clarifies requirements
tools: read, write, bash, grep
thinking: high
model: provider-id/some-model
---

You are the Explore agent in the spec-teams extension. Your role is to...
```

This format makes agents easy to read, edit, and share. The frontmatter is parsed by the extension at load time; the markdown body becomes the system prompt for that agent's Pi session.

---

## Creating Custom Agents

You can create your own specialist agents or use third-party agent definitions. Spec Teams follows Pi's standard agent definition convention.

### Agent Frontmatter Format

Each agent `.md` file uses YAML frontmatter with these fields:

| Field | Required | Description | Example |
|---|---|---|---|
| `name` | Yes | Agent identifier (used in teams.yaml) | `explore` |
| `description` | Yes | Short description of the agent's role | `Investigates problems and clarifies requirements` |
| `tools` | Yes | Comma-separated list of allowed tools | `read, write, bash, grep` |
| `thinking` | No | Reasoning depth: `low`, `medium`, `high` | `high` |
| `model` | No | Default model override | `anthropic/claude-sonnet-4` |
| `opt-in` | No | When `true`, agent is opt-in only — won't be included in default teams; must be explicitly added to `teams.yaml` | `true` |

The markdown body below the frontmatter is the agent's system prompt.

### Agent Discovery Priority Order

Pi loads agent definitions from these locations in priority order (first match wins):

1. **Project `agents/`** — Agents in the project root's `agents/` directory
2. **`.claude/agents/`** — Claude Code-style agent definitions
3. **`.pi/agents/`** — Pi-specific agent directory in the project
4. **`~/.pi/agent/agents/`** — User-level Pi agent directory
5. **`~/.agents/agents/`** — User-level global agents

To add a custom agent, place its `.md` file in any of these directories. Project-level agents take precedence over user-level ones.

### Team Configuration (`teams.yaml`)

After creating an agent, add it to a team in `agents/teams.yaml`:

```yaml
openspec:
  - explore
  - propose
  - apply
  - verify
  - archive
  - my-custom-agent    # Add your agent here

full:
  - explore
  - propose
  - apply
  - verify
  - archive
  - worker
  - my-custom-agent    # Or add it to the full team
```

Switch between teams using the `/specs-team` command in Pi.

### Model Overrides

The `model` field in agent frontmatter specifies a **default model**, not a requirement. Users should override this with their own provider and model ID. The models shipped in the example agents (e.g., `opencode-go/glm-5`) are specific to certain providers and may not be available to you.

To use a different model:

1. **Edit the agent .md file** — Change the `model` field directly
2. **Override per-session** — Some Pi configurations allow model overrides at runtime

If no `model` field is specified, the agent uses Pi's default model configuration.

### External Agent Compatibility

Spec Teams is compatible with agent definitions from other Pi extensions and projects that follow the same `.md` frontmatter convention:

- **[pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code)** — disler's repository contains various agent definitions that work with spec-teams
- **[Pi subagent examples](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent)** — Official Pi examples of sub-agent patterns

Any agent `.md` file following the Pi frontmatter format (YAML metadata + markdown body) can be used with spec-teams. Simply place the file in one of the discovery directories listed above and add it to your team.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | TypeScript / Node.js |
| **Agent SDK** | [Pi Coding Agent SDK](https://github.com/earendil-works/pi-coding-agent) |
| **Validation** | [TypeBox](https://github.com/sinclairzx81/typebox) |
| **Terminal UI** | [Pi TUI](https://github.com/earendil-works/pi-tui) |
| **Spec SDD** | [OpenSpec](https://github.com/earendil-works/OpenSpec) |
| **Agent Format** | Markdown + YAML frontmatter (`agents/*.md`) |

---

## Getting Started

### Prerequisites

- [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) installed globally
- Node.js 18+
- **[OpenSpec](https://github.com/earendil-works/OpenSpec)** — This is a **hard dependency**. Spec Teams agents rely on OpenSpec skill files located in `.pi/skills/openspec-*` and the `openspec` CLI command that drives the SDD lifecycle. Without OpenSpec installed, agents will hard-stop at startup.

  Install OpenSpec via one of these methods:
  ```bash
  # Option 1: Use the openspec CLI directly
  openspec init

  # Option 2: Via the Pi extension system (if available)
  ```

  The skills provide expert procedures for each phase of the OpenSpec lifecycle (explore, propose, apply, archive). They are required for the specialist agents to function correctly.

### Installation

```bash
# Clone the repository
git clone https://github.com/ybenitezf/spec-teams-extension.git
cd spec-teams-extension

# Load the extension with Pi
pi -e ./extensions/spec-teams.ts
```

The extension registers itself on load. Once active, you'll have access to the `dispatch_agent` tool and the `/specs-*` commands.

#### Using in an Existing Project

If you want to use spec-teams in another project without cloning this repo separately:

1. **Ensure OpenSpec is initialized** — Run `openspec init` in your project if it isn't already configured. This creates the `.pi/skills/` and `.pi/prompts/` directories that Spec Teams depends on.
2. **Copy or link the extension files** — You only need two things from this repository:
   - `extensions/` — The spec-teams extension entry point
   - `agents/` — Agent definitions and `teams.yaml` configuration
3. **Load the extension** — Point Pi at the extension file:
   ```bash
   pi -e ./path/to/spec-teams-extension/extensions/spec-teams.ts
   ```

Place the `agents/` directory (with agent `.md` files and `teams.yaml`) where you want it discovered:
- **Project-level** — Copy into your project root for project-specific agents
- **User-level** — Copy into your user agents directory (e.g., `~/.pi/agent/agents/`) for user-wide availability

---

## Configuration

### Teams (`teams.yaml`)

Define which agents are available in each team:

```yaml
openspec:
  - explore
  - propose
  - apply
  - verify
  - archive

full:
  - explore
  - propose
  - apply
  - verify
  - archive
  - worker
```

### Agent Definitions (`agents/*.md`)

Each agent is defined as a Markdown file with YAML frontmatter:

```markdown
---
name: my-agent
description: Does something useful
tools: read,write,bash
thinking: medium
model: provider-id/some-model
---

You are a specialist agent in the spec-teams extension…
```

### Skills (`.pi/skills/`)

OpenSpec lifecycle phases have corresponding skill files that provide expert procedures for each phase (explore, propose, apply, archive).

### Agent Discovery

Agent definitions are loaded from (in priority order):
1. `agents/`
2. `.claude/agents/`
3. `.pi/agents/`

User-level overrides can be placed in `~/.agents/agents/`.

---

## Commands

| Command | Description |
|---|---|
| `/specs-team` | Open the team selector to switch between configured teams |
| `/specs-list` | Display all loaded agents with their current status |
| `/specs-grid` | Configure the number of columns (1–6) in the dashboard widget |

---

## Project Structure

```
spec-teams-extension/
├── agents/                # Agent definitions (Markdown + YAML frontmatter)
│   ├── apply.md
│   ├── archive.md
│   ├── explore.md
│   ├── propose.md
│   ├── verify.md
│   └── worker.md
├── extensions/
│   └── spec-teams.ts      # Main extension entry point
├── .pi/
│   ├── prompts/           # OpenSpec lifecycle prompts
│   └── skills/            # OpenSpec skill procedures
├── package.json
└── README.md
```

---

## Acknowledgments

### OpenSpec

Spec Teams depends entirely on [OpenSpec](https://github.com/earendil-works/OpenSpec) for its spec-driven development methodology, skill system, and CLI. The `.pi/skills/openspec-*` skill files provide expert procedures for each phase of the lifecycle (explore, propose, apply, archive), and the `openspec` command drives the entire SDD workflow. Without OpenSpec, the specialist agents cannot function.

### disler / pi-vs-claude-code

**Spec Teams is based on and forked from** [disler](https://github.com/disler)'s [`agent-team.ts`](https://github.com/disler/pi-vs-claude-code/blob/main/extensions/agent-team.ts) extension from the [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) repository. That work pioneered the multi-agent team orchestration pattern that Spec Teams builds upon — demonstrating how a single Pi agent can be transformed into an orchestrator of specialist sub-agents. The `spec-teams.ts` implementation descends directly from disler's original design, extended with OpenSpec integration, signal-based orchestration, and session persistence.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) ecosystem. Powered by the [OpenSpec](https://github.com/earendil-works/OpenSpec) spec-driven development methodology.*
