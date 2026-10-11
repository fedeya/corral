import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Isolate the real SDK and module-level HERDR_BIN_PATH from the pins SDK mock
// and its deleted subprocess fixture when Bun runs every test in one process.
test("successful real polls drive raid; failed polls freeze it; explicit start uses fresh roster", async () => {
 const { stdout, stderr } = await promisify(execFile)(process.execPath,
  ["test", new URL("./fixtures/raid-state.integration.ts", import.meta.url).pathname],
  { timeout: 15000 });
 assert.match(`${stdout}\n${stderr}`, /1 pass/);
 assert.match(`${stdout}\n${stderr}`, /0 fail/);
});
