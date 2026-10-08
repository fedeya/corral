import type { Agent } from "../herdr";
import type { Canvas } from "../pixel";
import type { Scene } from "../scene";

export type Theme = {
	id: string;
	/** Shown on the touch strip when switching to this theme. */
	name: string;
	drawKey(agent: Agent, frame: number): Canvas;
	/** Animation step of a key; keys with the same step render identically and share a cached image. */
	keyFrame(agent: Agent, frame: number): number;
	/** Sees the full agent list after each poll; returns true if key images must be redrawn. */
	prepare?(agents: Agent[]): boolean;
	scene: Scene;
};
