import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, X, RefreshCw, Image as ImageIcon, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { validateImageFile } from '../../lib/validation';
import { InspectionType } from '../../lib/types';

interface SampleEntry {
  file: string;
  module: string;
  title: string;
}

interface UploadDropzoneProps {
  inspectionType: InspectionType;
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
  maxMb?: number;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  inspectionType,
  onAnalyze,
  isAnalyzing,
  maxMb = 10,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [samples, setSamples] = useState<SampleEntry[]>([]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load sample manifest
  useEffect(() => {
    fetch('/sample-data/manifest.json')
      .then((r) => r.json())
      .then((data: SampleEntry[]) => {
        setSamples(data.filter((s) => s.module === inspectionType));
      })
      .catch(() => setSamples([]));
  }, [inspectionType]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFile = useCallback(
    (f: File) => {
      const result = validateImageFile(f, maxMb);
      if (!result.valid) {
        setValidationError(result.error || 'Invalid file.');
        return;
      }
      setValidationError(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const objUrl = URL.createObjectURL(f);
      setPreviewUrl(objUrl);
      setFile(f);
      setImageDims(null);

      // Get dimensions
      const img = new window.Image();
      img.onload = () => setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = objUrl;
    },
    [previewUrl, maxMb],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
    e.target.value = '';
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setImageDims(null);
    setValidationError(null);
  };

  const handleDemoSelect = async (sample: SampleEntry) => {
    setShowDemoModal(false);
    try {
      const resp = await fetch(`/sample-data/${sample.file}`);
      const blob = await resp.blob();
      const demoFile = new File([blob], sample.file, { type: blob.type || 'image/jpeg' });
      acceptFile(demoFile);
    } catch {
      setValidationError('Failed to load demo image. Please try again.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload inspection image — drag and drop or click to browse"
            className={`relative border-2 border-dashed rounded-xl transition-colors p-8 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand ${
              isDragging
                ? 'border-brand bg-brand-light'
                : 'border-slate-300 hover:border-brand hover:bg-slate-50'
            }`}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? inputRef.current?.click() : null}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud
              className={`mx-auto w-10 h-10 mb-3 ${isDragging ? 'text-brand' : 'text-slate-400'}`}
            />
            <p className="text-sm font-medium text-slate-700">
              Drag & drop an image here, or{' '}
              <span className="text-brand font-semibold">browse files</span>
            </p>
            <p className="text-xs text-slate-muted mt-1">
              JPG, JPEG, PNG, or WEBP · Max {maxMb} MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleInputChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {validationError && (
            <Alert variant="danger">{validationError}</Alert>
          )}

          {samples.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-slate-muted font-medium">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {samples.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Play className="w-3.5 h-3.5" />}
              onClick={() => setShowDemoModal(true)}
              className="w-full"
            >
              Try Demo Image
            </Button>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border border-border bg-slate-50">
            <img
              src={previewUrl!}
              alt="Preview of the uploaded image for inspection"
              className="w-full object-contain max-h-72"
              loading="lazy"
            />
          </div>

          {/* File info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-border text-sm">
            <ImageIcon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-text truncate">{file.name}</p>
              <p className="text-xs text-slate-muted mt-0.5">
                {formatSize(file.size)}
                {imageDims && ` · ${imageDims.w}×${imageDims.h} px`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => inputRef.current?.click()}
                title="Replace image"
              >
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="w-3.5 h-3.5" />}
                onClick={handleRemove}
                title="Remove image"
              >
                Remove
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleInputChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {validationError && <Alert variant="danger">{validationError}</Alert>}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!file || isAnalyzing}
            isLoading={isAnalyzing}
            onClick={() => file && onAnalyze(file)}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
          </Button>
        </div>
      )}

      {/* Demo picker modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Select demo image">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-text">Select Demo Image</h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand"
                aria-label="Close demo picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-muted mb-4">
              These images run through the same real pipeline as your own uploads.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {samples.map((s) => (
                <button
                  key={s.file}
                  onClick={() => handleDemoSelect(s)}
                  className="group text-left rounded-xl border border-border hover:border-brand hover:shadow-md transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <img
                    src={`/sample-data/${s.file}`}
                    alt={s.title}
                    className="w-full h-28 object-cover group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  <div className="p-2">
                    <p className="text-xs font-medium text-slate-text leading-snug">{s.title}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Images sourced from Wikimedia Commons — see ATTRIBUTION.md for licenses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
