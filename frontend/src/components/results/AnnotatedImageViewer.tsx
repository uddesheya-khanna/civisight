import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RefreshCw, Eye } from 'lucide-react';

interface AnnotatedImageViewerProps {
  originalUrl: string;
  annotatedUrl: string;
  altText: string;
}

export const AnnotatedImageViewer: React.FC<AnnotatedImageViewerProps> = ({
  originalUrl,
  annotatedUrl,
  altText,
}) => {
  const [showAnnotated, setShowAnnotated] = useState(true);

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          <button
            onClick={() => setShowAnnotated(true)}
            className={`px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset ${
              showAnnotated
                ? 'bg-brand text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
            aria-pressed={showAnnotated}
          >
            Annotated
          </button>
          <button
            onClick={() => setShowAnnotated(false)}
            className={`px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset ${
              !showAnnotated
                ? 'bg-brand text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
            aria-pressed={!showAnnotated}
          >
            Original
          </button>
        </div>
        {showAnnotated && (
          <div className="flex items-center gap-1 text-xs text-slate-muted">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            AI detections overlaid
          </div>
        )}
      </div>

      {/* Zoomable image */}
      <div className="rounded-xl border border-border overflow-hidden bg-slate-900">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperStyle={{ width: '100%', display: 'block' }}
                contentStyle={{ width: '100%' }}
              >
                <img
                  src={showAnnotated ? annotatedUrl : originalUrl}
                  alt={altText}
                  className="w-full object-contain max-h-[520px]"
                  draggable={false}
                />
              </TransformComponent>
              {/* Controls */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button
                  onClick={() => zoomIn()}
                  className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>

      <p className="text-xs text-slate-muted">
        Scroll or pinch to zoom · Drag to pan · Use buttons to reset
      </p>
    </div>
  );
};
