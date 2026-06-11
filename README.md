# Spec Teams 🧠 → 👥

> **A Pi coding agent extension that transforms a single AI agent into a multi-agent team orchestrator for the OpenSpec spec-driven development workflow.**

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

### Installation

```bash
# Install the extension package
npm install spec-teams-extension

# Or use it directly with Pi
pi -e ./extensions/spec-teams.ts
```

The extension registers itself on load. Once active, you'll have access to the `dispatch_agent` tool and the `/specs-*` commands.

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

Spec Teams builds on and extends the multi-agent team concept pioneered by [disler](https://github.com/disler) in the [`agent-team.ts`](https://github.com/disler/pi-vs-claude-code/blob/main/extensions/agent-team.ts) extension from the [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) repository. That work demonstrated how a single Pi agent could be transformed into an orchestrator of specialist sub-agents, and served as the foundation for the `spec-teams.ts` implementation. We're grateful for the inspiration and the open sharing of that design.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) ecosystem. Inspired by the OpenSpec spec-driven development methodology.*
