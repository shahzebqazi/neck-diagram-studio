'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useDiagramStore } from '@/stores/diagramStore';
import { NeckDiagram } from '@/components/diagram/NeckDiagram';

interface CanvasProps {
  className?: string;
}

// Throttle utility for mouse events
const throttle = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number
): ((...args: Args) => void) => {
  let lastCall = 0;
  return (...args: Args) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
};

export const Canvas: React.FC<CanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Use selective store subscriptions to minimize re-renders
  const zoom = useCanvasStore((state) => state.zoom);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const isPanning = useCanvasStore((state) => state.isPanning);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const panBy = useCanvasStore((state) => state.panBy);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const selectItem = useCanvasStore((state) => state.selectItem);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const setIsPanning = useCanvasStore((state) => state.setIsPanning);

  // Use stable selector for diagrams to prevent array recreation
  const diagrams = useDiagramStore((state) => state.getDiagramsArray());

  // Handle viewport resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [setViewport]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
        setZoom(newZoom);
      } else {
        // Pan
        panBy(-e.deltaX, -e.deltaY);
      }
    },
    [zoom, setZoom, panBy]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse, alt+click, or active pan tool for panning
      const shouldPan = e.button === 1 || (e.button === 0 && (e.altKey || activeTool === 'pan'));
      if (shouldPan) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      } else if (e.button === 0 && e.target === containerRef.current) {
        // Click on empty canvas
        clearSelection();
      }
    },
    [activeTool, panX, panY, setIsPanning, clearSelection]
  );

  // Handle mouse move with throttling for performance (~60fps)
  const handleMouseMove = useMemo(
    () =>
      throttle((e: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning && panStart) {
          const newPanX = e.clientX - panStart.x;
          const newPanY = e.clientY - panStart.y;
          panBy(newPanX - panX, newPanY - panY);
        }
      }, 16),
    [isPanning, panStart, panX, panY, panBy]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, [setIsPanning]);

  // Handle diagram selection
  const handleDiagramSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      selectItem(id, addToSelection);
    },
    [selectItem]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const isEditableElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
      // Delete selected diagrams
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isEditableElement(e.target)) return;
        selectedIds.forEach((id) => {
          useDiagramStore.getState().deleteDiagram(id);
        });
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clearSelection]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{
        cursor: isPanning ? 'grabbing' : activeTool === 'pan' ? 'grab' : 'default',
        backgroundImage: `
          radial-gradient(circle, #d1d5db 1px, transparent 1px)
        `,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${panX}px ${panY}px`,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas transform container */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        }}
      >
        {/* Render diagrams */}
        {diagrams.map((diagram) => (
          <NeckDiagram
            key={diagram.id}
            diagram={diagram}
            isSelected={selectedIds.includes(diagram.id)}
            onSelect={handleDiagramSelect}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow px-3 py-1 text-sm text-gray-600">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};

export default Canvas;
