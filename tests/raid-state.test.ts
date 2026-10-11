import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

// Exercise the real listAgents subprocess adapter, not mocked roster transitions.
const dir = mkdtempSync(join(tmpdir(), "corral-raid-test-"));
const fixture = join(dir, "roster.json");
const cli = join(dir, "herdr");
writeFileSync(cli, `#!/usr/bin/env node\nconst fs = require('node:fs');\nconst data=JSON.parse(fs.readFileSync(${JSON.stringify(fixture)},'utf8'));\nif(data===null) process.exit(1);\nconsole.log(JSON.stringify({result: process.argv[2]==='agent' ? {agents:data} : {workspaces:[]}}));\n`, { mode: 0o755 });
process.env.HERDR_BIN_PATH = cli;
process.env.CORRAL_IMGS = resolve(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/imgs");
// The SDK resolves its log directory on import; keep test logs out of the repository.
const cwd = process.cwd();
process.chdir(dir);
const { state } = await import("../src/state").finally(() => process.chdir(cwd));
const { raidRound } = await import("../src/raid");
const put = (status: string | null) => writeFileSync(fixture, JSON.stringify(status === null ? null : [{ pane_id: "p1", workspace_id: "w1", cwd: "/api", agent_status: status }]));

test("successful real polls drive raid; failed polls freeze it; explicit start uses fresh roster", async () => {
 try {
  put("working"); await state.refresh();
  assert.equal(await state.startRaidRound(), true);
  assert.equal(raidRound.view.hp, 1);
  put("done"); await state.refresh();
  assert.equal(raidRound.view.phase, "victory");
  put(null); await state.refresh();
  assert.equal(raidRound.view.offline, true);
  assert.equal(await state.startRaidRound(), false);
  assert.equal(raidRound.view.round, 1);
  put("done"); assert.equal(await state.startRaidRound(), true);
  assert.equal(raidRound.view.hp, 1);
  put("working"); await state.refresh();
  put("blocked"); await state.refresh();
  assert.deepEqual(raidRound.view.help, ["p1"]);
  assert.equal(raidRound.view.hp, 1);
  put("working"); await state.refresh();
  put("done");
  const inFlight = state.refresh();
  assert.equal(await state.startRaidRound(), true);
  await inFlight;
  assert.equal(raidRound.view.hp, 1, "reset must await an in-flight poll instead of rewarding its baseline");
  const { RaidAction } = await import("../src/actions/raid-round");
  const action = new RaidAction();
  let alerts = 0;
  let confirmations = 0;
  const event = { action: { showAlert: async () => { alerts++; }, showOk: async () => { confirmations++; } } } as unknown as Parameters<typeof action.onKeyDown>[0];
  await action.onKeyDown(event);
  assert.equal(confirmations, 1);
  assert.equal(raidRound.view.hp, 1);
  put(null);
  await action.onKeyDown(event);
  assert.equal(alerts, 1);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});
