## 1. Create explore agent definition

- [x] 1.1 Write `agents/explore.md` with YAML frontmatter (`name: explore`, `description`, `tools: read,write,bash,grep,find`, `thinking: on`) and system prompt body
- [x] 1.2 System prompt embeds the explore stance (curious, visual, adaptive, patient, grounded) from `openspec-explore` skill
- [x] 1.3 System prompt includes headless adaptation: maps "ask the user" → return `need-input` with question
- [x] 1.4 System prompt defines structured return signals: `need-input`, `ready-to-propose`, `done-exploring`, `blocked`
- [x] 1.5 System prompt includes self-managed session lifecycle instructions (detect topic mismatch, delete session on completion)
- [x] 1.6 System prompt defines findings file output: write to `.pi/spec-sessions/explore-<name>.md` on `ready-to-propose`
- [x] 1.7 System prompt constrains `write` tool to findings files only — no OpenSpec artifact creation

## 2. Update dispatcher system prompt

- [x] 2.1 Update `before_agent_start` system prompt in `extensions/spec-teams.ts` to add explore relay protocol
- [x] 2.2 Add instructions: explore is multi-turn — relay explore responses to user, relay user responses back via continued dispatches
- [x] 2.3 Add signal detection: `need-input` → relay and wait; `ready-to-propose` → extract brief and dispatch propose; `done-exploring` → present summary and stop
- [x] 2.4 Update the "Routing" section to describe explore as the relay-based conversation phase (replace or augment current explore description)
- [x] 2.5 Update the "Working with Agents" section with explore multi-turn flow examples

## 3. Update propose agent to consume findings

- [x] 3.1 Update `agents/propose.md` system prompt to add findings consumption instructions
- [x] 3.2 Before creating artifacts, check for `.pi/spec-sessions/explore-<change-name>.md`
- [x] 3.3 If findings file exists: read it, use context to inform artifacts, delete file after reading
- [x] 3.4 If findings file absent: proceed with structured brief only (no error)

## 4. Verify and validate

- [x] 4.1 Verify `agents/explore.md` parses correctly with `parseAgentFile()` (frontmatter, tools, thinking)
- [x] 4.2 Verify the dispatcher prompt includes explore relay instructions without breaking existing routing
- [x] 4.3 Verify propose agent finds and consumes a test findings file
- [x] 4.4 Verify explore agent's `write` tool is present but constrained by system prompt
- [x] 4.5 Run existing agent specs to confirm no regressions in apply, verify, archive, propose behavior
