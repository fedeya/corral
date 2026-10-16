import { test } from "node:test";
import assert from "node:assert/strict";
import { CursorCloud, CURSOR_API_BASE } from "../src/cursor-cloud";

import fixture from "./fixtures/cursor-cloud.json";
const { agent, run } = fixture;
const id = agent.id, runId = run.id;

function clock() {
 let now = 0, next = 0;
 const jobs = new Map<number, { due: number; fn: () => void }>();
 return { now: () => now, jobs,
  setTimeout: (fn: () => void, ms: number) => { const key = ++next; jobs.set(key, { due: now + ms, fn }); return key; },
  clearTimeout: (key: number) => { jobs.delete(key); },
  advance: async (ms: number) => { now += ms; for (const [key, job] of [...jobs]) if (job.due <= now) { jobs.delete(key); job.fn(); } for (let i = 0; i < 20; i++) await Promise.resolve(); },
 };
}

test("one lazy 15-second poll is shared by subscribers and stable versions only change on data", async () => {
 const timer = clock(); let calls = 0, notices = 0;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async (url) => {
  calls++; return Response.json(url.includes("/runs/") ? run : agent);
 } });
 assert.equal(calls, 0); assert.equal(timer.jobs.size, 0);
 const off = cloud.subscribe(() => notices++), other = cloud.subscribe(() => notices++);
 await cloud.refresh();
 assert.equal(calls, 2); assert.equal(notices, 2); assert.equal(cloud.version, 1);
 await timer.advance(14999); assert.equal(calls, 2);
 await timer.advance(1); assert.equal(calls, 4); assert.equal(cloud.version, 1);
 off(); assert.equal(timer.jobs.size, 1); other(); assert.equal(timer.jobs.size, 0);
 assert.equal(cloud.snapshot.status, "unknown");
 const disabled = new CursorCloud({ timer, fetch: async () => { throw new Error("must not call"); } });
 const stop = disabled.subscribe(() => {}); await disabled.refresh();
 assert.equal(disabled.snapshot.status, "unavailable"); assert.equal(timer.jobs.size, 0);
 stop(); disabled.dispose(); cloud.dispose();
});

test("network backoff survives hide/reappear without stalling and disposed monitors drop terminal state", async () => {
 const timer = clock(); let calls = 0, online = false;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async url => {
  calls++; if (!online) throw new Error("offline");
  return Response.json(url.includes("/runs/") ? { ...run, status: "FINISHED" } : agent);
 } });
 const off = cloud.subscribe(() => {}); await cloud.refresh();
 assert.equal([...timer.jobs.values()][0]?.due, 30000);
 off(); const stop = cloud.subscribe(() => {}); await cloud.refresh();
 assert.equal(calls, 1); assert.equal(timer.jobs.size, 1);
 online = true; await timer.advance(30000);
 assert.equal(cloud.snapshot.status, "done");
 cloud.dispose(); assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined); stop();
});

test("HTTP failures back off, respect Retry-After, never publish partial success and park unauthorized", async () => {
 const timer = clock(); let calls = 0, code = 503;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async () => {
  calls++; return new Response("PRIVATE RESPONSE synthetic-key", { status: code, headers: { "Retry-After": "90" } });
 } });
 const off = cloud.subscribe(() => {}); await cloud.refresh();
 assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
 assert.equal(calls, 1); assert.equal([...timer.jobs.values()][0]?.due, 90000);
 await cloud.refresh(); assert.equal(calls, 1);
 await timer.advance(89999); assert.equal(calls, 1);
 await timer.advance(1); assert.equal(calls, 2);
 code = 401; await timer.advance(90000); assert.equal(calls, 3);
 await timer.advance(600000); await cloud.refresh(); assert.equal(calls, 3); assert.equal(timer.jobs.size, 0);
 assert.ok(!JSON.stringify(cloud.snapshot).includes("PRIVATE"));
 off(); cloud.dispose();
});

test("single-flight abort and generation guards discard work after unsubscribe/dispose and bound hangs", async () => {
 const timer = clock(); let release!: (response: Response) => void, calls = 0;
 let signal: AbortSignal | undefined;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async (_url, init) => {
  calls++; signal = init.signal!; return new Promise<Response>(resolve => { release = resolve; });
 } });
 const off = cloud.subscribe(() => {}); const first = cloud.refresh();
 assert.equal(cloud.refresh(), first); assert.equal(calls, 1);
 off(); assert.equal(signal?.aborted, true);
 release(Response.json(agent)); await first;
 assert.equal(cloud.snapshot.status, "unknown"); assert.equal(calls, 1); assert.equal(timer.jobs.size, 0);
 const stop = cloud.subscribe(() => {}); const hung = cloud.refresh();
 await timer.advance(5000); await hung;
 assert.equal(cloud.snapshot.status, "unknown"); assert.equal(signal?.aborted, true);
 const before = cloud.version; cloud.dispose(); release(Response.json(agent));
 await Promise.resolve(); assert.equal(cloud.version, before); assert.equal(timer.jobs.size, 0); stop();
});

test("opening revalidates the exact configured HTTPS Cursor agent and checks permission after awaiting", async () => {
 let metadata = { ...agent }, requests = 0, allowed = true;
 const opened: string[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => {
  requests++; return Response.json(url.includes("/runs/") ? run : metadata);
 } });
 await cloud.refresh(); const before = requests;
 assert.equal(await cloud.open(() => allowed, async url => { opened.push(url); }), true);
 assert.equal(requests, before + 2); assert.deepEqual(opened, [agent.url]);
 for (const url of ["http://cursor.com/agents/" + id, "https://cursor.com.evil.test/agents/" + id,
  "https://user:password@cursor.com/agents/" + id, "https://cursor.com:8443/agents/" + id,
  "https://cursor.com/agents/bc-other", agent.url + "?redirect=https://evil.test", agent.url + "#fragment", "file:///etc/passwd", "javascript:alert(1)", "https://api.cursor.com/agents/" + id]) {
  metadata = { ...agent, url };
  assert.equal(await cloud.open(() => true, async u => { opened.push(u); }), false);
 }
 assert.equal(opened.length, 1);
 allowed = false; const count = requests;
 await cloud.open(() => allowed, async u => { opened.push(u); }); assert.equal(requests, count);
 metadata = agent; allowed = true;
 const racing = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => {
  allowed = false; return Response.json(url.includes("/runs/") ? run : agent);
 } });
 assert.equal(await racing.open(() => allowed, async u => { opened.push(u); }), false);
 cloud.dispose(); racing.dispose();
});

test("unsafe configuration makes no network call and stale run snapshots cannot overwrite newer truth", async () => {
 for (const agentId of [" ../escape", "bc-id?secret=x", "bc-id/../../", " bc-id ", "https://cursor.com/agents/bc-id"]) {
  let calls = 0; const cloud = new CursorCloud({ agentId, apiKey: "synthetic-key", fetch: async () => { calls++; return Response.json(agent); } });
  await cloud.refresh(); assert.equal(calls, 0); assert.equal(cloud.snapshot.status, "unavailable"); cloud.dispose();
 }
 let state = { ...run, status: "RUNNING" };
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? state : agent) });
 await cloud.refresh();
 state = { ...run, status: "FINISHED", updatedAt: "2026-04-13T18:44:00.000Z" };
 await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
 cloud.dispose();
});

test("complete snapshots reject missing timestamps and older agent/latestRun associations", async () => {
 let metadata: unknown = agent, record: unknown = run;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? record : metadata) });
 for (const incomplete of [{ ...agent, updatedAt: undefined }, { ...agent, createdAt: "bad" }]) {
  metadata = incomplete; await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
 }
 metadata = agent; record = { ...run, createdAt: undefined };
 await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown");
 metadata = { ...agent, latestRunId: "run-newer", updatedAt: "2026-04-13T19:00:00.000Z" };
 record = { ...run, id: "run-newer", status: "RUNNING", updatedAt: "2026-04-13T19:00:00.000Z" };
 await cloud.refresh(); assert.equal(cloud.snapshot.status, "working");
 metadata = agent; record = { ...run, status: "FINISHED" };
 await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
 cloud.dispose();
});

test("a validated newer agent association survives a failed run GET and rejects cached old success after backoff", async () => {
 const timer = clock(), calls: string[] = [];
 const newerAgent = { ...agent, latestRunId: "run-newer", updatedAt: "2026-04-13T19:00:00.000Z" };
 let metadata = agent, missingRun = false;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async url => {
  calls.push(url);
  if (!url.includes("/runs/")) return Response.json(metadata);
  return missingRun ? new Response(null, { status: 404 }) : Response.json({ ...run, id: metadata.latestRunId, status: metadata === agent ? "FINISHED" : "RUNNING" });
 } });
 try {
  await cloud.refresh(); assert.equal(cloud.snapshot.status, "done");
  metadata = newerAgent; missingRun = true; await cloud.refresh();
  assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
  metadata = agent; missingRun = false;
  const before = calls.length; await timer.advance(29999); await cloud.refresh();
  assert.equal(calls.length, before);
  await timer.advance(1); await cloud.refresh();
  assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.runId, undefined); assert.equal(cloud.snapshot.url, undefined);
  assert.equal(calls.length, before + 1, "reject the stale association before requesting its completed run");
  metadata = newerAgent; await cloud.refresh();
  assert.equal(cloud.snapshot.status, "working"); assert.equal(cloud.snapshot.runId, "run-newer");
 } finally { cloud.dispose(); }
});

test("equal-timestamp conflicting latest-run associations stay unknown until an unambiguous snapshot arrives", async () => {
 for (const initiallyMissing of [false, true]) {
  const timer = clock(), calls: string[] = [];
  const newerAgent = { ...agent, latestRunId: "run-newer", updatedAt: "2026-04-13T19:00:00.000Z" };
  let metadata = newerAgent, missingRun = initiallyMissing;
  const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", timer, fetch: async url => {
   calls.push(url);
   if (!url.includes("/runs/")) return Response.json(metadata);
   return missingRun ? new Response(null, { status: 404 }) : Response.json({ ...run, id: metadata.latestRunId, status: metadata.latestRunId === runId ? "FINISHED" : "RUNNING" });
  } });
  try {
   await cloud.refresh(); assert.equal(cloud.snapshot.status, initiallyMissing ? "unknown" : "working");
   missingRun = false; metadata = { ...agent, updatedAt: newerAgent.updatedAt };
   await timer.advance(30000);
   const before = calls.length; await cloud.refresh();
   assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.runId, undefined); assert.equal(cloud.snapshot.url, undefined);
   assert.equal(calls.length, before + 1, "a tied different run is not safe to query");
   metadata = newerAgent; await cloud.refresh();
   assert.equal(cloud.snapshot.status, "working"); assert.equal(cloud.snapshot.runId, "run-newer");
   metadata = { ...agent, updatedAt: "2026-04-13T19:01:00.000Z" }; await cloud.refresh();
   assert.equal(cloud.snapshot.status, "done"); assert.equal(cloud.snapshot.runId, runId);
  } finally { cloud.dispose(); }
 }
});

test("an omitted optional agent name keeps a complete run snapshot and safe opening with a generic label", async () => {
 const metadata: Record<string, unknown> = { ...agent }; delete metadata.name;
 let status = "RUNNING";
 const opened: string[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? { ...run, status } : metadata) });
 try {
  for (const [value, expected] of [["RUNNING", "working"], ["FINISHED", "done"]]) {
   status = value!; await cloud.refresh();
   assert.equal(cloud.snapshot.status, expected);
   assert.equal(cloud.snapshot.label, "CLOUD AGENT");
   assert.equal(cloud.snapshot.agentId, id); assert.equal(cloud.snapshot.runId, runId);
   assert.equal(cloud.snapshot.url, agent.url); assert.equal(cloud.snapshot.updatedAt, run.updatedAt);
   assert.equal(await cloud.open(() => true, async url => { opened.push(url); }), true);
  }
  assert.deepEqual(opened, [agent.url, agent.url]);
 } finally { cloud.dispose(); }
});

test("present non-string agent names are rejected rather than treated as omitted", async () => {
 let name: unknown;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? { ...run, status: "FINISHED" } : { ...agent, name }) });
 try {
  for (const value of [null, 123, false, [], ["name"], {}]) {
   name = value; await cloud.refresh();
   assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
  }
 } finally { cloud.dispose(); }
});

test("current agent -> latest run GET snapshot uses Bearer and never treats IDLE as success", async () => {
 const calls: { url: string; init?: RequestInit }[] = [];
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async (url, init) => {
  calls.push({ url: String(url), init });
  return Response.json(calls.length === 1 ? agent : run);
 } });
 await cloud.refresh();
 assert.equal(cloud.snapshot.status, "error");
 assert.equal(cloud.snapshot.label, agent.name);
 assert.equal(cloud.snapshot.runId, runId);
 assert.deepEqual(calls.map(c => c.url), [`${CURSOR_API_BASE}/agents/${id}`, `${CURSOR_API_BASE}/agents/${id}/runs/${runId}`]);
 for (const call of calls) {
  assert.equal(call.init?.method, "GET");
  assert.equal(call.init?.redirect, "error");
  assert.equal(new Headers(call.init?.headers).get("Authorization"), "Bearer synthetic-key");
  assert.ok(call.init?.signal);
 }
 cloud.dispose();
});

test("non-string run statuses cannot coerce into a recognized execution state", async () => {
 let status: unknown = "FINISHED";
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async url => Response.json(url.includes("/runs/") ? { ...run, status } : agent) });
 try {
  await cloud.refresh(); assert.equal(cloud.snapshot.status, "done");
  for (const value of [["FINISHED"], [["FINISHED"]], ["RUNNING"], ["CREATING"], ["ERROR"], ["CANCELLED"], ["EXPIRED"], [], null, undefined, 123, true, {}]) {
   status = value; await cloud.refresh();
   assert.equal(cloud.snapshot.status, "unknown", `malformed status: ${JSON.stringify(value)}`);
  }
  status = "FINISHED"; await cloud.refresh(); assert.equal(cloud.snapshot.status, "done");
 } finally { cloud.dispose(); }
});

test("only validated complete run snapshots count; unknown and disconnected never retain done", async () => {
 let record: unknown = { ...run, status: "FINISHED" };
 let metadata: unknown = agent;
 let disconnected = false;
 const cloud = new CursorCloud({ agentId: id, apiKey: "synthetic-key", fetch: async (url) => {
  if (disconnected) throw new Error("PRIVATE NETWORK DETAIL synthetic-key");
  return Response.json(url.includes("/runs/") ? record : metadata);
 } });
 for (const [status, expected] of Object.entries({ CREATING: "working", RUNNING: "working", FINISHED: "done", ERROR: "error", CANCELLED: "cancelled", EXPIRED: "expired", NEW_STATUS: "unknown", IDLE: "unknown", constructor: "unknown", toString: "unknown", ["__proto__"]: "unknown" })) {
  record = { ...run, status }; await cloud.refresh(); assert.equal(cloud.snapshot.status, expected);
 }
 for (const invalid of [{ ...run, id: "run-other" }, { ...run, agentId: "bc-other" }, { ...run, updatedAt: "bad" }, [], null]) {
  record = invalid; await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown"); assert.equal(cloud.snapshot.url, undefined);
 }
 record = { ...run, status: "FINISHED" };
 for (const invalid of [{ ...agent, id: "bc-other" }, { ...agent, latestRunId: "../escape" }, { ...agent, latestRunId: undefined }]) {
  metadata = invalid; await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown");
 }
 metadata = agent; await cloud.refresh(); assert.equal(cloud.snapshot.status, "done");
 disconnected = true; await cloud.refresh(); assert.equal(cloud.snapshot.status, "unknown");
 assert.equal(cloud.snapshot.url, undefined); assert.ok(!JSON.stringify(cloud.snapshot).includes("PRIVATE"));
 cloud.dispose();
});
