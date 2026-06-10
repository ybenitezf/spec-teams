## 1. System Prompt Update

- [x] 1.1 Update the `ready-to-propose` bullet in the Explore Relay Protocol section to replace automatic dispatch with user-approval gating: extract Change Brief, relay summary, ask for explicit approval, handle user declines and modifications
- [x] 1.2 Update the multi-turn flow example to show the user-approval step between explore returning `ready-to-propose` and dispatching propose
- [x] 1.3 Verify the updated system prompt renders without syntax errors (check template literal interpolation of `${activeTeamName}`, `${teamMembers}`, `${workerRoutingSection}`, `${agentCatalog}`)

## 2. Spec Update

- [x] 2.1 Modify the "Explore relay protocol in system prompt" requirement in `openspec/specs/spec-teams-extension/spec.md` — update the `ready-to-propose` per-signal instruction to include user-approval gating, replace the "Dispatcher interprets ready-to-propose" scenario with "Dispatcher gates ready-to-propose with user approval", and add "User approves propose after ready-to-propose" and "User declines propose after ready-to-propose" scenarios
- [x] 2.2 Modify the "Explore multi-turn routing scenarios" requirement — replace the "Explore to propose handoff is automatic" scenario with "Explore to propose requires user approval" and add "User declines to propose after exploration" scenario, update the requirement preamble to describe the gated flow

## 3. Validation

- [x] 3.1 Verify the delta spec at `openspec/changes/explore-to-propose-gate/specs/spec-teams-extension/spec.md` matches the expected modified requirements
- [x] 3.2 Verify the system prompt still correctly handles all other signals (`need-input`, `done-exploring`, `blocked`) unchanged
- [x] 3.3 Verify the archive gating pattern remains unchanged and the new gate does not conflict with archive instructions
