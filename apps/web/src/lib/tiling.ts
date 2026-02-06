import type { NeckDiagram } from "@shared/types";
import { DEFAULT_DIAGRAM_SIZE } from "../state/defaults";

type CanvasSize = { width: number; height: number };

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box, gap: number) => {
  return !(
    a.x + a.width + gap <= b.x ||
    a.x >= b.x + b.width + gap ||
    a.y + a.height + gap <= b.y ||
    a.y >= b.y + b.height + gap
  );
};

const clampColumns = (columns: number) => {
  if (columns <= 1) return 1;
  return Math.min(4, Math.max(2, columns));
};

export const suggestTile = (
  diagrams: NeckDiagram[],
  canvas: CanvasSize,
  size = DEFAULT_DIAGRAM_SIZE,
  gap = 24
) => {
  const columnWidth = DEFAULT_DIAGRAM_SIZE.width;
  const columns = clampColumns(
    Math.floor((canvas.width + gap) / (columnWidth + gap))
  );
  const gridWidth = columns * columnWidth + gap * (columns - 1);
  const isWide = size.width > columnWidth * 1.05;
  let row = 0;

  while (row < 100) {
    const y = gap + row * (size.height + gap);
    const candidates = isWide
      ? [
          {
            x: Math.max(gap, gap + (gridWidth - size.width) / 2),
            y
          }
        ]
      : Array.from({ length: columns }, (_, col) => ({
          x: gap + col * (columnWidth + gap),
          y
        }));

    for (const candidate of candidates) {
      const box = { x: candidate.x, y: candidate.y, width: size.width, height: size.height };
      const collision = diagrams.some((diagram) => overlaps(box, diagram, gap));
      if (!collision) {
        return { x: candidate.x, y: candidate.y };
      }
    }

    row += 1;
  }

  return { x: gap, y: gap };
};
