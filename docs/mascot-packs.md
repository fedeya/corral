# Local mascot packs: Invitado

Invitado turns one local PNG atlas into Corral's keys and roaming touch-strip actors. It is data-only: no scripts, archives, downloads, network requests, property inspector or new dependencies. Farm remains the default and still works if the pack is missing or invalid.

## Try the original example

The repository ships **Luma**, an original pocket-greenhouse lantern, in [`examples/mascot-packs/luma`](../examples/mascot-packs/luma). Its PNG, JSON and generator are explicitly MIT-licensed; no third-party artwork is included.

From the repository root, on macOS:

```sh
mkdir -p "$HOME/Library/Application Support/Corral/mascot"
cp examples/mascot-packs/luma/mascot.json examples/mascot-packs/luma/mascot.png examples/mascot-packs/luma/LICENSE "$HOME/Library/Application Support/Corral/mascot/"
bun run restart
```

Copying replaces files of the same names. Back up an existing pack first. Restart the plugin after installing, replacing or removing a pack. Turn the last dial to cycle to **INVITADO**. It appears only when a valid pack was loaded at startup; an invalid pack is ignored, not shown as a broken theme. If a saved Invitado selection no longer exists on restart, Corral falls back to Farm.

The default directory is always `~/Library/Application Support/Corral/mascot` (outside the `.sdPlugin` bundle). For development, `CORRAL_MASCOT_DIR` overrides it. This environment variable must be inherited by the **plugin process**; exporting it in a terminal does not change an already-running Stream Deck app's environment. Use an absolute directory. Files inside any `.sdPlugin` directory are rejected. Do not place custom resources or the example generator in the native plugin bundle.

To regenerate the exact shipped example:

```sh
bun apps/plugin/scripts/generate-mascot-example.ts
# Or write a separate development pack:
bun apps/plugin/scripts/generate-mascot-example.ts /absolute/path/to/my-pack
```

The generator is an authoring tool, never executed by the pack loader. Only the two data files below are read at runtime. A `LICENSE` file can accompany them for redistribution.

## Version 1 format

`mascot.json` is strict JSON with **exactly** these seven properties:

```json
{
  "version": 1,
  "name": "My original mascot",
  "author": "Artist name",
  "license": "MIT",
  "atlas": "mascot.png",
  "frameWidth": 32,
  "frameHeight": 32
}
```

- `name`, `author` and `license` are required, nonblank strings, at most 80 characters, without control characters. Use artwork you have permission to use, and supply its actual license. The loader checks attribution fields, not the validity of your rights claim.
- `version` must be `1`; `atlas` must be the literal basename `mascot.png`. No alternate filenames, paths or URLs.
- Frame width and height are integers from **8 to 64** inclusive. There are **exactly two columns and five rows**, no margins or gaps. Atlas dimensions must be `frameWidth × 2` by `frameHeight × 5` (maximum **128 × 320**).

| Row (top to bottom) | Status | Columns |
| --- | --- | --- |
| 0 | idle | frame 0, frame 1 |
| 1 | unknown | frame 0, frame 1 |
| 2 | working | frame 0, frame 1 |
| 3 | blocked | frame 0, frame 1 |
| 4 | done | frame 0, frame 1 |

Frames alternate every four animation ticks (about half a second per frame). Use transparency and leave breathing room within each cell. Corral scales with nearest-neighbour pixels to fit a 56-pixel key figure and 40-pixel strip figure, preserves aspect ratio, and mirrors strip actors to face their movement. Standard workspace/subtitle labels, status colors, blocked/done bubbles, focus borders, pins and Showcase badges remain Corral's responsibility.

### PNG export and resource limits

Export a **non-interlaced 8-bit RGBA PNG** (color type 6), with only `IHDR`, one or more contiguous `IDAT` chunks, and `IEND`. Strip all ancillary metadata (including color profiles/gamma/text chunks) and animation data; indexed, grayscale, RGB-only, interlaced and APNG files are not supported in this small format.

The loader checks regular-file type and byte budgets before parsing: JSON ≤ **8 KiB**, PNG ≤ **256 KiB**. It checks the PNG signature, header, exact atlas dimensions, format, chunk envelope and end-of-file **before image decoding**. IDAT inflation is capped to the exact RGBA scanline budget (at most **164,160 bytes** including filter bytes), then the PNG decoder checks CRCs and image data. Malformed/truncated images, oversized dimensions, excess inflated data, unknown fields and missing attribution fail closed.

Symbolic links are not accepted for either data file, the pack directory or any parent directory. The loader uses no-follow/nonblocking file opens, bounded reads and post-read identity checks. Install into a directory you own; this is a local data importer, not a sandbox for a hostile concurrent process with permission to replace your directories.

## Lifetime, privacy and failure behavior

The pack is read and decoded **once per plugin startup**. Filesystem edits do not alter the live theme or its cache; restart to load a new snapshot. Deleting a loaded pack does not break currently rendering keys or strips. No polling or hot reload is introduced.

The public theme caption is always **INVITADO**, never the imported `name`, `author`, license text, filename or local path. Errors collapse to a fixed `Mascot pack unavailable` result internally, without exception details on keys or strips. An invalid import cannot stop Farm from rendering.

Invitado uses the shared renderer and scene, including independent per-device scene forks, pins, aliases and camera badges. Showcase changes workspace/subtitle labels without changing the mascot's appearance. **Imported pixels are not redacted**: do not put private text or images into a pack you will show on camera. Focus suppression and Showcase's existing privacy guarantees are otherwise unchanged.

## Verification

```sh
bun install --frozen-lockfile
bun run test:plugin
bun run typecheck
bun run build:plugin
bun run validate
```

Tests cover schema/attribution, filesystem traversal and sizes, PNG preflight and compressed bombs, all ten atlas cells, restart-scoped registration/fallback, shared privacy/pin/camera rendering, per-device scenes and byte-for-byte example regeneration. No physical Stream Deck verification is claimed by these renderer tests.
