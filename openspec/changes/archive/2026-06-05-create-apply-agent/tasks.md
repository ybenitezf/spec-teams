## 1. Scaffold

- [x] 1.1 Create `agents/` directory at project root if it doesn't exist

## 2. Agent Definition

- [x] 2.1 Create `agents/apply.md` with YAML frontmatter: `name: apply`, description starting with "Applies", `tools: read,write,edit,bash,grep,find`, `thinking: on`
- [x] 2.2 Write Layer 1 (identity): establish agent as headless apply agent that never interacts with users
- [x] 2.3 Write Layer 2 (skill reference): reference `openspec-apply-change` skill by exact name
- [x] 2.4 Write Layer 3 (adaptation): map user-facing skill instructions (AskUserQuestion, pause/wait) to dispatcher-return equivalents
- [x] 2.5 Specify return format: structured summary with Status, Tasks Completed, and Summary sections

## 3. Verify

- [x] 3.1 Confirm file parses correctly with `parseAgentFile()` — returns valid AgentDef with all fields
- [x] 3.2 Confirm skill file exists at `.pi/skills/openspec-apply-change/SKILL.md` and is readable
