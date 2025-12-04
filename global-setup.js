// global-setup.js
const { chromium } = require('@playwright/test');
const path = require('path');
require('dotenv').config();

module.exports = async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'] // Helps avoid detection
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation', 'notifications'],
    // Extra HTTP headers to maintain session
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
  });
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to CPaaS login page...');
    console.log(`   URL: ${process.env.BASE_URL}`);
    
    // Navigate with better error handling
    try {
      await page.goto(process.env.BASE_URL, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
    } catch (navErr) {
      console.log('   ⚠ Navigation timeout, but page may have loaded. Continuing...');
      // Check if page actually loaded
      if (page.isClosed()) {
        throw new Error('Page closed during navigation');
      }
    }

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded').catch(() => {
      console.log('   ⚠ DOM content load state timeout, continuing anyway...');
    });
    
    console.log('📝 Filling credentials...');
    console.log(`   Username: ${process.env.APP_USERNAME}`);
    
    // Try multiple email input selectors
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email"]',
      '#email',
      '[id*="email"]',
      'input[name="username"]'
    ];
    
    for (const selector of emailSelectors) {
      try {
        await page.fill(selector, process.env.APP_USERNAME, { timeout: 3000 });
        console.log(`   ✓ Filled email using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    // Try multiple password input selectors
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '#password',
      '[id*="password"]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        await page.fill(selector, process.env.APP_PASSWORD, { timeout: 3000 });
        console.log(`   ✓ Filled password using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }

    // Try multiple submit button selectors
    console.log('🔐 Submitting login form...');
    const submitSelectors = [
      'button:has-text("SIGN IN")',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("LOG IN")',
      'button[type="submit"]',
      'input[type="submit"]',
      '[role="button"]:has-text("Sign")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        console.log(`   ✓ Clicked submit using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }

    console.log('⏳ Waiting for dashboard/home page to load...');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    
    // Try multiple dashboard indicators
    const dashboardSelectors = [
      'text=Hello PlatAdmin',
      'text=Dashboard',
      'text=Communication Platform',
      'text=CPaaS',
      'text=Welcome',
      '[class*="dashboard"]',
      '[data-testid="dashboard"]'
    ];
    
    let loginSuccess = false;
    for (const selector of dashboardSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`   ✓ Found dashboard element: ${selector}`);
        loginSuccess = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!loginSuccess) {
      console.log('   ⚠ Specific dashboard element not found, but checking URL...');
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      if (!currentUrl.includes('/auth/login')) {
        console.log('   ✓ URL changed from login page, assuming success');
        loginSuccess = true;
      }
    }

    if (loginSuccess) {
      console.log('✅ Login successful, saving auth state...');
      await context.storageState({ path: path.join(__dirname, 'auth-state.json') });
      
      // Take a screenshot of the logged-in state
      await page.screenshot({ 
        path: path.join(__dirname, 'login-success.png'), 
        fullPage: false 
      });
      console.log('📸 Screenshot saved: tests/login-success.png');
    } else {
      throw new Error('Could not verify successful login');
    }

  } catch (err) {
    console.error('❌ Login failed:', err.message);
    
    // Take a screenshot for debugging - but only if page is still valid
    try {
      if (page && !page.isClosed()) {
        await page.screenshot({ 
          path: path.join(__dirname, 'login-failure.png'), 
          fullPage: true 
        });
        console.log('💾 Screenshot saved to tests/login-failure.png for debugging.');
        
        // Log the current URL
        console.log(`   Current URL: ${page.url()}`);
        
        // Log any error messages on the page
        const bodyText = await page.textContent('body').catch(() => '');
        if (bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('invalid')) {
          console.log('   ⚠ Error message detected on page');
        }
      } else {
        console.log('   ⚠ Page already closed, cannot take screenshot');
      }
    } catch (screenshotErr) {
      console.log('   ⚠ Could not take screenshot:', screenshotErr.message);
    }
    
    throw new Error('Login failed: check username/password or update selectors');
  } finally {
    // Safely close browser resources
    try {
      if (browser) {
        await browser.close();
      }
    } catch (closeErr) {
      console.log('   ⚠ Error closing browser:', closeErr.message);
    }
  }
};
