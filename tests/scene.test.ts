import { test } from "node:test";
import assert from "node:assert/strict";
import { createScene } from "../src/scene";
import type { Agent } from "../src/herdr";
const agent = (paneId: string): Agent => ({
	paneId,
	workspace: paneId,
	identity: paneId,
	title: paneId,
	status: "working",
	focused: false,
	seq: 0,
});
test("forked device scenes keep independent tap targets at overlapping coordinates", () => {
	const first = createScene({
		background: () => ({ key: "blank", draw() {} }),
		drawActor: () => 50,
	});
	const second = first.fork();
	first.render([{ column: 0, row: 0, agent: agent("A") }], 0, 12);
	second.render([{ column: 0, row: 0, agent: agent("B") }], 0, 12);
	assert.equal(first.agentAt(50)?.paneId, "A");
	assert.equal(second.agentAt(50)?.paneId, "B");
});
