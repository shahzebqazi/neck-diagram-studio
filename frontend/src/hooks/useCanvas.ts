'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useDiagramStore } from '@/stores/diagramStore';

interface UseCanvasOptions {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useCanvas({ containerRef }: UseCanvasOptions) {
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedIdRef = useRef<string | null>(null);

  const {
    zoom,
    panX,
    panY,
    selectedIds,
    setZoom,
    setPan,
    panBy,
    selectItem,
    clearSelection,
    setIsDragging,
    setIsPanning,
    screenToCanvas,
  } = useCanvasStore();

  const { getDiagram, moveDiagram, duplicateDiagram } = useDiagramStore();

  // Handle zoom with wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Zoom toward mouse position
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

        // Calculate new pan to zoom toward mouse
        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - panX) * scale;
        const newPanY = mouseY - (mouseY - panY) * scale;

        setZoom(newZoom);
        setPan(newPanX, newPanY);
      } else {
        // Pan
        panBy(-e.deltaX, -e.deltaY);
      }
    },
    [zoom, panX, panY, setZoom, setPan, panBy, containerRef]
  );

  // Handle mouse down for pan/drag
  const handleMouseDown = useCallback(
    (e: MouseEvent, diagramId?: string) => {
      if (e.button !== 0) return; // Left click only

      // Space + click or Alt + click for pan
      if (e.altKey && !diagramId) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - panX, y: e.clientY - panY };
        setIsPanning(true);
        return;
      }

      // Click on diagram
      if (diagramId) {
        const diagram = getDiagram(diagramId);
        if (!diagram) return;

        // Select diagram
        if (e.shiftKey) {
          selectItem(diagramId, true);
        } else if (!selectedIds.includes(diagramId)) {
          selectItem(diagramId, false);
        }

        // Start drag
        draggedIdRef.current = diagramId;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);

        // Alt + drag to duplicate
        if (e.altKey) {
          const duplicated = duplicateDiagram(diagramId, { x: 0, y: 0 });
          if (duplicated) {
            draggedIdRef.current = duplicated.id;
            selectItem(duplicated.id, false);
          }
        }
      } else {
        // Click on empty canvas - clear selection
        clearSelection();
      }
    },
    [panX, panY, selectedIds, getDiagram, selectItem, clearSelection, duplicateDiagram, setIsDragging, setIsPanning]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Pan
      if (isPanningRef.current) {
        const newPanX = e.clientX - panStartRef.current.x;
        const newPanY = e.clientY - panStartRef.current.y;
        setPan(newPanX, newPanY);
        return;
      }

      // Drag diagram
      if (draggedIdRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;

        const diagram = getDiagram(draggedIdRef.current);
        if (diagram) {
          moveDiagram(
            draggedIdRef.current,
            diagram.x + dx,
            diagram.y + dy
          );
          dragStartRef.current = { x: e.clientX, y: e.clientY };
        }
      }
    },
    [zoom, setPan, getDiagram, moveDiagram]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    draggedIdRef.current = null;
    setIsDragging(false);
    setIsPanning(false);
  }, [setIsDragging, setIsPanning]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, handleWheel, handleMouseMove, handleMouseUp]);

  return {
    handleMouseDown,
    screenToCanvas,
  };
}
