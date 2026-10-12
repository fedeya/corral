import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  outputDir: join(tmpdir(), "corral-web-tests"),
  use: { baseURL: "http://127.0.0.1:4173", ...devices["Desktop Chrome"] },
  webServer: {
    command: `${process.env.CORRAL_WEB_PRODUCTION ? "bun run preview" : "bun run dev"} --host 127.0.0.1 --port 4173 --strictPort`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI && !process.env.CORRAL_WEB_PRODUCTION,
  },
});
