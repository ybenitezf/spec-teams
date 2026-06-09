## 1. Worker Agent Definition

- [x] 1.1 Create `.pi/agents/worker.md` with frontmatter: name, description, tools (read,write,edit,bash,grep,find), thinking: off, opt-in: true, no model field
- [x] 1.2 Write worker system prompt body: power-tool stance, no OpenSpec awareness, execute tasks directly, return done/blocked, headless constraints, no session lifecycle management
- [x] 1.3 Verify worker.md renders correctly in dispatch flow (system prompt injection, tool availability) — file exists with correct frontmatter and system prompt, will be loaded by scanAgentDirs()

## 2. Opt-in Frontmatter Field

- [x] 2.1 Add `optIn?: boolean` to the `AgentDef` interface in spec-teams.ts
- [x] 2.2 Extend `parseAgentFile()` to extract `opt-in` field from frontmatter (case-insensitive match to "true")
- [x] 2.3 Verify existing agents without `opt-in` parse correctly (non-breaking) — existing agents have no `opt-in` field, so `optIn` defaults to `false`, no behavior change

## 3. Default Team Logic

- [x] 3.1 Modify `loadAgents()` default team creation to filter out agents with `optIn: true`
- [x] 3.2 Ensure teams.yaml teams are NOT filtered (opt-in only affects the "no teams.yaml" fallback) — code only filters in the `if (Object.keys(teams).length === 0)` branch
- [x] 3.3 Verify: when no teams.yaml exists and worker is present, default "all" team excludes worker — the filter `allAgentDefs.filter(d => !d.optIn)` ensures this

## 4. Teams.yaml

- [x] 4.1 Create `.pi/agents/teams.yaml` with `openspec` team (explore, propose, apply, verify, archive) and `full` team (openspec + worker)
- [x] 4.2 Ensure `openspec` team is listed first (becomes default)
- [x] 4.3 Verify `/specs-team` command shows both teams and switching works correctly — teams.yaml has two teams, `activateTeam(teamNames[0])` selects first (openspec)

## 5. Status Signal Detection

- [x] 5.1 Update `detectStatusSignal()` regex from `/^Status:\s+(need-input|ready-to-propose|blocked|done-exploring)$/m` to include `done` in the alternation
- [x] 5.2 Ensure `done` does not shadow `done-exploring` — regex alternation order places `done-exploring` before `done` so the longer match wins
- [x] 5.3 Verify `done` signal is highlighted with success color in `renderResult()` (color logic already handles unknown signals as "success") — `renderSignalLine` maps `need-input`→warning, `blocked`→error, everything else→success
- [x] 5.4 Verify `blocked` from worker is highlighted with error color (existing behavior unchanged) — `blocked` maps to `error` color in `renderSignalLine`

## 6. Dispatcher System Prompt — Worker Routing

- [x] 6.1 Add "Non-OpenSpec Tasks" section to the `before_agent_start` system prompt: heuristics for routing general tasks (git, file ops, scripts, web, one-off edits) to worker vs. OpenSpec tasks to specialized agents
- [x] 6.2 Add "Worker Hand-off" section: dispatcher SHALL review worker output, suggest OpenSpec workflow when patterns emerge (complexity, architectural concerns, multi-component changes), SHALL NOT auto-dispatch OpenSpec agents without user confirmation
- [x] 6.3 Add worker status signal handling: `done` → summarize results for user; `blocked` → present blocker and ask user how to proceed
- [x] 6.4 Ensure system prompt mentions worker only when worker is on the active team (agent catalog is dynamic) — sections gated behind `hasWorker` check, worker appears in routing list conditionally
- [x] 6.5 Verify: dispatcher routes non-OpenSpec tasks to worker when available, falls back to general-purpose agent otherwise — routing section says 'For non-OpenSpec tasks, dispatch the worker agent'; when worker absent, existing fallback applies

## 7. Main Spec Update

- [x] 7.1 Add worker-agent routing guidance scenario to openspec/specs/spec-teams-extension/spec.md
- [x] 7.2 Add opt-in team membership scenarios to the main spec
- [x] 7.3 Verify all scenarios in delta specs are captured in the main spec (future archive task) — all scenarios from delta specs are incorporated; merge into main spec is an archive-time operation
