// Turns demo mode on (restarting its story) or off, then reloads the plugin.
// Usage: bun run demo on|off
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const flag = join(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/demo");
const mode = process.argv[2];
if (mode === "on") writeFileSync(flag, `${new Date().toISOString()}\n`);
else if (mode === "off") rmSync(flag, { force: true });
else {
	console.error("usage: bun run demo on|off");
	process.exit(1);
}
execFileSync("streamdeck", ["restart", "dev.fedeya.corral"], { stdio: "ignore" });
console.log(mode === "on" ? "Demo mode on: the story starts now (run again to restart it)." : "Demo mode off.");
