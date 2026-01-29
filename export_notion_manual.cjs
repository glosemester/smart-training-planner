const https = require('https');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const NOTION_KEY = 'ntn_c8219009755a2ySKMg6uX8lhkCH6t7vYvgaTXQZvgnzeZz';
const PARENT_PAGE_ID = '2f61e9e4-22db-80a8-93f9-cc46578323c8';
// Using the absolute path to the active document
const FILE_PATH = 'c:\\Users\\Oyvin\\Documents\\GitHub\\smart-training-planner\\task_plan.md';

console.log(`Starting export...`);
console.log(`Target Page ID: ${PARENT_PAGE_ID}`);
console.log(`Reading file: ${FILE_PATH}`);

// --- HELPER: PARSER ---
function parseMarkdownToBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];

    let currentBuffer = [];

    lines.forEach(line => {
        const trimmed = line.trim();

        // Skip empty lines in block generation (except as separators, but Notion handles spacing)
        if (!trimmed) return;

        if (trimmed.startsWith('# ')) {
            blocks.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }]
                }
            });
        } else if (trimmed.startsWith('## ')) {
            blocks.push({
                object: "block",
                type: "heading_2",
                heading_2: {
                    rich_text: [{ type: "text", text: { content: trimmed.substring(3) } }]
                }
            });
        } else if (trimmed.startsWith('### ')) {
            blocks.push({
                object: "block",
                type: "heading_3",
                heading_3: {
                    rich_text: [{ type: "text", text: { content: trimmed.substring(4) } }]
                }
            });
        } else if (trimmed.startsWith('> ')) {
            blocks.push({
                object: "block",
                type: "callout",
                callout: {
                    rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }],
                    icon: { emoji: "💡" }
                }
            });
        } else if (trimmed.startsWith('- ')) {
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }]
                }
            });
        } else {
            // Standard Paragraph
            blocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [{ type: "text", text: { content: trimmed } }]
                }
            });
        }
    });

    return blocks;
}

// --- MAIN EXECUTION ---
try {
    const markdown = fs.readFileSync(FILE_PATH, 'utf8');
    // Take first 80 blocks to be safe (Notion limit is 100)
    const blocks = parseMarkdownToBlocks(markdown).slice(0, 80);

    const payload = JSON.stringify({
        parent: { page_id: PARENT_PAGE_ID },
        properties: {
            title: [
                {
                    text: { content: "Task Plan: Future Roadmap (Auto-Export)" }
                }
            ]
        },
        children: blocks
    });

    const options = {
        hostname: 'api.notion.com',
        path: '/v1/pages',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NOTION_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
            'Content-Length': Buffer.byteLength(payload) // CRITICAL for UTF-8 and stability
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('SUCCESS: Page created!');
                const json = JSON.parse(responseBody);
                console.log('Page URL:', json.url);
            } else {
                console.error(`ERROR: API request failed with status ${res.statusCode}`);
                console.error('Response:', responseBody);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`ERROR: Request error: ${e.message}`);
        process.exit(1);
    });

    req.write(payload);
    req.end();

} catch (err) {
    console.error(`ERROR: Script execution failed: ${err.message}`);
    process.exit(1);
}
