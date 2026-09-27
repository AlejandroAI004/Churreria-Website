import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4300",
    channel: process.env["PLAYWRIGHT_CHANNEL"] || "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node e2e/server.mjs",
      url: "http://127.0.0.1:3101/api/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        "npm --prefix frontend exec -- ng serve --host localhost --port 4300 --proxy-config proxy.e2e.json",
      url: "http://localhost:4300",
      reuseExistingServer: false,
      timeout: 120000,
      env: { NG_CLI_ANALYTICS: "false" },
    },
  ],
});
