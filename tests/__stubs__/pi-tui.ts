/**
 * Stub for @earendil-works/pi-tui.
 *
 * Used when the real package is not installed (e.g., CI). Provides minimal
 * class/function implementations matching the exports used by the extension
 * so vitest can resolve imports without the real package.
 */

// ── TUI Components ────────────────────────────

export class Text {
	text: string;
	constructor(text: string, _x: number, _y: number) {
		this.text = text;
	}
}

export class Box {
	children: any[] = [];
	constructor(_padH: number, _padV: number, _bgFn: Function) {}
	addChild(child: any) {
		this.children.push(child);
	}
}

export class Container {
	children: any[] = [];
	addChild(child: any) {
		this.children.push(child);
	}
}

export class Markdown {
	_content: string;
	_x: number;
	_y: number;
	_theme: any;
	_colorFn?: Function;

	constructor(
		content: string,
		x: number,
		y: number,
		theme: any,
		colorFn?: Function,
	) {
		this._content = content;
		this._x = x;
		this._y = y;
		this._theme = theme;
		this._colorFn = colorFn;
	}
}

export class Spacer {
	_lines: number;
	constructor(lines: number) {
		this._lines = lines;
	}
}

// ── Key handling ─────────────────────────────

export enum Key {
	escape = "escape",
	up = "up",
	down = "down",
	left = "left",
	right = "right",
	pageUp = "pageUp",
	pageDown = "pageDown",
	enter = "enter",
	tab = "tab",
	backspace = "backspace",
	delete = "delete",
	home = "home",
	end = "end",
	insert = "insert",
}

export function matchesKey(data: string, key: Key): boolean {
	// Simplistic stub: match known ANSI codes
	if (key === Key.escape && (data === "\x1b" || data === "\x1b[")) return true;
	if (key === Key.enter && (data === "\r" || data === "\n")) return true;
	if (key === Key.up && data === "\x1b[A") return true;
	if (key === Key.down && data === "\x1b[B") return true;
	if (key === Key.left && data === "\x1b[D") return true;
	if (key === Key.right && data === "\x1b[C") return true;
	if (key === Key.pageUp && data === "\x1b[5~") return true;
	if (key === Key.pageDown && data === "\x1b[6~") return true;
	return false;
}

// ── String utilities ─────────────────────────

export function truncateToWidth(
	str: string,
	width: number,
	_ellipsis?: string,
	padRight?: boolean,
): string {
	if (padRight && str.length < width) return str.padEnd(width, " ");
	if (str.length <= width) return str;
	return str.slice(0, Math.max(0, width));
}

export function visibleWidth(str: string): number {
	return str.length;
}

export function wrapTextWithAnsi(text: string, width: number): string[] {
	const lines: string[] = [];
	for (const line of text.split("\n")) {
		if (line.length <= width) {
			lines.push(line);
		} else {
			for (let i = 0; i < line.length; i += width) {
				lines.push(line.slice(i, i + width));
			}
		}
	}
	return lines;
}

// ── Theme type ────────────────────────────────

export interface Theme {
	fg: (color: string, text: string) => string;
	bg: (color: string, text: string) => string;
	bold: (text: string) => string;
	italic: (text: string) => string;
	strikethrough: (text: string) => string;
	thinkingText: (text: string) => string;
	muted: (text: string) => string;
	toolTitle: (text: string) => string;
	customMessageBg: (text: string) => string;
	[key: string]: any;
}
