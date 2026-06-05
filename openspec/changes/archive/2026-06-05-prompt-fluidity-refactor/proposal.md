## Why

The dispatcher's system prompt currently enforces a rigid linear pipeline — instructing agents to "chain across phases" and "don't skip phases." This contradicts OpenSpec's core philosophy of fluid, action-based workflows where activities are things you can do anytime, not stages you're locked into. The prompt needs to reflect OpenSpec's actual design: start anywhere, go back when needed, skip what doesn't apply.

## What Changes

- **Reframe "OpenSpec Lifecycle" intro** — from "four phases" to "four activities," adding explicit language that these are actions you can take anytime, not stages you're locked into
- **Replace pipeline instructions in "Working with Agents"** — remove "Chain agents across phases: explore → propose → apply → archive" and replace with situation-based guidance (unclear requirements → explore; clear goal → jump to apply; design flaw found → circle back to propose)
- **Replace "don't skip phases" rule** — replace with "match activity to intent" guidance that balances exploration when needed against avoiding unnecessary ceremony for simple changes

## Capabilities

### Modified Capabilities

- `spec-teams-extension`: The system prompt injected on `before_agent_start` is updated to use fluidity-first language. The lifecycle descriptions remain but are framed as activities rather than mandatory phases. Pipeline-enforcing language ("chain across phases", "don't skip phases") is removed in favor of intent-based routing guidance.

## Impact

- `extensions/spec-teams.ts` — system prompt string in `before_agent_start` handler (~30 lines changed across three sections)
- No changes to agent `.md` format, `teams.yaml`, agent loading, dispatch logic, or any other file
