'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDiagramStore } from '@/stores/diagramStore';
import { useCanvasStore } from '@/stores/canvasStore';
import * as api from '@/lib/api';

const SAVE_DELAY = 500; // Debounce delay in ms
const LOCAL_STORAGE_KEY = 'neck-diagrams-backup';

interface AutoSaveOptions {
  projectId?: string;
  enabled?: boolean;
}

export function useAutoSave({ projectId, enabled = true }: AutoSaveOptions = {}) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  const getDiagramsArray = useDiagramStore((state) => state.getDiagramsArray);
  const zoom = useCanvasStore((state) => state.zoom);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);

  // Serialize current state for comparison
  const serializeState = useCallback(() => {
    const diagrams = getDiagramsArray();
    return JSON.stringify({
      diagrams,
      canvas: { zoom, panX, panY },
    });
  }, [getDiagramsArray, zoom, panX, panY]);

  // Save to localStorage (backup)
  const saveToLocalStorage = useCallback(() => {
    const state = serializeState();
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, state);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}-timestamp`, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [serializeState]);

  // Save to API with parallel requests for better performance
  const saveToApi = useCallback(async () => {
    if (!projectId) return;

    const diagrams = getDiagramsArray();
    const canvasState = { zoom, panX, panY };

    try {
      // Update project canvas state and all diagrams in parallel
      await Promise.all([
        api.updateProject(projectId, { canvasState }),
        ...diagrams
          .filter((diagram) => diagram.id)
          .map((diagram) =>
            api.updateDiagram(diagram.id, {
              title: diagram.title,
              x: diagram.x,
              y: diagram.y,
              width: diagram.width,
              height: diagram.height,
              config: diagram.config,
              notes: diagram.notes,
            })
          ),
      ]);
    } catch (e) {
      console.error('Failed to save to API:', e);
      // Fall back to localStorage
      saveToLocalStorage();
    }
  }, [projectId, getDiagramsArray, zoom, panX, panY, saveToLocalStorage]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (!enabled) return;

    const currentState = serializeState();
    if (currentState === lastSavedRef.current) {
      return; // No changes
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      lastSavedRef.current = currentState;
      
      if (projectId) {
        saveToApi();
      } else {
        saveToLocalStorage();
      }
    }, SAVE_DELAY);
  }, [enabled, projectId, serializeState, saveToApi, saveToLocalStorage]);

  // Subscribe to store changes
  useEffect(() => {
    const unsubDiagram = useDiagramStore.subscribe(debouncedSave);
    const unsubCanvas = useCanvasStore.subscribe(debouncedSave);

    return () => {
      unsubDiagram();
      unsubCanvas();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedSave]);

  // Load from localStorage on mount
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const { diagrams, canvas } = JSON.parse(saved);
        if (diagrams) {
          useDiagramStore.getState().setDiagrams(diagrams);
        }
        if (canvas) {
          useCanvasStore.getState().setCanvasState(canvas);
        }
        return true;
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return false;
  }, []);

  // Get last save timestamp
  const getLastSaveTime = useCallback(() => {
    const timestamp = localStorage.getItem(`${LOCAL_STORAGE_KEY}-timestamp`);
    return timestamp ? new Date(timestamp) : null;
  }, []);

  return {
    saveNow: debouncedSave,
    loadFromLocalStorage,
    getLastSaveTime,
  };
}
