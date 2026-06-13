# public-readiness Specification

## Purpose
This specification defines the public readiness requirements for the spec-teams-extension repository, including license, contribution guidelines, changelog, gitignore hygiene, and removal of local-only dotfiles that would break for other users.

## Requirements
### Requirement: LICENSE file
The repository SHALL contain a LICENSE file at the root with the MIT license text, matching the `license` field declared in package.json.

#### Scenario: New user checks license
- **WHEN** a user views the repository root on GitHub or clones the repo
- **THEN** a LICENSE file is present containing the standard MIT license text with copyright holder "spec-teams-extension contributors" and the year 2025

### Requirement: CONTRIBUTING.md file
The repository SHALL contain a CONTRIBUTING.md file at the root that documents how to contribute to the project, including development setup, testing, agent conventions, and PR guidelines.

#### Scenario: New contributor sets up development environment
- **WHEN** a developer reads CONTRIBUTING.md
- **THEN** they find instructions for cloning the repo, installing dependencies (`npm install` for test dependencies only — no build step), running tests (`npm test`), and understanding that Pi peer dependencies are provided at runtime

#### Scenario: Contributor creating an agent
- **WHEN** a developer wants to add or modify an agent definition
- **THEN** CONTRIBUTING.md documents the expected .md frontmatter format, the available fields (name, description, tools, thinking, model), and the convention that agent definitions live in `agents/`

#### Scenario: Contributor submitting a PR
- **WHEN** a developer wants to submit a pull request
- **THEN** CONTRIBUTING.md documents the PR process, conventional commit requirement, and that tests must pass

### Requirement: CHANGELOG.md file
The repository SHALL contain a CHANGELOG.md file at the root that starts with version 0.1.0 and records the initial public release.

#### Scenario: User checks release history
- **WHEN** a user views CHANGELOG.md
- **THEN** they see a v0.1.0 entry with a date and a summary of the initial public release features

### Requirement: .gitignore update for internal artifacts
The .gitignore file SHALL include entries for `openspec-research.md` and any internal-only artifacts that should not be tracked.

#### Scenario: Internal research file is generated
- **WHEN** a developer creates an openspec-research.md file during exploration
- **THEN** git ignores it (it is not tracked or committed)

### Requirement: .pi/agents symlink removed
The `.pi/agents` directory SHALL NOT exist as a symlink to the project's agents/ directory. The project root `agents/` directory SHALL be the sole location for agent definitions, discovered by Pi's built-in agent discovery.

#### Scenario: User clones repository on a different machine
- **WHEN** a new user clones the repository
- **THEN** no `.pi/agents` symlink exists, and Pi discovers agents from the `agents/` directory in the project root without requiring any manual setup

#### Scenario: Pi agent discovery priority
- **WHEN** Pi searches for agent definitions
- **THEN** it discovers `agents/` in the project root as the primary location, then `.claude/agents/`, then `.pi/agents/`, then `~/.agents/agents/`, without any broken symlinks in the chain
