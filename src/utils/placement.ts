import type { BoundingBox, MuralWidget } from "../types.js";

const DEFAULT_PADDING = 20;

/**
 * Check if two bounding boxes overlap (with optional padding).
 */
export function boxesOverlap(
  a: BoundingBox,
  b: BoundingBox,
  padding: number = DEFAULT_PADDING,
): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

/**
 * Build bounding boxes from an array of widgets.
 */
export function widgetsToBounds(widgets: MuralWidget[]): BoundingBox[] {
  return widgets.map((w) => ({
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
  }));
}

/**
 * Find a non-overlapping position for a new item among existing items.
 * Scans right-then-down in a grid pattern starting from (startX, startY).
 */
export function findOpenPosition(
  existing: BoundingBox[],
  itemWidth: number,
  itemHeight: number,
  startX: number = 0,
  startY: number = 0,
  padding: number = DEFAULT_PADDING,
): { x: number; y: number } {
  const stepX = itemWidth + padding;
  const stepY = itemHeight + padding;
  const maxCols = 20;

  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < maxCols; col++) {
      const candidate: BoundingBox = {
        x: startX + col * stepX,
        y: startY + row * stepY,
        width: itemWidth,
        height: itemHeight,
      };

      const hasOverlap = existing.some((e) => boxesOverlap(candidate, e, padding));
      if (!hasOverlap) {
        return { x: candidate.x, y: candidate.y };
      }
    }
  }

  // Fallback: place far below all existing content
  const maxY = existing.reduce((max, b) => Math.max(max, b.y + b.height), 0);
  return { x: startX, y: maxY + padding };
}
