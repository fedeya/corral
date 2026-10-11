import assert from "node:assert/strict";
import { test } from "node:test";
import { THEMES } from "../src/themes";
import type { Agent } from "../src/herdr";

const pocket = () => THEMES.find((theme) => theme.id === "kingdom-pocket")!;
const agent: Agent = { paneId: "p1", workspace: "api", title: "", identity: "api", focused: false, seq: 1, status: "idle" };

test("Pocket's medieval backdrop follows day, dusk and night", () => {
  const theme = pocket();
  const scene = theme.scene;
  const day = Buffer.from(scene.render([], 0, 14).data);
  const dusk = Buffer.from(scene.render([], 0, 18).data);
  const night = Buffer.from(scene.render([], 0, 23).data);
  assert.notDeepEqual(day, dusk);
  assert.notDeepEqual(dusk, night);
  assert.notDeepEqual(day, night);
});

test("Pocket knights have original steel armour, not external sprites", () => {
  const image = pocket().drawKey({ ...agent, status: "working" }, 0);
  let steel = 0;
  for (let y = 0; y < 75; y++) for (let x = 0; x < image.width; x++) {
    const i = (y * image.width + x) * 4;
    if (image.data[i] === 194 && image.data[i + 1] === 195 && image.data[i + 2] === 199) steel++;
  }
  assert.ok(steel > 50, "knight should have a visible steel helmet and armour");
});

test("all status poses render opaque keys and respect their cache frame", () => {
  const theme = pocket();
  for (const status of ["working", "blocked", "done", "idle", "unknown"] as const) {
    const a = { ...agent, status };
    const byStep = new Map<number, string>();
    for (let frame = 0; frame < 32; frame++) {
      const canvas = theme.drawKey(a, frame);
      assert.equal(canvas.width, 120);
      assert.equal(canvas.height, 120);
      for (let i = 3; i < canvas.data.length; i += 4) assert.equal(canvas.data[i], 255);
      const step = theme.keyFrame(a, frame);
      const bytes = canvas.data.toString("base64");
      if (byStep.has(step)) assert.equal(bytes, byStep.get(step), `${status}: cache step ${step}`);
      else byStep.set(step, bytes);
    }
  }
});

test("adding another knight does not change an existing knight's look", () => {
  const before = pocket().drawKey(agent, 0).data.toString("base64");
  for (const theme of THEMES) theme.prepare?.([agent, { ...agent, paneId: "p2", identity: "docs", workspace: "docs" }]);
  assert.equal(pocket().drawKey(agent, 0).data.toString("base64"), before);
});

test("touch hit testing points at the knight under that key", () => {
  const scene = pocket().scene;
  const visible = [{ agent, column: 1, row: 0 }];
  for (let frame = 0; frame < 40; frame++) scene.render(visible, frame, 14);
  assert.equal(scene.agentAt(272)?.paneId, agent.paneId);
  assert.equal(scene.agentAt(10), undefined);
});

test("a clean install offers Kingdom Pocket without external sprites", () => {
  assert.ok(THEMES.some((theme) => theme.id === "kingdom-pocket"));
});
