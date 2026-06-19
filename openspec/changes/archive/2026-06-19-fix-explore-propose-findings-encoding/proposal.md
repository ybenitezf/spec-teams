## Why

The explore→propose findings handoff is unreliable because sub-agents cannot construct the encoded working directory path `~/.pi/spec-teams/<encoded-cwd>/`. Agent prompts reference `<encoded-cwd>` as "the `encodeCwd(cwd)` representation" but never specify HOW to compute it. Evidence in `~/.pi/spec-teams/` shows agents have used at least four different encoding schemes — some writing findings to directories the propose agent never checks, silently degrading proposal quality. Fixing this makes the handoff deterministic.

## What Changes

- The dispatcher injects the computed `<encoded-cwd>` value into agent task strings for explore and propose dispatches, removing guesswork
- `agents/explore.md` is updated to reference the injected value instead of opaque encoding instructions
- `agents/propose.md` is updated to reference the injected value instead of opaque encoding instructions
- Optionally, stale `.md` findings files are cleaned up on `session_start` to prevent cross-session contamination

## Capabilities

### New Capabilities

<!-- No new capabilities. This change modifies existing agent behaviors. -->

### Modified Capabilities

- `explore-agent`: The findings file path requirement changes from "agent MUST compute `<encoded-cwd>`" to "agent MUST use the `<encoded-cwd>` value provided in the task string". The agent no longer guesses the encoding.
- `propose-agent`: The findings file consumption requirement changes from "agent MUST compute `<encoded-cwd>`" to "agent MUST use the `<encoded-cwd>` value provided in the task string". The agent no longer guesses the encoding.

## Impact

- **Extension code** (`extensions/spec-teams.ts`): `dispatchAgent()` or the dispatcher's task construction injects `encoded-cwd` into task strings for explore/propose dispatches. The dispatcher prompt (`buildExploreRelaySegment`) provides an injection instruction.
- **Extension utils** (`extensions/spec-teams-utils.ts`): `buildExploreRelaySegment` gains injection instruction for `encoded-cwd` alongside existing signal definition injection.
- **Agent prompts** (`agents/explore.md`, `agents/propose.md`): Path construction instructions reference the task-string-provided value with the algorithm documented as a fallback.
- **No API surface changes**: The `encodeCwd()` function, findings file format, and `sessionDir` computation remain unchanged.
