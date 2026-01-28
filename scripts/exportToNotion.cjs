const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const NOTION_KEY = 'ntn_c8219009755a2ySKMg6uX8lhkCH6t7vYvgaTXQZvgnzeZz';
const PARENT_PAGE_ID = '2f61e9e4-22db-80a8-93f9-cc46578323c8';
// Absolute path to the file in the artifacts directory
const MARKDOWN_FILE_PATH = 'C:\\Users\\Oyvin\\.gemini\\antigravity\\brain\\e5d71e9a-ff7c-4301-acc3-1e3c1935d738\\UI_FORSLAG_NORSK.md';

function parseMarkdownToBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    let currentCodeBlock = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle Code Blocks
        if (line.trim().startsWith('```')) {
            if (currentCodeBlock) {
                // End of code block
                blocks.push({
                    object: 'block',
                    type: 'code',
                    code: {
                        rich_text: [{ type: 'text', text: { content: currentCodeBlock.content.join('\n') } }],
                        language: currentCodeBlock.language || 'plain text'
                    }
                });
                currentCodeBlock = null;
            } else {
                // Start of code block
                const language = line.trim().replace('```', '');
                currentCodeBlock = { language, content: [] };
            }
            continue;
        }

        if (currentCodeBlock) {
            currentCodeBlock.content.push(line);
            continue;
        }

        // Skip empty lines
        if (line.trim() === '') continue;

        // Headings
        if (line.startsWith('# ')) {
            blocks.push({
                object: 'block',
                type: 'heading_1',
                heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }] }
            });
        } else if (line.startsWith('## ')) {
            blocks.push({
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ type: 'text', text: { content: line.replace('## ', '') } }] }
            });
        } else if (line.startsWith('### ')) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: { rich_text: [{ type: 'text', text: { content: line.replace('### ', '') } }] }
            });
        }
        // Blockquote
        else if (line.startsWith('> ')) {
            blocks.push({
                object: 'block',
                type: 'quote',
                quote: { rich_text: [{ type: 'text', text: { content: line.replace('> ', '') } }] }
            });
        }
        // Bullet List
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            blocks.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^[-*] /, '') } }] }
            });
        }
        // Images (Simple handling, Notion requires external URLs usually, but we can try)
        else if (line.match(/!\[(.*?)\]\((.*?)\)/)) {
            // Notion API often rejects local paths for images, but we will try to make it a paragraph with a link for safety
            // Or simpler: just a text description since we can't upload images via API easily without hosting them.
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: `[IMAGE: ${line}]` } }] }
            });
        }
        // Paragraph
        else {
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: line } }] }
            });
        }
    }
    return blocks;
}

function createPage(blocks) {
    const data = JSON.stringify({
        parent: { page_id: PARENT_PAGE_ID },
        properties: {
            title: [
                {
                    text: {
                        content: 'UI Moderniseringsforslag (Auto-Export)'
                    }
                }
            ]
        },
        children: blocks.slice(0, 90) // Limit to 90 blocks per request to be safe (max 100)
    });

    const options = {
        hostname: 'api.notion.com',
        path: '/v1/pages',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NOTION_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('SUCCESS: Page created successfully!');
                const resJson = JSON.parse(responseBody);
                console.log('URL:', resJson.url);
                fs.writeFileSync('success_url.txt', resJson.url); // Save URL for easy reading
            } else {
                console.error(`ERROR: Status Code ${res.statusCode}`);
                fs.writeFileSync('error_log.json', responseBody); // Save full error to file
                console.error('Full error saved to error_log.json');
            }
        });
    });

    req.on('error', (error) => {
        console.error('ERROR: Request failed', error);
    });

    req.write(data);
    req.end();
}

// Main Execution
try {
    console.log('Reading file:', MARKDOWN_FILE_PATH);
    const markdown = fs.readFileSync(MARKDOWN_FILE_PATH, 'utf8');
    console.log('Parsing markdown...');
    const blocks = parseMarkdownToBlocks(markdown);
    console.log(`Generated ${blocks.length} blocks.`);
    console.log('Sending to Notion...');
    createPage(blocks);
} catch (err) {
    console.error('CRITICAL ERROR:', err.message);
}
