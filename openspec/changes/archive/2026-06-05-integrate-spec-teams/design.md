## Context

The project was scaffolded with a placeholder `extensions/index.ts` that only logs a startup notification. The actual extension — a dispatcher-orchestrator for spec-driven team workflows — lives at `/home/yoel/src/ybenitezf/prompts/extensions/spec-teams.ts`. It needs to be copied into this project's extension directory so the package delivers its intended functionality.

Pi auto-discovers all `.ts` files in `extensions/` (configured in `package.json` as `"pi": { "extensions": ["./extensions"] }`).

## Goals / Non-Goals

**Goals:**
- Remove the scaffold placeholder `extensions/index.ts`
- Add `extensions/spec-teams.ts` with the dispatcher-orchestrator extension
- Verify the extension loads without errors via `pi`

**Non-Goals:**
- No modifications to the extension's behavior or code
- No new features beyond what the extension already provides
- No changes to `package.json`, `tsconfig.json`, or OpenSpec config
- No tests framework setup

## Decisions

### File placement: `extensions/spec-teams.ts`

The extension goes directly in `extensions/` alongside any future extensions. Pi's auto-discovery mechanism scans this directory for `.ts` files, so the filename doesn't need to be `index.ts`. Using the descriptive name `spec-teams.ts` is clearer than keeping the generic `index.ts`.

### Preserve the source file as-is

The extension is copied verbatim. It already imports correctly from peer dependencies (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) which are declared in `package.json`. No adjustments needed.

### No devDependencies or runtime setup

The extension's peer dependencies are already listed in `package.json`. Pi resolves them at runtime. No `npm install` or additional configuration is needed during development — the extension is tested via `pi -e` directly.

## Risks / Trade-offs

- [Risk: extension doesn't load] → Mitigation: verify with `pi -e ./extensions/spec-teams.ts -p "hello"` and confirm no errors
- [Risk: importing `Type` from `typebox` instead of `@earendil-works/pi-ai`] → Mitigation: both packages are listed as peer deps; Pi's official examples use both patterns interchangeably
