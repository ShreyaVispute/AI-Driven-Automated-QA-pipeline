# AI-Powered Test Automation Framework

**Author:** Shreya Vispute and Sanket Sahu
**Version:** 1.0.0  
**Last Updated:** November 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Usage](#usage)
8. [Project Structure](#project-structure)
9. [Pipeline Workflow](#pipeline-workflow)
10. [Test Execution](#test-execution)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)
13. [Contributing](#contributing)
14. [License](#license)

---

## 🎯 Overview

This framework provides an **end-to-end AI-powered test automation pipeline** that:
- Fetches user stories from Jira
- Uses OpenAI GPT to automatically generate comprehensive test cases
- Converts test cases to multiple formats (JSON, TXT)
- Executes automated browser tests using Playwright
- Generates detailed HTML reports with screenshots and traces

**Key Innovation:** Eliminates manual test case writing by leveraging AI to generate Positive, Negative, and Edge test scenarios directly from Jira stories.

---

## ✨ Features

### 🤖 AI-Powered Test Generation
- Automatic test case generation from Jira stories using GPT-4
- Generates Positive, Negative, and Edge test cases
- Intelligent test classification (automatable vs manual)
- Natural language test steps

### 🎭 Intelligent Browser Automation
- Playwright-based cross-browser testing
- Natural language step interpretation
- Smart element detection with fuzzy matching
- Automatic session management and re-authentication
- Self-healing selectors

### 📊 Comprehensive Reporting
- HTML test reports with filtering
- Screenshot capture on failures
- Video recording (optional)
- Execution traces for debugging
- Step-by-step execution logs

### 🔄 Complete CI/CD Pipeline
- Jira → AI → Test Execution workflow
- Email integration for test results
- Configurable test execution modes
- Parallel/sequential test execution

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JIRA PROJECT                             │
│                    (User Stories Source)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               STEP 1: Fetch Jira Stories                        │
│                  (fetchJiraStories.js)                          │
│  • Connect to Jira REST API                                     │
│  • Fetch stories with JQL query                                 │
│  • Extract key, summary, description, assignee                  │
│  • Output: jira_stories.txt, assignee_map.json                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           STEP 2: Generate Test Cases with AI                   │
│                  (generateTestcases.js)                         │
│  • Parse Jira stories                                           │
│  • Send to OpenAI GPT-4 API                                     │
│  • Generate Positive/Negative/Edge test cases                   │
│  • Output: openai_outputs/JIRA-KEY_testcases.json              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 3: Convert to Email Format                        │
│                  (convertJsonToTxt.js)                          │
│  • Read JSON test cases                                         │
│  • Format as human-readable text                                │
│  • Output: email_outputs/JIRA-KEY_testcases.txt                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 4: Execute Automated Tests                        │
│        (tests/runGeneratedTests.spec.js)                        │
│  • Load JSON test cases                                         │
│  • Parse natural language steps                                 │
│  • Execute browser automation with Playwright                   │
│  • Capture screenshots, videos, traces                          │
│  • Generate HTML report                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### Required Software
- **Node.js** v16.0.0 or higher
- **npm** v7.0.0 or higher
- **Git** (for version control)

### Required Accounts
- **Jira Account** with API access
- **OpenAI API Key** (GPT-4 access recommended)
- **Target Application** credentials (CPaaS or your app)

### System Requirements
- **OS:** Windows 10+, macOS 10.15+, or Linux
- **RAM:** Minimum 4GB (8GB recommended)
- **Disk Space:** 2GB free space
- **Network:** Internet connection for API calls

---

## 🚀 Installation

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd Jira
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- `@playwright/test` - Browser automation
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- `nodemailer` - Email functionality

### Step 3: Install Playwright Browsers
```bash
npx playwright install chromium
```

---

## ⚙️ Configuration

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_api_token_here
JIRA_PROJECT_KEY=PROJECTKEY
JIRA_MAX_STORIES=10

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4-mini
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=2000

# Application Under Test
BASE_URL=https://your-app.com/auth/login
APP_USERNAME=test.user@company.com
APP_PASSWORD=your_secure_password

# Playwright Configuration
PLAYWRIGHT_WORKERS=1

# File Paths (Optional)
JIRA_STORIES_FILE=jira_stories.txt
JIRA_ASSIGNEE_MAP_FILE=assignee_map.json
INPUT_FILE=jira_stories.txt
OUTPUT_DIR=openai_outputs
```

### 2. Obtain API Credentials

#### Jira API Token
1. Log in to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy the generated token
4. Paste into `.env` as `JIRA_API_TOKEN`

#### OpenAI API Key
1. Sign up at https://platform.openai.com/
2. Navigate to **API Keys** section
3. Click **Create new secret key**
4. Copy the key (starts with `sk-`)
5. Paste into `.env` as `OPENAI_API_KEY`

### 3. Update UI Elements Map

Edit `ui-elements-map.json` to match your application's UI:

```json
{
  "whatsapp": {
    "messagingInterface": {
      "selector": "text=WhatsApp",
      "alternates": ["a:has-text('Messaging')", "[href*='whatsapp']"]
    },
    "messageInput": {
      "selector": "textarea, [contenteditable='true']",
      "alternates": ["[placeholder*='message']", "#messageBox"]
    },
    "sendButton": {
      "selector": "button:has-text('Send')",
      "alternates": ["button[type='submit']", ".send-btn"]
    }
  }
}
```

---

## 📖 Usage

### Running the Complete Pipeline

Execute all steps (Jira → AI → Test Execution):

```bash
npm start
```

This will:
1. Fetch stories from Jira
2. Generate test cases with AI
3. Convert to TXT format
4. Run Playwright automation
5. Generate HTML report

### Running Individual Steps

#### 1. Fetch Jira Stories Only
```bash
node fetchJiraStories.js
```
Output: `jira_stories.txt`, `assignee_map.json`

#### 2. Generate Test Cases Only
```bash
node generateTestcases.js
```
Input: `jira_stories.txt`  
Output: `openai_outputs/[JIRA-KEY]_testcases.json`

#### 3. Convert to TXT Format
```bash
node convertJsonToTxt.js
```
Input: `openai_outputs/*.json`  
Output: `email_outputs/*.txt`

#### 4. Run Playwright Tests Only
```bash
npx playwright test
```

#### 5. View Test Report
```bash
npx playwright show-report
```

### Advanced Options

#### Run Specific Tests
```bash
npx playwright test --grep "CPAAS-44096"
```

#### Run in Headed Mode (visible browser)
```bash
npx playwright test --headed
```

#### Debug Mode
```bash
npx playwright test --debug
```

#### Run with Multiple Workers
```bash
npx playwright test --workers=4
```

---

## 📁 Project Structure

```
Jira/
│
├── .env                          # Environment variables (not in git)
├── package.json                  # Project dependencies
├── playwright.config.js          # Playwright configuration
├── main.js                       # Main pipeline orchestrator
│
├── fetchJiraStories.js          # Jira API integration
├── generateTestcases.js         # OpenAI test generation
├── convertJsonToTxt.js          # JSON to TXT converter
├── sendEmailsFromTxt.js         # Email sender (optional)
│
├── ui-elements-map.json         # UI selector mappings
├── assignee_map.json            # Jira assignee emails
├── jira_stories.txt             # Fetched Jira stories
│
├── tests/
│   ├── global-setup.js          # One-time login setup
│   ├── runGeneratedTests.spec.js # Main test execution engine
│   ├── auth-state.json          # Saved authentication state
│   ├── login-success.png        # Login verification screenshot
│
├── openai_outputs/              # AI-generated test cases (JSON)
│   ├── CPAAS-44096_testcases.json
│   ├── CPAAS-44100_testcases.json
│   └── [JIRA-KEY]_testcases_raw.txt
│
├── email_outputs/               # Email-friendly test cases (TXT)
│   ├── CPAAS-44096_testcases.txt
│   └── CPAAS-44100_testcases.txt
│
├── test-results/                # Test execution artifacts
│   ├── failure_[TestID]_[timestamp].png
│   └── final_[TestID]_[timestamp].png
│
├── playwright-report/           # HTML test report
│   └── index.html
│
└── README.md                    # This file
```

---

## 🔄 Pipeline Workflow

### Phase 1: Jira Story Fetching

**Script:** `fetchJiraStories.js`

**Process:**
1. Authenticates with Jira REST API using Basic Auth
2. Executes JQL query: `project = [KEY] AND issuetype = Story`
3. Extracts story metadata (key, summary, description)
4. Fetches assignee details from user API
5. Generates email addresses from assignee names
6. Writes to `jira_stories.txt` and `assignee_map.json`

**Output Format (jira_stories.txt):**
```
Story 1:
Key: CPAAS-44096
Assignee: John Doe
AssigneeEmail: john.doe@company.com
Summary: Implement WhatsApp messaging feature

Description:
As a user, I want to send WhatsApp messages through the platform...

========================================
```

### Phase 2: AI Test Case Generation

**Script:** `generateTestcases.js`

**Process:**
1. Parses `jira_stories.txt` into story objects
2. For each story, constructs an AI prompt:
   ```
   Generate test cases for:
   Story: CPAAS-44096
   Summary: [summary]
   Description: [description]
   
   Return JSON with:
   - Id, Description, PreRequisite
   - StepsToExecute[], ExpectedResult
   - TestCaseType (Positive/Negative/Edge)
   - AutomationPossible (Yes/No)
   ```
3. Sends to OpenAI GPT-4 API
4. Parses JSON response
5. Saves to `openai_outputs/[KEY]_testcases.json`
6. Saves raw AI output to `[KEY]_testcases_raw.txt`

**Output Format (JSON):**
```json
[
  {
    "Id": "CPAAS-44096-TC01",
    "Description": "Verify successful WhatsApp message sending",
    "PreRequisite": "User has valid WhatsApp channel",
    "StepsToExecute": [
      "Login to the application",
      "Navigate to WhatsApp messaging interface",
      "Compose a valid message",
      "Send the message"
    ],
    "ExpectedResult": "Message sent successfully",
    "TestCaseType": "Positive",
    "AutomationPossible": "Yes"
  }
]
```

### Phase 3: Format Conversion

**Script:** `convertJsonToTxt.js`

**Process:**
1. Reads all `*_testcases.json` from `openai_outputs/`
2. Formats each test case as human-readable text
3. Writes to `email_outputs/[KEY]_testcases.txt`

**Output Format (TXT):**
```
Test Case ID: CPAAS-44096-TC01
Description: Verify successful WhatsApp message sending
Type: Positive
Automation: Yes

Pre-requisite:
- User has valid WhatsApp channel

Steps:
1. Login to the application
2. Navigate to WhatsApp messaging interface
3. Compose a valid message
4. Send the message

Expected Result:
Message sent successfully

---
```

### Phase 4: Test Execution

**Script:** `tests/runGeneratedTests.spec.js`

**Process:**

#### 4.1 Global Setup
- Launches browser (Chromium)
- Navigates to login page
- Fills credentials from `.env`
- Waits for successful login
- Saves authentication state to `auth-state.json`
- Takes login success screenshot

#### 4.2 Test Case Loading
- Reads all `*_testcases.json` from `openai_outputs/`
- Filters for `AutomationPossible: "Yes"`
- Creates one Playwright test per test case

#### 4.3 Test Execution
For each test case:

1. **Navigate to Application**
   - Loads saved authentication state
   - Goes to base URL
   - Checks if session is still valid
   - Re-authenticates if expired

2. **Execute Steps Sequentially**
   - Parses each natural language step
   - Detects action type (navigate/input/click/verify)
   - Finds UI elements using:
     - UI elements map
     - Fuzzy text matching (Levenshtein distance)
     - Generic selectors as fallback
   - Executes action
   - Captures intermediate screenshots
   - Logs success/failure

3. **Verify Expected Result**
   - Extracts keywords from expected result
   - Searches page content for keywords
   - Validates success/error indicators
   - Logs verification status

4. **Capture Artifacts**
   - Screenshots on step failures
   - Final test screenshot
   - Video recording (if enabled)
   - Execution trace (if enabled)

#### 4.4 Natural Language Step Interpreter

The test engine understands these patterns:

| Pattern | Action | Example |
|---------|--------|---------|
| `navigate to`, `go to`, `open` | Navigation | "Navigate to dashboard" |
| `select`, `choose`, `pick` | Dropdown selection | "Select WhatsApp channel" |
| `enter`, `type`, `compose`, `fill` | Input text | "Enter message text" |
| `send`, `submit`, `click` | Button click | "Send the message" |
| `verify`, `check`, `observe` | Verification | "Verify message sent" |
| `login`, `sign in` | Authentication | "Login to application" |

**Smart Element Detection:**
1. Tries exact text match
2. Tries UI map selectors
3. Calculates fuzzy match (70% similarity threshold)
4. Falls back to generic selectors
5. Logs warning if not found (doesn't fail test)

---

## 🎯 Test Execution

### Configuration Options

Edit `playwright.config.js` to customize:

```javascript
module.exports = {
  timeout: 60000,              // Test timeout (60 seconds)
  expect: { timeout: 5000 },   // Assertion timeout
  workers: 1,                  // Number of parallel workers
  retries: 0,                  // Retry failed tests
  fullyParallel: false,        // Sequential execution
  
  use: {
    baseURL: 'https://your-app.com',
    storageState: 'tests/auth-state.json',
    trace: 'off',              // 'on', 'off', 'retain-on-failure'
    video: 'off',              // 'on', 'off', 'retain-on-failure'
    screenshot: 'only-on-failure',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 10000,
    navigationTimeout: 20000
  }
}
```

### Performance Tuning

#### Fast Mode (Current)
- Workers: 1 (sequential)
- Timeout: 60 seconds
- Trace: off
- Video: off
- **Runtime:** ~7 minutes for 18 tests

#### Parallel Mode
```javascript
workers: 4,
fullyParallel: true
```
- **Expected runtime:** ~2.5 minutes for 18 tests
- **Caution:** May cause session conflicts

#### Debug Mode
```javascript
trace: 'on',
video: 'on',
screenshot: 'on'
```
- Full debugging artifacts
- Slower execution
- Larger disk usage

### Session Management

The framework includes intelligent session management:

```javascript
// Checks session every 3 steps
if (stepIndex % 3 === 0) {
  await ensureLoggedIn(page, context);
}

// Auto-detects login page redirect
if (page.url().includes('/auth/login')) {
  await reAuthenticate();
}
```

**Features:**
- Detects session expiry
- Auto-reauthenticates
- Saves new auth state
- Continues test execution
- No test failures due to session timeouts

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "OpenAI API Error: Unexpected end of JSON input"

**Cause:** GPT response is incomplete or invalid JSON

**Solution:**
```bash
# Check raw output file
cat openai_outputs/[JIRA-KEY]_testcases_raw.txt

# Increase max tokens in .env
OPENAI_MAX_TOKENS=3000

# Or try different model
OPENAI_MODEL=gpt-4
```

#### 2. "Jira API Error 401 Unauthorized"

**Cause:** Invalid Jira credentials

**Solution:**
1. Verify email in `.env` matches Jira login
2. Regenerate API token at https://id.atlassian.com/manage-profile/security/api-tokens
3. Check `JIRA_BASE_URL` format: `https://company.atlassian.net` (no trailing slash)

#### 3. "net::ERR_CERT_AUTHORITY_INVALID"

**Cause:** SSL certificate issues on test site

**Solution:**
```javascript
// In playwright.config.js, add:
use: {
  ignoreHTTPSErrors: true,
}
```

#### 4. "Target page, context or browser has been closed"

**Cause:** Browser crashes or timeouts

**Solution:**
1. Increase timeout:
   ```javascript
   timeout: 120000  // 2 minutes
   ```
2. Reduce parallel workers:
   ```javascript
   workers: 1
   ```
3. Check browser logs in test output

#### 5. "Could not find navigation element"

**Cause:** UI selectors in `ui-elements-map.json` don't match actual page

**Solution:**
1. Inspect element in browser DevTools
2. Update `ui-elements-map.json` with correct selectors
3. Add multiple alternate selectors:
   ```json
   "alternates": [
     "button.send",
     "[data-testid='send-btn']",
     "button:has-text('Submit')"
   ]
   ```

#### 6. All Tests Pass But Nothing Actually Works

**Cause:** Framework is too lenient (soft failures only)

**Current Behavior:**
- Element not found → logs warning, continues
- Verification fails → logs warning, marks passed
- Steps skipped → test still passes

**To Enable Strict Mode:**
Currently not implemented. Tests use soft assertions to avoid false negatives.

### Debug Commands

```bash
# Run single test file
npx playwright test tests/runGeneratedTests.spec.js

# Run specific test by name
npx playwright test --grep "CPAAS-44096-TC01"

# Debug mode (step through)
npx playwright test --debug

# Headed mode (visible browser)
npx playwright test --headed

# View trace
npx playwright show-trace test-results/[test-name]/trace.zip

# Check Playwright version
npx playwright --version

# Update Playwright
npm install @playwright/test@latest
npx playwright install
```

---

## 📚 Best Practices

### Writing Better Jira Stories for AI

**Good Story Example:**
```
Title: Add WhatsApp message scheduling

Description:
As a marketing manager,
I want to schedule WhatsApp messages for future delivery,
So that I can plan campaigns in advance.

Acceptance Criteria:
- User can select date and time for message delivery
- System validates selected time is in future
- Scheduled messages appear in dashboard
- User can edit or cancel scheduled messages
```

**Why it works:**
- Clear user role and goal
- Specific acceptance criteria
- Testable requirements
- AI generates 8-10 relevant test cases

**Poor Story Example:**
```
Title: Fix messaging

Description:
Messaging doesn't work properly. Need to fix it.
```

**Why it fails:**
- Vague requirements
- No acceptance criteria
- AI generates generic/irrelevant tests

### UI Elements Map Guidelines

```json
{
  "feature": {
    "elementName": {
      "selector": "primary-selector",
      "alternates": [
        "fallback-1",
        "fallback-2",
        "fallback-3"
      ]
    }
  }
}
```

**Best Practices:**
1. Use stable selectors (data-testid > class > text)
2. Provide 3-5 alternates per element
3. Test selectors in browser DevTools first
4. Update map when UI changes
5. Use semantic naming

### Test Data Management

**Recommended structure:**
```
tests/
  fixtures/
    test-data.json       # Static test data
    users.json          # Test user accounts
  helpers/
    data-generator.js   # Dynamic data creation
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: AI Test Automation

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run pipeline
        env:
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm start
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🤝 Contributing

### Development Setup

```bash
# Fork the repository
git clone <your-fork>
cd Jira

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes
# ...

# Test your changes
npm start

# Commit and push
git add .
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Create Pull Request
```

### Code Style

This project uses:
- **ESLint** for JavaScript linting
- **Prettier** for code formatting
- **JSDoc** for documentation

```bash
# Format code
npm run format

# Lint
npm run lint
```

### Adding New Features

#### New Test Step Type

Edit `tests/runGeneratedTests.spec.js`:

```javascript
// Add new pattern matching
if (step.match(/\b(download|save|export)\b/)) {
  // Your download logic
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download")');
  const download = await downloadPromise;
  await download.saveAs(`./downloads/${download.suggestedFilename()}`);
  return;
}
```

#### New UI Element Category

Edit `ui-elements-map.json`:

```json
{
  "newFeature": {
    "importButton": {
      "selector": "button:has-text('Import')",
      "alternates": ["#import-btn", "[data-action='import']"]
    }
  }
}
```

---

## 📄 License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Shreya Vispute

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support

For questions or issues:

- **Author:** Shreya Vispute
- **GitHub Issues:** Create an issue in the repository
- **Documentation:** Refer to this README and inline code comments

---

## 🎓 Learning Resources

### Playwright
- Official Docs: https://playwright.dev/
- API Reference: https://playwright.dev/docs/api/class-playwright
- Best Practices: https://playwright.dev/docs/best-practices

### OpenAI API
- Platform Docs: https://platform.openai.com/docs
- GPT-4 Guide: https://platform.openai.com/docs/guides/gpt
- Rate Limits: https://platform.openai.com/docs/guides/rate-limits

### Jira REST API
- API Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- Authentication: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/

---

## 🚀 Roadmap

Future enhancements planned:
- [ ] Slack notifications for test results
- [ ] Dashboard for test analytics
- [ ] Support for Azure DevOps stories
- [ ] Visual regression testing
- [ ] API testing integration
- [ ] Mobile app testing (iOS/Android)
- [ ] Custom AI model fine-tuning
- [ ] Test data generator
- [ ] Parallel test execution optimization
- [ ] Docker containerization

---

## 🙏 Acknowledgments

This project uses:
- **Playwright** by Microsoft for browser automation
- **OpenAI GPT-4** for AI test generation
- **Jira REST API** by Atlassian for story management
- **Node.js** ecosystem packages

Special thanks to all contributors and the open-source community.

---

**Last Updated:** November 28, 2025  
**Author:** Shreya Vispute  
**Version:** 1.0.0
