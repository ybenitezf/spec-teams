## MODIFIED Requirements

### Requirement: Explore relay protocol in system prompt
The dispatcher's system prompt SHALL include a dedicated "Explore Relay Protocol" section, distinct from the Lifecycle section. This section SHALL describe the multi-turn explore relay flow with per-signal handling instructions. The section SHALL NOT contain a blanket "dumb relay — do not interpret" statement. Instead, it SHALL give explicit per-signal instructions:

- `need-input`: Relay the full explore response to the user verbatim. Wait for the user's response before dispatching again.
- `ready-to-propose`: Extract the structured brief (change name, problem, approach, scope, constraints) from the explore response. Relay a summary of the Change Brief to the user. Ask the user for explicit approval before dispatching the propose agent. If the user approves, dispatch the propose agent with the structured brief as the task, incorporating any modifications the user made. If the user declines, report that exploration ended without a proposal and return to normal operation. Do NOT dispatch the propose agent without user confirmation.
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

#### Scenario: Dispatcher gates ready-to-propose with user approval
- **WHEN** the explore agent returns `Status: ready-to-propose` with a structured brief
- **THEN** the dispatcher SHALL extract the structured brief (change name, problem, approach, scope, constraints) from the response
- **AND** the dispatcher SHALL relay a summary of the Change Brief to the user
- **AND** the dispatcher SHALL ask the user for explicit approval before dispatching the propose agent
- **AND** the dispatcher SHALL NOT dispatch the propose agent without user confirmation

#### Scenario: User approves propose after ready-to-propose
- **WHEN** the dispatcher presents a Change Brief summary to the user after `ready-to-propose`
- **AND** the user approves (e.g., "yes", "go ahead", "propose")
- **THEN** the dispatcher SHALL dispatch the propose agent with the structured brief as the task
- **AND** the dispatcher SHALL incorporate any modifications the user made to the brief

#### Scenario: User declines propose after ready-to-propose
- **WHEN** the dispatcher presents a Change Brief summary to the user after `ready-to-propose`
- **AND** the user declines (e.g., "no", "never mind", "not yet")
- **THEN** the dispatcher SHALL report that exploration ended without a proposal
- **AND** the dispatcher SHALL NOT dispatch the propose agent
- **AND** the dispatcher SHALL NOT create any proposal artifacts

#### Scenario: Dispatcher continues explore session with user response
- **WHEN** the user responds to an explore agent's question
- **THEN** the dispatcher dispatches the explore agent again with the user's message
- **AND** the explore agent resumes its session automatically

#### Scenario: Dispatcher recognizes done-exploring
- **WHEN** the explore agent returns `Status: done-exploring`
- **THEN** the dispatcher SHALL present the summary to the user
- **AND** the dispatcher SHALL return to normal operation without creating a change

### Requirement: Explore multi-turn routing scenarios
The Explore Relay Protocol section SHALL include guidance for the explore multi-turn flow: the explore agent may return `need-input` repeatedly as the conversation develops; each time the dispatcher relays and waits for user input; when `ready-to-propose` is returned, the dispatcher SHALL present the Change Brief to the user and wait for explicit approval before dispatching propose; when the user approves, the dispatcher routes to the propose agent with the provided brief; when the user declines, no proposal artifacts are created; when `done-exploring` is returned, no further action is needed.

#### Scenario: Multiple need-input rounds
- **WHEN** the explore agent returns `need-input` for a second time
- **THEN** the dispatcher continues relaying messages without treating the repeated signal as an error

#### Scenario: Explore to propose requires user approval
- **WHEN** the explore agent returns `ready-to-propose`
- **THEN** the dispatcher SHALL ask the user for explicit approval before dispatching the propose agent
- **AND** the dispatcher SHALL NOT dispatch propose without user confirmation

#### Scenario: User declines to propose after exploration
- **WHEN** the explore agent returns `ready-to-propose`
- **AND** the user declines to proceed with the proposal
- **THEN** the dispatcher SHALL report that exploration ended without a proposal
- **AND** the dispatcher SHALL NOT create any proposal artifacts

#### Scenario: Explore ends without artifacts
- **WHEN** the explore agent returns `done-exploring`
- **THEN** the dispatcher does NOT attempt to dispatch propose or create any artifacts
