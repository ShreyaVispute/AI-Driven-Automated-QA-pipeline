/**
 * Main pipeline: Jira → JSON Testcases → TXT Email Format → Playwright
 */
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const { convertJsonToTxt } = require("./convertJsonToTxt"); // Utility to convert JSON → TXT
const path = require("path");
const fs = require("fs").promises;

dotenv.config();

// 1️⃣ Fetch stories, generate JSON testcases
async function fetchStories() {
  console.log("📥 Fetching Jira stories...");
  const { fetchJiraStories } = require("./fetchJiraStories.js");
  await fetchJiraStories();
  console.log("✅ Jira stories fetched.\n");
}

async function generateTestcases() {
  console.log("🧠 Generating JSON test cases...");
  const { generateTestcasesFromStories } = require("./generateTestcases.js");
  await generateTestcasesFromStories();
  console.log("✅ JSON test cases generated.\n");
}

// 2️⃣ Convert JSON → TXT (mail-like format)
async function convertTestcases() {
  console.log("✉️ Converting JSON test cases to TXT format...");
  convertJsonToTxt("openai_outputs", "email_outputs"); // input and output folders
  console.log("✅ TXT conversion complete.\n");
}

// 3️⃣ Optionally send emails from TXT files
async function sendGeneratedTests() {
  console.log("📤 Sending generated test cases via email (optional)...");
  const { sendEmailsFromTxt } = require("./sendEmailsFromTxt.js"); // optional utility
  if (fs.access) await sendEmailsFromTxt("email_outputs");
  console.log("✅ Emails sent.\n");
}

// 4️⃣ Run Playwright automation
async function runPlaywrightAutomation() {
  console.log("🎭 Starting Playwright automation...");
  try {
    execSync("npx playwright test", { stdio: "inherit" });
    console.log("✅ Playwright automation complete.\n");
  } catch (error) {
    console.error("❌ Playwright automation failed:", error.message);
  }
}

// Main pipeline
async function main() {
  console.log("🚀 Starting Jira → Testcases → Playwright pipeline...\n");
  const start = Date.now();

  try {
    await fetchStories();
    await generateTestcases();
    await convertTestcases();      // <— no AI, automatic JSON → TXT conversion
    //await sendGeneratedTests();    // optional email
    await runPlaywrightAutomation();
  } catch (err) {
    console.error("❌ Pipeline failed:", err);
  } finally {
    console.log(`🏁 Pipeline finished in ${(Date.now() - start) / 1000}s`);
  }
}

// Execute pipeline
main();
