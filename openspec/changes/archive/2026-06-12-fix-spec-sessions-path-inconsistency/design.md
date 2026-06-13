## Context

The `fix-subagent-response-handling` change migrated session storage from `.pi/spec-sessions/` inside the project repo to `~/.pi/spec-teams/<encoded-cwd>/` outside it. The extension code (`spec-teams.ts`) correctly uses the new path for session persistence via the `--session` CLI flag. However, two locations still reference the old in-repo path:

1. **`agents/explore.md`** — instructs the explore agent to manage and delete `.pi/spec-sessions/explore.json` for session persistence. This is now a ghost reference: sessions are handled by Pi's `--session` flag, and the file doesn't exist at that path.
2. **`agents/explore.md` and `agents/propose.md`** — use `.pi/spec-sessions/explore-<name>.md` for findings handoff. These files are genuinely written inside the repo, contradicting the `spec-teams-extension` spec's requirement that "no session files are created inside `.pi/spec-sessions/`".

The `encodeCwd()` utility in `spec-teams-utils.ts` and the session directory resolution in `spec-teams.ts` (line ~183) already compute `~/.pi/spec-teams/<encoded-cwd>/` correctly. The fix is about updating agent prompts and specs to align with the already-migrated storage location.

## Goals / Non-Goals

**Goals:**
- Remove all ghost references to `.pi/spec-sessions/explore.json` from the explore agent prompt and spec
- Move explore→propose findings handoff to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`
- Resolve the spec contradiction: `spec-teams-extension` spec says "no session files inside `.pi/spec-sessions/`" but explore-agent and propose-agent specs direct agents to write there
- Ensure both agent prompts and specs agree on the findings file path

**Non-Goals:**
- Modifying `.gitignore` (explicitly excluded by user)
- Changing `encodeCwd()` or the session directory resolution logic
- Modifying the worker, apply, verify, or archive agents
- Changing how Pi's `--session` flag works
- Adding new runtime features to the extension code (the extension already resolves the path correctly)

## Decisions

### Decision 1: Remove session lifecycle management from explore agent entirely

**Choice**: Remove the "Self-Managed Session Lifecycle" section and all `.pi/spec-sessions/explore.json` references from the explore agent prompt, rather than updating them to the new path.

**Rationale**: Session continuity across dispatches is already handled by the spec-teams extension via Pi's `--session` and `-c` flags. The explore agent has no business managing or deleting session files — it doesn't even have direct access to the session directory outside the repo. Removing the instructions entirely is cleaner than updating them to a path the agent can't manage via the `write` tool anyway.

**Alternative considered**: Update the explore agent to reference `~/.pi/spec-teams/<encoded-cwd>/explore.json` instead. Rejected because (a) the agent can't use `rm` on absolute paths in its constrained environment, and (b) the extension already handles session management — telling the agent to do it is redundant and error-prone.

### Decision 2: Findings file uses the same directory as session storage

**Choice**: Findings files go to `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md`, reusing the same directory the extension already computes for sessions.

**Rationale**: The extension already knows how to resolve `~/.pi/spec-teams/<encoded-cwd>/` (see `spec-teams.ts` line 183). The `write` tool in agent contexts resolves relative paths against the project CWD, so absolute paths work directly. Using the same base path as sessions keeps all runtime artifacts in one place and is consistent with the migration.

**Alternative considered**: Use a dedicated findings subdirectory like `~/.pi/spec-teams/<encoded-cwd>/findings/`. Rejected as unnecessary nesting — findings files are transient handoff artifacts, not a category that warrants its own directory. They're deleted after consumption by the propose agent.

### Decision 3: Agent prompts use the absolute path directly

**Choice**: Both agent prompts (`explore.md` and `propose.md`) will reference `~/.pi/spec-teams/<encoded-cwd>/explore-<name>.md` directly, with a note that `<encoded-cwd>` is the `encodeCwd(cwd)` representation of the project's absolute working directory.

**Rationale**: The `write` and `read` tools available to sub-agents can handle absolute paths. The `bash` tool can also handle `rm` with absolute paths. There's no need for variable injection from the extension — the path is deterministic and can be described declaratively in the prompt.

**Alternative considered**: Have the extension inject the findings path as a variable into the task string. This would work but adds complexity to the dispatch logic for no clear benefit over a well-documented path convention. If the encoding scheme changes, the prompts would need updating either way.

## Risks / Trade-offs

- **[Path encoding opacity]** → The `encodeCwd()` scheme transforms paths (e.g., `/home/user/projects/my-app` → `--home-user-projects-my-app--`). Agents need to know this encoding to locate the findings file. Mitigation: The propose agent checks for the findings file using `bash: ls` with the exact path, and the extension computes this path — the agent just needs to know the path pattern, not compute it. In practice, the explore agent will construct the path from `cwd` knowledge (it can see the working directory), and the propose agent is dispatched with the same cwd.

- **[Absolute path in prompt]** → Prompt instructions reference absolute paths which are environment-specific. However, the `~` prefix is universally understood and resolves correctly in shell contexts. If an agent's `bash` tool doesn't expand `~`, the fallback is `$HOME/.pi/spec-teams/`. Mitigation: Use `$HOME` explicitly in bash commands within the prompt instructions.

- **[Findings path discoverability]** → If the encoding scheme changes, prompts and specs need updating. This is already true for session storage. Mitigation: This is a low-frequency change; the encoding is simple and stable.

- **[Non-breaking change]** → The current in-repo findings path is only used by the explore→propose handoff, which is internal to the spec-teams system. Moving it to the out-of-repo location doesn't break any external consumers. The old path is never committed (it's in `.pi/spec-sessions/` which is gitignored).