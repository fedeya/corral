#!/usr/bin/env node
// Test-only herdr protocol fixture; executes through the real child_process boundary.
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "agent" && args[1] === "focus") {
	fs.appendFileSync(process.env.CORRAL_TEST_FOCUS, args[2] + "\n");
} else {
	const agents = JSON.parse(
		fs.readFileSync(process.env.CORRAL_TEST_ROSTER, "utf8"),
	);
	console.log(
		JSON.stringify({
			result: args[0] === "agent" ? { agents } : { workspaces: [] },
		}),
	);
}
