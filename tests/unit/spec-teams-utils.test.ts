import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock definitions – these run before vi.mock factories and imports
// ---------------------------------------------------------------------------
const {
  mockReadFileSync,
  mockExistsSync,
  mockReaddirSync,
  mockJoin,
  mockResolve,
  mockHomedir,
  mockGetAgentDir,
  mockTruncateToWidth,
  mockVisibleWidth,
} = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockJoin: vi.fn((...parts: string[]) => parts.join('/')),
  mockResolve: vi.fn((...parts: string[]) => parts.join('/')),
  mockHomedir: vi.fn(() => '/home/user'),
  mockGetAgentDir: vi.fn(() => '/home/user/.pi/agent'),
  mockTruncateToWidth: vi.fn(
    (str: string, width: number, _ellipsis?: string, padRight?: boolean) => {
      if (padRight && str.length < width) return str.padEnd(width, ' ');
      if (str.length <= width) return str;
      return str.slice(0, Math.max(0, width));
    },
  ),
  mockVisibleWidth: vi.fn((str: string) => str.length),
}));

// ---------------------------------------------------------------------------
// Module mocks (hoisted by vitest before the import below)
// ---------------------------------------------------------------------------
vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
}));

vi.mock('path', () => ({
  join: mockJoin,
  resolve: mockResolve,
}));

vi.mock('os', () => ({
  homedir: mockHomedir,
}));

vi.mock('@earendil-works/pi-coding-agent', () => ({
  getAgentDir: mockGetAgentDir,
}));

vi.mock('@earendil-works/pi-tui', () => ({
  truncateToWidth: mockTruncateToWidth,
  visibleWidth: mockVisibleWidth,
}));

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import type { AgentDef, AgentState } from '../../extensions/spec-teams-utils.ts';
import {
  parseTeamsYaml,
  displayName,
  encodeCwd,
  parseAgentFile,
  formatDuration,
  formatTokens,
  detectStatusSignal,
  formatMetricsFooter,
  splitOutputWithSignals,
  computeColumns,
  renderAgentCell,
  isLocalPath,
  scanAgentDirs,
  buildOpenSpecPhases,
  EXPLORE_SIGNALS,
  buildRulesSegment,
} from '../../extensions/spec-teams-utils.ts';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseTeamsYaml', () => {
  it('single team with members', () => {
    const result = parseTeamsYaml('team-a:\n  - agent1\n  - agent2');
    expect(result).toEqual({ 'team-a': ['agent1', 'agent2'] });
  });

  it('multiple teams', () => {
    const result = parseTeamsYaml('alpha:\n  - a\nbeta:\n  - b\n  - c');
    expect(result).toEqual({ alpha: ['a'], beta: ['b', 'c'] });
  });

  it('empty input returns empty object', () => {
    expect(parseTeamsYaml('')).toEqual({});
  });

  it('teams with no members', () => {
    expect(parseTeamsYaml('lonely:')).toEqual({ lonely: [] });
  });

  it('lines with no team context are ignored (orphan items)', () => {
    expect(parseTeamsYaml('  - orphan\n  - another')).toEqual({});
  });

  it('treats #team: line as a team header (not a comment)', () => {
    // The regex ^(\S[^:]*):$ matches any non-whitespace-prefixed word + colon,
    // so "#team:" is treated as a valid team header.
    const result = parseTeamsYaml('#team:\n  - member');
    expect(result).toEqual({ '#team': ['member'] });
  });

  it('team names with special characters', () => {
    expect(parseTeamsYaml('my-team_v2:\n  - agent')).toEqual({
      'my-team_v2': ['agent'],
    });
  });
});

// ---------------------------------------------------------------------------
describe('displayName', () => {
  it('single word', () => {
    expect(displayName('worker')).toBe('Worker');
  });

  it('multi-word kebab-case', () => {
    expect(displayName('spec-teams-dispatcher')).toBe('Spec Teams Dispatcher');
  });

  it('single letter words', () => {
    expect(displayName('a-b-c')).toBe('A B C');
  });

  it('already title case words preserves uppercase', () => {
    expect(displayName('Worker-Agent')).toBe('Worker Agent');
  });

  it('empty string returns empty string', () => {
    expect(displayName('')).toBe('');
  });

  it('special characters in name', () => {
    expect(displayName('my-agent_v2')).toBe('My Agent_v2');
  });
});

// ---------------------------------------------------------------------------
describe('encodeCwd', () => {
  it('standard Unix path', () => {
    expect(encodeCwd('/home/user/projects/my-app')).toBe(
      '--home-user-projects-my-app--',
    );
  });

  it('path with Windows backslashes', () => {
    // Both : and \ are replaced with -, producing adjacent dashes
    expect(encodeCwd('C:\\Users\\name\\project')).toBe(
      '--C--Users-name-project--',
    );
  });

  it('root path returns ----', () => {
    // stripped = "" → encoded = "" → "--" + "" + "--" = "----"
    expect(encodeCwd('/')).toBe('----');
  });

  it('relative path with dot', () => {
    expect(encodeCwd('./local/path')).toBe('--.-local-path--');
  });

  it('empty string', () => {
    // stripped = "" → encoded = "" → "----"
    expect(encodeCwd('')).toBe('----');
  });
});

// ---------------------------------------------------------------------------
describe('parseAgentFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid agent file', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: worker\ndescription: Does work\ntools: read,bash\n---\n\nYou are a worker agent.',
    );
    const result = parseAgentFile('/fake/path/worker.md');
    expect(result).toEqual({
      name: 'worker',
      description: 'Does work',
      tools: 'read,bash',
      systemPrompt: 'You are a worker agent.',
      file: '/fake/path/worker.md',
      thinking: 'off',
      model: undefined,
      optIn: false,
    });
  });

  it('file with thinking level', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: thinker\ndescription: Thinks hard\ntools: read\nthinking: high\n---\nYou think.',
    );
    const result = parseAgentFile('/fake/path/thinker.md');
    expect(result?.thinking).toBe('high');
  });

  it('file with model', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: model-agent\ndescription: Uses model\ntools: read\nmodel: openrouter/anthropic/claude-sonnet-4.5\n---\nYou use model.',
    );
    const result = parseAgentFile('/fake/path/model-agent.md');
    expect(result?.model).toBe('openrouter/anthropic/claude-sonnet-4.5');
  });

  it('file with opt-in true', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: optin-agent\ndescription: Opted in\ntools: read\nopt-in: true\n---\nI opt in.',
    );
    const result = parseAgentFile('/fake/path/optin-agent.md');
    expect(result?.optIn).toBe(true);
  });

  it('file without opt-in defaults to false', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: no-optin\ndescription: No opt-in\ntools: read\n---\nNo opt-in.',
    );
    const result = parseAgentFile('/fake/path/no-optin.md');
    expect(result?.optIn).toBe(false);
  });

  it('missing name returns null', () => {
    mockReadFileSync.mockReturnValue(
      '---\ndescription: No name\ntools: read\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/noname.md')).toBeNull();
  });

  it('file without frontmatter returns null', () => {
    mockReadFileSync.mockReturnValue('Just plain markdown content.');
    expect(parseAgentFile('/fake/path/no-frontmatter.md')).toBeNull();
  });

  it('file read error returns null', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(parseAgentFile('/fake/path/missing.md')).toBeNull();
  });

  it('legacy thinking "on" maps to "medium"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: legacy\ndescription: Legacy\ntools: read\nthinking: on\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/legacy.md')?.thinking).toBe('medium');
  });

  it('legacy thinking "true" maps to "medium"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: legacy\ndescription: Legacy\ntools: read\nthinking: true\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/legacy.md')?.thinking).toBe('medium');
  });

  it('legacy thinking "off" maps to "off"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: legacy\ndescription: Legacy\ntools: read\nthinking: off\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/legacy.md')?.thinking).toBe('off');
  });

  it('legacy thinking "false" maps to "off"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: legacy\ndescription: Legacy\ntools: read\nthinking: false\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/legacy.md')?.thinking).toBe('off');
  });

  it('absent thinking defaults to "off"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: worker\ndescription: Work\ntools: read\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/worker.md')?.thinking).toBe('off');
  });

  it('default tools when absent', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: worker\ndescription: Work\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/worker.md')?.tools).toBe(
      'read,grep,find,ls',
    );
  });

  it('empty description defaults to empty string', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: worker\ntools: read\n---\nContent.',
    );
    expect(parseAgentFile('/fake/path/worker.md')?.description).toBe('');
  });

  it('subagent_type field is ignored (not in AgentDef)', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: sub\ndescription: Sub agent\ntools: read\nsubagent_type: dispatcher\n---\nContent.',
    );
    const result = parseAgentFile('/fake/path/sub.md');
    expect(result?.name).toBe('sub');
    // subagent_type is not a property of AgentDef — just ignored
  });

  it('unrecognized thinking level warns and falls back to "medium"', () => {
    mockReadFileSync.mockReturnValue(
      '---\nname: custom\ndescription: Custom\ntools: read\nthinking: ultra\n---\nContent.',
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseAgentFile('/fake/path/custom.md');
    expect(result?.thinking).toBe('medium');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized thinking level "ultra"'),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  it('zero milliseconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('less than one second', () => {
    expect(formatDuration(500)).toBe('0s');
  });

  it('exactly one second', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('seconds only', () => {
    expect(formatDuration(45_000)).toBe('45s');
  });

  it('minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('2m 5s');
  });

  it('minutes only', () => {
    expect(formatDuration(180_000)).toBe('3m');
  });

  it('hours and minutes', () => {
    expect(formatDuration(5_400_000)).toBe('1h 30m');
  });

  it('hours only', () => {
    expect(formatDuration(7_200_000)).toBe('2h');
  });

  it('days worth of milliseconds', () => {
    expect(formatDuration(86_400_000)).toBe('24h');
  });

  it('negative values return "0s"', () => {
    expect(formatDuration(-500)).toBe('0s');
    expect(formatDuration(-1000)).toBe('0s');
  });
});

// ---------------------------------------------------------------------------
describe('formatTokens', () => {
  it('less than 1000 returns the number as string', () => {
    expect(formatTokens(500)).toBe('500');
  });

  it('exactly 1000 returns "1.0k"', () => {
    expect(formatTokens(1000)).toBe('1.0k');
  });

  it('between 1k and 10k shows one decimal', () => {
    expect(formatTokens(3500)).toBe('3.5k');
  });

  it('10k or more rounds to integer k', () => {
    expect(formatTokens(12_500)).toBe('13k');
  });

  it('1M or more shows one decimal M', () => {
    expect(formatTokens(1_500_000)).toBe('1.5M');
  });

  it('zero returns "0"', () => {
    expect(formatTokens(0)).toBe('0');
  });

  it('negative numbers return as-is', () => {
    expect(formatTokens(-5)).toBe('-5');
  });

  it('999 returns "999" (boundary below 1000)', () => {
    expect(formatTokens(999)).toBe('999');
  });
});

// ---------------------------------------------------------------------------
describe('detectStatusSignal', () => {
  it('need-input signal', () => {
    const result = detectStatusSignal(
      'Some text\nStatus: need-input\nMore text',
    );
    expect(result).toEqual({ signal: 'need-input', line: 'Status: need-input' });
  });

  it('ready-to-propose signal', () => {
    const result = detectStatusSignal('Summary\nStatus: ready-to-propose');
    expect(result).toEqual({
      signal: 'ready-to-propose',
      line: 'Status: ready-to-propose',
    });
  });

  it('blocked signal', () => {
    const result = detectStatusSignal('Status: blocked');
    expect(result).toEqual({ signal: 'blocked', line: 'Status: blocked' });
  });

  it('done-exploring signal', () => {
    const result = detectStatusSignal('Status: done-exploring\n');
    expect(result).toEqual({
      signal: 'done-exploring',
      line: 'Status: done-exploring',
    });
  });

  it('done signal', () => {
    const result = detectStatusSignal('Status: done');
    expect(result).toEqual({ signal: 'done', line: 'Status: done' });
  });

  it('no signal present returns null', () => {
    expect(detectStatusSignal('Just some text')).toBeNull();
  });

  it('signal not at start of line returns null', () => {
    expect(detectStatusSignal('prefix Status: done')).toBeNull();
  });

  it('whitespace-only before signal still matches if on its own line', () => {
    // The regex has no leading whitespace tolerance — signal must be at line start.
    // "  Status: done" won't match because ^ requires the line starts with "S".
    expect(detectStatusSignal('  Status: done')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('formatMetricsFooter', () => {
  it('minimal details (only toolCount)', () => {
    const result = formatMetricsFooter({ toolCount: 5 });
    expect(result).toContain('🔧 5 calls');
    expect(result).toContain('$0');
    expect(result).toContain('ctx 0%');
  });

  it('with token counts', () => {
    const result = formatMetricsFooter({
      toolCount: 3,
      inputTokens: 1500,
      outputTokens: 800,
    });
    expect(result).toContain('↑1.5k');
    expect(result).toContain('↓800');
  });

  it('with cost', () => {
    const result = formatMetricsFooter({ toolCount: 1, cost: 0.0123 });
    expect(result).toContain('$0.0123');
  });

  it('with model uses short name', () => {
    const result = formatMetricsFooter({
      toolCount: 0,
      model: 'openrouter/anthropic/claude-sonnet-4.5',
    });
    expect(result).toContain('🤖 claude-sonnet-4.5');
  });

  it('model without slash uses full name', () => {
    const result = formatMetricsFooter({ toolCount: 0, model: 'gpt-4' });
    expect(result).toContain('🤖 gpt-4');
  });

  it('fields separated by " · "', () => {
    const result = formatMetricsFooter({
      toolCount: 2,
      inputTokens: 500,
      outputTokens: 300,
      cost: 0.005,
      contextPct: 45,
    });
    expect(result).toMatch(/ · /);
  });

  it('empty object still produces footer with defaults', () => {
    const result = formatMetricsFooter({});
    expect(result).toContain('🔧 0 calls');
    expect(result).toContain('$0');
    expect(result).toContain('ctx 0%');
  });

  it('zero values for tokens omits token parts', () => {
    const result = formatMetricsFooter({
      toolCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      contextPct: 0,
    });
    expect(result).not.toContain('↑');
    expect(result).not.toContain('↓');
    expect(result).toContain('$0');
    expect(result).toContain('ctx 0%');
  });

  it('singular toolCount uses "call"', () => {
    const result = formatMetricsFooter({ toolCount: 1 });
    expect(result).toContain('🔧 1 call');
    expect(result).not.toContain('🔧 1 calls');
  });

  it('special characters in model name', () => {
    const result = formatMetricsFooter({
      toolCount: 0,
      model: 'anthropic/claude-3.5-sonnet-v2',
    });
    expect(result).toContain('🤖 claude-3.5-sonnet-v2');
  });
});

// ---------------------------------------------------------------------------
describe('splitOutputWithSignals', () => {
  it('text with single signal', () => {
    const result = splitOutputWithSignals('Hello\nStatus: done\nWorld');
    expect(result).toEqual([
      { type: 'text', content: 'Hello\n' },
      { type: 'signal', content: 'Status: done', signalName: 'done' },
      { type: 'text', content: '\nWorld' },
    ]);
  });

  it('text with no signal returns single text segment', () => {
    expect(splitOutputWithSignals('Just plain text')).toEqual([
      { type: 'text', content: 'Just plain text' },
    ]);
  });

  it('text with multiple signals returns segments for each', () => {
    const result = splitOutputWithSignals(
      'A\nStatus: need-input\nB\nStatus: done\nC',
    );
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: 'text', content: 'A\n' });
    expect(result[1]).toEqual({
      type: 'signal',
      content: 'Status: need-input',
      signalName: 'need-input',
    });
    expect(result[2]).toEqual({ type: 'text', content: '\nB\n' });
    expect(result[3]).toEqual({
      type: 'signal',
      content: 'Status: done',
      signalName: 'done',
    });
    expect(result[4]).toEqual({ type: 'text', content: '\nC' });
  });

  it('empty input returns empty array', () => {
    expect(splitOutputWithSignals('')).toEqual([]);
  });

  it('signal with surrounding whitespace produces text segments', () => {
    const result = splitOutputWithSignals(
      'text\nStatus: blocked\n\nmore',
    );
    expect(result).toEqual([
      { type: 'text', content: 'text\n' },
      {
        type: 'signal',
        content: 'Status: blocked',
        signalName: 'blocked',
      },
      { type: 'text', content: '\n\nmore' },
    ]);
  });

  it('signal at start of text produces empty leading text segment', () => {
    const result = splitOutputWithSignals('Status: done\nok');
    // The match is at index 0, so no leading text segment
    expect(result[0]).toEqual({
      type: 'signal',
      content: 'Status: done',
      signalName: 'done',
    });
    expect(result[1]).toEqual({ type: 'text', content: '\nok' });
  });
});

// ---------------------------------------------------------------------------
describe('computeColumns', () => {
  it('one agent, wide terminal returns 1', () => {
    expect(computeColumns(1, 80, 3)).toBe(1);
  });

  it('six agents, wide terminal, max 3 returns 3', () => {
    expect(computeColumns(6, 80, 3)).toBe(3);
  });

  it('six agents, narrow terminal, max 6 returns 2', () => {
    expect(computeColumns(6, 30, 6)).toBe(2);
  });

  it('narrow terminal forces single column', () => {
    expect(computeColumns(3, 12, 3)).toBe(1);
  });

  it('zero agents returns 1 (min column)', () => {
    expect(computeColumns(0, 80, 3)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe('renderAgentCell', () => {
  const mockTheme = {
    fg: vi.fn((_color: string, text: string) => text),
  };

  function makeState(
    overrides: Partial<AgentState> = {},
  ): AgentState {
    return {
      def: {
        name: 'worker',
        description: 'Test agent',
        tools: 'read',
        systemPrompt: 'You are a test agent.',
        file: '/fake/path/worker.md',
        thinking: 'off',
        model: undefined,
        optIn: false,
      },
      status: 'idle',
      task: 'testing',
      toolCount: 0,
      elapsed: 0,
      lastWork: '',
      contextPct: 50,
      sessionFile: null,
      runCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('idle agent cell', () => {
    const state = makeState({ status: 'idle', contextPct: 50 });
    const result = renderAgentCell(state, 20, mockTheme);
    // icon + " " + name + " " + pct = "○ Worker 50%" (12 chars), padded to 20
    expect(result).toBe('○ Worker 50%        ');
    // visible width should equal cellWidth
    expect(mockVisibleWidth).toHaveBeenCalled();
  });

  it('running agent cell', () => {
    const state = makeState({ status: 'running', contextPct: 75 });
    const result = renderAgentCell(state, 20, mockTheme);
    expect(result).toContain('●');
    expect(result).toContain('Worker');
    expect(result).toContain('75%');
  });

  it('done agent cell', () => {
    const state = makeState({ status: 'done', contextPct: 100 });
    const result = renderAgentCell(state, 20, mockTheme);
    expect(result).toContain('✓');
    expect(result).toContain('Worker');
  });

  it('error agent cell', () => {
    const state = makeState({ status: 'error', contextPct: 30 });
    const result = renderAgentCell(state, 20, mockTheme);
    expect(result).toContain('✗');
    expect(result).toContain('Worker');
  });

  it('narrow cell drops percentage', () => {
    const state = makeState({ status: 'idle', contextPct: 50, def: { ...makeState().def, name: 'worker' } });
    // cellWidth = 6 yields nameBudget = 6-1-1-1-3 = 0 (< 1)
    const result = renderAgentCell(state, 6, mockTheme);
    expect(result).not.toContain('50%');
    // Should just be icon + space + truncated name, padded to 6
    expect(result).toHaveLength(6);
  });

  it('cell is correctly padded to exact cellWidth', () => {
    const state = makeState({ status: 'idle' });
    const result = renderAgentCell(state, 20, mockTheme);
    expect(result).toHaveLength(20);
  });

  it('cell with longer name truncation', () => {
    const state = makeState({
      status: 'idle',
      contextPct: 10,
      def: { ...makeState().def, name: 'very-long-agent-name-for-testing' },
    });
    // cellWidth 20 → nameBudget = 20-1-1-1-3 = 14
    // displayName("very-long-agent-name-for-testing") = "Very Long Agent Name For Testing" (31 chars)
    // truncated to 14 chars
    const result = renderAgentCell(state, 20, mockTheme);
    expect(result).toHaveLength(20);
    const pctPos = result.indexOf('10%');
    expect(pctPos).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe('isLocalPath', () => {
  it('relative path with ./ returns true', () => {
    expect(isLocalPath('./extensions/spec-teams.ts')).toBe(true);
  });

  it('relative path with ../ returns true', () => {
    expect(isLocalPath('../some/extension.ts')).toBe(true);
  });

  it('absolute path returns true', () => {
    expect(isLocalPath('/home/user/ext.ts')).toBe(true);
  });

  it('package name (not local) returns false', () => {
    expect(isLocalPath('@scope/package')).toBe(false);
  });

  it('plain package name (not local) returns false', () => {
    expect(isLocalPath('spec-teams-extension')).toBe(false);
  });

  it('URL returns false', () => {
    expect(isLocalPath('https://example.com/pkg')).toBe(false);
  });

  it('empty string returns false', () => {
    expect(isLocalPath('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('scanAgentDirs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no directories exist
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('');
  });

  it('agents found in project agents/ directory', () => {
    const cwd = '/project';
    // Only /project/agents exists
    mockExistsSync.mockImplementation(
      (p: string) => p === '/project/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents') return ['worker.md'];
      return [];
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/worker.md') {
        return '---\nname: worker\ndescription: A worker\ntools: read\n---\nYou are a worker.';
      }
      return '';
    });

    const result = scanAgentDirs(cwd);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('worker');
    expect(result[0].file).toContain('worker.md');
  });

  it('project agent wins over user-level collision', () => {
    const cwd = '/project';
    mockExistsSync.mockImplementation(
      (p: string) =>
        p === '/project/agents' ||
        p === '/home/user/.pi/agent/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents' || p === '/home/user/.pi/agent/agents') {
        return ['worker.md'];
      }
      return [];
    });
    // Project version
    const projectContent =
      '---\nname: worker\ndescription: Project worker\ntools: read\n---\nProject.';
    // User version
    const userContent =
      '---\nname: worker\ndescription: User worker\ntools: write\n---\nUser.';
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/worker.md') return projectContent;
      if (p === '/home/user/.pi/agent/agents/worker.md') return userContent;
      return '';
    });

    const result = scanAgentDirs(cwd);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Project worker');
  });

  it('no agent directories exist returns empty array', () => {
    mockExistsSync.mockReturnValue(false);
    const result = scanAgentDirs('/nonexistent');
    expect(result).toEqual([]);
  });

  it('non-.md files are ignored', () => {
    const cwd = '/project';
    mockExistsSync.mockImplementation(
      (p: string) => p === '/project/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents') {
        return ['notes.txt', 'agent.md', 'readme.md'];
      }
      return [];
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/agent.md') {
        return '---\nname: myagent\ndescription: Real agent\ntools: read\n---\nContent.';
      }
      if (p === '/project/agents/readme.md') {
        return '---\nname: readme\ndescription: Readme\ntools: read\n---\nReadme.';
      }
      return '';
    });

    const result = scanAgentDirs(cwd);
    // notes.txt should be ignored, agent.md and readme.md processed
    expect(result).toHaveLength(2);
  });

  it('invalid agent files (no frontmatter) are skipped', () => {
    const cwd = '/project';
    mockExistsSync.mockImplementation(
      (p: string) => p === '/project/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents') return ['bad.md', 'good.md'];
      return [];
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/bad.md') return 'no frontmatter here';
      if (p === '/project/agents/good.md') {
        return '---\nname: goodone\ndescription: Valid\ntools: read\n---\nContent.';
      }
      return '';
    });

    const result = scanAgentDirs(cwd);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('goodone');
  });

  it('case-insensitive name collision deduplicates', () => {
    const cwd = '/project';
    mockExistsSync.mockImplementation(
      (p: string) =>
        p === '/project/agents' ||
        p === '/project/.pi/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents' || p === '/project/.pi/agents') {
        return ['Worker.md'];
      }
      return [];
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/Worker.md') {
        return '---\nname: Worker\ndescription: Capital W\ntools: read\n---\nContent.';
      }
      if (p === '/project/.pi/agents/Worker.md') {
        return '---\nname: worker\ndescription: Lower w\ntools: write\n---\nContent.';
      }
      return '';
    });

    const result = scanAgentDirs(cwd);
    expect(result).toHaveLength(1);
    // Should pick the first occurrence (project-level)
    expect(result[0].description).toBe('Capital W');
  });

  it('dir not found (ENOENT) handled gracefully', () => {
    mockExistsSync.mockReturnValue(false);
    // If existsSync returns false, the dir is skipped entirely
    const result = scanAgentDirs('/nowhere');
    expect(result).toEqual([]);
  });

  it('subdirectories inside agents/ are not recursed into', () => {
    const cwd = '/project';
    mockExistsSync.mockImplementation(
      (p: string) => p === '/project/agents',
    );
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === '/project/agents') {
        // subagent/ is a directory but readdirSync returns it as a name
        return ['subagent', 'valid.md'];
      }
      return [];
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === '/project/agents/valid.md') {
        return '---\nname: valid\ndescription: Valid\ntools: read\n---\nContent.';
      }
      return '';
    });

    const result = scanAgentDirs(cwd);
    // 'subagent' has no .md extension, so it's skipped
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
describe('buildOpenSpecPhases', () => {
  const mockSkill = (name: string) => ({
    name,
    description: `Description for ${name}`,
    filePath: `/fake/${name}/SKILL.md`,
    baseDir: '/fake',
    sourceInfo: { type: 'dir', path: '/fake' } as any,
    disableModelInvocation: false,
  });

  it('all skills present marks all available except verify (no skill, no agent)', () => {
    const skills = [
      mockSkill('openspec-explore'),
      mockSkill('openspec-propose'),
      mockSkill('openspec-apply-change'),
      mockSkill('openspec-archive-change'),
    ];
    const phases = buildOpenSpecPhases(skills, []);
    expect(phases).toHaveLength(5);
    expect(phases.find(p => p.phase === 'explore')?.available).toBe(true);
    expect(phases.find(p => p.phase === 'propose')?.available).toBe(true);
    expect(phases.find(p => p.phase === 'apply')?.available).toBe(true);
    expect(phases.find(p => p.phase === 'verify')?.available).toBe(false); // No skill, no agent
    expect(phases.find(p => p.phase === 'archive')?.available).toBe(true);
  });

  it('verify phase available when verify agent is present', () => {
    const skills = [
      mockSkill('openspec-explore'),
      mockSkill('openspec-propose'),
      mockSkill('openspec-apply-change'),
      mockSkill('openspec-archive-change'),
    ];
    const phases = buildOpenSpecPhases(skills, ['verify']);
    expect(phases.find(p => p.phase === 'verify')?.available).toBe(true); // Agent present
  });

  it('no skills marks all unavailable', () => {
    const phases = buildOpenSpecPhases([], []);
    expect(phases).toHaveLength(5);
    phases.forEach(p => {
      expect(p.available).toBe(false);
    });
  });

  it('partial skills marks only matching phases available', () => {
    const skills = [mockSkill('openspec-explore')];
    const phases = buildOpenSpecPhases(skills, []);
    expect(phases.find(p => p.phase === 'explore')?.available).toBe(true);
    expect(phases.find(p => p.phase === 'propose')?.available).toBe(false);
    expect(phases.find(p => p.phase === 'apply')?.available).toBe(false);
  });

  it('null input is treated as empty array', () => {
    const phases = buildOpenSpecPhases(null, []);
    expect(phases).toHaveLength(5);
    phases.forEach(p => {
      expect(p.available).toBe(false);
    });
  });

  it('undefined input is treated as empty array', () => {
    const phases = buildOpenSpecPhases(undefined, []);
    expect(phases).toHaveLength(5);
    phases.forEach(p => {
      expect(p.available).toBe(false);
    });
  });

  it('non-OpenSpec skills are ignored', () => {
    const skills = [
      mockSkill('some-other-skill'),
      mockSkill('another-skill'),
    ];
    const phases = buildOpenSpecPhases(skills, []);
    phases.forEach(p => {
      expect(p.available).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
describe('EXPLORE_SIGNALS', () => {
  it('has four signals', () => {
    expect(EXPLORE_SIGNALS).toHaveLength(4);
  });

  it('signals have expected names', () => {
    const names = EXPLORE_SIGNALS.map(s => s.name);
    expect(names).toContain('need-input');
    expect(names).toContain('ready-to-propose');
    expect(names).toContain('done-exploring');
    expect(names).toContain('blocked');
  });

  it('signals have descriptions', () => {
    EXPLORE_SIGNALS.forEach(signal => {
      expect(signal.description).toBeTruthy();
      expect(typeof signal.description).toBe('string');
      expect(signal.description.length).toBeGreaterThan(0);
    });
  });

  it('signal descriptions match relay protocol expectations', () => {
    const needInput = EXPLORE_SIGNALS.find(s => s.name === 'need-input');
    expect(needInput?.description).toContain('relay verbatim');
    expect(needInput?.description).toContain('wait for reply');

    const readyToPropose = EXPLORE_SIGNALS.find(s => s.name === 'ready-to-propose');
    expect(readyToPropose?.description).toContain('extract');
    expect(readyToPropose?.description).toContain('ask approval');

    const doneExploring = EXPLORE_SIGNALS.find(s => s.name === 'done-exploring');
    expect(doneExploring?.description).toContain('relay summary');
    expect(doneExploring?.description).toContain('return to normal');

    const blocked = EXPLORE_SIGNALS.find(s => s.name === 'blocked');
    expect(blocked?.description).toContain('relay blocker');
    expect(blocked?.description).toContain('ask how to proceed');
  });
});

// ---------------------------------------------------------------------------
describe('buildRulesSegment', () => {
  it('contains ## Agents catalog reference', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('## Agents');
  });

  it('contains write and edit as implementation tool examples', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('write and edit');
  });

  it('contains read and grep as investigation tool examples', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('read and grep');
  });

  it('contains bash as command-running tool example', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('bash');
  });

  it('preserves existing NEVER try to read rule', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('NEVER try to read, write, or execute code directly');
  });

  it('preserves existing ALWAYS use dispatch_agent rule', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('ALWAYS use dispatch_agent');
  });

  it('preserves existing Keep tasks focused rule', () => {
    const rules = buildRulesSegment();
    expect(rules).toContain('Keep tasks focused');
  });

  it('contains all six rules', () => {
    const rules = buildRulesSegment();
    // Count bullet points (lines starting with "- ")
    const bulletCount = (rules.match(/^- /gm) || []).length;
    expect(bulletCount).toBe(6);
  });
});
