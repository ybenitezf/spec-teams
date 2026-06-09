## ADDED Requirements

### Requirement: Skill awareness — worker discovers and uses available skills

The worker agent's system prompt SHALL contain a "Skill Awareness" section instructing the worker to check the `<available_skills>` block for skills relevant to the current task. The instruction SHALL direct the worker to read the skill file using the `read` tool and follow its procedure. The instruction SHALL be opportunistic rather than mandatory — the worker SHALL NOT require any specific skill to function.

#### Scenario: Skill section present in worker prompt
- **WHEN** the worker agent's system prompt is assembled
- **THEN** the prompt includes a "Skill Awareness" section that references the `<available_skills>` block
- **AND** the section instructs the worker to check `<available_skills>` for skills relevant to the current task

#### Scenario: Worker reads and follows a matching skill
- **WHEN** the worker is dispatched with a task that matches an available skill (e.g., "commit changes" matches `git-commit`)
- **THEN** the worker reads the skill file from the location specified in `<available_skills>`
- **AND** the worker follows the skill's procedure for task execution

#### Scenario: No matching skill — worker proceeds normally
- **WHEN** the worker is dispatched with a task that has no matching skill in `<available_skills>`
- **THEN** the worker does NOT hard-stop or error
- **AND** the worker proceeds to execute the task normally using its standard tools

#### Scenario: Skill-awareness does not introduce OpenSpec references
- **WHEN** the worker agent's system prompt is read
- **THEN** the Skill Awareness section does NOT reference "openspec", "explore", "propose", "apply", "verify", "archive", "change", or "delta spec"
- **AND** the Skill Awareness section references only generic skill discovery mechanisms (`<available_skills>` XML block, `read` tool)
