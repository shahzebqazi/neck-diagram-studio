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
const ROOT_NOTE_COLOR = "#e54b4b";
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
  const { config } = diagram;
  const noteRadius = Math.max(MIN_NOTE_RADIUS, diagram.height / 18);
  const noteFontBase = Math.max(8, Math.min(noteRadius * 1.2, 18));
  const openStringPad = Math.max(24, noteRadius * 2.8);
  const rightPad = Math.max(12, noteRadius);
  const verticalPad = Math.max(8, noteRadius);
  const fretNumberHeight = Math.max(12, Math.round(noteRadius * 1.2));
  const fretboardWidth = Math.max(1, diagram.width - openStringPad - rightPad);
  const stringHeight = Math.max(1, diagram.height - verticalPad * 2);

  const fretPositions = useMemo(
    () =>
      getFretPositions(config.scaleLength, config.frets, fretboardWidth).map(
        (position) => position + openStringPad
      ),
    [config.frets, config.scaleLength, fretboardWidth, openStringPad]
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

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!selected) return;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const zoomFactor = zoom || 1;
    const localX = (event.clientX - bounds.left) / zoomFactor;
    const localY = (event.clientY - bounds.top) / zoomFactor;

    const fret =
      localX < openStringPad
        ? -1
        : clamp(findFretAtX(fretPositions, localX), 0, config.frets - 1);
    const spacing =
      config.strings <= 1 ? stringHeight : stringHeight / (config.strings - 1);
    const rawIndex =
      config.strings <= 1
        ? 0
        : clamp(Math.round((localY - verticalPad) / spacing), 0, config.strings - 1);
    const stringIndex = config.strings - 1 - rawIndex;

    onToggleNote(stringIndex, fret);
  };

  const angleOffset = 0;

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
        ref={svgRef}
        width={diagram.width}
        height={diagram.height}
        data-diagram-id={diagram.id}
        onPointerDown={handlePointerDown}
      >
        <rect
          x={0}
          y={0}
          width={diagram.width}
          height={diagram.height}
          fill="#0f1318"
          stroke="#1d2732"
          strokeWidth={1}
        />
        {selected ? (
          <rect
            x={1}
            y={1}
            width={Math.max(0, diagram.width - 2)}
            height={Math.max(0, diagram.height - 2)}
            fill="none"
            stroke="#ffb347"
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
            stroke="#2b3947"
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
              stroke={isNut ? "#f7f1d9" : "#2b3947"}
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
            stroke="#f4a259"
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
              const fill = "#2a3742";
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
          const fill = isRoot ? ROOT_NOTE_COLOR : inScale ? "#ffb347" : "#3b4b5c";
          const labelScale = label.length > 2 ? 0.8 : label.length > 1 ? 0.9 : 1;
          const fontSize = Math.max(8, noteFontBase * labelScale);

          return (
            <g key={note.id}>
              <circle
                cx={x}
                cy={y}
                r={noteRadius}
                fill={fill}
                stroke="#11171f"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="#10151b"
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
