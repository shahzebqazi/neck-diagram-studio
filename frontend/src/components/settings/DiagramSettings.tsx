'use client';

import React from 'react';
import { useDiagramStore } from '@/stores/diagramStore';
import { useCanvasStore } from '@/stores/canvasStore';

export const DiagramSettings: React.FC = () => {
  const { selectedIds } = useCanvasStore();
  const { getDiagram, updateDiagram, updateConfig, clearNotes, deleteDiagram } = useDiagramStore();

  // Only show if exactly one diagram is selected
  if (selectedIds.length !== 1) return null;

  const diagram = getDiagram(selectedIds[0]);
  if (!diagram) return null;

  const { config } = diagram;

  return (
    <div className="fixed right-4 top-20 w-64 bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Diagram Settings</h3>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Title</label>
        <input
          type="text"
          value={diagram.title}
          onChange={(e) => updateDiagram(diagram.id, { title: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Strings */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Strings: {config.strings}</label>
        <input
          type="range"
          min={4}
          max={8}
          value={config.strings}
          onChange={(e) => updateConfig(diagram.id, { strings: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>4</span>
          <span>8</span>
        </div>
      </div>

      {/* Frets */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Frets: {config.frets}</label>
        <input
          type="range"
          min={3}
          max={12}
          value={config.frets}
          onChange={(e) => updateConfig(diagram.id, { frets: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>3</span>
          <span>12</span>
        </div>
      </div>

      {/* Start Fret */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Start Fret: {config.startFret}</label>
        <input
          type="range"
          min={0}
          max={12}
          value={config.startFret}
          onChange={(e) => updateConfig(diagram.id, { startFret: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>12</span>
        </div>
      </div>

      {/* Capo */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Capo: {config.capo || 'None'}</label>
        <input
          type="range"
          min={0}
          max={12}
          value={config.capo}
          onChange={(e) => updateConfig(diagram.id, { capo: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>None</span>
          <span>12</span>
        </div>
      </div>

      <div className="h-px bg-gray-200 my-4" />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => clearNotes(diagram.id)}
          className="w-full py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          Clear All Notes
        </button>
        <button
          onClick={() => {
            deleteDiagram(diagram.id);
            useCanvasStore.getState().clearSelection();
          }}
          className="w-full py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
        >
          Delete Diagram
        </button>
      </div>
    </div>
  );
};

export default DiagramSettings;
