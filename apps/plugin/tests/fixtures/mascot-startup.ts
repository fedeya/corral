// Real startup probe, executed in a child Bun process (no shared module/environment cache).
import { rmSync } from "node:fs";
import { join } from "node:path";
import { THEMES, prepareThemes, renderKey } from "../../src/themes";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { Showcase } from "../../src/showcase";
import { Canvas } from "../../src/pixel";
import { showcaseMarker } from "../../src/render";

const guest = THEMES.find((theme) => theme.id === "guest");
const agent = { paneId: "synthetic-a", identity: "demo", workspace: "AGENT A", title: "AGENT A", status: "working" as const, focused: false, seq: 1 };
const before = guest ? renderKey(guest, agent, 0, null) : null;
if (process.env.MASCOT_REMOVE_AFTER_START && process.env.CORRAL_MASCOT_DIR) {
	for (const name of ["mascot.json", "mascot.png"]) rmSync(join(process.env.CORRAL_MASCOT_DIR, name));
}
prepareThemes([agent]);
const after = guest ? renderKey(guest, agent, 8, null) : null;
if (guest) {
	const privateAgent = { ...agent, workspace: "SECRET REPO", title: "SECRET TASK", subtitle: "SECRET TASK" };
	const mode = new Showcase();
	mode.toggle();
	const safe = mode.project(privateAgent)!;
	assert.deepEqual([safe.workspace, safe.title, safe.subtitle], ["AGENT A", "AGENT A", "AGENT A"]);
	assert.ok(guest.drawKey(privateAgent, 0).crop(0, 0, 120, 78).data.equals(guest.drawKey(safe, 0).crop(0, 0, 120, 78).data));
	assert.notEqual(renderKey(guest, privateAgent, 0, null), renderKey(guest, safe, 0, null));
	const marked = PNG.sync.read(Buffer.from(renderKey(guest, safe, 0, null, true, true).split(",")[1]!, "base64"));
	for (const [x, y] of [[8, 7], [8, 108]]) {
		const i = (y! * marked.width + x!) * 4;
		assert.deepEqual([...marked.data.subarray(i, i + 3)], [255, 236, 39]);
	}
	assert.equal(renderKey(guest, undefined, 0, "/Users/private/secret", false, true), renderKey(guest, undefined, 0, "herdr off", false, true));
	const scene = guest.scene.fork();
	const visible = [{ column: 0, row: 0, agent: privateAgent }];
	const normal = scene.render(visible, 0, 12);
	const camera = scene.render([{ ...visible[0]!, agent: safe }], 0, 12, true);
	assert.ok(normal.crop(0, 40, 800, 48).data.equals(camera.crop(0, 40, 800, 48).data));
	const expected = new Canvas(800, 100);
	for (let column = 0; column < 4; column++) {
		showcaseMarker(expected, column * 200, 89, 200);
		assert.ok(expected.crop(column * 200 + 3, 89, 194, 11).data.equals(camera.crop(column * 200 + 3, 89, 194, 11).data));
	}
	const otherDevice = scene.fork();
	otherDevice.render([{ column: 0, row: 0, agent: { ...safe, paneId: "other-device" } }], 0, 12);
	assert.equal(scene.agentAt(50)?.paneId, agent.paneId);
	assert.equal(otherDevice.agentAt(50)?.paneId, "other-device");
}
console.log(JSON.stringify({
	ids: THEMES.map((theme) => theme.id),
	name: guest?.name ?? null,
	stable: before === after,
	farm: THEMES.find((theme) => theme.id === "farm")?.drawKey(agent, 0).toDataUrl().startsWith("data:image/png;base64,"),
}));
