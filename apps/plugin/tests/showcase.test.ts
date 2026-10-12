import { test, expect } from "bun:test";
import { Showcase } from "../src/showcase";
import type { Agent } from "../src/herdr";
const agent: Agent = {
	paneId: "p1",
	workspace: "PRIVATE CLIENT",
	title: "SECRET TASK",
	subtitle: "SECRET TASK",
	identity: "PRIVATE CLIENT#p1",
	status: "blocked",
	focused: false,
	seq: 1,
};
test("showcase projects safe labels without changing canonical identity or live status", () => {
	const mode = new Showcase();
	expect(mode.project(agent)).toBe(agent);
	mode.toggle();
	const safe = mode.project(agent)!;
	expect([safe.workspace, safe.title, safe.subtitle]).toEqual(["AGENT A", "AGENT A", "AGENT A"]);
	expect(safe.identity).toBe(agent.identity);
	expect(safe.status).toBe("blocked");
	expect(agent.workspace).toBe("PRIVATE CLIENT");
});
test("aliases survive reorder, disappearance, resume and overflow beyond Z", () => {
	const mode = new Showcase();
	mode.toggle();
	const fixtures = Array.from({ length: 28 }, (_, i) => ({ ...agent, paneId: `pane${i}` }));
	expect(fixtures.map((a) => mode.project(a)!.workspace).slice(-2)).toEqual(["AGENT AA", "AGENT AB"]);
	mode.toggle();
	mode.toggle();
	expect(mode.project(fixtures[0])!.workspace).toBe("AGENT A");
	expect(mode.project(fixtures[27])!.workspace).toBe("AGENT AB");
	expect(mode.project({ ...fixtures[0]!, status: "done" })!.status).toBe("done");
});
