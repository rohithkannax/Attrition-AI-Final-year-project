'use client';

import React from 'react';
import { Sparkles, Download, RefreshCw, Database } from 'lucide-react';

interface NavbarProps {
  hasData: boolean;
  onReset: () => void;
  onExportCsv?: () => void;
  rowCount?: number;
  mode?: 'A' | 'B';
}

export const Navbar: React.FC<NavbarProps> = ({
  hasData,
  onReset,
  onExportCsv,
  rowCount,
  mode,
}) => {
  return (
    <header className="border-b border-slate-100 bg-white sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm ring-1 ring-slate-900/10">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-slate-900">AttritionAI</span>
              {hasData && mode && (
                <span
                  className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    mode === 'A'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}
                >
                  <span className="sm:hidden">{mode === 'A' ? 'Mode A' : 'Mode B'}</span>
                  <span className="hidden sm:inline">{mode === 'A' ? 'ML Model (Mode A)' : 'Gemini AI (Mode B)'}</span>
                </span>
              )}
            </div>
            {hasData && rowCount !== undefined && (
              <p className="text-xs text-slate-500 hidden sm:block">
                Analyzing {rowCount} employees
              </p>
            )}
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-2 sm:gap-3">
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors"
              title="Upload another file"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Dataset</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
