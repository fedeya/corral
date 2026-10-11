import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { Agent } from "../src/herdr";
import { AgentLayout } from "../src/layout";
import { RaidRound } from "../src/raid";
process.env.CORRAL_IMGS = resolve(import.meta.dirname, "../dev.fedeya.corral.sdPlugin/imgs");
const { createRaidTheme } = await import("../src/themes/raid");
const { renderKey } = await import("../src/themes");

const agent = (paneId: string): Agent => ({ paneId, status: "working", identity: paneId, workspace: paneId, focused: false, title: "", seq: 0 });

test("pinned multi-device Raid scenes isolate tap targets while sharing a fixed party and reset state", () => {
 const a = agent("raid-pins-a"), b = agent("raid-pins-b"), late = agent("raid-pins-late");
 const layout = new AgentLayout();
 layout.setSlots([{ id: "left", deviceId: "deck-a", column: 0, row: 0 }, { id: "right", deviceId: "deck-b", column: 0, row: 0 }]);
 layout.setAgents([a, b]);
 layout.togglePin("left", a.paneId);
 const round = new RaidRound();
 round.observe([a, b]);
 assert.equal(round.start(), true);
 const theme = createRaidTheme(round);
 const left = theme.scene.fork(), right = theme.scene.fork();
 assert.notEqual(left, right);
 left.render(layout.visible("deck-a"), 0);
 right.render(layout.visible("deck-b"), 0);
 assert.equal(left.agentAt(44)?.paneId, a.paneId, "rendering deck-b must not replace deck-a's tap targets");
 assert.equal(right.agentAt(44)?.paneId, b.paneId);
 const beforeStrip = left.render(layout.visible("deck-a"), 0).data;
 const beforeKey = renderKey(theme, a, 0, null, true);
 assert.notEqual(beforeKey, renderKey(theme, a, 0, null), "Raid must retain the pin overlay");

 // Paging, roster reordering and a late arrival cannot change Raid enrollment.
 layout.setAgents([late, b, a]);
 layout.turnPage(1);
 round.observe([late, b, a]);
 assert.equal(round.view.maxHp, 2);
 assert.equal(round.member(late.paneId), "next-round");
 assert.equal(layout.visible("deck-a")[0]?.agent.paneId, a.paneId);
 assert.equal(layout.visible("deck-b")[0]?.agent.paneId, b.paneId);
 round.observe([late, { ...b, status: "done" }, a]);
 assert.equal(round.view.hp, 1, "off-device party members still land hits");
 assert.notDeepEqual(left.render(layout.visible("deck-a"), 0).data, beforeStrip);
 assert.equal(round.start(), true);
 assert.equal(round.view.maxHp, 3);
 assert.equal(round.view.hp, 3);
 const afterKey = renderKey(theme, a, 0, null, true);
 assert.notEqual(afterKey, beforeKey, "same-frame reset must invalidate pinned key cache");
 assert.notDeepEqual(left.render(layout.visible("deck-a"), 0).data, beforeStrip, "forked scenes must see the shared round reset");
 assert.equal(left.agentAt(44)?.paneId, a.paneId);
 assert.equal(right.agentAt(44)?.paneId, b.paneId);
});
