# spec-teams-extension Delta Spec

## MODIFIED Requirements

### Requirement: OpenSpec-aware system prompt
The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. The lifecycle SHALL describe five fluid activities: explore, propose, apply, verify, and archive. Each activity SHALL be described with general role keywords for description-based agent matching (no hardcoded agent names). The archive activity SHALL be described as focused on mechanical finalization (syncing delta specs via openspec CLI, merging into main specs, moving to archive/) — audit and validation concerns SHALL belong to the verify activity. The propose activity SHALL be described as focused on formalizing explored decisions into structured artifacts and SHALL include guidance that propose agents expect a clear brief (not an open-ended investigation). The "Working with Agents" section SHALL include guidance for each activity transition including: exploration that produces clear decisions SHOULD lead to dispatching propose with a structured brief; archiving SHALL only be suggested after a clean verification AND user approval. The system prompt SHALL NOT contain a static lookup table mapping phases to specific agent names. The system prompt SHALL NOT contain pipeline-enforcing language.

#### Scenario: System prompt includes five activities
- **WHEN** an agent starts
- **THEN** the system prompt includes activity descriptions for explore, propose, apply, verify, and archive
- **AND** the verify activity is described with keywords covering review, validation, audit, spec compliance, and gap detection
- **AND** the archive activity is described as focused on syncing delta specs, merging into main specs, and moving to archive/
- **AND** the propose activity is described with guidance that propose agents expect a clear brief rather than open-ended investigation

#### Scenario: Propose transition guidance present
- **WHEN** an agent starts
- **THEN** the system prompt includes guidance that when exploration produces clear decisions, the dispatcher SHOULD dispatch to propose with a structured brief including change name, problem, approach, scope, and constraints

#### Scenario: Archive gating guidance present
- **WHEN** an agent starts
- **THEN** the system prompt includes guidance that archiving SHALL only be suggested after a clean verification
- **AND** the dispatcher SHALL ask the user for approval before dispatching the archive agent

#### Scenario: Verify does not reference specific agent names
- **WHEN** an agent starts
- **THEN** the verify activity description does NOT contain hardcoded agent names
- **AND** the dispatcher can match the verify phase to any agent whose description signals verification

#### Scenario: Existing routing constraints preserved
- **WHEN** an agent starts
- **THEN** the system prompt still does NOT contain hardcoded agent names in routing instructions
- **AND** the system prompt still does NOT contain pipeline-enforcing language

### Requirement: Intent-based routing guidance
The system prompt SHALL include guidance that matches the dispatcher's activity choice to user intent: quick fixes SHALL NOT force unnecessary exploration, unclear requirements SHALL NOT be rushed to implementation, exploration that produces clear decisions SHALL lead to dispatching propose with a structured brief (change name, problem, approach, scope, constraints), implementations reported complete SHALL be verified before suggesting archive, verification issues SHALL be routed back to apply with specific fix tasks, and a clean verification SHALL lead the dispatcher to ask the user for archive approval before dispatching the archive agent.

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
