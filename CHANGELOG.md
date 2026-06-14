# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING**: Removed the always-visible dashboard widget and `/specs-grid` command
- Added `/specs-dashboard` command that opens an overlay dialog with detailed per-agent cards
- Each agent card now shows full state: status, model, thinking level, tools, description, metrics (runs, elapsed, context%, cost, session state)
- Dashboard dialog supports live updates while open and keyboard dismissal (Escape/Enter)

## [0.1.0] - 2025-06-12

### Added

- Multi-agent orchestration system with specialist sub-agents (Explore, Propose, Apply, Verify, Archive, Worker)
- Dispatcher agent with intelligent routing for OpenSpec lifecycle phases
- Signal-based orchestration protocol (`done`, `blocked`, `need-input`, `ready-to-propose`)
- Configurable team composition via `teams.yaml`
- Agent definitions using Markdown + YAML frontmatter format
- Session persistence for sub-agents across invocations
- Real-time streaming of sub-agent output to Pi terminal UI
- Dashboard widget (`/specs-grid`) for monitoring agent status
- Commands: `/specs-team`, `/specs-list`, `/specs-grid`
- OpenSpec integration with skill files and prompts
- MIT License
