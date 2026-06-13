## Context

The spec-teams-extension repository is a Pi coding agent extension that adds multi-agent orchestration for OpenSpec spec-driven development. It's at v0.1.0 and ready for public release, but has several documentation gaps that would block or confuse new users:

- **Broken installation path**: README says `npm install spec-teams-extension` but the package isn't published. Real installation is via `pi -e ./extensions/spec-teams.ts` or cloning and using locally.
- **Missing legal file**: No LICENSE file despite package.json declaring MIT.
- **Missing community files**: No CONTRIBUTING.md, no CHANGELOG.md.
- **Undocumented patterns**: The "include agents" system (YAML frontmatter .md files) is central to how the extension works but has no user-facing documentation. Agent model references are user-specific. The dispatcher/sub-agent architecture and signal protocol aren't explained beyond surface level.
- **Configuration bugs**: `teams.yaml` has two identical team definitions (both include worker). The `.pi/agents` symlink uses an absolute path that breaks for other users.
- **OpenSpec prerequisite**: Agents hard-stop at startup if OpenSpec skills aren't available. README mentions OpenSpec but doesn't explain the dependency or how to set it up.

The project has no build step — it runs as raw TypeScript via Pi's native TS support. Peer dependencies are provided at runtime by Pi.

## Goals / Non-Goals

**Goals:**
- Make the repository immediately usable by a new Pi user who clones it
- Fix all blockers that would confuse or mislead public users (broken install, missing LICENSE, broken symlink, identical teams)
- Document the agent definition format, discovery system, and customization surface so users can create their own agents or use third-party ones
- Credit OpenSpec and related projects (disler/pi-vs-claude-code, Pi subagent examples)
- Credit disler for the foundational `agent-team.ts` work that spec-teams is based on
- Establish v0.1.0 changelog baseline

**Non-Goals:**
- Publish to npm (no build/publish pipeline)
- Create a docs/ website or separate documentation site
- Set up CI/CD or GitHub Actions
- Refactor any TypeScript source code
- Change the agent dispatch/orchestration protocol
- Create agent API documentation from source code

## Decisions

### D1: README structure — Add sections vs. separate docs/

**Decision**: Add all documentation directly to README.md rather than creating a docs/ directory.

**Rationale**: At v0.1.0 with a single extension file, a separate docs/ directory is over-engineering. GitHub renders README.md immediately. Users find it faster. When the project grows, sections can be extracted. The exploration confirmed this as the recommended approach (Alternative B: minimal public-readiness).

### D2: Installation instructions — Local clone only

**Decision**: Replace `npm install spec-teams-extension` with instructions to clone the repo and run `pi -e ./extensions/spec-teams.ts`.

**Rationale**: The package isn't on npm and won't be. Pi extensions typically run from source. The `pi -e` flag is the canonical way to load local extensions. Documenting a fake npm install path is worse than documenting what actually works.

### D3: Agent model documentation — Defaults, not requirements

**Decision**: Document that models specified in agent .md frontmatter are overridable defaults. Show the `model` field as optional and explain how to override it per-agent or per-session.

**Rationale**: The current agent files reference specific models (e.g., `opencode-go/glm-5`) that are user-specific and provider-dependent. New users would be confused. Making it clear these are defaults (not requirements) unblocks users who don't have access to those providers.

### D4: .pi/agents symlink — Remove it

**Decision**: Delete the `.pi/agents` absolute-path symlink entirely. Pi already discovers `agents/` in the project root via its agent discovery priority order.

**Rationale**: The symlink points to `/home/yoel/src/ybenitezf/spec-teams-extension/agents` — an absolute path that breaks for anyone else. Pi's built-in search order (project `agents/` → `.claude/agents/` → `.pi/agents/`) already finds the project's `agents/` directory first. The symlink is redundant and harmful.

### D5: teams.yaml — Differentiate openspec and full teams

**Decision**: Remove `worker` from the `openspec` team. Keep it only in `full`.

**Rationale**: The README already documents the intended difference: "openspec — the core OpenSpec lifecycle agents" vs "full — includes the Worker agent for general-purpose tasks." The current teams.yaml has both including worker, which contradicts the README and the intuitive meaning of the team names.

### D6: External agent references — Document compatibility

**Decision**: Add a section in "Creating Custom Agents" that explicitly links to pi-vs-claude-code and Pi's subagent example, explaining that both patterns work with spec-teams.

**Rationale**: The user specifically requested this. It helps new users find pre-built agents and understand that the spec-teams pattern is interoperable with other Pi agent definitions.

### D7: OpenSpec credit — Acknowledge in dedicated section

**Decision**: Add a brief credit to OpenSpec for the skill and CLI that spec-teams depends on, beyond the existing acknowledgments section.

**Rationale**: The entire extension is built on top of OpenSpec's spec-driven development methodology and its skills system. Without OpenSpec installed, the agents hard-stop. This dependency deserves explicit acknowledgment.

### D8: disler credit — Foundational work acknowledgment

**Decision**: Add a prominent credit to **disler** (https://github.com/disler) for the original `agent-team.ts` extension from the [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) repository. This credit must appear in a dedicated Acknowledgements section in the README, explicitly stating that spec-teams is based on/forked from disler's agent-team.ts work, and include a link to disler's GitHub profile.

**Rationale**: The existing README has a brief Acknowledgments paragraph mentioning disler's work, but it's easy to miss and doesn't clearly state that spec-teams is *based on* that work — it reads more like inspiration. The relationship is stronger: the spec-teams extension code descends directly from disler's `agent-team.ts`. This deserves a more prominent and explicit credit that leaves no ambiguity about the lineage. A clear credit also strengthens the open-source ecosystem by giving proper attribution to foundational work.

### D9: .gitignore additions — Internal artifacts

**Decision**: Add `openspec-research.md` and `openspec/archive/` conversation logs to .gitignore. Do NOT exclude the `openspec/` directory itself (it's how OpenSpec works and contains specs).

**Rationale**: `openspec-research.md` is an internal AI-generated research document. OpenSpec's archive directory contains conversation logs that are project-specific artifacts. The specs themselves should stay tracked as they're part of the project's artifact structure.

## Risks / Trade-offs

- **[README length]** → Adding 3 major sections will make README longer. **Mitigation**: Keep each section concise with code examples. Link to agent .md files for full detail rather than duplicating content. At v0.1.0 this is acceptable; can extract to docs/ later.
- **[teams.yaml breaking change]** → Removing worker from the openspec team changes behavior for anyone currently using it. **Mitigation**: The project is pre-v1.0 and not yet public; this is the right time. Add a note in CHANGELOG.
- **[Model references in agent .md files]** → The current models (opencode-go/glm-5, etc.) are specific to a provider. **Mitigation**: Document them as defaults and add a comment/note in README about overriding. Don't remove them from .md files (they're functional defaults for the original developer).
- **[Credit visibility]** → The disler credit could get buried if only in an Acknowledgements section at the end. **Mitigation**: Also reference the lineage in the README overview or How It Works section so users encounter it early, while keeping the full credit in Acknowledgements.
- **[No interactive examples]** → README won't include animated demos or screenshots of the running extension. **Mitigation**: Use ASCII diagrams and CLI output examples. Can add screenshots later.