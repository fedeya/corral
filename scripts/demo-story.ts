// The demo story: one pretend task per workspace, with when it starts and when it finishes or asks for you
// (seconds after `bun run demo on`). Edit freely to change what shows up in a recording.

export type Step =
	| { kind: "say"; text: string }
	| { kind: "read"; path: string; lines: number }
	| { kind: "search"; pattern: string; files: number }
	| { kind: "bash"; cmd: string; out: string }
	| { kind: "edit"; path: string; at: number; removed: string[]; added: string[] };

const say = (text: string): Step => ({ kind: "say", text });
const read = (path: string, lines: number): Step => ({ kind: "read", path, lines });
const search = (pattern: string, files: number): Step => ({ kind: "search", pattern, files });
const bash = (cmd: string, out: string): Step => ({ kind: "bash", cmd, out });
const edit = (path: string, at: number, removed: string[], added: string[]): Step => ({ kind: "edit", path, at, removed, added });

export type Task = {
	/** Which agent CLI the pane imitates. */
	agent: "opencode" | "claude";
	prompt: string;
	/** Seconds after the demo starts. */
	start: number;
	/** When it finishes, or when it stops to ask if `blockedAt` is set. */
	end: number;
	/** Number of steps played before asking; the rest play after you answer. */
	blockedAt?: number;
	question?: string;
	/** What it asks permission for (shown in the question). */
	asks?: Step;
	steps: Step[];
	summary: string;
};

export const TASKS: Record<string, Task> = {
	"auth-refactor": {
		agent: "opencode",
		prompt: "Move session handling out of the auth middleware into its own module",
		start: 1,
		end: 26,
		steps: [
			say("I'll start by looking at how sessions are handled today."),
			read("src/middleware/auth.ts", 214),
			search("getSession", 9),
			edit("src/auth/session.ts", 1, [], ["export async function getSession(req: Request) {", "  const token = readCookie(req, SESSION_COOKIE);"]),
			edit("src/middleware/auth.ts", 42, ["  const token = req.cookies[SESSION_COOKIE];", "  const session = await db.sessions.find(token);"], ["  const session = await getSession(req);"]),
			bash("bun test src/auth", "38 pass, 0 fail"),
		],
		summary: "Moved session handling into src/auth/session.ts. The middleware is 60 lines shorter and all 38 auth tests pass.",
	},
	"landing-page": {
		agent: "opencode",
		prompt: "Make the pricing section on the landing page responsive",
		start: 2,
		end: 12,
		blockedAt: 2,
		question: "Do you want to make this edit to Pricing.tsx?",
		asks: edit("app/(marketing)/Pricing.tsx", 23, ['<div className="grid grid-cols-3 gap-8">'], ['<div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">']),
		steps: [
			read("app/(marketing)/Pricing.tsx", 167),
			say("The cards use a fixed 3-column grid. I'll stack them on small screens."),
			edit("app/(marketing)/Pricing.tsx", 23, ['<div className="grid grid-cols-3 gap-8">'], ['<div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">']),
			bash("bun run build", "✓ Compiled successfully"),
		],
		summary: "The pricing cards now stack on mobile and sit side by side from md up.",
	},
	"stripe-webhooks": {
		agent: "claude",
		prompt: "Handle duplicate Stripe webhook deliveries",
		start: 3,
		end: 38,
		blockedAt: 4,
		question: "Run the database migration add_processed_events?",
		asks: bash("bun run db:migrate", ""),
		steps: [
			read("src/webhooks/stripe.ts", 142),
			say("Stripe retries deliveries, so the same event can arrive twice. I'll record processed event IDs."),
			search("constructEvent", 2),
			edit("src/webhooks/stripe.ts", 58, [], ["  if (await alreadyProcessed(event.id)) return ok();"]),
			bash("bun run db:migrate", "Applied add_processed_events"),
			bash("bun test webhooks", "21 pass, 0 fail"),
		],
		summary: "Duplicate deliveries are now ignored: each event ID is stored and checked before processing.",
	},
	"flaky-tests": {
		agent: "opencode",
		prompt: "Figure out why the checkout e2e test fails randomly in CI",
		start: 4,
		end: 18,
		steps: [
			bash("bun test e2e/checkout --repeat 20", "17 pass, 3 fail"),
			read("e2e/checkout.spec.ts", 96),
			say("The test clicks Pay before the card form finishes loading."),
			edit("e2e/checkout.spec.ts", 41, ["  await page.click('#pay');"], ["  await page.getByRole('button', { name: 'Pay' }).click();"]),
		],
		summary: "Fixed: the test now waits for the Pay button to be ready. 50/50 runs pass.",
	},
	"dark-mode": {
		agent: "claude",
		prompt: "Add a dark mode toggle to the settings page",
		start: 5,
		end: 55,
		steps: [
			search("theme", 14),
			read("app/settings/page.tsx", 88),
			edit("app/settings/page.tsx", 31, [], ["      <ThemeToggle />"]),
			edit("app/globals.css", 12, [], [".dark {", "  --background: #0b0b0f;"]),
			bash("bun run lint", "No problems"),
			say("Checking contrast on the dashboard cards."),
			bash("bun test settings", "12 pass, 0 fail"),
		],
		summary: "Dark mode is in: toggle in Settings, follows the system by default, remembered per user.",
	},
	"search-index": {
		agent: "opencode",
		prompt: "Speed up product search",
		start: 6,
		end: 46,
		blockedAt: 3,
		question: "Rebuild the search index? It takes about 4 minutes.",
		asks: bash("bun run search:reindex", ""),
		steps: [
			bash("bun run bench:search", "p95 840ms"),
			read("src/search/query.ts", 203),
			say("Every search scans the full table. A trigram index on name and sku should fix it."),
			bash("bun run search:reindex", "Indexed 48,210 products"),
			bash("bun run bench:search", "p95 38ms"),
		],
		summary: "Search p95 went from 840ms to 38ms with a trigram index.",
	},
	docs: {
		agent: "opencode",
		prompt: "Document the new webhooks API",
		start: 30,
		end: 70,
		steps: [
			read("src/webhooks/stripe.ts", 160),
			edit("docs/webhooks.md", 1, [], ["# Webhooks", "", "Failed deliveries are retried up to 5 times."]),
			say("Adding an example payload."),
		],
		summary: "Wrote docs/webhooks.md with setup steps, retries and an example payload.",
	},
	onboarding: {
		agent: "claude",
		prompt: "Add a welcome checklist for new teams",
		start: 999,
		end: 999,
		steps: [],
		summary: "",
	},
	analytics: {
		agent: "opencode",
		prompt: "Track signup funnel events",
		start: 999,
		end: 999,
		steps: [],
		summary: "",
	},
};
