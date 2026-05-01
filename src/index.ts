#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerNavigationTools } from "./tools/navigation.js";
import { registerWidgetReadTools } from "./tools/widgets-read.js";
import { registerWidgetWriteTools } from "./tools/widgets-write.js";

const server = new McpServer({
  name: "mural-mcp",
  version: "0.1.0",
  description: "MCP server for Mural visual collaboration boards",
});

// Register all tool modules
registerNavigationTools(server);
registerWidgetReadTools(server);
registerWidgetWriteTools(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
