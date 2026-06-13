/**
 * Pure utility functions for spec-teams. Extracted for testability.
 */

import { getAgentDir, type Skill } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

// ── OpenSpec Phase Configuration ───────────────

/** Static mapping of OpenSpec phases to their skill names (null = no skill). */
export const OPENSPEC_PHASES = [
	{ phase: "explore", label: "Explore", skillName: "openspec-explore" },
	{ phase: "propose", label: "Propose", skillName: "openspec-propose" },
	{ phase: "apply", label: "Apply", skillName: "openspec-apply-change" },
	{ phase: "verify", label: "Verify", skillName: null },
	{ phase: "archive", label: "Archive", skillName: "openspec-archive-change" },
] as const;

/** Availability status for an OpenSpec phase after checking skills. */
export interface PhaseAvailability {
	phase: string;
	label: string;
	skillName: string | null;
	available: boolean;
}

/**
 * Build phase availability array from Pi's skills list and agent names.
 *
 * For each entry in OPENSPEC_PHASES:
 * - If skillName is non-null and exists in the skills array (matched by skill.name), mark available: true
 * - If skillName is null but an agent matching the phase name exists in agentNames, mark available: true
 * - Otherwise mark available: false
 *
 * Handles null/undefined skills input by treating it as an empty array.
 */
export function buildOpenSpecPhases(skills: Skill[] | undefined | null, agentNames: string[] = []): PhaseAvailability[] {
	const skillNames = new Set((skills || []).map(s => s.name));
	const agentNameSet = new Set(agentNames.map(n => n.toLowerCase()));

	return OPENSPEC_PHASES.map(entry => {
		// Check if skill is available
		const hasSkill = entry.skillName !== null && skillNames.has(entry.skillName);
		
		// For phases without skills, check if a matching agent exists
		const hasAgent = entry.skillName === null && agentNameSet.has(entry.phase);
		
		return {
			phase: entry.phase,
			label: entry.label,
			skillName: entry.skillName,
			available: hasSkill || hasAgent,
		};
	});
}

// ── Explore Relay Signals ──────────────────────

/** Signal definitions for the Explore Relay Protocol. */
export const EXPLORE_SIGNALS = [
	{
		name: "need-input",
		description: "The explore agent has questions for the user — relay verbatim, wait for reply",
	},
	{
		name: "ready-to-propose",
		description: "Exploration done with brief — extract, relay summary, ask approval",
	},
	{
		name: "done-exploring",
		description: "No change needed — relay summary, return to normal",
	},
	{
		name: "blocked",
		description: "Cannot proceed — relay blocker, ask how to proceed",
	},
] as const;

// ── Types ────────────────────────────────────────

export interface AgentDef {
	name: string;
	description: string;
	tools: string;
	systemPrompt: string;
	file: string;
	thinking?: string;
	model?: string;
	optIn?: boolean;
}

export interface AgentState {
	def: AgentDef;
	status: "idle" | "running" | "done" | "error";
	task: string;
	toolCount: number;
	elapsed: number;
	lastWork: string;
	contextPct: number;
	sessionFile: string | null;
	runCount: number;
	timer?: ReturnType<typeof setInterval>;
	inputTokens: number;
	outputTokens: number;
	cost: number;
}

// ── isLocalPath ───────────────────────────────────

export function isLocalPath(p: string): boolean {
	return p.startsWith("./") || p.startsWith("../") || p.startsWith("/");
}

// ── displayName ──────────────────────────────────

export function displayName(name: string): string {
	return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── encodeCwd ────────────────────────────────────

export function encodeCwd(cwd: string): string {
	const stripped = cwd.replace(/^[\/\\]+/, "");
	const encoded = stripped.replace(/[\/\\:]/g, "-");
	return `--${encoded}--`;
}

// ── parseTeamsYaml ───────────────────────────────

export function parseTeamsYaml(raw: string): Record<string, string[]> {
	const teams: Record<string, string[]> = {};
	let current: string | null = null;
	for (const line of raw.split("\n")) {
		const teamMatch = line.match(/^(\S[^:]*):$/);
		if (teamMatch) {
			current = teamMatch[1].trim();
			teams[current] = [];
			continue;
		}
		const itemMatch = line.match(/^\s+-\s+(.+)$/);
		if (itemMatch && current) {
			teams[current].push(itemMatch[1].trim());
		}
	}
	return teams;
}

// ── formatDuration ───────────────────────────────

export function formatDuration(ms: number): string {
	if (ms < 1000) return "0s";
	const totalSecs = Math.floor(ms / 1000);
	const hours = Math.floor(totalSecs / 3600);
	const mins = Math.floor((totalSecs % 3600) / 60);
	const secs = totalSecs % 60;

	if (hours > 0) {
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}
	if (mins > 0) {
		return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
	}
	return `${secs}s`;
}

// ── formatTokens ─────────────────────────────────

export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

// ── detectStatusSignal ───────────────────────────

export function detectStatusSignal(text: string): { signal: string; line: string } | null {
	const match = text.match(/^Status:\s+(need-input|ready-to-propose|blocked|done-exploring|done)$/m);
	if (!match) return null;
	return { signal: match[1], line: match[0] };
}

// ── formatMetricsFooter ───────────────────────────

export function formatMetricsFooter(details: any): string {
	const parts: string[] = [];
	// Tool count
	const tc = typeof details.toolCount === "number" ? details.toolCount : 0;
	parts.push(`🔧 ${tc} call${tc !== 1 ? "s" : ""}`);
	// Input tokens
	if (typeof details.inputTokens === "number" && details.inputTokens > 0) {
		parts.push(`↑${formatTokens(details.inputTokens)}`);
	}
	// Output tokens
	if (typeof details.outputTokens === "number" && details.outputTokens > 0) {
		parts.push(`↓${formatTokens(details.outputTokens)}`);
	}
	// Cost — always show, even if 0
	const cost = typeof details.cost === "number" ? details.cost : 0;
	parts.push(cost === 0 ? "$0" : `$${cost.toFixed(4)}`);
	// Context %
	const pct = typeof details.contextPct === "number" ? Math.round(details.contextPct) : 0;
	parts.push(`ctx ${pct}%`);
	// Model — compact last-segment form, skip when absent
	if (details.model) {
		const shortModel = details.model.includes("/") ? details.model.split("/").pop() : details.model;
		parts.push(`🤖 ${shortModel}`);
	}
	return parts.join(" · ");
}

// ── splitOutputWithSignals ────────────────────────

export function splitOutputWithSignals(text: string): { type: "text" | "signal"; content: string; signalName?: string }[] {
	const pattern = /^(Status:\s+(need-input|ready-to-propose|blocked|done-exploring|done))$/gm;
	const segments: { type: "text" | "signal"; content: string; signalName?: string }[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
		}
		segments.push({ type: "signal", content: match[1], signalName: match[2] });
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < text.length) {
		segments.push({ type: "text", content: text.slice(lastIndex) });
	}
	return segments;
}

// ── computeColumns ────────────────────────────────

export function computeColumns(numAgents: number, width: number, maxCols: number): number {
	const MIN_CELL = 12;
	for (let cols = Math.min(maxCols, numAgents); cols >= 1; cols--) {
		const cellWidth = Math.floor((width - (cols - 1)) / cols);
		if (cellWidth >= MIN_CELL) return cols;
	}
	return 1;
}

// ── renderAgentCell ───────────────────────────────

export function renderAgentCell(state: AgentState, cellWidth: number, theme: any): string {
	const statusColor = state.status === "idle" ? "dim"
		: state.status === "running" ? "accent"
		: state.status === "done" ? "success" : "error";
	const statusIcon = state.status === "idle" ? "○"
		: state.status === "running" ? "●"
		: state.status === "done" ? "✓" : "✗";

	const iconStr = theme.fg(statusColor, statusIcon);
	const pctStr = `${Math.ceil(state.contextPct)}%`;
	const pctLen = pctStr.length;
	const name = displayName(state.def.name);

	// name budget: cellWidth - icon(1) - space(1) - space(1) - pctLen
	const nameBudget = cellWidth - 1 - 1 - 1 - pctLen;

	let result: string;
	if (nameBudget < 1) {
		// Narrow cell: drop percentage, just icon + truncated name
		result = iconStr + " " + truncateToWidth(name, Math.max(1, cellWidth - 2));
	} else {
		const truncatedName = truncateToWidth(name, nameBudget);
		result = iconStr + " " + truncatedName + " " + pctStr;
	}

	// Post-render safety guard: re-truncate if visible width exceeds target
	if (visibleWidth(result) > cellWidth) {
		result = truncateToWidth(result, cellWidth);
	}

	// Pad to exact cellWidth
	result = truncateToWidth(result, cellWidth, "", true);

	return result;
}

// ── parseAgentFile ────────────────────────────────

export function parseAgentFile(filePath: string): AgentDef | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) {
				frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		}

		if (!frontmatter.name) return null;

		const thinkingRaw = (frontmatter.thinking || "").toLowerCase().trim();

		// Valid thinking levels
		const VALID_THINKING = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

		let thinking: string;
		if (!thinkingRaw) {
			// Absent → default to "off"
			thinking = "off";
		} else if (VALID_THINKING.has(thinkingRaw)) {
			// Valid level → use as-is
			thinking = thinkingRaw;
		} else if (thinkingRaw === "on" || thinkingRaw === "true") {
			// Legacy boolean → map to "medium"
			thinking = "medium";
		} else if (thinkingRaw === "off" || thinkingRaw === "false") {
			// Legacy boolean → map to "off"
			thinking = "off";
		} else {
			// Unrecognized → warn and fall back to "medium"
			console.warn(`[spec-teams] Unrecognized thinking level "${thinkingRaw}" in ${filePath}. Falling back to "medium". Valid levels: off, minimal, low, medium, high, xhigh.`);
			thinking = "medium";
		}

		const model = frontmatter.model || undefined;

		// Extract opt-in field (case-insensitive match to "true")
		const optInRaw = (frontmatter["opt-in"] || "").toLowerCase().trim();
		const optIn = optInRaw === "true";

		return {
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools: frontmatter.tools || "read,grep,find,ls",
			systemPrompt: match[2].trim(),
			file: filePath,
			thinking,
			model,
			optIn,
		};
	} catch {
		return null;
	}
}

// ── scanAgentDirs ────────────────────────────────

/**
 * Scan for agent .md definition files from both project-level and user-level directories.
 *
 * Scan order (project-first precedence on name collisions):
 *   1. <cwd>/agents/
 *   2. <cwd>/.claude/agents/
 *   3. <cwd>/.pi/agents/
 *   4. <getAgentDir()>/agents/        (~/.pi/agent/agents/ by default)
 *   5. <homedir()>/.agents/agents/
 *
 * When two agents share the same name (case-insensitive), the first one found
 * (project-level) wins and the later (user-level) is silently ignored.
 */
export function scanAgentDirs(cwd: string): AgentDef[] {
	const dirs = [
		join(cwd, "agents"),
		join(cwd, ".claude", "agents"),
		join(cwd, ".pi", "agents"),
		// User-level directories (scanned after project dirs so project wins collisions)
		join(getAgentDir(), "agents"),
		join(homedir(), ".agents", "agents"),
	];

	const agents: AgentDef[] = [];
	const seen = new Set<string>();

	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		try {
			for (const file of readdirSync(dir)) {
				if (!file.endsWith(".md")) continue;
				const fullPath = resolve(dir, file);
				const def = parseAgentFile(fullPath);
				if (def && !seen.has(def.name.toLowerCase())) {
					seen.add(def.name.toLowerCase());
					agents.push(def);
				}
			}
		} catch {}
	}

	return agents;
}

// ── System Prompt Segment Builders ─────────────

/**
 * Build the static Identity section for the dispatcher agent.
 */
export function buildIdentitySegment(): string {
	return `You are an OpenSpec-aware dispatcher agent.
You coordinate specialist agents to accomplish tasks within the
OpenSpec spec-driven workflow. You do NOT have direct access to
the codebase — you MUST delegate ALL work through agents using
the dispatch_agent tool.`;
}

/**
 * Build the Team Configuration section with active team name and dispatchable agent list.
 */
export function buildTeamConfigSegment(activeTeamName: string, teamMembers: string): string {
	return `## Active Team: ${activeTeamName}
Members: ${teamMembers}
You can ONLY dispatch to agents listed below. Do not attempt to
dispatch to agents outside this team.`;
}

/**
 * Build the Lifecycle section with one block per available phase.
 *
 * Each block contains routing heuristics and skill references ONLY —
 * NO "Identity" descriptions or role descriptions that paraphrase skill content.
 * Uses agent-catalog-matching language ("dispatch the most suitable available agent").
 *
 * When no phases are available, returns a short explanation that the
 * OpenSpec workflow is unavailable.
 */
export function buildLifecycleSegment(phases: PhaseAvailability[], _agentNames: string[]): string {
	const availablePhases = phases.filter(p => p.available);

	if (availablePhases.length === 0) {
		return `## OpenSpec Workflow Unavailable

No OpenSpec skills are currently available. The lifecycle phases
(explore, propose, apply, verify, archive) require their respective
skills to be installed. Install the following skills:
- openspec-explore
- openspec-propose
- openspec-apply-change
- openspec-archive-change

Check your .pi/skills/ directory or install OpenSpec to enable these capabilities.`;
	}

	const blocks: string[] = [];

	for (const phase of phases) {
		if (!phase.available) {
			blocks.push(`### ${phase.label} — Not Available\n\nThe ${phase.label.toLowerCase()} phase is not available because its skill is not installed.`);
			continue;
		}

		switch (phase.phase) {
			case "explore":
				blocks.push(`### Explore — Investigate and Clarify\n\n**Route when:**
- Requirements are unclear or vague
- The user wants to explore or think through an idea
- You need to investigate the codebase before planning
- The user is stuck or uncertain about the right approach
- The user asks to explore an existing change

**Workflow:**
- Dispatch the most suitable available agent for exploration with the user's message as the task
- The agent runs multi-turn through the relay protocol (see ## Explore Relay Protocol below)
- One clear, focused topic per exploration session
- When the agent returns \`ready-to-propose\`, extract the structured brief and present to user for approval before dispatching propose
- When the agent returns \`done-exploring\`, relay summary to user
- If the ${phase.skillName} skill is available, instruct the agent to follow it`);
				break;

			case "propose":
				blocks.push(`### Propose — Formalize into Artifacts\n\n**Route when:**
- Exploration has crystallized into clear, agreed-upon decisions
- The user has a clear goal and wants a formal change proposal
- A structured brief exists (change name, problem, approach, scope, constraints)
- Design issues found during implementation need a formal proposal

**Workflow:**
- Pass a structured brief (change name, problem, approach, scope, constraints) — not an open-ended investigation
- Do NOT re-investigate settled questions that the brief answers
- After propose completes, verify artifacts were created
- The change is now ready for apply
- Instruct the agent to follow the \`${phase.skillName}\` skill`);
				break;

			case "apply":
				blocks.push(`### Apply — Implement Tasks\n\n**Route when:**
- The user wants to implement or make changes
- Tasks are defined in an OpenSpec change
- Small or trivial change (skip explore and propose)
- Verification found issues that need fixing

**Workflow:**
- Dispatch the most suitable available agent for apply with the change name
- One clear objective per dispatch
- Evaluate results before dispatching the next agent
- If a task fails, retry with a different agent or rephrase the task
- Instruct the agent to follow the \`${phase.skillName}\` skill`);
				break;

			case "verify":
				blocks.push(`### Verify — Audit and Validate\n\n**Route when:**
- Implementation reports complete
- The user wants to validate correctness before archiving
- You need a pre-archive quality check

**Workflow:**
- After apply completes, dispatch the most suitable available agent for verification before suggesting archive
- If verification finds issues → route back to apply with specific fixes
- If verification is clean → ask the user for approval to archive
- Instruct the agent to perform read-only inspection and report findings`);
				break;

			case "archive":
				blocks.push(`### Archive — Finalize and Move\n\n**Route when:**
- User explicitly approves archive after clean verification
- CRITICAL: NEVER dispatch archive without explicit user approval.
  Archiving is irreversible — always ask the user.

**Workflow:**
- Dispatch the most suitable available agent for archive with the change name and instruction to sync
- After archive completes, summarize the outcome for the user
- Instruct the agent to follow the \`${phase.skillName}\` skill`);
				break;
		}
	}

	return `## OpenSpec Lifecycle\n\nOpenSpec is organized around five activities. Each phase below describes when to route to the corresponding specialist and workflow expectations. Match the user's intent to the phase that best fits their current activity.\n\n${blocks.join("\n\n")}`;
}

/**
 * Build the Explore Relay Protocol section.
 *
 * This section is ALWAYS present (never returns empty string), even when
 * no OpenSpec skills exist. It includes:
 * - Signal definitions from EXPLORE_SIGNALS with per-signal handling instructions
 * - Task injection instruction — inject signal definitions into task strings
 * - Conditional skill reference — only when openspec-explore skill is present
 */
export function buildExploreRelaySegment(phases: PhaseAvailability[]): string {
	const hasExploreSkill = phases.some(p => p.phase === "explore" && p.available);

	const signalDescriptions = EXPLORE_SIGNALS.map(s => {
		let handler = "";
		switch (s.name) {
			case "need-input":
				handler = "Relay the full explore response to the user verbatim (include analysis, diagrams, questions). Wait for the user's reply. When the user replies, dispatch the most suitable available agent for exploration again with the user's message as the task.";
				break;
			case "ready-to-propose":
				handler = "Extract the structured brief (change name, problem, approach, scope, constraints) from the explore response. Relay a summary of the Change Brief to the user. Ask the user for explicit approval before dispatching the most suitable available agent for propose. If the user approves, dispatch the most suitable available agent for propose with the structured brief as the task. If the user declines, report that exploration ended without a proposal and return to normal operation. Do NOT dispatch an agent for propose without user confirmation.";
				break;
			case "done-exploring":
				handler = "Relay the summary to the user. Return to normal operation — no further dispatch needed.";
				break;
			case "blocked":
				handler = "Relay the blocker description to the user. Ask the user how they'd like to proceed.";
				break;
		}
		return `- **"${s.name}"** — ${s.description}\n  ${handler}`;
	}).join("\n");

	const skillRef = hasExploreSkill ? "If the openspec-explore skill is available, instruct the agent to follow it. " : "";

	return `## Explore Relay Protocol\n\nWhen you dispatch an agent for exploration, it may engage in multi-turn conversation through you. Follow the signal-based relay protocol below. Sub-agents return a structured status block. Inspect the \`Status:\` field to determine the next action.\n\n${signalDescriptions}\n\n### Task Injection Instruction\n\nWhen dispatching for exploration, inject the signal definitions above into the task string so any agent can participate in the relay protocol. Include them as context about what signals mean and how the dispatcher will handle them.\n\n### Multi-Turn Flow Example\n\n    User: "I'm thinking about adding dark mode"
      → Dispatch the most suitable available agent for exploration with the task "I'm thinking about adding dark mode"

    Agent: [investigates codebase, returns need-input with questions]
      → Relay to user verbatim

    User: "Yes, system-wide with automatic detection"
      → Dispatch the most suitable available agent for exploration again with the user's message as the task

    Agent: [returns ready-to-propose with change brief]
      → Extract brief, relay summary to user
      → Ask user for explicit approval
      → User approves (may modify brief)
      → Dispatch the most suitable available agent for propose with the structured brief

Exploration may return "need-input" multiple times as the conversation develops. Each time, relay verbatim and wait for user response. There is no limit on exploration turns.\n\n${skillRef.trim()}`;
}

/**
 * Build the General Tasks section listing non-OpenSpec agents.
 *
 * Identifies non-OpenSpec agents (agents whose name does NOT match any
 * OpenSpec phase name). Lists each with its name and description.
 * Includes Worker Status Signals guidance if worker is on the team.
 * Includes Worker Hand-off guidance if worker is on the team.
 *
 * Returns empty string when no non-OpenSpec agents exist.
 */
export function buildGeneralTasksSegment(agentStates: Map<string, {def: {name: string; description: string}}>, phases: PhaseAvailability[]): string {
	// Get OpenSpec phase names for filtering
	const openspecPhaseNames = new Set(phases.map(p => p.phase));

	// Filter to non-OpenSpec agents
	const nonOpenspecAgents = Array.from(agentStates.values()).filter(
		state => !openspecPhaseNames.has(state.def.name.toLowerCase())
	);

	if (nonOpenspecAgents.length === 0) {
		return "";
	}

	const agentList = nonOpenspecAgents.map(a => {
		return `- **${displayName(a.def.name)}** (\`${a.def.name}\`) — ${a.def.description}`;
	}).join("\n");

	// Check if worker is among non-OpenSpec agents
	const hasWorker = nonOpenspecAgents.some(a => a.def.name === "worker");

	const workerSections = hasWorker ? `
## Worker Status Signals

The worker agent concludes responses with a "Status:" block using
two possible signals:

**"Status: done"** — The task was completed successfully.
- Review the output
- Summarize what was accomplished for the user

**"Status: blocked"** — The worker encountered an unrecoverable issue.
- Present the blocker description to the user
- Ask the user how they would like to proceed (retry, explore, abandon)

Do NOT treat worker status signals as multi-turn relay signals.
Worker always returns either done or blocked — there is no back-and-forth.

## Worker Hand-off

When the worker agent completes a task, review its output for patterns
that suggest an OpenSpec workflow might be warranted:

- **Complexity uncovered** — The implementation revealed deeper issues
  or interconnected concerns that warrant formal exploration.
- **Architectural concerns** — The task touched foundational design
  decisions that should be documented and reviewed.
- **Multi-component changes** — The fix requires changes across
  multiple components, services, or systems.
- **Repeated similar tasks** — The user is making many similar changes
  that could benefit from a structured change proposal.

If you detect such patterns, suggest to the user that an OpenSpec
exploration or proposal may be warranted. Describe what you found
and why it merits formal treatment.

**CRITICAL**: You SHALL NOT automatically dispatch an explore or
propose agent without explicit user confirmation. Present your
observation and let the user decide.` : "";

	return `## General Tasks\n\nSome user requests are NOT part of the OpenSpec workflow. These are general task execution requests that should be routed to the appropriate agent rather than an OpenSpec specialist:\n\n- **Git operations** — commit, branch, diff, rebase, pushing, pull requests
- **File operations** — cleanup, rename, reorganize, search, replace
- **Quick scripts** — one-off scripts, data transformations, automation
- **Web requests** — fetch URLs, API calls, download files
- **One-off edits** — quick fixes, typos, small refactors that don't warrant a full OpenSpec lifecycle
- **CLI operations** — running commands, checking status, installing packages

When you receive such a request, dispatch the appropriate agent directly. Do NOT route non-OpenSpec tasks to explore or any OpenSpec agent.

## Available Non-OpenSpec Agents

${agentList}${workerSections}`;
}

/**
 * Build the Rules section (static).
 */
export function buildRulesSegment(): string {
	return `## Rules\n\n- NEVER try to read, write, or execute code directly — you have no such tools
- ALWAYS use dispatch_agent to get work done
- Before dispatching, check the ## Agents catalog to confirm the agent has the tools required for the task (e.g., write and edit for implementation, read and grep for investigation, bash for running commands)
- You can dispatch the same agent multiple times with different tasks
- Keep tasks focused — one clear objective per dispatch
- Summarize the outcome for the user, including which activity was used`;
}

/**
 * Build the Agent Catalog section from agent states (unchanged from original logic).
 */
export function buildAgentCatalogSegment(agentStates: Map<string, {def: {name: string; description: string; tools: string}}>): string {
	const catalog = Array.from(agentStates.values())
		.map(s => `### ${displayName(s.def.name)}\n**Dispatch as:** \`${s.def.name}\`\n${s.def.description}\n**Tools:** ${s.def.tools}`)
		.join("\n\n");

	return `## Agents\n\n${catalog}`;
}