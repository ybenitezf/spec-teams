# readme-overhaul Specification

## Purpose
This specification defines the README overhaul requirements for the spec-teams-extension repository, including corrected installation instructions, OpenSpec prerequisite documentation, agent system deep-dive, custom agent documentation, and proper attribution credits.

## Requirements
### Requirement: Corrected installation instructions
The README "Getting Started" section SHALL NOT reference `npm install spec-teams-extension`. It SHALL document installation by cloning the repository and running the extension via `pi -e ./extensions/spec-teams.ts`, or by symlinking the extensions directory into the user's project.

#### Scenario: User installs spec-teams from GitHub
- **WHEN** a new user follows the Getting Started instructions
- **THEN** they clone the repo, navigate to the directory, and run `pi -e ./extensions/spec-teams.ts` to start using the extension

#### Scenario: User integrates spec-teams into an existing project
- **WHEN** a user wants to use spec-teams in their existing Pi project
- **THEN** the README documents how to symlink or copy the `extensions/` and `agents/` directories, or use Pi's extension configuration to point to the spec-teams extension

### Requirement: OpenSpec prerequisite documentation
The README SHALL clearly document OpenSpec as a prerequisite dependency, explaining what OpenSpec is, why it's required (agents hard-stop without the skills), and how to install it.

#### Scenario: User starts spec-teams without OpenSpec
- **WHEN** a user attempts to use spec-teams without having OpenSpec installed
- **THEN** the README has already warned them that OpenSpec is required and provided installation instructions (e.g., `openspec init` or installing via the Pi extension system)

#### Scenario: User wants to understand the OpenSpec dependency
- **WHEN** a user reads the prerequisite section
- **THEN** they understand that OpenSpec provides the skill files (.pi/skills/openspec-*) that agents require at startup, and that without it, agents will hard-stop with a clear error message

### Requirement: Agent System section
The README SHALL include an "Agent System" section that explains the dispatcher/sub-agent architecture, signal-based orchestration protocol, and how agent .md files serve as both configuration and system prompts.

#### Scenario: User wants to understand how agents work internally
- **WHEN** a developer reads the Agent System section
- **THEN** they understand that a dispatcher agent routes requests to specialist sub-agents, that sub-agents run as independent headless Pi processes, and that coordination happens via structured status signals (done, blocked, need-input, ready-to-propose)

#### Scenario: User wants to understand agent .md file structure
- **WHEN** a developer reads the Agent System section
- **THEN** they understand that each agent .md file contains YAML frontmatter (configuration: name, description, tools, thinking, model) and a markdown body (system prompt), following Pi's agent definition convention

### Requirement: Creating Custom Agents section
The README SHALL include a "Creating Custom Agents" section that documents the .md frontmatter format, all available fields (name, description, tools, thinking, model, opt-in), the agent discovery priority order, teams.yaml configuration, and compatibility with external agent definitions.

#### Scenario: User creates a custom agent definition
- **WHEN** a user wants to create their own agent
- **THEN** the README documents the YAML frontmatter format, explains each field (name, description, tools, thinking, model), and shows how to place the .md file in the `agents/` directory or `.pi/agents/` for project-level overrides

#### Scenario: User adds agent to a team
- **WHEN** a user wants their custom agent to appear in a team
- **THEN** the README explains how to add the agent's name to the appropriate team list in `agents/teams.yaml`

#### Scenario: User wants to use third-party agent definitions
- **WHEN** a user wants to use agents from external sources
- **THEN** the README documents that spec-teams is compatible with the pi-vs-claude-code agent definitions (https://github.com/disler/pi-vs-claude-code) and Pi's subagent examples (https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent), and that agent definitions following Pi's .md frontmatter convention will work with the dispatcher

### Requirement: Model defaults documentation
The README SHALL note that model references in agent .md files are overridable defaults, not requirements, and that users can customize the model per-agent or globally.

#### Scenario: User sees a model they don't have access to
- **WHEN** a user reads an agent .md file and sees a model like `opencode-go/glm-5`
- **THEN** the README has already explained that the `model` field is a default that can be overridden, and that users should specify their own model provider and model ID

### Requirement: OpenSpec credit and acknowledgment
The README SHALL include explicit credit to OpenSpec for the skill system and CLI that spec-teams depends on, beyond what's already in the existing acknowledgments.

#### Scenario: User wants to understand what OpenSpec provides
- **WHEN** a user reads the acknowledgments or prerequisite section
- **THEN** they see that OpenSpec provides the skill files (.pi/skills/openspec-*) and the CLI (`openspec`) that drive the spec-driven development lifecycle, and that the spec-teams agents are purpose-built to work within that lifecycle

### Requirement: disler credit for foundational work
The README SHALL include a prominent credit to **disler** (https://github.com/disler) in the Acknowledgements section, explicitly stating that the spec-teams extension is based on/forked from disler's `agent-team.ts` extension from the [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) repository. The credit SHALL include a link to disler's GitHub profile and make the lineage unambiguous.

#### Scenario: User reads the Acknowledgements section
- **WHEN** a user views the README Acknowledgements section
- **THEN** they see a clear statement that spec-teams is based on/forked from disler's `agent-team.ts`, a link to https://github.com/disler, and a link to https://github.com/disler/pi-vs-claude-code

#### Scenario: User discovers the project's lineage early
- **WHEN** a user reads the README overview or introductory sections
- **THEN** the lineage from disler's work is referenced (even briefly), directing to the full credit in Acknowledgements for details
