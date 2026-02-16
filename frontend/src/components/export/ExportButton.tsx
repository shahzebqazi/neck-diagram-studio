'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { ExportOptions } from '@/types';

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  projectTitle: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ canvasRef, projectTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [options, setOptions] = useState<ExportOptions>({
    target: 'page',
    format: 'png',
    scale: 2,
    backgroundColor: '#ffffff',
    includeTitle: true,
    includeDate: true,
    padding: 20,
  });

  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    setIsExporting(true);
    try {
      const element = canvasRef.current;
      
      if (options.format === 'png') {
        const dataUrl = await toPng(element, {
          backgroundColor: options.backgroundColor,
          pixelRatio: options.scale,
        });
        
        // Download
        const link = document.createElement('a');
        link.download = `${projectTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      } else if (options.format === 'pdf') {
        const dataUrl = await toPng(element, {
          backgroundColor: options.backgroundColor,
          pixelRatio: options.scale,
        });
        
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height],
        });
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(`${projectTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        disabled={isExporting}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg p-4 z-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Export Options</h4>

          {/* Format */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions({ ...options, format: 'png' })}
                className={`flex-1 py-1 text-sm rounded ${
                  options.format === 'png' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => setOptions({ ...options, format: 'pdf' })}
                className={`flex-1 py-1 text-sm rounded ${
                  options.format === 'pdf' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                PDF
              </button>
            </div>
          </div>

          {/* Scale */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Resolution: {options.scale}x</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setOptions({ ...options, scale })}
                  className={`flex-1 py-1 text-sm rounded ${
                    options.scale === scale ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Background</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions({ ...options, backgroundColor: '#ffffff' })}
                className={`flex-1 py-1 text-sm rounded border ${
                  options.backgroundColor === '#ffffff' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'
                }`}
              >
                White
              </button>
              <button
                onClick={() => setOptions({ ...options, backgroundColor: 'transparent' })}
                className={`flex-1 py-1 text-sm rounded border ${
                  options.backgroundColor === 'transparent' ? 'border-blue-500' : 'border-gray-200'
                }`}
                style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 8px 8px' }}
              >
                None
              </button>
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
