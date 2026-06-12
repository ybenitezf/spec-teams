/**
 * Pure utility functions for spec-teams. Extracted for testability.
 */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

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