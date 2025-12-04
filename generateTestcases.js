// generateTestcases.js
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

// ----------- Configurable Settings -----------
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiApiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  inputFile: process.env.INPUT_FILE || 'jira_stories.txt',
  outputDir: process.env.OUTPUT_DIR || 'openai_outputs',
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS || 1200),
  temperature: Number(process.env.OPENAI_TEMPERATURE || 0.3),
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS || 2000),
  systemRole: process.env.OPENAI_SYSTEM_ROLE || 'You are a senior QA automation architect.'
};

// Validate mandatory config
if (!config.openaiApiKey) {
  console.error('❌ Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

const agent = new https.Agent({ rejectUnauthorized: false });

// ---------- Helpers ----------
function parseStories(text) {
  const parts = text.split(/={10,}\s*/g).map(p => p.trim()).filter(Boolean);
  return parts.map(part => {
    const keyMatch = part.match(/Key:\s*(.+)/i);
    const summaryMatch = part.match(/Summary:\s*([\s\S]*?)(?:\n\n|\nDescription:)/i);
    const descIndex = part.indexOf('Description:');
    const description = descIndex !== -1 ? part.substring(descIndex + 'Description:'.length).trim() : '';
    return {
      key: keyMatch ? keyMatch[1].trim() : 'Unknown',
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      description
    };
  });
}

async function callOpenAI(prompt) {
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: config.systemRole },
      { role: 'user', content: prompt }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };
  const resp = await axios.post(config.openaiApiUrl, body, {
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    httpsAgent: agent,
    timeout: 120000
  });
  return resp.data?.choices?.[0]?.message?.content || '';
}

function buildPrompt(story) {
  return `Generate detailed Positive, Negative, and Edge/Boundary test cases for the following Jira user story. 
Return ONLY a JSON array of test case objects, no prose, no markdown, no explanation. 
Each object must have: 
Id, Description, PreRequisite, StepsToExecute, ExpectedResult, TestCaseType (Positive|Negative|Edge), AutomationPossible (Yes|No).

User Story Key: ${story.key}
Summary: ${story.summary}

Description:
${story.description}`;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    console.error('⚠️ Could not create directory:', dir, e.message);
  }
}

// ---------- Exported function ----------
async function generateTestcasesFromStories(customConfig = {}) {
  const cfg = { ...config, ...customConfig };
  console.log(`📁 Using input: ${cfg.inputFile}`);
  console.log(`📂 Output directory: ${cfg.outputDir}`);
  console.log(`🧠 Model: ${cfg.model}\n`);

  const raw = await fs.readFile(cfg.inputFile, 'utf8');
  const stories = parseStories(raw);

  await ensureDir(cfg.outputDir);

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const prompt = buildPrompt(story);
    console.log(`🧠 Generating test cases for ${story.key} (${i + 1}/${stories.length})`);

    let aiText;
    let parsed = null;

    try {
      aiText = await callOpenAI(prompt);
      parsed = JSON.parse(aiText);
    } catch (err) {
      aiText = aiText || `ERROR: ${err.message}`;
      console.error('❌ OpenAI / JSON parse error:', err.message);
    }

    const outFile = path.join(cfg.outputDir, `${story.key}_testcases.json`);
    if (parsed) {
      await fs.writeFile(outFile, JSON.stringify(parsed, null, 2), 'utf8');
      console.log('✅ Saved', outFile);
    } else {
      const rawFile = path.join(cfg.outputDir, `${story.key}_testcases_raw.txt`);
      await fs.writeFile(rawFile, aiText, 'utf8');
      console.log('⚠️ Saved raw output to', rawFile);
    }

    if (i < stories.length - 1) await new Promise(r => setTimeout(r, cfg.requestDelayMs));
  }
}

module.exports = { generateTestcasesFromStories };
