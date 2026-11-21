'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Sparkles, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
  onLoadSampleData: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  onFileSelected,
  onLoadSampleData,
  isLoading = false,
  errorMessage = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const name = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      alert('Please upload a valid CSV or Excel (.xlsx) file.');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-xl text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 ring-8 ring-indigo-50/50">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-2">
          AttritionAI
        </h1>
        <p className="text-base text-slate-600">
          Predict which employees are likely to resign, and understand the exact reasons why.
        </p>
      </div>

      <div className="w-full max-w-xl">
        {/* Error notification if any */}
        {errorMessage && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">File parsing issue</p>
              <p className="text-rose-700 text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-sm'
          } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7 text-indigo-600" />
            )}
          </div>

          <h3 className="text-base font-medium text-slate-900 mb-1">
            {isLoading ? 'Analyzing employee records...' : 'Drop your employee CSV or Excel file here'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Supports <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">.csv</span> or{' '}
            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">.xlsx</span> files
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Browse Files
          </button>
        </div>

        {/* Try Sample Data Button */}
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={onLoadSampleData}
            disabled={isLoading}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Try sample data (200 employees)</span>
            <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            100% Client-Side ML: Data parsing and model training run inside your browser.
          </span>
        </div>
      </div>
    </div>
  );
};
