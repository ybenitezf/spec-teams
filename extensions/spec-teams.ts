/**
 * Spec Teams — OpenSpec-aware dispatcher-orchestrator with compact dashboard
 *
 * The primary Pi agent can delegate work to specialist agents via the
 * `dispatch_agent` tool. Each specialist maintains its own Pi session
 * for cross-invocation memory.
 *
 * The dispatcher system prompt embeds OpenSpec lifecycle knowledge (explore →
 * propose → apply → archive) so it can intelligently route user requests to
 * the right specialist agents based on workflow phase.
 *
 * Loads agent definitions from project-level (agents/*.md, .claude/agents/*.md, .pi/agents/*.md)
 * and user-level (<getAgentDir()>/agents/, ~/.agents/agents/) directories.
 * Teams are defined in .pi/agents/teams.yaml — on boot a select dialog lets
 * you pick which team to work with. Only team members are available for dispatch.
 *
 * Commands:
 *   /specs-team           — switch active team
 *   /specs-list           — list loaded agents
 *   /specs-grid           — set grid columns for dashboard widget (1-6, default 3)
 *
 * Usage: pi -e extensions/spec-teams.ts
 */

import { type ExtensionAPI, getMarkdownTheme, getAgentDir, parseArgs, SettingsManager } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Box, Text, truncateToWidth, visibleWidth, Container, Markdown, Spacer } from "@earendil-works/pi-tui";
import { spawn } from "child_process";
import { readdirSync, readFileSync, existsSync, mkdirSync, unlinkSync, realpathSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

// ── Extension path parsing ──────────────────────

// Parse -e/--extension paths from parent process CLI args at module init.
// This captures explicitly-loaded extension paths once and stores them for
// forwarding to sub-agent processes.
const parsedArgs = parseArgs(process.argv.slice(2));
const rawExtensionPaths: string[] = parsedArgs.extensions || [];

// Helper: check if a path looks local (relative or absolute file path)
function isLocalPath(p: string): boolean {
	return p.startsWith("./") || p.startsWith("../") || p.startsWith("/");
}

// Resolve, normalize, and filter out the spec-teams extension itself.
// If self-identification fails, forward all parsed paths without filtering.
let forwardedExtensions: string[];
try {
	const selfPath = realpathSync(fileURLToPath(import.meta.url));
	forwardedExtensions = rawExtensionPaths
		.map((raw: string) => {
			if (isLocalPath(raw)) {
				// Resolve relative paths to absolute and normalize symlinks
				return realpathSync(resolve(process.cwd(), raw));
			}
			// Package-name extensions (non-local) pass through unresolved
			return raw;
		})
		.filter((resolved: string) => resolved !== selfPath);
} catch {
	// If import.meta.url or realpathSync throws, skip filtering and forward all
	forwardedExtensions = [...rawExtensionPaths];
}

// ── Extension flag forwarding ──────────────────

// Reconstruct unknown CLI flags for forwarding to sub-agents.
// Only forward when --no-extensions is active (safe invariant: all unknown
// flags came from explicitly-loaded -e extensions that are also forwarded).
const forwardedFlags: string[] = (() => {
	if (parsedArgs.noExtensions !== true) return [];
	const flags: string[] = [];
	if (parsedArgs.unknownFlags) {
		for (const [flag, value] of parsedArgs.unknownFlags) {
			if (typeof value === "string") {
				flags.push(`--${flag}=${value}`);
			} else if (value === true) {
				flags.push(`--${flag}`);
			}
		}
	}
	if (flags.length > 0) {
		console.log(`[spec-teams] Forwarding extension flags to sub-agents: ${flags.join(" ")}`);
	}
	return flags;
})();

// ── Types ────────────────────────────────────────

interface AgentDef {
	name: string;
	description: string;
	tools: string;
	systemPrompt: string;
	file: string;
	thinking?: string;
	model?: string;
	optIn?: boolean;
}

interface AgentState {
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

// ── Display Name Helper ──────────────────────────

function displayName(name: string): string {
	return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Cwd Encoding ────────────────────────────────

function encodeCwd(cwd: string): string {
	const stripped = cwd.replace(/^[\/\\]+/, "");
	const encoded = stripped.replace(/[\/\\:]/g, "-");
	return `--${encoded}--`;
}

// ── Teams YAML Parser ────────────────────────────

function parseTeamsYaml(raw: string): Record<string, string[]> {
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

// ── Duration Formatting Helper ─────────────────

function formatDuration(ms: number): string {
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

// ── Token Formatting Helper ──────────────────────

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

// ── Status Signal Detection ──────────────────────

function detectStatusSignal(text: string): { signal: string; line: string } | null {
	const match = text.match(/^Status:\s+(need-input|ready-to-propose|blocked|done-exploring|done)$/m);
	if (!match) return null;
	return { signal: match[1], line: match[0] };
}

// ── Metrics Footer Formatting ────────────────────

function formatMetricsFooter(details: any): string {
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

// ── Frontmatter Parser ───────────────────────────

function parseAgentFile(filePath: string): AgentDef | null {
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
function scanAgentDirs(cwd: string): AgentDef[] {
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

// ── Extension ────────────────────────────────────

export default function (pi: ExtensionAPI) {
	const agentStates: Map<string, AgentState> = new Map();
	let allAgentDefs: AgentDef[] = [];
	let teams: Record<string, string[]> = {};
	let activeTeamName = "";
	let widgetCtx: any;
	let sessionDir = "";
	let contextWindow = 0;
	let maxColumns = 3;
	let hideThinkingBlockSetting = false;

	// ── Refresh Status Helper ────────────────────────

	function refreshStatus() {
		const ctx = widgetCtx;
		if (!ctx) return;

		// ── Dispatcher session totals from branch ──
		let dispatcherInput = 0;
		let dispatcherOutput = 0;
		let dispatcherCost = 0;
		let dispatcherToolCalls = 0;

		const branch = ctx.sessionManager?.getBranch();
		if (branch) {
			for (const entry of branch) {
				if (entry.type === "message" && entry.message?.role === "assistant") {
					const u = (entry.message as any).usage;
					if (u) {
						dispatcherInput += u.input || 0;
						dispatcherOutput += u.output || 0;
						dispatcherCost += u.cost?.total || 0;
					}
				} else if (entry.type === "tool" && entry.tool?.name === "dispatch_agent") {
					dispatcherToolCalls++;
				}
			}
		}

		// ── Subagent totals from agentStates Map ──
		let subagentInput = 0;
		let subagentOutput = 0;
		let subagentCost = 0;
		let subagentToolCalls = 0;

		for (const state of agentStates.values()) {
			subagentInput += state.inputTokens || 0;
			subagentOutput += state.outputTokens || 0;
			subagentCost += state.cost || 0;
			subagentToolCalls += state.toolCount || 0;
		}

		// ── Combined totals ──
		const combinedInput = dispatcherInput + subagentInput;
		const combinedOutput = dispatcherOutput + subagentOutput;
		const combinedCost = dispatcherCost + subagentCost;
		const combinedToolCalls = dispatcherToolCalls + subagentToolCalls;

		// ── Build details object ──
		const contextPct = ctx.getContextUsage()?.percent;
		const modelId = ctx.model?.id;
		const details = {
			toolCount: combinedToolCalls,
			inputTokens: combinedInput,
			outputTokens: combinedOutput,
			cost: combinedCost,
			contextPct,
			model: modelId,
		};

		// ── Status string: styled prefix + metrics + team name ──
		const metrics = formatMetricsFooter(details);
		const prefix = "\x1b[1m\x1b[36m👥 spec-team\x1b[0m";
		const statusString = `${prefix}  ${metrics} · ${activeTeamName}`;

		ctx.ui.setStatus("spec-team", statusString);
	}

	function loadAgents(cwd: string) {
		// Create session storage dir
		sessionDir = join(homedir(), ".pi", "spec-teams", encodeCwd(cwd));
		if (!existsSync(sessionDir)) {
			mkdirSync(sessionDir, { recursive: true });
		}

		// Load all agent definitions
		allAgentDefs = scanAgentDirs(cwd);

		// Load teams from .pi/agents/teams.yaml
		const teamsPath = join(cwd, ".pi", "agents", "teams.yaml");
		if (existsSync(teamsPath)) {
			try {
				teams = parseTeamsYaml(readFileSync(teamsPath, "utf-8"));
			} catch {
				teams = {};
			}
		} else {
			teams = {};
		}

		// If no teams defined, create a default "all" team excluding opt-in agents
		if (Object.keys(teams).length === 0) {
			teams = { all: allAgentDefs.filter(d => !d.optIn).map(d => d.name) };
		}
	}

	function activateTeam(teamName: string) {
		activeTeamName = teamName;
		const members = teams[teamName] || [];
		const defsByName = new Map(allAgentDefs.map(d => [d.name.toLowerCase(), d]));

		agentStates.clear();
		for (const member of members) {
			const def = defsByName.get(member.toLowerCase());
			if (!def) continue;
			const key = def.name.toLowerCase().replace(/\s+/g, "-");
			const sessionFile = join(sessionDir, `${key}.json`);
			agentStates.set(def.name.toLowerCase(), {
				def,
				status: "idle",
				task: "",
				toolCount: 0,
				elapsed: 0,
				lastWork: "",
				contextPct: 0,
				sessionFile: existsSync(sessionFile) ? sessionFile : null,
				runCount: 0,
				inputTokens: 0,
				outputTokens: 0,
				cost: 0,
			});
		}

	}

	// ── Grid Column Computation ──────────────────

	function computeColumns(numAgents: number, width: number, maxCols: number): number {
		const MIN_CELL = 12;
		for (let cols = Math.min(maxCols, numAgents); cols >= 1; cols--) {
			const cellWidth = Math.floor((width - (cols - 1)) / cols);
			if (cellWidth >= MIN_CELL) return cols;
		}
		return 1;
	}

	// ── Compact Grid Cell Rendering ──────────────

	function renderAgentCell(state: AgentState, cellWidth: number, theme: any): string {
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

	function updateWidget() {
		if (!widgetCtx) return;

		widgetCtx.ui.setWidget("spec-team", (_tui: any, theme: any) => {
			return {
				render(width: number): string[] {
					if (agentStates.size === 0) {
						return [theme.fg("dim", "No agents found. Add .md files to agents/ or user-level agent dirs")];
					}
					const agents = Array.from(agentStates.values());
					const cols = computeColumns(agentStates.size, width, maxColumns);

					if (cols === 1) {
						return agents.map(s => renderAgentCell(s, width, theme));
					}

					const cellWidth = Math.floor((width - (cols - 1)) / cols);
					const lines: string[] = [];

					for (let i = 0; i < agents.length; i += cols) {
						const row = agents.slice(i, i + cols);
						const cells = row.map(s => renderAgentCell(s, cellWidth, theme));
						lines.push(cells.join("│"));
					}

					return lines;
				},
				invalidate() {},
			};
		});
	}

	// ── Dispatch Agent (returns Promise) ─────────

	function dispatchAgent(
		agentName: string,
		task: string,
		ctx: any,
		onUpdate?: (update: any) => void,
	): Promise<{ output: string; exitCode: number; elapsed: number; inputTokens: number; outputTokens: number; cost: number; toolCount: number; contextPct: number; thinkingText: string; hideThinkingBlock: boolean; orderedContent: {type: "text" | "thinking", content: string}[] }> {
		const key = agentName.toLowerCase();
		const state = agentStates.get(key);
		if (!state) {
			return Promise.resolve({
				output: `Agent "${agentName}" not found. Available: ${Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ")}`,
				exitCode: 1,
				elapsed: 0,
				inputTokens: 0,
				outputTokens: 0,
				cost: 0,
				toolCount: 0,
				contextPct: 0,
				thinkingText: "",
				hideThinkingBlock: hideThinkingBlockSetting,
				orderedContent: [],
			});
		}

		if (state.status === "running") {
			return Promise.resolve({
				output: `Agent "${displayName(state.def.name)}" is already running. Wait for it to finish.`,
				exitCode: 1,
				elapsed: 0,
				inputTokens: 0,
				outputTokens: 0,
				cost: 0,
				toolCount: 0,
				contextPct: 0,
				thinkingText: "",
				hideThinkingBlock: hideThinkingBlockSetting,
				orderedContent: [],
			});
		}

		state.status = "running";
		state.task = task;
		state.toolCount = 0;
		state.elapsed = 0;
		state.lastWork = "";
		state.runCount++;
		state.inputTokens = 0;
		state.outputTokens = 0;
		state.cost = 0;
		updateWidget();

		const startTime = Date.now();
		state.timer = setInterval(() => {
			state.elapsed = Date.now() - startTime;
			updateWidget();
		}, 1000);

		const model = state.def.model
			|| (ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "")
			|| "openrouter/google/gemini-3-flash-preview";

		// Session file for this agent
		const agentKey = state.def.name.toLowerCase().replace(/\s+/g, "-");
		const agentSessionFile = join(sessionDir, `${agentKey}.json`);

		// Build args — first run creates session, subsequent runs resume
		const args = [
			"--mode", "json",
			"-p",
			"--no-extensions",
			// Forward parent -e extension paths (filtered to exclude spec-teams itself)
			...forwardedExtensions.flatMap((ext: string) => ["-e", ext]),
			// Forward extension-registered CLI flags (only populated when --no-extensions is active)
			...forwardedFlags,
			"--model", model,
			"--tools", state.def.tools,
			"--thinking", state.def.thinking,
			"--append-system-prompt", state.def.systemPrompt,
			"--session", agentSessionFile,
		];

		// Continue existing session if we have one
		if (state.sessionFile) {
			args.push("-c");
		}

		args.push(task);

		const orderedContent: {type: "text" | "thinking", content: string}[] = [];

		// Throttled update helper — pushes live streaming state to onUpdate at most every 50ms
		let lastPush = 0;
		const pushUpdate = () => {
			if (!onUpdate) return;
			const now = Date.now();
			if (now - lastPush < 50) return;
			lastPush = now;
			onUpdate({
				content: [{ type: "text", text: `Dispatching to ${agentName}...` }],
				details: {
					agent: agentName,
					task,
					status: "dispatching",
					model,
					elapsed: state.elapsed,
					outputText: orderedContent.filter(s => s.type === "text").map(s => s.content).join(""),
					thinkingText: orderedContent.filter(s => s.type === "thinking").map(s => s.content).join(""),
					orderedContent: [...orderedContent],
					toolCount: state.toolCount,
					contextPct: state.contextPct,
					inputTokens: state.inputTokens,
					outputTokens: state.outputTokens,
					cost: state.cost,
					hideThinkingBlock: hideThinkingBlockSetting,
				},
			});
		};

		return new Promise((resolve) => {
			const proc = spawn("pi", args, {
				stdio: ["ignore", "pipe", "pipe"],
				env: { ...process.env },
			});

			let buffer = "";

			proc.stdout!.setEncoding("utf-8");
			proc.stdout!.on("data", (chunk: string) => {
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const event = JSON.parse(line);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								const lastSeg = orderedContent[orderedContent.length - 1];
								if (lastSeg?.type === "text") {
									lastSeg.content += (delta.delta || "");
								} else {
									orderedContent.push({ type: "text", content: delta.delta || "" });
								}
								const textOutput = orderedContent.filter(s => s.type === "text").map(s => s.content).join("");
								const last = textOutput.split("\n").filter((l: string) => l.trim()).pop() || "";
								state.lastWork = last;
								updateWidget();
								pushUpdate();
							} else if (delta?.type === "thinking_delta") {
								const lastSeg = orderedContent[orderedContent.length - 1];
								if (lastSeg?.type === "thinking") {
									lastSeg.content += (delta.delta || "");
								} else {
									orderedContent.push({ type: "thinking", content: delta.delta || "" });
								}
								pushUpdate();
							}
						} else if (event.type === "tool_execution_start") {
							state.toolCount++;
							updateWidget();
							pushUpdate();
						} else if (event.type === "message_end") {
							const msg = event.message;
							if (msg?.usage) {
								if (contextWindow > 0) {
									state.contextPct = ((msg.usage.input || 0) / contextWindow) * 100;
								}
								state.inputTokens += msg.usage.input || 0;
								state.outputTokens += msg.usage.output || 0;
								state.cost += msg.usage.cost?.total || 0;
							}
							updateWidget();
							pushUpdate();
						} else if (event.type === "agent_end") {
							const msgs = event.messages || [];
							const last = [...msgs].reverse().find((m: any) => m.role === "assistant");
							if (last?.usage) {
								if (contextWindow > 0) {
									state.contextPct = ((last.usage.input || 0) / contextWindow) * 100;
								}
								state.inputTokens += last.usage.input || 0;
								state.outputTokens += last.usage.output || 0;
								state.cost += last.usage.cost?.total || 0;
							}
							updateWidget();
							pushUpdate();
						}
					} catch {}
				}
			});

			proc.stderr!.setEncoding("utf-8");
			proc.stderr!.on("data", () => {});

			proc.on("close", (code) => {
				if (buffer.trim()) {
					try {
						const event = JSON.parse(buffer);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								const lastSeg = orderedContent[orderedContent.length - 1];
								if (lastSeg?.type === "text") {
									lastSeg.content += (delta.delta || "");
								} else {
									orderedContent.push({ type: "text", content: delta.delta || "" });
								}
							} else if (delta?.type === "thinking_delta") {
								const lastSeg = orderedContent[orderedContent.length - 1];
								if (lastSeg?.type === "thinking") {
									lastSeg.content += (delta.delta || "");
								} else {
									orderedContent.push({ type: "thinking", content: delta.delta || "" });
								}
							}
						}
					} catch {}
				}

				clearInterval(state.timer);
				state.elapsed = Date.now() - startTime;
				state.status = code === 0 ? "done" : "error";

				// Mark session file as available for resume
				if (code === 0) {
					state.sessionFile = agentSessionFile;
				}

				const full = orderedContent.filter(s => s.type === "text").map(s => s.content).join("");
				state.lastWork = full.split("\n").filter((l: string) => l.trim()).pop() || "";
				updateWidget();

				ctx.ui.notify(
					`${displayName(state.def.name)} ${state.status} in ${formatDuration(state.elapsed)}`,
					state.status === "done" ? "success" : "error"
				);

				resolve({
					output: full,
					exitCode: code ?? 1,
					elapsed: state.elapsed,
					inputTokens: state.inputTokens,
					outputTokens: state.outputTokens,
					cost: state.cost,
					toolCount: state.toolCount,
					contextPct: state.contextPct,
					thinkingText: orderedContent.filter(s => s.type === "thinking").map(s => s.content).join(""),
					hideThinkingBlock: hideThinkingBlockSetting,
					orderedContent: [...orderedContent],
				});
			});

			proc.on("error", (err) => {
				clearInterval(state.timer);
				state.status = "error";
				state.lastWork = `Error: ${err.message}`;
				updateWidget();
				resolve({
					output: `Error spawning agent: ${err.message}`,
					exitCode: 1,
					elapsed: Date.now() - startTime,
					inputTokens: state.inputTokens,
					outputTokens: state.outputTokens,
					cost: state.cost,
					toolCount: state.toolCount,
					contextPct: state.contextPct,
					thinkingText: orderedContent.filter(s => s.type === "thinking").map(s => s.content).join(""),
					hideThinkingBlock: hideThinkingBlockSetting,
					orderedContent: [...orderedContent],
				});
			});
		});
	}

	// ── dispatch_agent Tool (registered at top level) ──

	// Helper: split output text around signal lines, returning segments for Container children
	function splitOutputWithSignals(text: string): { type: "text" | "signal"; content: string; signalName?: string }[] {
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

	pi.registerTool({
		name: "dispatch_agent",
		label: "Dispatch Agent",
		description: "Dispatch a task to a specialist agent. The agent will execute the task and return the result. Use the system prompt to see available agent names.",
		parameters: Type.Object({
			agent: Type.String({ description: "Agent name (case-insensitive)" }),
			task: Type.String({ description: "Task description for the agent to execute" }),
		}),
		renderShell: "self",

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { agent, task } = params as { agent: string; task: string };

			// Compute resolved model for details (agent → dispatcher → fallback)
			const agentState = agentStates.get(agent.toLowerCase());
			const resolvedModel = agentState?.def.model
				|| (ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "")
				|| "openrouter/google/gemini-3-flash-preview";

			try {
				if (onUpdate) {
					onUpdate({
						content: [{ type: "text", text: `Dispatching to ${agent}...` }],
						details: { agent, task, status: "dispatching", hideThinkingBlock: hideThinkingBlockSetting },
					});
				}

				const result = await dispatchAgent(agent, task, ctx, onUpdate);
				widgetCtx = ctx;
				refreshStatus();

				// TODO: Revisit truncation strategy. Preserving the tail (where the status
				// signal block lives) is critical for the relay protocol. For now, pass the
				// full output so the dispatcher can always detect status signals.
				// const truncated = result.output.length > 8000
				// 	? result.output.slice(0, 8000) + "\n\n... [truncated]"
				// 	: result.output;
				const truncated = result.output;

				const status = result.exitCode === 0 ? "done" : "error";
				const summary = `[${agent}] ${status} in ${formatDuration(result.elapsed)}`;

				return {
					content: [{ type: "text", text: `${summary}\n\n${truncated}` }],
					details: {
						agent,
						task,
						status,
						model: resolvedModel,
						elapsed: result.elapsed,
						exitCode: result.exitCode,
						fullOutput: result.output,
						inputTokens: result.inputTokens,
						outputTokens: result.outputTokens,
						cost: result.cost,
						toolCount: result.toolCount,
						contextPct: result.contextPct,
						thinkingText: result.thinkingText,
						orderedContent: result.orderedContent,
						hideThinkingBlock: hideThinkingBlockSetting,
					},
				};
			} catch (err: any) {
				widgetCtx = ctx;
				refreshStatus();
				return {
					content: [{ type: "text", text: `Error dispatching to ${agent}: ${err?.message || err}` }],
					details: { agent, task, status: "error", model: resolvedModel, elapsed: 0, exitCode: 1, fullOutput: "", inputTokens: 0, outputTokens: 0, cost: 0, toolCount: 0, contextPct: 0, thinkingText: "", orderedContent: [], hideThinkingBlock: hideThinkingBlockSetting },
				};
			}
		},

		renderCall(args, theme) {
			const agentName = (args as any).agent || "?";
			const task = (args as any).task || "";
			const preview = task.length > 60 ? task.slice(0, 57) + "..." : task;
			// Look up agent definition for model info
			const agentDef = allAgentDefs.find(d => d.name.toLowerCase() === agentName.toLowerCase());
			const modelPart = agentDef?.model ? ` (${agentDef.model})` : "";
			return new Text(
				theme.fg("toolTitle", theme.bold("dispatch_agent ")) +
				theme.fg("accent", agentName) +
				theme.fg("dim", modelPart) +
				theme.fg("dim", " — ") +
				theme.fg("muted", preview),
				0, 0,
			);
		},

		renderResult(result, options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			const isPartial = options.isPartial || details.status === "dispatching";
			const mdTheme = getMarkdownTheme();
			const shouldHideThinking = details.hideThinkingBlock === true;

			// ── Helper: build a signal-highlighted Text component for a signal line ──
			const renderSignalLine = (signalName: string, line: string) => {
				const color =
					signalName === "need-input" ? "warning" :
					signalName === "blocked" ? "error" : "success";
				return new Text(theme.fg(color, theme.bold(line)), 0, 0);
			};

			// ── Build layout: Container-based with flowing Pi-native structure ──
			const container = new Container();
			const dur = typeof details.elapsed === "number" ? formatDuration(details.elapsed) : "0s";

			// Header: status icon, agent name, elapsed time
			if (isPartial) {
				container.addChild(new Text(
					theme.fg("accent", `● ${details.agent || "?"}`) +
					theme.fg("dim", ` ${dur}`),
					0, 0,
				));
			} else {
				const icon = details.status === "done" ? "✓" : "✗";
				const color = details.status === "done" ? "success" : "error";
				container.addChild(new Text(
					theme.fg(color, `${icon} ${details.agent || "?"}`) +
					theme.fg("dim", ` ${dur}`),
					0, 0,
				));
			}

			// Task prefix — dimmed Markdown, no "─── Task ───" divider, only if task present
			if (details.task) {
				container.addChild(new Spacer(1));
				container.addChild(new Markdown(details.task, 0, 0, mdTheme, { color: (text) => theme.fg("dim", text) }));
			}

			// ── Get ordered content for interleaved rendering ──
			let orderedContent: {type: "text" | "thinking", content: string}[] = details.orderedContent;
			if (!orderedContent) {
				// Backward compatibility: construct from outputText/thinkingText
				orderedContent = [];
				const outputSource = isPartial ? details.outputText : details.fullOutput;
				if (outputSource) {
					orderedContent.push({ type: "text", content: outputSource });
				}
				if (details.thinkingText) {
					orderedContent.push({ type: "thinking", content: details.thinkingText });
				}
			}

			// ── Compute total thinking lines for collapsed hint ──
			const totalThinkingLines = orderedContent
				.filter((s: any) => s.type === "thinking")
				.reduce((sum: number, s: any) => sum + s.content.split("\n").length, 0);

			// ── Concatenated text for signal detection and collapsed mode ──
			const allText = orderedContent
				.filter((s: any) => s.type === "text")
				.map((s: any) => s.content)
				.join("");

			// ── Content section — interleaved rendering from orderedContent ──
			if (allText) {
				container.addChild(new Spacer(1));

				const signal = detectStatusSignal(allText);

				if (isPartial || options.expanded) {
					// ── Expanded / partial: interleaved rendering in stream order ──
					let prevType: string | null = null;
					for (const segment of orderedContent) {
						if (segment.type === "thinking") {
							if (shouldHideThinking) continue;
							if (!segment.content.trim()) continue;
							if (prevType !== null && segment.type !== prevType) {
								container.addChild(new Spacer(1));
							}
							prevType = segment.type;
							container.addChild(new Markdown(segment.content, 0, 0, mdTheme, {
								color: (text) => theme.fg("thinkingText", text),
								italic: true,
							}));
						} else {
							if (!segment.content.trim()) continue;
							if (prevType !== null && segment.type !== prevType) {
								container.addChild(new Spacer(1));
							}
							prevType = segment.type;
							if (signal) {
								const segs = splitOutputWithSignals(segment.content);
								for (const seg of segs) {
									if (seg.type === "signal") {
										container.addChild(renderSignalLine(seg.signalName!, seg.content));
									} else if (seg.content.trim()) {
										container.addChild(new Markdown(seg.content, 0, 0, mdTheme));
									}
								}
							} else {
								container.addChild(new Markdown(segment.content, 0, 0, mdTheme));
							}
						}
					}
				} else {
					// ── Collapsed mode: interleaved rendering with per-segment truncation ──
					const MAX_CHARS = 4000;
					let charsRendered = 0;
					let prevType: string | null = null;

					for (const segment of orderedContent) {
						if (segment.type === "thinking") {
							if (shouldHideThinking) continue;
							if (!segment.content.trim()) continue;
							if (prevType !== null && segment.type !== prevType) {
								container.addChild(new Spacer(1));
							}
							prevType = segment.type;
							container.addChild(new Markdown(segment.content, 0, 0, mdTheme, {
								color: (text) => theme.fg("thinkingText", text),
								italic: true,
							}));
						} else {
							if (!segment.content.trim()) continue;
							if (prevType !== null && segment.type !== prevType) {
								container.addChild(new Spacer(1));
							}
							prevType = segment.type;
							const segmentLen = segment.content.length;
							if (charsRendered + segmentLen <= MAX_CHARS) {
								const segs = splitOutputWithSignals(segment.content);
								for (const seg of segs) {
									if (seg.type === "signal") {
										container.addChild(renderSignalLine(seg.signalName!, seg.content));
									} else if (seg.content.trim()) {
										container.addChild(new Markdown(seg.content, 0, 0, mdTheme));
									}
								}
								charsRendered += segmentLen;
							} else {
								const remaining = MAX_CHARS - charsRendered;
								if (remaining > 0) {
									const sliced = segment.content.slice(0, remaining) + "\n... [truncated]";
									const segs = splitOutputWithSignals(sliced);
									for (const seg of segs) {
										if (seg.type === "signal") {
											container.addChild(renderSignalLine(seg.signalName!, seg.content));
										} else if (seg.content.trim()) {
											container.addChild(new Markdown(seg.content, 0, 0, mdTheme));
										}
									}
								}
								break;
							}
						}
					}
				}
			}

			// ── Post-text thinking section (collapsed hint only; thinking is now inline) ──
			const hasThinking = orderedContent.some((s: any) => s.type === "thinking" && s.content.trim());
			if (hasThinking && shouldHideThinking) {
				container.addChild(new Spacer(1));
				const showMore = totalThinkingLines > 50 ? ` (${totalThinkingLines} lines total)` : "";
				container.addChild(new Text(
					theme.fg("thinkingText", `▶ Thinking (${totalThinkingLines} line${totalThinkingLines !== 1 ? "s" : ""})${showMore}`),
					0, 0,
				));
			}

			// Metrics footer — subtle single line with blank line separator
			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("dim", formatMetricsFooter(details)), 0, 0));

			// Wrap the entire container in a Box for 2-cell horizontal padding and customMessageBg background
			const box = new Box(2, 1, (t: string) => theme.bg("customMessageBg", t));
			box.addChild(container);
			return box;
		},
	});

	// ── Commands ─────────────────────────────────

	pi.registerCommand("specs-team", {
		description: "Select a team to work with",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			const teamNames = Object.keys(teams);
			if (teamNames.length === 0) {
				ctx.ui.notify("No teams defined in .pi/agents/teams.yaml", "warning");
				return;
			}

			const options = teamNames.map(name => {
				const members = teams[name].map(m => displayName(m));
				return `${name} — ${members.join(", ")}`;
			});

			const choice = await ctx.ui.select("Select Team", options);
			if (choice === undefined) return;

			const idx = options.indexOf(choice);
			const name = teamNames[idx];
			activateTeam(name);
			updateWidget();
			refreshStatus();
			ctx.ui.notify(`Team: ${name} — ${Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ")}`, "info");
		},
	});

	pi.registerCommand("specs-list", {
		description: "List all loaded agents",
		handler: async (_args, _ctx) => {
			widgetCtx = _ctx;
			const names = Array.from(agentStates.values())
				.map(s => {
					const session = s.sessionFile ? "resumed" : "new";
					return `${displayName(s.def.name)} (${s.status}, ${session}, runs: ${s.runCount}): ${s.def.description}`;
				})
				.join("\n");
			_ctx.ui.notify(names || "No agents loaded", "info");
		},
	});

	pi.registerCommand("specs-grid", {
		description: "Set grid columns: /specs-grid <1-6>",
		handler: async (_args, _ctx) => {
			const arg = _args.trim();
			if (!arg) {
				_ctx.ui.notify(
					`Grid columns: ${maxColumns} (default 3). Usage: /specs-grid <1-6>`,
					"info",
				);
				return;
			}
			const num = parseInt(arg, 10);
			if (isNaN(num) || num < 1 || num > 6) {
				_ctx.ui.notify(
					`Invalid column count "${arg}". Valid range: 1-6.`,
					"warning",
				);
				return;
			}
			maxColumns = num;
			widgetCtx = _ctx;
			updateWidget();
			_ctx.ui.notify(
				`Grid columns set to ${maxColumns}.`,
				"info",
			);
		},
	});

	// ── System Prompt Override ───────────────────

	pi.on("before_agent_start", async (_event, _ctx) => {
		// Build dynamic agent catalog from active team only
		const agentCatalog = Array.from(agentStates.values())
			.map(s => `### ${displayName(s.def.name)}\n**Dispatch as:** \`${s.def.name}\`\n${s.def.description}\n**Tools:** ${s.def.tools}`)
			.join("\n\n");

		const teamMembers = Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ");

		// Check if worker is on the active team
		const hasWorker = Array.from(agentStates.values()).some(s => s.def.name === "worker");

		// Build worker-related sections only when worker is on the team
		const workerRoutingSection = hasWorker ? `
## Non-OpenSpec Tasks

Some user requests are NOT part of the OpenSpec workflow. These are
general task execution requests that should be routed to the worker
agent rather than an OpenSpec specialist:

- **Git operations** — commit, branch, diff, rebase, pushing, pull requests
- **File operations** — cleanup, rename, reorganize, search, replace
- **Quick scripts** — one-off scripts, data transformations, automation
- **Web requests** — fetch URLs, API calls, download files
- **One-off edits** — quick fixes, typos, small refactors that don't
  warrant a full OpenSpec lifecycle
- **CLI operations** — running commands, checking status, installing packages

When you receive such a request, dispatch the worker agent directly.
Do NOT route non-OpenSpec tasks to explore or any OpenSpec agent.

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
observation and let the user decide.

## Worker Status Signals

The worker agent concludes responses with a "Status:" block using
two possible signals:

**"Status: done"** — The task was completed successfully.
- Review the output
- Summarize what was accomplished for the user

**"Status: blocked"** — The worker encountered an unrecoverable
issue.
- Present the blocker description to the user
- Ask the user how they would like to proceed (retry, explore, abandon)

Do NOT treat worker status signals as multi-turn relay signals.
Worker always returns either done or blocked — there is no back-and-forth.
` : "";

		return {
			systemPrompt: `You are an OpenSpec-aware dispatcher agent.
You coordinate specialist agents to accomplish tasks within the
OpenSpec spec-driven workflow. You do NOT have direct access to
the codebase — you MUST delegate ALL work through agents using
the dispatch_agent tool.

## Active Team: ${activeTeamName}
Members: ${teamMembers}
You can ONLY dispatch to agents listed below. Do not attempt to
dispatch to agents outside this team.

## OpenSpec Lifecycle

OpenSpec is organized around five activities. Each phase below
describes the specialist's role, when to route to them, and
workflow expectations. Match the user's intent to the phase that
best fits their current activity.

### Explore — Investigate and Clarify
**Identity**: The explore agent investigates problems, explores the
codebase, and clarifies requirements through multi-turn relayed
conversation. It is a thinking partner, not a task executor.

**Route when:**
- Requirements are unclear or vague
- The user wants to explore or think through an idea
- You need to investigate the codebase before planning
- The user is stuck or uncertain about the right approach
- The user asks to explore an existing change

**Workflow:**
- Dispatch explore with the user's message as the task
- The explore agent runs multi-turn through the relay protocol
  (see ## Explore Relay Protocol below)
- One clear, focused topic per exploration session
- When explore returns \`ready-to-propose\`, extract the structured
  brief and present to user for approval before dispatching
  propose
- When explore returns \`done-exploring\`, relay summary to user

### Propose — Formalize into Artifacts
**Identity**: The propose agent formalizes explored decisions into
structured OpenSpec artifacts: proposal.md, design.md, tasks.md,
and delta specs.

**Route when:**
- Exploration has crystallized into clear, agreed-upon decisions
- The user has a clear goal and wants a formal change proposal
- A structured brief exists (change name, problem, approach,
  scope, constraints)
- Design issues found during implementation need a formal proposal

**Workflow:**
- Pass a structured brief (change name, problem, approach, scope,
  constraints) — not an open-ended investigation
- Do NOT re-investigate settled questions that the brief answers
- After propose completes, verify artifacts were created
- The change is now ready for apply

### Apply — Implement Tasks
**Identity**: The apply agent implements tasks from OpenSpec changes
— writes code, edits files, runs CLI commands, marks tasks complete.

**Route when:**
- The user wants to implement or make changes
- Tasks are defined in an OpenSpec change
- Small or trivial change (skip explore and propose)
- Verification found issues that need fixing

**Workflow:**
- Dispatch apply with the change name
- One clear objective per dispatch
- Evaluate results before dispatching the next agent
- If a task fails, retry with a different agent or rephrase the
  task

### Verify — Audit and Validate
**Identity**: The verify agent audits OpenSpec change
implementations — inspects spec compliance, traces scenarios to
code, checks design coherence, runs tests. It is read-only:
inspects and reports.

**Route when:**
- Implementation reports complete
- The user wants to validate correctness before archiving
- You need a pre-archive quality check

**Workflow:**
- After apply completes, dispatch verify before suggesting archive
- If verification finds issues → route back to apply with
  specific fixes
- If verification is clean → ask the user for approval to archive

### Archive — Finalize and Move
**Identity**: The archive agent finalizes completed changes — syncs
delta specs, verifies completion, moves change to archive/.

**Route when:**
- User explicitly approves archive after clean verification
- CRITICAL: NEVER dispatch archive without explicit user approval.
  Archiving is irreversible — always ask the user.

**Workflow:**
- Dispatch archive with the change name and instruction to sync
- After archive completes, summarize the outcome for the user

## Explore Relay Protocol

When you dispatch the explore agent, it engages in multi-turn
conversation through you. Follow the signal-based relay protocol
below. Sub-agents return a structured status block. Inspect the
\`Status:\` field to determine the next action.

**need-input** — The explore agent has questions for the user.
- Relay the full explore response to the user verbatim (include
  analysis, diagrams, questions)
- Wait for the user's reply
- When the user replies, dispatch explore again with the user's
  message as the task
- The explore agent resumes its session automatically (session
  persistence)

**ready-to-propose** — Exploration has crystallized. The response
includes a Change Brief with change name, problem, approach,
scope, and constraints.
- Extract the structured brief (change name, problem, approach,
  scope, constraints) from the explore response
- Relay a summary of the Change Brief to the user
- Ask the user for explicit approval before dispatching the
  propose agent
- If the user approves, dispatch the propose agent with the
  structured brief as the task, incorporating any modifications
  the user made
- If the user declines, report that exploration ended without a
  proposal and return to normal operation
- Do NOT dispatch the propose agent without user confirmation

**done-exploring** — The user has what they need, no change needed.
- Relay the summary to the user
- Return to normal operation — no further dispatch needed

**blocked** — The explore agent cannot proceed.
- Relay the blocker description to the user
- Ask the user how they'd like to proceed

### Multi-Turn Flow Example

    User: "I'm thinking about adding dark mode"
      → Dispatch explore("I'm thinking about adding dark mode")

    Explore: [investigates codebase, returns need-input with
      questions]
      → Relay to user verbatim

    User: "Yes, system-wide with automatic detection"
      → Dispatch explore("Yes, system-wide with automatic
        detection")

    Explore: [returns ready-to-propose with change brief]
      → Extract brief, relay summary to user
      → Ask user for explicit approval
      → User approves (may modify brief)
      → Dispatch propose("Change: add-dark-mode. Problem: ...")

Explore may return "need-input" multiple times as the conversation
develops. Each time, relay verbatim and wait for user response.
There is no limit on explore turns.
${workerRoutingSection}
## Rules

- NEVER try to read, write, or execute code directly — you have no
  such tools
- ALWAYS use dispatch_agent to get work done
- You can dispatch the same agent multiple times with different
  tasks
- Keep tasks focused — one clear objective per dispatch
- Summarize the outcome for the user, including which activity was
  used

## Agents

${agentCatalog}`,
		};
	});

	// ── Session Start ────────────────────────────

	pi.on("session_start", async (_event, _ctx) => {
		// Clear widgets from previous session
		if (widgetCtx) {
			widgetCtx.ui.setWidget("spec-team", undefined);
		}
		widgetCtx = _ctx;
		contextWindow = _ctx.model?.contextWindow || 0;
		hideThinkingBlockSetting = SettingsManager.create(_ctx.cwd, getAgentDir()).getHideThinkingBlock();

		loadAgents(_ctx.cwd);

		// Wipe session files so subagents start fresh
		if (existsSync(sessionDir)) {
			for (const f of readdirSync(sessionDir)) {
				if (f.endsWith(".json")) {
					try { unlinkSync(join(sessionDir, f)); } catch {}
				}
			}
		}

		// Default to first team — use /specs-team to switch
		const teamNames = Object.keys(teams);
		if (teamNames.length > 0) {
			activateTeam(teamNames[0]);
		}

		pi.setActiveTools(["dispatch_agent"]);

		refreshStatus();
		const members = Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ");
		_ctx.ui.notify(
			`Team: ${activeTeamName} (${members})\n` +
			`Team sets loaded from: .pi/agents/teams.yaml\n\n` +
			`/specs-team          Select a team\n` +
			`/specs-list          List active agents and status\n` +
			`/specs-grid <1-6>    Set grid columns (1-6, default 3)`,
			"info",
		);
		updateWidget();
	});

	pi.on("agent_end", async (_event, _ctx) => {
		widgetCtx = _ctx;
		refreshStatus();
	});
}
