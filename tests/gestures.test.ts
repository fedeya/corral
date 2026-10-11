import { test } from "node:test";
import assert from "node:assert/strict";
test("disappearance cancels a pending gesture without affecting another key", () => {
	const gesture = new KeyGestures();
	gesture.down("k1", "A", 0);
	gesture.down("k2", "B", 0);
	gesture.cancel("k1");
	assert.equal(gesture.up("k1", 700), undefined);
	assert.deepEqual(gesture.up("k2", 300), { kind: "focus", paneId: "B" });
});
test("repeated keyDown cannot restart or retarget the original gesture", () => {
	const gesture = new KeyGestures();
	gesture.down("k1", "A", 0);
	gesture.down("k1", "B", 400);
	assert.deepEqual(gesture.up("k1", 500), { kind: "pin", paneId: "A" });
});
import { KeyGestures } from "../src/gestures";
test("500ms is a pin gesture rather than focus", () => {
	const gesture = new KeyGestures();
	gesture.down("k1", "A", 100);
	assert.deepEqual(gesture.up("k1", 600), { kind: "pin", paneId: "A" });
	assert.equal(gesture.up("k1", 601), undefined);
	gesture.down("k1", "A", 1000);
	assert.deepEqual(gesture.up("k1", 1499), { kind: "focus", paneId: "A" });
});
