# spec-teams-extension Delta Spec

## ADDED Requirements

### Requirement: Explore relay protocol in system prompt
The dispatcher's system prompt SHALL include instructions for the explore relay protocol: when an explore agent is available on the team, exploration SHALL be conducted through multi-turn dispatch with the explore agent. The dispatcher SHALL relay explore agent responses to the user and relay user responses back to the explore agent via continued dispatches.

#### Scenario: Dispatcher relays explore responses to user
- **WHEN** the explore agent returns `need-input` with analysis and questions
- **THEN** the dispatcher presents the explore agent's response to the user
- **AND** the dispatcher waits for the user's response before dispatching again

#### Scenario: Dispatcher continues explore session with user response
- **WHEN** the user responds to an explore agent's question
- **THEN** the dispatcher dispatches the explore agent again with the user's message
- **AND** the explore agent resumes its session automatically

#### Scenario: Dispatcher recognizes ready-to-propose
- **WHEN** the explore agent returns `Status: ready-to-propose` with a structured brief
- **THEN** the dispatcher SHALL extract the structured brief (change name, problem, approach, scope, constraints)
- **AND** the dispatcher SHALL dispatch the propose agent with the structured brief as the task

#### Scenario: Dispatcher recognizes done-exploring
- **WHEN** the explore agent returns `Status: done-exploring`
- **THEN** the dispatcher SHALL present the summary to the user
- **AND** the dispatcher SHALL return to normal operation without creating a change

### Requirement: Explore multi-turn routing scenarios
The system prompt's "Working with Agents" section SHALL include guidance for the explore multi-turn flow: the explore agent may return `need-input` repeatedly as the conversation develops; each time the dispatcher relays and waits for user input; when `ready-to-propose` is returned, the dispatcher routes to the propose agent with the provided brief; when `done-exploring` is returned, no further action is needed.

#### Scenario: Multiple need-input rounds
- **WHEN** the explore agent returns `need-input` for a second time
- **THEN** the dispatcher continues relaying messages without treating the repeated signal as an error

#### Scenario: Explore to propose handoff is automatic
- **WHEN** the explore agent returns `ready-to-propose`
- **THEN** the dispatcher dispatches propose without asking the user for confirmation about the handoff

#### Scenario: Explore ends without artifacts
- **WHEN** the explore agent returns `done-exploring`
- **THEN** the dispatcher does NOT attempt to dispatch propose or create any artifacts
