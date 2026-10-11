import { test } from "node:test";
import assert from "node:assert/strict";
import type { Agent, AgentStatus } from "../src/herdr";
import { RaidRound } from "../src/raid";

const agent = (paneId: string, status: AgentStatus): Agent => ({ paneId, status, workspace: paneId, identity: paneId, title: "", focused: false, seq: 0 });

test("explicit round rewards a working to done edge once per enrolled pane", () => {
 const round = new RaidRound();
 round.observe([agent("a", "working"), agent("b", "done")]);
 assert.equal(round.view.phase, "ready");
 assert.equal(round.start(), true);
 assert.equal(round.view.hp, 2);
 round.observe([agent("a", "done"), agent("b", "done")]);
 assert.equal(round.view.hp, 1);
 for (const status of ["done", "working", "done"] as const) round.observe([agent("a", status), agent("b", "done")]);
 assert.equal(round.view.hp, 1);
 round.observe([agent("a", "done"), agent("b", "working")]);
 round.observe([agent("a", "done"), agent("b", "done")]);
 assert.equal(round.view.phase, "victory");
 assert.equal(round.view.hp, 0);
});

test("blocked agents request help without dealing damage", () => {
 const round = new RaidRound();
 round.observe([agent("a", "working")]);
 round.start();
 round.observe([agent("a", "blocked")]);
 assert.deepEqual(round.view.help, ["a"]);
 round.observe([agent("a", "done")]);
 assert.equal(round.view.hp, 1);
 round.observe([agent("a", "working")]);
 round.observe([agent("a", "done")]);
 assert.equal(round.view.hp, 0);
 assert.deepEqual(round.view.help, []);
});

test("offline gaps cannot manufacture a completion and cannot start a round", () => {
 const round = new RaidRound();
 round.observe([agent("a", "working")]);
 round.start();
 round.observe(null);
 assert.equal(round.view.offline, true);
 assert.equal(round.start(), false);
 round.observe([agent("a", "done")]);
 assert.equal(round.view.hp, 1);
 assert.equal(round.view.offline, false);
 round.observe([agent("a", "working")]);
 round.observe([agent("a", "done")]);
 assert.equal(round.view.hp, 0);
});

test("fixed enrollment survives disappearance, ignores newcomers, and resets to current roster", () => {
 const round = new RaidRound();
 assert.equal(round.start(), false);
 round.observe([]);
 assert.equal(round.start(), false);
 round.observe([agent("a", "working"), agent("b", "idle")]);
 round.start();
 assert.equal(round.member("a"), "pending");
 round.observe([agent("b", "idle"), agent("c", "working")]);
 assert.deepEqual(round.view.missing, ["a"]);
 round.observe([agent("a", "done"), agent("b", "idle"), agent("c", "done")]);
 assert.equal(round.view.hp, 2);
 assert.equal(round.member("c"), "next-round");
 round.observe([agent("a", "working"), agent("b", "idle")]);
 round.observe([agent("a", "done"), agent("b", "idle")]);
 assert.equal(round.member("a"), "hit");
 round.observe([]);
 assert.equal(round.view.hp, 1);
 assert.equal(round.start(), false);
 round.observe([agent("c", "done")]);
 assert.equal(round.start(), true);
 assert.equal(round.view.round, 2);
 assert.equal(round.view.hp, 1);
 assert.equal(round.member("a"), "next-round");
 round.observe([agent("c", "done")]);
 assert.equal(round.view.hp, 1);
});
