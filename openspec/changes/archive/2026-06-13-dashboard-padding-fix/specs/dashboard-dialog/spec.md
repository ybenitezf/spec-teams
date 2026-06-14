## MODIFIED Requirements

### Requirement: Agent detail cards in dashboard dialog
Each agent in the dashboard dialog SHALL be displayed as a detail card showing the following fields from `AgentDef` and `AgentState`:
- Status icon (`○` idle, `●` running, `✓` done, `✗` error) rendered in the status-dependent color, followed by a space separator, followed by the display name rendered in bold without status-dependent coloring
- Status text (idle, running, done, error)
- Model (from `AgentDef.model`, falling back to "default")
- Thinking level (from `AgentDef.thinking`)
- Tools (from `AgentDef.tools`)
- Description (from `AgentDef.description`)
- Context percentage (from `AgentState.contextPct`, formatted as `N%`)
- Cost (from `AgentState.cost`, formatted as `$N.NNNN`)
- Run count (from `AgentState.runCount`)
- Elapsed time (from `AgentState.elapsed`, formatted via `formatDuration()`)
- Session state (`resumed` if `AgentState.sessionFile` exists, `new` otherwise)

#### Scenario: Running agent card displays all fields
- **WHEN** the dashboard dialog is open and an agent with status "running" has `contextPct: 21`, `cost: 0.0421`, `runCount: 3`, `elapsed: 65000`, `sessionFile: "path/to/session.json"`, `def.model: "openrouter/anthropic/claude-sonnet-4"`, `def.thinking: "medium"`, `def.tools: "read,grep,bash,edit"`, `def.description: "Investigate issues"`
- **THEN** the card displays: status icon `●` in accent color, name in bold (not accent-colored), status "running", model "openrouter/anthropic/claude-sonnet-4", thinking "medium", tools "read,grep,bash,edit", description "Investigate issues", context "21%", cost "$0.0421", "3 runs", elapsed "1m 5s", session "resumed"

#### Scenario: Idle agent card shows dim status icon with bold name
- **WHEN** an agent has status "idle"
- **THEN** the status icon `○` is rendered in dim color and the agent name is rendered in bold without dim coloring

#### Scenario: Error agent card shows error-colored icon with bold name
- **WHEN** an agent has status "error"
- **THEN** the status icon `✗` is rendered in error color and the agent name is rendered in bold without error coloring

#### Scenario: Agent with no model shows default
- **WHEN** an agent's `def.model` is undefined or empty
- **THEN** the model field displays "default" (indicating the dispatcher's model will be used)

#### Scenario: Agent with zero cost
- **WHEN** an agent's `cost` is 0
- **THEN** the cost field displays "$0"

#### Scenario: Agent with no session file
- **WHEN** an agent's `sessionFile` is null
- **THEN** the session state displays "new"

### Requirement: Dashboard dialog is scrollable
The dashboard dialog SHALL support scrolling when the total height of agent cards exceeds the overlay's maximum height. The overlay SHALL use `OverlayOptions` with `anchor: "center"`, `width: "60%"`, and `maxHeight: "80%"`. Content lines within the dialog SHALL have symmetric horizontal padding — equal padding on both left and right sides between the content text and the border characters. The scroll indicator line, when present, SHALL also have symmetric horizontal padding matching the content lines.

#### Scenario: Many agents overflow overlay height
- **WHEN** the dashboard dialog is open and 8 agents produce more card lines than the overlay height allows
- **THEN** the dialog is scrollable and the user can scroll to see all agents
- **AND** each content line has equal left and right padding between the content text and the border characters

#### Scenario: Few agents fit in overlay
- **WHEN** the dashboard dialog is open and 3 agents produce card lines that fit within the overlay height
- **THEN** all cards are visible without scrolling
- **AND** each content line has equal left and right padding between the content text and the border characters

#### Scenario: Scroll indicator has symmetric padding
- **WHEN** the dashboard dialog has more content than fits and a scroll indicator line is shown
- **THEN** the scroll indicator line has the same left and right padding as the content lines