import { useState } from "react";
import type { CSSProperties } from "react";

import goat from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/goat-sheet.png";
import sheep from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/sheep_walk.png";
import cow from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/cow_walk.png";
import pig from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/pig_walk.png";
import llama from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/llama_walk.png";
import chicken from "../../../plugin/dev.fedeya.corral.sdPlugin/imgs/chicken_walk.png";

export const GITHUB = "https://github.com/fedeya/corral";
export const INSTALL_COMMANDS = "git clone https://github.com/fedeya/corral\ncd corral\nbun install\nbun run build:plugin\nbun run link";
export type ThemeId = 'farm' | 'kingdom';
const SPRITES = { goat, sheep, cow, pig, llama, chicken };
export type Species = keyof typeof SPRITES;

/** Real LPC sprites from the plugin, with four horizontal walking frames. */
export function Critter({ species = "goat", size = 128, animated = true, className = "" }: { species?: Species; size?: number; animated?: boolean; className?: string }) {
  const rows = species === "goat" ? 8 : 4;
  const row = species === "llama" ? 1 : 3;
  const style = {
    width: size, height: size,
    backgroundImage: `url(${SPRITES[species]})`,
    backgroundSize: `400% ${rows * 100}%`,
    backgroundPositionY: `${row / (rows - 1) * 100}%`,
    "--critter-size": `${size}px`,
  } as CSSProperties;
  return <span className={`xp-critter ${animated ? "xp-critter-animated" : ""} ${className}`} style={style} aria-hidden="true" />;
}


export function InstallCommands({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(INSTALL_COMMANDS); setStatus("Installation commands copied."); }
    catch { setStatus("Could not access the clipboard. Select and copy the commands above."); }
  }
  return <div className={`xp-install ${className}`}><div className="xp-install-bar"><span>INSTALL / macOS</span><button type="button" aria-label="Copy installation commands" onClick={copy}>{status === "Installation commands copied." ? "Copied ✓" : "Copy commands"}</button></div><pre><code>{INSTALL_COMMANDS}</code></pre><p role="status" aria-live="polite">{status}</p></div>;
}

export function SetupNotes() {
  return <p className="xp-setup-notes">Requires Stream Deck +, its desktop app, <a href="https://herdr.dev">herdr</a>, <a href="https://ghostty.org">Ghostty</a> and <a href="https://bun.sh">Bun</a> on macOS. Add Agent slot to your keys and Agents strip to all four dials. Ghostty and the herdr path are currently hard-coded. Kingdom art is a separate download. <a href={`${GITHUB}#install`}>Full setup ↗</a></p>;
}

export function ArtCredits() {
  return <span className="xp-art-credits">Farm sprites: Daniel Eddeland & bluecarrot16, CC-BY 3.0. Website room and Kingdom pawns: original illustrations. The plugin’s optional Kingdom art is by Pixel Frog and downloaded separately. <a href={`${GITHUB}#credits`}>Credits ↗</a></span>;
}
