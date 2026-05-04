import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client/mural-api.js";
import { findOpenPosition, widgetsToBounds } from "../utils/placement.js";

export function registerWidgetWriteTools(server: McpServer): void {
  server.tool(
    "create_sticky_note",
    "Create a sticky note on a mural. Use parentId to place inside an area with relative coordinates. If autoPlace is true, finds a non-overlapping position automatically.",
    {
      muralId: z.string().describe("Mural ID"),
      text: z.string().describe("Plain text content. Ignored if htmlText is provided."),
      htmlText: z.string().optional().describe('Rich text using Mural HTML format. Example: <html v="1"><div><b><span>Bold</span></b><span> normal</span></div></html>. Supports <b>, <i>, <u>, <strike>, <span>.'),
      x: z.number().optional().describe("X position (absolute, or relative if parentId is set)"),
      y: z.number().optional().describe("Y position (absolute, or relative if parentId is set)"),
      parentId: z.string().optional().describe("Parent area widget ID — coordinates become relative to this area"),
      width: z.number().optional().default(200).describe("Width in pixels"),
      height: z.number().optional().default(200).describe("Height in pixels"),
      shape: z.enum(["rectangle", "circle"]).optional().default("rectangle").describe("Sticky note shape"),
      color: z.string().optional().describe("Background color hex (e.g. #FF69B4FF). Set via PATCH after creation."),
      autoPlace: z.boolean().optional().default(false).describe("Auto-find a non-overlapping position"),
    },
    async ({ muralId, text, htmlText, x, y, parentId, width, height, shape, color, autoPlace }) => {
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
        x: posX,
        y: posY,
        width,
        height,
        shape,
        text,
      };
      if (parentId) widget["parentId"] = parentId;

      const created = await api.createWidget(muralId, "sticky-note", widget);

      // Apply htmlText and/or color via PATCH (not settable on creation)
      const patch: Record<string, unknown> = {};
      if (htmlText) patch["htmlText"] = htmlText;
      if (color) patch["style"] = { backgroundColor: color };
      if (Object.keys(patch).length > 0) {
        await api.updateWidget(muralId, "sticky-note", created.id, patch);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: created.id,
              parentId: parentId ?? null,
              x: posX,
              y: posY,
              text,
              color: color ?? null,
              autoPlaced: autoPlace,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "create_shape",
    "Create a shape on a mural. Use parentId to place inside an area with relative coordinates.",
    {
      muralId: z.string().describe("Mural ID"),
      shape: z.string().describe("Shape type (rectangle, circle, diamond, triangle, etc.)"),
      x: z.number().describe("X position (absolute, or relative if parentId is set)"),
      y: z.number().describe("Y position (absolute, or relative if parentId is set)"),
      parentId: z.string().optional().describe("Parent area widget ID — coordinates become relative to this area"),
      width: z.number().optional().default(200).describe("Width"),
      height: z.number().optional().default(200).describe("Height"),
      text: z.string().optional().describe("Text inside shape"),
      color: z.string().optional().describe("Background color hex"),
    },
    async ({ muralId, shape, x, y, parentId, width, height, text, color }) => {
      const widget: Record<string, unknown> = {
        shape,
        x,
        y,
        width,
        height,
      };
      if (parentId) widget["parentId"] = parentId;
      if (text) widget["text"] = text;
      if (color) widget["style"] = { backgroundColor: color };

      const created = await api.createWidget(muralId, "shape", widget);
      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, shape, x, y, parentId: parentId ?? null }) }],
      };
    },
  );

  server.tool(
    "create_text_box",
    "Create a text box on a mural. Use parentId to place inside an area with relative coordinates.",
    {
      muralId: z.string().describe("Mural ID"),
      text: z.string().describe("Text content"),
      x: z.number().describe("X position (absolute, or relative if parentId is set)"),
      y: z.number().describe("Y position (absolute, or relative if parentId is set)"),
      parentId: z.string().optional().describe("Parent area widget ID — coordinates become relative to this area"),
      width: z.number().optional().default(300).describe("Width"),
      height: z.number().optional().default(100).describe("Height"),
    },
    async ({ muralId, text, x, y, parentId, width, height }) => {
      const widget: Record<string, unknown> = { text, x, y, width, height };
      if (parentId) widget["parentId"] = parentId;

      const created = await api.createWidget(muralId, "text", widget);
      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, x, y, text, parentId: parentId ?? null }) }],
      };
    },
  );

  server.tool(
    "update_widget",
    "Update an existing widget (position, text, style, etc.). Requires widgetType for the type-specific PATCH endpoint.",
    {
      muralId: z.string().describe("Mural ID"),
      widgetId: z.string().describe("Widget ID to update"),
      widgetType: z.string().describe("Widget type slug: sticky-note, shape, text, area, icon, image"),
      x: z.number().optional().describe("New X position"),
      y: z.number().optional().describe("New Y position"),
      width: z.number().optional().describe("New width"),
      height: z.number().optional().describe("New height"),
      text: z.string().optional().describe("New plain text content"),
      htmlText: z.string().optional().describe('Rich text in Mural HTML format. Example: <html v="1"><div><b><span>Bold</span></b><span> normal</span></div></html>'),
      backgroundColor: z.string().optional().describe("Background color hex (e.g. #FF69B4FF)"),
    },
    async ({ muralId, widgetId, widgetType, backgroundColor, ...updates }) => {
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) patch[key] = value;
      }
      if (backgroundColor) {
        patch["style"] = { backgroundColor };
      }
      const updated = await api.updateWidget(muralId, widgetType, widgetId, patch);
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
