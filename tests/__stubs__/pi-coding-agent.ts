/**
 * Stub for @earendil-works/pi-coding-agent.
 *
 * Used when the real package is not installed (e.g., CI). The tests mock
 * this module with vi.mock(), so the stub only needs to exist for vitest's
 * module resolution to succeed. It provides minimal implementations that
 * match the exports imported by the extension and tests.
 */

// ── ExtensionAPI type ──────────────────────────

export interface ExtensionAPI {
	registerTool: (tool: any) => void;
	registerCommand: (name: string, cmd: any) => void;
	on: (event: string, handler: any) => void;
	setActiveTools: (tools: string[]) => void;
}

// ── Skill type ─────────────────────────────────

export interface Skill {
	name: string;
}

// ── SettingsManager ────────────────────────────

export const SettingsManager = {
	create: (_cwd: string, _agentDir: string) => ({
		getHideThinkingBlock: () => false,
		getActiveTools: () => [] as string[],
		setActiveTools: (_tools: string[]) => {},
	}),
	inMemory: (settings: Record<string, any>) => ({
		getHideThinkingBlock: () => false,
		getActiveTools: () => [] as string[],
		setActiveTools: (_tools: string[]) => {},
	}),
};

// ── Utility functions ──────────────────────────

export function getMarkdownTheme(): Record<string, any> {
	return {
		fg: (_c: string, t: string) => t,
		bg: (_c: string, t: string) => t,
	};
}

export function getAgentDir(): string {
	// In CI there's no Pi agent dir, so return a sensible default
	return "";
}

export function parseArgs(args: string[]): Record<string, any> {
	const result: Record<string, any> = { extensions: [], unknownFlags: [] };
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "-e" || args[i] === "--extension") {
			i++;
			if (args[i]) result.extensions.push(args[i]);
		} else if (args[i] === "--no-extensions") {
			result.noExtensions = true;
		} else if (args[i]?.startsWith("--")) {
			const eqIdx = args[i]!.indexOf("=");
			if (eqIdx > 0) {
				const flag = args[i]!.slice(2, eqIdx);
				const val = args[i]!.slice(eqIdx + 1);
				result.unknownFlags.push([flag, val]);
			} else {
				result.unknownFlags.push([args[i]!.slice(2), true]);
			}
		}
	}
	return result;
}

// ── LoadExtensionsResult types ────────────────

export interface LoadExtensionsResult {
	extensions: ExtensionInstanceResult[];
	errors: Array<{ path: string; message: string }>;
}

export interface ExtensionInstanceResult {
	definition?: {
		name?: string;
		description?: string;
		version?: string;
		metadata?: any;
	};
	tools?: Map<string, any>;
	commands?: Map<string, any>;
	handlers?: Map<string, any>;
	[key: string]: any;
}

// ── DefaultResourceLoader (for integration tests) ─

export class DefaultResourceLoader {
	private cwd: string;
	private agentDir: string;
	private extensionFactories: any[];
	private noExtensions: boolean;
	private noSkills: boolean;
	private noPromptTemplates: boolean;
	private noThemes: boolean;
	private noContextFiles: boolean;
	private extensionsResult: LoadExtensionsResult | null = null;
	private _events: Record<string, any[]> = {};
	private _tools: Map<string, any> = new Map();
	private _commands: Map<string, any> = new Map();
	private _handlers: Map<string, any[]> = new Map();

	constructor(options: any) {
		this.cwd = options.cwd || "";
		this.agentDir = options.agentDir || "";
		this.extensionFactories = options.extensionFactories || [];
		this.noExtensions = options.noExtensions || false;
		this.noSkills = options.noSkills || false;
		this.noPromptTemplates = options.noPromptTemplates || false;
		this.noThemes = options.noThemes || false;
		this.noContextFiles = options.noContextFiles || false;
	}

	async reload(_config?: any): Promise<void> {
		this._tools = new Map();
		this._commands = new Map();
		this._handlers = new Map();
		this._events = {};

		const extensions: ExtensionInstanceResult[] = [];

		for (const factory of this.extensionFactories) {
			// Build a mock Pi context (ExtensionAPI) matching what
			// the spec-teams extension expects.
			const handlers: Map<string, any[]> = new Map();
			const tools: Map<string, any> = new Map();
			const commands: Map<string, any> = new Map();

			const api: ExtensionAPI = {
				setActiveTools: (names: string[]) => {
					// no-op stub
				},
				registerTool: (tool: any) => {
					tools.set(tool.name || tool.definition?.name, tool);
				},
				registerCommand: (name: string, cmd: any) => {
					commands.set(name, cmd);
				},
				on: (event: string, handler: any) => {
					const existing = handlers.get(event) || [];
					existing.push(handler);
					handlers.set(event, existing);
				},
			};

			// Invoke the factory with the mock API
			const result = factory(api);

			const extInstance: ExtensionInstanceResult = {
				tools,
				commands,
				handlers,
			};
			extensions.push(extInstance);
		}

		this.extensionsResult = { extensions, errors: [] };
	}

	getExtensions(): LoadExtensionsResult {
		return this.extensionsResult || { extensions: [], errors: [] };
	}

	getSkills(): { skills: any[]; diagnostics: any[] } {
		return { skills: [], diagnostics: [] };
	}

	getPrompts(): { prompts: any[]; diagnostics: any[] } {
		return { prompts: [], diagnostics: [] };
	}

	getThemes(): { themes: any[]; diagnostics: any[] } {
		return { themes: [], diagnostics: [] };
	}

	getAgentsFiles(): { agentsFiles: any[] } {
		return { agentsFiles: [] };
	}

	getSystemPrompt(): string | undefined {
		return undefined;
	}

	getAppendSystemPrompt(): string[] {
		return [];
	}

	extendResources(_paths: any): void {
		// no-op stub
	}
}
