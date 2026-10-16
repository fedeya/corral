import type { Agent } from "../herdr";
import { MASCOT_STATUSES, type MascotPack } from "../mascot-pack";
import { Canvas, hex } from "../pixel";
import { BANG, CHECK, drawBubble, frameBorder, label, P, SIZE, THEME } from "../render";
import { createScene, HEIGHT, WIDTH } from "../scene";
import type { Theme } from "./types";

/** The pack is a startup snapshot; never read files or expose artist metadata while rendering. */
export function createGuestTheme(pack: MascotPack): Theme {
	const { image, metadata: { frameWidth: w, frameHeight: h } } = pack;
	const step = (frame: number) => Math.floor(frame / 4) % 2;
	function mascot(c: Canvas, agent: Agent, frame: number, x: number, feet: number, size: number, flip = false): number {
		const scale = Math.min(size / w, size / h);
		const height = Math.round(h * scale);
		c.blitScaled(image, step(frame) * w, MASCOT_STATUSES.indexOf(agent.status) * h, w, h,
			Math.round(x - w * scale / 2), feet - height, scale, { flip });
		return feet - height;
	}
	return {
		id: "guest",
		// Never use the pack's name/author/license as a public caption (including Showcase).
		name: "INVITADO",
		keyFrame: (_agent, frame) => step(frame),
		drawKey(agent, frame) {
			const c = new Canvas(SIZE, SIZE);
			const colors = THEME[agent.status];
			c.rect(0, 0, SIZE, SIZE, colors.bg);
			c.rect(8, 66, 104, 3, P.black, 0.3);
			mascot(c, agent, frame, 60, 66, 56);
			if (agent.status === "blocked") drawBubble(c, 92, 2, BANG, P.red);
			if (agent.status === "done") drawBubble(c, 92, 2, CHECK, P.forest);
			label(c, agent.workspace, colors.text, agent.subtitle);
			frameBorder(c, agent.focused ? P.white : colors.accent, 3);
			return c;
		},
		scene: createScene({
			background: () => ({
				key: "guest-gallery",
				draw(c) {
					c.rect(0, 0, WIDTH, HEIGHT, hex("#15263c"));
					c.rect(0, 60, WIDTH, 40, hex("#264453"));
					c.rect(0, 60, WIDTH, 2, hex("#44868c"));
					for (let x = 12; x < WIDTH; x += 24) c.rect(x, 75, 8, 1, hex("#32606c"));
				},
			}),
			drawActor: (c, { agent, x, feet, dir }, frame) => mascot(c, agent, frame, x, feet, 40, dir < 0),
		}),
	};
}
