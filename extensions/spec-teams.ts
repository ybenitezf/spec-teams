/**
 * Spec Teams — OpenSpec-aware dispatcher-orchestrator with compact dashboard
 *
 * The primary Pi agent can delegate work to specialist agents via the
 * `dispatch_agent` tool. Each specialist maintains its own Pi session
 * for cross-invocation memory.
 *
 * The dispatcher system prompt is dynamically generated based on skill
 * availability and includes:
 * - Dynamic lifecycle routing based on available OpenSpec skills
 * - Always-present Explore Relay Protocol for multi-turn exploration
 * - Agent-catalog-matching language ("dispatch the most suitable available agent")
 * - Signal definitions injected into explore tasks
 * - No hardcoded agent names or Identity descriptions in phase blocks
 *
 * Loads agent definitions from project-level (agents/*.md, .claude/agents/*.md, .pi/agents/*.md)
 * and user-level (<getAgentDir()>/agents/, ~/.agents/agents/) directories.
 * Teams are defined in teams.yaml files discovered across multiple directories
 * (same locations as agent discovery, first-seen-wins priority).
 * On boot a select dialog lets you pick which team to work with.
 * Only team members are available for dispatch.
 *
 * Commands:
 *   /specs-team           — switch active team
 *   /specs-list           — list loaded agents
 *   /specs-grid           — set grid columns for dashboard widget (1-6, default 3)
 *
 * Usage: pi -e extensions/spec-teams.ts
 */

import { type ExtensionAPI, getMarkdownTheme, getAgentDir, parseArgs, SettingsManager, type Skill } from "@earendil-works/pi-coding-agent";
import {
	isLocalPath, displayName, encodeCwd, parseTeamsYaml, formatDuration, formatTokens,
	detectStatusSignal, formatMetricsFooter, splitOutputWithSignals, computeColumns,
	renderAgentCell, parseAgentFile, scanAgentDirs, findTeamsYaml, type AgentDef, type AgentState,
	buildOpenSpecPhases, buildIdentitySegment, buildTeamConfigSegment,
	buildLifecycleSegment, buildExploreRelaySegment, buildGeneralTasksSegment,
	buildRulesSegment, buildAgentCatalogSegment, type PhaseAvailability,
} from "./spec-teams-utils.ts";
import { Type } from "typebox";
import { Box, Text, Container, Markdown, Spacer } from "@earendil-works/pi-tui";
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
	let discoveredTeamsPath: string | null = null;

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

		// Load teams using multi-directory discovery
		discoveredTeamsPath = findTeamsYaml(cwd);
		if (discoveredTeamsPath) {
			try {
				teams = parseTeamsYaml(readFileSync(discoveredTeamsPath, "utf-8"));
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

	function updateWidget() {
		if (!widgetCtx) return;

		widgetCtx.ui.setWidget("spec-team", (_tui: any, theme: any) => {
			return {
				render(width: number): string[] {
					if (agentStates.size === 0) {
						return ["", theme.fg("dim", "No agents found. Add .md files to agents/ or user-level agent dirs")];
					}
					const agents = Array.from(agentStates.values());
					const cols = computeColumns(agentStates.size, width, maxColumns);

					if (cols === 1) {
						return ["", ...agents.map(s => renderAgentCell(s, width, theme))];
					}

					const cellWidth = Math.floor((width - (cols - 1)) / cols);
					const lines: string[] = [];

					for (let i = 0; i < agents.length; i += cols) {
						const row = agents.slice(i, i + cols);
						const cells = row.map(s => renderAgentCell(s, cellWidth, theme));
						lines.push(cells.join("│"));
					}

					return ["", ...lines];
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
				ctx.ui.notify("No teams defined", "warning");
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

	/**
	 * Dynamic system prompt generation based on skill availability.
	 *
	 * - Skills are read from Pi's event.systemPromptOptions.skills
	 * - Agent-catalog-matching routing ("dispatch the most suitable available agent")
	 * - Reference skills by name, do NOT reproduce skill content
	 * - Relay protocol is ALWAYS present (even when no skills exist)
	 * - Signal definitions are injected into explore tasks
	 * - Phase blocks contain routing + skill references only, NO Identity descriptions
	 */
	pi.on("before_agent_start", async (event, _ctx) => {
		// Extract skills from event and compute phase availability
		const skills: Skill[] = event.systemPromptOptions?.skills || [];
		const agentNames = Array.from(agentStates.keys());
		const phases: PhaseAvailability[] = buildOpenSpecPhases(skills, agentNames);

		// Build team configuration
		const teamMembers = Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ");

		// Build all segments dynamically
		const segments = [
			buildIdentitySegment(),
			buildTeamConfigSegment(activeTeamName, teamMembers),
			buildLifecycleSegment(phases, Array.from(agentStates.keys())),
			buildExploreRelaySegment(phases),
			buildGeneralTasksSegment(agentStates as any, phases),
			buildRulesSegment(),
			buildAgentCatalogSegment(agentStates as any),
		];

		// Filter out empty strings and join with double newlines
		const systemPrompt = segments.filter(s => s.length > 0).join("\n\n");

		return { systemPrompt };
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
		const teamsPathMsg = discoveredTeamsPath
			? `Team sets loaded from: ${discoveredTeamsPath}`
			: `Default team active (no teams.yaml found)`;
		_ctx.ui.notify(
			`Team: ${activeTeamName} (${members})\n` +
			`${teamsPathMsg}\n\n` +
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
