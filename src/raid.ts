import type { Agent, AgentStatus } from "./herdr";

/** One hit per pane per explicit round; only observed working -> done edges count. */
export class RaidRound {
 private roster: Agent[] = [];
 private previous = new Map<string, AgentStatus>();
 private participants = new Set<string>();
 private hits = new Set<string>();
 private number = 0;
 private offline = true;

 /** null means a failed poll, not an empty successful roster. */
 observe(agents: Agent[] | null): void {
  this.offline = agents === null;
  if (agents === null) {
   this.previous.clear();
   return;
  }
  for (const agent of agents) {
   if (this.participants.has(agent.paneId) && this.previous.get(agent.paneId) === "working" && agent.status === "done") this.hits.add(agent.paneId);
  }
  this.roster = agents;
  this.previous = new Map(agents.map(a => [a.paneId, a.status]));
 }

 start(): boolean {
  if (this.offline || !this.roster.length) return false;
  this.number++;
  this.participants = new Set(this.roster.map(a => a.paneId));
  this.hits.clear();
  return true;
 }

 member(paneId: string): "pending" | "hit" | "next-round" {
  return this.hits.has(paneId) ? "hit" : this.participants.has(paneId) ? "pending" : "next-round";
 }

 get view() {
  const maxHp = this.participants.size;
  const hp = maxHp - this.hits.size;
  const help = this.roster.filter(a => a.status === "blocked").map(a => a.paneId);
  const present = new Set(this.roster.map(a => a.paneId));
  const missing = [...this.participants].filter(id => !present.has(id) && !this.hits.has(id));
  return { round: this.number, maxHp, hp, help, missing, offline: this.offline, phase: this.number === 0 ? "ready" : hp === 0 ? "victory" : "active" } as const;
 }
}

export const raidRound = new RaidRound();
