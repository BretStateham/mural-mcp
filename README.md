# mural-mcp

> **⚠️ DISCLAIMER — VIBE-CODED / USE AT YOUR OWN RISK**
>
> This project was **vibe-coded** — built rapidly with AI assistance and minimal manual validation of the code. It works for the scenarios it was tested against, but it has **not** been through formal code review, security audit, or comprehensive testing.
>
> **If you use this repo, you are responsible for reviewing and validating the code yourself before using it in any environment.** The authors make no guarantees about correctness, security, or fitness for any particular purpose.

---

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for [Mural](https://mural.co) visual collaboration boards. Allows AI agents (GitHub Copilot CLI, Claude Code, Cursor, etc.) to read, create, update, and delete content on Mural boards programmatically.

Built with TypeScript, the [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk), and the [Mural Public REST API](https://developers.mural.co/public/reference).

## Features

- **Read board state** — list all widgets with positions, types, and content
- **Create content** — sticky notes, shapes, text boxes at precise coordinates
- **Rich text** — bold, italic, underline, strikethrough formatting via Mural's HTML format
- **Area-relative positioning** — place widgets inside areas using `parentId` for relative coordinates
- **Overlap avoidance** — built-in placement logic to find non-overlapping positions
- **Auto-tagging** — widgets created via MCP are automatically tagged (default: `"MCP"`) for easy identification
- **Navigation** — browse workspaces, rooms, and murals
- **Token auto-refresh** — OAuth tokens are refreshed automatically when they expire
- **Token-efficient** — compact responses optimized for AI agent context windows

## Prerequisites

- **Node.js** 18+ (tested with Node 24)
- A **Mural account** with access to the boards you want to manage
- A registered **Mural OAuth app** (see setup below)

## Setup

### 1. Register a Mural OAuth App

1. Go to [app.mural.co](https://app.mural.co) → click your avatar → **"Create and manage apps"**
2. Click **"New app"** and give it a name
3. Set the redirect URL to: `http://localhost:9876/callback`
4. Under **Scopes**, ensure `murals:read` and `murals:write` are enabled
5. Note your **Client ID** and **Client Secret**

### 2. Install & Build

```bash
git clone https://github.com/BretStateham/mural-mcp.git
cd mural-mcp
npm install
npm run build
```

### 3. Authenticate

Set your OAuth credentials as environment variables and run the auth flow:

```bash
# Linux / macOS
export MURAL_CLIENT_ID=your_client_id
export MURAL_CLIENT_SECRET=your_client_secret

# Windows (PowerShell)
$env:MURAL_CLIENT_ID = "your_client_id"
$env:MURAL_CLIENT_SECRET = "your_client_secret"

npm run auth
```

This opens your browser for Mural OAuth consent. After you authorize, tokens are saved to `~/.mural-mcp/tokens.json` and auto-refresh at runtime (Mural access tokens expire every 15 minutes).

> **Note:** If your Mural account uses SSO (e.g., Microsoft SAML), you may need to use a browser profile that is already signed in to your identity provider.

### 4. Configure as MCP Server

Add the server to your MCP client's configuration file.

**GitHub Copilot CLI** (`~/.copilot/mcp-config.json`):

```json
{
  "mcpServers": {
    "mural": {
      "command": "node",
      "args": ["/absolute/path/to/mural-mcp/build/index.js"],
      "env": {
        "MURAL_CLIENT_ID": "your_client_id",
        "MURAL_CLIENT_SECRET": "your_client_secret"
      },
      "tools": ["*"]
    }
  }
}
```

**Claude Code / Cursor** (`.mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "mural": {
      "command": "node",
      "args": ["/absolute/path/to/mural-mcp/build/index.js"],
      "env": {
        "MURAL_CLIENT_ID": "your_client_id",
        "MURAL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

> **Important:** Use absolute paths in `args`. The `env` variables are needed at runtime for token refresh.

## Testing the Server

### Quick smoke test (stdin/stdout)

You can verify the server starts and responds to MCP protocol messages directly:

```bash
# Set env vars first (see step 3 above), then:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node build/index.js
```

You should see a JSON response with `serverInfo` and the list of available tools.

### Test with an MCP client

Once configured in your MCP client (step 4), try these commands in natural language:

1. **"List all widgets on mural `workspace.muralId`"** — tests reading
2. **"Create a pink sticky note with text 'Hello' on mural `workspace.muralId`"** — tests writing
3. **"Delete widget `widgetId` from mural `workspace.muralId`"** — tests deletion

### Finding your Mural ID

The Mural ID format is `{workspaceId}.{numericId}`. You can find it from a Mural URL:

```
https://app.mural.co/t/myworkspace/m/myworkspace/1234567890/...
                         ^^^^^^^^^^^               ^^^^^^^^^^
                         workspace ID               numeric ID

Mural ID = myworkspace.1234567890
```

## Tools Reference

### Navigation

| Tool | Description |
|------|-------------|
| `list_workspaces` | List all accessible Mural workspaces |
| `list_rooms` | List rooms in a workspace |
| `list_murals` | List murals in a workspace or room |
| `get_mural` | Get metadata for a specific mural |

### Reading Widgets

| Tool | Description |
|------|-------------|
| `get_widgets` | List all widgets on a mural with positions (x, y, width, height) and content |
| `get_widget` | Get full details of a single widget by ID |

### Creating Widgets

| Tool | Description |
|------|-------------|
| `create_sticky_note` | Create a sticky note with optional rich text, color, auto-placement, and area positioning |
| `create_shape` | Create a shape (rectangle, circle, diamond, triangle, etc.) |
| `create_text_box` | Create a text box |

### Modifying Widgets

| Tool | Description |
|------|-------------|
| `update_widget` | Update any widget's position, text, style, or formatting |
| `delete_widget` | Delete a widget from a mural |

### Placement

| Tool | Description |
|------|-------------|
| `find_open_position` | Find a non-overlapping (x, y) position for a new item of a given size |

## Key Concepts

### Mural ID Format

Mural IDs follow the pattern `{workspaceId}.{numericId}` — for example, `myworkspace.1777575930967`. This is required for all API operations.

### Area-Relative Positioning (`parentId`)

Mural boards can contain **areas** — rectangular regions that group content. When you pass a `parentId` (the area's widget ID) to a create tool, the `x` and `y` coordinates become **relative to the area's top-left corner** rather than the board's absolute origin. This makes it much easier to place content inside areas.

```
Without parentId: x=5737, y=93     (absolute board coordinates)
With parentId:    x=200,  y=300    (relative to area origin)
```

### Rich Text (`htmlText`)

Sticky notes and text boxes support rich formatting using Mural's HTML format. Use the `htmlText` parameter instead of `text`:

```html
<html v="1"><div><b><span>Bold</span></b><span> normal </span><i><span>italic</span></i></div></html>
```

Supported tags: `<b>`, `<i>`, `<u>`, `<strike>`, `<span>`

When `htmlText` is set, the `text` field is ignored. Rich text is applied via PATCH after widget creation.

### Auto-Tagging

All create tools accept an optional `tag` parameter:

- **Default: `"MCP"`** — widgets are automatically tagged to identify them as MCP-created
- **Custom tag:** set `tag` to any string (e.g., `"prototype"`, `"AI-generated"`)
- **Skip tagging:** set `tag` to `""` (empty string) to create without a tag

Tags are created per-mural automatically if they don't already exist.

### Background Color

Widget colors cannot be set during creation — they are applied via a PATCH request immediately after. Pass the `color` parameter (e.g., `"#FF69B4FF"` for pink) and it's handled automatically.

### Overlap Avoidance

The `find_open_position` tool scans the board in a grid pattern to find coordinates where a new item won't overlap existing content. The `create_sticky_note` tool also has an `autoPlace` flag that does this automatically.

## Project Structure

```
src/
├── index.ts                 # MCP server entry point (stdio transport)
├── types.ts                 # TypeScript interfaces (MuralWidget, BoundingBox, etc.)
├── auth/
│   ├── cli-auth.ts          # One-time OAuth browser flow
│   └── token-store.ts       # Token persistence and auto-refresh
├── client/
│   └── mural-api.ts         # Mural REST API client (all HTTP calls)
├── tools/
│   ├── navigation.ts        # MCP tools: workspaces, rooms, murals
│   ├── widgets-read.ts      # MCP tools: get_widgets, get_widget
│   └── widgets-write.ts     # MCP tools: create, update, delete, placement
└── utils/
    └── placement.ts         # Bounding-box overlap detection and auto-placement
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `build/` |
| `npm run dev` | Watch mode — recompile on file changes |
| `npm start` | Start the MCP server (stdio transport) |
| `npm run auth` | Run the one-time OAuth authentication flow |

## Mural API Quirks

A few things discovered during development that may save you time:

- **Widget endpoints are type-specific** — create uses `POST /widgets/sticky-note`, update uses `PATCH /widgets/sticky-note/{id}`, but get/delete use the generic `/widgets/{id}`
- **Sticky notes require a `shape` property** — must be `"rectangle"` or `"circle"`
- **`backgroundColor` cannot be set on creation** — must use a separate PATCH with `{ style: { backgroundColor: "..." } }`
- **`htmlText` cannot be set on creation** — must use a separate PATCH
- **Tags cannot be set on creation** — must PATCH with `{ tags: [tagId] }` after creating the widget
- **Pagination uses cursor tokens** — the `next` field is a base64 cursor, not a URL; pass as `?next={cursor}`
- **OAuth authorize URL has a trailing slash** — `https://app.mural.co/api/public/v1/authorization/oauth2/` (no `/authorize` suffix)
- **Access tokens expire every 15 minutes** — the server auto-refreshes using the stored refresh token

## License

ISC
