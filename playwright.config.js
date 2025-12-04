// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  globalSetup: require.resolve('./tests/global-setup.js'),
  use: {
    // Use the main app URL, not the login URL
    baseURL: (process.env.BASE_URL || 'https://qa.ngagecpaas.com').replace('/auth/login', ''),
    storageState: path.join(__dirname, 'tests', 'auth-state.json'),
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
    // Keep session alive
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache'
    }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
