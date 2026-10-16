# Optional Cursor Cloud Agent monitor

Drag **Cursor Cloud Agent** onto a spare key. The cloud character is original Corral pixel art, not Cursor's logo. This key is separate from the local agent roster, paging and pins.

## Configure

Provide **both** `CURSOR_CLOUD_AGENT_ID` (the exact existing agent ID) and `CURSOR_API_KEY` in the environment of the running Stream Deck plugin process, then restart the plugin. An interactive terminal export alone does not update an already running macOS Stream Deck process. Use your normal secure launch environment; do not put the key in action settings, source control or a committed `.env`.

The API key must be a user or service-account Cloud Agents API key authorized to read that agent. Missing/unsafe configuration makes **no network requests**, leaves the strip unchanged, and shows a quiet **NOT SET UP** key. Corral never lists/selects another agent automatically and never reads credential files.

Configured cloud status also appears in the **leftmost strip segment, x0–199 / y40–65**. The overlay is passive: tapping its region does not focus a local agent or open anything. Only the explicit cloud key opens the configured agent page, on release, after fresh read-only validation. Cloud updates reach the strip even when the local roster is empty or herdr is unavailable. No network/timers start at import; one shared poll runs only while cloud keys or strips subscribe.

## Current API contract and sources

Official documentation fetched as Markdown using `Accept: text/markdown`:

- [Cloud Agents API endpoints](https://cursor.com/docs/cloud-agent/api/endpoints): `GET https://api.cursor.com/v1/agents/{id}`, then `GET /v1/agents/{id}/runs/{latestRunId}`.
- [Authentication and rate limits](https://cursor.com/docs/api#authentication): Cloud Agents accepts Basic (key as username, empty password) **or Bearer**. This client uses Bearer.
- [Official OpenAPI schema](https://cursor.com/docs-static/cloud-agents-openapi.yaml): same `/v1` routes and `https://api.cursor.com` server.

**Documentation migration note:** the current reference and OpenAPI now publish **`/v1`**, not `/v1beta`. Direct `.md` GET URLs returned 404 from this environment; content negotiation on the canonical documentation URLs returned the Markdown reference. No legacy `/v0` status inference or automatic fallback is used.

Agent `ACTIVE`/`IDLE` describes durable lifecycle, **not success**. In particular, `IDLE` can follow a recoverable error. Only the validated latest run decides execution state:

| Run status | Display |
|---|---|
| `CREATING`, `RUNNING` | WORKING |
| `FINISHED` | DONE |
| `ERROR` | ERROR |
| `CANCELLED` | CANCELLED |
| `EXPIRED` | EXPIRED |
| Missing, malformed, unrecognized, unavailable, disconnected | UNKNOWN |

A complete snapshot needs matching agent/run identities and valid creation/update timestamps. Stale metadata/run responses cannot overwrite newer state. Failure replaces the whole display snapshot: a prior DONE is never retained as current success when disconnected.

Normal polling waits 15 seconds **after the previous complete poll** (two sequential GETs). Each request, including body decoding, has a five-second abort/deadline. HTTP/network failures exponentially back off from 30 seconds to five minutes; `Retry-After` is honored within that five-minute retry cap. `401` and `403` park the controller until plugin restart rather than retrying rapidly. Fix the launch environment/key permissions, then restart. There are no mutation/create/cancel/approval endpoints.

## Privacy and opening

Showcase displays a neutral **CLOUD AGENT** caption, generic status and camera badge; it never renders the canonical name, raw error body, URL, result, repository or prompt. Canonical data remains private internally, as with local agents. Exceptions, API keys, headers and response bodies are never logged by this feature. SDK/user/device/desktop logs outside the feature are not covered by this display boundary.

Opening uses Stream Deck's `system.openUrl`, never a shell. Only the exact API-returned `https://cursor.com/agents/{configured-id}` is accepted: no other hosts/subdomains, credentials, custom ports, queries, fragments, protocols or other agent IDs. The response agent identity must match the configured agent. Showcase and its resume quarantine block opening. A press captures epoch-bound permission; toggling on/off or removing/re-adding a key permanently revokes an already pending open.

The left overlay reserves no space on the rightmost segment (`x600–799 / y40–65`), allowing a separate beacon. Parent theme-banner composition should account for both reserved regions.

## Offline verification / limits

`tests/fixtures/cursor-cloud.json` is **synthetic**, modeled on official response examples; all HTTP in unit tests is mocked. Tests exercise the real controller, original PNG renderer and native key/dial handlers. No live API integration or physical hardware claim follows from these fixtures.

```sh
bun install --frozen-lockfile
bun run test:plugin
bun run --cwd apps/plugin typecheck
bun run build:plugin
bun run validate
```

Authenticated verification requires both environment variables above. Checking whether they exist is safe; do not print their values. Do not send a live request without them, and never replace a blocked live check with fabricated output.
