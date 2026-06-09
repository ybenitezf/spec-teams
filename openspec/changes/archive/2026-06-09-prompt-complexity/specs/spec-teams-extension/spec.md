# spec-teams-extension Delta Specification

Delta spec for `prompt-complexity` — restructures dispatcher system prompt.

## MODIFIED Requirements

### Requirement: OpenSpec-aware system prompt
The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. The system prompt SHALL be organized into these clearly separated sections, each appearing once:

1. **Identity** — the dispatcher's role
2. **Team Config** — active team name and members (dynamic, `${activeTeamName}`, `${teamMembers}`)
3. **OpenSpec Lifecycle** — each phase (explore, propose, apply, verify, archive) described ONCE as a single block containing: identity/role description, routing heuristics (when to dispatch this phase), and workflow guidance (transitions before/after this phase). No phase description SHALL appear in more than one section.
4. **Explore Relay Protocol** — dedicated section (see separate requirement) covering signal detection, multi-turn relay flow, and propose handoff
5. **Non-OpenSpec Tasks** — worker routing (conditional on `${hasWorker}`, unchanged)
6. **Rules** — operational rules that do NOT restate lifecycle descriptions or routing guidance from the Lifecycle section

The lifecycle SHALL describe five fluid activities: explore, propose, apply, verify, and archive. Each activity SHALL be described with general role keywords for description-based agent matching (no hardcoded agent names). The archive activity SHALL be described as focused on mechanical finalization (syncing delta specs via openspec CLI, merging into main specs, moving to archive/) — audit and validation concerns SHALL belong to the verify activity. The propose activity SHALL be described as focused on formalizing explored decisions into structured artifacts and SHALL include guidance that propose agents expect a clear brief (not an open-ended investigation). The system prompt SHALL NOT contain a static lookup table mapping phases to specific agent names. The system prompt SHALL NOT contain pipeline-enforcing language.

#### Scenario: System prompt includes five activities in per-phase blocks
- **WHEN** an agent starts
- **THEN** the system prompt includes activity descriptions for explore, propose, apply, verify, and archive in the Lifecycle section
- **AND** each phase is a single block containing identity, routing heuristics, and workflow guidance
- **AND** no phase description appears in more than one section

#### Scenario: No separate Working with Agents section
- **WHEN** an agent starts
- **THEN** the system prompt does NOT have a separate "Working with Agents" section that restates lifecycle descriptions
- **AND** workflow guidance for each phase is within that phase's block in the Lifecycle section

#### Scenario: Propose transition guidance present
- **WHEN** an agent starts
- **THEN** the propose phase block includes guidance that when exploration produces clear decisions, the dispatcher SHOULD dispatch to propose with a structured brief including change name, problem, approach, scope, and constraints

#### Scenario: Archive gating guidance present
- **WHEN** an agent starts
- **THEN** the archive phase block includes guidance that archiving SHALL only be suggested after a clean verification
- **AND** the dispatcher SHALL ask the user for approval before dispatching the archive agent

#### Scenario: Verify does not reference specific agent names
- **WHEN** an agent starts
- **THEN** the verify activity description does NOT contain hardcoded agent names
- **AND** the dispatcher can match the verify phase to any agent whose description signals verification

#### Scenario: Existing routing constraints preserved
- **WHEN** an agent starts
- **THEN** the system prompt still does NOT contain hardcoded agent names in routing instructions
- **AND** the system prompt still does NOT contain pipeline-enforcing language

#### Scenario: Rules do not restate lifecycle
- **WHEN** an agent starts
- **THEN** the Rules section does NOT contain "NEVER dispatch archive without user approval" (covered by archive phase block)
- **AND** the Rules section does NOT restate transition guidance from the Lifecycle section

### Requirement: Explore relay protocol in system prompt
The dispatcher's system prompt SHALL include a dedicated "Explore Relay Protocol" section, distinct from the Lifecycle section. This section SHALL describe the multi-turn explore relay flow with per-signal handling instructions. The section SHALL NOT contain a blanket "dumb relay — do not interpret" statement. Instead, it SHALL give explicit per-signal instructions:

- `need-input`: Relay the full explore response to the user verbatim. Wait for the user's response before dispatching again.
- `ready-to-propose`: Extract the structured brief (change name, problem, approach, scope, constraints) from the explore response. Dispatch the propose agent with the structured brief as the task.
- `done-exploring`: Relay the summary to the user. Return to normal operation without creating a change.
- `blocked`: Relay the blocker description to the user. Ask how to proceed.

#### Scenario: Explore relay protocol is its own section
- **WHEN** an agent starts
- **THEN** the system prompt has a dedicated "Explore Relay Protocol" section
- **AND** the relay protocol content is NOT embedded within the Lifecycle section

#### Scenario: Per-signal handling replaces blanket rule
- **WHEN** an agent starts
- **THEN** the Explore Relay Protocol section does NOT contain a blanket "do not interpret" instruction
- **AND** it contains explicit per-signal handling instructions for need-input, ready-to-propose, done-exploring, and blocked

#### Scenario: Dispatcher relays need-input verbatim
- **WHEN** the explore agent returns `need-input` with analysis and questions
- **THEN** the dispatcher presents the full explore agent's response to the user
- **AND** the dispatcher waits for the user's response before dispatching again

#### Scenario: Dispatcher interprets ready-to-propose
- **WHEN** the explore agent returns `Status: ready-to-propose` with a structured brief
- **THEN** the dispatcher SHALL extract the structured brief (change name, problem, approach, scope, constraints) from the response
- **AND** the dispatcher SHALL dispatch the propose agent with the structured brief as the task
- **AND** the dispatcher does NOT relay the full explore output to the user as-is

#### Scenario: Dispatcher continues explore session with user response
- **WHEN** the user responds to an explore agent's question
- **THEN** the dispatcher dispatches the explore agent again with the user's message
- **AND** the explore agent resumes its session automatically

#### Scenario: Dispatcher recognizes done-exploring
- **WHEN** the explore agent returns `Status: done-exploring`
- **THEN** the dispatcher SHALL present the summary to the user
- **AND** the dispatcher SHALL return to normal operation without creating a change

### Requirement: Explore multi-turn routing scenarios
The Explore Relay Protocol section SHALL include guidance for the explore multi-turn flow: the explore agent may return `need-input` repeatedly as the conversation develops; each time the dispatcher relays and waits for user input; when `ready-to-propose` is returned, the dispatcher routes to the propose agent with the provided brief; when `done-exploring` is returned, no further action is needed.

#### Scenario: Multiple need-input rounds
- **WHEN** the explore agent returns `need-input` for a second time
- **THEN** the dispatcher continues relaying messages without treating the repeated signal as an error

#### Scenario: Explore to propose handoff is automatic
- **WHEN** the explore agent returns `ready-to-propose`
- **THEN** the dispatcher dispatches propose without asking the user for confirmation about the handoff

#### Scenario: Explore ends without artifacts
- **WHEN** the explore agent returns `done-exploring`
- **THEN** the dispatcher does NOT attempt to dispatch propose or create any artifacts

### Requirement: Intent-based routing guidance
The Lifecycle section SHALL include per-phase routing guidance that matches the dispatcher's activity choice to user intent: quick fixes SHALL NOT force unnecessary exploration, unclear requirements SHALL NOT be rushed to implementation, exploration that produces clear decisions SHALL lead to dispatching propose with a structured brief, implementations reported complete SHALL be verified before suggesting archive, verification issues SHALL be routed back to apply with specific fix tasks, and a clean verification SHALL lead the dispatcher to ask the user for archive approval. This guidance SHALL appear within each phase's block in the Lifecycle section, not in a separate section.

#### Scenario: Quick fix bypasses exploration
- **WHEN** a user requests a simple change (e.g., "fix the typo in the footer")
- **THEN** the dispatcher MAY dispatch directly to an apply agent without first exploring or proposing

#### Scenario: Unclear requirements trigger exploration
- **WHEN** a user expresses uncertainty (e.g., "I'm not sure how to handle auth")
- **THEN** the dispatcher SHOULD route to an explore agent before creating artifacts

#### Scenario: Explored decisions trigger propose
- **WHEN** exploration has produced clear, agreed-upon decisions about what to build
- **THEN** the dispatcher SHOULD dispatch a propose agent with a structured task string containing the change name, problem statement, technical approach, scope boundaries, and constraints

#### Scenario: Implementation verification gating
- **WHEN** an apply agent returns status "done"
- **THEN** the dispatcher SHOULD dispatch a verify agent to audit the implementation before suggesting archive

#### Scenario: Verification issues loop back to apply
- **WHEN** a verify agent returns issues-found
- **THEN** the dispatcher SHOULD route the specific issues back to an apply agent for targeted fixes

#### Scenario: Clean verification prompts user for archive
- **WHEN** a verify agent returns a clean verdict
- **THEN** the dispatcher SHALL ask the user for approval to archive
- **AND** the dispatcher SHALL NOT dispatch the archive agent without user confirmation

#### Scenario: User approves archive
- **WHEN** the user confirms archive after a clean verification
- **THEN** the dispatcher SHALL dispatch the archive agent with the change name and instruction to sync

#### Scenario: Non-OpenSpec task routed to worker
- **WHEN** a user requests a non-OpenSpec task (git commit, web fetch, quick script, file operation, one-off edit)
- **AND** the worker agent is on the active team
- **THEN** the dispatcher routes the task to the worker agent

#### Scenario: OpenSpec task NOT routed to worker
- **WHEN** a user request matches OpenSpec workflow patterns (exploring, proposing, implementing a spec change)
- **THEN** the dispatcher does NOT route to the worker agent
- **AND** the dispatcher routes to the appropriate OpenSpec agent

#### Scenario: Worker output reveals complexity — dispatcher suggests exploration
- **WHEN** the worker agent completes a task
- **AND** the output reveals broader complexity, architectural concerns, or multi-component implications
- **THEN** the dispatcher SHALL suggest to the user that an OpenSpec exploration may be warranted
- **AND** the dispatcher SHALL NOT automatically dispatch an explore agent without user confirmation

#### Scenario: Worker returns blocked — dispatcher asks user
- **WHEN** the worker agent returns `Status: blocked`
- **THEN** the dispatcher SHALL present the blocker to the user
- **AND** the dispatcher SHALL ask the user how to proceed (retry, explore, abandon)

#### Scenario: Worker not on team — no non-OpenSpec routing
- **WHEN** a user requests a non-OpenSpec task
- **AND** the worker agent is NOT on the active team
- **THEN** the dispatcher SHALL use the most general-purpose agent available
- **AND** this fallback behavior is identical to before this change

#### Scenario: Worker done — dispatcher summarizes
- **WHEN** the worker agent returns `Status: done` with execution results
- **THEN** the dispatcher SHALL present a summary of what was accomplished to the user

#### Scenario: Worker blocked — dispatcher presents options
- **WHEN** the worker agent returns `Status: blocked` with a blocker description
- **THEN** the dispatcher SHALL present the blocker and ask the user how to proceed
