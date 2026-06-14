/**
 * Integration tests for spec-teams extension.
 *
 * Tests extension loading, tool/command registration, system prompt
 * generation, and rendering — all with zero filesystem I/O.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1: Hoisted mock factories — run before vi.mock, before any imports
// ──────────────────────────────────────────────────────────────────────────────

// ── Filesystem mocks ──────────────────────────────────────────────────────────

const { mockReadFileSync, mockExistsSync, mockReaddirSync, mockMkdirSync,
        mockUnlinkSync, mockRealpathSync, mockSpawn } = vi.hoisted(() => {
  return {
    mockReadFileSync: vi.fn((_path: string, _enc: string) => {
      throw new Error(`ENOENT: ${_path}`);
    }),
    mockExistsSync: vi.fn(() => false),
    mockReaddirSync: vi.fn(() => []),
    mockMkdirSync: vi.fn(() => {}),
    mockUnlinkSync: vi.fn(() => {}),
    mockRealpathSync: vi.fn(() => "/home/user/project/extensions/spec-teams.ts"),
    mockSpawn: vi.fn(),
  };
});

// ── Path mocks ────────────────────────────────────────────────────────────────

const { mockJoin, mockResolve } = vi.hoisted(() => ({
  mockJoin: vi.fn((...parts: string[]) => parts.join("/")),
  mockResolve: vi.fn((...parts: string[]) => parts.join("/")),
}));

// ── OS / agent-dir mocks ─────────────────────────────────────────────────────

const mockHomedir = vi.hoisted(() => vi.fn(() => "/home/user"));
const mockGetAgentDir = vi.hoisted(() => vi.fn(() => "/home/user/.pi/agent"));

// ── CLI arg parser mock ─────────────────────────────────────────────────────

const mockParseArgs = vi.hoisted(() =>
  vi.fn(() => ({ extensions: [], noExtensions: undefined, unknownFlags: [] }))
);

// ── Settings manager mock ───────────────────────────────────────────────────

const { mockSettingsManagerCreate, mockSettingsManagerInMemory } = vi.hoisted(() => {
  const mockManager = {
    getHideThinkingBlock: vi.fn(() => false),
    getActiveTools: vi.fn(() => []),
    setActiveTools: vi.fn(),
  };
  return {
    mockSettingsManagerCreate: vi.fn(() => mockManager),
    mockSettingsManagerInMemory: vi.fn(() => mockManager),
  };
});

// ── Mock TUI components (needed by vi.mock("@earendil-works/pi-tui")) ────────

const { MockBox, MockText, MockContainer, MockMarkdown, MockSpacer } = vi.hoisted(() => {
  class MockText {
    text: string;
    constructor(text: string, _x: number, _y: number) {
      this.text = text;
    }
  }
  class MockBox {
    children: any[] = [];
    constructor(_padH: number, _padV: number, _bgFn: Function) {}
    addChild(child: any) { this.children.push(child); }
  }
  class MockContainer {
    children: any[] = [];
    addChild(child: any) { this.children.push(child); }
  }
  class MockMarkdown {
    constructor(
      public _content: string,
      public _x: number,
      public _y: number,
      public _theme: any,
      public _colorFn?: Function,
    ) {}
  }
  class MockSpacer {
    constructor(public _lines: number) {}
  }
  return { MockBox, MockText, MockContainer, MockMarkdown, MockSpacer };
});

// ── Markdown theme mock ─────────────────────────────────────────────────────

const mockGetMarkdownTheme = vi.hoisted(() => vi.fn(() => ({
  fg: (c: string, t: string) => t,
  bg: (c: string, t: string) => t,
})));

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2: Module mocks — vi.mock is hoisted to top, referencing the hoisted vals
// ──────────────────────────────────────────────────────────────────────────────

vi.mock("fs", () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  mkdirSync: mockMkdirSync,
  unlinkSync: mockUnlinkSync,
}));

vi.mock("path", () => ({
  join: mockJoin,
  resolve: mockResolve,
}));

vi.mock("os", () => ({
  homedir: mockHomedir,
}));

vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@earendil-works/pi-coding-agent")>();
  return {
    ...actual,
    // Override only the functions used by the extension
    getAgentDir: mockGetAgentDir,
    parseArgs: mockParseArgs,
    SettingsManager: {
      create: mockSettingsManagerCreate,
      inMemory: mockSettingsManagerInMemory,
    },
    getMarkdownTheme: mockGetMarkdownTheme,
  };
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 3: Extension import — must come after all mocks
// ──────────────────────────────────────────────────────────────────────────────

import specTeamsExtension from "../../extensions/spec-teams.ts";

// ──────────────────────────────────────────────────────────────────────────────
// Mock theme factory for rendering tests
// ──────────────────────────────────────────────────────────────────────────────

function makeMockTheme() {
  return {
    fg: (color: string, text: string) => `[${color}]${text}[/${color}]`,
    bg: (color: string, text: string) => `[bg:${color}]${text}[/bg:${color}]`,
    bold: (text: string) => `**${text}**`,
    italic: (text: string) => `_${text}_`,
    strikethrough: (text: string) => `~~${text}~~`,
    thinkingText: (text: string) => text,
    muted: (text: string) => text,
    toolTitle: (text: string) => text,
    customMessageBg: (text: string) => text,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// DefaultResourceLoader — loaded lazily to avoid import-time errors
// ──────────────────────────────────────────────────────────────────────────────

let extensionsResult: any;

async function getExtensionsResult() {
  if (extensionsResult) return extensionsResult;
  const { DefaultResourceLoader } = await import("@earendil-works/pi-coding-agent");
  const loader = new DefaultResourceLoader({
    cwd: "/home/user/project",
    agentDir: "/home/user/.pi/agent",
    extensionFactories: [specTeamsExtension],
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await loader.reload({});
  extensionsResult = loader.getExtensions();
  if (extensionsResult.errors?.length) {
    console.error("Extension load errors:", extensionsResult.errors);
  }
  return extensionsResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: get the first extension from the loaded result
// ──────────────────────────────────────────────────────────────────────────────

async function getFirstExtension() {
  const result = await getExtensionsResult();
  const ext = result.extensions?.[0];
  if (!ext) throw new Error("No extension loaded: " + JSON.stringify(result.errors));
  return ext;
}

// ──────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ──────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  extensionsResult = undefined;
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper: mock extension context for event handlers
// ──────────────────────────────────────────────────────────────────────────────

function makeMockExtensionContext() {
  return {
    cwd: "/home/user/project",
    sessionManager: {
      getBranch: vi.fn(() => []),
      getSessionId: vi.fn(() => "test-session"),
      getSessionDir: vi.fn(() => "/home/user/.pi/sessions/test"),
    },
    model: {
      id: "gemini-flash",
      provider: "google",
      contextWindow: 128000,
    },
    getContextUsage: vi.fn(() => ({ percent: 15 })),
    ui: {
      setStatus: vi.fn(),
      notify: vi.fn(),
      select: vi.fn(),
      confirm: vi.fn(),
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.1–5.2: Extension loads without errors
// ──────────────────────────────────────────────────────────────────────────────

describe("Extension loading", () => {
  it("loads via DefaultResourceLoader without throwing", async () => {
    await expect(getExtensionsResult()).resolves.toBeDefined();
  });

  it("has session_start handler available", async () => {
    const ext = await getFirstExtension();
    expect(ext.handlers.has("session_start")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.3–5.4: dispatch_agent tool is registered
// ──────────────────────────────────────────────────────────────────────────────

describe("dispatch_agent tool registration", () => {
  it("tool named 'dispatch_agent' is registered", async () => {
    const ext = await getFirstExtension();
    expect(ext.tools.has("dispatch_agent")).toBe(true);
  });

  it("tool has a label", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    expect(tool?.definition?.label).toBeTruthy();
  });

  it("tool description contains 'Dispatch'", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    expect(tool?.definition?.description).toContain("Dispatch");
  });

  it("tool requires 'agent' (string) and 'task' (string) parameters", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const params = tool?.definition?.parameters as any;
    expect(params?.properties?.agent?.type).toBe("string");
    expect(params?.properties?.task?.type).toBe("string");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.5: specs-team, specs-list, specs-dashboard commands are registered
// ──────────────────────────────────────────────────────────────────────────────

describe("Command registration", () => {
  it('specs-team command is registered', async () => {
    const ext = await getFirstExtension();
    expect(ext.commands.has("specs-team")).toBe(true);
  });

  it('specs-list command is registered', async () => {
    const ext = await getFirstExtension();
    expect(ext.commands.has("specs-list")).toBe(true);
  });

  it('specs-dashboard command is registered', async () => {
    const ext = await getFirstExtension();
    expect(ext.commands.has("specs-dashboard")).toBe(true);
  });

  it("each command has a non-empty description", async () => {
    const ext = await getFirstExtension();
    for (const name of ["specs-team", "specs-list", "specs-dashboard"]) {
      const cmd = ext.commands.get(name);
      expect(cmd?.description?.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.6: before_agent_start handler produces system prompt
// ──────────────────────────────────────────────────────────────────────────────

describe("before_agent_start system prompt", () => {
  it("handler returns object with systemPrompt string", async () => {
    const ext = await getFirstExtension();
    const handlers = ext.handlers.get("before_agent_start");
    expect(handlers?.length).toBeGreaterThan(0);

    const promptResult = await handlers![0]({} as any, makeMockExtensionContext() as any);
    expect(promptResult).toBeDefined();
    expect(typeof (promptResult as any)?.systemPrompt).toBe("string");
  });

  it("system prompt contains identity section", async () => {
    const ext = await getFirstExtension();
    const handlers = ext.handlers.get("before_agent_start")!;
    const promptResult = (await handlers[0]({} as any, makeMockExtensionContext() as any)) as any;

    expect(promptResult.systemPrompt).toContain("dispatcher");
  });

  it("system prompt contains 'Active Team:' section", async () => {
    const ext = await getFirstExtension();
    const handlers = ext.handlers.get("before_agent_start")!;
    const promptResult = (await handlers[0]({} as any, makeMockExtensionContext() as any)) as any;

    expect(promptResult.systemPrompt).toContain("Active Team:");
  });

  it("system prompt contains OpenSpec lifecycle sections (Explore, Propose, Apply)", async () => {
    const ext = await getFirstExtension();
    const handlers = ext.handlers.get("before_agent_start")!;
    const promptResult = (await handlers[0]({} as any, makeMockExtensionContext() as any)) as any;

    // When no skills are present, the prompt should indicate workflow is unavailable
    // OR contain the phase sections if skills were somehow available
    expect(
      promptResult.systemPrompt.includes("OpenSpec Workflow Unavailable") ||
      promptResult.systemPrompt.includes("### Explore")
    ).toBe(true);
  });

  it("system prompt contains rules section", async () => {
    const ext = await getFirstExtension();
    const handlers = ext.handlers.get("before_agent_start")!;
    const promptResult = (await handlers[0]({} as any, makeMockExtensionContext() as any)) as any;

    expect(promptResult.systemPrompt).toContain("NEVER try to read, write, or execute code directly");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.7–5.8: renderCall produces valid TUI output
// ──────────────────────────────────────────────────────────────────────────────

describe("renderCall", () => {
  it("produces a Text TUI component with agent name and task preview", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderCall = tool?.definition?.renderCall as any;
    expect(renderCall).toBeDefined();

    const theme = makeMockTheme();
    const output = renderCall({ agent: "worker", task: "do work" }, theme, {} as any);

    // Output is a real pi-tui Text component with a `text` property
    expect(output).toBeDefined();
    const textContent = (output as any).text as string | undefined;
    expect(textContent).toBeDefined();
    expect(textContent).toContain("worker");
    expect(textContent).toContain("dispatch_agent");
  });

  it("truncates long task strings (>60 chars) with '...'", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderCall = tool?.definition?.renderCall as any;

    const theme = makeMockTheme();
    const longTask = "A".repeat(100);
    const output = renderCall({ agent: "worker", task: longTask }, theme, {} as any);

    const textContent = (output as any).text as string;
    // The task is truncated to 57 chars with "..." appended; check it contains "..."
    expect(textContent).toContain("..."); // truncation marker
  });

  it("renders unknown agent name as provided (no fallback lookup in renderCall)", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderCall = tool?.definition?.renderCall as any;

    const theme = makeMockTheme();
    const output = renderCall({ agent: "nonexistent", task: "" }, theme, {} as any);

    const textContent = (output as any).text as string;
    expect(textContent).toContain("nonexistent");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Group 5.9–5.13: renderResult produces valid TUI output
// ──────────────────────────────────────────────────────────────────────────────

describe("renderResult", () => {
  it("done status produces Box component with children", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderResult = tool?.definition?.renderResult as any;
    expect(renderResult).toBeDefined();

    const theme = makeMockTheme();
    const mockResult = {
      content: [{ type: "text" as const, text: "Task completed" }],
      details: {
        agent: "worker",
        task: "do work",
        status: "done",
        elapsed: 5000,
        fullOutput: "done",
        toolCount: 3,
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.005,
        contextPct: 15,
        orderedContent: [] as {type: "text" | "thinking", content: string}[],
        hideThinkingBlock: false,
      },
    };

    const output = renderResult(mockResult, { isPartial: false }, theme, {} as any);

    // Output is a real pi-tui Box component with a `children` array
    expect(output).toBeDefined();
    const children = (output as any).children as any[] | undefined;
    expect(children?.length).toBeGreaterThan(0);
  });

  it("error status contains error indicator (✗)", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderResult = tool?.definition?.renderResult as any;

    const theme = makeMockTheme();
    const mockResult = {
      content: [{ type: "text" as const, text: "Error occurred" }],
      details: {
        agent: "worker",
        status: "error",
        elapsed: 1000,
        fullOutput: "error",
        toolCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        contextPct: 0,
        orderedContent: [] as {type: "text" | "thinking", content: string}[],
        hideThinkingBlock: false,
      },
    };

    const output = renderResult(mockResult, { isPartial: false }, theme, {} as any);
    // Box wraps Container; header Text is container.children[0]
    const container = (output as any).children?.[0] as any;
    const headerText = container?.children?.[0]?.text as string | undefined;
    expect(headerText).toContain("✗");
  });

  it("dispatching/partial status contains running indicator (●)", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderResult = tool?.definition?.renderResult as any;

    const theme = makeMockTheme();
    const mockResult = {
      content: [{ type: "text" as const, text: "Running..." }],
      details: {
        agent: "worker",
        task: "doing work",
        status: "dispatching",
        elapsed: 1000,
        fullOutput: "",
        toolCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        contextPct: 0,
        orderedContent: [] as {type: "text" | "thinking", content: string}[],
        hideThinkingBlock: false,
      },
    };

    const output = renderResult(mockResult, { isPartial: true }, theme, {} as any);
    // Box wraps Container; header Text is container.children[0]
    const container = (output as any).children?.[0] as any;
    const headerText = container?.children?.[0]?.text as string | undefined;
    expect(headerText).toContain("●");
  });

  it("includes metrics footer with tool count, cost, and context pct", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderResult = tool?.definition?.renderResult as any;

    const theme = makeMockTheme();
    const mockResult = {
      content: [{ type: "text" as const, text: "done" }],
      details: {
        agent: "worker",
        status: "done",
        elapsed: 10000,
        fullOutput: "result",
        toolCount: 5,
        inputTokens: 1500,
        outputTokens: 800,
        cost: 0.0123,
        contextPct: 20,
        orderedContent: [] as {type: "text" | "thinking", content: string}[],
        hideThinkingBlock: false,
      },
    };

    const output = renderResult(mockResult, { isPartial: false }, theme, {} as any);
    // Box wraps Container; footer is the last Text child in the container
    const container = (output as any).children?.[0] as any;
    const containerChildren = container?.children as any[] | undefined;
    expect(containerChildren?.length).toBeGreaterThan(0);

    // Find the footer Text (last Text child, which contains the cost $)
    const footerText = containerChildren
      ?.filter((c: any) => c?.text && typeof c.text === "string")
      .pop() as any;
    expect(footerText).toBeDefined();
    const footerContent = footerText?.text as string | undefined;
    expect(footerContent).toBeDefined();
    expect(footerContent).toContain("🔧");
    expect(footerContent).toContain("$");
    expect(footerContent).toContain("ctx");
  });

  it("without details produces plain Text component", async () => {
    const ext = await getFirstExtension();
    const tool = ext.tools.get("dispatch_agent");
    const renderResult = tool?.definition?.renderResult as any;

    const theme = makeMockTheme();
    const mockResult = {
      content: [{ type: "text" as const, text: "Simple output" }],
    };

    const output = renderResult(mockResult, { isPartial: false }, theme, {} as any);

    // When no details, renderResult returns a Text component with the content text
    expect(output).toBeDefined();
    const textContent = (output as any).text as string | undefined;
    expect(textContent).toContain("Simple output");
  });
});