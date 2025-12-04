const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

class JiraAPI {
    constructor(
        baseUrl = process.env.JIRA_BASE_URL,
        email = process.env.JIRA_EMAIL,
        apiToken = process.env.JIRA_API_TOKEN,
        projectKey = process.env.JIRA_PROJECT_KEY
    ) {
        if (!baseUrl || !email || !apiToken || !projectKey) {
            throw new Error("❌ Missing required Jira configuration. Check your .env file.");
        }

        this.baseUrl = baseUrl;
        this.email = email;
        this.apiToken = apiToken;
        this.projectKey = projectKey;
        this.authHeader = this._generateAuthHeader();
    }

    _generateAuthHeader() {
        const authString = `${this.email}:${this.apiToken}`;
        const base64Auth = Buffer.from(authString).toString('base64');
        return {
            'Authorization': `Basic ${base64Auth}`,
            'Content-Type': 'application/json'
        };
    }

    async fetchUserByAccountId(accountId) {
        if (!accountId) return null;
        try {
            const encoded = encodeURIComponent(accountId);
            const url = `${this.baseUrl}/rest/api/3/user?accountId=${encoded}`;
            const resp = await axios.get(url, { headers: this.authHeader });
            return resp.data;
        } catch {
            return null;
        }
    }

    async fetchUserStories(maxResults = process.env.JIRA_MAX_STORIES || 10) {
        try {
            const endpoint = `${this.baseUrl}/rest/api/3/search/jql`;
            const jql = `project = ${this.projectKey} AND issuetype = Story`;

            const payload = {
                jql,
                maxResults: Number(maxResults),
                fields: ["summary", "description", "assignee"]
            };

            const response = await axios.post(endpoint, payload, { headers: this.authHeader });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching stories:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
}

function generateEmail(displayName) {
    if (!displayName || displayName === 'Unassigned') return '';
    
    // If the display name already contains a dot, just append domain
    if (displayName.includes('.')) {
        return `${displayName.toLowerCase()}@comviva.com`;
    }
    
    // Split the name and handle different word counts
    const nameParts = displayName.split(' ').filter(part => part.trim().length > 0);
    
    if (nameParts.length === 0) return '';
    
    let firstName, lastName;
    if (nameParts.length >= 3) {
        // For 3+ word names, use first and last word
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
    } else if (nameParts.length === 2) {
        // For 2 word names, use both
        [firstName, lastName] = nameParts;
    } else {
        // For single word, use it as both
        firstName = lastName = nameParts[0];
    }
    
    // Convert to lowercase and remove any special characters
    firstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
    lastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
    
    return `${firstName}.${lastName}@comviva.com`;
}

function extractTextFromDescription(description) {
    if (!description) return 'No description provided';
    if (typeof description === 'string') return description;

    if (description.content) {
        return description.content
            .map(block => {
                if (block.type === 'paragraph') {
                    return block.content?.map(item => item.text || '').join(' ') || '';
                }
                return '';
            })
            .filter(Boolean)
            .join('\n\n');
    }
    return 'Description format not supported';
}

// ✅ Exported main function
async function fetchJiraStories() {
    const storiesFile = process.env.JIRA_STORIES_FILE || "jira_stories.txt";
    const assigneeFile = process.env.JIRA_ASSIGNEE_MAP_FILE || "assignee_map.json";

    const jiraClient = new JiraAPI();

    const stories = await jiraClient.fetchUserStories();

    if (!stories || !stories.issues) {
        console.log("⚠️ No stories returned.");
        return;
    }

    const accountIds = new Set();
    stories.issues.forEach(issue => {
        const acc = issue.fields?.assignee?.accountId;
        if (acc) accountIds.add(acc);
    });

    const accountEmailMap = {};
    for (const accId of accountIds) {
        const user = await jiraClient.fetchUserByAccountId(accId);
        accountEmailMap[accId] = (user && (user.emailAddress || user.email)) || '';
    }

    const assigneeMap = {};
    const storiesText = stories.issues
        .map((issue, index) => {
            const description = extractTextFromDescription(issue.fields.description);
            const key = issue.key || 'Unknown';
            const assigneeName = issue.fields?.assignee?.displayName || 'Unassigned';
            const assigneeAccountId = issue.fields?.assignee?.accountId || null;
            const assigneeEmail = generateEmail(assigneeName);

            if (!assigneeMap[assigneeName]) assigneeMap[assigneeName] = assigneeEmail;

            return `Story ${index + 1}:\n` +
                   `Key: ${key}\n` +
                   `Assignee: ${assigneeName}\n` +
                   `AssigneeEmail: ${assigneeEmail}\n` +
                   `Summary: ${issue.fields.summary}\n\n` +
                   `Description:\n${description}\n\n` +
                   `========================================\n`;
        })
        .join('\n');

    await fs.writeFile(storiesFile, storiesText);
    await fs.writeFile(assigneeFile, JSON.stringify(assigneeMap, null, 2));

    console.log(`✅ Found ${stories.issues.length} stories`);
    console.log(`📄 Stories written to: ${storiesFile}`);
    console.log(`📁 Assignee map written to: ${assigneeFile}`);
}

module.exports = { fetchJiraStories };
