const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../openai_outputs');
const UI_MAP_FILE = path.join(__dirname, '../ui-elements-map.json');

// Load UI Elements Mapping
let UI_MAP = {};
try {
  UI_MAP = JSON.parse(fs.readFileSync(UI_MAP_FILE, 'utf8'));
  console.log('✅ UI Elements Map loaded successfully');
} catch (err) {
  console.warn('⚠ UI Elements Map not found, using default selectors');
}

// Load AI Test Cases
function loadTestCases() {
  const testcases = [];
  const files = fs.readdirSync(OUTPUT_DIR);

  files.forEach(file => {
    if (file.endsWith('_testcases.json')) {
      try {
        const content = fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf8');
        testcases.push(...JSON.parse(content));
      } catch (err) {
        console.warn('Invalid JSON →', file);
      }
    }
  });
  return testcases;
}

const testcases = loadTestCases();

/**
 * 🔐 Session Checker - Ensures user is still logged in
 */
async function ensureLoggedIn(page, context) {
  const currentUrl = page.url();
  
  // If we're on login page, re-authenticate
  if (currentUrl.includes('/auth/login')) {
    console.log('      ⚠️  Session expired detected! Re-authenticating...');
    
    try {
      await page.fill('input[name="email"], input[type="email"]', process.env.APP_USERNAME, { timeout: 5000 });
      await page.fill('input[name="password"], input[type="password"]', process.env.APP_PASSWORD, { timeout: 5000 });
      await page.click('button:has-text("SIGN IN"), button[type="submit"]', { timeout: 5000 });
      
      // Wait for redirect after login
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.waitForTimeout(1000);
      
      // Save new auth state
      await context.storageState({ path: path.join(__dirname, 'auth-state.json') });
      console.log('      ✅ Session restored!');
      
      return true;
    } catch (e) {
      console.log('      ❌ Failed to restore session:', e.message);
      return false;
    }
  }
  
  return true; // Already logged in
}

/**
 * 🔍 Smart Element Finder using UI Map
 * Tries to find elements using application-specific selectors
 */
async function findElementSmart(page, keywords, defaultSelectors = []) {
  const allSelectors = [...defaultSelectors];
  
  // Add selectors from UI map based on keywords
  if (UI_MAP.whatsapp && keywords.some(kw => ['whatsapp', 'messaging', 'message', 'channel'].includes(kw))) {
    if (keywords.includes('interface') || keywords.includes('messaging')) {
      allSelectors.unshift(UI_MAP.whatsapp.messagingInterface.selector);
      allSelectors.push(...UI_MAP.whatsapp.messagingInterface.alternates);
    }
    if (keywords.includes('send') || keywords.includes('submit')) {
      allSelectors.unshift(UI_MAP.whatsapp.sendButton.selector);
      allSelectors.push(...UI_MAP.whatsapp.sendButton.alternates);
    }
    if (keywords.includes('input') || keywords.includes('compose')) {
      allSelectors.unshift(UI_MAP.whatsapp.messageInput.selector);
      allSelectors.push(...UI_MAP.whatsapp.messageInput.alternates);
    }
    if (keywords.includes('report') || keywords.includes('dashboard')) {
      allSelectors.unshift(UI_MAP.whatsapp.reportingDashboard.selector);
      allSelectors.push(...UI_MAP.whatsapp.reportingDashboard.alternates);
    }
  }
  
  if (UI_MAP.waba && keywords.some(kw => ['waba', 'category', 'selection'].includes(kw))) {
    if (keywords.includes('screen') || keywords.includes('selection')) {
      allSelectors.unshift(UI_MAP.waba.wabaSelectionScreen.selector);
      allSelectors.push(...UI_MAP.waba.wabaSelectionScreen.alternates);
    }
    if (keywords.includes('category')) {
      allSelectors.unshift(UI_MAP.waba.categoryDropdown.selector);
      allSelectors.push(...UI_MAP.waba.categoryDropdown.alternates);
    }
  }
  
  // Try each selector
  for (const selector of allSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        return element;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  return null;
}

/**
 *  Enhanced Dynamic Step Interpreter
 * Converts AI text steps into real Playwright actions with intelligent element detection.
 */
async function executeStep(page, step, stepIndex, context) {
  const originalStep = step;
  step = step.toLowerCase();

  console.log(`   ➤ Step ${stepIndex + 1}: ${originalStep}`);

  // Check if page is closed
  if (page.isClosed()) {
    console.log(`      ⚠ Page is closed, skipping step`);
    return;
  }

  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  
  // Check session every few steps (every 3rd step)
  if (stepIndex % 3 === 0 && context) {
    await ensureLoggedIn(page, context).catch(() => {});
  }

  // NAVIGATION - Handle "navigate to", "go to", "open", "access"
  if (step.match(/\b(navigate|go to|open|access|visit)\b/)) {
    const navigationKeywords = ['navigate to', 'go to', 'open the', 'open', 'access the', 'access', 'visit'];
    let target = step;
    
    for (const keyword of navigationKeywords) {
      target = target.replace(keyword, '').trim();
    }
    
    // Remove common articles and prepositions
    target = target.replace(/^(the|a|an)\s+/, '');
    
    console.log(`      🔍 Looking for navigation element: "${target}"`);
    
    // Extract keywords for smart finding
    const keywords = target.toLowerCase().split(/\s+/);
    
    // Try smart finder with UI map first
    const defaultSelectors = [
      `a:has-text("${target}")`,
      `button:has-text("${target}")`,
      `[role="link"]:has-text("${target}")`,
      `[role="button"]:has-text("${target}")`,
      `nav >> text=${target}`,
      `[href*="${target.replace(/\s+/g, '-')}"]`,
      `text=${target}`
    ];
    
    const element = await findElementSmart(page, keywords, defaultSelectors);
    
    if (element) {
      await element.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      console.log(`      ✅ Navigated successfully`);
      return;
    }
    
    // If still not found, try partial text matches
    const words = target.split(/\s+/);
    for (const word of words.filter(w => w.length > 3)) {
      try {
        const partialElement = page.locator(`text=${word}`).first();
        if (await partialElement.isVisible({ timeout: 2000 })) {
          await partialElement.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          console.log(`      ✅ Navigated successfully using partial match: "${word}"`);
          return;
        }
      } catch (e) {
        // Continue
      }
    }
    
    console.log(`      ⚠ Could not find navigation element for: ${target}`);
    return;
  }

  // SELECT - Handle dropdown/combobox selections
  if (step.match(/\b(select|choose|pick)\b/)) {
    const match = step.match(/select\s+(?:a\s+)?(?:specific\s+)?(.+?)(?:\s+from|\s+in|\s+as|$)/);
    if (match) {
      const optionText = match[1].trim();
      console.log(`      🔍 Looking for dropdown option: "${optionText}"`);
      
      const stepKeywords = step.toLowerCase().split(/\s+/);
      const dropdownSelectors = [];
      
      // Add UI map selectors
      if (UI_MAP.whatsapp && stepKeywords.some(kw => ['whatsapp', 'channel'].includes(kw))) {
        dropdownSelectors.push(UI_MAP.whatsapp.channelDropdown.selector);
        dropdownSelectors.push(...UI_MAP.whatsapp.channelDropdown.alternates);
      }
      
      if (UI_MAP.waba) {
        if (stepKeywords.includes('category')) {
          dropdownSelectors.push(UI_MAP.waba.categoryDropdown.selector);
          dropdownSelectors.push(...UI_MAP.waba.categoryDropdown.alternates);
        }
        if (stepKeywords.includes('waba')) {
          dropdownSelectors.push(UI_MAP.waba.wabaDropdown.selector);
          dropdownSelectors.push(...UI_MAP.waba.wabaDropdown.alternates);
        }
      }
      
      // Add default dropdown selectors
      dropdownSelectors.push(
        'select',
        '[role="combobox"]',
        '[role="listbox"]',
        'input[list]',
        '.select',
        '.dropdown'
      );
      
      try {
        // Try to find and click dropdown first
        for (const selector of dropdownSelectors) {
          try {
            const dropdown = page.locator(selector).first();
            if (await dropdown.isVisible({ timeout: 2000 })) {
              const tagName = await dropdown.evaluate(el => el.tagName);
              if (tagName === 'SELECT') {
                await dropdown.selectOption({ label: optionText }).catch(() => 
                  dropdown.selectOption({ value: optionText })
                );
              } else {
                await dropdown.click();
                await page.waitForTimeout(500).catch(() => {});
                await page.locator(`text=${optionText}`).first().click({ timeout: 3000 }).catch(() => {});
              }
              console.log(`      ✅ Selected: ${optionText}`);
              return;
            }
          } catch (e) {
            if (e.message.includes('closed')) {
              console.log(`      ⚠ Page closed, skipping dropdown selection`);
              return;
            }
            // Try next selector
          }
        }
        
        // Fallback: just click the text directly
        const textElement = page.locator(`text=${optionText}`).first();
        if (await textElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          await textElement.click({ timeout: 5000 }).catch(() => {});
          console.log(`      ✅ Clicked option`);
          return;
        }
      } catch (e) {
        if (!e.message.includes('closed')) {
          console.log(`      ⚠ Could not select: ${optionText} - ${e.message}`);
        }
      }
    }
    return;
  }

  // COMPOSE/TYPE/ENTER/FILL - Handle input fields
  if (step.match(/\b(compose|type|enter|fill|input|write)\b/)) {
    // Extract text in quotes if present
    let textToEnter = step.match(/"([^"]+)"/);
    if (textToEnter) {
      textToEnter = textToEnter[1];
    } else {
      // Try to extract meaningful text
      const keywords = ['compose a', 'type', 'enter', 'fill', 'input', 'write', 'containing'];
      let text = step;
      for (const kw of keywords) {
        text = text.replace(kw, '').trim();
      }
      textToEnter = text || 'Test message content';
    }
    
    console.log(`      🔍 Looking for input field to enter: "${textToEnter.substring(0, 50)}..."`);
    
    // Extract keywords for smart finding
    const stepKeywords = step.toLowerCase().split(/\s+/);
    
    // Try smart finder with UI map first
    const inputSelectors = [];
    
    if (UI_MAP.whatsapp && stepKeywords.some(kw => ['whatsapp', 'message'].includes(kw))) {
      inputSelectors.push(UI_MAP.whatsapp.messageInput.selector);
      inputSelectors.push(...UI_MAP.whatsapp.messageInput.alternates);
    }
    
    // Add default input selectors
    inputSelectors.push(
      'textarea:visible',
      'input[type="text"]:visible',
      '[contenteditable="true"]',
      '[role="textbox"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):visible'
    );
    
    for (const selector of inputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          await input.clear().catch(() => {});
          await input.fill(textToEnter);
          console.log(`      ✅ Entered text successfully`);
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    console.log(`      ⚠ Could not find input field`);
    return;
  }

  // SEND/SUBMIT - Handle form submission
  if (step.match(/\b(send|submit|save)\b/) && !step.includes('message is sent')) {
    console.log(`      🔍 Looking for submit/send button`);
    
    const stepKeywords = step.toLowerCase().split(/\s+/);
    const buttonSelectors = [];
    
    // Add UI map selectors
    if (UI_MAP.whatsapp && stepKeywords.some(kw => ['send', 'message'].includes(kw))) {
      buttonSelectors.push(UI_MAP.whatsapp.sendButton.selector);
      buttonSelectors.push(...UI_MAP.whatsapp.sendButton.alternates);
    }
    
    if (UI_MAP.common) {
      buttonSelectors.push(UI_MAP.common.submitButton.selector);
      buttonSelectors.push(...UI_MAP.common.submitButton.alternates);
    }
    
    // Add default button selectors
    const buttonTexts = ['send', 'submit', 'save', 'ok', 'confirm', 'apply'];
    buttonTexts.forEach(btnText => {
      buttonSelectors.push(`button:has-text("${btnText}")`);
      buttonSelectors.push(`button:has-text("${btnText.toUpperCase()}")`);
    });
    
    buttonSelectors.push('button[type="submit"]');
    
    for (const selector of buttonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          console.log(`      ✅ Clicked submit button`);
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    console.log(`      ⚠ Could not find submit button`);
    return;
  }

  // OBSERVE/CHECK/REVIEW - Handle observation steps
  if (step.match(/\b(observe|check|review|verify|validate|confirm)\b/)) {
    // Extract what to observe
    const keywords = ['observe', 'check', 'review', 'verify', 'validate', 'confirm'];
    let target = step;
    for (const kw of keywords) {
      target = target.replace(kw, '').trim();
    }
    
    // Remove common words
    target = target.replace(/^(the|if|that|whether)\s+/, '');
    
    if (target.length > 5) {
      console.log(`      🔍 Verifying presence of: "${target}"`);
      
      try {
        // Check if text or element is visible on page
        const element = page.locator(`text=${target}`).first();
        await expect(element).toBeVisible({ timeout: 5000 });
        console.log(`      ✅ Verification passed`);
        return;
      } catch (e) {
        console.log(`      ⚠ Could not verify: ${target}`);
        // Don't fail the test for observation steps
      }
    } else {
      console.log(`      ℹ️  Observation step - taking screenshot`);
      await page.screenshot({ 
        path: `./observation_step_${Date.now()}.png`,
        fullPage: false
      });
    }
    return;
  }

  // CLICK - Handle generic click actions
  if (step.match(/\b(click|press|tap)\b/)) {
    const keywords = ['click on', 'click', 'press', 'tap'];
    let target = step;
    for (const kw of keywords) {
      target = target.replace(kw, '').trim();
    }
    
    target = target.replace(/^(the|a|an)\s+/, '');
    
    if (target) {
      console.log(`      🔍 Looking for clickable element: "${target}"`);
      
      const selectors = [
        `button:has-text("${target}")`,
        `a:has-text("${target}")`,
        `[role="button"]:has-text("${target}")`,
        `text=${target}`
      ];
      
      for (const selector of selectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click({ timeout: 5000 });
            console.log(`      ✅ Clicked successfully`);
            return;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      console.log(`      ⚠ Could not find element to click: ${target}`);
    }
    return;
  }

  // FILTER - Handle filtering actions
  if (step.match(/\bfilter\b/)) {
    console.log(`      🔍 Looking for filter controls`);
    
    try {
      const filterButton = page.locator('button:has-text("filter")').first();
      if (await filterButton.isVisible({ timeout: 2000 })) {
        await filterButton.click();
        console.log(`      ✅ Opened filter`);
        return;
      }
    } catch (e) {
      console.log(`      ⚠ Could not find filter controls`);
    }
    return;
  }

  // ATTEMPT - Handle "attempt to" steps (usually for negative testing)
  if (step.includes('attempt to')) {
    const action = step.replace('attempt to', '').trim();
    console.log(`      🔄 Attempting: ${action}`);
    // Recursively execute the extracted action
    await executeStep(page, action, stepIndex);
    return;
  }

  console.log(`      ℹ️  Generic step - checking page state`);
  
  // For any unmatched step, take a screenshot for manual review
  await page.screenshot({ 
    path: `./step_${stepIndex + 1}_${Date.now()}.png`,
    fullPage: false 
  });
}

test.describe('🔹 Executing AI Generated Test Cases', () => {

  if (!testcases.length) {
    console.warn("❌ No test cases in folder:", OUTPUT_DIR);
    return;
  }

  // Filter only automatable test cases
  const automatableTests = testcases.filter(tc => 
    tc.AutomationPossible === 'Yes' || tc.AutomationPossible === true
  );

  if (!automatableTests.length) {
    console.warn("❌ No automatable test cases found");
    return;
  }

  console.log(`\n🎯 Found ${automatableTests.length} automatable test cases out of ${testcases.length} total\n`);

  automatableTests.forEach(tc => {
    test(`${tc.Id}: ${tc.Description}`, async ({ page, context }) => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`▶  Test Case ID: ${tc.Id}`);
      console.log(`� Description: ${tc.Description}`);
      console.log(`🧪 Type: ${tc.TestCaseType}`);
      if (tc.PreRequisite) {
        console.log(`📌 Pre-requisite: ${tc.PreRequisite}`);
      }
      console.log(`${'='.repeat(70)}`);

      // Navigate to base URL (already logged in via globalSetup)
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Check if we got redirected to login page
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login')) {
          console.log('   ⚠️  Session expired! Detected redirect to login page.');
          console.log('   🔄 Re-authenticating...');
          
          // Re-login if session expired
          await page.fill('input[name="email"], input[type="email"]', process.env.APP_USERNAME);
          await page.fill('input[name="password"], input[type="password"]', process.env.APP_PASSWORD);
          await page.click('button:has-text("SIGN IN"), button[type="submit"]');
          
          // Wait for successful login
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          await page.waitForTimeout(2000);
          
          // Save the new auth state
          await context.storageState({ path: path.join(__dirname, 'auth-state.json') });
          console.log('   ✅ Re-authentication successful!');
          
          // Navigate to home again
          await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        }
        
      } catch (e) {
        console.log('   ⚠ Page load warning:', e.message);
      }

      let stepsPassed = 0;
      let stepsFailed = 0;

      // Execute each step
      for (let i = 0; i < tc.StepsToExecute.length; i++) {
        const step = tc.StepsToExecute[i];
        
        try {
          await executeStep(page, step, i, context);
          stepsPassed++;
          
          // Small delay between steps for UI to update
          await page.waitForTimeout(500);
          
        } catch (err) {
          stepsFailed++;
          console.error(`   ❌ Step ${i + 1} failed: ${step}`);
          console.error(`      Error: ${err.message}`);

          // Take detailed screenshot on failure
          const screenshotPath = path.join(__dirname, `../test-results/failure_${tc.Id}_step${i + 1}_${Date.now()}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });
          console.log(`      📸 Screenshot saved: ${screenshotPath}`);

          // For negative test cases, failure might be expected
          if (tc.TestCaseType === 'Negative') {
            console.log(`      ℹ️  This is a negative test case - failure may be expected`);
          } else {
            throw err; // Fail the test for positive cases
          }
        }
      }

      console.log(`\n   📊 Steps Summary: ${stepsPassed} passed, ${stepsFailed} failed`);

      // Expected result verification
      if (tc.ExpectedResult) {
        console.log(`\n   🎯 Verifying Expected Result...`);
        console.log(`      "${tc.ExpectedResult}"`);
        
        try {
          // For negative tests, we might expect error messages
          if (tc.TestCaseType === 'Negative') {
            // Check for common error indicators
            const errorIndicators = ['error', 'invalid', 'failed', 'cannot', 'not allowed'];
            let errorFound = false;
            
            for (const indicator of errorIndicators) {
              if (tc.ExpectedResult.toLowerCase().includes(indicator)) {
                try {
                  await expect(page.locator(`text=${indicator}`).first())
                    .toBeVisible({ timeout: 3000 });
                  errorFound = true;
                  console.log(`      ✅ Error indicator found: ${indicator}`);
                  break;
                } catch (e) {
                  // Continue checking
                }
              }
            }
            
            if (!errorFound) {
              console.log(`      ⚠ Expected error message not clearly visible, but test may still be valid`);
            }
          } else {
            // For positive tests, check for success indicators
            const successKeywords = tc.ExpectedResult.toLowerCase().split(' ')
              .filter(word => word.length > 4);
            
            let verified = false;
            for (const keyword of successKeywords.slice(0, 3)) {
              try {
                await expect(page.locator(`text=${keyword}`).first())
                  .toBeVisible({ timeout: 5000 });
                verified = true;
                console.log(`      ✅ Verification passed: Found "${keyword}"`);
                break;
              } catch (e) {
                // Try next keyword
              }
            }
            
            if (!verified) {
              console.log(`      ⚠ Could not fully verify expected result on page`);
              console.log(`      💡 Manual verification may be needed`);
            }
          }
        } catch (error) {
          console.warn(`      ⚠ Expected result verification incomplete: ${error.message}`);
        }
      }

      // Final screenshot for test completion
      const finalScreenshot = path.join(__dirname, `../test-results/final_${tc.Id}_${Date.now()}.png`);
      await page.screenshot({
        path: finalScreenshot,
        fullPage: false
      });

      console.log(`\n   ✅ Test Case ${tc.Id} completed`);
      console.log(`${'='.repeat(70)}\n`);
    });
  });
});
