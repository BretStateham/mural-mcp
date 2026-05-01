# mural-mcp

MCP server and CLI for [Mural](https://mural.co) visual collaboration boards.

Built with TypeScript, the [Model Context Protocol SDK](https://modelcontextprotocol.io/), and the Mural Public API.

## Features

- **Read board state** — list all widgets with positions, types, and content
- **Create content** — sticky notes, shapes, text boxes at specific coordinates
- **Overlap avoidance** — built-in placement logic to find non-overlapping positions
- **Navigation** — browse workspaces, rooms, and murals
- **Token-efficient** — compact responses optimized for AI agent context windows

## Prerequisites

- Node.js 18+
- A Mural account with a registered OAuth app

## Setup

### 1. Register a Mural OAuth App

1. Go to [app.mural.co](https://app.mural.co) → click your avatar → **"Create and manage apps"**
2. Click **"New app"**
3. Set the redirect URL to: `http://localhost:9876/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Install & Build

```bash
git clone https://github.com/BretStateham/mural-mcp.git
cd mural-mcp
npm install
npm run build
```

### 3. Authenticate

```bash
export MURAL_CLIENT_ID=your_client_id
export MURAL_CLIENT_SECRET=your_client_secret
npm run auth
```

This opens your browser for Mural consent. Tokens are saved to `~/.mural-mcp/tokens.json` and auto-refresh at runtime.

### 4. Configure as MCP Server

Add to your MCP client config (e.g., Copilot CLI, Claude Code, Cursor):

```json
{
  "mcpServers": {
    "mural": {
      "command": "node",
      "args": ["/path/to/mural-mcp/build/index.js"],
      "env": {
        "MURAL_CLIENT_ID": "your_client_id",
        "MURAL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_workspaces` | List accessible Mural workspaces |
| `list_rooms` | List rooms in a workspace |
| `list_murals` | List murals in a workspace or room |
| `get_mural` | Get mural metadata |
| `get_widgets` | List all widgets with positions |
| `get_widget` | Get a single widget's details |
| `create_sticky_note` | Create a sticky note (with optional auto-placement) |
| `create_shape` | Create a shape |
| `create_text_box` | Create a text box |
| `update_widget` | Update any widget |
| `delete_widget` | Delete a widget |
| `find_open_position` | Find a non-overlapping position for a new item |

## License

MIT
