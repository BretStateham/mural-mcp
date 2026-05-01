import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client/mural-api.js";
import { findOpenPosition, widgetsToBounds } from "../utils/placement.js";

export function registerWidgetWriteTools(server: McpServer): void {
  server.tool(
    "create_sticky_note",
    "Create a sticky note on a mural at a specific position. If autoPlace is true, finds a non-overlapping position automatically.",
    {
      muralId: z.string().describe("Mural ID"),
      text: z.string().describe("Sticky note text content"),
      x: z.number().optional().describe("X position (ignored if autoPlace is true)"),
      y: z.number().optional().describe("Y position (ignored if autoPlace is true)"),
      width: z.number().optional().default(200).describe("Width in pixels"),
      height: z.number().optional().default(200).describe("Height in pixels"),
      color: z.string().optional().describe("Background color hex (e.g. #FFF9BC)"),
      autoPlace: z.boolean().optional().default(false).describe("Auto-find a non-overlapping position"),
    },
    async ({ muralId, text, x, y, width, height, color, autoPlace }) => {
      let posX = x ?? 0;
      let posY = y ?? 0;

      if (autoPlace) {
        const existing = await api.getWidgets(muralId);
        const bounds = widgetsToBounds(existing);
        const pos = findOpenPosition(bounds, width, height);
        posX = pos.x;
        posY = pos.y;
      }

      const widget: Record<string, unknown> = {
        type: "sticky_note",
        x: posX,
        y: posY,
        width,
        height,
        text,
      };

      const created = await api.createWidget(muralId, widget);

      // Mural quirk: backgroundColor must be set via update after creation
      if (color) {
        await api.updateWidget(muralId, created.id, {
          style: { backgroundColor: color },
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: created.id,
              x: posX,
              y: posY,
              text,
              autoPlaced: autoPlace,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "create_shape",
    "Create a shape on a mural",
    {
      muralId: z.string().describe("Mural ID"),
      shape: z.string().describe("Shape type (rectangle, circle, diamond, triangle, etc.)"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().optional().default(200).describe("Width"),
      height: z.number().optional().default(200).describe("Height"),
      text: z.string().optional().describe("Text inside shape"),
      color: z.string().optional().describe("Background color hex"),
    },
    async ({ muralId, shape, x, y, width, height, text, color }) => {
      const widget: Record<string, unknown> = {
        type: "shape",
        shape,
        x,
        y,
        width,
        height,
      };
      if (text) widget["text"] = text;
      if (color) widget["style"] = { backgroundColor: color };

      const created = await api.createWidget(muralId, widget);
      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, shape, x, y }) }],
      };
    },
  );

  server.tool(
    "create_text_box",
    "Create a text box on a mural",
    {
      muralId: z.string().describe("Mural ID"),
      text: z.string().describe("Text content"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().optional().default(300).describe("Width"),
      height: z.number().optional().default(100).describe("Height"),
    },
    async ({ muralId, text, x, y, width, height }) => {
      const created = await api.createWidget(muralId, {
        type: "text",
        text,
        x,
        y,
        width,
        height,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, x, y, text }) }],
      };
    },
  );

  server.tool(
    "update_widget",
    "Update an existing widget (position, text, style, etc.)",
    {
      muralId: z.string().describe("Mural ID"),
      widgetId: z.string().describe("Widget ID to update"),
      x: z.number().optional().describe("New X position"),
      y: z.number().optional().describe("New Y position"),
      width: z.number().optional().describe("New width"),
      height: z.number().optional().describe("New height"),
      text: z.string().optional().describe("New text content"),
    },
    async ({ muralId, widgetId, ...updates }) => {
      // Filter out undefined values
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) patch[key] = value;
      }
      const updated = await api.updateWidget(muralId, widgetId, patch);
      return {
        content: [{ type: "text", text: JSON.stringify({ id: updated.id, ...patch }) }],
      };
    },
  );

  server.tool(
    "delete_widget",
    "Delete a widget from a mural",
    {
      muralId: z.string().describe("Mural ID"),
      widgetId: z.string().describe("Widget ID to delete"),
    },
    async ({ muralId, widgetId }) => {
      await api.deleteWidget(muralId, widgetId);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: widgetId }) }],
      };
    },
  );

  server.tool(
    "find_open_position",
    "Find a non-overlapping (x, y) position on a mural for a new item of given size",
    {
      muralId: z.string().describe("Mural ID"),
      width: z.number().describe("Width of the new item"),
      height: z.number().describe("Height of the new item"),
      startX: z.number().optional().default(0).describe("Start scanning from X"),
      startY: z.number().optional().default(0).describe("Start scanning from Y"),
      padding: z.number().optional().default(20).describe("Minimum gap between items"),
    },
    async ({ muralId, width, height, startX, startY, padding }) => {
      const existing = await api.getWidgets(muralId);
      const bounds = widgetsToBounds(existing);
      const pos = findOpenPosition(bounds, width, height, startX, startY, padding);
      return {
        content: [{ type: "text", text: JSON.stringify(pos) }],
      };
    },
  );
}
