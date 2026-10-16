import type { CloudSnapshot, CloudStatus } from "./cursor-cloud";
import { Canvas, drawText, drawTextCentered, fitText, FONT_3X5, hex, type RGB } from "./pixel";
import { P, SIZE, showcaseMarker } from "./render";

// Original Corral cloud critter: a stepped cumulus with eyes and a tiny uplink.
const CLOUD = [
 "......####......", "....########....", "...##########...", ".##############.",
 "################", "####.######.####", "################", ".##############.",
 "...##########...", "......#..#......", ".....##..##.....",
];
const BLUE = hex("#76c8ff");
const colors: Record<CloudStatus, RGB> = { working: BLUE, done: P.green, error: P.red, cancelled: P.orange, expired: P.orange, unknown: P.silver, unavailable: P.slate };
export function renderCloudKey(snapshot: CloudSnapshot, showcase = false): string {
 const c = new Canvas(SIZE, SIZE), color = colors[snapshot.status];
 c.rect(0, 0, SIZE, SIZE, P.navy);
 c.rect(0, 0, SIZE, 3, color);
 drawTextCentered(c, "CURSOR CLOUD", 9, 2, P.silver, undefined, FONT_3X5);
 c.pattern(CLOUD, 28, 28, 4, { "#": color });
 c.rect(57, 22, 6, 3, color); c.rect(59, 18, 2, 4, color);
 drawTextCentered(c, snapshot.status === "unavailable" ? "NOT SET UP" : snapshot.status.toUpperCase(), 78, 2, color, undefined, FONT_3X5);
 if (snapshot.configured) drawTextCentered(c, fitText(showcase ? "CLOUD AGENT" : snapshot.label.toUpperCase(), 110, 2, FONT_3X5), 94, 2, P.white, undefined, FONT_3X5);
 if (showcase) showcaseMarker(c);
 return c.toDataUrl();
}

/** Passive overlay only: x0..199, y40..65. It never creates a touch target. */
export function drawCloudStrip(c: Canvas, snapshot: CloudSnapshot, showcase = false): void {
 if (!snapshot.configured) return;
 c.rect(0, 40, 200, 26, P.navy);
 c.rect(0, 40, 2, 26, colors[snapshot.status]);
 c.pattern(CLOUD.slice(0, 9), 7, 44, 2, { "#": colors[snapshot.status] });
 drawText(c, `CLOUD ${snapshot.status.toUpperCase()}`, 45, 43, 2, colors[snapshot.status], undefined, FONT_3X5);
 drawText(c, fitText(showcase ? "CLOUD AGENT" : snapshot.label.toUpperCase(), 150, 2, FONT_3X5), 45, 55, 2, P.white, undefined, FONT_3X5);
}
