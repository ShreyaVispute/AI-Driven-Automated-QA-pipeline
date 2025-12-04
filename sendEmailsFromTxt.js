const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const STORIES_PATH = path.join(__dirname, "jira_stories.txt");
const ASSIGNEE_MAP_PATH = path.join(__dirname, "assignee_map.json");
const OUTPUT_DIR = path.join(__dirname, "email_outputs");

// Load assignee map
let assigneeMap = {};
if (fs.existsSync(ASSIGNEE_MAP_PATH)) {
  assigneeMap = JSON.parse(fs.readFileSync(ASSIGNEE_MAP_PATH, "utf8"));
}

// SMTP credentials
const EMAIL_USER = process.env.SMTP_USER;
const EMAIL_PASS = process.env.SMTP_PASS;
const FALLBACK_EMAIL = process.env.FALLBACK_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("❌ Missing SMTP_USER or SMTP_PASS in .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 30000,
});

/**
 * Parse jira_stories.txt to get story → assignee → email mapping
 */
function parseJiraStories() {
  if (!fs.existsSync(STORIES_PATH)) {
    console.error("❌ jira_stories.txt not found.");
    process.exit(1);
  }

  const text = fs.readFileSync(STORIES_PATH, "utf8");
  const blocks = text.split(/={5,}/); // Split by "======" line
  const storyData = {};

  blocks.forEach(block => {
    const keyMatch = block.match(/Key:\s*(.*)/);
    const assigneeMatch = block.match(/Assignee:\s*(.*)/);

    if (keyMatch) {
      const storyKey = keyMatch[1].trim();
      const assignee = assigneeMatch ? assigneeMatch[1].trim() : null;
      const assigneeEmail = assignee ? (assigneeMap[assignee] || FALLBACK_EMAIL) : FALLBACK_EMAIL;

      storyData[storyKey] = {
        assignee,
        email: assigneeEmail,
      };
    }
  });

  return storyData;
}

/**
 * Send email with attachments and optional custom subject
 */
async function sendEmail(storyKey, recipient, files, customSubject = null) {
  const attachments = files.map(file => ({
    filename: path.basename(file),
    path: file,
  }));

  const subject = customSubject || `AI-Generated Test Cases for ${storyKey}`;

  const mailOptions = {
    from: `"QA Automation Bot" <${EMAIL_USER}>`,
    to: recipient,
    subject: subject,
    text: `Hello,\n\nPlease find attached the AI-generated test cases for Jira story ${storyKey}.\n\nRegards,\nQA Automation Bot`,
    attachments,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Sent to ${recipient} | ${storyKey} | Subject: ${subject} | Attached: ${files.length} file(s)`);
}

/**
 * Main function: collects files and sends emails per story
 */
async function main() {
  console.log("🚀 Starting email sending process...\n");

  const storyData = parseJiraStories();

  // Collect files per story
  const files = fs.readdirSync(OUTPUT_DIR);
  const storyFiles = {};

  files.forEach(file => {
    const match = file.match(/(CPAAS-\d+)/i); // Adjust regex to match your story keys
    if (match) {
      const storyKey = match[1];
      if (!storyFiles[storyKey]) storyFiles[storyKey] = [];
      storyFiles[storyKey].push(path.join(OUTPUT_DIR, file));
    }
  });

  for (const storyKey in storyFiles) {
    const storyInfo = storyData[storyKey];

    if (!storyInfo) {
      console.warn(`⚠️ ${storyKey} not found in jira_stories.txt, skipping.`);
      continue;
    }

    if (!storyInfo.email) {
      console.warn(`⚠️ No email for ${storyKey} (Assignee: ${storyInfo.assignee}), skipping.`);
      continue;
    }

    // Extract the first line (Id) from the first TXT file for subject
    const firstFilePath = storyFiles[storyKey][0];
    let customSubject = null;
    try {
      const firstLine = fs.readFileSync(firstFilePath, "utf-8").split("\n")[0];
      if (firstLine.startsWith("Id:")) {
        const id = firstLine.replace("Id:", "").trim();
        customSubject = `AI-Generated Test Cases - ${storyKey} - ${id}`;
      }
    } catch (err) {
      console.warn(`⚠️ Could not read subject from ${firstFilePath}, using default subject.`);
    }

    await sendEmail(storyKey, storyInfo.email, storyFiles[storyKey], customSubject);
  }

  console.log("\n✅ All emails processed.");
}

// Export for use in other modules
module.exports = { sendEmailsFromTxt: main };

// Run directly if this file is executed
if (require.main === module) {
  main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
