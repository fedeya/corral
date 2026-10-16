// Current official reference: https://cursor.com/docs/cloud-agent/api/endpoints
// Durable agent lifecycle is NOT execution status: IDLE can mean a failed run.
export const CURSOR_API_BASE = "https://api.cursor.com/v1";
export const CLOUD_POLL_MS = 15_000;
export type CloudStatus = "unavailable" | "unknown" | "working" | "done" | "error" | "cancelled" | "expired";
export type CloudSnapshot = Readonly<{
 configured: boolean; status: CloudStatus; label: string; agentId?: string; runId?: string;
 url?: string; error?: string; updatedAt?: string;
}>;
export type CloudFetch = (url: string, init: RequestInit) => Promise<Response>;
export type CloudTimer = { now(): number; setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void };
type Options = { agentId?: string; apiKey?: string; fetch?: CloudFetch; timer?: CloudTimer };
const realTimer: CloudTimer = { now: Date.now, setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (id) => clearTimeout(id as NodeJS.Timeout) };
const statuses: Record<string, CloudStatus> = { CREATING: "working", RUNNING: "working", FINISHED: "done", ERROR: "error", CANCELLED: "cancelled", EXPIRED: "expired" };
const validAgentId = (id: string) => /^bc[-_][A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
/** Exact current documented agent route, not a user-controlled redirect or shell command. */
export function cursorAgentUrl(value: unknown, agentId: string): string | undefined {
 if (typeof value !== "string" || !validAgentId(agentId)) return;
 try {
  const url = new URL(value);
  if (url.protocol === "https:" && url.hostname === "cursor.com" && !url.port && !url.username && !url.password && !url.search && !url.hash && value === `https://cursor.com/agents/${agentId}`) return value;
 } catch { /* Untrusted API URL: never open it. */ }
}
class HttpFailure extends Error {
 constructor(readonly status: number, readonly retryAfter: string | null) { super("Cloud request failed"); }
}
class ProtocolFailure extends Error {}

export class CursorCloud {
 readonly #options: Options;
 readonly #timer: CloudTimer;
 readonly #listeners = new Set<() => void>();
 #snapshot: CloudSnapshot;
 #version = 0;
 #polling: Promise<void> | null = null;
 #scheduled: unknown = null;
 #disposed = false;
 #epoch = 0;
 #abort: AbortController | null = null;
 #retryAt = 0;
 #failures = 0;
 #unauthorized = false;
 #latestRun = new Map<string, number>();
 #latestAgentAt = -Infinity;
 #latestAgentRunId: string | undefined;
 constructor(options: Options = {}) {
  this.#options = options;
  this.#timer = options.timer ?? realTimer;
  const configured = !!(options.agentId && validAgentId(options.agentId) && options.apiKey && !/[\r\n]/.test(options.apiKey));
  this.#snapshot = Object.freeze({ configured, status: configured ? "unknown" : "unavailable", label: "CLOUD AGENT" });
 }
 get snapshot(): CloudSnapshot { return this.#snapshot; }
 get version(): number { return this.#version; }
 async open(allowed: () => boolean, openUrl: (url: string) => Promise<unknown>): Promise<boolean> {
  if (this.#disposed || !allowed() || !this.#snapshot.configured) return false;
  const epoch = this.#epoch;
  await this.refresh();
  const url = cursorAgentUrl(this.#snapshot.url, this.#options.agentId!);
  if (this.#disposed || epoch !== this.#epoch || !allowed() || !url || this.#snapshot.error) return false;
  try { await openUrl(url); return true; } catch { return false; }
 }
 subscribe(listener: () => void): () => void {
  if (this.#disposed) return () => {};
  this.#listeners.add(listener);
  if (this.#listeners.size === 1) {
   if (!this.#unauthorized && this.#timer.now() < this.#retryAt) this.#schedule();
   else void this.refresh();
  }
  return () => {
   this.#listeners.delete(listener);
   if (this.#listeners.size === 0) {
    this.#unschedule();
    this.#epoch++; this.#abort?.abort(); this.#abort = null; this.#polling = null;
    if (this.#snapshot.configured) this.#publish({ configured: true, status: "unknown", label: "CLOUD AGENT" });
   }
  };
 }
 refresh(): Promise<void> {
  if (this.#disposed || !this.#snapshot.configured || this.#unauthorized || this.#timer.now() < this.#retryAt) return Promise.resolve();
  if (this.#polling) return this.#polling;
  this.#unschedule();
  const epoch = this.#epoch;
  this.#polling = this.#poll(epoch).finally(() => {
   if (epoch !== this.#epoch) return;
   this.#polling = null;
   this.#schedule();
  });
  return this.#polling;
 }
 async #poll(epoch: number): Promise<void> {
  const { agentId, apiKey, fetch: request = globalThis.fetch } = this.#options;
  const controller = new AbortController(); this.#abort = controller;
  const get = async (path: string): Promise<Record<string, unknown>> => {
   let timeout: unknown = null;
   let abort = () => {};
   try {
    return await Promise.race([
     new Promise<never>((_resolve, reject) => {
      abort = () => reject(new Error("Cloud request aborted"));
      controller.signal.addEventListener("abort", abort, { once: true });
      if (controller.signal.aborted) abort();
      timeout = this.#timer.setTimeout(() => controller.abort(), 5000);
     }),
     (async () => {
      if (controller.signal.aborted) throw new Error("Cloud request aborted");
      const response = await request(`${CURSOR_API_BASE}${path}`, {
       method: "GET", redirect: "error", headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: controller.signal,
      });
      if (!response.ok) throw new HttpFailure(response.status, response.headers.get("Retry-After"));
      return await response.json() as Record<string, unknown>;
     })(),
    ]);
   } finally {
    if (timeout !== null) this.#timer.clearTimeout(timeout);
    controller.signal.removeEventListener("abort", abort);
   }
  };
  try {
   const agent = await get(`/agents/${agentId}`);
   if (epoch !== this.#epoch || this.#disposed) return;
   if (!agent || agent.id !== agentId || (agent.name !== undefined && typeof agent.name !== "string") || !timestamp(agent.createdAt) || !timestamp(agent.updatedAt) || typeof agent.latestRunId !== "string" || !/^run-[A-Za-z0-9_-]{1,128}$/.test(agent.latestRunId)) throw new ProtocolFailure("Invalid agent");
   const agentAt = Date.parse(agent.updatedAt);
   // A timestamp tie cannot establish that a different latest run is newer.
   if (agentAt < this.#latestAgentAt || (agentAt === this.#latestAgentAt && agent.latestRunId !== this.#latestAgentRunId)) throw new ProtocolFailure("Stale agent");
   const url = cursorAgentUrl(agent.url, agentId!);
   if (!url) throw new ProtocolFailure("Invalid agent URL");
   // A validated latest-run association remains newer truth even if its run GET fails.
   this.#latestAgentAt = agentAt;
   this.#latestAgentRunId = agent.latestRunId;
   const run = await get(`/agents/${agentId}/runs/${agent.latestRunId}`);
   if (epoch !== this.#epoch || this.#disposed) return;
   if (!run || run.id !== agent.latestRunId || run.agentId !== agentId || !timestamp(run.createdAt) || !timestamp(run.updatedAt)) throw new ProtocolFailure("Invalid run");
   const updated = Date.parse(run.updatedAt);
   if (updated < (this.#latestRun.get(agent.latestRunId) ?? -Infinity)) throw new ProtocolFailure("Stale run");
   this.#latestRun.set(agent.latestRunId, updated);
   if (this.#latestRun.size > 32) this.#latestRun.delete(this.#latestRun.keys().next().value!);
   this.#publish({ configured: true, status: typeof run.status === "string" && Object.hasOwn(statuses, run.status) ? statuses[run.status]! : "unknown",
    label: typeof agent.name === "string" ? agent.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 100) : "CLOUD AGENT", agentId, runId: String(run.id), url, updatedAt: run.updatedAt });
   this.#failures = 0; this.#retryAt = 0;
  } catch (error) {
   if (epoch !== this.#epoch || this.#disposed) return;
   if (error instanceof HttpFailure) {
    this.#unauthorized = error.status === 401 || error.status === 403;
    const seconds = Number(error.retryAfter);
    const retry = error.retryAfter === null ? 0 : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(error.retryAfter) - this.#timer.now();
    this.#retryAt = this.#timer.now() + Math.min(300_000, Math.max(CLOUD_POLL_MS, 30_000 * 2 ** Math.min(this.#failures++, 4), Number.isFinite(retry) ? retry : 0));
   } else if (!(error instanceof ProtocolFailure)) {
    this.#retryAt = this.#timer.now() + Math.min(300_000, 30_000 * 2 ** Math.min(this.#failures++, 4));
   }
   this.#publish({ configured: true, status: "unknown", label: "CLOUD AGENT", error: this.#unauthorized ? "Cloud authentication unavailable" : "Cloud unavailable" });
  } finally {
   if (epoch === this.#epoch) this.#abort = null;
  }
 }
 #publish(snapshot: CloudSnapshot): void {
  if (JSON.stringify(snapshot) === JSON.stringify(this.#snapshot)) return;
  this.#snapshot = Object.freeze(snapshot); this.#version++;
  for (const listener of this.#listeners) listener();
 }
 #unschedule(): void {
  if (this.#scheduled !== null) this.#timer.clearTimeout(this.#scheduled);
  this.#scheduled = null;
 }
 #schedule(): void {
  if (this.#disposed || this.#unauthorized || !this.#snapshot.configured || this.#listeners.size === 0 || this.#scheduled !== null) return;
  this.#scheduled = this.#timer.setTimeout(() => { this.#scheduled = null; void this.refresh(); }, Math.max(CLOUD_POLL_MS, this.#retryAt - this.#timer.now()));
 }
 dispose(): void {
  this.#disposed = true; this.#epoch++; this.#abort?.abort(); this.#abort = null; this.#polling = null; this.#unschedule(); this.#listeners.clear();
  if (this.#snapshot.configured) this.#publish({ configured: true, status: "unknown", label: "CLOUD AGENT", error: this.#snapshot.error });
 }
}

// No timers, connections or requests until an action subscribes (or explicitly refreshes).
export const cursorCloud = new CursorCloud({ agentId: process.env.CURSOR_CLOUD_AGENT_ID, apiKey: process.env.CURSOR_API_KEY });
