import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("real SDK/subprocess beacon fixture", { timeout: 60_000 }, () => {
	const output = execFileSync(process.execPath, [new URL("./fixtures/offscreen-beacon.ts", import.meta.url).pathname], {
		encoding: "utf8", timeout: 60_000, env: { ...process.env },
	});
	assert.match(output, /real SDK state fixture:.*PASS/);
	assert.match(output, /real SDK tap fixture:.*PASS/);
	console.log(output.trim());
});
