## 1. Prompt Refactoring

- [x] 1.1 Rewrite "OpenSpec Lifecycle" section in `before_agent_start` handler: replace "four phases" intro with activity-based framing that emphasizes fluidity, adding "actions you can take anytime — not stages you're locked into" language
- [x] 1.2 Rewrite "Working with Agents" section: remove pipeline-enforcing "chain across phases" instruction and replace with 5 situation-based bullet points (unclear → explore, clear → jump to apply, small → skip to apply, flaw → circle back to propose, thinking → stay in explore)
- [x] 1.3 Rewrite "Rules" section: remove "don't skip phases" rule and replace with bidirectional "match activity to intent" guidance

## 2. Verification

- [x] 2.1 Verify extension loads without errors: `pi -e ./extensions/spec-teams.ts -p "hello"`
- [x] 2.2 Verify system prompt text no longer contains "chain across phases", "don't skip phases", or "four phases"
- [x] 2.3 Verify system prompt still includes all four activity descriptions, routing heuristics, and dynamic agent catalog
