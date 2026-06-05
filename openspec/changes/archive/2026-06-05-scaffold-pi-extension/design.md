# Design: Scaffold Pi Extension

## Project Structure

```
spec-teams-extension/
├── package.json              # npm + pi manifest
├── tsconfig.json             # TypeScript config (IDE support)
├── extensions/
│   └── index.ts              # Extension entry point
├── openspec/
│   ├── config.yaml           # Updated with project context
│   └── changes/
└── .pi/
    ├── skills/               # OpenSpec skills (existing)
    └── prompts/              # OpenSpec prompts (existing)
```

## Decisions

### package.json

- `name`: `spec-teams-extension` (from repo name)
- `keywords`: `["pi-package"]` for discoverability on npm
- `peerDependencies`: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, `typebox` — all with `"*"` range since Pi bundles these
- `pi.extensions`: `["./extensions"]` — points to the extensions directory for auto-discovery

### Extension entry point (`extensions/index.ts`)

- A minimal skeleton exporting a default function
- Uses `defineTool` pattern (consistent with examples like `hello.ts`)
- Registers no tools yet — just a placeholder that logs on session start for verification

### tsconfig.json

- Module: `ESNext`, moduleResolution: `bundler`
- Strict mode on
- `skipLibCheck: true` (peer deps aren't installed locally, so types come from Pi's runtime)

### OpenSpec context

- Update `config.yaml` with the tech stack for AI context when creating future artifacts
