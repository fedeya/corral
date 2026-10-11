import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import type { Agent } from "../src/herdr";
import { RaidRound } from "../src/raid";
import { resolve } from "node:path";
process.env.CORRAL_IMGS = resolve(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/imgs");
const { createRaidTheme, raidControl } = await import("../src/themes/raid");
const { renderKey, THEMES } = await import("../src/themes");

const a: Agent = { paneId: "a", status: "working", identity: "a", workspace: "api", focused: false, title: "", seq: 0 };

test("raid is built-in and real renderers reflect help, damage, victory and restart", () => {
 assert.ok(THEMES.some(t => t.id === "raid"));
 const round = new RaidRound();
 const theme = createRaidTheme(round);
 round.observe([a]); round.start();
 const visible = [{ agent: a, column: 0, row: 0 }];
 const active = theme.scene.render(visible, 0);
 assert.equal(active.width, 800); assert.equal(active.height, 100);
 assert.equal(theme.scene.agentAt(45)?.paneId, "a");
 assert.equal(theme.scene.agentAt(245), undefined);
 const key = renderKey(theme, a, 0, null);
 assert.equal(PNG.sync.read(Buffer.from(key.split(",")[1]!, "base64")).width, 120);
 round.observe([{ ...a, status: "blocked" }]);
 assert.notDeepEqual(theme.scene.render([{ ...visible[0]!, agent: { ...a, status: "blocked" } }], 0).data, active.data);
 round.observe([a]); round.observe([{ ...a, status: "done" }]);
 assert.notDeepEqual(theme.scene.render(visible, 0).data, active.data);
 assert.notEqual(renderKey(theme, a, 0, null), key, "round changes must invalidate cached keys even within the same frame");
 const victory = raidControl(round, 0).data;
 round.start();
 assert.notDeepEqual(raidControl(round, 0).data, victory);
});

test("renderKey refreshes pending membership for a replacement pane in the same workspace", () => {
 const round = new RaidRound();
 const theme = createRaidTheme(round);
 const first = { ...a, paneId: "pending-pane", identity: "replacement-cache-workspace", workspace: "replacement-cache-workspace" };
 const replacement = { ...first, paneId: "replacement-pane" };
 round.observe([first]);
 assert.equal(round.start(), true);
 assert.equal(round.member(first.paneId), "pending");
 const pending = renderKey(theme, first, 0, null);
 assert.equal(pending, theme.drawKey(first, 0).toDataUrl());

 round.observe([replacement]);
 assert.equal(round.member(replacement.paneId), "next-round");
 const expected = theme.drawKey(replacement, 0).toDataUrl();
 assert.notEqual(expected, pending, "NEXT ROUND must differ from HIT PENDING");
 assert.equal(renderKey(theme, replacement, 0, null), expected, "cached rendering must show NEXT ROUND, not the old pane's HIT PENDING");
});

test("renderKey refreshes the round after resetting a 1001-pane raid with 1000 hits", () => {
 const round = new RaidRound();
 const theme = createRaidTheme(round);
 const roster = Array.from({ length: 1001 }, (_, i) => ({ ...a, paneId: `large-raid-${i}`, identity: `large-raid-${i}`, workspace: `large-raid-${i}` }));
 const pending = roster[1000]!;
 round.observe(roster);
 assert.equal(round.start(), true);
 round.observe(roster.map((agent, i) => i < 1000 ? { ...agent, status: "done" as const } : agent));
 assert.equal(round.view.round, 1);
 assert.equal(round.view.maxHp, 1001);
 assert.equal(round.view.hp, 1);
 assert.equal(round.member(pending.paneId), "pending");
 const before = renderKey(theme, pending, 0, null);
 assert.equal(before, theme.drawKey(pending, 0).toDataUrl());

 assert.equal(round.start(), true);
 assert.equal(round.view.round, 2);
 assert.equal(round.view.hp, 1001);
 assert.equal(round.member(pending.paneId), "pending");
 const expected = theme.drawKey(pending, 0).toDataUrl();
 assert.notEqual(expected, before, "RAID 2 must differ from RAID 1 at the same animation frame");
 assert.equal(renderKey(theme, pending, 0, null), expected, "reset must not reuse the cached RAID 1 key after 1000 hits");
});

test("raid keys keep the workspace palette when a pane is replaced", () => {
 const theme = createRaidTheme(new RaidRound());
 const first = { ...a, paneId: "fixture-0", identity: "stable" };
 const replacement = { ...first, paneId: "fixture-1" };
 assert.deepEqual(theme.drawKey(first, 0).data, theme.drawKey(replacement, 0).data);
});
