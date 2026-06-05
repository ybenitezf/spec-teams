# OpenSpec Research

> Generated 2026-06-05 from [github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)

---

## 1. What Is OpenSpec?

OpenSpec is a **lightweight, open-source, spec-driven development (SDD) framework** for AI coding assistants. It adds a structured specification layer to AI-assisted coding so humans and AI agents align on *what* to build *before* any code is written.

**Core philosophy:**

```text
→ fluid not rigid         — no phase gates, work on what makes sense
→ iterative not waterfall — learn as you build, refine as you go
→ easy not complex        — lightweight setup, minimal ceremony
→ brownfield-first        — works with existing codebases, not just greenfield
```

**Key differentiators vs. alternatives:**

| | OpenSpec | Spec Kit (GitHub) | Kiro (AWS) |
|---|---|---|---|
| **Weight** | Lightweight | Heavyweight (Python, ceremony) | Moderate |
| **Phase gates** | None — fluid actions | Rigid phase gates | Fixed workflow |
| **Tool lock-in** | 25+ assistants via slash commands | Limited | Kiro IDE only |
| **Model lock-in** | Any model | Any model | Claude only |
| **Format** | Plain Markdown | Lots of Markdown | Proprietary |
| **OSS** | Yes (MIT) | Yes | No |

---

## 2. Architecture: Specs vs. Changes

OpenSpec organizes work into two areas:

```
openspec/
├── specs/                    ← Source of truth
│   ├── auth/spec.md          ← How the system currently behaves
│   └── payments/spec.md
│
├── changes/                  ← Proposed modifications
│   └── add-dark-mode/        ← One folder per change
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       ├── specs/            ← Delta specs (ADDED/MODIFIED/REMOVED)
│       │   └── ui/spec.md
│       └── .openspec.yaml    ← Change metadata
│
├── config.yaml               ← Project config (context, rules, schema)
└── schemas/                  ← Custom workflow schemas (optional)
    └── my-workflow/
        ├── schema.yaml
        └── templates/
```

**The delta pattern:** Changes don't overwrite main specs — they declare deltas:

```markdown
# Delta for Auth
## ADDED Requirements
### Requirement: Two-Factor Authentication
...

## MODIFIED Requirements
### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes.
(Previously: 60 minutes)

## REMOVED Requirements
### Requirement: Remember Me
```

On archive, ADDED → appended, MODIFIED → replaced, REMOVED → deleted from `specs/`.

---

## 3. Artifacts (the `spec-driven` schema)

Each change folder contains up to 4 artifacts. They build on each other:

```
proposal ──► specs ──► design ──► tasks ──► implement
   ▲           ▲          ▲                    │
   └───────────┴──────────┴────────────────────┘
            update anytime as you learn
```

| Artifact | File | Content | Key Question |
|---|---|---|---|
| **proposal** | `proposal.md` | Intent, scope, approach, impact | **Why and what?** |
| **specs** | `specs/<domain>/spec.md` | Requirements with scenarios (delta) | **What exactly changes?** |
| **design** | `design.md` | Technical approach, architecture, tradeoffs | **How will we build it?** |
| **tasks** | `tasks.md` | Implementation checklist with checkboxes | **What steps to take?** |

### Spec Format

```markdown
# Auth Specification
## Purpose
Authentication and session management.

## Requirements
### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials
- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued
```

RFC 2119 keywords: **MUST/SHALL** (absolute), **SHOULD** (recommended), **MAY** (optional).

**What belongs in specs:** Observable behavior, inputs/outputs, error conditions, external constraints, testable scenarios.

**What does NOT:** Internal class/function names, library choices, step-by-step implementation details (those go in design.md or tasks.md).

---

## 4. Profiles & Commands

### Core Profile (default)

5 commands for the quick path:

```
/opsx:propose ──► /opsx:apply ──► /opsx:sync ──► /opsx:archive
     │
/opsx:explore (can be used anytime)
```

| Command | What it does |
|---|---|
| `/opsx:propose [name]` | Creates change + all planning artifacts in one step |
| `/opsx:explore [topic]` | Freeform investigation, no artifacts created |
| `/opsx:apply [name]` | Implements tasks from tasks.md, checks off items |
| `/opsx:sync [name]` | Merges delta specs into main specs (optional — archive handles it) |
| `/opsx:archive [name]` | Finalizes, syncs if needed, moves to `archive/YYYY-MM-DD-name/` |

### Expanded Workflow (custom selection)

6 additional commands for step-by-step control:

| Command | What it does |
|---|---|
| `/opsx:new [name]` | Scaffold change folder only (creates `.openspec.yaml`) |
| `/opsx:continue [name]` | Create next artifact in dependency order, one at a time |
| `/opsx:ff [name]` | Fast-forward: create all planning artifacts at once |
| `/opsx:verify [name]` | Validate implementation against artifacts (completeness, correctness, coherence) |
| `/opsx:bulk-archive` | Archive multiple changes, handling spec conflicts |
| `/opsx:onboard` | Interactive tutorial through the full workflow |

Enable via: `openspec config profile` → select workflows → `openspec update`

### Command Syntax by Tool

| Tool | Format |
|---|---|
| Claude Code | `/opsx:propose` |
| Cursor / Windsurf / Copilot | `/opsx-propose` |
| Pi | Skill-based (`.pi/skills/openspec-propose/SKILL.md`) |

---

## 5. CLI Reference

The `openspec` CLI complements the slash commands. Key commands:

| Category | Key Commands |
|---|---|
| **Setup** | `openspec init`, `openspec update` |
| **Changes** | `openspec list`, `openspec show`, `openspec validate` |
| **Lifecycle** | `openspec archive` |
| **Schemas** | `openspec schema init/fork/validate/which` |
| **Config** | `openspec config` |
| **Workspaces** | `openspec workspace setup/list/link/relink/doctor/update/open` (beta) |
| **Context stores** | `openspec context-store setup/register/list` (beta) |
| **Initiatives** | `openspec initiative create/show/list` (beta) |

Many CLI commands support `--json` for agent/script consumption.

---

## 6. Workflow Patterns

### Quick Feature (`core` path)

```
/opsx:propose → /opsx:apply → /opsx:archive
```
Best for small-to-medium features, bug fixes, straightforward changes.

### Exploratory (`explore` first)

```
/opsx:explore → /opsx:propose (or /opsx:new) → /opsx:apply → /opsx:archive
```
Best when requirements are unclear, need investigation, comparing options.

### Step-by-Step (`expanded` path)

```
/opsx:new → /opsx:continue → /opsx:continue → /opsx:apply → /opsx:verify → /opsx:archive
```
Best for complex changes where you want to review each artifact.

### Parallel Changes

Work on multiple changes simultaneously, context-switching between them:

```
Change A: /opsx:propose → /opsx:apply (in progress)
                              │ context switch
Change B: /opsx:propose → /opsx:apply → /opsx:archive
                              │ back
Change A: /opsx:apply → /opsx:archive
```

### Verify Before Archive

`/opsx:verify` checks three dimensions:

| Dimension | Validates |
|---|---|
| **Completeness** | All tasks done, all requirements implemented, scenarios covered |
| **Correctness** | Implementation matches spec intent, edge cases handled |
| **Coherence** | Design decisions reflected in code, patterns consistent |

---

## 7. Customization

### Level 1: Project Config (`openspec/config.yaml`)

```yaml
schema: spec-driven
context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
rules:
  proposal:
    - Include rollback plan
    - Keep under 500 words
  specs:
    - Use Given/When/Then format
```

Context is injected into ALL artifact instructions. Rules only for matching artifacts.

### Level 2: Custom Schemas

Fork the default or create from scratch:

```bash
openspec schema fork spec-driven my-workflow
```

Define custom artifacts, dependencies, templates, and instructions:

```yaml
# openspec/schemas/my-workflow/schema.yaml
name: my-workflow
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    template: proposal.md
    instruction: "Create a proposal..."
    requires: []
  - id: review        # Custom artifact
    generates: review.md
    template: review.md
    requires: [design]
  - id: tasks
    generates: tasks.md
    requires: [specs, design, review]
apply:
  requires: [tasks]
  tracks: tasks.md
```

### Level 3: Global Overrides

Share schemas across all projects via `~/.local/share/openspec/schemas/`.

### Schema Resolution Order

1. CLI flag: `--schema <name>`
2. Change metadata (`.openspec.yaml`)
3. Project config (`openspec/config.yaml`)
4. Default: `spec-driven`

---

## 8. Key Concepts

### Actions, Not Phases

Traditional workflows lock you into phases. OpenSpec treats commands as **actions** you can do anytime — not stages you're stuck in.

```
Traditional: PLANNING → IMPLEMENTING → DONE  (can't go back)
OPSX:        proposal → specs → design → tasks → implement  (fluid)
```

### Dependencies Are Enablers

Dependency graphs show what's *possible*, not what's *required*. You can jump around.

### Update vs. New Change

When does refinement become "different work"?

| Test | Update existing | Start new |
|---|---|---|
| **Identity** | Same thing, refined | Different work |
| **Scope overlap** | >50% overlap | <50% overlap |
| **Completion** | Can't finish without changes | Original can be "done" first |

### Brownfield-First

OpenSpec is designed for modifying existing systems. The delta-based approach (ADDED/MODIFIED/REMOVED) makes it natural to specify changes to existing behavior, not just describe greenfield systems.

---

## 9. File Inventory (what gets created)

After `openspec init`:

```
project/
├── openspec/
│   ├── config.yaml              ← Project config
│   ├── specs/                   ← Empty, ready for specs
│   └── changes/                 ← Empty, ready for changes
├── .claude/skills/              ← Claude Code skills (if selected)
│   ├── openspec-propose/SKILL.md
│   ├── openspec-explore/SKILL.md
│   ├── openspec-apply-change/SKILL.md
│   └── openspec-archive-change/SKILL.md
├── .pi/skills/                  ← Pi skills (if selected)
│   ├── openspec-propose/SKILL.md
│   ├── openspec-explore/SKILL.md
│   ├── openspec-apply-change/SKILL.md
│   └── openspec-archive-change/SKILL.md
├── .pi/prompts/                 ← Pi prompt templates (if selected)
│   ├── opsx-propose.md
│   ├── opsx-explore.md
│   ├── opsx-apply.md
│   └── opsx-archive.md
└── .cursor/                     ← Cursor skills/commands (if selected)
```

After a change is created (`/opsx:propose add-dark-mode`):

```
openspec/changes/add-dark-mode/
├── .openspec.yaml
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    └── <domain>/
        └── spec.md              ← Delta spec
```

After archiving:

```
openspec/changes/archive/2026-01-23-add-dark-mode/   ← Moved here
openspec/specs/<domain>/spec.md                      ← Deltas merged
```

---

## 10. Workspaces (Beta)

For multi-repo coordination. A workspace is a local view over linked repos/folders:

```yaml
# .openspec-workspace/view.yaml
name: platform
context:
  kind: initiative
  store:
    id: platform
  initiative:
    id: billing-launch
links:
  api: /repos/api
  web: /repos/web
```

Useful commands: `openspec workspace setup/list/link/doctor/update/open`

---

## 11. How This Relates to spec-teams-extension

### Current State

The spec-teams-extension already:
- Embeds OpenSpec lifecycle knowledge (explore → propose → apply → archive) in the dispatcher's system prompt
- Routes user requests to agents based on phase-to-role heuristics
- Has OpenSpec skills/commands scaffolded in `.pi/`

### Key Integration Points for Agent Teams

1. **Each agent role maps to OpenSpec phases:**
   - **explore** → agents focused on investigation, research, codebase analysis
   - **propose** → agents focused on design, architecture, planning
   - **apply** → agents focused on implementation, coding, editing
   - **archive** → agents focused on review, audit, validation

2. **Agents need to understand OpenSpec artifacts** — an "apply" agent should know to read `tasks.md`, check off checkboxes, and update `design.md` if implementation diverges.

3. **The dispatcher orchestrates the full lifecycle** — it chains agents across phases, validates results, and ensures artifacts are consistent.

4. **Skills are already available** — the `.pi/skills/openspec-*` directories contain detailed instructions for each phase. These should inform agent system prompts.

5. **Custom schemas could be valuable** — teams could define their own artifact workflows (e.g., adding a "review" step) via `openspec/schemas/`.

### Open Questions for Agent Design

- Should each specialist agent have the OpenSpec skill for its phase embedded in its system prompt?
- Should the dispatcher know about `openspec/config.yaml` context to inject into agent dispatches?
- How should agents handle delta spec creation/merging?
- Should agents use the `openspec` CLI directly (via `bash` tool) or manipulate files manually?
- How does `openspec validate` fit into the verify phase?

---

## 12. Resources

- **GitHub:** https://github.com/Fission-AI/OpenSpec
- **Website:** https://openspec.dev
- **Docs hub:** https://openspec.pro
- **Discord:** https://discord.gg/YctCnvvshC
- **npm:** `npm install -g @fission-ai/openspec`
- **Maintainer:** @0xTab on X
