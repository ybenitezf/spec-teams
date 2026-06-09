## 1. Add Skill Awareness to Worker Prompt

- [x] 1.1 Add a "Skill Awareness" section to `agents/worker.md` placed after the existing "Guiding Principle" section, instructing the worker to check `<available_skills>` for skills relevant to the current task, read the matching skill file with `read`, and follow its procedure
- [x] 1.2 Verify the new section does NOT introduce OpenSpec references (no "openspec", "explore", "propose", "apply", "verify", "archive", "change", or "delta spec") — per spec requirement

## 2. Validate

- [x] 2.1 Read the full `agents/worker.md` and confirm all existing sections are preserved (identity, critical constraint, role boundary, return format, task execution checklist, status signals, guiding principle, execution tools, constraints)
- [x] 2.2 Confirm the new section references `<available_skills>` as an XML block and uses the `read` tool pattern consistent with OpenSpec agents' "Skill Reference" sections
