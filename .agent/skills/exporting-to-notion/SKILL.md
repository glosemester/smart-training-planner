---
name: exporting-to-notion
description: Exports artifacts, implementation plans, notes, and documentation to the user's Notion workspace. Use when the user wants to "save to Notion", "sync plan", or "create documentation" in Notion.
---

# Exporting to Notion

## When to use this skill
- The user asks to "save this plan to Notion".
- The user wants a backup of documentation in Notion.
- The user asks to "sync" task lists or artifacts to Notion.

## Workflow
1.  **Identify Content**: Determine what needs to be exported (an existing file, an artifact, or text to be generated).
2.  **Find Destination**:
    - **DEFAULT PARENT PAGE**: `2f61e9e4-22db-80a8-93f9-cc46578323c8` (Fra Antigravity). Use this unless otherwise specified.
    - Ask the user which page to put it under if not specified.
    - Use `mcp_notion-mcp-server_API-post-search` to find the Parent Page ID.
    - As specified by user, ensure generated content is in **Norwegian** unless otherwise requested.
3.  **Format Content**:
    - Notion requires **Block Objects** (not raw Markdown).
    - You must convert headers, lists, and paragraphs into JSON block objects.
4.  **Create/Update**:
    - Use `mcp_notion-mcp-server_API-post-page` to create a new sub-page.
    - Use `mcp_notion-mcp-server_API-patch-block-children` to append to an existing page.

## Instructions

### 1. Searching for Pages
Always verify the parent page exists first.
```json
// Tool: API-post-search
{
  "query": "Project Home",
  "filter": {
    "value": "page",
    "property": "object"
  }
}
```

### 2. Creating a Page
You must provide the `parent` object and `properties` (for title).
```json
// Tool: API-post-page
{
  "parent": { "page_id": "PARENT-PAGE-ID" },
  "properties": {
    "title": [
      {
        "text": { "content": "New Page Title" }
      }
    ]
  },
  "children": [
    // Blocks go here
  ]
}
```

### 3. Block Structure Guide
Notion is picky about Block Structure. Use this reference:

**Paragraph:**
```json
{
  "object": "block",
  "type": "paragraph",
  "paragraph": {
    "rich_text": [{ "type": "text", "text": { "content": "Hello World" } }]
  }
}
```

**Heading 1/2/3:**
```json
{
  "object": "block",
  "type": "heading_2",
  "heading_2": {
    "rich_text": [{ "type": "text", "text": { "content": "Section Title" } }]
  }
}
```

**Bulleted List:**
```json
{
  "object": "block",
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [{ "type": "text", "text": { "content": "List item" } }]
  }
}
```

### 4. Handling Large Files
If exporting a large file (like `implementation_plan.md`):
1.  Read the file content.
2.  Parse it into chunks (Headers vs Paragraphs).
3.  Create the page with the Title.
4.  Use `API-patch-block-children` to append blocks if there are too many for one request (Notion limit is ~100 blocks per request).

## Resources
- [Notion Block Reference](https://developers.notion.com/reference/block)

### 5. Advanced: Custom Script Strategy (The "Run Manual" Fallback)
If you encounter `invalid_json` (400) errors, issues with UTF-8 characters (Norwegian `æ`, `ø`, `å`), or if the MCP tools fail silently:
**Create and run a standalone Node.js script.**

#### Critical Requirements:
1.  **File Extension**: Use `.cjs` (CommonJS) if the project uses ESM (type: "module" in package.json), so `require` works reliably.
2.  **Content-Length**: You MUST calculate `Buffer.byteLength(data)` for the `Content-Length` header. Standard `.length` is wrong for multi-byte characters (emoji, formatting, UTF-8).
3.  **Environment**: Ensure `https` and `fs` are available (standard Node).

#### Robust Script Template (`export_notion_manual.cjs`)

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Get these from user or environment. DO NOT COMMIT KEYS if possible.
const NOTION_KEY = process.env.NOTION_KEY || 'YOUR_KEY_HERE'; 
const PARENT_PAGE_ID = 'YOUR_PARENT_PAGE_ID';
const FILE_PATH = path.join(__dirname, 'your_content_file.md');

// --- HELPER: PARSER (Simplified) ---
function parseMarkdownToBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Add logic to map # -> heading_1, - -> bulleted_list_item, etc.
        // Defaulting to paragraph for safety:
        blocks.push({
            object: "block",
            type: "paragraph",
            paragraph: {
                rich_text: [{ type: "text", text: { content: trimmed } }]
            }
        });
    });
    return blocks.slice(0, 90); // Safety limit (max 100)
}

// --- MAIN ---
try {
    const markdown = fs.readFileSync(FILE_PATH, 'utf8');
    const blocks = parseMarkdownToBlocks(markdown);
    
    // Create the Payload
    const payload = JSON.stringify({
        parent: { page_id: PARENT_PAGE_ID },
        properties: {
            title: [ { text: { content: "Page Title" } } ]
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
            'Content-Length': Buffer.byteLength(payload) // <--- CRITICAL
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const json = JSON.parse(responseBody);
                console.log('SUCCESS: Page created!', json.url);
            } else {
                console.error(`ERROR ${res.statusCode}:`, responseBody);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e);
        process.exit(1);
    });

    req.write(payload);
    req.end();

} catch (err) {
    console.error('Script Failed:', err);
}
```

#### Troubleshooting Authorization
- If you get 404 (Not Found) or 401 (Unauthorized):
    - Verify the Integration Token starts with `native_` or `secret_`.
    - **IMPORTANT**: Share the target Parent Page with the Integration (Add Connection > Your Integration Name) in the Notion UI. The API cannot see pages it hasn't been explicitly added to.

---

# Appendix: Notion API Reference

## Introduction
Integrations use the API to access Notion’s pages, databases, and users. Integrations can connect services to Notion and build interactive experiences for users within Notion.
You need an integration token to interact with the Notion API. You can find an integration token after you create an integration on the integration settings page.

### Conventions
- The base URL to send all API requests is `https://api.notion.com`. HTTPS is required.
- The Notion API follows RESTful conventions.
- Request and response bodies are encoded as JSON.

### JSON conventions
- Top-level resources have an "object" property (e.g., "database", "user").
- Top-level resources are addressable by a UUIDv4 "id" property.
- Property names are in `snake_case`.
- Temporal values are encoded in ISO 8601 strings.
- The Notion API does not support empty strings; use `null` instead.

### Pagination
Endpoints that return lists of objects support cursor-based pagination.
- Default: 10 items per call.
- Maximum `page_size`: 100.
- Responses containing lists include `has_more` (boolean) and `next_cursor` (string).
- Use `start_cursor` in subsequent requests to fetch the next page.

## Integration Capabilities
Capabilities control what an integration can do and see in a Notion workspace.

### Content capabilities
- **Read content**: Access to read existing content.
- **Update content**: Permission to update existing content (e.g., Update page).
- **Insert content**: Permission to create new content (e.g., Create a page).
- *Note*: Insert content does not imply Read access.

### Comment capabilities
- **Read comments**: Permission to read comments.
- **Insert comments**: Permission to insert comments.

### User capabilities
- No user information.
- User information without email addresses.
- User information with email addresses.

### Capability Behaviors and Best Practices
- An integration’s capabilities will never supersede a user’s permissions.
- Request minimum capabilities needed.
  - Importing data? Use **Insert content**.
  - Exporting data? Use **Read content**.
  - Updating properties? Use **Update content**.

---

## Authorization

Authorization is the process of granting an integration access to a user’s Notion data. That process varies depending on whether or not the integration is **public** or **internal**.

### Internal Integrations
An internal integration allows Notion workspace members to interact with the workspace through the Notion REST API.
- Tied to a single, specific workspace.
- Only members within the workspace can use the integration.
- Members must manually give the integration access to specific pages or databases.

### Public Integrations
Public integrations can be used by any Notion user in any workspace.
- Follow OAuth 2.0 protocol.
- Allows members to give access to pages directly through the auth flow.
- Can be used without page access if only interacting with User endpoints.

### Authentication Headers
Any time your integration is interacting with your workspace, you will need to include the integration token in the `Authorization` header with every API request.
```http
Authorization: Bearer {INTEGRATION_TOKEN}
Notion-Version: 2022-06-28
Content-Type: application/json
```

---

## Publishing to Notion’s Integration Gallery
Notion’s integration gallery is the single destination where customers discover, learn about, and install integrations. Developers can now self-serve submit their integrations.

### New Functionality
- **Create & Manage Integrations**: Updated profile UI merging Notion creators (templates/integrations).
- **Publish Integration**: Submit public integration for listing (Public API or Link Preview only).

### Integration Gallery Best Practices
- Integrations must provide valuable tools for the Notion community.
- Rejection reasons include brand issues, quality concerns, or failing baseline criteria.
- Submissions are typically reviewed within 5-10 business days.
