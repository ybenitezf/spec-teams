## 1. Public Readiness — Legal & Structural Files

- [x] 1.1 Create LICENSE file with MIT license text (copyright: "spec-teams-extension contributors", year: 2025)
- [x] 1.2 Create CONTRIBUTING.md with dev setup (clone, npm install for test deps only, npm test), agent conventions (.md frontmatter format), PR guidelines, and conventional commit requirement
- [x] 1.3 Create CHANGELOG.md starting at v0.1.0 with initial public release summary
- [x] 1.4 Update .gitignore to add `openspec-research.md` entry
- [x] 1.5 Remove the `.pi/agents` absolute-path symlink (it points to `/home/yoel/src/ybenitezf/spec-teams-extension/agents` and breaks for other users; Pi already discovers `agents/` in project root)
- [x] 1.6 Fix `agents/teams.yaml` — remove `worker` from the `openspec` team so only the `full` team includes it (openspec: explore, propose, apply, verify, archive; full: all five + worker)

## 2. README — Getting Started Rewrite

- [x] 2.1 Replace the broken `npm install spec-teams-extension` instruction with correct installation via `git clone` + `pi -e ./extensions/spec-teams.ts`
- [x] 2.2 Add a "Using in an existing project" subsection documenting symlinking or pointing Pi to the extension
- [x] 2.3 Expand the "Prerequisites" section to clearly document OpenSpec as a hard dependency: explain what it provides (.pi/skills/openspec-* skill files), that agents hard-stop without it, and how to install it (`openspec init` or via Pi extension system)

## 3. README — Agent System Deep-Dive

- [x] 3.1 Add "Agent System" section explaining the dispatcher/sub-agent architecture (dispatcher routes to specialist, each sub-agent is an independent headless Pi process)
- [x] 3.2 Document signal-based orchestration: the four status signals (done, blocked, need-input, ready-to-propose) and how the dispatcher uses them
- [x] 3.3 Explain how agent .md files work as dual-purpose files: YAML frontmatter for configuration + markdown body for system prompt

## 4. README — Creating Custom Agents

- [x] 4.1 Add "Creating Custom Agents" section documenting the .md frontmatter format with all available fields (name, description, tools, thinking, model)
- [x] 4.2 Document agent discovery priority order: project `agents/` → `.claude/agents/` → `.pi/agents/` → `~/.agents/agents/`; explain how to place agents at each level
- [x] 4.3 Document teams.yaml configuration: how to add agents to teams and select active team via `/specs-team`
- [x] 4.4 Add subsection on model overrides: explain that the `model` field in agent .md files is a default that users should override with their own provider and model ID; note the specific models in the shipped agents are examples
- [x] 4.5 Add subsection on external agent compatibility: link to pi-vs-claude-code (https://github.com/disler/pi-vs-claude-code) and Pi subagent examples (https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent); explain that agent definitions following Pi's .md frontmatter convention work with spec-teams

## 5. README — Acknowledgments & Credit

- [x] 5.1 Add explicit credit to OpenSpec for the skill system and CLI that spec-teams depends on (the skill files in .pi/skills/ and the `openspec` command that drives the SDD lifecycle)
- [x] 5.2 Add prominent credit to **disler** (https://github.com/disler) in the Acknowledgements section, explicitly stating that spec-teams is based on/forked from disler's `agent-team.ts` extension from https://github.com/disler/pi-vs-claude-code — make the lineage unambiguous
- [x] 5.3 Add a brief lineage reference in the README overview or How It Works section (e.g., "Built on disler's agent-team.ts foundation") so users encounter the credit early, with a pointer to the full Acknowledgements section for details
- [x] 5.4 Verify existing disler/pi-vs-claude-code acknowledgment is accurate and complete, updating it to strengthen the attribution from "inspired by" to "based on"