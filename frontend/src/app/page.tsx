'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Header } from '@/components/header/Header';
import { Canvas } from '@/components/canvas/Canvas';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { DiagramSettings } from '@/components/settings/DiagramSettings';
import { ExportButton } from '@/components/export/ExportButton';
import { useDiagramStore } from '@/stores/diagramStore';
import { useAutoSave } from '@/hooks/useAutoSave';

export default function Home() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('Untitled Project');
  const [didAttemptRestore, setDidAttemptRestore] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use selective selector - only subscribe to count changes, not full array
  const diagramCount = useDiagramStore((state) => state.diagrams.size);
  const addDiagram = useDiagramStore((state) => state.addDiagram);
  const { loadFromLocalStorage } = useAutoSave();

  // Restore local backup once before applying fallback initialization.
  useEffect(() => {
    loadFromLocalStorage();
    setDidAttemptRestore(true);
  }, [loadFromLocalStorage]);

  // Add an initial sample diagram once if no data is available after restore attempt.
  useEffect(() => {
    if (!didAttemptRestore || isInitialized) {
      return;
    }

    if (diagramCount === 0) {
      addDiagram(
        { strings: 6, frets: 5, startFret: 0 },
        { x: 50, y: 50 }
      );
    }

    setIsInitialized(true);
  }, [didAttemptRestore, isInitialized, diagramCount, addDiagram]);

  return (
    <div className="h-screen flex flex-col">
      <Header title={title} onTitleChange={setTitle} />
      
      {/* Export button in header area */}
      <div className="fixed top-3 right-4 z-50">
        <ExportButton canvasRef={canvasRef} projectTitle={title} />
      </div>

      {/* Main canvas area */}
      <main className="flex-1 pt-14">
        <div ref={canvasRef} className="h-full">
          <Canvas className="w-full h-full" />
        </div>
      </main>

      {/* Toolbar */}
      <Toolbar />

      {/* Settings panel */}
      <DiagramSettings />
    </div>
  );
}
