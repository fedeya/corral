import { test } from "node:test";
import assert from "node:assert/strict";
import { AgentLayout } from "../src/layout";
test("missing pinned agents reserve a key until explicit release", () => {
	const layout = new AgentLayout();
	layout.setSlots(slots);
	layout.setAgents([agent("A"), agent("B")]);
	layout.togglePin("k1", "A");
	layout.setAgents([agent("C"), agent("B")]);
	assert.equal(layout.resolve()[0]?.agent, undefined);
	assert.equal(layout.resolve()[0]?.pinned, true);
	layout.setSlots([slots[1]!, slots[0]!]);
	assert.equal(layout.resolve()[1]?.pinned, true);
	layout.togglePin("k1");
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["C", "B"],
	);
});
test("removing an action clears its pin and clamps paging", () => {
	const layout = new AgentLayout();
	layout.setSlots(slots);
	layout.setAgents([agent("A"), agent("B"), agent("C")]);
	layout.togglePin("k1", "A");
	layout.turnPage(1);
	layout.setSlots([slots[1]!]);
	layout.setSlots(slots);
	assert.equal(layout.resolve()[0]?.pinned, false);
	assert.equal(layout.page, 1);
	layout.setAgents([agent("A")]);
	assert.equal(layout.page, 0);
	assert.equal(layout.resolve()[0]?.agent?.paneId, "A");
});
test("duplicate roster panes and duplicate pins cannot occupy two keys", () => {
	const layout = new AgentLayout();
	layout.setSlots(slots);
	layout.setAgents([agent("A"), agent("A"), agent("B")]);
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "B"],
	);
	layout.togglePin("k1", "A");
	layout.togglePin("k2", "A");
	assert.equal(layout.resolve()[1]?.pinned, false);
	layout.togglePin("not-an-action", "B");
	assert.equal(layout.resolve()[1]?.agent?.paneId, "B");
});
test("device strips project only their own resolved physical coordinates", () => {
	const layout = new AgentLayout();
	layout.setSlots([
		{ ...slots[0]!, deviceId: "one" },
		{ ...slots[1]!, column: 0, deviceId: "two" },
	]);
	layout.setAgents([agent("A"), agent("B")]);
	layout.togglePin("k2", "B");
	assert.deepEqual(
		layout.visible("one").map((s) => s.agent.paneId),
		["A"],
	);
	assert.deepEqual(
		layout.visible("two").map((s) => s.agent.paneId),
		["B"],
	);
	assert.deepEqual(layout.visible("other"), []);
});
test("without keys the strip shows a deduplicated eight-agent fallback and paging is inert", () => {
	const layout = new AgentLayout();
	layout.setAgents([agent("A"), agent("A"), ...Array.from({ length: 9 }, (_, i) => agent(`B${i}`))]);
	assert.equal(layout.pageCount, 1);
	layout.turnPage(-1);
	assert.equal(layout.page, 0);
	assert.equal(layout.visible("deck").length, 8);
	assert.deepEqual(
		layout.visible().map((s) => s.agent.paneId),
		["A", "B0", "B1", "B2", "B3", "B4", "B5", "B6"],
	);
	layout.setSlots(slots);
	layout.togglePin("k1", "A");
	layout.togglePin("k2", "B0");
	assert.equal(layout.pageCount, 1);
	layout.turnPage(10);
	assert.equal(layout.page, 0);
});
test("duplicate action IDs consume only one slot", () => {
	const layout = new AgentLayout();
	layout.setSlots([slots[0]!, slots[0]!, slots[1]!]);
	layout.setAgents([agent("A"), agent("B")]);
	layout.togglePin("k1", "A");
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "B"],
	);
});
import type { Agent } from "../src/herdr";
export const agent = (paneId: string): Agent => ({
	paneId,
	workspace: paneId,
	identity: paneId,
	title: paneId,
	status: "working",
	focused: false,
	seq: 0,
});
export const slots = [
	{ id: "k1", column: 0, row: 0 },
	{ id: "k2", column: 1, row: 0 },
];
test("a pin stays on its action ID when priority order changes", () => {
	const layout = new AgentLayout();
	layout.setSlots(slots);
	layout.setAgents([agent("A"), agent("B")]);
	layout.togglePin("k1", "A");
	layout.setAgents([agent("urgent"), agent("B"), agent("A")]);
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "urgent"],
	);
	assert.equal(layout.resolve()[0]?.pinned, true);
});
test("paging fills only unpinned keys without repeating pinned agents", () => {
	const layout = new AgentLayout();
	layout.setSlots(slots);
	layout.setAgents([agent("A"), agent("B"), agent("C")]);
	layout.togglePin("k1", "A");
	assert.equal(layout.pageCount, 2);
	layout.turnPage(1);
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "C"],
	);
	layout.turnPage(1);
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "B"],
	);
	layout.togglePin("k1");
	assert.equal(layout.pageCount, 2);
	assert.deepEqual(
		layout.resolve().map((s) => s.agent?.paneId),
		["A", "B"],
	);
});
