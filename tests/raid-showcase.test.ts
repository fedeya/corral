import { test } from "node:test";
import assert from "node:assert/strict";
import "./art-fixture";
import type { Agent } from "../src/herdr";
import { RaidRound } from "../src/raid";
import { Showcase } from "../src/showcase";
const { createRaidTheme } = await import("../src/themes/raid");
const { renderKey } = await import("../src/themes");
const { showcaseMarker } = await import("../src/render");

test("Raid Showcase strip uses only projected captions and badges on every segment", () => {
 const round = new RaidRound();
 round.observe([agent]); round.start();
 const theme = createRaidTheme(round);
 const mode = new Showcase(); mode.toggle();
 const safe = mode.project(agent)!;
 const visible = [{ agent: safe, column: 0, row: 0 }];
 const expected = theme.scene.render(visible, 0, 12);
 for (let column = 0; column < 4; column++) showcaseMarker(expected, column * 200, 89, 200);
 const actual = theme.scene.render(visible, 0, 12, true);
 assert.ok(actual.data.equals(expected.data), "custom Raid scene must retain all four SHOWCASE badges");
 const aliasOnly = { ...safe, workspace: "AGENT A", title: "AGENT A", subtitle: "AGENT A", appearanceWorkspace: "OTHER PRIVATE" };
 assert.ok(actual.data.equals(theme.scene.render([{ ...visible[0]!, agent: aliasOnly }], 0, 12, true).data));
 assert.ok(!actual.crop(0, 28, 200, 20).data.equals(theme.scene.render([{ ...visible[0]!, agent }], 0, 12).crop(0, 28, 200, 20).data), "safe caption pixels differ from canonical private text");
});

const agent: Agent = { paneId: "raid-camera", identity: "PRIVATE", workspace: "PRIVATE", title: "SECRET", status: "working", focused: false, seq: 0 };

test("Raid Showcase key cache separates mode, pin, membership and reset at the same numeric frame", () => {
 const round = new RaidRound();
 const theme = createRaidTheme(round);
 round.observe([agent]); round.start();
 const mode = new Showcase(); mode.toggle();
 const safe = mode.project(agent)!;
 const expected = () => {
  const c = theme.drawKey(safe, 0);
  showcaseMarker(c);
  return c.toDataUrl();
 };
 const normal = renderKey(theme, safe, 0, null);
 const camera = renderKey(theme, safe, 0, null, false, true);
 assert.ok(camera !== normal, "mode must invalidate otherwise identical cache components");
 assert.ok(camera === expected());
 assert.ok(renderKey(theme, safe, 0, null, true, true) !== camera, "pin and camera flags must coexist");
 round.observe([{ ...agent, status: "done" }]);
 assert.equal(round.member(agent.paneId), "hit");
 const hit = renderKey(theme, safe, 0, null, false, true);
 // The camera badge covers the bottom membership caption; verify the cache still
 // tracks membership using a real renderer whose unobscured output is observable.
 assert.ok(hit === expected());
 assert.ok(renderKey(theme, safe, 0, null) !== normal, "semantic membership is independent of numeric frame and projected agent status");
 round.start();
 const reset = renderKey(theme, safe, 0, null, false, true);
 assert.ok(reset !== hit);
 assert.ok(reset === expected());
});

test("Raid Showcase per-device scene forks keep safe overlapping targets and share canonical round state", () => {
 const second = { ...agent, paneId: "raid-camera-other" };
 const round = new RaidRound();
 round.observe([agent, second]); round.start();
 const mode = new Showcase(); mode.toggle();
 const theme = createRaidTheme(round);
 const left = theme.scene.fork(), right = theme.scene.fork();
 const visible = (a: Agent) => [{ agent: mode.project(a)!, column: 0, row: 0 }];
 const beforeLeft = left.render(visible(agent), 0, 12, true);
 const beforeRight = right.render(visible(second), 0, 12, true);
 assert.equal(left.agentAt(44)?.paneId, agent.paneId);
 assert.equal(left.agentAt(44)?.workspace, "AGENT A");
 assert.equal(right.agentAt(44)?.paneId, second.paneId);
 assert.equal(right.agentAt(44)?.workspace, "AGENT B");
 round.observe([agent, { ...second, status: "done" }]);
 assert.equal(round.view.hp, 1);
 assert.ok(!left.render(visible(agent), 0, 12, true).data.equals(beforeLeft.data));
 round.start();
 assert.ok(!right.render(visible(second), 0, 12, true).data.equals(beforeRight.data));
 right.render([], 0, 12, true);
 assert.equal(right.agentAt(44), undefined);
 assert.equal(left.agentAt(44)?.paneId, agent.paneId);
 assert.equal(agent.workspace, "PRIVATE", "presentation must not mutate canonical roster");
});

test("Raid cache separates safe workspace captions with identical identity and subtitle", () => {
 const round = new RaidRound();
 const theme = createRaidTheme(round);
 round.observe([agent]); round.start();
 const mode = new Showcase(); mode.toggle();
 const safe = mode.project(agent)!;
 const canonical = { ...agent, subtitle: safe.subtitle };
 const normal = renderKey(theme, canonical, 0, null);
 assert.notEqual(renderKey(theme, safe, 0, null), normal);
 assert.equal(renderKey(theme, safe, 0, null), theme.drawKey(safe, 0).toDataUrl());
});
