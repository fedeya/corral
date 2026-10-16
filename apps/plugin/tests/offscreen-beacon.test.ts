import { test } from "node:test";
import assert from "node:assert/strict";
import type { Agent } from "../src/herdr";
import { OffscreenBeacon, beaconContains, drawBlockedBeacon } from "../src/offscreen-beacon";
import { Canvas } from "../src/pixel";

const agent = (paneId: string): Agent => ({
	paneId, workspace: `Workspace ${paneId}`, title: paneId, identity: paneId,
	status: "blocked", seq: 0, focused: false,
});

test("beacon counts distinct panes and keeps the selected pane across roster reorder", () => {
	const beacon = new OffscreenBeacon();
	const a = agent("a"), b = agent("b");
	assert.deepEqual(beacon.select("deck", [a, a, b]), { count: 2, agent: a });
	const updated = { ...a, workspace: "Updated" };
	assert.deepEqual(beacon.select("deck", [b, updated]), { count: 2, agent: updated });
	assert.deepEqual(beacon.select("deck", [b]), { count: 1, agent: b });
	assert.equal(beacon.select("deck", []), undefined);
});

test("beacon draw and hit rectangle stay exactly inside the far-right middle band", () => {
	const canvas = new Canvas(800, 100);
	drawBlockedBeacon(canvas, { count: 123, agent: { ...agent("a"), workspace: "A very long selected workspace that must fit" } }, 2);
	for (let y = 0; y < 100; y++) for (let x = 0; x < 800; x++) {
		const inside = x >= 600 && x <= 799 && y >= 40 && y <= 65;
		assert.equal(beaconContains(x, y), inside);
		assert.equal(canvas.data[(y * 800 + x) * 4 + 3] === 255, inside);
	}
	assert.equal(beaconContains(NaN, 50), false);
	assert.equal(beaconContains(700, Infinity), false);
	const other = new Canvas(800, 100);
	drawBlockedBeacon(other, { count: 124, agent: agent("a") }, 2);
	assert.notDeepEqual(canvas.crop(628, 40, 172, 13).data, other.crop(628, 40, 172, 13).data);
});
