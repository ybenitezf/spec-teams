## Why

The spec-teams-extension repository is ready for public release but lacks essential documentation and legal artifacts. The existing README contains a broken `npm install` instruction that won't work (package is unpublished), barely explains OpenSpec as a hard prerequisite, and doesn't document the agent definition pattern that's central to how the extension works. Critical public-release files are missing: no LICENSE file (package.json declares MIT but no file exists), no CONTRIBUTING.md, and no CHANGELOG.md. Agent model references are user-specific and would confuse new users, the `.pi/agents` symlink uses an absolute path that breaks for anyone else, and `teams.yaml` has two identical team definitions that should reflect their intended differentiation.

## What Changes

- **Add LICENSE file (MIT)** — package.json declares MIT but the file is missing
- **Add CONTRIBUTING.md** — Dev setup, testing, agent conventions, PR guidelines
- **Add CHANGELOG.md** — Start at v0.1.0
- **Rewrite README "Getting Started" section** — Fix broken `npm install` reference; document correct installation via `pi -e` or symlinking; clearly document OpenSpec as a prerequisite with setup steps
- **Add "Creating Custom Agents" section to README** — Document the .md frontmatter format, available fields (name, description, tools, thinking, model, opt-in), discovery priority order, teams.yaml configuration, and note compatibility with external agent definitions like [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) and Pi's [subagent examples](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent)
- **Add "Agent System" deep-dive section to README** — Explain dispatcher/sub-agent architecture, signal-based orchestration protocol, session persistence, and how agent .md files work as both config and system prompts
- **Update .gitignore** — Add `openspec-research.md` and other internal artifacts
- **Fix .pi/agents symlink** — Remove absolute-path symlink; Pi already discovers `agents/` in the project root,
  making it redundant
- **Document agent model defaults** — Note in README that models in agent .md files are overridable defaults, not requirements
- **Fix teams.yaml** — Differentiate "openspec" team (without worker) from "full" team (with worker) per their intended design

## Capabilities

### New Capabilities

- `public-readiness`: LICENSE, CONTRIBUTING.md, CHANGELOG.md, .gitignore updates, and the .pi/agents symlink fix — the legal and structural artifacts needed for public release
- `readme-overhaul`: Rewritten Getting Started section, new Agent System section, new Creating Custom Agents section, and model defaults documentation
- `teams-yaml-fix`: Differentiate the openspec and full teams in teams.yaml to reflect their intended composition

### Modified Capabilities

*None — this change is purely additive documentation and configuration*

## Impact

- **README.md** — Major content additions (3 new sections, rewritten Getting Started)
- **LICENSE** — New file (MIT)
- **CONTRIBUTING.md** — New file
- **CHANGELOG.md** — New file
- **.gitignore** — Additions
- **agents/teams.yaml** — Fix team definitions
- **.pi/agents** — Symlink removed (redundant with Pi's built-in discovery)
- **No code changes** — No TypeScript modifications, no API changes, no breaking changes