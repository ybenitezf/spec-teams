## ADDED Requirements

### Requirement: OpenSpec phases configuration

The extension SHALL define an `OPENSPEC_PHASES` configuration array in `spec-teams-utils.ts` that maps each OpenSpec lifecycle phase to its corresponding skill name (or `null` for phases without a skill). The configuration SHALL be:

| Phase   | Skill Name                  |
|---------|-----------------------------|
| explore | `openspec-explore`          |
| propose | `openspec-propose`          |
| apply   | `openspec-apply-change`     |
| verify  | `null`                      |
| archive | `openspec-archive-change`   |

Each entry SHALL also include a human-readable label (e.g., "Explore", "Propose") for use in unavailable-phase notices and routing heuristics. The configuration SHALL NOT include role descriptions or "Identity" fields — the dispatcher prompt references skills by name and does not duplicate skill content.

#### Scenario: Explore phase maps to openspec-explore
- **WHEN** the configuration is queried for the explore phase
- **THEN** the skill name is `openspec-explore` and the label is "Explore"

#### Scenario: Verify phase has no skill
- **WHEN** the configuration is queried for the verify phase
- **THEN** the skill name is `null`, indicating no skill fallback exists

#### Scenario: Apply phase maps to openspec-apply-change
- **WHEN** the configuration is queried for the apply phase
- **THEN** the skill name is `openspec-apply-change`

### Requirement: Phase availability computation from skills

The extension SHALL provide a `buildOpenSpecPhases(skills)` function in `spec-teams-utils.ts` that takes a `Skill[]` array (from Pi's `event.systemPromptOptions.skills`) and returns a `PhaseAvailability[]` array. For each phase in `OPENSPEC_PHASES`:

1. If the phase has a `skillName` and that skill name appears in the skills array → the phase is `available: true`, `skillAvailable: true`
2. If the phase has `skillName: null` → the phase is `available: false`, `skillAvailable: false` (verify is only available via agent presence, decided separately)
3. If the phase has a `skillName` but the skill is NOT in the skills array → the phase is `available: false`, `skillAvailable: false`

The function SHALL NOT perform any filesystem I/O. It SHALL work entirely from the skills array passed to it.

#### Scenario: All OpenSpec skills present
- **WHEN** `buildOpenSpecPhases()` is called with a skills array containing `openspec-explore`, `openspec-propose`, `openspec-apply-change`, and `openspec-archive-change`
- **THEN** explore, propose, apply, and archive phases have `available: true`
- **AND** verify has `available: false`

#### Scenario: No skills present
- **WHEN** `buildOpenSpecPhases()` is called with an empty skills array
- **THEN** all phases have `available: false`

#### Scenario: Partial skills present
- **WHEN** `buildOpenSpecPhases()` is called with a skills array containing only `openspec-explore`
- **THEN** explore has `available: true`
- **AND** propose, apply, verify, and archive have `available: false`

#### Scenario: Skills array is undefined or null
- **WHEN** `buildOpenSpecPhases()` is called with `undefined` or `null`
- **THEN** the function treats it as an empty array and returns all phases with `available: false`

#### Scenario: Non-OpenSpec skills are ignored
- **WHEN** `buildOpenSpecPhases()` is called with a skills array containing `openspec-explore` and `bowser` (a non-OpenSpec skill)
- **THEN** explore has `available: true`
- **AND** `bowser` does not appear in any phase entry

### Requirement: Explore relay signal definitions

The extension SHALL define an `EXPLORE_SIGNALS` constant in `spec-teams-utils.ts` containing the four signal definitions that the dispatcher injects into explore task instructions. Each signal SHALL have a name and a brief description:

- **need-input**: Has questions for the user — relay the full response to the user verbatim and wait for their reply.
- **ready-to-propose**: Exploration is complete with a structured change brief — extract the brief, relay summary to the user, ask for approval before dispatching for propose.
- **done-exploring**: No change is needed — relay summary to the user and return to normal operation.
- **blocked**: Cannot proceed — relay the blocker description to the user and ask how to proceed.

This constant SHALL be used by the Explore Relay Protocol segment function to include signal definitions in the system prompt, and by the prompt assembly to reference signal injection language.

#### Scenario: Signal definitions are available for prompt generation
- **WHEN** the system prompt segment functions are called
- **THEN** `EXPLORE_SIGNALS` provides the four signal definitions with their names and descriptions

#### Scenario: Signal names match current relay protocol
- **WHEN** the signal definitions are compared to the existing static prompt
- **THEN** the signal names are `need-input`, `ready-to-propose`, `done-exploring`, and `blocked`
- **AND** the descriptions match the dispatcher's per-signal handling instructions