# Contributing to spec-teams-extension

Thank you for your interest in contributing! This guide covers development setup, testing conventions, and how to work with the agent system.

## Development Setup

### Prerequisites

- [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) installed globally
- Node.js 20+ (22 recommended; the Pi SDK requires Node >=20.6.0)
- [OpenSpec](https://github.com/earendil-works/OpenSpec) — required for the skill files that agents depend on

### Clone & Install

```bash
git clone https://github.com/ybenitezf/spec-teams-extension.git
cd spec-teams-extension

# Install test dependencies only (no build step needed)
npm install
```

This project has no build step — it runs as raw TypeScript via Pi's native TS support. The `npm install` command installs dev dependencies (Vitest for testing).

### Running Tests

```bash
npm test          # Run tests once
npm run test:watch  # Watch mode
```

### Loading the Extension

```bash
pi -e ./extensions/spec-teams.ts
```

## Agent Conventions

Agents are defined as Markdown files with YAML frontmatter in the `agents/` directory. Each `.md` file serves a dual purpose:

1. **YAML frontmatter** — Configuration (name, description, tools, thinking level, model)
2. **Markdown body** — System prompt for the agent

Example:

```markdown
---
name: my-agent
description: A specialist agent for X
tools: read, write, bash
thinking: medium
model: provider-id/some-model
---

You are a specialist agent focused on...
```

### Available Frontmatter Fields

| Field | Description | Example |
|---|---|---|
| `name` | Agent identifier (used in teams.yaml, discovered across multiple directories) | `explore` |
| `description` | Short description of the agent's role | `Investigates problems and clarifies requirements` |
| `tools` | Comma-separated list of allowed tools | `read, write, bash, grep` |
| `thinking` | Reasoning depth: `low`, `medium`, `high` | `high` |
| `model` | Default model override (optional) | `anthropic/claude-sonnet-4` |

See the [Creating Custom Agents](README.md#creating-custom-agents) section in the README for full details.

## Pull Request Guidelines

### Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(scope): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(agents): add worker agent definition`
- `fix(readme): correct installation instructions`
- `docs: update contributing guidelines`

### Before Submitting

1. Ensure all tests pass (`npm test`)
2. Follow existing code style and conventions
3. Update documentation if your change affects user-facing behavior
4. Write clear commit messages following conventional commits

## Project Structure

- `extensions/spec-teams.ts` — Main extension entry point
- `agents/*.md` — Agent definitions (frontmatter + system prompt)
- `agents/teams.yaml` — Team composition configuration (discovered across multiple directories, see README)
- `.pi/skills/` — OpenSpec skill procedures
- `.pi/prompts/` — OpenSpec lifecycle prompts

## Questions?

Open an issue or discussion on GitHub. Happy coding! 🚀
