# Corral

Your coding agents as a herd of animated pixel-art critters on a Stream Deck +.

Each agent from [herdr](https://herdr.dev) gets its own character: a goat, a llama, a lumberjack, a miner. The keys
show who's working, who needs you and who's done. The touch strip shows the whole herd together in a little scene.
Tap one to jump to that agent in your terminal. Turn the last dial to switch themes.

## Requirements

- Stream Deck + and the Stream Deck app (macOS).
- herdr, at `/opt/homebrew/bin/herdr`.
- Ghostty as your terminal.
- [Bun](https://bun.sh) for building.

The herdr path and terminal are hard-coded in `src/herdr.ts` for now.

## Install

```sh
bun install
bun run build
bun run link      # registers the plugin with the Stream Deck app
```

Then add the **Agent slot** action to as many keys as you like and the **Agents strip** action to the four dials.

## Use

Agents are sorted: needs you (blocked) > done > working > idle, then most recent first.

| Control | Action |
|---|---|
| Key | Focus that agent (herdr + Ghostty) |
| Tap the touch strip | Focus the agent you tapped |
| Push any dial | Focus the agent that needs you most |
| Turn dials 1–3 | Page through agents when they don't fit on the keys |
| Turn dial 4 | Switch theme (remembered across restarts) |

## Themes

Code is MIT (see `LICENSE`). Each theme's art keeps its own license:

| Theme | Art | License |
|---|---|---|
| Farm | [LPC farm animals](https://opengameart.org/content/lpc-style-farm-animals) | CC-BY 3.0 (included) |
| Kingdom | [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords) by Pixel Frog | Free, not redistributable |

Kingdom only shows up once its sprites are in place. Download Tiny Swords (free) from itch.io and copy the pawn, tree,
castle, house, gold stone, bush, sheep, stump, meat and wood sprites into `dev.fedeya.corral.sdPlugin/imgs/kingdom/`.
File names are in `src/themes/kingdom.ts`. The folder is git-ignored.

## Adding a theme

A theme is one file in `src/themes/`, plus one line in `src/themes/index.ts` to register it.

1. **Copy the template.** Copy `src/themes/_template.ts` to `src/themes/<id>.ts`. The template is a complete theme (a
   pixel slime drawn in code, no image files) with comments explaining every part.
2. **Register it.** Import it in `src/themes/index.ts` and add it to `THEMES`. Dial 4 now cycles through it.
3. **Preview it.** Run `bun run preview <id> --open`. This renders the keys plus the touch strip by day and by night to a
   PNG, with no Stream Deck needed. It uses your live herdr agents, or sample ones if herdr isn't running.
4. **Ship it.** Run `bun run typecheck && bun run build && bun run restart`.

A theme provides:

- **`drawKey(agent, frame)`**: draws a 120×120 key for each status (`working`, `blocked`, `done`, `idle`). Frames tick 8
  times a second.
- **`keyFrame(agent, frame)`**: the animation step. Keys with the same step are drawn once and cached, so return the
  loop length of each animation.
- **`scene`**: built with `createScene(skin)`, where the skin defines:
  - `background(hour, frame)`: the static 800×100 backdrop, cached by the key it returns.
  - `overlay(...)`: optional animated details.
  - `drawActor(...)`: draws one agent's figure and returns the top of its head.
- **`prepare(agents)`** (optional): sees the full agent list after each poll. Kingdom uses it to deal jobs and colours
  evenly.

The shared scene code (`src/scene.ts`) already handles:

- placing each agent under its key;
- walking new figures in, and moving working ones back and forth;
- name tags that never overlap;
- tap hit-testing.

Shared drawing helpers are in `src/render.ts`:

- `drawBubble` with `BANG` / `CHECK`, for the "!" and "✓" bubbles;
- `sparkles`;
- `label`, for the workspace name;
- `frameBorder`;
- the PICO-8 palette `P`;
- per-status colours in `THEME`.

`Canvas.blitScaled` in `src/pixel.ts` draws sprite-sheet frames at any scale, mirrored or tinted.

Conventions that keep themes consistent:

- Put the art in the top ~75px and the workspace name in the bottom band (`label`).
- Use the status colour from `THEME` as the background.
- Dim idle agents so they don't stand out.
- Draw a white border on the focused agent.
- Animate every status.

Put sprite sheets in `dev.fedeya.corral.sdPlugin/imgs/<id>/` and load them with `loadSheet("<id>/file.png")`.
Credit the artist in `imgs/CREDITS.md`. If the license forbids redistribution, git-ignore the folder and register the
theme only when the art is present, using `hasImage`, the way kingdom does.

## Development

- **Build:** `bun run build`.
- **Restart the plugin:** `bun run restart`. Stream Deck developer mode (`streamdeck dev`) must be on.
- **Logs:** `dev.fedeya.corral.sdPlugin/logs/`.
- **How it gets data:** the plugin polls `herdr agent list` and `herdr workspace list` every second, and focuses an
  agent with `herdr agent focus`.
