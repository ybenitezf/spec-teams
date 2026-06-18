## Why

The current `apply` agent is general-purpose and lacks web-specific tooling for CSS, visualization, component rendering, and browser UI verification. Web development changes benefit from visual inspection via browser automation to verify rendering, interact with UI elements, and validate visual correctness during implementation. Adding a dedicated `apply-web-dev` agent enables the dispatcher to route web-focused implementation tasks to an agent equipped with browser automation capabilities.

## What Changes

- New agent file `agents/apply-web-dev.md` for web development implementation tasks
- Agent follows the same headless workflow as the base `apply` agent (uses `openspec-apply-change` skill)
- Additionally uses the `chrome-devtools-cli` skill for browser tasks (DOM inspection, visual verification, interaction testing, screenshot comparison)
- Uses a vision-capable model: `opencode-go/kimi-k2.6`
- Has tools: `read,write,edit,bash,grep,find` (same as base apply; chrome-devtools operates through bash)
- Agent system prompt guards for both `openspec-apply-change` AND `chrome-devtools-cli` skills (hard-stop if either is missing)
- System prompt instructs the agent to use `chrome-devtools` CLI for web-specific tasks during implementation
- Does NOT modify `teams.yaml`, existing `apply.md`, or any other agent files

## Capabilities

### New Capabilities
- `apply-web-dev-agent`: A headless sub-agent that implements OpenSpec changes focused on web development, with browser automation for visual verification, DOM inspection, and UI interaction testing.

### Modified Capabilities
<!-- None. This is a new standalone agent that does not modify existing agent specs. -->

## Impact

- Affected files: new file `agents/apply-web-dev.md`
- Affected specs: new spec `specs/apply-web-dev-agent/spec.md`
- No changes to extension code, other agent files, or `teams.yaml`
- No runtime dependencies added; `chrome-devtools-cli` is already available in the skill environment
