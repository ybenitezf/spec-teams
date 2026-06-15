import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

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

/**
 * Resolve a package directory portably across environments.
 *
 * Strategy:
 * 1. Check local node_modules (works when packages are installed
 *    as project dependencies or --legacy-peer-deps).
 * 2. Check the global npm root (for globally-installed packages).
 * 3. If the package is the Pi coding agent itself, look for it
 *    under the global root.
 * 4. For packages that live *inside* pi-coding-agent's own
 *    dependencies (@earendil-works/pi-tui, @earendil-works/pi-ai,
 *    typebox), look under pi-coding-agent/node_modules.
 *
 * If none of these succeed, fall back to the local node_modules
 * stub directory so vitest can at least load its config (tests
 * that actually import the mocked package will fail with a clear
 * error if the package is genuinely missing).
 */
function resolvePkg(name: string): string {
	// 1. Local node_modules (preferred — portable, works in CI with
	//    --legacy-peer-deps or when packages are real dependencies)
	const localDir = resolve("node_modules", name);
	if (pkgExists(localDir)) {
		return localDir;
	}

	// 2. Global root
	if (_globalRoot) {
		const globalDir = resolve(_globalRoot, name);
		if (pkgExists(globalDir)) {
			return globalDir;
		}

		// 3. Some peer deps (pi-tui, pi-ai, typebox) live inside
		//    pi-coding-agent's own node_modules rather than being
		//    installed globally themselves.
		const piCodingAgentDir = resolve(
			_globalRoot,
			"@earendil-works/pi-coding-agent",
		);
		if (pkgExists(piCodingAgentDir)) {
			const nestedDir = resolve(piCodingAgentDir, "node_modules", name);
			if (pkgExists(nestedDir)) {
				return nestedDir;
			}
		}
	}

	// 4. Last resort — return the (possibly empty) local node_modules
	//    stub directory. vitest can still load its config; tests that
	//    genuinely import the package will produce a clear resolution
	//    error at runtime.
	return localDir;
}

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
	// Alias external packages to their installed locations
	resolve: {
		alias: {
			"@earendil-works/pi-coding-agent": resolvePkg(
				"@earendil-works/pi-coding-agent",
			),
			"@earendil-works/pi-tui": resolvePkg("@earendil-works/pi-tui"),
			"@earendil-works/pi-ai": resolvePkg("@earendil-works/pi-ai"),
			typebox: resolvePkg("typebox"),
		},
	},
});