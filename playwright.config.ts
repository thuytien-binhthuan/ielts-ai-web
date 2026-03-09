import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 3100;
const EXTERNAL_BASE_URL = process.env.PW_BASE_URL;
const BASE_URL = EXTERNAL_BASE_URL || `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "off",
    screenshot: "only-on-failure",
  },
  ...(EXTERNAL_BASE_URL
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --port ${WEB_PORT}`,
          url: `http://127.0.0.1:${WEB_PORT}`,
          timeout: 120_000,
          reuseExistingServer: true,
          env: {
            NEXT_PUBLIC_PART2_PREP_SECONDS: "5",
            NEXT_DIST_DIR: ".next-playwright",
          },
        },
      }),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
