import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client/mural-api.js";

export function registerWidgetReadTools(server: McpServer): void {
  server.tool(
    "get_widgets",
    "List all widgets on a mural with their positions (x, y, width, height) and content",
    { muralId: z.string().describe("Mural ID") },
    async ({ muralId }) => {
      const widgets = await api.getWidgets(muralId);
      // Return compact summary: id, type, position, and text
      const summary = widgets.map((w) => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.width,
        h: w.height,
        text: w.text ?? w.title ?? "",
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summary) }],
      };
    },
  );

  server.tool(
    "get_widget",
    "Get full details of a single widget by ID",
    {
      muralId: z.string().describe("Mural ID"),
      widgetId: z.string().describe("Widget ID"),
    },
    async ({ muralId, widgetId }) => {
      const widget = await api.getWidget(muralId, widgetId);
      return {
        content: [{ type: "text", text: JSON.stringify(widget) }],
      };
    },
  );
}
