## MODIFIED Requirements

### Requirement: OpenSpec-aware system prompt
The extension SHALL override the system prompt on `before_agent_start` with OpenSpec lifecycle awareness and agent routing instructions. Routing instructions SHALL use generic phase-to-role heuristics (e.g., "explore → agents focused on investigation, research, discovery") rather than hardcoded agent names. The system prompt SHALL NOT contain a static lookup table mapping phases to specific agent names.

#### Scenario: System prompt injected
- **WHEN** an agent starts
- **THEN** the system prompt includes OpenSpec phase descriptions (explore, propose, apply, archive)
- **AND** the system prompt includes the active team's agent catalog
- **AND** the system prompt does NOT contain hardcoded agent names (such as "scout", "change-designer", "spec-writer", "spec-reviewer", "prompt-engineer") in routing instructions

#### Scenario: Routing adapts to any team
- **WHEN** a team is loaded with custom agent names (e.g., "researcher", "architect", "implementer")
- **THEN** the system prompt's routing guidance remains valid
- **AND** the dispatcher can match phases to agents by their descriptions rather than by name
