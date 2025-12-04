const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Convert JSON test cases into a simplified TXT format with only specific fields.
 */
function convertJsonToTxt(customConfig = {}) {
  const config = {
    jsonFolder: process.env.OUTPUT_DIR || "openai_outputs",
    txtFolder: process.env.TXT_FOLDER || "email_outputs",
    separator: process.env.MAIL_SEPARATOR || "---",
    ...customConfig
  };

  if (!fs.existsSync(config.jsonFolder)) {
    console.error(`❌ JSON folder not found: ${config.jsonFolder}`);
    return;
  }
  if (!fs.existsSync(config.txtFolder)) fs.mkdirSync(config.txtFolder, { recursive: true });

  const files = fs.readdirSync(config.jsonFolder).filter(f => f.endsWith("_testcases.json"));
  if (files.length === 0) {
    console.warn(`⚠️ No *_testcases.json files found in ${config.jsonFolder}`);
    return;
  }

  files.forEach(file => {
    try {
      const filePath = path.join(config.jsonFolder, file);
      const testCases = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      const txtLines = testCases.map((tc, index) => {
        const id = tc.Id || `TC-${index + 1}`;
        const description = tc.Description || "No description available";
        const preReq = tc.PreRequisite || "None";
        const steps = Array.isArray(tc.StepsToExecute)
          ? tc.StepsToExecute.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
          : "No steps provided";
        const expected = tc.ExpectedResult || "Not specified";
        const automation = tc.AutomationPossible || "N/A";

        return [
          `Id: ${id}`,
          `Description: ${description}`,
          `PreRequisite: ${preReq}`,
          `StepsToExecute:\n${steps}`,
          `ExpectedResult: ${expected}`,
          `AutomationPossible: ${automation}`,
          config.separator
        ].join("\n");
      });

      const txtFileName = file.replace("_testcases.json", "_testcases.txt");
      fs.writeFileSync(path.join(config.txtFolder, txtFileName), txtLines.join("\n\n"));
      console.log(`✅ Converted ${file} → ${txtFileName}`);
    } catch (err) {
      console.error(`❌ Error converting ${file}:`, err.message);
    }
  });

  console.log(`📧 Conversion completed. TXT files saved in: ${config.txtFolder}`);
}

module.exports = { convertJsonToTxt };
