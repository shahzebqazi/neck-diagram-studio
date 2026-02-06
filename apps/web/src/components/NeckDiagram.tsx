import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import type { LabelMode, NeckDiagram as NeckDiagramType } from "@shared/types";
import {
  NOTE_NAMES,
  clamp,
  findFretAtX,
  getFretPositions,
  getIntervalLabel,
  getNoteIndex,
  getStringPositions,
  noteNameToIndex
} from "../lib/neckMath";
import { getStandardTuning } from "../state/defaults";

const MIN_NOTE_RADIUS = 8;
const NOTE_TAP_THRESHOLD = 4;
const NOTE_STROKE_WIDTH = 2;
const ROOT_NOTE_COLOR = "var(--note-root)";
const NOTE_IN_SCALE_COLOR = "var(--note-in-scale)";
const NOTE_OUT_SCALE_COLOR = "var(--note-out-scale)";
const NOTE_LABEL_COLOR = "var(--note-label)";
const NOTE_STROKE_COLOR = "var(--note-stroke)";
const DIAGRAM_BG = "var(--diagram-bg)";
const DIAGRAM_BORDER = "var(--diagram-border)";
const DIAGRAM_STRING = "var(--diagram-string)";
const DIAGRAM_FRET = "var(--diagram-fret)";
const DIAGRAM_NUT = "var(--diagram-nut)";
const DIAGRAM_CAPO = "var(--diagram-capo)";
const DIAGRAM_INLAY = "var(--diagram-inlay)";
const DIAGRAM_SELECTION = "var(--diagram-selection)";
const INLAY_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const DOUBLE_INLAY_FRETS = new Set([12, 24]);
const toRoman = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "";
  const numerals: Array<{ value: number; label: string }> = [
    { value: 1000, label: "M" },
    { value: 900, label: "CM" },
    { value: 500, label: "D" },
    { value: 400, label: "CD" },
    { value: 100, label: "C" },
    { value: 90, label: "XC" },
    { value: 50, label: "L" },
    { value: 40, label: "XL" },
    { value: 10, label: "X" },
    { value: 9, label: "IX" },
    { value: 5, label: "V" },
    { value: 4, label: "IV" },
    { value: 1, label: "I" }
  ];
  let remaining = Math.floor(value);
  let result = "";
  for (const numeral of numerals) {
    while (remaining >= numeral.value) {
      result += numeral.label;
      remaining -= numeral.value;
    }
  }
  return result;
};

type Props = {
  diagram: NeckDiagramType;
  selected: boolean;
  rootKey?: string;
  scaleIntervals?: number[] | null;
  zoom?: number;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onToggleNote: (stringIndex: number, fret: number) => void;
  isRenaming?: boolean;
  renameDraft?: string;
  onRenameStart?: () => void;
  onRenameDraftChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
};

const resolveLabel = (
  labelMode: LabelMode,
  noteIndex: number | null,
  rootIndex: number | null,
  picking?: "D" | "U"
) => {
  if (labelMode === "picking") return picking ?? "D";
  if (noteIndex === null) return "";
  if (labelMode === "key") return NOTE_NAMES[noteIndex];
  if (rootIndex === null) return "";
  return getIntervalLabel(rootIndex, noteIndex);
};

const NeckDiagram = ({
  diagram,
  selected,
  rootKey,
  scaleIntervals,
  zoom = 1,
  onPointerDown,
  onToggleNote,
  isRenaming = false,
  renameDraft = "",
  onRenameStart,
  onRenameDraftChange,
  onRenameCommit,
  onRenameCancel
}: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const notePointerRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const { config } = diagram;
  const noteRadius = Math.max(MIN_NOTE_RADIUS, diagram.height / 18);
  const noteFontBase = Math.max(8, Math.min(noteRadius * 1.2, 18));
  const noteEdgePad = noteRadius + NOTE_STROKE_WIDTH;
  const openStringPad = Math.max(24, noteRadius * 2.8);
  const rightPad = Math.max(12, noteEdgePad);
  const verticalPad = Math.max(8, noteEdgePad);
  const fretNumberHeight = Math.max(12, Math.round(noteRadius * 1.2));
  const fretboardWidth = Math.max(1, diagram.width - openStringPad - rightPad);
  const stringHeight = Math.max(1, diagram.height - verticalPad * 2);
  const rawAngle = config.multiscaleAngle ?? 0;
  const multiscaleAngle = Number.isFinite(rawAngle) ? rawAngle : 0;
  const angleRadians = (multiscaleAngle * Math.PI) / 180;
  const angleSlope = Math.tan(angleRadians);
  const angleOffset = angleSlope * (diagram.height / 2);

  const fretPositions = useMemo(
    () =>
      getFretPositions(config.frets, fretboardWidth).map((position) => position + openStringPad),
    [config.frets, fretboardWidth, openStringPad]
  );

  const stringPositions = useMemo(
    () => getStringPositions(config.strings, stringHeight).map((y) => y + verticalPad),
    [config.strings, stringHeight, verticalPad]
  );
  const displayTuning = useMemo(
    () =>
      config.displayStandardTuning ? getStandardTuning(config.strings) : config.tuning,
    [config.displayStandardTuning, config.strings, config.tuning]
  );
  const visualStringPositions = useMemo(
    () => [...stringPositions].reverse(),
    [stringPositions]
  );
  const inlayRadius = Math.max(3, noteRadius * 0.5);
  const inlayCenterY =
    visualStringPositions.length > 0
      ? (visualStringPositions[0] +
          visualStringPositions[visualStringPositions.length - 1]) /
        2
      : diagram.height / 2;
  const inlayOffset = Math.max(8, noteRadius * 1.5);

  const rootIndex = noteNameToIndex(rootKey ?? null);
  const scaleSet = useMemo(() => {
    if (!rootKey || !scaleIntervals || rootIndex === null) return null;
    return new Set(scaleIntervals.map((interval) => (rootIndex + interval) % 12));
  }, [rootKey, scaleIntervals, rootIndex]);

  const getLocalPoint = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const zoomFactor = zoom || 1;
    return {
      x: (event.clientX - bounds.left) / zoomFactor,
      y: (event.clientY - bounds.top) / zoomFactor
    };
  };

  const handleNotePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!selected) return;
    const point = getLocalPoint(event);
    if (!point) return;
    notePointerRef.current = {
      startX: point.x,
      startY: point.y,
      moved: false
    };
  };

  const handleNotePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const current = notePointerRef.current;
    if (!current) return;
    const point = getLocalPoint(event);
    if (!point) return;
    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    if (Math.hypot(dx, dy) >= NOTE_TAP_THRESHOLD) {
      current.moved = true;
    }
  };

  const handleNotePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const current = notePointerRef.current;
    notePointerRef.current = null;
    if (!current || current.moved) return;
    const point = getLocalPoint(event);
    if (!point) return;
    const adjustedX = point.x - angleSlope * (point.y - diagram.height / 2);
    const fret =
      adjustedX < openStringPad
        ? -1
        : clamp(findFretAtX(fretPositions, adjustedX), 0, config.frets - 1);
    const spacing =
      config.strings <= 1 ? stringHeight : stringHeight / (config.strings - 1);
    const rawIndex =
      config.strings <= 1
        ? 0
        : clamp(Math.round((point.y - verticalPad) / spacing), 0, config.strings - 1);
    const stringIndex = config.strings - 1 - rawIndex;
    onToggleNote(stringIndex, fret);
  };

  const clearNotePointer = () => {
    notePointerRef.current = null;
  };

  useEffect(() => {
    if (!isRenaming) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [isRenaming]);

  return (
    <div
      className={`neck-diagram${selected ? " is-selected" : ""}`}
      style={{ width: diagram.width, height: diagram.height }}
      onPointerDown={onPointerDown}
    >
      <svg
        className="neck-diagram-base"
        width={diagram.width}
        height={diagram.height}
        data-diagram-id={diagram.id}
        aria-hidden="true"
      >
        <rect
          x={0}
          y={0}
          width={diagram.width}
          height={diagram.height}
          fill={DIAGRAM_BG}
          stroke={DIAGRAM_BORDER}
          strokeWidth={1}
        />
        {selected ? (
          <rect
            x={1}
            y={1}
            width={Math.max(0, diagram.width - 2)}
            height={Math.max(0, diagram.height - 2)}
            fill="none"
            stroke={DIAGRAM_SELECTION}
            strokeWidth={2}
          />
        ) : null}

        {visualStringPositions.map((y, index) => (
          <line
            key={`string-${index}`}
            x1={0}
            y1={y}
            x2={diagram.width}
            y2={y}
            stroke={DIAGRAM_STRING}
            strokeWidth={index === 0 || index === config.strings - 1 ? 2 : 1}
          />
        ))}

        {fretPositions.map((x, index) => {
          const xTop = x - angleOffset;
          const xBottom = x + angleOffset;
          const isNut = index === 0;
          return (
            <line
              key={`fret-${index}`}
              x1={xTop}
              y1={0}
              x2={xBottom}
              y2={diagram.height}
              stroke={isNut ? DIAGRAM_NUT : DIAGRAM_FRET}
              strokeWidth={isNut ? 3 : 1}
            />
          );
        })}

        {config.capo > 0 && fretPositions[config.capo] !== undefined ? (
          <line
            x1={fretPositions[config.capo] - angleOffset}
            y1={0}
            x2={fretPositions[config.capo] + angleOffset}
            y2={diagram.height}
            stroke={DIAGRAM_CAPO}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.8}
          />
        ) : null}

        {config.showInlays !== false
          ? Array.from(INLAY_FRETS).map((fretNumber) => {
              if (fretNumber > config.frets) return null;
              const start = fretPositions[fretNumber - 1];
              const end = fretPositions[fretNumber];
              if (start == null || end == null) return null;
              const inlayX = start + (end - start) / 2;
              const fill = DIAGRAM_INLAY;
              if (DOUBLE_INLAY_FRETS.has(fretNumber)) {
                return (
                  <g key={`inlay-${fretNumber}`}>
                    <circle
                      cx={inlayX}
                      cy={inlayCenterY - inlayOffset}
                      r={inlayRadius}
                      fill={fill}
                    />
                    <circle
                      cx={inlayX}
                      cy={inlayCenterY + inlayOffset}
                      r={inlayRadius}
                      fill={fill}
                    />
                  </g>
                );
              }
              return (
                <circle
                  key={`inlay-${fretNumber}`}
                  cx={inlayX}
                  cy={inlayCenterY}
                  r={inlayRadius}
                  fill={fill}
                />
              );
            })
          : null}
      </svg>
      <svg
        ref={svgRef}
        className="neck-diagram-notes"
        width={diagram.width}
        height={diagram.height}
        overflow="visible"
        data-diagram-id={diagram.id}
        onPointerDown={handleNotePointerDown}
        onPointerMove={handleNotePointerMove}
        onPointerUp={handleNotePointerUp}
        onPointerLeave={clearNotePointer}
        onPointerCancel={clearNotePointer}
      >
        {diagram.notes.map((note) => {
          const isOpen = note.fret < 0;
          const start = isOpen ? 0 : (fretPositions[note.fret] ?? openStringPad);
          const end = isOpen
            ? openStringPad
            : fretPositions[note.fret + 1] ?? (diagram.width + start) / 2;
          const x = start + (end - start) / 2;
          const y = visualStringPositions[note.stringIndex] ?? diagram.height / 2;
          const noteIndex = getNoteIndex(displayTuning, note.stringIndex, note.fret, config.capo);
          const inScale = scaleSet ? noteIndex !== null && scaleSet.has(noteIndex) : true;
          const highlightRoot = config.highlightRoot ?? true;
          const isRoot = highlightRoot && rootIndex !== null && noteIndex === rootIndex;
          const labelMode = note.labelMode ?? diagram.labelMode;
          const label = resolveLabel(labelMode, noteIndex, rootIndex, note.picking);
          const fill = isRoot
            ? ROOT_NOTE_COLOR
            : inScale
              ? NOTE_IN_SCALE_COLOR
              : NOTE_OUT_SCALE_COLOR;
          const labelScale = label.length > 2 ? 0.8 : label.length > 1 ? 0.9 : 1;
          const fontSize = Math.max(8, noteFontBase * labelScale);

          return (
            <g key={note.id}>
              <circle
                cx={x}
                cy={y}
                r={noteRadius}
                fill={fill}
                stroke={NOTE_STROKE_COLOR}
                strokeWidth={NOTE_STROKE_WIDTH}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill={NOTE_LABEL_COLOR}
                fontFamily="'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', 'Hack Nerd Font', 'NerdFontsSymbols Nerd Font', monospace"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {config.showFretNumbers ? (
        <div className="fret-numbers" style={{ width: diagram.width, height: fretNumberHeight }}>
          {fretPositions.slice(1).map((x, index) => (
            <span
              key={`fret-number-${index + 1}`}
              className="fret-number"
              style={{ left: x }}
            >
              {config.fretNumberStyle === "roman" ? toRoman(index + 1) : index + 1}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className="neck-caption"
        onDoubleClick={(event) => {
          event.stopPropagation();
          onRenameStart?.();
        }}
        onPointerDown={(event) => {
          if (isRenaming) {
            event.stopPropagation();
          }
        }}
      >
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameDraft}
            onChange={(event) => onRenameDraftChange?.(event.target.value)}
            onBlur={() => onRenameCommit?.()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onRenameCommit?.();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onRenameCancel?.();
              }
            }}
          />
        ) : (
          <span>{diagram.name}</span>
        )}
      </div>
    </div>
  );
};

export default NeckDiagram;
