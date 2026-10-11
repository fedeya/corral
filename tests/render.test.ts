import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
process.env.CORRAL_IMGS ??= new URL("../dev.fedeya.corral.sdPlugin/imgs", import.meta.url).pathname;
const { renderKey, THEMES } = await import("../src/themes");
import type { Agent } from "../src/herdr";
const agent: Agent = {
	paneId: "A",
	workspace: "ALPHA",
	identity: "ALPHA",
	title: "ALPHA",
	status: "working",
	focused: false,
	seq: 0,
};
const png = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1]!, "base64"));
test("pinned keys have a visible yellow pushpin marker including reserved empty keys", () => {
	const plain = renderKey(THEMES[0]!, agent, 0, null);
	const pinned = renderKey(THEMES[0]!, agent, 0, null, true);
	assert.notEqual(pinned, plain);
	const empty = renderKey(THEMES[0]!, undefined, 0, null);
	const reserved = renderKey(THEMES[0]!, undefined, 0, null, true);
	assert.notEqual(reserved, empty);
	for (const url of [pinned, reserved]) {
		const image = png(url);
		const i = (7 * image.width + 8) * 4;
		assert.deepEqual([...image.data.subarray(i, i + 3)], [255, 236, 39]);
	}
});
