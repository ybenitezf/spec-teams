## 1. Create agent file with frontmatter

- [x] 1.1 Create `agents/apply-web-dev.md` with YAML frontmatter: name `apply-web-dev`, description starting with "Applies" and mentioning web development and browser automation, tools `read,write,edit,bash,grep,find`, model `opencode-go/kimi-k2.6`, thinking `on`
- [x] 1.2 Verify frontmatter is valid YAML and parseable by `parseAgentFile()` — tested via `pi` tool which loaded and displayed the agent file correctly

## 2. Write headless constraint and role identity block

- [x] 2.1 Add identity section ("You are an apply-web-dev agent in the spec-teams extension...") following the consistent pattern from `apply.md`
- [x] 2.2 Add headless constraint block stating: no AskUserQuestion, no user interaction tools, never waits for user input, returns structured status on ambiguity
- [x] 2.3 Add role boundary ("Your job is to implement web-dev tasks... You IMPLEMENT."), distinguishing from explore, propose, verify, archive

## 3. Add dual-skill guard

- [x] 3.1 Write missing-skill guard block that attempts to read both `openspec-apply-change` and `chrome-devtools-cli` skills at startup
- [x] 3.2 Write hard-stop message for missing `openspec-apply-change` skill referencing OpenSpec installation
- [x] 3.3 Write hard-stop message for missing `chrome-devtools-cli` skill referencing skill installation
- [x] 3.4 Verify guard instructions "Do NOT proceed" and "Do NOT fall back to inline content" appear for both skills

## 4. Add skill reference sections

- [x] 4.1 Add `openspec-apply-change` skill reference section instructing the agent to read the skill via `<available_skills>` path and follow its procedures
- [x] 4.2 Add `chrome-devtools-cli` skill reference section instructing the agent to read the skill via `<available_skills>` path for browser automation commands
- [x] 4.3 Ensure neither section duplicates skill file content — only references by name and instructs to read

## 5. Add web-dev implementation guidance

- [x] 5.1 Add instructions for when to use `chrome-devtools` CLI during implementation: navigating to rendered pages, DOM snapshots, screenshots, element interaction, JS evaluation, console message inspection
- [x] 5.2 Add guidance that DOM snapshots (`take_snapshot`) are the primary verification method, with screenshots as supplementary visual confirmation
- [x] 5.3 Add instruction to use `evaluate_script` for verifying dynamic behavior (component state, CSS computed styles, event handlers)
- [x] 5.4 Reference the `chrome-devtools-cli` skill for full command documentation — do not duplicate the CLI reference

## 6. Add headless adaptation table and return format

- [x] 6.1 Add adaptation table mapping interactive skill instructions to headless behavior (same format as `apply.md`): AskUserQuestion → return structured status, ask for clarification → return what's needed, etc.
- [x] 6.2 Add "NEVER attempt to use AskUserQuestion, Task, TodoWrite" warning
- [x] 6.3 Add structured return format section with Status (done/blocked/need-input), Tasks Completed list, and Summary

## 7. Validate agent file

- [x] 7.1 Verify total system prompt length exceeds 200 characters — actual: 5952 characters
- [x] 7.2 Verify no existing files were modified — `teams.yaml`, `apply.md`, and other agent files remain unchanged (git diff shows no modified files)
- [x] 7.3 Verify the description field mentions "apply" and "web" so the dispatcher can route web tasks to this agent
