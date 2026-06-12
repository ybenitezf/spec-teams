import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PI_CODING_AGENT = "/home/yoel/.nvm/versions/node/v24.15.0/lib/node_modules/@earendil-works/pi-coding-agent";
const PI_TUI = resolve(PI_CODING_AGENT, "node_modules/@earendil-works/pi-tui");

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
	// Alias external packages to their installed locations
	resolve: {
		alias: {
			"@earendil-works/pi-coding-agent": PI_CODING_AGENT,
			"@earendil-works/pi-tui": PI_TUI,
			"@earendil-works/pi-ai": resolve(PI_CODING_AGENT, "node_modules/@earendil-works/pi-ai"),
			// typebox is a peer dep but its local dir is empty — point to the one in pi-coding-agent
			typebox: resolve(PI_CODING_AGENT, "node_modules/typebox"),
		},
	},
});