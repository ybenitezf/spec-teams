## 1. Propose Agent Definition

- [x] 1.1 Create `agents/propose.md` with YAML frontmatter (`name: propose`, tools, `thinking: on`) and system prompt following the `openspec-propose` skill with headless adaptations (no AskUserQuestion, returns `need-input`/`blocked`/`done` status), structured task input expectations (change name, problem, approach, scope, constraints)

## 2. Archive Agent Definition

- [x] 2.1 Create `agents/archive.md` with YAML frontmatter (`name: archive`, tools: `read,write,bash`, `thinking: on`) and system prompt following the `openspec-archive-change` skill with headless adaptations (always syncs, blocks on incomplete artifacts/tasks, receives change name from dispatcher, returns `done`/`blocked` status)

## 3. Dispatcher Prompt Update

- [x] 3.1 Update `extensions/spec-teams.ts` `before_agent_start` handler: add propose transition guidance to the "Working with Agents" section (explored decisions → dispatch propose with structured brief), add archive gating guidance (clean verify → ask user → dispatch archive), add propose activity description noting propose agents expect a clear brief
- [x] 3.2 Ensure archive is never dispatched without user approval per the system prompt rules (the prompt must prevent the dispatcher from auto-archiving)

## 4. Validation

- [x] 4.1 Run `openspec validate add-propose-archive-agents` and verify all artifacts pass
- [x] 4.2 Verify agent loader picks up both new agents by checking `/specs-list` output (or manual inspection)
