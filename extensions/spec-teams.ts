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
 * Loads agent definitions from agents/*.md, .claude/agents/*.md, .pi/agents/*.md.
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

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { spawn } from "child_process";
import { readdirSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

// ── Types ────────────────────────────────────────

interface AgentDef {
	name: string;
	description: string;
	tools: string;
	systemPrompt: string;
	file: string;
	thinking?: boolean;
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
		const thinking = thinkingRaw === "on";

		return {
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools: frontmatter.tools || "read,grep,find,ls",
			systemPrompt: match[2].trim(),
			file: filePath,
			thinking,
		};
	} catch {
		return null;
	}
}

function scanAgentDirs(cwd: string): AgentDef[] {
	const dirs = [
		join(cwd, "agents"),
		join(cwd, ".claude", "agents"),
		join(cwd, ".pi", "agents"),
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

		// If no teams defined, create a default "all" team
		if (Object.keys(teams).length === 0) {
			teams = { all: allAgentDefs.map(d => d.name) };
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
						return [theme.fg("dim", "No agents found. Add .md files to agents/")];
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
	): Promise<{ output: string; exitCode: number; elapsed: number }> {
		const key = agentName.toLowerCase();
		const state = agentStates.get(key);
		if (!state) {
			return Promise.resolve({
				output: `Agent "${agentName}" not found. Available: ${Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ")}`,
				exitCode: 1,
				elapsed: 0,
			});
		}

		if (state.status === "running") {
			return Promise.resolve({
				output: `Agent "${displayName(state.def.name)}" is already running. Wait for it to finish.`,
				exitCode: 1,
				elapsed: 0,
			});
		}

		state.status = "running";
		state.task = task;
		state.toolCount = 0;
		state.elapsed = 0;
		state.lastWork = "";
		state.runCount++;
		updateWidget();

		const startTime = Date.now();
		state.timer = setInterval(() => {
			state.elapsed = Date.now() - startTime;
			updateWidget();
		}, 1000);

		const model = ctx.model
			? `${ctx.model.provider}/${ctx.model.id}`
			: "openrouter/google/gemini-3-flash-preview";

		// Session file for this agent
		const agentKey = state.def.name.toLowerCase().replace(/\s+/g, "-");
		const agentSessionFile = join(sessionDir, `${agentKey}.json`);

		// Build args — first run creates session, subsequent runs resume
		const args = [
			"--mode", "json",
			"-p",
			"--no-extensions",
			"--model", model,
			"--tools", state.def.tools,
			"--thinking", state.def.thinking ? "on" : "off",
			"--append-system-prompt", state.def.systemPrompt,
			"--session", agentSessionFile,
		];

		// Continue existing session if we have one
		if (state.sessionFile) {
			args.push("-c");
		}

		args.push(task);

		const textChunks: string[] = [];
		const thinkingChunks: string[] = [];

		// Throttled update helper — pushes live streaming state to onUpdate at most every 250ms
		let lastPush = 0;
		const pushUpdate = () => {
			if (!onUpdate) return;
			const now = Date.now();
			if (now - lastPush < 250) return;
			lastPush = now;
			onUpdate({
				content: [{ type: "text", text: `Dispatching to ${agentName}...` }],
				details: {
					agent: agentName,
					task,
					status: "dispatching",
					elapsed: state.elapsed,
					outputText: textChunks.join(""),
					thinkingText: thinkingChunks.join(""),
					toolCount: state.toolCount,
					contextPct: state.contextPct,
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
								textChunks.push(delta.delta || "");
								const full = textChunks.join("");
								const last = full.split("\n").filter((l: string) => l.trim()).pop() || "";
								state.lastWork = last;
								updateWidget();
								pushUpdate();
							} else if (delta?.type === "thinking_delta") {
								thinkingChunks.push(delta.delta || "");
								pushUpdate();
							}
						} else if (event.type === "tool_execution_start") {
							state.toolCount++;
							updateWidget();
							pushUpdate();
						} else if (event.type === "message_end") {
							const msg = event.message;
							if (msg?.usage && contextWindow > 0) {
								state.contextPct = ((msg.usage.input || 0) / contextWindow) * 100;
								updateWidget();
								pushUpdate();
							}
						} else if (event.type === "agent_end") {
							const msgs = event.messages || [];
							const last = [...msgs].reverse().find((m: any) => m.role === "assistant");
							if (last?.usage && contextWindow > 0) {
								state.contextPct = ((last.usage.input || 0) / contextWindow) * 100;
								updateWidget();
								pushUpdate();
							}
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
							if (delta?.type === "text_delta") textChunks.push(delta.delta || "");
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

				const full = textChunks.join("");
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
				});
			});
		});
	}

	// ── dispatch_agent Tool (registered at top level) ──

	pi.registerTool({
		name: "dispatch_agent",
		label: "Dispatch Agent",
		description: "Dispatch a task to a specialist agent. The agent will execute the task and return the result. Use the system prompt to see available agent names.",
		parameters: Type.Object({
			agent: Type.String({ description: "Agent name (case-insensitive)" }),
			task: Type.String({ description: "Task description for the agent to execute" }),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { agent, task } = params as { agent: string; task: string };

			try {
				if (onUpdate) {
					onUpdate({
						content: [{ type: "text", text: `Dispatching to ${agent}...` }],
						details: { agent, task, status: "dispatching" },
					});
				}

				const result = await dispatchAgent(agent, task, ctx, onUpdate);

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
						elapsed: result.elapsed,
						exitCode: result.exitCode,
						fullOutput: result.output,
					},
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error dispatching to ${agent}: ${err?.message || err}` }],
					details: { agent, task, status: "error", elapsed: 0, exitCode: 1, fullOutput: "" },
				};
			}
		},

		renderCall(args, theme) {
			const agentName = (args as any).agent || "?";
			const task = (args as any).task || "";
			const preview = task.length > 60 ? task.slice(0, 57) + "..." : task;
			return new Text(
				theme.fg("toolTitle", theme.bold("dispatch_agent ")) +
				theme.fg("accent", agentName) +
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

			// Streaming/partial result while agent is still running
			if (options.isPartial || details.status === "dispatching") {
				const dur = typeof details.elapsed === "number" ? formatDuration(details.elapsed) : "0s";
				const header = theme.fg("accent", `● ${details.agent || "?"}`) +
					theme.fg("dim", ` ${dur}`);

				const parts: string[] = [header];

				// Show the full task/prompt
				if (details.task) {
					parts.push("");
					parts.push(theme.fg("dim", details.task));
				}

				// Show full streaming text output
				if (details.outputText) {
					parts.push("");
					parts.push(details.outputText);
				}

				// Show full thinking output (dimmed to distinguish from text)
				if (details.thinkingText) {
					parts.push("");
					parts.push(theme.fg("dim", details.thinkingText));
				}

				// Status line: tool count and context usage
				const tc = typeof details.toolCount === "number" ? details.toolCount : 0;
				const pct = typeof details.contextPct === "number" ? Math.round(details.contextPct) : 0;
				const statusLine = `🔧 ${tc} calls | ctx ${pct}%`;
				parts.push("");
				parts.push(theme.fg("dim", statusLine));

				return new Text(parts.join("\n"), 0, 0);
			}

			const icon = details.status === "done" ? "✓" : "✗";
			const color = details.status === "done" ? "success" : "error";
			const dur = typeof details.elapsed === "number" ? formatDuration(details.elapsed) : "0s";
			const header = theme.fg(color, `${icon} ${details.agent}`) +
				theme.fg("dim", ` ${dur}`);

			const parts: string[] = [header];

			// Show the input task (skip if empty/undefined)
			if (details.task) {
				parts.push("");
				parts.push(theme.fg("dim", details.task));
			}

			// Show the final output (skip if empty/undefined)
			if (details.fullOutput) {
				const output = options.expanded
					? details.fullOutput
					: (details.fullOutput.length > 4000
						? details.fullOutput.slice(0, 4000) + "\n... [truncated]"
						: details.fullOutput);
				parts.push("");
				parts.push(theme.fg("muted", output));
			}

			return new Text(parts.join("\n"), 0, 0);
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
			ctx.ui.setStatus("spec-team", `Team: ${name} (${agentStates.size})`);
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

OpenSpec is organized around five activities. These are actions
you can take anytime — not stages you're locked into. You can
start anywhere, go back when needed, and skip what doesn't apply.

1. **explore** — Understand the problem, investigate the
   codebase, clarify requirements
2. **propose** — Formalize explored decisions into structured
   artifacts (proposal, design, tasks, delta specs). Propose
   agents expect a clear brief with change name, problem,
   approach, scope, and constraints — not an open-ended
   investigation.
3. **apply** — Implement the tasks, write code, make the changes
4. **verify** — review implementations, validate spec compliance,
   audit correctness, detect gaps between spec and code
5. **archive** — Mechanical finalization: sync delta specs, merge
   into main specs, move to archive/. Audit and validation
   concerns belong to verify, not archive.

## Routing

Match the user's intent to an OpenSpec phase, then scan the agent
catalog below for the agent whose description best fits that
phase's role:

- **explore** — relay-based multi-turn conversation with the
  explore agent. The dispatcher relays messages between the user
  and the explore agent; do NOT interpret or summarize explore
  responses. When the explore agent returns a signal
  ("need-input", "ready-to-propose", "done-exploring",
  "blocked"), follow the Explore Relay Protocol below.
- **propose** — agents focused on design, architecture, planning,
  proposal writing; they expect a structured brief (change name,
  problem, approach, scope, constraints) not an open-ended
  investigation
- **apply** — agents focused on implementation, coding, writing
  specs, editing files
- **verify** — agents focused on reviewing implementations,
  validating spec compliance, auditing correctness, detecting gaps
- **archive** — agents focused on mechanical finalization:
  syncing delta specs, merging into main specs, moving to
  archive/ (does NOT audit or re-verify)

If no agent clearly matches, use the most general-purpose agent
available. If unsure which phase applies, start with explore.

## Explore Relay Protocol

When you dispatch the explore agent, it engages in multi-turn
conversation through you. You are a dumb relay — forward responses
verbatim, do NOT interpret, summarize, or truncate explore agent
output.

### Signal Detection

The explore agent concludes every response with a "Status:" block.
Detect these signals and act accordingly:

**"Status: need-input"** — The explore agent has questions for
the user.
- Relay the full explore response to the user (include analysis,
  diagrams, questions)
- Wait for the user's reply
- When the user replies, dispatch explore again with the user's
  message as the task
- The explore agent resumes its session automatically (session
  persistence)

**"Status: ready-to-propose"** — Exploration has crystallized.
The response includes a **Change Brief** with change name,
problem, approach, scope, and constraints.
- Relay the summary to the user
- Extract the structured brief from the explore response
- Dispatch the propose agent with the structured brief as the task
- Do NOT ask the user for confirmation — the handoff is automatic

**"Status: done-exploring"** — The user has what they need, no
change needed.
- Relay the summary to the user
- Return to normal operation — no further dispatch needed

**"Status: blocked"** — The explore agent cannot proceed.
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
      → Relay summary to user
      → Dispatch propose("Change: add-dark-mode. Problem: ...")

Explore may return "need-input" multiple times as the conversation
develops. Each time, relay and wait. There is no limit on explore
turns.

## Working with Agents

You are not locked into a fixed sequence. Match your dispatch to
the user's intent:

- Unclear requirements? → Start with **explore** to investigate
  and clarify. The explore agent runs multi-turn through the relay
  protocol — you relay messages back and forth until exploration
  crystallizes or the user is satisfied. When
  "ready-to-propose" is returned, extract the structured brief
  and dispatch propose immediately.
- Clear goal, well-defined change? → Jump directly to **apply**
- Small or trivial change? → Skip explore and propose, go straight
  to **apply**
- Design flaw or issue found during implementation? → Circle back
  to **propose**
- Exploration produced clear, agreed-upon decisions? → Dispatch
  **propose** with a structured brief including change name,
  problem statement, approach, scope boundaries, and constraints.
  The propose agent expects this brief — don't dispatch with
  vague instructions.
- Implementation reported complete? → **Verify** before suggesting
  archive
- Verification found issues? → Route back to **apply** with
  specific fixes
- Verification clean? → Ask the user for approval to archive. Do
  NOT dispatch an archive agent without explicit user confirmation.
- User approves archive after clean verification? → Dispatch
  **archive** with the change name and instruction to sync
- Just thinking or exploring ideas? → Stay in **explore**

- One clear objective per dispatch — keep tasks focused
- Evaluate results before dispatching the next agent
- If a task fails, retry with a different agent or rephrase the
  task
- Summarize the outcome for the user, including which activity was
  used

## Rules

- NEVER try to read, write, or execute code directly — you have no
  such tools
- ALWAYS use dispatch_agent to get work done
- You can dispatch the same agent multiple times with different
  tasks
- Keep tasks focused — one clear objective per dispatch
- Match activity to intent: don't force unnecessary exploration
  when the user just wants a quick fix, and don't rush to
  implementation when requirements are unclear
- CRITICAL: NEVER dispatch an archive agent without explicit user
  approval. Archiving is irreversible — always ask the user after
  a clean verification.

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

		_ctx.ui.setStatus("spec-team", `Team: ${activeTeamName} (${agentStates.size})`);
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

		// Footer: model | team | context bar
		_ctx.ui.setFooter((_tui, theme, _footerData) => ({
			dispose: () => {},
			invalidate() {},
			render(width: number): string[] {
				const model = _ctx.model?.id || "no-model";
				const usage = _ctx.getContextUsage();
				const pct = usage ? usage.percent : 0;
				const filled = Math.round(pct / 10);
				const bar = "#".repeat(filled) + "-".repeat(10 - filled);

				const left = theme.fg("dim", ` ${model}`) +
					theme.fg("muted", " · ") +
					theme.fg("accent", activeTeamName);
				const right = theme.fg("dim", `[${bar}] ${Math.round(pct)}% `);
				const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));

				return [truncateToWidth(left + pad + right, width)];
			},
		}));
	});
}
