import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Retrieve the global npm root directory (where "npm install -g" puts
 * packages). Returns undefined if the command fails or returns empty.
 */
function getGlobalRoot(): string | undefined {
	try {
		const out = execSync("npm root -g", { encoding: "utf-8" })
			.toString()
			.trim();
		return out || undefined;
	} catch {
		return undefined;
	}
}

const _globalRoot = getGlobalRoot();

/**
 * Check whether a package directory exists under a given root.
 */
function pkgExists(dir: string): boolean {
	return existsSync(resolve(dir, "package.json"));
}

const STUB_DIR = resolve(__dirname, "tests", "__stubs__");

// ── Package resolution ─────────────────────────

/**
 * Resolve @earendil-works/pi-coding-agent to the real package.
 *
 * This package is needed at full fidelity because the integration tests
 * use vi.mock(..., async (importOriginal) => { ... }) which requires
 * the real module to be resolvable.
 */
function resolvePiCodingAgent(): string {
	// 1. Local node_modules
	const localDir = resolve(__dirname, "node_modules/@earendil-works/pi-coding-agent");
	if (pkgExists(localDir)) {
		return localDir;
	}
	// 2. Global npm root
	if (_globalRoot) {
		const globalDir = resolve(_globalRoot, "@earendil-works/pi-coding-agent");
		if (pkgExists(globalDir)) {
			return globalDir;
		}
	}
	// 3. Fallback stub
	return resolve(STUB_DIR, "pi-coding-agent.ts");
}

/**
 * Resolve @earendil-works/pi-tui.
 *
 * This is a peer dependency not installed in CI. When not found, fall
 * back to the test stub. The integration tests do mock this with
 * vi.mock(), so the stub only needs to exist for module resolution.
 */
function resolvePiTui(): string {
	// 1. Local node_modules
	const localDir = resolve(__dirname, "node_modules/@earendil-works/pi-tui");
	if (pkgExists(localDir)) {
		return localDir;
	}
	// 2. Global root (not typically installed globally)
	if (_globalRoot) {
		const globalDir = resolve(_globalRoot, "@earendil-works/pi-tui");
		if (pkgExists(globalDir)) {
			return globalDir;
		}
		// 3. Nested inside pi-coding-agent/node_modules/
		const nestedDir = resolve(
			_globalRoot,
			"@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui",
		);
		if (pkgExists(nestedDir)) {
			return nestedDir;
		}
	}
	// 4. Fallback stub
	return resolve(STUB_DIR, "pi-tui.ts");
}

/**
 * Resolve typebox.
 *
 * Same pattern as pi-tui — peer dependency, falls back to stub.
 */
function resolveTypebox(): string {
	const localDir = resolve(__dirname, "node_modules/typebox");
	if (pkgExists(localDir)) {
		return localDir;
	}
	if (_globalRoot) {
		const nestedDir = resolve(
			_globalRoot,
			"@earendil-works/pi-coding-agent/node_modules/typebox",
		);
		if (pkgExists(nestedDir)) {
			return nestedDir;
		}
	}
	return resolve(STUB_DIR, "typebox.ts");
}

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
	resolve: {
		alias: {
			"@earendil-works/pi-coding-agent": resolvePiCodingAgent(),
			"@earendil-works/pi-tui": resolvePiTui(),
			typebox: resolveTypebox(),
		},
	},
});
