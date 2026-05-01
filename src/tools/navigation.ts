import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client/mural-api.js";

export function registerNavigationTools(server: McpServer): void {
  server.tool(
    "list_workspaces",
    "List all accessible Mural workspaces",
    {},
    async () => {
      const workspaces = await api.listWorkspaces();
      return {
        content: [{ type: "text", text: JSON.stringify(workspaces) }],
      };
    },
  );

  server.tool(
    "list_rooms",
    "List rooms in a Mural workspace",
    { workspaceId: z.string().describe("Workspace ID") },
    async ({ workspaceId }) => {
      const rooms = await api.listRooms(workspaceId);
      return {
        content: [{ type: "text", text: JSON.stringify(rooms) }],
      };
    },
  );

  server.tool(
    "list_murals",
    "List murals in a workspace or room",
    {
      workspaceId: z.string().describe("Workspace ID"),
      roomId: z.string().optional().describe("Room ID (optional, filters to room)"),
    },
    async ({ workspaceId, roomId }) => {
      const murals = await api.listMurals(workspaceId, roomId);
      return {
        content: [{ type: "text", text: JSON.stringify(murals) }],
      };
    },
  );

  server.tool(
    "get_mural",
    "Get metadata for a specific mural",
    { muralId: z.string().describe("Mural ID") },
    async ({ muralId }) => {
      const mural = await api.getMural(muralId);
      return {
        content: [{ type: "text", text: JSON.stringify(mural) }],
      };
    },
  );
}
