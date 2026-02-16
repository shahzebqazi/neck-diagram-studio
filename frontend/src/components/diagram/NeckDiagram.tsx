'use client';

import React, { useCallback, useMemo, memo } from 'react';
import type { Diagram } from '@/types';
import { useDiagramStore } from '@/stores/diagramStore';
import { useToolStore } from '@/stores/toolStore';
import { useCanvasStore } from '@/stores/canvasStore';

interface NeckDiagramProps {
  diagram: Diagram;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
}

const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
  11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
  16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX',
  21: 'XXI', 22: 'XXII', 23: 'XXIII', 24: 'XXIV',
};

// Check if fret should have marker (moved outside component for performance)
const shouldShowMarker = (fretNum: number): boolean => FRET_MARKERS.has(fretNum);

const NeckDiagramComponent: React.FC<NeckDiagramProps> = ({
  diagram,
  isSelected,
  onSelect,
}) => {
  // Use selective store subscriptions to prevent unnecessary re-renders
  const toggleNote = useDiagramStore((state) => state.toggleNote);
  const noteType = useToolStore((state) => state.noteType);
  const noteValue = useToolStore((state) => state.noteValue);
  const isGhostNote = useToolStore((state) => state.isGhostNote);
  const activeTool = useCanvasStore((state) => state.activeTool);

  const { config, notes, width, height, title } = diagram;
  const { strings, frets, startFret, capo } = config;

  // Calculate dimensions
  const padding = { top: 30, right: 20, bottom: 40, left: 40 };
  const neckWidth = width - padding.left - padding.right;
  const neckHeight = height - padding.top - padding.bottom;
  const stringSpacing = neckHeight / (strings - 1);
  const fretSpacing = neckWidth / frets;

  // Handle fret click
  const handleFretClick = useCallback(
      (stringNum: number, fretNum: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeTool === 'note') {
          toggleNote(diagram.id, stringNum, fretNum, noteValue, noteType, isGhostNote);
        }
      },
    [activeTool, diagram.id, noteValue, noteType, isGhostNote, toggleNote]
  );

  // Handle diagram click
  const handleDiagramClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'pan') {
        return;
      }
      onSelect(diagram.id, e.shiftKey);
    },
    [activeTool, diagram.id, onSelect]
  );

  // Visible fret numbers
  const visibleFrets = useMemo(() => {
    return Array.from({ length: frets + 1 }, (_, i) => startFret + i);
  }, [frets, startFret]);

  return (
    <div
      className={`absolute bg-white rounded-lg shadow-md border-2 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{
        left: diagram.x,
        top: diagram.y,
        width: diagram.width,
        height: diagram.height,
      }}
      onClick={handleDiagramClick}
    >
      {/* Title */}
      <div className="absolute top-0 left-0 right-0 h-6 px-2 flex items-center bg-gray-50 rounded-t-lg border-b border-gray-100">
        <span className="text-xs font-medium text-gray-600 truncate">{title}</span>
      </div>

      {/* Neck SVG */}
      <svg
        width={width}
        height={height}
        className="absolute top-0 left-0"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Nut (if starting at fret 0) */}
          {startFret === 0 && (
            <rect
              x={-4}
              y={-2}
              width={4}
              height={neckHeight + 4}
              fill="#1a1a1a"
              rx={1}
            />
          )}

          {/* Capo indicator */}
          {capo > 0 && capo >= startFret && capo <= startFret + frets && (
            <rect
              x={(capo - startFret) * fretSpacing - 2}
              y={-5}
              width={4}
              height={neckHeight + 10}
              fill="#e74c3c"
              rx={2}
            />
          )}

          {/* Fret lines */}
          {visibleFrets.map((fretNum, i) => (
            <line
              key={`fret-${fretNum}`}
              x1={i * fretSpacing}
              y1={0}
              x2={i * fretSpacing}
              y2={neckHeight}
              stroke={i === 0 && startFret === 0 ? 'transparent' : '#c0c0c0'}
              strokeWidth={i === 0 && startFret === 0 ? 0 : 2}
            />
          ))}

          {/* String lines */}
          {Array.from({ length: strings }, (_, i) => (
            <line
              key={`string-${i}`}
              x1={0}
              y1={i * stringSpacing}
              x2={neckWidth}
              y2={i * stringSpacing}
              stroke="#8b7355"
              strokeWidth={1 + i * 0.3}
            />
          ))}

          {/* Fret markers (dots) */}
          {visibleFrets.slice(1).map((fretNum, i) => {
            if (!shouldShowMarker(fretNum)) return null;
            const isDouble = fretNum === 12 || fretNum === 24;
            const x = (i + 0.5) * fretSpacing;
            const y = neckHeight / 2;
            
            if (isDouble) {
              return (
                <g key={`marker-${fretNum}`}>
                  <circle cx={x} cy={y - stringSpacing} r={4} fill="#d1d5db" />
                  <circle cx={x} cy={y + stringSpacing} r={4} fill="#d1d5db" />
                </g>
              );
            }
            return (
              <circle
                key={`marker-${fretNum}`}
                cx={x}
                cy={y}
                r={4}
                fill="#d1d5db"
              />
            );
          })}

          {/* Clickable fret zones */}
          {Array.from({ length: strings }, (_, stringIndex) =>
            Array.from({ length: frets + 1 }, (_, fretIndex) => {
              const fretNum = startFret + fretIndex;
              const x = fretIndex === 0 ? -fretSpacing / 4 : (fretIndex - 0.5) * fretSpacing;
              const y = stringIndex * stringSpacing - stringSpacing / 2;
              const w = fretIndex === 0 ? fretSpacing / 2 : fretSpacing;
              
              return (
                <rect
                  key={`zone-${stringIndex}-${fretNum}`}
                  x={x}
                  y={y}
                  width={w}
                  height={stringSpacing}
                  fill="transparent"
                  className="cursor-pointer hover:fill-blue-100 hover:fill-opacity-30"
                  onClick={(e) => handleFretClick(strings - stringIndex, fretNum, e)}
                />
              );
            })
          )}

          {/* Notes */}
          {notes.map((note, i) => {
            const stringIndex = strings - note.string;
            const fretIndex = note.fret - startFret;
            
            if (fretIndex < 0 || fretIndex > frets) return null;
            
            const x = fretIndex === 0 
              ? -fretSpacing / 4 
              : (fretIndex - 0.5) * fretSpacing;
            const y = stringIndex * stringSpacing;
            
            const isRoot = note.isRoot || note.value === 'R';
            const bgColor = isRoot ? '#ef4444' : note.isGhost ? '#9ca3af' : '#1f2937';
            const textColor = '#ffffff';
            
            return (
              <g key={`note-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill={bgColor}
                  stroke={note.isGhost ? '#6b7280' : 'transparent'}
                  strokeWidth={note.isGhost ? 2 : 0}
                  strokeDasharray={note.isGhost ? '2,2' : undefined}
                  opacity={note.isGhost ? 0.6 : 1}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontSize={note.value.length > 2 ? 8 : 10}
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {note.value}
                </text>
              </g>
            );
          })}
        </g>

        {/* Fret numbers */}
        <g transform={`translate(${padding.left}, ${height - 15})`}>
          {visibleFrets.slice(1).map((fretNum, i) => (
            <text
              key={`fret-num-${fretNum}`}
              x={(i + 0.5) * fretSpacing}
              y={0}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
              className="select-none"
            >
              {ROMAN_NUMERALS[fretNum] || fretNum}
            </text>
          ))}
        </g>
      </svg>

      {/* Resize handle */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
          }}
        />
      )}
    </div>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
export const NeckDiagram = memo(NeckDiagramComponent, (prevProps, nextProps) => {
  // Only re-render if diagram data or selection state actually changed
  return (
    prevProps.diagram.id === nextProps.diagram.id &&
    prevProps.diagram.updatedAt === nextProps.diagram.updatedAt &&
    prevProps.diagram.x === nextProps.diagram.x &&
    prevProps.diagram.y === nextProps.diagram.y &&
    prevProps.diagram.width === nextProps.diagram.width &&
    prevProps.diagram.height === nextProps.diagram.height &&
    prevProps.isSelected === nextProps.isSelected
  );
});

export default NeckDiagram;
