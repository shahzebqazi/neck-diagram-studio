'use client';

import React, { memo, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useDiagramStore } from '@/stores/diagramStore';
import { useToolStore, INTERVALS, KEYS, PICKING_SYMBOLS } from '@/stores/toolStore';
import type { ToolType, NoteType } from '@/types';

export const Toolbar: React.FC = memo(() => {
  // Use selective selectors to minimize re-renders
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const resetZoom = useCanvasStore((state) => state.resetZoom);
  const zoom = useCanvasStore((state) => state.zoom);
  
  const addDiagram = useDiagramStore((state) => state.addDiagram);
  
  const noteType = useToolStore((state) => state.noteType);
  const noteValue = useToolStore((state) => state.noteValue);
  const setNoteType = useToolStore((state) => state.setNoteType);
  const setNoteValue = useToolStore((state) => state.setNoteValue);
  const isGhostNote = useToolStore((state) => state.isGhostNote);
  const setIsGhostNote = useToolStore((state) => state.setIsGhostNote);

  const tools: { id: ToolType; icon: string; label: string }[] = [
    { id: 'select', icon: '↖', label: 'Select' },
    { id: 'pan', icon: '✋', label: 'Pan' },
    { id: 'note', icon: '●', label: 'Add Note' },
  ];

  const handleAddDiagram = useCallback(() => {
    addDiagram();
  }, [addDiagram]);

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white rounded-xl shadow-lg p-2">
      {/* Tool buttons */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="h-px bg-gray-200 my-1" />

      {/* Add diagram button */}
      <button
        onClick={handleAddDiagram}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
        title="Add Diagram"
      >
        +
      </button>

      <div className="h-px bg-gray-200 my-1" />

      {/* Zoom controls */}
      <button
        onClick={zoomIn}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={resetZoom}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={zoomOut}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Zoom Out"
      >
        −
      </button>

      {/* Note type panel (shown when note tool is active) */}
      {activeTool === 'note' && (
        <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-lg p-3 w-48">
          <div className="text-xs font-medium text-gray-500 mb-2">Note Type</div>
          <div className="flex gap-1 mb-3">
            {(['interval', 'key', 'picking'] as NoteType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNoteType(type)}
                className={`flex-1 py-1 px-2 text-xs rounded ${
                  noteType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-gray-500 mb-2">Value</div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {noteType === 'interval' &&
              INTERVALS.map((interval) => (
                <button
                  key={interval}
                  onClick={() => setNoteValue(interval)}
                  className={`w-8 h-8 flex items-center justify-center text-xs rounded ${
                    noteValue === interval
                      ? interval === 'R'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {interval}
                </button>
              ))}
            {noteType === 'key' &&
              KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setNoteValue(key)}
                  className={`w-8 h-8 flex items-center justify-center text-xs rounded ${
                    noteValue === key
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {key}
                </button>
              ))}
            {noteType === 'picking' &&
              PICKING_SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setNoteValue(symbol)}
                  className={`w-8 h-8 flex items-center justify-center text-xs rounded ${
                    noteValue === symbol
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {symbol}
                </button>
              ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={isGhostNote}
                onChange={(e) => setIsGhostNote(e.target.checked)}
                className="w-3 h-3"
              />
              Ghost note
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;
